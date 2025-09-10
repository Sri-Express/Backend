// cleanup_duplicates.js - Remove duplicate bus assignments
const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/sriexpress')
  .then(() => {
    console.log('Connected to MongoDB');
    removeDuplicates();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Device Schema (simplified)
const DeviceSchema = new mongoose.Schema({
  deviceId: String,
  vehicleNumber: String,
  vehicleType: String,
  status: String,
  isActive: Boolean,
  createdAt: Date,
  // ... other fields
}, { strict: false });

const Device = mongoose.model('Device', DeviceSchema);

async function removeDuplicates() {
  try {
    console.log('🔍 Finding duplicate vehicles...');
    
    // Find all devices
    const devices = await Device.find({ isActive: true }).sort({ createdAt: 1 });
    console.log(`Found ${devices.length} active devices`);
    
    // Group by vehicle number
    const vehicleGroups = {};
    devices.forEach(device => {
      const vehicleNum = device.vehicleNumber;
      if (!vehicleGroups[vehicleNum]) {
        vehicleGroups[vehicleNum] = [];
      }
      vehicleGroups[vehicleNum].push(device);
    });
    
    // Find and remove duplicates
    let duplicatesRemoved = 0;
    
    for (const [vehicleNum, deviceList] of Object.entries(vehicleGroups)) {
      if (deviceList.length > 1) {
        console.log(`\n🚨 Found ${deviceList.length} duplicates for vehicle ${vehicleNum}:`);
        
        // Keep the most recent one, remove the rest
        const sortedDevices = deviceList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const keepDevice = sortedDevices[0];
        const removeDevices = sortedDevices.slice(1);
        
        console.log(`   ✅ Keeping: ${keepDevice._id} (created: ${keepDevice.createdAt})`);
        
        for (const device of removeDevices) {
          console.log(`   ❌ Removing: ${device._id} (created: ${device.createdAt})`);
          await Device.findByIdAndUpdate(device._id, { isActive: false });
          duplicatesRemoved++;
        }
      }
    }
    
    console.log(`\n✅ Cleanup complete! Removed ${duplicatesRemoved} duplicate devices.`);
    
    // Show remaining devices
    console.log('\n📊 Remaining active devices:');
    const remainingDevices = await Device.find({ isActive: true }).sort({ vehicleNumber: 1 });
    remainingDevices.forEach(device => {
      console.log(`   - Vehicle ${device.vehicleNumber} (${device._id}) - Status: ${device.status}`);
    });
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}