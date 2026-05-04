-- Колонки шаблона ЛДУ (маркетплейс): новые признаки из отчёта Excel.
-- Часть полей уже есть в Test_MP (Op_9, Op_469, Sborka_naborov..., PriznakSortirovki, Upakovka_v_PE_Paket, Sortiruemyi_Tovar...).

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Test_MP') AND name = N'Primeryka_SHK')
  ALTER TABLE Test_MP ADD Primeryka_SHK NVARCHAR(10) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Test_MP') AND name = N'Proverka_Sroka_Godnosti')
  ALTER TABLE Test_MP ADD Proverka_Sroka_Godnosti NVARCHAR(10) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Test_MP') AND name = N'Upakovka_v_Babl_Plenku')
  ALTER TABLE Test_MP ADD Upakovka_v_Babl_Plenku NVARCHAR(10) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Test_MP') AND name = N'Upakovka_v_Ind_Korob')
  ALTER TABLE Test_MP ADD Upakovka_v_Ind_Korob NVARCHAR(10) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Test_MP') AND name = N'Markirovka_Tovara_Stiker_CHZ')
  ALTER TABLE Test_MP ADD Markirovka_Tovara_Stiker_CHZ NVARCHAR(10) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Test_MP') AND name = N'Udalenie_Stikera_Markirovki')
  ALTER TABLE Test_MP ADD Udalenie_Stikera_Markirovki NVARCHAR(10) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Test_MP') AND name = N'Dopolnitelnaya_Zashchita_Tovara')
  ALTER TABLE Test_MP ADD Dopolnitelnaya_Zashchita_Tovara NVARCHAR(10) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Test_MP') AND name = N'Markirovka_Transportnogo_Koroba')
  ALTER TABLE Test_MP ADD Markirovka_Transportnogo_Koroba NVARCHAR(10) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Test_MP') AND name = N'Formirovanie_Pallet_Otgruzki')
  ALTER TABLE Test_MP ADD Formirovanie_Pallet_Otgruzki NVARCHAR(10) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Test_MP') AND name = N'Upakovochnyi_Material')
  ALTER TABLE Test_MP ADD Upakovochnyi_Material NVARCHAR(10) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Test_MP') AND name = N'Markirovka_Palleta_TM')
  ALTER TABLE Test_MP ADD Markirovka_Palleta_TM NVARCHAR(10) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Test_MP') AND name = N'Raskomplekt_Zakaza')
  ALTER TABLE Test_MP ADD Raskomplekt_Zakaza NVARCHAR(10) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Test_MP') AND name = N'Tip_Operatsii_LDU')
  ALTER TABLE Test_MP ADD Tip_Operatsii_LDU NVARCHAR(255) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Test_MP') AND name = N'Zamorozhennaya_Zona')
  ALTER TABLE Test_MP ADD Zamorozhennaya_Zona NVARCHAR(10) NULL;
GO

PRINT 'Migration add_ldu_template_columns completed';
GO
