-- Re-run the conversation_id backfill for any messages still missing it.
-- This is idempotent — only touches rows where conversation_id IS NULL.
-- Needed because the original backfill (20260129000001) ran once at deploy time;
-- any messages sent via direct DB insert after that were left without a conversation_id,
-- causing the conversation view to show "No messages yet" for those threads.

DO $$
DECLARE
    msg RECORD;
    conv_id UUID;
    p1 UUID;
    p2 UUID;
BEGIN
    FOR msg IN
        SELECT DISTINCT sender_id, recipient_id
        FROM messages
        WHERE conversation_id IS NULL
          AND sender_id IS NOT NULL
          AND recipient_id IS NOT NULL
    LOOP
        -- Enforce participant_1 < participant_2 ordering (matches UNIQUE constraint)
        IF msg.sender_id < msg.recipient_id THEN
            p1 := msg.sender_id;  p2 := msg.recipient_id;
        ELSE
            p1 := msg.recipient_id; p2 := msg.sender_id;
        END IF;

        -- Get existing conversation or create one
        SELECT id INTO conv_id FROM conversations WHERE participant_1 = p1 AND participant_2 = p2;
        IF conv_id IS NULL THEN
            INSERT INTO conversations (participant_1, participant_2)
            VALUES (p1, p2)
            RETURNING id INTO conv_id;
        END IF;

        -- Stamp all legacy messages between this pair
        UPDATE messages
        SET conversation_id = conv_id
        WHERE conversation_id IS NULL
          AND (
            (sender_id = msg.sender_id AND recipient_id = msg.recipient_id) OR
            (sender_id = msg.recipient_id AND recipient_id = msg.sender_id)
          );
    END LOOP;

    RAISE NOTICE '✓ Legacy message conversation_id backfill complete';
END $$;
