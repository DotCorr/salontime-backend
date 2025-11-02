# Booking System Enhancements - Summary

All 4 enhancements have been implemented:

## ✅ 1. Staff Permissions for Managing Bookings

**What was added:**
- Staff members can now update booking status (confirm, complete, cancel, mark no-show)
- Staff can add salon notes to bookings
- Staff can view all bookings at their salon

**Files modified:**
- `salontime-backend/src/controllers/bookingController.js` - Added staff permission checks
- `salontime-backend/database/migrations/add_staff_booking_permissions.sql` - Added RLS policy for staff

**RLS Policy:**
- New policy: "Staff can manage salon bookings" - allows staff to UPDATE bookings at their salon

**How it works:**
- When updating booking status, system checks if user is:
  1. Salon owner (full access)
  2. Client (can only cancel)
  3. Staff at the salon (can update status and add notes)

---

## ✅ 2. Booking Rescheduling

**What was added:**
- Clients can reschedule their bookings (change date/time)
- Rescheduled bookings reset to 'pending' status for salon reconfirmation
- Conflict checking ensures new time slot is available
- Email notifications sent to both client and salon

**New endpoint:**
```
PATCH /api/bookings/:bookingId/reschedule
Body: { appointment_date, start_time }
```

**Files modified:**
- `salontime-backend/src/controllers/bookingController.js` - Added `rescheduleBooking` method
- `salontime-backend/src/services/emailService.js` - Added reschedule email templates
- `salontime-backend/src/routes/bookingRoutes.js` - Added reschedule route

**Rules:**
- Only clients can reschedule their own bookings
- Can only reschedule 'pending' or 'confirmed' bookings
- New time slot must be available (no conflicts)
- Status resets to 'pending' for salon to reconfirm

---

## ✅ 3. Booking Reminders System

**What was added:**
- Automated reminder service for upcoming bookings
- Sends reminders 24 hours before appointment
- Sends same-day reminders
- Email notifications to clients

**Files created:**
- `salontime-backend/src/services/bookingRemindersService.js` - Reminder service
- `salontime-backend/src/jobs/bookingRemindersJob.js` - Cron job runner

**How to use:**
1. **Manual trigger (for testing):**
   ```
   GET /api/bookings/reminders?hoursAhead=24
   ```

2. **Automated (cron):**
   ```bash
   # Run every hour
   0 * * * * cd /path/to/salontime-backend && node src/jobs/bookingRemindersJob.js
   ```

   Or add to your app.js:
   ```javascript
   const cron = require('node-cron');
   const { runReminders } = require('./jobs/bookingRemindersJob');
   
   // Run every hour at minute 0
   cron.schedule('0 * * * *', runReminders);
   ```

**Features:**
- Checks for bookings 24 hours ahead
- Checks for same-day bookings
- Sends email reminders to clients
- Logs all reminder sends

---

## ✅ 4. Payment Linking to Bookings

**What was added:**
- Payments are automatically created when bookings are created
- Payment record linked via `booking_id` foreign key
- Payment starts as 'pending' status
- Can be updated via Stripe webhooks or payment confirmation

**Files modified:**
- `salontime-backend/src/controllers/bookingController.js` - Auto-creates payment record on booking creation

**How it works:**
- When booking is created, a payment record is automatically created:
  ```javascript
  {
    booking_id: booking.id,
    amount: service.price,
    currency: service.currency || 'EUR',
    status: 'pending'
  }
  ```
- Payment status can be updated later via:
  - Stripe webhooks (when payment succeeds)
  - Payment confirmation endpoint
  - Manual update

**Note:**
- Payment creation is non-blocking (booking still succeeds if payment record fails)
- Payment can also be created separately before booking and linked via booking_id

---

## Database Migrations Required

Run these migrations in order:

1. **Fix bookings RLS for INSERT:**
   ```sql
   -- Run: fix_bookings_rls_insert.sql
   ```

2. **Add staff booking permissions:**
   ```sql
   -- Run: add_staff_booking_permissions.sql
   ```

---

## API Endpoints Added

1. **Reschedule Booking:**
   ```
   PATCH /api/bookings/:bookingId/reschedule
   Authorization: Bearer <token>
   Body: {
     "appointment_date": "2025-11-06",
     "start_time": "15:00:00"
   }
   ```

2. **Send Reminders (Admin/Testing):**
   ```
   GET /api/bookings/reminders?hoursAhead=24
   Authorization: Bearer <token>
   ```

---

## Updated Permissions Summary

| Action | Client | Salon Owner | Staff |
|--------|--------|-------------|-------|
| Create Booking | ✅ | ❌ | ❌ |
| View Own Bookings | ✅ | ❌ | ❌ |
| View Salon Bookings | ❌ | ✅ | ✅ |
| Cancel Booking | ✅ (own only) | ✅ (salon) | ✅ (salon) |
| Reschedule Booking | ✅ (own only) | ❌ | ❌ |
| Confirm Booking | ❌ | ✅ | ✅ |
| Complete Booking | ❌ | ✅ | ✅ |
| Mark No-Show | ❌ | ✅ | ✅ |
| Add Salon Notes | ❌ | ✅ | ✅ |

---

## Next Steps

1. **Run migrations:**
   - `fix_bookings_rls_insert.sql` (CRITICAL - fixes booking creation)
   - `add_staff_booking_permissions.sql` (for staff access)

2. **Set up reminders cron job:**
   - Add to your server's cron or use node-cron
   - Recommended: Run hourly

3. **Test all features:**
   - Create booking (should auto-create payment)
   - Reschedule booking
   - Test staff permissions
   - Test reminder service

---

All enhancements are complete and ready to use! 🎉

