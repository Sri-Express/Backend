// src/controllers/adminDeviceController.ts
import { Request, Response } from 'express';
import Device from '../models/Device';
import User from '../models/User';

// @desc    Get all devices with pagination and filtering
// @route   GET /api/admin/devices
// @access  Private (System Admin)
export const getAllDevices = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status = 'all', 
      vehicleType = 'all',
      assignedTo = 'all',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    let query: any = {};

    // Search functionality
    if (search) {
      query.$or = [
        { deviceId: { $regex: search, $options: 'i' } },
        { vehicleNumber: { $regex: search, $options: 'i' } },
        { 'assignedTo.name': { $regex: search, $options: 'i' } }
      ];
    }

    // Status filter
    if (status !== 'all') {
      query.status = status;
    }

    // Vehicle type filter
    if (vehicleType !== 'all') {
      query.vehicleType = vehicleType;
    }

    // Assigned to filter
    if (assignedTo !== 'all') {
      query['assignedTo.type'] = assignedTo;
    }

    // Only show active devices
    query.isActive = true;

    // Calculate pagination
    const pageNumber = parseInt(page as string);
    const pageSize = parseInt(limit as string);
    const skip = (pageNumber - 1) * pageSize;

    // Build sort object
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    // Get devices with pagination
    const devices = await Device.find(query)
      .sort(sort)
      .skip(skip)
      .limit(pageSize)
      .populate('assignedTo.userId', 'name email');

    // Get total count for pagination
    const totalDevices = await Device.countDocuments(query);

    // Get device statistics
    const stats = await Device.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const deviceStats = {
      totalDevices,
      onlineDevices: await Device.countDocuments({ status: 'online', isActive: true }),
      offlineDevices: await Device.countDocuments({ status: 'offline', isActive: true }),
      maintenanceDevices: await Device.countDocuments({ status: 'maintenance', isActive: true }),
      alertsCount: await Device.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, totalAlerts: { $sum: '$alerts.count' } } }
      ]).then(result => result[0]?.totalAlerts || 0)
    };

    res.json({
      devices,
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.ceil(totalDevices / pageSize),
        totalDevices,
        hasNext: pageNumber < Math.ceil(totalDevices / pageSize),
        hasPrev: pageNumber > 1
      },
      stats: deviceStats
    });
  } catch (error) {
    console.error('Get all devices error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get device by ID
// @route   GET /api/admin/devices/:id
// @access  Private (System Admin)
export const getDeviceById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const device = await Device.findById(id).populate('assignedTo.userId', 'name email');

    if (!device) {
      res.status(404).json({ message: 'Device not found' });
      return;
    }

    res.json(device);
  } catch (error) {
    console.error('Get device by ID error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Create new device
// @route   POST /api/admin/devices
// @access  Private (System Admin)
export const createDevice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      deviceId,
      vehicleNumber,
      vehicleType,
      assignedTo,
      firmwareVersion,
      installDate,
      location
    } = req.body;

    // Validate required fields
    if (!deviceId || !vehicleNumber || !vehicleType || !assignedTo || !firmwareVersion || !installDate) {
      res.status(400).json({ message: 'All required fields must be provided' });
      return;
    }

    // Check if device already exists
    const existingDevice = await Device.findOne({ deviceId });
    if (existingDevice) {
      res.status(400).json({ message: 'Device with this ID already exists' });
      return;
    }

    // Validate assigned user if not system
    if (assignedTo.type !== 'system' && assignedTo.userId) {
      const user = await User.findById(assignedTo.userId);
      if (!user) {
        res.status(400).json({ message: 'Assigned user not found' });
        return;
      }
      assignedTo.name = user.name;
    }

    // Create device
    const device = await Device.create({
      deviceId,
      vehicleNumber,
      vehicleType,
      assignedTo,
      firmwareVersion,
      installDate,
      location: location || {
        latitude: 0,
        longitude: 0,
        address: 'Not set',
        lastUpdated: new Date()
      },
      status: 'offline',
      batteryLevel: 100,
      signalStrength: 0,
      lastSeen: new Date(),
      alerts: {
        count: 0,
        messages: []
      }
    });

    res.status(201).json({
      message: 'Device created successfully',
      device
    });
  } catch (error) {
    console.error('Create device error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Update device
// @route   PUT /api/admin/devices/:id
// @access  Private (System Admin)
export const updateDevice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { 
      deviceId,
      vehicleNumber,
      vehicleType,
      assignedTo,
      firmwareVersion,
      installDate,
      location,
      status,
      isActive
    } = req.body;

    // Find device
    const device = await Device.findById(id);
    if (!device) {
      res.status(404).json({ message: 'Device not found' });
      return;
    }

    // Check if deviceId is already taken by another device
    if (deviceId && deviceId !== device.deviceId) {
      const existingDevice = await Device.findOne({ deviceId });
      if (existingDevice) {
        res.status(400).json({ message: 'Device ID already in use by another device' });
        return;
      }
    }

    // Validate assigned user if not system
    if (assignedTo && assignedTo.type !== 'system' && assignedTo.userId) {
      const user = await User.findById(assignedTo.userId);
      if (!user) {
        res.status(400).json({ message: 'Assigned user not found' });
        return;
      }
      assignedTo.name = user.name;
    }

    // Update fields
    if (deviceId) device.deviceId = deviceId;
    if (vehicleNumber) device.vehicleNumber = vehicleNumber;
    if (vehicleType) device.vehicleType = vehicleType;
    if (assignedTo) device.assignedTo = assignedTo;
    if (firmwareVersion) device.firmwareVersion = firmwareVersion;
    if (installDate) device.installDate = installDate;
    if (location) device.location = { ...device.location, ...location };
    if (status) device.status = status;
    if (isActive !== undefined) device.isActive = isActive;

    // Save device
    await device.save();

    // Return updated device
    const updatedDevice = await Device.findById(id).populate('assignedTo.userId', 'name email');

    res.json({
      message: 'Device updated successfully',
      device: updatedDevice
    });
  } catch (error) {
    console.error('Update device error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Delete device
// @route   DELETE /api/admin/devices/:id
// @access  Private (System Admin)
export const deleteDevice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Find and delete device
    const device = await Device.findById(id);
    if (!device) {
      res.status(404).json({ message: 'Device not found' });
      return;
    }

    // Soft delete by setting isActive to false
    device.isActive = false;
    await device.save();

    res.json({ message: 'Device deleted successfully' });
  } catch (error) {
    console.error('Delete device error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Update device location
// @route   PUT /api/admin/devices/:id/location
// @access  Private (System Admin)
export const updateDeviceLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { latitude, longitude, address } = req.body;

    if (!latitude || !longitude) {
      res.status(400).json({ message: 'Latitude and longitude are required' });
      return;
    }

    const device = await Device.findById(id);
    if (!device) {
      res.status(404).json({ message: 'Device not found' });
      return;
    }

    // Update location using the model method
    await device.updateLocation(latitude, longitude, address || 'Unknown location');

    res.json({
      message: 'Device location updated successfully',
      device
    });
  } catch (error) {
    console.error('Update device location error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Add alert to device
// @route   POST /api/admin/devices/:id/alerts
// @access  Private (System Admin)
export const addDeviceAlert = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message) {
      res.status(400).json({ message: 'Alert message is required' });
      return;
    }

    const device = await Device.findById(id);
    if (!device) {
      res.status(404).json({ message: 'Device not found' });
      return;
    }

    // Add alert using the model method
    await device.addAlert(message);

    res.json({
      message: 'Alert added successfully',
      device
    });
  } catch (error) {
    console.error('Add device alert error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Clear device alerts
// @route   DELETE /api/admin/devices/:id/alerts
// @access  Private (System Admin)
export const clearDeviceAlerts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const device = await Device.findById(id);
    if (!device) {
      res.status(404).json({ message: 'Device not found' });
      return;
    }

    // Clear alerts using the model method
    await device.clearAlerts();

    res.json({
      message: 'Alerts cleared successfully',
      device
    });
  } catch (error) {
    console.error('Clear device alerts error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get device statistics
// @route   GET /api/admin/devices/stats
// @access  Private (System Admin)
export const getDeviceStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalDevices = await Device.countDocuments({ isActive: true });
    const onlineDevices = await Device.countDocuments({ status: 'online', isActive: true });
    const offlineDevices = await Device.countDocuments({ status: 'offline', isActive: true });
    const maintenanceDevices = await Device.countDocuments({ status: 'maintenance', isActive: true });

    // Get total alerts
    const alertsResult = await Device.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, totalAlerts: { $sum: '$alerts.count' } } }
    ]);
    const alertsCount = alertsResult[0]?.totalAlerts || 0;

    // Get devices by type
    const devicesByType = await Device.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$vehicleType',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get devices by assignment
    const devicesByAssignment = await Device.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$assignedTo.type',
          count: { $sum: 1 }
        }
      }
    ]);

    const stats = {
      totalDevices,
      onlineDevices,
      offlineDevices,
      maintenanceDevices,
      alertsCount,
      byType: devicesByType.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      byAssignment: devicesByAssignment.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    };

    res.json(stats);
  } catch (error) {
    console.error('Get device stats error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};