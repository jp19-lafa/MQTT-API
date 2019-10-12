const mosca = require('mosca');
const winston = require('winston');
const express = require('express');
const database = require('mongoose');
const cors = require('cors');
const jwt = require('express-jwt');
const app = express();
const fs = require('fs');

const logger = winston.createLogger();

logger.add(new winston.transports.Console({
  format: winston.format.simple()
}));

// const server = new mosca.Server({
//   port: 1887,
//   backend: {
//     type: 'mongo',
//     url: 'mongodb://database:27017/mqtt',
//     pubsubCollection: 'ascoltatori',
//     mongo: {}
//   }
// });

// server.authenticate = (client, username, password, callback) => {
//   if (username.toString() === 'Farm' && password.toString() === 'Lab') {
//     callback(null, true);
//   }
//   callback(null, false);
// }

// server.on('ready', () => {
//   //
// });

// server.on('clientDisconnected', function (client) {
//   //
// });

// server.on('published', (packet, client) => {
//   //
// });

const { userSchema } = require('./models/user.model');
const user = database.model('User', userSchema);


// Mongoose Connection
database.connect('mongodb://database:27017/farmlab', { useNewUrlParser: true, useFindAndModify: false, useUnifiedTopology: true }).then(
  () => logger.info('Database Connected'),
  err => {
    logger.error('Database Connection Error', err);
    process.exit(1);
  }
);

// CORS
const whitelist = ['http://localhost:4200', 'https://api.farmlab.team', 'https://api.staging.farmlab.team'];
const corsOptionsDelegate = (req, callback) => {
  var corsOptions;
  if (whitelist.indexOf(req.header('Origin')) !== -1) {
    corsOptions = { origin: true }
  } else {
    corsOptions = { origin: false }
  }
  callback(null, corsOptions);
}
app.use(cors(corsOptionsDelegate));

// JSON Body parsing
app.use(express.json());

// Define app wide services
let services = {
  database: database,
  logger: logger,
  models: {
    user: user
  },
  keys: {
    private: fs.readFileSync('keys/private.key'),
    public: fs.readFileSync('keys/public.key')
  }
}

// to Globals
// global.logger = logger;
// global.database = database;
// global.models = {
//   user: user
// };

app.use(jwt({ secret: 'ThisIsATempSecret'}).unless({path: ['/auth/login', '/auth/refresh']}));

// Routes
app.use('/auth', require('./routes/auth.route')(services));
app.use('/nodes', require('./routes/nodes.route')(services));

app.use(function (err, req, res, next) {
  if (err.name === 'UnauthorizedError') {
    res.status(401).send({
      error: 'Unautorized',
      code: 401,
      reason: 'Invalid Token'
    });
  }
});

app.listen(8080, '0.0.0.0', () => {
  logger.info('HTTP Server Running');
});

module.exports = app;