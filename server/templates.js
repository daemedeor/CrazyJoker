module.exports = function(app, socket, db){
  app.get("/contracts", function(req, res){
    
    db.Contracts.findAll().then(function(contracts){
      
      var alreadyPlayedContracts = req.session.alreadyPlayedContracts;

      var filteredContracts = contracts.filter(function(element) {  
        
        return !alreadyPlayedContracts.reduce(function(found, el){
          return found || (el.contractId == element.id && el);
        }, null);

      });
      res.render("templates/contract", {contracts: filteredContracts});
    
    });
  });

  app.post("/setContract", function(req,res){
    req.session.alreadyPlayedContracts.push({contractName: req.body.name, contractId: req.body.contractId, backendName: req.body.bName});

    req.session.currentContract = {contractName: req.body.name, contractId: req.body.contractId, backendName: req.body.bName};
    socket.to(req.session.socketId).emit('contractDecided');
    res.sendStatus(200);
  });
};