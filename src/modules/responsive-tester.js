/**
 * Responsive testing module for the website testing automation tool
 * Tests website responsiveness across different viewport sizes
 */
const fs = require('fs-extra');
const path = require('path');
const Logger = require('../utils/logger');
const config = require('../config');

class ResponsiveTester {
  constructor(browserManager, options = {}) {
    this.browserManager = browserManager;
    this.options = {
      viewports: config.viewports,
      screenshotDir: './screenshots',
      takeScreenshots: true,
      ...options
    };
    this.logger = new Logger();
    
    // Ensure screenshot directory exists if needed
    if (this.options.takeScreenshots) {
      fs.ensureDirSync(this.options.screenshotDir);
    }
  }

  /**
   * Run responsive tests on the current page
   * @param {string} url - The URL being tested (for screenshot naming)
   * @returns {Promise<Object>} - Responsive test results
   */
  async runTests(url) {
    try {
      this.logger.info('Running responsive tests...');
      
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const results = [];
      const issues = [];
      
      // Test each viewport size
      for (const viewport of this.options.viewports) {
        this.logger.info(`Testing viewport: ${viewport.width}x${viewport.height} (${viewport.name})`);
        
        // Set viewport size
        await this.browserManager.setViewport(viewport.width, viewport.height);
        
        // Wait for any responsive adjustments to take effect
        await this.browserManager.page.waitForTimeout(1000);
        
        // Take screenshot if enabled
        let screenshotPath = null;
        if (this.options.takeScreenshots) {
          screenshotPath = path.join(
            this.options.screenshotDir,
            `${hostname}-${viewport.name}-${timestamp}.png`
          );
          await this.browserManager.takeScreenshot(screenshotPath);
        }
        
        // Check for horizontal overflow (indicates lack of responsiveness)
        const hasHorizontalOverflow = await this._checkHorizontalOverflow();
        
        // Check for elements overflowing viewport
        const overflowingElements = await this._findOverflowingElements();
        
        // Check for tiny text that might be unreadable on this viewport
        const tinyTextElements = await this._findTinyText();
        
        // Check for overlapping elements
        const overlappingElements = await this._findOverlappingElements();
        
        // Add issues based on findings
        if (hasHorizontalOverflow) {
          issues.push({
            type: 'Horizontal Overflow',
            description: `Page has horizontal overflow at ${viewport.width}x${viewport.height} (${viewport.name})`,
            severity: 'error',
            suggestion: 'Use responsive design techniques like max-width, flexbox, or CSS Grid'
          });
        }
        
        if (overflowingElements.length > 0) {
          issues.push({
            type: 'Overflowing Elements',
            description: `Found ${overflowingElements.length} elements overflowing the viewport at ${viewport.width}x${viewport.height} (${viewport.name})`,
            elements: overflowingElements,
            severity: 'warning',
            suggestion: 'Adjust element dimensions with CSS media queries or use responsive units'
          });
        }
        
        if (tinyTextElements.length > 0) {
          issues.push({
            type: 'Tiny Text',
            description: `Found ${tinyTextElements.length} elements with very small text at ${viewport.width}x${viewport.height} (${viewport.name})`,
            elements: tinyTextElements,
            severity: 'warning',
            suggestion: 'Increase font size for better readability on smaller screens'
          });
        }
        
        if (overlappingElements.length > 0) {
          issues.push({
            type: 'Overlapping Elements',
            description: `Found ${overlappingElements.length} potentially overlapping elements at ${viewport.width}x${viewport.height} (${viewport.name})`,
            elements: overlappingElements,
            severity: 'warning',
            suggestion: 'Adjust layout to prevent elements from overlapping'
          });
        }
        
        // Add viewport result
        results.push({
          viewport,
          screenshotPath,
          hasHorizontalOverflow,
          overflowingElementsCount: overflowingElements.length,
          tinyTextElementsCount: tinyTextElements.length,
          overlappingElementsCount: overlappingElements.length
        });
      }
      
      return {
        success: issues.length === 0,
        results,
        issues
      };
    } catch (error) {
      this.logger.error(`Failed to run responsive tests: ${error.message}`);
      return { 
        success: false, 
        error: error.message,
        issues: [{
          type: 'Responsive Test Error',
          description: error.message,
          severity: 'error'
        }]
      };
    }
  }

  /**
   * Check if the page has horizontal overflow
   * @private
   * @returns {Promise<boolean>} - Whether horizontal overflow exists
   */
  async _checkHorizontalOverflow() {
    try {
      return await this.browserManager.page.evaluate(() => {
        const body = document.body;
        const html = document.documentElement;
        
        const documentWidth = Math.max(
          body.scrollWidth,
          body.offsetWidth,
          html.clientWidth,
          html.scrollWidth,
          html.offsetWidth
        );
        
        return documentWidth > window.innerWidth;
      });
    } catch (error) {
      this.logger.error(`Error checking horizontal overflow: ${error.message}`);
      return false;
    }
  }

  /**
   * Find elements that overflow the viewport
   * @private
   * @returns {Promise<Array<Object>>} - Array of overflowing elements
   */
  async _findOverflowingElements() {
    try {
      return await this.browserManager.page.evaluate(() => {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const elements = Array.from(document.querySelectorAll('*'));
        const overflowing = [];
        
        elements.forEach(element => {
          const rect = element.getBoundingClientRect();
          
          // Skip tiny elements
          if (rect.width < 10 || rect.height < 10) return;
          
          // Check if element extends beyond viewport
          if (rect.right > viewportWidth || rect.bottom > viewportHeight) {
            // Only include if it's not just slightly overflowing
            if (rect.right > viewportWidth + 5 || rect.bottom > viewportHeight + 5) {
              overflowing.push({
                tagName: element.tagName.toLowerCase(),
                id: element.id,
                className: element.className,
                width: Math.round(rect.width),
                height: Math.round(rect.height),
                overflowX: Math.round(rect.right - viewportWidth),
                overflowY: Math.round(rect.bottom - viewportHeight)
              });
            }
          }
        });
        
        // Limit to top 10 most overflowing elements
        return overflowing
          .sort((a, b) => Math.max(b.overflowX, b.overflowY) - Math.max(a.overflowX, a.overflowY))
          .slice(0, 10);
      });
    } catch (error) {
      this.logger.error(`Error finding overflowing elements: ${error.message}`);
      return [];
    }
  }

  /**
   * Find text elements with very small font size
   * @private
   * @returns {Promise<Array<Object>>} - Array of tiny text elements
   */
  async _findTinyText() {
    try {
      return await this.browserManager.page.evaluate(() => {
        const textElements = Array.from(document.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6, a, button, label, li'));
        const tinyText = [];
        
        textElements.forEach(element => {
          // Skip empty or invisible elements
          if (!element.textContent.trim()) return;
          
          const style = window.getComputedStyle(element);
          const fontSize = parseFloat(style.fontSize);
          
          // Consider text smaller than 12px to be too small
          if (fontSize < 12) {
            tinyText.push({
              tagName: element.tagName.toLowerCase(),
              text: element.textContent.substring(0, 50) + (element.textContent.length > 50 ? '...' : ''),
              fontSize: fontSize.toFixed(1) + 'px'
            });
          }
        });
        
        return tinyText.slice(0, 10); // Limit to top 10
      });
    } catch (error) {
      this.logger.error(`Error finding tiny text: ${error.message}`);
      return [];
    }
  }

  /**
   * Find potentially overlapping elements
   * @private
   * @returns {Promise<Array<Object>>} - Array of overlapping elements
   */
  async _findOverlappingElements() {
    try {
      return await this.browserManager.page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('button, a, input, select, textarea, [role="button"]'));
        const overlapping = [];
        
        // Check each interactive element
        elements.forEach(element => {
          const rect = element.getBoundingClientRect();
          
          // Skip elements with zero dimensions or not in viewport
          if (rect.width === 0 || rect.height === 0 || 
              rect.right < 0 || rect.bottom < 0 || 
              rect.left > window.innerWidth || rect.top > window.innerHeight) {
            return;
          }
          
          // Check if center point of element is covered by another element
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          
          const elementAtPoint = document.elementFromPoint(centerX, centerY);
          
          if (elementAtPoint && !element.contains(elementAtPoint) && !elementAtPoint.contains(element)) {
            overlapping.push({
              element: {
                tagName: element.tagName.toLowerCase(),
                id: element.id,
                className: element.className,
                text: element.textContent.substring(0, 30).trim()
              },
              overlappedBy: {
                tagName: elementAtPoint.tagName.toLowerCase(),
                id: elementAtPoint.id,
                className: elementAtPoint.className,
                text: elementAtPoint.textContent.substring(0, 30).trim()
              }
            });
          }
        });
        
        return overlapping.slice(0, 10); // Limit to top 10
      });
    } catch (error) {
      this.logger.error(`Error finding overlapping elements: ${error.message}`);
      return [];
    }
  }
}

module.exports = ResponsiveTester;
