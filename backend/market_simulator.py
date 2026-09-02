"""
Mock Market Data Simulator
Generates realistic OHLCV data and price movements
"""

import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from models import MarketPrice

class MarketSimulator:
    """Simulates realistic market data"""
    
    # Initial prices for mock instruments
    INITIAL_PRICES = {
        "AAPL": 185.50,
        "EURUSD": 1.0950,
        "GBPUSD": 1.2750,
        "GOLD": 2350.00,
        "BTCUSD": 67500.00
    }
    
    # Store current prices to maintain state
    current_prices = {}
    
    @classmethod
    def initialize_mock_data(cls, db: Session = None):
        """Initialize mock market data"""
        cls.current_prices = cls.INITIAL_PRICES.copy()
    
    @classmethod
    def get_realistic_price_move(cls, current_price: float, instrument: str, sentiment_score: float = 0.0) -> tuple[float, float]:
        """
        Generate realistic per-tick price movement with sentiment-driven trend momentum.
        Returns: (new_price, volatility_factor)
        """
        # Per-5-second tick volatility (realistic micro-swings)
        volatility_map = {
            "AAPL": 0.0018,    # 0.18% per tick
            "EURUSD": 0.0006,  # 0.06% per tick
            "GBPUSD": 0.0007,  # 0.07% per tick
            "GOLD": 0.0014,    # 0.14% per tick
            "BTCUSD": 0.0035   # 0.35% per tick
        }
        
        base_volatility = volatility_map.get(instrument, 0.0015)
        
        # Calculate directional bias based on sentiment score (-1.0 to +1.0)
        # Positive sentiment gives strong upward drift; negative gives downward drift
        up_probability = 0.50
        if sentiment_score > 0.05:
            up_probability = min(0.82, 0.52 + (sentiment_score * 0.35))
        elif sentiment_score < -0.05:
            up_probability = max(0.18, 0.48 - (abs(sentiment_score) * 0.35))
        
        move_direction = 1 if random.random() < up_probability else -1
        
        # Add sentiment momentum drift
        drift_bias = sentiment_score * base_volatility * 0.5
        random_shock = random.uniform(0.1, 1.0) * base_volatility * move_direction
        move_percentage = random_shock + drift_bias
        
        move_amount = current_price * move_percentage
        new_price = max(0.0001, current_price + move_amount)
        
        decimals = 4 if instrument in ["EURUSD", "GBPUSD"] else 2
        return round(new_price, decimals), abs(move_percentage)
    
    @classmethod
    def generate_bid_ask_spread(cls, price: float, instrument: str) -> tuple[float, float]:
        """
        Generate realistic bid-ask spread
        Returns: (bid, ask)
        """
        spread_map = {
            "AAPL": 0.02,
            "EURUSD": 0.0002,
            "GBPUSD": 0.0003,
            "GOLD": 0.30,
            "BTCUSD": 8.00
        }
        
        spread = spread_map.get(instrument, 0.01)
        decimals = 4 if instrument in ["EURUSD", "GBPUSD"] else 2
        bid = round(price - (spread / 2), decimals)
        ask = round(price + (spread / 2), decimals)
        
        return bid, ask
    
    @classmethod
    def update_prices(cls, db: Session):
        """Update all market prices in database with sentiment alignment"""
        from models import SentimentData
        instruments = ["AAPL", "EURUSD", "GBPUSD", "GOLD", "BTCUSD"]
        
        for instrument in instruments:
            # Query active sentiment score
            sentiment = db.query(SentimentData).filter(
                SentimentData.instrument == instrument
            ).order_by(SentimentData.timestamp.desc()).first()
            
            score = sentiment.sentiment_score if sentiment else 0.0
            
            current = cls.current_prices.get(instrument, cls.INITIAL_PRICES[instrument])
            new_price, _ = cls.get_realistic_price_move(current, instrument, sentiment_score=score)
            cls.current_prices[instrument] = new_price
            
            bid, ask = cls.generate_bid_ask_spread(new_price, instrument)
            
            # Store in database
            market_price = MarketPrice(
                instrument=instrument,
                bid=bid,
                ask=ask,
                last_price=new_price,
                timestamp=datetime.utcnow(),
                volume=random.uniform(1000000, 10000000)
            )
            
            db.add(market_price)
        
        db.commit()
        cls.check_and_close_positions(db)
    
    @classmethod
    def get_current_price(cls, instrument: str) -> float:
        """Get current price for instrument"""
        return cls.current_prices.get(instrument, cls.INITIAL_PRICES.get(instrument, 0))
    
    @classmethod
    def check_and_close_positions(cls, db: Session):
        """
        Check if any positions hit their stop loss or take profit
        This should be called periodically
        """
        from models import Position
        
        open_positions = db.query(Position).filter(Position.is_open == True).all()
        
        for position in open_positions:
            current_price = cls.get_current_price(position.instrument)
            
            # BUY position checks
            if position.side == "BUY":
                # Hit stop loss?
                if current_price <= position.stop_loss:
                    close_position_sl(db, position, current_price, "STOP_LOSS")
                # Hit take profit?
                elif current_price >= position.take_profit:
                    close_position_tp(db, position, current_price, "TAKE_PROFIT")
            
            # SELL position checks
            else:  # SELL
                # Hit stop loss?
                if current_price >= position.stop_loss:
                    close_position_sl(db, position, current_price, "STOP_LOSS")
                # Hit take profit?
                elif current_price <= position.take_profit:
                    close_position_tp(db, position, current_price, "TAKE_PROFIT")


def close_position_sl(db: Session, position, exit_price: float, reason: str):
    """Close position at stop loss"""
    from models import Trade, User
    
    position.is_open = False
    position.closed_at = datetime.utcnow()
    position.closing_reason = reason
    
    if position.side == "BUY":
        pnl = (exit_price - position.entry_price) * position.quantity
    else:
        pnl = (position.entry_price - exit_price) * position.quantity
    
    position.pnl = pnl
    
    user = db.query(User).filter(User.id == position.user_id).first()
    user.current_balance += position.amount_at_risk + pnl
    user.losing_trades += 1
    
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


def close_position_tp(db: Session, position, exit_price: float, reason: str):
    """Close position at take profit"""
    from models import Trade, User
    
    position.is_open = False
    position.closed_at = datetime.utcnow()
    position.closing_reason = reason
    
    if position.side == "BUY":
        pnl = (exit_price - position.entry_price) * position.quantity
    else:
        pnl = (position.entry_price - exit_price) * position.quantity
    
    position.pnl = pnl
    
    user = db.query(User).filter(User.id == position.user_id).first()
    user.current_balance += position.amount_at_risk + pnl
    user.winning_trades += 1
    
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
