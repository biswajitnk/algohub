#!/bin/bash
# ========================================================
# Delta Exchange 24/7 Algo Trading Platform - VPS Auto Deployer
# Supported: Ubuntu 20.04 / 22.04 / 24.04 LTS
# ========================================================

set -e

echo "🚀 Starting Delta Algo VPS Deployment..."

# 1. Update system packages
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3 python3-pip python3-venv git curl nginx ufw

# 2. Check for Docker
if ! command -v docker &> /dev/null; then
    echo "📦 Installing Docker and Docker Compose..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    sudo apt install -y docker-compose-plugin
fi

# 3. Setup firewall
echo "🛡️ Configuring UFW Firewall..."
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 8000/tcp  # API Backend
sudo ufw --force enable

# 4. Deploy using Docker Compose
echo "🐳 Building and starting containers..."
cd "$(dirname "$0")/.."
docker compose -f deploy/docker-compose.yml up -d --build

echo "=========================================================="
echo "✅ Delta Algo Trading System is now running 24/7 on your VPS!"
echo "🌐 Access Web Dashboard: http://$(curl -s ifconfig.me)"
echo "📡 Backend API Endpoint: http://$(curl -s ifconfig.me):8000"
echo "=========================================================="
