const mongoose = require('mongoose');
const Route = require('./dist/models/Route.js').default;

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://sri-express:sriexpress2024@sri-express-01.trzicod.mongodb.net/sri_express?retryWrites=true&w=majority');
    
    const kottawaRoute = await Route.findOne({ name: /Kottawa.*Mount Lavinia/i });
    if (kottawaRoute) {
      console.log('🎯 FOUND KOTTAWA ROUTE:');
      console.log(`Route ID for ESP32: "${kottawaRoute._id}"`);
      console.log(`Route Name: ${kottawaRoute.name}`);
      console.log(`Start: ${kottawaRoute.startLocation.name}`);
      console.log(`End: ${kottawaRoute.endLocation.name}`);
      console.log('');
      console.log('📝 UPDATE YOUR ESP32 CODE:');
      console.log(`const String routeId = "${kottawaRoute._id}";`);
    } else {
      console.log('❌ Kottawa route not found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();