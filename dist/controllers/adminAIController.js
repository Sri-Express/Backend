"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAILogs = exports.updateModuleConfig = exports.getAllTrainingJobs = exports.getTrainingStatus = exports.startTraining = exports.toggleAIModule = exports.getAIModule = exports.getAISystemOverview = void 0;
// Mock data storage (in real implementation, this would be database)
let mockModules = [
    {
        id: 'arrival-predictor',
        name: 'Arrival Time Predictor',
        description: 'Predicts bus/train arrival times using traffic and historical data',
        status: 'active',
        accuracy: 87.5,
        lastTrained: new Date('2025-01-15T10:30:00Z'),
        version: '2.1.3',
        type: 'prediction',
        config: {
            autoRetrain: true,
            confidenceThreshold: 0.85,
            trainingInterval: 24,
            dataPoints: 10000
        },
        performance: {
            totalPredictions: 45230,
            successfulPredictions: 39576,
            avgResponseTime: 120,
            lastPrediction: new Date()
        },
        resources: {
            cpuUsage: 15.2,
            memoryUsage: 256,
            gpuUsage: 45.8
        }
    },
    {
        id: 'route-optimizer',
        name: 'Route Optimizer',
        description: 'Optimizes routes based on real-time traffic and passenger demand',
        status: 'inactive',
        accuracy: 92.1,
        lastTrained: new Date('2025-01-10T14:20:00Z'),
        version: '1.8.2',
        type: 'optimization',
        config: {
            autoRetrain: false,
            confidenceThreshold: 0.9,
            trainingInterval: 48,
            dataPoints: 8500
        },
        performance: {
            totalPredictions: 12450,
            successfulPredictions: 11467,
            avgResponseTime: 85,
            lastPrediction: new Date(Date.now() - 86400000) // 1 day ago
        },
        resources: {
            cpuUsage: 0,
            memoryUsage: 0
        }
    },
    {
        id: 'demand-forecaster',
        name: 'Demand Forecaster',
        description: 'Forecasts passenger demand for different routes and times',
        status: 'training',
        accuracy: 78.3,
        lastTrained: new Date('2025-01-17T08:15:00Z'),
        version: '3.0.1',
        type: 'analysis',
        config: {
            autoRetrain: true,
            confidenceThreshold: 0.8,
            trainingInterval: 12,
            dataPoints: 15000
        },
        performance: {
            totalPredictions: 8920,
            successfulPredictions: 6984,
            avgResponseTime: 200,
            lastPrediction: new Date(Date.now() - 3600000) // 1 hour ago
        },
        resources: {
            cpuUsage: 45.6,
            memoryUsage: 512,
            gpuUsage: 78.2
        }
    },
    {
        id: 'anomaly-detector',
        name: 'Anomaly Detector',
        description: 'Detects unusual patterns in vehicle behavior and system performance',
        status: 'error',
        accuracy: 65.4,
        lastTrained: new Date('2025-01-12T16:45:00Z'),
        version: '1.5.7',
        type: 'analysis',
        config: {
            autoRetrain: false,
            confidenceThreshold: 0.75,
            trainingInterval: 72,
            dataPoints: 5000
        },
        performance: {
            totalPredictions: 3420,
            successfulPredictions: 2236,
            avgResponseTime: 300,
            lastPrediction: new Date(Date.now() - 172800000) // 2 days ago
        },
        resources: {
            cpuUsage: 5.2,
            memoryUsage: 128
        }
    }
];
let mockTrainingJobs = [];
// @desc    Get AI system overview and statistics
// @route   GET /api/admin/ai
// @access  Private (System Admin)
const getAISystemOverview = async (req, res) => {
    try {
        // Calculate system statistics
        const totalModules = mockModules.length;
        const activeModules = mockModules.filter(m => m.status === 'active').length;
        const trainingModules = mockModules.filter(m => m.status === 'training').length;
        const totalPredictions = mockModules.reduce((sum, m) => sum + m.performance.totalPredictions, 0);
        const totalSuccessful = mockModules.reduce((sum, m) => sum + m.performance.successfulPredictions, 0);
        const averageAccuracy = mockModules.reduce((sum, m) => sum + m.accuracy, 0) / totalModules;
        const systemCpuUsage = mockModules.reduce((sum, m) => sum + m.resources.cpuUsage, 0);
        const systemMemoryUsage = mockModules.reduce((sum, m) => sum + m.resources.memoryUsage, 0);
        const systemGpuUsage = mockModules.reduce((sum, m) => sum + (m.resources.gpuUsage || 0), 0);
        // Mock daily predictions (in real implementation, this would query recent data)
        const dailyPredictions = Math.floor(totalPredictions * 0.1);
        const errorRate = ((totalPredictions - totalSuccessful) / totalPredictions) * 100;
        const stats = {
            totalModules,
            activeModules,
            trainingModules,
            totalPredictions,
            averageAccuracy: Number(averageAccuracy.toFixed(1)),
            systemCpuUsage: Number(systemCpuUsage.toFixed(1)),
            systemMemoryUsage,
            systemGpuUsage: Number(systemGpuUsage.toFixed(1)),
            dailyPredictions,
            errorRate: Number(errorRate.toFixed(2))
        };
        res.json({
            status: 'online',
            modules: mockModules,
            stats,
            lastUpdated: new Date()
        });
    }
    catch (error) {
        console.error('Get AI system overview error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getAISystemOverview = getAISystemOverview;
// @desc    Get specific AI module details
// @route   GET /api/admin/ai/:moduleId
// @access  Private (System Admin)
const getAIModule = async (req, res) => {
    try {
        const { moduleId } = req.params;
        const module = mockModules.find(m => m.id === moduleId);
        if (!module) {
            res.status(404).json({ message: 'AI module not found' });
            return;
        }
        // Get recent training jobs for this module
        const recentJobs = mockTrainingJobs
            .filter(job => job.moduleId === moduleId)
            .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
            .slice(0, 10);
        res.json({
            module,
            recentTrainingJobs: recentJobs
        });
    }
    catch (error) {
        console.error('Get AI module error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getAIModule = getAIModule;
// @desc    Toggle AI module status (start/stop)
// @route   POST /api/admin/ai/:moduleId/toggle
// @access  Private (System Admin)
const toggleAIModule = async (req, res) => {
    try {
        const { moduleId } = req.params;
        const { action } = req.body; // 'start' or 'stop'
        const moduleIndex = mockModules.findIndex(m => m.id === moduleId);
        if (moduleIndex === -1) {
            res.status(404).json({ message: 'AI module not found' });
            return;
        }
        const module = mockModules[moduleIndex];
        switch (action) {
            case 'start':
                if (module.status === 'error') {
                    res.status(400).json({
                        message: 'Cannot start module in error state. Please fix errors first.'
                    });
                    return;
                }
                module.status = 'active';
                module.resources.cpuUsage = Math.random() * 30 + 10;
                module.resources.memoryUsage = Math.random() * 300 + 100;
                if (module.resources.gpuUsage !== undefined) {
                    module.resources.gpuUsage = Math.random() * 50 + 20;
                }
                break;
            case 'stop':
                module.status = 'inactive';
                module.resources.cpuUsage = 0;
                module.resources.memoryUsage = 0;
                if (module.resources.gpuUsage !== undefined) {
                    module.resources.gpuUsage = 0;
                }
                break;
            case 'restart':
                module.status = 'active';
                module.resources.cpuUsage = Math.random() * 30 + 10;
                module.resources.memoryUsage = Math.random() * 300 + 100;
                if (module.resources.gpuUsage !== undefined) {
                    module.resources.gpuUsage = Math.random() * 50 + 20;
                }
                break;
            default:
                res.status(400).json({ message: 'Invalid action. Use start, stop, or restart.' });
                return;
        }
        mockModules[moduleIndex] = module;
        res.json({
            message: `Module ${action}ed successfully`,
            module
        });
    }
    catch (error) {
        console.error('Toggle AI module error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.toggleAIModule = toggleAIModule;
// @desc    Start AI module training
// @route   POST /api/admin/ai/:moduleId/train
// @access  Private (System Admin)
const startTraining = async (req, res) => {
    try {
        const { moduleId } = req.params;
        const { epochs = 100, batchSize = 32, learningRate = 0.001, validationSplit = 0.2 } = req.body;
        const moduleIndex = mockModules.findIndex(m => m.id === moduleId);
        if (moduleIndex === -1) {
            res.status(404).json({ message: 'AI module not found' });
            return;
        }
        const module = mockModules[moduleIndex];
        if (module.status === 'training') {
            res.status(400).json({
                message: 'Module is already training'
            });
            return;
        }
        // Create training job
        const trainingJob = {
            id: `train_${Date.now()}`,
            moduleId,
            status: 'queued',
            progress: 0,
            startTime: new Date(),
            config: {
                epochs,
                batchSize,
                learningRate,
                validationSplit
            }
        };
        mockTrainingJobs.push(trainingJob);
        // Update module status
        module.status = 'training';
        module.resources.cpuUsage = Math.random() * 70 + 30;
        module.resources.memoryUsage = Math.random() * 800 + 400;
        if (module.resources.gpuUsage !== undefined) {
            module.resources.gpuUsage = Math.random() * 40 + 60;
        }
        mockModules[moduleIndex] = module;
        // Simulate training progress (in real implementation, this would be handled by AI service)
        setTimeout(() => {
            simulateTrainingProgress(trainingJob.id);
        }, 1000);
        res.json({
            message: 'Training started successfully',
            trainingJob,
            module
        });
    }
    catch (error) {
        console.error('Start training error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.startTraining = startTraining;
// @desc    Get training job status
// @route   GET /api/admin/ai/training/:jobId
// @access  Private (System Admin)
const getTrainingStatus = async (req, res) => {
    try {
        const { jobId } = req.params;
        const job = mockTrainingJobs.find(j => j.id === jobId);
        if (!job) {
            res.status(404).json({ message: 'Training job not found' });
            return;
        }
        res.json(job);
    }
    catch (error) {
        console.error('Get training status error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getTrainingStatus = getTrainingStatus;
// @desc    Get all training jobs
// @route   GET /api/admin/ai/training
// @access  Private (System Admin)
const getAllTrainingJobs = async (req, res) => {
    try {
        const { moduleId, status, limit = 20 } = req.query;
        let jobs = mockTrainingJobs;
        // Filter by module ID if provided
        if (moduleId) {
            jobs = jobs.filter(job => job.moduleId === moduleId);
        }
        // Filter by status if provided
        if (status) {
            jobs = jobs.filter(job => job.status === status);
        }
        // Sort by start time (newest first) and limit
        jobs = jobs
            .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
            .slice(0, parseInt(limit));
        res.json({
            jobs,
            count: jobs.length
        });
    }
    catch (error) {
        console.error('Get all training jobs error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getAllTrainingJobs = getAllTrainingJobs;
// @desc    Update AI module configuration
// @route   PUT /api/admin/ai/:moduleId/config
// @access  Private (System Admin)
const updateModuleConfig = async (req, res) => {
    try {
        const { moduleId } = req.params;
        const { config } = req.body;
        const moduleIndex = mockModules.findIndex(m => m.id === moduleId);
        if (moduleIndex === -1) {
            res.status(404).json({ message: 'AI module not found' });
            return;
        }
        // Validate config
        if (config.confidenceThreshold && (config.confidenceThreshold < 0 || config.confidenceThreshold > 1)) {
            res.status(400).json({
                message: 'Confidence threshold must be between 0 and 1'
            });
            return;
        }
        if (config.trainingInterval && config.trainingInterval < 1) {
            res.status(400).json({
                message: 'Training interval must be at least 1 hour'
            });
            return;
        }
        // Update module config
        mockModules[moduleIndex].config = {
            ...mockModules[moduleIndex].config,
            ...config
        };
        res.json({
            message: 'Module configuration updated successfully',
            module: mockModules[moduleIndex]
        });
    }
    catch (error) {
        console.error('Update module config error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.updateModuleConfig = updateModuleConfig;
// @desc    Get AI system logs
// @route   GET /api/admin/ai/logs
// @access  Private (System Admin)
const getAILogs = async (req, res) => {
    try {
        const { moduleId, level = 'all', limit = 100 } = req.query;
        // Mock logs (in real implementation, this would query log files or database)
        const mockLogs = [
            {
                id: 'log_1',
                timestamp: new Date(Date.now() - 300000),
                level: 'info',
                moduleId: 'arrival-predictor',
                message: 'Prediction completed successfully',
                details: { responseTime: 120, accuracy: 0.87 }
            },
            {
                id: 'log_2',
                timestamp: new Date(Date.now() - 600000),
                level: 'warning',
                moduleId: 'demand-forecaster',
                message: 'Training data quality below threshold',
                details: { dataQuality: 0.65, threshold: 0.7 }
            },
            {
                id: 'log_3',
                timestamp: new Date(Date.now() - 900000),
                level: 'error',
                moduleId: 'anomaly-detector',
                message: 'Module failed to start',
                details: { error: 'Insufficient memory' }
            }
        ];
        let logs = mockLogs;
        // Filter by module ID if provided
        if (moduleId) {
            logs = logs.filter(log => log.moduleId === moduleId);
        }
        // Filter by level if provided
        if (level !== 'all') {
            logs = logs.filter(log => log.level === level);
        }
        // Limit results
        logs = logs.slice(0, parseInt(limit));
        res.json({
            logs,
            count: logs.length
        });
    }
    catch (error) {
        console.error('Get AI logs error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getAILogs = getAILogs;
// Helper function to simulate training progress
function simulateTrainingProgress(jobId) {
    const jobIndex = mockTrainingJobs.findIndex(j => j.id === jobId);
    if (jobIndex === -1)
        return;
    const job = mockTrainingJobs[jobIndex];
    const moduleIndex = mockModules.findIndex(m => m.id === job.moduleId);
    // Simulate training progress
    const progressInterval = setInterval(() => {
        job.progress += Math.random() * 15 + 5; // Progress 5-20% each update
        if (job.progress >= 100) {
            // Training completed
            job.progress = 100;
            job.status = 'completed';
            job.endTime = new Date();
            job.duration = Math.floor((job.endTime.getTime() - job.startTime.getTime()) / 60000);
            job.accuracy = Math.random() * 20 + 80; // 80-100% accuracy
            // Update module
            if (moduleIndex !== -1) {
                mockModules[moduleIndex].status = 'active';
                mockModules[moduleIndex].accuracy = job.accuracy;
                mockModules[moduleIndex].lastTrained = job.endTime;
                mockModules[moduleIndex].resources.cpuUsage = Math.random() * 30 + 10;
                mockModules[moduleIndex].resources.memoryUsage = Math.random() * 300 + 100;
                if (mockModules[moduleIndex].resources.gpuUsage !== undefined) {
                    mockModules[moduleIndex].resources.gpuUsage = Math.random() * 50 + 20;
                }
            }
            clearInterval(progressInterval);
        }
        else {
            job.status = 'running';
        }
        mockTrainingJobs[jobIndex] = job;
    }, 2000); // Update every 2 seconds
}
