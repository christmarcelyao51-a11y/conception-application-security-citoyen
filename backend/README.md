# Backend Django et PostgreSQL

Le backend Django stocke les demandes de secours, authentifie les opérateurs et expose l'API utilisée par l'interface Next.js. PostgreSQL est la base de données attendue.

## Démarrage local sous Windows

Depuis la racine du projet, configurez Django puis démarrez Django et PostgreSQL :

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item .env.example .env.local
docker compose up --build -d
```

Le serveur API répond sur `http://127.0.0.1:8000`. Pour consulter les journaux : `docker compose logs -f backend`. Pour arrêter les services : `docker compose down`.

En développement (`DJANGO_DEBUG=true`), le démarrage prépare des comptes de démonstration pour chaque service : `operateur` / `demo2026`. En production (`DJANGO_DEBUG=false`), ces comptes ne sont pas créés ; les comptes réels doivent être ajoutés dans l'administration Django.

Créez le compte d'administration Django avec `docker compose exec backend python manage.py createsuperuser`.

### Exécution sans Docker

Si PostgreSQL est déjà installé en local, vous pouvez installer et lancer Django directement :

```powershell
cd backend
py -m venv .venv
.venv\Scripts\Activate.ps1
py -m pip install -r requirements.txt
Copy-Item .env.example .env
py manage.py migrate
py manage.py createsuperuser
py manage.py runserver 0.0.0.0:8000
```

Dans un autre terminal, démarrez Next.js avec `pnpm dev`. L'interface est sur `http://localhost:3000`.

Ouvrez `http://127.0.0.1:8000/admin/` avec le compte superutilisateur et créez chaque compte opérateur dans **Opérations → Operators**. Le champ `service_id` doit correspondre à `police`, `gendarmerie`, `samu`, `pompiers`, `ccdo` ou `autre`. Saisissez le mot de passe dans le champ prévu : Django le stocke sous forme hachée.

## API

- `GET /api/health` : état du service.
- `POST /api/operator/session` : connexion et émission d'un jeton opérateur.
- `GET|DELETE /api/operator/session` : contrôle ou fermeture de session (`Authorization: Bearer …`).
- `GET|POST|PATCH /api/operations` : lecture par service, création d'alerte et mise à jour de son suivi.
- `GET /api/operations?id=…` : consultation publique du statut pour le suivi citoyen.

Copiez `backend/.env.example` vers `backend/.env` pour configurer Django et PostgreSQL. En production, définissez une vraie clé `DJANGO_SECRET_KEY`, `DJANGO_DEBUG=false`, les domaines autorisés et des identifiants PostgreSQL dédiés. Les valeurs du fichier exemple sont réservées au développement local.
