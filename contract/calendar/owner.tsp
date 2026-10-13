// Сущность Owner (GLOSSARY: Owner).

namespace CallCalendar;

@doc("Владелец календаря (GLOSSARY: Owner).")
model Owner {
  id: int32;
  name: string;
  /** Email владельца. */
  email: string;
}
