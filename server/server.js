var db = require('../models/index.js');

var express = require('express')
    , app = express()
    , mongo = require("mongo")
    , mongoose = require("mongoose")
    , server  = require("http").createServer(app)
    , io = require("socket.io")(server)
    , redis = require("redis")
    , pg = require("pg")
    , hstore = require("pg-hstore")()
    , client = redis.createClient()
    , cookie = require('cookie')
    , cookieParser = require('cookie-parser')
    , session = require("express-session")
    , redisStore = require("connect-redis")(session)
    , generalRoutes = require("./Routes.js")
    , bodyParser = require("body-parser")
    , passportSocketIo = require("passport.socketio")
    , config = require("../config/config")
    , ioSocket = require("./iolisteners")(app, io);

var RedisStore = new redisStore({
                                    port: config.session_port,
                                    host: "localhost",
                                    client: client
                                });

var sessionService = require('./sessionUpdate');
var sessionMiddleware = session({
                                    secret: config.cookie_secret,
                                    resave: true,
                                    saveUninitialized: true,
                                    store: RedisStore
                                });

var allowCrossDomain = function (req, res, next) {
    res.header("Access-Control-Allow-Origin", config.allowedCORSOrigins);
    res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    res.header("Access-Control-Allow-Credentials", "true");
    next();
};

sessionService.initializeRedis(client, RedisStore);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser(config.cookie_secret));
app.use(session({ store: RedisStore, key: config.cookie_secret, secret: config.cookie_secret, resave: true, saveUninitialized: true }));

io.use(function(socket, next) {
    var parseCookie = cookieParser(config.cookie_secret);
    var handshake = socket.request;

    parseCookie(handshake, null, function (err, data) {
        sessionService.get(handshake, function (err, session) {
            if (err)
                next(new Error(err.message));
            if (!session)
                next(new Error("Not authorized"));
            handshake.session = session;
            next();
        });
    });
});

templates = require('./templates')(app, io, db);

app.get("/", function(req,res){
    res.redirect("/table");
});

module.exports = {app: app, server: server};
