# STRIPE COUNTRY BUG FIX

## Problem
When creating a salon, the Stripe Connect account creation fails with:
```
Country is required for Stripe account creation. Please update your salon address.
```

## Root Cause
The Flutter app sends `country` field when creating a salon, BUT:
1. ❌ Backend receives it but **doesn't save it to database**
2. ❌ Database table `salons` has **no `country` column**
3. ❌ When creating Stripe account, backend looks for `salon.address?.country` (wrong path)

## Solution Applied

### 1. ✅ Backend Code Fixed (`src/controllers/salonController.js`)

**Added country to destructuring:**
```javascript
const {
  business_name,
  description,
  address,
  city,
  state,
  zip_code,
  country,  // ← ADDED THIS
  phone,
  email,
  business_hours
} = req.body;
```

**Added country to database insert:**
```javascript
const { data: salon, error } = await supabaseAdmin
  .from('salons')
  .insert([{
    owner_id: req.user.id,
    business_name,
    description,
    address,
    city,
    state,
    zip_code,
    country: country || 'US',  // ← ADDED THIS
    phone,
    email,
    business_hours
  }])
```

**Fixed Stripe account creation check:**
```javascript
// OLD (WRONG):
if (!salon.address?.country) {
  throw new AppError('Country is required...', 400, 'MISSING_COUNTRY');
}

// NEW (CORRECT):
if (!salon.country) {
  throw new AppError('Country is required...', 400, 'MISSING_COUNTRY');
}
```

**Fixed country in Stripe service call:**
```javascript
// OLD:
country: salon.address?.country

// NEW:
country: salon.country
```

Also fixed in automatic Stripe account creation (line ~103):
```javascript
country: salon.country || 'US'
```

### 2. ⏳ Database Migration Required

**Run this SQL in Supabase SQL Editor:**

```sql
-- Add country column to salons table
ALTER TABLE public.salons 
ADD COLUMN country VARCHAR(2) DEFAULT 'US';

COMMENT ON COLUMN public.salons.country IS 'ISO 3166-1 alpha-2 country code (e.g., US, NL, GB). Required for Stripe Connect.';

-- Update existing salons with likely countries based on address data
UPDATE public.salons 
SET country = 'NL' 
WHERE country IS NULL 
AND (city ILIKE '%nederland%' OR state ILIKE '%holland%' OR zip_code ~ '^[0-9]{4}[A-Z]{2}$');

UPDATE public.salons 
SET country = 'US' 
WHERE country IS NULL;
```

### 3. ✅ Flutter Already Sends Country

The Flutter app (`salon_owner_onboarding_page.dart`) correctly sends:
```dart
'country': _selectedCountry?.countryCode ?? 'US',
```

## How to Apply the Fix

1. **Run the SQL migration** in Supabase SQL Editor (copy from above)
2. **Deploy backend changes** (code already fixed in `salonController.js`)
3. **Restart backend server** on Vercel/your hosting
4. **Test**: Create a new salon - country should now be saved

## Testing the Fix

After applying:
1. Delete the test salon you created (if it has no country)
2. Create a new salon from the app
3. Check database - `country` field should have value (e.g., 'NL', 'US')
4. Try creating Stripe account - should work now!

## Files Changed
- ✅ `salontime-backend/src/controllers/salonController.js` - Fixed 4 places
- ⏳ `database/migrations/add_country_to_salons.sql` - Migration file created
- ✅ `run-migration.js` - Helper script created (but needs manual SQL run)

## Why It Failed Before
```
Flutter sends: { country: 'NL' }
         ↓
Backend receives but ignores it
         ↓
Database has no country column
         ↓
Stripe creation checks salon.address?.country (undefined!)
         ↓
Error: "Country is required"
```

## After Fix
```
Flutter sends: { country: 'NL' }
         ↓
Backend saves to database: country = 'NL'
         ↓
Database now has country column with 'NL'
         ↓
Stripe creation uses salon.country ('NL')
         ↓
✅ Stripe account created successfully!
```

