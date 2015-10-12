
$(function() {

  $("#newRoom").submit(function(e){
    e.preventDefault();
    var newRoom = $(this.room).val();
    window.location = "/table/"+newRoom;
  });

  $("#viewAllContracts").click(function(e){
    e.preventDefault();
    $.get("/contract/all", {}, function(html){
      $.fancybox(html, { closeBtn: true});
    });
  });

  $("span.dealer").click(function(e){
    e.preventDefault();
    console.log("click");
    var id = $(this).data("cid");
    console.log(id);
    $.get("/contract/"+id, {}, function(html){
      $.fancybox(html, { closeBtn: true});
    });
  });

  if (!String.prototype.trim) {
    (function() {
      // Make sure we trim BOM and NBSP
      var rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g;
      String.prototype.trim = function() {
        return this.replace(rtrim, '');
      };
    })();
  }

  [].slice.call( document.querySelectorAll( 'input.input__field' ) ).forEach( function( inputEl ) {
    // in case the input is already filled..
    if( inputEl.value.trim() !== '' ) {
      classie.add( inputEl.parentNode, 'input--filled' );
    }

    // events:
    inputEl.addEventListener( 'focus', onInputFocus );
    inputEl.addEventListener( 'blur', onInputBlur );
  } );

  function onInputFocus( ev ) {
    classie.add( ev.target.parentNode, 'input--filled' );
  }

  function onInputBlur( ev ) {
    if( ev.target.value.trim() === '' ) {
      classie.remove( ev.target.parentNode, 'input--filled' );
    }
  }

});