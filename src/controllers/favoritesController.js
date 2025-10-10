const { supabase } = require('../config/supabase');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/appError');

// Get user's favorite salons
const getFavorites = asyncHandler(async (req, res) => {
  try {
    const { data: favorites, error } = await supabase
      .from('user_favorites')
      .select(`
        *,
        salons (
          id,
          business_name,
          description,
          address,
          city,
          rating_average,
          rating_count,
          images
        )
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError('Failed to fetch favorites', 500, 'FAVORITES_FETCH_FAILED');
    }

    res.status(200).json({
      success: true,
      data: favorites || []
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to fetch favorites', 500, 'FAVORITES_FETCH_FAILED');
  }
});

// Add salon to favorites
const addFavorite = asyncHandler(async (req, res) => {
  const { salonId } = req.body;

  if (!salonId) {
    throw new AppError('Salon ID is required', 400, 'MISSING_SALON_ID');
  }

  try {
    const { data, error } = await supabase
      .from('user_favorites')
      .insert({
        user_id: req.user.id,
        salon_id: salonId
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new AppError('Salon is already in favorites', 409, 'ALREADY_FAVORITE');
      }
      throw new AppError('Failed to add favorite', 500, 'FAVORITE_ADD_FAILED');
    }

    res.status(201).json({
      success: true,
      data: data
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to add favorite', 500, 'FAVORITE_ADD_FAILED');
  }
});

// Remove salon from favorites
const removeFavorite = asyncHandler(async (req, res) => {
  const { salonId } = req.params;

  if (!salonId) {
    throw new AppError('Salon ID is required', 400, 'MISSING_SALON_ID');
  }

  try {
    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', req.user.id)
      .eq('salon_id', salonId);

    if (error) {
      throw new AppError('Failed to remove favorite', 500, 'FAVORITE_REMOVE_FAILED');
    }

    res.status(200).json({
      success: true,
      message: 'Favorite removed successfully'
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to remove favorite', 500, 'FAVORITE_REMOVE_FAILED');
  }
});

// Check if salon is favorited
const checkFavorite = asyncHandler(async (req, res) => {
  const { salonId } = req.params;

  if (!salonId) {
    throw new AppError('Salon ID is required', 400, 'MISSING_SALON_ID');
  }

  try {
    const { data, error } = await supabase
      .from('user_favorites')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('salon_id', salonId)
      .single();

    if (error && error.code !== 'PGRST116') { // Not found error
      throw new AppError('Failed to check favorite status', 500, 'FAVORITE_CHECK_FAILED');
    }

    res.status(200).json({
      success: true,
      data: {
        isFavorite: !!data
      }
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to check favorite status', 500, 'FAVORITE_CHECK_FAILED');
  }
});

module.exports = {
  getFavorites,
  addFavorite,
  removeFavorite,
  checkFavorite
};
