# Configuration Management - Environment Variables

## 🎯 Overview
All hardcoded values have been abstracted into environment variables for easier high-level management. Update pricing, features, and system behavior through the `.env` file.

## 📋 Key Configurable Variables

### 💰 Subscription & Pricing
```bash
# Subscription Configuration
SUBSCRIPTION_TRIAL_DAYS=7              # Free trial period
SUBSCRIPTION_CURRENCY=usd              # Payment currency
SUBSCRIPTION_ENABLE_TRIALS=true        # Enable/disable trials

# Stripe Product IDs
STRIPE_PLUS_PLAN_PRICE_ID=price_...    # Plus plan price ID
STRIPE_PREMIUM_PLAN_PRICE_ID=price_... # Premium plan price ID  
STRIPE_ENTERPRISE_PLAN_PRICE_ID=price_... # Enterprise plan price ID

# Commission & Fees (Currently set to 0 for subscription-only model)
PAYMENT_APPLICATION_FEE_PERCENT=0      # Platform commission rate
PLATFORM_FEE_ENABLED=false            # Enable/disable platform fees
COMMISSION_RATE=0.00                   # Commission percentage
```

### 🚦 Rate Limiting & Performance
```bash
# Rate Limiting Configuration
RATE_LIMIT_WINDOW_MS=900000           # Rate limit window (15 minutes)
RATE_LIMIT_MAX_REQUESTS=100           # Default max requests
RATE_LIMIT_PROD_MAX_REQUESTS=100      # Production max requests
RATE_LIMIT_DEV_MAX_REQUESTS=1000      # Development max requests

# Request Size Limits
REQUEST_SIZE_LIMIT=10mb               # JSON body size limit
REQUEST_URL_LIMIT=10mb                # URL encoded body limit
```

### 📊 Analytics & Business
```bash
# Analytics Configuration
DEFAULT_ANALYTICS_PERIOD_DAYS=30      # Default analytics period
MAX_ANALYTICS_PERIOD_DAYS=365         # Maximum analytics period

# Business Information
BUSINESS_NAME=SalonTime                # Company name
SUPPORT_EMAIL=support@salontime.app    # Support contact
COMPANY_ADDRESS="123 Business St..."   # Business address
```

### 📅 Booking System
```bash
# Booking Configuration
MAX_ADVANCE_BOOKING_DAYS=90           # How far ahead clients can book
MIN_ADVANCE_BOOKING_HOURS=2           # Minimum advance notice required
DEFAULT_BOOKING_DURATION_MINUTES=60   # Default appointment length
MAX_BOOKING_DURATION_MINUTES=480      # Maximum appointment length (8 hours)
```

### 🔐 Security Settings
```bash
# Security Configuration
JWT_EXPIRY=24h                        # JWT token expiry
REFRESH_TOKEN_EXPIRY=30d              # Refresh token expiry
BCRYPT_SALT_ROUNDS=12                 # Password hashing rounds
```

### 🎛️ Feature Flags
```bash
# Feature Toggles (defaults to true if not specified)
ENABLE_EMAIL_NOTIFICATIONS=true       # Email system
ENABLE_ANALYTICS=true                 # Analytics features
ENABLE_SUBSCRIPTIONS=true             # Subscription system
ENABLE_WEBHOOKS=true                  # Webhook processing
```

## 🔧 Usage in Code

### Import Configuration
```javascript
const config = require('./config');

// Access configuration values
const trialDays = config.subscription.trial_days;
const businessName = config.business.name;
const maxRequests = config.rateLimit.max_requests;
```

### Configuration Validation
```javascript
// Validate required environment variables
config.validate(); // Throws error if required vars missing

// Check environment
if (config.isDevelopment()) {
  // Development-specific logic
}
```

## 🔄 Quick Configuration Changes

### Change Trial Period
```bash
# .env file
SUBSCRIPTION_TRIAL_DAYS=14  # Change from 7 to 14 days
```

### Adjust Rate Limiting
```bash
# .env file
RATE_LIMIT_MAX_REQUESTS=200          # Increase limit
RATE_LIMIT_WINDOW_MS=600000          # Change to 10 minutes
```

### Update Business Information
```bash
# .env file
BUSINESS_NAME="My Salon Platform"
SUPPORT_EMAIL=help@mysalon.com
```

### Enable Commission (if needed in future)
```bash
# .env file
PLATFORM_FEE_ENABLED=true
COMMISSION_RATE=0.05                 # 5% commission
PAYMENT_APPLICATION_FEE_PERCENT=5
```

## 📊 Revenue Model Configuration

### Current: Subscription-Only Model
```bash
PLATFORM_FEE_ENABLED=false           # No transaction fees
COMMISSION_RATE=0.00                 # Zero commission
PAYMENT_APPLICATION_FEE_PERCENT=0    # No application fees
```

### Future: Commission-Based Model
```bash
PLATFORM_FEE_ENABLED=true            # Enable transaction fees
COMMISSION_RATE=0.05                 # 5% commission
PAYMENT_APPLICATION_FEE_PERCENT=5     # 5% application fee
```

## 📋 Configuration Files Structure

```
src/
├── config/
│   ├── index.js          # Main configuration module
│   ├── database.js       # Database configuration
│   └── stripe.js         # Stripe configuration (updated)
├── controllers/          # Updated to use config
├── services/            # Updated to use config
└── app.js              # Updated to use config
```

## ✅ Benefits

1. **Centralized Management**: All settings in one place
2. **Environment-Specific**: Different configs for dev/staging/prod
3. **Easy Updates**: Change pricing without code changes
4. **Feature Toggles**: Enable/disable features dynamically
5. **Validation**: Automatic validation of required variables
6. **Type Safety**: Proper type conversion (numbers, booleans)

## 🚀 Next Steps

1. **Update .env file** with your desired values
2. **Test configuration** with `node test-config.js`
3. **Deploy changes** to update system behavior
4. **Monitor metrics** to validate configuration changes

---

**Note**: This configuration system makes the SalonTime backend highly configurable without requiring code changes for common business parameter adjustments.

