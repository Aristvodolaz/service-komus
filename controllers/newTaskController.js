const mssql = require('mssql');
const { connectToDatabase, sql } = require('../dbConfig');
const { error } = require('winston');


const updateStatusNew = async (req, res) => {
    const { id, status, startTime, ispolnitel } = req.query;
  
    try {
      const pool = await connectToDatabase();
      if (!pool) {
        throw new Error('Ошибка подключения к базе данных');
      }
  
      await pool.request()
        .input('ID', mssql.BigInt, id)
        .input('Status', mssql.Int, status)
        .input('Time_Start', mssql.NVarChar(255), startTime)
        .input('Ispolnitel', mssql.NVarChar(255), ispolnitel)
        .query('UPDATE Test_MP SET Status = @Status, Time_Start = @Time_Start , Ispolnitel = @Ispolnitel WHERE ID = @ID');
  
      res.status(200).json({ success: true, value: 'Статус успешно обновлен', errorCode: 200 });
    } catch (error) {
      console.error('Ошибка при обновлении статуса:', error);
      res.status(500).json({ success: false, value: null, errorCode: 500 });
    }
  };


  const getLDUNew = async (req, res) => {
    const { id } = req.query;
  
    if (!id) {
      return res.status(400).json({ success: false, value: 'Поле пусто!', errorCode: 400 });
    }
  
    try {
      const pool = await connectToDatabase();
      if (!pool) {
        throw new Error('Ошибка подключения к базе данных');
      }
  
      const result = await pool.request()
        .input('ID', mssql.BigInt, id)
  
        .query(`
          SELECT 
            Op_1_Bl_1_Sht,
            Op_2_Bl_2_Sht,
            Op_3_Bl_3_Sht,
            Op_4_Bl_4_Sht,
            Op_5_Bl_5_Sht,
            Op_6_Blis_6_10_Sht,
            Op_7_Pereschyot,
            Op_9_Fasovka_Sborka,
            Op_10_Markirovka_SHT,
            Op_11_Markirovka_Prom,
            Op_12_Markirovka_Prom,
            Op_13_Markirovka_Fabr,
            Op_14_TU_1_Sht,
            Op_15_TU_2_Sht,
            Op_16_TU_3_5,
            Op_17_TU_6_8,
            Op_468_Proverka_SHK,
            Op_469_Spetsifikatsiya_TM,
            Op_470_Dop_Upakovka,
            Sortiruemyi_Tovar,
            Ne_Sortiruemyi_Tovar,
            Produkty,
            Opasnyi_Tovar,
            Zakrytaya_Zona,
            Krupnogabaritnyi_Tovar,
            Yuvelirnye_Izdelia,
            Pechat_Etiketki_s_SHK,
            Pechat_Etiketki_s_Opisaniem,
            PriznakSortirovki,
            CAST(Upakovka_v_Gofro as NVARCHAR(255)) as Upakovka_v_Gofro,
            Upakovka_v_PE_Paket,
              Vlozhit_v_upakovku_pechatnyi_material,
          Izmerenie_VGH_i_peredacha_informatsii,
          Indeks_za_srochnost_koeff_1_5,
          Kompleksnaya_priemka_tovara,
          Priemka_tovara_v_transportnykh_korobakh,
          Priemka_tovara_palletnaya,
          Prochie_raboty_vklyuchaya_ustranenie_anomalii,
          Razbrakovka_tovara,
          Sborka_naborov_ot_2_shtuk_raznykh_tovarov,
          Upakovka_tovara_v_gofromeyler,
          Khranenie_tovara
          FROM Test_MP
          WHERE ID = @ID
        `);
  
      res.status(200).json({ success: true, value: result.recordset, errorCode: 200 });
    } catch (error) {
      console.error('Ошибка при получении записей по SHK:', error);
      res.status(500).json({ success: false, value: null, errorCode: 500 });
    }
  };


  const duplicateRecordNew = async (req, res) => {
    const { id, mesto, vlozhennost, palletNo, time } = req.query;
  
    try {
      const pool = await connectToDatabase();
      if (!pool) {
        return res.status(500).json({ success: false, value: null, errorCode: 500 });
      }
  
      // Находим запись по номеру задания и ШК
      const result = await pool.request()
        .input('ID', mssql.BigInt, id)
        .query('SELECT * FROM Test_MP WHERE ID = @ID');
  
      if (result.recordset.length === 0) {
        console.log("Не найдено");
        return res.status(404).json({ success: false, value: null, errorCode: 404 });
      }
  
      // Получаем оригинальную запись
      const originalRecord = result.recordset[0];
  
      // Создаем дубликат записи с новыми значениями для полей `mesto`, `vlozhennost` и `palletNo`
      await pool.request()
        .input('Pref', mssql.NVarChar(50), originalRecord.Pref)
        .input('Nazvanie_Zadaniya', mssql.NVarChar(255), originalRecord.Nazvanie_Zadaniya)
        .input('Status_Zadaniya', mssql.Int, 1)
        .input('Status', mssql.Int, 2)
        .input('Ispolnitel', mssql.NVarChar(255), originalRecord.Ispolnitel)
        .input('Artikul', mssql.Int, originalRecord.Artikul)
        .input('Artikul_Syrya', mssql.NVarChar(50), originalRecord.Artikul_Syrya)
        .input('Nazvanie_Tovara', mssql.NVarChar(255), originalRecord.Nazvanie_Tovara)
        .input('SHK', mssql.NVarChar(255), originalRecord.SHK)
        .input('SHK_SPO', mssql.NVarChar(255), originalRecord.SHK_SPO)
        .input('SHK_SPO_1', mssql.NVarChar(255), originalRecord.SHK_SPO_1)
        .input('Kol_vo_Syrya', mssql.NVarChar(255), originalRecord.Kol_vo_Syrya)
        .input('Itog_Zakaz', mssql.Int, 0)
        .input('Sht_v_MP', mssql.Int, originalRecord.Sht_v_MP)
        .input('Itog_MP', mssql.Int, originalRecord.Itog_MP)
        .input('SOH', mssql.NVarChar(10), originalRecord.SOH)
        .input('Scklad_Pref', mssql.NVarChar(50), originalRecord.Scklad_Pref)
        .input('Tip_Postavki', mssql.NVarChar(50), originalRecord.Tip_Postavki)
        .input('Srok_Godnosti', mssql.NVarChar(50), originalRecord.Srok_Godnosti)
        .input('Op_1_Bl_1_Sht', mssql.NVarChar(10), originalRecord.Op_1_Bl_1_Sht)
        .input('Op_2_Bl_2_Sht', mssql.NVarChar(10), originalRecord.Op_2_Bl_2_Sht)
        .input('Op_3_Bl_3_Sht', mssql.NVarChar(10), originalRecord.Op_3_Bl_3_Sht)
        .input('Op_4_Bl_4_Sht', mssql.NVarChar(10), originalRecord.Op_4_Bl_4_Sht)
        .input('Op_5_Bl_5_Sht', mssql.NVarChar(10), originalRecord.Op_5_Bl_5_Sht)
        .input('Op_6_Blis_6_10_Sht', mssql.NVarChar(10), originalRecord.Op_6_Blis_6_10_Sht)
        .input('Op_7_Pereschyot', mssql.NVarChar(10), originalRecord.Op_7_Pereschyot)
        .input('Op_9_Fasovka_Sborka', mssql.NVarChar(10), originalRecord.Op_9_Fasovka_Sborka)
        .input('Op_10_Markirovka_SHT', mssql.NVarChar(10), originalRecord.Op_10_Markirovka_SHT)
        .input('Op_11_Markirovka_Prom', mssql.NVarChar(10), originalRecord.Op_11_Markirovka_Prom)
        .input('Op_12_Markirovka_Prom', mssql.NVarChar(10), originalRecord.Op_12_Markirovka_Prom)
        .input('Op_13_Markirovka_Fabr', mssql.NVarChar(10), originalRecord.Op_13_Markirovka_Fabr)
        .input('Op_14_TU_1_Sht', mssql.NVarChar(10), originalRecord.Op_14_TU_1_Sht)
        .input('Op_15_TU_2_Sht', mssql.NVarChar(10), originalRecord.Op_15_TU_2_Sht)
        .input('Op_16_TU_3_5', mssql.NVarChar(10), originalRecord.Op_16_TU_3_5)
        .input('Op_17_TU_6_8', mssql.NVarChar(10), originalRecord.Op_17_TU_6_8)
        .input('Op_468_Proverka_SHK', mssql.NVarChar(10), originalRecord.Op_468_Proverka_SHK)
        .input('Op_469_Spetsifikatsiya_TM', mssql.NVarChar(10), originalRecord.Op_469_Spetsifikatsiya_TM)
        .input('Op_470_Dop_Upakovka', mssql.NVarChar(10), originalRecord.Op_470_Dop_Upakovka)
        .input('Sortiruemyi_Tovar', mssql.NVarChar(10), originalRecord.Sortiruemyi_Tovar)
        .input('Ne_Sortiruemyi_Tovar', mssql.NVarChar(10), originalRecord.Ne_Sortiruemyi_Tovar)
        .input('Produkty', mssql.NVarChar(10), originalRecord.Produkty)
        .input('Opasnyi_Tovar', mssql.NVarChar(10), originalRecord.Opasnyi_Tovar)
        .input('Zakrytaya_Zona', mssql.NVarChar(10), originalRecord.Zakrytaya_Zona)
        .input('Krupnogabaritnyi_Tovar', mssql.NVarChar(10), originalRecord.Krupnogabaritnyi_Tovar)
        .input('Yuvelirnye_Izdelia', mssql.NVarChar(10), originalRecord.Yuvelirnye_Izdelia)
        .input('Pechat_Etiketki_s_SHK', mssql.NVarChar(10), originalRecord.Pechat_Etiketki_s_SHK)
        .input('Pechat_Etiketki_s_Opisaniem', mssql.NVarChar(10), originalRecord.Pechat_Etiketki_s_Opisaniem)
        .input('PriznakSortirovki', mssql.NVarChar(10), originalRecord.PriznakSortirovki)
        .input('Upakovka_v_PE_Paket', mssql.NVarChar(10), originalRecord.Upakovka_v_PE_Paket)
        .input('Upakovka_v_Gofro', mssql.NVarChar(10), originalRecord.Upakovka_v_Gofro)
        .input('Vlozhit_v_upakovku_pechatnyi_material', mssql.NVarChar(10), Vlozhit_v_upakovku_pechatnyi_material ?? '0')
        .input('Izmerenie_VGH_i_peredacha_informatsii', mssql.NVarChar(10), Izmerenie_VGH_i_peredacha_informatsii ?? '0')
        .input('Indeks_za_srochnost_koeff_1_5', mssql.NVarChar(10), Indeks_za_srochnost_koeff_1_5 ?? '0')
        .input('Kompleksnaya_priemka_tovara', mssql.NVarChar(10), Kompleksnaya_priemka_tovara ?? '0')
        .input('Priemka_tovara_v_transportnykh_korobakh', mssql.NVarChar(10), Priemka_tovara_v_transportnykh_korobakh ?? '0')
        .input('Priemka_tovara_palletnaya', mssql.NVarChar(10), Priemka_tovara_palletnaya ?? '0')
        .input('Prochie_raboty_vklyuchaya_ustranenie_anomalii', mssql.NVarChar(10), Prochie_raboty_vklyuchaya_ustranenie_anomalii ?? '0')
        .input('Razbrakovka_tovara', mssql.NVarChar(10), Razbrakovka_tovara ?? '0')
        .input('Sborka_naborov_ot_2_shtuk_raznykh_tovarov', mssql.NVarChar(10), Sborka_naborov_ot_2_shtuk_raznykh_tovarov ?? '0')
        .input('Upakovka_tovara_v_gofromeyler', mssql.NVarChar(10), Upakovka_tovara_v_gofromeyler ?? '0')
        .input('Khranenie_tovara', mssql.NVarChar(10), Khranenie_tovara ?? '0')
        .input('Fakticheskoe_Kol_vo', mssql.Int, originalRecord.Fakticheskoe_Kol_vo)
        .input('Mesto', mssql.NVarChar(50), mesto)
        .input('Vlozhennost', mssql.NVarChar(50), vlozhennost)
        .input('Pallet_No', mssql.NVarChar(50), palletNo)
        .input('Time_Start', mssql.NVarChar(255), originalRecord.Time_Start)
        .input('Time_Middle', mssql.NVarChar(255), originalRecord.Time_Middle)
        .input('Time_End', mssql.NVarChar(255), time)
        .input('Persent', mssql.NVarChar(50), originalRecord.Persent)
        .query(`
          INSERT INTO Test_MP (
            Pref, Nazvanie_Zadaniya, Status_Zadaniya, Status, Ispolnitel, Artikul, Artikul_Syrya, 
             Nazvanie_Tovara, SHK, SHK_SPO, SHK_SPO_1, Kol_vo_Syrya, Itog_Zakaz,
            Sht_v_MP, Itog_MP, SOH, Tip_Postavki, Srok_Godnosti, Op_1_Bl_1_Sht, Op_2_Bl_2_Sht, 
            Op_3_Bl_3_Sht, Op_4_Bl_4_Sht, Op_5_Bl_5_Sht, Op_6_Blis_6_10_Sht, Op_7_Pereschyot, 
            Op_9_Fasovka_Sborka, Op_10_Markirovka_SHT, Op_11_Markirovka_Prom, Op_12_Markirovka_Prom, Scklad_Pref,
            Op_13_Markirovka_Fabr, Op_14_TU_1_Sht, Op_15_TU_2_Sht, Op_16_TU_3_5, Op_17_TU_6_8, 
            Op_468_Proverka_SHK, Op_469_Spetsifikatsiya_TM, Op_470_Dop_Upakovka, Sortiruemyi_Tovar, 
            Ne_Sortiruemyi_Tovar, Produkty, Opasnyi_Tovar, Zakrytaya_Zona, Krupnogabaritnyi_Tovar, 
            Yuvelirnye_Izdelia, Pechat_Etiketki_s_SHK, Pechat_Etiketki_s_Opisaniem, Fakticheskoe_Kol_vo, 
            Mesto, Vlozhennost, Pallet_No, Time_Start, Time_Middle, Time_End, Persent,       PriznakSortirovki,
            Upakovka_v_Gofro, Upakovka_v_PE_Paket,
              Vlozhit_v_upakovku_pechatnyi_material,
        Izmerenie_VGH_i_peredacha_informatsii,
        Indeks_za_srochnost_koeff_1_5,
        Kompleksnaya_priemka_tovara,
        Priemka_tovara_v_transportnykh_korobakh,
        Priemka_tovara_palletnaya,
        Prochie_raboty_vklyuchaya_ustranenie_anomalii,
        Razbrakovka_tovara,
        Sborka_naborov_ot_2_shtuk_raznykh_tovarov,
        Upakovka_tovara_v_gofromeyler,
        Khranenie_tovara,
          ) VALUES (
            @Pref, @Nazvanie_Zadaniya, @Status_Zadaniya, @Status, @Ispolnitel, @Artikul, @Artikul_Syrya, 
            @Nazvanie_Tovara, @SHK, @SHK_SPO, @SHK_SPO_1, @Kol_vo_Syrya, @Itog_Zakaz, 
            @Sht_v_MP, @Itog_MP, @SOH, @Tip_Postavki, @Srok_Godnosti, @Op_1_Bl_1_Sht, @Op_2_Bl_2_Sht, 
            @Op_3_Bl_3_Sht, @Op_4_Bl_4_Sht, @Op_5_Bl_5_Sht, @Op_6_Blis_6_10_Sht, @Op_7_Pereschyot, 
            @Op_9_Fasovka_Sborka, @Op_10_Markirovka_SHT, @Op_11_Markirovka_Prom, @Op_12_Markirovka_Prom,@Scklad_Pref, 
            @Op_13_Markirovka_Fabr, @Op_14_TU_1_Sht, @Op_15_TU_2_Sht, @Op_16_TU_3_5, @Op_17_TU_6_8, 
            @Op_468_Proverka_SHK, @Op_469_Spetsifikatsiya_TM, @Op_470_Dop_Upakovka, @Sortiruemyi_Tovar, 
            @Ne_Sortiruemyi_Tovar, @Produkty, @Opasnyi_Tovar, @Zakrytaya_Zona, @Krupnogabaritnyi_Tovar, 
            @Yuvelirnye_Izdelia, @Pechat_Etiketki_s_SHK, @Pechat_Etiketki_s_Opisaniem, @Fakticheskoe_Kol_vo, 
            @Mesto, @Vlozhennost, @Pallet_No, @Time_Start, @Time_Middle, @Time_End, @Persent ,       @PriznakSortirovki,
            @Upakovka_v_Gofro, @Upakovka_v_PE_Paket, @Vlozhit_v_upakovku_pechatnyi_material,
        @Izmerenie_VGH_i_peredacha_informatsii,
        @Indeks_za_srochnost_koeff_1_5,
        @Kompleksnaya_priemka_tovara,
        @Priemka_tovara_v_transportnykh_korobakh,
        @Priemka_tovara_palletnaya,
        @Prochie_raboty_vklyuchaya_ustranenie_anomalii,
        @Razbrakovka_tovara,
        @Sborka_naborov_ot_2_shtuk_raznykh_tovarov,
        @Upakovka_tovara_v_gofromeyler,
        @Khranenie_tovara
          )
        `);
  
      res.json({ success: true, value: 'Запись успешно продублирована', errorCode: 200 });
    } catch (error) {
      console.error('Ошибка при дублировании записи:', error);
      res.status(500).json({ success: false, value: null, errorCode: 500 });
    }
  };

  const updateSHKWPSNew= async (req, res) => {
    const { id, newSHK } = req.query;
  
    // Проверка на наличие необходимых параметров
    if (!taskName || !newSHK) {
      return res.status(400).json({ success: false, value: 'taskName, articul и newSHK обязательны', errorCode: 400 });
    }
  
    try {
      // Подключение к базе данных
      const pool = await connectToDatabase();
      if (!pool) {
        return res.status(500).json({ success: false, value: null, errorCode: 500 });
      }
  
      // Выполнение SQL-запроса для обновления SHK_WPS по taskName и articul
      await pool.request()
        .input('ID', mssql.BigInt, id)
        .input('NewSHK', mssql.NVarChar(255), newSHK)
        .query('UPDATE Test_MP SET SHK_WPS = @NewSHK WHERE ID = @ID');
  
      // Успешный ответ
      res.status(200).json({ success: true, value: 'ШК_WPS успешно обновлен', errorCode: 200 });
    } catch (error) {
      console.error('Ошибка при обновлении ШК_WPS:', error);
      res.status(500).json({ success: false, value: null, errorCode: 500 });
    }
  };
  
  
  const updateSHKNew = async (req, res) => {
    const { id, newSHK } = req.query;
  
    try {
      const pool = await connectToDatabase();
      if (!pool) {
        return res.status(500).json({ success: false, value: null, errorCode:500 });
      }
  
      // Обновление записи по названию задания и артиклу
      await pool.request()
      .input('ID', mssql.BigInt, id)
        .input('NewSHK', mssql.NVarChar(255), newSHK)
        .query('UPDATE Test_MP SET SHK = @NewSHK WHERE ID = @ID');
  
      res.json({ success: true, value: 'ШК успешно обновлен', errorCode: 200 });
    } catch (error) {
      console.error('Ошибка при обновлении ШК:', error);
      res.status(500).json({ success: false, value: null, errorCode: 500 });
    }
  };

  const addTaskStatusExitNew = async (req, res) => {
    const { id, comment, reason, count } = req.query;
  
    try {
      const pool = await connectToDatabase();
      if (!pool) {
        return res.status(500).json({ success: false, value: null, errorCode: 500 });
      }
  
      // Обновление существующей записи с установленными значениями
      const result = await pool.request()
      .input('ID', mssql.BigInt, id)
        .input('comment', mssql.NVarChar(mssql.MAX), comment) // Установка комментария
        .input('reason', mssql.NVarChar(mssql.MAX), reason) // Установка причины
        .input('Ubrano_iz_Zakaza', mssql.Int, count)
        .query(`
          UPDATE Test_MP 
          SET 
            comment = @comment,
            reason = @reason,
            Ubrano_iz_Zakaza = @Ubrano_iz_Zakaza
          WHERE 
           ID = @ID 
        `);
  
      if (result.rowsAffected[0] === 0) {
        return res.status(404).json({ success: false, value: 'Запись не найдена', errorCode: 404 });
      }
  
      res.json({ success: true, value: 'Запись успешно обновлена', errorCode: 200 });
    } catch (error) {
      console.error('Ошибка при обновлении записи:', error);
      res.status(500).json({ success: false, value: null, errorCode: 500 });
    }
  };

  const updateLduNEW = async (req, res) => {
    const { id } = req.query; // Получаем параметры запроса
    const {
      Op_1_Bl_1_Sht,
      Op_2_Bl_2_Sht,
      Op_3_Bl_3_Sht,
      Op_4_Bl_4_Sht,
      Op_5_Bl_5_Sht,
      Op_6_Blis_6_10_Sht,
      Op_7_Pereschyot,
      Op_9_Fasovka_Sborka,
      Op_10_Markirovka_SHT,
      Op_11_Markirovka_Prom,
      Op_12_Markirovka_Prom,
      Op_13_Markirovka_Fabr,
      Op_14_TU_1_Sht,
      Op_15_TU_2_Sht,
      Op_16_TU_3_5,
      Op_17_TU_6_8,
      Op_468_Proverka_SHK,
      Op_469_Spetsifikatsiya_TM,
      Op_470_Dop_Upakovka,
      Sortiruemyi_Tovar,
      Ne_Sortiruemyi_Tovar,
      Produkty,
      Opasnyi_Tovar,
      Zakrytaya_Zona,
      Krupnogabaritnyi_Tovar,
      Yuvelirnye_Izdelia,
      Pechat_Etiketki_s_SHK,
      Pechat_Etiketki_s_Opisaniem,
      PriznakSortirovki,
      Upakovka_v_Gofro, Upakovka_v_PE_Paket,
      Vlozhit_v_upakovku_pechatnyi_material,
      Izmerenie_VGH_i_peredacha_informatsii,
      Indeks_za_srochnost_koeff_1_5,
      Kompleksnaya_priemka_tovara,
      Priemka_tovara_v_transportnykh_korobakh,
      Priemka_tovara_palletnaya,
      Prochie_raboty_vklyuchaya_ustranenie_anomalii,
      Razbrakovka_tovara,
      Sborka_naborov_ot_2_shtuk_raznykh_tovarov,
      Upakovka_tovara_v_gofromeyler,
      Khranenie_tovara
      
    } = req.body; // Получаем данные из тела запроса
  
    console.log(Op_1_Bl_1_Sht);
    
    try {
      const pool = await connectToDatabase();
      if (!pool) {
        throw new Error('Ошибка подключения к базе данных');
      }
  
      // Запрос к базе данных
      await pool.request()
      .input('ID', mssql.BigInt, id)
        .input('Op_1_Bl_1_Sht', mssql.NVarChar(10), Op_1_Bl_1_Sht ?? '0')
        .input('Op_2_Bl_2_Sht', mssql.NVarChar(10), Op_2_Bl_2_Sht ?? '0')
        .input('Op_3_Bl_3_Sht', mssql.NVarChar(10), Op_3_Bl_3_Sht ?? '0')
        .input('Op_4_Bl_4_Sht', mssql.NVarChar(10), Op_4_Bl_4_Sht ?? '0')
        .input('Op_5_Bl_5_Sht', mssql.NVarChar(10), Op_5_Bl_5_Sht ?? '0')
        .input('Op_6_Blis_6_10_Sht', mssql.NVarChar(10), Op_6_Blis_6_10_Sht ?? '0')
        .input('Op_7_Pereschyot', mssql.NVarChar(10), Op_7_Pereschyot ?? '0')
        .input('Op_9_Fasovka_Sborka', mssql.NVarChar(10), Op_9_Fasovka_Sborka ?? '0')
        .input('Op_10_Markirovka_SHT', mssql.NVarChar(10), Op_10_Markirovka_SHT ?? '0')
        .input('Op_11_Markirovka_Prom', mssql.NVarChar(10), Op_11_Markirovka_Prom ?? '0')
        .input('Op_12_Markirovka_Prom', mssql.NVarChar(10), Op_12_Markirovka_Prom ?? '0')
        .input('Op_13_Markirovka_Fabr', mssql.NVarChar(10), Op_13_Markirovka_Fabr ?? '0')
        .input('Op_14_TU_1_Sht', mssql.NVarChar(10), Op_14_TU_1_Sht ?? '0')
        .input('Op_15_TU_2_Sht', mssql.NVarChar(10), Op_15_TU_2_Sht ?? '0')
        .input('Op_16_TU_3_5', mssql.NVarChar(10), Op_16_TU_3_5 ?? '0')
        .input('Op_17_TU_6_8', mssql.NVarChar(10), Op_17_TU_6_8 ?? '0')
        .input('Op_468_Proverka_SHK', mssql.NVarChar(10), Op_468_Proverka_SHK ?? '0')
        .input('Op_469_Spetsifikatsiya_TM', mssql.NVarChar(10), Op_469_Spetsifikatsiya_TM ?? '0')
        .input('Op_470_Dop_Upakovka', mssql.NVarChar(10), Op_470_Dop_Upakovka ?? '0')
        .input('Sortiruemyi_Tovar', mssql.NVarChar(10), Sortiruemyi_Tovar ?? '0')
        .input('Ne_Sortiruemyi_Tovar', mssql.NVarChar(10), Ne_Sortiruemyi_Tovar ?? '0')
        .input('Produkty', mssql.NVarChar(10), Produkty ?? '0')
        .input('Opasnyi_Tovar', mssql.NVarChar(10), Opasnyi_Tovar ?? '0')
        .input('Zakrytaya_Zona', mssql.NVarChar(10), Zakrytaya_Zona ?? '0')
        .input('Krupnogabaritnyi_Tovar', mssql.NVarChar(10), Krupnogabaritnyi_Tovar ?? '0')
        .input('Yuvelirnye_Izdelia', mssql.NVarChar(10), Yuvelirnye_Izdelia ?? '0')
        .input('Pechat_Etiketki_s_SHK', mssql.NVarChar(10), Pechat_Etiketki_s_SHK ?? '0')
        .input('Pechat_Etiketki_s_Opisaniem', mssql.NVarChar(10), Pechat_Etiketki_s_Opisaniem ?? '0')
        .input('PriznakSortirovki', mssql.NVarChar(10), PriznakSortirovki ?? '0')
        .input('Upakovka_v_Gofro', mssql.NVarChar(255), Upakovka_v_Gofro ?? '0')
        .input('Upakovka_v_PE_Paket', mssql.NVarChar(10), Upakovka_v_PE_Paket ?? '0')
        .input('Vlozhit_v_upakovku_pechatnyi_material', mssql.NVarChar(10), Vlozhit_v_upakovku_pechatnyi_material ?? '0')
        .input('Izmerenie_VGH_i_peredacha_informatsii', mssql.NVarChar(10), Izmerenie_VGH_i_peredacha_informatsii ?? '0')
        .input('Indeks_za_srochnost_koeff_1_5', mssql.NVarChar(10), Indeks_za_srochnost_koeff_1_5 ?? '0')
        .input('Kompleksnaya_priemka_tovara', mssql.NVarChar(10), Kompleksnaya_priemka_tovara ?? '0')
        .input('Priemka_tovara_v_transportnykh_korobakh', mssql.NVarChar(10), Priemka_tovara_v_transportnykh_korobakh ?? '0')
        .input('Priemka_tovara_palletnaya', mssql.NVarChar(10), Priemka_tovara_palletnaya ?? '0')
        .input('Prochie_raboty_vklyuchaya_ustranenie_anomalii', mssql.NVarChar(10), Prochie_raboty_vklyuchaya_ustranenie_anomalii ?? '0')
        .input('Razbrakovka_tovara', mssql.NVarChar(10), Razbrakovka_tovara ?? '0')
        .input('Sborka_naborov_ot_2_shtuk_raznykh_tovarov', mssql.NVarChar(10), Sborka_naborov_ot_2_shtuk_raznykh_tovarov ?? '0')
        .input('Upakovka_tovara_v_gofromeyler', mssql.NVarChar(10), Upakovka_tovara_v_gofromeyler ?? '0')
        .input('Khranenie_tovara', mssql.NVarChar(10), Khranenie_tovara ?? '0')
        .query(`
          UPDATE Test_MP
          SET 
            Op_1_Bl_1_Sht = @Op_1_Bl_1_Sht,
            Op_2_Bl_2_Sht = @Op_2_Bl_2_Sht,
            Op_3_Bl_3_Sht = @Op_3_Bl_3_Sht,
            Op_4_Bl_4_Sht = @Op_4_Bl_4_Sht,
            Op_5_Bl_5_Sht = @Op_5_Bl_5_Sht,
            Op_6_Blis_6_10_Sht = @Op_6_Blis_6_10_Sht,
            Op_7_Pereschyot = @Op_7_Pereschyot,
            Op_9_Fasovka_Sborka = @Op_9_Fasovka_Sborka,
            Op_10_Markirovka_SHT = @Op_10_Markirovka_SHT,
            Op_11_Markirovka_Prom = @Op_11_Markirovka_Prom,
            Op_12_Markirovka_Prom = @Op_12_Markirovka_Prom,
            Op_13_Markirovka_Fabr = @Op_13_Markirovka_Fabr,
            Op_14_TU_1_Sht = @Op_14_TU_1_Sht,
            Op_15_TU_2_Sht = @Op_15_TU_2_Sht,
            Op_16_TU_3_5 = @Op_16_TU_3_5,
            Op_17_TU_6_8 = @Op_17_TU_6_8,
            Op_468_Proverka_SHK = @Op_468_Proverka_SHK,
            Op_469_Spetsifikatsiya_TM = @Op_469_Spetsifikatsiya_TM,
            Op_470_Dop_Upakovka = @Op_470_Dop_Upakovka,
            Sortiruemyi_Tovar = @Sortiruemyi_Tovar,
            Ne_Sortiruemyi_Tovar = @Ne_Sortiruemyi_Tovar,
            Produkty = @Produkty,
            Opasnyi_Tovar = @Opasnyi_Tovar,
            Zakrytaya_Zona = @Zakrytaya_Zona,
            Krupnogabaritnyi_Tovar = @Krupnogabaritnyi_Tovar,
            Yuvelirnye_Izdelia = @Yuvelirnye_Izdelia,
            Pechat_Etiketki_s_SHK = @Pechat_Etiketki_s_SHK,
            Pechat_Etiketki_s_Opisaniem = @Pechat_Etiketki_s_Opisaniem,
              PriznakSortirovki = @PriznakSortirovki,
            Upakovka_v_Gofro = @Upakovka_v_Gofro, Upakovka_v_PE_Paket = @Upakovka_v_PE_Paket,
                    Vlozhit_v_upakovku_pechatnyi_material = @Vlozhit_v_upakovku_pechatnyi_material,
        Izmerenie_VGH_i_peredacha_informatsii = @Izmerenie_VGH_i_peredacha_informatsii,
        Indeks_za_srochnost_koeff_1_5 = @Indeks_za_srochnost_koeff_1_5,
        Kompleksnaya_priemka_tovara = @Kompleksnaya_priemka_tovara,
        Priemka_tovara_v_transportnykh_korobakh = @Priemka_tovara_v_transportnykh_korobakh,
        Priemka_tovara_palletnaya = @Priemka_tovara_palletnaya,
        Prochie_raboty_vklyuchaya_ustranenie_anomalii = @Prochie_raboty_vklyuchaya_ustranenie_anomalii,
        Razbrakovka_tovara = @Razbrakovka_tovara,
        Sborka_naborov_ot_2_shtuk_raznykh_tovarov = @Sborka_naborov_ot_2_shtuk_raznykh_tovarov,
        Upakovka_tovara_v_gofromeyler = @Upakovka_tovara_v_gofromeyler,
        Khranenie_tovara = @Khranenie_tovara
          WHERE ID = @ID
        `);
        
      res.status(200).json({ success: true, value: 'Данные успешно обновлены', errorCode: 200 });
    } catch (error) {
      console.error('Ошибка при обновлении записей:', error);
      res.status(500).json({ success: false, value: null, errorCode: 500 });
    }
  };


  const checkOrderCompletion = async (req, res) => {
    const { nazvanie_zadaniya, articul } = req.query; // получаем параметры запроса
  
    if (!nazvanie_zadaniya || !articul) {
      return res.status(400).json({ success: false, value: 'Nazvanie_Zadaniya и Artikul обязательны', errorCode: 400 });
    }
  
    try {
      // Подключение к базе данных
      const pool = await connectToDatabase();
      if (!pool) {
        return res.status(500).json({ success: false, value: 'Ошибка подключения к базе данных', errorCode: 500 });
      }
  
      // Формируем строку запроса
      const query = `
        SELECT t.Artikul, t.Nazvanie_Zadaniya, 
               SUM(p.Kolvo_Tovarov) AS total_colvo, 
               ISNULL(t.Ubrano_iz_Zakaza, 0) AS ubrano_iz_zakaza, 
               t.Itog_Zakaz
        FROM Test_MP_privyazka p
        JOIN Test_MP t ON p.Artikul = t.Artikul AND p.Nazvanie_Zadaniya = t.Nazvanie_Zadaniya
        WHERE t.Nazvanie_Zadaniya = @nazvanie_zadaniya AND t.Artikul = @articul
        GROUP BY t.Artikul, t.Nazvanie_Zadaniya, t.Ubrano_iz_Zakaza, t.Itog_Zakaz
      `;
  
      // Выполнение запроса
      const result = await pool.request()
        .input('nazvanie_zadaniya', mssql.NVarChar, nazvanie_zadaniya)
        .input('articul', mssql.NVarChar, articul) // Если артикул строковый, используем NVarChar
        .query(query);
  
      // Проверка на пустой результат
      if (result.recordset.length === 0) {
        return res.status(404).json({ success: false, value: 'Данные по запросу не найдены', errorCode: 404 });
      }
  
      // Проверка всех записей
      let allOrdersMatch = true;
      let have = 0;
      let full = 0;
  
      for (const row of result.recordset) {
        const total = row.total_colvo + row.ubrano_iz_zakaza; // Сумма количества товаров и убранного из заказа
        have = total;
        full = row.Itog_Zakaz;
  
        if (total !== row.Itog_Zakaz) {
          allOrdersMatch = false;
          break; // Если хотя бы один заказ не совпадает, выходим из цикла
        }
      }
  
      // Возвращаем результат проверки
      if (allOrdersMatch) {
        return res.status(200).json({
          success: true,
          value: 'Все заказы заполнены корректно.',
          errorCode: 200,
        });
      } else {
        return res.status(200).json({
          success: false,
          value: `Не все заказы совпадают с итогами: ${have} из ${full}`,
          errorCode: 200,
        });
      }
  
    } catch (error) {
      console.error('Ошибка:', error);
      res.status(500).json({ success: false, value: `Ошибка сервера: ${error.message}`, errorCode: 500 });
    }
  };  

  const checkOrderCompletionForBox = async (req, res) => {
    const { nazvanie_zadaniya, articul } = req.query; // получаем параметры запроса
  
    if (!nazvanie_zadaniya || !articul) {
      return res.status(400).json({ success: false, value: 'Nazvanie_Zadaniya и Artikul обязательны', errorCode: 400 });
    }
  
    try {
      // Подключение к базе данных
      const pool = await connectToDatabase();
      if (!pool) {
        return res.status(500).json({ success: false, value: 'Ошибка подключения к базе данных', errorCode: 500 });
      }
  
      // Формируем строку запроса
      const query = `
        SELECT t.Artikul, t.Nazvanie_Zadaniya, 
               ISNULL(SUM(p.Kolvo_Tovarov), 0) AS total_colvo, 
               ISNULL(t.Ubrano_iz_Zakaza, 0) AS ubrano_iz_zakaza, 
               t.Itog_Zakaz
        FROM Test_MP t
        LEFT JOIN Test_MP_privyazka p ON p.Artikul = t.Artikul AND p.Nazvanie_Zadaniya = t.Nazvanie_Zadaniya
        WHERE t.Nazvanie_Zadaniya = @nazvanie_zadaniya AND t.Artikul = @articul
        GROUP BY t.Artikul, t.Nazvanie_Zadaniya, t.Ubrano_iz_Zakaza, t.Itog_Zakaz
      `;
  
      // Выполнение запроса
      const result = await pool.request()
        .input('nazvanie_zadaniya', mssql.NVarChar, nazvanie_zadaniya)
        .input('articul', mssql.NVarChar, articul) // Если артикул строковый, используем NVarChar
        .query(query);
  
      // Если результат пуст, возвращаем значение по умолчанию
      if (result.recordset.length === 0) {
        return res.status(200).json({
          success: true,
          value: 'Нет данных в Test_MP_privyazka. Можно добавить все единицы.',
          remainingToAdd: 0,
          errorCode: 200,
        });
      }
  
      // Проверка всех записей
      let allOrdersMatch = true;
      let have = 0;
      let full = 0;
  
      for (const row of result.recordset) {
        const total = row.total_colvo + row.ubrano_iz_zakaza; // Сумма количества товаров и убранного из заказа
        have = total;
        full = row.Itog_Zakaz;
  
        if (total < row.Itog_Zakaz) {
          const remaining = row.Itog_Zakaz - total; // Сколько еще можно добавить
          return res.status(200).json({
            success: true,
            value: `Можно добавить еще ${remaining} единиц(ы).`,
            remainingToAdd: remaining,
            errorCode: 200,
          });
        } else if (total > row.Itog_Zakaz) {
          allOrdersMatch = false;
          break; // Если хотя бы один заказ превышает итог, выходим из цикла
        }
      }
  
      // Если все совпадает
      return res.status(200).json({
        success: true,
        value: 'Все заказы полностью соответствуют итогам.',
        errorCode: 200,
      });
  
    } catch (error) {
      console.error('Ошибка:', error);
      res.status(500).json({ success: false, value: `Ошибка сервера: ${error.message}`, errorCode: 500 });
    }
  };
  

  
  const checkOrderCompletionOzon = async (req, res) => {
    const { nazvanie_zadaniya, articul } = req.query;
  
    if (!nazvanie_zadaniya || !articul) {
      return res.status(400).json({ success: false, value: 'Nazvanie_Zadaniya и Artikul обязательны', errorCode: 400 });
    }
  
    try {
      // Подключение к базе данных
      const pool = await connectToDatabase();
      if (!pool) {
        return res.status(500).json({ success: false, value: 'Ошибка подключения к базе данных', errorCode: 500 });
      }
  
      // Формируем запрос
      const query = `
        SELECT Artikul, Nazvanie_Zadaniya, 
               SUM(ISNULL(Mesto, 0) * ISNULL(Vlozhennost, 0)) AS mesto_vlozhennost_sum, 
               ISNULL(SUM(Ubrano_iz_Zakaza), 0) AS ubrano_iz_zakaza, 
               MAX(Itog_Zakaz) AS Itog_Zakaz
        FROM Test_MP
        WHERE Nazvanie_Zadaniya = @nazvanie_zadaniya AND Artikul = @articul
        GROUP BY Artikul, Nazvanie_Zadaniya
      `;
  
      // Выполнение запроса
      const result = await pool.request()
        .input('nazvanie_zadaniya', mssql.NVarChar, nazvanie_zadaniya)
        .input('articul', mssql.Int, articul) // Если артикул строковый, можно использовать NVarChar
        .query(query);
  
      if (result.recordset.length === 0) {
        return res.status(404).json({ success: false, value: 'Данные не найдены', errorCode: 404 });
      }
  
      const firstRecord = result.recordset[0];
      const itogZakaz = firstRecord.Itog_Zakaz ?? 0;
      const mestoVlozhennostSum = firstRecord.mesto_vlozhennost_sum ?? 0;
      const ubranoIzZakazaSum = firstRecord.ubrano_iz_zakaza ?? 0;
  
      // Общий результат с учетом `Ubrano_iz_Zakaza`
      const totalSum = mestoVlozhennostSum + ubranoIzZakazaSum;
  
      // Сколько осталось добавить
      const remaining = itogZakaz - totalSum;
  
      if (remaining > 0) {
        return res.status(200).json({
          success: true,
          value: `Можно добавить: ${remaining}`,
          remaining,
          errorCode: 200,
        });
      } else {
        return res.status(200).json({
          success: false,
          value: `Нельзя добавить больше. Осталось: ${remaining}`,
          errorCode: 200,
        });
      }
  
    } catch (error) {
      console.error('Ошибка:', error);
      return res.status(500).json({ success: false, value: `Ошибка сервера: ${error.message}`, errorCode: 500 });
    }
  };
  


  const endStatusNew = async (req, res) => {
    const { id, endTime, ispolnitel } = req.body;  // Получаем данные из тела запроса (req.body)
  
    // Проверка на наличие обязательных параметров
    if (!id || !endTime || !ispolnitel) {
      return res.status(400).json({ success: false, value: 'Недостаточно данных для запроса', errorCode: 400 });
    }
  
    const STATUS_COMPLETED = 2; // Статус завершения
    const STATUS_TASK_UPDATED = 1; // Статус обновления задачи
  
    try {
      const pool = await connectToDatabase();
      if (!pool) {
        throw new Error('Ошибка подключения к базе данных');
      }
  
      // Выполнение запроса к базе данных
      await pool.request()
        .input('ID', mssql.BigInt, id)
        .input('Status', mssql.Int, STATUS_COMPLETED)
        .input('Status_Zadaniya', mssql.Int, STATUS_TASK_UPDATED)
        .input('Time_End', mssql.NVarChar(255), endTime)
        .input('Ispolnitel', mssql.NVarChar(255), ispolnitel)
        .query(`
          UPDATE Test_MP 
          SET Status = @Status, 
              Time_End = @Time_End, 
              Status_Zadaniya = @Status_Zadaniya, 
              Ispolnitel = @Ispolnitel
          WHERE ID = @ID
        `);
  
      return res.status(200).json({ success: true, value: 'Статус успешно обновлен', errorCode: 200 });
    } catch (error) {
      console.error('Ошибка при обновлении статуса:', error.message);
      res.status(500).json({ success: false, value: null, errorCode: 500 });
    }
  };
  const addRecordForOzon = async (req, res) => {
    const { ID, Nazvanie_Zadaniya, Artikul, Mesto, Vlozhennost, Pallet_No, Time_End } = req.body;

    if (!ID || !Nazvanie_Zadaniya || !Artikul || Mesto == null || Vlozhennost == null || Pallet_No == null) {
        return res.status(400).json({
            success: false,
            value: "ID, Nazvanie_Zadaniya, Artikul, Mesto, Vlozhennost, Pallet_No обязательны",
            errorCode: 400,
        });
    }

    try {
        const pool = await connectToDatabase();
        if (!pool) {
            return res.status(500).json({ success: false, value: null, errorCode: 500 });
        }

        // **ШАГ 1: Получаем оригинальную запись по ID**
        const idRecordQuery = `
            SELECT * FROM Test_MP WHERE ID = @ID
        `;

        const idRecord = await pool.request()
            .input("ID", mssql.BigInt, ID)
            .query(idRecordQuery);

        if (idRecord.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                value: "Запись с таким ID не найдена",
                errorCode: 404,
            });
        }

        const originalRecord = idRecord.recordset[0];

        if (originalRecord.Mesto === null && originalRecord.Vlozhennost === null && originalRecord.Pallet_No === null) {
          await pool.request()
              .input("ID", mssql.BigInt, ID)
              .input("Mesto", mssql.Int, Mesto)
              .input("Vlozhennost", mssql.Int, Vlozhennost)
              .input("Pallet_No", mssql.Int, Pallet_No)
              .query(`
                  UPDATE Test_MP
                  SET Mesto = @Mesto, Vlozhennost = @Vlozhennost, Pallet_No = @Pallet_No
                  WHERE ID = @ID
              `);

          return res.status(200).json({
              success: true,
              value: "Запись обновлена: заменены NULL-значения",
              errorCode: 200,
          });
      }

        // **ШАГ 2: Проверяем, существует ли уже такая же запись**
        const existingDuplicateQuery = `
            SELECT * FROM Test_MP
            WHERE Nazvanie_Zadaniya = @Nazvanie_Zadaniya
            AND Artikul = @Artikul
            AND Vlozhennost = @Vlozhennost
            AND Pallet_No = @Pallet_No
        `;

        const existingDuplicate = await pool.request()
            .input("Nazvanie_Zadaniya", mssql.NVarChar(255), Nazvanie_Zadaniya)
            .input("Artikul", mssql.Int, Artikul)
            .input("Vlozhennost", mssql.Int, Vlozhennost)
            .input("Pallet_No", mssql.Int, Pallet_No)
            .query(existingDuplicateQuery);



        if (existingDuplicate.recordset.length > 0) {
            // **Если запись уже существует, просто обновляем `Mesto`**
            const recordId = existingDuplicate.recordset[0].ID;
            const existingMesto = existingDuplicate.recordset[0].Mesto; // Берём Mesto из дубликата

            await pool.request()
                .input("ID", mssql.BigInt, recordId)
                .input("Mesto", mssql.Int, existingMesto + Mesto)
                .query(`
                    UPDATE Test_MP
                    SET Mesto = @Mesto
                    WHERE ID = @ID
                `);

            return res.status(200).json({
                success: true,
                value: "Запись обновлена: Mesto суммировано",
                errorCode: 200,
            });
        }

        // **ШАГ 3: Если `Vlozhennost` или `Pallet_No` отличаются → Дублируем запись**
        await pool.request()
        .input('Pref', mssql.NVarChar(50), originalRecord.Pref)
        .input('Nazvanie_Zadaniya', mssql.NVarChar(255), originalRecord.Nazvanie_Zadaniya)
        .input('Status_Zadaniya', mssql.Int, 1)
        .input('Status', mssql.Int, 2)
        .input('Ispolnitel', mssql.NVarChar(255), originalRecord.Ispolnitel)
        .input('Artikul', mssql.Int, originalRecord.Artikul)
        .input('Artikul_Syrya', mssql.NVarChar(50), originalRecord.Artikul_Syrya)
        .input('Nazvanie_Tovara', mssql.NVarChar(255), originalRecord.Nazvanie_Tovara)
        .input('SHK', mssql.NVarChar(255), originalRecord.SHK)
        .input('SHK_SPO', mssql.NVarChar(255), originalRecord.SHK_SPO)
        .input('SHK_SPO_1', mssql.NVarChar(255), originalRecord.SHK_SPO_1)
        .input('Kol_vo_Syrya', mssql.NVarChar(255), originalRecord.Kol_vo_Syrya)
        .input('Itog_Zakaz', mssql.Int, 0)
        .input('Sht_v_MP', mssql.Int, originalRecord.Sht_v_MP)
        .input('Itog_MP', mssql.Int, originalRecord.Itog_MP)
        .input('SOH', mssql.NVarChar(10), originalRecord.SOH)
        .input('Scklad_Pref', mssql.NVarChar(50), originalRecord.Scklad_Pref)
        .input('Tip_Postavki', mssql.NVarChar(50), originalRecord.Tip_Postavki)
        .input('Srok_Godnosti', mssql.NVarChar(50), originalRecord.Srok_Godnosti)
        .input('Op_1_Bl_1_Sht', mssql.NVarChar(10), originalRecord.Op_1_Bl_1_Sht)
        .input('Op_2_Bl_2_Sht', mssql.NVarChar(10), originalRecord.Op_2_Bl_2_Sht)
        .input('Op_3_Bl_3_Sht', mssql.NVarChar(10), originalRecord.Op_3_Bl_3_Sht)
        .input('Op_4_Bl_4_Sht', mssql.NVarChar(10), originalRecord.Op_4_Bl_4_Sht)
        .input('Op_5_Bl_5_Sht', mssql.NVarChar(10), originalRecord.Op_5_Bl_5_Sht)
        .input('Op_6_Blis_6_10_Sht', mssql.NVarChar(10), originalRecord.Op_6_Blis_6_10_Sht)
        .input('Op_7_Pereschyot', mssql.NVarChar(10), originalRecord.Op_7_Pereschyot)
        .input('Op_9_Fasovka_Sborka', mssql.NVarChar(10), originalRecord.Op_9_Fasovka_Sborka)
        .input('Op_10_Markirovka_SHT', mssql.NVarChar(10), originalRecord.Op_10_Markirovka_SHT)
        .input('Op_11_Markirovka_Prom', mssql.NVarChar(10), originalRecord.Op_11_Markirovka_Prom)
        .input('Op_12_Markirovka_Prom', mssql.NVarChar(10), originalRecord.Op_12_Markirovka_Prom)
        .input('Op_13_Markirovka_Fabr', mssql.NVarChar(10), originalRecord.Op_13_Markirovka_Fabr)
        .input('Op_14_TU_1_Sht', mssql.NVarChar(10), originalRecord.Op_14_TU_1_Sht)
        .input('Op_15_TU_2_Sht', mssql.NVarChar(10), originalRecord.Op_15_TU_2_Sht)
        .input('Op_16_TU_3_5', mssql.NVarChar(10), originalRecord.Op_16_TU_3_5)
        .input('Op_17_TU_6_8', mssql.NVarChar(10), originalRecord.Op_17_TU_6_8)
        .input('Op_468_Proverka_SHK', mssql.NVarChar(10), originalRecord.Op_468_Proverka_SHK)
        .input('Op_469_Spetsifikatsiya_TM', mssql.NVarChar(10), originalRecord.Op_469_Spetsifikatsiya_TM)
        .input('Op_470_Dop_Upakovka', mssql.NVarChar(10), originalRecord.Op_470_Dop_Upakovka)
        .input('Sortiruemyi_Tovar', mssql.NVarChar(10), originalRecord.Sortiruemyi_Tovar)
        .input('Ne_Sortiruemyi_Tovar', mssql.NVarChar(10), originalRecord.Ne_Sortiruemyi_Tovar)
        .input('Produkty', mssql.NVarChar(10), originalRecord.Produkty)
        .input('Opasnyi_Tovar', mssql.NVarChar(10), originalRecord.Opasnyi_Tovar)
        .input('Zakrytaya_Zona', mssql.NVarChar(10), originalRecord.Zakrytaya_Zona)
        .input('Krupnogabaritnyi_Tovar', mssql.NVarChar(10), originalRecord.Krupnogabaritnyi_Tovar)
        .input('Yuvelirnye_Izdelia', mssql.NVarChar(10), originalRecord.Yuvelirnye_Izdelia)
        .input('Pechat_Etiketki_s_SHK', mssql.NVarChar(10), originalRecord.Pechat_Etiketki_s_SHK)
        .input('Pechat_Etiketki_s_Opisaniem', mssql.NVarChar(10), originalRecord.Pechat_Etiketki_s_Opisaniem)
        .input('PriznakSortirovki', mssql.NVarChar(10), originalRecord.PriznakSortirovki )
        .input('Upakovka_v_Gofro', mssql.NVarChar(255), originalRecord.Upakovka_v_Gofro )
        .input('Upakovka_v_PE_Paket', mssql.NVarChar(10), originalRecord.Upakovka_v_PE_Paket )
        .input('Vlozhit_v_upakovku_pechatnyi_material',      mssql.NVarChar(10), originalRecord.Vlozhit_v_upakovku_pechatnyi_material)
        .input('Izmerenie_VGH_i_peredacha_informatsii',     mssql.NVarChar(10), originalRecord.Izmerenie_VGH_i_peredacha_informatsii)
        .input('Indeks_za_srochnost_koeff_1_5',              mssql.NVarChar(10), originalRecord.Indeks_za_srochnost_koeff_1_5)
        .input('Kompleksnaya_priemka_tovara',               mssql.NVarChar(10), originalRecord.Kompleksnaya_priemka_tovara)
        .input('Priemka_tovara_v_transportnykh_korobakh',   mssql.NVarChar(10), originalRecord.Priemka_tovara_v_transportnykh_korobakh)
        .input('Priemka_tovara_palletnaya',                 mssql.NVarChar(10), originalRecord.Priemka_tovara_palletnaya)
        .input('Prochie_raboty_vklyuchaya_ustranenie_anomalii', mssql.NVarChar(10), originalRecord.Prochie_raboty_vklyuchaya_ustranenie_anomalii)
        .input('Razbrakovka_tovara',                        mssql.NVarChar(10), originalRecord.Razbrakovka_tovara)
        .input('Sborka_naborov_ot_2_shtuk_raznykh_tovarov', mssql.NVarChar(10), originalRecord.Sborka_naborov_ot_2_shtuk_raznykh_tovarov)
        .input('Upakovka_tovara_v_gofromeyler',             mssql.NVarChar(10), originalRecord.Upakovka_tovara_v_gofromeyler)
        .input('Khranenie_tovara',                          mssql.NVarChar(10), originalRecord.Khranenie_tovara)
        .input('Fakticheskoe_Kol_vo', mssql.Int, originalRecord.Fakticheskoe_Kol_vo)
        .input('Mesto', mssql.Int, Mesto)
        .input('Vlozhennost', mssql.Int, Vlozhennost)
        .input('Pallet_No', mssql.NVarChar(50), Pallet_No.toString())
        .input('Time_Start', mssql.NVarChar(255), originalRecord.Time_Start)
        .input('Time_Middle', mssql.NVarChar(255), originalRecord.Time_Middle)
        .input('Time_End', mssql.NVarChar(255), Time_End)
        .input('Persent', mssql.NVarChar(50), originalRecord.Persent)
        .query(`
          INSERT INTO Test_MP (
            Pref, Nazvanie_Zadaniya, Status_Zadaniya, Status, Ispolnitel, Artikul, Artikul_Syrya, 
             Nazvanie_Tovara, SHK, SHK_SPO, SHK_SPO_1, Kol_vo_Syrya, Itog_Zakaz,
            Sht_v_MP, Itog_MP, SOH, Tip_Postavki, Srok_Godnosti, Op_1_Bl_1_Sht, Op_2_Bl_2_Sht, 
            Op_3_Bl_3_Sht, Op_4_Bl_4_Sht, Op_5_Bl_5_Sht, Op_6_Blis_6_10_Sht, Op_7_Pereschyot, 
            Op_9_Fasovka_Sborka, Op_10_Markirovka_SHT, Op_11_Markirovka_Prom, Op_12_Markirovka_Prom, Scklad_Pref,
            Op_13_Markirovka_Fabr, Op_14_TU_1_Sht, Op_15_TU_2_Sht, Op_16_TU_3_5, Op_17_TU_6_8, 
            Op_468_Proverka_SHK, Op_469_Spetsifikatsiya_TM, Op_470_Dop_Upakovka, Sortiruemyi_Tovar, 
            Ne_Sortiruemyi_Tovar, Produkty, Opasnyi_Tovar, Zakrytaya_Zona, Krupnogabaritnyi_Tovar, 
            Yuvelirnye_Izdelia, Pechat_Etiketki_s_SHK, Pechat_Etiketki_s_Opisaniem, Fakticheskoe_Kol_vo, 
            Mesto, Vlozhennost, Pallet_No, Time_Start, Time_Middle, Time_End, Persent,         PriznakSortirovki ,
            Upakovka_v_Gofro , Upakovka_v_PE_Paket,
                    Vlozhit_v_upakovku_pechatnyi_material,
        Izmerenie_VGH_i_peredacha_informatsii,
        Indeks_za_srochnost_koeff_1_5,
        Kompleksnaya_priemka_tovara,
        Priemka_tovara_v_transportnykh_korobakh,
        Priemka_tovara_palletnaya,
        Prochie_raboty_vklyuchaya_ustranenie_anomalii,
        Razbrakovka_tovara,
        Sborka_naborov_ot_2_shtuk_raznykh_tovarov,
        Upakovka_tovara_v_gofromeyler,
        Khranenie_tovara
          ) VALUES (
            @Pref, @Nazvanie_Zadaniya, @Status_Zadaniya, @Status, @Ispolnitel, @Artikul, @Artikul_Syrya, 
            @Nazvanie_Tovara, @SHK, @SHK_SPO, @SHK_SPO_1, @Kol_vo_Syrya, @Itog_Zakaz, 
            @Sht_v_MP, @Itog_MP, @SOH, @Tip_Postavki, @Srok_Godnosti, @Op_1_Bl_1_Sht, @Op_2_Bl_2_Sht, 
            @Op_3_Bl_3_Sht, @Op_4_Bl_4_Sht, @Op_5_Bl_5_Sht, @Op_6_Blis_6_10_Sht, @Op_7_Pereschyot, 
            @Op_9_Fasovka_Sborka, @Op_10_Markirovka_SHT, @Op_11_Markirovka_Prom, @Op_12_Markirovka_Prom,@Scklad_Pref, 
            @Op_13_Markirovka_Fabr, @Op_14_TU_1_Sht, @Op_15_TU_2_Sht, @Op_16_TU_3_5, @Op_17_TU_6_8, 
            @Op_468_Proverka_SHK, @Op_469_Spetsifikatsiya_TM, @Op_470_Dop_Upakovka, @Sortiruemyi_Tovar, 
            @Ne_Sortiruemyi_Tovar, @Produkty, @Opasnyi_Tovar, @Zakrytaya_Zona, @Krupnogabaritnyi_Tovar, 
            @Yuvelirnye_Izdelia, @Pechat_Etiketki_s_SHK, @Pechat_Etiketki_s_Opisaniem, @Fakticheskoe_Kol_vo, 
            @Mesto, @Vlozhennost, @Pallet_No, @Time_Start, @Time_Middle, @Time_End, @Persent, @PriznakSortirovki, @Upakovka_v_Gofro,
           @Upakovka_v_PE_Paket, @Vlozhit_v_upakovku_pechatnyi_material,
        @Izmerenie_VGH_i_peredacha_informatsii,
        @Indeks_za_srochnost_koeff_1_5,
        @Kompleksnaya_priemka_tovara,
        @Priemka_tovara_v_transportnykh_korobakh,
        @Priemka_tovara_palletnaya,
        @Prochie_raboty_vklyuchaya_ustranenie_anomalii,
        @Razbrakovka_tovara,
        @Sborka_naborov_ot_2_shtuk_raznykh_tovarov,
        @Upakovka_tovara_v_gofromeyler,
        @Khranenie_tovara
          )
        `);
  
        return res.status(200).json({
            success: true,
            value: "Запись продублирована с новыми значениями",
            errorCode: 200,
        });

    } catch (error) {
        console.error("Ошибка:", error);
        res.status(500).json({ success: false, value: null, errorCode: 500 });
    }
};

const addRecordForWB = async (req, res) => {
    const { Nazvanie_Zadaniya, Artikul, Kolvo_Tovarov, SHK_WPS, Pallet_No } = req.body;
  
    // Проверка входных данных
    if (!Nazvanie_Zadaniya || !Artikul || !Kolvo_Tovarov || !SHK_WPS || !Pallet_No) {
      return res.status(200).json({
        success: false,
        value: "Nazvanie_Zadaniya, Artikul, Kolvo_Tovarov, SHK_WPS, Pallet_No обязательны",
        errorCode: 200,
      });
    }
  
    try {
      // Подключение к базе данных
      const pool = await connectToDatabase();
      if (!pool) {
        return res.status(500).json({ success: false, value: null, errorCode: 500 });
      }
  


      // Добавляем новую запись в таблицу Test_MP_Privyazka
      const insertQuery = `
        INSERT INTO Test_MP_Privyazka (
          Nazvanie_Zadaniya, Artikul, Kolvo_Tovarov, SHK_WPS, Pallet_No
        ) VALUES (
          @Nazvanie_Zadaniya, @Artikul, @Kolvo_Tovarov, @SHK_WPS, @Pallet_No
        )
      `;
  
      await pool.request()
        .input("Nazvanie_Zadaniya", mssql.NVarChar, Nazvanie_Zadaniya)
        .input("Artikul", mssql.Int, Artikul)
        .input("Kolvo_Tovarov", mssql.Int, Kolvo_Tovarov)
        .input("SHK_WPS", mssql.NVarChar, SHK_WPS)
        .input("Pallet_No", mssql.NVarChar, Pallet_No)
        .query(insertQuery);
  
      return res.status(200).json({
        success: true,
        value: "Запись успешно добавлена в таблицу Test_MP_Privyazka",
        errorCode: 200,
      });
    } catch (error) {
      console.error("Ошибка:", error);
      res.status(500).json({ success: false, value: null, errorCode: 500 });
    }
  };

  
module.exports = {
  checkOrderCompletionOzon,
  checkOrderCompletion,
    updateLduNEW,
    updateStatusNew,
    addTaskStatusExitNew,
    updateSHKNew,
    updateSHKWPSNew, 
    duplicateRecordNew,
    getLDUNew,
    endStatusNew,
    checkOrderCompletionForBox,
    addRecordForOzon,
    addRecordForWB
}