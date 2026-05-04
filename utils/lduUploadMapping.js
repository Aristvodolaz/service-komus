// Соответствие заголовков Excel (новый шаблон ЛДУ) полям Test_MP; дублирует уже существующие имена колонок.

const RU_HEADER_TO_DB = {
  'Примерка ШК': 'Primeryka_SHK',
  'Проверка срока годности': 'Proverka_Sroka_Godnosti',
  'Упаковка товара в п/э пакет': 'Upakovka_v_PE_Paket',
  'Упаковка в бабл пленку': 'Upakovka_v_Babl_Plenku',
  'Упаковка товара в индивидуальный короб': 'Upakovka_v_Ind_Korob',
  'Маркировка товара (стикером, ЧЗ, противокражной этикеткой)': 'Markirovka_Tovara_Stiker_CHZ',
  'Удаление стикера/маркировки с товара': 'Udalenie_Stikera_Markirovki',
  'Дополнительная защита товара': 'Dopolnitelnaya_Zashchita_Tovara',
  'Маркировка транспортного короба': 'Markirovka_Transportnogo_Koroba',
  'Спецификация ТМ': 'Spetsifikatsiya_TM',
  'Формирование наборов (комплектов) от 2-х ед. товара': 'Sborka_naborov_ot_2_shtuk_raznykh_tovarov',
  'Формирование паллет для отгрузки': 'Formirovanie_Pallet_Otgruzki',
  'Упаковочный материал': 'Upakovochnyi_Material',
  'Сортировка товара по признаку': 'PriznakSortirovki',
  'Маркировка паллета (транспортного модуля)': 'Markirovka_Palleta_TM',
  'Раскомплект заказа (полный/частичный)': 'Raskomplekt_Zakaza',
  'Тип операции': 'Tip_Operatsii_LDU',
  'Сортируемый товар': 'Sortiruemyi_Tovar',
  'Не сортируемый товар': 'Ne_Sortiruemyi_Tovar',
  'Продукты': 'Produkty',
  'Опасный товар': 'Opasnyi_Tovar',
  'Замороженная зона': 'Zamorozhennaya_Zona',
  'Крупногабаритный товар': 'Krupnogabaritnyi_Tovar',
  'Ювелирные изделия': 'Yuvelirnye_Izdelia',
};

// Прокидывает значения из русских ключей в поля БД, не перезаписывая уже заданные латиницей.
function applyLduExcelHeaders(row) {
  if (!row || typeof row !== 'object') return row;
  const out = { ...row };
  for (const [ru, db] of Object.entries(RU_HEADER_TO_DB)) {
    if (Object.prototype.hasOwnProperty.call(out, ru) && (out[db] === undefined || out[db] === null || out[db] === '')) {
      out[db] = out[ru];
    }
  }
  return out;
}

module.exports = { RU_HEADER_TO_DB, applyLduExcelHeaders };
