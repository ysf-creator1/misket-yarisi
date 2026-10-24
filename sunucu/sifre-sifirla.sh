#!/usr/bin/env bash
# Misket Yarışı — şifresini unutan oyuncuya yeni PIN ve kurtarma kodu verir (yönetici)
# Kullanım: bash sunucu/sifre-sifirla.sh "Oyuncu Adı"
set -euo pipefail
[ $# -ge 1 ] || { echo 'Kullanım: bash sunucu/sifre-sifirla.sh "Oyuncu Adı"'; exit 1; }
HOST="${HOST:-misket@misket-yarisi.swedencentral.cloudapp.azure.com}"
KEY="${KEY:-$HOME/.ssh/misket_azure}"
BODY=$(python3 -c 'import json,sys; print(json.dumps({"ad": sys.argv[1]}))' "$1")
ssh -i "$KEY" "$HOST" "curl -s -X POST http://127.0.0.1:8790/api/yonetici/sifirla -H 'Content-Type: application/json' --data-binary @-" <<< "$BODY" | python3 -c '
import json,sys; j=json.load(sys.stdin)
print(f"✅ {j[\"ad\"]}: yeni PIN {j[\"pin\"]} | kurtarma kodu {j[\"kurtarma\"]}" if "pin" in j else "⚠️ " + j.get("hata","hata"))'
