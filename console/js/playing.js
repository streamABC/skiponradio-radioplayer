/**
 * Version: 1.2.17
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
};