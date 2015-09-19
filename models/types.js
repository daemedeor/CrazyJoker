'use strict';
module.exports = function(sequelize, DataTypes) {
  var Types = sequelize.define('Types', {
    name: DataTypes.STRING,
    description: DataTypes.STRING
  }, {
    underscored: true,
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    }
  });
  return Types;
};