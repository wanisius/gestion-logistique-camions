package com.logistique.camions.utils;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/** Utilitaires de formatage et calcul de dates. */
public class DateUtils {

    private static final SimpleDateFormat FMT_HEURE   = new SimpleDateFormat("HH:mm", Locale.getDefault());
    private static final SimpleDateFormat FMT_DATE    = new SimpleDateFormat("dd/MM/yyyy", Locale.getDefault());
    private static final SimpleDateFormat FMT_COMPLET = new SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault());

    public static String formatHeure(Date date) {
        return date != null ? FMT_HEURE.format(date) : "--:--";
    }

    public static String formatDate(Date date) {
        return date != null ? FMT_DATE.format(date) : "";
    }

    public static String formatDateHeure(Date date) {
        return date != null ? FMT_COMPLET.format(date) : "";
    }

    /** Durée lisible : "2h 15min" ou "45 min". */
    public static String formatDuree(Long minutes) {
        if (minutes == null) return "En cours";
        if (minutes < 60) return minutes + " min";
        return (minutes / 60) + "h " + (minutes % 60) + "min";
    }
}
