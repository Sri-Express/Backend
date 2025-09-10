// src/scripts/removeKandyRoute.ts - Remove Colombo to Kandy route
import mongoose from 'mongoose';
import Route from '../models/Route';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const removeKandyRoute = async () => {
  try {
    // Connect to database
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sri_express';
    console.log('🔗 Connecting to MongoDB...');
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find and remove Colombo to Kandy routes
    const kandyRoutes = await Route.find({
      $or: [
        { name: /Kandy/i },
        { routeId: "RT001CBK" },
        { "startLocation.name": /Kandy/i },
        { "endLocation.name": /Kandy/i }
      ]
    });

    console.log(`🔍 Found ${kandyRoutes.length} Kandy-related routes to remove:`);
    
    if (kandyRoutes.length > 0) {
      kandyRoutes.forEach(route => {
        console.log(`   - ${route.name} (ID: ${route.routeId || route._id})`);
      });

      // Remove the routes
      const deleteResult = await Route.deleteMany({
        $or: [
          { name: /Kandy/i },
          { routeId: "RT001CBK" },
          { "startLocation.name": /Kandy/i },
          { "endLocation.name": /Kandy/i }
        ]
      });

      console.log(`✅ Successfully removed ${deleteResult.deletedCount} Kandy routes`);
    } else {
      console.log('ℹ️  No Kandy routes found to remove');
    }

    // Show remaining routes
    const remainingRoutes = await Route.find({}, 'name routeId startLocation.name endLocation.name');
    console.log(`\n📍 Remaining routes (${remainingRoutes.length}):`);
    remainingRoutes.forEach(route => {
      console.log(`   🚌 ${route.name}`);
      console.log(`      From: ${route.startLocation.name} → To: ${route.endLocation.name}`);
      console.log(`      Route ID: ${route.routeId || route._id}\n`);
    });

  } catch (error) {
    console.error('❌ Error removing Kandy route:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Run the script if called directly
if (require.main === module) {
  removeKandyRoute()
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export default removeKandyRoute;