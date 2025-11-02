# Payment Flow - Complete Explanation

## 📊 How Payments Work in Bookings

### **Current Implementation:**

When you fetch bookings, payments ARE included. Here's how:

---

## 🔄 Complete Payment Flow

### **Step 1: Payment Intent Creation** (Frontend → Backend)
```
POST /api/payments/create-intent
Body: { amount, serviceId, salonId }

Response: {
  clientSecret: "pi_xxx_secret_xxx",
  paymentIntentId: "pi_xxxxx",
  metadata: { userId, serviceId, salonId }
}
```

**What happens:**
- Creates Stripe payment intent
- Stores metadata (userId, serviceId, salonId) in Stripe
- Returns `paymentIntentId` to frontend
- **NO payment record created yet** (needs booking_id first)

---

### **Step 2: Booking Creation** (Frontend → Backend)
```
POST /api/bookings
Body: {
  salon_id,
  service_id,
  appointment_date,
  start_time,
  payment_intent_id (optional)  // ← Link payment intent here
}
```

**What happens:**
1. Booking is created in database
2. **Payment record is AUTO-CREATED** with:
   ```json
   {
     booking_id: <booking.id>,
     amount: <service.price>,
     currency: "EUR",
     status: "pending",
     stripe_payment_intent_id: <payment_intent_id> (if provided)
   }
   ```
3. If `payment_intent_id` was provided, it's linked immediately
4. Response includes booking (but payment not included in response yet)

---

### **Step 3: Payment Completion** (Frontend → Stripe → Webhook)

**Option A: Payment succeeds immediately**
- Frontend confirms payment with Stripe
- Stripe sends webhook: `payment_intent.succeeded`
- Webhook handler (`handlePaymentSuccess`) runs

**Option B: Payment intent created, booking created, payment happens later**
- Webhook handler finds the booking using metadata
- Links payment intent to payment record
- Updates status to `completed`

**Webhook Handler Logic:**
```javascript
1. Look for payment record with stripe_payment_intent_id
2. If not found, use metadata (userId, serviceId, salonId) to find booking
3. Create/update payment record linked to booking
4. Set status = 'completed'
```

---

## 📦 How Payments are Displayed in Bookings

### **For Clients** (`GET /api/bookings/my-bookings`)

**Response includes:**
```json
{
  "success": true,
  "data": {
    "bookings": [
      {
        "id": "booking-uuid",
        "appointment_date": "2025-01-15",
        "start_time": "14:00",
        "serviceName": "Haircut",
        "servicePrice": 50.00,
        "paymentStatus": "completed",    // ← Payment status
        "paymentAmount": 50.00,          // ← Payment amount
        "payments": [                    // ← Full payment objects
          {
            "id": "payment-uuid",
            "booking_id": "booking-uuid",
            "amount": 50.00,
            "currency": "EUR",
            "status": "completed",
            "stripe_payment_intent_id": "pi_xxxxx"
          }
        ]
      }
    ]
  }
}
```

**Key points:**
- ✅ Payments are included via `payments(*)` join
- ✅ Flattened fields: `paymentStatus` and `paymentAmount` for easy access
- ✅ Full payment array available in `payments` field

---

### **For Salon Owners** (`GET /api/bookings/salon`)

**Response includes:**
```json
{
  "success": true,
  "data": {
    "bookings": [
      {
        "id": "booking-uuid",
        "client_id": "user-uuid",
        "services": { ... },
        "user_profiles": { ... },
        "payments": [                    // ← Payments included
          {
            "id": "payment-uuid",
            "booking_id": "booking-uuid",
            "amount": 50.00,
            "status": "completed",
            "stripe_payment_intent_id": "pi_xxxxx"
          }
        ]
      }
    ]
  }
}
```

**Key points:**
- ✅ Payments are included via `payments(*)` join
- ❌ Not flattened (frontend can access `booking.payments[0]`)

---

## 🔍 Payment Status Values

- `pending` - Payment record created, awaiting payment
- `completed` - Payment successful (via Stripe webhook)
- `failed` - Payment failed
- `refunded` - Payment was refunded

---

## 🎯 Summary

### **Yes, payments ARE shown in bookings!**

1. **When booking is created:**
   - Payment record is auto-created with `status: 'pending'`
   - If `payment_intent_id` provided, it's linked immediately

2. **When payment succeeds:**
   - Webhook updates payment status to `completed`
   - If payment intent wasn't linked, webhook links it automatically

3. **When fetching bookings:**
   - Clients see: `paymentStatus` and `paymentAmount` (flattened) + `payments[]` array
   - Salon owners see: `payments[]` array

4. **Payment record always exists:**
   - Every booking has a payment record
   - Status tracks payment state
   - Linked to Stripe via `stripe_payment_intent_id`

---

## 🚨 Current Issues / Edge Cases

1. **Payment record creation can fail** (non-blocking):
   - If payment record creation fails, booking still succeeds
   - Webhook will create it later when payment succeeds

2. **Frontend needs to pass `payment_intent_id`:**
   - When creating booking, frontend should pass the `payment_intent_id`
   - If not passed, webhook will link it later

3. **Payment history endpoint** (`GET /api/payments/history`):
   - Currently queries by `user_id` but payments table doesn't have `user_id`
   - Should query via bookings: `bookings.client_id = user_id`
   - **This is a bug that needs fixing**

---

## 🔧 Recommended Frontend Flow

```javascript
// 1. Create payment intent
const { paymentIntentId } = await createPaymentIntent({
  amount: service.price,
  serviceId: service.id,
  salonId: salon.id
});

// 2. Confirm payment with Stripe
await stripe.confirmPayment({ clientSecret });

// 3. Create booking with payment_intent_id
const booking = await createBooking({
  salon_id: salon.id,
  service_id: service.id,
  appointment_date: date,
  start_time: time,
  payment_intent_id: paymentIntentId  // ← Link it here
});

// 4. Fetch bookings will include payment info
const bookings = await getMyBookings();
// bookings[0].paymentStatus === 'completed'
// bookings[0].paymentAmount === 50.00
```

---

## ✅ What's Working

- ✅ Payment record auto-created on booking creation
- ✅ Payment intent can be linked during booking creation
- ✅ Webhook auto-links payment intent if missing
- ✅ Payments included in booking queries (for clients and salon owners)
- ✅ Payment status tracked and displayed

## ⚠️ What Needs Fixing

- ⚠️ `getPaymentHistory` endpoint queries wrong field (user_id doesn't exist in payments)
- ⚠️ Salon bookings response could include flattened payment fields like client bookings

---

**TL;DR: Payments ARE shown in bookings. Every booking has a payment record that's included when you fetch bookings. The status and amount are displayed directly in the response.**

