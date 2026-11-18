"""Inventaire des appareils du réseau local, par des moyens passifs ou très légers.

- lecture de la table ARP / voisins du PC (passif) ;
- balayage ping optionnel, 1 seul paquet ICMP par adresse, à débit limité,
  uniquement sur le sous-réseau local et jamais au-delà de 1024 adresses ;
- résolution de noms : DNS inverse (via la box) et NetBIOS.
Aucun port n'est sondé sur les appareils clients.
"""

from __future__ import annotations

import ipaddress
import re
import socket
from concurrent.futures import ThreadPoolExecutor
from dataclasses import asdict, dataclass, field

from . import oui, system
from .netinfo import NetworkConfig, normalize_mac

MAX_SWEEP_HOSTS = 1024


@dataclass
class Host:
    ip: str
    mac: str
    hostname: str = ""
    vendor: str = ""
    randomized: bool = False
    is_gateway: bool = False
    is_self: bool = False
    sources: list[str] = field(default_factory=list)
    model: str = ""            # renseigné par SSDP/UPnP le cas échéant

    def to_dict(self) -> dict:
        return asdict(self)


def _is_unicast(mac: str) -> bool:
    if not mac or mac in ("00:00:00:00:00:00", "FF:FF:FF:FF:FF:FF"):
        return False
    return not (int(mac[:2], 16) & 0x01)   # bit multicast


def parse_arp_a(text: str) -> list[tuple[str, str]]:
    """Analyse `arp -a` (Windows FR/EN ou Linux)."""
    pairs = []
    for m in re.finditer(r"(\d+\.\d+\.\d+\.\d+)\)?\s+(?:at\s+)?([0-9a-fA-F]{2}(?:[-:][0-9a-fA-F]{2}){5})", text):
        pairs.append((m.group(1), normalize_mac(m.group(2))))
    return pairs


_PS_NEIGHBORS = (
    "Get-NetNeighbor -AddressFamily IPv4 -ErrorAction SilentlyContinue | "
    "Where-Object { $_.State -ne 'Unreachable' -and $_.State -ne 'Incomplete' } | "
    "Select-Object IPAddress, LinkLayerAddress, @{n='State';e={\"$($_.State)\"}} | ConvertTo-Json -Compress"
)


def read_neighbors() -> list[tuple[str, str]]:
    if system.IS_WINDOWS:
        data = system.powershell_json(_PS_NEIGHBORS)
        if data is not None:
            return [(d["IPAddress"], normalize_mac(d.get("LinkLayerAddress") or ""))
                    for d in system.as_list(data) if d.get("IPAddress")]
        return parse_arp_a(system.run(["arp", "-a"]))
    out = system.run(["ip", "neigh", "show"])
    pairs = []
    for line in out.splitlines():
        m = re.match(r"(\d+\.\d+\.\d+\.\d+) .*lladdr ([0-9a-f:]{17}) (\w+)", line)
        if m and m.group(3) not in ("FAILED", "INCOMPLETE"):
            pairs.append((m.group(1), normalize_mac(m.group(2))))
    return pairs


def _ping(ip: str) -> None:
    if system.IS_WINDOWS:
        system.run(["ping", "-n", "1", "-w", "600", ip], timeout=3)
    else:
        system.run(["ping", "-c", "1", "-W", "1", ip], timeout=3)


def ping_sweep(subnet: str, workers: int = 32) -> int:
    """Envoie un seul ping à chaque adresse du sous-réseau pour remplir la table ARP."""
    try:
        net = ipaddress.ip_network(subnet, strict=False)
    except ValueError:
        return 0
    if net.num_addresses > MAX_SWEEP_HOSTS + 2 or not net.is_private:
        return 0
    hosts = [str(h) for h in net.hosts()]
    with ThreadPoolExecutor(max_workers=workers) as pool:
        list(pool.map(_ping, hosts))
    return len(hosts)


def reverse_dns(ip: str) -> str:
    try:
        name = socket.gethostbyaddr(ip)[0]
    except (OSError, UnicodeError):
        return ""
    return "" if name == ip else name


def netbios_name(ip: str) -> str:
    if not system.IS_WINDOWS:
        return ""
    out = system.run(["nbtstat", "-A", ip], timeout=6)
    m = re.search(r"^\s*([^\s].{0,14}?)\s+<00>\s+(?:UNIQUE|Unique|UNIQUE)", out, re.M)
    return m.group(1).strip() if m else ""


def resolve_names(hosts: list[Host], workers: int = 16) -> None:
    def work(h: Host) -> None:
        if h.hostname:
            return
        h.hostname = reverse_dns(h.ip) or netbios_name(h.ip)
    with ThreadPoolExecutor(max_workers=workers) as pool:
        list(pool.map(work, hosts))


def discover(cfg: NetworkConfig, sweep: bool = True, resolve: bool = True) -> list[Host]:
    if sweep and cfg.subnet:
        ping_sweep(cfg.subnet)
    net = ipaddress.ip_network(cfg.subnet, strict=False) if cfg.subnet else None
    hosts: dict[str, Host] = {}
    for ip, mac in read_neighbors():
        if not _is_unicast(mac):
            continue
        try:
            addr = ipaddress.ip_address(ip)
        except ValueError:
            continue
        if net and (addr not in net or addr in (net.network_address, net.broadcast_address)):
            continue
        hosts[mac] = Host(ip=ip, mac=mac, sources=["arp"])
    if cfg.mac and cfg.ip:
        hosts[cfg.mac] = Host(ip=cfg.ip, mac=cfg.mac, hostname=cfg.hostname, is_self=True, sources=["local"])
    for h in hosts.values():
        h.vendor = oui.vendor(h.mac)
        h.randomized = oui.is_randomized(h.mac)
        if h.ip == cfg.gateway:
            h.is_gateway = True
    if cfg.gateway and not any(h.is_gateway for h in hosts.values()) and cfg.gateway_mac:
        hosts[cfg.gateway_mac] = Host(ip=cfg.gateway, mac=cfg.gateway_mac, is_gateway=True,
                                      vendor=oui.vendor(cfg.gateway_mac), sources=["route"])
    result = sorted(hosts.values(), key=lambda h: ipaddress.ip_address(h.ip))
    if resolve:
        resolve_names([h for h in result if not h.is_self])
    return result
