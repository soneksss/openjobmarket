-- Create conversations table to track message threads between users
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_1 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    participant_2 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    -- Ensure participants are unique and ordered (to prevent duplicate conversations)
    CONSTRAINT unique_participants UNIQUE (participant_1, participant_2),
    -- Ensure participant_1 < participant_2 to maintain ordering
    CONSTRAINT ordered_participants CHECK (participant_1 < participant_2)
);

-- Add updated_at column if it doesn't exist (for existing tables)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE conversations
      ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
    RAISE NOTICE 'Added updated_at column to conversations table';
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_participant_1 ON conversations(participant_1);
CREATE INDEX IF NOT EXISTS idx_conversations_participant_2 ON conversations(participant_2);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);

-- Enable Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete their own conversations" ON conversations;

-- Policy: Users can view conversations they are part of
CREATE POLICY "Users can view their own conversations"
ON conversations FOR SELECT
USING (
    auth.uid() = participant_1 OR
    auth.uid() = participant_2
);

-- Policy: Users can create conversations
CREATE POLICY "Users can create conversations"
ON conversations FOR INSERT
WITH CHECK (
    auth.uid() = participant_1 OR
    auth.uid() = participant_2
);

-- Policy: Users can delete conversations they are part of
CREATE POLICY "Users can delete their own conversations"
ON conversations FOR DELETE
USING (
    auth.uid() = participant_1 OR
    auth.uid() = participant_2
);

-- Function to get or create a conversation between two users
CREATE OR REPLACE FUNCTION get_or_create_conversation(user1_id UUID, user2_id UUID)
RETURNS UUID AS $$
DECLARE
    conversation_id UUID;
    ordered_user1 UUID;
    ordered_user2 UUID;
BEGIN
    -- Ensure participant_1 < participant_2 for consistency
    IF user1_id < user2_id THEN
        ordered_user1 := user1_id;
        ordered_user2 := user2_id;
    ELSE
        ordered_user1 := user2_id;
        ordered_user2 := user1_id;
    END IF;

    -- Try to find existing conversation
    SELECT id INTO conversation_id
    FROM conversations
    WHERE participant_1 = ordered_user1 AND participant_2 = ordered_user2;

    -- If not found, create new conversation
    IF conversation_id IS NULL THEN
        INSERT INTO conversations (participant_1, participant_2)
        VALUES (ordered_user1, ordered_user2)
        RETURNING id INTO conversation_id;
    END IF;

    RETURN conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_or_create_conversation(UUID, UUID) TO authenticated;

-- Function to update conversation updated_at when a new message is sent
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations
    SET updated_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update conversation timestamp
DROP TRIGGER IF EXISTS update_conversation_timestamp_trigger ON messages;
CREATE TRIGGER update_conversation_timestamp_trigger
AFTER INSERT ON messages
FOR EACH ROW
WHEN (NEW.conversation_id IS NOT NULL)
EXECUTE FUNCTION update_conversation_timestamp();

-- Migrate existing messages to have conversation_ids
DO $$
DECLARE
    msg RECORD;
    conv_id UUID;
    ordered_sender UUID;
    ordered_recipient UUID;
BEGIN
    -- Process messages that don't have a conversation_id yet
    FOR msg IN
        SELECT DISTINCT sender_id, recipient_id
        FROM messages
        WHERE conversation_id IS NULL
        AND sender_id IS NOT NULL
        AND recipient_id IS NOT NULL
    LOOP
        -- Determine ordered participants
        IF msg.sender_id < msg.recipient_id THEN
            ordered_sender := msg.sender_id;
            ordered_recipient := msg.recipient_id;
        ELSE
            ordered_sender := msg.recipient_id;
            ordered_recipient := msg.sender_id;
        END IF;

        -- Get or create conversation
        SELECT id INTO conv_id
        FROM conversations
        WHERE participant_1 = ordered_sender AND participant_2 = ordered_recipient;

        IF conv_id IS NULL THEN
            INSERT INTO conversations (participant_1, participant_2)
            VALUES (ordered_sender, ordered_recipient)
            RETURNING id INTO conv_id;
        END IF;

        -- Update all messages between these two users
        UPDATE messages
        SET conversation_id = conv_id
        WHERE conversation_id IS NULL
        AND (
            (sender_id = msg.sender_id AND recipient_id = msg.recipient_id) OR
            (sender_id = msg.recipient_id AND recipient_id = msg.sender_id)
        );
    END LOOP;
END $$;

-- Add comment
COMMENT ON TABLE conversations IS 'Stores conversation threads between two users';
COMMENT ON FUNCTION get_or_create_conversation IS 'Gets existing conversation or creates new one between two users';
