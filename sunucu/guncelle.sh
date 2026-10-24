#!/usr/bin/env bash
# Misket Yarışı — sunucudaki oyunu GitHub'daki son sürüme günceller
# Kullanım (bilgisayardan): bash sunucu/guncelle.sh
set -euo pipefail
HOST="${HOST:-misket@misket-yarisi.swedencentral.cloudapp.azure.com}"
KEY="${KEY:-$HOME/.ssh/misket_azure}"
# yarış süren oda varsa (oyuncular kopmasın) en fazla 10 dk bitmesini bekle
for i in $(seq 1 60); do
  N=$(curl -s -m 5 https://misket-yarisi.swedencentral.cloudapp.azure.com/durum | python3 -c 'import json,sys; print(json.load(sys.stdin).get("yarisan",0))' 2>/dev/null || echo 0)
  [ "$N" = "0" ] && break
  echo "⏳ $N odada yarış sürüyor, bitmesi bekleniyor…"; sleep 10
done
ssh -i "$KEY" "$HOST" 'set -e
  sudo -u oyun bash -c "cd /opt/misket/kod && git fetch -q --depth 1 origin main && git reset -q --hard origin/main && cd sunucu && npm ci --omit=dev --no-audit --no-fund --loglevel=error"
  sudo systemctl enable -q misket 2>/dev/null || true
  sudo systemctl restart misket
  sleep 3; echo "servis: $(systemctl is-active misket)"; curl -s http://127.0.0.1:8790/durum; echo'
