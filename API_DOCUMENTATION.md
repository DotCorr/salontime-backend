# SalonTime Backend API Documentation

## Overview
SalonTime is a comprehensive salon booking and management system with OAuth authentication, Stripe Connect payments, and real-time booking management.

## Base URL
- Development: `http://localhost:3000`
- Production: `your-domain.com`

## Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## API Endpoints

### Authentication (`/api/auth`)

#### Generate OAuth URL
```
POST /api/auth/oauth/generate-url
Content-Type: application/json

{
  "provider": "google" | "facebook",
  "redirect_uri": "string"
}
```

#### Handle OAuth Callback
```
POST /api/auth/oauth/callback
Content-Type: application/json

{
  "code": "string",
  "state": "string",
  "provider": "google" | "facebook"
}
```

#### Refresh Token
```
POST /api/auth/refresh
Content-Type: application/json

{
  "refresh_token": "string"
}
```

#### Get Profile (Protected)
```
GET /api/auth/profile
Authorization: Bearer <token>
```

#### Sign Out (Protected)
```
POST /api/auth/signout
Authorization: Bearer <token>
```

#### Check Auth Status (Protected)
```
GET /api/auth/check
Authorization: Bearer <token>
```

### Salons (`/api/salons`)

#### Search Salons (Public)
```
GET /api/salons/search?location=city&services=haircut&page=1&limit=10
```

#### Get Salon Details (Public)
```
GET /api/salons/:salonId
```

#### Create Salon (Protected - Salon Owner)
```
POST /api/salons
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "string",
  "description": "string",
  "address": "string",
  "city": "string",
  "state": "string",
  "zip_code": "string",
  "phone": "string",
  "email": "string",
  "website": "string",
  "business_hours": {
    "monday": { "open": "09:00", "close": "18:00" },
    "tuesday": { "open": "09:00", "close": "18:00" },
    ...
  },
  "amenities": ["wifi", "parking", "wheelchair_accessible"]
}
```

#### Get My Salon (Protected - Salon Owner)
```
GET /api/salons/my/salon
Authorization: Bearer <token>
```

#### Update My Salon (Protected - Salon Owner)
```
PUT /api/salons/my/salon
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "string",
  "description": "string",
  ...
}
```

#### Create Stripe Account (Protected - Salon Owner)
```
POST /api/salons/stripe/account
Authorization: Bearer <token>
Content-Type: application/json

{
  "business_type": "individual" | "company",
  "country": "US",
  "email": "string"
}
```

#### Generate Stripe Onboarding Link (Protected - Salon Owner)
```
GET /api/salons/stripe/onboarding-link
Authorization: Bearer <token>
```

### Services (`/api/services`)

#### Search Services (Public)
```
GET /api/services/search?query=haircut&category=hair&min_price=20&max_price=100&location=city&page=1&limit=20
```

#### Get Service Categories (Public)
```
GET /api/services/categories
```

#### Get Service Details (Public)
```
GET /api/services/:serviceId
```

#### Get Salon Services (Public)
```
GET /api/services/salon/:salon_id?category=hair&active_only=true
```

#### Create Service (Protected - Salon Owner)
```
POST /api/services
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "string",
  "description": "string",
  "price": number,
  "duration": number, // in minutes
  "category": "string",
  "is_active": boolean
}
```

#### Get My Services (Protected - Salon Owner)
```
GET /api/services/my/services?category=hair&active_only=false
Authorization: Bearer <token>
```

#### Update Service (Protected - Salon Owner)
```
PUT /api/services/:serviceId
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "string",
  "price": number,
  ...
}
```

#### Delete Service (Protected - Salon Owner)
```
DELETE /api/services/:serviceId
Authorization: Bearer <token>
```

### Bookings (`/api/bookings`)

#### Create Booking (Protected - Client)
```
POST /api/bookings
Authorization: Bearer <token>
Content-Type: application/json

{
  "salon_id": "uuid",
  "service_id": "uuid",
  "staff_id": "uuid", // optional
  "appointment_date": "2024-01-15",
  "start_time": "14:30",
  "client_notes": "string",
  "family_member_id": "uuid" // optional
}
```

#### Get My Bookings (Protected - Client)
```
GET /api/bookings/my-bookings?status=pending&page=1&limit=10
Authorization: Bearer <token>
```

#### Get Available Time Slots (Protected)
```
GET /api/bookings/available-slots?salon_id=uuid&service_id=uuid&date=2024-01-15&staff_id=uuid
Authorization: Bearer <token>
```

#### Update Booking Status (Protected)
```
PATCH /api/bookings/:bookingId/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "pending" | "confirmed" | "completed" | "cancelled" | "no_show",
  "staff_notes": "string" // salon owner only
}
```

#### Get Salon Bookings (Protected - Salon Owner)
```
GET /api/bookings/salon?status=confirmed&date=2024-01-15&page=1&limit=20
Authorization: Bearer <token>
```

### Payments (`/api/payments`)

#### Create Payment Intent (Protected - Client)
```
POST /api/payments/create-intent
Authorization: Bearer <token>
Content-Type: application/json

{
  "booking_id": "uuid",
  "payment_method_id": "string", // Stripe payment method ID
  "save_payment_method": boolean
}
```

#### Confirm Payment (Protected - Client)
```
POST /api/payments/confirm
Authorization: Bearer <token>
Content-Type: application/json

{
  "payment_id": "uuid",
  "stripe_payment_intent_id": "string"
}
```

#### Get Payment Methods (Protected)
```
GET /api/payments/methods
Authorization: Bearer <token>
```

#### Delete Payment Method (Protected)
```
DELETE /api/payments/methods/:payment_method_id
Authorization: Bearer <token>
```

#### Get Payment History (Protected)
```
GET /api/payments/history?page=1&limit=10
Authorization: Bearer <token>
```

#### Process Refund (Protected - Salon Owner)
```
POST /api/payments/refund
Authorization: Bearer <token>
Content-Type: application/json

{
  "payment_id": "uuid",
  "amount": number, // optional, full refund if not specified
  "reason": "string"
}
```

#### Get Revenue Analytics (Protected - Salon Owner)
```
GET /api/payments/analytics?period=30&start_date=2024-01-01&end_date=2024-01-31
Authorization: Bearer <token>
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {} // Optional additional details
}
```

## Error Codes
- `MISSING_REQUIRED_FIELDS` - Required fields are missing
- `INVALID_CREDENTIALS` - Authentication failed
- `INSUFFICIENT_PERMISSIONS` - User doesn't have required permissions
- `RESOURCE_NOT_FOUND` - Requested resource doesn't exist
- `VALIDATION_ERROR` - Input validation failed
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `STRIPE_ERROR` - Payment processing error
- `DATABASE_ERROR` - Database operation failed

## OAuth Flow for Flutter App

### 1. Generate OAuth URL
```
POST /api/auth/oauth/generate-url
{
  "provider": "google",
  "redirect_uri": "your-app://oauth-callback"
}
```

### 2. Open WebView with returned URL
The response contains the OAuth URL to open in a WebView.

### 3. Handle OAuth Callback
When the WebView redirects to your callback URL, extract the code and call:
```
POST /api/auth/oauth/callback
{
  "code": "extracted_code",
  "state": "extracted_state",
  "provider": "google"
}
```

### 4. Store Tokens
The callback response contains access_token and refresh_token for API authentication.

## Stripe Connect Integration

### For Salon Owners

1. **Create Stripe Account**: Call `/api/salons/stripe/account` to create a Stripe Connect account
2. **Complete Onboarding**: Use `/api/salons/stripe/onboarding-link` to get the onboarding URL
3. **Display in WebView**: Show the onboarding URL in a WebView for the salon owner to complete
4. **Webhook Updates**: The system automatically updates the account status via webhooks

### For Payments

1. **Create Payment Intent**: Call `/api/payments/create-intent` with booking details
2. **Process Payment**: Use Stripe SDK in your app with the returned client_secret
3. **Confirm Payment**: Call `/api/payments/confirm` to finalize the booking

## Webhook Endpoints

### Stripe Webhooks
```
POST /webhook/stripe
Content-Type: application/json
Stripe-Signature: signature
```

Handles events:
- `account.updated` - Stripe Connect account status changes
- `payment_intent.succeeded` - Payment completed
- `payment_intent.payment_failed` - Payment failed

## Rate Limiting
- 100 requests per 15 minutes per IP in production
- 1000 requests per 15 minutes per IP in development

## Security Features
- JWT authentication with refresh tokens
- Rate limiting
- CORS protection
- Helmet security headers
- Input validation and sanitization
- SQL injection protection via Supabase RLS
- Stripe webhook signature verification

