'use strict';

var yeoman = require('yeoman-generator');
var chalk = require('chalk');
var yosay = require('yosay');
var request = require('request');
var AdmZip = require('adm-zip');
var fs = require('fs');

var META_URL = 'https://start.spring.io';
var META_FILE = 'meta.json';
var STARTER_URL = 'https://start.spring.io/starter.zip';
var STARTER_FILE = 'starter.zip';
var WORKING_DIR = '.';

var generator = module.exports = yeoman.Base.extend({
  initializing: function() {
    var done = this.async();    
    WORKING_DIR = this.destinationRoot();
    
    var dest = fs.createWriteStream(this.destinationRoot() + '/' + META_FILE);
    dest.once('finish', function() { done(); });

    this.log(chalk.green('Downloading Meta Information from Spring initializr'));
    request.get(META_URL)
      .on('error', function() {
        var errorMsg = 'Unable to download meta information from ' + META_URL;
        console.log(chalk.red(errorMsg));
      })          
      .pipe(dest);
  },
  prompting: function() {
    var done = this.async();

    fs.accessSync(WORKING_DIR + '/' + META_FILE, fs.F_OK);

    this.log(yosay(
      'Welcome to the groovy ' + chalk.red('spring-initializr') + ' generator!'
    ));
    this.log('This generator uses https://start.spring.io to bootstrap a Spring Boot Project for you.');
    this.log('');
    this.log(chalk.black.bgGreen('Please make sure you run the generator in an empty directory'));
    this.log('');

    var prompts = [];

    var data = fs.readFileSync(WORKING_DIR + '/' + META_FILE);

    var meta = JSON.parse(data);
    for (var key in meta) {
      if (key === '_links') {
        continue;
      }

      if (meta[key].type === 'hierarchical-multi-select') {
        for (var i = 0; i < meta[key].values.length; i++) {
          var choicesMultiSelect = [];
          for (var j = 0; j < meta[key].values[i].values.length; j++) {
            choicesMultiSelect.push(meta[key].values[i].values[j].id);
          }
          choicesMultiSelect.sort();
          prompts.push({
            type: 'checkbox',
            name: 'dependencies' + i,
            message: 'Select ' + meta[key].values[i].name + ' Dependencies',
            choices: choicesMultiSelect
          });
        }
      } else if (meta[key].type === 'text') {
        prompts.push({
          type: 'input',
          name: key,
          message: 'Enter ' + key,
          default: meta[key].default
        });
      } else if (meta[key].type === 'single-select') {
        var choices = [];
        for (var k = 0; k < meta[key].values.length; k++) {
          choices.push(meta[key].values[k].id);
        }
        prompts.push({
          type: 'list',
          name: key,
          message: 'Select ' + key,
          choices: choices,
          default: meta[key].default
        });
      } else if (meta[key].type === 'action') {
        var actionChoices = [];
        for (var l = 0; l < meta[key].values.length; l++) {
          actionChoices.push(meta[key].values[l].id);
        }
        prompts.push({
          type: 'list',
          name: key,
          message: 'Select ' + key,
          choices: actionChoices,
          default: meta[key].default
        });
      }
    }
    this.prompt(prompts, function(props) {
      this.props = props;
      done();
    }.bind(this));
  },
  writing: {
    downloading: function() {
      var done = this.async();
      this.log(chalk.green('Downloading Spring Boot Archive'));

      var formData = {};
      formData['dependencies'] = [];
      for (var key in this.props) {
        if (key.includes('dependencies')) {
          formData['dependencies'] = formData['dependencies'].concat(this.props[key]);
        } else {
          formData[key] = this.props[key];
        }
      }

      request.post({
          url: STARTER_URL,
          form: formData
        })
        .on('error', function(err) {
          console.log(chalk.red(err));
        })
        .on('end', function() {
          done();
        })
        .pipe(fs.createWriteStream(this.destinationRoot() + '/' + STARTER_FILE));
    },
    unzipping: function() {
      this.log(chalk.green('Extracting Spring Boot Archive'));
      var done = this.async();
      fs.lstat(this.destinationRoot() + '/' + STARTER_FILE, function(err, stats) {
        var zip = new AdmZip(STARTER_FILE);
        var zipEntries = zip.getEntries();
        zipEntries.forEach(function(zipEntry) {
          console.log('Extracting ' + zipEntry.entryName);
          zip.extractEntryTo(zipEntry, WORKING_DIR, true, true);
        });
        zip.extractAllTo(WORKING_DIR, true);
        done();
      });
    }
  },
  end: function() {
    this.log(chalk.green('Cleaning Up'));
    fs.unlinkSync(META_FILE);
    this.log('Removing ', META_FILE)
    fs.unlinkSync(STARTER_FILE);
    this.log('Removing ', STARTER_FILE);
  }
});
