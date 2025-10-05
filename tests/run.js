const path = require('path');
const fs = require('fs');

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

global.test = test;

global.describe = (name, fn) => {
  fn();
};

global.beforeEach = () => {};

global.afterEach = () => {};

global.it = test;

const testFiles = fs
  .readdirSync(__dirname)
  .filter((file) => file.endsWith('.test.js'))
  .map((file) => path.join(__dirname, file));

for (const file of testFiles) {
  require(file);
}

(async () => {
  let failed = 0;
  for (const { name, fn } of tests) {
    try {
      const result = fn();
      if (result && typeof result.then === 'function') {
        await result;
      }
      process.stdout.write(`\x1b[32m✓\x1b[0m ${name}\n`);
    } catch (err) {
      failed += 1;
      process.stderr.write(`\x1b[31m✗ ${name}\x1b[0m\n`);
      process.stderr.write(`${err.stack || err.message}\n`);
    }
  }
  if (failed > 0) {
    process.exitCode = 1;
  }
})();
