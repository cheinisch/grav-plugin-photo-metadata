// Admin2-Seite „Foto-Metadaten“. Layout und Farben folgen dem Admin2 (CSS-Variablen von Admin2
// vererben sich in den Shadow-DOM). Daten: window.__GRAV_API_SERVER_URL + __GRAV_API_PREFIX,
// Token in window.__GRAV_API_TOKEN, Admin-Basis in window.__GRAV_ADMIN_BASE.
//
// Seitenbaum: wie im Admin2 aus der API-Route GET /pages. Die oberste Ebene kommt mit root=true,
// Unterordner werden beim Öffnen mit children_of=<route> nachgeladen. Suche: search=<text>.
// Bilder: GET /photo-metadata/images (eigener Endpunkt, nur für die gewählte Seite).
const TAG = window.__GRAV_PAGE_TAG || 'grav-photo-metadata-page';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

async function request(path, opts = {}) {
  const base = (window.__GRAV_API_SERVER_URL || '') + (window.__GRAV_API_PREFIX || '/api/v1');
  const headers = { 'X-API-Token': window.__GRAV_API_TOKEN || '' };
  if (opts.body) headers['Content-Type'] = 'application/json';
  const res = await fetch(base + path, { ...opts, headers, credentials: 'same-origin' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.detail || json.title || `HTTP ${res.status}`);
  return json;
}

async function api(path, opts = {}) {
  return (await request(path, opts)).data;
}

// Blättert alle Seiten einer Abfrage durch (wie Admin2 mit per_page und page).
async function listPages(params) {
  const out = [];
  for (let page = 1; page <= 50; page++) {
    const qs = new URLSearchParams({ per_page: '100', page: String(page), sort: 'default', order: 'asc', ...params });
    const json = await request('/pages?' + qs);
    const data = Array.isArray(json.data) ? json.data : [];
    out.push(...data);
    const total = json.meta?.pagination?.total ?? 0;
    if (!data.length || out.length >= total) break;
  }
  return out;
}

const ICON_FILE = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v5h5"/></svg>';
const ICON_FOLDER = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';
const ICON_CHEV = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';

const STYLE = `
  :host { display: block; font: 14px/1.45 system-ui, -apple-system, sans-serif; color: var(--foreground, #09090b); }
  .frame { border: 1px solid var(--border, #e4e4e7); border-radius: var(--radius, .5rem); background: var(--card, #fff);
    color: var(--card-foreground, var(--foreground, #09090b)); overflow: hidden; }
  .bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 16px;
    border-bottom: 1px solid var(--border, #e4e4e7); font-size: 13px; }
  .crumbs { display: flex; gap: 6px; align-items: center; color: var(--muted-foreground, #71717a); min-width: 0; overflow: hidden; white-space: nowrap; }
  .crumbs b { color: var(--foreground, #09090b); font-weight: 600; }
  .body { display: grid; grid-template-columns: clamp(230px, 40%, 560px) minmax(0, 1fr) 340px; min-height: 68vh; }
  .left { border-right: 1px solid var(--border, #e4e4e7); min-height: 100%; min-width: 0; }
  .mcols { display: flex; overflow-x: auto; min-height: 100%; }
  .mcol { flex: 0 0 230px; border-right: 1px solid var(--border, #e4e4e7); overflow-y: auto; padding: 6px; }
  .mcol:last-child { border-right: 0; }
  .item { display: flex; align-items: center; gap: 8px; width: 100%; text-align: left; background: none; border: 0;
    color: inherit; padding: 6px 8px; border-radius: var(--radius-sm, 6px); cursor: pointer; font: inherit; }
  .item:hover { background: var(--muted, #f4f4f5); }
  .item.dim .t { opacity: .6; }
  .item.sel { background: var(--primary, #3c83f6); color: var(--primary-foreground, #fff); }
  .item .ico { display: inline-flex; opacity: .6; flex: 0 0 auto; }
  .item .ico.pub { color: #a855f7; opacity: 1; }
  .item.sel .ico.pub { color: inherit; }
  .item .txt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .item .t { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
  .item .p { font-size: 12px; opacity: .7; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .item .st { flex: 0 0 auto; font-size: 10px; line-height: 1; color: #22c55e; }
  .item .st.off { color: var(--muted-foreground, #71717a); }
  .item .chev { opacity: .5; display: inline-flex; }
  .main { padding: 14px; min-width: 0; }
  .thumbs { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; }
  .thumb { background: none; border: 2px solid transparent; border-radius: var(--radius, .5rem); padding: 4px; color: inherit; cursor: pointer; text-align: left; }
  .thumb:hover { background: var(--muted, #f4f4f5); }
  .thumb.sel { border-color: var(--primary, #3c83f6); }
  .thumb img { width: 100%; height: 96px; object-fit: cover; border-radius: var(--radius-sm, 6px); display: block; }
  .thumb span { display: block; margin-top: 4px; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .side { padding: 16px; overflow: auto; border-left: 1px solid var(--border, #e4e4e7); }
  .global { padding: 0 16px 10px; }
  .side h2 { margin: 0; font-size: 17px; font-weight: 600; overflow-wrap: anywhere; }
  .side .sub { color: var(--muted-foreground, #71717a); font-size: 12px; margin-top: 2px; overflow-wrap: anywhere; }
  .side .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
  .btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: var(--radius-sm, 6px);
    border: 1px solid var(--border, #e4e4e7); background: var(--card, #fff); color: inherit; cursor: pointer; font: inherit; font-size: 13px; text-decoration: none; }
  .btn.primary { background: var(--primary, #3c83f6); color: var(--primary-foreground, #fff); border-color: transparent; }
  .label { margin: 16px 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: var(--muted-foreground, #71717a); }
  textarea { width: 100%; box-sizing: border-box; min-height: 300px; background: transparent; color: inherit;
    border: 1px solid var(--input, #e4e4e7); border-radius: var(--radius-sm, 6px); padding: 8px; font: 12px/1.5 ui-monospace, monospace; }
  .preview { width: 100%; border-radius: var(--radius-sm, 6px); display: block; max-height: 200px; object-fit: contain; background: var(--muted, #f4f4f5); }
  .msg { margin-top: 8px; font-size: 13px; min-height: 1em; }
  .msg.err { color: #e5484d; }
  .muted { color: var(--muted-foreground, #71717a); font-size: 13px; }
  .pad { padding: 8px; margin: 0; }
  .empty { padding: 40px; text-align: center; color: var(--muted-foreground, #71717a); }
  .empty.err, .pad.err { color: #e5484d; }
  a { color: var(--primary, #a855f7); }
  .fmt { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 7px 14px; margin: 0; font-size: 13px; }
  .fmt dt { color: var(--muted-foreground, #71717a); white-space: nowrap; }
  .fmt dd { margin: 0; overflow-wrap: anywhere; }
  .chips { display: flex; flex-wrap: wrap; gap: 4px; }
  .chip { border: 1px solid var(--border, #e4e4e7); border-radius: 999px; padding: 0 8px; font-size: 12px; }
  details.raw { margin-top: 16px; }
  details.raw summary { cursor: pointer; color: var(--muted-foreground, #71717a); font-size: 12px; }
  .dlg { border: 1px solid var(--border, #e4e4e7); border-radius: var(--radius, .5rem); background: var(--card, #fff);
    color: var(--card-foreground, var(--foreground, #09090b)); padding: 0; width: min(960px, 94vw); max-height: 90vh; overflow: auto; box-sizing: border-box; }
  .ov { position: fixed; inset: 0; background: rgba(0, 0, 0, .55); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 16px; box-sizing: border-box; }
  .dlg form { padding: 18px; display: flex; flex-direction: column; gap: 12px; margin: 0; }
  .dlg h2 { margin: 0; font-size: 16px; font-weight: 600; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 14px; }
  .field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--muted-foreground, #71717a); }
  .field.wide { grid-column: 1 / -1; }
  .field input, .field textarea { font: 13px/1.4 system-ui, sans-serif; color: inherit; background: transparent;
    border: 1px solid var(--input, #e4e4e7); border-radius: var(--radius-sm, 6px); padding: 6px 8px; box-sizing: border-box; width: 100%; }
  .field textarea { min-height: 64px; resize: vertical; }
  .field textarea.mono { font: 12px/1.5 ui-monospace, monospace; min-height: 110px; }
  .dfoot { display: flex; justify-content: flex-end; gap: 8px; }
  .switches { flex-direction: row; gap: 22px; font-size: 13px; color: var(--foreground, inherit); }
  .sw { display: flex; align-items: center; gap: 6px; }
  .dhead { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
  .dbody { display: grid; grid-template-columns: 260px minmax(0, 1fr); gap: 18px; }
  .dleft { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
  .dleft .preview { max-height: none; }
  .dleft .btn { justify-content: center; }
  .dlg details summary { cursor: pointer; color: var(--muted-foreground, #71717a); font-size: 12px; }
  @media (max-width: 760px) { .dbody, .grid2 { grid-template-columns: 1fr; } }
`;

// Felder, die das Formular bearbeitet. Alle anderen Schlüssel stehen im JSON-Feld „Weitere Felder“.
// [Schlüssel, Beschriftung, Art, breite Spalte]. Art: 'text' oder 'area' (mehrzeilig).
const FIELD_DEFS = [
  ['alt', 'Alt-Text', 'text', true],
  ['title', 'Titel', 'text', true],
  ['caption', 'Bildunterschrift', 'area'],
  ['description', 'Beschreibung', 'area'],
  ['tags', 'Tags (kommagetrennt)', 'text', true],
  ['author', 'Autor', 'text'],
  ['copyright', 'Copyright', 'text'],
  ['camera', 'Kamera', 'text'],
  ['software', 'Software', 'text'],
  ['aperture', 'Blende', 'text'],
  ['exposure', 'Belichtung', 'text'],
  ['iso', 'ISO', 'text'],
  ['focalLength', 'Brennweite (mm)', 'text'],
  ['gps', 'GPS (Breite, Länge)', 'text', true],
  ['creationdate', 'Aufnahme (Unix-Zeit)', 'text'],
  ['Orientation', 'Ausrichtung', 'text'],
  ['ColorSpace', 'Farbraum', 'text'],
  ['horizontalResolution', 'Auflösung horizontal', 'text'],
  ['verticalResolution', 'Auflösung vertikal', 'text'],
];
const NUMERIC_FIELDS = ['iso', 'focalLength', 'creationdate', 'Orientation', 'ColorSpace', 'horizontalResolution', 'verticalResolution'];
// Schalter (Checkboxen) im Popup; Standard entspricht den globalen Plugin-Einstellungen.
const SWITCHES = [['allow_exif', 'EXIF-Daten erlauben', true], ['allow_gps', 'GPS erlauben', false]];
const FORM_FIELDS = [...FIELD_DEFS.map((d) => d[0]), ...SWITCHES.map((d) => d[0])];
// Reihenfolge und Beschriftung der aufbereiteten Anzeige.
const LABELS = [
  ['title', 'Titel'], ['caption', 'Beschreibung'], ['author', 'Autor'], ['keywords', 'Stichwörter'], ['tags', 'Tags'], ['copyright', 'Copyright'], ['camera', 'Kamera'], ['aperture', 'Blende'],
  ['creationdate', 'Aufnahme'], ['exposure', 'Belichtung'], ['iso', 'ISO'], ['focalLength', 'Brennweite'],
  ['software', 'Software'], ['gps', 'GPS'],
];
const KEY_RE = /^[A-Za-z_][A-Za-z0-9_-]*$/;

// Erzeugt YAML aus einem flachen Objekt. Strings als JSON (gültiges YAML), Listen als Blockliste.
function toYaml(obj) {
  const q = (k) => (KEY_RE.test(k) ? k : JSON.stringify(k));
  const scalar = (v) => (v === null || v === undefined ? 'null' : (typeof v === 'object' ? JSON.stringify(v) : (typeof v === 'string' ? JSON.stringify(v) : String(v))));
  return Object.entries(obj).map(([k, v]) => {
    if (Array.isArray(v)) return v.length ? `${q(k)}:\n${v.map((i) => `  - ${scalar(i)}`).join('\n')}` : `${q(k)}: []`;
    return `${q(k)}: ${scalar(v)}`;
  }).join('\n') + '\n';
}

function fmtDate(val) {
  const n = Number(val);
  const d = new Date(n > 1e11 ? n : n * 1000);
  return Number.isNaN(d.getTime()) ? String(val) : d.toLocaleString('de-DE');
}

function fmtSize(bytes) {
  if (bytes === null || bytes === undefined) return '–';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function gpsHtml(val) {
  const m = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/.exec(String(val));
  if (!m) return esc(val);
  const lat = Number(m[1]);
  const lon = Number(m[2]);
  return `${lat.toFixed(5)}, ${lon.toFixed(5)} · <a href="https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}" target="_blank" rel="noopener">Karte</a>`;
}

function formatRows(v) {
  const rows = [];
  for (const [k, label] of LABELS) {
    const val = v[k];
    if (val === undefined || val === null || val === '' || (Array.isArray(val) && !val.length)) continue;
    let html;
    if (k === 'keywords' || k === 'tags') html = `<span class="chips">${(Array.isArray(val) ? val : [val]).map((x) => `<span class="chip">${esc(x)}</span>`).join('')}</span>`;
    else if (k === 'creationdate') html = esc(fmtDate(val));
    else if (k === 'focalLength') html = esc(`${val} mm`);
    else if (k === 'gps') html = gpsHtml(val);
    else html = esc(Array.isArray(val) ? val.join(', ') : val);
    rows.push(`<dt>${label}</dt><dd>${html}</dd>`);
  }
  return rows.length ? `<dl class="fmt">${rows.join('')}</dl>` : '<p class="muted">Keine Metadaten gespeichert.</p>';
}

class PhotoMetadataPage extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.state = {
      roots: null, rootError: null,       // oberste Ebene (null = noch nicht geladen)
      nodes: new Map(),                   // route -> Knoten, für alle geladenen Seiten
      results: null,                      // Suchtreffer (null = keine Suche aktiv)
      filter: '', path: [],               // path = Auswahl je Spalte
      route: null, images: [], file: null, draft: '', meta: null, msg: '', err: false,
    };
    this.searchTimer = null;
    this.loadToken = 0;
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <style>${STYLE}</style>
      <div class="frame">
        <div class="bar">
          <div class="crumbs" data-crumbs></div>
          <input type="search" placeholder="Seite suchen…" data-filter style="width:220px;background:transparent;color:inherit;border:1px solid var(--input,#e4e4e7);border-radius:var(--radius-sm,6px);padding:5px 8px;font:inherit;font-size:13px">
        </div>
        <div class="body">
          <div class="left" data-pages></div>
          <div class="main" data-images><div class="empty">Links eine Seite wählen.</div></div>
          <div class="side" data-side><div class="empty">Ein Bild wählen, um die Metadaten zu bearbeiten.</div></div>
        </div>
        <div class="msg global" data-global></div>
      </div>`;
    this.renderCrumbs();

    const root = this.shadowRoot;
    root.querySelector('[data-filter]').addEventListener('input', (e) => {
      this.state.filter = e.target.value.trim();
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => this.runSearch(), 300);
    });
    root.querySelector('[data-pages]').addEventListener('click', (e) => {
      if (e.target.closest('[data-retry]')) return this.loadRoot();
      const b = e.target.closest('[data-route]');
      if (!b) return;
      this.open(Number(b.dataset.level), b.dataset.route);
    });
    root.querySelector('[data-images]').addEventListener('click', (e) => {
      const b = e.target.closest('[data-file]');
      if (b) this.selectImage(b.dataset.file);
    });
    root.querySelector('[data-side]').addEventListener('input', (e) => {
      if (e.target.matches('textarea')) this.state.draft = e.target.value;
    });
    root.querySelector('[data-side]').addEventListener('click', (e) => {
      if (e.target.closest('[data-form]')) {
        try { this.openForm(); } catch (err) { this.flash('Formular konnte nicht geöffnet werden: ' + err.message, true); }
        return;
      }
      if (e.target.matches('[data-save]')) this.save();
    });

    this.loadRoot();
  }

  register(p) {
    const node = {
      route: p.route,
      title: p.title || p.route,
      hasChildren: !!p.has_children,
      published: p.published !== false,
      ancestorOnly: !!p.ancestor_only,   // Ordner ohne eigene Seite (nur zum Öffnen)
      children: null,   // null = noch nicht geladen
      loading: false,
      error: null,
    };
    this.state.nodes.set(node.route, node);
    return node;
  }

  renderCrumbs() {
    const parts = ['<span>Foto-Metadaten</span>'];
    if (this.state.route) parts.push(`<span>${esc(this.state.route)}</span>`);
    if (this.state.file) parts.push(`<b>${esc(this.state.file)}</b>`);
    this.shadowRoot.querySelector('[data-crumbs]').innerHTML = parts.join(` <span style="opacity:.5">${ICON_CHEV}</span> `);
  }

  async loadRoot() {
    this.state.roots = null;
    this.state.rootError = null;
    this.renderPages();
    try {
      this.state.roots = (await listPages({ root: 'true' })).map((p) => this.register(p));
    } catch (e) {
      this.state.rootError = e.message;
    }
    this.renderPages();
  }

  async loadChildren(node) {
    node.loading = true;
    node.error = null;
    this.renderPages();
    try {
      node.children = (await listPages({ children_of: node.route })).map((p) => this.register(p));
    } catch (e) {
      node.error = e.message;
    } finally {
      node.loading = false;
      this.renderPages();
    }
  }

  async runSearch() {
    const q = this.state.filter;
    if (!q) {
      this.state.results = null;
      return this.renderPages();
    }
    this.state.results = null;
    this.renderPages();
    try {
      const found = (await listPages({ search: q })).map((p) => this.register(p));
      if (q !== this.state.filter) return;   // veraltete Antwort verwerfen
      this.state.results = found;
    } catch (e) {
      if (q !== this.state.filter) return;
      this.state.results = [];
      this.flash(e.message, true);
    }
    this.renderPages();
  }

  // Klick auf eine Seite in Spalte `level`: Pfad setzen, Kinder laden, Bilder zeigen.
  async open(level, route) {
    this.state.path = [...this.state.path.slice(0, level), route];
    const node = this.state.nodes.get(route);
    if (node && node.hasChildren && node.children === null && !node.loading) {
      this.loadChildren(node);
    }
    this.renderPages();
    this.selectPage(route);
  }

  renderPages() {
    const s = this.state;
    const box = this.shadowRoot.querySelector('[data-pages]');

    if (s.roots === null && !s.rootError) {
      box.innerHTML = '<div class="empty">Lade Seiten…</div>';
      return;
    }
    if (s.rootError) {
      box.innerHTML = `<div class="empty err">${esc(s.rootError)}<br><br><button class="btn" data-retry>Erneut laden</button></div>`;
      return;
    }

    const itemHtml = (n, level, onPath) => {
      const sel = onPath ? ' sel' : '';
      const dim = n.ancestorOnly ? ' dim' : '';
      const chev = n.hasChildren ? `<span class="chev">${ICON_CHEV}</span>` : '';
      const icon = n.hasChildren ? ICON_FOLDER : ICON_FILE;
      const pub = n.published ? ' pub' : '';
      const st = n.published
        ? '<span class="st" title="Veröffentlicht">●</span>'
        : '<span class="st off" title="Nicht veröffentlicht">○</span>';
      return `<button class="item${sel}${dim}" data-route="${esc(n.route)}" data-level="${level}" title="${esc(n.route)}">
        <span class="ico${pub}">${icon}</span>
        <span class="txt"><span class="t">${esc(n.title)}</span><span class="p">${esc(n.route)}</span></span>${st}${chev}</button>`;
    };

    const q = s.filter;
    let columns;
    if (q) {
      if (s.results === null) {
        columns = [{ message: 'Suche läuft…' }];
      } else {
        columns = [{ items: s.results }];
      }
    } else {
      columns = [{ items: s.roots }];
      s.path.forEach((route) => {
        const node = s.nodes.get(route);
        if (!node || !node.hasChildren) return;
        if (node.loading) columns.push({ message: 'Lade…' });
        else if (node.error) columns.push({ message: node.error, err: true });
        else if (node.children) columns.push({ items: node.children });
      });
    }

    const html = columns.map((col, level) => {
      if (col.message) {
        return `<div class="mcol"><p class="muted pad${col.err ? ' err' : ''}">${esc(col.message)}</p></div>`;
      }
      return `<div class="mcol">${col.items.map((n) =>
        itemHtml(n, level, !q && s.path[level] === n.route)).join('')}</div>`;
    }).join('');

    const none = !q && s.roots.length === 0 ? '<p class="empty">Keine Seiten gefunden.</p>' : '';
    box.innerHTML = `<div class="mcols">${html}</div>${none}`;
  }

  async selectPage(route) {
    const token = ++this.loadToken;
    const node = this.state.nodes.get(route);
    this.state.route = route;
    this.state.file = null;
    this.state.meta = null;
    this.state.images = [];
    this.renderCrumbs();
    this.shadowRoot.querySelector('[data-side]').innerHTML = '<div class="empty">Ein Bild wählen, um die Metadaten zu bearbeiten.</div>';
    const box = this.shadowRoot.querySelector('[data-images]');
    if (node && node.ancestorOnly) {
      box.innerHTML = '<div class="empty">Dieser Ordner hat keine eigene Seite. Wähle eine Unterseite.</div>';
      return;
    }
    box.innerHTML = '<div class="empty">Lade Bilder…</div>';
    try {
      const images = await api('/photo-metadata/images?route=' + encodeURIComponent(route));
      if (token !== this.loadToken) return;
      this.state.images = images;
      this.renderImages();
    } catch (e) {
      if (token !== this.loadToken) return;
      box.innerHTML = `<div class="empty err">${esc(e.message)}</div>`;
    }
  }

  renderImages() {
    const box = this.shadowRoot.querySelector('[data-images]');
    box.innerHTML = this.state.images.length
      ? `<div class="thumbs">${this.state.images.map((i) => `
          <button class="thumb ${i.file === this.state.file ? 'sel' : ''}" data-file="${esc(i.file)}">
            <img src="${esc(i.url)}" alt="" loading="lazy"><span>${esc(i.file)}</span>
          </button>`).join('')}</div>`
      : '<div class="empty">Keine Bilder auf dieser Seite.</div>';
  }

  async selectImage(file) {
    this.state.file = file;
    this.renderImages();
    this.renderCrumbs();
    try {
      const meta = await api(`/photo-metadata/meta?route=${encodeURIComponent(this.state.route)}&file=${encodeURIComponent(file)}`);
      this.state.draft = meta.yaml;
      this.state.meta = meta;
      this.renderSide();
    } catch (e) {
      this.flash(e.message, true);
    }
  }

  renderSide() {
    const meta = this.state.meta;
    if (!meta) return;
    const admin = window.__GRAV_ADMIN_BASE || '/admin';
    const editUrl = `${admin}/pages/edit${meta.route}`;
    const page = this.state.nodes.get(meta.route);
    this.shadowRoot.querySelector('[data-side]').innerHTML = `
      <div class="head">
        <div style="min-width:0"><h2>${esc(page ? page.title : meta.file)}</h2><div class="sub">${esc(meta.route)}</div></div>
        <div style="display:flex;gap:6px;flex:0 0 auto">
          <button class="btn primary" data-form>Metadaten bearbeiten</button>
        </div>
      </div>
      <div class="label">Bild</div>
      <img class="preview" src="${esc(meta.url)}" alt="">
      <div class="sub" style="margin-top:4px">${esc(meta.file)}</div>
      <div class="label">Metadaten</div>
      ${formatRows(meta.values || {})}
      <details class="raw">
        <summary>YAML-Rohdaten</summary>
        <textarea spellcheck="false" style="width:100%;box-sizing:border-box;min-height:220px;margin-top:8px;background:transparent;color:inherit;border:1px solid var(--input,#e4e4e7);border-radius:var(--radius-sm,6px);padding:8px;font:12px/1.5 ui-monospace,monospace">${esc(this.state.draft)}</textarea>
        <div style="margin-top:8px"><button class="btn" data-save>Speichern</button></div>
      </details>
      <div class="msg" data-msg></div>`;
    this.flash(this.state.msg, this.state.err);
  }

  async putMeta(yaml) {
    return api('/photo-metadata/meta', {
      method: 'PUT',
      body: JSON.stringify({ route: this.state.route, file: this.state.file, yaml }),
    });
  }

  async save(yaml = this.state.draft) {
    try {
      const meta = await this.putMeta(yaml);
      this.state.meta = meta;
      this.state.draft = meta.yaml;
      this.renderSide();
      this.flash('Gespeichert.', false);
    } catch (e) {
      this.flash(e.message, true);
    }
  }

  openForm() {
    const meta = this.state.meta;
    if (!meta) return;
    const v = meta.values || {};
    const info = meta.info || {};
    const rest = {};
    Object.keys(v).forEach((k) => { if (!FORM_FIELDS.includes(k)) rest[k] = v[k]; });
    const field = ([key, label, kind, wide]) => {
      const val = Array.isArray(v[key]) ? v[key].join(', ') : (v[key] ?? '');
      const cls = `field${wide || kind === 'area' ? ' wide' : ''}`;
      return kind === 'area'
        ? `<label class="${cls}"><span>${label}</span><textarea name="${key}">${esc(val)}</textarea></label>`
        : `<label class="${cls}"><span>${label}</span><input name="${key}" value="${esc(val)}"></label>`;
    };
    const sw = ([name, label, def]) =>
      `<label class="sw"><input type="checkbox" name="${name}"${(v[name] ?? def) ? ' checked' : ''}> ${label}</label>`;
    const dims = info.width && info.height ? `${info.width} × ${info.height}` : '–';

    const d = this.shadowRoot.querySelector('[data-dialog]');
    if (d) d.remove();
    this.shadowRoot.querySelector('.frame').insertAdjacentHTML('beforeend', `
      <div class="ov" data-dialog><div class="dlg">
        <form data-form-el>
          <div class="dhead">
            <div><h2>${esc(meta.file)}</h2><div class="sub">Datei-Details und Metadaten</div></div>
            <button type="button" class="btn" data-cancel>Schließen</button>
          </div>
          <div class="dbody">
            <div class="dleft">
              <img class="preview" src="${esc(meta.url)}" alt="">
              <dl class="fmt">
                <dt>Pfad</dt><dd>${esc(meta.route)}</dd>
                <dt>Größe</dt><dd>${esc(fmtSize(info.size))}</dd>
                <dt>Maße</dt><dd>${esc(dims)}</dd>
                <dt>Geändert</dt><dd>${esc(info.modified ? fmtDate(info.modified) : '–')}</dd>
              </dl>
              <button type="button" class="btn" data-copy="${esc(meta.url)}">URL kopieren</button>
              <button type="button" class="btn" data-copy="![${esc(v.alt || v.title || meta.file)}](${esc(meta.url)})">Markdown kopieren</button>
            </div>
            <div class="grid2">
              ${FIELD_DEFS.map(field).join('')}
              <div class="field wide switches">${SWITCHES.map(sw).join('')}</div>
            </div>
          </div>
          <details>
            <summary>Weitere Felder (JSON-Objekt)</summary>
            <textarea class="mono" name="rest" style="width:100%;box-sizing:border-box;margin-top:8px;background:transparent;color:inherit;border:1px solid var(--input,#e4e4e7);border-radius:var(--radius-sm,6px);padding:8px;font:12px/1.5 ui-monospace,monospace;min-height:110px">${esc(JSON.stringify(rest, null, 2))}</textarea>
          </details>
          <div class="msg err" data-dmsg></div>
          <div class="dfoot">
            <button type="reset" class="btn">Zurücksetzen</button>
            <button type="button" class="btn primary" data-dsave>Speichern</button>
          </div>
        </form>
      </div></div>`);
    const dlg = this.shadowRoot.querySelector('[data-dialog]');
    dlg.querySelector('[data-cancel]').addEventListener('click', () => dlg.remove());
    dlg.querySelector('[data-dsave]').addEventListener('click', () => this.saveForm(dlg));
    dlg.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', () => {
      navigator.clipboard?.writeText(b.dataset.copy).then(() => this.flash('Kopiert.', false), () => this.flash('Kopieren nicht möglich.', true));
    }));
  }

  async saveForm(dlg) {
    const f = dlg.querySelector('form');
    const el = (n) => f.elements[n];
    const dmsg = dlg.querySelector('[data-dmsg]');
    let out;
    try {
      out = JSON.parse(el('rest').value || '{}');
      if (!out || typeof out !== 'object' || Array.isArray(out)) throw new Error('nicht-objekt');
    } catch (e) {
      dmsg.textContent = 'Die weiteren Felder müssen ein JSON-Objekt sein.';
      return;
    }
    // Leere Felder werden nicht gespeichert, also aus der Datei entfernt.
    for (const [key] of FIELD_DEFS) {
      const raw = String(el(key).value ?? '').trim();
      if (raw === '') continue;
      if (key === 'tags') out.tags = raw.split(',').map((x) => x.trim()).filter(Boolean);
      else if (NUMERIC_FIELDS.includes(key)) out[key] = /^-?\d+(\.\d+)?$/.test(raw) ? Number(raw) : raw;
      else out[key] = raw;
    }
    for (const [name] of SWITCHES) out[name] = el(name).checked;

    const yaml = Object.keys(out).length ? toYaml(out) : '';
    try {
      const meta = await this.putMeta(yaml);
      this.state.meta = meta;
      this.state.draft = meta.yaml;
      dlg.remove();
      this.renderSide();
      this.flash('Gespeichert.', false);
    } catch (e) {
      dmsg.textContent = e.message;
    }
  }

  flash(msg, err) {
    this.state.msg = msg;
    this.state.err = err;
    this.shadowRoot.querySelectorAll('[data-msg],[data-global]').forEach((box) => {
      box.textContent = msg || '';
      box.className = 'msg' + (err ? ' err' : '') + (box.hasAttribute('data-global') ? ' global' : '');
    });
  }
}

if (!customElements.get(TAG)) {
  customElements.define(TAG, PhotoMetadataPage);
}
