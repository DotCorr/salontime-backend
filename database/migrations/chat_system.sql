-- Chat System Database Schema
-- This migration creates all necessary tables for the chat functionality

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    salon_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    unread_count INTEGER DEFAULT 0,
    is_archived BOOLEAN DEFAULT FALSE,
    is_blocked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique conversation between client and salon
    UNIQUE(client_id, salon_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
    metadata JSONB,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversation participants (for future group chat support)
CREATE TABLE IF NOT EXISTS conversation_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(conversation_id, user_id)
);

-- Chat reports table
CREATE TABLE IF NOT EXISTS chat_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('spam', 'harassment', 'inappropriate', 'fake', 'other')),
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_client_id ON conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_salon_id ON conversations(salon_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON conversation_participants(user_id);

CREATE INDEX IF NOT EXISTS idx_chat_reports_conversation_id ON chat_reports(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_reports_reporter_id ON chat_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_chat_reports_status ON chat_reports(status);

-- Full-text search index for messages
CREATE INDEX IF NOT EXISTS idx_messages_content_search ON messages USING gin(to_tsvector('english', content));

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversations_updated_at 
    BEFORE UPDATE ON conversations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at 
    BEFORE UPDATE ON messages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_reports_updated_at 
    BEFORE UPDATE ON chat_reports 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically add participants when conversation is created
CREATE OR REPLACE FUNCTION add_conversation_participants()
RETURNS TRIGGER AS $$
BEGIN
    -- Add both client and salon as participants
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES (NEW.id, NEW.client_id), (NEW.id, NEW.salon_id);
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER add_conversation_participants_trigger
    AFTER INSERT ON conversations
    FOR EACH ROW EXECUTE FUNCTION add_conversation_participants();

-- Function to clean up old messages (for data retention)
CREATE OR REPLACE FUNCTION cleanup_old_messages()
RETURNS void AS $$
BEGIN
    -- Delete messages older than 1 year
    DELETE FROM messages 
    WHERE created_at < NOW() - INTERVAL '1 year';
    
    -- Delete archived conversations older than 6 months
    DELETE FROM conversations 
    WHERE is_archived = TRUE 
    AND updated_at < NOW() - INTERVAL '6 months';
END;
$$ language 'plpgsql';

-- Row Level Security (RLS) policies
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see conversations they're part of
CREATE POLICY "Users can view their conversations" ON conversations
    FOR SELECT USING (
        client_id = auth.uid() OR salon_id = auth.uid()
    );

-- RLS Policy: Users can only see messages from their conversations
CREATE POLICY "Users can view messages from their conversations" ON messages
    FOR SELECT USING (
        conversation_id IN (
            SELECT id FROM conversations 
            WHERE client_id = auth.uid() OR salon_id = auth.uid()
        )
    );

-- RLS Policy: Users can only insert messages to their conversations
CREATE POLICY "Users can send messages to their conversations" ON messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        conversation_id IN (
            SELECT id FROM conversations 
            WHERE client_id = auth.uid() OR salon_id = auth.uid()
        )
    );

-- RLS Policy: Users can only update their own messages
CREATE POLICY "Users can update their own messages" ON messages
    FOR UPDATE USING (sender_id = auth.uid());

-- RLS Policy: Users can only delete their own messages
CREATE POLICY "Users can delete their own messages" ON messages
    FOR DELETE USING (sender_id = auth.uid());

-- RLS Policy: Users can view participants of their conversations
CREATE POLICY "Users can view participants of their conversations" ON conversation_participants
    FOR SELECT USING (
        conversation_id IN (
            SELECT id FROM conversations 
            WHERE client_id = auth.uid() OR salon_id = auth.uid()
        )
    );

-- RLS Policy: Users can only report conversations they're part of
CREATE POLICY "Users can report their conversations" ON chat_reports
    FOR INSERT WITH CHECK (
        reporter_id = auth.uid() AND
        conversation_id IN (
            SELECT id FROM conversations 
            WHERE client_id = auth.uid() OR salon_id = auth.uid()
        )
    );

-- Grant necessary permissions
GRANT ALL ON conversations TO authenticated;
GRANT ALL ON messages TO authenticated;
GRANT ALL ON conversation_participants TO authenticated;
GRANT ALL ON chat_reports TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
