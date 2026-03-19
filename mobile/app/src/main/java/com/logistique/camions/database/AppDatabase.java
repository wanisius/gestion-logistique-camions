package com.logistique.camions.database;

import android.content.Context;
import androidx.room.Database;
import androidx.room.Room;
import androidx.room.RoomDatabase;
import androidx.room.TypeConverters;
import com.logistique.camions.models.Camion;
import com.logistique.camions.models.Pointage;

/**
 * Base de données Room de l'application.
 * Singleton — utiliser AppDatabase.getInstance(context) pour y accéder.
 */
@Database(entities = {Camion.class, Pointage.class}, version = 1, exportSchema = false)
@TypeConverters({DateConverter.class})
public abstract class AppDatabase extends RoomDatabase {

    private static volatile AppDatabase INSTANCE;

    public abstract CamionDao camionDao();
    public abstract PointageDao pointageDao();

    public static AppDatabase getInstance(Context context) {
        if (INSTANCE == null) {
            synchronized (AppDatabase.class) {
                if (INSTANCE == null) {
                    INSTANCE = Room.databaseBuilder(
                        context.getApplicationContext(),
                        AppDatabase.class,
                        "logistique_camions.db"
                    ).build();
                }
            }
        }
        return INSTANCE;
    }
}
