# User Profile and Auth Fixes

## Date: October 24, 2025

## Issues Fixed

### 1. Role Switching Failure (500 Error)
**Problem:** When users tried to switch roles (client ↔ salon owner), the API returned 500 errors with "Failed to update user profile".

**Root Cause:** The `role` column may not exist in the production database `user_profiles` table, or the column constraints were incorrect.

**Solution:**
- Created migration file: `database/migrations/ensure_role_column.sql`
- The migration safely adds the `role` column if it doesn't exist
- Adds proper CHECK constraint: `role IN ('client', 'salon_owner', 'staff', 'admin')`
- Updates NULL roles to 'client' by default
- Creates index on role column for performance

**Files Modified:**
- `database/migrations/ensure_role_column.sql` (NEW)
- `run-role-migration.js` (NEW) - Helper script to run the migration

**To Apply:**
1. Go to Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
2. Copy contents of `database/migrations/ensure_role_column.sql`
3. Execute the SQL

---

### 2. Stripe Onboarding Redirects to Localhost
**Problem:** After completing Stripe Connect onboarding, users were redirected to `localhost:3000` instead of production URL (www.salontime.nl).

**Root Cause:** The `returnUrl` and `refreshUrl` in Stripe account link creation were pointing to specific routes like `/salon-owner/stripe/return`, but:
1. These routes don't exist in the Flutter app
2. FRONTEND_URL environment variable may have been set to localhost

**Solution:**
- Updated both Stripe redirect URLs to use FRONTEND_URL root: `${process.env.FRONTEND_URL}`
- The web app's `AppInitializer` automatically routes users based on their role
- Salon owners are automatically directed to dashboard or onboarding as needed

**Files Modified:**
- `src/controllers/salonController.js`:
  - Line ~133: Auto-creation Stripe link redirects
  - Line ~459-460: Manual onboarding link redirects

**Environment Variable Check:**
- Ensure `FRONTEND_URL` in Vercel is set to: `https://www.salontime.nl`
- NOT: `http://localhost:3000`

---

### 3. Can Swipe Back After Logout
**Problem:** After logging out and reaching the auth page, users could swipe back to access their previous profile page.

**Root Cause:** The app was using `Navigator.of(context).pushReplacementNamed('/auth')` which only replaces the current route but doesn't clear the navigation stack.

**Solution:**
- Changed all logout navigation calls to use `pushNamedAndRemoveUntil`:
```dart
Navigator.of(context).pushNamedAndRemoveUntil(
  '/auth',
  (route) => false, // Remove all previous routes
);
```

**Files Modified:**
- `lib/features/client/profile/pages/profile_page.dart`:
  - `_logout()` method (line ~920)
  - Auth error handlers (lines ~81, ~99)
  
- `lib/features/salon_owner/pages/sub_pages/salon_owner_profile_page.dart`:
  - `_logout()` method (line ~1106)

---

## Testing Checklist

### Role Switching
- [ ] User with client role can switch to salon_owner role
- [ ] User with salon_owner role can switch to client role
- [ ] Role persists after app restart
- [ ] Profile page shows correct role after switching
- [ ] No 500 errors in Vercel logs during role switch

### Stripe Onboarding
- [ ] Creating new salon account triggers Stripe onboarding
- [ ] After completing Stripe onboarding, user is redirected to www.salontime.nl
- [ ] User lands on salon owner dashboard (not client UI)
- [ ] No localhost URLs in Stripe redirect flow
- [ ] Stripe account status updates correctly in database

### Logout Navigation
- [ ] Client user logs out and cannot swipe back to profile
- [ ] Salon owner logs out and cannot swipe back to profile
- [ ] After logout, user must re-authenticate to access protected pages
- [ ] Auth page is the only page visible after logout
- [ ] Navigation stack is completely cleared

---

## Deployment Steps

1. **Run Database Migration** (CRITICAL - Do this first):
   ```sql
   -- Run in Supabase SQL Editor
   -- Copy from: database/migrations/ensure_role_column.sql
   ```

2. **Verify Environment Variables**:
   ```bash
   vercel env ls
   # Check that FRONTEND_URL = https://www.salontime.nl
   # If not, update it via Vercel Dashboard
   ```

3. **Deploy Backend**:
   ```bash
   cd salontime-backend
   git add .
   git commit -m "Fix: Role switching, Stripe redirects, and logout navigation"
   git push origin main
   # Vercel auto-deploys
   ```

4. **Deploy Flutter App**:
   ```bash
   cd ../salon_time
   # Build and deploy to your hosting
   ```

---

## API Changes

### Updated Endpoints
No new endpoints, but behavior changes:

- `PUT /api/user/profile` - Now properly updates the `role` field
- Stripe redirect URLs now point to app root instead of specific routes

---

## Database Changes

### New Columns
- `user_profiles.role` - VARCHAR(20) with CHECK constraint

### New Indexes
- `idx_user_profiles_role` - Speeds up role-based queries

---

## Known Issues / Future Improvements

1. **Deep Linking**: Consider adding deep link support for Stripe callbacks to directly open Flutter app instead of web app
2. **Role Validation**: Add backend validation to ensure users can only switch to roles they're authorized for
3. **Audit Trail**: Consider logging role changes for security/compliance

---

## Rollback Plan

If issues occur:

1. **Database**: The migration is additive and safe. If needed, role column can be made NULL:
   ```sql
   ALTER TABLE public.user_profiles ALTER COLUMN role DROP NOT NULL;
   ```

2. **Backend**: Revert to previous commit:
   ```bash
   git revert HEAD
   git push origin main
   ```

3. **Frontend**: Revert logout navigation changes if they cause issues

---

## Support Information

- Backend Logs: Vercel Dashboard → salontime-backend → Logs
- Database: Supabase Dashboard → Table Editor → user_profiles
- Environment Variables: Vercel Dashboard → Settings → Environment Variables

