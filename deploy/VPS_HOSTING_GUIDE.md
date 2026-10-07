# 🚀 24/7 VPS Deployment & Mobile App Setup Guide

This comprehensive guide will help you host your **Delta Algo Trading System** on a VPS (Virtual Private Server) so it executes your algorithmic trading strategies 24 hours a day, 7 days a week, and sends real-time trade alerts directly to your Android mobile phone.

---

## 1. Choosing a VPS Provider ($3.50 – $5 / month)

You do **not** need an expensive server. Any budget Linux VPS with at least **1GB or 2GB RAM** and **1 vCPU** will easily run the trading engine 24/7:

| Provider | Recommended Plan | Approx Price | Location |
| :--- | :--- | :--- | :--- |
| **Hetzner Cloud** (Top Choice) | CX22 (2 vCPU, 4GB RAM) | ~€3.79 / mo | Germany / Helsinki |
| **DigitalOcean** | Basic Droplet (1 vCPU, 1GB RAM) | ~$4.00 / mo | Bangalore / Singapore / Frankfurt |
| **AWS Lightsail** | 1 vCPU, 1GB or 2GB RAM | ~$3.50 - $5 / mo | Mumbai / Singapore |
| **Hostinger / Contabo** | VPS 1 | ~$4.50 / mo | Asia / Europe |

> **OS Choice:** Always choose **Ubuntu 22.04 LTS** or **Ubuntu 24.04 LTS** 64-bit.

---

## 2. Deploying on Your VPS (1-Command Quickstart)

### Step 2.1: Connect to your VPS via SSH
Open your terminal (PowerShell or Git Bash on Windows):
```bash
ssh root@YOUR_VPS_IP
```

### Step 2.2: Clone or Copy the Project
```bash
git clone https://github.com/your-username/BackTest.git delta-algo
cd delta-algo
```
*(Or upload the project folder directly via SFTP / FileZilla to `/var/www/delta-algo`)*

### Step 2.3: Run the Auto-Deployer
Make the deploy script executable and run:
```bash
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

The script will automatically:
- Install Python, Docker, and Nginx.
- Configure UFW firewall (Ports 80, 443, 8000).
- Launch the background trading engine and web dashboard with `restart: always` (so if the server ever reboots, your trading bots resume immediately).

---

## 3. Connecting Delta Exchange India API

1. Log in to your **[Delta Exchange India](https://india.delta.exchange)** account.
2. Go to **Settings** → **API Keys** → click **Create API Key**.
3. Select permissions:
   - **Read**: Enabled (for balances and open positions).
   - **Trade**: Enabled (for automated order placement).
   - *Withdrawal*: **KEEP DISABLED** (always keep withdrawals disabled for safety).
4. In the Web Dashboard or Mobile App, click **Settings** (gear icon) and paste:
   - **Exchange**: `Delta India` (`api.india.delta.exchange`)
   - **API Key**
   - **API Secret**
5. Click **Test Connection** — you will see a green checkmark confirming your live balance and products are linked!

---

## 4. Setting up Instant Phone Alerts via Telegram

Telegram is the industry standard for algo traders because it gives **instant vibration & sound push alerts on your Android phone** with zero setup costs.

### Step 4.1: Create your free Telegram Bot
1. Open Telegram on your phone and search for **`@BotFather`**.
2. Send `/newbot` and follow the prompts to name your bot (e.g., `MyDeltaAlgoBot`).
3. BotFather will provide an **HTTP API Token** (e.g., `7123456789:AAH...`). Copy this.

### Step 4.2: Get your Chat ID
1. Search for **`@userinfobot`** on Telegram and click Start.
2. It will reply with your numeric **Id** (e.g., `987654321`). Copy this number.
3. Open your new bot in Telegram and click **Start** so it has permission to message you.

### Step 4.3: Save and Test
1. In the Web Dashboard, go to **Settings** → **Telegram Mobile Alerts**.
2. Paste the **Bot Token** and **Chat ID**.
3. Click **Send Test Alert** — your phone will instantly ring with a test message!

Whenever an algorithm opens a trade, closes for profit, or hits stop-loss, your phone will alert you instantly with:
- 🚀 **New Trade Opened** (Symbol, Side, Entry Price, Stop Loss, Target)
- 💰 **Trade Closed (Profit/Loss)** (PnL in \$, % return, exit reason)
- ⚠️ **Risk Circuit Breaker Alerts**

---

## 5. Using the Android Mobile App

You have two convenient options for Android:

### Option A: Installable PWA (Instant 1-Tap Setup)
The Web Dashboard is fully PWA-enabled (Progressive Web App):
1. Open Chrome on your Android phone and navigate to `http://YOUR_VPS_IP`.
2. Chrome will show a banner: **"Add Delta Algo to Home screen"** (or tap the 3 dots menu → **Install App**).
3. The app is installed as a standalone fullscreen app on your home screen with its custom icon!

### Option B: Standalone Android App (React Native Expo)
In the `mobile/` directory:
1. Open `mobile/src/services/api.js` and set your VPS IP:
   ```javascript
   let VPS_URL = 'http://YOUR_VPS_IP:8000';
   ```
2. Test locally using Expo Go:
   ```bash
   cd mobile
   npm install
   npx expo start
   ```
   Scan the QR code with the **Expo Go** app on your Android phone.
3. Build a release Android APK:
   ```bash
   npx eas-cli build -p android --profile preview
   ```
   Download and install the generated APK file on any Android device!
