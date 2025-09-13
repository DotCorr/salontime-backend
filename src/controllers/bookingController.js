const { supabase } = require('../config/database');
const emailService = require('../services/emailService');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

class BookingController {
  // Create new booking
  createBooking = asyncHandler(async (req, res) => {
    const {
      salon_id,
      service_id,
      staff_id,
      appointment_date,
      start_time,
      client_notes,
      family_member_id
    } = req.body;

    // Validate required fields
    if (!salon_id || !service_id || !appointment_date || !start_time) {
      throw new AppError('Missing required booking information', 400, 'MISSING_BOOKING_INFO');
    }

    try {
      // Get service details
      const { data: service, error: serviceError } = await supabase
        .from('services')
        .select('*, salons(*)')
        .eq('id', service_id)
        .single();

      if (serviceError || !service) {
        throw new AppError('Service not found', 404, 'SERVICE_NOT_FOUND');
      }

      // Calculate end time
      const startTime = new Date(`${appointment_date}T${start_time}`);
      const endTime = new Date(startTime.getTime() + service.duration * 60000);
      const endTimeStr = endTime.toTimeString().split(' ')[0].slice(0, 5);

      // Check for conflicts
      const { data: conflicts } = await supabase
        .from('bookings')
        .select('id')
        .eq('salon_id', salon_id)
        .eq('appointment_date', appointment_date)
        .neq('status', 'cancelled')
        .or(`start_time.lte.${start_time},end_time.gte.${endTimeStr}`)
        .or(`start_time.lt.${endTimeStr},end_time.gt.${start_time}`);

      if (conflicts && conflicts.length > 0) {
        throw new AppError('Time slot not available', 409, 'TIME_SLOT_CONFLICT');
      }

      // Determine client ID (could be family member)
      let clientId = req.user.id;
      if (family_member_id) {
        const { data: familyMember } = await supabase
          .from('family_members')
          .select('id')
          .eq('id', family_member_id)
          .eq('parent_id', req.user.id)
          .single();

        if (!familyMember) {
          throw new AppError('Family member not found', 404, 'FAMILY_MEMBER_NOT_FOUND');
        }
      }

      // Create booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert([{
          client_id: clientId,
          salon_id,
          service_id,
          staff_id,
          appointment_date,
          start_time,
          end_time: endTimeStr,
          client_notes,
          total_amount: service.price,
          status: 'pending'
        }])
        .select(`
          *,
          services(*),
          salons(*),
          staff(*)
        `)
        .single();

      if (bookingError) {
        throw new AppError('Failed to create booking', 500, 'BOOKING_CREATION_FAILED');
      }

      // Send confirmation email
      const { data: client } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', clientId)
        .single();

      emailService.sendBookingConfirmation(
        { ...booking, service_name: service.name },
        client,
        service.salons
      );

      res.status(201).json({
        success: true,
        data: { booking }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to create booking', 500, 'BOOKING_CREATION_FAILED');
    }
  });

  // Get user's bookings
  getMyBookings = asyncHandler(async (req, res) => {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    try {
      let query = supabase
        .from('bookings')
        .select(`
          *,
          services(*),
          salons(*),
          staff(*),
          payments(*)
        `)
        .eq('client_id', req.user.id)
        .order('appointment_date', { ascending: false })
        .order('start_time', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) {
        query = query.eq('status', status);
      }

      const { data: bookings, error } = await query;

      if (error) {
        throw new AppError('Failed to fetch bookings', 500, 'BOOKINGS_FETCH_FAILED');
      }

      res.status(200).json({
        success: true,
        data: {
          bookings,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit)
          }
        }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to fetch bookings', 500, 'BOOKINGS_FETCH_FAILED');
    }
  });

  // Get salon's bookings (for salon owners)
  getSalonBookings = asyncHandler(async (req, res) => {
    const { status, date, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    try {
      // Get user's salon
      const { data: salon, error: salonError } = await supabase
        .from('salons')
        .select('id')
        .eq('owner_id', req.user.id)
        .single();

      if (salonError || !salon) {
        throw new AppError('Salon not found', 404, 'SALON_NOT_FOUND');
      }

      let query = supabase
        .from('bookings')
        .select(`
          *,
          services(*),
          user_profiles!client_id(*),
          staff(*),
          payments(*)
        `)
        .eq('salon_id', salon.id)
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true })
        .range(offset, offset + limit - 1);

      if (status) {
        query = query.eq('status', status);
      }

      if (date) {
        query = query.eq('appointment_date', date);
      }

      const { data: bookings, error } = await query;

      if (error) {
        throw new AppError('Failed to fetch salon bookings', 500, 'SALON_BOOKINGS_FETCH_FAILED');
      }

      res.status(200).json({
        success: true,
        data: {
          bookings,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit)
          }
        }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to fetch salon bookings', 500, 'SALON_BOOKINGS_FETCH_FAILED');
    }
  });

  // Update booking status
  updateBookingStatus = asyncHandler(async (req, res) => {
    const { bookingId } = req.params;
    const { status, staff_notes } = req.body;

    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'];
    if (!validStatuses.includes(status)) {
      throw new AppError('Invalid booking status', 400, 'INVALID_STATUS');
    }

    try {
      // Check if user owns the salon or is the client
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          *,
          salons(owner_id),
          services(*),
          user_profiles!client_id(*)
        `)
        .eq('id', bookingId)
        .single();

      if (bookingError || !booking) {
        throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
      }

      // Check permissions
      const isOwner = booking.salons.owner_id === req.user.id;
      const isClient = booking.client_id === req.user.id;

      if (!isOwner && !isClient) {
        throw new AppError('Insufficient permissions', 403, 'INSUFFICIENT_PERMISSIONS');
      }

      // Clients can only cancel their own bookings
      if (isClient && !isOwner && status !== 'cancelled') {
        throw new AppError('Clients can only cancel bookings', 403, 'CLIENT_CAN_ONLY_CANCEL');
      }

      // Update booking
      const updateData = { status };
      if (staff_notes && isOwner) {
        updateData.staff_notes = staff_notes;
      }

      const { data: updatedBooking, error: updateError } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', bookingId)
        .select(`
          *,
          services(*),
          salons(*),
          user_profiles!client_id(*)
        `)
        .single();

      if (updateError) {
        throw new AppError('Failed to update booking', 500, 'BOOKING_UPDATE_FAILED');
      }

      // Send notification email if cancelled
      if (status === 'cancelled') {
        emailService.sendCancellationNotice(
          { ...updatedBooking, service_name: booking.services.name },
          booking.user_profiles,
          booking.salons,
          staff_notes || 'Booking cancelled'
        );

        // Process waitlist for cancelled booking
        const waitlistController = require('./waitlistController');
        await waitlistController.processWaitlistForCancelledBooking(
          booking.salon_id,
          booking.service_id,
          booking.appointment_date,
          booking.start_time
        );
      }

      res.status(200).json({
        success: true,
        data: { booking: updatedBooking }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to update booking', 500, 'BOOKING_UPDATE_FAILED');
    }
  });

  // Get available time slots
  getAvailableSlots = asyncHandler(async (req, res) => {
    const { salon_id, service_id, date, staff_id } = req.query;

    if (!salon_id || !service_id || !date) {
      throw new AppError('Missing required parameters', 400, 'MISSING_PARAMETERS');
    }

    try {
      // Get service duration
      const { data: service, error: serviceError } = await supabase
        .from('services')
        .select('duration')
        .eq('id', service_id)
        .single();

      if (serviceError || !service) {
        throw new AppError('Service not found', 404, 'SERVICE_NOT_FOUND');
      }

      // Get salon business hours
      const { data: salon, error: salonError } = await supabase
        .from('salons')
        .select('business_hours')
        .eq('id', salon_id)
        .single();

      if (salonError || !salon) {
        throw new AppError('Salon not found', 404, 'SALON_NOT_FOUND');
      }

      // Get existing bookings for the date
      let bookingsQuery = supabase
        .from('bookings')
        .select('start_time, end_time')
        .eq('salon_id', salon_id)
        .eq('appointment_date', date)
        .neq('status', 'cancelled');

      if (staff_id) {
        bookingsQuery = bookingsQuery.eq('staff_id', staff_id);
      }

      const { data: existingBookings } = await bookingsQuery;

      // Calculate available slots
      const dayOfWeek = new Date(date).toLocaleLowerCase();
      const businessHours = salon.business_hours?.[dayOfWeek];

      if (!businessHours) {
        return res.status(200).json({
          success: true,
          data: { available_slots: [] }
        });
      }

      const slots = this._calculateAvailableSlots(
        businessHours.open,
        businessHours.close,
        service.duration,
        existingBookings || []
      );

      res.status(200).json({
        success: true,
        data: { available_slots: slots }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to get available slots', 500, 'AVAILABLE_SLOTS_FETCH_FAILED');
    }
  });

  // Helper method to calculate available slots
  _calculateAvailableSlots(openTime, closeTime, serviceDuration, existingBookings) {
    const slots = [];
    const slotInterval = 30; // 30-minute intervals

    const [openHour, openMinute] = openTime.split(':').map(Number);
    const [closeHour, closeMinute] = closeTime.split(':').map(Number);

    let currentTime = openHour * 60 + openMinute; // Convert to minutes
    const endTime = closeHour * 60 + closeMinute;

    while (currentTime + serviceDuration <= endTime) {
      const timeStr = this._minutesToTimeString(currentTime);
      const endTimeStr = this._minutesToTimeString(currentTime + serviceDuration);

      // Check if slot conflicts with existing bookings
      const hasConflict = existingBookings.some(booking => {
        const bookingStart = this._timeStringToMinutes(booking.start_time);
        const bookingEnd = this._timeStringToMinutes(booking.end_time);

        return (currentTime < bookingEnd && currentTime + serviceDuration > bookingStart);
      });

      if (!hasConflict) {
        slots.push({
          start_time: timeStr,
          end_time: endTimeStr
        });
      }

      currentTime += slotInterval;
    }

    return slots;
  }

  _minutesToTimeString(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  _timeStringToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }
}

module.exports = new BookingController();

