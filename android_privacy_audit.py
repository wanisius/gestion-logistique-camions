#!/usr/bin/env python3
"""
Android Privacy Audit - analyse les permissions des apps installées via ADB
Génère un rapport HTML avec classification par niveau de risque
"""

import subprocess
import json
import re
import sys
from datetime import datetime

# Force UTF-8 output on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
from pathlib import Path

# ─── Classification des permissions par risque ────────────────────────────────

PERMISSIONS_RISQUE = {
    "critique": {
        "couleur": "#dc2626",
        "emoji": "🔴",
        "label": "Critique",
        "perms": {
            "android.permission.READ_SMS": "Lecture des SMS",
            "android.permission.RECEIVE_SMS": "Réception des SMS",
            "android.permission.SEND_SMS": "Envoi des SMS",
            "android.permission.READ_CALL_LOG": "Journal des appels",
            "android.permission.PROCESS_OUTGOING_CALLS": "Interception des appels",
            "android.permission.RECORD_AUDIO": "Microphone",
            "android.permission.CAMERA": "Caméra",
            "android.permission.READ_CONTACTS": "Lecture contacts",
            "android.permission.WRITE_CONTACTS": "Modification contacts",
            "android.permission.GET_ACCOUNTS": "Accès aux comptes",
            "android.permission.USE_BIOMETRIC": "Biométrie",
            "android.permission.USE_FINGERPRINT": "Empreinte digitale",
        },
    },
    "eleve": {
        "couleur": "#ea580c",
        "emoji": "🟠",
        "label": "Élevé",
        "perms": {
            "android.permission.ACCESS_FINE_LOCATION": "Localisation précise (GPS)",
            "android.permission.ACCESS_COARSE_LOCATION": "Localisation approx.",
            "android.permission.ACCESS_BACKGROUND_LOCATION": "Localisation en arrière-plan",
            "android.permission.READ_EXTERNAL_STORAGE": "Lecture stockage",
            "android.permission.WRITE_EXTERNAL_STORAGE": "Écriture stockage",
            "android.permission.MANAGE_EXTERNAL_STORAGE": "Gestion complète stockage",
            "android.permission.READ_MEDIA_IMAGES": "Accès photos",
            "android.permission.READ_MEDIA_VIDEO": "Accès vidéos",
            "android.permission.READ_MEDIA_AUDIO": "Accès audio",
            "android.permission.CALL_PHONE": "Passer des appels",
            "android.permission.READ_PHONE_STATE": "État du téléphone (IMEI…)",
            "android.permission.READ_PHONE_NUMBERS": "Numéro de téléphone",
        },
    },
    "modere": {
        "couleur": "#ca8a04",
        "emoji": "🟡",
        "label": "Modéré",
        "perms": {
            "android.permission.BLUETOOTH": "Bluetooth",
            "android.permission.BLUETOOTH_CONNECT": "Connexion Bluetooth",
            "android.permission.BLUETOOTH_SCAN": "Scan Bluetooth",
            "android.permission.BLUETOOTH_ADMIN": "Admin Bluetooth",
            "android.permission.NFC": "NFC",
            "android.permission.BODY_SENSORS": "Capteurs corporels",
            "android.permission.ACTIVITY_RECOGNITION": "Reconnaissance activité",
            "android.permission.ACCESS_WIFI_STATE": "État Wi-Fi",
            "android.permission.CHANGE_WIFI_STATE": "Modification Wi-Fi",
            "android.permission.CHANGE_NETWORK_STATE": "Modification réseau",
            "android.permission.SCHEDULE_EXACT_ALARM": "Alarmes exactes",
            "android.permission.USE_EXACT_ALARM": "Alarmes exactes",
        },
    },
}

PERMS_SYSTEME_IGNOREES = {
    "android.permission.INTERNET",
    "android.permission.NETWORK_STATE",
    "android.permission.ACCESS_NETWORK_STATE",
    "android.permission.WAKE_LOCK",
    "android.permission.RECEIVE_BOOT_COMPLETED",
    "android.permission.FOREGROUND_SERVICE",
    "android.permission.VIBRATE",
    "android.permission.FLASHLIGHT",
    "android.permission.SET_ALARM",
    "android.permission.REQUEST_INSTALL_PACKAGES",
}


# ─── Fonctions ADB ────────────────────────────────────────────────────────────

def run_adb(args: list[str]) -> str:
    try:
        result = subprocess.run(
            ["adb"] + args,
            capture_output=True, timeout=30
        )
        return result.stdout.decode("utf-8", errors="replace").strip()
    except FileNotFoundError:
        print("❌ ADB introuvable. Installe Android Platform Tools.")
        raise
    except subprocess.TimeoutExpired:
        return ""


def verifier_appareil() -> bool:
    sortie = run_adb(["devices"])
    lignes = [l for l in sortie.splitlines() if "\t" in l and "offline" not in l]
    if not lignes:
        print("❌ Aucun appareil Android connecté (ou débogage USB désactivé).")
        return False
    print(f"✅ Appareil connecté : {lignes[0].split(chr(9))[0]}")
    return True


def get_infos_appareil() -> dict:
    return {
        "modele": run_adb(["shell", "getprop", "ro.product.model"]),
        "marque": run_adb(["shell", "getprop", "ro.product.brand"]),
        "android": run_adb(["shell", "getprop", "ro.build.version.release"]),
        "sdk": run_adb(["shell", "getprop", "ro.build.version.sdk"]),
    }


def lister_packages(tiers_seulement: bool = True) -> list[str]:
    flag = "-3" if tiers_seulement else ""
    args = ["shell", "pm", "list", "packages"]
    if flag:
        args.append(flag)
    sortie = run_adb(args)
    packages = []
    for ligne in sortie.splitlines():
        if ligne.startswith("package:"):
            packages.append(ligne.replace("package:", "").strip())
    return sorted(packages)


def get_permissions_app(package: str) -> tuple[list[str], list[str]]:
    """Retourne (permissions_accordées, permissions_refusées) — runtime uniquement"""
    sortie = run_adb([
        "shell",
        f"dumpsys package {package} | grep -E 'runtime permissions:|android\\.permission\\.' | head -60"
    ])
    accordees, refusees = [], []
    in_runtime = False

    for ligne in sortie.splitlines():
        ligne = ligne.strip()
        if "runtime permissions:" in ligne.lower():
            in_runtime = True
            continue
        if not in_runtime:
            continue
        # Only parse lines with explicit granted=true/false
        m = re.search(r"(android\.permission\.\w+).*?granted=(true|false)", ligne)
        if m:
            perm, statut = m.group(1), m.group(2)
            if statut == "true":
                accordees.append(perm)
            else:
                refusees.append(perm)

    return accordees, refusees


def get_nom_app(package: str) -> str:
    # Use lightweight 'pm list' approach — avoid heavy 'pm dump'
    sortie = run_adb([
        "shell",
        f"dumpsys package {package} | grep -m1 'applicationInfo' | head -1"
    ])
    for ligne in sortie.splitlines():
        m = re.search(r'label="([^"]+)"', ligne)
        if m:
            return m.group(1)
    # Fallback: derive name from package
    parts = package.split(".")
    return parts[-1].capitalize() if parts else package


# ─── Analyse ──────────────────────────────────────────────────────────────────

def classifier_permissions(perms_accordees: list[str]) -> dict:
    resultats = {"critique": [], "eleve": [], "modere": []}
    for niveau, info in PERMISSIONS_RISQUE.items():
        for perm in perms_accordees:
            if perm in info["perms"] and perm not in PERMS_SYSTEME_IGNOREES:
                resultats[niveau].append({
                    "perm": perm,
                    "label": info["perms"][perm],
                })
    return resultats


def score_risque(classification: dict) -> int:
    return (
        len(classification["critique"]) * 10 +
        len(classification["eleve"]) * 5 +
        len(classification["modere"]) * 2
    )


def niveau_global(score: int) -> tuple[str, str, str]:
    if score >= 20:
        return "critique", "🔴", "#dc2626"
    elif score >= 10:
        return "eleve", "🟠", "#ea580c"
    elif score >= 4:
        return "modere", "🟡", "#ca8a04"
    else:
        return "faible", "🟢", "#16a34a"


# ─── Génération HTML ──────────────────────────────────────────────────────────

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rapport Audit Permissions Android</title>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
         background: #0f172a; color: #e2e8f0; min-height: 100vh; }}
  .header {{ background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
             padding: 2rem; text-align: center; border-bottom: 1px solid #334155; }}
  .header h1 {{ font-size: 1.8rem; color: #60a5fa; margin-bottom: .5rem; }}
  .header .meta {{ color: #94a3b8; font-size: .9rem; }}
  .device-info {{ background: #1e293b; border: 1px solid #334155; border-radius: 12px;
                  padding: 1.2rem; margin: 1.5rem auto; max-width: 900px;
                  display: flex; gap: 2rem; flex-wrap: wrap; }}
  .device-info span {{ color: #94a3b8; }}
  .device-info strong {{ color: #e2e8f0; }}
  .stats {{ display: flex; gap: 1rem; max-width: 900px; margin: 0 auto 1.5rem;
            flex-wrap: wrap; justify-content: center; padding: 0 1rem; }}
  .stat-card {{ flex: 1; min-width: 150px; background: #1e293b; border-radius: 12px;
                padding: 1.2rem; text-align: center; border: 1px solid #334155; }}
  .stat-card .num {{ font-size: 2rem; font-weight: 700; }}
  .stat-card .lbl {{ font-size: .8rem; color: #94a3b8; margin-top: .3rem; }}
  .filters {{ text-align: center; margin-bottom: 1.5rem; }}
  .filters button {{ background: #334155; border: 1px solid #475569; color: #e2e8f0;
                     padding: .5rem 1rem; border-radius: 8px; cursor: pointer;
                     margin: .25rem; font-size: .85rem; transition: all .2s; }}
  .filters button:hover, .filters button.active {{ background: #3b82f6; border-color: #3b82f6; }}
  .apps-grid {{ display: grid; gap: 1rem; max-width: 900px; margin: 0 auto;
                padding: 0 1rem 2rem; }}
  .app-card {{ background: #1e293b; border-radius: 12px; border: 1px solid #334155;
               overflow: hidden; transition: transform .2s; }}
  .app-card:hover {{ transform: translateY(-2px); }}
  .app-header {{ display: flex; align-items: center; gap: 1rem;
                 padding: 1rem 1.2rem; border-bottom: 1px solid #334155; }}
  .risk-badge {{ padding: .3rem .8rem; border-radius: 20px; font-size: .75rem;
                 font-weight: 600; color: white; white-space: nowrap; }}
  .app-name {{ font-weight: 600; flex: 1; }}
  .package {{ font-size: .75rem; color: #64748b; }}
  .score {{ font-size: .85rem; color: #94a3b8; }}
  .perms-list {{ padding: .8rem 1.2rem; display: flex; flex-wrap: wrap; gap: .4rem; }}
  .perm-tag {{ padding: .25rem .6rem; border-radius: 6px; font-size: .75rem;
               font-weight: 500; }}
  .perm-tag.critique {{ background: #450a0a; color: #fca5a5; border: 1px solid #991b1b; }}
  .perm-tag.eleve {{ background: #431407; color: #fdba74; border: 1px solid #9a3412; }}
  .perm-tag.modere {{ background: #422006; color: #fde68a; border: 1px solid #92400e; }}
  .no-perms {{ padding: .8rem 1.2rem; color: #64748b; font-size: .85rem; }}
  .search {{ display: flex; justify-content: center; margin-bottom: 1rem; padding: 0 1rem; }}
  .search input {{ background: #1e293b; border: 1px solid #334155; color: #e2e8f0;
                   padding: .6rem 1rem; border-radius: 8px; width: 100%; max-width: 400px;
                   font-size: .9rem; }}
  .search input:focus {{ outline: none; border-color: #3b82f6; }}
  .hidden {{ display: none !important; }}
</style>
</head>
<body>
<div class="header">
  <h1>🔍 Audit Permissions Android</h1>
  <p class="meta">Généré le {date} · {nb_apps} applications analysées</p>
</div>

<div class="device-info" style="margin:1.5rem auto; padding: 1rem 1.5rem;">
  <div><span>Appareil : </span><strong>{marque} {modele}</strong></div>
  <div><span>Android : </span><strong>{android}</strong></div>
  <div><span>SDK : </span><strong>{sdk}</strong></div>
</div>

<div class="stats">
  <div class="stat-card"><div class="num" style="color:#dc2626">{nb_critique}</div>
    <div class="lbl">🔴 Apps critiques</div></div>
  <div class="stat-card"><div class="num" style="color:#ea580c">{nb_eleve}</div>
    <div class="lbl">🟠 Apps risque élevé</div></div>
  <div class="stat-card"><div class="num" style="color:#ca8a04">{nb_modere}</div>
    <div class="lbl">🟡 Apps modérées</div></div>
  <div class="stat-card"><div class="num" style="color:#16a34a">{nb_faible}</div>
    <div class="lbl">🟢 Apps faibles</div></div>
</div>

<div class="search">
  <input type="text" id="search" placeholder="🔍 Rechercher une app ou une permission…"
         oninput="filtrer()">
</div>

<div class="filters">
  <button class="active" onclick="filtreNiveau('tous', this)">Tous</button>
  <button onclick="filtreNiveau('critique', this)">🔴 Critique</button>
  <button onclick="filtreNiveau('eleve', this)">🟠 Élevé</button>
  <button onclick="filtreNiveau('modere', this)">🟡 Modéré</button>
  <button onclick="filtreNiveau('faible', this)">🟢 Faible</button>
</div>

<div class="apps-grid" id="grid">
{cartes}
</div>

<script>
let niveauActif = 'tous';
function filtreNiveau(niveau, btn) {{
  niveauActif = niveau;
  document.querySelectorAll('.filters button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  filtrer();
}}
function filtrer() {{
  const q = document.getElementById('search').value.toLowerCase();
  document.querySelectorAll('.app-card').forEach(card => {{
    const niveau = card.dataset.niveau;
    const texte = card.textContent.toLowerCase();
    const ok = (niveauActif === 'tous' || niveau === niveauActif) &&
               (!q || texte.includes(q));
    card.classList.toggle('hidden', !ok);
  }});
}}
</script>
</body>
</html>"""

CARTE_TEMPLATE = """<div class="app-card" data-niveau="{niveau}">
  <div class="app-header">
    <div>
      <div class="app-name">{nom}</div>
      <div class="package">{package}</div>
    </div>
    <div class="score">Score : {score}</div>
    <div class="risk-badge" style="background:{couleur}">{emoji} {label}</div>
  </div>
  {corps}
</div>"""


def generer_carte(nom, package, classification, score):
    niv, emoji, couleur = niveau_global(score)
    label = {"critique": "Critique", "eleve": "Élevé",
             "modere": "Modéré", "faible": "Faible"}[niv]
    tags = []
    for niveau_perm in ["critique", "eleve", "modere"]:
        for p in classification[niveau_perm]:
            tags.append(f'<span class="perm-tag {niveau_perm}">{p["label"]}</span>')
    corps = (
        f'<div class="perms-list">{"".join(tags)}</div>'
        if tags else
        '<div class="no-perms">Aucune permission sensible accordée</div>'
    )
    return CARTE_TEMPLATE.format(
        niveau=niv, nom=nom, package=package, score=score,
        couleur=couleur, emoji=emoji, label=label, corps=corps,
    )


# ─── Point d'entrée ───────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("  Android Privacy Audit")
    print("=" * 60)

    if not verifier_appareil():
        return

    infos = get_infos_appareil()
    print(f"  {infos['marque']} {infos['modele']} — Android {infos['android']} (SDK {infos['sdk']})")
    print()

    print("📦 Récupération des applications tierces…")
    packages = lister_packages(tiers_seulement=True)
    print(f"   {len(packages)} apps trouvées\n")

    resultats = []
    for i, pkg in enumerate(packages, 1):
        print(f"  [{i:3}/{len(packages)}] {pkg}", end="\r")
        accordees, _ = get_permissions_app(pkg)
        classif = classifier_permissions(accordees)
        score = score_risque(classif)
        nom = get_nom_app(pkg)
        resultats.append((score, nom, pkg, classif))

    print("\n✅ Analyse terminée\n")

    # Tri par score décroissant
    resultats.sort(key=lambda x: -x[0])

    # Comptages
    compteurs = {"critique": 0, "eleve": 0, "modere": 0, "faible": 0}
    cartes_html = []
    for score, nom, pkg, classif in resultats:
        niv = niveau_global(score)[0]
        compteurs[niv] += 1
        cartes_html.append(generer_carte(nom, pkg, classif, score))

    html = HTML_TEMPLATE.format(
        date=datetime.now().strftime("%d/%m/%Y à %H:%M"),
        nb_apps=len(resultats),
        marque=infos["marque"], modele=infos["modele"],
        android=infos["android"], sdk=infos["sdk"],
        nb_critique=compteurs["critique"],
        nb_eleve=compteurs["eleve"],
        nb_modere=compteurs["modere"],
        nb_faible=compteurs["faible"],
        cartes="\n".join(cartes_html),
    )

    rapport = Path("rapport_permissions.html")
    rapport.write_text(html, encoding="utf-8")
    print(f"📄 Rapport généré : {rapport.resolve()}")
    print()
    print("Résumé :")
    print(f"  🔴 Critique : {compteurs['critique']} apps")
    print(f"  🟠 Élevé    : {compteurs['eleve']} apps")
    print(f"  🟡 Modéré   : {compteurs['modere']} apps")
    print(f"  🟢 Faible   : {compteurs['faible']} apps")
    print()
    print("Ouvre rapport_permissions.html dans ton navigateur.")


if __name__ == "__main__":
    main()
