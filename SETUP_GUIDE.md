# SalonTime Backend - Complete Setup Guide

## 🚀 Backend Implementation Complete!

Your SalonTime backend is now fully implemented with all the essential features for a production-ready salon booking and management system.

## ✅ What's Been Implemented

### 1. **Authentication System**
- **OAuth WebView Integration**: Google and Facebook authentication specifically designed for Flutter apps
- **JWT Token Management**: Access and refresh token handling
- **User Profile Management**: Complete user data handling with Supabase integration

### 2. **Salon Management**
- **Salon Registration**: Complete salon profile creation and management
- **Business Information**: Store salon details, hours, amenities, and contact info
- **Stripe Connect Integration**: Managed account creation for salon owners
- **Onboarding Flow**: WebView-ready Stripe onboarding for salon payments

### 3. **Service Management**
- **Service CRUD Operations**: Create, read, update, delete services
- **Category Management**: Organize services by categories
- **Pricing and Duration**: Flexible service pricing and time management
- **Search and Filtering**: Advanced service discovery features

### 4. **Booking System**
- **Real-time Availability**: Smart time slot calculation with conflict detection
- **Booking Management**: Complete booking lifecycle management
- **Family Member Support**: Book appointments for family members
- **Status Tracking**: Comprehensive booking status management

### 5. **Payment Processing**
- **Stripe Connect Integration**: Full payment processing with managed accounts
- **Payment Intent Creation**: Secure payment processing
- **Application Fees**: Platform commission handling (5% configurable)
- **Refund System**: Complete refund processing for salon owners
- **Payment Methods**: Save and manage customer payment methods

### 6. **Revenue Analytics**
- **Salon Dashboard**: Revenue tracking and analytics for salon owners
- **Service Performance**: Track popular services and revenue by service
- **Daily Revenue**: Time-series revenue data for charts
- **Commission Tracking**: Platform fee and net revenue calculations

### 7. **Email Notifications**
- **Booking Confirmations**: Automated confirmation emails
- **Payment Receipts**: Transaction confirmations
- **Cancellation Notices**: Booking cancellation notifications
- **Reminder System**: Appointment reminder infrastructure

### 8. **Security Features**
- **Rate Limiting**: API protection against abuse
- **CORS Configuration**: Secure cross-origin requests
- **Input Validation**: Comprehensive data validation
- **Error Handling**: Structured error responses with codes
- **JWT Authentication**: Secure token-based authentication

## 📁 Project Structure

```
salontime-backend/
├── src/
│   ├── controllers/         # Business logic
│   │   ├── authController.js       # OAuth & authentication
│   │   ├── salonController.js      # Salon management
│   │   ├── serviceController.js    # Service management
│   │   ├── bookingController.js    # Booking system
│   │   └── paymentController.js    # Payment processing
│   ├── services/           # External integrations
│   │   ├── stripeService.js       # Stripe Connect & payments
│   │   └── emailService.js        # Email notifications
│   ├── middleware/         # Express middleware
│   │   ├── auth.js               # JWT authentication
│   │   ├── errorHandler.js       # Error handling
│   │   └── logger.js             # Request logging
│   ├── config/            # Configuration
│   │   ├── database.js           # Supabase setup
│   │   └── stripe.js             # Stripe setup
│   ├── routes/            # API routes
│   │   ├── auth.js               # Authentication routes
│   │   ├── salonRoutes.js        # Salon routes
│   │   ├── serviceRoutes.js      # Service routes
│   │   ├── bookingRoutes.js      # Booking routes
│   │   └── paymentRoutes.js      # Payment routes
│   └── app.js             # Express app configuration
├── database_schema.sql     # Complete database schema
├── API_DOCUMENTATION.md    # Comprehensive API docs
├── package.json           # Dependencies
└── server.js             # Server entry point
```

## 🔧 Environment Setup

### 1. **Required Environment Variables**

Copy `.env.example` to `.env` and fill in your actual values:

```env
# Server Configuration
NODE_ENV=development
PORT=3000
API_BASE_URL=http://localhost:3000

# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Email Configuration (Optional - for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Frontend URLs
FRONTEND_URL=http://localhost:3000
FRONTEND_URLS=http://localhost:3000,http://localhost:8080
OAUTH_REDIRECT_URL=your-app://oauth-callback
```

### 2. **Supabase Setup**

1. **Create a Supabase Project**: Visit [supabase.com](https://supabase.com)
2. **Run Database Schema**: Execute the SQL in `database_schema.sql`
3. **Configure OAuth**: Set up Google/Facebook OAuth in Supabase Auth settings
4. **Get API Keys**: Copy your project URL and anon key from Settings > API

### 3. **Stripe Setup**

1. **Create Stripe Account**: Visit [stripe.com](https://stripe.com)
2. **Enable Connect**: Activate Stripe Connect in your dashboard
3. **Get API Keys**: Copy your secret key from Developers > API keys
4. **Set up Webhooks**: Configure webhook endpoint: `your-domain.com/webhook/stripe`

### 4. **Email Service Setup (Optional)**

For booking notifications, configure SMTP:
- **Gmail**: Use app passwords for authentication
- **SendGrid**: Use API key authentication
- **Other**: Any SMTP provider works

## 🚀 Quick Start

### 1. **Install Dependencies**
```bash
cd salontime-backend
npm install
```

### 2. **Set Up Environment**
```bash
cp .env.example .env
# Edit .env with your actual values
```

### 3. **Set Up Database**
```sql
-- Run the SQL in database_schema.sql in your Supabase SQL editor
```

### 4. **Start Development Server**
```bash
npm run dev
```

### 5. **Test API**
```bash
curl http://localhost:3000/health
```

## 📱 Flutter Integration

### OAuth Flow
```dart
// 1. Generate OAuth URL
final response = await http.post(
  Uri.parse('$apiBase/auth/oauth/generate-url'),
  body: json.encode({
    'provider': 'google',
    'redirect_uri': 'your-app://oauth-callback'
  }),
);

// 2. Open WebView with URL
// 3. Handle callback and exchange code for tokens
```

### Stripe Connect
```dart
// 1. Create Stripe account for salon
final response = await http.post(
  Uri.parse('$apiBase/salons/stripe/account'),
  headers: {'Authorization': 'Bearer $token'},
  body: json.encode({
    'business_type': 'individual',
    'country': 'US',
    'email': 'salon@example.com'
  }),
);

// 2. Get onboarding link and display in WebView
final linkResponse = await http.get(
  Uri.parse('$apiBase/salons/stripe/onboarding-link'),
  headers: {'Authorization': 'Bearer $token'},
);
```

## 🛡️ Security Features

- **JWT Authentication**: Secure token-based auth with refresh tokens
- **Rate Limiting**: 100 requests per 15 minutes (configurable)
- **CORS Protection**: Whitelist allowed origins
- **Input Validation**: Comprehensive data validation
- **SQL Injection Protection**: Supabase RLS policies
- **Stripe Webhook Verification**: Secure webhook handling

## 📊 API Endpoints

### Authentication
- `POST /api/auth/oauth/generate-url` - Generate OAuth URL
- `POST /api/auth/oauth/callback` - Handle OAuth callback
- `GET /api/auth/profile` - Get user profile

### Salons
- `POST /api/salons` - Create salon
- `GET /api/salons/search` - Search salons
- `GET /api/salons/:id` - Get salon details

### Bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings/my-bookings` - Get user bookings
- `GET /api/bookings/available-slots` - Get available time slots

### Payments
- `POST /api/payments/create-intent` - Create payment intent
- `POST /api/payments/confirm` - Confirm payment
- `GET /api/payments/analytics` - Revenue analytics

See `API_DOCUMENTATION.md` for complete endpoint documentation.

## 🔄 Deployment

### Heroku Deployment
```bash
# 1. Install Heroku CLI
# 2. Create app
heroku create your-salontime-api

# 3. Set environment variables
heroku config:set SUPABASE_URL=your_url
heroku config:set SUPABASE_ANON_KEY=your_key
heroku config:set STRIPE_SECRET_KEY=your_stripe_key

# 4. Deploy
git push heroku main
```

### Railway/Render Deployment
1. Connect your GitHub repository
2. Set environment variables in dashboard
3. Deploy automatically on push

## 🧪 Testing

### Manual Testing
```bash
# Health check
curl http://localhost:3000/health

# Test authentication (requires setup)
curl -X POST http://localhost:3000/api/auth/oauth/generate-url \
  -H "Content-Type: application/json" \
  -d '{"provider":"google","redirect_uri":"your-app://callback"}'
```

### Integration with Flutter
1. Start backend server
2. Update Flutter app API base URL
3. Test OAuth flow with WebView
4. Test booking and payment flows

## 🎯 Next Steps

Your backend is production-ready! Here's what to do next:

1. **Set up your Supabase project** with the provided schema
2. **Configure Stripe Connect** for payment processing
3. **Deploy to your preferred hosting platform**
4. **Connect your Flutter app** using the API documentation
5. **Test the complete OAuth and payment flows**

## 🤝 Support

The backend includes:
- ✅ Complete authentication system with OAuth WebView support
- ✅ Full Stripe Connect integration for salon payments
- ✅ Comprehensive booking and service management
- ✅ Revenue analytics and reporting
- ✅ Email notification system
- ✅ Production-ready security features
- ✅ Detailed API documentation
- ✅ Database schema with RLS policies

Your SalonTime backend is now complete and ready for production use! 🎉

