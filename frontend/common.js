(function () {
  "use strict";

  function byId(id) {
    return document.getElementById(id);
  }

  function setMessage(node, text) {
    node.textContent = text || "";
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
    fillOwners: fillOwners,
    errorText: errorText,
  };
})();
