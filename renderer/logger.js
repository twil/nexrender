'use strict';

// we have winston@2.4.4 in jshint as a dependency
var winston = require('winston');


var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({ timestamp: true })
    ]
});

module.exports = logger;
