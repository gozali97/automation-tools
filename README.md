# Website Testing Automation Tool

Automated website testing tool for functional, responsive, performance, and accessibility testing. This tool helps you automatically test your websites to ensure they work properly across different devices and meet accessibility standards.

## Features

- **Functional Testing**
  - Checks if all pages are accessible
  - Tests interactive elements (buttons, forms, links)
  - Verifies navigation elements
  - Validates form functionality

- **Responsive Testing**
  - Tests website layout across different screen sizes
  - Detects overflowing elements
  - Identifies layout issues on mobile, tablet, and desktop
  - Takes screenshots for visual comparison

- **Performance Testing**
  - Measures page load speed
  - Analyzes performance metrics using Lighthouse
  - Identifies performance bottlenecks
  - Provides optimization suggestions

- **Accessibility Testing**
  - Checks WCAG compliance using axe-core
  - Identifies accessibility issues
  - Provides suggestions for improvements
  - Helps ensure your site is usable by everyone

- **Comprehensive Reporting**
  - Generates detailed HTML reports
  - Provides console output
  - Creates JSON data for integration with other tools
  - Highlights issues with severity levels and suggestions

## Installation

```bash
# Clone the repository
git clone [repository-url]
cd website-testing-automation

# Install dependencies
npm install

# Link the CLI globally (optional)
npm link
```

## Usage

### Command Line Interface

The tool can be used from the command line:

```bash
# Basic usage
npx website-tester test https://example.com

# With custom options
npx website-tester test https://example.com --headful --output ./my-reports

# Generate a default config file
npx website-tester init-config

# Test multiple websites from a JSON file
npx website-tester batch websites.json
```

### Batch Testing

Create a JSON file with URLs to test:

```json
[
  "https://example.com",
  "https://example.org",
  "https://another-site.com"
]
```

Then run:

```bash
npx website-tester batch urls.json
```

### Configuration

You can customize the testing behavior by creating a configuration file:

```bash
# Generate a default config
npx website-tester init-config --output my-config.json
```

Then edit the generated file and use it:

```bash
npx website-tester test https://example.com --config my-config.json
```

## API Usage

You can also use the tool programmatically in your Node.js projects:

```javascript
const { TestRunner } = require('website-testing-automation');

async function runTest() {
  const testRunner = new TestRunner({
    headless: 'new',
    reportOptions: {
      outputDir: './reports',
      formats: ['console', 'html', 'json']
    }
  });
  
  const results = await testRunner.runTests('https://example.com');
  console.log(`Tests ${results.success ? 'passed' : 'failed'}`);
  console.log(`Report generated at: ${results.reportPaths.html}`);
}

runTest().catch(console.error);
```

## Report Examples

The HTML report includes:
- Overall test summary
- Performance scores
- List of issues with severity levels
- Suggestions for fixing issues
- Screenshots (if enabled)

## Requirements

- Node.js 16 or higher
- Chrome or Chromium browser (installed automatically by Puppeteer)

## License

ISC
