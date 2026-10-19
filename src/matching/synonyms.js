(function (root) {
  const Basvuru = root.Basvuru || (root.Basvuru = {});

  Basvuru.SYNONYMS = {
    firstName: ["first name", "given name", "adiniz", "isminiz", "adin", "isim", "ad"],
    lastName: ["last name", "surname", "family name", "soyad", "soyadiniz", "soyisim", "soy isim"],
    fullName: ["full name", "ad soyad", "adiniz soyadiniz", "isim soyisim", "name surname", "your name", "name"],
    email: ["e-mail", "email", "e posta", "eposta", "mail"],
    phone: ["phone number", "mobile number", "cep telefonu", "telefon", "telephone", "mobile", "phone", "gsm", "tel"],
    city: ["city", "sehir", "il"],
    country: ["country", "ulke"],
    linkedin: ["linkedin"],
    github: ["github"],
    website: ["personal website", "web sitesi", "website", "portfolio", "portfolyo", "kisisel site"],
    title: ["current title", "job title", "mevcut unvan", "unvan", "pozisyon", "title"],
    yearsExperience: ["years of experience", "deneyim yili", "tecrube yili", "kac yil"],
    school: ["university", "college", "universite", "okul", "school"],
    degree: ["egitim duzeyi", "degree", "derece", "diploma"],
    fieldOfStudy: ["field of study", "major", "bolum"],
    graduationYear: ["graduation year", "mezuniyet yili", "mezuniyet", "graduation"],
    salary: ["expected salary", "salary expectation", "maas beklentisi", "ucret beklentisi", "salary", "compensation", "maas", "ucret"],
    noticePeriod: ["ne zaman baslayabilirsiniz", "notice period", "ihbar suresi", "baslangic tarihi", "earliest start", "availability"],
    workPreference: ["calisma tercihi", "work preference", "remote", "uzaktan", "hybrid", "hibrit"],
    relocation: ["sehir degisikligi", "willing to relocate", "relocation", "relocate", "tasinma"]
  };

  Basvuru.AUTOCOMPLETE = {
    "given-name": "firstName",
    "additional-name": "firstName",
    "family-name": "lastName",
    name: "fullName",
    nickname: "firstName",
    email: "email",
    tel: "phone",
    "tel-national": "phone",
    "tel-local": "phone",
    country: "country",
    "country-name": "country",
    "address-level1": "city",
    "address-level2": "city",
    url: "website",
    "organization-title": "title"
  };

  Basvuru.autocompleteKey = function (value) {
    const parts = String(value || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!parts.length) return null;
    return Basvuru.AUTOCOMPLETE[parts[parts.length - 1]] || null;
  };

  Basvuru.bestSynonym = function (haystack) {
    let bestKey = null;
    let bestLength = 0;
    for (const [key, phrases] of Object.entries(Basvuru.SYNONYMS)) {
      for (const phrase of phrases) {
        if (!Basvuru.containsPhrase(haystack, phrase)) continue;
        const length = Basvuru.normalize(phrase).length;
        if (length > bestLength) {
          bestKey = key;
          bestLength = length;
        }
      }
    }
    return bestKey;
  };
})(globalThis);
