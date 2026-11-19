"""Audit défensif, non destructif, des services exposés sur un réseau local.

Réservé à un réseau que vous administrez ou que vous êtes mandaté pour auditer.
Méthode : connexion TCP simple (handshake complet, comme un client normal) sur une
liste de ports de service, puis lecture passive de la bannière d'accueil que le
service envoie de lui-même (FTP, SSH, SMTP…) ou requête HEAD pour le web.

Ce module NE FAIT JAMAIS :
- d'essai d'identifiants (aucune tentative de connexion/mot de passe) ;
- d'exploitation de faille, d'envoi de charge utile ou de fuzzing ;
- de coupure, de réinitialisation ou de modification d'un appareil.

Le scan complet d'un réseau d'entreprise peut déclencher les alertes de l'IDS/pare-feu
(WatchGuard, FortiGate…) : lancez-le sur une plage horaire convenue avec la direction.
"""

from __future__ import annotations

import ipaddress
import socket
import ssl
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import asdict, dataclass, field

# port -> (nom du service, niveau de risque quand exposé, explication/conseil défensif)
SERVICES: dict[int, tuple[str, str, str]] = {
    21:   ("FTP", "élevé", "Transfert de fichiers en clair (identifiants lisibles sur le réseau). Préférer SFTP/FTPS."),
    22:   ("SSH", "info", "Administration à distance chiffrée. Restreindre par IP et désactiver l'auth par mot de passe."),
    23:   ("Telnet", "critique", "Administration en CLAIR, cible privilégiée des botnets. À désactiver partout."),
    25:   ("SMTP", "moyen", "Serveur de messagerie. Vérifier qu'il n'est pas un relais ouvert."),
    53:   ("DNS", "faible", "Service DNS. S'assurer qu'il ne répond pas récursivement à Internet."),
    110:  ("POP3", "moyen", "Relève de courrier en clair si sans TLS. Imposer POP3S (995)."),
    135:  ("MS-RPC", "élevé", "RPC Windows exposé : surface d'attaque latérale importante. Bloquer entre VLAN."),
    139:  ("NetBIOS", "élevé", "Partage Windows hérité. À désactiver au profit de SMB récent, segmenté."),
    143:  ("IMAP", "moyen", "Messagerie en clair si sans TLS. Imposer IMAPS (993)."),
    389:  ("LDAP", "élevé", "Annuaire en clair. Imposer LDAPS (636) et restreindre l'accès."),
    445:  ("SMB", "élevé", "Partage de fichiers Windows. Historiquement visé (WannaCry). Patcher et segmenter."),
    512:  ("rexec", "critique", "Exécution distante héritée, non chiffrée. À supprimer."),
    513:  ("rlogin", "critique", "Connexion distante héritée, non chiffrée. À supprimer."),
    514:  ("rsh/syslog", "élevé", "Service hérité non chiffré. À supprimer ou restreindre."),
    1433: ("MS SQL Server", "critique", "Base de données exposée sur le réseau. À n'ouvrir qu'aux serveurs applicatifs."),
    1521: ("Oracle DB", "critique", "Base de données exposée. Restreindre aux hôtes applicatifs."),
    3306: ("MySQL/MariaDB", "critique", "Base de données exposée. Ne jamais exposer largement sur le LAN."),
    3389: ("RDP (Bureau à distance)", "élevé", "Bureau à distance Windows, très ciblé. Passerelle/VPN + MFA obligatoires."),
    5432: ("PostgreSQL", "critique", "Base de données exposée. Restreindre aux hôtes applicatifs."),
    5900: ("VNC", "élevé", "Prise en main à distance, souvent sans/peu de mot de passe. Restreindre fortement."),
    5985: ("WinRM (HTTP)", "élevé", "Administration Windows à distance en clair. Préférer 5986 (HTTPS), segmenter."),
    6379: ("Redis", "critique", "Base en mémoire, souvent SANS authentification par défaut. Ne jamais exposer."),
    8080: ("HTTP alternatif", "moyen", "Interface web/admin. Vérifier l'authentification et préférer HTTPS."),
    8443: ("HTTPS alternatif", "faible", "Interface web/admin sécurisée. Vérifier le certificat et les identifiants."),
    9100: ("Impression brute (JetDirect)", "moyen", "Imprimante exposée : détournement/espionnage de documents possible."),
    27017:("MongoDB", "critique", "Base de données, historiquement sans auth par défaut. Ne jamais exposer."),
    80:   ("HTTP", "moyen", "Interface web/admin en clair. Vérifier l'authentification et passer en HTTPS."),
    443:  ("HTTPS", "faible", "Interface web sécurisée. Vérifier le certificat et les identifiants."),
}

# Interfaces d'administration : à vérifier manuellement côté identifiants par défaut (sans test automatique).
ADMIN_PORTS = {23, 80, 443, 3389, 5900, 8080, 8443, 5985, 5986}

DEFAULT_PORTS = sorted(SERVICES)
_RISK_ORDER = {"critique": 0, "élevé": 1, "moyen": 2, "faible": 3, "info": 4}


@dataclass
class ServiceFinding:
    ip: str
    port: int
    service: str
    risk: str
    advice: str
    banner: str = ""
    check_default_creds: bool = False

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class HostAudit:
    ip: str
    mac: str = ""
    name: str = ""
    vendor: str = ""
    services: list[ServiceFinding] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {**asdict(self), "services": [s.to_dict() for s in self.services]}


def _read_banner(ip: str, port: int, timeout: float) -> str:
    """Lit, sans rien envoyer, la bannière que le service annonce de lui-même.

    Pour le web, envoie une requête HEAD minimale (lecture seule, non destructive)."""
    try:
        with socket.create_connection((ip, port), timeout=timeout) as sock:
            sock.settimeout(timeout)
            if port in (80, 8080):
                sock.sendall(b"HEAD / HTTP/1.0\r\nHost: %b\r\nUser-Agent: WSM-audit\r\n\r\n" % ip.encode())
            elif port in (443, 8443):
                ctx = ssl._create_unverified_context()
                with ctx.wrap_socket(sock, server_hostname=ip) as ss:
                    ss.sendall(b"HEAD / HTTP/1.0\r\nHost: %b\r\n\r\n" % ip.encode())
                    data = ss.recv(512)
                return _clean(data, http=True)
            data = sock.recv(256)
        return _clean(data, http=port in (80, 8080))
    except (OSError, ssl.SSLError):
        return ""


def _clean(data: bytes, http: bool = False) -> str:
    text = data.decode("latin-1", errors="replace")
    if http:
        server = next((l for l in text.splitlines() if l.lower().startswith("server:")), "")
        first = text.splitlines()[0] if text.splitlines() else ""
        return (server or first).strip()[:120]
    return " ".join(text.split())[:120]


def _probe(ip: str, port: int, timeout: float) -> ServiceFinding | None:
    try:
        with socket.create_connection((ip, port), timeout=timeout):
            pass
    except OSError:
        return None
    name, risk, advice = SERVICES.get(port, (f"port {port}", "faible", "Service non catalogué. Vérifier son utilité."))
    banner = _read_banner(ip, port, timeout)
    return ServiceFinding(ip=ip, port=port, service=name, risk=risk, advice=advice, banner=banner,
                          check_default_creds=port in ADMIN_PORTS)


def audit_host(ip: str, ports: list[int], timeout: float, workers: int) -> HostAudit:
    ha = HostAudit(ip=ip)
    with ThreadPoolExecutor(max_workers=workers) as pool:
        results = pool.map(lambda p: _probe(ip, p, timeout), ports)
    ha.services = sorted((r for r in results if r), key=lambda s: _RISK_ORDER[s.risk])
    return ha


def audit_hosts(hosts: list[dict], ports: list[int] | None = None, timeout: float = 1.0,
                host_workers: int = 16, port_workers: int = 24, rate_limit: float = 0.0,
                log=print) -> list[HostAudit]:
    """Audite une liste d'hôtes (chacun : {'ip','mac','name','vendor'}). Non destructif."""
    ports = ports or DEFAULT_PORTS
    audits: list[HostAudit] = []

    def work(h: dict) -> HostAudit:
        if rate_limit:
            time.sleep(rate_limit)
        ha = audit_host(h["ip"], ports, timeout, port_workers)
        ha.mac, ha.name, ha.vendor = h.get("mac", ""), h.get("name", ""), h.get("vendor", "")
        if ha.services:
            log(f"  {h['ip']:<15} {len(ha.services)} service(s) : "
                + ", ".join(f"{s.port}/{s.service}" for s in ha.services))
        return ha

    with ThreadPoolExecutor(max_workers=host_workers) as pool:
        for ha in pool.map(work, hosts):
            audits.append(ha)
    return audits


def summarize(audits: list[HostAudit]) -> dict:
    findings = [s for ha in audits for s in ha.services]
    by_risk = {r: sum(1 for s in findings if s.risk == r) for r in _RISK_ORDER}
    return {"hosts_scanned": len(audits), "hosts_with_services": sum(1 for a in audits if a.services),
            "services_total": len(findings), "by_risk": by_risk,
            "critical_services": [s.to_dict() for s in findings if s.risk in ("critique", "élevé")]}
