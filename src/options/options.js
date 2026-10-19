(function () {
  const UI_KEY = "basvuru-ui-lang";
  const AUTOCOMPLETE = {
    firstName: "given-name",
    lastName: "family-name",
    email: "email",
    phone: "tel",
    city: "address-level2",
    country: "country-name",
    linkedin: "url",
    github: "url",
    website: "url"
  };
  const WIDE = new Set(["title", "noticePeriod", "school", "degree", "workPreference", "relocation", "website"]);

  const COPY = {
    tr: {
      title: "Profil",
      lead: "Bilgiler bu tarayıcıda kalır. English’e geçince aynı alanların İngilizce karşılığını yazarsın.",
      profileHeading: "Başvuru bilgileri",
      profileLead: "Türkçe formlar bu metinleri kullanır.",
      save: "Kaydet",
      saved: "Kaydedildi.",
      groups: { Kişi: "Kişi", İletişim: "İletişim", İş: "İş", Eğitim: "Eğitim", Tercih: "Tercih" },
      fields: {
        firstName: "Ad",
        lastName: "Soyad",
        email: "E-posta",
        phone: "Telefon",
        city: "Şehir",
        country: "Ülke",
        linkedin: "LinkedIn",
        github: "GitHub",
        website: "Web sitesi",
        title: "Ünvan",
        yearsExperience: "Deneyim yılı",
        salary: "Maaş beklentisi",
        noticePeriod: "Ne zaman başlarsın",
        school: "Okul",
        degree: "Derece",
        fieldOfStudy: "Bölüm",
        graduationYear: "Mezuniyet yılı",
        workPreference: "Çalışma tercihi",
        relocation: "Şehir değişikliği"
      },
      hints: {
        workPreference: "Birden fazlasını seçebilirsin.",
        degree: "Sahip olduklarını işaretle. Form tek diploma sorarsa en yükseği yazılır.",
        noticePeriod: "Birini seç.",
        relocation: "Birini seç."
      },
      placeholders: {
        country: "Türkiye",
        title: "Yazılım geliştirici",
        school: "İstanbul Teknik Üniversitesi",
        fieldOfStudy: "Bilgisayar mühendisliği",
        city: "İstanbul"
      },
      snippetsHeading: "Paragraflar",
      snippetsLead: "Uzun sorularda bu dildeki metin önerilir.",
      snippetTitle: "Başlık",
      snippetTags: "Etiketler",
      snippetBody: "Metin",
      titlePlaceholder: "Kısa motivasyon",
      tagsPlaceholder: "motivasyon, neden",
      addSnippet: "Paragraf ekle",
      noSnippets: "Bu dilde henüz paragraf yok.",
      answersHeading: "Cevap bankası",
      answersLead: "Formda kaydettiğin sorular burada durur. Aynı soru bir sonraki başvuruda hazır gelir.",
      noAnswers: "Henüz öğrenilmiş soru yok.",
      remove: "Sil"
    },
    en: {
      title: "Profile",
      lead: "Everything stays in this browser. Switch to Türkçe to edit the Turkish wording.",
      profileHeading: "Application details",
      profileLead: "English forms use this wording.",
      save: "Save",
      saved: "Saved.",
      groups: { Kişi: "Person", İletişim: "Contact", İş: "Work", Eğitim: "Education", Tercih: "Preferences" },
      fields: {
        firstName: "First name",
        lastName: "Last name",
        email: "Email",
        phone: "Phone",
        city: "City",
        country: "Country",
        linkedin: "LinkedIn",
        github: "GitHub",
        website: "Website",
        title: "Job title",
        yearsExperience: "Years of experience",
        salary: "Salary expectation",
        noticePeriod: "When can you start",
        school: "School",
        degree: "Degree",
        fieldOfStudy: "Field of study",
        graduationYear: "Graduation year",
        workPreference: "Work preference",
        relocation: "Willing to relocate"
      },
      hints: {
        workPreference: "Select every arrangement you can do.",
        degree: "Select the degrees you hold. A single question gets the highest one.",
        noticePeriod: "Choose one.",
        relocation: "Choose one."
      },
      placeholders: {
        country: "Turkey",
        title: "Software engineer",
        school: "Istanbul Technical University",
        fieldOfStudy: "Computer engineering",
        city: "Istanbul"
      },
      snippetsHeading: "Paragraphs",
      snippetsLead: "Long answers suggest the paragraph saved in this language.",
      snippetTitle: "Title",
      snippetTags: "Tags",
      snippetBody: "Text",
      titlePlaceholder: "Short motivation",
      tagsPlaceholder: "why, motivation",
      addSnippet: "Add paragraph",
      noSnippets: "No paragraph in this language yet.",
      answersHeading: "Answer bank",
      answersLead: "Questions you save on a form land here and come back the next time.",
      noAnswers: "No saved questions yet.",
      remove: "Delete"
    }
  };

  const profileRoot = document.getElementById("profile");
  const snippetRoot = document.getElementById("snippets");
  const answerRoot = document.getElementById("answers");
  const profileStatus = document.getElementById("profile-status");

  let lang = "tr";
  let profile = Basvuru.emptyProfile();
  let snippets = [];
  let answers = [];

  function text() {
    return COPY[lang];
  }

  function fieldValue(field) {
    if (field.bilingual) return Basvuru.pairValue(profile[field.key])[lang];
    return typeof profile[field.key] === "string" ? profile[field.key] : "";
  }

  function readFormIntoProfile() {
    for (const field of Basvuru.PROFILE_FIELDS) {
      const input = profileRoot.querySelector(`[name="${field.key}"]`);
      if (!input) continue;
      const value = input.value.trim();
      if (field.bilingual) {
        const pair = Basvuru.pairValue(profile[field.key]);
        pair[lang] = value;
        profile[field.key] = pair;
      } else {
        profile[field.key] = value;
      }
    }
  }

  function paintChrome() {
    const copy = text();
    document.documentElement.lang = lang === "en" ? "en" : "tr";
    document.title = copy.title + " · Başvuru Doldur";
    document.getElementById("page-title").textContent = copy.title;
    document.getElementById("page-lead").textContent = copy.lead;
    document.getElementById("profile-heading").textContent = copy.profileHeading;
    document.getElementById("profile-lead").textContent = copy.profileLead;
    document.getElementById("save-profile").textContent = copy.save;
    document.getElementById("snippets-heading").textContent = copy.snippetsHeading;
    document.getElementById("snippets-lead").textContent = copy.snippetsLead;
    document.getElementById("snippet-title-label").textContent = copy.snippetTitle;
    document.getElementById("snippet-tags-label").textContent = copy.snippetTags;
    document.getElementById("snippet-body-label").textContent = copy.snippetBody;
    document.getElementById("snippet-title").placeholder = copy.titlePlaceholder;
    document.getElementById("snippet-tags").placeholder = copy.tagsPlaceholder;
    document.getElementById("add-snippet").textContent = copy.addSnippet;
    document.getElementById("answers-heading").textContent = copy.answersHeading;
    document.getElementById("answers-lead").textContent = copy.answersLead;
    document.getElementById("lang-tr").classList.toggle("selected", lang === "tr");
    document.getElementById("lang-en").classList.toggle("selected", lang === "en");
    document.getElementById("lang-tr").setAttribute("aria-pressed", String(lang === "tr"));
    document.getElementById("lang-en").setAttribute("aria-pressed", String(lang === "en"));
  }

  function renderProfile() {
    const copy = text();
    profileRoot.replaceChildren();
    const groups = [];
    for (const field of Basvuru.PROFILE_FIELDS) {
      let group = groups.find((item) => item.name === field.group);
      if (!group) {
        group = { name: field.group, fields: [] };
        groups.push(group);
      }
      group.fields.push(field);
    }
    for (const group of groups) {
      const section = document.createElement("div");
      section.className = "group";
      const title = document.createElement("h3");
      title.textContent = copy.groups[group.name] || group.name;
      const grid = document.createElement("div");
      grid.className = "grid";
      for (const field of group.fields) grid.append(fieldInput(field, copy));
      section.append(title, grid);
      profileRoot.append(section);
    }
  }

  function fieldInput(field, copy) {
    if (field.choice) return choiceField(field, copy);
    const label = document.createElement("label");
    label.className = "field" + (WIDE.has(field.key) || copy.hints[field.key] ? " wide" : "");
    label.append(document.createTextNode(copy.fields[field.key] || field.label));
    const input = document.createElement("input");
    input.type = field.input || "text";
    input.name = field.key;
    input.value = fieldValue(field);
    input.autocomplete = AUTOCOMPLETE[field.key] || "off";
    if (copy.placeholders[field.key]) input.placeholder = copy.placeholders[field.key];
    label.append(input);
    if (copy.hints[field.key]) {
      const hint = document.createElement("span");
      hint.className = "hint";
      hint.textContent = copy.hints[field.key];
      label.append(hint);
    }
    return label;
  }

  function choiceField(field, copy) {
    const wrap = document.createElement("div");
    wrap.className = "field wide";
    const caption = document.createElement("span");
    caption.textContent = copy.fields[field.key] || field.label;
    const choices = document.createElement("div");
    choices.className = "choices " + (field.choice === "single" ? "single" : "multi");
    const selected = new Set(field.choice === "multi" ? (profile[field.key] || []) : [profile[field.key]].filter(Boolean));
    for (const option of field.options) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "chip" + (selected.has(option.id) ? " selected" : "");
      button.textContent = option[lang];
      button.setAttribute("aria-pressed", String(selected.has(option.id)));
      button.addEventListener("click", () => toggleChoice(field, option.id));
      choices.append(button);
    }
    wrap.append(caption, choices);
    if (copy.hints[field.key]) {
      const hint = document.createElement("span");
      hint.className = "hint";
      hint.textContent = copy.hints[field.key];
      wrap.append(hint);
    }
    return wrap;
  }

  function toggleChoice(field, id) {
    readFormIntoProfile();
    if (field.choice === "single") {
      profile[field.key] = profile[field.key] === id ? "" : id;
    } else {
      const selected = new Set(profile[field.key] || []);
      if (selected.has(id)) selected.delete(id);
      else selected.add(id);
      profile[field.key] = field.options.map((option) => option.id).filter((optionId) => selected.has(optionId));
    }
    profileStatus.textContent = "";
    renderProfile();
  }

  function visibleSnippets() {
    return snippets.filter((snippet) => snippet.lang === lang || (!snippet.lang && lang === "tr"));
  }

  function renderSnippets() {
    const copy = text();
    snippetRoot.replaceChildren();
    const list = visibleSnippets();
    if (!list.length) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = copy.noSnippets;
      snippetRoot.append(empty);
      return;
    }
    list.forEach((snippet) => {
      const card = document.createElement("article");
      card.className = "snippet";
      const line = document.createElement("div");
      line.className = "line";
      const title = document.createElement("strong");
      title.textContent = snippet.title;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "quiet";
      remove.textContent = copy.remove;
      remove.addEventListener("click", () => removeSnippet(snippet.id));
      line.append(title, remove);
      const tags = document.createElement("p");
      tags.className = "hint";
      tags.textContent = (snippet.tags || []).join(", ");
      const body = document.createElement("p");
      body.className = "snippet-body";
      body.textContent = snippet.body;
      card.append(line, tags, body);
      snippetRoot.append(card);
    });
  }

  function renderAnswers() {
    const copy = text();
    answerRoot.replaceChildren();
    if (!answers.length) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = copy.noAnswers;
      answerRoot.append(empty);
      return;
    }
    const ordered = [...answers].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    for (const answer of ordered) {
      const card = document.createElement("article");
      card.className = "answer";
      const line = document.createElement("div");
      line.className = "line";
      const title = document.createElement("strong");
      title.textContent = answer.questionOriginal;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "quiet";
      remove.textContent = copy.remove;
      remove.addEventListener("click", () => removeAnswer(answer.id));
      line.append(title, remove);
      const body = document.createElement("textarea");
      body.rows = 3;
      body.value = answer.answer;
      body.addEventListener("change", () => updateAnswer(answer.id, body.value));
      card.append(line, body);
      answerRoot.append(card);
    }
  }

  function paint() {
    paintChrome();
    renderProfile();
    renderSnippets();
    renderAnswers();
  }

  async function loadUiLang() {
    const stored = await chrome.storage.local.get(UI_KEY);
    lang = stored[UI_KEY] === "en" ? "en" : "tr";
  }

  async function rememberLang() {
    await chrome.storage.local.set({ [UI_KEY]: lang });
  }

  function chooseLang(next) {
    if (next === lang) return;
    readFormIntoProfile();
    lang = next;
    profileStatus.textContent = "";
    paint();
    rememberLang();
  }

  async function refresh() {
    const state = await Basvuru.loadState();
    profile = state.profile;
    snippets = state.snippets;
    answers = state.answers;
    paint();
  }

  async function removeSnippet(id) {
    readFormIntoProfile();
    const state = await Basvuru.loadState();
    state.profile = profile;
    state.snippets = state.snippets.filter((snippet) => snippet.id !== id);
    await Basvuru.saveState(state);
    snippets = state.snippets;
    renderSnippets();
  }

  async function removeAnswer(id) {
    const state = await Basvuru.loadState();
    state.answers = state.answers.filter((answer) => answer.id !== id);
    await Basvuru.saveState(state);
    answers = state.answers;
    renderAnswers();
  }

  async function updateAnswer(id, value) {
    const trimmed = value.trim();
    if (!trimmed) return;
    const state = await Basvuru.loadState();
    const found = state.answers.find((answer) => answer.id === id);
    if (!found) return;
    found.answer = trimmed;
    found.updatedAt = Date.now();
    await Basvuru.saveState(state);
    answers = state.answers;
  }

  document.getElementById("lang-tr").addEventListener("click", () => chooseLang("tr"));
  document.getElementById("lang-en").addEventListener("click", () => chooseLang("en"));

  document.getElementById("save-profile").addEventListener("click", async () => {
    readFormIntoProfile();
    const state = await Basvuru.loadState();
    state.profile = profile;
    await Basvuru.saveState(state);
    profile = state.profile;
    profileStatus.textContent = text().saved;
  });

  document.getElementById("snippet-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const title = document.getElementById("snippet-title").value.trim();
    const body = document.getElementById("snippet-body").value.trim();
    const tags = document.getElementById("snippet-tags").value.split(",").map((tag) => tag.trim()).filter(Boolean);
    if (!title || !body) {
      document.getElementById("snippet-title").focus();
      return;
    }
    readFormIntoProfile();
    const state = await Basvuru.loadState();
    state.profile = profile;
    state.snippets.push({ id: crypto.randomUUID(), lang, title, tags, body });
    await Basvuru.saveState(state);
    snippets = state.snippets;
    document.getElementById("snippet-form").reset();
    renderSnippets();
  });

  loadUiLang().then(refresh);
})();
