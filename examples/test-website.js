/**
 * Example script demonstrating how to use the website testing automation tool programmatically
 */
const { TestRunner } = require('../index');

// URL to test
const websiteUrl = 'https://example.com';

// Create a test runner with custom options
const testRunner = new TestRunner({
  // Use headless mode (no visible browser)
  headless: 'new',
  
  // Set custom timeouts
  defaultTimeout: 30000,
  
  // Configure reporting options
  reportOptions: {
    outputDir: './reports',
    formats: ['console', 'html', 'json']
  }
});

// Run the tests
async function runTests() {
  console.log(`Starting tests for ${websiteUrl}...`);
  
  try {
    // Run all tests
    const result = await testRunner.runTests(websiteUrl);
    
    // Check if tests were successful
    if (result.success) {
      console.log('All tests passed successfully!');
    } else {
      console.log(`Tests completed with ${result.results.issues.length} issues found.`);
    }
    
    // Log report paths
    if (result.reportPaths) {
      console.log('\nReports generated at:');
      Object.entries(result.reportPaths).forEach(([format, path]) => {
        console.log(`- ${format}: ${path}`);
      });
    }
    
    // Return exit code based on success
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error(`Error running tests: ${error.message}`);
    process.exit(1);
  }
}

// Run the tests
runTests();
