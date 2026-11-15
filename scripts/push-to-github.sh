#!/usr/bin/env bash
# Abani Classic kodunu github.com/datacleantr/abani-classic reposuna push eder.
#
# Kullanım (token'ı asla dosyaya yazmayın, yalnızca ortam değişkeni olarak verin):
#
#   1) GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
#      → "Generate new token (classic)" → Not: "abani-classic push" → kapsam: [x] repo → Generate
#   2) Terminalde:
#        export GH_TOKEN=github_pat_XXXX
#        ./scripts/push-to-github.sh
#
# Script token'ı geçici olarak remote URL'ye yazar ve işlem bitince URL'yi
# temizler; token git config'de kalmaz.
set -euo pipefail

REPO_SLUG="datacleantr/abani-classic"
REPO_URL="https://github.com/${REPO_SLUG}.git"

if [ -z "${GH_TOKEN:-}" ]; then
  echo "HATA: GH_TOKEN tanımlı değil."
  echo "Örnek: export GH_TOKEN=github_pat_..."
  exit 1
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "HATA: bu script proje kökünde çalıştırılmalı."
  exit 1
fi

git remote remove origin 2>/dev/null || true
git remote add origin "https://x-access-token:${GH_TOKEN}@github.com/${REPO_SLUG}.git"

echo "Push ediliyor: ${REPO_URL} (branch: main)"
git push -u origin main

# Token içeren URL'yi temizle
git remote set-url origin "${REPO_URL}"
echo "Tamam. Remote URL token içermiyor: $(git remote get-url origin)"
echo "Repo: https://github.com/${REPO_SLUG}"
echo "CI otomatik tetiklenecek: Actions sekmesinden yeşil tiki izle."
