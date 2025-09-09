"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlotController = void 0;
const RouteSlot_1 = __importDefault(require("../models/RouteSlot"));
const SlotAssignment_1 = __importDefault(require("../models/SlotAssignment"));
const mongoose_1 = __importDefault(require("mongoose"));
class SlotController {
    // Route Admin - Create route slots for their assigned route
    static async createRouteSlots(req, res) {
        try {
            const { routeId } = req.params;
            const { slots } = req.body;
            // Validate user and role
            if (!req.user) {
                res.status(401).json({ message: 'Authentication required' });
                return;
            }
            if (!['system_admin', 'route_admin'].includes(req.user.role)) {
                res.status(403).json({ message: 'Only system admins and route admins can create route slots' });
                return;
            }
            if (!slots || !Array.isArray(slots) || slots.length === 0) {
                res.status(400).json({ message: 'Valid slots array is required' });
                return;
            }
            const createdSlots = [];
            for (const slotData of slots) {
                const slot = new RouteSlot_1.default({
                    routeId: new mongoose_1.default.Types.ObjectId(routeId),
                    slotNumber: slotData.slotNumber,
                    departureTime: slotData.departureTime,
                    arrivalTime: slotData.arrivalTime,
                    bufferMinutes: slotData.bufferMinutes || 15,
                    daysOfWeek: slotData.daysOfWeek,
                    slotType: slotData.slotType || 'regular',
                    maxCapacity: slotData.maxCapacity || 1,
                    isActive: slotData.isActive !== false,
                    createdBy: req.user._id
                });
                await slot.save();
                createdSlots.push(slot);
            }
            res.status(201).json({
                message: `Created ${createdSlots.length} route slots successfully`,
                slots: createdSlots
            });
        }
        catch (error) {
            console.error('Create route slots error:', error);
            res.status(500).json({ message: 'Failed to create route slots' });
        }
    }
    // Get slots for a route
    static async getRouteSlots(req, res) {
        try {
            const { routeId } = req.params;
            if (!req.user) {
                res.status(401).json({ message: 'Authentication required' });
                return;
            }
            if (!routeId) {
                res.status(400).json({ message: 'Route ID is required' });
                return;
            }
            const slots = await RouteSlot_1.default.find({
                routeId: new mongoose_1.default.Types.ObjectId(routeId),
                isActive: true
            }).sort({ slotNumber: 1 });
            // Get assignments for each slot
            const slotsWithAssignments = await Promise.all(slots.map(async (slot) => {
                const assignments = await SlotAssignment_1.default.find({
                    slotId: slot._id,
                    status: { $in: ['approved', 'active'] },
                    isActive: true
                })
                    .populate('vehicleId', 'vehicleNumber vehicleType status')
                    .populate('fleetId', 'companyName phone');
                return {
                    ...slot.toObject(),
                    assignments,
                    availableCapacity: slot.maxCapacity - assignments.length
                };
            }));
            res.json({ slots: slotsWithAssignments });
        }
        catch (error) {
            console.error('Get route slots error:', error);
            res.status(500).json({ message: 'Failed to get route slots' });
        }
    }
    // Fleet Manager - Assign vehicle to slot
    static async assignVehicleToSlot(req, res) {
        try {
            const { slotId, vehicleId, fleetId, startDate, endDate, priority } = req.body;
            if (!req.user) {
                res.status(401).json({ message: 'Authentication required' });
                return;
            }
            // Validate user role
            if (!['fleet_manager', 'route_admin'].includes(req.user.role)) {
                res.status(403).json({ message: 'Only fleet managers and route admins can assign vehicles to slots' });
                return;
            }
            // Check slot capacity
            const slot = await RouteSlot_1.default.findById(slotId).populate('routeId');
            if (!slot) {
                res.status(404).json({ message: 'Slot not found' });
                return;
            }
            const existingAssignments = await SlotAssignment_1.default.find({
                slotId: new mongoose_1.default.Types.ObjectId(slotId),
                status: { $in: ['approved', 'active'] },
                isActive: true
            });
            if (existingAssignments.length >= slot.maxCapacity) {
                res.status(400).json({ message: 'Slot is at maximum capacity' });
                return;
            }
            // Create assignment
            const assignment = new SlotAssignment_1.default({
                slotId: new mongoose_1.default.Types.ObjectId(slotId),
                vehicleId: new mongoose_1.default.Types.ObjectId(vehicleId),
                fleetId: new mongoose_1.default.Types.ObjectId(fleetId),
                routeId: slot.routeId,
                assignedBy: req.user._id,
                status: req.user.role === 'route_admin' ? 'approved' : 'pending',
                startDate: startDate ? new Date(startDate) : new Date(),
                endDate: endDate ? new Date(endDate) : undefined,
                priority: priority || 1
            });
            await assignment.save();
            // Populate for response
            await assignment.populate([
                { path: 'slotId' },
                { path: 'vehicleId', select: 'vehicleNumber vehicleType status' },
                { path: 'fleetId', select: 'companyName phone' }
            ]);
            res.status(201).json({
                message: 'Vehicle assigned to slot successfully',
                assignment
            });
        }
        catch (error) {
            console.error('Assign vehicle to slot error:', error);
            res.status(500).json({ message: 'Failed to assign vehicle to slot' });
        }
    }
    // Route Admin - Approve/Reject slot assignment
    static async updateAssignmentStatus(req, res) {
        try {
            const { assignmentId } = req.params;
            const { action, reason } = req.body;
            if (!req.user) {
                res.status(401).json({ message: 'Authentication required' });
                return;
            }
            // Validate user role
            if (req.user.role !== 'route_admin') {
                res.status(403).json({ message: 'Only route admins can approve/reject assignments' });
                return;
            }
            const assignment = await SlotAssignment_1.default.findById(assignmentId);
            if (!assignment) {
                res.status(404).json({ message: 'Assignment not found' });
                return;
            }
            switch (action) {
                case 'approve':
                    assignment.status = 'approved';
                    assignment.approvedAt = new Date();
                    assignment.approvedBy = req.user._id;
                    assignment.rejectedAt = undefined;
                    assignment.rejectedBy = undefined;
                    assignment.rejectionReason = undefined;
                    break;
                case 'reject':
                    assignment.status = 'rejected';
                    assignment.rejectedAt = new Date();
                    assignment.rejectedBy = req.user._id;
                    assignment.rejectionReason = reason;
                    assignment.approvedAt = undefined;
                    assignment.approvedBy = undefined;
                    break;
                default:
                    res.status(400).json({ message: 'Invalid action. Use "approve" or "reject"' });
                    return;
            }
            await assignment.save();
            await assignment.populate([
                { path: 'vehicleId', select: 'vehicleNumber vehicleType status' },
                { path: 'fleetId', select: 'companyName phone' }
            ]);
            res.json({
                message: `Assignment ${action}d successfully`,
                assignment
            });
        }
        catch (error) {
            console.error('Update assignment status error:', error);
            res.status(500).json({ message: 'Failed to update assignment status' });
        }
    }
    // Get pending assignments for route admin
    static async getPendingAssignments(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ message: 'Authentication required' });
                return;
            }
            if (req.user.role !== 'route_admin') {
                res.status(403).json({ message: 'Only route admins can view pending assignments' });
                return;
            }
            const assignments = await SlotAssignment_1.default.find({
                status: 'pending',
                isActive: true
            })
                .populate('slotId')
                .populate('vehicleId', 'vehicleNumber vehicleType status')
                .populate('fleetId', 'companyName phone')
                .populate('assignedBy', 'name email')
                .sort({ assignedAt: -1 });
            res.json({ assignments });
        }
        catch (error) {
            console.error('Get pending assignments error:', error);
            res.status(500).json({ message: 'Failed to get pending assignments' });
        }
    }
    // Get approved assignments
    static async getApprovedAssignments(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ message: 'Authentication required' });
                return;
            }
            const routeId = req.query.routeId;
            const query = {
                status: { $in: ['approved', 'active'] },
                isActive: true
            };
            if (routeId) {
                query.routeId = new mongoose_1.default.Types.ObjectId(routeId);
            }
            const assignments = await SlotAssignment_1.default.find(query)
                .populate('slotId')
                .populate('vehicleId', 'vehicleNumber vehicleType status')
                .populate('fleetId', 'companyName phone')
                .sort({ 'slotId.departureTime': 1 });
            res.json({ assignments });
        }
        catch (error) {
            console.error('Get approved assignments error:', error);
            res.status(500).json({ message: 'Failed to get approved assignments' });
        }
    }
    // Remove assignment
    static async removeAssignment(req, res) {
        try {
            const { assignmentId } = req.params;
            if (!req.user) {
                res.status(401).json({ message: 'Authentication required' });
                return;
            }
            const assignment = await SlotAssignment_1.default.findById(assignmentId);
            if (!assignment) {
                res.status(404).json({ message: 'Assignment not found' });
                return;
            }
            // Check permissions - route admin or fleet manager can remove
            if (!['route_admin', 'fleet_manager'].includes(req.user.role)) {
                res.status(403).json({ message: 'Insufficient permissions to remove this assignment' });
                return;
            }
            assignment.status = 'inactive';
            assignment.isActive = false;
            await assignment.save();
            res.json({ message: 'Assignment removed successfully' });
        }
        catch (error) {
            console.error('Remove assignment error:', error);
            res.status(500).json({ message: 'Failed to remove assignment' });
        }
    }
}
exports.SlotController = SlotController;
