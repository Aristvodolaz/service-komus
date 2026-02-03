# Database Migrations

## add_tipPostavki.sql

Добавляет поле `tipPostavki` (тип поставки) в таблицу `Test_MP`.

### Описание
- **Тип поля**: `BIT` (булево значение)
- **Значения**:
  - `1` (true) - коробочная поставка
  - `0` (false) - паллетная поставка
  - `NULL` - тип не определен

### Логика определения
Значение `tipPostavki` определяется автоматически из `Nazvanie_Zadaniya`:
- Если название содержит "коробочн" → `true`
- Если название содержит "паллет" → `false`
- Иначе → `null`

### Выполнение миграции

#### Вариант 1: Через SQL Server Management Studio (SSMS)
1. Откройте SSMS
2. Подключитесь к серверу: `PRM-SRV-MSSQL-01.komus.net:59587`
3. Выберите базу данных: `SPOe_rc`
4. Откройте файл `add_tipPostavki.sql`
5. Выполните скрипт (F5)

#### Вариант 2: Через командную строку (sqlcmd)
```bash
sqlcmd -S PRM-SRV-MSSQL-01.komus.net,59587 -d SPOe_rc -U sa -P icY2eGuyfU -i add_tipPostavki.sql
```

### После миграции
После успешного выполнения миграции:
1. Поле `tipPostavki` будет добавлено в таблицу `Test_MP`
2. Все существующие записи получат значение на основе `Nazvanie_Zadaniya`
3. API `/market/tasks/names` начнет возвращать поле `tipPostavki`

### Откат миграции (rollback)
Если нужно откатить изменения:
```sql
ALTER TABLE Test_MP DROP COLUMN tipPostavki;
```

**ВНИМАНИЕ**: При откате будут потеряны все данные в поле `tipPostavki`.
