#!/usr/bin/env bash
# Misket Yarışı — şifresini unutan oyuncuya yeni PIN verir (yönetici)
# Kullanım: bash sunucu/sifre-sifirla.sh "Oyuncu Adı"
set -euo pipefail
[ $# -ge 1 ] || { echo 'Kullanım: bash sunucu/sifre-sifirla.sh "Oyuncu Adı"'; exit 1; }
HOST="${HOST:-misket@misket-yarisi.swedencentral.cloudapp.azure.com}"
KEY="${KEY:-$HOME/.ssh/misket_azure}"
BODY=$(python3 -c 'import json,sys; print(json.dumps({"ad": sys.argv[1]}))' "$1")
ssh -i "$KEY" "$HOST" "curl -s -X POST http://127.0.0.1:8790/api/yonetici/sifirla -H 'Content-Type: application/json' --data-binary @-" <<< "$BODY" > /tmp/misket-sifirla.$$
python3 - /tmp/misket-sifirla.$$ <<'PY'
import json, sys
j = json.load(open(sys.argv[1]))
if 'pin' in j: print('✅ %s: yeni PIN %s (diğer cihazlardaki oturumları kapandı)' % (j['ad'], j['pin']))
else: print('⚠️ ' + j.get('hata', 'hata'))
PY
rm -f /tmp/misket-sifirla.$$
