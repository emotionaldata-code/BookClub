# Production deployment

`compose.production.yml` builds the existing React frontend and Express API into one Node 24 container. PostgreSQL 17 has its own private network and persistent named volume. No host ports are published. Dokploy routes `book-club.edia-company.com` to the `app` service on port 6310 through `dokploy-network`.

Prepare the initial data with:

```sh
sh deploy/prepare-seed.sh /absolute/path/to/bookDB.dump
```

Set `POSTGRES_PASSWORD` to a generated URL-safe password in a private environment file. For a local check, use:

```sh
docker compose --env-file .env.production -f compose.production.yml up -d --build
```

The external `dokploy-network` must exist. Local tests should use a separate override or network. The database restore runs only when PostgreSQL initializes an empty data volume. Ordinary redeployments and restarts keep existing data and do not reload the seed. Never delete the database volume or request fresh volumes during a redeploy.

Dokploy is connected to `emotionaldata-code/BookClub` through its existing GitHub integration. The production service follows `main`, reads `compose.production.yml`, and automatically rebuilds and deploys on each push to that branch. Other branches do not deploy to production. The image build runs `npm ci` and `npm run build`; a failed build stops the deployment.

The Dokploy environment uses `BOOKCLUB_BUILD_CONTEXT=.`, `BOOKCLUB_SEED_DIR=../files`, and `BOOKCLUB_INIT_SCRIPT=../files/10-restore-bookclub.sh`. The build context is the repository cloned for the deployment. Keep the existing file mounts with file paths `bookDB.dump.b64` and `10-restore-bookclub.sh`, containing the prepared seed and the restore script. Store credentials only in Dokploy's environment and ignored local files. No GitHub Actions deployment secret is needed because Dokploy receives GitHub push events directly.

Check the BookClub production deployment history in Dokploy after pushing, then verify `/api/health`. Keep the Compose project name and `bookclub-postgres` volume unchanged so redeployments reuse the database. The initial dump is kept outside Git and only initializes a new, empty volume.

The initial snapshot contains 22 books, 13 genres, 24 book/genre links, and 3 comments. Verify `/api/health`, `/api/books`, and `/api/genres` after deploying.

## Amministrazione

Il pannello è disponibile a `/secret_admin`. L'accesso richiede un account amministratore salvato in PostgreSQL; anche `DELETE /api/books/:id` richiede una sessione amministratore valida. Lettura, inserimento libri e commenti restano pubblici.

Al primo avvio impostare `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` e `ADMIN_ORIGIN` nell'ambiente Dokploy. L'origine di produzione è `https://book-club.edia-company.com`. La password non deve essere inserita nel codice o nel repository: l'hash scrypt si genera con `hashPassword` esportata da `server/admin-auth.js`. Conservare la password iniziale in un gestore di credenziali. Il bootstrap crea l'account soltanto se assente, senza reimpostare la password a ogni deploy.

Le sessioni durano 12 ore e sono salvate nel database; il browser riceve un cookie HttpOnly, Secure in produzione e SameSite Strict. Gli endpoint di autenticazione sono `POST /api/admin/login`, `GET /api/admin/session` e `POST /api/admin/logout`. Il logout revoca la sessione. Le richieste amministrative con origine diversa da `ADMIN_ORIGIN` vengono rifiutate.

Verifica l'autenticazione con `node --test server/admin-auth.test.js`. Per includere il test di persistenza usa `TEST_POSTGRES_URL` verso un database PostgreSQL di prova: il test crea ed elimina un proprio schema isolato. Per una verifica locale completa imposta anche `ADMIN_ORIGIN` all'URL locale del servizio.

## Ricerca nella libreria

La ricerca considera titolo, descrizione, autore e persona che ha aggiunto il libro, ignorando maiuscole e accenti. Tutte le parole cercate devono comparire, anche distribuite tra campi diversi. L'elenco `/api/books?optimized=true` include le descrizioni, senza richieste separate per ogni libro.

I filtri per genere, valutazione minima (incluse mezze stelle), autore e persona si combinano tra loro. Con più generi sono richiesti tutti quelli scelti. È disponibile anche il filtro “Senza valutazione”. L'ordinamento per stelle lascia i libri senza valutazione in fondo. Ricerca, filtri e ordine sono conservati nei parametri dell'URL e nel ritorno dal dettaglio del libro.

Verifica la logica dei filtri con `node --test src/lib/bookFilters.test.js` e la compilazione con `npm run build`.

### Menu e layout della libreria

I filtri usano un menu condiviso (`SelectMenu`) con ricerca per genere, autore e persona,
selezione evidenziata, frecce, Home/End, ricerca digitando, Invio, Escape e Tab.
I menu si aprono verso lo spazio disponibile nel viewport e rispettano le preferenze
per movimento, trasparenza e contrasto. Su telefono le schede libro sono righe compatte
con copertina intera. Questa modifica non richiede migrazioni o modifiche ai dati.
