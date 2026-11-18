"""Notifications de bureau Windows (toast natif via PowerShell, sans module externe)."""

from __future__ import annotations

import os
import subprocess

from . import system

_APP_ID = r"{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe"

# Le titre et le message passent par des variables d'environnement, jamais
# interpolés dans le script : aucune injection possible.
_SCRIPT = r"""
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] > $null
$t = [Security.SecurityElement]::Escape($env:WSM_TITLE)
$m = [Security.SecurityElement]::Escape($env:WSM_MSG)
$xml = New-Object Windows.Data.Xml.Dom.XmlDocument
$xml.LoadXml("<toast><visual><binding template='ToastGeneric'><text>$t</text><text>$m</text></binding></visual></toast>")
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($env:WSM_APPID).Show([Windows.UI.Notifications.ToastNotification]::new($xml))
"""


def notify(title: str, message: str) -> bool:
    if not system.IS_WINDOWS:
        print(f"[notification] {title} — {message}")
        return False
    env = {**os.environ, "WSM_TITLE": title[:120], "WSM_MSG": message[:300], "WSM_APPID": _APP_ID}
    try:
        subprocess.run(["powershell", "-NoProfile", "-NonInteractive", "-Command", _SCRIPT],
                       env=env, capture_output=True, timeout=15, creationflags=0x08000000)
        return True
    except (OSError, subprocess.TimeoutExpired):
        return False
