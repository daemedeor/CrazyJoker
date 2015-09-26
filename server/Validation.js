var moment = require("moment");
var  cardRank =  {
  "K" : 13,
  "A" : 14,
  "Q" : 12,
  "J" : 11,
  "faceCards": ["K", "A", "Q", "J"],
  "B_K": 0,
  "B_A": 1
};
  
var validation = function(currentHand, player){
  flag = false;

  var newCardHand = convertHandToCards(currentHand);
  var nameOfContract = player.currentContract.contractName;
  
  if(nameOfContract){
    console.log(nameOfContract);
    switch(nameOfContract.toLowerCase()){
      case "fullfullhouse":
        flag = isFullFullHouseValid(newCardHand);
        break;

      case "fixedstraight":
        flag = isFixedStraightValidated(newCardHand);
        break;

      case "bigflush":
        flag = isBigFlushValidated(newCardHand);
        break;

      case "facebyeven":
        flag = isFaceByEvenValidated(newCardHand);
        break;

      case "birthdaywish":
        flag = isBirthdayWishValidated(newCardHand, player);
        break;

      case "oddmanout":
        flag = isOddManOutValidated(newCardHand);
        break;
      default:
        reason = "nonExistentContract";
    }

  }else{
    reason = "noContract";
  }

  

  return {valid: flag, warning: reason};
}


function isFullFullHouseValid (hand) {
  
  var specificRankToWatch
      , specificFaceToWatch
      , rankCounter
      , faceCounter
      , flagWatch
      , isCurrentlyValid = true;


  hand.forEach(function(card, index){
        
    if(typeof card.rank == "number"){

      if(specificRankToWatch){
        
        if(specificRankToWatch == card.rank && counter < 4){
          rankCounter++;
        }else{
          isCurrentlyValid = false;
          return;
        }

      }else{
        specificRankToWatch = card.rank;
      }

    }else{

      if(specificFaceToWatch){
        
        if(specificFaceToWatch == card.rank && counter < 3){
          rankCounter++;
        }else{
          isCurrentlyValid = false;
          return;
        }

      }else{
        specificFaceToWatch = card.rank;
      }
    }

  });

  return isCurrentlyValid;
};

function isFixedStraightValidated (hand) {
 
  var specificRankToWatch
      , hasQueen = false
      , inOrder = false
      , previousValue = 0
      , isCurrentlyValid = false;
  
  hand.sort(function(a,b){
    return a.value - b.value;
  });

  //if the value is 5 to two
  //impossible to have queen
  if(hand[0].value < 6 && hand[0].value >= 2){
    this.flag = false;
    return;
  }

  //check the newly sorted hand for inconsistencies
  hand.forEach(function(card, i){
    
    if(card.rank == "Q"){
      hasQueen = true;
    }

    if(previousValue || card.rank == "K"){
      
      if(card.value != ((previousValue % 12) + 1)){
        inOrder = false;
        return;
      }else{
        previousValue++;
        inOrder = true;
      }

    }else{
      previousValue = card.value;
    }

  });

  if(inOrder && hasQueen){
    isCurrentlyValid = true;
  }

  return isCurrentlyValid;
};

function isBigFlushValidated (hand) {
  var isSameSuit = true
      , validSuit = hand[0].suit;

  hand.forEach(function(card, i){
 
    if(card.suit != validSuit){
      isSameSuit = false;
      return;
    }

  });

  return isSameSuit;
};

function isFaceByEvenValidated (hand) {
  
  var containsAllFaceCards
      , isValid = false
      , noOfEvenCards = 0
      , evenCardType
      , faceCardsEncountered = [];

  hand.forEach(function(card, i){
    
    if(typeof card.rank == "number"){
      
      if(isEven(card.rank) && noOfEvenCards < 3){
        
        noOfEvenCards++;

        if(evenCardType){
          
          if(card.rank == evenCardType){
            isValid = true;
          }else{
            isValid = false;
            return;
          }
        
        }else{
          evenCardType = card.rank;
        }

      }else{
        isValid = false;
        return;
      }

    }else{
      if(faceCardsEncountered.indexOf(card.rank) == -1){
        faceCardsEncountered.push(card.rank);
      }else{
        isValid = false;
        return;
      }
    }

  });

  return isValid;
};

function isBirthdayWishValidated (hand, birthday) {
  var convertedBirthday = moment(birthday)
      , month = convertedBirthday.format("M")
      , day = convertedBirthday.format("DD").toString()
      , year = convertedBirthday.format("YYYY").toString()
      , dayCardOne = day.substring(0,1)
      , dayCardTwo = day.substring(1,1)
      , yearCardOne = year.substring(0,1)
      , yearCardTwo = year.substring(1,1)
      , yearCardThree = year.substring(2,1)
      , yearCardFour = year.substring(3,1)
      , isValid = false
      , birthDayArray = [month,dayCardOne,dayCardTwo,yearCardOne,yearCardTwo,yearCardThree,yearCardFour];

      birthDayArray.forEach(function(e,i){

        var result = find(hand, function(ctx, card, index, arr){
          if(card.rank == "K"){
            card.value = cardRank["B_K"];
          }
          if(card.rank == "A"){
            card.value = cardRank["B_A"];
          }

          return card.value == e;
        });

        if(result){
          hand.splice(result.index, 1);
        }else{
          return;
        }

        if(i == 7){
          isValid = true;
        }

      });

      return isValid;
};

function isOddManOutValidated (hand) {
  var isValid = false
      , numOfDifferentOddCards = 0
      , arrayOfOddCards = []
      , isKingOrJackPresent = false;

  hand.forEach(function(card,i){
    if(!isEven(card.rank)){
      
      if((card.rank == "J" || card.rank == "K") && !isKingOrJackPresent){
        isKingOrJackPresent = true;
      }else if(isKingOrJackPresent){
        return;
      }else{
        if(arrayOfOddCards.indexOf(card.rank) == -1){
          numOfDifferentOddCards++;
        }
      }
    }
  });

  if(numOfDifferentOddCards == 4 && isKingOrJackPresent){
    isValid = true;
  }

  return isValid;
};

function isSumOfHigh(hand){

  hand.sort(function(a,b){
    return a.value - b.value;
  });

  var sumOfHand = hand[0].value + hand[1].value + hand[2].value + hand[3].value + hand[4].value;
  var sumOfHigh = hand[5].value + hand[6].value;

  return sumOfHand == sumOfHigh;
}

function isEven(number){
  if(typeof number == "number"){
    return number % 2 == 0
  }else{
    return false;
  }
}

function convertHandToCards(hand){
  return convertedHand = hand.map(function(card, index){
    return makeCardObject(card);
  });
}

function find(arr, test, ctx) {
    var result = null;

    arr.some(function(elm, i) {
        return test.call(ctx, elm, i, arr) ? ((result = {element: elm, index: i}), true) : false;
    });

    return result;
}

function makeCardObject(card){
  var currentRankAndSuit
  , currentRank
  , currentSuit
  , cardObject = {};

  currentRankAndSuit = card.split("_");
  currentRank = currentRankAndSuit[1];
  currentSuit = currentRankAndSuit[0];
  

  cardObject = {
    "rank" : currentRank,
    "suit" : currentSuit,
    "value": (typeof currentRank == "number") ? currentRank : cardRank[currentRank]
  };

  return cardObject;
};


module.exports = validation;