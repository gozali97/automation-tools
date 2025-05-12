/**
 * Functional testing module for the website testing automation tool
 * Tests functionality of various website elements
 */
const Logger = require('../utils/logger');
const config = require('../config');

class FunctionalTester {
  constructor(browserManager, options = {}) {
    this.browserManager = browserManager;
    this.options = {
      elementsToTest: config.defaultElementsToTest,
      waitTimeout: config.timeouts.waitForElement,
      ...options
    };
    this.logger = new Logger();
    this.page = this.browserManager.page;
  }

  /**
   * Run all functional tests on the current page
   * @returns {Promise<Object>} - Test results
   */
  async runTests() {
    try {
      this.logger.info('Running functional tests...');
      
      const results = {
        navigation: await this.testNavigation(),
        buttons: await this.testButtons(),
        forms: await this.testForms(),
        links: await this.testLinks(),
        images: await this.testImages(),
        inputs: await this.testInputs()
      };
      
      // Collect all issues
      const issues = Object.values(results)
        .flatMap(result => result.issues || []);
      
      // Calculate overall success
      const success = issues.length === 0;
      
      this.logger.info(`Functional tests completed with ${issues.length} issues found`);
      
      return {
        success,
        issues,
        details: results
      };
    } catch (error) {
      this.logger.error(`Failed to run functional tests: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Test navigation elements
   * @returns {Promise<Object>} - Test results
   */
  async testNavigation() {
    try {
      this.logger.info('Testing navigation elements...');
      const selector = this.options.elementsToTest.navigation;
      
      // Check if navigation elements exist
      const navigationExists = await this._elementExists(selector);
      if (!navigationExists) {
        return {
          success: false,
          issues: [{
            type: 'Navigation Missing',
            description: 'No navigation elements found on the page',
            severity: 'warning',
            suggestion: 'Add a proper navigation menu for better user experience'
          }]
        };
      }
      
      // Check if navigation links are clickable
      const navigationLinks = await this._getElementsWithAttribute(selector, 'a', 'href');
      const issues = [];
      
      if (navigationLinks.length === 0) {
        issues.push({
          type: 'Navigation Links Missing',
          description: 'Navigation exists but contains no links',
          severity: 'warning',
          suggestion: 'Add links to your navigation menu'
        });
      }
      
      // Test a sample of navigation links (without actually navigating)
      for (const link of navigationLinks.slice(0, 3)) {
        const isClickable = await this._isElementClickable(link.selector);
        if (!isClickable) {
          issues.push({
            type: 'Navigation Link Not Clickable',
            description: `Navigation link is not clickable: ${link.text || link.href}`,
            location: link.selector,
            severity: 'error',
            suggestion: 'Ensure the link is not obscured and has proper dimensions'
          });
        }
      }
      
      return {
        success: issues.length === 0,
        issues,
        navigationLinks: navigationLinks.length
      };
    } catch (error) {
      this.logger.error(`Navigation test error: ${error.message}`);
      return {
        success: false,
        issues: [{
          type: 'Navigation Test Error',
          description: error.message,
          severity: 'error'
        }]
      };
    }
  }

  /**
   * Test buttons
   * @returns {Promise<Object>} - Test results
   */
  async testButtons() {
    try {
      this.logger.info('Testing buttons...');
      const selector = this.options.elementsToTest.buttons;
      
      // Get all buttons
      const buttons = await this._getAllElements(selector);
      if (buttons.length === 0) {
        return { success: true, buttonCount: 0 };
      }
      
      const issues = [];
      
      // Check if buttons are clickable
      for (const button of buttons) {
        const isClickable = await this._isElementClickable(button.selector);
        if (!isClickable) {
          issues.push({
            type: 'Button Not Clickable',
            description: `Button is not clickable: ${button.text || 'Unnamed button'}`,
            location: button.selector,
            severity: 'error',
            suggestion: 'Ensure the button is not obscured, disabled without indication, and has proper dimensions'
          });
        }
        
        // Check if button has accessible text
        if (!button.text || button.text.trim() === '') {
          issues.push({
            type: 'Button Missing Text',
            description: 'Button does not have accessible text',
            location: button.selector,
            severity: 'warning',
            suggestion: 'Add text or aria-label to the button for accessibility'
          });
        }
      }
      
      return {
        success: issues.length === 0,
        issues,
        buttonCount: buttons.length
      };
    } catch (error) {
      this.logger.error(`Button test error: ${error.message}`);
      return {
        success: false,
        issues: [{
          type: 'Button Test Error',
          description: error.message,
          severity: 'error'
        }]
      };
    }
  }

  /**
   * Test forms
   * @returns {Promise<Object>} - Test results
   */
  async testForms() {
    try {
      this.logger.info('Testing forms...');
      const selector = this.options.elementsToTest.forms;
      
      // Check if forms exist
      const forms = await this._getAllElements(selector);
      if (forms.length === 0) {
        return { success: true, formCount: 0 };
      }
      
      const issues = [];
      
      // Test each form
      for (const form of forms) {
        // Check if form has a submit button
        const hasSubmitButton = await this._elementExists(
          `${form.selector} button[type="submit"], ${form.selector} input[type="submit"]`
        );
        
        if (!hasSubmitButton) {
          issues.push({
            type: 'Form Missing Submit',
            description: 'Form does not have a submit button',
            location: form.selector,
            severity: 'error',
            suggestion: 'Add a submit button to the form'
          });
        }
        
        // Check if required inputs have labels
        const requiredInputs = await this._getElementsWithAttribute(
          form.selector,
          'input[required], textarea[required], select[required]',
          'id'
        );
        
        for (const input of requiredInputs) {
          const hasLabel = await this._elementExists(`label[for="${input.id}"]`);
          if (!hasLabel) {
            issues.push({
              type: 'Input Missing Label',
              description: `Required input is missing a label: ${input.name || input.id || 'Unnamed input'}`,
              location: input.selector,
              severity: 'warning',
              suggestion: 'Add a label for each required input for better accessibility'
            });
          }
        }
      }
      
      return {
        success: issues.length === 0,
        issues,
        formCount: forms.length
      };
    } catch (error) {
      this.logger.error(`Form test error: ${error.message}`);
      return {
        success: false,
        issues: [{
          type: 'Form Test Error',
          description: error.message,
          severity: 'error'
        }]
      };
    }
  }

  /**
   * Test links
   * @returns {Promise<Object>} - Test results
   */
  async testLinks() {
    try {
      this.logger.info('Testing links...');
      const selector = this.options.elementsToTest.links;
      
      // Get all links
      const links = await this._getElementsWithAttribute(selector, 'a', 'href');
      if (links.length === 0) {
        return {
          success: false,
          issues: [{
            type: 'Links Missing',
            description: 'No links found on the page',
            severity: 'warning',
            suggestion: 'Add links to improve navigation and user experience'
          }]
        };
      }
      
      const issues = [];
      let emptyLinks = 0;
      let javascriptLinks = 0;
      
      // Check links
      for (const link of links) {
        // Check for empty links
        if (!link.href || link.href === '#' || link.href === 'javascript:void(0)') {
          emptyLinks++;
        }
        
        // Check for javascript: links (not recommended for accessibility)
        if (link.href && link.href.startsWith('javascript:')) {
          javascriptLinks++;
        }
        
        // Check if link has text
        if (!link.text || link.text.trim() === '') {
          issues.push({
            type: 'Link Missing Text',
            description: 'Link does not have accessible text',
            location: link.selector,
            severity: 'warning',
            suggestion: 'Add text or aria-label to the link for accessibility'
          });
        }
      }
      
      // Add issues for empty and javascript links
      if (emptyLinks > 0) {
        issues.push({
          type: 'Empty Links',
          description: `Found ${emptyLinks} empty links (href="#" or javascript:void(0))`,
          severity: 'warning',
          suggestion: 'Replace empty links with proper URLs or buttons'
        });
      }
      
      if (javascriptLinks > 0) {
        issues.push({
          type: 'JavaScript Links',
          description: `Found ${javascriptLinks} links using javascript: protocol`,
          severity: 'warning',
          suggestion: 'Replace javascript: links with proper URLs or event handlers for better accessibility'
        });
      }
      
      return {
        success: issues.length === 0,
        issues,
        linkCount: links.length
      };
    } catch (error) {
      this.logger.error(`Link test error: ${error.message}`);
      return {
        success: false,
        issues: [{
          type: 'Link Test Error',
          description: error.message,
          severity: 'error'
        }]
      };
    }
  }

  /**
   * Test images
   * @returns {Promise<Object>} - Test results
   */
  async testImages() {
    try {
      this.logger.info('Testing images...');
      const selector = this.options.elementsToTest.images;
      
      // Get all images
      const images = await this._getAllElements(selector);
      if (images.length === 0) {
        return { success: true, imageCount: 0 };
      }
      
      const issues = [];
      let missingAltCount = 0;
      let brokenImageCount = 0;
      
      // Check images
      for (const image of images) {
        // Check for alt text
        const hasAlt = await this.page.evaluate(selector => {
          const element = document.querySelector(selector);
          return element && (element.hasAttribute('alt') || element.hasAttribute('aria-label'));
        }, image.selector);
        
        if (!hasAlt) {
          missingAltCount++;
        }
        
        // Check if image is loaded
        const isLoaded = await this.page.evaluate(selector => {
          const element = document.querySelector(selector);
          if (!element) return true; // Skip if element not found
          
          if (element.tagName === 'IMG') {
            return element.complete && element.naturalWidth > 0;
          }
          return true; // Non-img elements are considered loaded
        }, image.selector);
        
        if (!isLoaded) {
          brokenImageCount++;
        }
      }
      
      // Add issues for missing alt text and broken images
      if (missingAltCount > 0) {
        issues.push({
          type: 'Images Missing Alt Text',
          description: `Found ${missingAltCount} images without alt text`,
          severity: 'warning',
          suggestion: 'Add alt text to all images for accessibility'
        });
      }
      
      if (brokenImageCount > 0) {
        issues.push({
          type: 'Broken Images',
          description: `Found ${brokenImageCount} broken or unloaded images`,
          severity: 'error',
          suggestion: 'Fix or replace broken images'
        });
      }
      
      return {
        success: issues.length === 0,
        issues,
        imageCount: images.length
      };
    } catch (error) {
      this.logger.error(`Image test error: ${error.message}`);
      return {
        success: false,
        issues: [{
          type: 'Image Test Error',
          description: error.message,
          severity: 'error'
        }]
      };
    }
  }

  /**
   * Test input elements
   * @returns {Promise<Object>} - Test results
   */
  async testInputs() {
    try {
      this.logger.info('Testing input elements...');
      const selector = this.options.elementsToTest.inputs;
      
      // Get all inputs
      const inputs = await this._getAllElements(selector);
      if (inputs.length === 0) {
        return { success: true, inputCount: 0 };
      }
      
      const issues = [];
      
      // Test a sample of inputs
      for (const input of inputs.slice(0, 5)) {
        // Check if input is accessible
        const isInteractable = await this._isElementClickable(input.selector);
        if (!isInteractable) {
          issues.push({
            type: 'Input Not Interactable',
            description: `Input element is not interactable: ${input.name || input.id || 'Unnamed input'}`,
            location: input.selector,
            severity: 'error',
            suggestion: 'Ensure the input is not obscured and has proper dimensions'
          });
        }
        
        // Check if input has a label or placeholder
        const hasLabel = await this.page.evaluate(selector => {
          const element = document.querySelector(selector);
          if (!element) return true; // Skip if element not found
          
          const id = element.id;
          if (!id) return false;
          
          const label = document.querySelector(`label[for="${id}"]`);
          return !!label || !!element.placeholder;
        }, input.selector);
        
        if (!hasLabel) {
          issues.push({
            type: 'Input Missing Label',
            description: `Input element is missing a label or placeholder: ${input.name || input.id || 'Unnamed input'}`,
            location: input.selector,
            severity: 'warning',
            suggestion: 'Add a label or placeholder for better accessibility'
          });
        }
      }
      
      return {
        success: issues.length === 0,
        issues,
        inputCount: inputs.length
      };
    } catch (error) {
      this.logger.error(`Input test error: ${error.message}`);
      return {
        success: false,
        issues: [{
          type: 'Input Test Error',
          description: error.message,
          severity: 'error'
        }]
      };
    }
  }

  /**
   * Check if an element exists
   * @private
   * @param {string} selector - The CSS selector
   * @returns {Promise<boolean>} - Whether the element exists
   */
  async _elementExists(selector) {
    try {
      return await this.page.evaluate(selector => {
        return document.querySelector(selector) !== null;
      }, selector);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get all elements matching a selector
   * @private
   * @param {string} selector - The CSS selector
   * @returns {Promise<Array<Object>>} - Array of element info
   */
  async _getAllElements(selector) {
    try {
      return await this.page.evaluate(selector => {
        const elements = Array.from(document.querySelectorAll(selector));
        return elements.map((element, index) => {
          return {
            selector: `${selector}:nth-of-type(${index + 1})`,
            text: element.textContent,
            id: element.id,
            name: element.name,
            type: element.type,
            tagName: element.tagName.toLowerCase()
          };
        });
      }, selector);
    } catch (error) {
      return [];
    }
  }

  /**
   * Get elements with a specific attribute
   * @private
   * @param {string} containerSelector - The container CSS selector
   * @param {string} elementSelector - The element CSS selector
   * @param {string} attributeName - The attribute name to check
   * @returns {Promise<Array<Object>>} - Array of element info
   */
  async _getElementsWithAttribute(containerSelector, elementSelector, attributeName) {
    try {
      return await this.page.evaluate(
        (containerSelector, elementSelector, attributeName) => {
          let elements;
          
          if (containerSelector === elementSelector) {
            elements = Array.from(document.querySelectorAll(elementSelector));
          } else {
            const containers = Array.from(document.querySelectorAll(containerSelector));
            elements = [];
            
            containers.forEach(container => {
              elements = [
                ...elements,
                ...Array.from(container.querySelectorAll(elementSelector))
              ];
            });
          }
          
          return elements.map((element, index) => {
            const attributeValue = element.getAttribute(attributeName);
            return {
              selector: `${elementSelector}:nth-of-type(${index + 1})`,
              text: element.textContent,
              [attributeName]: attributeValue,
              id: element.id,
              name: element.name
            };
          });
        },
        containerSelector,
        elementSelector,
        attributeName
      );
    } catch (error) {
      return [];
    }
  }

  /**
   * Check if an element is clickable
   * @private
   * @param {string} selector - The CSS selector
   * @returns {Promise<boolean>} - Whether the element is clickable
   */
  async _isElementClickable(selector) {
    try {
      return await this.page.evaluate(selector => {
        const element = document.querySelector(selector);
        if (!element) return false;
        
        const rect = element.getBoundingClientRect();
        
        // Check if element has dimensions
        if (rect.width === 0 || rect.height === 0) return false;
        
        // Check if element is visible
        const style = window.getComputedStyle(element);
        if (style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0') {
          return false;
        }
        
        // Check if element is not covered by another element
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Get the element at the center point
        const elementAtPoint = document.elementFromPoint(centerX, centerY);
        
        // Check if the element or one of its children is at the point
        return element === elementAtPoint || element.contains(elementAtPoint);
      }, selector);
    } catch (error) {
      return false;
    }
  }
}

module.exports = FunctionalTester;
