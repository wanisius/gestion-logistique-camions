package com.logistique.camions.viewmodels;

import android.app.Application;
import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import androidx.lifecycle.Transformations;
import com.logistique.camions.models.Camion;
import com.logistique.camions.repository.CamionRepository;
import java.util.List;

/**
 * ViewModel pour les écrans liés aux camions.
 * Survit aux rotations d'écran. Ne référence jamais de Context UI.
 */
public class CamionViewModel extends AndroidViewModel {

    private final CamionRepository repository;

    private final MutableLiveData<String> searchQuery = new MutableLiveData<>("");
    private final MutableLiveData<String> statutFilter = new MutableLiveData<>(null);

    public final LiveData<List<Camion>> camionsAujourdhui;
    public final LiveData<List<Camion>> camionsFiltrés;
    public final LiveData<Integer> countEnCours;

    public CamionViewModel(@NonNull Application application) {
        super(application);
        repository = new CamionRepository(application);

        camionsAujourdhui = repository.getCamionsAujourdhui();
        countEnCours = repository.countCamionsEnCours();

        // Recherche réactive : LiveData mis à jour à chaque frappe
        camionsFiltrés = Transformations.switchMap(searchQuery, query -> {
            if (query == null || query.isEmpty()) {
                return repository.getAllCamions();
            }
            return repository.search(query);
        });
    }

    public void setSearchQuery(String query) {
        searchQuery.setValue(query);
    }

    public void setStatutFilter(String statut) {
        statutFilter.setValue(statut);
    }

    /** Enregistre un nouveau camion entrant. */
    public void enregistrerCamion(String immatriculation, String chauffeur, String type) {
        Camion camion = new Camion(immatriculation, chauffeur, type);
        repository.insert(camion);
    }

    /** Pointe la sortie d'un camion. */
    public void pointerSortie(Camion camion) {
        camion.setHeureSortie(new java.util.Date());
        camion.setStatut(Camion.STATUT_SORTI);
        repository.update(camion);
    }

    /** Passe un camion en cours (quai attribué). */
    public void marquerEnCours(Camion camion, String quai) {
        camion.setStatut(Camion.STATUT_EN_COURS);
        camion.setQuai(quai);
        repository.update(camion);
    }
}
