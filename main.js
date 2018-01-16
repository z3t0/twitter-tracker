/**
* Created by z3t0 on 2016-09-04.
Copyright (c) 2016 Rafi Khan All Rights Reserved.
*/

// Config
var tweets = []
var ops = ['Z3T0_rk', 'brcispark']
var status_text = "This is a status line, replace it with what you want"

// Require Modules
var Twit = require('twit')
var server = require('http').createServer();
var jsonfile = require('jsonfile')
var fs = require('fs')

var file = 'data.json'

// Load and Save

function Save() {
    console.log("saving")
    jsonfile.writeFile(file, tweets, function(err) {
        if (err)
            console.error(err)
    })
}

function Load() {
    fs.stat(file, function(err, stat) {

        if(err === null) {
            console.log('data File exists');
            tweets = jsonfile.readFileSync(file)

        } else if(err.code == 'ENOENT') {
            // file does not exist
            console.log('data file does not exists');

        } else {
            console.log('Some other error: ', err.code);
        }
    });
}

Load()

setInterval(Save, 30000);

// Socket IO
var io = require('socket.io')(server);
io.on('connection', function(client){
    console.log('connected')


    // Send it the data it does not yet have
    for(var i = 0; i < tweets.length; i++) {
        client.emit('tweet', tweets[i])
    }

    // Send it the status
    io.emit('status', status_text)

    client.on('event', function(data){});

    client.on('disconnect', function(){
        console.log('disconnected')
    })
});
server.listen(3000);

// Twitter Client
// Fill in the fields with your application information
// See: https://developer.twitter.com/en/docs/basics/authentication/guides/access-tokens
var T = new Twit({
    consumer_key:         '',
    consumer_secret:      '',
    access_token:         '',
    access_token_secret:  '',
})

console.log("Starting ... ")
var stream = T.stream('statuses/filter',
    {
        // follow: "brcispark",
        track: ""
    }
)

var admin = T.stream('statuses/filter',
    {
        // follow: "brcispark",
        track: "brcisparkadmin"
    }
)

stream.on('tweet', function(data) {

    // Check is this is authorized
    if(isAuthorized(data)) {

      var tweet

      // Check if retweeted
      if(data.retweeted_status) {
        console.log("retweet from : " + data.user.screen_name)
        tweet = processTweet(data.retweeted_status)
      }

      else {
        // From ops
        tweet = processTweet(data)
      }

      Post(tweet)
    }
})

// Admin command, parse
admin.on('tweet', function(data) {
    if (isAuthorized(data)) {
        console.log("command from: " + data.user.screen_name)
        // This is the master: feel free to continue
        processCommand(data)
    }
})

// Checks if the tweet is authorized: returns true or false
function isAuthorized(data) {
  var user = data.user.screen_name

  for (var i = 0; i < ops.length; i++) {
    if (user == ops[i])
      return true
  }

  return false
}

function Post(data) {
    io.emit('tweet', data)
    tweets.push(data)
}

// Available Commands
var command_status = {
  command: "status",
  task: function(text) {
    status_text = text + ' | Developed by Rafi Khan |'
    io.emit('status', status_text)
  }
}

// Register Commands
var commands = []
commands.push(command_status)

function processCommand(data) {
  var text = data.text.replace("#brcisparkadmin", "").trim()
  var words = text.split(' ')

  var command_word
  var command

  // Find command
  for(var i = 0; i < commands.length; i++) {
    for (var j = 0; j < words.length; j++) {
      if (words[j] == commands[i].command) {
        command = commands[i]
        command_word = command.name
        break
      }
    }
  }

  if (command !== undefined) {
    text = text.replace(command_word, "").trim()
    command.task(text)
  }

  else {
    console.log("command not found: " + text)
  }

}

// Process Tweet
function processTweet(tweetData) {
    var data = tweetData

    var tweet = {}

    // User
    var user_name = data.user.screen_name
    var user_fullname = data.user.name
    var user_image_src = data.user.profile_image_url.replace("normal", "400x400")

    // Tweet Text
    var tweet_text = data.text

    // Media
    var media = []
    var has_media = false
    if (data.entities.media) {
        for (var i = 0; i < data.entities.media.length; i++) {
            // debugger;
            media.push(data.entities.media[i])
        }
        has_media = true
    }

    tweet.user_name = user_name
    tweet.user_fullname = user_fullname
    tweet.user_image_src = user_image_src
    tweet.tweet_text = tweet_text
    tweet.date = data.created_at
    tweet.has_media = has_media
    tweet.media = media

    console.log("tweet from: " + user_name)

    return tweet
}
