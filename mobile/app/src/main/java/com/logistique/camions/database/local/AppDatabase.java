package com.logistique.camions.database.local;

import android.content.Context;
import androidx.room.Database;
import androidx.room.Room;
import androidx.room.RoomDatabase;
import androidx.room.TypeConverters;
import androidx.room.migration.Migration;
import androidx.sqlite.db.SupportSQLiteDatabase;
import com.logistique.camions.models.Camion;
import com.logistique.camions.models.Pointage;

/**
 * Base de données Room — singleton, source de vérité locale.
 * Utiliser AppDatabase.getInstance(context) pour accéder aux DAO.
 */
@Database(
    entities = {Camion.class, Pointage.class},
    version = 1,
    exportSchema = true
)
@TypeConverters({DateConverter.class})
public abstract class AppDatabase extends RoomDatabase {

    private static volatile AppDatabase INSTANCE;

    public abstract CamionDao camionDao();
    public abstract PointageDao pointageDao();

    // --- Migrations ---
    // Exemple pour la version 2 (ajouter un champ 'quai') :
    // static final Migration MIGRATION_1_2 = new Migration(1, 2) {
    //     @Override public void migrate(SupportSQLiteDatabase db) {
    //         db.execSQL("ALTER TABLE camions ADD COLUMN quai TEXT");
    //     }
    // };

    public static AppDatabase getInstance(Context context) {
        if (INSTANCE == null) {
            synchronized (AppDatabase.class) {
                if (INSTANCE == null) {
                    INSTANCE = Room.databaseBuilder(
                            context.getApplicationContext(),
                            AppDatabase.class,
                            "logistique_camions.db"
                        )
                        // .addMigrations(MIGRATION_1_2)  // activer lors d'évolutions de schéma
                        .fallbackToDestructiveMigration() // dev uniquement — retirer en production
                        .build();
                }
            }
        }
        return INSTANCE;
    }
}
