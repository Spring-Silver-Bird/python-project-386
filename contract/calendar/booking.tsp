// Сущность Booking (GLOSSARY: Booking).

namespace CallCalendar;

@doc("Запись гостя на слот (GLOSSARY: Booking).")
model Booking {
  id: int32;
  event_type_id: int32;
  owner_id: int32;
  slotStartAt: utcDateTime;
  guestName: string;
  /** Email гостя. */
  guestEmail: string;
  status: "confirmed" | "cancelled";
}

@doc("Тело создания записи.")
model BookingCreate {
  event_type_id: int32;
  slotStartAt: utcDateTime;
  guestName: string;
  /** Email гостя. */
  guestEmail: string;
}
