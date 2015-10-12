module.exports = function(app, socket, db) {
  app.get("/contract/select", function(req, res) {

    db.Contracts.findAll().then(function(contracts) {      
      var alreadyPlayedContracts = req.session.alreadyPlayedContracts;

      var filteredContracts = contracts.filter(function(element) {  
        
        return !alreadyPlayedContracts.reduce(function(found, el) {
          return found || (el.contractId == element.id && el);
        }, null);

      });

      res.render("templates/contract", {contracts: filteredContracts, choosingContract: true});
    
    });
  });

  app.get("/contract/all", function(req,res){
    db.Contracts.findAll().then(function(contracts) {
      res.render("templates/contract", {contracts: contracts, choosingContract: false});
    });
  });

  app.get("/contract/:id",function(req,res){
    db.Contracts.find({ where: { id: req.params.id } }).then(function(contract){
      res.render("templates/singleContract", {contract: contract})
    });
  });

  app.post("/setContract", function(req,res) {
    req.session.currentContract = {contractName: req.body.name, contractId: req.body.contractId, backendName: req.body.bName};
    res.sendStatus(200);
  });
};