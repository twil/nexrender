'use strict';

let logger     = require('../logger');

const download = require('download');
const mkdirp   = require('mkdirp');
const fs       = require('fs-extra');
const path     = require('path');
const AWS      = require('aws-sdk');
const url      = require('url');
const crypto   = require('crypto');
const util     = require('util');

const move = util.promisify(fs.move);

// TODO: remove?
const CACHE_DIR = process.env.CACHE_DIR || 'cache';

// Don't cache this assets
const DONT_CACHE_ASSET_TYPES = ['project', 'script', 'data', 'dontcache'];


function isLocalPath(src) {
    return src.indexOf('http://') === -1 && src.indexOf('https://') === -1;
}

function copy(src, dstDir) {
    return new Promise((resolve, reject) => {
        const dstPath = path.join(dstDir, path.basename(src));
        fs.copy(src, dstPath, (err) => {
            return (err ? reject(`Failed to copy ${src}: ${err}`) : resolve());
        });
    });
}

function moveFile(src, dst) {
    if(src == dst) {
        return true;
    }
    if(fs.existsSync(dst)) {
        fs.removeSync(dst);
    }
    return move(src, dst);
}

function downloadFromS3(bucket, key, dstDir, dstName) {
    var s3 = new AWS.S3();
    var params = {Bucket: bucket, Key: key};
    var file = fs.createWriteStream(path.join(dstDir, dstName));
    return new Promise((resolve, reject) => {
        file.on('close', function(){
            resolve();
        });
        s3.getObject(params).createReadStream().on('error', function(err) {
            reject(`Failed to get ${key} from bucket ${bucket}: ${err}`);
        }).pipe(file);
    });
}

/**
 * This task is used to download every asset in the "project.asset"
 */
module.exports = function(project) {
    return new Promise((resolve, reject) => {

        logger.info(`[${project.uid}] downloading assets...`);

        mkdirp.sync(CACHE_DIR);

        // iterate over each asset to check for custom template
        for (let asset of project.assets) {
            // check for custom template
            if (asset.type === 'project') {
                project.template = asset.name;
            }
        }

        let headers = {};
        if(project.api && project.api.token) {
            headers['X-Authorization'] = 'token ' + project.api.token;
        }

        // iterate over each asset and download it (copy it)
        Promise.all(project.assets.map((asset) => {
            // we need a way to skip downloading a same project everytime
            // used with settings.clearCache.
            let src = path.join( project.workpath, path.basename(url.parse(asset.src).pathname));
            let dst = path.join( project.workpath, asset.name );
            if(fs.existsSync(dst) &&
               DONT_CACHE_ASSET_TYPES.indexOf(asset.type) === -1) {
                return true;
            }

            if (asset.type === 's3') {
                return downloadFromS3(asset.bucket, asset.key, project.workpath, path.basename(url.parse(asset.src).pathname))
                .then(() => {
                    return moveFile(src, dst);
                });
            } else if (asset.type === 'url' || !isLocalPath(asset.src)) {
                return download(asset.src, project.workpath, {
                    retry: 3,
                    headers: headers
                })
                .then(() => {
                    return moveFile(src, dst);
                })
                .catch((err) => {
                    throw `Failed to download ${asset.src}: ${err}`;
                });
            } else if (asset.type === 'path' || isLocalPath(asset.src)) {
                return copy(asset.src, project.workpath)
                .then(() => {
                    return moveFile(src, dst);
                });
            }
        })).then(() => {
            return resolve(project);
        }).catch((err) => {
            return reject(err);
        });

    });
};
