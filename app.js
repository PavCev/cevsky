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

  function parseCSV(text) {
    const rows = [];
    let row = [], field = "", quoted = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];

      if (quoted) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            quoted = false;
          }
        } else {
          field += ch;
        }
      } else {
        if (ch === '"') {
          quoted = true;
        } else if (ch === ",") {
          row.push(field);
          field = "";
        } else if (ch === "\n") {
          row.push(field.replace(/\r$/, ""));
          rows.push(row);
          row = [];
          field = "";
        } else {
          field += ch;
        }
      }
    }

    row.push(field.replace(/\r$/, ""));
    if (row.some(x => x !== "")) rows.push(row);
    return rows;
  }

  function normalizeHeader(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function csvToEvents(csv) {
    const rows = parseCSV(csv);
    if (rows.length < 2) return [];

    const headers = rows[0].map(normalizeHeader);

    const col = name => headers.indexOf(normalizeHeader(name));
    const indexes = {
      date: col("Data"),
      time: col("Godzina"),
      type: col("Typ"),
      title: col("Tytuł"),
      subtitle: col("Opis"),
      url: col("Link YouTube"),
      thumbnail: col("Miniatura"),
      active: col("Aktywne")
    };

    if (indexes.date < 0 || indexes.time < 0 || indexes.title < 0) {
      throw new Error("W arkuszu brakuje kolumn Data, Godzina lub Tytuł.");
    }

    return rows.slice(1).map(row => {
      const get = idx => idx >= 0 ? String(row[idx] ?? "").trim() : "";
      return {
        date: get(indexes.date),
        time: get(indexes.time),
        type: get(indexes.type).toLowerCase(),
        title: get(indexes.title),
        subtitle: get(indexes.subtitle),
        url: get(indexes.url),
        thumbnail: get(indexes.thumbnail),
        active: get(indexes.active)
      };
    }).filter(e => {
      if (!e.date || !e.time || !e.title) return false;

      const a = e.active.trim().toUpperCase();
      if (!a) return true;

      return ["TAK","TRUE","1","YES","Y"].includes(a);
    });
  }

  function parseDateTime(dateStr, timeStr = "00:00") {
    const [y,m,d] = dateStr.split("-").map(Number);
    const [hh,mm] = timeStr.split(":").map(Number);

    if (![y,m,d,hh,mm].every(Number.isFinite)) {
      return new Date(NaN);
    }
    return new Date(y, m - 1, d, hh, mm, 0, 0);
  }

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

  function formatDate(dateStr) {
    const d = parseDateTime(dateStr);
    return {
      dayName: PL_DAYS[d.getDay()],
      fullDate: `${d.getDate()} ${PL_MONTHS[d.getMonth()]}`
    };
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
        if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
      }
    } catch (_) {}
    return "";
  }

  function getThumb(event) {
    if (event.thumbnail) return event.thumbnail;
    const id = youtubeVideoId(event.url);
    return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : "";
  }

  function buildThumb(event) {
    const wrap = document.createElement("div");
    wrap.className = "thumb-wrap";

    const thumb = getThumb(event);
    const type = typeSafe(event.type);

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

    const link = document.createElement(event.url ? "a" : "span");
    link.className = "open-link";
    link.textContent = event.url ? "Otwórz ↗" : "Wkrótce";

    if (event.url) {
      link.href = event.url;
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
    countdownTimer = setInterval(tick, 60000);
  }

  function renderData(events) {
    const today = startOfToday();
    const keepFrom = addDays(today, -(SITE_CONFIG.keepPastDays || 0));

    const sorted = [...events]
      .filter(e => {
        const d = parseDateTime(e.date,e.time);
        return Number.isFinite(d.getTime());
      })
      .sort((a,b) => parseDateTime(a.date,a.time) - parseDateTime(b.date,b.time));

    // Pokazujemy wszystkie wpisy z dzisiejszego dnia, nawet jeżeli godzina już minęła.
    const visible = sorted.filter(e =>
      parseDateTime(e.date,"23:59").getTime() >= keepFrom.getTime()
    );

    const upcoming = sorted.filter(e =>
      parseDateTime(e.date,e.time).getTime() >= Date.now()
    );

    renderSchedule(visible);
    updateNext(upcoming[0]);
  }

  async function loadSheet() {
    const status = document.getElementById("sheetStatus");

    try {
      status.textContent = "Aktualizowanie harmonogramu…";
      status.className = "sheet-status";

      const sep = SITE_CONFIG.sheetCsvUrl.includes("?") ? "&" : "?";
      const url = `${SITE_CONFIG.sheetCsvUrl}${sep}_=${Date.now()}`;

      const response = await fetch(url, {
        cache: "no-store",
        redirect: "follow"
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const csv = await response.text();
      const events = csvToEvents(csv);

      renderData(events);

      const now = new Date();
      const hh = String(now.getHours()).padStart(2,"0");
      const mm = String(now.getMinutes()).padStart(2,"0");

      status.textContent = `Google Sheets • aktualizacja ${hh}:${mm}`;
      status.className = "sheet-status ok";
    } catch (error) {
      console.error("Błąd Google Sheets:", error);

      status.textContent = "Nie udało się pobrać Google Sheets";
      status.className = "sheet-status error";

      document.getElementById("schedule").innerHTML = `
        <div class="empty">
          Nie udało się teraz pobrać harmonogramu. Odśwież stronę za chwilę.
        </div>`;

      document.getElementById("nextDate").textContent = "—";
      document.getElementById("nextTitle").textContent = "Harmonogram chwilowo niedostępny";
      document.getElementById("nextCountdown").textContent = "";
    }
  }

  function init() {
    ["youtubeTop","youtubeHero","youtubeFooter"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.href = SITE_CONFIG.youtubeUrl;
    });

    document.getElementById("year").textContent = new Date().getFullYear();

    loadSheet();

    const minutes = Math.max(1, Number(SITE_CONFIG.refreshMinutes) || 2);
    setInterval(loadSheet, minutes * 60 * 1000);
  }

  init();
})();
