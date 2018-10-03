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

        if(typeof updateCurrentAction === 'undefined' || updateCurrentAction === true) {
            project.setCurrentActionAndSave('cleanup')
            .catch((err) => {
                logger.info(`[${project.uid}] failed to set currentAction to "cleanup": ${err}`);
            });
        }

        fs.remove( project.workpath, (err) => {
            return (err) ? reject(err) : resolve(project);
        })
    });
};
