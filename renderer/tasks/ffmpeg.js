'use strict';

let logger          = require('../logger');

const child_process = require('child_process');
const fs            = require('fs-extra');
const path          = require('path');
const async         = require('async');

const FFMPEG = process.env.FFMPEG_BINARY || 'c:/ffmpeg/bin/ffmpeg.exe';
const RESULTS_DIR = process.env.RESULTS_DIR || 'results';

// add ability to override
let spawn = child_process.spawn;

/**
 * HACK: make it configurable
 */
module.exports = function(project) {
    return new Promise((resolve, reject) => {

        logger.info(`[${project.uid}] postprocess with ffmpeg...`);

        if(!project.settings.ffmpeg) {
            logger.info(`[${project.uid}] no ffmpeg rules. skipping...`);
            return resolve(project);
        }

        //let source = path.join( RESULTS_DIR, project.uid + '_' + project.resultname );
        let source = path.join( project.workpath, project.resultname );
        let destination = path.join( RESULTS_DIR, project.uid + '_result.mp4' );

        async.eachSeries(project.settings.ffmpeg, function(rule, callback) {
            rule.unshift('-y');
            for(let i = 0; i < rule.length; i++) {
                rule[i] = rule[i].replace('%SOURCE%', source).replace('%RESULT%', destination);
            }

            // spawn process and begin rendering
            let ffmpeg = spawn(FFMPEG, rule);

            let ffmpegdata = [];

            ffmpeg.on('error', (err) => {
                return callback(new Error('Error starting ffmpeg process, did you set up the path correctly?'));
            });

            // on data (logs)
            ffmpeg.stdout.on('data', (data) => {
                ffmpegdata.push(data.toString());
            });

            // on error (logs)
            ffmpeg.stderr.on('data', (data) => {
                ffmpegdata.push(data.toString());
            });

            // on finish (code 0 - success, other - error)
            ffmpeg.on('close', (code) => {
                if (code !== 0) {
                  return callback( ffmpegdata.join('') );
                }
            });
        }, function(err) {
            if(err) {
                return reject(err);
            }

            fs.remove( source, (err) => {
                logger.info(`[${project.uid}] cleaning up original...`);
                return (err) ? reject(err) : resolve(project);
            })
        });
    });
};
