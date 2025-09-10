"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/scripts/deleteRoute255.ts - Safely delete route "255" and check dependencies
const mongoose_1 = __importDefault(require("mongoose"));
const Route_1 = __importDefault(require("../models/Route"));
const deleteRoute255 = async () => {
    var _a, _b, _c, _d;
    try {
        // Connect to database
        const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://ranawakaramr22:rothila123@sri-express-01.trzicod.mongodb.net/sri_express?retryWrites=true&w=majority';
        await mongoose_1.default.connect(mongoURI);
        console.log('✅ Connected to MongoDB');
        // Find the problematic route
        const route255 = await Route_1.default.findOne({
            $or: [
                { name: '255' },
                { routeId: 'RT1756527624120460' }
            ]
        });
        if (!route255) {
            console.log('❌ Route "255" not found');
            return;
        }
        console.log('📍 Found Route "255":');
        console.log(`  Route ID: ${route255.routeId}`);
        console.log(`  Name: ${route255.name}`);
        console.log(`  Status: ${route255.approvalStatus} / ${route255.status}`);
        console.log(`  Start: ${(_a = route255.startLocation) === null || _a === void 0 ? void 0 : _a.name} (${(_b = route255.startLocation) === null || _b === void 0 ? void 0 : _b.coordinates})`);
        console.log(`  End: ${(_c = route255.endLocation) === null || _c === void 0 ? void 0 : _c.name} (${(_d = route255.endLocation) === null || _d === void 0 ? void 0 : _d.coordinates})`);
        // Check for any related data that might be affected
        console.log('\n🔍 Checking for related data...');
        // Check if any vehicles are assigned to this route
        const Vehicle = mongoose_1.default.model('Vehicle', new mongoose_1.default.Schema({}, { strict: false }));
        const assignedVehicles = await Vehicle.find({ routeId: route255._id }).catch(() => []);
        console.log(`📋 Vehicles assigned to this route: ${assignedVehicles.length}`);
        // Check for bookings on this route
        const Booking = mongoose_1.default.model('Booking', new mongoose_1.default.Schema({}, { strict: false }));
        const routeBookings = await Booking.find({ routeId: route255._id }).catch(() => []);
        console.log(`🎫 Bookings for this route: ${routeBookings.length}`);
        // Check for location tracking data
        const LocationTracking = mongoose_1.default.model('LocationTracking', new mongoose_1.default.Schema({}, { strict: false }));
        const trackingData = await LocationTracking.find({ routeId: route255.routeId }).catch(() => []);
        console.log(`📡 GPS tracking records: ${trackingData.length}`);
        // Check route assignments
        const RouteAssignment = mongoose_1.default.model('RouteAssignment', new mongoose_1.default.Schema({}, { strict: false }));
        const routeAssignments = await RouteAssignment.find({ routeId: route255._id }).catch(() => []);
        console.log(`👥 Route assignments: ${routeAssignments.length}`);
        console.log('\n⚠️  IMPACT ANALYSIS:');
        if (assignedVehicles.length > 0) {
            console.log('📋 Vehicles will be unassigned automatically');
            assignedVehicles.forEach((vehicle, index) => {
                console.log(`  ${index + 1}. Vehicle ${vehicle.vehicleNumber || vehicle._id} will lose route assignment`);
            });
        }
        if (routeBookings.length > 0) {
            console.log('🎫 Existing bookings will need to be handled:');
            routeBookings.forEach((booking, index) => {
                console.log(`  ${index + 1}. Booking ${booking._id} - Status: ${booking.status}`);
            });
        }
        if (trackingData.length > 0) {
            console.log('📡 GPS tracking data will remain (historical)');
        }
        if (routeAssignments.length > 0) {
            console.log('👥 Route assignments will be removed');
        }
        console.log('\n✅ PROCEEDING WITH DELETION:');
        console.log('   - Will delete ALL bookings (as requested)');
        console.log('   - Vehicles will automatically unassign');
        console.log('   - Historical tracking data preserved');
        // Confirm deletion
        console.log('\n🗑️  DELETING ROUTE...');
        // Delete related data first (cascade delete)
        if (routeAssignments.length > 0) {
            await RouteAssignment.deleteMany({ routeId: route255._id });
            console.log(`✅ Deleted ${routeAssignments.length} route assignments`);
        }
        // Update vehicles to unassign them
        if (assignedVehicles.length > 0) {
            await Vehicle.updateMany({ routeId: route255._id }, { $unset: { routeId: 1 } });
            console.log(`✅ Unassigned ${assignedVehicles.length} vehicles`);
        }
        // Delete ALL bookings for this route (including active ones)
        if (routeBookings.length > 0) {
            const deletedBookings = await Booking.deleteMany({
                routeId: route255._id
            });
            console.log(`✅ Deleted ${deletedBookings.deletedCount} bookings (including active ones)`);
        }
        // Finally, delete the route
        await Route_1.default.findByIdAndDelete(route255._id);
        console.log('✅ Route "255" deleted successfully');
        console.log('\n🎉 CLEANUP COMPLETE:');
        console.log('   ✅ Route deleted');
        console.log('   ✅ Vehicles unassigned');
        console.log('   ✅ Related data cleaned up');
        console.log('   ✅ Database is now clean for filtering implementation');
    }
    catch (error) {
        console.error('❌ Error deleting route:', error);
    }
    finally {
        await mongoose_1.default.connection.close();
        console.log('📝 Database connection closed');
    }
};
// Run the script if called directly
if (require.main === module) {
    deleteRoute255()
        .then(() => {
        console.log('🎉 Route deletion completed');
        process.exit(0);
    })
        .catch((error) => {
        console.error('💥 Script failed:', error);
        process.exit(1);
    });
}
exports.default = deleteRoute255;
