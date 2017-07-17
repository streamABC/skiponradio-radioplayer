/**
 * Version: 1.2.17
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
	
};