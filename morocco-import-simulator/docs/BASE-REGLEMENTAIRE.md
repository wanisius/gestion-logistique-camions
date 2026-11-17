# Base de connaissances réglementaires — Morocco Import Simulator

> Fichier généré automatiquement (`npm run export:kb`) depuis `src/data/knowledge.ts`. Ne pas éditer à la main.

Statuts : **Source officielle** · **Sources secondaires — à confirmer** · **À vérifier** · **Hypothèse pédagogique**.

Aucune règle n'est inventée : ce qui n'a pas pu être vérifié est signalé « À vérifier » ou « Hypothèse pédagogique ». Avant toute opération réelle, vérifier les textes en vigueur (ADII/ADIL, Office des Changes/IGOC, PortNet, ONSSA, MCINET).

## Commerce extérieur

### Principe de liberté des importations

*Statut : Sources secondaires — à confirmer — vérifié le 2026-11-17*

Les importations sont libres, sauf marchandises soumises à restriction (licence) ou interdites pour des motifs de sécurité, santé, environnement, etc.

- Le titre d'importation le plus courant est l'engagement d'importation (EI), souscrit sur PortNet.
- Les marchandises figurant sur les listes de restriction nécessitent une licence d’importation délivrée par le département du commerce extérieur.
- Vérifier systématiquement la position tarifaire dans ADIL (rubrique « documents et normes ») pour connaître les restrictions applicables.

**Fondement :** Loi n° 13-89 relative au commerce extérieur et textes d’application (listes de marchandises soumises à restriction).

**Sources :** [Ministère de l'Industrie et du Commerce](https://www.mcinet.gov.ma) · [Office des Changes — Importations de biens](https://www.oc.gov.ma/fr/personnes-morales/importations-de-biens) · [ADII — douane.gov.ma (ADIL, tarif, guides)](https://www.douane.gov.ma)

## Change & banque

### Engagement d'importation et domiciliation bancaire

*Statut : Source officielle — vérifié le 2026-11-17*

L'engagement d'importation, établi conformément à la réglementation du commerce extérieur, doit être souscrit sur PortNet et domicilié auprès d'une banque.

- Toute importation donnant lieu à règlement en devises doit être domiciliée auprès d’une banque intermédiaire agréée, via PortNet, avant le dédouanement.
- Avant de domicilier, la banque s'assure de la concordance entre le contrat commercial / facture pro forma et les informations portées sur l'engagement d'importation.
- La banque transmet à l’Office des Changes les informations relatives aux importations (obligation prévue par l’IGOC — articles 18 et 54 selon la version 2024).
- Le dossier de domiciliation est ensuite apuré par l'imputation des déclarations douanières (DUM) et des règlements.

**Fondement :** IGOC (Office des Changes) — dispositions relatives aux importations de biens ; réglementation du commerce extérieur.

**Sources :** [Office des Changes — Importations de biens](https://www.oc.gov.ma/fr/personnes-morales/importations-de-biens) · [Office des Changes — FAQ engagement d’importation](https://www.oc.gov.ma/fr/faq/la-souscription-et-la-domiciliation-d-un-engagement-d-importation-sont-elles-obligatoires-avant) · [Instruction Générale des Opérations de Change (IGOC) — version en vigueur](https://www.oc.gov.ma)

### Version de l’IGOC et délais d’apurement

*Statut : À vérifier — vérifié le 2026-11-17*

Des sources mentionnent l'IGOC 2024 et une version 2026. Les délais d'apurement et de notification à l'Office des Changes divergent selon les sources secondaires.

- Une source secondaire évoque un délai de 60 jours au-delà duquel la banque informe l’Office des Changes si la marchandise n’est pas dédouanée ; une autre version de la même source indique l’absence de délai.
- Le simulateur n’impose aucun délai légal d’apurement : il signale seulement que le dossier doit être suivi et apuré.

**Fondement :** IGOC en vigueur — à consulter sur oc.gov.ma.

**Sources :** [Instruction Générale des Opérations de Change (IGOC) — version en vigueur](https://www.oc.gov.ma) · [Upsilon Consulting — Importation de biens au Maroc (secondaire)](https://upsilon-consulting.com/importation-de-biens-change-maroc/)

### Modes de règlement international

*Statut : Sources secondaires — à confirmer — vérifié le 2026-11-17*

Virement (simple, sans garantie), remise documentaire (documents contre paiement ou acceptation), crédit documentaire (engagement bancaire irrévocable de payer contre documents conformes).

- Virement : le plus simple et le moins cher, mais aucune garantie ni pour l'acheteur s'il paie d'avance, ni pour le vendeur s'il expédie avant paiement.
- Remise documentaire (D/P ou D/A) : les banques transmettent les documents, sans engagement de payer. Régie par les RUE/URC 522 de la CCI.
- Crédit documentaire : la banque émettrice s’engage à payer si des documents conformes sont présentés dans les délais. Régi par les RUU/UCP 600 de la CCI. Plus sûr, plus coûteux, très formaliste.
- Les acomptes / paiements anticipés sont encadrés par l’IGOC (conditions et justificatifs). Les seuils exacts doivent être vérifiés dans la version en vigueur.

**Fondement :** CCI : RUU 600 (UCP 600), RUE 522 (URC 522). IGOC pour les conditions de règlement des importations.

**Sources :** [Instruction Générale des Opérations de Change (IGOC) — version en vigueur](https://www.oc.gov.ma) · [ICC — UCP 600 / URC 522](https://iccwbo.org)

## Portuaire

### PortNet — guichet unique du commerce extérieur

*Statut : Sources secondaires — à confirmer — vérifié le 2026-11-17*

PortNet dématérialise les titres d’importation, la domiciliation, les échanges avec les organismes de contrôle, le bon à délivrer et l’enlèvement.

- Le bon à délivrer (BAD) est dématérialisé et échangé via PortNet depuis 2020 (agents maritimes, transitaires, exploitants de MEAD).
- Une solution PortNet de formalités d’enlèvement a été déployée à partir de 2022 (prise de rendez-vous déclarant / transporteur).
- Le module « Visite et contrôle » gère la fiche suiveuse : proposition de date par le déclarant, validation par la douane, résultat du contrôle.

**Fondement :** Circulaires ADII et guides utilisateurs PortNet.

**Sources :** [PortNet — guichet unique national](https://www.portnet.ma) · [PortNet — Guide déclarant et transitaire](https://www.portnet.ma/documents/d/guichet-unique/declarant-et-transitaire) · [Médias24 — BAD électronique (2020, 2022)](https://medias24.com/2020/01/24/portnet-la-gestion-electronique-du-bon-a-delivrer-entre-en-vigueur-le-3-fevrier/)

### Manifeste, déclaration sommaire et bon à délivrer

*Statut : Sources secondaires — à confirmer — vérifié le 2026-11-17*

Le transporteur/agent maritime dépose le manifeste (déclaration sommaire) ; le bon à délivrer est émis par l'agent maritime au destinataire (ou son transitaire) après remise du connaissement original ou levée des conditions (fret payé, garanties).

- Le BAD électronique est échangé via PortNet et ses données remontent vers BADR.

**Fondement :** CDII ; circulaires ADII sur la dématérialisation du BAD.

**Sources :** [PortNet — guichet unique national](https://www.portnet.ma)

## Douane

### BADR et Déclaration Unique de Marchandises (DUM)

*Statut : Sources secondaires — à confirmer — vérifié le 2026-11-17*

Le dédouanement est réalisé sur BADR (Base Automatisée des Douanes en Réseau). La DUM est déposée par un déclarant (transitaire agréé ou importateur habilité), signée électroniquement puis enregistrée.

- Après enregistrement, la déclaration est orientée vers un circuit de contrôle (sans contrôle, contrôle documentaire, visite physique). Les critères de sélection relèvent de l’analyse de risque de l’ADII et ne sont pas publics : le jeu les tire au hasard.
- Le devis des droits et taxes, la consultation du circuit et l’édition de la mainlevée sont accessibles en ligne ; la mainlevée s’obtient à distance sauf vérification physique.
- L’interface du simulateur est pédagogique et ne reproduit pas l’interface officielle.

**Fondement :** Code des douanes et impôts indirects (CDII) — dispositions relatives à la déclaration en détail ; circulaires ADII.

**Sources :** [ADII — douane.gov.ma (ADIL, tarif, guides)](https://www.douane.gov.ma) · [Casainvest — Procédure de dédouanement en ligne](https://casainvest.ma/sites/default/files/translations/Publications/Proc%C3%A9dure%20de%20d%C3%A9douanement%20en%20ligne.pdf)

### Régime de mise à la consommation

*Statut : Sources secondaires — à confirmer — vérifié le 2026-11-17*

Pour des marchandises destinées à rester définitivement au Maroc et à être utilisées par l’entreprise, le régime normal est la mise à la consommation (paiement des droits et taxes).

- Les régimes économiques (admission temporaire pour perfectionnement actif, entrepôt, etc.) permettent la suspension des droits sous conditions — ils ne sont pas couverts par le scénario 4.
- Le code régime exact à porter sur la DUM doit être vérifié dans la nomenclature des régimes BADR.

**Fondement :** CDII — titres relatifs aux régimes douaniers.

**Sources :** [ADII — douane.gov.ma (ADIL, tarif, guides)](https://www.douane.gov.ma)

### Valeur en douane

*Statut : Sources secondaires — à confirmer — vérifié le 2026-11-17*

La valeur en douane repose sur la valeur transactionnelle (prix effectivement payé ou à payer), ajustée des frais de transport et d’assurance jusqu’au point d’entrée au Maroc — base dite « CIF ».

- Méthode inspirée de l’Accord de l’OMC sur l’évaluation en douane (article VII du GATT).
- Si l’Incoterm est EXW/FCA/FOB, il faut ajouter le fret et l’assurance réellement supportés ; en CFR, ajouter l’assurance ; en CIF, le prix les inclut déjà.
- Les frais postérieurs à l’importation (transport national) sont exclus s’ils sont distincts.

**Fondement :** CDII — articles relatifs à la valeur en douane ; Accord OMC sur l’évaluation.

**Sources :** [ADII — douane.gov.ma (ADIL, tarif, guides)](https://www.douane.gov.ma) · [OMC — Accord sur l’évaluation en douane](https://www.wto.org/french/tratop_f/cusval_f/cusval_f.htm)

### Classement tarifaire (SH) des canettes en aluminium

*Statut : Sources secondaires — à confirmer — vérifié le 2026-11-17*

Les boîtes et récipients similaires en aluminium d’une contenance ≤ 300 litres relèvent de la position SH 76.12 ; les canettes vides se classent en principe en 7612.90.

- Règles générales interprétatives (RGI) 1 et 6 : classement selon le libellé des positions puis des sous-positions.
- Ne pas confondre avec 76.06 (tôles et bandes en aluminium, matière première), 76.15 (articles de ménage) ou 83.09 (bouchons, couvercles et capsules — les couvercles livrés séparément peuvent relever de cette position).
- La sous-position nationale à 10 chiffres utilisée dans le jeu (7612.90.00.90) est FICTIVE : à rechercher dans ADIL.

**Fondement :** Système harmonisé (OMD) — RGI ; tarif marocain.

**Sources :** [ADII — douane.gov.ma (ADIL, tarif, guides)](https://www.douane.gov.ma) · [OMD — Nomenclature du SH](https://www.wcoomd.org)

## Fiscalité

### TVA à l’importation

*Statut : Sources secondaires — à confirmer — vérifié le 2026-11-17*

Taux normal 20 % (taux réduits pour certains produits). Assiette retenue dans le jeu : valeur en douane + DI + TPI.

- Les sources secondaires concordent sur le taux normal de 20 % ; l’assiette exacte (« valeur en douane majorée des droits et taxes ») est à confirmer dans le Code général des impôts / CDII.
- Pour une entreprise assujettie, la TVA payée à l'import est en principe déductible : c'est un décaissement de trésorerie mais pas un coût de revient.

**Fondement :** Code général des impôts (TVA à l’importation, perçue par l’ADII).

**Sources :** [ADII — douane.gov.ma (ADIL, tarif, guides)](https://www.douane.gov.ma) · [JETRO — Morocco trade rules](https://www.jetro.go.jp/world/africa/ma/trade_03.html) · [PwC Tax Summaries — Morocco other taxes](https://taxsummaries.pwc.com/Morocco/Corporate/Other-taxes)

### Taxe parafiscale à l’importation (TPI)

*Statut : Sources secondaires — à confirmer — vérifié le 2026-11-17*

Taxe ad valorem de 0,25 % de la valeur en douane, avec des exceptions.

- Les exonérations (selon origine, régime ou produit) doivent être vérifiées dans ADIL et la loi de finances en vigueur : le jeu applique 0,25 % à toutes les origines.

**Fondement :** Loi de finances ayant institué la TPI — à vérifier.

**Sources :** [JETRO — Morocco trade rules](https://www.jetro.go.jp/world/africa/ma/trade_03.html) · [GTAI — Zollbericht Marokko](https://www.gtai.de/de/trade/marokko/zoll/einfuhrabgaben-649300)

### Taux du droit d'importation (DI)

*Statut : Hypothèse pédagogique — vérifié le 2026-11-17*

Le taux de DI dépend de la position tarifaire à 10 chiffres et de l’origine. Les taux affichés dans le jeu sont FICTIFS sauf mention contraire.

- Consulter ADIL (douane.gov.ma) pour la position exacte et le taux de droit commun, ainsi que les taux préférentiels par accord.
- Scénario 4 : 0 % pour l'origine UE prouvée (démantèlement des produits industriels dans l'accord d'association — à vérifier), 17,5 % fictif pour le droit commun.

**Fondement :** Tarif des droits de douane (loi de finances) ; accords préférentiels.

**Sources :** [ADII — douane.gov.ma (ADIL, tarif, guides)](https://www.douane.gov.ma)

## Origine

### Origine préférentielle UE — Accord d’association Maroc-UE

*Statut : Sources secondaires — à confirmer — vérifié le 2026-11-17*

Accord d’association signé le 26/02/1996, en vigueur le 01/03/2000. La preuve d’origine peut être un EUR.1/EUR-MED ou une déclaration d’origine sur facture.

- La déclaration sur facture peut être faite par un exportateur agréé, ou par tout exportateur pour des envois de faible valeur (seuil de l'ordre de 6 000 € selon les accords — seuil exact à vérifier dans le protocole n° 4).
- Sans preuve d’origine valable, le droit commun s’applique.
- Un échange de lettres récent modifie les protocoles n° 1 et n° 4 ; vérifier les conséquences éventuelles avant toute opération réelle.

**Fondement :** Accord d’association Maroc-UE, protocole n° 4 (règles d’origine) ; convention pan-euro-méditerranéenne.

**Sources :** [Douane française — accords préférentiels de l’UE](https://www.douane.gouv.fr/fiche/liste-des-accords-et-preferences-unilaterales-de-lunion-europeenne) · [Douane française — exportateur agréé](https://www.douane.gouv.fr/articles/a10831-devenir-exportateur-agree-et-certifier-l-origine-sur-un-document-commercial)

### Origine Turquie — ALE Maroc-Turquie

*Statut : À vérifier — vérifié le 2026-11-17*

L'accord de libre-échange Maroc-Turquie prévoit des préférences sous preuve d'origine (EUR.1) ; il a été amendé (droits additionnels sur certains produits industriels).

- Le jeu applique un taux FICTIF de 0 % avec EUR.1 — à vérifier impérativement dans ADIL pour la position concernée.

**Fondement :** ALE Maroc-Turquie et avenants.

**Sources :** [ADII — douane.gov.ma (ADIL, tarif, guides)](https://www.douane.gov.ma)

### Origine Chine — droit commun

*Statut : Sources secondaires — à confirmer — vérifié le 2026-11-17*

Le Maroc n'a pas d'accord tarifaire préférentiel avec la Chine : le droit commun s’applique. Un certificat d’origine non préférentiel peut être demandé (antidumping, statistiques, exigences contractuelles).

- Vérifier dans ADIL l'existence éventuelle de mesures de défense commerciale sur la position.

**Fondement :** Tarif des droits de douane.

**Sources :** [ADII — douane.gov.ma (ADIL, tarif, guides)](https://www.douane.gov.ma)

## Conformité & SPS

### Contrôle de conformité des produits industriels

*Statut : À vérifier — vérifié le 2026-11-17*

Certains produits industriels figurent sur des listes soumises à contrôle de conformité à l'importation (sécurité des produits). La liste doit être vérifiée pour chaque produit.

- Le jeu suppose que les canettes vides destinées à une industrie ne figurent pas sur la liste : HYPOTHÈSE à vérifier auprès du MCINET.

**Fondement :** Loi n° 24-09 relative à la sécurité des produits et des services et textes d’application ; normes IMANOR.

**Sources :** [Ministère de l'Industrie et du Commerce](https://www.mcinet.gov.ma) · [IMANOR](https://www.imanor.gov.ma)

### Emballages au contact des denrées alimentaires

*Statut : Hypothèse pédagogique — vérifié le 2026-11-17*

Aucune procédure ONSSA d'importation spécifique aux canettes vides n'a pu être vérifiée. Le jeu n'impose donc pas de contrôle ONSSA ; il exige une déclaration de conformité « contact alimentaire » comme EXIGENCE CONTRACTUELLE du client industriel.

- Dans l'UE, le règlement (CE) n° 1935/2004 encadre les matériaux au contact des aliments ; les fabricants européens délivrent une déclaration de conformité.
- Avant une opération réelle, interroger l'ONSSA sur le statut des matériaux de contact alimentaire importés.

**Fondement :** Loi n° 28-07 relative à la sécurité sanitaire des produits alimentaires (champ d’application à vérifier) — hypothèse pédagogique.

**Sources :** [ONSSA — contrôles à l’importation](https://www.onssa.gov.ma) · [Règlement (CE) 1935/2004](https://eur-lex.europa.eu/eli/reg/2004/1935/oj)

### Contrôles ONSSA à l’importation

*Statut : Sources secondaires — à confirmer — vérifié le 2026-11-17*

L'ONSSA contrôle à l'importation les produits alimentaires, animaux, végétaux et produits d'origine animale/végétale : contrôle documentaire, d'identité, physique, prélèvements et analyses.

- Décisions possibles selon le résultat : admission, mise en conformité, refoulement ou destruction, dans les cas prévus par la réglementation.
- Ne pas imposer de contrôle ONSSA à des marchandises hors de son champ (ex. ordinateurs).

**Fondement :** Loi n° 25-08 (création de l’ONSSA) ; loi n° 28-07 ; textes d’application.

**Sources :** [ONSSA — contrôles à l’importation](https://www.onssa.gov.ma)

## Incoterms

### Incoterms® 2020

*Statut : Source officielle — vérifié le 2026-11-17*

11 règles CCI répartissant frais, risques et formalités. Pour le maritime conteneurisé, la CCI recommande FCA/CPT/CIP plutôt que FOB/CFR/CIF (le transfert des risques à bord est inadapté au conteneur remis au terminal).

- EXW : l'acheteur gère les formalités d'exportation — délicat pour un importateur marocain.
- CIF : l’assurance minimale exigée est la couverture ICC (C) ; CIP exige ICC (A).
- DDP : le vendeur dédouane à l'importation — pratiquement inapplicable au Maroc pour un vendeur étranger (déclarant, domiciliation, paiement des taxes).

**Fondement :** Publication CCI Incoterms® 2020 (n° 723).

**Sources :** [ICC — Incoterms® 2020](https://iccwbo.org/business-solutions/incoterms-rules/)

## Logistique

### Franchise, surestaries et détention

*Statut : Hypothèse pédagogique — vérifié le 2026-11-17*

Surestaries (demurrage) : conteneur plein au terminal au-delà de la franchise. Détention : conteneur hors terminal au-delà de la franchise de restitution. Montants contractuels, fixés par l'armateur et le terminal.

- Le jeu utilise une franchise fictive de 7 jours et un tarif fictif par conteneur et par jour.

**Fondement :** Conditions contractuelles de l’armateur et tarifs de l’exploitant portuaire.

### Traçabilité : lots, SSCC et scellés

*Statut : Source officielle — vérifié le 2026-11-17*

Le SSCC (GS1, 18 chiffres) identifie chaque unité logistique (palette). Le numéro de scellé est reporté sur le B/L et la packing list et contrôlé à l’arrivée.

- Un écart de numéro de scellé impose des réserves et une vérification contradictoire avant ouverture.

**Fondement :** Standards GS1 ; pratiques du transport maritime.

**Sources :** [GS1 — SSCC](https://www.gs1.org/standards/id-keys/sscc)

### Réserves à la livraison et assurance

*Statut : À vérifier — vérifié le 2026-11-17*

En cas de dommage ou de manquant, les réserves doivent être précises, écrites et notifiées dans les délais du contrat de transport et de la police d’assurance pour préserver les recours.

- Délais : selon la convention applicable (Règles de Hambourg/La Haye-Visby pour le maritime, CMR pour la route) et la police — à vérifier au cas par cas.

**Fondement :** Conventions internationales de transport ; Code de commerce maritime.

### Données fictives du scénario

*Statut : Hypothèse pédagogique — vérifié le 2026-11-17*

Entreprises, prix, taux de change, tarifs portuaires, honoraires et pénalités sont fictifs mais réalistes. Aucune connexion aux systèmes réels (banques, BADR, PortNet).

- Taux de change indicatifs : utiliser le cours de Bank Al-Maghrib / de la banque au jour de l’opération.

**Fondement :** —

