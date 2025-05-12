/**
 * Report generator utility for the website testing automation tool
 */
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

class ReportGenerator {
  constructor(options = {}) {
    this.options = {
      outputDir: './reports',
      formats: ['console', 'html', 'json'],
      ...options
    };
    
    // Ensure the output directory exists
    fs.ensureDirSync(this.options.outputDir);
  }

  /**
   * Generate a test report
   * @param {Object} testResults - The test results to include in the report
   * @param {string} websiteUrl - The URL of the website that was tested
   * @returns {Object} - Paths to the generated report files
   */
  generateReport(testResults, websiteUrl) {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const websiteDomain = new URL(websiteUrl).hostname;
    const reportName = `${websiteDomain}-${timestamp}`;
    const reportFiles = {};

    // Generate reports in each requested format
    if (this.options.formats.includes('console')) {
      this._generateConsoleReport(testResults, websiteUrl);
    }

    if (this.options.formats.includes('json')) {
      const jsonPath = path.join(this.options.outputDir, `${reportName}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(testResults, null, 2));
      reportFiles.json = jsonPath;
    }

    if (this.options.formats.includes('html')) {
      const htmlPath = path.join(this.options.outputDir, `${reportName}.html`);
      const htmlContent = this._generateHtmlReport(testResults, websiteUrl);
      fs.writeFileSync(htmlPath, htmlContent);
      reportFiles.html = htmlPath;
    }

    return reportFiles;
  }

  /**
   * Generate a console report
   * @private
   * @param {Object} testResults - The test results
   * @param {string} websiteUrl - The URL of the website that was tested
   */
  _generateConsoleReport(testResults, websiteUrl) {
    console.log('\n');
    console.log(chalk.cyan('='.repeat(80)));
    console.log(chalk.cyan(`TEST REPORT FOR: ${websiteUrl}`));
    console.log(chalk.cyan('='.repeat(80)));
    
    // Summary
    console.log(chalk.bold('\nSUMMARY:'));
    console.log(`Total Pages Tested: ${testResults.summary.totalPages}`);
    console.log(`Total Tests Run: ${testResults.summary.totalTests}`);
    console.log(`Tests Passed: ${testResults.summary.passedTests}`);
    console.log(`Tests Failed: ${testResults.summary.failedTests}`);
    
    // Overall status
    const overallStatus = testResults.summary.failedTests === 0 ? 
      chalk.green('PASSED') : chalk.red('FAILED');
    console.log(`\nOverall Status: ${overallStatus}`);
    
    // Performance scores
    if (testResults.performance) {
      console.log(chalk.bold('\nPERFORMANCE SCORES:'));
      Object.entries(testResults.performance).forEach(([metric, score]) => {
        const formattedScore = (score * 100).toFixed(0);
        const colorFn = score >= 0.9 ? chalk.green : 
                       (score >= 0.5 ? chalk.yellow : chalk.red);
        console.log(`${metric}: ${colorFn(formattedScore + '%')}`);
      });
    }
    
    // Issues
    if (testResults.issues && testResults.issues.length > 0) {
      console.log(chalk.bold('\nISSUES FOUND:'));
      testResults.issues.forEach((issue, index) => {
        console.log(`\n${index + 1}. ${chalk.red(issue.type)} - ${issue.description}`);
        if (issue.location) console.log(`   Location: ${issue.location}`);
        if (issue.suggestion) console.log(`   Suggestion: ${issue.suggestion}`);
      });
    } else {
      console.log(chalk.bold('\nISSUES FOUND:'));
      console.log(chalk.green('No issues found!'));
    }
    
    console.log(chalk.cyan('\n' + '='.repeat(80)));
  }

  /**
   * Generate an HTML report
   * @private
   * @param {Object} testResults - The test results
   * @param {string} websiteUrl - The URL of the website that was tested
   * @returns {string} - The HTML report content
   */
  _generateHtmlReport(testResults, websiteUrl) {
    const getStatusClass = (score) => {
      if (score >= 0.9) return 'success';
      if (score >= 0.5) return 'warning';
      return 'danger';
    };

    // Generate issue list HTML
    let issuesHtml = '';
    if (testResults.issues && testResults.issues.length > 0) {
      testResults.issues.forEach((issue, index) => {
        issuesHtml += `
          <div class="issue-card">
            <div class="issue-header ${issue.severity || 'error'}">
              <span class="issue-number">#${index + 1}</span>
              <span class="issue-type">${issue.type}</span>
            </div>
            <div class="issue-body">
              <p>${issue.description}</p>
              ${issue.location ? `<p><strong>Location:</strong> ${issue.location}</p>` : ''}
              ${issue.suggestion ? `<p><strong>Suggestion:</strong> ${issue.suggestion}</p>` : ''}
            </div>
          </div>
        `;
      });
    } else {
      issuesHtml = '<div class="no-issues">No issues found!</div>';
    }

    // Generate performance metrics HTML
    let performanceHtml = '';
    if (testResults.performance) {
      Object.entries(testResults.performance).forEach(([metric, score]) => {
        const formattedScore = (score * 100).toFixed(0);
        const statusClass = getStatusClass(score);
        performanceHtml += `
          <div class="metric">
            <div class="metric-name">${metric}</div>
            <div class="metric-score ${statusClass}">${formattedScore}%</div>
          </div>
        `;
      });
    }

    // Generate HTML template
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Website Test Report - ${websiteUrl}</title>
        <style>
          :root {
            --primary-color: #3498db;
            --success-color: #2ecc71;
            --warning-color: #f39c12;
            --danger-color: #e74c3c;
            --text-color: #333;
            --light-bg: #f5f5f5;
          }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: var(--text-color);
            background-color: var(--light-bg);
            margin: 0;
            padding: 0;
          }
          
          .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
          }
          
          header {
            background-color: var(--primary-color);
            color: white;
            padding: 20px;
            text-align: center;
            margin-bottom: 30px;
            border-radius: 5px;
          }
          
          h1, h2, h3 {
            margin-top: 0;
          }
          
          .summary-card {
            background-color: white;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            padding: 20px;
            margin-bottom: 30px;
          }
          
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 20px;
          }
          
          .summary-item {
            text-align: center;
            padding: 15px;
            border-radius: 5px;
            background-color: white;
            box-shadow: 0 2px 5px rgba(0,0,0,0.05);
          }
          
          .summary-item .number {
            font-size: 2.5rem;
            font-weight: bold;
            margin-bottom: 5px;
          }
          
          .summary-item .label {
            font-size: 0.9rem;
            color: #777;
          }
          
          .status {
            display: inline-block;
            padding: 8px 15px;
            border-radius: 20px;
            font-weight: bold;
            margin-top: 10px;
          }
          
          .status.success {
            background-color: var(--success-color);
            color: white;
          }
          
          .status.danger {
            background-color: var(--danger-color);
            color: white;
          }
          
          .metrics-container {
            background-color: white;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            padding: 20px;
            margin-bottom: 30px;
          }
          
          .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 20px;
          }
          
          .metric {
            text-align: center;
            padding: 15px;
            border-radius: 5px;
            background-color: var(--light-bg);
          }
          
          .metric-name {
            font-weight: bold;
            margin-bottom: 10px;
            text-transform: capitalize;
          }
          
          .metric-score {
            font-size: 1.5rem;
            font-weight: bold;
            padding: 5px 10px;
            border-radius: 20px;
            display: inline-block;
          }
          
          .metric-score.success {
            background-color: var(--success-color);
            color: white;
          }
          
          .metric-score.warning {
            background-color: var(--warning-color);
            color: white;
          }
          
          .metric-score.danger {
            background-color: var(--danger-color);
            color: white;
          }
          
          .issues-container {
            background-color: white;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            padding: 20px;
            margin-bottom: 30px;
          }
          
          .issue-card {
            border-radius: 5px;
            overflow: hidden;
            box-shadow: 0 2px 5px rgba(0,0,0,0.05);
            margin-bottom: 15px;
          }
          
          .issue-header {
            padding: 10px 15px;
            display: flex;
            justify-content: space-between;
            color: white;
          }
          
          .issue-header.error {
            background-color: var(--danger-color);
          }
          
          .issue-header.warning {
            background-color: var(--warning-color);
          }
          
          .issue-header.info {
            background-color: var(--primary-color);
          }
          
          .issue-body {
            padding: 15px;
            background-color: var(--light-bg);
          }
          
          .no-issues {
            text-align: center;
            padding: 30px;
            color: var(--success-color);
            font-weight: bold;
            font-size: 1.2rem;
          }
          
          footer {
            text-align: center;
            margin-top: 30px;
            padding: 20px;
            color: #777;
            font-size: 0.9rem;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <header>
            <h1>Website Test Report</h1>
            <p>${websiteUrl}</p>
            <p>Generated on ${new Date().toLocaleString()}</p>
          </header>
          
          <div class="summary-card">
            <h2>Summary</h2>
            <div class="summary-grid">
              <div class="summary-item">
                <div class="number">${testResults.summary.totalPages}</div>
                <div class="label">Pages Tested</div>
              </div>
              <div class="summary-item">
                <div class="number">${testResults.summary.totalTests}</div>
                <div class="label">Tests Run</div>
              </div>
              <div class="summary-item">
                <div class="number">${testResults.summary.passedTests}</div>
                <div class="label">Tests Passed</div>
              </div>
              <div class="summary-item">
                <div class="number">${testResults.summary.failedTests}</div>
                <div class="label">Tests Failed</div>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px;">
              <div class="status ${testResults.summary.failedTests === 0 ? 'success' : 'danger'}">
                ${testResults.summary.failedTests === 0 ? 'PASSED' : 'FAILED'}
              </div>
            </div>
          </div>
          
          <div class="metrics-container">
            <h2>Performance Metrics</h2>
            <div class="metrics-grid">
              ${performanceHtml}
            </div>
          </div>
          
          <div class="issues-container">
            <h2>Issues Found</h2>
            ${issuesHtml}
          </div>
          
          <footer>
            Generated by Website Testing Automation Tool
          </footer>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = ReportGenerator;
