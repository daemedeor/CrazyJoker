var db = require('../models/index.js');

var express = require('express')
    , app = express()
    , server  = require("http").createServer(app)
    , io = require("socket.io")(server)
    , redis = require("redis")
    , client = redis.createClient()
    , Session = require("express-session")
    , redisStore = require("connect-redis")(Session)
    , generalRoutes = require("./Routes.js")
    , cookieParser = require("cookie-parser")
    , bodyParser = require("body-parser")
    , config = require("../config/config")
    , RedisStore = new redisStore({ client: client })
    , ios = require('socket.io-express-session')
    , ioSocket = require("./iolisteners")(app, io, redis);

var session = Session({
                secret: config.cookie_secret,
                resave: false,
                saveUninitialized: true,
                store: RedisStore,
                key: config.cookie_secret,
                name: config.cookie_name
            });

io.use(ios(session));
app.use(session);

var allowCrossDomain = function (req, res, next) {
    res.header("Access-Control-Allow-Origin", config.allowedCORSOrigins);
    res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    res.header("Access-Control-Allow-Credentials", "true");
    next();
};

app.use(allowCrossDomain);
app.use(cookieParser(config.cookie_secret));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

templates = require('./templates')(app, io, db);

app.get("/", function(req,res){
    res.redirect("/table");
});

module.exports = {app: app, server: server};
