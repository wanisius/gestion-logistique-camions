"""Diagnostic initial : configuration réseau, routeur, compatibilité et premiers constats."""

from __future__ import annotations

import os
from datetime import datetime

from .scanner import run_scan
from .store import Store, data_dir

ICON = {"risque": "✗", "à_vérifier": "?", "ok": "✓"}


def build_report(store: Store) -> str:
    s = store.state
    n, w, r, sc = s.get("network", {}), s.get("wifi", {}), s.get("router", {}), s.get("score") or {}
    # Pas de guillemets identiques imbriqués dans les f-strings : interdit avant Python 3.12.
    firewall = ", ".join(f"{k}={'actif' if v else 'INACTIF'}"
                         for k, v in (n.get("pc_firewall") or {}).items()) or "non lu"
    L = [f"# Diagnostic WiFi Security Manager — {datetime.now():%d/%m/%Y %H:%M}", ""]
    L += ["## 1. Configuration réseau du PC", "",
          f"- Interface : **{n.get('interface') or '?'}** ({n.get('interface_type')})",
          f"- Nom du PC : {n.get('hostname')}",
          f"- Adresse IP : {n.get('ip')}/{n.get('prefix')} — DHCP : {'oui' if n.get('dhcp') else 'non' if n.get('dhcp') is False else '?'}",
          f"- Sous-réseau : **{n.get('subnet') or '?'}**",
          f"- Passerelle : **{n.get('gateway') or '?'}** (MAC {n.get('gateway_mac') or s.get('gateway_mac') or '?'})",
          f"- DNS : {', '.join(n.get('dns_servers') or []) or '?'}",
          f"- Pare-feu Windows : {firewall}"]
    if n.get("errors"):
        L += [f"- ⚠ {e}" for e in n["errors"]]
    L += ["", "## 2. Connexion Wi-Fi", ""]
    if w.get("connected"):
        L += [f"- SSID : **{w.get('ssid')}** — BSSID {w.get('bssid')}",
              f"- Sécurité : **{w.get('authentication')}** / {w.get('cipher')} → niveau `{w.get('security_level')}`",
              f"- Radio : {w.get('radio')} — bande {w.get('band') or '?'} — canal {w.get('channel') or '?'} — signal {w.get('signal')}%",
              "- La clé Wi-Fi n'est ni lue ni stockée."]
    else:
        L += ["- Ce PC n'est pas connecté en Wi-Fi (ou aucune carte Wi-Fi détectée)."]
    comp = r.get("compatibility", {})
    L += ["", "## 3. Routeur et compatibilité", "",
          f"- Marque / gamme : **{r.get('brand') or 'non identifiée'}**",
          f"- Fabricant : {r.get('vendor') or '?'} — Modèle : **{r.get('model') or 'non publié'}**",
          f"- Sources d'identification : {', '.join(r.get('identification_sources') or []) or 'aucune'}",
          f"- Interface web : HTTP {'oui (port ' + str(r['http'].get('port', 80)) + ')' if r.get('http', {}).get('reachable') else 'non'}"
          f" / HTTPS {'oui (port ' + str(r['https'].get('port', 443)) + ')' if r.get('https', {}).get('reachable') else 'non'}"
          f" — titre : « {r.get('https', {}).get('title') or r.get('http', {}).get('title') or ''} »",
          f"- Ports ouverts sur la passerelle (réseau local) : "
          f"{', '.join(f'{p} ({v})' for p, v in r.get('open_ports', {}).items()) or 'aucun parmi ceux testés'}",
          f"- UPnP : {'actif' if r.get('upnp_enabled') else 'non détecté'}"
          f"{' — IGD, ' + str(len(r.get('port_mappings', []))) + ' redirection(s)' if r.get('upnp_igd') else ''}",
          f"- Redirection DNS des domaines inexistants : {r.get('dns', {}).get('nxdomain_redirect')}",
          "", f"**Niveau de compatibilité : {comp.get('level', '?')}**", "",
          "Lu automatiquement : " + ", ".join(comp.get("automatic", [])) + ".", "",
          "À vérifier avec vous : " + ", ".join(comp.get("manual", [])) + ".", "",
          f"> {comp.get('note', '')}"]
    devs = sorted(store.devices(), key=lambda d: [int(x) for x in (d.get("ip") or "0.0.0.0").split(".")])
    L += ["", f"## 4. Appareils détectés ({sum(1 for d in devs if d.get('online'))} en ligne)", "",
          "| IP | MAC | Nom | Fabricant | Statut |", "|---|---|---|---|---|"]
    for d in devs:
        role = " (passerelle)" if d.get("is_gateway") else " (ce PC)" if d.get("is_self") else ""
        L.append(f"| {d.get('ip')} | {d['mac']} | {(d.get('custom_name') or d.get('hostname') or '—')}{role} "
                 f"| {d.get('vendor') or d.get('model') or '—'} | {d['category']} |")
    L += ["", f"## 5. Constats — score {sc.get('value')}/100 (note {sc.get('grade')})", ""]
    order = {"critique": 0, "élevé": 1, "moyen": 2, "faible": 3, "info": 4}
    for f in sorted(s.get("findings", []), key=lambda f: ({"risque": 0, "à_vérifier": 1, "ok": 2}[f["status"]],
                                                          order[f["severity"]])):
        L.append(f"- {ICON[f['status']]} **[{f['severity']}] {f['title']}** — {f['detail']}")
        if f["status"] != "ok" and f.get("recommendation"):
            L.append(f"  - Correction proposée : {f['recommendation']}")
    L += ["", "## 6. Étapes suivantes", "",
          "1. Lancez le tableau de bord (`lancer.bat`) et nommez/autorisez vos appareils.",
          "2. Répondez à la liste de contrôle (WPS, administration à distance, firmware…).",
          "3. Pour chaque correction proposée, c'est vous qui décidez : rien n'est modifié sans votre accord."]
    return "\n".join(L) + "\n"


def run(full_sweep: bool = True) -> str:
    store = Store()
    print("WiFi Security Manager — diagnostic (analyse non destructive)\n")
    run_scan(store, full=True, sweep=full_sweep)
    report = build_report(store)
    path = os.path.join(data_dir(), f"diagnostic_{datetime.now():%Y%m%d_%H%M%S}.md")
    with open(path, "w", encoding="utf-8") as f:
        f.write(report)
    print("\n" + report)
    print(f"Rapport enregistré : {path}")
    return path
