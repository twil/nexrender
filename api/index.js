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
        return reject('Failed to decode response. Status: ' + response.statusCode + '\nResponse: ' + data);
    }

    return data;
}


let wrapper = {
    registered: false,

    /**
     * Configuration for api connections
     * @param  {Object} opts
     */
    config: (opts) => {
        var opts = opts || {};

        let api = opts.api;
        let token = opts.token || null;

        wrapper.registered = router.bind(api, token);
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

                // parse json
                data = _decode_response(data, res, reject);

                // verify
                if (!err && data && data.template && res.statusCode === 200) {
                    return resolve( new Project(data, wrapper) );
                }

                // notify about error
                reject( err || res.statusMessage );
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
                    // parse json
                    data = _decode_response(data, res, reject);

                    // verify || notify about error
                    return (err || res.statusCode !== 200) ? reject(err || res.statusMessage) : resolve( new Project(data, wrapper) );
                });
            } else {

                // return multiple
                router.getAll((err, res, data) => {
                    if (!res || res.statusCode !== 200) return reject( new Error('Error occured during getting list of projects') );

                    // read json
                    let results = [];
                    data = _decode_response(data, res, reject);

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

                // parse json
                data = _decode_response(data, res, reject);

                // verify
                if (!err && data && data.template && res.statusCode === 200) {
                    if (object instanceof Project) {
                        return resolve( object.deserialize(data) );
                    } else {
                        return resolve( new Project(data, wrapper) );
                    }
                }

                // notify about error
                reject( err || res.statusMessage );
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

                // parse json
                data = _decode_response(data, res, reject);

                // verify || notify about error
                return (err || res.statusCode !== 200) ? reject(err || res.statusMessage) : resolve(data);
            });;
        });
    }
};

module.exports = wrapper;
