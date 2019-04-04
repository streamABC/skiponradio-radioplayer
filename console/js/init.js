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
};