-- Create table for groupers
CREATE TABLE IF NOT EXISTS groupers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create junction table for grouper-category relationships
CREATE TABLE IF NOT EXISTS grouper_categories (
  id SERIAL PRIMARY KEY,
  grouper_id INTEGER NOT NULL REFERENCES groupers(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(grouper_id, category_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_grouper_categories_grouper_id ON grouper_categories(grouper_id);
CREATE INDEX IF NOT EXISTS idx_grouper_categories_category_id ON grouper_categories(category_id);
