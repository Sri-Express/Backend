// src/controllers/adminRouteController.ts - Admin Route Management with Route Admin Assignment Support
import { Request, Response } from 'express';
import Route from '../models/Route';
import User from '../models/User';
import Fleet from '../models/Fleet';
import mongoose from 'mongoose';

// @desc    Create new route (Admin only)
// @route   POST /api/admin/routes
// @access  Private (System Admin)
export const createRoute = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      startLocation,
      endLocation,
      waypoints = [],
      distance,
      estimatedDuration,
      schedules,
      vehicleInfo,
      pricing
    } = req.body;

    // Validate required fields
    if (!name || !startLocation || !endLocation || !distance || !estimatedDuration || !vehicleInfo || !pricing) {
      res.status(400).json({ 
        message: 'Missing required fields: name, startLocation, endLocation, distance, estimatedDuration, vehicleInfo, pricing' 
      });
      return;
    }

    // Validate coordinates format
    const validateCoordinates = (coords: any) => {
      return Array.isArray(coords) && coords.length === 2 && 
             typeof coords[0] === 'number' && typeof coords[1] === 'number';
    };

    if (!validateCoordinates(startLocation.coordinates) || !validateCoordinates(endLocation.coordinates)) {
      res.status(400).json({ 
        message: 'Invalid coordinates format. Expected [longitude, latitude]' 
      });
      return;
    }

    // Validate waypoints coordinates if provided
    if (waypoints.length > 0) {
      for (const waypoint of waypoints) {
        if (!validateCoordinates(waypoint.coordinates)) {
          res.status(400).json({ 
            message: `Invalid waypoint coordinates for ${waypoint.name}. Expected [longitude, latitude]` 
          });
          return;
        }
      }
    }

    // Create route data
    const routeData = {
      name: name.trim(),
      startLocation: {
        name: startLocation.name.trim(),
        coordinates: startLocation.coordinates,
        address: startLocation.address.trim()
      },
      endLocation: {
        name: endLocation.name.trim(),
        coordinates: endLocation.coordinates,
        address: endLocation.address.trim()
      },
      waypoints: waypoints.map((wp: any, index: number) => ({
        name: wp.name.trim(),
        coordinates: wp.coordinates,
        estimatedTime: wp.estimatedTime || (index + 1) * 15, // Default 15 min intervals
        order: wp.order || index + 1
      })),
      distance: parseFloat(distance),
      estimatedDuration: parseInt(estimatedDuration),
      schedules: schedules || [{
        departureTime: "06:00",
        arrivalTime: "08:00",
        frequency: 30,
        daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
        isActive: true
      }],
      operatorInfo: {
        fleetId: new mongoose.Types.ObjectId(), // Temporary system fleet ID
        companyName: "SRI EXPRESS SYSTEM",
        contactNumber: "+94112345678"
      },
      vehicleInfo: {
        type: vehicleInfo.type,
        capacity: parseInt(vehicleInfo.capacity),
        amenities: vehicleInfo.amenities || []
      },
      pricing: {
        basePrice: parseFloat(pricing.basePrice),
        pricePerKm: parseFloat(pricing.pricePerKm),
        discounts: pricing.discounts || [
          { type: 'student', percentage: 10 },
          { type: 'senior', percentage: 15 },
          { type: 'military', percentage: 20 }
        ]
      },
      // Admin-created routes are automatically approved
      approvalStatus: 'approved',
      status: 'active',
      isActive: true,
      submittedAt: new Date(),
      reviewedAt: new Date(),
      reviewedBy: req.user?._id
    };

    // Create route
    const route = new Route(routeData);
    await route.save();

    // Populate the created route
    const populatedRoute = await Route.findById(route._id)
      .populate('reviewedBy', 'name email')
      .populate('routeAdminId', 'name email phone'); // NEW: Include route admin if assigned

    res.status(201).json({
      message: 'Route created successfully',
      route: populatedRoute
    });
  } catch (error) {
    console.error('Create route error:', error);
    
    if (error instanceof Error && error.message.includes('duplicate key')) {
      res.status(400).json({ 
        message: 'Route with similar details already exists' 
      });
    } else if (error instanceof Error && error.name === 'ValidationError') {
      res.status(400).json({ 
        message: 'Validation error', 
        details: error.message 
      });
    } else {
      res.status(500).json({ 
        message: 'Server error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
};

// @desc    Get all route applications with filtering and pagination
// @route   GET /api/admin/routes
// @access  Private (System Admin)
export const getAllRoutes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      approvalStatus = 'all',
      operationalStatus = 'all',
      fleetId = '',
      hasRouteAdmin = 'all', // NEW: Filter by route admin assignment
      sortBy = 'submittedAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    let query: any = { isActive: true };

    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { routeId: { $regex: search, $options: 'i' } },
        { 'startLocation.name': { $regex: search, $options: 'i' } },
        { 'endLocation.name': { $regex: search, $options: 'i' } },
        { 'operatorInfo.companyName': { $regex: search, $options: 'i' } }
      ];
    }

    // Approval status filter
    if (approvalStatus !== 'all') {
      query.approvalStatus = approvalStatus;
    }

    // Operational status filter
    if (operationalStatus !== 'all') {
      query.status = operationalStatus;
    }

    // Fleet filter
    if (fleetId) {
      query['operatorInfo.fleetId'] = fleetId;
    }

    // NEW: Route admin assignment filter
    if (hasRouteAdmin === 'assigned') {
      query.routeAdminId = { $ne: null };
      query['routeAdminAssignment.status'] = 'assigned';
    } else if (hasRouteAdmin === 'unassigned') {
      query.$or = [
        { routeAdminId: null },
        { routeAdminId: { $exists: false } },
        { 'routeAdminAssignment.status': 'unassigned' }
      ];
    }

    // Calculate pagination
    const pageNumber = parseInt(page as string);
    const pageSize = parseInt(limit as string);
    const skip = (pageNumber - 1) * pageSize;

    // Build sort object
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    // Get routes with pagination
    const routes = await Route.find(query)
      .populate('operatorInfo.fleetId', 'companyName email phone status')
      .populate('reviewedBy', 'name email')
      .populate('routeAdminId', 'name email phone') // NEW: Populate route admin
      .populate('routeAdminAssignment.assignedBy', 'name email') // NEW: Populate who assigned
      .sort(sort)
      .skip(skip)
      .limit(pageSize);

    // Get total count for pagination
    const totalRoutes = await Route.countDocuments(query);

    // Get route statistics with route admin info
    const stats = await Route.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$approvalStatus',
          count: { $sum: 1 },
          totalDistance: { $sum: '$distance' },
          avgPrice: { $avg: '$pricing.basePrice' },
          // NEW: Count routes with route admins
          withRouteAdmin: {
            $sum: {
              $cond: [
                { 
                  $and: [
                    { $ne: ['$routeAdminId', null] },
                    { $eq: ['$routeAdminAssignment.status', 'assigned'] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const routeStats = {
      totalApplications: totalRoutes,
      byStatus: stats.reduce((acc, item) => {
        acc[item._id] = {
          count: item.count,
          totalDistance: item.totalDistance,
          avgPrice: item.avgPrice,
          withRouteAdmin: item.withRouteAdmin
        };
        return acc;
      }, {}),
      pendingRoutes: stats.find(s => s._id === 'pending')?.count || 0,
      approvedRoutes: stats.find(s => s._id === 'approved')?.count || 0,
      rejectedRoutes: stats.find(s => s._id === 'rejected')?.count || 0,
      // NEW: Route admin statistics
      routesWithAdmin: routes.filter(r => r.routeAdminId && r.routeAdminAssignment?.status === 'assigned').length,
      routesWithoutAdmin: routes.filter(r => !r.routeAdminId || r.routeAdminAssignment?.status !== 'assigned').length
    };

    res.json({
      routes,
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.ceil(totalRoutes / pageSize),
        totalRoutes,
        hasNext: pageNumber < Math.ceil(totalRoutes / pageSize),
        hasPrev: pageNumber > 1
      },
      stats: routeStats
    });
  } catch (error) {
    console.error('Get all routes error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get route by ID for admin review
// @route   GET /api/admin/routes/:id
// @access  Private (System Admin)
export const getRouteById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid route ID' });
      return;
    }

    const route = await Route.findById(id)
      .populate('operatorInfo.fleetId', 'companyName email phone status documents complianceScore')
      .populate('reviewedBy', 'name email role')
      .populate('routeAdminId', 'name email phone department') // NEW: Include route admin details
      .populate('routeAdminAssignment.assignedBy', 'name email') // NEW: Who assigned the route admin
      .populate('routeAdminAssignment.unassignedBy', 'name email'); // NEW: Who unassigned

    if (!route) {
      res.status(404).json({ message: 'Route not found' });
      return;
    }

    res.json(route);
  } catch (error) {
    console.error('Get route by ID error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Approve route application
// @route   PUT /api/admin/routes/:id/approve
// @access  Private (System Admin)
export const approveRoute = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const adminId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid route ID' });
      return;
    }

    if (!adminId) {
      res.status(401).json({ message: 'Admin ID not found in request' });
      return;
    }

    // Find route
    const route = await Route.findById(id);
    if (!route) {
      res.status(404).json({ message: 'Route not found' });
      return;
    }

    // Check if route can be approved
    if (route.approvalStatus !== 'pending') {
      res.status(400).json({ 
        message: `Route cannot be approved. Current status: ${route.approvalStatus}` 
      });
      return;
    }

    // Verify fleet is still approved
    const fleet = await Fleet.findById(route.operatorInfo.fleetId);
    if (!fleet || fleet.status !== 'approved') {
      res.status(400).json({ 
        message: 'Cannot approve route - fleet is not approved or not found' 
      });
      return;
    }

    // Approve route
    const approvedRoute = await route.approve(adminId, notes);
    
    // Populate admin details
    await approvedRoute.populate('reviewedBy', 'name email');
    await approvedRoute.populate('operatorInfo.fleetId', 'companyName');
    await approvedRoute.populate('routeAdminId', 'name email'); // NEW: Include route admin

    res.json({
      message: 'Route approved successfully',
      route: approvedRoute
    });
  } catch (error) {
    console.error('Approve route error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Reject route application
// @route   PUT /api/admin/routes/:id/reject
// @access  Private (System Admin)
export const rejectRoute = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid route ID' });
      return;
    }

    if (!adminId) {
      res.status(401).json({ message: 'Admin ID not found in request' });
      return;
    }

    if (!reason || reason.trim().length === 0) {
      res.status(400).json({ message: 'Rejection reason is required' });
      return;
    }

    // Find route
    const route = await Route.findById(id);
    if (!route) {
      res.status(404).json({ message: 'Route not found' });
      return;
    }

    // Check if route can be rejected
    if (route.approvalStatus !== 'pending') {
      res.status(400).json({ 
        message: `Route cannot be rejected. Current status: ${route.approvalStatus}` 
      });
      return;
    }

    // Reject route
    const rejectedRoute = await route.reject(adminId, reason.trim());
    
    // Populate admin details
    await rejectedRoute.populate('reviewedBy', 'name email');
    await rejectedRoute.populate('operatorInfo.fleetId', 'companyName');

    res.json({
      message: 'Route rejected successfully',
      route: rejectedRoute
    });
  } catch (error) {
    console.error('Reject route error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Update route details (Admin only)
// @route   PUT /api/admin/routes/:id
// @access  Private (System Admin)
export const updateRoute = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid route ID' });
      return;
    }

    // Find route
    const route = await Route.findById(id);
    if (!route) {
      res.status(404).json({ message: 'Route not found' });
      return;
    }

    // Prevent changes to approval workflow and route admin fields
    const restrictedFields = ['approvalStatus', 'submittedAt', 'reviewedAt', 'reviewedBy', 'routeAdminId', 'routeAdminAssignment'];
    restrictedFields.forEach(field => {
      delete updateData[field];
    });

    // Update route
    const updatedRoute = await Route.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    )
    .populate('operatorInfo.fleetId', 'companyName')
    .populate('reviewedBy', 'name email')
    .populate('routeAdminId', 'name email'); // NEW: Include route admin

    res.json({
      message: 'Route updated successfully',
      route: updatedRoute
    });
  } catch (error) {
    console.error('Update route error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Delete route (soft delete)
// @route   DELETE /api/admin/routes/:id
// @access  Private (System Admin)
export const deleteRoute = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid route ID' });
      return;
    }

    // Find route
    const route = await Route.findById(id);
    if (!route) {
      res.status(404).json({ message: 'Route not found' });
      return;
    }

    // If route has a route admin assigned, unassign first
    if (route.hasRouteAdmin()) {
      await route.unassignRouteAdmin(
        req.user?._id!, 
        'Route deleted by system admin'
      );
    }

    // Soft delete
    route.isActive = false;
    route.status = 'inactive';
    await route.save();

    res.json({ message: 'Route deleted successfully' });
  } catch (error) {
    console.error('Delete route error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get route statistics and dashboard data
// @route   GET /api/admin/routes/stats
// @access  Private (System Admin)
export const getRouteStats = async (req: Request, res: Response): Promise<void> => {
  try {
    // Basic counts
    const totalApplications = await Route.countDocuments({ isActive: true });
    const pendingRoutes = await Route.countDocuments({ approvalStatus: 'pending', isActive: true });
    const approvedRoutes = await Route.countDocuments({ approvalStatus: 'approved', isActive: true });
    const rejectedRoutes = await Route.countDocuments({ approvalStatus: 'rejected', isActive: true });

    // Active operational routes
    const activeRoutes = await Route.countDocuments({ 
      approvalStatus: 'approved', 
      status: 'active', 
      isActive: true 
    });

    // NEW: Route admin statistics
    const routesWithAdmin = await Route.countDocuments({
      routeAdminId: { $ne: null },
      'routeAdminAssignment.status': 'assigned',
      approvalStatus: 'approved',
      isActive: true
    });

    const routesWithoutAdmin = await Route.countDocuments({
      $or: [
        { routeAdminId: null },
        { routeAdminId: { $exists: false } },
        { 'routeAdminAssignment.status': 'unassigned' }
      ],
      approvalStatus: 'approved',
      isActive: true
    });

    // Routes by vehicle type
    const routesByType = await Route.aggregate([
      { $match: { approvalStatus: 'approved', isActive: true } },
      {
        $group: {
          _id: '$vehicleInfo.type',
          count: { $sum: 1 },
          avgPrice: { $avg: '$pricing.basePrice' },
          avgDistance: { $avg: '$distance' },
          totalCapacity: { $sum: '$vehicleInfo.capacity' },
          withRouteAdmin: {
            $sum: {
              $cond: [
                { 
                  $and: [
                    { $ne: ['$routeAdminId', null] },
                    { $eq: ['$routeAdminAssignment.status', 'assigned'] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // Top fleet operators by route count
    const topOperators = await Route.aggregate([
      { $match: { approvalStatus: 'approved', isActive: true } },
      {
        $group: {
          _id: {
            fleetId: '$operatorInfo.fleetId',
            companyName: '$operatorInfo.companyName'
          },
          routeCount: { $sum: 1 },
          totalDistance: { $sum: '$distance' },
          avgRating: { $avg: '$avgRating' },
          routesWithAdmin: {
            $sum: {
              $cond: [
                { 
                  $and: [
                    { $ne: ['$routeAdminId', null] },
                    { $eq: ['$routeAdminAssignment.status', 'assigned'] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      { $sort: { routeCount: -1 } },
      { $limit: 10 }
    ]);

    // NEW: Route admin performance stats
    const routeAdminStats = await Route.aggregate([
      {
        $match: {
          routeAdminId: { $ne: null },
          'routeAdminAssignment.status': 'assigned',
          approvalStatus: 'approved',
          isActive: true
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'routeAdminId',
          foreignField: '_id',
          as: 'routeAdmin'
        }
      },
      { $unwind: '$routeAdmin' },
      {
        $group: {
          _id: '$routeAdminId',
          adminName: { $first: '$routeAdmin.name' },
          adminEmail: { $first: '$routeAdmin.email' },
          routeName: { $first: '$name' },
          routeId: { $first: '$routeId' },
          assignedAt: { $first: '$routeAdminAssignment.assignedAt' },
          avgRating: { $first: '$avgRating' },
          totalReviews: { $first: '$totalReviews' }
        }
      },
      { $sort: { assignedAt: -1 } }
    ]);

    // Recent applications (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentApplications = await Route.countDocuments({
      submittedAt: { $gte: thirtyDaysAgo },
      isActive: true
    });

    // Average approval time
    const approvedWithTimes = await Route.find({
      approvalStatus: 'approved',
      reviewedAt: { $exists: true },
      submittedAt: { $exists: true },
      isActive: true
    }).select('submittedAt reviewedAt');

    const avgApprovalTime = approvedWithTimes.length > 0 
      ? approvedWithTimes.reduce((sum, route) => {
          return sum + (route.reviewedAt!.getTime() - route.submittedAt.getTime());
        }, 0) / approvedWithTimes.length / (1000 * 60 * 60 * 24) // Convert to days
      : 0;

    const stats = {
      totalApplications,
      pendingRoutes,
      approvedRoutes,
      rejectedRoutes,
      activeRoutes,
      recentApplications,
      avgApprovalTime: Math.round(avgApprovalTime * 10) / 10, // Round to 1 decimal
      routesByType,
      topOperators: topOperators.map(op => ({
        ...op._id,
        ...op,
        _id: undefined
      })),
      // NEW: Route admin statistics
      routeAdminStats: {
        routesWithAdmin,
        routesWithoutAdmin,
        totalRouteAdmins: routeAdminStats.length,
        assignmentDetails: routeAdminStats
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Get route stats error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get pending routes requiring review
// @route   GET /api/admin/routes/pending
// @access  Private (System Admin)
export const getPendingRoutes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = 10 } = req.query;

    const pendingRoutes = await Route.find({
      approvalStatus: 'pending',
      isActive: true
    })
    .populate('operatorInfo.fleetId', 'companyName status complianceScore')
    .sort({ submittedAt: 1 }) // Oldest first
    .limit(parseInt(limit as string));

    res.json({
      routes: pendingRoutes,
      count: pendingRoutes.length
    });
  } catch (error) {
    console.error('Get pending routes error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get routes by fleet ID
// @route   GET /api/admin/routes/fleet/:fleetId
// @access  Private (System Admin)
export const getRoutesByFleet = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fleetId } = req.params;
    const { includeAll = false } = req.query;

    if (!mongoose.Types.ObjectId.isValid(fleetId)) {
      res.status(400).json({ message: 'Invalid fleet ID' });
      return;
    }

    let query: any = {
      'operatorInfo.fleetId': fleetId,
      isActive: true
    };

    // By default, only show approved routes, unless includeAll is true
    if (!includeAll) {
      query.approvalStatus = 'approved';
    }

    const routes = await Route.find(query)
      .populate('reviewedBy', 'name email')
      .populate('routeAdminId', 'name email') // NEW: Include route admin
      .sort({ submittedAt: -1 });

    const fleet = await Fleet.findById(fleetId).select('companyName status');

    res.json({
      routes,
      fleet,
      count: routes.length
    });
  } catch (error) {
    console.error('Get routes by fleet error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// ===================================================
// NEW: ROUTE ADMIN ASSIGNMENT MANAGEMENT FUNCTIONS
// ===================================================

// @desc    Assign route admin to route
// @route   PUT /api/admin/routes/:routeId/assign-admin
// @access  Private (System Admin)
export const assignRouteAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { routeId } = req.params;
    const { routeAdminId } = req.body;
    const systemAdminId = req.user?._id;

    if (!systemAdminId) {
      res.status(401).json({ message: 'System admin ID not found' });
      return;
    }

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(routeId) || !mongoose.Types.ObjectId.isValid(routeAdminId)) {
      res.status(400).json({ message: 'Invalid route ID or route admin ID' });
      return;
    }

    // Find route
    const route = await Route.findById(routeId);
    if (!route) {
      res.status(404).json({ message: 'Route not found' });
      return;
    }

    // Check if route is approved
    if (route.approvalStatus !== 'approved') {
      res.status(400).json({ message: 'Only approved routes can have route admins assigned' });
      return;
    }

    // Find route admin
    const routeAdmin = await User.findById(routeAdminId);
    if (!routeAdmin || routeAdmin.role !== 'route_admin') {
      res.status(404).json({ message: 'Route admin not found' });
      return;
    }

    // Check if route admin is already assigned to another route
    const existingAssignment = await Route.findOne({
      routeAdminId: routeAdminId,
      'routeAdminAssignment.status': 'assigned',
      approvalStatus: 'approved',
      isActive: true
    });

    if (existingAssignment) {
      res.status(400).json({ 
        message: 'Route admin is already assigned to another route',
        assignedRoute: {
          _id: existingAssignment._id,
          name: existingAssignment.name,
          routeId: existingAssignment.routeId
        }
      });
      return;
    }

    // Assign route admin to route
    await route.assignRouteAdmin(routeAdminId, systemAdminId);

    // Get updated route with populated data
    const updatedRoute = await Route.findById(routeId)
      .populate('routeAdminId', 'name email phone')
      .populate('routeAdminAssignment.assignedBy', 'name email');

    res.json({
      message: 'Route admin assigned successfully',
      assignment: {
        route: {
          _id: route._id,
          name: route.name,
          routeId: route.routeId
        },
        routeAdmin: {
          _id: routeAdmin._id,
          name: routeAdmin.name,
          email: routeAdmin.email
        },
        assignedAt: updatedRoute?.routeAdminAssignment?.assignedAt,
        assignedBy: updatedRoute?.routeAdminAssignment?.assignedBy
      }
    });
  } catch (error) {
    console.error('Assign route admin error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Remove route admin from route
// @route   DELETE /api/admin/routes/:routeId/remove-admin
// @access  Private (System Admin)
export const removeRouteAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { routeId } = req.params;
    const { reason } = req.body;
    const systemAdminId = req.user?._id;

    if (!systemAdminId) {
      res.status(401).json({ message: 'System admin ID not found' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(routeId)) {
      res.status(400).json({ message: 'Invalid route ID' });
      return;
    }

    // Find route
    const route = await Route.findById(routeId)
      .populate('routeAdminId', 'name email');

    if (!route) {
      res.status(404).json({ message: 'Route not found' });
      return;
    }

    if (!route.hasRouteAdmin()) {
      res.status(400).json({ message: 'No route admin is assigned to this route' });
      return;
    }

    const routeAdmin = route.routeAdminId;

    // Remove route admin assignment
    await route.unassignRouteAdmin(systemAdminId, reason || 'Unassigned by system admin');

    res.json({
      message: 'Route admin removed successfully',
      route: {
        _id: route._id,
        name: route.name,
        routeId: route.routeId
      },
      previousRouteAdmin: routeAdmin
    });
  } catch (error) {
    console.error('Remove route admin error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get all route admin assignments
// @route   GET /api/admin/routes/admin-assignments
// @access  Private (System Admin)
export const getRouteAdminAssignments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status = 'all' } = req.query;

    let query: any = {
      approvalStatus: 'approved',
      isActive: true
    };

    // Filter by assignment status
    if (status === 'assigned') {
      query.routeAdminId = { $ne: null };
      query['routeAdminAssignment.status'] = 'assigned';
    } else if (status === 'unassigned') {
      query.$or = [
        { routeAdminId: null },
        { routeAdminId: { $exists: false } },
        { 'routeAdminAssignment.status': 'unassigned' }
      ];
    }

    const routes = await Route.find(query)
      .populate('routeAdminId', 'name email phone department')
      .populate('routeAdminAssignment.assignedBy', 'name email')
      .populate('routeAdminAssignment.unassignedBy', 'name email')
      .sort({ 'routeAdminAssignment.assignedAt': -1 });

    // Separate assigned and unassigned routes
    const assignedRoutes = routes.filter(r => r.routeAdminId && r.routeAdminAssignment?.status === 'assigned');
    const unassignedRoutes = routes.filter(r => !r.routeAdminId || r.routeAdminAssignment?.status !== 'assigned');

    // Get available route admins (not assigned to any route)
const assignedRouteAdminIds = assignedRoutes
  .filter(r => r.routeAdminId)
  .map(r => r.routeAdminId!._id);
      const availableRouteAdmins = await User.find({
      role: 'route_admin',
      isActive: true,
      _id: { $nin: assignedRouteAdminIds }
    }).select('_id name email phone department');

    const stats = {
      total: routes.length,
      assigned: assignedRoutes.length,
      unassigned: unassignedRoutes.length,
      availableRouteAdmins: availableRouteAdmins.length
    };

    res.json({
      routes: {
        all: routes,
        assigned: assignedRoutes,
        unassigned: unassignedRoutes
      },
      availableRouteAdmins,
      stats
    });
  } catch (error) {
    console.error('Get route admin assignments error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get unassigned approved routes
// @route   GET /api/admin/routes/unassigned
// @access  Private (System Admin)
export const getUnassignedRoutes = async (req: Request, res: Response): Promise<void> => {
  try {
const unassignedRoutes = await Route.find({
  $or: [
    { routeAdminId: { $exists: false } },
    { routeAdminId: null },
    { 'routeAdminAssignment.status': 'unassigned' }
  ],
  approvalStatus: 'approved',
  isActive: true
})
      .populate('operatorInfo.fleetId', 'companyName')
      .sort({ createdAt: -1 });

    const availableRouteAdmins = await User.find({
      role: 'route_admin',
      isActive: true
    }).select('_id name email phone department');

    // Filter out route admins already assigned to routes
    const assignedRouteAdminIds = await Route.find({
      routeAdminId: { $ne: null },
      'routeAdminAssignment.status': 'assigned',
      approvalStatus: 'approved',
      isActive: true
    }).distinct('routeAdminId');

    const unassignedRouteAdmins = availableRouteAdmins.filter(
      admin => !assignedRouteAdminIds.some(id => id.equals(admin._id))
    );

    res.json({
      routes: unassignedRoutes,
      availableRouteAdmins: unassignedRouteAdmins,
      stats: {
        unassignedRoutes: unassignedRoutes.length,
        availableRouteAdmins: unassignedRouteAdmins.length
      }
    });
  } catch (error) {
    console.error('Get unassigned routes error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Bulk assign route admins to routes
// @route   POST /api/admin/routes/bulk-assign-admins
// @access  Private (System Admin)
export const bulkAssignRouteAdmins = async (req: Request, res: Response): Promise<void> => {
  try {
    const { assignments } = req.body; // Array of { routeId, routeAdminId }
    const systemAdminId = req.user?._id;

    if (!systemAdminId) {
      res.status(401).json({ message: 'System admin ID not found' });
      return;
    }

    if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
      res.status(400).json({ message: 'Assignments array is required' });
      return;
    }

    const results = [];
    const errors = [];

    for (const assignment of assignments) {
      const { routeId, routeAdminId } = assignment;

      try {
        // Validate IDs
        if (!mongoose.Types.ObjectId.isValid(routeId) || !mongoose.Types.ObjectId.isValid(routeAdminId)) {
          errors.push({
            routeId,
            routeAdminId,
            error: 'Invalid route ID or route admin ID'
          });
          continue;
        }

        // Find route and route admin
        const route = await Route.findById(routeId);
        const routeAdmin = await User.findById(routeAdminId);

        if (!route || !routeAdmin || routeAdmin.role !== 'route_admin') {
          errors.push({
            routeId,
            routeAdminId,
            error: 'Route or route admin not found'
          });
          continue;
        }

        // Check if route admin is already assigned
        const existingAssignment = await Route.findOne({
          routeAdminId: routeAdminId,
          'routeAdminAssignment.status': 'assigned',
          approvalStatus: 'approved',
          isActive: true
        });

        if (existingAssignment) {
          errors.push({
            routeId,
            routeAdminId,
            error: `Route admin already assigned to route ${existingAssignment.name}`
          });
          continue;
        }

        // Assign route admin
        await route.assignRouteAdmin(routeAdminId, systemAdminId);

        results.push({
          routeId,
          routeAdminId,
          routeName: route.name,
          routeAdminName: routeAdmin.name,
          success: true
        });

      } catch (error) {
        errors.push({
          routeId,
          routeAdminId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    res.json({
      message: 'Bulk assignment completed',
      successful: results.length,
      failed: errors.length,
      results,
      errors
    });
  } catch (error) {
    console.error('Bulk assign route admins error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};