'use strict';

let logger        = require('../logger');

const mkdirp      = require('mkdirp');
const path        = require('path');
const fs          = require('fs-extra');

const TEMPLATES_DIRECTORY   = process.env.TEMPLATES_DIRECTORY   || 'templates';
const TEMP_DIRECTORY        = process.env.TEMP_DIRECTORY        || 'temp';

/**
 * This task creates working directory for current project
 */
module.exports = function(project) {
    return new Promise((resolve, reject) => {

        logger.info(`[${project.uid}] setting up project...`);

        // setup project's workpath
        // we need a way to skip downloading a same project everytime
        // used with settings.clearCache
        let tmpDirName = project.uid;
        if(typeof project.settings.tmpDir !== 'undefined') {
            tmpDirName = project.settings.tmpDir;
        }
        project.workpath   = path.join(TEMP_DIRECTORY,      tmpDirName);

        // set template path && projectname
        let templatepath   = path.join(TEMPLATES_DIRECTORY, project.template);
        let workingProject = path.join(project.workpath,    project.template);

        // create, if it does not exists
        mkdirp.sync(project.workpath);

        // if we have project (template) as an asset
        // we'll donwload it later, skip copying
        for (let asset of project.assets) {
            if (asset.type && ['project', 'template'].indexOf(asset.type) !== -1) {
                return resolve(project);
            }
        }

        // copy project file
        fs.copy(templatepath, workingProject, (err) => {
            return (err) ? reject(err) : resolve(project);
        });
    });
};
