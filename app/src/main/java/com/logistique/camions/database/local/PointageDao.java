package com.logistique.camions.database.local;

import androidx.lifecycle.LiveData;
import androidx.room.*;
import com.logistique.camions.models.Pointage;
import java.util.List;

/**
 * DAO Room pour les opérations CRUD sur les pointages.
 */
@Dao
public interface PointageDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    long insert(Pointage pointage);

    @Update
    void update(Pointage pointage);

    @Delete
    void delete(Pointage pointage);

    @Query("SELECT * FROM pointages WHERE camionId = :camionId ORDER BY dateHeure DESC")
    LiveData<List<Pointage>> getPointagesByCamion(int camionId);

    @Query("SELECT * FROM pointages WHERE date(dateHeure / 1000, 'unixepoch') = date('now') ORDER BY dateHeure DESC")
    LiveData<List<Pointage>> getPointagesAujourdhui();

    @Query("SELECT * FROM pointages WHERE typePointage = :type ORDER BY dateHeure DESC")
    LiveData<List<Pointage>> getPointagesByType(String type);

    @Query("SELECT COUNT(*) FROM pointages WHERE date(dateHeure / 1000, 'unixepoch') = date('now')")
    LiveData<Integer> countPointagesAujourdhui();

    /** Dernier pointage d'un camion (pour calculer la durée de passage). */
    @Query("SELECT * FROM pointages WHERE camionId = :camionId ORDER BY dateHeure DESC LIMIT 1")
    Pointage getLastPointageByCamion(int camionId);
}
