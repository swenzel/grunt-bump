'use strict';

/*
  ======== A Handy Little Nodeunit Reference ========
  https://github.com/caolan/nodeunit

  Test methods:
    test.expect(numAssertions)
    test.done()
  Test assertions:
    test.ok(value, [message])
    test.equal(actual, expected, [message])
    test.notEqual(actual, expected, [message])
    test.deepEqual(actual, expected, [message])
    test.notDeepEqual(actual, expected, [message])
    test.strictEqual(actual, expected, [message])
    test.notStrictEqual(actual, expected, [message])
    test.throws(block, [error], [message])
    test.doesNotThrow(block, [error], [message])
    test.ifError(value)
*/

var pkg = require('../package.json');

var os   = require('os');
var fse  = require('fs-extra');
var path = require('path');
var sh = require('execSync');

var tempDir = path.join(os.tmpdir(),'bump-test');
var owd;

var initRepos = function(){
    // save cwd to restore it later
    owd = process.cwd();

    // ##############################
    // setup "remote" test repository
    // ##############################
    fse.mkdirSync(tempDir);
    process.chdir(tempDir);
    fse.mkdirSync('sampleRepo.git');
    process.chdir('sampleRepo.git');

    sh.run('git init --bare');

    // ###########################
    // setup local test repository
    // ###########################
    process.chdir('..');
    sh.run('git clone sampleRepo.git');
    process.chdir('sampleRepo');

    // move all the contents from our test sample repository
    // *****************************************************
    fse.copySync(path.join(owd,'test','sampleRepo'),'.');

    // move grunt-bump to the repo
    // ***************************

    // we copy directly and do not use install since it is quicker this way

    // if we only have one entry, copy it
    if(typeof pkg.main === 'string'){
      fse.copySync(
        path.join(owd, pkg.main),
        path.join('node_modules', 'grunt-bump', pkg.main)
      );
    }
    // if there are several, copy all
    else if (typeof pkg.main === 'object'){
      for( var i in pkg.main){
        fse.copySync(
          path.join(owd, pkg.main[i]),
          path.join('node_modules', 'grunt-bump', pkg.main[i])
        );
      }
    }
    fse.copySync(
      path.join(owd,'package.json'),
      path.join('node_modules', 'grunt-bump', 'package.json')
    );

    // move required dependencies
    // **************************

    for( var dep in pkg.dependencies){
      fse.copySync(
        path.join(owd, 'node_modules', dep),
        path.join('node_modules', 'grunt-bump', 'node_modules', dep)
      );
    }
    // we also need grunt itself to be able to run it
    fse.copySync(
      path.join(owd,'node_modules', 'grunt'),
      path.join('node_modules', 'grunt')
    );

    // now we have a fully working repository with the contents from
    // '/test/sampleRepo' and an empty upstream for testing.
    // no commits or pushes so far
};

var dropRepos = function(){
    // delete temporary files
    fse.removeSync(tempDir);

    // restore old working directory
    process.chdir(owd);
};

var gitCleanDir = 'On branch master\nYour branch is up-to-date with \'origin/master\'.\n\nnothing to commit, working directory clean\n';

exports.dryRun = {

  setUp: function(done){
    initRepos();
    done();
  },
  tearDown: function(done){
    dropRepos();
    done();
  },

  // Everything should be done in this one test!

  // afaik nodeunit does not support sequential testing.
  // We get problems with the cwd of 'process' if we use different temp folders
  // and if we use only one we get problems with different tests working
  // on the same folder at the same time.
  // Solution could be to use mocha for testing, it supports sequential tests.
  test1: function(test){

    test.expect(15);
    console.log('test1 cwd');
    console.log(process.cwd());

    test.equal(sh.run('git add .'), 0);

    // see if the wiring is okay
    test.equal(sh.run('git commit -m "test"'), 0);
    test.equal(sh.run('git push'), 0);

    // save HEAD for later use
    var result = sh.exec('git rev-parse HEAD');
    var gitTestCommitId = result.stdout;

    // Function to check If we changed anything
    var checkClean = function(){
      result = sh.exec('git status');
      // if git says nothing changed and we're up to date, almost eveything is
      // fine...
      test.equal(result.stdout, gitCleanDir);
      // ...but this message could also appear after we've just pushed
      // everything so we check the id of HEAD
      result = sh.exec('git rev-parse HEAD');
      test.equal(result.stdout, gitTestCommitId);
      // now we're good :)
    };

    // try with plain bump
    test.equal(sh.run('grunt bump --dry-run'), 0);
    checkClean();

    // try with commit-only
    test.equal(sh.run('grunt bump-commit --dry-run'), 0);
    checkClean();

    // try with bump-only
    test.equal(sh.run('grunt bump-only --dry-run'), 0);
    checkClean();

    // try using a wrapper task
    test.equal(sh.run('grunt mybump --dry-run'), 0);
    checkClean();

    test.done();
  }
};
