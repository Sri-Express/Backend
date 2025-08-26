"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRoutesByFleet = exports.getPendingRoutes = exports.getRouteStats = exports.deleteRoute = exports.updateRoute = exports.rejectRoute = exports.approveRoute = exports.getRouteById = exports.getAllRoutes = void 0;
const Route_1 = __importDefault(require("../models/Route"));
const Fleet_1 = __importDefault(require("../models/Fleet"));
const mongoose_1 = __importDefault(require("mongoose"));
// @desc    Get all route applications with filtering and pagination
// @route   GET /api/admin/routes
// @access  Private (System Admin)
const getAllRoutes = async (req, res) => {
    var _a, _b, _c;
    try {
        const { page = 1, limit = 10, search = '', approvalStatus = 'all', operationalStatus = 'all', fleetId = '', sortBy = 'submittedAt', sortOrder = 'desc' } = req.query;
        // Build query
        let query = { isActive: true };
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
        const pageNumber = parseInt(page);
        const pageSize = parseInt(limit);
        const skip = (pageNumber - 1) * pageSize;
        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
        // Get routes with pagination
        const routes = await Route_1.default.find(query)
            .populate('operatorInfo.fleetId', 'companyName email phone status')
            .populate('reviewedBy', 'name email')
            .sort(sort)
            .skip(skip)
            .limit(pageSize);
        // Get total count for pagination
        const totalRoutes = await Route_1.default.countDocuments(query);
        // Get route statistics
        const stats = await Route_1.default.aggregate([
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
            pendingRoutes: ((_a = stats.find(s => s._id === 'pending')) === null || _a === void 0 ? void 0 : _a.count) || 0,
            approvedRoutes: ((_b = stats.find(s => s._id === 'approved')) === null || _b === void 0 ? void 0 : _b.count) || 0,
            rejectedRoutes: ((_c = stats.find(s => s._id === 'rejected')) === null || _c === void 0 ? void 0 : _c.count) || 0
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
    }
    catch (error) {
        console.error('Get all routes error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getAllRoutes = getAllRoutes;
// @desc    Get route by ID for admin review
// @route   GET /api/admin/routes/:id
// @access  Private (System Admin)
const getRouteById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: 'Invalid route ID' });
            return;
        }
        const route = await Route_1.default.findById(id)
            .populate('operatorInfo.fleetId', 'companyName email phone status documents complianceScore')
            .populate('reviewedBy', 'name email role');
        if (!route) {
            res.status(404).json({ message: 'Route not found' });
            return;
        }
        res.json(route);
    }
    catch (error) {
        console.error('Get route by ID error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getRouteById = getRouteById;
// @desc    Approve route application
// @route   PUT /api/admin/routes/:id/approve
// @access  Private (System Admin)
const approveRoute = async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        const { notes } = req.body;
        const adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: 'Invalid route ID' });
            return;
        }
        if (!adminId) {
            res.status(401).json({ message: 'Admin ID not found in request' });
            return;
        }
        // Find route
        const route = await Route_1.default.findById(id);
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
        const fleet = await Fleet_1.default.findById(route.operatorInfo.fleetId);
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
    }
    catch (error) {
        console.error('Approve route error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.approveRoute = approveRoute;
// @desc    Reject route application
// @route   PUT /api/admin/routes/:id/reject
// @access  Private (System Admin)
const rejectRoute = async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
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
        const route = await Route_1.default.findById(id);
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
    }
    catch (error) {
        console.error('Reject route error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.rejectRoute = rejectRoute;
// @desc    Update route details (Admin only)
// @route   PUT /api/admin/routes/:id
// @access  Private (System Admin)
const updateRoute = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: 'Invalid route ID' });
            return;
        }
        // Find route
        const route = await Route_1.default.findById(id);
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
        const updatedRoute = await Route_1.default.findByIdAndUpdate(id, { ...updateData, updatedAt: new Date() }, { new: true, runValidators: true })
            .populate('operatorInfo.fleetId', 'companyName')
            .populate('reviewedBy', 'name email');
        res.json({
            message: 'Route updated successfully',
            route: updatedRoute
        });
    }
    catch (error) {
        console.error('Update route error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.updateRoute = updateRoute;
// @desc    Delete route (soft delete)
// @route   DELETE /api/admin/routes/:id
// @access  Private (System Admin)
const deleteRoute = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: 'Invalid route ID' });
            return;
        }
        // Find route
        const route = await Route_1.default.findById(id);
        if (!route) {
            res.status(404).json({ message: 'Route not found' });
            return;
        }
        // Soft delete
        route.isActive = false;
        route.status = 'inactive';
        await route.save();
        res.json({ message: 'Route deleted successfully' });
    }
    catch (error) {
        console.error('Delete route error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.deleteRoute = deleteRoute;
// @desc    Get route statistics and dashboard data
// @route   GET /api/admin/routes/stats
// @access  Private (System Admin)
const getRouteStats = async (req, res) => {
    try {
        // Basic counts
        const totalApplications = await Route_1.default.countDocuments({ isActive: true });
        const pendingRoutes = await Route_1.default.countDocuments({ approvalStatus: 'pending', isActive: true });
        const approvedRoutes = await Route_1.default.countDocuments({ approvalStatus: 'approved', isActive: true });
        const rejectedRoutes = await Route_1.default.countDocuments({ approvalStatus: 'rejected', isActive: true });
        // Active operational routes
        const activeRoutes = await Route_1.default.countDocuments({
            approvalStatus: 'approved',
            status: 'active',
            isActive: true
        });
        // Routes by vehicle type
        const routesByType = await Route_1.default.aggregate([
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
        const topOperators = await Route_1.default.aggregate([
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
        const recentApplications = await Route_1.default.countDocuments({
            submittedAt: { $gte: thirtyDaysAgo },
            isActive: true
        });
        // Average approval time
        const approvedWithTimes = await Route_1.default.find({
            approvalStatus: 'approved',
            reviewedAt: { $exists: true },
            submittedAt: { $exists: true },
            isActive: true
        }).select('submittedAt reviewedAt');
        const avgApprovalTime = approvedWithTimes.length > 0
            ? approvedWithTimes.reduce((sum, route) => {
                return sum + (route.reviewedAt.getTime() - route.submittedAt.getTime());
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
    }
    catch (error) {
        console.error('Get route stats error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getRouteStats = getRouteStats;
// @desc    Get pending routes requiring review
// @route   GET /api/admin/routes/pending
// @access  Private (System Admin)
const getPendingRoutes = async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const pendingRoutes = await Route_1.default.find({
            approvalStatus: 'pending',
            isActive: true
        })
            .populate('operatorInfo.fleetId', 'companyName status complianceScore')
            .sort({ submittedAt: 1 }) // Oldest first
            .limit(parseInt(limit));
        res.json({
            routes: pendingRoutes,
            count: pendingRoutes.length
        });
    }
    catch (error) {
        console.error('Get pending routes error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getPendingRoutes = getPendingRoutes;
// @desc    Get routes by fleet ID
// @route   GET /api/admin/routes/fleet/:fleetId
// @access  Private (System Admin)
const getRoutesByFleet = async (req, res) => {
    try {
        const { fleetId } = req.params;
        const { includeAll = false } = req.query;
        if (!mongoose_1.default.Types.ObjectId.isValid(fleetId)) {
            res.status(400).json({ message: 'Invalid fleet ID' });
            return;
        }
        let query = {
            'operatorInfo.fleetId': fleetId,
            isActive: true
        };
        // By default, only show approved routes, unless includeAll is true
        if (!includeAll) {
            query.approvalStatus = 'approved';
        }
        const routes = await Route_1.default.find(query)
            .populate('reviewedBy', 'name email')
            .sort({ submittedAt: -1 });
        const fleet = await Fleet_1.default.findById(fleetId).select('companyName status');
        res.json({
            routes,
            fleet,
            count: routes.length
        });
    }
    catch (error) {
        console.error('Get routes by fleet error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getRoutesByFleet = getRoutesByFleet;
