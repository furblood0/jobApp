(function () {
  chrome.runtime.onMessage.addListener((message) => {
    if (!message || message.type !== "close-if-open") return;
    chrome.windows.getCurrent((win) => {
      if (!win || win.id !== message.windowId) return;
      setTimeout(() => {
        chrome.sidePanel.close({ windowId: win.id }).catch(() => window.close());
      }, 50);
    });
  });

  const INJECT_FILES = [
    "src/matching/normalize.js",
    "src/matching/pick.js",
    "src/content/label.js",
    "src/content/fill.js",
    "src/content/scan.js"
  ];

  const statusNode = document.getElementById("status");
  const summaryNode = document.getElementById("summary");
  const listNode = document.getElementById("list");
  const scanButton = document.getElementById("scan");
  const fillButton = document.getElementById("fill");
  const optionsButton = document.getElementById("open-options");
  const langBar = document.getElementById("lang-bar");
  const langLabel = document.getElementById("lang-label");
  const useTr = document.getElementById("use-tr");
  const useEn = document.getElementById("use-en");

  let rows = [];
  let busy = false;
  let formState = null;
  let scannedFields = [];
  let chosenLang = "tr";

  function setStatus(message) {
    statusNode.textContent = message;
  }

  function badgeText(row) {
    if (row.field.unsupported) return "Elle";
    if (row.match.status === "fill" && row.match.source === "answer") return "Banka";
    if (row.match.status === "fill") return "Profil";
    if (row.match.source === "guess") return "Tahmin";
    if (row.match.source === "snippet") return "Paragraf";
    if (row.match.source === "profile") return "Profil boş";
    return "Yeni";
  }

  function updateSummary() {
    if (!rows.length) {
      summaryNode.hidden = true;
      return;
    }
    summaryNode.hidden = false;
    document.getElementById("count-all").textContent = String(rows.length);
    document.getElementById("count-selected").textContent = String(rows.filter((row) => row.checked).length);
    document.getElementById("count-ask").textContent = String(rows.filter((row) => row.match.status === "ask").length);
    document.getElementById("count-empty").textContent = String(rows.filter((row) => row.match.status === "empty").length);
  }

  function updateFillButton() {
    fillButton.disabled = busy || !rows.some((row) => row.checked && row.draft.trim());
  }

  function yesNo(value) {
    const state = Basvuru.checkboxState(value);
    if (state === true) return chosenLang === "en" ? "Yes" : "Evet";
    if (state === false) return chosenLang === "en" ? "No" : "Hayır";
    return "";
  }

  function rememberVisibility(row, learnWrap) {
    learnWrap.hidden = !row.learn;
  }

  function render(snippets) {
    listNode.replaceChildren();
    if (!rows.length) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "Bu sayfada doldurulacak kutu görünmedi.";
      listNode.append(empty);
      updateSummary();
      updateFillButton();
      return;
    }

    for (const row of rows) {
      const article = document.createElement("article");
      article.className = `row ${row.match.status}`;

      const head = document.createElement("label");
      head.className = "row-head";
      const box = document.createElement("input");
      box.type = "checkbox";
      box.checked = row.checked;
      box.disabled = row.field.unsupported;
      const title = document.createElement("span");
      title.className = "q";
      title.textContent = row.field.label || "(etiketsiz kutu)";
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = badgeText(row);
      head.append(box, title, badge);

      const editor = createEditor(row);
      const reason = document.createElement("p");
      reason.className = "hint";
      reason.textContent = row.match.reason || "";

      const learnWrap = document.createElement("label");
      learnWrap.className = "learn";
      const learnBox = document.createElement("input");
      learnBox.type = "checkbox";
      learnBox.checked = row.learn;
      const learnText = document.createElement("span");
      learnText.textContent = "Bu soruyu cevap bankasına kaydet";
      learnWrap.append(learnBox, learnText);
      rememberVisibility(row, learnWrap);

      if (editor) {
        editor.addEventListener("input", () => applyDraft(row, editor.value, box, learnWrap));
        editor.addEventListener("change", () => applyDraft(row, editor.value, box, learnWrap));
      }

      box.addEventListener("change", () => {
        row.checked = box.checked;
        row.userUnchecked = !box.checked;
        updateSummary();
        updateFillButton();
      });

      learnBox.addEventListener("change", () => {
        row.learn = learnBox.checked;
      });

      article.append(head);
      if (editor) article.append(editor);

      if (row.field.kind === "textarea" && snippets.length && !row.field.unsupported) {
        article.append(snippetPicker(row, snippets, editor, box, learnWrap));
      }
      if (row.field.currentValue) {
        const current = document.createElement("p");
        current.className = "hint";
        current.textContent = "Sayfada şu an: " + row.field.currentValue;
        article.append(current);
      }
      if (reason.textContent) article.append(reason);
      const editHint = document.createElement("p");
      editHint.className = "hint";
      editHint.hidden = !(row.edited && row.match.source === "profile");
      editHint.textContent = "Bu değişiklik yalnızca bu forma gider. Kalıcıysa profilde güncelle.";
      article.append(editHint);
      row.editHint = editHint;
      if (!row.field.unsupported) article.append(learnWrap);
      listNode.append(article);
    }

    updateSummary();
    updateFillButton();
  }

  function applyDraft(row, value, box, learnWrap) {
    if (value !== row.originalDraft) {
      row.edited = true;
      row.learn = true;
      const learnBox = learnWrap.querySelector("input");
      if (learnBox) learnBox.checked = true;
      learnWrap.hidden = false;
    }
    row.draft = value;
    if (row.editHint) row.editHint.hidden = !(row.edited && row.match.source === "profile");
    if (row.match.status === "empty" && value.trim() && !row.userUnchecked) {
      row.checked = true;
      box.checked = true;
    }
    updateSummary();
    updateFillButton();
  }

  function createEditor(row) {
    if (row.field.unsupported) return null;

    if (row.field.kind === "checkbox") {
      const yes = chosenLang === "en" ? "Yes" : "Evet";
      const no = chosenLang === "en" ? "No" : "Hayır";
      const select = document.createElement("select");
      [["", "Boş"], [yes, yes], [no, no]].forEach(([value, text]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = text;
        select.append(option);
      });
      select.value = yesNo(row.draft);
      row.draft = select.value;
      return select;
    }

    if ((row.field.kind === "select" || row.field.kind === "radio") && row.field.options.length) {
      const select = document.createElement("select");
      const blank = document.createElement("option");
      blank.value = "";
      blank.textContent = "Seçme";
      select.append(blank);
      const seen = new Set([""]);
      for (const option of row.field.options) {
        const text = (option.text || option.value || "").trim();
        if (!text || seen.has(text)) continue;
        seen.add(text);
        const node = document.createElement("option");
        node.value = text;
        node.textContent = text;
        select.append(node);
      }
      if (row.draft && !seen.has(row.draft)) {
        const extra = document.createElement("option");
        extra.value = row.draft;
        extra.textContent = row.draft;
        select.append(extra);
      }
      select.value = row.draft;
      return select;
    }

    const multiline = row.field.kind === "textarea";
    const input = document.createElement(multiline ? "textarea" : "input");
    if (!multiline) input.type = "text";
    if (multiline) input.rows = 4;
    input.value = row.draft;
    return input;
  }

  function snippetPicker(row, snippets, editor, box, learnWrap) {
    const select = document.createElement("select");
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "Paragraf seç";
    select.append(blank);
    snippets.forEach((snippet, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = snippet.title || "Adsız paragraf";
      select.append(option);
    });
    select.addEventListener("change", () => {
      const snippet = snippets[Number(select.value)];
      if (!snippet) return;
      editor.value = snippet.body;
      applyDraft(row, snippet.body, box, learnWrap);
      row.checked = true;
      box.checked = true;
      updateSummary();
      updateFillButton();
    });
    return select;
  }

  function friendly(error) {
    const message = String((error && error.message) || error);
    if (/user gesture/i.test(message)) {
      return "İzin penceresi açılamadı. Tara'ya yeniden bas.";
    }
    if (/Cannot access|cannot be scripted|The extensions gallery cannot be scripted/i.test(message)) {
      return "Bu siteye izin yok. Tara'ya basıp açılan pencerede İzin ver'i seç.";
    }
    return message;
  }

  function originPattern(url) {
    if (!url || !/^https?:/i.test(url)) return null;
    return new URL(url).origin + "/*";
  }

  async function ensureOrigin(tab) {
    const pattern = originPattern(tab.url);
    if (!pattern) {
      if (!tab.url) throw new Error("Sekme adresi okunamadı. Başvuru sekmesine geçip yeniden dene.");
      return;
    }
    if (await chrome.permissions.contains({ origins: [pattern] })) return;
    let granted = false;
    try {
      granted = await chrome.permissions.request({ origins: [pattern] });
    } catch (error) {
      throw new Error(friendly(error));
    }
    if (!granted) {
      throw new Error("Bu site için izin verilmedi. Yeniden basıp pencerede İzin ver'i seç.");
    }
  }

  async function activeTab() {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    }
    if (!tab || tab.id === undefined) throw new Error("Aktif sekme bulunamadı.");
    if (tab.url && !/^https?:/i.test(tab.url)) {
      throw new Error("Bu sayfada çalışmaz. Başvuru formunun açık olduğu site sekmesine geç.");
    }
    return tab;
  }

  async function scan(tab) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: INJECT_FILES
    });
    const [injected] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => globalThis.Basvuru.scan()
    });
    return injected && injected.result ? injected.result : [];
  }

  async function write(tab, instructions) {
    const [injected] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (items) => globalThis.Basvuru.fill(items),
      args: [instructions]
    });
    return (injected && injected.result) || [];
  }

  function toRow(field, match) {
    return {
      field,
      match,
      draft: match.value || "",
      originalDraft: match.value || "",
      checked: match.status === "fill" && !field.currentValue && !field.unsupported,
      learn: match.status !== "fill",
      edited: false,
      userUnchecked: false
    };
  }

  async function remember(selected) {
    const state = await Basvuru.loadState();
    let changed = false;
    for (const row of selected) {
      if (!row.learn || !row.draft.trim()) continue;
      if (!row.edited && (row.match.source === "profile" || row.match.source === "answer")) continue;
      const questionOriginal = (row.field.label || "").slice(0, 300);
      const questionNorm = Basvuru.normalize(questionOriginal);
      if (!questionNorm) continue;
      const existing = state.answers.find((answer) => answer.questionNorm === questionNorm);
      if (existing) {
        existing.answer = row.draft.trim();
        existing.questionOriginal = questionOriginal;
        existing.updatedAt = Date.now();
      } else {
        state.answers.push({
          id: crypto.randomUUID(),
          questionNorm,
          questionOriginal,
          answer: row.draft.trim(),
          updatedAt: Date.now()
        });
      }
      changed = true;
    }
    if (changed) await Basvuru.saveState(state);
  }

  function snippetsFor(snippets) {
    return (snippets || []).filter((snippet) => !snippet.lang || snippet.lang === chosenLang);
  }

  function showLanguage() {
    const visible = scannedFields.length > 0;
    langBar.hidden = !visible;
    if (!visible) return;
    langLabel.textContent = chosenLang === "en" ? "Bu form: İngilizce" : "Bu form: Türkçe";
    useTr.classList.toggle("selected", chosenLang === "tr");
    useEn.classList.toggle("selected", chosenLang === "en");
  }

  function profileEmpty(profile) {
    return Basvuru.PROFILE_FIELDS.every((field) => {
      if (field.choice === "multi") return !(profile[field.key] || []).length;
      if (field.choice === "single") return !profile[field.key];
      if (field.bilingual) {
        const pair = Basvuru.pairValue(profile[field.key]);
        return !pair.tr && !pair.en;
      }
      return !Basvuru.profileValue(profile, field.key, "tr");
    });
  }

  function rematch() {
    if (!formState) return;
    rows = scannedFields.map((field) => toRow(field, Basvuru.matchField(field, formState, chosenLang)));
    render(snippetsFor(formState.snippets));
    showLanguage();
  }

  optionsButton.addEventListener("click", () => chrome.runtime.openOptionsPage());

  useTr.addEventListener("click", () => {
    if (chosenLang === "tr" || !scannedFields.length) return;
    chosenLang = "tr";
    rematch();
    setStatus("Türkçe profil kullanılıyor.");
  });

  useEn.addEventListener("click", () => {
    if (chosenLang === "en" || !scannedFields.length) return;
    chosenLang = "en";
    rematch();
    setStatus("İngilizce profil kullanılıyor.");
  });

  scanButton.addEventListener("click", async () => {
    busy = true;
    scanButton.disabled = true;
    updateFillButton();
    setStatus("Site izni kontrol ediliyor…");
    try {
      const tab = await activeTab();
      await ensureOrigin(tab);
      setStatus("Form okunuyor…");
      const state = await Basvuru.loadState();
      const scanned = await scan(tab);
      const fields = Array.isArray(scanned) ? scanned : (scanned && scanned.fields) || [];
      const pageLang = Array.isArray(scanned) ? "" : (scanned && scanned.lang) || "";
      formState = state;
      scannedFields = fields;
      chosenLang = Basvuru.detectLang(pageLang, fields);
      rematch();
      if (!fields.length) {
        langBar.hidden = true;
        setStatus("Bu sayfada doldurulacak kutu yok.");
      } else if (profileEmpty(state.profile) && !state.answers.length) setStatus("Profil boş. Önce Profil'den bilgilerini kaydet.");
      else setStatus("İşaretli kutular yazılacak. Tahminleri kontrol et.");
    } catch (error) {
      rows = [];
      scannedFields = [];
      formState = null;
      langBar.hidden = true;
      listNode.replaceChildren();
      summaryNode.hidden = true;
      setStatus(friendly(error));
    } finally {
      busy = false;
      scanButton.disabled = false;
      updateFillButton();
    }
  });

  fillButton.addEventListener("click", async () => {
    const selected = rows.filter((row) => row.checked && row.draft.trim() && !row.field.unsupported);
    if (!selected.length) return;
    busy = true;
    scanButton.disabled = true;
    updateFillButton();
    setStatus("Site izni kontrol ediliyor…");
    try {
      const tab = await activeTab();
      await ensureOrigin(tab);
      setStatus("Kutular yazılıyor…");
      const results = await write(tab, selected.map((row) => ({
        id: row.field.id,
        kind: row.field.kind,
        value: row.draft
      })));
      const failed = results.filter((result) => !result.ok);
      const okIds = new Set(results.filter((result) => result.ok).map((result) => result.id));
      await remember(selected.filter((row) => okIds.has(row.field.id)));
      if (!failed.length) setStatus(`${okIds.size} kutu dolduruldu.`);
      else setStatus(`${okIds.size} kutu dolduruldu. ${failed.length} kutu yazılamadı: ${failed[0].message}`);
    } catch (error) {
      setStatus(friendly(error));
    } finally {
      busy = false;
      scanButton.disabled = false;
      updateFillButton();
    }
  });
})();
