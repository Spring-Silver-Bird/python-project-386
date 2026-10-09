"""In-memory store + validation for call calendar (no DB needed)."""

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

MOSCOW_TZ = ZoneInfo("Europe/Moscow")
WORK_START_HOUR = 9
WORK_END_HOUR = 18
WINDOW_DAYS = 14

OWNERS = [
    {"id": 1, "name": "Алекс", "email": "alex@example.com"},
]

EVENT_TYPES = [
    {
        "id": 1,
        "owner_id": 1,
        "title": "Звонок 30 минут",
        "description": "Стандартный созвон",
        "duration_minutes": 30,
    },
]

_bookings: dict[int, dict] = {}
_next_id = 1


def reset_store() -> None:
    global _bookings, _next_id
    _bookings = {}
    _next_id = 1


def list_bookings(owner_id: int | None = None) -> list[dict]:
    items = list(_bookings.values())
    if owner_id is not None:
        items = [b for b in items if b["owner_id"] == owner_id]
    return sorted(items, key=lambda b: b["slotStartAt"])


def get_booking(booking_id: int) -> dict | None:
    return _bookings.get(booking_id)


def cancel_booking(booking_id: int) -> dict | None:
    booking = _bookings.get(booking_id)
    if booking is None:
        return None
    booking["status"] = "cancelled"
    return booking


def get_event_type(event_type_id: int) -> dict | None:
    return next((e for e in EVENT_TYPES if e["id"] == event_type_id), None)


def parse_moscow_dt(value: str) -> datetime | None:
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=MOSCOW_TZ)
    return dt.astimezone(MOSCOW_TZ)


def validate_slot_start(dt: datetime, now: datetime) -> str | None:
    if dt.minute not in (0, 30) or dt.second != 0 or dt.microsecond != 0:
        return "slot must start at :00 or :30"
    earliest = now - timedelta(minutes=1)
    latest = now + timedelta(days=WINDOW_DAYS)
    if dt < earliest or dt > latest:
        return "slot outside 14-day window"
    return None


def is_slot_taken(owner_id: int, slot_start: datetime) -> bool:
    for b in _bookings.values():
        if b["status"] != "confirmed":
            continue
        if b["owner_id"] != owner_id:
            continue
        existing = parse_moscow_dt(b["slotStartAt"])
        if existing == slot_start:
            return True
    return False


def create_booking(
    event_type_id: int,
    slot_start: datetime,
    guest_name: str,
    guest_email: str,
    now: datetime,
) -> tuple[dict | None, str | None, int]:
    from django.core.exceptions import ValidationError
    from django.core.validators import validate_email

    event = get_event_type(event_type_id)
    if event is None:
        return None, "unknown event_type_id", 400
    if event["duration_minutes"] != 30:
        return None, "only 30-minute event types supported", 400
    err = validate_slot_start(slot_start, now)
    if err:
        return None, err, 400
    if not guest_name.strip():
        return None, "guestName required", 400
    try:
        validate_email(guest_email)
    except ValidationError:
        return None, "invalid guestEmail", 400
    owner_id = event["owner_id"]
    if is_slot_taken(owner_id, slot_start):
        return None, "slot already booked", 409
    global _next_id
    booking = {
        "id": _next_id,
        "event_type_id": event_type_id,
        "owner_id": owner_id,
        "slotStartAt": slot_start.isoformat(),
        "guestName": guest_name.strip(),
        "guestEmail": guest_email.strip(),
        "status": "confirmed",
    }
    _bookings[_next_id] = booking
    _next_id += 1
    return booking, None, 201


def build_slots_for_date(owner_id: int, event_type_id: int, day: datetime) -> list[dict]:
    slots = []
    for hour in range(WORK_START_HOUR, WORK_END_HOUR):
        for minute in (0, 30):
            start = day.replace(hour=hour, minute=minute, second=0, microsecond=0)
            end = start + timedelta(minutes=30)
            taken = is_slot_taken(owner_id, start)
            slots.append(
                {
                    "startAt": start.isoformat(),
                    "endAt": end.isoformat(),
                    "isAvailable": not taken,
                }
            )
    return slots
