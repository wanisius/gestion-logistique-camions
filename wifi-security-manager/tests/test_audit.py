import socket
import threading
import unittest

from wsm import audit


class FakeService:
    """Petit serveur TCP local : envoie une bannière puis se tait (non destructif à tester)."""
    def __init__(self, banner=b""):
        self.banner = banner
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.sock.bind(("127.0.0.1", 0))
        self.sock.listen(8)
        self.port = self.sock.getsockname()[1]
        self.running = True
        threading.Thread(target=self._serve, daemon=True).start()

    def _serve(self):
        while self.running:
            try:
                c, _ = self.sock.accept()
            except OSError:
                return
            try:
                if self.banner:
                    c.sendall(self.banner)
                c.recv(128)
            except OSError:
                pass
            finally:
                c.close()

    def stop(self):
        self.running = False
        self.sock.close()


class AuditTests(unittest.TestCase):
    def test_open_port_detected_with_banner(self):
        svc = FakeService(banner=b"220 FakeFTP ready\r\n")
        try:
            f = audit._probe("127.0.0.1", svc.port, timeout=1.0)
            self.assertIsNotNone(f)
            self.assertIn("FakeFTP", f.banner)
        finally:
            svc.stop()

    def test_closed_port_returns_none(self):
        # Port presque certainement fermé.
        self.assertIsNone(audit._probe("127.0.0.1", 1, timeout=0.3))

    def test_risk_catalog_and_sorting(self):
        svc = FakeService()
        try:
            # On teste plusieurs ports fictifs via le catalogue (sans écoute) : seul le port ouvert ressort.
            ha = audit.audit_host("127.0.0.1", [1, 2, svc.port], timeout=0.4, workers=4)
            self.assertEqual([s.port for s in ha.services], [svc.port])
        finally:
            svc.stop()

    def test_summary_counts_by_risk(self):
        findings = [
            audit.ServiceFinding("10.0.0.1", 23, "Telnet", "critique", "x"),
            audit.ServiceFinding("10.0.0.1", 445, "SMB", "élevé", "x"),
            audit.ServiceFinding("10.0.0.2", 80, "HTTP", "moyen", "x"),
        ]
        ha1 = audit.HostAudit("10.0.0.1", services=findings[:2])
        ha2 = audit.HostAudit("10.0.0.2", services=findings[2:])
        s = audit.summarize([ha1, ha2])
        self.assertEqual(s["services_total"], 3)
        self.assertEqual(s["by_risk"]["critique"], 1)
        self.assertEqual(len(s["critical_services"]), 2)   # critique + élevé

    def test_admin_ports_flagged_for_cred_check(self):
        self.assertIn(3389, audit.ADMIN_PORTS)
        self.assertIn(23, audit.SERVICES)
        # Le catalogue n'essaie JAMAIS d'identifiants : pas de champ "password" nulle part.
        self.assertFalse(any("password" in str(v).lower() for v in audit.SERVICES.values()))


if __name__ == "__main__":
    unittest.main()


class AuthorizationGate(unittest.TestCase):
    """Le garde-fou d'autorisation de `wsm audit`."""

    def test_flag_authorizes(self):
        from wsm import auditcli
        self.assertTrue(auditcli._confirm(authorized=True))

    def test_no_tty_without_flag_refuses(self):
        import builtins
        from wsm import auditcli

        def boom(_prompt=""):
            raise EOFError
        orig = builtins.input
        builtins.input = boom
        try:
            self.assertFalse(auditcli._confirm(authorized=False))
        finally:
            builtins.input = orig

    def test_interactive_non_requires_oui(self):
        import builtins
        from wsm import auditcli
        orig = builtins.input
        try:
            builtins.input = lambda _p="": "non"
            self.assertFalse(auditcli._confirm(authorized=False))
            builtins.input = lambda _p="": "oui"
            self.assertTrue(auditcli._confirm(authorized=False))
        finally:
            builtins.input = orig
