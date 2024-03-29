var deck = require("./Deck.js")
    , validation = require("./Validation.js")
    , sessionService = require('./SessionUpdate.js');
module.exports = function(app, io, redis){
  
  var games = {};

  app.get('/table/:room', function(req, res) {
    var share;

    share = (req.params.room) ? req.params.room : generateID(6);

    res.render('table/play.jade', {share: share});
  });

  app.get('/table', function(req, res) {
    share = generateID(6);

    res.render('table/play.jade', {renderForm: true, newRoomID: share});
  });

  io.sockets.on("connection", function(socket) {
    var session = socket.handshake.session;
    

    socket.currentRoom = null;
    socket.player = null;
    socket.playerID = null;
    socket.emit('connected');
   
    socket.on("join", function(data){
      var noOppents
          , player
          , roomID = data.room
          , game = getGame(roomID);
      socket.currentRoom = roomID;      
      session.alreadyPlayedContracts = [];
      session.currentContract = "none";
      session.socketId = socket.id;
      session.save();

      //try to find a game room
      if(game) {

        //no one can go into the room once its full or started
        if(game.noOfPlayers >= 4 || game.started) {
          socket.emit("goToLobby");
          return;
        }

        //now make a new player, deal out a new hand from the deck
        player = new Player(game.dealNewHand());

        //let everyone else know that a new player has joined
        emitToEveryoneButSelf('setPlayer', {players: [player.id], message: "A new player has joined"});

      } else {
        //if none, then make a new game and join the room
        game = new Game(roomID);
        player = new Player(game.dealNewHand());
      }

      //add the new player that was created
      game.addPlayer(player);
      socket.join(roomID);

      //add the room to the person's socket
      socket.player = player;
      socket.playerID = player.id;
      updateGame(game);

      var allIds = game.filterPlayerIds([player.id]);

      //setup the hand 
      socket.emit("handSetUp", {gameId : roomID, hand: player.hand, id: player.id, players: allIds});

      //if there are too many people, let everyone know that there is a new game
      if(game.noOfPlayers == 4){
        startGame();
      }
    });
 
    socket.on('startGame', function(data){
      startGame();
    });


    socket.on('updateContract', function(data){
      var game = getGame();
      if(game) {

        session.alreadyPlayedContracts.push(data);
        session.save();

        game.setPlayerContract(socket.playerID, data);
      
        var areAllGameContractsSet = game.contractsAllSet();

        if(areAllGameContractsSet){
          var newDealer = (game.dealer) ? game.dealer : game.setNewDealer();

          emitToEveryone('newGameRound', {message: "Round has officially started", dealerId: game.dealer.id, contract: game.dealer.currentContract});
        }

        updateGame(game);
      }else{
        emitWarning("contractUnset");
      }
    });

    socket.on('pullACard', function(data){
      var newCard;
      var game = getGame();
      var status = game.pullACard(data.pile);

      if(status.valid){
        socket.emit("validMove", {valid: true});
        updateGame(game);
      }else{
        emitWarning(status.warning);
      }
      
    });
    
    socket.on("pullANewHand", function(){
      var game = getGame();

      if(game){
        var newPlayerHand = game.setPlayerHand(socket.playerID);
        
        socket.emit("handSetUp", {hand: newPlayerHand, id: socket.playerID});

        updateGame(game);
      }
    });

    socket.on("placeBack", function(data){
      var game = getGame();
      
      if(game){
        var status =  game.placeBack();

        if(!status.valid){
          emitWarning(status.warning);
        }

        socket.emit("validMove", {valid: false});
        updateGame(game);
      }
    });

    socket.on("addToHand", function(data){
      
      var game = getGame();

      if(game){
        var status = game.addToHand();

        if(status.valid){

          socket.emit("showCard", {newCard: status.newCard, deckType: status.deckType});
          emitToEveryoneButSelf("addCardToHand", {id: status.id});
          updateGame(game);
        }else{
          emitWarning(status.warning);
        }
      }
    });
    
    socket.on("discardCard", function(data) {
      var game = getGame();

      if(game) {
        var status = game.discardACard(data.pile, data.card);

        if(status.valid) {
          if(status.playerHand){
            var player = game.currentPlayer;
            
            if(!game.isThereAWinningPlayer()){
              game.resetRound();
              emitToEveryone("roundWon",{winner: player});
            }else{
              emitToEveryone("gameWon");
            }

          }else {
            game.changePlayer();

            if(status.type == "deck"){
              emitToEveryone("addCardToDiscardPile", {discardedCard: status.cardDiscarded, id: status.id, type: status.type});
            }else{
               emitToEveryoneButSelf("addCardToDiscardPile", {discardedCard: status.cardDiscarded, id: status.id, type: status.type});
            }
            
            emitToEveryone("changedPlayer", {dealerId: game.currentPlayer.id, contract: game.currentPlayer.currentContract});
          }

          updateGame(game);

        }else{
          emitWarning(status.warning);
        }
      }
    });
  
    socket.on('disconnect', function(data) {

      var game = getGame(socket.currentRoom);
  
      if(game && socket.player){
       
        var deletedPlayer = game.removePlayer(socket.player.id);
        
        if(game.noOfPlayers <= 0) {
          delete games[socket.currentRoom];
          console.log("deleted a room");
        }else if(deletedPlayer) {
          updateGame(game);
          var currentPlayerID = (!game.currentPlayer) ? "" : game.currentPlayer.id;
          emitToEveryoneButSelf('playerLeft', {message: "A player disconnected!", playerId: socket.player.id, dealerId: currentPlayerID});
        }
      }
    });

    function emitWarning(warning){
      var message, toDiscard = false;

      switch(warning){
        case "contractUnset":
          message = "The contract wasn't finished!!!!";
          break;
        case "cardPlayed":
          message =  "There's already a card played!";
          break;
        case "noPile": 
          message = "Pile not recieved";
          break;
        case "inAppropriateAction": 
          message = "Please do an appropriate action";
          break;
        case "discardPileEmpty":
          message = "There are no cards in the discard pile";
          break;
        case "playerCardFailed":
          message = "The player has not been able to send a card";
          break;
        case "wrongCard":
          message = "Something is wrong with the card you're sending back";
          break;
        case "nonExistentContract":
          message = "Contract doesn't exist in the game... don't cheat";
          break;
        case "noContract":
          message = "There is no contract existing... don't cheat!!!!!!!";
          break;
        case "placeback":
          message = "This is to quell the demons within you, diiiiiie";
          break;
        case "invalidMove":
          message = "This is an invalid, you did something wrong";
          break;
        case "noCards":
          message = "No more cards in the deck";
          break;
        default: 
          message = "Error!!!";
          break;
      }

      socket.emit("warning", {message: message});
    }


    function startGame(){
      var game = getGame(socket.currentRoom);
      
      game.started = true;
      game.currentRound++;

      emitToEveryone('startNewRound', {message: "Starting a new game"});

      updateGame(game);
    }
    
    function setSession(property, value, cb) {
      console.log(socket.request.session);
      sessionService.setSessionProperty(socket.request.session, property, value, function(err, data){
        if(err){
          cb(err);
          return;
        }
        if(cb)
          cb(data);
      });
    }
    
    function getSession(property, cb) {
      sessionService.getSessionProperty(socket.request.session, property,  function(err, data) {
        if(err){
          cb(err);
          return;
        }
        if(cb)
          cb(err, data);
      });
    }

    function emitToEveryone(action, data){
      io.sockets.in(socket.currentRoom).emit(action, data);
    }
    
    function emitToEveryoneButSelf(action, data){
      socket.broadcast.to(socket.currentRoom).emit(action, data);
    }

    function getGame(roomId){
      var roomNum = (!roomId) ? socket.currentRoom : roomId;
      if(roomNum in games){
        return games[roomNum];
      }

      return false;
    }

    function updateGame(game){
      games[socket.currentRoom] = game;
    }
  });
};

function Game(roomID, noOfRoundsToWin) {
  //player information
  this.players = [];
  this.noOfPlayers = 0;
  this.currentPlayer =  null,
  this.currentPlayerHand =  null,
  this.dealer = null,
  
  //cards information
  this.deck = new deck(),
  this.cardPulled = null;
  this.discardPile = [];

  //round states & room information
  this.currentRound = 0;
  this.finished =  false;
  this.started = false;
  this.roomID = "" + roomID + "";
  this.validMove = false;
  this.lastMove = null;
  this.noOfRoundsToWin = (parseInt(noOfRoundsToWin)) ? noOfRoundsToWin : 3; 
  return this;
}
//Heavy Game Logic
Game.prototype.contractsAllSet = function() {
  var flag = false;

  this.players.some(function(e){
    if(!e.choosenContract){
      flag = true;
      return true;
    }
  });

  if(!flag){
    this.setNewDealer();
  }

  return !flag;
};

Game.prototype.resetRound = function() {
  
  this.setNewDealer();
  this.currentRound++;
  this.discardPile = [];
  this.cardPulled = null;
  this.dealer = null;
  this.validMove = false;
  this.lastMove = null;
  this.resetDeck();
  
  this.players.forEach(function(player){
    player.choosenContract = false;
    player.hand = null;
    player.discarded = true;
    player.currentContract = null;
  });
};

Game.prototype.isStillChoosing = function() {
  var flag = true;

  this.players.some(function(e,i){
    if(!e.choosenContract){
      flag = false;
      return true;
    }
  });

  return flag;
};

Game.prototype.isThereAWinningPlayer = function() {
  var flag = false;
  var gameRoundsToWin = this.noOfRoundsToWin;

  this.players.some(function(player){
    if(player.roundsWon >= gameRoundsToWin){
      flag = true;
      return true;
    }
  });

  return flag;
};

Game.prototype.addToHand = function() {
  var player = this.currentPlayer;
  if(this.validMove){
    var cardToHand = this.cardPulled.pop();
    player.hand.push(cardToHand);
    this.updatePlayer(player);

    this.validMove = false;
    
    return {valid: true, newCard: [cardToHand], id: player.id, deckType: this.lastMove};
  }else{
    return {valid: false, warning: "invalidMove"};
  }
};

Game.prototype.discardACard = function(pile, card){

  if(pile == "deck"){
    var cardPlayed = this.cardPulled[0];
    this.discardPile.push(this.cardPulled.pop());
    this.cardPulled = null;

    return {valid: true, playerHand: false, cardDiscarded: [cardPlayed], id: this.currentPlayer.id, type: "deck"};
  } 

  if(pile == "playerHand"){

    this.discardPile.push(card);

    var player = this.currentPlayer;
    var isDiscarded = player.discardCard(card);
    
    if(isDiscarded){
      this.updatePlayer(player);
      this.currentPlayerHand = player.hand;
      this.cardPulled = null;
      var isValid = player.validateHand();
      
      if(isValid.valid && !isValid.warning){
        return {valid: true, playerHand: isValid.valid, roundFinished: true};
      }else if(!isValid.warning){
        return {valid: true, playerHand: false, cardDiscarded: [card], type: "playerHand", id: this.currentPlayer.id};
      }else{
        return {valid: false, warning: isValid.warning};
      }

      return {valid: false, warning: "wrongCard"};
    }
    
    return {valid: false, warning: "playerCardFailed"};
    
  }
}

Game.prototype.setPlayerHand = function(playerId){
  var currentPlayer = this.getPlayerIds(playerId);
  var newHand = this.dealNewHand();

  currentPlayer.hand = newHand;
  this.updatePlayer(currentPlayer);
  
  return newHand;
};

Game.prototype.dealHand = function(cardNum) {
  cardNum = (cardNum && cardNum > 0) ? cardNum : 7;
  var dealtHand = this.deck.deal(cardNum, true);

  return dealtHand;
};

Game.prototype.dealNewHand = function() {
  var newHand = this.dealHand(7);
  return newHand;
};

//deck methods
Game.prototype.placeBack = function(pile) {
  if(this.lastMove == "discard"){
    this.discardPile.push(this.cardPulled);
  }else if(this.lastMove == "deck"){
    this.deck.addCardsToDeck([this.cardPulled]);
  }

  this.cardPulled = null;
  this.validMove = false;
  return {valid: true, warning: "placeback"};
};

Game.prototype.pullACard = function(pile) {
  var isAllowed = this.isPlayerAllowedInRoom(this.currentPlayer.id);
  this.validMove = false;

  if(pile && isAllowed && !this.cardPulled){
    if(pile == "deck"){
      newCard = this.deck.deal(1, true)[0];
    }else if(pile == "discard"){

      if(this.discardPile.length > 0){
        newCard = this.discardPile.pop();
      }else{
        return {valid: false, warning: "discardPileEmpty"};
      }

    }else{
      return {valid: false, warning: "inAppropriateAction"};
    }
    if(!newCard){
      return { valid: false, warning: "noCards"};
    }
    this.lastMove = pile;
    this.cardPulled = (!Array.isArray(newCard)) ? [newCard] : newCard;
    this.validMove = true;

    return {valid: true};
  
  }else if(isAllowed && this.cardPulled && pile) {
    this.validMove = true;

    return {valid: false, warning: "cardPlayed"};
  }else if(!pile && isAllowed){
    return {valid: false, warning: "noPile"};

  }else {
    return {valid: false, warning: "notAllowed"};
  }
};

Game.prototype.resetDeck = function() {
  this.deck = new deck();
};

//player methods

Game.prototype.updatePlayer = function(player){
  var playerIndex = this.findPlayerIndex(player.id);

  if(playerIndex > -1){
    this.players[playerIndex] = player;    
  }
};

Game.prototype.setPlayerContract = function(playerId, contract) {
  var currentPlayer = this.getPlayer(playerId);
  currentPlayer.changeContract(contract);

  this.updatePlayer(currentPlayer);
};

Game.prototype.changePlayer = function() {
  var currentPlayerIndex = this.findPlayerIndex(this.currentPlayer.id); 
  var nextPersonToGet = currentPlayerIndex + 1;
  var newPlayer = this.players[nextPersonToGet % this.noOfPlayers];

  this.currentPlayer = newPlayer;
  this.currentPlayerHand =  (newPlayer) ? newPlayer.hand : [];
};

Game.prototype.isPlayerAllowedInRoom = function(id) {
  var id = this.findPlayerIndex(id);

  if(id == -1){
    return false;
  }

  return true;
};

Game.prototype.setNewDealer = function() {
  var length = this.players.length;
  var randomPlayerIndex = Math.floor(Math.random() * length);

  var newDealer = this.players[randomPlayerIndex];
  this.dealer = newDealer;
  this.currentPlayer = newDealer;
  this.currentPlayerHand = newDealer.hand;

  return this.dealer;
};

Game.prototype.addPlayer = function(player) {
  this.players.push(player);
  this.noOfPlayers++;
};

Game.prototype.removePlayer = function(playerId) {
  var playerIndex = this.findPlayerIndex(playerId);
  
  if(playerIndex > -1){
    var playerToDelete = this.players[playerIndex];
    this.players.splice(playerIndex, 1);
    this.noOfPlayers--;

    if(this.currentPlayer && playerToDelete.id == this.currentPlayer.id){
      this.changePlayer();
    }

  }else{
    return false;
  }
  
  return true;
};

Game.prototype.getPlayer = function(playerId) {
  var playerIndex = this.findPlayerIndex(playerId);
  
  if(playerIndex != -1){
    return this.players[playerIndex];
  }
  
  return null;
};

Game.prototype.getPlayerIds = function() {
  var playerIds = []; 
  this.players.forEach(function(e){
    playerIds.push(e.id);
  });

  return playerIds;
};

Game.prototype.filterPlayerIds = function(playerIds) {
  var playerIdsList = this.getPlayerIds();
  var game = this;

  playerIds.forEach(function(e){
    game.filterPlayerId(e, playerIdsList);
  });

  return playerIdsList;
};

Game.prototype.filterPlayerId = function(playerId, playerIdList) {
  var index = playerIdList.indexOf(playerId);
  
  if(index > -1){
    playerIdList.splice(index,1);
    return true;
  }

  return false;
};

Game.prototype.everyoneButPlayer = function(playerId) {
  var playerIndex = this.findPlayerIndex(playerId);

  var everyOneElse = this.players.filter(function(e,i) {
    return i != playerIndex;
  });

  return everyOneElse;
};

Game.prototype.findPlayerIndex = function(playerId){

  var foundIndex = -1;

  this.players.some(function(e,i){
    if(e.id == playerId){
     foundIndex = i;
     return true;
    }
  });

  return foundIndex;
}

function Player(hand) {
  this.id = generateID(5);
  this.hand = hand;
  this.discarded = false;
  this.currentContract = null;
  this.contract = [];
  this.roundsWon = 0;
  this.choosenContract = false;

  return this;
}

Player.prototype.newHand = function(hand) {
  this.hand = hand;
};

Player.prototype.validateHand = function() {
  return validation(this.hand, this);
};

Player.prototype.addContract = function(contract) {
  this.contract.push(contract);
};

Player.prototype.changeContract = function(contract) {
  var indexOf = -1;

  this.contract.some(function(e,i){
    if(e.contractId == contract.contractId){
      indexOf = i;
      return true;
    };
  });
  
  if(indexOf == -1){
    this.currentContract = contract;
    this.choosenContract = true;
    this.addContract(contract);
  }

};

Player.prototype.discardCard = function(card){
  var indexOfDiscardedCard = this.hand.indexOf(card);

  if(indexOfDiscardedCard > -1){
    this.hand.splice(indexOfDiscardedCard, 1);
    return true;
  }

  return false;
}

function generateID(length) {
  var haystack = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  var room = '';

  for(var i = 0; i < length; i++) {
    room += haystack.charAt(Math.floor(Math.random() * 62));
  }

  return room;
};