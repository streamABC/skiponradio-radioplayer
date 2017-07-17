/**
 * Version: 1.2.17
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
