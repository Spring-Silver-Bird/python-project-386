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
  list(): Owner[] | MethodNotAllowed;
}

@route("/api/event-types/")
interface EventTypes {
  @get
  @summary("Список типов встреч")
  @doc("owner_id — int32; невалидное значение — 400. Неизвестный owner даёт пустой список.")
  list(@query owner_id?: int32): EventType[] | BadRequest | MethodNotAllowed;
}

@route("/api/slots/")
interface Slots {
  @get
  @summary("Доступные слоты")
  @doc("date — YYYY-MM-DD (Europe/Moscow), день в [today, today + 14]. Слоты 9:00–18:00 по сетке :00/:30; прошедшее время — isAvailable false. Невалидные/отсутствующие параметры, неизвестный или чужой event_type_id, неверная дата или дата вне окна — 400.")
  list(
    @query owner_id: int32,
    @query event_type_id: int32,
    @query date: plainDate,
  ): Slot[] | BadRequest | MethodNotAllowed;
}

@route("/api/bookings/")
interface Bookings {
  @get
  @summary("Список записей")
  @doc("owner_id — int32; невалидное значение — 400, неизвестный owner даёт пустой список. Возвращает confirmed и cancelled, упорядочено по старту Slot.")
  list(@query owner_id?: int32): Booking[] | BadRequest | MethodNotAllowed;

  @post
  @summary("Создание бронирования")
  @doc("Старт — по сетке :00/:30 в рабочих часах 9:00–18:00 (Europe/Moscow; последний старт 17:30). Окно — календарными днями [today, today + 14] (Europe/Moscow), прошлое отклоняется. Наивный slotStartAt трактуется как Europe/Moscow.")
  create(@body body: BookingCreate): CreatedBooking | BadRequest | SlotConflict | MethodNotAllowed;

  @post
  @route("{id}/cancel/")
  @summary("Отмена записи")
  @doc("Идемпотентно: повторная отмена уже cancelled Booking — 200 с тем же статусом. Неизвестный id — 404. Отмена прошедшего (start ≤ now) confirmed Booking — 400.")
  cancel(@path id: int32): Booking | BadRequest | NotFound | MethodNotAllowed;
}
