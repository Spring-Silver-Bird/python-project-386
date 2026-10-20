// Сущность Booking (GLOSSARY: Booking).

namespace CallCalendar;

@doc("Запись гостя на слот (GLOSSARY: Booking).")
model Booking {
  id: int32;
  /** Отсутствует, если гость выбрал свой тип встречи. */
  event_type_id?: int32;
  /** Название типа встречи на момент брони (для своего типа — введённое гостем). */
  eventTypeTitle: string;
  /** Описание своего типа встречи, если гость его указал. */
  eventTypeDescription?: string;
  owner_id: int32;
  slotStartAt: utcDateTime;
  guestName: string;
  /** Email гостя. */
  guestEmail: string;
  status: "confirmed" | "cancelled";
}

@doc("Свой тип встречи гостя: сохраняется только в брони и не становится EventType владельца.")
model CustomEventType {
  title: string;
  description?: string;
}

@doc("Тело создания записи. Нужно передать либо event_type_id, либо customEventType (для него обязателен owner_id).")
model BookingCreate {
  event_type_id?: int32;
  /** Нужен для своего типа встречи; для EventType выводится из event_type_id. */
  owner_id?: int32;
  customEventType?: CustomEventType;
  slotStartAt: utcDateTime;
  guestName: string;
  /** Email гостя. */
  guestEmail: string;
}
