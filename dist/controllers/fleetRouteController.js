"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFleetRouteStats = exports.getAssignmentPerformance = exports.updateAssignmentStatus = exports.unassignVehicleFromRoute = exports.assignVehiclesToRoute = exports.getRouteAssignments = exports.getApprovedVehicles = exports.getAvailableRoutes = void 0;
const Route_1 = __importDefault(require("../models/Route"));
const Device_1 = __importDefault(require("../models/Device"));
const RouteAssignment_1 = __importDefault(require("../models/RouteAssignment"));
const Fleet_1 = __importDefault(require("../models/Fleet"));
const mongoose_1 = __importDefault(require("mongoose"));
// @desc    Get available routes for fleet assignment
// @route   GET /api/fleet/routes/available
// @access  Private (Fleet Manager)
const getAvailableRoutes = async (req, res) => {
    try {
        const { vehicleType = 'bus', search = '', sortBy = 'name', sortOrder = 'asc' } = req.query;
        // Build query for approved routes that accept the vehicle type
        let query = {
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
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
        // Get available routes
        const routes = await Route_1.default.find(query)
            .select('routeId name startLocation endLocation distance estimatedDuration vehicleInfo pricing')
            .sort(sort);
        // Get assignment counts for each route
        const routesWithAssignments = await Promise.all(routes.map(async (route) => {
            const assignmentCount = await RouteAssignment_1.default.countDocuments({
                routeId: route._id,
                status: 'active',
                isActive: true
            });
            return {
                ...route.toObject(),
                assignedVehicles: assignmentCount
            };
        }));
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
    }
    catch (error) {
        console.error('Get available routes error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getAvailableRoutes = getAvailableRoutes;
// @desc    Get fleet's approved vehicles for route assignment
// @route   GET /api/fleet/vehicles/approved
// @access  Private (Fleet Manager)
const getApprovedVehicles = async (req, res) => {
    var _a;
    try {
        // Find fleet by user email
        const fleet = await Fleet_1.default.findOne({
            email: (_a = req.user) === null || _a === void 0 ? void 0 : _a.email,
            isActive: true
        });
        if (!fleet) {
            res.status(400).json({ message: 'Fleet not found for this user' });
            return;
        }
        const fleetId = fleet._id;
        const { status = 'all', vehicleType = 'all' } = req.query;
        // Build query for fleet's approved vehicles
        let query = {
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
        const vehicles = await Device_1.default.find(query)
            .select('deviceId vehicleNumber vehicleType status location batteryLevel signalStrength lastSeen')
            .sort({ vehicleNumber: 1 });
        // Get current route assignments for each vehicle
        const vehiclesWithAssignments = await Promise.all(vehicles.map(async (vehicle) => {
            const assignments = await RouteAssignment_1.default.find({
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
        }));
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
    }
    catch (error) {
        console.error('Get approved vehicles error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getApprovedVehicles = getApprovedVehicles;
// @desc    Get fleet's current route assignments
// @route   GET /api/fleet/route-assignments
// @access  Private (Fleet Manager)
const getRouteAssignments = async (req, res) => {
    var _a;
    try {
        // Find fleet by user email
        const fleet = await Fleet_1.default.findOne({
            email: (_a = req.user) === null || _a === void 0 ? void 0 : _a.email,
            isActive: true
        });
        if (!fleet) {
            res.status(400).json({ message: 'Fleet not found for this user' });
            return;
        }
        const fleetId = fleet._id;
        const { status = 'active', routeId = '', vehicleId = '' } = req.query;
        // Build query
        let query = {
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
        const assignments = await RouteAssignment_1.default.find(query)
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
    }
    catch (error) {
        console.error('Get route assignments error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getRouteAssignments = getRouteAssignments;
// @desc    Assign vehicles to a route
// @route   POST /api/fleet/route-assignments
// @access  Private (Fleet Manager)
const assignVehiclesToRoute = async (req, res) => {
    var _a, _b;
    try {
        const { routeId, vehicleIds } = req.body;
        // Find fleet by user email
        const fleet = await Fleet_1.default.findOne({
            email: (_a = req.user) === null || _a === void 0 ? void 0 : _a.email,
            isActive: true
        });
        if (!fleet) {
            res.status(400).json({ message: 'Fleet not found for this user' });
            return;
        }
        const fleetId = fleet._id;
        const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b._id;
        if (!fleetId || !userId) {
            res.status(400).json({ message: 'Fleet or User information not found in request' });
            return;
        }
        // Validate input
        if (!routeId || !vehicleIds || !Array.isArray(vehicleIds) || vehicleIds.length === 0) {
            res.status(400).json({ message: 'Route ID and vehicle IDs array are required' });
            return;
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(routeId)) {
            res.status(400).json({ message: 'Invalid route ID' });
            return;
        }
        // Validate all vehicle IDs
        for (const vehicleId of vehicleIds) {
            if (!mongoose_1.default.Types.ObjectId.isValid(vehicleId)) {
                res.status(400).json({ message: `Invalid vehicle ID: ${vehicleId}` });
                return;
            }
        }
        // Check if route exists and is available
        const route = await Route_1.default.findOne({
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
        const vehicles = await Device_1.default.find({
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
        const existingAssignments = await RouteAssignment_1.default.find({
            routeId: routeId,
            vehicleId: { $in: vehicleIds },
            status: 'active',
            isActive: true
        });
        if (existingAssignments.length > 0) {
            const alreadyAssigned = existingAssignments.map(a => { var _a; return (_a = vehicles.find(v => v._id.equals(a.vehicleId))) === null || _a === void 0 ? void 0 : _a.vehicleNumber; });
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
                status: 'pending', // New assignments start as pending and need route admin approval
                isActive: true
            };
            return new RouteAssignment_1.default(assignmentData).save();
        });
        const assignments = await Promise.all(assignmentPromises);
        // Populate the created assignments
        const populatedAssignments = await RouteAssignment_1.default.find({
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
    }
    catch (error) {
        console.error('Assign vehicles to route error:', error);
        if (error instanceof Error && error.message.includes('duplicate key')) {
            res.status(400).json({
                message: 'One or more vehicles are already assigned to this route'
            });
        }
        else {
            res.status(500).json({
                message: 'Server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
};
exports.assignVehiclesToRoute = assignVehiclesToRoute;
// @desc    Unassign vehicle from route
// @route   DELETE /api/fleet/route-assignments/:routeId/:vehicleId
// @access  Private (Fleet Manager)
const unassignVehicleFromRoute = async (req, res) => {
    var _a, _b;
    try {
        const { routeId, vehicleId } = req.params;
        const { reason } = req.body;
        // Find fleet by user email
        const fleet = await Fleet_1.default.findOne({
            email: (_a = req.user) === null || _a === void 0 ? void 0 : _a.email,
            isActive: true
        });
        if (!fleet) {
            res.status(400).json({ message: 'Fleet not found for this user' });
            return;
        }
        const fleetId = fleet._id;
        const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b._id;
        if (!fleetId || !userId) {
            res.status(400).json({ message: 'Fleet or User information not found in request' });
            return;
        }
        // Validate IDs
        if (!mongoose_1.default.Types.ObjectId.isValid(routeId) || !mongoose_1.default.Types.ObjectId.isValid(vehicleId)) {
            res.status(400).json({ message: 'Invalid route ID or vehicle ID' });
            return;
        }
        // Find the assignment
        const assignment = await RouteAssignment_1.default.findOne({
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
    }
    catch (error) {
        console.error('Unassign vehicle from route error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.unassignVehicleFromRoute = unassignVehicleFromRoute;
// @desc    Update route assignment status (for approval workflow)
// @route   PUT /api/fleet/route-assignments/:assignmentId/status
// @access  Private (Fleet Manager - only for own assignments)
const updateAssignmentStatus = async (req, res) => {
    var _a;
    try {
        const { assignmentId } = req.params;
        const { status } = req.body;
        // Find fleet by user email
        const fleet = await Fleet_1.default.findOne({
            email: (_a = req.user) === null || _a === void 0 ? void 0 : _a.email,
            isActive: true
        });
        if (!fleet) {
            res.status(400).json({ message: 'Fleet not found for this user' });
            return;
        }
        const fleetId = fleet._id;
        // Validate assignment ID
        if (!mongoose_1.default.Types.ObjectId.isValid(assignmentId)) {
            res.status(400).json({ message: 'Invalid assignment ID' });
            return;
        }
        // Validate status
        if (!status || !['active', 'inactive'].includes(status)) {
            res.status(400).json({ message: 'Valid status is required (active or inactive)' });
            return;
        }
        // Find the assignment
        const assignment = await RouteAssignment_1.default.findOne({
            _id: assignmentId,
            fleetId,
            isActive: true
        });
        if (!assignment) {
            res.status(404).json({ message: 'Assignment not found or not accessible' });
            return;
        }
        // Update status
        assignment.status = status;
        assignment.updatedAt = new Date();
        await assignment.save();
        // Populate and return updated assignment
        const updatedAssignment = await RouteAssignment_1.default.findById(assignment._id)
            .populate('vehicleId', 'vehicleNumber vehicleType')
            .populate('routeId', 'name routeId');
        res.json({
            message: 'Assignment status updated successfully',
            assignment: updatedAssignment
        });
    }
    catch (error) {
        console.error('Update assignment status error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.updateAssignmentStatus = updateAssignmentStatus;
// @desc    Get assignment performance statistics
// @route   GET /api/fleet/route-assignments/:assignmentId/performance
// @access  Private (Fleet Manager)
const getAssignmentPerformance = async (req, res) => {
    var _a;
    try {
        const { assignmentId } = req.params;
        // Find fleet by user email
        const fleet = await Fleet_1.default.findOne({
            email: (_a = req.user) === null || _a === void 0 ? void 0 : _a.email,
            isActive: true
        });
        if (!fleet) {
            res.status(400).json({ message: 'Fleet not found for this user' });
            return;
        }
        const fleetId = fleet._id;
        if (!mongoose_1.default.Types.ObjectId.isValid(assignmentId)) {
            res.status(400).json({ message: 'Invalid assignment ID' });
            return;
        }
        const assignment = await RouteAssignment_1.default.findOne({
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
    }
    catch (error) {
        console.error('Get assignment performance error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getAssignmentPerformance = getAssignmentPerformance;
// @desc    Get fleet route assignment dashboard stats
// @route   GET /api/fleet/route-assignments/stats
// @access  Private (Fleet Manager)
const getFleetRouteStats = async (req, res) => {
    var _a;
    try {
        // Find fleet by user email
        const fleet = await Fleet_1.default.findOne({
            email: (_a = req.user) === null || _a === void 0 ? void 0 : _a.email,
            isActive: true
        });
        if (!fleet) {
            res.status(400).json({ message: 'Fleet not found for this user' });
            return;
        }
        const fleetId = fleet._id;
        // Get assignment counts by status
        const assignmentStats = await RouteAssignment_1.default.aggregate([
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
        const vehicleStats = await Device_1.default.aggregate([
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
        const recentAssignments = await RouteAssignment_1.default.find({
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
            }, {}),
            vehicles: vehicleStats[0] || { totalVehicles: 0, assignedVehicles: 0 },
            recentAssignments,
            utilization: vehicleStats[0]
                ? Math.round((vehicleStats[0].assignedVehicles / vehicleStats[0].totalVehicles) * 100)
                : 0
        };
        res.json(stats);
    }
    catch (error) {
        console.error('Get fleet route stats error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getFleetRouteStats = getFleetRouteStats;
