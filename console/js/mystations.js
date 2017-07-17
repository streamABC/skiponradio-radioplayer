/**
 * Version: 1.2.17
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
};