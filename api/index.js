'use strict';

const assert    = require('assert');

// enable overriding
let router    = require('./routers/project');
let Project   = require('./models/project');


/**
 * Get json or reject promise
 */
function _decode_response(data, response, reject) {
    try {
        if (typeof data === 'string') {
            data = JSON.parse(data);
        }
    }
    catch(e) {
        reject('Failed to decode response. Status: ' + response.statusCode + '\nResponse: ' + data);
        return false;
    }

    return data;
}


let wrapper = {
    registered: false,
    api: null,
    token: null,

    /**
     * Configuration for api connections
     * @param  {Object} opts
     */
    config: (opts) => {
        var opts = opts || {};

        wrapper.api = opts.api;
        wrapper.token = opts.token || null;

        wrapper.registered = router.bind(wrapper.api, wrapper.token);
    },

    /**
     * Creates new Project object, saves to server's database
     * @param  {Object} data  Plain object for project
     * @return {Promise}
     */
    create: (data) => {

        // return promise
        return new Promise((resolve, reject) => {
            if (!wrapper.registered) return reject(new Error('[error] call config method first'));

            // setup default params
            data = data || {};

            // check for emptiness plain values
            try {
                assert( data.template );
                assert( data.composition );
            } catch (err) {
                return reject(new Error('[error] provide project properties'));
            }

            // and arrays
            data.assets      = data.assets      || [];
            data.settings    = data.settings    || {};
            data.actions     = data.actions     || [];

            // request creation
            router.create(data, (err, res, data) => {
                if(err || res.statusCode !== 200) {
                    return reject('Failed to create project: ' + (err || res.statusMessage));
                }

                // parse json
                data = _decode_response(data, res, reject);

                // verify
                if (data && data.template) {
                    return resolve( new Project(data, wrapper) );
                }

                if(data === false) {
                    // already rejected!!!
                    // TODO: strange call
                }

            });
        });
    },

    /**
     * Get single or multiple entities of Project
     * @optional @param {Number} id
     * @return {Promise}
     */
    get: (id) => {
        // return promise
        return new Promise((resolve, reject) => {
            if (!wrapper.registered) return reject(new Error('[error] call config method first'));

            // if id provided
            if (id) {
                // return single
                router.get(id, (err, res, data) => {
                    if(err || res.statusCode !== 200) {
                        return reject("Failed to get project ID " + id + ". " + (err || res.statusMessage));
                    }

                    // parse json
                    data = _decode_response(data, res, reject);
                    if(data === false) {
                        // TODO: already rejected
                        return;
                    }

                    // verify
                    return resolve( new Project(data, wrapper) );
                });
            } else {

                // return multiple
                router.getAll((err, res, data) => {
                    if (!res || res.statusCode !== 200) return reject( new Error('Error occured during getting list of projects') );

                    // read json
                    let results = [];
                    data = _decode_response(data, res, reject);

                    if(data === false) {
                        //TODO: already rejected
                        return;
                    }

                    // iterate and create objects
                    for (let obj of data) {
                        results.push( new Project( obj, wrapper ) );
                    }

                    resolve(results);
                });
            }
        });
    },

    /**
     * Update object on server
     * @param  {Object || Project} object
     * @return {Promise}
     */
    update: (object) => {
        let uobj = object;

        if (object instanceof Project) {
            uobj = object.serialize();
        }

        return new Promise((resolve, reject) => {
            if (!wrapper.registered) return reject(new Error('[error] call config method first'));

            router.update(object.uid, uobj, (err, res, data) => {
                if(err || res.statusCode !== 200) {
                    return reject("Failed to update project ID " + object.uid);
                }

                // parse json
                data = _decode_response(data, res, reject);

                // verify
                if (data && data.template) {
                    if (object instanceof Project) {
                        return resolve( object.deserialize(data) );
                    } else {
                        return resolve( new Project(data, wrapper) );
                    }
                }

                // notify about error
                // TODO: already rejected
                //reject( err || res.statusMessage );
            });
        });
    },

    /**
     * Remove object from server
     * @param  {Number} id project uid
     * @return {Promise}
     */
    remove: (id) => {
        return new Promise((resolve, reject) => {
            if (!wrapper.registered) return reject(new Error('[error] call config method first'));

            router.remove(id, (err, res, data) => {
                if(err || res.statusCode !== 200) {
                    return reject("Failed to remove project ID " + id + ". " + (err || res.statusMessage))
                }

                // parse json
                data = _decode_response(data, res, reject);

                if(data === false) {
                    //TODO: already rejected
                    return;
                }

                // verify || notify about error
                return resolve(data);
            });;
        });
    }
};

module.exports = wrapper;
