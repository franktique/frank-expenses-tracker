-- Add percentage column to estudio_groupers table
-- This allows storing optional percentage values for each agrupador in an estudio

ALTER TABLE estudio_groupers 
ADD COLUMN IF NOT EXISTS percentage DECIMAL(5,2) DEFAULT NULL;

-- Add constraint to ensure percentage is between 0 and 100
ALTER TABLE estudio_groupers 
ADD CONSTRAINT IF NOT EXISTS check_percentage_range 
CHECK (percentage IS NULL OR (percentage >= 0 AND percentage <= 100));

-- Create index for faster filtering by percentage
CREATE INDEX IF NOT EXISTS idx_estudio_groupers_percentage 
ON estudio_groupers(percentage) WHERE percentage IS NOT NULL;

-- Add comment to document the purpose
COMMENT ON COLUMN estudio_groupers.percentage IS 'Optional percentage value (0-100) for calculating reference lines in charts';