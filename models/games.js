'use strict';
module.exports = function(sequelize, DataTypes) {
  var Games = sequelize.define('Games', {
    name: DataTypes.STRING,
    contract_id: DataTypes.INTEGER,
    type_id: DataTypes.INTEGER,
    userwin_id: DataTypes.INTEGER,
    useronelose_id: DataTypes.INTEGER,
    usertwolose_id: DataTypes.INTEGER,
    userthreelose_id: DataTypes.INTEGER
  }, {
    underscored: true,
    classMethods: {
      associate: function(models) {
        models.Games.hasOne(models.Contracts);
        models.Games.hasOne(models.Types);
      }
    }
  });
  return Games;
};