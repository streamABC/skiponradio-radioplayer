/**
 * Version: 1.2.22
 *
 * @name init
 * @description Initializes global variables, namespaces and sets up actions to occur when document is ready
 *
 * All intellectual property rights in this Software throughout the world belong to UK Radioplayer,
 * rights in the Software are licensed (not sold) to subscriber stations, and subscriber stations
 * have no rights in, or to, the Software other than the right to use it in accordance with the
 * Terms and Conditions at www.radioplayer.co.uk/terms. You shall not produce any derivate works
 * based on whole or part of the Software, including the source code, for any other purpose other
 * than for usage associated with connecting to the UK Radioplayer Service in accordance with these
 * Terms and Conditions, and you shall not convey nor sublicense the Software, including the source
 * code, for any other purpose or to any third party, without the prior written consent of UK Radioplayer.*
 *
 * @author Gav Richards <gav@gmedia.co.uk>
 * @author Steve Edson <steve@gmedia.co.uk>
 *
 * This file calls:
 * @ emp
 * @ controls
 * @ overlay
 * @ playing (via OD request)
 * @ services (via cookie request)
 *
 * This file is called by:
 * None
 *
 * @class init
 * @module init
 *
 */

/**
 * @class init
 */

// forces google compiler to keep the name space intact
if (!window.radioplayer) { window.radioplayer = radioplayer; }

// Avoid errors if we inadvertently commit some console.xxx calls.
if (!window.console) {
	window.console = {
		log: function () {},
		dir: function () {}
	};
}


var radioplayer = {

	consts: {
		consolelog: 		false,
		is_iOS: 			false,
		is_Android:			false,
		reduced_func:		false,

		user: null,

		assetBaseUrl:       '', // If set, it should end with a slash

		force_reduced_func: false,

		show_cookie_dependent_features: true,
		show_cookie_anno:   false,
		show_cookie_consent: true,
		cookie_consent_required: true,
		cookie_anno_ttl:    (60*60*24*365*10), // 10 years

		api: {
			stationList: 	'https://static.radioplayer.de/v1/json/StationList.js',
			init: 			'https://cookie.radioplayer.de/cm/',
			search: 		'https://search.radioplayer.de/qp/v3/search',
			suggest: 		'https://search.radioplayer.de/qp/v3/suggest',
			onAir: 			'https://search.radioplayer.de/qp/v3/onair',
			pollOnAir: 		'https://np.radioplayer.de/qp/v3/onair',
			onDemand: 		'https://search.radioplayer.de/qp/v3/oditem',
			recommend: 		'https://search.radioplayer.de/qp/v3/recommend',
			az: 			'https://search.radioplayer.de/qp/v3/stations'
		},
		iframe: {
			analytics: 		'https://static.radioplayer.de/v3/analytics.html'
		}
	},

	services: { },
	emp: { },
	controls: { },
	playing: { },
	overlay: { },
	mystations: { },
	history: { },
	search: { },
	lang: { },
	utils: { },

	settings: {
		lastplayed: currentStationID,	// this is stored, but not currently actively used anywhere
		presets: [],
		history: [],
		stationlistprefix: '',
		guid: ''
	},

	stnList: { },

	querystring: { },
	initFailTimeout: null,
	checkCookieConsentFailTimeout: null,
	startAtSeconds: 0,
	themeColour: 'dark',
	mouseActive: false,

	objs: {
		body: null,

		searchBox: null,
		searchInput: null,

		overlayContainer: null,
		stickyLetterDivide: null,

		suggestContainer: null,

		searchContainer: null,
		searchKeywords: null,
		searchResults: null,
		searchAllContainer: null,
		searchLiveContainer: null,
		searchODContainer: null,

		nowPlayingStrip: null,
		scrollingContainer: null,
		scrollingText: null
	}
};


/**
 * Initialise Radioplayer
 *
 * @method radioplayer.init()
 */
radioplayer.init = function() {

	user = detect.parse(navigator.userAgent);

	/**
	 * Set browser booleans which we can't get from jQuery's browser plugin
	 */

	radioplayer.consts.is_iOS = /(iOS)/.test(user.os.family);
	radioplayer.consts.is_Android = /Android/.test(user.os.family);

    /**
     * Override reduced_func if force_reduced_func is set
     */
    if (window.force_reduced_func) radioplayer.consts.force_reduced_func = true;
	if (radioplayer.consts.force_reduced_func) radioplayer.consts.reduced_func = true;
	if (/(Safari)/.test(user.browser.family)) radioplayer.consts.reduced_func = true;

	/**
	 * Localisation
	 */
	$('.radioplayer-globalnav .rp-logo').html(radioplayer.lang.general.radioplayer);
	$('.radioplayer-globalnav .menu-btn').attr('title', radioplayer.lang.general.open_menu).find('span').html(radioplayer.lang.general.open_menu);
	$('#toggle-mystations').attr('title', radioplayer.lang.mystations.add_this).find('span').html(radioplayer.lang.mystations.add_this);
	$('#rectangle').find('span').html(radioplayer.lang.general.apps_download);


	/**
	 * Drop query string parameters into object for later use
	 */
	radioplayer.querystring = radioplayer.utils.getQueryStringObj();


	/**
	 * Store the theme class
	 */
	if ($('.radioplayer').hasClass('light-theme')) {
		radioplayer.consts.themeColour = "light";
	}


	/**
	 * Grab body DOM object for later use
	 */
	radioplayer.objs.body = $('body');


	/**
	 * Prepare to auto handle OD content
	 */
	if (radioplayer.querystring["rpAodUrl"]) {
		// Overwrite EMP variables to use AOD
		audioLive = false;

		audioFlash = audioHTML = [{
			audioType: "http",
			audioUrl: radioplayer.querystring["rpAodUrl"]
		}];

		// Populate Playing overlay once with OD info, so prevent it auto populating with Live info
		nowPlayingSource = 'OD';
	}

	/**
	 * Pick up timestamp from query string, use that as the start point for OD audio
	 */
	if (radioplayer.querystring["t"] && !audioLive) {

		radioplayer.startAtSeconds = radioplayer.utils.convertTimeToSeconds(radioplayer.querystring["t"]);

		radioplayer.utils.output('start at ' + radioplayer.startAtSeconds + ' seconds into OD audio');

		$(radioplayer.emp).on('loaded', function(){
			if (radioplayer.startAtSeconds > 0 && radioplayer.startAtSeconds <= (radioplayer.controls.rawDuration / 1000)) {
				radioplayer.emp.seek(radioplayer.startAtSeconds);
				radioplayer.startAtSeconds = 0;
			}
		});

	}

	/**
	 * Initialize Player Controls
	 */
	radioplayer.controls.init();


	/**
	 * Initialize My Stations
	 */
	radioplayer.mystations.init();


	/**
	 * Initialize Now Playing Strip
	 */
	if (audioLive) {
		radioplayer.playing.init();
	} else {

        // Fetch OD information. If we don't get anything, we fall back with ID3 -> Nothing
        radioplayer.services.getAPI(radioplayer.consts.api.onDemand +
									"?odUrl=" + encodeURIComponent(document.location.href) +
									"&nameSize=200" +
									"&descriptionSize=200" +
									"&callback=radioplayer.playing.receiveOD");
    }


	/**
	 * Initialize Overlays
	 */
	radioplayer.overlay.init();


	/**
	 * Initialize Search
	 */
	radioplayer.search.init();

	/**
	 * Check if need to hide cookie-dependent features for Safari browsers
	 */
	if (/(Safari)/.test(user.browser.family)) {
		radioplayer.services.hideCookieDependentFeatures();
	}

	/**
	 * For desktop browsers, need to cater for the minimum full controls display
	 */
	if (/(Desktop)/.test(user.device.type)) $('html, body').addClass('desktop');

    /**
     * Start Analytics iFrame
     */
    radioplayer.services.analytics.init();


	/**
	 * Accessibility handling of element outlines
	 */
	$(document).on('mousedown', function(){
		// Apply a class to body which we can use to set outline:none;

		if (!radioplayer.mouseActive) {
			radioplayer.mouseActive = true;
			radioplayer.objs.body.addClass('rp-mouseactivity');
		}

	}).on('keydown', function(){
		// Remove class from body so outlines are used

		if (radioplayer.mouseActive) {
			radioplayer.mouseActive = false;
			radioplayer.objs.body.removeClass('rp-mouseactivity');
		}

	});

	/**
	 * Resize the progress scrubber
	 */
	radioplayer.controls.resizeProgressScrubber();

	$(window).resize(function() {
		// Resize browser elements
		radioplayer.controls.resizeProgressScrubber();
		if (!($.browser.msie && $.browser.version == 7)) {
			radioplayer.overlay.resizeStickyDivide();
		}

		//Reset the navigation menu toggles
		radioplayer.overlay.resetNavigationMenu();
		radioplayer.search.resetNavigationMenu();
	});

	/**
	 * If a link in the plugin space has data attribute 'newstationid' then apply analytics hook
	 * This should be used for sideways navigation, from one console to another
	 */
	$('.radioplayer-plugin').on('click', 'a[data-newstationid]', function(){

		var stnId = $(this).attr('data-newstationid'),
			href = $(this).attr('href');

		radioplayer.overlay.sidewaysNavigate('Plugin Space', stnId, href);

	});

	/**
	 * Get settings cookie and central management config
	 * If the request fails to return, then proceed to load EMP with volume set to 100
	 *
	 * Note that, the use of window.varName is to avoid errors when only using V3 or V2 init vars.
	 * A side effect of this is that you will not get error messages if you forget one. It would simply be undefined.
	 */
	radioplayer.initFailTimeout = setTimeout(function() {
		//if not already playing, then init play
		if(!radioplayer.controls.isPlaying) {

			// The V3 inital instancing method
			radioplayer.emp.setAudioParams(window.audioFlash, window.audioHTML, window.audioLive, window.bufferTime, window.preferHtml5Audio);
			radioplayer.emp.dataReady();
		}
	}, 5000);

	radioplayer.services.checkCookieConsent(function() {
		if (radioplayer.consts.show_cookie_consent) radioplayer.consts.reduced_func = true;
		radioplayer.services.initCookie();
	});

	/**
	 * Get station list
	 * Received in services
	 */
	radioplayer.services.getAPI(radioplayer.consts.api.stationList);

    /**
     * Add 'rp-js' class to html element to indicate library is available
     */
	$('html').addClass('rp-js');
};/**
 * Version: 1.2.22
 * 
 * @module utils
 * @class utils
 */


if (!Array.prototype.indexOf) {
	Array.prototype.indexOf = function(obj, start) {
		 for (var i = (start || 0), j = this.length; i < j; i++) {
			 if (this[i] === obj) { return i; }
		 }
		 return -1;
	}
}


radioplayer.utils = {
	
	/**
	 * Console Log abstraction
	 *
	 * @method output
	 * @returns {String} string to log
	 */

	output : function(str) {
		if (radioplayer.consts.consolelog) {
			// Only log if the option is enabled
			console.log(str);	
		}
	},
	
	
	/**
	 * @method setSelectionRange
	 * @param input
	 * @param selectionStart
	 * @param selectionEnd
	 */
	setSelectionRange : function(input, selectionStart, selectionEnd) {
		if (input.setSelectionRange) {
			input.focus();
			input.setSelectionRange(selectionStart, selectionEnd);
		}
		else if (input.createTextRange) {
			var range = input.createTextRange();
			range.collapse(true);
			range.moveEnd('character', selectionEnd);
			range.moveStart('character', selectionStart);
			range.select();
		}
	},

	
	/**
	 * @method setCaretToPos
	 * @param input
	 * @param pos
	 */
	setCaretToPos : function(input, pos) {
		radioplayer.utils.setSelectionRange(input, pos, pos);
	},
	
	
	/**
	 * Get Query String Object
	 *
	 * @method getQueryStingObj
	 * @returns {Object} Object containing query string
	 */
	getQueryStringObj : function() {
		var querystring = location.search.replace('?', '').split('&');
		var queryObj = {};
		for (var i=0; i<querystring.length; i++) {
			var name = querystring[i].split('=')[0];
			var value = querystring[i].split('=')[1];
			queryObj[name] = value;
		}
		return queryObj;
	},
	
	
	/**
	 * Given a time string like '1h30m6s', it is converted to seconds as an integer
	 *
	 * @method convertTimeToSeconds
	 * @param {string} time
	 * @returns {integer} outputSeconds
	 */
	convertTimeToSeconds : function(time){
	
		var modifiers = 'g', // Global - Matches more than one result
			pattern = '[0-9]+[HMShms]{1}', // Look for 0 or more numbers, followed by 1 character of a string
			regex = new RegExp(pattern,modifiers),
			array = time.match(regex), // Match all results of above regex
			outputSeconds = 0,
			multiplierValue,
			timeValue;
	
		if ($.isArray(array)) {		
			
			for (var i = 0; i < array.length; i++) {
							
				multiplierValue = array[i].charAt(array[i].length-1); // Get either 'h', 'm' or 's' from last character of string
				timeValue = array[i].substr(0,array[i].length - 1); // Remove last character so we have the remaining time only
							
				if (multiplierValue == 'h') { // Hours
					outputSeconds += parseInt(timeValue * 60 * 60);
				} else if (multiplierValue == 'm') { // Minutes
					outputSeconds += parseInt(timeValue * 60);
				} else if (multiplierValue == 's') { // Seconds
					outputSeconds += parseInt(timeValue);
				}
				
			}
		
		}
		
		return outputSeconds;		
				
	}
	
};/**
 * Version: 1.2.22
 * 
 * @name services
 * @description Cross domain get and post, receiving of cookie values
 *
 * > *All intellectual property rights in this Software throughout the world belong to UK Radioplayer,
 * rights in the Software are licensed (not sold) to subscriber stations, and subscriber stations
 * have no rights in, or to, the Software other than the right to use it in accordance with the
 * Terms and Conditions at www.radioplayer.co.uk/terms. You shall not produce any derivate works
 * based on whole or part of the Software, including the source code, for any other purpose other
 * than for usage associated with connecting to the UK Radioplayer Service in accordance with these
 * Terms and Conditions, and you shall not convey nor sublicense the Software, including the source
 * code, for any other purpose or to any third party, without the prior written consent of UK Radioplayer.*
 *
 *
 * @author Gav Richards <gav@gmedia.co.uk>
 * @author Steve Edson <steve@gmedia.co.uk>
 *
 * This file calls:
 * @ emp
 * @ search
 *
 * This file is called by:
 * @ init (via request)
 * @ mystations
 * @ search
 *
 * @module services
 * @class services
 */

radioplayer.services = {
	
	unmuteAfterOverlay : false,
	
    heartbeatCounter : 0,
    heartbeatTimeout : null,
	
	annoTimeout : null,
	annoShowing : false,
	queuedAnnos: [],
	
	/**
	 * Save new cookie value
     *
     * @param cookieName {String}
     * @param value {String}
     */
	saveCookie : function(cookieUrlSuffix, cookieName, value, callbackfunc) {		
		
		if (radioplayer.consts.reduced_func) return;

		var saveUrl = radioplayer.consts.api.init + cookieUrlSuffix;
		
		// This isn't supported by all browers and cookie settings due to use of cross domain cookies
		// That's why we have the reduced functionality mode
		saveUrl += "?" + cookieName + "=" + value;
		radioplayer.services.getAPI(saveUrl, callbackfunc);
	},
	
	/**
	 * Check cookie consent state
     */	
	checkCookieConsent : function(callback) {

		if (document.cookie.indexOf("gdpr-consent") != -1) {
			
			// Use the locally set cookie value if available
			radioplayer.consts.show_cookie_consent = false;
			
			// In case it has been lost, set session cookie to not show cookie consent
			radioplayer.services.saveCookie("cookie-consent/s", "accepted-cookie-consent", "true", callback);

			if ((/(Safari)/.test(user.browser.family))) {
				radioplayer.services.showAnno(radioplayer.lang.general.reduced_func_anno);
			}

		} else {
			
			/**
			 * Get settings cookie consent state
			 * If the request fails to return, then assume that no consent has been given
		     */
			radioplayer.checkCookieConsentFailTimeout = setTimeout(function() {
				radioplayer.consts.show_cookie_consent = true;
				radioplayer.consts.reduced_func = true;
				radioplayer.services.showCookieConsent();
		    }, 5000);
			
			radioplayer.services.getAPI(radioplayer.consts.api.init + "cookie-consent/?callback=radioplayer.services.receiveCookieConsentState", callback);
		}
	},
	
	/**
	 * Receive cookie consent state data from Radioplayer
     *
     * @method receiveCookieConsentState
     * @param data {Object}
     */	
	receiveCookieConsentState : function(data) {

		clearTimeout(radioplayer.checkCookieConsentFailTimeout);
		
		if (data.accepted && document.cookie.indexOf("gdpr-consent") > -1) {
			
			radioplayer.consts.show_cookie_consent = false;
			if (!radioplayer.consts.force_reduced_func && !/(Safari)/.test(user.browser.family)) radioplayer.consts.reduced_func = false;
		}
		
		if (radioplayer.consts.show_cookie_consent) {

			radioplayer.services.showCookieConsent();

		} else {

			radioplayer.services.createExpiringCookie('rp-accepted-cookie-consent', radioplayer.consts.cookie_anno_ttl);

			/**
			 * Show cookie announcement? Check cookie
			 */
			if (radioplayer.consts.show_cookie_anno) {
				// Cookie anno is enabled, but is cookie set?

				if (document.cookie.indexOf("rp-seen-cookie-anno") == -1) {
					// Cookie announcement has not yet been seen
					// Show the announcement and set cookie to prevent it appearing again

					radioplayer.services.showCookieAnno();
				}
			}
		}
	},

	/**
	 * Initialise cookie
     */	
	initCookie : function() {

		var initQS = "?callback=radioplayer.services.receiveInit";
		
		if (radioplayer.querystring["stationlistprefix"]) {
			initQS += "&stationlistprefix=" + radioplayer.querystring["stationlistprefix"].toLowerCase();
		}
		
		if(radioplayer.consts.cookie_consent_required) {
			initQS += "&cookieconsentrequired=true";
		}

		if (radioplayer.consts.force_reduced_func || radioplayer.consts.show_cookie_consent) {
			// reduced_func is forced so no need to set primed cookie or cookie consent is still not given
			radioplayer.services.getAPI(radioplayer.consts.api.init + "init/" + currentStationID + initQS);
		} else {
			// Set the primed cookie, to test cross domain cookie support
			radioplayer.services.saveCookie('primed/s', 'primed', 'true', function(){
				// Once primed cookie is set, call init api
				radioplayer.services.getAPI(radioplayer.consts.api.init + "init/" + currentStationID + initQS);
			});	
		}	
	},

	
	/**
	 * Receive initialisation settings cookie and central management data from Radioplayer
     *
     * @method receiveInit
     * @param data {Object}
	 */
	receiveInit : function(data) {
		
		/**
		 * We've received the data, so cancel the timer that waits for ajax to fail
		 */
		
		clearTimeout(radioplayer.initFailTimeout);
		
		
		/**
		 * Dead Console
		 */
		
		if (data.dead) {
			// Parameters: url
            radioplayer.services.analytics.sendEvent('Errors', 'Static Station', currentStationID, null, null);
			setTimeout(function() {
                window.location.href = data.dead.url;
            }, 100);
			return false;
		}
		
		
		/**
		 * Redirect to another URL
		 */
		
		if (data.redirect) {
			// Parameters: url
			window.location.href = data.redirect.url;
			return false;
		}
		
		
		/**
		 * Check status of primed cookie, to decide if cross domain cookies are supported
		 */
		
		if (data.primed) {
			// Browser supports cross domain cookies
			// init call will have set this back to false again
			if(!radioplayer.consts.show_cookie_consent) {
				if (!radioplayer.consts.force_reduced_func && !/(Safari)/.test(user.browser.family)) radioplayer.consts.reduced_func = false;
				radioplayer.services.showCookieDependentFeatures();
			}

		} else {
			// Browser does not support cross domain cookies
			radioplayer.consts.reduced_func = true;
			radioplayer.services.hideCookieDependentFeatures();
		}
		
		
		/**
		 * Redirect to Interstitial
		 */
		
		if (!radioplayer.consts.reduced_func) {
			// We cannot run interstitials in reduced functionality mode, as we cannot store a cookie to say we've seen them
			
			// Check for the 'seen' cookie variable first
			var seenInterstitial = (data.interstitial && data.interstitial.seen);
			
			if (!seenInterstitial && window.initOptions && window.initOptions.interstitial && window.initOptions.interstitial.enabled) {
				// Locally override interstitial
				data.interstitial = initOptions.interstitial;
			}
			
			if (!seenInterstitial && data.interstitial && data.interstitial.url && data.interstitial.url != "") {
				// Parameters: url
				
				// Set session cookie to not show interstitial again
				radioplayer.services.saveCookie("interstitial/s", "interstitial", "true");
				
				setTimeout(function(){
	
					// Redirect to interstitial with player URL tagged on, so it can redirect back here
					var ourUrl = document.location.href;
					
					var interUrl = data.interstitial.url;
	
					interUrl += (interUrl.indexOf("?") > 0 ? "&" : "?") + "playerUrl=" + encodeURIComponent(ourUrl);
					window.location.href = interUrl;
				
				}, 200 );
				
				return false;
			}
		
		}
		
		
		/**
		 * Volume
		 *
		 * Process this first, so we can pass it to the EMP and start the audio playing
		 */
		
		if (data.volume && data.volume != "") {
            radioplayer.controls.currentVolume = data.volume;
        }
		
		
		/**
		 * My Stations
		 */

		if (!radioplayer.consts.reduced_func) {

            var currentStationIsInMyStations = false;

            if (data.presets) {
                // Don't load my stations in reduced functionality mode

                for(var i=0; i < data.presets.length; i++){
                    var arrID = data.presets[i].split(":");
                    radioplayer.settings.presets.push(arrID[1]);

                    // If current station is in My Stations, add class to top icon
                    if (arrID[1] == currentStationID) {
                        currentStationIsInMyStations = true;
                    }
                }
            }

            if (currentStationIsInMyStations) {
                $('#toggle-mystations').addClass('in-mystations')
                                       .attr('title', radioplayer.lang.mystations.remove_this)
                                       .find('span').html(radioplayer.lang.mystations.remove_this);
            } else {
                $('#toggle-mystations').attr('title', radioplayer.lang.mystations.add_this)
                                       .find('span').html(radioplayer.lang.mystations.add_this);
            }

        }
		
		$(radioplayer.services).trigger("gotPresets");
		
		
		/**
		 * Last Played
		 */
		
		if (data.lastplayed && data.lastplayed != "") radioplayer.settings.lastplayed = data.lastplayed;
		
		/**
		 * History
		 */
		
		if (data.history) {
			// Array of previous station IDs
			radioplayer.settings.history = data.history;
		}
		
		$(radioplayer.services).trigger("gotMyStationsAndHistory");


		/**
		 * GUID
		 */
		
		if (data.guid) {
			radioplayer.settings.guid = data.guid;
		}

		
		/**
		 * A-Z Letter
		 */
		
		if (data.stationlistprefix) {
			radioplayer.settings.stationlistprefix = data.stationlistprefix;
		}
		
		
		/**
		 * Song Action
		 */
		 
		if (window.initOptions && window.initOptions.songaction && window.initOptions.songaction.enabled) {
			// Locally override song action
			data.songaction = initOptions.songaction;
		}
		
		if (data.songaction) {
			// Parameters: type, baseurl
			
			radioplayer.playing.songAction = data.songaction;
			
			$(radioplayer.services).trigger("gotSongAction");
		}
		

		/**
		 * Load Scripts
		 */

		if (data.scripts) {
			// Array of URLs
			
			$.each(data.scripts, function(index, scriptUrl) { 
				radioplayer.services.getAPI(scriptUrl);
			});
		}
		
		//if not already playing, then init play
		if(!radioplayer.controls.isPlaying) {
			
			/**
			 * Stream Override
			 */
	        if (window.audioLive) { // Only do this if we're playing the live stream, not for OD
	            if (data.overridestream) {
	                // Override the live stream of the player

	                if (data.overridestream.type == 'rtmp') {
	                    window.audioHTML = window.audioFlash = [{
	                        audioType: data.overridestream.type,
	                        audioServer: data.overridestream.server,
	                        audioEndpoint: data.overridestream.endpoint
	                    }];
	                } else {
	                    window.audioHTML = window.audioFlash = [{
	                        audioType: data.overridestream.type,
	                        audioUrl: data.overridestream.url
	                    }];
	                }

	                window.bufferTime = data.overridestream.buffer;

	            } else if(typeof window.audioHTML == "undefined" && data.html5stream) {
	                // If no override is set, HTML isn't defined locally, but we have it from Central systems.

	                var audioType = "";

	                if(typeof data.html5stream.type != "undefined") {
	                    // If audio type exists in url
	                    audioType = data.html5stream.type;
	                } else {
	                    // Else use default
	                    audioType = "http";
	                }

	                window.audioHTML = [{
	                    audioType: audioType,
	                    audioUrl: data.html5stream.url
	                }];
	            }
	        }

	        if(typeof window.audioHTML == "undefined") window.audioHTML = []; // Make sure variable in not undefined for EMP.

	        // At this point, the HTML stream should have been set from override > locally > central systems > undefined. Ready to pass to EMP
	        /**
	         * Now we have the volume level, and fallback streams, tell the EMP that the data is ready
	         */
	        radioplayer.emp.setAudioParams(window.audioFlash, window.audioHTML, window.audioLive, window.bufferTime, window.preferHtml5Audio);
	        radioplayer.emp.dataReady();
		}

		/**
		 * Show iframe overlay
		 */
		 
		if (window.initOptions && window.initOptions.overlay && window.initOptions.overlay.enabled) {
			// Locally override overlay
			data.overlay = initOptions.overlay;
		}

		if (data.overlay) {
			// Parameters: url, mute
			
			radioplayer.services.showOverlay(data.overlay.url, data.overlay.mute);
		}
		
		
		/**
		 * Show Announcement
		 */
		
		if (data.announcement) {
			// Parameters: text
			
			radioplayer.services.showAnno(data.announcement.text);
			
		} else if (!radioplayer.consts.show_cookie_consent && radioplayer.consts.reduced_func) {
			// If iOS on Safari, show an announcement explaining reduced functionality
			radioplayer.services.showAnno(radioplayer.lang.general.reduced_func_anno);
		}

	},
	
	
	/**
	 * Show announcement
     *
     * @method showAnno
     *
     * @param {String} text
     * @param {Boolean} animateExisting
     * @param {Boolean} suppressTimer
     */
	showAnno : function(text, animateExisting, suppressTimer) {

        if (radioplayer.services.annoShowing) {
            // An announcement is already showing, so queue this one to be shown afterwards
            radioplayer.services.queueAnno(text);

        } else {
            // Show announcement now
            radioplayer.services.annoShowing = true;

            if (animateExisting) {
                // We've just shown another announcement, so the dom elements are still there, they just need animating in

                $('.radioplayer-anno .anno-text').html(text);

                $('.radioplayer-anno').animate({ top: '0px' }, 600);

            } else {
                // Insert a refresh announcement container

                $('.radioplayer').append('<div class="radioplayer-anno"><div class="anno-text">' + text + '</div><a href="#" class="hide-anno">Hide this message</a></div>');

                // Click the cross to hide announcement
                $('.radioplayer-anno').on('click', 'a.hide-anno', radioplayer.services.hideAnno);
            }

            if (!suppressTimer) {
                // Auto hide the announcement after 10 seconds
                radioplayer.services.annoTimeout = setTimeout(radioplayer.services.hideAnno, 10*1000);
            }

        }
		
	},
	
	
	/**
	 * Hide announcement
     *
     * @method hideAnno
     */
	hideAnno : function() {

        radioplayer.services.annoShowing = false;

		clearTimeout(radioplayer.services.annoTimeout);
		
		// Set session cookie to not show announcement
		radioplayer.services.saveCookie("announcement/s", "announcement", "true");
		
		$('.radioplayer-anno').animate({ top: '-900px' }, 600, function(){

			if (radioplayer.services.queuedAnnos.length > 0) {
			    // There are queued announcement(s), so show the next one now

                // Remove the first one and show it
			    var nextAnno = radioplayer.services.queuedAnnos.shift();

			    radioplayer.services.showAnno(nextAnno, true);

			} else {
			    // No queued announcements, so remove the announcement element
                $(this).remove();
			}

		});
		
	},

	/**
	 * Show Cookie Announcement
	 *
	 * @method showCookieAnno
	 */
	showCookieAnno : function() {

		radioplayer.services.createExpiringCookie('rp-seen-cookie-anno', radioplayer.consts.cookie_anno_ttl);
		radioplayer.services.showAnno(radioplayer.lang.general.cookie_anno, false, true);
	},

    /**settings.presets
     * Queue an announcement
     *
     * @method queueAnno
     * @param {String} text
     */
	queueAnno : function(text){

        // Add this announcement text to queuedAnnos array
        // When the current announcement is hidden, it will be picked off the array to be shown next

        radioplayer.services.queuedAnnos.push(text); // add to end of array
	},
	
	/**
	 * Hide cookie consent when accepted
	 *
	 * @method hideCookieConsent
	 */
	hideCookieConsent : function() {

		radioplayer.consts.show_cookie_consent = false;

		if (!radioplayer.consts.force_reduced_func && !/(Safari)/.test(user.browser.family)) {
			radioplayer.consts.reduced_func = false;
		}

		radioplayer.services.createExpiringCookie('rp-accepted-cookie-consent', radioplayer.consts.cookie_anno_ttl);
		radioplayer.services.createExpiringCookie('gdpr-consent', radioplayer.consts.cookie_anno_ttl);

		// Set the primed cookie, to test cross domain cookie support
		radioplayer.services.saveCookie('cookie-consent/s', 'accepted-cookie-consent', 'true', function(){
			// Once accepted cookie consent is set, call init api
			radioplayer.services.initCookie();
		});

		$('.radioplayer-cookie-consent').animate({ top: '-900px' }, 600, function(){

			$(this).remove();

			/**
			 * Show cookie announcement? Check cookie
			 */

			if (radioplayer.consts.reduced_func) {
				radioplayer.services.showAnno(radioplayer.lang.general.reduced_func_anno);
			}
			else if (radioplayer.consts.show_cookie_anno) {
				// Cookie anno is enabled, but is cookie set?

				if (document.cookie.indexOf("rp-seen-cookie-anno") == -1) {
					// Cookie announcement has not yet been seen
					// Show the announcement and set cookie to prevent it appearing again

					radioplayer.services.showCookieAnno();
				}
			}
		});
	},

	/**
	 * Creates an expiring cookie if it does not currently exist
	 *
	 * @param {String} cookieName
	 * @param {int} ttlInSeconds
	 */
	createExpiringCookie : function(cookieName, ttlInSeconds) {

		if ( document.cookie.indexOf(cookieName) == -1 ) {

			var date = new Date();
			date.setTime(date.getTime() + (ttlInSeconds * 1000)); // In millis
			document.cookie = cookieName + '=yes;max-age=' + ttlInSeconds + ';expires=' + date.toUTCString();
		}
	},

    /**
     * Show cookie consent
     *
     * @method showCookieConsent
     */
	showCookieConsent : function(){
		if (/(Safari)/.test(user.browser.family) && document.cookie.indexOf("gdpr-consent") > -1) {
			// If iOS on Safari, show an announcement explaining reduced functionality
			radioplayer.services.showAnno(radioplayer.lang.general.reduced_func_anno);
		} else {
			var html = window.gdprMessage ? radioplayer.lang.general.cookie_consent + window.gdprMessage : radioplayer.lang.general.cookie_consent;
			$('.radioplayer').append('<div class="radioplayer-cookie-consent" id="radioplayer-cookie-consent"><a href="#" class="cookie-consent-button">' + radioplayer.lang.general.cookie_consent_dismiss + '</a><div class="cookie-consent-text" id="cookie-consent-text">' + html + '</div></div>'); 

			// Determine the height of the consent-text
			var h = document.getElementById('cookie-consent-text').clientHeight || $('#cookie-consent-text').height();
			if (h > 440) {
				$('.radioplayer-cookie-consent').append('<div class="cookie-consent-arrow"><div class="cookie-consent-arrow-inner"></div></div>');

				$('.cookie-consent-arrow').on('click', function () {
					if ($('.cookie-consent-arrow-inner').hasClass('cookie-consent-arrow-inner-reversed')) {
						$("#cookie-consent-text").animate({ scrollTop: 0 }, 300);
					}
					else {
						$("#cookie-consent-text").animate({ scrollTop: $("#cookie-consent-text").prop("scrollHeight") }, 500);
					}
					
				});

				var atBottom;
				$('.cookie-consent-text').on('scroll', function () {
					if ($(this)[0].scrollHeight - $(this).scrollTop() == $(this).outerHeight()) {
						if (!atBottom) {
							atBottom = true;
							$('.cookie-consent-arrow-inner').addClass('cookie-consent-arrow-inner-reversed');
						}
					}
					else if (atBottom) {
						atBottom = false;
						$('.cookie-consent-arrow-inner').removeClass('cookie-consent-arrow-inner-reversed');
					}
				});
			}

			

			$('.cookie-consent-text').css('max-height', '440px');
			$('.cookie-consent-text').css('overflow-y', 'scroll');			
			$('.cookie-consent-text').css('visibility', 'visible');

			// Click the cross to hide cookie consent
			$('.radioplayer-cookie-consent').on('click', 'a.cookie-consent-button', radioplayer.services.hideCookieConsent);
		}

		radioplayer.services.hideCookieDependentFeatures();
	},
	
	/**
	 * Handle showing commercial overlays
     *
     * @method showOverlay
     *
     * @param {String} content
     * @param {Boolean} mute
	 * @param {Boolean} insertHTML
     */
	
	showOverlay : function(content, mute, insertHTML) {
		
		if (insertHTML) {
			// If this boolean is true, insert the content directly into the div
			
			$('.radioplayer-body').append('<div class="radioplayer-prerolloverlay">' + content + '</div>');
			
		} else {
			// Default behaviour is to use content as the url for an iframe
			
			var proxyUrl = xDomainProxyUrl;
			var overlayUrl = content + (content.indexOf("?") > 0 ? "&" : "?") + "rpXDProxy=" + encodeURIComponent(proxyUrl);
	
			$('.radioplayer-body').append('<div class="radioplayer-prerolloverlay">' + 
											'<iframe src="' + overlayUrl + '"></iframe>' +
										  '</div>');
		}
		
		this.unmuteAfterOverlay = mute;
		
		if (mute) {
			// Mute the stream, then prepare to un-mute when the iframe calls back
			
			radioplayer.controls.volumeLocked = true;
			
			if (radioplayer.consts.is_iOS || radioplayer.consts.is_Android) {
				// Don't actually mute as iOS & Android doesn't handle this. Stop instead.
				if (radioplayer.controls.isPlaying) {
					radioplayer.emp.stop();
				}
				
				// Show press play prompt, as user will need to manually start stream playing again
				radioplayer.controls.showPressPlayPrompt();
				
			} else {
				radioplayer.controls.savedVolume = radioplayer.controls.currentVolume;
				if (radioplayer.emp.ready) {
					// EMP is ready, so mute now
					radioplayer.emp.setVolume(0);
				} else {
					// EMP is not ready, so need to mute it manually
					radioplayer.controls.currentVolume = 0;	
					radioplayer.controls.onVolumeUpdate('', {volume:0});
				}
			}
			
		}
		
	},
	
	
	/**
	 * Hide commercial overlays
     *
     * @method hideOverlay
     */
	
	hideOverlay : function() {
		
		// Post Pre-roll, proceed to (unmute stream) and remove overlay
		if (radioplayer.services.unmuteAfterOverlay) {
			// Unmute
			
			radioplayer.controls.volumeLocked = false;
			
			if (radioplayer.consts.is_iOS || radioplayer.consts.is_Android) {
				// Don't actually unmute as iOS & Android doesn't handle this. Play instead.
				radioplayer.emp.resume();
				
			} else {
				radioplayer.emp.setVolume(Math.round(radioplayer.controls.savedVolume));
			}
			
		}
		
		$(".radioplayer-prerolloverlay").remove();
		
	},

	/*
	 * Show cross-domain cookie dependent features
	 *
	 * @method showCookieDependentFeatures
	 */
	 
	showCookieDependentFeatures : function() {
	
		// Show the heart icon from the head/dock
		$('#mystations-toggle').removeClass('hidden');
		$('#toggle-mystations').show();
		
		// Show My Stations and Recent menu tabs
		$('#menu-nav-main li').eq(2).removeClass('first');
		$('#menu-nav-main li').eq(0).show().addClass('first');
		$('#menu-nav-main li').eq(1).show();
		
		radioplayer.consts.show_cookie_dependent_features = true;
	},	
	
	/*
	 * Hide cross-domain cookie dependent features
	 *
	 * @method hideCookieDependentFeatures
	 */
	 
	hideCookieDependentFeatures : function() {
		
		// Hide the heart icon from the head/dock
		$('#mystations-toggle').addClass('hidden');
		$('#toggle-mystations').hide();
		
		// Hide My Stations and Recent menu tabs
		$('#menu-nav-main li').eq(0).hide().removeClass('first');
		$('#menu-nav-main li').eq(1).hide();
		$('#menu-nav-main li').eq(2).addClass('first');	
		
		radioplayer.consts.show_cookie_dependent_features = false;
	},	
	
	/**
	 * Generic callback function for cross domain iframes
     *
     * @method xDomainIframeCallback
     *
     * @param objstr
     */
	xDomainIframeCallback : function(objstr) {
		
		var obj = jQuery.parseJSON(objstr);
		
		if (obj.method == 'post-preroll-proceed') {
			radioplayer.services.hideOverlay();
		}
		
	},
	
	
	/**
	 * Collect My Stations and their order
	 * Save to cookie
	 *
	 * @method saveMyStationsOrder
	 */
	saveMyStationsOrder : function() {
		var myStnsString = '';
		for(var i=0; i < radioplayer.settings.presets.length; i++){ 
			myStnsString += (myStnsString == '' ? '' : ',') + i + ':' + radioplayer.settings.presets[i];
		}
		radioplayer.services.saveCookie('ms/s', 'ms', myStnsString);
	},
	
	
	/**
	 * Call an API
	 * This replaces $.getScript, so we can set caching here, rather than globally for all use of jQuery
	 *
	 * @method getAPI
	 */
	getAPI : function(url, callbackfunc) {
		
		$.ajax({
			url: url,
			dataType: "script",
			cache: false,
			success: function(){
				// If there is a callback function defined, call it on success
				if (typeof callbackfunc !== 'undefined') {
					callbackfunc();
				}
			}
		});
		
	},

    /**
     * Radioplayer Analytics
     */
    analytics :  {

        loaded : false,
        $iframe : null,

        /**
         * Init
         *
         * Create the analytics iframe and start the heartbeat.
         *
         * @method analytics.init
         *
         */
        init: function() {
            radioplayer.services.analytics.$iframe = $('<iframe />', {
                src:        radioplayer.consts.iframe.analytics + '?' +
                            'rpid=' + currentStationID +
                            '&cType=' + (audioLive ? 'live' : 'od&odUrl=' + audioFlash[0].audioUrl),
                name: 		'GAAnalytics',
                id:   		'GAAnalytics',
                'class':    'crossdomain-iframe',
                load: function() {
                    if (!!window.postMessage) { // If browser supports post message
                        radioplayer.services.analytics.loaded = true;
                        setTimeout(function() {
                            radioplayer.services.analytics.heartbeat();
                        }, 60*1000); // Start heartbeat after a minute

                        // Send a final heartbeat when the user closes the 
                        window.onbeforeunload = function (e) {
                            radioplayer.services.analytics.heartbeat();
                        };
                    }
                }
            });

            radioplayer.objs.body.append( radioplayer.services.analytics.$iframe );
        },

      /**
       * Send Analytics Event
       *
       * @method analytics.sendEvent
       *
       * @param category
       * @param action
       * @param label
       * @param value
       * @param noninteraction
       */
      sendEvent : function(category, action, label, value, noninteraction) {

            if(radioplayer.services.analytics.loaded) {
                radioplayer.utils.output("iframe loaded");
                if (radioplayer.consts.consolelog) console.dir($('#GAAnalytics')[0]);

                $('#GAAnalytics')[0].contentWindow.postMessage(JSON.stringify({
                    type: 'Event',
                    category: category,
                    action: action,
                    label: label,
                    value: value,
                    noninteraction: noninteraction
                }), "*");
            }
      },

      /**
       * Send Pageview
       *
       * Used for virtual pageviews, to track listening times.
       *
       * @method analytics.sendPageview
       * @param reason Something like 'play', 'pause', 'stop'
       */
      sendPageview : function(reason) {
          if(radioplayer.services.analytics.loaded) {
              $('#GAAnalytics')[0].contentWindow.postMessage(JSON.stringify({
                  type: 'Pageview',
                  reason: reason
              }), "*");
          }
      },

      /**
       * Heartbeat
       *
       * @method analytics.heartbeat
       */
      heartbeat: function() {
          if(radioplayer.services.analytics.loaded) {
              $('#GAAnalytics')[0].contentWindow.postMessage(JSON.stringify({
                  type: 'Heartbeat'
              }), "*");
          }
      }
    },
	
	/**
	 * Receive station list from Radioplayer
	 * Uses v1 style namespace
     *
     * @CrossDomain.prototype._processData
     * @param data {Object}
	 */
	CrossDomain : {
		prototype : {
			_processData : function(data) {
				radioplayer.stnList = data;
				$(radioplayer.services).trigger("stationListSet");
			}
		}
	}
	
};
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
};/**
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
};/**
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
};/**
 * Version: 1.2.22
 *
 * @name controls
 * @description Initialization of EMP and controls
 *
 * > *All intellectual property rights in this Software throughout the world belong to UK Radioplayer,
 * rights in the Software are licensed (not sold) to subscriber stations, and subscriber stations 
 * have no rights in, or to, the Software other than the right to use it in accordance with the 
 * Terms and Conditions at www.radioplayer.co.uk/terms. You shall not produce any derivate works 
 * based on whole or part of the Software, including the source code, for any other purpose other 
 * than for usage associated with connecting to the UK Radioplayer Service in accordance with these 
 * Terms and Conditions, and you shall not convey nor sublicense the Software, including the source 
 * code, for any other purpose or to any third party, without the prior written consent of UK Radioplayer.*
 *
 *
 * @author Gav Richards <gav@gmedia.co.uk>
 * @author Steve Edson <steve@gmedia.co.uk>
 * @author Robin Wilding <robin@wilding.co.uk>
 *
 * @class controls
 * @module controls
 */


radioplayer.controls = {
    /**
     * @property rawDuration
     * @type Int
	 * @default 0
     */
	rawDuration:0,
    /**
     * @property duration
     * @type String
     */
	duration:"00:00",
    /**
     * If the stream is currently muted
	 *
     * @property muted
     * @type Boolean
	 * @default false
     */
	muted:false,
    /**
     * @property currentVolume
     * @type Int
	 * @default 100
     */
	currentVolume:100,
    /**
     * Used to store the volume when muting, so unmuting can restore to the previous volume
	 *
     * @property savedVolume
     * @type Int
     * @default 0
     */
	savedVolume:0,
    /**
     * This current position of a OD clip, in seconds.
	 *
     * @property currentPosition
     * @type Int
	 * @default 0
     */
    currentPosition: 0,
    /**
     * If the volume control is currently locked because a commercial overlay is visible
	 *
     * @property volumeLocked
     * @type Boolean
	 * @default false
     */
	volumeLocked:false,
    /**
     * @property volumeScrubHeight
     * @type Int
     * @default 80
     */
	volumeScrubHeight:44,
    /**
     * @property progressScrubWidth
     * @type Int
     * @default 305
     */
	progressScrubWidth:640,
    /**
     * @property volumeScrubOffsetY
     * @type Int
     * @default 5
     */
	volumeScrubOffsetY:5,
    /**
     * @property dragging
     * @type Boolean
	 * @default false
     */
	dragging:false,
    /**
     * @property isAllLoaded
     * @type Boolean
	 * @default false
     */
	isAllLoaded:false,
    /**
     * @property isLoading
     * @type Boolean
	 * @default false
     */
	isLoading:false,
    /**
     * Boolean to show whether the accessibility buttons have been inserted into the DOM yet.
     *
     * @property insertedODButtons
     * @default false
     * @type Boolean
	 * @default false
     */
    insertedODButtons: false,
    /**
     *
     * Whether or not the stream is playing
     *
     * @property isPlaying
     * @type Boolean
	 * @default false
     */
    isPlaying: false,
    /**
     * Whether the user changed the play state, or if it was sent from the EMP
     *
     * @property userClickedControls
	 * @type Boolean
	 * @default false
     */
    userClickedControls: false,
    /**
     * Whether or not the user can actually hear the stream
     *
     * @propery isListening
     * @type Boolean
	 * @default false
     */
    isListening: false,
    /**
     * @property mouseOverProgress
     * @type Boolean
	 * @default false
     */
	mouseOverProgress:false,
    /**
     * @property volControlLeft
     * @type Int
	 * @default 0
     */
	volControlLeft: 0,
    /**
     * @property volControlWidth
     * @type Int
	 * @default 0
     */
	volControlWidth: 0,
    /**
     * @property muteThres
     * @type Int
	 * @default 15
     */
	muteThres: 15,
    /**
     * @property topEndThres
     * @type Int
	 * @default 6
     */
	topEndThres: 6,
    /**
     * @property volWavesWidth
     * @type Int
	 * @default 0
     */
	volWavesWidth: 0,
    /**
     * @property mouseDownOnVolume
     * @type Int
	 * @default 0
     */
	volumeHover: 0,
    /**
     * @property mouseDownOnVolume
     * @type Boolean
	 * @default false
     */
	mouseDownOnVolume: false,
    /**
     * @property pressPlayPromptShowing
     * @type Boolean
	 * @default false
     */
	pressPlayPromptShowing : false,
	
	
	/**
	 * Show the 'press play' prompt
     *
     * @method showPressPlayPrompt
     */
	showPressPlayPrompt : function() {
		if (!radioplayer.controls.pressPlayPromptShowing) {
			var $pressPlayPrompt = $('<div class="point-prompt press-play-prompt"><div class="prompt-text">' + radioplayer.lang.controls.press_play_prompt + '</div></div>');
			
			$('#controls').append( $pressPlayPrompt );
			radioplayer.controls.pressPlayPromptShowing = true;
	
			$pressPlayPrompt.on('click', function(){
				radioplayer.controls.hidePressPlayPrompt();
			});

            this.hideLoader();

			// When the stream starts playing, hide the prompt
			$(radioplayer.emp).on('startPlaying.hidePlayPrompt', function(){
				radioplayer.controls.hidePressPlayPrompt();
				$(radioplayer.emp).off('startPlaying.hidePlayPrompt');
			});
		}
	},
	
	
	/**
	 * Hide the 'press play' prompt
     *
     * @method hidePressPlayPrompt
     */
	hidePressPlayPrompt : function() {
		if (radioplayer.controls.pressPlayPromptShowing) {
			radioplayer.controls.pressPlayPromptShowing = false;
			$('.press-play-prompt').remove();
		}
	},
	
	
	/**
	 * Format milliseconds into hours:minutes:seconds for displaying progress/duration
     *
     * @method formatPosition
     * @param position {int} Position in Milliseconds
     * @returns {String} Position as human readable string
     */
	formatPosition : function(position) {
		var seconds = Math.floor((position / 1000) % 60) ;
		var minutes = Math.floor(((position / (1000*60)) % 60));
		var hours   = Math.floor(((position / (1000*60*60)) % 24));
		//if(String(hours).length < 2) hours = '0'+hours;
		if(String(minutes).length < 2) minutes = '0'+minutes;
		if(String(seconds).length < 2) seconds = '0'+seconds;
		return hours + ":" + minutes + ":" + seconds;
	},
	
	
	/**
	 * Clean up controls variables - should be called if for resetting the stream in place.
     *
     * @method cleanup
     * @deprecated
	 */
	cleanup : function() {
		this.isAllLoaded = false;
		this.isLoading = false;
	},
	
	
	/*******************************************************************************************************
	 *                                                                                                     *
	 *                                                                                                     *
	 *                                  Volume Controls                                                    *
	 *                                                                                                     *
	 *                                                                                                     *
	 *******************************************************************************************************/
	
	/**
	 * Event handler mute buttons
     *
     * @event mute
	 */
	mute : function () {
		this.muted = !this.muted;
		if (this.muted) {
			this.savedVolume = this.currentVolume;
			radioplayer.emp.setVolume(0);
		} else {
			radioplayer.emp.setVolume(Math.round(this.savedVolume));
		}
	},
	
	/**
	 * Event handler for when the emp's volume has changed
     *
     * @event onVolumeUpdate
     * @param type {string}
     * @param event {Object} Event
	 */
	onVolumeUpdate : function(type, event) {
		this.currentVolume = event.volume;
		
		radioplayer.utils.output('on volume update: ' + event.volume);

		var setClass = '';

        if (event.volume == 0) {
            if (this.isListening && this.isPlaying) {
                radioplayer.controls.onSilent('mute');
                this.isListening = false;
            }
        } else {
            if (!this.isListening && this.isPlaying) { // The user has started / resumed listening
                radioplayer.controls.onAudible();
                this.isListening = true;
            }
        }

		if (event.volume == 0) {
		    setClass = 'muted';
		} else if (event.volume < 20) {
			setClass = 'p20';
		} else if (event.volume < 40) {
			setClass = 'p40';
		} else if (event.volume < 60) {
			setClass = 'p60';
		} else if (event.volume < 80) {
			setClass = 'p80';
		} else {
			setClass = 'p100';
		}
		
		$('#volume-control').removeClass('muted p20 p40 p60 p80 p100').addClass(setClass);
		
	},

    /**
     *
     * Event handler for hovering over the volume controls
     *
     * @event volumeIconMouseEnter
     *
     */
	volumeIconMouseEnter : function() {
		if (!radioplayer.consts.is_iOS && !radioplayer.consts.is_Android && !this.volumeLocked) {
			// Set position and width of volume control
			// We do this now, in case the user has changed the browser zoom level, and these need to be recalculated
			this.volControlLeft = $('#volume-control').offset().left;
			this.volControlWidth = $('#volume-control').outerWidth();
			this.volWavesWidth = this.volControlWidth - this.muteThres - this.topEndThres;
			
			$('#volume-control').addClass('hover');
		}
	},

    /**
     *
     * Event handler for when mouse leaves volume controls
     *
     * @event volumeIconMouseLeave
     *
     */
	volumeIconMouseLeave : function() {
		if (!radioplayer.consts.is_iOS && !radioplayer.consts.is_Android && !this.volumeLocked) {
			$('#volume-control').removeClass('hover muted p20 p40 p60 p80 p100');
				
			// Which off state to show?
			if (radioplayer.controls.muted) {
				$('#volume-control').addClass('muted');
			} else if (radioplayer.controls.currentVolume < 20) {
				$('#volume-control').addClass('p20');
			} else if (radioplayer.controls.currentVolume < 40) {
				$('#volume-control').addClass('p40');
			} else if (radioplayer.controls.currentVolume < 60) {
				$('#volume-control').addClass('p60');
			} else if (radioplayer.controls.currentVolume < 80) {
				$('#volume-control').addClass('p80');
			} else {
				$('#volume-control').addClass('p100');
			}
		}
	},

    /**
     *
     * Handler for moving the mouse in the volume controls.
     *
     * @event volumeIconMouseMove
     *
     * @param e {object} Position
     */
	volumeIconMouseMove : function(e) {
		if (!radioplayer.consts.is_iOS && !radioplayer.consts.is_Android && !this.volumeLocked) {
			/**
			 * When moving over volume control, 
			 * update the visual state and record the value we would set if we were to click
			 */
			
			var cursorX = e.pageX - radioplayer.controls.volControlLeft,
			setClass = '';
			
			if (cursorX < radioplayer.controls.muteThres) {
				// Hovering over mute icon
				// If currently muted, show the mute state
				// Else show the current volume level, so that when we click, we see it change to the muted state
				
				if (radioplayer.controls.mouseDownOnVolume) {
					// Mouse button is currently held down, so show the mute state, to indicate what would happen if we let go
					setClass = 'muted';
					$('#volume-control').attr('title', radioplayer.lang.controls.unmute);
				} else if (radioplayer.controls.muted) {
					// Volume is already muted
					setClass = 'muted';
					$('#volume-control').attr('title', radioplayer.lang.controls.unmute);
				} else if (radioplayer.controls.currentVolume < 20) {
					// Volume is not muted, show the current state (and same for all following values)
					setClass = 'p20';
					$('#volume-control').attr('title', radioplayer.lang.controls.mute);
				} else if (radioplayer.controls.currentVolume < 40) {
					setClass = 'p40';
					$('#volume-control').attr('title', radioplayer.lang.controls.mute);
				} else if (radioplayer.controls.currentVolume < 60) {
					setClass = 'p60';
					$('#volume-control').attr('title', radioplayer.lang.controls.mute);
				} else if (radioplayer.controls.currentVolume < 80) {
					setClass = 'p80';
					$('#volume-control').attr('title', radioplayer.lang.controls.mute);
				} else {
					setClass = 'p100';
					$('#volume-control').attr('title', radioplayer.lang.controls.mute);
				}
				
			} else if (cursorX >= (radioplayer.controls.volControlWidth - radioplayer.controls.topEndThres)) {
				// Hovering over the top end threshold, where we assume level is 100
				setClass = 'p100';
				radioplayer.controls.volumeHover = 100;
				$('#volume-control').attr('title', radioplayer.lang.controls.set_volume_100);
				
			} else {
				// Hovering over the waves
				// Calculate the volume level from 0 to 100
				radioplayer.controls.volumeHover = Math.round(((cursorX - radioplayer.controls.muteThres) / radioplayer.controls.volWavesWidth) * 100);
				
				if (radioplayer.controls.volumeHover < 20) {
					setClass = 'p20';
				} else if (radioplayer.controls.volumeHover < 40) {
					setClass = 'p40';
				} else if (radioplayer.controls.volumeHover < 60) {
					setClass = 'p60';
				} else if (radioplayer.controls.volumeHover < 80) {
					setClass = 'p80';
				} else {
					setClass = 'p100';
				}
				$('#volume-control').attr('title', radioplayer.lang.controls.set_volume);
			}
			
			$('#volume-control').removeClass('muted p20 p40 p60 p80 p100').addClass(setClass);
		
		}
	},
	
	
    /**
     *
     * Volume Icon Mouse Down
     *
     * @event volumeIconMouseDown
     * @param e
     */
	volumeIconMouseDown : function(e) {
		if (!radioplayer.consts.is_iOS && !radioplayer.consts.is_Android && !this.volumeLocked) {
			e.originalEvent.preventDefault ? e.originalEvent.preventDefault() : e.originalEvent.returnValue = false; // 2nd part of this adds support for older IEs
			if (e.which === 1) {
				radioplayer.controls.mouseDownOnVolume = true;
			}
		}
	}, 
	
	
    /**
     *
     * Volume Icon Mouse Up
     *
     * @event volumeIconMouseUp
     * @param e
     */
	volumeIconMouseUp : function(e) {
		if (!radioplayer.consts.is_iOS && !radioplayer.consts.is_Android && !this.volumeLocked) {
			if (e.which === 1) {
				radioplayer.controls.mouseDownOnVolume = false;
			}
		}
	},	
	

    /**
     *
     * Volume Icon Click
     *
     * @event volumeIconClick
     * @param e
     */
	volumeIconClick : function(e) {
		
		if (!radioplayer.consts.is_iOS && !radioplayer.consts.is_Android) {
		
			if (!this.volumeLocked) {
			
				var cursorX = e.pageX - radioplayer.controls.volControlLeft;
				
				if (cursorX < radioplayer.controls.muteThres) {
					// Click the mute icon
					
					radioplayer.utils.output('clicked mute');
					radioplayer.controls.mute();
					
				} else {
					// Click anywhere else in the volume icon
			
					radioplayer.utils.output('SET TO ' + radioplayer.controls.volumeHover);
					
					if (radioplayer.controls.muted) { // if muted, unmute first
						radioplayer.controls.mute();
					}
					
					radioplayer.emp.setVolume(radioplayer.controls.volumeHover);
					
					radioplayer.services.saveCookie("vl/s", "vl", radioplayer.controls.volumeHover);
				}
			
			}
		
		} else {
			// Volume is disabled, so show the iOS prompt
			if (!$('#volume-controls').hasClass('showing-prompt')) {
				
				// Hide the play prompt if it's showing
				radioplayer.controls.hidePressPlayPrompt();
			}
			
		}
	},
	
	
	/**
	 * Used by accessibility buttons to set volume to preset levels
	 *
	 * @method setVolumeTo
	 * @param pc {int} Percentage for new volume value to set
	 */
	setVolumeTo : function(newVol) {
		
		radioplayer.utils.output('access log '+newVol);
		
		if (this.muted) { // unmute, if muted
			this.mute();
		}
		radioplayer.emp.setVolume(Math.round(newVol));
		
		radioplayer.services.saveCookie("vl/s", "vl", newVol);
	},

	
	
	/****************************************************************************************************************************
	 *
	 *
	 * Generic button handling
	 *
	 *
	 */


	/**
	 * Show play button. Called on emp reporting stop /end / pause
     *
     * @method showPlay
     * @param type {String}
     * @param event {Object}
	 */
	showPlay : function(type, event) {
		if ($('#pause').is(':visible')) {
			$("#pause").hide();
		}
		if ($('#stop').is(':visible')) {
			$("#stop").hide();
		}
		if (!$('#play').is(':visible')) {
			$("#play").show();

            if ( $.browser.msie ) {
                $("#play").css('display', 'block');
            }
		}

        if(this.userClickedControls) { // If user triggered event
            $("#play").focus(); // Give focus back to play
        }
        this.userClickedControls = false; // Reset state
	},
	
	/**
	 * Hide play button. Called on emp reporting start / resume
     *
     * @method hidePlay
     * @param type {String}
     * @param event {Object}
	 */
	hidePlay : function(type, event) {

		if (this.isLive()) {
			if ($('#pause').is(':visible')) {
				$("#pause").hide();
			}
			if (!$('#stop').is(':visible')) {
				$("#stop").show();

                if ( $.browser.msie ) {
                    $("#stop").css('display', 'block');
                }
			}
			if ($('#progress-scrubber-load-bar').is(':visible')) {
				$("#progress-scrubber-load-bar").hide();
			}

		} else {
			if (!$('#pause').is(':visible')) {
				$("#pause").show();

                if ( $.browser.msie ) {
                    $("#pause").css('display', 'block');
                }
			}
			if ($('#stop').is(':visible')) {
				$("#stop").hide();
			}
			if (!$('#progress-scrubber-load-bar').is(':visible')) {
				$("#progress-scrubber-load-bar").show();
			}
		}

		if ($('#play').is(':visible')) {
			$("#play").hide();
		}

        // If the user clicked the controls that triggered this event,
        // we need to give focus to the appropriate new button
        if(this.userClickedControls) {
            if(audioLive) {
                $("#stop").focus();
            } else {
                $("#pause").focus();
            }
        }

        this.userClickedControls = false; // Reset the flag back to default

    },
	
	/**
	 * Click heart to add or remove the current station from My Stations
     *
     * @method toggleMyStations
     * @param type {String}
     * @param event {Object}
	 */
	toggleMyStations : function(event) {
			
		event.preventDefault();
		
		if ($('#toggle-mystations').hasClass('in-mystations')) {
			// Current in My Stations, so remove
			radioplayer.mystations.remove(currentStationID, 'head-controls');
			
		} else if (!$('#toggle-mystations').hasClass('animating')) {
			// Not in My Stations, so add
			radioplayer.mystations.add(currentStationID, 'head-controls');
		}

	},

	
	
	/******************************************************************************************************************************
	 *
	 *
	 * On Demand
	 *
	 *
	 */


	/**
	 * Event handler for emp reporting play progress update.
     *
     * @event onPositionUpdate
     * @param type {string}
     * @param event {Object}
	 */
	onPositionUpdate : function(type, event) {

        this.currentPosition = event.position / 1000;

        if(this.isAllLoaded) {
        	if(!$('#progress-scrubber-playback-bar').is(':visible')) $("#progress-scrubber-playback-bar").show();
            $("#progress-scrubber-load-bar").width($("#progress-scrubber-background").width() +"px");
            $("#duration").html(this.formatPosition(event.position) + "/" + this.duration);
        } else {
            if($('#progress-scrubber-playback-bar').is(':visible')) $("#progress-scrubber-playback-bar").hide();
			if($('#progress-scrubber-handle').is(':visible')) $("#progress-scrubber-handle").hide();
        }

        var trackPosition = event.position / this.rawDuration;
        var handlePos = trackPosition * ($("#progress-scrubber-background").width() - $("#progress-scrubber-handle").outerWidth());
        if (!this.dragging) $("#progress-scrubber-handle").css('left', handlePos + "px");

        var progressBarWidth = trackPosition * $("#progress-scrubber-background").outerWidth();
        $("#progress-scrubber-playback-bar").width(progressBarWidth);
	},
	
	/**
	 * Event handler for emp reporting loading progress
     *
     * @event onLoadProgressUpdate
     * @param type {String}
     * @param event {Object}
	 */
	onLoadProgressUpdate : function(type, event) {
		if (this.isLive()) {
			$("#progress-scrubber-load-bar").width("0px");
			
			this.isLoading = false;
			if(this.isLive()) {
				if($('#duration').is(':visible')) $("#duration").hide();
			}
			
			return;
		} 
		$("#progress-scrubber-load-bar").width((this.progressScrubWidth+10)*event.loadProgress+"px");
		
		if (event.loadProgress >= 0.99) {
			this.isAllLoaded = true;
			radioplayer.utils.output("fire emp loaded event");
			$(radioplayer.emp).trigger("loaded");
			$("#progress-scrubber-load-bar").width((this.progressScrubWidth+10)+"px");
		} else {
			this.isAllLoaded = false;
		}
	},
	
	/**
	 * Hide loading graphics in controls - called on emp reporting start
     *
     * @method hideLoaderOnStart
     * @param type {String}
     * @param event {Object}
	 */
	hideLoaderOnStart : function (type, event) {
        this.hideLoader();
		radioplayer.utils.output("begin");
		if(this.isLive()) this.isAllLoaded = true;
	},
	
	/**
	 * Hide loading graphics in controls
     *
     * @method hideLoader
     * @param type {String}
     * @param event {Object}
	 */
	hideLoader : function (type, event) {

        this.isLoading = false;

        if(this.isLive()) {
            $("#live-strip").removeClass('loading');
        } else {
            $('#od-strip #duration').show();
            $("#progress-scrubber-playback-bar").show();
        }
	},
	
	/**
	 * Show loading graphics in controls
     *
     * @method showLoader
     * @param type {String}
     * @param event {Object}
	 */
	showLoader : function(type, event) {

        this.isLoading = true;

        if(this.isLive()) {
            $("#live-strip").addClass('loading');
        } else {
            if ($('#progress-scrubber-handle').is(':visible')) $("#progress-scrubber-handle").hide();
            if ($('#progress-scrubber-playback-bar').is(':visible')) $("#progress-scrubber-playback-bar").hide();
            $("#duration").html(radioplayer.lang.controls.loading);
            if($('#duration').css('display') === "none") $("#duration").show();
        }
	},
	
	/**
	 * EMP callback for when duration has been set (OD)
     *
     * @method setDuration
     * @param type {String}
     * @param event {Object}
	 */
	setDuration : function(type, event) {
        if(!audioLive) { // Only apply duration once clip has fully loaded
            this.rawDuration = event.duration;
            this.duration = this.formatPosition(this.rawDuration);
            this.checkDuration();

            var durationSeconds = Math.floor(event.duration / 1000);

            if(this.insertedODButtons == false) {
                // Generate HTML for skip buttons
                var fiveSecondSkip = '<button type="button" class="access od-skip" data-offset="5" tabindex="0">' + radioplayer.lang.controls.skip_forward_5_seconds + '</button>' +
                        '<button type="button" class="access od-skip" data-offset="-5" tabindex="0">' + radioplayer.lang.controls.skip_back_5_seconds + '</button>',

                    thirtySecondSkip = '<button type="button" class="access od-skip" data-offset="30" tabindex="0">' + radioplayer.lang.controls.skip_forward_30_seconds + '</button>' +
                        '<button type="button" class="access od-skip" data-offset="-30" tabindex="0">' + radioplayer.lang.controls.skip_back_30_seconds + '</button>',

                    oneMinuteSkip = '<button type="button" class="access od-skip" data-offset="60" tabindex="0">' + radioplayer.lang.controls.skip_forward_1_minute + '</button>' +
                        '<button type="button" class="access od-skip" data-offset="-60" tabindex="0">' + radioplayer.lang.controls.skip_back_1_minute + '</button>',

                    fiveMinSkip = '<button type="button" class="access od-skip" data-offset="300" tabindex="0">' + radioplayer.lang.controls.skip_forward_5_minutes + '</button>' +
                        '<button type="button" class="access od-skip" data-offset="-300" tabindex="0">' + radioplayer.lang.controls.skip_back_5_minutes + '</button>',

                    tenMinSkip = '<button type="button" class="access od-skip" data-offset="600" tabindex="0">' + radioplayer.lang.controls.skip_forward_10_minutes + '</button>' +
                        '<button type="button" class="access od-skip" data-offset="-600" tabindex="0">' + radioplayer.lang.controls.skip_back_10_minutes + '</button>',

                    thirtyMinuteSkip = '<button type="button" class="access od-skip" data-offset="1800" tabindex="0">' + radioplayer.lang.controls.skip_forward_30_minutes + '</button>' +
                        '<button type="button" class="access od-skip" data-offset="-1800" tabindex="0">' + radioplayer.lang.controls.skip_forward_30_minutes + '</button>';

                if(durationSeconds > 3600) { // Duration greater than an hour
                    $('#od-strip').append(oneMinuteSkip + tenMinSkip + thirtyMinuteSkip);
                } else if(durationSeconds > 600) { // Between 10 minutes and an hour
                    $('#od-strip').append(thirtySecondSkip + oneMinuteSkip + fiveMinSkip);
                } else if(durationSeconds > 120) { // Between 2 and 10 minutes
                    $('#od-strip').append(fiveSecondSkip + thirtySecondSkip + oneMinuteSkip);
                } else if(durationSeconds > 30) { // Between 30 seconds and 2 minutes
                    $('#od-strip').append(fiveSecondSkip + thirtySecondSkip);
                } else { // Less than 30 seconds
                    $('#od-strip').append(fiveSecondSkip);
                }

                this.insertedODButtons = true;
            }
        }
	},
	
	/**
	 * Ensure that the controls are showing the appropriate state depending on playbackmode and loading progress
     *
     * @method checkDuration
     *
	 */
	checkDuration : function() {
		if (this.isLive()) {
			// LIVE
			
			$('#live-strip').show();
			$('#od-strip').hide();
			
		} else {
			// ON DEMAND
			
			$('#live-strip').hide();
			$('#od-strip').show();
			
			if (this.isAllLoaded) {
				if(!$('#progress-scrubber-playback-bar').is(':visible')) $("#progress-scrubber-playback-bar").show();
			} else {
				if($('#progress-scrubber-handle').is(':visible')) $("#progress-scrubber-handle").hide();
				if($('#progress-scrubber-playback-bar').is(':visible')) $("#progress-scrubber-playback-bar").hide();
				$("#duration").html(radioplayer.lang.controls.loading);
			}
		}

        if(this.isPlaying) { // If the stream is playing, hide the play button
            this.hidePlay();
        }
		
		if(this.isLoading) {
			$("#duration").html(radioplayer.lang.controls.loading);
		}
	},


    /**
	 * Check the playback mode
     *
     * @method isLive
     * @return {Boolean} Whether playback mode is live
	 */
	isLive : function() {
		var isLive = (this.rawDuration === 0 || this.rawDuration == null);
		if (radioplayer.emp.ready) {
			isLive = radioplayer.emp.getPlaybackMode() === "live";
		} else {
			isLive = (this.rawDuration === 0 || this.rawDuration == null);
		}
		return isLive;
	},
	
	/**
	 * Run when EMP is reset
     *
     * @method resetDuration
     * @param type {String}
     * @param event {Object}
	 */
	resetDuration : function(type, event) {
		this.rawDuration = 0;
		this.duration = this.formatPosition(0);
		this.onPositionUpdate(null, {position:0});
		this.checkDuration();
	},
	
	/**
	 * Progress scrub bar handle drag event handler
     *
     * @event seek
     * @param event {Object}
	 */
	seek : function(event) {
		if (this.lastPosition !== $("#progress-scrubber-handle").offset().left ) {

            var handlePosition = $("#progress-scrubber-handle").offset().left - $("#progress-scrubber-background").offset().left;
            this.lastPosition = handlePosition;
            var barArea = $("#progress-scrubber-background").width() - $("#progress-scrubber-handle").outerWidth();
            var percent = handlePosition / barArea;
            var trackPosition = percent * this.rawDuration;

            $("#duration").html(this.formatPosition(trackPosition) + "/" + this.duration);
            $("#progress-scrubber-playback-bar").outerWidth(percent * $("#progress-scrubber-background").width());
        }
	},
	
	/**
	 * Starts the seek - on handle press
     *
     * @event seekStart
	 */
	seekStart : function() {
		this.dragging = true;
		radioplayer.emp.pause();
	},
	
	/**
	 * Stops the seek - on handle release
     *
     * @event seekStop
	 */
	seekStop : function(event) {
		this.dragging = false;
		this.updateSeekPosition(event);
		if ($('#progress-scrubber-handle').is(':visible') && !this.mouseOverProgress) {
			$("#progress-scrubber-handle").fadeOut(200);
			$('#od-title').fadeIn(200);
		}
        radioplayer.services.analytics.sendEvent('Navigation', 'On Demand Slider', window.location.href, null, null);
	},
	
	/**
	 * Seek to a point in the OD clip, defined by 'offset' from the current position
     *
     * @method seekOffset
	 * @param offset {integer}
	 */
	seekOffset : function(offset) {
        var seekTo = this.currentPosition + parseInt(offset);
        var totalDurationSeconds = this.rawDuration / 1000;

        if(seekTo > totalDurationSeconds) {
           seekTo = totalDurationSeconds;
        }

        radioplayer.emp.seek(seekTo);
	},
	
	/**
	 * Sends the new seek position to the EMP
     *
     * @method updateSeekPosition
     * @param event {Object}
	 */
	updateSeekPosition : function(event) {
        var barArea = $("#progress-scrubber-background").width() - $("#progress-scrubber-handle").outerWidth();
        var percent = this.lastPosition / barArea;
        var seekPosition = (percent * this.rawDuration) / 1000;

        radioplayer.utils.output(seekPosition);
		seekPosition = Math.max(seekPosition, 0);
		radioplayer.emp.seek(seekPosition);
	},
	
	/**
	 * Progress bar click sends new seek position to EMP
     *
     * @event progressBarClick
     * @param event {Object}
	 */
	progressBarClick : function (event) { 
		if(this.isLive() || !this.isAllLoaded) return; // Don't do anything if live, or stream not fully loaded

        var relClickPosition = event.pageX - $("#progress-scrubber-background").offset().left;
        var lowerEdge = $('#progress-scrubber-handle').outerWidth() / 2;
        var upperEdge = $("#progress-scrubber-background").outerWidth() - ($('#progress-scrubber-handle').outerWidth() / 2);
        var seekPosition = 0;

        if(relClickPosition < lowerEdge) { // Clicked in lower bound
            seekPosition = 0;
        } else if(relClickPosition > upperEdge) { // Clicked in upper bound
            seekPosition = 1;
        } else { // Clicked inside the progress bar range
            seekPosition = (relClickPosition - $('#progress-scrubber-handle').outerWidth() / 2) / ($("#progress-scrubber-background").outerWidth() - $('#progress-scrubber-handle').outerWidth() / 2);
        }

        var trackPosition = (seekPosition * this.rawDuration) / 1000;

        radioplayer.emp.seek(trackPosition);
        radioplayer.services.analytics.sendEvent('Navigation', 'On Demand Slider', window.location.href, null, null);
		  
		  if ($('#progress-scrubber-handle').is(':hidden')) {
            this.mouseOverProgress = true;
            $('#progress-scrubber-handle').stop(true, true).fadeIn(200);
            $('#od-title').stop(true, true).fadeOut(200);
        }
	},

    /**
     * Mouse Enter Progress
     *
     * @method mouseEnterProgress
     *
     */
	mouseEnterProgress : function() {
		if(this.isLive() || !this.isAllLoaded) return;
		
		this.mouseOverProgress = true;
		$('#progress-scrubber-handle').stop(true, true).fadeIn(200);
		$('#od-title').stop(true, true).fadeOut(200);
	},

    /**
     *
     * Mouse Leave Progress
     *
     * @method mouseLeaveProgress
     *
     */
	mouseLeaveProgress : function() {
		if(this.isLive() || !this.isAllLoaded) return;
		
		this.mouseOverProgress = false;
		if (!this.dragging) {
			$('#progress-scrubber-handle').stop(true, true).fadeOut(200);
			$('#od-title').stop(true, true).fadeIn(200);
		}
	},

    /**
     * Log security error
     *
     * @event logSecurityError
     *
     * @param type {String}
     * @param event {Object}
     */
	logSecurityError : function(type, event) {
		radioplayer.utils.output("EMP has encountered a security error, audio may not play.");
	},
	
	/**
	 * Callback for when a stream reaches it's end (from EMP)
	 *
	 * @event onEnd
     * @param type {String}
     * @param event {Object}
	 */
	onEnd : function (type, event) {
		radioplayer.utils.output("end");
        this.onPositionUpdate(null, { position: this.rawDuration }); // Update the seek bar to the end


	},


    /**
     * Called when something occurs that would cause the user to be able to hear the stream
     *
     * @event onAudible
     */
    onAudible: function() {
        if(this.isListening == false && this.currentVolume > 0) {
            radioplayer.services.analytics.sendPageview("");
            this.isListening = true;
        }
    },

    /**
     * On Silent
     *
     * @event onSilent
     * @param reason
     */
    onSilent: function(reason) {
        if(this.isListening == true) {
            radioplayer.services.analytics.sendPageview("/" + reason);
            this.isListening = false;
        }
    },

    /**
     * On Player Start
     *
     * @event onStart
     */
    onStart: function() {
        this.isPlaying = true;
        this.hideLoader();
        this.hideErrorMsg();
    },

    /**
     * On Player Stop
     *
     * @event onStop
     */
    onStop: function() {
        this.isPlaying = false;
		
		if (audioLive && nowPlayingSource == "stream") {
			// For live streams with data locked to stream metadata, on stop we should reset the ticker to station name
			radioplayer.playing.updateText(currentStationName, "");
		}
    },

    /**
     * User Clicked Pause Button
     *
     * @event onClickPause
     */
    onClickPause: function() {
        this.userClickedControls = true;
    },

    /**
     * User Clicked Play Button
     *
     * @event onClickPlay
     */
    onClickPlay: function() {
    	if (audioLive) {
    		this.showLoader();
    	}
        this.userClickedControls = true;
    },

    /**
     * User Clicked Stop Button
     *
     * @event onClickStop
     */
    onClickStop: function() {
    	if (audioLive) {
    		this.hideLoader();
    	}
        this.userClickedControls = true;
    },

    /**
     * Triggered when the browser / flash EMPs do not support the current stream
     *
     * @event onNoSupport
     */
    onNoSupport: function() {
        radioplayer.utils.output("The EMP player does not support the audio format. (Varies by browser and whether Flash available.)");
        this.hideLoader();
        this.showPlay();
        this.showErrorMsg(radioplayer.lang.stream_error.device_incompatible);
    },

    /**
     * When the EMP has an error that cannot be resolved
     *
     * E.g. dead streams
     *
     * @event onError
     */
    onError: function() {
		this.hideLoader();
        this.showPlay();
        radioplayer.emp.resetAttemptCount();
		this.showErrorMsg(radioplayer.lang.stream_error.unavailable);
    },
	
    /**
     * Show a stream error message
     *
     * @method showErrorMsg
     */
	showErrorMsg : function(message) {
		if(!$('.radioplayer-erroroverlay').length) $('.radioplayer-head').after('<div class="radioplayer-erroroverlay">' + message + '</div>');
	},
	
    /**
     * Hide any showing stream error message
     *
     * @method hideErrorMsg
     */
	hideErrorMsg : function() {
		$('.radioplayer-erroroverlay').remove();
	},
	
	/**
	 * Recalculates the width of the progress scrubber based on the now playing strip width.
	 *
	 * @method resizeProgressScrubber
	 */
	resizeProgressScrubber : function() {
		var progressScrubberWidth = $('#od-strip').parent().width() - $("#duration").width() - 5;
		$("#progress-scrubber-background").width(progressScrubberWidth +"px");
	},

	/**
	 * Initialise the controls
     *
     * @method init
     * @contructor
	 */
	init : function() {
		// Localisation
		$('#controls h2').html(radioplayer.lang.controls.player_controls);
		$('#controls #play span').html(radioplayer.lang.controls.play);
		$('#controls #play').attr('title', radioplayer.lang.controls.play);
		$('#controls #pause span').html(radioplayer.lang.controls.pause);
		$('#controls #pause').attr('title', radioplayer.lang.controls.pause);
		$('#controls #stop span').html(radioplayer.lang.controls.stop);
		$('#controls #stop').attr('title', radioplayer.lang.controls.stop);
		$('#controls #duration').html(radioplayer.lang.controls.loading);
		$('#volume-mute').html(radioplayer.lang.controls.set_volume);
        $('#volume-1').html(radioplayer.lang.controls.set_volume_20);
        $('#volume-2').html(radioplayer.lang.controls.set_volume_40);
        $('#volume-3').html(radioplayer.lang.controls.set_volume_60);
        $('#volume-4').html(radioplayer.lang.controls.set_volume_80);
        $('#volume-5').html(radioplayer.lang.controls.set_volume_100);

        $('.loading-indicator').html(radioplayer.lang.controls.loading);
		
		// register event callbacks
		$(radioplayer.emp).on('update', $.proxy(this.onPositionUpdate, this))
		                  .on('volumeSet', $.proxy(this.onVolumeUpdate, this))
		                  .on('pausePlaying', $.proxy(this.showPlay, this))
		                  .on('ended', $.proxy(this.showPlay, this))
		                  .on('ended', $.proxy(this.onEnd, this))
		                  .on('stopped', $.proxy(this.showPlay, this))
		                  .on('cleanedup', $.proxy(this.resetDuration, this))
		                  .on('cleanedup', $.proxy(this.showLoader, this))
		                  .on('startPlaying', $.proxy(this.hidePlay, this))
		                  .on('startPlaying', $.proxy(this.hideLoaderOnStart, this))
		                  .on('resumed', $.proxy(this.hidePlay, this))
		                  .on('durationSet', $.proxy(this.setDuration, this))
		                  .on('loadProgress', $.proxy(this.onLoadProgressUpdate, this))
		                  .on('securityError', $.proxy(this.logSecurityError, this))

        // Events to detect whether the user is actually listening or not. i.e. playing / stopped / muted
                          .on('startPlaying', $.proxy(this.onAudible, this))
                          .on('resumed', $.proxy(this.onAudible, this))
                          .on('pausePlaying', $.proxy(this.onSilent, this, 'pause'))
                          .on('stopped', $.proxy(this.onSilent, this, 'stop'))
                          .on('ended', $.proxy(this.onSilent, this, 'stop'))

        // Events to set whether the stream is playing or not, regardless of whether the user can hear it.
                          .on('startPlaying', $.proxy(this.onStart, this))
                          .on('pausePlaying', $.proxy(this.onStop, this))
                          .on('stopped', $.proxy(this.onStop, this))
                          .on('ended', $.proxy(this.onStop, this))
                          .on('error', $.proxy(this.onError, this))
                          .on('noSupport', $.proxy(this.onNoSupport, this))

		// Metadata events
		                  .on('metadata', $.proxy(radioplayer.playing.metadataReceived, this))
		                  .on('id3', $.proxy(radioplayer.playing.id3Received, this))
		                  .on('header', $.proxy(radioplayer.playing.headerReceived, this));

		//register control behaviours.
        $('#pause').on('click', $.proxy(this.onClickPause, this));
        $('#play').on('click', $.proxy(this.onClickPlay, this));
        $('#stop').on('click', $.proxy(this.onClickStop, this));

		$('#pause').on('click', $.proxy(radioplayer.emp.pause, radioplayer.emp));
		$('#play').on('click', $.proxy(radioplayer.emp.resume, radioplayer.emp));
		$('#stop').on('click', $.proxy(radioplayer.emp.stop, radioplayer.emp));

        // Accessibility buttons
		$('#volume-mute').on('click', $.proxy(this.mute, this));
		$('#volume-1').on('click', $.proxy(this, 'setVolumeTo', 20));
		$('#volume-2').on('click', $.proxy(this, 'setVolumeTo', 40));
		$('#volume-3').on('click', $.proxy(this, 'setVolumeTo', 60));
		$('#volume-4').on('click', $.proxy(this, 'setVolumeTo', 80));
		$('#volume-5').on('click', $.proxy(this, 'setVolumeTo', 100));
		
		$('#volume-control').on('mouseenter', $.proxy(this.volumeIconMouseEnter, this))
							.on('mouseleave', $.proxy(this.volumeIconMouseLeave, this))
							.on('mousemove', $.proxy(this.volumeIconMouseMove, this))
							.on('mousedown', $.proxy(this.volumeIconMouseDown, this))
							.on('mouseup', $.proxy(this.volumeIconMouseUp, this))
							.on('click', $.proxy(this.volumeIconClick, this));
		
		$('#toggle-mystations').on("click", $.proxy(this.toggleMyStations, this));
		
		$("#progress-scrubber-handle").draggable({axis: 'x', containment: "#progress-scrubber-background" }) // [$("#progress-scrubber-background").offset().left, this.volumeScrubOffsetY, $("#progress-scrubber-background").offset().left + this.progressScrubWidth, this.volumeScrubOffsetY] });
		                    .on('drag', $.proxy(this.seek, this))
		                    .on('dragstart', $.proxy(this.seekStart, this))
		                    .on('dragstop', $.proxy(this.seekStop, this));
		
		$("#progress-scrubber-background").on('click', $.proxy(this.progressBarClick, this))
										  .on('mouseenter', $.proxy(this.mouseEnterProgress, this))
										  .on('mouseleave', $.proxy(this.mouseLeaveProgress, this));
				
		// Accessibility buttons for skipping on demand						  
		$('#od-strip').on('click', 'button.od-skip', function(){
			var secsOffset = $(this).attr('data-offset');
            radioplayer.controls.showLoader();
            radioplayer.controls.seekOffset(secsOffset);
		});
		
		$(document).bind("contextmenu", function(e) {
			radioplayer.utils.output("version:"+radioplayer.emp.getVersion()); 
		});
	}
};
/**
 * Version: 1.2.22
 * 
 * @name overlay
 * @description Handling of the opening and closing of overlays
 *
 * > *All intellectual property rights in this Software throughout the world belong to UK Radioplayer,
 * rights in the Software are licensed (not sold) to subscriber stations, and subscriber stations 
 * have no rights in, or to, the Software other than the right to use it in accordance with the 
 * Terms and Conditions at www.radioplayer.co.uk/terms. You shall not produce any derivate works 
 * based on whole or part of the Software, including the source code, for any other purpose other 
 * than for usage associated with connecting to the UK Radioplayer Service in accordance with these 
 * Terms and Conditions, and you shall not convey nor sublicense the Software, including the source 
 * code, for any other purpose or to any third party, without the prior written consent of UK Radioplayer.*
 *
 *
 * @author Gav Richards <gav@gmedia.co.uk>
 *
 * This file calls:
 * @ mystations
 * @ search
 * @ playing
 *
 * This file is called by:
 *
 * @extends init
 * @extends mystations
 * @extends search
 * @extends playing
 *
 * @class overlay
 * @module overlay
 */

radioplayer.overlay = {
	
	inactivityTimer : null,
	inactivityCount : 45*1000,
	
	scrollSettleTimer : null,
	
	openedOnce : false,
	
	inViewThreshold : 100,
	
	detectScrolling : true,
	
	tabShowingName : '',
	
	azDivideHeight : 0,
	
    /**
     * @requestFailTimer
     */
	requestFailTimer : null,
	
    /**
     * @property requestFailed
     * @type Boolean
     * @default false
     */
	requestFailed : false,
	
	/**
	 * Initialize
     *
     * @method init
	 */
	init : function() {
		
		radioplayer.objs.overlayContainer = $('.overlay-container');

		$('.radioplayer').on('click', '.overlay-btn', function(e){
			/**
			 * Click menu button
			 */
			
			e.preventDefault();
			
			if (radioplayer.objs.overlayContainer.is(':visible')) {
				// Overlay is visible, so hide
				
				radioplayer.overlay.hide();
                radioplayer.services.analytics.sendEvent('Navigation', 'Main Menu', 'Close Menu Button', null, null);

			} else {
				// Show menu
                radioplayer.services.analytics.sendEvent('Navigation', 'Main Menu', 'Menu button', null, null);

				radioplayer.overlay.show(radioplayer.lang.general.close_menu);
				radioplayer.objs.body.addClass('showing-menu');
				
				if (!radioplayer.overlay.openedOnce) {
					// Not opened the menu before, so initiate
					radioplayer.overlay.openedOnce = true;
					
					if (radioplayer.settings.presets.length > 0) {
						// We have My Stations, so open that tab
						radioplayer.overlay.selectTab($('#menu-nav-main li:eq(0)'));
					} else {
						// Else open the A-Z List tab
						radioplayer.overlay.selectTab($('#menu-nav-main li:eq(3)'));
					}
				} else {
					// We're opening menu again - re-select previous tab
					// For older browsers, this will restore scroll position in A-Z list
					// It will also refresh Recommendations
					$prevSelTab = $('#menu-nav-main li.on');
					$prevSelTab.removeClass('on');
					radioplayer.overlay.selectTab($prevSelTab);
				}
				
			}
			
		}).on('click', '.tabs #menu-nav-main li a', function(e){
			/**
			 * Click menu or search tab
			 */
			
			e.preventDefault();
			
			radioplayer.overlay.selectTab($(this).parent());
			
		}).on('click', '.tabs #search-nav-main li a', function(e){
			/**
			 * Click menu or search tab
			 */
			
			e.preventDefault();
			
			radioplayer.overlay.selectTab($(this).parent());
			
		}).on('click', '#station-logo-link', function(e){
			/**
			 * Click station logo while overlay is showing hides overlay
			 */
		
			if (radioplayer.objs.body.hasClass('showing-overlay')) {
				
				e.preventDefault();
				
				radioplayer.overlay.hide();
				
				return false;
				
			}		
			
		});
		
		radioplayer.objs.body.on('keyup', function(event){
			/**
			 * Press escape while overlay is visible hides overlay
			 */
			
			if (event.which == 27 && radioplayer.objs.body.hasClass('showing-overlay')) {
				radioplayer.overlay.hide();
			}
			
		});
		
		
		radioplayer.objs.overlayContainer.on('click', '.menu-container .alphabet li a', function(e){
			/**
			 * Click letter on a-z list
			 */
			 
			e.preventDefault();
			
			var $a = $(this),
				$tabLI = $a.parent();
				tabIndex = $('.menu-container .alphabet li').index($tabLI),
				letter = $a.html();
				
			radioplayer.utils.output('clicked letter ' + letter);
				
			letter = letter.toLowerCase();
			
			// Scroll to the letter
			radioplayer.overlay.detectScrolling = false;
			
			$("#azlist-container").scrollTo("#letter-divide-" + (letter == '#' ? 'num' : letter), {
				axis: "y", duration: 500, onAfter: function(){
					//radioplayer.utils.output('lazyLoad 1');
					radioplayer.overlay.detectScrolling = true;
					radioplayer.overlay.lazyLoad($('#azlist-container'));
					$('#azlist-container').data('scrollpos', $('#azlist-container').scrollTop());
				}
			});
			
			if (!$tabLI.hasClass('on')) {
				// Not already on
				
				$('.menu-container .alphabet li').removeClass('on');
				
				$tabLI.addClass('on');
				
				// Save to cookie
				radioplayer.services.saveCookie("stationlistprefix/s", "stationlistprefix", letter);		
			}
			
		
		}).on("click", ".toggle-mystations button:not(.animating)", function(e){
			/**
			 * Bind add/remove from My Stations toggle
			 */
			
			e.preventDefault();
			
			var $iconCont = $(this).parent(),
				$overlayItem = $iconCont.parents('.overlay-item'),
				rpId = $overlayItem.data('stationid'),
				containerId = $overlayItem.parent().attr('id');
			
			if ($overlayItem.hasClass('in-mystations')) {
				// Current in My Stations, so remove
				radioplayer.mystations.remove(rpId, containerId, $iconCont);
				
			} else {
				// Not in My Stations, so add
				radioplayer.mystations.add(rpId, containerId, $iconCont);
			}
			
			
		}).on("click", ".more-toggle", function(e){
			/**
			 * Bind click event to show expanded content
			 * Apply this to any result for this station ID regardless of result type
			 */
			
			e.preventDefault();
			
			var $itemObj = $(this).parent().parent();
			
			// Is this station expanded?
			if ($itemObj.hasClass("expanded")) {
				/**
				 * Collapse Me
				 */
				
				// Remove classes
				$itemObj.removeClass("expanded").prev().removeClass("prevExpanded");
				
				// Animate extra content closed
				$itemObj.children(".overlay-item-extra-cont").slideUp(250);
				
				// Change accessability text
				$(this).attr("title", radioplayer.lang.search.show_information).html('<span>' + radioplayer.lang.search.show_information + '</span>');
				
				// IE7 bug - the next item doesn't redraw in place, so we force it
				if ($.browser.msie && $.browser.version == 7) {
					$itemObj.next().hide().show();
				}
				
			} else {
				/**
				 * Expand Me
				 */
				 
				// First, if there is another station already expanded, collapse it and revert accessability text
				radioplayer.overlay.collapseResult();
				
				// Add classes to this item and the previous one
				$itemObj.addClass("expanded").prev().addClass("prevExpanded");
				
				// Is this the last item in the list?
				var lastChild = $itemObj.is(':last-child');
				
				// Animate extra content open
				$itemObj.children(".overlay-item-extra-cont").slideDown(250, function(){
					if (lastChild) {
						// We've expanded the last item in this list, so scroll down so we can see it
						$itemObj.parent().scrollTo("100%", {axis: "y", duration: 200});
					}
				});
				
				// Change accessability text
				$(this).attr("title", radioplayer.lang.search.hide_information).html('<span>' + radioplayer.lang.search.hide_information + '</span>');
				
			}
			
		}).on("click", ".overlay-item-link", function(e) {
            e.preventDefault();

            var section = $(this).parents('.overlay-item').data('section'),
            	sectionName = "",
            	stationId = $(this).parents('.overlay-item').data('stationid'),
            	href = $(this).attr('href');

            if(section == "recommend") {
                sectionName = "Recommended";
            } else if(section == "history") {
                sectionName = "Recent Menu";
            } else if(section == "az") {
                sectionName = "A-Z Menu";
				
				// For A-Z list, append the letter to query string
				href += (href.indexOf("?") > 0 ? "&" : "?") + "stationletterprefix=" + $(this).data('letter');
				
            } else if(section == "search") {
                sectionName = "search";
            } else if(section == "mystations") {
                sectionName = "Favourites";
            }

			radioplayer.overlay.sidewaysNavigate(sectionName, stationId, href);
			
		}).on("click", "#menu-nav-toggle", function(e) {
			e.preventDefault();			
			radioplayer.overlay.hideShowNavigationMenu();			
		});

		
		/**
		 * If we're on iOS/Android, show the the 'press play' message
		 */
		
		if (radioplayer.consts.is_iOS || radioplayer.consts.is_Android) {
			
			radioplayer.controls.showPressPlayPrompt();
			
			$('#controls').addClass('no-volume');
			$('#volume-control').addClass('hidden');
		}
		
		/**
		 * Localisation
		 */

		$('#menu-nav-main li').eq(0).find('a span').html(radioplayer.lang.menu_tabs.tab_1_text);

		$('#menu-nav-main li').eq(1).find('a span').html(radioplayer.lang.menu_tabs.tab_2_text);

		$('#menu-nav-main li').eq(2).find('a span').html(radioplayer.lang.menu_tabs.tab_3_text);

		$('#menu-nav-main li').eq(3).find('a span').html(radioplayer.lang.menu_tabs.tab_4_text);
		
	},
	
	
	/**
	 * Sideways navigation to another console
	 *
	 * @method sidewaysNavigate
	 *
	 * @param {String} sectionName
	 * @param {String} stationId
	 * @param {String} href
	 */
	sidewaysNavigate : function(sectionName, stationId, href) {
		
		if (sectionName == "search") { // Search has a separate event
			radioplayer.services.analytics.sendEvent('Search', 'Full Search', stationId.toString(), null, null);
		} else {
			radioplayer.services.analytics.sendEvent('Navigation', sectionName, stationId.toString(), null, null);
		}

		setTimeout(function() {
			window.location.href = href;
		}, 100);
		
	},
	
	
	/**
	 * Show the overlay
     *
     * @method show
	 *
	 * @param {String} menu_close_text
     */
	show : function(menu_close_text) {
		
		// if overlay is already showing, then make sure appropriate events are called
		var overlayAlreadyShowing = false;
		
		if (radioplayer.objs.body.hasClass('showing-overlay')) {
			
			overlayAlreadyShowing = true;
			
			radioplayer.objs.body.removeClass('showing-menu showing-search showing-suggest');
			
			radioplayer.overlay.hidingTab();
			
		}
		
		radioplayer.objs.body.addClass('showing-overlay');
		
		// Update menu button title and text
		$('.radioplayer-globalnav .menu-btn').attr('title', menu_close_text).find('span').html(menu_close_text);
		
		// Update station logo title attribute
		$('#station-logo-link').attr('title', menu_close_text);
		
		clearTimeout(radioplayer.inactivityTimer);
		radioplayer.inactivityTimer = setTimeout(radioplayer.overlay.hide, radioplayer.overlay.inactivityCount);
		radioplayer.playing.stopUpdating();
		
		if (!overlayAlreadyShowing) {
			
			// Detect activity
			radioplayer.objs.overlayContainer.on('click.activity', function(){
				radioplayer.overlay.resetInactivity();
			});
			
			radioplayer.objs.overlayContainer.find('.scrollable-wrapper').on('scroll.scroll-overlays', function(){
				
				if (radioplayer.overlay.detectScrolling) {
				
					var $scrollableObj = $(this);
					
					// Store scroll position, so in certain browsers we can restore this when opening tab
					$scrollableObj.data('scrollpos', $scrollableObj.scrollTop());
					
					clearTimeout(radioplayer.overlay.scrollSettleTimer);
					radioplayer.overlay.scrollSettleTimer = setTimeout(function(){
					
						//radioplayer.utils.output('lazyLoad 2');
						radioplayer.overlay.lazyLoad($scrollableObj);
					
						radioplayer.overlay.resetInactivity();
					
					}, 250);
				
				}
				
			});
			
		}
		
	},
	
	
	/**
	 * Hide the overlay
     *
     * @method hide
     */
	hide : function() {
		// This is called from a setTimeout() so for some reason we have to use 'radioplayer.overlay' rather than 'this'
		
		// Detect activity
		radioplayer.objs.overlayContainer.off('click.activity');
		
		radioplayer.objs.overlayContainer.find('.scrollable-wrapper').off('scroll.scroll-overlays');
		
		if ($.browser.msie && $.browser.version == 7 && radioplayer.objs.body.hasClass('showing-search')) {
			// Clear search divs, to avoid redraw issues in IE 7
			radioplayer.objs.searchContainer.find('.tab-container').html('').removeClass('loaded has-error');
		}
		
		radioplayer.objs.body.removeClass('showing-menu showing-search showing-suggest showing-overlay');
		
		// Update menu button title and text
		$('.radioplayer-globalnav .menu-btn').attr('title', radioplayer.lang.general.open_menu).find('span').html(radioplayer.lang.general.open_menu);
		
		// Reset station logo title attribute
		$('#station-logo-link').removeAttr('title');
		
		clearTimeout(radioplayer.inactivityTimer);
		radioplayer.playing.startUpdating();
		
		if ($('#search-clear').is(':visible')) {
			$('#search-clear').hide();
			$('#search-button').show();
		}
		
		//radioplayer.utils.output('hiding overlay');
		radioplayer.overlay.hidingTab();
		
		// IE7 bug - the radioplayer-body doesn't redraw in place, so we force it
		if ($.browser.msie && $.browser.version == 7) {
			$('.radioplayer-body').hide().show();
		}
		
	},
	
	
	/**
	 * Reset the inactivity timer
     *
     * @method resetInactivity
     */
	resetInactivity : function() {
		//radioplayer.utils.output('reset inactivity timer');
		clearTimeout(radioplayer.inactivityTimer);
		radioplayer.inactivityTimer = setTimeout(radioplayer.overlay.hide, radioplayer.overlay.inactivityCount);		
	},
	
	
	/**
	 * Lazy load the visible contents of a container 
     *
     * @method lazyLoad
     *
	 * @param $cont
     */
	lazyLoad : function($cont) {
		
		//radioplayer.utils.output('lazy loading...');
		
		var currentViewTop = $cont.scrollTop(), // - this.inViewThreshold, -- removed threshold from above, so it doesnt load stations above and push down visible stations
			currentHeight = $cont.height(),
			currentViewBottom = $cont.scrollTop() + currentHeight + this.inViewThreshold;
		
		var loadMetaIds = [];
		
		$cont.find('.overlay-item.not-loaded-img').each(function(i, element){

            $overlayItem = $(this);
			
			var eleTopEdge = currentViewTop + $overlayItem.position().top,
				eleBotEdge = currentViewTop + $overlayItem.position().top + $overlayItem.outerHeight();
			
			if ((eleTopEdge < currentViewBottom && eleTopEdge >= currentViewTop)
			 || (eleBotEdge > currentViewTop && eleBotEdge < currentViewBottom)) {

				// This element is visible
				//radioplayer.utils.output('element, top: ' + eleTopEdge + ', bottom: ' + eleBotEdge + ', stnid ' + $(element).data('stationid'));
                $overlayItem.removeClass('not-loaded-img'); // in-view

                // Load image
                var $img = $overlayItem.find('.overlay-item-img img');
				if ($img.data('src')) {
					$img.attr('src', $img.data('src')).removeAttr('data-src');
				}

				if ($overlayItem.hasClass('not-loaded-meta') && !$overlayItem.hasClass('checking-for-meta')) {
					
					loadMetaIds.push( $overlayItem.attr('data-stationid') );
	
					$overlayItem.removeClass('not-loaded-meta').addClass('checking-for-meta');
				
				}
					
			}
		
		});
		
		if (loadMetaIds.length > 0) {
			// Load multiple stations meta data in one request
			var csvIds = loadMetaIds.join(",");
			
			radioplayer.services.getAPI(radioplayer.consts.api.onAir + 
										"?rpIds=" + csvIds + 
										"&callback=radioplayer.overlay.receiveStnNowInfo");
		}
		
	},
	
	
	/**
	 * Select a display a tab - both menu and search
     *
     * @method selectTab
     *
	 * @param $tabLI
     */
	selectTab : function($tabLI) {
		
		var tabContent = $tabLI.data('content'),
			$tabList = $tabLI.parent(),
			tabIndex = $tabList.children().index($tabLI),
			$tabListDiv = $tabList.parent(),
			$tabsWrapper = $tabListDiv.next(),
			$tabsContainers = $tabsWrapper.children('.tab-container');
		
		if (!$tabLI.hasClass('on')) {
			// Not already on
			
			$tabList.children('li').removeClass('on no-divide');
			
			$tabsContainers.removeClass('showing');
			
			var $tabCont = $tabsContainers.eq(tabIndex);
			
			$tabCont.addClass('showing');
			
			$tabList.children('li').css('border-bottom', '0px');
			
			$tabLI.css('border-bottom', '2px solid ' + $tabLI.data('color'));
			
			this.hideMenuSpinner(); // hide, in case it is still showing from clicking another tab that hasn't finished loading
			
			if (radioplayer.overlay.tabShowingName != '') {
				this.hidingTab();
			}
			
			// Set the width of the sticky divide
			if (!($.browser.msie && $.browser.version == 7)) {
				radioplayer.overlay.resizeStickyDivide();
			}
			
			this.showingTab(tabContent, $tabCont);
			
			$('.menu-container .tabs').scrollTo($tabLI);
			
		}
		
	},
	
	
	/**
	 * Called when a tab is being shown
     *
     * @method showingTab
     *
	 * @param id
     * @param $tabCont
     */
	showingTab : function(id, $tabCont) {
		
		this.tabShowingName = id;
		
		if (id == 'azlist') {

            radioplayer.services.analytics.sendEvent('Navigation', 'Main Menu', 'A - Z List', null, null);

			if (!$tabCont.hasClass('loaded')) {
				// Initialise A-Z List
				$tabCont.addClass('loaded');
				radioplayer.overlay.requestAZList();
				
			} else {
				if ($.browser.msie) {
					// IE resets scroll position when hiding div, so we need to restore this
					$('#azlist-container').scrollTop($('#azlist-container').data('scrollpos'));
				}
			}
			$('#menu-nav-toggle li').eq(0).find('a').html(radioplayer.overlay.getMenuToggleLabel(radioplayer.lang.menu_tabs.tab_4_text));
			// Collapse the navigation menu by default
			radioplayer.overlay.hideNavigationMenu();
		} else if (id == 'mystations') {
            radioplayer.services.analytics.sendEvent('Navigation', 'Main Menu', 'My Stations', null, null);
            if(!$tabCont.hasClass('loaded')) {
			    // Initialise My Stations
			    $tabCont.addClass('loaded');
			    radioplayer.mystations.populateList(radioplayer.settings.presets, 'mystations');
            }
				$('#menu-nav-toggle li').eq(0).find('a').html(radioplayer.overlay.getMenuToggleLabel(radioplayer.lang.menu_tabs.tab_1_text));
				// Collapse the navigation menu by default
				radioplayer.overlay.hideNavigationMenu();
		} else if (id == 'history') {
            radioplayer.services.analytics.sendEvent('Navigation', 'Main Menu', 'Recent', null, null);
            if(!$tabCont.hasClass('loaded')) {
                // Initialise History
                $tabCont.addClass('loaded');
                radioplayer.mystations.populateList(radioplayer.settings.history, 'history');
            }
				$('#menu-nav-toggle li').eq(0).find('a').html(radioplayer.overlay.getMenuToggleLabel(radioplayer.lang.menu_tabs.tab_2_text));
				// Collapse the navigation menu by default
				radioplayer.overlay.hideNavigationMenu();
		} else if (id == 'recommended') {
			// Initialise Recommended List
			$tabCont.removeClass('has-error');
			radioplayer.overlay.requestRecommend();
         radioplayer.services.analytics.sendEvent('Navigation', 'Main Menu', 'Recommended', null, null);
			$('#menu-nav-toggle li').eq(0).find('a').html(radioplayer.overlay.getMenuToggleLabel(radioplayer.lang.menu_tabs.tab_3_text));
			// Collapse the navigation menu by default
			radioplayer.overlay.hideNavigationMenu();
		} else if (id == 'searchlive') {
			// Live Search
			$('.search-container .tabs #search-nav-toggle li').eq(0).find('a').html(radioplayer.overlay.getMenuToggleLabel(radioplayer.lang.search.tab_live));			
			if(!$tabCont.hasClass('loaded')) {				
				$tabCont.addClass('loaded');
				radioplayer.search.tabRequest('live');			
			}
			// Collapse the navigation menu by default
			radioplayer.search.hideNavigationMenu();
		} else if (id == 'searchod') {
			// OD Search
			$('.search-container .tabs #search-nav-toggle li').eq(0).find('a').html(radioplayer.overlay.getMenuToggleLabel(radioplayer.lang.search.tab_catchup));
			if(!$tabCont.hasClass('loaded')) {
				$tabCont.addClass('loaded');
				radioplayer.search.tabRequest('od');			
			}
			// Collapse the navigation menu by default
			radioplayer.search.hideNavigationMenu();
		} else if (id == 'searchall') {
			// All Search
			$('.search-container .tabs #search-nav-toggle li').eq(0).find('a').html(radioplayer.overlay.getMenuToggleLabel(radioplayer.lang.search.tab_all));
			// Collapse the navigation menu by default
			radioplayer.search.hideNavigationMenu();
		}
		
	},
	
	
	/**
	 * Called when a tab is being hidden
     *
     * @method hidingTab
     */
	hidingTab : function() {
		
		radioplayer.utils.output('hiding tab ' + radioplayer.overlay.tabShowingName);
		
		if (radioplayer.overlay.tabShowingName == "mystations") {
			radioplayer.mystations.purgeRemovedMyStations();
		}
		
		radioplayer.overlay.tabShowingName = '';
	},
	
	
	/**
	 * Show the menu spinner (ajax loading indicator)
     *
     * @method showMenuSpinner
     */
	showMenuSpinner : function() {
		$('.menu-container .tabs-wrapper .spinner').show();
	},
	
	
	/**
	 * Hide the menu spinner (ajax loading indicator)
     *
     * @method hideMenuSpinner
     */
	hideMenuSpinner : function() {
		$('.menu-container .tabs-wrapper .spinner').hide();
	},
		
		
	/**
	 * Request data from the A-Z List API
     *
     * @method requestAZList
     */
	requestAZList : function() {
		this.showMenuSpinner();
		
		// Set up fail safe
		this.requestFailed = false;
		this.requestFailTimer = setTimeout(function() { radioplayer.overlay.showFailMsg('azlist'); }, 15000);
		
		radioplayer.services.getAPI(radioplayer.consts.api.az + "/?callback=radioplayer.overlay.receiveAZList");
	},
	

	/**
	 * Receive data from the A-Z List API
     *
     * @method receiveAZList
     *
	 * @param data
     */
	receiveAZList : function(data) {
		
		clearTimeout(this.requestFailTimer);
		
		if (!this.requestFailed) {
		
			var arrAllLetters = radioplayer.lang.azlist.alphabet_array,
				AZListHtml = '<h2 class="access">' + radioplayer.lang.menu_tabs.tab_4_text + '</h2>',
				arrGotLetters = [];
			
			$.each(arrAllLetters, function(i, letter){
				
				var upperLetter = letter.toUpperCase();
				
				if (data.stations[letter]) {
					
					AZListHtml += '<div class="letter-divide" data-letter="' + upperLetter + '" id="letter-divide-' + (letter == '#' ? 'num' : letter) + '">' + upperLetter + '</div>';
					
					arrGotLetters.push(letter);
					
					var stns = data.stations[letter];
					
					AZListHtml += radioplayer.overlay.iterateResults(stns, 'az', letter);
					
				} else {
					// No stations for this letter
					AZListHtml += '<div class="letter-divide" data-letter="' + upperLetter + '" id="letter-divide-' + (letter == '#' ? 'num' : letter) + '">' + upperLetter + '</div><div class="no-stations-item">' + radioplayer.lang.azlist.no_stations + '</div>';
	
				}
			});
			
			var lettersHtml = '',
				hasStations = false,
				titleTag = '';
				
			$.each(arrAllLetters, function(i, letter){
				hasStations = (arrGotLetters.indexOf(letter) > -1);
				titleTag = (hasStations ? 
							radioplayer.lang.azlist.view_stations_beginning : 
							radioplayer.lang.azlist.no_stations_beginning);
				
				titleTag = titleTag.replace("{letter}", (letter == '#' ? radioplayer.lang.azlist.a_number : letter.toUpperCase()));
				
				lettersHtml += '<li id="letter-' + (letter == '#' ? 'num' : letter) + '" class="' + (hasStations ? '' : 'no-stations') + '">' + 
								'<a href="#" title="' + titleTag + '">' + letter.toUpperCase() + '</a></li>';
			});
			
			this.hideMenuSpinner();
			
			$('.alphabet ul').html(lettersHtml);
			$('#azlist-container').html(AZListHtml);
			
			if ($.browser.msie && $.browser.version == 7) {
				// Don't use sticky divide on IE 7, it performs poorly
				$('.sticky-divide').remove();
				
			} else {
				// Set the width of the sticky divide
				this.resizeStickyDivide();
				
				$("#azlist-container").on('scroll.update-sticky-divide', function() {
					radioplayer.overlay.updateStickyDivide($(this));
				});
			}
			
			//radioplayer.utils.output('we have the letter ' + radioplayer.settings.stationlistprefix);
			
			if (radioplayer.settings.stationlistprefix != '') {
				// We have a letter from a previous visit, so jump directly to that
				
				//radioplayer.utils.output('scroll to letter');
				
				this.detectScrolling = false;
				
				$('.menu-container .alphabet').scrollTo($('#letter-' + (radioplayer.settings.stationlistprefix == '#' ? 'num' : radioplayer.settings.stationlistprefix)).offset().left, {axis: 'x'});
				
				$("#azlist-container").scrollTo("#letter-divide-" + (radioplayer.settings.stationlistprefix == '#' ? 'num' : radioplayer.settings.stationlistprefix), {
					axis: "y", 
					duration: 0, 
					onAfter: function(){
						radioplayer.utils.output('completed initial scroll');
						radioplayer.overlay.detectScrolling = true;
					}
				});
				
				// Highlight this letter
				$('#letter-' + (radioplayer.settings.stationlistprefix == '#' ? 'num' : radioplayer.settings.stationlistprefix)).addClass('on');
				
			} else {
				// We haven't seen the A-Z list before, so scroll to a random letter
				var randLetter = arrGotLetters[Math.floor(Math.random()*arrGotLetters.length)];
				
				this.detectScrolling = false;
				
				$('.menu-container .alphabet').scrollTo($('#letter-' + (randLetter == '#' ? 'num' : randLetter)).offset().left, {axis: 'x'});
				
				$("#azlist-container").scrollTo("#letter-divide-" + (randLetter == '#' ? 'num' : randLetter), {
					axis: "y", 
					duration: 500, 
					onAfter: function(){
						//radioplayer.utils.output('lazyLoad 3');
						//radioplayer.overlay.lazyLoad($('#azlist-container'));
						radioplayer.overlay.detectScrolling = true;
					}
				});
				
				// Highlight this letter
				$('#letter-' + (randLetter == '#' ? 'num' : randLetter)).addClass('on');
				
				// Save to cookie for next visit
				radioplayer.services.saveCookie("stationlistprefix/s", "stationlistprefix", randLetter);
			
			}
		}

	},
	
	
	/**
	 * While scrolling the A-Z List, this function updates the sticky divide letter and the position, if the next divide down is overlapping it
     *
     * @method updateStickyDivide
     */
	updateStickyDivide : function($cont) {
		
		var currentViewTop = $cont.scrollTop(),
			gotNextDivide = false,
			currentDivideLetter = '';
			
		$cont.find('.letter-divide').each(function(i, element){

            $divideItem = $(this);
			
			var eleTopEdge = currentViewTop + $divideItem.position().top,
				eleBotEdge = currentViewTop + $divideItem.position().top + $divideItem.outerHeight();
			
			if (eleTopEdge <= currentViewTop) {
				// Divide is above the viewport
				
				currentDivideLetter = $divideItem.data('letter');
				
			} else {
				// Divide is either partly visible at the top, full visible, or below the viewport	
				
				if (!gotNextDivide) {
					gotNextDivide = true;
					
					if (eleTopEdge < (currentViewTop + radioplayer.overlay.azDivideHeight)) {
						
						var distanceFromVPTopToNextDivide = $divideItem.position().top;
						
						radioplayer.objs.stickyLetterDivide.css('top', '-' + (radioplayer.overlay.azDivideHeight - distanceFromVPTopToNextDivide) + 'px');
					} else {
						radioplayer.objs.stickyLetterDivide.css('top', '0');
					}
				
				}
				
			}
			
		});
		
		radioplayer.objs.stickyLetterDivide.html(currentDivideLetter);
		
	},
	
	
	/**
	 * Request data from the recommendation API
     *
     * @method requestRecommend
     */
	requestRecommend : function() {
		// optional params:
		// guid
		// historyRpIds	csv
		// presetRpIds	csv
		// locale		defaults to en_GB
		// callback		defaults to callback
		
		$('#recom-container').html('');
		this.showMenuSpinner();
		
		// Set up fail safe
		this.requestFailed = false;
		this.requestFailTimer = setTimeout(function() { radioplayer.overlay.showFailMsg('recom'); }, 15000);
		
		var QS = "?callback=radioplayer.overlay.receiveRecommend&locale=" + radioplayer.lang.recommendations.locale;
		
		if (radioplayer.settings.history.length > 0) {
			// Get comma separated list of preset station IDs
			QS += "&historyRpIds=" + radioplayer.settings.history.join(",");
		}
		
		if (radioplayer.settings.presets.length > 0) {
			// Get comma separated list of preset station IDs
			QS += "&presetRpIds=" + radioplayer.settings.presets.join(",");
		}
		
		if (radioplayer.settings.guid != '') {
			// Get GUID
			QS += "&guid=" + radioplayer.settings.guid;	
		}
		
		radioplayer.services.getAPI(radioplayer.consts.api.recommend + QS);
	},
	
	
	/**
	 * Receive recommendations API data
     *
     * @method receiveRecommend
     *
	 * @param data
     */
	receiveRecommend : function(data) {
		
		clearTimeout(this.requestFailTimer);
		
		if (!this.requestFailed) {
		
			var html = '<h2 class="access">' + radioplayer.lang.menu_tabs.tab_3_text + '</h2>' + 
					   this.iterateResults(data.recommendations, 'recommend');
			
			this.hideMenuSpinner();
			
			$('#recom-container').html(html);
			
			this.lazyLoad($('#recom-container'));
			
		}
	},
	
	
	/**
	 * Fail Message
     *
     * @method showFailMsg
	 */
	showFailMsg : function(tab) {
		this.requestFailed = true;
		
		// Hide loading indicator
		this.hideMenuSpinner();
		
		// Populate overlay
		var fail_message = '<div class="error-message fail">' + radioplayer.lang.general.fail_message + '</div>';
		
		$('#' + tab + '-container').addClass('has-error')
									 .html(fail_message);
		
		// Send analytics event for fail message
        radioplayer.services.analytics.sendEvent('Errors', 'Failed Message', tab, null, null); // Send Analytics for failed search
	},
	
	
	/**
	 * Iterate over a results set, to produce HTML
     *
     * @method iterateResults
     *
	 * @param dataset
     * @param reqType
	 * @param letter for reqType=az, letter will be letter used for grouping
     * @returns {string} resultsHtml
     */
	iterateResults : function(dataset, reqType, letter) {
		// dataset is an array or array-like object
		// reqType can be 'search', 'mystations', 'history', 'recommend', 'az'
		
		var resultsHtml = '',
			now = new Date(),
			nowInEpochSeconds = Math.round(now.getTime()* 0.001);
		
		// The outer result set
		$.each(dataset, function(index, resItem) {
		
			// Does this result contain more than one sub-result? If so, wrap it in a group
			if (reqType == 'search' && resItem.results[2]) { // Detect a 2nd sub-result
				
				resultsHtml += '<div data-brand="' + resItem.groupID + '" class="station-group collapsed">';
				
				$.each(resItem.results, function(subIndex, resItem2) {
					// A sub result
					var subItemsHtml = radioplayer.overlay.oneResult(reqType, resItem2, subIndex, resItem.groupID, nowInEpochSeconds);
					
					resultsHtml += (subIndex == 2 ? '<div class="station-group-hidden">' : '') +
								   subItemsHtml;
				});
				
				resultsHtml +=   '</div>' + 
							   '</div>';
				
			} else {
				// Just a regular single result	
				
				if (reqType == 'search') {
					var itemHtml = radioplayer.overlay.oneResult(reqType, resItem.results[1], 0, '', nowInEpochSeconds);
				} else if (reqType == 'az') {
					// Include grouping letter for a-z results
					var itemHtml = radioplayer.overlay.oneResult(reqType, resItem, 0, '', nowInEpochSeconds, letter);
				} else {
					// recommend, mystations, history
					var itemHtml = radioplayer.overlay.oneResult(reqType, resItem, 0, '', nowInEpochSeconds);
				}
				
				resultsHtml += itemHtml;
			}
			
		});
		
		return resultsHtml;
		
	},
	

	/**
	 * Return markup for one result
     *
     * @method oneResult
     *
	 * @param reqType
     * @param resItem
     * @param subIndex
     * @param brandName
     * @param nowInEpochSeconds
	 * @param letter
     * @returns {string} itemHtml
     */
	oneResult : function(reqType, resItem, subIndex, brandName, nowInEpochSeconds, letter) {
		
		var resRpId = resItem.rpId,
			resImage = (resItem.imageUrl ? resItem.imageUrl : radioplayer.consts.assetBaseUrl + 'img/result-placeholder.png'),
			resName = resItem.serviceName,
			resSubtitle = '',
			resDescr = '',
			resType = 'SI',
			resLink = resItem.consoleUrl,
			resStatus = null,
			showCurrentStatus = true;
		
		if (reqType == 'search') {
			// Search result
			resSubtitle = radioplayer.overlay.getSubtitle(resItem);
			resDescr = resItem.description;
			resType = resItem.type; // overwrite default
			resStatus = radioplayer.overlay.calculateStationStatus(resItem, nowInEpochSeconds);
			
		} else if (reqType == 'recommend') {
			// Recommendation
			resSubtitle = (resItem.type == 'ONDEMAND' ? resItem.name : '');
			resDescr = (resItem.description ? resItem.description : '');
			resType = (resItem.type == 'SERVICE' ? 'SI' : 'OD'); // overwrite default
			resStatus = radioplayer.overlay.calculateStationStatus(resItem, nowInEpochSeconds);
				
		} else if (reqType == 'mystations' || reqType == 'history' || reqType == 'az') {
			// My Stations / History / A-Z List
			resStatus = {
				stationType: radioplayer.lang.search.live, // LIVE
				timeToBroadcast: ''
			};
			showCurrentStatus = false;
		}

		var liveResult = (resType == 'SI' || resType == 'PI' || resType == 'PE_E' || resType == 'PI_E');

		var mayHaveMore = (liveResult ? 'not-loaded-meta' : '');
		
		// If station is in My Stations, show 'Added', or if presets are full show 'Full'
		var stnInMyStnsClass = '',
			myStnBtnHtml = '';
			
		// Only live results get My Stations icon
        // Don't show hearts in reduced functionality mode
		if (liveResult && !radioplayer.consts.reduced_func) {
			if ($.inArray(resItem.rpId, radioplayer.settings.presets) != -1) {
				stnInMyStnsClass = "in-mystations";
				myStnBtnHtml = '<span class="toggle-mystations"><button type="button" title="' + radioplayer.lang.mystations.remove_this + '"><span>' + radioplayer.lang.mystations.remove_this + '</span></button></span>';
			
			} else {
				myStnBtnHtml = '<span class="toggle-mystations"><button type="button" title="' + radioplayer.lang.mystations.add_this + '"><span>' + radioplayer.lang.mystations.add_this + '</span></button></span>';
			}
		}
		
		var moreMsg = radioplayer.lang.search.show_more_stations,
			moreMsg = moreMsg.replace("{group}", brandName);
			
		var itemHtml = '<div data-stationid="'+resRpId+'" data-type="'+resType+'" data-statustype="' + resStatus.stationType + '" data-section="' + reqType + '" class="overlay-item '+resType+' '+stnInMyStnsClass+' not-loaded-img '+mayHaveMore+'">' +
		
			'<div class="overlay-item-initial">' +
				
				'<a class="overlay-item-link" href="' + resLink + '"' + (reqType == 'az' ? ' data-letter="' + letter + '"' : '') + '>' +
					'<span class="overlay-item-img">' + 
					  '<span class="play-icon"></span>' +
					  '<img src="' + radioplayer.consts.assetBaseUrl + 'img/result-placeholder.png" data-src="' + resImage + '" width="86" height="48" alt="" />' +
					'</span>' +
					'<span class="title">' + resName + '</span>' +
				'</a>' +
				'<div class="overlay-item-data">' +
					'<p class="' + (resType == 'OD' || resType == 'PI_OD' ? 'programme-title' : 'subtitle') + ' truncate">' + resSubtitle + '</p>' +
					'<p class="description">' + resDescr + '</p>' +
					(showCurrentStatus ? '<p class="broadcast-info"><span class="status">' + resStatus.stationType + '</span> <span class="broadcast-time">' + resStatus.timeToBroadcast + '</span></p>' : '') +
				'</div>' +
				
				myStnBtnHtml + 
				
				// For recommended results, we show factors in the more info section, so show the toggle straight away
				(reqType == 'recommend' ? '<a href="#" role="button" class="more-toggle" title="' + radioplayer.lang.search.show_information + '"><span>' + radioplayer.lang.search.show_information + '</span></a>' : '') + 
				
			'</div>';
					
			if (reqType == 'recommend') {
				// For recommended results, we show factors in the more info section, so add this in straight away
				
				var factorList = resItem.factors.join(', ');
				
				itemHtml += '<div class="overlay-item-extra-cont">' +
							  '<div class="padding-wrap">' + 
								'<div class="recommend-factors"><i></i>' + factorList + '</div>' +	
							  '</div>' +
							'</div>';
			}
						
			itemHtml += (subIndex == 1 ? '<a href="#" class="station-group-toggle" role="button"><i></i>' + moreMsg + '</a>' : '') +
			
		'</div>';
		return itemHtml;
	},
	
	
	/**
	 * Show more info for a result
     *
     * @method receiveStnNowInfo
     * @param data {Object}
	 */
	receiveStnNowInfo : function(data) {
		if (data.responseStatus == 'SUCCESS' && data.total > 0) {
			
			$.each(data.results, function(rpId, arrStation){
			
				// Run through each matching result
				radioplayer.objs.overlayContainer.find(".overlay-item.checking-for-meta[data-stationid='" + rpId + "']").each(function(i, element){
					
					$overlayItem = $(element);
					
					// Swap this class immediately to prevent doubling up.
					$overlayItem.removeClass("checking-for-meta");
					
					// Construct expanded content for this result here
					var z = 1,
						metaHtml = '',
						metaArray = [],
						metaTypesArray = [],
						subtitle,
						imageUrls = [],
						descriptions = [],
						resultTypes = [],
						resultType = $overlayItem.attr("data-type"),
						promoteData = ($.inArray($overlayItem.data('section'), ['mystations', 'history', 'recommend', 'az']) > -1), // should items be promoted to the top result?
						
						initialResultType = '',
						initialResultSubtitle = '',
						initialResultDescription = '';
						
					// Get bits of info in the context of this result
					imageUrls[0] = $(".overlay-item-initial .overlay-item-img img", element).attr("src");
					descriptions[0] = $(".overlay-item-initial .overlay-item-data .description", element).html();
					resultTypes[0] = resultType;
					var playerUrl = $(".overlay-item-initial .overlay-item-link", element).attr("href");
						
					// Run through all returned live data for this station
					$.each(arrStation, function(index, resItem) {
						
						// For My Stations and History, use the SI image as the logo, and name too
						if (resItem.type == 'SI' && ($overlayItem.data('section') == 'mystations' || $overlayItem.data('section') == 'history')) {
							$overlayItem.find('.overlay-item-img img').attr('src', resItem.imageUrl);
							$overlayItem.find('.title').html(resItem.serviceName);
						}
						

						// We're only interested in certain types of data
						if ($.inArray(resItem.type, ['SI', 'PI', 'PE_E', 'PI_E']) > -1) {
							
							subtitle = radioplayer.overlay.getSubtitle(resItem);
						
							/*
							 * Build up an array of data to include in the section if the down arrow is clicked
							 * An item may be removed from this array later, if it is selected to be added to the initial result
							 */
						
							// Don't add the same data that we already have for this result
							if (resItem.type != resultType) {
									
								// Check if we've already shown this image once
								if ($.inArray(resItem.imageUrl, imageUrls) != -1) {
									resItem.imageUrl = '';
									
								} else {
									// Show this image, but store it so we don't show it again
									imageUrls[z] = resItem.imageUrl;
								}
								
								// Check if we've already shown this description once
								if ($.inArray(resItem.description, descriptions) != -1) {
									resItem.description = '';
									
								} else {
									// Show this description, but store it so we don't show it again
									descriptions[z] = resItem.description;
								}
								
								resultTypes[z] = resItem.type;
								
								if (subtitle || resItem.description) {
									// Only add this item if we have at least one thing to display (after duplication removal)								
								
									if (resItem.song && (resItem.type == 'PE_E' || resItem.type == 'PI_E')) {
										// For songs, show the song icon
										
										metaArray.push('<div class="overlay-item-song' + 
															($overlayItem.data('section') !== 'recommend' && metaArray.length == 0 ? ' no-top-border' : '') +
															'">' +
													  '<i></i>' + subtitle + 
													'</div>');
										
										metaTypesArray.push('song');
										
									} else {
										// Other meta types
										
										metaArray.push('<div class="overlay-item-extra' + 
															(resItem.imageUrl ? ' hasImage' : '') + 
															($overlayItem.data('section') !== 'recommend' && metaArray.length == 0 ? ' no-top-border' : '') +
															'">' +
									
													  (resItem.imageUrl ? '<a class="overlay-item-link" href="' + playerUrl + '">' +
														'<span class="overlay-item-img">' +
														  '<span class="play-icon"></span>' +
														  '<img width="86" height="48" alt="" src="' + resItem.imageUrl + '">' +
														'</span>' +
													  '</a>' : '') +
													  
													  '<div class="overlay-item-data">' +
														'<p class="subtitle">' + subtitle + '</p>' +
														'<p class="description">' + resItem.description + '</p>' +
													  '</div>' +
													'</div>');
													
										metaTypesArray.push(resItem.type);
									}
								}
								
								z++;
							}
				

							/*
							 * For specific sections (promoteData is true), pick out a piece of data to be added to the initial result
							 * Select in order of Song, then other programme event, then PI, then SI
							 */

							if (promoteData && (subtitle || resItem.description)) {
								
								if (resItem.song && (resItem.type == 'PE_E' || resItem.type == 'PI_E')) {
									// Song
									
									initialResultType = 'song';
									initialResultSubtitle = subtitle;
									initialResultDescription = resItem.description;
								
								} else if (resItem.type == 'PE_E' || resItem.type == 'PI_E') {
									// Other type of event
									
									if (initialResultType != 'song') {
										initialResultType = resItem.type;
										initialResultSubtitle = subtitle;
										initialResultDescription = resItem.description;
									}
				
								} else if (resItem.type == 'PI') {
									// Programme
									
									if ($.inArray(initialResultType, ['song', 'PE_E', 'PI_E']) == -1) {
										initialResultType = resItem.type;
										initialResultSubtitle = subtitle;
										initialResultDescription = resItem.description;
									}
									
								} else if (resItem.type == 'SI') {
									// Station
									
									if ($.inArray(initialResultType, ['song', 'PE_E', 'PI_E', 'PI']) == -1) {
										initialResultType = resItem.type;
										initialResultSubtitle = subtitle;
										initialResultDescription = resItem.description;
									}
									
								}
							}
							
						}
						
					});
					
					
					/*
					 * If we have some info to add to the initial result, do that here
					 */
			
					if (initialResultType != '') {
						$overlayItem.find('.overlay-item-initial .subtitle').html(initialResultSubtitle);
						$overlayItem.find('.overlay-item-initial .description').html(initialResultDescription);
						
						if (initialResultType == 'song') {
							// Remove truncation for songs
							$overlayItem.find('.overlay-item-initial .subtitle').removeClass('truncate');
						}
						
						// If this data is in metaArray (for the dropdown) then remove it here
						if (metaArray.length > 0) {
							// Get index of the element we want, by getting the index from the metaTypesArray
							var removeIndex = $.inArray(initialResultType, metaTypesArray);
							if (removeIndex > -1) {
								metaArray.splice(removeIndex, 1);
							}
						}
					}
					
					
					/*
					 * If we have extra metadata to add to the dropdown, add it to the dom after the initial result
					 */
					
					if (metaArray.length > 0) {
						metaHtml = metaArray.join('');	
					
						if ($overlayItem.data('section') == 'recommend') {
							// If this is a recommended result, then we'll already have overlay-item-extra-cont, so just append to that
							
							$overlayItem.addClass("loaded-meta")
										.children(".overlay-item-extra-cont").children().append(metaHtml);
							
						} else {
							// All other result types
							metaHtml = '<div class="overlay-item-extra-cont"><div class="padding-wrap">' + metaHtml + '</div></div>';
							
							$overlayItem.addClass("loaded-meta")
										.children(".overlay-item-initial")
										.append('<a href="#" role="button" class="more-toggle" title="' + radioplayer.lang.search.show_information + '"><span>' + radioplayer.lang.search.show_information + '</span></a>');
							
							$overlayItem.children(".overlay-item-initial").after(metaHtml);
						
						}
						
					} else {
						// No extra meta available (the initial result is the only one we have)
						
						$overlayItem.addClass("no-meta-available");
						
					}
					
				});

			});
			
			// For A-Z list, once we've loaded extra info, we may need to update position of sticky divide
			if ($overlayItem.data('section') == 'az') {
				if ($.browser.msie && $.browser.version == 7) {
					// Don't use sticky divide on IE 7, it performs poorly
				} else {
					radioplayer.overlay.updateStickyDivide($("#azlist-container"));
				}
			}
			
		}
	},
	
	
	/**
	 * Collapse any expanded results
     *
     * @method collapseResult
	 */
	collapseResult : function() {
		if (radioplayer.objs.overlayContainer.find(".overlay-item.expanded").length == 1) {
			var openItem = radioplayer.objs.overlayContainer.find(".overlay-item.expanded");
			openItem.children(".overlay-item-extra-cont").slideUp(250, function(){
				$(this).hide();	// This is here so that if an expanded result is collapsed, but within a hidden group, it still gets collapsed. .slideUp() doesn't work when a parent is hidden.
			});
			openItem.find(".more-toggle").attr("title", radioplayer.lang.search.show_information).html('<span>' + radioplayer.lang.search.show_information + '</span>');
			openItem.removeClass("expanded").prev().removeClass("prevExpanded");
		}
	},
	
	
	/**
	 * Station status functions
     *
     * @method calculateStationStatus
     * @param result {Object}
     * @param nowInEpochSeconds {int} Epoch Timestamp
	 */
	calculateStationStatus : function(result, nowInEpochSeconds){
		
		var returnType = {};
				
		// startTime and stopTime are when the programme was broadcast
		// odStartTime and odStopTime are when the programme should be available
		
		// Recommendations
		// Off-schedule OD does not include startTime/stopTime, but has integers for odStartTime/odStopTime
		// Both are returned for on schedule OD (PI_OD)
		
		// Search
		// Off-schedule OD has blank strings for startTime/stopTime, and integers for odStartTime/odStopTime
		// Both are returned for on schedule OD (PI_OD)
		// PI and PE may have startTime and stopTime - should be looked at for coming up
		
		var startTimeMinusNow = null,
			stopTimeMinusNow = null;
		
		if (result.startTime && result.startTime != '' && result.stopTime && result.stopTime != '') {
			startTimeMinusNow = (result.startTime - nowInEpochSeconds);
			stopTimeMinusNow = (result.stopTime - nowInEpochSeconds);
		}
		
		// startTimeMinusNow is the offset in time from 'now' to when the prog started. if it is negative, the prog started in the past, else it starts in the future.
		// stopTimeMinusNow is the offset in time from 'now' to when the prog stopped. if it is negative, the prog stopped in the past, else it stops in the future.
		
		if (result.startTime && result.startTime != '' && startTimeMinusNow > 0) {
			// Coming up
			
			returnType.stationType = radioplayer.lang.search.coming_up;
			returnType.timeToBroadcast = this.getTimeBeforeBroadcast(startTimeMinusNow);
				
		} else if (result.stopTime && result.stopTime != '' && stopTimeMinusNow < 0) {
			// On schedule OD (Catch up)
			
			returnType.stationType = radioplayer.lang.search.broadcast;
			var nowMinusStopTime = nowInEpochSeconds - result.stopTime;
			returnType.timeToBroadcast = this.getTimePastSinceBroadcast(nowMinusStopTime);
			
		} else if (result.odStartTime && result.odStartTime != '') {
			// Off schedule OD
			
			returnType.stationType = radioplayer.lang.search.broadcast;
			returnType.timeToBroadcast = "";
			
		} else {
			// Live
			
			returnType.stationType = radioplayer.lang.search.live;
			returnType.timeToBroadcast = "";
		}
		
		return returnType;
	},


    /**
     * @method divideAndRound
     * @param timeInEpochSeconds {int} Epoch Timestamp
     * @param divideBy {int}
     * @return {mixed|int}
     */
	divideAndRound : function(timeInEpochSeconds, divideBy){
		var result = "";		
		var tempTime;
		timeReturned = (timeInEpochSeconds / divideBy);
		if (timeReturned >= 1){
			timeReturned = Math.round(timeReturned);
			result = timeReturned;
			return result;
		}
		return 1;
	},


    /**
     * Get Time Before Broadcast
     *
     * @method getTimeBeforeBroadcast
	 *
     * @param timeInEpochSeconds {int}
     * @returns {string} Time before broadcast
     */
	getTimeBeforeBroadcast : function(timeInEpochSeconds){
		var minutesToBroadcast = (timeInEpochSeconds / 60);
		minutesToBroadcast = Math.round(minutesToBroadcast);
		if (minutesToBroadcast == 0) {
			return " " + radioplayer.lang.search.in_seconds; // in seconds
		} else if (minutesToBroadcast == 1) {
			return " " + radioplayer.lang.search.in_minute; // in 1 minute
		} else {
			var strMins = radioplayer.lang.search.in_minutes; // in {n} minutes
			strMins = strMins.replace("{n}", minutesToBroadcast);
			return " " + strMins;
		}
	},


    /**
     * Get Time Past Since Broadcast
	 *
	 * @method getTimePastSinceBroadcast
     *
     * @param timeInEpochSeconds {int}
     * @returns {string} Localised string of relative date
     */
	getTimePastSinceBroadcast : function(timeInEpochSeconds){
		var timeValue,retString, year, month, week, day, hour, minute;
		year = 31556926;
		month = 2629743;
		week = 604800;
		day = 86400;
		hour = 3600;
		minute = 60;
		if (timeInEpochSeconds >= week){
			if (timeInEpochSeconds >= year){
				timeValue = this.divideAndRound(timeInEpochSeconds, year);
				if (timeValue){
					return retString = this.getTimePastString(timeValue, radioplayer.lang.search.year_ago, radioplayer.lang.search.years_ago);
				}
			} else if(timeInEpochSeconds >= month){
				timeValue = this.divideAndRound(timeInEpochSeconds, month);
				if (timeValue){
					return retString = this.getTimePastString(timeValue, radioplayer.lang.search.month_ago, radioplayer.lang.search.months_ago);
				}
			} else if(timeInEpochSeconds >= week){	
				timeValue = this.divideAndRound(timeInEpochSeconds, week);
				if (timeValue){
					return retString = this.getTimePastString(timeValue, radioplayer.lang.search.week_ago, radioplayer.lang.search.weeks_ago);
				}
			}
		} else {
			if (timeInEpochSeconds >= day){
				timeValue = this.divideAndRound(timeInEpochSeconds, day);
				if (timeValue){
					return retString = this.getTimePastString(timeValue, radioplayer.lang.search.day_ago, radioplayer.lang.search.days_ago);
				}
			} else if(timeInEpochSeconds >= hour){	
				timeValue = this.divideAndRound(timeInEpochSeconds, hour);
				if (timeValue){
					return retString = this.getTimePastString(timeValue, radioplayer.lang.search.hour_ago, radioplayer.lang.search.hours_ago);
				}
			} else if(timeInEpochSeconds >= minute){			
				timeValue = this.divideAndRound(timeInEpochSeconds, minute);
				if (timeValue){
					return retString = this.getTimePastString(timeValue, radioplayer.lang.search.minute_ago, radioplayer.lang.search.minutes_ago);
				}
			}
		}
		return retString = this.getTimePastString(timeInEpochSeconds, radioplayer.lang.search.second_ago, radioplayer.lang.search.seconds_ago);
	},


    /**
     * Get Time Past String
     *
     * @method getTimePastString
     * @param value {int}
     * @param single {string}
     * @param plural {string}
     * @returns {string} Localised string of relative date
     */
	getTimePastString : function(value, single, plural){
		if (value == 1) {
			return single;	
		} else {
			plural = plural.replace("{n}", value);
			return plural;
		}
	},


    /**
     * Get Subtitle
     *
     * @method getSubtitle
     *
     * @param result {Object}
     * @returns {string} Subtitle
     */
	getSubtitle : function(result){
		if ((result.type == 'PE_E' || result.type == 'PI_E') && result.artistName) {
			return result.artistName + " - " + result.name;
		} else {
			return result.name;
		}
	},


    /**
     * Resize Sticky Divide
     *
     * @method resizeStickyDivide
     */	
	resizeStickyDivide : function(label) {	
		// Set the width of the sticky divide
		radioplayer.objs.stickyLetterDivide = $('.sticky-divide');
		radioplayer.objs.stickyLetterDivide.css({'width': $('#letter-divide-num').width() + 'px', 'display': 'block' });
		this.azDivideHeight = radioplayer.objs.stickyLetterDivide.outerHeight();
	},
	
	
    /**
     * Get Menu Toggle Label
     *
     * @method getMenuToggleLabel
     *
     * @param label {Object}
     * @returns {string} menuToggleLabel
     */	
	getMenuToggleLabel : function(label) {	
		var menuToggleLabel = label + '<span class="menu_toggle"></span>';
		return menuToggleLabel;
	},

	
    /**
     * Reset the Navigation Menu
     *
     * @method resetNavigationMenu
     */	
	resetNavigationMenu : function() {	

		$('.menu-container .tabs-wrapper').removeClass('nav-collapsed');
		$('.menu-container .sticky-divide-wrapper').removeClass('nav-collapsed');
		$('#menu-nav-main').show();
		radioplayer.overlay.hideNavigationMenu();
	},

    /**
     * Hides/Shows the Navigation Menu
     *
     * @method hideShowNavigationMenu
     */	
	hideShowNavigationMenu : function() {	

		if ($('#menu-nav-main').is(':visible')) {
			$('#menu-nav-main').hide();
			$('#menu-nav-toggle li a .menu_toggle').removeClass('nav-expanded');
			$('.menu-container .tabs-wrapper').addClass('nav-collapsed');
			$('.menu-container .sticky-divide-wrapper').addClass('nav-collapsed');			
		} else {
			$('#menu-nav-main').show();
			$('#menu-nav-toggle li a .menu_toggle').addClass('nav-expanded');
			$('.menu-container .tabs-wrapper').removeClass('nav-collapsed');
			$('.menu-container .sticky-divide-wrapper').removeClass('nav-collapsed');			
		}
	},
	
	
    /**
     * Hides the Navigation Menu
     *
     * @method hideNavigationMenu
     */	
	hideNavigationMenu : function() {	

		if ($('#menu-nav-toggle').is(':visible')) {
			$('#menu-nav-main').hide();
			$('#menu-nav-toggle li a .menu_toggle').removeClass('nav-expanded');
			$('.menu-container .tabs-wrapper').addClass('nav-collapsed');
			$('.menu-container .sticky-divide-wrapper').addClass('nav-collapsed');
		}
	}
};

/**
 * Version: 1.2.22
 * 
 * @name playing
 * @description All handling of the automatic populating of the Playing overlay
 *
 * > *All intellectual property rights in this Software throughout the world belong to UK Radioplayer,
 * rights in the Software are licensed (not sold) to subscriber stations, and subscriber stations 
 * have no rights in, or to, the Software other than the right to use it in accordance with the 
 * Terms and Conditions at www.radioplayer.co.uk/terms. You shall not produce any derivate works 
 * based on whole or part of the Software, including the source code, for any other purpose other 
 * than for usage associated with connecting to the UK Radioplayer Service in accordance with these 
 * Terms and Conditions, and you shall not convey nor sublicense the Software, including the source 
 * code, for any other purpose or to any third party, without the prior written consent of UK Radioplayer.*
 *
 *
 * @author Gav Richards <gav@gmedia.co.uk>
 * @author Steve Edson <steve@gmedia.co.uk>
 *
 * This file calls:
 * @overlay
 *
 * This file is called by:
 * @ overlay
 *
 * @class playing
 * @module playing
 */


radioplayer.playing = {
	
	requestFailTimer : null,
	
	requestPlayingSecs : (20 * 1000),
	requestPlayingTimer : null,
	
	requestPlayingSecs_Song : (20 * 1000), // 2:30 song length
	
	showingPlayingType : '',
	showingText : '',
	playingArtist : '',
	playingTitle : '',
	
	animateEasing : 'swing', //'linear',
	pxPerSecond : 90,

	scrollingContainerWidth : 0,
	scrollTimeout : null,
	scrollDirection : 'l',
	endPos : 0,
	
	nowPlayingStripWidth : 0,
    nowPlayingID3: '',

    receivedStreamData: false,

	songAction : null,

    terminateUpdating: false,

	windowHasFocus : true,
	
	
	/**
	 * Initialise Playing Bar. This is only called for live audio.
     *
     * @method init
	 */
	init : function() {	
		
		// Grab objects
		radioplayer.objs.nowPlayingStrip = $('.now-playing-strip');
		radioplayer.objs.scrollingContainer = $('.scrolling-container');
		radioplayer.objs.scrollerText = $('.scrolling-text');
		
		
		// Localisation
		$('#live-strip .live-indicator').html(radioplayer.lang.playing.live);	
		
		
		// Store width
		this.nowPlayingStripWidth = radioplayer.objs.nowPlayingStrip.width();
		
		
		// Set position of scrolling container, based on live indicator
		radioplayer.objs.scrollingContainer.css('left', radioplayer.lang.playing.live_width + 'px');
		
		
		// Scroll when mouseover, return to starting position when mouseout
		radioplayer.objs.scrollingContainer.on('mouseenter.start-scroller', function(){
			
			radioplayer.objs.nowPlayingStrip.addClass('mouse-over');
			
			radioplayer.playing.startScrolling();
			
		}).on('mouseleave.reset-scroller', function(){
			
			radioplayer.playing.resetScroller(true);	
			
		}).on('focus', function(){
			// Keyboard access for the ticker
			if (!radioplayer.mouseActive) {
				radioplayer.objs.scrollingContainer.trigger('mouseenter.start-scroller');
			}
			
		}).on('blur', function(){
			// Keyboard access for the ticker
			if (!radioplayer.mouseActive) {
				radioplayer.objs.scrollingContainer.trigger('mouseleave.reset-scroller');
			}
			
		});
		
		
		// When window is blurred, stop requesting now playing info
		$(window).on('blur', function(){
			if (radioplayer.playing.windowHasFocus) {
				radioplayer.playing.windowHasFocus = false;
				
				//radioplayer.playing.stopUpdating();
			}
			
		}).on('focus', function(){
			if (!radioplayer.playing.windowHasFocus) {
				radioplayer.playing.windowHasFocus = true;
	
				if (!radioplayer.objs.body.hasClass('showing-overlay') && audioLive) {
					// Only resume polling when focussing, if overlay isn't showing. Polling will auto resume when overlay hides anyway.
					//radioplayer.playing.startUpdating();
				}
	
			}
		});
		
		
		$(radioplayer.services).on('gotSongAction', function(){
			if (radioplayer.playing.showingText != '') {
				// We've already received playing text, so update it with the song action we now have	
				radioplayer.utils.output('update text late with song action');
				radioplayer.playing.updateText(radioplayer.playing.showingText, radioplayer.playing.showingPlayingType);
			}
		});

        this.startUpdating();
	},
	
	/**
	 * Start Updating
	 *
	 * @method startUpdating
	 */
	startUpdating : function() {
		// Get Now Playing if auto populating this overlay

		if (audioLive && nowPlayingSource != 'stream') {
			// This can be called on hide of overlay and focus of window, but is only useful for Live audio
			// If source is locked to stream, don't start polling

			this.requestFailTimer = setTimeout(function() { radioplayer.playing.showFailMsg(); }, 1000);
			this.requestPlaying();
		}
	},

    /**
     * Stop Updating
     *
     * @method stopUpdating
     */
	stopUpdating : function(terminateUpdates) {

        if(typeof terminateUpdates != "undefined" && terminateUpdates == true) {
            this.terminateUpdating = true;
        }

		clearTimeout(this.requestPlayingTimer);
		clearTimeout(this.requestFailTimer);
		this.showingPlayingType = '';
		this.showingText = '';
	},
	
	
	/**
	 * Begin scrolling - occurs when user mouses over the text container
     *
     * @method startScrolling
	 */
	startScrolling : function() {
		
		clearTimeout(radioplayer.playing.scrollTimeout);

        if ($.browser.msie && $.browser.version == 7) {
            // IE7 can't calculate the width of the text element inside the container with overflow:hidden
            // So create a new element to calculate the width, then remove it

            $tempObj = $('<div style="position:absolute;top:-999px;font-size:11px;">' + radioplayer.objs.scrollerText.html() + '</div>');

            radioplayer.objs.body.append($tempObj);

            var scrollingTextWidth = $tempObj.outerWidth();

            $tempObj.remove();

        } else {
		    var scrollingTextWidth = radioplayer.objs.scrollerText.outerWidth();
        }
		
		if (scrollingTextWidth > this.scrollingContainerWidth) {
			// Content width is wider than container, so scroll
		
			this.endPos = scrollingTextWidth - this.scrollingContainerWidth + 4; // 4 added to allow for space between song action
			
			this.nextScroll();
		
		}
	},
	
	
	/**
	 * Animate this transition if animate is true
     *
     * @method nextScroll
	 */
	nextScroll : function() {
		
		// calculate animation duration
		var duration = radioplayer.playing.calcDuraToAnimate(radioplayer.playing.endPos);	
				
		if (radioplayer.playing.scrollDirection == 'l') {
			radioplayer.utils.output('animate to the left');
			radioplayer.objs.scrollerText.animate({left: '-' + radioplayer.playing.endPos + 'px'}, duration, radioplayer.playing.animateEasing);
			radioplayer.playing.scrollDirection = 'r'; // next direction
			
			radioplayer.playing.scrollTimeout = setTimeout(radioplayer.playing.nextScroll, duration+3000);
		
		} else {
			radioplayer.utils.output('animate to the right (and reset)');
			radioplayer.objs.scrollerText.animate({left: '4px'}, duration, radioplayer.playing.animateEasing, function(){
				
				radioplayer.objs.nowPlayingStrip.removeClass('mouse-over');
					
			});
			radioplayer.playing.scrollDirection = 'l'; // next direction
		}
		
		//radioplayer.playing.scrollTimeout = setTimeout(radioplayer.playing.nextScroll, duration+3000);
		
	},
	
	
	/**
	 * Reset the scroller back to the original position
	 * Animate this transition if animate is true
     *
     * @method resetScroller
	 * @param animate {Boolean}
	 */
	resetScroller : function(animate) {
		
		radioplayer.utils.output('reset the scroller');
		clearTimeout(radioplayer.playing.scrollTimeout);
		
		this.scrollDirection = 'l';
		
		if (animate) {
			// calculate animation duration
			var duration = this.calcDuraToAnimate(4 - radioplayer.objs.scrollerText.position().left);
			
			radioplayer.objs.scrollerText.stop(true).animate({left: '4px'}, duration, radioplayer.playing.animateEasing, function(){
				
				radioplayer.objs.nowPlayingStrip.removeClass('mouse-over');
					
			});
		
		} else {
			radioplayer.objs.scrollerText.stop(true).css({left: '4px'});
			radioplayer.objs.nowPlayingStrip.removeClass('mouse-over');
		}

	},
		
		
	/**
	 * Calculate the duration needed to animate something, based on the pixels to move by, and the pxPerSecond
     *
     * @method calcDuraToAnimate
	 * @param pxToMove {Integer}
     * @return {int} Time of animation duration
	 */
	calcDuraToAnimate : function(pxToMove) {
		return Math.floor(pxToMove / (this.pxPerSecond / 1000));
	},
		
	
	/**
	 * Request info for now playing bar
     *
     * @method requestPlaying
	 */
	requestPlaying : function() {
		
		// Request on air info for this station
		radioplayer.services.getAPI(radioplayer.consts.api.pollOnAir + 
									"?rpIds=" + currentStationID + 
									"&nameSize=200" + 
									"&artistNameSize=200" + 
									"&descriptionSize=200" + 
									"&callback=radioplayer.playing.receive");
		
		// Start timer to request PI again
		clearTimeout(this.requestPlayingTimer);
		this.requestPlayingTimer = setTimeout(function() { radioplayer.playing.requestPlaying(); }, radioplayer.playing.requestPlayingSecs);	
		
	},
	
	/**
	 * Receive PI from server for station currently playing
     *
     * @method receive
     * @param data {Object}
	 */
	receive : function(data) {

		clearTimeout(this.requestFailTimer);
		
		var useText = '',
			useType = '',
			receivedData = {};
	
		if (data.responseStatus == 'SUCCESS' && data.total > 0) {
				
			var stationData = data.results[currentStationID];

            $(radioplayer.playing).trigger('receiveData', [stationData]);

            radioplayer.utils.output("Received:");

			$.each(stationData, function(index, resItem) {
				// Look at each item that is returned

				if (resItem.type == 'PE_E' || resItem.type == 'PI_E') {
					// Track
					receivedData.PEText = resItem.artistName + ' - ' + resItem.name;
					radioplayer.playing.artist = resItem.artistName;
					radioplayer.playing.title = resItem.name;

				} else if (resItem.type == 'PI') {
					// Programme
                    receivedData.PIText = resItem.name;

				} else if (resItem.type == 'SI') {
					// Station
                    if(resItem.description) {
                        receivedData.SIDesc = resItem.description;
                    } else {
                        receivedData.SITitle = resItem.serviceName;
                    }
				}
			});
        }

        switch(nowPlayingSource) {
            case 'SI':
                if(receivedData.SIDesc) {
                    useText = receivedData.SIDesc;
                    useType = "SI";
                    this.stopUpdating(true);
                } else if(receivedData.SITitle) {
                    useText = receivedData.SITitle;
                    useType = "SI";
                    this.stopUpdating(true);
                } else {
                    useText = currentStationName;
                    useType = "SI";
                    this.stopUpdating(true);
                }
                break;

            case 'stream':
                if(radioplayer.playing.receivedStreamData) {
                    useText = radioplayer.playing.nowPlayingID3;
                    useType = (audioLive ? "live" : "OD");
                }
                break;

            case 'PI':
                if(receivedData.PIText) {
                    useText = receivedData.PIText;
                    useType = "PI";
                }
                break;

            case 'default-no-stream':
                if(receivedData.PEText) {
                    useText = receivedData.PEText;
                    useType = "PE";
                } else if(receivedData.PIText) {
                    useText = receivedData.PIText;
                    useType = "PI";
                } else if(receivedData.SIDesc) {
                    useText = receivedData.SIDesc;
                    useType = "SI";
                } else if(receivedData.SITitle) {
                    useText = receivedData.SITitle;
                    useType = "SI";
                } else {
                    useText = currentStationName;
                    useType = "SI";
                }
                break;

            default:
                if(receivedData.PEText) {
                    useText = receivedData.PEText;
                    useType = "PE";
                } else if(receivedData.PIText) {
                    useText = receivedData.PIText;
                    useType = "PI";
                } else if(radioplayer.playing.receivedStreamData) {
                    useText = radioplayer.playing.nowPlayingID3;
                    useType = (audioLive ? "live" : "OD");
                    nowPlayingSource = "stream";
                } else if(receivedData.SIDesc) {
                    useText = receivedData.SIDesc;
                    useType = "SI";
                } else if(receivedData.SITitle) {
                    useText = receivedData.SITitle;
                    useType = "SI";
                } else {
                    useText = currentStationName;
                    useType = "SI";
                }
                break;
        }

        //useText += " test test test test test test test test test test test";

        if (useText !== this.showingText) {
            // Text has changed, so update it
            this.updateText(useText, useType);
        }
	},
	
	
	/**
	 * Update the scroller with new text
     *
     * @method updateText
     * @param useText {String}
     * @param useType {String}
	 */
	updateText : function(useText, useType) {

		if (audioLive) {
			// Live Ticker

			var insertedSongAction = false;
	
			if (useType == 'PE') {
				// This is a song

                // Remove previous song action if there is one
                $('#live-strip .song-action').remove();

				if (this.songAction) {
					// We have a song action
					
					var songUrl = radioplayer.playing.songAction.baseurl;
					
					// Double encoded versions
					songUrl = songUrl.replace(/\[\[artist\]\]/gi, encodeURIComponent(encodeURIComponent(radioplayer.playing.artist)));
					songUrl = songUrl.replace(/\[\[title\]\]/gi, encodeURIComponent(encodeURIComponent(radioplayer.playing.title)));
					
					// Normal encoded versions
					songUrl = songUrl.replace(/\[artist\]/gi, encodeURIComponent(radioplayer.playing.artist));
					songUrl = songUrl.replace(/\[title\]/gi, encodeURIComponent(radioplayer.playing.title));
					
					// Create song action object
					$songAction = $('<a class="song-action" href="' + songUrl + '" target="_blank">' + radioplayer.lang.songactions[radioplayer.playing.songAction.type.toLowerCase()] + '</a>');

					// Insert Song Action into DOM after scrolling container
					radioplayer.objs.scrollingContainer.after($songAction);
					
					insertedSongAction = true;
				}
				
				if (this.showingPlayingType != 'PE' && this.showingPlayingType != '') {
					// The previous item wasn't a song, or blank, and this is a song, so wait longer before requesting again
					
					radioplayer.utils.output('now waiting long for now playing as this is a song');
					clearTimeout(this.requestPlayingTimer);
					this.requestPlayingTimer = setTimeout(function() { radioplayer.playing.requestPlaying(); }, radioplayer.playing.requestPlayingSecs_Song);	
				}
				
			} else {
				if (this.songAction) {
					$('#live-strip .song-action').remove();
				}
			}

			
            radioplayer.objs.scrollerText.html(useText);
			
			this.resetScroller(false);
			
			// Calculate new scrolling container width
			this.scrollingContainerWidth = this.nowPlayingStripWidth - radioplayer.lang.playing.live_width;
			
			if (insertedSongAction) {
				this.scrollingContainerWidth -= $songAction.outerWidth();
			}

			radioplayer.objs.scrollingContainer.css('width', this.scrollingContainerWidth + 'px');
			
        } else {
			// OD Title
            $('#od-title').html(useText);
        }

		this.showingPlayingType = useType;
		this.showingText = useText;

	},
	
	
	/**
	 * Receive just SI from server, as a fallback for AOD that does not have associated search data
     *
     * @method receiveOD
     * @param data {Object}
	 */
	receiveOD : function(data) {

		var APIreturnedName = false;

		if (data.responseStatus == 'SUCCESS' && data.total > 0) {
			
			var stationData = data.results[currentStationID];
			
			$.each(stationData, function(index, resItem) { // Only interested in the one OD result
				if ((resItem.type == 'PI_OD' || resItem.type == 'OD')
					&& resItem.name && resItem.name != "") {
				
					APIreturnedName = true;
					radioplayer.playing.updateText(resItem.name, "OD");
					
                }
			});

		}
		
		if (!APIreturnedName) {
			// Nothing returned from the API, so fallback to using stream metadata, if there is any
			nowPlayingSource = "stream";
			if (radioplayer.playing.receivedStreamData) {
				this.updateText(radioplayer.playing.nowPlayingID3, "OD");
			}
		}
	},
	
	
	/**
	 * Show fail message
	 * Updates the ticker with the station name
     *
     * @method showFailMsg
	 */
	showFailMsg : function() {
		this.updateText(currentStationName, 'fallback');
	},


    /**
     *
     * Metadata Received
     *
     * @event metadataReceived
     * @param type
     * @param event {object}
     * @see http://en.wikipedia.org/wiki/ID3
     */
	metadataReceived : function(type, event) {
		radioplayer.utils.output('metadata received');
		if (radioplayer.consts.consolelog) console.dir(event);

		if (event.type == 'metadata') { // If we have metadata

            radioplayer.playing.receivedStreamData = true;

            if(typeof event.data.TIT2 != "undefined" || typeof event.data.songName != "undefined") { // And the metadata contains ID3

                radioplayer.utils.output('id3 received');

                // Parse the ID3 info and save to variables
                if(event.data.TIT2) {
                    radioplayer.playing.title = event.data.TIT2;
                } else if(event.data.songName) {
                    radioplayer.playing.title = event.data.songName;
                }

                if(event.data.TPE1) {
                    radioplayer.playing.artist = event.data.TPE1;
                } else if(event.data.artist) {
                    radioplayer.playing.artist = event.data.artist;
                }

                var tickerText = radioplayer.playing.swapPlaceholdersForSong();
				
                radioplayer.playing.nowPlayingID3 = tickerText;

                // If locked to stream, show the info in the ticker
                if (nowPlayingSource == "stream") {
                    radioplayer.playing.updateText(tickerText, (audioLive ? "" : "OD"));
                }
				
            } else { // Treat the metadata as in stream (not ID3)
                radioplayer.utils.output('StreamTitle: ' + event.data.StreamTitle);
                radioplayer.utils.output('StreamUrl: ' + event.data.StreamUrl);
                radioplayer.utils.output('Name: ' + event.data.name);
				
				if (nowPlayingSource == "stream") {
					// If locked to stream, show the info in the ticker

					var songData = event.data.StreamTitle.split('~');
					if (songData[4] == 'MUSIC') {
						
						radioplayer.playing.artist = songData[0];
						radioplayer.playing.title = songData[1];
						
						var tickerText = radioplayer.playing.swapPlaceholdersForSong();
						
						radioplayer.playing.nowPlayingID3 = tickerText;
						
						// If locked to stream, show the info in the ticker
						radioplayer.playing.updateText(tickerText, (audioLive ? "" : "OD"));
						
					} else {
						// If it's not a song, update with the station name
						radioplayer.playing.updateText(currentStationName, (audioLive ? "" : "OD"));
					}
				
				}
				
            }
		}
	},
	
	
    /**
     * Swap `{artist}` and `{track}` placeholders for the current playing track, using the set format
     *
     * @method swapPlaceholdersForSong
     * @return {string} Ticker text, with placeholders swapped for real values
     */
	swapPlaceholdersForSong : function() {
		var tickerText = radioplayer.lang.playing.format;
		tickerText = tickerText.replace("{artist}", radioplayer.playing.artist);
		tickerText = tickerText.replace("{track}", radioplayer.playing.title);
		return tickerText;
	},


    /**
     * Header Received
     *
     * @event headerReceived
     * @param type
     * @param event {object}
     */
	headerReceived : function(type, event) {
		radioplayer.utils.output('header received');
		if (radioplayer.consts.consolelog) console.dir(event);	
	}
};/**
 * Version: 1.2.22
 * 
 * @name mystations
 * @description All handling of the My Stations overlay
 *
 * > *All intellectual property rights in this Software throughout the world belong to UK Radioplayer,
 * rights in the Software are licensed (not sold) to subscriber stations, and subscriber stations 
 * have no rights in, or to, the Software other than the right to use it in accordance with the 
 * Terms and Conditions at www.radioplayer.co.uk/terms. You shall not produce any derivate works 
 * based on whole or part of the Software, including the source code, for any other purpose other 
 * than for usage associated with connecting to the UK Radioplayer Service in accordance with these 
 * Terms and Conditions, and you shall not convey nor sublicense the Software, including the source 
 * code, for any other purpose or to any third party, without the prior written consent of UK Radioplayer.*
 *
 * @author Gav Richards <gav@gmedia.co.uk>
 *
 * This file calls:
 * @ services
 * @ overlay
 *
 * This file is called by:
 * @ overlay
 *
 * @class mystations
 * @module mystations
 */
 
radioplayer.mystations = {

	received : false,
	gotStnList : false,
	
	maxStations : 15,
	
	/**
	 * Initialize
     *
     * @method init
	 */
	init : function() {
		
		/**
		 * Events to pick up when My Stations cookie and Station List are received
		 */		
		 
		$(radioplayer.services).on('gotMyStationsAndHistory', function(){
			radioplayer.mystations.received = true;
			if (radioplayer.mystations.gotStnList) {
				radioplayer.mystations.initPopulate();
			}
		});
		
		$(radioplayer.services).on('stationListSet', function(){
			radioplayer.mystations.gotStnList = true;
			if (radioplayer.mystations.received) {
				radioplayer.mystations.initPopulate();
			}
		});
		
		/**
		 * Preload heart sprite
		 */
		 
		var img = new Image();
		img.src = radioplayer.consts.assetBaseUrl + "img/heart-sprite.png";
		
	},


	/**
	 * This is called when we get both my stations and the station list
	 * Useful for when we've already opened the menu/my stations, but don't yet have the content we need
	 * so we initiate late
     *
     * @method initPopulate
 	 */
	initPopulate : function() {
		
		// If we've already opened the My Stations tab it will be empty, but we can now load in the stations
		radioplayer.utils.output('checking if my stations is already loaded');
		if ($('#mystations-container').hasClass('loaded')) {
			radioplayer.utils.output('loading in my stations late!');
			radioplayer.mystations.populateList(radioplayer.settings.presets, 'mystations');
		}
		
		
		// If we've already opened the History tab it will be empty, but we can now load in the stations
		if ($('#history-container').hasClass('loaded')) {
			radioplayer.mystations.populateList(radioplayer.settings.history, 'history');
		}
			
	},

    /**
     * Populate my stations and history list
     *
     * @method populateList
     * @param {object} obj Object containing radioplayer IDs
     * @param {string} type e.g. 'mystations'
     */
	populateList : function(obj, type) {
		
		if (obj.length == 0) {
			// This object has no items, so display an appropriate message
			
			if (type == 'mystations') {
				// We don't have a message for the history tab, but it shouldn't ever need one anyway
				$('#' + type + '-container').addClass('has-no-items').html('<div class="no-overlay-items">' + radioplayer.lang.mystations.no_items + '</div>');
			}
				
		} else {
		
			var newObj = [];
			
			$.each(obj, function(i, val){
				
				if (radioplayer.stnList[val]) {
				
					var stationListData = radioplayer.stnList[val];
				
					newObj.push({
						rpId: val,
						serviceName: '', //stationListData.name,
						consoleUrl: stationListData.playerUrl,
						imageUrl: '' //stationListData.logoUrl
					});
				
				} else {
					radioplayer.utils.output('Cant add station ' + val + ' to mystns list, not found in station list');	
				}
			});
			
			var html = '<h2 class="access">' + (type == 'mystations' ? radioplayer.lang.menu_tabs.tab_1_text : radioplayer.lang.menu_tabs.tab_2_text) + '</h2>' + 
					   radioplayer.overlay.iterateResults(newObj, type);
	
			$('#' + type + '-container').html(html);
			
			radioplayer.overlay.lazyLoad($('#' + type + '-container'));
		
		}
		
	},
	

	/**
	 * Add a station to My Stations
     *
     * @method add
     *
	 * @param rpId {integer} ID of the station to add
     * @param containerId {string} ID of the div which is the parent of the overlay-item we are adding
     */
	add : function(rpId, containerId, $contObj) {
		
		rpId = rpId.toString();

        radioplayer.services.analytics.sendEvent('Navigation', 'Add to Favourites', rpId, null, null);

		var oldListLength = radioplayer.settings.presets.length;

		if (radioplayer.settings.presets.length == radioplayer.mystations.maxStations) {
			// Is array already full? Remove last one
			
			var removedId = radioplayer.settings.presets.pop();
			
			// If My Stations list is populated, remove from DOM too
			if ($('#mystations-container').hasClass('loaded')) {
				$('#mystations-container .overlay-item[data-stationid="' + removedId + '"]').remove();
			}
			
			// Update state of all overlay-item's with this rpId
			radioplayer.objs.overlayContainer.find('.overlay-item[data-stationid="' + removedId + '"]')
											 .removeClass('in-mystations')
											 .find('.toggle-mystations button').attr('title', radioplayer.lang.mystations.add_this)
											 .find('span').html(radioplayer.lang.mystations.add_this);
			
			// Update head toggle My Stations icon, if this is current station
			if (removedId == currentStationID) {
				$('#toggle-mystations').removeClass('in-mystations')
									   .attr('title', radioplayer.lang.mystations.add_this)
									   .find('span').html(radioplayer.lang.mystations.add_this);
			}
			
		}
		
		// Add to start of array
		radioplayer.settings.presets.unshift(rpId);
		
		// If we click the add button in the head/controls
		// AND the station is in My Stations but unselected
		// We don't want to add it again
		if (containerId == 'head-controls' && $('#mystations-container .overlay-item[data-stationid="' + rpId + '"]:not(.in-mystations)').length > 0) {
			radioplayer.utils.output('dont add it again');
		
		} else if ($('#mystations-container').hasClass('loaded') && containerId !== 'mystations-container') {
			// If My Stations list is populated AND we haven't clicked on a station in it, add to DOM too
		
			var stationListData = radioplayer.stnList[rpId];
			
			var newObj = [{
				rpId: rpId,
				serviceName: stationListData.name,
				consoleUrl: stationListData.playerUrl,
				imageUrl: stationListData.logoUrl
			}];
			
			var html = radioplayer.overlay.iterateResults(newObj, 'mystations');
	
			if (oldListLength == 0) {
				// Remove the 'no items' placeholder first
				$('#mystations-container').removeClass('has-no-items').html('');
			}
	
			$('#mystations-container').prepend(html);
			
			radioplayer.overlay.lazyLoad($('#mystations-container'));
			
		}
			
		// Update state of all overlay-item's with this rpId
		radioplayer.objs.overlayContainer.find('.overlay-item[data-stationid="' + rpId + '"]')
										.addClass('in-mystations')
										.find('.toggle-mystations button').attr('title', radioplayer.lang.mystations.remove_this)
										.find('span').html(radioplayer.lang.mystations.remove_this);

		// Animate the head control heart, using a PNG sprite like a film reel, as we can't do smooth GIF animation on a varying background

		if ($contObj) {
			// This is a list item heart
			
			// Create an instances of heartAnimation - this class has its own properties and timer
			var myHeart = new radioplayer.mystations.heartAnimation( $contObj.find('button'), false );

			// Update head control heart, if this is current station
			if (rpId == currentStationID) {
				$('#toggle-mystations').addClass('in-mystations')
									   .attr('title', radioplayer.lang.mystations.remove_this)
									   .find('span').html(radioplayer.lang.mystations.remove_this);
			}
			
		} else if (containerId == 'head-controls') {
			// This is the head control heart
			
			// Create an instances of heartAnimation - this class has its own properties and timer
			var myHeart = new radioplayer.mystations.heartAnimation( $('#toggle-mystations'), true );
		}
		
		// Set cookie with updated list of my stations
		radioplayer.services.saveMyStationsOrder();
		
	},
	
	
	/**
	 * Remove a station from My Stations
     *
     * @method remove
     *
	 * @param rpId {integer} ID of the station to remove
     * @param containerId {string} ID of the div which is the parent of the overlay-item we are removing
     */
	remove : function(rpId, containerId, $contObj) {
		
		rpId = rpId.toString();
		
		// Remove from array
		radioplayer.settings.presets = jQuery.grep(radioplayer.settings.presets, function(value) {
			return value != rpId;
		});
		
		// If My Stations list is populated AND we haven't clicked on a station in it, remove from DOM too
		// We want to leave stations in My Stations if we remove them there, until we leave that view
		if ($('#mystations-container').hasClass('loaded') && containerId !== 'mystations-container') {
			$('#mystations-container .overlay-item[data-stationid="' + rpId + '"]').remove();
			
			if (radioplayer.settings.presets.length == 0) {
				// We've removed the last of the stations, so display the 'no items' message
				$('#mystations-container').addClass('has-no-items').html('<div class="no-overlay-items">' + radioplayer.lang.mystations.no_items + '</div>');
			}
		}
			
		// Update state of all overlay-item's with this rpId
		radioplayer.objs.overlayContainer.find('.overlay-item[data-stationid="' + rpId + '"]')
										 .removeClass('in-mystations')
										 .find('.toggle-mystations button').attr('title', radioplayer.lang.mystations.add_this)
										 .find('span').html(radioplayer.lang.mystations.add_this);
		
		// Update head toggle My Stations icon, if this is current station
		if (rpId == currentStationID) {
			$('#toggle-mystations').removeClass('in-mystations')
								   .attr('title', radioplayer.lang.mystations.add_this)
								   .find('span').html(radioplayer.lang.mystations.add_this);
		}
		
		// Set cookie with updated list of My Stations
		radioplayer.services.saveMyStationsOrder();
		
	},
	
	
	/**
	 * Call when hiding the My Stations tab-view. It removes any unselected stations from the DOM.
     *
     * @method purgeRemovedMyStations
     */
	purgeRemovedMyStations : function() {
		
		radioplayer.utils.output('purge my stations');
		$('#mystations-container .overlay-item:not(.in-mystations)').remove();
		
		if (radioplayer.settings.presets.length == 0) {
			// We've removed the last of the stations, so display the 'no items' message
			$('#mystations-container').addClass('has-no-items').html('<div class="no-overlay-items">' + radioplayer.lang.mystations.no_items + '</div>');
		}
		
	},
	
	
	/**
	 * Class to initiate a heart animation
     *
     * @method heartAnimation
	 * 
	 * @param btnObj {object} Button object
	 * @param headHeart {boolean} Animation on head heart?
     */
	heartAnimation : function(btnObj, headHeart) {
		// Storing this in self allows the setInterval to access this variable scope, so we can get at the button object and other vars below
		var self = this;
		
		self.leftPos = 0;
		self.topPos = 0;
		self.btnObj = btnObj;
		self.headHeart = headHeart;
		
		// If this is the head heart, and we're using the light theme, use the light variation of the hearts
		if (headHeart && radioplayer.themeColour == 'light') {
			self.leftPos = "-32px";
		}
		
		// Set up the button for animation
		self.btnObj.addClass('animating')
				   .find('span').css({ backgroundPosition: self.leftPos + ' -' + self.topPos + 'px' });

		// Interval runs the animation
		self.heartInterval = setInterval(function() {
			
			self.topPos += 25;
			
			if (self.topPos == 475) {
				
				// We've reached the end so cease the animation
				clearInterval(self.heartInterval);	
				
				// If this is the head heart, it needs its own class (list hearts have the class already on the list item container)
				if (self.headHeart) {
					self.btnObj.addClass('in-mystations');
				}
				
				// Remove animating class and update accessibility text
				self.btnObj.removeClass('animating')
						   .attr('title', radioplayer.lang.mystations.remove_this)
						   .find('span').removeAttr('style')
										.html(radioplayer.lang.mystations.remove_this);
			} else {
				// Shift the background position to the next heart
				self.btnObj.find('span').css({ backgroundPosition: self.leftPos + ' -' + self.topPos + 'px' });
			}
			
		}, 30);
		
	}
};/**
 * Version: 1.2.22
 * 
 * @name search
 * @description All handling of the Search overlay
 *
 * > *All intellectual property rights in this Software throughout the world belong to UK Radioplayer,
 * rights in the Software are licensed (not sold) to subscriber stations, and subscriber stations 
 * have no rights in, or to, the Software other than the right to use it in accordance with the 
 * Terms and Conditions at www.radioplayer.co.uk/terms. You shall not produce any derivate works 
 * based on whole or part of the Software, including the source code, for any other purpose other 
 * than for usage associated with connecting to the UK Radioplayer Service in accordance with these 
 * Terms and Conditions, and you shall not convey nor sublicense the Software, including the source 
 * code, for any other purpose or to any third party, without the prior written consent of UK Radioplayer.*
 *
 *
 * @author Gav Richards <gav@gmedia.co.uk>
 *
 * Also contains functionality from Radioplayer V1
 * @author Cathy Bartlett <cathy.bartlett@bbc.co.uk>
 * @author Sergejs Vaskevics <sergejs.vaskevics@ubcmedia.com>
 *
 * This file calls:
 * @ services
 * @ overlay
 *
 * This file is called by:
 * @ services
 * @ overlay
 *
 * @class search
 * @module search
 */
 
radioplayer.search = {
	lastSuggestQ : '',
	q : '',
	
    /**
     * @requestFailTimer
     */
	requestFailTimer : null,
	
    /**
     * @property requestFailed
     * @type Boolean
     * @default false
     */
	requestFailed : false,
	
	
	suggestQueryDelay : null,
	
	/**
	 * Initialize
     *
     * @method init
	 */
	init : function() {
		
		/**
		 * Store DOM objects
		 */
		
		radioplayer.objs.searchBox = $('.search-box');
		radioplayer.objs.searchInput = $('#search-input');
		radioplayer.objs.searchContainer = $('.search-container');
		radioplayer.objs.searchResults = $('.search-container .scrollable-wrapper');
		radioplayer.objs.suggestContainer = $('.suggest-container');
		
		radioplayer.objs.searchAllContainer = $('#search-all-cont');
		radioplayer.objs.searchLiveContainer = $('#search-live-cont');
		radioplayer.objs.searchODContainer = $('#search-od-cont');
		
		
		/**
		 * Set initial textbox
		 */
		
		setTimeout(function(){
			radioplayer.objs.searchInput.val(radioplayer.lang.search.search_radioplayer);
		}, 100);


		/**
		 * Localisation
		 */

		$('.search-box h2').html(radioplayer.lang.search.search);
		$('.search-box #search-button').attr('title', radioplayer.lang.search.search).find('span').html(radioplayer.lang.search.search);
		$('.search-box #search-clear').attr('title', radioplayer.lang.search.clear).find('span').html(radioplayer.lang.search.clear);
		$('.search-container .tabs #search-nav-main li').eq(0).find('a span').html(radioplayer.lang.search.tab_all);
		$('.search-container .tabs #search-nav-main li').eq(1).find('a span').html(radioplayer.lang.search.tab_live);
		$('.search-container .tabs #search-nav-main li').eq(2).find('a span').html(radioplayer.lang.search.tab_catchup);
		
		$("#search-nav-toggle").click(function(e) {
			e.preventDefault();
			radioplayer.search.hideShowNavigationMenu();
		});
		
		radioplayer.objs.searchInput.on('focus click', function(){
			/**
			 * Focus or click search input box
			 * Also called because resetSearchInput() calls focus()
			 */
			var ratio = window.devicePixelRatio || 1;
			var w = screen.width * ratio;

			if (w < 448) {
				$('.radioplayer-globalnav .rp-logo').addClass('invisible');
			} else {
				$('.radioplayer-globalnav .rp-logo').addClass('reduced');
			}
			radioplayer.objs.searchBox.addClass('focus');
			 
			if (radioplayer.objs.searchInput.val() == radioplayer.lang.search.search_radioplayer 
			 && !radioplayer.objs.searchBox.hasClass('active')) {
				  
				// Focussed on text field when it contains default, and box is not active
				// Set cursor to start
				radioplayer.objs.searchInput.val('').enableSelection();
				radioplayer.utils.setCaretToPos(document.getElementById("search-input"), 0);
				
			} else if (radioplayer.objs.searchInput.val() != '' 
					&& radioplayer.objs.searchBox.hasClass('active')
				    && radioplayer.objs.suggestContainer.data('results') > 0 
				    && !radioplayer.objs.body.hasClass('showing-overlay')) {
				
				// Search input is not blank, but we're not showing an overlay
				// Show suggest overlay				
				radioplayer.overlay.show(radioplayer.lang.general.close_search);
				radioplayer.objs.body.addClass('showing-suggest');
				
				// Re-execute suggest search, if value has changed since last suggest search
				if (radioplayer.search.lastSuggestQ != radioplayer.objs.searchInput.val()) {
					radioplayer.search.execSuggest();
				}
				
			}
			
			
		}).on('blur', function(){
			/**
			 * Blur search input box
			 */
			 $('.radioplayer-globalnav .rp-logo').removeClass('reduced');
			 radioplayer.objs.searchBox.removeClass('focus');
			 
			if (radioplayer.objs.searchBox.hasClass('active') 
			 && radioplayer.objs.searchInput.val() == '') {
				// Search input is active but input is blank
				
				if (radioplayer.objs.body.hasClass('showing-suggest')) {
					// Suggest is showing, hide the results (also resets the search input)
					radioplayer.search.clearAndCloseSuggestResults();
					
				} else {
					radioplayer.search.resetSearchInput();
				}
			} else if (radioplayer.objs.searchInput.val() == '') {
				radioplayer.objs.searchInput.val(radioplayer.lang.search.search_radioplayer);
			}
			
			
		}).on('keydown', function(event) {
			/**
			 * Keydown on search input box
			 */
			
			if (event.which == 9) {
				// pressed tab - allow regular behaviour
			
			} else if (!radioplayer.objs.searchBox.hasClass('active')) {
				// Input is default value
				
				// Only interested in real characters - http://stackoverflow.com/questions/8742790/keydown-only-with-real-characters
				// added 8 backspace, 32 space, 46 delete
				if ($.inArray(event.which, [8,13,16,17,18,19,20,27,32,35,36,37,38,39,40,46,91,93,224]) !== -1) {
					event.preventDefault();
					
				} else {
					radioplayer.objs.searchBox.addClass('active');
					
					if (!radioplayer.objs.body.hasClass('showing-search') && !radioplayer.objs.body.hasClass('showing-suggest')) {
						// We're not already showing search or suggest, so show the suggest overlay
						radioplayer.overlay.show(radioplayer.lang.general.close_search);
						radioplayer.objs.body.addClass('showing-suggest');
					}
					
				}
				
			// We've closed suggest/search but still have characters in the input
			// Then we click in the input and continue typing. At this point, show suggest again.
			} else if (radioplayer.objs.searchInput.val() !== ''
					&& !radioplayer.objs.body.hasClass('showing-search') 
					&& !radioplayer.objs.body.hasClass('showing-suggest')) {
				
				// We're not already showing search or suggest, so show the suggest overlay
				radioplayer.overlay.show(radioplayer.lang.general.close_search);
				radioplayer.objs.body.addClass('showing-suggest');
			}
			
				
		}).on('keyup', function(event){
			/**
			 * Keyup on search input box
			 */
			
			radioplayer.overlay.resetInactivity();
			
			var $sc = radioplayer.objs.suggestContainer; // store ref here to keep code tidy
			
			if (event.which == 38 && radioplayer.objs.body.hasClass('showing-suggest')) {
				// Key up
				
				if ($sc.find(".suggest-item.on").length == 0) {
					$sc.find(".suggest-item:last").addClass("on kb-focus");
				} else {
					var index = $sc.find(".suggest-item").index($sc.find(".suggest-item.on"));
					$sc.find(".suggest-item.on").removeClass("on kb-focus");
					$sc.find(".suggest-item").eq(index-1).addClass("on kb-focus");
				}
				
			} else if (event.which == 40 && radioplayer.objs.body.hasClass('showing-suggest')) {
				// Key down
				
				if ($sc.find(".suggest-item.on").length == 0) {
					$sc.find(".suggest-item:first").addClass("on kb-focus");
				} else if ($sc.find(".suggest-item:last").hasClass("on")) {
					$sc.find(".suggest-item:last").removeClass("on kb-focus");
					$sc.find(".suggest-item:first").addClass("on kb-focus");
				} else {
					var index = $sc.find(".suggest-item").index($sc.find(".suggest-item.on"));
					$sc.find(".suggest-item.on").removeClass("on kb-focus");
					$sc.find(".suggest-item").eq(index+1).addClass("on kb-focus");
				}	
					
			} else if (event.which == 13) {
				// Enter
				
				if (radioplayer.objs.body.hasClass('showing-suggest')) {
					// When suggest results are visible
				
					var $selItem = $sc.find(".suggest-item.on.kb-focus");
				
					if ($selItem.length == 1) {
						// If an item is selected using keyboard
						
						if ($selItem.hasClass("show-all")) {
							// User has keyboard navigated down to 'show all' and pressed enter - execute full results
							radioplayer.search.execFull();
							
							// Collapse the navigation menu by default
							radioplayer.search.hideNavigationMenu();
						} else {
							// User has keyboard navigated down to a result and pressed enter - jump to that console
							var href = $selItem.find("a").attr("href");
							window.location.href = href;
						}
						
					} else {
						radioplayer.search.execFull();
						
						// Collapse the navigation menu by default
						radioplayer.search.hideNavigationMenu();
					}
				
				} else if (radioplayer.objs.body.hasClass('showing-search')) {
					// Full search results are visible
					
					radioplayer.search.execFull();	
					
					// Collapse the navigation menu by default
					radioplayer.search.hideNavigationMenu();
				}
				
				
			// Only interested in real characters - http://stackoverflow.com/questions/8742790/keydown-only-with-real-characters
			// added 9 tab
			} else if ($.inArray(event.which, [9,13,16,17,18,19,20,27,35,36,37,38,39,40,91,93,224]) == -1) {

			/*} else if (event.which == 8 // backspace
				   || (event.which >= 32 && event.which <= 127) // most characters including a-z, 0-9, space, punctuation, delete key
			 	   || (event.which >= 192 && event.which <= 255) // latin characters
			 ) {*/
				// Key press
				 
				$('#search-clear').hide();
				$('#search-button').show();
				
				if (radioplayer.objs.body.hasClass('showing-suggest')) {
					// Suggest is showing
					
					$sc.find('.suggest-item.show-all').removeClass('on kb-focus');
					
					if (radioplayer.objs.searchInput.val() == '') {
						// Search box is now blank, hide the results
						radioplayer.search.clearAndCloseSuggestResults();
						
					} else {
						// Search box is not blank, execute a suggest request
						radioplayer.search.execSuggest();
					}

				} else {
					// Suggest is not showing
					
					if (radioplayer.objs.searchInput.val() == '') {
						// Reset the search input box
						radioplayer.search.resetSearchInput();
					}
				}
				
			}
			
			
		/**
		 * Disable selection of the search input box by default
		 */
		}).disableSelection();
		
		
		radioplayer.objs.suggestContainer.on('click', '.suggest-item.show-all a', function(e){
			/**
			 * Click the 'show all' suggest result to execute a full search
			 */
			
			e.preventDefault();
			
			radioplayer.search.execFull();
			
			// Collapse the navigation menu by default
			radioplayer.search.hideNavigationMenu();
			
		}).on('click', '#suggest-results .suggest-item a', function(e) {
			/**
			 * Click a suggest result to go to that console
			 */
			
            e.preventDefault();

            var stationId = $(this).parent().data('rpid');
            var href = $(this).attr('href');

            radioplayer.services.analytics.sendEvent('Search', 'Autosuggest', stationId.toString(), null, null);

            setTimeout(function() {
                window.location.href = href;
            }, 100);
			
		}).on("mouseenter", ".suggest-item", function(){
			/**
			 * Mouse over a suggest result item
			 * Remove 'on' class from any other items, add it to this one
			 */

			radioplayer.objs.suggestContainer.find(".suggest-item").removeClass("on kb-focus");
			$(this).addClass("on");
			
		}).on("mouseleave", ".suggest-item", function(){
			/**
			 * Mouse out a suggest result item
			 */

			$(this).removeClass("on kb-focus");
		});
		

		$("#search-button").on('click', function(e){
			/**
			 * Click the magnify glass icon to execute a full search
			 */
			
			radioplayer.search.execFull();
			
			// Collapse the navigation menu by default
			radioplayer.search.hideNavigationMenu();
			
		});

		$("#search-clear").on('click', function(e){
			/**
			 * Click the cross icon to clear the search box
			 */
			 
			radioplayer.search.resetSearchInput();
			
		});
		
		
		/**
		 * Toggle Station Groups
		 */
		
		$('#search-all-cont, #search-live-cont, #search-od-cont').on("click", ".station-group a.station-group-toggle", function(e){
			
			e.preventDefault();
			
			// Is group currently collapsed?
			var $groupBtn = $(this),
				$group = $groupBtn.parent().parent(),
				brand = $group.attr("data-brand");
			
			if ($group.hasClass("collapsed")) {
				// Show the station group
				$group.removeClass("collapsed");
				var fewerMsg = radioplayer.lang.search.show_fewer_stations;
				fewerMsg = fewerMsg.replace("{group}", brand);
				$groupBtn.html('<i></i>' + fewerMsg);
				
				$parentContainer = $group.parent();
				
				radioplayer.overlay.lazyLoad($parentContainer);
				
			} else {
				// Hide the station group
				$group.addClass("collapsed");
				var moreMsg = radioplayer.lang.search.show_more_stations;
				moreMsg = moreMsg.replace("{group}", brand);
				$groupBtn.html('<i></i>' + moreMsg);
			}
		});
		
	},
	
	
	/**
	 * Execute a suggest search
     *
     * @method execSuggest
	 */
	execSuggest: function() {
		
		// Get value and trim
		var q = $.trim( radioplayer.objs.searchInput.val() );
		
		// Remove tags
			regex = /(<([^>]+)>)/ig,
			q = q.replace(regex, "");
	
		var show_all_msg = radioplayer.lang.search.show_all_results_for.replace("{terms}", '<strong>' + q + '</strong>');
	
		$('.suggest-item.show-all a').html(show_all_msg);
	
		clearTimeout(radioplayer.search.suggestQueryDelay);
		radioplayer.search.suggestQueryDelay = setTimeout(function(){
	
			// Don't search for blank, or same as previous query
			if (q != "" && q != radioplayer.search.lastSuggestQ) {
				
				radioplayer.search.lastSuggestQ = q;
			
				radioplayer.services.getAPI(radioplayer.consts.api.suggest + "?query=" + encodeURIComponent(q) + "&callback=radioplayer.search.receiveSuggest");
				
			}
			
		}, 150);
		
	},

    /**
     * Called when receiving suggest results data
     *
     * @method receiveSuggest
     * @param data
     * @private
     */
	receiveSuggest: function(data) {
		
		var insHTML = '<h2 class="access">' + radioplayer.lang.search.suggested_title + '</h2>';
		var results = 0;
		
		if (data.live.length > 0) {
			
			insHTML += '<div class="suggest-divider">' + radioplayer.lang.search.suggested_stations + '</div>';
			
			$.each(data.live, function(index, resVal){
				
				insHTML += '<div class="suggest-item' + (resVal.name ? ' has-prog-name' : '') + '" data-rpid="'+ resVal.rpId +'"><a href="' + resVal.url + '">' +
							  '<img class="image" src="' + resVal.imageUrl + '" alt="" /><span class="name">' + resVal.serviceName + '</span>' + (resVal.name ? '<span class="prog-name">' + resVal.name + '</span>' : '') + 
						   '</a></div>';
						   
				results++;
				
			});
			
		}
		
		if (data.onDemand.length > 0) {
			
			insHTML += '<div class="suggest-divider">' + radioplayer.lang.search.suggested_catch_up + '</div>';
			
			$.each(data.onDemand, function(index, resVal){
				
				insHTML += '<div class="suggest-item has-prog-name" data-rpid="'+ resVal.rpId +'"><a href="' + resVal.url + '">' +
							  '<img class="image" src="' + resVal.imageUrl + '" alt="" /><span class="name">' + resVal.serviceName + '</span><span class="prog-name">' + resVal.name + '</span>' +
						   '</a></div>';
						   
				results++;
				
			});
			
		}
		
		radioplayer.objs.suggestContainer.data('results', results);
		
		$('#suggest-results').html(insHTML);
		
	},
	
	
	/**
	 * Clear the search box, return to default state
     *
     * @method resetSearchInput
	 */
	resetSearchInput : function() {
		
		$("#search-clear").hide();
		$('#search-button').show();
		
		// Remove active class before giving focus back to search input, so we can detect it is no longer active
		radioplayer.objs.searchBox.removeClass('active');
		radioplayer.objs.searchInput.val(radioplayer.lang.search.search_radioplayer).disableSelection().focus();

		radioplayer.utils.setCaretToPos(document.getElementById("search-input"), 0);
		
	},
	
	
	/**
	 * Clear the search box, return to default state
     *
     * @method clearAndCloseSuggestResults
	 */
	clearAndCloseSuggestResults : function() {
		
		$('#suggest-results').html('');
		$('.suggest-item.show-all a').html('');
		
		radioplayer.search.lastSuggestQ = '';
	
		radioplayer.overlay.hide();

		// Reset the search input box
		radioplayer.search.resetSearchInput();
		
	},
	
	
	/**
	 * Execute a full search
     *
     * @method execFull
	 */
	execFull : function() {
		
		// Get value and trim
		var q = $.trim( radioplayer.objs.searchInput.val() ), 
		
		// Remove tags
			regex = /(<([^>]+)>)/ig,
			q = q.replace(regex, "");
		
		// Don't search for blank or the default text
		if (q != "" && radioplayer.objs.searchBox.hasClass('active')) {
		
			if (radioplayer.objs.body.hasClass('showing-search')) {
				// Don't close the search overlay if it's already showing
			} else {
				radioplayer.overlay.show(radioplayer.lang.general.close_search);
				radioplayer.objs.body.addClass('showing-search');
			}
			
			// Unbind actions
			radioplayer.objs.searchContainer.off();
			
			// Clear existing results
			radioplayer.objs.searchContainer.find('.tab-container').html('').removeClass('loaded has-error');
			
			// Reset tabs
			$prevSelTab = $('.search-container .tabs #search-nav-main li.on');
			$prevSelTab.removeClass('on');
			$('.search-container .tabs #search-nav-toggle li').eq(0).find('a').html(radioplayer.overlay.getMenuToggleLabel(radioplayer.lang.search.tab_live));	
			radioplayer.overlay.selectTab(radioplayer.objs.searchContainer.find('.tabs #search-nav-main li').eq(0));
			
			// Show loading indicator
			radioplayer.search.showTabSpinner();
			
			// Give focus back to textbox, if not iOS
			if(!radioplayer.consts.is_iOS) {
				radioplayer.objs.searchInput.focus();
			}
			
			// Show cross instead of magnify button
			$('#search-button').hide();
			$('#search-clear').show();
			
			// Set up fail safe
			radioplayer.search.requestFailed = false;
			radioplayer.search.requestFailTimer = setTimeout(function() { radioplayer.search.showFailMsg('all'); }, 15000);
			
			// Build search query string
			var QS = "?query=" + encodeURIComponent(q) + 
					 "&rpId=" + currentStationID + 
					 "&callback=radioplayer.search.receiveall";
			
			if (radioplayer.settings.guid != '') {
				// Get GUID
				QS += "&guid=" + radioplayer.settings.guid;	
			}
			
			// Perform search query
			radioplayer.services.getAPI(radioplayer.consts.api.search + QS);
			
			// Store query for later
			radioplayer.search.q = q;
		
		} else {
			if(!radioplayer.consts.is_iOS) { // Give the focus to the search box.
				radioplayer.objs.searchInput.focus();
			}
		}
		
	},
	
	
	/**
	 * Click Live or OD tab - request the data for that tab
     *
     * @method tabRequest
	 * @param tab {String} either 'live' or 'od'
	 */
	tabRequest : function(tab) {
		this.showTabSpinner();
		
		// Set up fail safe
		radioplayer.search.requestFailed = false;
		radioplayer.search.requestFailTimer = setTimeout(function() { radioplayer.search.showFailMsg(tab); }, 15000);
		
		var QS = "?query=" + encodeURIComponent(radioplayer.search.q) +  
				 "&rpId=" + currentStationID + 
				 "&callback=radioplayer.search.receive" + tab;
		
		if (radioplayer.settings.guid != '') {
			// Get GUID
			QS += "&guid=" + radioplayer.settings.guid;	
		}
		
		radioplayer.services.getAPI(radioplayer.consts.api.search + "/" + tab + QS);
	},

    /**
     * @method receiveall
     * @param data
     * @private
     */
	receiveall : function(data) {
		this.receiveParse('all', data);
	},

    /**
     * @method receivelive
     * @param data
     * @private
     */
	receivelive : function(data) {
		this.receiveParse('live', data);
	},

    /**
     * @method receiveod
     * @param data
     */
	receiveod : function(data) {
		this.receiveParse('od', data);
	},

    /**
     * @method showTabSpinner
     */
	showTabSpinner : function() {
		radioplayer.objs.searchContainer.find('.search-wrapper .spinner').show();
	},

    /**
     * @method hideTabSpinner
     */
	hideTabSpinner : function() {
		radioplayer.objs.searchContainer.find('.search-wrapper .spinner').hide();
	},

	/**
	 * Receive search results
     *
     * @method receiveParse
     * @param data {Object} Search result data
	 */
	receiveParse : function(tab, data){
		
		clearTimeout(this.requestFailTimer);
		
		if (!this.requestFailed) {
			// If the request has already failed (and now we've received the results after the timeout period) then DON'T show them now
		
			if (data.responseStatus == 'SUCCESS') {
				
				var resultsHtml = '<h2 class="access">' + radioplayer.lang.search["tab_" + tab + "_title"] + '</h2>';
					
				if (data.total == 0) {
					// No results
					
					// Escape HTML and truncate string
					resultsHtml = this.noResultsMsg(tab, radioplayer.search.q);
					
					$('#search-' + tab + '-cont').addClass('has-error');
					
				} else {
					// We have results
				
					// Iterate over search result items, build HTML
					// We use the shared iterateResults() function
					resultsHtml += radioplayer.overlay.iterateResults(data.results, 'search');

				} // end - we have results
				
				// Hide loading indicator
				this.hideTabSpinner();
				
				// Show search results
				$('#search-' + tab + '-cont').html(resultsHtml);
				
				// Scroll to the top
				$('#search-' + tab + '-cont').scrollTop(0);
				
				radioplayer.overlay.lazyLoad($('#search-' + tab + '-cont'));

			} else { // responseStatus is not 'SUCCESS'
				// Show fail message
				this.showFailMsg(tab);
			}
		}

	},
	
	
	/**
	 * No Results Message
     *
     * @method noResultsMsg
	 * @param tab {String} all, live or od
     * @param searchString {String}
     * @return {String} Localised no results message
	 */
	noResultsMsg : function(tab, searchString) {
		// Replace {terms} in the message with the search terms
		
		if (tab == 'live') {
			var no_results_msg = radioplayer.lang.search.no_live_results;	
		} else if (tab == 'od') {
			var no_results_msg = radioplayer.lang.search.no_od_results;	
		} else {
			var no_results_msg = radioplayer.lang.search.no_all_results;	
		}
		
		no_results_msg = '<div class="error-message no-results">' + no_results_msg.replace("{terms}", searchString) + '</div>';

        radioplayer.services.analytics.sendEvent('Search', 'Zero Results', searchString, null, null); // Send Analytics for no results

		return no_results_msg;
	},
	
	
	/**
	 * Fail Message
     *
     * @method showFailMsg
	 */
	showFailMsg : function(tab) {
		this.requestFailed = true;
		
		// Hide loading indicator
		this.hideTabSpinner();
		
		// Populate overlay
		var fail_message = '<div class="error-message fail">' + radioplayer.lang.general.fail_message + '</div>';
		
		$('#search-' + tab + '-cont').addClass('has-error')
									 .html(fail_message);
		
        radioplayer.services.analytics.sendEvent('Errors', 'Failed Search', currentStationID, null, null); // Send Analytics for failed search
	}, 
	
	
    /**
     * Reset the Navigation Menu
     *
     * @method resetNavigationMenu
     */	
	resetNavigationMenu : function() {	

		$('.search-container .search-wrapper').removeClass('nav-collapsed');
		$('#search-nav-main').show();	
		radioplayer.search.hideNavigationMenu();		
	},
	
	
    /**
     * Hides/Shows the Navigation Menu
     *
     * @method hideShowNavigationMenu
     */	
	hideShowNavigationMenu : function() {	

		if ($('#search-nav-main').is(':visible')) {
			$('#search-nav-main').hide();
			$('#search-nav-toggle li a .menu_toggle').removeClass('nav-expanded');
			$('.search-container .search-wrapper').addClass('nav-collapsed');
		} else {
			$('#search-nav-main').show();
			$('#search-nav-toggle li a .menu_toggle').addClass('nav-expanded');
			$('.search-container .search-wrapper').removeClass('nav-collapsed');
		}
	},
	
	
    /**
     * Hides the Navigation Menu
     *
     * @method hideNavigationMenu
     */	
	hideNavigationMenu : function() {	

		if ($('#search-nav-toggle').is(':visible')) {
			$('#search-nav-main').hide();
			$('#search-nav-toggle li a .menu_toggle').removeClass('nav-expanded');
			$('.search-container .search-wrapper').addClass('nav-collapsed');
			radioplayer.search.searchNavMenuVisible = true;
		}
	}
};
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
 * @name lang
 * @description Localisation resource for user-visible strings
 *
 * @author Gav Richards <gav@gmedia.co.uk>
 * @author Roger Hofmann (de) <r.hofmann@FFH.de>
 *
 */
 
radioplayer.lang = {
	
	general: {
		radioplayer: 			'Radioplayer',		// Accessibility
		open_menu: 				'Radioplayer Menü öffnen',	// Accessibility
		close_menu:				'Radioplayer Menü schließen',	// Accessibility
		close_search:			'Radioplayer Suche schließen',	// Accessibility
		
		fail_message:			'<h1>Es gibt ein Problem...</h1>' + 
								'<p><strong>Entschuldigen</strong> Sie die Störung. Bitte prüfen Sie zunächst Ihre Internetverbindung.</p>' +
								'<p>Sollte das Problem bei uns liegen, dann arbeiten unsere Techniker schon daran. <br />Bitte versuchen Sie es später nochmal.</p>',
		
		reduced_func_anno:		'Mit diesem Browser können Sie leider nicht alle Funktionen des Radioplayers nutzen. ' + 
								'<a href="http://www.radioplayer.de/cookies/" target="_blank">Ändern Sie die Cookie-Einstellungen</a>, oder <a href="http://www.radioplayer.de/apps" target="_blank">laden Sie sich unsere kostenlose App.</a>',

	    cookie_anno:            'Der Radioplayer verwendet Cookies, um alle Funktionen anbieten zu können.<br />' +
	                            'Was Cookies sind und wie wir sie verwenden, können Sie <a href="http://www.radioplayer.de/cookies/" target="_blank">hier nachlesen</a>. ' +
	                            'Indem Sie den Radioplayer verwenden, erklären Sie sich mit der Nutzung von Cookies einverstanden.',

		cookie_consent: '<p>Der Radioplayer verwendet und speichert Daten (aus Cookies und der IP-Adresse) zu Ihrem Hörverhalten, Ihren Favoriten und Ihrem Standort.</p><p>Diese Daten werden benötigt um Sender in der Nähe und Ihre Favoriten anzuzeigen, sowie um bessere Empfehlungen aussprechen zu können. Weitere Informationen hierzu erhalten Sie in unseren <a target="_blank" href="https://www.radioplayer.de/impressum-datenschutz.html">Datenschutzbestimmungen</a>.</p>',
								
		cookie_consent_dismiss:	'Akzeptieren',

		apps_download:			'Apps zum Download'
	},
	
	controls: {
		loading: 				'Laden...',
		player_controls: 		'Player Steuerung',		// Accessibility
		play: 					'Play',					// Accessibility
		pause: 					'Pause',				// Accessibility 
		stop: 					'Stopp', 				// Accessibility
		mute: 					'Stumm',					// Accessibility
		unmute: 				'Stumm aus',				// Accessibility
		set_volume:				'Lautstärke',			// Accessibility
		set_volume_20: 			'Lautstärke 20%',	// Accessibility
		set_volume_40: 			'Lautstärke 40%',	// Accessibility
		set_volume_60: 			'Lautstärke 60%',	// Accessibility
		set_volume_80: 			'Lautstärke 80%',	// Accessibility
		set_volume_100: 		'Lautstärke 100%',	// Accessibility
		use_device_controls:	'Bitte verwenden Sie den Lautstärkeregler an Ihrem Gerät.',
		press_play_prompt:		'Zum Starten<br>Play drücken',
        skip_forward_5_seconds: '5 Sekunden weiter springen',
        skip_back_5_seconds:    '5 Sekunden zurück springen',
        skip_forward_30_seconds:'30 Sekunden weiter springen',
        skip_back_30_seconds:   '30 Sekunden zurück springen',
        skip_forward_1_minute:  '1 Minute weiter springen',
        skip_back_1_minute:     '1 Minute zurück springen',
        skip_forward_5_minutes: '5 Minuten weiter springen',
        skip_back_5_minutes:    '5 Minuten zurück springen',
        skip_forward_10_minutes:'10 Minuten weiter springen',
        skip_back_10_minutes:   '10 Minuten zurück springen',
        skip_forward_30_minutes:'30 Minuten weiter springen',
        skip_back_30_minutes:   '30 Minuten zurück springen'
	},

	playing: {
		live:					'Live',
		live_width:				28,
        format:                 '{artist} - {track}'
	},
	
	songactions: {
		buy:					'Kaufen',
		download:				'Download',
		music:					'Musik',
		info:					'Information',
		add:					'Hinzufügen',
		rate:					'Bewerten',
		custom:					'custom'
	},
	
	menu_tabs: {										// width values must total 750px
		tab_1_text: 			'Meine Sender',
		tab_1_width:			'187px',
		tab_2_text:				'zuletzt gehört',
		tab_2_width:			'187px',
		tab_3_text:				'Empfohlen',
		tab_3_width:			'187px',
		tab_4_text: 			'Sender A-Z',
		tab_4_width:			'189px'
	},
	
	recommendations: {
		locale: 				'de_DE'
	},
	
	azlist: {
		alphabet_array:			['#','a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z'],
		no_stations_beginning: 	'Hier gibt es noch keine Sender, die mit {letter} beginnen',
		view_stations_beginning:'Sender anzeigen, die mit {letter} beginnen',
		a_number:				'einer Zahl', // This is used in place of {letter} for the previous two strings, where the user is hovering over #
		no_stations: 			'Es gibt noch keinen Sender mit diesem Buchstaben'
	},
	
	mystations: {
		add_this:				'Sender zu Meine Sender hinzufügen',		// Accessibility
		remove_this:			'Sender aus Meine Sender entfernen',	// Accessibility
		no_items: 				'<h1>Zu Meine Sender hinzufügen</h1>' + 
								'<p>Sie haben noch keine Sender gespeichert.<br />Klicken Sie auf das graue Herz bei Ihren Lieblingssendern, um sie hier zu speichern.</p>'
	},
	
	search: {
		search: 				'Suchen',				// Accessibility
		clear:					'Suchfeld löschen',	    // Accessibility
		search_radioplayer: 	'Sender finden',
		
		suggested_title:		'Empfohlene Suchergebnisse',
		suggested_stations:		'Empfohlene Sender',
		suggested_catch_up:		'Empfohlene Podcasts',
		show_all_results_for:	'Alle Ergebnisse zu {terms} anzeigen', // {terms} will be swapped for the search string in this message
		
		tab_all:				'Alle',
		tab_all_title:			'Alle Suchergebnisse',
		tab_live:				'Live',
		tab_live_title:			'Gefundene Live-Programme',
		tab_catchup:			'Podcasts',
		tab_catchup_title:		'Gefundene Podcasts',
		
		show_fewer_stations: 	'Weniger {group} Sender anzeigen',	// The {group} placeholder will be swapped for the name of the station group
		show_more_stations: 	'Mehr {group} Sender anzeigen',
		show_information: 		'Informationen anzeigen',		// Accessibility
		hide_information: 		'Informationen ausblenden',		// Accessibility
		
		no_all_results:			'<h1>Nichts gefunden</h1>' + // {terms} will be swapped for the search string in these three messages
								'<p>Wir konnten keine Sender oder Podcasts passend zu <br /><span class="terms">{terms}</span><br />finden.</p>' +
								'<p>Bitte prüfen Sie Ihre Eingabe oder starten Sie eine neue Suche mit dem Namen eines <strong>Senders</strong>, eines <strong>Programms</strong>, oder mit einem <strong>Ort</strong>.</p>',
		
		no_live_results:		'<h1>Nichts gefunden</h1>' + 
								'<p>Wir konnten keinen Sender passend zu <br /><span class="terms">{terms}</span><br />finden.</p>' +
								'<p>Bitte prüfen Sie Ihre Eingabe oder starten Sie eine neue Suche mit dem Namen eines <strong>Senders</strong>, eines <strong>Programms</strong>, oder mit einem <strong>Ort</strong>.</p>',
		
		no_od_results:			'<h1>Nichts gefunden</h1>' + 
								'<p>Wir konnten keinen Podcast passend zu <br /><span class="terms">{terms}</span><br />finden.</p>' +
								'<p>Bitte prüfen Sie Ihre Eingabe oder starten Sie eine neue Suche mit dem Namen eines <strong>Senders</strong>, eines <strong>Programms</strong>, oder mit einem <strong>Ort</strong>.</p>',
								
		live: 					'Live',
		coming_up: 				'In Kürze',
		broadcast: 				'Podcast',

		in_seconds: 			'in Sekunden',
		in_minute: 				'in 1 Minute',
		in_minutes: 			'in {n} Minuten',		// {n} placeholder will be swapped for the number
		second_ago: 			'vor 1 Sekunde',
		seconds_ago: 			'vor {n} Sekunden',
		minute_ago: 			'vor 1 Minute',
		minutes_ago: 			'vor {n} Minuten',
		hour_ago:				'vor 1 Stunde',
		hours_ago:				'vor {n} Stunden',
		day_ago:				'vor 1 Tag',
		days_ago:				'vor {n} Tagen',
		week_ago:				'vor 1 Woche',
		weeks_ago:				'vor {n} Wochen',
		month_ago:				'vor 1 Monat',
		months_ago:				'vor {n} Monaten',
		year_ago:				'vor 1 Jahr',
		years_ago:				'vor {n} Jahren'
	},
	
	stream_error: {
		unavailable: 			'<h1>Leider nur Stille</h1>' +
								'<p>Wir versuchen den Sender zu starten, aber es funktioniert leider nicht.</p>' +
								'<p>Entweder ist der Webstream gerade nicht verfügbar oder er ist nicht mit Ihrem Gerät kompatibel.</p>' +
								'<p>Glücklicherweise gibt es einen anderen Weg, das Programm zu hören: <a href="http://www.radioplayer.de/apps" target="_blank">Laden Sie sich unsere kostenlose Radioplayer-App</a> auf Ihr Smartphone oder Tablet.</p>',
		
		device_incompatible: 	'<h1>Leider nur Stille</h1>' +
								'<p>Wir versuchen den Sender zu starten, aber offenbar ist der Webstream nicht mit Ihrem Gerät kompatibel.</p>' +
								'<p>Glücklicherweise gibt es einen anderen Weg, das Programm zu hören: <a href="http://www.radioplayer.de/apps" target="_blank">Laden Sie sich unsere kostenlose Radioplayer-App</a> auf Ihr Smartphone oder Tablet.</p>'
	}
	
};
