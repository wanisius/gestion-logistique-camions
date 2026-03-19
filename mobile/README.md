# Module Mobile — Application Android

Application Android développée en Java pour la gestion logistique des camions.

## Structure

```
mobile/
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/logistique/camions/
│   │   │   │   ├── activities/      # Écrans principaux
│   │   │   │   ├── fragments/       # Composants UI
│   │   │   │   ├── models/          # Entités de données
│   │   │   │   ├── database/        # Room DAO & Entities
│   │   │   │   ├── adapters/        # RecyclerView adapters
│   │   │   │   ├── utils/           # Utilitaires
│   │   │   │   └── MainActivity.java
│   │   │   ├── res/
│   │   │   │   ├── layout/          # Fichiers XML des écrans
│   │   │   │   ├── drawable/        # Icônes et images
│   │   │   │   └── values/          # Couleurs, strings, thèmes
│   │   │   └── AndroidManifest.xml
│   └── build.gradle
├── gradle/
└── build.gradle
```

## Prérequis

- Android Studio Hedgehog ou supérieur
- Android SDK 24+
- Java 11

## Configuration

1. Ouvrir Android Studio
2. `File > Open` → sélectionner ce dossier
3. Attendre la synchronisation Gradle
4. Lancer sur émulateur ou appareil (API 24+)

## Architecture

Pattern **MVVM** (Model-View-ViewModel) avec :
- `Room` pour la persistance locale
- `LiveData` pour la réactivité UI
- `ViewModel` pour la logique métier
