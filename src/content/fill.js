(function (root) {
  const Basvuru = root.Basvuru || (root.Basvuru = {});

  function nodesFor(id) {
    return [...document.querySelectorAll(`[data-basvuru-id="${CSS.escape(id)}"]`)];
  }

  function commitValue(el, value) {
    const prototype = Object.getPrototypeOf(el);
    const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
    if (descriptor && descriptor.set) descriptor.set.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function assignChecked(el, checked) {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "checked");
    descriptor.set.call(el, checked);
  }

  function notify(el) {
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function fillText(item, el) {
    commitValue(el, item.value);
    return { id: item.id, ok: true, message: "" };
  }

  function fillSelect(item, el) {
    const options = [...el.options].map((option, index) => ({
      value: option.value,
      text: option.textContent,
      index
    }));
    const chosen = Basvuru.pickOption(options, item.value);
    if (!chosen) return { id: item.id, ok: false, message: "Seçenek bulunamadı" };
    el.selectedIndex = chosen.index;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return { id: item.id, ok: true, message: "" };
  }

  function fillRadio(item, nodes) {
    const options = nodes.map((el) => ({
      value: el.value,
      text: Basvuru.controlLabel(el),
      el
    }));
    const chosen = Basvuru.pickOption(options, item.value);
    if (!chosen) return { id: item.id, ok: false, message: "Seçenek bulunamadı" };
    for (const node of nodes) assignChecked(node, node === chosen.el);
    notify(chosen.el);
    return { id: item.id, ok: true, message: "" };
  }

  function fillCheckbox(item, el) {
    const state = Basvuru.checkboxState(item.value);
    if (state === null) return { id: item.id, ok: false, message: "Evet ya da hayır yaz" };
    assignChecked(el, state);
    notify(el);
    return { id: item.id, ok: true, message: "" };
  }

  function fillOne(item) {
    const nodes = nodesFor(item.id);
    if (!nodes.length) {
      return { id: item.id, ok: false, message: "Kutu bulunamadı. Formu yeniden tara." };
    }
    if (item.kind === "radio") return fillRadio(item, nodes);
    if (item.kind === "checkbox") return fillCheckbox(item, nodes[0]);
    if (item.kind === "select") return fillSelect(item, nodes[0]);
    return fillText(item, nodes[0]);
  }

  Basvuru.fill = function (instructions) {
    return (instructions || []).map(fillOne);
  };
})(globalThis);
