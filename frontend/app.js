(function () {
  "use strict";

  var api = window.CalendarSDK;
  var owners = [];
  var eventTypes = [];

  function $(id) {
    return document.getElementById(id);
  }

  var ownerSel = $("owner");
  var etypeSel = $("etype");
  var dateInput = $("date");
  var slotsBox = $("slots");
  var msg = $("msg");
  var form = $("book");
  var myList = $("my");
  var slotInput = $("slotStartAt");
  var ownerTypesList = $("ownerTypes");
  var ownerBookingsList = $("ownerBookings");
  var createTypeForm = $("createType");

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

  function todayMoscow() {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Moscow",
    }).format(new Date());
  }

  function formatTime(iso) {
    return new Date(iso).toLocaleTimeString("ru-RU", {
      timeZone: "Europe/Moscow",
      hour: "2-digit",
      minute: "2-digit",
    });
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

  function fillOwners(items) {
    ownerSel.innerHTML = "";
    items.forEach(function (owner) {
      var option = document.createElement("option");
      option.value = String(owner.id);
      option.textContent = owner.name + " <" + owner.email + ">";
      ownerSel.appendChild(option);
    });
  }

  function fillEventTypes() {
    var ownerId = Number(ownerSel.value);
    etypeSel.innerHTML = "";
    eventTypes
      .filter(function (eventType) {
        return eventType.owner_id === ownerId;
      })
      .forEach(function (eventType) {
        var option = document.createElement("option");
        option.value = String(eventType.id);
        option.textContent = eventType.title + " (" + eventType.duration_minutes + " мин)";
        etypeSel.appendChild(option);
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
        eventTypeTitle(booking.event_type_id);
      ownerBookingsList.appendChild(item);
    });
  }

  async function loadSlots() {
    var ownerId = Number(ownerSel.value);
    var eventTypeId = Number(etypeSel.value);
    slotsBox.innerHTML = "";
    if (!ownerId || !eventTypeId || !dateInput.value) {
      return false;
    }
    var result = await api.slotsList({
      query: {
        owner_id: ownerId,
        event_type_id: eventTypeId,
        date: dateInput.value,
      },
    });
    if (result.error || !result.data) {
      setMessage(errorText(result, "Не удалось загрузить слоты"));
      return false;
    }
    setMessage("");
    result.data.forEach(function (slot) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "slot" + (slot.isAvailable ? "" : " taken");
      button.textContent = formatTime(slot.startAt);
      button.disabled = !slot.isAvailable;
      button.onclick = function () {
        var all = slotsBox.querySelectorAll(".slot");
        Array.prototype.forEach.call(all, function (item) {
          item.classList.remove("sel");
        });
        button.classList.add("sel");
        slotInput.value = slot.startAt;
      };
      slotsBox.appendChild(button);
    });
    await loadBookings();
    return true;
  }

  async function loadBookings() {
    var ownerId = Number(ownerSel.value);
    if (!ownerId) {
      myList.innerHTML = "";
      ownerBookingsList.innerHTML = "";
      return;
    }
    var result = await api.bookingsList({ query: { owner_id: ownerId } });
    myList.innerHTML = "";
    ownerBookingsList.innerHTML = "";
    if (result.error || !result.data) {
      return;
    }
    renderOwnerBookings(result.data);
    result.data
      .filter(function (booking) {
        return booking.status === "confirmed";
      })
      .forEach(function (booking) {
        var item = document.createElement("li");
        item.textContent =
          formatTime(booking.slotStartAt) +
          " — " +
          booking.guestName +
          " (" +
          booking.guestEmail +
          ") ";
        var cancel = document.createElement("button");
        cancel.type = "button";
        cancel.textContent = "отменить";
        cancel.onclick = async function () {
          var cancelled = await api.bookingsCancel({ path: { id: booking.id } });
          if (cancelled.error) {
            setMessage(errorText(cancelled, "Не удалось отменить запись"));
            return;
          }
          var reloaded = await loadSlots();
          setMessage(
            reloaded
              ? "Запись №" + booking.id + " отменена"
              : "Запись №" + booking.id + " отменена, но слоты не удалось обновить"
          );
        };
        item.appendChild(cancel);
        myList.appendChild(item);
      });
  }

  async function loadEventTypes() {
    var result = await api.eventTypesList();
    if (result.error || !result.data) {
      setMessage(errorText(result, "Не удалось загрузить типы встреч"));
      return false;
    }
    eventTypes = result.data;
    fillEventTypes();
    renderOwnerEventTypes();
    return true;
  }

  async function init() {
    dateInput.value = todayMoscow();
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
    owners = ownersResult.data;
    eventTypes = typesResult.data;
    fillOwners(owners);
    fillEventTypes();
    renderOwnerEventTypes();
    await loadSlots();
  }

  ownerSel.onchange = function () {
    fillEventTypes();
    renderOwnerEventTypes();
    loadSlots();
  };
  etypeSel.onchange = loadSlots;
  dateInput.onchange = loadSlots;
  $("load").onclick = loadSlots;
  form.onsubmit = async function (event) {
    event.preventDefault();
    var result = await api.bookingsCreate({
      body: {
        event_type_id: Number(etypeSel.value),
        slotStartAt: slotInput.value,
        guestName: $("guestName").value,
        guestEmail: $("guestEmail").value,
      },
    });
    if (result.error) {
      setMessage("Ошибка: " + errorText(result, "не удалось создать запись"));
      return;
    }
    var bookingId = result.data.id;
    slotInput.value = "";
    form.reset();
    var reloaded = await loadSlots();
    setMessage(
      reloaded
        ? "Готово! Запись №" + bookingId + " создана"
        : "Запись №" + bookingId + " создана, но слоты не удалось обновить"
    );
  };

  createTypeForm.onsubmit = async function (event) {
    event.preventDefault();
    var description = $("eventTypeDescription").value;
    var body = {
      owner_id: Number(ownerSel.value),
      title: $("eventTypeTitle").value,
      duration_minutes: 30,
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
    await loadEventTypes();
    etypeSel.value = String(eventTypeId);
    await loadSlots();
    setMessage("Тип встречи №" + eventTypeId + " создан");
  };

  init();
})();
