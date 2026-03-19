package com.logistique.camions.models;

import androidx.room.Entity;
import androidx.room.ForeignKey;
import androidx.room.PrimaryKey;
import java.util.Date;

/**
 * Entité représentant un pointage (entrée ou sortie) d'un camion.
 */
@Entity(
    tableName = "pointages",
    foreignKeys = @ForeignKey(
        entity = Camion.class,
        parentColumns = "id",
        childColumns = "camionId",
        onDelete = ForeignKey.CASCADE
    )
)
public class Pointage {

    @PrimaryKey(autoGenerate = true)
    private int id;

    private int camionId;          // Référence au camion
    private String typePointage;   // ENTREE ou SORTIE
    private Date dateHeure;        // Horodatage
    private String agent;          // Agent ayant effectué le pointage
    private String commentaire;

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public int getCamionId() { return camionId; }
    public void setCamionId(int camionId) { this.camionId = camionId; }

    public String getTypePointage() { return typePointage; }
    public void setTypePointage(String type) { this.typePointage = type; }

    public Date getDateHeure() { return dateHeure; }
    public void setDateHeure(Date dateHeure) { this.dateHeure = dateHeure; }

    public String getAgent() { return agent; }
    public void setAgent(String agent) { this.agent = agent; }

    public String getCommentaire() { return commentaire; }
    public void setCommentaire(String commentaire) { this.commentaire = commentaire; }
}
