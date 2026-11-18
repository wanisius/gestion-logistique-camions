"""Détection de la configuration réseau locale : interface, IP, sous-réseau, passerelle, DNS."""

from __future__ import annotations

import ipaddress
import json
import re
import socket
from dataclasses import asdict, dataclass, field

from . import system


@dataclass
class NetworkConfig:
    interface: str = ""
    interface_type: str = ""          # "wifi", "ethernet", "inconnu"
    ip: str = ""
    prefix: int = 0
    subnet: str = ""
    gateway: str = ""
    gateway_mac: str = ""
    mac: str = ""
    dns_servers: list[str] = field(default_factory=list)
    dhcp: bool | None = None
    hostname: str = ""
    ipv6_enabled: bool | None = None
    pc_firewall: dict[str, bool] = field(default_factory=dict)
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)


def normalize_mac(mac: str) -> str:
    hexs = re.sub(r"[^0-9a-fA-F]", "", mac or "")
    if len(hexs) != 12:
        return ""
    return ":".join(hexs[i:i + 2] for i in range(0, 12, 2)).upper()


def subnet_of(ip: str, prefix: int) -> str:
    try:
        return str(ipaddress.ip_network(f"{ip}/{prefix}", strict=False))
    except ValueError:
        return ""


def _guess_type(name: str, description: str = "") -> str:
    s = f"{name} {description}".lower()
    if any(k in s for k in ("wi-fi", "wifi", "wlan", "wireless", "802.11", "sans fil")):
        return "wifi"
    if any(k in s for k in ("ethernet", "eth", "enp", "eno", "gbe", "lan")):
        return "ethernet"
    return "inconnu"


# --------------------------------------------------------------------- Windows

_PS_CONFIG = r"""
$cfg = Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -ne $null -and $_.NetAdapter.Status -eq 'Up' } |
  Sort-Object { $_.IPv4DefaultGateway[0].RouteMetric + $_.NetIPv4Interface.InterfaceMetric } | Select-Object -First 1
if ($cfg) {
  $ip = $cfg.IPv4Address | Select-Object -First 1
  $gw = $cfg.IPv4DefaultGateway[0].NextHop
  $nb = Get-NetNeighbor -IPAddress $gw -ErrorAction SilentlyContinue | Select-Object -First 1
  $v6 = Get-NetAdapterBinding -Name $cfg.InterfaceAlias -ComponentID ms_tcpip6 -ErrorAction SilentlyContinue
  [pscustomobject]@{
    Interface   = $cfg.InterfaceAlias
    Description = $cfg.InterfaceDescription
    IP          = $ip.IPAddress
    Prefix      = $ip.PrefixLength
    Gateway     = $gw
    GatewayMac  = if ($nb) { $nb.LinkLayerAddress } else { '' }
    Mac         = $cfg.NetAdapter.MacAddress
    Dns         = @($cfg.DNSServer | Where-Object { $_.AddressFamily -eq 2 } | ForEach-Object { $_.ServerAddresses } | Select-Object -Unique)
    Dhcp        = ($cfg.NetIPv4Interface.Dhcp -eq 'Enabled')
    IPv6        = if ($v6) { [bool]$v6.Enabled } else { $null }
    Firewall    = @(Get-NetFirewallProfile | ForEach-Object { [pscustomobject]@{ Name = "$($_.Name)"; Enabled = [bool]$_.Enabled } })
  } | ConvertTo-Json -Depth 4 -Compress
}
"""


def parse_ps_config(data: dict) -> NetworkConfig:
    cfg = NetworkConfig()
    cfg.interface = data.get("Interface") or ""
    cfg.interface_type = _guess_type(cfg.interface, data.get("Description") or "")
    cfg.ip = data.get("IP") or ""
    cfg.prefix = int(data.get("Prefix") or 0)
    cfg.subnet = subnet_of(cfg.ip, cfg.prefix)
    cfg.gateway = data.get("Gateway") or ""
    cfg.gateway_mac = normalize_mac(data.get("GatewayMac") or "")
    cfg.mac = normalize_mac(data.get("Mac") or "")
    cfg.dns_servers = [d for d in system.as_list(data.get("Dns")) if d]
    cfg.dhcp = data.get("Dhcp")
    cfg.ipv6_enabled = data.get("IPv6")
    cfg.pc_firewall = {f["Name"]: bool(f["Enabled"]) for f in system.as_list(data.get("Firewall")) if f}
    return cfg


def parse_ipconfig(text: str) -> NetworkConfig:
    """Repli : analyse de `ipconfig /all` (français ou anglais)."""
    cfg = NetworkConfig()
    blocks = re.split(r"\r?\n(?=\S)", text)
    for i, block in enumerate(blocks):
        gw = re.search(r"(?:Default Gateway|Passerelle par d.faut)[ .]*:\s*(?:[0-9a-f:%]+\s+)?(\d+\.\d+\.\d+\.\d+)",
                       block, re.I)
        if not gw:
            # La passerelle IPv4 peut être sur la ligne suivant une adresse IPv6.
            gw = re.search(r"(?:Default Gateway|Passerelle par d.faut)[ .]*:[^\n]*\n\s+(\d+\.\d+\.\d+\.\d+)", block, re.I)
        if not gw:
            continue
        header = blocks[i - 1] if i > 0 else ""
        name = re.sub(r"^.*?(?:adapter|Carte)\s+", "", header.strip().splitlines()[-1] if header.strip() else "",
                      flags=re.I).rstrip(" :")
        ip = re.search(r"(?:IPv4 Address|Adresse IPv4)[ .]*:\s*(\d+\.\d+\.\d+\.\d+)", block, re.I)
        mask = re.search(r"(?:Subnet Mask|Masque de sous-r.seau)[ .]*:\s*(\d+\.\d+\.\d+\.\d+)", block, re.I)
        mac = re.search(r"(?:Physical Address|Adresse physique)[ .]*:\s*([0-9A-Fa-f-]{17})", block, re.I)
        desc = re.search(r"(?:Description)[ .]*:\s*(.+)", block, re.I)
        dhcp = re.search(r"(?:DHCP Enabled|DHCP activ.)[ .]*:\s*(\w+)", block, re.I)
        dns = re.search(r"(?:DNS Servers|Serveurs DNS)[ .]*:\s*(.+(?:\n\s{20,}\S.*)*)", block, re.I)
        cfg.interface = name
        cfg.interface_type = _guess_type(name, desc.group(1) if desc else "")
        cfg.ip = ip.group(1) if ip else ""
        if mask:
            cfg.prefix = ipaddress.ip_network(f"0.0.0.0/{mask.group(1)}").prefixlen
        cfg.subnet = subnet_of(cfg.ip, cfg.prefix)
        cfg.gateway = gw.group(1)
        cfg.mac = normalize_mac(mac.group(1)) if mac else ""
        if dhcp:
            cfg.dhcp = dhcp.group(1).lower() in ("yes", "oui")
        if dns:
            cfg.dns_servers = re.findall(r"\b\d+\.\d+\.\d+\.\d+\b", dns.group(1))
        break
    return cfg


def _detect_windows() -> NetworkConfig:
    data = system.powershell_json(_PS_CONFIG)
    if isinstance(data, dict) and data.get("IP"):
        return parse_ps_config(data)
    cfg = parse_ipconfig(system.run(["ipconfig", "/all"]))
    if not cfg.gateway:
        cfg.errors.append("Impossible de déterminer la passerelle (ni PowerShell ni ipconfig).")
    return cfg


# ----------------------------------------------------------------------- Linux
# Permet de tester et de développer l'outil hors Windows.

def _detect_linux() -> NetworkConfig:
    cfg = NetworkConfig()
    try:
        routes = json.loads(system.run(["ip", "-j", "route", "show", "default"]) or "[]")
        addrs = json.loads(system.run(["ip", "-j", "addr", "show"]) or "[]")
    except json.JSONDecodeError:
        cfg.errors.append("Sortie de `ip` illisible.")
        return cfg
    if not routes:
        cfg.errors.append("Aucune route par défaut.")
        return cfg
    cfg.gateway = routes[0].get("gateway", "")
    cfg.interface = routes[0].get("dev", "")
    cfg.interface_type = "wifi" if cfg.interface.startswith(("wl", "wlan")) else _guess_type(cfg.interface)
    for a in addrs:
        if a.get("ifname") != cfg.interface:
            continue
        cfg.mac = normalize_mac(a.get("address", ""))
        for info in a.get("addr_info", []):
            if info.get("family") == "inet":
                cfg.ip, cfg.prefix = info["local"], info["prefixlen"]
                cfg.dhcp = bool(info.get("dynamic"))
            if info.get("family") == "inet6" and info.get("scope") == "global":
                cfg.ipv6_enabled = True
    cfg.subnet = subnet_of(cfg.ip, cfg.prefix)
    try:
        with open("/etc/resolv.conf", encoding="utf-8") as f:
            cfg.dns_servers = re.findall(r"^nameserver\s+(\d+\.\d+\.\d+\.\d+)", f.read(), re.M)
    except OSError:
        pass
    return cfg


def detect() -> NetworkConfig:
    cfg = _detect_windows() if system.IS_WINDOWS else _detect_linux()
    cfg.hostname = socket.gethostname()
    return cfg
