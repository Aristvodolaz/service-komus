const { connectToDatabase } = require('../dbConfig');
const mssql = require('mssql');

// … ваши остальные функции …

/**
 * GET /records-by-task?nazvanie_zadaniya=...
 * Вернёт все записи из Test_MP с нужными полями по названию задания.
 */
async function getTaskRecords(req, res) {
  try {
    const { nazvanie_zadaniya } = req.query;
    if (!nazvanie_zadaniya) {
      return res
        .status(400)
        .json({ success: false, message: 'nazvanie_zadaniya обязателен' });
    }

    const pool = await connectToDatabase();
    const query = `
      SELECT
        Nazvanie_Zadaniya   AS NazvanieZadaniya,
        Artikul,
        SHK,
        Status,
        Status_Zadaniya,
        Ispolnitel,
        Time_Start,
        Time_End,
        vp                   AS VP,
        Scklad_Pref,
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
        CAST(Upakovka_v_Gofro AS NVARCHAR(255)) AS Upakovka_v_Gofro,
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
        Khranenie_tovara,
        Primeryka_SHK,
        Proverka_Sroka_Godnosti,
        Upakovka_v_Babl_Plenku,
        Upakovka_v_Ind_Korob,
        Markirovka_Tovara_Stiker_CHZ,
        Udalenie_Stikera_Markirovki,
        Dopolnitelnaya_Zashchita_Tovara,
        Markirovka_Transportnogo_Koroba,
        Formirovanie_Pallet_Otgruzki,
        Upakovochnyi_Material,
        Markirovka_Palleta_TM,
        Raskomplekt_Zakaza,
        Tip_Operatsii_LDU,
        Zamorozhennaya_Zona,
        tipPostavki,
        Mono
      FROM [SPOe_rc].[dbo].[Test_MP]
      WHERE Nazvanie_Zadaniya = @nazvanie_zadaniya
    `;

    const result = await pool
      .request()
      .input('nazvanie_zadaniya', mssql.NVarChar(255), nazvanie_zadaniya)
      .query(query);

    return res
      .status(200)
      .json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('Ошибка в getTaskRecords:', err);
    return res
      .status(500)
      .json({ success: false, message: err.message });
  }
}

module.exports = {
  // … ваши остальные экспорты …
  getTaskRecords,
};
