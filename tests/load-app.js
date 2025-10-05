const fs = require('fs');
const path = require('path');
const vm = require('vm');

function createStubElement(tagName = 'div') {
  const listeners = new Map();
  const children = [];
  let innerHTML = '';
  const element = {
    tagName,
    children,
    style: {},
    className: '',
    textContent: '',
    value: '',
    onclick: null,
    download: '',
    href: '',
    dataset: {},
    _clicked: false,
    addEventListener: (type, fn) => {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    removeEventListener: () => {},
    dispatchEvent: (event) => {
      const list = listeners.get(event.type) || [];
      for (const fn of list) fn(event);
    },
    append: (...nodes) => { children.push(...nodes); },
    appendChild: (node) => { children.push(node); return node; },
    remove: () => {},
    setAttribute: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
    click: () => { element._clicked = true; },
    get firstChild() { return children[0] || null; },
    get innerHTML() { return innerHTML; },
    set innerHTML(value) { innerHTML = value; if (value === '') children.length = 0; }
  };
  Object.defineProperty(element, 'classList', {
    value: {
      add: (...classes) => {
        const current = new Set((element.className || '').split(/\s+/).filter(Boolean));
        for (const cls of classes) current.add(cls);
        element.className = Array.from(current).join(' ');
      },
      remove: (...classes) => {
        const blocked = new Set(classes);
        const next = (element.className || '').split(/\s+/).filter((cls) => cls && !blocked.has(cls));
        element.className = next.join(' ');
      },
      contains: (cls) => (element.className || '').split(/\s+/).includes(cls)
    },
    enumerable: true
  });
  return element;
}

function stubDocument() {
  const elements = Object.create(null);
  return {
    _elements: elements,
    createElement: (tagName) => createStubElement(tagName),
    getElementById: (id) => {
      if (!elements[id]) elements[id] = createStubElement();
      return elements[id];
    },
    addEventListener: () => {},
    removeEventListener: () => {}
  };
}

function stubLocalStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      store.set(key, String(value));
    },
    removeItem: (key) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    }
  };
}

class StubBlob {
  constructor(parts, options = {}) {
    this.parts = parts;
    this.type = options.type || '';
  }
}

const URLStub = {
  _counter: 0,
  createObjectURL() {
    this._counter += 1;
    return `blob:stub-${this._counter}`;
  },
  revokeObjectURL() {}
};

class StubFileReader {
  constructor() {
    this.onload = null;
    this.result = null;
  }
  readAsText() {
    throw new Error('FileReader.readAsText is not implemented in tests');
  }
}

function loadApp() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const match = html.match(/<script>([\s\S]*)<\/script>\s*<\/body>/);
  if (!match) {
    throw new Error('Unable to locate main script tag in index.html');
  }
  const scriptContent = match[1];

  const document = stubDocument();
  const localStorage = stubLocalStorage();

  const context = {
    console,
    document,
    localStorage,
    setTimeout,
    clearTimeout,
    confirm: () => true,
    alert: () => {},
    Blob: StubBlob,
    FileReader: StubFileReader,
    URL: URLStub,
    window: {},
    navigator: {}
  };

  context.window = context;
  context.window.document = document;
  context.window.localStorage = localStorage;
  context.window.scrollTo = () => {};
  context.window.__t = null;

  vm.createContext(context);
  vm.runInContext(scriptContent, context, { filename: 'index.html<script>' });

  return {
    app: context.window.NamesApp,
    context,
    elements: document._elements
  };
}

module.exports = { loadApp };
