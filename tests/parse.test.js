const { strict: assert } = require('assert');
const { loadApp } = require('./load-app');

test('parseCues trims separators and limits length', () => {
  const { app } = loadApp();
  const cues = Array.from(app.parseCues('  Alpha , Beta ; Gamma ,, Delta ; ; '));
  assert.deepStrictEqual(cues, ['Alpha', 'Beta', 'Gamma', 'Delta']);

  const dozen = Array.from(app.parseCues(Array.from({ length: 20 }, (_, i) => `item${i}`).join(',')));
  assert.equal(dozen.length, 12);
});

test('parseRelations splits dotted tuples', () => {
  const { app } = loadApp();
  const result = JSON.parse(JSON.stringify(app.parseRelations('Son.Walter.2012, Dog.Truddi , Daughter.mona.2012-08 , , Cousin ')));
  assert.deepStrictEqual(result, [
    { type: 'son', name: 'Walter', date: '2012' },
    { type: 'dog', name: 'Truddi', date: '' },
    { type: 'daughter', name: 'mona', date: '2012-08' },
    { type: 'cousin', name: '', date: '' }
  ]);
});

test('parseNameAndBirth extracts valid birth tokens only', () => {
  const { app } = loadApp();
  const parsedValid = app.parseNameAndBirth('Anna Schmidt, 1990-07-15');
  assert.deepStrictEqual({ name: parsedValid.name, birth: parsedValid.birth }, { name: 'Anna Schmidt', birth: '1990-07-15' });
  const parsedInvalid = app.parseNameAndBirth('  John   Doe  ,  invalid-date ');
  assert.deepStrictEqual({ name: parsedInvalid.name, birth: parsedInvalid.birth }, { name: 'John Doe', birth: '' });
});

test('calcAge respects upcoming birthdays', () => {
  const { app, context } = loadApp();
  const fixedTimestamp = new Date('2025-10-04T12:00:00Z').getTime();
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

  assert.equal(app.calcAge('2000-10-05'), 24, 'Birthday tomorrow should not have advanced age');
  assert.equal(app.calcAge('1980-05-01'), 45);
  assert.equal(app.calcAge('2050-01-01'), null, 'Future birth year rejected');
});
