# Nunstock on Kham

Production host: vmi3078867 /194.233.90.87. Public traffic cutover is tracked in
the GSATC consolidation record; a prepared copy alone is not a completed move.

A main push runs backend checks, then requests `deploy <exact SHA>` through a
restricted SSH key. The host wrapper /usr/local/sbin/nunstock-release permits only
origin/main and locks releases. Secrets: VPS_HOST, VPS_USER, VPS_SSH_KEY and
VPS_SSH_HOST_KEY. Keep legacy VPS_PASSWORD for authorized source rollback work.

The checkout /var/www/nunstock creates immutable builds in
/var/www/nunstock-releases/<SHA>. PM2 runs nunstock-backend on loopback1100 and
nunstock-frontend on loopback9090. Frontend /api rewrites point to127.0.0.1:1100.
Backend settings, JWT and LINE credentials live in /etc/nunstock/backend.env.
Builds share /run/lock/kham-app-build.lock with GSATC to bound concurrent build load.

The dedicated PostgreSQL16.15 database uses loopback15433 and persistent external
volume nunstock_migration_pgdata. Database maintenance configuration is
[compose.database.yml](compose.database.yml), with credentials in the root-readable
/etc/nunstock/database.env. Preserve source C.UTF-8 collation and Europe/Berlin
server timezone. Run container changes in a controlled database maintenance window.

The app release script builds before pausing its writer, verifies a custom-format
dump in /var/backups/nunstock, runs Prisma migrate deploy/status, replaces PM2
processes and runs read-only API, authenticated HTML, frontend proxy and barcode
checks. It performs no automatic seed or db push. Synthetic write tests belong
only in isolated copies and must be discarded before customer traffic is switched.

Rollback after customer writes requires freezing the target and returning its
latest database to the stopped source before changing DNS. The old pre-cutover
dump must not replace newer customer transactions. Preserve source TLS/config,
legacy access and source data until the move has been accepted.
