import type { GameState, Scenario } from '../engine/types';
import { calcFromVars, supplierOf } from '../engine/game';
import { fmtNum } from '../engine/calc';

export interface DocField { label: string; value: string; anomaly?: string }

export interface DocDef {
  id: string;
  title: string;
  icon: string;
  issuer: string;
  recipient: string;
  purpose: string;
  when: string;
  status: string;
  related: string[];
  /** 'scenario' : utilisé dans le scénario ; 'exemple' : modèle pédagogique d'un autre cas. */
  usage: 'scenario' | 'exemple';
  /** Variable positionnée à true si une anomalie n'est pas détectée lors d'un contrôle. */
  missedVar?: string;
  fields: (sc: Scenario, s: GameState, check: boolean) => DocField[];
}

const d = (n: number) => `J+${n}`;
const ref = (p: string) => `${p}-2026-${String(4811).padStart(5, '0')}`;

function base(sc: Scenario, s: GameState) {
  const sup = supplierOf(sc, s.vars);
  const calc = calcFromVars(sc, s.vars, 0);
  const inc = String(s.vars.incoterm ?? 'FCA');
  const place = ['CIF', 'CFR', 'DAP', 'DDP'].includes(inc) ? (inc === 'DAP' ? 'Usine Atlas Boissons, Casablanca' : 'Casablanca') : `${sup.port}, terminal à conteneurs`;
  const unit = sup.unitPrice * (1 - Number(s.vars.discount ?? 0));
  return { sup, calc, inc, place, unit };
}

export const DOCUMENTS: DocDef[] = [
  {
    id: 'besoin', title: "Expression de besoin", icon: '📝', issuer: 'Production / usine', recipient: 'Service achats',
    purpose: 'Définir précisément ce qu’il faut acheter, en quelle quantité et pour quand.', when: 'Avant toute consultation', status: 'Document interne', related: ['rfq'], usage: 'scenario',
    fields: (sc) => [
      { label: 'Article', value: sc.goods.description },
      { label: 'Quantité', value: `${fmtNum(sc.goods.quantity, 0)} ${sc.goods.unit}` },
      { label: 'Conditionnement', value: `${sc.goods.containers} × ${sc.goods.containerType}, ${sc.goods.palletsPerContainer} palettes par conteneur` },
      { label: 'Échéance', value: `Livré usine au plus tard à ${d(sc.deadlineDays)}` },
    ],
  },
  {
    id: 'rfq', title: 'Demande de cotation (RFQ)', icon: '📨', issuer: 'Importateur (achats)', recipient: 'Fournisseurs consultés',
    purpose: 'Obtenir des offres comparables sur un périmètre identique.', when: 'Phase A — consultation', status: 'Document commercial (non réglementaire)', related: ['devis'], usage: 'scenario',
    fields: (sc) => [
      { label: 'Émetteur', value: sc.company.name },
      { label: 'Objet', value: sc.goods.description },
      { label: 'Quantité', value: `${fmtNum(sc.goods.quantity, 0)} (tolérance ±2 %)` },
      { label: 'Incoterm de référence', value: 'FCA terminal du port de départ (Incoterms® 2020)' },
      { label: 'Documents exigés', value: "Facture, packing list, preuve d'origine, déclaration de conformité contact alimentaire" },
      { label: 'Réponse attendue sous', value: '5 jours' },
    ],
  },
  {
    id: 'devis', title: 'Devis fournisseur', icon: '💬', issuer: 'Fournisseur', recipient: 'Importateur',
    purpose: 'Offre de prix et de conditions, base de la négociation.', when: 'Phase A — réception des offres', status: 'Document commercial', related: ['rfq', 'proforma'], usage: 'scenario',
    fields: (sc, s) => {
      const { sup } = base(sc, s);
      return [
        { label: 'Fournisseur', value: `${sup.flag} ${sup.name} — ${sup.city}` },
        { label: 'Prix unitaire', value: `${sup.unitPrice} ${sup.currency} FCA ${sup.port}` },
        { label: 'Délai de fabrication', value: `${sup.productionDays} jours après validation du BAT` },
        { label: 'Certifications', value: sup.rating.certifs.join(', ') },
        { label: 'Validité', value: '30 jours' },
      ];
    },
  },
  {
    id: 'bc', title: 'Bon de commande', icon: '🧾', issuer: 'Importateur', recipient: 'Fournisseur',
    purpose: "Matérialise l'engagement d'achat aux conditions négociées.", when: 'Après le choix du fournisseur', status: 'Document commercial — engage l’acheteur', related: ['contrat', 'proforma'], usage: 'scenario',
    fields: (sc, s) => {
      const { sup, inc, place, unit, calc } = base(sc, s);
      return [
        { label: 'N° commande', value: ref('BC') },
        { label: 'Fournisseur', value: sup.name },
        { label: 'Quantité', value: fmtNum(sc.goods.quantity, 0) },
        { label: 'Prix unitaire', value: `${fmtNum(unit, 4)} ${sup.currency}` },
        { label: 'Montant', value: `${fmtNum(calc.invoiceCurrency)} ${sup.currency}` },
        { label: 'Incoterm', value: `${inc} ${place} (Incoterms® 2020)` },
      ];
    },
  },
  {
    id: 'contrat', title: 'Contrat commercial international', icon: '📜', issuer: 'Vendeur et acheteur', recipient: 'Les deux parties, banque',
    purpose: 'Fixe les obligations réciproques ; sert de référence à la banque pour la domiciliation.', when: 'Avant domiciliation', status: 'Contrat — base de la domiciliation', related: ['proforma', 'engagement'], usage: 'scenario',
    fields: (sc, s) => {
      const { sup, inc, place } = base(sc, s);
      return [
        { label: 'Parties', value: `${sup.name} / ${sc.company.name}` },
        { label: 'Incoterm', value: `${inc} ${place} — Incoterms® 2020` },
        { label: 'Paiement', value: String(s.vars.payment ?? '—') },
        { label: 'Pénalités', value: s.vars.discount ? '0,5 % par jour de retard, plafond 5 %' : 'Non prévues' },
        { label: 'Loi applicable / litiges', value: 'Convention de Vienne (CVIM) ; arbitrage CCI (exemple)' },
      ];
    },
  },
  {
    id: 'proforma', title: 'Facture pro forma', icon: '📄', issuer: 'Fournisseur', recipient: 'Importateur, banque',
    purpose: "Facture préalable servant à la domiciliation de l'engagement d'importation et à l'ouverture du crédit documentaire.", when: 'Après accord commercial, avant domiciliation', status: 'Exigée pour la domiciliation bancaire', related: ['contrat', 'engagement', 'facture'], usage: 'scenario', missedVar: 'proformaMissed',
    fields: (sc, s, check) => {
      const { sup, inc, place, unit, calc } = base(sc, s);
      const wrongInc = inc === 'EXW' ? 'DAP' : 'EXW';
      return [
        { label: 'N°', value: `PF-${sup.id}-2026-118` },
        { label: 'Vendeur', value: `${sup.name}, ${sup.city} (${sup.country})` },
        { label: 'Acheteur', value: `${sc.company.name} — ICE ${sc.company.ice}` },
        { label: 'Désignation', value: sc.goods.description },
        check ? { label: 'Quantité', value: '4 800 000 canettes', anomaly: 'La quantité contractuelle est de 4 080 000 canettes (inversion de chiffres).' } : { label: 'Quantité', value: `${fmtNum(sc.goods.quantity, 0)} canettes` },
        { label: 'Prix unitaire', value: `${fmtNum(unit, 4)} ${sup.currency}` },
        { label: 'Montant total', value: `${fmtNum(calc.invoiceCurrency)} ${sup.currency}` },
        check ? { label: 'Incoterm', value: `${wrongInc} ${sup.city}`, anomaly: `L'Incoterm négocié est ${inc} ${place}.` } : { label: 'Incoterm', value: `${inc} ${place} (Incoterms® 2020)` },
        check ? { label: 'Code SH', value: '7606.12', anomaly: 'Position des tôles d’aluminium ; les canettes relèvent de 7612.90.' } : { label: 'Code SH', value: sc.goods.hsCode },
        { label: 'Origine', value: sup.country },
        { label: 'Délai', value: `${sup.productionDays} jours après BAT` },
        { label: 'Validité', value: '30 jours' },
      ];
    },
  },
  {
    id: 'engagement', title: "Engagement d'importation (PortNet)", icon: '🖥️', issuer: 'Importateur via PortNet', recipient: 'Banque domiciliataire, ADII, Office des Changes',
    purpose: 'Titre d’importation pour une marchandise libre ; support de la domiciliation bancaire.', when: 'Après le contrat, avant expédition et dédouanement', status: 'Obligatoire (marchandise libre réglée en devises)', related: ['proforma', 'domiciliation', 'dum'], usage: 'scenario',
    fields: (sc, s) => {
      const { sup, inc, calc } = base(sc, s);
      return [
        { label: 'N°', value: 'EI-2026-04811 (fictif)' },
        { label: 'Importateur', value: `${sc.company.name} — ICE ${sc.company.ice}` },
        { label: 'Fournisseur', value: sup.name },
        { label: 'Origine / provenance', value: `${sup.country} / ${sup.country}` },
        { label: 'Montant', value: `${fmtNum(calc.invoiceCurrency)} ${sup.currency}` },
        { label: 'Nomenclature', value: sc.goods.nationalCode },
        { label: 'Incoterm', value: inc },
        { label: 'Banque', value: 'Banque Maghreb Commerce (fictive)' },
      ];
    },
  },
  {
    id: 'domiciliation', title: 'Justificatif de domiciliation bancaire', icon: '🏦', issuer: 'Banque domiciliataire', recipient: 'Importateur (et ADII via PortNet)',
    purpose: "Atteste que l'engagement est domicilié : la banque pourra régler le fournisseur et imputer les DUM.", when: 'Avant le dédouanement', status: 'Obligatoire pour l’opération réglée en devises', related: ['engagement', 'paiement', 'dum'], usage: 'scenario',
    fields: (sc, s) => {
      const { sup, calc } = base(sc, s);
      return [
        { label: 'Dossier', value: 'DOM-BMC-2026-7712 (fictif)' },
        { label: 'Engagement', value: 'EI-2026-04811' },
        { label: 'Montant domicilié', value: `${fmtNum(calc.invoiceCurrency)} ${sup.currency}` },
        { label: 'Statut', value: 'Domicilié — en attente d’imputation' },
        { label: 'Client', value: sc.company.name },
      ];
    },
  },
  {
    id: 'paiement', title: 'Document de paiement (crédit documentaire / ordre de virement)', icon: '💳', issuer: 'Banque de l’importateur', recipient: 'Banque du fournisseur',
    purpose: 'Instrument de règlement international ; le crédit documentaire est payé contre documents conformes.', when: 'Après domiciliation', status: 'Selon le mode de règlement', related: ['domiciliation', 'facture', 'bl'], usage: 'scenario',
    fields: (sc, s) => {
      const { sup, calc } = base(sc, s);
      return [
        { label: 'Instrument', value: String(s.vars.payment ?? '—') },
        { label: 'Montant', value: `${fmtNum(calc.invoiceCurrency)} ${sup.currency}` },
        { label: 'Bénéficiaire', value: sup.name },
        { label: 'Documents exigés', value: "Facture, packing list, B/L complet, preuve d'origine, déclaration contact alimentaire" },
        { label: 'Règles', value: s.vars.payment === 'credoc' ? 'RUU 600 (UCP 600)' : s.vars.payment === 'remdoc' ? 'RUE 522 (URC 522)' : 'Virement SWIFT' },
      ];
    },
  },
  {
    id: 'facture', title: 'Facture commerciale définitive', icon: '🧾', issuer: 'Fournisseur', recipient: 'Importateur, banque, douane',
    purpose: 'Base de la valeur transactionnelle déclarée en douane et du règlement.', when: 'À l’expédition', status: 'Obligatoire au dédouanement', related: ['proforma', 'packing', 'dum'], usage: 'scenario',
    fields: (sc, s) => {
      const { sup, inc, place, unit, calc } = base(sc, s);
      return [
        { label: 'N°', value: `INV-${sup.id}-2026-0457` },
        { label: 'Quantité', value: fmtNum(sc.goods.quantity, 0) },
        { label: 'Prix unitaire', value: `${fmtNum(unit, 4)} ${sup.currency}` },
        { label: 'Montant', value: `${fmtNum(calc.invoiceCurrency)} ${sup.currency}` },
        { label: 'Incoterm', value: `${inc} ${place}` },
        { label: 'Code SH', value: sc.goods.hsCode },
        { label: 'Origine', value: sup.country },
      ];
    },
  },
  {
    id: 'packing', title: 'Liste de colisage (packing list)', icon: '📦', issuer: 'Fournisseur', recipient: 'Importateur, transitaire, douane',
    purpose: 'Détaille le contenu de chaque conteneur : palettes, SSCC, poids, scellés.', when: 'Au chargement', status: 'Exigée au dédouanement (pratique) et pour la réception', related: ['facture', 'bl'], usage: 'scenario', missedVar: 'packingMissed',
    fields: (sc, _s, check) => [
      { label: 'Conteneurs', value: `${sc.goods.containers} × ${sc.goods.containerType}` },
      { label: 'Palettes', value: `${sc.goods.palletsPerContainer * sc.goods.containers} (24 par conteneur)` },
      check ? { label: 'Canettes par palette', value: '8 800', anomaly: '480 × 8 800 = 4 224 000 ≠ 4 080 000 : il faut 8 500 canettes par palette.' } : { label: 'Canettes par palette', value: '8 500' },
      { label: 'Total canettes', value: fmtNum(sc.goods.quantity, 0) },
      check ? { label: 'Poids brut total', value: '6 100 kg', anomaly: '20 × 3 050 kg = 61 000 kg (erreur d’un facteur 10).' } : { label: 'Poids brut total', value: fmtNum(sc.goods.grossKgPerContainer * sc.goods.containers, 0) + ' kg' },
      { label: 'SSCC', value: '(00) 3 761234 500000001 à …480' },
      check ? { label: 'Scellés', value: 'MLSC100201 … MLSC100220 — MLSC100207 attribué aux conteneurs 7 et 8', anomaly: 'Un numéro de scellé est unique par conteneur.' } : { label: 'Scellés', value: 'MLSC100201 à MLSC100220 (un par conteneur)' },
    ],
  },
  {
    id: 'origine', title: "Preuve d'origine (EUR.1 / déclaration d'origine / certificat d'origine)", icon: '🌍', issuer: "Exportateur, visé par l'autorité du pays d'exportation (EUR.1) ou déclaration de l'exportateur agréé", recipient: 'Douane marocaine via le déclarant',
    purpose: "Justifie l'origine pour obtenir le tarif préférentiel (EUR.1/déclaration) ou l'origine non préférentielle (certificat d'origine).", when: 'À l’exportation ; présentée au dédouanement', status: 'Indispensable pour le tarif préférentiel', related: ['facture', 'dum'], usage: 'scenario',
    fields: (sc, s) => {
      const { sup } = base(sc, s);
      return [
        { label: 'Type', value: s.vars.originProofOk === false ? 'Certificat d’origine non préférentiel' : sup.originProof },
        { label: 'Accord', value: sup.agreement },
        { label: 'Exportateur', value: sup.name },
        { label: 'Destinataire', value: sc.company.name },
        { label: 'Marchandise', value: `${sc.goods.hsCode} — ${fmtNum(sc.goods.quantity, 0)} canettes` },
      ];
    },
  },
  {
    id: 'alimentarite', title: 'Déclaration de conformité contact alimentaire', icon: '✅', issuer: 'Fabricant', recipient: 'Importateur (qualité)',
    purpose: "Atteste l'aptitude des canettes au contact des boissons. Exigence contractuelle du client dans ce scénario.", when: 'Avec chaque lot', status: 'Contractuelle (statut réglementaire marocain à vérifier)', related: ['facture'], usage: 'scenario',
    fields: (sc, s) => [
      { label: 'Fabricant', value: supplierOf(sc, s.vars).name },
      { label: 'Référentiel', value: supplierOf(sc, s.vars).id === 'CN' ? 'GB 4806 (Chine)' : 'Règlement (CE) 1935/2004' },
      { label: 'Lots', value: 'L26-1101 à L26-1120' },
    ],
  },
  {
    id: 'assurance', title: "Certificat / police d'assurance transport", icon: '🛡️', issuer: 'Assureur', recipient: 'Importateur (ou banque)',
    purpose: 'Couvre les dommages et pertes pendant le transport.', when: 'Avant le départ', status: "Obligatoire pour le vendeur en CIF/CIP ; recommandée sinon", related: ['bl'], usage: 'scenario',
    fields: (sc, s) => {
      const { calc } = base(sc, s);
      return [
        { label: 'Clauses', value: s.vars.insurance === 'icc-a' ? 'ICC (A) — tous risques' : s.vars.insurance === 'none' ? 'Aucune' : 'ICC (C)' },
        { label: 'Valeur assurée', value: `${fmtNum((calc.fob + calc.freightInValue) * 1.1, 0)} MAD (110 % CIF)` },
        { label: 'Assuré', value: sc.company.name },
      ];
    },
  },
  {
    id: 'bl', title: 'Connaissement maritime (Bill of Lading)', icon: '🚢', issuer: 'Transporteur maritime', recipient: 'Chargeur, puis destinataire',
    purpose: 'Reçu de la marchandise, preuve du contrat de transport et titre représentatif de la marchandise.', when: 'Après chargement à bord', status: 'Indispensable pour le BAD et la DUM', related: ['packing', 'bad', 'dum'], usage: 'scenario', missedVar: 'blMissed',
    fields: (sc, s, check) => {
      const { sup, inc } = base(sc, s);
      const prepaid = ['CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DDP'].includes(inc);
      return [
        { label: 'N° B/L', value: 'MDLN26VLC00871' },
        { label: 'Chargeur', value: sup.name },
        check ? { label: 'Destinataire (consignee)', value: 'Atlas Boisson SARL', anomaly: `Raison sociale exacte : ${sc.company.name}.` } : { label: 'Destinataire (consignee)', value: sc.company.name },
        { label: 'Notify', value: 'Transit Atlas Services (transitaire)' },
        { label: 'Port de chargement', value: sup.port },
        check ? { label: 'Port de déchargement', value: 'Tanger Med', anomaly: 'Le déchargement est prévu à Casablanca (le manifeste mentionne Casablanca).' } : { label: 'Port de déchargement', value: 'Casablanca' },
        check ? { label: 'Nombre de conteneurs', value: '19 × 40\' HC', anomaly: '20 conteneurs ont été chargés.' } : { label: 'Nombre de conteneurs', value: `${sc.goods.containers} × ${sc.goods.containerType}` },
        { label: 'Fret', value: prepaid ? 'Freight prepaid' : 'Freight collect' },
        { label: 'Marchandise', value: `${sc.goods.palletsPerContainer * sc.goods.containers} palettes — canettes vides en aluminium` },
      ];
    },
  },
  {
    id: 'bad', title: 'Bon à délivrer (BAD électronique)', icon: '🔓', issuer: 'Agent maritime (via PortNet)', recipient: 'Destinataire / transitaire',
    purpose: 'Autorise la délivrance des conteneurs au destinataire par le terminal.', when: 'Après arrivée et remise du B/L / paiement des frais', status: 'Indispensable pour l’enlèvement', related: ['bl', 'bon-sortie'], usage: 'scenario',
    fields: (sc) => [
      { label: 'B/L', value: 'MDLN26VLC00871' },
      { label: 'Bénéficiaire', value: sc.company.name },
      { label: 'Conteneurs', value: `${sc.goods.containers}` },
      { label: 'Canal', value: 'PortNet (simulé)' },
    ],
  },
  {
    id: 'dum', title: 'Déclaration Unique de Marchandises (DUM)', icon: '🛃', issuer: 'Déclarant en douane (transitaire agréé)', recipient: 'ADII (BADR)',
    purpose: 'Déclaration en détail : régime, espèce, origine, valeur ; base de la liquidation des droits et taxes.', when: 'À l’arrivée (ou par anticipation)', status: 'Obligatoire', related: ['facture', 'bl', 'engagement', 'quittance'], usage: 'scenario',
    fields: (sc, s) => {
      const { sup, calc, inc } = base(sc, s);
      return [
        { label: 'Régime', value: 'Mise à la consommation' },
        { label: 'Position', value: sc.goods.nationalCode },
        { label: 'Origine', value: sup.country },
        { label: 'Valeur facture', value: `${fmtNum(calc.invoiceCurrency)} ${sup.currency} (${inc})` },
        { label: 'Valeur en douane', value: `${fmtNum(calc.vd, 0)} MAD` },
        { label: 'Colis / poids', value: `${sc.goods.palletsPerContainer * sc.goods.containers} palettes / ${fmtNum(sc.goods.grossKgPerContainer * sc.goods.containers, 0)} kg` },
        { label: 'Titre', value: 'EI-2026-04811 domicilié' },
      ];
    },
  },
  {
    id: 'quittance', title: 'Justificatif de paiement des droits et taxes', icon: '💰', issuer: 'ADII', recipient: 'Importateur / déclarant',
    purpose: 'Prouve l’acquittement de la liquidation.', when: 'Après liquidation', status: 'Conditionne la mainlevée', related: ['dum', 'mainlevee'], usage: 'scenario',
    fields: (sc, s) => {
      const { calc, sup } = base(sc, s);
      const rate = s.vars.originProofOk === false ? Number(s.vars.mfnRate ?? sup.dutyRate) : sup.dutyRate;
      return [
        { label: 'DI', value: `${fmtNum(calc.di, 0)} MAD (taux ${fmtNum(rate * 100, 1)} %)` },
        { label: 'TPI', value: `${fmtNum(calc.tpi, 0)} MAD (${sc.fees.tpiRate * 100} %)` },
        { label: 'TVA', value: `${fmtNum(calc.tva, 0)} MAD (${sc.fees.vatRate * 100} %)` },
        { label: 'Total', value: `${fmtNum(calc.di + calc.tpi + calc.tva, 0)} MAD` },
      ];
    },
  },
  {
    id: 'mainlevee', title: 'Mainlevée douanière', icon: '🟢', issuer: 'ADII', recipient: 'Déclarant, terminal',
    purpose: "Autorise l'enlèvement des marchandises dédouanées.", when: 'Après paiement (ou garantie) et contrôles', status: 'Indispensable pour la sortie', related: ['dum', 'bon-sortie'], usage: 'scenario',
    fields: (sc) => [
      { label: 'DUM', value: '301-2026-0098765 (fictif)' },
      { label: 'Conteneurs', value: String(sc.goods.containers) },
      { label: 'Statut', value: 'Mainlevée accordée' },
    ],
  },
  {
    id: 'bon-sortie', title: 'Bon de sortie du terminal', icon: '🚧', issuer: 'Exploitant du terminal', recipient: 'Transporteur',
    purpose: 'Autorise physiquement la sortie des conteneurs du terminal.', when: 'Le jour de l’enlèvement', status: 'Pratique opérationnelle', related: ['mainlevee', 'bad'], usage: 'scenario',
    fields: (sc) => [
      { label: 'Conteneurs', value: String(sc.goods.containers) },
      { label: 'RDV', value: 'Créneaux PortNet (simulés)' },
    ],
  },
  {
    id: 'bon-livraison', title: 'Bon de livraison', icon: '🚚', issuer: 'Transporteur', recipient: 'Entrepôt / usine',
    purpose: 'Constate la remise des marchandises ; support des réserves.', when: 'À la livraison', status: 'Document de transport', related: ['pv-reception'], usage: 'scenario',
    fields: () => [
      { label: 'Livré', value: '478 palettes (dont 1 endommagée)' },
      { label: 'Réserves', value: 'Manque 2 palettes ; 1 palette écrasée (photos jointes)' },
    ],
  },
  {
    id: 'pv-reception', title: 'Procès-verbal de réception', icon: '🖊️', issuer: 'Entrepôt / qualité', recipient: 'Achats, assureur, fournisseur',
    purpose: 'Constate quantités et qualité reçues ; base des réclamations.', when: 'Après contrôle à réception', status: 'Document interne / probatoire', related: ['bon-livraison'], usage: 'scenario',
    fields: () => [
      { label: 'Conformité', value: 'Conforme sous réserves' },
      { label: 'Écarts', value: '3 palettes (25 500 canettes)' },
    ],
  },
  // Modèles pédagogiques utilisés dans d'autres scénarios
  ...(
    [
      ['awb', 'Lettre de transport aérien (AWB)', '✈️', 'Transporteur aérien', 'Fret aérien : preuve du contrat de transport (non négociable).'],
      ['cmr', 'Lettre de voiture CMR', '🛣️', 'Transporteur routier', 'Transport routier international : convention CMR.'],
      ['licence', "Licence d'importation", '🪪', 'Département du commerce extérieur', 'Requise pour les marchandises soumises à restriction.'],
      ['cert-sanitaire', 'Certificat sanitaire', '🩺', "Autorité sanitaire du pays d'exportation", 'Produits animaux / denrées : exigé par l’ONSSA selon le produit.'],
      ['phyto', 'Certificat phytosanitaire', '🌿', "Organisation de protection des végétaux du pays d'exportation", 'Végétaux et produits végétaux.'],
      ['conformite', 'Certificat / attestation de conformité', '🏷️', 'Organisme de contrôle', 'Produits industriels soumis au contrôle de conformité.'],
    ] as const
  ).map(([id, title, icon, issuer, purpose]) => ({
    id, title, icon, issuer, recipient: 'Importateur / autorités', purpose, when: 'Selon le scénario', status: 'Non applicable au scénario 4 — modèle pédagogique',
    related: [], usage: 'exemple' as const, fields: () => [{ label: 'Utilisation', value: purpose }],
  })),
];

export const DOC = Object.fromEntries(DOCUMENTS.map((x) => [x.id, x]));
