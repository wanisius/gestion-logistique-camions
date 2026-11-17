# MOROCCO IMPORT SIMULATOR

**Académie du commerce international et du dédouanement marocain** : un jeu de gestion pédagogique où le joueur, responsable import, conduit une importation complète vers le Maroc : négociation, Incoterms, engagement d'importation PortNet, domiciliation bancaire, crédit documentaire, classement SH, origine préférentielle, BADR/DUM, calcul des droits, BAD, sortie du port, réception et clôture.

> ⚠️ Simulateur **pédagogique**. Les entreprises, montants, interfaces PortNet/BADR et documents sont **fictifs**. Aucune connexion aux systèmes réels (banques, PortNet, BADR). Chaque règle affiche sa source et un statut de vérification ; vérifier les textes en vigueur avant toute opération réelle.

## Démarrage rapide

| Situation | Action |
|---|---|
| Windows, sans rien installer | Double-cliquer `livrable/MoroccoImportSimulator.html` (fichier unique, fonctionne hors ligne) |
| Windows avec Node.js ≥ 18 | Double-cliquer `Lancer-Simulateur.bat` (installe, construit, ouvre le navigateur) |
| Développement | `npm install` puis `npm run dev` |

Commandes :

```bash
npm install            # dépendances
npm run dev            # serveur de développement (http://localhost:5173)
npm run build          # build web dans dist/
npm run build:standalone  # fichier HTML unique dans dist-standalone/
npm test               # tests (calculs, intégrité du scénario, parties complètes simulées)
npm run export:kb      # régénère docs/BASE-REGLEMENTAIRE.md
```

Android / tablette : servir `dist/` (ou ouvrir le fichier autonome) dans Chrome. L'interface est responsive.

## Contenu jouable (version 0.1)

**Scénario 4 — Canettes en aluminium** (jouable de bout en bout, ~45 étapes) : 4 080 000 canettes, 20 conteneurs 40' HC, trois fournisseurs (Espagne, Turquie, Chine) avec arbitrage coût / délai / origine.

- Phases A à I : préparation commerciale, réglementation, PortNet et domiciliation, expédition, transport, arrivée, dédouanement, contrôle sanitaire (non applicable ici, et le jeu explique pourquoi), sortie et livraison.
- Types d'interaction : décisions, choix multiples, **détection d'anomalies** sur des documents volontairement erronés (pro forma, packing list, B/L), formulaires **PortNet** et **BADR** simulés, **calcul des droits et taxes** par le joueur, scènes animées (carte maritime, port, circuit douanier, camions, entrepôt).
- Conséquences : les anomalies non détectées déclenchent plus loin un rejet bancaire ou un blocage du B/L. Une preuve d'origine absente fait passer au droit commun. Les jours au terminal entraînent des surestaries, et un retard au-delà de l'échéance des pénalités d'arrêt de ligne.
- Incidents aléatoires selon le mode (retard du navire, scellé non conforme, circuit de contrôle).
- **4 modes** : Découverte (indices gratuits), Professionnel (indice payant), Expert (incidents plus fréquents, erreurs plus coûteuses), Examen (aucune correction avant le rapport final).
- HUD : budget, calendrier/échéance, conformité, score. Bureau virtuel avec 12 espaces cliquables, messagerie, tableau de missions.
- Bibliothèque de 28 documents (émetteur, destinataire, utilité, moment, statut, liens), export **PDF** pédagogique.
- **Calculateur** interactif : FOB → CIF → valeur en douane → DI, TPI, TVA → coût de revient rendu usine et unitaire ; Incoterm, change, quantités et frais modifiables.
- Glossaire (43 termes), quiz, historique des erreurs, base réglementaire filtrable, évaluation finale détaillée (PDF).
- Sauvegarde automatique (navigateur), plusieurs parties, export/import de sauvegarde en JSON.

Les scénarios 1, 2, 3 et 5 sont annoncés dans le catalogue et restent **en préparation**.

## Architecture

```
src/
  engine/       types.ts (schéma des scénarios), game.ts (moteur : étapes, effets, score), calc.ts (droits & coûts), store.ts (sauvegardes)
  data/
    scenarios/  canettes.json  ← scénario configurable en JSON + index.ts (catalogue)
    knowledge.ts  base réglementaire sourcée (statut + date par fiche)
    documents.ts  modèles de documents générés depuis l'état de la partie (+ variantes à anomalies)
    glossary.ts, spaces.ts
  components/   StepPlayer (lecteur d'étapes), Calculator, DocViewer (+PDF), WorldMap, Scenes, Widgets
  screens/      Home, GameShell (HUD, bureau, onglets), Panels, Evaluation
```

### Ajouter un scénario
1. Créer `src/data/scenarios/<id>.json` conforme au type `Scenario` (`src/engine/types.ts`) : marchandise, fournisseurs, frais, personnages, étapes.
2. L'enregistrer dans `src/data/scenarios/index.ts` (`SCENARIOS` + `CATALOG`).
3. `npm test` vérifie automatiquement l'intégrité (sources, lieux, acteurs, documents, explications).

Une étape (`steps[]`) a un `type` (`choice`, `multi`, `docCheck`, `form`, `calc`, `scene`), des `options` avec `quality` (`best`/`ok`/`bad`) ou `qualityBy` (selon une variable), des `effects` (jours, coûts, conformité, variables, documents, surestaries), des conditions `requires` et des déclenchements aléatoires `chance` par mode.

### Mettre à jour la réglementation
Modifier uniquement `src/data/knowledge.ts` (fiches) et les taux du JSON du scénario, puis `npm run export:kb`.

## Sources et limites
Voir [`docs/BASE-REGLEMENTAIRE.md`](docs/BASE-REGLEMENTAIRE.md). Points notables :
- **Confirmé (Office des Changes)** : l'engagement d'importation est souscrit sur PortNet et domicilié en banque ; la banque vérifie sa concordance avec le contrat avant domiciliation.
- **À vérifier** : délais d'apurement selon la version de l'IGOC (les sources secondaires divergent), seuils des acomptes, taux DI exacts (les taux du jeu sont **fictifs**), statut ONSSA des emballages au contact alimentaire, exonérations de la TPI.
- Le site de l'Office des Changes n'était pas accessible depuis l'environnement de développement : les fiches s'appuient sur des extraits indexés et des sources secondaires, signalées comme telles.
