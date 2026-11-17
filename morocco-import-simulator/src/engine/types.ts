// Types du moteur de scénarios. Un scénario est un fichier JSON conforme à `Scenario`.

export type Mode = 'decouverte' | 'professionnel' | 'expert' | 'examen';
export type Quality = 'best' | 'ok' | 'bad';
export type PhaseId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I';

export type SpaceId =
  | 'bureau' | 'fournisseurs' | 'portnet' | 'banque' | 'transitaire' | 'port'
  | 'terminal' | 'douane' | 'labo' | 'camions' | 'entrepot' | 'carte';

/** Effets d'une décision sur la simulation. */
export interface Effects {
  /** Coût ajouté (MAD) avec libellé pour le grand livre. */
  cost?: { label: string; amount: number; category?: CostCategory };
  /** Coût calculé par le moteur (clé du calcul de revient). */
  commit?: CommitKey[];
  days?: number;
  compliance?: number;
  set?: Record<string, string | number | boolean>;
  /** Documents ajoutés à l'inventaire. */
  docs?: string[];
  /** Jours ajoutés selon le fournisseur choisi (délai de fabrication ou de transit). */
  daysFrom?: 'production' | 'transit';
  /** Jours passés par les conteneurs au terminal (servent au calcul des surestaries). */
  portDays?: number;
  /** Facture les surestaries au-delà de la franchise. */
  settleDemurrage?: boolean;
}

export type CostCategory =
  | 'marchandise' | 'transport' | 'assurance' | 'droits' | 'tva' | 'port'
  | 'transitaire' | 'banque' | 'national' | 'penalites' | 'autres';

export type CommitKey =
  | 'goods' | 'freight' | 'insurance' | 'duties' | 'vat' | 'tpi' | 'port' | 'broker' | 'bank' | 'inland' | 'preCarriage';

export interface QualityBy { var: string; map: Record<string, Quality> }

export interface Option {
  id: string;
  label: string;
  detail?: string;
  quality?: Quality;
  qualityBy?: QualityBy;
  feedback: string;
  effects?: Effects;
  /** Effets supplémentaires selon la qualité finale (utile avec qualityBy). */
  effectsIf?: Partial<Record<Quality, Effects>>;
  /** Effets supplémentaires selon la valeur d'une variable (ex. assurance souscrite). */
  effectsVar?: { var: string; map: Record<string, Effects> };
}

export interface FormField {
  id: string;
  label: string;
  options: string[];
  /** Réponse attendue : littérale, ou par variable (ex. supplier → valeur). Peut contenir {{templates}}. */
  answer: string | { var: string; map: Record<string, string> };
  help?: string;
}

export interface CalcField {
  id: 'cif' | 'vd' | 'di' | 'tpi' | 'tva' | 'totalCash';
  label: string;
}

export interface Step {
  id: string;
  phase: PhaseId;
  title: string;
  location: SpaceId;
  actor: string;
  type: 'choice' | 'multi' | 'docCheck' | 'form' | 'calc' | 'scene' | 'info';
  intro: string;
  hint?: string;
  explanation: string;
  sources?: string[];
  options?: Option[];
  document?: string;
  form?: { system: 'portnet' | 'badr' | 'banque'; fields: FormField[] };
  calc?: CalcField[];
  scene?: 'map' | 'port' | 'trucks' | 'warehouse' | 'lab' | 'circuit' | 'factory';
  widget?: 'suppliers' | 'incoterms' | 'payment';
  /** Étape facultative déclenchée aléatoirement (incident). Probabilité par mode. */
  chance?: Partial<Record<Mode, number>>;
  /** Conditions d'affichage : variable dont la valeur doit appartenir à la liste. */
  requires?: { var: string; in: (string | number | boolean)[] };
  effects?: Effects;
  docsGained?: string[];
}

export interface Supplier {
  id: string;
  name: string;
  country: string;
  flag: string;
  city: string;
  port: string;
  currency: 'EUR' | 'USD' | 'MAD';
  unitPrice: number;
  productionDays: number;
  transitDays: number;
  freightPerContainer: number; // en devise du fournisseur
  preCarriagePerContainer: number; // usine → terminal (en devise)
  dutyRate: number; // taux DI appliqué dans le jeu (décimal)
  dutyStatus: string; // explication / statut de vérification du taux
  originProof: string;
  agreement: string;
  rating: { qualite: number; fiabilite: number; certifs: string[] };
  notes: string;
  route: [number, number][]; // coordonnées sur la carte schématique (viewBox 1000x500)
}

export interface Scenario {
  id: string;
  title: string;
  subtitle: string;
  level: string;
  available: boolean;
  summary: string;
  company: { name: string; ice: string; city: string; activity: string; rc: string };
  goods: {
    description: string;
    quantity: number;
    unit: string;
    containers: number;
    containerType: string;
    perContainer: number;
    palletsPerContainer: number;
    grossKgPerContainer: number;
    hsCode: string;
    hsLabel: string;
    nationalCode: string;
  };
  deadlineDays: number;
  stockoutPenaltyPerDay: number;
  budgetMAD: number;
  fx: Record<string, number>;
  fxNote: string;
  incotermPriceAdjust: Record<string, number>; // ajustement en devise par conteneur selon l'Incoterm
  fees: {
    insuranceRate: number;
    tpiRate: number;
    vatRate: number;
    portPerContainer: number;
    brokerFlat: number;
    brokerPerContainer: number;
    bankRate: Record<string, number>;
    bankMin: number;
    inlandPerContainer: number;
    freeDaysPort: number;
    demurragePerContainerDay: number;
  };
  suppliers: Supplier[];
  characters: Record<string, { name: string; role: string; avatar: string }>;
  steps: Step[];
}

export interface LogEntry {
  stepId: string;
  phase: PhaseId;
  title: string;
  quality: Quality;
  points: number;
  max: number;
  message: string;
  explanation: string;
  day: number;
}

export interface LedgerEntry { label: string; amount: number; category: CostCategory; day: number }

export interface GameState {
  version: 1;
  scenarioId: string;
  mode: Mode;
  playerName: string;
  stepIndex: number;
  /** Liste des étapes actives (après tirage des incidents). */
  activeSteps: string[];
  vars: Record<string, string | number | boolean>;
  day: number;
  compliance: number;
  points: number;
  maxPoints: number;
  ledger: LedgerEntry[];
  log: LogEntry[];
  docs: string[];
  hintsUsed: number;
  finished: boolean;
  startedAt: string;
  updatedAt: string;
}
