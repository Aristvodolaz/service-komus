const jsonString = `{"pref":"OZON","Scklad_Pref":"MSC-Polaris","Status":0,"Status_Zadaniya":0,"Nazvanie_Zadaniya":"OZON НПП от 09.09 Ростов №2000029061.xlsx","Artikul":1337885,"Artikul_Syrya":391175,"Nomenklatura":"362462906","Nazvanie_Tovara":"Карандаш чернографитный Attache selection MagueNoir HB заточ.,ласт. 12шт/уп","SHK":4670072088266,"SHK_Syrya":null,"SHK_SPO":null,"Kol_vo_Syrya":180,"Itog_Zakaz":15,"SOH":"0D0","Tip_Postavki":null,"Srok_Godnosti":"срок годности","Zakrytaya_Zona":null,"Mesto":null,"Vlozhennost":null,"Pallet_No":null,"Upakovka_v_Gofro":null,"Upakovka_v_PE_Paket":null,"Ne_Sortiruemyi_Tovar":null,"Produkty":null,"Opasnyi_Tovar":null,"Krupnogabaritnyi_Tovar":null,"Yuvelirnye_Izdelia":null,"PriznakSortirovki":null,"Vlozhit_v_upakovku_pechatnyi_material":null,"Izmerenie_VGH_i_peredacha_informatsii":null,"Indeks_za_srochnost_koeff_1_5":null,"Prochie_raboty_vklyuchaya_ustranenie_anomalii":null,"Sborka_naborov_ot_2_shtuk_raznykh_tovarov":null,"Upakovka_tovara_v_gofromeyler":null,"Khranenie_tovara":null,"vp":"19330619","Plan_Otkaz":null,"Спецификация ТМ (для маркеплейсов)":"1"}`;

const obj = JSON.parse(jsonString);
const fs = require('fs');
fs.writeFileSync('formatted_result.json', JSON.stringify(obj, null, 2), 'utf8');
console.log('JSON отформатирован и сохранен в formatted_result.json');

