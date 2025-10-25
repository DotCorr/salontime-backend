const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Get salon's business hours
exports.getBusinessHours = async (req, res) => {
  const { salonId } = req.params;

  try {
    const result = await pool.query(
      'SELECT business_hours FROM salons WHERE id = $1',
      [salonId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Salon not found'
      });
    }

    res.json({
      success: true,
      data: {
        business_hours: result.rows[0].business_hours || {}
      }
    });
  } catch (error) {
    console.error('Error getting business hours:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve business hours',
      error: error.message
    });
  }
};

// Update salon's business hours
exports.updateBusinessHours = async (req, res) => {
  const { salonId } = req.params;
  const { business_hours } = req.body;

  try {
    // Validate business_hours structure
    if (!business_hours || typeof business_hours !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Invalid business hours format'
      });
    }

    // Validate each day's hours
    const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    for (const [day, hours] of Object.entries(business_hours)) {
      if (!validDays.includes(day.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: `Invalid day: ${day}`
        });
      }

      if (typeof hours !== 'object' || !hours.opening || !hours.closing) {
        return res.status(400).json({
          success: false,
          message: `Invalid hours format for ${day}`
        });
      }

      // Validate time format (HH:MM)
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(hours.opening) || !timeRegex.test(hours.closing)) {
        return res.status(400).json({
          success: false,
          message: `Invalid time format for ${day}. Use HH:MM format`
        });
      }
    }

    // Update business hours
    const result = await pool.query(
      `UPDATE salons 
       SET business_hours = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING business_hours`,
      [JSON.stringify(business_hours), salonId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Salon not found'
      });
    }

    res.json({
      success: true,
      message: 'Business hours updated successfully',
      data: {
        business_hours: result.rows[0].business_hours
      }
    });
  } catch (error) {
    console.error('Error updating business hours:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update business hours',
      error: error.message
    });
  }
};

