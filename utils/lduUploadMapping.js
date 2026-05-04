// Соответствие заголовков Excel (новый шаблон ЛДУ) полям Test_MP; дублирует уже существующие имена колонок.
// Варианты под разные выгрузки (WB «Южный кластер», инструкции): несколько русских строк могут вести в одну колонку.

const RU_HEADER_TO_DB = {
  'Примерка ШК': 'Primeryka_SHK',
  // WB в шапке часто «Проверка ШК» — кладём в ту же колонку, что и Примерка (ТСД/ЛДУ).
  'Проверка ШК': 'Primeryka_SHK',
  'Проверка срока годности': 'Proverka_Sroka_Godnosti',
  'Упаковка товара в п/э пакет': 'Upakovka_v_PE_Paket',
  'Упаковка в бабл пленку': 'Upakovka_v_Babl_Plenku',
  'Упаковка в бабл - пленку': 'Upakovka_v_Babl_Plenku',
  'Упаковка товара в индивидуальный короб': 'Upakovka_v_Ind_Korob',
  'Маркировка товара (стикером, ЧЗ, противокражной этикеткой)': 'Markirovka_Tovara_Stiker_CHZ',
  'Удаление стикера/маркировки с товара': 'Udalenie_Stikera_Markirovki',
  'Дополнительная защита товара': 'Dopolnitelnaya_Zashchita_Tovara',
  'Маркировка транспортного короба': 'Markirovka_Transportnogo_Koroba',
  'Спецификация ТМ': 'Spetsifikatsiya_TM',
  'Спецификация транспортного паллета (для маркеплейсов)': 'Spetsifikatsiya_TM',
  'Формирование наборов (комплектов) от 2-х ед. товара': 'Sborka_naborov_ot_2_shtuk_raznykh_tovarov',
  'Формирование паллет для отгрузки': 'Formirovanie_Pallet_Otgruzki',
  'Формирование транспортного паллета для отгрузки': 'Formirovanie_Pallet_Otgruzki',
  'Фасовка/сборка товара в короб': 'Upakovka_v_Gofro',
  'Вложить печатный материал': 'Vlozhit_v_upakovku_pechatnyi_material',
  'Упаковочный материал': 'Upakovochnyi_Material',
  'Сортировка товара по признаку': 'PriznakSortirovki',
  'Маркировка паллета (транспортного модуля)': 'Markirovka_Palleta_TM',
  'Раскомплект заказа (полный/частичный)': 'Raskomplekt_Zakaza',
  'Тип операции': 'Tip_Operatsii_LDU',
  'Сортируемый товар': 'Sortiruemyi_Tovar',
  'Не сортируемый товар': 'Ne_Sortiruemyi_Tovar',
  'Продукты': 'Produkty',
  'Опасный товар': 'Opasnyi_Tovar',
  'Закрытая зона': 'Zakrytaya_Zona',
  'Замороженная зона': 'Zamorozhennaya_Zona',
  'Крупногабаритный товар': 'Krupnogabaritnyi_Tovar',
  'Ювелирные изделия': 'Yuvelirnye_Izdelia',
  'ВП': 'vp',
};

// Обрезаем пробелы в именах столбцов Excel («Вложенность  », лишние в конце строки).
function trimRowKeys(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    const key = typeof k === 'string' ? k.trim() : k;
    out[key] = v;
  }
  return out;
}

// Прокидывает значения из русских ключей в поля БД, не перезаписывая уже заданные латиницей.
function applyLduExcelHeaders(row) {
  if (!row || typeof row !== 'object') return row;
  const out = trimRowKeys({ ...row });
  for (const [ru, db] of Object.entries(RU_HEADER_TO_DB)) {
    if (Object.prototype.hasOwnProperty.call(out, ru) && (out[db] === undefined || out[db] === null || out[db] === '')) {
      out[db] = out[ru];
    }
  }
  return out;
}

module.exports = { RU_HEADER_TO_DB, applyLduExcelHeaders };
