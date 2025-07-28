-- Create table for estudios
CREATE TABLE IF NOT EXISTS estudios (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create junction table for estudio-grouper relationships
CREATE TABLE IF NOT EXISTS estudio_groupers (
  id SERIAL PRIMARY KEY,
  estudio_id INTEGER NOT NULL REFERENCES estudios(id) ON DELETE CASCADE,
  grouper_id INTEGER NOT NULL REFERENCES groupers(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(estudio_id, grouper_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_estudio_groupers_estudio_id ON estudio_groupers(estudio_id);
CREATE INDEX IF NOT EXISTS idx_estudio_groupers_grouper_id ON estudio_groupers(grouper_id);