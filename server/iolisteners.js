var deck = require("./Deck.js")
    , validation = require("./Validation.js")
    , sessionService = require('./sessionUpdate');

module.exports = function(app, io){
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


    socket.on('contractDecided', function(data){
      console.log("choosing contract");

      var game = getGame(socket.currentRoom);
      var currentContract = socket.request.session["currentContract"];
      
      game.setPlayerContract(socket.player.id, currentContract);
      
      var areAllGameContractsSet = game.contractsAllSet();
      console.log(areAllGameContractsSet);

      if(areAllGameContractsSet){
        emitToEveryone('startNewRoundLogic', {message: "Game has officially started"});
        game.currentRound++;
      }

      updateGame(socket.currentRoom, game);
    });

    socket.on('newRound', function(){
      if(!games[socket.currentRound].finished){
        socket.broadcast.to(socket.currentRoom).emit('renderContract');
      }else{
        socket.broadcast.to(socket.currentRoom).emit('finished');
      }

    });

    socket.on('pullACard', function(data){
      var newCard;

      var currentRoom = games[data.room];

      if(currentRoom && currentRoom.deck && isPlayerInRoom(data.room, data.playerId)){
        if(data.pile && data.pile == "deck" && currentRoom.deckLength > 0 && !currentRoom.cardPulled){
          newCard = currentRoom.deck.deal(1);
        }else if(data.pile == "discard"){
          if(currentRoom.discardPile > 0){
            newCard = currentRoom.discardPile[currentRoom.discardPile.length - 1];
          }else{
            socket.emit("undoMove");
            socket.emit("warning", {message: "There are no cards in the discard pile", stopDragging: true});
            return;
          }
        }else{
          socket.emit("undoMove");
          socket.emit("warning", {message: "Please do an appropriate action"});
          return;
        }
        games[data.room].cardPulled = newCard;
        socket.emit("valid");
      }else if(!currentRoom.cardPulled){
        socket.emit("warning", {message: "Wrong room!"});
        return;
      }

    });
      
    socket.on("placeBack", function(data){
      var currentRoom = games[data.room];
      if(currentRoom && data.deckType == "discard"){
        currentRoom.cardPulled = null;
      }else if(data.deckType == "deck"){
        currentRoom.deck.addToDeck([currentRoom.cardPulled]);
      }
    });

    socket.on("addToHand", function(data){
      
      if(!currentRoom.cardPulled){
        return;
      }
    
      var currentRoom = games[socket.currentRoom];
      var currentPlayer = FindCurrentPlayerIndex(players, playerID);

      if(currentPlayer != -1){

        if(data.deckType == "deck"){
          currentRoom.deckLength--;
        }else if(data.deckType == "discard"){
          currentRoom.discardPile.shift();
        }
        var newCard = currentRoom.cardPulled.pop();
    
        el.hand.push(newCard);
        games[socket.currentRoom].currentPlayerHand = el.hand;
        socket.emit("showCard", {newCard: newCard});
  
      }
       

    });
      
    socket.on("discardCard", function(data){
      var foundIndex;
      var currentRoom = games[socket.currentRoom];
      var currentPlayer = FindCurrentPlayerIndex(players, playerID);

      if(currentPlayer != -1){

          if(data.deckType == "deck"){
            currentRoom.deckLength--;
          }else if(data.deckType == "discard"){
            currentRoom.discardPile.shift();
          }
          
          var handIndex = el.hand.indexOf(data.card);

          if(handIndex > -1){
            el.hand.splice(handIndex,1);
            currentRoom.cardPulled = null;
            games[socket.currentRoom].currentPlayerHand = el.hand;
            var isValid = validateHand(el.hand, el);
            socket.emit("validate", {isValid: isValid});
          } 
      }

    });

    socket.on("changeTurn", function(data){
      var game = getGame(socket.currentRoom);
      game.changePlayer();

      socket.emit("turnChanged", { nextPlayerId: game.currentPlayer.id});

      updateGame(socket.currentRoom, game);   
    });

    socket.on("validate", function(){
      var game = getGame(socket.currentRoom);
      var isValid = game.currentPlayer.validateHand(game.currentPlayerHand, game.currentPlayer);
      socket.emit("validate", {isValid: isValid}); 
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

    function startGame(){
      var game = getGame(socket.currentRoom);
      
      game.started = true;
      game.setNewDealer();
      setSession("alreadyPlayedContracts", [], emitToEveryone('startGame', {message: "Starting a new game", dealer: game.dealer.id}));

      updateGame(game);
    }

    function updateHand(data){
      if(data.discardedCard){
        var placeInHand = games[data.room].currentPlayerHand.indexOf(data.discardedCard);
        var discardPile = (placeInHand != -1) ? games[data.room].currentPlayerHand.splice(placeInHand, 1) : null;
        if(discardPile){
          games[data.room].discardPile.push(discardPile);
        }else{
          games[data.room].discardPile.push(games[data.room].cardPulled);
          games[data.room].cardPulled = null;
        }
        
        io.to(data.room).emit("cardDiscarded", {card: discardedCard});
      }

      if(data.addedCard && games[data.room].cardPulled){
        games[data.room].currentPlayerHand.push(games[data.room].cardPulled);
        socket.emit("updateHand", {card: games[data.room].cardPulled})
        
        var isValid = validateHand(games[data.room].currentPlayerHand, games[data.room].currentPlayer);
        socket.emit("validate", {isValid: isValid}); 
      }
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

    function getGame(id){
      return games[id];
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

  return this;
}

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
Game.prototype.updatePlayer = function(playerId, player){
  var playerIndex = this.findPlayerIndex(playerId);

  if(playerIndex > -1){
     this.players[playerIndex] = player;    
  }
}

Game.prototype.setPlayerContract = function(playerId, contract) {
  var currentPlayer = this.getPlayer(playerId);
  currentPlayer.changeContract(contract);

  this.updatePlayer(playerId, currentPlayer);
};

Game.prototype.changePlayer = function() {
 var currentPlayerIndex = findPlayerIndex(this.currentPlayer.id); 
 var nextPersonToGet = currentPlayerIndex + 1;
 var newPlayer = this.players[nextPersonToGet % this.noOfPlayers];
 
 this.currentPlayer = newPlayer;
};

Game.prototype.isPlayerAllowedInRoom = function(id) {
  var id = this.findPlayerIndex(id);
  
  if(id = -1){
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

Game.prototype.setNewDealer = function(io) {
  var length = this.players.length;
  var randomPlayerIndex = Math.floor(Math.random() * length);

  var newDealer = this.players[randomPlayerIndex];
  this.dealer = newDealer;
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
  var flag = true;

  this.players.forEach(function(e){
    if(!e.choosenContract){
      flag = false;
      return;
    }
  });

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

function generateID(length) {
  var haystack = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  var room = '';

  for(var i = 0; i < length; i++) {
    room += haystack.charAt(Math.floor(Math.random() * 62));
  }

  return room;
};