-- Migration script to add tipPostavki field to Test_MP table
-- This script adds a BIT field (boolean) to store delivery type
-- true = коробочная (box delivery)
-- false = паллетная (pallet delivery)

-- Step 1: Add new column if it doesn't exist
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'Test_MP') 
    AND name = 'tipPostavki'
)
BEGIN
    ALTER TABLE Test_MP
    ADD tipPostavki BIT NULL;
    PRINT 'Column tipPostavki added successfully';
END
ELSE
BEGIN
    PRINT 'Column tipPostavki already exists';
END
GO

-- Step 2: Update existing records based on Nazvanie_Zadaniya
-- Logic: Determine delivery type from task name
-- короб*/коробочн* → true (box delivery)
-- паллет*/паллетн* → false (pallet delivery)
UPDATE Test_MP
SET tipPostavki = CASE
    WHEN LOWER(Nazvanie_Zadaniya) LIKE N'%короб%' OR LOWER(Nazvanie_Zadaniya) LIKE N'%коробочн%' THEN 1
    WHEN LOWER(Nazvanie_Zadaniya) LIKE N'%паллет%' OR LOWER(Nazvanie_Zadaniya) LIKE N'%паллетн%' THEN 0
    ELSE NULL
END
WHERE tipPostavki IS NULL;

PRINT 'Updated existing records with tipPostavki values';
GO

-- Step 3: Show statistics
SELECT 
    COUNT(*) AS Total,
    SUM(CASE WHEN tipPostavki = 1 THEN 1 ELSE 0 END) AS Korobochnaya,
    SUM(CASE WHEN tipPostavki = 0 THEN 1 ELSE 0 END) AS Palletnaya,
    SUM(CASE WHEN tipPostavki IS NULL THEN 1 ELSE 0 END) AS Unknown
FROM Test_MP;

PRINT 'Migration completed';
GO
