"""
Setup demo user and initial data for testing
Run this after initializing the database
"""

from models import SessionLocal, init_db, User, MarketPrice, SentimentData
from market_simulator import MarketSimulator
from sentiment_analyzer import SentimentAnalyzer
from datetime import datetime

def create_demo_user():
    """Create demo user for quick testing"""
    db = SessionLocal()
    
    # Check if demo user already exists
    existing = db.query(User).filter(User.email == "demo@example.com").first()
    if existing:
        print("Demo user already exists")
        db.close()
        return
    
    # Create demo user
    demo_user = User(
        username="demo_trader",
        email="demo@example.com",
        password_hash="password123",  # In production: hash this!
        starting_balance=10000.0,
        current_balance=10000.0
    )
    
    db.add(demo_user)
    db.commit()
    print("Demo user created successfully")
    print(f"   Email: demo@example.com")
    print(f"   Password: password123")
    print(f"   Starting Balance: GHS 10,000")
    db.close()

def initialize_market_data():
    """Initialize market prices and sentiment data"""
    db = SessionLocal()
    
    # Initialize market simulator
    MarketSimulator.initialize_mock_data()
    MarketSimulator.update_prices(db)
    
    # Generate sentiment data
    SentimentAnalyzer.generate_sentiments(db)
    
    print("Market data initialized")
    print("   - Prices updated for all 5 instruments")
    print("   - Sentiment analysis generated")
    db.close()

def main():
    print("\n" + "="*50)
    print("AI Trading Simulator - Demo Setup")
    print("="*50 + "\n")
    
    # Initialize database
    print("Initializing database...")
    init_db()
    print("Database tables created\n")
    
    # Create demo user
    print("Setting up demo user...")
    create_demo_user()
    print()
    
    # Initialize market data
    print("Initializing market data...")
    initialize_market_data()
    print()
    
    print("="*50)
    print("Setup Complete!")
    print("="*50)
    print("\nYou can now:")
    print("1. Start the backend: uvicorn main:app --reload")
    print("2. Start the frontend: npm run dev")
    print("3. Login with: demo@example.com / password123")
    print("\nHappy trading! 📈\n")

if __name__ == "__main__":
    main()
