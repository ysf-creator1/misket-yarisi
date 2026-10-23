#!/usr/bin/env bash
# Misket Yarışı — çok oyunculu sunucu kurulumu (Ubuntu 24.04, bir kez çalıştırılır)
# Kullanım (sunucuda): sudo bash kur.sh
set -euo pipefail
ALAN="${ALAN:-misket-yarisi.swedencentral.cloudapp.azure.com}"
DEPO="${DEPO:-https://github.com/ysf-creator1/misket-yarisi.git}"
export DEBIAN_FRONTEND=noninteractive

# 1) güncellemeler + otomatik güvenlik güncellemeleri + fail2ban
apt-get update -q
apt-get upgrade -y -q
apt-get install -y -q unattended-upgrades fail2ban git curl ca-certificates gnupg debian-keyring debian-archive-keyring apt-transport-https
dpkg-reconfigure -f noninteractive unattended-upgrades
systemctl enable --now fail2ban

# 2) 1 GB bellek az: 2 GB takas alanı
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q /swapfile /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# 3) Node.js 22 LTS
if ! command -v node >/dev/null || ! node -v | grep -q '^v22'; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y -q nodejs
fi

# 4) Caddy (otomatik HTTPS sertifikası)
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -q && apt-get install -y -q caddy
fi
cat > /etc/caddy/Caddyfile <<EOF
$ALAN {
	encode gzip
	@ws path /ws*
	handle @ws {
		reverse_proxy 127.0.0.1:8790
	}
	handle /durum {
		reverse_proxy 127.0.0.1:8790
	}
	handle {
		respond "Misket Yarışı sunucusu çalışıyor. Oyun: https://ysf-creator1.github.io/misket-yarisi/" 200
	}
}
EOF
systemctl reload caddy || systemctl restart caddy

# 5) oyun kullanıcısı + kod
id oyun >/dev/null 2>&1 || useradd --system --create-home --home-dir /opt/misket --shell /usr/sbin/nologin oyun
if [ ! -d /opt/misket/kod/.git ]; then sudo -u oyun git clone --depth 1 "$DEPO" /opt/misket/kod; fi

# 6) oyun servisi (kod varsa başlar)
cat > /etc/systemd/system/misket.service <<'EOF'
[Unit]
Description=Misket Yarışı çok oyunculu sunucusu
After=network-online.target

[Service]
User=oyun
WorkingDirectory=/opt/misket/kod
Environment=NODE_ENV=production PORT=8790
ExecStart=/usr/bin/node --max-old-space-size=600 sunucu/oyun-sunucusu.js
Restart=always
RestartSec=3
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=/opt/misket

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
if [ -f /opt/misket/kod/sunucu/oyun-sunucusu.js ]; then
  (cd /opt/misket/kod/sunucu && sudo -u oyun npm ci --omit=dev --no-audit --no-fund)
  systemctl enable --now misket
fi
echo "KURULUM TAMAM: node $(node -v), caddy $(caddy version | cut -d' ' -f1)"
