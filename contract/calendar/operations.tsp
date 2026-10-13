// Операции/эндпоинты API, сгруппированные в интерфейсы.

import "@typespec/http";

using Http;

namespace CallCalendar;

@route("/")
interface Site {
  @get
  @summary("UI календаря")
  @doc("HTML-страница на Django-templates; запись — форма на ней же.")
  index(): string;
}

@route("/api/owners/")
interface Owners {
  @get
  @summary("Список владельцев")
  list(): Owner[];
}

@route("/api/event-types/")
interface EventTypes {
  @get
  @summary("Список типов встреч")
  list(@query owner_id?: int32): EventType[];

  @post
  @summary("Создание типа встречи (НОВЫЙ эндпоинт, см. DELTA в calendar.tsp)")
  create(@body body: EventTypeCreate): CreatedEventType | BadRequest;

  @get
  @route("{id}/")
  @summary("Детали типа встречи (НОВЫЙ эндпоинт, см. DELTA в calendar.tsp)")
  get(@path id: int32): EventType | NotFound;
}

@route("/api/slots/")
interface Slots {
  @get
  @summary("Доступные слоты")
  @doc("date — YYYY-MM-DD (Europe/Moscow) в пределах 14 дней (ADR-0002).")
  list(
    @query owner_id: int32,
    @query event_type_id: int32,
    @query date: plainDate,
  ): Slot[] | BadRequest;
}

@route("/api/bookings/")
interface Bookings {
  @get
  @summary("Список записей")
  list(@query owner_id?: int32): Booking[];

  @post
  @summary("Создание бронирования")
  create(@body body: BookingCreate): CreatedBooking | BadRequest | SlotConflict;

  @post
  @route("{id}/cancel/")
  @summary("Отмена записи")
  cancel(@path id: int32): Booking | NotFound;
}
