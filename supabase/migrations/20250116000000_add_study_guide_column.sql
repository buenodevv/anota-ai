/*
  # Add study_guide column to documents table

  1. Changes
    - Add `study_guide` column to documents table
    - Update summary_type enum to include 'study_guide'
*/

-- Update summary_type enum to include study_guide
ALTER TYPE summary_type ADD VALUE 'study_guide';

-- Add study_guide column to documents table
ALTER TABLE documents ADD COLUMN study_guide text;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS documents_study_guide_idx ON documents(study_guide) WHERE study_guide IS NOT NULL;