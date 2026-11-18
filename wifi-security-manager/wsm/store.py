"""Stockage local en JSON : appareils, historique, alertes, liste de contrôle, réglages.

Emplacement : %LOCALAPPDATA%\\WiFiSecurityManager (Windows) ou ~/.wifi-security-manager,
modifiable avec la variable d'environnement WSM_DATA_DIR.
"""

from __future__ import annotations

import json
import os
import threading
import uuid
from datetime import datetime, timedelta, timezone

MAX_EVENTS = 5000
MAX_ALERTS = 500
MAX_SCANS = 200
NEW_DEVICE_HOURS = 24

DEFAULT_SETTINGS = {
    "scan_interval_minutes": 10,
    "ping_sweep": True,
    "notifications": True,
    "monitoring": True,
}


def data_dir() -> str:
    base = os.environ.get("WSM_DATA_DIR")
    if not base:
        if os.name == "nt":
            base = os.path.join(os.environ.get("LOCALAPPDATA", os.path.expanduser("~")), "WiFiSecurityManager")
        else:
            base = os.path.join(os.path.expanduser("~"), ".wifi-security-manager")
    os.makedirs(base, exist_ok=True)
    return base


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def parse_ts(ts: str) -> datetime:
    return datetime.fromisoformat(ts)


class Store:
    def __init__(self, path: str | None = None):
        self.path = path or os.path.join(data_dir(), "state.json")
        self.lock = threading.RLock()
        self.state = self._load()

    def _load(self) -> dict:
        state = {"devices": {}, "events": [], "alerts": [], "scans": [], "checklist": {},
                 "actions": {}, "settings": dict(DEFAULT_SETTINGS), "network": {}, "router": {},
                 "wifi": {}, "findings": [], "score": None}
        try:
            with open(self.path, encoding="utf-8") as f:
                state.update(json.load(f))
        except (OSError, json.JSONDecodeError):
            pass
        state["settings"] = {**DEFAULT_SETTINGS, **state.get("settings", {})}
        return state

    def save(self) -> None:
        with self.lock:
            tmp = self.path + ".tmp"
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(self.state, f, ensure_ascii=False, indent=1)
            os.replace(tmp, self.path)

    # ---------------------------------------------------------------- appareils

    @staticmethod
    def category(dev: dict, ref: datetime | None = None) -> str:
        if dev.get("authorized"):
            return "connu"
        ref = ref or datetime.now(timezone.utc)
        if ref - parse_ts(dev["first_seen"]) < timedelta(hours=NEW_DEVICE_HOURS):
            return "nouveau"
        return "inconnu"

    def devices(self) -> list[dict]:
        with self.lock:
            out = []
            for d in self.state["devices"].values():
                out.append({**d, "category": self.category(d)})
            return out

    def update_device(self, mac: str, name: str | None = None, authorized: bool | None = None,
                      notes: str | None = None) -> dict | None:
        with self.lock:
            dev = self.state["devices"].get(mac)
            if dev is None:
                return None
            if name is not None:
                dev["custom_name"] = name.strip()[:80]
            if authorized is not None:
                dev["authorized"] = bool(authorized)
                if authorized:
                    for a in self.state["alerts"]:
                        if a.get("mac") == mac and a["type"] == "nouvel_appareil":
                            a["acknowledged"] = True
            if notes is not None:
                dev["notes"] = notes.strip()[:500]
            self.save()
            return {**dev, "category": self.category(dev)}

    def forget_device(self, mac: str) -> bool:
        with self.lock:
            removed = self.state["devices"].pop(mac, None) is not None
            if removed:
                self.save()
            return removed

    def merge_hosts(self, hosts: list[dict]) -> list[dict]:
        """Intègre un résultat de scan. Renvoie la liste des appareils jamais vus auparavant."""
        ts = now()
        new = []
        with self.lock:
            devices = self.state["devices"]
            first_scan = not self.state["scans"]
            seen = set()
            for h in hosts:
                mac = h["mac"]
                seen.add(mac)
                dev = devices.get(mac)
                if dev is None:
                    dev = {"mac": mac, "first_seen": ts, "custom_name": "", "notes": "",
                           # Au tout premier scan, le PC et la box sont considérés comme connus.
                           "authorized": bool(h.get("is_self") or h.get("is_gateway")),
                           "online": False, "ip_history": []}
                    devices[mac] = dev
                    # Le premier scan sert de référence : pas d'alerte, mais les appareils
                    # restent classés « nouveaux » 24 h pour que vous les passiez en revue.
                    if not first_scan:
                        new.append(dev)
                    self._event("nouvel_appareil", mac, h["ip"], ts)
                if dev.get("ip") and dev["ip"] != h["ip"]:
                    self._event("ip_changée", mac, h["ip"], ts, f"{dev['ip']} → {h['ip']}")
                if not dev.get("online"):
                    self._event("connexion", mac, h["ip"], ts)
                if h["ip"] not in dev["ip_history"]:
                    dev["ip_history"] = (dev["ip_history"] + [h["ip"]])[-10:]
                for k in ("ip", "hostname", "vendor", "randomized", "is_gateway", "is_self", "model"):
                    if h.get(k) not in (None, "") or k not in dev:
                        dev[k] = h.get(k)
                dev["online"] = True
                dev["last_seen"] = ts
            for mac, dev in devices.items():
                if mac not in seen and dev.get("online"):
                    dev["online"] = False
                    self._event("déconnexion", mac, dev.get("ip", ""), ts)
            self.state["scans"] = (self.state["scans"] + [{"ts": ts, "count": len(hosts)}])[-MAX_SCANS:]
            self.save()
        return new

    def _event(self, etype: str, mac: str, ip: str, ts: str, detail: str = "") -> None:
        self.state["events"].append({"ts": ts, "type": etype, "mac": mac, "ip": ip, "detail": detail})
        self.state["events"] = self.state["events"][-MAX_EVENTS:]

    # ------------------------------------------------------------------ alertes

    def add_alert(self, severity: str, atype: str, title: str, message: str, mac: str = "",
                  dedupe_key: str = "") -> dict | None:
        with self.lock:
            if dedupe_key and any(a.get("key") == dedupe_key and not a["acknowledged"]
                                  for a in self.state["alerts"]):
                return None
            alert = {"id": uuid.uuid4().hex[:12], "ts": now(), "severity": severity, "type": atype,
                     "title": title, "message": message, "mac": mac, "key": dedupe_key,
                     "acknowledged": False}
            self.state["alerts"] = (self.state["alerts"] + [alert])[-MAX_ALERTS:]
            self.save()
            return alert

    def ack_alert(self, alert_id: str) -> bool:
        with self.lock:
            for a in self.state["alerts"]:
                if a["id"] == alert_id or alert_id == "*":
                    a["acknowledged"] = True
            self.save()
            return True

    # ------------------------------------------------ liste de contrôle/actions

    def set_checklist(self, key: str, value: str) -> None:
        with self.lock:
            self.state["checklist"][key] = {"value": value, "ts": now()}
            self.save()

    def set_action(self, action_id: str, status: str) -> dict:
        with self.lock:
            entry = {"status": status, "ts": now()}
            self.state["actions"][action_id] = entry
            self.save()
            return entry

    def set_settings(self, values: dict) -> dict:
        with self.lock:
            s = self.state["settings"]
            if "scan_interval_minutes" in values:
                s["scan_interval_minutes"] = max(2, min(1440, int(values["scan_interval_minutes"])))
            for k in ("ping_sweep", "notifications", "monitoring"):
                if k in values:
                    s[k] = bool(values[k])
            self.save()
            return dict(s)
