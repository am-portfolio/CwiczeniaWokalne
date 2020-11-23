/* WYMAGA  jquery.min i jquery.mousewheel.min*/
/* Dodanie scrollowania horyzontalnego */

$(document).ready(function() {
  $('.horizontal-scrolling-list').mousewheel(function(e, delta) {
      // multiplying by 40 is the sensitivity, 
      // increase to scroll faster.
      this.scrollLeft -= (delta * 40);
      e.preventDefault();
  });
});