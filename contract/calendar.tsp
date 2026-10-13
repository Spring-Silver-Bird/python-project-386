// Call Calendar API — TypeSpec-проекция контракта (входной файл).
//
// Источник истины: contract/openapi.yaml. Проекция обязана повторять его
// точь-в-точь (имена полей, методы, статусы). Расхождения — только
// синхронным обновлением обоих файлов (AGENTS.md §3).
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
// Скоуп v1 (спека #8): CRUD для Owner/EventType НЕ вводится, сиды фиксированы.

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
  v1: "0.1.0",
}

// ─── validators / rules ──────────────────────────────────────────
// Серверные проверки (реализация: calendar_store.py; решения: docs/adr/).
// В типах выражено то, что выражается (литерал 30, union статусов,
// plainDate/utcDateTime); остальное — рантайм-правила:
//
// 1. Слот 30 минут (ADR-0001): старт только :00/:30, секунды 0;
//    EventType.duration_minutes обязан быть 30.
// 2. Окно 14 дней (ADR-0002): слоты — дата в [today, today + 14] (Europe/Moscow);
//    бронь — старт в [now − 1 мин, now + 14 дней].
// 3. Уникальность слота (ADR-0003): один confirmed Booking на owner + slotStartAt;
//    повтор → 409; cancelled слот не блокирует.
