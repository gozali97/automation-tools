/**
 * Performance testing module for the website testing automation tool
 * Uses browser metrics for performance testing
 */
const { URL } = require('url');
const Logger = require('../utils/logger');
const config = require('../config');

class PerformanceTester {
  constructor(browserManager, options = {}) {
    this.browserManager = browserManager;
    this.options = {
      thresholds: config.performance.thresholds,
      ...options
    };
    this.logger = new Logger();
  }

  /**
   * Run performance tests on the current page
   * @param {string} url - The URL to test
   * @returns {Promise<Object>} - Performance test results
   */
  async runTests(url) {
    try {
      this.logger.info('Running performance tests...');
      
      // Get the browser instance
      const browser = this.browserManager.browser;
      if (!browser) {
        throw new Error('Browser not initialized');
      }
      
      const page = this.browserManager.page;
      
      // Measure page load performance
      this.logger.info('Measuring page load performance...');
      
      // Enable performance metrics collection
      await page.setCacheEnabled(false);
      
      // Navigate to the URL with performance metrics
      const client = await page.target().createCDPSession();
      await client.send('Performance.enable');
      
      // Reload the page to collect metrics
      await page.reload({ waitUntil: 'networkidle2' });
      
      // Get performance metrics
      const performanceMetrics = await client.send('Performance.getMetrics');
      const metrics = {};
      
      // Convert metrics array to object
      performanceMetrics.metrics.forEach(metric => {
        metrics[metric.name] = metric.value;
      });
      
      // Calculate custom metrics
      const navigationStart = metrics.NavigationStart || 0;
      const domContentLoaded = metrics.DomContentLoaded || 0;
      const firstPaint = metrics.FirstPaint || 0;
      const firstContentfulPaint = metrics.FirstContentfulPaint || 0;
      const loadEventEnd = metrics.LoadEventEnd || 0;
      
      // Calculate derived metrics
      const domContentLoadedTime = domContentLoaded - navigationStart;
      const firstPaintTime = firstPaint - navigationStart;
      const firstContentfulPaintTime = firstContentfulPaint - navigationStart;
      const loadTime = loadEventEnd - navigationStart;
      
      // Collect resource timing data
      const resourceTimings = await page.evaluate(() => {
        return performance.getEntriesByType('resource').map(entry => ({
          name: entry.name,
          duration: entry.duration,
          transferSize: entry.transferSize,
          initiatorType: entry.initiatorType
        }));
      });
      
      // Calculate total resource size
      const totalResourceSize = resourceTimings.reduce((total, resource) => {
        return total + (resource.transferSize || 0);
      }, 0);
      
      // Count resources by type
      const resourceCounts = {};
      resourceTimings.forEach(resource => {
        const type = resource.initiatorType || 'other';
        resourceCounts[type] = (resourceCounts[type] || 0) + 1;
      });
      
      // Calculate scores based on metrics
      // These are simplified approximations
      const calculateScore = (value, min, max) => {
        const score = 1 - Math.min(Math.max((value - min) / (max - min), 0), 1);
        return Math.max(0, Math.min(1, score));
      };
      
      const scores = {
        performance: calculateScore(firstContentfulPaintTime, 1000, 3000) * 0.4 + 
                    calculateScore(loadTime, 2000, 6000) * 0.6,
        accessibility: 0.85, // Placeholder - would need actual accessibility tests
        'best-practices': 0.9, // Placeholder
        seo: 0.85 // Placeholder
      };
      
      // Identify issues based on metrics
      const issues = [];
      
      // Check load time
      if (loadTime > 3000) {
        issues.push({
          type: 'Slow Page Load',
          description: `Page load time is slow: ${Math.round(loadTime)}ms`,
          severity: 'warning',
          suggestion: 'Optimize page resources and server response time'
        });
      }
      
      // Check first contentful paint
      if (firstContentfulPaintTime > 2000) {
        issues.push({
          type: 'Slow First Contentful Paint',
          description: `First Contentful Paint is slow: ${Math.round(firstContentfulPaintTime)}ms`,
          severity: 'warning',
          suggestion: 'Optimize critical rendering path and reduce render-blocking resources'
        });
      }
      
      // Check resource size
      if (totalResourceSize > 3 * 1024 * 1024) { // 3MB
        issues.push({
          type: 'Large Page Size',
          description: `Page resources are large: ${Math.round(totalResourceSize / 1024)}KB`,
          severity: 'warning',
          suggestion: 'Optimize and compress resources, use lazy loading for images and videos'
        });
      }
      
      // Check for too many resources
      const totalResources = resourceTimings.length;
      if (totalResources > 80) {
        issues.push({
          type: 'Too Many Resources',
          description: `Page loads ${totalResources} resources`,
          severity: 'warning',
          suggestion: 'Reduce the number of resources by combining files, using sprites, or removing unnecessary resources'
        });
      }
      
      // Check thresholds from config
      Object.entries(scores).forEach(([category, score]) => {
        const threshold = this.options.thresholds[category] || 0;
        if (score < threshold) {
          issues.push({
            type: 'Performance Issue',
            description: `${category} score (${Math.round(score * 100)}%) is below threshold (${Math.round(threshold * 100)}%)`,
            severity: 'warning',
            suggestion: `Improve ${category} by following web performance best practices`
          });
        }
      });
      
      // Format metrics for reporting
      const formattedMetrics = {
        domContentLoaded: domContentLoadedTime,
        firstPaint: firstPaintTime,
        firstContentfulPaint: firstContentfulPaintTime,
        loadTime: loadTime,
        resourceCount: totalResources,
        totalResourceSize: totalResourceSize
      };
      
      return {
        success: issues.length === 0,
        scores,
        metrics: formattedMetrics,
        issues,
        resourceCounts
      };
    } catch (error) {
      this.logger.error(`Failed to run performance tests: ${error.message}`);
      return { 
        success: false, 
        error: error.message,
        issues: [{
          type: 'Performance Test Error',
          description: error.message,
          severity: 'error'
        }]
      };
    }
  }
}

module.exports = PerformanceTester;
