#!/usr/bin/env bash
# Abani Classic — canlıya alma otomasyonu.
# Gerekli ortam değişkenleri (sohbete yazılmaz, ortam paneline eklenir):
#   GITHUB_TOKEN        -> repo içerik yazma yetkisi (fine-grained: Contents: Read and write)
#   PROD_DATABASE_URL   -> Neon pooled connection string
#   VERCEL_TOKEN        -> vercel.com/account/tokens
#   ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME -> ilk gerçek yönetici
set -euo pipefail

step() { printf "\n\033[1;36m== %s\033[0m\n" "$1"; }

step "1/5 GitHub'a push"
if [ -n "${GITHUB_TOKEN:-}" ]; then
  git push "https://x-access-token:${GITHUB_TOKEN}@github.com/datacleantr/abani-classic.git" main --force-with-lease=main
  echo "Push tamamlandı."
else
  echo "GITHUB_TOKEN yok — atlandı."
fi

step "2/5 Üretim veritabanı şeması"
if [ -n "${PROD_DATABASE_URL:-}" ]; then
  DATABASE_URL="$PROD_DATABASE_URL" npx drizzle-kit push --force
  echo "Şema uygulandı."
else
  echo "PROD_DATABASE_URL yok — atlandı."
fi

step "3/5 Katalog iskeleti + demo temizliği + gerçek yönetici"
if [ -n "${PROD_DATABASE_URL:-}" ]; then
  DATABASE_URL="$PROD_DATABASE_URL" npx tsx src/db/seed.ts
  DATABASE_URL="$PROD_DATABASE_URL" npx tsx scripts/remove-demo-data.ts --confirm
  if [ -n "${ADMIN_EMAIL:-}" ] && [ -n "${ADMIN_PASSWORD:-}" ]; then
    DATABASE_URL="$PROD_DATABASE_URL" npx tsx scripts/create-admin.ts "${ADMIN_NAME:-Yönetici}" "$ADMIN_EMAIL" "$ADMIN_PASSWORD" super_admin
  else
    echo "ADMIN_EMAIL/ADMIN_PASSWORD yok — yönetici oluşturulmadı."
  fi
fi

step "4/5 Vercel deploy"
if [ -n "${VERCEL_TOKEN:-}" ]; then
  npx vercel@latest link --yes --token "$VERCEL_TOKEN" --project abani-classic
  for key in DATABASE_URL APP_URL PAYMENT_WEBHOOK_SECRET SESSION_SECRET; do
    case "$key" in
      DATABASE_URL) value="${PROD_DATABASE_URL:-}";;
      APP_URL) value="${APP_URL:-https://abani-classic.vercel.app}";;
      PAYMENT_WEBHOOK_SECRET) value="$(openssl rand -hex 32)";;
      SESSION_SECRET) value="$(openssl rand -hex 32)";;
    esac
    [ -n "$value" ] && printf '%s' "$value" | npx vercel@latest env add "$key" production --token "$VERCEL_TOKEN" --force >/dev/null 2>&1 || true
  done
  npx vercel@latest deploy --prod --yes --token "$VERCEL_TOKEN"
else
  echo "VERCEL_TOKEN yok — atlandı."
fi

step "5/5 Sağlık kontrolü"
if [ -n "${APP_URL:-}" ]; then
  curl -fsS "${APP_URL}/api/health" && echo " ✓ ${APP_URL} ayakta."
fi
echo "Tamamlandı."
