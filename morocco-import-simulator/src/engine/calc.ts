// Calcul du coût de revient rendu entrepôt et des droits et taxes (pédagogique).
// Règles modélisées (voir base de connaissances, fiches "valeur-douane", "tva-import", "tpi") :
//   valeur en douane ≈ valeur transactionnelle + transport + assurance jusqu'au point d'entrée au Maroc (base CIF)
//   DI  = VD × taux DI
//   TPI = VD × taux TPI (taxe parafiscale à l'importation)
//   TIC = quantité × TIC unitaire (boissons, selon le produit)
//   TVA = (VD + DI + TPI + TIC) × taux TVA
// Les taux réels doivent être vérifiés sur ADIL (douane.gov.ma) à la date de l'opération.

export const INCOTERMS = ['EXW', 'FCA', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DDP'] as const;
export type Incoterm = (typeof INCOTERMS)[number];

/** Ce que le prix vendeur inclut, selon l'Incoterm (transport principal maritime/multimodal). */
export const INCOTERM_SCOPE: Record<Incoterm, { preCarriage: boolean; exportClearance: boolean; freight: boolean; insurance: boolean; inland: boolean; importClearance: boolean; group: string; maritimeOnly: boolean }> = {
  EXW: { preCarriage: false, exportClearance: false, freight: false, insurance: false, inland: false, importClearance: false, group: 'E — départ', maritimeOnly: false },
  FCA: { preCarriage: true, exportClearance: true, freight: false, insurance: false, inland: false, importClearance: false, group: 'F — transport principal non payé', maritimeOnly: false },
  FOB: { preCarriage: true, exportClearance: true, freight: false, insurance: false, inland: false, importClearance: false, group: 'F — transport principal non payé', maritimeOnly: true },
  CFR: { preCarriage: true, exportClearance: true, freight: true, insurance: false, inland: false, importClearance: false, group: 'C — transport principal payé', maritimeOnly: true },
  CIF: { preCarriage: true, exportClearance: true, freight: true, insurance: true, inland: false, importClearance: false, group: 'C — transport principal payé', maritimeOnly: true },
  CPT: { preCarriage: true, exportClearance: true, freight: true, insurance: false, inland: false, importClearance: false, group: 'C — transport principal payé', maritimeOnly: false },
  CIP: { preCarriage: true, exportClearance: true, freight: true, insurance: true, inland: false, importClearance: false, group: 'C — transport principal payé', maritimeOnly: false },
  DAP: { preCarriage: true, exportClearance: true, freight: true, insurance: true, inland: true, importClearance: false, group: 'D — arrivée', maritimeOnly: false },
  DDP: { preCarriage: true, exportClearance: true, freight: true, insurance: true, inland: true, importClearance: true, group: 'D — arrivée', maritimeOnly: false },
};

export interface CalcInput {
  quantity: number;
  containers: number;
  unitPrice: number; // prix unitaire de base FCA, en devise
  currency: string;
  fxRate: number; // MAD pour 1 unité de devise
  incoterm: Incoterm;
  incotermAdjustPerContainer: number; // supplément de prix (devise) par conteneur lié à l'Incoterm
  freightPerContainer: number; // devise
  preCarriagePerContainer: number; // devise
  insuranceRate: number; // sur (marchandise + fret) × 110 %
  insured: boolean;
  dutyRate: number;
  tpiRate: number;
  vatRate: number;
  excisePerUnit: number; // TIC en MAD par unité (0 si non applicable)
  portPerContainer: number; // MAD
  brokerFlat: number; // MAD
  brokerPerContainer: number; // MAD
  bankRate: number;
  bankMin: number; // MAD
  inlandPerContainer: number; // MAD
  extraCosts: number; // MAD (pénalités, surestaries, imprévus)
}

export interface CalcResult {
  goodsInvoice: number; // MAD, montant facturé par le vendeur
  invoiceCurrency: number; // devise
  preCarriage: number;
  freight: number; // payé par l'acheteur en plus de la facture
  insurance: number;
  freightInValue: number; // fret retenu en valeur en douane
  insuranceInValue: number;
  fob: number; // valeur marchandise au départ (MAD)
  cif: number;
  vd: number;
  di: number;
  tpi: number;
  tic: number;
  tva: number;
  port: number;
  broker: number;
  bank: number;
  inland: number;
  extra: number;
  totalCash: number; // décaissement total y.c. TVA
  costPrice: number; // coût de revient (TVA récupérable exclue)
  unitCost: number;
  warnings: string[];
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function computeImport(i: CalcInput): CalcResult {
  const s = INCOTERM_SCOPE[i.incoterm];
  const warnings: string[] = [];
  const fx = i.fxRate;
  const n = i.containers;

  const baseFca = i.quantity * i.unitPrice; // devise
  const invoiceCurrency = baseFca + i.incotermAdjustPerContainer * n;
  const goodsInvoice = invoiceCurrency * fx;

  // Coûts pris en charge par l'acheteur hors facture
  const preCarriage = s.preCarriage ? 0 : i.preCarriagePerContainer * n * fx;
  const freightCost = i.freightPerContainer * n * fx;
  const freight = s.freight ? 0 : freightCost;
  const insuranceBase = (baseFca * fx + freightCost) * 1.1;
  const insuranceCost = insuranceBase * i.insuranceRate;
  const insurance = s.insurance ? 0 : i.insured ? insuranceCost : 0;
  if (!s.insurance && !i.insured) warnings.push("Marchandise non assurée : le risque de perte pèse entièrement sur l'importateur.");

  // Valeur au départ (FOB/FCA équivalent) et valeur CIF
  const inlandInPrice = s.inland ? i.inlandPerContainer * n : 0;
  const fob = s.freight ? goodsInvoice - freightCost - (s.insurance ? insuranceCost : 0) - inlandInPrice : goodsInvoice + preCarriage;
  const freightInValue = freightCost;
  const insuranceInValue = s.insurance || i.insured ? insuranceCost : 0;
  const cif = fob + freightInValue + insuranceInValue;
  // Les frais postérieurs à l'arrivée au Maroc (transport intérieur) sont exclus de la VD s'ils sont distincts.
  const vd = cif;

  const ddp = s.importClearance;
  if (ddp) warnings.push("DDP : le vendeur étranger devrait accomplir le dédouanement au Maroc — peu réaliste (domiciliation, déclarant agréé). Calcul indicatif.");

  const di = vd * i.dutyRate;
  const tpi = vd * i.tpiRate;
  const tic = i.quantity * (i.excisePerUnit ?? 0);
  const tva = (vd + di + tpi + tic) * i.vatRate;
  const port = i.portPerContainer * n;
  const broker = i.brokerFlat + i.brokerPerContainer * n;
  const bank = Math.max(i.bankMin, goodsInvoice * i.bankRate);
  const inland = s.inland ? 0 : i.inlandPerContainer * n;
  const extra = i.extraCosts;

  const totalCash = goodsInvoice + preCarriage + freight + insurance + di + tpi + tic + tva + port + broker + bank + inland + extra;
  const costPrice = totalCash - tva;
  return {
    goodsInvoice: r2(goodsInvoice), invoiceCurrency: r2(invoiceCurrency), preCarriage: r2(preCarriage), freight: r2(freight),
    insurance: r2(insurance), freightInValue: r2(freightInValue), insuranceInValue: r2(insuranceInValue), fob: r2(fob),
    cif: r2(cif), vd: r2(vd), di: r2(di), tpi: r2(tpi), tic: r2(tic), tva: r2(tva), port: r2(port), broker: r2(broker), bank: r2(bank),
    inland: r2(inland), extra: r2(extra), totalCash: r2(totalCash), costPrice: r2(costPrice),
    unitCost: i.quantity ? costPrice / i.quantity : 0, warnings,
  };
}

export const fmtMAD = (n: number) =>
  new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(Math.round(n)) + ' MAD';
export const fmtNum = (n: number, d = 2) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: d }).format(n);
export const fmtCur = (n: number, c: string) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n) + ' ' + c;
