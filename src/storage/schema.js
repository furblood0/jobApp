(function (root) {
  const Basvuru = root.Basvuru || (root.Basvuru = {});

  Basvuru.STORAGE_KEY = "basvuru";

  Basvuru.PROFILE_FIELDS = [
    { key: "firstName", label: "Ad", group: "Kişi" },
    { key: "lastName", label: "Soyad", group: "Kişi" },
    { key: "email", label: "E-posta", group: "İletişim", input: "email" },
    { key: "phone", label: "Telefon", group: "İletişim", input: "tel" },
    { key: "city", label: "Şehir", group: "İletişim" },
    { key: "country", label: "Ülke", group: "İletişim", bilingual: true },
    { key: "linkedin", label: "LinkedIn", group: "İletişim", input: "url" },
    { key: "github", label: "GitHub", group: "İletişim", input: "url" },
    { key: "website", label: "Web sitesi", group: "İletişim", input: "url" },
    { key: "title", label: "Ünvan", group: "İş", bilingual: true },
    { key: "yearsExperience", label: "Deneyim yılı", group: "İş", input: "number" },
    { key: "salary", label: "Maaş beklentisi", group: "İş" },
    {
      key: "noticePeriod",
      label: "Ne zaman başlarsın",
      group: "İş",
      choice: "single",
      options: [
        { id: "now", tr: "Hemen", en: "Immediately" },
        { id: "2w", tr: "2 hafta", en: "2 weeks" },
        { id: "1m", tr: "1 ay", en: "1 month" },
        { id: "2m", tr: "2 ay", en: "2 months" },
        { id: "3m", tr: "3 ay", en: "3 months" }
      ]
    },
    { key: "school", label: "Okul", group: "Eğitim", bilingual: true },
    {
      key: "degree",
      label: "Derece",
      group: "Eğitim",
      choice: "multi",
      prefer: "highest",
      options: [
        { id: "highschool", tr: "Lise", en: "High school" },
        { id: "associate", tr: "Ön lisans", en: "Associate" },
        { id: "bachelor", tr: "Lisans", en: "Bachelor's" },
        { id: "master", tr: "Yüksek lisans", en: "Master's" },
        { id: "doctorate", tr: "Doktora", en: "Doctorate" }
      ]
    },
    { key: "fieldOfStudy", label: "Bölüm", group: "Eğitim", bilingual: true },
    { key: "graduationYear", label: "Mezuniyet yılı", group: "Eğitim", input: "number" },
    {
      key: "workPreference",
      label: "Çalışma tercihi",
      group: "Tercih",
      choice: "multi",
      options: [
        { id: "remote", tr: "Uzaktan", en: "Remote", aliases: ["uzaktan", "remote"] },
        { id: "hybrid", tr: "Hibrit", en: "Hybrid", aliases: ["hibrit", "hybrid", "hibrid"] },
        { id: "onsite", tr: "Ofis", en: "On-site", aliases: ["ofis", "office", "on site", "onsite"] },
        { id: "flexible", tr: "Esnek", en: "Flexible", aliases: ["esnek", "flexible"] }
      ]
    },
    {
      key: "relocation",
      label: "Şehir değişikliği",
      group: "Tercih",
      choice: "single",
      options: [
        { id: "yes", tr: "Evet", en: "Yes", aliases: ["evet", "yes"] },
        { id: "no", tr: "Hayır", en: "No", aliases: ["hayir", "no"] }
      ]
    }
  ];

  Basvuru.emptyProfile = function () {
    const profile = {};
    for (const field of Basvuru.PROFILE_FIELDS) {
      if (field.choice === "multi") profile[field.key] = [];
      else if (field.bilingual) profile[field.key] = { tr: "", en: "" };
      else profile[field.key] = "";
    }
    return profile;
  };

  Basvuru.choiceIds = function (field, value) {
    const options = field.options || [];
    const known = new Set(options.map((option) => option.id));
    if (Array.isArray(value)) return value.filter((id) => known.has(id));
    if (typeof value === "string" && known.has(value)) return [value];
    const raw = [];
    if (value && typeof value === "object") raw.push(value.tr, value.en);
    else if (typeof value === "string") raw.push(value);
    const blob = Basvuru.normalize ? Basvuru.normalize(raw.filter(Boolean).join(" ")) : "";
    if (!blob) return [];
    return options.filter((option) => {
      const names = [option.tr, option.en].concat(option.aliases || []);
      return names.some((name) => {
        const normalized = Basvuru.normalize(name);
        return normalized && (blob === normalized || Basvuru.containsPhrase(blob, normalized));
      });
    }).map((option) => option.id);
  };

  Basvuru.pairValue = function (value) {
    if (value && typeof value === "object") {
      return {
        tr: String(value.tr || "").trim(),
        en: String(value.en || "").trim()
      };
    }
    return { tr: String(value || "").trim(), en: "" };
  };

  Basvuru.normalizeProfile = function (raw) {
    const profile = Basvuru.emptyProfile();
    const source = raw || {};
    for (const field of Basvuru.PROFILE_FIELDS) {
      if (field.choice === "multi") {
        profile[field.key] = Basvuru.choiceIds(field, source[field.key]);
      } else if (field.choice === "single") {
        profile[field.key] = Basvuru.choiceIds(field, source[field.key])[0] || "";
      } else if (field.bilingual) {
        profile[field.key] = Basvuru.pairValue(source[field.key]);
      } else if (source[field.key] && typeof source[field.key] !== "object") {
        profile[field.key] = String(source[field.key]).trim();
      }
    }
    return profile;
  };

  Basvuru.profileText = function (profile, key, lang) {
    const language = lang === "en" ? "en" : "tr";
    const field = Basvuru.PROFILE_FIELDS.find((item) => item.key === key);
    if (field && field.choice) {
      const ids = field.options.map((option) => option.id).filter((id) => Basvuru.choiceIds(field, profile && profile[key]).includes(id));
      const labels = ids.map((id) => field.options.find((option) => option.id === id)[language]).filter(Boolean);
      if (!labels.length) return { value: "", fallback: false };
      return { value: labels.join(", "), values: labels, prefer: field.prefer || "", fallback: false };
    }
    if (field && field.bilingual) {
      const pair = Basvuru.pairValue(profile && profile[key]);
      if (pair[language]) return { value: pair[language], fallback: false };
      const other = language === "en" ? pair.tr : pair.en;
      if (other) return { value: other, fallback: true };
      return { value: "", fallback: false };
    }
    if (key === "fullName") {
      const direct = profile && typeof profile.fullName === "string" ? profile.fullName.trim() : "";
      if (direct) return { value: direct, fallback: false };
      const first = profile && typeof profile.firstName === "string" ? profile.firstName.trim() : "";
      const last = profile && typeof profile.lastName === "string" ? profile.lastName.trim() : "";
      return { value: [first, last].filter(Boolean).join(" "), fallback: false };
    }
    const raw = profile && profile[key];
    if (!raw || typeof raw === "object") return { value: "", fallback: false };
    return { value: String(raw).trim(), fallback: false };
  };

  Basvuru.profileValue = function (profile, key, lang) {
    return Basvuru.profileText(profile, key, lang).value;
  };

  Basvuru.detectLang = function (pageLang, fields) {
    const code = String(pageLang || "").toLowerCase();
    if (code.startsWith("tr")) return "tr";
    if (code.startsWith("en")) return "en";
    const turkish = ["soyad", "telefon", "e posta", "sehir", "ulke", "unvan", "okul", "bolum", "maas", "mezuniyet", "adiniz"];
    const english = ["first name", "last name", "phone", "email", "city", "country", "university", "degree", "salary", "notice"];
    let tr = 0;
    let en = 0;
    for (const field of fields || []) {
      const label = Basvuru.normalize([field.label, field.placeholder].filter(Boolean).join(" "));
      if (!label || !Basvuru.containsPhrase) continue;
      if (turkish.some((phrase) => Basvuru.containsPhrase(label, phrase))) tr += 1;
      if (english.some((phrase) => Basvuru.containsPhrase(label, phrase))) en += 1;
    }
    if (en > tr) return "en";
    return "tr";
  };

  Basvuru.profileLabel = function (key) {
    if (key === "fullName") return "Ad soyad";
    const field = Basvuru.PROFILE_FIELDS.find((item) => item.key === key);
    return field ? field.label : key;
  };

  Basvuru.loadState = async function () {
    const stored = await chrome.storage.local.get(Basvuru.STORAGE_KEY);
    const raw = stored[Basvuru.STORAGE_KEY] || {};
    return {
      profile: Basvuru.normalizeProfile(raw.profile),
      answers: Array.isArray(raw.answers) ? raw.answers : [],
      snippets: Array.isArray(raw.snippets) ? raw.snippets : []
    };
  };

  Basvuru.saveState = async function (state) {
    await chrome.storage.local.set({
      [Basvuru.STORAGE_KEY]: {
        profile: Basvuru.normalizeProfile(state.profile),
        answers: state.answers || [],
        snippets: state.snippets || []
      }
    });
  };
})(globalThis);
