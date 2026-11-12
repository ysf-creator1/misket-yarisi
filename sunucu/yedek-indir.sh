#!/usr/bin/env bash
# Misket Yarışı — buluttaki oyuncu kayıtlarının bir kopyasını bu bilgisayara indirir (son 30 gün tutulur)
# Kullanım: bash sunucu/yedek-indir.sh   (her gün kendiliğinden: ~/Library/LaunchAgents/com.misket.yedek.plist)
set -euo pipefail
HOST="${HOST:-ubuntu@130.61.214.155}"  # Oracle (Frankfurt); alan adı misket.gulyabanikoyu.duckdns.org
KEY="${KEY:-$HOME/.ssh/oracle_cloud}"
HEDEF="${HEDEF:-$HOME/claude_mert/misket-yedekler}"
mkdir -p "$HEDEF"
F="$HEDEF/hesaplar-$(date +%Y-%m-%d).json"
/usr/bin/ssh -i "$KEY" -o BatchMode=yes -o ConnectTimeout=20 "$HOST" 'sudo cat /opt/misket/veri/hesaplar.json' > "$F.tmp"
python3 -c "import json,sys; d=json.load(open(sys.argv[1])); print(len(d.get('players',{})), 'oyuncu')" "$F.tmp" && mv "$F.tmp" "$F"
find "$HEDEF" -name 'hesaplar-*.json' -mtime +30 -delete
echo "$(date '+%F %T') yedek indirildi: $F"
