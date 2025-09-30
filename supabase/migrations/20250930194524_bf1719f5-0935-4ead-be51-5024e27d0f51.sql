-- Add chakra categorization and organization fields to ai_chats table
ALTER TABLE ai_chats 
ADD COLUMN chakra_category TEXT CHECK (chakra_category IN ('crown', 'third_eye', 'throat', 'heart', 'solar_plexus', 'sacral', 'root', 'uncategorized')),
ADD COLUMN priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
ADD COLUMN status TEXT CHECK (status IN ('active', 'review', 'reference', 'completed')) DEFAULT 'active',
ADD COLUMN tags TEXT[] DEFAULT '{}',
ADD COLUMN starred BOOLEAN DEFAULT false;

-- Create index for faster filtering
CREATE INDEX idx_ai_chats_chakra_category ON ai_chats(chakra_category);
CREATE INDEX idx_ai_chats_priority ON ai_chats(priority);
CREATE INDEX idx_ai_chats_starred ON ai_chats(starred);

-- Update RLS policy to allow updates
DROP POLICY IF EXISTS "Users can update AI chats in their projects" ON ai_chats;
CREATE POLICY "Users can update AI chats in their projects"
ON ai_chats
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM projects 
  WHERE projects.id = ai_chats.project_id 
  AND projects.user_id = auth.uid()
));