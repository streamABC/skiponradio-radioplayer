/**
 * Version: 1.2.17
 * 
 * All intellectual property rights in this Software throughout the world belong to UK Radioplayer, 
 * rights in the Software are licensed (not sold) to subscriber stations, and subscriber stations 
 * have no rights in, or to, the Software other than the right to use it in accordance with the 
 * Terms and Conditions at www.radioplayer.co.uk/terms. You shall not produce any derivate works 
 * based on whole or part of the Software, including the source code, for any other purpose other 
 * than for usage associated with connecting to the UK Radioplayer Service in accordance with these 
 * Terms and Conditions, and you shall not convey nor sublicense the Software, including the source 
 * code, for any other purpose or to any third party, without the prior written consent of UK Radioplayer.
 *
 * @name emp
 * @description Audio Engine API for Flash and HTML5 players
 *
 * @authors Mark Panaghiston <markp@happyworm.com>
 *
 * This file calls:
 * @emp.player.flash
 * @emp.player.html
 *
 * This file is called by:
 * @ init
 * @ services
 * @ controls
 *
 * @class emp
 * @module emp
 *
 */

/**
 * Request settings cookie
 * - We get a response
 * 	   call dataReady()
 * - We wait and don't get a response
 * 	   Set volume to 100 and call dataReady()
 */

radioplayer.emp = {

    /**
     * Enable to generate debug information in the console
     *
     * @property DEBUG
     * @final
     * @static
     */
	DEBUG: false,

	player: {}, // For the flash and html players

    /**
     * Set when a player is ready for use
     *
     * @property ready
     * @type boolean
     * @default false
     */
	ready : false,

    /**
     * id of the html element wrapper for the flash/html player
     *
     * @property id
     */
	id: "empv3",

    /**
     * How many times the EMP should attempt to retry a stream that receives an error.
     *
     * Attempts count resets to 0 once the stream successfully plays.
     *
     * @property retryCount
     * @default 5
     * @type int
     */
    retryCount: 5,

    /**
     * HTML5 audio playback is preferred over Flash when set to true 
     *
     * @property preferHtml5Audio
     * @default false
     * @type boolean
     */
    preferHtml5Audio: false,

	/**
	 * Names of the events used by the API.
	 *
     * They have been listed here for clarity and so that you can bind events to,
	 * for example: radioplayer.emp.event.ended
     *
     * *Original Events from Radioplayer EMP V2. These are coded into the Flash and listed here for the HTML to use.*
     *
     * @property event
	 */
	event: {
        /**
         * @event mode
         */
		mode: 'mode',
        /**
         * @event loadProgress
         */
		loadProgress: 'loadProgress',
        /**
         * @event startPlaying
         */
		startPlaying: 'startPlaying',
        /**
         * @event pausePlaying
         */
		pausePlaying: 'pausePlaying',
        /**
         * @event resumed
         */
		resumed: 'resumed',
        /**
         * @event stopped
         */
		stopped: 'stopped',
        /**
         * @event cleanedup
         */
		cleanedup: 'cleanedup',
        /**
         * @event durationSet
         */
		durationSet: 'durationSet',
        /**
         * @event ended
         */
		ended: 'ended',
        /**
         * @event update
         */
		update: 'update',
        /**
         * @event volumeSet
         */
		volumeSet: 'volumeSet',
        /**
         * @event securityError
         */
		securityError: 'securityError',
        /**
         * @event error
         */
		error: 'error',

        /**
         * (error) Occurs when there is no suport for the format trying to be played.
         *
         * @event noSupport
         */
		noSupport: 'noSupport'
	},

    /**
     * Initialise the EMP
     *
     * @method init
     */
	init: function() {

		this.player.html.init(this);
		this.player.flash.init(this);
		this.player.flash.available = swfobject.hasFlashPlayerVersion(this.player.flash.flashVersion);

		// If both are available use this.preferHtml5Audio to choose
		if (this.player.flash.available && this.player.html.available && this.preferHtml5Audio) {

			this.player.html.used = true;
			if(this.DEBUG) radioplayer.utils.output('emp: HTML5 Player Used');

		} else if (this.player.flash.available && this.player.html.available ) {

			this.player.flash.used = true;
			if(this.DEBUG) radioplayer.utils.output('emp: FLASH Player Used');

		} else if (this.player.html.available) {

			this.player.html.used = true;
			if(this.DEBUG) radioplayer.utils.output('emp: HTML5 Player Used');

		} else if (this.player.flash.available) {

			this.player.flash.used = true;
			if(this.DEBUG) radioplayer.utils.output('emp: FLASH Player Used');

		} else { // No player available.

			$(this).trigger(this.event.noSupport, {});
			if(this.DEBUG) radioplayer.utils.output('emp: No Player available for this browser');
		}

		// During dev and testing
		if(this.DEBUG) this.eventInspector();
	},

	/**
	 * Called either when we receive cookie settings, 
	 * or if that request fails and we proceed anyway with volume set to 100
	 */

	dataReady : function() {
		this.solution('dataReady');
	},

    /**
     * A development tool for inspecting the events being generated.
     *
     * @method eventInspector
     */
	eventInspector: function() {
		var self = this;
		
		$.each(this.event, function(name, type) {
			$(self).bind(type, function(event, custom) {
				radioplayer.utils.output('emp: ' + name + ' event: "' + type + '" : %o | custom: %o', event, custom);
			});
		});

	},

	/**
	 * Set parameters for EMP to use when it is ready
     *
     * (V2 API)
     *
     * @param audioType
     * @param audioUrl
     * @param audioServer
     * @param audioEndpoint
     * @param audioLive
     * @param bufferTime
     * @deprecated
     */
	setParams : function(audioType, audioUrl, audioServer, audioEndpoint, audioLive, bufferTime) {
		this.init();
		this.solution('setParams', audioType, audioUrl, audioServer, audioEndpoint, audioLive, bufferTime);
		if(this.player.flash.used) {
			this.player.flash.createObject();
		}
	},

	/**
	 * Set parameters for EMP to use when it is ready
     *
     * @method setAudioParams
     *
     * @param audioFlash
     * @param audioHTML
     * @param audioLive
     * @param bufferTime
     *
     * @since V3
     */
	setAudioParams : function(audioFlash, audioHTML, audioLive, bufferTime, preferHtml5Audio) {

		this.preferHtml5Audio = preferHtml5Audio;
		this.init();

		var usedStream = [];

		if (this.player.flash.used) {
			usedStream = audioFlash;

		} else if (this.player.html.used) {
			usedStream = audioHTML;
		}

		if (typeof usedStream == "undefined" || !usedStream.length) { // If we don't have a suitable stream
			$(this).trigger(this.event.error, {});
		}

		this.solution('setAudioParams', usedStream, audioLive, bufferTime);
		if(this.player.flash.used) {
			this.player.flash.createObject();
		}
	},

    /**
     * @method resetAttemptCount
     */
    resetAttemptCount: function() {
        this.solution('resetAttemptCount');
    },

	/**
     * A helper function to pass commands to the player being used.
	 *
     * @example
     *      this.solution('play')
     *
     * @method solution     *
     * @param method
	 */
	solution: function(method) {
		var args = Array.prototype.slice.call( arguments, 1 ),
			player;
		// Set the pointer to the player being used.
		if(this.player.flash.used) {
			player = this.player.flash;
		} else if(this.player.html.used) {
			player = this.player.html;
		} else {
			// There is no player
			$(this).trigger(this.event.noSupport, {});
		}
		// Execute the player method, passing in the arguments.
		if(player && typeof player[method] === 'function') {
			return player[method].apply(player, args);
		}
	},

	/* 
	 * Control API methods
	 */
	
	/**
     *  Directly load an RTMP stream with 'server' and 'endpoint' urls
     *
     * @method loadRTMPStream
     * @param server
     * @param endpoint
     */
	loadRTMPStream: function(server, endpoint) { this.solution('loadRTMPStream', server, endpoint); },
	/**
     * Directly load an HTTP stream from url
     *
     * @method loadHTTPStream
     * @param url
     */
	loadHTTPStream: function(url) { this.solution('loadHTTPStream', url); },
	/**
     * Directly load Netstreams from url. Supports flv, f4v, mp4, m4a.
     *
     * @method loadHTTPMP4M4AStream
     * @param url
     */
	loadHTTPMP4M4AStream: function(url) { this.solution('loadHTTPMP4M4AStream', url); },
	/**
     * Load, parse and play the contents in order from the playlist at the url in 'playlistpath'
     *
     * @method loadPlaylist
     * @param playlistpath
     */
	loadPlaylist : function(playlistpath) { this.solution('loadPlaylist', playlistpath); },
	/**
     * Resume playback after pause.
     *
     * @method resume
     */
	resume : function() {
	    if (this.ready) {
            this.errorCount = 0;
            this.solution('resume');
        }
	},
	/**
     * Pause playback while playing.
     *
     * @method pause
     */
	pause : function() { this.solution('pause'); },
	/**
     * Stop playback while playing.
     *
     * @method stop
     */
	stop : function() { this.solution('stop'); },
	/**
     * Resets the EMP.
     *
     * *Should be called before reconfiguring via calls to loadRTMPStream, loadHTTPStream, loadHTTPMP4M4AStream or loadPlaylist.*
     *
     * @method cleanup
     */
	cleanup : function() { this.solution('cleanup'); },
	/**
     * Returns the current position of the playhead for the current audio item.
     *
     * @method getPosition
     */
	getPosition : function() {return this.solution('getPosition'); },
	/**
     * Returns the duration of the current audio item.
     *
     * @method getDuration
     */
	getDuration : function() {return this.solution('getDuration'); },
	/**
     * Sends the playhead of the current audio item. to 'position' in seconds
     *
     * @method seek
     * @param position
     */
	seek : function(position) { this.solution('seek', position); },
	/**
     * Set the volume (for the current, and all subsequent audio items). volume can be between 0 and 100
     *
     * @method setVolume
     * @param volume
     */
	setVolume : function(volume) { this.solution('setVolume', volume); },
	/**
     * Set the amount of time in seconds that the streams should load into buffer before playing.
     *
     * @method setBufferTime
     * @param time
     */
	setBufferTime : function(time) { this.solution('setBufferTime', time); },
	/**
     * Specify the playback mode. Can be 'od' for on demand or 'live' for live streams.
	 *
     * > If a playlist contains both live and on demand streams:
	 * >	When playbackmode is 'live' all streams will appear live in the controls, even on demand ones
	 * >	When playbackmode is 'od' only live streams will appear live in the controls.
     */
	setPlaybackMode : function(mode) { this.solution('setPlaybackMode', mode); },
	/**
     * Returns the value of the playback mode.
     *
     * @method getPlaybackMode
     */
	getPlaybackMode : function() {return this.solution('getPlaybackMode'); },
	/**
     * For Debugging - returns the emp and flash player versions with some basic debugging info.
     * @method getVersion
     */
	getVersion : function() {return this.solution('getVersion'); },
	/**
     * HTTP streams exhibit a flash player bug where the stream data is never freed.
	 *	Calling memoryreset will swap the stream over to a fresh Sound object, freeing up the memory used.
	 *	This automatically happens when the emp uses over about 200 Mb of memory, but can by manually called if required.
     *
     * @method memoryreset
     */
	memoryreset : function() {return this.solution('memoryreset'); },
	/**
     * Set high memory usage limit (bytes, default is 204857600) If the emp uses more than this amount then it'll restart the stream
	 *	Primarily this feature is due to a bug with http streams where memory is never freed.
     *
     * @method setMemoryLimit
     * @param limit
     */
	setMemoryLimit : function(limit) { this.solution('setMemoryLimit', limit); },
	/**
     * Set the time taken before a timeout if the stream gets stuck buffering.
     *
     * @method setStallTimeout
     * @param time
     */
	setStallTimeout : function(time) { this.solution('setStallTimeout', time); }
};