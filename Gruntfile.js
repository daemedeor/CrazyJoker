module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    postcss: {
      options: {
        map: false,
        processors: [
          require('autoprefixer')({browsers: ['last 7 versions']})
        ]
      },
      dist: {
        src: './public/css/**.css'
      }
    },
    compass: {
      css: {
        options: {
          config: 'config.rb'
        }
      }
    },
    watch: {
        options: {
            livereload: true,
        },
        css: {
            files: ['**/*.scss'],
            tasks: ['compass', 'postcss:dist'],
            options: {
                spawn: false,
            }
        }
    }
  });

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-postcss');
  grunt.loadNpmTasks('grunt-contrib-compass');
  grunt.loadNpmTasks('grunt-contrib-watch');
  // Default task(s).
  grunt.registerTask('default', ['watch']);

};