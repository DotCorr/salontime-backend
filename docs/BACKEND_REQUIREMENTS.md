# SalonTime Backend Requirements & API Specification

## 🏗️ Architecture Overview

The SalonTime backend is a Node.js/Express API server that integrates with:
- **Supabase** (Database & Authentication)
- **Stripe Connect** (Payments & Managed Accounts)
- **SMTP Service** (Email notifications)
- **WebView Integration** (Stripe onboarding)

---

## 🔐 Authentication Flow

### User Registration & Login
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
```

**Frontend Requirements:**
- Handle JWT tokens from Supabase
- Store user session securely
- Redirect to appropriate dashboard based on user role
- Language preference persistence

**Backend Deliverables:**
- Supabase Auth integration
- Role-based access control (client, salon_owner, admin)
- JWT validation middleware
- Password reset functionality

---

## 👤 User Management

### Client Profile Management
```
GET /api/users/profile
PUT /api/users/profile
POST /api/users/family-members
GET /api/users/family-members
DELETE /api/users/family-members/:id
```

**Frontend Requirements:**
- Profile editing forms
- Family profile management
- Avatar upload functionality
- Preference settings (language, notifications)

### Salon Owner Profile Management
```
GET /api/salon-owners/profile
PUT /api/salon-owners/profile
POST /api/salon-owners/services
GET /api/salon-owners/services
PUT /api/salon-owners/services/:id
DELETE /api/salon-owners/services/:id
POST /api/salon-owners/staff
GET /api/salon-owners/staff
PUT /api/salon-owners/staff/:id
DELETE /api/salon-owners/staff/:id
```

**Frontend Requirements:**
- Salon profile setup forms
- Service management interface
- Staff management (max 2 for basic, unlimited for plus)
- Business hours configuration
- Pricing management

---

## 💳 Stripe Connect Integration

### Managed Account Setup
```
POST /api/stripe/create-account-link
GET /api/stripe/account-status/:userId
POST /api/stripe/webhook
```

**Critical Frontend Requirements:**
1. **Account Creation Flow:**
   - After salon owner registration/login
   - Check if Stripe account exists
   - If NO account → Display WebView with Stripe Connect onboarding link
   - Handle return URL from Stripe
   - Show loading state during account setup

2. **Account Status Dashboard:**
   - Display account verification status
   - Show pending requirements
   - Handle account restrictions
   - Re-onboarding for incomplete accounts

**Backend Deliverables:**
- Stripe Connect account creation
- Webhook handling for account updates
- Account status monitoring
- Express dashboard links for existing accounts

### Payment Processing
```
POST /api/payments/create-intent
POST /api/payments/confirm
GET /api/payments/history
POST /api/payments/refund
```

**Frontend Requirements:**
- Payment forms with Stripe Elements
- Payment confirmation screens
- Payment history display
- Refund handling (salon owner side)

---

## 📅 Booking System

### Client Booking Management
```
GET /api/bookings/available-slots
POST /api/bookings/create
GET /api/bookings/my-bookings
PUT /api/bookings/cancel/:id
GET /api/salons/search
GET /api/salons/:id/services
GET /api/salons/:id/staff
```

**Frontend Requirements:**
- Salon search with filters (location, services, rating)
- Available time slot display
- Booking creation forms
- Booking status tracking (pending, confirmed, completed, cancelled)
- Multiple booking support (family members)

### Salon Owner Booking Management
```
GET /api/salon-bookings/pending
GET /api/salon-bookings/confirmed
GET /api/salon-bookings/today
PUT /api/salon-bookings/:id/confirm
PUT /api/salon-bookings/:id/cancel
POST /api/salon-bookings/:id/notes
```

**Frontend Requirements:**
- Booking management dashboard
- Real-time booking notifications
- Booking confirmation/cancellation
- Private notes system
- Calendar view integration

---

## 📊 Analytics & Dashboard Data

### Revenue Analytics
```
GET /api/analytics/revenue
GET /api/analytics/appointments
GET /api/analytics/clients
GET /api/analytics/performance
```

**Frontend Requirements:**
- Professional dashboard with crypto-style graphs
- Period selectors (day, week, month, year)
- Key metrics display (revenue, appointments, new clients, ratings)
- Performance indicators (completion rate, efficiency)
- Interactive charts and visualizations

**Backend Deliverables:**
- Real-time Stripe data integration
- Booking analytics calculations
- Client retention metrics
- Revenue forecasting algorithms

### Financial Reports
```
GET /api/reports/accounting
GET /api/reports/tax-summary
GET /api/reports/export/:format
```

**Frontend Requirements:**
- Accounting reports download
- Tax summary generation
- Export functionality (PDF, Excel)
- Date range selectors

---

## 📱 Push Notifications

### Notification Management
```
POST /api/notifications/send
GET /api/notifications/preferences
PUT /api/notifications/preferences
```

**Frontend Requirements:**
- Notification permission handling
- Notification preferences screen
- Real-time notification display
- Badge count management

**Notification Types:**
- Booking confirmations
- Appointment reminders
- Payment confirmations
- Cancellation alerts
- Review requests

---

## ⭐ Review System

### Review Management
```
POST /api/reviews/create
GET /api/reviews/:salonId
PUT /api/reviews/:id/visibility
GET /api/reviews/my-reviews
```

**Frontend Requirements:**
- Review submission forms
- Star rating components
- Review display with filtering
- Salon owner review management
- Review moderation controls

---

## 🔧 Settings & Configuration

### App Settings
```
GET /api/settings/cancellation-policy
PUT /api/settings/cancellation-policy
GET /api/settings/business-hours
PUT /api/settings/business-hours
GET /api/settings/pricing
PUT /api/settings/pricing
```

**Frontend Requirements:**
- Cancellation policy configuration
- Business hours setup
- Pricing management
- No-show policy settings
- Automatic confirmation settings

---

## 📧 Email & Communication

### Email Services
```
POST /api/email/appointment-confirmation
POST /api/email/cancellation-notice
POST /api/email/reminder
POST /api/email/receipt
```

**Frontend Requirements:**
- Email template previews
- Custom message options
- Automated email toggles
- Email history tracking

---

## 📸 File Management

### Media Upload
```
POST /api/media/upload
DELETE /api/media/:id
GET /api/media/gallery/:salonId
```

**Frontend Requirements:**
- Image upload components
- Gallery management
- Photo compression
- Multiple image selection
- Image cropping/editing

---

## 🌍 Localization & Multi-language

### Language Support
```
GET /api/localization/strings/:language
```

**Frontend Requirements:**
- Language switcher (intro + profile only)
- Dynamic text loading
- RTL language support preparation
- Currency localization

---

## 🔄 Data Synchronization

### Real-time Updates
```
WebSocket connections for:
- Booking status changes
- Payment confirmations
- Calendar updates
- Notification delivery
```

**Frontend Requirements:**
- WebSocket connection management
- Real-time state updates
- Offline data caching
- Sync conflict resolution

---

## 🚨 Error Handling & Validation

### API Error Responses
```javascript
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "message": "Invalid email format"
    }
  }
}
```

**Frontend Requirements:**
- Global error handling
- User-friendly error messages
- Validation feedback
- Retry mechanisms
- Offline mode handling

---

## 📋 Subscription Management

### Salon Owner Subscriptions
```
GET /api/subscriptions/current
POST /api/subscriptions/upgrade
POST /api/subscriptions/cancel
GET /api/subscriptions/billing-history
```

**Frontend Requirements:**
- Subscription status display
- Upgrade/downgrade flows
- Billing management
- Feature restriction enforcement
- Trial period handling

---

## 🔍 Search & Discovery

### Salon Discovery
```
GET /api/search/salons
GET /api/search/services
GET /api/search/location-based
```

**Frontend Requirements:**
- Advanced search filters
- Map integration
- Favorite salons management
- Recently viewed tracking
- Search history

---

## 🎯 Business Logic Requirements

### Subscription Tiers

**Basic Plan (€25/month):**
- Max 2 staff members
- Basic analytics
- Standard support
- Core features only

**Plus Plan (€30/month):**
- Unlimited staff members
- Advanced analytics
- Priority support
- All premium features (accounting, client dossier, photo gallery)

### Booking Rules
- Multiple consecutive bookings allowed
- Family booking support
- Automatic time slot optimization
- Cancellation policies enforcement
- No-show tracking

### Payment Flow
- Immediate payment processing
- Automatic receipt generation
- Refund capabilities
- Commission calculations
- Tax handling

---

## 📊 Database Schema Requirements

### Core Tables Needed in Supabase:
- `users` (profiles, roles, preferences)
- `salons` (business info, settings, subscription)
- `services` (pricing, duration, descriptions)
- `staff` (profiles, specialties, schedules)
- `bookings` (appointments, status, notes)
- `payments` (transactions, receipts, refunds)
- `reviews` (ratings, comments, visibility)
- `stripe_accounts` (managed account data)

---

## 🔒 Security Requirements

### Data Protection
- GDPR compliance
- Data encryption at rest
- Secure API endpoints
- Rate limiting
- Input sanitization
- SQL injection prevention

### Authentication Security
- JWT token validation
- Role-based permissions
- API key management
- Webhook signature verification
- Session timeout handling

---

## 🚀 Deployment & Infrastructure

### Environment Configuration
- Development, Staging, Production environments
- Environment variables management
- Database migrations
- API versioning
- Load balancing
- SSL certificates

---

## 📝 Documentation Deliverables

### API Documentation
- OpenAPI/Swagger specifications
- Authentication examples
- Error code references
- Rate limiting details
- Webhook payload examples

### Integration Guides
- Stripe Connect setup guide
- Supabase configuration
- Email service integration
- Push notification setup
- WebView integration examples

---

## 🎯 Priority Implementation Order

### Phase 1: Core Authentication & User Management
1. Supabase integration
2. User registration/login
3. Profile management
4. Role-based access

### Phase 2: Booking System
1. Salon search and discovery
2. Booking creation and management
3. Real-time updates
4. Notification system

### Phase 3: Payment Integration
1. Stripe Connect onboarding
2. Payment processing
3. Webhook handling
4. Financial reporting

### Phase 4: Analytics & Advanced Features
1. Dashboard analytics
2. Advanced reporting
3. Subscription management
4. Premium features

---

**Note:** The frontend salon owner UI will undergo changes post-account creation to integrate live Stripe data and managed account workflows. The WebView integration for Stripe onboarding is critical for the complete user experience.
