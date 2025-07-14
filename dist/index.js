"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
// Load environment variables
dotenv_1.default.config();
// Import routes
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
// Import middleware
const errorMiddleware_1 = require("./middleware/errorMiddleware");
// Import DB connection
const db_1 = __importDefault(require("./config/db"));
// Connect to MongoDB
(0, db_1.default)();
// Initialize express app
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Define allowed origins
const allowedOrigins = [
    'https://sri-express.mehara.io',
    'https://clownfish-app-ymy8k.ondigitalocean.app',
    'http://localhost:3000'
];
// Configure CORS - keep it simple
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        }
        else {
            callback(null, true); // For development: allow all origins
            // For production: callback(new Error('Not allowed by CORS'), false);
        }
    },
    credentials: true
}));
// Apply other middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: false }));
// Basic route for testing
app.get('/', (req, res) => {
    res.send('ශ්‍රී Express API is running');
});
// Routes
app.use('/api/auth', authRoutes_1.default);
// Error handling middleware
app.use(errorMiddleware_1.notFound);
app.use(errorMiddleware_1.errorHandler);
// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`http://localhost:${PORT}`);
});
