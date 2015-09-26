var Deck = function(numberOfDecks, suits){

  numberOfDecks = (numberOfDecks) ? numberOfDecks : 1;

  this.suits = (suits) ? suits : ["H", "S", "C", "D"];

  this.deck = [];
  this.id = guid();

  do{
    this.addAnotherDeck();
    numberOfDecks--;
  }while(numberOfDecks > 0)
  
  this.cardsInDeck = this.deck.length; 
  this.shuffle();

  return this;
}

Deck.prototype.addCardsToDeck = function(cards) {
  cards.forEach(function(e,i){
    this.deck.push(e);
  }, this);
};

/**
* createSuit(suitname)
*
* params 
* str suitName = a name you want to create.
*
* returns 
* an array of a created suit. 
*/
Deck.prototype.createSuit = function(suitName) {
  
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
};

Deck.prototype.addSingleSuitToDeck = function(suit) {
  var deck = this.deck;

  suit.forEach(function(e,i){
    deck.push(e);
  });

};

Deck.prototype.addAnotherDeck = function() {
  
  this.suits.forEach(function(e,i) {
    var newSuit = this.createSuit(e);
    this.addSingleSuitToDeck(newSuit);//object deck merges the Deck (note the capital) together

  }, this);


};

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
Deck.prototype.deal = function(num, addAnotherDeck) {
  
  //make sure the cards are whole cards
  var num = Math.floor(num);
  var i = 0;
  var dealt = [];

  //check if the deck is empty 
  if(this.deck.length === 0 && this.deck.length > num){
    
    if(!addAnotherDeck){
      return null;
    }
  
    this.addAnotherDeck();
  }

  //push each card to a hand
  while(i < num){
    dealt.push(this.deck.shift());
    i++;
  }

  return dealt;
};

/**
* addToDeck(cards)
* add a suffled deck object to the current deck if the need to add shuffled decks arises 
*
* params 
* cards = cards to add to the deck 
* 
* returns the new deck 
*/
Deck.prototype.addCardsToDeck = function(cards) {
  
  var deck = this.deck;

  cards.forEach(function(e,i){
    deck.push(e);
  });

  this.shuffle();

};


/**
* shuffle(array)
*
* params 
* str array = a deck array to shuffle
*
* returns 
* an array of a shuffled deck
*/
Deck.prototype.shuffle = function() {

  var m = this.deck.length
      , array = this.deck
      , t = null
      , i = null;

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
};

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
