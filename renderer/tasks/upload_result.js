'use strict';

let logger          = require('../logger');

const fs            = require('fs-extra');
const path          = require('path');
const async         = require('async');
const FormData      = require('form-data');

const RESULTS_DIR = process.env.RESULTS_DIR || 'results';

/**
 * HACK: make it configurable
 *
 * works only with ffmpeg action for now
 */
module.exports = function(project) {
    return new Promise((resolve, reject) => {

        logger.info(`[${project.uid}] uploading the result...`);

        let resultPath = path.join( RESULTS_DIR, project.uid + '_result.mp4' );
        let token = project.settings.token;
        let url = project.settings.resultCallback;

        if (!token || !url) {
            logger.info(`[${project.uid}] project.settings.token or project.settings.resultCallback is not set. skipping...`);
            return resolve(project);
        }

        fs.pathExists(resultPath)
            .then(exists => {
                var form = new FormData();
                form.append('status', 'finished');
                form.append('token', token);
                form.append('result', fs.createReadStream(resultPath));
                form.submit(url, function(err, res) {
                    if (err) {
                        logger.info(`[${project.uid}] upload failed. skipping...`);
                    }
                    else {
                        logger.info(`[${project.uid}] uploaded.`);
                    }
                    return resolve(project);
                });
            })
            .catch((err) => {
                logger.info(`[${project.uid}] result is not found!? skipping...`);
                return resolve(project);
            });
    });
};
