#!/usr/bin/env node

/**
 * Command-line interface for the website testing automation tool
 */
const { program } = require('commander');
const fs = require('fs-extra');
const path = require('path');
const TestRunner = require('./test-runner');
const chalk = require('chalk');
const packageJson = require('../package.json');

// Configure the CLI
program
  .name('website-tester')
  .description('Automated website testing tool')
  .version(packageJson.version);

// Test command
program
  .command('test')
  .description('Run tests on a website')
  .argument('<url>', 'URL of the website to test')
  .option('-c, --config <path>', 'Path to config file')
  .option('-o, --output <dir>', 'Output directory for reports')
  .option('-f, --format <formats>', 'Report formats (comma-separated: console,html,json)', 'console,html,json')
  .option('-H, --headful', 'Run in headful mode (show browser)')
  .option('-s, --screenshots', 'Take screenshots during testing', true)
  .option('-t, --timeout <ms>', 'Navigation timeout in milliseconds', '30000')
  .option('-O, --open-report', 'Open HTML report after testing')
  .action(async (url, options) => {
    try {
      console.log(chalk.cyan('='.repeat(80)));
      console.log(chalk.cyan(`Website Testing Automation Tool v${packageJson.version}`));
      console.log(chalk.cyan('='.repeat(80)));
      
      // Load custom config if provided
      let customConfig = {};
      if (options.config) {
        const configPath = path.resolve(options.config);
        if (fs.existsSync(configPath)) {
          try {
            customConfig = require(configPath);
            console.log(chalk.green(`Loaded configuration from ${configPath}`));
          } catch (error) {
            console.error(chalk.red(`Error loading config file: ${error.message}`));
            process.exit(1);
          }
        } else {
          console.error(chalk.red(`Config file not found: ${configPath}`));
          process.exit(1);
        }
      }
      
      // Prepare test runner options
      const testOptions = {
        headless: options.headful ? false : 'new',
        defaultTimeout: parseInt(options.timeout, 10),
        reportOptions: {
          outputDir: options.output || './reports',
          formats: options.format.split(',')
        },
        ...customConfig
      };
      
      // Create and run the test runner
      const testRunner = new TestRunner(testOptions);
      console.log(chalk.yellow(`Starting tests on ${url}...\n`));
      
      const result = await testRunner.runTests(url);
      
      if (result.error) {
        console.error(chalk.red(`\nTesting failed: ${result.error}`));
        process.exit(1);
      }
      
      // Show summary
      console.log(chalk.cyan('\nTest Summary:'));
      console.log(`Total Tests: ${result.results.summary.totalTests}`);
      console.log(`Passed: ${result.results.summary.passedTests}`);
      console.log(`Failed: ${result.results.summary.failedTests}`);
      
      // Show report paths
      if (result.reportPaths) {
        console.log(chalk.cyan('\nReports generated:'));
        Object.entries(result.reportPaths).forEach(([format, path]) => {
          console.log(`${format.toUpperCase()}: ${path}`);
        });
        
        // Open HTML report if requested
        if (options.openReport && result.reportPaths.html) {
          console.log(chalk.green('\nOpening HTML report...'));
          
          // Add a delay to ensure the file is fully written before opening
          setTimeout(() => {
            try {
              // Use absolute path for better compatibility
              const absolutePath = path.resolve(result.reportPaths.html);
              
              // Use a more reliable approach for Windows
              if (process.platform === 'win32') {
                const { spawn } = require('child_process');
                spawn('cmd.exe', ['/c', 'start', '', absolutePath], {
                  detached: true,
                  stdio: 'ignore',
                  windowsVerbatimArguments: true
                }).unref();
              } else {
                // For non-Windows platforms
                const { exec } = require('child_process');
                const openCommand = process.platform === 'darwin' ? 'open' : 'xdg-open';
                exec(`${openCommand} "${absolutePath}"`, (error) => {
                  if (error) {
                    console.error(chalk.red(`Error opening report: ${error.message}`));
                  }
                });
              }
            } catch (error) {
              console.error(chalk.red(`Error opening report: ${error.message}`));
            }
          }, 1500); // 1.5 second delay
        }
      }
      
      // Exit with appropriate code
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      console.error(chalk.red(`\nUnexpected error: ${error.message}`));
      process.exit(1);
    }
  });

// Batch test command
program
  .command('batch')
  .description('Run tests on multiple websites from a JSON file')
  .argument('<file>', 'JSON file with URLs to test')
  .option('-c, --config <path>', 'Path to config file')
  .option('-o, --output <dir>', 'Output directory for reports')
  .option('-H, --headful', 'Run in headful mode (show browser)')
  .option('-O, --open-report', 'Open HTML report after testing')
  .action(async (file, options) => {
    try {
      console.log(chalk.cyan('='.repeat(80)));
      console.log(chalk.cyan(`Website Testing Automation Tool - Batch Mode v${packageJson.version}`));
      console.log(chalk.cyan('='.repeat(80)));
      
      // Load URLs file
      const filePath = path.resolve(file);
      if (!fs.existsSync(filePath)) {
        console.error(chalk.red(`File not found: ${filePath}`));
        process.exit(1);
      }
      
      let urls = [];
      try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(fileContent);
        
        if (Array.isArray(data)) {
          urls = data;
        } else if (data.urls && Array.isArray(data.urls)) {
          urls = data.urls;
        } else {
          console.error(chalk.red('Invalid JSON format. Expected an array of URLs or an object with a "urls" array.'));
          process.exit(1);
        }
      } catch (error) {
        console.error(chalk.red(`Error parsing JSON file: ${error.message}`));
        process.exit(1);
      }
      
      if (urls.length === 0) {
        console.error(chalk.red('No URLs found in the file.'));
        process.exit(1);
      }
      
      console.log(chalk.green(`Found ${urls.length} URLs to test`));
      
      // Load custom config if provided
      let customConfig = {};
      if (options.config) {
        const configPath = path.resolve(options.config);
        if (fs.existsSync(configPath)) {
          try {
            customConfig = require(configPath);
            console.log(chalk.green(`Loaded configuration from ${configPath}`));
          } catch (error) {
            console.error(chalk.red(`Error loading config file: ${error.message}`));
            process.exit(1);
          }
        } else {
          console.error(chalk.red(`Config file not found: ${configPath}`));
          process.exit(1);
        }
      }
      
      // Prepare test runner options
      const testOptions = {
        headless: options.headful ? false : 'new',
        reportOptions: {
          outputDir: options.output || './reports'
        },
        ...customConfig
      };
      
      // Create test runner
      const testRunner = new TestRunner(testOptions);
      
      // Run tests for each URL
      const results = [];
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        console.log(chalk.yellow(`\n[${i + 1}/${urls.length}] Testing ${url}...`));
        
        const result = await testRunner.runTests(url);
        results.push({
          url,
          success: result.success,
          error: result.error,
          reportPaths: result.reportPaths
        });
        
        // Show individual result
        if (result.error) {
          console.log(chalk.red(`  Failed: ${result.error}`));
        } else {
          console.log(chalk.green(`  Completed: ${result.results.summary.passedTests}/${result.results.summary.totalTests} tests passed`));
        }
      }
      
      // Show summary of all results
      console.log(chalk.cyan('\nBatch Testing Summary:'));
      console.log(`Total Websites: ${results.length}`);
      console.log(`Successful: ${results.filter(r => r.success).length}`);
      console.log(`Failed: ${results.filter(r => !r.success).length}`);
      
      // Open the last HTML report if requested
      if (options.openReport && results.length > 0) {
        const lastResult = results[results.length - 1];
        if (lastResult.reportPaths && lastResult.reportPaths.html) {
          console.log(chalk.green('\nOpening HTML report for the last tested website...'));
          
          // Add a delay to ensure the file is fully written before opening
          setTimeout(() => {
            try {
              // Use absolute path for better compatibility
              const absolutePath = path.resolve(lastResult.reportPaths.html);
              
              // Use a more reliable approach for Windows
              if (process.platform === 'win32') {
                const { spawn } = require('child_process');
                spawn('cmd.exe', ['/c', 'start', '', absolutePath], {
                  detached: true,
                  stdio: 'ignore',
                  windowsVerbatimArguments: true
                }).unref();
              } else {
                // For non-Windows platforms
                const { exec } = require('child_process');
                const openCommand = process.platform === 'darwin' ? 'open' : 'xdg-open';
                exec(`${openCommand} "${absolutePath}"`, (error) => {
                  if (error) {
                    console.error(chalk.red(`Error opening report: ${error.message}`));
                  }
                });
              }
            } catch (error) {
              console.error(chalk.red(`Error opening report: ${error.message}`));
            }
          }, 1500); // 1.5 second delay
        }
      }
      
      // Exit with appropriate code
      const allSuccessful = results.every(r => r.success);
      process.exit(allSuccessful ? 0 : 1);
    } catch (error) {
      console.error(chalk.red(`\nUnexpected error: ${error.message}`));
      process.exit(1);
    }
  });

// Config command to generate a default config file
program
  .command('init-config')
  .description('Generate a default configuration file')
  .option('-o, --output <path>', 'Output path for the config file', './website-tester-config.json')
  .action((options) => {
    try {
      const configPath = path.resolve(options.output);
      
      // Load the default config
      const defaultConfig = require('./config');
      
      // Write the config to file
      fs.writeFileSync(
        configPath,
        JSON.stringify(defaultConfig, null, 2)
      );
      
      console.log(chalk.green(`Default configuration saved to ${configPath}`));
    } catch (error) {
      console.error(chalk.red(`Failed to generate config file: ${error.message}`));
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();

// Show help if no arguments provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
