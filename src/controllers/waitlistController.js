const { supabase } = require('../config/database');
const emailService = require('../services/emailService');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

class WaitlistController {
  // Join waitlist when booking slot is full
  joinWaitlist = asyncHandler(async (req, res) => {
    const {
      salon_id,
      service_id,
      staff_id,
      requested_date,
      requested_time,
      preferred_time_range,
      notes
    } = req.body;

    // Validate required fields
    if (!salon_id || !service_id || !requested_date) {
      throw new AppError('Missing required waitlist information', 400, 'MISSING_WAITLIST_INFO');
    }

    try {
      // Check if user is already on waitlist for this slot
      const { data: existingEntry } = await supabase
        .from('waitlist')
        .select('id')
        .eq('client_id', req.user.id)
        .eq('salon_id', salon_id)
        .eq('service_id', service_id)
        .eq('requested_date', requested_date)
        .eq('status', 'waiting')
        .single();

      if (existingEntry) {
        throw new AppError('You are already on the waitlist for this time slot', 409, 'ALREADY_ON_WAITLIST');
      }

      // Get service and salon details
      const { data: service } = await supabase
        .from('services')
        .select('*, salons(*)')
        .eq('id', service_id)
        .single();

      if (!service) {
        throw new AppError('Service not found', 404, 'SERVICE_NOT_FOUND');
      }

      // Create waitlist entry
      const { data: waitlistEntry, error } = await supabase
        .from('waitlist')
        .insert([{
          client_id: req.user.id,
          salon_id,
          service_id,
          staff_id,
          requested_date,
          requested_time,
          preferred_time_range,
          status: 'waiting'
        }])
        .select(`
          *,
          services(*),
          salons(*),
          user_profiles!client_id(*)
        `)
        .single();

      if (error) {
        throw new AppError('Failed to join waitlist', 500, 'WAITLIST_JOIN_FAILED');
      }

      // Send confirmation email
      const { data: client } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', req.user.id)
        .single();

      if (client) {
        emailService.sendWaitlistConfirmation(
          { ...waitlistEntry, service_name: service.name },
          client,
          service.salons
        );
      }

      res.status(201).json({
        success: true,
        data: { waitlistEntry },
        message: 'Successfully joined the waitlist'
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to join waitlist', 500, 'WAITLIST_JOIN_FAILED');
    }
  });

  // Get user's waitlist entries
  getMyWaitlist = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    try {
      const { data: waitlistEntries, error, count } = await supabase
        .from('waitlist')
        .select(`
          *,
          services(*),
          salons(*),
          staff(*)
        `, { count: 'exact' })
        .eq('client_id', req.user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new AppError('Failed to fetch waitlist', 500, 'WAITLIST_FETCH_FAILED');
      }

      res.status(200).json({
        success: true,
        data: {
          waitlistEntries,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count,
            totalPages: Math.ceil(count / limit)
          }
        }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to fetch waitlist', 500, 'WAITLIST_FETCH_FAILED');
    }
  });

  // Leave waitlist
  leaveWaitlist = asyncHandler(async (req, res) => {
    const { waitlistId } = req.params;

    try {
      // Check if entry belongs to user
      const { data: waitlistEntry } = await supabase
        .from('waitlist')
        .select('*')
        .eq('id', waitlistId)
        .eq('client_id', req.user.id)
        .single();

      if (!waitlistEntry) {
        throw new AppError('Waitlist entry not found', 404, 'WAITLIST_ENTRY_NOT_FOUND');
      }

      // Update status to cancelled
      const { error } = await supabase
        .from('waitlist')
        .update({ status: 'cancelled' })
        .eq('id', waitlistId);

      if (error) {
        throw new AppError('Failed to leave waitlist', 500, 'WAITLIST_LEAVE_FAILED');
      }

      res.status(200).json({
        success: true,
        message: 'Successfully left the waitlist'
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to leave waitlist', 500, 'WAITLIST_LEAVE_FAILED');
    }
  });

  // Get salon's waitlist (for salon owners)
  getSalonWaitlist = asyncHandler(async (req, res) => {
    const { status, date, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    try {
      // Get user's salon
      const { data: salon } = await supabase
        .from('salons')
        .select('id')
        .eq('owner_id', req.user.id)
        .single();

      if (!salon) {
        throw new AppError('Salon not found', 404, 'SALON_NOT_FOUND');
      }

      let query = supabase
        .from('waitlist')
        .select(`
          *,
          services(*),
          user_profiles!client_id(*),
          staff(*)
        `, { count: 'exact' })
        .eq('salon_id', salon.id)
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);

      // Apply filters
      if (status) {
        query = query.eq('status', status);
      }

      if (date) {
        query = query.eq('requested_date', date);
      }

      const { data: waitlistEntries, error, count } = await query;

      if (error) {
        throw new AppError('Failed to fetch salon waitlist', 500, 'SALON_WAITLIST_FETCH_FAILED');
      }

      res.status(200).json({
        success: true,
        data: {
          waitlistEntries,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count,
            totalPages: Math.ceil(count / limit)
          }
        }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to fetch salon waitlist', 500, 'SALON_WAITLIST_FETCH_FAILED');
    }
  });

  // Process waitlist when booking is cancelled (internal method)
  async processWaitlistForCancelledBooking(salonId, serviceId, cancelledDate, cancelledTime) {
    try {
      console.log(`🔄 Processing waitlist for cancelled booking: ${salonId}, ${serviceId}, ${cancelledDate}, ${cancelledTime}`);

      // Find waitlist entries that match the cancelled slot
      const { data: waitlistEntries } = await supabase
        .from('waitlist')
        .select(`
          *,
          services(*),
          user_profiles!client_id(*),
          salons(*)
        `)
        .eq('salon_id', salonId)
        .eq('service_id', serviceId)
        .eq('requested_date', cancelledDate)
        .eq('status', 'waiting')
        .order('created_at', { ascending: true })
        .limit(1); // Get the first person in line

      if (!waitlistEntries || waitlistEntries.length === 0) {
        console.log('ℹ️  No waitlist entries found for cancelled booking');
        return;
      }

      const waitlistEntry = waitlistEntries[0];

      // Update waitlist entry status
      await supabase
        .from('waitlist')
        .update({
          status: 'notified',
          notification_sent: true,
          notification_sent_at: new Date().toISOString()
        })
        .eq('id', waitlistEntry.id);

      // Send notification email
      emailService.sendWaitlistNotification(
        waitlistEntry,
        waitlistEntry.user_profiles,
        waitlistEntry.salons
      );

      console.log(`✅ Notified waitlist user: ${waitlistEntry.user_profiles.first_name} ${waitlistEntry.user_profiles.last_name}`);

    } catch (error) {
      console.error('❌ Error processing waitlist for cancelled booking:', error);
    }
  }

  // Clean up expired waitlist entries (runs daily)
  static async cleanupExpiredWaitlistEntries() {
    try {
      const { data: expiredEntries, error } = await supabase
        .from('waitlist')
        .update({ status: 'expired' })
        .eq('status', 'waiting')
        .lt('expires_at', new Date().toISOString())
        .select('id');

      if (error) {
        console.error('❌ Error cleaning up expired waitlist entries:', error);
        return;
      }

      if (expiredEntries && expiredEntries.length > 0) {
        console.log(`🧹 Expired ${expiredEntries.length} waitlist entries`);
      }

    } catch (error) {
      console.error('❌ Error during waitlist cleanup:', error);
    }
  }
}

module.exports = new WaitlistController();

