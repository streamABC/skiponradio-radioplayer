/**
 * Version: 1.2.17
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

		if (document.cookie.indexOf("rp-accepted-cookie-consent") != -1) {
			
			// Use the locally set cookie value if available
			radioplayer.consts.show_cookie_consent = false;
			
			// In case it has been lost, set session cookie to not show cookie consent
			radioplayer.services.saveCookie("cookie-consent/s", "accepted-cookie-consent", "true", callback);

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
		
		if (data.accepted) {
			
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
			if (radioplayer.consts.show_cookie_anno) {
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

		if (/(Safari)/.test(user.browser.family)) {
			// If iOS on Safari, show an announcement explaining reduced functionality
			radioplayer.services.showAnno(radioplayer.lang.general.reduced_func_anno);
		} else {
			$('.radioplayer').append('<div class="radioplayer-cookie-consent"><a href="#" class="cookie-consent-button">' + radioplayer.lang.general.cookie_consent_dismiss + '</a><div class="cookie-consent-text">' + radioplayer.lang.general.cookie_consent + '</div></div>');

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
