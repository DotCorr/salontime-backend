const { supabase } = require('../config/database');
const emailService = require('./emailService');

/**
 * Booking Reminders Service
 * Handles sending reminder notifications for upcoming bookings
 */
class BookingRemindersService {
  /**
   * Send reminders for bookings happening in the next 24 hours
   * Should be run as a scheduled job (cron)
   */
  async sendUpcomingReminders() {
    try {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const todayStr = now.toISOString().split('T')[0];
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      console.log('📧 Checking for bookings to remind...');

      // Get all confirmed bookings happening tomorrow
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          *,
          services(*),
          salons(*),
          user_profiles!client_id(*)
        `)
        .in('status', ['pending', 'confirmed'])
        .eq('appointment_date', tomorrowStr);

      if (error) {
        console.error('❌ Error fetching bookings for reminders:', error);
        return;
      }

      if (!bookings || bookings.length === 0) {
        console.log('✅ No bookings to remind');
        return;
      }

      console.log(`📧 Found ${bookings.length} bookings to remind`);

      // Send reminders
      for (const booking of bookings) {
        try {
          // Check if reminder already sent (could add reminder_sent_at column later)
          await emailService.sendBookingReminder(
            { ...booking, service_name: booking.services?.name },
            booking.user_profiles,
            booking.salons
          );
          console.log(`✅ Sent reminder for booking ${booking.id}`);
        } catch (error) {
          console.error(`❌ Failed to send reminder for booking ${booking.id}:`, error);
        }
      }

      return { success: true, count: bookings.length };
    } catch (error) {
      console.error('❌ Error in sendUpcomingReminders:', error);
      throw error;
    }
  }

  /**
   * Send reminders for bookings happening in the next X hours
   * @param {number} hoursAhead - How many hours ahead to check (default 24)
   */
  async sendRemindersForHoursAhead(hoursAhead = 24) {
    try {
      const now = new Date();
      const targetTime = new Date(now.getTime() + (hoursAhead * 60 * 60 * 1000));
      
      const targetDateStr = targetTime.toISOString().split('T')[0];
      const targetTimeStr = targetTime.toTimeString().slice(0, 5);

      console.log(`📧 Checking for bookings ${hoursAhead} hours ahead (${targetDateStr} ${targetTimeStr})...`);

      // Get bookings on the target date around the target time
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          *,
          services(*),
          salons(*),
          user_profiles!client_id(*)
        `)
        .in('status', ['pending', 'confirmed'])
        .eq('appointment_date', targetDateStr)
        .lte('start_time', targetTimeStr);

      if (error) {
        console.error('❌ Error fetching bookings:', error);
        return;
      }

      if (!bookings || bookings.length === 0) {
        console.log('✅ No bookings to remind');
        return;
      }

      console.log(`📧 Found ${bookings.length} bookings to remind`);

      for (const booking of bookings) {
        try {
          await emailService.sendBookingReminder(
            { ...booking, service_name: booking.services?.name },
            booking.user_profiles,
            booking.salons
          );
          console.log(`✅ Sent reminder for booking ${booking.id}`);
        } catch (error) {
          console.error(`❌ Failed to send reminder for booking ${booking.id}:`, error);
        }
      }

      return { success: true, count: bookings.length };
    } catch (error) {
      console.error('❌ Error in sendRemindersForHoursAhead:', error);
      throw error;
    }
  }

  /**
   * Send same-day reminders (for bookings happening today)
   */
  async sendSameDayReminders() {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const now = new Date();
      const currentTimeStr = now.toTimeString().slice(0, 5);

      console.log('📧 Checking for same-day bookings to remind...');

      // Get bookings happening today, starting after current time
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          *,
          services(*),
          salons(*),
          user_profiles!client_id(*)
        `)
        .in('status', ['pending', 'confirmed'])
        .eq('appointment_date', todayStr)
        .gte('start_time', currentTimeStr);

      if (error) {
        console.error('❌ Error fetching bookings:', error);
        return;
      }

      if (!bookings || bookings.length === 0) {
        console.log('✅ No same-day bookings to remind');
        return;
      }

      console.log(`📧 Found ${bookings.length} same-day bookings to remind`);

      for (const booking of bookings) {
        try {
          await emailService.sendBookingReminder(
            { ...booking, service_name: booking.services?.name },
            booking.user_profiles,
            booking.salons
          );
          console.log(`✅ Sent same-day reminder for booking ${booking.id}`);
        } catch (error) {
          console.error(`❌ Failed to send reminder for booking ${booking.id}:`, error);
        }
      }

      return { success: true, count: bookings.length };
    } catch (error) {
      console.error('❌ Error in sendSameDayReminders:', error);
      throw error;
    }
  }
}

module.exports = new BookingRemindersService();

