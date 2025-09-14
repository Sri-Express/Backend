// src/controllers/lostAndFoundController.ts
import { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import LostAndFound, { ILostAndFound } from '../models/LostAndFound';
import User from '../models/User';
import Route from '../models/Route';

// @desc    Get all lost and found items
// @route   GET /api/lost-found
// @access  Public
export const getAllItems = asyncHandler(async (req: Request, res: Response) => {
  const { 
    type, 
    category, 
    status = 'active', 
    search, 
    routeId,
    page = 1, 
    limit = 20,
    sortBy = 'dateReported',
    sortOrder = 'desc'
  } = req.query;

  let query: any = {
    isActive: true,
    status: status,
    expiryDate: { $gt: new Date() }
  };

  // Add type filter
  if (type && (type === 'lost' || type === 'found')) {
    query.type = type;
  }

  // Add category filter
  if (category) {
    query.category = category;
  }

  // Add route filter
  if (routeId) {
    query.routeId = routeId;
  }

  // Add search functionality
  if (search) {
    query.$text = { $search: search as string };
  }

  const sortOptions: any = {};
  sortOptions[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  const items = await LostAndFound.find(query)
    .populate('reportedBy', 'name')
    .populate('routeId', 'name startLocation endLocation')
    .sort(sortOptions)
    .skip(skip)
    .limit(limitNum);

  const total = await LostAndFound.countDocuments(query);

  res.status(200).json({
    success: true,
    data: items,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum)
    }
  });
});

// @desc    Get single lost and found item
// @route   GET /api/lost-found/:id
// @access  Public
export const getItem = asyncHandler(async (req: Request, res: Response) => {
  const item = await LostAndFound.findById(req.params.id)
    .populate('reportedBy', 'name phone email')
    .populate('routeId', 'name startLocation endLocation')
    .populate('potentialMatches')
    .populate('claimedBy', 'name');

  if (!item) {
    return res.status(404).json({
      success: false,
      message: 'Item not found'
    });
  }

  // Increment view count (don't await to avoid slowing response)
  item.incrementViewCount().catch(console.error);

  res.status(200).json({
    success: true,
    data: item
  });
});

// @desc    Create new lost and found item
// @route   POST /api/lost-found
// @access  Private
export const createItem = asyncHandler(async (req: Request, res: Response) => {
  const {
    title,
    description,
    category,
    brand,
    color,
    size,
    type,
    locationFound,
    locationLost,
    routeId,
    vehicleId,
    stopName,
    dateLostOrFound,
    contactName,
    contactPhone,
    contactEmail,
    images,
    isPublic,
    additionalInfo,
    reward
  } = req.body;

  // Get user from request (set by auth middleware)
  const userId = (req as any).user._id;

  // Validate required fields
  if (!title || !description || !category || !type || !dateLostOrFound || !contactName) {
    return res.status(400).json({
      success: false,
      message: 'Please provide all required fields'
    });
  }

  // Validate type
  if (type !== 'lost' && type !== 'found') {
    return res.status(400).json({
      success: false,
      message: 'Type must be either "lost" or "found"'
    });
  }

  // Validate route if provided
  if (routeId) {
    const routeExists = await Route.findById(routeId);
    if (!routeExists) {
      return res.status(400).json({
        success: false,
        message: 'Invalid route ID'
      });
    }
  }

  // Validate date
  const lostFoundDate = new Date(dateLostOrFound);
  const now = new Date();
  if (lostFoundDate > now) {
    return res.status(400).json({
      success: false,
      message: 'Date lost/found cannot be in the future'
    });
  }

  const item = await LostAndFound.create({
    title,
    description,
    category,
    brand,
    color,
    size,
    type,
    locationFound,
    locationLost,
    routeId,
    vehicleId,
    stopName,
    dateLostOrFound: lostFoundDate,
    reportedBy: userId,
    contactName,
    contactPhone,
    contactEmail,
    images,
    isPublic: isPublic !== undefined ? isPublic : true,
    additionalInfo,
    reward
  });

  // Populate the created item
  await item.populate('reportedBy', 'name');
  await item.populate('routeId', 'name startLocation endLocation');

  // Find potential matches
  const potentialMatches = await LostAndFound.findPotentialMatches(item._id.toString());
  
  res.status(201).json({
    success: true,
    data: item,
    potentialMatches
  });
});

// @desc    Update lost and found item
// @route   PUT /api/lost-found/:id
// @access  Private
export const updateItem = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const userRole = (req as any).user.role;

  let item = await LostAndFound.findById(req.params.id);

  if (!item) {
    return res.status(404).json({
      success: false,
      message: 'Item not found'
    });
  }

  // Check if user owns the item or is admin
  if (item.reportedBy.toString() !== userId.toString() && 
      !['system_admin', 'company_admin'].includes(userRole)) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this item'
    });
  }

  // Prevent updating certain fields if item is claimed
  if (item.status === 'claimed') {
    return res.status(400).json({
      success: false,
      message: 'Cannot update claimed items'
    });
  }

  const allowedUpdates = [
    'title', 'description', 'category', 'brand', 'color', 'size',
    'locationFound', 'locationLost', 'routeId', 'vehicleId', 'stopName',
    'contactName', 'contactPhone', 'contactEmail', 'images',
    'isPublic', 'additionalInfo', 'reward'
  ];

  const updates: any = {};
  allowedUpdates.forEach(field => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  // Validate route if being updated
  if (updates.routeId) {
    const routeExists = await Route.findById(updates.routeId);
    if (!routeExists) {
      return res.status(400).json({
        success: false,
        message: 'Invalid route ID'
      });
    }
  }

  item = await LostAndFound.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true }
  ).populate('reportedBy', 'name')
   .populate('routeId', 'name startLocation endLocation');

  res.status(200).json({
    success: true,
    data: item
  });
});

// @desc    Delete lost and found item
// @route   DELETE /api/lost-found/:id
// @access  Private
export const deleteItem = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const userRole = (req as any).user.role;

  const item = await LostAndFound.findById(req.params.id);

  if (!item) {
    return res.status(404).json({
      success: false,
      message: 'Item not found'
    });
  }

  // Check if user owns the item or is admin
  if (item.reportedBy.toString() !== userId.toString() && 
      !['system_admin', 'company_admin'].includes(userRole)) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this item'
    });
  }

  // Soft delete by setting isActive to false
  await LostAndFound.findByIdAndUpdate(req.params.id, { 
    isActive: false,
    status: 'cancelled'
  });

  res.status(200).json({
    success: true,
    message: 'Item deleted successfully'
  });
});

// @desc    Claim an item
// @route   POST /api/lost-found/:id/claim
// @access  Private
export const claimItem = asyncHandler(async (req: Request, res: Response) => {
  const { verificationCode, message } = req.body;
  const userId = (req as any).user._id;

  const item = await LostAndFound.findById(req.params.id);

  if (!item) {
    return res.status(404).json({
      success: false,
      message: 'Item not found'
    });
  }

  if (item.status !== 'active') {
    return res.status(400).json({
      success: false,
      message: 'Item is not available for claiming'
    });
  }

  if (item.reportedBy.toString() === userId.toString()) {
    return res.status(400).json({
      success: false,
      message: 'You cannot claim your own item'
    });
  }

  // For found items, verify the code
  if (item.type === 'found' && verificationCode !== item.verificationCode) {
    return res.status(400).json({
      success: false,
      message: 'Invalid verification code'
    });
  }

  await item.claimItem(userId);

  res.status(200).json({
    success: true,
    message: 'Item claimed successfully',
    data: item
  });
});

// @desc    Get potential matches for an item
// @route   GET /api/lost-found/:id/matches
// @access  Public
export const getPotentialMatches = asyncHandler(async (req: Request, res: Response) => {
  const matches = await LostAndFound.findPotentialMatches(req.params.id);

  res.status(200).json({
    success: true,
    data: matches
  });
});

// @desc    Mark items as potential matches
// @route   POST /api/lost-found/:id/matches
// @access  Private
export const markAsMatch = asyncHandler(async (req: Request, res: Response) => {
  const { matchId } = req.body;
  const userId = (req as any).user._id;

  const item = await LostAndFound.findById(req.params.id);
  const matchItem = await LostAndFound.findById(matchId);

  if (!item || !matchItem) {
    return res.status(404).json({
      success: false,
      message: 'Item(s) not found'
    });
  }

  // Check if user owns one of the items
  if (item.reportedBy.toString() !== userId.toString() && 
      matchItem.reportedBy.toString() !== userId.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to mark this match'
    });
  }

  await item.markAsMatched(matchItem._id);
  await matchItem.markAsMatched(item._id);

  res.status(200).json({
    success: true,
    message: 'Items marked as potential match'
  });
});

// @desc    Get user's items
// @route   GET /api/lost-found/user/my-items
// @access  Private
export const getUserItems = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const { type, status } = req.query;

  let query: any = { reportedBy: userId };

  if (type && (type === 'lost' || type === 'found')) {
    query.type = type;
  }

  if (status) {
    query.status = status;
  }

  const items = await LostAndFound.find(query)
    .populate('routeId', 'name startLocation endLocation')
    .populate('potentialMatches')
    .populate('claimedBy', 'name')
    .sort({ dateReported: -1 });

  res.status(200).json({
    success: true,
    data: items
  });
});

// @desc    Get statistics
// @route   GET /api/lost-found/stats
// @access  Public
export const getStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await LostAndFound.getStats();

  res.status(200).json({
    success: true,
    data: stats
  });
});

// @desc    Extend item expiry
// @route   POST /api/lost-found/:id/extend
// @access  Private
export const extendExpiry = asyncHandler(async (req: Request, res: Response) => {
  const { days = 30 } = req.body;
  const userId = (req as any).user._id;
  const userRole = (req as any).user.role;

  const item = await LostAndFound.findById(req.params.id);

  if (!item) {
    return res.status(404).json({
      success: false,
      message: 'Item not found'
    });
  }

  // Check if user owns the item or is admin
  if (item.reportedBy.toString() !== userId.toString() && 
      !['system_admin', 'company_admin'].includes(userRole)) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to extend this item'
    });
  }

  await item.extendExpiry(days);

  res.status(200).json({
    success: true,
    message: `Item expiry extended by ${days} days`,
    data: item
  });
});

// @desc    Get categories
// @route   GET /api/lost-found/categories
// @access  Public
export const getCategories = asyncHandler(async (req: Request, res: Response) => {
  const categories = [
    { value: 'electronics', label: 'Electronics', icon: '📱' },
    { value: 'personal', label: 'Personal Items', icon: '👜' },
    { value: 'documents', label: 'Documents', icon: '📄' },
    { value: 'clothing', label: 'Clothing', icon: '👕' },
    { value: 'accessories', label: 'Accessories', icon: '👓' },
    { value: 'bags', label: 'Bags', icon: '🎒' },
    { value: 'books', label: 'Books', icon: '📚' },
    { value: 'keys', label: 'Keys', icon: '🔑' },
    { value: 'other', label: 'Other', icon: '📦' }
  ];

  res.status(200).json({
    success: true,
    data: categories
  });
});