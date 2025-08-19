-- Migration script for estudio grouper payment methods support
-- This script adds payment_methods column to estudio_groupers table for filtering expenses by payment method

-- Step 1: Add payment_methods column to estudio_groupers table
ALTER TABLE estudio_groupers 
ADD COLUMN IF NOT EXISTS payment_methods TEXT[] DEFAULT NULL;

-- Step 2: Add constraint validation for payment method values
-- Only allow valid payment methods: cash, credit, debit
-- NULL means all payment methods are included
-- Empty array is not allowed (use NULL instead)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'check_payment_methods' 
    AND table_name = 'estudio_groupers'
  ) THEN
    ALTER TABLE estudio_groupers 
    ADD CONSTRAINT check_payment_methods 
    CHECK (
      payment_methods IS NULL OR 
      (payment_methods <@ ARRAY['cash', 'credit', 'debit']::text[] AND array_length(payment_methods, 1) > 0)
    );
  END IF;
END $$;

-- Step 3: Create GIN index for efficient array querying
-- This enables fast filtering when checking if a payment method is contained in the array
CREATE INDEX IF NOT EXISTS idx_estudio_groupers_payment_methods 
ON estudio_groupers USING GIN(payment_methods);

-- Step 4: Add column comment for documentation
COMMENT ON COLUMN estudio_groupers.payment_methods IS 'Array of payment methods to include for this agrupador (cash, credit, debit). NULL means all methods are included.';

-- Step 5: Create helper function to validate payment method arrays
CREATE OR REPLACE FUNCTION validate_payment_methods(methods TEXT[])
RETURNS BOOLEAN AS $
DECLARE
  valid_methods TEXT[] := ARRAY['cash', 'credit', 'debit'];
  method TEXT;
BEGIN
  -- NULL is valid (means all methods)
  IF methods IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Empty array is not valid
  IF array_length(methods, 1) IS NULL OR array_length(methods, 1) = 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Check each method is valid
  FOREACH method IN ARRAY methods
  LOOP
    IF NOT (method = ANY(valid_methods)) THEN
      RETURN FALSE;
    END IF;
  END LOOP;
  
  RETURN TRUE;
END;
$ LANGUAGE plpgsql;

-- Step 6: Create function to get payment method filter for dashboard queries
CREATE OR REPLACE FUNCTION get_payment_method_filter(
  p_estudio_id INTEGER,
  p_grouper_id INTEGER
) RETURNS TEXT[] AS $
DECLARE
  configured_methods TEXT[];
BEGIN
  -- Get configured payment methods for this estudio-grouper combination
  SELECT eg.payment_methods INTO configured_methods
  FROM estudio_groupers eg
  WHERE eg.estudio_id = p_estudio_id 
  AND eg.grouper_id = p_grouper_id;
  
  -- Return configured methods, or NULL if not found (which means all methods)
  RETURN configured_methods;
END;
$ LANGUAGE plpgsql;

-- Step 7: Create function to check if expense matches payment method filter
CREATE OR REPLACE FUNCTION expense_matches_payment_filter(
  p_expense_payment_method TEXT,
  p_filter_methods TEXT[]
) RETURNS BOOLEAN AS $
BEGIN
  -- If filter is NULL, include all payment methods
  IF p_filter_methods IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check if expense payment method is in the filter array
  RETURN p_expense_payment_method = ANY(p_filter_methods);
END;
$ LANGUAGE plpgsql;

-- Step 8: Create function to check migration status and validate data
CREATE OR REPLACE FUNCTION check_payment_methods_migration_status()
RETURNS TABLE (
  total_estudio_groupers INTEGER,
  with_payment_methods INTEGER,
  without_payment_methods INTEGER,
  invalid_payment_methods INTEGER,
  migration_complete BOOLEAN
) AS $
DECLARE
  total_count INTEGER;
  with_methods_count INTEGER;
  without_methods_count INTEGER;
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM estudio_groupers;
  
  SELECT COUNT(*) INTO with_methods_count 
  FROM estudio_groupers 
  WHERE payment_methods IS NOT NULL;
  
  SELECT COUNT(*) INTO without_methods_count 
  FROM estudio_groupers 
  WHERE payment_methods IS NULL;
  
  SELECT COUNT(*) INTO invalid_count 
  FROM estudio_groupers 
  WHERE payment_methods IS NOT NULL 
  AND NOT validate_payment_methods(payment_methods);
  
  RETURN QUERY SELECT 
    total_count,
    with_methods_count,
    without_methods_count,
    invalid_count,
    (invalid_count = 0) as migration_complete;
END;
$ LANGUAGE plpgsql;

-- Step 9: Log migration results
DO $
DECLARE
  migration_status RECORD;
BEGIN
  SELECT * INTO migration_status FROM check_payment_methods_migration_status();
  
  RAISE NOTICE 'Estudio Grouper Payment Methods Migration Results:';
  RAISE NOTICE '  Total estudio-grouper relationships: %', migration_status.total_estudio_groupers;
  RAISE NOTICE '  With payment method configuration: %', migration_status.with_payment_methods;
  RAISE NOTICE '  Without payment method configuration (all methods): %', migration_status.without_payment_methods;
  RAISE NOTICE '  Invalid payment method configurations: %', migration_status.invalid_payment_methods;
  RAISE NOTICE '  Migration complete: %', migration_status.migration_complete;
  
  IF migration_status.invalid_payment_methods > 0 THEN
    RAISE WARNING 'Some estudio-grouper relationships have invalid payment method configurations.';
  ELSE
    RAISE NOTICE 'All payment method configurations are valid.';
  END IF;
END $;