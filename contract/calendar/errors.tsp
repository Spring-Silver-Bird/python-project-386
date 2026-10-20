// Ошибки и общие типы ответов.

import "@typespec/http";

using Http;

namespace CallCalendar;

@doc("Общая ошибка API: { error: string }.")
model Error {
  error: string;
}

@error
@doc("400 — ошибка валидации запроса (параметры, сетка/слот/окно, email, поля EventType).")
model BadRequest {
  @statusCode statusCode: 400;
  @body body: Error;
}

@error
@doc("404 — не найдено.")
model NotFound {
  @statusCode statusCode: 404;
  @body body: Error;
}

@error
@doc("409 — слот уже занят.")
model SlotConflict {
  @statusCode statusCode: 409;
  @body body: Error;
}

@error
@doc("405 — метод не поддерживается.")
model MethodNotAllowed {
  @statusCode statusCode: 405;
  @body body: Error;
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
