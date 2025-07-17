// src/controllers/trackingController.ts
import { Request, Response } from 'express';
import LocationTracking from '../models/LocationTracking';
import Route from '../models/Route';
import Device from '../models/Device';
import Booking from '../models/Booking';

// @desc    Get live vehicle locations
// @route   GET /api/tracking/live
// @access  Public
export const getLiveLocations = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      bounds,
      routeId,
      vehicleType,
      status,
      limit = 50
    } = req.query;

    // Build filter query
    const filter: any = {
      isActive: true,
      timestamp: {
        $gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
      }
    };

    if (routeId) {
      filter.routeId = routeId;
    }

    if (status) {
      filter['operationalInfo.status'] = status;
    }

    // Add bounds filter if provided
    if (bounds) {
      try {
        const boundsObj = JSON.parse(bounds as string);
        filter['location.latitude'] = {
          $gte: boundsObj.southWest.lat,
          $lte: boundsObj.northEast.lat
        };
        filter['location.longitude'] = {
          $gte: boundsObj.southWest.lng,
          $lte: boundsObj.northEast.lng
        };
      } catch (error) {
        res.status(400).json({ message: 'Invalid bounds format' });
        return;
      }
    }

    // Get latest location for each vehicle
    const vehicles = await LocationTracking.aggregate([
      { $match: filter },
      { $sort: { vehicleId: 1, timestamp: -1 } },
      {
        $group: {
          _id: '$vehicleId',
          latestLocation: { $first: '$$ROOT' }
        }
      },
      { $replaceRoot: { newRoot: '$latestLocation' } },
      { $limit: parseInt(limit as string) },
      {
        $lookup: {
          from: 'routes',
          localField: 'routeId',
          foreignField: '_id',
          as: 'route'
        }
      },
      {
        $lookup: {
          from: 'devices',
          localField: 'deviceId',
          foreignField: '_id',
          as: 'device'
        }
      }
    ]);

    res.json({
      vehicles,
      totalVehicles: vehicles.length,
      lastUpdate: new Date()
    });
  } catch (error) {
    console.error('Get live locations error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get vehicles on specific route
// @route   GET /api/tracking/route/:routeId
// @access  Public
export const getRouteVehicles = async (req: Request, res: Response): Promise<void> => {
  try {
    const { routeId } = req.params;

    // Verify route exists
    const route = await Route.findById(routeId);
    if (!route) {
      res.status(404).json({ message: 'Route not found' });
      return;
    }

    // Get live vehicles on this route
    const vehicles = await LocationTracking.getRouteVehicles(route._id);

    // Calculate route statistics
    const stats = {
      totalVehicles: vehicles.length,
      onTime: vehicles.filter(v => v.operationalInfo.delays.currentDelay <= 5).length,
      delayed: vehicles.filter(v => v.operationalInfo.delays.currentDelay > 5).length,
      avgDelay: vehicles.length > 0 
        ? vehicles.reduce((sum, v) => sum + v.operationalInfo.delays.currentDelay, 0) / vehicles.length 
        : 0,
      avgLoad: vehicles.length > 0
        ? vehicles.reduce((sum, v) => sum + v.passengerLoad.loadPercentage, 0) / vehicles.length
        : 0
    };

    res.json({
      route: {
        id: route._id,
        name: route.name,
        startLocation: route.startLocation,
        endLocation: route.endLocation
      },
      vehicles,
      statistics: stats,
      lastUpdate: new Date()
    });
  } catch (error) {
    console.error('Get route vehicles error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Update vehicle location
// @route   POST /api/tracking/update
// @access  Private (Device/Driver)
export const updateVehicleLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      deviceId,
      vehicleId,
      location,
      routeProgress,
      passengerLoad,
      operationalInfo,
      environmentalData
    } = req.body;

    // Validate required fields
    if (!deviceId || !vehicleId || !location) {
      res.status(400).json({ message: 'Missing required location data' });
      return;
    }

    // Verify device exists
    const device = await Device.findById(deviceId);
    if (!device) {
      res.status(404).json({ message: 'Device not found' });
      return;
    }

    // Get route information
    const route = await Route.findById(operationalInfo?.tripInfo?.routeId);
    if (!route) {
      res.status(404).json({ message: 'Route not found' });
      return;
    }

    // Create location tracking record
    const locationData = new LocationTracking({
      deviceId,
      routeId: route._id,
      vehicleId,
      vehicleNumber: device.vehicleNumber,
      location,
      routeProgress: routeProgress || {
        currentWaypoint: 0,
        distanceCovered: 0,
        estimatedTimeToDestination: 0,
        nextStopETA: new Date(),
        progressPercentage: 0
      },
      passengerLoad: passengerLoad || {
        currentCapacity: 0,
        maxCapacity: route.vehicleInfo.capacity,
        boardingCount: 0,
        alightingCount: 0,
        loadPercentage: 0
      },
      operationalInfo: operationalInfo || {
        driverInfo: {
          driverId: 'unknown',
          driverName: 'Unknown Driver',
          contactNumber: 'N/A'
        },
        tripInfo: {
          tripId: `TRIP_${Date.now()}`,
          scheduleId: 'default',
          departureTime: '00:00',
          estimatedArrival: new Date()
        },
        status: 'on_route',
        delays: {
          currentDelay: 0
        }
      },
      environmentalData: environmentalData || {
        trafficCondition: 'light'
      }
    });

    await locationData.save();

    // Update device's last location
    await Device.findByIdAndUpdate(deviceId, {
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        lastUpdated: new Date()
      },
      lastSeen: new Date()
    });

    res.json({
      message: 'Location updated successfully',
      trackingId: locationData._id,
      timestamp: locationData.timestamp
    });
  } catch (error) {
    console.error('Update vehicle location error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get ETA for specific booking
// @route   GET /api/tracking/eta/:bookingId
// @access  Private
export const getETAForBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { bookingId } = req.params;

    // Get booking information
    const booking = await Booking.findById(bookingId)
      .populate('routeId', 'name startLocation endLocation waypoints');

    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }

    // Check if user owns this booking
    if (booking.userId.toString() !== req.user._id.toString()) {
      res.status(403).json({ message: 'Not authorized to view this booking' });
      return;
    }

    // Get current vehicles on this route
    const vehicles = await LocationTracking.getRouteVehicles(booking.routeId._id);

    if (vehicles.length === 0) {
      res.json({
        message: 'No vehicles currently tracked on this route',
        eta: null,
        status: 'no_tracking'
      });
      return;
    }

    // Find the most relevant vehicle (closest to departure time or earliest on route)
    const relevantVehicle = vehicles.reduce((best, current) => {
      // Prefer vehicles that are on time or have less delay
      if (current.operationalInfo.delays.currentDelay < best.operationalInfo.delays.currentDelay) {
        return current;
      }
      return best;
    });

    // Calculate ETA based on vehicle progress and delays
    const baseETA = new Date(`${booking.travelDate.toISOString().split('T')[0]}T${booking.departureTime}:00`);
    const estimatedArrival = relevantVehicle.getEstimatedArrival();
    const currentDelay = relevantVehicle.operationalInfo.delays.currentDelay;

    res.json({
      booking: {
        id: booking._id,
        bookingId: booking.bookingId,
        route: booking.routeId.name,
        travelDate: booking.travelDate,
        departureTime: booking.departureTime
      },
      eta: {
        scheduledDeparture: baseETA,
        estimatedDeparture: new Date(baseETA.getTime() + (currentDelay * 60 * 1000)),
        currentDelay: currentDelay,
        status: currentDelay > 15 ? 'delayed' : currentDelay > 5 ? 'slightly_delayed' : 'on_time'
      },
      vehicle: {
        vehicleId: relevantVehicle.vehicleId,
        vehicleNumber: relevantVehicle.vehicleNumber,
        location: relevantVehicle.location,
        progress: relevantVehicle.routeProgress,
        lastUpdate: relevantVehicle.timestamp
      }
    });
  } catch (error) {
    console.error('Get ETA for booking error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get vehicle tracking history
// @route   GET /api/tracking/history/:vehicleId
// @access  Private (Admin)
export const getVehicleHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { vehicleId } = req.params;
    const {
      startDate,
      endDate,
      limit = 100
    } = req.query;

    // Build date filter
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.$gte = new Date(startDate as string);
    }
    if (endDate) {
      dateFilter.$lte = new Date(endDate as string);
    }

    const filter: any = { vehicleId };
    if (Object.keys(dateFilter).length > 0) {
      filter.timestamp = dateFilter;
    }

    // Get tracking history
    const history = await LocationTracking.find(filter)
      .populate('routeId', 'name startLocation endLocation')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit as string));

    // Calculate summary statistics
    const stats = {
      totalRecords: history.length,
      avgSpeed: history.length > 0 
        ? history.reduce((sum, record) => sum + record.location.speed, 0) / history.length 
        : 0,
      avgDelay: history.length > 0
        ? history.reduce((sum, record) => sum + record.operationalInfo.delays.currentDelay, 0) / history.length
        : 0,
      totalDistance: history.reduce((sum, record) => sum + record.routeProgress.distanceCovered, 0)
    };

    res.json({
      vehicleId,
      history,
      statistics: stats,
      period: {
        startDate: startDate || 'all',
        endDate: endDate || 'all'
      }
    });
  } catch (error) {
    console.error('Get vehicle history error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get tracking analytics
// @route   GET /api/tracking/analytics
// @access  Private (Admin)
export const getTrackingAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      period = '24h',
      routeId,
      vehicleType
    } = req.query;

    // Calculate time range
    let timeRange: Date;
    switch (period) {
      case '1h':
        timeRange = new Date(Date.now() - 60 * 60 * 1000);
        break;
      case '6h':
        timeRange = new Date(Date.now() - 6 * 60 * 60 * 1000);
        break;
      case '24h':
        timeRange = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        timeRange = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        timeRange = new Date(Date.now() - 24 * 60 * 60 * 1000);
    }

    // Build match query
    const matchQuery: any = {
      timestamp: { $gte: timeRange },
      isActive: true
    };

    if (routeId) {
      matchQuery.routeId = routeId;
    }

    // Get tracking statistics
    const stats = await LocationTracking.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalVehicles: { $addToSet: '$vehicleId' },
          avgSpeed: { $avg: '$location.speed' },
          avgDelay: { $avg: '$operationalInfo.delays.currentDelay' },
          avgLoad: { $avg: '$passengerLoad.loadPercentage' },
          totalRecords: { $sum: 1 }
        }
      },
      {
        $project: {
          totalVehicles: { $size: '$totalVehicles' },
          avgSpeed: { $round: ['$avgSpeed', 1] },
          avgDelay: { $round: ['$avgDelay', 1] },
          avgLoad: { $round: ['$avgLoad', 1] },
          totalRecords: 1
        }
      }
    ]);

    // Get status distribution
    const statusDistribution = await LocationTracking.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$operationalInfo.status',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get hourly tracking volume
    const hourlyVolume = await LocationTracking.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            hour: { $hour: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' }
          },
          count: { $sum: 1 },
          uniqueVehicles: { $addToSet: '$vehicleId' }
        }
      },
      {
        $project: {
          hour: '$_id.hour',
          day: '$_id.day',
          count: 1,
          uniqueVehicles: { $size: '$uniqueVehicles' }
        }
      },
      { $sort: { '_id.day': 1, '_id.hour': 1 } }
    ]);

    res.json({
      period,
      summary: stats[0] || {
        totalVehicles: 0,
        avgSpeed: 0,
        avgDelay: 0,
        avgLoad: 0,
        totalRecords: 0
      },
      statusDistribution,
      hourlyVolume,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('Get tracking analytics error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};