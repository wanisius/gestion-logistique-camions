# Schéma de Base de Données

## Diagramme ER simplifié

```
┌─────────────────────┐         ┌──────────────────────┐
│       CAMIONS       │         │      POINTAGES        │
├─────────────────────┤         ├──────────────────────┤
│ PK  id              │◄────────│ FK  camionId          │
│     immatriculation │    1..n │ PK  id                │
│     chauffeur       │         │     typePointage      │
│     typeMarchandise │         │     dateHeure         │
│     heureEntree     │         │     agent             │
│     heureSortie     │         │     commentaire       │
│     statut          │         └──────────────────────┘
│     observations    │
└─────────────────────┘
```

## Valeurs énumérées

### statut (Camion)
- `EN_ATTENTE` — Camion arrivé, en attente de traitement
- `EN_COURS` — Chargement/déchargement en cours
- `SORTI` — Camion sorti du site

### typePointage (Pointage)
- `ENTREE` — Pointage d'entrée sur le site
- `SORTIE` — Pointage de sortie du site

## Version

Version DB : **1** (Room schema version)
