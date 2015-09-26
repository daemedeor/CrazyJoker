module.exports = function(app, socket, db){
  app.get("/contracts", function(req, res){
    
    db.Contracts.findAll().then(function(contracts){
      
      var alreadyPlayedContracts = req.session.alreadyPlayedContracts;

      var filteredContracts = contracts.filter(function(element,index,array) {  
        
        return alreadyPlayedContracts.reduce(function(found, el){
          return found || (el.contractId == element.id && el);
        }, null);

      });

      res.render("templates/contract", {contracts: contracts});
    
    });
  });

  app.post("/setContract", function(req,res){
  
    req.session.alreadyPlayedContracts.push({contractName: req.body.name, contractId: req.body.contractId});

    req.session.currentContract = {contractName: req.body.name, contractId: req.body.contractId};
    socket.to(req.session.socketId).emit('contractDecided');
    res.sendStatus(200);
  });
};