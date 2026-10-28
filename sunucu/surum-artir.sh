#!/usr/bin/env bash
# Oyun sürümünü bir artırır: js/surum.js + index.html'deki ?v= etiketleri + sw.js önbellek adı (önbellekteki eski dosyalar kullanılmasın)
set -euo pipefail
cd "$(dirname "$0")/.."
V=$(grep -o 'OYUN_SURUM = [0-9]*' js/surum.js | grep -o '[0-9]*$'); N=$((V + 1))
sed -i '' "s/OYUN_SURUM = $V;/OYUN_SURUM = $N;/" js/surum.js
sed -i '' -E "s/\?v=[0-9]+\"/?v=$N\"/g" index.html
sed -i '' "s/const SURUM = $V;/const SURUM = $N;/" sw.js
echo "sürüm: $V → $N"
