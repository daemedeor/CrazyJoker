var models = require('../models');

var faker = require('faker');

models.sequelize
  .sync({force:true})

  .then(function(){
    //Add Product
    var contractsData = [];

    contractsData.push(
      {
        name: "Full Full House",
        description: "The hand must consist of four cards of the same rank (no facecards) and three of the same face card."
      },
      {
        name: "Fixed Straight",
        description: "The hand must consist of a Queen and six other cards, that are in order like a straight."
      },
      {
        name: "The Big Flush",
        description: "The hand must consist of seven cards all of the same suit."
      },
      {
        name: "Faced by Evens",
        description: "The hand must consist of four different face cards and three of the same cards that are even. For example: K, Q, J, A and three 2s or three 4s, 6s, etc."
      },
      {
        name: "Odd Man Out",
        description: "This hand must consist of six odd numbers, four of those must be different card numbers and One King or Jack. For example 3,3,5,7,7,9,K."
      },
      {
        name: "Sum of High",
        description: "The sum of the lowest five cards equal the sum of the two highest cards."
      }
    );
 
    return models.Contracts
      .bulkCreate(contractsData);
  });