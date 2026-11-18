"""Informations sur la connexion Wi-Fi courante (sans jamais lire la clé du réseau).

Seule la commande `netsh wlan show interfaces` est utilisée. La commande
`netsh wlan show profile ... key=clear` est explicitement interdite par
`system._check`.
"""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass

from . import system
from .netinfo import normalize_mac

# Clés de `netsh wlan show interfaces` en anglais et en français.
_KEYS = {
    "name": ("name", "nom"),
    "description": ("description",),
    "state": ("state", "état", "etat"),
    "ssid": ("ssid",),
    "bssid": ("bssid", "ap bssid"),
    "radio": ("radio type", "type de radio"),
    "auth": ("authentication", "authentification"),
    "cipher": ("cipher", "chiffrement"),
    "band": ("band", "bande"),
    "channel": ("channel", "canal"),
    "signal": ("signal",),
    "profile": ("profile", "profil"),
}


@dataclass
class WifiInfo:
    connected: bool = False
    adapter: str = ""
    ssid: str = ""
    bssid: str = ""
    radio: str = ""
    authentication: str = ""
    security_level: str = ""   # "wpa3", "wpa2/wpa3", "wpa2", "wpa", "wep", "ouvert", "inconnu"
    cipher: str = ""
    band: str = ""
    channel: str = ""
    signal: int | None = None
    available: bool = True     # False si aucune carte Wi-Fi ou commande indisponible

    def to_dict(self) -> dict:
        return asdict(self)


def classify_auth(auth: str) -> str:
    a = auth.lower().replace(" ", "")
    if not a:
        return "inconnu"
    if "wpa3" in a and "wpa2" in a:
        return "wpa2/wpa3"
    if "wpa3" in a or "sae" in a or "owe" in a:
        return "wpa3"
    if "wpa2" in a:
        return "wpa2"
    if "wpa" in a:
        return "wpa"
    if "wep" in a or "partagée" in a or "shared" in a:
        return "wep"
    if a in ("open", "ouvrir", "ouvert", "ouverte"):
        return "ouvert"
    return "inconnu"


def parse_netsh_interfaces(text: str) -> WifiInfo:
    info = WifiInfo()
    values: dict[str, str] = {}
    for line in text.splitlines():
        if ":" not in line:
            continue
        key, _, val = line.partition(":")
        key = key.strip().lower()
        val = val.strip()
        for field_name, aliases in _KEYS.items():
            if key in aliases and field_name not in values:
                values[field_name] = val
    if not values.get("ssid"):
        info.connected = False
        info.adapter = values.get("name", "")
        info.available = bool(values)
        return info
    info.connected = True
    info.adapter = values.get("name", "")
    info.ssid = values.get("ssid", "")
    info.bssid = normalize_mac(values.get("bssid", ""))
    info.radio = values.get("radio", "")
    info.authentication = values.get("auth", "")
    info.security_level = classify_auth(info.authentication)
    info.cipher = values.get("cipher", "")
    info.band = values.get("band", "")
    info.channel = values.get("channel", "")
    m = re.search(r"(\d+)", values.get("signal", ""))
    info.signal = int(m.group(1)) if m else None
    return info


def detect() -> WifiInfo:
    if system.IS_WINDOWS:
        return parse_netsh_interfaces(system.run(["netsh", "wlan", "show", "interfaces"]))
    out = system.run(["nmcli", "-t", "-f", "ACTIVE,SSID,BSSID,SECURITY,CHAN,SIGNAL", "dev", "wifi"])
    for line in out.splitlines():
        parts = re.split(r"(?<!\\):", line)
        if parts and parts[0] == "yes" and len(parts) >= 6:
            bssid = ":".join(parts[2:8]).replace("\\", "")
            sec = parts[8] if len(parts) > 8 else ""
            return WifiInfo(connected=True, ssid=parts[1], bssid=normalize_mac(bssid),
                            authentication=sec, security_level=classify_auth(sec),
                            channel=parts[9] if len(parts) > 9 else "",
                            signal=int(parts[10]) if len(parts) > 10 and parts[10].isdigit() else None)
    return WifiInfo(available=bool(out))
