"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/services/gpsSimulation.ts - FIXED TYPESCRIPT VERSION
const LocationTracking_1 = __importDefault(require("../models/LocationTracking"));
class AdvancedGPSSimulation {
    constructor() {
        this.simulatedVehicles = new Map();
        this.isRunning = false;
        this.intervalId = null;
        this.speedMultiplier = 1;
        this.routes = this.initializeRoutes();
        this.vehicles = this.initializeVehicles();
    }
    // REAL SRI LANKAN ROUTES WITH ACCURATE GPS COORDINATES
    initializeRoutes() {
        return {
            'ROUTE_COL_KDY': { name: 'Colombo → Kandy Express', coordinates: [{ lat: 6.9271, lng: 79.8612, name: 'Colombo Fort', stop: true }, { lat: 6.9319, lng: 79.8478, name: 'Pettah', stop: true }, { lat: 6.9147, lng: 79.9739, name: 'Kottawa', stop: true }, { lat: 6.8892, lng: 80.0119, name: 'Maharagama', stop: false }, { lat: 6.8211, lng: 80.0409, name: 'Homagama', stop: true }, { lat: 6.7648, lng: 80.1234, name: 'Padukka', stop: true }, { lat: 6.6934, lng: 80.2089, name: 'Avissawella', stop: false }, { lat: 6.7891, lng: 80.4567, name: 'Yatiyantota', stop: false }, { lat: 6.9497, lng: 80.6337, name: 'Kegalle', stop: true }, { lat: 7.0819, lng: 80.6992, name: 'Mawanella', stop: false }, { lat: 7.2906, lng: 80.6337, name: 'Kandy Central', stop: true }], estimatedDuration: 180, distance: 116 },
            'ROUTE_COL_GAL': { name: 'Colombo → Galle Highway', coordinates: [{ lat: 6.9271, lng: 79.8612, name: 'Colombo Fort', stop: true }, { lat: 6.8485, lng: 79.8848, name: 'Mount Lavinia', stop: true }, { lat: 6.7648, lng: 79.9012, name: 'Kalutara', stop: true }, { lat: 6.5889, lng: 79.9789, name: 'Beruwala', stop: false }, { lat: 6.4789, lng: 79.9856, name: 'Aluthgama', stop: true }, { lat: 6.3567, lng: 80.0234, name: 'Bentota', stop: false }, { lat: 6.2234, lng: 80.0567, name: 'Ambalangoda', stop: true }, { lat: 6.1123, lng: 80.0789, name: 'Hikkaduwa', stop: false }, { lat: 6.0535, lng: 80.2210, name: 'Galle Fort', stop: true }], estimatedDuration: 150, distance: 119 },
            'ROUTE_COL_JAF': { name: 'Colombo → Jaffna Intercity', coordinates: [{ lat: 6.9271, lng: 79.8612, name: 'Colombo Fort', stop: true }, { lat: 7.2906, lng: 80.6337, name: 'Kandy', stop: true }, { lat: 7.4818, lng: 80.3609, name: 'Matale', stop: false }, { lat: 7.9403, lng: 80.7718, name: 'Dambulla', stop: true }, { lat: 8.3114, lng: 80.4037, name: 'Anuradhapura', stop: true }, { lat: 8.5622, lng: 80.5036, name: 'Medawachchiya', stop: false }, { lat: 8.8271, lng: 80.6895, name: 'Vavuniya', stop: true }, { lat: 9.1247, lng: 80.7891, name: 'Kilinochchi', stop: false }, { lat: 9.6615, lng: 80.0255, name: 'Jaffna Central', stop: true }], estimatedDuration: 480, distance: 396 },
            'ROUTE_KDY_COL': { name: 'Kandy → Colombo Return', coordinates: [{ lat: 7.2906, lng: 80.6337, name: 'Kandy Central', stop: true }, { lat: 7.0819, lng: 80.6992, name: 'Mawanella', stop: false }, { lat: 6.9497, lng: 80.6337, name: 'Kegalle', stop: true }, { lat: 6.7891, lng: 80.4567, name: 'Yatiyantota', stop: false }, { lat: 6.7648, lng: 80.1234, name: 'Padukka', stop: true }, { lat: 6.8211, lng: 80.0409, name: 'Homagama', stop: true }, { lat: 6.9147, lng: 79.9739, name: 'Kottawa', stop: true }, { lat: 6.9319, lng: 79.8478, name: 'Pettah', stop: true }, { lat: 6.9271, lng: 79.8612, name: 'Colombo Fort', stop: true }], estimatedDuration: 180, distance: 116 },
            'ROUTE_GAL_COL': { name: 'Galle → Colombo Express', coordinates: [{ lat: 6.0535, lng: 80.2210, name: 'Galle Fort', stop: true }, { lat: 6.1123, lng: 80.0789, name: 'Hikkaduwa', stop: false }, { lat: 6.2234, lng: 80.0567, name: 'Ambalangoda', stop: true }, { lat: 6.3567, lng: 80.0234, name: 'Bentota', stop: false }, { lat: 6.4789, lng: 79.9856, name: 'Aluthgama', stop: true }, { lat: 6.7648, lng: 79.9012, name: 'Kalutara', stop: true }, { lat: 6.8485, lng: 79.8848, name: 'Mount Lavinia', stop: true }, { lat: 6.9271, lng: 79.8612, name: 'Colombo Fort', stop: true }], estimatedDuration: 150, distance: 119 }
        };
    }
    // ADVANCED VEHICLE FLEET WITH REALISTIC DATA
    initializeVehicles() {
        return [
            { vehicleId: 'BUS_NCB_1234', vehicleNumber: 'NCB-1234', routeKey: 'ROUTE_COL_KDY', type: 'bus', capacity: 45, operator: 'National Transport Commission', driver: { name: 'Sunil Perera', id: 'D001', phone: '+94771234567' }, currentPassengers: 28, currentIndex: 0, progress: 0, speed: 45, status: 'on_route', departureTime: '06:30', passengers: [], lastStop: null, nextStop: null },
            { vehicleId: 'BUS_NCB_5678', vehicleNumber: 'NCB-5678', routeKey: 'ROUTE_COL_GAL', type: 'bus', capacity: 52, operator: 'South Western Transport', driver: { name: 'Kamal Silva', id: 'D002', phone: '+94772345678' }, currentPassengers: 35, currentIndex: 0, progress: 0, speed: 55, status: 'on_route', departureTime: '07:00', passengers: [], lastStop: null, nextStop: null },
            { vehicleId: 'TRAIN_T001', vehicleNumber: 'T-001', routeKey: 'ROUTE_COL_JAF', type: 'train', capacity: 200, operator: 'Sri Lanka Railways', driver: { name: 'Mahinda Rajapaksa', id: 'T001', phone: '+94773456789' }, currentPassengers: 156, currentIndex: 0, progress: 0, speed: 80, status: 'on_route', departureTime: '05:45', passengers: [], lastStop: null, nextStop: null },
            { vehicleId: 'BUS_NCB_9012', vehicleNumber: 'NCB-9012', routeKey: 'ROUTE_KDY_COL', type: 'bus', capacity: 48, operator: 'Hill Country Transport', driver: { name: 'Chaminda Fernando', id: 'D003', phone: '+94774567890' }, currentPassengers: 22, currentIndex: 0, progress: 0, speed: 42, status: 'on_route', departureTime: '08:15', passengers: [], lastStop: null, nextStop: null },
            { vehicleId: 'BUS_NCB_3456', vehicleNumber: 'NCB-3456', routeKey: 'ROUTE_GAL_COL', type: 'bus', capacity: 50, operator: 'Coastal Express', driver: { name: 'Nimal Wickramasinghe', id: 'D004', phone: '+94775678901' }, currentPassengers: 41, currentIndex: 0, progress: 0, speed: 48, status: 'on_route', departureTime: '09:30', passengers: [], lastStop: null, nextStop: null }
        ];
    }
    // ADVANCED POSITION INTERPOLATION WITH REALISTIC CURVES
    interpolatePosition(start, end, progress, smoothing = 0.1) {
        const smoothProgress = this.easeInOutCubic(progress);
        const lat = start.lat + (end.lat - start.lat) * smoothProgress;
        const lng = start.lng + (end.lng - start.lng) * smoothProgress;
        const jitter = smoothing * 0.001;
        return { lat: lat + (Math.random() - 0.5) * jitter, lng: lng + (Math.random() - 0.5) * jitter };
    }
    // REALISTIC EASING FUNCTION FOR SMOOTH MOVEMENT
    easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    // CALCULATE REALISTIC HEADING BETWEEN TWO POINTS
    calculateHeading(start, end) { const dLng = (end.lng - start.lng) * Math.PI / 180; const lat1 = start.lat * Math.PI / 180; const lat2 = end.lat * Math.PI / 180; const y = Math.sin(dLng) * Math.cos(lat2); const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng); return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360; }
    // REALISTIC SPEED VARIATION BASED ON CONDITIONS
    getRealisticSpeed(baseSpeed, vehicleType, isAtStop, trafficCondition, weather) {
        let speed = baseSpeed;
        if (isAtStop)
            return 0;
        if (vehicleType === 'train')
            speed *= 1.5;
        else if (vehicleType === 'bus')
            speed *= (0.8 + Math.random() * 0.4);
        switch (trafficCondition) {
            case 'heavy':
                speed *= 0.4;
                break;
            case 'moderate':
                speed *= 0.7;
                break;
            case 'light':
                speed *= 0.9;
                break;
            default: speed *= 1.0;
        }
        if (weather === 'rain')
            speed *= 0.8;
        else if (weather === 'storm')
            speed *= 0.6;
        return Math.max(5, speed + (Math.random() - 0.5) * 10);
    }
    // REALISTIC PASSENGER LOAD SIMULATION
    simulatePassengerChanges(vehicle, isAtStop) {
        if (!isAtStop)
            return;
        const maxChange = Math.min(8, Math.floor(vehicle.capacity * 0.15));
        const alighting = Math.floor(Math.random() * Math.min(vehicle.currentPassengers, maxChange));
        const boarding = Math.floor(Math.random() * Math.min(vehicle.capacity - vehicle.currentPassengers + alighting, maxChange));
        vehicle.currentPassengers = Math.max(0, Math.min(vehicle.capacity, vehicle.currentPassengers - alighting + boarding));
        vehicle.boardingCount = boarding;
        vehicle.alightingCount = alighting;
    }
    // WEATHER & TRAFFIC SIMULATION
    getEnvironmentalConditions() {
        const weather = ['sunny', 'cloudy', 'light_rain', 'rain'][Math.floor(Math.random() * 4)];
        const traffic = ['light', 'moderate', 'heavy'][Math.floor(Math.random() * 3)];
        const temperature = 24 + Math.random() * 8;
        return { weather, traffic, temperature };
    }
    // DELAY SIMULATION WITH REALISTIC REASONS
    simulateDelays(vehicle) {
        const delayReasons = ['Traffic congestion', 'Mechanical issue', 'Weather conditions', 'Passenger loading', 'Road construction', 'Signal failure'];
        if (Math.random() < 0.05) {
            vehicle.delays = { currentDelay: Math.floor(Math.random() * 20) + 5, reason: delayReasons[Math.floor(Math.random() * delayReasons.length)], reportedAt: new Date() };
            vehicle.status = vehicle.delays.currentDelay > 15 ? 'delayed' : 'on_route';
        }
        else if (vehicle.delays && Math.random() < 0.3) {
            vehicle.delays.currentDelay = Math.max(0, vehicle.delays.currentDelay - 1);
            if (vehicle.delays.currentDelay === 0) {
                vehicle.status = 'on_route';
                vehicle.delays = { currentDelay: 0 };
            }
        }
    }
    // MAIN SIMULATION UPDATE LOOP
    updateVehiclePositions() {
        this.vehicles.forEach(vehicle => {
            var _a;
            const route = this.routes[vehicle.routeKey];
            if (!route)
                return;
            const coordinates = route.coordinates;
            const currentIndex = vehicle.currentIndex;
            if (currentIndex >= coordinates.length - 1) {
                vehicle.currentIndex = 0;
                vehicle.progress = 0;
                vehicle.currentPassengers = Math.floor(Math.random() * vehicle.capacity * 0.3);
                return;
            }
            const currentStop = coordinates[currentIndex];
            const nextStop = coordinates[currentIndex + 1];
            const isAtStop = currentStop.stop && vehicle.progress < 0.1;
            if (isAtStop && Math.random() < 0.3) {
                vehicle.status = 'at_stop';
                this.simulatePassengerChanges(vehicle, true);
            }
            else {
                vehicle.status = ((_a = vehicle.delays) === null || _a === void 0 ? void 0 : _a.currentDelay) && vehicle.delays.currentDelay > 5 ? 'delayed' : 'on_route';
            }
            const environmental = this.getEnvironmentalConditions();
            const currentSpeed = this.getRealisticSpeed(vehicle.speed, vehicle.type, isAtStop, environmental.traffic, environmental.weather);
            vehicle.progress += (currentSpeed * this.speedMultiplier * 0.001);
            if (vehicle.progress >= 1) {
                vehicle.currentIndex++;
                vehicle.progress = 0;
                if (currentStop.stop) {
                    this.simulatePassengerChanges(vehicle, true);
                }
            }
            // *** FIXED: Create complete VehiclePosition object ***
            const basePosition = this.interpolatePosition(currentStop, nextStop, vehicle.progress);
            vehicle.currentPosition = {
                lat: basePosition.lat,
                lng: basePosition.lng,
                accuracy: 3 + Math.random() * 7,
                speed: currentSpeed,
                heading: this.calculateHeading(currentStop, nextStop)
            };
            vehicle.lastUpdate = new Date();
            vehicle.environmental = environmental;
            vehicle.lastStop = currentStop.name;
            vehicle.nextStop = nextStop.name;
            this.simulateDelays(vehicle);
            this.updateDatabaseRecord(vehicle, route).catch(err => console.error('Database update error:', err));
        });
    }
    // DATABASE UPDATE WITH COMPREHENSIVE DATA
    async updateDatabaseRecord(vehicle, route) {
        var _a, _b, _c;
        try {
            const locationData = { deviceId: vehicle.vehicleId, routeId: vehicle.routeKey, vehicleId: vehicle.vehicleId, vehicleNumber: vehicle.vehicleNumber, location: { latitude: vehicle.currentPosition.lat, longitude: vehicle.currentPosition.lng, accuracy: vehicle.currentPosition.accuracy, heading: vehicle.currentPosition.heading, speed: vehicle.currentPosition.speed, altitude: 50 + Math.random() * 200 }, routeProgress: { currentWaypoint: vehicle.currentIndex, distanceCovered: (vehicle.currentIndex + vehicle.progress) * (route.distance / route.coordinates.length), estimatedTimeToDestination: Math.max(5, (route.coordinates.length - vehicle.currentIndex - vehicle.progress) * 15), nextStopETA: new Date(Date.now() + Math.random() * 30 * 60000), progressPercentage: ((vehicle.currentIndex + vehicle.progress) / route.coordinates.length) * 100 }, passengerLoad: { currentCapacity: vehicle.currentPassengers, maxCapacity: vehicle.capacity, boardingCount: vehicle.boardingCount || 0, alightingCount: vehicle.alightingCount || 0, loadPercentage: (vehicle.currentPassengers / vehicle.capacity) * 100 }, operationalInfo: { driverInfo: { driverId: vehicle.driver.id, driverName: vehicle.driver.name, contactNumber: vehicle.driver.phone }, tripInfo: { tripId: `${vehicle.vehicleId}_${Date.now()}`, scheduleId: vehicle.routeKey, departureTime: vehicle.departureTime, estimatedArrival: new Date(Date.now() + route.estimatedDuration * 60000) }, status: vehicle.status, delays: vehicle.delays || { currentDelay: 0 } }, environmentalData: { weather: ((_a = vehicle.environmental) === null || _a === void 0 ? void 0 : _a.weather) || 'sunny', temperature: ((_b = vehicle.environmental) === null || _b === void 0 ? void 0 : _b.temperature) || 26, trafficCondition: ((_c = vehicle.environmental) === null || _c === void 0 ? void 0 : _c.traffic) || 'light' }, timestamp: new Date(), isActive: true };
            await LocationTracking_1.default.findOneAndUpdate({ vehicleId: vehicle.vehicleId }, locationData, { upsert: true, new: true });
        }
        catch (error) {
            console.error('Database update failed:', error);
        }
    }
    // SIMULATION CONTROL METHODS
    async startSimulation() { if (this.isRunning)
        return; this.isRunning = true; this.intervalId = setInterval(() => this.updateVehiclePositions(), 2000 / this.speedMultiplier); console.log('🚀 Advanced GPS Simulation started with', this.vehicles.length, 'vehicles'); }
    stopSimulation() { if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
    } this.isRunning = false; console.log('⏹️ GPS Simulation stopped'); }
    setSpeed(multiplier) { this.speedMultiplier = Math.max(0.1, Math.min(10, multiplier)); if (this.isRunning) {
        this.stopSimulation();
        this.startSimulation();
    } }
    // GET SIMULATION STATUS
    getStatus() { return { isRunning: this.isRunning, vehicleCount: this.vehicles.length, speedMultiplier: this.speedMultiplier, routes: Object.keys(this.routes).length, lastUpdate: new Date() }; }
    // GET VEHICLE DETAILS
    getVehicleDetails() { return this.vehicles.map(v => ({ ...v, route: this.routes[v.routeKey] })); }
}
exports.default = new AdvancedGPSSimulation();
