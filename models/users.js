'use strict';
module.exports = function(sequelize, DataTypes) {
  var Users = sequelize.define('Users', {
    first_name: DataTypes.STRING,
    last_name: DataTypes.STRING,
    email: DataTypes.STRING,
    password: DataTypes.STRING
  }, { 
    underscored: true,
    classMethods: {
      associate: function(models) {
        models.Users.hasMany(models.Games, {foreignKey: "userwin_id"});
        models.Users.hasMany(models.Games, {foreignKey: "useronelose_id"});
        models.Users.hasMany(models.Games, {foreignKey: "usertwolose_id"});
        models.Users.hasMany(models.Games, {foreignKey: "userthreelose_id"});
      }
    }
  });
  return Users;
};