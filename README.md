# 🧠 AI Trading Risk Simulator & Behavioral Coach (TradeDNA)

A full-stack paper trading platform that goes beyond price simulation — it **blocks emotional trades before they happen**, coaches discipline in real-time, and provides a B2B Broker API for institutional risk evaluation.

> 80% of retail traders lose money. This platform teaches you *why* — and stops you before you do.

---

## ✨ Features

### 📊 Core Trading Engine
- Paper trade across **5 asset classes**: `AAPL`, `EURUSD`, `GBPUSD`, `GOLD`, `BTCUSD`
- Real-time simulated market prices, spreads, and sentiment
- Automatic Stop-Loss / Take-Profit execution
- Full trade history with P&L tracking

### 🛡️ TradeDNA Behavioral Coach
- **Pre-Trade Risk Engine** — enforces max 2% account risk, mandatory stop-loss, and minimum risk-to-reward ratio
- **Emotional Intervention System** — detects revenge trading, loss chasing, overtrading, and late-night fatigue
- **3-Tier Actions**: `ALLOW` → `WARN` (requires confirmation) → `BLOCK` (enforces cooldown timer)
- **Post-Trade Mistake Categorizer** — classifies every closed trade as clean execution, emotional entry, FOMO, or strategy deviation
- **AI Coach Autofill** — generates disciplined trade setups matching current market conditions

### 🔗 B2B Broker API
- API-Key authenticated endpoints for external broker integration
- `POST /api/risk/pretrade-assess` — behavioral risk check before order routing
- `POST /api/risk/suggest-trade` — AI-generated trade setup
- `GET /api/analytics/{user_id}` — trader health scorecard
- `GET /api/coach/events/{user_id}` — compliance audit log

### 📱 Cross-Platform
- **Web Dashboard** — Next.js with dark/light mode, animations, and interactive equity charts
- **Mobile App** — Expo (React Native) for iOS & Android via Expo Go
- **PDF Reports** — downloadable branded performance statements
- **CSV Export** — full trade journal with coaching diagnoses

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python, FastAPI, SQLAlchemy, SQLite |
| **Web Frontend** | Next.js 16, React 19, Tailwind CSS v4 |
| **Mobile** | Expo SDK 54, React Native, Expo Router v6 |
| **Database** | SQLite 3 |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+

### 1. Clone & Install
```bash
git clone https://github.com/Michael0069/trading-risk-simulator.git
cd trading-risk-simulator
npm install
```

### 2. Set Up Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
cd ..
```

### 3. Configure Environment
```bash
cp .env.local.example .env.local
cp backend/.env.example backend/.env
```

### 4. Run Everything
```bash
npm run dev
```

This starts **both** the Next.js frontend (port 3000) and the FastAPI backend (port 8000).

### 5. Login
Open **http://localhost:3000** and use:
- **Email:** `demo@example.com`
- **Password:** `password123`

---

## 📱 Mobile App

```bash
cd mobile
cp .env.example .env
npm install
npm start
```

Scan the QR code with **Expo Go** on your phone.

---

## 📂 Project Structure

```
trading-risk-simulator/
├── app/                    # Next.js pages (login, register, dashboard)
├── components/             # React UI components (web)
├── lib/                    # Shared utilities & API client
├── backend/
│   ├── main.py             # FastAPI server & all endpoints
│   ├── risk_engine.py      # RiskGuardian validation logic
│   ├── market_simulator.py # Price feed simulation
│   ├── models.py           # SQLAlchemy database models
│   └── schemas.py          # Pydantic request/response schemas
├── mobile/
│   ├── app/                # Expo Router screens
│   ├── components/         # React Native UI components
│   └── lib/                # Mobile API client & utilities
└── scripts/
    └── dev.mjs             # Concurrent dev server launcher
```

---

## 📄 License

This project was built as a university mini-project (CSC 319).
