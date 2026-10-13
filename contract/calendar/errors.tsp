// Ошибки и общие типы ответов.

import "@typespec/http";

using Http;

namespace CallCalendar;

@doc("Общая ошибка API: { error: string }.")
model ErrorBody {
  error: string;
}

@error
@doc("400 — ошибка валидации (сетка/слот/окно/email).")
model BadRequest {
  @statusCode statusCode: 400;
  @body body: ErrorBody;
}

@error
@doc("404 — не найдено.")
model NotFound {
  @statusCode statusCode: 404;
  @body body: ErrorBody;
}

@error
@doc("409 — слот уже занят.")
model SlotConflict {
  @statusCode statusCode: 409;
  @body body: ErrorBody;
}

// Общие типы успешных ответов с нестандартным статусом.

@doc("201 — запись создана.")
model CreatedBooking {
  @statusCode statusCode: 201;
  @body body: Booking;
}

@doc("201 — тип встречи создан.")
model CreatedEventType {
  @statusCode statusCode: 201;
  @body body: EventType;
}
