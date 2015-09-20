
//App functions 
function dragStop(){
  dragndrop.end();
}

function startGame(){
  IO.socket.emit("starGame");
}

function drop(el, target, source) {
  var dropLocation = $(target).data("decktype");

  if(App.pulledFrom == "playerhand" && dropLocation == "deck"){
    dragndrop.cancel(true);
    return;            
  }else if(dropLocation == "discard" && dropLocation != App.pulledFrom){
    var cardToDiscard = $(el).data("card");
    IO.socket.emit("discardCard", {room: App.gameId, pile: dropLocation, card: cardToDiscard})
    return;            
  }else if(dropLocation == "playerhand" && App.validMove){
    App.referencedElement = el;
    IO.socket.emit("addToHand", {player: App.currentPlayer, room: App.gameId});
    return;            
  }else if(dropLocation != "playerhand"){
    IO.socket.emit("placeBack", {room: App.gameId, deckType: dropLocation});
    $(el).remove();  
  }
};

function drag(el, source) {
  var dropLocation = $(source).data("decktype");

  App.pulledFrom = dropLocation;
  App.referencedElement = source;
  
  pullCard(dropLocation);
};

function pullCard(destination) {
  IO.socket.emit("pullACard", {room: App.gameId,  pile: dropLocation, playerId: App.currentPlayer});
}

function joinRoom() {
  IO.socket.emit("join", {room: App.roomID});
};

function waiting() {
  App.loading.show();
}

function hideOverlays() {
  App.loading.hide();
  App.overlay.hide();
}

function registerDragEvents(dragndrop) {
  dragndrop.on("cancel", App.drop);
  dragndrop.on("dragend", App.dragEnd);
  dragndrop.on("drag", App.drag);
  dragndrop.on("drop", App.drop);
}

function handSetup(data){
  App.gameId = data.gameId;
  data.hand.forEach(function(e,i,a){
    console.log(e);
  });
}

function setPlayer(data){
  
}