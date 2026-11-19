# WiFi Security Manager

Logiciel local pour Windows qui analyse et aide à sécuriser **votre** réseau Wi-Fi domestique.
Backend Python (découverte réseau, sans dépendance externe) + tableau de bord React servi en local.

## Garanties

- **Analyse non destructive.** Lecture de la table ARP, **un** ping par adresse du sous-réseau local
  (désactivable), découverte UPnP/SSDP, une requête HTTP sur la page d'accueil de la box et des tests
  de connexion vers une courte liste de ports **de la passerelle uniquement**. Aucun port n'est sondé sur
  vos autres appareils, aucune vulnérabilité n'est exploitée.
- **Aucune modification.** Le logiciel ne bloque aucun appareil, ne change aucun mot de passe, ne redémarre
  pas le routeur et ne touche à aucune configuration. Les corrections sont *proposées* ; quand vous en
  autorisez une (confirmation explicite), il vous guide pas à pas et c'est vous qui l'appliquez.
- **Aucun identifiant.** Il ne demande pas, ne devine pas et ne force jamais les identifiants administrateur.
- **Aucune clé Wi-Fi.** `netsh wlan show profile ... key=clear` est bloqué dans le code (liste blanche de
  commandes, voir `wsm/system.py`) ; la clé n'est ni lue, ni affichée, ni stockée.
- **Local uniquement.** Le tableau de bord écoute sur `127.0.0.1`, vérifie l'en-tête `Host` et exige un jeton
  aléatoire sur toute l'API. Seule exception réseau sortante : `update-oui`, que vous lancez vous-même.

## Prérequis

- Windows 10 ou 11
- [Python 3.10+](https://www.python.org/downloads/windows/) (cochez « Add python.exe to PATH »)
- Rien d'autre : l'interface est déjà compilée dans `frontend/dist`. Node.js ne sert qu'à la modifier.

## Démarrage

1. **Diagnostic** — double-cliquez sur `diagnostic.bat` (ou `py -m wsm diagnose`).
   Il détecte la configuration réseau (interface, IP, sous-réseau, passerelle, DNS, pare-feu Windows),
   le Wi-Fi (SSID, WPA2/WPA3, chiffrement), identifie le routeur (marque/modèle via UPnP et page d'accueil),
   évalue sa compatibilité, inventorie les appareils et produit un rapport Markdown dans
   `%LOCALAPPDATA%\WiFiSecurityManager\`.
2. **Tableau de bord** — `lancer.bat` (ou `py -m wsm serve`) ouvre http://127.0.0.1:8765/.
3. *(Facultatif)* **Fabricants** — `py -m wsm update-oui` télécharge le registre public de l'IEEE pour
   identifier tous les fabricants à partir des adresses MAC.
4. *(Facultatif)* **Surveillance au démarrage** — `scripts\installer_surveillance.bat` crée une tâche
   planifiée (à l'ouverture de session, sans droits administrateur) ; `scripts\desinstaller_surveillance.bat` la retire.

## Sur Android

Les analyses sont toujours faites par le PC : depuis Android 10, une application ne peut plus lire la table
ARP ni les adresses MAC des autres appareils. Le téléphone affiche et pilote le tableau de bord du PC.

1. Sur le PC : tableau de bord → **Réglages** → **Accès depuis Android** → *Activer* (confirmation demandée).
   Au premier lancement, Windows demande d'autoriser Python dans le pare-feu : acceptez pour les
   **réseaux privés** uniquement (votre Wi-Fi doit être défini comme réseau privé dans Windows).
2. Sur le téléphone, connecté au même Wi-Fi : scannez le QR code affiché (appareil photo ou Google Lens).
3. Dans Chrome : menu ⋮ → **Ajouter à l'écran d'accueil** pour l'ouvrir comme une application.

Sécurité : l'accès est désactivé par défaut et n'est joignable que depuis le réseau local (pas depuis Internet).
Seuls les téléphones ayant scanné le QR code y accèdent. *Révoquer* invalide tous les téléphones associés,
et l'activation comme l'affichage du QR code ne sont possibles que depuis le PC. La connexion se fait en HTTP
sur votre réseau local : n'activez pas cet accès sur un Wi-Fi partagé. Le PC doit rester allumé avec le
logiciel lancé (ou la surveillance installée). Les notifications de nouveaux appareils restent sur le PC ;
sur le téléphone, consultez l'onglet Alertes.

Conseil : lancez le diagnostic depuis le PC **connecté en Wi-Fi**, sinon le type de chiffrement ne peut pas être lu.

## Tableau de bord

| Onglet | Contenu |
|---|---|
| Tableau de bord | Score /100 et note A–E, appareils en ligne (connus / nouveaux / inconnus), priorités, alertes, évolution du score, connexions par jour |
| Appareils | IP, MAC, nom, fabricant, première/dernière détection ; renommer, autoriser, oublier |
| Sécurité | Routeur et compatibilité, Wi-Fi, redirections UPnP, liste de contrôle, constats expliqués |
| Actions | Corrections proposées → autoriser (avec confirmation) / refuser / marquer appliquée |
| Historique | Connexions, déconnexions, nouveaux appareils, changements d'IP |
| Alertes | Nouveaux appareils, risques élevés, changement de MAC de la passerelle (possible usurpation ARP) |
| Réglages | Intervalle de surveillance, notifications Windows, ping léger, accès depuis Android (QR code) |

**Classement des appareils** : *connu* = autorisé par vous ; *nouveau* = vu pour la première fois depuis
moins de 24 h ; *inconnu* = non autorisé depuis plus longtemps. Le premier scan sert de référence (pas de
notification) ; ensuite, chaque nouvel appareil déclenche une alerte et une notification Windows.

## Ce qui est vérifié

| Contrôle | Méthode |
|---|---|
| WPA2 / WPA3 / WEP / ouvert, TKIP | `netsh wlan show interfaces` |
| Faux point d'accès (même SSID, sécurité plus faible) | `netsh wlan show networks mode=bssid` |
| Telnet, FTP, SMB, SSH, admin HTTP sans HTTPS | connexion TCP vers la passerelle |
| UPnP et redirections de ports ouvertes | SSDP + lecture SOAP `GetGenericPortMappingEntry` |
| DNS (serveur inattendu, redirection NXDOMAIN) | configuration Windows + résolution d'un domaine aléatoire |
| Pare-feu Windows | `Get-NetFirewallProfile` |
| Usurpation ARP de la passerelle | suivi de sa MAC entre deux analyses |
| WPS, administration à distance, firmware, pare-feu du routeur, mot de passe admin, réseau invité | **liste de contrôle** : illisibles sans identifiants, vous y répondez dans l'interface |

## Audit d'entreprise (réseau autorisé uniquement)

> ⚠️ **N'utilisez cette commande que sur un réseau dont vous êtes responsable, ou que vous êtes mandaté par écrit pour auditer.** Un scan de services peut déclencher les alertes du pare-feu/IDS (WatchGuard, FortiGate…) : prévenez l'équipe sécurité et convenez d'une plage horaire.

En plus du diagnostic domestique, l'outil propose un **audit défensif des services exposés** :

```bash
py -m wsm audit --autorise            # jeu de ports standard
py -m wsm audit --autorise --rate 0.3 # ralenti, pour ménager l'IDS
py -m wsm audit --autorise --ports web
```

Il recense, pour chaque hôte, les **ports de service ouverts** (connexion TCP simple), lit la **bannière** que le service annonce de lui-même, et classe les expositions par risque (Telnet, RDP, SMB, bases de données, interfaces d'administration…). Le rapport est écrit dans `%LOCALAPPDATA%\WiFiSecurityManager\audit_services_*.md`.

**Ce que l'audit ne fait jamais** : aucun essai d'identifiants (il *signale* les interfaces d'administration à vérifier manuellement, sans tester le moindre mot de passe), aucune exploitation de faille, aucune coupure ni modification d'appareil. C'est un état des lieux de ce qui est exposé, destiné à être corrigé.

## Développement

```bash
python -m unittest discover -s tests -t .     # tests (parseurs FR/EN, analyse, API)
cd frontend && npm install && npm run dev     # interface en mode dev (API relayée vers :8765)
cd frontend && npm run build                  # recompile frontend/dist
```

Arborescence : `wsm/` (backend : `netinfo`, `wifi`, `discovery`, `router`, `analysis`, `store`, `scanner`,
`server`, `diagnose`, `notify`), `frontend/` (React + Vite), `tests/`, `scripts/`.
