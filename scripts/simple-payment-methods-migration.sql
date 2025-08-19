-- Simple migration to add payment_methods column
-- Compatible with older PostgreSQL versions

-- Add payment_methods column
ALTER TABLE estudio_groupers 
ADD COLUMN payment_methods TEXT[] DEFAULT NULL;

-- Create index for efficient querying
CREATE INDEX idx_estudio_groupers_payment_methods 
ON estudio_groupers USING GIN(payment_methods);

-- Add column comment
COMMENT ON COLUMN estudio_groupers.payment_methods IS 'Array of payment methods to include for this agrupador (cash, credit, debit). NULL means all methods are included.';