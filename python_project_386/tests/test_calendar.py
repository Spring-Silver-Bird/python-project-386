import json
from datetime import timedelta

import pytest
from django.utils import timezone
from python_project_386.calendar_store import MOSCOW_TZ, reset_store


@pytest.fixture(autouse=True)
def clean_store():
    reset_store()
    yield
    reset_store()


def moscow_now():
    return timezone.now().astimezone(MOSCOW_TZ)


def slot_iso(days_ahead=1, hour=10, minute=0):
    day = (moscow_now() + timedelta(days=days_ahead)).date()
    dt = moscow_now().replace(
        year=day.year,
        month=day.month,
        day=day.day,
        hour=hour,
        minute=minute,
        second=0,
        microsecond=0,
    )
    return dt.isoformat()


def book(client, **over):
    payload = {
        "event_type_id": 1,
        "slotStartAt": slot_iso(),
        "guestName": "Гость",
        "guestEmail": "guest@example.com",
    }
    payload.update(over)
    return client.post(
        "/api/bookings/",
        data=json.dumps(payload),
        content_type="application/json",
    )


def test_index_renders_calendar(client):
    r = client.get("/")
    assert r.status_code == 200
    assert "Календарь звонков" in r.content.decode()


def test_owners_and_event_types(client):
    assert client.get("/api/owners/").status_code == 200
    r = client.get("/api/event-types/?owner_id=1")
    assert r.status_code == 200
    assert r.json()[0]["duration_minutes"] == 30


def test_slots_require_14d_window(client):
    today = moscow_now().date().isoformat()
    r = client.get(f"/api/slots/?owner_id=1&event_type_id=1&date={today}")
    assert r.status_code == 200
    assert len(r.json()) == 18  # 9:00-18:00 по 30 мин
    far = (moscow_now().date() + timedelta(days=30)).isoformat()
    r = client.get(f"/api/slots/?owner_id=1&event_type_id=1&date={far}")
    assert r.status_code == 400


def test_booking_ok_then_conflict(client):
    assert book(client).status_code == 201
    r = book(client)
    assert r.status_code == 409
    assert "already booked" in r.json()["error"]


def test_booking_rejects_bad_grid(client):
    r = book(client, slotStartAt=slot_iso(minute=15))
    assert r.status_code == 400


def test_booking_rejects_outside_window(client):
    far = (moscow_now() + timedelta(days=30)).replace(hour=10, minute=0, second=0, microsecond=0).isoformat()
    assert book(client, slotStartAt=far).status_code == 400


def test_booking_rejects_bad_email(client):
    assert book(client, guestEmail="not-an-email").status_code == 400


def test_cancel_frees_slot(client):
    booking = book(client).json()
    bid = booking["id"]
    assert client.post(f"/api/bookings/{bid}/cancel/").status_code == 200
    # повторная бронь того же слота после отмены — ок
    assert book(client).status_code == 201
