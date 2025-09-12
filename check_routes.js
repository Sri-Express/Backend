const mongoose = require('mongoose');
const Route = require('./dist/models/Route.js').default;

mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://sri-express:sriexpress2024@sri-express-01.trzicod.mongodb.net/sri_express?retryWrites=true&w=majority')
.then(async () => {
  console.log('📍 Checking routes...');
  const routes = await Route.find({}).select('_id routeId name startLocation.name endLocation.name');
  console.log(`Found ${routes.length} routes:`);
  
  routes.forEach(route => {
    console.log(`Route: ${route.name}`);
    console.log(`  MongoDB ID: ${route._id}`);
    console.log(`  RouteID: ${route.routeId || 'N/A'}`);
    console.log(`  ${route.startLocation.name} → ${route.endLocation.name}`);
    console.log('---');
  });
  
  // Check for the specific route your ESP32 is looking for
  const targetRoute = await Route.findById('68c0dcf350719c991fe9e5d8');
  if (targetRoute) {
    console.log('✅ ESP32 Target Route Found:');
    console.log(`  Name: ${targetRoute.name}`);
    console.log(`  ID: ${targetRoute._id}`);
  } else {
    console.log('❌ ESP32 Target Route NOT FOUND: 68c0dcf350719c991fe9e5d8');
  }
  
  process.exit(0);
})
.catch(err => {
  console.error('Error:', err);
  process.exit(1);
});