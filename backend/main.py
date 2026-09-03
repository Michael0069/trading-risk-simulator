from fastapi import FastAPI, Depends, HTTPException, Response, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import random
import os
import re
import hashlib
import secrets
from typing import Dict, List, Optional
from dotenv import load_dotenv

from models import SessionLocal, init_db, User, Position, Trade, MarketPrice, SentimentData, TradeCoachEvent
from risk_engine import RiskGuardian
from schemas import (
    UserCreate, UserLogin, UserResponse, PositionCreate, PositionResponse,
    TradeResponse, MarketPriceResponse, SentimentResponse, RiskValidationResponse,
    BehavioralRiskRequest, BehavioralRiskResponse,
    TradeSuggestionRequest, TradeSuggestionResponse,
    TradeCoachEventResponse, TradeAnalyticsResponse, BrokerDemoConfigResponse,
    RiskSettingsUpdate, RiskSettingsResponse
)
from market_simulator import MarketSimulator
from sentiment_analyzer import SentimentAnalyzer

load_dotenv()

app = FastAPI(title="AI Trading Simulator API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

USER_COOLDOWNS: Dict[int, datetime] = {}


def _serialize_reasons(reasons: List[str]) -> str:
    return " | ".join(reasons)


def assess_behavioral_risk(
    db: Session,
    user_id: int,
    instrument: str,
    side: str,
    amount_at_risk: float,
    reason: Optional[str],
    followed_strategy: Optional[bool],
    chasing_losses: Optional[bool],
    confidence_level: Optional[int],
    session_minutes: Optional[int],
    trades_this_session: Optional[int],
) -> dict:
    now = datetime.utcnow()
    score = 0.0
    reasons: List[str] = []

    user = db.query(User).filter(User.id == user_id).first()
    db_cooldown = user.cooldown_until if user else None
    cooldown_until = db_cooldown or USER_COOLDOWNS.get(user_id)

    if cooldown_until:
        cooldown_naive = cooldown_until.replace(tzinfo=None) if hasattr(cooldown_until, "tzinfo") and cooldown_until.tzinfo else cooldown_until
        if now < cooldown_naive:
            remaining = int((cooldown_naive - now).total_seconds() // 60) + 1
            return {
                "score": 100.0,
                "risk_level": "CRITICAL",
                "intervention": "BLOCK",
                "cooldown_minutes": max(remaining, 1),
                "reasons": [f"Cooldown active for another {remaining} minute(s)."],
                "coaching_prompt": "Cooldown is active. Pause and review your plan before placing another trade.",
            }

    recent_trades = db.query(Trade).filter(
        Trade.user_id == user_id,
        Trade.status == "CLOSED"
    ).order_by(Trade.closed_at.desc()).limit(10).all()

    loss_streak = 0
    for trade in recent_trades:
        if trade.pnl is not None and trade.pnl < 0:
            loss_streak += 1
        else:
            break

    if chasingLosses := chasing_losses:
        score += 25
        reasons.append("You indicated you may be chasing losses.")

    if followed_strategy is False:
        score += 20
        reasons.append("Trade does not follow your strategy checklist.")

    if loss_streak >= 2:
        boost = min(20, 8 * loss_streak)
        score += boost
        reasons.append(f"Recent loss streak detected ({loss_streak} in a row).")

    if confidence_level is not None and confidence_level <= 2:
        score += 10
        reasons.append("Low confidence input suggests impulsive entry risk.")

    if session_minutes is not None and session_minutes > 120:
        score += 10
        reasons.append("Long session fatigue risk detected (over 120 minutes).")

    if trades_this_session is not None and trades_this_session >= 6:
        score += 10
        reasons.append("High trade frequency this session may indicate overtrading.")

    if amount_at_risk > 0 and recent_trades:
        recent_sizes = [abs((t.entry_price or 0) * (t.quantity or 0)) for t in recent_trades if t.entry_price and t.quantity]
        if recent_sizes:
            avg_size = sum(recent_sizes) / len(recent_sizes)
            if avg_size > 0 and (amount_at_risk * 10) > avg_size:
                score += 10
                reasons.append("Requested risk size is elevated versus your recent behavior.")

    if now.hour >= 22 or now.hour <= 2:
        score += 8
        reasons.append("Late-night trading window increases decision fatigue risk.")

    if reason and len(reason.strip()) < 12:
        score += 7
        reasons.append("Trade reason is too short. Clarify setup before entering.")

    score = min(round(score, 2), 100.0)

    if score >= 80:
        intervention = "BLOCK"
        risk_level = "CRITICAL"
        cooldown_minutes = 10
        cooldown_target = now + timedelta(minutes=cooldown_minutes)
        USER_COOLDOWNS[user_id] = cooldown_target
        if user:
            user.cooldown_until = cooldown_target
            db.commit()
        coaching_prompt = "High behavioral risk detected. Take a 10-minute reset and re-evaluate your setup."
    elif score >= 55:
        intervention = "WARN"
        risk_level = "HIGH"
        cooldown_minutes = 0
        coaching_prompt = "Caution: confirm your entry criteria and reduce size before proceeding."
    elif score >= 30:
        intervention = "ALLOW"
        risk_level = "MEDIUM"
        cooldown_minutes = 0
        coaching_prompt = "Moderate risk. Keep position size disciplined and stick to your stop-loss."
    else:
        intervention = "ALLOW"
        risk_level = "LOW"
        cooldown_minutes = 0
        coaching_prompt = "Behavioral profile looks stable for this trade."

    if not reasons:
        reasons.append("No significant behavioral red flags detected.")

    return {
        "score": score,
        "risk_level": risk_level,
        "intervention": intervention,
        "cooldown_minutes": cooldown_minutes,
        "reasons": reasons,
        "coaching_prompt": coaching_prompt,
    }


def suggest_instrument_from_reason(reason: str, fallback_instrument: Optional[str] = None) -> str:
    valid_instruments = ["AAPL", "EURUSD", "GBPUSD", "GOLD", "BTCUSD"]
    fallback = fallback_instrument if (fallback_instrument and fallback_instrument.upper() in valid_instruments) else "AAPL"
    if not reason:
        return fallback

    clean_text = " " + re.sub(r'[^a-zA-Z0-9/ ]+', ' ', reason.lower()) + " "

    # 1. GBPUSD patterns & typos (e.g. gpb usd, gbp/usd, gpbusd, pound, sterling, cable)
    gbp_patterns = [
        r'\bgbpusd\b', r'\bgbp\s*/?\s*usd\b', r'\bgpbusd\b', r'\bgpb\s*/?\s*usd\b',
        r'\bgpdusd\b', r'\bgpd\s*/?\s*usd\b', r'\bgbp\b', r'\bgpb\b', r'\bgpd\b',
        r'\bpound\b', r'\bpounds\b', r'\bsterling\b', r'\bcable\b', r'\bbritish\s*pound\b',
        r'\buk\s*pound\b'
    ]
    for pattern in gbp_patterns:
        if re.search(pattern, clean_text):
            return "GBPUSD"

    # 2. EURUSD patterns & typos (e.g. eurusd, eur/usd, erusd, euro, fiber)
    eur_patterns = [
        r'\beurusd\b', r'\beur\s*/?\s*usd\b', r'\berusd\b', r'\beru\s*/?\s*usd\b',
        r'\beuro\s*/?\s*usd\b', r'\beur\b', r'\beru\b', r'\beuro\b', r'\beuros\b',
        r'\bfiber\b', r'\beu\b'
    ]
    for pattern in eur_patterns:
        if re.search(pattern, clean_text):
            return "EURUSD"

    # 3. BTCUSD patterns & typos (e.g. btcusd, btc/usd, bitcoin, crypto)
    btc_patterns = [
        r'\bbtcusd\b', r'\bbtc\s*/?\s*usd\b', r'\bbtcusdt\b', r'\bbtc\b',
        r'\bbitcoin\b', r'\bbitcoins\b', r'\bbitcion\b', r'\bcrypto\b',
        r'\bcryptocurrency\b', r'\bsats\b'
    ]
    for pattern in btc_patterns:
        if re.search(pattern, clean_text):
            return "BTCUSD"

    # 4. GOLD patterns (e.g. gold, xauusd, xau, bullion)
    gold_patterns = [
        r'\bgold\b', r'\bxauusd\b', r'\bxau\s*/?\s*usd\b', r'\bxau\b',
        r'\bbullion\b', r'\bprecious\s*metal\b', r'\bmetals\b'
    ]
    for pattern in gold_patterns:
        if re.search(pattern, clean_text):
            return "GOLD"

    # 5. AAPL patterns
    aapl_patterns = [
        r'\baapl\b', r'\bapple\b', r'\bapple\s*stock\b', r'\btech\s*stock\b', r'\bshares\b',
        r'\bnasdaq\b'
    ]
    for pattern in aapl_patterns:
        if re.search(pattern, clean_text):
            return "AAPL"

    return fallback


def extract_side_from_reason(reason: str) -> Optional[str]:
    if not reason:
        return None
    clean_text = " " + reason.lower() + " "
    buy_matches = len(re.findall(r'\b(buy|long|call|bounce|breakout|bull|bullish|dip|upside|support|rally)\b', clean_text))
    sell_matches = len(re.findall(r'\b(sell|short|put|breakdown|drop|dump|bear|bearish|downside|resistance|fade)\b', clean_text))

    if buy_matches > sell_matches:
        return "BUY"
    elif sell_matches > buy_matches:
        return "SELL"
    return None


def suggest_instrument_from_trends(db: Session, target_instrument: Optional[str] = None) -> tuple[str, float]:
    """Pick the instrument with the strongest current sentiment signal or analyze specific instrument."""
    instruments = ["AAPL", "EURUSD", "GBPUSD", "GOLD", "BTCUSD"]

    # Ensure sentiment records exist
    sample_count = db.query(SentimentData).count()
    if sample_count == 0:
        SentimentAnalyzer.generate_sentiments(db)

    # If target_instrument is provided and valid, analyze that specific instrument
    if target_instrument and target_instrument.upper() in instruments:
        clean_target = target_instrument.upper()
        sentiment = db.query(SentimentData).filter(
            SentimentData.instrument == clean_target
        ).order_by(SentimentData.timestamp.desc()).first()
        score = sentiment.sentiment_score if sentiment else 0.0
        return clean_target, score

    # Otherwise scan all instruments for highest absolute sentiment/trend momentum
    best_instrument = "AAPL"
    best_abs_score = -1.0
    best_raw_score = 0.0

    for instrument in instruments:
        sentiment = db.query(SentimentData).filter(
            SentimentData.instrument == instrument
        ).order_by(SentimentData.timestamp.desc()).first()
        score = sentiment.sentiment_score if sentiment else 0.0
        abs_score = abs(score)
        if abs_score > best_abs_score:
            best_abs_score = abs_score
            best_raw_score = score
            best_instrument = instrument

    return best_instrument, best_raw_score


def build_reason_feedback(
    accepted_reason: bool,
    instrument: str,
    sentiment_score: float,
    mode: str = "custom",
    side: str = "BUY",
) -> tuple[str, str, List[str]]:
    direction = "bullish (long)" if side == "BUY" else "bearish (short)"
    sentiment_state = "bullish" if sentiment_score > 0.15 else ("bearish" if sentiment_score < -0.15 else "neutral")

    if mode == "trends":
        feedback = (
            f"AI Coach analyzed {instrument} momentum (sentiment: {sentiment_score:+.2f} {sentiment_state}) and built a disciplined {direction} trend setup."
        )
        suggested_reason = (
            f"{instrument} {direction} trend setup aligned with live {sentiment_state} sentiment ({sentiment_score:+.2f}) and controlled 1.8:1 risk-reward structure."
        )
        notes = [
            f"{instrument} trend signal: {sentiment_score:+.2f} ({sentiment_state.upper()}).",
            f"Direction is set to {side} with calibrated stop-loss and take-profit targets.",
            "Position sizing kept within 1% risk budget for maximum discipline.",
        ]
        return feedback, suggested_reason, notes

    if accepted_reason:
        feedback = (
            f"Great trade thesis! I structured a disciplined {instrument} {side} plan with defined risk caps and clear profit targets."
        )
        suggested_reason = (
            f"Disciplined {instrument} {side} execution: Entry planned with defined stop-loss and +1.8R target, respecting risk limits."
        )
        notes = [
            f"Trade setup built around {instrument} {side}.",
            f"Current sentiment is {sentiment_score:+.2f} ({sentiment_state}), supporting a controlled execution.",
            "Stop-loss and take-profit levels maintain favorable risk-to-reward ratio.",
        ]
    else:
        feedback = (
            f"Refined your idea into a structured {instrument} {side} trade with calculated risk controls to prevent emotional trading."
        )
        suggested_reason = (
            f"{instrument} {side} setup based on current market levels, defined risk limit, and a disciplined profit target."
        )
        notes = [
            f"Matched trade context to {instrument} ({side}).",
            f"Market sentiment is {sentiment_score:+.2f} ({sentiment_state}).",
            "Rewrote trade reason to meet TradeDNA psychological risk rules.",
        ]

    return feedback, suggested_reason, notes


def build_trade_suggestion(
    db: Session,
    user: User,
    reason: str,
    side: str,
    confidence_level: Optional[int],
    mode: str = "custom",
    target_instrument: Optional[str] = None,
) -> dict:
    if mode == "trends":
        # Check if user mentioned an instrument in text or provided target_instrument
        parsed_inst = suggest_instrument_from_reason(reason or "", fallback_instrument=target_instrument)
        if reason and parsed_inst and (target_instrument is None or parsed_inst != target_instrument):
            instrument, trend_score = suggest_instrument_from_trends(db, target_instrument=parsed_inst)
        elif target_instrument and target_instrument.upper() in ["AAPL", "EURUSD", "GBPUSD", "GOLD", "BTCUSD"]:
            instrument, trend_score = suggest_instrument_from_trends(db, target_instrument=target_instrument)
        else:
            instrument, trend_score = suggest_instrument_from_trends(db)

        # Side from explicit reason or trend
        explicit_side = extract_side_from_reason(reason or "")
        if explicit_side:
            side = explicit_side
        else:
            side = "BUY" if trend_score >= 0 else "SELL"
    else:
        instrument = suggest_instrument_from_reason(reason or "", fallback_instrument=target_instrument)
        explicit_side = extract_side_from_reason(reason or "")

        sentiment_temp = db.query(SentimentData).filter(
            SentimentData.instrument == instrument
        ).order_by(SentimentData.timestamp.desc()).first()
        temp_score = sentiment_temp.sentiment_score if sentiment_temp else 0.0

        if explicit_side:
            side = explicit_side
        else:
            # If user didn't explicitly specify buy or sell in their idea, dynamically pick based on sentiment
            # instead of getting stuck on previous side
            if temp_score < -0.15:
                side = "SELL"
            elif temp_score > 0.15:
                side = "BUY"
            else:
                side = "BUY"

    market = db.query(MarketPrice).filter(
        MarketPrice.instrument == instrument
    ).order_by(MarketPrice.timestamp.desc()).first()

    if not market:
        MarketSimulator.generate_initial_prices(db)
        market = db.query(MarketPrice).filter(
            MarketPrice.instrument == instrument
        ).order_by(MarketPrice.timestamp.desc()).first()

    if not market:
        raise HTTPException(status_code=404, detail=f"Market data not found for {instrument}")

    sentiment = db.query(SentimentData).filter(
        SentimentData.instrument == instrument
    ).order_by(SentimentData.timestamp.desc()).first()

    if not sentiment:
        SentimentAnalyzer.generate_sentiments(db)
        sentiment = db.query(SentimentData).filter(
            SentimentData.instrument == instrument
        ).order_by(SentimentData.timestamp.desc()).first()

    sentiment_score = sentiment.sentiment_score if sentiment else 0.0
    if side == "BUY" and sentiment_score < -0.45 and mode != "custom":
        side = "SELL"
    elif side == "SELL" and sentiment_score > 0.45 and mode != "custom":
        side = "BUY"

    entry_price = market.ask if side == "BUY" else market.bid

    risk_budget = max(user.current_balance * 0.01, 1.0)
    if confidence_level is not None and confidence_level >= 4:
        risk_budget = max(user.current_balance * 0.0125, 1.0)
    if confidence_level is not None and confidence_level <= 2:
        risk_budget = max(user.current_balance * 0.0075, 1.0)

    stop_pct = 0.01
    if instrument == "BTCUSD":
        stop_pct = 0.018
    elif instrument in ["EURUSD", "GBPUSD"]:
        stop_pct = 0.006

    stop_distance = max(entry_price * stop_pct, 0.0001 if instrument in ["EURUSD", "GBPUSD"] else 0.01)
    quantity = max(risk_budget / stop_distance, 0.01)

    if side == "BUY":
        stop_loss = entry_price - stop_distance
        take_profit = entry_price + (stop_distance * 1.8)
    else:
        stop_loss = entry_price + stop_distance
        take_profit = entry_price - (stop_distance * 1.8)

    decimals = 4 if instrument in ["EURUSD", "GBPUSD"] else 2
    entry_price = round(entry_price, decimals)
    stop_loss = round(stop_loss, decimals)
    take_profit = round(take_profit, decimals)
    quantity = round(quantity, 2)

    validation = RiskGuardian.validate_trade(
        entry_price=entry_price,
        stop_loss=stop_loss,
        take_profit=take_profit,
        quantity=quantity,
        account_balance=user.current_balance,
        side=side,
    )

    reason_lower = (reason or "").lower().strip()
    weak_reason_markers = [
        "i want to make money",
        "highest cryptocurrency",
        "just because",
        "feels like",
        "random",
    ]
    if mode == "trends":
        accepted_reason = True
    else:
        accepted_reason = (
            not any(marker in reason_lower for marker in weak_reason_markers)
            and len((reason or "").strip()) >= 10
        )

    feedback, suggested_reason, notes = build_reason_feedback(
        accepted_reason,
        instrument,
        sentiment_score,
        mode=mode,
        side=side,
    )

    return {
        "accepted_reason": accepted_reason,
        "feedback": feedback,
        "instrument": instrument,
        "side": side,
        "entry_price": entry_price,
        "stop_loss": stop_loss,
        "take_profit": take_profit,
        "quantity": quantity,
        "amount_at_risk": validation["amount_at_risk"],
        "risk_percentage": validation["risk_percentage"],
        "risk_reward_ratio": validation["risk_reward_ratio"],
        "suggested_reason": suggested_reason,
        "notes": notes,
    }

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root(request: Request):
    payload = {
        "name": "AI Trading Simulator API",
        "status": "ok",
        "docs": "/docs",
        "health": "/health",
        "frontend": "http://localhost:3000",
        "message": "This is the API server. Open the frontend at http://localhost:3000 for the trading UI.",
    }

    accept = request.headers.get("accept", "")
    if "text/html" in accept.lower():
        return HTMLResponse(
            content=f"""
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>AI Trading Simulator API</title>
    <style>
      body {{ font-family: ui-sans-serif, system-ui, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; }}
      main {{ max-width: 720px; margin: 48px auto; padding: 32px; background: #111827; border: 1px solid #334155; border-radius: 24px; }}
      h1 {{ margin: 0 0 8px; font-size: 28px; }}
      p {{ color: #94a3b8; line-height: 1.6; }}
      .actions {{ display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }}
      a {{ display: inline-block; padding: 12px 16px; border-radius: 12px; text-decoration: none; font-weight: 700; }}
      .primary {{ background: #38bdf8; color: #0f172a; }}
      .secondary {{ background: #1e293b; color: #f8fafc; border: 1px solid #334155; }}
      code {{ background: #0f172a; padding: 2px 6px; border-radius: 6px; }}
    </style>
  </head>
  <body>
    <main>
      <h1>AI Trading Simulator API</h1>
      <p>This URL is the <strong>backend API</strong>, not the trading dashboard. The blank JSON page you may have seen is normal for API roots.</p>
      <p>Use the frontend app for login, trading, and broker demos:</p>
      <div class="actions">
        <a class="primary" href="http://localhost:3000">Open Frontend (localhost:3000)</a>
        <a class="secondary" href="/docs">API Docs</a>
        <a class="secondary" href="/health">Health Check</a>
      </div>
      <p style="margin-top:24px;font-size:14px;">Mobile Expo app connects to this API on port <code>8000</code> while the UI runs in Expo Go.</p>
    </main>
  </body>
</html>
            """,
            status_code=200,
        )

    return JSONResponse(payload)


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(status_code=204)

# Initialize database on startup
@app.on_event("startup")
def startup_event():
    init_db()
    ensure_demo_user()
    MarketSimulator.initialize_mock_data()
    print("Database initialized")
    print("Mock market data initialized")


def hash_password(password: str) -> str:
    """Hash password with SHA-256 and cryptographic salt."""
    salt = secrets.token_hex(8)
    h = hashlib.sha256((password + salt).encode('utf-8')).hexdigest()
    return f"sha256${salt}${h}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hashed string, supporting sha256 salt and legacy fallback."""
    if not hashed_password:
        return False
    if hashed_password == plain_password:
        return True
    if hashed_password.startswith("sha256$"):
        parts = hashed_password.split("$")
        if len(parts) == 3:
            salt = parts[1]
            expected_hash = parts[2]
            computed = hashlib.sha256((plain_password + salt).encode('utf-8')).hexdigest()
            return computed == expected_hash
    return False


def ensure_demo_user():
    db = SessionLocal()
    try:
        existing_user = db.query(User).filter(User.email == "demo@example.com").first()
        if existing_user:
            if not existing_user.api_key:
                existing_user.api_key = "demo_broker_tdna_001"
            if existing_user.password_hash == "password123":
                existing_user.password_hash = hash_password("password123")
            db.commit()
            return

        demo_user = User(
            username="demo_trader",
            email="demo@example.com",
            password_hash=hash_password("password123"),
            starting_balance=10000.0,
            current_balance=10000.0,
            api_key="demo_broker_tdna_001",
        )
        db.add(demo_user)
        db.commit()
        print("Demo user created with secure password hash and API key demo_broker_tdna_001")
    finally:
        db.close()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def verify_broker_key(request: Request, db: Session = Depends(get_db)) -> Optional[str]:
    """Validate X-API-Key header if supplied on broker-facing requests."""
    api_key = request.headers.get("X-API-Key") or request.headers.get("x-api-key")
    if not api_key:
        return None
    valid_keys = ["demo_broker_tdna_001", "broker_partner_key_live", "demo_key"]
    db_user = db.query(User).filter(User.api_key == api_key).first()
    if api_key not in valid_keys and not db_user:
        raise HTTPException(
            status_code=401,
            detail={"message": "Invalid Broker API Key. Access denied.", "provided_key": api_key}
        )
    return api_key


# ==================== USER ENDPOINTS ====================

@app.post("/api/users/register", response_model=UserResponse)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new user with secure password hashing"""
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = User(
        username=user.username,
        email=user.email,
        password_hash=hash_password(user.password),
        starting_balance=10000.0,
        current_balance=10000.0,
        api_key=secrets.token_hex(16),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@app.post("/api/users/login", response_model=UserResponse)
def login_user(user: UserLogin, db: Session = Depends(get_db)):
    """Login user with secure password verification"""
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.password_hash or ""):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return db_user


@app.get("/api/users/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    """Get user details"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.get("/api/users/{user_id}/risk-settings", response_model=RiskSettingsResponse)
@app.get("/api/user/{user_id}/risk-settings", response_model=RiskSettingsResponse)
def get_user_risk_settings(user_id: int, db: Session = Depends(get_db)):
    """Get personalized risk guardrail settings for a user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "user_id": user.id,
        "max_risk_pct": user.max_risk_pct if user.max_risk_pct is not None else 2.0,
        "max_trades_per_day": user.max_trades_per_day if user.max_trades_per_day is not None else 5,
        "daily_loss_limit": user.daily_loss_limit if user.daily_loss_limit is not None else 500.0,
        "min_risk_reward": user.min_risk_reward if user.min_risk_reward is not None else 1.5,
        "custom_strategy": user.custom_strategy or "General Strategy",
    }


@app.put("/api/users/{user_id}/risk-settings", response_model=RiskSettingsResponse)
@app.put("/api/user/{user_id}/risk-settings", response_model=RiskSettingsResponse)
def update_user_risk_settings(user_id: int, settings: RiskSettingsUpdate, db: Session = Depends(get_db)):
    """Update personalized risk guardrail settings for a user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if settings.max_risk_pct is not None:
        user.max_risk_pct = round(max(0.2, min(settings.max_risk_pct, 10.0)), 2)
    if settings.max_trades_per_day is not None:
        user.max_trades_per_day = max(1, min(settings.max_trades_per_day, 50))
    if settings.daily_loss_limit is not None:
        user.daily_loss_limit = round(max(10.0, settings.daily_loss_limit), 2)
    if settings.min_risk_reward is not None:
        user.min_risk_reward = round(max(0.5, min(settings.min_risk_reward, 10.0)), 2)
    if settings.custom_strategy is not None:
        user.custom_strategy = settings.custom_strategy.strip() or "General Strategy"
    
    db.commit()
    db.refresh(user)

    return {
        "user_id": user.id,
        "max_risk_pct": user.max_risk_pct,
        "max_trades_per_day": user.max_trades_per_day,
        "daily_loss_limit": user.daily_loss_limit,
        "min_risk_reward": user.min_risk_reward,
        "custom_strategy": user.custom_strategy,
    }


# ==================== POSITION ENDPOINTS ====================

@app.post("/api/positions", response_model=PositionResponse)
def open_position(position: PositionCreate, db: Session = Depends(get_db)):
    """Open a new trading position"""
    user = db.query(User).filter(User.id == position.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate trade risk with user-configured risk thresholds
    user_max_risk = user.max_risk_pct if user.max_risk_pct is not None else 2.0
    user_min_rr = user.min_risk_reward if user.min_risk_reward is not None else 1.0
    validation = RiskGuardian.validate_trade(
        entry_price=position.entry_price,
        stop_loss=position.stop_loss,
        take_profit=position.take_profit,
        quantity=position.quantity,
        account_balance=user.current_balance,
        side=position.side,
        max_risk_pct=user_max_risk,
        min_risk_reward=user_min_rr,
    )
    
    if not validation["allowed"]:
        raise HTTPException(status_code=400, detail=f"Trade validation failed: {validation['warnings']}")
    
    behavior_result = assess_behavioral_risk(
        db=db,
        user_id=position.user_id,
        instrument=position.instrument,
        side=position.side,
        amount_at_risk=validation["amount_at_risk"],
        reason=position.reason,
        followed_strategy=position.followed_strategy,
        chasing_losses=position.chasing_losses,
        confidence_level=position.confidence_level,
        session_minutes=position.session_minutes,
        trades_this_session=position.trades_this_session,
    )

    db.add(TradeCoachEvent(
        user_id=position.user_id,
        event_type="ASSESSMENT",
        instrument=position.instrument,
        risk_score=behavior_result["score"],
        intervention=behavior_result["intervention"],
        reasons=_serialize_reasons(behavior_result["reasons"]),
        notes=behavior_result["coaching_prompt"],
    ))

    if behavior_result["intervention"] == "BLOCK":
        db.add(TradeCoachEvent(
            user_id=position.user_id,
            event_type="INTERVENTION",
            instrument=position.instrument,
            risk_score=behavior_result["score"],
            intervention="BLOCK",
            reasons=_serialize_reasons(behavior_result["reasons"]),
            notes="Trade blocked by behavioral risk circuit breaker.",
        ))
        db.commit()
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Trade blocked by TradeDNA behavioral risk guard.",
                "behavior": behavior_result,
            },
        )

    if behavior_result["intervention"] == "WARN" and not position.confirm_high_risk:
        db.commit()
        raise HTTPException(
            status_code=400,
            detail={
                "message": "High behavioral risk. Confirm before placing this trade.",
                "behavior": behavior_result,
                "requires_confirmation": True,
            },
        )

    # Create position
    new_position = Position(
        user_id=position.user_id,
        instrument=position.instrument,
        entry_price=position.entry_price,
        stop_loss=position.stop_loss,
        take_profit=position.take_profit,
        quantity=position.quantity,
        side=position.side,
        amount_at_risk=validation["amount_at_risk"],
        risk_percentage=validation["risk_percentage"],
        risk_reward_ratio=validation["risk_reward_ratio"]
    )
    
    # Deduct amount at risk from balance
    user.current_balance -= validation["amount_at_risk"]

    db.add(TradeCoachEvent(
        user_id=position.user_id,
        event_type="EXECUTION",
        instrument=position.instrument,
        risk_score=behavior_result["score"],
        intervention="ALLOW",
        reasons=_serialize_reasons(behavior_result["reasons"]),
        notes="Trade executed after behavioral assessment.",
    ))
    
    db.add(new_position)
    db.commit()
    db.refresh(new_position)
    return new_position


@app.get("/api/positions/{user_id}", response_model=list[PositionResponse])
def get_user_positions(user_id: int, db: Session = Depends(get_db)):
    """Get all open positions for a user"""
    positions = db.query(Position).filter(
        Position.user_id == user_id,
        Position.is_open == True
    ).all()
    return positions


@app.post("/api/positions/{position_id}/close")
def close_position(position_id: int, closing_reason: str = "MANUAL", db: Session = Depends(get_db)):
    """Close a position"""
    position = db.query(Position).filter(Position.id == position_id).first()
    if not position:
        raise HTTPException(status_code=404, detail="Position not found")
    
    # Get current market price
    market_data = db.query(MarketPrice).filter(
        MarketPrice.instrument == position.instrument
    ).order_by(MarketPrice.timestamp.desc()).first()
    
    if market_data:
        exit_price = market_data.ask if position.side == "BUY" else market_data.bid
    else:
        exit_price = position.entry_price
    
    # Calculate P&L
    if position.side == "BUY":
        pnl = (exit_price - position.entry_price) * position.quantity
    else:
        pnl = (position.entry_price - exit_price) * position.quantity
    
    position.closed_at = datetime.utcnow()
    position.is_open = False
    position.closing_reason = closing_reason
    position.pnl = pnl
    
    # Return amount at risk to balance
    user = db.query(User).filter(User.id == position.user_id).first()
    user.current_balance += position.amount_at_risk + pnl
    
    # Create trade record
    trade = Trade(
        user_id=position.user_id,
        instrument=position.instrument,
        entry_price=position.entry_price,
        exit_price=exit_price,
        quantity=position.quantity,
        side=position.side,
        pnl=pnl,
        pnl_percentage=(pnl / position.amount_at_risk * 100) if position.amount_at_risk > 0 else 0,
        closed_at=datetime.utcnow(),
        status="CLOSED"
    )
    db.add(trade)
    
    db.commit()
    db.refresh(position)
    return {"status": "closed", "pnl": pnl, "exit_price": exit_price}


# ==================== MARKET DATA ENDPOINTS ====================

@app.get("/api/market/price/{instrument}", response_model=MarketPriceResponse)
def get_market_price(instrument: str, db: Session = Depends(get_db)):
    """Get current market price for instrument"""
    market_data = db.query(MarketPrice).filter(
        MarketPrice.instrument == instrument
    ).order_by(MarketPrice.timestamp.desc()).first()
    
    if not market_data:
        raise HTTPException(status_code=404, detail="Market data not found")
    
    return market_data


@app.get("/api/market/prices")
def get_all_market_prices(db: Session = Depends(get_db)):
    """Get latest prices for all instruments"""
    instruments = ["AAPL", "EURUSD", "GBPUSD", "GOLD", "BTCUSD"]
    latest_prices = {}
    
    for instrument in instruments:
        latest = db.query(MarketPrice).filter(
            MarketPrice.instrument == instrument
        ).order_by(MarketPrice.timestamp.desc()).first()
        
        if latest:
            latest_prices[instrument] = {
                "bid": latest.bid,
                "ask": latest.ask,
                "last_price": latest.last_price,
                "timestamp": latest.timestamp
            }
    
    return latest_prices


@app.post("/api/market/update-prices")
def update_market_prices(db: Session = Depends(get_db)):
    """Simulate market price updates"""
    MarketSimulator.update_prices(db)
    return {"status": "prices updated"}


# ==================== SENTIMENT ENDPOINTS ====================

@app.get("/api/sentiment/{instrument}", response_model=SentimentResponse)
def get_sentiment(instrument: str, db: Session = Depends(get_db)):
    """Get latest sentiment for instrument"""
    sentiment = db.query(SentimentData).filter(
        SentimentData.instrument == instrument
    ).order_by(SentimentData.timestamp.desc()).first()
    
    if not sentiment:
        raise HTTPException(status_code=404, detail="Sentiment data not found")
    
    return sentiment


@app.post("/api/sentiment/update")
def update_sentiments(db: Session = Depends(get_db)):
    """Update sentiment data for all instruments"""
    SentimentAnalyzer.generate_sentiments(db)
    return {"status": "sentiment data updated"}


# ==================== RISK VALIDATION ENDPOINTS ====================

@app.post("/api/risk/validate", response_model=RiskValidationResponse)
def validate_trade(
    entry_price: float,
    stop_loss: float,
    take_profit: float,
    quantity: float,
    account_balance: float,
    side: str = "BUY"
):
    """Validate trade before opening"""
    result = RiskGuardian.validate_trade(
        entry_price=entry_price,
        stop_loss=stop_loss,
        take_profit=take_profit,
        quantity=quantity,
        account_balance=account_balance,
        side=side
    )
    return result


@app.post("/api/risk/pretrade-assess", response_model=BehavioralRiskResponse)
def pretrade_assess_risk(payload: BehavioralRiskRequest, db: Session = Depends(get_db), _api_key: Optional[str] = Depends(verify_broker_key)):
    """Behavior-aware pre-trade assessment for TradeDNA."""
    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    result = assess_behavioral_risk(
        db=db,
        user_id=payload.user_id,
        instrument=payload.instrument,
        side=payload.side,
        amount_at_risk=payload.amount_at_risk,
        reason=payload.reason,
        followed_strategy=payload.followed_strategy,
        chasing_losses=payload.chasing_losses,
        confidence_level=payload.confidence_level,
        session_minutes=payload.session_minutes,
        trades_this_session=payload.trades_this_session,
    )

    db.add(TradeCoachEvent(
        user_id=payload.user_id,
        event_type="ASSESSMENT",
        instrument=payload.instrument,
        risk_score=result["score"],
        intervention=result["intervention"],
        reasons=_serialize_reasons(result["reasons"]),
        notes=result["coaching_prompt"],
    ))
    db.commit()
    return result


@app.post("/api/risk/suggest-trade", response_model=TradeSuggestionResponse)
def suggest_trade(payload: TradeSuggestionRequest, db: Session = Depends(get_db), _api_key: Optional[str] = Depends(verify_broker_key)):
    """AI coach suggestion endpoint that evaluates reason and auto-builds trade inputs."""
    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    suggestion = build_trade_suggestion(
        db=db,
        user=user,
        reason=payload.reason or "",
        side=payload.side or "BUY",
        confidence_level=payload.confidence_level,
        mode=(payload.mode or "custom").lower(),
        target_instrument=payload.instrument,
    )

    db.add(TradeCoachEvent(
        user_id=payload.user_id,
        event_type="ASSESSMENT",
        instrument=suggestion["instrument"],
        risk_score=None,
        intervention="ALLOW",
        reasons="AI Coach suggestion generated",
        notes=suggestion["feedback"],
    ))
    db.commit()
    return suggestion


# ==================== PORTFOLIO ENDPOINTS ====================

@app.get("/api/portfolio/{user_id}")
def get_portfolio(user_id: int, db: Session = Depends(get_db)):
    """Get user portfolio summary"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    open_positions = db.query(Position).filter(
        Position.user_id == user_id,
        Position.is_open == True
    ).all()
    
    closed_trades = db.query(Trade).filter(
        Trade.user_id == user_id,
        Trade.status == "CLOSED"
    ).all()
    
    total_pnl = sum([trade.pnl for trade in closed_trades if trade.pnl])
    winning_trades = len([t for t in closed_trades if t.pnl and t.pnl > 0])
    losing_trades = len([t for t in closed_trades if t.pnl and t.pnl < 0])
    
    return {
        "user_id": user_id,
        "current_balance": user.current_balance,
        "starting_balance": user.starting_balance,
        "total_pnl": total_pnl,
        "win_rate": f"{(winning_trades / len(closed_trades) * 100):.2f}%" if closed_trades else "0%",
        "total_trades": len(closed_trades),
        "open_positions": len(open_positions),
        "winning_trades": winning_trades,
        "losing_trades": losing_trades
    }


@app.get("/api/trades/{user_id}")
def get_user_trades(user_id: int, db: Session = Depends(get_db)):
    """Get all trades for a user"""
    trades = db.query(Trade).filter(Trade.user_id == user_id).order_by(Trade.closed_at.desc()).all()
    return trades


@app.get("/api/coach/events/{user_id}", response_model=list[TradeCoachEventResponse])
def get_coach_events(user_id: int, db: Session = Depends(get_db), _api_key: Optional[str] = Depends(verify_broker_key)):
    """Get TradeDNA coach events for a user."""
    events = db.query(TradeCoachEvent).filter(
        TradeCoachEvent.user_id == user_id
    ).order_by(TradeCoachEvent.created_at.desc()).all()
    return events


@app.get("/api/analytics/{user_id}", response_model=TradeAnalyticsResponse)
def get_trade_analytics(user_id: int, db: Session = Depends(get_db), _api_key: Optional[str] = Depends(verify_broker_key)):
    """Return lightweight TradeDNA analytics for the user."""
    trades = db.query(Trade).filter(
        Trade.user_id == user_id,
        Trade.status == "CLOSED"
    ).order_by(Trade.closed_at.desc()).all()

    total_trades = len(trades)
    winning_trades = len([trade for trade in trades if trade.pnl and trade.pnl > 0])
    total_pnl = sum([trade.pnl or 0 for trade in trades])
    avg_pnl = (total_pnl / total_trades) if total_trades else 0

    best_hour = None
    worst_hour = None
    hourly_performance: Dict[int, List[float]] = {}
    trades_by_instrument: Dict[str, int] = {}
    hold_minutes: List[float] = []

    for trade in trades:
        if trade.closed_at:
            hour = trade.closed_at.hour
            hourly_performance.setdefault(hour, []).append(trade.pnl or 0)
        trades_by_instrument[trade.instrument] = trades_by_instrument.get(trade.instrument, 0) + 1
        if trade.opened_at and trade.closed_at:
            hold_minutes.append((trade.closed_at - trade.opened_at).total_seconds() / 60)

    if hourly_performance:
        best_hour = max(hourly_performance.items(), key=lambda item: sum(item[1]) / len(item[1]))[0]
        worst_hour = min(hourly_performance.items(), key=lambda item: sum(item[1]) / len(item[1]))[0]

    loss_streak = 0
    for trade in trades:
        if trade.pnl is not None and trade.pnl < 0:
            loss_streak += 1
        else:
            break

    return {
        "total_trades": total_trades,
        "win_rate": f"{(winning_trades / total_trades * 100):.2f}%" if total_trades else "0%",
        "total_pnl": round(total_pnl, 2),
        "avg_pnl": round(avg_pnl, 2),
        "best_hour": best_hour,
        "worst_hour": worst_hour,
        "avg_hold_minutes": round(sum(hold_minutes) / len(hold_minutes), 2) if hold_minutes else 0.0,
        "loss_streak": loss_streak,
        "trades_by_instrument": trades_by_instrument,
    }


@app.get("/api/broker/demo-config", response_model=BrokerDemoConfigResponse)
def get_broker_demo_config():
    """Return a demo broker API mode configuration for the TradeDNA B2B pitch."""
    return {
        "api_key": "demo_broker_tdna_001",
        "base_url": "/api/proxy",
        "endpoints": [
            "POST /api/risk/suggest-trade",
            "POST /api/risk/pretrade-assess",
            "GET /api/coach/events/{user_id}",
            "GET /api/analytics/{user_id}",
        ],
        "notes": [
            "Demo-only broker mode for presentations.",
            "Designed as a pre-trade risk and behavior API.",
            "Can later be swapped for per-broker API keys and tenant isolation.",
        ],
    }


# ==================== HEALTH CHECK ====================

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "running", "timestamp": datetime.utcnow()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, access_log=False, log_level="warning")
