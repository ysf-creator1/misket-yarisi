#!/usr/bin/env bash
# Misket Yarışı — kullanım raporu (bilgisayardan)
# Kullanım: bash sunucu/rapor.sh [7 | 30 | bugun | dun | tumu | 2026-10-20..2026-10-25]
set -euo pipefail
HOST="${HOST:-ubuntu@130.61.214.155}"  # Oracle (Frankfurt); alan adı misket.gulyabanikoyu.duckdns.org
KEY="${KEY:-$HOME/.ssh/oracle_cloud}"
ssh -i "$KEY" "$HOST" "sudo -u oyun env VERI=/opt/misket/veri node /opt/misket/kod/sunucu/rapor.js '${1:-7}'"
