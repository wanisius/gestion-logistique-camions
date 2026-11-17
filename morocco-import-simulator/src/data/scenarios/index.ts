import type { Scenario } from '../../engine/types';
import canettes from './canettes.json';

/** Scénarios jouables (moteur JSON). Ajouter un scénario = ajouter un fichier JSON et l'enregistrer ici. */
export const SCENARIOS: Record<string, Scenario> = {
  canettes: canettes as unknown as Scenario,
};

/** Catalogue de la progression pédagogique (les scénarios non disponibles sont en préparation). */
export const CATALOG: { id: string; title: string; level: string; summary: string; available: boolean; icon: string; focus: string[] }[] = [
  { id: 'ordinateurs', icon: '💻', title: 'Scénario 1 — 100 ordinateurs de Chine', level: 'Débutant', available: false, summary: 'Négociation, pro forma, transport, domiciliation, dédouanement, livraison.', focus: ['Bases', 'Droit commun', 'Fret maritime LCL'] },
  { id: 'agro', icon: '🧃', title: 'Scénario 2 — Ingrédients pour boissons (UE)', level: 'Intermédiaire', available: false, summary: 'Certificats sanitaires, contrôle ONSSA, analyses, traçabilité.', focus: ['ONSSA', 'Laboratoire', 'Traçabilité'] },
  { id: 'machine', icon: '⚙️', title: 'Scénario 3 — Machine industrielle (Allemagne)', level: 'Intermédiaire', available: false, summary: 'Classement tarifaire, documentation technique, assurance, Incoterms, régimes/avantages.', focus: ['Classement', 'Assurance', 'Régimes'] },
  { id: 'canettes', icon: '🥫', title: 'Scénario 4 — Canettes en aluminium (20 conteneurs)', level: 'Intermédiaire — industriel', available: true, summary: canettes.summary, focus: ['Domiciliation', 'Origine préférentielle', 'BADR', 'Livraisons échelonnées'] },
  { id: 'expert', icon: '🌐', title: 'Scénario 5 — Multi-origines (expert)', level: 'Expert', available: false, summary: 'Plusieurs marchandises et pays, retards, litiges, anomalies, inspections, contraintes bancaires.', focus: ['Multi-dossiers', 'Litiges', 'Incidents'] },
];
