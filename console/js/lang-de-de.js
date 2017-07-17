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

	    cookie_consent:         'Der radioplayer verwendet für seine umfangreichen Funktionen Browser-Cookies. So können Sie zum Beispiel Ihre Senderliste ' +
								'oder die zuletzt gehörten Sender speichern. Mit der Nutzung des radioplayers erklären Sie sich damit einverstanden, ' +
								'dass wir Cookies verwenden. <a href="http://www.radioplayer.de/cookies/" target="_blank">Weitere Informationen</a>. ',
								
		cookie_consent_dismiss:	'OK',

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
