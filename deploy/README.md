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

The existing administration page and deletion API have no authentication; this deployment preserves the application behavior explicitly requested by the owner.
