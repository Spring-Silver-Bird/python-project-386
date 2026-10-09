from django.contrib import admin
from django.urls import path

from . import views

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", views.index, name="index"),
    path("api/owners/", views.api_owners, name="api-owners"),
    path("api/event-types/", views.api_event_types, name="api-event-types"),
    path("api/slots/", views.api_slots, name="api-slots"),
    path("api/bookings/", views.api_bookings, name="api-bookings"),
    path(
        "api/bookings/<int:booking_id>/cancel/",
        views.api_booking_cancel,
        name="api-booking-cancel",
    ),
]
