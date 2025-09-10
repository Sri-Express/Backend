// src/scripts/deleteRoute255.ts - Safely delete route "255" and check dependencies
import mongoose from 'mongoose';
import Route from '../models/Route';

const deleteRoute255 = async () => {
  try {
    // Connect to database
    const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://ranawakaramr22:rothila123@sri-express-01.trzicod.mongodb.net/sri_express?retryWrites=true&w=majority';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Find the problematic route
    const route255 = await Route.findOne({ 
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
    console.log(`  Start: ${route255.startLocation?.name} (${route255.startLocation?.coordinates})`);
    console.log(`  End: ${route255.endLocation?.name} (${route255.endLocation?.coordinates})`);

    // Check for any related data that might be affected
    console.log('\n🔍 Checking for related data...');

    // Check if any vehicles are assigned to this route
    const Vehicle = mongoose.model('Vehicle', new mongoose.Schema({}, { strict: false }));
    const assignedVehicles = await Vehicle.find({ routeId: route255._id }).catch(() => []);
    console.log(`📋 Vehicles assigned to this route: ${assignedVehicles.length}`);

    // Check for bookings on this route
    const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false }));
    const routeBookings = await Booking.find({ routeId: route255._id }).catch(() => []);
    console.log(`🎫 Bookings for this route: ${routeBookings.length}`);

    // Check for location tracking data
    const LocationTracking = mongoose.model('LocationTracking', new mongoose.Schema({}, { strict: false }));
    const trackingData = await LocationTracking.find({ routeId: route255.routeId }).catch(() => []);
    console.log(`📡 GPS tracking records: ${trackingData.length}`);

    // Check route assignments
    const RouteAssignment = mongoose.model('RouteAssignment', new mongoose.Schema({}, { strict: false }));
    const routeAssignments = await RouteAssignment.find({ routeId: route255._id }).catch(() => []);
    console.log(`👥 Route assignments: ${routeAssignments.length}`);

    console.log('\n⚠️  IMPACT ANALYSIS:');
    if (assignedVehicles.length > 0) {
      console.log('📋 Vehicles will be unassigned automatically');
      assignedVehicles.forEach((vehicle: any, index: number) => {
        console.log(`  ${index + 1}. Vehicle ${vehicle.vehicleNumber || vehicle._id} will lose route assignment`);
      });
    }

    if (routeBookings.length > 0) {
      console.log('🎫 Existing bookings will need to be handled:');
      routeBookings.forEach((booking: any, index: number) => {
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
      await Vehicle.updateMany(
        { routeId: route255._id },
        { $unset: { routeId: 1 } }
      );
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
    await Route.findByIdAndDelete(route255._id);
    console.log('✅ Route "255" deleted successfully');

    console.log('\n🎉 CLEANUP COMPLETE:');
    console.log('   ✅ Route deleted');
    console.log('   ✅ Vehicles unassigned');
    console.log('   ✅ Related data cleaned up');
    console.log('   ✅ Database is now clean for filtering implementation');

  } catch (error) {
    console.error('❌ Error deleting route:', error);
  } finally {
    await mongoose.connection.close();
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

export default deleteRoute255;