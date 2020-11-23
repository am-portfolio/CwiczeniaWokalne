// Zestaw narzędzi do budowy i zarządzania pianina CSS.
const cssPiano = {
	/* MAXYMALNY ZAKRES PIANINA TO: 1-88 TZ.: A0-C8 */
	MIN_KEY: 1,
	MAX_KEY: 88,				

	// SZYBKIE WCZYTYWANIE
	thingsLoaded: 0,		// Ile plików audio załadowano.
	thingsToLoad: Infinity,	// Ile plików audio jest do załadowania.
	// Bufory audio sampli pianina (szybkie wczytywanie).
	samples_fastLoad: {},
	// Mapa index -> samples[i] + detune (szybkie wczytywanie)
	samplesKeyMap_fastLoad: {},


	// Wszystkie potrzebne sample do pełnej wersji piana.
	samples: {},
	// Informacja o tym czy załadowano już wszystkie sample.
	samplesLoaded: false,

	wasPlaying: false, // true gdy przynajmniej zagrano przynajmniej jeden dźwięk pianina.

	// Asynchroniczna funkcja wczytująca częściowo sample pianina (szybkie rucuhamianie, pełna wersja doczyta się potem).
	loadAudio_fastLoad: async function (){

		let count = 4;
		let range = (this.MAX_KEY - this.MIN_KEY + 1) / count;
		let indexes = [];

		// Mapa interpolacja sampli.
		for(let i = 0; i<= this.MAX_KEY - this.MIN_KEY; i++){
			let index = Math.round(Math.floor(i / range)*range + range/2);
			this.samplesKeyMap_fastLoad[i + this.MIN_KEY] = index;
			let hasValue = false;
			for(var j = 0; j < indexes.length; j++) {
				if(indexes[j] === index) hasValue = true;
			}
			if(!hasValue){
				indexes.push(index);
			}
		}

		this.thingsLoaded = 0;
		this.thingsToLoad = indexes.length; 
		
		// Szybkie wczytywanie sampli.
		this.fastLoad_samples = {};
		for(let i = 0; i < indexes.length; i++) {
			this.samples_fastLoad[indexes[i]] = await getAudioBuffer('audio/Piano 64kbps/' + 'Piano_' + indexes[i] + '.mp3');	
			this.thingsLoaded++;
		}
	},
	// Pełne wczytanie sampli pianina.
	loadAudio: async function(){
		console.log('%c Full load - start.', 'color: blue');

		// Pobranie surowych danych pianina wyciągniętych z pliku zbiorczego.
		let arrayBuffers = await loadArrayBuffersFromConcatFile(
			"audio/combined-data.bin", "audio/combined-data.json");
		this.samples = {};

		for(let i = this.MIN_KEY; i <= this.MAX_KEY; i++) {
			this.samples[i] = await audioCtx.decodeAudioData(
				arrayBuffers['Piano_' + i + '.mp3']);	
		}
			
		this.samplesLoaded = true;

		console.log('%c Full load - done.', 'color: blue');

		// Informacja o zakończeniu wczytywania pianina.
		if(this.wasPlaying){
			iziToast.destroy();
			showToast({
				theme: 'green',
				icon: 'fas fa-thumbs-up',
				title: getAsset('gui', 'toasts', 'full-piano-loaded-1'),
				message: getAsset('gui', 'toasts', 'full-piano-loaded-2'),
				position: 'bottomCenter'
			});
		}
	},

	
	// Na podstawie ID klawisza zwraca jego muzyczny symbol.
	keySymbol: function(key){
		key = Math.round(key);

		let symbols = ['C', 'C#', 'D', 'D#', 'E', 'F',
			'F#', 'G', 'G#', 'A', 'A#', 'B'];
	
		if(key >= 4)
			return symbols[(key - 4) % 12];
		else
			return symbols[12 - (-(key - 4) % 12)];
	},

	// Na podstawie ID klawisza zwraca jego muzyczną nazwę.
	// ID 1 odpowiada klawiszowi A0 a ID 88 klawiszowi C8.
	keyName: function(key){
		key = Math.round(key);

		let symbols = ['C', 'C#', 'D', 'D#', 'E', 'F',
			'F#', 'G', 'G#', 'A', 'A#', 'B'];
	
		if(key >= 4)
			return symbols[(key - 4) % 12] + Math.round((key + 2) / 12);
		else
			return symbols[12 - (-(key - 4) % 12)] + Math.round((key + 2) / 12);
	},

	firstKey: null,
	lastKey: null,
	pianoKeys: null,

	// Generuje kod HTML css-piano i wpisuje go we wskazanych miejscach.
	// Podawane paramtry określają ilość widocznych klawiszy.
	create: function(selector, firstKey, lastKey){
		$(selector).each(function() {
			//Walidacja parametrów
			firstKey = (firstKey < this.MIN_KEY) ? this.MIN_KEY : firstKey;
			lastKey = (lastKey > this.MAX_KEY) ? this.MAX_KEY : lastKey;
			firstKey = (firstKey > lastKey) ? lastKey : firstKey;

			//Zapisanie parametrów (rozmiaru pianina)
			$(this).data('first-key', firstKey);
			$(this).data('last-key', lastKey);

			//-----BUDOWANIE KODU HTML-----//

			let lastIsBlack = false;
			let pianoHtml = '<ul>';
		
			for(let key = firstKey; key <= lastKey; key++)
			{
				let symbol = cssPiano.keySymbol(key);

				//Czarne klawisze
				if(symbol=='C#' || symbol=='D#' ||
				   symbol=='F#' || symbol=='G#' || symbol=='A#') {
					if(key == firstKey)
						pianoHtml += '<li class="css-piano-key-wrapper">';
					else
						pianoHtml += '</li><li class="css-piano-key-wrapper">';
		
					pianoHtml += '<span data-key="' + key + '" class="css-piano-key css-piano-key-black"></span>';
					lastIsBlack = true;
				}
				//Białe klawisze
				else {
					if(key == firstKey)
						pianoHtml += '<li class="css-piano-key-wrapper">';
					else if(lastIsBlack)
						lastIsBlack = false;
					else
						pianoHtml += '</li><li class="css-piano-key-wrapper">';
		
					if(symbol == 'C')
						pianoHtml += '<div data-key="' + key +
						'" class="css-piano-key css-piano-key-white"></div><b class="css-piano-key-name">'+ cssPiano.keyName(key) + '</b>';
					else
						pianoHtml += '<div data-key="' + key + '" class="css-piano-key css-piano-key-white"></div>';
				}
			}
			pianoHtml += '</li></ul>';
		
			//Wypisanie HTML-a do DOM-u.
			$(this).html(pianoHtml);	
		});

		//-----PODPIĘCIE EVENTU KLIKNIECIA I GRANIA-----//

		let clickFun = function(e) {
			let obj = $(this);
			const index = parseInt(obj.data('key')) - 1;

			// Pobranie informacji o pozycji na klawiszu.
			let offset = obj.offset();
			let relX = e.pageX - offset.left;
			let relY = e.pageY - offset.top;

			// Rozmiar klawisza.
			let height = obj.outerHeight();

			// Określona głośność.
			let volume = relY / height * 1.25;

			cssPiano.playNote({
				"key": index,
				"duration": 0.5,
				"volume": volume
			});
		};
		$('.css-piano-key').off('click.css-piano');
		$('.css-piano-key').on('click.css-piano',  clickFun);

		this.firstKey = firstKey;
		this.lastKey = lastKey;
		this.pianoKeys = $('.css-piano-key');
	},

	// Funkcja zwracająca elementy DOM klawiszy
	keys: function(){
		return this.pianoKeys;
	},

	// W czasie fadeOutSecs wygasi trzymane sample począwszy od chwili when.
	muteSustainedSamples: function(when, fadeOutSecs){
		fadeOutPlayingBuffers(when, fadeOutSecs, "cssPianoHold");
		fadeOutPlayingBuffers(when, fadeOutSecs, "cssPianoFree");
	},

	playNote: function(params)
	{
		params.when 		= params.when || audioCtx.currentTime; 	// Kiedy zagrać dźwięk.
		params.duration 	= params.duration || 1; 				// Długość animacji (i grania dźwięku w trybie bez hold).
		params.volume		= params.volume || 1;
		params.hold			= params.hold || false;					// Dla true dźwięk jest grany do wywołania wygaszenia.
		params.animate		= params.animate || false;				// Animacja włączenia/wyłączenia klawisza (długość określa duration nie hold).
		params.offset		= params.offset || 0;					// Przesunięcie jakie należy nałożyć na numer klawisza po zastosowaniu zmiany skali.
		params.forceMinor	= params.forceMinor || false;			// Konwertje melodię na molową (ma sens tylko jeśli melodia podawana jest relatywnie z offsetem).

		// Konwersja melodii na molową skalę
		if(params.forceMinor) {
			let keySymbol = (params.key > 0) ? (params.key % 12) : ((12 + params.key) % 12);
			switch(keySymbol){
				case 4: case 9: case 11:
					params.key = params.key - 1;
			}
		}

		// Dodanie offsetu do klawisza.
		params.key += params.offset;

		// Wychodzi poza skale pianina.
		if(params.key <= this.MIN_KEY || params.key >= this.MAX_KEY)
			return;


		let buffer;
		let detune = 0;
		let key;
		if(this.samplesLoaded == false) {
			
			// Informacja że pianino może brzmieć dziwnie.
			if(!this.wasPlaying){
				showToast({
					theme: 'warning',
					title: getAsset('gui', 'toasts', 'full-piano-not-loaded-1'),
					message: getAsset('gui', 'toasts', 'full-piano-not-loaded-2'),
					position: 'bottomCenter'
				});
			}
			this.wasPlaying = true;

			// Użycie sampli szybkiego wczytywania.
			key = this.samplesKeyMap_fastLoad[params.key + 1];
			buffer = this.samples_fastLoad[key];
			detune = params.key + 1 - key;
		}
		else{
			// Użycie pełnej wersji sampli.
			key = params.key + 1;
			buffer = this.samples[key];
		}

		// Odtworzenie sampla.
		if(params.hold)
			playBuffer({
				"buffer": buffer,
				"when": params.when,
				"volume": params.volume,
				"label": params.label || "cssPianoHold",
				"detune": detune,
				"inPoint": (this.samplesLoaded) ? 0 : 0.04, // mp3 detune offset
			});
		else
			playBuffer({
				"buffer": buffer,
				"when": params.when,
				"volume": params.volume,
				"outPoint": params.duration + 1,
				"inPoint": (this.samplesLoaded) ? 0 : 0.04, // mp3 detune offset
				"fadeOut": 0.5,
				"label": params.label || "cssPianoFree",
				"detune": detune
			});
		
		// Aktualizacja stanu klawisza W DOM-ie.
		if(params.animate && params.key > this.firstKey) {
			setTimeout(function(){
				// - Działa dlatego że elementy są pokolei począwszy od first key.
				const obj = $(cssPiano.pianoKeys.get(params.key + 1 - cssPiano.firstKey));
				obj.addClass('pressed-key');
				
				setTimeout(function(){
					obj.removeClass('pressed-key');
				}, params.duration * 900);
			}, (params.when-audioCtx.currentTime) * 1000);
		};
	}
};


//-------------------------------------------------------------------//
//----------------------- OBSŁUGA CIASTECZEK ------------------------//
//-------------------------------------------------------------------//

let cookiesExpires = 365 * 5;

// Funkcja wczytująca ustawienia z ciasteczek.
var loadCookies = function() {
	// Pobranie ciasteczek.
	let settings = Cookies.getJSON('settings');
	let activeExercises = Cookies.getJSON('activeExercises');

	// Załadowanie zapisanych ustawień.
	for (let i in settings) {
		let obj = $('#'+settings[i].id);
		obj.prop('checked', true);
		obj.trigger('change');
	}

	// Załadowanie zapisanych ćwiczeń.
	for (let i in activeExercises) {
		let obj = $('.exercise-checkbox[data-melody="' 
			+ activeExercises[i].melody + '"][data-syllable="' + activeExercises[i].syllable + '"]');
		obj.prop('checked', true);
		obj.trigger('change', ['loading-cookies']);
	}
};


// Zwraca obiekt z danymi ustawień.
var getActiveSettingsData = function(){
	// Zapisywane są tylko aktywne checkboxy
	let settings = [];

	$('.settings-checkbox').each(function( index, element ) {
		let obj = $(element);
		// Zapisanie ID aktywnych ustawień.
		if(obj.is(":checked"))
			settings.push({id: obj.attr('id')});
	});

	return settings;
}

// Zwraca obiekt z danymi aktywnych ćwiczeń.
var getActiveExercisesData = function(){
	// Zapisywane są tylko aktywne checkboxy
	let activeExercises = [];

	$('#active-exercises ul li:not(".disabled")').each(function( index, element ) {
		let obj = $(element);
		// Zapisanie melodii i sylaby aktywnego ćwiczenia.
		activeExercises.push({melody: obj.data('melody'), syllable: obj.data('syllable')});
	});

	return activeExercises;
}

// Funkcja zapisująca ciasteczka aktywnych ćwiczeń i ustawień.
var saveCookies = function() {
	
	let settings = getActiveSettingsData();
	let activeExercises = getActiveExercisesData();

	// Zapisanie ciasteczek:
	Cookies.set('settings', settings, { expires: cookiesExpires });
	Cookies.set('activeExercises', activeExercises, { expires: cookiesExpires });
}



//-------------------------------------------------------------------//
//----------------------- AUTO SCROLLOWANIE -------------------------//
//-------------------------------------------------------------------//

// Funkcja łagodnego scrollowania do elementu o wskazanym id.
function scrollDocTo(id){
	let obj = $(id);

	// Przestrzeń zajmowana przez navigację i guziki.
	let offset = $('.sticky-after-space').css('height');
	offset = parseInt(offset.substring(0, offset.length-2));
	
	// Rozmiar okienka.
	let viewHeight = $(window).height();

	// Rozmiary elementu.
	let top = obj.offset().top;
	let height = obj.outerHeight();
	
	let scrollTo = null;

	// Element nie mieści się w okienku.
	if(height > viewHeight - offset) {
		scrollTo = top - offset;
	}
	// Element mieści się w okienku.
	else
		scrollTo = top + height - viewHeight;

	if(scrollTo < 0) scrollTo = 0;

	  $('html, body').animate({
		scrollTop: scrollTo
	  }, 800, function(){
		//window.location.hash = hash;
  });
}

// Funkcja łagodnego scrollowania do ćwiczenia.
function scrollHorizontal(selector, id){
	let parent = $(selector);
	let obj = $(id);

	// Rozmiar okienka.
	let parentWidth = parent.outerWidth();
	let scrollWidth = parent[0].scrollWidth;
	let objWidth = obj.outerWidth();

	// Relatywna pozycja obiektu w kontenerze selector.
	let objX = obj.offset().left - parent.offset().left + parent.scrollLeft() - objWidth / 2;

	// Ograniczenia scrollowania.
	objX = Math.max(objX, 0);
	objX = Math.min(objX, scrollWidth - parentWidth);

	parent.animate({
		scrollLeft: objX
	  }, 500);
}

//-------------------------------------------------------------------//
//----------------------- OBSŁUGA TOASTÓW ---------------------------//
//-------------------------------------------------------------------//

// Funkcja wyświetlajaca toasty.
function showToast(params){

	if(params['theme'] !== "undefined") {
		switch(params['theme']) {
			case 'warning':
				params['icon'] = 'fas fa-exclamation-triangle';
				break;
			case 'buttons':
				params['messageSize'] = '0.5rem';
				break;
			case 'add':
				params['icon'] = 'fas fa-folder-plus';
				params['titleSize'] = '0.4rem';
				params['titleLineHeight'] = '0.5rem';
				params['messageLineHeight'] = '0.5rem';
				break;
			case 'green':
				params['theme'] = 'add';
				break;
			case 'text':
				params['messageSize'] = '0.5rem';
				params['messageLineHeight'] = '0.5rem';
				break;
		}
	}

	let defaults = {
		layout: 1,
		titleSize: '0.45rem',
		titleLineHeight: '0.6rem',
		messageSize: '0.4rem',
		messageLineHeight: '0.6rem',
		position: 'bottomCenter',
		layout: 2,
		animateInside: false,
		displayMode: 2,
		timeout: 5000,
		maxWidth: 500,
	};

	// Dopisanie parametrów.
	for(let key in params)
		defaults[key] = params[key];

	iziToast.show(defaults);
}


//-------------------------------------------------------------------//
//--------------------- TRYB PEŁNOEKRANOWY --------------------------//
//-------------------------------------------------------------------//

// Funkcja otwierajaca tryb pełno ekranowy.
function openFullscreen() {
	let elem = document.documentElement;

	if (elem.requestFullscreen) {
		elem.requestFullscreen();
	} else if (elem.mozRequestFullScreen) { /* Firefox */
		elem.mozRequestFullScreen();
	} else if (elem.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
		elem.webkitRequestFullscreen();
	} else if (elem.msRequestFullscreen) { /* IE/Edge */
		elem.msRequestFullscreen();
	}
}

// Funkcja zamykająca tryb pełno ekranowy.
function closeFullscreen() {
	let elem = document.documentElement;

	if (document.exitFullscreen) {
		document.exitFullscreen();
	} else if (document.mozCancelFullScreen) {
		document.mozCancelFullScreen();
	} else if (document.webkitExitFullscreen) {
		document.webkitExitFullscreen();
	} else if (document.msExitFullscreen) {
		document.msExitFullscreen();
	}
}

// Funkcja obsługi eventu trybu pełno ekranowego.
function fullScreenHandler()
{
	if (!(document.fullscreenElement || document.webkitIsFullScreen || document.mozFullScreen || document.msFullscreenElement)) {
		showToast({
			theme: 'buttons',
			icon: 'fas fa-compress',
			title: getAsset('gui', 'toasts', 'fullscreen-t'),
			buttons: [
				['<button><b>' + getAsset('gui', 'toasts', 'fullscreen-m') + '</b></button>', function (instance, toast) {
					instance.hide({ transitionOut: 'fadeOut' }, toast, 'button');
					openFullscreen();	 
				}, true],
			],
			timeout: false
		});
	}
}


//-------------------------------------------------------------------//
//---------------------- BUDOWANIE INTERFEJSU -----------------------//
//-------------------------------------------------------------------//

// Obiekt przechowujący zapisane przez użytkownika zestawy ćwiczeń.
var userExerciseSets = {};

// Zmienne określające wybrane progi skrajnych dźwięków.
let noteLowest 	= Cookies.get('noteLowest') || 18;
let noteHighest = Cookies.get('noteHighest') || 48

// Tempo odtwarzania melodii.
let BPM			= Cookies.get('BPM') || 105;

let rangeSelector;

$(document).ready(function() {

	//-----SUGEROWANIE TRYBU PEŁNEGO EKRANU NA URZĄDZENIACH MOBILNYCH------//

	/*
	if(jQuery.browser.mobile) {
		// Podpięcie obsługi zmiany trybu pełnego ekranu.
		document.addEventListener('webkitfullscreenchange', fullScreenHandler, false);
		document.addEventListener('mozfullscreenchange', fullScreenHandler, false);
		document.addEventListener('fullscreenchange', fullScreenHandler, false);
		document.addEventListener('MSFullscreenChange', fullScreenHandler, false);
		fullScreenHandler();
	}
	*/

	// Funkcja wczytująca wszystkie pliki audio używane w aplikacji.
	let loadAssets = async function() {
		// Wczytanie pianina.
		await cssPiano.loadAudio_fastLoad();
	}

	// Aktualizacja stanu paska wczytywania.
	let progressBar = $(".progress-bar-inner");
	let updateProgressBar = function() {
		let progress = cssPiano.thingsLoaded / cssPiano.thingsToLoad;
		progressBar.css('width', progress * 100 + '%');
		return; 
	};

	// Dodanie napisów do ekranu ładowania
	for(let key in applicationAssets.gui.loading){
		$('#' + key).append(
			getAsset('gui', 'loading', key));
	}

	// Zaplanowanie aktualizacji progresu wczytwania i ładowanie audio.
	let interval = setInterval(updateProgressBar, 200);

	// Wczytywanie audio.
	loadAssets().then(function(){
		clearInterval(interval);
		updateProgressBar();
		//... zatrzymanie aktualizacji wczytywania i potem inne rzeczy.

		//------------BUDOWA GUI-------------//

		// Budowa postawowych elmentów GUI.
		buildBaseGUI();

		// Określenie zakresu pianina i budowa.
		let firstKey = 13;
		let lastKey = 71;
		cssPiano.create('#piano', firstKey, lastKey);

		//-----------PRZYGOTOWANIE SLIDERÓW-------------//

		// Slider zmiany tempa rozśpiewki:
		let bpmSlider = document.getElementById('bpm-noUiSlider');
		noUiSlider.create(bpmSlider, {
			range: {
				'min': 50,
				'max': 140
			},
			start: BPM,
			step: 5,
			padding: [0, 10],
			tooltips: wNumb({decimals: 0, suffix: ' BPM'}),
			behaviour: 'drag-tap',
		});
		bpmSlider.noUiSlider.on('update', function () {
			BPM = parseInt(bpmSlider.noUiSlider.get());
		  	Cookies.set('BPM',  BPM,  { expires: cookiesExpires });
		});


		// Slider określający skalę wokalną:
		rangeSelector = document.getElementById('vocalRange-noUiSlider');
		noUiSlider.create(rangeSelector, {
			range: {
				'min': firstKey - 1,
				'max': lastKey + 1
			},
			start: [-1, noteLowest, noteHighest],
			step: 1,
			tooltips: [false, wNumb({edit: cssPiano.keyName}), wNumb({edit: cssPiano.keyName})],
			connect: [false, false, true, false],
			behaviour: 'drag',
			padding: [1, 1],
			margin: 12,
			animate: (jQuery.browser.mobile ? false : true), // Płynne przejście wyłączone na telefonie
		});
		rangeSelector.noUiSlider.on('update', function () {
			let range = rangeSelector.noUiSlider.get();
			noteLowest = parseInt(range[1]);
			noteHighest = parseInt(range[2]);

			Cookies.set('noteLowest',  noteLowest,  { expires: cookiesExpires });
			Cookies.set('noteHighest', noteHighest, { expires: cookiesExpires });

			cssPiano.keys().each(function(index) {
				// Działa dlatego że klawisze each zwraca po kolei!
				// Lepiej zrobić tak bo będzie działać szybciej (mniejsza sznasa na lagi na fonie)
				let i = index + cssPiano.firstKey;

				
				if(i < noteLowest || i > noteHighest)
					$(this).addClass("outrange");
				else
					$(this).removeClass("outrange");				
			});
		});


		//-----------DODANIE OBSŁUGI SORTOWANIA ĆWICZEŃ-------------//

		var exTb = document.getElementById('exercises-toolbar');

		new Sortable(exTb, {
			sort: true,
			animation: (jQuery.browser.mobile ? 0 : 200), // Animacje wylączone na telefonach
			easing: (jQuery.browser.mobile ? null : "cubic-bezier(1, 0, 0, 1)"),
			direction: 'horizontal',
			scroll: true,
			touchStartThreshold: 5,	
			onSort: function () {
				// Aktualizacja ciasteczek.
				saveCookies();
			},
			onEnd: function (e) {
				// FIX: Przy puszczeniu po sortowaniu w złym miejscu,
				// click aktywuje niepotrzebnie ćwiczenie. Ten myk dodaje
				// klasę którą określa się potem jako exclude (onEnd wykonuje się przed click)
				// i planuje jej usunięcie na samym końcu obecnego stosu (czas 0).
				// W praktyce więc najbliższy click po sortowaniu jest ominiety.
				$(e.item).addClass('prevent-click');
				setTimeout(function(){
					$(e.item).removeClass('prevent-click');
				}, 0);
				
			},
			handle: ".handle",
			filter: ".fadeInLeftBig", // Sortowanie wyłączone na czas wejścia.

			forceFallback: true,
			fallbackOnBody: true,
			fallbackClass: "sortable-fallback",
		});


		//------OBSŁUGA TABÓW-------//

		// Event obsługi kliknięcia w tab.
		$('.tabs li').click(function(){
			let obj = $(this);
			let sib = obj.siblings();

			obj.addClass('active');
			sib.removeClass('active');

			$(obj.data('target')).css('display', 'block');
			sib.each(function(){$($(this).data('target')).css('display', 'none');});
		});
		// Inicializacja tabów:
		$('.tabs li:not(".active")').each(function(){$($(this).data('target')).css('display', 'none');});
		$('.tabs li.active').each(function(){$($(this).data('target')).css('display', 'block');});


		//------OBSŁUGA PODŚWIRTLANIA MENU I AUTOSCROLL-------//

		// Divy z nawigacji.
		let divs = [
			"#application",
			"#exercises-picker",
			"#settings",
		];

		var scrollTimeOut = null;

		$(window).scroll(function(e, autoTriggered) {
			// Redukcja częstotliwości obliczeń przy scrollowaniu (5 razy na sekundę)
			// (by nie katować słabszych urzadzeń)
			if(scrollTimeOut !== null) return;

			// Przestrzeń zajmowana przez navigację i guziki.
			let offset = $('.sticky-after-space').css('height');
			offset = parseInt(offset.substring(0, offset.length-2));

			// Najwyżej położony widoczny piksel.
			var scroll = $(window).scrollTop();
			
			// Rozmiar okienka.
			let viewHeight = $(window).height();

			let mostVisible = ''
			let maxVisibility = 0;

			for(let key in divs) {
				let obj = $(divs[key]);

				let top = obj.offset().top;
				let height = obj.outerHeight();

				let visibilityRatio = 0;

				// Jak bardzo góra diva jest oddalona od dolnej krawędzi.
				let fromBottom = Math.max(scroll + viewHeight - top, 0);
				// Ile brakuje by div zniknął za górną krawędzią.
				let fromOut =  Math.abs(Math.min(scroll + offset - height - top, 0));

				// W jakim stopniu element jest widoczny.
				visibilityRatio = 
					Math.min(fromBottom, fromOut, height, viewHeight - offset)
					/ Math.min(height, viewHeight - offset);

				// Zapisanie najbardziej widocznego (dolne mają priorytet).
				if(visibilityRatio >= maxVisibility || visibilityRatio > 0.6) {
					mostVisible = divs[key];
					maxVisibility = visibilityRatio;
				}
			}	
			
			// Update DOM-u
			$('.navigation a').removeClass("active");
			$('.navigation a[href$="' + mostVisible + '"]').addClass("active");

			// Założenie blokady częstotliwośći (o ile to jest naturalny scroll).
			if(typeof autoTriggered === 'undefined')
			scrollTimeOut = setTimeout(function(){
				// Zwolnienie blokady.
				scrollTimeOut = null;
				// Na wszelki wypadek jeśli już użytkownik nie scrolluje,
				// a DOM nie jest aktualny.
				$(window).trigger('scroll', [true]);
			},250);
		});
		$(window).resize(function(){ $(window).trigger('scroll'); });

		// Obsługa auto-scrollowania
		$("a").on('click', function(event) {
			if (this.hash !== "") {
			  	event.preventDefault();
				scrollDocTo(this.hash);
			}
		});


		//-----OBSŁUGA ZMIANY POZYCJI ODGRYWANIA MELODII------//

		// Dopisanie koniecznych rzeczy do obiektów klawiszy.
		cssPiano.keys().addClass('delayed-button waitable');
		cssPiano.keys().data('action', 'change-melody-offset');


		//-----------URUCHOMIENIE OBSŁUGI GUZIKÓW-------------//

		application();
		
		//#TODO: Sekcja pomocy
		$('a[href=#help]').click(function(){
			showToast({
				theme: 'warning',
				title: 'TODO',
				message: 'Funkcja nie została jeszcze zaimplementowana',
				position: 'bottomCenter'
			});
		})

		//-----------OBSŁUGA ZAPISYWANIA ZESTAWÓW-------------//

		$('#save-exercise').click(function(){
			// Pobranie listy aktywnych ćwiczeń.
			let activeExercises = getActiveExercisesData();

			if(activeExercises.length === 0) {
				showToast({
					theme: 'warning',
					title: getAsset('gui', 'toasts', 'cant-save-empty-1'),
					message: getAsset('gui', 'toasts', 'cant-save-empty-2'),
					position: 'bottomCenter'
				});
			}
			else {
				Swal.fire({
					title: getAsset('gui', 'various', 'enter-set-name'),
					html:
						'<input class="swal2-input" id="input-exercise-name" maxlength="35"' +
							'placeholder="' + getAsset('gui', 'various', 'enter-set-name-placeholder') + '">' +
						'<input class="swal2-input" id="input-exercise-description"' +
							'placeholder="' + getAsset('gui', 'various', 'enter-set-description-placeholder') + '">',

					showConfirmButton: true,
					showCancelButton: true,
					confirmButtonText: getAsset('gui', 'various', 'save'),
					cancelButtonText: getAsset('gui', 'various', 'cancel'),

					showLoaderOnConfirm: true,

					// Zatwierdzanie enterem.
					onOpen: function(){
						$('#input-exercise-name').focus();
						// Ewent łapiacy enter na całym dokumencie.
						$(document).on('keyup.temp-swal', function(e){
							let code = (e.keyCode ? e.keyCode : e.which);
							if(code == 13) //Enter keycode
								Swal.clickConfirm();
							console.log('a');
						});
					},
					onAfterClose: function(obj){
						// Pozbycie się zbędnego eventu.
						$(document).off('keyup.temp-swal');
					},

					// Zapisanie nowego zestawu ćwiczeń.
					preConfirm: function(value){
						// Pobranie potrzebnych danych.
						let name = document.getElementById('input-exercise-name').value;
						let description = document.getElementById('input-exercise-description').value;
						let userSets = Cookies.getJSON('userSets');

						// Jeśli nie określono nazwy to zapis jest
						if(name.length == 0){
							Swal.showValidationMessage(
								getAsset('gui', 'various', 'name-not-set'));
							$('#input-exercise-name').addClass('swal2-inputerror');
							$('#input-exercise-name').focus();
							return;
						}

						// Zestawy użytkownika identyfikowane są po nazwach, więc muszą być unikalne.
						// Jeśli nazwa się powtarza to zapis jest anulowany.
						if(typeof userSets !== "undefined")	{
							if(typeof userSets[name] !== "undefined"){
								Swal.showValidationMessage(
									getAsset('gui', 'various', 'name-is-taken-1') + name +
									getAsset('gui', 'various', 'name-is-taken-2')
								);
								$('#input-exercise-name').addClass('swal2-inputerror');
								$('#input-exercise-name').focus();
								return;
							}
						}
						else {
							userSets = {};
						}

						// Zapisanie nowego zestawu.
						let newUserSet = {
							"name": name,
							"description": description,
							data: activeExercises = getActiveExercisesData(), // Pobranie aktywnych ćwiczeń
						};
						userSets[name] = newUserSet;
						Cookies.set('userSets', userSets, { expires: cookiesExpires });

						// Dodanie nowego zestawu do domu.
						appendUserSet(newUserSet);
					  },
				});
			}
		});



		//-----------WYŁĄCZENIE EKRANU ŁADOWANIA-------------//

		$("#GUI").css("display", "block");
		$("#loading-screen").addClass("fadeOut");

		// Manualne ustawianie VW bo na androidzie w webview,
		// zawsze jako vw brany jest rozmiar orientacji poziomej.
		$(window).resize(function(){
			let w = $('.css-piano-wrapper').parent().outerWidth();
			$('.css-piano ul').css("-webkit-transform", "scale(" + (w / 1024) + ")");
			$('.css-piano ul').css("transform", "scale(" + (w / 1024) + ")");
		});
		$(window).trigger('resize');





		//-----------ŁADOWANIE PEŁNEJ WERSJI SAMPLI---------//

		if(!cssPiano.samplesLoaded)
			cssPiano.loadAudio();


		//------------WCZYTANIE ZAPISANYCH USTAWIEŃ I ĆWICZEŃ--------------//

		loadCookies();

		//-----ODPOWIEDNIE POTRAKTOWANIE STARYCH I NOWYCH USEROW------//

		// Brak zainicializowanego programu - nowy użytkownik.
		if(typeof Cookies.get('oldUser') === 'undefined')
		{
			// Uruchomienie wiadomości powitalnej.
			initializeUserSettings();
		}
		// Wracający...
		else
		{
			// Zapisanie która to wizyta.
			let visitCount = parseInt(Cookies.get('oldUser'));
			Cookies.set('oldUser', visitCount + 1);
		
			// Usunięcie tła wiadomości powitalnej.
			$('#alert-background').addClass('hidden-background');

			//...
		}
	});
});


// Inicialziacja ustawień nowego użytkownika.
function initializeUserSettings()
{
	// STYL POPUPA ZBIERANIA INFORMACJI:
	const optionsPopup = Swal.mixin({
		allowOutsideClick: false,
		allowEscapeKey: false,
		allowEnterKey: false,
		showConfirmButton: false,
		showCancelButton: false,
	});
	  

	// ZBIERANE INFORMACJE O OSOBIE:
	let gender;
	let mutation;
	let voice;

	// Wiadomość powitalna dla nowego użytkownika.
	let showWelcomeMessage = function(){
		Swal.fire({
			allowOutsideClick: false,
			allowEscapeKey: false,
			showCancelButton: false,
			showConfirmButton: true,
	
			title: getAsset('gui', 'introduction', 'welcome'),
			html:  getAsset('gui', 'introduction', 'before-we-start'),
			confirmButtonText: getAsset('gui', 'introduction', 'next') + ' <i class="fas fa-arrow-right"></i>',
	
			// Wywołanie kolejnych popupów.
			onClose: getGenderInfo
		});
	}

	// Pobiera informacje o płci.
	let getGenderInfo = function(){
		optionsPopup.fire({
			title: getAsset('gui', 'introduction', 'gender'),
			html: 
				'<button data-gender="male" class="gender gender-male"><i class="fas fa-mars"></i></button>' +
				'<button data-gender="female" class="gender gender-female"><i class="fas fa-venus"></i></button>' +
				'<button class="go-back"><i class="fas fa-arrow-left"></i> ' + getAsset('gui', 'introduction', 'go-back') + '</button>',
			onOpen: function(){
				let saveGenderInfo = function(){
					gender = $(this).data('gender');
					getMutationInfo(); // Kolejny popup.
				}
				$('.gender').click(saveGenderInfo);
				$('.go-back').click(showWelcomeMessage);
			},
		});
	};

	// Wyświetlenie przycisków wyboru stanu mutacji głosu.
	let getMutationInfo = function(){
		optionsPopup.fire({
			title: getAsset('gui', 'introduction', 'mutation'),
			html: 
				'<button data-mutation="yes" class="voice-type">' + getAsset('gui', 'introduction', 'yes') + '</button>' +
				'<button data-mutation="no"  class="voice-type">' + getAsset('gui', 'introduction', 'no') + '</button>' +
				'<button class="go-back"><i class="fas fa-arrow-left"></i> ' + getAsset('gui', 'introduction', 'go-back') + '</button>',
			onOpen: function(){
				let saveMutationInfo = function(){
					mutation = $(this).data('mutation');
					getVoiceInfo(); // Kolejny popup.
				}
				$('.voice-type').click(saveMutationInfo);
				$('.go-back').click(getGenderInfo);
			}
		});
	}

	// Wyświetlenie przycisków wyboru rodzaju głosu.
	let getVoiceInfo = function()
	{
		let buttonsHtml; // Kod html przycisków.
		if(gender == 'male' && mutation == "yes"){
			buttonsHtml = 
				'<button data-voice="bass" class="voice-type">' + getAsset('gui', 'introduction', 'low') +
					'<span class="voice-info">(' + getAsset('gui', 'introduction', 'bass') + ')</span></button>' +
				'<button data-voice="baritone" class="voice-type">' + getAsset('gui', 'introduction', 'normal') +
					'<span class="voice-info">(' + getAsset('gui', 'introduction', 'baritone') + ')</span></button>' +
				'<button data-voice="tenor" class="voice-type">' + getAsset('gui', 'introduction', 'high') + 
					'<span class="voice-info">(' + getAsset('gui', 'introduction', 'tenor') + ')</span></button>';
		}
		else{
			buttonsHtml = 
				(mutation == "yes" ? 
				'<button data-voice="alto" class="voice-type">' + getAsset('gui', 'introduction', 'low') +
					'<span class="voice-info">(' + getAsset('gui', 'introduction', 'alto') + ')</span></button>' : "") +
				'<button data-voice="mezzo" class="voice-type">' + getAsset('gui', 'introduction', 'normal') +
					'<span class="voice-info">(' + getAsset('gui', 'introduction', 'mezzo') + ')</span></button>' +
				'<button data-voice="soprano" class="voice-type">' + getAsset('gui', 'introduction', 'high') +
					'<span class="voice-info">(' + getAsset('gui', 'introduction', 'soprano') + ')</span></button>';
		}

		optionsPopup.fire({
			title: getAsset('gui', 'introduction', 'voice'),
			html: buttonsHtml + 
				'<button class="go-back"><i class="fas fa-arrow-left"></i> ' + getAsset('gui', 'introduction', 'go-back') + '</button>',
			onOpen: function(){
				let saveVoiceInfo = function(){
					voice = $(this).data('voice');
					setVoiceType();
					showFinishMessage();
				}
				$('.voice-type').click(saveVoiceInfo);
				$('.go-back').click(getMutationInfo);
			}
		});
	}

	// Ustawia w UI odpowiednio suwaki.
	let setVoiceType = function(){
		// Ustawienie wybranego domyślnego zakresu głosu.
		let first; let last;
		switch(voice){
			case "bass": 		first=20; last=40; break;
			case "baritone": 	first=25; last=45; break;
			case "tenor": 		first=28; last=49; break;
			case "alto": 		first=33; last=56; break;
			case "mezzo": 		first=37; last=59; break;
			case "soprano": 	first=40; last=63; break;
		}

		rangeSelector.noUiSlider.set([-1, first, last]);
	}

	// Informacja o zakończeniu konfiguracji.
	let showFinishMessage = function(){
		let confirmPressed = false;

		Swal.fire({
			showCancelButton: true,
			showConfirmButton: true,
			allowOutsideClick: false,
			allowEscapeKey: false,
	
			title: getAsset('gui', 'introduction', 'all-done'),
			html:  getAsset('gui', 'introduction', 'voice-range-set'),
			confirmButtonText: getAsset('gui', 'introduction', 'next') + ' <i class="fas fa-arrow-right"></i>',
			cancelButtonText: ' <i class="fas fa-arrow-left"></i> ' + getAsset('gui', 'introduction', 'go-back'),

			preConfirm: function(){
				confirmPressed = true;
			},
			// Wywołanie kolejnych popupów.
			onClose: function(){
				if(confirmPressed)
					showHelpMessage();
				else
					getVoiceInfo();
			}
		});
	}

	// Informacja o symbolu pomocy.
	let showHelpMessage = function(){
		Swal.fire({
			title: getAsset('gui', 'introduction', 'just-in-case'),
			html: getAsset('gui', 'introduction', 'if-you-need-help'),
			confirmButtonText: getAsset('gui', 'introduction', 'understand'),

			onClose: function(){
				// Zatwierdzenie inicializacji.
				finishInitialization();

				// Zamknięcie okna.
				$('#alert-background').addClass('hidden-background');
			}
		});
	}

	// Zatwierdzenie inicializacji danych użytkownika.
	let finishInitialization = function()
	{
		Cookies.set('oldUser', 0); 
		// Wczytanie domyślnego (2-go na liscie) zestawu ćwiczeń zeby coś było.
		$('#exercise-sets ul li[data-index="1"]').trigger('click', 'welcome-set');
	}
	
	showWelcomeMessage();
}




//-------------------------------------------------------------------//
//-------------------------- LOGIKA ĆWICZEŃ -------------------------//
//-------------------------------------------------------------------//

var delayedButtons;						// Obiekt zarządzania połączonymi buttonami.
function application(){
	// ZMIENNE PLANOWANIA W PRZÓD

	let lookahead=			25.0; 		// Okres planowania odtwarzania (ms).
	let scheduleAheadTime= 	0.1;		// Planowanie odwarzania do przodu (sec)
	let nextNoteTime= 		0; 	 		// Punkt w czasie w jakim umieszczony zostanie kolejny sampel.
	let melodyIterator= 	0; 			// Zmienna do iterowania po melodii.

	//ZMIENNE STANU ĆWICZENIA:

	let isPlaying= 			false;
	let isPaused= 			false;
	let currentMelody=		null;
	let currentExercise=	null;
	let currentIntro=		null;
	let exerciseDirection=	null;		// Zmienna określająca aktualny kierunek ćwiczenia.
	let melodyOffset=		null;		// Zmienna określająca pozycje melodii na pianinie.	

	// ZMIENNE POMOCNICZE:

	let melodyHighest= 		null;		// Najwyższy dźwięk w melodii (nie licząc pierwszego akordu).
	let melodyLowest=		null;		// Najniższy dźwięk w melodii (nie licząc pierwszego akordu).
	let melodyLength=		null;		// Długość całej melodii.


	// Główna funkcja zajmująca się planowaniem odtwarzania ćwiczenia,
	// i odgrywaniem melodii. Wewnątrz wywoływana jest obsługa zdarzeń.
	let schedulerCallback = function()
	{
		// Reset zmiennej przy uruchomieniu ćwiczenia po pauzie/resecie.
		if(nextNoteTime < audioCtx.currentTime)
			nextNoteTime = audioCtx.currentTime;

		// Zaplanowanie 'scheduleAheadTime' sekund do przodu odegrania kolejnych dźwięków.
		while (isPlaying && (nextNoteTime < audioCtx.currentTime + scheduleAheadTime))
		{   
			// Ćwiczenie się dopiero rozpoczyna, należy zagrać jakieś intro.
			if (currentIntro !== null && !$('#disable-coach').is(":checked"))
			{
				let shortBreak = 0.5; // Przerwa między fragmentami narracji.

				// Aktywacja kontekstu.
				if (audioCtx.state === 'suspended')
					audioCtx.resume();
											
				// PLIKI INTRO SĄ WCZYTYWANE on-flly by niepotrzenie nie wydłużać,
				// wczytywania przy otwarciu programu.

				// Przypadek ćwiczeń.
				if(currentIntro.syllable !== null) {
					getAudioBuffer(currentIntro.syllable).then(function(syllableBuffer)
					{
						// Informacja o sylabie.
						nextNoteTime = Math.max(nextNoteTime, audioCtx.currentTime);
						playBuffer({
							"buffer": syllableBuffer,
							"label": "example",
							"when": nextNoteTime
						});
						nextNoteTime += syllableBuffer.duration + shortBreak;

						getAudioBuffer(currentIntro.melody).then(function(melodyBuffer)
						{
							// Informacja o melodii.
							nextNoteTime = Math.max(nextNoteTime, audioCtx.currentTime);
							playBuffer({
								"buffer": melodyBuffer,
								"label": "example",
								"when": nextNoteTime
							});
							nextNoteTime += melodyBuffer.duration + shortBreak;

							// Reset zmiennej i wywołanie dalszego odtwarzania.
							currentIntro = null;
							window.setTimeout(schedulerCallback, 0);
						});
					});
				}
				// Przypadek melodii.
				else{
					getAudioBuffer(currentIntro.melody).then(function(melodyBuffer)
					{
						// Informacja o melodii.
						nextNoteTime = Math.max(nextNoteTime, audioCtx.currentTime);
						playBuffer({
							"buffer": melodyBuffer,
							"label": "example",
							"when": nextNoteTime
						});
						nextNoteTime += melodyBuffer.duration + shortBreak;

						// Reset zmiennej i wywołanie dalszego odtwarzania.
						currentIntro = null;
						window.setTimeout(schedulerCallback, 0);
					});
				}

				return;
			}
			
			// Cała fraza została już zagrana.
			else if(typeof currentMelody[melodyIterator] === 'undefined') {

				let nextNoteTime_old = nextNoteTime;
				let currentExercise_old = currentExercise;

				// Przetworzenie eventów i zmiana stanu ćwiczenia.
				// (w środu jest wywołane 'messageHandler').
				delayedButtons.processMessage(
					// Wyliczone opóźnienie dla rakcji GUI.
					Math.round((nextNoteTime - audioCtx.currentTime) * 1000));

				// Szybki fade między frazami
				if(currentExercise_old == currentExercise)
					cssPiano.muteSustainedSamples(nextNoteTime_old - 0.5, 1);
				// Powolny fade między ćwiczeniami
				else 
					cssPiano.muteSustainedSamples(nextNoteTime_old - 0.5, 2);

				// Dodanie chwili przerwy przed kolejnym ćwiczeniem.
				// I ukrycie ew. basu przejściowego.
				if(currentExercise_old != currentExercise) {
					let shortBreak = 60.0 / BPM * 1;
					nextNoteTime = nextNoteTime + shortBreak;
				}

				melodyIterator = 0;
			}

			// Nadal jest coś do zagrania.
			else {
				let notes 		  = currentMelody[melodyIterator].notes;
				let notesDuration = 60.0 / BPM * currentMelody[melodyIterator].duration; // w sek.
				let volume 		  = currentMelody[melodyIterator].volume; 

				if (notes instanceof Array)
					// Zagranie początkowego akordu.
					notes.forEach(function(note){
						cssPiano.playNote({
							"key": note,
							"when": nextNoteTime,
							"duration": notesDuration,
							"volume": volume,
							"hold": true,
							"offset": melodyOffset,
							"animate": true,
							"forceMinor": $('#use-minor-scale').is(":checked")
						});
					});
				else
					// Zagranie pojedyńczego dźwięku.
					cssPiano.playNote({
						"key": notes,
						"when": nextNoteTime,
						"duration": notesDuration,
						"volume": volume,
						"hold": false,
						"offset": melodyOffset,
						"animate": true,
						"forceMinor": $('#use-minor-scale').is(":checked")
					});

				nextNoteTime += notesDuration;
				melodyIterator++;

				// Zagranie przejściowego basu.
				if(typeof currentMelody[melodyIterator] === 'undefined') {
					// zakładam że długość basu przejściowego jest stała (pół długości).
					let notesDuration = 60.0 / BPM * 0.5;
					cssPiano.playNote({
						"key": -12,
						"when": nextNoteTime - notesDuration,
						"duration": notesDuration,
						"volume": 0.6,
						"hold": false,
						"offset": melodyOffset,
						"animate": true,
						"forceMinor": $('#use-minor-scale').is(":checked")
					});
				}
			}
		}

		// Jeśli ćwiczenie nadal trwa to planowane jest kolejne planowanie.
		if(isPlaying) window.setTimeout(schedulerCallback, lookahead);
	}

	// Głowna funkcja w której jest logika przepływu ćwiczenia
	// (są tu przedwarzane wszystkie wiadomosci z delayed-button).
	// Ta funkcja jest wywołana w trybie pausy po kliknięciu, lub
	// w trumie uruchomionym po zakończeniu każdej frazy melodii.
	let messageHandler = function(from, action)
	{
		// Wspólne instrukcje wywoływane przy pausowaniu / stopowaniu.
		let stopExcercise = function() {
			// Aktualizacja buttonów.
			if(!isPaused)
				delayedButtons.changeSettings({disabled: [".play-mode", ".play-pause-mode"], forceInstant: true});
			else
				delayedButtons.changeSettings({disabled: '.play-mode', forceInstant: true});
			$('.delayed-button[data-action="play"]').css('display', 'block');
			$('.delayed-button[data-action="pause"]').css('display', 'none');



			// Wygaszenie sampli.
			cssPiano.muteSustainedSamples(audioCtx.currentTime, 1);

			// Aktualizacja klasy pianina (by zmienić style)
			$('.css-piano').removeClass('playing');

			isPlaying = false;
		};

		// Wywoływane po odegraniu całej frazy melodii.
		if(isPlaying)
		{
			switch(action)
			{
				case 'change-melody-offset':
					melodyOffset = parseInt(from.data('key')) - 1;
					break;

				case 'again':
					break;

				case 'up':
					exerciseDirection = 1;
					melodyOffset += exerciseDirection;
					break;

				case 'down':
					exerciseDirection = -1;
					melodyOffset += exerciseDirection;
					break;

				case 'pause':
					isPaused = true;
					stopExcercise();
					break;

				case 'stop':
					isPaused = false;
					prepareExercise($(''));
					stopExcercise();
					break;

				case 'change-exercise':
					prepareExercise(from);
					break;

				// Nie było w trakcie grania żadnych poleceń.
				case '':

					// Automatyczna zmiana kierunku ćwiczenie (odbijanie) w oparciu o wyliczone zakresy melodii.
					if (exerciseDirection == 1 &&
						melodyOffset + exerciseDirection +  Math.abs(melodyHighest) >= noteHighest) {

						exerciseDirection = -exerciseDirection;
						melodyOffset += exerciseDirection;
					}	
					// Odbicie od dolnej granicy zakresów kończy ćwiczenie.
					else if(exerciseDirection == -1 &&
						melodyOffset + exerciseDirection - Math.abs(melodyLowest) < noteLowest - 1 ) {

						// Załadowanie kolejnego ćwiczenia w kolejce.
						prepareExercise();
					}
					// Ćwiczenie jest kontynuowane.
					else{
						melodyOffset += exerciseDirection;
					}

					// Osiągnięto koniec kolejki (nie ma więcej ćwiczeń).
					if(currentExercise === null) {
						isPaused = false;
						stopExcercise();
					}
			}
		}
		else
		{
			switch(action) {
				case 'change-exercise':
					isPaused = false;
					prepareExercise(from);
					isPaused = true;
					stopExcercise();
					break;

				case 'stop':
					isPaused = false;
					prepareExercise($(''));
					stopExcercise();
					break;

				case 'play':
					if(isPlaying)
						console.log('%c ERROR A in messageHandler!', 'color: red');
					
					// Przygotowanie zmiennych.
					prepareExercise();

					// Kolejka ćwiczeń była pusta
					if(currentExercise === null) {
						console.log(1);
						// Informacja o konieczności wybrania ćwiczenia.
						scrollDocTo("#exercises-picker");
						showToast({
							theme: 'warning',
							title: getAsset('gui', 'toasts', 'first-add-exercises-t'),
							message: getAsset('gui', 'toasts', 'first-add-exercises-m'),
							position: 'bottomCenter'
						});
						return;
					}

					//Zmiana stanu GUI.
					$('.delayed-button[data-action="play"]').css('display', 'none');
					$('.delayed-button[data-action="pause"]').css('display', 'block');
					delayedButtons.changeSettings({disabled: null, forceInstant: false});

					// Aktywacja kontekstu.
					if (audioCtx.state === 'suspended')
						audioCtx.resume();

					// Uruchomienie planowania.
					isPlaying = true;
					isPaused = false;
					setTimeout(schedulerCallback, 1);

					// Aktualizacja klasy pianina (by zmienić style)
					$('.css-piano').addClass('playing');

					// Pokazanie pianinka
					scrollDocTo("#vocal-range-selector");

					// Wyciszenie przykładu (jeśli jakiś gra).
					fadeOutPlayingBuffers(audioCtx.currentTime, 0.2, "example");

					break;
			}
		}
	}

	// Funkcja uruchamiająca ćwiczenie.
	let prepareExercise = function(exerciseObj)
	{					
		// Ładowane jest nowe ćwiczenie.
		if(isPaused == false)
		{
			//--------------- POBRANIE INFORMACJI O KOLEJNYM ĆWICZENIU -------------//

			// Wybranie ćwiczenia...
			if(typeof exerciseObj === "undefined") {
				// ... jeśli kolejka nie była wcześniej uruchamiana.
				if(currentExercise === null)
					currentExercise = $('#active-exercises ul li:not(".disabled")').first();
				// ... jeśli kolejka jest w trakcie wykonywania.
				else
					currentExercise = currentExercise.next().not('.disabled');
			}
			// ... jeśli wskazano jawnie jakie ćwiczenie wybrać.
			else
				currentExercise = exerciseObj;

			// Nie znaleziono ćwiczenia lub zakończono kolejkę.
			if(currentExercise.length == 0) {
				// Aktualizacja DOM-u (wciśnięcie i blokada checkboxów):
				$('#active-exercises ul li').removeClass('pressed');
				$('.exercise-checkbox').attr("disabled", false);
				currentExercise = null;
				return;
			}
			// Jakiś błąd w zarządzaniu obiektami bo jest to sytuacja błędna.
			else if(currentExercise.length != 1)
				console.log('%c ERROR A in prepareExercise!', 'color: red');
			

			//--------------- INICIALIZACJA ĆWICZENIA -------------//

			scrollHorizontal('#exercises-toolbar', currentExercise);

			// Pobranie danych zapisanych w obiekcie.
			let melodyKey 	= currentExercise.data('melody');
			let syllableKey = currentExercise.data('syllable');

			// Aktualizacja DOM-u (wciśnięcie i blokada checkboxów):
			$('#active-exercises ul li').removeClass('pressed');
			currentExercise.addClass('pressed');
			$('.exercise-checkbox').attr("disabled", false);
			$('.exercise-checkbox[data-melody="' + melodyKey + '"][data-syllable="' + syllableKey + '"]').attr("disabled", true);

			// Pobranie danych melodii.
			currentMelody = getAsset("melodies", melodyKey, "data");

			// Wyliczenie parametrów załadowanej melodii.
			melodyIterator = 0;
			melodyHighest = -Infinity;
			melodyLowest = Infinity;
			melodyLength = 0;
			currentMelody.forEach(function(v){
				if(v.notes > melodyHighest)
					melodyHighest = v.notes;
				if(v.notes < melodyLowest)
					melodyLowest = v.notes;
				melodyLength += v.duration;
			});

			// Reset kierunku ćwiczenia.
			exerciseDirection = 1;
			

			//--------------- WYZNACZENIE POCZĄTKOWEGO DŹWIĘKU -------------//

			// O ile melodia może się przemieścić by pozostać w skali.
			let movementRoom = (noteHighest - noteLowest) - (melodyHighest - melodyLowest);

			//'Inteligentne' wyznaczenie początkowego dźwięku melodii (gdzieś na początku)
			melodyOffset = noteLowest + Math.round(movementRoom / 3.0);

			// W przypadku gdy wybrany zakres był bardzo mały to korygowany jest dźwięk poczatkowy.
			if(melodyOffset + melodyHighest > noteHighest)
				melodyOffset = noteHighest - melodyHighest;
			if(melodyOffset + melodyLowest < noteLowest)
				melodyOffset = noteLowest - melodyLowest;		


			//------------ POBRANIE GŁOSOWEJ INFORMACJI O ĆWICZENIU -----------//

			currentIntro = {};
			currentIntro.melody = getAsset('melodies', melodyKey, 'intro');

			if(syllableKey != "")
				currentIntro.syllable = getAsset('syllables', syllableKey, 'intro');
			else
				currentIntro.syllable = null;
		}
	}

	//--------------// INICIALIZACJA //--------------//

	// Obiekt zarządzania buttonami.
	delayedButtons = new waitButtons('.delayed-button',
		{disabled: [".play-mode", ".play-pause-mode"],
			exclude: ['.handle', '.prevent-click', '.fadeInLeftBig'], // Blokada uchwytu, po sortowaniu, i na czas wejścia
		forceInstant: true});
	
	// Podpięcie obsługi wiadomości.
	delayedButtons.setMessageHandler(messageHandler);
}




//-------------------------------------------------------------------//
//---------------------- ASSETY I BUDOWA GUI ------------------------//
//-------------------------------------------------------------------//

// Wszystkie assety aplikacji takie jak różne meldodie,
// i alternatywne języki. 
var applicationAssets =
{
	// Statyczne elementy tekstowe w GUI
	gui: {
		loading: {
			"please-wait": 'Proszę czekać...',
			"page-name": 'Trwa ładowanie'
		},
		navigation: {
			"application": 'Aplikacja',
			"exercises-picker": 'Ćwiczenia',
			"settings": 'Ustawienia',
		},
		segments: {
			"active-exercises": {
				"header": 'Kolejka Ćwiczeń',
				"summary": 'Poniżej znajdują się wszystkie wybrane <b>ćwiczenia</b>.'
			},
			"vocal-range-selector": {
				"header": 'Skala Głosu',
				"summary": 'Określ suwakami zakres twojej <b>skali głosu</b>.'
			},
			"tab-picker": {
				"header": 'Wybór Ćwiczeń',
				"summary": 'Wybierz <b>ćwiczenia</b> lub gotowy <b>zestaw ćwiczeń</b>.'
			},
			"exercise-sets": {
				"header": null,
				"summary": 'Chcesz szybko zacząć?<br>Wybierz gotowy <b>zestaw ćwiczeń</b>.'
			},
			"exercises": {
				"header": null,
				"summary": 'Nie podobają ci się gotowe zestawy?<br><b>Dodawaj</b> / <b>usuwaj</b> pojedyńcze ćwiczenia.'
			},
			"melodies": {
				"header": null,
				"summary": 'Preferujesz swoje własne ćwiczenia?<br>Wykorzystaj <b>jedynie melodie</b>.'
			},
			"settings": {
				"header": 'Ustawienia',
				"summary": 'Tutaj zmienisz różne drobne <b>ustawienia</b>.'
			},
		},
		introduction: {
			"yes": 'Tak',
			"no": 'Nie',

			"bass": 'Bass',
			"baritone": 'Baryton',
			"tenor": 'Tenor',
			"alto": 'Alt',
			"mezzo": 'Mezzosopran',
			"soprano": 'Sopran',
			"understand": "Będę pamiętać",

			"low": 'Niski',
			"normal" : 'Normalny',
			"high" : 'Wysoki',

			"gender": "Kim jesteś?",
			"mutation": "Jesteś po mutacji?",
			"voice": "Jaki masz głos?",

			"welcome": "Witaj!",
			"before-we-start": "Jesteś tu pierwszy raz?<br>By zacząć odpowiedz na kilka pytań :)",
			"next": "Dalej",
			"go-back": "Wróć",

			"all-done": "Wszystko gotowe!",
			"voice-range-set": 'Wybrane zostały domyśłne ustawienia dla twojego głosu.',

			"just-in-case": "Tak na zaś...",
			"if-you-need-help": 'Jeśli będzie ci potrzebna pomoc,<br>kliknij \
				<i class="help-icon-example fas fa-question-circle"></i> w prawym górnym rogu.'
		},
		various: {
			"delete": "Usuń",
			"cancel": 'Anuluj',
			"save": 'Zapisz',

			"play-example": 'Przykład',

			"choose-syllables": 'Wybierz sylaby',
			"nothing-found": 'Brak wyników',
			"search-syllables": 'Szukaj sylaby...',
			"search-melodies": 'Szukaj melodii...',
			"search-sets": 'Szukaj zestawu ćwiczeń...',
			"add-exercises": '<i class="fas fa-arrow-down"></i> Dodaj ćwiczenia <i class="fas fa-arrow-down"></i>',
			"tab-exercise-sets": "Zestawy",
			"tab-exercises": "Ćwiczenia",
			"tab-melodies": "Melodie",

			"enter-set-name": 'Zapisywanie zestawu',
			"enter-set-name-placeholder": "Nazwa zestawu",
			"enter-set-description-placeholder": "Opis zestawu (opcjonalny)",
			"name-is-taken-1": 'Nazwa "',
			"name-is-taken-2": '" jest już zajęta.',
			"name-not-set": "Wprowadź nazwę.",
			"build-in-sets-header": "Domyślne zestawy ćwiczeń",
			"user-sets-header": "Twoje zestawy ćwiczeń",
			"remove-set-prompt": "Usunąć wskazany zestaw?",
			"cant-undo": "Operacji nie będzie można cofnąć.",
		},
		toasts: {
			"cant-save-empty-1": "Kolejka ćwiczeń jest pusta.",
			"cant-save-empty-2": "By zapisać nowy zestaw, dodaj najpierw do kolejki ćwiczenia.",
			"full-piano-not-loaded-1": "Wczytuję pianino.",
			"full-piano-not-loaded-2": "Część plików audio jest nadal wczytywana. Pianino przez moment będzie brzmieć dziwnie.",
			"full-piano-loaded-1": "Pianino jest już gotowe :)",
			"full-piano-loaded-2": "Wszystkie konieczne pliki audio zostały już załadowane.",
			'fullscreen-t': 'Używasz telefonu lub tabletu?',
			'fullscreen-m': 'Kliknij by otworzyć tryb pełnoekranowy.',
			'first-add-exercises-t': 'Kolejka ćwiczeń jest pusta.',
			'first-add-exercises-m': 'By rozpocząć wybierz najpierw jakieś ćwiczenia.',
			'exercises-added': 'Dodano nowy element do kolejki.',
			'exercises-removed': 'Usunięto wybrany element z kolejki.',
			'set-loaded': 'Wczytano: ',
			'set-clear': 'Opróżniono kolejkę ćwiczeń.',
		}
	},

	// Rodzaje melodii
	types: {
		"basic": {name: "Podstawowe melodie"},
		"relaxing": {name: "Relaksujące melodie"},
		"hard": {name: "Trudne melodie"},
	},

	// Baza wszystkich melodii
	melodies: {
		"basic": {
			type: "basic",
			name: "Prosta",
			description: "TODO: Opis melodii ćwiczenia",
			intro: 'audio/placeholder.mp3',
			data: [ 
				{notes : [0, 4, 7, -12], duration: 1.00,	volume: 0.7},
				{notes : 0, 			 duration: 0.50,	volume: 0.4},
				{notes : 4, 			 duration: 0.50,	volume: 0.5},
				{notes : 7, 			 duration: 0.50,	volume: 0.5},
				{notes : 12, 			 duration: 0.50,	volume: 1.2},
				{notes : 7, 			 duration: 0.50,	volume: 0.6},
				{notes : 4, 		     duration: 0.50,	volume: 0.3},
				{notes : 0, 			 duration: 1.00,	volume: 0.3},
			]
		},
		"scale-fast": {
			type: "basic",
			name: "Skala (szybka)",
			description: "TODO: Opis melodii ćwiczenia",
			intro: 'audio/placeholder.mp3',
			data: [ 
				{notes : [0, 4, 7, -12], duration: 1.00,	volume: 0.7},
				{notes : 0, 			 duration: 0.25,	volume: 0.3},
				{notes : 2, 			 duration: 0.25,	volume: 0.3},
				{notes : 4, 			 duration: 0.25,	volume: 0.4},
				{notes : 5, 			 duration: 0.25,	volume: 0.6},
				{notes : 7, 			 duration: 0.25,	volume: 1.2},
				{notes : 5, 		     duration: 0.25,	volume: 0.6},
				{notes : 4, 			 duration: 0.25,	volume: 0.3},
				{notes : 2, 			 duration: 0.25,	volume: 0.2},
				{notes : 0, 			 duration: 1.00,	volume: 0.3},
			]
		},
		"scale-slow": {
			type: "basic",
			name: "Skala (wolna)",
			description: "TODO: Opis melodii ćwiczenia",
			intro: 'audio/placeholder.mp3',
			data: [ 
				{notes : [0, 4, 7, -12], duration: 1.00,	volume: 0.7},
				{notes : 0, 			 duration: 0.50,	volume: 0.2},
				{notes : 2, 			 duration: 0.50,	volume: 0.3},
				{notes : 4, 			 duration: 0.50,	volume: 0.4},
				{notes : 5, 			 duration: 0.50,	volume: 0.6},
				{notes : 7, 			 duration: 0.50,	volume: 1.2},
				{notes : 5, 		     duration: 0.50,	volume: 0.6},
				{notes : 4, 			 duration: 0.50,	volume: 0.3},
				{notes : 2, 			 duration: 0.50,	volume: 0.2},
				{notes : 0, 			 duration: 1.00,	volume: 0.3},
			]
		},
		"reaching": {
			type: "basic",
			name: "Sięgająca",
			description: "TODO: Opis melodii ćwiczenia",
			intro: 'audio/placeholder.mp3',
			data: [ 
				{notes : [0, 4, 7, -12], duration: 1.00,	volume: 0.7},
				{notes : 0, 			 duration: 0.50,	volume: 0.4},
				{notes : 4, 			 duration: 0.50,	volume: 0.3},
				{notes : 7, 			 duration: 0.50,	volume: 0.6},
				{notes : 12, 			 duration: 0.50,	volume: 1.0},
				{notes : 12, 			 duration: 0.50,	volume: 0.5},
				{notes : 12, 			 duration: 0.50,	volume: 0.3},
				{notes : 12, 			 duration: 0.50,	volume: 1.2},
				{notes : 7, 			 duration: 0.50,	volume: 0.6},
				{notes : 4, 		     duration: 0.50,	volume: 0.5},
				{notes : 0, 			 duration: 1.00,	volume: 0.3},
			]
		},
		"falling": {
			type: "basic",
			name: "Opadająca",
			description: "TODO: Opis melodii ćwiczenia",
			intro: 'audio/placeholder.mp3',
			data: [ 
				{notes : [0, 4, 7, -12], duration: 1.00,	volume: 0.7},
				{notes : 12, 			 duration: 0.50,	volume: 1.2},
				{notes : 7, 			 duration: 0.50,	volume: 0.6},
				{notes : 4, 			 duration: 0.50,	volume: 0.4},
				{notes : 0, 			 duration: 1.00,	volume: 0.3},
			]
		},

		"relaxing": {
			type: "relaxing",
			name: "Relaksująca",
			description: "-TODO: Opis melodii ćwiczenia",
			intro: 'audio/placeholder.mp3',
			data: [ 
				{notes : [0, 4, 7, -12], duration: 1.00,	volume: 0.7},
				{notes : 7, 			 duration: 0.50,	volume: 1.0},
				{notes : 7, 			 duration: 0.50,	volume: 0.6},
				{notes : 7, 			 duration: 0.50,	volume: 0.3},
				{notes : 5, 			 duration: 0.50,	volume: 1.0},
				{notes : 5, 			 duration: 0.50,	volume: 0.6},
				{notes : 5, 			 duration: 0.50,	volume: 0.3},
				{notes : 4, 			 duration: 0.50,	volume: 1.0},
				{notes : 4, 			 duration: 0.50,	volume: 0.6},
				{notes : 4, 			 duration: 0.50,	volume: 0.3},
				{notes : 2, 			 duration: 0.50,	volume: 1.0},
				{notes : 2, 			 duration: 0.50,	volume: 0.6},
				{notes : 2, 			 duration: 0.50,	volume: 0.3},
				{notes : 0, 			 duration: 1.50,	volume: 0.8},
				{notes : 12, 			 duration: 1.50,	volume: 1.2},
				{notes : 0, 			 duration: 1.50,	volume: 0.6},
			]
		},
		"fireish": {
			type: "relaxing",
			name: "Ogniskowa",
			description: "TODO: Opis melodii ćwiczenia",
			intro: 'audio/placeholder.mp3',
			data: [ 
				{notes : [0, 4, 7, -12], duration: 1.00,	volume: 0.7},
				{notes : 0, 			 duration: 0.50,	volume: 1.0},
				{notes : 0, 			 duration: 0.50,	volume: 0.6},
				{notes : 0, 			 duration: 0.50,	volume: 0.3},
				{notes : 4, 			 duration: 0.50,	volume: 1.0},
				{notes : 4, 			 duration: 0.50,	volume: 0.6},
				{notes : 4, 			 duration: 0.50,	volume: 0.3},
				{notes : 7, 			 duration: 0.50,	volume: 1.0},
				{notes : 7, 			 duration: 0.50,	volume: 0.6},
				{notes : 7, 			 duration: 0.50,	volume: 0.3},
				{notes : 12, 			 duration: 0.50,	volume: 1.0},
				{notes : 7, 			 duration: 0.50,	volume: 0.6},
				{notes : 4, 			 duration: 0.50,	volume: 0.3},
				{notes : 0, 			 duration: 1.00,	volume: 0.8},
			]
		},

		"wide": {
			type: "hard",
			name: "Szeroka",
			description: "TODO: Opis melodii ćwiczenia",
			intro: 'audio/placeholder.mp3',
			data: [ 
				{notes : [0, 4, 7, -12], duration: 1.00,	volume: 0.7},
				{notes : 0, 			 duration: 0.50,	volume: 0.4},
				{notes : 4, 			 duration: 0.50,	volume: 0.5},
				{notes : 7, 			 duration: 0.50,	volume: 0.7},
				{notes : 12, 			 duration: 0.50,	volume: 0.5},
				{notes : 16, 			 duration: 0.50,	volume: 0.6},
				{notes : 19, 			 duration: 0.50,	volume: 0.7},
				{notes : 17, 			 duration: 0.50,	volume: 1.2},
				{notes : 14, 			 duration: 0.50,	volume: 0.7},
				{notes : 11, 		     duration: 0.50,	volume: 0.6},
				{notes : 7, 			 duration: 0.50,	volume: 0.7},
				{notes : 5, 			 duration: 0.50,	volume: 0.5},
				{notes : 2, 			 duration: 0.50,	volume: 0.4},
				{notes : 0, 			 duration: 1.00,	volume: 0.3},
			]
		},
		"birdish": {
			type: "hard",
			name: "Ćwierkająca",
			description: "TODO: Opis melodii ćwiczenia",
			intro: 'audio/placeholder.mp3',
			data: [ 
				{notes : [0, 4, 7, -12], duration: 1.00,	volume: 0.7},
				{notes : 0, 			 duration: 0.50,	volume: 0.6},
				{notes : 7, 			 duration: 0.50,	volume: 1.0},
				{notes : 4, 			 duration: 0.50,	volume: 0.5},
				{notes : 12, 			 duration: 0.50,	volume: 1.1},
				{notes : 7, 			 duration: 0.50,	volume: 0.6},
				{notes : 16, 			 duration: 0.50,	volume: 1.2},
				{notes : 12, 			 duration: 0.50,	volume: 0.7},
				{notes : 7, 			 duration: 0.50,	volume: 0.6},
				{notes : 4, 			 duration: 0.50,	volume: 0.5},
				{notes : 2, 			 duration: 0.50,	volume: 0.4},
				{notes : 0, 			 duration: 1.00,	volume: 0.3},
			]
		},
		"full": {
			type: "hard",
			name: "Pełna",
			description: "TODO: Opis melodii ćwiczenia",
			intro: 'audio/placeholder.mp3',
			data: [ 
				{notes : [0, 4, 7, -12], duration: 1.00,	volume: 0.7},
				{notes : 0, 			 duration: 0.50,	volume: 1.0},
				{notes : 2, 			 duration: 0.50,	volume: 0.6},
				{notes : 4, 			 duration: 0.50,	volume: 0.3},
				{notes : 5, 			 duration: 0.50,	volume: 1.0},
				{notes : 7, 			 duration: 0.50,	volume: 0.6},
				{notes : 9, 			 duration: 0.50,	volume: 0.3},
				{notes : 12, 			 duration: 0.50,	volume: 1.2},
				{notes : 11, 			 duration: 0.50,	volume: 0.6},
				{notes : 9, 			 duration: 0.50,	volume: 0.3},
				{notes : 7, 			 duration: 0.50,	volume: 1.0},
				{notes : 5, 			 duration: 0.50,	volume: 0.6},
				{notes : 4, 			 duration: 0.50,	volume: 0.3},
				{notes : 0, 			 duration: 1.00,	volume: 0.6},
			]
		},
	},

	// Baza wszystkich sylab
	syllables: {
		"ma": {
			name: "Ma-Ma",
			description: "TODO: Opis ćwiczenia",
			example: 'audio/placeholder.mp3',
			intro: 'audio/placeholder.mp3',
		},
		"by": {
			name: "By-By",
			description: "TODO: Opis ćwiczenia",
			example: 'audio/placeholder.mp3',
			intro: 'audio/placeholder.mp3',
		},
		"mm": {
			name: "Mm-Mm",
			description: "TODO: Opis ćwiczenia",
			example: 'audio/placeholder.mp3',
			intro: 'audio/placeholder.mp3',
		},
		"br": {
			name: "Brrr",
			description: "TODO: Opis ćwiczenia",
			example: 'audio/placeholder.mp3',
			intro: 'audio/placeholder.mp3',
		},
		"ni": {
			name: "Ni-Ni",
			description: "TODO: Opis ćwiczenia",
			example: 'audio/placeholder.mp3',
			intro: 'audio/placeholder.mp3',
		},
	},

	// Predefiniowane zestawy ćwiczeń
	sets: [
		{
			name: "Pusty Zestaw",
			description: 'Zbuduj zestaw od zera.',
			data: []
		},
		{
			name: "Gotowy zestaw 1",
			description: 'TODO: Opis zestawu ćwiczeń',
			data: [ 
				{melody : "basic", 			syllable: "ma"},
				{melody : "basic", 			syllable: "ni"},
				{melody : "scale-fast", 	syllable: "ma"},
				{melody : "scale-slow", 	syllable: "ni"},
				{melody : "relaxing", 		syllable: "br"},
			]
		},
		{
			name: "Gotowy zestaw 2",
			description: 'TODO: Opis zestawu ćwiczeń',
			data: [ 
				{melody : "basic", 			syllable: "mm"},
				{melody : "basic", 			syllable: "br"},
				{melody : "scale-fast", 	syllable: "mm"},
				{melody : "scale-slow", 	syllable: "mm"},
				{melody : "relaxing", 		syllable: "mm"},
			]
		},
		{
			name: "Gotowy zestaw 3",
			description: 'TODO: Opis zestawu ćwiczeń',
			data: [ 
				{melody : "basic", 			syllable: "br"},
				{melody : "basic", 			syllable: "ni"},
				{melody : "scale-fast", 	syllable: "br"},
				{melody : "scale-slow", 	syllable: "br"},
				{melody : "relaxing", 		syllable: "br"},
			]
		},
	],

	settings: {
		"use-minor-scale": {
			name: "Użyj skali molowej",
			description: 'Wybierz tą opcję by w rozśpiewce zawitał dekadentyzm.',
		},
		"disable-coach": {
			name: "Wyłącz głos trenera",
			description: 'Przeszkadza ci mój głos? No to mnie wycisz.',
		},
	}
}

// Zwraca wybrany asset w preferowanej przez użytkownika opcji językowej.
function getAsset()
{
	// Pobranie preferowanego języka użytkownika.
	// _pl - Polski
	let userLang = '_' + (navigator.language || navigator.userLanguage);
	userLang = (userLang == '_pl') ? '' : '_en'; // Polski to default i przewiduję tylko angielski.

	// Wyciągnięcie przedostatniego obiektu.
	let i = 0;
	let assets = applicationAssets;
	for( ; i < arguments.length - 1 ; i++) {
		assets = assets[arguments[i]];
	}
		
	// Jeśli jest dedykowany język to go zwróć.
	if(typeof assets[arguments[i] + userLang] !== 'undefined')
		return assets[arguments[i] + userLang];
	// Jeśli nie to zwróć domyslną opcję.
	else if(typeof assets[arguments[i]] !== 'undefined')
		return assets[arguments[i]];
	else {
		console.log('%c BŁĄD: Nie zdefiniowano żądanego assetu! ', 'color: red', arguments);
	}		
}


// Dopisuje do DOM-u nowy zestaw definiowany przez użytkownika.
function appendUserSet(userSet){
	// Pobranie danych wpsywanych do DOM:
	let setName 	= userSet.name;
	let setData		= userSet.data;
	let description = userSet.description;
	let icon		= '<i class="fas fa-user"></i>';
	let label		= 'user';

	// Stworzenie HTML switcha dodającego melodie.
	let setObj = $([
		'<li class="exercise-set" data-name="' + setName + '" data-label="' + label + '">',
		'	<div class="exercise-set-icon">',
		'		<div class="exercise-set-count">' + setData.length + '</div>',
		'		' + icon,
		'	</div>',
		'	<div class="exercise-set-caption">',
		'		<div class="exercise-set-name">' + setName + '</div>',
		'		<div class="exercise-set-description"> ' + description + '</div>',
		'	</div>',
		'	<div class="exercise-set-remove">',
		'		<i class="fas fa-trash-alt"></i>',
		'	</div>',
		'</li>'
	].join("\n"));
	setObj.click(loadExerciseSet);

	// Usuwanie ćwiczenia użytkownika.
	setObj.children('.exercise-set-remove').click(function(e){
		e.preventDefault();
		e.stopImmediatePropagation();

		let obj = $(this).parent(); // Pobranie obiektu li.
		console.log(obj);

		// Pobranie nazwy.
		let name = obj.data("name");

		Swal.fire({
			title: getAsset('gui', 'various', 'remove-set-prompt'),
			html: getAsset('gui', 'various', 'cant-undo'),

			showConfirmButton: true,
			showCancelButton: true,
			confirmButtonText: getAsset('gui', 'various', 'delete'),
			cancelButtonText: getAsset('gui', 'various', 'cancel'),

			showLoaderOnConfirm: true,

			// Usuwanie zestawu użytkownika.
			preConfirm: function(){
				// Usunięcie obiektu.
				obj.remove();

				// Aktualizacja ciasteczek.
				let userSets = Cookies.getJSON('userSets');
				delete userSets[name];
				Cookies.set('userSets', userSets, { expires: cookiesExpires });
			},
		});
	});

	// Dopisanie zestawu do DOM-u.
	$('#user-sets-list').append(setObj);
}

// Funkcja obsługi eventu ładowania zestawu ćwiczeń.
function loadExerciseSet(e, welcomeSet){
	// Zatrzymanie ćwiczenia jeśli jest uruchomione.
	let stopBtn = $('.toolbar button[data-action="stop"]');
	if(!stopBtn.hasClass('locked'))
		stopBtn.trigger('click');

	let label = $(this).data('label');
	let name = $(this).find('.exercise-set-name').text();

	// Opróżnienie obecnej listy ćwiczeń.
	$('.exercise-checkbox').each(function(){
		let obj = $(this);
		obj.prop('checked', false);
		obj.trigger('change', ['loading-cookies']);
	});

	// Pobranie danych zestawu.
	let data;
	if(label == "user")
		data = Cookies.getJSON('userSets')[$(this).data('name')].data;
	else
		data = getAsset("sets", $(this).data('index'), "data");

	// Zapisanie danych ćwiczenia w ciasteczku (można bo taki sam format obiektu jak data).
	Cookies.set('activeExercises', data, { expires: cookiesExpires });

	// Załadowanie ciasteczek.
	loadCookies();

	if(typeof welcomeSet === 'undefined') // Przy pierwszej wizycie nie ma co informować.
	if(label != 'empty'){
		showToast({
			theme: 'green',
			icon: 'fas fa-layer-group',
			message: getAsset('gui', 'toasts', 'set-loaded') + name + '.',
			position: 'bottomRight',
			displayMode: 2
		});

		// Pokazanie zestawu ćwiczeń.
		scrollDocTo("#active-exercises");
	}	
	else
		showToast({
			theme: 'green',
			icon: 'fas fa-trash-alt',
			message: getAsset('gui', 'toasts', 'set-clear'),
			position: 'bottomRight',
			displayMode: 2
		});	
}


// Funkcja wywołująca zapisanie ustawień aplikacji na dysku.
function exportSettings(){
	// Wczytanie potrzebnych ciasteczek.
	let cookies = {};
	cookies['userSets'] 		= Cookies.getJSON("userSets");
	cookies['activeExercises'] 	= Cookies.getJSON("activeExercises");
	cookies['settings'] 		= Cookies.getJSON("settings");
	cookies['noteLowest'] 		= Cookies.getJSON("noteLowest");
	cookies['noteHighest'] 		= Cookies.getJSON("noteHighest");
	cookies['BPM'] 				= Cookies.getJSON("BPM");
	cookies['oldUser'] 			= Cookies.getJSON("oldUser");
	
	// Konwersja na string.
	let string = JSON.stringify(cookies);
}


// Funkcja budująca bazowe elementy GUI.
function buildBaseGUI()
{
	let exampleText = getAsset('gui', 'various', 'play-example');
	let chooseSyllables = getAsset('gui', 'various', 'choose-syllables');
	let nothingFound = getAsset('gui', 'various', 'nothing-found');
	let searchSyllables = getAsset('gui', 'various', 'search-syllables');
	let searchMelodies = getAsset('gui', 'various', 'search-melodies');
	let searchSets = getAsset('gui', 'various', 'search-sets');

	//--------// DODANIE NAPISÓW W ODPOWIEDNIM JĘZYKU DO GUI //--------//

	// Nawigacja
	for(let key in applicationAssets.gui.navigation)
		$('.navigation a[href$="#' + key + '"]').append(
			getAsset('gui', 'navigation', key));

	// Tytuły i opisy segmentów
	for(let key in applicationAssets.gui.segments) {
		$('#' + key + ' header h1').first().append(
			getAsset('gui', 'segments', key, 'header'));
		$('#' + key + ' header h2').first().append(
			getAsset('gui', 'segments', key, 'summary'));
	}

	// Różne pomniejsze napisy
	for(let key in applicationAssets.gui.various){
		$('#' + key).append(
			getAsset('gui', 'various', key));
	}


	//--------------// DODANIE PASKÓW WYSZUKIWANIA //---------------//

	// Stworzenie HTML switcha dodającego melodie.
	let searchObj = $([
		'<div class="search-bar-container-inner"><div class="search-bar">',
		'	<i class="fas fa-search"></i>',
		'	<input type="text" placeholder="' + searchMelodies + '">',
		'</div></div>',
	].join("\n"));

	$('#melodies .search-bar-container-outer, #exercises .search-bar-container-outer').append(searchObj);

	let searchObj2 = $([
		'<div class="search-bar-container-inner"><div class="search-bar">',
		'	<i class="fas fa-search"></i>',
		'	<input type="text" placeholder="' + searchSets + '">',
		'</div></div>',
	].join("\n"));

	$('#exercise-sets .search-bar-container-outer').append(searchObj2);
	
	// Stworzenie HTML switcha dodającego melodie.
	let notFoundObj = $([
		'<div class="search-nothing-found" style="display: none;">' + nothingFound + '</div>',
	].join("\n"));

	$('#melodies .picker-content, #exercises .picker-content').append(notFoundObj);


	//--------// WYGENEROWANIE ALFABETYCZNYCH SORTOWAŃ KLUCZY //--------//

	let melodiesAlphabetical = Object.keys(applicationAssets.melodies).sort();
	let syllablesAlphabetical = Object.keys(applicationAssets.syllables).sort();


	//--------// ZBUDOWANIE PODZIAŁU NA KATEGORIE MELODII //--------//

	// Dodanie do GUI wszystkich zdefiniowanych kategorii.
	for(let key in applicationAssets.types)
	{
		// Pobranie danych wpsywanych do DOM:
		let name = getAsset('types', key, 'name');
		
		// Stworzenie HTML switcha dodającego melodie.
		let html = $([
			'<header><h2 class="switch-list-title" data-type="' + key + '">'+ name +'</h2></header>',
			'<ul data-type="' + key + '" class="switch-list"></ul>'
		].join("\n"));

		// Dopisanie do DOM-u.
		$('#melodies .picker-content, #exercises .picker-content').append(html);
	}


	//--------// DODANIE ELEMENTÓW ZWIĄZANYCH Z MELODIAMI I ĆWICZENIAMI //--------//

	for(let i in melodiesAlphabetical)
	{
		//---------------------ELEMENTY ZWIĄZANE Z DODAWANIEM SAMYCH MELODII------------------//

		let melodyKey = melodiesAlphabetical[i];

		// Pobranie danych wpsywanych do DOM:
		let type 		= getAsset('melodies', melodyKey, 'type');
		let melodyName 	= getAsset('melodies', melodyKey, 'name');
		let description = getAsset('melodies', melodyKey, 'description');
		

		// Stworzenie HTML switcha dodającego melodie.
		let switchObj = $([
			'<li>',
			'	<label class="switch el-switch">',
			'		<div class="switch-caption">',
			'			<span data-melody="' + melodyKey + '" class="example-melody switch-button"><i class="fas fa-headphones-alt"></i></span>',
			'			<span class="switch-title melody-title">' + melodyName + '</span>',
			'			<div class="switch-description">' + description + '</div>',
			'		</div>',
			'		<input class="exercise-checkbox" data-melody="' + melodyKey + '" data-syllable="" type="checkbox">',
			'		<span class="el-switch-style"></span>',
			'	</label>',
			'</li>'
		].join("\n"));

		// Stworzenie HTML obiektu odtwarzania melodii.
		let exerciseObj = $([
			'<li data-action="change-exercise" data-melody="' + melodyKey + '" data-syllable=""',
			'		class="delayed-button waitable clickable disabled">',
			' 	<div class="flex-container">',
			'		<div class="handle"></div>',
			'		<div class="exercise-info">',
			'			<div><i class="fab fa-itunes-note"></i> ' + melodyName + '</div>',
			'		</div>',
			'	</div>',
			'</li>'
		].join("\n"));

		// Dopisanie do DOM-u.
		$('#melodies ul[data-type="' + type + '"]').append(switchObj);
		$('#exercises-toolbar').append(exerciseObj);


		//---------------------ELEMENTY ZWIĄZANE Z DODAWANIEM MELODII I SYLAB------------------//

		// Stworzenie HTML accordionu danej melodii na wszystkie sylaby.
		let accordionObj = $([
			'<li>',
			'	<div class="melody-accordion" data-target="#syllable-list_' + melodyKey + '">',
			'		<div class="switch-caption">',
			'			<span data-melody="' + melodyKey + '" class="example-melody switch-button"><i class="fas fa-headphones-alt"></i></span>',
			'			<span class="switch-title melody-title">' + melodyName + '</span>',
			'			<div class="switch-description">' + description + '</div>',
			'		</div>',
			'		<div class="accordion-icon"><i class="fas fa-plus"></i></div>',
			'	</div>',
			'	<div id="syllable-list_' + melodyKey + '">',
			//'		<div class="syllables-list-caption">' + chooseSyllables + ' <i class="fas fa-arrow-down"></i></div>',
			'		<ul class="syllables-list" data-melody="' + melodyKey + '">',
			'			<li><div class="search-bar">',
			'				<i class="fas fa-search"></i>',
			'				<input type="text" placeholder="' + searchSyllables + '">',
			'			</div></li>',
			'			<li class="search-nothing-found" style="display: none;">' + nothingFound + '</li>',
			'		</ul>',
			'	</div>',
			'</li>'
		].join("\n"));

		$('#exercises ul[data-type="' + type + '"]').append(accordionObj);


		for(let j in syllablesAlphabetical)
		{
			let syllableKey = syllablesAlphabetical[j];
			
			// Pobranie danych wpsywanych do DOM:
			let syllableName 	= getAsset('syllables', syllableKey, 'name');
			//let description 	= getAsset('syllables', syllableKey, 'description');

			
			// Stworzenie HTML switcha dodającego ćwiczenia.
			let switchObj = $([
				'<li>',
				'	<label class="switch el-switch">',
				'		<div class="switch-caption">',
				'			<span data-syllable="' + syllableKey + '" class="example-syllable switch-button"><i class="fas fa-headphones-alt"></i></span>',
				'			<span class="switch-title">' + syllableName + '</span>',
				//'			<div class="switch-description">' + description + '</div>',
				'		</div>',
				'		<input class="exercise-checkbox" data-melody="' + melodyKey + '" data-syllable="' + syllableKey + '" type="checkbox">',
				'		<span class="el-switch-style"></span>',
				'	</label>',
				'</li>'
			].join("\n"));
	
			// Stworzenie HTML obiektu odtwarzania ćwiczenia.
			let exerciseObj = $([
				'<li data-action="change-exercise" data-melody="' + melodyKey + '" data-syllable="' + syllableKey + '"',
				'		class="delayed-button waitable clickable disabled">',
				' 	<div class="flex-container">',
				'		<div class="handle"></div>',
				'		<div class="exercise-info">',
				'			<div><i class="fas fa-comment-dots"></i> ' + syllableName + '</div>',
				'			<div>' + melodyName + '</div>',
				'		</div>',
				' 	</div>',
				'</li>'
			].join("\n"));
			
			// Dopisanie do DOM-u.
			$('.syllables-list[data-melody="' + melodyKey + '"]').append(switchObj);
			$('#exercises-toolbar').append(exerciseObj);
		}
	}


	//-------// DODANIE OBIEKTÓW PREDEFINIOWANYCH ZESTAWÓW ĆWICZEŃ //-------//

	for(let index in applicationAssets.sets){

		// Pobranie danych wpsywanych do DOM:
		let setName 	= getAsset('sets', index, 'name');
		let setData		= getAsset('sets', index, 'data');
		let description = getAsset('sets', index, 'description');
		let icon		= setData.length != 0 ? '<i class="fas fa-layer-group"></i>' : '<i class="fas fa-trash-alt"></i>';
		let label		= setData.length != 0 ? 'normal' : 'empty';

		// Stworzenie HTML switcha dodającego melodie.
		let setObj = $([
			'<li class="exercise-set" data-index="' + index + '" data-label="' + label + '">',
			'	<div class="exercise-set-icon">',
			'		<div class="exercise-set-count">' + setData.length + '</div>',
			'		' + icon,
			'	</div>',
			'	<div class="exercise-set-caption">',
			'		<div class="exercise-set-name">' + setName + '</div>',
			'		<div class="exercise-set-description"> ' + description + '</div>',
			'	</div>',
			'</li>'
		].join("\n"));

		// Dopisanie do DOM-u.
		$('#build-in-sets-list').append(setObj);
	}

	// Dodanie zestawów ćwiczeń użytkownika.
	let userSets = Cookies.getJSON('userSets');
	for (let i in userSets)
		appendUserSet(userSets[i]);


	//--------// DODANIE ELEMENTÓW ZWIĄZANYCH Z USTAWIENIAMI //--------//

	// Dodanie do GUI wszystkich zadeklarowanych ćwiczeń.
	for(let key in applicationAssets.settings)
	{
		// Pobranie danych wpsywanych do DOM:
		let name 		= getAsset('settings', key, 'name');
		let description = getAsset('settings', key, 'description');
		
		// Stworzenie HTML switcha dodającego ćwiczenia.
		let switchObj = $([
			'<li>',
			'	<label class="switch el-switch">',
			'		<div class="switch-caption">',
			'			<span class="switch-title">' + name + '</span>',
			'			<div class="switch-description">' + description + '</div>',
			'		</div>',
			'		<input class="settings-checkbox" id="' + key + '" type="checkbox">',
			'		<span class="el-switch-style"></span>',
			'	</label>',
			'</li>'
		].join("\n"));

		// Dopisanie do DOM-u.
		$('#settings ul').append(switchObj);
	}


	//--------// DODANIE OBSŁUGI ZDARZEŃ //--------//

	// Podpięcie obsługi akordeonu rozwijanego.
	createAccordion('.melody-accordion', false);
	// Propagacja klasy active na element li.
	$('.melody-accordion').on('accordion-open', function(){
		let li = $(this).parent();
		li.addClass('active');
		console.log(1);
	});
	$('.melody-accordion').on('accordion-close', function(){
		let li = $(this).parent();
		li.removeClass('active');
		console.log(2);
	});


	// Funkcja realizująca wyszukanie.
	// search - poszukiwany tekst.
	// where - grupa jquery w któej jest szukane.
	// find - typ elementu wewnątrz którego szukany jest tekst.
	let applySearch = function(search, where, find, defaultDisplay)
	{
		if(typeof defaultDisplay === "undefined")
			defaultDisplay = "block";

		let thingsFound = 0;
		search = search.toLowerCase();
		
		where.not('.search-nothing-found').each(function(){
			let obj = $(this);

			let title = obj.find(find).text();
			title = title.toLowerCase();

			// Szukanie wskazanej sylaby.
			if(title.indexOf(search) > -1 || search.length == 0) {
				obj.css('display', defaultDisplay);
				thingsFound++;
			}
			else {
				obj.css('display', 'none');
			}
		});

		// Informacja o braku wyników.
		if(thingsFound)
			where.filter('.search-nothing-found').css('display', 'none');
		else
			where.filter('.search-nothing-found').css('display', 'block');

		// Określenie który element na liscie jest widoczny jako ostatni.
		where.removeClass('last-visible');
		where.filter(':visible:last').addClass('last-visible');

		return thingsFound;
	};

	// Obsługa wyszukiwania sylaby.
	$('.syllables-list .search-bar input').keyup(function(){
		let obj = $(this);
		let search = obj.val();
		search = search.toLowerCase();

		// Znalezienie obiektów li sylab.
		let syllablesLi = obj.closest('li').siblings();

		// Realizacja wyszukiwania i ukrywania nie-matchy.
		applySearch(search, syllablesLi, '.switch-title')
	});
	// Obsługa wyszukiwania melodii.
	$('#melodies .search-bar-container-inner .search-bar input,'
		+ '#exercises .search-bar-container-inner .search-bar input').keyup(function(){
		let obj = $(this);
		let search = obj.val();
		search = search.toLowerCase();

		// Znalezienie obiektów li list melodii/grupy melodii.
		let melodiesUl = obj.closest('.search-bar-container-outer').siblings('.picker-content').children('ul');

		let results = 0;
		// Realizacja wyszukiwania i ukrywania nie-matchy.
		// (wewnątrz each by :visible:last działało dobrze - osobno dla list)
		melodiesUl.each(function(){
			let melodiesLi = $(this).children();
			results += applySearch(search, melodiesLi, '.melody-title');
		});

		// ukrycie nagłówków pustych grup.
		melodiesUl.each(function(){
			let obj = $(this);
			let count = obj.children('li:visible').length;
			
			if(count){
				obj.prev().css('display', 'block');
			}
			else{
				obj.prev().css('display', 'none');
			}
		});	

		// Informacja że nic nie znaleziono.
		if(results)
			$(this).closest('.search-bar-container-outer').siblings('.picker-content').children('.search-nothing-found').css('display', 'none');
		else
			$(this).closest('.search-bar-container-outer').siblings('.picker-content').children('.search-nothing-found').css('display', 'block');
	});
	// Obsługa wyszukiwania zestawu.
	$('#exercise-sets .search-bar-container-inner .search-bar input').keyup(function(){
		let obj = $(this);
		let search = obj.val();
		search = search.toLowerCase();

		// Znalezienie obiektów li list melodii/grupy melodii.
		let setsUl = obj.closest('.search-bar-container-outer').siblings('.picker-content').children('ul');

		let results = 0;
		// Realizacja wyszukiwania i ukrywania nie-matchy.
		// (wewnątrz each by :visible:last działało dobrze - osobno dla list)
		setsUl.each(function(){
			let setsLi = $(this).children();
			results += applySearch(search, setsLi, '.exercise-set-name', "flex");
		});

		let builtInList = setsUl.first();
		// ukrycie nagłówków pustych grup.
		builtInList.each(function(){
			let obj = $(this);
			let count = obj.children('li:visible').length;
			
			if(count){
				obj.prev().css('display', 'block');
			}
			else{
				obj.prev().css('display', 'none');
			}
		});
		
		// Informacja że nic nie znaleziono.
		if(results)
			$(this).closest('.search-bar-container-outer').siblings('.picker-content').children('.search-nothing-found').css('display', 'none');
		else
			$(this).closest('.search-bar-container-outer').siblings('.picker-content').children('.search-nothing-found').css('display', 'block');
	});


	// Odtwarzanie przykładowej melodii.
	$('.example-melody').click(function(e)
	{
		// Aktywacja kontekstu.
		if (audioCtx.state === 'suspended')
			audioCtx.resume();
		
		let melodyKey = $(this).data('melody');

		// Wyciszenie poprzedniego przykładu.
		fadeOutPlayingBuffers(audioCtx.currentTime, 0.2, "example");

		// Pobranie danych melodii.
		const melody = getAsset("melodies", melodyKey, "data");
		let   time = audioCtx.currentTime;

		// Odtworzenie melodii:
		for(let i=1; i< melody.length; i++){

			let note 		  = melody[i].notes;
			let notesDuration = 60.0 / BPM * melody[i].duration; // w sek.
			let volume 		  = melody[i].volume; 
			

			// Zagranie pojedyńczego dźwięku.
			cssPiano.playNote({
				"key": note,
				"when": time,
				"duration": notesDuration,
				"volume": volume,
				"hold": false,
				"offset": 39,
				"label": "example",
				"forceMinor": $('#use-minor-scale').is(":checked")
			});

			time += notesDuration;
		}

		// Brak dalszej propagacji.
		e.preventDefault();
		e.stopImmediatePropagation();
	});
	// Odtworzenie przekłądowej sylaby.
	$('.example-syllable').click(function(e)
	{		
		let syllable = $(this).data('syllable');

		// Załadowania buferu audio z pliku on-fly
		// (żeby nie wydłurzać niepotrzebnie wstępnego ładowania)
		let fileName = getAsset('syllables', syllable, 'example');
		getAudioBuffer(fileName).then(function(audioBuffer)
		{
			// Aktywacja kontekstu.
			if (audioCtx.state === 'suspended')
				audioCtx.resume();
			
			// Wyciszenie poprzedniego przykładu.
			fadeOutPlayingBuffers(audioCtx.currentTime, 0.2, "example");

			// Odtworzenie przykładu.
			playBuffer({
				"buffer": audioBuffer,
				"label": "example"
			})
		});

		// Brak dalszej propagacji.
		e.preventDefault();
		e.stopImmediatePropagation();
	});



	// Dodanie stanu aktywnego do pojemnika search bara.
	$('.search-bar input').focus(function(){
		let searchBar = $(this).parent();
		searchBar.addClass('active');
		if(searchBar.parent().hasClass('search-bar-container-inner'))
			searchBar.parent().addClass('active');
	});
	$('.search-bar input').blur(function(){
		let searchBar = $(this).parent();
		searchBar.removeClass('active');
		if(searchBar.parent().hasClass('search-bar-container-inner'))
			searchBar.parent().removeClass('active');
	});

	// Dodanie lub usunięcie ćwiczenia z listy ćwiczeń. (po data-melody i data-syllable)
	$('.exercise-checkbox').on("change", function(e, loadingCookies)
	{
		let melody = $(this).data('melody');
		let syllable = $(this).data('syllable');

		let target = $('#exercises-toolbar li[data-melody="' + melody + '"][data-syllable="' + syllable + '"]');

		// Dodanie nowego ćwiczenia i przesunięcie na koniec listy
		if(this.checked) {
			// Dodanie klasy animacji wejścia.
			target.addClass('fadeInLeftBig');
			
			// Dopisanie obiektu na koniec DOM-u.
			target.removeClass('disabled')
				.detach().appendTo("#exercises-toolbar");

			// Zaplanowane usunięcie klasy animacji wejścia.
			let fadeInTime = target.css('animation-duration');
			fadeInTime = fadeInTime.substring(0, fadeInTime.length-1);

			// Jedną sekundę dodatkowo by uniknąć ew. skoków CSS.
			fadeInTime = parseFloat(fadeInTime)*1000 + 1000; 
			setTimeout(function(){
				target.removeClass('fadeInLeftBig');
			}, fadeInTime); // Po takim czasie ile trwa animacja.


			// Wyświetlenie toastu o ile nie są wczytywane dane z ciasteczek.
			if(typeof loadingCookies === 'undefined')
				showToast({
					theme: 'green',
					icon: 'fas fa-plus',
					message: getAsset('gui', 'toasts', 'exercises-added'),
					position: 'bottomRight'
				});
		}
		// Usunięcie danego ćwiczenia z lity (ukrycie)
		else {
			target.addClass('disabled');

			// Wyświetlenie toastu o ile nie są wczytywane dane z ciasteczek.
			if(typeof loadingCookies === 'undefined')
				showToast({
					theme: 'green',
					icon: 'fas fa-trash-alt',
					message: getAsset('gui', 'toasts', 'exercises-removed'),
					position: 'bottomRight'
				});
		}

		// Wstawienie do listy ćwiczeń informacji o braku ćwiczeń.
		let activeExercisesCount = $('#exercises-toolbar li:not(".disabled")').length;
		if(activeExercisesCount > 0)
			$('#add-exercises').addClass('disabled'); // nadrzędny element
		else
			$('#add-exercises').removeClass('disabled');
	});
	// Wywołanie zapisu ciasteczek
	$('.settings-checkbox, .exercise-checkbox').on("change", function(e, loadingCookies) {
		// Jeśli ciasteczka są wczytywane to nie ma sensu ich zapisywać.
		if(typeof loadingCookies === 'undefined')
			saveCookies();
	});


	// Ładowanie całych zestawów ćwiczeń.
	$('.exercise-set').click(loadExerciseSet);
}
