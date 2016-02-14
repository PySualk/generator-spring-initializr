'use strict';
var path = require('path');
var assert = require('yeoman-assert');
var helpers = require('yeoman-generator').test;

describe('generator-spring-initializr:app', function() {
  before(function(done) {
    helpers.run(path.join(__dirname, '../generators/app'))
      .on('end', done);
  });

  it('creates src directory', function() {
    assert.file([
      'src/'
    ]);
  });

  it('cleanes up temporary files', function() {
    assert.noFile([
      'meta.json',
      'starter.zip'
    ]);
  });
});
