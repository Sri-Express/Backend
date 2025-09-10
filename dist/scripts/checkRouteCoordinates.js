"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/scripts/checkRouteCoordinates.ts - Check existing routes for coordinate data
const mongoose_1 = __importDefault(require("mongoose"));
const Route_1 = __importDefault(require("../models/Route"));
const checkRouteCoordinates = async () => {
    try {
        // Connect to database
        const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://ranawakaramr22:rothila123@sri-express-01.trzicod.mongodb.net/sri_express?retryWrites=true&w=majority';
        await mongoose_1.default.connect(mongoURI);
        console.log('✅ Connected to MongoDB');
        // Get all routes
        const routes = await Route_1.default.find({});
        console.log(`\n📊 Total routes in database: ${routes.length}\n`);
        let routesWithCoordinates = 0;
        let routesWithoutCoordinates = 0;
        let problemRoutes = [];
        routes.forEach((route, index) => {
            var _a, _b, _c, _d, _e, _f;
            console.log(`--- Route ${index + 1}: ${route.name} ---`);
            console.log(`Route ID: ${route.routeId}`);
            console.log(`Status: ${route.approvalStatus} / ${route.status}`);
            // Check start location coordinates
            const hasStartCoords = ((_a = route.startLocation) === null || _a === void 0 ? void 0 : _a.coordinates) &&
                Array.isArray(route.startLocation.coordinates) &&
                route.startLocation.coordinates.length === 2 &&
                route.startLocation.coordinates[0] !== 0 &&
                route.startLocation.coordinates[1] !== 0;
            // Check end location coordinates  
            const hasEndCoords = ((_b = route.endLocation) === null || _b === void 0 ? void 0 : _b.coordinates) &&
                Array.isArray(route.endLocation.coordinates) &&
                route.endLocation.coordinates.length === 2 &&
                route.endLocation.coordinates[0] !== 0 &&
                route.endLocation.coordinates[1] !== 0;
            console.log(`Start Location: ${(_c = route.startLocation) === null || _c === void 0 ? void 0 : _c.name}`);
            console.log(`  Address: ${(_d = route.startLocation) === null || _d === void 0 ? void 0 : _d.address}`);
            console.log(`  Coordinates: ${hasStartCoords ? `✅ [${route.startLocation.coordinates[0]}, ${route.startLocation.coordinates[1]}]` : '❌ Missing or invalid'}`);
            console.log(`End Location: ${(_e = route.endLocation) === null || _e === void 0 ? void 0 : _e.name}`);
            console.log(`  Address: ${(_f = route.endLocation) === null || _f === void 0 ? void 0 : _f.address}`);
            console.log(`  Coordinates: ${hasEndCoords ? `✅ [${route.endLocation.coordinates[0]}, ${route.endLocation.coordinates[1]}]` : '❌ Missing or invalid'}`);
            // Check waypoints
            if (route.waypoints && route.waypoints.length > 0) {
                console.log(`Waypoints: ${route.waypoints.length}`);
                route.waypoints.forEach((waypoint, i) => {
                    const hasWaypointCoords = waypoint.coordinates &&
                        Array.isArray(waypoint.coordinates) &&
                        waypoint.coordinates.length === 2 &&
                        waypoint.coordinates[0] !== 0 &&
                        waypoint.coordinates[1] !== 0;
                    console.log(`  ${i + 1}. ${waypoint.name}: ${hasWaypointCoords ? `✅ [${waypoint.coordinates[0]}, ${waypoint.coordinates[1]}]` : '❌ Missing'}`);
                });
            }
            else {
                console.log(`Waypoints: None`);
            }
            if (hasStartCoords && hasEndCoords) {
                routesWithCoordinates++;
                console.log(`✅ Route has valid coordinates`);
            }
            else {
                routesWithoutCoordinates++;
                console.log(`❌ Route missing coordinates`);
                problemRoutes.push({
                    routeId: route.routeId,
                    name: route.name,
                    missingStart: !hasStartCoords,
                    missingEnd: !hasEndCoords
                });
            }
            console.log(''); // Empty line for readability
        });
        console.log('='.repeat(60));
        console.log('📊 SUMMARY:');
        console.log(`✅ Routes with valid coordinates: ${routesWithCoordinates}`);
        console.log(`❌ Routes with missing coordinates: ${routesWithoutCoordinates}`);
        console.log(`📋 Total routes: ${routes.length}`);
        if (problemRoutes.length > 0) {
            console.log('\n⚠️  PROBLEM ROUTES:');
            problemRoutes.forEach(route => {
                console.log(`  • ${route.name} (${route.routeId})`);
                if (route.missingStart)
                    console.log(`    - Missing start coordinates`);
                if (route.missingEnd)
                    console.log(`    - Missing end coordinates`);
            });
            console.log('\n🔧 RECOMMENDED ACTIONS:');
            console.log('1. Update problem routes with coordinates before implementing filters');
            console.log('2. Add validation to prevent routes without coordinates');
            console.log('3. Consider adding default coordinates for existing routes');
        }
        else {
            console.log('\n🎉 ALL ROUTES HAVE VALID COORDINATES!');
            console.log('✅ Safe to implement province/district filtering');
        }
        // Extract unique location data for province/district analysis
        console.log('\n🗺️  LOCATION ANALYSIS:');
        const locations = new Set();
        routes.forEach(route => {
            var _a, _b;
            if ((_a = route.startLocation) === null || _a === void 0 ? void 0 : _a.address) {
                locations.add(route.startLocation.address);
            }
            if ((_b = route.endLocation) === null || _b === void 0 ? void 0 : _b.address) {
                locations.add(route.endLocation.address);
            }
        });
        console.log(`Unique locations found: ${locations.size}`);
        Array.from(locations).forEach(location => {
            console.log(`  • ${location}`);
        });
    }
    catch (error) {
        console.error('❌ Error checking routes:', error);
    }
    finally {
        await mongoose_1.default.connection.close();
        console.log('📝 Database connection closed');
    }
};
// Run the script if called directly
if (require.main === module) {
    checkRouteCoordinates()
        .then(() => {
        console.log('🎉 Route coordinate check completed');
        process.exit(0);
    })
        .catch((error) => {
        console.error('💥 Script failed:', error);
        process.exit(1);
    });
}
exports.default = checkRouteCoordinates;
