"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteVehicle = exports.getPendingVehicles = exports.bulkRejectVehicles = exports.bulkApproveVehicles = exports.rejectVehicle = exports.approveVehicle = exports.getVehicleById = exports.getVehicleStats = exports.getAllVehicles = void 0;
const Device_1 = __importDefault(require("../models/Device")); // Use Device model instead of Vehicle
const Fleet_1 = __importDefault(require("../models/Fleet"));
const BusRating_1 = __importDefault(require("../models/BusRating"));
const mongoose_1 = __importDefault(require("mongoose"));
// @desc    Get all vehicles with filtering and approval status
// @route   GET /api/admin/vehicles
// @access  Private (System Admin)
const getAllVehicles = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', approvalStatus = 'all', status = 'all', fleetId = '', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        // Build query
        let query = { isActive: true };
        // Search functionality
        if (search) {
            query.$or = [
                { vehicleNumber: { $regex: search, $options: 'i' } },
                { deviceId: { $regex: search, $options: 'i' } },
                { vehicleType: { $regex: search, $options: 'i' } }
            ];
        }
        // Approval status filter
        if (approvalStatus !== 'all') {
            query.approvalStatus = approvalStatus;
        }
        // Status filter
        if (status !== 'all') {
            query.status = status;
        }
        // Fleet filter
        if (fleetId && mongoose_1.default.Types.ObjectId.isValid(fleetId)) {
            query.fleetId = new mongoose_1.default.Types.ObjectId(fleetId);
        }
        // Calculate pagination
        const pageNumber = parseInt(page);
        const pageSize = parseInt(limit);
        const skip = (pageNumber - 1) * pageSize;
        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
        // Get vehicles with pagination
        const vehicles = await Device_1.default.find(query)
            .populate('fleetId', 'companyName registrationNumber contactPerson email')
            .populate('assignedTo.adminId', 'name email') // For approved/rejected by
            .sort(sort)
            .skip(skip)
            .limit(pageSize);
        // Get total count for pagination
        const totalVehicles = await Device_1.default.countDocuments(query);
        // Add rating information to each vehicle
        const vehiclesWithRatings = await Promise.all(vehicles.map(async (vehicle) => {
            try {
                const ratingStatsResult = await BusRating_1.default.getAverageRating(vehicle._id);
                const ratingStats = Array.isArray(ratingStatsResult) && ratingStatsResult.length > 0
                    ? ratingStatsResult[0]
                    : {
                        avgOverall: 0,
                        avgCleanliness: 0,
                        avgComfort: 0,
                        avgCondition: 0,
                        avgSafety: 0,
                        avgPunctuality: 0,
                        totalRatings: 0
                    };
                return {
                    ...vehicle.toObject(),
                    ratingStats: {
                        averageRating: ratingStats.avgOverall || 0,
                        totalRatings: ratingStats.totalRatings || 0,
                        breakdown: {
                            cleanliness: ratingStats.avgCleanliness || 0,
                            comfort: ratingStats.avgComfort || 0,
                            condition: ratingStats.avgCondition || 0,
                            safety: ratingStats.avgSafety || 0,
                            punctuality: ratingStats.avgPunctuality || 0
                        }
                    }
                };
            }
            catch (error) {
                console.error(`Error getting ratings for vehicle ${vehicle.vehicleNumber}:`, error);
                return {
                    ...vehicle.toObject(),
                    ratingStats: {
                        averageRating: 0,
                        totalRatings: 0,
                        breakdown: {
                            cleanliness: 0,
                            comfort: 0,
                            condition: 0,
                            safety: 0,
                            punctuality: 0
                        }
                    }
                };
            }
        }));
        res.json({
            vehicles: vehiclesWithRatings,
            pagination: {
                currentPage: pageNumber,
                totalPages: Math.ceil(totalVehicles / pageSize),
                totalVehicles,
                hasNext: pageNumber < Math.ceil(totalVehicles / pageSize),
                hasPrev: pageNumber > 1
            }
        });
    }
    catch (error) {
        console.error('Get all vehicles error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getAllVehicles = getAllVehicles;
// @desc    Get vehicle statistics for admin dashboard
// @route   GET /api/admin/vehicles/stats
// @access  Private (System Admin)
const getVehicleStats = async (req, res) => {
    try {
        // Get basic statistics
        const totalVehicles = await Device_1.default.countDocuments({ isActive: true });
        const pendingApproval = await Device_1.default.countDocuments({ approvalStatus: 'pending', isActive: true });
        const approvedVehicles = await Device_1.default.countDocuments({ approvalStatus: 'approved', isActive: true });
        const rejectedVehicles = await Device_1.default.countDocuments({ approvalStatus: 'rejected', isActive: true });
        // Get status statistics for approved vehicles
        const onlineVehicles = await Device_1.default.countDocuments({
            approvalStatus: 'approved',
            status: 'online',
            isActive: true
        });
        const offlineVehicles = await Device_1.default.countDocuments({
            approvalStatus: 'approved',
            status: 'offline',
            isActive: true
        });
        const maintenanceVehicles = await Device_1.default.countDocuments({
            approvalStatus: 'approved',
            status: 'maintenance',
            isActive: true
        });
        // Get recent applications (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentApplications = await Device_1.default.countDocuments({
            createdAt: { $gte: sevenDaysAgo },
            isActive: true
        });
        // Get vehicles by type
        const vehicleTypes = await Device_1.default.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: '$vehicleType',
                    total: { $sum: 1 },
                    approved: {
                        $sum: { $cond: [{ $eq: ['$approvalStatus', 'approved'] }, 1, 0] }
                    },
                    pending: {
                        $sum: { $cond: [{ $eq: ['$approvalStatus', 'pending'] }, 1, 0] }
                    }
                }
            }
        ]);
        const stats = {
            totalVehicles,
            pendingApproval,
            approvedVehicles,
            rejectedVehicles,
            onlineVehicles,
            offlineVehicles,
            maintenanceVehicles,
            recentApplications,
            vehicleTypes: vehicleTypes.reduce((acc, item) => {
                acc[item._id] = {
                    total: item.total,
                    approved: item.approved,
                    pending: item.pending
                };
                return acc;
            }, {})
        };
        res.json(stats);
    }
    catch (error) {
        console.error('Get vehicle stats error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getVehicleStats = getVehicleStats;
// @desc    Get vehicle by ID
// @route   GET /api/admin/vehicles/:id
// @access  Private (System Admin)
const getVehicleById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: 'Invalid vehicle ID' });
            return;
        }
        const vehicle = await Device_1.default.findById(id)
            .populate('fleetId', 'companyName registrationNumber contactPerson email phone address')
            .populate('assignedTo.adminId', 'name email role');
        if (!vehicle) {
            res.status(404).json({ message: 'Vehicle not found' });
            return;
        }
        res.json(vehicle);
    }
    catch (error) {
        console.error('Get vehicle by ID error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getVehicleById = getVehicleById;
// @desc    Approve vehicle
// @route   PUT /api/admin/vehicles/:id/approve
// @access  Private (System Admin)
const approveVehicle = async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        const { notes } = req.body;
        const adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: 'Invalid vehicle ID' });
            return;
        }
        if (!adminId) {
            res.status(401).json({ message: 'Admin ID not found in request' });
            return;
        }
        // Find vehicle
        const vehicle = await Device_1.default.findById(id).populate('fleetId');
        if (!vehicle) {
            res.status(404).json({ message: 'Vehicle not found' });
            return;
        }
        // Check if vehicle can be approved
        if (vehicle.approvalStatus !== 'pending') {
            res.status(400).json({
                message: `Vehicle cannot be approved. Current status: ${vehicle.approvalStatus}`
            });
            return;
        }
        // Check if the fleet is approved
        const fleet = await Fleet_1.default.findById(vehicle.fleetId);
        if (!fleet || fleet.status !== 'approved') {
            res.status(400).json({
                message: 'Vehicle can only be approved if the fleet is approved'
            });
            return;
        }
        // Approve vehicle
        vehicle.approvalStatus = 'approved';
        vehicle.approvalDate = new Date();
        vehicle.assignedTo = {
            ...vehicle.assignedTo,
            adminId: adminId,
            assignedAt: new Date()
        };
        if (notes) {
            vehicle.notes = notes;
        }
        await vehicle.save();
        // Update fleet's active vehicle count
        await Fleet_1.default.findByIdAndUpdate(vehicle.fleetId, {
            $inc: { activeVehicles: 1 }
        });
        // Populate admin details
        await vehicle.populate('assignedTo.adminId', 'name email');
        await vehicle.populate('fleetId', 'companyName registrationNumber');
        res.json({
            message: 'Vehicle approved successfully',
            vehicle
        });
    }
    catch (error) {
        console.error('Approve vehicle error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.approveVehicle = approveVehicle;
// @desc    Reject vehicle
// @route   PUT /api/admin/vehicles/:id/reject
// @access  Private (System Admin)
const rejectVehicle = async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: 'Invalid vehicle ID' });
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
        // Find vehicle
        const vehicle = await Device_1.default.findById(id);
        if (!vehicle) {
            res.status(404).json({ message: 'Vehicle not found' });
            return;
        }
        // Check if vehicle can be rejected
        if (vehicle.approvalStatus !== 'pending') {
            res.status(400).json({
                message: `Vehicle cannot be rejected. Current status: ${vehicle.approvalStatus}`
            });
            return;
        }
        // Reject vehicle
        vehicle.approvalStatus = 'rejected';
        vehicle.rejectionDate = new Date();
        vehicle.rejectionReason = reason.trim();
        vehicle.assignedTo = {
            ...vehicle.assignedTo,
            adminId: adminId,
            assignedAt: new Date()
        };
        await vehicle.save();
        // Populate admin details
        await vehicle.populate('assignedTo.adminId', 'name email');
        await vehicle.populate('fleetId', 'companyName registrationNumber');
        res.json({
            message: 'Vehicle rejected successfully',
            vehicle
        });
    }
    catch (error) {
        console.error('Reject vehicle error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.rejectVehicle = rejectVehicle;
// @desc    Bulk approve vehicles
// @route   PUT /api/admin/vehicles/bulk-approve
// @access  Private (System Admin)
const bulkApproveVehicles = async (req, res) => {
    var _a;
    try {
        const { vehicleIds, notes } = req.body;
        const adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!adminId) {
            res.status(401).json({ message: 'Admin ID not found in request' });
            return;
        }
        if (!vehicleIds || !Array.isArray(vehicleIds) || vehicleIds.length === 0) {
            res.status(400).json({ message: 'Vehicle IDs array is required' });
            return;
        }
        // Validate all IDs
        const invalidIds = vehicleIds.filter(id => !mongoose_1.default.Types.ObjectId.isValid(id));
        if (invalidIds.length > 0) {
            res.status(400).json({ message: 'Invalid vehicle IDs found' });
            return;
        }
        // Find all vehicles and check if they can be approved
        const vehicles = await Device_1.default.find({
            _id: { $in: vehicleIds },
            approvalStatus: 'pending',
            isActive: true
        }).populate('fleetId');
        if (vehicles.length !== vehicleIds.length) {
            res.status(400).json({ message: 'Some vehicles not found or cannot be approved' });
            return;
        }
        // Check if all fleets are approved
        const unapprovedFleets = vehicles.filter(v => !v.fleetId || v.fleetId.status !== 'approved');
        if (unapprovedFleets.length > 0) {
            res.status(400).json({
                message: 'All vehicles must belong to approved fleets'
            });
            return;
        }
        // Approve all vehicles
        const approvedVehicles = [];
        for (const vehicle of vehicles) {
            vehicle.approvalStatus = 'approved';
            vehicle.approvalDate = new Date();
            vehicle.assignedTo = {
                ...vehicle.assignedTo,
                adminId: adminId,
                assignedAt: new Date()
            };
            if (notes) {
                vehicle.notes = notes;
            }
            await vehicle.save();
            // Update fleet's active vehicle count
            await Fleet_1.default.findByIdAndUpdate(vehicle.fleetId, {
                $inc: { activeVehicles: 1 }
            });
            approvedVehicles.push(vehicle);
        }
        res.json({
            message: `${approvedVehicles.length} vehicles approved successfully`,
            vehicles: approvedVehicles
        });
    }
    catch (error) {
        console.error('Bulk approve vehicles error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.bulkApproveVehicles = bulkApproveVehicles;
// @desc    Bulk reject vehicles
// @route   PUT /api/admin/vehicles/bulk-reject
// @access  Private (System Admin)
const bulkRejectVehicles = async (req, res) => {
    var _a;
    try {
        const { vehicleIds, reason } = req.body;
        const adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!adminId) {
            res.status(401).json({ message: 'Admin ID not found in request' });
            return;
        }
        if (!vehicleIds || !Array.isArray(vehicleIds) || vehicleIds.length === 0) {
            res.status(400).json({ message: 'Vehicle IDs array is required' });
            return;
        }
        if (!reason || reason.trim().length === 0) {
            res.status(400).json({ message: 'Rejection reason is required' });
            return;
        }
        // Validate all IDs
        const invalidIds = vehicleIds.filter(id => !mongoose_1.default.Types.ObjectId.isValid(id));
        if (invalidIds.length > 0) {
            res.status(400).json({ message: 'Invalid vehicle IDs found' });
            return;
        }
        // Find all vehicles and check if they can be rejected
        const vehicles = await Device_1.default.find({
            _id: { $in: vehicleIds },
            approvalStatus: 'pending',
            isActive: true
        });
        if (vehicles.length !== vehicleIds.length) {
            res.status(400).json({ message: 'Some vehicles not found or cannot be rejected' });
            return;
        }
        // Reject all vehicles
        const rejectedVehicles = [];
        for (const vehicle of vehicles) {
            vehicle.approvalStatus = 'rejected';
            vehicle.rejectionDate = new Date();
            vehicle.rejectionReason = reason.trim();
            vehicle.assignedTo = {
                ...vehicle.assignedTo,
                adminId: adminId,
                assignedAt: new Date()
            };
            await vehicle.save();
            rejectedVehicles.push(vehicle);
        }
        res.json({
            message: `${rejectedVehicles.length} vehicles rejected successfully`,
            vehicles: rejectedVehicles
        });
    }
    catch (error) {
        console.error('Bulk reject vehicles error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.bulkRejectVehicles = bulkRejectVehicles;
// @desc    Get pending vehicles for quick approval view
// @route   GET /api/admin/vehicles/pending
// @access  Private (System Admin)
const getPendingVehicles = async (req, res) => {
    try {
        const vehicles = await Device_1.default.find({
            approvalStatus: 'pending',
            isActive: true
        })
            .populate('fleetId', 'companyName registrationNumber contactPerson email')
            .sort({ createdAt: 1 });
        res.json({
            vehicles,
            count: vehicles.length
        });
    }
    catch (error) {
        console.error('Get pending vehicles error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getPendingVehicles = getPendingVehicles;
// @desc    Delete vehicle (soft delete)
// @route   DELETE /api/admin/vehicles/:id
// @access  Private (System Admin)
const deleteVehicle = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: 'Invalid vehicle ID' });
            return;
        }
        const vehicle = await Device_1.default.findById(id);
        if (!vehicle) {
            res.status(404).json({ message: 'Vehicle not found' });
            return;
        }
        // Soft delete
        vehicle.isActive = false;
        await vehicle.save();
        // Update fleet's active vehicle count if vehicle was approved
        if (vehicle.approvalStatus === 'approved') {
            await Fleet_1.default.findByIdAndUpdate(vehicle.fleetId, {
                $inc: { activeVehicles: -1 }
            });
        }
        res.json({ message: 'Vehicle deleted successfully' });
    }
    catch (error) {
        console.error('Delete vehicle error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.deleteVehicle = deleteVehicle;
