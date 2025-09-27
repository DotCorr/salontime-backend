# Stripe Webhook Setup Guide

## 🔧 **Why the Status Stays "Pending"**

The `stripe_account_status` stays `pending` until the user completes Stripe onboarding. Here's the flow:

1. **Create Account** → Status: `pending`
2. **User Completes Onboarding** → Stripe sends webhook
3. **Webhook Updates Status** → Status: `active`

## 📡 **Webhook Setup Required**

You need to configure Stripe webhooks to automatically update the status.

### **Step 1: Configure Webhook in Stripe Dashboard**

1. Go to: https://dashboard.stripe.com/webhooks
2. Click **"Add endpoint"**
3. **Endpoint URL**: `https://your-domain.com/webhook/stripe`
4. **Events to send**: Select `account.updated`
5. **Save** and copy the **Webhook Secret**

### **Step 2: Add Webhook Secret to Environment**

Add to your `.env` file:
```
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### **Step 3: Test the Webhook**

1. Complete Stripe onboarding in your app
2. Check your backend logs for webhook events
3. The status should update from `pending` to `active`

## 🔍 **Current Status**

- ✅ **Webhook handler exists** in your backend
- ✅ **Updates both tables** (stripe_accounts and salons)
- ❌ **Webhook not configured** in Stripe Dashboard
- ❌ **Webhook secret not set** in environment

## 🚀 **After Setup**

Once configured, the status will automatically update when users complete Stripe onboarding!
