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
 * @name emp.player.html
 * @description HTML5 Media Player
 *
 * The HTML player is a fallback for the flash player,
 * hence all the function naming, events and operation revolves around the flash player.
 *
 * @authors Mark Panaghiston <markp@happyworm.com>
 *
 * This file calls:
 * None
 *
 * This file is called by:
 * @ emp
 * @ controls
 *
 * @class emp.player.html
 * @module emp
 *
 */

radioplayer.emp.player.html = {
	
	version: "1.0 of the HTML5 Audio player for EMP V3",

	ready : false, // Flag for when ready to receive commands
	available: false, // Flag for this solution being viable
	used: false, // Flag for this solution being used

	supported : false, // Flag for browser supporting the format being played
	monitoring: false, // Flag for monitoring live stream connections.
	disconnected: true, // Flag for live streams while paused. (Init of true, since nothing connected.)

	firstConnection: true, // Flag for when new audio is connected the first time. Used to generate events.
	ignoringCommands: /(iphone|ipad|ipod|android|blackberry|playbook|windows phone)/i.test(navigator.userAgent), // Flag for init where mobile devices ignore commands until user gives one.
	seekTimeoutId: null, // Stores the seek timeout ID. (Rare case when set OD audio and seek immediately afterwards.)

	stallTime: 5000, // In milliseconds. Error use half this time. Minimum limited to 2000
	stallTimeoutId: null, // Stores the stall timeout ID
	errorTimeoutId: null, // Stores the erro timeout ID
    errorCount: 0,

	api: null, // Pointer to the API object
	$api: null, // The api with a jQuery wrapper

	autoplay: true, // Attempt to autoplay when setting audio. More for development and testing.

	duration: 0, // Fix the durationchange event in iOS. Stores the duration for comparison.

	// Note that the following audio media propeties are not maintained past the initial instancing operation.
	audioType : "http", 
	audioUrl : "", // (Maintained) Holds the audio URL being used.
	audioServer : "", // n/a
	audioEndpoint : "", // n/a
	audioLive : true,

	// Hold the V3 audio definitions - Maintained.
	audioHTML: [],
	/**
	 * Object defining the formats to check for support.
	 * Enabling mutiple type checks per format, as it might be useful.
	 * Only using content type since codec info adds nothing to check in iOS 6.
	 * eg., The type dominates the check and when 'maybe', then you could give a codec=banana and get a 'probably'.
	 * ie., The canPlayType() codec check on iOS (iOS 6) is broken.
	 */
	formats: {
		mp3: [
			// 'audio/mpeg; codecs="mp4a.40.34"',
			// 'audio/mpeg; codecs="mp3"',
			'audio/mpeg'
		],
		mp4: [ // AAC / MP4
			// 'audio/mp4; codecs="mp4a.40.2"', // AAC
			// 'audio/mp4; codecs="mp4a.40.5"', // AAC+
			'audio/mp4',
			'audio/x-m4a'
		],
		hls: [ // m3u8 - Apple - HTTP Live Streaming
			'application/vnd.apple.mpegurl'
		],
		m3u: [
			'audio/mpegurl',
			'audio/x-mpegurl'
		],
		pls: [ // These work on iOS 6, when they contain MP3 or MP4.
			'audio/x-scpls'
		]
	},
	canPlay: {}, // Holds the canPlayType result of the format.
	audioElem: null, // The DOM audio element
	$audio: null, // The jQuery selector of the audio element

	init: function(api) {
		var self = this;

		this.api = api;
		this.$api = $(api);

		this.audioElem = document.createElement('audio');
		this.$audio = $(this.audioElem);
		this.available = !!this.audioElem.canPlayType;

		if(this.available) {
			// Check which formats are supported.
			$.each(this.formats, function(format, types) {
				// Go through the various MIME types for the format.
				$.each(types, function(i, type) {
					self.canPlay[format] = self.available && self.audioElem.canPlayType(type);
					if(self.api.DEBUG) radioplayer.utils.output('html: audio.canPlayType(' + type + ') = ' + self.canPlay[format]);
					if(self.canPlay[format]) {
						return false; // Found solution for the format - exit the loop
					}
				});
			});

			// So that all browsers behave like iOS
			this.audioElem.preload = 'none';

			// Attach the audio event handlers
			this.attachEvents();

			// Put the audio element on the page.
			$("#"+this.api.id).append(this.audioElem);

			this.ready = true;
			this.api.ready = true;
		}
	},

	/**
	 * Called either when we receive cookie settings, 
	 * or if that request fails and we proceed anyway with volume set to 100
     *
     * @method dataReady
     * @private
	 */
	dataReady : function() {
		if(this.api.DEBUG) radioplayer.utils.output("html: dataReady()");
		this.passParamsToHTML();
	},
		 
	/**
	 * Set parameters for EMP to use when it is ready
     *
     * (v2 API)
     *
     * @method setParams
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
     * @since V3
     *
     * @method setAudioParams
     *
     * @param audioHTML
     * @param audioLive
     * @param bufferTime
     * @private
     */
	setAudioParams : function(audioHTML, audioLive, bufferTime) {
		this.audioHTML = (audioHTML && audioHTML.length) ? audioHTML : [];
		this.audioLive = audioLive;
		this.bufferTime = bufferTime;
	},

	/**
	 * Pass parameters to HTML now that cookie read
     *
     * @method passParamsToHTML
     * @private
	 */
	passParamsToHTML : function() {
		if(this.api.DEBUG) radioplayer.utils.output("Passing parameters to HTML audio");

		if(this.audioHTML.length) {
			this.setAudio(this.audioHTML);
		} else if (this.audioType === "rtmp") {
			this.loadRTMPStream(this.audioServer, this.audioEndpoint);
		} else if (this.audioType === "http") {
			this.loadHTTPStream(this.audioUrl);
		} else if (this.audioType === "httpmp4m4a") {
			this.loadHTTPMP4M4AStream(this.audioUrl);
		} else if (this.audioType === "playlist") {
			this.loadPlaylist(this.audioUrl);
		} else {
			this.noSupport();
		}

		var mode = (this.audioLive ? "live" : "od");
		this.setPlaybackMode(mode);
		this.setVolume(radioplayer.controls.currentVolume);

		// Generate a volume event, since it does not always change. ie., defaults to 1, which new audio uses.
		this.$api.trigger(this.api.event.volumeSet, this.getEventObject());
	},

	/**
	 * Set the Audio to play
     *
     * @since V3
     *
     * @method setAudio
     * @param audioHTML
     * @private
	 */
	setAudio: function(audioHTML) {
		var self = this,
			audioPicked, audioHigh;

		this.reset();

		this.audioHTML = (audioHTML && audioHTML.length) ? audioHTML : [];

		// Can we play any of the High BW audio?
		$.each(this.audioHTML, function(i, audio) {
			if(self.canPlayAudio(audio)) {
				audioHigh = audio;
				return false; // exit loop
			}
		});

        audioPicked = audioHigh;

		if(audioPicked) {
			this.passSetAudio(audioPicked);
		} else {
			this.noSupport();
		}
	},

	/**
	 * Check we can play the audio defined in the audio object.
     *
     * @method canPlayAudio
     * @param audio
     * @private
	 */
	canPlayAudio: function(audio) {
		if (audio.audioType === "rtmp") {
			return false;
		} else if (audio.audioType === "http") {
			return this.canPlay.mp3;
		} else if (audio.audioType === "httpmp4m4a") {
			return this.canPlay.mp4;
		} else if (audio.audioType === "playlist") {
			var type = this.detectPlaylistType(audio.audioUrl);
			return type && this.canPlay[type];
		}
	},

	/**
	 * Pass the audio object from the new V3 API to the V2 API commands..
     *
     * @method passSetAudio
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
	 * Sets the Audio Element SRC
     *
     * @method setAudioUrl
     * @param url
     * @private
	 */
	setAudioUrl: function(url) {

		this.reset();

		this.supported = true; // Only called if we support the format.
		this.firstConnection = true;

		this.audioUrl = url;

		if(!this.ignoringCommands && this.autoplay) {
			this.resume();
		}
	},

    /**
     * @method reset
     * @private
     */
	reset: function() {
		clearTimeout(this.stallTimeoutId); // Cancel any stall timeouts.
		clearTimeout(this.errorTimeoutId); // Cancel any error timeouts.
		if(!this.disconnected) {
			this.disconnectStream();
		}
		this.monitoring = false;
		this.supported = false;
		this.duration = 0;
	},

    /**
     * @method connectStream
     * @private
     */
	connectStream: function() {
		if(this.supported) {
			// So we match the events generated by the flash.
			if(this.firstConnection) {
				this.firstConnection = false;
				this.$api.trigger(this.api.event.stopped, {});
				this.$api.trigger(this.api.event.cleanedup, {});
			}
			this.disconnected = false;
			this.audioElem.src = this.audioUrl;
			this.audioElem.load();
		}
	},

    /**
     * @method disconnectStream
     * @private
     */
	disconnectStream: function() {
		this.disconnected = true;
		if(!this.audioElem.paused) {
			this.audioElem.pause();
		}
		this.audioElem.src = "about:blank";
		this.audioElem.load();
	},

    /**
     * @method refreshConnection
     * @private
     */
	refreshConnection: function() {
		if(this.api.DEBUG) radioplayer.utils.output("html: refreshConnection()");
		clearTimeout(this.stallTimeoutId); // Cancel any stall timeouts.
		clearTimeout(this.errorTimeoutId); // Cancel any error timeouts.
		if(this.supported && !this.disconnected) {
			this.disconnectStream();
			this.connectStream();
			this.resume();
		}
	},

    /**
     * @method noSupport
     * @private
     */
	noSupport: function() {
		this.supported = false;
		this.$api.trigger(this.api.event.noSupport, this.getEventObject());
	},

    /**
     * Attempt to detect the playlist type, which is not easy.
     *
     * *The only thing we can use is the URL string, since CORS is not available.
     * ie., If CORS, we could look at the contents and make a better detector.*
     *
     * @method detectPlaylistType
     * @param url
     * @returns {string} Playlist type. One of 'hls', 'm3u' or 'pls'
     *
     * @private
     */
	detectPlaylistType: function(url) {

		var urlPeriods = url && url.split && url.split("."),
			suffix = urlPeriods.length > 1 ? urlPeriods[urlPeriods.length - 1] : "";

		if (suffix) {
			if(suffix === "m3u8") return "hls";
			if(suffix === "hls") return "hls";
			if(suffix === "m3u") return "m3u";
			if(suffix === "pls") return "pls";
		} else {
			return false;
		}
	},

	/* 
	 * Control API methods
	 */
	
	/* Directly load an RTMP stream with 'server' and 'endpoint' urls */
	loadRTMPStream: function(server, endpoint) {
		this.noSupport();
	},
	/* Directly load an HTTP stream from url */
	loadHTTPStream: function(url) {
		if(this.canPlay.mp3) {
			this.setAudioUrl(url);
		} else {
			this.noSupport();
		}
	},
	/* Directly load Netstreams from url. Supports mp4, m4a. */
	loadHTTPMP4M4AStream: function(url) {
		if(this.canPlay.mp4) {
			this.setAudioUrl(url);
		} else {
			this.noSupport();
		}
	},
	/* Load, parse and play the contents in order from the playlist at the url in 'playlistpath' */
	loadPlaylist : function(playlistpath) {
		var type = this.detectPlaylistType(playlistpath);
		if(type && this.canPlay[type]) {
			this.setAudioUrl(playlistpath);
		} else {
			this.noSupport();
		}
	},
	/* Resume playback after pause. */
	resume : function() {
		clearTimeout(this.stallTimeoutId); // Cancel any stall timeouts.
		clearTimeout(this.errorTimeoutId); // Cancel any error timeouts.
		if(this.disconnected) {
			this.connectStream();
		}
		if(this.supported) {
			this.audioElem.play();
		} else {
			this.noSupport();
		}
	},
	/* Pause playback while playing. */
	pause : function() {
		clearTimeout(this.stallTimeoutId); // Cancel any stall timeouts.
		clearTimeout(this.errorTimeoutId); // Cancel any error timeouts.
		this.audioElem.pause();
	},
	/* Stop playback while playing. */
	stop : function() {
		clearTimeout(this.stallTimeoutId); // Cancel any stall timeouts.
		clearTimeout(this.errorTimeoutId); // Cancel any error timeouts.
		this.audioElem.pause();
	},
	/* Cancels the stream download. */
	cleanup : function() {
		this.reset();
		this.$api.trigger(this.api.event.cleanedup, this.getEventObject());
	},
	/* Returns the current position of the playhead for the current audio item. */
	getPosition : function() {
		return this.audioElem.currentTime * 1000; // Milliseconds
	},
	/* Returns the duration of the current audio item. */
	getDuration : function() {
		var audio = this.audioElem,
			duration = isFinite(audio.duration) ? audio.duration : 0; // Otherwise it is a NaN until known
		return duration * 1000; // Milliseconds
	},
	/* Sends the playhead of the current audio item. to 'position' in seconds */
	seek : function(position) {
		var self = this,
			audio = this.audioElem;

		clearTimeout(this.stallTimeoutId); // Cancel any stall timeouts.
		clearTimeout(this.errorTimeoutId); // Cancel any error timeouts.

		// Only for OD content
		if(!this.audioLive && !this.disconnected) {
			if(this.supported) {
				// Attempt to play it, since iOS/Android might be ignoring commands.
				// If browser is still ignoring commands, then the seek() must have been issued by the user.
				if(this.ignoringCommands) {
					audio.play();
				}

				try {
					// !audio.seekable is for old HTML5 browsers, like Firefox 3.6.
					// Checking seekable.length is important for iOS6 to work with OD setAudioUrl() followed by seek(time)
					if(!audio.seekable || typeof audio.seekable === "object" && audio.seekable.length > 0) {
						audio.currentTime = position;
						audio.play();
					} else {
						throw 1;
					}
				} catch(err) {
					// Attempt to seek again in 250ms.
					this.seekTimeoutId = setTimeout(function() {
						self.seek(position);
					}, 250);
				}
			} else {
				this.noSupport();
			}
		}
	},
	/* Set the volume (for the current, and all subsequent audio items). volume can be between 0 and 100 */
	setVolume : function(volume) {
		this.audioElem.volume = volume / 100; // Ratio 0 to 1
	},
	/* Set the amount of time in seconds that the streams should load into buffer before playing. */
	setBufferTime : function(time) {
		// No equivilent
		return false;
	},
	/* Specify the playback mode. Can be 'od' for on demand or 'live' for live streams. 
	 * No meaning in the HTML player. Just generate the event so the display can react.
	 */
	setPlaybackMode : function(mode) {
		this.audioLive = (mode=='live');
		this.$api.trigger(this.api.event.mode, this.getEventObject());
	},
	/* Returns the value of the playback mode.*/
	getPlaybackMode : function() {
		return (this.audioLive)?"live":"od";
	},
	/* For Debugging - returns the emp and flash player versions with some basic debugging info. */
	getVersion : function() {
		return this.version;
	},
	/* Required for the Flash. No HTML equiv */
	memoryreset : function() {
		return false;
	},
	/* Required for the Flash. No HTML equiv */
	setMemoryLimit : function(limit) {
		return false;
	},
	/*	Set the time taken before a timeout if the stream gets stuck buffering.*/
	setStallTimeout : function(time) {
		if(typeof time === 'number') {
			if(time < 2000) {
				this.stallTime = 2000; // Limit the minimum to a sensible value.
			} else {
				this.stallTime = time;
			}
		}
	},
	
	/* 
	 * HTML5 Audio Events
	 */
	
	attachEvents: function() {
		var self = this;

		this.audioElem.addEventListener("progress", function() {
			// Live content suppresses these events.
			if(!self.audioLive) {
				self.$api.trigger(self.api.event.loadProgress, self.getEventObject());
			}
		}, false);

		this.audioElem.addEventListener("timeupdate", function() {

			// Fix durationchange bug for iOS. See also durationchange event handler.
			var duration = self.getDuration();
			if(self.duration !== duration) {
				self.duration = duration;
				self.$api.trigger(self.api.event.durationSet, self.getEventObject());
			}

			// Only generate update events for OD content
			if(!self.audioLive) {
				self.$api.trigger(self.api.event.update, self.getEventObject());
			}
		}, false);

		this.audioElem.addEventListener("play", function() {
			clearTimeout(self.stallTimeoutId); // Cancel any stall timeouts.
			clearTimeout(self.errorTimeoutId); // Cancel any error timeouts.
			self.ignoringCommands = false; // The play command must have worked.
			if(self.audioLive) {
				self.monitoring = true;
			}
			self.$api.trigger(self.api.event.resumed, self.getEventObject());
		}, false);

		this.audioElem.addEventListener("playing", function() {
			clearTimeout(self.stallTimeoutId); // Cancel any stall timeouts.
			self.$api.trigger(self.api.event.startPlaying, self.getEventObject());
            radioplayer.emp.player.html.errorCount = 0; // Reset error count back to 0.
		}, false);

		this.audioElem.addEventListener("waiting", function() {
            if(self.audioLive && self.monitoring) {
                clearTimeout(self.stallTimeoutId); // Avoids multiple timeout generation.
                if(radioplayer.emp.player.html.errorCount < radioplayer.emp.retryCount) {
                    self.stallTimeoutId = setTimeout(function() {
                        self.refreshConnection();
                    }, self.stallTime);
                }
			}
		}, false);

		this.audioElem.addEventListener("pause", function() {
			clearTimeout(self.stallTimeoutId); // Cancel any stall timeouts.
			clearTimeout(self.errorTimeoutId); // Cancel any error timeouts.
			if(self.audioLive) {
				self.monitoring = false;
				self.disconnectStream();
				self.$api.trigger(self.api.event.stopped, self.getEventObject());
			} else {
				self.$api.trigger(self.api.event.pausePlaying, self.getEventObject());
			}
		}, false);

		this.audioElem.addEventListener("ended", function() {
			self.$api.trigger(self.api.event.ended, self.getEventObject());
		}, false);

		this.audioElem.addEventListener("volumechange", function() {
			self.$api.trigger(self.api.event.volumeSet, self.getEventObject());
		}, false);

		this.audioElem.addEventListener("durationchange", function() {

			// Fix durationchange bug for iOS. See also timeupdate event handler.
			self.duration = self.getDuration();

			self.$api.trigger(self.api.event.durationSet, self.getEventObject());
		}, false);

		this.audioElem.addEventListener("error", function() {

            radioplayer.emp.player.html.errorCount++;
			var code = self.audioElem.error.code;
			/*
			 * Error codes:
			 * 1: MEDIA_ERR_ABORTED - The user agent aborted at the user request.
			 * 2: MEDIA_ERR_NETWORK - A network problem occurred after the media deemed usable.
			 * 3: MEDIA_ERR_DECODE - A decoder error occurred.
			 * 4: MEDIA_ERR_SRC_NOT_SUPPORTED - Usually a 404 error or a MIME type (Content-Type) issue with the request.
			 */

			if(!self.disconnected) {
                clearTimeout(self.stallTimeoutId);
                clearTimeout(self.errorTimeoutId); // Avoids multiple timeout generation.
				if(radioplayer.emp.player.html.errorCount < radioplayer.emp.retryCount) { // Limit number of retries
                    self.errorTimeoutId = setTimeout(function() {
                        self.refreshConnection();
                    }, self.stallTime / 2);
                } else {
                    // Throw error event.
                    self.disconnected = true;
                    self.$api.trigger(self.api.event.error, $.extend(self.getEventObject(), {code:code}));
                }
			}
		}, false);
	},

    resetAttemptCount: function() {
        this.errorCount = 0;
    },

	getEventObject: function() {
		var audio = this.audioElem,
			loadProgress = (audio.seekable && audio.seekable.length) ? 1 : 0;
		return {
			position: this.getPosition(),
			duration: this.getDuration(),
			volume: Math.round(audio.volume * 100),
			mode: this.audioLive ? "live" : "od",
			loadProgress: loadProgress,
			bytesLoaded: 100 * loadProgress, // Pseudo value used. NB: Flash always gives a null.
			bytesTotal: 100 // Pseudo value used. NB: Flash always gives a null.
		};
	}
};