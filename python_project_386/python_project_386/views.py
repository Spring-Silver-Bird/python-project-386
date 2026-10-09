"""Views: HTML calendar UI + JSON API (no DRF)."""

import json
from datetime import date, datetime

from django.http import JsonResponse
from django.shortcuts import render
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from .calendar_store import (
    EVENT_TYPES,
    MOSCOW_TZ,
    OWNERS,
    WINDOW_DAYS,
    build_slots_for_date,
    cancel_booking,
    create_booking,
    get_event_type,
    list_bookings,
    parse_moscow_dt,
)


def index(request):
    default_date = timezone.now().astimezone(MOSCOW_TZ).date().isoformat()
    return render(
        request,
        "index.html",
        {
            "owners": OWNERS,
            "event_types": EVENT_TYPES,
            "owners_json": json.dumps(OWNERS),
            "event_types_json": json.dumps(EVENT_TYPES),
            "default_date": default_date,
        },
    )


@require_GET
def api_owners(request):
    return JsonResponse(OWNERS, safe=False)


@require_GET
def api_event_types(request):
    owner_id = request.GET.get("owner_id")
    items = EVENT_TYPES
    if owner_id is not None:
        try:
            oid = int(owner_id)
        except ValueError:
            return JsonResponse({"error": "invalid owner_id"}, status=400)
        items = [e for e in items if e["owner_id"] == oid]
    return JsonResponse(items, safe=False)


@require_GET
def api_slots(request):
    try:
        owner_id = int(request.GET.get("owner_id", ""))
        event_type_id = int(request.GET.get("event_type_id", ""))
    except ValueError:
        return JsonResponse({"error": "owner_id/event_type_id required"}, status=400)
    date_str = request.GET.get("date", "")
    try:
        day_date = date.fromisoformat(date_str)
    except ValueError:
        return JsonResponse({"error": "invalid date, use YYYY-MM-DD"}, status=400)
    event = get_event_type(event_type_id)
    if event is None or event["owner_id"] != owner_id:
        return JsonResponse({"error": "unknown event type for owner"}, status=400)
    today = timezone.now().astimezone(MOSCOW_TZ).date()
    delta = (day_date - today).days
    if delta < 0 or delta > WINDOW_DAYS:
        return JsonResponse({"error": "date outside 14-day window"}, status=400)
    day = datetime(day_date.year, day_date.month, day_date.day, tzinfo=MOSCOW_TZ)
    return JsonResponse(build_slots_for_date(owner_id, event_type_id, day), safe=False)


@require_GET
def api_bookings_list(request):
    owner_id = request.GET.get("owner_id")
    oid = None
    if owner_id is not None:
        try:
            oid = int(owner_id)
        except ValueError:
            return JsonResponse({"error": "invalid owner_id"}, status=400)
    return JsonResponse(list_bookings(oid), safe=False)


@csrf_exempt
def api_bookings(request):
    """GET /api/bookings/ -> list, POST /api/bookings/ -> create (per contract)."""
    if request.method == "GET":
        return api_bookings_list(request)
    if request.method == "POST":
        return api_bookings_create(request)
    return JsonResponse({"error": "method not allowed"}, status=405)


@csrf_exempt
@require_POST
def api_bookings_create(request):
    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"error": "invalid JSON"}, status=400)
    try:
        event_type_id = int(payload.get("event_type_id", ""))
    except ValueError:
        return JsonResponse({"error": "event_type_id required"}, status=400)
    slot_raw = payload.get("slotStartAt", "")
    slot_start = parse_moscow_dt(slot_raw) if isinstance(slot_raw, str) else None
    if slot_start is None:
        return JsonResponse({"error": "invalid slotStartAt"}, status=400)
    booking, err, status = create_booking(
        event_type_id=event_type_id,
        slot_start=slot_start,
        guest_name=str(payload.get("guestName", "")),
        guest_email=str(payload.get("guestEmail", "")),
        now=timezone.now().astimezone(MOSCOW_TZ),
    )
    if err:
        return JsonResponse({"error": err}, status=status)
    return JsonResponse(booking, status=201)


@csrf_exempt
@require_POST
def api_booking_cancel(request, booking_id: int):
    booking = cancel_booking(booking_id)
    if booking is None:
        return JsonResponse({"error": "not found"}, status=404)
    return JsonResponse(booking)
