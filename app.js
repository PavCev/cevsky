(() => {
  "use strict";

  const PL_DAYS = [
    "Niedziela","Poniedziałek","Wtorek","Środa",
    "Czwartek","Piątek","Sobota"
  ];

  const PL_MONTHS = [
    "stycznia","lutego","marca","kwietnia","maja","czerwca",
    "lipca","sierpnia","września","października","listopada","grudnia"
  ];

  const TYPE_LABELS = {
    film:"▶ FILM",
    premiera:"◆ PREMIERA",
    live:"● LIVE"
  };

  let countdownTimer = null;

  function startOfToday() {
    const d = new Date();
    d.setHours(0,0,0,0);
    return d;
  }

  function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  function pad2(v) {
    return String(v).padStart(2,"0");
  }

  function dateToYMD(d) {
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  }

  function normalizeDate(value, formatted) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return dateToYMD(value);
    }

    const raw = String(formatted || value || "").trim();

    let m = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) return `${m[1]}-${pad2(m[2])}-${pad2(m[3])}`;

    m = raw.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/);
    if (m) return `${m[3]}-${pad2(m[2])}-${pad2(m[1])}`;

    return raw;
  }

  function normalizeTime(value, formatted) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return `${pad2(value.getHours())}:${pad2(value.getMinutes())}`;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      const totalMinutes = Math.round(value * 24 * 60);
      return `${pad2(Math.floor(totalMinutes / 60) % 24)}:${pad2(totalMinutes % 60)}`;
    }

    const raw = String(formatted || value || "").trim();
    const m = raw.match(/(\d{1,2}):(\d{2})/);
    if (m) return `${pad2(m[1])}:${m[2]}`;

    return raw;
  }

  function parseDateTime(dateStr, timeStr="00:00") {
    const dm = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const tm = String(timeStr).match(/^(\d{1,2}):(\d{2})$/);
    if (!dm || !tm) return new Date(NaN);

    return new Date(
      Number(dm[1]),
      Number(dm[2]) - 1,
      Number(dm[3]),
      Number(tm[1]),
      Number(tm[2]),
      0, 0
    );
  }

  function formatDate(dateStr) {
    const d = parseDateTime(dateStr);
    return {
      dayName: PL_DAYS[d.getDay()],
      fullDate: `${d.getDate()} ${PL_MONTHS[d.getMonth()]}`
    };
  }

  function normalizeHeader(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function findColumn(table, names) {
    const list = Array.isArray(names) ? names : [names];
    for (let c = 0; c < table.getNumberOfColumns(); c++) {
      const label = normalizeHeader(table.getColumnLabel(c));
      if (list.some(name => normalizeHeader(name) === label)) {
        return c;
      }
    }
    return -1;
  }

  function getCell(table, row, col) {
    if (col < 0) return { value:"", formatted:"" };
    return {
      value: table.getValue(row,col),
      formatted: table.getFormattedValue(row,col)
    };
  }

  function tableToEvents(table) {
    const cols = {
      date: findColumn(table,"Data"),
      time: findColumn(table,"Godzina"),
      type: findColumn(table,"Typ"),
      title: findColumn(table,"Tytuł"),
      subtitle: findColumn(table,"Opis"),
      // obsługa starej i nowej nazwy kolumny:
      seriesUrl: findColumn(table,["Link serii","Link playlisty","Link YouTube","Link"]),
      thumbnail: findColumn(table,"Miniatura"),
      active: findColumn(table,"Aktywne")
    };

    if (cols.date < 0 || cols.time < 0 || cols.title < 0) {
      throw new Error("Brakuje wymaganych kolumn: Data, Godzina lub Tytuł.");
    }

    const events = [];

    for (let r = 0; r < table.getNumberOfRows(); r++) {
      const dateCell = getCell(table,r,cols.date);
      const timeCell = getCell(table,r,cols.time);

      const date = normalizeDate(dateCell.value,dateCell.formatted);
      const time = normalizeTime(timeCell.value,timeCell.formatted);

      const title = String(getCell(table,r,cols.title).formatted || getCell(table,r,cols.title).value || "").trim();
      const type = String(getCell(table,r,cols.type).formatted || getCell(table,r,cols.type).value || "").trim().toLowerCase();
      const subtitle = String(getCell(table,r,cols.subtitle).formatted || getCell(table,r,cols.subtitle).value || "").trim();
      const seriesUrl = String(getCell(table,r,cols.seriesUrl).formatted || getCell(table,r,cols.seriesUrl).value || "").trim();
      const thumbnail = String(getCell(table,r,cols.thumbnail).formatted || getCell(table,r,cols.thumbnail).value || "").trim();
      const active = String(getCell(table,r,cols.active).formatted || getCell(table,r,cols.active).value || "").trim().toUpperCase();

      if (!date || !time || !title) continue;
      if (active && !["TAK","TRUE","1","YES","Y"].includes(active)) continue;

      events.push({
        date, time, type, title, subtitle, seriesUrl, thumbnail
      });
    }

    return events;
  }

  function typeSafe(type) {
    const t = String(type || "").trim().toLowerCase();
    return ["film","premiera","live"].includes(t) ? t : "film";
  }

  function youtubeVideoId(url) {
    if (!url) return "";
    try {
      const u = new URL(url);

      if (u.hostname.includes("youtu.be")) {
        return u.pathname.split("/").filter(Boolean)[0] || "";
      }

      if (u.hostname.includes("youtube.com")) {
        if (u.pathname === "/watch") return u.searchParams.get("v") || "";

        const parts = u.pathname.split("/").filter(Boolean);
        const idx = parts.findIndex(x => ["shorts","live","embed"].includes(x));
        if (idx >= 0 && parts[idx+1]) return parts[idx+1];
      }
    } catch (_) {}
    return "";
  }

  function resolveThumbPath(path) {
    const value = String(path || "").trim();
    if (!value) return "";

    if (/^(https?:)?\/\//i.test(value) || value.startsWith("data:") || value.startsWith("/")) {
      return value;
    }

    // Relative path, np. "miniatury/nazwa.png"
    return value;
  }

  function getThumb(event) {
    if (event.thumbnail) return resolveThumbPath(event.thumbnail);

    // Jeśli ktoś jednak wklei link YouTube do kolumny linku serii,
    // miniatura też zadziała automatycznie.
    const id = youtubeVideoId(event.seriesUrl);
    return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : "";
  }

  function buildThumb(event) {
    const wrap = document.createElement("div");
    wrap.className = "thumb-wrap";

    const type = typeSafe(event.type);
    const thumb = getThumb(event);

    const fallback = () => {
      wrap.innerHTML = `
        <div class="thumb-fallback">
          <strong>${TYPE_LABELS[type]}</strong>
          <small>CEVSKY</small>
        </div>`;
    };

    if (!thumb) {
      fallback();
      return wrap;
    }

    const img = document.createElement("img");
    img.className = "thumb";
    img.loading = "lazy";
    img.alt = "";
    img.src = thumb;
    img.onerror = fallback;

    wrap.appendChild(img);
    return wrap;
  }

  function buildEvent(event) {
    const row = document.createElement("div");
    row.className = "event";

    const time = document.createElement("div");
    time.className = "event-time";
    time.textContent = event.time;

    const info = document.createElement("div");
    info.className = "event-info";

    const title = document.createElement("div");
    title.className = "event-title";
    title.textContent = event.title;

    const meta = document.createElement("div");
    meta.className = "event-meta";

    const type = typeSafe(event.type);
    const badge = document.createElement("span");
    badge.className = `badge badge-${type}`;
    badge.textContent = TYPE_LABELS[type];
    meta.appendChild(badge);

    if (event.subtitle) {
      const subtitle = document.createElement("span");
      subtitle.textContent = event.subtitle;
      meta.appendChild(subtitle);
    }

    info.appendChild(title);
    info.appendChild(meta);

    const link = document.createElement(event.seriesUrl ? "a" : "span");
    link.className = "open-link";
    link.textContent = event.seriesUrl ? (SITE_CONFIG.seriesButtonText || "Seria ↗") : "Wkrótce";

    if (event.seriesUrl) {
      link.href = event.seriesUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }

    row.appendChild(time);
    row.appendChild(buildThumb(event));
    row.appendChild(info);
    row.appendChild(link);

    return row;
  }

  function renderSchedule(events) {
    const container = document.getElementById("schedule");
    container.innerHTML = "";

    if (!events.length) {
      container.innerHTML = `<div class="empty">Brak zaplanowanych materiałów.</div>`;
      return;
    }

    const groups = new Map();
    for (const event of events) {
      if (!groups.has(event.date)) groups.set(event.date, []);
      groups.get(event.date).push(event);
    }

    for (const [date, dayEvents] of groups.entries()) {
      const label = formatDate(date);
      const card = document.createElement("article");
      card.className = "day-card";

      const header = document.createElement("div");
      header.className = "day-header";
      header.innerHTML = `<strong>${label.dayName}</strong><span>${label.fullDate}</span>`;
      card.appendChild(header);

      dayEvents.forEach(event => card.appendChild(buildEvent(event)));
      container.appendChild(card);
    }
  }

  function updateNext(nextEvent) {
    const dateEl = document.getElementById("nextDate");
    const titleEl = document.getElementById("nextTitle");
    const countEl = document.getElementById("nextCountdown");

    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }

    if (!nextEvent) {
      dateEl.textContent = "—";
      titleEl.textContent = "Brak kolejnych materiałów w harmonogramie";
      countEl.textContent = "";
      return;
    }

    const target = parseDateTime(nextEvent.date,nextEvent.time);
    const label = formatDate(nextEvent.date);

    dateEl.textContent = `${label.dayName}, ${nextEvent.time}`;
    titleEl.textContent = nextEvent.title;

    function tick() {
      const diff = target.getTime() - Date.now();

      if (diff <= 0) {
        countEl.textContent = "Materiał powinien być już dostępny.";
        return;
      }

      const totalMinutes = Math.floor(diff / 60000);
      const days = Math.floor(totalMinutes / 1440);
      const hours = Math.floor((totalMinutes % 1440) / 60);
      const minutes = totalMinutes % 60;

      if (days > 0) countEl.textContent = `Start za ${days} d ${hours} h`;
      else if (hours > 0) countEl.textContent = `Start za ${hours} h ${minutes} min`;
      else countEl.textContent = `Start za ${minutes} min`;
    }

    tick();
    countdownTimer = setInterval(tick,60000);
  }

  function renderData(events) {
    const today = startOfToday();

    // Sztywne okno publikacji:
    // dzisiaj + kolejne dni, maksymalnie 14 dni łącznie.
    const displayDays = Math.max(1, Number(SITE_CONFIG.displayDays) || 7);
    const windowEnd = addDays(today, displayDays);
    windowEnd.setHours(0,0,0,0);

    // Informacja kontrolna na stronie: dokładny zakres 7 dni.
    const lastVisibleDay = addDays(today, displayDays - 1);
    const rangeText = document.getElementById("rangeText");
    if (rangeText) {
      const startLabel = `${today.getDate()} ${PL_MONTHS[today.getMonth()]}`;
      const endLabel = `${lastVisibleDay.getDate()} ${PL_MONTHS[lastVisibleDay.getMonth()]}`;
      rangeText.textContent = `Pokazujemy 7 dni: ${startLabel} – ${endLabel}`;
    }

    const sorted = [...events]
      .filter(e => Number.isFinite(parseDateTime(e.date,e.time).getTime()))
      .sort((a,b) => parseDateTime(a.date,a.time) - parseDateTime(b.date,b.time));

    const visible = sorted.filter(e => {
      const eventDay = parseDateTime(e.date,"00:00");
      return eventDay.getTime() >= today.getTime()
        && eventDay.getTime() < windowEnd.getTime();
    });

    // Najbliższy materiał też wybieramy tylko z aktualnego 14-dniowego okna.
    const upcoming = visible.filter(e =>
      parseDateTime(e.date,e.time).getTime() >= Date.now()
    );

    renderSchedule(visible);
    updateNext(upcoming[0]);
  }

  function showError(message) {
    const status = document.getElementById("sheetStatus");
    status.textContent = "Błąd Google Sheets";
    status.className = "sheet-status error";

    document.getElementById("schedule").innerHTML = `<div class="empty">${message}</div>`;
    document.getElementById("nextDate").textContent = "—";
    document.getElementById("nextTitle").textContent = "Harmonogram chwilowo niedostępny";
    document.getElementById("nextCountdown").textContent = "";
  }

  function handleQueryResponse(response) {
    if (response.isError()) {
      showError(`Nie udało się pobrać arkusza: ${response.getMessage()}`);
      return;
    }

    try {
      const table = response.getDataTable();
      const events = tableToEvents(table);

      renderData(events);

      const now = new Date();
      const hh = pad2(now.getHours());
      const mm = pad2(now.getMinutes());

      const status = document.getElementById("sheetStatus");
      status.textContent = `Google Sheets • aktualizacja ${hh}:${mm}`;
      status.className = "sheet-status ok";
    } catch (err) {
      console.error(err);
      showError("Nie udało się odczytać danych z arkusza.");
    }
  }

  function loadSheet() {
    const status = document.getElementById("sheetStatus");
    status.textContent = "Aktualizowanie harmonogramu…";
    status.className = "sheet-status";

    try {
      // Parametr _ts zmienia się przy każdym odczycie, żeby przeglądarka
      // nie trzymała starej odpowiedzi w cache.
      const url =
        `https://docs.google.com/spreadsheets/d/${SITE_CONFIG.sheetId}/gviz/tq` +
        `?gid=${encodeURIComponent(SITE_CONFIG.sheetGid)}` +
        `&headers=1&_ts=${Date.now()}`;

      const query = new google.visualization.Query(url);
      query.setQuery("select *");
      query.send(handleQueryResponse);
    } catch (err) {
      console.error(err);
      showError("Nie udało się połączyć z Google Sheets.");
    }
  }

  function init() {
    ["youtubeTop","youtubeHero","youtubeFooter"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.href = SITE_CONFIG.youtubeUrl;
    });

    document.getElementById("year").textContent = new Date().getFullYear();

    google.charts.load("current", {packages:[]});
    google.charts.setOnLoadCallback(() => {
      loadSheet();

      // Automatyczne odświeżanie w trakcie otwartej strony.
      const minutes = Math.max(1, Number(SITE_CONFIG.refreshMinutes) || 1);
      setInterval(loadSheet, minutes * 60 * 1000);

      // Po powrocie do karty pobierz harmonogram od razu.
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          loadSheet();
        }
      });

      // Tak samo po ponownym uaktywnieniu okna przeglądarki.
      window.addEventListener("focus", loadSheet);
    });
  }

  init();
})();
