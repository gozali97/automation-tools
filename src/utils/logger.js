/**
 * Logger utility for the website testing automation tool
 */
const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');

class Logger {
  constructor(options = {}) {
    this.options = {
      logToConsole: true,
      logToFile: false,
      logFilePath: './logs',
      logFileName: `test-${new Date().toISOString().replace(/:/g, '-')}.log`,
      ...options
    };

    if (this.options.logToFile) {
      fs.ensureDirSync(this.options.logFilePath);
      this.logFilePath = path.join(
        this.options.logFilePath, 
        this.options.logFileName
      );
    }
  }

  /**
   * Log an info message
   * @param {string} message - The message to log
   */
  info(message) {
    const formattedMessage = `[INFO] ${message}`;
    if (this.options.logToConsole) {
      console.log(chalk.blue(formattedMessage));
    }
    this._writeToFile(formattedMessage);
  }

  /**
   * Log a success message
   * @param {string} message - The message to log
   */
  success(message) {
    const formattedMessage = `[SUCCESS] ${message}`;
    if (this.options.logToConsole) {
      console.log(chalk.green(formattedMessage));
    }
    this._writeToFile(formattedMessage);
  }

  /**
   * Log a warning message
   * @param {string} message - The message to log
   */
  warn(message) {
    const formattedMessage = `[WARNING] ${message}`;
    if (this.options.logToConsole) {
      console.log(chalk.yellow(formattedMessage));
    }
    this._writeToFile(formattedMessage);
  }

  /**
   * Log an error message
   * @param {string} message - The message to log
   */
  error(message) {
    const formattedMessage = `[ERROR] ${message}`;
    if (this.options.logToConsole) {
      console.log(chalk.red(formattedMessage));
    }
    this._writeToFile(formattedMessage);
  }

  /**
   * Log a section header
   * @param {string} title - The section title
   */
  section(title) {
    const separator = '='.repeat(title.length + 10);
    const formattedMessage = `\n${separator}\n     ${title.toUpperCase()}     \n${separator}\n`;
    
    if (this.options.logToConsole) {
      console.log(chalk.cyan(formattedMessage));
    }
    this._writeToFile(formattedMessage);
  }

  /**
   * Write a message to the log file if file logging is enabled
   * @private
   * @param {string} message - The message to write to the log file
   */
  _writeToFile(message) {
    if (this.options.logToFile) {
      const timestamp = new Date().toISOString();
      fs.appendFileSync(
        this.logFilePath, 
        `${timestamp} ${message}\n`
      );
    }
  }
}

module.exports = Logger;
