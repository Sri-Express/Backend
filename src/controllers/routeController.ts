// src/controllers/routeController.ts - FIXED VERSION
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import Route from '../models/Route';
import Fleet from '../models/Fleet';
import LocationTracking from '../models/LocationTracking';

// @desc    Get all routes with filtering and pagination
// @route   GET /api/routes
// @access  Public
export const getRoutes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, status = 'active', vehicleType, startLocation, endLocation, sortBy = 'name', sortOrder = 'asc' } = req.query;
    const pageNum = parseInt(page as string); const limitNum = parseInt(limit as string); const skip = (pageNum - 1) * limitNum;
    
    // Build filter query
    const filter: any = { isActive: true };
    if (status && status !== 'all') filter.status = status;
    if (vehicleType) filter['vehicleInfo.type'] = vehicleType;
    if (startLocation) filter['startLocation.name'] = new RegExp(startLocation as string, 'i');
    if (endLocation) filter['endLocation.name'] = new RegExp(endLocation as string, 'i');

    // Build sort object
    const sortObject: any = {}; sortObject[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    // Get routes with pagination
    const routes = await Route.find(filter).populate('operatorInfo.fleetId', 'companyName status').sort(sortObject).skip(skip).limit(limitNum);
    const totalRoutes = await Route.countDocuments(filter); const totalPages = Math.ceil(totalRoutes / limitNum);

    res.json({ routes, pagination: { currentPage: pageNum, totalPages, totalRoutes, hasNextPage: pageNum < totalPages, hasPrevPage: pageNum > 1 } });
  } catch (error) {
    console.error('Get routes error:', error);
    res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// @desc    Search routes between locations
// @route   GET /api/routes/search
// @access  Public
export const searchRoutes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { from, to, date, vehicleType, maxPrice, sortBy = 'departureTime' } = req.query;
    if (!from || !to) { res.status(400).json({ message: 'From and to locations are required' }); return; }

    // Build search query
    const searchQuery: any = { isActive: true, status: 'active', $or: [
      { 'startLocation.name': new RegExp(from as string, 'i'), 'endLocation.name': new RegExp(to as string, 'i') },
      { 'waypoints.name': new RegExp(from as string, 'i'), 'endLocation.name': new RegExp(to as string, 'i') },
      { 'startLocation.name': new RegExp(from as string, 'i'), 'waypoints.name': new RegExp(to as string, 'i') }
    ]};
    if (vehicleType) searchQuery['vehicleInfo.type'] = vehicleType;
    if (maxPrice) searchQuery['pricing.basePrice'] = { $lte: parseInt(maxPrice as string) };

    // Get routes
    const routes = await Route.find(searchQuery).populate('operatorInfo.fleetId', 'companyName contactNumber status').sort({ 'pricing.basePrice': 1 });

    // Filter schedules based on date if provided
    const routesWithSchedules = routes.map(route => {
      let filteredSchedules = route.schedules.filter(schedule => schedule.isActive);
      if (date) {
        const searchDate = new Date(date as string);
        const dayOfWeek = searchDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        filteredSchedules = filteredSchedules.filter(schedule => schedule.daysOfWeek.includes(dayOfWeek));
      }
      return { ...route.toObject(), schedules: filteredSchedules, availableSchedules: filteredSchedules.length };
    });

    const availableRoutes = routesWithSchedules.filter(route => route.availableSchedules > 0);
    res.json({ routes: availableRoutes, searchParams: { from, to, date, vehicleType }, totalResults: availableRoutes.length });
  } catch (error) {
    console.error('Search routes error:', error);
    res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// @desc    Get route by ID
// @route   GET /api/routes/:id
// @access  Public
export const getRouteById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const route = await Route.findById(id).populate('operatorInfo.fleetId', 'companyName contactNumber status documents');
    if (!route) { res.status(404).json({ message: 'Route not found' }); return; }

    const nextDepartures = route.getNextDepartures(10);
    res.json({ route, nextDepartures, pricing: { regular: route.calculatePrice('regular'), student: route.calculatePrice('student'), senior: route.calculatePrice('senior'), military: route.calculatePrice('military') } });
  } catch (error) {
    console.error('Get route by ID error:', error);
    res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// @desc    Get route schedules
// @route   GET /api/routes/:id/schedules
// @access  Public
export const getRouteSchedules = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params; const { date } = req.query;
    const route = await Route.findById(id);
    if (!route) { res.status(404).json({ message: 'Route not found' }); return; }

    let schedules = route.schedules.filter(schedule => schedule.isActive);
    if (date) {
      const searchDate = new Date(date as string);
      const dayOfWeek = searchDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      schedules = schedules.filter(schedule => schedule.daysOfWeek.includes(dayOfWeek));
    }

    const schedulesWithPricing = schedules.map(schedule => {
      const scheduleObj = schedule.toObject ? schedule.toObject() : schedule;
      return { ...scheduleObj, pricing: { regular: route.calculatePrice('regular'), student: route.calculatePrice('student'), senior: route.calculatePrice('senior'), military: route.calculatePrice('military') } };
    });

    res.json({ routeId: route._id, routeName: route.name, schedules: schedulesWithPricing, date: date || 'all' });
  } catch (error) {
    console.error('Get route schedules error:', error);
    res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// @desc    Get real-time route information
// @route   GET /api/routes/:id/realtime
// @access  Public
export const getRouteRealTime = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const route = await Route.findById(id);
    if (!route) { res.status(404).json({ message: 'Route not found' }); return; }

    // ✅ FIXED: Cast route._id to proper ObjectId type
    const liveVehicles = await LocationTracking.getRouteVehicles(route._id as Types.ObjectId);
    const totalDelay = liveVehicles.reduce((sum: number, vehicle: any) => sum + vehicle.operationalInfo.delays.currentDelay, 0);
    const avgDelay = liveVehicles.length > 0 ? totalDelay / liveVehicles.length : 0;

    let serviceStatus = 'normal';
    if (avgDelay > 15) serviceStatus = 'delayed';
    else if (avgDelay > 30) serviceStatus = 'severely_delayed';

    const vehicleStatusCount = liveVehicles.reduce((acc: any, vehicle: any) => {
      const status = vehicle.operationalInfo.status;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as any);

    res.json({ routeId: route._id, routeName: route.name, serviceStatus, statistics: { totalVehicles: liveVehicles.length, averageDelay: Math.round(avgDelay), vehicleStatusCount }, liveVehicles: liveVehicles.map((vehicle: any) => ({ vehicleId: vehicle.vehicleId, vehicleNumber: vehicle.vehicleNumber, location: vehicle.location, progress: vehicle.routeProgress, passengerLoad: vehicle.passengerLoad, status: vehicle.operationalInfo.status, delay: vehicle.operationalInfo.delays.currentDelay, lastUpdate: vehicle.timestamp })) });
  } catch (error) {
    console.error('Get route real-time error:', error);
    res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// @desc    Create new route (Admin only)
// @route   POST /api/routes
// @access  Private (Admin)
export const createRoute = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, startLocation, endLocation, waypoints = [], distance, estimatedDuration, schedules, operatorInfo, vehicleInfo, pricing } = req.body;
    if (!name || !startLocation || !endLocation || !distance || !estimatedDuration || !schedules || !operatorInfo || !vehicleInfo || !pricing) { res.status(400).json({ message: 'Missing required fields' }); return; }

    const fleet = await Fleet.findById(operatorInfo.fleetId);
    if (!fleet || fleet.status !== 'approved') { res.status(400).json({ message: 'Fleet not found or not approved' }); return; }

    const route = new Route({ name, startLocation, endLocation, waypoints, distance, estimatedDuration, schedules, operatorInfo: { ...operatorInfo, companyName: fleet.companyName }, vehicleInfo, pricing });
    await route.save();

    res.status(201).json({ message: 'Route created successfully', route });
  } catch (error) {
    console.error('Create route error:', error);
    res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// @desc    Update route (Admin only)
// @route   PUT /api/routes/:id
// @access  Private (Admin)
export const updateRoute = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params; const updates = req.body;
    const route = await Route.findByIdAndUpdate(id, { ...updates, updatedAt: new Date() }, { new: true, runValidators: true });
    if (!route) { res.status(404).json({ message: 'Route not found' }); return; }

    res.json({ message: 'Route updated successfully', route });
  } catch (error) {
    console.error('Update route error:', error);
    res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// @desc    Delete route (Admin only)
// @route   DELETE /api/routes/:id
// @access  Private (Admin)
export const deleteRoute = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const route = await Route.findByIdAndUpdate(id, { isActive: false, status: 'inactive' }, { new: true });
    if (!route) { res.status(404).json({ message: 'Route not found' }); return; }

    res.json({ message: 'Route deleted successfully', route });
  } catch (error) {
    console.error('Delete route error:', error);
    res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// @desc    Get route statistics
// @route   GET /api/routes/stats
// @access  Private (Admin)
export const getRouteStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalRoutes = await Route.countDocuments({ isActive: true });
    const activeRoutes = await Route.countDocuments({ isActive: true, status: 'active' });
    const inactiveRoutes = await Route.countDocuments({ isActive: true, status: 'inactive' });
    
    const routesByType = await Route.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$vehicleInfo.type', count: { $sum: 1 }, avgPrice: { $avg: '$pricing.basePrice' }, avgDistance: { $avg: '$distance' } } }
    ]);

    const topOperators = await Route.aggregate([
      { $match: { isActive: true, status: 'active' } },
      { $group: { _id: '$operatorInfo.companyName', routeCount: { $sum: 1 }, totalDistance: { $sum: '$distance' } } },
      { $sort: { routeCount: -1 } }, { $limit: 10 }
    ]);

    res.json({ overview: { totalRoutes, activeRoutes, inactiveRoutes }, routesByType, topOperators });
  } catch (error) {
    console.error('Get route stats error:', error);
    res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};