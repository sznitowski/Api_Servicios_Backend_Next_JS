// test/jest-sequencer.cjs
const { default: Sequencer } = require('@jest/test-sequencer');

const ORDER = [
  'auth.refresh.e2e-spec.ts',
  'catalog.e2e-spec.ts',
  'providers.e2e-spec.ts',
  'requests-validation.e2e-spec.ts',
  'requests-transitions.e2e-spec.ts',
  'messages.e2e-spec.ts',
  'notifications.prefs.e2e-spec.ts',
  'notifications.badge.e2e-spec.ts',
  'notifications.clear.e2e-spec.ts',
  'notifications.e2e-spec.ts',
  'users.addresses.e2e-spec.ts',
  'app.e2e-spec.ts',
];

class CustomSequencer extends Sequencer {
  sort(tests) {
    const fileName = (p) => p.replace(/\\/g, '/').split('/').pop();
    const idx = (p) => {
      const i = ORDER.indexOf(fileName(p));
      return i === -1 ? ORDER.length + 1 : i;
    };
    return Array.from(tests).sort((a, b) => {
      const da = idx(a.path);
      const db = idx(b.path);
      if (da !== db) return da - db;
      return a.path.localeCompare(b.path);
    });
  }
}

module.exports = CustomSequencer;
