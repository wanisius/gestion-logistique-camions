import json
import os
import tempfile
import threading
import unittest
import urllib.request
from datetime import datetime, timedelta, timezone

from wsm import analysis
from wsm.store import Store


def host(ip, mac, **kw):
    return {"ip": ip, "mac": mac, "hostname": "", "vendor": "", "randomized": False,
            "is_gateway": False, "is_self": False, "model": "", **kw}


class StoreTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.store = Store(os.path.join(self.tmp.name, "s.json"))

    def tearDown(self):
        self.tmp.cleanup()

    def test_first_scan_is_baseline_then_new_device_alerts(self):
        new = self.store.merge_hosts([host("192.168.1.1", "AA:00:00:00:00:01", is_gateway=True),
                                      host("192.168.1.5", "AA:00:00:00:00:02")])
        self.assertEqual(new, [])
        cats = {d["mac"]: d["category"] for d in self.store.devices()}
        self.assertEqual(cats["AA:00:00:00:00:01"], "connu")
        self.assertEqual(cats["AA:00:00:00:00:02"], "nouveau")
        new = self.store.merge_hosts([host("192.168.1.1", "AA:00:00:00:00:01", is_gateway=True),
                                      host("192.168.1.9", "AA:00:00:00:00:03")])
        self.assertEqual([d["mac"] for d in new], ["AA:00:00:00:00:03"])
        types = [e["type"] for e in self.store.state["events"]]
        self.assertIn("déconnexion", types)

    def test_unknown_after_24h_and_authorize(self):
        self.store.merge_hosts([host("192.168.1.5", "AA:00:00:00:00:02")])
        old = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
        self.store.state["devices"]["AA:00:00:00:00:02"]["first_seen"] = old
        self.assertEqual(self.store.devices()[0]["category"], "inconnu")
        d = self.store.update_device("AA:00:00:00:00:02", name="Télé du salon", authorized=True)
        self.assertEqual(d["category"], "connu")
        self.assertEqual(d["custom_name"], "Télé du salon")

    def test_persistence(self):
        self.store.merge_hosts([host("192.168.1.5", "AA:00:00:00:00:02")])
        again = Store(self.store.path)
        self.assertIn("AA:00:00:00:00:02", again.state["devices"])


class AnalysisTests(unittest.TestCase):
    def evaluate(self, wifi=None, router=None, devices=None, answers=None, network=None):
        return {f.id: f for f in analysis.evaluate(network or {}, wifi or {}, router or {"gateway": "192.168.1.1"},
                                                   devices or [], answers or {})}

    def test_open_network_is_critical(self):
        f = self.evaluate(wifi={"connected": True, "ssid": "x", "security_level": "ouvert"})
        self.assertEqual(f["wifi_security"].severity, "critique")
        self.assertEqual(f["wifi_security"].status, "risque")

    def test_evil_twin(self):
        f = self.evaluate(wifi={"connected": True, "ssid": "Maison", "security_level": "wpa2"},
                          router={"gateway": "1", "nearby_networks": [
                              {"ssid": "Maison", "security_level": "ouvert", "authentication": "Ouvrir"}]})
        self.assertIn("evil_twin", f)

    def test_checklist_changes_score(self):
        base = analysis.score(list(self.evaluate().values()))["value"]
        good = {k["key"]: {"value": "oui"} for k in analysis.CHECKLIST}
        better = analysis.score(list(self.evaluate(answers=good).values()))["value"]
        bad = {k["key"]: {"value": "non"} for k in analysis.CHECKLIST}
        worse = analysis.score(list(self.evaluate(answers=bad).values()))["value"]
        self.assertGreater(better, base)
        self.assertLess(worse, base)

    def test_ports_and_upnp(self):
        f = self.evaluate(router={"gateway": "192.168.1.1", "open_ports": {"23": "Telnet", "80": "HTTP"},
                                  "http": {"reachable": True}, "upnp_igd": True,
                                  "port_mappings": [{"protocol": "TCP", "external_port": "3389",
                                                     "internal_client": "192.168.1.9", "internal_port": "3389",
                                                     "description": "rdp"}]})
        self.assertEqual(f["port_telnet"].severity, "élevé")
        self.assertEqual(f["upnp"].severity, "élevé")
        self.assertIn("admin_http", f)
        self.assertTrue(f["upnp"].router_change)

    def test_pc_firewall_off(self):
        f = self.evaluate(network={"pc_firewall": {"Public": False, "Private": True}})
        self.assertEqual(f["pc_firewall"].status, "risque")


class ServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from http.server import ThreadingHTTPServer
        from wsm import server
        cls.tmp = tempfile.TemporaryDirectory()
        store = Store(os.path.join(cls.tmp.name, "s.json"))
        store.merge_hosts([host("192.168.1.5", "AA:00:00:00:00:02")])
        cls.httpd = ThreadingHTTPServer(("127.0.0.1", 0), None)
        port = cls.httpd.server_address[1]
        cls.app = server.App(store, port)
        cls.httpd.RequestHandlerClass = server.make_handler(cls.app)
        threading.Thread(target=cls.httpd.serve_forever, daemon=True).start()
        cls.base = f"http://127.0.0.1:{port}"

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.tmp.cleanup()

    def call(self, path, body=None, token=True, host=None):
        req = urllib.request.Request(self.base + path, data=json.dumps(body).encode() if body is not None else None)
        if token:
            req.add_header("X-WSM-Token", self.app.token)
        if host:
            req.add_header("Host", host)
        try:
            with urllib.request.urlopen(req) as r:
                return r.status, json.loads(r.read())
        except urllib.error.HTTPError as e:
            return e.code, None

    def test_token_required(self):
        self.assertEqual(self.call("/api/state", token=False)[0], 401)

    def test_host_check(self):
        self.assertEqual(self.call("/api/state", host="evil.example:80")[0], 403)

    def test_rename_device(self):
        code, dev = self.call("/api/devices/AA:00:00:00:00:02", {"name": "Imprimante", "authorized": True})
        self.assertEqual(code, 200)
        self.assertEqual(dev["category"], "connu")

    def test_checklist_and_action_confirmation(self):
        code, state = self.call("/api/checklist", {"key": "wps", "value": "non"})
        self.assertEqual(code, 200)
        self.assertTrue(any(a["id"] == "check_wps" for a in state["actions"]))
        self.assertEqual(self.call("/api/actions/check_wps", {"status": "autorisée"})[0], 400)
        code, res = self.call("/api/actions/check_wps", {"status": "autorisée", "confirm": True})
        self.assertEqual(code, 200)
        self.assertEqual(self.call("/api/checklist", {"key": "wps", "value": "hack"})[0], 400)


if __name__ == "__main__":
    unittest.main()


class MobileAccessTests(unittest.TestCase):
    """Accès depuis un téléphone : simulé par une écoute sur 127.0.0.2."""

    def setUp(self):
        from http.server import ThreadingHTTPServer
        from wsm import server
        self.tmp = tempfile.TemporaryDirectory()
        store = Store(os.path.join(self.tmp.name, "s.json"))
        self.httpd = ThreadingHTTPServer(("127.0.0.1", 0), None)
        self.port = self.httpd.server_address[1]
        self.app = server.App(store, self.port)
        self.app.detect_lan_ip = lambda: "127.0.0.2"
        self.app.handler = self.httpd.RequestHandlerClass = server.make_handler(self.app)
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()

    def tearDown(self):
        self.app.stop_lan()
        self.httpd.shutdown()
        self.tmp.cleanup()

    def call(self, host, path, token=None, body=None):
        req = urllib.request.Request(f"http://{host}:{self.port}{path}",
                                     data=json.dumps(body).encode() if body is not None else None)
        if token:
            req.add_header("X-WSM-Token", token)
        try:
            with urllib.request.urlopen(req, timeout=5) as r:
                raw = r.read()
                return r.status, json.loads(raw) if path.startswith("/api") else raw.decode()
        except urllib.error.HTTPError as e:
            return e.code, None
        except urllib.error.URLError:
            return None, None

    def test_disabled_by_default(self):
        self.assertIsNone(self.call("127.0.0.2", "/api/state")[0])   # personne n'écoute

    def test_pairing_flow(self):
        code, info = self.call("127.0.0.1", "/api/mobile", self.app.token, {"enabled": True})
        self.assertEqual(code, 200)
        self.assertTrue(info["listening"])
        mtok = info["url"].split("#k=")[1]
        # Sans jeton, ou avec le jeton du PC : refusé depuis le réseau.
        self.assertEqual(self.call("127.0.0.2", "/api/state")[0], 401)
        self.assertEqual(self.call("127.0.0.2", "/api/state", self.app.token)[0], 401)
        code, st = self.call("127.0.0.2", "/api/state", mtok)
        self.assertEqual(code, 200)
        self.assertFalse(st["is_local"])
        self.assertIsNone(st["mobile"])
        # La page servie au téléphone ne contient pas le jeton du PC.
        code, html = self.call("127.0.0.2", "/")
        if code == 200:
            self.assertNotIn(self.app.token, html)
        # Le téléphone ne peut ni lire le QR code ni gérer l'accès mobile.
        self.assertEqual(self.call("127.0.0.2", "/api/mobile/revoke", mtok, {})[0], 403)
        # Révocation depuis le PC : l'ancien appairage est invalidé.
        self.call("127.0.0.1", "/api/mobile/revoke", self.app.token, {})
        self.assertEqual(self.call("127.0.0.2", "/api/state", mtok)[0], 401)
        # Désactivation : plus d'écoute réseau.
        self.call("127.0.0.1", "/api/mobile", self.app.token, {"enabled": False})
        self.assertIsNone(self.call("127.0.0.2", "/api/state")[0])
