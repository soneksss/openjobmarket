-- Enable Supabase Realtime replication on messages table so
-- postgres_changes INSERT subscriptions (used by live chat) actually fire.
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
