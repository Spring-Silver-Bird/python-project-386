"""Contract conformance: live API responses validate against generated types.

Generated types live in contract_gen/ (from contract/openapi.yaml, DO NOT EDIT).
If the server drifts from the spec, these tests go red.
"""

import json
from datetime import timedelta

import pytest
from contract_gen.models import Booking, Error, EventType, Owner, Slot
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
