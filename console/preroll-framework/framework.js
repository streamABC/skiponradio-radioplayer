/*
 * Radioplayer Pre-roll Framework
 * Can be used for interstitial or overlay advertising
 *
 * Version: 1.2.17
 */
 
// JSON.stringify for browsers that don't support it (IE7)
// https://github.com/douglascrockford/JSON-js
if(typeof JSON!=="object"){JSON={}}(function(){function f(n){return n<10?"0"+n:n}if(typeof Date.prototype.toJSON!=="function"){Date.prototype.toJSON=function(){return isFinite(this.valueOf())?this.getUTCFullYear()+"-"+f(this.getUTCMonth()+1)+"-"+f(this.getUTCDate())+"T"+f(this.getUTCHours())+":"+f(this.getUTCMinutes())+":"+f(this.getUTCSeconds())+"Z":null};String.prototype.toJSON=Number.prototype.toJSON=Boolean.prototype.toJSON=function(){return this.valueOf()}}var cx=/[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,escapable=/[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,gap,indent,meta={"\b":"\\b","\t":"\\t","\n":"\\n","\f":"\\f","\r":"\\r",'"':'\\"',"\\":"\\\\"},rep;function quote(string){escapable.lastIndex=0;return escapable.test(string)?'"'+string.replace(escapable,function(a){var c=meta[a];return typeof c==="string"?c:"\\u"+("0000"+a.charCodeAt(0).toString(16)).slice(-4)})+'"':'"'+string+'"'}function str(key,holder){var i,k,v,length,mind=gap,partial,value=holder[key];if(value&&typeof value==="object"&&typeof value.toJSON==="function"){value=value.toJSON(key)}if(typeof rep==="function"){value=rep.call(holder,key,value)}switch(typeof value){case"string":return quote(value);case"number":return isFinite(value)?String(value):"null";case"boolean":case"null":return String(value);case"object":if(!value){return"null"}gap+=indent;partial=[];if(Object.prototype.toString.apply(value)==="[object Array]"){length=value.length;for(i=0;i<length;i+=1){partial[i]=str(i,value)||"null"}v=partial.length===0?"[]":gap?"[\n"+gap+partial.join(",\n"+gap)+"\n"+mind+"]":"["+partial.join(",")+"]";gap=mind;return v}if(rep&&typeof rep==="object"){length=rep.length;for(i=0;i<length;i+=1){if(typeof rep[i]==="string"){k=rep[i];v=str(k,value);if(v){partial.push(quote(k)+(gap?": ":":")+v)}}}}else{for(k in value){if(Object.prototype.hasOwnProperty.call(value,k)){v=str(k,value);if(v){partial.push(quote(k)+(gap?": ":":")+v)}}}}v=partial.length===0?"{}":gap?"{\n"+gap+partial.join(",\n"+gap)+"\n"+mind+"}":"{"+partial.join(",")+"}";gap=mind;return v}}if(typeof JSON.stringify!=="function"){JSON.stringify=function(value,replacer,space){var i;gap="";indent="";if(typeof space==="number"){for(i=0;i<space;i+=1){indent+=" "}}else{if(typeof space==="string"){indent=space}}rep=replacer;if(replacer&&typeof replacer!=="function"&&(typeof replacer!=="object"||typeof replacer.length!=="number")){throw new Error("JSON.stringify")}return str("",{"":value})}}if(typeof JSON.parse!=="function"){JSON.parse=function(text,reviver){var j;function walk(holder,key){var k,v,value=holder[key];if(value&&typeof value==="object"){for(k in value){if(Object.prototype.hasOwnProperty.call(value,k)){v=walk(value,k);if(v!==undefined){value[k]=v}else{delete value[k]}}}}return reviver.call(holder,key,value)}text=String(text);cx.lastIndex=0;if(cx.test(text)){text=text.replace(cx,function(a){return"\\u"+("0000"+a.charCodeAt(0).toString(16)).slice(-4)})}if(/^[\],:{}\s]*$/.test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,"@").replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,"]").replace(/(?:^|:|,)(?:\s*\[)+/g,""))){j=eval("("+text+")");return typeof reviver==="function"?walk({"":j},""):j}throw new SyntaxError("JSON.parse")}}}());

// Avoid errors if we inadvertently commit some console.xxx calls.
if (!window.console) {
    window.console = {
        log: function () {},
        dir: function () {}
    };
}

var rpPre = {
	
	sendObjXDomain : function(sendObj) {

		var consoleXDomainProxyURL = "";
		if (rpPre.QSParam("rpXDProxy").length > 0) {
			consoleXDomainProxyURL = decodeURIComponent(rpPre.QSParam("rpXDProxy"));
		} else {
			consoleXDomainProxyURL = prerollConfig.proxyUrl;
		}
	
		var send = JSON.stringify(sendObj);
	
		var iframe = document.createElement('iframe');
		iframe.style.display = "none";
		iframe.src = consoleXDomainProxyURL + '?data=' + encodeURIComponent(send);
		document.body.appendChild(iframe);
	
	},

	QSParam : function(key) {
		var re=new RegExp('(?:\\?|&)'+key+'=(.*?)(?=&|$)','gi');
		var r=[], m;
		while ((m=re.exec(document.location.search)) != null) r.push(m[1]);
		return r;
	},
	
	skip : function() {
		if (rpPre.QSParam("playerUrl").length > 0) {
			// Redirect back to the console
			var redirectUrl = decodeURIComponent(rpPre.QSParam("playerUrl"));
			window.location.href = redirectUrl;
			
		} else {
			var sendObj = {
				"method": "post-preroll-proceed"
			};
			//console.log("skipping");
			rpPre.sendObjXDomain(sendObj);
		}
	},
	
	createFragment : function(htmlStr) {
		var frag = document.createDocumentFragment(),
			temp = document.createElement('div');
		temp.innerHTML = htmlStr;
		while (temp.firstChild) {
			frag.appendChild(temp.firstChild);
		}
		return frag;
	},
	
	init : function() {
		if (prerollConfig.showButton) {
			// Show the skip/close button
			
			if (rpPre.QSParam("playerUrl").length > 0) {
				// playerUrl param is present, so this an interstitial, so show a skip button
				var fragment = rpPre.createFragment('<button type="button" class="skip-btn skip" onclick="rpPre.skip();">' + (prerollConfig.buttonText ? prerollConfig.buttonText : 'Skip') + '</button>');
			
			} else {
				// // This is an overlay, so show a close button	
				var fragment = rpPre.createFragment('<button type="button" class="skip-btn close" onclick="rpPre.skip();">' + (prerollConfig.buttonText ? prerollConfig.buttonText : 'Close') + '</button>');
			}
			
			// You can use native DOM methods to insert the fragment:
			document.body.insertBefore(fragment, document.body.childNodes[0]);
		}
	}
	
};

rpPre.init();
