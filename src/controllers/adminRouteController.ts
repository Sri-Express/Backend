// src/controllers/adminRouteController.ts - Admin Route Management with Approval Workflow
import { Request, Response } from 'express';
import Route from '../models/Route';
import Fleet from '../models/Fleet';
import mongoose from 'mongoose';

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
      .sort(sort)
      .skip(skip)
      .limit(pageSize);

    // Get total count for pagination
    const totalRoutes = await Route.countDocuments(query);

    // Get route statistics
    const stats = await Route.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$approvalStatus',
          count: { $sum: 1 },
          totalDistance: { $sum: '$distance' },
          avgPrice: { $avg: '$pricing.basePrice' }
        }
      }
    ]);

    const routeStats = {
      totalApplications: totalRoutes,
      byStatus: stats.reduce((acc, item) => {
        acc[item._id] = {
          count: item.count,
          totalDistance: item.totalDistance,
          avgPrice: item.avgPrice
        };
        return acc;
      }, {}),
      pendingRoutes: stats.find(s => s._id === 'pending')?.count || 0,
      approvedRoutes: stats.find(s => s._id === 'approved')?.count || 0,
      rejectedRoutes: stats.find(s => s._id === 'rejected')?.count || 0
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
      .populate('reviewedBy', 'name email role');

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

    // Prevent changes to approval workflow fields
    const restrictedFields = ['approvalStatus', 'submittedAt', 'reviewedAt', 'reviewedBy'];
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
    .populate('reviewedBy', 'name email');

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

    // Routes by vehicle type
    const routesByType = await Route.aggregate([
      { $match: { approvalStatus: 'approved', isActive: true } },
      {
        $group: {
          _id: '$vehicleInfo.type',
          count: { $sum: 1 },
          avgPrice: { $avg: '$pricing.basePrice' },
          avgDistance: { $avg: '$distance' },
          totalCapacity: { $sum: '$vehicleInfo.capacity' }
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
          avgRating: { $avg: '$avgRating' }
        }
      },
      { $sort: { routeCount: -1 } },
      { $limit: 10 }
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
      }))
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