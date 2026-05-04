-- Удаление устаревших колонок тарифов Op_* из Test_MP (после перехода на шаблон ЛДУ).
-- Выполнять после выката кода без обращений к этим полям.

DECLARE @cols TABLE (name SYSNAME);
INSERT @cols (name) VALUES
  (N'Op_1_Bl_1_Sht'), (N'Op_2_Bl_2_Sht'), (N'Op_3_Bl_3_Sht'), (N'Op_4_Bl_4_Sht'), (N'Op_5_Bl_5_Sht'),
  (N'Op_6_Blis_6_10_Sht'), (N'Op_7_Pereschyot'), (N'Op_9_Fasovka_Sborka'), (N'Op_10_Markirovka_SHT'),
  (N'Op_11_Markirovka_Prom'), (N'Op_12_Markirovka_Prom'), (N'Op_13_Markirovka_Fabr'), (N'Op_14_TU_1_Sht'),
  (N'Op_15_TU_2_Sht'), (N'Op_16_TU_3_5'), (N'Op_17_TU_6_8'), (N'Op_468_Proverka_SHK'),
  (N'Op_469_Spetsifikatsiya_TM'), (N'Op_470_Dop_Upakovka');

DECLARE @sql NVARCHAR(MAX) = N'';
SELECT @sql = @sql + N'ALTER TABLE Test_MP DROP COLUMN ' + QUOTENAME(name) + N';' + CHAR(10)
FROM @cols c
WHERE EXISTS (
  SELECT 1 FROM sys.columns col
  WHERE col.object_id = OBJECT_ID(N'Test_MP') AND col.name = c.name
);

IF LEN(@sql) > 0
  EXEC sp_executesql @sql;

PRINT 'drop_legacy_op_columns: done';
GO
