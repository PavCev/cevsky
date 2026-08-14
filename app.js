(() => {
  "use strict";

  const PL_DAYS = [
    "Niedziela","Poniedziałek","Wtorek","Środa",
    "Czwartek","Piątek","Sobota"
  ];

  const PL_DAYS_SHORT = ["nd.","pon.","wt.","śr.","czw.","pt.","sob."];

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

  function pad2(v){ return String(v).padStart(2,"0"); }

  function startOfDay(date = new Date()){
    const d = new Date(date);
    d.setHours(0,0,0,0);
    return d;
  }

  function addDays(date, days){
    const d = new Date(date);
    d.setDate(d.getDate()+days);
    return d;
  }

  function mondayOf(date){
    const d = startOfDay(date);
    const day = d.getDay();
    const offset = day === 0 ? -6 : 1-day;
    return addDays(d,offset);
  }

  function dateToYMD(d){
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  }

  function normalizeDate(value, formatted){
    if(value instanceof Date && !Number.isNaN(value.getTime())){
      return dateToYMD(value);
    }

    const raw = String(formatted || value || "").trim();

    let m = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if(m) return `${m[1]}-${pad2(m[2])}-${pad2(m[3])}`;

    m = raw.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/);
    if(m) return `${m[3]}-${pad2(m[2])}-${pad2(m[1])}`;

    return raw;
  }

  function normalizeTime(value, formatted){
    if(value instanceof Date && !Number.isNaN(value.getTime())){
      return `${pad2(value.getHours())}:${pad2(value.getMinutes())}`;
    }

    if(typeof value === "number" && Number.isFinite(value)){
      const totalMinutes = Math.round(value*24*60);
      return `${pad2(Math.floor(totalMinutes/60)%24)}:${pad2(totalMinutes%60)}`;
    }

    const raw = String(formatted || value || "").trim();
    const m = raw.match(/(\d{1,2}):(\d{2})/);
    return m ? `${pad2(m[1])}:${m[2]}` : raw;
  }

  function parseDateTime(dateStr,timeStr="00:00"){
    const dm = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const tm = String(timeStr).match(/^(\d{1,2}):(\d{2})$/);
    if(!dm || !tm) return new Date(NaN);

    return new Date(
      Number(dm[1]),
      Number(dm[2])-1,
      Number(dm[3]),
      Number(tm[1]),
      Number(tm[2]),
      0,0
    );
  }

  function formatDate(dateStr){
    const d = parseDateTime(dateStr);
    return {
      dayName: PL_DAYS[d.getDay()],
      fullDate: `${d.getDate()} ${PL_MONTHS[d.getMonth()]}`
    };
  }

  function formatReleaseDate(dateStr){
    const d = parseDateTime(dateStr);
    return `${PL_DAYS_SHORT[d.getDay()]} ${pad2(d.getDate())}.${pad2(d.getMonth()+1)}`;
  }

  function formatShortRange(start,endInclusive){
    const a = `${start.getDate()} ${PL_MONTHS[start.getMonth()]}`;
    const b = `${endInclusive.getDate()} ${PL_MONTHS[endInclusive.getMonth()]}`;
    return `${a} – ${b}`;
  }

  function normalizeHeader(value){
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"");
  }

  function findColumn(table,names){
    const arr = Array.isArray(names) ? names : [names];
    for(let c=0;c<table.getNumberOfColumns();c++){
      const label = normalizeHeader(table.getColumnLabel(c));
      if(arr.some(n => normalizeHeader(n) === label)) return c;
    }
    return -1;
  }

  function getCell(table,row,col){
    if(col<0) return {value:"",formatted:""};
    return {
      value:table.getValue(row,col),
      formatted:table.getFormattedValue(row,col)
    };
  }

  function cellText(table,row,col){
    const c = getCell(table,row,col);
    return String(c.formatted || c.value || "").trim();
  }

  function isActive(value){
    const a = String(value || "").trim().toUpperCase();
    if(!a) return true;
    return ["TAK","TRUE","1","YES","Y"].includes(a);
  }

  /* ================= HARMONOGRAM ================= */

  function scheduleTableToEvents(table){
    const cols = {
      date:findColumn(table,"Data"),
      time:findColumn(table,"Godzina"),
      type:findColumn(table,"Typ"),
      title:findColumn(table,"Tytuł"),
      subtitle:findColumn(table,"Opis"),
      seriesUrl:findColumn(table,["Link serii","Link playlisty","Link YouTube","Link"]),
      thumbnail:findColumn(table,"Miniatura"),
      active:findColumn(table,"Aktywne")
    };

    if(cols.date<0 || cols.time<0 || cols.title<0){
      throw new Error("Brakuje kolumn Data, Godzina lub Tytuł.");
    }

    const events=[];

    for(let r=0;r<table.getNumberOfRows();r++){
      const dc=getCell(table,r,cols.date);
      const tc=getCell(table,r,cols.time);

      const date=normalizeDate(dc.value,dc.formatted);
      const time=normalizeTime(tc.value,tc.formatted);
      const title=cellText(table,r,cols.title);

      if(!date || !time || !title) continue;
      if(!isActive(cellText(table,r,cols.active))) continue;

      events.push({
        date,
        time,
        type:cellText(table,r,cols.type).toLowerCase(),
        title,
        subtitle:cellText(table,r,cols.subtitle),
        seriesUrl:cellText(table,r,cols.seriesUrl),
        thumbnail:cellText(table,r,cols.thumbnail)
      });
    }
    return events;
  }

  function typeSafe(type){
    const t=String(type || "").trim().toLowerCase();
    return ["film","premiera","live"].includes(t) ? t : "film";
  }

  function youtubeVideoId(url){
    if(!url) return "";
    try{
      const u=new URL(url);

      if(u.hostname.includes("youtu.be")){
        return u.pathname.split("/").filter(Boolean)[0] || "";
      }

      if(u.hostname.includes("youtube.com")){
        if(u.pathname === "/watch") return u.searchParams.get("v") || "";

        const parts=u.pathname.split("/").filter(Boolean);
        const idx=parts.findIndex(x => ["shorts","live","embed"].includes(x));
        if(idx>=0 && parts[idx+1]) return parts[idx+1];
      }
    }catch(_){}
    return "";
  }

  function getThumb(event){
    if(event.thumbnail) return event.thumbnail;
    const id=youtubeVideoId(event.seriesUrl);
    return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : "";
  }

  function buildThumb(event){
    const wrap=document.createElement("div");
    wrap.className="thumb-wrap";

    const type=typeSafe(event.type);
    const thumb=getThumb(event);

    const fallback=()=>{
      wrap.innerHTML=`
        <div class="thumb-fallback">
          <strong>${TYPE_LABELS[type]}</strong>
          <small>CEVSKY</small>
        </div>`;
    };

    if(!thumb){
      fallback();
      return wrap;
    }

    const img=document.createElement("img");
    img.className="thumb";
    img.loading="lazy";
    img.alt="";
    img.src=thumb;
    img.onerror=fallback;

    wrap.appendChild(img);
    return wrap;
  }

  function buildEvent(event){
    const row=document.createElement("div");
    row.className="event";

    const time=document.createElement("div");
    time.className="event-time";
    time.textContent=event.time;

    const info=document.createElement("div");
    info.className="event-info";

    const title=document.createElement("div");
    title.className="event-title";
    title.textContent=event.title;

    const meta=document.createElement("div");
    meta.className="event-meta";

    const type=typeSafe(event.type);
    const badge=document.createElement("span");
    badge.className=`badge badge-${type}`;
    badge.textContent=TYPE_LABELS[type];
    meta.appendChild(badge);

    if(event.subtitle){
      const subtitle=document.createElement("span");
      subtitle.textContent=event.subtitle;
      meta.appendChild(subtitle);
    }

    info.appendChild(title);
    info.appendChild(meta);

    const link=document.createElement(event.seriesUrl ? "a" : "span");
    link.className="open-link";
    link.textContent=event.seriesUrl ? (SITE_CONFIG.seriesButtonText || "Seria ↗") : "Wkrótce";

    if(event.seriesUrl){
      link.href=event.seriesUrl;
      link.target="_blank";
      link.rel="noopener noreferrer";
    }

    row.appendChild(time);
    row.appendChild(buildThumb(event));
    row.appendChild(info);
    row.appendChild(link);

    return row;
  }

  function renderSchedule(events){
    const container=document.getElementById("schedule");
    container.innerHTML="";

    if(!events.length){
      container.innerHTML=`<div class="empty">Brak zaplanowanych materiałów.</div>`;
      return;
    }

    const groups=new Map();

    for(const event of events){
      if(!groups.has(event.date)) groups.set(event.date,[]);
      groups.get(event.date).push(event);
    }

    for(const [date,dayEvents] of groups.entries()){
      const label=formatDate(date);

      const card=document.createElement("article");
      card.className="day-card";

      const header=document.createElement("div");
      header.className="day-header";
      header.innerHTML=`<strong>${label.dayName}</strong><span>${label.fullDate}</span>`;
      card.appendChild(header);

      dayEvents.forEach(e => card.appendChild(buildEvent(e)));
      container.appendChild(card);
    }
  }

  function updateNext(nextEvent){
    const dateEl=document.getElementById("nextDate");
    const titleEl=document.getElementById("nextTitle");
    const countEl=document.getElementById("nextCountdown");

    if(countdownTimer){
      clearInterval(countdownTimer);
      countdownTimer=null;
    }

    if(!nextEvent){
      dateEl.textContent="—";
      titleEl.textContent="Brak kolejnych materiałów w harmonogramie";
      countEl.textContent="";
      return;
    }

    const target=parseDateTime(nextEvent.date,nextEvent.time);
    const label=formatDate(nextEvent.date);

    dateEl.textContent=`${label.dayName}, ${nextEvent.time}`;
    titleEl.textContent=nextEvent.title;

    function tick(){
      const diff=target.getTime()-Date.now();

      if(diff<=0){
        countEl.textContent="Materiał powinien być już dostępny.";
        return;
      }

      const total=Math.floor(diff/60000);
      const days=Math.floor(total/1440);
      const hours=Math.floor((total%1440)/60);
      const mins=total%60;

      if(days>0) countEl.textContent=`Start za ${days} d ${hours} h`;
      else if(hours>0) countEl.textContent=`Start za ${hours} h ${mins} min`;
      else countEl.textContent=`Start za ${mins} min`;
    }

    tick();
    countdownTimer=setInterval(tick,60000);
  }

  function renderScheduleData(events){
    const today=startOfDay();
    const displayDays=Math.max(1,Number(SITE_CONFIG.displayDays) || 7);
    const windowEnd=addDays(today,displayDays);

    const lastDay=addDays(today,displayDays-1);
    document.getElementById("rangeText").textContent=
      `Pokazujemy 7 dni: ${formatShortRange(today,lastDay)}`;

    const sorted=[...events]
      .filter(e => Number.isFinite(parseDateTime(e.date,e.time).getTime()))
      .sort((a,b)=>parseDateTime(a.date,a.time)-parseDateTime(b.date,b.time));

    const visible=sorted.filter(e=>{
      const d=parseDateTime(e.date,"00:00");
      return d>=today && d<windowEnd;
    });

    const upcoming=visible.filter(e=>parseDateTime(e.date,e.time)>=new Date());

    renderSchedule(visible);
    updateNext(upcoming[0]);
  }

  /* ================= PREMIERY STEAM ================= */

  function premieresTableToItems(table){
    const cols={
      date:findColumn(table,"Data"),
      title:findColumn(table,"Tytuł"),
      steam:findColumn(table,["Link Steam","Steam","Link"]),
      active:findColumn(table,"Aktywne")
    };

    if(cols.date<0 || cols.title<0){
      throw new Error("Karta Premiery wymaga kolumn Data i Tytuł.");
    }

    const items=[];

    for(let r=0;r<table.getNumberOfRows();r++){
      const dc=getCell(table,r,cols.date);
      const date=normalizeDate(dc.value,dc.formatted);
      const title=cellText(table,r,cols.title);

      if(!date || !title) continue;
      if(!isActive(cellText(table,r,cols.active))) continue;

      items.push({
        date,
        title,
        steamUrl:cellText(table,r,cols.steam)
      });
    }

    return items.sort((a,b)=>parseDateTime(a.date)-parseDateTime(b.date));
  }

  function renderReleaseList(elementId,items){
    const container=document.getElementById(elementId);
    container.innerHTML="";

    if(!items.length){
      container.innerHTML=`<div class="release-empty">Brak wpisanych premier w tym tygodniu.</div>`;
      return;
    }

    items.forEach(item=>{
      const row=document.createElement("div");
      row.className="release-item";

      const date=document.createElement("div");
      date.className="release-date";
      date.textContent=formatReleaseDate(item.date);

      const title=document.createElement("div");
      title.className="release-title";
      title.textContent=item.title;

      row.appendChild(date);
      row.appendChild(title);

      if(item.steamUrl){
        const a=document.createElement("a");
        a.className="steam-link";
        a.href=item.steamUrl;
        a.target="_blank";
        a.rel="noopener noreferrer";
        a.textContent="Steam ↗";
        row.appendChild(a);
      }

      container.appendChild(row);
    });
  }

  function renderPremieres(items){
    const now=new Date();
    const currentStart=mondayOf(now);
    const nextStart=addDays(currentStart,7);
    const afterNext=addDays(currentStart,14);

    const currentEnd=addDays(nextStart,-1);
    const nextEnd=addDays(afterNext,-1);

    document.getElementById("currentWeekLabel").textContent=
      formatShortRange(currentStart,currentEnd);
    document.getElementById("nextWeekLabel").textContent=
      formatShortRange(nextStart,nextEnd);

    const current=items.filter(item=>{
      const d=parseDateTime(item.date);
      return d>=currentStart && d<nextStart;
    });

    const next=items.filter(item=>{
      const d=parseDateTime(item.date);
      return d>=nextStart && d<afterNext;
    });

    renderReleaseList("currentWeekReleases",current);
    renderReleaseList("nextWeekReleases",next);
  }

  /* ================= GOOGLE SHEETS ================= */

  function handleScheduleResponse(response){
    const status=document.getElementById("sheetStatus");

    if(response.isError()){
      status.textContent="Błąd Google Sheets";
      status.className="sheet-status error";
      document.getElementById("schedule").innerHTML=
        `<div class="empty">Nie udało się pobrać harmonogramu.</div>`;
      return;
    }

    try{
      const events=scheduleTableToEvents(response.getDataTable());
      renderScheduleData(events);

      const now=new Date();
      status.textContent=`Google Sheets • aktualizacja ${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
      status.className="sheet-status ok";
    }catch(err){
      console.error(err);
      status.textContent="Błąd odczytu harmonogramu";
      status.className="sheet-status error";
    }
  }

  function handlePremieresResponse(response){
    const status=document.getElementById("premieresStatus");

    if(response.isError()){
      status.textContent=`Nie znaleziono karty „${SITE_CONFIG.premieresSheetName}”`;
      status.className="sidebar-status error";
      document.getElementById("currentWeekReleases").innerHTML=
        `<div class="release-empty">Dodaj w Google Sheets kartę <strong>Premiery</strong>.</div>`;
      document.getElementById("nextWeekReleases").innerHTML=
        `<div class="release-empty">Potem wpisz tam premiery gier.</div>`;
      return;
    }

    try{
      const items=premieresTableToItems(response.getDataTable());
      renderPremieres(items);

      const now=new Date();
      status.textContent=`Premiery • aktualizacja ${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
      status.className="sidebar-status ok";
    }catch(err){
      console.error(err);
      status.textContent="Błąd odczytu karty Premiery";
      status.className="sidebar-status error";
    }
  }

  function loadAll(){
    try{
      const ts=Date.now();

      const scheduleUrl=
        `https://docs.google.com/spreadsheets/d/${SITE_CONFIG.sheetId}/gviz/tq`+
        `?gid=${encodeURIComponent(SITE_CONFIG.scheduleGid)}&headers=1&_ts=${ts}`;

      const scheduleQuery=new google.visualization.Query(scheduleUrl);
      scheduleQuery.setQuery("select *");
      scheduleQuery.send(handleScheduleResponse);

      const premieresUrl=
        `https://docs.google.com/spreadsheets/d/${SITE_CONFIG.sheetId}/gviz/tq`+
        `?sheet=${encodeURIComponent(SITE_CONFIG.premieresSheetName)}&headers=1&_ts=${ts}`;

      const premieresQuery=new google.visualization.Query(premieresUrl);
      premieresQuery.setQuery("select *");
      premieresQuery.send(handlePremieresResponse);

    }catch(err){
      console.error(err);
    }
  }

  function init(){
    ["youtubeTop","youtubeHero","youtubeFooter"].forEach(id=>{
      const el=document.getElementById(id);
      if(el) el.href=SITE_CONFIG.youtubeUrl;
    });

    document.getElementById("year").textContent=new Date().getFullYear();

    google.charts.load("current",{packages:[]});
    google.charts.setOnLoadCallback(()=>{
      loadAll();

      const minutes=Math.max(1,Number(SITE_CONFIG.refreshMinutes) || 1);
      setInterval(loadAll,minutes*60*1000);

      document.addEventListener("visibilitychange",()=>{
        if(document.visibilityState==="visible") loadAll();
      });

      window.addEventListener("focus",loadAll);
    });
  }

  init();
})();
