"""Commande `wsm audit` : audit défensif des services exposés sur le réseau local.

Nécessite une autorisation explicite (option --autorise ou confirmation interactive),
car destiné à un réseau que vous administrez ou êtes mandaté pour auditer.
"""

from __future__ import annotations

import os
from datetime import datetime

from . import audit, discovery, netinfo
from .oui import vendor as oui_vendor
from .store import data_dir

RISK_ICON = {"critique": "⛔", "élevé": "▲", "moyen": "●", "faible": "○", "info": "·"}

BANNER = """\
================= WiFi Security Manager — Audit défensif =================
Analyse NON destructive des services exposés (connexion TCP simple + bannière).
AUCUN essai d'identifiants, AUCUNE exploitation, AUCUNE coupure d'appareil.

À n'utiliser que sur un réseau dont vous êtes responsable ou que vous êtes
MANDATÉ PAR ÉCRIT pour auditer. Un scan réseau peut déclencher les alertes du
pare-feu/IDS : prévenez l'équipe sécurité et choisissez une plage horaire convenue.
=========================================================================="""


def _confirm(authorized: bool) -> bool:
    print(BANNER)
    if authorized:
        print("Autorisation confirmée via --autorise.\n")
        return True
    try:
        ans = input("Confirmez-vous être autorisé à auditer CE réseau ? (oui/non) ").strip().lower()
    except EOFError:
        return False
    return ans in ("oui", "o", "yes", "y")


def build_report(subnet: str, audits: list[audit.HostAudit], summary: dict) -> str:
    L = [f"# Audit des services exposés — {datetime.now():%d/%m/%Y %H:%M}", "",
         f"Réseau audité : **{subnet}**  ", f"Hôtes analysés : {summary['hosts_scanned']} — "
         f"avec services exposés : {summary['hosts_with_services']} — services au total : {summary['services_total']}",
         "", "> Audit non destructif : connexion TCP et lecture de bannière uniquement. "
         "Aucun identifiant n'a été testé, aucun appareil modifié.", "",
         "## Synthèse par niveau de risque", ""]
    for r, n in summary["by_risk"].items():
        if n:
            L.append(f"- {RISK_ICON[r]} **{r}** : {n}")
    L += ["", "## Services prioritaires à traiter", ""]
    crit = summary["critical_services"]
    if not crit:
        L.append("Aucun service critique ou élevé détecté. 🎉")
    else:
        L += ["| Hôte | Port | Service | Risque | Conseil |", "|---|---|---|---|---|"]
        for s in crit:
            L.append(f"| {s['ip']} | {s['port']} | {s['service']} | {s['risk']} | {s['advice']} |")
    L += ["", "## Détail par hôte", ""]
    for ha in audits:
        if not ha.services:
            continue
        head = f"### {ha.ip}"
        meta = " · ".join(x for x in (ha.name, ha.vendor, ha.mac) if x)
        L.append(head + (f"  \n{meta}" if meta else ""))
        L.append("")
        L += ["| Port | Service | Risque | Bannière | Conseil |", "|---|---|---|---|---|"]
        for s in ha.services:
            creds = " ⚠ vérifier identifiants par défaut" if s.check_default_creds else ""
            L.append(f"| {s.port} | {s.service}{creds} | {s.risk} | {s.banner or '—'} | {s.advice} |")
        L.append("")
    L += ["## Rappels", "",
          "- Les mentions « vérifier identifiants par défaut » signalent une interface d'administration : "
          "connectez-vous **avec vos propres identifiants** pour confirmer qu'ils ne sont pas ceux d'usine. "
          "L'outil ne teste aucun mot de passe.",
          "- Un service « critique » exposé (base de données, Telnet, VNC) doit être fermé ou restreint par "
          "règle de pare-feu entre VLAN, pas seulement protégé par mot de passe.",
          "- Conservez ce rapport avec la date et le périmètre de votre mandat."]
    return "\n".join(L) + "\n"


def run(authorized: bool = False, ports: str = "standard", rate: float = 0.0,
        timeout: float = 1.0, no_ping: bool = False) -> str | None:
    if not _confirm(authorized):
        print("\nAudit annulé : autorisation non confirmée.")
        return None
    print("\n• Détection du réseau local…")
    cfg = netinfo.detect()
    if not cfg.subnet:
        print("Réseau local introuvable (pas de connexion ?). Audit annulé.")
        return None
    print(f"• Inventaire des hôtes sur {cfg.subnet}…")
    hosts = discovery.discover(cfg, sweep=not no_ping, resolve=True)
    targets = [{"ip": h.ip, "mac": h.mac, "name": h.hostname or h.custom_name if hasattr(h, 'custom_name') else h.hostname,
                "vendor": h.vendor or oui_vendor(h.mac)} for h in hosts if not h.is_self]
    if not targets:
        print("Aucun autre hôte détecté. Audit terminé.")
        return None
    port_list = audit.DEFAULT_PORTS if ports != "web" else [80, 443, 8080, 8443]
    print(f"• Audit de {len(targets)} hôte(s) sur {len(port_list)} ports (non destructif)…\n")
    audits = audit.audit_hosts(targets, ports=port_list, timeout=timeout, rate_limit=rate)
    summary = audit.summarize(audits)
    report = build_report(cfg.subnet, audits, summary)
    path = os.path.join(data_dir(), f"audit_services_{datetime.now():%Y%m%d_%H%M%S}.md")
    with open(path, "w", encoding="utf-8") as f:
        f.write(report)
    by = summary["by_risk"]
    print(f"\n• Terminé : {summary['services_total']} service(s) exposé(s) — "
          f"{by['critique']} critique(s), {by['élevé']} élevé(s).")
    print(f"Rapport : {path}")
    return path
