# Changelog: Добавление поля tipPostavki

## Дата: 2026-02-03

## Описание изменений

Добавлено новое поле `tipPostavki` для определения типа поставки (коробочная/паллетная) на основе названия задания.

---

## 1. База данных

### Добавлено поле `tipPostavki`
- **Тип**: `BIT` (булево)
- **Значения**:
  - `1` (true) - коробочная поставка
  - `0` (false) - паллетная поставка
  - `NULL` - тип не определен

### Миграция
- Файл: `migrations/add_tipPostavki.sql`
- Автоматически проставляет значения для существующих записей на основе `Nazvanie_Zadaniya`

---

## 2. Изменения в коде

### Новые файлы

#### `utils/tipPostavkiHelper.js`
Helper-модуль для определения типа поставки:
- `determineTipPostavki(nazvanie)` - определяет тип из названия
- `tipPostavkiToString(tipPostavki)` - конвертирует в читаемую строку

**Логика определения:**
- Название содержит "короб" или "коробочн" → `true` (коробочная)
- Название содержит "паллет" или "паллетн" → `false` (паллетная)
- Иначе → `null` (не определено)

### Измененные файлы

#### `controllers/tasksController.js`
- Добавлен импорт `determineTipPostavki`
- Обновлена функция `getUniqueTaskNames()`:
  - Теперь возвращает поле `tipPostavki` в формате camelCase
  - Автоматически вычисляет значение из названия, если не задано в БД

#### `controllers/fileController.js`
- Добавлен импорт `determineTipPostavki`
- Обновлен endpoint `/api/upload-data-new`:
  - Автоматически определяет `tipPostavki` из `Nazvanie_Zadaniya`
  - Сохраняет значение в БД при загрузке данных

---

## 3. API изменения

### GET `/market/tasks/names`
**Было:**
```json
{
  "success": true,
  "value": [
    {
      "Nazvanie_Zadaniya": "OZON НЕТР от 02.09.xlsx",
      "Scklad_Pref": "MSC-Polaris"
    }
  ],
  "errorCode": 200
}
```

**Стало:**
```json
{
  "success": true,
  "value": [
    {
      "Nazvanie_Zadaniya": "OZON НЕТР от 02.09.xlsx",
      "Scklad_Pref": "MSC-Polaris",
      "tipPostavki": null
    }
  ],
  "errorCode": 200
}
```

### POST `/api/upload-data-new`
- Теперь автоматически определяет и сохраняет `tipPostavki` при загрузке данных

---

## 4. Инструкция по применению

### Шаг 1: Выполнить миграцию БД
```bash
# Через SSMS или sqlcmd
sqlcmd -S PRM-SRV-MSSQL-01.komus.net,59587 -d SPOe_rc -U sa -P icY2eGuyfU -i migrations/add_tipPostavki.sql
```

### Шаг 2: Перезапустить сервис
```bash
# Остановить сервис
# Применить изменения кода
# Запустить сервис
npm start
```

---

## 5. Тестирование

### Проверить API
```bash
# Получить задания с новым полем
curl "http://localhost:3005/market/tasks/names"

# Пример ответа должен содержать tipPostavki
```

### Проверить логику определения
```javascript
const { determineTipPostavki } = require('./utils/tipPostavkiHelper');

console.log(determineTipPostavki('WB Заказ коробочная 15.09.xlsx')); // true
console.log(determineTipPostavki('OZON паллетная поставка.xlsx')); // false
console.log(determineTipPostavki('Заказ №12345.xlsx')); // null
```

---

## 6. Откат изменений

Если нужно откатить:
```sql
ALTER TABLE Test_MP DROP COLUMN tipPostavki;
```

**ВНИМАНИЕ**: При откате будут потеряны все данные в поле `tipPostavki`.

---

## Файлы изменены
1. ✅ `utils/tipPostavkiHelper.js` - новый файл
2. ✅ `migrations/add_tipPostavki.sql` - новый файл
3. ✅ `migrations/README.md` - новый файл
4. ✅ `controllers/tasksController.js` - обновлен
5. ✅ `controllers/fileController.js` - обновлен

## Проверка кода
- ✅ Линтер: без ошибок
- ✅ Импорты: проверены
- ✅ SQL синтаксис: проверен
