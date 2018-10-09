'use strict';

let logger      = require('../logger');

const fs        = require('fs-extra');
const path      = require('path');
const async     = require('async');

/**
 * Clean up all workpath files and remove folder
 */
module.exports = function(project, updateCurrentAction) {
    return new Promise((resolve, reject) => {

        logger.info(`[${project.uid}] cleaning up...`);

        // we need a way to skip downloading a same project everytime
        // used with settings.tmpDir.
        if(typeof project.settings.clearCache !== 'undefined' &&
           !project.settings.clearCache) {
            logger.info(`[${project.uid}] clean up skipped.`);
            return resolve(project);
        }

        fs.remove( project.workpath, (err) => {
            return (err) ? reject(err) : resolve(project);
        })
    });
};
