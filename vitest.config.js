// Vitest configuration for the Expense & Budget Visualizer test suite.
//
// Test tooling lives at the project root, outside js/, so it does not affect
// the runtime zero-network-requests constraint (Requirement 7.4). The jsdom
// environment is configured so future renderer/controller integration tests
// can rely on a DOM; pure-function tests are unaffected by it because js/app.js
// guards all DOM initialization behind a `typeof document !== 'undefined'`
// check and a defensive init() that returns early when the form is absent.
const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.js'],
  },
});
