# Module Backend — API REST

> Développement prévu en Phase 3 (Q4 2026)

## Objectif

Fournir une API REST permettant la synchronisation des données entre :
- L'application Android mobile
- Une interface web d'administration
- Les systèmes ERP existants

## Structure prévue

```
backend/
├── src/
│   ├── api/
│   │   ├── routes/          # Définition des endpoints REST
│   │   ├── controllers/     # Logique des endpoints
│   │   └── middleware/      # Auth, validation, logging
│   ├── models/              # Schémas de données
│   ├── services/            # Logique métier
│   ├── config/              # Configuration (DB, env)
│   └── utils/               # Helpers
├── tests/
├── .env.example
└── package.json / pom.xml
```

## Endpoints prévus

| Méthode | Endpoint               | Description                  |
|---------|------------------------|------------------------------|
| GET     | /api/camions           | Lister tous les camions      |
| POST    | /api/camions           | Enregistrer un camion        |
| PUT     | /api/camions/:id       | Mettre à jour un camion      |
| POST    | /api/pointages         | Enregistrer un pointage      |
| GET     | /api/rapports/journalier | Rapport journalier          |
| GET     | /api/stats/dashboard   | Données tableau de bord      |

## Authentification

JWT (JSON Web Token) — Bearer token dans les headers.

## À faire

- [ ] Choisir le framework backend (Spring Boot / Node.js / FastAPI)
- [ ] Définir le schéma de base de données
- [ ] Implémenter l'authentification
- [ ] Déployer sur serveur de test
