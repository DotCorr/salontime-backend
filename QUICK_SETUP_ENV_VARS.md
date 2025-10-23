# 🚀 Quick Setup - Environment Variables Needed

## Add these to your Vercel Environment Variables

Go to: Vercel Dashboard → Your Project → Settings → Environment Variables

### 1. Cron Job Secret (Required)
```
CRON_SECRET=<generate-random-string>
```

**How to generate:**
```bash
openssl rand -base64 32
```
Or use any secure random string generator.

**What it's for:** Protects your cron job endpoints from unauthorized access.

---

### 2. Stripe Premium Price ID (Required for Featured Salons)
```
STRIPE_PREMIUM_PRICE_ID=price_1234567890abcdef
```

**How to get:**
1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products)
2. Click "Add product"
3. Name: "Premium Salon Plan" or "Featured Salon"
4. Price: €29.99/month (or your chosen price)
5. Billing period: Monthly
6. Click "Save product"
7. Copy the **Price ID** (starts with `price_`)

**What it's for:** Allows salon owners to upgrade to featured/premium status.

---

### 3. Frontend URL (Already Set, Verify)
```
FRONTEND_URL=https://salontime.nl
```

**What it's for:** Redirects after Stripe checkout, deep links back to app.

---

## Optional (Future Enhancement)

```
STRIPE_PROFESSIONAL_PLAN_PRICE_ID=price_...
STRIPE_ENTERPRISE_PLAN_PRICE_ID=price_...
```

Only needed if you create additional premium tiers.

---

## 📋 Complete Checklist

### Before Deployment
- [ ] Generate `CRON_SECRET` 
- [ ] Create Stripe Premium Product
- [ ] Copy Premium Price ID
- [ ] Add all 3 env vars to Vercel

### After Adding Env Vars
- [ ] Redeploy backend (triggers automatic reload)
- [ ] Run database migration
- [ ] Test cron endpoints
- [ ] Test featured salon upgrade flow

---

## 🧪 Testing the Setup

### 1. Test Cron Secret (from your terminal)
```bash
# Replace YOUR_CRON_SECRET with actual value
curl "https://salontime.nl/api/cron/update-trending-scores" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Should return: {"success": true, "message": "Trending scores updated successfully"}
```

### 2. Test Featured Salon Endpoint
```bash
# Replace YOUR_AUTH_TOKEN with a salon owner's JWT
curl "https://salontime.nl/api/subscriptions/featured-status" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"

# Should return salon featured status and upgrade info
```

### 3. Test New Category Endpoints
```bash
# Trending
curl "https://salontime.nl/api/analytics/salons/trending?limit=5"

# New
curl "https://salontime.nl/api/analytics/salons/new?days=30&limit=5"

# Featured
curl "https://salontime.nl/api/analytics/salons/featured?limit=5"
```

---

## 🎯 Expected Results

After adding env vars and deploying:

1. **Cron Jobs Start Running**
   - Check Vercel → Cron tab
   - Should see 3 jobs scheduled

2. **Featured Upgrade Works**
   - Salon owners see "Become Featured" card
   - Clicking upgrade opens Stripe Checkout
   - After payment, salon gets `is_featured = true`

3. **Analytics Tracking Works**
   - Views tracked when users open salon details
   - Trending scores calculated hourly
   - Category endpoints return correct data

---

## ⚠️ Important Notes

1. **CRON_SECRET**: Keep this secret! Anyone with this can trigger your cron jobs.
2. **Price ID**: Make sure it matches your intended pricing plan.
3. **Frontend URL**: Must match exactly (including https://)
4. **Vercel Redeploy**: After adding env vars, trigger a redeploy for changes to take effect.

---

## 📞 Quick Reference

| Variable | Where to Get It | Why You Need It |
|----------|----------------|-----------------|
| `CRON_SECRET` | Generate random string | Secure cron endpoints |
| `STRIPE_PREMIUM_PRICE_ID` | Stripe Dashboard → Products | Featured salon upgrades |
| `FRONTEND_URL` | Your domain | Redirects after payment |

---

## Next Steps

1. ✅ Add environment variables to Vercel
2. ✅ Run database migration (see DEPLOYMENT_GUIDE_ANALYTICS.md)
3. ✅ Test cron endpoints
4. ✅ Update Flutter app to use new endpoints
5. ✅ Test featured salon upgrade flow

**Estimated Time: 15-20 minutes**

---

**Need Help?** Check `DEPLOYMENT_GUIDE_ANALYTICS.md` for detailed instructions.

