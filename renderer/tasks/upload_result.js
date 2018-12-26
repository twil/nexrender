'use strict';

let logger          = require('../logger');

const fs            = require('fs-extra');
const path          = require('path');
const async         = require('async');
const FormData      = require('form-data');
const parseUrl      = require('url').parse;

const RESULTS_DIR = process.env.RESULTS_DIR || 'results';

/**
 * HACK: make it configurable
 *
 * works only with ffmpeg action for now
 *
 * TODO: add project setting to skip this action. might be nice to have mandatory and optional tasks.
 */
module.exports = function(project) {
    return new Promise((resolve, reject) => {

        logger.info(`[${project.uid}] uploading the result...`);

        let resultPath = path.join( RESULTS_DIR, project.uid + '_result.mp4' );
        let token = project.settings.token;
        let url = project.settings.resultCallback;

        if (!token || !url) {
            let message = `project.settings.token or project.settings.resultCallback is not set.`;
            logger.warn(`[${project.uid}] ${message}`);
            return reject(message);
        }

        fs.pathExists(resultPath)
            .then(exists => {
                if(!exists) {
                    logger.warn(`[${project.uid}] upload failed. result is not found!?`);
                    return reject('upload failed. result is not found!?');
                    //return resolve(project);
                }

                var form = new FormData();
                // be compliant with the project code
                form.append('state', 'finished');
                form.append('status', 'finished');
                form.append('token', token);
                form.append('result', fs.createReadStream(resultPath));

                // prepare params
                let params = parseUrl(url);
                let options = {
                    protocol: params.protocol,
                    host: params.hostname,
                    port: params.port,
                    path: params.pathname,
                    headers: {
                        'X-Authorization': 'token ' + token
                    }
                };

                logger.info(`[${project.uid}] uploading to: ${url}`);

                form.submit(options, function(err, res) {
                    let errors = ''
                    if(res && (res.statusCode < 200 || res.statusCode >= 300)) {
                        let message = `upload failed. code: ${res.statusCode}. message: ${res.statusMessage}`;
                        logger.error(`[${project.uid}] ${message}`);
                        errors += message;
                    }
                    if (err) {
                        let message = `upload failed. error: ${err}`;
                        logger.error(`[${project.uid}] ${message}`);
                        errors += message;
                    }
                    else {
                        logger.info(`[${project.uid}] uploaded.`);
                    }
                    
                    return errors ? reject(errors) : resolve(project);
                });
            })
            .catch((err) => {
                let message = `upload failed. result is not found!? error: ${err}`;
                logger.warn(`[${project.uid}] ${message}`);
                return reject(message);
                //return resolve(project);
            });
    });
};
