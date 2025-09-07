const { supabase } = require('../config/database');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

class ServiceController {
  // Create new service (salon owner only)
  createService = asyncHandler(async (req, res) => {
    const {
      name,
      description,
      price,
      duration,
      category,
      is_active = true
    } = req.body;

    // Validate required fields
    if (!name || !price || !duration) {
      throw new AppError('Name, price, and duration are required', 400, 'MISSING_SERVICE_INFO');
    }

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

      // Create service
      const { data: service, error: serviceError } = await supabase
        .from('services')
        .insert([{
          salon_id: salon.id,
          name,
          description,
          price,
          duration,
          category,
          is_active
        }])
        .select()
        .single();

      if (serviceError) {
        throw new AppError('Failed to create service', 500, 'SERVICE_CREATION_FAILED');
      }

      res.status(201).json({
        success: true,
        data: { service }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to create service', 500, 'SERVICE_CREATION_FAILED');
    }
  });

  // Get salon's services
  getSalonServices = asyncHandler(async (req, res) => {
    const { salon_id } = req.params;
    const { category, active_only = 'true' } = req.query;

    try {
      let query = supabase
        .from('services')
        .select('*')
        .eq('salon_id', salon_id)
        .order('category')
        .order('name');

      if (active_only === 'true') {
        query = query.eq('is_active', true);
      }

      if (category) {
        query = query.eq('category', category);
      }

      const { data: services, error } = await query;

      if (error) {
        throw new AppError('Failed to fetch services', 500, 'SERVICES_FETCH_FAILED');
      }

      // Group by category
      const servicesByCategory = services.reduce((acc, service) => {
        const cat = service.category || 'Other';
        if (!acc[cat]) {
          acc[cat] = [];
        }
        acc[cat].push(service);
        return acc;
      }, {});

      res.status(200).json({
        success: true,
        data: {
          services,
          services_by_category: servicesByCategory
        }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to fetch services', 500, 'SERVICES_FETCH_FAILED');
    }
  });

  // Get my salon's services (salon owner)
  getMyServices = asyncHandler(async (req, res) => {
    const { category, active_only = 'false' } = req.query;

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
        .from('services')
        .select('*')
        .eq('salon_id', salon.id)
        .order('category')
        .order('name');

      if (active_only === 'true') {
        query = query.eq('is_active', true);
      }

      if (category) {
        query = query.eq('category', category);
      }

      const { data: services, error } = await query;

      if (error) {
        throw new AppError('Failed to fetch services', 500, 'SERVICES_FETCH_FAILED');
      }

      res.status(200).json({
        success: true,
        data: { services }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to fetch services', 500, 'SERVICES_FETCH_FAILED');
    }
  });

  // Update service (salon owner only)
  updateService = asyncHandler(async (req, res) => {
    const { serviceId } = req.params;
    const updateData = req.body;

    // Remove non-updatable fields
    delete updateData.id;
    delete updateData.salon_id;
    delete updateData.created_at;

    try {
      // Verify ownership
      const { data: service, error: serviceError } = await supabase
        .from('services')
        .select('*, salons(owner_id)')
        .eq('id', serviceId)
        .single();

      if (serviceError || !service) {
        throw new AppError('Service not found', 404, 'SERVICE_NOT_FOUND');
      }

      if (service.salons.owner_id !== req.user.id) {
        throw new AppError('Insufficient permissions', 403, 'INSUFFICIENT_PERMISSIONS');
      }

      // Update service
      const { data: updatedService, error: updateError } = await supabase
        .from('services')
        .update(updateData)
        .eq('id', serviceId)
        .select()
        .single();

      if (updateError) {
        throw new AppError('Failed to update service', 500, 'SERVICE_UPDATE_FAILED');
      }

      res.status(200).json({
        success: true,
        data: { service: updatedService }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to update service', 500, 'SERVICE_UPDATE_FAILED');
    }
  });

  // Delete service (salon owner only)
  deleteService = asyncHandler(async (req, res) => {
    const { serviceId } = req.params;

    try {
      // Verify ownership
      const { data: service, error: serviceError } = await supabase
        .from('services')
        .select('*, salons(owner_id)')
        .eq('id', serviceId)
        .single();

      if (serviceError || !service) {
        throw new AppError('Service not found', 404, 'SERVICE_NOT_FOUND');
      }

      if (service.salons.owner_id !== req.user.id) {
        throw new AppError('Insufficient permissions', 403, 'INSUFFICIENT_PERMISSIONS');
      }

      // Check for existing bookings
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id')
        .eq('service_id', serviceId)
        .neq('status', 'cancelled')
        .limit(1);

      if (bookingsError) {
        throw new AppError('Failed to check existing bookings', 500, 'BOOKINGS_CHECK_FAILED');
      }

      if (bookings && bookings.length > 0) {
        // Don't delete, just deactivate
        const { data: updatedService, error: updateError } = await supabase
          .from('services')
          .update({ is_active: false })
          .eq('id', serviceId)
          .select()
          .single();

        if (updateError) {
          throw new AppError('Failed to deactivate service', 500, 'SERVICE_DEACTIVATION_FAILED');
        }

        return res.status(200).json({
          success: true,
          data: { 
            service: updatedService,
            message: 'Service deactivated due to existing bookings'
          }
        });
      }

      // Safe to delete
      const { error: deleteError } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId);

      if (deleteError) {
        throw new AppError('Failed to delete service', 500, 'SERVICE_DELETION_FAILED');
      }

      res.status(200).json({
        success: true,
        message: 'Service deleted successfully'
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to delete service', 500, 'SERVICE_DELETION_FAILED');
    }
  });

  // Get service categories
  getServiceCategories = asyncHandler(async (req, res) => {
    try {
      const { data: categories, error } = await supabase
        .from('services')
        .select('category')
        .not('category', 'is', null)
        .neq('category', '');

      if (error) {
        throw new AppError('Failed to fetch categories', 500, 'CATEGORIES_FETCH_FAILED');
      }

      // Get unique categories
      const uniqueCategories = [...new Set(categories.map(item => item.category))];

      res.status(200).json({
        success: true,
        data: { categories: uniqueCategories }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to fetch categories', 500, 'CATEGORIES_FETCH_FAILED');
    }
  });

  // Get service details
  getServiceDetails = asyncHandler(async (req, res) => {
    const { serviceId } = req.params;

    try {
      const { data: service, error } = await supabase
        .from('services')
        .select(`
          *,
          salons(
            id,
            name,
            address,
            phone,
            business_hours
          )
        `)
        .eq('id', serviceId)
        .single();

      if (error || !service) {
        throw new AppError('Service not found', 404, 'SERVICE_NOT_FOUND');
      }

      if (!service.is_active) {
        throw new AppError('Service is not available', 400, 'SERVICE_NOT_AVAILABLE');
      }

      res.status(200).json({
        success: true,
        data: { service }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to fetch service details', 500, 'SERVICE_DETAILS_FETCH_FAILED');
    }
  });

  // Search services
  searchServices = asyncHandler(async (req, res) => {
    const { 
      query, 
      category, 
      min_price, 
      max_price, 
      location,
      page = 1, 
      limit = 20 
    } = req.query;

    const offset = (page - 1) * limit;

    try {
      let serviceQuery = supabase
        .from('services')
        .select(`
          *,
          salons(
            id,
            name,
            address,
            city,
            state,
            rating_average,
            rating_count
          )
        `)
        .eq('is_active', true)
        .range(offset, offset + limit - 1);

      // Apply filters
      if (query) {
        serviceQuery = serviceQuery.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
      }

      if (category) {
        serviceQuery = serviceQuery.eq('category', category);
      }

      if (min_price) {
        serviceQuery = serviceQuery.gte('price', parseFloat(min_price));
      }

      if (max_price) {
        serviceQuery = serviceQuery.lte('price', parseFloat(max_price));
      }

      if (location) {
        serviceQuery = serviceQuery.or(`salons.city.ilike.%${location}%,salons.state.ilike.%${location}%`);
      }

      const { data: services, error } = await serviceQuery.order('price');

      if (error) {
        throw new AppError('Failed to search services', 500, 'SERVICES_SEARCH_FAILED');
      }

      res.status(200).json({
        success: true,
        data: {
          services,
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
      throw new AppError('Failed to search services', 500, 'SERVICES_SEARCH_FAILED');
    }
  });
}

module.exports = new ServiceController();

