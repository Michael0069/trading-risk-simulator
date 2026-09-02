"""
Mock Sentiment Analysis Engine
Simulates AI sentiment analysis for trading instruments
"""

import random
from datetime import datetime
from sqlalchemy.orm import Session
from models import SentimentData


class SentimentAnalyzer:
    """Simulates sentiment analysis from news sources"""
    
    # Mock news summaries for each instrument
    MOCK_NEWS = {
        "AAPL": [
            "Apple reports strong Q4 earnings, beating analyst expectations",
            "iPhone 16 sales show mixed signals as competition intensifies",
            "Apple's AI initiatives gaining traction with developers",
            "Supply chain concerns impact Apple's production capacity",
            "Apple announces new services driving recurring revenue growth"
        ],
        "EURUSD": [
            "ECB holds rates steady, signals future rate cuts",
            "European inflation shows signs of cooling",
            "USD strengthens on US economic resilience",
            "Euro faces headwinds from geopolitical tensions",
            "ECB ready to support eurozone recovery"
        ],
        "GBPUSD": [
            "Bank of England maintains hawkish stance on rates",
            "UK inflation remains above central bank targets",
            "British pound supported by strong economic data",
            "Brexit impacts continue to weigh on sterling",
            "BoE expected to hold rates through Q1"
        ],
        "GOLD": [
            "Gold reaches new highs amid inflation concerns",
            "Central banks continue accumulating gold reserves",
            "US dollar weakness supports gold prices",
            "Safe-haven demand drives precious metals rally",
            "Fed rate cut expectations boost gold sentiment"
        ],
        "BTCUSD": [
            "Bitcoin surges as institutional adoption accelerates",
            "Crypto market shows increased correlation with tech stocks",
            "Bitcoin halving cycle entering crucial phase",
            "Regulatory clarity improving investor confidence",
            "Bitcoin breaks through key resistance levels"
        ]
    }
    
    @staticmethod
    def generate_sentiment_score(instrument: str) -> tuple[float, str]:
        """
        Generate realistic sentiment score (-1 to 1)
        Returns: (score, label)
        """
        # Base sentiment tendency for each instrument (for demo purposes)
        base_sentiment = {
            "AAPL": 0.3,      # Slightly bullish
            "EURUSD": 0.1,    # Neutral
            "GBPUSD": 0.15,   # Slightly bullish
            "GOLD": 0.4,      # Bullish (typically in uncertain times)
            "BTCUSD": 0.5     # Very bullish (rising trend)
        }
        
        base = base_sentiment.get(instrument, 0.0)
        
        # Add random noise to simulate volatility
        noise = random.uniform(-0.3, 0.3)
        score = max(-1.0, min(1.0, base + noise))
        
        # Classify sentiment
        if score < -0.3:
            label = "NEGATIVE"
        elif score > 0.3:
            label = "POSITIVE"
        else:
            label = "NEUTRAL"
        
        return round(score, 2), label
    
    @staticmethod
    def get_mock_summary(instrument: str) -> str:
        """Get a random mock news summary for instrument"""
        news_list = SentimentAnalyzer.MOCK_NEWS.get(instrument, ["Market update"])
        return random.choice(news_list)
    
    @staticmethod
    def generate_sentiments(db: Session):
        """Generate sentiment data for all instruments"""
        instruments = ["AAPL", "EURUSD", "GBPUSD", "GOLD", "BTCUSD"]
        
        for instrument in instruments:
            score, label = SentimentAnalyzer.generate_sentiment_score(instrument)
            summary = SentimentAnalyzer.get_mock_summary(instrument)
            
            sentiment = SentimentData(
                instrument=instrument,
                sentiment_score=score,
                sentiment_label=label,
                summary=summary,
                source="AI Sentiment Engine (Mock)",
                timestamp=datetime.utcnow()
            )
            
            db.add(sentiment)
        
        db.commit()
        print(f"Generated sentiment data at {datetime.utcnow()}")
    
    @staticmethod
    def get_sentiment_summary(db: Session, instrument: str) -> dict:
        """Get sentiment summary for an instrument"""
        sentiment = db.query(SentimentData).filter(
            SentimentData.instrument == instrument
        ).order_by(SentimentData.timestamp.desc()).first()
        
        if sentiment:
            return {
                "instrument": instrument,
                "score": sentiment.sentiment_score,
                "label": sentiment.sentiment_label,
                "summary": sentiment.summary,
                "timestamp": sentiment.timestamp
            }
        
        return None
