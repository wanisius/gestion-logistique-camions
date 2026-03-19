package com.logistique.camions.database.remote;

import com.google.firebase.firestore.CollectionReference;
import com.google.firebase.firestore.DocumentChange;
import com.google.firebase.firestore.FirebaseFirestore;
import com.logistique.camions.models.Camion;
import java.util.function.Consumer;
import java.util.List;

/**
 * Repository Firestore — gestion de la persistance cloud.
 *
 * Stratégie de conflit : "Last Write Wins" basé sur le champ lastModified.
 * Le timestamp le plus récent l'emporte lors d'une synchronisation.
 */
public class FirestoreRepository {

    private static final String COLLECTION_CAMIONS = "camions";

    private final CollectionReference camionsRef;

    public FirestoreRepository() {
        this.camionsRef = FirebaseFirestore.getInstance().collection(COLLECTION_CAMIONS);
    }

    /**
     * Envoie un camion vers Firestore.
     * Utilise le firestoreId comme clé document pour éviter les doublons.
     */
    public void saveCamion(Camion camion, Runnable onSuccess, Consumer<Exception> onError) {
        String docId = (camion.getFirestoreId() != null)
            ? camion.getFirestoreId()
            : camionsRef.document().getId();

        camionsRef.document(docId)
            .set(camion)
            .addOnSuccessListener(unused -> {
                camion.setFirestoreId(docId);
                camion.setSyncPending(false);
                if (onSuccess != null) onSuccess.run();
            })
            .addOnFailureListener(e -> {
                // La donnée reste locale avec syncPending=true — sera resynchée plus tard
                if (onError != null) onError.accept(e);
            });
    }

    /**
     * Écoute en temps réel les changements Firestore et les transmet via callback.
     * À appeler au démarrage ou à la reconnexion réseau.
     */
    public void listenForUpdates(Consumer<List<Camion>> onUpdate) {
        camionsRef.addSnapshotListener((snapshots, error) -> {
            if (error != null || snapshots == null) return;

            java.util.ArrayList<Camion> updated = new java.util.ArrayList<>();
            for (DocumentChange dc : snapshots.getDocumentChanges()) {
                if (dc.getType() == DocumentChange.Type.ADDED
                        || dc.getType() == DocumentChange.Type.MODIFIED) {
                    Camion camion = dc.getDocument().toObject(Camion.class);
                    camion.setFirestoreId(dc.getDocument().getId());
                    camion.setSyncPending(false);
                    updated.add(camion);
                }
            }
            if (!updated.isEmpty()) onUpdate.accept(updated);
        });
    }

    /** Synchronise tous les camions avec syncPending=true (ex: après reconnexion réseau). */
    public void syncPendingCamions(List<Camion> pendingCamions) {
        for (Camion camion : pendingCamions) {
            saveCamion(camion, null, null);
        }
    }
}
