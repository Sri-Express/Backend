// src/controllers/simulationController.ts - FIXED GPS SIMULATION CONTROL ENDPOINTS
import { Request, Response } from 'express'; import AdvancedGPSSimulation from '../services/gpsSimulation';

// @desc    Get simulation status
// @route   GET /api/admin/simulation/status
// @access  Private (Admin)
export const getSimulationStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const status = AdvancedGPSSimulation.getStatus(); const vehicleDetails = AdvancedGPSSimulation.getVehicleDetails(); res.json({ success: true, simulation: status, vehicles: vehicleDetails.map(v => ({ vehicleId: v.vehicleId, vehicleNumber: v.vehicleNumber, route: v.route.name, type: v.type, status: v.status, currentPassengers: v.currentPassengers, capacity: v.capacity, operator: v.operator })), message: status.isRunning ? 'GPS simulation is running' : 'GPS simulation is stopped' });
  } catch (error) {
    console.error('Get simulation status error:', error); res.status(500).json({ success: false, message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// @desc    Start GPS simulation
// @route   POST /api/admin/simulation/start
// @access  Private (Admin)
export const startSimulation = async (req: Request, res: Response): Promise<void> => {
  try {
    await AdvancedGPSSimulation.startSimulation(); const status = AdvancedGPSSimulation.getStatus(); res.json({ success: true, simulation: status, message: 'GPS simulation started successfully' });
  } catch (error) {
    console.error('Start simulation error:', error); res.status(500).json({ success: false, message: 'Failed to start simulation', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// @desc    Stop GPS simulation
// @route   POST /api/admin/simulation/stop
// @access  Private (Admin)
export const stopSimulation = async (req: Request, res: Response): Promise<void> => {
  try {
    AdvancedGPSSimulation.stopSimulation(); const status = AdvancedGPSSimulation.getStatus(); res.json({ success: true, simulation: status, message: 'GPS simulation stopped successfully' });
  } catch (error) {
    console.error('Stop simulation error:', error); res.status(500).json({ success: false, message: 'Failed to stop simulation', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// @desc    Set simulation speed
// @route   POST /api/admin/simulation/speed
// @access  Private (Admin)
export const setSimulationSpeed = async (req: Request, res: Response): Promise<void> => {
  try {
    const { speed } = req.body; if (!speed || typeof speed !== 'number') { res.status(400).json({ success: false, message: 'Valid speed multiplier is required (0.1 - 10)' }); return; } if (speed < 0.1 || speed > 10) { res.status(400).json({ success: false, message: 'Speed multiplier must be between 0.1 and 10' }); return; }
    
    AdvancedGPSSimulation.setSpeed(speed); const status = AdvancedGPSSimulation.getStatus(); res.json({ success: true, simulation: status, message: `Simulation speed set to ${speed}x` });
  } catch (error) {
    console.error('Set simulation speed error:', error); res.status(500).json({ success: false, message: 'Failed to set simulation speed', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// @desc    Reset simulation (stop and clear data)
// @route   POST /api/admin/simulation/reset
// @access  Private (Admin)
export const resetSimulation = async (req: Request, res: Response): Promise<void> => {
  try {
    AdvancedGPSSimulation.stopSimulation(); 
    // Clear existing location tracking data
    const LocationTracking = (await import('../models/LocationTracking')).default; await LocationTracking.updateMany({}, { isActive: false });
    
    const status = AdvancedGPSSimulation.getStatus(); res.json({ success: true, simulation: status, message: 'Simulation reset successfully - all tracking data cleared' });
  } catch (error) {
    console.error('Reset simulation error:', error); res.status(500).json({ success: false, message: 'Failed to reset simulation', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// @desc    Get detailed vehicle information
// @route   GET /api/admin/simulation/vehicles
// @access  Private (Admin)
export const getSimulationVehicles = async (req: Request, res: Response): Promise<void> => {
  try {
    const vehicleDetails = AdvancedGPSSimulation.getVehicleDetails(); const detailedInfo = vehicleDetails.map(vehicle => ({ ...vehicle, route: { ...vehicle.route, coordinates: vehicle.route.coordinates.length }, performance: { efficiency: Math.random() * 20 + 80, fuelConsumption: Math.random() * 5 + 15, maintenanceScore: Math.random() * 20 + 80 }, realTimeData: { gpsAccuracy: 3 + Math.random() * 7, signalStrength: Math.floor(Math.random() * 2) + 4, batteryLevel: 70 + Math.random() * 30 } }));
    
    // *** FIXED: Convert Set to Array first to avoid downlevelIteration issue ***
    const routeKeysSet = new Set(detailedInfo.map(v => v.routeKey)); const uniqueRouteKeys = Array.from(routeKeysSet);
    
    res.json({ success: true, vehicles: detailedInfo, totalVehicles: detailedInfo.length, activeRoutes: uniqueRouteKeys.length, message: 'Vehicle details retrieved successfully' });
  } catch (error) {
    console.error('Get simulation vehicles error:', error); res.status(500).json({ success: false, message: 'Failed to get vehicle details', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// @desc    Control individual vehicle
// @route   POST /api/admin/simulation/vehicle/:vehicleId
// @access  Private (Admin)
export const controlVehicle = async (req: Request, res: Response): Promise<void> => {
  try {
    const { vehicleId } = req.params; const { action, value } = req.body; // action: 'pause', 'resume', 'speed', 'passengers', 'delay', 'breakdown'
    
    const vehicleDetails = AdvancedGPSSimulation.getVehicleDetails(); const vehicle = vehicleDetails.find(v => v.vehicleId === vehicleId); if (!vehicle) { res.status(404).json({ success: false, message: 'Vehicle not found' }); return; }
    
    let message = ''; switch (action) {
      case 'pause': vehicle.status = 'at_stop'; message = `Vehicle ${vehicleId} paused`; break;
      case 'resume': vehicle.status = 'on_route'; message = `Vehicle ${vehicleId} resumed`; break;
      case 'speed': if (value && typeof value === 'number' && value > 0 && value <= 120) { vehicle.speed = value; message = `Vehicle ${vehicleId} speed set to ${value} km/h`; } else { res.status(400).json({ success: false, message: 'Invalid speed value (1-120 km/h)' }); return; } break;
      case 'passengers': if (value && typeof value === 'number' && value >= 0 && value <= vehicle.capacity) { vehicle.currentPassengers = value; message = `Vehicle ${vehicleId} passenger count set to ${value}`; } else { res.status(400).json({ success: false, message: `Invalid passenger count (0-${vehicle.capacity})` }); return; } break;
      case 'delay': if (value && typeof value === 'number' && value >= 0) { vehicle.delays = { currentDelay: value, reason: 'Manual simulation control', reportedAt: new Date() }; vehicle.status = value > 0 ? 'delayed' : 'on_route'; message = `Vehicle ${vehicleId} delay set to ${value} minutes`; } else { res.status(400).json({ success: false, message: 'Invalid delay value (must be >= 0)' }); return; } break;
      case 'breakdown': vehicle.status = 'breakdown'; vehicle.delays = { currentDelay: 60, reason: 'Simulated vehicle breakdown', reportedAt: new Date() }; message = `Vehicle ${vehicleId} set to breakdown status`; break;
      default: res.status(400).json({ success: false, message: 'Invalid action. Use: pause, resume, speed, passengers, delay, breakdown' }); return;
    }
    
    res.json({ success: true, vehicle: { vehicleId: vehicle.vehicleId, action, value, status: vehicle.status }, message });
  } catch (error) {
    console.error('Control vehicle error:', error); res.status(500).json({ success: false, message: 'Failed to control vehicle', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// @desc    Get simulation analytics
// @route   GET /api/admin/simulation/analytics
// @access  Private (Admin)
export const getSimulationAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const LocationTracking = (await import('../models/LocationTracking')).default; const vehicleDetails = AdvancedGPSSimulation.getVehicleDetails(); const status = AdvancedGPSSimulation.getStatus();
    
    // Calculate analytics
    const totalDistance = vehicleDetails.reduce((sum, v) => sum + (v.route.distance * (v.currentIndex + v.progress) / v.route.coordinates.length), 0); const totalPassengers = vehicleDetails.reduce((sum, v) => sum + v.currentPassengers, 0); const totalCapacity = vehicleDetails.reduce((sum, v) => sum + v.capacity, 0); const avgSpeed = vehicleDetails.reduce((sum, v) => sum + v.speed, 0) / vehicleDetails.length; const delayedVehicles = vehicleDetails.filter(v => v.delays && v.delays.currentDelay > 0); const avgDelay = delayedVehicles.length > 0 ? delayedVehicles.reduce((sum, v) => sum + v.delays!.currentDelay, 0) / delayedVehicles.length : 0;
    
    // Route performance
    const routePerformance: Record<string, any> = {}; vehicleDetails.forEach(v => { if (!routePerformance[v.routeKey]) { const routeVehicles = vehicleDetails.filter(rv => rv.routeKey === v.routeKey); routePerformance[v.routeKey] = { vehicleCount: routeVehicles.length, avgLoad: routeVehicles.reduce((sum, rv) => sum + (rv.currentPassengers / rv.capacity), 0) / routeVehicles.length * 100, onTimePerformance: (routeVehicles.filter(rv => !rv.delays || rv.delays.currentDelay <= 5).length / routeVehicles.length) * 100, avgSpeed: routeVehicles.reduce((sum, rv) => sum + rv.speed, 0) / routeVehicles.length }; } });
    
    // Get historical data from database
    const historicalData = await LocationTracking.aggregate([
      { $match: { isActive: true, timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } },
      { $group: { _id: { hour: { $hour: '$timestamp' } }, avgSpeed: { $avg: '$location.speed' }, avgLoad: { $avg: '$passengerLoad.loadPercentage' }, vehicleCount: { $addToSet: '$vehicleId' } } },
      { $project: { hour: '$_id.hour', avgSpeed: { $round: ['$avgSpeed', 1] }, avgLoad: { $round: ['$avgLoad', 1] }, vehicleCount: { $size: '$vehicleCount' } } },
      { $sort: { hour: 1 } }
    ]);
    
    res.json({ success: true, analytics: { overview: { totalVehicles: vehicleDetails.length, totalDistance: Math.round(totalDistance), totalPassengers, totalCapacity, occupancyRate: Math.round((totalPassengers / totalCapacity) * 100), avgSpeed: Math.round(avgSpeed), delayedVehicles: delayedVehicles.length, avgDelay: Math.round(avgDelay) }, routePerformance, historicalData, realTimeMetrics: { dataPoints: historicalData.length, lastUpdate: new Date(), simulationUptime: status.isRunning ? 'Running' : 'Stopped', speedMultiplier: status.speedMultiplier } }, message: 'Simulation analytics retrieved successfully' });
  } catch (error) {
    console.error('Get simulation analytics error:', error); res.status(500).json({ success: false, message: 'Failed to get simulation analytics', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};