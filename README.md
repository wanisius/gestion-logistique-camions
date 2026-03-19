# 🚛 Gestion Logistique Camions

> Application Android de gestion des entrées/sorties de camions, pointage agents et suivi logistique en temps réel.

![Platform](https://img.shields.io/badge/Platform-Android%206.0+-green?logo=android)
![Language](https://img.shields.io/badge/Language-Java-orange?logo=java)
![Backend](https://img.shields.io/badge/Backend-Firebase-yellow?logo=firebase)
![Status](https://img.shields.io/badge/Status-V1%20En%20cours-blue)
![License](https://img.shields.io/badge/License-MIT-lightgrey)

---

## Table des matières

- [Description](#description)
- [Fonctionnalités](#fonctionnalités)
- [Stack technique](#stack-technique)
- [Architecture](#architecture)
- [Installation](#installation)
- [Roadmap](#roadmap)
- [Contribuer](#contribuer)
- [Licence](#licence)

---

## Description

**Gestion Logistique Camions** est une application Android conçue pour les agents logistiques sur site industriel ou entrepôt. Elle permet de :

- Enregistrer chaque camion à son **entrée et sa sortie** avec horodatage automatique
- **Pointer les chauffeurs** et identifier les véhicules par immatriculation
- **Importer des données** depuis des fichiers Excel (planning de livraisons)
- **Suivre en temps réel** les camions présents sur le site
- **Exporter des rapports** journaliers et hebdomadaires

L'application fonctionne **hors ligne** grâce à une base de données locale (Room) et se synchronise automatiquement avec Firebase dès qu'une connexion est disponible.

---

## Fonctionnalités

### Pointage Camion

| Fonctionnalité | Description |
|---|---|
| Enregistrement entrée | Saisie de la plaque, du chauffeur, du type de marchandise avec horodatage auto |
| Pointage sortie | Clôture de la fiche camion avec durée calculée automatiquement |
| Identification rapide | Recherche par immatriculation ou nom de chauffeur |
| Statuts en temps réel | EN_ATTENTE → EN_COURS → SORTI |
| Observations libres | Champ notes pour signaler incidents ou remarques |
| Photo optionnelle | Capture de la plaque ou du bon de livraison (V2) |

### Import Excel

| Fonctionnalité | Description |
|---|---|
| Import planning | Chargement d'un fichier `.xlsx` contenant les livraisons prévues |
| Pré-remplissage auto | Les champs sont pré-remplis dès qu'un camion prévu se présente |
| Validation des données | Détection des doublons et des champs obligatoires manquants |
| Historique imports | Journal des fichiers importés avec date et nombre de lignes |

### Suivi Logistique

| Fonctionnalité | Description |
|---|---|
| Tableau de bord | Vue temps réel : camions présents, en attente, sortis aujourd'hui |
| Chronologie | Liste chronologique de tous les mouvements de la journée |
| Statistiques | Temps moyen de passage, pics d'activité, camions par type |
| Export rapports | Génération Excel/PDF du rapport journalier ou sur période |
| Synchronisation cloud | Données sauvegardées sur Firebase Firestore (mode connecté) |
| Notifications | Alertes pour camions en attente trop longtemps (V2) |

---

## Stack Technique

### Application Mobile

| Composant | Technologie | Rôle |
|---|---|---|
| Langage | **Java** | Développement Android natif |
| UI | **XML Layouts + Material Design 3** | Interfaces utilisateur |
| Architecture | **MVVM** (ViewModel + LiveData) | Séparation logique / UI |
| Base locale | **Room (SQLite)** | Stockage hors ligne |
| Navigation | **Navigation Component** | Gestion des écrans |
| Async | **ExecutorService / LiveData** | Opérations en arrière-plan |

### Firebase (Backend Cloud)

| Service Firebase | Utilisation |
|---|---|
| **Firebase Firestore** | Stockage cloud des données camions et pointages |
| **Firebase Auth** | Authentification des agents (email/mot de passe) |
| **Firebase Storage** | Stockage des photos de bons de livraison |
| **Firebase Analytics** | Suivi d'usage et comportement utilisateur |
| **Firebase Crashlytics** | Détection et rapport des crashs en production |
| **Firebase Cloud Messaging** | Notifications push vers les agents |

### Librairies Android

```gradle
// Room - Base de données locale
implementation "androidx.room:room-runtime:2.6.1"

// Firebase
implementation platform('com.google.firebase:firebase-bom:33.0.0')
implementation 'com.google.firebase:firebase-firestore'
implementation 'com.google.firebase:firebase-auth'
implementation 'com.google.firebase:firebase-storage'
implementation 'com.google.firebase:firebase-analytics'
implementation 'com.google.firebase:firebase-crashlytics'

// Apache POI - Import/Export Excel
implementation 'org.apache.poi:poi-ooxml:5.2.3'

// Glide - Chargement d'images
implementation 'com.github.bumptech.glide:glide:4.16.0'

// MPAndroidChart - Graphiques tableau de bord
implementation 'com.github.PhilJay:MPAndroidChart:v3.1.0'
```

---

## Architecture

```
com.logistique.camions/
├── activities/         # Écrans principaux (Login, Dashboard, Détail)
├── fragments/          # Composants UI réutilisables
├── viewmodels/         # Logique métier + LiveData
├── models/             # Entités (Camion, Pointage, Agent)
├── database/
│   ├── local/          # Room DAO + AppDatabase
│   └── remote/         # Firebase Firestore Repository
├── repository/         # Source unique de vérité (local + cloud)
├── adapters/           # RecyclerView adapters
├── utils/
│   ├── ExcelHelper.java     # Import/Export Excel
│   ├── PdfGenerator.java    # Génération rapports PDF
│   └── DateUtils.java       # Formatage dates
└── MainActivity.java
```

**Flux de données :**
```
UI (Fragment/Activity)
  ↕ observe / action
ViewModel (LiveData)
  ↕ appel
Repository
  ↕               ↕
Room (local)   Firestore (cloud)
```

---

## Installation

### Prérequis

- Android Studio Hedgehog (2023.1.1) ou supérieur
- Android SDK 24 (Android 7.0) minimum
- Compte Firebase (gratuit)
- Java 11

### Étapes

```bash
# 1. Cloner le dépôt
git clone https://github.com/wanisius/gestion-logistique-camions.git
cd gestion-logistique-camions

# 2. Ouvrir le projet Android
# Android Studio > File > Open > dossier mobile/
```

**Configurer Firebase :**

1. Créer un projet sur [Firebase Console](https://console.firebase.google.com)
2. Ajouter une application Android avec le package `com.logistique.camions`
3. Télécharger `google-services.json` et le placer dans `mobile/app/`
4. Activer **Firestore**, **Authentication** et **Storage** dans la console

```bash
# 3. Synchroniser Gradle et lancer
# Build > Make Project puis Run
```

---

## Roadmap

### V1 — MVP Fonctionnel *(Q2 2026)*

> Objectif : application utilisable en production sur un seul site

- [x] Initialisation du projet et structure
- [ ] Écran d'authentification (Firebase Auth)
- [ ] Formulaire d'enregistrement d'un camion entrant
- [ ] Pointage de sortie avec durée calculée
- [ ] Liste des camions du jour avec filtres (statut, heure)
- [ ] Base de données Room (offline first)
- [ ] Synchronisation Firestore en temps réel
- [ ] Export Excel du rapport journalier (Apache POI)
- [ ] Interface Material Design 3 responsive

### V2 — Enrichissement *(Q3 2026)*

> Objectif : améliorer la productivité des agents et la traçabilité

- [ ] Import fichier Excel (planning de livraisons)
- [ ] Pré-remplissage automatique des fiches
- [ ] Tableau de bord avec graphiques (MPAndroidChart)
- [ ] Notifications push (camions en attente > 30 min)
- [ ] Photo du bon de livraison (Firebase Storage)
- [ ] Gestion multi-agents avec rôles (Admin / Agent)
- [ ] Génération rapport PDF (iText)
- [ ] Mode sombre

### V3 — Avancé *(Q4 2026 — 2027)*

> Objectif : automatisation et intégration système

- [ ] Scanner QR Code / Code-barres
- [ ] Reconnaissance de plaque (OCR via ML Kit)
- [ ] Gestion multi-sites
- [ ] Interface web d'administration (React + Firebase)
- [ ] API REST pour intégration ERP
- [ ] Analytics avancés et tableaux de bord personnalisables
- [ ] Archivage automatique et purge des données
- [ ] Application iOS (Flutter ou React Native)

---

## Structure du projet

```
gestion-logistique-camions/
├── mobile/          # Application Android (Java + Firebase)
├── backend/         # API REST future (Phase V3)
├── data/            # Fichiers Excel, modèles, schéma BD
├── docs/            # Documentation processus et logistique
└── README.md
```

---

## Contribuer

1. Forker le projet
2. Créer une branche : `git checkout -b feature/ma-fonctionnalite`
3. Committer : `git commit -m 'feat: description de la fonctionnalité'`
4. Pousser : `git push origin feature/ma-fonctionnalite`
5. Ouvrir une **Pull Request**

> Consulter les [issues ouvertes](https://github.com/wanisius/gestion-logistique-camions/issues) pour contribuer.

---

## Licence

Ce projet est sous licence **MIT** — libre d'utilisation, modification et distribution.

---

*Développé pour optimiser la gestion logistique terrain.*
