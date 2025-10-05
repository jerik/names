const { strict: assert } = require('assert');
const { loadApp } = require('./load-app');

function useFixedDate(context, isoString) {
  const fixedTimestamp = new Date(isoString).getTime();
  class FixedDate extends Date {
    constructor(...args) {
      if (args.length === 0) {
        super(fixedTimestamp);
      } else {
        super(...args);
      }
    }
    static now() {
      return fixedTimestamp;
    }
  }
  context.Date = FixedDate;
}

test('birthStatus surfaces badges for imminent birthdays', () => {
  const { app, context } = loadApp();
  useFixedDate(context, '2025-10-04T12:00:00Z');

  const today = app.birthStatus('1990-10-04');
  assert.ok(today);
  assert.equal(today.age, 35);
  assert.ok(today.monthHit);
  assert.equal(today.badge.cls, 'today');
  assert.equal(today.badge.text, '🎂 Heute');

  const tomorrow = app.birthStatus('1990-10-05');
  assert.ok(tomorrow.badge);
  assert.equal(tomorrow.badge.cls, 'soon1');

  const twoDays = app.birthStatus('1990-10-06');
  assert.ok(twoDays.badge);
  assert.equal(twoDays.badge.cls, 'soon2');

  const monthOnly = app.birthStatus('1985-10');
  assert.ok(monthOnly.monthHit);
  assert.equal(monthOnly.badge, null);
});

test('importJSON merges by name and preserves data', () => {
  const { app, context, elements } = loadApp();

  const base = [{
    id: 'existing-1',
    name: 'Alice Example',
    birth: '',
    cues: ['existing'],
    relations: [{ type: 'son', name: 'Bob', date: '' }],
    createdAt: '2025-01-01T00:00:00.000Z'
  }];
  app.saveAll(base);

  const payload = JSON.stringify([
    {
      name: 'Alice Example',
      cues: ['new'],
      relations: [{ type: 'dog', name: 'Rex', date: '' }]
    },
    {
      name: 'Charlie Example',
      birth: '1995',
      cues: ['friend'],
      relations: []
    }
  ]);

  class MockFileReader {
    constructor() {
      this.onload = null;
    }
    readAsText() {
      if (typeof this.onload === 'function') {
        this.onload({ target: { result: payload } });
      }
    }
  }
  context.FileReader = MockFileReader;

  app.importJSON({ name: 'dummy.json' });

  const items = app.load();
  assert.equal(items.length, 2);

  const alice = items.find((it) => it.name === 'Alice Example');
  assert.deepStrictEqual(Array.from(alice.cues), ['existing', 'new']);
  assert.equal(alice.relations.length, 2);
  assert(alice.relations.some((r) => r.type === 'dog' && r.name === 'Rex'));

  const charlie = items.find((it) => it.name === 'Charlie Example');
  assert.ok(charlie.id);
  assert.equal(charlie.birth, '1995');
  assert.deepStrictEqual(Array.from(charlie.cues), ['friend']);

  assert.equal(elements.list.children.length, 2);
  assert.equal(elements.empty.style.display, 'none');
});

test('render filters entries by cues and relations', () => {
  const { app, elements } = loadApp();
  const data = [
    {
      id: 'id-1',
      name: 'Thomas Gutsche',
      birth: '1978',
      cues: ['hannover', 'verein'],
      relations: [],
      createdAt: '2025-10-02T22:17:29.302Z'
    },
    {
      id: 'id-2',
      name: 'Acel Schulze',
      birth: '',
      cues: ['dvag'],
      relations: [{ type: 'kollege', name: 'Mark', date: '' }],
      createdAt: '2025-10-02T22:10:10.000Z'
    }
  ];
  app.saveAll(data);

  app.render('hannover');
  assert.equal(elements.list.children.length, 1);
  const firstRow = elements.list.children[0];
  const head = firstRow.children.find((child) => (child.className || '').includes('itemHead')) || firstRow.children[0];
  const nameLabel = head.children.find((child) => (child.className || '').includes('name')) || head.children[0];
  assert.equal(nameLabel.textContent.includes('Thomas Gutsche'), true);
  assert.equal(elements.empty.style.display, 'none');

  app.render('mark');
  assert.equal(elements.list.children.length, 1);
  const relationRow = elements.list.children[0];
  const chipContainers = relationRow.children.filter((child) => Array.isArray(child.children) && child.children.length);
  const relationContainer = chipContainers.find((container) => container.children.some((chip) => chip.textContent.includes('Kollege Mark')));
  assert.ok(relationContainer, 'Expected relation chip with Kollege Mark');

  app.render('');
  assert.equal(elements.list.children.length, 2);
});
