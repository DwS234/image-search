 /******************************************************
 * PLEASE DO NOT EDIT THIS FILE
 * the verification process may break
 * ***************************************************/

'use strict';

var fs = require('fs');
var express = require('express');
var app = express();
var axios = require('axios');
var mongoose = require("mongoose");

mongoose.connect(process.env.MONGODB_CONNECTION_LINK, function(error){
    if(error)
    {
      console.log(error);
    } else {
      console.log("Connection established"); 
    }
  });

var Schema = mongoose.Schema;

var schema = new Schema({
  term: String,
  date: Date
});

var Query = mongoose.model("Query", schema);



if (!process.env.DISABLE_XORIGIN) {
  app.use(function(req, res, next) {
    var allowedOrigins = ['https://narrow-plane.gomix.me', 'https://www.freecodecamp.com'];
    var origin = req.headers.origin || '*';
    if(!process.env.XORIG_RESTRICT || allowedOrigins.indexOf(origin) > -1){
         console.log(origin);
         res.setHeader('Access-Control-Allow-Origin', origin);
         res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    }
    next();
  });
}

app.use('/public', express.static(process.cwd() + '/public'));

app.route('/_api/package.json')
  .get(function(req, res, next) {
    console.log('requested');
    fs.readFile(__dirname + '/package.json', function(err, data) {
      if(err) return next(err);
      res.type('txt').send(data.toString());
    });
  });
  
app.route('/')
    .get(function(req, res) {
		  res.sendFile(process.cwd() + '/views/index.html');
    });

app.get('/search/:input', function(req, res){

  
  var input = req.params.input;
  var offset = req.query.offset;
  
  Query.create({term: input, date: Date.now()});
  
  res.setHeader("Content-Type", "application/json");
  
  if(offset && offset > 0){
    
    if(offset > 91){
          res.send(JSON.stringify({
            "error": {
                "errors": [
                 {
                  "domain": "global",
                  "reason": "invalid",
                  "message": "Invalid Value"
                 }
                ],
                "code": 400,
                "message": "Invalid Value"
               }
          }, null, 4));
      } 
    
    else {
    axios.get("https://www.googleapis.com/customsearch/v1?key=" + process.env.GOOGLE_CUSTOM_SEARCH_API_KEY + "&q=" + input + "&cx=002758690557208800833:bt8ecwcgqcs&searchType=image&start=" + offset).then(resp => {
     
         var images = [];
      images = resp.data.items.map(item => {
        return {imageUrl: item.link, alt: item.snippet, contextPage: item.image.contextLink}; 
      });
        
      res.send(JSON.stringify(images));
    
    }).catch(err => {
     res.send(err); 
    });
    }
  } else {
      axios.get("https://www.googleapis.com/customsearch/v1?key=" + process.env.GOOGLE_CUSTOM_SEARCH_API_KEY + "&q=" + input + "&cx=002758690557208800833:bt8ecwcgqcs&searchType=image").then(resp => {
      var images = [];
      images = resp.data.items.map(item => {
        return {imageUrl: item.link, alt: item.snippet, contextPage: item.image.contextLink}; 
      });
      res.send(JSON.stringify(images));
    }).catch(err => {
     res.send(err); 
    });
  }
});

app.get("/recent", function(req, res){
    res.setHeader("Content-Type", "application/json");
    var queriesArr = [];
    Query.find({}, function(err, queries){
        if(err){
           res.send(err); 
        } else {
          queriesArr = queries.map(query => {
            return {term: query.term, date: query.date};
          });
          res.send(queriesArr);
        }
    });
});

// Respond not found to all the wrong routes
app.use(function(req, res, next){
  res.status(404);
  res.type('txt').send('Not found');
});

// Error Middleware
app.use(function(err, req, res, next) {
  if(err) {
    res.status(err.status || 500)
      .type('txt')
      .send(err.message || 'SERVER ERROR');
  }  
})

app.listen(process.env.PORT, function () {
  console.log('Node.js listening ...');
});

