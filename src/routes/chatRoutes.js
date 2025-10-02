const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const chatController = require('../controllers/chatController');

// Get user's conversations
router.get('/conversations', authenticateToken, chatController.getConversations);

// Get messages for a conversation
router.get('/conversations/:conversationId/messages', authenticateToken, chatController.getMessages);

// Send message
router.post('/conversations/:conversationId/messages', authenticateToken, chatController.sendMessage);

// Create new conversation
router.post('/conversations', authenticateToken, chatController.createConversation);

// Mark messages as read
router.put('/conversations/:conversationId/read', authenticateToken, chatController.markAsRead);

// Get unread count for a conversation
router.get('/conversations/:conversationId/unread-count', authenticateToken, chatController.getUnreadCount);

// Get total unread count
router.get('/unread-count', authenticateToken, chatController.getTotalUnreadCount);

// Delete message
router.delete('/conversations/:conversationId/messages/:messageId', authenticateToken, chatController.deleteMessage);

// Get conversation details
router.get('/conversations/:conversationId', authenticateToken, chatController.getConversationDetails);

// Search messages
router.get('/search', authenticateToken, chatController.searchMessages);

// Archive conversation
router.put('/conversations/:conversationId/archive', authenticateToken, chatController.archiveConversation);

// Block user
router.put('/conversations/:conversationId/block', authenticateToken, chatController.blockUser);

// Report conversation
router.post('/conversations/:conversationId/report', authenticateToken, chatController.reportConversation);

module.exports = router;
