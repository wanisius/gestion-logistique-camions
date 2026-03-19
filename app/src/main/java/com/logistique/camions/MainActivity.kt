package com.logistique.camions

import android.app.DatePickerDialog
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.snapshots.SnapshotStateList
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.FileProvider
import org.apache.poi.ss.usermodel.BorderStyle
import org.apache.poi.ss.usermodel.CellType
import org.apache.poi.ss.usermodel.DateUtil
import org.apache.poi.ss.usermodel.FillPatternType
import org.apache.poi.ss.usermodel.HorizontalAlignment
import org.apache.poi.ss.usermodel.IndexedColors
import org.apache.poi.xssf.usermodel.XSSFWorkbook
import org.json.JSONArray
import org.json.JSONObject
import com.google.firebase.database.DataSnapshot
import com.google.firebase.database.DatabaseError
import com.google.firebase.database.FirebaseDatabase
import com.google.firebase.database.ValueEventListener
import java.io.File
import java.io.FileOutputStream
import java.util.Calendar

// ══════════════════════════════════════════════════════════════════════════════
// COULEURS
// ══════════════════════════════════════════════════════════════════════════════
private val Navy       = Color(0xFF0A1628)
private val NavyLight  = Color(0xFF162040)
private val Gold       = Color(0xFFD4A843)
private val GoldLight  = Color(0xFFF0C96A)
private val Cream      = Color(0xFFFAF6EE)
private val CreamDark  = Color(0xFFF0E8D8)
private val White      = Color(0xFFFFFFFF)
private val TextMedium = Color(0xFF4A5568)
private val TextLight  = Color(0xFF8A9BB0)
private val Success    = Color(0xFF2E7D32)
private val Warning    = Color(0xFFE0A800)
private val Danger     = Color(0xFFC62828)
private val Info       = Color(0xFF1565C0)
private val Brown      = Color(0xFF6D4C41)
private val Teal       = Color(0xFF00796B)
private val Purple     = Color(0xFF6A1B9A)

private fun statutColor(statut: String): Color = when (statut) {
    "En attente"             -> Warning
    "En cours de chargement" -> Info
    "Chargé"                 -> Success
    "Refus de chargement"    -> Danger
    "Non disponible"         -> Brown
    "Départ validé"          -> Teal
    else                     -> TextLight
}

private val listeStatutsMagasinier = listOf(
    "En attente", "En cours de chargement", "Chargé", "Refus de chargement", "Non disponible"
)
private val listeStatutsAffichage = listOf(
    "En attente", "En cours de chargement", "Chargé", "Refus de chargement", "Non disponible", "Départ validé"
)
private val listeHeures: List<String> = buildList {
    for (h in 0..23) { add("%02d:00".format(h)); add("%02d:30".format(h)) }
}
private val listeTonnages      = listOf("14T", "25T")
private val listeTypeTransport = listOf("Location", "LUI-MEME")

private val listeTransporteurs = listOf(
    "4 MINA-TRAVAUX", "A.M TRANS", "ABDA RIDER SARL", "ABDELILAH ERRAMI",
    "ADDAMANT HADDAOUI", "ALAOUI LOGISTIQUE", "BERRECHID TRANSPORT SARL",
    "BRAHIM BOUDDI", "BUENO TRANS", "COMPTOIRE SERVICE",
    "EKI NAKL LOGISTICS GROUP", "FRELOG", "GOOD MAN TRANS", "GOODEX",
    "FGOODRIDA", "HJM LOGISTICS", "KRIOUACH TRANS", "LDIS MAROC SARL",
    "LENS TRUCK", "LUI-MEME", "M.R.K.T TRANSPORT", "MARKIZ",
    "MILOUD MARDY", "MIRAMOU TRANS SERVICE", "MORSSI ISSAM", "NABIL CHLIYEH",
    "STE GILYANE TRANSIT", "STE MZAMZA SARL", "T.G.V.S", "TALAA TRANS",
    "TRANS TOUT TIME", "TRANSPORT CATSIR", "TRANSPORT CHATIBI",
    "TRANSPORT LOGISTIQUE FETAHI", "TRANSPORT NOUR", "TRASTEF",
    "VARIETY TRANS", "VIVO TRANS MAROC SARL AU", "ZALAN TRANS"
)

private val listeDestinations = listOf(
    "AGADIR", "AGDEZ", "AGOURAY", "AIN AICHA (TAOUNATE)", "AIN ATIK",
    "AIN DRIIJ", "AIN FALFAL LGHARB", "AIN HARROUDA", "AIN TAKI",
    "AIN TAOUJDATE", "AIT MELLOUL", "AIT OURIR", "AIT RAHOU (KHENIFRA)",
    "AKLIM", "ALLAL TAZI", "ANZI", "AOULOUZE", "ARAZAN", "ARBAOUA",
    "ARFOUD", "ASILA", "ATTAOUIA", "AZEMMOUR", "AZILAL", "AZROU",
    "BAB BARRED", "BEJAAD", "BEN AHMED", "BEN SLIMANE", "BEN TAYEB",
    "BENGUERIR", "BENI BOUAYACHE", "BENI CHIKER", "BENI HDIFA",
    "BENI KHIRANE", "BENI MELLAL", "BENI NSSAR", "BENI SARGO",
    "BERKANE", "BERRECHID", "BIOUGRA", "BIR NSSAR", "BIRJDID",
    "BOUARFA", "BOUIZAKARNE", "BOUJNIBA", "BOULMEN", "BOUMIA",
    "BOUSKOURA", "BOUZNIQA", "CASABLANCA", "CENTRE 44", "CENTRE MAJJAT",
    "CHAOUNE", "CHEFCHAOUEN", "CHELLALATE", "CHEMIA", "CHICHAOUA",
    "DAKHLA", "DAR EL GUEDDARI", "DEMNATE", "DEPOTDIST01", "DEROUA",
    "DRIOUCHE", "DRISSA", "EL ATTAOUIA", "EL GARA", "EL JADIDA",
    "EL MADIAK", "EL YOUSSOFIA", "EL-HOCEIMA", "ERRACHIDIA", "ESSAOUIRA",
    "FES", "FKIH BEN SALEH", "FNIDEQ", "FOUM JAMAA", "GARSIF",
    "GOULMIME", "GOURRAMA", "GUISSER", "HAD BOUCHABEL", "HAD BRADIA",
    "HAD OULED FREJ", "HAD OULED JALOUL", "HAD RAS EL AIN", "HAD SOUALEM",
    "IFRANE", "IMAGHRANE", "IMINTANOUTE", "IMMOUZER", "IMZOURNE",
    "INZEGANE", "JAMAA SHIM", "JAMAAT HAOUAFAT", "JAMAAT MELLILA",
    "JAMAAT SMAALA", "JERADA", "JORF LASFAR", "JORF LMALH",
    "KAHF NSSOR", "KALAA SRAGHNA", "KALAAT MEGGOUNA", "KAMOUNI",
    "KARIA BA MHAMMED", "KASBAT TADLA", "KENITRA", "KHDADRA",
    "KHÉMIS MEDIAK", "KHEMISS ZEMAMRA", "KHEMISSET", "KHENIFRA",
    "KHMISS BERHAL", "KHMISS LAKSIBA", "KHMISS LANJRA", "KHMISS NEGGA",
    "KHOURIBGA", "KRIMAT", "KRIMAT (ESSAOUIRA)", "KSAR LAKBIR",
    "KSIBAT MOUHA OU SAID", "LAAOUNATE", "LAAYOUNE", "LABHALIL",
    "LABROUJ", "LAKBAB", "LAKSIBA (TADLA AZILAL)", "LALLA MIMOUNA",
    "LAMAAZIZE", "LARACHE", "LARBAA EL GHARB", "LKHDADRA", "LMENZEL",
    "LOUIZIA", "MACHRAA BELKSIRI", "MARRAKECH", "MEDIOUNA", "MEKNES",
    "MERNISSA", "MERS EL KHAIR", "MIDAR", "MIDELT", "MISSOUR",
    "MLY BOUAZZA", "MLY BOUSLHAM", "MOHAMMEDIA", "MONT AROUI", "MRIRT",
    "MZOUDA", "NADOR", "OUALIDIA", "OUARGUI", "OUARZAZATE", "OUAZZANE",
    "OUED AMLIL", "OUED CHARATE", "OUED ZEM", "OUJDA", "OULAD BEREHIL",
    "OULED ABBO", "OULED AYAD", "OULED BOUZIRI", "OULED ISSA",
    "OULED OMRANE", "OULED TAIMA", "OULMES", "OURIKA", "OUTAT LHAJ",
    "RABAT", "RAS EL AIN", "RET ACIMA 14", "RICH", "RISSANI",
    "SAAIDIA", "SAFI", "SALE", "SALOUANE", "SANIA BENRGUIG",
    "SEBT DUIB", "SEBT GHEZOULA", "SEBT LAMAARIF", "SEBT MZOUDA",
    "SEFROU", "SEHRIJ", "SETTAT", "SHOUL", "SID SBAA (CHEFCHAOUEN)",
    "SID ZWINE", "SIDI ALLAL LBHRAOUI", "SIDI ALLAL TAZI", "SIDI AYACH",
    "SIDI BENNOUR", "SIDI HAJJAJ", "SIDI KACEM", "SIDI LAGHLIMI",
    "SIDI LMOKHTAR", "SIDI MOHAMED AHMAR", "SIDI RAHAL", "SIDI SLIMANE",
    "SIDI SMAIL", "SIDI TAYBI", "SIDI YAHYA", "SKHIRATE",
    "SKHOUR RHAMNA", "SKOURA", "SOUK LARBAA", "SOUKSEBT",
    "TAFETACHT", "TAFRAOUT", "TAHER SOUK", "TAHHANAOUT", "TAHLA",
    "TAKHSAYT", "TALIWINE", "TALSINT", "TAMARIS", "TAMELLALT",
    "TANGER", "TANTAN", "TAOUNATE", "TAOURIRT", "TARFAYA", "TARGUIST",
    "TAROUDANTE", "TASAWT", "TATA", "TAZA", "TAZNAKHT", "TEMARA",
    "TEMSMANE", "TETOUANE", "TIFELT", "TIGHDOUINE", "TINGUIR",
    "TINJDAD", "TISSA", "TIT MELLIL", "TIZNIT", "TLAT EL HANCHANE",
    "TLAT IGHOUD", "TLAT LAGHELIMIYINE", "TLAT LOULED", "TNIN CHTOUKA",
    "TNINE LAHMAR", "TNINE LGHARBIA", "VCR-BERRECHID", "ZAGOURA",
    "ZAIO", "ZERHOUNE"
)

// ══════════════════════════════════════════════════════════════════════════════
// MODÈLES
// ══════════════════════════════════════════════════════════════════════════════
data class CamionRecord(
    val id: Int,
    val date: String = "",
    val immatriculation: String = "",
    val transporteur: String = "",
    val heureArrivee: String = "",
    val tonnage: String = "",
    val client: String = "",
    val destination: String = "",
    val statut: String = "En attente",
    val heureDepart: String = "",
    val actif: Boolean = true
)

data class CommandeADV(
    val id: Int,
    val client: String = "",
    val destination: String = "",
    val tonnage: String = "",
    val dateLivraison: String = "",
    val typeTransport: String = "",
    val statut: String = "En attente",
    val camionId: Int? = null,
    val dateCreation: String = ""
)

private fun sortKey(camion: CamionRecord) = "${camion.date} ${camion.heureArrivee}"

// ══════════════════════════════════════════════════════════════════════════════
// PERSISTANCE FIREBASE — CamionRecord
// ══════════════════════════════════════════════════════════════════════════════
fun sauvegarderCamions(camions: List<CamionRecord>) {
    // PROTECTION CRITIQUE : ne jamais écraser Firebase avec une liste vide
    // (évite la perte de données en cas de race condition avec le listener)
    if (camions.isEmpty()) return
    val db  = FirebaseDatabase.getInstance().reference
    val map = camions.associate { c ->
        c.id.toString() to hashMapOf(
            "id"              to c.id,
            "date"            to c.date,
            "immatriculation" to c.immatriculation,
            "transporteur"    to c.transporteur,
            "heureArrivee"    to c.heureArrivee,
            "tonnage"         to c.tonnage,
            "client"          to c.client,
            "destination"     to c.destination,
            "statut"          to c.statut,
            "heureDepart"     to c.heureDepart,
            "actif"           to c.actif
        )
    }
    db.child("camions").setValue(map)
}

fun effacerCamionsFirebase() {
    FirebaseDatabase.getInstance().reference.child("camions").setValue(null)
}

// ══════════════════════════════════════════════════════════════════════════════
// PERSISTANCE FIREBASE — CommandeADV
// ══════════════════════════════════════════════════════════════════════════════
fun sauvegarderCommandes(commandes: List<CommandeADV>) {
    // PROTECTION CRITIQUE : ne jamais écraser Firebase avec une liste vide
    if (commandes.isEmpty()) return
    val db  = FirebaseDatabase.getInstance().reference
    val map = commandes.associate { c ->
        c.id.toString() to hashMapOf(
            "id"            to c.id,
            "client"        to c.client,
            "destination"   to c.destination,
            "tonnage"       to c.tonnage,
            "dateLivraison" to c.dateLivraison,
            "typeTransport" to c.typeTransport,
            "statut"        to c.statut,
            "camionId"      to (c.camionId ?: -1),
            "dateCreation"  to c.dateCreation
        )
    }
    db.child("commandes").setValue(map)
}

fun effacerCommandesFirebase() {
    FirebaseDatabase.getInstance().reference.child("commandes").setValue(null)
}

// ══════════════════════════════════════════════════════════════════════════════
// MOTS DE PASSE
// ══════════════════════════════════════════════════════════════════════════════
private val utilisateursParDefaut = mapOf(
    "securite" to "1234", "admin" to "1234", "adv" to "1234",
    "hafid" to "1234", "hassan" to "1234", "said" to "1234",
    "lemyasser" to "1234", "fouad" to "1234"
)

fun chargerMotsDePasse(context: Context): Map<String, String> {
    val prefs = context.getSharedPreferences("mots_de_passe", Context.MODE_PRIVATE)
    return utilisateursParDefaut.mapValues { (user, defaut) ->
        prefs.getString(user, defaut) ?: defaut
    }
}

fun sauvegarderMotDePasse(context: Context, user: String, nouveauMdp: String) {
    context.getSharedPreferences("mots_de_passe", Context.MODE_PRIVATE)
        .edit().putString(user, nouveauMdp).apply()
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORT EXCEL
// ══════════════════════════════════════════════════════════════════════════════
fun exporterExcel(context: Context, camions: List<CamionRecord>, moisLabel: String): Boolean {
    return try {
        val workbook = XSSFWorkbook()
        val sheet    = workbook.createSheet("Historique $moisLabel")

        val headerStyle = workbook.createCellStyle()
        headerStyle.fillForegroundColor = IndexedColors.DARK_BLUE.index
        headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND)
        headerStyle.setAlignment(HorizontalAlignment.CENTER)
        headerStyle.setBorderBottom(BorderStyle.THIN)
        headerStyle.setBorderTop(BorderStyle.THIN)
        headerStyle.setBorderLeft(BorderStyle.THIN)
        headerStyle.setBorderRight(BorderStyle.THIN)
        val headerFont = workbook.createFont()
        headerFont.bold = true
        headerFont.color = IndexedColors.WHITE.index
        headerFont.fontHeightInPoints = 11
        headerStyle.setFont(headerFont)

        val styleNormal = workbook.createCellStyle()
        styleNormal.setAlignment(HorizontalAlignment.CENTER)
        styleNormal.setBorderBottom(BorderStyle.THIN)
        styleNormal.setBorderTop(BorderStyle.THIN)
        styleNormal.setBorderLeft(BorderStyle.THIN)
        styleNormal.setBorderRight(BorderStyle.THIN)

        val styleAlt = workbook.createCellStyle()
        styleAlt.fillForegroundColor = IndexedColors.LIGHT_CORNFLOWER_BLUE.index
        styleAlt.setFillPattern(FillPatternType.SOLID_FOREGROUND)
        styleAlt.setAlignment(HorizontalAlignment.CENTER)
        styleAlt.setBorderBottom(BorderStyle.THIN)
        styleAlt.setBorderTop(BorderStyle.THIN)
        styleAlt.setBorderLeft(BorderStyle.THIN)
        styleAlt.setBorderRight(BorderStyle.THIN)

        val titleStyle = workbook.createCellStyle()
        titleStyle.fillForegroundColor = IndexedColors.GOLD.index
        titleStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND)
        titleStyle.setAlignment(HorizontalAlignment.CENTER)
        val titleFont = workbook.createFont()
        titleFont.bold = true
        titleFont.fontHeightInPoints = 14
        titleStyle.setFont(titleFont)

        val titleRow  = sheet.createRow(0)
        val titleCell = titleRow.createCell(0)
        titleCell.setCellValue("SODALMU LOGISTIQUE — Historique des chargements — $moisLabel")
        titleCell.cellStyle = titleStyle
        sheet.addMergedRegion(org.apache.poi.ss.util.CellRangeAddress(0, 0, 0, 10))

        val headers = listOf(
            "N°", "Date", "Immatriculation", "Transporteur",
            "Heure Arrivée", "Tonnage", "Client",
            "Destination", "Statut", "Heure Départ", "Actif"
        )
        val headerRow = sheet.createRow(1)
        headers.forEachIndexed { i, h ->
            val cell = headerRow.createCell(i)
            cell.setCellValue(h)
            cell.cellStyle = headerStyle
        }

        camions.sortedWith(compareBy({ it.date }, { it.heureArrivee }))
            .forEachIndexed { idx, c ->
                val row   = sheet.createRow(idx + 2)
                val style = if (idx % 2 == 0) styleNormal else styleAlt
                listOf(
                    c.id.toString(), c.date, c.immatriculation, c.transporteur,
                    c.heureArrivee, c.tonnage,
                    c.client.ifBlank { "Non affecté" },
                    c.destination.ifBlank { "Non renseignée" },
                    c.statut, c.heureDepart.ifBlank { "--:--" },
                    if (c.actif) "Oui" else "Non"
                ).forEachIndexed { j, v ->
                    val cell = row.createCell(j)
                    cell.setCellValue(v)
                    cell.cellStyle = style
                }
            }

        sheet.setColumnWidth(0, 8 * 256)
        sheet.setColumnWidth(1, 14 * 256)
        sheet.setColumnWidth(2, 18 * 256)
        sheet.setColumnWidth(3, 20 * 256)
        sheet.setColumnWidth(4, 16 * 256)
        sheet.setColumnWidth(5, 10 * 256)
        sheet.setColumnWidth(6, 20 * 256)
        sheet.setColumnWidth(7, 20 * 256)
        sheet.setColumnWidth(8, 22 * 256)
        sheet.setColumnWidth(9, 16 * 256)
        sheet.setColumnWidth(10, 10 * 256)

        val fileName = "SODALMU_Historique_${moisLabel.replace(" ", "_")}.xlsx"
        val file     = File(context.cacheDir, fileName)
        FileOutputStream(file).use { workbook.write(it) }
        workbook.close()

        val uri = FileProvider.getUriForFile(context, "${context.packageName}.provider", file)
        val intent = Intent(Intent.ACTION_SEND).apply {
            type    = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            putExtra(Intent.EXTRA_STREAM, uri)
            putExtra(Intent.EXTRA_SUBJECT, "Historique chargements $moisLabel — SODALMU")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(intent, "Partager le fichier Excel"))
        true
    } catch (e: Exception) { e.printStackTrace(); false }
}

// ══════════════════════════════════════════════════════════════════════════════
// IMPORT EXCEL — helpers & CamionRecord + CommandeADV
// ══════════════════════════════════════════════════════════════════════════════
private fun cellToString(cell: org.apache.poi.ss.usermodel.Cell?): String {
    if (cell == null) return ""
    return when (cell.cellType) {
        CellType.STRING  -> cell.stringCellValue.trim()
        CellType.NUMERIC -> {
            if (DateUtil.isCellDateFormatted(cell)) {
                java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.getDefault())
                    .format(cell.dateCellValue)
            } else {
                cell.numericCellValue.toLong().toString()
            }
        }
        CellType.FORMULA -> {
            try { cell.stringCellValue.trim() }
            catch (_: Exception) {
                try { cell.numericCellValue.toLong().toString() }
                catch (_: Exception) { "" }
            }
        }
        CellType.BOOLEAN -> cell.booleanCellValue.toString()
        else -> ""
    }
}

data class ImportResult(
    val nouvelles: List<CommandeADV>,
    val idsASupprimer: List<Int>,
    val ajoutees: Int,
    val supprimees: Int
)

fun importerCommandesDepuisExcel(
    context: Context, uri: Uri, commandesExistantes: List<CommandeADV>
): ImportResult {
    val nouvelles = mutableListOf<CommandeADV>()
    val today  = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.getDefault()).format(java.util.Date())
    var nextId = if (commandesExistantes.isEmpty()) 1 else commandesExistantes.maxOf { it.id } + 1
    // Clés des commandes déjà enregistrées pour éviter les doublons
    val existingKeys = commandesExistantes.map {
        "${it.client.trim().lowercase()}|${it.destination.trim().lowercase()}|${it.tonnage.trim().lowercase()}|${it.dateLivraison.trim()}|${it.typeTransport.trim().lowercase()}"
    }.toMutableSet()
    // Clés présentes dans le CSV (pour détecter les suppressions)
    val csvKeys = mutableSetOf<String>()

    // Détection CSV vs XLSX selon le nom de fichier ou le contenu
    val fileName = context.contentResolver.query(uri, null, null, null, null)?.use { c ->
        if (c.moveToFirst()) c.getString(c.getColumnIndexOrThrow(android.provider.OpenableColumns.DISPLAY_NAME)) else null
    } ?: ""
    val ext = fileName.lowercase().let { it.substringAfterLast('.', "") }
    val isCsv  = ext == "csv"
    val isXls  = ext == "xls"   // SpreadsheetML généré par le bookmarklet

    val stream = context.contentResolver.openInputStream(uri) ?: return ImportResult(emptyList(), emptyList(), 0, 0)
    stream.use { s ->
        if (isCsv) {
            // ── Parsing CSV (virgule ou point-virgule) ────────────────────────
            val lines = s.bufferedReader(Charsets.UTF_8).readLines()
            val sep = if (lines.isNotEmpty()) detectCsvSep(lines[0]) else ','
            for (lineIdx in 1 until lines.size) {
                val line = lines[lineIdx].trim()
                if (line.isBlank()) continue
                val cols = parseCsvLine(line, sep)
                if (cols.size < 5) continue
                val client        = cols[0].trim()
                val destination   = cols[1].trim()
                val tonnage       = cols[2].trim()
                val dateLivraison = cols[3].trim()
                val typeRaw       = cols[4].trim().uppercase()
                val typeTransport = when (typeRaw) { "LOCATION" -> "Location"; else -> typeRaw }
                if (client.isBlank() || destination.isBlank() || tonnage.isBlank() ||
                    dateLivraison.isBlank() || typeTransport.isBlank()) continue
                val key = "${client.lowercase()}|${destination.lowercase()}|${tonnage.lowercase()}|$dateLivraison|${typeTransport.lowercase()}"
                csvKeys.add(key)
                if (existingKeys.add(key)) {
                    nouvelles.add(
                        CommandeADV(
                            id = nextId++, client = client, destination = destination,
                            tonnage = tonnage, dateLivraison = dateLivraison,
                            typeTransport = typeTransport, statut = "En attente", dateCreation = today
                        )
                    )
                }
            }
        } else if (isXls) {
            // ── Parsing XLS SpreadsheetML (XML natif généré par bookmarklet) ──
            val xml = s.bufferedReader(Charsets.UTF_8).readText()
            val rowPattern = Regex("<Row[^>]*>(.*?)</Row>", RegexOption.DOT_MATCHES_ALL)
            val cellPattern = Regex("<Data[^>]*>(.*?)</Data>", RegexOption.DOT_MATCHES_ALL)
            val rows = rowPattern.findAll(xml).toList()
            for (rowIdx in 1 until rows.size) {   // skip header row 0
                val cells = cellPattern.findAll(rows[rowIdx].groupValues[1]).map {
                    it.groupValues[1].replace("&amp;", "&").replace("&lt;", "<")
                        .replace("&gt;", ">").replace("&quot;", "\"").trim()
                }.toList()
                if (cells.size < 5) continue
                val client        = cells[0]
                val destination   = cells[1]
                val tonnage       = cells[2]
                val dateLivraison = cells[3]
                val typeRaw       = cells[4].uppercase()
                val typeTransport = when (typeRaw) { "LOCATION" -> "Location"; else -> typeRaw }
                if (client.isBlank() || destination.isBlank() || tonnage.isBlank() ||
                    dateLivraison.isBlank() || typeTransport.isBlank()) continue
                val key = "${client.lowercase()}|${destination.lowercase()}|${tonnage.lowercase()}|$dateLivraison|${typeTransport.lowercase()}"
                csvKeys.add(key)
                if (existingKeys.add(key)) {
                    nouvelles.add(
                        CommandeADV(
                            id = nextId++, client = client, destination = destination,
                            tonnage = tonnage, dateLivraison = dateLivraison,
                            typeTransport = typeTransport, statut = "En attente", dateCreation = today
                        )
                    )
                }
            }
        } else {
            // ── Parsing XLSX (Apache POI) ────────────────────────────────────
            val workbook = XSSFWorkbook(s)
            val sheet    = workbook.getSheetAt(0)
            for (rowIdx in 1..sheet.lastRowNum) {
                val row           = sheet.getRow(rowIdx) ?: continue
                val client        = cellToString(row.getCell(0))
                val destination   = cellToString(row.getCell(1))
                val tonnage       = cellToString(row.getCell(2))
                val dateLivraison = cellToString(row.getCell(3))
                val typeRaw       = cellToString(row.getCell(4)).trim().uppercase()
                val typeTransport = when (typeRaw) { "LOCATION" -> "Location"; else -> typeRaw }
                if (client.isBlank() || destination.isBlank() || tonnage.isBlank() ||
                    dateLivraison.isBlank() || typeTransport.isBlank()) continue
                val key = "${client.lowercase()}|${destination.lowercase()}|${tonnage.lowercase()}|$dateLivraison|${typeTransport.lowercase()}"
                csvKeys.add(key)
                if (existingKeys.add(key)) {
                    nouvelles.add(
                        CommandeADV(
                            id = nextId++, client = client, destination = destination,
                            tonnage = tonnage, dateLivraison = dateLivraison,
                            typeTransport = typeTransport, statut = "En attente", dateCreation = today
                        )
                    )
                }
            }
            workbook.close()
        }
    }
    // Commandes à supprimer : absentes du CSV ET non affectées à un camion
    val idsASupprimer = commandesExistantes
        .filter { cmd ->
            val key = "${cmd.client.trim().lowercase()}|${cmd.destination.trim().lowercase()}|${cmd.tonnage.trim().lowercase()}|${cmd.dateLivraison.trim()}|${cmd.typeTransport.trim().lowercase()}"
            key !in csvKeys && cmd.camionId == null
        }
        .map { it.id }
    return ImportResult(nouvelles, idsASupprimer, nouvelles.size, idsASupprimer.size)
}

/** Parse une ligne CSV en gérant les champs entre guillemets.
 *  Détecte automatiquement le séparateur (virgule ou point-virgule) si non fourni. */
private fun parseCsvLine(line: String, sep: Char = ',') : List<String> {
    val result = mutableListOf<String>()
    var i = 0
    val sb = StringBuilder()
    while (i < line.length) {
        when {
            line[i] == '"' -> {
                i++
                while (i < line.length) {
                    if (line[i] == '"' && i + 1 < line.length && line[i + 1] == '"') { sb.append('"'); i += 2 }
                    else if (line[i] == '"') { i++; break }
                    else { sb.append(line[i++]) }
                }
            }
            line[i] == sep -> { result.add(sb.toString()); sb.clear(); i++ }
            else -> { sb.append(line[i++]) }
        }
    }
    result.add(sb.toString())
    return result
}

/** Détecte le séparateur CSV (virgule ou point-virgule) à partir de la ligne d'en-tête. */
private fun detectCsvSep(header: String): Char =
    if (header.count { it == ';' } >= header.count { it == ',' }) ';' else ','

// Lit une cellule Excel de type heure et retourne "HH:mm"
private fun cellToTimeString(cell: org.apache.poi.ss.usermodel.Cell?): String {
    if (cell == null) return ""
    return when (cell.cellType) {
        CellType.STRING  -> cell.stringCellValue.trim()
        CellType.NUMERIC -> {
            if (DateUtil.isCellDateFormatted(cell)) {
                java.text.SimpleDateFormat("HH:mm", java.util.Locale.getDefault())
                    .format(cell.dateCellValue)
            } else {
                // Fraction de journée → minutes (ex: 0.625 = 15h00)
                val totalMinutes = (cell.numericCellValue * 24 * 60).toInt()
                "%02d:%02d".format(totalMinutes / 60, totalMinutes % 60)
            }
        }
        CellType.FORMULA -> {
            try { cell.stringCellValue.trim() }
            catch (_: Exception) { "" }
        }
        else -> ""
    }
}

// Colonnes attendues : date | immatriculation | transporteur | heure d'arrive | tonnage
fun importerCamionsDepuisExcel(
    context: Context, uri: Uri, camionsExistants: List<CamionRecord>
): Pair<List<CamionRecord>, Int> {
    val nouveaux = mutableListOf<CamionRecord>()
    var nextId   = if (camionsExistants.isEmpty()) 1 else camionsExistants.maxOf { it.id } + 1
    // Clés des camions déjà enregistrés pour éviter les doublons
    val existingKeys = camionsExistants.map {
        "${it.date.trim()}|${it.immatriculation.trim().lowercase()}|${it.transporteur.trim().lowercase()}|${it.heureArrivee.trim()}"
    }.toMutableSet()
    val stream   = context.contentResolver.openInputStream(uri) ?: return Pair(emptyList(), 0)
    stream.use { s ->
        val workbook = XSSFWorkbook(s)
        val sheet    = workbook.getSheetAt(0)
        for (rowIdx in 1..sheet.lastRowNum) {
            val row            = sheet.getRow(rowIdx) ?: continue
            val date           = cellToString(row.getCell(0))      // yyyy-MM-dd
            val immatriculation = cellToString(row.getCell(1)).trim()
            val transporteur   = cellToString(row.getCell(2)).trim()
            val heureArrivee   = cellToTimeString(row.getCell(3))  // HH:mm
            val tonnage        = cellToString(row.getCell(4)).trim()
            if (date.isBlank() || immatriculation.isBlank() || transporteur.isBlank() ||
                heureArrivee.isBlank() || tonnage.isBlank()) continue
            val key = "${date}|${immatriculation.lowercase()}|${transporteur.lowercase()}|$heureArrivee"
            if (existingKeys.add(key)) {
                nouveaux.add(
                    CamionRecord(
                        id = nextId++, date = date, immatriculation = immatriculation,
                        transporteur = transporteur, heureArrivee = heureArrivee,
                        tonnage = tonnage, statut = "En attente", actif = true
                    )
                )
            }
        }
        workbook.close()
    }
    return Pair(nouveaux, nouveaux.size)
}

// ══════════════════════════════════════════════════════════════════════════════
// ACTIVITY
// ══════════════════════════════════════════════════════════════════════════════
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Persistance offline : les données sont gardées en cache local
        // si la connexion est perdue, évite la perte de données
        try {
            FirebaseDatabase.getInstance().setPersistenceEnabled(true)
        } catch (_: Exception) {}
        setContent { MaterialTheme { CamionApp() } }
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// SPLASH SCREEN
// ══════════════════════════════════════════════════════════════════════════════
@Composable
fun SplashScreen(onFinished: () -> Unit) {
    val alpha    = remember { Animatable(0f) }
    val scale    = remember { Animatable(0.85f) }
    val slideY   = remember { Animatable(60f) }
    LaunchedEffect(Unit) {
        alpha.animateTo(1f, animationSpec = tween(1000))
        scale.animateTo(1f, animationSpec = tween(1000))
        slideY.animateTo(0f, animationSpec = tween(1000))
        kotlinx.coroutines.delay(2000)
        onFinished()
    }
    Box(
        modifier = Modifier.fillMaxSize().background(Color.White),
        contentAlignment = Alignment.Center
    ) {
        // Fond dégradé bleu ICE en bas
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.45f)
                .align(Alignment.BottomCenter)
                .background(Brush.verticalGradient(listOf(Color(0xFF1565C0).copy(alpha = 0f), Color(0xFF1565C0))))
        )
        Column(
            modifier = Modifier
                .alpha(alpha.value)
                .scale(scale.value)
                .offset(y = slideY.value.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Camion ICE — image principale
            androidx.compose.foundation.Image(
                painter            = painterResource(id = R.drawable.camion_ice),
                contentDescription = "Camion ICE",
                contentScale       = ContentScale.Fit,
                modifier           = Modifier
                    .fillMaxWidth(0.88f)
                    .aspectRatio(16f / 9f)
            )
            Spacer(modifier = Modifier.height(24.dp))
            // Logo ICE
            androidx.compose.foundation.Image(
                painter            = painterResource(id = R.drawable.logo_ice),
                contentDescription = "Logo ICE",
                contentScale       = ContentScale.Fit,
                modifier           = Modifier
                    .width(180.dp)
                    .height(72.dp)
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                "SODALMU LOGISTIQUE",
                fontSize     = 12.sp,
                color        = Color(0xFF1565C0),
                letterSpacing = 4.sp,
                fontWeight   = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(40.dp))
            CircularProgressIndicator(
                color       = Color(0xFF1565C0),
                strokeWidth = 2.dp,
                modifier    = Modifier.size(22.dp)
            )
        }
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPOSABLES UTILITAIRES
// ══════════════════════════════════════════════════════════════════════════════
@Composable
fun SodalmuCard(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Card(
        modifier  = modifier.fillMaxWidth(),
        colors    = CardDefaults.cardColors(containerColor = White),
        shape     = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(3.dp)
    ) { Column(modifier = Modifier.padding(16.dp), content = content) }
}

@Composable
fun SodalmuGroupCard(titre: String, couleur: Color, modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Card(
        modifier  = modifier.fillMaxWidth(),
        colors    = CardDefaults.cardColors(containerColor = couleur.copy(alpha = 0.08f)),
        shape     = RoundedCornerShape(20.dp),
        elevation = CardDefaults.cardElevation(1.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(modifier = Modifier.width(4.dp).height(20.dp).background(couleur, RoundedCornerShape(2.dp)))
                Spacer(modifier = Modifier.width(8.dp))
                Text(titre, color = couleur, fontWeight = FontWeight.Bold, fontSize = 15.sp)
            }
            Spacer(modifier = Modifier.height(12.dp))
            content()
        }
    }
}

@Composable
fun StatutBadge(statut: String) {
    val couleur = statutColor(statut)
    Box(modifier = Modifier.background(couleur.copy(alpha = 0.12f), RoundedCornerShape(20.dp)).padding(horizontal = 10.dp, vertical = 4.dp)) {
        Text(statut, color = couleur, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
fun TonnageBadge(tonnage: String) {
    if (tonnage.isBlank()) return
    Box(modifier = Modifier.background(Navy.copy(alpha = 0.10f), RoundedCornerShape(20.dp)).padding(horizontal = 10.dp, vertical = 4.dp)) {
        Text("⚖️ $tonnage", color = Navy, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
fun DatePickerButton(label: String, valeur: String, onValeurChange: (String) -> Unit) {
    val context  = LocalContext.current
    val calendar = Calendar.getInstance()
    OutlinedButton(
        onClick = {
            DatePickerDialog(
                context,
                { _, y, m, d -> onValeurChange("%04d-%02d-%02d".format(y, m + 1, d)) },
                calendar.get(Calendar.YEAR), calendar.get(Calendar.MONTH), calendar.get(Calendar.DAY_OF_MONTH)
            ).show()
        },
        modifier = Modifier.fillMaxWidth().height(56.dp),
        shape    = RoundedCornerShape(12.dp),
        colors   = ButtonDefaults.outlinedButtonColors(contentColor = Navy)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.Start, modifier = Modifier.fillMaxWidth()) {
            Text("📅", fontSize = 18.sp)
            Spacer(modifier = Modifier.width(10.dp))
            Text(text = if (valeur.isBlank()) label else valeur, color = if (valeur.isBlank()) TextLight else Navy, fontWeight = if (valeur.isBlank()) FontWeight.Normal else FontWeight.SemiBold)
        }
    }
}

@Composable
fun HeureDropdown(label: String, valeur: String, onValeurChange: (String) -> Unit, enabled: Boolean = true) {
    var expanded by remember { mutableStateOf(false) }
    Box {
        OutlinedButton(
            onClick  = { if (enabled) expanded = true },
            modifier = Modifier.fillMaxWidth().height(56.dp),
            shape    = RoundedCornerShape(12.dp),
            enabled  = enabled,
            colors   = ButtonDefaults.outlinedButtonColors(contentColor = if (enabled) Navy else TextLight, disabledContentColor = TextLight)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.Start, modifier = Modifier.fillMaxWidth()) {
                Text("🕐", fontSize = 18.sp)
                Spacer(modifier = Modifier.width(10.dp))
                Text(text = if (valeur.isBlank()) label else valeur, color = if (!enabled) TextLight else if (valeur.isBlank()) TextLight else Navy, fontWeight = if (valeur.isBlank()) FontWeight.Normal else FontWeight.SemiBold)
            }
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            listeHeures.forEach { h -> DropdownMenuItem(text = { Text(h) }, onClick = { onValeurChange(h); expanded = false }) }
        }
    }
}

@Composable
fun TonnageDropdown(label: String, valeur: String, onValeurChange: (String) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    Box {
        OutlinedButton(
            onClick  = { expanded = true },
            modifier = Modifier.fillMaxWidth().height(56.dp),
            shape    = RoundedCornerShape(12.dp),
            colors   = ButtonDefaults.outlinedButtonColors(contentColor = Navy)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.Start, modifier = Modifier.fillMaxWidth()) {
                Text("⚖️", fontSize = 18.sp)
                Spacer(modifier = Modifier.width(10.dp))
                Text(text = if (valeur.isBlank()) label else valeur, color = if (valeur.isBlank()) TextLight else Navy, fontWeight = if (valeur.isBlank()) FontWeight.Normal else FontWeight.SemiBold)
            }
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            listeTonnages.forEach { t -> DropdownMenuItem(text = { Text(t) }, onClick = { onValeurChange(t); expanded = false }) }
        }
    }
}

@Composable
fun TypeTransportDropdown(label: String, valeur: String, onValeurChange: (String) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    Box {
        OutlinedButton(
            onClick  = { expanded = true },
            modifier = Modifier.fillMaxWidth().height(56.dp),
            shape    = RoundedCornerShape(12.dp),
            colors   = ButtonDefaults.outlinedButtonColors(contentColor = Navy)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.Start, modifier = Modifier.fillMaxWidth()) {
                Text("🚛", fontSize = 18.sp)
                Spacer(modifier = Modifier.width(10.dp))
                Text(text = if (valeur.isBlank()) label else valeur, color = if (valeur.isBlank()) TextLight else Navy, fontWeight = if (valeur.isBlank()) FontWeight.Normal else FontWeight.SemiBold)
            }
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            listeTypeTransport.forEach { t -> DropdownMenuItem(text = { Text(t) }, onClick = { onValeurChange(t); expanded = false }) }
        }
    }
}

@Composable
fun TransporteurDropdown(label: String, valeur: String, onValeurChange: (String) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    Box {
        OutlinedButton(
            onClick  = { expanded = true },
            modifier = Modifier.fillMaxWidth().height(56.dp),
            shape    = RoundedCornerShape(12.dp),
            colors   = ButtonDefaults.outlinedButtonColors(contentColor = Navy)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.Start, modifier = Modifier.fillMaxWidth()) {
                Text("🚚", fontSize = 18.sp)
                Spacer(modifier = Modifier.width(10.dp))
                Text(
                    text       = if (valeur.isBlank()) label else valeur,
                    color      = if (valeur.isBlank()) TextLight else Navy,
                    fontWeight = if (valeur.isBlank()) FontWeight.Normal else FontWeight.SemiBold,
                    fontSize   = 13.sp
                )
            }
        }
        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
            modifier = Modifier.heightIn(max = 300.dp)
        ) {
            listeTransporteurs.forEach { t ->
                DropdownMenuItem(
                    text = { Text(t, fontSize = 13.sp) },
                    onClick = { onValeurChange(t); expanded = false }
                )
            }
        }
    }
}

@Composable
fun DestinationDropdown(label: String, valeur: String, onValeurChange: (String) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    Box {
        OutlinedButton(
            onClick  = { expanded = true },
            modifier = Modifier.fillMaxWidth().height(56.dp),
            shape    = RoundedCornerShape(12.dp),
            colors   = ButtonDefaults.outlinedButtonColors(contentColor = Navy)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.Start, modifier = Modifier.fillMaxWidth()) {
                Text("📍", fontSize = 18.sp)
                Spacer(modifier = Modifier.width(10.dp))
                Text(
                    text       = if (valeur.isBlank()) label else valeur,
                    color      = if (valeur.isBlank()) TextLight else Navy,
                    fontWeight = if (valeur.isBlank()) FontWeight.Normal else FontWeight.SemiBold,
                    fontSize   = 13.sp
                )
            }
        }
        DropdownMenu(
            expanded         = expanded,
            onDismissRequest = { expanded = false },
            modifier         = Modifier.heightIn(max = 300.dp)
        ) {
            listeDestinations.forEach { d ->
                DropdownMenuItem(
                    text    = { Text(d, fontSize = 13.sp) },
                    onClick = { onValeurChange(d); expanded = false }
                )
            }
        }
    }
}

@Composable
fun StatutDropdown(label: String, valeur: String, onValeurChange: (String) -> Unit, options: List<String>) {
    var expanded by remember { mutableStateOf(false) }
    Box {
        OutlinedButton(
            onClick  = { expanded = true },
            modifier = Modifier.fillMaxWidth().height(56.dp),
            shape    = RoundedCornerShape(12.dp),
            colors   = ButtonDefaults.outlinedButtonColors(contentColor = Navy)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.Start, modifier = Modifier.fillMaxWidth()) {
                Text("📋", fontSize = 18.sp)
                Spacer(modifier = Modifier.width(10.dp))
                Text(text = if (valeur.isBlank()) label else valeur, color = if (valeur.isBlank()) TextLight else Navy, fontWeight = if (valeur.isBlank()) FontWeight.Normal else FontWeight.SemiBold)
            }
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            options.forEach { item -> DropdownMenuItem(text = { Text(item) }, onClick = { onValeurChange(item); expanded = false }) }
        }
    }
}

@Composable
fun PrimaryButton(text: String, enabled: Boolean = true, onClick: () -> Unit) {
    Button(
        onClick  = onClick, enabled = enabled,
        modifier = Modifier.fillMaxWidth().height(52.dp),
        shape    = RoundedCornerShape(12.dp),
        colors   = ButtonDefaults.buttonColors(containerColor = Navy, disabledContainerColor = TextLight)
    ) { Text(text, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = White) }
}

@Composable
fun GoldButton(text: String, enabled: Boolean = true, onClick: () -> Unit) {
    Button(
        onClick  = onClick, enabled = enabled,
        modifier = Modifier.fillMaxWidth().height(52.dp),
        shape    = RoundedCornerShape(12.dp),
        colors   = ButtonDefaults.buttonColors(containerColor = Gold, disabledContainerColor = TextLight)
    ) { Text(text, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Navy) }
}

// ══════════════════════════════════════════════════════════════════════════════
// HEADER
// ══════════════════════════════════════════════════════════════════════════════
@Composable
fun AppHeader(
    titre: String, sousTitre: String = "",
    showHistorique: Boolean = false, onHistorique: (() -> Unit)? = null,
    onChangerMdp: () -> Unit, onLogout: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(Brush.horizontalGradient(listOf(Color(0xFF1565C0), Color(0xFF1976D2))))
            .padding(horizontal = 14.dp, vertical = 10.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Logo ICE + titre session
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                androidx.compose.foundation.Image(
                    painter            = painterResource(id = R.drawable.logo_ice),
                    contentDescription = "Logo ICE",
                    contentScale       = ContentScale.Fit,
                    modifier           = Modifier.width(64.dp).height(36.dp)
                )
                Spacer(modifier = Modifier.width(10.dp))
                Column {
                    Text(titre, color = White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    if (sousTitre.isNotBlank()) Text(sousTitre, color = White.copy(alpha = 0.75f), fontSize = 11.sp)
                }
            }
            // Boutons actions
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                if (onHistorique != null) {
                    TextButton(
                        onClick  = onHistorique,
                        modifier = Modifier.background(
                            if (showHistorique) White.copy(0.25f) else White.copy(0.12f),
                            RoundedCornerShape(10.dp)
                        )
                    ) { Text(if (showHistorique) "📋 Masquer" else "📋 Historique", color = White, fontSize = 11.sp) }
                }
                TextButton(onClick = onChangerMdp, modifier = Modifier.background(White.copy(0.12f), RoundedCornerShape(10.dp))) { Text("🔑", fontSize = 18.sp) }
                TextButton(onClick = onLogout, modifier = Modifier.background(Danger.copy(0.35f), RoundedCornerShape(10.dp))) { Text("🚪", fontSize = 18.sp) }
            }
        }
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// LOGIN SCREEN
// ══════════════════════════════════════════════════════════════════════════════
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(username: String, password: String, loginError: String,
                onUsernameChange: (String) -> Unit, onPasswordChange: (String) -> Unit, onLogin: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize().background(Color.White)) {
        // Vague bleue ICE en haut
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(280.dp)
                .background(
                    Brush.verticalGradient(listOf(Color(0xFF1565C0), Color(0xFF1976D2), Color(0xFF1565C0).copy(alpha = 0f)))
                )
        )
        Column(
            modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 28.dp),
            verticalArrangement = Arrangement.Center
        ) {
            Spacer(modifier = Modifier.height(48.dp))
            // Logo ICE centré
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                androidx.compose.foundation.Image(
                    painter            = painterResource(id = R.drawable.logo_ice),
                    contentDescription = "Logo ICE",
                    contentScale       = ContentScale.Fit,
                    modifier           = Modifier.width(200.dp).height(80.dp)
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text("SODALMU LOGISTIQUE", fontSize = 11.sp, color = White.copy(alpha = 0.85f), letterSpacing = 4.sp, fontWeight = FontWeight.Medium)
            }
            Spacer(modifier = Modifier.height(36.dp))
            // Carte de connexion
            Card(
                modifier  = Modifier.fillMaxWidth(),
                shape     = RoundedCornerShape(24.dp),
                colors    = CardDefaults.cardColors(containerColor = White),
                elevation = CardDefaults.cardElevation(12.dp)
            ) {
                Column(modifier = Modifier.padding(28.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier.size(36.dp).background(Color(0xFF1565C0).copy(alpha = 0.1f), RoundedCornerShape(10.dp)),
                            contentAlignment = Alignment.Center
                        ) { Text("🔐", fontSize = 18.sp) }
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text("Connexion", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1565C0))
                            Text("Accédez à votre espace", fontSize = 12.sp, color = TextMedium)
                        }
                    }
                    Spacer(modifier = Modifier.height(22.dp))
                    // ── Liste déroulante Identifiant ──
                    val listeUsers = listOf("admin", "securite", "adv", "hafid", "hassan", "said", "lemyasser", "fouad")
                    var expandedUserMenu by remember { mutableStateOf(false) }
                    ExposedDropdownMenuBox(
                        expanded = expandedUserMenu,
                        onExpandedChange = { expandedUserMenu = !expandedUserMenu }
                    ) {
                        OutlinedTextField(
                            value = username,
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("Identifiant") },
                            leadingIcon = { Text("👤", fontSize = 18.sp) },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedUserMenu) },
                            modifier = Modifier.fillMaxWidth().menuAnchor(),
                            shape = RoundedCornerShape(12.dp),
                            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF1565C0), focusedLabelColor = Color(0xFF1565C0))
                        )
                        ExposedDropdownMenu(
                            expanded = expandedUserMenu,
                            onDismissRequest = { expandedUserMenu = false }
                        ) {
                            listeUsers.forEach { user ->
                                DropdownMenuItem(
                                    text = { Text(user.replaceFirstChar { it.uppercase() }, fontSize = 15.sp) },
                                    onClick = { onUsernameChange(user); expandedUserMenu = false },
                                    leadingIcon = { Text("👤", fontSize = 14.sp) }
                                )
                            }
                        }
                    }
                    Spacer(modifier = Modifier.height(14.dp))
                    OutlinedTextField(
                        value = password, onValueChange = onPasswordChange,
                        label = { Text("Mot de passe") },
                        leadingIcon = { Text("🔒", fontSize = 18.sp) },
                        visualTransformation = PasswordVisualTransformation(),
                        modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF1565C0), focusedLabelColor = Color(0xFF1565C0))
                    )
                    if (loginError.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(10.dp))
                        Card(colors = CardDefaults.cardColors(containerColor = Danger.copy(alpha = 0.08f)), shape = RoundedCornerShape(8.dp)) {
                            Text("⚠️ $loginError", color = Danger, modifier = Modifier.padding(10.dp), fontSize = 13.sp)
                        }
                    }
                    Spacer(modifier = Modifier.height(22.dp))
                    Button(
                        onClick  = { onLogin() },
                        modifier = Modifier.fillMaxWidth().height(52.dp),
                        shape    = RoundedCornerShape(12.dp),
                        colors   = ButtonDefaults.buttonColors(containerColor = Color(0xFF1565C0))
                    ) { Text("Se connecter", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = White) }
                }
            }
            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// CHANGER MOT DE PASSE
// ══════════════════════════════════════════════════════════════════════════════
@Composable
fun ChangerMotDePasseScreen(currentUser: String, motsDePasse: androidx.compose.runtime.snapshots.SnapshotStateMap<String, String>, onRetour: () -> Unit) {
    val context      = LocalContext.current
    var ancienMdp    by remember { mutableStateOf("") }
    var nouveauMdp   by remember { mutableStateOf("") }
    var confirmMdp   by remember { mutableStateOf("") }
    var messageEcran by remember { mutableStateOf("") }
    var isSuccess    by remember { mutableStateOf(false) }
    Column(modifier = Modifier.fillMaxSize().background(Cream).verticalScroll(rememberScrollState())) {
        Box(modifier = Modifier.fillMaxWidth().background(Brush.horizontalGradient(listOf(Navy, NavyLight))).padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                TextButton(onClick = onRetour) { Text("← Retour", color = Gold, fontWeight = FontWeight.SemiBold) }
                Spacer(modifier = Modifier.width(8.dp))
                Column {
                    Text("Modifier le mot de passe", color = White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Text(currentUser.replaceFirstChar { it.uppercase() }, color = Gold, fontSize = 12.sp)
                }
            }
        }
        Column(modifier = Modifier.padding(20.dp)) {
            Spacer(modifier = Modifier.height(8.dp))
            SodalmuCard {
                Text("🔑  Changer le mot de passe", color = Navy, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                Spacer(modifier = Modifier.height(16.dp))
                OutlinedTextField(value = ancienMdp, onValueChange = { ancienMdp = it }, label = { Text("Ancien mot de passe") }, visualTransformation = PasswordVisualTransformation(), modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp))
                Spacer(modifier = Modifier.height(12.dp))
                OutlinedTextField(value = nouveauMdp, onValueChange = { nouveauMdp = it }, label = { Text("Nouveau mot de passe") }, visualTransformation = PasswordVisualTransformation(), modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp))
                Spacer(modifier = Modifier.height(12.dp))
                OutlinedTextField(value = confirmMdp, onValueChange = { confirmMdp = it }, label = { Text("Confirmer le nouveau mot de passe") }, visualTransformation = PasswordVisualTransformation(), modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp))
                Spacer(modifier = Modifier.height(20.dp))
                if (messageEcran.isNotEmpty()) {
                    Card(colors = CardDefaults.cardColors(containerColor = if (isSuccess) Success.copy(0.08f) else Danger.copy(0.08f)), shape = RoundedCornerShape(8.dp)) {
                        Text(messageEcran, color = if (isSuccess) Success else Danger, modifier = Modifier.padding(12.dp), fontSize = 13.sp)
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                }
                GoldButton("Valider le changement") {
                    when {
                        ancienMdp != motsDePasse[currentUser] -> { messageEcran = "❌ Ancien mot de passe incorrect"; isSuccess = false }
                        nouveauMdp.length < 4                 -> { messageEcran = "❌ Minimum 4 caractères requis"; isSuccess = false }
                        nouveauMdp != confirmMdp              -> { messageEcran = "❌ Les mots de passe ne correspondent pas"; isSuccess = false }
                        nouveauMdp == ancienMdp               -> { messageEcran = "❌ Le nouveau doit être différent de l'ancien"; isSuccess = false }
                        else -> {
                            motsDePasse[currentUser] = nouveauMdp
                            sauvegarderMotDePasse(context, currentUser, nouveauMdp)
                            messageEcran = "✅ Mot de passe modifié avec succès"; isSuccess = true
                            ancienMdp = ""; nouveauMdp = ""; confirmMdp = ""
                        }
                    }
                }
            }
        }
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// CAMION APP
// ══════════════════════════════════════════════════════════════════════════════
@Composable
fun CamionApp() {
    val context     = LocalContext.current
    var showSplash  by remember { mutableStateOf(true) }
    val camions     = remember { mutableStateListOf<CamionRecord>() }
    val commandes   = remember { mutableStateListOf<CommandeADV>() }
    val motsDePasse = remember { mutableStateMapOf<String, String>().apply { putAll(chargerMotsDePasse(context)) } }
    var username    by remember { mutableStateOf("") }
    var password    by remember { mutableStateOf("") }
    var role        by remember { mutableStateOf("") }
    var loginError  by remember { mutableStateOf("") }
    var currentUser by remember { mutableStateOf("") }

    // ── Listeners Firebase — synchronisation temps réel ─────────────────────
    DisposableEffect(Unit) {
        val db = FirebaseDatabase.getInstance().reference

        val camionListener = object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val liste = mutableListOf<CamionRecord>()
                snapshot.children.forEach { child ->
                    try {
                        liste.add(CamionRecord(
                            id              = (child.child("id").getValue(Long::class.java) ?: 0L).toInt(),
                            date            = child.child("date").getValue(String::class.java) ?: "",
                            immatriculation = child.child("immatriculation").getValue(String::class.java) ?: "",
                            transporteur    = child.child("transporteur").getValue(String::class.java) ?: "",
                            heureArrivee    = child.child("heureArrivee").getValue(String::class.java) ?: "",
                            tonnage         = child.child("tonnage").getValue(String::class.java) ?: "",
                            client          = child.child("client").getValue(String::class.java) ?: "",
                            destination     = child.child("destination").getValue(String::class.java) ?: "",
                            statut          = child.child("statut").getValue(String::class.java) ?: "En attente",
                            heureDepart     = child.child("heureDepart").getValue(String::class.java) ?: "",
                            actif           = child.child("actif").getValue(Boolean::class.java) ?: true
                        ))
                    } catch (_: Exception) {}
                }
                camions.clear()
                camions.addAll(liste.sortedBy { it.id })
            }
            override fun onCancelled(error: DatabaseError) {}
        }

        val commandeListener = object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val liste = mutableListOf<CommandeADV>()
                snapshot.children.forEach { child ->
                    try {
                        liste.add(CommandeADV(
                            id            = (child.child("id").getValue(Long::class.java) ?: 0L).toInt(),
                            client        = child.child("client").getValue(String::class.java) ?: "",
                            destination   = child.child("destination").getValue(String::class.java) ?: "",
                            tonnage       = child.child("tonnage").getValue(String::class.java) ?: "",
                            dateLivraison = child.child("dateLivraison").getValue(String::class.java) ?: "",
                            typeTransport = child.child("typeTransport").getValue(String::class.java) ?: "",
                            statut        = child.child("statut").getValue(String::class.java) ?: "En attente",
                            camionId      = (child.child("camionId").getValue(Long::class.java) ?: -1L).toInt().takeIf { it != -1 },
                            dateCreation  = child.child("dateCreation").getValue(String::class.java) ?: ""
                        ))
                    } catch (_: Exception) {}
                }
                commandes.clear()
                commandes.addAll(liste.sortedBy { it.id })
            }
            override fun onCancelled(error: DatabaseError) {}
        }

        val camionsRef   = db.child("camions")
        val commandesRef = db.child("commandes")
        camionsRef.addValueEventListener(camionListener)
        commandesRef.addValueEventListener(commandeListener)

        onDispose {
            camionsRef.removeEventListener(camionListener)
            commandesRef.removeEventListener(commandeListener)
        }
    }

    if (showSplash) { SplashScreen(onFinished = { showSplash = false }); return }

    Surface(modifier = Modifier.fillMaxSize(), color = Cream) {
        if (role.isEmpty()) {
            LoginScreen(
                username = username, password = password, loginError = loginError,
                onUsernameChange = { username = it }, onPasswordChange = { password = it },
                onLogin = {
                    val u   = username.trim().lowercase()
                    val mdp = motsDePasse[u]
                    when {
                        u == "securite" && password == mdp -> { role = "SECURITE";   currentUser = u; loginError = "" }
                        u == "admin"    && password == mdp -> { role = "ADMIN";      currentUser = u; loginError = "" }
                        u == "adv"      && password == mdp -> { role = "ADV";        currentUser = u; loginError = "" }
                        u in listOf("hafid", "hassan", "said", "lemyasser", "fouad") && password == mdp -> { role = "MAGASINIER"; currentUser = u; loginError = "" }
                        else -> loginError = "Identifiant ou mot de passe incorrect"
                    }
                }
            )
        } else {
            MainScreen(
                role        = role,
                currentUser = currentUser,
                camions     = camions,
                commandes   = commandes,
                motsDePasse = motsDePasse,
                onSave      = {
                    sauvegarderCamions(camions)
                    sauvegarderCommandes(commandes)
                },
                onLogout = { role = ""; username = ""; password = ""; loginError = ""; currentUser = "" }
            )
        }
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ══════════════════════════════════════════════════════════════════════════════
@Composable
fun MainScreen(
    role: String, currentUser: String,
    camions: SnapshotStateList<CamionRecord>,
    commandes: SnapshotStateList<CommandeADV>,
    motsDePasse: androidx.compose.runtime.snapshots.SnapshotStateMap<String, String>,
    onSave: () -> Unit, onLogout: () -> Unit
) {
    val context = LocalContext.current
    var showChangerMdp by remember { mutableStateOf(false) }

    if (showChangerMdp) {
        ChangerMotDePasseScreen(currentUser = currentUser, motsDePasse = motsDePasse, onRetour = { showChangerMdp = false })
        return
    }

    var date                    by remember { mutableStateOf("") }
    var immatriculation         by remember { mutableStateOf("") }
    var transporteur            by remember { mutableStateOf("") }
    var heureArrivee            by remember { mutableStateOf("") }
    var tonnage                 by remember { mutableStateOf("") }
    var editCamionId            by remember { mutableStateOf<Int?>(null) }
    var showDeleteConfirmId     by remember { mutableStateOf<Int?>(null) }
    var selectedCamionId        by remember { mutableStateOf<Int?>(null) }
    var client                  by remember { mutableStateOf("") }
    var destination             by remember { mutableStateOf("") }
    var statutAdmin             by remember { mutableStateOf("En attente") }
    var selectedNouveauCamionId by remember { mutableStateOf<Int?>(null) }
    var expandedReaffectation   by remember { mutableStateOf(false) }
    var showHistorique          by remember { mutableStateOf(false) }
    var message                 by remember { mutableStateOf("") }
    var messageSuccess          by remember { mutableStateOf(true) }
    var modeChangementStatut    by remember { mutableStateOf(false) }
    var showMoisExport          by remember { mutableStateOf(false) }
    var importResultMessage     by remember { mutableStateOf("") }
    var showImportResult        by remember { mutableStateOf(false) }

    // Launcher import Excel — commandes ADV (écran Admin)
    val importExcelLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri ->
        if (uri != null) {
            try {
                val result = importerCommandesDepuisExcel(context, uri, commandes.toList())
                if (result.idsASupprimer.isNotEmpty()) {
                    val toRemove = result.idsASupprimer.toSet()
                    commandes.removeAll(commandes.filter { it.id in toRemove })
                }
                if (result.nouvelles.isNotEmpty()) {
                    commandes.addAll(result.nouvelles)
                }
                if (result.nouvelles.isNotEmpty() || result.idsASupprimer.isNotEmpty()) onSave()
                importResultMessage = when {
                    result.ajoutees > 0 && result.supprimees > 0 ->
                        "✅ ${result.ajoutees} ajoutée(s), ${result.supprimees} supprimée(s)"
                    result.ajoutees > 0 -> "✅ ${result.ajoutees} nouvelle(s) commande(s) ajoutée(s)"
                    result.supprimees > 0 -> "🗑️ ${result.supprimees} commande(s) supprimée(s) (absentes du CSV)"
                    else -> "⚠️ Aucun changement (fichier identique ou vide)"
                }
            } catch (e: Exception) {
                importResultMessage = "❌ Erreur lors de l'import : ${e.message}"
            }
            showImportResult = true
        }
    }

    // Launcher import Excel — camions (écran Sécurité)
    val importCamionsLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri ->
        if (uri != null) {
            try {
                val (nouveaux, count) = importerCamionsDepuisExcel(context, uri, camions.toList())
                if (nouveaux.isNotEmpty()) { camions.addAll(nouveaux); onSave() }
                importResultMessage = if (count > 0) "✅ $count camions importés avec succès"
                                      else "⚠️ Aucun camion valide trouvé dans le fichier"
            } catch (e: Exception) {
                importResultMessage = "❌ Erreur lors de l'import : ${e.message}"
            }
            showImportResult = true
        }
    }

    val selectedCamion    = camions.find { it.id == selectedCamionId }
    val camionsActifs     = camions.filter { it.actif }
    val dateLaPlusRecente = camionsActifs.maxOfOrNull { it.date }.orEmpty()
    val camionsVisibles   = camionsActifs.filter {
        it.date == dateLaPlusRecente || it.statut == "En attente" || it.statut == "En cours de chargement"
    }.sortedBy { sortKey(it) }

    val moisDisponibles = camions
        .mapNotNull { c -> if (c.date.length >= 7) c.date.substring(0, 7) else null }
        .distinct().sortedDescending()

    fun nomMois(ym: String): String {
        val moisNoms = listOf("","Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre")
        return try { val p = ym.split("-"); "${moisNoms[p[1].toInt()]} ${p[0]}" } catch (e: Exception) { ym }
    }
    fun chargerPourEdition(camion: CamionRecord) {
        editCamionId = camion.id; date = camion.date; immatriculation = camion.immatriculation
        transporteur = camion.transporteur; heureArrivee = camion.heureArrivee; tonnage = camion.tonnage
    }
    fun resetFormulaire() {
        editCamionId = null; date = ""; immatriculation = ""; transporteur = ""; heureArrivee = ""; tonnage = ""
    }

    // ── Dialog export mois ────────────────────────────────────────────────────
    if (showMoisExport) {
        AlertDialog(
            onDismissRequest = { showMoisExport = false },
            title = { Text("📊 Exporter en Excel", fontWeight = FontWeight.Bold, color = Navy) },
            text = {
                Column {
                    Text("Choisissez le mois à exporter :", color = TextMedium, fontSize = 14.sp)
                    Spacer(modifier = Modifier.height(12.dp))
                    if (moisDisponibles.isEmpty()) {
                        Text("Aucune donnée disponible.", color = TextLight, fontSize = 13.sp)
                    } else {
                        moisDisponibles.forEach { ym ->
                            val label     = nomMois(ym)
                            val nbCamions = camions.count { it.date.startsWith(ym) }
                            OutlinedButton(
                                onClick = {
                                    showMoisExport = false
                                    val ok = exporterExcel(context, camions.filter { it.date.startsWith(ym) }, label)
                                    message = if (ok) "✅ Export Excel lancé pour $label" else "❌ Erreur lors de l'export"
                                    messageSuccess = ok
                                },
                                modifier = Modifier.fillMaxWidth().padding(vertical = 3.dp),
                                shape    = RoundedCornerShape(10.dp),
                                colors   = ButtonDefaults.outlinedButtonColors(contentColor = Navy)
                            ) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                    Text("📅 $label", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                                    Text("$nbCamions camion(s)", color = TextMedium, fontSize = 12.sp)
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {},
            dismissButton = { TextButton(onClick = { showMoisExport = false }) { Text("Fermer", color = Navy) } }
        )
    }

    if (showImportResult) {
        AlertDialog(
            onDismissRequest = { showImportResult = false },
            title = { Text("📥 Import Excel", fontWeight = FontWeight.Bold, color = Navy) },
            text  = { Text(importResultMessage, fontSize = 14.sp) },
            confirmButton = {
                Button(onClick = { showImportResult = false }, colors = ButtonDefaults.buttonColors(containerColor = Navy)) {
                    Text("OK", color = White, fontWeight = FontWeight.Bold)
                }
            }
        )
    }

    Column(modifier = Modifier.fillMaxSize().background(Cream)) {
        AppHeader(
            titre          = when (role) { "SECURITE" -> "Espace Sécurité"; "ADMIN" -> "Responsable Logistique"; "ADV" -> "Espace ADV"; else -> "Espace Magasinier" },
            sousTitre      = when (role) { "MAGASINIER" -> currentUser.replaceFirstChar { it.uppercase() }; "ADV" -> currentUser.uppercase(); else -> "" },
            showHistorique = showHistorique,
            onHistorique   = if (role == "ADMIN") ({ showHistorique = !showHistorique }) else null,
            onChangerMdp   = { showChangerMdp = true },
            onLogout       = onLogout
        )

        Column(modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)) {

            if (message.isNotEmpty()) {
                Card(modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
                    colors = CardDefaults.cardColors(containerColor = if (messageSuccess) Success.copy(0.08f) else Danger.copy(0.08f)),
                    shape  = RoundedCornerShape(12.dp)
                ) { Text(message, color = if (messageSuccess) Success else Danger, modifier = Modifier.padding(12.dp), fontWeight = FontWeight.SemiBold) }
            }

            // ── Historique Admin ──────────────────────────────────────────────
            if (role == "ADMIN" && showHistorique) {
                val historique = camions.filter { !it.actif || it.statut == "Départ validé" }.groupBy { it.date }.toSortedMap(compareByDescending { it })
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("📋  Historique des chargements", color = Navy, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Button(onClick = { showMoisExport = true }, shape = RoundedCornerShape(10.dp), colors = ButtonDefaults.buttonColors(containerColor = Success)) {
                        Text("📊 Excel", color = White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }
                }
                Spacer(modifier = Modifier.height(10.dp))
                if (historique.isEmpty()) {
                    SodalmuCard { Text("Aucun historique disponible", color = TextMedium, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth()) }
                } else {
                    historique.forEach { (dateHist, liste) ->
                        SodalmuCard(modifier = Modifier.padding(bottom = 10.dp)) {
                            Text("📅  $dateHist", color = Navy, fontWeight = FontWeight.Bold)
                            Spacer(modifier = Modifier.height(8.dp))
                            HorizontalDivider(color = CreamDark)
                            Spacer(modifier = Modifier.height(8.dp))
                            liste.sortedBy { sortKey(it) }.forEach { c ->
                                Row(modifier = Modifier.fillMaxWidth().padding(vertical = 3.dp)) {
                                    Text("• ${c.immatriculation}", color = Navy, fontWeight = FontWeight.SemiBold, modifier = Modifier.width(100.dp), fontSize = 13.sp)
                                    Column {
                                        Text("${c.transporteur} · ${c.client.ifBlank { "Sans client" }}", color = TextMedium, fontSize = 12.sp)
                                        Text("${c.destination.ifBlank { "?" }} · Départ: ${if (c.heureDepart.isBlank()) "-" else c.heureDepart}", color = TextMedium, fontSize = 12.sp)
                                        if (c.tonnage.isNotBlank()) Text("⚖️ ${c.tonnage}", color = TextMedium, fontSize = 12.sp)
                                        Spacer(modifier = Modifier.height(2.dp))
                                        StatutBadge(c.statut)
                                    }
                                }
                                Spacer(modifier = Modifier.height(6.dp))
                            }
                        }
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))
                HorizontalDivider(color = CreamDark, thickness = 2.dp)
                Spacer(modifier = Modifier.height(16.dp))
            }

            when (role) {

                // ════════════════════════════════════════
                // SÉCURITÉ
                // ════════════════════════════════════════
                "SECURITE" -> {
                    // ── Import Excel camions ──────────────────────────────────
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            if (editCamionId == null) "📝  Enregistrement d'un camion" else "✏️  Modifier le camion",
                            color = Navy, fontWeight = FontWeight.Bold, fontSize = 16.sp
                        )
                        Button(
                            onClick = {
                                importCamionsLauncher.launch("*/*")
                            },
                            shape  = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Info)
                        ) {
                            Text("📥 Importer Excel", color = White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        }
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                    SodalmuCard {
                        if (editCamionId != null) {
                            Card(colors = CardDefaults.cardColors(containerColor = Gold.copy(0.10f)), shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth()) {
                                Text("✏️ Mode modification — camion en attente uniquement", color = Gold, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(10.dp))
                            }
                            Spacer(modifier = Modifier.height(12.dp))
                        }
                        DatePickerButton("Sélectionner la date", date) { date = it }
                        Spacer(modifier = Modifier.height(10.dp))
                        OutlinedTextField(value = immatriculation, onValueChange = { immatriculation = it }, label = { Text("Immatriculation") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp))
                        Spacer(modifier = Modifier.height(10.dp))
                        TransporteurDropdown(label = "Sélectionner le transporteur", valeur = transporteur, onValeurChange = { transporteur = it })
                        Spacer(modifier = Modifier.height(10.dp))
                        HeureDropdown(label = "Heure d'arrivée", valeur = heureArrivee, onValeurChange = { heureArrivee = it })
                        Spacer(modifier = Modifier.height(10.dp))
                        TonnageDropdown(label = "Tonnage (14T ou 25T)", valeur = tonnage, onValeurChange = { tonnage = it })
                        Spacer(modifier = Modifier.height(16.dp))
                        if (editCamionId == null) {
                            GoldButton("✚  Enregistrer l'arrivée") {
                                val existe = camionsActifs.any { it.immatriculation.trim().equals(immatriculation.trim(), ignoreCase = true) }
                                when {
                                    date.isBlank() || immatriculation.isBlank() || transporteur.isBlank() || heureArrivee.isBlank() || tonnage.isBlank() -> { message = "⚠️ Merci de remplir tous les champs"; messageSuccess = false }
                                    existe -> { message = "⚠️ Cette immatriculation existe déjà"; messageSuccess = false }
                                    else -> {
                                        val newId = if (camions.isEmpty()) 1 else camions.maxOf { it.id } + 1
                                        camions.add(CamionRecord(id = newId, date = date, immatriculation = immatriculation, transporteur = transporteur, heureArrivee = heureArrivee, tonnage = tonnage, statut = "En attente", actif = true))
                                        resetFormulaire(); onSave()
                                        message = "✅ Camion enregistré avec succès"; messageSuccess = true
                                    }
                                }
                            }
                        } else {
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                OutlinedButton(onClick = { resetFormulaire(); message = "" }, modifier = Modifier.weight(1f).height(52.dp), shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.outlinedButtonColors(contentColor = Navy)) { Text("Annuler") }
                                Button(
                                    onClick = {
                                        val index = camions.indexOfFirst { it.id == editCamionId }
                                        val existeAutre = camionsActifs.any { it.id != editCamionId && it.immatriculation.trim().equals(immatriculation.trim(), ignoreCase = true) }
                                        when {
                                            date.isBlank() || immatriculation.isBlank() || transporteur.isBlank() || heureArrivee.isBlank() || tonnage.isBlank() -> { message = "⚠️ Merci de remplir tous les champs"; messageSuccess = false }
                                            existeAutre -> { message = "⚠️ Cette immatriculation existe déjà"; messageSuccess = false }
                                            index != -1 -> { camions[index] = camions[index].copy(date = date, immatriculation = immatriculation, transporteur = transporteur, heureArrivee = heureArrivee, tonnage = tonnage); resetFormulaire(); onSave(); message = "✅ Camion modifié avec succès"; messageSuccess = true }
                                        }
                                    },
                                    modifier = Modifier.weight(1f).height(52.dp), shape = RoundedCornerShape(12.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = Gold)
                                ) { Text("💾  Sauvegarder", fontWeight = FontWeight.Bold, color = Navy) }
                            }
                        }
                    }
                    Spacer(modifier = Modifier.height(20.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("🚚  Camions visibles", color = Navy, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        Spacer(modifier = Modifier.width(8.dp))
                        if (camionsVisibles.isNotEmpty()) {
                            Box(modifier = Modifier.background(Navy, RoundedCornerShape(20.dp)).padding(horizontal = 8.dp, vertical = 2.dp)) { Text("${camionsVisibles.size}", color = White, fontSize = 12.sp, fontWeight = FontWeight.Bold) }
                        }
                    }
                    Spacer(modifier = Modifier.height(10.dp))
                    if (camionsVisibles.isEmpty()) {
                        SodalmuCard { Text("Aucun camion enregistré pour le moment", color = TextMedium, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth()) }
                    } else {
                        camionsVisibles.forEach { camion ->
                            val enAttente = camion.statut == "En attente"
                            if (showDeleteConfirmId == camion.id) {
                                AlertDialog(
                                    onDismissRequest = { showDeleteConfirmId = null },
                                    title = { Text("Confirmer la suppression", fontWeight = FontWeight.Bold, color = Navy) },
                                    text  = { Text("Supprimer le camion \"${camion.immatriculation}\" ?\nCette action est irréversible.") },
                                    confirmButton = {
                                        Button(onClick = {
                                            val index = camions.indexOfFirst { it.id == camion.id }
                                            if (index != -1) camions.removeAt(index)
                                            showDeleteConfirmId = null
                                            if (editCamionId == camion.id) resetFormulaire()
                                            onSave(); message = "🗑️ Camion supprimé"; messageSuccess = false
                                        }, colors = ButtonDefaults.buttonColors(containerColor = Danger)) { Text("Supprimer", color = White, fontWeight = FontWeight.Bold) }
                                    },
                                    dismissButton = { OutlinedButton(onClick = { showDeleteConfirmId = null }) { Text("Annuler") } }
                                )
                            }
                            SodalmuCard(modifier = Modifier.padding(bottom = 10.dp)) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Top) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(camion.immatriculation, fontWeight = FontWeight.Bold, color = Navy, fontSize = 16.sp)
                                        Text(camion.transporteur, color = TextMedium, fontSize = 13.sp)
                                    }
                                    Column(horizontalAlignment = Alignment.End) {
                                        StatutBadge(camion.statut)
                                        if (camion.tonnage.isNotBlank()) { Spacer(modifier = Modifier.height(4.dp)); TonnageBadge(camion.tonnage) }
                                    }
                                }
                                Spacer(modifier = Modifier.height(8.dp))
                                HorizontalDivider(color = CreamDark)
                                Spacer(modifier = Modifier.height(8.dp))
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Column {
                                        Text("📅 ${camion.date}", color = TextMedium, fontSize = 12.sp)
                                        Text("🕐 Arrivée : ${camion.heureArrivee}", color = TextMedium, fontSize = 12.sp)
                                    }
                                    Text("🚀 Départ : ${if (camion.heureDepart.isBlank()) "--:--" else camion.heureDepart}", color = if (camion.heureDepart.isBlank()) TextLight else Success, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                                }
                                if (enAttente) {
                                    Spacer(modifier = Modifier.height(10.dp))
                                    HorizontalDivider(color = CreamDark)
                                    Spacer(modifier = Modifier.height(10.dp))
                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        OutlinedButton(onClick = { chargerPourEdition(camion); message = "" }, modifier = Modifier.weight(1f).height(40.dp), shape = RoundedCornerShape(10.dp), colors = ButtonDefaults.outlinedButtonColors(contentColor = Navy)) { Text("✏️ Modifier", fontSize = 13.sp, fontWeight = FontWeight.SemiBold) }
                                        OutlinedButton(onClick = { showDeleteConfirmId = camion.id }, modifier = Modifier.weight(1f).height(40.dp), shape = RoundedCornerShape(10.dp), colors = ButtonDefaults.outlinedButtonColors(contentColor = Danger)) { Text("🗑️ Supprimer", fontSize = 13.sp, fontWeight = FontWeight.SemiBold) }
                                    }
                                }
                            }
                        }
                    }
                }

                // ════════════════════════════════════════
                // ADV
                // ════════════════════════════════════════
                "ADV" -> {
                    var advClient        by remember { mutableStateOf("") }
                    var advDestination   by remember { mutableStateOf("") }
                    var advTonnage       by remember { mutableStateOf("") }
                    var advDateLivraison by remember { mutableStateOf("") }
                    var advTypeTransport by remember { mutableStateOf("") }
                    var editCommandeId   by remember { mutableStateOf<Int?>(null) }
                    var showDeleteConfirmCommandeId by remember { mutableStateOf<Int?>(null) }

                    fun resetFormulaireADV() {
                        advClient = ""; advDestination = ""; advTonnage = ""
                        advDateLivraison = ""; advTypeTransport = ""; editCommandeId = null
                    }
                    fun chargerCommandePourEdition(cmd: CommandeADV) {
                        editCommandeId = cmd.id; advClient = cmd.client; advDestination = cmd.destination
                        advTonnage = cmd.tonnage; advDateLivraison = cmd.dateLivraison; advTypeTransport = cmd.typeTransport
                    }

                    Text(if (editCommandeId == null) "📋  Nouvelle commande client" else "✏️  Modifier la commande", color = Navy, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Spacer(modifier = Modifier.height(12.dp))

                    SodalmuCard {
                        if (editCommandeId != null) {
                            Card(colors = CardDefaults.cardColors(containerColor = Gold.copy(0.10f)), shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth()) {
                                Text("✏️ Mode modification", color = Gold, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(10.dp))
                            }
                            Spacer(modifier = Modifier.height(12.dp))
                        }
                        OutlinedTextField(value = advClient, onValueChange = { advClient = it }, label = { Text("Client") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp))
                        Spacer(modifier = Modifier.height(10.dp))
                        DestinationDropdown(label = "Sélectionner la destination", valeur = advDestination, onValeurChange = { advDestination = it })
                        Spacer(modifier = Modifier.height(10.dp))
                        TonnageDropdown(label = "Tonnage (14T ou 25T)", valeur = advTonnage, onValeurChange = { advTonnage = it })
                        Spacer(modifier = Modifier.height(10.dp))
                        DatePickerButton(label = "Date de livraison souhaitée", valeur = advDateLivraison, onValeurChange = { advDateLivraison = it })
                        Spacer(modifier = Modifier.height(10.dp))
                        TypeTransportDropdown(label = "Type de transport", valeur = advTypeTransport, onValeurChange = { advTypeTransport = it })
                        Spacer(modifier = Modifier.height(16.dp))

                        if (editCommandeId == null) {
                            GoldButton("✚  Enregistrer la commande") {
                                when {
                                    advClient.isBlank() || advDestination.isBlank() || advTonnage.isBlank() || advDateLivraison.isBlank() || advTypeTransport.isBlank() -> { message = "⚠️ Merci de remplir tous les champs"; messageSuccess = false }
                                    else -> {
                                        val today = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.getDefault()).format(java.util.Date())
                                        val newId = if (commandes.isEmpty()) 1 else commandes.maxOf { it.id } + 1
                                        commandes.add(CommandeADV(id = newId, client = advClient, destination = advDestination, tonnage = advTonnage, dateLivraison = advDateLivraison, typeTransport = advTypeTransport, statut = "En attente", dateCreation = today))
                                        resetFormulaireADV(); onSave()
                                        message = "✅ Commande enregistrée avec succès"; messageSuccess = true
                                    }
                                }
                            }
                        } else {
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                OutlinedButton(onClick = { resetFormulaireADV(); message = "" }, modifier = Modifier.weight(1f).height(52.dp), shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.outlinedButtonColors(contentColor = Navy)) { Text("Annuler") }
                                Button(
                                    onClick = {
                                        val index = commandes.indexOfFirst { it.id == editCommandeId }
                                        when {
                                            advClient.isBlank() || advDestination.isBlank() || advTonnage.isBlank() || advDateLivraison.isBlank() || advTypeTransport.isBlank() -> { message = "⚠️ Merci de remplir tous les champs"; messageSuccess = false }
                                            index != -1 -> {
                                                commandes[index] = commandes[index].copy(client = advClient, destination = advDestination, tonnage = advTonnage, dateLivraison = advDateLivraison, typeTransport = advTypeTransport)
                                                resetFormulaireADV(); onSave(); message = "✅ Commande modifiée"; messageSuccess = true
                                            }
                                        }
                                    },
                                    modifier = Modifier.weight(1f).height(52.dp), shape = RoundedCornerShape(12.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = Gold)
                                ) { Text("💾  Sauvegarder", fontWeight = FontWeight.Bold, color = Navy) }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(20.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("📦  Mes commandes", color = Navy, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        Spacer(modifier = Modifier.width(8.dp))
                        if (commandes.isNotEmpty()) {
                            Box(modifier = Modifier.background(Navy, RoundedCornerShape(20.dp)).padding(horizontal = 8.dp, vertical = 2.dp)) { Text("${commandes.size}", color = White, fontSize = 12.sp, fontWeight = FontWeight.Bold) }
                        }
                    }
                    Spacer(modifier = Modifier.height(10.dp))

                    if (commandes.isEmpty()) {
                        SodalmuCard { Text("Aucune commande enregistrée", color = TextMedium, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth()) }
                    } else {
                        commandes.sortedByDescending { it.dateCreation }.forEach { cmd ->
                            if (showDeleteConfirmCommandeId == cmd.id) {
                                AlertDialog(
                                    onDismissRequest = { showDeleteConfirmCommandeId = null },
                                    title = { Text("Confirmer la suppression", fontWeight = FontWeight.Bold, color = Navy) },
                                    text  = { Text("Supprimer la commande \"${cmd.client}\" ?\nCette action est irréversible.") },
                                    confirmButton = {
                                        Button(onClick = {
                                            val idx = commandes.indexOfFirst { it.id == cmd.id }
                                            if (idx != -1) commandes.removeAt(idx)
                                            showDeleteConfirmCommandeId = null
                                            onSave(); message = "🗑️ Commande supprimée"; messageSuccess = false
                                        }, colors = ButtonDefaults.buttonColors(containerColor = Danger)) { Text("Supprimer", color = White, fontWeight = FontWeight.Bold) }
                                    },
                                    dismissButton = { OutlinedButton(onClick = { showDeleteConfirmCommandeId = null }) { Text("Annuler") } }
                                )
                            }

                            SodalmuCard(modifier = Modifier.padding(bottom = 10.dp)) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Top) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(cmd.client, fontWeight = FontWeight.Bold, color = Navy, fontSize = 16.sp)
                                        Text(cmd.destination, color = TextMedium, fontSize = 13.sp)
                                    }
                                    Column(horizontalAlignment = Alignment.End) {
                                        val statutCouleur = when (cmd.statut) { "Affecté" -> Success; "Livré" -> Teal; else -> Warning }
                                        Box(modifier = Modifier.background(statutCouleur.copy(0.12f), RoundedCornerShape(20.dp)).padding(horizontal = 10.dp, vertical = 4.dp)) {
                                            Text(cmd.statut, color = statutCouleur, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                                        }
                                        Spacer(modifier = Modifier.height(4.dp))
                                        TonnageBadge(cmd.tonnage)
                                    }
                                }
                                Spacer(modifier = Modifier.height(8.dp))
                                HorizontalDivider(color = CreamDark)
                                Spacer(modifier = Modifier.height(8.dp))
                                Text("📅 Livraison : ${cmd.dateLivraison}", color = TextMedium, fontSize = 12.sp)
                                Text("🚛 Transport : ${cmd.typeTransport}", color = TextMedium, fontSize = 12.sp)
                                Text("📝 Créée le : ${cmd.dateCreation}", color = TextLight, fontSize = 11.sp)

                                if (cmd.statut == "En attente" || (cmd.statut == "Affecté" && camions.find { it.id == cmd.camionId }?.statut == "En attente")) {
                                    Spacer(modifier = Modifier.height(10.dp))
                                    HorizontalDivider(color = CreamDark)
                                    Spacer(modifier = Modifier.height(10.dp))
                                    if (cmd.statut == "Affecté") {
                                        Card(colors = CardDefaults.cardColors(containerColor = Info.copy(0.08f)), shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth()) {
                                            Text("ℹ️ Commande affectée — modification encore possible car le camion est en attente", color = Info, fontSize = 11.sp, modifier = Modifier.padding(8.dp))
                                        }
                                        Spacer(modifier = Modifier.height(8.dp))
                                    }
                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        OutlinedButton(onClick = { chargerCommandePourEdition(cmd); message = "" }, modifier = Modifier.weight(1f).height(40.dp), shape = RoundedCornerShape(10.dp), colors = ButtonDefaults.outlinedButtonColors(contentColor = Navy)) { Text("✏️ Modifier", fontSize = 13.sp, fontWeight = FontWeight.SemiBold) }
                                        OutlinedButton(onClick = { showDeleteConfirmCommandeId = cmd.id }, modifier = Modifier.weight(1f).height(40.dp), shape = RoundedCornerShape(10.dp), colors = ButtonDefaults.outlinedButtonColors(contentColor = Danger)) { Text("🗑️ Supprimer", fontSize = 13.sp, fontWeight = FontWeight.SemiBold) }
                                    }
                                }
                            }
                        }
                    }
                }

                // ════════════════════════════════════════
                // ADMIN
                // ════════════════════════════════════════
                "ADMIN" -> {
                    // ── État formulaires admin ────────────────────────────────
                    var showAddCmdForm    by remember { mutableStateOf(false) }
                    var showAddCamionForm by remember { mutableStateOf(false) }
                    var showResetDialog   by remember { mutableStateOf(false) }
                    var addCmdClient      by remember { mutableStateOf("") }
                    var addCmdDest        by remember { mutableStateOf("") }
                    var addCmdTonnage     by remember { mutableStateOf("") }
                    var addCmdDate        by remember { mutableStateOf("") }
                    var addCmdType        by remember { mutableStateOf("") }
                    var addCamDate        by remember { mutableStateOf("") }
                    var addCamImmat       by remember { mutableStateOf("") }
                    var addCamTransp      by remember { mutableStateOf("") }
                    var addCamHeure       by remember { mutableStateOf("") }
                    var addCamTonnage     by remember { mutableStateOf("") }

                    // ── Dialog réinitialisation ───────────────────────────────
                    if (showResetDialog) {
                        AlertDialog(
                            onDismissRequest = { showResetDialog = false },
                            title = { Text("⚠️ Réinitialiser les données", fontWeight = FontWeight.Bold, color = Danger) },
                            text  = { Text("Supprimer TOUS les camions et toutes les commandes ?\nCette action est irréversible.", fontSize = 14.sp) },
                            confirmButton = {
                                Button(onClick = {
                                    // Effacement direct sur Firebase (sans passer par onSave)
                                    effacerCamionsFirebase()
                                    effacerCommandesFirebase()
                                    camions.clear(); commandes.clear()
                                    showResetDialog = false; message = "🔄 Données réinitialisées"; messageSuccess = true
                                }, colors = ButtonDefaults.buttonColors(containerColor = Danger)) {
                                    Text("Réinitialiser", color = White, fontWeight = FontWeight.Bold)
                                }
                            },
                            dismissButton = { OutlinedButton(onClick = { showResetDialog = false }) { Text("Annuler") } }
                        )
                    }

                    // ── Import Excel + Réinitialiser ──────────────────────────
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Button(
                            onClick = { showResetDialog = true },
                            shape  = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Danger)
                        ) {
                            Text("🔄 Réinitialiser", color = White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        }
                        Button(
                            onClick = { importExcelLauncher.launch("*/*") },
                            shape  = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Info)
                        ) {
                            Text("📥 Importer CSV/Excel", color = White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        }
                    }
                    Spacer(modifier = Modifier.height(10.dp))

                    // ── Bouton : Nouvelle commande ────────────────────────────
                    OutlinedButton(
                        onClick = { showAddCmdForm = !showAddCmdForm; if (!showAddCmdForm) { addCmdClient = ""; addCmdDest = ""; addCmdTonnage = ""; addCmdDate = ""; addCmdType = "" } },
                        modifier = Modifier.fillMaxWidth().height(48.dp),
                        shape    = RoundedCornerShape(12.dp),
                        colors   = ButtonDefaults.outlinedButtonColors(contentColor = Purple)
                    ) { Text(if (showAddCmdForm) "✕ Annuler nouvelle commande" else "✚ Nouvelle commande", fontWeight = FontWeight.SemiBold) }
                    if (showAddCmdForm) {
                        Spacer(modifier = Modifier.height(8.dp))
                        SodalmuCard {
                            Text("📋 Nouvelle commande", color = Purple, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                            Spacer(modifier = Modifier.height(10.dp))
                            OutlinedTextField(value = addCmdClient, onValueChange = { addCmdClient = it }, label = { Text("Client") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp))
                            Spacer(modifier = Modifier.height(8.dp))
                            DestinationDropdown(label = "Sélectionner la destination", valeur = addCmdDest, onValeurChange = { addCmdDest = it })
                            Spacer(modifier = Modifier.height(8.dp))
                            TonnageDropdown(label = "Tonnage (14T ou 25T)", valeur = addCmdTonnage, onValeurChange = { addCmdTonnage = it })
                            Spacer(modifier = Modifier.height(8.dp))
                            DatePickerButton(label = "Date de livraison souhaitée", valeur = addCmdDate, onValeurChange = { addCmdDate = it })
                            Spacer(modifier = Modifier.height(8.dp))
                            TypeTransportDropdown(label = "Type de transport", valeur = addCmdType, onValeurChange = { addCmdType = it })
                            Spacer(modifier = Modifier.height(12.dp))
                            GoldButton("✚ Enregistrer la commande") {
                                when {
                                    addCmdClient.isBlank() || addCmdDest.isBlank() || addCmdTonnage.isBlank() || addCmdDate.isBlank() || addCmdType.isBlank() -> { message = "⚠️ Merci de remplir tous les champs"; messageSuccess = false }
                                    else -> {
                                        val today = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.getDefault()).format(java.util.Date())
                                        val newId = if (commandes.isEmpty()) 1 else commandes.maxOf { it.id } + 1
                                        commandes.add(CommandeADV(id = newId, client = addCmdClient, destination = addCmdDest, tonnage = addCmdTonnage, dateLivraison = addCmdDate, typeTransport = addCmdType, statut = "En attente", dateCreation = today))
                                        addCmdClient = ""; addCmdDest = ""; addCmdTonnage = ""; addCmdDate = ""; addCmdType = ""
                                        showAddCmdForm = false; onSave()
                                        message = "✅ Commande enregistrée avec succès"; messageSuccess = true
                                    }
                                }
                            }
                        }
                    }
                    Spacer(modifier = Modifier.height(8.dp))

                    // ── Bouton : Saisir un camion ─────────────────────────────
                    OutlinedButton(
                        onClick = { showAddCamionForm = !showAddCamionForm; if (!showAddCamionForm) { addCamDate = ""; addCamImmat = ""; addCamTransp = ""; addCamHeure = ""; addCamTonnage = "" } },
                        modifier = Modifier.fillMaxWidth().height(48.dp),
                        shape    = RoundedCornerShape(12.dp),
                        colors   = ButtonDefaults.outlinedButtonColors(contentColor = Navy)
                    ) { Text(if (showAddCamionForm) "✕ Annuler saisie camion" else "🚚 Saisir un camion", fontWeight = FontWeight.SemiBold) }
                    if (showAddCamionForm) {
                        Spacer(modifier = Modifier.height(8.dp))
                        SodalmuCard {
                            Text("🚚 Enregistrement d'un camion", color = Navy, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                            Spacer(modifier = Modifier.height(10.dp))
                            DatePickerButton("Sélectionner la date", addCamDate) { addCamDate = it }
                            Spacer(modifier = Modifier.height(8.dp))
                            OutlinedTextField(value = addCamImmat, onValueChange = { addCamImmat = it }, label = { Text("Immatriculation") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp))
                            Spacer(modifier = Modifier.height(8.dp))
                            TransporteurDropdown(label = "Sélectionner le transporteur", valeur = addCamTransp, onValeurChange = { addCamTransp = it })
                            Spacer(modifier = Modifier.height(8.dp))
                            HeureDropdown(label = "Heure d'arrivée", valeur = addCamHeure, onValeurChange = { addCamHeure = it })
                            Spacer(modifier = Modifier.height(8.dp))
                            TonnageDropdown(label = "Tonnage (14T ou 25T)", valeur = addCamTonnage, onValeurChange = { addCamTonnage = it })
                            Spacer(modifier = Modifier.height(12.dp))
                            GoldButton("✚ Enregistrer l'arrivée") {
                                val existeDejaActif = camionsActifs.any { it.immatriculation.trim().equals(addCamImmat.trim(), ignoreCase = true) }
                                when {
                                    addCamDate.isBlank() || addCamImmat.isBlank() || addCamTransp.isBlank() || addCamHeure.isBlank() || addCamTonnage.isBlank() -> { message = "⚠️ Merci de remplir tous les champs"; messageSuccess = false }
                                    existeDejaActif -> { message = "⚠️ Cette immatriculation existe déjà"; messageSuccess = false }
                                    else -> {
                                        val newId = if (camions.isEmpty()) 1 else camions.maxOf { it.id } + 1
                                        camions.add(CamionRecord(id = newId, date = addCamDate, immatriculation = addCamImmat, transporteur = addCamTransp, heureArrivee = addCamHeure, tonnage = addCamTonnage, statut = "En attente", actif = true))
                                        addCamDate = ""; addCamImmat = ""; addCamTransp = ""; addCamHeure = ""; addCamTonnage = ""
                                        showAddCamionForm = false; onSave()
                                        message = "✅ Camion enregistré avec succès"; messageSuccess = true
                                    }
                                }
                            }
                        }
                    }
                    Spacer(modifier = Modifier.height(12.dp))

                    // ── Commandes ADV à affecter ──────────────────────────────
                    val commandesEnAttente   = commandes.filter { it.statut == "En attente" }
                    val commandesAffectees   = commandes.filter { it.statut == "Affecté" }
                    val toutesCommandesAdmin = commandesEnAttente.isNotEmpty() || commandesAffectees.isNotEmpty()
                    var showDeleteAdminCmdId by remember { mutableStateOf<Int?>(null) }
                    if (toutesCommandesAdmin) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("📦  Commandes ADV à affecter", color = Purple, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            Spacer(modifier = Modifier.width(8.dp))
                            Box(modifier = Modifier.background(Purple, RoundedCornerShape(20.dp)).padding(horizontal = 8.dp, vertical = 2.dp)) { Text("${commandesEnAttente.size}", color = White, fontSize = 12.sp, fontWeight = FontWeight.Bold) }
                        }
                        Spacer(modifier = Modifier.height(10.dp))
                        commandesEnAttente.forEach { cmd ->
                            // Filtrage : tonnage + type transport (lui-même = transporteur "Lui-même")
                            fun estLuiMeme(transporteur: String) = transporteur.trim().uppercase() == "LUI-MEME"
                            val camionsFiltres = camionsActifs.filter { camion ->
                                camion.tonnage == cmd.tonnage &&
                                        camion.statut == "En attente" &&
                                        camion.client.isBlank() &&
                                        when (cmd.typeTransport) {
                                            "LUI-MEME" ->  estLuiMeme(camion.transporteur)
                                            "Location" -> !estLuiMeme(camion.transporteur)
                                            else       -> true
                                        }
                            }.sortedBy { sortKey(it) } // ← tri par date + heure arrivée

                            // État local pour édition admin de la commande
                            var adminEditCmd        by remember(cmd.id) { mutableStateOf(false) }
                            var adminCmdClient      by remember(cmd.id) { mutableStateOf(cmd.client) }
                            var adminCmdDest        by remember(cmd.id) { mutableStateOf(cmd.destination) }
                            var adminCmdTonnage     by remember(cmd.id) { mutableStateOf(cmd.tonnage) }
                            var adminCmdDate        by remember(cmd.id) { mutableStateOf(cmd.dateLivraison) }
                            var adminCmdType        by remember(cmd.id) { mutableStateOf(cmd.typeTransport) }

                            // ── Dialog confirmation suppression ───────────────
                            if (showDeleteAdminCmdId == cmd.id) {
                                AlertDialog(
                                    onDismissRequest = { showDeleteAdminCmdId = null },
                                    title = { Text("🗑️ Supprimer la commande", fontWeight = FontWeight.Bold, color = Navy) },
                                    text  = {
                                        Column {
                                            Text("Voulez-vous supprimer cette commande ?", fontSize = 14.sp)
                                            Spacer(modifier = Modifier.height(6.dp))
                                            Text("Client : ${cmd.client}", fontSize = 13.sp, color = TextMedium, fontWeight = FontWeight.SemiBold)
                                            Text("Destination : ${cmd.destination}", fontSize = 13.sp, color = TextMedium)
                                        }
                                    },
                                    confirmButton = {
                                        Button(
                                            onClick = {
                                                val idx = commandes.indexOfFirst { it.id == cmd.id }
                                                if (idx != -1) commandes.removeAt(idx)
                                                showDeleteAdminCmdId = null
                                                onSave()
                                                message = "🗑️ Commande supprimée"; messageSuccess = false
                                            },
                                            colors = ButtonDefaults.buttonColors(containerColor = Danger)
                                        ) { Text("Supprimer", color = White, fontWeight = FontWeight.Bold) }
                                    },
                                    dismissButton = {
                                        OutlinedButton(onClick = { showDeleteAdminCmdId = null }) { Text("Annuler") }
                                    }
                                )
                            }

                            SodalmuCard(modifier = Modifier.padding(bottom = 10.dp)) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Top) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(cmd.client, fontWeight = FontWeight.Bold, color = Navy, fontSize = 15.sp)
                                        Text(cmd.destination, color = TextMedium, fontSize = 13.sp)
                                    }
                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                        TonnageBadge(cmd.tonnage)
                                        // Bouton supprimer (commande en attente = sans camion assigné)
                                        OutlinedButton(
                                            onClick = { showDeleteAdminCmdId = cmd.id },
                                            modifier = Modifier.height(32.dp),
                                            shape    = RoundedCornerShape(8.dp),
                                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp),
                                            colors   = ButtonDefaults.outlinedButtonColors(contentColor = Danger)
                                        ) { Text("🗑️", fontSize = 13.sp) }
                                        // Bouton modifier admin
                                        OutlinedButton(
                                            onClick = { adminEditCmd = !adminEditCmd; adminCmdClient = cmd.client; adminCmdDest = cmd.destination; adminCmdTonnage = cmd.tonnage; adminCmdDate = cmd.dateLivraison; adminCmdType = cmd.typeTransport },
                                            modifier = Modifier.height(32.dp),
                                            shape    = RoundedCornerShape(8.dp),
                                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp),
                                            colors   = ButtonDefaults.outlinedButtonColors(contentColor = Navy)
                                        ) { Text(if (adminEditCmd) "✕" else "✏️", fontSize = 13.sp) }
                                    }
                                }
                                Spacer(modifier = Modifier.height(6.dp))

                                if (adminEditCmd) {
                                    // ── Formulaire édition admin ──────────────────────────
                                    Card(colors = CardDefaults.cardColors(containerColor = Gold.copy(0.08f)), shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth()) {
                                        Text("✏️ Modification admin de la commande", color = Gold, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(8.dp))
                                    }
                                    Spacer(modifier = Modifier.height(8.dp))
                                    OutlinedTextField(value = adminCmdClient, onValueChange = { adminCmdClient = it }, label = { Text("Client") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp))
                                    Spacer(modifier = Modifier.height(8.dp))
                                    DestinationDropdown(label = "Sélectionner la destination", valeur = adminCmdDest, onValeurChange = { adminCmdDest = it })
                                    Spacer(modifier = Modifier.height(8.dp))
                                    TonnageDropdown(label = "Tonnage", valeur = adminCmdTonnage, onValeurChange = { adminCmdTonnage = it })
                                    Spacer(modifier = Modifier.height(8.dp))
                                    DatePickerButton(label = "Date livraison", valeur = adminCmdDate, onValeurChange = { adminCmdDate = it })
                                    Spacer(modifier = Modifier.height(8.dp))
                                    TypeTransportDropdown(label = "Type transport", valeur = adminCmdType, onValeurChange = { adminCmdType = it })
                                    Spacer(modifier = Modifier.height(10.dp))
                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        OutlinedButton(onClick = { adminEditCmd = false }, modifier = Modifier.weight(1f).height(44.dp), shape = RoundedCornerShape(10.dp), colors = ButtonDefaults.outlinedButtonColors(contentColor = Navy)) { Text("Annuler") }
                                        Button(onClick = {
                                            val cmdIdx = commandes.indexOfFirst { it.id == cmd.id }
                                            if (cmdIdx != -1) {
                                                commandes[cmdIdx] = commandes[cmdIdx].copy(client = adminCmdClient, destination = adminCmdDest, tonnage = adminCmdTonnage, dateLivraison = adminCmdDate, typeTransport = adminCmdType)
                                                onSave(); adminEditCmd = false
                                                message = "✅ Commande modifiée"; messageSuccess = true
                                            }
                                        }, modifier = Modifier.weight(1f).height(44.dp), shape = RoundedCornerShape(10.dp), colors = ButtonDefaults.buttonColors(containerColor = Gold)) {
                                            Text("💾 Sauvegarder", fontWeight = FontWeight.Bold, color = Navy, fontSize = 13.sp)
                                        }
                                    }
                                    Spacer(modifier = Modifier.height(8.dp))
                                    HorizontalDivider(color = CreamDark)
                                    Spacer(modifier = Modifier.height(8.dp))
                                } else {
                                    Text("📅 Livraison souhaitée : ${cmd.dateLivraison}", color = TextMedium, fontSize = 12.sp)
                                    Text("🚛 Type : ${cmd.typeTransport}", color = TextMedium, fontSize = 12.sp)
                                    Spacer(modifier = Modifier.height(10.dp))
                                    HorizontalDivider(color = CreamDark)
                                    Spacer(modifier = Modifier.height(10.dp))
                                }

                                if (camionsFiltres.isEmpty()) {
                                    val msgVide = if (cmd.typeTransport == "LUI-MEME")
                                        "⚠️ Aucun camion ${cmd.tonnage} \"LUI-MEME\" disponible"
                                    else "⚠️ Aucun camion ${cmd.tonnage} disponible pour ce client"
                                    Card(colors = CardDefaults.cardColors(containerColor = Warning.copy(0.10f)), shape = RoundedCornerShape(8.dp)) {
                                        Text(msgVide, color = Warning, fontSize = 12.sp, modifier = Modifier.padding(10.dp))
                                    }
                                } else {
                                    Text("Camions ${cmd.tonnage} dispo. (${camionsFiltres.size}) — par ordre d'arrivée :", color = TextMedium, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                                    Spacer(modifier = Modifier.height(6.dp))
                                    camionsFiltres.forEach { camion ->
                                        OutlinedButton(
                                            onClick = {
                                                val camionIdx = camions.indexOfFirst { it.id == camion.id }
                                                val cmdIdx    = commandes.indexOfFirst { it.id == cmd.id }
                                                if (camionIdx != -1 && cmdIdx != -1) {
                                                    camions[camionIdx]   = camions[camionIdx].copy(client = cmd.client, destination = cmd.destination)
                                                    commandes[cmdIdx]    = commandes[cmdIdx].copy(statut = "Affecté", camionId = camion.id)
                                                    onSave()
                                                    message = "✅ ${camion.immatriculation} affecté à ${cmd.client}"; messageSuccess = true
                                                }
                                            },
                                            modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp),
                                            shape    = RoundedCornerShape(10.dp),
                                            colors   = ButtonDefaults.outlinedButtonColors(contentColor = Navy)
                                        ) {
                                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                                Text("🚚 ${camion.immatriculation}", fontWeight = FontWeight.SemiBold)
                                                Text("${camion.transporteur} · ${camion.heureArrivee}", color = TextMedium, fontSize = 12.sp)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        HorizontalDivider(color = CreamDark, thickness = 2.dp)
                        Spacer(modifier = Modifier.height(16.dp))
                    }

                    // ── Commandes ADV affectées — édition admin ───────────────
                    if (commandesAffectees.isNotEmpty()) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("✅  Commandes affectées", color = Success, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            Spacer(modifier = Modifier.width(8.dp))
                            Box(modifier = Modifier.background(Success, RoundedCornerShape(20.dp)).padding(horizontal = 8.dp, vertical = 2.dp)) { Text("${commandesAffectees.size}", color = White, fontSize = 12.sp, fontWeight = FontWeight.Bold) }
                        }
                        Spacer(modifier = Modifier.height(10.dp))
                        var showDeleteAffCmdId by remember { mutableStateOf<Int?>(null) }
                        commandesAffectees.forEach { cmd ->
                            var adminEditAff     by remember(cmd.id) { mutableStateOf(false) }
                            var adminAffClient   by remember(cmd.id) { mutableStateOf(cmd.client) }
                            var adminAffDest     by remember(cmd.id) { mutableStateOf(cmd.destination) }
                            var adminAffTonnage  by remember(cmd.id) { mutableStateOf(cmd.tonnage) }
                            var adminAffDate     by remember(cmd.id) { mutableStateOf(cmd.dateLivraison) }
                            var adminAffType     by remember(cmd.id) { mutableStateOf(cmd.typeTransport) }
                            val camionLie = camions.find { it.id == cmd.camionId }
                            // Protéger : interdit de supprimer si le camion est en cours ou déjà chargé
                            val camionEstCharge = camionLie?.statut in listOf("En cours de chargement", "Chargé", "Départ validé")

                            // ── Dialog confirmation suppression (commande affectée) ──
                            if (showDeleteAffCmdId == cmd.id) {
                                AlertDialog(
                                    onDismissRequest = { showDeleteAffCmdId = null },
                                    title = { Text("🗑️ Supprimer la commande", fontWeight = FontWeight.Bold, color = Navy) },
                                    text  = {
                                        Column {
                                            Text("Voulez-vous supprimer cette commande affectée ?", fontSize = 14.sp)
                                            Spacer(modifier = Modifier.height(6.dp))
                                            Text("Client : ${cmd.client}", fontSize = 13.sp, color = TextMedium, fontWeight = FontWeight.SemiBold)
                                            Text("Destination : ${cmd.destination}", fontSize = 13.sp, color = TextMedium)
                                            Spacer(modifier = Modifier.height(6.dp))
                                            Text("⚠️ Le camion lié sera désaffecté.", fontSize = 12.sp, color = Warning)
                                        }
                                    },
                                    confirmButton = {
                                        Button(onClick = {
                                            val camionIdx = camions.indexOfFirst { it.id == cmd.camionId }
                                            if (camionIdx != -1) camions[camionIdx] = camions[camionIdx].copy(client = "", destination = "")
                                            val idx = commandes.indexOfFirst { it.id == cmd.id }
                                            if (idx != -1) commandes.removeAt(idx)
                                            showDeleteAffCmdId = null; onSave()
                                            message = "🗑️ Commande supprimée, camion désaffecté"; messageSuccess = false
                                        }, colors = ButtonDefaults.buttonColors(containerColor = Danger)) {
                                            Text("Supprimer", color = White, fontWeight = FontWeight.Bold)
                                        }
                                    },
                                    dismissButton = { OutlinedButton(onClick = { showDeleteAffCmdId = null }) { Text("Annuler") } }
                                )
                            }

                            SodalmuCard(modifier = Modifier.padding(bottom = 10.dp)) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Top) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(cmd.client, fontWeight = FontWeight.Bold, color = Navy, fontSize = 15.sp)
                                        Text(cmd.destination, color = TextMedium, fontSize = 13.sp)
                                    }
                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                        TonnageBadge(cmd.tonnage)
                                        // Supprimer interdit si camion en cours de chargement ou déjà chargé
                                        if (camionEstCharge) {
                                            Box(
                                                modifier = Modifier
                                                    .height(32.dp)
                                                    .background(Danger.copy(alpha = 0.10f), RoundedCornerShape(8.dp))
                                                    .padding(horizontal = 8.dp),
                                                contentAlignment = Alignment.Center
                                            ) { Text("🔒", fontSize = 13.sp) }
                                        } else {
                                            OutlinedButton(
                                                onClick = { showDeleteAffCmdId = cmd.id },
                                                modifier = Modifier.height(32.dp),
                                                shape    = RoundedCornerShape(8.dp),
                                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp),
                                                colors   = ButtonDefaults.outlinedButtonColors(contentColor = Danger)
                                            ) { Text("🗑️", fontSize = 13.sp) }
                                        }
                                        OutlinedButton(
                                            onClick = { adminEditAff = !adminEditAff; adminAffClient = cmd.client; adminAffDest = cmd.destination; adminAffTonnage = cmd.tonnage; adminAffDate = cmd.dateLivraison; adminAffType = cmd.typeTransport },
                                            modifier = Modifier.height(32.dp), shape = RoundedCornerShape(8.dp),
                                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp),
                                            colors = ButtonDefaults.outlinedButtonColors(contentColor = Navy)
                                        ) { Text(if (adminEditAff) "✕" else "✏️", fontSize = 13.sp) }
                                    }
                                }
                                Spacer(modifier = Modifier.height(6.dp))
                                if (camionLie != null) {
                                    Card(colors = CardDefaults.cardColors(containerColor = Success.copy(0.08f)), shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth()) {
                                        Text("🚚 ${camionLie.immatriculation} · ${camionLie.transporteur} · ${camionLie.statut}", color = Success, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(8.dp))
                                    }
                                    if (camionEstCharge) {
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Card(colors = CardDefaults.cardColors(containerColor = Danger.copy(alpha = 0.08f)), shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth()) {
                                            Text("🔒 Suppression impossible — camion déjà en chargement", color = Danger, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(8.dp))
                                        }
                                    }
                                    Spacer(modifier = Modifier.height(6.dp))
                                }
                                if (adminEditAff) {
                                    Card(colors = CardDefaults.cardColors(containerColor = Gold.copy(0.08f)), shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth()) {
                                        Text("✏️ Modification admin (tous niveaux)", color = Gold, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(8.dp))
                                    }
                                    Spacer(modifier = Modifier.height(8.dp))
                                    OutlinedTextField(value = adminAffClient, onValueChange = { adminAffClient = it }, label = { Text("Client") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp))
                                    Spacer(modifier = Modifier.height(8.dp))
                                    DestinationDropdown(label = "Sélectionner la destination", valeur = adminAffDest, onValeurChange = { adminAffDest = it })
                                    Spacer(modifier = Modifier.height(8.dp))
                                    TonnageDropdown(label = "Tonnage", valeur = adminAffTonnage, onValeurChange = { adminAffTonnage = it })
                                    Spacer(modifier = Modifier.height(8.dp))
                                    DatePickerButton(label = "Date livraison", valeur = adminAffDate, onValeurChange = { adminAffDate = it })
                                    Spacer(modifier = Modifier.height(8.dp))
                                    TypeTransportDropdown(label = "Type transport", valeur = adminAffType, onValeurChange = { adminAffType = it })
                                    Spacer(modifier = Modifier.height(10.dp))
                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        OutlinedButton(onClick = { adminEditAff = false }, modifier = Modifier.weight(1f).height(44.dp), shape = RoundedCornerShape(10.dp), colors = ButtonDefaults.outlinedButtonColors(contentColor = Navy)) { Text("Annuler") }
                                        Button(onClick = {
                                            val cmdIdx = commandes.indexOfFirst { it.id == cmd.id }
                                            if (cmdIdx != -1) {
                                                commandes[cmdIdx] = commandes[cmdIdx].copy(client = adminAffClient, destination = adminAffDest, tonnage = adminAffTonnage, dateLivraison = adminAffDate, typeTransport = adminAffType)
                                                // Mettre à jour aussi le camion lié
                                                val camionIdx = camions.indexOfFirst { it.id == cmd.camionId }
                                                if (camionIdx != -1) camions[camionIdx] = camions[camionIdx].copy(client = adminAffClient, destination = adminAffDest)
                                                onSave(); adminEditAff = false
                                                message = "✅ Commande modifiée"; messageSuccess = true
                                            }
                                        }, modifier = Modifier.weight(1f).height(44.dp), shape = RoundedCornerShape(10.dp), colors = ButtonDefaults.buttonColors(containerColor = Gold)) {
                                            Text("💾 Sauvegarder", fontWeight = FontWeight.Bold, color = Navy, fontSize = 13.sp)
                                        }
                                    }
                                } else {
                                    Text("📅 Livraison : ${cmd.dateLivraison}", color = TextMedium, fontSize = 12.sp)
                                    Text("🚛 Type : ${cmd.typeTransport}", color = TextMedium, fontSize = 12.sp)
                                }
                            }
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        HorizontalDivider(color = CreamDark, thickness = 2.dp)
                        Spacer(modifier = Modifier.height(16.dp))
                    }

                    // ── Suivi camions ─────────────────────────────────────────
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("🗂️  Suivi des camions", color = Navy, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        Spacer(modifier = Modifier.width(8.dp))
                        if (camionsVisibles.isNotEmpty()) {
                            Box(modifier = Modifier.background(Navy, RoundedCornerShape(20.dp)).padding(horizontal = 8.dp, vertical = 2.dp)) { Text("${camionsVisibles.size}", color = White, fontSize = 12.sp, fontWeight = FontWeight.Bold) }
                        }
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                    if (camionsVisibles.isEmpty()) {
                        SodalmuCard { Text("Aucun camion enregistré pour le moment", color = TextMedium, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth()) }
                    } else {
                        listeStatutsAffichage.forEach { groupe ->
                            val liste = camionsVisibles.filter { it.statut == groupe }
                            if (liste.isNotEmpty()) {
                                SodalmuGroupCard(titre = "$groupe  (${liste.size})", couleur = statutColor(groupe), modifier = Modifier.padding(bottom = 12.dp)) {
                                    liste.forEach { camion ->
                                        val estAffecte = camion.client.isNotBlank() && camion.destination.isNotBlank()
                                        SodalmuCard(modifier = Modifier.padding(bottom = 10.dp)) {
                                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Top) {
                                                Text(camion.immatriculation, fontWeight = FontWeight.Bold, color = Navy, fontSize = 15.sp)
                                                Column(horizontalAlignment = Alignment.End) {
                                                    StatutBadge(camion.statut)
                                                    if (camion.tonnage.isNotBlank()) { Spacer(modifier = Modifier.height(4.dp)); TonnageBadge(camion.tonnage) }
                                                }
                                            }
                                            Text(camion.transporteur, color = TextMedium, fontSize = 13.sp)
                                            Spacer(modifier = Modifier.height(8.dp))
                                            HorizontalDivider(color = CreamDark)
                                            Spacer(modifier = Modifier.height(8.dp))
                                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                                Column {
                                                    Text("📅 ${camion.date}", color = TextMedium, fontSize = 12.sp)
                                                    Text("🕐 Arrivée : ${camion.heureArrivee}", color = TextMedium, fontSize = 12.sp)
                                                    Text("👤 ${if (camion.client.isBlank()) "Non affecté" else camion.client}", color = TextMedium, fontSize = 12.sp)
                                                    Text("📍 ${if (camion.destination.isBlank()) "Non renseignée" else camion.destination}", color = TextMedium, fontSize = 12.sp)
                                                }
                                                Text("🚀 ${if (camion.heureDepart.isBlank()) "--:--" else camion.heureDepart}", color = if (camion.heureDepart.isBlank()) TextLight else Success, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                                            }
                                            if (camion.statut == "Refus de chargement" || camion.statut == "Non disponible") {
                                                Spacer(modifier = Modifier.height(8.dp))
                                                Card(colors = CardDefaults.cardColors(containerColor = Danger.copy(0.08f)), shape = RoundedCornerShape(8.dp)) {
                                                    Text("⚠️ Réaffectation ou correction nécessaire", color = Danger, fontSize = 12.sp, modifier = Modifier.padding(8.dp))
                                                }
                                            }
                                            Spacer(modifier = Modifier.height(10.dp))
                                            if (!estAffecte) {
                                                GoldButton("Affecter ce camion") {
                                                    selectedCamionId = camion.id; client = camion.client; destination = camion.destination
                                                    statutAdmin = if (camion.statut == "Départ validé") "Chargé" else camion.statut
                                                    selectedNouveauCamionId = null; modeChangementStatut = false
                                                }
                                            } else {
                                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                                    Button(onClick = {}, enabled = false, modifier = Modifier.weight(1f).height(44.dp), shape = RoundedCornerShape(10.dp),
                                                        colors = ButtonDefaults.buttonColors(disabledContainerColor = Success.copy(0.15f), disabledContentColor = Success)) {
                                                        Text("✔ Affecté", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                                                    }
                                                    OutlinedButton(onClick = {
                                                        selectedCamionId = camion.id; client = camion.client; destination = camion.destination
                                                        statutAdmin = if (camion.statut == "Départ validé") "Chargé" else camion.statut
                                                        selectedNouveauCamionId = null; modeChangementStatut = false
                                                    }, modifier = Modifier.weight(1f).height(44.dp), shape = RoundedCornerShape(10.dp), colors = ButtonDefaults.outlinedButtonColors(contentColor = Navy)) {
                                                        Text("✏️ Modifier", fontSize = 13.sp)
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    if (selectedCamion != null) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = Navy.copy(0.04f)), elevation = CardDefaults.cardElevation(2.dp)) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text("📋  Affectation : ${selectedCamion.immatriculation}", color = Navy, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                    if (selectedCamion.tonnage.isNotBlank()) { Spacer(modifier = Modifier.width(8.dp)); TonnageBadge(selectedCamion.tonnage) }
                                }
                                Spacer(modifier = Modifier.height(14.dp))
                                OutlinedTextField(client, { client = it }, label = { Text("Client") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp))
                                Spacer(modifier = Modifier.height(10.dp))
                                DestinationDropdown(label = "Sélectionner la destination", valeur = destination, onValeurChange = { destination = it })
                                Spacer(modifier = Modifier.height(10.dp))
                                val reaffectationObligatoire = selectedCamion.statut == "Refus de chargement" || selectedCamion.statut == "Non disponible"
                                if (reaffectationObligatoire) {
                                    Card(colors = CardDefaults.cardColors(containerColor = Danger.copy(0.08f)), shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
                                        Text("⚠️ Ce camion est en \"${selectedCamion.statut}\"", color = Danger, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(10.dp))
                                    }
                                    Spacer(modifier = Modifier.height(12.dp))
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        OutlinedButton(onClick = { modeChangementStatut = false; selectedNouveauCamionId = null }, modifier = Modifier.weight(1f).height(44.dp), shape = RoundedCornerShape(10.dp),
                                            colors = ButtonDefaults.outlinedButtonColors(containerColor = if (!modeChangementStatut) Danger.copy(0.12f) else Color.Transparent, contentColor = Danger)) { Text("🔄 Réaffecter", fontSize = 12.sp, fontWeight = FontWeight.SemiBold) }
                                        OutlinedButton(onClick = { modeChangementStatut = true; selectedNouveauCamionId = null }, modifier = Modifier.weight(1f).height(44.dp), shape = RoundedCornerShape(10.dp),
                                            colors = ButtonDefaults.outlinedButtonColors(containerColor = if (modeChangementStatut) Success.copy(0.12f) else Color.Transparent, contentColor = Success)) { Text("✅ Accepte", fontSize = 12.sp, fontWeight = FontWeight.SemiBold) }
                                    }
                                    Spacer(modifier = Modifier.height(10.dp))
                                    if (!modeChangementStatut) {
                                        Text("Sélectionner un autre camion :", color = TextMedium, fontSize = 13.sp)
                                        Spacer(modifier = Modifier.height(6.dp))
                                        val camionsDisponibles = camionsVisibles.filter { it.id != selectedCamion.id && ((it.client.isBlank() && it.destination.isBlank()) || (it.client.isNotBlank() && it.destination.isNotBlank() && it.statut == "En attente")) }
                                        Box {
                                            OutlinedButton(onClick = { expandedReaffectation = true }, modifier = Modifier.fillMaxWidth().height(56.dp), shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.outlinedButtonColors(contentColor = Navy)) {
                                                val sel = camionsVisibles.find { it.id == selectedNouveauCamionId }
                                                Text(if (sel == null) "Choisir un autre camion" else "🚚 ${sel.immatriculation}${if (sel.tonnage.isNotBlank()) " · ${sel.tonnage}" else ""}", modifier = Modifier.fillMaxWidth())
                                            }
                                            DropdownMenu(expanded = expandedReaffectation, onDismissRequest = { expandedReaffectation = false }) {
                                                camionsDisponibles.forEach { c ->
                                                    DropdownMenuItem(text = { Text(buildString { append(c.immatriculation); if (c.tonnage.isNotBlank()) append(" · ${c.tonnage}"); append(if (c.client.isBlank()) " — Non affecté" else " — En attente") }) },
                                                        onClick = { selectedNouveauCamionId = c.id; expandedReaffectation = false })
                                                }
                                            }
                                        }
                                    } else {
                                        Card(colors = CardDefaults.cardColors(containerColor = Success.copy(0.08f)), shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
                                            Text("✅ Le camion accepte de charger.\nChoisissez le nouveau statut ci-dessous.", color = Success, fontSize = 12.sp, modifier = Modifier.padding(10.dp))
                                        }
                                    }
                                    Spacer(modifier = Modifier.height(10.dp))
                                }
                                StatutDropdown("Choisir le statut", statutAdmin, { statutAdmin = it }, listeStatutsMagasinier)
                                Spacer(modifier = Modifier.height(14.dp))
                                val adminValideActif = client.isNotBlank() && destination.isNotBlank() && statutAdmin.isNotBlank() && (!reaffectationObligatoire || selectedNouveauCamionId != null || modeChangementStatut)
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    OutlinedButton(onClick = { selectedCamionId = null; client = ""; destination = ""; statutAdmin = "En attente"; modeChangementStatut = false; selectedNouveauCamionId = null },
                                        modifier = Modifier.weight(1f).height(52.dp), shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.outlinedButtonColors(contentColor = Navy)) { Text("Annuler") }
                                    Button(
                                        onClick = {
                                            val reaffObl = selectedCamion.statut == "Refus de chargement" || selectedCamion.statut == "Non disponible"
                                            val index = camions.indexOfFirst { it.id == selectedCamion.id }
                                            if (index != -1) {
                                                val ancien = camions[index]
                                                when {
                                                    reaffObl && !modeChangementStatut && selectedNouveauCamionId != null -> {
                                                        val ni = camions.indexOfFirst { it.id == selectedNouveauCamionId }
                                                        if (ni != -1) camions[ni] = camions[ni].copy(client = client, destination = destination, statut = statutAdmin, actif = true)
                                                        camions[index] = ancien.copy(actif = false)
                                                    }
                                                    else -> camions[index] = ancien.copy(client = client, destination = destination, statut = if (ancien.heureDepart.isNotBlank()) "Départ validé" else statutAdmin, heureDepart = ancien.heureDepart, actif = true)
                                                }
                                            }
                                            selectedCamionId = null; selectedNouveauCamionId = null; client = ""; destination = ""; statutAdmin = "En attente"
                                            message = when {
                                                (selectedCamion.statut == "Refus de chargement" || selectedCamion.statut == "Non disponible") && modeChangementStatut -> "✅ Statut corrigé, camion remis en activité"
                                                (selectedCamion.statut == "Refus de chargement" || selectedCamion.statut == "Non disponible") -> "✅ Réaffectation enregistrée"
                                                else -> "✅ Affectation enregistrée"
                                            }
                                            modeChangementStatut = false; messageSuccess = true; onSave()
                                        },
                                        enabled  = adminValideActif,
                                        modifier = Modifier.weight(1f).height(52.dp), shape = RoundedCornerShape(12.dp),
                                        colors   = ButtonDefaults.buttonColors(containerColor = Gold, disabledContainerColor = TextLight)
                                    ) { Text("Valider", fontWeight = FontWeight.Bold, color = Navy) }
                                }
                            }
                        }
                    }
                }

                // ════════════════════════════════════════
                // MAGASINIER
                // ════════════════════════════════════════
                "MAGASINIER" -> {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("🚛  Gestion des départs", color = Navy, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        Spacer(modifier = Modifier.width(8.dp))
                        if (camionsVisibles.isNotEmpty()) {
                            Box(modifier = Modifier.background(Navy, RoundedCornerShape(20.dp)).padding(horizontal = 8.dp, vertical = 2.dp)) { Text("${camionsVisibles.size}", color = White, fontSize = 12.sp, fontWeight = FontWeight.Bold) }
                        }
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                    if (camionsVisibles.isEmpty()) {
                        SodalmuCard { Text("Aucun camion enregistré pour le moment", color = TextMedium, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth()) }
                    } else {
                        listeStatutsAffichage.forEach { groupe ->
                            val liste = camionsVisibles.filter { it.statut == groupe }
                            if (liste.isNotEmpty()) {
                                SodalmuGroupCard(titre = "$groupe  (${liste.size})", couleur = statutColor(groupe), modifier = Modifier.padding(bottom = 12.dp)) {
                                    liste.forEach { camion ->
                                        var statutLocal      by remember(camion.id, camion.statut) { mutableStateOf(if (camion.statut == "Départ validé") "Chargé" else camion.statut) }
                                        var heureDepartLocal by remember(camion.id, camion.heureDepart) { mutableStateOf(camion.heureDepart) }
                                        val heureActive       = statutLocal == "Chargé"
                                        val boutonStatutActif = statutLocal.isNotBlank()
                                        val boutonDepartActif = statutLocal == "Chargé" && heureDepartLocal.isNotBlank()
                                        SodalmuCard(modifier = Modifier.padding(bottom = 10.dp)) {
                                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Top) {
                                                Text(camion.immatriculation, fontWeight = FontWeight.Bold, color = Navy, fontSize = 15.sp)
                                                Column(horizontalAlignment = Alignment.End) {
                                                    StatutBadge(camion.statut)
                                                    if (camion.tonnage.isNotBlank()) { Spacer(modifier = Modifier.height(4.dp)); TonnageBadge(camion.tonnage) }
                                                }
                                            }
                                            Text(camion.transporteur, color = TextMedium, fontSize = 13.sp)
                                            Spacer(modifier = Modifier.height(6.dp))
                                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                                Column {
                                                    Text("📅 ${camion.date}", color = TextMedium, fontSize = 12.sp)
                                                    Text("🕐 Arrivée : ${camion.heureArrivee}", color = TextMedium, fontSize = 12.sp)
                                                    Text("👤 ${if (camion.client.isBlank()) "Non affecté" else camion.client}", color = TextMedium, fontSize = 12.sp)
                                                    Text("📍 ${if (camion.destination.isBlank()) "Non renseignée" else camion.destination}", color = TextMedium, fontSize = 12.sp)
                                                }
                                                Text("🚀 ${if (camion.heureDepart.isBlank()) "--:--" else camion.heureDepart}", color = if (camion.heureDepart.isBlank()) TextLight else Success, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                                            }
                                            Spacer(modifier = Modifier.height(12.dp))
                                            HorizontalDivider(color = CreamDark)
                                            Spacer(modifier = Modifier.height(12.dp))
                                            StatutDropdown(label = "Choisir le statut", valeur = statutLocal, onValeurChange = { statutLocal = it; if (it != "Chargé") heureDepartLocal = "" }, options = listeStatutsMagasinier)
                                            Spacer(modifier = Modifier.height(8.dp))
                                            PrimaryButton("Valider le statut", enabled = boutonStatutActif) {
                                                val index = camions.indexOfFirst { it.id == camion.id }
                                                if (index != -1) {
                                                    val ancien = camions[index]
                                                    camions[index] = ancien.copy(statut = if (ancien.heureDepart.isNotBlank() && statutLocal == "Chargé") "Départ validé" else statutLocal, heureDepart = if (statutLocal == "Chargé") ancien.heureDepart else "", actif = true)
                                                }
                                                onSave(); message = "✅ Statut mis à jour"; messageSuccess = true
                                            }
                                            Spacer(modifier = Modifier.height(10.dp))
                                            HorizontalDivider(color = CreamDark)
                                            Spacer(modifier = Modifier.height(10.dp))
                                            HeureDropdown(label = "Heure de départ", valeur = heureDepartLocal, onValeurChange = { heureDepartLocal = it }, enabled = heureActive)
                                            Spacer(modifier = Modifier.height(8.dp))
                                            GoldButton("🚀  Valider le départ", enabled = boutonDepartActif) {
                                                val index = camions.indexOfFirst { it.id == camion.id }
                                                if (index != -1) camions[index] = camions[index].copy(statut = "Départ validé", heureDepart = heureDepartLocal, actif = true)
                                                onSave(); message = "✅ Départ validé pour ${camion.immatriculation}"; messageSuccess = true
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}