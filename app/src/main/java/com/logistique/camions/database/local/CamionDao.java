package com.logistique.camions.database.local;

import androidx.lifecycle.LiveData;
import androidx.room.*;
import com.logistique.camions.models.Camion;
import java.util.List;

/**
 * DAO Room pour les opérations CRUD sur les camions.
 * Toutes les requêtes retournent des LiveData — l'UI se met à jour automatiquement.
 */
@Dao
public interface CamionDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    long insert(Camion camion);

    @Update
    void update(Camion camion);

    @Delete
    void delete(Camion camion);

    /** Upsert : insère ou remplace (utile pour la sync Firestore). */
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void upsert(Camion camion);

    @Query("SELECT * FROM camions ORDER BY heureEntree DESC")
    LiveData<List<Camion>> getAllCamions();

    @Query("SELECT * FROM camions WHERE statut = :statut ORDER BY heureEntree DESC")
    LiveData<List<Camion>> getCamionsByStatut(String statut);

    @Query("SELECT * FROM camions WHERE id = :id")
    LiveData<Camion> getCamionById(int id);

    @Query("SELECT * FROM camions WHERE date(heureEntree / 1000, 'unixepoch') = date('now')")
    LiveData<List<Camion>> getCamionsAujourdhui();

    @Query("SELECT * FROM camions WHERE immatriculation LIKE '%' || :query || '%' OR chauffeur LIKE '%' || :query || '%'")
    LiveData<List<Camion>> search(String query);

    @Query("SELECT COUNT(*) FROM camions WHERE statut = 'EN_COURS'")
    LiveData<Integer> countCamionsEnCours();

    @Query("SELECT COUNT(*) FROM camions WHERE statut = 'EN_ATTENTE'")
    LiveData<Integer> countCamionsEnAttente();

    /** Pour l'export Excel : liste brute (non observable). */
    @Query("SELECT * FROM camions WHERE date(heureEntree / 1000, 'unixepoch') = date('now')")
    List<Camion> getCamionsAujourdhuiSync();
}
