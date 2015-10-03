var moment = require("moment");
var  cardRank =  {
  "K" : 13,
  "A" : 14,
  "Q" : 12,
  "J" : 11,
  "faceCards": ["K", "A", "Q", "J"],
  "B_K": 0,
  "B_A": 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10
};
  
var validation = function(currentHand, player){
  var flag = false
      , newCardHand = convertHandToCards(currentHand)
      , nameOfContract = player.currentContract.backendName
      , reason;

  if(nameOfContract){
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

      case "facedbyevens":
        flag = isFaceByEvenValidated(newCardHand);
        break;

      case "birthdaywish":
        flag = isBirthdayWishValidated(newCardHand, player);
        break;

      case "oddmanout":
        flag = isOddManOutValidated(newCardHand);
        break;

      case "sumofhigh":
        flag = isSumOfHigh(newCardHand);
        break;

      default:
        reason = "nonExistentContract";
    }

  }else{
    reason = "noContract";
  }

  return {valid: flag, warning: reason};
}

//full full house validated
function isFullFullHouseValid (hand) {
  
  var specificRankToWatch
      , specificFaceToWatch
      , rankCounter = 0
      , faceCounter = 0
      , flagWatch
      , isCurrentlyValid = false;


  hand.some(function(card){
        
    if(parseInt(card.rank)){

      if(specificRankToWatch){
        
        if(specificRankToWatch == card.rank && rankCounter < 3){
          rankCounter++;
        }else{
          isCurrentlyValid = true;
          return true;
        }

      }else{
        specificRankToWatch = card.rank;
      }

    }else{

      if(specificFaceToWatch){
        
        if(specificFaceToWatch == card.rank && faceCounter < 2){
          faceCounter++;
        }else{
          isCurrentlyValid = true;
          return true;
        }

      }else{
        specificFaceToWatch = card.rank;
      }
    }

  });

  return !isCurrentlyValid;
};

//validated fixed straight, it works!
function isFixedStraightValidated (hand) {
 
  var specificRankToWatch
      , hasQueen = false
      , inOrder = false
      , previousValue = 0
      , isCurrentlyValid = false;
  
  hand = hand.sort(function(a,b){
    return a.value - b.value;
  });

  //if the value is 5 to two
  //impossible to have queen
  if(hand[0].value < 6 && hand[0].value >= 2){
    this.flag = false;
    return;
  }

  //check the newly sorted hand for inconsistencies
  hand.some(function(card, i){
    
    if(card.rank == "Q"){
      hasQueen = true;
    }
    
    if(previousValue || card.rank == "K"){
     
      if(card.value != ((previousValue % 14) + 1)){
        inOrder = false;
        return true;
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

//big flush validated!
function isBigFlushValidated (hand) {
  var isSameSuit = false
      , validSuit = hand[0].suit;

  hand.some(function(card){

    if(card.suit != validSuit){
      isSameSuit = true;
      return true;
    }

  });

  return !isSameSuit;
};

//face by even validated
function isFaceByEvenValidated (hand) {
  
  var containsAllFaceCards
      , isValid = false
      , noOfEvenCards = 0
      , evenCardType
      , faceCardsEncountered = [];

  hand.some(function(card, i){
    if(parseInt(card.rank)) {
      if(isEven(card.value) && noOfEvenCards < 3) {
        
        noOfEvenCards++;

        if(evenCardType) {
          if(card.rank != evenCardType){
            isValid = false;
            return true;
          } 
        }else {
          evenCardType = card.rank;
        }

      }else {
        isValid = false;
        return true;
      }
    }else {
      if(faceCardsEncountered.indexOf(card.rank) == -1){
        faceCardsEncountered.push(card.rank);
      }else {
        isValid = false;
        return true;
      }
    }

    isValid = true;

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

//odd man out validated!
function isOddManOutValidated (hand) {
  var isValid = false
      , numOfDifferentOddCards = 0
      , arrayOfOddCards = []
      , isKingOrJackPresent = false;

  hand.some(function(card){
    if((card.rank == "J" || card.rank == "K") && !isKingOrJackPresent){
      isKingOrJackPresent = true;
    }else if(!isEven(card.rank) && !isFaceCard(card.rank)){
      if(arrayOfOddCards.indexOf(card.rank) == -1){
        arrayOfOddCards.push(card.rank);
        numOfDifferentOddCards++;
      }
    }else{
      return true;
    }
  });

  if(numOfDifferentOddCards == 4 && isKingOrJackPresent){
    isValid = true;
  }

  return isValid;
};

//
function isSumOfHigh(hand){

  hand.sort(function(a,b){
    return a.value - b.value;
  });
  var sumOfHand = hand[0].value + hand[1].value + hand[2].value + hand[3].value + hand[4].value;
  var sumOfHigh = hand[5].value + hand[6].value;
 
  return sumOfHand == sumOfHigh;
}

function isFaceCard(rank){
  
  switch(rank){
    case "Q":
    case "K":
    case "J":
    case "A":
      return true;
  }

  return false;
}

function isEven(number){
  if(parseInt(number)){
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
    "value": (parseInt(currentRank)) ? parseInt(currentRank) : cardRank[currentRank]
  };

  return cardObject;
};


module.exports = validation;