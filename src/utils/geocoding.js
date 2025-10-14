// Simple geocoding based on Dutch city names
const cityCoordinates = {
  'Amsterdam': { lat: 52.3676, lng: 4.9041 },
  'Rotterdam': { lat: 51.9244, lng: 4.4777 },
  'Utrecht': { lat: 52.0907, lng: 5.1214 },
  'The Hague': { lat: 52.0705, lng: 4.3007 },
  'Eindhoven': { lat: 51.4416, lng: 5.4697 },
  'Tilburg': { lat: 51.5555, lng: 5.0913 },
  'Groningen': { lat: 53.2194, lng: 6.5665 },
  'Almere': { lat: 52.3508, lng: 5.2647 },
  'Breda': { lat: 51.5719, lng: 4.7683 },
  'Nijmegen': { lat: 51.8426, lng: 5.8590 },
  'Apeldoorn': { lat: 52.2112, lng: 5.9699 },
  'Haarlem': { lat: 52.3874, lng: 4.6462 },
  'Arnhem': { lat: 51.9851, lng: 5.8987 },
  'Zaanstad': { lat: 52.4389, lng: 4.8258 },
  'Amersfoort': { lat: 52.1561, lng: 5.3878 },
  'Hoofddorp': { lat: 52.3030, lng: 4.6892 },
  'Maastricht': { lat: 50.8514, lng: 5.6910 },
  'Leiden': { lat: 52.1601, lng: 4.4970 },
  'Dordrecht': { lat: 51.8133, lng: 4.6900 },
  'Zoetermeer': { lat: 52.0575, lng: 4.4932 }
};

/**
 * Get coordinates for a city
 * @param {string} city - City name
 * @returns {Object|null} - { lat, lng } or null if not found
 */
function getCityCoordinates(city) {
  if (!city) return null;
  
  // Try exact match first
  if (cityCoordinates[city]) {
    return cityCoordinates[city];
  }
  
  // Try case-insensitive match
  const cityKey = Object.keys(cityCoordinates).find(
    key => key.toLowerCase() === city.toLowerCase()
  );
  
  return cityKey ? cityCoordinates[cityKey] : null;
}

/**
 * Add random offset to coordinates for variety (within ~5km)
 * @param {number} lat - Base latitude
 * @param {number} lng - Base longitude
 * @returns {Object} - { latitude, longitude }
 */
function addRandomOffset(lat, lng) {
  const latOffset = (Math.random() - 0.5) * 0.09; // ~5km
  const lngOffset = (Math.random() - 0.5) * 0.09; // ~5km
  
  return {
    latitude: parseFloat((lat + latOffset).toFixed(6)),
    longitude: parseFloat((lng + lngOffset).toFixed(6))
  };
}

/**
 * Geocode a salon based on its city
 * @param {Object} salon - Salon object with city field
 * @returns {Object} - Salon with latitude and longitude added
 */
function geocodeSalon(salon) {
  const coords = getCityCoordinates(salon.city);
  
  if (coords) {
    const { latitude, longitude } = addRandomOffset(coords.lat, coords.lng);
    return {
      ...salon,
      latitude,
      longitude
    };
  }
  
  // Return salon without coordinates if city not found
  return salon;
}

/**
 * Geocode multiple salons
 * @param {Array} salons - Array of salon objects
 * @returns {Array} - Array of salons with coordinates
 */
function geocodeSalons(salons) {
  if (!Array.isArray(salons)) return [];
  return salons.map(salon => geocodeSalon(salon));
}

module.exports = {
  getCityCoordinates,
  addRandomOffset,
  geocodeSalon,
  geocodeSalons
};

