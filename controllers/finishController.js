const mssql = require('mssql');
const { connectToDatabase } = require('../dbConfig');

// Контроллер для обновления данных в указанных колонках
const updateData = async (req, res) => {
  const { taskName, shk, srokGodnosti, mesto, vlozhennost, palletNo, timeEnd } = req.body;

  try {
    // Подключение к базе данных
    const pool = await connectToDatabase();
    if (!pool) {
      throw new Error('Ошибка подключения к базе данных');
    }

    // Формирование запроса на обновление данных
    const query = `
  UPDATE Test_MP
  SET
    Mesto = ISNULL(@Mesto, Mesto),
    Vlozhennost = ISNULL(@Vlozhennost, Vlozhennost),
    Pallet_No = ISNULL(@Pallet_No, Pallet_No),
    Status = 2,
    Status_Zadaniya = 1,
    Time_End = ISNULL(@Time_End, Time_End)
  WHERE ID = (
    SELECT TOP(1) ID
    FROM Test_MP
    WHERE
      Nazvanie_Zadaniya = @Nazvanie_Zadaniya
      AND SHK LIKE @SHK
    ORDER BY ID
  );
`;



    // Выполнение запроса с параметрами
    const result = await pool.request()
      .input('Nazvanie_Zadaniya', mssql.NVarChar(255), taskName)
      .input('SHK', mssql.NVarChar(50), shk)
      .input('Srok_Godnosti', mssql.NVarChar(50), srokGodnosti)
      .input('Mesto', mssql.NVarChar(50), mesto)
      .input('Vlozhennost', mssql.NVarChar(50), vlozhennost)
      .input('Pallet_No', mssql.NVarChar(50), palletNo)
      .input('Time_End', mssql.NVarChar(255), timeEnd)
      .query(query);

    // Проверка результатов выполнения запроса
    if (result.rowsAffected[0] > 0) {
      res.json({ success: true, message: 'Данные успешно обновлены.' });
    } else {
      res.status(404).json({ success: false, message: 'Запись не найдена.' });
    }
  } catch (error) {
    console.error('Ошибка при обновлении данных:', error);
    res.status(500).json({ success: false, message: 'Ошибка при обновлении данных', error: error.message });
  }
};

const updateDataNew = async (req, res) => {
  const { id, mesto, vlozhennost, palletNo, time } = req.query;

  try {
    // Подключение к базе данных
    const pool = await connectToDatabase();
    if (!pool) {
      throw new Error('Ошибка подключения к базе данных');
    }

    // Формирование запроса на обновление данных
    const query = `
    UPDATE Test_MP
    SET
      Mesto = @Mesto,
      Vlozhennost = @Vlozhennost,
      Pallet_No = @Pallet_No,
      Status = 2,
      Status_Zadaniya = 1,
      SHK_WPS = 0,
      Time_End = @Time_End
    WHERE
      ID = @ID
  `;
  

    // Выполнение запроса с параметрами
    const result = await pool.request()
      .input('Mesto', mssql.NVarChar(50), mesto)
      .input('Vlozhennost', mssql.NVarChar(50), vlozhennost)
      .input('Pallet_No', mssql.NVarChar(50), palletNo)
      .input('ID', mssql.BigInt, id)
      .input('Time_End', mssql.NVarChar(255), time)
      .query(query);

    // Проверка результатов выполнения запроса
    if (result.rowsAffected[0] > 0) {
      res.json({ success: true, message: 'Данные успешно обновлены.' });
    } else {
      res.status(404).json({ success: false, message: 'Запись не найдена.' });
    }
  } catch (error) {
    console.error('Ошибка при обновлении данных:', error);
    res.status(500).json({ success: false, message: 'Ошибка при обновлении данных', error: error.message });
  }
};

const setFinishStatus = async (req, res) => {
  const { id, time } = req.query;

  try {
    // Подключение к базе данных
    const pool = await connectToDatabase();
    if (!pool) {
      throw new Error('Ошибка подключения к базе данных');
    }

    // Формирование запроса на обновление данных
    const query = `
    UPDATE Test_MP
    SET
      Status = 2,
      Status_Zadaniya = 1,
      Time_End = @Time_End
    WHERE
      ID = @ID
  `;
  

    // Выполнение запроса с параметрами
    const result = await pool.request()
      .input('ID', mssql.BigInt, id)
      .input('Time_End', mssql.NVarChar(255), time)
      .query(query);

    // Проверка результатов выполнения запроса
    if (result.rowsAffected[0] > 0) {
      res.json({ success: true, message: 'Данные успешно обновлены.' });
    } else {
      res.status(404).json({ success: false, message: 'Запись не найдена.' });
    }
  } catch (error) {
    console.error('Ошибка при обновлении данных:', error);
    res.status(500).json({ success: false, message: 'Ошибка при обновлении данных', error: error.message });
  }
};

const updateOrAddRecord = async (req, res) => {
  const { id, mesto, vlozhennost, palletNo, time } = req.query;

  try {
    // Подключение к базе данных
    const pool = await connectToDatabase();
    if (!pool) {
      throw new Error('Ошибка подключения к базе данных');
    }

    // Проверка наличия совпадений по vlozhennost и palletNo
    const checkQuery = `
      SELECT ID, Mesto
      FROM Test_MP
      WHERE Vlozhennost = @Vlozhennost AND Pallet_No = @Pallet_No
    `;
    const checkResult = await pool.request()
      .input('Vlozhennost', mssql.NVarChar(50), vlozhennost)
      .input('Pallet_No', mssql.NVarChar(50), palletNo)
      .query(checkQuery);

    if (checkResult.recordset.length > 0) {
      // Если совпадение найдено, обновляем поле Mesto
      const existingRecord = checkResult.recordset[0];
      const newMesto = parseFloat(existingRecord.Mesto) + parseFloat(mesto);

      const updateQuery = `
        UPDATE Test_MP
        SET Mesto = @Mesto, Time_End = @Time_End
        WHERE ID = @ID
      `;
      await pool.request()
        .input('Mesto', mssql.NVarChar(50), newMesto.toString())
        .input('Time_End', mssql.NVarChar(255), time)
        .input('ID', mssql.BigInt, existingRecord.ID)
        .query(updateQuery);

      res.json({ success: true, message: 'Mesto обновлено успешно.' });
    } else {
      // Если совпадений нет, создаем дубликат записи
      const originalQuery = `
        SELECT *
        FROM Test_MP
        WHERE ID = @ID
      `;
      const originalResult = await pool.request()
        .input('ID', mssql.BigInt, id)
        .query(originalQuery);

      if (originalResult.recordset.length === 0) {
        res.status(404).json({ success: false, message: 'Оригинальная запись не найдена.' });
        return;
      }

      const originalRecord = originalResult.recordset[0];

      const o = originalRecord;
      const insertQuery = `
        INSERT INTO Test_MP (
          Pref, Nazvanie_Zadaniya, Status_Zadaniya, Status, Ispolnitel, Artikul, Artikul_Syrya,
          Nomenklatura, Nazvanie_Tovara, SHK, SHK_Syrya, SHK_SPO, SHK_SPO_1, Kol_vo_Syrya, Itog_Zakaz,
          Sht_v_MP, Itog_MP, SOH, Tip_Postavki, Srok_Godnosti, Scklad_Pref,
          Sortiruemyi_Tovar, Ne_Sortiruemyi_Tovar, Produkty, Opasnyi_Tovar, Zakrytaya_Zona, Krupnogabaritnyi_Tovar,
          Yuvelirnye_Izdelia, Pechat_Etiketki_s_SHK, Pechat_Etiketki_s_Opisaniem, vp, Plan_Otkaz,
          Upakovka_v_Gofro, Upakovka_v_PE_Paket, PriznakSortirovki,
          Vlozhit_v_upakovku_pechatnyi_material, Izmerenie_VGH_i_peredacha_informatsii, Indeks_za_srochnost_koeff_1_5,
          Kompleksnaya_priemka_tovara, Priemka_tovara_v_transportnykh_korobakh, Priemka_tovara_palletnaya,
          Prochie_raboty_vklyuchaya_ustranenie_anomalii, Razbrakovka_tovara, Sborka_naborov_ot_2_shtuk_raznykh_tovarov, Upakovka_tovara_v_gofromeyler,
          Primeryka_SHK, Proverka_Sroka_Godnosti, Upakovka_v_Babl_Plenku, Upakovka_v_Ind_Korob,
          Markirovka_Tovara_Stiker_CHZ, Udalenie_Stikera_Markirovki, Dopolnitelnaya_Zashchita_Tovara, Markirovka_Transportnogo_Koroba,
          Spetsifikatsiya_TM,
          Formirovanie_Pallet_Otgruzki, Upakovochnyi_Material, Markirovka_Palleta_TM, Raskomplekt_Zakaza, Tip_Operatsii_LDU, Zamorozhennaya_Zona,
          Khranenie_tovara, tipPostavki, Mono,
          Mesto, Vlozhennost, Pallet_No, Time_Start, Time_Middle, Time_End, Persent, SHK_WPS
        ) VALUES (
          @Pref, @Nazvanie_Zadaniya, @Status_Zadaniya, @Status, @Ispolnitel, @Artikul, @Artikul_Syrya,
          @Nomenklatura, @Nazvanie_Tovara, @SHK, @SHK_Syrya, @SHK_SPO, @SHK_SPO_1, @Kol_vo_Syrya, @Itog_Zakaz,
          @Sht_v_MP, @Itog_MP, @SOH, @Tip_Postavki, @Srok_Godnosti, @Scklad_Pref,
          @Sortiruemyi_Tovar, @Ne_Sortiruemyi_Tovar, @Produkty, @Opasnyi_Tovar, @Zakrytaya_Zona, @Krupnogabaritnyi_Tovar,
          @Yuvelirnye_Izdelia, @Pechat_Etiketki_s_SHK, @Pechat_Etiketki_s_Opisaniem, @vp, @Plan_Otkaz,
          @Upakovka_v_Gofro, @Upakovka_v_PE_Paket, @PriznakSortirovki,
          @Vlozhit_v_upakovku_pechatnyi_material, @Izmerenie_VGH_i_peredacha_informatsii, @Indeks_za_srochnost_koeff_1_5,
          @Kompleksnaya_priemka_tovara, @Priemka_tovara_v_transportnykh_korobakh, @Priemka_tovara_palletnaya,
          @Prochie_raboty_vklyuchaya_ustranenie_anomalii, @Razbrakovka_tovara, @Sborka_naborov_ot_2_shtuk_raznykh_tovarov, @Upakovka_tovara_v_gofromeyler,
          @Primeryka_SHK, @Proverka_Sroka_Godnosti, @Upakovka_v_Babl_Plenku, @Upakovka_v_Ind_Korob,
          @Markirovka_Tovara_Stiker_CHZ, @Udalenie_Stikera_Markirovki, @Dopolnitelnaya_Zashchita_Tovara, @Markirovka_Transportnogo_Koroba,
          @Spetsifikatsiya_TM,
          @Formirovanie_Pallet_Otgruzki, @Upakovochnyi_Material, @Markirovka_Palleta_TM, @Raskomplekt_Zakaza, @Tip_Operatsii_LDU, @Zamorozhennaya_Zona,
          @Khranenie_tovara, @tipPostavki, @Mono,
          @Mesto, @Vlozhennost, @Pallet_No, @Time_Start, @Time_Middle, @Time_End, @Persent, @SHK_WPS
        )
      `;
      await pool.request()
        .input('Pref', mssql.NVarChar(50), o.Pref)
        .input('Nazvanie_Zadaniya', mssql.NVarChar(255), o.Nazvanie_Zadaniya)
        .input('Status_Zadaniya', mssql.Int, o.Status_Zadaniya)
        .input('Status', mssql.Int, o.Status)
        .input('Ispolnitel', mssql.NVarChar(255), o.Ispolnitel)
        .input('Artikul', mssql.Int, o.Artikul)
        .input('Artikul_Syrya', mssql.NVarChar(50), o.Artikul_Syrya)
        .input('Nomenklatura', mssql.BigInt, o.Nomenklatura)
        .input('Nazvanie_Tovara', mssql.NVarChar(255), o.Nazvanie_Tovara)
        .input('SHK', mssql.NVarChar(255), o.SHK)
        .input('SHK_Syrya', mssql.NVarChar(255), o.SHK_Syrya)
        .input('SHK_SPO', mssql.NVarChar(255), o.SHK_SPO)
        .input('SHK_SPO_1', mssql.NVarChar(255), o.SHK_SPO_1)
        .input('Kol_vo_Syrya', mssql.NVarChar(255), o.Kol_vo_Syrya)
        .input('Itog_Zakaz', mssql.Int, o.Itog_Zakaz)
        .input('Sht_v_MP', mssql.Int, o.Sht_v_MP)
        .input('Itog_MP', mssql.Int, o.Itog_MP)
        .input('SOH', mssql.NVarChar(10), o.SOH)
        .input('Tip_Postavki', mssql.NVarChar(50), o.Tip_Postavki)
        .input('Srok_Godnosti', mssql.NVarChar(50), o.Srok_Godnosti)
        .input('Scklad_Pref', mssql.NVarChar(255), o.Scklad_Pref)
        .input('Sortiruemyi_Tovar', mssql.NVarChar(50), o.Sortiruemyi_Tovar)
        .input('Ne_Sortiruemyi_Tovar', mssql.NVarChar(50), o.Ne_Sortiruemyi_Tovar)
        .input('Produkty', mssql.NVarChar(50), o.Produkty)
        .input('Opasnyi_Tovar', mssql.NVarChar(50), o.Opasnyi_Tovar)
        .input('Zakrytaya_Zona', mssql.NVarChar(50), o.Zakrytaya_Zona)
        .input('Krupnogabaritnyi_Tovar', mssql.NVarChar(50), o.Krupnogabaritnyi_Tovar)
        .input('Yuvelirnye_Izdelia', mssql.NVarChar(50), o.Yuvelirnye_Izdelia)
        .input('Pechat_Etiketki_s_SHK', mssql.NVarChar(50), o.Pechat_Etiketki_s_SHK)
        .input('Pechat_Etiketki_s_Opisaniem', mssql.NVarChar(50), o.Pechat_Etiketki_s_Opisaniem)
        .input('vp', mssql.NVarChar(50), o.vp)
        .input('Plan_Otkaz', mssql.NVarChar(50), o.Plan_Otkaz)
        .input('Upakovka_v_Gofro', mssql.NVarChar(255), o.Upakovka_v_Gofro)
        .input('Upakovka_v_PE_Paket', mssql.NVarChar(50), o.Upakovka_v_PE_Paket)
        .input('PriznakSortirovki', mssql.NVarChar(50), o.PriznakSortirovki)
        .input('Vlozhit_v_upakovku_pechatnyi_material', mssql.NVarChar(50), o.Vlozhit_v_upakovku_pechatnyi_material)
        .input('Izmerenie_VGH_i_peredacha_informatsii', mssql.NVarChar(50), o.Izmerenie_VGH_i_peredacha_informatsii)
        .input('Indeks_za_srochnost_koeff_1_5', mssql.NVarChar(50), o.Indeks_za_srochnost_koeff_1_5)
        .input('Kompleksnaya_priemka_tovara', mssql.NVarChar(50), o.Kompleksnaya_priemka_tovara)
        .input('Priemka_tovara_v_transportnykh_korobakh', mssql.NVarChar(50), o.Priemka_tovara_v_transportnykh_korobakh)
        .input('Priemka_tovara_palletnaya', mssql.NVarChar(50), o.Priemka_tovara_palletnaya)
        .input('Prochie_raboty_vklyuchaya_ustranenie_anomalii', mssql.NVarChar(50), o.Prochie_raboty_vklyuchaya_ustranenie_anomalii)
        .input('Razbrakovka_tovara', mssql.NVarChar(50), o.Razbrakovka_tovara)
        .input('Sborka_naborov_ot_2_shtuk_raznykh_tovarov', mssql.NVarChar(50), o.Sborka_naborov_ot_2_shtuk_raznykh_tovarov)
        .input('Upakovka_tovara_v_gofromeyler', mssql.NVarChar(50), o.Upakovka_tovara_v_gofromeyler)
        .input('Primeryka_SHK', mssql.NVarChar(50), o.Primeryka_SHK)
        .input('Proverka_Sroka_Godnosti', mssql.NVarChar(50), o.Proverka_Sroka_Godnosti)
        .input('Upakovka_v_Babl_Plenku', mssql.NVarChar(50), o.Upakovka_v_Babl_Plenku)
        .input('Upakovka_v_Ind_Korob', mssql.NVarChar(50), o.Upakovka_v_Ind_Korob)
        .input('Markirovka_Tovara_Stiker_CHZ', mssql.NVarChar(50), o.Markirovka_Tovara_Stiker_CHZ)
        .input('Udalenie_Stikera_Markirovki', mssql.NVarChar(50), o.Udalenie_Stikera_Markirovki)
        .input('Dopolnitelnaya_Zashchita_Tovara', mssql.NVarChar(50), o.Dopolnitelnaya_Zashchita_Tovara)
        .input('Markirovka_Transportnogo_Koroba', mssql.NVarChar(50), o.Markirovka_Transportnogo_Koroba)
        .input('Spetsifikatsiya_TM', mssql.NVarChar(50), o.Spetsifikatsiya_TM)
        .input('Formirovanie_Pallet_Otgruzki', mssql.NVarChar(50), o.Formirovanie_Pallet_Otgruzki)
        .input('Upakovochnyi_Material', mssql.NVarChar(50), o.Upakovochnyi_Material)
        .input('Markirovka_Palleta_TM', mssql.NVarChar(50), o.Markirovka_Palleta_TM)
        .input('Raskomplekt_Zakaza', mssql.NVarChar(50), o.Raskomplekt_Zakaza)
        .input('Tip_Operatsii_LDU', mssql.NVarChar(255), o.Tip_Operatsii_LDU)
        .input('Zamorozhennaya_Zona', mssql.NVarChar(50), o.Zamorozhennaya_Zona)
        .input('Khranenie_tovara', mssql.NVarChar(50), o.Khranenie_tovara)
        .input('tipPostavki', mssql.Bit, o.tipPostavki)
        .input('Mono', mssql.Bit, o.Mono)
        .input('Mesto', mssql.NVarChar(50), mesto)
        .input('Vlozhennost', mssql.NVarChar(50), vlozhennost)
        .input('Pallet_No', mssql.NVarChar(50), palletNo)
        .input('Time_Start', mssql.NVarChar(255), o.Time_Start)
        .input('Time_Middle', mssql.NVarChar(255), o.Time_Middle)
        .input('Time_End', mssql.NVarChar(255), time)
        .input('Persent', mssql.NVarChar(50), o.Persent)
        .input('SHK_WPS', mssql.NVarChar(255), o.SHK_WPS != null ? String(o.SHK_WPS) : null)
        .query(insertQuery);

      res.json({ success: true, message: 'Дубликат записи успешно создан.' });
    }
  } catch (error) {
    console.error('Ошибка при обработке записи:', error);
    res.status(500).json({ success: false, message: 'Ошибка при обработке записи', error: error.message });
  }
};


module.exports = {
  updateData,
  updateDataNew,
  updateOrAddRecord,
  setFinishStatus
};
