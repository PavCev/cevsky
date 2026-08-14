(() => {
  const DAYS=["Niedziela","Poniedziałek","Wtorek","Środa","Czwartek","Piątek","Sobota"];
  const MONTHS=["stycznia","lutego","marca","kwietnia","maja","czerwca","lipca","sierpnia","września","października","listopada","grudnia"];
  const pad=n=>String(n).padStart(2,"0");
  const start=d=>{const x=new Date(d);x.setHours(0,0,0,0);return x};
  const add=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
  const monday=d=>{const x=start(d),day=x.getDay();return add(x,day===0?-6:1-day)};
  const ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  function normDate(v,f){if(v instanceof Date&&!isNaN(v))return ymd(v);const s=String(f||v||"").trim();let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);if(m)return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;m=s.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/);return m?`${m[3]}-${pad(m[2])}-${pad(m[1])}`:s}
  function date(s){const m=String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?new Date(+m[1],+m[2]-1,+m[3]):new Date(NaN)}
  const norm=s=>String(s||"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  function col(t,names){const a=Array.isArray(names)?names:[names];for(let c=0;c<t.getNumberOfColumns();c++)if(a.some(n=>norm(n)===norm(t.getColumnLabel(c))))return c;return -1}
  function cell(t,r,c){if(c<0)return {v:"",f:""};return {v:t.getValue(r,c),f:t.getFormattedValue(r,c)}}
  function text(t,r,c){const x=cell(t,r,c);return String(x.f||x.v||"").trim()}
  function active(v){v=String(v||"").trim().toUpperCase();return !v||["TAK","TRUE","1","YES","Y"].includes(v)}
  function items(t){
    const c={date:col(t,"Data"),title:col(t,"Tytuł"),steam:col(t,["Link Steam","Steam","Link"]),active:col(t,"Aktywne")},out=[];
    for(let r=0;r<t.getNumberOfRows();r++){const dc=cell(t,r,c.date),d=normDate(dc.v,dc.f),title=text(t,r,c.title);if(!d||!title||!active(text(t,r,c.active)))continue;out.push({date:d,title,steam:text(t,r,c.steam)})}
    return out.sort((a,b)=>date(a.date)-date(b.date));
  }
  function range(a,b){return `${a.getDate()} ${MONTHS[a.getMonth()]} – ${b.getDate()} ${MONTHS[b.getMonth()]}`}
  function list(id,arr){
    const box=document.getElementById(id);box.innerHTML="";
    if(!arr.length){box.innerHTML='<div class="empty">Brak wpisanych premier w tym tygodniu.</div>';return}
    const groups=new Map();arr.forEach(x=>{if(!groups.has(x.date))groups.set(x.date,[]);groups.get(x.date).push(x)});
    for(const [ds,games] of groups){const d=date(ds),day=document.createElement("div");day.className="day";
      const head=document.createElement("div");head.className="day-head";head.innerHTML=`<strong>${DAYS[d.getDay()]}</strong><span>${pad(d.getDate())}.${pad(d.getMonth()+1)}</span>`;
      const g=document.createElement("div");g.className="games";
      games.forEach(x=>{const el=document.createElement(x.steam?"a":"div");el.className="game";el.textContent=x.title;if(x.steam){el.href=x.steam;el.target="_blank";el.rel="noopener noreferrer"}g.appendChild(el)});
      day.append(head,g);box.appendChild(day)
    }
  }
  function render(all){const a=monday(new Date()),b=add(a,7),c=add(a,14);document.getElementById("currentWeekLabel").textContent=range(a,add(b,-1));document.getElementById("nextWeekLabel").textContent=range(b,add(c,-1));list("currentWeekReleases",all.filter(x=>date(x.date)>=a&&date(x.date)<b));list("nextWeekReleases",all.filter(x=>date(x.date)>=b&&date(x.date)<c))}
  function load(){const u=`https://docs.google.com/spreadsheets/d/${SITE_CONFIG.sheetId}/gviz/tq?sheet=${encodeURIComponent(SITE_CONFIG.premieresSheetName)}&headers=1&_ts=${Date.now()}`;const q=new google.visualization.Query(u);q.setQuery("select *");q.send(r=>{const s=document.getElementById("status");if(r.isError()){s.textContent='Nie udało się pobrać karty „Premiery”.';s.className="status error";return}render(items(r.getDataTable()));const n=new Date();s.textContent=`Google Sheets • aktualizacja ${pad(n.getHours())}:${pad(n.getMinutes())}`;s.className="status ok"})}
  document.getElementById("youtubeTop").href=SITE_CONFIG.youtubeUrl;document.getElementById("year").textContent=new Date().getFullYear();
  google.charts.load("current",{packages:[]});google.charts.setOnLoadCallback(()=>{load();setInterval(load,60000);document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")load()})});
})();
