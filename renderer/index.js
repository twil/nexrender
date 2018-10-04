'use strict';

// can be overrided in test
let api             = require('../api');

let logger          = require('./logger');

const setup         = require('./tasks/setup');
const download      = require('./tasks/download');
const rename        = require('./tasks/rename');
const filter        = require('./tasks/filter');
const patch         = require('./tasks/patch');
const render        = require('./tasks/render');
const verify        = require('./tasks/verify');
const actions       = require('./tasks/actions');
const ffmpeg        = require('./tasks/ffmpeg');
const uploadResult  = require('./tasks/upload_result');
const cleanup       = require('./tasks/cleanup');

const Project       = require('../api/models/project');

const API_REQUEST_INTERVAL = process.env.API_REQUEST_INTERVAL || 15 * 60 * 1000; // 15 minutes

/**
 * Apply tasks one by one
 * Each task is applied only once, after previous is finished
 * @param  {Project} project
 * @param  {Function} resolve
 * @param  {Function} reject
 */
function applyTasks(project, resolve, reject) {

    // TODO: make this ugly motherfucker
    // down below look nicer :D
    project
        .prepare()
        .then(setCurrentAction('setup'))
        .then(setup)
        .then(setCurrentAction('download'))
        .then(download)
        .then(setCurrentAction('rename'))
        .then(rename)
        .then(setCurrentAction('filter'))
        .then(filter)
        .then(setCurrentAction('patch'))
        .then(patch)
        .then(setCurrentAction('render'))
        .then(render)
        .then(setCurrentAction('verify'))
        .then(verify)
        .then(setCurrentAction('ffmpeg'))
        .then(ffmpeg)
        .then(setCurrentAction('uploadResult'))
        .then(uploadResult)
        //.then(setCurrentAction('actions'))
        //.then(actions)
        .then(setCurrentAction('cleanup'))
        .then(cleanup)
        .then(setCurrentAction('done'))
        .then((project) => {

            logger.info('----------------------------');
            logger.info(`[${project.uid}] project finished`);
            logger.info('----------------------------\n');

            // project is finished
            project.finish().then(() => {
                resolve(project);
            });
        })
        .catch((err) => {

            logger.info('--------------------------');
            logger.info(`[${project.uid}] project failed`);
            logger.info('--------------------------\n');

            logger.info('Error message:', err.message || err);

            // just in case
            let updateCurrentAction = false;
            cleanup(project, updateCurrentAction);

            // project encountered an error
            project.failure(err).then(() => {
                reject(err, project);
            })
        });
};

/**
 * Save some progress
 *
 * TODO: project.setCurrentActionAndSave might fail
 */
function setCurrentAction(action) {
    return function(project) {
        return new Promise((resolve, reject) => {
            project.setCurrentActionAndSave(action)
            .then(() => {
                logger.info("Project.currentAction == " + action);
                resolve(project);
            })
            .catch(() => {
                logger.info("Failed to set Project.currentAction == " + action);
                resolve(project);
            });
        });
    }
}

/**
 * Requests list of all projects
 * iterate over each and return first one that is state as 'queued'
 * @return {Promise}
 */
function requestNextProject() {
    return new Promise((resolve, reject) => {

        logger.info('making request for projects...');

        // request list
        api.get().then((results) => {

            logger.info('looking for suitable projects...');

            // if list empty - reject
            if (!results || results.length < 1) {
                return reject();
            }

            // iterate, find queued
            for (let project of results) {
                if (project.state === 'queued') {
                    return resolve( project );
                }
            }

            // if not found - reject
            return reject();

        // if error - reject
        }).catch(reject);
    });
}

/**
 * Requests next project
 * if project is found - starts rendering
 * after that restarts process again
 * but if project is not found - sets timeout
 * to request again after API_REQUEST_INTERVAL
 */
function startRecursion() {
    requestNextProject().then((project) => {
        startRender(project).then(startRecursion).catch(startRecursion)
    }).catch(() => {
        logger.info('request failed or no suitable projects found. retrying in:', API_REQUEST_INTERVAL, 'msec');
        setTimeout(() => { startRecursion() }, API_REQUEST_INTERVAL);
    });
}

/**
 * Start automated requesting projects and rendering them
 * @param  {Object} opts Options object
 */
function start(opts) {
    logger.info('=========[RENDERNODE]=========\n')
    logger.info('nexrender.renderer is starting\n');
    logger.info('------------------------------');

    opts = opts || {};

    // configure api connection
    api.config({
        host: opts.host || null,
        port: opts.port || null,
        token: opts.token || null,
    });

    // set global aerender path
    process.env.AE_BINARY       = opts.aerender     || '';
    process.env.AE_MULTIFRAMES  = opts.multiframes  || '';
    process.env.AE_MEMORY       = opts.memory       || '';
    process.env.AE_LOG          = opts.log          || '';

    // start quering
    startRecursion();
}

/**
 * Start project rendering and return promise
 * @param  {Project} project
 * @return {Promise}
 */
function startRender(project) {
    return new Promise((res, rej) => {
        return applyTasks(project, res, rej);
    });
}

module.exports = {
    start: start,

    /**
     * Local project model renderer method wrapper
     *
     * @param  {string} binary  path to Adobe After Effects aerender binary
     * @param  {Array} opts    optional options array
     * @param  {Project} project project model
     * @return {Promise} rendering promise
     */
    render: (binary, opts, project) => {
        // parameters validation
        if (typeof binary !== 'string') {
            throw new Error('nexrender.renderer.render: first argument must be a string, pointing to "aerender" binary');
        }

        if (!project && opts instanceof Project) {
            project = opts;
            opts    = {};
        }

        if (!project && !opts instanceof Project) {
            throw new Error('nexrender.renderer.render: second optional argument is options, third required is a Project ');
        }

        // set up default global constatns
        process.env.AE_BINARY       = binary            || '';
        process.env.AE_MULTIFRAMES  = opts.multiframes  || '';
        process.env.AE_MEMORY       = opts.memory       || '';
        process.env.AE_LOG          = opts.log          || '';

        // return promise and start rendering
        return startRender(project);
    }
};
