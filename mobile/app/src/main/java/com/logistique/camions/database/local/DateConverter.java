package com.logistique.camions.database.local;

import androidx.room.TypeConverter;
import java.util.Date;

/**
 * Convertisseur Room pour le type java.util.Date.
 * Room ne sait pas sérialiser Date nativement — on le stocke en Long (timestamp ms).
 */
public class DateConverter {

    @TypeConverter
    public static Date fromTimestamp(Long value) {
        return value == null ? null : new Date(value);
    }

    @TypeConverter
    public static Long dateToTimestamp(Date date) {
        return date == null ? null : date.getTime();
    }
}
