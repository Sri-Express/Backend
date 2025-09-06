"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRouteAnalytics = exports.updateAssignmentSchedules = exports.removeVehicleAssignment = exports.getRouteAssignments = exports.assignVehiclesToRoute = exports.getAvailableVehicles = exports.getAssignedRoute = exports.getRouteAdminDashboard = void 0;
const Route_1 = __importDefault(require("../models/Route"));
const Device_1 = __importDefault(require("../models/Device"));
const RouteAssignment_1 = __importDefault(require("../models/RouteAssignment"));
const Fleet_1 = __importDefault(require("../models/Fleet"));
// @desc    Get route admin dashboard - FIXED VERSION
// @route   GET /api/route-admin/dashboard
// @access  Private (Route Admin)
const getRouteAdminDashboard = async (req, res) => {
    var _a, _b;
    try {
        const routeAdminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        // FIX 1: Add a check to ensure routeAdminId is not undefined.
        // This solves all the "is possibly 'undefined'" errors.
        if (!routeAdminId) {
            res.status(401).json({ message: 'Unauthorized: User ID not found.' });
            return;
        }
        console.log(`[Dashboard] Route admin ID: ${routeAdminId}`);
        // FIXED: Try multiple ways to find the assigned route
        let assignedRoute = null;
        // Method 1: Direct routeAdminId field (current way)
        assignedRoute = await Route_1.default.findOne({
            routeAdminId: routeAdminId,
            approvalStatus: 'approved'
        });
        console.log(`[Dashboard] Method 1 - Direct routeAdminId: ${assignedRoute ? 'Found' : 'Not found'}`);
        // Method 2: Check if routeAdminId is nested in routeAdminAssignment
        if (!assignedRoute) {
            assignedRoute = await Route_1.default.findOne({
                'routeAdminAssignment.status': 'assigned',
                'routeAdminId._id': routeAdminId,
                approvalStatus: 'approved'
            });
            console.log(`[Dashboard] Method 2 - Nested routeAdminId: ${assignedRoute ? 'Found' : 'Not found'}`);
        }
        // Method 3: Try with string comparison (in case of ObjectId vs string mismatch)
        if (!assignedRoute) {
            assignedRoute = await Route_1.default.findOne({
                routeAdminId: routeAdminId.toString(),
                approvalStatus: 'approved'
            });
            console.log(`[Dashboard] Method 3 - String ID: ${assignedRoute ? 'Found' : 'Not found'}`);
        }
        // Method 4: Find any approved route and check manually
        if (!assignedRoute) {
            const allApprovedRoutes = await Route_1.default.find({
                approvalStatus: 'approved'
            }).populate('routeAdminId');
            console.log(`[Dashboard] Found ${allApprovedRoutes.length} approved routes`);
            assignedRoute = allApprovedRoutes.find(route => {
                if (route.routeAdminId) {
                    if (typeof route.routeAdminId === 'object' && route.routeAdminId._id) {
                        return route.routeAdminId._id.toString() === routeAdminId.toString();
                    }
                    return route.routeAdminId.toString() === routeAdminId.toString();
                }
                return false;
            });
            console.log(`[Dashboard] Method 4 - Manual search: ${assignedRoute ? 'Found' : 'Not found'}`);
        }
        if (!assignedRoute) {
            console.log(`[Dashboard] No route found for user ${routeAdminId}`);
            // DEBUG: Let's see what routes exist and their routeAdminId values
            const debugRoutes = await Route_1.default.find({ approvalStatus: 'approved' })
                .select('name routeId routeAdminId routeAdminAssignment')
                .populate('routeAdminId', 'name email');
            console.log('[Dashboard] DEBUG - All approved routes:', JSON.stringify(debugRoutes, null, 2));
            res.json({
                hasAssignedRoute: false,
                message: 'No route has been assigned to you yet. Please contact system administrator.',
                assignedRoute: null,
                stats: null,
                debugInfo: {
                    userId: routeAdminId,
                    userRole: (_b = req.user) === null || _b === void 0 ? void 0 : _b.role,
                    totalApprovedRoutes: debugRoutes.length,
                    routes: debugRoutes.map(r => ({
                        name: r.name,
                        routeId: r.routeId,
                        hasRouteAdmin: !!r.routeAdminId,
                        routeAdminInfo: r.routeAdminId
                        // FIX 2: Removed the stray underscore character that was causing a syntax error.
                    }))
                }
            });
            return;
        }
        console.log(`[Dashboard] Found assigned route: ${assignedRoute.name}`);
        // Get route assignments for this route
        const assignments = await RouteAssignment_1.default.find({
            routeId: assignedRoute._id,
            isActive: true
        })
            .populate('vehicleId', 'vehicleNumber vehicleType status fleetId')
            .populate('fleetId', 'companyName phone');
        console.log(`[Dashboard] Found ${assignments.length} assignments`);
        // Get fleet statistics
        const fleetStats = await RouteAssignment_1.default.aggregate([
            { $match: { routeId: assignedRoute._id, isActive: true } },
            {
                $lookup: {
                    from: 'fleets',
                    localField: 'fleetId',
                    foreignField: '_id',
                    as: 'fleet'
                }
            },
            { $unwind: { path: '$fleet', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: '$fleetId',
                    companyName: { $first: '$fleet.companyName' },
                    vehicleCount: { $sum: 1 },
                    activeVehicles: {
                        $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                    },
                    totalRevenue: { $sum: { $ifNull: ['$performance.totalRevenue', 0] } },
                    totalTrips: { $sum: { $ifNull: ['$performance.totalTrips', 0] } }
                }
            }
        ]);
        // Calculate dashboard statistics
        const stats = {
            assignedRoute: {
                name: assignedRoute.name,
                routeId: assignedRoute.routeId,
                distance: assignedRoute.distance,
                estimatedDuration: assignedRoute.estimatedDuration
            },
            vehicles: {
                total: assignments.length,
                active: assignments.filter(a => a.status === 'active').length,
                inactive: assignments.filter(a => a.status === 'inactive').length,
                suspended: assignments.filter(a => a.status === 'suspended').length
            },
            fleets: {
                total: fleetStats.length,
                details: fleetStats
            },
            performance: {
                totalTrips: assignments.reduce((sum, a) => { var _a; return sum + (((_a = a.performance) === null || _a === void 0 ? void 0 : _a.totalTrips) || 0); }, 0),
                totalRevenue: assignments.reduce((sum, a) => { var _a; return sum + (((_a = a.performance) === null || _a === void 0 ? void 0 : _a.totalRevenue) || 0); }, 0),
                avgRating: assignments.length > 0
                    ? assignments.reduce((sum, a) => { var _a; return sum + (((_a = a.performance) === null || _a === void 0 ? void 0 : _a.avgRating) || 0); }, 0) / assignments.length
                    : 0
            }
        };
        res.json({
            hasAssignedRoute: true,
            assignedRoute,
            assignments,
            stats
        });
    }
    catch (error) {
        console.error('Get route admin dashboard error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getRouteAdminDashboard = getRouteAdminDashboard;
// @desc    Get assigned route details
// @route   GET /api/route-admin/route
// @access  Private (Route Admin)
const getAssignedRoute = async (req, res) => {
    var _a;
    try {
        const routeAdminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const route = await Route_1.default.findOne({
            routeAdminId: routeAdminId,
            approvalStatus: 'approved',
            isActive: true
        });
        if (!route) {
            res.status(404).json({ message: 'No route assigned to you' });
            return;
        }
        res.json({ route });
    }
    catch (error) {
        console.error('Get assigned route error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getAssignedRoute = getAssignedRoute;
// @desc    Get available fleets and their vehicles for route assignment
// @route   GET /api/route-admin/available-vehicles
// @access  Private (Route Admin)
const getAvailableVehicles = async (req, res) => {
    var _a;
    try {
        const routeAdminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const { vehicleType = 'bus' } = req.query;
        // Find assigned route
        const route = await Route_1.default.findOne({
            routeAdminId: routeAdminId,
            approvalStatus: 'approved',
            isActive: true
        });
        if (!route) {
            res.status(404).json({ message: 'No route assigned to you' });
            return;
        }
        // Get approved fleets with vehicles matching route requirements
        const fleets = await Fleet_1.default.find({
            status: 'approved',
            isActive: true
        }).select('_id companyName email phone');
        // Get approved vehicles from these fleets that match route vehicle type
        const availableVehicles = await Device_1.default.find({
            fleetId: { $in: fleets.map(f => f._id) },
            vehicleType: route.vehicleInfo.type,
            approvalStatus: 'approved',
            status: { $in: ['online', 'offline'] }, // Exclude maintenance
            isActive: true
        })
            .populate('fleetId', 'companyName phone') // Changed from contactNumber to phone
            .select('vehicleNumber vehicleType status fleetId location batteryLevel signalStrength');
        // Check which vehicles are already assigned to this route
        const existingAssignments = await RouteAssignment_1.default.find({
            routeId: route._id,
            status: 'active',
            isActive: true
        }).select('vehicleId');
        const assignedVehicleIds = existingAssignments.map(a => a.vehicleId.toString());
        // Filter out already assigned vehicles - Fixed type assertion
        const unassignedVehicles = availableVehicles.filter(vehicle => !assignedVehicleIds.includes(vehicle._id.toString()));
        // Group vehicles by fleet - Fixed type assertion
        const vehiclesByFleet = fleets.map(fleet => {
            const fleetVehicles = unassignedVehicles.filter(vehicle => vehicle.fleetId._id.toString() === fleet._id.toString());
            return {
                fleet: {
                    _id: fleet._id,
                    companyName: fleet.companyName,
                    contactNumber: fleet.phone // Use phone instead of contactNumber
                },
                vehicles: fleetVehicles,
                vehicleCount: fleetVehicles.length
            };
        }).filter(fleetData => fleetData.vehicleCount > 0);
        res.json({
            route: {
                _id: route._id,
                name: route.name,
                requiredVehicleType: route.vehicleInfo.type,
                capacity: route.vehicleInfo.capacity
            },
            availableFleets: vehiclesByFleet,
            totalAvailableVehicles: unassignedVehicles.length
        });
    }
    catch (error) {
        console.error('Get available vehicles error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getAvailableVehicles = getAvailableVehicles;
// @desc    Assign vehicles to route (Route Admin can assign from any approved fleet)
// @route   POST /api/route-admin/assign-vehicles
// @access  Private (Route Admin)
const assignVehiclesToRoute = async (req, res) => {
    var _a;
    try {
        const routeAdminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const { vehicleIds, schedules } = req.body;
        if (!vehicleIds || !Array.isArray(vehicleIds) || vehicleIds.length === 0) {
            res.status(400).json({ message: 'Vehicle IDs array is required' });
            return;
        }
        // Find assigned route
        const route = await Route_1.default.findOne({
            routeAdminId: routeAdminId,
            approvalStatus: 'approved',
            isActive: true
        });
        if (!route) {
            res.status(404).json({ message: 'No route assigned to you' });
            return;
        }
        // Validate vehicles
        const vehicles = await Device_1.default.find({
            _id: { $in: vehicleIds },
            vehicleType: route.vehicleInfo.type,
            approvalStatus: 'approved',
            status: { $in: ['online', 'offline'] },
            isActive: true
        }).populate('fleetId', 'companyName status');
        if (vehicles.length !== vehicleIds.length) {
            res.status(400).json({
                message: 'Some vehicles are not available or do not match route requirements'
            });
            return;
        }
        // Check for existing assignments
        const existingAssignments = await RouteAssignment_1.default.find({
            routeId: route._id,
            vehicleId: { $in: vehicleIds },
            status: 'active',
            isActive: true
        });
        if (existingAssignments.length > 0) {
            res.status(400).json({
                message: 'Some vehicles are already assigned to this route'
            });
            return;
        }
        // Create assignments
        const assignmentPromises = vehicles.map(vehicle => {
            const assignmentData = {
                fleetId: vehicle.fleetId,
                vehicleId: vehicle._id,
                routeId: route._id,
                assignedBy: routeAdminId,
                schedules: schedules || [{
                        startTime: "06:00",
                        endTime: "22:00",
                        daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
                        isActive: true
                    }],
                status: 'active',
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
            .populate('fleetId', 'companyName phone') // Changed from contactNumber to phone
            .populate('assignedBy', 'name email');
        res.status(201).json({
            message: `Successfully assigned ${vehicleIds.length} vehicle(s) to route`,
            assignments: populatedAssignments,
            route: {
                _id: route._id,
                name: route.name,
                routeId: route.routeId
            }
        });
    }
    catch (error) {
        console.error('Assign vehicles to route error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.assignVehiclesToRoute = assignVehiclesToRoute;
// @desc    Get current route assignments
// @route   GET /api/route-admin/assignments
// @access  Private (Route Admin)
const getRouteAssignments = async (req, res) => {
    var _a;
    try {
        const routeAdminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const { status = 'all' } = req.query;
        // Find assigned route
        const route = await Route_1.default.findOne({
            routeAdminId: routeAdminId,
            approvalStatus: 'approved',
            isActive: true
        });
        if (!route) {
            res.status(404).json({ message: 'No route assigned to you' });
            return;
        }
        // Build query
        let query = {
            routeId: route._id,
            isActive: true
        };
        if (status !== 'all') {
            query.status = status;
        }
        // Get assignments
        const assignments = await RouteAssignment_1.default.find(query)
            .populate('vehicleId', 'vehicleNumber vehicleType status location batteryLevel signalStrength')
            .populate('fleetId', 'companyName phone email') // Changed from contactNumber to phone
            .populate('assignedBy', 'name email')
            .sort({ assignedAt: -1 });
        // Group assignments by fleet
        const assignmentsByFleet = assignments.reduce((acc, assignment) => {
            const fleetId = assignment.fleetId._id.toString();
            if (!acc[fleetId]) {
                acc[fleetId] = {
                    fleet: assignment.fleetId,
                    assignments: []
                };
            }
            acc[fleetId].assignments.push(assignment);
            return acc;
        }, {});
        const stats = {
            total: assignments.length,
            active: assignments.filter(a => a.status === 'active').length,
            inactive: assignments.filter(a => a.status === 'inactive').length,
            suspended: assignments.filter(a => a.status === 'suspended').length,
            fleetCount: Object.keys(assignmentsByFleet).length
        };
        res.json({
            route: {
                _id: route._id,
                name: route.name,
                routeId: route.routeId
            },
            assignments,
            assignmentsByFleet: Object.values(assignmentsByFleet),
            stats
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
// @desc    Remove vehicle assignment from route
// @route   DELETE /api/route-admin/assignments/:assignmentId
// @access  Private (Route Admin)
const removeVehicleAssignment = async (req, res) => {
    var _a;
    try {
        const routeAdminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const { assignmentId } = req.params;
        const { reason } = req.body;
        // Add null check for routeAdminId
        if (!routeAdminId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        // Find assigned route
        const route = await Route_1.default.findOne({
            routeAdminId: routeAdminId,
            approvalStatus: 'approved',
            isActive: true
        });
        if (!route) {
            res.status(404).json({ message: 'No route assigned to you' });
            return;
        }
        // Find assignment
        const assignment = await RouteAssignment_1.default.findOne({
            _id: assignmentId,
            routeId: route._id,
            isActive: true
        });
        if (!assignment) {
            res.status(404).json({ message: 'Assignment not found' });
            return;
        }
        // Remove assignment - Fixed type issue
        await assignment.unassign(routeAdminId, reason);
        res.json({
            message: 'Vehicle assignment removed successfully',
            assignment: assignment
        });
    }
    catch (error) {
        console.error('Remove vehicle assignment error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.removeVehicleAssignment = removeVehicleAssignment;
// @desc    Update assignment schedules
// @route   PUT /api/route-admin/assignments/:assignmentId/schedules
// @access  Private (Route Admin)
const updateAssignmentSchedules = async (req, res) => {
    var _a;
    try {
        const routeAdminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const { assignmentId } = req.params;
        const { schedules } = req.body;
        if (!schedules || !Array.isArray(schedules)) {
            res.status(400).json({ message: 'Valid schedules array is required' });
            return;
        }
        // Find assigned route
        const route = await Route_1.default.findOne({
            routeAdminId: routeAdminId,
            approvalStatus: 'approved',
            isActive: true
        });
        if (!route) {
            res.status(404).json({ message: 'No route assigned to you' });
            return;
        }
        // Find and update assignment
        const assignment = await RouteAssignment_1.default.findOne({
            _id: assignmentId,
            routeId: route._id,
            status: 'active',
            isActive: true
        });
        if (!assignment) {
            res.status(404).json({ message: 'Active assignment not found' });
            return;
        }
        // Fixed type issue - cast to any to avoid type mismatch
        assignment.schedules = schedules;
        assignment.updatedAt = new Date();
        await assignment.save();
        const updatedAssignment = await RouteAssignment_1.default.findById(assignment._id)
            .populate('vehicleId', 'vehicleNumber vehicleType')
            .populate('fleetId', 'companyName');
        res.json({
            message: 'Assignment schedules updated successfully',
            assignment: updatedAssignment
        });
    }
    catch (error) {
        console.error('Update assignment schedules error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.updateAssignmentSchedules = updateAssignmentSchedules;
// @desc    Get route performance analytics
// @route   GET /api/route-admin/analytics
// @access  Private (Route Admin)
const getRouteAnalytics = async (req, res) => {
    var _a;
    try {
        const routeAdminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const { period = '30d' } = req.query;
        // Find assigned route
        const route = await Route_1.default.findOne({
            routeAdminId: routeAdminId,
            approvalStatus: 'approved',
            isActive: true
        });
        if (!route) {
            res.status(404).json({ message: 'No route assigned to you' });
            return;
        }
        // Get route assignments performance data
        const assignments = await RouteAssignment_1.default.find({
            routeId: route._id,
            isActive: true
        }).populate('vehicleId fleetId');
        // Calculate analytics
        const analytics = {
            routeInfo: {
                name: route.name,
                routeId: route.routeId,
                distance: route.distance,
                estimatedDuration: route.estimatedDuration
            },
            performance: {
                totalTrips: assignments.reduce((sum, a) => sum + a.performance.totalTrips, 0),
                completedTrips: assignments.reduce((sum, a) => sum + a.performance.completedTrips, 0),
                totalRevenue: assignments.reduce((sum, a) => sum + a.performance.totalRevenue, 0),
                avgRating: assignments.length > 0
                    ? assignments.reduce((sum, a) => sum + a.performance.avgRating, 0) / assignments.length
                    : 0
            },
            vehicles: {
                total: assignments.length,
                active: assignments.filter(a => a.status === 'active').length,
                byFleet: assignments.reduce((acc, a) => {
                    var _a;
                    // Fixed type issue - ensure fleetId is populated
                    const fleetName = ((_a = a.fleetId) === null || _a === void 0 ? void 0 : _a.companyName) || 'Unknown Fleet';
                    acc[fleetName] = (acc[fleetName] || 0) + 1;
                    return acc;
                }, {})
            },
            period: period
        };
        res.json({ analytics });
    }
    catch (error) {
        console.error('Get route analytics error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getRouteAnalytics = getRouteAnalytics;
