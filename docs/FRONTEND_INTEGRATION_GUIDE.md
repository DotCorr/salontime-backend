# SalonTime Frontend Integration Guide

## 🎯 **Backend Status: 100% COMPLETE & PRODUCTION READY**

Your SalonTime backend is fully implemented with enterprise-grade features:

✅ **OAuth WebView Authentication** (Google/Facebook)  
✅ **Stripe Connect Managed Accounts** (Full tenant isolation)  
✅ **Subscription System** (7-day trial + Premium plans)  
✅ **Webhook Handling** (Real-time payment/subscription updates)  
✅ **Multi-tenant Architecture** (Each salon is isolated)  
✅ **Revenue Analytics** (Comprehensive salon dashboards)  
✅ **Email Notifications** (Automated booking/payment emails)  
✅ **Security & Rate Limiting** (Production-ready)  

---

## 🏗️ **Frontend UI Components You Need to Build**

### 1. **Authentication & Onboarding Flows**

#### **Client Authentication**
```
📱 OAuth Login Screen
├── Google Login Button → WebView OAuth
├── Facebook Login Button → WebView OAuth
└── Apple Login Button (when ready)
```

#### **Salon Owner Onboarding Flow** ⭐ **CRITICAL - NOT BUILT YET**
```
🏪 Salon Owner Registration (Multi-Step)
├── Step 1: Basic Account (OAuth login)
├── Step 2: Business Information Form
│   ├── Business Name, Description
│   ├── Address, City, State, ZIP
│   ├── Phone, Email, Website
│   ├── Business Hours Setup
│   └── Amenities Selection
├── Step 3: Stripe Connect Setup
│   ├── "Set up payments" explanation
│   ├── WebView → Stripe Onboarding
│   └── Completion confirmation
├── Step 4: Premium Subscription
│   ├── Plan comparison (Basic vs Plus)
│   ├── 7-day free trial offer
│   ├── Payment method setup
│   └── Subscription activation
└── Step 5: Welcome & Dashboard
    ├── Setup completion celebration
    ├── Quick tutorial
    └── Redirect to salon dashboard
```

### 2. **Subscription Management UI** ⭐ **CRITICAL - NOT BUILT YET**

#### **Subscription Status Widget**
```
💳 Subscription Card
├── Current Plan (Basic/Plus)
├── Trial Status (if applicable)
├── Days Remaining in Trial
├── Next Billing Date
├── Billing Amount
└── Action Buttons
    ├── Upgrade (if Basic)
    ├── Manage Billing
    └── Cancel Subscription
```

#### **Premium Features Paywall**
```
🔒 Premium Feature Blocker
├── Feature explanation
├── "Upgrade to Plus" button
├── Benefits list
└── Trial offer
```

### 3. **Salon Owner Dashboard** ⭐ **PARTIALLY MISSING**

#### **Dashboard Overview**
```
📊 Dashboard Home
├── Today's Bookings Summary
├── Revenue Analytics Charts
├── Subscription Status
├── Recent Customer Activity
└── Quick Actions
    ├── Add Service
    ├── View Bookings
    ├── Manage Schedule
    └── View Analytics
```

#### **Revenue Analytics Page**
```
📈 Analytics Dashboard
├── Revenue Overview Cards
│   ├── Today's Revenue
│   ├── This Week
│   ├── This Month
│   └── Total Revenue
├── Revenue Chart (Line/Bar)
├── Service Performance
├── Popular Services
└── Export Options
```

### 4. **Client Booking Flow** ⭐ **PARTIALLY MISSING**

#### **Service Discovery**
```
🔍 Find Services
├── Location Search
├── Service Category Filter
├── Price Range Filter
├── Salon Rating Filter
└── Results List
    ├── Salon Cards
    ├── Service Details
    └── Book Now Button
```

#### **Booking Process**
```
📅 Book Appointment
├── Step 1: Service Selection
├── Step 2: Date & Time Picker
│   ├── Calendar View
│   ├── Available Time Slots
│   └── Duration Display
├── Step 3: Personal Details
│   ├── Client Info
│   ├── Family Member Selection
│   └── Special Requests
├── Step 4: Payment
│   ├── Service Summary
│   ├── Payment Method
│   ├── Stripe Payment Form
│   └── Confirmation
└── Step 5: Booking Confirmation
    ├── Booking Details
    ├── Calendar Add
    └── Share Options
```

### 5. **Payment & Billing UI** ⭐ **MISSING**

#### **Payment Method Management**
```
💳 Payment Methods
├── Saved Cards List
├── Add New Card
├── Default Payment Method
└── Delete/Edit Cards
```

#### **Billing Portal Integration**
```
🧾 Billing Management
├── Billing History
├── Invoice Downloads
├── Payment Method Updates
└── Stripe Billing Portal WebView
```

---

## 🔗 **API Integration Examples**

### **1. OAuth Authentication Flow**

```dart
// 1. Generate OAuth URL
Future<String> generateOAuthUrl(String provider) async {
  final response = await http.post(
    Uri.parse('$apiBase/auth/oauth/generate-url'),
    headers: {'Content-Type': 'application/json'},
    body: json.encode({
      'provider': provider, // 'google' or 'facebook'
      'redirect_uri': 'salontime://oauth-callback'
    }),
  );
  
  final data = json.decode(response.body);
  return data['data']['oauth_url'];
}

// 2. Handle OAuth Callback
Future<AuthResult> handleOAuthCallback(String code, String state, String provider) async {
  final response = await http.post(
    Uri.parse('$apiBase/auth/oauth/callback'),
    headers: {'Content-Type': 'application/json'},
    body: json.encode({
      'code': code,
      'state': state,
      'provider': provider
    }),
  );
  
  final data = json.decode(response.body);
  return AuthResult.fromJson(data['data']);
}
```

### **2. Salon Owner Onboarding**

```dart
// Complete Salon Registration
Future<SalonResult> createSalon(SalonData salonData) async {
  final response = await http.post(
    Uri.parse('$apiBase/onboarding/complete'),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $accessToken'
    },
    body: json.encode(salonData.toJson()),
  );
  
  final data = json.decode(response.body);
  return SalonResult.fromJson(data['data']);
}

// Get Stripe Onboarding Link
Future<String> getStripeOnboardingLink() async {
  final response = await http.get(
    Uri.parse('$apiBase/salons/stripe/onboarding-link'),
    headers: {'Authorization': 'Bearer $accessToken'},
  );
  
  final data = json.decode(response.body);
  return data['data']['url'];
}
```

### **3. Subscription Management**

```dart
// Create Premium Subscription
Future<SubscriptionResult> createSubscription(String paymentMethodId) async {
  final response = await http.post(
    Uri.parse('$apiBase/subscriptions/create'),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $accessToken'
    },
    body: json.encode({
      'payment_method_id': paymentMethodId
    }),
  );
  
  final data = json.decode(response.body);
  return SubscriptionResult.fromJson(data['data']);
}

// Get Subscription Status
Future<SubscriptionStatus> getSubscriptionStatus() async {
  final response = await http.get(
    Uri.parse('$apiBase/subscriptions/status'),
    headers: {'Authorization': 'Bearer $accessToken'},
  );
  
  final data = json.decode(response.body);
  return SubscriptionStatus.fromJson(data['data']);
}
```

### **4. Booking Management**

```dart
// Get Available Time Slots
Future<List<TimeSlot>> getAvailableSlots({
  required String salonId,
  required String serviceId,
  required String date,
  String? staffId,
}) async {
  final response = await http.get(
    Uri.parse('$apiBase/bookings/available-slots?salon_id=$salonId&service_id=$serviceId&date=$date${staffId != null ? '&staff_id=$staffId' : ''}'),
    headers: {'Authorization': 'Bearer $accessToken'},
  );
  
  final data = json.decode(response.body);
  return (data['data']['available_slots'] as List)
      .map((slot) => TimeSlot.fromJson(slot))
      .toList();
}

// Create Booking
Future<BookingResult> createBooking(BookingData booking) async {
  final response = await http.post(
    Uri.parse('$apiBase/bookings'),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $accessToken'
    },
    body: json.encode(booking.toJson()),
  );
  
  final data = json.decode(response.body);
  return BookingResult.fromJson(data['data']);
}
```

### **5. Payment Processing**

```dart
// Create Payment Intent
Future<PaymentIntentResult> createPaymentIntent(String bookingId, String paymentMethodId) async {
  final response = await http.post(
    Uri.parse('$apiBase/payments/create-intent'),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $accessToken'
    },
    body: json.encode({
      'booking_id': bookingId,
      'payment_method_id': paymentMethodId,
      'save_payment_method': true
    }),
  );
  
  final data = json.decode(response.body);
  return PaymentIntentResult.fromJson(data['data']);
}

// Confirm Payment
Future<PaymentResult> confirmPayment(String paymentId, String paymentIntentId) async {
  final response = await http.post(
    Uri.parse('$apiBase/payments/confirm'),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $accessToken'
    },
    body: json.encode({
      'payment_id': paymentId,
      'stripe_payment_intent_id': paymentIntentId
    }),
  );
  
  final data = json.decode(response.body);
  return PaymentResult.fromJson(data['data']);
}
```

---

## 🎨 **UI/UX Recommendations**

### **Critical Missing UI Components:**

1. **Salon Owner Onboarding Wizard** 
   - Multi-step form with progress indicator
   - Business information collection
   - Stripe Connect WebView integration
   - Subscription setup with trial offer

2. **Subscription Management Dashboard**
   - Plan comparison cards
   - Trial countdown timer
   - Billing portal integration
   - Feature usage limits display

3. **Premium Feature Paywalls**
   - Feature preview with upgrade prompts
   - Trial offer call-to-actions
   - Benefits highlighting

4. **Revenue Analytics Dashboard**
   - Charts and graphs for revenue data
   - Service performance metrics
   - Time period filters

5. **Booking Management Interface**
   - Calendar view for salon owners
   - Real-time availability updates
   - Booking status management

---

## 🚀 **Implementation Priority Order**

### **Phase 1: Core Authentication (HIGHEST PRIORITY)**
1. OAuth WebView integration
2. Token management and refresh
3. User profile setup

### **Phase 2: Salon Owner Onboarding (CRITICAL)**
1. Multi-step registration form
2. Stripe Connect WebView integration
3. Subscription setup flow
4. Welcome dashboard

### **Phase 3: Booking System**
1. Service discovery and search
2. Booking creation flow
3. Payment processing with Stripe
4. Booking management

### **Phase 4: Subscription Management**
1. Subscription status display
2. Billing portal integration
3. Premium feature paywalls
4. Trial management

### **Phase 5: Analytics & Management**
1. Revenue dashboard
2. Booking management interface
3. Customer management
4. Settings and preferences

---

## 🔧 **Environment Setup for Frontend**

```env
# API Configuration
REACT_APP_API_BASE_URL=https://your-backend-domain.com
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# OAuth Configuration
REACT_APP_OAUTH_REDIRECT_URI=salontime://oauth-callback

# Feature Flags
REACT_APP_ENABLE_APPLE_LOGIN=false
REACT_APP_ENABLE_ANALYTICS=true
```

---

## 📱 **Native App Deep Linking**

Configure these URL schemes in your Flutter app:

```yaml
# android/app/src/main/AndroidManifest.xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="salontime" />
</intent-filter>

# ios/Runner/Info.plist
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLName</key>
        <string>salontime.oauth</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>salontime</string>
        </array>
    </dict>
</array>
```

---

## 🎯 **Summary: What You Need to Build**

### **✅ Backend is 100% Complete:**
- Authentication system with OAuth WebView
- Stripe Connect with managed accounts
- Full subscription system with 7-day trials
- Webhook handling for real-time updates
- Multi-tenant architecture for scalability
- Revenue analytics and reporting
- Email notification system

### **🚧 Frontend Components Needed:**

1. **Salon Owner Onboarding Flow** (Multi-step wizard)
2. **Subscription Management UI** (Trial status, billing portal)
3. **Premium Feature Paywalls** (Upgrade prompts)
4. **Revenue Analytics Dashboard** (Charts and metrics)
5. **Booking Management Interface** (Calendar, status updates)
6. **Payment Method Management** (Saved cards, billing)

### **🔗 Integration Points:**
- OAuth WebView for authentication
- Stripe Connect WebView for salon onboarding
- Stripe Elements for payment forms
- Billing Portal WebView for subscription management

Your backend is enterprise-ready and scalable. Focus on building these key UI components to complete your SalonTime app! 🚀

