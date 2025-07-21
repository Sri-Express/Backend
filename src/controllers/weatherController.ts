// /controllers/weatherController.ts
// Weather API Controller for Sri Express Transportation Platform

import { Request, Response } from 'express';
import WeatherChat from '../models/WeatherChat';
import User from '../models/User';

interface WeatherRequest extends Request {
  user?: any;
}

// Mock weather data for development (replace with real API calls)
const mockWeatherData = {
  colombo: {
    current: {
      location: 'Colombo',
      temperature: 28,
      feelsLike: 32,
      humidity: 78,
      pressure: 1012,
      windSpeed: 15,
      windDirection: 120,
      visibility: 8,
      uvIndex: 7,
      condition: 'Clouds',
      description: 'partly cloudy',
      icon: '02d',
      timestamp: new Date(),
    },
    hourly: Array.from({ length: 24 }, (_, i) => ({
      time: new Date(Date.now() + i * 60 * 60 * 1000).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      temperature: 28 + Math.sin(i * Math.PI / 12) * 5,
      feelsLike: 32 + Math.sin(i * Math.PI / 12) * 4,
      humidity: 78 + Math.cos(i * Math.PI / 8) * 15,
      windSpeed: 15 + Math.random() * 10,
      precipitationChance: Math.max(0, 30 + Math.sin(i * Math.PI / 6) * 40),
      condition: i > 6 && i < 18 ? 'Clear' : 'Clouds',
      icon: i > 6 && i < 18 ? '01d' : '02n',
    })),
    daily: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      day: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { weekday: 'long' }),
      tempMax: 32 + Math.random() * 6,
      tempMin: 24 + Math.random() * 4,
      humidity: 75 + Math.random() * 20,
      windSpeed: 12 + Math.random() * 15,
      precipitationChance: Math.random() * 60,
      condition: ['Clear', 'Clouds', 'Rain'][Math.floor(Math.random() * 3)],
      description: 'partly cloudy',
      icon: '02d',
      sunrise: '06:00',
      sunset: '18:30',
      uvIndex: 6 + Math.random() * 5,
    })),
    alerts: [],
    transportationImpact: {
      overall: 'good' as const,
      visibility: 'good' as const,
      roadConditions: 'good' as const,
      delayRisk: 'low' as const,
      recommendations: [
        'Normal travel conditions expected',
        'Stay hydrated during travel',
        'Monitor weather updates',
      ],
      alerts: [],
    },
    lastUpdated: new Date(),
  }
};

// Generate weather data for different Sri Lankan cities
const generateCityWeatherData = (cityName: string) => {
  const baseData = mockWeatherData.colombo;
  
  // Adjust weather based on city characteristics
  const cityModifiers: { [key: string]: any } = {
    'Kandy': { tempDiff: -3, humidityDiff: 5, windDiff: -3 },
    'Galle': { tempDiff: 1, humidityDiff: 10, windDiff: 5 },
    'Jaffna': { tempDiff: 2, humidityDiff: -10, windDiff: 8 },
    'Anuradhapura': { tempDiff: 1, humidityDiff: -5, windDiff: 2 },
    'Batticaloa': { tempDiff: 0, humidityDiff: 8, windDiff: 7 },
    'Matara': { tempDiff: 1, humidityDiff: 12, windDiff: 6 },
    'Negombo': { tempDiff: 0, humidityDiff: 5, windDiff: 8 },
    'Trincomalee': { tempDiff: 1, humidityDiff: 3, windDiff: 9 },
    'Badulla': { tempDiff: -4, humidityDiff: 0, windDiff: -2 },
    'Ratnapura': { tempDiff: -2, humidityDiff: 15, windDiff: -5 },
    'Kurunegala': { tempDiff: 0, humidityDiff: -2, windDiff: 1 },
  };

  const modifier = cityModifiers[cityName] || { tempDiff: 0, humidityDiff: 0, windDiff: 0 };

  return {
    ...baseData,
    current: {
      ...baseData.current,
      location: cityName,
      temperature: Math.round(baseData.current.temperature + modifier.tempDiff),
      feelsLike: Math.round(baseData.current.feelsLike + modifier.tempDiff),
      humidity: Math.max(30, Math.min(95, baseData.current.humidity + modifier.humidityDiff)),
      windSpeed: Math.max(0, baseData.current.windSpeed + modifier.windDiff),
    },
    hourly: baseData.hourly.map(hour => ({
      ...hour,
      temperature: Math.round(hour.temperature + modifier.tempDiff),
      feelsLike: Math.round(hour.feelsLike + modifier.tempDiff),
      humidity: Math.max(30, Math.min(95, hour.humidity + modifier.humidityDiff)),
      windSpeed: Math.max(0, hour.windSpeed + modifier.windDiff),
    })),
    daily: baseData.daily.map(day => ({
      ...day,
      tempMax: Math.round(day.tempMax + modifier.tempDiff),
      tempMin: Math.round(day.tempMin + modifier.tempDiff),
      humidity: Math.max(30, Math.min(95, day.humidity + modifier.humidityDiff)),
      windSpeed: Math.max(0, day.windSpeed + modifier.windDiff),
    })),
  };
};

// @desc    Get current weather for a location
// @route   GET /api/weather/current/:location
// @access  Public
export const getCurrentWeather = async (req: Request, res: Response): Promise<void> => {
  try {
    const { location } = req.params;
    
    if (!location) {
      res.status(400).json({ message: 'Location parameter is required' });
      return;
    }

    console.log(`🌤️ Fetching current weather for ${location}`);

    // Generate weather data for the requested location
    const weatherData = generateCityWeatherData(location);

    res.json({
      success: true,
      data: weatherData.current,
      location,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Get current weather error:', error);
    res.status(500).json({ 
      message: 'Server error fetching weather data',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get comprehensive weather data for a location
// @route   GET /api/weather/comprehensive/:location
// @access  Public
export const getComprehensiveWeather = async (req: Request, res: Response): Promise<void> => {
  try {
    const { location } = req.params;
    
    if (!location) {
      res.status(400).json({ message: 'Location parameter is required' });
      return;
    }

    console.log(`🌤️ Fetching comprehensive weather for ${location}`);

    // Generate comprehensive weather data
    const weatherData = generateCityWeatherData(location);

    res.json({
      success: true,
      data: weatherData,
      location,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Get comprehensive weather error:', error);
    res.status(500).json({ 
      message: 'Server error fetching comprehensive weather data',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get weather for multiple locations
// @route   POST /api/weather/multiple
// @access  Public
export const getMultipleLocationWeather = async (req: Request, res: Response): Promise<void> => {
  try {
    const { locations } = req.body;
    
    if (!locations || !Array.isArray(locations)) {
      res.status(400).json({ message: 'Locations array is required' });
      return;
    }

    console.log(`🌤️ Fetching weather for multiple locations: ${locations.join(', ')}`);

    const weatherData: { [key: string]: any } = {};

    for (const location of locations) {
      const data = generateCityWeatherData(location);
      weatherData[location] = data.current;
    }

    res.json({
      success: true,
      data: weatherData,
      locations,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Get multiple location weather error:', error);
    res.status(500).json({ 
      message: 'Server error fetching multiple location weather data',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get route weather analysis
// @route   GET /api/weather/route/:from/:to
// @access  Public
export const getRouteWeather = async (req: Request, res: Response): Promise<void> => {
  try {
    const { from, to } = req.params;
    
    if (!from || !to) {
      res.status(400).json({ message: 'Both from and to locations are required' });
      return;
    }

    console.log(`🌤️ Fetching route weather: ${from} → ${to}`);

    // Get weather data for both locations
    const fromWeather = generateCityWeatherData(from);
    const toWeather = generateCityWeatherData(to);

    // Calculate route conditions
    const routeAnalysis = {
      from: fromWeather.current,
      to: toWeather.current,
      routeConditions: {
        overall: 'good' as const,
        averageTemp: Math.round((fromWeather.current.temperature + toWeather.current.temperature) / 2),
        averageHumidity: Math.round((fromWeather.current.humidity + toWeather.current.humidity) / 2),
        maxWindSpeed: Math.max(fromWeather.current.windSpeed, toWeather.current.windSpeed),
        minVisibility: Math.min(fromWeather.current.visibility, toWeather.current.visibility),
        recommendations: [
          `Departure: ${fromWeather.current.temperature}°C in ${from}`,
          `Arrival: ${toWeather.current.temperature}°C in ${to}`,
          'Normal travel conditions expected',
        ],
        estimatedTravelTime: '3-4 hours', // Mock data
        weatherImpact: 'minimal',
      },
    };

    res.json({
      success: true,
      data: routeAnalysis,
      route: { from, to },
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Get route weather error:', error);
    res.status(500).json({ 
      message: 'Server error fetching route weather data',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get weather chat history
// @route   GET /api/weather/chat/history
// @access  Private
export const getChatHistory = async (req: WeatherRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    console.log(`🗨️ Fetching chat history for user ${userId}`);

    const chatHistory = await WeatherChat.find({ userId })
      .sort({ createdAt: -1 })
      .limit(Number(limit) * Number(page))
      .skip((Number(page) - 1) * Number(limit))
      .populate('userId', 'name email');

    const totalChats = await WeatherChat.countDocuments({ userId });

    res.json({
      success: true,
      data: chatHistory,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalChats,
        pages: Math.ceil(totalChats / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({ 
      message: 'Server error fetching chat history',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Save weather chat message
// @route   POST /api/weather/chat/save
// @access  Private
export const saveChatMessage = async (req: WeatherRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { userMessage, aiResponse, location, weatherContext, sessionId } = req.body;
    const userId = req.user._id;

    console.log(`💾 Saving chat message for user ${userId}`);

    const chatMessage = new WeatherChat({
      userId,
      sessionId: sessionId || `session_${Date.now()}`,
      userMessage,
      aiResponse,
      location,
      weatherContext,
    });

    await chatMessage.save();

    res.json({
      success: true,
      data: chatMessage,
      message: 'Chat message saved successfully',
    });
  } catch (error) {
    console.error('Save chat message error:', error);
    res.status(500).json({ 
      message: 'Server error saving chat message',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get weather preferences
// @route   GET /api/weather/preferences
// @access  Private
export const getWeatherPreferences = async (req: WeatherRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const userId = req.user._id;
    console.log(`⚙️ Fetching weather preferences for user ${userId}`);

    // Get user's weather preferences (stored in user model or separate preferences model)
    const user = await User.findById(userId);
    
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Default preferences if none set
    const preferences = {
      defaultLocation: user.weatherPreferences?.defaultLocation || 'Colombo',
      temperatureUnit: user.weatherPreferences?.temperatureUnit || 'celsius',
      windSpeedUnit: user.weatherPreferences?.windSpeedUnit || 'kmh',
      notificationsEnabled: user.weatherPreferences?.notificationsEnabled || true,
      alertTypes: user.weatherPreferences?.alertTypes || ['rain', 'wind', 'temperature'],
      autoRefreshInterval: user.weatherPreferences?.autoRefreshInterval || 10,
      favoriteLocations: user.weatherPreferences?.favoriteLocations || ['Colombo', 'Kandy'],
    };

    res.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    console.error('Get weather preferences error:', error);
    res.status(500).json({ 
      message: 'Server error fetching weather preferences',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Update weather preferences
// @route   PUT /api/weather/preferences
// @access  Private
export const updateWeatherPreferences = async (req: WeatherRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const userId = req.user._id;
    const preferences = req.body;

    console.log(`⚙️ Updating weather preferences for user ${userId}`);

    const user = await User.findById(userId);
    
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Update user's weather preferences
    user.weatherPreferences = {
      ...user.weatherPreferences,
      ...preferences,
      updatedAt: new Date(),
    };

    await user.save();

    res.json({
      success: true,
      data: user.weatherPreferences,
      message: 'Weather preferences updated successfully',
    });
  } catch (error) {
    console.error('Update weather preferences error:', error);
    res.status(500).json({ 
      message: 'Server error updating weather preferences',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get available locations
// @route   GET /api/weather/locations
// @access  Public
export const getAvailableLocations = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log(`📍 Fetching available weather locations`);

    const locations = [
      { name: 'Colombo', lat: 6.9271, lon: 79.8612, district: 'Colombo', province: 'Western' },
      { name: 'Kandy', lat: 7.2906, lon: 80.6337, district: 'Kandy', province: 'Central' },
      { name: 'Galle', lat: 6.0535, lon: 80.2210, district: 'Galle', province: 'Southern' },
      { name: 'Jaffna', lat: 9.6615, lon: 80.0255, district: 'Jaffna', province: 'Northern' },
      { name: 'Anuradhapura', lat: 8.3114, lon: 80.4037, district: 'Anuradhapura', province: 'North Central' },
      { name: 'Batticaloa', lat: 7.7102, lon: 81.6924, district: 'Batticaloa', province: 'Eastern' },
      { name: 'Matara', lat: 5.9549, lon: 80.5550, district: 'Matara', province: 'Southern' },
      { name: 'Negombo', lat: 7.2083, lon: 79.8358, district: 'Gampaha', province: 'Western' },
      { name: 'Trincomalee', lat: 8.5874, lon: 81.2152, district: 'Trincomalee', province: 'Eastern' },
      { name: 'Badulla', lat: 6.9895, lon: 81.0567, district: 'Badulla', province: 'Uva' },
      { name: 'Ratnapura', lat: 6.6828, lon: 80.4008, district: 'Ratnapura', province: 'Sabaragamuwa' },
      { name: 'Kurunegala', lat: 7.4863, lon: 80.3647, district: 'Kurunegala', province: 'North Western' },
    ];

    res.json({
      success: true,
      data: locations,
      count: locations.length,
    });
  } catch (error) {
    console.error('Get available locations error:', error);
    res.status(500).json({ 
      message: 'Server error fetching available locations',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get weather alerts
// @route   GET /api/weather/alerts/:location?
// @access  Public
export const getWeatherAlerts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { location } = req.params;
    
    console.log(`🚨 Fetching weather alerts${location ? ` for ${location}` : ' (all locations)'}`);

    // Mock weather alerts (replace with real alert data)
    const mockAlerts = [
      {
        id: 'alert_001',
        title: 'Heavy Rain Warning',
        description: 'Heavy rainfall expected in Western Province. Exercise caution while traveling.',
        severity: 'moderate' as const,
        start: new Date(),
        end: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours from now
        areas: ['Colombo', 'Gampaha', 'Kalutara'],
        type: 'precipitation',
        impact: 'Transportation delays possible',
      },
      {
        id: 'alert_002',
        title: 'Strong Wind Advisory',
        description: 'Strong winds expected along the coastal areas. High-profile vehicles should exercise caution.',
        severity: 'minor' as const,
        start: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        end: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours from now
        areas: ['Galle', 'Matara', 'Hambantota'],
        type: 'wind',
        impact: 'Minor travel disruptions',
      },
    ];

    // Filter alerts by location if specified
    const filteredAlerts = location 
      ? mockAlerts.filter(alert => 
          alert.areas.some(area => area.toLowerCase() === location.toLowerCase())
        )
      : mockAlerts;

    res.json({
      success: true,
      data: filteredAlerts,
      location: location || 'All locations',
      count: filteredAlerts.length,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Get weather alerts error:', error);
    res.status(500).json({ 
      message: 'Server error fetching weather alerts',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get weather statistics
// @route   GET /api/weather/stats
// @access  Private (Admin)
export const getWeatherStats = async (req: WeatherRequest, res: Response): Promise<void> => {
  try {
    console.log(`📊 Fetching weather API statistics`);

    // Get weather API usage statistics
    const totalChats = await WeatherChat.countDocuments();
    const totalUsers = await WeatherChat.distinct('userId').then(users => users.length);
    const todayChats = await WeatherChat.countDocuments({
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    });

    // Mock additional statistics
    const stats = {
      totalApiCalls: totalChats * 2, // Approximate
      totalUsers,
      totalChats,
      todayChats,
      popularLocations: [
        { location: 'Colombo', requests: 245 },
        { location: 'Kandy', requests: 189 },
        { location: 'Galle', requests: 156 },
        { location: 'Jaffna', requests: 98 },
        { location: 'Anuradhapura', requests: 76 },
      ],
      averageResponseTime: '1.2s',
      uptime: '99.9%',
      cacheHitRate: '85%',
      lastUpdated: new Date(),
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get weather stats error:', error);
    res.status(500).json({ 
      message: 'Server error fetching weather statistics',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};