import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IVersion {
  version: number;
  content: string;
  updatedBy: mongoose.Types.ObjectId;
  updatedAt: Date;
  changeLog: string;
}

export interface IKnowledgeBase extends Document {
  articleId: string;
  title: string;
  content: string;
  summary: string;
  category: string;
  subcategory?: string;
  tags: string[];
  author: mongoose.Types.ObjectId;
  status: 'draft' | 'published' | 'archived' | 'under_review';
  language: string;
  searchKeywords: string[];
  relatedArticles: mongoose.Types.ObjectId[];
  aiTrainingData: {
    usedForAI: boolean;
    intents: string[];
    entities: string[];
    sampleQuestions: string[];
    confidence: number;
  };
  analytics: {
    views: number;
    helpful: number;
    notHelpful: number;
    searches: number;
    lastAccessed: Date;
    popularQueries: string[];
  };
  versions: IVersion[];
  attachments: Array<{
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    uploadedAt: Date;
  }>;
  access: {
    visibility: 'public' | 'internal' | 'restricted';
    allowedRoles: string[];
    allowedAgents: mongoose.Types.ObjectId[];
  };
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    slug: string;
    canonicalUrl?: string;
  };
  workflow: {
    reviewRequired: boolean;
    reviewedBy?: mongoose.Types.ObjectId;
    reviewedAt?: Date;
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    rejectionReason?: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Instance method signatures
  incrementView(): Promise<this>;
  markHelpful(isHelpful: boolean): Promise<this>;
  addSearchQuery(query: string): Promise<this>;
  publish(): Promise<this>;
  archive(): Promise<this>;
  addToAITraining(intents: string[], entities: string[], sampleQuestions: string[]): Promise<this>;
  linkRelatedArticles(articleIds: string[]): Promise<this>;
}

export interface IKnowledgeBaseModel extends Model<IKnowledgeBase> {
  searchArticles(query: string, category?: string, language?: string): Promise<IKnowledgeBase[]>;
  getPopularArticles(limit?: number, category?: string): Promise<IKnowledgeBase[]>;
  getCategoryStats(): Promise<any[]>;
  getAITrainingData(): Promise<IKnowledgeBase[]>;
}


const versionSchema = new Schema<IVersion>({
  version: { type: Number, required: true },
  content: { type: String, required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  updatedAt: { type: Date, default: Date.now },
  changeLog: { type: String, required: true, maxlength: 500 }
}, { _id: true });

const aiTrainingDataSchema = new Schema({
  usedForAI: { type: Boolean, default: false },
  intents: [String],
  entities: [String],
  sampleQuestions: [String],
  confidence: { type: Number, default: 0, min: 0, max: 1 }
}, { _id: false });

const analyticsSchema = new Schema({
  views: { type: Number, default: 0 },
  helpful: { type: Number, default: 0 },
  notHelpful: { type: Number, default: 0 },
  searches: { type: Number, default: 0 },
  lastAccessed: Date,
  popularQueries: [String]
}, { _id: false });

const attachmentSchema = new Schema({
  fileName: { type: String, required: true },
  fileUrl: { type: String, required: true },
  fileType: { type: String, required: true },
  fileSize: { type: Number, required: true },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: true });

const accessSchema = new Schema({
  visibility: { type: String, enum: ['public', 'internal', 'restricted'], default: 'internal' },
  allowedRoles: [String],
  allowedAgents: [{ type: Schema.Types.ObjectId, ref: 'User' }]
}, { _id: false });

const seoSchema = new Schema({
  metaTitle: String,
  metaDescription: String,
  slug: { type: String, required: true, unique: true },
  canonicalUrl: String
}, { _id: false });

const workflowSchema = new Schema({
  reviewRequired: { type: Boolean, default: false },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  rejectionReason: String
}, { _id: false });

const knowledgeBaseSchema = new Schema<IKnowledgeBase>({
  articleId: { type: String, required: true, unique: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  content: { type: String, required: true },
  summary: { type: String, required: true, maxlength: 500 },
  category: { type: String, required: true, enum: ['booking', 'payment', 'tracking', 'routes', 'account', 'technical', 'policy', 'general', 'emergency', 'refunds', 'schedules'] },
  subcategory: String,
  tags: [String],
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, required: true, enum: ['draft', 'published', 'archived', 'under_review'], default: 'draft' },
  language: { type: String, required: true, default: 'en', enum: ['en', 'si', 'ta'] },
  searchKeywords: [String],
  relatedArticles: [{ type: Schema.Types.ObjectId, ref: 'KnowledgeBase' }],
  aiTrainingData: { type: aiTrainingDataSchema, default: () => ({}) },
  analytics: { type: analyticsSchema, default: () => ({}) },
  versions: [versionSchema],
  attachments: [attachmentSchema],
  access: { type: accessSchema, default: () => ({}) },
  seo: { type: seoSchema, required: true },
  workflow: { type: workflowSchema, default: () => ({}) },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
knowledgeBaseSchema.index({ articleId: 1 }, { unique: true });
knowledgeBaseSchema.index({ 'seo.slug': 1 }, { unique: true });
knowledgeBaseSchema.index({ category: 1 });
knowledgeBaseSchema.index({ status: 1 });
knowledgeBaseSchema.index({ tags: 1 });
knowledgeBaseSchema.index({ searchKeywords: 1 });
knowledgeBaseSchema.index({ title: 'text', content: 'text', summary: 'text' });
knowledgeBaseSchema.index({ language: 1 });
knowledgeBaseSchema.index({ 'analytics.views': -1 });
knowledgeBaseSchema.index({ createdAt: -1 });

// Virtuals
knowledgeBaseSchema.virtual('authorInfo', { ref: 'User', localField: 'author', foreignField: '_id', justOne: true });
// --- THIS IS THE FIX ---
knowledgeBaseSchema.virtual('relatedArticleDetails', { ref: 'KnowledgeBase', localField: 'relatedArticles', foreignField: '_id' });
// --- END OF FIX ---
knowledgeBaseSchema.virtual('helpfulnessRatio').get(function() {
  const total = this.analytics.helpful + this.analytics.notHelpful;
  return total > 0 ? (this.analytics.helpful / total) * 100 : 0;
});

// Pre-save hooks
knowledgeBaseSchema.pre('save', async function(next) {
  if (this.isNew) {
    if (!this.articleId) {
      const count = await mongoose.model('KnowledgeBase').countDocuments();
      this.articleId = `KB${Date.now().toString().slice(-6)}${(count + 1).toString().padStart(4, '0')}`;
    }
    if (!this.seo.slug) {
      const baseSlug = this.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      let slug = baseSlug;
      let counter = 1;
      while (await mongoose.model('KnowledgeBase').findOne({ 'seo.slug': slug })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
      this.seo.slug = slug;
    }
  }
  next();
});

knowledgeBaseSchema.pre('save', function(next) {
  if (this.isModified('content') && !this.isNew) {
    const version: IVersion = {
      version: this.versions.length + 1,
      content: this.content,
      updatedBy: this.author,
      updatedAt: new Date(),
      changeLog: 'Content updated'
    };
    this.versions.push(version);
  }
  next();
});

// Static methods
knowledgeBaseSchema.statics.searchArticles = function(query: string, category?: string, language: string = 'en') {
  const searchQuery: any = { $text: { $search: query }, status: 'published', language: language, isActive: true };
  if (category) { searchQuery.category = category; }
  return this.find(searchQuery).select('title summary category tags analytics.views analytics.helpful analytics.notHelpful seo.slug').sort({ score: { $meta: 'textScore' }, 'analytics.views': -1 });
};

knowledgeBaseSchema.statics.getPopularArticles = function(limit: number = 10, category?: string) {
  const matchQuery: any = { status: 'published', isActive: true };
  if (category) matchQuery.category = category;
  return this.find(matchQuery).select('title summary category analytics.views seo.slug').sort({ 'analytics.views': -1 }).limit(limit);
};

knowledgeBaseSchema.statics.getCategoryStats = function() {
  return this.aggregate([
    { $match: { status: 'published', isActive: true } },
    { $group: { _id: '$category', count: { $sum: 1 }, totalViews: { $sum: '$analytics.views' }, avgHelpfulness: { $avg: { $cond: [{ $gt: [{ $add: ['$analytics.helpful', '$analytics.notHelpful'] }, 0] }, { $divide: ['$analytics.helpful', { $add: ['$analytics.helpful', '$analytics.notHelpful'] }] }, 0] } } } },
    { $sort: { count: -1 } }
  ]);
};

knowledgeBaseSchema.statics.getAITrainingData = function() {
  return this.find({ 'aiTrainingData.usedForAI': true, status: 'published', isActive: true }).select('title content aiTrainingData category');
};

// Instance methods
knowledgeBaseSchema.methods.incrementView = function() {
  this.analytics.views++;
  this.analytics.lastAccessed = new Date();
  return this.save();
};

knowledgeBaseSchema.methods.markHelpful = function(isHelpful: boolean) {
  if (isHelpful) { this.analytics.helpful++; } else { this.analytics.notHelpful++; }
  return this.save();
};

knowledgeBaseSchema.methods.addSearchQuery = function(query: string) {
  this.analytics.searches++;
  if (!this.analytics.popularQueries.includes(query)) {
    this.analytics.popularQueries.push(query);
    if (this.analytics.popularQueries.length > 10) { this.analytics.popularQueries = this.analytics.popularQueries.slice(-10); }
  }
  return this.save();
};

knowledgeBaseSchema.methods.publish = function() {
  this.status = 'published';
  if (this.workflow.reviewRequired && !this.workflow.approvedAt) { throw new Error('Article requires approval before publishing'); }
  return this.save();
};

knowledgeBaseSchema.methods.archive = function() {
  this.status = 'archived';
  return this.save();
};

knowledgeBaseSchema.methods.addToAITraining = function(intents: string[], entities: string[], sampleQuestions: string[]) {
  this.aiTrainingData = { usedForAI: true, intents, entities, sampleQuestions, confidence: 0.8 };
  return this.save();
};

knowledgeBaseSchema.methods.linkRelatedArticles = function(articleIds: string[]) {
  this.relatedArticles = [...new Set([...this.relatedArticles, ...articleIds])];
  return this.save();
};

export default mongoose.model<IKnowledgeBase, IKnowledgeBaseModel>('KnowledgeBase', knowledgeBaseSchema);