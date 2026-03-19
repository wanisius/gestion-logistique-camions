# Roadmap Produit — Gestion Logistique Camions

Feuille de route stratégique du produit sur 3 niveaux de maturité : MVP terrain, déploiement entreprise, et automatisation avancée.

---

## Vue d'ensemble

```
2026 Q2          2026 Q3–Q4            2027+
───────────────────────────────────────────────────────────────
  [MVP]  ────────►  [ENTREPRISE]  ───────►  [AUTOMATISATION]
 Terrain           Multi-sites            IA & Intégrations
```

---

## Phase 1 — MVP *(Minimum Viable Product)*

> **Objectif :** Mettre entre les mains des agents terrain une application fonctionnelle, simple et fiable pour remplacer les registres papier.

**Cible :** 1 site, 1 à 5 agents, usage quotidien
**Livraison estimée :** Q2 2026

---

### Authentification

- [ ] Connexion par email / mot de passe (Firebase Auth)
- [ ] Session persistante (pas de reconnexion à chaque ouverture)
- [ ] Mot de passe oublié par email

### Enregistrement des camions

- [ ] Formulaire d'entrée : immatriculation, chauffeur, type de marchandise
- [ ] Horodatage automatique à l'enregistrement
- [ ] Champ observations libre
- [ ] Statuts : `EN_ATTENTE` → `EN_COURS` → `SORTI`
- [ ] Pointage de sortie avec durée de passage calculée

### Liste et recherche

- [ ] Liste des camions du jour (tri par heure d'entrée)
- [ ] Filtres par statut
- [ ] Recherche par immatriculation ou chauffeur
- [ ] Vue détail d'un camion avec historique des pointages

### Données et export

- [ ] Stockage local Room (fonctionne hors ligne)
- [ ] Synchronisation automatique avec Firebase Firestore
- [ ] Export Excel du rapport journalier (Apache POI)

### Interface

- [ ] Design Material Design 3
- [ ] Compatible Android 7.0+ (API 24)
- [ ] Optimisé pour smartphones et tablettes

### Qualité

- [ ] Gestion des erreurs et messages utilisateur clairs
- [ ] Firebase Crashlytics activé
- [ ] Tests unitaires sur les DAO et ViewModel

---

### Définition de "terminé" pour le MVP

> L'application est considérée MVP lorsqu'un agent peut :
> 1. Se connecter
> 2. Enregistrer un camion entrant en moins de 30 secondes
> 3. Pointer sa sortie
> 4. Exporter le rapport du jour en Excel
> … sans connexion internet, et sans perte de données.

---

## Phase 2 — Version Entreprise

> **Objectif :** Professionnaliser l'outil pour un déploiement à l'échelle de l'entreprise : multi-sites, gestion des utilisateurs, rapports avancés et intégration métier.

**Cible :** 1–10 sites, équipes logistiques, responsables et direction
**Livraison estimée :** Q3–Q4 2026

---

### Gestion multi-sites

- [ ] Chaque site est une entité isolée (données cloisonnées)
- [ ] Un compte peut avoir accès à plusieurs sites
- [ ] Vue consolidée multi-sites pour la direction
- [ ] Paramètres spécifiques par site (nom, adresse, règles)

### Gestion des utilisateurs et rôles

| Rôle | Permissions |
|---|---|
| **Super Admin** | Accès total, gestion des sites et comptes |
| **Responsable** | Accès au site, rapports, gestion des agents |
| **Agent** | Enregistrement et pointage uniquement |
| **Lecteur** | Consultation seule (direction, audit) |

- [ ] Invitation d'agents par email
- [ ] Activation / désactivation de comptes
- [ ] Journal d'activité par utilisateur

### Import Excel (planning livraisons)

- [ ] Import d'un fichier `.xlsx` de planning journalier
- [ ] Correspondance automatique : camion attendu → pré-remplissage formulaire
- [ ] Détection des camions non prévus vs attendus
- [ ] Historique des imports avec statut et nombre de lignes

### Tableau de bord et rapports

- [ ] Dashboard temps réel : camions présents, en attente, sortis
- [ ] Graphiques : flux horaire, types de marchandises, durées moyennes
- [ ] Rapport journalier automatique (Excel + PDF)
- [ ] Rapport hebdomadaire et mensuel
- [ ] Export PDF avec en-tête entreprise personnalisable
- [ ] Envoi automatique du rapport par email (Firebase Functions)

### Notifications

- [ ] Alerte si un camion est en attente depuis plus de X minutes
- [ ] Notification de sortie oubliée (camion toujours "EN_COURS" en fin de journée)
- [ ] Rapport journalier envoyé automatiquement au responsable
- [ ] Notification de connexion d'un nouvel agent

### Améliorations terrain

- [ ] Photo du bon de livraison (Firebase Storage)
- [ ] Mode sombre
- [ ] Signature numérique du chauffeur (optionnel)
- [ ] Impression Bluetooth (bon de passage)
- [ ] Historique complet par camion / immatriculation

---

## Phase 3 — Automatisation Logistique

> **Objectif :** Réduire les saisies manuelles au strict minimum grâce à la reconnaissance automatique, l'intégration aux systèmes métier et l'intelligence logistique.

**Cible :** Entreprises avec fort volume, opérations logistiques complexes
**Livraison estimée :** 2027

---

### Reconnaissance automatique

- [ ] **OCR plaque d'immatriculation** via ML Kit (Google) — lecture automatique depuis la caméra
- [ ] **Scanner QR Code / Code-barres** sur les bons de livraison
- [ ] Identification du camion en moins de 3 secondes — zéro saisie manuelle
- [ ] Correspondance automatique avec le planning importé

### Géolocalisation et suivi GPS

- [ ] Position GPS au moment du pointage (entrée / sortie)
- [ ] Carte des mouvements sur le site
- [ ] Déclenchement automatique du pointage à l'approche d'une zone (geofencing)
- [ ] Suivi de la trajet sur site (optionnel, avec consentement)

### Intégrations systèmes

| Système | Type d'intégration |
|---|---|
| **ERP** (SAP, Sage, Odoo) | Synchronisation commandes et bons de livraison |
| **TMS** (Transport Management) | Import automatique des tournies prévues |
| **WMS** (Warehouse Management) | Notification à l'arrivée d'une livraison |
| **Excel / Google Sheets** | Export automatique vers tableur partagé |
| **Email / Teams / Slack** | Alertes et rapports en temps réel |

- [ ] API REST documentée (OpenAPI / Swagger)
- [ ] Webhooks configurables par événement (entrée, sortie, retard)
- [ ] Connecteur Zapier / Make pour intégrations no-code

### Intelligence logistique

- [ ] **Prédiction des flux** : estimation du nombre de camions attendus selon l'historique
- [ ] **Détection d'anomalies** : camion inconnu, retard anormal, doublon d'immatriculation
- [ ] **Optimisation des quais** : suggestion du quai disponible selon le type de marchandise
- [ ] **Rapport d'efficacité** : taux d'occupation, goulots d'étranglement, temps perdus

### Interface web d'administration

- [ ] Application web React (ou Next.js) + Firebase
- [ ] Tableau de bord consolidé multi-sites en temps réel
- [ ] Gestion des comptes, sites et paramétrages
- [ ] Accès lecture depuis n'importe quel navigateur
- [ ] Impression de rapports depuis le web

### Extension mobile

- [ ] Application iOS (Flutter ou React Native) — mêmes fonctionnalités
- [ ] Montre connectée : notification de pointage sur Wear OS / watchOS
- [ ] Mode kiosque : tablette fixée à l'entrée du site pour les chauffeurs

---

## Résumé des phases

| | MVP | Entreprise | Automatisation |
|---|---|---|---|
| **Sites** | 1 | 1–10 | Illimité |
| **Utilisateurs** | 1–5 agents | Équipes + responsables | Multi-rôles avancés |
| **Saisie** | Manuelle | Semi-assistée (import Excel) | Automatisée (OCR, QR) |
| **Rapports** | Export Excel basique | Excel + PDF auto + email | BI intégrée |
| **Intégrations** | Aucune | Email, notifications | ERP, TMS, WMS, API |
| **Offline** | Oui (Room) | Oui | Oui |
| **Plateforme** | Android | Android | Android + iOS + Web |
| **IA** | Non | Non | OCR, prédictions, anomalies |

---

## Suivi d'avancement

| Phase | Statut | Progression |
|---|---|---|
| MVP | En cours | `█░░░░░░░░░` 10% |
| Entreprise | Planifiée | `░░░░░░░░░░` 0% |
| Automatisation | Planifiée | `░░░░░░░░░░` 0% |

---

*Roadmap sujette à évolution selon les retours terrain et les priorités métier.*
