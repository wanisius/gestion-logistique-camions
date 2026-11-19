"""Évaluation des risques, recommandations expliquées et score de sécurité."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field

WEIGHTS = {"critique": 25, "élevé": 15, "moyen": 8, "faible": 3, "info": 0}

# Points vérifiés avec l'utilisateur (le logiciel ne peut pas les lire sans identifiants).
CHECKLIST = [
    {"key": "wps", "action": "Désactiver le WPS", "question": "Le WPS (bouton ou code PIN d'appairage) est-il désactivé sur votre box/routeur ?",
     "where": "Réglages Wi-Fi > WPS (ou « Appairage », « Wi-Fi Protected Setup »)."},
    {"key": "remote_admin", "action": "Désactiver l'administration à distance", "question": "L'administration à distance (accès à l'interface depuis Internet) est-elle désactivée ?",
     "where": "Administration / Système > Accès à distance (ou « Remote management », « Accès distant »)."},
    {"key": "firmware", "action": "Mettre à jour le firmware du routeur", "question": "Le firmware est-il à jour, avec les mises à jour automatiques activées ?",
     "where": "Système / Maintenance > Mise à jour du firmware. Pour une box d'opérateur, la mise à jour est souvent automatique."},
    {"key": "admin_password", "action": "Changer le mot de passe administrateur du routeur", "question": "Le mot de passe administrateur d'origine (étiquette ou « admin ») a-t-il été changé ?",
     "where": "Administration > Mot de passe. Le logiciel ne vous demandera jamais ce mot de passe."},
    {"key": "router_firewall", "action": "Activer le pare-feu du routeur", "question": "Le pare-feu du routeur est-il activé (niveau standard ou élevé) ?",
     "where": "Sécurité / Pare-feu (ou « Firewall », « SPI »)."},
    {"key": "wifi_password", "action": "Renforcer la clé Wi-Fi", "question": "La clé Wi-Fi fait-elle au moins 12 caractères et n'est-elle utilisée nulle part ailleurs ?",
     "where": "Ne saisissez pas votre clé ici : répondez simplement oui ou non."},
    {"key": "guest_network", "action": "Isoler invités et objets connectés sur un réseau invité", "question": "Les invités et objets connectés (caméras, prises, TV) sont-ils sur un réseau invité séparé ?",
     "where": "Réglages Wi-Fi > Réseau invité (ou « Guest network »)."},
]

YES, NO, UNKNOWN = "oui", "non", "inconnu"


@dataclass
class Finding:
    id: str
    category: str
    severity: str
    status: str            # "risque", "ok", "à_vérifier"
    title: str
    detail: str
    recommendation: str = ""
    steps: list[str] = field(default_factory=list)
    router_change: bool = False   # la correction implique une modification du routeur
    action_title: str = ""        # intitulé de l'action proposée (onglet Actions)

    def penalty(self) -> float:
        w = WEIGHTS[self.severity]
        return w if self.status == "risque" else w / 3 if self.status == "à_vérifier" else 0

    def to_dict(self) -> dict:
        return {**asdict(self), "penalty": round(self.penalty(), 1)}


def admin_url(router: dict) -> str:
    """Adresse de l'interface d'administration détectée (HTTPS de préférence, port inclus)."""
    gw = router.get("gateway", "")
    if not gw:
        return ""
    for scheme, default in (("https", 443), ("http", 80)):
        info = router.get(scheme) or {}
        if info.get("reachable"):
            port = info.get("port") or default
            return f"{scheme}://{gw}" + ("" if port == default else f":{port}")
    return f"http://{gw}"


def _admin_url(router: dict) -> str:
    return admin_url(router) or "l'adresse de votre passerelle"


def _checklist_finding(key: str, answers: dict, severity: str, title_ok: str, title_bad: str,
                       detail: str, recommendation: str, steps: list[str], bad_answer: str = NO) -> Finding:
    ans = (answers.get(key) or {}).get("value", UNKNOWN)
    item = next(c for c in CHECKLIST if c["key"] == key)
    if ans == UNKNOWN:
        return Finding(f"check_{key}", "Routeur", severity, "à_vérifier", item["question"],
                       detail + " Ce réglage n'est pas lisible sans vos identifiants administrateur : "
                       "vérifiez-le dans l'interface du routeur puis répondez dans la liste de contrôle.",
                       recommendation, [item["where"]] + steps, router_change=True,
                       action_title=f"{item['action']} (à vérifier)")
    if ans == bad_answer:
        return Finding(f"check_{key}", "Routeur", severity, "risque", title_bad, detail, recommendation,
                       [item["where"]] + steps, router_change=True, action_title=item["action"])
    return Finding(f"check_{key}", "Routeur", severity, "ok", title_ok, "Confirmé par vous.")


def evaluate(network: dict, wifi: dict, router: dict, devices: list[dict], answers: dict) -> list[Finding]:
    f: list[Finding] = []
    admin = _admin_url(router)
    open_admin = [f"Ouvrez {admin} dans votre navigateur et connectez-vous avec VOS identifiants."]

    # ------------------------------------------------------------ Wi-Fi
    level = wifi.get("security_level", "inconnu")
    ssid = wifi.get("ssid") or "votre réseau"
    if not wifi.get("connected"):
        f.append(Finding("wifi_security", "Wi-Fi", "moyen", "à_vérifier", "Chiffrement Wi-Fi non mesuré",
                         "Ce PC n'est pas connecté en Wi-Fi : le type de chiffrement n'a pas pu être lu. "
                         "Relancez l'analyse depuis une connexion Wi-Fi ou vérifiez-le dans le routeur.",
                         "Utilisez WPA3-Personnel, ou WPA2/WPA3 mixte si certains appareils ne gèrent pas WPA3."))
    elif level in ("ouvert", "wep"):
        f.append(Finding("wifi_security", "Wi-Fi", "critique", "risque",
                         f"Réseau « {ssid} » {'sans chiffrement' if level == 'ouvert' else 'en WEP'}",
                         "Tout le trafic peut être intercepté et n'importe qui peut se connecter. "
                         "Le WEP se casse en quelques minutes.",
                         "Passez en WPA2/WPA3 (ou WPA3 seul) avec une clé longue.",
                         open_admin + ["Réglages Wi-Fi > Sécurité : choisir « WPA2/WPA3-Personnel ».",
                                       "Définir une nouvelle clé d'au moins 12 caractères.",
                                       "Reconnecter vos appareils avec la nouvelle clé."], True))
    elif level == "wpa" or "tkip" in wifi.get("cipher", "").lower():
        f.append(Finding("wifi_security", "Wi-Fi", "élevé", "risque", "Chiffrement Wi-Fi obsolète (WPA/TKIP)",
                         f"Le réseau utilise {wifi.get('authentication')} / {wifi.get('cipher')}. "
                         "WPA et TKIP présentent des faiblesses connues.",
                         "Passez en WPA2 (AES/CCMP) au minimum, idéalement WPA2/WPA3.",
                         open_admin + ["Réglages Wi-Fi > Sécurité : « WPA2/WPA3 » et chiffrement « AES »."], True))
    elif level == "wpa2":
        f.append(Finding("wifi_security", "Wi-Fi", "faible", "risque", "WPA2 sans WPA3",
                         f"Le réseau utilise {wifi.get('authentication')} ({wifi.get('cipher')}). C'est correct, "
                         "mais WPA3 protège mieux contre le cassage hors ligne de la clé.",
                         "Si votre routeur le propose, activez le mode mixte WPA2/WPA3 : les anciens appareils "
                         "restent compatibles.",
                         open_admin + ["Réglages Wi-Fi > Sécurité : « WPA2/WPA3-Personnel » (transition).",
                                       "Vérifiez ensuite que tous vos appareils se reconnectent."], True))
    else:
        f.append(Finding("wifi_security", "Wi-Fi", "critique", "ok", f"Chiffrement {wifi.get('authentication')}",
                         "Le niveau de chiffrement Wi-Fi est à l'état de l'art."))

    my_level = level
    rank = {"ouvert": 0, "wep": 1, "wpa": 2, "wpa2": 3, "wpa2/wpa3": 4, "wpa3": 5}
    twins = [n for n in router.get("nearby_networks", [])
             if n.get("ssid") == wifi.get("ssid") and wifi.get("ssid")
             and rank.get(n.get("security_level", ""), 9) < rank.get(my_level, 0)]
    if twins:
        f.append(Finding("evil_twin", "Wi-Fi", "élevé", "risque", "Réseau homonyme moins sécurisé à proximité",
                         f"Un réseau portant le même nom « {ssid} » est visible avec une sécurité plus faible "
                         f"({twins[0].get('authentication')}). Il peut s'agir d'un faux point d'accès "
                         "destiné à intercepter vos connexions, ou d'un ancien répéteur mal configuré.",
                         "Vérifiez si un répéteur vous appartient ; sinon, ne vous y connectez pas et "
                         "oubliez/recréez le profil Wi-Fi sur vos appareils.",
                         ["Comparez les BSSID affichés avec ceux de vos équipements.",
                          "Si l'équipement est à vous, appliquez-lui la même sécurité que la box."]))

    # ------------------------------------------------------------ Routeur (liste de contrôle)
    f.append(_checklist_finding(
        "wps", answers, "élevé", "WPS désactivé", "WPS activé",
        "Le WPS par code PIN peut être forcé en quelques heures, ce qui révèle la clé Wi-Fi.",
        "Désactivez le WPS ; utilisez la clé Wi-Fi ou un QR code pour connecter vos appareils.",
        open_admin + ["Désactiver le WPS (PIN et bouton) puis enregistrer."], bad_answer=NO))
    f.append(_checklist_finding(
        "remote_admin", answers, "élevé", "Administration à distance désactivée",
        "Administration à distance activée",
        "L'interface d'administration exposée sur Internet est une cible d'attaques automatisées.",
        "Désactivez l'accès distant ; si vous en avez besoin, préférez un VPN.",
        open_admin + ["Désactiver « Accès à distance » / « Remote management »."]))
    f.append(_checklist_finding(
        "firmware", answers, "élevé", "Firmware à jour", "Firmware pas à jour",
        "Les mises à jour corrigent des failles activement exploitées sur les routeurs.",
        "Installez la dernière version et activez les mises à jour automatiques.",
        open_admin + ["Lancer la recherche de mise à jour et l'installer (le routeur redémarrera : "
                      "choisissez le moment)."]))
    f.append(_checklist_finding(
        "admin_password", answers, "élevé", "Mot de passe administrateur personnalisé",
        "Mot de passe administrateur d'origine",
        "Les mots de passe par défaut des routeurs sont connus et publiés.",
        "Choisissez un mot de passe administrateur unique, stocké dans un gestionnaire de mots de passe.",
        open_admin + ["Administration > Mot de passe : en définir un nouveau, long et unique."]))
    f.append(_checklist_finding(
        "router_firewall", answers, "moyen", "Pare-feu du routeur actif", "Pare-feu du routeur désactivé",
        "Sans pare-feu, des services de vos appareils peuvent être joignables depuis Internet.",
        "Activez le pare-feu au niveau standard (ou élevé).",
        open_admin + ["Sécurité > Pare-feu : niveau « Standard » ou « Élevé »."]))
    f.append(_checklist_finding(
        "wifi_password", answers, "moyen", "Clé Wi-Fi robuste", "Clé Wi-Fi faible ou réutilisée",
        "Une clé courte peut être cassée hors ligne après capture d'une connexion.",
        "Utilisez une phrase de passe d'au moins 12 caractères, propre à ce réseau.",
        open_admin + ["Réglages Wi-Fi > Clé : en définir une nouvelle (vos appareils devront se reconnecter)."]))
    f.append(_checklist_finding(
        "guest_network", answers, "faible", "Réseau invité utilisé", "Pas de réseau invité séparé",
        "Les objets connectés sont souvent peu mis à jour ; les isoler limite l'impact d'une compromission.",
        "Créez un réseau invité pour les visiteurs et les objets connectés.",
        open_admin + ["Réglages Wi-Fi > Réseau invité : l'activer avec une clé différente."]))

    # ------------------------------------------------------------ Services exposés par la passerelle
    ports = router.get("open_ports", {})
    if "23" in ports:
        f.append(Finding("port_telnet", "Routeur", "élevé", "risque", "Telnet ouvert sur la passerelle",
                         "Telnet transmet les identifiants en clair et est très ciblé par les botnets (Mirai…).",
                         "Désactivez Telnet dans l'interface du routeur.",
                         open_admin + ["Administration > Services : désactiver Telnet."], True))
    if "21" in ports:
        f.append(Finding("port_ftp", "Routeur", "moyen", "risque", "Serveur FTP actif sur la passerelle",
                         "Le FTP n'est pas chiffré ; il est souvent lié au partage d'une clé USB branchée sur la box.",
                         "Désactivez le serveur FTP si vous ne l'utilisez pas.",
                         open_admin + ["Partage / Stockage USB : désactiver FTP."], True))
    if "445" in ports:
        f.append(Finding("port_smb", "Routeur", "faible", "risque", "Partage de fichiers (SMB) actif sur la passerelle",
                         "Le routeur partage des fichiers sur le réseau local (stockage USB/disque).",
                         "Désactivez le partage s'il est inutile, ou protégez-le par mot de passe.",
                         open_admin + ["Partage / Stockage : désactiver ou exiger un mot de passe."], True))
    if "22" in ports:
        f.append(Finding("port_ssh", "Routeur", "info", "risque", "SSH accessible sur la passerelle",
                         "Normal sur certains routeurs avancés ; à désactiver si vous ne l'utilisez pas.", ""))
    http_ok = router.get("http", {}).get("reachable")
    https_ok = router.get("https", {}).get("reachable")
    if http_ok and not https_ok:
        f.append(Finding("admin_http", "Routeur", "faible", "risque", "Interface d'administration en HTTP seulement",
                         "Le mot de passe administrateur circule en clair sur le réseau local.",
                         "Activez l'accès HTTPS à l'interface si le routeur le permet ; évitez de vous "
                         "y connecter depuis un réseau partagé.", open_admin, True))

    # ------------------------------------------------------------ UPnP
    mappings = router.get("port_mappings", [])
    if router.get("upnp_igd"):
        risky = [m for m in mappings if m.get("internal_port") in ("22", "23", "445", "3389", "5900")]
        listing = "; ".join(f"{m['protocol']} {m['external_port']} → {m['internal_client']}:{m['internal_port']}"
                            f" ({m['description'] or 'sans description'})" for m in mappings[:10])
        f.append(Finding("upnp", "Routeur", "élevé" if risky else "moyen", "risque",
                         "UPnP actif" + (f" avec {len(mappings)} redirection(s) de ports" if mappings else ""),
                         "UPnP permet à n'importe quel appareil du réseau (y compris un objet compromis) "
                         "d'ouvrir des ports vers Internet sans votre accord."
                         + (f" Redirections actuelles : {listing}." if mappings else ""),
                         "Désactivez UPnP sauf besoin précis (console de jeu…), et créez à la place des "
                         "redirections manuelles limitées.",
                         open_admin + ["Réseau / NAT > UPnP : désactiver.",
                                       "Vérifier ensuite que vos usages (jeux, visio) fonctionnent toujours."], True))
    elif router.get("gateway"):
        f.append(Finding("upnp", "Routeur", "moyen", "ok", "UPnP IGD non détecté",
                         "La passerelle ne publie pas de service UPnP de redirection de ports sur le réseau local."))

    # ------------------------------------------------------------ DNS
    dns = router.get("dns", {})
    servers = dns.get("servers", [])
    odd = [s for s in servers if s["type"].startswith("local (autre")]
    if odd:
        f.append(Finding("dns_local", "DNS", "moyen", "risque", "Serveur DNS local inattendu",
                         f"Le PC utilise {', '.join(s['server'] for s in odd)} comme DNS, qui n'est pas la passerelle. "
                         "C'est normal sur un réseau d'entreprise (serveur DNS interne) ou avec un Pi-hole/AdGuard Home ; "
                         "sinon cela peut indiquer un serveur DHCP pirate.",
                         "Vérifiez que cette adresse correspond à un équipement que vous avez installé.",
                         ["Repérez l'appareil dans l'inventaire et nommez-le s'il est légitime."]))
    if dns.get("nxdomain_redirect"):
        f.append(Finding("dns_redirect", "DNS", "faible", "risque", "Redirection des domaines inexistants",
                         "Un domaine qui n'existe pas a quand même été résolu : votre résolveur DNS réécrit les "
                         "réponses (pratique de certains FAI, ou modification malveillante des DNS).",
                         "Configurez dans le routeur un résolveur fiable (ex. Quad9 9.9.9.9 ou Cloudflare 1.1.1.1).",
                         open_admin + ["Réseau > DNS : saisir les serveurs choisis, puis enregistrer."], True))
    if servers and not odd and not dns.get("nxdomain_redirect"):
        f.append(Finding("dns", "DNS", "moyen", "ok", "Configuration DNS cohérente",
                         ", ".join(f"{s['server']} ({s['type']})" for s in servers)))

    # ------------------------------------------------------------ PC
    fw = network.get("pc_firewall") or {}
    off = [k for k, v in fw.items() if not v]
    if off:
        f.append(Finding("pc_firewall", "PC", "élevé", "risque", "Pare-feu Windows désactivé",
                         f"Profil(s) désactivé(s) : {', '.join(off)}.",
                         "Réactivez le pare-feu Windows (Sécurité Windows > Pare-feu et protection du réseau).",
                         ["Ouvrir « Sécurité Windows » > « Pare-feu et protection du réseau ».",
                          "Activer chaque profil (domaine, privé, public)."]))
    elif fw:
        f.append(Finding("pc_firewall", "PC", "élevé", "ok", "Pare-feu Windows actif", "Tous les profils sont actifs."))

    # ------------------------------------------------------------ Appareils
    unknown = [d for d in devices if d.get("category") in ("inconnu", "nouveau") and d.get("online")]
    if unknown:
        f.append(Finding("unknown_devices", "Appareils", "moyen", "risque",
                         f"{len(unknown)} appareil(s) connecté(s) non identifié(s)",
                         "Des appareils présents sur le réseau n'ont pas encore été reconnus par vous.",
                         "Identifiez chaque appareil et marquez-le « autorisé ». Si l'un d'eux vous est "
                         "inconnu, changez la clé Wi-Fi (après confirmation) pour l'exclure.",
                         ["Onglet Appareils : nommer et autoriser ceux que vous reconnaissez.",
                          "Astuce : éteignez un appareil et relancez un scan pour voir lequel disparaît."]))
    elif devices:
        f.append(Finding("unknown_devices", "Appareils", "moyen", "ok", "Tous les appareils connectés sont identifiés",
                         f"{sum(1 for d in devices if d.get('online'))} appareil(s) en ligne, tous autorisés."))
    return f


def score(findings: list[Finding]) -> dict:
    penalty = sum(x.penalty() for x in findings)
    value = max(0, round(100 - penalty))
    grade = "A" if value >= 90 else "B" if value >= 75 else "C" if value >= 60 else "D" if value >= 40 else "E"
    return {"value": value, "grade": grade,
            "risks": sum(1 for x in findings if x.status == "risque" and x.severity != "info"),
            "to_check": sum(1 for x in findings if x.status == "à_vérifier"),
            "ok": sum(1 for x in findings if x.status == "ok")}
