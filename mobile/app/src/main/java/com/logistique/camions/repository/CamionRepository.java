package com.logistique.camions.repository;

import android.content.Context;
import androidx.lifecycle.LiveData;
import com.logistique.camions.database.local.AppDatabase;
import com.logistique.camions.database.local.CamionDao;
import com.logistique.camions.database.local.PointageDao;
import com.logistique.camions.database.remote.FirestoreRepository;
import com.logistique.camions.models.Camion;
import com.logistique.camions.models.Pointage;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Repository — source unique de vérité pour les données camions.
 *
 * Coordonne Room (local, offline-first) et Firestore (cloud, sync asynchrone).
 * Les ViewModels ne parlent qu'à ce Repository, jamais directement aux DAO.
 *
 * Stratégie offline-first :
 *   1. L'écriture va d'abord en Room (immédiat, fonctionne hors ligne)
 *   2. Puis en Firestore de façon asynchrone (syncPending=true tant que non syncé)
 *   3. La lecture vient toujours de Room via LiveData
 *   4. Firestore pousse les mises à jour distantes vers Room via listenForUpdates
 */
public class CamionRepository {

    private final CamionDao camionDao;
    private final PointageDao pointageDao;
    private final FirestoreRepository firestoreRepo;
    private final ExecutorService executor = Executors.newFixedThreadPool(3);

    public CamionRepository(Context context) {
        AppDatabase db = AppDatabase.getInstance(context);
        this.camionDao = db.camionDao();
        this.pointageDao = db.pointageDao();
        this.firestoreRepo = new FirestoreRepository();

        // Démarrer l'écoute Firestore pour sync en temps réel
        startFirestoreSync();
    }

    // --- Lecture (toujours depuis Room) ---

    public LiveData<List<Camion>> getAllCamions() {
        return camionDao.getAllCamions();
    }

    public LiveData<List<Camion>> getCamionsByStatut(String statut) {
        return camionDao.getCamionsByStatut(statut);
    }

    public LiveData<List<Camion>> getCamionsAujourdhui() {
        return camionDao.getCamionsAujourdhui();
    }

    public LiveData<List<Camion>> search(String query) {
        return camionDao.search(query);
    }

    public LiveData<Integer> countCamionsEnCours() {
        return camionDao.countCamionsEnCours();
    }

    // --- Écriture (Room d'abord, Firestore ensuite) ---

    public void insert(Camion camion) {
        executor.execute(() -> {
            long localId = camionDao.insert(camion);
            camion.setId((int) localId);
            // Sync cloud asynchrone
            firestoreRepo.saveCamion(camion,
                () -> { camion.setSyncPending(false); camionDao.update(camion); },
                e -> { /* syncPending reste true — sera resynché plus tard */ }
            );
        });
    }

    public void update(Camion camion) {
        executor.execute(() -> {
            camion.setSyncPending(true);
            camionDao.update(camion);
            firestoreRepo.saveCamion(camion,
                () -> { camion.setSyncPending(false); camionDao.update(camion); },
                e -> { /* retry lors de la prochaine connexion */ }
            );
        });
    }

    public void delete(Camion camion) {
        executor.execute(() -> camionDao.delete(camion));
    }

    // --- Pointages ---

    public void insertPointage(Pointage pointage) {
        executor.execute(() -> pointageDao.insert(pointage));
    }

    public LiveData<List<Pointage>> getPointagesByCamion(int camionId) {
        return pointageDao.getPointagesByCamion(camionId);
    }

    // --- Sync Firestore → Room ---

    private void startFirestoreSync() {
        firestoreRepo.listenForUpdates(updatedCamions -> {
            executor.execute(() -> {
                for (Camion remote : updatedCamions) {
                    // TODO: récupérer le camion local par firestoreId et comparer lastModified
                    camionDao.upsert(remote);
                }
            });
        });
    }

    /** Rejouer les écritures en attente après reconnexion réseau. */
    public void retrySyncPending() {
        executor.execute(() -> {
            // TODO: requête Room pour WHERE syncPending = 1
            // firestoreRepo.syncPendingCamions(pendingList);
        });
    }
}
