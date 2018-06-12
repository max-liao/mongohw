// Dependencies
var express = require("express");
var mongojs = require("mongojs");
// Require request and cheerio. This makes the scraping possible
var request = require("request");
var cheerio = require("cheerio");

// Initialize Express
var app = express();

// Database configuration
var databaseUrl = "scraper";
var collections = ["scrapedData"];

// Hook mongojs configuration to the db variable
var db = mongojs(databaseUrl, collections);
db.on("error", function(error) {
  console.log("Database Error:", error);
});

// Main route (simple Hello World Message)
app.get("/", function(req, res) {
  // res.send("Hello world");
  var index = '<ul><li><a href="/all">All</a></li>';
  index += '<li><a href="/scrape">Scrape</a></li></ul>';
  res.send(index);
});

// Retrieve data from the db
app.get("/all", function(req, res) {
  
  // var entries = [];
  // for (i=0; i< db.scrapedData.length; i++){
  //   entries[i] = db.scrapedData.length
  // }

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


app.get("/repeat", function(req, res) {
  // Find all results from the scrapedData collection in the db
  db.scrapedData.find({"title":"The smiling Sphinx."}, function(error, found) {
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
              link: link,
              author: author,
              thumbnail: thumbnail,
              comments: comments 
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

      // if (title && link && author && thumbnail && comments) {
      //   // Insert the data in the scrapedData db
      //   db.scrapedData.insert({
      //     title: title,
      //     link: link,
      //     author: author,
      //     thumbnail: thumbnail,
      //     comments: comments 
      //   },
      //   function(err, inserted) {
      //     if (err) {
      //       // Log the error if one is encountered during the query
      //       console.log(err);
      //     }
      //     else {
      //       // Otherwise, log the inserted data
      //       console.log(inserted);
      //     }
      //   });
      // }
    });
  });

  // Send a "Scrape Complete" message to the browser
  var index = "Scrape Complete \n \n <li><a href='/all'>All</a></li>";
  res.send(index);
});


// Listen on port 3000
app.listen(3000, function() {
  console.log("App running on port 3000!");
});
