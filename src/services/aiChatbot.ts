// src/services/aiChatbot.ts
import KnowledgeBase from '../models/KnowledgeBase';
import Booking from '../models/Booking';
import Route from '../models/Route';
import User from '../models/User';
import Chat from '../models/Chat';

// AI Response interface
interface AIResponse {
  message: string;
  confidence: number;
  type: 'answer' | 'clarification' | 'escalation' | 'greeting' | 'goodbye';
  suggestions?: string[];
  actions?: Array<{ type: string; data: any }>;
  requiresHuman?: boolean;
  responseId: string;
  context?: any;
}

// Intent classification patterns
const INTENT_PATTERNS = {
  greeting: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
  goodbye: ['bye', 'goodbye', 'thank you', 'thanks', 'see you'],
  booking_inquiry: ['book', 'booking', 'reserve', 'ticket', 'seat', 'travel'],
  payment_issue: ['payment', 'pay', 'refund', 'money', 'charge', 'bill', 'cost', 'price'],
  tracking: ['track', 'location', 'where', 'status', 'progress', 'arrival', 'eta'],
  route_info: ['route', 'schedule', 'time', 'departure', 'arrival', 'frequency'],
  complaint: ['complain', 'problem', 'issue', 'wrong', 'bad', 'terrible', 'angry'],
  technical: ['website', 'app', 'login', 'password', 'error', 'bug', 'not working'],
  cancellation: ['cancel', 'refund', 'change', 'modify', 'reschedule']
};

// Sentiment analysis keywords
const SENTIMENT_KEYWORDS = {
  positive: ['good', 'great', 'excellent', 'amazing', 'perfect', 'love', 'satisfied', 'happy'],
  negative: ['bad', 'terrible', 'awful', 'hate', 'angry', 'frustrated', 'disappointed', 'upset'],
  urgent: ['urgent', 'emergency', 'asap', 'immediately', 'critical', 'help', 'stuck']
};

// Get AI response to customer message
export const getAIResponse = async (message: string, context: any = {}, sessionId?: string): Promise<AIResponse> => {
  try {
    const processedMessage = message.toLowerCase().trim();
    const responseId = `AI${Date.now()}${Math.random().toString(36).substring(2, 8)}`;

    // Analyze intent and sentiment
    const intent = classifyIntent(processedMessage);
    const sentiment = analyzeSentiment(processedMessage);
    const confidence = calculateConfidence(processedMessage, intent);

    // Generate response based on intent
    let response: AIResponse;

    switch (intent) {
      case 'greeting':
        response = await handleGreeting(context);
        break;
      case 'goodbye':
        response = await handleGoodbye(context);
        break;
      case 'booking_inquiry':
        response = await handleBookingInquiry(processedMessage, context);
        break;
      case 'payment_issue':
        response = await handlePaymentIssue(processedMessage, context);
        break;
      case 'tracking':
        response = await handleTracking(processedMessage, context);
        break;
      case 'route_info':
        response = await handleRouteInfo(processedMessage, context);
        break;
      case 'complaint':
        response = await handleComplaint(processedMessage, context);
        break;
      case 'technical':
        response = await handleTechnicalIssue(processedMessage, context);
        break;
      case 'cancellation':
        response = await handleCancellation(processedMessage, context);
        break;
      default:
        response = await handleGeneral(processedMessage, context);
    }

    // Adjust confidence based on sentiment analysis
    if (sentiment.score < -0.5) response.confidence *= 0.8; // Lower confidence for negative sentiment
    if (sentiment.urgency > 0.7) response.requiresHuman = true; // Escalate urgent messages

    // Add metadata
    response.responseId = responseId;
    response.confidence = Math.min(confidence, 1.0);
    response.context = { ...context, intent, sentiment, timestamp: new Date() };

    // Update chat metrics if sessionId provided
    if (sessionId) await updateChatMetrics(sessionId, response);

    return response;

  } catch (error) {
    console.error('AI response generation error:', error);
    return {
      message: "I apologize, but I'm experiencing some technical difficulties. Let me connect you with a human agent who can assist you better.",
      confidence: 0.1,
      type: 'escalation',
      requiresHuman: true,
      responseId: `AI_ERROR_${Date.now()}`,
      context: { error: true }
    };
  }
};

// Intent classification
const classifyIntent = (message: string): string => {
  const words = message.split(' ');
  const scores: { [key: string]: number } = {};

  // Calculate scores for each intent
  Object.entries(INTENT_PATTERNS).forEach(([intent, patterns]) => {
    scores[intent] = patterns.reduce((score, pattern) => {
      return score + (message.includes(pattern) ? 1 : 0);
    }, 0);
  });

  // Return intent with highest score
  const maxScore = Math.max(...Object.values(scores));
  return maxScore > 0 ? Object.keys(scores).find(key => scores[key] === maxScore) || 'general' : 'general';
};

// Sentiment analysis
export const analyzeSentiment = (text: string, type: string = 'chat'): { sentiment: string; score: number; urgency: number; confidence: number } => {
  const words = text.toLowerCase().split(' ');
  let sentimentScore = 0;
  let urgencyScore = 0;
  let matchedWords = 0;

  // Calculate sentiment score
  words.forEach(word => {
    if (SENTIMENT_KEYWORDS.positive.includes(word)) { sentimentScore += 1; matchedWords++; }
    if (SENTIMENT_KEYWORDS.negative.includes(word)) { sentimentScore -= 1; matchedWords++; }
    if (SENTIMENT_KEYWORDS.urgent.includes(word)) { urgencyScore += 1; matchedWords++; }
  });

  // Normalize scores
  const normalizedSentiment = sentimentScore / Math.max(words.length, 1);
  const normalizedUrgency = urgencyScore / Math.max(words.length, 1);
  const confidence = matchedWords / Math.max(words.length, 1);

  let sentiment = 'neutral';
  if (normalizedSentiment > 0.1) sentiment = 'positive';
  else if (normalizedSentiment < -0.1) sentiment = 'negative';

  return { sentiment, score: normalizedSentiment, urgency: normalizedUrgency, confidence };
};

// Calculate response confidence
const calculateConfidence = (message: string, intent: string): number => {
  const patterns = INTENT_PATTERNS[intent as keyof typeof INTENT_PATTERNS] || [];
  const matches = patterns.filter(pattern => message.includes(pattern)).length;
  return Math.min(matches / Math.max(patterns.length, 1) + 0.3, 1.0);
};

// Intent handlers
const handleGreeting = async (context: any): Promise<AIResponse> => {
  const greetings = [
    "Hello! Welcome to Sri Express customer support. How can I help you today?",
    "Hi there! I'm here to assist you with your Sri Express inquiries. What can I do for you?",
    "Good day! Thank you for contacting Sri Express. How may I assist you?"
  ];

  return {
    message: greetings[Math.floor(Math.random() * greetings.length)],
    confidence: 0.9,
    type: 'greeting',
    suggestions: ['Book a ticket', 'Track my booking', 'Payment help', 'Route information'],
    responseId: '',
    context
  };
};

const handleGoodbye = async (context: any): Promise<AIResponse> => {
  const goodbyes = [
    "Thank you for choosing Sri Express! Have a great day and safe travels!",
    "You're welcome! If you need any more help, don't hesitate to reach out. Safe journey!",
    "Glad I could help! Wishing you a pleasant trip with Sri Express!"
  ];

  return {
    message: goodbyes[Math.floor(Math.random() * goodbyes.length)],
    confidence: 0.9,
    type: 'goodbye',
    responseId: '',
    context
  };
};

const handleBookingInquiry = async (message: string, context: any): Promise<AIResponse> => {
  try {
    // Search knowledge base for booking-related articles
    const articles = await KnowledgeBase.searchArticles(message, 'booking');
    
    if (articles.length > 0) {
      const article = articles[0];
      return {
        message: `Here's what I found about booking: ${article.summary}\n\nWould you like me to help you with:\n1. Search available routes\n2. Make a new booking\n3. Check existing booking\n4. Connect with an agent`,
        confidence: 0.8,
        type: 'answer',
        suggestions: ['Search routes', 'New booking', 'Check booking', 'Speak to agent'],
        actions: [{ type: 'show_article', data: { articleId: article._id, title: article.title } }],
        responseId: '',
        context
      };
    }

    return {
      message: "I can help you with booking tickets! To get started, I'll need to know:\n1. Where would you like to travel from?\n2. What's your destination?\n3. When would you like to travel?\n\nOr would you prefer to speak with an agent?",
      confidence: 0.7,
      type: 'clarification',
      suggestions: ['Colombo to Kandy', 'Colombo to Galle', 'Search all routes', 'Speak to agent'],
      responseId: '',
      context
    };

  } catch (error) {
    return getEscalationResponse('booking inquiry', context);
  }
};

const handlePaymentIssue = async (message: string, context: any): Promise<AIResponse> => {
  try {
    // Check if user has recent bookings with payment issues
    if (context.userId) {
      const recentBookings = await Booking.find({ userId: context.userId, 'paymentInfo.status': { $in: ['pending', 'failed'] } }).limit(3).sort({ createdAt: -1 });
      
      if (recentBookings.length > 0) {
        const booking = recentBookings[0];
        return {
          message: `I see you have a booking (${booking.bookingId}) with payment status "${booking.paymentInfo.status}". Here are your options:\n\n1. Retry payment\n2. Use different payment method\n3. Request refund\n4. Speak with billing specialist\n\nWhich would you prefer?`,
          confidence: 0.9,
          type: 'answer',
          suggestions: ['Retry payment', 'Different method', 'Request refund', 'Billing specialist'],
          actions: [{ type: 'show_booking', data: { bookingId: booking.bookingId } }],
          responseId: '',
          context
        };
      }
    }

    // Search knowledge base for payment articles
    const articles = await KnowledgeBase.searchArticles(message, 'payment');
    if (articles.length > 0) {
      return {
        message: `Here's information about payments: ${articles[0].summary}\n\nFor specific payment issues, I recommend speaking with our billing team who can access your account securely.`,
        confidence: 0.7,
        type: 'answer',
        suggestions: ['Billing specialist', 'Payment methods', 'Refund policy'],
        requiresHuman: true,
        responseId: '',
        context
      };
    }

    return {
      message: "I understand you're having payment difficulties. For security reasons, I'll connect you with our billing specialist who can securely access your payment information and resolve the issue quickly.",
      confidence: 0.8,
      type: 'escalation',
      requiresHuman: true,
      responseId: '',
      context
    };

  } catch (error) {
    return getEscalationResponse('payment issue', context);
  }
};

const handleTracking = async (message: string, context: any): Promise<AIResponse> => {
  try {
    if (context.userId) {
      // Get user's recent bookings
      const recentBookings = await Booking.find({ userId: context.userId, status: { $in: ['confirmed', 'pending'] } }).limit(5).sort({ travelDate: 1 }).populate('routeId', 'name startLocation endLocation');
      
      if (recentBookings.length > 0) {
        const bookingsList = recentBookings.map(b => `• ${b.bookingId} - ${b.routeId?.name || 'Route'} on ${new Date(b.travelDate).toLocaleDateString()}`).join('\n');
        
        return {
          message: `Here are your recent bookings:\n\n${bookingsList}\n\nWhich booking would you like to track? Or would you like live vehicle tracking for your route?`,
          confidence: 0.9,
          type: 'answer',
          suggestions: recentBookings.slice(0, 3).map(b => b.bookingId).concat(['Live tracking']),
          actions: [{ type: 'show_bookings', data: { bookings: recentBookings } }],
          responseId: '',
          context
        };
      }
    }

    return {
      message: "I can help you track your journey! Please provide:\n1. Your booking ID/ticket number, or\n2. The route you're traveling on\n\nI can then show you real-time vehicle location and estimated arrival times.",
      confidence: 0.8,
      type: 'clarification',
      suggestions: ['Enter booking ID', 'Select route', 'Live map view'],
      responseId: '',
      context
    };

  } catch (error) {
    return getEscalationResponse('tracking inquiry', context);
  }
};

const handleRouteInfo = async (message: string, context: any): Promise<AIResponse> => {
  try {
    // Search for route information
    const routes = await Route.find({ $or: [{ name: { $regex: message, $options: 'i' } }, { 'startLocation.name': { $regex: message, $options: 'i' } }, { 'endLocation.name': { $regex: message, $options: 'i' } }] }).limit(5);
    
    if (routes.length > 0) {
      const routesList = routes.map(r => `• ${r.name}: ${r.startLocation.name} → ${r.endLocation.name} (${r.estimatedDuration} min)`).join('\n');
      
      return {
        message: `Here are the routes I found:\n\n${routesList}\n\nWould you like detailed schedules, pricing, or real-time information for any of these routes?`,
        confidence: 0.9,
        type: 'answer',
        suggestions: routes.slice(0, 3).map(r => r.name).concat(['All schedules']),
        actions: [{ type: 'show_routes', data: { routes } }],
        responseId: '',
        context
      };
    }

    return {
      message: "I can provide route information including schedules, pricing, and real-time updates! Which route are you interested in? You can specify:\n\n• Origin and destination (e.g., 'Colombo to Kandy')\n• Route name\n• Or I can show all available routes",
      confidence: 0.8,
      type: 'clarification',
      suggestions: ['Colombo to Kandy', 'Colombo to Galle', 'All routes', 'Route map'],
      responseId: '',
      context
    };

  } catch (error) {
    return getEscalationResponse('route information', context);
  }
};

const handleComplaint = async (message: string, context: any): Promise<AIResponse> => {
  return {
    message: "I'm sorry to hear about the issue you're experiencing. Your feedback is very important to us, and I want to make sure you get the best assistance possible. I'm connecting you with a senior customer service representative who can address your concerns immediately and work towards a resolution.",
    confidence: 0.9,
    type: 'escalation',
    requiresHuman: true,
    actions: [{ type: 'escalate_priority', data: { reason: 'customer_complaint', sentiment: 'negative' } }],
    responseId: '',
    context
  };
};

const handleTechnicalIssue = async (message: string, context: any): Promise<AIResponse> => {
  try {
    const articles = await KnowledgeBase.searchArticles(message, 'technical');
    
    if (articles.length > 0) {
      return {
        message: `I found some technical help information: ${articles[0].summary}\n\nIf this doesn't resolve your issue, I can connect you with our technical support team.`,
        confidence: 0.7,
        type: 'answer',
        suggestions: ['Try solution', 'More help', 'Technical support'],
        actions: [{ type: 'show_article', data: { articleId: articles[0]._id } }],
        responseId: '',
        context
      };
    }

    return {
      message: "I understand you're experiencing technical difficulties. Let me connect you with our technical support team who can provide specialized assistance with app, website, or booking system issues.",
      confidence: 0.8,
      type: 'escalation',
      requiresHuman: true,
      responseId: '',
      context
    };

  } catch (error) {
    return getEscalationResponse('technical issue', context);
  }
};

const handleCancellation = async (message: string, context: any): Promise<AIResponse> => {
  try {
    if (context.userId) {
      const activeBookings = await Booking.find({ userId: context.userId, status: 'confirmed', travelDate: { $gte: new Date() } }).limit(5).sort({ travelDate: 1 });
      
      if (activeBookings.length > 0) {
        return {
          message: `I can help you with cancellations. Here are your upcoming bookings:\n\n${activeBookings.map(b => `• ${b.bookingId} - ${new Date(b.travelDate).toLocaleDateString()}`).join('\n')}\n\nWhich booking would you like to modify or cancel? Please note our cancellation policy for refunds.`,
          confidence: 0.9,
          type: 'answer',
          suggestions: activeBookings.slice(0, 3).map(b => b.bookingId).concat(['Cancellation policy']),
          requiresHuman: true, // Cancellations should be handled by humans for verification
          responseId: '',
          context
        };
      }
    }

    return {
      message: "I can help you with cancellations and modifications. To proceed securely, I'll connect you with an agent who can verify your booking details and assist with the cancellation process according to our policy.",
      confidence: 0.8,
      type: 'escalation',
      requiresHuman: true,
      responseId: '',
      context
    };

  } catch (error) {
    return getEscalationResponse('cancellation request', context);
  }
};

const handleGeneral = async (message: string, context: any): Promise<AIResponse> => {
  try {
    // Search knowledge base for general information
    const articles = await KnowledgeBase.searchArticles(message);
    
    if (articles.length > 0 && articles[0].score > 0.5) {
      return {
        message: `I found this information that might help: ${articles[0].summary}\n\nWould you like more details, or is there something specific you'd like assistance with?`,
        confidence: 0.6,
        type: 'answer',
        suggestions: ['More details', 'Book ticket', 'Track booking', 'Speak to agent'],
        actions: [{ type: 'show_article', data: { articleId: articles[0]._id } }],
        responseId: '',
        context
      };
    }

    return {
      message: "I'd be happy to help! I can assist you with:\n\n• Booking tickets and checking schedules\n• Tracking your journey and vehicle locations\n• Payment and refund inquiries\n• Route information and pricing\n• Technical support\n\nWhat would you like help with today?",
      confidence: 0.5,
      type: 'clarification',
      suggestions: ['Book ticket', 'Track journey', 'Payment help', 'Route info', 'Speak to agent'],
      responseId: '',
      context
    };

  } catch (error) {
    return getEscalationResponse('general inquiry', context);
  }
};

// Helper function for escalation response
const getEscalationResponse = (issueType: string, context: any): AIResponse => {
  return {
    message: `I want to make sure you get the best help with your ${issueType}. Let me connect you with one of our experienced agents who can provide personalized assistance.`,
    confidence: 0.6,
    type: 'escalation',
    requiresHuman: true,
    responseId: '',
    context
  };
};

// Get response suggestions for agents
export const getResponseSuggestions = async (customerMessage: string, context: any = {}): Promise<string[]> => {
  const intent = classifyIntent(customerMessage.toLowerCase());
  const sentiment = analyzeSentiment(customerMessage);
  
  const suggestions: string[] = [];
  
  // Add intent-based suggestions
  switch (intent) {
    case 'booking_inquiry':
      suggestions.push("I'd be happy to help you with booking. Let me search for available routes for you.", "What dates are you looking to travel?", "I can check real-time availability for your preferred route.");
      break;
    case 'payment_issue':
      suggestions.push("Let me check your payment status right away.", "I can help resolve this payment issue for you.", "Would you like to try a different payment method?");
      break;
    case 'tracking':
      suggestions.push("I can show you the live location of your vehicle.", "Let me get the latest status of your booking.", "Here's the real-time tracking information for your journey.");
      break;
    case 'complaint':
      suggestions.push("I sincerely apologize for the inconvenience you've experienced.", "I understand your frustration and I'm here to help resolve this.", "Let me escalate this to ensure you get the resolution you deserve.");
      break;
  }
  
  // Add sentiment-based suggestions
  if (sentiment.sentiment === 'negative') {
    suggestions.push("I understand this is frustrating. Let me help make this right for you.", "I apologize for any inconvenience. How can I best assist you today?");
  }
  
  // Add general helpful suggestions
  suggestions.push("Is there anything else I can help you with today?", "Would you like me to send you a summary of what we've discussed?", "I'm here to help - what questions do you have?");
  
  return suggestions.slice(0, 5); // Return top 5 suggestions
};

// Provide feedback on AI responses for training
export const provideFeedback = async (responseId: string, feedback: string, rating?: number): Promise<void> => {
  try {
    // In a real implementation, this would update AI training data
    console.log(`AI Feedback - Response: ${responseId}, Feedback: ${feedback}, Rating: ${rating}`);
    
    // Store feedback for AI model improvement
    // This could be saved to a feedback collection in MongoDB
  } catch (error) {
    console.error('Feedback storage error:', error);
  }
};

// Update chat metrics when AI responds
const updateChatMetrics = async (sessionId: string, response: AIResponse): Promise<void> => {
  try {
    const chat = await Chat.findOne({ sessionId, isActive: true });
    if (chat) {
      chat.aiMetrics.aiResponseCount++;
      chat.aiMetrics.aiConfidenceAvg = ((chat.aiMetrics.aiConfidenceAvg * (chat.aiMetrics.aiResponseCount - 1)) + response.confidence) / chat.aiMetrics.aiResponseCount;
      
      if (response.requiresHuman) {
        chat.aiMetrics.transferredToHuman = true;
        chat.aiMetrics.transferReason = 'AI escalation - ' + response.type;
      }
      
      await chat.save();
    }
  } catch (error) {
    console.error('Chat metrics update error:', error);
  }
};

export default { getAIResponse, analyzeSentiment, getResponseSuggestions, provideFeedback };