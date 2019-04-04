/**
 * Version: 1.2.22
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
 * @name emp.player.flash
 * @description Initialization of Flash EMP and controls
 *
 *
 * Notes from previous version (V2)
 *
 * 1. Request settings cookie
 * - We get a response
 * 	   Proceed to step 2
 * - We wait and don't get a response
 * 	   Set volume to 100 and proceed to step 2
 *
 * 2. Check if EMP has said it is ready (set a boolean)
 * - It is
 * 	   Pass variables it needs, along with volume from step 1
 * - It's not
 * 	   Wait for the call from the EMP that tells us it is ready.
 * 	   Immediatly return the variables it needs, along with volume from step 1
 *
 * This file calls:
 * The embedded flash emp object flash/RadioplayerEMPv3.swf
 *
 * This file is called by:
 * - emp
 * - controls
 *
 * @authors Gav Richards <gav@gmedia.co.uk>
 * @authors Robin Wilding <robin@wilding.co.uk>
 * @authors Mark Panaghiston <markp@happyworm.com>
 *
 * @class emp.player.flash
 * @module emp
 *
 */


radioplayer.emp.player.flash = {

	ready : false, // Can be set by EMP Object to declare it is ready to receive parameters
	waitingForReady : false,
	swfname: null,

	api: null, // Pointer to the API object
	$api: null, // The api with a jQuery wrapper
	available: false, // True if this solution is viable
	used: false, // True if this solution is being used

	// Note that the following audio media propeties are not maintained past the initial instancing operation.
	audioType : "http", 
	audioUrl : "", 
	audioServer : "", 
	audioEndpoint : "", 
	audioLive : true,

	flashVersion: "10.0.0",

	// Hold the V3 audio definitions - Maintained.
	audioFlash: [],

	init: function(api) {
		this.api = api;
		this.$api = $(api);
	},
	
	/**
	 * Create EMP Object using SWFObject
     *
     * @method createObject
     * @param swfpath
     * @param size
     * @private
	 */
	createObject : function(swfpath, size) {
		var self = this;
		// Embed here using SWFObject
		if(swfpath == null) swfpath = "EMP3.2.1.swf";
		this.swfname = swfpath.split(".swf")[0] ;
		var flashvars = {};
		var params = {
			menu: "false",
			scale: "noScale",
			allowFullscreen: "false",
			allowScriptAccess: "always",
			bgcolor: "0x000000"
		};
		var attributes = {
			id:this.swfname,
			name:this.swfname
		};
		
		if(size == null) size = "0";
		swfobject.embedSWF(
			"flash/"+swfpath,
			this.api.id, size, size, this.flashVersion, 
			null, 
			flashvars, params, attributes, function(e){
				if (e.success == false) {
					// This should never happen, due to check in init() and logic in radioplayer.emp
					self.$api.trigger(self.api.event.noSupport, self.getEventObject());
				}
			});
		
	},
	
	/**
	 * Called either when we receive cookie settings, 
	 * or if that request fails and we proceed anyway with volume set to 100
     *
     * @method dataReady
     * @private
	 */
	dataReady : function() {
		if(this.api.DEBUG) radioplayer.utils.output("flash: Try to initialize the EMP SWF, if it is ready");
		if (this.ready) {
			// EMP is already ready, so pass it variables to begin playing
			if(this.api.DEBUG) radioplayer.utils.output("flash: EMP SWF ALREADY READY");
			this.passParamsToEMP();
		} else {
			// EMP is not ready yet, so start listening for it to call us
			if(this.api.DEBUG) radioplayer.utils.output("flash: EMP SWF NOT READY");
			this.waitingForReady = true;
			// Detect whether the browser has blocked flash player, and if we think it has
			// we want to init the HTML5 player...
			this.waitingTimeout = setTimeout($.proxy(function() {
				if (this.waitingForReady) {
				    this.waitingForReady = false;
					radioplayer.emp.player.ready = false;
					radioplayer.emp.player.flash.available = false;
					radioplayer.emp.player.flash.used = false;
					radioplayer.emp.player.flash.blocked = true;

					radioplayer.emp.setAudioParams(window.audioFlash, window.audioHTML, window.audioLive, window.bufferTime, true);
					radioplayer.emp.dataReady();
				}
			}, this), 1500);
		}
		// When we're done, save all settings back to the cookie ?
		// Not sure if this is necessary
	},
	
	/**
	 * Called by EMP when it is ready to begin accepting variables
	 * Only used if the JS is ready first, before the EMP
	 * This is then used to wait for the EMP and proceed when it is ready
     *
     * @method empReady
     * @private
	 */
	empReady : function() {
		if(this.api.DEBUG) radioplayer.utils.output("flash: EMP SWF REPORTS READY");
		this.ready = true;
		this.api.ready = true;
		this.empswf = document.getElementById(this.swfname);
		this.respondToEmp("empReady");
		if (this.waitingForReady) {
			this.waitingForReady = false;	
			if(this.api.DEBUG) radioplayer.utils.output("flash: EMP SWF is now ready to begin receiving parameters");
			this.passParamsToEMP();
		}
	},
	 
	/**
	 * Set parameters for EMP to use when it is ready
     *
     * @method setParams
     *
     * @param audioType
     * @param audioUrl
     * @param audioServer
     * @param audioEndpoint
     * @param audioLive
     * @param bufferTime
     * @private
     */
	setParams : function(audioType, audioUrl, audioServer, audioEndpoint, audioLive, bufferTime) {
		this.audioType = audioType;
		this.audioUrl = audioUrl;
		this.audioServer = audioServer;
		this.audioEndpoint = audioEndpoint;
		this.audioLive = audioLive;
		this.bufferTime = bufferTime;
	},
	
	/**
	 * Set parameters for EMP to use when it is ready
     *
     * @method setAudioParams
     * @since V3
     *
     * @param audioFlash
     * @param audioLive
     * @param bufferTime
     * @private
     */
	setAudioParams : function(audioFlash, audioLive, bufferTime) {
		this.audioFlash = (audioFlash && audioFlash.length) ? audioFlash : [];
		this.audioLive = audioLive;
		this.bufferTime = bufferTime;
	},
	
	/**
	 * Pass parameters to EMP now that it is ready
     *
     * @method passParamsToEMP
     * @private
	 */
	passParamsToEMP : function() {
		if(this.api.DEBUG) this.empswf.emp_setDebugMode(true); // - advanced Flash EMP debugging
		if(this.api.DEBUG) radioplayer.utils.output("flash: Passing parameters to EMP SWF object");
		
		if (this.audioFlash[0].hasOwnProperty("cacheKiller")) {
			radioplayer.utils.output('Set cache killer to: ' + (this.audioFlash[0].cacheKiller ? 'true' : 'false'));
			this.empswf.emp_setUseCacheKiller(this.audioFlash[0].cacheKiller);
		}

		if (this.audioFlash[0].hasOwnProperty("appendVersion")) {
			radioplayer.utils.output('Set appendVersion to: ' + (this.audioFlash[0].appendVersion ? 'true' : 'false'));
			this.empswf.emp_setAppendVersionToUrl(this.audioFlash[0].appendVersion);
		}

		if(this.audioFlash.length) {
			this.setAudio(this.audioFlash);
		} else if (this.audioType === "rtmp") {
			this.loadRTMPStream(this.audioServer, this.audioEndpoint);
		} else if (this.audioType === "http") {
			this.loadHTTPStream(this.audioUrl);
		} else if (this.audioType === "httpmp4m4a" || this.audioType === "httpaac") {
			this.loadHTTPMP4M4AStream(this.audioUrl);
		} else if (this.audioType === "playlist") {
			this.loadPlaylist(this.audioUrl);
		} else {
			this.$api.trigger(this.api.event.noSupport, this.getEventObject());
		}
		var mode = (this.audioLive ? "live" : "od");
		this.setPlaybackMode(mode);
		this.setVolume(radioplayer.controls.currentVolume);
		this.empswf.emp_setBufferTime(this.bufferTime);
	},

	/**
	 * Set the Audio to play
     *
     * @method setAudio
     * @since V3
     *
     * @param audioFlash
     * @private
     */
	setAudio: function(audioFlash) {
		var self = this,
			audioPicked, audioHigh;

		this.cleanup();

		this.audioFlash = (audioFlash && audioFlash.length) ? audioFlash : [];

		// The Flash should be able to play anything thrown at it, that obeys the V2 EMP system.
		// So taking the first one off the array.

        audioPicked = this.audioFlash.length ? this.audioFlash[0] : false;

		if(audioPicked) {
			this.passSetAudio(audioPicked);
		} else {
			this.$api.trigger(this.api.event.noSupport, this.getEventObject());
		}
	},

	/**
	 * Pass the audio object from the new V3 API to the V2 API commands..
     *
     * @method passSetAudio
     *
     * @param audio
     * @private
     */
	passSetAudio: function(audio) {
		if (audio.audioType === "rtmp") {
			this.loadRTMPStream(audio.audioServer, audio.audioEndpoint);
		} else if (audio.audioType === "http") {
			this.loadHTTPStream(audio.audioUrl);
		} else if (audio.audioType === "httpmp4m4a") {
			this.loadHTTPMP4M4AStream(audio.audioUrl);
		} else if (audio.audioType === "playlist") {
			this.loadPlaylist(audio.audioUrl);
		}
	},

	/**
	 * Allows test runner to test that javascript has recieved events from the swf emp.
     *
     * @method respondToEmp
     *
     * @param message
     * @private
     */
	respondToEmp : function(message) {
		this.empswf.emp_reportResponse(message);
	},
	
	/**
	 * EMP callback event
     *
     * @method empPlaylistLoaded
     * @private
	 */
	empPlaylistLoaded : function() {
		this.respondToEmp("radioplayer.emp.empPlaylistLoaded");
	},
	
	/**
	 * testRunnerRun allows the test runner to trigger js to call a method on the swf api (replaces and automates the old 
	 * "load playlist" button.
     *
     * @method testRunnerRun
     *
     * @param testRunnerRun
     * @private
	 */
	testRunnerRun : function (functionToRun) {
		this[functionToRun]();
	},
	
	/**
	 * Allows for automated test of playlist loading.
     *
     * @method testRunnerLoadPlaylist
     * @private
	 */
	testRunnerLoadPlaylist : function() {
		this.empswf.emp_loadPlaylist("testplaylists/testXSPF.xspf");
	},

	/**
	 * Control API methods
	 */
	
	/* Directly load an RTMP stream with 'server' and 'endpoint' urls */
	loadRTMPStream: function(server, endpoint) {this.empswf.emp_loadRTMPStream(server, endpoint); },
	/* Directly load an HTTP stream from url */
	loadHTTPStream: function(url) {this.empswf.emp_loadHTTPStream(url);},
	/* Directly load Netstreams from url. Supports flv, f4v, mp4, m4a. */
	loadHTTPMP4M4AStream: function(url) {this.empswf.emp_loadHTTPMP4M4AStream(url);},
	/* Load, parse and play the contents in order from the playlist at the url in 'playlistpath' */
	loadPlaylist : function(playlistpath) {this.empswf.emp_loadPlaylist(playlistpath);},
	/* Resume playback after pause. */
	resume : function() {this.empswf.emp_resume();},
	/* Pause playback whil playing. */
	pause : function() {this.empswf.emp_pause();},
	/* Stop playback while playing. */
	stop : function() {this.empswf.emp_stop();},
	/* Resets the EMP. Should be called before reconfiguring via calls to loadRTMPStream, loadHTTPStream, loadHTTPMP4M4AStream or loadPlaylist. */
	cleanup : function() {this.empswf.emp_cleanup();},
	/* Returns the current position of the playhead for the current audio item. */
	getPosition : function() {return this.empswf.emp_getPosition();},
	/* Returns the duration of the current audio item. */
	getDuration : function() {return this.empswf.emp_getDuration();},
	/* Sends the playhead of the current audio item. to 'position' in seconds */
	seek : function(position) {this.empswf.emp_seek(position);},
	/* Set the volume (for the current, and all subsequent audio items). volume can be between 0 and 100 */
	setVolume : function(volume) {this.empswf.emp_setVolume(volume);},
	/* Set the amount of time in seconds that the streams should load into buffer before playing. */
	setBufferTime : function(time) {this.empswf.emp_setBufferTime(time);},
	/* 	Specify the playback mode. Can be 'od' for on demand or 'live' for live streams. 
		If a playlist contains both live and on demand streams: 
			When playbackmode is 'live' all streams will appear live in the controls, even on demand ones
			When playbackmode is 'od' only live streams will appear live in the controls.*/
	setPlaybackMode : function(mode) {this.audioLive = (mode=='live');this.empswf.emp_setPlaybackMode(mode);},
	/* Returns the value of the playback mode.*/
	getPlaybackMode : function() {return (this.audioLive)?"live":"od";},
	/* For Debugging - returns the emp and flash player versions with some basic debugging info. */
	getVersion : function() {return this.empswf.emp_getVersion();},
	/* 	HTTP streams exhibit a flash player bug where the stream data is never freed. 
		Calling memoryreset will swap the stream over to a fresh Sound object, freeing up the memory used. 
		This automatically happens when the emp uses over about 200 Mb of memory, but can by manually called if required. */
	memoryreset : function() {return this.empswf.emp_memoryreset();},
	/*  Set high memory usage limit (bytes, default is 204857600) If the emp uses more than this amount then it'll restart the stream
		Primarily this feature is due to a bug with http streams where memory is never freed.*/
	setMemoryLimit : function(limit) {this.empswf.emp_setMemoryLimit(limit);},
	/*	Set the time taken before a timeout if the stream gets stuck buffering.*/
	setStallTimeout : function(time) {this.empswf.emp_setStallTimeout(time);},
	
	/**
	 * EMP Callbacks.
     *
     * @method reportEMPOutput
     * @param event_as_json
     * @private
	 */
	reportEMPOutput : function(event_as_json) {
		var event = $.parseJSON(event_as_json);
		this.$api.trigger(event.type, event);
	},
	
	/**
	 * EMP Error Reporting.
     *
     * @method reportEMPError
     * @param errorEvent_as_json
     * @private
	 */
	reportEMPError : function(errorEvent_as_json) {
		var event = $.parseJSON(errorEvent_as_json);
		/*
			EMP ERROR CODES:
			
			NETCONNECTION_ASYNC_ERROR:int = 100;
			NETCONNECTION_IO_ERROR:int = 101;
			NETCONNECTION_SECURITY_ERROR:int = 102;
			NETCONNECTION_CONNECT_FAILED:int = 103;
			NETCONNECTION_CONNECT_REJECTED:int = 104;
		*/
		if(event.code === 102) {
			this.$api.trigger(this.api.event.securityError, event);
		} else {
			this.$api.trigger(this.api.event.error, event);
		}
	},

    /**
     * Just used to mirror the HTML EMP. Not used.
     *
     * @method resetAttemptCount
     */
    resetAttemptCount: function() {
        
    },

	/**
	 * Get the event object for JavaScript properties.
	 * NB: The Flash generates its own events, and the event object is not generic.
	 * ie., It only contains what is needed for that event, rather than containing all the info regardless of type.
     *
     * @method getEventObject
     * @private
	 */
	getEventObject: function() {
		return {
			mode: this.audioLive ? "live" : "od"
		};
	}
};