"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// src/models/Fleet.ts
const mongoose_1 = __importStar(require("mongoose"));
const FleetSchema = new mongoose_1.Schema({
    companyName: {
        type: String,
        required: [true, 'Company name is required'],
        trim: true,
        maxlength: [100, 'Company name cannot exceed 100 characters']
    },
    registrationNumber: {
        type: String,
        required: [true, 'Registration number is required'],
        unique: true,
        trim: true,
        uppercase: true
    },
    contactPerson: {
        type: String,
        required: [true, 'Contact person is required'],
        trim: true,
        maxlength: [50, 'Contact person name cannot exceed 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true,
        match: [/^\+94\d{9}$/, 'Please provide a valid Sri Lankan phone number (+94xxxxxxxxx)']
    },
    address: {
        type: String,
        required: [true, 'Address is required'],
        trim: true,
        maxlength: [200, 'Address cannot exceed 200 characters']
    },
    status: {
        type: String,
        enum: {
            values: ['pending', 'approved', 'rejected', 'suspended'],
            message: 'Status must be one of: pending, approved, rejected, suspended'
        },
        default: 'pending'
    },
    applicationDate: {
        type: Date,
        default: Date.now
    },
    approvalDate: {
        type: Date
    },
    rejectionDate: {
        type: Date
    },
    suspensionDate: {
        type: Date
    },
    totalVehicles: {
        type: Number,
        required: [true, 'Total vehicles count is required'],
        min: [1, 'Must have at least 1 vehicle'],
        max: [500, 'Cannot exceed 500 vehicles']
    },
    activeVehicles: {
        type: Number,
        default: 0,
        min: [0, 'Active vehicles cannot be negative'],
        validate: {
            validator: function (value) {
                return value <= this.totalVehicles;
            },
            message: 'Active vehicles cannot exceed total vehicles'
        }
    },
    operatingRoutes: [{
            type: String,
            trim: true,
            required: [true, 'At least one operating route is required']
        }],
    documents: {
        businessLicense: {
            type: Boolean,
            default: false
        },
        insuranceCertificate: {
            type: Boolean,
            default: false
        },
        vehicleRegistrations: {
            type: Boolean,
            default: false
        },
        driverLicenses: {
            type: Boolean,
            default: false
        },
        uploadedFiles: [{
                type: String,
                trim: true
            }]
    },
    complianceScore: {
        type: Number,
        min: [0, 'Compliance score cannot be negative'],
        max: [100, 'Compliance score cannot exceed 100'],
        default: 0
    },
    lastInspection: {
        type: Date
    },
    nextInspectionDue: {
        type: Date
    },
    notes: {
        type: String,
        trim: true,
        maxlength: [500, 'Notes cannot exceed 500 characters']
    },
    rejectionReason: {
        type: String,
        trim: true,
        maxlength: [300, 'Rejection reason cannot exceed 300 characters']
    },
    approvedBy: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User'
    },
    rejectedBy: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User'
    },
    suspendedBy: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User'
    },
    financialInfo: {
        annualRevenue: {
            type: Number,
            min: [0, 'Annual revenue cannot be negative']
        },
        insuranceAmount: {
            type: Number,
            min: [0, 'Insurance amount cannot be negative']
        },
        bondAmount: {
            type: Number,
            min: [0, 'Bond amount cannot be negative']
        }
    },
    operationalInfo: {
        yearsInOperation: {
            type: Number,
            min: [0, 'Years in operation cannot be negative'],
            max: [100, 'Years in operation seems unrealistic']
        },
        averageFleetAge: {
            type: Number,
            min: [0, 'Average fleet age cannot be negative'],
            max: [50, 'Average fleet age seems unrealistic']
        },
        maintenanceSchedule: {
            type: String,
            enum: ['weekly', 'monthly', 'quarterly', 'custom'],
            default: 'monthly'
        },
        safetyRating: {
            type: Number,
            min: [1, 'Safety rating must be at least 1'],
            max: [5, 'Safety rating cannot exceed 5']
        }
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});
// Indexes for better query performance
// FleetSchema.index({ registrationNumber: 1 }); // <-- THIS LINE IS REMOVED (unique:true handles it)
FleetSchema.index({ status: 1 });
FleetSchema.index({ email: 1 });
FleetSchema.index({ companyName: 1 });
FleetSchema.index({ applicationDate: 1 });
FleetSchema.index({ complianceScore: 1 });
FleetSchema.index({ 'operatingRoutes': 1 });
// Virtual for application age in days
FleetSchema.virtual('applicationAge').get(function () {
    const diffTime = Math.abs(new Date().getTime() - this.applicationDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});
// Virtual for compliance status
FleetSchema.virtual('complianceStatus').get(function () {
    if (this.complianceScore >= 90)
        return 'excellent';
    if (this.complianceScore >= 70)
        return 'good';
    if (this.complianceScore >= 50)
        return 'needs_improvement';
    return 'poor';
});
// Method to calculate compliance score based on documents and other factors
FleetSchema.methods.calculateComplianceScore = function () {
    var _a, _b;
    let score = 0;
    const docs = this.documents;
    const docScore = ((docs.businessLicense ? 10 : 0) +
        (docs.insuranceCertificate ? 10 : 0) +
        (docs.vehicleRegistrations ? 10 : 0) +
        (docs.driverLicenses ? 10 : 0));
    score += docScore;
    if (this.totalVehicles > 0) {
        const vehicleRatio = this.activeVehicles / this.totalVehicles;
        score += vehicleRatio * 20;
    }
    if ((_a = this.operationalInfo) === null || _a === void 0 ? void 0 : _a.yearsInOperation) {
        const experienceScore = Math.min(this.operationalInfo.yearsInOperation / 10 * 20, 20);
        score += experienceScore;
    }
    if ((_b = this.operationalInfo) === null || _b === void 0 ? void 0 : _b.safetyRating) {
        score += (this.operationalInfo.safetyRating / 5) * 10;
    }
    if (this.lastInspection) {
        const daysSinceInspection = Math.floor((Date.now() - this.lastInspection.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceInspection <= 365) {
            score += 10;
        }
        else if (daysSinceInspection <= 730) {
            score += 5;
        }
    }
    return Math.round(Math.min(score, 100));
};
// Method to update compliance score
FleetSchema.methods.updateComplianceScore = function () {
    this.complianceScore = this.calculateComplianceScore();
    return this.save();
};
// Method to approve fleet
FleetSchema.methods.approve = function (approvedBy, notes) {
    this.status = 'approved';
    this.approvalDate = new Date();
    this.approvedBy = approvedBy;
    this.rejectionDate = undefined;
    this.rejectionReason = undefined;
    this.suspensionDate = undefined;
    if (notes) {
        this.notes = notes;
    }
    this.nextInspectionDue = new Date();
    this.nextInspectionDue.setFullYear(this.nextInspectionDue.getFullYear() + 1);
    return this.save();
};
// Method to reject fleet
FleetSchema.methods.reject = function (rejectedBy, reason) {
    this.status = 'rejected';
    this.rejectionDate = new Date();
    this.rejectedBy = rejectedBy;
    this.rejectionReason = reason;
    this.approvalDate = undefined;
    this.suspensionDate = undefined;
    return this.save();
};
// Method to suspend fleet
FleetSchema.methods.suspend = function (suspendedBy, reason) {
    this.status = 'suspended';
    this.suspensionDate = new Date();
    this.suspendedBy = suspendedBy;
    this.notes = reason;
    this.activeVehicles = 0;
    return this.save();
};
// Pre-save middleware to update compliance score
FleetSchema.pre('save', function (next) {
    if (this.isModified('documents') || this.isModified('operationalInfo') || this.isModified('activeVehicles')) {
        this.complianceScore = this.calculateComplianceScore();
    }
    next();
});
// Pre-save middleware to validate business rules
FleetSchema.pre('save', function (next) {
    if (this.status === 'approved' && this.complianceScore < 70) {
        return next(new Error('Fleet must have a compliance score of at least 70% to be approved'));
    }
    if (this.status === 'rejected' && !this.rejectionReason) {
        return next(new Error('Rejection reason is required for rejected fleets'));
    }
    next();
});
// Static method to get fleet statistics
FleetSchema.statics.getStats = async function () {
    const stats = await this.aggregate([
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalVehicles: { $sum: '$totalVehicles' },
                activeVehicles: { $sum: '$activeVehicles' },
                avgComplianceScore: { $avg: '$complianceScore' }
            }
        }
    ]);
    return stats;
};
// Static method to get fleets requiring inspection
FleetSchema.statics.getInspectionDue = async function () {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);
    return this.find({
        status: 'approved',
        nextInspectionDue: { $lte: thirtyDaysFromNow },
        isActive: true
    }).sort({ nextInspectionDue: 1 });
};
// Static method to get compliance issues
FleetSchema.statics.getComplianceIssues = async function () {
    return this.find({
        status: { $in: ['approved', 'pending'] },
        complianceScore: { $lt: 70 },
        isActive: true
    }).sort({ complianceScore: 1 });
};
const Fleet = mongoose_1.default.model('Fleet', FleetSchema);
exports.default = Fleet;
