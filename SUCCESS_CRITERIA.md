# Success Criteria & Product Roadmap

Status as of August 2026, based on the current codebase (Next.js web dashboard, FastAPI backend, and Expo mobile app).

---

## Done

### 1. Core Simulator & Trading Engine

- `npm run dev` starts the Next.js frontend and FastAPI backend together seamlessly.
- Demo login works with `demo@example.com` / `password123`.
- Users can register, log in, open and close paper trades, and view real-time portfolio stats.
- Market prices, spreads, and sentiment update on a simulated real-time feed across 5 core assets (`AAPL`, `EURUSD`, `GBPUSD`, `GOLD`, `BTCUSD`).
- Technical risk checks run before entry (stop-loss, reward/risk, position size vs balance).
- Open positions can close automatically on stop-loss / take-profit, or manually with one click.
- Trade history shows closed trades with win rate, total P&L, and average P&L.
- Clean database setup with automatic schema migrations and `.gitignore` hygiene.

### 2. TradeDNA Behavioral Coaching

- **Pre-Trade Risk Engine**: Evaluates loss streaks, chasing losses, strategy adherence, trader confidence, session length, trade frequency, and late-night fatigue.
- **Intervention Tier System**: Deterministic actions — `ALLOW`, `WARN` (requires explicit confirmation), or `BLOCK` (enforces cooldown).
- **Server-Side Enforcement**: The trade execution endpoint verifies risk on the backend so clients cannot bypass restrictions.
- **Coach Event Audit Logs**: All assessments, warnings, and interventions are persisted in SQLite and viewable in audit logs.
- **AI Coach Autofill (`POST /api/risk/suggest-trade`)**: Dynamically generates disciplined trade setups (entry, SL, TP, sizing) matching user strategy and sentiment with dynamic direction detection (never stuck on BUY/SELL).
- **"What-If" Scenario Simulator**: Test market moves (Target Hit, Stop Loss, -2% drop, +2% rally, custom slider) with live P&L, balance drawdown, and guardrail checking before order submission on Web and Mobile.
- **Post-Trade Review & Mistake Categorizer**: Classifies trades into clean execution, normal variance, emotional/FOMO entries, overleverage, or strategy deviations with diagnostic takeaways in Trade History.
- **Beginner-Friendly UX**: Layman's explanations and tooltips for revenge trading, FOMO, overtrading, and session discipline.

### 3. Broker B2B API Engine & Persistence

- **Database-Backed Cooldowns**: Cooldowns (`cooldown_until`) persist in SQLite across backend restarts.
- **API-Key Authentication**: Broker endpoints validate incoming `X-API-Key` headers (`demo_broker_tdna_001` or database user key) and return `401 Unauthorized` for invalid keys.
- **Interactive Multi-Endpoint Broker Showcase**: Dedicated cards with parameter explanations and structured responses for:
  - `POST /api/risk/suggest-trade` (AI Trade Setup Builder)
  - `POST /api/risk/pretrade-assess` (Pre-Trade Behavioral Assessment)
  - `GET /api/coach/events/{user_id}` (Black-Box Audit Log)
  - `GET /api/analytics/{user_id}` (Trader Health & Performance Scorecard)
- **One-Click Broker-to-Trade Transfer**: "Use in Open Trade" copies broker-suggested parameters directly into the Open Trade form.

### 4. Modern UI Design, Animations & Aesthetics (Web & Mobile)

- **CSS Animation Engine (`app/globals.css`)**:
  - `aurora-drift`: Ambient floating gradient backdrops.
  - `float-subtle`: Gentle bobbing badges.
  - `shimmer-slide`: High-tech liquid light reflection on AI Coach generate buttons during computation.
  - `flash-green` & `flash-red`: Real-time price pulse updates for tick changes.
  - `pulse-ring`: Continuous glowing beacon for live trading sessions.
  - Staggered waterfall entrances (`animate-stagger-1` to `animate-stagger-5`).
  - Tactile micro-interactions (press scale transforms and hover elevations).
- **Theme Persistence**: Light and Dark mode preferences persist across logins and reloads without flashing.
- **Performance Scorecard Generator**: Shareable TradeDNA verification modal in Trade History with trader rank, win rate, and one-click clipboard copy.
- **Interactive Equity & Drawdown Curves (Web & Mobile)**: High-fidelity SVG vector line and area charts tracking capital trajectory, peak balance, max drawdown %, current drawdown, profit factor, with interactive hover/touch inspector and Equity/Drawdown/Dual view modes.

### 5. Customizable Trader Risk Rules & Guardrail Settings

- **User-Specific Risk Limits**: Configurable Max Risk % (0.5% – 5.0%), Daily Loss Limit (GHS), Max Trades Per Session/Day, and Target Minimum Risk:Reward Ratio (1:1 to 1:3).
- **Custom Strategy Tagging**: Users can label their primary active strategy (e.g. "15M EMA Pullback", "Breakout Retest") for strategy-specific TradeDNA coach evaluation.
- **Full-Stack Persistence & Enforcement**:
  - Saved directly to SQLite per user profile.
  - Server-side pre-trade validation strictly adheres to the user's custom risk ceiling in `POST /api/positions` and `RiskGuardian.validate_trade`.
- **Interactive Modals on Web and Mobile**:
  - Web: [components/RiskSettingsModal.tsx](file:///c:/Users/decei/Documents/trading-risk-simulator/components/RiskSettingsModal.tsx)
  - Mobile: [mobile/components/MobileRiskSettingsModal.tsx](file:///c:/Users/decei/Documents/trading-risk-simulator/mobile/components/MobileRiskSettingsModal.tsx)
  - Accessible via "Risk Guardrails" in header and "Customize Rules" in Risk Guardian cards.

### 6. Export, Reporting & Rich Sharing Tools (Web & Mobile)

- **Downloadable Branded PDF Performance Statement**:
  - Web: [components/PerformanceStatementModal.tsx](file:///c:/Users/decei/Documents/trading-risk-simulator/components/PerformanceStatementModal.tsx)
  - Mobile: [mobile/components/MobilePerformanceStatementModal.tsx](file:///c:/Users/decei/Documents/trading-risk-simulator/mobile/components/MobilePerformanceStatementModal.tsx)
  - Generates print-ready / high-res PDF trading statements with TradeDNA verification, starting vs ending equity, win rates, return on capital, profit factor, plan adherence %, and itemized trade logs.
- **Rich Performance Sharing**:
  - Web: Web Share API integration (`navigator.share`) with text summary fallback.
  - Mobile: Native file sharing via `expo-print` + `expo-sharing` (sends PDF directly to WhatsApp, Telegram, Files, etc.) and `Share.share` summary.
- **CSV Trade Journal Export**: Download complete trading logs with execution prices, hold times, and coaching diagnoses (now exports real `.csv` file attachments on mobile).

---

## Still To Build & Proposed Improvements

### 1. Analytics & Visual Charting

- **Win-Rate Heatmap by Time & Asset**: Visual calendar/hourly matrix showing which trading sessions and instruments yield the highest discipline scores.

### 2. High-Fidelity Trade Replay & Stored Ticks

- **Real Tick-by-Tick Price Checkpoints**: Store high-resolution price ticks during open positions so replay displays exact candlestick / line chart trajectories rather than interpolated midpoints.
- **Step-by-Step Replay Player**: Interactive playback controls (Play, Pause, 1x, 2x, 5x speed) to review how emotional decisions unfolded during the trade.

### 3. Multi-Tenant B2B Broker Portal

- **Broker Admin Dashboard**: A separate B2B portal where risk managers can monitor client-wide risk metrics, active cooldowns, and intervention rates.
- **Multi-Tenant Isolation**: Partition users and API keys by broker tenant ID.

---

## Recommended Next Priorities

1. **Win-Rate Heatmap by Time & Asset**: Visual matrix showing best trading windows and symbol profitability on Web and Mobile.
2. **Interactive Trade Replay Player**: Play, Pause, and speed controls for reviewing historical trades.
