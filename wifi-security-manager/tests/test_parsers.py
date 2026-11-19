import os
import unittest

from wsm import netinfo, wifi, discovery, router

FIX = os.path.join(os.path.dirname(__file__), "fixtures")


def fixture(name):
    with open(os.path.join(FIX, name), encoding="utf-8") as f:
        return f.read()


class WifiParsing(unittest.TestCase):
    def test_french(self):
        w = wifi.parse_netsh_interfaces(fixture("netsh_interfaces_fr.txt"))
        self.assertTrue(w.connected)
        self.assertEqual(w.ssid, "MaisonWifi")
        self.assertEqual(w.bssid, "A4:3E:51:AA:BB:CC")
        self.assertEqual(w.security_level, "wpa2")
        self.assertEqual(w.cipher, "CCMP")
        self.assertEqual(w.channel, "36")
        self.assertEqual(w.signal, 87)

    def test_english(self):
        w = wifi.parse_netsh_interfaces(fixture("netsh_interfaces_en.txt"))
        self.assertEqual(w.ssid, "HomeNet")
        self.assertEqual(w.security_level, "wpa3")

    def test_disconnected(self):
        w = wifi.parse_netsh_interfaces("    Nom : Wi-Fi\n    État : déconnecté\n")
        self.assertFalse(w.connected)

    def test_classify(self):
        self.assertEqual(wifi.classify_auth("WPA2-Personal WPA3-Personal"), "wpa2/wpa3")
        self.assertEqual(wifi.classify_auth("Ouvrir"), "ouvert")
        self.assertEqual(wifi.classify_auth("WEP"), "wep")
        self.assertEqual(wifi.classify_auth("WPA-Personal"), "wpa")


class NetParsing(unittest.TestCase):
    def test_ipconfig_fr(self):
        c = netinfo.parse_ipconfig(fixture("ipconfig_fr.txt"))
        self.assertEqual(c.ip, "192.168.1.23")
        self.assertEqual(c.prefix, 24)
        self.assertEqual(c.subnet, "192.168.1.0/24")
        self.assertEqual(c.gateway, "192.168.1.1")
        self.assertEqual(c.mac, "3C:22:FB:12:34:56")
        self.assertEqual(c.interface_type, "wifi")
        self.assertTrue(c.dhcp)
        self.assertEqual(c.dns_servers, ["192.168.1.1", "8.8.8.8"])

    def test_ps_config(self):
        c = netinfo.parse_ps_config({
            "Interface": "Wi-Fi", "Description": "Intel Wi-Fi 6", "IP": "10.0.0.5", "Prefix": 24,
            "Gateway": "10.0.0.1", "GatewayMac": "AA-BB-CC-DD-EE-FF", "Mac": "11-22-33-44-55-66",
            "Dns": "10.0.0.1", "Dhcp": True, "IPv6": True,
            "Firewall": [{"Name": "Domain", "Enabled": True}, {"Name": "Public", "Enabled": False}]})
        self.assertEqual(c.subnet, "10.0.0.0/24")
        self.assertEqual(c.gateway_mac, "AA:BB:CC:DD:EE:FF")
        self.assertEqual(c.dns_servers, ["10.0.0.1"])
        self.assertEqual(c.pc_firewall, {"Domain": True, "Public": False})

    def test_arp_fr(self):
        pairs = discovery.parse_arp_a(fixture("arp_fr.txt"))
        self.assertIn(("192.168.1.40", "B8:27:EB:01:02:03"), pairs)
        unicast = [p for p in pairs if discovery._is_unicast(p[1])]
        self.assertEqual(len(unicast), 2)

    def test_nearby_networks(self):
        nets = router.parse_netsh_networks(fixture("netsh_networks_fr.txt"))
        self.assertEqual(len(nets), 2)
        self.assertEqual(nets[1]["security_level"], "ouvert")
        self.assertEqual(nets[1]["bssids"][0]["bssid"], "DE:AD:BE:EF:00:01")


class Identification(unittest.TestCase):
    def test_brand(self):
        self.assertEqual(router.identify_brand("Livebox 6")[0], "Livebox")
        self.assertEqual(router.identify_brand("", "Freebox OS")[0], "Freebox")
        self.assertEqual(router.identify_brand("LuCI - OpenWrt")[0], "OpenWrt")
        self.assertEqual(router.identify_brand("rien")[0], "")

    def test_dns_classification(self):
        out = router.classify_dns(["192.168.1.1", "9.9.9.9", "192.168.1.50", "212.27.40.240"], "192.168.1.1")
        types = [o["type"] for o in out]
        self.assertEqual(types[0], "routeur")
        self.assertTrue(types[1].startswith("public (Quad9"))
        self.assertTrue(types[2].startswith("local"))
        self.assertTrue(types[3].startswith("public inconnu"))

    def test_randomized_mac(self):
        from wsm import oui
        self.assertTrue(oui.is_randomized("DA:A1:19:00:00:01"))
        self.assertFalse(oui.is_randomized("B8:27:EB:00:00:01"))
        self.assertEqual(oui.vendor("B8:27:EB:00:00:01"), "Raspberry Pi Foundation")


class Safety(unittest.TestCase):
    def test_wifi_key_command_forbidden(self):
        from wsm import system
        with self.assertRaises(system.CommandError):
            system.run(["netsh", "wlan", "show", "profile", "name=x", "key=clear"])
        with self.assertRaises(system.CommandError):
            system.run(["netsh", "wlan", "set", "hostednetwork"])
        with self.assertRaises(system.CommandError):
            system.run(["rm", "-rf", "/"])


if __name__ == "__main__":
    unittest.main()


class GatewayWebInterface(unittest.TestCase):
    def test_https_on_8080_detected(self):
        res = {"reachable": True, "status": 400, "title": "400 The plain HTTP request was sent to HTTPS port"}
        self.assertTrue(router.needs_tls(res))
        self.assertFalse(router.needs_tls({"reachable": True, "title": "Livebox"}))
        self.assertFalse(router.needs_tls({"reachable": False}))

    def test_admin_url_keeps_port(self):
        from wsm import analysis
        gw = "192.168.22.1"
        self.assertEqual(analysis.admin_url({"gateway": gw, "https": {"reachable": True, "port": 8080}}),
                         "https://192.168.22.1:8080")
        self.assertEqual(analysis.admin_url({"gateway": gw, "https": {"reachable": True, "port": 443}}),
                         "https://192.168.22.1")
        self.assertEqual(analysis.admin_url({"gateway": gw, "http": {"reachable": True, "port": 80}}),
                         "http://192.168.22.1")

    def test_enterprise_firewall_brand(self):
        from wsm import oui
        self.assertEqual(oui.vendor("00:01:21:48:94:91"), "WatchGuard Technologies")
        self.assertEqual(router.identify_brand("WatchGuard Technologies")[0], "WatchGuard Firebox")
