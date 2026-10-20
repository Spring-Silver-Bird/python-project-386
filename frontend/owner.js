(function () {
  "use strict";

  var api = window.CalendarSDK;
  var ui = window.CalendarUI;
  var eventTypes = [];

  var $ = ui.byId;

  var ownerSel = $("owner");
  var ownerTypesList = $("ownerTypes");
  var ownerBookingsList = $("ownerBookings");
  var createTypeForm = $("createType");
  var msg = $("msg");

  function setMessage(text) {
    ui.setMessage(msg, text);
  }

  function errorText(result, fallback) {
    return ui.errorText(result, fallback);
  }

  function emptyItem(text) {
    var item = document.createElement("li");
    item.className = "muted";
    item.textContent = text;
    return item;
  }

  function formatDateTime(iso) {
    return new Date(iso).toLocaleString("ru-RU", {
      timeZone: "Europe/Moscow",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function eventTypeTitle(eventTypeId) {
    var found = eventTypes.filter(function (eventType) {
      return eventType.id === eventTypeId;
    })[0];
    return found ? found.title : "Тип №" + eventTypeId;
  }

  function bookingTitle(booking) {
    if (booking.eventTypeTitle) {
      return (
        booking.eventTypeTitle +
        (booking.eventTypeDescription ? " — " + booking.eventTypeDescription : "")
      );
    }
    return eventTypeTitle(booking.event_type_id);
  }

  function statusLabel(status) {
    if (status === "confirmed") {
      return "подтверждена";
    }
    if (status === "cancelled") {
      return "отменена";
    }
    return status;
  }

  function renderOwnerEventTypes() {
    ownerTypesList.innerHTML = "";
    if (!eventTypes.length) {
      ownerTypesList.appendChild(emptyItem("У владельца пока нет типов встреч"));
      return;
    }
    eventTypes.forEach(function (eventType) {
      var item = document.createElement("li");
      item.textContent =
        eventType.title +
        " (" +
        eventType.duration_minutes +
        " мин)" +
        (eventType.description ? " — " + eventType.description : "");
      ownerTypesList.appendChild(item);
    });
  }

  function renderOwnerBookings(items) {
    var now = Date.now();
    var upcoming = items.filter(function (booking) {
      return booking.status === "confirmed" && new Date(booking.slotStartAt).getTime() >= now;
    });
    ownerBookingsList.innerHTML = "";
    if (!upcoming.length) {
      ownerBookingsList.appendChild(emptyItem("Предстоящих встреч нет"));
      return;
    }
    upcoming.forEach(function (booking) {
      var item = document.createElement("li");
      item.textContent =
        formatDateTime(booking.slotStartAt) +
        " — " +
        booking.guestName +
        " <" +
        booking.guestEmail +
        "> — " +
        bookingTitle(booking) +
        " — " +
        statusLabel(booking.status);
      ownerBookingsList.appendChild(item);
    });
  }

  async function loadEventTypes() {
    var ownerId = Number(ownerSel.value);
    if (!ownerId) {
      eventTypes = [];
      renderOwnerEventTypes();
      return false;
    }
    var result = await api.eventTypesList({ query: { owner_id: ownerId } });
    if (result.error || !result.data) {
      setMessage(errorText(result, "Не удалось загрузить типы встреч"));
      return false;
    }
    eventTypes = result.data;
    renderOwnerEventTypes();
    return true;
  }

  async function loadBookings() {
    var ownerId = Number(ownerSel.value);
    ownerBookingsList.innerHTML = "";
    if (!ownerId) {
      return;
    }
    var result = await api.bookingsList({ query: { owner_id: ownerId } });
    if (result.error || !result.data) {
      setMessage(errorText(result, "Не удалось загрузить встречи"));
      return;
    }
    renderOwnerBookings(result.data);
  }

  async function refreshOwner() {
    await loadEventTypes();
    await loadBookings();
  }

  async function init() {
    var ownersResult = await api.ownersList();
    if (ownersResult.error || !ownersResult.data) {
      setMessage(errorText(ownersResult, "Не удалось загрузить владельцев"));
      return;
    }
    ui.fillOwners(ownerSel, ownersResult.data);
    await loadEventTypes();
    await loadBookings();
  }

  ownerSel.onchange = refreshOwner;

  createTypeForm.onsubmit = async function (event) {
    event.preventDefault();
    var description = $("eventTypeDescription").value;
    var body = {
      owner_id: Number(ownerSel.value),
      title: $("eventTypeTitle").value,
      duration_minutes: Number($("eventTypeDuration").value),
    };
    if (description.trim()) {
      body.description = description;
    }
    var result = await api.eventTypesCreate({ body: body });
    if (result.error) {
      setMessage("Ошибка: " + errorText(result, "не удалось создать тип встречи"));
      return;
    }
    var eventTypeId = result.data.id;
    createTypeForm.reset();
    var refreshed = await loadEventTypes();
    await loadBookings();
    setMessage(
      refreshed
        ? "Тип встречи №" + eventTypeId + " создан"
        : "Тип встречи №" + eventTypeId + " создан, но список не удалось обновить"
    );
  };

  init();
})();
