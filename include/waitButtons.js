function waitButtons(selector, parameters)
{
	// Parametry to ustawienia + initHandlers(t/f)

	let settings = 	{				// Obecna konfiguracja zachowania.
		disabled: 		null, 		// - Buttony które mają być cały czas zablkowone (selektor).
		exclude:  		null, 		// - Elementy wewnętrzne buttona w obrębie których kliknięcia są blokowane (selektor).
		forceInstant: 	false,		// - W tym trybie wszystkie buttony zachowują się tak jak by nie miały właściowości .waitable i .holdable.
    };
    
	/*
		CEL KLASY:
		- Za pomocą logiki w tej klasie można tworzyć powiązane ze sobą guziki.
		  Trzymanie jednego z powiązanych guzików blokuje wszystkie pozostałe guziki jeżeli trzymany guzik można trzymać,
		  tz. jeśli posiada klasę .holdable. Jeżeli guzik posiada klasę .waitable to zablokuje siebie i pozostałe guziki do momentu
		  wywołania funkcji processMessage wewnątrz której uruchamiany jest definiowany messegeHandler. Jeśli buttony nie mają
		  klas .holdable czy .waitable to messageHandler jest wwoływany automatycznie jak przy zwykłym kliknięciu.
		  Do messegaHandler są wywyłane dwie rzeczy - obiekt buttonu i zawartość pola data-action.
		  W messege handlerze nalerzy więc stworzyć switch(action){...};

			Do obiektów dodawane są dynamicznie klasy: .pressed, .locked, .waiting i .holding (trzymanie stylizuje się dla .pressed).
	*/

	let objectsAll;					// Wszystkie obiekty buttonów.
	let objects;					// Wszystkie obiekty obecnie aktywnych buttonów (bez tych disabled).
    let settingsRequest = null; 	// Konfiguracja zarządana odgórnie która zostanie ustawiona przy najbliższej okazji.
	let msg 			= {};       // Aktualnie przetwarzana wiadomosć.
	let messageHandler 	= null;     // Funkcja callback wywoływana podczas przetwarzania wiadomosci.


	// Tworzy i zapisuje wiadomość zawartą we wskazanym obiekcie.
	//	from 		- Obiekt z jakiego pobrano zlecenie
	//	action 		- Treść zlecenia
	//	readCount 	- Ile razy zlecenie zostało już odczytane (przetworzone)
	let loadMessage = function(obj){
		msg = {
			from: 		obj,
			action: 	obj.data('action'),
			readCount: 	0
		}
	}

	// Odblokowuje wszystkie zablokowane obiekty, usuwa treść wiadomości,
	// i w razie konieczności aktualizuje ustawienia zgodnie z zapisanym żądaniem.
	let clearMessage = function() {
		objects.removeClass('locked');
		msg = {};

		if(settingsRequest !== null) {
			changeSettings(settingsRequest);
			settingsRequest = null;
		}
	};

	// Wywołuje zapisany messageHandler da zapisanej wiadomości lub dla pustego
	// obiektu i stringa jeśli żadna wiadomość nie jest obecnie przetwarzana.
	// Zwraca true jeśli była jakaś wiadomosć.
	let callMessageHandler = function() {

		if(!jQuery.isEmptyObject(msg)) {
			if(typeof(messageHandler) === 'function')
				messageHandler(msg.from, msg.action);
			else
				console.log('%c messageHandler not defined!', 'color: red');

			msg.readCount++;
			return true;
		}
		else {
			// Wiadomości nie ma - wywołanie pustymi parametrami.			
			if(typeof(messageHandler) === 'function')
				messageHandler({}, '');
			else
				console.log('%c messageHandler not defined!', 'color: red');

			return false;
		}
	};

	// Funkcja używana na zewnątrz pozwalająca uruchomić podany wcześniej messageHandler.
	// Usunięcie wiadomości (jeśli jest usuwana) i reset GUI można opóźnić parametrem cleanDelayMs
	// (o ile z z góry wiadomo ile minie czasu do zakończenia realizacji danego zadania).
	let processMessage = function(cleanDelayMs)
	{
		// Wywołanie wiadomości.
		if(callMessageHandler()) {

			// Guzik nie jest trzymany, można usunąć wiadomość.
			if(msg.from.hasClass('holding') == false)
			{
				const from = msg.from;
				msg = {};

				// Zaplanowanie sprzatania DOM-u.
				cleanDelayMs = cleanDelayMs || 0;
				cleanDelayMs = (cleanDelayMs < 0) ? 0 : cleanDelayMs;
	
				setTimeout(function(){
					// Zakończenie zlecenia i odblokowanie buttonów.
					from.removeClass('waiting');
					objects.removeClass('locked');

					if(settingsRequest !== null) {
						changeSettings(settingsRequest);
						settingsRequest = null;
					}
				}, cleanDelayMs);
				return;
			}
		}
	};

	// Ta funkcja zadba o to by do wszystkich aktualnie wskazanych obiektów zostały,
	// podpięte handlery eventów tak by nie doszło do powtórzeń obsługi eventu.
	// Podczas przypinania używane są obecnie używane ustawienia settings.
	let bindEvnetHandlers = function()
	{
		// --- INICIALIZACJA NA PODSTAWIE USTAWIEŃ --- //

		// Wszystkie obsługiwane buttony.
		objects = objectsAll;

		// Zablokowanie wyłączonych buttonów.
		objects.addClass('locked');	
		if(Array.isArray(settings.disabled)) {
			for(let key in settings.disabled)
				objects = objects.not(settings.disabled[key]);
		}
		else
			objects = objects.not(settings.disabled);
		
		
		// Upewnienie się że reszta jest odblokowana.
		objects.removeClass('locked');	


		// --- OBSŁUGA EVENTÓW DLA GUZIKÓW KTÓRE MOŻNA TRZYMAĆ (.holdable) --- //

		// Obsługa eventu rozpoczęcia trzymania guzika.
		let holdStart = function(e){
			let obj = $(this);

			if(obj.hasClass('holdable') && settings.forceInstant == false)
			if(!obj.hasClass('pressed') && !obj.hasClass('locked') && !obj.hasClass('waiting'))
			{
				// Tylko LPM lub dotyk palcem.
				if(e.type != 'touchstart' && e.which != 1) return;

				// Mysz nie może wskazywać żednej z wykluczonych klas.
				if(Array.isArray(settings.exclude)) {
					for(let key in settings.exclude)
						if ($(settings.exclude[key] + ':hover').length != 0) return;
				}
				else {
					if ($(settings.exclude + ':hover').length != 0) return;
				}
					

				// Zapisanie danych zlecenia
				loadMessage(obj);

				// Aktualizacja klas obiektu.
				obj.addClass('holding');	
				obj.addClass('pressed');
				
				// Blokada reszty buttonów.
				objects.not('.pressed').not('.waiting').addClass('locked');
			}
		}

		// Podpiecie eventów z zapobiegnięciem nawarstwiania.
		objects.off('mousedown.dbtn');
		objects.on('mousedown.dbtn',  holdStart);
		objects.off('touchstart.dbtn');
		objects.on('touchstart.dbtn', holdStart);

		// Obsługa eventu zakończenia trzymania guzika.
		let holdEnd = function(e){
			let obj = $(this);

			if(obj.hasClass('holding'))
			{
				// Aktualizacja klas obiektu.
				obj.removeClass('holding');
				obj.removeClass('pressed');	

				// Przejście w tryb waiting jeżeli wiadomość nie została
				// jeszcze odczytana, a guzik ma funkcionalność oczekiwania...
				if(obj.hasClass('waitable') && msg.readCount == 0 && settings.forceInstant == false)
					obj.addClass('waiting');

				// ... lub zakończenie przetwarzania wiadomości.
				else
					clearMessage();
			}
		}

		// Propagacja puszczenia nawet jeśli zaszło poza trzymanym obiektem.
		let triggerHoldEnd = function(){
			objects.trigger('globalHoldEnd');
		};
		
		// Podpiecie eventów z zapobiegnięciem nawarstwiania.
		$("html").off('mouseup.dbtn');
		$("html").on('mouseup.dbtn', triggerHoldEnd);
		$("html").off('touchend.dbtn');
		$("html").on('touchend.dbtn', triggerHoldEnd);
		objects.off('globalHoldEnd');
		objects.on('globalHoldEnd', holdEnd);

		
		// --- OBSŁUGA EVENTÓW DLA GUZIKÓW KTÓRYCH NIE MOŻNA TRZYMAĆ --- //
		
		let click =  function(e)
		{
			let obj = $(this);
			
			if(obj.hasClass('holdable') == false)
			if(!obj.hasClass('pressed') && !obj.hasClass('locked') && !obj.hasClass('waiting'))
			{
				// Kliknięcie PPM lub ŚPM jest ignorowane.
				if(e.which == 2 || e.which == 3) return;

				// Mysz nie może wskazywać żednej z wykluczonych klas.
				if(Array.isArray(settings.exclude)) {
					for(let key in settings.exclude)
						if ($(settings.exclude[key] + ':hover').length != 0) return;
				}
				else {
					if ($(settings.exclude + ':hover').length != 0) return;
				}		
						

				// Zapisanie danych zlecenia
				loadMessage(obj);

				// Przejście w tryb waiting i blokada pozostałych buttonów...
				if(obj.hasClass('waitable') && settings.forceInstant == false) {
					obj.addClass('waiting');
					objects.not('.pressed').not('.waiting').addClass('locked');
				}
					
				// ... lub natychmiastowe przetworzenie i usunięcie wiadomości.
				else {
					// Dodanie szybiego 'mignięcia' guzika.
					window.requestAnimationFrame(function(){obj.addClass('pressed');
						window.requestAnimationFrame(function(){obj.removeClass('pressed');

						// Obsługa i usunięcie wiadomości.
						callMessageHandler();
						clearMessage();
						});
					});
				}
			}
		}

		// Podpiecie eventów z zapobiegnięciem nawarstwiania.
		objects.off('click.dbtn');
		objects.on('click.dbtn', click);
	};

	// Ustawia obsługę eventów w wybrany tryb (zwykły opóźniony lub natycmiastowego klikania),
	// albo zarządza ustawienie w najbliższym mozliwym czasie (tz gdy msg będzie równe {} - event
	// który zalega zostanie przetworzony).
	let changeSettings = function(newSettings)
	{	
		// Jeśli nie podano nowej wartośći, używa starej.
		newSettings = newSettings || {};
		if(typeof newSettings.disabled == 'undefined')
			newSettings.disabled = settings.disabled;
		if(typeof newSettings.exclude == 'undefined')
			newSettings.exclude  = settings.exclude;
		if(typeof newSettings.forceInstant == 'undefined')
			newSettings.forceInstant  = settings.forceInstant;

		// Jeśli żadna wiadomość nie jest przetwarzana,
		// to następuje natychmiastowa zmiana ustawień...
		if(jQuery.isEmptyObject(msg))
		{
			// Nadpisanie ustawień.
			settings = newSettings;

			// Nadpisanie eventów.
			bindEvnetHandlers();
		}
		// ... w innym wypadku zmiana jest tylko planowana.
		else
			settingsRequest = newSettings;
	};
	
	// Ustawia funkcję wywoływanaą wewnątrz funkcji processMessage oraz w event handlerze pojedynczego kliknięcia.
	// Do funkcji wysłany jest parametr from i action.
	let setMessageHandler = function(handler){messageHandler = handler;};


	// Udostępnienie części funkcji poza obiektem.
	this.setMessageHandler 	= setMessageHandler;
	this.processMessage 	= processMessage;
	this.changeSettings 	= changeSettings;
	this.bindEventHandlers 	= bindEvnetHandlers;


	// INICIALIZACJA:
	objectsAll = $(selector);	// Obiekty buttonów.
	parameters = parameters || {};
	if(parameters.initHandlers !== false)
		changeSettings(parameters);	// Zmiana ustawień i uruchomienie eventów.
};
