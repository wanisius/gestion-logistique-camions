"""Identification du routeur et vérifications légères, sans authentification.

Ce module n'envoie JAMAIS d'identifiants et ne modifie rien :
- SSDP/UPnP : écoute des annonces et lecture des descriptions publiques (XML) ;
- UPnP IGD : lecture seule de la table des redirections de ports ;
- HTTP(S) : une requête GET sur la page d'accueil de la passerelle ;
- TCP : test de connexion sur une courte liste de ports de la passerelle uniquement ;
- DNS : détection de la redirection des domaines inexistants ;
- Wi-Fi : liste des réseaux visibles pour repérer un faux point d'accès.
"""

from __future__ import annotations

import http.client
import ipaddress
import re
import secrets
import socket
import ssl
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
from dataclasses import asdict, dataclass, field

from . import system
from .wifi import classify_auth

GATEWAY_PORTS = {
    21: "FTP", 22: "SSH", 23: "Telnet", 53: "DNS", 80: "HTTP (administration)",
    443: "HTTPS (administration)", 445: "SMB (partage de fichiers)", 5000: "UPnP",
    7547: "TR-069 (gestion opérateur)", 8080: "HTTP alternatif", 8443: "HTTPS alternatif",
    49000: "TR-064 / UPnP", 49152: "UPnP",
}

PUBLIC_RESOLVERS = {
    "1.1.1.1": "Cloudflare", "1.0.0.1": "Cloudflare", "8.8.8.8": "Google", "8.8.4.4": "Google",
    "9.9.9.9": "Quad9", "149.112.112.112": "Quad9", "208.67.222.222": "OpenDNS",
    "208.67.220.220": "OpenDNS", "94.140.14.14": "AdGuard", "94.140.15.15": "AdGuard",
}

# (motif, marque, fabricant/opérateur) — testé sur titre, en-têtes, UPnP et fabricant MAC.
BRANDS = [
    (r"livebox", "Livebox", "Orange"),
    (r"freebox", "Freebox", "Free"),
    (r"\bbbox\b|bouygues", "Bbox", "Bouygues Telecom"),
    (r"neufbox|\bsfr\b", "SFR Box", "SFR"),
    (r"fritz", "FRITZ!Box", "AVM"),
    (r"tp-?link|archer|\bdeco\b", "TP-Link", "TP-Link"),
    (r"netgear|nighthawk|orbi", "Netgear", "Netgear"),
    (r"asuswrt|\basus\b|rt-a[cx]", "ASUS", "ASUS"),
    (r"linksys", "Linksys", "Linksys"),
    (r"d-?link", "D-Link", "D-Link"),
    (r"huawei|echolife|hg8\d\d", "Huawei", "Huawei"),
    (r"\bzte\b|zxhn", "ZTE", "ZTE"),
    (r"sagemcom|f@st", "Sagemcom", "Sagemcom"),
    (r"technicolor|thomson", "Technicolor", "Technicolor"),
    (r"unifi|ubiquiti|ubnt", "Ubiquiti UniFi", "Ubiquiti"),
    (r"mikrotik|routeros", "MikroTik", "MikroTik"),
    (r"luci|openwrt", "OpenWrt", "OpenWrt"),
    (r"dd-wrt", "DD-WRT", "DD-WRT"),
    (r"inwi", "Box inwi", "inwi"),
    (r"maroc telecom|iam\b", "Box Maroc Telecom", "Maroc Telecom"),
]


@dataclass
class UpnpDevice:
    ip: str
    location: str = ""
    server: str = ""
    friendly_name: str = ""
    manufacturer: str = ""
    model_name: str = ""
    model_number: str = ""
    model_description: str = ""
    device_type: str = ""
    wan_control_urls: list[str] = field(default_factory=list)


@dataclass
class RouterReport:
    gateway: str = ""
    brand: str = ""
    vendor: str = ""
    model: str = ""
    firmware: str = ""
    identification_sources: list[str] = field(default_factory=list)
    http: dict = field(default_factory=dict)
    https: dict = field(default_factory=dict)
    open_ports: dict[str, str] = field(default_factory=dict)
    upnp_enabled: bool = False
    upnp_igd: bool = False
    port_mappings: list[dict] = field(default_factory=list)
    dns: dict = field(default_factory=dict)
    nearby_networks: list[dict] = field(default_factory=list)
    compatibility: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return asdict(self)


# ------------------------------------------------------------------- SSDP/UPnP

def ssdp_discover(timeout: float = 3.0) -> dict[str, list[dict]]:
    """Envoie une requête de découverte SSDP et collecte les réponses, groupées par IP."""
    msg = ("M-SEARCH * HTTP/1.1\r\nHOST: 239.255.255.250:1900\r\nMAN: \"ssdp:discover\"\r\n"
           "MX: 2\r\nST: ssdp:all\r\n\r\n").encode()
    found: dict[str, list[dict]] = {}
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
    try:
        sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, 2)
        sock.settimeout(0.5)
        sock.sendto(msg, ("239.255.255.250", 1900))
        end = time.time() + timeout
        while time.time() < end:
            try:
                data, (ip, _) = sock.recvfrom(8192)
            except socket.timeout:
                continue
            headers = {}
            for line in data.decode(errors="replace").split("\r\n")[1:]:
                k, _, v = line.partition(":")
                if k:
                    headers[k.strip().lower()] = v.strip()
            found.setdefault(ip, []).append(headers)
    except OSError:
        pass
    finally:
        sock.close()
    return found


def _local_url(url: str, expected_ip: str) -> bool:
    """N'accepte que des URL pointant vers l'appareil qui a répondu (pas de rebond ailleurs)."""
    try:
        host = urllib.parse.urlparse(url).hostname or ""
        return host == expected_ip and ipaddress.ip_address(host).is_private
    except ValueError:
        return False


def _text(el, path, ns):
    found = el.find(path, ns)
    return (found.text or "").strip() if found is not None and found.text else ""


def fetch_upnp_description(ip: str, location: str, server: str = "") -> UpnpDevice | None:
    if not _local_url(location, ip):
        return None
    try:
        with urllib.request.urlopen(location, timeout=3) as resp:
            body = resp.read(256 * 1024)
        root = ET.fromstring(body)
    except Exception:
        return None
    ns = {"u": root.tag.split("}")[0].strip("{")} if root.tag.startswith("{") else {"u": ""}
    p = "u:" if ns["u"] else ""
    dev = root.find(f"{p}device", ns)
    if dev is None:
        return None
    d = UpnpDevice(ip=ip, location=location, server=server,
                   friendly_name=_text(dev, f"{p}friendlyName", ns),
                   manufacturer=_text(dev, f"{p}manufacturer", ns),
                   model_name=_text(dev, f"{p}modelName", ns),
                   model_number=_text(dev, f"{p}modelNumber", ns),
                   model_description=_text(dev, f"{p}modelDescription", ns),
                   device_type=_text(dev, f"{p}deviceType", ns))
    for svc in root.iter(f"{{{ns['u']}}}service" if ns["u"] else "service"):
        stype = _text(svc, f"{p}serviceType", ns)
        if "WANIPConnection" in stype or "WANPPPConnection" in stype:
            ctrl = urllib.parse.urljoin(location, _text(svc, f"{p}controlURL", ns))
            d.wan_control_urls.append(f"{stype}|{ctrl}")
    return d


def upnp_port_mappings(device: UpnpDevice, limit: int = 64) -> list[dict]:
    """Lecture seule de la table des redirections UPnP (action GetGenericPortMappingEntry)."""
    mappings = []
    for entry in device.wan_control_urls:
        stype, _, ctrl = entry.partition("|")
        if not _local_url(ctrl, device.ip):
            continue
        for index in range(limit):
            body = (
                '<?xml version="1.0"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" '
                's:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><s:Body>'
                f'<u:GetGenericPortMappingEntry xmlns:u="{stype}">'
                f"<NewPortMappingIndex>{index}</NewPortMappingIndex>"
                "</u:GetGenericPortMappingEntry></s:Body></s:Envelope>").encode()
            req = urllib.request.Request(ctrl, data=body, headers={
                "Content-Type": 'text/xml; charset="utf-8"',
                "SOAPAction": f'"{stype}#GetGenericPortMappingEntry"'})
            try:
                with urllib.request.urlopen(req, timeout=3) as resp:
                    xml = resp.read(64 * 1024).decode(errors="replace")
            except Exception:
                break   # erreur SOAP 713 = fin de la table
            get = lambda tag: (re.search(rf"<{tag}>(.*?)</{tag}>", xml) or [None, ""])[1]
            mappings.append({
                "external_port": get("NewExternalPort"), "protocol": get("NewProtocol"),
                "internal_client": get("NewInternalClient"), "internal_port": get("NewInternalPort"),
                "description": get("NewPortMappingDescription"), "enabled": get("NewEnabled") in ("1", "true"),
                "remote_host": get("NewRemoteHost"),
            })
        if mappings:
            break
    return mappings


def discover_upnp_devices() -> list[UpnpDevice]:
    responses = ssdp_discover()
    tasks = []
    for ip, items in responses.items():
        seen = set()
        for h in items:
            loc = h.get("location", "")
            if loc and loc not in seen:
                seen.add(loc)
                tasks.append((ip, loc, h.get("server", "")))
    tasks = tasks[:40]
    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(lambda t: fetch_upnp_description(*t), tasks))
    # Une seule description par IP, en privilégiant la passerelle Internet (IGD).
    by_ip: dict[str, UpnpDevice] = {}
    for d in results:
        if d is None:
            continue
        cur = by_ip.get(d.ip)
        if cur is None or ("InternetGatewayDevice" in d.device_type and "InternetGatewayDevice" not in cur.device_type):
            by_ip[d.ip] = d
    # Les IP qui ont répondu en SSDP sans description lisible sont tout de même signalées.
    for ip, items in responses.items():
        if ip not in by_ip:
            by_ip[ip] = UpnpDevice(ip=ip, server=items[0].get("server", ""))
    return list(by_ip.values())


# --------------------------------------------------------------------- HTTP(S)

def http_probe(host: str, port: int, use_tls: bool) -> dict:
    """Une requête GET sur « / », sans identifiants. Le certificat n'est pas vérifié
    (les box utilisent des certificats auto-signés) : seules les métadonnées sont lues."""
    try:
        if use_tls:
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            conn = http.client.HTTPSConnection(host, port, timeout=4, context=ctx)
        else:
            conn = http.client.HTTPConnection(host, port, timeout=4)
        conn.request("GET", "/", headers={"User-Agent": "WiFiSecurityManager/1.0 (audit local)"})
        resp = conn.getresponse()
        body = resp.read(64 * 1024).decode(errors="replace")
        conn.close()
    except Exception as e:  # noqa: BLE001 — tout échec signifie « service absent »
        return {"reachable": False, "error": type(e).__name__}
    title = re.search(r"<title[^>]*>(.*?)</title>", body, re.I | re.S)
    return {
        "reachable": True, "status": resp.status,
        "server": resp.getheader("Server", ""),
        "realm": resp.getheader("WWW-Authenticate", ""),
        "location": resp.getheader("Location", ""),
        "title": re.sub(r"\s+", " ", title.group(1)).strip()[:120] if title else "",
        "body_hint": body[:4000],
    }


def tcp_open(host: str, port: int, timeout: float = 0.8) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def scan_gateway_ports(gateway: str) -> dict[str, str]:
    with ThreadPoolExecutor(max_workers=8) as pool:
        states = list(pool.map(lambda p: tcp_open(gateway, p), GATEWAY_PORTS))
    return {str(p): GATEWAY_PORTS[p] for p, ok in zip(GATEWAY_PORTS, states) if ok}


# ------------------------------------------------------------------------- DNS

def classify_dns(servers: list[str], gateway: str) -> list[dict]:
    out = []
    for s in servers:
        try:
            addr = ipaddress.ip_address(s)
        except ValueError:
            continue
        if s == gateway:
            kind = "routeur"
        elif s in PUBLIC_RESOLVERS:
            kind = f"public ({PUBLIC_RESOLVERS[s]})"
        elif addr.is_private or addr.is_loopback:
            kind = "local (autre que la passerelle)"
        else:
            kind = "public inconnu (probablement le FAI)"
        out.append({"server": s, "type": kind})
    return out


def nxdomain_hijack() -> bool | None:
    """True si un domaine qui n'existe pas est malgré tout résolu (redirection DNS)."""
    name = f"wsm-check-{secrets.token_hex(8)}.com"
    try:
        socket.getaddrinfo(name, 80)
    except socket.gaierror:
        return False
    except OSError:
        return None
    return True


# ---------------------------------------------------------- Réseaux à proximité

def parse_netsh_networks(text: str) -> list[dict]:
    nets, cur = [], None
    for line in text.splitlines():
        m = re.match(r"^SSID \d+\s*:\s*(.*)$", line.strip())
        if m:
            cur = {"ssid": m.group(1).strip(), "authentication": "", "bssids": []}
            nets.append(cur)
            continue
        if cur is None or ":" not in line:
            continue
        key, _, val = line.partition(":")
        key, val = key.strip().lower(), val.strip()
        if key in ("authentication", "authentification"):
            cur["authentication"] = val
            cur["security_level"] = classify_auth(val)
        elif re.match(r"^bssid \d+$", key):
            cur["bssids"].append({"bssid": line.split(":", 1)[1].strip().upper()})
        elif key in ("channel", "canal") and cur["bssids"]:
            cur["bssids"][-1]["channel"] = val
        elif key == "signal" and cur["bssids"]:
            cur["bssids"][-1]["signal"] = val
    return nets


def nearby_networks() -> list[dict]:
    if not system.IS_WINDOWS:
        return []
    return parse_netsh_networks(system.run(["netsh", "wlan", "show", "networks", "mode=bssid"]))


# ------------------------------------------------------------- Identification

def identify_brand(*texts: str) -> tuple[str, str]:
    blob = " ".join(t for t in texts if t).lower()
    for pattern, brand, vendor in BRANDS:
        if re.search(pattern, blob):
            return brand, vendor
    return "", ""


def compatibility(report: RouterReport) -> dict:
    auto = ["Adresse et MAC de la passerelle", "Ports exposés sur le réseau local",
            "Type de sécurité Wi-Fi (via Windows)", "Serveurs DNS et redirection DNS"]
    if report.upnp_enabled:
        auto.append("Modèle via UPnP")
    if report.upnp_igd:
        auto.append("Redirections de ports UPnP (lecture seule)")
    manual = ["WPS", "Administration à distance", "Version et mises à jour du firmware",
              "Pare-feu du routeur", "Réseau invité", "Mot de passe administrateur modifié"]
    level = "bonne" if report.upnp_igd and report.model else "partielle" if report.brand or report.model else "basique"
    return {
        "level": level,
        "automatic": auto,
        "manual": manual,
        "note": ("Les réglages internes du routeur (WPS, administration à distance, firmware, pare-feu) "
                 "ne sont lisibles qu'avec vos identifiants administrateur. Le logiciel ne les demande "
                 "pas et ne tente jamais de les deviner : ces points sont vérifiés avec vous, via la "
                 "liste de contrôle du tableau de bord."),
    }


def analyze(gateway: str, gateway_vendor: str = "", upnp_devices: list[UpnpDevice] | None = None,
            dns_servers: list[str] | None = None, check_nearby: bool = True) -> RouterReport:
    r = RouterReport(gateway=gateway)
    if not gateway:
        return r
    upnp_devices = upnp_devices if upnp_devices is not None else discover_upnp_devices()
    gw_dev = next((d for d in upnp_devices if d.ip == gateway), None)
    if gw_dev:
        r.upnp_enabled = True
        r.upnp_igd = bool(gw_dev.wan_control_urls) or "InternetGatewayDevice" in gw_dev.device_type
        r.model = " ".join(x for x in (gw_dev.model_name, gw_dev.model_number) if x).strip()
        r.vendor = gw_dev.manufacturer
        if gw_dev.model_name or gw_dev.manufacturer:
            r.identification_sources.append("UPnP")
        if r.upnp_igd:
            r.port_mappings = upnp_port_mappings(gw_dev)
    r.open_ports = scan_gateway_ports(gateway)
    if "80" in r.open_ports or "8080" in r.open_ports:
        r.http = http_probe(gateway, 80 if "80" in r.open_ports else 8080, False)
    if "443" in r.open_ports or "8443" in r.open_ports:
        r.https = http_probe(gateway, 443 if "443" in r.open_ports else 8443, True)
    brand, vendor = identify_brand(
        r.http.get("title", ""), r.http.get("server", ""), r.http.get("realm", ""), r.http.get("body_hint", ""),
        r.https.get("title", ""), r.https.get("server", ""), r.https.get("body_hint", ""),
        gw_dev.friendly_name if gw_dev else "", gw_dev.server if gw_dev else "",
        r.model, r.vendor, gateway_vendor)
    if brand:
        r.brand = brand
        r.vendor = r.vendor or vendor
        r.identification_sources.append("page d'accueil / en-têtes")
    elif gateway_vendor and not r.vendor:
        r.vendor = gateway_vendor
        r.identification_sources.append("fabricant de l'adresse MAC")
    # Le corps HTML n'est utile qu'à l'identification : on ne le conserve pas.
    r.http.pop("body_hint", None)
    r.https.pop("body_hint", None)
    r.dns = {"servers": classify_dns(dns_servers or [], gateway), "nxdomain_redirect": nxdomain_hijack()}
    if check_nearby:
        r.nearby_networks = nearby_networks()
    r.compatibility = compatibility(r)
    return r
