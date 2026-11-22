// Admin2-Seite „Foto-Metadaten“. Layout und Farben folgen dem Admin2 (CSS-Variablen von Admin2
// vererben sich in den Shadow-DOM). Daten: window.__GRAV_API_SERVER_URL + __GRAV_API_PREFIX,
// Token in window.__GRAV_API_TOKEN, Admin-Basis in window.__GRAV_ADMIN_BASE.
const TAG = window.__GRAV_PAGE_TAG || 'grav-photo-metadata-page';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

async function api(path, opts = {}) {
  const base = (window.__GRAV_API_SERVER_URL || '') + (window.__GRAV_API_PREFIX || '/api/v1');
  const headers = { 'X-API-Token': window.__GRAV_API_TOKEN || '' };
  if (opts.body) headers['Content-Type'] = 'application/json';
  const res = await fetch(base + path, { ...opts, headers, credentials: 'same-origin' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.detail || json.title || `HTTP ${res.status}`);
  return json.data;
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
  .body { display: grid; grid-template-columns: auto minmax(0, 1fr) 340px; min-height: 68vh; }
  .left { border-right: 1px solid var(--border, #e4e4e7); min-height: 100%; }
  .mcols { display: flex; overflow-x: auto; min-height: 100%; }
  .mcol { flex: 0 0 230px; border-right: 1px solid var(--border, #e4e4e7); overflow-y: auto; padding: 6px; }
  .mcol:last-child { border-right: 0; }
  .item { display: flex; align-items: center; gap: 8px; width: 100%; text-align: left; background: none; border: 0;
    color: inherit; padding: 6px 8px; border-radius: var(--radius-sm, 6px); cursor: pointer; font: inherit; }
  .item:hover { background: var(--muted, #f4f4f5); }
  .item.sel { background: var(--primary, #3c83f6); color: var(--primary-foreground, #fff); }
  .item .ico { display: inline-flex; opacity: .7; flex: 0 0 auto; }
  .item .t { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
  .item .r { font-size: 12px; opacity: .75; }
  .item .chev { opacity: .5; display: inline-flex; }
  .item.dim .t { opacity: .6; }
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
  .empty { padding: 40px; text-align: center; color: var(--muted-foreground, #71717a); }
`;

class PhotoMetadataPage extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.state = { pages: [], filter: '', path: [], route: null, images: [], file: null, draft: '', meta: null, msg: '', err: false };
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
      this.state.filter = e.target.value.toLowerCase();
      this.renderPages();
    });
    root.querySelector('[data-pages]').addEventListener('click', (e) => {
      const b = e.target.closest('[data-route]');
      if (!b) return;
      const level = Number(b.dataset.level);
      const route = b.dataset.route;
      this.state.path = [...this.state.path.slice(0, level), route];
      const node = this.findNode(route);
      if (node && node.images) this.selectPage(route); else this.renderPages();
    });
    root.querySelector('[data-images]').addEventListener('click', (e) => {
      const b = e.target.closest('[data-file]');
      if (b) this.selectImage(b.dataset.file);
    });
    root.querySelector('[data-side]').addEventListener('input', (e) => {
      if (e.target.matches('textarea')) this.state.draft = e.target.value;
    });
    root.querySelector('[data-side]').addEventListener('click', (e) => {
      if (e.target.matches('[data-save]')) this.save();
    });

    this.loadPages();
  }

  renderCrumbs() {
    const parts = ['<span>Foto-Metadaten</span>'];
    if (this.state.route) parts.push(`<span>${esc(this.state.route)}</span>`);
    if (this.state.file) parts.push(`<b>${esc(this.state.file)}</b>`);
    this.shadowRoot.querySelector('[data-crumbs]').innerHTML = parts.join(` <span style="opacity:.5">${ICON_CHEV}</span> `);
  }

  async loadPages() {
    try {
      this.state.pages = await api('/photo-metadata/pages');
      this.renderPages();
    } catch (e) {
      this.flash(e.message, true);
    }
  }

  buildTree(list) {
    const nodes = new Map();
    list.forEach((p) => nodes.set(p.route, { ...p, children: [] }));
    const roots = [];
    nodes.forEach((n) => {
      const parts = n.route.split('/').filter(Boolean);
      const parent = parts.length > 1 ? nodes.get('/' + parts.slice(0, -1).join('/')) : null;
      (parent ? parent.children : roots).push(n);
    });
    return roots;
  }

  findNode(route) {
    const walk = (n) => [n, ...n.children.flatMap(walk)];
    return this.buildTree(this.state.pages).flatMap(walk).find((n) => n.route === route) || null;
  }

  renderPages() {
    const q = this.state.filter;
    const tree = this.buildTree(this.state.pages);
    const itemHtml = (n, level, onPath) => {
      const isFolder = n.children.length > 0;
      const dim = n.images ? '' : ' dim';
      const sel = onPath ? ' sel' : '';
      const count = n.images ? `<span class="r">${n.images}</span>` : '';
      const chev = isFolder ? `<span class="chev">${ICON_CHEV}</span>` : '';
      return `<button class="item${sel}${dim}" data-route="${esc(n.route)}" data-level="${level}" title="${esc(n.route)}">
        <span class="ico">${isFolder ? ICON_FOLDER : ICON_FILE}</span><span class="t">${esc(n.title)}</span>${count}${chev}</button>`;
    };

    let columns;
    if (q) {
      const flat = this.state.pages.filter((p) => p.route.toLowerCase().includes(q) || String(p.title).toLowerCase().includes(q));
      columns = [flat.map((p) => ({ ...p, children: [] }))];
    } else {
      columns = [tree];
      this.state.path.forEach((route) => {
        const node = this.findNode(route);
        if (node && node.children.length) columns.push(node.children);
      });
    }

    const html = columns.map((list, level) => `<div class="mcol">${list.map((n) =>
      itemHtml(n, level, !q && this.state.path[level] === n.route)).join('')}</div>`).join('');
    this.shadowRoot.querySelector('[data-pages]').innerHTML = `<div class="mcols">${html}</div>`
      + (columns[0].length ? '' : '<p class="empty">Keine Seiten mit Bildern gefunden.</p>');
  }

  async selectPage(route) {
    this.state.route = route;
    this.state.file = null;
    this.state.meta = null;
    this.renderPages();
    this.renderCrumbs();
    this.shadowRoot.querySelector('[data-side]').innerHTML = '<div class="empty">Ein Bild wählen, um die Metadaten zu bearbeiten.</div>';
    try {
      this.state.images = await api('/photo-metadata/images?route=' + encodeURIComponent(route));
      this.renderImages();
    } catch (e) {
      this.flash(e.message, true);
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
    const page = this.state.pages.find((p) => p.route === meta.route);
    this.shadowRoot.querySelector('[data-side]').innerHTML = `
      <div class="head">
        <div style="min-width:0"><h2>${esc(page ? page.title : meta.file)}</h2><div class="sub">${esc(meta.route)}</div></div>
        <a class="btn" href="${esc(editUrl)}">Edit</a>
      </div>
      <div class="label">Bild</div>
      <img class="preview" src="${esc(meta.url)}" alt="">
      <div class="sub" style="margin-top:4px">${esc(meta.file)}</div>
      <div class="label">Metadaten (YAML)</div>
      <textarea spellcheck="false">${esc(this.state.draft)}</textarea>
      <div style="margin-top:8px"><button class="btn primary" data-save>Speichern</button></div>
      <div class="msg" data-msg></div>`;
    this.flash(this.state.msg, this.state.err);
  }

  async save() {
    try {
      const meta = await api('/photo-metadata/meta', {
        method: 'PUT',
        body: JSON.stringify({ route: this.state.route, file: this.state.file, yaml: this.state.draft }),
      });
      this.state.meta = meta;
      this.state.draft = meta.yaml;
      this.renderSide();
      this.flash('Gespeichert.', false);
    } catch (e) {
      this.flash(e.message, true);
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
