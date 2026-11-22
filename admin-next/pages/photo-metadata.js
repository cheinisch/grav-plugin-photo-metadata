// Admin2-Seite „Foto-Metadaten“: Seiten durchsuchen, Bilder zeigen, Sidecar-YAML bearbeiten.
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
  .grid { display: grid; grid-template-columns: 260px 1fr 380px; gap: 16px; min-height: 70vh; }
  .col { border: 1px solid rgba(127,127,127,.3); border-radius: 8px; padding: 12px; overflow: auto; }
  h3 { margin: 0 0 8px; font-size: 13px; text-transform: uppercase; opacity: .7; }
  input[type=search], textarea { width: 100%; box-sizing: border-box; background: transparent; color: inherit;
    border: 1px solid rgba(127,127,127,.4); border-radius: 6px; padding: 6px; font: inherit; }
  textarea { min-height: 360px; font-family: ui-monospace, monospace; font-size: 12px; }
  .item { display: block; width: 100%; text-align: left; background: none; border: 0; color: inherit;
    padding: 6px 8px; border-radius: 6px; cursor: pointer; }
  .item:hover, .item.sel { background: rgba(127,127,127,.2); }
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
    this.state = { pages: [], filter: '', route: null, images: [], file: null, draft: '', msg: '', err: false };
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <style>${STYLE}</style>
      <div class="grid">
        <div class="col"><h3>Seiten</h3><input type="search" placeholder="Seite suchen…" data-filter><div data-pages></div></div>
        <div class="col"><h3>Bilder</h3><div data-images class="muted">Links eine Seite wählen.</div></div>
        <div class="col"><h3>Metadaten (YAML)</h3><div data-editor class="muted">Ein Bild wählen.</div><div class="msg" data-msg></div></div>
      </div>`;

    this.shadowRoot.querySelector('[data-filter]').addEventListener('input', (e) => {
      this.state.filter = e.target.value.toLowerCase();
      this.renderPages();
    });
    this.shadowRoot.querySelector('[data-pages]').addEventListener('click', (e) => {
      const b = e.target.closest('[data-route]');
      if (b) this.selectPage(b.dataset.route);
    });
    this.shadowRoot.querySelector('[data-images]').addEventListener('click', (e) => {
      const b = e.target.closest('[data-file]');
      if (b) this.selectImage(b.dataset.file);
    });
    this.shadowRoot.querySelector('[data-editor]').addEventListener('input', (e) => {
      if (e.target.matches('textarea')) this.state.draft = e.target.value;
    });
    this.shadowRoot.querySelector('[data-editor]').addEventListener('click', (e) => {
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

  renderPages() {
    const q = this.state.filter;
    const list = this.state.pages.filter((p) => !q || p.route.toLowerCase().includes(q) || String(p.title).toLowerCase().includes(q));
    this.shadowRoot.querySelector('[data-pages]').innerHTML = list.length
      ? list.map((p) => `<button class="item ${p.route === this.state.route ? 'sel' : ''}" data-route="${esc(p.route)}">
          ${esc(p.title)} <span class="muted">(${p.images})</span><br><span class="muted">${esc(p.route)}</span></button>`).join('')
      : '<p class="muted">Keine Seiten mit Bildern gefunden.</p>';
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
