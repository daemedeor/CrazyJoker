var Deck = function(numberOfDecks){

  numberOfDecks = (numberOfDecks) ? numberOfDecks : 1;

  //standard deck
  var hearts = createSuit("H");//hearts is an object inside object Deck
  var spades = createSuit("S");
  var clubs = createSuit("C");
  var diamonds = createSuit("D");
  this.deck = createDeck(hearts, spades, clubs, diamonds);//object deck merges the Deck (note the capital) together
  shuffle(this.deck);
  this.id = guid();
  
  for(var i = 1; i < numberOfDecks; i++){
    this.deck.addToDeck(createDeck(hearts, spades, clubs, diamonds));
  }

  /**
  * createSuit(suitname)
  *
  * params 
  * str suitName = a name you want to create.
  *
  * returns 
  * an array of a created suit. 
  */
  function createSuit(suitName){
    //create the suit array
    var cardSuit = [];

    //get the first 10 numbers autogenerate
    for(var i=2; i<=10; i++){
      cardSuit.push(suitName+"_"+i);
    }

    //add the final special cards
    cardSuit.push(suitName+"_J");
    cardSuit.push(suitName+"_Q");
    cardSuit.push(suitName+"_K");
    cardSuit.push(suitName+"_A");

    //return the array
    return cardSuit;
  }

  /**
  * createDeck(suits)
  *
  * params 
  * array suits = a variable number of arrays to make an array, must be at least four
  *
  * returns 
  * array of the deck 
  * 
  */
  function createDeck(suits){
    
    var cDeck = []
        , suitsLength = arguments.length
        , suitHand = "";

    //go through all the array
    for(var i =0; i < suitsLength; i++ ){

      //get the suit itself
      suitHand = arguments[i];

      //loop through all the cards
      for(var k = 0; k < 13; k++){
        //add it to the deck
        cDeck.push(suitHand[k]);

      }

    }
    //return the created deck
    return cDeck;
  }


  this.createDeck = function(suits){
    var createDeck = this.createDeck(suits);
    return createDeck;
  }

  /**
  * shuffle(array)
  *
  * params 
  * str array = a deck array to shuffle
  *
  * returns 
  * an array of a shuffled deck
  */
  function shuffle(deck) {
  
    var m = deck.length;
    var array = deck;
    var t;//this is an element that is going to be switched 
    var i;//this is another element that is going to be switched

    while (m > 0) {

      // Pick a remaining element..
      i = Math.floor(Math.random() * m--);

      // swapping
      t = array[m];
      array[m] = array[i];
      array[i] = t;

    }
    this.deck = array;
    return true;
  }

  this.deckShuffle = function(){
    shuffle(this.deck);
  }

  /**
  * deal(num)
  * deal a number of cards and returns the dealt cards 
  * 
  * params 
  * integer num = a number of dealt cards. (can only be ints)
  *
  * returns 
  * an array of dealt cards
  * null if it can't deal any more cards 
  */
  this.deal = function(num){
    //make sure the cards are whole cards
    var num = Math.floor(num);
    var i = 0;
    var dealt = [];

    //check if the deck is empty 
    if(this.deck.length === 0){
      alert("no more cards in the deck");
      return null;
    }
    //push each card to a hand
    while(i < num){
      dealt.push(this.deck.shift());
      i++;
    }

    return dealt;
  };

  /**
  * addToDeck(importDeck)
  * add a suffled deck object to the current deck if the need to add shuffled decks arises 
  *
  * params 
  * importDeck = a deck object to loop through
  * 
  *
  * returns the new deck 
  */
  this.addToDeck = function(importDeck){
    impoDeckLength = importDeck.length;
    //look through the deck to add each card
    for(var i = 0; i < impoDeckLength; i++ ){
      
      //return the value in the deck and push
      this.deck.push(importDeck[i]);
    }
    //return the deck itself
    return this.deck;
  };
}


/**
 * Generates a GUID string.
 * @returns {String} The generated GUID.
 * @example af8a84-6e18-a307-bd9c-f2c947bbb3
 */
function guid() {
    function _p8(s) {
        var p = (Math.random().toString(16)+"000000000").substr(2,6);
        return s ? "-" + p.substr(0,4) + "-" + p.substr(4,4) : p ;
    }
    return _p8() + _p8(true) + _p8(true) + _p8();
}

module.exports = Deck;
