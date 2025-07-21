// src/controllers/knowledgeController.ts
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import KnowledgeBase, { IKnowledgeBase } from '../models/KnowledgeBase';
import User, { IUser } from '../models/User';

// Define a custom request type to include the user property
interface AuthenticatedRequest extends Request {
  user?: IUser;
}

// Get all knowledge base articles with filtering and pagination
export const getArticles = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 20, category, status, language = 'en', search, sortBy = 'createdAt', sortOrder = 'desc', visibility } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = { isActive: true, language };
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (visibility) filter['access.visibility'] = visibility;

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { summary: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
        { searchKeywords: { $regex: search, $options: 'i' } }
      ];
    }

    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    const [articles, total] = await Promise.all([
      KnowledgeBase.find(filter).sort(sort).skip(skip).limit(limitNum)
        .populate('author', 'name email role')
        .populate('workflow.reviewedBy', 'name role')
        .populate('workflow.approvedBy', 'name role')
        .select('-content -versions')
        .lean(),
      KnowledgeBase.countDocuments(filter)
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

  } catch (error) {
    console.error('Get articles error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch knowledge base articles', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Get single article by ID or slug
export const getArticleById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { increment_view = 'true' } = req.query;

    const article = await KnowledgeBase.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
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

    if (increment_view === 'true') await article.incrementView();

    const similarArticles = await KnowledgeBase.find({
      category: article.category,
      _id: { $ne: article._id },
      status: 'published',
      isActive: true
    })
    .select('title summary seo.slug analytics.views')
    .sort({ 'analytics.views': -1 })
    .limit(5);

    res.json({ success: true, data: { article, similarArticles } });

  } catch (error) {
    console.error('Get article error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch article', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Create new article
export const createArticle = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, content, summary, category, subcategory, tags = [], searchKeywords = [], language = 'en', metaTitle, metaDescription, visibility = 'internal', allowedRoles = [], allowedAgents = [], reviewRequired = false } = req.body;

    if (!title || !content || !summary || !category) {
        res.status(400).json({ success: false, message: 'Title, content, summary, and category are required' });
        return;
    }

    const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    let slug = baseSlug;
    let counter = 1;

    while (await KnowledgeBase.findOne({ 'seo.slug': slug })) {
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
      author: req.user!._id,
      seo: { metaTitle: metaTitle || title, metaDescription: metaDescription || summary, slug },
      access: { visibility, allowedRoles, allowedAgents },
      workflow: { reviewRequired },
      versions: [{
        version: 1,
        content: content.trim(),
        updatedBy: req.user!._id, // FIX: Use non-null assertion
        updatedAt: new Date(),
        changeLog: 'Initial version'
      }]
    };

    const article = new KnowledgeBase(articleData);
    await article.save();
    await article.populate('author', 'name email role');

    res.status(201).json({ success: true, message: 'Article created successfully', data: { article } });

  } catch (error) {
    console.error('Create article error:', error);
    res.status(500).json({ success: false, message: 'Failed to create article', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Update article
export const updateArticle = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, content, summary, category, subcategory, tags, searchKeywords, metaTitle, metaDescription, visibility, allowedRoles, allowedAgents, changeLog = 'Article updated' } = req.body;

    const article = await KnowledgeBase.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
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
    if (title && title !== article.title) { changes.push('Title updated'); article.title = title.trim(); }
    if (content && content !== article.content) { changes.push('Content updated'); article.content = content.trim(); }
    if (summary && summary !== article.summary) { changes.push('Summary updated'); article.summary = summary.trim(); }
    if (category && category !== article.category) { changes.push(`Category changed to ${category}`); article.category = category; }
    if (subcategory !== undefined) article.subcategory = subcategory;
    if (tags) article.tags = tags;
    if (searchKeywords) article.searchKeywords = searchKeywords;
    if (metaTitle) article.seo.metaTitle = metaTitle;
    if (metaDescription) article.seo.metaDescription = metaDescription;
    if (visibility) article.access.visibility = visibility;
    if (allowedRoles) article.access.allowedRoles = allowedRoles;
    if (allowedAgents) article.access.allowedAgents = allowedAgents;

    if (content && content !== article.content) {
      article.versions.push({
        version: article.versions.length + 1,
        content: content.trim(),
        updatedBy: req.user!._id, // FIX: Use non-null assertion
        updatedAt: new Date(),
        changeLog: changeLog || changes.join(', ')
      });
    }

    await article.save();
    await article.populate('author', 'name email role');

    res.json({ success: true, message: 'Article updated successfully', data: { article } });

  } catch (error) {
    console.error('Update article error:', error);
    res.status(500).json({ success: false, message: 'Failed to update article', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Delete/Archive article
export const deleteArticle = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { archive = true } = req.body;

    const article = await KnowledgeBase.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
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
    } else {
      article.isActive = false;
      await article.save();
      res.json({ success: true, message: 'Article deleted successfully' });
    }

  } catch (error) {
    console.error('Delete article error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete article', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Search articles (public endpoint for chatbot and users)
export const searchArticles = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, category, language = 'en', limit = 10 } = req.query;

    if (!query) {
        res.status(400).json({ success: false, message: 'Search query is required' });
        return;
    }

    const articles = await KnowledgeBase.searchArticles(query as string, category as string, language as string);
    const limitedArticles = articles.slice(0, parseInt(limit as string));

    await Promise.all(limitedArticles.map((article: IKnowledgeBase) => 
        KnowledgeBase.findById(article._id).then(doc => doc?.addSearchQuery(query as string))
    ));

    res.json({ success: true, data: { articles: limitedArticles, query, totalFound: articles.length } });

  } catch (error) {
    console.error('Search articles error:', error);
    res.status(500).json({ success: false, message: 'Failed to search articles', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Get popular articles
export const getPopularArticles = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, limit = 10, language = 'en' } = req.query;

    const articles = await KnowledgeBase.getPopularArticles(parseInt(limit as string), category as string);
    const filteredArticles = articles.filter((article: IKnowledgeBase) => article.language === language);

    res.json({ success: true, data: { articles: filteredArticles } });

  } catch (error) {
    console.error('Get popular articles error:', error);
    res.status(500).json({ success: false, message: 'Failed to get popular articles', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Get article by category
export const getArticlesByCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category } = req.params;
    const { language = 'en', limit = 20, sortBy = 'analytics.views', sortOrder = 'desc' } = req.query;

    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    const articles = await KnowledgeBase.find({ category, status: 'published', language, isActive: true })
      .select('title summary seo.slug analytics.views analytics.helpful analytics.notHelpful createdAt')
      .sort(sort)
      .limit(parseInt(limit as string));

    const categoryStats = await KnowledgeBase.aggregate([
      { $match: { category, status: 'published', language, isActive: true } },
      { $group: { _id: null, totalArticles: { $sum: 1 }, totalViews: { $sum: '$analytics.views' }, avgHelpfulness: { $avg: { $cond: [{ $gt: [{ $add: ['$analytics.helpful', '$analytics.notHelpful'] }, 0] }, { $divide: ['$analytics.helpful', { $add: ['$analytics.helpful', '$analytics.notHelpful'] }] }, 0] } } } }
    ]);

    res.json({ success: true, data: { articles, stats: categoryStats[0] || { totalArticles: 0, totalViews: 0, avgHelpfulness: 0 } } });

  } catch (error) {
    console.error('Get articles by category error:', error);
    res.status(500).json({ success: false, message: 'Failed to get articles by category', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Mark article as helpful/not helpful
export const rateArticle = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { helpful } = req.body;

    if (typeof helpful !== 'boolean') {
        res.status(400).json({ success: false, message: 'Helpful rating (true/false) is required' });
        return;
    }

    const article = await KnowledgeBase.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
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

  } catch (error) {
    console.error('Rate article error:', error);
    res.status(500).json({ success: false, message: 'Failed to rate article', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Publish article
export const publishArticle = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const article = await KnowledgeBase.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
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

  } catch (error) {
    console.error('Publish article error:', error);
    res.status(500).json({ success: false, message: 'Failed to publish article', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Get knowledge base statistics
export const getKnowledgeStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period as string);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [categoryStats, statusStats, topArticles, recentActivity] = await Promise.all([
      KnowledgeBase.getCategoryStats(),
      KnowledgeBase.aggregate([{ $match: { isActive: true } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      KnowledgeBase.getPopularArticles(10),
      KnowledgeBase.find({ updatedAt: { $gte: startDate }, isActive: true }).select('title status updatedAt author').populate('author', 'name').sort({ updatedAt: -1 }).limit(10)
    ]);

    const totalViews = await KnowledgeBase.aggregate([{ $match: { isActive: true } }, { $group: { _id: null, totalViews: { $sum: '$analytics.views' }, totalSearches: { $sum: '$analytics.searches' } } }]);

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

  } catch (error) {
    console.error('Knowledge stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to get knowledge base statistics', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Get AI training data
export const getAITrainingData = async (req: Request, res: Response): Promise<void> => {
  try {
    const trainingData = await KnowledgeBase.getAITrainingData();

    const formattedData = trainingData.map((article: IKnowledgeBase) => ({
      id: article._id,
      title: article.title,
      content: article.content,
      category: article.category,
      intents: article.aiTrainingData.intents,
      entities: article.aiTrainingData.entities,
      sampleQuestions: article.aiTrainingData.sampleQuestions
    }));

    res.json({ success: true, data: { trainingData: formattedData, totalArticles: formattedData.length } });

  } catch (error) {
    console.error('Get AI training data error:', error);
    res.status(500).json({ success: false, message: 'Failed to get AI training data', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Add article to AI training
export const addToAITraining = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { intents, entities, sampleQuestions } = req.body;

    if (!intents || !entities || !sampleQuestions) {
        res.status(400).json({ success: false, message: 'Intents, entities, and sample questions are required' });
        return;
    }

    const article = await KnowledgeBase.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
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

  } catch (error) {
    console.error('Add to AI training error:', error);
    res.status(500).json({ success: false, message: 'Failed to add article to AI training', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export default { getArticles, getArticleById, createArticle, updateArticle, deleteArticle, searchArticles, getPopularArticles, getArticlesByCategory, rateArticle, publishArticle, getKnowledgeStats, getAITrainingData, addToAITraining };