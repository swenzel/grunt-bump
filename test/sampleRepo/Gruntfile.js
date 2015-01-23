'use strict';

module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-bump');
  grunt.registerTask('mybump', 'using a wrapper to bump', function(){
    grunt.task.run('bump');
  });
  grunt.initConfig({
    bump: {
      options: {
        files: ['package.json'],
        updateConfigs: [],
        commit: true,
        commitMessage: 'Release v%VERSION%',
        commitFiles: ['package.json'],
        createTag: true,
        tagName: 'v%VERSION%',
        tagMessage: 'Version %VERSION%',
        push: true,
        pushTo: 'origin',
        gitDescribeOptions: '--tags --always --abbrev=1 --dirty=-d',
        globalReplace: false
      }
    }
  });
};
