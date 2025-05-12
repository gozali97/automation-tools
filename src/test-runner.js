/**
 * Main test runner for the website testing automation tool
 * Coordinates all testing modules and generates reports
 */
const BrowserManager = require('./modules/browser-manager');
const AccessibilityTester = require('./modules/accessibility-tester');
const FunctionalTester = require('./modules/functional-tester');
const PerformanceTester = require('./modules/performance-tester');
const ResponsiveTester = require('./modules/responsive-tester');
const ReportGenerator = require('./utils/report-generator');
const Logger = require('./utils/logger');
const config = require('./config');
const { URL } = require('url');

class TestRunner {
  constructor(options = {}) {
    this.options = {
      headless: 'new',
      defaultViewport: { width: 1366, height: 768 },
      defaultTimeout: config.timeouts.navigation,
      reportOptions: config.reports,
      ...options
    };
    
    this.logger = new Logger({
      logToFile: true,
      logFilePath: './logs'
    });
    
    this.reportGenerator = new ReportGenerator(this.options.reportOptions);
  }

  /**
   * Run all tests on a website
   * @param {string} url - The URL to test
   * @returns {Promise<Object>} - Test results and report paths
   */
  async runTests(url) {
    let browserManager = null;
    
    try {
      this.logger.section('Starting Website Testing');
      this.logger.info(`Testing URL: ${url}`);
      
      // Validate URL
      try {
        new URL(url);
      } catch (error) {
        throw new Error(`Invalid URL: ${url}`);
      }
      
      // Initialize browser
      browserManager = new BrowserManager({
        headless: this.options.headless,
        defaultViewport: this.options.defaultViewport,
        defaultTimeout: this.options.defaultTimeout
      });
      
      await browserManager.initialize();
      
      // Navigate to the URL
      const navigationSuccess = await browserManager.navigateTo(url);
      if (!navigationSuccess) {
        throw new Error(`Failed to navigate to ${url}`);
      }
      
      // Initialize testers
      const accessibilityTester = new AccessibilityTester(browserManager);
      const functionalTester = new FunctionalTester(browserManager);
      const performanceTester = new PerformanceTester(browserManager);
      const responsiveTester = new ResponsiveTester(browserManager, {
        takeScreenshots: true
      });
      
      // Run tests
      this.logger.section('Running Accessibility Tests');
      const accessibilityResults = await accessibilityTester.runTests();
      
      this.logger.section('Running Functional Tests');
      const functionalResults = await functionalTester.runTests();
      
      this.logger.section('Running Performance Tests');
      const performanceResults = await performanceTester.runTests(url);
      
      this.logger.section('Running Responsive Tests');
      const responsiveResults = await responsiveTester.runTests(url);
      
      // Collect all issues
      const allIssues = [
        ...(accessibilityResults.issues || []),
        ...(functionalResults.issues || []),
        ...(performanceResults.issues || []),
        ...(responsiveResults.issues || [])
      ];
      
      // Calculate summary statistics
      const summary = {
        totalPages: 1, // Currently only testing one page
        totalTests: 4, // Accessibility, functional, performance, responsive
        passedTests: [
          accessibilityResults.success,
          functionalResults.success,
          performanceResults.success,
          responsiveResults.success
        ].filter(Boolean).length,
        failedTests: [
          !accessibilityResults.success,
          !functionalResults.success,
          !performanceResults.success,
          !responsiveResults.success
        ].filter(Boolean).length
      };
      
      // Prepare final results
      const testResults = {
        url,
        timestamp: new Date().toISOString(),
        summary,
        performance: performanceResults.scores,
        issues: allIssues,
        details: {
          accessibility: accessibilityResults,
          functional: functionalResults,
          performance: performanceResults,
          responsive: responsiveResults
        }
      };
      
      // Generate report
      this.logger.section('Generating Report');
      const reportPaths = this.reportGenerator.generateReport(testResults, url);
      
      this.logger.success('Testing completed successfully');
      this.logger.info(`HTML Report: ${reportPaths.html}`);
      this.logger.info(`JSON Report: ${reportPaths.json}`);
      
      return {
        success: allIssues.length === 0,
        results: testResults,
        reportPaths
      };
    } catch (error) {
      this.logger.error(`Test runner error: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    } finally {
      // Clean up browser
      if (browserManager) {
        await browserManager.close();
      }
    }
  }
}

module.exports = TestRunner;
