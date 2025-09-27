# Stripe Transaction Guide

## 🎯 **You Already Have the IDs You Need!**

### **Current Database Fields:**
- ✅ **`stripe_customer_id`** - Customer payments (subscriptions, one-time)
- ✅ **`stripe_account_id`** - Connect account (for salon payouts)

## 💰 **How to Use Them in Transactions:**

### **1. Customer Payments (stripe_customer_id)**
```javascript
// For subscription payments
const paymentIntent = await stripe.paymentIntents.create({
  amount: 2000, // $20.00
  currency: 'usd',
  customer: salon.stripe_customer_id, // 👈 Use this!
  application_fee_amount: 200, // Platform fee
  transfer_data: {
    destination: salon.stripe_account_id, // 👈 Send to salon!
  }
});
```

### **2. Direct to Salon (stripe_account_id)**
```javascript
// For direct salon payments
const paymentIntent = await stripe.paymentIntents.create({
  amount: 2000,
  currency: 'usd',
  customer: customerId,
  application_fee_amount: 200, // Your platform fee
  transfer_data: {
    destination: salon.stripe_account_id, // 👈 Salon gets the money!
  }
});
```

### **3. Subscription Payments**
```javascript
// Create subscription for salon
const subscription = await stripe.subscriptions.create({
  customer: salon.stripe_customer_id, // 👈 Customer pays
  items: [{ price: 'price_123' }],
  application_fee_percent: 2.9, // Platform fee
  transfer_data: {
    destination: salon.stripe_account_id, // 👈 Salon gets revenue
  }
});
```

## 🔄 **Webhook Events You'll Get:**

### **Account Updates (stripe_account_id)**
- `account.updated` → Updates `stripe_account_status`
- `account.application.deauthorized` → Salon disconnected

### **Payment Events (stripe_customer_id)**
- `payment_intent.succeeded` → Payment completed
- `payment_intent.payment_failed` → Payment failed
- `invoice.payment_succeeded` → Subscription payment

## 🚀 **Current Status:**

### **✅ What's Working:**
- Webhook listener running
- Account status updates
- Both customer and account IDs stored

### **🎯 Next Steps:**
1. **Test webhook** - Complete Stripe onboarding
2. **Status changes** from `pending` → `active`
3. **Ready for transactions** using both IDs!

## 💡 **Transaction Flow:**
1. **Customer pays** → Uses `stripe_customer_id`
2. **Platform takes fee** → `application_fee_amount`
3. **Salon gets money** → `stripe_account_id` (destination)
4. **Webhook updates** → Status and payment records

You're all set for transactions! 🎉
