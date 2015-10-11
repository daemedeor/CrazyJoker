var sessionService = require('./SessionUpdate.js');

module.exports = function(app, socket, db) {
  app.get("/contracts", function(req, res) {
    
    db.Contracts.findAll().then(function(contracts) {
      
      var alreadyPlayedContracts = req.session.alreadyPlayedContracts;

      var filteredContracts = contracts.filter(function(element) {  
        
        return !alreadyPlayedContracts.reduce(function(found, el) {
          return found || (el.contractId == element.id && el);
        }, null);

      });

      res.render("templates/contract", {contracts: filteredContracts});
    
    });
  });

  app.post("/setContract", function(req,res) {
    socket.to(req.session.socketId).emit('contractDecided', {contractName: req.body.name, contractId: req.body.contractId, backendName: req.body.bName});
    res.sendStatus(200);
  });
};