'use strict';
var yeoman = require('yeoman-generator');
var chalk = require('chalk');
var yosay = require('yosay');
var request = require('request');
var AdmZip = require('adm-zip');
var fs = require('fs');

var META_URL = 'https://start.spring.io';
var STARTER_URL = 'https://start.spring.io/starter.zip';
var TMP_FILE = 'starter.zip';
var META_FILE = 'meta.json';

module.exports = yeoman.generators.Base.extend({
  initializing: function() {
    var done = this.async();
    // Getting meta data from spring initializr
    request.get(META_URL)
      .on('error', function() {
        var errorMsg = 'Unable to download meta information from ' + META_URL;
        console.log(chalk.red(errorMsg));
      })
      .on('end', function() {
        done();
      })
      .pipe(fs.createWriteStream(this.destinationRoot() + '/' + META_FILE));
  },
  prompting: function() {
    var done = this.async();

    // Have Yeoman greet the user.
    this.log(yosay(
      'Welcome to the groovy ' + chalk.red('spring-initializr') + ' generator!'
    ));
    this.log('This generator uses https://start.spring.io to bootstrap a Spring Boot Project for you.');
    this.log('');
    this.log(chalk.black.bgGreen('Please make sure you run the generator in an empty directory'));
    this.log('');

    var prompts = [];
    var data = fs.readFileSync(this.destinationRoot() + '/' + META_FILE);

    var meta = JSON.parse(data);
    for (var key in meta) {
      if (key === '_links') {
        continue;
      }

      if (meta[key].type === 'hierarchical-multi-select') {
        var choicesMultiSelect = [];
        for (var i = 0; i < meta[key].values.length; i++) {
          for (var j = 0; j < meta[key].values[i].values.length; j++) {
            choicesMultiSelect.push(meta[key].values[i].values[j].id);
          }
        }
        choicesMultiSelect.sort();
        prompts.push({
          type: 'checkbox',
          name: key,
          message: 'Select ' + key + ' (Press space to select)',
          choices: choicesMultiSelect,
          default: meta[key].default
        });
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
      request.post({
          url: STARTER_URL,
          form: this.props
        })
        .on('error', function(err) {
          console.log(chalk.red(err));
        })
        .on('end', function() {
          done();
        })
        .pipe(fs.createWriteStream(this.destinationRoot() + '/' + TMP_FILE));
    },
    unzipping: function() {
      this.log(chalk.green('Unzipping Spring Boot Archive'));
      var done = this.async();
      var zip = new AdmZip(TMP_FILE);
      zip.extractAllTo('.', true);
      done();
    }
  },
  end: function() {
    this.log(chalk.green('Cleaning Up'));
    fs.unlinkSync(TMP_FILE);
    fs.unlinkSync(META_FILE);
  }
});
