module.exports = function(grunt) {
 
  grunt.initConfig({
    jshint: {
		//http://www.jshint.com/docs/options/
		options:{
			eqeqeq: false,
			latedef: false,
			noempty: false,
			asi:true,
			loopfunc:true,
			shadow:true,
			sub:true,
			node:true,
			"-W041": true,
			"-W038": true,
			"-W082": true
		},
		all: ['Gruntfile.js', 'api/api.js', 'api/lib/*.js', 'api/parts/**/*.js', 'api/utils/common.js', 'frontend/express/app.js']
    },
	// Configure a mochaTest task
    mochaTest: {
      test: {
        options: {
          reporter: 'spec',
		  timeout: 5000
        },
        src: ['test/**/*.js']
      }
    }
  });
 
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.registerTask('default', ['jshint', "mochaTest"]);
 
};