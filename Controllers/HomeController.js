var bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({extended: false });
var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');
var multer = require("multer");
var path = require('path');
var util = require('util');
//var LocalStrategy = require("passport-local").Strategy;
var jwt = require('jsonwebtoken');
var passportJWT = require("passport-jwt");
var ExtractJwt = passportJWT.ExtractJwt;
var JwtStrategy = passportJWT.Strategy;





var usersSchema = new mongoose.Schema({
	email: {type: String, unique: true},
	password: String,
	name: String,
	address: String,
	dob: String,
	city: String
});


usersSchema.pre('save',function(next){
	var user = this;
	 if (!user.isModified('password')) return next();
	 bcrypt.genSalt(10, function(err, salt) {
        if (err) return next(err);

        // hash the password using our new salt
        bcrypt.hash(user.password, salt, function(err, hash) {
            if (err) return next(err);

            // override the cleartext password with the hashed one
            user.password = hash;
            next();
        });
    });
});

var convSchema = new mongoose.Schema({
	user_from: String,
	user_to: String
});

var msgsSchema = new mongoose.Schema({
	user_from: String,
	user_to: String,
	msg: String,
	convid: String
});


/*usersSchema.comparePassword = function(candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
        if (err) return cb(err);
        cb(null, isMatch);
    });
}*/

var User = mongoose.model('User',usersSchema,'users');
var Conv = mongoose.model('Conv',convSchema,'conv');
var Msg = mongoose.model('Msg',msgsSchema,'msgs');

var dbURI = 'mongodb://localhost:27017/asg_1';
mongoose.connect(dbURI);
let db = mongoose.connection;

db.once('open', function(){
	console.log('Connected to asg_1');
});


module.exports = function(app,passport,io){

	io.on('connection',function(socket){
	console.log('conected',socket.id);
	/*socket.on('chat',function(data){
		console.log(data.email)
		io.sockets.emit('chat',data);
	});*/

	socket.on('subscribe',function(room,name_){
		console.log('joined' + name_);
		socket.join(room);
	});

	socket.on('leave', function(room) {
		console.log('left');
        socket.leave(room);
     });

	socket.on('chat',function(data){
		console.log('sending msg' +data.message+ 'in room '+data.room);
		io.sockets.to(data.room).emit('msgs',{message: data.message,name: data.name,convid: data.convid,email: data.user_from});

		let newmsg = new Msg({
	         user_from: data.user_from,
	         user_to: data.user_to,
	         msg: data.message,
	         convid: data.convid
        });

        db.collection('msgs').insertOne(newmsg,function(err,inserted){
        	if(err)console.log(err);
        	if(inserted)console.log('Msg Inserted');
        });
	});
});
	

	var jwtOptions = {}
    jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
    //jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme('Bearer')
    //jwtOptions.jwtFromRequest = ExtractJwt.fromBodyField('token');
    jwtOptions.secretOrKey = 'anytext';

    var strategy = new JwtStrategy(jwtOptions, function(jwt_payload, next) {
         console.log('payload received', jwt_payload);
         User.findOne({id: jwt_payload.id}, function(err,user){
         	if (user) {
         		console.log(user);
             return next(null, user);
             } 
         else {
         	 console.log('false');
             return next(null, false);
             }
         });
});

passport.use('jwt',strategy);

	app.get('/',function(req,res){
		res.render("home");
	});

	app.post('/registerapi',urlencodedParser, function(req,res){
		var user = JSON.parse(req.body.data);
		var name = user.name;
		var email = user.email;
		var pass = user.pass;

		/*var salt = bcrypt.genSaltSync(10);
		var hash = bcrypt.hashSync(pass, salt);
		pass = hash;*/

		let newUser = new User({
			name: name,
			email: email,
			password: pass
		});

		User.findOne({email: email},function(err,found){
			if(err){
				console.log(err);
			}
			if(found==null){
				console.log('not exists');
				res.send(JSON.stringify('no'));
			    newUser.save(function(err){
			    if(err) {console.log(err);}
			    res.end('Inserted');
		     });
			}
			if(found != null){
				console.log('exists');
				res.send(JSON.stringify('yes'));
			}
		});
	});

	app.post('/loginapi', function(req,res){
		var user = JSON.parse(req.body.data);
		var email = user.email;
		var password = user.pass;

		User.findOne({email: email},function(err,found){
			if(err){
				console.log(err);
			}
			if(found==null){
				res.send(JSON.stringify('no'));
			}
			if(found != null){
				var matchpass = bcrypt.compareSync(password,found.password);
				if(matchpass ==false)res.send(JSON.stringify('no'));
				else {
                    if (err) throw err;
                    console.log('exists');
                    var payload = {id: found.id};
                    var token = jwt.sign(payload, jwtOptions.secretOrKey, { expiresIn: '30m' });
                    res.json({data: "yes", Authorization:token,info: found});
                 };
			}
		});
	});

	app.post('/updateapi',urlencodedParser,function(req,res){
		var user = JSON.parse(req.body.data);
		console.log(user.email);
		var name = user.name;
		var email = user.email;
		var dob = user.dob;
		var address = user.address;
		var city = user.city;

		let userdata = {
			name: name,
			email: email,
			dob: dob,
			city: city,
			address: address
		}

		User.update({email: email},{$set: {
            name: name,
			dob: dob,
			address: address,
			city: city
		}
		},function(err,updated){
			if(err) console.log(err);
			else{
				res.json(JSON.stringify(userdata));
			}
		});
	});

	app.post('/picupload',urlencodedParser,function(req,res,next){
		var name = req.cookies.name;
		var storage = multer.diskStorage({
	         destination: function(req,file,cb){
		     cb(null,'./public/images')
	         },
	         filename: function(req,file,cb){
		     cb(null,''+name+'.png')
	         }
         });

		var upload = multer({storage: storage}).single('avatar');


			upload(req,res, function(err){
				if(err) {
					console.log(err);
					res.json('Error Uploading Image');
				}
				else{
		            console.log(req.body);
					res.json('File Saved');
				}
			})
	});

	app.post('/listusers',urlencodedParser,function(req,res,next){
		var data = JSON.parse(req.body.data);
		var useremail = data.email;
		User.find({email: {$ne: useremail}}, function(err,found){
			if(err) console.log(err);
			res.json(JSON.stringify(found));
		});
	});

	app.post('/getconvo',urlencodedParser,function(req,res,next){
		var msgs=[];
		var data = JSON.parse(req.body.data);
		var convid = data.convid;
		db.collection('msgs').find({convid: convid}).toArray(function(err,found){
			if(err)console.log(err);
			if(found==null) res.json(JSON.stringify(''));
			else{
				//found.forEach(function(data){msgs.push(data.msg);console.log('msg: '+data.msg+' ,from: '+data.user_from);})
				//console.log(found);
				res.json(JSON.stringify(found));
			}
		});
	});

	app.post('/getconvid',urlencodedParser,function(req,res,next){
		var data = JSON.parse(req.body.data);
		var user_from = data.user_from;
		var user_to = data.user_to;

		let newconv = new Conv({
	         user_from: user_from,
	         user_to: user_to
        });

        Conv.findOne({$or: [{user_from: user_from,user_to: user_to},{user_from: user_to,user_to: user_from}]},function(err,found){
				if(err) console.log(err);
				if(found==null){
					newconv.save(function(err){
						if(err)console.log(err);
						Conv.findOne({$or: [{user_from: user_from,user_to: user_to},{user_from: user_to,user_to: user_from}]},function(err,found){
							if(err)console.log(err);
							res.json(JSON.stringify(found));
						});
					});
				}
				else
					res.json(JSON.stringify(found));
			});
	});
};



		//res.send('yes');
		 /*        passport.authenticate('local')(req, res, function () {
            res.send('yes');
        });*/


		/*passport.use('login', new localStrategy({
			usernameField: "email",
            passwordField: "password"
		},function(username,password, done){

	         User.findOne({email: email}, function(err,user){
             if(err) console.log(err);
             if(!user){
             	console.log('not exists');
				res.send(JSON.stringify('no'));
             	return(null,false);
             }
             if(user)
             {
             	if(bcrypt.compareSync(pass,user.password) ==false)res.send(JSON.stringify('no'));
             	else{
             		console.log('exists');
				    res.send(JSON.stringify('yes'));
				    return done(null,user);
             	    }
             }
	         });
         }));

		passport.serializeUser(function(user, done){
            done(null,user.id);
         });

         passport.deserializeUser(function(id, done){
         User.findById(id,function(err,user){
                 done(err,user);
            });
         });


		/*passport.authenticate('login', function(err,user,info){
			req.logIn(user, function(err) {
				if (err) { return next(err); }
                     return res.send(JSON.stringify('yes'));
                });
		});*/


		/*User.findOne({email: email},function(err,found){
			if(err){
				console.log(err);
			}
			if(found==null){

			}
			if(found != null){
				if(bcrypt.compareSync(pass,found.password) ==false)res.send(JSON.stringify('no'));
				else {
                    if (err) throw err;
                    console.log('exists');
				    res.send(JSON.stringify('yes'));
                 };
			}
		});*/