const express = require('express');
const router = express.Router();
const favoritesController = require('../controllers/favoritesController');
const { authenticate } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticate);

// GET /api/favorites - Get user's favorite salons
router.get('/', favoritesController.getFavorites);

// POST /api/favorites - Add salon to favorites
router.post('/', favoritesController.addFavorite);

// DELETE /api/favorites/:salonId - Remove salon from favorites
router.delete('/:salonId', favoritesController.removeFavorite);

// GET /api/favorites/check/:salonId - Check if salon is favorited
router.get('/check/:salonId', favoritesController.checkFavorite);

module.exports = router;
