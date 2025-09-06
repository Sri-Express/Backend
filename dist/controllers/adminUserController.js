"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserTimeline = exports.getUserActivity = exports.getUserStatistics = exports.createRouteAdminWithAssignment = exports.getRouteAdmins = exports.removeRouteAdminAssignment = exports.assignRouteToAdmin = exports.createRouteAdmin = exports.getUserStats = exports.toggleUserStatus = exports.deleteUser = exports.updateUser = exports.createUser = exports.getUserById = exports.getAllUsers = void 0;
const User_1 = __importDefault(require("../models/User"));
const Route_1 = __importDefault(require("../models/Route"));
const UserActivity_1 = __importDefault(require("../models/UserActivity"));
const mongoose_1 = __importDefault(require("mongoose"));
// @desc    Get all users with pagination and filtering
// @route   GET /api/admin/users
// @access  Private (System Admin)
const getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', role = 'all', status = 'all', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        // Build query
        let query = {};
        // Search functionality
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        // Role filter
        if (role !== 'all') {
            query.role = role;
        }
        // Status filter
        if (status === 'active') {
            query.isActive = true;
        }
        else if (status === 'inactive') {
            query.isActive = false;
        }
        // Calculate pagination
        const pageNumber = parseInt(page);
        const pageSize = parseInt(limit);
        const skip = (pageNumber - 1) * pageSize;
        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
        // Get users with pagination
        const users = await User_1.default.find(query)
            .select('-password')
            .sort(sort)
            .skip(skip)
            .limit(pageSize);
        // Get total count for pagination
        const totalUsers = await User_1.default.countDocuments(query);
        // Get user statistics
        const stats = await User_1.default.aggregate([
            {
                $group: {
                    _id: '$role',
                    count: { $sum: 1 }
                }
            }
        ]);
        const userStats = {
            totalUsers,
            activeUsers: await User_1.default.countDocuments({ ...query, isActive: true }),
            byRole: stats.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {})
        };
        res.json({
            users,
            pagination: {
                currentPage: pageNumber,
                totalPages: Math.ceil(totalUsers / pageSize),
                totalUsers,
                hasNext: pageNumber < Math.ceil(totalUsers / pageSize),
                hasPrev: pageNumber > 1
            },
            stats: userStats
        });
    }
    catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getAllUsers = getAllUsers;
// @desc    Get user by ID
// @route   GET /api/admin/users/:id
// @access  Private (System Admin)
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User_1.default.findById(id).select('-password');
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        // If user is route admin, get assigned route info
        let assignedRoute = null;
        if (user.role === 'route_admin') {
            assignedRoute = await Route_1.default.findOne({
                routeAdminId: user._id,
                'routeAdminAssignment.status': 'assigned',
                approvalStatus: 'approved',
                isActive: true
            }).select('_id name routeId startLocation endLocation routeAdminAssignment');
        }
        res.json({
            ...user.toObject(),
            assignedRoute
        });
    }
    catch (error) {
        console.error('Get user by ID error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getUserById = getUserById;
// @desc    Create new user
// @route   POST /api/admin/users
// @access  Private (System Admin)
const createUser = async (req, res) => {
    try {
        const { name, email, password, role, phone, department, company, permissions = [], isActive = true } = req.body;
        // Validate required fields
        if (!name || !email || !password || !role) {
            res.status(400).json({ message: 'Name, email, password, and role are required' });
            return;
        }
        // Check if user already exists
        const existingUser = await User_1.default.findOne({ email });
        if (existingUser) {
            res.status(400).json({ message: 'User with this email already exists' });
            return;
        }
        // Validate role
        const validRoles = ['client', 'customer_service', 'route_admin', 'company_admin', 'system_admin'];
        if (!validRoles.includes(role)) {
            res.status(400).json({ message: 'Invalid role specified' });
            return;
        }
        // Create user object
        const userData = {
            name,
            email,
            password,
            role,
            isActive
        };
        // Add optional fields
        if (phone)
            userData.phone = phone;
        if (department)
            userData.department = department;
        if (company)
            userData.company = company;
        if (permissions.length > 0)
            userData.permissions = permissions;
        // Create user
        const user = await User_1.default.create(userData);
        // Return user without password
        const userResponse = await User_1.default.findById(user._id).select('-password');
        res.status(201).json({
            message: 'User created successfully',
            user: userResponse
        });
    }
    catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.createUser = createUser;
// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Private (System Admin)
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, role, phone, department, company, permissions, isActive } = req.body;
        // Find user
        const user = await User_1.default.findById(id);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        // Check if email is already taken by another user
        if (email && email !== user.email) {
            const existingUser = await User_1.default.findOne({ email });
            if (existingUser) {
                res.status(400).json({ message: 'Email already in use by another user' });
                return;
            }
        }
        // Update fields
        if (name)
            user.name = name;
        if (email)
            user.email = email;
        if (role)
            user.role = role;
        if (phone !== undefined)
            user.phone = phone;
        if (department !== undefined)
            user.department = department;
        if (company !== undefined)
            user.company = company;
        if (permissions !== undefined)
            user.permissions = permissions;
        if (isActive !== undefined)
            user.isActive = isActive;
        // Save user
        await user.save();
        // Return user without password
        const updatedUser = await User_1.default.findById(id).select('-password');
        res.json({
            message: 'User updated successfully',
            user: updatedUser
        });
    }
    catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.updateUser = updateUser;
// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private (System Admin)
const deleteUser = async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        // Prevent deletion of system admin users
        const user = await User_1.default.findById(id);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        if (user.role === 'system_admin') {
            res.status(400).json({ message: 'Cannot delete system administrator accounts' });
            return;
        }
        // If deleting a route admin, unassign from any routes first
        if (user.role === 'route_admin') {
            await Route_1.default.updateMany({ routeAdminId: user._id }, {
                $unset: { routeAdminId: 1 },
                $set: {
                    'routeAdminAssignment.status': 'unassigned',
                    'routeAdminAssignment.unassignedAt': new Date(),
                    'routeAdminAssignment.unassignedBy': (_a = req.user) === null || _a === void 0 ? void 0 : _a._id,
                    'routeAdminAssignment.unassignReason': 'Route admin account deleted'
                }
            });
        }
        // Delete user
        await User_1.default.findByIdAndDelete(id);
        res.json({ message: 'User deleted successfully' });
    }
    catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.deleteUser = deleteUser;
// @desc    Toggle user active status
// @route   PATCH /api/admin/users/:id/toggle-status
// @access  Private (System Admin)
const toggleUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User_1.default.findById(id);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        // Toggle active status
        user.isActive = !user.isActive;
        await user.save();
        res.json({
            message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isActive: user.isActive
            }
        });
    }
    catch (error) {
        console.error('Toggle user status error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.toggleUserStatus = toggleUserStatus;
// @desc    Get user statistics overview
// @route   GET /api/admin/users/stats
// @access  Private (System Admin)
const getUserStats = async (req, res) => {
    try {
        const totalUsers = await User_1.default.countDocuments();
        const activeUsers = await User_1.default.countDocuments({ isActive: true });
        const inactiveUsers = await User_1.default.countDocuments({ isActive: false });
        // Get users by role
        const usersByRole = await User_1.default.aggregate([
            {
                $group: {
                    _id: '$role',
                    count: { $sum: 1 }
                }
            }
        ]);
        // Get recent registrations (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentRegistrations = await User_1.default.countDocuments({
            createdAt: { $gte: thirtyDaysAgo }
        });
        // NEW: Get route admin statistics
        const routeAdminStats = await getRouteAdminStatistics();
        const stats = {
            totalUsers,
            activeUsers,
            inactiveUsers,
            recentRegistrations,
            byRole: usersByRole.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            routeAdmins: routeAdminStats // NEW
        };
        res.json(stats);
    }
    catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getUserStats = getUserStats;
// NEW: Helper function to get route admin statistics
const getRouteAdminStatistics = async () => {
    try {
        const totalRouteAdmins = await User_1.default.countDocuments({ role: 'route_admin', isActive: true });
        const assignedRouteAdmins = await Route_1.default.countDocuments({
            routeAdminId: { $ne: null },
            'routeAdminAssignment.status': 'assigned',
            approvalStatus: 'approved',
            isActive: true
        });
        return {
            total: totalRouteAdmins,
            assigned: assignedRouteAdmins,
            unassigned: totalRouteAdmins - assignedRouteAdmins
        };
    }
    catch (error) {
        return { total: 0, assigned: 0, unassigned: 0 };
    }
};
// ===================================================
// NEW: ROUTE ADMIN SPECIFIC FUNCTIONS
// ===================================================
// @desc    Create route admin account
// @route   POST /api/admin/users/route-admin
// @access  Private (System Admin)
const createRouteAdmin = async (req, res) => {
    try {
        const { name, email, password, phone, department = 'Route Management' } = req.body;
        // Validate required fields
        if (!name || !email || !password) {
            res.status(400).json({ message: 'Name, email, and password are required' });
            return;
        }
        // Check if user already exists
        const existingUser = await User_1.default.findOne({ email });
        if (existingUser) {
            res.status(400).json({ message: 'User with this email already exists' });
            return;
        }
        // Create route admin user
        const routeAdminData = {
            name,
            email,
            password,
            role: 'route_admin',
            phone,
            department,
            company: 'Sri Express',
            permissions: [
                'route_vehicle_assignment',
                'route_schedule_management',
                'route_analytics_view',
                'fleet_communication'
            ],
            isActive: true
        };
        const routeAdmin = await User_1.default.create(routeAdminData);
        // Return without password
        const routeAdminResponse = await User_1.default.findById(routeAdmin._id).select('-password');
        res.status(201).json({
            message: 'Route admin created successfully',
            routeAdmin: routeAdminResponse
        });
    }
    catch (error) {
        console.error('Create route admin error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.createRouteAdmin = createRouteAdmin;
// @desc    Assign route to route admin
// @route   POST /api/admin/users/:routeAdminId/assign-route
// @access  Private (System Admin)
const assignRouteToAdmin = async (req, res) => {
    var _a, _b, _c;
    try {
        const { routeAdminId } = req.params;
        const { routeId } = req.body;
        const systemAdminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!systemAdminId) {
            res.status(401).json({ message: 'System admin ID not found' });
            return;
        }
        // Validate IDs
        if (!mongoose_1.default.Types.ObjectId.isValid(routeAdminId) || !mongoose_1.default.Types.ObjectId.isValid(routeId)) {
            res.status(400).json({ message: 'Invalid route admin ID or route ID' });
            return;
        }
        // Find route admin
        const routeAdmin = await User_1.default.findById(routeAdminId);
        if (!routeAdmin || routeAdmin.role !== 'route_admin') {
            res.status(404).json({ message: 'Route admin not found' });
            return;
        }
        // Find route
        const route = await Route_1.default.findById(routeId);
        if (!route) {
            res.status(404).json({ message: 'Route not found' });
            return;
        }
        // Check if route admin is already assigned to a route
        const existingAssignment = await Route_1.default.findOne({
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
        await route.assignRouteAdmin(new mongoose_1.default.Types.ObjectId(routeAdminId), systemAdminId);
        // Get updated route with populated route admin
        const updatedRoute = await Route_1.default.findById(routeId)
            .populate('routeAdminId', 'name email phone')
            .populate('routeAdminAssignment.assignedBy', 'name email');
        res.json({
            message: 'Route admin assigned successfully',
            assignment: {
                routeAdmin: {
                    _id: routeAdmin._id,
                    name: routeAdmin.name,
                    email: routeAdmin.email
                },
                route: {
                    _id: route._id,
                    name: route.name,
                    routeId: route.routeId
                },
                assignedAt: (_b = updatedRoute === null || updatedRoute === void 0 ? void 0 : updatedRoute.routeAdminAssignment) === null || _b === void 0 ? void 0 : _b.assignedAt,
                assignedBy: (_c = updatedRoute === null || updatedRoute === void 0 ? void 0 : updatedRoute.routeAdminAssignment) === null || _c === void 0 ? void 0 : _c.assignedBy
            }
        });
    }
    catch (error) {
        console.error('Assign route to admin error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.assignRouteToAdmin = assignRouteToAdmin;
// @desc    Remove route admin assignment
// @route   DELETE /api/admin/users/:routeAdminId/remove-route
// @access  Private (System Admin)
const removeRouteAdminAssignment = async (req, res) => {
    var _a;
    try {
        const { routeAdminId } = req.params;
        const { reason } = req.body;
        const systemAdminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!systemAdminId) {
            res.status(401).json({ message: 'System admin ID not found' });
            return;
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(routeAdminId)) {
            res.status(400).json({ message: 'Invalid route admin ID' });
            return;
        }
        // Find route admin
        const routeAdmin = await User_1.default.findById(routeAdminId);
        if (!routeAdmin || routeAdmin.role !== 'route_admin') {
            res.status(404).json({ message: 'Route admin not found' });
            return;
        }
        // Find assigned route
        const assignedRoute = await Route_1.default.findOne({
            routeAdminId: routeAdminId,
            'routeAdminAssignment.status': 'assigned',
            isActive: true
        });
        if (!assignedRoute) {
            res.status(404).json({ message: 'No active route assignment found for this route admin' });
            return;
        }
        // Remove assignment
        await assignedRoute.unassignRouteAdmin(systemAdminId, reason || 'Assignment removed by system admin');
        res.json({
            message: 'Route admin assignment removed successfully',
            routeAdmin: {
                _id: routeAdmin._id,
                name: routeAdmin.name,
                email: routeAdmin.email
            },
            previousRoute: {
                _id: assignedRoute._id,
                name: assignedRoute.name,
                routeId: assignedRoute.routeId
            }
        });
    }
    catch (error) {
        console.error('Remove route admin assignment error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.removeRouteAdminAssignment = removeRouteAdminAssignment;
// @desc    Get all route admins with their assignments
// @route   GET /api/admin/users/route-admins
// @access  Private (System Admin)
const getRouteAdmins = async (req, res) => {
    try {
        const { includeUnassigned = true } = req.query;
        // Get all route admins
        const routeAdmins = await User_1.default.find({
            role: 'route_admin',
            isActive: true
        }).select('-password');
        // Get route assignments for each route admin
        const routeAdminsWithAssignments = await Promise.all(routeAdmins.map(async (admin) => {
            const assignedRoute = await Route_1.default.findOne({
                routeAdminId: admin._id,
                'routeAdminAssignment.status': 'assigned',
                approvalStatus: 'approved',
                isActive: true
            })
                .select('_id name routeId startLocation endLocation routeAdminAssignment')
                .populate('routeAdminAssignment.assignedBy', 'name email');
            return {
                ...admin.toObject(),
                assignedRoute,
                hasAssignment: !!assignedRoute
            };
        }));
        // Filter based on includeUnassigned parameter
        const filteredAdmins = includeUnassigned
            ? routeAdminsWithAssignments
            : routeAdminsWithAssignments.filter(admin => admin.hasAssignment);
        // Get statistics
        const stats = {
            total: routeAdmins.length,
            assigned: routeAdminsWithAssignments.filter(admin => admin.hasAssignment).length,
            unassigned: routeAdminsWithAssignments.filter(admin => !admin.hasAssignment).length
        };
        res.json({
            routeAdmins: filteredAdmins,
            stats
        });
    }
    catch (error) {
        console.error('Get route admins error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getRouteAdmins = getRouteAdmins;
// @desc    Create route admin and assign to route in one step
// @route   POST /api/admin/users/route-admin-with-assignment
// @access  Private (System Admin)
const createRouteAdminWithAssignment = async (req, res) => {
    var _a, _b, _c;
    try {
        const { name, email, password, phone, routeId } = req.body;
        const systemAdminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!systemAdminId) {
            res.status(401).json({ message: 'System admin ID not found' });
            return;
        }
        // Validate required fields
        if (!name || !email || !password || !routeId) {
            res.status(400).json({ message: 'Name, email, password, and route ID are required' });
            return;
        }
        // Check if user already exists
        const existingUser = await User_1.default.findOne({ email });
        if (existingUser) {
            res.status(400).json({ message: 'User with this email already exists' });
            return;
        }
        // Check if route exists and is available
        const route = await Route_1.default.findById(routeId);
        if (!route) {
            res.status(404).json({ message: 'Route not found' });
            return;
        }
        if (route.hasRouteAdmin()) {
            res.status(400).json({ message: 'Route already has a route admin assigned' });
            return;
        }
        // Create route admin
        const routeAdminData = {
            name,
            email,
            password,
            role: 'route_admin',
            phone,
            department: 'Route Management',
            company: 'Sri Express',
            permissions: [
                'route_vehicle_assignment',
                'route_schedule_management',
                'route_analytics_view',
                'fleet_communication'
            ],
            isActive: true
        };
        const routeAdmin = await User_1.default.create(routeAdminData);
        // Assign route to route admin
        await route.assignRouteAdmin(routeAdmin._id, systemAdminId);
        // Get complete assignment info
        const updatedRoute = await Route_1.default.findById(routeId)
            .populate('routeAdminId', 'name email phone')
            .populate('routeAdminAssignment.assignedBy', 'name email');
        res.status(201).json({
            message: 'Route admin created and assigned successfully',
            routeAdmin: {
                _id: routeAdmin._id,
                name: routeAdmin.name,
                email: routeAdmin.email,
                role: routeAdmin.role,
                phone: routeAdmin.phone
            },
            assignment: {
                route: {
                    _id: route._id,
                    name: route.name,
                    routeId: route.routeId
                },
                assignedAt: (_b = updatedRoute === null || updatedRoute === void 0 ? void 0 : updatedRoute.routeAdminAssignment) === null || _b === void 0 ? void 0 : _b.assignedAt,
                assignedBy: (_c = updatedRoute === null || updatedRoute === void 0 ? void 0 : updatedRoute.routeAdminAssignment) === null || _c === void 0 ? void 0 : _c.assignedBy
            }
        });
    }
    catch (error) {
        console.error('Create route admin with assignment error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.createRouteAdminWithAssignment = createRouteAdminWithAssignment;
// ===================================================
// EXISTING FUNCTIONS (unchanged)
// ===================================================
// @desc    Get individual user statistics
// @route   GET /api/admin/users/:id/stats
// @access  Private (System Admin)
const getUserStatistics = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`🎯 getUserStatistics called for user ID: ${id}`);
        // Check if user exists
        const user = await User_1.default.findById(id);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        // Try to get activity statistics (handle case where UserActivity might not exist)
        let totalActivities = 0;
        let loginCount = 0;
        let recentActivities = 0;
        let lastActivity = null;
        try {
            totalActivities = await UserActivity_1.default.countDocuments({ userId: id });
            loginCount = await UserActivity_1.default.countDocuments({
                userId: id,
                action: 'login'
            });
            // Get last 30 days activity
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            recentActivities = await UserActivity_1.default.countDocuments({
                userId: id,
                timestamp: { $gte: thirtyDaysAgo }
            });
            // Get last activity date
            lastActivity = await UserActivity_1.default.findOne({ userId: id }, {}, { sort: { timestamp: -1 } });
        }
        catch (activityError) {
            console.log('UserActivity collection not available, using mock data');
        }
        // Role-specific statistics
        let roleSpecificStats = {};
        switch (user.role) {
            case 'client':
                roleSpecificStats = {
                    tripsBooked: Math.floor(Math.random() * 50) + 5,
                    completedTrips: Math.floor(Math.random() * 45) + 3,
                    cancelledTrips: Math.floor(Math.random() * 5),
                    upcomingTrips: Math.floor(Math.random() * 3)
                };
                break;
            case 'route_admin':
                // NEW: Route admin specific stats
                const assignedRoute = await Route_1.default.findOne({
                    routeAdminId: id,
                    'routeAdminAssignment.status': 'assigned',
                    approvalStatus: 'approved',
                    isActive: true
                });
                roleSpecificStats = {
                    hasAssignedRoute: !!assignedRoute,
                    assignedRouteName: (assignedRoute === null || assignedRoute === void 0 ? void 0 : assignedRoute.name) || null,
                    assignedRouteId: (assignedRoute === null || assignedRoute === void 0 ? void 0 : assignedRoute.routeId) || null,
                    vehiclesManaged: Math.floor(Math.random() * 15) + 3,
                    activeAssignments: Math.floor(Math.random() * 12) + 2,
                    routePerformanceRating: Math.round((Math.random() * 2 + 3) * 10) / 10 // 3.0-5.0
                };
                break;
            case 'company_admin':
                roleSpecificStats = {
                    devicesManaged: Math.floor(Math.random() * 20) + 5,
                    onlineDevices: Math.floor(Math.random() * 15) + 3,
                    offlineDevices: Math.floor(Math.random() * 5),
                    maintenanceDevices: Math.floor(Math.random() * 3)
                };
                break;
            case 'customer_service':
                roleSpecificStats = {
                    ticketsHandled: Math.floor(Math.random() * 200) + 50,
                    resolvedTickets: Math.floor(Math.random() * 180) + 40,
                    averageResponseTime: Math.floor(Math.random() * 60) + 15
                };
                break;
            case 'system_admin':
                roleSpecificStats = {
                    usersManaged: await User_1.default.countDocuments(),
                    devicesOverseeing: Math.floor(Math.random() * 100) + 20,
                    systemAlerts: Math.floor(Math.random() * 10) + 2
                };
                break;
        }
        // Mock trends
        const trends = {
            loginTrend: Math.floor(Math.random() * 40) - 20, // -20 to +20
            activityTrend: Math.floor(Math.random() * 60) - 30 // -30 to +30
        };
        const statistics = {
            userId: id,
            role: user.role,
            accountCreated: user.createdAt,
            lastLogin: user.lastLogin,
            isActive: user.isActive,
            totalLogins: loginCount || Math.floor(Math.random() * 50) + 10,
            totalActivities: totalActivities || Math.floor(Math.random() * 100) + 20,
            recentActivities: recentActivities || Math.floor(Math.random() * 30) + 5,
            lastActiveDate: (lastActivity === null || lastActivity === void 0 ? void 0 : lastActivity.timestamp) || user.lastLogin || user.updatedAt,
            averageSessionsPerDay: Math.round(((loginCount || 25) / 30) * 10) / 10,
            activityByCategory: {
                auth: Math.floor((totalActivities || 50) * 0.3),
                profile: Math.floor((totalActivities || 50) * 0.1),
                device: Math.floor((totalActivities || 50) * 0.4),
                trip: Math.floor((totalActivities || 50) * 0.1),
                system: Math.floor((totalActivities || 50) * 0.1)
            },
            ...roleSpecificStats,
            failedLoginAttempts: Math.floor(Math.random() * 5),
            trends
        };
        console.log(`✅ Successfully retrieved statistics for user ${id}`);
        res.json(statistics);
    }
    catch (error) {
        console.error('Get user statistics error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getUserStatistics = getUserStatistics;
// @desc    Get user activity log
// @route   GET /api/admin/users/:id/activity
// @access  Private (System Admin)
const getUserActivity = async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 20, category = 'all', action = 'all', startDate, endDate } = req.query;
        console.log(`🎯 getUserActivity called for user ID: ${id}`);
        // Check if user exists
        const user = await User_1.default.findById(id);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        // Try to get activities from UserActivity collection
        let activities = [];
        let totalActivities = 0;
        let activitySummary = [];
        let uniqueActions = [];
        try {
            // Build query
            let query = { userId: new mongoose_1.default.Types.ObjectId(id) };
            // Filter by category
            if (category !== 'all') {
                query.category = category;
            }
            // Filter by action
            if (action !== 'all') {
                query.action = action;
            }
            // Filter by date range
            if (startDate || endDate) {
                query.timestamp = {};
                if (startDate) {
                    query.timestamp.$gte = new Date(startDate);
                }
                if (endDate) {
                    query.timestamp.$lte = new Date(endDate);
                }
            }
            // Calculate pagination
            const pageNumber = parseInt(page);
            const pageSize = parseInt(limit);
            const skip = (pageNumber - 1) * pageSize;
            // Get activities with pagination
            activities = await UserActivity_1.default.find(query)
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(pageSize)
                .lean();
            // Get total count for pagination
            totalActivities = await UserActivity_1.default.countDocuments(query);
            // Get activity summary
            activitySummary = await UserActivity_1.default.aggregate([
                { $match: { userId: new mongoose_1.default.Types.ObjectId(id) } },
                {
                    $group: {
                        _id: '$category',
                        count: { $sum: 1 },
                        lastActivity: { $max: '$timestamp' }
                    }
                }
            ]);
            // Get unique actions for this user
            uniqueActions = await UserActivity_1.default.distinct('action', { userId: id });
        }
        catch (activityError) {
            console.log('UserActivity collection not available, using mock data');
            // Mock activity data
            activities = [
                {
                    _id: 'mock1',
                    action: 'login',
                    description: 'User logged into the system',
                    category: 'auth',
                    severity: 'info',
                    timestamp: new Date(),
                    ipAddress: '192.168.1.1',
                    userAgent: 'Mozilla/5.0...',
                    metadata: {}
                },
                {
                    _id: 'mock2',
                    action: 'profile_update',
                    description: 'User updated their profile',
                    category: 'profile',
                    severity: 'info',
                    timestamp: new Date(Date.now() - 3600000),
                    ipAddress: '192.168.1.1',
                    userAgent: 'Mozilla/5.0...',
                    metadata: {}
                }
            ];
            totalActivities = 15;
            uniqueActions = ['login', 'logout', 'profile_update'];
            activitySummary = [
                { _id: 'auth', count: 8, lastActivity: new Date() },
                { _id: 'profile', count: 4, lastActivity: new Date() },
                { _id: 'system', count: 3, lastActivity: new Date() }
            ];
        }
        // Format activities for frontend
        const formattedActivities = activities.map(activity => ({
            id: activity._id,
            action: activity.action,
            description: activity.description,
            category: activity.category,
            severity: activity.severity || 'info',
            timestamp: activity.timestamp,
            ipAddress: activity.ipAddress,
            userAgent: activity.userAgent,
            metadata: activity.metadata
        }));
        const pageNumber = parseInt(page);
        const pageSize = parseInt(limit);
        res.json({
            activities: formattedActivities,
            pagination: {
                currentPage: pageNumber,
                totalPages: Math.ceil(totalActivities / pageSize),
                totalActivities,
                hasNext: pageNumber < Math.ceil(totalActivities / pageSize),
                hasPrev: pageNumber > 1
            },
            summary: {
                totalActivities,
                categorySummary: activitySummary.reduce((acc, item) => {
                    acc[item._id] = {
                        count: item.count,
                        lastActivity: item.lastActivity
                    };
                    return acc;
                }, {}),
                availableActions: uniqueActions,
                availableCategories: ['auth', 'profile', 'device', 'trip', 'system', 'other']
            }
        });
        console.log(`✅ Successfully retrieved activity for user ${id}`);
    }
    catch (error) {
        console.error('Get user activity error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getUserActivity = getUserActivity;
// @desc    Get user activity timeline (simplified for dashboard widgets)
// @route   GET /api/admin/users/:id/timeline
// @access  Private (System Admin)
const getUserTimeline = async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 10 } = req.query;
        console.log(`🎯 getUserTimeline called for user ID: ${id}`);
        // Check if user exists
        const user = await User_1.default.findById(id);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        let timeline = [];
        try {
            // Get recent activities for timeline
            const recentActivities = await UserActivity_1.default.find({ userId: id })
                .sort({ timestamp: -1 })
                .limit(parseInt(limit))
                .select('action description timestamp category severity metadata')
                .lean();
            // Format for timeline display
            timeline = recentActivities.map(activity => ({
                id: activity._id,
                action: activity.action,
                description: activity.description,
                timestamp: activity.timestamp,
                category: activity.category,
                severity: activity.severity,
                icon: getActivityIcon(activity.action),
                color: getCategoryColor(activity.category),
                metadata: activity.metadata
            }));
        }
        catch (activityError) {
            console.log('UserActivity collection not available, using mock timeline');
            // Mock timeline data
            timeline = [
                {
                    id: 'mock1',
                    action: 'login',
                    description: 'User logged into the system',
                    timestamp: new Date(),
                    category: 'auth',
                    severity: 'info',
                    icon: 'login',
                    color: 'blue',
                    metadata: {}
                },
                {
                    id: 'mock2',
                    action: 'profile_update',
                    description: 'Updated profile information',
                    timestamp: new Date(Date.now() - 3600000),
                    category: 'profile',
                    severity: 'info',
                    icon: 'user',
                    color: 'green',
                    metadata: {}
                },
                {
                    id: 'mock3',
                    action: 'device_view',
                    description: 'Viewed device details',
                    timestamp: new Date(Date.now() - 7200000),
                    category: 'device',
                    severity: 'info',
                    icon: 'eye',
                    color: 'orange',
                    metadata: {}
                }
            ];
        }
        console.log(`✅ Successfully retrieved timeline for user ${id}`);
        res.json({ timeline });
    }
    catch (error) {
        console.error('Get user timeline error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getUserTimeline = getUserTimeline;
// Helper function to get activity icon
const getActivityIcon = (action) => {
    const iconMap = {
        'login': 'login',
        'logout': 'logout',
        'password_change': 'key',
        'profile_update': 'user',
        'user_created': 'user-plus',
        'user_updated': 'user-edit',
        'user_deleted': 'user-minus',
        'device_created': 'device-plus',
        'device_updated': 'device-edit',
        'device_deleted': 'device-minus',
        'trip_booking': 'map',
        'users_list_view': 'list',
        'devices_list_view': 'list',
        'user_details_view': 'eye',
        'device_details_view': 'eye'
    };
    return iconMap[action] || 'activity';
};
// Helper function to get category color
const getCategoryColor = (category) => {
    const colorMap = {
        'auth': 'blue',
        'profile': 'green',
        'device': 'orange',
        'trip': 'cyan',
        'system': 'red',
        'other': 'gray'
    };
    return colorMap[category] || 'gray';
};
