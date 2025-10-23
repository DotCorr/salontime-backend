# SalonTime Analytics & Featured Salons - Deployment Guide

## 🚀 What's New

This update adds comprehensive analytics tracking and a featured salons system to SalonTime:

### ✅ Features Implemented

1. **Analytics Tracking System**
   - Track salon views, bookings, and favorites
   - Calculate trending scores based on recent activity
   - Real-time analytics dashboard for salon owners
   
2. **Category-Based Salon Discovery**
   - Trending salons (based on recent activity)
   - New salons (opened in last 30 days)
   - Featured salons (premium subscribers)
   - Popular salons (high ratings with many reviews)
   
3. **Featured Salon System**
   - Automatic featured status for premium subscribers
   - Upgrade flow for salon owners
   - Special placement in app

4. **Scheduled Jobs**
   - Hourly trending score updates
   - Daily featured status updates
   - Old data cleanup

## 📋 Deployment Steps

### Step 1: Database Migration

Run the analytics migration SQL file on your Supabase database:

```bash
# Connect to your Supabase SQL editor and run:
cd database/migrations
# Copy contents of analytics_and_featured.sql and execute
```

Or use Supabase CLI:
```bash
supabase db push --file database/migrations/analytics_and_featured.sql
```

This will:
- ✅ Add new columns to `salons` table
- ✅ Create `salon_views` table
- ✅ Create `favorites` table (if not exists)
- ✅ Add database functions for trending score calculation
- ✅ Set up automatic triggers for counting
- ✅ Create analytics summary view

### Step 2: Environment Variables

Add these new environment variables to your Vercel deployment or `.env` file:

```bash
# Cron Job Secret (generate a random string)
CRON_SECRET=your_secure_random_string_here

# Premium Plan Price ID (for featured salons)
STRIPE_PREMIUM_PRICE_ID=price_1234567890

# Frontend URL for redirects
FRONTEND_URL=https://salontime.nl

# Optional: Professional & Enterprise plans
STRIPE_PROFESSIONAL_PLAN_PRICE_ID=price_...
STRIPE_ENTERPRISE_PLAN_PRICE_ID=price_...
```

**How to get these values:**

1. **CRON_SECRET**: Generate a secure random string
   ```bash
   openssl rand -base64 32
   ```

2. **STRIPE_PREMIUM_PRICE_ID**: 
   - Go to Stripe Dashboard → Products
   - Create a new product called "Premium Salon Plan"
   - Set price (e.g., €29.99/month)
   - Copy the Price ID (starts with `price_`)

3. **FRONTEND_URL**: Your production app URL
   ```
   https://salontime.nl
   ```

### Step 3: Deploy Backend Code

Deploy the updated backend to Vercel:

```bash
cd salontime-backend
git add .
git commit -m "feat: add analytics tracking and featured salons"
git push origin main
```

Vercel will automatically deploy the changes.

### Step 4: Configure Vercel Cron Jobs

Vercel will automatically detect the cron configuration from `vercel-cron.json`.

To verify cron jobs are configured:

1. Go to Vercel Dashboard → Your Project → Cron
2. You should see 3 cron jobs:
   - `update-trending-scores` (Hourly)
   - `update-featured-status` (Daily at 1 AM)
   - `cleanup-old-views` (Daily at 2 AM)

### Step 5: Initial Data Setup

After deployment, trigger the first trending score calculation manually:

```bash
# Replace with your actual CRON_SECRET
curl -X GET "https://salontime.nl/api/cron/update-trending-scores" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Or trigger from Vercel Dashboard → Cron → Run now

### Step 6: Test New Endpoints

Test the new API endpoints:

```bash
# Get trending salons
curl "https://salontime.nl/api/analytics/salons/trending?limit=10"

# Get new salons
curl "https://salontime.nl/api/analytics/salons/new?days=30&limit=10"

# Get featured salons
curl "https://salontime.nl/api/analytics/salons/featured?limit=10"

# Get popular salons
curl "https://salontime.nl/api/analytics/salons/popular-rated?min_rating=4.5&limit=10"
```

## 📱 Frontend Integration

### Update Flutter App to Use New Endpoints

1. **Update SalonService** (`lib/services/salon_service.dart`):

```dart
// Add these new methods

static Future<List<Salon>> getTrendingSalons({
  double? latitude,
  double? longitude,
  int limit = 10,
}) async {
  final response = await http.get(
    Uri.parse('${ApiService.baseUrl}/analytics/salons/trending')
        .replace(queryParameters: {
      'limit': limit.toString(),
      if (latitude != null) 'latitude': latitude.toString(),
      if (longitude != null) 'longitude': longitude.toString(),
    }),
  );
  
  if (response.statusCode == 200) {
    final data = json.decode(response.body);
    return (data['data']['salons'] as List)
        .map((salon) => Salon.fromJson(salon))
        .toList();
  }
  throw Exception('Failed to load trending salons');
}

static Future<List<Salon>> getNewSalons({
  int days = 30,
  double? latitude,
  double? longitude,
  int limit = 10,
}) async {
  final response = await http.get(
    Uri.parse('${ApiService.baseUrl}/analytics/salons/new')
        .replace(queryParameters: {
      'days': days.toString(),
      'limit': limit.toString(),
      if (latitude != null) 'latitude': latitude.toString(),
      if (longitude != null) 'longitude': longitude.toString(),
    }),
  );
  
  if (response.statusCode == 200) {
    final data = json.decode(response.body);
    return (data['data']['salons'] as List)
        .map((salon) => Salon.fromJson(salon))
        .toList();
  }
  throw Exception('Failed to load new salons');
}

static Future<List<Salon>> getFeaturedSalons({
  double? latitude,
  double? longitude,
  int limit = 10,
}) async {
  final response = await http.get(
    Uri.parse('${ApiService.baseUrl}/analytics/salons/featured')
        .replace(queryParameters: {
      'limit': limit.toString(),
      if (latitude != null) 'latitude': latitude.toString(),
      if (longitude != null) 'longitude': longitude.toString(),
    }),
  );
  
  if (response.statusCode == 200) {
    final data = json.decode(response.body);
    return (data['data']['salons'] as List)
        .map((salon) => Salon.fromJson(salon))
        .toList();
  }
  throw Exception('Failed to load featured salons');
}

// Track salon view
static Future<void> trackSalonView(String salonId) async {
  try {
    await http.post(
      Uri.parse('${ApiService.baseUrl}/analytics/salons/$salonId/track-view'),
      headers: await ApiService.getHeaders(),
      body: json.encode({
        'source': 'mobile_app',
        'device_type': Platform.isIOS ? 'ios' : 'android',
      }),
    );
  } catch (e) {
    print('Failed to track salon view: $e');
  }
}
```

2. **Update Salon Model** to include new fields:

```dart
class Salon {
  // ... existing fields ...
  
  final double? trendingScore;
  final int? viewCount;
  final int? bookingCount;
  final int? favoriteCount;
  final bool isFeatured;
  final DateTime? featuredUntil;
  
  // Helper methods
  bool get isNew => DateTime.now().difference(createdAt).inDays < 30;
  bool get isTrending => trendingScore != null && trendingScore! > 50.0;
}
```

3. **Call trackSalonView** when user opens salon details:

```dart
// In salon_details_page.dart initState()
@override
void initState() {
  super.initState();
  SalonService.trackSalonView(widget.salon.id); // Track view
  _loadSalonDetails();
}
```

## 🎯 Salon Owner Integration

### Featured Salon Upgrade Flow

1. **Check Featured Status** (`/api/subscriptions/featured-status`):
   - Shows if salon is featured
   - Lists benefits of becoming featured
   - Returns upgrade URL if not subscribed

2. **Upgrade to Featured** (`/api/subscriptions/upgrade-to-featured`):
   - Creates Stripe Checkout session
   - Redirects to Stripe payment page
   - Returns to app after subscription

### Example: Show Upgrade Card

```dart
// In salon owner settings/profile page
FutureBuilder<FeaturedStatus>(
  future: SubscriptionService.getFeaturedStatus(),
  builder: (context, snapshot) {
    if (snapshot.hasData) {
      final status = snapshot.data!;
      
      if (!status.isFeatured && !status.canBeFeatured) {
        return Card(
          child: Column(
            children: [
              Icon(Icons.star, size: 48, color: Colors.amber),
              Text('Become a Featured Salon!'),
              Text('Get 3x more visibility and bookings'),
              ElevatedButton(
                onPressed: () async {
                  final result = await SubscriptionService.upgradeToFeatured();
                  // Open checkout URL in webview or browser
                  launchUrl(Uri.parse(result.checkoutUrl));
                },
                child: Text('Upgrade to Premium'),
              ),
            ],
          ),
        );
      }
    }
    return SizedBox.shrink();
  },
)
```

## 🔍 API Endpoints Reference

### Analytics Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analytics/salons/trending` | GET | Get trending salons |
| `/api/analytics/salons/new` | GET | Get newly opened salons |
| `/api/analytics/salons/featured` | GET | Get featured salons |
| `/api/analytics/salons/popular-rated` | GET | Get highly rated salons |
| `/api/analytics/salons/:id/track-view` | POST | Track salon view |
| `/api/analytics/salons/:id/analytics` | GET | Get salon analytics (auth required) |

### Subscription Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/subscriptions/featured-status` | GET | Check if salon is/can be featured |
| `/api/subscriptions/upgrade-to-featured` | POST | Create upgrade checkout session |

### Cron Endpoints (Protected by CRON_SECRET)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/cron/update-trending-scores` | GET | Update all trending scores (hourly) |
| `/api/cron/update-featured-status` | GET | Update featured status (daily) |
| `/api/cron/cleanup-old-views` | GET | Remove old view data (daily) |

## 🧪 Testing

### Manual Testing

1. **Test Analytics Tracking**:
```bash
curl -X POST "https://salontime.nl/api/analytics/salons/SALON_ID/track-view" \
  -H "Content-Type: application/json" \
  -d '{"source": "test", "device_type": "web"}'
```

2. **Test Trending Calculation**:
```bash
curl -X GET "https://salontime.nl/api/cron/update-trending-scores" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

3. **Verify Database Changes**:
```sql
-- Check if new columns exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'salons' 
AND column_name IN ('trending_score', 'view_count', 'is_featured');

-- Check analytics data
SELECT * FROM salon_analytics_summary LIMIT 5;

-- Check featured salons
SELECT business_name, is_featured, subscription_plan 
FROM salons 
WHERE is_featured = true;
```

## 📊 Monitoring

### Vercel Logs

Monitor cron job execution:
1. Go to Vercel Dashboard → Deployments
2. Click on latest deployment → Logs
3. Filter by "Cron" to see scheduled job executions

### Database Monitoring

Check analytics data growth:

```sql
-- Views per day
SELECT DATE(viewed_at) as date, COUNT(*) as views
FROM salon_views
WHERE viewed_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(viewed_at)
ORDER BY date DESC;

-- Top trending salons
SELECT business_name, trending_score, view_count, booking_count
FROM salons
ORDER BY trending_score DESC
LIMIT 10;
```

## 🐛 Troubleshooting

### Cron Jobs Not Running

1. Check Vercel cron configuration:
   ```bash
   vercel env ls
   # Ensure CRON_SECRET is set
   ```

2. Verify cron endpoint manually:
   ```bash
   curl "https://salontime.nl/api/cron/update-trending-scores" \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

3. Check Vercel logs for errors

### Trending Scores Not Updating

1. Check database function exists:
   ```sql
   SELECT routine_name FROM information_schema.routines 
   WHERE routine_name = 'calculate_salon_trending_score';
   ```

2. Manually run calculation:
   ```sql
   SELECT update_all_trending_scores();
   ```

### Featured Salons Not Showing

1. Verify subscription data:
   ```sql
   SELECT business_name, subscription_plan, subscription_status, is_featured
   FROM salons
   WHERE subscription_plan IN ('premium', 'professional', 'enterprise');
   ```

2. Manually set featured:
   ```sql
   UPDATE salons
   SET is_featured = true,
       featured_until = subscription_ends_at
   WHERE subscription_status = 'active'
   AND subscription_plan = 'premium';
   ```

## ✅ Post-Deployment Checklist

- [ ] Database migration executed successfully
- [ ] Environment variables added to Vercel
- [ ] Cron jobs configured and running
- [ ] Initial trending scores calculated
- [ ] Test endpoints responding correctly
- [ ] Frontend updated to use new endpoints
- [ ] Salon owner upgrade flow tested
- [ ] Analytics tracking working
- [ ] Monitoring dashboard checked

## 🎉 Success Metrics

After deployment, you should see:

- ✅ Salon views being tracked in `salon_views` table
- ✅ Trending scores updating hourly
- ✅ Featured salons showing correct `is_featured` flag
- ✅ Cron jobs running without errors in Vercel logs
- ✅ New category endpoints returning data
- ✅ Salon owners can see upgrade prompt

## 📚 Additional Resources

- [Vercel Cron Documentation](https://vercel.com/docs/cron-jobs)
- [Supabase Functions](https://supabase.com/docs/guides/database/functions)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)

## 🆘 Need Help?

If you encounter issues:

1. Check Vercel deployment logs
2. Review Supabase database logs
3. Test endpoints with Postman/curl
4. Check environment variables are set correctly

---

**Deployed by**: DotCorr Agency  
**Last Updated**: October 23, 2025  
**Version**: 2.0.0

