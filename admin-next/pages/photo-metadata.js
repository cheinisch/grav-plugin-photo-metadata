// Admin2-Seite „Foto-Metadaten“: Seiten als Baum durchsuchen, Bilder zeigen, Sidecar-YAML bearbeiten.
// Die API liegt unter window.__GRAV_API_SERVER_URL + window.__GRAV_API_PREFIX,
// das Token steht in window.__GRAV_API_TOKEN (von Admin2 gesetzt).
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

const STYLE = `
  :host { display: block; font: 14px/1.4 system-ui, sans-serif; color: inherit; }
  .grid { display: grid; grid-template-columns: 300px 1fr 380px; gap: 16px; min-height: 70vh; }
  .col { border: 1px solid rgba(127,127,127,.3); border-radius: 8px; padding: 12px; overflow: auto; }
  h3 { margin: 0 0 8px; font-size: 13px; text-transform: uppercase; opacity: .7; }
  input[type=search], textarea { width: 100%; box-sizing: border-box; background: transparent; color: inherit;
    border: 1px solid rgba(127,127,127,.4); border-radius: 6px; padding: 6px; font: inherit; }
  textarea { min-height: 360px; font-family: ui-monospace, monospace; font-size: 12px; }
  .row { display: flex; align-items: center; gap: 2px; }
  .tog { background: none; border: 0; color: inherit; cursor: pointer; width: 20px; padding: 0; opacity: .7; }
  .tog.none { visibility: hidden; }
  .item { flex: 1; min-width: 0; text-align: left; background: none; border: 0; color: inherit;
    padding: 4px 6px; border-radius: 6px; cursor: pointer; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .item:hover, .item.sel { background: rgba(127,127,127,.2); }
  .item.dim { opacity: .55; }
  .kids { margin-left: 10px; padding-left: 8px; border-left: 1px solid rgba(127,127,127,.25); }
  .kids.hidden { display: none; }
  .thumbs { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; }
  .thumb { background: none; border: 2px solid transparent; border-radius: 6px; padding: 4px; color: inherit; cursor: pointer; }
  .thumb.sel { border-color: #7c5cff; }
  .thumb img { width: 100%; height: 90px; object-fit: cover; border-radius: 4px; display: block; }
  .thumb span { display: block; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  button.save { margin-top: 8px; padding: 6px 14px; border-radius: 6px; border: 0; cursor: pointer; background: #7c5cff; color: #fff; }
  .msg { margin-top: 8px; font-size: 13px; }
  .msg.err { color: #e5484d; } .muted { opacity: .6; font-size: 13px; }
`;

class PhotoMetadataPage extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.state = { pages: [], filter: '', route: null, images: [], file: null, draft: '', meta: null, msg: '', err: false };
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <style>${STYLE}</style>
      <div class="grid">
        <div class="col"><h3>Seiten</h3><input type="search" placeholder="Seite suchen…" data-filter><div data-pages></div></div>
        <div class="col"><h3>Bilder</h3><div data-images class="muted">Links eine Seite wählen.</div></div>
        <div class="col"><h3>Metadaten (YAML)</h3><div data-editor class="muted">Ein Bild wählen.</div><div class="msg" data-msg></div></div>
      </div>`;

    const root = this.shadowRoot;
    root.querySelector('[data-filter]').addEventListener('input', (e) => {
      this.state.filter = e.target.value.toLowerCase();
      this.renderPages();
    });
    root.querySelector('[data-pages]').addEventListener('click', (e) => {
      const tog = e.target.closest('[data-toggle]');
      if (tog) {
        tog.closest('.node').querySelector('.kids')?.classList.toggle('hidden');
        tog.textContent = tog.textContent === '▾' ? '▸' : '▾';
        return;
      }
      const b = e.target.closest('[data-route]');
      if (b) this.selectPage(b.dataset.route);
    });
    root.querySelector('[data-images]').addEventListener('click', (e) => {
      const b = e.target.closest('[data-file]');
      if (b) this.selectImage(b.dataset.file);
    });
    root.querySelector('[data-editor]').addEventListener('input', (e) => {
      if (e.target.matches('textarea')) this.state.draft = e.target.value;
    });
    root.querySelector('[data-editor]').addEventListener('click', (e) => {
      if (e.target.matches('[data-save]')) this.save();
    });

    this.loadPages();
  }

  async loadPages() {
    try {
      this.state.pages = await api('/photo-metadata/pages');
      this.renderPages();
    } catch (e) {
      this.flash(e.message, true);
    }
  }

  /** Baut aus der flachen Liste (Routen) einen Baum über die Pfad-Segmente. */
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

  /** Gibt HTML für einen Knoten zurück, leer wenn weder er noch ein Kind zum Filter passt. */
  renderNode(n, q) {
    const kids = n.children.map((c) => this.renderNode(c, q)).join('');
    const selfMatch = !q || n.title.toLowerCase().includes(q) || n.route.toLowerCase().includes(q);
    if (!selfMatch && !kids) return '';

    const sel = n.route === this.state.route ? ' sel' : '';
    const dim = n.images ? '' : ' dim';
    const count = n.images ? ` <span class="muted">(${n.images})</span>` : '';
    const tog = n.children.length
      ? `<button class="tog" data-toggle title="Aufklappen">▾</button>`
      : `<button class="tog none" tabindex="-1">▾</button>`;
    return `<div class="node">
      <div class="row">${tog}<button class="item${sel}${dim}" data-route="${esc(n.route)}" title="${esc(n.route)}">${esc(n.title)}${count}</button></div>
      ${kids ? `<div class="kids">${kids}</div>` : ''}
    </div>`;
  }

  renderPages() {
    const q = this.state.filter;
    const tree = this.buildTree(this.state.pages);
    const html = tree.map((n) => this.renderNode(n, q)).join('');
    this.shadowRoot.querySelector('[data-pages]').innerHTML = html
      || '<p class="muted">Keine Seiten mit Bildern gefunden.</p>';
  }

  async selectPage(route) {
    this.state.route = route;
    this.state.file = null;
    this.renderPages();
    this.shadowRoot.querySelector('[data-editor]').innerHTML = '<span class="muted">Ein Bild wählen.</span>';
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
      : '<span class="muted">Keine Bilder auf dieser Seite.</span>';
  }

  async selectImage(file) {
    this.state.file = file;
    this.renderImages();
    try {
      const meta = await api(`/photo-metadata/meta?route=${encodeURIComponent(this.state.route)}&file=${encodeURIComponent(file)}`);
      this.state.draft = meta.yaml;
      this.state.meta = meta;
      this.renderEditor();
    } catch (e) {
      this.flash(e.message, true);
    }
  }

  renderEditor() {
    const meta = this.state.meta;
    if (!meta) return;
    this.shadowRoot.querySelector('[data-editor]').innerHTML = `
      <p class="muted">${esc(meta.file)} · ${esc(meta.route)}</p>
      <textarea spellcheck="false">${esc(this.state.draft)}</textarea>
      <button class="save" data-save>Speichern</button>`;
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
      this.renderEditor();
      this.flash('Gespeichert.', false);
    } catch (e) {
      this.flash(e.message, true);
    }
  }

  flash(msg, err) {
    this.state.msg = msg;
    this.state.err = err;
    const box = this.shadowRoot.querySelector('[data-msg]');
    if (box) {
      box.textContent = msg || '';
      box.className = 'msg' + (err ? ' err' : '');
    }
  }
}

if (!customElements.get(TAG)) {
  customElements.define(TAG, PhotoMetadataPage);
}
