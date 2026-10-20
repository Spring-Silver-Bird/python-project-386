// Call Calendar API — контракт на TypeSpec (входной файл).
//
// Источник истины: TypeSpec (этот файл и contract/calendar/*.tsp).
// contract/openapi.yaml генерируется из него командой `make contract`;
// сгенерированные файлы руками не правятся (AGENTS.md §5).
//
// Раскладка:
//   contract/calendar.tsp             — вход: info, версия, правила, подключение частей
//   contract/calendar/owner.tsp       — сущность Owner
//   contract/calendar/event-type.tsp  — сущность EventType
//   contract/calendar/slot.tsp        — сущность Slot
//   contract/calendar/booking.tsp     — сущность Booking (+ тело создания)
//   contract/calendar/errors.tsp      — ошибки и общие типы ответов
//   contract/calendar/operations.tsp  — операции/эндпоинты
//
// Скоуп v1 (спека #8, ADR-0007): CRUD для Owner не вводится.
// EventType: список + создание для сценария владельца; edit/delete не входят.

import "./calendar/owner.tsp";
import "./calendar/event-type.tsp";
import "./calendar/slot.tsp";
import "./calendar/booking.tsp";
import "./calendar/errors.tsp";
import "./calendar/operations.tsp";
import "@typespec/http";
import "@typespec/versioning";

using Http;
using Versioning;

// ─── scenarios ───────────────────────────────────────────────────
// Гость: GET /api/owners/, GET /api/event-types/?owner_id, GET /api/slots/,
// POST /api/bookings/, POST /api/bookings/{id}/cancel/.
//
// Владелец: GET /api/owners/, GET /api/event-types/?owner_id (свои типы),
// POST /api/event-types/ (создать тип), GET /api/bookings/?owner_id.
// Для предстоящих встреч клиент берёт confirmed с slotStartAt ≥ now.
// Данные брони: guestName/guestEmail, slotStartAt, event_type_id → EventType.title.
// Отдельного HTML-эндпоинта владельца нет: UI использует те же API.

// ─── info / metadata ─────────────────────────────────────────────

@service(
  #{
    title: "Call Calendar API",
  }
)
@server("http://127.0.0.1:8000", "local")
@versioned(Versions)
namespace CallCalendar;

@doc("Версии API.")
enum Versions {
  v1: "1.0.0",
}

// ─── validators / rules ──────────────────────────────────────────
// Серверные проверки (реализация: calendar_store.py; решения: docs/adr/).
// В типах выражено то, что выражается (литерал 30, union статусов,
// plainDate/utcDateTime); остальное — рантайм-правила:
//
// 1. Слот 30 минут (ADR-0001): старт только :00/:30, секунды 0;
//    рабочие часы 9:00–18:00 (ADR-0004), последний старт 17:30;
//    EventType.duration_minutes обязан быть 30.
// 2. Окно 14 дней (ADR-0002): календарными днями [today, today + 14]
//    (Europe/Moscow) одинаково для просмотра и брони; прошлое отклоняется;
//    наивный date-time трактуется как Europe/Moscow.
// 3. Уникальность слота (ADR-0003): один confirmed Booking на owner + slotStartAt;
//    повтор → 409; cancelled слот не блокирует.
