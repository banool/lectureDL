if(!window.lightbox)
{
/**
 * lightbox.js - a flexible lightbox widget.
 * @author jriecken
 **/
var lightbox = {
  Lightbox: Class.create({
   /**
    * Creates a new lightbox.  If no "openLink" property exists in the config passed in,
    * the lb can be programmatically opened by calling open() on it.
    * @param cfg configuration for the lb.
    *  - lightboxId - The optional id to be set to the lightbox wrapping div. The default is no id attribute set on the lightbox wrapper element.
    *  - openLink - If passed will wire lb opening to this link, and set the focus back on it on close
    *  - focusOnClose - element that will receive the focus on close. If specified, it supercedes openLink element.
    *  - ajax - Whether to asyncronously load the lb content. This can be a simple boolean (the url will be taken from openLink's href) or a {url: 'url', params: 'params', loadExternalScripts: 'true'} object.
    *  --    if ajax{...loadExternalScripts :true} is defined then all all of the referenced script source files will be loaded before executing the scripts in the loaded page.
    *  - dimensions - A {w: xxx, h: xxx} object defining the dimensions of the lb.  If not passed, the lb will size to fit the content.
    *  - contents - Contents of the lb (not needed if async) - either a string, a function that returns a string, or an object with add'l config (see _updateLightboxContent).
    *  - title - Title for the lb.  If not passed and openLink is provided and has a title attribute, that attribute will be used.
    *  - defaultDimensions - Default dimensions for ajax loading phase of a lb that doesn't specify a dimensions config param.
    *  - useDefaultDimensionsAsMinimumSize - if useDefaultDimensionsAsMinimumSize set then increase size to be the minimum if the auto-size results in a small size
    *  - horizontalBorder - specifies the minimum dimension for the width around the lightbox, default is set to 50
    *  - verticalBorder - specifies the minimum dimension for the height around the lightbox, default is set to 50
    *  - constrainToWindow - Whether to ensure that the lb will fit inside the window.
    *  - closeOnBodyClick - Whether to close the lb when the user clicks outside of the lb.
    *  - processingTemplate - HTML template for the content shown while an async load is in progress.
    *  - lbTemplate - HTML template for the lb. If user-supplied lbTemplate & title parameters are passed to the lightbox, the lbTemplate must contain any required  headings for the title.
    *  - lbContentClass - div class that contains the lb content, useful with client-supplied lbTemplate.
    *  - troubleElems - Elements that should be hidden while the lb is open.
    *  - msgs - I18N messages used by the lb.
    *  - onClose - call back function that if passed is called when the light box is closed
    *  - left - optional left position for lb. Default position is centered
    *  - top - optional top position for lb. Default position is centered
    **/
   initialize: function( cfg )
   {
     //Default values for configuration parameters.
     this.cfg = Object.extend({
        lightboxId: "",
        openLink: null,
        ajax: null,
        dimensions: null,
        contents: "",
        title: "",
        focusOnClose: "",
        defaultDimensions: { w: 320, h: 240 },
        useDefaultDimensionsAsMinimumSize : false,
        horizontalBorder : 50,
        verticalBorder : 50,
        constrainToWindow: true,
        closeOnBodyClick: true,
        showCloseLink: true,
        processingTemplate: '<div class="lb-loading" style="width: #{width}px; height: #{height}px;"><span class="hideoff">#{loadingText}</span></div>',
        lbTemplate: '<div class="lb-header" tabindex="0" id="lb-header">#{title}</div><div class="lb-content" aria-live="assertive"></div><a class="lbAction u_floatThis-right" href="\\#close" title=\'#{closeText}\'><img src="' + getCdnURL( "/images/ci/mybb/x_btn.png" ) + '" alt="#{closeText}"></a>',
        lbContentClass: 'lb-content',
        troubleElems: [ 'select', 'object', 'embed', 'applet' ],
        msgs: { 'close' : page.bundle.getString('inlineconfirmation.close'), 'loading' : page.bundle.getString('lightbox.loading') }
     }, cfg);
     if ( !this.cfg.showCloseLink && !cfg.lbTemplate )
     {
       this.cfg.lbTemplate = '<div class="lb-header" tabindex="0" id="lb-header">#{title}</div><div class="lb-content" aria-live="assertive"></div><span tabindex="0" class="lb-focustrap"> </span>';
     }
     this.cfg.title = this.cfg.title || ( this.cfg.openLink && this.cfg.openLink.title ? this.cfg.openLink.title : "" );
     var wrapperArgs = {
       title: this.cfg.title,
       closeText: this.cfg.msgs.close,
       lbContentClass: this.cfg.lbContentClass
     };
     if ( wrapperArgs.title )
     {
       if ( !cfg.lbTemplate )
       {
           wrapperArgs.title = '<h2 aria-live="assertive">' + wrapperArgs.title + '</h2>';
       }
     }
     else
     {
       wrapperArgs.title = '&nbsp;';
     }

     if ( this.cfg.openLink )
     {
       this.cfg.openLink = $( this.cfg.openLink );
       this.cfg.openLink.observe( 'click', this._onOpen.bindAsEventListener( this ) );
       if ( !this.cfg.focusOnClose )
       {
         this.cfg.focusOnClose = this.cfg.openLink;
       }
     }
     this.overlay = new Element('div').addClassName('lb-overlay').setStyle( { opacity: 0 } );
     this.lightboxWrapper = new Element('div').addClassName('lb-wrapper').update( this.cfg.lbTemplate.interpolate( wrapperArgs ) );
     if ( this.cfg.lightboxId )
     {
       this.lightboxWrapper.setAttribute( 'id', this.cfg.lightboxId );
     }

     var header = this.lightboxWrapper.down('.lb-header');
     if ( header )
     {
       this.lightboxTitle = header.down('h2');
     }

     this.lightboxContent = this.lightboxWrapper.down('div.' + this.cfg.lbContentClass);
     this.firstLink = this.lightboxWrapper.down('.lb-header');
     if ( this.cfg.showCloseLink )
     {
       this.closeLink = this.lastLink = this.lightboxWrapper.down('.lbAction');
       this.closeLink.observe( 'click', this._onClose.bindAsEventListener( this ) );
     }
     else
     {
       this.lastLink = this.lightboxWrapper.down('.lb-focustrap');
       if ( !this.lastLink )
       {
         this.lastLink = this.firstLink;
       }
     }
     //Wire up events
     this.lightboxWrapper.observe( 'keydown', this._onKeyPress.bindAsEventListener( this ) );
     if ( this.cfg.closeOnBodyClick )
     {
       this.overlay.observe( 'click', this._onOverlayClick.bindAsEventListener( this ) );
     }
     this.boundResizeListener = this._onWindowResize.bindAsEventListener( this );
   },
   /**
    * Opens the lightbox.
    * @param afterOpen a callback function to call after the lb has finished loading.
    */
   open: function( afterOpen )
   {
     lightbox.closeCurrentLightbox();
     lightbox._currentLightbox = this;
     this._fixIE( true );
     this._toggleTroubleElements( true );

     document.body.appendChild( this.overlay );
     new Effect.Opacity( this.overlay, {
       from: 0.0, to: 0.5, duration: 0,  // duration must be 0 to avoid focus problem with IE & screen reader
       afterFinish: function()
       {
         document.body.appendChild( this.lightboxWrapper );
         this._updateLightboxContent( afterOpen );
         //Calling the youtube API Method when the light box is loaded
         var lbc1 = this.lightboxContent;
         var frameIds = lbc1.getElementsByClassName("ytIframeClass");
         if ( frameIds.length > 0 ) {
           var frameIdss = [];
           frameIdss.push( frameIds[0] );
           
         }
         Event.observe( window, 'resize', this.boundResizeListener );
       }.bind( this ) });
   },
   /**
    * Shows the existing the lightbox. The content will not be updated, it is up to the caller to update the content
    *
    * @param afterOpen a callback function to call after the lb has finished loading.
    */
   show: function( afterOpen )
   {
     //If the lightboxWrapper is null, open the light box.
     if ( !this.lightboxWrapper )
     {
       open( afterOpen );
       return;
     }

     lightbox._currentLightbox = this;
     document.body.appendChild( this.overlay );
     new Effect.Opacity( this.overlay, {
       from: 0.0, to: 0.5, duration: 0,  // duration must be 0 to avoid focus problem with IE & screen reader
       afterFinish: function()
       {
         this.lightboxWrapper.removeClassName("hideme");
         Event.observe( window, 'resize', this.boundResizeListener );
       }.bind( this ) });
   },

   /**
    * Closes the lightbox.
    */
   close: function(hide)
   {
      if ( /MSIE (\d+\.\d+);/.test( navigator.userAgent ) && this._ytPlayers )
      {
        // This gives the list of all the ytplayers in the page.. need to find the correct one.
        for ( var i = this._ytPlayers.length - 1; i >= 0; i-- )
        {
          var currentPlayer = this._ytPlayers[ i ];
          var lightboxDiv = page.util.upToClass( currentPlayer.getIframe(), "lb-content" );
          if ( lightboxDiv )
          {
            if ( currentPlayer.stopVideo )
            {
              currentPlayer.stopVideo();
            }
            
            var iframe = currentPlayer.getIframe();
            iframe.style.display = 'none';
            iframe.src = "";

            if ( currentPlayer.clearVideo )
            {
              currentPlayer.clearVideo();
            }
            
            break;
          }
        }
      }

     this._hideLightBox = hide;
     if (this.cfg.onClose) {
       if ( Object.isFunction( this.cfg.onClose ) )
       {
         this.cfg.onClose();
       }
       else
       {
         var closeFunc = new Function(this.cfg.onClose);
         closeFunc();
       }
    }
     Event.stopObserving( window, 'resize', this.boundResizeListener );
     if ( this.movedElement && this.originalParent )
     {
       this.movedElement.parentNode.removeChild( this.movedElement );
       this.originalParent.appendChild( this.movedElement );
       this.movedElement.style.display = this.movedElement.originalDisplay;
     }

     if ( !this._hideLightBox )
     {
       this._clearLightboxContent();
       this.lightboxWrapper.remove();
     }
     else
     {
       this.lightboxWrapper.addClassName("hideme");
     }

     new Effect.Opacity( this.overlay, {
      from: 0.3, to: 0.0, duration: 0, // duration must be 0 to avoid focus problem with IE & screen reader
      afterFinish: function()
      {
         this.overlay.remove();
         this._toggleTroubleElements( false );
         this._fixIE( false );
         if ( !this._hideLightBox )
         {
          lightbox._currentLightbox = null;
         }
         if ( this.cfg.focusOnClose ) { $(this.cfg.focusOnClose).focus(); }
      }.bind( this ) });
   },
   /**
    * Hide the lightbox.
    */
   hide: function()
   {
     this.close(true);
   },
   resize: function( newDimensions )
   {
     this.cfg.dimensions = newDimensions; // might be null, in which case it is auto-resize
     this._resizeAndCenterLightbox( );
   },


   /** Event listener for opening lb. */
   _onOpen: function( event ) { this.open(); event.stop(); },
   /** Event listener for closing lb. */
   _onClose: function( event ) { this.close(); event.stop(); },
   /** Event listener wired when closeOnBodyClick is true. */
   _onOverlayClick: function( event ) { if ( event.element() == this.overlay ) { this.close(); } event.stop(); },
   /** Event listener for keyboard presses in the LB. */
   _onKeyPress: function( event )
   {
     var key = event.keyCode || event.which;
     var elem = event.element();
     // Close on ESC type
     if ( key == Event.KEY_ESC )
     {
       this.close();
       event.stop();
     }
     // Set up the tab loop (don't tab/shift-tab out of the lb)
     else if ( key == Event.KEY_TAB && !event.shiftKey && elem == this.lastLink )
     {
       this.firstLink.focus();
       event.stop();
     }
     else if ( key == Event.KEY_TAB && event.shiftKey && elem == this.firstLink )
     {
       this.lastLink.focus();
       event.stop();
     }

   },
   /** Event listener for window resize. */
   _onWindowResize: function( event )
   {
     this._resizeAndCenterLightbox( false );
   },
   /**
    * Clears the lightbox.
    */
   _clearLightboxContent: function()
   {
     this.lightboxContent.update( '' );
   },
   /**
    * Updates the lightbox content based on the configuration.
    * @param afterFinish a callback to call after the content has finished updating.
    */
   _updateLightboxContent: function( afterFinish )
   {
     if ( this.cfg.ajax ) //Async
     {
       this._resizeAndCenterLightbox( true );
       var lbc = this.lightboxContent;
       var lbcDim = lbc.getDimensions();
       lbc.update(
         this.cfg.processingTemplate.interpolate(
         {
           loadingText: this.cfg.msgs.loading,
           width: (lbcDim.width - this._extraWidth( lbc, false ) ),
           height: (lbcDim.height - this._extraHeight( lbc, false, true ) )
         } )
       ).setStyle({
           overflow: 'hidden'
       }).focus();

       var url = this.cfg.ajax.url || this.cfg.openLink.href;
       var params = this.cfg.ajax.params || {};
       var requestMethod = this.cfg.ajax.method || 'get';
       var asynFlag = this.cfg.ajax.asyn == null || this.cfg.ajax.asyn
       var cb = function( response )
       {
         lbc.setStyle({ overflow: 'auto' });
         this._updateLightboxContentHelper( response.responseText, afterFinish );
       }.bind( this );
       new Ajax.Request( url, {
        method: requestMethod ,
        asynchronous : asynFlag,
        parameters: params,
        onSuccess: cb,
        onFailure: cb
       });
     }
     else //Static
     {
       var c = this.cfg.contents; //Normal string contents
       if ( Object.isFunction( c ) ) //Function to get contents
       {
         c = c( this );
       }
       else if ( !Object.isString( c ) && !(Object.isArray( c ) ) ) //Config object
       {
         if ( c.id ) //Load contents from an element on the page already
         {
           var elem = $( c.id );

           //Lightbox can contain the elements that are considered to be 'trouble elements'.
           //Loop through to make sure that they are visible in the lightbox.
           this._toggleTroubleElementsHelper( elem, false );

           if ( c.move )
           {
             c = elem;
           }
           else
           {
             if( c.stripComments !== undefined && c.stripComments )
             {
               c = elem.innerHTML.replace('<!--','').replace('-->','');
               c = this._recreateMashupsHtml( c  );
             }
             else
             {
               c = elem.innerHTML;
             }
           }
         }
         else if ( c.auto && this.cfg.openLink ) // Attempt to auto load the content from the link href based on the file extension
         {
           var h = this.cfg.openLink.href;
           if ( lightbox._imageTypeRE.test( h ) )
           {
             c = '<img src="' + h + '" style="vertical-align:top;display:block;" alt="'+ this.cfg.title+'">';
           }
           else
           {
             c = "";
           }
         }
       }
       this._updateLightboxContentHelper( c, afterFinish );
     }
   },
   /**
    * Helper that actually updates the contents of the lb.
    * @param content the HTML content for the lb.
    * @param afterFinish a callback that will be called when the update is done.
    */
   _updateLightboxContentHelper: function( content, afterFinish )
   {
     var lbc = this.lightboxContent;
     var element;

     if ( Object.isElement( content ) )
     {
       element = content;
       content = "<div id='lb-container' class='lb-container'></div>";
     }

     this.evaluatingScripts = false;
     if (this.cfg.ajax && this.cfg.ajax.loadExternalScripts )
     {
       // Make sure all global scripts are evaluated in the lightbox content:
       content = Object.toHTML(content);
       lbc.innerHTML = content.stripScripts();
       this.evaluatingScripts = true;
       page.globalEvalScripts( content, true, this);
     }
     else
     {
       lbc.update(content);
     }
    
     if ( element )
     {
       this.originalParent = element.parentNode;
       this.movedElement = element;
       $( 'lb-container').appendChild( element );
       this.movedElement.originalDisplay = this.movedElement.style.display;
       element.show();
     }
     this._resizeWhenImagesReady( afterFinish );
     if ( !this.firstLink )
     {
       this.firstLink = lbc.down('a');
     }
     if ( this.firstLink )
     {
       (function() { this.firstLink.focus(); }.bind(this).defer( 1 ));
     }
   },

   /**
    * Since images don't load immediately, we need to wait until they've
    * loaded before resizing
    */
   _resizeWhenImagesReady: function( afterFinish )
   {
     var lbw = this.lightboxWrapper, lbc = this.lightboxContent;
     var imgs = lbc.getElementsByTagName( 'img' );
     var iterations = 0;
     if (( !this.cfg.dimensions && imgs.length > 0 ) || (this.evaluatingScripts))
     {
       new PeriodicalExecuter( function( pe )
       {
         iterations++;
         var allDone = page.util.allImagesLoaded( imgs );
         if (this.evaluatingScripts)
         {
           allDone = false;
         }
         // Done, or waited more than 5 seconds
         if ( allDone || iterations > 50 )
         {
           //Show the lightbox
           lbw.show();
           lbc.focus();
           this._resizeAndCenterLightbox( false );
           if ( afterFinish ) { afterFinish(); }
           this._initializeBottomSubmitStep( lbc );
           pe.stop();
         }
       }.bind(this),0.1);
     }
     else
     {
       this._resizeAndCenterLightbox( false );
       if ( afterFinish ) { afterFinish(); }
       this._initializeBottomSubmitStep( lbc );
     }
   },

   /**
    * Invoke page.util.pinBottomSubmitStep if bottom submit button is found.
    * This method is called with the light box content has been fully loaded.
    */
   _initializeBottomSubmitStep: function( lbc )
   {
	 var bottomSubmitToBePinned = page.util.getBottomSubmitStep();
     if ( bottomSubmitToBePinned ){
         page.util.pinBottomSubmitStep( bottomSubmitToBePinned, lbc );
       }
   },

   /**
    * Size the lightbox and make sure that it is centered in the viewport.
    * @param isLoading whether we're in the async loading phase.
    */
   _resizeAndCenterLightbox: function( isLoading )
   {
     var lbw = this.lightboxWrapper,
         lbc = this.lightboxContent,
         lbt = this.lightboxTitle, title, lbDim;

     if ( lbt ) //Ensure a long title doesn't cause the lightbox to get very wide.
     {
       title = lbt.innerHTML;
       lbt.update( '' );
     }

     if ( this.cfg.dimensions ) // explicitly defined size
     {
       lbw.setStyle( { width: this.cfg.dimensions.w + 'px',  height: this.cfg.dimensions.h + 'px' } );
     }
     else if (isLoading) // temporary loading size
     {
       lbw.setStyle({ width: this.cfg.defaultDimensions.w + 'px', height: this.cfg.defaultDimensions.h + 'px'});
     }
     else // auto-size
     {
      lbw.setStyle( { width: '',  height: '' } );
      lbc.setStyle( { height: '' } );
      lbDim = lbw.getDimensions();
      lbDim.width = lbDim.width - this._extraWidth( lbw, false);
      lbDim.height = lbDim.height - this._extraHeight( lbw, false, true);
      if ( this.cfg.useDefaultDimensionsAsMinimumSize )
      {
        // resize width and height to the minimum set
        if ( lbDim.width < this.cfg.defaultDimensions.w )
        {
          lbDim.width = this.cfg.defaultDimensions.w;
        }
        if( lbDim.height <  this.cfg.defaultDimensions.h )
        {
           lbDim.height =  this.cfg.defaultDimensions.h;
      }
      }
       lbw.setStyle( { width: ( lbDim.width ) + 'px',  height: ( lbDim.height ) + 'px' } );
     }
     var viewDim = document.viewport.getDimensions();
     lbDim = lbw.getDimensions();
     if ( this.cfg.constrainToWindow )
     {
       var maxWidth = viewDim.width - this.cfg.horizontalBorder, maxHeight = viewDim.height - this.cfg.verticalBorder;
       if ( lbDim.width > ( maxWidth ) )
       {
         lbw.setStyle( { width: ( maxWidth ) + 'px' } );
       }
       if ( lbDim.height > ( maxHeight ) )
       {
         lbw.setStyle( { height: ( maxHeight ) + 'px' } );
       }
       lbDim = lbw.getDimensions();
     }
     var l = parseInt( ( viewDim.width / 2.0 ) - (lbDim.width / 2.0 ) , 10 );
     var t = parseInt( ( viewDim.height / 2.0 ) - (lbDim.height / 2.0 ) , 10 );
     if (this.cfg.top){
       t = this.cfg.top;
     }
     if (this.cfg.left){
       l = this.cfg.left;
     }
     lbw.setStyle({ left: l + "px", top: t + "px" });
     var h = ( lbDim.height - this._extraHeight( lbw, false, false ) - this._extraHeight( lbc, true, true ) - lbc.positionedOffset().top );
     if (h >= 0)
     {
       lbc.setStyle({ height: h + "px"});
     }

     if ( lbt )
     {
       lbt.update( title );
     }
   },
   /**
    * Calculate the extra height added by padding and border.
    * @param element DOM elem to calculate the extra height for.
    * @param mBot whether to include the bottom margin
    * @param pTop whether to include the top padding.
    */
   _extraHeight: function( element, mBot, pTop )
   {
     var r = 0, dims = ['paddingBottom','borderTopWidth','borderBottomWidth'].concat(
       mBot ? ['marginBottom'] : [] ).concat(
       pTop ? ['paddingTop'] : [] );
     dims.each( function( d ) { r += parseFloat( element.getStyle( d ) ) || 0; });
     return r;
   },
   /**
    * Calculate the extra width added by padding, border, (optionally margin)
    * @param element DOM elem to calculate the extra width for.
    * @param m whether to include margins
    */
   _extraWidth: function( element, m )
   {
     var r = 0, dims = ['paddingLeft','paddingRight','borderLeftWidth','borderRightWidth'].concat(
       m ? ['marginLeft','marginRight'] : [] );
     dims.each( function( d ) { r += parseFloat( element.getStyle( d ) ) || 0; });
     return r;
   },
   /**
    * Regrettably, some JavaScript hacks are necessary for IE 6
    * @param on whether to turn the hacks on or off
    */
   _fixIE: function( on )
   {
     if ( /MSIE 6/i.test(navigator.userAgent) )
     {
       var body = document.getElementsByTagName('body')[0];
       var html = document.getElementsByTagName('html')[0];
       if ( on )
       {
         this.currentScroll = document.viewport.getScrollOffsets();
         window.scrollTo( 0, 0 );
       }
       Element.setStyle( body, ( on ? { height: '100%', overflow: 'hidden' } : { height: '', overflow: '' } ) );
       Element.setStyle( html, ( on ? { height: '100%', overflow: 'hidden' } : { height: '', overflow: '' } ) );
       this.overlay.setStyle( ( on ? { width: "120%", height: "100%"} : { width: "", height: ""} ));
       if ( !on )
       {
         window.scrollTo( this.currentScroll.left, this.currentScroll.top );
       }
     }
   },

   _toggleTroubleElementsHelper : function( contentElem, turnOff )
   {
     this.cfg.troubleElems.each( function(elemType) {

       var elems;
       if ( contentElem === null )
       {
         elems = document.getElementsByTagName( elemType );
       }
       else
       {
         elems = contentElem.getElementsByTagName( elemType );
       }

       var numElems = elems.length;
       for ( var i = 0; i < numElems; i++ )
       {
         try
         {
           elems[i].style.visibility = (turnOff ? 'hidden' : '');
         }
         catch ( e )
         {
           // Setting visibility blows up on Linux Chrome; just ignore this error, as the only
           // real consequence will be some potential UI artifacts
         }
       }
     }.bind( this ) );
   },

   /**
    * Toggle elements that may bleed through the lightbox overlay.
    * @param turnOff whether to turn off the elements.
    */
   _toggleTroubleElements: function( turnOff )
   {
     this._toggleTroubleElementsHelper( document, turnOff );
   },
   
   /**
    * Mashups could contain malicious data entered by users. 
    * So extract the required information and recreate mashup HTML to display in lightbox.
    * @param oldContent current HTML data for mashup.
    */
   _recreateMashupsHtml: function( oldContent )
   {
     var mashupType = this._checkMashupType( oldContent );
     var isLegacy = this._checkMashupIslegacy( oldContent, mashupType );
     var returnStr = '<div style=\"margin: 10px;\">' + page.bundle.getString( 'mashups.content.data.msg' ) + '</div>';
     
     if( mashupType === "youtube" )
     {
       return this._recreateYoutubeHtml( oldContent, isLegacy );
     }
     else if( mashupType === "slideshare" )
     {
       return this._recreateSlideshareHtml( oldContent, isLegacy );
     }
     else if( mashupType === "flickr" )
     {
       return this._recreateFlickrHtml( oldContent );
     }
     else
     {
       MashupDWRFacade.filterMashupData( oldContent, {
         async : false,
         callback : function( filteredData )
           {
             returnStr =  filteredData;
           }
         } );
     }
     
     return returnStr ;
   },
   
   _checkMashupType: function( oldContent )
   {
     var mashupType = "";
     if( ( oldContent.indexOf("openYtControls") !== -1 ) || ( oldContent.indexOf("//www.youtube.com/") !== -1 ) )
     {
       mashupType = "youtube";
     }
     else if( (oldContent.indexOf("slidesharecdn") !== -1) || (oldContent.indexOf("www.slideshare.net/slideshow") !== -1) )
     {
       mashupType = "slideshare";
     }
     else if( oldContent.indexOf("flickr") !== -1 )
     {
       mashupType = "flickr";
     }
     return mashupType;
   },
   
   _checkMashupIslegacy: function( oldContent, mashupType )
   {
     var isLegacy = false;
     if( (mashupType === "youtube" || mashupType === "slideshare" ) && oldContent.indexOf("<object") != -1 )
     {
       isLegacy = true;
     }
     else if(  (mashupType === "flickr" ) && oldContent.indexOf("<img") != -1 )
     {
       isLegacy = true;
     }
     return isLegacy;
   },

   _recreateYoutubeHtml: function( oldContent, isLegacy )
   {
     var title = "";
     var videoId = "";
     var strYtUrl = "";
     var newHTML = "";
     var uniqueId = "";
      
     //valid youtube video id could contain a-z, A-Z, 0-9, "_" and "-" only.
     oldContent = oldContent.replace(/&#45;/g,'-');
     oldContent = oldContent.replace(/&#95;/g,'_');
     
     if( isLegacy )
     {
       videoId = oldContent.match("//www.youtube.com/v/([\\d\\w-_]+)")[1];
     }
     else
     {
       videoId = oldContent.match("//www.youtube.com/embed/([\\d\\w-_]+)")[1];
     }
     
     if( oldContent.indexOf("openYtControls") !== -1 )
     {
       uniqueId = oldContent.match("openYtControls([\\d\\w]+)")[1];
     }
     //to make sure video plays in popup preview
     strYtUrl = "https://www.youtube.com/embed/" + videoId + "?modestbranding=1&fs=1&rel=0&menu=disable&enablejsapi=1&playerapiid=ytEmbed" + uniqueId + "&wmode=transparent";

     title = $ESAPI.encoder().canonicalize( title );
     title = $ESAPI.encoder().encodeForHTMLAttribute( title );
     //regenerate HTML to display in lightbox.
     //yt video with player controls.
     if( uniqueId !== "" && strYtUrl !== "" )
     {
   
       
       newHTML = '<div style=\"margin: 10px;\"><div class=\"u_controlsWrapper\"></div>' +
       '<h2 class=\"hideoff\">' + page.bundle.getString( 'display.embeddedVideoPlayer' ) +': ' + title + '</h2>' +
       '<div style=\"word-wrap: break-word;\">';
      
       //create iframe tag
       newHTML += '<div class=\"previewDiv ytIframeClass\" style=\"height:344px;width:425px\"' + 
       ' id=\"ytEmbed' + uniqueId + '\">' + 
       '<iframe id=\"ytObject' + uniqueId + '\"' + ' width=\"425\" height=\"344\" src=\"' + strYtUrl + '\"' + 
       ' title=\"' + title + '\"' +  ' allowfullscreen></iframe>';

       newHTML += '<a href=\"#close\" onclick=\"lightbox.closeCurrentLightbox(); return false;\" class=\"hideoff\">' +
       page.bundle.getString( 'inlineconfirmation.close' ) + '</a></div>' + 
       '<div id=\"strip' +  uniqueId + '\" class=\"liveArea-slim playerControls\" style=\"display:none\">' +
       '<h2 class=\"hideoff\">' + page.bundle.getString( 'display.videoStatus' ) +': ' + title + '</h2>' +
       '<span aria-live=\"off\" id=\"currentStatus' +  uniqueId + '\"></span>' +
       '</div></div></div>';
     }
     //yt video without player controls.
     if( uniqueId === "" && strYtUrl !== "" )
     {
       newHTML = '<div class=\"previewDiv\" style=\"height:344px;width:425px\"' + 
       ' id=\"ytEmbed' + '\">' + 
       '<iframe id=\"ytObject' + '\"' + ' width=\"425\" height=\"344\" src=\"' + strYtUrl + '\"' + 
       ' title=\"' + title + '\"' +  '></iframe></div>';  
     }

     return newHTML;
   },
   convertTime : function (duration) {
	   var total = 0;
	   var hours = duration.match(/(\d+)H/);
	   var minutes = duration.match(/(\d+)M/);
	   var seconds = duration.match(/(\d+)S/);
	   if (hours) total += parseInt(hours[1]) * 3600;
	   if (minutes) total += parseInt(minutes[1]) * 60;
	   if (seconds) total += parseInt(seconds[1]);
	   return total;
	 },
   formatTime : function ( sec )
   {
     var duration = parseInt( sec, 10 );
     var totalMinutes = Math.floor( duration / 60 );
     var hours = Math.floor( totalMinutes / 60 );
     var seconds = duration % 60;
     var minutes = totalMinutes % 60;
     if ( hours > 0 )
     {
       return hours + ':' + this.padZero( minutes ) + ':' + this.padZero( seconds );
     }
     else
     {
       return this.padZero( minutes ) + ':' + this.padZero( seconds );
     }
   },
   padZero : function ( number )
   {
     if (number < 10)
     {
       return "0" + number;
     }
     else
     {
       return number;
     }
   },
   
   _recreateSlideshareHtml: function( oldContent, isLegacy )
   {
     var title = "";
     var slideShowId = "";
     var ssSearchKey = "";
     var authorName = "";
     var newHTML = "";
     if( isLegacy ) 
     {
       oldContent = oldContent.replace(/&#45;/g,'-');
       ssSearchKey = oldContent.match("id=[\"]__sse(\\d+)")[1];
     }
     else
     {
       // New Slideshare oEmbed documentation at http://www.slideshare.net/developers/oembed; oEmbed specs at http://www.oembed.com
       ssSearchKey = oldContent.match("<a[^>]*>((?:.|\r?\n)*?)<\/a>")[0];
       ssSearchKey = ssSearchKey.replace(/&#45;/g,'-');
       ssSearchKey = ssSearchKey.match( "href=\"(http|https):\/\/www.slideshare.net\/([A-Za-z0-9]|[-_~.*!()/&#;#%'?=@+$,])*\"" )[0];
       ssSearchKey = ssSearchKey.substring( 6, ssSearchKey.length - 1 );
     }
     
     //make a call to slide share server and get real data.
     var url =  "https://www.slideshare.net/api/oembed/2?url=https://www.slideshare.net/" + ssSearchKey + "&format=json";
     
     MashupDWRFacade.verifyMashupData( url, {
       async : false,
       callback : function( returnString )
         {
           if( returnString === "" )
           {
             newHTML = '<div style=\"margin: 10px;\">' + page.bundle.getString( 'mashups.content.data.msg' ) + '</div>' ;
           }
           else
           {
             var videoJSON = returnString.evalJSON( true );
             title = videoJSON.title;
             slideShowId = videoJSON.slideshow_id;
             authorName = videoJSON.author_name;
           }
         }
       } );
     title = $ESAPI.encoder().canonicalize( title );
     title = $ESAPI.encoder().encodeForHTMLAttribute( title );
     slideShowId = $ESAPI.encoder().canonicalize( slideShowId + "" );
     slideShowId = $ESAPI.encoder().encodeForHTMLAttribute( slideShowId + "" );
     authorName = $ESAPI.encoder().canonicalize( authorName );
     authorName = $ESAPI.encoder().encodeForHTMLAttribute( authorName );
     if( slideShowId !== '' )
     {
       //create iframe tag
       return '<iframe src=\"https://www.slideshare.net/slideshow/embed_code/' + slideShowId + '\" ' +
       ' width=\"427\" height=\"356\" frameborder=\"0\" marginwidth=\"0\" marginheight=\"0\"  scrolling=\"no\" ' +
       ' style=\"border:1px solid #CCC;border-width:1px 1px 0;margin-bottom:5px\"  allowfullscreen></iframe>' +
       '<div style="margin-bottom:5px"><strong><a href=\"#\" title=\"' +
       title + '\">' + title + '</a></strong> <strong><a href=\"#\">' +
       authorName + '</a></strong>.</div>';
     }
     
     return newHTML ;
   },
   
   _recreateFlickrHtml: function( oldContent )
   {
     var flickrImgSrcUrl = "";
     var title = "";
     var flickrKey = "";
     var newHTML = "";

     flickrKey = oldContent.match("//www.flickr.com/photos/([\\d\\w@/]+)")[1];
     var flickrUrl = "https://www.flickr.com/services/oembed?url=http://flickr.com/photos/" + flickrKey + 
                     "&format=json&maxheight=640&maxwidth=640";
     
     MashupDWRFacade.verifyMashupData( flickrUrl, {
       async : false,
       callback : function( returnString )
         {
           if( returnString === "" )
           {
             newHTML = '<div style=\"margin: 10px;\">' + page.bundle.getString( 'mashups.content.data.msg' ) + '</div>' ;
           }
           else
           {
             var videoJSON = returnString.evalJSON( true );
             title = videoJSON.title;
             //sometimes http://flickr.com/services/oembed doesn't return url
             if ( videoJSON.url === null )
             {
               flickrImgSrcUrl = videoJSON.thumbnail_url;
             }
             else
             {
               flickrImgSrcUrl = videoJSON.url;
             }
           }
         }
       } );

     title = $ESAPI.encoder().canonicalize( title );
     title = $ESAPI.encoder().encodeForHTMLAttribute( title );
     if( flickrImgSrcUrl !== '' )
     {
       return '<div style=\"margin: 10px;\"><a href=\"http://flickr.com/photos/' + flickrKey + '\"' +
       '  target=\"_blank\" title=\"' + page.bundle.getString( 'display.view.on.flickr' ) + '\" />' +
       '<img src="' + flickrImgSrcUrl + '\"  alt=\"' + title + '\"></a></div>';
     }
     return newHTML ;
   }
  }),

  /* Static properties/methods */
  _imageTypeRE: /(\.bmp|\.gif|\.jpeg|\.jpg|\.png|\.tiff)$/i, /** Regex for sniffing image files */
  _currentLightbox: null, /** Currently open lightbox */
  /** Returns the currently open lightbox (null if no lightbox is open) */
  getCurrentLightbox: function()
  {
    return lightbox._currentLightbox;
  },
  // This is currently only called from page.js when the vtbe is toggled.  It is used
  // to reload the page and respect the new vtbe settings.
  // NOTE that there is a limitation of not allowing VTBEs both in-page and in-lightbox. If
  // we ever run into a situation where we have a vtbe on-page and then open a lightbox with
  // a VTBE in the lightbox then we'll have to enhance the vtbe infrastructure to deal with this properly.
  deferUpdateLightboxContent: function ( )
  {
    if (lightbox._currentLightbox && window.vtbeInLightbox)
    {
      vtbe_map = {}; // Turf all vtbe's
      (function() {
        lightbox._currentLightbox._updateLightboxContent();
      }).bind(this).delay(0.1);
      return true;
    }
    return false;
  },
  /**
   * Close the currently open lightbox (if any)
   */
  closeCurrentLightbox: function()
  {
    var lb = lightbox._currentLightbox;
    if ( lb )
    {
      lb.close();
    }
  },
  /**
   * Hide the currently open lightbox (if any)
   */
  hideCurrentLightbox: function()
  {
    var lb = lightbox._currentLightbox;
    if ( lb )
    {
      lb.hide();
    }
  },
  /**
   * Update the current lightbox content.
   * @param type either "ajax" or "static"
   * @param value
   *   if type is ajax, the same format as the lb ajax config parameter.
   *   if type is static, the same format as the lb contents config parameter.
   */
  updateCurrentLightboxContent: function( type, value )
  {
    var lb = lightbox._currentLightbox;
    if ( lb )
    {
      var oldAjax = lb.cfg.ajax, oldContents = lb.cfg.contents;
      lb.cfg.ajax = ( type == 'ajax' ) ? value : false;
      lb.cfg.contents = ( type == 'ajax' ) ? null : value;
      lb._updateLightboxContent( function() {
        lb.cfg.ajax = oldAjax;
        lb.cfg.contents = oldContents;
      });
    }
  },
  /**
   * Parse a JSON representation of the config into an object suitable for
   * passing to the lb constructor.
   * @param serializedConfig JSON config string.
   */
  parseConfig: function( serializedConfig ) //Safely parses a JSON representation of the config
  {
    return serializedConfig ? serializedConfig.replace(/'/g, '"').evalJSON( true ) : {};
  },
  /**
   * Autowire all links.with the given class on the page to open in lb.  Call this after the page has loaded.
   * The "lb:options" attribute can be added to the link to specify a JSON-formatted config string
   * that will be parsed and passed to the lb constructor.
   * @param className class of link that will be autowired.
   */
  autowireLightboxes: function( className, parentEl )
  {
    if (!parentEl)
    {
      parentEl = document;
    }
    var links = parentEl.getElementsByTagName('a');
    for ( var i = 0, len = links.length; i < len; i++ )
    {
      var a = links[i];
      if ( page.util.hasClassName( a, className ) )
      {
        a = $(a);
        var defOptions = ( lightbox._imageTypeRE.test( a.href ) ? "{'contents':{'auto':true}}" : "{'ajax':true}" );
        new lightbox.Lightbox( Object.extend( { openLink: a }, lightbox.parseConfig( a.getAttribute('lb:options') || defOptions ) ) );
      }
    }
  }
};
}
