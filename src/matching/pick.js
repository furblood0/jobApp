(function (root) {
  const Basvuru = root.Basvuru || (root.Basvuru = {});

  const EQUIV = [
    ["evet", "yes", "true", "var", "on", "1"],
    ["hayir", "no", "false", "yok", "off", "0"]
  ];

  function sameMeaning(left, right) {
    if (left === right) return true;
    return EQUIV.some((group) => group.includes(left) && group.includes(right));
  }

  Basvuru.checkboxState = function (wanted) {
    const target = Basvuru.normalize(wanted);
    if (!target) return null;
    if (EQUIV[0].includes(target)) return true;
    if (EQUIV[1].includes(target)) return false;
    return null;
  };

  Basvuru.pickOption = function (options, wanted) {
    const target = Basvuru.normalize(wanted);
    if (!target) return null;
    const list = options || [];

    const exact = list.find((option) => {
      const text = Basvuru.normalize(option.text);
      const value = Basvuru.normalize(option.value);
      return sameMeaning(text, target) || sameMeaning(value, target);
    });
    if (exact) return exact;

    if (target.length < 3) return null;
    return list.find((option) => {
      const text = Basvuru.normalize(option.text);
      return text.length >= 3 && (text.includes(target) || target.includes(text));
    }) || null;
  };
})(globalThis);
