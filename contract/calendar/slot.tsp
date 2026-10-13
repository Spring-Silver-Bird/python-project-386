// Сущность Slot (GLOSSARY: Slot).

namespace CallCalendar;

@doc("Слот на дату (GLOSSARY: Slot). Генерируется на лету 9:00–18:00 по сетке :00/:30.")
model Slot {
  startAt: utcDateTime;
  endAt: utcDateTime;
  isAvailable: boolean;
}
