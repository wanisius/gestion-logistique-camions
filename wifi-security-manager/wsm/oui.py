"""Identification du fabricant à partir de l'adresse MAC (préfixe OUI).

Une petite table intégrée couvre quelques fabricants courants. Pour une
identification complète, téléchargez le registre officiel de l'IEEE avec
`python -m wsm update-oui` (action manuelle, ~5 Mo, source publique).
"""

from __future__ import annotations

import csv
import os
import urllib.request
from functools import lru_cache

from .store import data_dir

IEEE_URL = "https://standards-oui.ieee.org/oui/oui.csv"

_BUILTIN = {
    "B827EB": "Raspberry Pi Foundation", "DCA632": "Raspberry Pi Trading", "E45F01": "Raspberry Pi Trading",
    "000C29": "VMware", "005056": "VMware", "080027": "Oracle VirtualBox",
    "000393": "Apple", "001CB3": "Apple", "001EC2": "Apple", "0026BB": "Apple",
    "001A11": "Google", "3C5AB4": "Google", "F4F5D8": "Google", "18B430": "Nest Labs",
    "44650D": "Amazon", "74C246": "Amazon", "F0272D": "Amazon",
    "001788": "Philips Lighting (Hue)", "00044B": "NVIDIA", "00E04C": "Realtek",
    "001B21": "Intel", "000DB9": "PC Engines", "50C7BF": "TP-Link", "00095B": "Netgear",
    "0014BF": "Cisco-Linksys", "001D7E": "Cisco-Linksys", "0012FB": "Samsung",
    "000121": "WatchGuard Technologies",
    "0024D4": "Freebox SAS", "F4CAE5": "Freebox SAS", "286C07": "Xiaomi",
}


def _oui_file() -> str:
    return os.path.join(data_dir(), "oui.csv")


@lru_cache(maxsize=1)
def _ieee_table() -> dict[str, str]:
    path = _oui_file()
    table: dict[str, str] = {}
    if not os.path.exists(path):
        return table
    with open(path, encoding="utf-8", errors="replace", newline="") as f:
        for row in csv.reader(f):
            if len(row) >= 3 and len(row[1]) == 6:
                table[row[1].upper()] = row[2].strip()
    return table


def is_randomized(mac: str) -> bool:
    """Bit « administré localement » : adresse privée/aléatoire (smartphones récents, Windows)."""
    try:
        return bool(int(mac.replace(":", "")[:2], 16) & 0x02)
    except ValueError:
        return False


def vendor(mac: str) -> str:
    if not mac:
        return ""
    if is_randomized(mac):
        return "Adresse MAC privée (aléatoire)"
    prefix = mac.replace(":", "").upper()[:6]
    return _ieee_table().get(prefix) or _BUILTIN.get(prefix, "")


def update_database() -> int:
    """Télécharge le registre OUI public de l'IEEE. Renvoie le nombre d'entrées."""
    tmp = _oui_file() + ".tmp"
    req = urllib.request.Request(IEEE_URL, headers={"User-Agent": "WiFiSecurityManager/1.0"})
    with urllib.request.urlopen(req, timeout=60) as resp, open(tmp, "wb") as out:
        out.write(resp.read())
    os.replace(tmp, _oui_file())
    _ieee_table.cache_clear()
    return len(_ieee_table())
