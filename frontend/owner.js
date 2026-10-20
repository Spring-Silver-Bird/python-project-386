(function () {
  "use strict";

  var api = window.CalendarSDK;
  var eventTypes = [];

  function $(id) {
    return document.getElementById(id);
  }

  var ownerSel = $("owner");
  var ownerTypesList = $("ownerTypes");
  var ownerBookingsList = $("ownerBookings");
  var createTypeForm = $("createType");
  var msg = $("msg");

  function setMessage(text) {
    msg.textContent = text || "";
  }

  function errorText(result, fallback) {
    if (result && result.error) {
      return result.error.error || fallback;
    }
    return fallback;
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

  function statusLabel(status) {
    if (status === "confirmed") {
      return "подтверждена";
    }
    if (status === "cancelled") {
      return "отменена";
    }
    return status;
  }

  function fillOwners(items) {
    ownerSel.innerHTML = "";
    items.forEach(function (owner) {
      var option = document.createElement("option");
      option.value = String(owner.id);
      option.textContent = owner.name + " <" + owner.email + ">";
      ownerSel.appendChild(option);
    });
  }

  function renderOwnerEventTypes() {
    var ownerId = Number(ownerSel.value);
    var owned = eventTypes.filter(function (eventType) {
      return eventType.owner_id === ownerId;
    });
    ownerTypesList.innerHTML = "";
    if (!owned.length) {
      ownerTypesList.appendChild(emptyItem("У владельца пока нет типов встреч"));
      return;
    }
    owned.forEach(function (eventType) {
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
        eventTypeTitle(booking.event_type_id) +
        " — " +
        statusLabel(booking.status);
      ownerBookingsList.appendChild(item);
    });
  }

  async function loadEventTypes() {
    var result = await api.eventTypesList();
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
    renderOwnerEventTypes();
    await loadBookings();
  }

  async function init() {
    var responses = await Promise.all([api.ownersList(), api.eventTypesList()]);
    var ownersResult = responses[0];
    var typesResult = responses[1];
    if (ownersResult.error || !ownersResult.data) {
      setMessage(errorText(ownersResult, "Не удалось загрузить владельцев"));
      return;
    }
    if (typesResult.error || !typesResult.data) {
      setMessage(errorText(typesResult, "Не удалось загрузить типы встреч"));
      return;
    }
    eventTypes = typesResult.data;
    fillOwners(ownersResult.data);
    renderOwnerEventTypes();
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
