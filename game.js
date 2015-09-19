'use strict';
module.exports = function(sequelize, DataTypes) {
  var Game = sequelize.define('Game', {
    name: DataTypes.STRING,
    contract_id: DataTypes.INTEGER,
    type_id: DataTypes.INTEGER,
    userwin_id: DataTypes.INTEGER,
    useronelose_id: DataTypes.INTEGER,
    usertwolose_id: DataTypes.INTEGER,
    userthreelose_id: DataTypes.INTEGER,
    completed: DataTypes.BOOLEAN
  }, {
    underscored: true,
    classMethods: {
      associate: function(models) {
        models.Game.hasOne(models.Contract);
        models.Game.hasOne(models.Type);
      }
    }
  });
  return Game;
};