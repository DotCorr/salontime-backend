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

  // Get user profile
  getProfile = asyncHandler(async (req, res) => {
    try {
      const userProfile = await supabaseService.getUserProfileOrCreate(req.user.id);
      
      res.status(200).json({
        success: true,
        data: {
          user: userProfile
        }
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw new AppError('Failed to fetch user profile', 500, 'PROFILE_FETCH_FAILED');
    }
  });

  // Get notification settings
  getNotificationSettings = asyncHandler(async (req, res) => {
    try {
      // For now, return default settings since we don't have a notification_settings table
      const defaultSettings = {
        notifications_enabled: true,
        email_notifications: true,
        sms_notifications: false,
        push_notifications: true,
        booking_reminders: true,
        marketing_emails: false
      };

      res.status(200).json({
        success: true,
        data: defaultSettings
      });
    } catch (error) {
      console.error('Error fetching notification settings:', error);
      throw new AppError('Failed to fetch notification settings', 500, 'NOTIFICATION_SETTINGS_FETCH_FAILED');
    }
  });

  // Update notification settings
  updateNotificationSettings = asyncHandler(async (req, res) => {
    const { 
      notifications_enabled, 
      email_notifications, 
      sms_notifications, 
      push_notifications, 
      booking_reminders, 
      marketing_emails 
    } = req.body;

    try {
      // For now, just return success since we don't have a notification_settings table
      // In the future, this would save to a notification_settings table
      
      res.status(200).json({
        success: true,
        data: {
          notifications_enabled,
          email_notifications,
          sms_notifications,
          push_notifications,
          booking_reminders,
          marketing_emails
        }
      });
    } catch (error) {
      console.error('Error updating notification settings:', error);
      throw new AppError('Failed to update notification settings', 500, 'NOTIFICATION_SETTINGS_UPDATE_FAILED');
    }
  });
}

module.exports = new UserController();

