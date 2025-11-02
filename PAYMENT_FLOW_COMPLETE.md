# Complete Payment Flow Documentation

## 📋 Payment Flow Summary

### **1. Booking Creation (WITHOUT Payment)**
- ✅ Client creates booking via `POST /api/bookings`
- ✅ Payment record is **auto-created** with `status: 'pending'`
- ✅ Booking can be created with or without `payment_intent_id`
- ✅ Payment info appears in booking response: `paymentStatus` and `paymentAmount`

---

### **2. Payment Methods**

#### **Option A: Cash/Physical Payment**
Salon owner marks payment as completed manually:
```
PATCH /api/payments/booking/:bookingId/status
Authorization: Bearer <salon_owner_token>
Body: {
  status: "completed",
  payment_method: "cash"
}
```

#### **Option B: Online Payment (Stripe Payment Link)**
Salon owner generates payment link for client:
```
POST /api/payments/booking/:bookingId/payment-link
Authorization: Bearer <salon_owner_token>
Response: {
  paymentLink: "https://checkout.stripe.com/...",
  checkoutSessionId: "cs_xxx",
  expiresAt: 1234567890
}
```
- Client clicks link → Pays via Stripe → Webhook updates status to `completed`

#### **Option C: Online Payment (Direct Payment Intent)**
Client creates payment intent before booking:
```
POST /api/payments/create-intent
Body: { amount, serviceId, salonId }

POST /api/bookings
Body: { ..., payment_intent_id: "pi_xxx" }
```
- Payment processed → Webhook updates status

---

### **3. Webhook Updates**
- `checkout.session.completed` → Updates payment status to `completed`
- `payment_intent.succeeded` → Updates payment status to `completed`
- Links payment intent to booking if not already linked

---

## 🔄 Complete Flow Diagram

```
Client Books Appointment
    ↓
Booking Created (payment_status: 'pending')
    ↓
┌─────────────────────────────────────────┐
│  Payment Options:                       │
├─────────────────────────────────────────┤
│                                         │
│  A. Cash Payment                        │
│     Salon Owner → Mark as Completed    │
│                                         │
│  B. Generate Payment Link               │
│     Salon Owner → Generate Link        │
│     Client → Clicks Link → Pays        │
│     Webhook → Updates Status           │
│                                         │
│  C. Direct Payment Intent               │
│     Client → Creates Intent            │
│     Client → Pays Immediately          │
│     Webhook → Updates Status           │
│                                         │
└─────────────────────────────────────────┘
    ↓
Payment Status: 'completed'
```

---

## 📊 Payment Status Values

- `pending` - Payment record created, awaiting payment
- `completed` - Payment successful (via cash or online)
- `failed` - Payment failed
- `refunded` - Payment was refunded

---

## 🎯 Key Points

1. **Every booking has a payment record** (auto-created)
2. **Bookings can be created without payment** (status stays 'pending')
3. **Salon owners have 3 payment options:**
   - Manual cash payment update
   - Generate Stripe payment link
   - Client pays directly via payment intent
4. **Webhooks handle online payments automatically**
5. **Payment info is included in all booking queries**

---

## 🔧 API Endpoints

### Client Endpoints:
- `POST /api/payments/create-intent` - Create payment intent
- `POST /api/payments/confirm/:paymentIntentId` - Confirm payment
- `GET /api/payments/history` - View payment history

### Salon Owner Endpoints:
- `PATCH /api/payments/booking/:bookingId/status` - Update payment status (cash)
- `POST /api/payments/booking/:bookingId/payment-link` - Generate payment link
- `GET /api/payments/salon` - View salon payments
- `GET /api/payments/analytics` - Payment analytics

### Booking Endpoints (include payment info):
- `GET /api/bookings/my-bookings` - Client bookings (with paymentStatus, paymentAmount)
- `GET /api/bookings/salon` - Salon bookings (with payments array)

