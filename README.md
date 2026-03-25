# NBK Market — Backend API

API REST pour la marketplace sociale NBK Market.

## Stack technique

- Node.js + Express
- TypeScript
- PostgreSQL (NeonDB puis migration VPS)
- JWT Authentication

## Installation

```bash
npm install
```

## Configuration

Copie le fichier d'environnement et remplis les valeurs :

```bash
cp .env.example .env
```

Variables requises :

| Variable | Description |
|----------|-------------|
| `PORT` | Port du serveur (défaut : 5000) |
| `DATABASE_URL` | URL de connexion PostgreSQL |
| `JWT_SECRET` | Clé secrète pour les tokens JWT |
| `CORS_ORIGINS` | Origines autorisées (séparées par des virgules) |

## Lancement

```bash
# Développement (hot reload)
npm run dev

# Production
npm run build
npm start
```

## Structure

```
src/
├── config/        # Configuration (env, db)
├── controllers/   # Logique des routes
├── middlewares/    # Auth, validation, error handling
├── models/        # Modèles de données
├── routes/        # Définition des endpoints
├── services/      # Logique métier
├── utils/         # Fonctions utilitaires
└── server.ts      # Point d'entrée
```

## API Endpoints

À venir — les routes seront documentées ici au fur et à mesure du développement.
