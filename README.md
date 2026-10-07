# ⚡ Delta Algo Trading Platform (24/7 VPS + Android Mobile)

A production-grade, 24/7 automated algorithmic trading platform designed specifically for **Delta Exchange India** (and Global) perpetual futures and options. It features a high-performance Python strategy engine, a sleek web dashboard, instant mobile phone alerts via Telegram, and a dedicated Android mobile app.

---

## 🌟 Key Features

- **24/7 Background Trading Engine:**
  - Automated candle polling, indicator computation, and order execution.
  - Built-in strategies:
    - **Supertrend (ATR)**: Adaptive trend-following with dynamic trailing stops.
    - **EMA Crossover**: Fast/Slow EMA momentum rider (e.g. 9/21, 20/50).
    - **RSI Scalper**: Mean-reversion scalping with overbought/oversold boundaries.
  - Dual Execution Modes:
    - **PAPER Trading (Default)**: Zero-risk simulated execution with real live market feeds.
    - **LIVE Trading**: Real orders routed to Delta Exchange India via HMAC-SHA256 authenticated REST API.

- **Capital Protection & Risk Management:**
  - **Max Daily Loss Limit**: Circuit breaker that pauses trading if cumulative daily loss reaches threshold.
  - **Hard Leverage Ceiling**: Enforces maximum leverage per strategy.
  - **Automatic Bracket Orders**: Auto-calculates exact Stop Loss and Take Profit prices.
  - **Emergency Kill Switch**: 1-click button to immediately liquidate all open positions, cancel all orders, and halt all algorithms.

- **Real-Time Phone Alerts & Notifications:**
  - Instant **Telegram notifications** directly to your Android phone when trades open, close, hit targets, or trigger stops.
  - Real-time **WebSocket streaming** of ticks, indicator readings, and engine decisions directly to the web dashboard and mobile app.

- **Mobile App (Android):**
  - Monitor live equity, today's PnL, and open positions on the go.
  - 1-tap manual market closure for any open trade.
  - Start or pause any algorithmic strategy with a single tap.
  - Available both as an installable **Progressive Web App (PWA)** and a **React Native (Expo) Android App**.

- **VPS Ready (Ubuntu / Docker / systemd):**
  - Pre-configured `docker-compose.yml`, `nginx.conf`, and `deploy.sh` for reliable 24/7 execution on budget VPS hosts (DigitalOcean, Hetzner, AWS Lightsail).

---

## 📁 Project Structure

```
BackTest/
├── backend/                  # Python 3 / FastAPI 24/7 Algo Engine
│   ├── app/
│   │   ├── config.py         # App configuration & credentials
│   │   ├── database.py       # SQLite / async SQLAlchemy
│   │   ├── models.py         # Bot, Trade, Equity, Alert database models
│   │   ├── schemas.py        # Pydantic schemas
│   │   ├── delta_client.py   # Full Delta Exchange India & Global client (HMAC SHA256)
│   │   ├── risk_manager.py   # Circuit breaker, leverage limits, SL/TP math
│   │   ├── engine.py         # 24/7 background event loop
│   │   ├── notifications.py  # Telegram bot & WebSocket broadcaster
│   │   ├── strategies/       # Pluggable algo strategies (Supertrend, EMA, RSI)
│   │   ├── api/              # REST API & WebSocket endpoints
│   │   └── main.py           # Application entry point
│   ├── requirements.txt
│   └── .env.example
├── frontend/                 # Modern React Web Dashboard & PWA
│   ├── src/
│   │   ├── components/       # Metric cards, Positions, Bots, Trades, Logs, Modals
│   │   ├── services/api.js   # API client & WebSocket listener
│   │   └── App.jsx           # Main trading dashboard view
│   ├── public/manifest.json  # Android PWA install configuration
│   └── package.json
├── mobile/                   # React Native (Expo) Android Mobile App
│   ├── App.js                # Mobile UI with bottom navigation
│   ├── app.json              # Android package & permissions configuration
│   └── package.json
└── deploy/                   # 24/7 VPS Deployment Files
    ├── docker-compose.yml    # Multi-container production deployment
    ├── nginx.conf            # Nginx reverse proxy with WebSockets & SSL
    ├── delta-algo.service    # Linux systemd service unit
    ├── deploy.sh             # 1-click Ubuntu VPS setup script
    └── VPS_HOSTING_GUIDE.md  # Step-by-step VPS hosting tutorial
```

---

## 🚀 Quick Start (Running Locally)

### 1. Start the Backend
```bash
# In BackTest directory:
.\venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --reload --port 8000
```
API Documentation will be available at: `http://localhost:8000/docs`

### 2. Start the Frontend Dashboard
```bash
cd frontend
npm run dev
```
Open `http://localhost:3000` in your browser.

### 3. Run the Mobile App
```bash
cd mobile
npm install
npx expo start
```
Scan the QR code with **Expo Go** on your Android device.

---

## 🌐 24/7 VPS Deployment
See [deploy/VPS_HOSTING_GUIDE.md](file:///d:/Codes/BackTest/deploy/VPS_HOSTING_GUIDE.md) for full instructions on setting up on DigitalOcean, Hetzner, or AWS.

---

## ⚖️ Financial Risk Disclaimer
Cryptocurrency and derivatives trading carries substantial risk of loss and is not suitable for every investor. The automated tools and sample strategies provided in this codebase are for educational and trading workflow automation. Always use Paper Trading mode to thoroughly test any strategy before using live capital.
