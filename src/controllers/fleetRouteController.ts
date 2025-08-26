// src/controllers/fleetRouteController.ts - Fleet Route Assignment Management
import { Request, Response } from 'express';
import Route from '../models/Route';
import Device from '../models/Device';
import RouteAssignment from '../models/RouteAssignment';
import Fleet from '../models/Fleet';
import mongoose from 'mongoose';

// @desc    Get available routes for fleet assignment
// @route   GET /api/fleet/routes/available
// @access  Private (Fleet Manager)
export const getAvailableRoutes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { vehicleType = 'bus', search = '', sortBy = 'name', sortOrder = 'asc' } = req.query;

    // Build query for approved routes that accept the vehicle type
    let query: any = {
      approvalStatus: 'approved',
      status: 'active',
      isActive: true,
      'vehicleInfo.type': vehicleType
    };

    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { routeId: { $regex: search, $options: 'i' } },
        { 'startLocation.name': { $regex: search, $options: 'i' } },
        { 'endLocation.name': { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    // Get available routes
    const routes = await Route.find(query)
      .select('routeId name startLocation endLocation distance estimatedDuration vehicleInfo pricing')
      .sort(sort);

    // Get assignment counts for each route
    const routesWithAssignments = await Promise.all(
      routes.map(async (route) => {
        const assignmentCount = await RouteAssignment.countDocuments({
          routeId: route._id,
          status: 'active',
          isActive: true
        });

        return {
          ...route.toObject(),
          assignedVehicles: assignmentCount
        };
      })
    );

    res.json({
      routes: routesWithAssignments,
      count: routes.length,
      filters: {
        vehicleType,
        search,
        sortBy,
        sortOrder
      }
    });
  } catch (error) {
    console.error('Get available routes error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get fleet's approved vehicles for route assignment
// @route   GET /api/fleet/vehicles/approved
// @access  Private (Fleet Manager)
export const getApprovedVehicles = async (req: Request, res: Response): Promise<void> => {
  try {
    // Find fleet by user email
    const fleet = await Fleet.findOne({ 
      email: req.user?.email,
      isActive: true 
    });
    
    if (!fleet) {
      res.status(400).json({ message: 'Fleet not found for this user' });
      return;
    }
    
    const fleetId = fleet._id;

    const { status = 'all', vehicleType = 'all' } = req.query;

    // Build query for fleet's approved vehicles
    let query: any = {
      fleetId: fleetId,
      approvalStatus: 'approved',
      isActive: true
    };

    // Filter by operational status
    if (status !== 'all') {
      query.status = status;
    }

    // Filter by vehicle type
    if (vehicleType !== 'all') {
      query.vehicleType = vehicleType;
    }

    // Get approved vehicles
    const vehicles = await Device.find(query)
      .select('deviceId vehicleNumber vehicleType status location batteryLevel signalStrength lastSeen')
      .sort({ vehicleNumber: 1 });

    // Get current route assignments for each vehicle
    const vehiclesWithAssignments = await Promise.all(
      vehicles.map(async (vehicle) => {
        const assignments = await RouteAssignment.find({
          vehicleId: vehicle._id,
          status: 'active',
          isActive: true
        })
        .populate('routeId', 'name routeId')
        .select('routeId assignedAt');

        return {
          ...vehicle.toObject(),
          assignedRoutes: assignments.map(a => ({
            routeId: a.routeId,
            assignedAt: a.assignedAt
          }))
        };
      })
    );

    // Calculate statistics
    const stats = {
      total: vehicles.length,
      online: vehicles.filter(v => v.status === 'online').length,
      offline: vehicles.filter(v => v.status === 'offline').length,
      maintenance: vehicles.filter(v => v.status === 'maintenance').length
    };

    res.json({
      vehicles: vehiclesWithAssignments,
      stats,
      count: vehicles.length
    });
  } catch (error) {
    console.error('Get approved vehicles error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get fleet's current route assignments
// @route   GET /api/fleet/route-assignments
// @access  Private (Fleet Manager)
export const getRouteAssignments = async (req: Request, res: Response): Promise<void> => {
  try {
    // Find fleet by user email
    const fleet = await Fleet.findOne({ 
      email: req.user?.email,
      isActive: true 
    });
    
    if (!fleet) {
      res.status(400).json({ message: 'Fleet not found for this user' });
      return;
    }
    
    const fleetId = fleet._id;

    const { status = 'active', routeId = '', vehicleId = '' } = req.query;

    // Build query
    let query: any = {
      fleetId: fleetId,
      isActive: true
    };

    if (status !== 'all') {
      query.status = status;
    }

    if (routeId) {
      query.routeId = routeId;
    }

    if (vehicleId) {
      query.vehicleId = vehicleId;
    }

    // Get assignments with populated data
    const assignments = await RouteAssignment.find(query)
      .populate('vehicleId', 'vehicleNumber vehicleType status location')
      .populate('routeId', 'name routeId startLocation endLocation distance estimatedDuration pricing')
      .populate('assignedBy', 'name email')
      .sort({ assignedAt: -1 });

    // Calculate assignment statistics
    const stats = {
      total: assignments.length,
      active: assignments.filter(a => a.status === 'active').length,
      inactive: assignments.filter(a => a.status === 'inactive').length,
      suspended: assignments.filter(a => a.status === 'suspended').length
    };

    res.json({
      assignments,
      stats,
      count: assignments.length
    });
  } catch (error) {
    console.error('Get route assignments error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Assign vehicles to a route
// @route   POST /api/fleet/route-assignments
// @access  Private (Fleet Manager)
export const assignVehiclesToRoute = async (req: Request, res: Response): Promise<void> => {
  try {
    const { routeId, vehicleIds, schedules } = req.body;
    // Find fleet by user email
    const fleet = await Fleet.findOne({ 
      email: req.user?.email,
      isActive: true 
    });
    
    if (!fleet) {
      res.status(400).json({ message: 'Fleet not found for this user' });
      return;
    }
    
    const fleetId = fleet._id;
    const userId = req.user?._id;

    if (!fleetId || !userId) {
      res.status(400).json({ message: 'Fleet or User information not found in request' });
      return;
    }

    // Validate input
    if (!routeId || !vehicleIds || !Array.isArray(vehicleIds) || vehicleIds.length === 0) {
      res.status(400).json({ message: 'Route ID and vehicle IDs array are required' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(routeId)) {
      res.status(400).json({ message: 'Invalid route ID' });
      return;
    }

    // Validate all vehicle IDs
    for (const vehicleId of vehicleIds) {
      if (!mongoose.Types.ObjectId.isValid(vehicleId)) {
        res.status(400).json({ message: `Invalid vehicle ID: ${vehicleId}` });
        return;
      }
    }

    // Check if route exists and is available
    const route = await Route.findOne({
      _id: routeId,
      approvalStatus: 'approved',
      status: 'active',
      isActive: true
    });

    if (!route) {
      res.status(404).json({ message: 'Route not found or not available for assignment' });
      return;
    }

    // Check if vehicles belong to the fleet and are approved
    const vehicles = await Device.find({
      _id: { $in: vehicleIds },
      fleetId: fleetId,
      approvalStatus: 'approved',
      isActive: true
    });

    if (vehicles.length !== vehicleIds.length) {
      res.status(400).json({ message: 'Some vehicles are not found or not approved for your fleet' });
      return;
    }

    // Check vehicle type compatibility
    const incompatibleVehicles = vehicles.filter(v => v.vehicleType !== route.vehicleInfo.type);
    if (incompatibleVehicles.length > 0) {
      res.status(400).json({ 
        message: `Vehicle type mismatch. Route requires ${route.vehicleInfo.type} vehicles`,
        incompatibleVehicles: incompatibleVehicles.map(v => v.vehicleNumber)
      });
      return;
    }

    // Check for existing active assignments
    const existingAssignments = await RouteAssignment.find({
      routeId: routeId,
      vehicleId: { $in: vehicleIds },
      status: 'active',
      isActive: true
    });

    if (existingAssignments.length > 0) {
      const alreadyAssigned = existingAssignments.map(a => 
        vehicles.find(v => (v._id as mongoose.Types.ObjectId).equals(a.vehicleId))?.vehicleNumber
      );
      res.status(400).json({ 
        message: 'Some vehicles are already assigned to this route',
        alreadyAssigned: alreadyAssigned.filter(Boolean)
      });
      return;
    }

    // Create assignments
    const assignmentPromises = vehicleIds.map(vehicleId => {
      const assignmentData = {
        fleetId,
        vehicleId,
        routeId,
        assignedBy: userId,
        schedules: schedules || [{
          startTime: "06:00",
          endTime: "22:00",
          daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
          isActive: true
        }],
        status: 'active',
        isActive: true
      };

      return new RouteAssignment(assignmentData).save();
    });

    const assignments = await Promise.all(assignmentPromises);

    // Populate the created assignments
    const populatedAssignments = await RouteAssignment.find({
      _id: { $in: assignments.map(a => a._id) }
    })
    .populate('vehicleId', 'vehicleNumber vehicleType status')
    .populate('routeId', 'name routeId startLocation endLocation')
    .populate('assignedBy', 'name email');

    res.status(201).json({
      message: `Successfully assigned ${vehicleIds.length} vehicle(s) to route`,
      assignments: populatedAssignments,
      count: assignments.length
    });
  } catch (error) {
    console.error('Assign vehicles to route error:', error);
    
    if (error instanceof Error && error.message.includes('duplicate key')) {
      res.status(400).json({ 
        message: 'One or more vehicles are already assigned to this route' 
      });
    } else {
      res.status(500).json({ 
        message: 'Server error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
};

// @desc    Unassign vehicle from route
// @route   DELETE /api/fleet/route-assignments/:routeId/:vehicleId
// @access  Private (Fleet Manager)
export const unassignVehicleFromRoute = async (req: Request, res: Response): Promise<void> => {
  try {
    const { routeId, vehicleId } = req.params;
    const { reason } = req.body;
    // Find fleet by user email
    const fleet = await Fleet.findOne({ 
      email: req.user?.email,
      isActive: true 
    });
    
    if (!fleet) {
      res.status(400).json({ message: 'Fleet not found for this user' });
      return;
    }
    
    const fleetId = fleet._id;
    const userId = req.user?._id;

    if (!fleetId || !userId) {
      res.status(400).json({ message: 'Fleet or User information not found in request' });
      return;
    }

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(routeId) || !mongoose.Types.ObjectId.isValid(vehicleId)) {
      res.status(400).json({ message: 'Invalid route ID or vehicle ID' });
      return;
    }

    // Find the assignment
    const assignment = await RouteAssignment.findOne({
      routeId,
      vehicleId,
      fleetId,
      status: 'active',
      isActive: true
    });

    if (!assignment) {
      res.status(404).json({ message: 'Active assignment not found' });
      return;
    }

    // Unassign the vehicle
    await assignment.unassign(userId, reason);

    res.json({
      message: 'Vehicle successfully unassigned from route',
      assignment: assignment
    });
  } catch (error) {
    console.error('Unassign vehicle from route error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Update route assignment schedules
// @route   PUT /api/fleet/route-assignments/:assignmentId/schedules
// @access  Private (Fleet Manager)
export const updateAssignmentSchedules = async (req: Request, res: Response): Promise<void> => {
  try {
    const { assignmentId } = req.params;
    const { schedules } = req.body;
    // Find fleet by user email
    const fleet = await Fleet.findOne({ 
      email: req.user?.email,
      isActive: true 
    });
    
    if (!fleet) {
      res.status(400).json({ message: 'Fleet not found for this user' });
      return;
    }
    
    const fleetId = fleet._id;

    // Validate assignment ID
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      res.status(400).json({ message: 'Invalid assignment ID' });
      return;
    }

    // Validate schedules
    if (!schedules || !Array.isArray(schedules) || schedules.length === 0) {
      res.status(400).json({ message: 'Valid schedules array is required' });
      return;
    }

    // Find the assignment
    const assignment = await RouteAssignment.findOne({
      _id: assignmentId,
      fleetId,
      status: 'active',
      isActive: true
    });

    if (!assignment) {
      res.status(404).json({ message: 'Assignment not found or not accessible' });
      return;
    }

    // Update schedules - ensure proper type casting
    assignment.schedules = schedules as any;
    assignment.updatedAt = new Date();
    await assignment.save();

    // Populate and return updated assignment
    const updatedAssignment = await RouteAssignment.findById(assignment._id)
      .populate('vehicleId', 'vehicleNumber vehicleType')
      .populate('routeId', 'name routeId');

    res.json({
      message: 'Assignment schedules updated successfully',
      assignment: updatedAssignment
    });
  } catch (error) {
    console.error('Update assignment schedules error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get assignment performance statistics
// @route   GET /api/fleet/route-assignments/:assignmentId/performance
// @access  Private (Fleet Manager)
export const getAssignmentPerformance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { assignmentId } = req.params;
    // Find fleet by user email
    const fleet = await Fleet.findOne({ 
      email: req.user?.email,
      isActive: true 
    });
    
    if (!fleet) {
      res.status(400).json({ message: 'Fleet not found for this user' });
      return;
    }
    
    const fleetId = fleet._id;

    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      res.status(400).json({ message: 'Invalid assignment ID' });
      return;
    }

    const assignment = await RouteAssignment.findOne({
      _id: assignmentId,
      fleetId,
      isActive: true
    })
    .populate('vehicleId', 'vehicleNumber vehicleType')
    .populate('routeId', 'name routeId distance pricing');

    if (!assignment) {
      res.status(404).json({ message: 'Assignment not found' });
      return;
    }

    // Calculate additional performance metrics
    const completionRate = assignment.performance.totalTrips > 0 
      ? (assignment.performance.completedTrips / assignment.performance.totalTrips) * 100 
      : 0;

    const avgRevenuePerTrip = assignment.performance.completedTrips > 0
      ? assignment.performance.totalRevenue / assignment.performance.completedTrips
      : 0;

    const performanceData = {
      ...assignment.performance,
      completionRate: Math.round(completionRate * 100) / 100,
      avgRevenuePerTrip: Math.round(avgRevenuePerTrip * 100) / 100,
      assignmentDuration: Math.ceil((new Date().getTime() - assignment.assignedAt.getTime()) / (1000 * 60 * 60 * 24)) // days
    };

    res.json({
      assignment: {
        _id: assignment._id,
        vehicle: assignment.vehicleId,
        route: assignment.routeId,
        assignedAt: assignment.assignedAt,
        status: assignment.status
      },
      performance: performanceData
    });
  } catch (error) {
    console.error('Get assignment performance error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get fleet route assignment dashboard stats
// @route   GET /api/fleet/route-assignments/stats
// @access  Private (Fleet Manager)
export const getFleetRouteStats = async (req: Request, res: Response): Promise<void> => {
  try {
    // Find fleet by user email
    const fleet = await Fleet.findOne({ 
      email: req.user?.email,
      isActive: true 
    });
    
    if (!fleet) {
      res.status(400).json({ message: 'Fleet not found for this user' });
      return;
    }
    
    const fleetId = fleet._id;

    // Get assignment counts by status
    const assignmentStats = await RouteAssignment.aggregate([
      { $match: { fleetId: fleetId, isActive: true } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$performance.totalRevenue' },
          totalTrips: { $sum: '$performance.totalTrips' }
        }
      }
    ]);

    // Get vehicle utilization
    const vehicleStats = await Device.aggregate([
      { $match: { fleetId: fleetId, approvalStatus: 'approved', isActive: true } },
      {
        $lookup: {
          from: 'routeassignments',
          localField: '_id',
          foreignField: 'vehicleId',
          as: 'assignments',
          pipeline: [
            { $match: { status: 'active', isActive: true } }
          ]
        }
      },
      {
        $group: {
          _id: null,
          totalVehicles: { $sum: 1 },
          assignedVehicles: {
            $sum: {
              $cond: [{ $gt: [{ $size: '$assignments' }, 0] }, 1, 0]
            }
          }
        }
      }
    ]);

    // Get recent assignments
    const recentAssignments = await RouteAssignment.find({
      fleetId,
      isActive: true
    })
    .populate('vehicleId', 'vehicleNumber vehicleType')
    .populate('routeId', 'name routeId')
    .sort({ assignedAt: -1 })
    .limit(5);

    const stats = {
      assignments: assignmentStats.reduce((acc, stat) => {
        acc[stat._id] = {
          count: stat.count,
          totalRevenue: stat.totalRevenue,
          totalTrips: stat.totalTrips
        };
        return acc;
      }, {} as any),
      vehicles: vehicleStats[0] || { totalVehicles: 0, assignedVehicles: 0 },
      recentAssignments,
      utilization: vehicleStats[0] 
        ? Math.round((vehicleStats[0].assignedVehicles / vehicleStats[0].totalVehicles) * 100) 
        : 0
    };

    res.json(stats);
  } catch (error) {
    console.error('Get fleet route stats error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};