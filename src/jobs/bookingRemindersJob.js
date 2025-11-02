/**
 * Booking Reminders Job
 * 
 * This job should be run on a schedule (e.g., via cron or node-cron)
 * Recommended schedule: Run every hour to check for bookings needing reminders
 * 
 * Usage:
 * - Add to cron: "0 * * * * node jobs/bookingRemindersJob.js"
 * - Or use node-cron in your main app: cron.schedule('0 * * * *', ...)
 */

const bookingRemindersService = require('../services/bookingRemindersService');

async function runReminders() {
  try {
    console.log('🕐 Starting booking reminders job...');
    
    // Send reminders for bookings 24 hours ahead
    await bookingRemindersService.sendUpcomingReminders();
    
    // Also send same-day reminders (for bookings happening today)
    await bookingRemindersService.sendSameDayReminders();
    
    console.log('✅ Booking reminders job completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Booking reminders job failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runReminders();
}

module.exports = { runReminders };

