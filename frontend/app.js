(function () {
  "use strict";

  var api = window.CalendarSDK;
  var ui = window.CalendarUI;
  var owners = [];
  var eventTypes = [];

  var $ = ui.byId;

  var ownerSel = $("owner");
  var etypeSel = $("etype");
  var customTypeFields = $("customTypeFields");
  var customTitleInput = $("customEventTypeTitle");
  var customDescriptionInput = $("customEventTypeDescription");
  var dateInput = $("date");
  var slotsBox = $("slots");
  var msg = $("msg");
  var form = $("book");
  var myList = $("my");
  var slotInput = $("slotStartAt");

  var CUSTOM_TYPE = "custom";

  function isCustomType() {
    return etypeSel.value === CUSTOM_TYPE;
  }

  function syncCustomFields() {
    customTypeFields.hidden = !isCustomType();
  }

  function setMessage(text) {
    ui.setMessage(msg, text);
  }

  function flashMessage(text) {
    ui.flashMessage(msg, text);
  }

  function errorText(result, fallback) {
    return ui.errorText(result, fallback, { "slot already booked": "слот уже занят" });
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
    var customOption = document.createElement("option");
    customOption.value = CUSTOM_TYPE;
    customOption.textContent = "Свой вариант…";
    etypeSel.appendChild(customOption);
    syncCustomFields();
  }

  async function loadSlots() {
    var ownerId = Number(ownerSel.value);
    var eventTypeId = isCustomType() ? null : Number(etypeSel.value);
    slotsBox.innerHTML = "";
    if (!ownerId || (!eventTypeId && !isCustomType()) || !dateInput.value) {
      return false;
    }
    var query = {
      owner_id: ownerId,
      date: dateInput.value,
    };
    if (eventTypeId) {
      query.event_type_id = eventTypeId;
    }
    var result = await api.slotsList({ query: query });
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
    myList.innerHTML = "";
    if (!ownerId) {
      return;
    }
    var result = await api.bookingsList({ query: { owner_id: ownerId } });
    if (result.error || !result.data) {
      return;
    }
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
          flashMessage(
            reloaded
              ? "Запись №" + booking.id + " отменена"
              : "Запись №" + booking.id + " отменена, но слоты не удалось обновить"
          );
        };
        item.appendChild(cancel);
        myList.appendChild(item);
      });
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
    ui.fillOwners(ownerSel, owners);
    fillEventTypes();
    await loadSlots();
  }

  ownerSel.onchange = function () {
    fillEventTypes();
    loadSlots();
  };
  etypeSel.onchange = function () {
    syncCustomFields();
    loadSlots();
  };
  dateInput.onchange = loadSlots;
  $("load").onclick = loadSlots;
  form.onsubmit = async function (event) {
    event.preventDefault();
    var body = {
      owner_id: Number(ownerSel.value),
      slotStartAt: slotInput.value,
      guestName: $("guestName").value,
      guestEmail: $("guestEmail").value,
    };
    if (isCustomType()) {
      var customTitle = customTitleInput.value.trim();
      if (!customTitle) {
        setMessage("Укажите название своего типа встречи");
        return;
      }
      body.customEventType = { title: customTitle };
      var customDescription = customDescriptionInput.value.trim();
      if (customDescription) {
        body.customEventType.description = customDescription;
      }
    } else {
      body.event_type_id = Number(etypeSel.value);
    }
    var result = await api.bookingsCreate({ body: body });
    if (result.error) {
      setMessage("Ошибка: " + errorText(result, "не удалось создать запись"));
      return;
    }
    var bookingId = result.data.id;
    slotInput.value = "";
    form.reset();
    customTitleInput.value = "";
    customDescriptionInput.value = "";
    var reloaded = await loadSlots();
    flashMessage(
      reloaded
        ? "Готово! Запись №" + bookingId + " создана"
        : "Запись №" + bookingId + " создана, но слоты не удалось обновить"
    );
  };

  init();
})();
