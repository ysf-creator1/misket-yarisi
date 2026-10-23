#!/usr/bin/env bash
# Misket Yarışı — sunucudaki oyunu GitHub'daki son sürüme günceller
# Kullanım (bilgisayardan): bash sunucu/guncelle.sh
set -euo pipefail
HOST="${HOST:-misket@misket-yarisi.swedencentral.cloudapp.azure.com}"
KEY="${KEY:-$HOME/.ssh/misket_azure}"
ssh -i "$KEY" "$HOST" 'set -e
  cd /opt/misket/kod
  sudo -u oyun git fetch --depth 1 origin main
  sudo -u oyun git reset --hard origin/main
  cd sunucu && sudo -u oyun npm ci --omit=dev --no-audit --no-fund
  sudo systemctl enable misket >/dev/null 2>&1 || true
  sudo systemctl restart misket
  sleep 2; systemctl is-active misket; curl -s http://127.0.0.1:8790/durum; echo'
