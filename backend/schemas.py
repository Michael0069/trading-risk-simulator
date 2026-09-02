from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List


class UserCreate(BaseModel):
    username: str
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    starting_balance: float
    current_balance: float
    total_trades: int
    winning_trades: int
    losing_trades: int
    max_risk_pct: Optional[float] = 2.0
    max_trades_per_day: Optional[int] = 5
    daily_loss_limit: Optional[float] = 500.0
    min_risk_reward: Optional[float] = 1.5
    custom_strategy: Optional[str] = "General Strategy"
    created_at: datetime

    class Config:
        from_attributes = True


class PositionCreate(BaseModel):
    user_id: int
    instrument: str
    entry_price: float
    stop_loss: float
    take_profit: float
    quantity: float
    side: str  # BUY or SELL
    reason: Optional[str] = None
    followed_strategy: Optional[bool] = None
    chasing_losses: Optional[bool] = None
    confidence_level: Optional[int] = None
    session_minutes: Optional[int] = None
    trades_this_session: Optional[int] = None
    confirm_high_risk: Optional[bool] = False


class PositionResponse(BaseModel):
    id: int
    user_id: int
    instrument: str
    entry_price: float
    stop_loss: float
    take_profit: float
    quantity: float
    side: str
    amount_at_risk: float
    risk_percentage: float
    risk_reward_ratio: float
    opened_at: datetime
    closed_at: Optional[datetime]
    is_open: bool
    closing_reason: Optional[str]
    pnl: Optional[float]

    class Config:
        from_attributes = True


class TradeResponse(BaseModel):
    id: int
    user_id: int
    instrument: str
    entry_price: float
    exit_price: Optional[float]
    quantity: float
    side: str
    pnl: Optional[float]
    pnl_percentage: Optional[float]
    opened_at: datetime
    closed_at: Optional[datetime]
    status: str

    class Config:
        from_attributes = True


class MarketPriceResponse(BaseModel):
    id: int
    instrument: str
    bid: float
    ask: float
    last_price: float
    timestamp: datetime
    high: Optional[float]
    low: Optional[float]
    volume: Optional[float]

    class Config:
        from_attributes = True


class SentimentResponse(BaseModel):
    id: int
    instrument: str
    sentiment_score: float
    sentiment_label: str
    summary: str
    source: str
    timestamp: datetime

    class Config:
        from_attributes = True


class RiskValidationResponse(BaseModel):
    allowed: bool
    amount_at_risk: float
    risk_percentage: float
    potential_reward: float
    risk_reward_ratio: float
    warnings: List[str]


class BehavioralRiskRequest(BaseModel):
    user_id: int
    instrument: str
    side: str
    amount_at_risk: float
    reason: Optional[str] = None
    followed_strategy: Optional[bool] = None
    chasing_losses: Optional[bool] = None
    confidence_level: Optional[int] = None
    session_minutes: Optional[int] = None
    trades_this_session: Optional[int] = None


class BehavioralRiskResponse(BaseModel):
    score: float
    risk_level: str
    intervention: str
    cooldown_minutes: int
    reasons: List[str]
    coaching_prompt: str


class TradeSuggestionRequest(BaseModel):
    user_id: int
    instrument: Optional[str] = None
    reason: Optional[str] = ""
    side: Optional[str] = "BUY"
    confidence_level: Optional[int] = 3
    session_minutes: Optional[int] = 30
    trades_this_session: Optional[int] = 1
    mode: Optional[str] = "custom"  # custom | trends


class TradeSuggestionResponse(BaseModel):
    accepted_reason: bool
    feedback: str
    instrument: str
    side: str
    entry_price: float
    stop_loss: float
    take_profit: float
    quantity: float
    amount_at_risk: float
    risk_percentage: float
    risk_reward_ratio: float
    suggested_reason: str
    notes: List[str]


class TradeCoachEventResponse(BaseModel):
    id: int
    user_id: int
    event_type: str
    instrument: Optional[str]
    risk_score: Optional[float]
    intervention: Optional[str]
    reasons: Optional[str]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class TradeAnalyticsResponse(BaseModel):
    total_trades: int
    win_rate: str
    total_pnl: float
    avg_pnl: float
    best_hour: Optional[int]
    worst_hour: Optional[int]
    avg_hold_minutes: float
    loss_streak: int
    trades_by_instrument: dict


class BrokerDemoConfigResponse(BaseModel):
    api_key: str
    base_url: str
    endpoints: List[str]
    notes: List[str]


class RiskSettingsUpdate(BaseModel):
    max_risk_pct: Optional[float] = 2.0
    max_trades_per_day: Optional[int] = 5
    daily_loss_limit: Optional[float] = 500.0
    min_risk_reward: Optional[float] = 1.5
    custom_strategy: Optional[str] = "General Strategy"


class RiskSettingsResponse(BaseModel):
    user_id: int
    max_risk_pct: float
    max_trades_per_day: int
    daily_loss_limit: float
    min_risk_reward: float
    custom_strategy: str

