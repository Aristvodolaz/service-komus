-- Migration script to add Mono field to Test_MP table
-- This script adds a BIT field (boolean) to enforce mono-pallet mode
-- Mono = true means only one article per pallet is allowed (for NETR warehouse)

-- Step 1: Add new column if it doesn't exist
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'Test_MP') 
    AND name = 'Mono'
)
BEGIN
    ALTER TABLE Test_MP
    ADD Mono BIT NULL DEFAULT 0;
    PRINT 'Column Mono added successfully';
END
ELSE
BEGIN
    PRINT 'Column Mono already exists';
END
GO

-- Step 2: Update existing records based on Nazvanie_Zadaniya
-- Logic: Determine mono-pallet mode from task name
-- МОНО → true (only one article per pallet)
UPDATE Test_MP
SET Mono = CASE
    WHEN UPPER(Nazvanie_Zadaniya) LIKE N'%МОНО%' THEN 1
    ELSE 0
END
WHERE Mono IS NULL OR Mono = 0;

PRINT 'Updated existing records with Mono values';
GO

-- Step 3: Show statistics
SELECT 
    COUNT(*) AS Total,
    SUM(CASE WHEN Mono = 1 THEN 1 ELSE 0 END) AS MonoPallet,
    SUM(CASE WHEN Mono = 0 THEN 1 ELSE 0 END) AS MultiPallet,
    SUM(CASE WHEN Scklad_Pref = 'NETR' AND Mono = 1 THEN 1 ELSE 0 END) AS NETR_Mono
FROM Test_MP;

PRINT 'Migration completed';
GO
