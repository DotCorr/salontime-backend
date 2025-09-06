const supabaseService = require('../services/supabaseService');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

class UserController {
  // Update user profile
  updateProfile = asyncHandler(async (req, res) => {
    const { first_name, last_name, phone, language } = req.body;

    // Validate input
    const allowedUpdates = ['first_name', 'last_name', 'phone', 'language'];
    const updates = {};

    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key) && req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    });

    if (Object.keys(updates).length === 0) {
      throw new AppError('No valid fields to update', 400, 'NO_UPDATES_PROVIDED');
    }

    try {
      const updatedProfile = await supabaseService.updateUserProfile(req.user.id, updates);

      res.status(200).json({
        success: true,
        data: {
          user: updatedProfile
        }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to update profile', 500, 'PROFILE_UPDATE_FAILED');
    }
  });

  // Get user dashboard data (placeholder for now)
  getDashboard = asyncHandler(async (req, res) => {
    try {
      const userProfile = await supabaseService.getUserProfile(req.user.id);

      // Return different dashboard data based on user type
      const dashboardData = {
        user_type: userProfile.user_type,
        user_name: `${userProfile.first_name} ${userProfile.last_name}`,
        message: `Welcome to your ${userProfile.user_type === 'salon_owner' ? 'salon owner' : 'client'} dashboard!`
      };

      res.status(200).json({
        success: true,
        data: dashboardData
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to fetch dashboard data', 500, 'DASHBOARD_FETCH_FAILED');
    }
  });
}

module.exports = new UserController();

