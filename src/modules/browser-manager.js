/**
 * Browser manager module for the website testing automation tool
 * Handles browser initialization, navigation, and cleanup
 */
const puppeteer = require('puppeteer');
const Logger = require('../utils/logger');

class BrowserManager {
  constructor(options = {}) {
    this.options = {
      headless: 'new',
      defaultViewport: { width: 1366, height: 768 },
      defaultTimeout: 30000,
      ...options
    };
    
    this.logger = new Logger();
    this.browser = null;
    this.page = null;
  }

  /**
   * Initialize the browser
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      this.logger.info('Initializing browser...');
      this.browser = await puppeteer.launch({
        headless: this.options.headless,
        defaultViewport: this.options.defaultViewport,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
      
      this.page = await this.browser.newPage();
      await this.page.setDefaultNavigationTimeout(this.options.defaultTimeout);
      
      // Set up console log capturing from the browser
      this.page.on('console', (message) => {
        const type = message.type();
        const text = message.text();
        
        if (type === 'error') {
          this.logger.error(`Browser console: ${text}`);
        } else if (type === 'warning') {
          this.logger.warn(`Browser console: ${text}`);
        }
      });
      
      this.logger.success('Browser initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize browser: ${error.message}`);
      throw error;
    }
  }

  /**
   * Navigate to a URL
   * @param {string} url - The URL to navigate to
   * @returns {Promise<boolean>} - Whether navigation was successful
   */
  async navigateTo(url) {
    try {
      this.logger.info(`Navigating to: ${url}`);
      const response = await this.page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: this.options.defaultTimeout
      });
      
      if (!response) {
        this.logger.error(`Failed to get response from ${url}`);
        return false;
      }
      
      const status = response.status();
      if (status >= 400) {
        this.logger.error(`Page returned status code ${status}`);
        return false;
      }
      
      this.logger.success(`Successfully navigated to ${url}`);
      return true;
    } catch (error) {
      this.logger.error(`Navigation error: ${error.message}`);
      return false;
    }
  }

  /**
   * Change the viewport size
   * @param {number} width - The viewport width
   * @param {number} height - The viewport height
   * @returns {Promise<void>}
   */
  async setViewport(width, height) {
    try {
      this.logger.info(`Setting viewport to ${width}x${height}`);
      await this.page.setViewport({ width, height });
    } catch (error) {
      this.logger.error(`Failed to set viewport: ${error.message}`);
      throw error;
    }
  }

  /**
   * Take a screenshot of the current page
   * @param {string} path - The file path to save the screenshot to
   * @returns {Promise<void>}
   */
  async takeScreenshot(path) {
    try {
      this.logger.info(`Taking screenshot: ${path}`);
      await this.page.screenshot({ path, fullPage: true });
      this.logger.success(`Screenshot saved to ${path}`);
    } catch (error) {
      this.logger.error(`Failed to take screenshot: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all links from the current page
   * @returns {Promise<Array<string>>} - Array of URLs
   */
  async getAllLinks() {
    try {
      this.logger.info('Extracting all links from the page');
      
      const links = await this.page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a'));
        return anchors
          .map(anchor => anchor.href)
          .filter(href => href && href.startsWith('http'));
      });
      
      return links;
    } catch (error) {
      this.logger.error(`Failed to extract links: ${error.message}`);
      return [];
    }
  }

  /**
   * Close the browser
   * @returns {Promise<void>}
   */
  async close() {
    if (this.browser) {
      this.logger.info('Closing browser');
      await this.browser.close();
      this.browser = null;
      this.page = null;
      this.logger.success('Browser closed successfully');
    }
  }
}

module.exports = BrowserManager;
