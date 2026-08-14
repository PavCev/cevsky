/*
  ================================================================
  CEVSKY.PL — HARMONOGRAM
  ================================================================

  TO JEST GŁÓWNY PLIK, KTÓRY BĘDZIESZ EDYTOWAŁ.

  Każdy materiał ma:
    date      data: "YYYY-MM-DD"
    time      godzina: "HH:MM"
    type      "film", "premiera" albo "live"
    title     tytuł widoczny na stronie
    subtitle  krótki opis (opcjonalnie)
    url       link do filmu / premiery / live
    thumbnail własna miniatura (opcjonalnie)

  WAŻNE:
  Jeżeli w "url" wkleisz zwykły link do filmu YouTube,
  strona AUTOMATYCZNIE pobierze jego miniaturę.
  Nie musisz wtedy wypełniać pola "thumbnail".
*/

const SCHEDULE = [
  {
    date: "2026-08-14",
    time: "18:00",
    type: "film",
    title: "Chop Chop Inc – rozwijamy tartak #4",
    subtitle: "Nowy odcinek gameplayu",
    url: "",
    thumbnail: ""
  },

  {
    date: "2026-08-15",
    time: "10:00",
    type: "premiera",
    title: "Nowa gra – pierwsze wrażenia",
    subtitle: "Premiera na kanale",
    url: "",
    thumbnail: ""
  },

  {
    date: "2026-08-15",
    time: "18:00",
    type: "film",
    title: "Dead Weight – kolejny odcinek",
    subtitle: "Gameplay",
    url: "",
    thumbnail: ""
  },

  {
    date: "2026-08-16",
    time: "12:00",
    type: "live",
    title: "Conan Exiles – LIVE",
    subtitle: "Transmisja na żywo",
    url: "",
    thumbnail: ""
  },

  {
    date: "2026-08-17",
    time: "18:00",
    type: "film",
    title: "The Alters – dalszy ciąg historii",
    subtitle: "Gameplay",
    url: "",
    thumbnail: ""
  }
];
