"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVehicleStats = exports.getVehicleById = exports.deleteFleetVehicle = exports.updateFleetVehicle = exports.addFleetVehicle = exports.getFleetVehicles = void 0;
const fleetController_1 = require("./fleetController");
const Device_1 = __importDefault(require("../models/Device"));
// Re-export fleet vehicle functions with expected names
var fleetController_2 = require("./fleetController");
Object.defineProperty(exports, "getFleetVehicles", { enumerable: true, get: function () { return fleetController_2.getFleetVehicles; } });
exports.addFleetVehicle = fleetController_1.addVehicle;
exports.updateFleetVehicle = fleetController_1.updateVehicle;
exports.deleteFleetVehicle = fleetController_1.deleteVehicle;
exports.getVehicleById = fleetController_1.getVehicleDetails;
// @desc    Get vehicle statistics
// @route   GET /api/fleet/vehicles/stats
// @access  Private (Fleet Manager)
const getVehicleStats = async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        // Get all vehicles for this fleet manager
        const vehicles = await Device_1.default.find({
            'assignedTo.userId': userId,
            isActive: true
        });
        // Calculate comprehensive statistics
        const stats = {
            total: vehicles.length,
            byStatus: {
                online: vehicles.filter(v => v.status === 'online').length,
                offline: vehicles.filter(v => v.status === 'offline').length,
                maintenance: vehicles.filter(v => v.status === 'maintenance').length
            },
            byType: vehicles.reduce((acc, vehicle) => {
                const type = vehicle.vehicleType;
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            }, {}),
            performance: {
                avgBatteryLevel: vehicles.length > 0
                    ? Math.round(vehicles.reduce((sum, v) => sum + v.batteryLevel, 0) / vehicles.length)
                    : 0,
                avgSignalStrength: vehicles.length > 0
                    ? Math.round(vehicles.reduce((sum, v) => sum + v.signalStrength, 0) / vehicles.length)
                    : 0,
                lowBatteryVehicles: vehicles.filter(v => v.batteryLevel < 20).length,
                poorSignalVehicles: vehicles.filter(v => v.signalStrength < 2).length
            },
            alerts: {
                totalAlerts: vehicles.reduce((sum, v) => sum + v.alerts.count, 0),
                vehiclesWithAlerts: vehicles.filter(v => v.alerts.count > 0).length
            },
            recent: {
                addedThisWeek: vehicles.filter(v => {
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return new Date(v.createdAt) > weekAgo;
                }).length,
                lastSeenToday: vehicles.filter(v => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return new Date(v.lastSeen || v.createdAt) > today;
                }).length
            }
        };
        res.json({ stats });
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
