import json
from datetime import datetime, timedelta

import pytest
from django.contrib.staticfiles import finders
from django.utils import timezone
from python_project_386.calendar_store import MOSCOW_TZ, reset_store, validate_slot_start


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


def test_index_renders_frontend_shell_without_seed_data(client):
    r = client.get("/")
    assert r.status_code == 200
    content = r.content.decode()
    assert "Календарь звонков" in content
    assert "calendar-sdk" in content  # фронтенд пользуется сгенерированным SDK
    assert "app.js" in content
    # UI даёт выбрать владельца/тип/дату/слот, забронировать и увидеть свои записи.
    for element_id in ("owner", "etype", "date", "slots", "book", "guestName", "guestEmail", "my"):
        assert f'id="{element_id}"' in content
    # Данные приходят только из API, сервер их в HTML не встраивает.
    assert "Алекс" not in content
    assert "alex@example.com" not in content
    assert "Звонок 30 минут" not in content


def test_frontend_assets_are_discoverable():
    assert finders.find("app.js") is not None
    assert finders.find("app.css") is not None


def test_sdk_bundle_exposes_calendar_operations():
    path = finders.find("js/calendar-sdk.js")
    assert path is not None
    with open(path, encoding="utf-8") as bundle_file:
        bundle = bundle_file.read()
    for operation in ("ownersList", "eventTypesList", "slotsList", "bookingsCreate", "bookingsCancel"):
        assert operation in bundle


def test_frontend_app_wires_sdk_operations():
    path = finders.find("app.js")
    assert path is not None
    with open(path, encoding="utf-8") as app_file:
        script = app_file.read()
    for operation in ("ownersList", "eventTypesList", "slotsList", "bookingsCreate", "bookingsCancel"):
        assert operation in script


def test_frontend_reports_booking_success_after_reloading_slots():
    path = finders.find("app.js")
    assert path is not None
    with open(path, encoding="utf-8") as app_file:
        script = app_file.read()
    submit = script.split("form.onsubmit", 1)[1]
    assert "Запись №" in submit
    assert submit.index("Готово!") > submit.index("await loadSlots()")


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
    assert set(r.json()) == {"error"}


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


def test_slots_mark_past_today_as_taken(client):
    now = moscow_now()
    today = now.date().isoformat()
    r = client.get(f"/api/slots/?owner_id=1&event_type_id=1&date={today}")
    assert r.status_code == 200
    assert len(r.json()) == 18
    for s in r.json():
        start = datetime.fromisoformat(s["startAt"])
        if start <= now:
            assert s["isAvailable"] is False


def test_booking_window_is_calendar_days():
    now = moscow_now()
    edge = (now + timedelta(days=14)).replace(hour=10, minute=0, second=0, microsecond=0)
    assert validate_slot_start(edge, now) is None
    far = (now + timedelta(days=15)).replace(hour=10, minute=0, second=0, microsecond=0)
    assert validate_slot_start(far, now) is not None
    base = now - timedelta(hours=2)
    past = base.replace(minute=0 if base.minute < 30 else 30, second=0, microsecond=0)
    assert validate_slot_start(past, now) is not None


def test_booking_window_http(client):
    assert book(client, slotStartAt=slot_iso(days_ahead=14, hour=10)).status_code == 201
    assert book(client, slotStartAt=slot_iso(days_ahead=15, hour=11)).status_code == 400
    assert book(client, slotStartAt=slot_iso(days_ahead=-1)).status_code == 400


def test_booking_accepts_naive_moscow_datetime(client):
    naive = slot_iso(days_ahead=2).split("+")[0]
    assert "Z" not in naive
    assert book(client, slotStartAt=naive).status_code == 201


def test_cancel_unknown_returns_404(client):
    r = client.post("/api/bookings/999/cancel/")
    assert r.status_code == 404
    assert set(r.json()) == {"error"}


@pytest.mark.parametrize("booking_id", ["-1", "not-an-int"])
def test_cancel_malformed_id_returns_error_envelope(client, booking_id):
    r = client.post(f"/api/bookings/{booking_id}/cancel/")
    assert r.status_code == 404
    assert set(r.json()) == {"error"}


def test_cancel_is_idempotent(client):
    booking = book(client).json()
    first = client.post(f"/api/bookings/{booking['id']}/cancel/")
    second = client.post(f"/api/bookings/{booking['id']}/cancel/")
    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["status"] == "cancelled"
    assert second.json()["status"] == "cancelled"


def test_cancel_past_booking_forbidden(client, monkeypatch):
    booking = book(client, slotStartAt=slot_iso(days_ahead=1, hour=10)).json()
    later = datetime.fromisoformat(booking["slotStartAt"]) + timedelta(hours=1)
    monkeypatch.setattr("python_project_386.views.timezone.now", lambda: later)
    r = client.post(f"/api/bookings/{booking['id']}/cancel/")
    assert r.status_code == 400
    assert set(r.json()) == {"error"}
    assert client.get("/api/bookings/?owner_id=1").json()[0]["status"] == "confirmed"


def test_bookings_list_includes_cancelled_and_sorted(client):
    later = book(client, slotStartAt=slot_iso(days_ahead=2, hour=12)).json()
    earlier = book(client, slotStartAt=slot_iso(days_ahead=1, hour=10)).json()
    assert client.post(f"/api/bookings/{earlier['id']}/cancel/").status_code == 200
    items = client.get("/api/bookings/?owner_id=1").json()
    assert [b["id"] for b in items] == [earlier["id"], later["id"]]
    assert [b["status"] for b in items] == ["cancelled", "confirmed"]


def test_list_filters_reject_non_integer_owner(client):
    for url in ("/api/event-types/?owner_id=abc", "/api/bookings/?owner_id=abc"):
        r = client.get(url)
        assert r.status_code == 400, url
        assert set(r.json()) == {"error"}, url


def test_slots_reject_invalid_params(client):
    today = moscow_now().date().isoformat()
    urls = [
        "/api/slots/",
        "/api/slots/?owner_id=1&event_type_id=1",
        f"/api/slots/?owner_id=abc&event_type_id=1&date={today}",
        "/api/slots/?owner_id=1&event_type_id=1&date=not-a-date",
        f"/api/slots/?owner_id=1&event_type_id=999&date={today}",
        f"/api/slots/?owner_id=2&event_type_id=1&date={today}",
    ]
    for url in urls:
        r = client.get(url)
        assert r.status_code == 400, url
        assert set(r.json()) == {"error"}, url


@pytest.mark.parametrize(
    ("method", "url"),
    [
        ("post", "/api/owners/"),
        ("put", "/api/event-types/"),
        ("post", "/api/slots/"),
        ("put", "/api/bookings/"),
        ("get", "/api/bookings/1/cancel/"),
    ],
)
def test_wrong_method_returns_error_envelope(client, method, url):
    r = getattr(client, method)(url)
    assert r.status_code == 405
    assert set(r.json()) == {"error"}


def test_guest_happy_path_end_to_end(client):
    owner_id = client.get("/api/owners/").json()[0]["id"]
    event_type_id = client.get(f"/api/event-types/?owner_id={owner_id}").json()[0]["id"]
    day = (moscow_now() + timedelta(days=1)).date().isoformat()
    slots_url = f"/api/slots/?owner_id={owner_id}&event_type_id={event_type_id}&date={day}"
    chosen = next(s for s in client.get(slots_url).json() if s["isAvailable"])["startAt"]

    created = book(client, event_type_id=event_type_id, slotStartAt=chosen)
    assert created.status_code == 201
    booking = created.json()
    assert booking["status"] == "confirmed"

    after_booking = {s["startAt"]: s for s in client.get(slots_url).json()}
    assert after_booking[chosen]["isAvailable"] is False
    assert book(client, event_type_id=event_type_id, slotStartAt=chosen).status_code == 409
    assert [b["id"] for b in client.get(f"/api/bookings/?owner_id={owner_id}").json()] == [booking["id"]]

    assert client.post(f"/api/bookings/{booking['id']}/cancel/").status_code == 200
    after_cancel = {s["startAt"]: s for s in client.get(slots_url).json()}
    assert after_cancel[chosen]["isAvailable"] is True
    assert book(client, event_type_id=event_type_id, slotStartAt=chosen).status_code == 201


@pytest.mark.parametrize("guest_name", [None, 123])
def test_booking_requires_string_guest_name(client, guest_name):
    r = book(client, guestName=guest_name)
    assert r.status_code == 400
    assert set(r.json()) == {"error"}
    assert client.get("/api/bookings/?owner_id=1").json() == []


@pytest.mark.parametrize("guest_name", ["", "   "])
def test_booking_rejects_blank_guest_name(client, guest_name):
    r = book(client, guestName=guest_name)
    assert r.status_code == 400
    assert set(r.json()) == {"error"}


@pytest.mark.parametrize("guest_email", [None, 123])
def test_booking_requires_string_guest_email(client, guest_email):
    r = book(client, guestEmail=guest_email)
    assert r.status_code == 400
    assert set(r.json()) == {"error"}


def test_booking_rejects_non_object_json(client):
    r = client.post("/api/bookings/", data=json.dumps([1, 2]), content_type="application/json")
    assert r.status_code == 400
    assert set(r.json()) == {"error"}


@pytest.mark.parametrize(("hour", "minute"), [(8, 30), (18, 0), (20, 0)])
def test_booking_rejects_outside_working_hours(client, hour, minute):
    r = book(client, slotStartAt=slot_iso(days_ahead=2, hour=hour, minute=minute))
    assert r.status_code == 400
    assert set(r.json()) == {"error"}


@pytest.mark.parametrize(("hour", "minute"), [(9, 0), (17, 30)])
def test_booking_accepts_working_hours_boundaries(client, hour, minute):
    assert book(client, slotStartAt=slot_iso(days_ahead=2, hour=hour, minute=minute)).status_code == 201
