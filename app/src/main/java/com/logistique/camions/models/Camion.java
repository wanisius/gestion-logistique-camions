package com.logistique.camions.models;

import androidx.room.Entity;
import androidx.room.Ignore;
import androidx.room.PrimaryKey;
import java.util.Date;

/**
 * Entité Room représentant un camion enregistré sur le site.
 *
 * Champs de sync Firestore : firestoreId, syncPending, lastModified.
 * Stratégie de conflit : le lastModified le plus récent l'emporte.
 */
@Entity(tableName = "camions")
public class Camion {

    // --- Persistance locale (Room) ---
    @PrimaryKey(autoGenerate = true)
    private int id;

    private String immatriculation;   // Plaque du véhicule
    private String chauffeur;         // Nom complet du chauffeur
    private String typeMarchandise;   // Nature de la cargaison
    private Date heureEntree;         // Horodatage d'arrivée
    private Date heureSortie;         // Horodatage de départ (null si encore sur site)
    private String statut;            // EN_ATTENTE | EN_COURS | SORTI
    private String observations;      // Notes libres
    private String quai;              // Quai attribué (optionnel)

    // --- Synchronisation Firestore ---
    private String firestoreId;       // ID document Firestore
    private boolean syncPending;      // true = modification locale non encore syncée
    private long lastModified;        // Timestamp ms — arbitre les conflits

    // --- Constantes de statut ---
    public static final String STATUT_EN_ATTENTE = "EN_ATTENTE";
    public static final String STATUT_EN_COURS   = "EN_COURS";
    public static final String STATUT_SORTI      = "SORTI";

    public Camion() {}

    @Ignore
    public Camion(String immatriculation, String chauffeur, String typeMarchandise) {
        this.immatriculation = immatriculation;
        this.chauffeur = chauffeur;
        this.typeMarchandise = typeMarchandise;
        this.heureEntree = new Date();
        this.statut = STATUT_EN_ATTENTE;
        this.syncPending = true;
        this.lastModified = System.currentTimeMillis();
    }

    // --- Getters & Setters ---
    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public String getImmatriculation() { return immatriculation; }
    public void setImmatriculation(String v) { this.immatriculation = v; this.lastModified = System.currentTimeMillis(); }

    public String getChauffeur() { return chauffeur; }
    public void setChauffeur(String v) { this.chauffeur = v; this.lastModified = System.currentTimeMillis(); }

    public String getTypeMarchandise() { return typeMarchandise; }
    public void setTypeMarchandise(String v) { this.typeMarchandise = v; }

    public Date getHeureEntree() { return heureEntree; }
    public void setHeureEntree(Date v) { this.heureEntree = v; }

    public Date getHeureSortie() { return heureSortie; }
    public void setHeureSortie(Date v) { this.heureSortie = v; this.lastModified = System.currentTimeMillis(); }

    public String getStatut() { return statut; }
    public void setStatut(String v) { this.statut = v; this.lastModified = System.currentTimeMillis(); }

    public String getObservations() { return observations; }
    public void setObservations(String v) { this.observations = v; }

    public String getQuai() { return quai; }
    public void setQuai(String v) { this.quai = v; }

    public String getFirestoreId() { return firestoreId; }
    public void setFirestoreId(String v) { this.firestoreId = v; }

    public boolean isSyncPending() { return syncPending; }
    public void setSyncPending(boolean v) { this.syncPending = v; }

    public long getLastModified() { return lastModified; }
    public void setLastModified(long v) { this.lastModified = v; }

    /** Durée de passage en minutes (null si camion encore sur site). */
    public Long getDureePassageMinutes() {
        if (heureEntree == null || heureSortie == null) return null;
        return (heureSortie.getTime() - heureEntree.getTime()) / 60000;
    }
}
