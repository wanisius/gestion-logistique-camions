"""Serveur local du tableau de bord (127.0.0.1 uniquement) et API JSON.

Protections : écoute sur la boucle locale seulement, vérification de l'en-tête
Host (contre le « DNS rebinding ») et jeton aléatoire exigé sur toute l'API
(contre les requêtes forgées depuis un autre site ouvert dans le navigateur).
"""

from __future__ import annotations

import hmac
import json
import mimetypes
import os
import re
import secrets
import threading
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from . import __version__, analysis, scanner
from .store import Store

DIST = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")
ACTION_STATUSES = {"proposée", "autorisée", "refusée", "appliquée"}
CHECK_VALUES = {analysis.YES, analysis.NO, analysis.UNKNOWN}
MAC_RE = re.compile(r"^[0-9A-F]{2}(:[0-9A-F]{2}){5}$")


class App:
    def __init__(self, store: Store, port: int):
        self.store = store
        self.port = port
        self.token = secrets.token_urlsafe(24)
        self.monitor = scanner.Monitor(store, log=lambda m: print(m, flush=True))
        self.scanning = False

    def start_scan(self, full: bool) -> bool:
        if self.scanning:
            return False

        def job():
            self.scanning = True
            try:
                scanner.run_scan(self.store, full=full, log=lambda m: print(m, flush=True))
            except Exception as e:  # noqa: BLE001
                print(f"Erreur de scan : {e!r}", flush=True)
            finally:
                self.scanning = False
        threading.Thread(target=job, daemon=True).start()
        return True

    def actions(self) -> list[dict]:
        saved = self.store.state.get("actions", {})
        out = []
        for f in self.store.state.get("findings", []):
            if f.get("router_change") and f["status"] != "ok":
                st = saved.get(f["id"], {})
                out.append({"id": f["id"], "title": f.get("action_title") or f["title"], "severity": f["severity"],
                            "detail": f["detail"], "recommendation": f["recommendation"],
                            "steps": f["steps"], "status": st.get("status", "proposée"), "ts": st.get("ts")})
        return out

    def state(self) -> dict:
        s = self.store.state
        return {
            "version": __version__, "scanning": self.scanning, "last_scan": s.get("last_scan"),
            "network": s.get("network", {}), "wifi": s.get("wifi", {}), "router": s.get("router", {}),
            "score": s.get("score"), "score_history": s.get("score_history", [])[-100:],
            "findings": s.get("findings", []), "settings": s["settings"],
            "checklist": [{**c, "answer": (s["checklist"].get(c["key"]) or {}).get("value", "inconnu")}
                          for c in analysis.CHECKLIST],
            "actions": self.actions(),
            "unread_alerts": sum(1 for a in s["alerts"] if not a["acknowledged"]),
        }


def make_handler(app: App):
    allowed_hosts = {f"127.0.0.1:{app.port}", f"localhost:{app.port}"}

    class Handler(BaseHTTPRequestHandler):
        server_version = "WiFiSecurityManager"

        def log_message(self, fmt, *args):  # journal discret
            pass

        def _send(self, code: int, body: bytes, ctype: str = "application/json; charset=utf-8"):
            self.send_response(code)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("X-Frame-Options", "DENY")
            self.send_header("Referrer-Policy", "no-referrer")
            self.send_header("Content-Security-Policy",
                             "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; "
                             "connect-src 'self'; frame-ancestors 'none'")
            self.end_headers()
            self.wfile.write(body)

        def _json(self, code: int, obj) -> None:
            self._send(code, json.dumps(obj, ensure_ascii=False).encode())

        def _host_ok(self) -> bool:
            return self.headers.get("Host", "") in allowed_hosts

        def _auth_ok(self) -> bool:
            return hmac.compare_digest(self.headers.get("X-WSM-Token", ""), app.token)

        def _body(self) -> dict:
            length = int(self.headers.get("Content-Length") or 0)
            if length > 64 * 1024:
                return {}
            try:
                data = json.loads(self.rfile.read(length) or b"{}")
            except json.JSONDecodeError:
                return {}
            return data if isinstance(data, dict) else {}

        # ----------------------------------------------------------- GET
        def do_GET(self):
            if not self._host_ok():
                return self._send(403, b"Forbidden", "text/plain")
            url = urlparse(self.path)
            if url.path.startswith("/api/"):
                if not self._auth_ok():
                    return self._json(401, {"error": "jeton invalide"})
                return self._api_get(url.path, parse_qs(url.query))
            return self._static(url.path)

        def _api_get(self, path: str, q: dict):
            st = app.store
            if path == "/api/state":
                return self._json(200, app.state())
            if path == "/api/devices":
                return self._json(200, st.devices())
            if path == "/api/events":
                limit = min(int((q.get("limit") or ["500"])[0]), 5000)
                return self._json(200, list(reversed(st.state["events"][-limit:])))
            if path == "/api/alerts":
                return self._json(200, list(reversed(st.state["alerts"])))
            return self._json(404, {"error": "inconnu"})

        def _static(self, path: str):
            if not os.path.isdir(DIST):
                return self._send(500, "Interface non construite : lancez `npm run build` dans frontend/.".encode(),
                                  "text/plain; charset=utf-8")
            rel = os.path.normpath(path.lstrip("/")) if path not in ("", "/") else "index.html"
            full = os.path.realpath(os.path.join(DIST, rel))
            if not full.startswith(os.path.realpath(DIST) + os.sep) or not os.path.isfile(full):
                full = os.path.join(DIST, "index.html")
            with open(full, "rb") as f:
                body = f.read()
            if full.endswith("index.html"):
                body = body.replace(b"__WSM_TOKEN__", app.token.encode())
            ctype = mimetypes.guess_type(full)[0] or "application/octet-stream"
            if ctype.startswith("text/") or ctype in ("application/javascript",):
                ctype += "; charset=utf-8"
            return self._send(200, body, ctype)

        # ---------------------------------------------------------- POST
        def do_POST(self):
            if not self._host_ok():
                return self._send(403, b"Forbidden", "text/plain")
            if not self._auth_ok():
                return self._json(401, {"error": "jeton invalide"})
            path, body, st = urlparse(self.path).path, self._body(), app.store

            if path == "/api/scan":
                started = app.start_scan(bool(body.get("full")))
                return self._json(202 if started else 409, {"started": started})

            m = re.match(r"^/api/devices/([0-9A-Fa-f:]{17})(/forget)?$", path)
            if m:
                mac = m.group(1).upper()
                if not MAC_RE.match(mac):
                    return self._json(400, {"error": "MAC invalide"})
                if m.group(2):
                    return self._json(200, {"removed": st.forget_device(mac)})
                dev = st.update_device(mac, name=body.get("name"),
                                       authorized=body.get("authorized") if "authorized" in body else None,
                                       notes=body.get("notes"))
                if dev is None:
                    return self._json(404, {"error": "appareil inconnu"})
                scanner.reevaluate(st)
                return self._json(200, dev)

            m = re.match(r"^/api/alerts/([\w*]+)/ack$", path)
            if m:
                return self._json(200, {"ok": st.ack_alert(m.group(1))})

            if path == "/api/checklist":
                key, value = body.get("key"), body.get("value")
                if key not in {c["key"] for c in analysis.CHECKLIST} or value not in CHECK_VALUES:
                    return self._json(400, {"error": "réponse invalide"})
                st.set_checklist(key, value)
                scanner.reevaluate(st)
                return self._json(200, app.state())

            m = re.match(r"^/api/actions/(\w+)$", path)
            if m:
                status = body.get("status")
                if status not in ACTION_STATUSES:
                    return self._json(400, {"error": "statut invalide"})
                # Une autorisation n'est enregistrée qu'avec une confirmation explicite.
                if status == "autorisée" and body.get("confirm") is not True:
                    return self._json(400, {"error": "confirmation explicite requise"})
                if m.group(1) not in {a["id"] for a in app.actions()}:
                    return self._json(404, {"error": "action inconnue"})
                return self._json(200, st.set_action(m.group(1), status))

            if path == "/api/settings":
                try:
                    s = st.set_settings(body)
                except (TypeError, ValueError):
                    return self._json(400, {"error": "réglage invalide"})
                app.monitor.wake.set()   # applique tout de suite le nouvel intervalle
                return self._json(200, s)

            return self._json(404, {"error": "inconnu"})

    return Handler


def serve(port: int = 8765, open_browser: bool = True, monitor: bool = True) -> None:
    url = f"http://127.0.0.1:{port}/"
    store = Store()
    app = App(store, port)
    try:
        httpd = ThreadingHTTPServer(("127.0.0.1", port), make_handler(app))
    except OSError:
        # Une instance tourne déjà (ex. surveillance au démarrage) : on l'utilise.
        print(f"WiFi Security Manager est déjà en cours d'exécution : {url}")
        if open_browser:
            webbrowser.open(url)
        return
    print(f"WiFi Security Manager {__version__} — tableau de bord : {url}")
    print("Accessible uniquement depuis ce PC. Ctrl+C pour arrêter.", flush=True)
    if monitor:
        app.monitor.start()
    if open_browser:
        threading.Timer(1.0, lambda: webbrowser.open(url)).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        app.monitor.stop()
        httpd.server_close()
