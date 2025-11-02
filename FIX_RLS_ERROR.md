# Fix RLS Error - Step by Step

## 🔴 Problem
Getting error: `new row violates row-level security policy for table "bookings"`

## ✅ Solution

### Step 1: Run the Migration
Go to your Supabase Dashboard → SQL Editor → Run this SQL:

```sql
-- Comprehensive fix for bookings RLS policies
BEGIN;

-- Drop ALL existing booking policies to start fresh
DROP POLICY IF EXISTS "Clients can manage their bookings" ON public.bookings;
DROP POLICY IF EXISTS "Salon owners can manage salon bookings" ON public.bookings;
DROP POLICY IF EXISTS "Staff can manage salon bookings" ON public.bookings;
DROP POLICY IF EXISTS "Staff can view salon bookings" ON public.bookings;

-- Recreate policies with proper WITH CHECK clauses

-- 1. Clients can manage their bookings (INSERT, SELECT, UPDATE, DELETE)
DO $$
BEGIN
    CREATE POLICY "Clients can manage their bookings" ON public.bookings
        FOR ALL 
        USING (auth.uid() = client_id)
        WITH CHECK (auth.uid() = client_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Salon owners can manage bookings at their salons
DO $$
BEGIN
    CREATE POLICY "Salon owners can manage salon bookings" ON public.bookings
        FOR ALL 
        USING (
            EXISTS (
                SELECT 1 FROM public.salons 
                WHERE salons.id = bookings.salon_id 
                AND salons.owner_id = auth.uid()
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.salons 
                WHERE salons.id = bookings.salon_id 
                AND salons.owner_id = auth.uid()
            )
        );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 3. Staff can view and update bookings at their salon
DO $$
BEGIN
    CREATE POLICY "Staff can manage salon bookings" ON public.bookings
        FOR ALL 
        USING (
            EXISTS (
                SELECT 1 FROM public.staff 
                WHERE staff.salon_id = bookings.salon_id 
                AND staff.user_id = auth.uid()
                AND staff.is_active = true
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.staff 
                WHERE staff.salon_id = bookings.salon_id 
                AND staff.user_id = auth.uid()
                AND staff.is_active = true
            )
        );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

COMMIT;
```

### Step 2: Code Fix Applied ✅
I've updated the code to pass the user's auth token to Supabase. The booking controller now uses `getAuthenticatedClient(req.token)` which passes the token in the Authorization header so RLS can verify `auth.uid()`.

### Step 3: Restart Backend Server
```bash
# Restart your backend server
npm restart
# or
pm2 restart all
```

### Step 4: Test
Try creating a booking again - it should work now!

---

## 🎯 What Was Fixed

1. **Code**: Updated `bookingController.js` to use authenticated Supabase client that passes user token
2. **Database**: Migration ensures RLS policies have `WITH CHECK` clauses for INSERT operations
3. **Auth Context**: Supabase client now includes `Authorization: Bearer <token>` header so RLS can access `auth.uid()`

---

## 🔍 If Still Not Working

Check:
1. Migration was run successfully (check Supabase Dashboard → Policies)
2. User token is being passed correctly (check `req.token` in logs)
3. `client_id` matches `auth.uid()` (check the booking creation log)

If still failing, check the exact error message and verify the RLS policies are active in Supabase Dashboard.

