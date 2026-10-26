#!/usr/bin/env bash
set -euo pipefail
test "$(hostname)" = vmi3078867
umask 077
cd /var/www/nunstock
sha=$(git rev-parse HEAD)
release_dir=/var/www/nunstock-releases/$sha
env_file=/etc/nunstock/backend.env
test -s "$env_file"
db_version=$(docker exec nunstock-db psql -U nunstock -d nunstock -Atq -c "SHOW server_version_num;")
[[ "$db_version" =~ ^16[0-9]{4}$ ]] && [ "$db_version" -ge 160015 ]
exec 8>/run/lock/kham-app-build.lock
flock -w 1800 8
mkdir -p "$release_dir"
git archive HEAD | tar -x -C "$release_dir"
cp "$env_file" "$release_dir/backend/.env"
cd "$release_dir/backend"
npm ci --prefer-offline --no-audit
npx prisma generate
npm run build
npm run type-check
npm test
cd "$release_dir/frontend"
printf 'NEXT_PUBLIC_API_URL=http://127.0.0.1:1100\nNEXT_PUBLIC_APP_VERSION=%s\n' "${sha:0:8}" > .env.local
npm ci --prefer-offline --no-audit
NODE_OPTIONS=--max-old-space-size=2048 npm run build
cp -a public .next/standalone/public
mkdir -p .next/standalone/.next
cp -a .next/static .next/standalone/.next/static
flock -u 8
backup_dir=/var/backups/nunstock
mkdir -p "$backup_dir"
backup_file=$backup_dir/pre-deploy-$(date -u +%Y%m%dT%H%M%SZ)-${sha:0:8}.dump
pm2 stop nunstock-backend
resume_old=true
trap 'if [ "$resume_old" = true ]; then pm2 restart nunstock-backend; fi' EXIT
docker exec nunstock-db pg_dump -U nunstock -d nunstock -Fc > "$backup_file"
test -s "$backup_file"
docker exec -i nunstock-db pg_restore --list < "$backup_file" > /dev/null
cd "$release_dir/backend"
npx prisma migrate deploy
npx prisma migrate status
RELEASE_DIR="$release_dir" ENV_FILE="$env_file" node <<'JS'
const fs=require('node:fs');const root=process.env.RELEASE_DIR;
fs.writeFileSync(root+'/ecosystem.release.json',JSON.stringify({apps:[
 {name:'nunstock-backend',cwd:root+'/backend',script:'dist/index.js',node_args:'--env-file='+process.env.ENV_FILE,max_memory_restart:'512M',env:{NODE_ENV:'production',HOST:'127.0.0.1',PORT:1100}},
 {name:'nunstock-frontend',cwd:root+'/frontend',script:'.next/standalone/server.js',max_memory_restart:'768M',env:{NODE_ENV:'production',HOSTNAME:'127.0.0.1',PORT:9090}}
]}));
JS
pm2 delete nunstock-backend nunstock-frontend
pm2 start "$release_dir/ecosystem.release.json"
resume_old=false
pm2 save
for attempt in $(seq 1 40); do
 if curl -fsS http://127.0.0.1:1100/ > /dev/null && curl -fsS http://127.0.0.1:9090/login > /dev/null; then break; fi
 if [ "$attempt" = 40 ]; then echo 'Nunstock readiness failed'; exit 1; fi
 sleep 2
done
cd "$release_dir/backend"
node --env-file="$env_file" "$release_dir/.github/scripts/verify-live.cjs"
printf 'Deployed commit: %s\nVerified database backup: %s\n' "$sha" "$backup_file"
