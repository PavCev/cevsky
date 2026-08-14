(() => {
  const DAYS=["Niedziela","Poniedziałek","Wtorek","Środa","Czwartek","Piątek","Sobota"];
  const MONTHS=["stycznia","lutego","marca","kwietnia","maja","czerwca","lipca","sierpnia","września","października","listopada","grudnia"];
  const TYPES={film:"▶ FILM",premiera:"◆ PREMIERA",live:"● LIVE"};
  let timer=null;

  const pad=n=>String(n).padStart(2,"0");
  const dayStart=(d=new Date())=>{const x=new Date(d);x.setHours(0,0,0,0);return x};
  const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
  const ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

  function normDate(v,f){
    if(v instanceof Date && !isNaN(v)) return ymd(v);
    const s=String(f||v||"").trim();
    let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if(m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
    m=s.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/);
    return m ? `${m[3]}-${pad(m[2])}-${pad(m[1])}` : s;
  }

  function normTime(v,f){
    if(v instanceof Date && !isNaN(v)) return `${pad(v.getHours())}:${pad(v.getMinutes())}`;
    if(typeof v==="number"){
      const mins=Math.round(v*1440); return `${pad(Math.floor(mins/60)%24)}:${pad(mins%60)}`;
    }
    const s=String(f||v||"").trim(),m=s.match(/(\d{1,2}):(\d{2})/);
    return m ? `${pad(m[1])}:${m[2]}` : s;
  }

  function dt(ds,ts="00:00"){
    const d=ds.match(/^(\d{4})-(\d{2})-(\d{2})$/),t=ts.match(/^(\d{1,2}):(\d{2})$/);
    return (!d||!t)?new Date(NaN):new Date(+d[1],+d[2]-1,+d[3],+t[1],+t[2]);
  }

  const norm=s=>String(s||"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  function col(table,names){
    const a=Array.isArray(names)?names:[names];
    for(let c=0;c<table.getNumberOfColumns();c++)
      if(a.some(n=>norm(n)===norm(table.getColumnLabel(c)))) return c;
    return -1;
  }
  function cell(table,r,c){
    if(c<0)return {v:"",f:""};
    return {v:table.getValue(r,c),f:table.getFormattedValue(r,c)};
  }
  function text(table,r,c){const x=cell(table,r,c);return String(x.f||x.v||"").trim()}
  function active(v){v=String(v||"").trim().toUpperCase();return !v||["TAK","TRUE","1","YES","Y"].includes(v)}

  function eventsFrom(table){
    const c={
      date:col(table,"Data"),time:col(table,"Godzina"),type:col(table,"Typ"),
      title:col(table,"Tytuł"),desc:col(table,"Opis"),
      link:col(table,["Link serii","Link playlisty","Link YouTube","Link"]),
      thumb:col(table,"Miniatura"),active:col(table,"Aktywne")
    };
    const out=[];
    for(let r=0;r<table.getNumberOfRows();r++){
      const dc=cell(table,r,c.date),tc=cell(table,r,c.time);
      const date=normDate(dc.v,dc.f),time=normTime(tc.v,tc.f),title=text(table,r,c.title);
      if(!date||!time||!title||!active(text(table,r,c.active)))continue;
      out.push({date,time,type:text(table,r,c.type).toLowerCase(),title,
        desc:text(table,r,c.desc),link:text(table,r,c.link),thumb:text(table,r,c.thumb)});
    }
    return out;
  }

  function videoId(url){
    if(!url)return "";
    try{
      const u=new URL(url);
      if(u.hostname.includes("youtu.be"))return u.pathname.split("/").filter(Boolean)[0]||"";
      if(u.hostname.includes("youtube.com")){
        if(u.pathname==="/watch")return u.searchParams.get("v")||"";
        const p=u.pathname.split("/").filter(Boolean),i=p.findIndex(x=>["shorts","live","embed"].includes(x));
        if(i>=0&&p[i+1])return p[i+1];
      }
    }catch(_){}
    return "";
  }
  function thumbUrl(e){if(e.thumb)return e.thumb;const id=videoId(e.link);return id?`https://i.ytimg.com/vi/${id}/hqdefault.jpg`:""}

  function thumb(e){
    const w=document.createElement("div");w.className="thumb-wrap";
    const fallback=()=>w.innerHTML=`<div class="thumb-fallback"><strong>${TYPES[e.type]||TYPES.film}</strong><small>CEVSKY</small></div>`;
    const url=thumbUrl(e); if(!url){fallback();return w}
    const img=document.createElement("img");img.className="thumb";img.src=url;img.loading="lazy";img.onerror=fallback;w.appendChild(img);return w;
  }

  function eventRow(e){
    const row=document.createElement("div");row.className="event";
    const time=document.createElement("div");time.className="event-time";time.textContent=e.time;
    const info=document.createElement("div");info.className="event-info";
    const title=document.createElement("div");title.className="event-title";title.textContent=e.title;
    const meta=document.createElement("div");meta.className="event-meta";
    const type=["film","premiera","live"].includes(e.type)?e.type:"film";
    meta.innerHTML=`<span class="badge badge-${type}">${TYPES[type]}</span>${e.desc?`<span>${e.desc}</span>`:""}`;
    info.append(title,meta);
    const link=document.createElement(e.link?"a":"span");link.className="open-link";
    link.textContent=e.link?SITE_CONFIG.seriesButtonText:"Wkrótce";
    if(e.link){link.href=e.link;link.target="_blank";link.rel="noopener noreferrer"}
    row.append(time,thumb(e),info,link);return row;
  }

  function render(events){
    const now=new Date(),today=dayStart(now),end=addDays(today,SITE_CONFIG.displayDays||7),last=addDays(today,(SITE_CONFIG.displayDays||7)-1);
    document.getElementById("rangeText").textContent=`Pokazujemy 7 dni: ${today.getDate()} ${MONTHS[today.getMonth()]} – ${last.getDate()} ${MONTHS[last.getMonth()]}`;
    const arr=events.filter(e=>!isNaN(dt(e.date,e.time))).sort((a,b)=>dt(a.date,a.time)-dt(b.date,b.time));
    const visible=arr.filter(e=>{const x=dt(e.date);return x>=today&&x<end});
    const groups=new Map();visible.forEach(e=>{if(!groups.has(e.date))groups.set(e.date,[]);groups.get(e.date).push(e)});
    const box=document.getElementById("schedule");box.innerHTML="";
    if(!visible.length){box.innerHTML='<div class="empty">Brak zaplanowanych materiałów.</div>'}
    for(const [date,items] of groups){
      const d=dt(date),card=document.createElement("article");card.className="day-card";
      const head=document.createElement("div");head.className="day-header";head.innerHTML=`<strong>${DAYS[d.getDay()]}</strong><span>${d.getDate()} ${MONTHS[d.getMonth()]}</span>`;
      card.appendChild(head);items.forEach(e=>card.appendChild(eventRow(e)));box.appendChild(card);
    }
    next(visible.filter(e=>dt(e.date,e.time)>=now)[0]);
  }

  function next(e){
    if(timer)clearInterval(timer);
    const de=document.getElementById("nextDate"),te=document.getElementById("nextTitle"),ce=document.getElementById("nextCountdown");
    if(!e){de.textContent="—";te.textContent="Brak kolejnych materiałów w harmonogramie";ce.textContent="";return}
    const target=dt(e.date,e.time),d=dt(e.date);de.textContent=`${DAYS[d.getDay()]}, ${e.time}`;te.textContent=e.title;
    const tick=()=>{
      const diff=target-Date.now(); if(diff<=0){ce.textContent="Materiał powinien być już dostępny.";return}
      const m=Math.floor(diff/60000),days=Math.floor(m/1440),h=Math.floor((m%1440)/60),mins=m%60;
      ce.textContent=days?`Start za ${days} d ${h} h`:h?`Start za ${h} h ${mins} min`:`Start za ${mins} min`;
    };tick();timer=setInterval(tick,60000);
  }

  function load(){
    const url=`https://docs.google.com/spreadsheets/d/${SITE_CONFIG.sheetId}/gviz/tq?gid=${SITE_CONFIG.scheduleGid}&headers=1&_ts=${Date.now()}`;
    const q=new google.visualization.Query(url);q.setQuery("select *");
    q.send(r=>{
      const s=document.getElementById("sheetStatus");
      if(r.isError()){s.textContent="Błąd Google Sheets";s.className="sheet-status error";return}
      render(eventsFrom(r.getDataTable()));
      const n=new Date();s.textContent=`Google Sheets • aktualizacja ${pad(n.getHours())}:${pad(n.getMinutes())}`;s.className="sheet-status ok";
    });
  }

  ["youtubeTop","youtubeHero","youtubeFooter"].forEach(id=>document.getElementById(id).href=SITE_CONFIG.youtubeUrl);
  document.getElementById("year").textContent=new Date().getFullYear();
  google.charts.load("current",{packages:[]});
  google.charts.setOnLoadCallback(()=>{load();setInterval(load,60000);document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")load()})});
})();
