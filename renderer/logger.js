'use strict';

var winston = require('winston');


var logger = new (winston.Logger)({
    level: process.env.AE_LOG_LEVEL || 'info',
    transports: [
        new (winston.transports.Console)({ timestamp: true })
    ]
});

module.exports = logger;
