(function (root) {
  const Basvuru = root.Basvuru || (root.Basvuru = {});

  Basvuru.normalize = function (value) {
    let text = String(value || "").trim();
    text = text.replace(/İ/g, "i").replace(/I/g, "ı");
    text = text.toLocaleLowerCase("tr");
    text = text
      .replace(/ı/g, "i")
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c");
    text = text.replace(/[_/.,:;!?()[\]{}"'`’“”+*]+/g, " ");
    text = text.replace(/-/g, " ");
    text = text.replace(/\s+/g, " ").trim();
    return text;
  };

  Basvuru.containsPhrase = function (haystack, phrase) {
    const words = Basvuru.normalize(haystack).split(" ").filter(Boolean);
    const needle = Basvuru.normalize(phrase).split(" ").filter(Boolean);
    if (!needle.length || needle.length > words.length) return false;
    for (let i = 0; i <= words.length - needle.length; i += 1) {
      let found = true;
      for (let j = 0; j < needle.length; j += 1) {
        if (words[i + j] !== needle[j]) {
          found = false;
          break;
        }
      }
      if (found) return true;
    }
    return false;
  };
})(globalThis);
