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
}

@route("/api/slots/")
interface Slots {
  @get
  @summary("Доступные слоты")
  @doc("date — YYYY-MM-DD (Europe/Moscow), день в [today, today + 14]. Слоты 9:00–18:00 по сетке :00/:30; прошедшее время — isAvailable false.")
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
  @doc("Окно — календарными днями [today, today + 14] (Europe/Moscow), прошлое отклоняется. Наивный slotStartAt трактуется как Europe/Moscow.")
  create(@body body: BookingCreate): CreatedBooking | BadRequest | SlotConflict;

  @post
  @route("{id}/cancel/")
  @summary("Отмена записи")
  cancel(@path id: int32): Booking | NotFound;
}
