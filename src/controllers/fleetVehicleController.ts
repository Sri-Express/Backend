// src/controllers/fleetVehicleController.ts - Fleet Vehicle Management with Approval System (FIXED)
import { Request, Response } from 'express';
import Device from '../models/Device'; // Use Device model instead of Vehicle
import Fleet from '../models/Fleet';
import mongoose from 'mongoose';

// @desc    Get fleet's vehicles
// @route   GET /api/fleet/vehicles
// @access  Private (Fleet Manager)
export const getFleetVehicles = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      approvalStatus = 'all',
      status = 'all',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Find fleet by user email instead of fleetId
    const fleet = await Fleet.findOne({ 
      email: req.user?.email,
      isActive: true 
    });
    
    if (!fleet) {
      res.status(400).json({ message: 'Fleet not found for this user' });
      return;
    }
    
    const fleetId = fleet._id;

    // Build query
    let query: any = { 
      fleetId: fleetId,
      isActive: true 
    };

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

    // Calculate pagination
    const pageNumber = parseInt(page as string);
    const pageSize = parseInt(limit as string);
    const skip = (pageNumber - 1) * pageSize;

    // Build sort object
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    // Get vehicles with pagination
    const vehicles = await Device.find(query)
      .populate('assignedTo.adminId', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(pageSize);

    // Get total count for pagination
    const totalVehicles = await Device.countDocuments(query);

    // Get vehicle statistics for this fleet - Manual calculation since getStats doesn't exist
    const statsData = await Device.aggregate([
      { $match: { fleetId: fleetId, isActive: true } },
      {
        $group: {
          _id: '$approvalStatus',
          count: { $sum: 1 },
          onlineCount: {
            $sum: { $cond: [{ $eq: ['$status', 'online'] }, 1, 0] }
          },
          offlineCount: {
            $sum: { $cond: [{ $eq: ['$status', 'offline'] }, 1, 0] }
          },
          maintenanceCount: {
            $sum: { $cond: [{ $eq: ['$status', 'maintenance'] }, 1, 0] }
          }
        }
      }
    ]);

    const vehicleStats = {
      total: totalVehicles,
      pending: statsData.find((s: any) => s._id === 'pending')?.count || 0,
      approved: statsData.find((s: any) => s._id === 'approved')?.count || 0,
      rejected: statsData.find((s: any) => s._id === 'rejected')?.count || 0,
      online: statsData.reduce((sum: number, item: any) => sum + item.onlineCount, 0),
      offline: statsData.reduce((sum: number, item: any) => sum + item.offlineCount, 0),
      maintenance: statsData.reduce((sum: number, item: any) => sum + item.maintenanceCount, 0)
    };

    res.json({
      vehicles,
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.ceil(totalVehicles / pageSize),
        totalVehicles,
        hasNext: pageNumber < Math.ceil(totalVehicles / pageSize),
        hasPrev: pageNumber > 1
      },
      stats: vehicleStats
    });
  } catch (error) {
    console.error('Get fleet vehicles error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Add new vehicle to fleet
// @route   POST /api/fleet/vehicles
// @access  Private (Fleet Manager)
export const addVehicle = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      vehicleNumber,
      vehicleType,
      firmwareVersion,
      installDate
    } = req.body;

    // Find fleet by user email
    const fleet = await Fleet.findOne({ 
      email: req.user?.email,
      isActive: true 
    });
    
    if (!fleet) {
      res.status(400).json({ message: 'Fleet not found for this user' });
      return;
    }
    
    const fleetId = fleet._id;

    // Validate required fields
    if (!vehicleNumber || !vehicleType || !firmwareVersion || !installDate) {
      res.status(400).json({ message: 'All fields are required' });
      return;
    }

    // Check if fleet is approved
    if (fleet.status !== 'approved') {
      res.status(400).json({ message: 'Only approved fleets can add vehicles' });
      return;
    }

    // Check if vehicle number already exists in the fleet
    const existingVehicle = await Device.findOne({ 
      fleetId,
      vehicleNumber: vehicleNumber.toUpperCase(),
      isActive: true
    });

    if (existingVehicle) {
      res.status(400).json({ message: 'Vehicle number already exists in your fleet' });
      return;
    }

    // Create device (approval status defaults to 'pending')
    const vehicleData = {
      fleetId,
      vehicleNumber: vehicleNumber.toUpperCase(),
      vehicleType,
      firmwareVersion,
      installDate: new Date(installDate),
      assignedTo: {
        type: 'company_admin' as const,
        userId: req.user?._id,
        name: req.user?.name || 'Fleet Manager'
      }
    };

    const vehicle = await Device.create(vehicleData);

    // Populate fleet information
    await vehicle.populate('fleetId', 'companyName registrationNumber');

    res.status(201).json({
      message: 'Vehicle added successfully. Pending admin approval.',
      vehicle
    });
  } catch (error) {
    console.error('Add vehicle error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get vehicle by ID
// @route   GET /api/fleet/vehicles/:id
// @access  Private (Fleet Manager)
export const getVehicleById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Find fleet by user email
    const fleet = await Fleet.findOne({ 
      email: req.user?.email,
      isActive: true 
    });
    
    if (!fleet) {
      res.status(400).json({ message: 'Fleet not found for this user' });
      return;
    }
    
    const fleetId = fleet._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid vehicle ID' });
      return;
    }

    // Find vehicle that belongs to this fleet
    const vehicle = await Device.findOne({
      _id: id,
      fleetId: fleetId,
      isActive: true
    })
    .populate('fleetId', 'companyName registrationNumber contactPerson')
    .populate('assignedTo.adminId', 'name email');

    if (!vehicle) {
      res.status(404).json({ message: 'Vehicle not found or does not belong to your fleet' });
      return;
    }

    res.json(vehicle);
  } catch (error) {
    console.error('Get vehicle by ID error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Update vehicle information
// @route   PUT /api/fleet/vehicles/:id
// @access  Private (Fleet Manager)
export const updateVehicle = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Find fleet by user email
    const fleet = await Fleet.findOne({ 
      email: req.user?.email,
      isActive: true 
    });
    
    if (!fleet) {
      res.status(400).json({ message: 'Fleet not found for this user' });
      return;
    }
    
    const fleetId = fleet._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid vehicle ID' });
      return;
    }

    // Find vehicle that belongs to this fleet
    const vehicle = await Device.findOne({
      _id: id,
      fleetId: fleetId,
      isActive: true
    });

    if (!vehicle) {
      res.status(404).json({ message: 'Vehicle not found or does not belong to your fleet' });
      return;
    }

    // Prevent updating certain fields
    const restrictedFields = ['fleetId', 'approvalStatus', 'approvalDate', 'rejectionDate', 'deviceId'];
    restrictedFields.forEach(field => {
      if (updateData[field]) {
        delete updateData[field];
      }
    });

    // If vehicle number is being changed, check for duplicates
    if (updateData.vehicleNumber && updateData.vehicleNumber !== vehicle.vehicleNumber) {
      const existingVehicle = await Device.findOne({
        fleetId,
        vehicleNumber: updateData.vehicleNumber.toUpperCase(),
        _id: { $ne: id },
        isActive: true
      });

      if (existingVehicle) {
        res.status(400).json({ message: 'Vehicle number already exists in your fleet' });
        return;
      }

      updateData.vehicleNumber = updateData.vehicleNumber.toUpperCase();
    }

    // Update vehicle
    const updatedVehicle = await Device.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('fleetId', 'companyName registrationNumber')
    .populate('assignedTo.adminId', 'name email');

    res.json({
      message: 'Vehicle updated successfully',
      vehicle: updatedVehicle
    });
  } catch (error) {
    console.error('Update vehicle error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Delete vehicle (soft delete)
// @route   DELETE /api/fleet/vehicles/:id
// @access  Private (Fleet Manager)
export const deleteVehicle = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Find fleet by user email
    const fleet = await Fleet.findOne({ 
      email: req.user?.email,
      isActive: true 
    });
    
    if (!fleet) {
      res.status(400).json({ message: 'Fleet not found for this user' });
      return;
    }
    
    const fleetId = fleet._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid vehicle ID' });
      return;
    }

    // Find vehicle that belongs to this fleet
    const vehicle = await Device.findOne({
      _id: id,
      fleetId: fleetId,
      isActive: true
    });

    if (!vehicle) {
      res.status(404).json({ message: 'Vehicle not found or does not belong to your fleet' });
      return;
    }

    // Check if vehicle is currently assigned to routes (if you have route assignments)
    // This would require checking RouteAssignment model if it exists
    
    // Soft delete
    vehicle.isActive = false;
    await vehicle.save();

    // Update fleet's active vehicle count if vehicle was approved
    if (vehicle.approvalStatus === 'approved') {
      await Fleet.findByIdAndUpdate(fleetId, {
        $inc: { activeVehicles: -1 }
      });
    }

    res.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    console.error('Delete vehicle error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get approved vehicles for route assignment
// @route   GET /api/fleet/vehicles/approved
// @access  Private (Fleet Manager)
export const getApprovedVehicles = async (req: Request, res: Response): Promise<void> => {
  try {
    // Find fleet by user email
    const fleet = await Fleet.findOne({ 
      email: req.user?.email,
      isActive: true 
    });
    
    if (!fleet) {
      res.status(400).json({ message: 'Fleet not found for this user' });
      return;
    }
    
    const fleetId = fleet._id;

    // Get only approved vehicles
    const vehicles = await Device.find({
      fleetId: fleetId,
      approvalStatus: 'approved',
      isActive: true
    }).sort({ vehicleNumber: 1 });

    res.json({
      vehicles,
      count: vehicles.length
    });
  } catch (error) {
    console.error('Get approved vehicles error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get vehicle dashboard data
// @route   GET /api/fleet/vehicles/dashboard
// @access  Private (Fleet Manager)
export const getVehicleDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    // Find fleet by user email
    const fleet = await Fleet.findOne({ 
      email: req.user?.email,
      isActive: true 
    });
    
    if (!fleet) {
      res.status(400).json({ message: 'Fleet not found for this user' });
      return;
    }
    
    const fleetId = fleet._id;

    // Get vehicle statistics - Manual calculation
    const statsData = await Device.aggregate([
      { $match: { fleetId: fleetId, isActive: true } },
      {
        $group: {
          _id: '$approvalStatus',
          count: { $sum: 1 },
          onlineCount: {
            $sum: { $cond: [{ $eq: ['$status', 'online'] }, 1, 0] }
          },
          offlineCount: {
            $sum: { $cond: [{ $eq: ['$status', 'offline'] }, 1, 0] }
          },
          maintenanceCount: {
            $sum: { $cond: [{ $eq: ['$status', 'maintenance'] }, 1, 0] }
          }
        }
      }
    ]);

    // Get recent vehicle applications (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentApplications = await Device.find({
      fleetId: fleetId,
      createdAt: { $gte: sevenDaysAgo },
      isActive: true
    }).sort({ createdAt: -1 });

    // Get vehicles with alerts
    const vehiclesWithAlerts = await Device.find({
      fleetId: fleetId,
      'alerts.count': { $gt: 0 },
      isActive: true
    }).sort({ 'alerts.count': -1 });

    // Get low battery vehicles (approved vehicles only)
    const lowBatteryVehicles = await Device.find({
      fleetId: fleetId,
      approvalStatus: 'approved',
      batteryLevel: { $lt: 30 },
      isActive: true
    }).sort({ batteryLevel: 1 });

    // Get offline vehicles (approved vehicles only)
    const offlineVehicles = await Device.find({
      fleetId: fleetId,
      approvalStatus: 'approved',
      status: 'offline',
      isActive: true
    }).sort({ lastSeen: 1 });

    const dashboardData = {
      stats: {
        total: statsData.reduce((sum: number, item: any) => sum + item.count, 0),
        pending: statsData.find((s: any) => s._id === 'pending')?.count || 0,
        approved: statsData.find((s: any) => s._id === 'approved')?.count || 0,
        rejected: statsData.find((s: any) => s._id === 'rejected')?.count || 0,
        online: statsData.reduce((sum: number, item: any) => sum + item.onlineCount, 0),
        offline: statsData.reduce((sum: number, item: any) => sum + item.offlineCount, 0),
        maintenance: statsData.reduce((sum: number, item: any) => sum + item.maintenanceCount, 0)
      },
      recentApplications: recentApplications.slice(0, 5),
      vehiclesWithAlerts: vehiclesWithAlerts.slice(0, 5),
      lowBatteryVehicles: lowBatteryVehicles.slice(0, 5),
      offlineVehicles: offlineVehicles.slice(0, 5)
    };

    res.json(dashboardData);
  } catch (error) {
    console.error('Get vehicle dashboard error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Update vehicle location (for GPS tracking)
// @route   PUT /api/fleet/vehicles/:id/location
// @access  Private (Fleet Manager or System)
export const updateVehicleLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { latitude, longitude, address, batteryLevel, signalStrength } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid vehicle ID' });
      return;
    }

    // Validate coordinates
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      res.status(400).json({ message: 'Valid latitude and longitude are required' });
      return;
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      res.status(400).json({ message: 'Invalid coordinates' });
      return;
    }

    // Find vehicle
    const vehicle = await Device.findById(id);
    if (!vehicle) {
      res.status(404).json({ message: 'Vehicle not found' });
      return;
    }

    // Update using the model method
    await vehicle.updateLocation(latitude, longitude, address || 'Unknown location');

    // Update additional data if provided
    if (typeof batteryLevel === 'number') vehicle.batteryLevel = batteryLevel;
    if (typeof signalStrength === 'number') vehicle.signalStrength = signalStrength;

    // Add battery alert if low
    if (typeof batteryLevel === 'number' && batteryLevel < 20) {
      if (!vehicle.alerts.messages.includes('Low battery warning')) {
        await vehicle.addAlert('Low battery warning');
      }
    }

    await vehicle.save();

    res.json({
      message: 'Vehicle location updated successfully',
      vehicle
    });
  } catch (error) {
    console.error('Update vehicle location error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};