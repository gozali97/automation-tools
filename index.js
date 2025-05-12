/**
 * Main entry point for the website testing automation tool
 */
const TestRunner = require('./src/test-runner');

// Export the main classes for programmatic usage
module.exports = {
  TestRunner,
  BrowserManager: require('./src/modules/browser-manager'),
  AccessibilityTester: require('./src/modules/accessibility-tester'),
  FunctionalTester: require('./src/modules/functional-tester'),
  PerformanceTester: require('./src/modules/performance-tester'),
  ResponsiveTester: require('./src/modules/responsive-tester'),
  ReportGenerator: require('./src/utils/report-generator'),
  Logger: require('./src/utils/logger'),
  config: require('./src/config')
};
