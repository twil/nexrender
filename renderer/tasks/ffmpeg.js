'use strict';

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

        console.info(`[${project.uid}] postprocess with ffmpeg...`);

        let source = path.join( RESULTS_DIR, project.uid + '_' + project.resultname );
        let destination = path.join( RESULTS_DIR, project.uid + '_result.mp4' );

        // setup parameters
        let params = [];
        params.push('-y');
        params.push('-i', source);
        params.push('-r', '30');
        params.push(destination)

        // spawn process and begin rendering
        let ffmpeg = spawn(FFMPEG, params);

        let ffmpegdata = [];

        ffmpeg.on('error', (err) => {
            return reject(new Error('Error starting ffmpeg process, did you set up the path correctly?'));
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
              return reject( ffmpegdata.join('') );
            }

            fs.remove( source, (err) => {
                console.info(`[${project.uid}] cleaning up original...`);
                return (err) ? reject(err) : resolve(project);
            })
        });
    });
};
