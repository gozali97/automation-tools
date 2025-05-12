/**
 * Configuration settings for the website testing automation tool
 */
module.exports = {
  // Default viewport sizes for responsive testing
  viewports: [
    { width: 1920, height: 1080, name: 'Desktop' },
    { width: 1366, height: 768, name: 'Laptop' },
    { width: 768, height: 1024, name: 'Tablet' },
    { width: 375, height: 667, name: 'Mobile' }
  ],
  
  // Default timeout settings (in milliseconds)
  timeouts: {
    navigation: 30000,
    waitForElement: 5000,
    performance: 60000
  },
  
  // Performance thresholds
  performance: {
    // Lighthouse score thresholds (0-1)
    thresholds: {
      performance: 0.7,
      accessibility: 0.9,
      'best-practices': 0.9,
      seo: 0.8
    }
  },
  
  // Elements to test by default
  defaultElementsToTest: {
    navigation: 'nav, header, .navigation, .navbar, .nav-menu',
    buttons: 'button, .btn, [role="button"], input[type="button"], input[type="submit"]',
    forms: 'form, .form',
    links: 'a, [role="link"]',
    images: 'img, picture, [role="img"]',
    inputs: 'input, textarea, select, [role="textbox"], [role="combobox"]'
  },
  
  // Default report settings
  reports: {
    outputDir: './reports',
    formats: ['console', 'html', 'json']
  }
};
