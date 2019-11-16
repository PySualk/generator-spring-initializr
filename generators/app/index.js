'use strict';

const Generator = require('yeoman-generator');
const chalk = require('chalk');
const yosay = require('yosay');
const request = require('request');
const AdmZip = require('adm-zip');
const fs = require('fs');

const META_URL = 'https://start.spring.io';
const META_FILE = 'meta.json';
const STARTER_URL = 'https://start.spring.io/starter.zip';
const STARTER_FILE = 'starter.zip';
let WORKING_DIR = '.';

module.exports = class extends Generator {
  initializing() {
    const done = this.async();
    WORKING_DIR = this.destinationRoot();
    const metaFile = fs.createWriteStream(this.destinationRoot() + '/' + META_FILE);
    metaFile.once('finish', function() {
      done();
    });
    this.log(chalk.green('Downloading Meta Information from Spring initializr'));
    request
      .get(META_URL)
      .on('error', function() {
        const errorMsg = 'Unable to download meta information from ' + META_URL;
        console.log(chalk.red(errorMsg));
      })
      .pipe(metaFile);
  }

  async prompting() {
    fs.accessSync(WORKING_DIR + '/' + META_FILE, fs.F_OK);
    this.log(yosay('Welcome to the groovy ' + chalk.red('spring-initializr') + ' generator!'));
    this.log(
      'This generator uses https://start.spring.io to bootstrap a Spring Boot Project for you.'
    );
    this.log('');
    this.log(chalk.black.bgYellow('Please make sure you run the generator in an empty directory'));
    this.log('');
    const prompts = [];
    const data = fs.readFileSync(WORKING_DIR + '/' + META_FILE);
    const meta = JSON.parse(data);
    for (let key in meta) {
      if (key === '_links') {
        continue;
      }
      if (meta[key].type === 'hierarchical-multi-select') {
        for (let i = 0; i < meta[key].values.length; i++) {
          const choicesMultiSelect = [];
          for (let j = 0; j < meta[key].values[i].values.length; j++) {
            choicesMultiSelect.push(meta[key].values[i].values[j].id);
          }
          choicesMultiSelect.sort();
          prompts.push({
            type: 'checkbox',
            name: 'dependencies' + i,
            message: 'Select ' + meta[key].values[i].name + ' Dependencies',
            choices: choicesMultiSelect,
          });
        }
      } else if (meta[key].type === 'text') {
        prompts.push({
          type: 'input',
          name: key,
          message: 'Enter ' + key,
          default: meta[key].default,
        });
      } else if (meta[key].type === 'single-select') {
        const choices = [];
        for (let k = 0; k < meta[key].values.length; k++) {
          choices.push(meta[key].values[k].id);
        }
        prompts.push({
          type: 'list',
          name: key,
          message: 'Select ' + key,
          choices: choices,
          default: meta[key].default,
        });
      } else if (meta[key].type === 'action') {
        const actionChoices = [];
        for (let l = 0; l < meta[key].values.length; l++) {
          actionChoices.push(meta[key].values[l].id);
        }
        prompts.push({
          type: 'list',
          name: key,
          message: 'Select ' + key,
          choices: actionChoices,
          default: meta[key].default,
        });
      }
    }
    this.answers = await this.prompt(prompts);
  }

  downloading() {
    this.log(chalk.green('Downloading Spring Boot Archive'));
    const done = this.async();
    const formData = {};
    formData.dependencies = [];
    for (let key in this.answers) {
      if (key.includes('dependencies')) {
        formData.dependencies = formData.dependencies.concat(this.answers[key]);
      } else {
        formData[key] = this.answers[key];
      }
    }

    request
      .post({
        url: STARTER_URL,
        form: formData,
      })
      .on('error', function(err) {
        console.log(chalk.red(err));
      })
      .on('end', function() {
        done();
      })
      .pipe(fs.createWriteStream(this.destinationRoot() + '/' + STARTER_FILE));
  }

  unzipping() {
    this.log(chalk.green('Extracting Spring Boot Archive'));
    const done = this.async();
    fs.lstat(this.destinationRoot() + '/' + STARTER_FILE, () => {
      const zip = new AdmZip(STARTER_FILE);
      const zipEntries = zip.getEntries();
      zipEntries.forEach(function(zipEntry) {
        console.log('Extracting', zipEntry.entryName);
        zip.extractEntryTo(zipEntry, WORKING_DIR, true, true);
      });
      zip.extractAllTo(WORKING_DIR, true);
      done();
    });
  }

  end() {
    this.log(chalk.green('Cleaning Up'));
    fs.unlinkSync(META_FILE);
    this.log('Removing', META_FILE);
    fs.unlinkSync(STARTER_FILE);
    this.log('Removing', STARTER_FILE);
  }
};
