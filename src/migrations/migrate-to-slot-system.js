// Migration script to convert from old schedule system to new slot-based system
// Run this script once to migrate existing data

const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Define the RouteAssignment schema inline for migration
const RouteAssignmentSchema = new mongoose.Schema({
  fleetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Fleet', required: true },
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true },
  routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true },
  assignedAt: { type: Date, default: Date.now },
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'suspended', 'pending', 'approved', 'rejected'], 
    default: 'active' 
  },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  schedules: [{
    startTime: String,
    endTime: String,
    daysOfWeek: [String],
    isActive: Boolean
  }],
  performance: {
    totalTrips: { type: Number, default: 0 },
    completedTrips: { type: Number, default: 0 },
    avgRating: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 }
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

async function migrateToSlotSystem() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('🔄 Connected to MongoDB. Starting migration...');

    // Step 1: Remove schedules field from existing RouteAssignments
    console.log('📋 Step 1: Removing old schedule data from RouteAssignments...');
    
    const RouteAssignment = mongoose.model('RouteAssignment', RouteAssignmentSchema);
    
    // Remove schedules field from all existing route assignments
    const updateResult = await RouteAssignment.updateMany(
      {}, // Match all documents
      {
        $unset: {
          schedules: "" // Remove the schedules field completely
        }
      }
    );
    
    console.log(`✅ Updated ${updateResult.modifiedCount} RouteAssignments - removed old schedule data`);

    // Step 2: Add new status field with default values
    console.log('📋 Step 2: Adding approval status to RouteAssignments...');
    
    const statusUpdateResult = await RouteAssignment.updateMany(
      {
        status: { $in: ['active', 'inactive', 'suspended'] } // Old status values
      },
      {
        $set: {
          status: 'approved' // Convert old 'active' to 'approved'
        }
      }
    );
    
    console.log(`✅ Updated ${statusUpdateResult.modifiedCount} RouteAssignments - added approval status`);

    // Step 3: Clean up any orphaned data
    console.log('📋 Step 3: Cleaning up orphaned assignments...');
    
    const cleanupResult = await RouteAssignment.deleteMany({
      $or: [
        { vehicleId: null },
        { routeId: null },
        { fleetId: null }
      ]
    });
    
    console.log(`✅ Cleaned up ${cleanupResult.deletedCount} orphaned assignments`);

    // Step 4: Create indexes for new slot collections (will be created when first documents are inserted)
    console.log('📋 Step 4: Migration completed successfully!');
    
    console.log('\n🎉 Migration Summary:');
    console.log(`- Removed schedule data from ${updateResult.modifiedCount} assignments`);
    console.log(`- Updated status for ${statusUpdateResult.modifiedCount} assignments`);
    console.log(`- Cleaned up ${cleanupResult.deletedCount} orphaned assignments`);
    console.log('\n📝 Next steps:');
    console.log('1. Use the new RouteSlot model to create time slots for each route');
    console.log('2. Use the new SlotAssignment model for vehicle-to-slot assignments');
    console.log('3. Update your frontend to use the new slot-based system');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateToSlotSystem();
}

module.exports = migrateToSlotSystem;