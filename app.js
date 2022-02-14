//jshint esversion:6
//jshint esversion:6
require('dotenv').config();
const express=require('express');
const mongoose=require('mongoose');

const bodyparser=require('body-parser');
const ejs=require('ejs');
const encrypt=require('mongoose-encryption');
const FINDORCREATE=require('mongoose-findorcreate');

const app=express();
md5=require('md5');
const saltRounds = 10;
app.set('view engine','ejs');
const bcrypt = require('bcrypt');
app.use(express.static('public'));
app.use(bodyparser.urlencoded({extended:true}));
var session=require('express-session');
const passport=require('passport');
const passportLM=require('passport-local-mongoose');
const  GoogleStrategy = require('passport-google-oauth20').Strategy;
const   GitHubStrategy = require('passport-github2');


var Publishable_Key ="pk_test_51KSiGdSJ9AvhnRytYvVkWYRj35irl7hSd5rPRPBfvYdefL6TbhlChdC72yalBz1ZKTQIKCNFSqP46etfIeOO75J500dBuCxzA7";
var Secret_Key = "sk_test_51KSiGdSJ9AvhnRyttfc1WY6nAdME0XPVmvrGSkjqPdqBzh8E7LysvSjd5uudyV69gHJkBrUFMw9fNgMT6boK9GRq00Y9psbOvp";

const stripe = require('stripe')(Secret_Key);


app.use(session({
  secret: 'this is session secret key.',
  resave: true,
  saveUninitialized: true,

}));
app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb://localhost:27017/AuthDb",{useNewUrlParser:true});



const ps=new mongoose.Schema({
username: String,
password: String,
googleI:String,
secret: String,
url :String,
githubId:String
});
ps.plugin(passportLM);
ps.plugin(FINDORCREATE);

// ps.plugin(encrypt,{secret:process.env.SECRET,encryptedFields:['password']});
const USER=new mongoose.model("USER",ps);
passport.use(USER.createStrategy());
passport.serializeUser(function(USER, done) {
  done(null, USER);
});

passport.deserializeUser(function(USER, done) {
  done(null, USER);
});

passport.use(new GitHubStrategy({
  clientID: process.env.CLIENT_ID2,
  clientSecret: process.env.CLIENT_SECRET2,
  callbackURL: "http://localhost:8000/auth/github/secrets"
  },
  function(accessToken, refreshToken, profile, done) {
    USER.findOrCreate({ githubId: profile.id },{url:profile.photos[0].value }, function (err, user) {
      return done(err, USER);
    });
  }
));
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:8000/auth/google/secrets",

  },
  function(accessToken, refreshToken, profile, cb) {


    USER.findOrCreate({ googleId: profile.id},{username:profile.emails[0].value,url:profile.photos[0].value } , function (err, user) {

      return cb(err, user);
    });
  }
));
//


app.get('/paytm',function(req,res){
  res.render('paytm', {
     key: Publishable_Key
  })
})

app.post('/paytm', function(req, res){

    // Moreover you can take more details from user
    // like Address, Name, etc from form
    stripe.customers.create({
        email: req.body.stripeEmail,
        source: req.body.stripeToken,
        name: 'Syed shoaib',
        address: {
            line1: 'TC 9/4 Old MES colony',
            postal_code: '452331',
            city: 'Indore',
            state: 'Madhya Pradesh',
            country: 'India',
        }
    })
    .then((customer) => {

        return stripe.charges.create({
            amount: 50000,     // Charing Rs 25
            description: 'secrets of celbs',
            currency: 'INR',
            customer: customer.id
        });
    })
    .then((charge) => {
        res.send("Successful") ; // If no error occurs
    })
    .catch((err) => {
       console.log(err)      // If some error occurs
    });
})


app.post('/register',function(req,res){
  // bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
  //   const user0= new USER({
  //     email: req.body.username,
  //     password:hash
  //
  //   });

    // user0.save(function(err){
    //   if(err){
    //     res.send('error');
    //   }
    //   else{
    //     res.render('secrets');
    //
    //   }
    // });
  // });




  USER.register({username: req.body.username}, req.body.password, function(err, user) {
    if (err) {
  console.log("err");
  console.log(err);


      res.redirect('/register');


    }
     else{

    passport.authenticate("local")(req,res,function(){

      res.redirect('/secrets');

    });
  }
      // Value 'result' is set to false. The user could not be authenticated since the user is not active
    });


});



// mongoose.connect("mongodb://localhost:27017/WikiDb",{useNewUrlParser:true});
// const ps=new mongoose.Schema({
// title: String,
// content: String
// });
app.get('/',function(req,res){
  res.render('home');

});

app.get('/secrets',function(req,res){


USER.find({secret:{$ne:null}},function(err,users){
if(!err){
  if(users){


      res.render('secrets',{users:users});
  }
}
})





});
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile','email'] }));


  app.get('/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/submit');
  });
  app.get('/auth/github',
    passport.authenticate('github', { scope: ['profile','email'] }));


    app.get('/auth/github/secrets',
    passport.authenticate('github', { failureRedirect: '/login' }),
    function(req, res) {
      // Successful authentication, redirect home.
      res.redirect('/submit');
    });
app.get('/submit',function(req,res){

  if(req.isAuthenticated()){

res.render('submit');




  }
  else{
    res.render('login');

  }

});
app.get('/register',function(req,res){
  res.render('register');

});
app.post('/submit',function(req,res){

  secretsubmitted=req.body.secret;
  console.log(secretsubmitted);
  USER.findById(req.user._id,function(err,useR){
    if(!err){
      if(useR){
        useR.secret=secretsubmitted;
        useR.save(function(){

            res.redirect('/secrets');


        });

      }
      else{
        console.log("userr mot found");

      }
    }

  })

});
app.get('/login',function(req,res){
res.render('login');

});
app.get('/logout',function(req,res){
req.logout();
res.redirect('/');
});

// app.post('/submit',function(req,res){
//
//   const sec=req.body.secret;
// res.write(' <h1>sec</h1>  ');
// res.end();
//
//
// });
app.get('/:id',function(req,res){

  const Id=req.params.id;



USER.findById(Id,function(err,user){
  if(!err)

  res.render('view',{user:user});


});



});
app.post('/login',function(req,res){
//
//   const Email= req.body.username;
//   const Password= md5(req.body.password);
//
//
//   USER.findOne({email:Email},function(err,respo){
//
//     if(respo){
//       bcrypt.compare(myPlaintextPassword, hash, function(err, result) {
//           // result == true
//       });
//       if(result==true){
//
//   res.render('secrets');
//
// }
//
//     }
//
//   else{
//     console.log('not found');
// res.send('err');
//
//
//   }
//
//   })


const user=new USER({
  username:req.body.username,
  password:req.body.password

})
req.login(user,function(err){
  if(!err){

    passport.authenticate("local")(req,res,function(){
     console.log("sec");
      res.render('secrets');

    });


  }
  else{
    res.redirect('/register');

  }
})
});
app.listen(8000,function(){
  console.log('running');

});
