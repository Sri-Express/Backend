// /routes/weatherRoutes.ts
// Weather API Routes for Sri Express Transportation Platform

import express from 'express';
import {
  getCurrentWeather,
  getComprehensiveWeather,
  getMultipleLocationWeather,
  getRouteWeather,
  getChatHistory,
  saveChatMessage,
  getWeatherPreferences,
  updateWeatherPreferences,
  getAvailableLocations,
  getWeatherAlerts,
  getWeatherStats,
} from '../controllers/weatherController';
import { protect } from '../middleware/authMiddleware';
import { requireAdmin } from '../middleware/adminMiddleware';

const router = express.Router();

// ================================
// PUBLIC WEATHER ENDPOINTS
// ================================

// @desc    Get available weather locations
// @route   GET /api/weather/locations
// @access  Public
router.get('/locations', getAvailableLocations);

// @desc    Get current weather for a specific location
// @route   GET /api/weather/current/:location
// @access  Public
// @example GET /api/weather/current/Colombo
router.get('/current/:location', getCurrentWeather);

// @desc    Get comprehensive weather data (current + forecast + alerts)
// @route   GET /api/weather/comprehensive/:location
// @access  Public
// @example GET /api/weather/comprehensive/Kandy
router.get('/comprehensive/:location', getComprehensiveWeather);

// @desc    Get weather data for multiple locations
// @route   POST /api/weather/multiple
// @access  Public
// @body    { "locations": ["Colombo", "Kandy", "Galle"] }
router.post('/multiple', getMultipleLocationWeather);

// @desc    Get weather analysis for a route
// @route   GET /api/weather/route/:from/:to
// @access  Public
// @example GET /api/weather/route/Colombo/Kandy
router.get('/route/:from/:to', getRouteWeather);

// @desc    Get weather alerts for all locations
// @route   GET /api/weather/alerts
// @access  Public
// @example GET /api/weather/alerts (all locations)
router.get('/alerts', getWeatherAlerts);

// @desc    Get weather alerts for specific location
// @route   GET /api/weather/alerts/:location
// @access  Public
// @example GET /api/weather/alerts/Colombo (specific location)
router.get('/alerts/:location', getWeatherAlerts);

// ================================
// PROTECTED USER ENDPOINTS
// ================================

// @desc    Get user's weather chat history
// @route   GET /api/weather/chat/history
// @access  Private
// @query   ?page=1&limit=20
router.get('/chat/history', protect, getChatHistory);

// @desc    Save weather chat message
// @route   POST /api/weather/chat/save
// @access  Private
// @body    { userMessage, aiResponse, location, weatherContext, sessionId? }
router.post('/chat/save', protect, saveChatMessage);

// @desc    Get user's weather preferences
// @route   GET /api/weather/preferences
// @access  Private
router.get('/preferences', protect, getWeatherPreferences);

// @desc    Update user's weather preferences
// @route   PUT /api/weather/preferences
// @access  Private
// @body    { defaultLocation?, temperatureUnit?, windSpeedUnit?, notificationsEnabled?, etc. }
router.put('/preferences', protect, updateWeatherPreferences);

// ================================
// ADMIN ENDPOINTS
// ================================

// @desc    Get weather API statistics and analytics
// @route   GET /api/weather/stats
// @access  Private (Admin)
router.get('/stats', protect, requireAdmin, getWeatherStats);

// ================================
// ADDITIONAL UTILITY ENDPOINTS
// ================================

// @desc    Health check for weather service
// @route   GET /api/weather/health
// @access  Public
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Weather API',
    status: 'operational',
    timestamp: new Date(),
    version: '1.0.0',
    endpoints: {
      public: [
        'GET /api/weather/locations',
        'GET /api/weather/current/:location',
        'GET /api/weather/comprehensive/:location',
        'POST /api/weather/multiple',
        'GET /api/weather/route/:from/:to',
        'GET /api/weather/alerts',
      'GET /api/weather/alerts/:location',
        'GET /api/weather/health',
      ],
      protected: [
        'GET /api/weather/chat/history',
        'POST /api/weather/chat/save',
        'GET /api/weather/preferences',
        'PUT /api/weather/preferences',
      ],
      admin: [
        'GET /api/weather/stats',
      ],
    },
    supportedLocations: [
      'Colombo', 'Kandy', 'Galle', 'Jaffna', 'Anuradhapura', 
      'Batticaloa', 'Matara', 'Negombo', 'Trincomalee', 
      'Badulla', 'Ratnapura', 'Kurunegala'
    ],
  });
});

// ================================
// ERROR HANDLING MIDDLEWARE
// ================================

// Handle 404 for weather routes
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Weather API endpoint not found: ${req.method} ${req.originalUrl}`,
    availableEndpoints: [
      'GET /api/weather/locations',
      'GET /api/weather/current/:location',
      'GET /api/weather/comprehensive/:location',
      'POST /api/weather/multiple',
      'GET /api/weather/route/:from/:to',
      'GET /api/weather/alerts',
      'GET /api/weather/alerts/:location',
      'GET /api/weather/chat/history (auth required)',
      'POST /api/weather/chat/save (auth required)',
      'GET /api/weather/preferences (auth required)',
      'PUT /api/weather/preferences (auth required)',
      'GET /api/weather/stats (admin required)',
      'GET /api/weather/health',
    ],
  });
});

export default router;

// ================================
// ROUTE DOCUMENTATION
// ================================

/*

Weather API Routes Documentation
===============================

BASE URL: /api/weather

PUBLIC ENDPOINTS:
================

1. GET /locations
   - Returns list of supported Sri Lankan cities
   - No authentication required
   - Response: { success, data: [{ name, lat, lon, district, province }] }

2. GET /current/:location
   - Get current weather for specific location
   - Params: location (e.g., "Colombo", "Kandy")
   - Response: { success, data: CurrentWeather, location, timestamp }

3. GET /comprehensive/:location
   - Get complete weather data (current + hourly + daily + alerts)
   - Params: location (e.g., "Galle", "Jaffna")
   - Response: { success, data: WeatherData, location, timestamp }

4. POST /multiple
   - Get weather for multiple locations at once
   - Body: { locations: ["Colombo", "Kandy", "Galle"] }
   - Response: { success, data: { [location]: CurrentWeather }, locations, timestamp }

5. GET /route/:from/:to
   - Get weather analysis for transportation route
   - Params: from, to (e.g., "Colombo", "Kandy")
   - Response: { success, data: RouteWeatherAnalysis, route, timestamp }

6. GET /alerts
   - Get weather alerts for all locations
   - Response: { success, data: [WeatherAlert], location: "All locations", count, timestamp }

7. GET /alerts/:location
   - Get weather alerts for specific location
   - Params: location (e.g., "Colombo", "Kandy")
   - Response: { success, data: [WeatherAlert], location, count, timestamp }

8. GET /health
   - Service health check and API documentation
   - No authentication required
   - Response: { success, service, status, endpoints, supportedLocations }

PROTECTED ENDPOINTS (require authentication):
============================================

8. GET /chat/history?page=1&limit=20
   - Get user's weather chat conversation history
   - Query params: page, limit (optional)
   - Response: { success, data: [ChatMessage], pagination }

9. POST /chat/save
   - Save weather chat interaction
   - Body: { userMessage, aiResponse, location, weatherContext, sessionId? }
   - Response: { success, data: ChatMessage, message }

10. GET /preferences
    - Get user's weather preferences and settings
    - Response: { success, data: WeatherPreferences }

11. PUT /preferences
    - Update user's weather preferences
    - Body: { defaultLocation?, temperatureUnit?, windSpeedUnit?, notificationsEnabled?, alertTypes?, autoRefreshInterval?, favoriteLocations? }
    - Response: { success, data: WeatherPreferences, message }

ADMIN ENDPOINTS (require admin role):
====================================

12. GET /stats
    - Get weather API usage statistics and analytics
    - Response: { success, data: WeatherStats }

ERROR RESPONSES:
===============

All endpoints return consistent error format:
{
  success: false,
  message: "Error description",
  error?: "Detailed error message" (in development)
}

HTTP Status Codes:
- 200: Success
- 400: Bad Request (missing/invalid parameters)
- 401: Unauthorized (authentication required)
- 403: Forbidden (insufficient permissions)
- 404: Not Found (endpoint/resource not found)
- 500: Internal Server Error

RATE LIMITING:
=============

- Public endpoints: 100 requests per 15 minutes per IP
- Authenticated endpoints: 500 requests per 15 minutes per user
- Admin endpoints: 1000 requests per 15 minutes

CACHING:
========

- Current weather: 10 minutes
- Forecast data: 1 hour
- Location data: 24 hours
- Alerts: 5 minutes

EXAMPLE USAGE:
==============

// Get current weather for Colombo
GET /api/weather/current/Colombo

// Get comprehensive weather for route planning
GET /api/weather/comprehensive/Kandy

// Check weather for multiple cities
POST /api/weather/multiple
Body: { "locations": ["Colombo", "Galle", "Jaffna"] }

// Analyze route weather conditions
GET /api/weather/route/Colombo/Kandy

// Get weather alerts for specific location
GET /api/weather/alerts/Colombo

// Get weather alerts for all locations
GET /api/weather/alerts

// Save chat conversation (authenticated)
POST /api/weather/chat/save
Headers: { Authorization: "Bearer <token>" }
Body: {
  "userMessage": "Will it rain tomorrow in Colombo?",
  "aiResponse": "Tomorrow in Colombo, there's a 30% chance of rain...",
  "location": "Colombo",
  "weatherContext": {...}
}

*/