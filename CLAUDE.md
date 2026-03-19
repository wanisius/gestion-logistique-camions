# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run Commands

Build and install the debug APK via Gradle wrapper (run from project root):
```bash
./gradlew assembleDebug
./gradlew installDebug
```

Run unit tests:
```bash
./gradlew test
```

Run a single unit test class:
```bash
./gradlew test --tests "com.logistique.camions.ExampleUnitTest"
```

Run instrumented (Android) tests:
```bash
./gradlew connectedAndroidTest
```

Clean build:
```bash
./gradlew clean
```

On Windows, use `gradlew.bat` instead of `./gradlew`.

## Project Architecture

This is a **single-Activity, single-file Android app** built with Jetpack Compose. All application code lives in one file:

`app/src/main/java/com/logistique/camions/MainActivity.kt`

### Application Flow

```
SplashScreen → LoginScreen → CamionApp → MainScreen (role-based)
```

1. **SplashScreen** — animated SODALMU logo, auto-advances after ~1.8s
2. **LoginScreen** — username/password; maps credentials to roles
3. **CamionApp** — root composable; holds all shared state (camions list, commandes list, passwords map); persists to SharedPreferences on every mutation
4. **MainScreen** — single screen that renders different UI sections depending on `role`

### User Roles

| Username | Role | Capabilities |
|---|---|---|
| `securite` | SECURITE | Register trucks (immatriculation, transporteur, heure arrivée, tonnage, date) |
| `admin` | ADMIN | Full access: add/edit/delete trucks, assign client+destination, change statut, view historique, export Excel |
| `adv` | ADV | Create/manage `CommandeADV` orders (client, destination, tonnage, delivery date, transport type); assign orders to trucks |
| `hafid`, `hassan`, `said` | MAGASINIER | Update truck statut (warehouseman statuses only) and set departure time |

### Data Models

- **`CamionRecord`** — a truck entry: id, date, immatriculation, transporteur, heureArrivee, tonnage, client, destination, statut, heureDepart, actif
- **`CommandeADV`** — a logistics order: id, client, destination, tonnage, dateLivraison, typeTransport, statut, camionId (nullable link to a truck), dateCreation

### Persistence

Data is stored in Android **SharedPreferences** (JSON-serialized):
- `camions_data` / `liste_camions` — list of `CamionRecord`
- `commandes_adv` / `liste_commandes` — list of `CommandeADV`
- `mots_de_passe` — per-user password overrides (defaults: all `1234`)

### Statut Workflow

Truck statuses flow through these values:
- **Magasinier** can set: `En attente`, `En cours de chargement`, `Chargé`, `Refus de chargement`, `Non disponible`
- **Admin** can additionally set: `Départ validé` (marks departure; combined with `heureDepart` field)

### Excel Export

Uses **Apache POI** (`poi-ooxml 5.2.3` + `xmlbeans 5.1.1`) to generate `.xlsx` files, shared via `FileProvider`. Several conflicting transitive dependencies are excluded in `app/build.gradle.kts` (`stax-api`, `xml-apis`, `MANIFEST.MF`, etc.).

### Key Configuration

- `compileSdk = 36`, `minSdk = 26`, `targetSdk = 36`
- `coreLibraryDesugaringEnabled = true` (required for Java 8+ time APIs on older Android)
- Kotlin `2.2.10`, AGP `9.1.0`, Compose BOM `2024.09.00`
- No Navigation component — screen transitions are handled with plain `if/else` on state variables within `CamionApp`/`MainScreen`
