const Twitter = require('twitter');
const authAPI = require('./config/twitter.js');
const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const cors = require('cors');
const Users = require('./db.js').Users;
const getLikes = require('./likes.js');
const scrapeReplies = require('./config/awsURLs.js');
const port = process.env.PORT || 3001;

// Load the AWS SDK for Node.js
var AWS = require('aws-sdk');
AWS.config.loadFromPath('./config/aws.json');

// Create an SQS service object
var sqs = new AWS.SQS({apiVersion: '2012-11-05'});

var app = express();

// Logging and parsing
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cors());

app.get('/health', (req, res) => {
  res.writeHead(200);
  res.end('healthy');
})

app.get('/likes/:userId/:viewerId', async (req, res) => {
    try {
      let userId = req.params.userId;
      let viewerId = req.params.viewerId;
      let viewer = await Users.findOne({id: viewerId});
      let tokenKey = viewer.twitterTokenKey;
      let tokenSecret = viewer.twitterTokenSecret;
      let client = new Twitter({
        consumer_key: authAPI.TWITTER_CONSUMER_KEY,
        consumer_secret: authAPI.TWITTER_CONSUMER_SECRET,
        access_token_key: tokenKey,
        access_token_secret: tokenSecret
      });
      let likes = await getLikes(client, userId);
      let numLikes = likes.length;
      let batchSize = 20;
      let batches = Math.ceil(numLikes / batchSize);
      for (let i = 0; i < batches; i++) {
        let messageArr = [];
        let numberBatchLikes = Math.min(batchSize * (i + 1) - batchSize * i, likes.length - batchSize * i);
        for (let j = 0; j < numberBatchLikes; j++) {
          messageArr.push(`${likes[batchSize * i + j]['user']['screen_name']}.${likes[batchSize * i + j]['id_str']}`)
        }
        let message = messageArr.join(',');
        console.log('message to be sent', message);
        let params = {
          DelaySeconds: 10,
          MessageBody: message,
          QueueUrl: scrapeReplies
         };
         sqs.sendMessage(params, function(err, data) {
           if (err) {
             console.log("Error in refresh-friends", err);
           } else {
             console.log("Success in refresh-friends", data.MessageId);
           }
         });
      }
      res.writeHead(200);
      res.end(JSON.stringify(likes));
    } catch(err) {
      res.writeHead(404);
      res.end(err);
    }
})

app.listen(port, () => {
	console.log(`listening on port ${port}`);
})
