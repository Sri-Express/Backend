"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addToAITraining = exports.getAITrainingData = exports.getKnowledgeStats = exports.publishArticle = exports.rateArticle = exports.getArticlesByCategory = exports.getPopularArticles = exports.searchArticles = exports.deleteArticle = exports.updateArticle = exports.createArticle = exports.getArticleById = exports.getArticles = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const KnowledgeBase_1 = __importDefault(require("../models/KnowledgeBase"));
// Get all knowledge base articles with filtering and pagination
const getArticles = async (req, res) => {
    try {
        const { page = 1, limit = 20, category, status, language = 'en', search, sortBy = 'createdAt', sortOrder = 'desc', visibility } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const filter = { isActive: true, language };
        if (category)
            filter.category = category;
        if (status)
            filter.status = status;
        if (visibility)
            filter['access.visibility'] = visibility;
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { summary: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } },
                { tags: { $regex: search, $options: 'i' } },
                { searchKeywords: { $regex: search, $options: 'i' } }
            ];
        }
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
        const [articles, total] = await Promise.all([
            KnowledgeBase_1.default.find(filter).sort(sort).skip(skip).limit(limitNum)
                .populate('author', 'name email role')
                .populate('workflow.reviewedBy', 'name role')
                .populate('workflow.approvedBy', 'name role')
                .select('-content -versions')
                .lean(),
            KnowledgeBase_1.default.countDocuments(filter)
        ]);
        const totalPages = Math.ceil(total / limitNum);
        res.json({
            success: true,
            data: {
                articles,
                pagination: { current: pageNum, pages: totalPages, total, hasNext: pageNum < totalPages, hasPrev: pageNum > 1 },
                filters: { category, status, language, search, visibility }
            }
        });
    }
    catch (error) {
        console.error('Get articles error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch knowledge base articles', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.getArticles = getArticles;
// Get single article by ID or slug
const getArticleById = async (req, res) => {
    try {
        const { id } = req.params;
        const { increment_view = 'true' } = req.query;
        const article = await KnowledgeBase_1.default.findOne({
            $or: [
                { _id: mongoose_1.default.Types.ObjectId.isValid(id) ? id : null },
                { articleId: id },
                { 'seo.slug': id }
            ],
            isActive: true
        })
            .populate('author', 'name email role')
            .populate('relatedArticles', 'title summary seo.slug analytics.views')
            .populate('workflow.reviewedBy', 'name role')
            .populate('workflow.approvedBy', 'name role');
        if (!article) {
            res.status(404).json({ success: false, message: 'Article not found' });
            return;
        }
        if (increment_view === 'true')
            await article.incrementView();
        const similarArticles = await KnowledgeBase_1.default.find({
            category: article.category,
            _id: { $ne: article._id },
            status: 'published',
            isActive: true
        })
            .select('title summary seo.slug analytics.views')
            .sort({ 'analytics.views': -1 })
            .limit(5);
        res.json({ success: true, data: { article, similarArticles } });
    }
    catch (error) {
        console.error('Get article error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch article', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.getArticleById = getArticleById;
// Create new article
const createArticle = async (req, res) => {
    try {
        const { title, content, summary, category, subcategory, tags = [], searchKeywords = [], language = 'en', metaTitle, metaDescription, visibility = 'internal', allowedRoles = [], allowedAgents = [], reviewRequired = false } = req.body;
        if (!title || !content || !summary || !category) {
            res.status(400).json({ success: false, message: 'Title, content, summary, and category are required' });
            return;
        }
        const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        let slug = baseSlug;
        let counter = 1;
        while (await KnowledgeBase_1.default.findOne({ 'seo.slug': slug })) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }
        const articleData = {
            title: title.trim(),
            content: content.trim(),
            summary: summary.trim(),
            category,
            subcategory,
            tags,
            searchKeywords,
            language,
            author: req.user._id,
            seo: { metaTitle: metaTitle || title, metaDescription: metaDescription || summary, slug },
            access: { visibility, allowedRoles, allowedAgents },
            workflow: { reviewRequired },
            versions: [{
                    version: 1,
                    content: content.trim(),
                    updatedBy: req.user._id, // FIX: Use non-null assertion
                    updatedAt: new Date(),
                    changeLog: 'Initial version'
                }]
        };
        const article = new KnowledgeBase_1.default(articleData);
        await article.save();
        await article.populate('author', 'name email role');
        res.status(201).json({ success: true, message: 'Article created successfully', data: { article } });
    }
    catch (error) {
        console.error('Create article error:', error);
        res.status(500).json({ success: false, message: 'Failed to create article', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.createArticle = createArticle;
// Update article
const updateArticle = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, summary, category, subcategory, tags, searchKeywords, metaTitle, metaDescription, visibility, allowedRoles, allowedAgents, changeLog = 'Article updated' } = req.body;
        const article = await KnowledgeBase_1.default.findOne({
            $or: [
                { _id: mongoose_1.default.Types.ObjectId.isValid(id) ? id : null },
                { articleId: id },
                { 'seo.slug': id }
            ],
            isActive: true
        });
        if (!article) {
            res.status(404).json({ success: false, message: 'Article not found' });
            return;
        }
        const changes = [];
        if (title && title !== article.title) {
            changes.push('Title updated');
            article.title = title.trim();
        }
        if (content && content !== article.content) {
            changes.push('Content updated');
            article.content = content.trim();
        }
        if (summary && summary !== article.summary) {
            changes.push('Summary updated');
            article.summary = summary.trim();
        }
        if (category && category !== article.category) {
            changes.push(`Category changed to ${category}`);
            article.category = category;
        }
        if (subcategory !== undefined)
            article.subcategory = subcategory;
        if (tags)
            article.tags = tags;
        if (searchKeywords)
            article.searchKeywords = searchKeywords;
        if (metaTitle)
            article.seo.metaTitle = metaTitle;
        if (metaDescription)
            article.seo.metaDescription = metaDescription;
        if (visibility)
            article.access.visibility = visibility;
        if (allowedRoles)
            article.access.allowedRoles = allowedRoles;
        if (allowedAgents)
            article.access.allowedAgents = allowedAgents;
        if (content && content !== article.content) {
            article.versions.push({
                version: article.versions.length + 1,
                content: content.trim(),
                updatedBy: req.user._id, // FIX: Use non-null assertion
                updatedAt: new Date(),
                changeLog: changeLog || changes.join(', ')
            });
        }
        await article.save();
        await article.populate('author', 'name email role');
        res.json({ success: true, message: 'Article updated successfully', data: { article } });
    }
    catch (error) {
        console.error('Update article error:', error);
        res.status(500).json({ success: false, message: 'Failed to update article', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.updateArticle = updateArticle;
// Delete/Archive article
const deleteArticle = async (req, res) => {
    try {
        const { id } = req.params;
        const { archive = true } = req.body;
        const article = await KnowledgeBase_1.default.findOne({
            $or: [
                { _id: mongoose_1.default.Types.ObjectId.isValid(id) ? id : null },
                { articleId: id },
                { 'seo.slug': id }
            ],
            isActive: true
        });
        if (!article) {
            res.status(404).json({ success: false, message: 'Article not found' });
            return;
        }
        if (archive) {
            await article.archive();
            res.json({ success: true, message: 'Article archived successfully' });
        }
        else {
            article.isActive = false;
            await article.save();
            res.json({ success: true, message: 'Article deleted successfully' });
        }
    }
    catch (error) {
        console.error('Delete article error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete article', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.deleteArticle = deleteArticle;
// Search articles (public endpoint for chatbot and users)
const searchArticles = async (req, res) => {
    try {
        const { query, category, language = 'en', limit = 10 } = req.query;
        if (!query) {
            res.status(400).json({ success: false, message: 'Search query is required' });
            return;
        }
        const articles = await KnowledgeBase_1.default.searchArticles(query, category, language);
        const limitedArticles = articles.slice(0, parseInt(limit));
        await Promise.all(limitedArticles.map((article) => KnowledgeBase_1.default.findById(article._id).then(doc => doc === null || doc === void 0 ? void 0 : doc.addSearchQuery(query))));
        res.json({ success: true, data: { articles: limitedArticles, query, totalFound: articles.length } });
    }
    catch (error) {
        console.error('Search articles error:', error);
        res.status(500).json({ success: false, message: 'Failed to search articles', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.searchArticles = searchArticles;
// Get popular articles
const getPopularArticles = async (req, res) => {
    try {
        const { category, limit = 10, language = 'en' } = req.query;
        const articles = await KnowledgeBase_1.default.getPopularArticles(parseInt(limit), category);
        const filteredArticles = articles.filter((article) => article.language === language);
        res.json({ success: true, data: { articles: filteredArticles } });
    }
    catch (error) {
        console.error('Get popular articles error:', error);
        res.status(500).json({ success: false, message: 'Failed to get popular articles', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.getPopularArticles = getPopularArticles;
// Get article by category
const getArticlesByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        const { language = 'en', limit = 20, sortBy = 'analytics.views', sortOrder = 'desc' } = req.query;
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
        const articles = await KnowledgeBase_1.default.find({ category, status: 'published', language, isActive: true })
            .select('title summary seo.slug analytics.views analytics.helpful analytics.notHelpful createdAt')
            .sort(sort)
            .limit(parseInt(limit));
        const categoryStats = await KnowledgeBase_1.default.aggregate([
            { $match: { category, status: 'published', language, isActive: true } },
            { $group: { _id: null, totalArticles: { $sum: 1 }, totalViews: { $sum: '$analytics.views' }, avgHelpfulness: { $avg: { $cond: [{ $gt: [{ $add: ['$analytics.helpful', '$analytics.notHelpful'] }, 0] }, { $divide: ['$analytics.helpful', { $add: ['$analytics.helpful', '$analytics.notHelpful'] }] }, 0] } } } }
        ]);
        res.json({ success: true, data: { articles, stats: categoryStats[0] || { totalArticles: 0, totalViews: 0, avgHelpfulness: 0 } } });
    }
    catch (error) {
        console.error('Get articles by category error:', error);
        res.status(500).json({ success: false, message: 'Failed to get articles by category', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.getArticlesByCategory = getArticlesByCategory;
// Mark article as helpful/not helpful
const rateArticle = async (req, res) => {
    try {
        const { id } = req.params;
        const { helpful } = req.body;
        if (typeof helpful !== 'boolean') {
            res.status(400).json({ success: false, message: 'Helpful rating (true/false) is required' });
            return;
        }
        const article = await KnowledgeBase_1.default.findOne({
            $or: [
                { _id: mongoose_1.default.Types.ObjectId.isValid(id) ? id : null },
                { articleId: id },
                { 'seo.slug': id }
            ],
            isActive: true
        });
        if (!article) {
            res.status(404).json({ success: false, message: 'Article not found' });
            return;
        }
        await article.markHelpful(helpful);
        res.json({ success: true, message: `Article marked as ${helpful ? 'helpful' : 'not helpful'}`, data: { helpful: article.analytics.helpful, notHelpful: article.analytics.notHelpful } });
    }
    catch (error) {
        console.error('Rate article error:', error);
        res.status(500).json({ success: false, message: 'Failed to rate article', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.rateArticle = rateArticle;
// Publish article
const publishArticle = async (req, res) => {
    try {
        const { id } = req.params;
        const article = await KnowledgeBase_1.default.findOne({
            $or: [
                { _id: mongoose_1.default.Types.ObjectId.isValid(id) ? id : null },
                { articleId: id }
            ],
            isActive: true
        });
        if (!article) {
            res.status(404).json({ success: false, message: 'Article not found' });
            return;
        }
        await article.publish();
        res.json({ success: true, message: 'Article published successfully', data: { article } });
    }
    catch (error) {
        console.error('Publish article error:', error);
        res.status(500).json({ success: false, message: 'Failed to publish article', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.publishArticle = publishArticle;
// Get knowledge base statistics
const getKnowledgeStats = async (req, res) => {
    try {
        const { period = '30' } = req.query;
        const days = parseInt(period);
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const [categoryStats, statusStats, topArticles, recentActivity] = await Promise.all([
            KnowledgeBase_1.default.getCategoryStats(),
            KnowledgeBase_1.default.aggregate([{ $match: { isActive: true } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
            KnowledgeBase_1.default.getPopularArticles(10),
            KnowledgeBase_1.default.find({ updatedAt: { $gte: startDate }, isActive: true }).select('title status updatedAt author').populate('author', 'name').sort({ updatedAt: -1 }).limit(10)
        ]);
        const totalViews = await KnowledgeBase_1.default.aggregate([{ $match: { isActive: true } }, { $group: { _id: null, totalViews: { $sum: '$analytics.views' }, totalSearches: { $sum: '$analytics.searches' } } }]);
        res.json({
            success: true,
            data: {
                categories: categoryStats,
                status: statusStats,
                topArticles,
                recentActivity,
                overview: totalViews[0] || { totalViews: 0, totalSearches: 0 },
                period: days
            }
        });
    }
    catch (error) {
        console.error('Knowledge stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to get knowledge base statistics', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.getKnowledgeStats = getKnowledgeStats;
// Get AI training data
const getAITrainingData = async (req, res) => {
    try {
        const trainingData = await KnowledgeBase_1.default.getAITrainingData();
        const formattedData = trainingData.map((article) => ({
            id: article._id,
            title: article.title,
            content: article.content,
            category: article.category,
            intents: article.aiTrainingData.intents,
            entities: article.aiTrainingData.entities,
            sampleQuestions: article.aiTrainingData.sampleQuestions
        }));
        res.json({ success: true, data: { trainingData: formattedData, totalArticles: formattedData.length } });
    }
    catch (error) {
        console.error('Get AI training data error:', error);
        res.status(500).json({ success: false, message: 'Failed to get AI training data', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.getAITrainingData = getAITrainingData;
// Add article to AI training
const addToAITraining = async (req, res) => {
    try {
        const { id } = req.params;
        const { intents, entities, sampleQuestions } = req.body;
        if (!intents || !entities || !sampleQuestions) {
            res.status(400).json({ success: false, message: 'Intents, entities, and sample questions are required' });
            return;
        }
        const article = await KnowledgeBase_1.default.findOne({
            $or: [
                { _id: mongoose_1.default.Types.ObjectId.isValid(id) ? id : null },
                { articleId: id }
            ],
            isActive: true
        });
        if (!article) {
            res.status(404).json({ success: false, message: 'Article not found' });
            return;
        }
        await article.addToAITraining(intents, entities, sampleQuestions);
        res.json({ success: true, message: 'Article added to AI training data', data: { article } });
    }
    catch (error) {
        console.error('Add to AI training error:', error);
        res.status(500).json({ success: false, message: 'Failed to add article to AI training', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.addToAITraining = addToAITraining;
exports.default = { getArticles: exports.getArticles, getArticleById: exports.getArticleById, createArticle: exports.createArticle, updateArticle: exports.updateArticle, deleteArticle: exports.deleteArticle, searchArticles: exports.searchArticles, getPopularArticles: exports.getPopularArticles, getArticlesByCategory: exports.getArticlesByCategory, rateArticle: exports.rateArticle, publishArticle: exports.publishArticle, getKnowledgeStats: exports.getKnowledgeStats, getAITrainingData: exports.getAITrainingData, addToAITraining: exports.addToAITraining };
