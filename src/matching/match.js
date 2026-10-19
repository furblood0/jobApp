(function (root) {
  const Basvuru = root.Basvuru || (root.Basvuru = {});

  const STOP = new Set([
    "ve", "ile", "bir", "bu", "su", "icin", "the", "and", "your", "you", "for", "are",
    "our", "nedir", "misiniz", "misin", "mi", "mu", "ne", "how", "what", "please", "of", "to", "in",
    "lutfen", "any", "do", "does", "have", "has", "this", "that"
  ]);

  function blank(partial) {
    return {
      status: "empty",
      source: null,
      value: "",
      profileKey: null,
      reason: "",
      ...partial
    };
  }

  function significant(text) {
    return Basvuru.normalize(text)
      .split(" ")
      .filter((token) => token.length > 1 && !STOP.has(token));
  }

  function valueFits(field, value) {
    const trimmed = String(value || "").trim();
    if (field.inputType === "number") return /^-?\d+([.,]\d+)?$/.test(trimmed);
    if (field.inputType === "date") return /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
    if (field.inputType === "email") return trimmed.includes("@");
    if (field.inputType === "url") return /^https?:\/\//i.test(trimmed);
    return true;
  }

  function adaptToControl(field, result) {
    if (field.kind === "checkbox") {
      const state = Basvuru.checkboxState(result.value);
      if (state === null) {
        return blank({
          ...result,
          status: "ask",
          reason: "Bu onay kutusu için evet ya da hayır gerekli"
        });
      }
      return blank({ ...result, value: state ? "Evet" : "Hayır" });
    }

    if (field.kind !== "select" && field.kind !== "radio") {
      if (!valueFits(field, result.value)) {
        return blank({
          ...result,
          status: "ask",
          reason: "Değer bu kutunun biçimine uymuyor"
        });
      }
      return result;
    }

    const option = Basvuru.pickOption(field.options, result.value);
    if (!option) {
      return blank({
        ...result,
        status: "ask",
        reason: "Seçeneklerde birebir karşılığı yok"
      });
    }
    return blank({ ...result, value: option.text || option.value });
  }

  function adaptChoices(control, result, prefer) {
    const values = result.values || [result.value];
    if (control.kind !== "select" && control.kind !== "radio") {
      return adaptToControl(control, { ...result, value: values.join(", ") });
    }
    const matches = [];
    values.forEach((value) => {
      const option = Basvuru.pickOption(control.options, value);
      const text = option && (option.text || option.value);
      if (option && !matches.some((item) => (item.text || item.value) === text)) matches.push(option);
    });
    if (!matches.length) {
      return blank({ ...result, status: "ask", reason: "Seçeneklerde birebir karşılığı yok" });
    }
    const chosen = prefer === "highest" ? matches[matches.length - 1] : matches[0];
    if (matches.length > 1 && prefer !== "highest") {
      return blank({
        ...result,
        status: "ask",
        value: chosen.text || chosen.value,
        reason: "Birden fazla seçenek uyuyor"
      });
    }
    return blank({ ...result, status: "fill", value: chosen.text || chosen.value });
  }

  function fromProfile(field, key, profile, lang) {
    const text = Basvuru.profileText(profile, key, lang);
    if (!text.value) return null;
    const note = text.fallback ? " · diğer dil" : "";
    const result = blank({
      status: "fill",
      source: "profile",
      profileKey: key,
      value: text.value,
      values: text.values || [text.value],
      reason: "Profil · " + Basvuru.profileLabel(key) + note
    });
    if ((text.values || []).length > 1 || text.prefer) return adaptChoices(field, result, text.prefer);
    return adaptToControl(field, result);
  }

  function bestGuess(normLabel, answers) {
    const left = significant(normLabel);
    if (!left.length) return null;
    let best = null;
    let bestScore = 0;
    for (const answer of answers) {
      if (answer.questionNorm === normLabel) continue;
      const right = significant(answer.questionNorm);
      const shared = left.filter((token) => right.includes(token));
      if (!shared.length) continue;
      const score = shared.length / Math.max(left.length, right.length);
      const strong = shared.length >= 2 && score >= 0.5;
      const distinctive = shared.length === 1 && shared[0].length >= 6 && score >= 0.34;
      if ((strong || distinctive) && score > bestScore) {
        best = answer;
        bestScore = score;
      }
    }
    return best;
  }

  function bestSnippet(field, snippets, lang) {
    const label = Basvuru.normalize(field.label);
    const left = significant(field.label);
    let best = null;
    let bestScore = 0;
    for (const snippet of snippets) {
      if (snippet.lang && snippet.lang !== lang) continue;
      const tagHit = (snippet.tags || []).some((tag) => {
        const normalized = Basvuru.normalize(tag);
        return normalized && Basvuru.containsPhrase(label, normalized);
      });
      const languageBonus = snippet.lang === lang ? 1 : 0;
      if (tagHit) {
        const score = 1 + languageBonus;
        if (score > bestScore) {
          best = snippet;
          bestScore = score;
        }
        continue;
      }
      const right = significant(`${snippet.title || ""} ${(snippet.tags || []).join(" ")}`);
      const shared = left.filter((token) => right.includes(token));
      if (!shared.length) continue;
      const score = shared.length / Math.max(left.length, 1) + languageBonus;
      if (score > bestScore) {
        best = snippet;
        bestScore = score;
      }
    }
    return bestScore >= 0.4 ? best : null;
  }

  Basvuru.matchField = function (field, state, lang) {
    const language = lang === "en" ? "en" : "tr";
    if (field.unsupported) {
      return blank({ reason: "Çoklu seçim elle işaretlenir" });
    }

    const profile = state.profile || {};
    const answers = state.answers || [];
    const snippets = state.snippets || [];
    const haystack = Basvuru.normalize(
      [field.label, field.name, field.placeholder, field.inputMode].filter(Boolean).join(" ")
    );

    let recognizedKey = null;
    if (field.kind !== "textarea") {
      const autoKey = Basvuru.autocompleteKey(field.autocomplete);
      if (autoKey) {
        recognizedKey = autoKey;
        const decided = fromProfile(field, autoKey, profile, language);
        if (decided) return decided;
      }

      const synonymKey = Basvuru.bestSynonym(haystack);
      if (synonymKey) {
        recognizedKey = recognizedKey || synonymKey;
        const decided = fromProfile(field, synonymKey, profile, language);
        if (decided) return decided;
      }
    }

    const normLabel = Basvuru.normalize(field.label);
    if (normLabel) {
      const exact = answers.find((answer) => answer.questionNorm === normLabel);
      if (exact) {
        return adaptToControl(field, blank({
          status: "fill",
          source: "answer",
          value: exact.answer,
          reason: "Cevap bankasındaki soruyla aynı"
        }));
      }

      const guess = bestGuess(normLabel, answers);
      if (guess) {
        return adaptToControl(field, blank({
          status: "ask",
          source: "guess",
          value: guess.answer,
          reason: "Benzer soru: " + guess.questionOriginal
        }));
      }
    }

    if (field.kind === "textarea") {
      const snippet = bestSnippet(field, snippets, language);
      if (snippet) {
        return blank({
          status: "ask",
          source: "snippet",
          value: snippet.body,
          reason: "Paragraf: " + (snippet.title || "adsız")
        });
      }
    }

    if (recognizedKey) {
      return blank({
        source: "profile",
        profileKey: recognizedKey,
        reason: "Profilde boş: " + Basvuru.profileLabel(recognizedKey)
      });
    }

    return blank({ reason: "Kayıtlı cevap yok" });
  };
})(globalThis);
