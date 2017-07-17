/**
 * Version: 1.2.17
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
