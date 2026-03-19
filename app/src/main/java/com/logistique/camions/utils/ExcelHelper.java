package com.logistique.camions.utils;

import android.content.Context;
import android.net.Uri;
import android.os.Environment;
import com.logistique.camions.models.Camion;
import java.io.*;
import java.text.SimpleDateFormat;
import java.util.*;

/**
 * Utilitaire d'import et d'export Excel pour les camions.
 *
 * Format attendu pour l'import (.xlsx ou .csv) :
 *   Colonne 0 : immatriculation (obligatoire)
 *   Colonne 1 : chauffeur       (obligatoire)
 *   Colonne 2 : typeMarchandise (obligatoire)
 *   Colonne 3 : observations    (optionnel)
 *
 * Note : Apache POI (était trop lourd pour Android).
 * On utilise un parser CSV léger pour les fichiers exportés depuis Excel
 * via "Enregistrer sous > CSV".
 * Pour un import .xlsx natif, intégrer la lib 'fastexcel' (voir build.gradle).
 */
public class ExcelHelper {

    public static final int COL_IMMATRICULATION = 0;
    public static final int COL_CHAUFFEUR       = 1;
    public static final int COL_TYPE            = 2;
    public static final int COL_OBSERVATIONS    = 3;

    /** Résultat d'un import : lignes validées + erreurs. */
    public static class ImportResult {
        public final List<Camion> camions = new ArrayList<>();
        public final List<String> errors  = new ArrayList<>();
        public int totalLines = 0;
    }

    /**
     * Importe un fichier CSV (export Excel) depuis un Uri Android.
     * Retourne un ImportResult avec les camions valides et les erreurs ligne par ligne.
     */
    public static ImportResult importFromCsv(Context context, Uri uri) {
        ImportResult result = new ImportResult();
        try (InputStream is = context.getContentResolver().openInputStream(uri);
             BufferedReader reader = new BufferedReader(new InputStreamReader(is))) {

            String line;
            int lineNumber = 0;

            while ((line = reader.readLine()) != null) {
                lineNumber++;
                result.totalLines = lineNumber;

                // Ignorer la ligne d'en-tête
                if (lineNumber == 1) continue;
                if (line.trim().isEmpty()) continue;

                String[] cols = line.split(";", -1);

                // Validation des colonnes obligatoires
                if (cols.length < 3) {
                    result.errors.add("Ligne " + lineNumber + " : colonnes insuffisantes");
                    continue;
                }
                String immat = cols[COL_IMMATRICULATION].trim();
                String chauffeur = cols[COL_CHAUFFEUR].trim();
                String type = cols[COL_TYPE].trim();

                if (immat.isEmpty() || chauffeur.isEmpty() || type.isEmpty()) {
                    result.errors.add("Ligne " + lineNumber + " : champ obligatoire manquant");
                    continue;
                }

                Camion camion = new Camion(immat, chauffeur, type);
                if (cols.length > COL_OBSERVATIONS) {
                    camion.setObservations(cols[COL_OBSERVATIONS].trim());
                }
                result.camions.add(camion);
            }

        } catch (IOException e) {
            result.errors.add("Erreur lecture fichier : " + e.getMessage());
        }
        return result;
    }

    /**
     * Exporte une liste de camions en fichier CSV dans le dossier Downloads.
     * Compatible Excel (séparateur point-virgule, encodage UTF-8 BOM).
     */
    public static File exportToCsv(Context context, List<Camion> camions) throws IOException {
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
        SimpleDateFormat sdfTime = new SimpleDateFormat("HH:mm", Locale.getDefault());
        String filename = "rapport_camions_" + sdf.format(new Date()) + ".csv";

        File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
        File file = new File(downloadsDir, filename);

        try (FileOutputStream fos = new FileOutputStream(file);
             OutputStreamWriter writer = new OutputStreamWriter(fos, "UTF-8")) {

            // BOM UTF-8 pour compatibilité Excel
            fos.write(0xEF);
            fos.write(0xBB);
            fos.write(0xBF);

            // En-tête
            writer.write("Immatriculation;Chauffeur;Type marchandise;Heure entrée;Heure sortie;Durée (min);Statut;Quai;Observations\n");

            // Lignes
            for (Camion c : camions) {
                writer.write(String.join(";",
                    safe(c.getImmatriculation()),
                    safe(c.getChauffeur()),
                    safe(c.getTypeMarchandise()),
                    c.getHeureEntree() != null ? sdfTime.format(c.getHeureEntree()) : "",
                    c.getHeureSortie() != null ? sdfTime.format(c.getHeureSortie()) : "En cours",
                    c.getDureePassageMinutes() != null ? String.valueOf(c.getDureePassageMinutes()) : "",
                    safe(c.getStatut()),
                    safe(c.getQuai()),
                    safe(c.getObservations())
                ) + "\n");
            }
        }
        return file;
    }

    private static String safe(String s) {
        return s != null ? s.replace(";", ",") : "";
    }
}
