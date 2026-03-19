# Organisation du Projet

Ce document décrit la structure complète du dépôt et le rôle de chaque dossier et fichier.

---

## Vue d'ensemble

```
gestion-logistique-camions/
├── mobile/                  # Application Android (Java + Firebase)
├── backend/                 # API REST (prévu V3)
├── data/                    # Modèles de données et fichiers Excel
├── docs/                    # Documentation fonctionnelle et technique
├── .github/                 # Templates GitHub (issues, PR)
├── .gitignore               # Fichiers exclus du versionnement
├── README.md                # Présentation générale du projet
└── STRUCTURE.md             # Ce fichier
```

---

## `mobile/` — Application Android

Contient l'intégralité du projet Android Studio.

```
mobile/
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/logistique/camions/
│   │   │   │   ├── activities/          # Écrans de l'application
│   │   │   │   │   ├── LoginActivity.java
│   │   │   │   │   ├── DashboardActivity.java
│   │   │   │   │   └── DetailCamionActivity.java
│   │   │   │   ├── fragments/           # Composants UI réutilisables
│   │   │   │   │   ├── ListeCamionsFragment.java
│   │   │   │   │   └── StatsFragment.java
│   │   │   │   ├── viewmodels/          # Logique métier (MVVM)
│   │   │   │   │   ├── CamionViewModel.java
│   │   │   │   │   └── PointageViewModel.java
│   │   │   │   ├── models/              # Entités de données
│   │   │   │   │   ├── Camion.java          # Entité Room (table camions)
│   │   │   │   │   └── Pointage.java        # Entité Room (table pointages)
│   │   │   │   ├── database/
│   │   │   │   │   ├── local/               # Room (SQLite hors ligne)
│   │   │   │   │   │   ├── AppDatabase.java     # Singleton Room
│   │   │   │   │   │   ├── CamionDao.java       # Requêtes CRUD camions
│   │   │   │   │   │   └── PointageDao.java     # Requêtes CRUD pointages
│   │   │   │   │   └── remote/              # Firebase Firestore
│   │   │   │   │       └── FirestoreRepository.java
│   │   │   │   ├── repository/          # Source unique de vérité
│   │   │   │   │   └── CamionRepository.java  # Coordonne Room + Firestore
│   │   │   │   ├── adapters/            # RecyclerView adapters
│   │   │   │   │   └── CamionAdapter.java
│   │   │   │   ├── utils/               # Helpers et utilitaires
│   │   │   │   │   ├── ExcelHelper.java     # Import/export .xlsx
│   │   │   │   │   ├── PdfGenerator.java    # Génération rapports PDF
│   │   │   │   │   └── DateUtils.java       # Formatage dates/heures
│   │   │   │   └── MainActivity.java    # Point d'entrée de l'app
│   │   │   ├── res/
│   │   │   │   ├── layout/              # Fichiers XML des écrans
│   │   │   │   ├── drawable/            # Icônes, images, formes
│   │   │   │   ├── menu/                # Menus de navigation
│   │   │   │   ├── navigation/          # Graphe de navigation
│   │   │   │   └── values/
│   │   │   │       ├── strings.xml          # Textes de l'application
│   │   │   │       ├── colors.xml           # Palette de couleurs
│   │   │   │       └── themes.xml           # Thème Material Design 3
│   │   │   └── AndroidManifest.xml  # Déclaration app, permissions
│   │   └── test/ & androidTest/  # Tests unitaires et d'intégration
│   └── build.gradle             # Dépendances et config du module
├── gradle/
│   └── wrapper/                 # Version Gradle fixée
└── build.gradle                 # Config racine du projet
```

### Principes d'architecture (MVVM)

```
┌───────────────────────────────────────────┐
│  Vue (Activity / Fragment)              │
│  Affiche les données, capte les actions │
└──────────────────┬─────────────────────┘
                   │ observe LiveData
┌──────────────────┴─────────────────────┐
│  ViewModel                              │
│  Logique métier, expose LiveData        │
└──────────────────┬─────────────────────┘
                   │ appelle
┌──────────────────┴─────────────────────┐
│  Repository (CamionRepository)          │
│  Coordonne Room (local) et Firestore    │
└─────────┬─────────────────┬─────────────┘
         │                 │
┌────────┴────┐  ┌─────┴─────────┐
│  Room (SQLite) │  │ Firebase Firestore │
│  Hors ligne    │  │ Cloud / Temps réel │
└──────────────┘  └─────────────────┘
```

---

## `backend/` — API REST *(prévu V3)*

> Non développé à ce stade. Voir `backend/README.md` pour la planification.

```
backend/
├── src/
│   ├── api/        # Routes et contrôleurs REST
│   ├── models/     # Schémas de données
│   └── config/     # Variables d'environnement, connexion DB
└── README.md       # Endpoints prévus et choix technologiques
```

---

## `data/` — Modèles et Données

```
data/
├── excel/
│   └── templates/      # Templates .xlsx vierges (planning livraisons)
├── models/
│   └── schema.md       # Schéma de la base de données + diagramme ER
└── README.md           # Dictionnaire des données, formats d'export
```

| Fichier | Contenu |
|---|---|
| `schema.md` | Diagramme ER, tables, types, valeurs énumérées |
| `excel/templates/` | Fichiers `.xlsx` modèles pour import dans l'app |

---

## `docs/` — Documentation

```
docs/
├── processus/
│   └── flux-entree-camion.md   # Procédure d'enregistrement d'un camion
├── logistique/
│   └── guide-agent.md          # Manuel utilisateur pour les agents terrain
└── README.md                   # Index de la documentation
```

| Document | Audience | Statut |
|---|---|---|
| `flux-entree-camion.md` | Responsable logistique | Disponible |
| `guide-agent.md` | Agents terrain | Disponible |
| `architecture.md` | Développeurs | À rédiger |
| `installation.md` | Développeurs | À rédiger |

---

## `.github/` — Templates GitHub

```
.github/
└── ISSUE_TEMPLATE/
    ├── bug_report.md        # Formulaire de signalement de bug
    └── feature_request.md   # Formulaire de demande de fonctionnalité
```

---

## Conventions de nommage

### Branches Git

| Préfixe | Usage | Exemple |
|---|---|---|
| `feature/` | Nouvelle fonctionnalité | `feature/import-excel` |
| `fix/` | Correction de bug | `fix/crash-pointage-sortie` |
| `docs/` | Documentation seule | `docs/guide-agent` |
| `refactor/` | Refactoring sans nouveau comportement | `refactor/room-database` |

### Commits

Format : `type: description courte en français`

| Type | Usage |
|---|---|
| `feat` | Nouvelle fonctionnalité |
| `fix` | Correction de bug |
| `docs` | Documentation |
| `refactor` | Refactoring |
| `test` | Ajout ou modification de tests |
| `chore` | Tâches de maintenance |

### Fichiers Java

- **Activities** : `NomActivity.java`
- **Fragments** : `NomFragment.java`
- **ViewModels** : `NomViewModel.java`
- **DAO** : `NomDao.java`
- **Entités Room** : `Nom.java` (PascalCase, singulier)

---

## Fichiers à ne pas committer

Déjà couverts par `.gitignore` (template Android GitHub) :

```
mobile/app/google-services.json   # Clés Firebase (SECRET)
*.keystore                         # Clés de signature APK
local.properties                   # Chemin SDK Android local
.gradle/ & build/                  # Fichiers générés
data/exports/                      # Exports générés (non versionnés)
```

> **Important** : ne jamais committer `google-services.json`. Chaque développeur le génère depuis la Firebase Console.
