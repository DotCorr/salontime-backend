const supabaseService = require('../services/supabaseService');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

class ChatController {
  // Get user's conversations
  getConversations = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    const { data: conversations, error } = await supabaseService.supabase
      .from('conversations')
      .select(`
        *,
        participants:conversation_participants(
          user_id,
          users:user_id(
            id,
            name,
            email,
            avatar_url,
            user_type
          )
        ),
        last_message:messages(
          id,
          content,
          message_type,
          created_at,
          sender_id
        )
      `)
      .or(`client_id.eq.${userId},salon_id.eq.${userId}`)
      .order('updated_at', { ascending: false })
      .limit(parseInt(limit))
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error) throw error;

    // Process conversations to include salon/client info
    const processedConversations = conversations.map(conv => {
      const otherParticipant = conv.participants.find(p => p.user_id !== userId);
      const lastMessage = conv.last_message?.[0];
      
      return {
        id: conv.id,
        salon_id: conv.salon_id,
        client_id: conv.client_id,
        salon_name: otherParticipant?.users?.name || 'Unknown',
        salon_image: otherParticipant?.users?.avatar_url,
        last_message: lastMessage?.content || '',
        last_message_time: lastMessage?.created_at,
        unread_count: conv.unread_count || 0,
        is_archived: conv.is_archived || false,
        is_blocked: conv.is_blocked || false,
        created_at: conv.created_at,
        updated_at: conv.updated_at
      };
    });

    res.json({
      success: true,
      data: processedConversations
    });
  });

  // Get messages for a conversation
  getMessages = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const userId = req.user.id;
    const { limit = 50, before } = req.query;

    // Verify user has access to this conversation
    const { data: conversation, error: convError } = await supabaseService.supabase
      .from('conversations')
      .select('id, client_id, salon_id')
      .eq('id', conversationId)
      .or(`client_id.eq.${userId},salon_id.eq.${userId}`)
      .single();

    if (convError || !conversation) {
      throw new AppError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND');
    }

    let query = supabaseService.supabase
      .from('messages')
      .select(`
        *,
        sender:sender_id(
          id,
          name,
          avatar_url,
          user_type
        )
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (before) {
      query = query.lt('id', before);
    }

    const { data: messages, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: messages
    });
  });

  // Send message
  sendMessage = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const userId = req.user.id;
    const { content, message_type = 'text', metadata } = req.body;

    if (!content || content.trim().length === 0) {
      throw new AppError('Message content is required', 400, 'MISSING_MESSAGE_CONTENT');
    }

    // Verify user has access to this conversation
    const { data: conversation, error: convError } = await supabaseService.supabase
      .from('conversations')
      .select('id, client_id, salon_id, is_blocked')
      .eq('id', conversationId)
      .or(`client_id.eq.${userId},salon_id.eq.${userId}`)
      .single();

    if (convError || !conversation) {
      throw new AppError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND');
    }

    if (conversation.is_blocked) {
      throw new AppError('Cannot send message to blocked conversation', 403, 'CONVERSATION_BLOCKED');
    }

    // Create message
    const { data: message, error: messageError } = await supabaseService.supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        content: content.trim(),
        message_type,
        metadata: metadata || null
      })
      .select(`
        *,
        sender:sender_id(
          id,
          name,
          avatar_url,
          user_type
        )
      `)
      .single();

    if (messageError) throw messageError;

    // Update conversation timestamp and unread count
    const otherUserId = conversation.client_id === userId ? conversation.salon_id : conversation.client_id;
    
    await supabaseService.supabase
      .from('conversations')
      .update({
        updated_at: new Date().toISOString(),
        unread_count: supabaseService.supabase.raw(`CASE WHEN client_id = ${otherUserId} THEN unread_count + 1 ELSE unread_count END`)
      })
      .eq('id', conversationId);

    res.status(201).json({
      success: true,
      data: message
    });
  });

  // Create new conversation
  createConversation = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { salon_id, client_id, initial_message } = req.body;

    // Determine the other user
    const otherUserId = req.user.user_type === 'client' ? salon_id : client_id;
    
    if (!otherUserId) {
      throw new AppError('Salon or client ID is required', 400, 'MISSING_PARTICIPANT');
    }

    // Check if conversation already exists
    const { data: existingConv, error: checkError } = await supabaseService.supabase
      .from('conversations')
      .select('id')
      .or(`and(client_id.eq.${userId},salon_id.eq.${otherUserId}),and(client_id.eq.${otherUserId},salon_id.eq.${userId})`)
      .single();

    if (existingConv) {
      // Return existing conversation
      return res.json({
        success: true,
        data: { id: existingConv.id, is_existing: true }
      });
    }

    // Create new conversation
    const { data: conversation, error: convError } = await supabaseService.supabase
      .from('conversations')
      .insert({
        client_id: req.user.user_type === 'client' ? userId : otherUserId,
        salon_id: req.user.user_type === 'client' ? otherUserId : userId
      })
      .select()
      .single();

    if (convError) throw convError;

    // Add participants
    await supabaseService.supabase
      .from('conversation_participants')
      .insert([
        { conversation_id: conversation.id, user_id: userId },
        { conversation_id: conversation.id, user_id: otherUserId }
      ]);

    // Send initial message if provided
    if (initial_message) {
      await supabaseService.supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: userId,
          content: initial_message,
          message_type: 'text'
        });
    }

    res.status(201).json({
      success: true,
      data: { id: conversation.id, is_existing: false }
    });
  });

  // Mark messages as read
  markAsRead = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const userId = req.user.id;

    // Verify user has access to this conversation
    const { data: conversation, error: convError } = await supabaseService.supabase
      .from('conversations')
      .select('id, client_id, salon_id')
      .eq('id', conversationId)
      .or(`client_id.eq.${userId},salon_id.eq.${userId}`)
      .single();

    if (convError || !conversation) {
      throw new AppError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND');
    }

    // Reset unread count for this user
    await supabaseService.supabase
      .from('conversations')
      .update({ unread_count: 0 })
      .eq('id', conversationId);

    res.json({
      success: true,
      message: 'Messages marked as read'
    });
  });

  // Get unread count for a conversation
  getUnreadCount = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const { data: conversation, error } = await supabaseService.supabase
      .from('conversations')
      .select('unread_count')
      .eq('id', conversationId)
      .or(`client_id.eq.${userId},salon_id.eq.${userId}`)
      .single();

    if (error || !conversation) {
      throw new AppError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND');
    }

    res.json({
      success: true,
      data: { count: conversation.unread_count || 0 }
    });
  });

  // Get total unread count
  getTotalUnreadCount = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const { data: conversations, error } = await supabaseService.supabase
      .from('conversations')
      .select('unread_count')
      .or(`client_id.eq.${userId},salon_id.eq.${userId}`);

    if (error) throw error;

    const totalUnread = conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);

    res.json({
      success: true,
      data: { count: totalUnread }
    });
  });

  // Delete message
  deleteMessage = asyncHandler(async (req, res) => {
    const { conversationId, messageId } = req.params;
    const userId = req.user.id;

    // Verify user has access to this conversation and message
    const { data: message, error: messageError } = await supabaseService.supabase
      .from('messages')
      .select('id, sender_id, conversation_id')
      .eq('id', messageId)
      .eq('conversation_id', conversationId)
      .single();

    if (messageError || !message) {
      throw new AppError('Message not found', 404, 'MESSAGE_NOT_FOUND');
    }

    if (message.sender_id !== userId) {
      throw new AppError('Cannot delete message from other user', 403, 'MESSAGE_DELETE_FORBIDDEN');
    }

    // Delete message
    const { error: deleteError } = await supabaseService.supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (deleteError) throw deleteError;

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  });

  getConversationDetails = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const userId = req.user.id;

    try {
      const { data: conversation, error } = await supabaseService.supabase
        .from('conversations')
        .select(`
          *,
          client:user_profiles!conversations_client_id_fkey(*),
          salon:user_profiles!conversations_salon_id_fkey(*)
        `)
        .eq('id', conversationId)
        .single();

      if (error || !conversation) {
        throw new AppError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND');
      }

      // Check if user is part of the conversation
      if (conversation.client_id !== userId && conversation.salon_id !== userId) {
        throw new AppError('Unauthorized to view conversation', 403, 'UNAUTHORIZED');
      }

      res.status(200).json({
        success: true,
        data: { conversation }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to get conversation details', 500, 'FETCH_FAILED');
    }
  });

  searchMessages = asyncHandler(async (req, res) => {
    const { q, conversationId } = req.query;
    const userId = req.user.id;

    try {
      let query = supabaseService.supabase
        .from('messages')
        .select(`
          *,
          sender:user_profiles!messages_sender_id_fkey(*)
        `)
        .ilike('content', `%${q}%`);

      if (conversationId) {
        query = query.eq('conversation_id', conversationId);
      }

      const { data: messages, error } = await query;

      if (error) {
        throw new AppError('Failed to search messages', 500, 'SEARCH_FAILED');
      }

      res.status(200).json({
        success: true,
        data: { messages }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to search messages', 500, 'SEARCH_FAILED');
    }
  });

  archiveConversation = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const userId = req.user.id;

    try {
      const { error } = await supabaseService.supabase
        .from('conversations')
        .update({ is_archived: true })
        .eq('id', conversationId)
        .or(`client_id.eq.${userId},salon_id.eq.${userId}`);

      if (error) {
        throw new AppError('Failed to archive conversation', 500, 'ARCHIVE_FAILED');
      }

      res.status(200).json({
        success: true,
        message: 'Conversation archived successfully'
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to archive conversation', 500, 'ARCHIVE_FAILED');
    }
  });

  blockUser = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const userId = req.user.id;

    try {
      const { error } = await supabaseService.supabase
        .from('conversations')
        .update({ is_blocked: true })
        .eq('id', conversationId)
        .or(`client_id.eq.${userId},salon_id.eq.${userId}`);

      if (error) {
        throw new AppError('Failed to block user', 500, 'BLOCK_FAILED');
      }

      res.status(200).json({
        success: true,
        message: 'User blocked successfully'
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to block user', 500, 'BLOCK_FAILED');
    }
  });

  reportConversation = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const { reason, description } = req.body;
    const userId = req.user.id;

    try {
      const { error } = await supabaseService.supabase
        .from('chat_reports')
        .insert({
          conversation_id: conversationId,
          reporter_id: userId,
          reason,
          description
        });

      if (error) {
        throw new AppError('Failed to report conversation', 500, 'REPORT_FAILED');
      }

      res.status(200).json({
        success: true,
        message: 'Conversation reported successfully'
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to report conversation', 500, 'REPORT_FAILED');
    }
  });
}

module.exports = new ChatController();