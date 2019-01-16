'use strict';

const assert    = require('assert');

// enable overriding
let router    = require('./routers/project');
let Project   = require('./models/project');


/**
 * Get json
 */
function _decode_response(data) {
    if (typeof data === 'string') {
        data = JSON.parse(data);
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

                try {
                    data = _decode_response(data);
                }
                catch(e) {
                    return reject("Failed to create project: " + e);
                }

                // verify
                if (data && data.template) {
                    return resolve( new Project(data, wrapper) );
                }

                reject('Failed to create project: ???');
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

                    try {
                        data = _decode_response(data);
                    }
                    catch(e) {
                        return reject("Failed to get project ID " + id + ": " + e);
                    }

                    return resolve( new Project(data, wrapper) );
                });
            } else {

                // return multiple
                router.getAll((err, res, data) => {
                    if (!res || res.statusCode !== 200) return reject( new Error('Error occured during getting list of projects') );

                    try {
                        data = _decode_response(data);
                    }
                    catch(e) {
                        return reject("Failed to get projects list: " + e);
                    }

                    // iterate and create objects
                    let results = [];
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
                    return reject("Failed to update project ID " + object.uid + ". Err: " + err + ". Status: " + res.statusCode);
                }

                try {
                    data = _decode_response(data);
                }
                catch(e) {
                    return reject("Failed to update project ID " + object.uid + ": " + e);
                }

                // verify
                if (data && data.template) {
                    if (object instanceof Project) {
                        return resolve( object.deserialize(data) );
                    } else {
                        return resolve( new Project(data, wrapper) );
                    }
                }

                // notify about error
                reject("Failed to update project ID " + object.uid + ": ???");
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

                try {
                    data = _decode_response(data);
                }
                catch(e) {
                    return reject("Failed to remove project ID " + id + ": " + e);
                }

                return resolve(data);
            });;
        });
    }
};

module.exports = wrapper;
