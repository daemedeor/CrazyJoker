var deck = require("./Deck.js")
    , validation = require("./Validation.js")
    , sessionService = require('./sessionUpdate');

module.exports = function(app, io){
  var games = {};

  app.get('/table', function(req, res) {
      share = generateRoom(6);
      res.render('table/play.jade', {shareURL: req.protocol + '://' + req.get('host') + req.path + "/" + share, share: share});
  });

  app.get('/table/:room', function(req, res) {
      var share;

      if(req.params.room && (req.params.room in games)) {
        share = req.params.room;
      }else {
        share = generateRoom(6);
        req.path = "/table/"+share;
      }

      res.render('table/play.jade', {shareURL: req.protocol + '://' + req.get('host') + req.path, share: share});
  });

  io.sockets.on("connection", function(socket) {

    socket.emit('connected', {message: "You are Connected!"});

    socket.on("join", function(data){
      var noOppents;

      if(data.room in games) {

        if(games[data.room].players.length >= 4 || games[data.room].started) {
          socket.emit("goToLobby");
          return;
        }
      
        socket.join(data.room);

        var player = new Player(1, games[data.room].deck.deal(7));
        player.number = games[data.room].players.length + 1;

        socket.currentRoom = data.room;
        socket.player = player;

        socket.broadcast.to(data.room).emit('setPlayer', {players: [player], length: 7, message: "player joined room"});

        if(games[data.room].players.length == 4){
          io.sockets.in(data.room).emit('startGame');
        }

      } else {
        games[data.room] = {
          players: [],
          deck: new deck(),
          currentPlayer: null,
          currentPlayerHand: null,
          currentDealer: null,
          cardPulled: null,
          discardPile : [],
          started: false,
          currentRound: 0,
          finished: false
        };

        var player = new Player(1, games[data.room].deck.deal(7));
        socket.currentRoom = data.room;
        socket.player = player;
        socket.join(data.room);
      }

      games[data.room]["deckLength"] = games[data.room].deck.deck.length;
      
      socket.emit("handSetUp", {gameId : data.room, hand: player.hand, id: player.id, players: games[data.room].players});
      
      games[data.room].players.push(player);

    });
    
    socket.on('startGame', function(data){
      sessionService.setSessionProperty(socket.request.session, "alreadyPlayedContracts", [], function (err, data) {
        if (err) {
          callback(err);
          return;
        }

        io.sockets.in(socket.currentRoom).emit('renderContract');
        games[socket.currentRoom].started = true;
      });
    });

    socket.on('letRoomKnow', function(){
      var isStillChoosing = false
          , players = games[socket.currentRoom].players
          , session = socket.request.session
          , playerID = socket.player.id;

      var currentPlayer = FindCurrentPlayerIndex(players, playerID);

      if(currentPlayer != -1){
        players[currentPlayer].choosenContract = true;
        players[currentPlayer].currentContract = session.currentContract;
      }

      players.forEach(function(e,i,a){
        if(!e.choosenContract){
          isStillChoosing = true;
          return;
        }
      });
      if(!isStillChoosing){
        chooseNewDealer();
      }
    });
    
    function chooseNewDealer(){
      var numberOfPlayers = games[socket.currentRoom].players.length;
      var randomPlayer = Math.floor(Math.random() * numberOfPlayers);
      var player = games[socket.currentRoom].players[randomPlayer];
      games[socket.currentRoom].currentDealer = player;
      io.sockets.in(socket.currentRoom).emit('changeTurn', {dealer: player.number});

    }

    socket.on('newRound', function(){
      games[socket.currentRoom].currentRound++;
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
      var badgePosition = changeTurn(data);
      socket.emit("turnChanged", { position : badgePosition});    
    });

    socket.on("validate", function(){
      var isValid = validateHand(games[socket.currentRoom].currentPlayerHand, games[socket.currentRoom].currentPlayer);
      socket.emit("validate", {isValid: isValid}); 
    });

    socket.on('disconnect', function(data) {
      var foundIndex, player;
      if(games[socket.currentRoom]){

        games[socket.currentRoom].players.forEach(function(el, index){
          if(el.id == socket.currentPlayerId){
           foundIndex = index;
          }
        });

        if(foundIndex > -1){
           player = games[socket.currentRoom].players.splice(foundIndex,1);
          
          if(player[0]){
            if(player[0].number == 1){
              player[0].number = 2;
            }
            socket.broadcast.to(socket.currentRoom).emit('left', {player: player[0].number, message: "player left"});
          }else{
            socket.broadcast.to(socket.currentRoom).emit('left', {message: "player left"});
          }

          if(games[socket.currentRoom].players.length <= 0){
            delete games[socket.currentRoom];
            console.log("deleted a room");
          }

        }
      }
    });

    function validateHand(hand, player){
      return validation(hand, player);
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

    function FindCurrentPlayerIndex(players, id){
      var whichIndex = -1;

      players.forEach(function(el, index){
        if(el.id === id){
          whichIndex = index;
          return;         
        }
      });

      return whichIndex;
    }

    function changeTurn(data){
      var currentPlayer = data.playerId;
      var allPlayers = games[data.room].players;
      var position = 0;
      allPlayers.forEach(function(element,index){
        if(currentPlayer == element.id){
          index++;
          currentPlayerPosition = (index < games[data.room].players.length) ? index : 0;
          position = currentPlayerPosition;
          var nextPlayer = games[data.room].players[currentPlayerPosition];
          games[data.room].currentPlayer = nextPlayer;
          return;
        }
      });

      return currentPlayerPosition;
    }

    function isPlayerInRoom(room, currentPlayer){
      var currentPlayers = games[room].players;
      var flag = false;

      currentPlayers.forEach(function(player){
        if(player.id === currentPlayer){
          flag = true;
          return;
        };
      });

      return flag;
    }

  });
};

function Player(number, hand) {
  this.number = number;
  this.id = generateRoom(5);
  this.hand = hand;
  this.discarded = false;
  this.currentContract = null;
  this.contract = [];
  this.roundWon = 0;
  this.choosenContract = false;
  return this;
}

function generateRoom(length) {
  var haystack = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  var room = '';

  for(var i = 0; i < length; i++) {
    room += haystack.charAt(Math.floor(Math.random() * 62));
  }

  return room;
};