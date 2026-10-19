const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const sandbox = {};
for (const file of [
  "src/storage/schema.js",
  "src/matching/normalize.js",
  "src/matching/synonyms.js",
  "src/matching/pick.js",
  "src/matching/match.js"
]) {
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), sandbox, { filename: file });
}

const Basvuru = sandbox.Basvuru;
assert.ok(Basvuru, "eşleştirme kodu yüklenemedi");

function field(partial) {
  return {
    id: "b1",
    kind: "text",
    label: "",
    autocomplete: "",
    name: "",
    placeholder: "",
    inputType: "text",
    inputMode: "",
    required: false,
    unsupported: false,
    options: [],
    currentValue: "",
    ...partial
  };
}

const profile = {
  ...Basvuru.emptyProfile(),
  firstName: "Ayşe",
  lastName: "Yılmaz",
  email: "ayse@ornek.dev",
  phone: "5551112233",
  city: "İstanbul",
  relocation: "Evet",
  salary: "120000"
};

assert.equal(Basvuru.normalize("İstanbul"), "istanbul");
assert.equal(Basvuru.normalize("E-posta"), "e posta");

const first = Basvuru.matchField(field({ label: "Adınız" }), { profile, answers: [], snippets: [] });
assert.equal(first.status, "fill");
assert.equal(first.value, "Ayşe");

const full = Basvuru.matchField(field({ label: "Adınız Soyadınız" }), { profile, answers: [], snippets: [] });
assert.equal(full.status, "fill");
assert.equal(full.value, "Ayşe Yılmaz");
assert.equal(full.profileKey, "fullName");

const combined = Basvuru.matchField(field({ label: "İsim Soyisim" }), { profile, answers: [], snippets: [] });
assert.equal(combined.profileKey, "fullName");
assert.equal(combined.value, "Ayşe Yılmaz");

const given = Basvuru.matchField(field({ label: "First name" }), { profile, answers: [], snippets: [] });
assert.equal(given.value, "Ayşe");
assert.equal(given.profileKey, "firstName");

const named = Basvuru.matchField(field({ label: "Name" }), { profile, answers: [], snippets: [] });
assert.equal(named.profileKey, "fullName");
assert.equal(named.value, "Ayşe Yılmaz");

const mail = Basvuru.matchField(field({
  label: "Contact",
  autocomplete: "email",
  inputType: "email"
}), { profile, answers: [], snippets: [] });
assert.equal(mail.value, "ayse@ornek.dev");

const emptyPhone = Basvuru.matchField(field({ label: "Telefon" }), {
  profile: { ...profile, phone: "" },
  answers: [],
  snippets: []
});
assert.equal(emptyPhone.status, "empty");
assert.match(emptyPhone.reason, /Profilde boş/);

const bank = Basvuru.matchField(field({ label: "Ehliyetiniz var mı?" }), {
  profile,
  answers: [{
    questionNorm: Basvuru.normalize("Ehliyetiniz var mı?"),
    questionOriginal: "Ehliyetiniz var mı?",
    answer: "B sınıfı"
  }],
  snippets: []
});
assert.equal(bank.status, "fill");
assert.equal(bank.source, "answer");
assert.equal(bank.value, "B sınıfı");

const profileWins = Basvuru.matchField(field({ label: "Email", inputType: "email" }), {
  profile,
  answers: [{
    questionNorm: "email",
    questionOriginal: "Email",
    answer: "baska@ornek.dev"
  }],
  snippets: []
});
assert.equal(profileWins.value, "ayse@ornek.dev");
assert.equal(profileWins.source, "profile");

const guess = Basvuru.matchField(field({ label: "Expected salary" }), {
  profile: Basvuru.emptyProfile(),
  answers: [{
    questionNorm: Basvuru.normalize("Salary expectation"),
    questionOriginal: "Salary expectation",
    answer: "90000"
  }],
  snippets: []
});
assert.equal(guess.status, "ask");
assert.equal(guess.source, "guess");
assert.equal(guess.value, "90000");

const unknown = Basvuru.matchField(field({ label: "Referans kodunuz" }), {
  profile,
  answers: [],
  snippets: []
});
assert.equal(unknown.status, "empty");
assert.equal(unknown.value, "");

const paragraph = Basvuru.matchField(field({
  kind: "textarea",
  label: "Why do you want this role?"
}), {
  profile,
  answers: [],
  snippets: [{ title: "Motivasyon", tags: ["why", "motivasyon"], body: "Kısa bir gerekçe." }]
});
assert.equal(paragraph.status, "ask");
assert.equal(paragraph.source, "snippet");
assert.equal(paragraph.value, "Kısa bir gerekçe.");

const notInTextarea = Basvuru.matchField(field({ kind: "textarea", label: "Telefon" }), {
  profile,
  answers: [],
  snippets: []
});
assert.equal(notInTextarea.value, "");
assert.notEqual(notInTextarea.source, "profile");

const city = Basvuru.matchField(field({
  kind: "select",
  label: "Şehir",
  options: [
    { value: "06", text: "Ankara" },
    { value: "34", text: "İstanbul" }
  ]
}), { profile, answers: [], snippets: [] });
assert.equal(city.status, "fill");
assert.equal(city.value, "İstanbul");

const box = Basvuru.matchField(field({ kind: "checkbox", label: "Relocation" }), {
  profile,
  answers: [],
  snippets: []
}, "tr");
assert.equal(box.status, "fill");
assert.equal(box.value, "Evet");

const bilingual = {
  ...Basvuru.emptyProfile(),
  country: { tr: "Türkiye", en: "Turkey" },
  title: { tr: "Geliştirici", en: "" }
};
assert.equal(Basvuru.matchField(field({ label: "Country" }), { profile: bilingual, answers: [], snippets: [] }, "en").value, "Turkey");
assert.equal(Basvuru.matchField(field({ label: "Ülke" }), { profile: bilingual, answers: [], snippets: [] }, "tr").value, "Türkiye");
const fallback = Basvuru.matchField(field({ label: "Job title" }), { profile: bilingual, answers: [], snippets: [] }, "en");
assert.equal(fallback.value, "Geliştirici");
assert.match(fallback.reason, /diğer dil/);

assert.equal(Basvuru.detectLang("en-US", []), "en");
assert.equal(Basvuru.detectLang("", [{ label: "First name" }, { label: "Email" }]), "en");
assert.equal(Basvuru.detectLang("", [{ label: "Adınız" }, { label: "Telefon" }]), "tr");

const onlyTurkish = Basvuru.matchField(field({ kind: "textarea", label: "Why do you want this role?" }), {
  profile,
  answers: [],
  snippets: [{ title: "Motivasyon", lang: "tr", tags: ["why"], body: "Türkçe gerekçe." }]
}, "en");
assert.equal(onlyTurkish.value, "");

const englishParagraph = Basvuru.matchField(field({ kind: "textarea", label: "Why do you want this role?" }), {
  profile,
  answers: [],
  snippets: [
    { title: "Motivasyon", lang: "tr", tags: ["why"], body: "Türkçe gerekçe." },
    { title: "Motivation", lang: "en", tags: ["why"], body: "English reason." }
  ]
}, "en");
assert.equal(englishParagraph.value, "English reason.");

assert.equal(Basvuru.pickOption([{ value: "1", text: "Yes" }], "Evet").text, "Yes");

const multi = Basvuru.matchField(field({ kind: "select", unsupported: true, label: "Beceriler" }), {
  profile,
  answers: [],
  snippets: []
});
assert.equal(multi.status, "empty");
assert.match(multi.reason, /Çoklu seçim/);

const work = Basvuru.matchField(field({
  kind: "select",
  label: "Work preference",
  options: [
    { value: "remote", text: "Remote" },
    { value: "hybrid", text: "Hybrid" }
  ]
}), {
  profile: { ...Basvuru.emptyProfile(), workPreference: ["remote", "hybrid"] },
  answers: [],
  snippets: []
}, "en");
assert.equal(work.status, "ask");
assert.equal(work.value, "Remote");

const onlyRemote = Basvuru.matchField(field({
  kind: "select",
  label: "Work preference",
  options: [{ value: "remote", text: "Remote" }, { value: "office", text: "On-site" }]
}), {
  profile: { ...Basvuru.emptyProfile(), workPreference: ["remote"] },
  answers: [],
  snippets: []
}, "en");
assert.equal(onlyRemote.status, "fill");
assert.equal(onlyRemote.value, "Remote");

const degree = Basvuru.matchField(field({
  kind: "select",
  label: "Degree",
  options: [
    { value: "bs", text: "Bachelor's" },
    { value: "ms", text: "Master's" }
  ]
}), {
  profile: { ...Basvuru.emptyProfile(), degree: ["bachelor", "master"] },
  answers: [],
  snippets: []
}, "en");
assert.equal(degree.status, "fill");
assert.equal(degree.value, "Master's");
