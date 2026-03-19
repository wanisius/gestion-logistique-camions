# Flux : Entrée d'un Camion sur Site

## Objectif

Décrire le processus complet depuis l'arrivée d'un camion jusqu'à son enregistrement dans le système.

## Étapes du processus

```
1. ARRIVÉE DU CAMION
   └── Le camion se présente à la barrière d'entrée

2. IDENTIFICATION
   ├── Lecture de la plaque d'immatriculation
   ├── Vérification de l'identité du chauffeur
   └── Contrôle du bon de livraison

3. ENREGISTREMENT DANS L'APPLICATION
   ├── Saisie de l'immatriculation
   ├── Saisie du nom du chauffeur
   ├── Sélection du type de marchandise
   └── Horodatage automatique de l'entrée

4. ORIENTATION
   ├── Attribution d'un quai de chargement/déchargement
   └── Mise à jour du statut → EN_COURS

5. CONFIRMATION
   └── Pointage ENTRÉE enregistré avec nom de l'agent
```

## Données saisies

| Champ | Obligatoire | Source |
|---|---|---|
| Immatriculation | Oui | Visuel / BL |
| Chauffeur | Oui | Pièce d'identité |
| Type marchandise | Oui | Bon de livraison |
| Quai attribué | Non | Disponibilité |
| Observations | Non | Libre |

## Cas particuliers

- **Camion sans rendez-vous** : signaler au responsable avant enregistrement
- **Document manquant** : enregistrer avec statut EN_ATTENTE et observation
- **Incident à l'entrée** : consulter `gestion-incidents.md`
