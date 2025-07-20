"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTrackingAnalytics = exports.getVehicleHistory = exports.getETAForBooking = exports.updateVehicleLocation = exports.getRouteVehicles = exports.getLiveLocations = void 0;
const LocationTracking_1 = __importDefault(require("../models/LocationTracking"));
const Route_1 = __importDefault(require("../models/Route"));
const Device_1 = __importDefault(require("../models/Device"));
const Booking_1 = __importDefault(require("../models/Booking"));
// @desc Get live vehicle locations - FIXED VERSION @route GET /api/tracking/live @access Public
const getLiveLocations = async (req, res) => {
    try {
        console.log('🚌 getLiveLocations called');
        const { bounds, routeId, vehicleType, status, limit = 50, includeOld } = req.query;
        const filter = { isActive: true };
        if (!includeOld) {
            filter.timestamp = { $gte: new Date(Date.now() - 60 * 60 * 1000) };
            console.log('🕐 Using 1-hour time filter');
        }
        else {
            console.log('🕐 No time filter applied (debug mode)');
        }
        if (routeId)
            filter.routeId = routeId;
        if (status)
            filter['operationalInfo.status'] = status;
        console.log('🔍 Filter being used:', JSON.stringify(filter, null, 2));
        if (bounds) {
            try {
                const boundsObj = JSON.parse(bounds);
                filter['location.latitude'] = { $gte: boundsObj.southWest.lat, $lte: boundsObj.northEast.lat };
                filter['location.longitude'] = { $gte: boundsObj.southWest.lng, $lte: boundsObj.northEast.lng };
            }
            catch (error) {
                res.status(400).json({ message: 'Invalid bounds format' });
                return;
            }
        }
        const totalRecords = await LocationTracking_1.default.countDocuments({});
        const activeRecords = await LocationTracking_1.default.countDocuments({ isActive: true });
        const recentRecords = await LocationTracking_1.default.countDocuments({ isActive: true, timestamp: { $gte: new Date(Date.now() - 60 * 60 * 1000) } });
        console.log(`📊 LocationTracking stats: Total=${totalRecords}, Active=${activeRecords}, Recent=${recentRecords}`);
        const vehicles = await LocationTracking_1.default.aggregate([{ $match: filter }, { $sort: { vehicleId: 1, timestamp: -1 } }, { $group: { _id: '$vehicleId', latestLocation: { $first: '$$ROOT' } } }, { $replaceRoot: { newRoot: '$latestLocation' } }, { $limit: parseInt(limit) }, { $lookup: { from: 'routes', localField: 'routeId', foreignField: '_id', as: 'route' } }, { $lookup: { from: 'devices', localField: 'deviceId', foreignField: '_id', as: 'device' } }]);
        console.log(`✅ Found ${vehicles.length} vehicles with aggregation`);
        console.log('🚌 First vehicle sample:', vehicles[0] ? JSON.stringify(vehicles[0], null, 2) : 'No vehicles found');
        if (vehicles.length === 0) {
            console.log('🔄 No LocationTracking data found, trying Device fallback');
            const devices = await Device_1.default.find({ isActive: true }).limit(10);
            console.log(`📱 Found ${devices.length} devices as fallback`);
            const fallbackVehicles = devices.map(device => { var _a, _b, _c; return ({ _id: device._id, deviceId: device._id, routeId: ((_a = device.route) === null || _a === void 0 ? void 0 : _a.routeId) || 'unknown', vehicleId: device.deviceId, vehicleNumber: device.vehicleNumber, location: { latitude: ((_b = device.location) === null || _b === void 0 ? void 0 : _b.latitude) || 6.9271, longitude: ((_c = device.location) === null || _c === void 0 ? void 0 : _c.longitude) || 79.8612, accuracy: 5, heading: Math.random() * 360, speed: 20 + Math.random() * 40, altitude: 50 }, routeProgress: { currentWaypoint: 0, distanceCovered: Math.random() * 50, estimatedTimeToDestination: Math.random() * 60, nextStopETA: new Date(Date.now() + Math.random() * 60 * 60000).toISOString(), progressPercentage: Math.random() * 80 + 10 }, passengerLoad: { currentCapacity: Math.floor(Math.random() * 40), maxCapacity: 50, loadPercentage: Math.random() * 80 + 20 }, operationalInfo: { driverInfo: { driverName: `Driver ${device.vehicleNumber}`, contactNumber: '+94771234567' }, tripInfo: { tripId: `TRIP_${device.deviceId}`, departureTime: '08:00', estimatedArrival: new Date(Date.now() + 3600000).toISOString() }, status: ['on_route', 'at_stop', 'delayed'][Math.floor(Math.random() * 3)], delays: { currentDelay: Math.floor(Math.random() * 20), reason: Math.random() > 0.8 ? 'Traffic congestion' : '' } }, environmentalData: { weather: 'sunny', temperature: 28, trafficCondition: 'moderate' }, timestamp: new Date().toISOString() }); });
            console.log(`🔄 Generated ${fallbackVehicles.length} fallback vehicles`);
            res.json({ vehicles: fallbackVehicles, totalVehicles: fallbackVehicles.length, lastUpdate: new Date(), source: 'device_fallback', debug: { totalLocationRecords: totalRecords, activeLocationRecords: activeRecords, recentLocationRecords: recentRecords } });
            return;
        }
        res.json({ vehicles, totalVehicles: vehicles.length, lastUpdate: new Date(), source: 'location_tracking', debug: { totalLocationRecords: totalRecords, activeLocationRecords: activeRecords, recentLocationRecords: recentRecords, filter } });
    }
    catch (error) {
        console.error('❌ Get live locations error:', error);
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.getLiveLocations = getLiveLocations;
// @desc Get vehicles on specific route @route GET /api/tracking/route/:routeId @access Public
const getRouteVehicles = async (req, res) => {
    try {
        const { routeId } = req.params;
        const route = await Route_1.default.findById(routeId);
        if (!route) {
            res.status(404).json({ message: 'Route not found' });
            return;
        }
        const vehicles = await LocationTracking_1.default.getRouteVehicles(route._id);
        const stats = { totalVehicles: vehicles.length, onTime: vehicles.filter(v => v.operationalInfo.delays.currentDelay <= 5).length, delayed: vehicles.filter(v => v.operationalInfo.delays.currentDelay > 5).length, avgDelay: vehicles.length > 0 ? vehicles.reduce((sum, v) => sum + v.operationalInfo.delays.currentDelay, 0) / vehicles.length : 0, avgLoad: vehicles.length > 0 ? vehicles.reduce((sum, v) => sum + v.passengerLoad.loadPercentage, 0) / vehicles.length : 0 };
        res.json({ route: { id: route._id, name: route.name, startLocation: route.startLocation, endLocation: route.endLocation }, vehicles, statistics: stats, lastUpdate: new Date() });
    }
    catch (error) {
        console.error('Get route vehicles error:', error);
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.getRouteVehicles = getRouteVehicles;
// @desc Update vehicle location @route POST /api/tracking/update @access Public (for device updates)
const updateVehicleLocation = async (req, res) => {
    var _a;
    try {
        const { deviceId, vehicleId, location, routeProgress, passengerLoad, operationalInfo, environmentalData } = req.body;
        if (!deviceId || !vehicleId || !location) {
            res.status(400).json({ message: 'Missing required location data' });
            return;
        }
        const device = await Device_1.default.findById(deviceId);
        if (!device) {
            res.status(404).json({ message: 'Device not found' });
            return;
        }
        const route = await Route_1.default.findById((_a = operationalInfo === null || operationalInfo === void 0 ? void 0 : operationalInfo.tripInfo) === null || _a === void 0 ? void 0 : _a.routeId);
        if (!route) {
            res.status(404).json({ message: 'Route not found' });
            return;
        }
        const locationData = new LocationTracking_1.default({ deviceId, routeId: route._id, vehicleId, vehicleNumber: device.vehicleNumber, location, routeProgress: routeProgress || { currentWaypoint: 0, distanceCovered: 0, estimatedTimeToDestination: 0, nextStopETA: new Date(), progressPercentage: 0 }, passengerLoad: passengerLoad || { currentCapacity: 0, maxCapacity: route.vehicleInfo.capacity, boardingCount: 0, alightingCount: 0, loadPercentage: 0 }, operationalInfo: operationalInfo || { driverInfo: { driverId: 'unknown', driverName: 'Unknown Driver', contactNumber: 'N/A' }, tripInfo: { tripId: `TRIP_${Date.now()}`, scheduleId: 'default', departureTime: '00:00', estimatedArrival: new Date() }, status: 'on_route', delays: { currentDelay: 0 } }, environmentalData: environmentalData || { trafficCondition: 'light' } });
        await locationData.save();
        await Device_1.default.findByIdAndUpdate(deviceId, { location: { latitude: location.latitude, longitude: location.longitude, lastUpdated: new Date() }, lastSeen: new Date() });
        res.json({ message: 'Location updated successfully', trackingId: locationData._id, timestamp: locationData.timestamp });
    }
    catch (error) {
        console.error('Update vehicle location error:', error);
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.updateVehicleLocation = updateVehicleLocation;
// @desc Get ETA for user booking @route GET /api/tracking/eta/:bookingId @access Private
const getETAForBooking = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        const { bookingId } = req.params;
        const booking = await Booking_1.default.findById(bookingId).populate('routeId', 'name startLocation endLocation waypoints');
        if (!booking) {
            res.status(404).json({ message: 'Booking not found' });
            return;
        }
        if (booking.userId.toString() !== req.user._id.toString()) {
            res.status(403).json({ message: 'Not authorized to view this booking' });
            return;
        }
        const vehicles = await LocationTracking_1.default.getRouteVehicles(booking.routeId._id);
        if (vehicles.length === 0) {
            res.json({ message: 'No vehicles currently tracked on this route', eta: null, status: 'no_tracking' });
            return;
        }
        const relevantVehicle = vehicles.reduce((best, current) => { if (current.operationalInfo.delays.currentDelay < best.operationalInfo.delays.currentDelay)
            return current; return best; });
        const baseETA = new Date(`${booking.travelDate.toISOString().split('T')[0]}T${booking.departureTime}:00`);
        const estimatedArrival = relevantVehicle.getEstimatedArrival();
        const currentDelay = relevantVehicle.operationalInfo.delays.currentDelay;
        const routeName = booking.routeId.name || 'Unknown Route';
        res.json({ booking: { id: booking._id, bookingId: booking.bookingId, route: routeName, travelDate: booking.travelDate, departureTime: booking.departureTime }, eta: { scheduledDeparture: baseETA, estimatedDeparture: new Date(baseETA.getTime() + (currentDelay * 60 * 1000)), currentDelay: currentDelay, status: currentDelay > 15 ? 'delayed' : currentDelay > 5 ? 'slightly_delayed' : 'on_time' }, vehicle: { vehicleId: relevantVehicle.vehicleId, vehicleNumber: relevantVehicle.vehicleNumber, location: relevantVehicle.location, progress: relevantVehicle.routeProgress, lastUpdate: relevantVehicle.timestamp } });
    }
    catch (error) {
        console.error('Get ETA for booking error:', error);
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.getETAForBooking = getETAForBooking;
// @desc Get vehicle history (Admin) @route GET /api/tracking/history/:vehicleId @access Private (Admin)
const getVehicleHistory = async (req, res) => {
    try {
        const { vehicleId } = req.params;
        const { startDate, endDate, limit = 100 } = req.query;
        const dateFilter = {};
        if (startDate)
            dateFilter.$gte = new Date(startDate);
        if (endDate)
            dateFilter.$lte = new Date(endDate);
        const filter = { vehicleId };
        if (Object.keys(dateFilter).length > 0)
            filter.timestamp = dateFilter;
        const history = await LocationTracking_1.default.find(filter).populate('routeId', 'name startLocation endLocation').sort({ timestamp: -1 }).limit(parseInt(limit));
        const stats = { totalRecords: history.length, avgSpeed: history.length > 0 ? history.reduce((sum, record) => sum + record.location.speed, 0) / history.length : 0, avgDelay: history.length > 0 ? history.reduce((sum, record) => sum + record.operationalInfo.delays.currentDelay, 0) / history.length : 0, totalDistance: history.reduce((sum, record) => sum + record.routeProgress.distanceCovered, 0) };
        res.json({ vehicleId, history, statistics: stats, period: { startDate: startDate || 'all', endDate: endDate || 'all' } });
    }
    catch (error) {
        console.error('Get vehicle history error:', error);
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.getVehicleHistory = getVehicleHistory;
// @desc Get tracking analytics (Admin) @route GET /api/tracking/analytics @access Private (Admin)
const getTrackingAnalytics = async (req, res) => {
    try {
        const { period = '24h', routeId, vehicleType } = req.query;
        let timeRange;
        switch (period) {
            case '1h':
                timeRange = new Date(Date.now() - 60 * 60 * 1000);
                break;
            case '6h':
                timeRange = new Date(Date.now() - 6 * 60 * 60 * 1000);
                break;
            case '24h':
                timeRange = new Date(Date.now() - 24 * 60 * 60 * 1000);
                break;
            case '7d':
                timeRange = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                break;
            default: timeRange = new Date(Date.now() - 24 * 60 * 60 * 1000);
        }
        const matchQuery = { timestamp: { $gte: timeRange }, isActive: true };
        if (routeId)
            matchQuery.routeId = routeId;
        const stats = await LocationTracking_1.default.aggregate([{ $match: matchQuery }, { $group: { _id: null, totalVehicles: { $addToSet: '$vehicleId' }, avgSpeed: { $avg: '$location.speed' }, avgDelay: { $avg: '$operationalInfo.delays.currentDelay' }, avgLoad: { $avg: '$passengerLoad.loadPercentage' }, totalRecords: { $sum: 1 } } }, { $project: { totalVehicles: { $size: '$totalVehicles' }, avgSpeed: { $round: ['$avgSpeed', 1] }, avgDelay: { $round: ['$avgDelay', 1] }, avgLoad: { $round: ['$avgLoad', 1] }, totalRecords: 1 } }]);
        const statusDistribution = await LocationTracking_1.default.aggregate([{ $match: matchQuery }, { $group: { _id: '$operationalInfo.status', count: { $sum: 1 } } }, { $sort: { count: -1 } }]);
        const hourlyVolume = await LocationTracking_1.default.aggregate([{ $match: matchQuery }, { $group: { _id: { hour: { $hour: '$timestamp' }, day: { $dayOfMonth: '$timestamp' } }, count: { $sum: 1 }, uniqueVehicles: { $addToSet: '$vehicleId' } } }, { $project: { hour: '$_id.hour', day: '$_id.day', count: 1, uniqueVehicles: { $size: '$uniqueVehicles' } } }, { $sort: { '_id.day': 1, '_id.hour': 1 } }]);
        res.json({ period, summary: stats[0] || { totalVehicles: 0, avgSpeed: 0, avgDelay: 0, avgLoad: 0, totalRecords: 0 }, statusDistribution, hourlyVolume, generatedAt: new Date() });
    }
    catch (error) {
        console.error('Get tracking analytics error:', error);
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.getTrackingAnalytics = getTrackingAnalytics;
