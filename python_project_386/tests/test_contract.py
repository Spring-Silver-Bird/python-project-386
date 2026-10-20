"""Contract conformance: live API responses validate against generated types.

Generated types live in contract_gen/ (from contract/openapi.yaml, DO NOT EDIT).
If the server drifts from the spec, these tests go red.
"""

import json
from datetime import timedelta

import pytest
from contract_gen.models import (
    Booking,
    BookingCreate,
    CustomEventType,
    Error,
    EventType,
    EventTypeCreate,
    Owner,
    Slot,
)
from django.utils import timezone
from python_project_386.calendar_store import MOSCOW_TZ, reset_store


@pytest.fixture(autouse=True)
def clean_store():
    reset_store()
    yield
    reset_store()


def slot_iso(days_ahead=1, hour=10, minute=0):
    now = timezone.now().astimezone(MOSCOW_TZ)
    day = (now + timedelta(days=days_ahead)).date()
    return now.replace(
        year=day.year,
        month=day.month,
        day=day.day,
        hour=hour,
        minute=minute,
        second=0,
        microsecond=0,
    ).isoformat()


def test_owners_match_generated_type(client):
    r = client.get("/api/owners/")
    assert r.status_code == 200
    owners = [Owner.model_validate(o) for o in r.json()]
    assert len(owners) >= 1


def test_event_types_match_generated_type(client):
    r = client.get("/api/event-types/?owner_id=1")
    assert r.status_code == 200
    [EventType.model_validate(e) for e in r.json()]


def test_create_event_type_matches_generated_types(client):
    payload = EventTypeCreate(
        owner_id=1,
        title="Знакомство",
        description="Первая встреча",
        duration_minutes=30,
    )
    r = client.post(
        "/api/event-types/",
        data=payload.model_dump_json(exclude_none=True),
        content_type="application/json",
    )
    assert r.status_code == 201
    created = EventType.model_validate(r.json())
    assert created.title == "Знакомство"
    assert created.duration_minutes.value == 30


def test_slots_match_generated_type(client):
    today = timezone.now().astimezone(MOSCOW_TZ).date().isoformat()
    r = client.get(f"/api/slots/?owner_id=1&event_type_id=1&date={today}")
    assert r.status_code == 200
    slots = [Slot.model_validate(s) for s in r.json()]
    assert len(slots) == 18


def test_booking_lifecycle_matches_generated_types(client):
    payload = {
        "event_type_id": 1,
        "slotStartAt": slot_iso(),
        "guestName": "Гость",
        "guestEmail": "guest@example.com",
    }
    r = client.post("/api/bookings/", data=json.dumps(payload), content_type="application/json")
    assert r.status_code == 201
    booking = Booking.model_validate(r.json())
    assert booking.status.value == "confirmed"

    r = client.post("/api/bookings/", data=json.dumps(payload), content_type="application/json")
    assert r.status_code == 409
    Error.model_validate(r.json())

    r = client.post(f"/api/bookings/{booking.id}/cancel/")
    assert r.status_code == 200
    assert Booking.model_validate(r.json()).status.value == "cancelled"


def test_custom_booking_matches_generated_types(client):
    payload = BookingCreate(
        owner_id=1,
        customEventType=CustomEventType(title="Свой звонок", description="Обсудить проект"),
        slotStartAt=slot_iso(),
        guestName="Гость",
        guestEmail="guest@example.com",
    )
    r = client.post(
        "/api/bookings/",
        data=payload.model_dump_json(exclude_none=True),
        content_type="application/json",
    )
    assert r.status_code == 201
    booking = Booking.model_validate(r.json())
    assert booking.event_type_id is None
    assert booking.eventTypeTitle == "Свой звонок"


def test_validation_errors_match_generated_error_type(client):
    responses = [
        client.get("/api/event-types/?owner_id=abc"),
        client.get("/api/bookings/?owner_id=abc"),
        client.get("/api/slots/"),
        client.get("/api/slots/?owner_id=1&event_type_id=1&date=not-a-date"),
    ]
    for r in responses:
        assert r.status_code == 400
        Error.model_validate(r.json())


def test_missing_booking_error_matches_generated_error_type(client):
    r = client.post("/api/bookings/999/cancel/")
    assert r.status_code == 404
    Error.model_validate(r.json())


def test_method_not_allowed_matches_generated_error_type(client):
    for r in (client.put("/api/owners/"), client.get("/api/bookings/1/cancel/")):
        assert r.status_code == 405
        Error.model_validate(r.json())


def test_conflict_error_matches_generated_error_type(client):
    payload = {
        "event_type_id": 1,
        "slotStartAt": slot_iso(),
        "guestName": "Гость",
        "guestEmail": "guest@example.com",
    }
    assert client.post("/api/bookings/", data=json.dumps(payload), content_type="application/json").status_code == 201
    r = client.post("/api/bookings/", data=json.dumps(payload), content_type="application/json")
    assert r.status_code == 409
    Error.model_validate(r.json())
