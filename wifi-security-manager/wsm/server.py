"""Serveur du tableau de bord et API JSON.

Par défaut, écoute sur 127.0.0.1 uniquement. L'accès depuis un téléphone
(Android…) est optionnel : désactivé tant que vous ne l'activez pas depuis le PC.

Protections : vérification de l'en-tête Host (contre le « DNS rebinding »),
jeton exigé sur toute l'API. Le jeton du PC est aléatoire à chaque démarrage et
n'est injecté dans la page que pour les connexions locales ; le téléphone utilise
un jeton d'appairage distinct, transmis par QR code et révocable à tout moment.
L'activation de l'accès mobile et l'affichage du QR code ne sont possibles que
depuis le PC lui-même.
"""

from __future__ import annotations

import hmac
import ipaddress
import json
import mimetypes
import os
import re
import secrets
import socket
import threading
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from . import __version__, analysis, scanner
from .store import Store

# Types MIME imposés : sous Windows, le registre associe parfois .js à text/plain,
# ce qui empêcherait le navigateur d'exécuter l'interface.
for _ext, _type in ((".js", "text/javascript"), (".css", "text/css"), (".html", "text/html"),
                    (".webmanifest", "application/manifest+json"), (".png", "image/png"), (".svg", "image/svg+xml")):
    mimetypes.add_type(_type, _ext)

DIST = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")
ACTION_STATUSES = {"proposée", "autorisée", "refusée", "appliquée"}
CHECK_VALUES = {analysis.YES, analysis.NO, analysis.UNKNOWN}
MAC_RE = re.compile(r"^[0-9A-F]{2}(:[0-9A-F]{2}){5}$")


class App:
    def __init__(self, store: Store, port: int):
        self.store = store
        self.port = port
        self.token = secrets.token_urlsafe(24)
        self.monitor = scanner.Monitor(store, log=lambda m: print(m, flush=True), after_scan=self.refresh_lan)
        self.scanning = False
        self.handler = None
        self.lan_httpd: ThreadingHTTPServer | None = None
        self.lan_ip = ""
        self.lan_error = ""
        self.lan_lock = threading.Lock()

    # ------------------------------------------------------------ accès mobile

    def local_hosts(self) -> set[str]:
        return {f"127.0.0.1:{self.port}", f"localhost:{self.port}"}

    def allowed_hosts(self) -> set[str]:
        hosts = self.local_hosts()
        if self.lan_httpd:
            hosts.add(f"{self.lan_ip}:{self.port}")
        return hosts

    def mobile_token(self) -> str:
        with self.store.lock:
            tok = self.store.state.get("mobile_token")
            if not tok:
                tok = self.store.state["mobile_token"] = secrets.token_urlsafe(24)
                self.store.save()
            return tok

    def revoke_mobile(self) -> None:
        with self.store.lock:
            self.store.state["mobile_token"] = secrets.token_urlsafe(24)
            self.store.save()

    @staticmethod
    def detect_lan_ip() -> str:
        """Adresse IPv4 privée du PC sur le réseau local (aucun paquet n'est envoyé)."""
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
                s.connect(("192.0.2.1", 9))   # adresse de documentation : seule la table de routage est consultée
                ip = s.getsockname()[0]
        except OSError:
            ip = ""
        try:
            addr = ipaddress.ip_address(ip)
            return ip if addr.is_private and not addr.is_loopback else ""
        except ValueError:
            return ""

    def start_lan(self) -> bool:
        with self.lan_lock:
            if self.lan_httpd:
                return True
            ip = self.detect_lan_ip() or self.store.state.get("network", {}).get("ip", "")
            if not ip:
                self.lan_error = "Adresse du PC sur le réseau local introuvable."
                return False
            try:
                httpd = ThreadingHTTPServer((ip, self.port), self.handler)
            except OSError as e:
                self.lan_error = f"Impossible d'écouter sur {ip}:{self.port} ({e.strerror or e})."
                return False
            self.lan_httpd, self.lan_ip, self.lan_error = httpd, ip, ""
            threading.Thread(target=httpd.serve_forever, daemon=True, name="wsm-lan").start()
            print(f"Accès mobile actif : http://{ip}:{self.port}/ (appairage par QR code depuis le PC)", flush=True)
            return True

    def stop_lan(self) -> None:
        with self.lan_lock:
            if self.lan_httpd:
                self.lan_httpd.shutdown()
                self.lan_httpd.server_close()
                self.lan_httpd = None
                print("Accès mobile désactivé.", flush=True)

    def set_mobile(self, enabled: bool) -> None:
        with self.store.lock:
            self.store.state["settings"]["mobile_access"] = enabled
            self.store.save()
        self.start_lan() if enabled else self.stop_lan()

    def refresh_lan(self) -> None:
        """Après chaque analyse : suit un éventuel changement d'adresse IP du PC."""
        if not self.store.state["settings"].get("mobile_access"):
            return
        ip = self.detect_lan_ip()
        if self.lan_httpd and ip and ip != self.lan_ip:
            self.stop_lan()
        if not self.lan_httpd:
            self.start_lan()

    def mobile_info(self) -> dict:
        on = self.lan_httpd is not None
        return {"enabled": bool(self.store.state["settings"].get("mobile_access")), "listening": on,
                "ip": self.lan_ip, "port": self.port, "error": self.lan_error,
                "url": f"http://{self.lan_ip}:{self.port}/#k={self.mobile_token()}" if on else ""}

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

    def state(self, is_local: bool = True) -> dict:
        s = self.store.state
        return {
            "version": __version__, "is_local": is_local, "scanning": self.scanning, "last_scan": s.get("last_scan"),
            "network": s.get("network", {}), "wifi": s.get("wifi", {}), "router": s.get("router", {}),
            "score": s.get("score"), "score_history": s.get("score_history", [])[-100:],
            "findings": s.get("findings", []), "settings": s["settings"],
            "checklist": [{**c, "answer": (s["checklist"].get(c["key"]) or {}).get("value", "inconnu")}
                          for c in analysis.CHECKLIST],
            "actions": self.actions(),
            "unread_alerts": sum(1 for a in s["alerts"] if not a["acknowledged"]),
            "mobile": self.mobile_info() if is_local else None,
        }


def make_handler(app: App):
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
            return self.headers.get("Host", "") in app.allowed_hosts()

        def _is_local(self) -> bool:
            """Requête émise depuis le PC lui-même (et non depuis le téléphone)."""
            return (self.server is not app.lan_httpd and self.client_address[0] == "127.0.0.1"
                    and self.headers.get("Host", "") in app.local_hosts())

        def _auth_ok(self) -> bool:
            tok = self.headers.get("X-WSM-Token", "")
            if app.lan_httpd is not None and hmac.compare_digest(tok, app.mobile_token()):
                return True
            return self._is_local() and hmac.compare_digest(tok, app.token)

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
                return self._json(200, app.state(self._is_local()))
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
            if full.endswith("index.html") and self._is_local():
                # Le jeton n'est jamais servi au réseau local : le téléphone s'appaire par QR code.
                body = body.replace(b"__WSM_TOKEN__", app.token.encode())
            ctype = mimetypes.guess_type(full)[0] or "application/octet-stream"
            if ctype.startswith("text/") or ctype == "application/manifest+json":
                ctype += "; charset=utf-8"
            return self._send(200, body, ctype)

        # ---------------------------------------------------------- POST
        def do_POST(self):
            if not self._host_ok():
                return self._send(403, b"Forbidden", "text/plain")
            if not self._auth_ok():
                return self._json(401, {"error": "jeton invalide"})
            path, body, st = urlparse(self.path).path, self._body(), app.store

            if path.startswith("/api/mobile"):
                if not self._is_local():
                    return self._json(403, {"error": "à faire depuis le PC"})
                if path == "/api/mobile":
                    app.set_mobile(body.get("enabled") is True)
                elif path == "/api/mobile/revoke":
                    app.revoke_mobile()
                else:
                    return self._json(404, {"error": "inconnu"})
                return self._json(200, app.mobile_info())

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
                return self._json(200, app.state(self._is_local()))

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
    app.handler = make_handler(app)
    try:
        httpd = ThreadingHTTPServer(("127.0.0.1", port), app.handler)
    except OSError:
        # Une instance tourne déjà (ex. surveillance au démarrage) : on l'utilise.
        print(f"WiFi Security Manager est déjà en cours d'exécution : {url}")
        if open_browser:
            webbrowser.open(url)
        return
    print(f"WiFi Security Manager {__version__} — tableau de bord : {url}")
    print("Accessible uniquement depuis ce PC. Ctrl+C pour arrêter.", flush=True)
    if store.state["settings"].get("mobile_access"):
        app.start_lan()
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
        app.stop_lan()
        httpd.server_close()
