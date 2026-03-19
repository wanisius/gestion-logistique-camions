package com.logistique.camions.database;

import androidx.lifecycle.LiveData;
import androidx.room.*;
import com.logistique.camions.models.Camion;
import java.util.List;

/**
 * DAO Room pour les opérations CRUD sur les camions.
 */
@Dao
public interface CamionDao {

    @Insert
    long insert(Camion camion);

    @Update
    void update(Camion camion);

    @Delete
    void delete(Camion camion);

    @Query("SELECT * FROM camions ORDER BY heureEntree DESC")
    LiveData<List<Camion>> getAllCamions();

    @Query("SELECT * FROM camions WHERE statut = :statut")
    LiveData<List<Camion>> getCamionsByStatut(String statut);

    @Query("SELECT * FROM camions WHERE id = :id")
    LiveData<Camion> getCamionById(int id);

    @Query("SELECT COUNT(*) FROM camions WHERE statut = 'EN_COURS'")
    LiveData<Integer> countCamionsEnCours();
}
