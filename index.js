var express = require("express");
var HomeController = require("./Controllers/HomeController");
var bodyParser = require('body-parser');
var session = require('express-session');
var passport = require('passport');
var cookieParser = require("cookie-parser");
var cors = require("cors");
var session = require('express-session');
var http = require('http');


var app = express();

var server = http.createServer(app);
var io = require('socket.io').listen(server);


app.set('view engine', 'ejs');

app.use(express.static('./'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false}));
app.use(cors());
//app.use(session({
	//secret: 'anystringsoftext'
	/*saveUninitialized: true,
	resave: true*/
//}));
app.use(cookieParser());
app.use(passport.initialize());
app.use(passport.session());

app.use(function(req,res,next){
	next();
});

HomeController(app,passport,io);
//app.listen(5000);
server.listen(5000);

