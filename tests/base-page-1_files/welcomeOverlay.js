var welcomeOverlay =
{
  initOverlay: function()
  {
    var welcomeOverlayTitle = $( 'welcomeOverlayHello' );
    if ( welcomeOverlayTitle )
    {
      welcomeOverlayTitle.focus();
      var bodyEl = $$('body')[0];
      if ( bodyEl )
      {
        bodyEl.setStyle({
          overflow: 'auto'
        });
      }
      
    }
    var tooltipImg = $( 'overlayTooltipImg' ); 
    if ( tooltipImg )
    {
      var tooltipContent = tooltipImg.readAttribute('alt');
      tooltipImg.up().insert('<span class="tooltip">' + tooltipContent + '</span>')
    }
  },
  closeOverlay: function()
  {
    var overlay = $( 'welcomeOverlay' );
    if ( overlay )
    {
      var bodyEl = $$('body')[0];
      if ( bodyEl )
      {
        bodyEl.setStyle({
          overflow: 'hidden'
        });
      }
      overlay.hide();
      $( 'welcomeOverlayMessage' ).hide();
      $( 'welcomeOverlayWhatsNew' ).hide();
      
    }
  }
};
