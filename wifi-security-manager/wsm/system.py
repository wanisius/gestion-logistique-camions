"""Exécution des commandes système (lecture seule) et détection de la plateforme."""

from __future__ import annotations

import json
import os
import platform
import subprocess
from typing import Any

IS_WINDOWS = platform.system() == "Windows"

# Empêche l'ouverture d'une fenêtre console pour chaque sous-processus sous Windows.
_CREATE_NO_WINDOW = 0x08000000 if IS_WINDOWS else 0

# Liste blanche des exécutables autorisés : uniquement des outils de consultation.
_ALLOWED = {
    "ipconfig", "netsh", "arp", "ping", "nbtstat", "route", "powershell",
    "ip", "nmcli", "iw", "hostname", "getmac",
}

# Arguments interdits : garantit qu'aucune commande n'affiche une clé Wi-Fi
# ni ne modifie la configuration.
_FORBIDDEN_TOKENS = {"key=clear", "set", "add", "delete", "del", "remove",
                     "disable", "enable", "reset", "stop-", "restart"}


class CommandError(RuntimeError):
    pass


def _check(args: list[str]) -> None:
    exe = os.path.basename(args[0]).lower().removesuffix(".exe")
    if exe not in _ALLOWED:
        raise CommandError(f"Commande non autorisée : {exe}")
    if exe == "powershell":
        return  # les scripts PowerShell sont des constantes du code, revues une à une
    for a in args[1:]:
        if a.lower() in _FORBIDDEN_TOKENS:
            raise CommandError(f"Argument interdit : {a}")


def run(args: list[str], timeout: float = 15) -> str:
    """Exécute une commande en lecture seule et renvoie sa sortie texte ('' en cas d'échec)."""
    _check(args)
    try:
        proc = subprocess.run(
            args, capture_output=True, timeout=timeout,
            creationflags=_CREATE_NO_WINDOW,
        )
    except (OSError, subprocess.TimeoutExpired):
        return ""
    raw = proc.stdout or b""
    for enc in ("utf-8", "cp850", "cp1252", "latin-1"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="replace")


def powershell_json(script: str, timeout: float = 20) -> Any:
    """Exécute un script PowerShell (lecture seule) qui produit du JSON et le décode."""
    if not IS_WINDOWS:
        return None
    full = ("[Console]::OutputEncoding=[Text.Encoding]::UTF8;"
            "$ProgressPreference='SilentlyContinue';" + script)
    out = run(["powershell", "-NoProfile", "-NonInteractive", "-Command", full], timeout)
    out = out.strip()
    if not out:
        return None
    try:
        return json.loads(out)
    except json.JSONDecodeError:
        return None


def as_list(value: Any) -> list:
    """ConvertTo-Json renvoie un objet seul quand il n'y a qu'un élément."""
    if value is None:
        return []
    return value if isinstance(value, list) else [value]
