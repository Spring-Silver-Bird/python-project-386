// Операции/эндпоинты API, сгруппированные в интерфейсы.

import "@typespec/http";

using Http;

namespace CallCalendar;

@doc("HTML-оболочка фронтенда; данные загружаются через API.")
model HtmlPage {
  @header contentType: "text/html";
  @body body: string;
}

@route("/")
interface Site {
  @get
  @summary("UI календаря")
  @doc("Статическая оболочка гостевой страницы; данные загружаются только через API.")
  index(): HtmlPage | MethodNotAllowed;
}

@route("/owner/")
interface OwnerSite {
  @get
  @summary("UI страницы владельца")
  @doc("Статическая оболочка страницы владельца; типы встреч и брони загружаются через API.")
  owner(): HtmlPage | MethodNotAllowed;
}

@route("/api/owners/")
interface Owners {
  @get
  @summary("Список владельцев")
  @doc("Сценарий владельца: источник owner_id для списков типов встреч и броней.")
  list(): Owner[] | MethodNotAllowed;
}

@route("/api/event-types/")
interface EventTypes {
  @get
  @summary("Список типов встреч владельца")
  @doc("Сценарий владельца: показать типы встреч выбранного владельца. owner_id — int32; невалидное значение — 400. Неизвестный owner даёт пустой список.")
  list(@query owner_id?: int32): EventType[] | BadRequest | MethodNotAllowed;

  @post
  @summary("Создание типа встречи")
  @doc("Сценарий владельца: добавить тип встречи. owner_id должен существовать, title — непустая строка, description — строка или отсутствует, duration_minutes — только 30. Редактирование и удаление типов встреч в v1 не входят.")
  create(@body body: EventTypeCreate): CreatedEventType | BadRequest | MethodNotAllowed;
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
  @doc("owner_id — int32; невалидное значение — 400, неизвестный owner даёт пустой список. Возвращает confirmed и cancelled, упорядочено по старту Slot. Сценарий владельца: предстоящие встречи — confirmed с slotStartAt ≥ now; фильтр выполняется на клиенте.")
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
