// src/controllers/adminFleetController.ts
import { Request, Response } from 'express';
import Fleet from '../models/Fleet';
import User from '../models/User';
import mongoose from 'mongoose';

// @desc    Get all fleet applications with pagination and filtering
// @route   GET /api/admin/fleet
// @access  Private (System Admin)
export const getAllFleets = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status = 'all', 
      sortBy = 'applicationDate',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    let query: any = { isActive: true };

    // Search functionality
    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { registrationNumber: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
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

    // Get fleets with pagination
    const fleets = await Fleet.find(query)
      .populate('approvedBy rejectedBy suspendedBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(pageSize);

    // Get total count for pagination
    const totalFleets = await Fleet.countDocuments(query);

    // Get fleet statistics
    const stats = await Fleet.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalVehicles: { $sum: '$totalVehicles' },
          activeVehicles: { $sum: '$activeVehicles' }
        }
      }
    ]);

    const fleetStats = {
      totalApplications: totalFleets,
      byStatus: stats.reduce((acc, item) => {
        acc[item._id] = {
          count: item.count,
          totalVehicles: item.totalVehicles,
          activeVehicles: item.activeVehicles
        };
        return acc;
      }, {}),
      totalVehicles: stats.reduce((sum, item) => sum + item.totalVehicles, 0),
      totalActiveVehicles: stats.reduce((sum, item) => sum + item.activeVehicles, 0)
    };

    res.json({
      fleets,
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.ceil(totalFleets / pageSize),
        totalFleets,
        hasNext: pageNumber < Math.ceil(totalFleets / pageSize),
        hasPrev: pageNumber > 1
      },
      stats: fleetStats
    });
  } catch (error) {
    console.error('Get all fleets error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get fleet by ID
// @route   GET /api/admin/fleet/:id
// @access  Private (System Admin)
export const getFleetById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid fleet ID' });
      return;
    }

    const fleet = await Fleet.findById(id)
      .populate('approvedBy rejectedBy suspendedBy', 'name email role');

    if (!fleet) {
      res.status(404).json({ message: 'Fleet not found' });
      return;
    }

    res.json(fleet);
  } catch (error) {
    console.error('Get fleet by ID error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Create new fleet application
// @route   POST /api/admin/fleet
// @access  Private (System Admin)
export const createFleet = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      companyName,
      registrationNumber,
      contactPerson,
      email,
      phone,
      address,
      totalVehicles,
      operatingRoutes,
      documents,
      financialInfo,
      operationalInfo,
      notes
    } = req.body;

    // Validate required fields
    if (!companyName || !registrationNumber || !contactPerson || !email || !phone || !address || !totalVehicles) {
      res.status(400).json({ 
        message: 'All required fields must be provided' 
      });
      return;
    }

    // Check if registration number already exists
    const existingFleet = await Fleet.findOne({ registrationNumber });
    if (existingFleet) {
      res.status(400).json({ 
        message: 'Fleet with this registration number already exists' 
      });
      return;
    }

    // Create fleet object
    const fleetData: any = {
      companyName,
      registrationNumber,
      contactPerson,
      email,
      phone,
      address,
      totalVehicles,
      operatingRoutes: operatingRoutes || [],
      documents: documents || {
        businessLicense: false,
        insuranceCertificate: false,
        vehicleRegistrations: false,
        driverLicenses: false
      }
    };

    // Add optional fields
    if (financialInfo) fleetData.financialInfo = financialInfo;
    if (operationalInfo) fleetData.operationalInfo = operationalInfo;
    if (notes) fleetData.notes = notes;

    // Create fleet
    const fleet = await Fleet.create(fleetData);

    res.status(201).json({
      message: 'Fleet application created successfully',
      fleet
    });
  } catch (error) {
    console.error('Create fleet error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Update fleet application
// @route   PUT /api/admin/fleet/:id
// @access  Private (System Admin)
export const updateFleet = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid fleet ID' });
      return;
    }

    // Find fleet
    const fleet = await Fleet.findById(id);
    if (!fleet) {
      res.status(404).json({ message: 'Fleet not found' });
      return;
    }

    // Check if registration number is being changed and already exists
    if (updateData.registrationNumber && updateData.registrationNumber !== fleet.registrationNumber) {
      const existingFleet = await Fleet.findOne({ 
        registrationNumber: updateData.registrationNumber,
        _id: { $ne: id }
      });
      if (existingFleet) {
        res.status(400).json({ 
          message: 'Registration number already in use by another fleet' 
        });
        return;
      }
    }

    // Update fleet
    const updatedFleet = await Fleet.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('approvedBy rejectedBy suspendedBy', 'name email');

    res.json({
      message: 'Fleet updated successfully',
      fleet: updatedFleet
    });
  } catch (error) {
    console.error('Update fleet error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Approve fleet application
// @route   PUT /api/admin/fleet/:id/approve
// @access  Private (System Admin)
export const approveFleet = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const adminId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid fleet ID' });
      return;
    }

    if (!adminId) {
      res.status(401).json({ message: 'Admin ID not found in request' });
      return;
    }

    // Find fleet
    const fleet = await Fleet.findById(id);
    if (!fleet) {
      res.status(404).json({ message: 'Fleet not found' });
      return;
    }

    // Check if fleet can be approved
    if (fleet.status !== 'pending') {
      res.status(400).json({ 
        message: `Fleet cannot be approved. Current status: ${fleet.status}` 
      });
      return;
    }

    // Check compliance score
    if (fleet.complianceScore < 70) {
      res.status(400).json({ 
        message: `Fleet compliance score (${fleet.complianceScore}%) is below minimum requirement (70%)` 
      });
      return;
    }

    // Approve fleet
    const approvedFleet = await fleet.approve(adminId, notes);
    
    // Populate admin details
    await approvedFleet.populate('approvedBy', 'name email');

    res.json({
      message: 'Fleet approved successfully',
      fleet: approvedFleet
    });
  } catch (error) {
    console.error('Approve fleet error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Reject fleet application
// @route   PUT /api/admin/fleet/:id/reject
// @access  Private (System Admin)
export const rejectFleet = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid fleet ID' });
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

    // Find fleet
    const fleet = await Fleet.findById(id);
    if (!fleet) {
      res.status(404).json({ message: 'Fleet not found' });
      return;
    }

    // Check if fleet can be rejected
    if (fleet.status !== 'pending') {
      res.status(400).json({ 
        message: `Fleet cannot be rejected. Current status: ${fleet.status}` 
      });
      return;
    }

    // Reject fleet
    const rejectedFleet = await fleet.reject(adminId, reason.trim());
    
    // Populate admin details
    await rejectedFleet.populate('rejectedBy', 'name email');

    res.json({
      message: 'Fleet rejected successfully',
      fleet: rejectedFleet
    });
  } catch (error) {
    console.error('Reject fleet error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Suspend fleet
// @route   PUT /api/admin/fleet/:id/suspend
// @access  Private (System Admin)
export const suspendFleet = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid fleet ID' });
      return;
    }

    if (!adminId) {
      res.status(401).json({ message: 'Admin ID not found in request' });
      return;
    }

    if (!reason || reason.trim().length === 0) {
      res.status(400).json({ message: 'Suspension reason is required' });
      return;
    }

    // Find fleet
    const fleet = await Fleet.findById(id);
    if (!fleet) {
      res.status(404).json({ message: 'Fleet not found' });
      return;
    }

    // Check if fleet can be suspended
    if (fleet.status !== 'approved') {
      res.status(400).json({ 
        message: `Only approved fleets can be suspended. Current status: ${fleet.status}` 
      });
      return;
    }

    // Suspend fleet
    const suspendedFleet = await fleet.suspend(adminId, reason.trim());
    
    // Populate admin details
    await suspendedFleet.populate('suspendedBy', 'name email');

    res.json({
      message: 'Fleet suspended successfully',
      fleet: suspendedFleet
    });
  } catch (error) {
    console.error('Suspend fleet error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Reactivate suspended fleet
// @route   PUT /api/admin/fleet/:id/reactivate
// @access  Private (System Admin)
export const reactivateFleet = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const adminId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid fleet ID' });
      return;
    }

    if (!adminId) {
      res.status(401).json({ message: 'Admin ID not found in request' });
      return;
    }

    // Find fleet
    const fleet = await Fleet.findById(id);
    if (!fleet) {
      res.status(404).json({ message: 'Fleet not found' });
      return;
    }

    // Check if fleet can be reactivated
    if (fleet.status !== 'suspended') {
      res.status(400).json({ 
        message: `Only suspended fleets can be reactivated. Current status: ${fleet.status}` 
      });
      return;
    }

    // Reactivate fleet
    fleet.status = 'approved';
    fleet.suspensionDate = undefined;
    fleet.suspendedBy = undefined;
    fleet.approvedBy = adminId;
    fleet.approvalDate = new Date();
    
    if (notes) {
      fleet.notes = notes;
    }

    await fleet.save();
    await fleet.populate('approvedBy', 'name email');

    res.json({
      message: 'Fleet reactivated successfully',
      fleet
    });
  } catch (error) {
    console.error('Reactivate fleet error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Delete fleet application (soft delete)
// @route   DELETE /api/admin/fleet/:id
// @access  Private (System Admin)
export const deleteFleet = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid fleet ID' });
      return;
    }

    // Find fleet
    const fleet = await Fleet.findById(id);
    if (!fleet) {
      res.status(404).json({ message: 'Fleet not found' });
      return;
    }

    // Soft delete (mark as inactive)
    fleet.isActive = false;
    await fleet.save();

    res.json({ message: 'Fleet deleted successfully' });
  } catch (error) {
    console.error('Delete fleet error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get fleet statistics and dashboard data
// @route   GET /api/admin/fleet/stats
// @access  Private (System Admin)
export const getFleetStats = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get basic statistics
    const totalApplications = await Fleet.countDocuments({ isActive: true });
    const pendingApprovals = await Fleet.countDocuments({ status: 'pending', isActive: true });
    const approvedFleets = await Fleet.countDocuments({ status: 'approved', isActive: true });
    const rejectedApplications = await Fleet.countDocuments({ status: 'rejected', isActive: true });
    const suspendedFleets = await Fleet.countDocuments({ status: 'suspended', isActive: true });

    // Get vehicle statistics
    const vehicleStats = await Fleet.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalVehicles: { $sum: '$totalVehicles' },
          activeVehicles: { $sum: '$activeVehicles' }
        }
      }
    ]);

    // Get compliance issues
    const complianceIssues = await Fleet.countDocuments({
      status: { $in: ['approved', 'pending'] },
      complianceScore: { $lt: 70 },
      isActive: true
    });

    // Get average compliance score
    const complianceStats = await Fleet.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          avgComplianceScore: { $avg: '$complianceScore' },
          minComplianceScore: { $min: '$complianceScore' },
          maxComplianceScore: { $max: '$complianceScore' }
        }
      }
    ]);

    // Get recent applications (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentApplications = await Fleet.countDocuments({
      applicationDate: { $gte: thirtyDaysAgo },
      isActive: true
    });

    // Get fleets requiring inspection
    const inspectionDue = await Fleet.countDocuments({
      status: 'approved',
      nextInspectionDue: { $lte: new Date() },
      isActive: true
    });

    const stats = {
      totalApplications,
      pendingApprovals,
      approvedFleets,
      rejectedApplications,
      suspendedFleets,
      activeVehicles: vehicleStats[0]?.activeVehicles || 0,
      totalVehicles: vehicleStats[0]?.totalVehicles || 0,
      complianceIssues,
      recentApplications,
      inspectionDue,
      averageComplianceScore: complianceStats[0]?.avgComplianceScore || 0,
      complianceRange: {
        min: complianceStats[0]?.minComplianceScore || 0,
        max: complianceStats[0]?.maxComplianceScore || 0
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Get fleet stats error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get fleets requiring inspection
// @route   GET /api/admin/fleet/inspections
// @access  Private (System Admin)
export const getInspectionsDue = async (req: Request, res: Response): Promise<void> => {
  try {
    const fleets = await Fleet.getInspectionDue();
    
    res.json({
      fleets,
      count: fleets.length
    });
  } catch (error) {
    console.error('Get inspections due error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get compliance issues
// @route   GET /api/admin/fleet/compliance
// @access  Private (System Admin)
export const getComplianceIssues = async (req: Request, res: Response): Promise<void> => {
  try {
    const fleets = await Fleet.getComplianceIssues();
    
    res.json({
      fleets,
      count: fleets.length
    });
  } catch (error) {
    console.error('Get compliance issues error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};