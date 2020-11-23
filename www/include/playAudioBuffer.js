//-------------------------------------------------------------------//
//---------- PODSTAWOWE NARZĘDZIA DO ZARZĄDZANIA DŹWIĘKIEM ----------//
//-------------------------------------------------------------------//

const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();


// Funkcja zwracająca obiekt w którym klucz odpowiada nazwie pliku
// a zawartość obiektowki arraybuffer. binPath to plik z danymi
// kilku plików połączonych binarnie jeden obok drugiego.
// jsonPath to plik który określa jak pliki są ułożone.
// Te dwa pliki generuję swoim FileConcater'em.
// Zakładam że pliki miały unikalne nazwy.
function loadArrayBuffersFromConcatFile(binPath, jsonPath){
	return new Promise(function(resolve, reject){
		const xhrJson = new XMLHttpRequest();
		xhrJson.open('GET', jsonPath, true);
		xhrJson.responseType = 'json';
		xhrJson.onload = function()
		{
			// Odebrane informacje o pliku.
			let dataInfo = xhrJson.response;

			const xhrBin = new XMLHttpRequest();
			xhrBin.open('GET', binPath, true);
			xhrBin.responseType = 'arraybuffer';
			xhrBin.onload = function()
			{
				// Odebrana zawartość pliku.
				let data = xhrBin.response;
				let response = {};

				// Funkcja wyciągająca dane pod pliku.
				function extractBuffer(src, offset, length) {
					var dstU8 = new Uint8Array( length );
					var srcU8 = new Uint8Array( src, offset, length );
					dstU8.set(srcU8);
					return dstU8.buffer;
				}
				
				// Zapisanie składowych danych do obiektu.
				for(let i in dataInfo){
					response[dataInfo[i]["file"]] = extractBuffer(
						data, dataInfo[i]["offset"], dataInfo[i]["length"]);
				}

				resolve(response);
			};
			xhrBin.onerror = function(){ reject(xhrBin.statusText); };
			xhrBin.send();
		};
		xhrJson.onerror = function(){ reject(xhrJson.statusText); };
		xhrJson.send();
	});
}

// Funckja zwracająca plik w formacie arrayBuffer.
function loadArrayBuffer(path) {
	return new Promise(function(resolve, reject){
		const xhr = new XMLHttpRequest();
		xhr.open('GET', path, true);
		xhr.responseType = 'arraybuffer';
	  	xhr.onload = function(){ resolve(xhr.response); };
	  	xhr.onerror = function(){ reject(xhr.statusText); };
	  	xhr.send();
	});
}


//Wczytuje i zwraca bufor audio z danymi.
async function getAudioBuffer(path)
{
	const audioContext = audioCtx;
	const arrayBuffer = await loadArrayBuffer(path);
	const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
	return audioBuffer;
}

/*
	Ważne informacje:
	- OBługa audio jest węzłowa. Są węzły głośności, efektów itd.
	- Węzły się do siebie podpina.
	- W przypadku sampli start() można wywołać tylko raz (jednorazowe obiekty).
	https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode
*/


// Grupy sampli odtworzone przez funkcję playBuffer.
let playingBuffers = {};

/*
	buffer			// Dane audio.
	when			// Czas uruchomienia sampla (sec).
	label			// Identyfikator sampla używany przy wygaszaniu (nie musi być unikalny)
	inPoint  		// Punkt uruchomienia (fraction / sec).
	outPoint 		
	fadeIn   		// Do jakiego punktu fadeIn (fraction / sec).
	fadeOut			
	volume			// Głoścność (fraction)
	detune			// Detune (semitones)
	playbackRate	// Szybkość odtwarzania (fraction).
	relativePoint 	// Punkty uruchomienia podano w sekundach (false) / ułamkach (true).
	relativeFade	// Punkty końca/początku fadów podano w sekundach (false) / ułamkach (true).
*/
function playBuffer(params)
{
	const audioContext = audioCtx;

	//------- PRZYGOTOWANIE OBIEKTÓW --------//

	// Przygotowanie obiektu AudioBufferSourceNode.
    const sampleNode = audioContext.createBufferSource();
	sampleNode.buffer = params.buffer;

	
	//------- PARAMETRY ODTWARZANIA --------//

	params.label = params.label || 'default';

	// Określenie kiedy należy puścić sampel.
	params.when = params.when || audioContext.currentTime;

	// Określenie czy zakres czasowy sampla i czasy fadów
	// podano relatywnie (true: 0-1) lub absolutnie (false: sekundy).
	params.relativePoint = params.relativePoint || false;
	params.relativeFade  = params.relativeFade  || true;

	// Ustalenie od jakiego miejsca puścić sampel do jakiego (0-1).
	if(params.relativePoint) {
		params.inPoint  = (params.inPoint  || 0) * params.buffer.duration;
		params.outPoint = (params.outPoint || 1) * params.buffer.duration;
	}
	else {
		params.inPoint  = params.inPoint  || 0;
		params.outPoint = params.outPoint || params.buffer.duration;
	}

	// Pozostała długość po ucięciu krańców sampla.
	const duration = params.outPoint - params.inPoint;

	// Ustalenie do kiedy jest fadeIn i od kiedy fadeOut (0-1)
	if(params.relativeFade) {
		params.fadeIn  = params.fadeIn  || 0;
		params.fadeOut = params.fadeOut || 1;
	}
	else {
		params.fadeIn  = (params.fadeIn  || 0) / duration;
		params.fadeOut = (params.fadeOut || duration) / duration;
	}

	// Pozostałe parametry odtwarzania.
	params.volume = params.volume || 1;
	params.detune = (params.detune || 0) * 100;
	params.playbackRate = params.playbackRate || 1;


	//-- PRZYGOTOWANIE WĘZŁÓW I ODTWARZANIA ---//

	// Przygotowanie węzłów głośnosci.
	const gainNodeInner = audioContext.createGain();
	const gainNodeOuter = audioContext.createGain();

	// Połączenie węzłów:
	sampleNode.connect(gainNodeInner);
	gainNodeInner.connect(gainNodeOuter);
	gainNodeOuter.connect(audioContext.destination);

	
	//---KONFIGURACJA PARAMETRÓW DODATKOWYCH----//

	sampleNode.detune.value = params.detune;
	sampleNode.playbackRate.value = params.playbackRate;


	//------- ZAPLANOWANIE ODTWARZANIA --------//
	gainNodeInner.gain.value = 0;
	sampleNode.start(params.when, params.inPoint, duration);

	// Kontrola ASR sampla.
	gainNodeInner.gain.setValueAtTime(0, params.when);
	gainNodeInner.gain.linearRampToValueAtTime(params.volume, params.when + duration * params.fadeIn);
	gainNodeInner.gain.setValueAtTime(params.volume, params.when + duration * params.fadeOut);
	gainNodeInner.gain.linearRampToValueAtTime(0, params.when + duration);


	//--- ZAPISANIE ---//
	
	// Zapisanie na liście aktywnych sampli.
	if(typeof playingBuffers[params.label] === 'undefined')
		playingBuffers[params.label] = [];

	playingBuffers[params.label].push({
		ends: params.when + duration,
		gNode: gainNodeOuter,
		sNode: sampleNode,
	});
}

// Wygaszanie akrywnych zapisanych sampli.
function fadeOutPlayingBuffers(when, fadeOutSecs, label){

	// Nie ma co wygaszać.
	if(typeof playingBuffers[label] === 'undefined') return;

	playingBuffers[label].forEach(function(as){
		if(as.ends > audioCtx.currentTime){
			as.gNode.gain.setValueAtTime(1, when);
			as.gNode.gain.linearRampToValueAtTime(0, when + fadeOutSecs);
			as.sNode.stop(when + fadeOutSecs);
		}
	})
	playingBuffers[label] = [];
}