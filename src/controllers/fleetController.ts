// src/controllers/fleetController.ts - Fleet Operator Portal (UPDATED WITH MISSING FUNCTIONS)
import { Request, Response } from 'express';
import Fleet from '../models/Fleet';
import Route from '../models/Route';
import Device from '../models/Device';
import mongoose from 'mongoose';

// @desc    Get fleet dashboard data for logged-in fleet manager
// @route   GET /api/fleet/dashboard
// @access  Private (Fleet Manager)
export const getFleetDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    
    // Find fleet by email (assuming fleet manager email matches fleet email)
    const fleet = await Fleet.findOne({ 
      email: req.user?.email,
      isActive: true 
    });

    // Get fleet vehicles
    const vehicles = await Device.find({
      'assignedTo.userId': userId,
      isActive: true
    }).limit(10);

    // Get fleet routes
    const routes = await Route.find({ 
      'operatorInfo.fleetId': fleet?._id,
      isActive: true 
    }).limit(5);

    // Calculate real-time statistics
    const fleetStats = fleet ? {
      fleetStatus: fleet.status,
      complianceScore: fleet.complianceScore || 0,
      totalVehicles: vehicles.length, // Use actual count from vehicles
      activeVehicles: vehicles.filter(v => v.status === 'online').length,
      operatingRoutes: routes.length,
      totalRoutes: routes.length,
      onlineVehicles: vehicles.filter(v => v.status === 'online').length,
      maintenanceVehicles: vehicles.filter(v => v.status === 'maintenance').length
    } : {
      fleetStatus: 'pending',
      complianceScore: 0,
      totalVehicles: vehicles.length,
      activeVehicles: vehicles.filter(v => v.status === 'online').length,
      operatingRoutes: routes.length,
      totalRoutes: routes.length,
      onlineVehicles: vehicles.filter(v => v.status === 'online').length,
      maintenanceVehicles: vehicles.filter(v => v.status === 'maintenance').length
    };

    // Update fleet vehicle count if it exists and is different
    if (fleet && fleet.totalVehicles !== vehicles.length) {
      fleet.totalVehicles = vehicles.length;
      fleet.activeVehicles = vehicles.filter(v => v.status === 'online').length;
      await fleet.save();
    }

    res.json({
      fleet: fleet ? {
        _id: fleet._id,
        companyName: fleet.companyName || 'Fleet Company',
        status: fleet.status,
        complianceScore: fleet.complianceScore || 0,
        totalVehicles: vehicles.length,
        activeVehicles: vehicles.filter(v => v.status === 'online').length
      } : {
        _id: 'no-fleet',
        companyName: `${req.user?.name || 'Fleet Manager'}'s Fleet`,
        status: 'pending',
        complianceScore: 0,
        totalVehicles: vehicles.length,
        activeVehicles: vehicles.filter(v => v.status === 'online').length
      },
      stats: fleetStats,
      routes: routes.slice(0, 3), // Latest 3 routes
      vehicles: vehicles.slice(0, 5), // Latest 5 vehicles
      alerts: [] // Real alerts can be implemented later
    });
  } catch (error) {
    console.error('Fleet dashboard error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// @desc    Get fleet profile
// @route   GET /api/fleet/profile
// @access  Private (Fleet Manager)
export const getFleetProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🔍 Fleet profile - User:', req.user?.email, 'Role:', req.user?.role);
    
    const fleet = await Fleet.findOne({ 
      email: req.user?.email,
      isActive: true 
    });

    if (!fleet) {
      console.log('❌ Fleet profile - No fleet found for user:', req.user?.email);
      
      res.status(404).json({ 
        message: 'No fleet profile found. Please contact admin to set up your fleet profile.',
        fleet: null
      });
      return;
    }

    console.log('✅ Fleet profile - Found fleet:', fleet.companyName);
    res.json({ fleet });
  } catch (error) {
    console.error('Get fleet profile error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Update fleet profile
// @route   PUT /api/fleet/profile
// @access  Private (Fleet Manager)
export const updateFleetProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🔍 Fleet profile update - User:', req.user?.email);
    const { 
      companyName,
      registrationNumber,
      contactPerson, 
      phone, 
      address, 
      operatingRoutes,
      operationalInfo 
    } = req.body;

    let fleet = await Fleet.findOne({ 
      email: req.user?.email,
      isActive: true 
    });

    if (!fleet) {
      console.log('🔍 Fleet profile update - No fleet found, creating new one');
      
      // Create new fleet if it doesn't exist
      if (!companyName || !registrationNumber || !contactPerson) {
        res.status(400).json({ 
          message: 'Company name, registration number, and contact person are required for new fleet registration' 
        });
        return;
      }

      // Check if registration number already exists
      const existingFleet = await Fleet.findOne({ 
        registrationNumber: registrationNumber.trim(),
        isActive: true 
      });
      
      if (existingFleet) {
        res.status(400).json({ 
          message: 'Registration number already exists' 
        });
        return;
      }

      // Create new fleet
      const fleetData = {
        companyName: companyName.trim(),
        registrationNumber: registrationNumber.trim(),
        contactPerson: contactPerson.trim(),
        email: req.user?.email || '',
        phone: phone || '',
        address: address || '',
        operatingRoutes: operatingRoutes || [],
        operationalInfo: operationalInfo || {},
        status: 'pending', // New fleets start as pending
        complianceScore: 0,
        totalVehicles: 0,
        activeVehicles: 0,
        applicationDate: new Date(),
        documents: {
          businessLicense: false,
          insuranceCertificate: false,
          vehicleRegistrations: false,
          driverLicenses: false
        },
        isActive: true
      };

      fleet = await Fleet.create(fleetData);
      console.log('✅ Fleet profile update - Created new fleet:', fleet.companyName);

      res.status(201).json({
        message: 'Fleet profile created successfully',
        fleet
      });
      return;
    }

    // Update existing fleet - only allow certain fields to be updated
    console.log('🔍 Fleet profile update - Updating existing fleet:', fleet.companyName);

    if (companyName) fleet.companyName = companyName.trim();
    if (contactPerson) fleet.contactPerson = contactPerson.trim();
    if (phone) fleet.phone = phone;
    if (address) fleet.address = address;
    if (operatingRoutes) fleet.operatingRoutes = operatingRoutes;
    if (operationalInfo) {
      fleet.operationalInfo = { ...fleet.operationalInfo, ...operationalInfo };
    }

    // Check if registration number is being changed and already exists
    if (registrationNumber && registrationNumber.trim() !== fleet.registrationNumber) {
      const existingFleet = await Fleet.findOne({ 
        registrationNumber: registrationNumber.trim(),
        _id: { $ne: fleet._id },
        isActive: true 
      });
      
      if (existingFleet) {
        res.status(400).json({ 
          message: 'Registration number already in use by another fleet' 
        });
        return;
      }
      
      fleet.registrationNumber = registrationNumber.trim();
    }

    await fleet.save();
    console.log('✅ Fleet profile update - Updated successfully');

    res.json({
      message: 'Fleet profile updated successfully',
      fleet
    });
  } catch (error) {
    console.error('Update fleet profile error:', error);
    
    // Handle validation errors
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ValidationError') {
      const validationErrors = Object.values((error as any).errors).map((err: any) => err.message);
      res.status(400).json({ 
        message: 'Validation error', 
        errors: validationErrors 
      });
      return;
    }

    // Handle duplicate key errors
    if (error && typeof error === 'object' && 'code' in error && (error as any).code === 11000) {
      res.status(400).json({ 
        message: 'Registration number already exists' 
      });
      return;
    }

    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// NEW: Get fleet settings
// @desc    Get fleet settings
// @route   GET /api/fleet/settings
// @access  Private (Fleet Manager)
export const getFleetSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const fleet = await Fleet.findOne({ 
      email: req.user?.email,
      isActive: true 
    });

    if (!fleet) {
      res.status(404).json({ message: 'Fleet not found' });
      return;
    }

    // Return fleet settings
    const settings = {
      notifications: {
        emailAlerts: true,
        smsAlerts: false,
        emergencyAlerts: true,
        maintenanceReminders: true,
        routeUpdates: true
      },
      privacy: {
        shareLocation: true,
        sharePerformanceData: false,
        allowAnalytics: true
      },
      operational: {
        autoAcceptBookings: false,
        emergencyContactNumber: fleet.phone || '',
        operatingHours: {
          start: '06:00',
          end: '22:00'
        },
        maintenanceSchedule: 'weekly'
      },
      billing: {
        paymentMethod: 'bank_transfer',
        invoiceFrequency: 'monthly',
        autoPayEnabled: false
      }
    };

    res.json({ settings });
  } catch (error) {
    console.error('Get fleet settings error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// NEW: Update fleet settings
// @desc    Update fleet settings
// @route   PUT /api/fleet/settings
// @access  Private (Fleet Manager)
export const updateFleetSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { notifications, privacy, operational, billing } = req.body;

    const fleet = await Fleet.findOne({ 
      email: req.user?.email,
      isActive: true 
    });

    if (!fleet) {
      res.status(404).json({ message: 'Fleet not found' });
      return;
    }

    // Update settings (store in operationalInfo or create a dedicated settings field)
    if (!fleet.operationalInfo) {
      fleet.operationalInfo = {
        yearsInOperation: 0,
        averageFleetAge: 0,
        maintenanceSchedule: 'monthly'
      };
    }
    
    if (notifications) fleet.operationalInfo.notifications = notifications;
    if (privacy) fleet.operationalInfo.privacy = privacy;
    if (operational) fleet.operationalInfo.operational = operational;
    if (billing) fleet.operationalInfo.billing = billing;

    await fleet.save();

    res.json({
      message: 'Fleet settings updated successfully',
      settings: {
        notifications: fleet.operationalInfo?.notifications || {},
        privacy: fleet.operationalInfo?.privacy || {},
        operational: fleet.operationalInfo?.operational || {},
        billing: fleet.operationalInfo?.billing || {}
      }
    });
  } catch (error) {
    console.error('Update fleet settings error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// NEW: Get fleet notifications
// @desc    Get fleet notifications
// @route   GET /api/fleet/notifications
// @access  Private (Fleet Manager)
export const getFleetNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const { unreadOnly = false, limit = 50 } = req.query;

    // Mock notifications - in production, you'd have a Notification model
    const notifications = [
      {
        _id: '1',
        type: 'route_approved',
        title: 'Route Application Approved',
        message: 'Your route application for "Padukka to Colombo" has been approved',
        read: false,
        createdAt: new Date(Date.now() - 3600000), // 1 hour ago
        priority: 'high',
        category: 'route'
      },
      {
        _id: '2',
        type: 'vehicle_maintenance',
        title: 'Vehicle Maintenance Due',
        message: 'Vehicle BUS-001 is due for scheduled maintenance',
        read: unreadOnly ? false : true,
        createdAt: new Date(Date.now() - 86400000), // 1 day ago
        priority: 'medium',
        category: 'vehicle'
      },
      {
        _id: '3',
        type: 'system_update',
        title: 'System Update Available',
        message: 'New features are available in the fleet management system',
        read: unreadOnly ? false : true,
        createdAt: new Date(Date.now() - 172800000), // 2 days ago
        priority: 'low',
        category: 'system'
      }
    ];

    const filteredNotifications = unreadOnly === 'true' 
      ? notifications.filter(n => !n.read)
      : notifications;

    const limitedNotifications = filteredNotifications.slice(0, parseInt(limit as string));

    const stats = {
      total: notifications.length,
      unread: notifications.filter(n => !n.read).length,
      high: notifications.filter(n => n.priority === 'high').length,
      medium: notifications.filter(n => n.priority === 'medium').length,
      low: notifications.filter(n => n.priority === 'low').length
    };

    res.json({
      notifications: limitedNotifications,
      stats
    });
  } catch (error) {
    console.error('Get fleet notifications error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// NEW: Mark notification as read
// @desc    Mark notification as read
// @route   PUT /api/fleet/notifications/:id/read
// @access  Private (Fleet Manager)
export const markNotificationRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // In production, you'd update the actual notification in database
    // For now, just return success
    res.json({
      message: 'Notification marked as read',
      notificationId: id,
      readAt: new Date()
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get fleet vehicles
// @route   GET /api/fleet/vehicles
// @access  Private (Fleet Manager)
export const getFleetVehicles = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    
    // Find all vehicles assigned to this fleet manager
    const vehicles = await Device.find({
      'assignedTo.userId': userId,
      isActive: true
    }).sort({ createdAt: -1 }); // Sort by newest first

    // Calculate real-time statistics
    const stats = {
      total: vehicles.length,
      online: vehicles.filter(v => v.status === 'online').length,
      offline: vehicles.filter(v => v.status === 'offline').length,
      maintenance: vehicles.filter(v => v.status === 'maintenance').length
    };

    res.json({ vehicles, stats });
  } catch (error) {
    console.error('Get fleet vehicles error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Add new vehicle
// @route   POST /api/fleet/vehicles
// @access  Private (Fleet Manager)
export const addVehicle = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const { 
      vehicleNumber, 
      vehicleType, 
      firmwareVersion,
      installDate 
    } = req.body;

    // Validate required fields
    if (!vehicleNumber || !vehicleType) {
      res.status(400).json({ message: 'Vehicle number and type are required' });
      return;
    }

    // Check if vehicle number already exists
    const existingVehicle = await Device.findOne({ 
      vehicleNumber: vehicleNumber.trim(),
      isActive: true 
    });

    if (existingVehicle) {
      res.status(400).json({ message: 'Vehicle number already exists' });
      return;
    }

    // Find the fleet to ensure the user is authorized and update fleet stats
    const fleet = await Fleet.findOne({ 
      email: req.user?.email,
      isActive: true 
    });

    // Create the vehicle data object
    const vehicleData = {
      deviceId: `DEV_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      vehicleNumber: vehicleNumber.trim(),
      vehicleType: vehicleType.toLowerCase(),
      status: 'offline' as const, // New vehicles start offline until device comes online
      location: {
        latitude: 6.9271, // Default to Colombo coordinates
        longitude: 79.8612,
        address: 'Colombo, Sri Lanka (Initial Location)',
        lastUpdated: new Date()
      },
      batteryLevel: 100, // Default full battery
      signalStrength: 0, // No signal until device comes online
      assignedTo: {
        type: 'company_admin' as const,
        userId: userId,
        name: req.user?.name || 'Fleet Manager'
      },
      firmwareVersion: firmwareVersion || '1.0.0',
      installDate: installDate ? new Date(installDate) : new Date(),
      alerts: {
        count: 0,
        messages: []
      },
      isActive: true
    };

    // Create the vehicle in database
    const vehicle = await Device.create(vehicleData);

    // Update fleet vehicle count if fleet exists
    if (fleet) {
      fleet.totalVehicles = (fleet.totalVehicles || 0) + 1;
      await fleet.save();
    }

    res.status(201).json({
      message: 'Vehicle added successfully',
      vehicle: {
        _id: vehicle._id,
        deviceId: vehicle.deviceId,
        vehicleNumber: vehicle.vehicleNumber,
        vehicleType: vehicle.vehicleType,
        status: vehicle.status,
        location: vehicle.location,
        batteryLevel: vehicle.batteryLevel,
        signalStrength: vehicle.signalStrength,
        lastSeen: vehicle.lastSeen,
        alerts: vehicle.alerts,
        firmwareVersion: vehicle.firmwareVersion,
        installDate: vehicle.installDate,
        createdAt: vehicle.createdAt
      }
    });
  } catch (error) {
    console.error('Add vehicle error:', error);
    
    // Handle validation errors
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ValidationError') {
      const validationErrors = Object.values((error as any).errors).map((err: any) => err.message);
      res.status(400).json({ 
        message: 'Validation error', 
        errors: validationErrors 
      });
      return;
    }

    // Handle duplicate key errors
    if (error && typeof error === 'object' && 'code' in error && (error as any).code === 11000) {
      res.status(400).json({ 
        message: 'Vehicle with this device ID already exists' 
      });
      return;
    }

    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Update vehicle
// @route   PUT /api/fleet/vehicles/:id
// @access  Private (Fleet Manager)
export const updateVehicle = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;
    const { vehicleNumber, vehicleType, firmwareVersion, status } = req.body;

    // Find the vehicle and ensure it belongs to this fleet manager
    const vehicle = await Device.findOne({
      _id: id,
      'assignedTo.userId': userId,
      isActive: true
    });

    if (!vehicle) {
      res.status(404).json({ message: 'Vehicle not found' });
      return;
    }

    // Check if new vehicle number already exists (if being changed)
    if (vehicleNumber && vehicleNumber !== vehicle.vehicleNumber) {
      const existingVehicle = await Device.findOne({ 
        vehicleNumber: vehicleNumber.trim(),
        _id: { $ne: id }, // Exclude current vehicle
        isActive: true 
      });

      if (existingVehicle) {
        res.status(400).json({ message: 'Vehicle number already exists' });
        return;
      }
    }

    // Update fields if provided
    if (vehicleNumber) vehicle.vehicleNumber = vehicleNumber.trim();
    if (vehicleType) vehicle.vehicleType = vehicleType.toLowerCase();
    if (firmwareVersion) vehicle.firmwareVersion = firmwareVersion;
    if (status && ['online', 'offline', 'maintenance'].includes(status)) {
      vehicle.status = status;
    }

    const updatedVehicle = await vehicle.save();

    res.json({
      message: 'Vehicle updated successfully',
      vehicle: updatedVehicle
    });
  } catch (error) {
    console.error('Update vehicle error:', error);
    
    // Handle validation errors
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ValidationError') {
      const validationErrors = Object.values((error as any).errors).map((err: any) => err.message);
      res.status(400).json({ 
        message: 'Validation error', 
        errors: validationErrors 
      });
      return;
    }

    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get single vehicle details
// @route   GET /api/fleet/vehicles/:id
// @access  Private (Fleet Manager)
export const getVehicleDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    const vehicle = await Device.findOne({
      _id: id,
      'assignedTo.userId': userId,
      isActive: true
    });

    if (!vehicle) {
      res.status(404).json({ message: 'Vehicle not found' });
      return;
    }

    res.json({ vehicle });
  } catch (error) {
    console.error('Get vehicle details error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Delete vehicle
// @route   DELETE /api/fleet/vehicles/:id
// @access  Private (Fleet Manager)
export const deleteVehicle = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    // Find the vehicle and ensure it belongs to this fleet manager
    const vehicle = await Device.findOne({
      _id: id,
      'assignedTo.userId': userId,
      isActive: true
    });

    if (!vehicle) {
      res.status(404).json({ message: 'Vehicle not found' });
      return;
    }

    // Soft delete - set isActive to false instead of removing from database
    vehicle.isActive = false;
    await vehicle.save();

    // Update fleet vehicle count
    const fleet = await Fleet.findOne({ 
      email: req.user?.email,
      isActive: true 
    });

    if (fleet && fleet.totalVehicles > 0) {
      fleet.totalVehicles -= 1;
      await fleet.save();
    }

    res.json({
      message: 'Vehicle deleted successfully'
    });
  } catch (error) {
    console.error('Delete vehicle error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get fleet routes with approval status
// @route   GET /api/fleet/routes
// @access  Private (Fleet Manager)
export const getFleetRoutes = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🔍 Fleet routes - User:', req.user?.email, 'Role:', req.user?.role);
    
    // Find the fleet profile for this user
    const fleet = await Fleet.findOne({ 
      email: req.user?.email,
      isActive: true 
    });

    console.log('🔍 Fleet routes - Fleet found:', fleet ? fleet.companyName : 'None');

    let routes: any[] = [];
    let stats = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      active: 0,
      inactive: 0,
      maintenance: 0
    };

    if (fleet) {
      // Find all routes (including pending, approved, rejected) for this fleet
      routes = await Route.find({ 
        'operatorInfo.fleetId': fleet._id,
        isActive: true 
      })
      .populate('reviewedBy', 'name email')
      .sort({ submittedAt: -1 });

      console.log('🔍 Fleet routes - Found routes:', routes.length);

      // Calculate statistics from actual routes
      stats = {
        total: routes.length,
        pending: routes.filter(r => r.approvalStatus === 'pending').length,
        approved: routes.filter(r => r.approvalStatus === 'approved').length,
        rejected: routes.filter(r => r.approvalStatus === 'rejected').length,
        active: routes.filter(r => r.approvalStatus === 'approved' && r.status === 'active').length,
        inactive: routes.filter(r => r.status === 'inactive').length,
        maintenance: routes.filter(r => r.status === 'maintenance').length
      };
    } else {
      console.log('⚠️ Fleet routes - No fleet profile found');
      
      routes = [];
      stats = {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        active: 0,
        inactive: 0,
        maintenance: 0
      };
    }

    console.log('✅ Fleet routes - Returning', routes.length, 'routes');

    res.json({ 
      routes, 
      stats,
      message: !fleet ? 
        'No fleet profile found. Please contact admin to set up your fleet profile.' : 
        routes.length === 0 ? 'No routes found. Submit a route application to get started.' : 
        undefined
    });
  } catch (error) {
    console.error('Get fleet routes error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Create new fleet route (Submit for approval)
// @route   POST /api/fleet/routes
// @access  Private (Fleet Manager)
export const createFleetRoute = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🔍 Create fleet route - User:', req.user?.email);
    
    const fleet = await Fleet.findOne({ 
      email: req.user?.email,
      isActive: true 
    });

    if (!fleet) {
      res.status(404).json({ 
        message: 'Fleet profile not found. Please complete your fleet profile first.' 
      });
      return;
    }

    // Check if fleet is approved
    if (fleet.status !== 'approved') {
      res.status(403).json({ 
        message: `Cannot submit routes. Fleet status: ${fleet.status}. Please wait for fleet approval.` 
      });
      return;
    }

    const {
      name,
      startLocation,
      endLocation,
      waypoints = [],
      distance,
      estimatedDuration,
      schedules,
      vehicleInfo,
      pricing
    } = req.body;

    // Validate required fields
    if (!name || !startLocation || !endLocation || !distance || !estimatedDuration || !schedules || !vehicleInfo || !pricing) {
      res.status(400).json({ 
        message: 'All required fields must be provided: name, startLocation, endLocation, distance, estimatedDuration, schedules, vehicleInfo, pricing' 
      });
      return;
    }

    // Validate start and end locations have required fields
    if (!startLocation.name || !startLocation.address || !endLocation.name || !endLocation.address) {
      res.status(400).json({ 
        message: 'Start and end locations must have name and address' 
      });
      return;
    }

    // Validate vehicle info
    if (!vehicleInfo.type || !vehicleInfo.capacity) {
      res.status(400).json({ 
        message: 'Vehicle type and capacity are required' 
      });
      return;
    }

    // Parse and validate pricing
const parsedBasePrice = parseFloat(pricing.basePrice);
const parsedPricePerKm = parseFloat(pricing.pricePerKm);

if (isNaN(parsedBasePrice) || isNaN(parsedPricePerKm) || 
    parsedBasePrice <= 0 || parsedPricePerKm <= 0) {
  res.status(400).json({ 
    message: 'Base price and price per km must be valid positive numbers' 
  });
  return;
}

    // Check for duplicate route names within fleet
    const existingRoute = await Route.findOne({ 
      name: name.trim(),
      'operatorInfo.fleetId': fleet._id,
      isActive: true,
      approvalStatus: { $in: ['pending', 'approved'] } // Don't check rejected routes
    });

    if (existingRoute) {
      res.status(400).json({ 
        message: 'A route with this name already exists in your fleet' 
      });
      return;
    }

    // Create route data - routes start as 'pending' approval
    const routeData = {
      name: name.trim(),
      startLocation: {
        name: startLocation.name.trim(),
        coordinates: startLocation.coordinates || [79.8612, 6.9271] as [number, number],
        address: startLocation.address.trim()
      },
      endLocation: {
        name: endLocation.name.trim(),
        coordinates: endLocation.coordinates || [80.2210, 5.9549] as [number, number],
        address: endLocation.address.trim()
      },
      waypoints: waypoints.map((stop: any, index: number) => ({
        name: stop.name,
        coordinates: stop.coordinates || [79.8612 + (index * 0.1), 6.9271 + (index * 0.1)] as [number, number],
        estimatedTime: stop.estimatedTime || (index + 1) * 30,
        order: index
      })),
      distance: parseFloat(distance),
      estimatedDuration: parseInt(estimatedDuration),
      schedules: schedules.map((schedule: any) => ({
        departureTime: schedule.departureTime,
        arrivalTime: schedule.arrivalTime || schedule.departureTime,
        frequency: schedule.frequency || 60,
        daysOfWeek: schedule.daysOfWeek || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        isActive: true
      })),
      operatorInfo: {
        fleetId: fleet._id,
        companyName: fleet.companyName,
        contactNumber: fleet.phone || '+94-XXX-XXXX'
      },
      vehicleInfo: {
        type: vehicleInfo.type === 'train' ? 'train' : 'bus',
        capacity: parseInt(vehicleInfo.capacity),
        amenities: vehicleInfo.amenities || []
      },
    pricing: {
  basePrice: parsedBasePrice,  // Use the parsed values
  pricePerKm: parsedPricePerKm, // Use the parsed values
  discounts: pricing.discounts || [
    { type: 'student' as const, percentage: 50 },
    { type: 'senior' as const, percentage: 25 },
    { type: 'military' as const, percentage: 30 }
  ]
},
      // Approval workflow - new routes start as pending
      approvalStatus: 'pending' as const,
      submittedAt: new Date(),
      // Operational status
      status: 'active' as const, // Will be used once approved
      isActive: true
    };

    // Create the route
    const route = await Route.create(routeData);

    console.log('✅ Create fleet route - Created:', route.name);

    res.status(201).json({
      message: 'Route application submitted successfully. It will be reviewed by administrators.',
      route: {
        _id: route._id,
        routeId: route.routeId,
        name: route.name,
        startLocation: route.startLocation,
        endLocation: route.endLocation,
        distance: route.distance,
        estimatedDuration: route.estimatedDuration,
        approvalStatus: route.approvalStatus,
        submittedAt: route.submittedAt,
        pricing: route.pricing,
        vehicleInfo: route.vehicleInfo
      }
    });
  } catch (error) {
    console.error('Create fleet route error:', error);
    
    // Handle validation errors
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ValidationError') {
      const validationErrors = Object.values((error as any).errors).map((err: any) => err.message);
      res.status(400).json({ 
        message: 'Validation error', 
        errors: validationErrors 
      });
      return;
    }

    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Update fleet route (only for pending or rejected routes)
// @route   PUT /api/fleet/routes/:id
// @access  Private (Fleet Manager)
export const updateFleetRoute = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const fleet = await Fleet.findOne({ 
      email: req.user?.email,
      isActive: true 
    });

    if (!fleet) {
      res.status(404).json({ message: 'Fleet not found' });
      return;
    }

    // Find the route and ensure it belongs to this fleet
    const route = await Route.findOne({
      _id: id,
      'operatorInfo.fleetId': fleet._id,
      isActive: true
    });

    if (!route) {
      res.status(404).json({ message: 'Route not found' });
      return;
    }

    // Only allow updates to pending or rejected routes
    if (route.approvalStatus === 'approved') {
      res.status(403).json({ 
        message: 'Cannot modify approved routes. Contact admin for changes.' 
      });
      return;
    }

    const {
      name,
      startLocation,
      endLocation,
      waypoints,
      distance,
      estimatedDuration,
      schedules,
      vehicleInfo,
      pricing
    } = req.body;

    // Check for duplicate names (excluding current route)
    if (name && name !== route.name) {
      const existingRoute = await Route.findOne({ 
        name: name.trim(),
        'operatorInfo.fleetId': fleet._id,
        _id: { $ne: id },
        isActive: true,
        approvalStatus: { $in: ['pending', 'approved'] }
      });

      if (existingRoute) {
        res.status(400).json({ 
          message: 'A route with this name already exists in your fleet' 
        });
        return;
      }
    }

    // Update allowed fields
    if (name) route.name = name.trim();
    if (startLocation) {
      route.startLocation = {
        name: startLocation.name.trim(),
        coordinates: startLocation.coordinates || route.startLocation.coordinates,
        address: startLocation.address.trim()
      };
    }
    if (endLocation) {
      route.endLocation = {
        name: endLocation.name.trim(),
        coordinates: endLocation.coordinates || route.endLocation.coordinates,
        address: endLocation.address.trim()
      };
    }
    if (waypoints) route.waypoints = waypoints;
    if (distance) route.distance = parseFloat(distance);
    if (estimatedDuration) route.estimatedDuration = parseInt(estimatedDuration);
    if (schedules) route.schedules = schedules;
    if (vehicleInfo) route.vehicleInfo = vehicleInfo;
    if (pricing) route.pricing = pricing;

    // If route was rejected, resubmit for approval
    if (route.approvalStatus === 'rejected') {
      await route.resubmit();
    }

    const updatedRoute = await route.save();

    res.json({
      message: route.approvalStatus === 'pending' ? 'Route updated successfully' : 'Route resubmitted for approval',
      route: updatedRoute
    });
  } catch (error) {
    console.error('Update fleet route error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Delete fleet route (only pending/rejected routes)
// @route   DELETE /api/fleet/routes/:id
// @access  Private (Fleet Manager)
export const deleteFleetRoute = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const fleet = await Fleet.findOne({ 
      email: req.user?.email,
      isActive: true 
    });

    if (!fleet) {
      res.status(404).json({ message: 'Fleet not found' });
      return;
    }

    // Find the route and ensure it belongs to this fleet
    const route = await Route.findOne({
      _id: id,
      'operatorInfo.fleetId': fleet._id,
      isActive: true
    });

    if (!route) {
      res.status(404).json({ message: 'Route not found' });
      return;
    }

    // Only allow deletion of pending or rejected routes
    if (route.approvalStatus === 'approved') {
      res.status(403).json({ 
        message: 'Cannot delete approved routes. Contact admin to deactivate the route.' 
      });
      return;
    }

    // Soft delete
    route.isActive = false;
    await route.save();

    res.json({
      message: 'Route application deleted successfully'
    });
  } catch (error) {
    console.error('Delete fleet route error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get single route details for fleet manager
// @route   GET /api/fleet/routes/:id
// @access  Private (Fleet Manager)
export const getFleetRouteDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const fleet = await Fleet.findOne({ 
      email: req.user?.email,
      isActive: true 
    });

    if (!fleet) {
      res.status(404).json({ message: 'Fleet not found' });
      return;
    }

    const route = await Route.findOne({
      _id: id,
      'operatorInfo.fleetId': fleet._id,
      isActive: true
    }).populate('reviewedBy', 'name email');

    if (!route) {
      res.status(404).json({ message: 'Route not found' });
      return;
    }

    res.json({ 
      route,
      canEdit: route.approvalStatus === 'pending' || route.approvalStatus === 'rejected',
      canDelete: route.approvalStatus === 'pending' || route.approvalStatus === 'rejected'
    });
  } catch (error) {
    console.error('Get fleet route details error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get fleet analytics
// @route   GET /api/fleet/analytics
// @access  Private (Fleet Manager)
export const getFleetAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    
    const fleet = await Fleet.findOne({ 
      email: req.user?.email,
      isActive: true 
    });

    if (!fleet) {
      res.status(404).json({ message: 'Fleet not found' });
      return;
    }

    // Get vehicles
    const vehicles = await Device.find({
      'assignedTo.userId': userId,
      isActive: true
    });

    // Get routes
    const routes = await Route.find({ 
      'operatorInfo.fleetId': fleet._id,
      isActive: true 
    });

    const analytics = {
      fleet: {
        complianceScore: fleet.complianceScore,
        totalVehicles: fleet.totalVehicles,
        activeVehicles: fleet.activeVehicles,
        operatingRoutes: fleet.operatingRoutes.length
      },
      vehicles: {
        total: vehicles.length,
        online: vehicles.filter(v => v.status === 'online').length,
        offline: vehicles.filter(v => v.status === 'offline').length,
        maintenance: vehicles.filter(v => v.status === 'maintenance').length,
        avgBattery: vehicles.reduce((sum, v) => sum + v.batteryLevel, 0) / vehicles.length || 0,
        avgSignal: vehicles.reduce((sum, v) => sum + v.signalStrength, 0) / vehicles.length || 0
      },
      routes: {
        total: routes.length,
        active: routes.filter(r => r.status === 'active').length,
        avgRating: routes.reduce((sum, r) => sum + (r.avgRating || 0), 0) / routes.length || 0
      },
      performance: {
        utilizationRate: fleet.activeVehicles / fleet.totalVehicles * 100 || 0,
        complianceStatus: fleet.complianceScore >= 70 ? 'good' : 'needs_improvement',
        fleetStatus: fleet.status
      }
    };

    res.json(analytics);
  } catch (error) {
    console.error('Get fleet analytics error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};