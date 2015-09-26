'use strict';
module.exports = function(sequelize, DataTypes) {
  var Contracts = sequelize.define('Contracts', {
    name: DataTypes.STRING,
    description: DataTypes.STRING,
    game_id: DataTypes.INTEGER,
    game_name: DataTypes.STRING
  }, {
    underscored: true,
    classMethods: {
      associate: function(models) {
        models.Contracts.belongsTo(models.Games, {foreignKey: 'game_id'});
      }
    }
  });
  return Contracts;
};