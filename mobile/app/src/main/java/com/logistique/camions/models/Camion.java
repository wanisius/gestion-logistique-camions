package com.logistique.camions.models;

import androidx.room.Entity;
import androidx.room.PrimaryKey;
import java.util.Date;

/**
 * Entité représentant un camion enregistré dans le système.
 */
@Entity(tableName = "camions")
public class Camion {

    @PrimaryKey(autoGenerate = true)
    private int id;

    private String immatriculation;   // Numéro de plaque
    private String chauffeur;         // Nom du chauffeur
    private String typeMarchandise;   // Type de cargaison
    private Date heureEntree;         // Heure d'arrivée
    private Date heureSortie;         // Heure de départ
    private String statut;            // EN_ATTENTE, EN_COURS, SORTI
    private String observations;      // Notes libres

    // Getters et setters à générer
    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public String getImmatriculation() { return immatriculation; }
    public void setImmatriculation(String immatriculation) { this.immatriculation = immatriculation; }

    public String getChauffeur() { return chauffeur; }
    public void setChauffeur(String chauffeur) { this.chauffeur = chauffeur; }

    public String getStatut() { return statut; }
    public void setStatut(String statut) { this.statut = statut; }

    public Date getHeureEntree() { return heureEntree; }
    public void setHeureEntree(Date heureEntree) { this.heureEntree = heureEntree; }

    public Date getHeureSortie() { return heureSortie; }
    public void setHeureSortie(Date heureSortie) { this.heureSortie = heureSortie; }

    public String getTypeMarchandise() { return typeMarchandise; }
    public void setTypeMarchandise(String type) { this.typeMarchandise = type; }

    public String getObservations() { return observations; }
    public void setObservations(String observations) { this.observations = observations; }
}
