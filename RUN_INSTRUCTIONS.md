# Run Instructions

## Fast Start

If you already installed the dependencies before, just run:

```bash
npm run dev
```

Then open http://localhost:3000.

If this is your first time opening the project, install the dependencies once first:

```bash
npm install
npm run dev
```

## For New Users

You only need to install the project dependencies once. After that, future launches are just `npm run dev`.

### What you need before running the project

- Node.js installed on your machine.
- `npm install` run once in the project folder.
- No separate frontend or backend install is needed if you use `npm run dev`.

### First-time setup

```bash
npm install
npm run dev
```

Open http://localhost:3000 after the app starts.

## For Returning Users

If you already installed everything and just want to launch the project again:

```bash
npm run dev
```

That starts both the Next.js frontend and the FastAPI backend together.

## One Command For Mobile + Backend

If you are testing in Expo Go and want one command instead of two terminals:

```bash
npm run dev:mobile
```

This starts:
- FastAPI backend on port 8000
- Expo mobile app from `mobile/` (defaulting to port 8080)

## Demo Login

- Email: demo@example.com
- Password: password123

The backend creates the demo account automatically on startup, so returning users do not need to set anything up again.

## What Runs

- Next.js frontend on port 3000.
- FastAPI backend on port 8000.
- Proxy routes that forward frontend API calls to the backend.
- Seeded market data, sentiment data, and a demo user.

## If You Need To Reset

- Reinstall frontend packages: `npm install`
- Clear the frontend build: `Remove-Item -Recurse -Force node_modules, .next -ErrorAction SilentlyContinue`
- Reset the backend database: `Remove-Item -Force backend/trading.db -ErrorAction SilentlyContinue`
- Start again: `npm run dev`

## Optional Backend-Only Running

If you want to run only the backend for testing or debugging, use:

```bash
npm run start:backend
```

If you want only the frontend, use:

```bash
npm run dev:frontend
```

---

## File Structure

```
project/
├── app/                          # Next.js pages
│   ├── page.tsx                 # Home page
│   ├── login/page.tsx          # Login page
│   ├── register/page.tsx       # Sign up page
│   ├── dashboard/page.tsx      # Main dashboard
│   ├── layout.tsx              # Root layout
│   └── globals.css             # Global styles
│
├── components/                   # React components
│   ├── TradingDashboard.tsx    # Main app
│   ├── PortfolioStats.tsx      # Stats widget
│   ├── MarketWatch.tsx         # Price/sentiment widget
│   ├── PositionForm.tsx        # Trade form
│   ├── RiskGuardian.tsx        # Risk guide
│   ├── OpenPositions.tsx       # Active trades
│   └── TradeHistory.tsx        # Trade history
│
├── lib/
│   └── api.ts                  # API client
│
├── backend/                      # Python FastAPI
│   ├── main.py                 # FastAPI app
│   ├── models.py               # Database models
│   ├── schemas.py              # Request/response schemas
│   ├── risk_engine.py          # Risk calculations
│   ├── market_simulator.py     # Market data
│   ├── sentiment_analyzer.py   # Sentiment analysis
│   ├── setup_demo.py           # Demo data setup
│   ├── .env                    # Backend config
│   └── venv/                   # Python env
│
├── public/                       # Static assets
├── .env.local                   # Frontend config
├── package.json
├── SETUP.md                     # Detailed setup guide
├── PROJECT_OVERVIEW.md          # Complete overview
├── RUN_INSTRUCTIONS.md          # This file
└── QUICKSTART.sh               # Auto setup script
```

---

## Common Tasks

### Create a new user
1. Go to http://localhost:3000
2. Click "Sign Up"
3. Fill in username, email, password
4. Click "Create Account"
5. Login with your credentials

### Open a trade
1. Login to dashboard
2. Click "Open Trade" tab
3. Select instrument
4. Choose BUY or SELL
5. Enter prices (current price auto-filled)
6. Enter quantity
7. Review risk metrics
8. Click "Open Position"

### Close a trade
1. Go to "Open Positions" tab
2. Find your position
3. Click X button to close
4. Confirm closure
5. Position closes at current price

### View statistics
1. Go to "Trade History" tab
2. See all closed trades
3. View summary stats:
   - Total trades
   - Win rate
   - Total P&L
   - Average P&L per trade

### Update market data
Data updates automatically every 5 seconds
Or manually: Click refresh on market watch

---

## Performance Tips

### Frontend
- First load might take 5-10 seconds
- Price updates happen every 5 seconds
- Clear browser cache if issues: Ctrl+Shift+Delete

### Backend
- First request slightly slower (cold start)
- Subsequent requests are fast
- Database is SQLite (file-based) by default
- Switches to PostgreSQL if DATABASE_URL configured

### Database
- Demo uses SQLite (no setup needed)
- Can switch to PostgreSQL for production:
  ```
  DATABASE_URL=postgresql://user:pass@localhost:5432/trading_db
  ```

---

## Next Steps

### Learn More
1. Read `PROJECT_OVERVIEW.md` for architecture details
2. Check `SETUP.md` for advanced configuration
3. Explore FastAPI docs at http://localhost:8000/docs

### Enhance the App
1. **Add real APIs**: Alpha Vantage for stock prices
2. **Add charts**: Use Recharts for visual analysis
3. **Add indicators**: RSI, MACD, Bollinger Bands
4. **Add notifications**: Email/push alerts
5. **Deploy**: Vercel (frontend), Heroku (backend)

### Test It Out
1. Open 5-10 trades
2. Try different risk levels
3. Let some hit S/L, some hit T/P
4. Review your statistics
5. Notice win rate and P&L

---

## Support

### API Documentation
- http://localhost:8000/docs (when running)

### Code Documentation
- Read comments in source files
- Check `PROJECT_OVERVIEW.md` for architecture

### Common Issues
See **Troubleshooting** section above

---

## Quick Reference

| Command | What It Does |
|---------|------------|
| `npm install` | Install all project dependencies for the first time |
| `npm run dev` | Start frontend and backend together |
| `npm run dev:mobile` | Start backend + Expo mobile together |
| `npm run dev:frontend` | Start only the frontend |
| `npm run dev:backend` | Start the backend through the dev script |
| `npm run start:backend` | Start only the backend directly |
| http://localhost:3000 | Access app |
| http://localhost:8000/docs | API docs |
| demo@example.com / password123 | Demo login |

---

## Summary

You now have a **fully functional AI trading simulator**! 

**What works:**
- User registration and authentication
- Real-time market simulation
- AI sentiment analysis  
- Position opening with risk validation
- Automatic position closing
- Trade history and analytics
- Portfolio tracking
- Complete API

**What to do:**
1. New users: run `npm install` once, then `npm run dev`.
2. Returning users: run `npm run dev`.
3. Open http://localhost:3000.
4. Login with demo credentials.
5. Start trading!

**Remember:** This is paper trading for learning only. Risk management is crucial for success!

---

**Happy Trading! 📈**

*Last updated: July 2026*
