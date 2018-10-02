'use strict';

const request = require('request');

let API_URL = 'http://localhost:3000/api/';
let API_TOKEN = '';
let API_HEADERS = {};

module.exports = {

    /**
     * Binder for remembering api server host and port
     * @param  {String} host remote api server host
     * @param  {Number} port remote api server port
     * @return {Bool}
     */
    bind: function (host, port, token) {
        API_URL = ['http://', host, ':', port, '/api/projects/'].join('');
        if(token){
            API_TOKEN = token;
            API_HEADERS = {
                'X-Authorization: token ' + token;
            };
        }
        return true;
    },

    /**
     * Wrapper for create
     * @param  {Object}   data   serialized project
     * @param  {Function} callback
     */
    create: function(data, callback) {
        request({
            url: API_URL,
            method: 'POST',
            headers: API_HEADERS,
            json: data
        }, callback);
    },

    /**
     * Wrapper for get (single)
     * @param  {Number}   id     project uid
     * @param  {Function} callback
     */
    get: function(id, callback) {
        request({
            url: API_URL + id + '/',
            method: 'GET',
            headers: API_HEADERS
        }, callback);
    },

    /**
     * Wrapper for get (multiple)
     * @param  {Function} callback
     */
    getAll: function(callback) {
        request({
            url: API_URL,
            method: 'GET',
            headers: API_HEADERS
        }, callback);
    },

    /**
     * Wrapper for update
     * @param  {Number}   id     project uid
     * @param  {Object}   data   serialized project
     * @param  {Function} callback
     */
    update: function(id, data, callback) {
        request({
            url: API_URL + id + '/',
            method: 'PUT',
            headers: API_HEADERS,
            json: data
        }, callback);
    },

    /**
     * Wrapper for remove
     * @param  {Number}   id     project uid
     * @param  {Function} callback
     */
    remove: function(id, callback) {
        request({
            url: API_URL + id + '/',
            method: 'DELETE',
            headers: API_HEADERS
        }, callback);
    }
};
