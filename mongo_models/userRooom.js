


var mongoose = require('mongoose');
/***********************************
        * Mongoose Schemas
************************************/

var newRoom = new mongoose.Schema({
 
   room: { type: String, index: true },
   status: String,
   numPlayers: Number,
   deck_id: String,
   players: [mongoose.Schema({
      id: String,
      name: String,
      status: String
   }, { _id: false })]
 
});

/***********************************
        * Mongoose Models
************************************/

var newRoom = mongoose.model('rooms', newRoom );

/***********************************
        * App Dependencies
************************************/

module.exports.AppUser = newRoom;
