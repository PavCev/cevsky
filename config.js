/*
  CEVSKY.PL — Google Sheets v3.3
*/

const SITE_CONFIG = {
  channelName: "Cevsky",
  youtubeUrl: "https://www.youtube.com/@Cevsky",

  sheetId: "1LfXGq0jA0XW0Sx-JOVaYwT7dlaALyqu4Lv0rWqrDsmk",
  sheetGid: "142894889",

  // Co ile minut ponownie pobrać dane z Google Sheets.
  refreshMinutes: 1,

  // 0 = pokazuj dzisiejszy dzień i przyszłość.
  keepPastDays: 0,

  // Pokazuj wyłącznie 14 dni: dzisiaj + 13 kolejnych dni.
  displayDays: 14,

  // Tekst na przycisku, jeśli w arkuszu podasz link do playlisty / serii.
  seriesButtonText: "Seria ↗"
};
