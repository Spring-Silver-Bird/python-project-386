# Сверка: contract/openapi.yaml vs реализация (wayfinder #2 / тикет #3)

Дата: 2026-10-13. Источники — только локальные первичные:
`contract/openapi.yaml`, `python_project_386/python_project_386/views.py`,
`calendar_store.py`, `urls.py`, `python_project_386/templates/index.html`,
`python_project_386/tests/test_calendar.py`, `GLOSSARY.md`, `docs/adr/0001-0003`,
`settings.py:98-101` (`TIME_ZONE = "Europe/Moscow"`, `USE_TZ = True`).
Ветка throwaway, не мержить. Happy path контракта реализован полностью;
ниже — только расхождения и недокументированное поведение.

## Совпадения (кратко, для протокола)

| Область | Контракт | Реализация | Вердикт |
|---|---|---|---|
| Пути | `/`, `/api/owners/`, `/api/event-types/`, `/api/slots/`, `/api/bookings/`, `/api/bookings/{id}/cancel/` (`openapi.yaml:12-148`) | `urls.py:8-17` — все 6 путей с trailing slash | ✅ совпадает (+ лишний `admin/` — стандартный Django, безвредно) |
| `GET /api/slots/` params | required `owner_id`, `event_type_id`, `date` YYYY-MM-DD (`openapi.yaml:51-67`) | `views.py:60-70` — все три обязательны, `date.fromisoformat`, 400 при отсутствии/мусоре | ✅ совпадает |
| `POST /api/bookings/` body | `BookingCreate` required `[event_type_id, slotStartAt, guestName, guestEmail]` (`openapi.yaml:210-223`) | `views.py:111-122` + `calendar_store.py:90-129` — все 4 поля проверяются; `owner_id` выводится из event type (`calendar_store.py:114`) | ✅ совпадает |
| Коды `201/409` брони | `201` Booking, `409` слот занят (`openapi.yaml:109-126`) | `calendar_store.py:115-116,128` → `views.py:126-128` | ✅ совпадает |
| Код `404` отмены | `POST .../cancel/` → `200` Booking / `404` Error (`openapi.yaml:127-148`) | `views.py:133-137` + `calendar_store.py:46-51` | ✅ совпадает |
| Схемы Owner/EventType/Slot/Booking/BookingCreate/Error | поля и required (`openapi.yaml:150-229`) | `calendar_store.py:11-23` (Owner/EventType), `:132-146` (Slot ровно `startAt/endAt/isAvailable`), `:118-126` (Booking ровно 7 полей), envelope `{"error": ...}` во всех ветках `views.py` | ✅ совпадает |
| Сетка `:00/:30` (ADR-0001) | слот 30 мин, `duration_minutes` enum `[30]` | `calendar_store.py:68-70` (minute ∈ {0,30}, sec/µs = 0), `:103-104` (reject duration ≠ 30), `:136-137` (end = start+30) | ✅ совпадает |
| Дубль `owner + slotStartAt` (ADR-0003) | «одна активная запись» (`openapi.yaml:8`) | `calendar_store.py:78-87` — блокирует только `status == "confirmed"`; `test_calendar.py:93-98` (отмена освобождает слот) | ✅ совпадает |
| Email | `format: email` у Owner/Booking | `calendar_store.py:110-113` — `django.core.validators.validate_email`, 400 `invalid guestEmail` | ✅ совпадает (деталь валидатора не оговорена, поведение разумное) |
| UI | `GET / → 200 HTML` (`openapi.yaml:12-17`) | `views.py:26-38` + `templates/index.html:62-119` — fetch ко всем контрактным путям с контрактными именами параметров/полей | ✅ совпадает |
| Глоссарий/ADR | `GLOSSARY.md` (Owner/EventType/Slot/Booking/Guest), ADR-0001..0003 | Термины и правила отражены в контракте и коде 1-в-1 | ✅ совпадает |

## Расхождения (факт из кода vs факт из контракта)

| # | Область | Контракт говорит | Код делает (файл:строки) | Вердикт / влияние |
|---|---|---|---|---|
| D1 | `GET /api/event-types/` ошибки | Только `200` (`openapi.yaml:39-46`), 400 не описан | `views.py:51-54` → `400 {"error": "invalid owner_id"}` при `?owner_id=abc` | ⚠️ недокументированный 400. Разумный (тип query-пара), но контракта нет. Тестами не покрыт |
| D2 | `GET /api/bookings/` ошибки | Только `200` (`openapi.yaml:91-99`), 400 не описан | `views.py:87-90` → `400 {"error": "invalid owner_id"}` при `?owner_id=abc` | ⚠️ то же, что D1 |
| D3 | `405 Method Not Allowed` | Не описан ни для одного пути | `views.py:94-101` (`GET/POST`, иначе 405) и `@require_POST` на `api_bookings_create:105`, `api_booking_cancel:132` (Django вернёт 405 на неверный метод) | ⚠️ недокументированный 405. Стандартно, влияния на happy path нет |
| D4 | Рабочие часы слотов | «generate on the fly» без часов (`openapi.yaml:49`); часов нет нигде в контракте | `calendar_store.py:7-8` `WORK_START_HOUR=9`, `WORK_END_HOUR=18` → 18 слотов; `build_slots_for_date:132-146`; `test_calendar.py:66` фиксирует `len == 18` | ⚠️ бизнес-правило только в коде+тесте. UI/тесты зависят от него, контракт молчит — добавить в контракт или ADR |
| D5 | Прошлые слоты сегодня | Окно «14 дней» (`openapi.yaml:64,77-78`); про «сегодня частично в прошлом» ничего | `build_slots_for_date` (`calendar_store.py:132-146`) не фильтрует прошлое: `GET /api/slots/` отдаёт `isAvailable: true` на утренние слоты, а `POST` их же отклонит 400 через `validate_slot_start` (`calendar_store.py:71-74`) | ⚠️ единственное расхождение с видимым эффектом: UI покажет кликабельный слот, бронь упадёт 400 `slot outside 14-day window` |
| D6 | Гранулярность окна (два механизма) | «в пределах 14 дней», «окно от текущей даты» (`openapi.yaml:7,64`) + ADR-0002 «`[now, now+14 дней]`, сравнение по старту» | Слоты: грубо по датам `delta.days 0..14` (`views.py:74-77`). Бронь: точно по datetime `now-1min .. now+14d` (`calendar_store.py:71-74`) | ⚠️ дрейф от ADR-0002: допуск `now − 1 мин` нигде не описан; границы «день vs момент» различаются между endpoints. Пограничные слоты (ровно now+14d, вчера поздно вечером) ведут себя по-разному |
| D7 | Наивный `slotStartAt` без TZ | `format: date-time` без уточнений (`openapi.yaml:217`) | `parse_moscow_dt` (`calendar_store.py:58-65`): naive → считать Москвой, `Z`/offset → конверт в Москву | ⚠️ молчаливое допущение. Удобно для UI (`index.html:79` шлёт ISO с offset), но контракт не фиксирует |
| D8 | Повторная отмена / листинг отменённых | Отмена: только `200/404`; листинг: «список записей» без фильтров (`openapi.yaml:84-99,136-148`) | `cancel_booking` (`calendar_store.py:46-51`) идемпотентен: повторный cancel → `200` с `status: "cancelled"` (не 404/409). `list_bookings` (`:35-39`) отдаёт и `cancelled`; UI фильтрует `confirmed` на клиенте (`index.html:90`) | ℹ️ unspecified, не противоречит контракту, но стоит зафиксировать (идемпотентный cancel — ок, задокументировать) |
| D9 | Порядок листинга | Не указан | `list_bookings` (`calendar_store.py:39`) сортирует по строке `slotStartAt` | ℹ️ unspecified, безвредно; зафиксировать или убрать из зависимости |
| D10 | Имя path-параметра отмены | `{id}` (`openapi.yaml:127,134`) | `urls.py:14` `<int:booking_id>`, `views.py:133` `booking_id` | ℹ️ косметика: на URL не влияет (`/api/bookings/5/cancel/` совпадает), имя разнится только в коде |
| D11 | `guestName` trim | Просто required string (`openapi.yaml:219-220`) | `calendar_store.py:108-109,123` — `strip()`, пустое/пробельное → 400 `guestName required` | ℹ️ строже контракта, разумно |
| D12 | Тексты ошибок | Только envelope `Error{error}` (`openapi.yaml:224-229`) | Строки `invalid owner_id`, `unknown event type for owner`, `slot must start at :00 or :30`, `slot outside 14-day window`, `date outside 14-day window`, `slot already booked`, `not found` и т.д. (`views.py`, `calendar_store.py:70,74,102,104,109,112,116`) | ✅ envelope везде совпадает; тексты — свободные, контракт их не фиксирует (тест `test_calendar.py:76` зависит от подстроки `already booked` — хрупко, но не нарушение) |

## Покрытие тестами (`test_calendar.py`) — чего не хватает

Покрыто: index 200, owners/event-types 200, слоты 200/400-окно, бронь 201→409, сетка `:15`→400, окно 30d→400, плохой email→400, cancel→повторная бронь 201.
Не покрыто (соответствует D1–D3/D5/D8): `event-types?owner_id=abc`→400, `bookings?owner_id=abc`→400, `cancel` несуществующего→404, слоты без параметров→400, `event_type чужого owner`→400, листинг включает `cancelled`, 405 на неверный метод, прошлые слоты сегодня.

## Рекомендация ведущей сессии (#2)

Минимальный набор правок для устранения «контракт vs реализация» (на выбор лида, не в этой ветке):
1. В контракт: добавить `400` к `GET /api/event-types/` и `GET /api/bookings/` (невалидный `owner_id`), `405`/`404` где уместно; зафиксировать часы `9:00–18:00 MSK`, допуск `now − 1 мин` (или убрать), naive-datetime-политику, идемпотентный cancel, сортировку листинга.
2. Либо в код: фильтровать прошлые слоты в `build_slots_for_date` (устраняет D5 — единственное с UX-эффектом).
3. Тесты: добить 404/400-ветки и вчерашний/пограничный слоты.
