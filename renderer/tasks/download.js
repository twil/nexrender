'use strict';

let logger     = require('../logger');

const download = require('download');
const mkdirp   = require('mkdirp');
const fs       = require('fs-extra');
const path     = require('path');
const AWS      = require('aws-sdk');
const url      = require('url');
const crypto   = require('crypto');

const CACHE_DIR = process.env.CACHE_DIR || 'cache';


function isLocalPath(src) {
    return src.indexOf('http://') === -1 && src.indexOf('https://') === -1;
}

function copy(src, dstDir) {
    return new Promise((resolve, reject) => {
        const dstPath = path.join(dstDir, path.basename(src));
        fs.copy(src, dstPath, (err) => {
            return (err ? reject(err) : resolve());
        });
    });
}

/**
 * Check for asset.md5 hash and if present - save to a cache
 */
function downloadWithCache(asset, dst) {
    let cacheDst = CACHE_DIR;
    let fileName = path.basename(url.parse(asset.src).pathname);
    let cacheFile = path.join(cacheDst, fileName);

    // download
    let downloadFunc = function(resolve, reject) {
        download(asset.src, cacheDst, {
            retry: 3//,
            //timeout: 120 * 1000 // 2 minutes
        })
        .then(() => {
            return copy(cacheFile, dst);
        })
        .then(() => {
            return resolve();
        })
        .catch((err) => {
            return reject(err);
        });
    };

    // download
    if(typeof asset.md5 === 'undefined' || !fs.existsSync(cacheFile)) {
        return new Promise((resolve, reject) => {
            downloadFunc(resolve, reject);
        });
    }
    // check cache
    else {
        return new Promise((resolve, reject) => {
            let hash = crypto.createHash('md5');
            let stream = fs.createReadStream(cacheFile);

            stream.on('data', function(data) {
                hash.update(data, 'utf8');
            })

            stream.on('end', function() {
                let h = hash.digest('hex');

                // hit
                if(asset.md5 == h) {
                    copy(cacheFile, dst)
                    .then(() => {
                        return resolve();
                    })
                    .catch((err) => {
                        return reject(err);
                    });
                }
                // not hit
                else {
                    downloadFunc(resolve, reject);
                }
            })

            stream.on('error', function(error) {
                downloadFunc(resolve, reject);
            })
        });
    }
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
            reject(err);
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

        // iterate over each asset and download it (copy it)
        Promise.all(project.assets.map((asset) => {
            if (asset.type === 's3') {
                return downloadFromS3(asset.bucket, asset.key, project.workpath, path.basename(url.parse(asset.src).pathname));
            } else if (asset.type === 'url' || !isLocalPath(asset.src)) {

                // we need a way to skip downloading a same project everytime
                // used with settings.clearCache.
                let fileName = path.basename(url.parse(asset.src).pathname);
                let filePath = path.join(project.workpath, fileName);
                if(fs.existsSync(filePath)) {
                    return true;
                }

                return download(asset.src, project.workpath, {
                    retry: 3//,
                    //timeout: 120 * 1000 // 2 minutes
                });

                // return downloadWithCache(asset, project.workpath);
            } else if (asset.type === 'path' || isLocalPath(asset.src)) {
                return copy(asset.src, project.workpath);
            }
        })).then(() => {
            return resolve(project);
        }).catch((err) => {
            return reject(err);
        });

    });
};
