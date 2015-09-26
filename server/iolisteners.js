var deck = require("./Deck.js")
    , validation = require("./Validation.js")
    , sessionService = require('./sessionUpdate');

module.exports = function(app, io, redis){
  var games = {};

  app.get('/table', function(req, res) {
      share = generateID(6);
      res.render('table/play.jade', {shareURL: req.protocol + '://' + req.get('host') + req.path + "/" + share, share: share});
  });

  app.get('/table/:room', function(req, res) {
      var share;

      if(req.params.room && (req.params.room in games)) {
        share = req.params.room;
      }else {
        share = generateID(6);
        req.path = "/table/"+share;
      }

      res.render('table/play.jade', {shareURL: req.protocol + '://' + req.get('host') + req.path, share: share});
  });

  io.sockets.on("connection", function(socket) {
    
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
      setSession("alreadyPlayedContracts", []);
      setSession("socketId", socket.id);
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
      var currentContract = socket.request.session["currentContract"];

      if(game){

        game.setPlayerContract(socket.playerID, currentContract);
        
        var areAllGameContractsSet = game.contractsAllSet();
        console.log("Are all contracts set yet: ", areAllGameContractsSet);
        if(areAllGameContractsSet){
          emitToEveryone('startNewRoundLogic', {message: "Game has officially started", dealerId: game.dealer.id});
          game.currentRound++;
        }

        updateGame(game);
      }
    });

    socket.on('newRound', function(){
      var game = getGame();

      if(!game.finished){
        emitToEveryone('renderContract');
      }else{
        emitToEveryone('finished', {gameStats: game});
      }
    });

    socket.on('pullACard', function(data){
      var newCard;
      var game = getGame();
      var status = game.pullACard(data.pile);

      if(status.valid){
        socket.emit("validMove");
        updateGame(game);
      }else{
        emitWarning(status.warning);
      }
      
    });
      
    socket.on("placeBack", function(data){
      var game = getGame();
      
      if(game){
        var status =  game.placeBack();
        if(!status.valid){
          emitWarning(status.warning);
        }
      }

      updateGame(game);
    });

    socket.on("addToHand", function(data){
      
      var game = getGame();
      
      if(game){
        var status = game.addToHand();

        if(status.valid){
          socket.emit("showCard", {newCard: status.newCard});
          updateGame(game);
        }else{
          emitWarning(status.warning);
        }
      }
    });
    
    socket.on("discardCard", function(data){
      var game = getGame();
      
      if(game){
        var status = game.discardACard(data.pile, card);

        if(status.valid){

          if(status.playerHand){
            var player = game.currentPlayer;
            game.resetRound();
            game.setNewDealer();
            emitToEveryone("RoundWon",{winner: player});
          }else{
            game.changePlayer();
            emitToEveryone("addCardToDiscardPile", {discardedCard: status.discardedCard});
            emitToEveryone("changedPlayer", {dealerId: game.currentPlayer.id});
          }

          updateGame(game);
        }
      }

    });
  
    socket.on('disconnect', function(data) {

      var game = getGame(socket.currentRoom);
  
      if(game && socket.player){

        if(socket.player.id){
          game.removePlayer(socket.player.id);
        }

        if(game.noOfPlayers <= 0){
          delete games[socket.currentRoom];
          console.log("deleted a room");
        }else{
          updateGame(game);
          emitToEveryoneButSelf('playerLeft', {message: "A player disconnected!", playerId: socket.player.id});
        }
      }
    });

    function emitWarning(warning){
      switch(warning){
        case "cardPlayed": socket.emit("warning", {message: "There's already a card played!"});
          break;
        case "noPile": socket.emit("warning", {message: "Pile not recieved"});
          break;
        case "inAppropriateAction": socket.emit("warning", {message: "Please do an appropriate action"});
          socket.emit("undoMove");
          break;
        case "discardPileEmpty":
          socket.emit("warning", {message: "There are no cards in the discard pile", stopDragging: true});
          break;
        case "playerCardFailed":
          socket.emit("warning", {message: "The player has not been able to send a card"});
          break;
        default: socket.emit("warning", {message: "Error!!!"});
      }
    }


    function startGame(){
      var game = getGame(socket.currentRoom);
      
      game.started = true;
      game.setNewDealer();
      emitToEveryone('startNewRound', {message: "Starting a new game", dealer: game.dealer.id});

      updateGame(game);
    }
    
    function setSession(property, value, cb) {
      sessionService.setSessionProperty(socket.request.session, property, value, function(err, data){
        if(err){
          cb(err);
          return;
        }
        if(cb)
          cb(data);
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
      games["" + socket.currentRoom + ""] = game;
    }
  });
};

function Game(roomID) {
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

  return this;
}

Game.prototype.addToHand = function() {
  var player = this.currentPlayer;

  if(this.validMove){
    player.hand.push(this.cardPulled);
    this.updatePlayer(player);

    this.validMove = false;
    
    return {valid: true, newCard: this.cardPulled};
  }else{
    return {valid: false, warning: "invalidMove"};
  }
};

Game.prototype.discardACard = function(pile, card){
  
  if(pile == "deck"){
    this.discardPile.push(this.cardPulled);
  }else if(pile == "playerHand"){
    this.discardPile.push(card);
    var player = this.currentPlayer;
    var isDiscarded = player.discardCard(card);
    
    if(isDiscarded){
      this.updatePlayer(player);
      this.currentPlayerHand = player.hand;
      this.cardPulled = null;
      var isValid = player.validateHand();
      
      if(isValid){
        return {valid: true, playerHand: true, roundFinished: true};
      }else{
        return {valid: true, playerHand: false, cardDiscarded: card};
      }
    }else {
      return {valid: false, warning: "playerCardFailed"};
    }
  }

}

Game.prototype.placeBack = function(pile) {
  
  if(this.lastMove == "discard"){
    this.discardPile.push(this.cardPulled);
  }else if(this.lastMove == "deck"){
    this.deck.addCardsToDeck([this.cardPulled]);
  }

  this.cardPulled = null;
  this.validMove = false;

  return {valid: true};

};

Game.prototype.pullACard = function(pile) {
  var isAllowed = this.isPlayerAllowedInRoom(this.currentPlayer.id);
  this.validMove = false;
  if(pile && isAllowed && !this.cardPulled){
    if(pile == "deck"){
      newCard = this.deck.deal(1, true);
    }else if(pile == "discard"){

      if(this.discardPile.length > 0){
        newCard = this.discardPile.pop();
      }else{
        return {valid: false, warning: "discardPileEmpty"};
      }

    }else{
      return {valid: false, warning: "inAppropriateAction"};
    }

    this.lastMove = pile;
    this.cardPulled = newCard;
    this.validMove = true;
    return {valid: true, warning: null};
  
  }else if(isAllowed && this.cardPulled && pile) {
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

Game.prototype.isStillChoosing = function() {
  var flag = true;

  this.players.forEach(function(e,i){
    if(!e.choosenContract){
      flag = false;
      return;
    }
  });

  return flag;
};

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
 var currentPlayerIndex = findPlayerIndex(this.currentPlayer.id); 
 var nextPersonToGet = currentPlayerIndex + 1;
 var newPlayer = this.players[nextPersonToGet % this.noOfPlayers];
 
 this.currentPlayer = newPlayer;
 this.currentPlayerHand = newPlayer.hand;
};

Game.prototype.isPlayerAllowedInRoom = function(id) {
  var id = this.findPlayerIndex(id);

  if(id == -1){
    return false;
  }

  return true;
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

Game.prototype.setNewDealer = function() {
  var length = this.players.length;
  var randomPlayerIndex = Math.floor(Math.random() * length);

  var newDealer = this.players[randomPlayerIndex];
  this.dealer = newDealer;
  this.currentPlayer = newDealer;
  this.currentPlayerHand = newDealer.hand;
};

Game.prototype.addPlayer = function(player) {
  this.players.push(player);
  this.noOfPlayers++;
};

Game.prototype.removePlayer = function(playerId) {
  var playerIndex = this.findPlayerIndex(playerId);
  
  if(playerIndex > -1){
    this.players.splice(playerIndex, 1);
    this.noOfPlayers--;
  }else{
    return false;
  }
  
  return true;
};

Game.prototype.contractsAllSet = function() {
  var flag = false;

  this.players.forEach(function(e){
    if(!e.choosenContract){
      return flag;
    }
  });

  this.setNewDealer();
  return flag;
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

  this.players.forEach(function(e,i){
    if(e.id == playerId){
     foundIndex = i;
     return;
    }
  });

  return foundIndex;
}

Game.prototype.resetRound = function() {
  this.players.forEach(function(e,i,a){
    e.choosenContract = false;
    e.hand = null;
    e.discarded = true;
    e.currentContract = null;
  });
};

function Player(hand) {
  this.id = generateID(5);
  this.hand = hand;
  this.discarded = false;
  this.currentContract = null;
  this.contract = [];
  this.roundWon = 0;
  this.choosenContract = false;

  return this;
}

Player.prototype.validateHand = function() {
  return validation(this.hand, this);
};

Player.prototype.addContract = function(contract) {
  this.contract.push(contract);
};

Player.prototype.changeContract = function(contract) {
  this.currentContract = contract;
  this.choosenContract = true;
  this.addContract(contract);
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