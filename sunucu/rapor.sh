#!/usr/bin/env bash
# Misket Yarışı — kullanım raporu (bilgisayardan)
# Kullanım: bash sunucu/rapor.sh [7 | 30 | bugun | dun | tumu | 2026-10-20..2026-10-25]
set -euo pipefail
HOST="${HOST:-misket@misket-yarisi.swedencentral.cloudapp.azure.com}"
KEY="${KEY:-$HOME/.ssh/misket_azure}"
ssh -i "$KEY" "$HOST" "sudo -u oyun env VERI=/opt/misket/veri node /opt/misket/kod/sunucu/rapor.js '${1:-7}'"
