# Gestion Logistique Camions

> Application Android de gestion des entrées camions, pointage et suivi logistique

![Platform](https://img.shields.io/badge/Platform-Android-green)
![Language](https://img.shields.io/badge/Language-Java-orange)
![Status](https://img.shields.io/badge/Status-En%20développement-blue)

---

## Structure du projet

```
gestion-logistique-camions/
├── mobile/          # Application Android (Java)
├── backend/         # API REST (développement futur)
├── data/            # Fichiers Excel, modèles de données
├── docs/            # Documentation processus & logistique
└── README.md
```

---

## Description

Système complet de gestion logistique permettant :
- **Enregistrement** des entrées/sorties de camions sur site
- **Pointage** des chauffeurs et identification des véhicules
- **Suivi en temps réel** des mouvements et livraisons
- **Rapports & exports** pour le service logistique

---

## Stack Technique

| Composant | Technologie |
|---|---|
| Application mobile | Android (Java) |
| Base de données locale | SQLite / Room |
| API future | REST (à définir) |
| Authentification | JWT (prévu) |
| Exports | Excel / PDF |

---

## Feuille de route (Roadmap)

### Phase 1 — MVP Mobile (Q2 2026)
- [x] Initialisation du dépôt et structure du projet
- [ ] Interface d'enregistrement des camions
- [ ] Module de pointage chauffeur
- [ ] Base de données locale (Room)
- [ ] Export des données en Excel

### Phase 2 — Consolidation (Q3 2026)
- [ ] Tableau de bord avec statistiques
- [ ] Notifications et alertes
- [ ] Synchronisation des données hors-ligne
- [ ] Rapports PDF automatiques
- [ ] Gestion des utilisateurs et rôles

### Phase 3 — Backend & API (Q4 2026)
- [ ] Développement de l'API REST
- [ ] Synchronisation mobile ↔ serveur
- [ ] Interface web d'administration
- [ ] Archivage et historique

### Phase 4 — Avancé (2027)
- [ ] Intégration GPS/géolocalisation
- [ ] Scanner QR Code / plaque immatriculation
- [ ] Analytics et tableaux de bord avancés
- [ ] Application multi-sites

---

## Installation

```bash
# Cloner le dépôt
git clone https://github.com/wanisius/gestion-logistique-camions.git
cd gestion-logistique-camions

# Ouvrir le module mobile dans Android Studio
# File > Open > sélectionner le dossier mobile/
```

---

## Contribution

1. Créer une branche : `git checkout -b feature/nom-fonctionnalite`
2. Committer les changements : `git commit -m 'feat: description'`
3. Pousser : `git push origin feature/nom-fonctionnalite`
4. Ouvrir une Pull Request

---

## Licence

Ce projet est sous licence MIT — voir [LICENSE](LICENSE) pour les détails.
