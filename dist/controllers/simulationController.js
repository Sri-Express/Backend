"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSimulationAnalytics = exports.controlVehicle = exports.getSimulationVehicles = exports.resetSimulation = exports.setSimulationSpeed = exports.stopSimulation = exports.startSimulation = exports.getSimulationStatus = void 0;
const gpsSimulation_1 = __importDefault(require("../services/gpsSimulation"));
// @desc Get simulation status @route GET /api/admin/simulation/status @access Private (Admin)
const getSimulationStatus = async (req, res) => {
    try {
        const status = gpsSimulation_1.default.getStatus();
        const vehicleDetails = gpsSimulation_1.default.getVehicleDetails();
        res.json({ success: true, simulation: status, vehicles: vehicleDetails.map(v => ({ vehicleId: v.vehicleId, vehicleNumber: v.vehicleNumber, route: v.route.name, type: v.type, status: v.status, currentPassengers: v.currentPassengers, capacity: v.capacity, operator: v.operator })), message: status.isRunning ? 'GPS simulation is running' : 'GPS simulation is stopped' });
    }
    catch (error) {
        console.error('Get simulation status error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.getSimulationStatus = getSimulationStatus;
// @desc Start GPS simulation @route POST /api/admin/simulation/start @access Private (Admin)
const startSimulation = async (req, res) => {
    try {
        await gpsSimulation_1.default.startSimulation();
        const status = gpsSimulation_1.default.getStatus();
        res.json({ success: true, simulation: status, message: 'GPS simulation started successfully' });
    }
    catch (error) {
        console.error('Start simulation error:', error);
        res.status(500).json({ success: false, message: 'Failed to start simulation', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.startSimulation = startSimulation;
// @desc Stop GPS simulation @route POST /api/admin/simulation/stop @access Private (Admin)
const stopSimulation = async (req, res) => {
    try {
        gpsSimulation_1.default.stopSimulation();
        const status = gpsSimulation_1.default.getStatus();
        res.json({ success: true, simulation: status, message: 'GPS simulation stopped successfully' });
    }
    catch (error) {
        console.error('Stop simulation error:', error);
        res.status(500).json({ success: false, message: 'Failed to stop simulation', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.stopSimulation = stopSimulation;
// @desc Set simulation speed @route POST /api/admin/simulation/speed @access Private (Admin)
const setSimulationSpeed = async (req, res) => {
    try {
        const { speed } = req.body;
        if (!speed || typeof speed !== 'number') {
            res.status(400).json({ success: false, message: 'Valid speed multiplier is required (0.1 - 10)' });
            return;
        }
        if (speed < 0.1 || speed > 10) {
            res.status(400).json({ success: false, message: 'Speed multiplier must be between 0.1 and 10' });
            return;
        }
        gpsSimulation_1.default.setSpeed(speed);
        const status = gpsSimulation_1.default.getStatus();
        res.json({ success: true, simulation: status, message: `Simulation speed set to ${speed}x` });
    }
    catch (error) {
        console.error('Set simulation speed error:', error);
        res.status(500).json({ success: false, message: 'Failed to set simulation speed', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.setSimulationSpeed = setSimulationSpeed;
// @desc Reset simulation (stop and clear data) @route POST /api/admin/simulation/reset @access Private (Admin)
const resetSimulation = async (req, res) => {
    try {
        gpsSimulation_1.default.stopSimulation();
        const LocationTracking = (await Promise.resolve().then(() => __importStar(require('../models/LocationTracking')))).default;
        await LocationTracking.updateMany({}, { isActive: false });
        const status = gpsSimulation_1.default.getStatus();
        res.json({ success: true, simulation: status, message: 'Simulation reset successfully - all tracking data cleared' });
    }
    catch (error) {
        console.error('Reset simulation error:', error);
        res.status(500).json({ success: false, message: 'Failed to reset simulation', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.resetSimulation = resetSimulation;
// @desc Get detailed vehicle information @route GET /api/admin/simulation/vehicles @access Private (Admin)
const getSimulationVehicles = async (req, res) => {
    try {
        const vehicleDetails = gpsSimulation_1.default.getVehicleDetails();
        const detailedInfo = vehicleDetails.map(vehicle => ({ ...vehicle, route: { ...vehicle.route, coordinates: vehicle.route.coordinates.length }, performance: { efficiency: Math.random() * 20 + 80, fuelConsumption: Math.random() * 5 + 15, maintenanceScore: Math.random() * 20 + 80 }, realTimeData: { gpsAccuracy: 3 + Math.random() * 7, signalStrength: Math.floor(Math.random() * 2) + 4, batteryLevel: 70 + Math.random() * 30 } }));
        const routeKeysSet = new Set(detailedInfo.map(v => v.routeKey));
        const uniqueRouteKeys = Array.from(routeKeysSet);
        res.json({ success: true, vehicles: detailedInfo, totalVehicles: detailedInfo.length, activeRoutes: uniqueRouteKeys.length, message: 'Vehicle details retrieved successfully' });
    }
    catch (error) {
        console.error('Get simulation vehicles error:', error);
        res.status(500).json({ success: false, message: 'Failed to get vehicle details', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.getSimulationVehicles = getSimulationVehicles;
// @desc Control individual vehicle @route POST /api/admin/simulation/vehicle/:vehicleId @access Private (Admin)
const controlVehicle = async (req, res) => {
    try {
        const { vehicleId } = req.params;
        const { action, value } = req.body;
        const vehicleDetails = gpsSimulation_1.default.getVehicleDetails();
        const vehicle = vehicleDetails.find(v => v.vehicleId === vehicleId);
        if (!vehicle) {
            res.status(404).json({ success: false, message: 'Vehicle not found' });
            return;
        }
        let message = '';
        switch (action) {
            case 'pause':
                vehicle.status = 'at_stop';
                message = `Vehicle ${vehicleId} paused`;
                break;
            case 'resume':
                vehicle.status = 'on_route';
                message = `Vehicle ${vehicleId} resumed`;
                break;
            case 'speed':
                if (value && typeof value === 'number' && value > 0 && value <= 120) {
                    vehicle.speed = value;
                    message = `Vehicle ${vehicleId} speed set to ${value} km/h`;
                }
                else {
                    res.status(400).json({ success: false, message: 'Invalid speed value (1-120 km/h)' });
                    return;
                }
                break;
            case 'passengers':
                if (value && typeof value === 'number' && value >= 0 && value <= vehicle.capacity) {
                    vehicle.currentPassengers = value;
                    message = `Vehicle ${vehicleId} passenger count set to ${value}`;
                }
                else {
                    res.status(400).json({ success: false, message: `Invalid passenger count (0-${vehicle.capacity})` });
                    return;
                }
                break;
            case 'delay':
                if (value && typeof value === 'number' && value >= 0) {
                    vehicle.delays = { currentDelay: value, reason: 'Manual simulation control', reportedAt: new Date() };
                    vehicle.status = value > 0 ? 'delayed' : 'on_route';
                    message = `Vehicle ${vehicleId} delay set to ${value} minutes`;
                }
                else {
                    res.status(400).json({ success: false, message: 'Invalid delay value (must be >= 0)' });
                    return;
                }
                break;
            case 'breakdown':
                vehicle.status = 'breakdown';
                vehicle.delays = { currentDelay: 60, reason: 'Simulated vehicle breakdown', reportedAt: new Date() };
                message = `Vehicle ${vehicleId} set to breakdown status`;
                break;
            default:
                res.status(400).json({ success: false, message: 'Invalid action. Use: pause, resume, speed, passengers, delay, breakdown' });
                return;
        }
        res.json({ success: true, vehicle: { vehicleId: vehicle.vehicleId, action, value, status: vehicle.status }, message });
    }
    catch (error) {
        console.error('Control vehicle error:', error);
        res.status(500).json({ success: false, message: 'Failed to control vehicle', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.controlVehicle = controlVehicle;
// @desc Get simulation analytics @route GET /api/admin/simulation/analytics @access Private (Admin)
const getSimulationAnalytics = async (req, res) => {
    try {
        const LocationTracking = (await Promise.resolve().then(() => __importStar(require('../models/LocationTracking')))).default;
        const vehicleDetails = gpsSimulation_1.default.getVehicleDetails();
        const status = gpsSimulation_1.default.getStatus();
        const totalDistance = vehicleDetails.reduce((sum, v) => sum + (v.route.distance * (v.currentIndex + v.progress) / v.route.coordinates.length), 0);
        const totalPassengers = vehicleDetails.reduce((sum, v) => sum + v.currentPassengers, 0);
        const totalCapacity = vehicleDetails.reduce((sum, v) => sum + v.capacity, 0);
        const avgSpeed = vehicleDetails.reduce((sum, v) => sum + v.speed, 0) / vehicleDetails.length;
        const delayedVehicles = vehicleDetails.filter(v => v.delays && v.delays.currentDelay > 0);
        const avgDelay = delayedVehicles.length > 0 ? delayedVehicles.reduce((sum, v) => sum + v.delays.currentDelay, 0) / delayedVehicles.length : 0;
        const routePerformance = {};
        vehicleDetails.forEach(v => { if (!routePerformance[v.routeKey]) {
            const routeVehicles = vehicleDetails.filter(rv => rv.routeKey === v.routeKey);
            routePerformance[v.routeKey] = { vehicleCount: routeVehicles.length, avgLoad: routeVehicles.reduce((sum, rv) => sum + (rv.currentPassengers / rv.capacity), 0) / routeVehicles.length * 100, onTimePerformance: (routeVehicles.filter(rv => !rv.delays || rv.delays.currentDelay <= 5).length / routeVehicles.length) * 100, avgSpeed: routeVehicles.reduce((sum, rv) => sum + rv.speed, 0) / routeVehicles.length };
        } });
        const historicalData = await LocationTracking.aggregate([{ $match: { isActive: true, timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }, { $group: { _id: { hour: { $hour: '$timestamp' } }, avgSpeed: { $avg: '$location.speed' }, avgLoad: { $avg: '$passengerLoad.loadPercentage' }, vehicleCount: { $addToSet: '$vehicleId' } } }, { $project: { hour: '$_id.hour', avgSpeed: { $round: ['$avgSpeed', 1] }, avgLoad: { $round: ['$avgLoad', 1] }, vehicleCount: { $size: '$vehicleCount' } } }, { $sort: { hour: 1 } }]);
        res.json({ success: true, analytics: { overview: { totalVehicles: vehicleDetails.length, totalDistance: Math.round(totalDistance), totalPassengers, totalCapacity, occupancyRate: Math.round((totalPassengers / totalCapacity) * 100), avgSpeed: Math.round(avgSpeed), delayedVehicles: delayedVehicles.length, avgDelay: Math.round(avgDelay) }, routePerformance, historicalData, realTimeMetrics: { dataPoints: historicalData.length, lastUpdate: new Date(), simulationUptime: status.isRunning ? 'Running' : 'Stopped', speedMultiplier: status.speedMultiplier } }, message: 'Simulation analytics retrieved successfully' });
    }
    catch (error) {
        console.error('Get simulation analytics error:', error);
        res.status(500).json({ success: false, message: 'Failed to get simulation analytics', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.getSimulationAnalytics = getSimulationAnalytics;
