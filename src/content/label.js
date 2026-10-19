(function (root) {
  const Basvuru = root.Basvuru || (root.Basvuru = {});

  Basvuru.cleanText = function (value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  };

  Basvuru.isVisible = function (el) {
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };

  function labelContents(labelEl) {
    const clone = labelEl.cloneNode(true);
    clone.querySelectorAll("input, textarea, select").forEach((node) => node.remove());
    return Basvuru.cleanText(clone.textContent);
  }

  function labelledByText(el) {
    const ids = (el.getAttribute("aria-labelledby") || "").split(/\s+/).filter(Boolean);
    if (!ids.length) return "";
    return ids
      .map((id) => {
        const node = document.getElementById(id);
        return node ? Basvuru.cleanText(node.textContent) : "";
      })
      .filter(Boolean)
      .join(" ");
  }

  function elementText(node) {
    if (!node || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(node.tagName)) return "";
    const text = Basvuru.cleanText(node.textContent);
    if (!text || text.length > 180) return "";
    return text;
  }

  Basvuru.controlLabel = function (el) {
    if (el.id) {
      const explicit = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (explicit) {
        const text = labelContents(explicit);
        if (text) return text;
      }
    }
    const wrapping = el.closest("label");
    if (wrapping) {
      const text = labelContents(wrapping);
      if (text) return text;
    }
    const aria = el.getAttribute("aria-label");
    if (aria) return Basvuru.cleanText(aria);
    return labelledByText(el);
  };

  Basvuru.groupLabel = function (el) {
    const group = el.closest("fieldset, [role='radiogroup'], [role='group']");
    if (!group) return "";
    const legend = group.querySelector(":scope > legend");
    if (legend) {
      const text = Basvuru.cleanText(legend.textContent);
      if (text) return text;
    }
    const aria = group.getAttribute("aria-label");
    if (aria) return Basvuru.cleanText(aria);
    return labelledByText(group);
  };

  Basvuru.nearbyQuestion = function (el) {
    const previous = elementText(el.previousElementSibling);
    if (previous) return previous;
    const parent = el.parentElement;
    if (!parent) return "";
    return elementText(parent.previousElementSibling);
  };

  Basvuru.questionText = function (el) {
    const direct = Basvuru.controlLabel(el);
    if (direct) return direct;
    const group = Basvuru.groupLabel(el);
    if (group) return group;
    const nearby = Basvuru.nearbyQuestion(el);
    if (nearby) return nearby;
    const placeholder = el.getAttribute("placeholder");
    if (placeholder) return Basvuru.cleanText(placeholder);
    const name = el.getAttribute("name");
    if (name) return Basvuru.cleanText(name);
    return "";
  };

  const SKIP_TYPES = new Set([
    "password", "file", "hidden", "submit", "button", "reset", "image", "color", "range"
  ]);

  Basvuru.shouldSkip = function (el) {
    if (!el || el.disabled || el.readOnly) return true;
    if (el.getAttribute("aria-disabled") === "true") return true;
    if (el.closest("[aria-hidden='true']")) return true;
    if (el.tagName === "INPUT") {
      const type = (el.getAttribute("type") || "text").toLowerCase();
      if (SKIP_TYPES.has(type)) return true;
    }
    return !Basvuru.isVisible(el);
  };
})(globalThis);
