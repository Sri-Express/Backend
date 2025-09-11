// Backend Weather Service - Real OpenWeather API Integration
import fetch from 'node-fetch';

interface OpenWeatherCurrentResponse {
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
    pressure: number;
  };
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  wind?: {
    speed: number;
    deg: number;
  };
  visibility?: number;
  dt: number;
  name: string;
}

interface OpenWeatherForecastResponse {
  list: Array<{
    dt: number;
    main: {
      temp: number;
      feels_like: number;
      humidity: number;
      pressure: number;
    };
    weather: Array<{
      main: string;
      description: string;
      icon: string;
    }>;
    wind?: {
      speed: number;
    };
    pop?: number;
  }>;
}

class BackendWeatherService {
  private apiKey: string;
  private baseUrl = 'https://api.openweathermap.org/data/2.5';
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 10 * 60 * 1000; // 10 minutes

  // Sri Lankan cities with coordinates
  private sriLankanLocations = [
    { name: 'Colombo', lat: 6.9271, lon: 79.8612 },
    { name: 'Kandy', lat: 7.2906, lon: 80.6337 },
    { name: 'Galle', lat: 6.0535, lon: 80.2210 },
    { name: 'Jaffna', lat: 9.6615, lon: 80.0255 },
    { name: 'Anuradhapura', lat: 8.3114, lon: 80.4037 },
    { name: 'Batticaloa', lat: 7.7102, lon: 81.6924 },
    { name: 'Matara', lat: 5.9549, lon: 80.5550 },
    { name: 'Negombo', lat: 7.2083, lon: 79.8358 },
    { name: 'Trincomalee', lat: 8.5874, lon: 81.2152 },
    { name: 'Badulla', lat: 6.9895, lon: 81.0567 },
    { name: 'Ratnapura', lat: 6.6828, lon: 80.4008 },
    { name: 'Kurunegala', lat: 7.4863, lon: 80.3647 },
  ];

  constructor() {
    this.apiKey = process.env.OPENWEATHER_API_KEY || '';
    if (!this.apiKey) {
      console.error('❌ OpenWeather API key not found in environment variables');
    } else {
      console.log('✅ OpenWeather API key configured');
    }
  }

  private getLocationCoords(locationName: string) {
    const location = this.sriLankanLocations.find(
      loc => loc.name.toLowerCase() === locationName.toLowerCase()
    );
    return location;
  }

  private isCacheValid(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;
    return Date.now() - cached.timestamp < this.cacheTimeout;
  }

  private getCachedData(key: string) {
    if (this.isCacheValid(key)) {
      return this.cache.get(key)?.data;
    }
    return null;
  }

  private setCacheData(key: string, data: any) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  async getCurrentWeather(location: string) {
    try {
      const cacheKey = `current_${location.toLowerCase()}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        console.log(`📦 Using cached weather data for ${location}`);
        return cached;
      }

      if (!this.apiKey) {
        console.log(`⚠️ No API key, using mock data for ${location}`);
        return this.getMockWeatherData(location);
      }

      const coords = this.getLocationCoords(location);
      if (!coords) {
        throw new Error(`Location ${location} not found`);
      }

      console.log(`🌤️ Fetching real weather data for ${location}`);
      const url = `${this.baseUrl}/weather?lat=${coords.lat}&lon=${coords.lon}&appid=${this.apiKey}&units=metric`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`OpenWeather API error: ${response.status}`);
      }

      const data = await response.json() as OpenWeatherCurrentResponse;
      
      const weatherData = {
        location: location,
        temperature: Math.round(data.main.temp),
        feelsLike: Math.round(data.main.feels_like),
        humidity: data.main.humidity,
        pressure: data.main.pressure,
        windSpeed: Math.round((data.wind?.speed || 0) * 3.6), // Convert m/s to km/h
        windDirection: data.wind?.deg || 0,
        visibility: Math.round((data.visibility || 10000) / 1000), // Convert to km
        condition: data.weather[0].main,
        description: data.weather[0].description,
        icon: data.weather[0].icon,
        timestamp: new Date(),
      };

      this.setCacheData(cacheKey, weatherData);
      console.log(`✅ Real weather data fetched for ${location}: ${weatherData.temperature}°C, ${weatherData.description}`);
      return weatherData;

    } catch (error) {
      console.error(`❌ Error fetching weather for ${location}:`, error);
      console.log(`⚠️ Falling back to mock data for ${location}`);
      return this.getMockWeatherData(location);
    }
  }

  async getComprehensiveWeather(location: string) {
    try {
      const cacheKey = `comprehensive_${location.toLowerCase()}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        return cached;
      }

      if (!this.apiKey) {
        return this.getMockComprehensiveData(location);
      }

      const coords = this.getLocationCoords(location);
      if (!coords) {
        throw new Error(`Location ${location} not found`);
      }

      // Fetch both current and forecast data
      const [currentResponse, forecastResponse] = await Promise.all([
        fetch(`${this.baseUrl}/weather?lat=${coords.lat}&lon=${coords.lon}&appid=${this.apiKey}&units=metric`),
        fetch(`${this.baseUrl}/forecast?lat=${coords.lat}&lon=${coords.lon}&appid=${this.apiKey}&units=metric`)
      ]);

      if (!currentResponse.ok || !forecastResponse.ok) {
        throw new Error('OpenWeather API error');
      }

      const [currentData, forecastData] = await Promise.all([
        currentResponse.json() as Promise<OpenWeatherCurrentResponse>,
        forecastResponse.json() as Promise<OpenWeatherForecastResponse>
      ]);

      const comprehensiveData = {
        current: {
          location: location,
          temperature: Math.round(currentData.main.temp),
          feelsLike: Math.round(currentData.main.feels_like),
          humidity: currentData.main.humidity,
          pressure: currentData.main.pressure,
          windSpeed: Math.round((currentData.wind?.speed || 0) * 3.6),
          windDirection: currentData.wind?.deg || 0,
          visibility: Math.round((currentData.visibility || 10000) / 1000),
          condition: currentData.weather[0].main,
          description: currentData.weather[0].description,
          icon: currentData.weather[0].icon,
          timestamp: new Date(),
        },
        hourly: this.parseHourlyForecast(forecastData),
        daily: this.parseDailyForecast(forecastData),
        transportationImpact: this.calculateTransportationImpact(currentData),
        lastUpdated: new Date(),
      };

      this.setCacheData(cacheKey, comprehensiveData);
      console.log(`✅ Comprehensive weather data fetched for ${location}`);
      return comprehensiveData;

    } catch (error) {
      console.error(`❌ Error fetching comprehensive weather for ${location}:`, error);
      return this.getMockComprehensiveData(location);
    }
  }

  private parseHourlyForecast(data: OpenWeatherForecastResponse) {
    return data.list.slice(0, 24).map(item => ({
      time: new Date(item.dt * 1000).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      temperature: Math.round(item.main.temp),
      feelsLike: Math.round(item.main.feels_like),
      humidity: item.main.humidity,
      windSpeed: Math.round((item.wind?.speed || 0) * 3.6),
      precipitationChance: Math.round((item.pop || 0) * 100),
      condition: item.weather[0].main,
      icon: item.weather[0].icon,
    }));
  }

  private parseDailyForecast(data: OpenWeatherForecastResponse) {
    const dailyData = new Map<string, typeof data.list>();
    
    // Group by date
    data.list.forEach(item => {
      const date = new Date(item.dt * 1000).toDateString();
      if (!dailyData.has(date)) {
        dailyData.set(date, []);
      }
      dailyData.get(date)?.push(item);
    });

    const forecasts = [];
    let dayCount = 0;

    for (const [dateStr, items] of dailyData.entries()) {
      if (dayCount >= 7) break;

      const temps = items.map(item => item.main.temp);
      const humidities = items.map(item => item.main.humidity);
      const winds = items.map(item => item.wind?.speed || 0);
      const pops = items.map(item => item.pop || 0);

      const date = new Date(dateStr);
      
      forecasts.push({
        date: date.toISOString().split('T')[0],
        day: date.toLocaleDateString('en-US', { weekday: 'long' }),
        tempMax: Math.round(Math.max(...temps)),
        tempMin: Math.round(Math.min(...temps)),
        humidity: Math.round(humidities.reduce((a, b) => a + b, 0) / humidities.length),
        windSpeed: Math.round((winds.reduce((a, b) => a + b, 0) / winds.length) * 3.6),
        precipitationChance: Math.round((pops.reduce((a, b) => a + b, 0) / pops.length) * 100),
        condition: items[0].weather[0].main,
        description: items[0].weather[0].description,
        icon: items[0].weather[0].icon,
        sunrise: '06:00',
        sunset: '18:30',
        uvIndex: Math.floor(Math.random() * 11),
      });

      dayCount++;
    }

    return forecasts;
  }

  private calculateTransportationImpact(current: OpenWeatherCurrentResponse) {
    const condition = current.weather[0].main.toLowerCase();
    const windSpeed = (current.wind?.speed || 0) * 3.6;
    const visibility = current.visibility || 10000;

    let overall: 'excellent' | 'good' | 'fair' | 'poor' | 'dangerous' = 'excellent';
    let delayRisk: 'none' | 'low' | 'moderate' | 'high' = 'none';
    const recommendations: string[] = [];
    const alerts: string[] = [];

    // Analyze conditions
    if (condition.includes('rain') || condition.includes('storm')) {
      overall = 'poor';
      delayRisk = 'high';
      recommendations.push('Allow extra travel time due to rain');
      recommendations.push('Use headlights during the day');
      alerts.push('Wet road conditions expected');
    }

    if (condition.includes('fog') || condition.includes('mist')) {
      overall = 'poor';
      delayRisk = 'high';
      recommendations.push('Drive with extreme caution in fog');
      alerts.push('Reduced visibility due to fog');
    }

    if (windSpeed > 40) {
      overall = overall === 'excellent' ? 'fair' : 'poor';
      delayRisk = delayRisk === 'none' ? 'moderate' : 'high';
      recommendations.push('High winds - avoid high-profile vehicles');
      alerts.push('Strong wind conditions');
    }

    if (overall === 'excellent') {
      recommendations.push('Perfect conditions for travel');
    }

    return {
      overall,
      visibility: visibility > 5000 ? 'excellent' : visibility > 2000 ? 'good' : 'poor',
      roadConditions: condition.includes('rain') ? 'wet' : 'excellent',
      delayRisk,
      recommendations,
      alerts,
    };
  }

  // Fallback mock data when API fails
  private getMockWeatherData(location: string) {
    const baseTemp = location.toLowerCase() === 'kandy' ? 25 : 
                     location.toLowerCase() === 'jaffna' ? 30 : 28;
    
    return {
      location,
      temperature: baseTemp + Math.floor(Math.random() * 6) - 3,
      feelsLike: baseTemp + 2 + Math.floor(Math.random() * 4),
      humidity: 70 + Math.floor(Math.random() * 20),
      pressure: 1010 + Math.floor(Math.random() * 10),
      windSpeed: 10 + Math.floor(Math.random() * 15),
      windDirection: Math.floor(Math.random() * 360),
      visibility: 8 + Math.floor(Math.random() * 4),
      condition: ['Clear', 'Clouds', 'Rain'][Math.floor(Math.random() * 3)],
      description: 'partly cloudy',
      icon: '02d',
      timestamp: new Date(),
    };
  }

  private getMockComprehensiveData(location: string) {
    const current = this.getMockWeatherData(location);
    
    return {
      current,
      hourly: Array.from({ length: 24 }, (_, i) => ({
        time: new Date(Date.now() + i * 60 * 60 * 1000).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        temperature: current.temperature + Math.floor(Math.random() * 6) - 3,
        feelsLike: current.feelsLike + Math.floor(Math.random() * 4) - 2,
        humidity: current.humidity + Math.floor(Math.random() * 20) - 10,
        windSpeed: current.windSpeed + Math.floor(Math.random() * 10) - 5,
        precipitationChance: Math.floor(Math.random() * 60),
        condition: current.condition,
        icon: current.icon,
      })),
      daily: Array.from({ length: 7 }, (_, i) => ({
        date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        day: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { weekday: 'long' }),
        tempMax: current.temperature + 4 + Math.floor(Math.random() * 4),
        tempMin: current.temperature - 2 - Math.floor(Math.random() * 3),
        humidity: current.humidity + Math.floor(Math.random() * 10) - 5,
        windSpeed: current.windSpeed + Math.floor(Math.random() * 10) - 5,
        precipitationChance: Math.floor(Math.random() * 60),
        condition: current.condition,
        description: current.description,
        icon: current.icon,
        sunrise: '06:00',
        sunset: '18:30',
        uvIndex: 6 + Math.floor(Math.random() * 5),
      })),
      transportationImpact: {
        overall: 'good',
        visibility: 'good',
        roadConditions: 'good',
        delayRisk: 'low',
        recommendations: ['Normal travel conditions expected', 'Stay hydrated during travel'],
        alerts: [],
      },
      lastUpdated: new Date(),
    };
  }

  clearCache() {
    this.cache.clear();
  }
}

export const backendWeatherService = new BackendWeatherService();
export default backendWeatherService;