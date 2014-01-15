module.exports = function(grunt) {
  var path = require('path'),
      connect = require('connect'),
      tmp = require('tmp'),
      fs = require('fs'),
      glob = require('glob'),
      _ = require('lodash');

  function linkInDir(srcpath, dirpath) {
    var destpath = path.join(dirpath, path.basename(srcpath));
    fs.symlinkSync(path.resolve(srcpath), destpath);
  }

  function staticPaths(filepaths) {
    return grunt.file
      .expand(filepaths)
      .map(function(p) {
        return path.join('/', path.basename(process.env.PWD), p);
      });
  }

  function buildRunner(dirpath, data) {
    var jst = fs.readFileSync(
      path.join(__dirname, 'runner.jst'),
      {encoding: 'utf8'});

    fs.writeFileSync(
      path.join(dirpath, 'index.html'),
      grunt.template.process(jst, {data: data}));
  }

  grunt.registerMultiTask(
  'mochaRunner',
  'Serve a mocha browser test runner with the configured source and spec scripts.',
  function() {
    var options = this.options({
      title: 'Mocha Spec Runner',
      ui: 'bdd',
      port: 8000,
      hostname: 'localhost'
    });
    if(options.setup) {
      options.setup = '(f)();'.replace('f', options.setup.toString());
    }

    if (options.hostname === '*') { options.hostname = null; }

    var data = this.data;
    var done = this.async();

    tmp.dir(function(err, dirpath) { 
      var modulesDir = path.resolve(__dirname, '..', 'node_modules');

      linkInDir(path.join(modulesDir, 'chai', 'chai.js'), dirpath);
      linkInDir(path.join(modulesDir, 'mocha', 'mocha.js'), dirpath);
      linkInDir(path.join(modulesDir, 'mocha', 'mocha.css'), dirpath);
      linkInDir(path.join(modulesDir, 'sinon', 'pkg', 'sinon.js'), dirpath);
      linkInDir(path.join(modulesDir, 'sinon-chai', 'lib', 'sinon-chai.js'), dirpath);
      linkInDir(process.env.PWD, dirpath);

      // NOTE: 'src' and 'spec' are deprecated and will be removed in v1.0.0
      data.scripts = _.flatten(_.flatten((data.scripts || []).concat(data.src || [], data.spec || []))
        .map(function(src) {
          if(src.indexOf('*') >= 0) return glob.sync(src);
          else return src;
        }));

      buildRunner(dirpath, {
       options: options,
       paths: {
         styles: staticPaths(data.styles || []),
         scripts: staticPaths(data.scripts)
       }
      });

      connect()
        .use(connect.static(dirpath))
        .listen(options.port, options.hostname)
        .on('listening', function() { done(); });
    });
  });
};
