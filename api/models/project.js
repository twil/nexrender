'use strict';

const shortid = require('shortid');
let logger    = require('../../renderer/logger');

const DEFAULT_STATE         = 'queued';
const DEFAULT_TEMPLATE      = 'template.aep';
const DEFAULT_COMPOSITION   = 'comp1';
const DEFAULT_PROJECT_TYPE  = 'default';

const TICKER_INTERVAL       = 60 * 1000 || process.env.API_UPDATE_INTERVAL; // 1 minute

const AE_OUTPUT_MODULE      = process.env.AE_OUTPUT_MODULE || 'h264';
const AE_OUTPUT_EXT         = 'mp4';


class Project {

    /**
     * Creates project entity from params
     * @param  {Object}
     * @param  {Object} api Inject connected api
     * @return {Project}
     */
    constructor(params, api) {
        this.deserialize( params );

        this.callbacks  = {};
        this.ticker     = null;
        this.api        = api || null;
        this.error      = null;
    }

    /**
     * Serialize project properties to plain object
     * @return {Object}
     */
    serialize() {
        return {
            uid:            this.uid,
            type:           this.type,
            state:          this.state,
            assets:         this.assets,
            ffmpeg:         this.ffmpeg,
            template:       this.template,
            settings:       this.settings,
            composition:    this.composition,
            actions:        this.actions,
            errorMessage:   this.errorMessage
        };
    }

    /**
     * Desirialize data from plain object to Project object
     * @param  {Object} params
     */
    deserialize(params) {
        let data            = params            || {};

        this.uid            = data.uid          || shortid();
        this.state          = data.state        || DEFAULT_STATE;
        this.template       = data.template     || DEFAULT_TEMPLATE;
        this.composition    = data.composition  || DEFAULT_COMPOSITION;
        this.type           = data.type         || DEFAULT_PROJECT_TYPE;
        this.assets         = data.assets       || [];
        this.ffmpeg         = data.ffmpeg       || [];
        this.actions        = data.actions      || [];
        this.settings       = data.settings     || { outputModule: AE_OUTPUT_MODULE, outputExt: AE_OUTPUT_EXT };
        this.errorMessage   = data.errorMessage || null;

        return this;
    }

    /**
     * Sets project state
     * @private
     * @param {String} state
     */
    setStateAndSave(state) {
        return new Promise((resolve, reject) => {
            // chage state
            this.state = state;

            // call inner method (for project entity created on renderer side)
            this.callMethod( state );

            // save entity and resolve promise
            return this.save().then(() => {
                resolve(this);
            })
        });
    }

    /**
     * Sets project's current action
     *
     * Log action changes and times and more.
     * TODO: rename
     *
     * @private
     * @param {String} action
     */
    setCurrentActionAndSave(action) {
        let startTime = this.startTime || Date.now();
        let timeSpent = Date.now() - startTime;

        // init new log
        if(action === 'setup') {
            this.actionsLog = [];
        }
        else {
            this.actionsLog.push({
                action: this.currentAction,
                timeSpent: timeSpent - this.timeSpent
            });
        }

        this.timeSpent = timeSpent;
        this.currentAction = action;

        let data = {
            uid: this.uid,
            currentAction: this.currentAction,
            timeSpent: timeSpent,
            actionsLog: this.actionsLog
        };

        // save entity and return promise
        return (this.api !== null) ? this.api.update(data) : new Promise(r => r());
    }

    /**
     * Sets state of project to 'rendering' (render started)
     * @return {Promise}
     */
    prepare() {
        return this.setStateAndSave('rendering');
    }

    /**
     * Sets state of project to 'finished' (render succeeded)
     * @return {Promise}
     */
    finish() {
        return this.setStateAndSave('finished');
    }

    /**
     * Sets state of project to 'error' (render failed)
     * @param {Mixed} err
     * @return {Promise}
     */
    failure(err) {
        this.errorMessage = (err.message) ? err.message : err;;
        return this.setStateAndSave('failed');
    }

    /**
     * Function get called every TICKER_INTERVAL
     * to check project state on server
     */
    onTick() {
        if (this.api === null) return;

        this.api.get(this.uid).then((project) => {
            if (this.state !== project.state) {
                this.deserialize( project );
                this.callMethod( project.state );
            }
        }).catch((err) => {
            // TODO: failed to get project from server or other error.
            logger.warn(`Failed to sync project ${this.uid} with server: ${err}`);
        });
    }

    /**
     * Binding for api update method
     * @return {Promise}
     */
    save() {
        return (this.api !== null) ? this.api.update(this) : new Promise(r => r());
    }

    /**
     * Binding for api remove method
     * @return {Promise}
     */
    remove() {
        return (this.api !== null) ? this.api.remove(this) : new Promise(r => r());
    }

    /**
     * Binder for events
     * @param  {String}   method   Event name
     * @param  {Function} callback Event handelr
     * @return {[type]}            [description]
     * TODO: get rid of setInterval memory leaking
     */
    on(method, callback) {
        if (!this.ticker && this.api !== null) {
            this.ticker = setInterval(() => { this.onTick(); }, TICKER_INTERVAL);
        }

        if (this.callbacks[method]) {
            return this.callbacks[ method ].push( callback );
        }

        return this.callbacks[ method ] = [ callback ]
    }

    /**
     * Event caller
     * @param  {String} method Event name
     */
    callMethod(method) {
        if (this.callbacks[method]) {
            for (let callback of this.callbacks[method]) {
                callback( this.errorMessage, this);
            }
        }
    }
}

module.exports = Project;
