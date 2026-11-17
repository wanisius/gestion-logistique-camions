// Base de connaissances réglementaires du simulateur.
// Chaque fiche indique sa source, son fondement juridique, la date de dernière vérification et un STATUT :
//   'officiel'   : confirmé par une source officielle consultée (ou citée par celle-ci)
//   'secondaire' : convergence de sources secondaires sérieuses ; à confirmer sur la source officielle
//   'a-verifier' : information non vérifiable à la date indiquée, signalée comme telle
//   'hypothese'  : hypothèse pédagogique explicite utilisée par le jeu (donnée fictive)
// Pour mettre à jour la réglementation : modifier uniquement ce fichier et le JSON du scénario.

export type KStatus = 'officiel' | 'secondaire' | 'a-verifier' | 'hypothese';

export interface KSource { name: string; url?: string }

export interface KnowledgeEntry {
  id: string;
  theme: 'Commerce extérieur' | 'Change & banque' | 'Douane' | 'Fiscalité' | 'Origine' | 'Conformité & SPS' | 'Logistique' | 'Incoterms' | 'Portuaire';
  title: string;
  summary: string;
  details: string[];
  legalBasis: string;
  sources: KSource[];
  checked: string; // date de dernière vérification
  status: KStatus;
}

export const STATUS_LABEL: Record<KStatus, { label: string; color: string }> = {
  officiel: { label: 'Source officielle', color: 'bg-emerald-600' },
  secondaire: { label: 'Sources secondaires — à confirmer', color: 'bg-sky-600' },
  'a-verifier': { label: 'À vérifier', color: 'bg-amber-600' },
  hypothese: { label: 'Hypothèse pédagogique', color: 'bg-fuchsia-700' },
};

const OC = { name: 'Office des Changes — Importations de biens', url: 'https://www.oc.gov.ma/fr/personnes-morales/importations-de-biens' };
const OC_FAQ = { name: 'Office des Changes — FAQ engagement d’importation', url: 'https://www.oc.gov.ma/fr/faq/la-souscription-et-la-domiciliation-d-un-engagement-d-importation-sont-elles-obligatoires-avant' };
const IGOC = { name: 'Instruction Générale des Opérations de Change (IGOC) — version en vigueur', url: 'https://www.oc.gov.ma' };
const ADII = { name: 'ADII — douane.gov.ma (ADIL, tarif, guides)', url: 'https://www.douane.gov.ma' };
const PORTNET = { name: 'PortNet — guichet unique national', url: 'https://www.portnet.ma' };
const ONSSA = { name: 'ONSSA — contrôles à l’importation', url: 'https://www.onssa.gov.ma' };
const MCINET = { name: "Ministère de l'Industrie et du Commerce", url: 'https://www.mcinet.gov.ma' };
const ICC = { name: 'ICC — Incoterms® 2020', url: 'https://iccwbo.org/business-solutions/incoterms-rules/' };

export const KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: 'liberte-import', theme: 'Commerce extérieur', title: 'Principe de liberté des importations',
    summary: "Les importations sont libres, sauf marchandises soumises à restriction (licence) ou interdites pour des motifs de sécurité, santé, environnement, etc.",
    details: [
      "Le titre d'importation le plus courant est l'engagement d'importation (EI), souscrit sur PortNet.",
      'Les marchandises figurant sur les listes de restriction nécessitent une licence d’importation délivrée par le département du commerce extérieur.',
      'Vérifier systématiquement la position tarifaire dans ADIL (rubrique « documents et normes ») pour connaître les restrictions applicables.',
    ],
    legalBasis: 'Loi n° 13-89 relative au commerce extérieur et textes d’application (listes de marchandises soumises à restriction).',
    sources: [MCINET, OC, ADII], checked: '2026-11-17', status: 'secondaire',
  },
  {
    id: 'engagement-import', theme: 'Change & banque', title: "Engagement d'importation et domiciliation bancaire",
    summary: "L'engagement d'importation, établi conformément à la réglementation du commerce extérieur, doit être souscrit sur PortNet et domicilié auprès d'une banque.",
    details: [
      'Toute importation donnant lieu à règlement en devises doit être domiciliée auprès d’une banque intermédiaire agréée, via PortNet, avant le dédouanement.',
      "Avant de domicilier, la banque s'assure de la concordance entre le contrat commercial / facture pro forma et les informations portées sur l'engagement d'importation.",
      'La banque transmet à l’Office des Changes les informations relatives aux importations (obligation prévue par l’IGOC — articles 18 et 54 selon la version 2024).',
      "Le dossier de domiciliation est ensuite apuré par l'imputation des déclarations douanières (DUM) et des règlements.",
    ],
    legalBasis: 'IGOC (Office des Changes) — dispositions relatives aux importations de biens ; réglementation du commerce extérieur.',
    sources: [OC, OC_FAQ, IGOC], checked: '2026-11-17', status: 'officiel',
  },
  {
    id: 'igoc-version', theme: 'Change & banque', title: 'Version de l’IGOC et délais d’apurement',
    summary: "Des sources mentionnent l'IGOC 2024 et une version 2026. Les délais d'apurement et de notification à l'Office des Changes divergent selon les sources secondaires.",
    details: [
      'Une source secondaire évoque un délai de 60 jours au-delà duquel la banque informe l’Office des Changes si la marchandise n’est pas dédouanée ; une autre version de la même source indique l’absence de délai.',
      'Le simulateur n’impose aucun délai légal d’apurement : il signale seulement que le dossier doit être suivi et apuré.',
    ],
    legalBasis: 'IGOC en vigueur — à consulter sur oc.gov.ma.',
    sources: [IGOC, { name: 'Upsilon Consulting — Importation de biens au Maroc (secondaire)', url: 'https://upsilon-consulting.com/importation-de-biens-change-maroc/' }],
    checked: '2026-11-17', status: 'a-verifier',
  },
  {
    id: 'modes-reglement', theme: 'Change & banque', title: 'Modes de règlement international',
    summary: 'Virement (simple, sans garantie), remise documentaire (documents contre paiement ou acceptation), crédit documentaire (engagement bancaire irrévocable de payer contre documents conformes).',
    details: [
      "Virement : le plus simple et le moins cher, mais aucune garantie ni pour l'acheteur s'il paie d'avance, ni pour le vendeur s'il expédie avant paiement.",
      'Remise documentaire (D/P ou D/A) : les banques transmettent les documents, sans engagement de payer. Régie par les RUE/URC 522 de la CCI.',
      'Crédit documentaire : la banque émettrice s’engage à payer si des documents conformes sont présentés dans les délais. Régi par les RUU/UCP 600 de la CCI. Plus sûr, plus coûteux, très formaliste.',
      'Les acomptes / paiements anticipés sont encadrés par l’IGOC (conditions et justificatifs). Les seuils exacts doivent être vérifiés dans la version en vigueur.',
    ],
    legalBasis: 'CCI : RUU 600 (UCP 600), RUE 522 (URC 522). IGOC pour les conditions de règlement des importations.',
    sources: [IGOC, { name: 'ICC — UCP 600 / URC 522', url: 'https://iccwbo.org' }], checked: '2026-11-17', status: 'secondaire',
  },
  {
    id: 'portnet', theme: 'Portuaire', title: 'PortNet — guichet unique du commerce extérieur',
    summary: 'PortNet dématérialise les titres d’importation, la domiciliation, les échanges avec les organismes de contrôle, le bon à délivrer et l’enlèvement.',
    details: [
      'Le bon à délivrer (BAD) est dématérialisé et échangé via PortNet depuis 2020 (agents maritimes, transitaires, exploitants de MEAD).',
      'Une solution PortNet de formalités d’enlèvement a été déployée à partir de 2022 (prise de rendez-vous déclarant / transporteur).',
      "Le module « Visite et contrôle » gère la fiche suiveuse : proposition de date par le déclarant, validation par la douane, résultat du contrôle.",
    ],
    legalBasis: 'Circulaires ADII et guides utilisateurs PortNet.',
    sources: [PORTNET, { name: 'PortNet — Guide déclarant et transitaire', url: 'https://www.portnet.ma/documents/d/guichet-unique/declarant-et-transitaire' }, { name: 'Médias24 — BAD électronique (2020, 2022)', url: 'https://medias24.com/2020/01/24/portnet-la-gestion-electronique-du-bon-a-delivrer-entre-en-vigueur-le-3-fevrier/' }],
    checked: '2026-11-17', status: 'secondaire',
  },
  {
    id: 'badr-dum', theme: 'Douane', title: 'BADR et Déclaration Unique de Marchandises (DUM)',
    summary: 'Le dédouanement est réalisé sur BADR (Base Automatisée des Douanes en Réseau). La DUM est déposée par un déclarant (transitaire agréé ou importateur habilité), signée électroniquement puis enregistrée.',
    details: [
      'Après enregistrement, la déclaration est orientée vers un circuit de contrôle (sans contrôle, contrôle documentaire, visite physique). Les critères de sélection relèvent de l’analyse de risque de l’ADII et ne sont pas publics : le jeu les tire au hasard.',
      'Le devis des droits et taxes, la consultation du circuit et l’édition de la mainlevée sont accessibles en ligne ; la mainlevée s’obtient à distance sauf vérification physique.',
      'L’interface du simulateur est pédagogique et ne reproduit pas l’interface officielle.',
    ],
    legalBasis: 'Code des douanes et impôts indirects (CDII) — dispositions relatives à la déclaration en détail ; circulaires ADII.',
    sources: [ADII, { name: 'Casainvest — Procédure de dédouanement en ligne', url: 'https://casainvest.ma/sites/default/files/translations/Publications/Proc%C3%A9dure%20de%20d%C3%A9douanement%20en%20ligne.pdf' }],
    checked: '2026-11-17', status: 'secondaire',
  },
  {
    id: 'regime-consommation', theme: 'Douane', title: 'Régime de mise à la consommation',
    summary: 'Pour des marchandises destinées à rester définitivement au Maroc et à être utilisées par l’entreprise, le régime normal est la mise à la consommation (paiement des droits et taxes).',
    details: [
      "Les régimes économiques (admission temporaire pour perfectionnement actif, entrepôt, etc.) permettent la suspension des droits sous conditions — ils ne sont pas couverts par le scénario 4.",
      "Le code régime exact à porter sur la DUM doit être vérifié dans la nomenclature des régimes BADR.",
    ],
    legalBasis: 'CDII — titres relatifs aux régimes douaniers.',
    sources: [ADII], checked: '2026-11-17', status: 'secondaire',
  },
  {
    id: 'valeur-douane', theme: 'Douane', title: 'Valeur en douane',
    summary: 'La valeur en douane repose sur la valeur transactionnelle (prix effectivement payé ou à payer), ajustée des frais de transport et d’assurance jusqu’au point d’entrée au Maroc — base dite « CIF ».',
    details: [
      'Méthode inspirée de l’Accord de l’OMC sur l’évaluation en douane (article VII du GATT).',
      'Si l’Incoterm est EXW/FCA/FOB, il faut ajouter le fret et l’assurance réellement supportés ; en CFR, ajouter l’assurance ; en CIF, le prix les inclut déjà.',
      'Les frais postérieurs à l’importation (transport national) sont exclus s’ils sont distincts.',
    ],
    legalBasis: 'CDII — articles relatifs à la valeur en douane ; Accord OMC sur l’évaluation.',
    sources: [ADII, { name: 'OMC — Accord sur l’évaluation en douane', url: 'https://www.wto.org/french/tratop_f/cusval_f/cusval_f.htm' }], checked: '2026-11-17', status: 'secondaire',
  },
  {
    id: 'tva-import', theme: 'Fiscalité', title: 'TVA à l’importation',
    summary: 'Taux normal 20 % (taux réduits pour certains produits). Assiette retenue dans le jeu : valeur en douane + DI + TPI.',
    details: [
      'Les sources secondaires concordent sur le taux normal de 20 % ; l’assiette exacte (« valeur en douane majorée des droits et taxes ») est à confirmer dans le Code général des impôts / CDII.',
      "Pour une entreprise assujettie, la TVA payée à l'import est en principe déductible : c'est un décaissement de trésorerie mais pas un coût de revient.",
    ],
    legalBasis: 'Code général des impôts (TVA à l’importation, perçue par l’ADII).',
    sources: [ADII, { name: 'JETRO — Morocco trade rules', url: 'https://www.jetro.go.jp/world/africa/ma/trade_03.html' }, { name: 'PwC Tax Summaries — Morocco other taxes', url: 'https://taxsummaries.pwc.com/Morocco/Corporate/Other-taxes' }],
    checked: '2026-11-17', status: 'secondaire',
  },
  {
    id: 'tpi', theme: 'Fiscalité', title: 'Taxe parafiscale à l’importation (TPI)',
    summary: 'Taxe ad valorem de 0,25 % de la valeur en douane, avec des exceptions.',
    details: [
      "Les exonérations (selon origine, régime ou produit) doivent être vérifiées dans ADIL et la loi de finances en vigueur : le jeu applique 0,25 % à toutes les origines.",
    ],
    legalBasis: 'Loi de finances ayant institué la TPI — à vérifier.',
    sources: [{ name: 'JETRO — Morocco trade rules', url: 'https://www.jetro.go.jp/world/africa/ma/trade_03.html' }, { name: 'GTAI — Zollbericht Marokko', url: 'https://www.gtai.de/de/trade/marokko/zoll/einfuhrabgaben-649300' }],
    checked: '2026-11-17', status: 'secondaire',
  },
  {
    id: 'di-taux', theme: 'Fiscalité', title: "Taux du droit d'importation (DI)",
    summary: 'Le taux de DI dépend de la position tarifaire à 10 chiffres et de l’origine. Les taux affichés dans le jeu sont FICTIFS sauf mention contraire.',
    details: [
      "Consulter ADIL (douane.gov.ma) pour la position exacte et le taux de droit commun, ainsi que les taux préférentiels par accord.",
      "Scénario 4 : 0 % pour l'origine UE prouvée (démantèlement des produits industriels dans l'accord d'association — à vérifier), 17,5 % fictif pour le droit commun.",
    ],
    legalBasis: 'Tarif des droits de douane (loi de finances) ; accords préférentiels.',
    sources: [ADII], checked: '2026-11-17', status: 'hypothese',
  },
  {
    id: 'classement-sh', theme: 'Douane', title: 'Classement tarifaire (SH) des canettes en aluminium',
    summary: 'Les boîtes et récipients similaires en aluminium d’une contenance ≤ 300 litres relèvent de la position SH 76.12 ; les canettes vides se classent en principe en 7612.90.',
    details: [
      'Règles générales interprétatives (RGI) 1 et 6 : classement selon le libellé des positions puis des sous-positions.',
      'Ne pas confondre avec 76.06 (tôles et bandes en aluminium, matière première), 76.15 (articles de ménage) ou 83.09 (bouchons, couvercles et capsules — les couvercles livrés séparément peuvent relever de cette position).',
      'La sous-position nationale à 10 chiffres utilisée dans le jeu (7612.90.00.90) est FICTIVE : à rechercher dans ADIL.',
    ],
    legalBasis: 'Système harmonisé (OMD) — RGI ; tarif marocain.',
    sources: [ADII, { name: 'OMD — Nomenclature du SH', url: 'https://www.wcoomd.org' }], checked: '2026-11-17', status: 'secondaire',
  },
  {
    id: 'origine-ue', theme: 'Origine', title: 'Origine préférentielle UE — Accord d’association Maroc-UE',
    summary: 'Accord d’association signé le 26/02/1996, en vigueur le 01/03/2000. La preuve d’origine peut être un EUR.1/EUR-MED ou une déclaration d’origine sur facture.',
    details: [
      "La déclaration sur facture peut être faite par un exportateur agréé, ou par tout exportateur pour des envois de faible valeur (seuil de l'ordre de 6 000 € selon les accords — seuil exact à vérifier dans le protocole n° 4).",
      'Sans preuve d’origine valable, le droit commun s’applique.',
      'Un échange de lettres récent modifie les protocoles n° 1 et n° 4 ; vérifier les conséquences éventuelles avant toute opération réelle.',
    ],
    legalBasis: 'Accord d’association Maroc-UE, protocole n° 4 (règles d’origine) ; convention pan-euro-méditerranéenne.',
    sources: [{ name: 'Douane française — accords préférentiels de l’UE', url: 'https://www.douane.gouv.fr/fiche/liste-des-accords-et-preferences-unilaterales-de-lunion-europeenne' }, { name: 'Douane française — exportateur agréé', url: 'https://www.douane.gouv.fr/articles/a10831-devenir-exportateur-agree-et-certifier-l-origine-sur-un-document-commercial' }],
    checked: '2026-11-17', status: 'secondaire',
  },
  {
    id: 'origine-tr', theme: 'Origine', title: 'Origine Turquie — ALE Maroc-Turquie',
    summary: "L'accord de libre-échange Maroc-Turquie prévoit des préférences sous preuve d'origine (EUR.1) ; il a été amendé (droits additionnels sur certains produits industriels).",
    details: ['Le jeu applique un taux FICTIF de 0 % avec EUR.1 — à vérifier impérativement dans ADIL pour la position concernée.'],
    legalBasis: 'ALE Maroc-Turquie et avenants.', sources: [ADII], checked: '2026-11-17', status: 'a-verifier',
  },
  {
    id: 'origine-cn', theme: 'Origine', title: 'Origine Chine — droit commun',
    summary: "Le Maroc n'a pas d'accord tarifaire préférentiel avec la Chine : le droit commun s’applique. Un certificat d’origine non préférentiel peut être demandé (antidumping, statistiques, exigences contractuelles).",
    details: ["Vérifier dans ADIL l'existence éventuelle de mesures de défense commerciale sur la position."],
    legalBasis: 'Tarif des droits de douane.', sources: [ADII], checked: '2026-11-17', status: 'secondaire',
  },
  {
    id: 'conformite-industrielle', theme: 'Conformité & SPS', title: 'Contrôle de conformité des produits industriels',
    summary: "Certains produits industriels figurent sur des listes soumises à contrôle de conformité à l'importation (sécurité des produits). La liste doit être vérifiée pour chaque produit.",
    details: [
      'Le jeu suppose que les canettes vides destinées à une industrie ne figurent pas sur la liste : HYPOTHÈSE à vérifier auprès du MCINET.',
    ],
    legalBasis: 'Loi n° 24-09 relative à la sécurité des produits et des services et textes d’application ; normes IMANOR.',
    sources: [MCINET, { name: 'IMANOR', url: 'https://www.imanor.gov.ma' }], checked: '2026-11-17', status: 'a-verifier',
  },
  {
    id: 'contact-alimentaire', theme: 'Conformité & SPS', title: 'Emballages au contact des denrées alimentaires',
    summary: "Aucune procédure ONSSA d'importation spécifique aux canettes vides n'a pu être vérifiée. Le jeu n'impose donc pas de contrôle ONSSA ; il exige une déclaration de conformité « contact alimentaire » comme EXIGENCE CONTRACTUELLE du client industriel.",
    details: [
      "Dans l'UE, le règlement (CE) n° 1935/2004 encadre les matériaux au contact des aliments ; les fabricants européens délivrent une déclaration de conformité.",
      "Avant une opération réelle, interroger l'ONSSA sur le statut des matériaux de contact alimentaire importés.",
    ],
    legalBasis: 'Loi n° 28-07 relative à la sécurité sanitaire des produits alimentaires (champ d’application à vérifier) — hypothèse pédagogique.',
    sources: [ONSSA, { name: 'Règlement (CE) 1935/2004', url: 'https://eur-lex.europa.eu/eli/reg/2004/1935/oj' }], checked: '2026-11-17', status: 'hypothese',
  },
  {
    id: 'onssa', theme: 'Conformité & SPS', title: 'Contrôles ONSSA à l’importation',
    summary: "L'ONSSA contrôle à l'importation les produits alimentaires, animaux, végétaux et produits d'origine animale/végétale : contrôle documentaire, d'identité, physique, prélèvements et analyses.",
    details: [
      'Décisions possibles selon le résultat : admission, mise en conformité, refoulement ou destruction, dans les cas prévus par la réglementation.',
      "Ne pas imposer de contrôle ONSSA à des marchandises hors de son champ (ex. ordinateurs).",
    ],
    legalBasis: 'Loi n° 25-08 (création de l’ONSSA) ; loi n° 28-07 ; textes d’application.',
    sources: [ONSSA], checked: '2026-11-17', status: 'secondaire',
  },
  {
    id: 'incoterms', theme: 'Incoterms', title: 'Incoterms® 2020',
    summary: "11 règles CCI répartissant frais, risques et formalités. Pour le maritime conteneurisé, la CCI recommande FCA/CPT/CIP plutôt que FOB/CFR/CIF (le transfert des risques à bord est inadapté au conteneur remis au terminal).",
    details: [
      "EXW : l'acheteur gère les formalités d'exportation — délicat pour un importateur marocain.",
      'CIF : l’assurance minimale exigée est la couverture ICC (C) ; CIP exige ICC (A).',
      "DDP : le vendeur dédouane à l'importation — pratiquement inapplicable au Maroc pour un vendeur étranger (déclarant, domiciliation, paiement des taxes).",
    ],
    legalBasis: 'Publication CCI Incoterms® 2020 (n° 723).', sources: [ICC], checked: '2026-11-17', status: 'officiel',
  },
  {
    id: 'bad', theme: 'Portuaire', title: 'Manifeste, déclaration sommaire et bon à délivrer',
    summary: "Le transporteur/agent maritime dépose le manifeste (déclaration sommaire) ; le bon à délivrer est émis par l'agent maritime au destinataire (ou son transitaire) après remise du connaissement original ou levée des conditions (fret payé, garanties).",
    details: ['Le BAD électronique est échangé via PortNet et ses données remontent vers BADR.'],
    legalBasis: 'CDII ; circulaires ADII sur la dématérialisation du BAD.', sources: [PORTNET], checked: '2026-11-17', status: 'secondaire',
  },
  {
    id: 'surestaries', theme: 'Logistique', title: 'Franchise, surestaries et détention',
    summary: "Surestaries (demurrage) : conteneur plein au terminal au-delà de la franchise. Détention : conteneur hors terminal au-delà de la franchise de restitution. Montants contractuels, fixés par l'armateur et le terminal.",
    details: ['Le jeu utilise une franchise fictive de 7 jours et un tarif fictif par conteneur et par jour.'],
    legalBasis: 'Conditions contractuelles de l’armateur et tarifs de l’exploitant portuaire.', sources: [], checked: '2026-11-17', status: 'hypothese',
  },
  {
    id: 'sscc', theme: 'Logistique', title: 'Traçabilité : lots, SSCC et scellés',
    summary: 'Le SSCC (GS1, 18 chiffres) identifie chaque unité logistique (palette). Le numéro de scellé est reporté sur le B/L et la packing list et contrôlé à l’arrivée.',
    details: ['Un écart de numéro de scellé impose des réserves et une vérification contradictoire avant ouverture.'],
    legalBasis: 'Standards GS1 ; pratiques du transport maritime.', sources: [{ name: 'GS1 — SSCC', url: 'https://www.gs1.org/standards/id-keys/sscc' }], checked: '2026-11-17', status: 'officiel',
  },
  {
    id: 'reserves', theme: 'Logistique', title: 'Réserves à la livraison et assurance',
    summary: 'En cas de dommage ou de manquant, les réserves doivent être précises, écrites et notifiées dans les délais du contrat de transport et de la police d’assurance pour préserver les recours.',
    details: ['Délais : selon la convention applicable (Règles de Hambourg/La Haye-Visby pour le maritime, CMR pour la route) et la police — à vérifier au cas par cas.'],
    legalBasis: 'Conventions internationales de transport ; Code de commerce maritime.', sources: [], checked: '2026-11-17', status: 'a-verifier',
  },
  {
    id: 'donnees-fictives', theme: 'Logistique', title: 'Données fictives du scénario',
    summary: 'Entreprises, prix, taux de change, tarifs portuaires, honoraires et pénalités sont fictifs mais réalistes. Aucune connexion aux systèmes réels (banques, BADR, PortNet).',
    details: ['Taux de change indicatifs : utiliser le cours de Bank Al-Maghrib / de la banque au jour de l’opération.'],
    legalBasis: '—', sources: [], checked: '2026-11-17', status: 'hypothese',
  },
];

export const K = Object.fromEntries(KNOWLEDGE.map((k) => [k.id, k]));
