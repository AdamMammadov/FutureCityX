 // app.js — FutureCity X (gelişmiş versiya)
// Vanilla JS — full modular, accessibility, animations

const YEAR = new Date().getFullYear();
document.getElementById('year').textContent = YEAR;

/* ---------- data loading ---------- */
const INLINE = JSON.parse(document.getElementById('inline-data').textContent);
const DATA_URL = 'data.json';

let DATA = { sectors: [], academy: [], timeline: [] };

async function loadData() {
  try {
    const resp = await fetch(DATA_URL, { cache: "no-store" });
    if (!resp.ok) throw new Error('fetch failed');
    const json = await resp.json();
    DATA = json;
  } catch (e) {
    console.warn('data.json load failed, using inline data', e);
    DATA = INLINE;
  }
  initApp();
}
loadData();

/* ---------- helpers ---------- */
function el(tag, props = {}, ...children) {
  const d = document.createElement(tag);
  for (const k in props) {
    if (k === 'class') d.className = props[k];
    else if (k === 'style') Object.assign(d.style, props[k]);
    else if (k.startsWith('data-')) d.setAttribute(k, props[k]);
    else d[k] = props[k];
  }
  children.flat().forEach(c => {
    if (c == null) return;
    d.append(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return d;
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

/* ---------- theme toggle ---------- */
const themeBtn = document.getElementById('theme-toggle');
function applyTheme(t) {
  if (t === 'light') {
    document.documentElement.style.setProperty('--bg-1', '#f7fafc');
    document.documentElement.style.setProperty('--bg-2', '#eef2ff');
    document.documentElement.style.color = '#071427';
    themeBtn.textContent = '🌞';
    themeBtn.setAttribute('aria-pressed', 'true');
    localStorage.setItem('fcx-theme', 'light');
  } else {
    document.documentElement.style.setProperty('--bg-1', '#05060b');
    document.documentElement.style.setProperty('--bg-2', '#071227');
    document.documentElement.style.color = '#e6f0ff';
    themeBtn.textContent = '🌙';
    themeBtn.setAttribute('aria-pressed', 'false');
    localStorage.setItem('fcx-theme', 'dark');
  }
}
themeBtn.addEventListener('click', () =>
  applyTheme(localStorage.getItem('fcx-theme') === 'light' ? 'dark' : 'light'));
applyTheme(localStorage.getItem('fcx-theme') || 'dark');

/* ---------- mobile menu ---------- */
const menuToggle = document.getElementById('menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');
menuToggle.addEventListener('click', () => {
  const v = mobileMenu.hidden;
  mobileMenu.hidden = !v;
  menuToggle.setAttribute('aria-expanded', String(!v));
});

/* ---------- render sectors ---------- */
const cityGrid = document.getElementById('city-grid');
const filterSel = document.getElementById('sector-filter');
const searchInput = document.getElementById('search');

function renderFilters() {
  const cats = Array.from(new Set(DATA.sectors.map(s => s.category)));
  filterSel.innerHTML = '<option value="all">Hamısı</option>' +
    cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
}
function renderSectors(list) {
  cityGrid.innerHTML = '';
  if (!list.length) {
    cityGrid.appendChild(el('p', { class: 'muted' }, 'Uyğun sektor tapılmadı.'));
    return;
  }
  list.forEach(s => {
    const [c1, c2] = s.color || ['#6ee7f9', '#8b5cf6'];
    const thumb = el('div', { class: 'thumb', style: { background: `linear-gradient(135deg, ${c1}, ${c2})` } }, s.title);
    const card = el('article', { class: 'card', tabIndex: 0, 'data-id': s.id },
      thumb,
      el('h4', {}, s.title),
      el('p', {}, s.short),
      el('div', { class: 'tag' }, ...(s.tags || []).map(t => el('span', {}, t)))
    );
    addTilt(card);
    card.addEventListener('click', () => openModal('sector', s));
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openModal('sector', s); });
    cityGrid.appendChild(card);
  });
}

/* ---------- skyline ---------- */
const skylineWrap = document.getElementById('skyline');
function renderSkyline() {
  skylineWrap.innerHTML = '';
  const width = skylineWrap.clientWidth || 900;
  const sectors = DATA.sectors;
  const buildingCount = Math.max(6, sectors.length * 3);

  for (let i = 0; i < buildingCount; i++) {
    const layer = el('div', { class: 'layer' });
    const b = el('div', { class: 'building' });
    const w = 30 + (i % 6) * 10;
    const h = 60 + ((i * 37) % 120);
    const left = (i / buildingCount) * 100 + (Math.sin(i) * 3);
    const idx = (i % sectors.length);
    const color = (sectors[idx] && sectors[idx].color)
      ? `linear-gradient(180deg, ${sectors[idx].color[0]}, ${sectors[idx].color[1]})`
      : 'linear-gradient(180deg,#222,#111)';
    Object.assign(b.style, {
      width: `${w}px`, height: `${h}px`,
      left: `${left}%`, background: color,
      transform: `translateX(-50%)`, boxShadow: '0 10px 30px rgba(0,0,0,0.6)'
    });
    b.dataset.sector = sectors[idx] ? sectors[idx].id : '';
    b.title = sectors[idx] ? sectors[idx].title : '';
    b.addEventListener('mouseenter', ev => {
      const s = DATA.sectors.find(x => x.id === b.dataset.sector);
      if (s) showSkylineTooltip(ev, s);
    });
    b.addEventListener('mouseleave', hideSkylineTooltip);
    b.addEventListener('click', () => {
      const s = DATA.sectors.find(x => x.id === b.dataset.sector);
      if (s) openModal('sector', s);
    });
    layer.appendChild(b);
    skylineWrap.appendChild(layer);
  }
}
let tooltipEl = null;
function showSkylineTooltip(e, sector) {
  hideSkylineTooltip();
  tooltipEl = el('div', { class: 'sky-tooltip' },
    el('strong', {}, sector.title),
    el('div', { class: 'muted small' }, sector.short)
  );
  Object.assign(tooltipEl.style, {
    position: 'fixed', left: `${e.clientX + 12}px`, top: `${e.clientY + 12}px`,
    padding: '8px 10px', background: 'rgba(2,6,23,0.9)',
    border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px',
    zIndex: 120, pointerEvents: 'none'
  });
  document.body.appendChild(tooltipEl);
}
function hideSkylineTooltip() { if (tooltipEl) { tooltipEl.remove(); tooltipEl = null; } }

/* ---------- academy ---------- */
const academyGrid = document.getElementById('academy-grid');
function renderAcademy() {
  academyGrid.innerHTML = '';
  DATA.academy.forEach(a => {
    const card = el('article', { class: 'card', tabIndex: 0 },
      el('div', { class: 'thumb', style: { background: 'linear-gradient(135deg,#0ea5e9,#7c3aed)', height: '90px' } }, a.title),
      el('h4', {}, a.title),
      el('p', {}, a.short),
      el('div', { class: 'tag' }, a.level, ' • ', a.duration)
    );
    addTilt(card);
    card.addEventListener('click', () => openModal('academy', a));
    academyGrid.appendChild(card);
  });
}

/* ---------- timeline ---------- */
const timelineEventsWrap = document.getElementById('timeline-events');
function renderTimeline() {
  timelineEventsWrap.innerHTML = '';
  const list = DATA.timeline.slice().sort((a, b) => a.year - b.year);
  list.forEach((t, i) => {
    const side = (i % 2 === 0) ? 'left' : 'right';
    const item = el('div', { class: `timeline-item ${side}` },
      el('h4', {}, `${t.year} • ${t.title}`),
      el('p', {}, t.desc),
      el('ul', {}, ...(t.milestones || []).map(m => el('li', {}, m)))
    );
    timelineEventsWrap.appendChild(item);
  });
}

/* ---------- modal ---------- */
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');

function openModal(type, data) {
  modalBody.innerHTML = '';
  if (type === 'sector') {
    modalBody.append(
      el('h2', {}, data.title),
      el('p', { class: 'muted small' }, data.category + ' • ' + (data.tags || []).join(', ')),
      el('p', {}, data.description)
    );
  } else if (type === 'academy') {
    modalBody.append(
      el('h2', {}, data.title),
      el('p', { class: 'muted small' }, data.level + ' • ' + data.duration),
      el('p', {}, data.short)
    );
  }
  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
  modal.querySelector('.modal-panel').focus();
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
  modalBody.innerHTML = '';
  document.body.style.overflow = '';
}
modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* ---------- tilt ---------- */
function addTilt(el) {
  el.style.willChange = 'transform';
  el.addEventListener('pointermove', ev => {
    const r = el.getBoundingClientRect();
    const x = (ev.clientX - r.left) / r.width;
    const y = (ev.clientY - r.top) / r.height;
    const rx = (y - 0.5) * 8;
    const ry = (x - 0.5) * -8;
    el.style.transform = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg)`;
  });
  el.addEventListener('pointerleave', () => el.style.transform = '');
}

/* ---------- search & filter ---------- */
filterSel.addEventListener('change', applyFilters);
searchInput.addEventListener('input', applyFilters);

function applyFilters() {
  const q = searchInput.value.trim().toLowerCase();
  const cat = filterSel.value;
  const list = DATA.sectors.filter(s => {
    const matchQ = !q || (s.title + ' ' + s.short + ' ' + (s.tags || []).join(' ')).toLowerCase().includes(q);
    const matchC = cat === 'all' || s.category === cat;
    return matchQ && matchC;
  });
  renderSectors(list);
}

/* ---------- form ---------- */
const ideaForm = document.getElementById('idea-form');
const formMsg = document.getElementById('form-msg');
ideaForm.addEventListener('submit', e => {
  e.preventDefault();
  if (!ideaForm.email.value.includes('@')) {
    formMsg.textContent = 'Email düzgün deyil!';
    return;
  }
  const data = {
    name: ideaForm.name.value.trim(),
    email: ideaForm.email.value.trim(),
    subject: ideaForm.subject.value.trim(),
    idea: ideaForm.idea.value.trim(),
    ts: new Date().toISOString()
  };
  formMsg.textContent = `Təşəkkürlər, ${data.name}! İdeyanız qəbul edildi (demo).`;
  ideaForm.reset();
  console.log('IDEA SUBMIT (demo):', data);
  setTimeout(() => formMsg.textContent = '', 6000);
});

/* ---------- hero canvas ---------- */
const canvas = document.getElementById('hero-canvas');
const ctx = canvas.getContext('2d');
let DPR = Math.max(1, window.devicePixelRatio || 1);

function resizeCanvas() {
  const cssW = canvas.clientWidth || window.innerWidth;
  const cssH = canvas.clientHeight || 480;
  canvas.width = Math.round(cssW * DPR);
  canvas.height = Math.round(cssH * DPR);
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
let particles = [];
function makeParticles(n = 60) {
  particles = [];
  const w = canvas.clientWidth, h = canvas.clientHeight;
  for (let i = 0; i < n; i++) {
    particles.push({
      x: Math.random() * w, y: Math.random() * h,
      r: Math.random() * 2 + 0.4,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      hue: 180 + Math.random() * 140
    });
  }
}
function draw() {
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  const g = ctx.createLinearGradient(0, 0, 0, canvas.clientHeight);
  g.addColorStop(0, 'rgba(6,10,20,0.25)');
  g.addColorStop(1, 'rgba(2,6,12,0.6)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

  particles.forEach(p => {
    p.x += p.vx; p.y += p.vy;
    if (p.x < -10) p.x = canvas.clientWidth + 10;
    if (p.x > canvas.clientWidth + 10) p.x = -10;
    if (p.y < -10) p.y = canvas.clientHeight + 10;
    if (p.y > canvas.clientHeight + 10) p.y = -10;
    const rad = p.r * 4;
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad * 3);
    grad.addColorStop(0, `hsla(${p.hue},90%,60%,0.95)`);
    grad.addColorStop(0.3, `hsla(${p.hue},90%,60%,0.25)`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(p.x, p.y, rad * 3, 0, Math.PI * 2); ctx.fill();
  });

  const t = Date.now() * 0.001;
  const sweepX = (Math.sin(t * 0.5) * 0.5 + 0.5) * canvas.clientWidth;
  ctx.save();
  ctx.globalAlpha = 0.15;
  const grad = ctx.createLinearGradient(sweepX - 100, 0, sweepX + 100, 0);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.25)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(sweepX - 150, 0, 300, canvas.clientHeight);
  ctx.restore();

  requestAnimationFrame(draw);
}
function initCanvas() { resizeCanvas(); makeParticles(50); draw(); }
window.addEventListener('resize', () => { DPR = Math.max(1, window.devicePixelRatio || 1); resizeCanvas(); makeParticles(50); });
initCanvas();

/* ---------- intersection observer ---------- */
const observer = new IntersectionObserver(entries => {
  entries.forEach(ent => { if (ent.isIntersecting) { ent.target.classList.add('visible'); observer.unobserve(ent.target); } });
}, { threshold: 0.12 });
document.querySelectorAll('.card, .section-head, .map-wrap, .timeline-item').forEach(node => observer.observe(node));

/* ---------- init ---------- */
function initApp() {
  renderFilters();
  renderSectors(DATA.sectors);
  renderSkyline();
  renderAcademy();
  renderTimeline();
  renderNewsPage();
  renderNewsDetail();
  renderStats();
}

const card = document.createElement("div");
card.className = "card";

const thumb = document.createElement("div");
thumb.className = "thumb";

if(sector.image){
  const img = document.createElement("img");
  img.src = sector.image;
  img.alt = sector.title;
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.objectFit = "cover";
  thumb.appendChild(img);
}

card.appendChild(thumb);

fetch("data.json")
  .then(res => res.json())
  .then(data => {
    const container = document.querySelector("#sectors");
    data.sectors.forEach(sector => {
      const card = document.createElement("div");
      card.className = "card";

      // Şəkil üçün
      const thumb = document.createElement("div");
      thumb.className = "thumb";
      if(sector.image){
        const img = document.createElement("img");
        img.src = sector.image.trim(); // boşluq varsa kəs
        img.alt = sector.title;
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "cover";
        thumb.appendChild(img);
      }
      card.appendChild(thumb);

      // Başlıq
      const h4 = document.createElement("h4");
      h4.textContent = sector.title;
      card.appendChild(h4);

      // Qısa mətn
      const p = document.createElement("p");
      p.textContent = sector.short;
      card.appendChild(p);

      container.appendChild(card);
    });
  });

  const depthClass = i % 3 === 0 ? "front" : i % 3 === 1 ? "mid" : "back";
layer.classList.add(depthClass);

if(sectors[idx]?.image){
  const logo = document.createElement("img");
  logo.src = sectors[idx].image;
  logo.alt = sectors[idx].title;
  logo.className = "roof-logo";
  b.appendChild(logo);
}

const newsGrid = document.getElementById("news-grid");
function renderNews() {
  newsGrid.innerHTML = "";
  DATA.news.forEach(n => {
    const card = el("article", { class: "card", tabIndex: 0 },
      el("img", { src: n.image, alt: n.title, style: { width: "100%", borderRadius: "10px" } }),
      el("h4", {}, n.title),
      el("p", { class: "muted small" }, n.date),
      el("p", {}, n.excerpt)
    );
    addTilt(card);
    card.addEventListener("click", () => openModal("news", n));
    newsGrid.appendChild(card);
  });
  function openModal(type, data) {
  modalBody.innerHTML = "";
  modal.classList.add("show");

  if (type === "sector") {
    modalBody.appendChild(el("h2", {}, data.title));
    modalBody.appendChild(el("img", { src: data.image, alt: data.title, style: { width: "100%", borderRadius: "8px", margin: "1rem 0" } }));
    modalBody.appendChild(el("p", {}, data.description));
  } 
  else if (type === "academy") {
    modalBody.appendChild(el("h2", {}, data.title));
    modalBody.appendChild(el("p", {}, data.short));
    modalBody.appendChild(el("p", {}, "Level: " + data.level));
    modalBody.appendChild(el("p", {}, "Duration: " + data.duration));
  } 
  else if (type === "news") {
    modalBody.appendChild(el("h2", {}, data.title));
    modalBody.appendChild(el("img", { src: data.image, alt: data.title, style: { width: "100%", borderRadius: "8px", margin: "1rem 0" } }));
    modalBody.appendChild(el("p", { class: "muted small" }, data.date));
    modalBody.appendChild(el("p", {}, data.excerpt));
  }
}

}

function animateValue(el, start, end, duration, suffix="") {
  let startTime = null;
  function step(ts) {
    if(!startTime) startTime = ts;
    const progress = Math.min((ts - startTime) / duration, 1);
    const value = Math.floor(progress * (end - start) + start);
    el.textContent = value + suffix;
    if(progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function renderStats(){
  animateValue(document.getElementById("stat-population"), 0, DATA.stats.population, 2000);
  animateValue(document.getElementById("stat-green"), 0, DATA.stats.greenEnergy, 2000, "%");
  animateValue(document.getElementById("stat-vehicles"), 0, DATA.stats.aiVehicles, 2000);
  animateValue(document.getElementById("stat-health"), 0, DATA.stats.healthAI, 2000);
}

function renderNewsPage() {
  const wrap = document.getElementById("news-list");
  if (!wrap) return; // yalnız news.html-də işləsin

  wrap.innerHTML = "";
  DATA.news.forEach(n => {
    const card = el("article", { class: "card" }, [
      el("div", { class: "thumb", style: { background: `url(${n.image}) center/cover` } }),
      el("h2", {}, n.title),
      el("p", { class: "muted small" }, n.date),
      el("p", {}, n.excerpt),
      el("a", { class: "btn", href: `news-detail.html?id=${n.id}` }, "Ətraflı →")
    ]);
    wrap.appendChild(card);
  });
}

function renderNewsDetail() {
  const wrap = document.getElementById("news-detail");
  if (!wrap) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const news = DATA.news.find(n => n.id === id);

  if (!news) {
    wrap.innerHTML = "<p>Xəbər tapılmadı.</p>";
    return;
  }

  wrap.innerHTML = `
    <h1>${news.title}</h1>
    <p class="muted">${news.date}</p>
    <img src="${news.image}" alt="${news.title}" style="max-width:100%; border-radius:8px; margin:16px 0;">
    <p>${news.excerpt}</p>
    <p><em>Daha geniş məlumat əlavə edilə bilər…</em></p>
  `;
}

