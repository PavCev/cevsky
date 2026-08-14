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
    film: "▶ FILM",
    premiera: "◆ PREMIERA",
    live: "● LIVE"
  };

  function parseDateTime(dateStr, timeStr = "00:00") {
    const [y,m,d] = dateStr.split("-").map(Number);
    const [hh,mm] = timeStr.split(":").map(Number);
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
      fullDate: `${d.getDate()} ${PL_MONTHS[d.getMonth()]}`,
      long: `${PL_DAYS[d.getDay()]}, ${d.getDate()} ${PL_MONTHS[d.getMonth()]}`
    };
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

  function typeSafe(type) {
    return ["film","premiera","live"].includes(type) ? type : "film";
  }

  function buildThumb(event) {
    const thumb = getThumb(event);
    if (thumb) {
      const wrap = document.createElement("div");
      wrap.className = "thumb-wrap";
      const img = document.createElement("img");
      img.className = "thumb";
      img.loading = "lazy";
      img.alt = "";
      img.src = thumb;
      img.onerror = () => {
        wrap.innerHTML = `
          <div class="thumb-fallback">
            <strong>${TYPE_LABELS[typeSafe(event.type)]}</strong>
            <small>CEVSKY</small>
          </div>`;
      };
      wrap.appendChild(img);
      return wrap;
    }

    const wrap = document.createElement("div");
    wrap.className = "thumb-wrap";
    wrap.innerHTML = `
      <div class="thumb-fallback">
        <strong>${TYPE_LABELS[typeSafe(event.type)]}</strong>
        <small>CEVSKY</small>
      </div>`;
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
    title.textContent = event.title || "Bez tytułu";

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
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "Brak zaplanowanych materiałów.";
      container.appendChild(empty);
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

    if (!nextEvent) {
      dateEl.textContent = "—";
      titleEl.textContent = "Brak zaplanowanych materiałów";
      countEl.textContent = "";
      return;
    }

    const target = parseDateTime(nextEvent.date, nextEvent.time);
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
    window.setInterval(tick, 60000);
  }

  function initLinks() {
    ["youtubeTop","youtubeHero","youtubeFooter"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.href = SITE_CONFIG.youtubeUrl;
    });
  }

  function initUpdatedAt() {
    const el = document.getElementById("updatedAt");
    if (!el) return;
    if (SITE_CONFIG.updatedAt) {
      el.textContent = `Aktualizacja: ${SITE_CONFIG.updatedAt}`;
    } else {
      el.textContent = "";
    }
  }

  function init() {
    initLinks();
    initUpdatedAt();
    document.getElementById("year").textContent = new Date().getFullYear();

    const today = startOfToday();
    const keepFrom = addDays(today, -(SITE_CONFIG.keepPastDays || 0));

    const sorted = [...SCHEDULE]
      .filter(e => e && e.date && e.time)
      .sort((a,b) => parseDateTime(a.date,a.time) - parseDateTime(b.date,b.time));

    const visible = sorted.filter(e => parseDateTime(e.date, "23:59") >= keepFrom);
    const upcoming = sorted.filter(e => parseDateTime(e.date,e.time).getTime() >= Date.now());

    renderSchedule(visible);
    updateNext(upcoming[0]);
  }

  init();
})();
