"""Orchestration d'une analyse complète et surveillance périodique."""

from __future__ import annotations

import threading
from datetime import datetime, timedelta, timezone

from . import analysis, discovery, netinfo, notify, router, wifi
from .store import Store, now, parse_ts

ROUTER_REFRESH = timedelta(hours=6)
_scan_lock = threading.Lock()


def _device_label(d: dict) -> str:
    return d.get("custom_name") or d.get("hostname") or d.get("vendor") or d["mac"]


def run_scan(store: Store, full: bool = False, sweep: bool | None = None, log=print) -> dict:
    """Analyse le réseau. `full` force aussi l'analyse du routeur (sinon toutes les 6 h)."""
    if not _scan_lock.acquire(blocking=False):
        return {"busy": True}
    try:
        settings = store.state["settings"]
        sweep = settings["ping_sweep"] if sweep is None else sweep
        log("• Détection de la configuration réseau…")
        cfg = netinfo.detect()
        wf = wifi.detect()
        last_router = store.state.get("router_ts")
        refresh_router = full or not last_router or \
            datetime.now(timezone.utc) - parse_ts(last_router) > ROUTER_REFRESH
        upnp_devices = []
        if refresh_router:
            log("• Découverte UPnP/SSDP…")
            upnp_devices = router.discover_upnp_devices()
        log(f"• Inventaire des appareils sur {cfg.subnet or '?'}" + (" (ping léger)…" if sweep else "…"))
        hosts = discovery.discover(cfg, sweep=sweep)
        by_ip = {d.ip: d for d in upnp_devices}
        for h in hosts:
            u = by_ip.get(h.ip)
            if u:
                h.model = " ".join(x for x in (u.manufacturer, u.model_name) if x)
                h.hostname = h.hostname or u.friendly_name
                h.sources.append("upnp")
        gw_host = next((h for h in hosts if h.is_gateway), None)
        if refresh_router:
            log("• Analyse de la passerelle (UPnP, ports, HTTP, DNS)…")
            rep = router.analyze(cfg.gateway, gw_host.vendor if gw_host else "", upnp_devices,
                                 cfg.dns_servers)
            store.state["router"] = rep.to_dict()
            store.state["router_ts"] = now()

        new_devices = store.merge_hosts([h.to_dict() for h in hosts])
        alerts = []
        notif = settings["notifications"]
        for d in new_devices:
            msg = f"{_device_label(d)} — IP {d.get('ip')} — MAC {d['mac']}"
            a = store.add_alert("moyen", "nouvel_appareil", "Nouvel appareil détecté", msg, d["mac"])
            alerts.append(a)
            if notif:
                notify.notify("WiFi Security Manager : nouvel appareil", msg)

        # Changement de l'adresse MAC de la passerelle : possible usurpation ARP.
        gw_mac = gw_host.mac if gw_host else cfg.gateway_mac
        prev = store.state.get("gateway_mac")
        if gw_mac and prev and gw_mac != prev and store.state.get("gateway_ip") == cfg.gateway:
            msg = (f"La MAC de la passerelle {cfg.gateway} est passée de {prev} à {gw_mac}. "
                   "Normal si vous avez changé de box ; sinon, possible usurpation ARP (attaque de l'homme du milieu).")
            alerts.append(store.add_alert("élevé", "passerelle", "Adresse MAC de la passerelle modifiée", msg,
                                          dedupe_key=f"gwmac:{gw_mac}"))
            if notif:
                notify.notify("WiFi Security Manager : alerte passerelle", msg)
        if gw_mac:
            store.state["gateway_mac"], store.state["gateway_ip"] = gw_mac, cfg.gateway

        devices = store.devices()
        findings = analysis.evaluate(cfg.to_dict(), wf.to_dict(), store.state.get("router", {}),
                                     devices, store.state["checklist"])
        sc = analysis.score(findings)
        for fd in findings:
            if fd.status == "risque" and fd.severity in ("critique", "élevé"):
                store.add_alert(fd.severity, "risque", fd.title, fd.recommendation or fd.detail,
                                dedupe_key=f"finding:{fd.id}")
        with store.lock:
            store.state.update(network=cfg.to_dict(), wifi=wf.to_dict(),
                               findings=[x.to_dict() for x in findings], score=sc, last_scan=now())
            history = store.state.setdefault("score_history", [])
            history.append({"ts": now(), "value": sc["value"]})
            store.state["score_history"] = history[-500:]
            store.save()
        log(f"• Terminé : {len(hosts)} appareil(s), score {sc['value']}/100 ({sc['grade']}).")
        return {"busy": False, "devices": len(hosts), "new": len(new_devices), "score": sc}
    finally:
        _scan_lock.release()


def reevaluate(store: Store) -> None:
    """Recalcule les constats sans rescanner (après une réponse à la liste de contrôle)."""
    findings = analysis.evaluate(store.state.get("network", {}), store.state.get("wifi", {}),
                                 store.state.get("router", {}), store.devices(), store.state["checklist"])
    with store.lock:
        store.state["findings"] = [x.to_dict() for x in findings]
        store.state["score"] = analysis.score(findings)
        store.save()


class Monitor(threading.Thread):
    """Surveillance périodique en arrière-plan."""

    def __init__(self, store: Store, log=print, after_scan=None):
        super().__init__(daemon=True, name="wsm-monitor")
        self.store, self.log, self.after_scan = store, log, after_scan
        self.stop_event = threading.Event()
        self.wake = threading.Event()

    def run(self) -> None:
        while not self.stop_event.is_set():
            s = self.store.state["settings"]
            if s["monitoring"]:
                try:
                    run_scan(self.store, log=self.log)
                    if self.after_scan:
                        self.after_scan()
                except Exception as e:  # noqa: BLE001 — la surveillance ne doit jamais s'arrêter
                    self.log(f"Erreur pendant la surveillance : {e!r}")
            self.wake.wait(s["scan_interval_minutes"] * 60)
            self.wake.clear()

    def stop(self) -> None:
        self.stop_event.set()
        self.wake.set()

