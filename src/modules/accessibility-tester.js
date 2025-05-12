/**
 * Accessibility testing module for the website testing automation tool
 * Uses axe-core to perform accessibility testing
 */
const fs = require('fs-extra');
const path = require('path');
const Logger = require('../utils/logger');

class AccessibilityTester {
  constructor(browserManager, options = {}) {
    this.browserManager = browserManager;
    this.options = {
      includeWarnings: true,
      ...options
    };
    this.logger = new Logger();
  }

  /**
   * Run accessibility tests on the current page
   * @returns {Promise<Object>} - Accessibility test results
   */
  async runTests() {
    try {
      this.logger.info('Running accessibility tests...');
      
      // Inject axe-core into the page if not already present
      await this._injectAxeCore();
      
      // Run the accessibility tests
      const results = await this.browserManager.page.evaluate(() => {
        return new Promise(resolve => {
          axe.run()
            .then(results => resolve(results))
            .catch(err => resolve({ error: err.message }));
        });
      });
      
      if (results.error) {
        this.logger.error(`Accessibility testing error: ${results.error}`);
        return { success: false, error: results.error };
      }
      
      // Process the results
      const violations = results.violations || [];
      const warnings = this.options.includeWarnings ? (results.incomplete || []) : [];
      
      this.logger.info(`Found ${violations.length} accessibility violations and ${warnings.length} warnings`);
      
      // Format the issues
      const issues = [
        ...this._formatIssues(violations, 'error'),
        ...this._formatIssues(warnings, 'warning')
      ];
      
      return {
        success: violations.length === 0,
        issues,
        rawResults: results
      };
    } catch (error) {
      this.logger.error(`Failed to run accessibility tests: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Inject axe-core into the page
   * @private
   * @returns {Promise<void>}
   */
  async _injectAxeCore() {
    try {
      // Check if axe is already defined
      const axeAlreadyDefined = await this.browserManager.page.evaluate(() => {
        return typeof window.axe !== 'undefined';
      });
      
      if (axeAlreadyDefined) {
        return;
      }
      
      // Inject axe-core from node_modules
      const axePath = require.resolve('axe-core');
      const axeScript = fs.readFileSync(axePath, 'utf8');
      
      await this.browserManager.page.evaluate(axeScript);
      
      this.logger.info('Injected axe-core into the page');
    } catch (error) {
      this.logger.error(`Failed to inject axe-core: ${error.message}`);
      throw error;
    }
  }

  /**
   * Format accessibility issues
   * @private
   * @param {Array<Object>} issues - The issues to format
   * @param {string} severity - The severity level (error or warning)
   * @returns {Array<Object>} - Formatted issues
   */
  _formatIssues(issues, severity) {
    return issues.map(issue => {
      // Get the affected elements
      const nodes = issue.nodes || [];
      const elementCount = nodes.length;
      
      // Create a formatted issue object
      return {
        type: `Accessibility ${severity}: ${issue.id}`,
        description: issue.help || issue.description,
        severity,
        impact: issue.impact || 'minor',
        location: elementCount > 0 
          ? `${elementCount} element(s) affected` 
          : 'Unknown location',
        suggestion: issue.helpUrl 
          ? `See ${issue.helpUrl} for more information` 
          : 'Fix according to WCAG guidelines',
        elements: nodes.map(node => ({
          html: node.html,
          target: node.target
        }))
      };
    });
  }
}

module.exports = AccessibilityTester;
