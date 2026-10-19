(function (root) {
  const Basvuru = root.Basvuru || (root.Basvuru = {});
  const MARK = "data-basvuru-id";

  function inputType(el) {
    if (el.tagName === "TEXTAREA") return "textarea";
    if (el.tagName === "SELECT") return "select";
    return (el.getAttribute("type") || "text").toLowerCase();
  }

  function kindOf(el, type) {
    if (el.tagName === "TEXTAREA") return "textarea";
    if (el.tagName === "SELECT") return "select";
    if (type === "radio") return "radio";
    if (type === "checkbox") return "checkbox";
    return "text";
  }

  function stamp(nodes, id) {
    for (const node of nodes) node.setAttribute(MARK, id);
  }

  function radiosNamed(name) {
    return [...document.querySelectorAll(`input[type="radio"][name="${CSS.escape(name)}"]`)]
      .filter((radio) => !Basvuru.shouldSkip(radio));
  }

  function selectOptions(el) {
    return [...el.options].map((option, index) => ({
      value: option.value,
      text: Basvuru.cleanText(option.textContent),
      index
    }));
  }

  function currentText(el, kind, nodes) {
    if (kind === "checkbox") return el.checked ? "Evet" : "";
    if (kind === "radio") {
      const checked = nodes.find((node) => node.checked);
      return checked ? Basvuru.controlLabel(checked) || checked.value : "";
    }
    if (kind === "select") {
      const option = el.selectedOptions && el.selectedOptions[0];
      if (!option || !el.value) return "";
      return Basvuru.cleanText(option.textContent);
    }
    return el.value || "";
  }

  Basvuru.scan = function () {
    document.querySelectorAll(`[${MARK}]`).forEach((node) => node.removeAttribute(MARK));
    const fields = [];
    const seenRadios = new Set();
    let counter = 0;
    const controls = document.querySelectorAll("input, textarea, select");

    for (const el of controls) {
      const type = inputType(el);
      if (type === "radio" && el.name) {
        if (seenRadios.has(el.name)) continue;
        seenRadios.add(el.name);
        const group = radiosNamed(el.name);
        if (!group.length) continue;
        counter += 1;
        const id = "b" + counter;
        stamp(group, id);
        fields.push({
          id,
          kind: "radio",
          label: Basvuru.groupLabel(group[0]) || Basvuru.nearbyQuestion(group[0]) || Basvuru.cleanText(el.name),
          autocomplete: "",
          name: el.name || "",
          placeholder: "",
          inputType: "radio",
          inputMode: "",
          required: group.some((node) => node.required),
          unsupported: false,
          options: group.map((node, index) => ({
            value: node.value,
            text: Basvuru.controlLabel(node) || node.value,
            index
          })),
          currentValue: currentText(el, "radio", group)
        });
        continue;
      }

      if (Basvuru.shouldSkip(el)) continue;
      counter += 1;
      const id = "b" + counter;
      stamp([el], id);
      const kind = kindOf(el, type);
      fields.push({
        id,
        kind,
        label: Basvuru.questionText(el),
        autocomplete: el.getAttribute("autocomplete") || "",
        name: el.getAttribute("name") || "",
        placeholder: el.getAttribute("placeholder") || "",
        inputType: type,
        inputMode: el.getAttribute("inputmode") || "",
        required: Boolean(el.required),
        unsupported: kind === "select" && Boolean(el.multiple),
        options: kind === "select" ? selectOptions(el) : [],
        currentValue: currentText(el, kind, [el])
      });
    }

    return {
      lang: document.documentElement.lang || "",
      fields
    };
  };
})(globalThis);
