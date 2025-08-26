// src/controllers/vehicleController.ts - Vehicle Management (re-exports from fleetController)
import { Request, Response } from 'express';
import { 
  getFleetVehicles,
  addVehicle,
  updateVehicle,
  deleteVehicle,
  getVehicleDetails
} from './fleetController';
import Device from '../models/Device';

// Re-export fleet vehicle functions with expected names
export { getFleetVehicles } from './fleetController';
export const addFleetVehicle = addVehicle;
export const updateFleetVehicle = updateVehicle;
export const deleteFleetVehicle = deleteVehicle;
export const getVehicleById = getVehicleDetails;

// @desc    Get vehicle statistics
// @route   GET /api/fleet/vehicles/stats
// @access  Private (Fleet Manager)
export const getVehicleStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    
    // Get all vehicles for this fleet manager
    const vehicles = await Device.find({
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
      byType: vehicles.reduce((acc: any, vehicle) => {
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
  } catch (error) {
    console.error('Get vehicle stats error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};