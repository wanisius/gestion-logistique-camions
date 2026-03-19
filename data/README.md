# Module Data — Modèles et Fichiers de Données

Ce dossier contient les modèles de données, fichiers Excel de référence et templates utilisés par l'application.

## Structure

```
data/
├── excel/
│   ├── templates/       # Templates Excel vierges
│   ├── exports/         # Exports générés (non versionnés)
│   └── historique/      # Données historiques de référence
├── models/
│   ├── schema.md        # Schéma de la base de données
│   └── dictionnaire.md  # Dictionnaire des données
└── README.md
```

## Modèle de données

### Table `camions`

| Champ            | Type     | Description                        |
|------------------|----------|------------------------------------|
| id               | INTEGER  | Identifiant unique (auto)          |
| immatriculation  | TEXT     | Numéro de plaque du véhicule       |
| chauffeur        | TEXT     | Nom complet du chauffeur           |
| typeMarchandise  | TEXT     | Nature de la cargaison             |
| heureEntree      | DATETIME | Horodatage d'entrée sur site       |
| heureSortie      | DATETIME | Horodatage de sortie du site       |
| statut           | TEXT     | EN_ATTENTE / EN_COURS / SORTI      |
| observations     | TEXT     | Notes libres                       |

### Table `pointages`

| Champ        | Type     | Description                         |
|--------------|----------|-------------------------------------|
| id           | INTEGER  | Identifiant unique (auto)           |
| camionId     | INTEGER  | FK → camions.id                     |
| typePointage | TEXT     | ENTREE ou SORTIE                    |
| dateHeure    | DATETIME | Horodatage du pointage              |
| agent        | TEXT     | Nom de l'agent logistique           |
| commentaire  | TEXT     | Observations au moment du pointage  |

## Formats d'export

- **Excel (.xlsx)** : rapport journalier/hebdomadaire
- **PDF** : bon de livraison, fiche de passage
- **CSV** : export brut pour analyse
