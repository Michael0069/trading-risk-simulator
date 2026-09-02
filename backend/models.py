from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, ForeignKey, text
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from datetime import datetime, timezone
import os
from dotenv import load_dotenv

load_dotenv()


def utc_now():
    return datetime.now(timezone.utc)

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./trading.db")

if "postgresql" in DATABASE_URL:
    engine = create_engine(DATABASE_URL, echo=False, pool_pre_ping=True)
else:
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    starting_balance = Column(Float, default=10000.0)
    current_balance = Column(Float, default=10000.0)
    total_trades = Column(Integer, default=0)
    winning_trades = Column(Integer, default=0)
    losing_trades = Column(Integer, default=0)
    cooldown_until = Column(DateTime, nullable=True)
    api_key = Column(String, nullable=True, index=True)
    max_risk_pct = Column(Float, default=2.0)
    max_trades_per_day = Column(Integer, default=5)
    daily_loss_limit = Column(Float, default=500.0)
    min_risk_reward = Column(Float, default=1.5)
    custom_strategy = Column(String, default="General Strategy")
    created_at = Column(DateTime, default=utc_now)
    
    positions = relationship("Position", back_populates="user")
    trades = relationship("Trade", back_populates="user")


class Position(Base):
    __tablename__ = "positions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    instrument = Column(String, index=True)  # AAPL, EURUSD, GOLD, etc.
    entry_price = Column(Float)
    stop_loss = Column(Float)
    take_profit = Column(Float)
    quantity = Column(Float)
    side = Column(String)  # BUY or SELL
    amount_at_risk = Column(Float)
    risk_percentage = Column(Float)
    risk_reward_ratio = Column(Float)
    opened_at = Column(DateTime, default=utc_now)
    closed_at = Column(DateTime, nullable=True)
    is_open = Column(Boolean, default=True)
    closing_reason = Column(String, nullable=True)  # STOP_LOSS, TAKE_PROFIT, MANUAL
    pnl = Column(Float, nullable=True)
    
    user = relationship("User", back_populates="positions")


class Trade(Base):
    __tablename__ = "trades"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    instrument = Column(String)
    entry_price = Column(Float)
    exit_price = Column(Float, nullable=True)
    quantity = Column(Float)
    side = Column(String)  # BUY or SELL
    pnl = Column(Float, nullable=True)
    pnl_percentage = Column(Float, nullable=True)
    opened_at = Column(DateTime, default=utc_now)
    closed_at = Column(DateTime, nullable=True)
    status = Column(String, default="OPEN")  # OPEN, CLOSED, CANCELED
    
    user = relationship("User", back_populates="trades")


class MarketPrice(Base):
    __tablename__ = "market_prices"
    
    id = Column(Integer, primary_key=True, index=True)
    instrument = Column(String, index=True)
    bid = Column(Float)
    ask = Column(Float)
    last_price = Column(Float)
    timestamp = Column(DateTime, default=utc_now, index=True)
    high = Column(Float, nullable=True)
    low = Column(Float, nullable=True)
    volume = Column(Float, nullable=True)


class SentimentData(Base):
    __tablename__ = "sentiment_data"
    
    id = Column(Integer, primary_key=True, index=True)
    instrument = Column(String, index=True)
    sentiment_score = Column(Float)  # -1 to 1
    sentiment_label = Column(String)  # NEGATIVE, NEUTRAL, POSITIVE
    summary = Column(String)
    source = Column(String)
    timestamp = Column(DateTime, default=utc_now, index=True)


class TradeCoachEvent(Base):
    __tablename__ = "trade_coach_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    event_type = Column(String, index=True)  # ASSESSMENT, INTERVENTION, EXECUTION
    instrument = Column(String, nullable=True)
    risk_score = Column(Float, nullable=True)
    intervention = Column(String, nullable=True)  # ALLOW, WARN, BLOCK
    reasons = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=utc_now, index=True)


def init_db():
    Base.metadata.create_all(bind=engine)
    # Safe migration for existing SQLite databases
    with engine.connect() as conn:
        for column_def in [
            "cooldown_until DATETIME",
            "api_key VARCHAR",
            "max_risk_pct FLOAT DEFAULT 2.0",
            "max_trades_per_day INTEGER DEFAULT 5",
            "daily_loss_limit FLOAT DEFAULT 500.0",
            "min_risk_reward FLOAT DEFAULT 1.5",
            "custom_strategy VARCHAR DEFAULT 'General Strategy'",
        ]:
            try:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {column_def}"))
                conn.commit()
            except Exception:
                pass


if __name__ == "__main__":
    init_db()
    print("Database tables created successfully!")
