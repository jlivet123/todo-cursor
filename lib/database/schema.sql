-- This file contains the SQL schema for the Supabase database
-- It will be used when migrating from localStorage to Supabase

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alter Egos table
CREATE TABLE IF NOT EXISTS alter_egos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  superpower TEXT,
  bio TEXT,
  image_url TEXT,
  quote TEXT,
  era TEXT,
  achievements TEXT,
  challenges_overcome TEXT,
  values TEXT,
  learning_resources TEXT,
  voice_style TEXT,
  context_settings TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(name, user_id)
);

-- Alter Ego Category Mappings table
CREATE TABLE IF NOT EXISTS alter_ego_category_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alter_ego_id UUID NOT NULL REFERENCES alter_egos(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(alter_ego_id, category_id)
);

-- System Prompts table
CREATE TABLE IF NOT EXISTS system_prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

-- Alter Ego Prompts table
CREATE TABLE IF NOT EXISTS alter_ego_prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alter_ego_id UUID NOT NULL REFERENCES alter_egos(id) ON DELETE CASCADE,
  prompt_id UUID NOT NULL REFERENCES system_prompts(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(alter_ego_id, prompt_id)
);

-- Chats table
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alter_ego_id UUID NOT NULL REFERENCES alter_egos(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

-- Chat Messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  message_order INTEGER NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_alter_egos_user_id ON alter_egos(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_alter_ego_category_mappings_alter_ego_id ON alter_ego_category_mappings(alter_ego_id);
CREATE INDEX IF NOT EXISTS idx_alter_ego_category_mappings_category_id ON alter_ego_category_mappings(category_id);
CREATE INDEX IF NOT EXISTS idx_chats_alter_ego_id ON chats(alter_ego_id);
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_message_order ON chat_messages(message_order);

-- Add RLS (Row Level Security) policies
ALTER TABLE alter_egos ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE alter_ego_category_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alter_ego_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for alter_egos
CREATE POLICY "Users can view their own alter egos" ON alter_egos
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert their own alter egos" ON alter_egos
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update their own alter egos" ON alter_egos
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY "Users can delete their own alter egos" ON alter_egos
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for categories
CREATE POLICY "Users can view their own categories" ON categories
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert their own categories" ON categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update their own categories" ON categories
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY "Users can delete their own categories" ON categories
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for alter_ego_category_mappings
CREATE POLICY "Users can view their own alter ego category mappings" ON alter_ego_category_mappings
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert their own alter ego category mappings" ON alter_ego_category_mappings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update their own alter ego category mappings" ON alter_ego_category_mappings
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY "Users can delete their own alter ego category mappings" ON alter_ego_category_mappings
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for system_prompts
CREATE POLICY "Users can view their own system prompts and default prompts" ON system_prompts
  FOR SELECT USING (auth.uid() = user_id OR is_default = TRUE);
  
CREATE POLICY "Users can insert their own system prompts" ON system_prompts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update their own system prompts" ON system_prompts
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY "Users can delete their own system prompts" ON system_prompts
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for alter_ego_prompts
CREATE POLICY "Users can view their own alter ego prompts" ON alter_ego_prompts
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert their own alter ego prompts" ON alter_ego_prompts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update their own alter ego prompts" ON alter_ego_prompts
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY "Users can delete their own alter ego prompts" ON alter_ego_prompts
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for chats
CREATE POLICY "Users can view their own chats" ON chats
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert their own chats" ON chats
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update their own chats" ON chats
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY "Users can delete their own chats" ON chats
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for chat_messages
CREATE POLICY "Users can view their own chat messages" ON chat_messages
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert their own chat messages" ON chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update their own chat messages" ON chat_messages
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY "Users can delete their own chat messages" ON chat_messages
  FOR DELETE USING (auth.uid() = user_id);
