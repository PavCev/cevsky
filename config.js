/*
  CEVSKY.PL — ustawienia strony
  Harmonogram jest pobierany automatycznie z Google Sheets.
*/

const SITE_CONFIG = {
  channelName: "Cevsky",
  youtubeUrl: "https://www.youtube.com/@Cevsky",

  // Opublikowany arkusz "Harmonogram" jako CSV:
  sheetCsvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSo5zs1HPZBwgl8Rvrfoc5pR0Vr7KvdnMG_4dJfxImRjlJwh5sW9bTDkC2QANB8O8WodVlmJE0uk8p3/pub?gid=142894889&single=true&output=csv",

  // Co ile minut strona ma ponownie sprawdzić arkusz.
  refreshMinutes: 2,

  // 0 = pokazuj dzisiejszy dzień i przyszłość.
  keepPastDays: 0
};
