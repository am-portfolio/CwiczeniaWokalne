//-------------------------------------------------------------------//
//--------------------- OBSŁUGA ACCORDIONÓW -------------------------//
//-------------------------------------------------------------------//

// Funkcia dodająca funcionalność rozwijanego akordeonu do wskazanych
// obiektów. Wskazane obiekty muszą mieć data-target określajacy
// co będzie rozwijane/zawijane. By coś było domyślnie otwarte należy 
// dodać do rodzica klasę .active.
// Dla animation == false rozwijanie zostanie wyłączone a zamiast tego
// elementy będą działać jak zwykłe zakładki.
// ELementy klikane przy otwieraniu i zamykaniu dostają eventy:
//	- accordion-open
//	- accordion-close
function createAccordion(selector, animation = true)
{
	let objs = $(selector);

	// Opakowanie elementów w wrapper.
	objs.each(function(){
		let obj = $(this);
		let target = $(obj.data('target'));
		target.wrap("<div class='accordion-wrapper'></div>" );
	});

	// Dodanie koniecznego CSS do obiektów.
	objs.each(function(){
		let obj = $(this);
		let target = $(obj.data('target')).parent('.accordion-wrapper');

		if(animation){
			target.css('overflow', 'hidden');
			target.css('max-height', '0');
			target.css('-webkit-transition', 'max-height 0.5s ease-out');
			target.css('transition', 'max-height 0.5s ease-out');
		}
	});

	// Zawija wskazany przez 'target' obiekt DOM-u.
	function colapseTarget(){
		let obj = $(this);
		let target = $(obj.data('target')).parent('.accordion-wrapper');
		if(animation)
			target.css('max-height', '0');
		else
			target.css('display', 'none');
	}

	// Otwiera wskazany przez 'target' DOM-u.
	function openTarget(){
		let obj = $(this);
		let target = $(obj.data('target')).parent('.accordion-wrapper');
		if(animation)
			target.css('max-height', $(obj.data('target')).outerHeight(true) + 'px');
		else
			target.css('display', 'block');
	}

	// Inicializacja
	objs.filter('active').each(openTarget);
	objs.not('active').each(colapseTarget);

	// Obsluga eventów.
	objs.click(function(){
		let obj = $(this);
		
		if(obj.hasClass('active')){
			obj.removeClass('active');
			obj.trigger('accordion-close');
			obj.each(colapseTarget);
		}
		else{
			let activeObjs = objs.filter('.active');
			activeObjs.removeClass('active');
			activeObjs.trigger('accordion-close');
			activeObjs.each(colapseTarget);

			obj.addClass('active');
			obj.trigger('accordion-open');
			obj.each(openTarget);
		}
	});
}

