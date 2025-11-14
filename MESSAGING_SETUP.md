# Messaging System Setup Guide

## Database Tables Required

The messaging system requires the following tables to be created in your Supabase database:

### 1. Messages Table

```sql
-- Create messages table
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'direct' CHECK (message_type IN ('direct', 'reply', 'job_inquiry')),
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  conversation_id UUID,
  is_read BOOLEAN DEFAULT false,
  share_personal_info BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_job_id ON messages(job_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_is_read ON messages(is_read);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies for messages
CREATE POLICY "Users can view their own messages" ON messages
  FOR SELECT USING (
    sender_id = auth.uid() OR recipient_id = auth.uid()
  );

CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
  );

CREATE POLICY "Users can update their received messages" ON messages
  FOR UPDATE USING (
    recipient_id = auth.uid()
  );

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 2. Employer Privacy Permissions Table

```sql
-- Create employer privacy permissions table
CREATE TABLE employer_privacy_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  employer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  can_see_personal_info BOOLEAN DEFAULT false,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  revoked_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(professional_id, employer_id)
);

-- Create indexes
CREATE INDEX idx_privacy_permissions_professional_id ON employer_privacy_permissions(professional_id);
CREATE INDEX idx_privacy_permissions_employer_id ON employer_privacy_permissions(employer_id);
CREATE INDEX idx_privacy_permissions_active ON employer_privacy_permissions(is_active);

-- Enable RLS
ALTER TABLE employer_privacy_permissions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Professionals can manage their own privacy permissions" ON employer_privacy_permissions
  FOR ALL USING (
    professional_id = auth.uid()
  );

CREATE POLICY "Employers can view permissions granted to them" ON employer_privacy_permissions
  FOR SELECT USING (
    employer_id = auth.uid() AND is_active = true
  );
```

### 3. Update Conversation ID Trigger

```sql
-- Function to set conversation_id
CREATE OR REPLACE FUNCTION set_conversation_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If no conversation_id provided, create one based on participants and job
  IF NEW.conversation_id IS NULL THEN
    -- Try to find existing conversation between these users for this job
    SELECT conversation_id INTO NEW.conversation_id
    FROM messages
    WHERE (
      (sender_id = NEW.sender_id AND recipient_id = NEW.recipient_id) OR
      (sender_id = NEW.recipient_id AND recipient_id = NEW.sender_id)
    )
    AND (job_id = NEW.job_id OR (job_id IS NULL AND NEW.job_id IS NULL))
    AND conversation_id IS NOT NULL
    LIMIT 1;

    -- If no existing conversation found, generate new conversation_id
    IF NEW.conversation_id IS NULL THEN
      NEW.conversation_id = gen_random_uuid();
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER set_message_conversation_id
  BEFORE INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION set_conversation_id();
```

### 4. Message Functions

```sql
-- Function to get conversation participants
CREATE OR REPLACE FUNCTION get_conversation_participants(conversation_uuid UUID)
RETURNS TABLE(user_id UUID, full_name TEXT, nickname TEXT, profile_photo_url TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT u.id, u.full_name, u.nickname, u.profile_photo_url
  FROM users u
  WHERE u.id IN (
    SELECT DISTINCT m.sender_id FROM messages m WHERE m.conversation_id = conversation_uuid
    UNION
    SELECT DISTINCT m.recipient_id FROM messages m WHERE m.conversation_id = conversation_uuid
  );
END;
$$ LANGUAGE plpgsql;

-- Function to mark conversation as read
CREATE OR REPLACE FUNCTION mark_conversation_as_read(conversation_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE messages
  SET is_read = true
  WHERE conversation_id = conversation_uuid
  AND recipient_id = user_uuid
  AND is_read = false;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;
```

## Testing the Setup

After running the SQL scripts, test the messaging system:

1. **Send a Test Message**:
   - Go to `/messages/new`
   - Send a message between two test users
   - Verify the message appears in both sender's "Sent" and recipient's "Inbox"

2. **Test Conversation Threading**:
   - Reply to a message
   - Verify replies are grouped in the same conversation
   - Check that conversation_id is automatically assigned

3. **Test Privacy Permissions**:
   - As a professional, send a message with "Share personal info" checked
   - Verify the permission is recorded in employer_privacy_permissions table

4. **Test Message Reading**:
   - Send a message to a user
   - Login as recipient and view the message
   - Verify is_read changes to true

## Fix Implementation Issues

The main issues with message delivery are:

1. **Missing Foreign Key Constraints**: The messages table references users but the foreign key might not exist
2. **RLS Policies**: Row Level Security might be blocking message access
3. **User Profile Data**: Sender/recipient information not being properly fetched

To check for issues:

```sql
-- Check if messages table exists and has proper structure
\d messages;

-- Check RLS policies
\dp messages;

-- Test message retrieval
SELECT m.*, u1.full_name as sender_name, u2.full_name as recipient_name
FROM messages m
LEFT JOIN users u1 ON u1.id = m.sender_id
LEFT JOIN users u2 ON u2.id = m.recipient_id
ORDER BY m.created_at DESC
LIMIT 5;
```

This should resolve the message delivery issues between professionals and companies.