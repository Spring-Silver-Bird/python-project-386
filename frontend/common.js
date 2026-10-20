(function () {
  "use strict";

  function byId(id) {
    return document.getElementById(id);
  }

  var flashTimer = null;

  function clearFlash(node) {
    if (flashTimer !== null) {
      clearTimeout(flashTimer);
      flashTimer = null;
    }
    node.classList.remove("flash", "flash-success", "flash-error");
  }

  function setMessage(node, text) {
    clearFlash(node);
    node.textContent = text || "";
  }

  function flashMessage(node, text, options) {
    clearFlash(node);
    if (!text) {
      node.textContent = "";
      return;
    }
    var kind = (options && options.kind) || "success";
    var timeout = (options && options.timeout) || 5000;
    node.textContent = text;
    node.classList.add("flash", "flash-" + kind);
    flashTimer = setTimeout(function () {
      node.textContent = "";
      node.classList.remove("flash", "flash-success", "flash-error");
      flashTimer = null;
    }, timeout);
  }

  function fillOwners(select, items) {
    select.innerHTML = "";
    items.forEach(function (owner) {
      var option = document.createElement("option");
      option.value = String(owner.id);
      option.textContent = owner.name + " <" + owner.email + ">";
      select.appendChild(option);
    });
  }

  function errorText(result, fallback, messages) {
    if (result && result.error) {
      var message = result.error.error || fallback;
      return (messages && messages[message]) || message;
    }
    return fallback;
  }

  window.CalendarUI = {
    byId: byId,
    setMessage: setMessage,
    flashMessage: flashMessage,
    fillOwners: fillOwners,
    errorText: errorText,
  };
})();
