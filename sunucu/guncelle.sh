#!/usr/bin/env bash
# Misket Yarışı — sunucudaki oyunu GitHub'daki son sürüme günceller
# Kullanım (bilgisayardan): bash sunucu/guncelle.sh
set -euo pipefail
HOST="${HOST:-misket@misket-yarisi.swedencentral.cloudapp.azure.com}"
KEY="${KEY:-$HOME/.ssh/misket_azure}"
ssh -i "$KEY" "$HOST" 'set -e
  sudo -u oyun bash -c "cd /opt/misket/kod && git fetch -q --depth 1 origin main && git reset -q --hard origin/main && cd sunucu && npm ci --omit=dev --no-audit --no-fund --loglevel=error"
  sudo systemctl enable -q misket 2>/dev/null || true
  sudo systemctl restart misket
  sleep 3; echo "servis: $(systemctl is-active misket)"; curl -s http://127.0.0.1:8790/durum; echo'
