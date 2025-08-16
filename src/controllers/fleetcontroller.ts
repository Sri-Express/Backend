// src/controllers/fleetController.ts - Fleet Operator Portal
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

    if (!fleet) {
      res.status(404).json({ message: 'Fleet not found for this user' });
      return;
    }

    // Get fleet routes
    const routes = await Route.find({ 
      'operatorInfo.fleetId': fleet._id,
      isActive: true 
    }).limit(5);

    // Get fleet vehicles (devices)
    const vehicles = await Device.find({
      assignedTo: { userId },
      isActive: true
    }).limit(10);

    // Calculate basic stats
    const stats = {
      fleetStatus: fleet.status,
      complianceScore: fleet.complianceScore,
      totalVehicles: fleet.totalVehicles,
      activeVehicles: fleet.activeVehicles,
      operatingRoutes: fleet.operatingRoutes.length,
      totalRoutes: routes.length,
      onlineVehicles: vehicles.filter(v => v.status === 'online').length,
      maintenanceVehicles: vehicles.filter(v => v.status === 'maintenance').length
    };

    res.json({
      fleet: {
        _id: fleet._id,
        companyName: fleet.companyName,
        status: fleet.status,
        complianceScore: fleet.complianceScore,
        totalVehicles: fleet.totalVehicles,
        activeVehicles: fleet.activeVehicles
      },
      stats,
      routes: routes.slice(0, 3), // Latest 3 routes
      vehicles: vehicles.slice(0, 5), // Latest 5 vehicles
      alerts: []
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
    const fleet = await Fleet.findOne({ 
      email: req.user?.email,
      isActive: true 
    });

    if (!fleet) {
      res.status(404).json({ message: 'Fleet not found' });
      return;
    }

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
    const { 
      contactPerson, 
      phone, 
      address, 
      operatingRoutes,
      operationalInfo 
    } = req.body;

    const fleet = await Fleet.findOne({ 
      email: req.user?.email,
      isActive: true 
    });

    if (!fleet) {
      res.status(404).json({ message: 'Fleet not found' });
      return;
    }

    // Only allow certain fields to be updated
    if (contactPerson) fleet.contactPerson = contactPerson;
    if (phone) fleet.phone = phone;
    if (address) fleet.address = address;
    if (operatingRoutes) fleet.operatingRoutes = operatingRoutes;
    if (operationalInfo) fleet.operationalInfo = { ...fleet.operationalInfo, ...operationalInfo };

    await fleet.save();

    res.json({
      message: 'Fleet profile updated successfully',
      fleet
    });
  } catch (error) {
    console.error('Update fleet profile error:', error);
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
    
    const vehicles = await Device.find({
      'assignedTo.userId': userId,
      isActive: true
    });

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

    const fleet = await Fleet.findOne({ 
      email: req.user?.email,
      isActive: true 
    });

    if (!fleet) {
      res.status(404).json({ message: 'Fleet not found' });
      return;
    }

    if (fleet.status !== 'approved') {
      res.status(400).json({ message: 'Fleet must be approved to add vehicles' });
      return;
    }

    const vehicleData = {
      deviceId: `DEV_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      vehicleNumber,
      vehicleType,
      status: 'offline',
      location: {
        latitude: 6.9271,
        longitude: 79.8612,
        address: 'Colombo, Sri Lanka',
        lastUpdated: new Date()
      },
      batteryLevel: 100,
      signalStrength: 4,
      assignedTo: {
        type: 'company_admin',
        userId: userId,
        name: req.user?.name || 'Fleet Manager'
      },
      firmwareVersion: firmwareVersion || '1.0.0',
      installDate: installDate || new Date(),
      alerts: {
        count: 0,
        messages: []
      }
    };

    const vehicle = await Device.create(vehicleData);

    // Update fleet vehicle count
    fleet.totalVehicles += 1;
    await fleet.save();

    res.status(201).json({
      message: 'Vehicle added successfully',
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

// @desc    Update vehicle
// @route   PUT /api/fleet/vehicles/:id
// @access  Private (Fleet Manager)
export const updateVehicle = async (req: Request, res: Response): Promise<void> => {
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

    const updatedVehicle = await Device.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );

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

// @desc    Get fleet routes
// @route   GET /api/fleet/routes
// @access  Private (Fleet Manager)
export const getFleetRoutes = async (req: Request, res: Response): Promise<void> => {
  try {
    const fleet = await Fleet.findOne({ 
      email: req.user?.email,
      isActive: true 
    });

    if (!fleet) {
      res.status(404).json({ message: 'Fleet not found' });
      return;
    }

    const routes = await Route.find({ 
      'operatorInfo.fleetId': fleet._id,
      isActive: true 
    });

    const stats = {
      total: routes.length,
      active: routes.filter(r => r.status === 'active').length,
      inactive: routes.filter(r => r.status === 'inactive').length,
      maintenance: routes.filter(r => r.status === 'maintenance').length
    };

    res.json({ routes, stats });
  } catch (error) {
    console.error('Get fleet routes error:', error);
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