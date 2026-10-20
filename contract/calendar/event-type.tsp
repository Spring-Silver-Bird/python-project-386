// Сущность EventType (GLOSSARY: EventType).

namespace CallCalendar;

@doc("Тип встречи владельца (GLOSSARY: EventType). duration_minutes обязан быть 30 (ADR-0001).")
model EventType {
  id: int32;
  owner_id: int32;
  title: string;
  description?: string;
  /** Только 30, другие длительности не поддерживаются. */
  duration_minutes: 30;
}

@doc("Тело создания типа встречи (сценарий владельца).")
model EventTypeCreate {
  owner_id: int32;
  title: string;
  description?: string;
  /** Только 30, другие длительности не поддерживаются. */
  duration_minutes: 30;
}
