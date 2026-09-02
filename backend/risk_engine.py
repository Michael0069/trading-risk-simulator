"""
Risk Guardian Engine
Calculates and validates trading risk metrics
"""

class RiskGuardian:
    """Calculates amount at risk, risk percentage, and R:R ratio"""
    
    @staticmethod
    def calculate_amount_at_risk(entry_price: float, stop_loss: float, quantity: float, side: str = "BUY") -> float:
        """
        Calculate Amount at Risk (AAR)
        AAR = (Entry Price - Stop Loss Price) × Quantity
        For SELL: AAR = (Stop Loss Price - Entry Price) × Quantity
        """
        if side == "BUY":
            aar = abs(entry_price - stop_loss) * quantity
        else:  # SELL
            aar = abs(stop_loss - entry_price) * quantity
        return round(aar, 2)
    
    @staticmethod
    def calculate_risk_percentage(amount_at_risk: float, account_balance: float) -> float:
        """
        Calculate Risk Percentage
        Risk % = (Amount at Risk / Account Balance) × 100
        """
        if account_balance <= 0:
            return 0
        risk_pct = (amount_at_risk / account_balance) * 100
        return round(risk_pct, 2)
    
    @staticmethod
    def calculate_reward(entry_price: float, take_profit: float, quantity: float, side: str = "BUY") -> float:
        """
        Calculate potential reward
        Reward = (Take Profit - Entry Price) × Quantity
        For SELL: Reward = (Entry Price - Take Profit) × Quantity
        """
        if side == "BUY":
            reward = abs(take_profit - entry_price) * quantity
        else:  # SELL
            reward = abs(entry_price - take_profit) * quantity
        return round(reward, 2)
    
    @staticmethod
    def calculate_risk_reward_ratio(amount_at_risk: float, potential_reward: float) -> float:
        """
        Calculate Risk to Reward Ratio
        R:R = Potential Reward / Amount at Risk
        """
        if amount_at_risk <= 0:
            return 0
        ratio = potential_reward / amount_at_risk
        return round(ratio, 2)
    
    @staticmethod
    def validate_trade(entry_price: float, stop_loss: float, take_profit: float, 
                       quantity: float, account_balance: float, side: str = "BUY",
                       max_risk_pct: float = 2.0, min_risk_reward: float = 1.0) -> dict:
        """
        Comprehensive risk validation
        Returns dict with validation results and warnings
        """
        
        # Calculate metrics
        aar = RiskGuardian.calculate_amount_at_risk(entry_price, stop_loss, quantity, side)
        risk_pct = RiskGuardian.calculate_risk_percentage(aar, account_balance)
        potential_reward = RiskGuardian.calculate_reward(entry_price, take_profit, quantity, side)
        risk_reward = RiskGuardian.calculate_risk_reward_ratio(aar, potential_reward)
        
        warnings = []
        allowed = True
        
        # Rule 1: Risk should not exceed user's configured limit
        if risk_pct > max_risk_pct:
            warnings.append(f"⚠️ Risk exceeds your {max_risk_pct}% limit (Current: {risk_pct}%)")
            allowed = False
        
        # Rule 2: Stop loss must be set
        if stop_loss is None:
            warnings.append("❌ Stop loss is required")
            allowed = False
        
        # Rule 3: Take profit must be set
        if take_profit is None:
            warnings.append("❌ Take profit is required")
            allowed = False
        
        # Rule 4: Risk:Reward check
        effective_min_rr = min_risk_reward if min_risk_reward > 0 else 1.0
        if risk_reward < effective_min_rr and risk_reward > 0:
            warnings.append(f"⚠️ Unfavorable R:R ratio ({risk_reward}:1 vs target {effective_min_rr}:1). Consider adjusting targets.")
        
        # Rule 5: Sufficient funds check
        if aar > account_balance:
            warnings.append("❌ Insufficient balance for this trade")
            allowed = False
        
        # Rule 6: Entry/SL/TP logic validation
        if side == "BUY":
            if stop_loss >= entry_price:
                warnings.append("❌ Stop loss must be below entry price for BUY")
                allowed = False
            if take_profit <= entry_price:
                warnings.append("❌ Take profit must be above entry price for BUY")
                allowed = False
        else:  # SELL
            if stop_loss <= entry_price:
                warnings.append("❌ Stop loss must be above entry price for SELL")
                allowed = False
            if take_profit >= entry_price:
                warnings.append("❌ Take profit must be below entry price for SELL")
                allowed = False
        
        return {
            "allowed": allowed,
            "amount_at_risk": aar,
            "risk_percentage": risk_pct,
            "potential_reward": potential_reward,
            "risk_reward_ratio": risk_reward,
            "warnings": warnings
        }


# Example usage
if __name__ == "__main__":
    # Example: BUY trade validation
    result = RiskGuardian.validate_trade(
        entry_price=100.0,
        stop_loss=98.0,
        take_profit=105.0,
        quantity=10,
        account_balance=5000.0,
        side="BUY"
    )
    
    print("Trade Validation Result:")
    print(f"Allowed: {result['allowed']}")
    print(f"Amount at Risk: ${result['amount_at_risk']}")
    print(f"Risk %: {result['risk_percentage']}%")
    print(f"Potential Reward: ${result['potential_reward']}")
    print(f"R:R Ratio: {result['risk_reward_ratio']}:1")
    print(f"Warnings: {result['warnings']}")
