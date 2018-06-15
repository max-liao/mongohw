// Dependencies
var express = require("express");
var mongojs = require("mongojs");
// Require request and cheerio. This makes the scraping possible
var request = require("request");
var cheerio = require("cheerio");
var bodyParser = require("body-parser");

var mongoose = require("mongoose");
// mongoose.connect("mongodb://localhost/");

// If deployed, use the deployed database. Otherwise use the local mongoHeadlines database
var MONGODB_URI = "mongodb://heroku_11d8ncjs:b277du6tdk8qoutj3e239er5ne@ds255740.mlab.com:55740/heroku_11d8ncjs" || "mongodb://localhost/scraper";
// Set mongoose to leverage built in JavaScript ES6 Promises
// Connect to the Mongo DB
mongoose.Promise = Promise;
mongoose.connect(MONGODB_URI)
console.log(mongoose.connect(MONGODB_URI));

var Note = require("./public/Note")

// Initialize Express
var PORT = process.env.PORT || 3000;
var app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Database configuration
var databaseUrl = "scraper";
var collections = ["scrapedData"];

// Hook mongojs configuration to the db variable
var db = mongojs(databaseUrl, collections);
db.on("error", function(error) {
  console.log("Database Error:", error);
});

// Retrieve data from the db
app.get("/all", function(req, res) {
  // Find all results from the scrapedData collection in the db
  db.scrapedData.find({}, function(error, found) {
    // Throw any errors to the console
    if (error) {
      console.log(error);
    }
    // If there are no errors, send the data to the browser as json
    else {
      res.json(found);
    }
  });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/all/:id", function(req, res) {
  var id = req.params.id;
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.scrapedData.find({'_id': db.ObjectId(id)}, function(error, found) {
    // Throw any errors to the console
    if (error) {
      console.log(error);
    }
    // If there are no errors, send the data to the browser as json
    else {
      res.json(found);
    }
  })
});

app.post("/all/:id", function(req, res) {
    var id = req.params.id;
  Note.create(req.body)
    .then(function(dbNote) {
      // console.log(dbNote);
      db.scrapedData.update({ "_id": db.ObjectId(id) }, {$set: {"note" : dbNote} }, { new: true });
    }).then(function(dbPost) {
      // console.log(dbPost);
      res.json(dbPost);
    }).catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});


// Scrape data from one site and place it into the mongodb db
app.get("/scrape", function(req, res) {
  // Make a request for the news section of `ycombinator`
  request("https://www.reddit.com/r/Eyebleach/", function(error, response, html) {
    // Load the html body from request into cheerio
    var $ = cheerio.load(html);
    // console.log("SCRAPE");
    $(".thing").each(function(i, element) {
      // Save the text and href of each link enclosed in the current element
      var title = $(element).children(".entry").children(".top-matter").children(".title").children("a").text();
      var link = $(element).children(".entry").children(".top-matter").children(".title").children("a").attr("href");
      var author = $(element).children(".entry").children(".top-matter").children(".tagline").children(".author").text();
      var thumbnail = $(element).children(".thumbnail").children("img").attr("src");
      var comments = $(element).children(".entry").children(".top-matter").children(".buttons").children(".first").children(".comments").attr("href");
      
      if (title && link && author && thumbnail && comments) {
        db.scrapedData.find({"title": title}, function(error, found) {
          // Throw any errors to the console
          if (error) {
            console.log(error);
          }
          // If there are no errors, send the data to the browser as json
          else if (found.length == 0) {
            console.log("Not found");
            db.scrapedData.insert({
              title: title,
              author: author,
              link: link,
              thumbnail: thumbnail,
              comments: comments,
              // usercomments: 
            },
            function(err, inserted) {
              if (err) {
                // Log the error if one is encountered during the query
                console.log(err);
              }
              else {
                // Otherwise, log the inserted data
                console.log(inserted);
              }
            });
          } else {
            // console.log("found");
            // console.log(found.length);
          }
        });
      }
    });
  });

  // Send a "Scrape Complete" message to the browser
  var index = "Scrape Complete \n \n <li><a href='/all'>All</a></li>";
  res.send(index);
});


// Listen on port 3000
app.listen(PORT, function() {
  console.log(`App running on port ${PORT}!`);
});
