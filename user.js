'use strict';
module.exports = function(sequelize, DataTypes) {
  var User = sequelize.define('User', {
    first_name: DataTypes.STRING,
    last_name: DataTypes.STRING,
    email: DataTypes.STRING,
    password: DataTypes.STRING
  }, {
    underscored: true,
    classMethods: {
      associate: function(models) {
        models.User.hasMany(models.Game, {foreignKey: "userwin_id"});
        models.User.hasMany(models.Game, {foreignKey: "useronelose_id"});
        models.User.hasMany(models.Game, {foreignKey: "usertwolose_id"});
        models.User.hasMany(models.Game, {foreignKey: "userthreelose_id"});
      }
    }
  });
  return User;
};