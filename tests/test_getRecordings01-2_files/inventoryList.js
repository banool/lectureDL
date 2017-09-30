if (!window.inventoryList)
{
var list = {};
var genericList = {};
var nestedList = {};
var inventoryList = {};

inventoryList.listUrls = $H();
inventoryList.listenerElements = $H();
inventoryList.cleanUpListeners = $H();
inventoryList.ajaxRequestIds = $H();

/**
 * called during an page onload to register clean-up logic for inventory list
 * related js objects. The registered function is called  during ajax reload
 *  before replacing the innerhtml of the list
 */
inventoryList.addToCleanUpListener = function(listId,listenerFunc)
{
    inventoryList.cleanUpListeners.set(listId,listenerFunc);
};

inventoryList.DisplayController = Class.create();
inventoryList.DisplayController.prototype =
{
   /**
    *  inventory list in ajax mode registers all the event listeners for paging and sorting links
    *  and list refresh based on the active filter search criterion
    */
  initialize: function( inventoryListContainerId,url,initPagingValue,initPageIndex,limitMaxNumOfItems,pageResultsMaxSize,totalResultsCount )
  {
     var listenerElements = [];
     inventoryList.listUrls.set( inventoryListContainerId, url );
     $$('#' + inventoryListContainerId +' .pagelink' ).each(function(ele) {
       if( $s(ele) )
       {
        Event.observe(ele, 'click' ,inventoryList.ajaxPostOnClick.bindAsEventListener( this,inventoryListContainerId ));
        listenerElements.push(ele);
       }
     });

     $$('#' + inventoryListContainerId +' .sortheader' ).each(function(ele) {
       if( $s(ele) )
       {
        Event.observe(ele, 'click' ,inventoryList.ajaxPostOnClick.bindAsEventListener( this,inventoryListContainerId ));
        listenerElements.push(ele);
       }
     });

     if(!limitMaxNumOfItems)
     {
       pageResultsMaxSize = -1;
     }

     var cardViewLinkElement = $s(inventoryListContainerId  + '_cardViewLink');
     if (cardViewLinkElement)
     {
       Event.observe(cardViewLinkElement, 'click' ,inventoryList.ajaxPostOnClick.bindAsEventListener( this,inventoryListContainerId ));
       listenerElements.push(cardViewLinkElement);
     }
     var tableViewLinkElement = $s(inventoryListContainerId  + '_tableViewLink');
     if (tableViewLinkElement)
     {
       Event.observe(tableViewLinkElement, 'click' ,inventoryList.ajaxPostOnClick.bindAsEventListener( this,inventoryListContainerId ));
       listenerElements.push(tableViewLinkElement);
     }

     var gopagingElement = $s(inventoryListContainerId  + '_gopaging');
     if(gopagingElement)
     {
       Event.observe( gopagingElement, "click", inventoryList.onGoButtonClick.bindAsEventListener( this, inventoryListContainerId,'numResults', 'gopaging', 'numResults', initPagingValue, true, pageResultsMaxSize ) );
       listenerElements.push(gopagingElement);
     }

     var goFieldElement = $s(inventoryListContainerId  + '_numResults');
     if( goFieldElement )
     {
       Event.observe( goFieldElement, "keypress", inventoryList.onPageFieldEnter.bindAsEventListener( this, inventoryListContainerId, 'numResults', 'gopaging', 'numResults', initPagingValue, true, pageResultsMaxSize ) );
       listenerElements.push( goFieldElement );
     }

     gopagingElement = $s(inventoryListContainerId + '_gobut_top');
     if( gopagingElement)
      {
         Event.observe( gopagingElement, "click", inventoryList.onGoButtonClick.bindAsEventListener( this, inventoryListContainerId,'jump_top', 'gobut_top', 'pageIndex', initPageIndex, true, pageResultsMaxSize ) );
         listenerElements.push(gopagingElement);
      }

     goFieldElement = $s(inventoryListContainerId + '_jump_top');
     if( goFieldElement )
     {
         Event.observe( goFieldElement, "keyup", inventoryList.onPageFieldEnter.bindAsEventListener( this, inventoryListContainerId, 'jump_top', 'gobut_top', 'pageIndex', initPageIndex, true, pageResultsMaxSize ) );
         listenerElements.push( goFieldElement );
     }

     gopagingElement = $s(inventoryListContainerId + '_gobut_bot');
      if(gopagingElement)
      {
        Event.observe(gopagingElement, "click", inventoryList.onGoButtonClick.bindAsEventListener( this, inventoryListContainerId, 'jump_bot', 'gobut_bot', 'pageIndex', initPageIndex, true, pageResultsMaxSize ) );
        listenerElements.push(gopagingElement);
      }

      goFieldElement = $s(inventoryListContainerId + '_jump_bot');
      if( goFieldElement )
      {
          Event.observe( goFieldElement, "keyup", inventoryList.onPageFieldEnter.bindAsEventListener( this, inventoryListContainerId, 'jump_bot', 'gobut_bot', 'pageIndex', initPageIndex, true, pageResultsMaxSize ) );
          listenerElements.push( goFieldElement );
      }

      var showAllElement = $s(inventoryListContainerId  + '_showAllButton');
      if(showAllElement)
      {
        Event.observe( showAllElement, "click", inventoryList.onShowallButtonClick.bindAsEventListener( this, pageResultsMaxSize, totalResultsCount ) );
        listenerElements.push(showAllElement);
      }

      inventoryList.listenerElements.set(inventoryListContainerId,listenerElements);

  }

};
/**
 * "all" cached js objects for "anything" inside the list area that is being replaced needs to be cleaned up.
 *  At early design time we knew of one concrete example (any hiddenDivs associated with context menus inside the inventory list)
 *  but we need exhaustive in-depth code tracing/review to make sure that we clean up everything else.
 *  TODO :comment for 'future js cleanup to be added when required'
 *  This method is called during an ajax reload before replacing the innerhtml of the list.
 */
inventoryList.cleanUp = function(id){
  var listeners = inventoryList.listenerElements.get(id);
  if(listeners) {
  listeners.each(function(ele) {
    if( $s(ele) )
    {
     $(ele).stopObserving( 'click' );
    }
  });
  inventoryList.listenerElements.unset(id);
  }
  var cleanUpFunction = inventoryList.cleanUpListeners.get(id);
  if(cleanUpFunction){
    cleanUpFunction.apply();
  inventoryList.cleanUpListeners.unset(id);
  }
  list.checkboxes.unset(id);
  list.radioButtons.unset(id);
};
/**
 * This method calculates the ajax post request url
 */
inventoryList.getListUrl = function(event,id, retainSortingAndPaging)
{
  var listUrl = null;
  var params = null;
  var url;
  if(event)
  {
    // paging and sorting ajax refresh
    var eventElement = Event.element( event );
    var hrefElement = eventElement.up('a') || eventElement;
    url = hrefElement.href ;
    hrefElement.href = "#";
    if( !url )
    { // return if there is no url to work with
      return url;
    }
    params = url.toQueryParams();
  }
  else
  {
    // active filter ajax refresh
    url = inventoryList.listUrls.get( id );
    if( !url )
    { // return if there is no url to work with
      return url;
    }
    params = url.toQueryParams();
    // using $H(params).unset('key') did not seem to work for me. Hence using the old-style
    if (!retainSortingAndPaging)
    {
      delete params[page.bundle.getString("numResults")];// reset the paging results to default or the one in session
      delete params[page.bundle.getString("startIndex")];// reset the paging index to 0
      delete params[page.bundle.getString("sortDir")];// reset the sorting sequence
    }
  }
  // make sure to remove any lingering sc in request, even though the InventoryListHelper removes
  // this param from list and sort url
  delete params[page.bundle.getString("search.criterion")];
  listUrl = url.split("?")[0] + "?" + $H( params ).toQueryString();
  return listUrl;
};
/**
 *  This method does a ajax post request for all the onclick handlers registered
 *  to render the inventory list in ajax-mode. This included list paging, list column
 *  sorting and  active search filter triggers
 */
inventoryList.ajaxPostOnClick = function(event, id, extraParams, retainSortingAndPaging)
{
    var container = $s(id);
    inventoryList.cleanUp(id);
    var listUrl = inventoryList.getListUrl(event,id,retainSortingAndPaging);
    if(listUrl)
    {
        listUrl = listUrl +  "&" + page.bundle.getString("ajax.mode") + "=" + id ;

        if ( typeof activeFilter != 'undefined' && activeFilter )
        {
          var searchCriterion = activeFilter.getSearchCriteriaInstance(false).getSearchCriteriaAsXml();
          if( searchCriterion && searchCriterion != '') // if empty , do not append.
          {
            listUrl = listUrl + "&"+ page.bundle.getString("search.criterion") +"=" + encodeURIComponent(searchCriterion) ;
          }
        }
        var params = listUrl.toQueryParams();
        if (extraParams)
        {
          for (var key in extraParams)
          {
            if ( extraParams.hasOwnProperty( key ) )
            {
              var val = extraParams[key];
              if ( typeof val != "function" )
              {
                params[key] = val;
              }
            }
          }
        }
        listUrl = listUrl.split("?")[0];

        new Ajax.Request(listUrl,
        {
            method: 'post',
            parameters: params,
            onCreate: function(response) {
              var ajaxRequestCounter = inventoryList.ajaxRequestIds.get(id);
              if ( !ajaxRequestCounter )
              {
                ajaxRequestCounter = 1;
              }
              else
              {
                ajaxRequestCounter++;
              }
              response.request.submittedCounter = ajaxRequestCounter;
              inventoryList.ajaxRequestIds.set(id,ajaxRequestCounter);
              document.body.style.cursor = 'progress';
              $('loadList'+id ).show();
            },
            onComplete: function(response) {
              var ajaxRequestCounter = inventoryList.ajaxRequestIds.get(id);
              inventoryList.removeNotAllShownMsgIfExists();
              if (ajaxRequestCounter == response.request.submittedCounter)
              {
                document.body.style.cursor = 'default';
                $('loadList'+id ).hide();
              }
            },
            onSuccess: function(transport, json) {
            try
             {
                 var ajaxRequestCounter = inventoryList.ajaxRequestIds.get(id);
                 if (ajaxRequestCounter == transport.request.submittedCounter)
                 {
                   // before refreshing the container, close all the context menu pop-ups that can be closed
                   page.ContextMenu.closeAllContextMenus();
                   var textString = inventoryList.LIST_AJAX_MODE_SUFFIX_MARQUEE_TEXT;
                   var startString = inventoryList.LIST_AJAX_MODE_START_MARQUEE_TEXT + id+ textString;
                   var endString = inventoryList.LIST_AJAX_MODE_END_MARQUEE_TEXT + id+ textString;
                   var resultHtml = transport.responseText;
                   var responseHtml = resultHtml.split(startString)[1].split(endString)[0];
                   container.innerHTML =  responseHtml;
                   // evaluate the inventory list related js on ajax refresh to re-initialize the event listeners for the list controls
                   page.globalEvalScripts( responseHtml, false );
                 }
             }
             catch ( e )
             {
               // exception message looks ugly for the end-user, hence use a more user-friendly message to indicate the ajax refresh failed
                new page.InlineConfirmation("error", page.bundle.getString("list.inventory.ajax.mode.error"), false );
             }
         }.bind(this)
      });
    }
    else
    {
      // debug message
      new page.InlineConfirmation("error", page.bundle.getString("list.inventory.ajax.mode.list.url.error",listUrl), false );
    }
    if ( event )
    {
      Event.stop( event );
    }
};

inventoryList.onShowallButtonClick = function( event, pageResultsMaxSize, totalResultsCount )
{

  if( pageResultsMaxSize != -1 && totalResultsCount > pageResultsMaxSize )
  {
      alert( page.bundle.getString( 'inventoryList.error.max.items.per.page.showall', [ pageResultsMaxSize ] ) );
      Event.stop( event );
      return;
  }
};

inventoryList.onPageFieldEnter = function( event, id, inputName, goButtonName, paramName, initValue, ajaxMode, pageResultsMaxSize )
{
  var key = event.keyCode || event.which;
  if ( key == Event.KEY_RETURN )
  {
    inventoryList.onGoButtonClick(  event, id, inputName, goButtonName, paramName, initValue, ajaxMode, pageResultsMaxSize );
    if ( event && !ajaxMode )
    {
      Event.stop( event );
    }
  }
};

/**
 * validates the go-page index before firing the ajax post for paging (in ajax mode only)
 * else a server request is generated
 */
inventoryList.onGoButtonClick = function( event, id, inputName, goButtonName, paramName, initValue, ajaxMode, pageResultsMaxSize )
{
  var eventElement = Event.element( event );
  var goButtonElement = $s( id + "_" + goButtonName );
  var inputElem = $s( id + "_" + inputName );
  var inputValue = inputElem.value;
  var trimmedVal = inputValue.trim();
  // added this check bcoz for numeric fields which are not required, this function was not working
  if ( trimmedVal != "" )
  {
    var numVal = parseInt( trimmedVal, 10 );
    if ( !isNaN( numVal ) )
    {
      if ( pageResultsMaxSize != -1 && numVal > pageResultsMaxSize )
      {
        alert( page.bundle.getString( 'inventoryList.error.max.items.per.page', [ pageResultsMaxSize ] ) );
        inputElem.value = initValue;
        Event.stop( event );
        return;
      }

      var url = goButtonElement.href + "&" + paramName + "=" + numVal;

      eventElement.href = url;
      if ( ajaxMode )
      {
        // make an ajax request
        inventoryList.ajaxPostOnClick( event, id );
      }
      else
      {
        window.location.href = url;
        Event.stop( event );
      }
    }
    else
    {
      inputElem.value = initValue;
      Event.stop( event );
    }
  }
  else
  {
    if ( inputValue.length > 0 )
    {
      alert( JS_RESOURCES.getFormattedString( 'validation.number', [ trimmedVal ] ) );
    }
    Event.stop( event );
  }
};

inventoryList.displayNotAllShownMessage = function(listId)
{
  var msg = page.bundle.getString('listOptions.warn.not.all.shown');
  new page.NestedInlineConfirmation("bad", msg, false, $s(listId), true, undefined, undefined, false, false, undefined, undefined, false, "receipt_page_size" );
};

/**
 * If we've clicked on Show All and too many results existed, we show a bad warning label to the user that not all rows are listed
 * if we refresh the paging, we need to remove that msg and this is the method to do it.
 */
inventoryList.removeNotAllShownMsgIfExists = function()
{
  var receiptDiv = $( "receipt_page_size" );
  if( receiptDiv )
  {
  receiptDiv.remove();
  }
};

/**
 * This function allows a page to "refresh" the inventory list on demand, such as when a user
 * clicks a Search button. This is useful if the inventory list is in a frame and is connected
 * to a drawer and we can't use useWindowName for the drawer. Besides, it's Ajaxy.
 */
inventoryList.refresh = function( params )
{
  inventoryList.ajaxPostOnClick( null, 'listContainer', params, false );
};


inventoryList.CardController = Class.create();
inventoryList.CardController.prototype =
{
    initialize: function( inventoryListContainer, checkboxName, areCheckboxesUsable )
    {
      this.containerId = inventoryListContainer;
      this.checkboxName = checkboxName;
      this.areCheckboxesUsable = areCheckboxesUsable;
      $$('#' + this.containerId +' .block' ).each(function(ele) {
        if( $s(ele) )
        {
          var hoverElements = ele.getElementsByClassName('inventoryListCardHoverText');
          if (hoverElements && hoverElements.length > 0)
          {
            var hoverElement = hoverElements[0];
            var hoverText = hoverElement.innerHTML;
            hoverText = hoverText.trim();
            if (hoverText.length > 0)
            {
              ele.title = hoverText;
            }
          }
          var ckboxes = ele.getElementsBySelector("input[name="+this.checkboxName+"]");
          if (ckboxes && ckboxes.length > 0)
          {
            ele.myCheckbox = ckboxes[0];
            var eleToToggleCheckbox = ele;
            if (this.areCheckboxesUsable)
            {
              var theMenu = ele.getElementsByClassName('inlineMenuItems');
              if (theMenu && theMenu.length > 0)
              {
                eleToToggleCheckbox = theMenu[0];
              }
            }
            Event.observe(  eleToToggleCheckbox, "click", this.handleCellClick.bindAsEventListener( this, ele.myCheckbox ) );
          }

        }
      }.bind(this));

      $$('#' + this.containerId +' .sortOrderMenu').each(function(ele) {
        if ($s(ele))
        {
          Event.observe(ele, "click", this.handleSortOrderMenuClick.bindAsEventListener(this, ele));
        }
      }.bind(this));

      $$('#' + this.containerId +' .sortColumnMenu').each(function(ele) {
        if ($s(ele))
        {
          Event.observe(ele, "click", this.handleSortColumnMenuClick.bindAsEventListener(this, ele));
        }
      }.bind(this));

    },

    handleSortOrderMenuClick: function( event, link )
    {
      var menu = $(this.containerId + '_sortOrderMenu');
      var otherMenu = $(this.containerId + '_sortColumnsMenu');
      this.toggleMenu(menu, otherMenu, link);
    },

    handleSortColumnMenuClick: function( event, link )
    {
      var menu = $(this.containerId + '_sortColumnsMenu');
      var otherMenu = $(this.containerId + '_sortOrderMenu');
      this.toggleMenu(menu, otherMenu, link);
    },

    toggleMenu: function(menu, otherMenu, link)
    {
      if (menu && otherMenu && link)
      {
        otherMenu.hide();
        this.positionRelativeToLink(menu, link);
        menu.toggle();
      }
    },

    positionRelativeToLink: function(ele, link)
    {
      var dims = link.getDimensions();
      var leftOffset = "-" + dims.width + "px";
      var topOffset = (dims.height) + "px";
      ele.setStyle({ left: leftOffset, top: topOffset, 'margin-right': leftOffset, position: 'relative' });

      var eleWidth = ele.getWidth();

      var absLeft = link.parentElement.offsetLeft;
      var parentWidth = link.parentElement.getWidth();
      if ( eleWidth > parentWidth )
      {
        absLeft = absLeft - (eleWidth - parentWidth);
      }
      if (absLeft < 0)
      {
        absLeft = 0;
      }
      var absTop = link.offsetTop + dims.height;
      ele.setStyle( { left: absLeft + "px", top: absTop + "px", 'margin-right': 'auto', position: 'absolute'});
    },

    handleCellClick: function( event, ckbox )
    {
      // In card view you can only ever have one cell checked at a time.
      $$('#' + this.containerId + ' input[name='+this.checkboxName+']').each(function (ck) {
        ck.checked = false;
      });
      ckbox.checked = true;
    }
};
 /************************************inventory List PagingController***********************************************************************************/
inventoryList.PagingController = Class.create();
inventoryList.PagingController.prototype =
{
    initialize: function( inventoryListContainer, initPagingValue, initPageIndex, inAjax, limitMaxNumOfItems, pageResultsMaxSize, totalResultsCount )
    {
      this.containerId = inventoryListContainer;
      this.initPagingValue = initPagingValue;
      this.initPageIndex = initPageIndex;

      if(!limitMaxNumOfItems)
      {
        pageResultsMaxSize = -1;
      }

        if( $s( this.containerId  + '_openpaging') ) { Event.observe(  this.containerId + '_openpaging', "click", this.onOpenPagingClick.bindAsEventListener( this ) ); }
        if( $s( this.containerId  + '_closepaging') ) { Event.observe(  this.containerId + '_closepaging', "click", this.onClosePagingButtonClick.bindAsEventListener( this ) ); }

        if( $s( this.containerId  + '_currentpage_top') ) { Event.observe(  this.containerId + '_currentpage_top', "click", this.showJumpPage.bindAsEventListener( this, 'top' ) ); }
        if( $s( this.containerId  +'_closejump_top') )  { Event.observe(  this.containerId + '_closejump_top', "click", this.hideJumpPage.bindAsEventListener( this, 'top' ) ); }

        if( $s( this.containerId  + '_currentpage_bot') ) { Event.observe(  this.containerId + '_currentpage_bot', "click", this.showJumpPage.bindAsEventListener( this, 'bot' ) ); }
        if( $s( this.containerId  + '_closejump_bot') ) { Event.observe(  this.containerId + '_closejump_bot', "click", this.hideJumpPage.bindAsEventListener( this, 'bot' ) ); }

        if(!inAjax )// register only once in ajax Mode.
        {
          if( $s( this.containerId  + '_numResults') ) { Event.observe(  this.containerId + '_numResults', "keypress", inventoryList.onPageFieldEnter.bindAsEventListener( this,this.containerId,'numResults', 'gopaging', 'numResults', this.initPagingValue, inAjax, pageResultsMaxSize ) ); }
          if( $s( this.containerId  + '_gopaging') ) { Event.observe(  this.containerId + '_gopaging', "click", inventoryList.onGoButtonClick.bindAsEventListener( this,this.containerId,'numResults', 'gopaging', 'numResults', this.initPagingValue, inAjax, pageResultsMaxSize ) ); }
          if( $s( this.containerId  + '_gobut_top') ) { Event.observe(  this.containerId + '_gobut_top', "click", inventoryList.onGoButtonClick.bindAsEventListener( this, this.containerId, 'jump_top', 'gobut_top', 'pageIndex', this.initPageIndex, inAjax, pageResultsMaxSize ) ); }
          if( $s( this.containerId  + '_gobut_bot') ) { Event.observe( this.containerId + '_gobut_bot', "click", inventoryList.onGoButtonClick.bindAsEventListener( this, this.containerId, 'jump_bot', 'gobut_bot', 'pageIndex', this.initPageIndex, inAjax, pageResultsMaxSize ) ); }
          if( $s( this.containerId  + '_jump_bot') ) { Event.observe( this.containerId + '_jump_bot', "keyup", inventoryList.onPageFieldEnter.bindAsEventListener( this, this.containerId, 'jump_bot', 'gobut_bot', 'pageIndex', this.initPageIndex, inAjax, pageResultsMaxSize ) ); }
          if( $s( this.containerId  + '_jump_top') ) { Event.observe( this.containerId + '_jump_top', "keyup", inventoryList.onPageFieldEnter.bindAsEventListener( this, this.containerId, 'jump_top', 'gobut_top', 'pageIndex', this.initPageIndex, inAjax, pageResultsMaxSize ) ); }
          if( $s( this.containerId  + '_showAllButton') ) { Event.observe( this.containerId + '_showAllButton', "click", inventoryList.onShowallButtonClick.bindAsEventListener( this, pageResultsMaxSize, totalResultsCount ) ); }
        }

        // Remove the jump to page from the DOM until needed
        var topJumpToPageEle = $(this.containerId + '_jumptopage_top');
        var bottomJumpToPageEle = $(this.containerId + '_jumptopage_bot');
        this.jumpToPage = {
         top: topJumpToPageEle ? topJumpToPageEle.show().remove() : null,
         bot: bottomJumpToPageEle ? bottomJumpToPageEle.show().remove() : null
        };

      },

    onOpenPagingClick: function( event )
    {
        $( this.containerId  + '_editpaging').show();
        $( this.containerId  + '_itemcount').hide();
        $(this.containerId  + '_numResults').focus();
        Event.stop( event );
    },


    onClosePagingButtonClick: function( event )
    {
      $(this.containerId + '_numResults').value = this.initPagingValue;
      $(this.containerId + '_editpaging').hide();
      $(this.containerId +'_itemcount').show();
      Event.stop( event );
    },

    showJumpPage: function( event, loc )
    {
      var navPaging = $(this.containerId + '_navpaging_'+loc);
      var jumpToPage = this.jumpToPage[ loc ];
      var container = navPaging.up();
      container.addClassName('jumptopage');
      container.appendChild( jumpToPage );
      navPaging.hide();
      (function() { $(this.containerId +'_jump_'+loc).focus(); }.bind(this).delay(0.1));
      Event.stop( event );
    },

    hideJumpPage: function( event, loc )
    {
      var navPaging = $(this.containerId + '_navpaging_'+loc);
      var jumpToPage = this.jumpToPage[ loc ];
      navPaging.up().removeClassName('jumptopage');
      navPaging.show();
      jumpToPage.remove();
      Event.stop( event );
    }
};

list.checkboxes = $H();
list.radioButtons = $H();
/**********************************************  List ActionBarController***********************************/

/**
 * Controls checkboxes on an list
 */
list.ActionBarController = Class.create();
list.ActionBarController.prototype =
{
    initialize: function( listContainer, id, minSelected, onClick, errorMsg )
    {
        this.containerId = listContainer;
        var titleElem = $s(listContainer + "_link_" + id);
        if( titleElem )
        {
          Event.observe( titleElem, "click", this.onActionItemClick.bindAsEventListener( this, minSelected, onClick, errorMsg ) );
        }
    },

    onActionItemClick: function( event, minSelected, onClick, errorMsg )
    {
      var thisCheckBoxes =  list.checkboxes.get(this.containerId);
      var thisRadioButtons =  list.radioButtons.get(this.containerId);
      var numSelected, i;
      if( thisCheckBoxes.length !== 0 )
      {
        numSelected = 0;
        for ( i = 0; i < thisCheckBoxes.length; i++ )
        {
          if ( thisCheckBoxes[i].type == 'checkbox' && thisCheckBoxes[i].checked )
          {
            numSelected++;
          }
        }
        if( numSelected >= minSelected )
        {
          if ( onClick !== undefined && ( onClick != "null" ) )
          {
            this.executeOnClick( event, onClick );
          }
        }
        else
        {
          alert( errorMsg );
          Event.stop( event );
        }
      }
      else if( thisRadioButtons.length !== 0 )
      {
        // if radios are on the page instead of checkboxes, then there must be 1 and only 1 item selected to perform an action
        numSelected = 0;
        for ( i = 0; i < thisRadioButtons.length; i++ )
        {
           if ( thisRadioButtons[i].type == 'radio' && thisRadioButtons[i].checked )
           {
                numSelected++;
                break;
           }
        }
        if( numSelected === 0 )
        {
            alert( errorMsg );
            Event.stop( event );
        }
      }
      // Case when checkboxes/radios does not exist, but request needs to be submitted.
      // See InventoryListHelper.filterListActionBarRenderer where list action item is
      // shown even when there are no items in the list with a checkbox/radio.
      else if ( minSelected === 0 )
      {
        this.executeOnClick( event, onClick );
      }
    },

    executeOnClick: function( event, onClick )
    {
      var func = new Function( onClick );
      var result = func();
      if( result === false )
      {
        Event.stop( event );
      }
    }
};


/************************************ List CheckboxRadioContainer***********************************************************************************/

list.checkboxAndRadio = {};
list.checkboxAndRadio.CheckboxRadioContainer = Class.create();
list.checkboxAndRadio.CheckboxRadioContainer.prototype =
{

  initialize: function( container )
  {
    this.isCardContainer = false;
    this.isTableContainer = false;
    this.container = container;
    if (this.container.getElementsByTagName("tbody")[0])
    {
      this.isTableContainer = true;
    }
    else if (this.container.getElementsByClassName('inventoryListCardView')[0])
    {
      this.isCardContainer = true;
    }
  },

  getCheckboxOrRadioContainer: function()
  {
    if (this.isTableContainer)
    {
      return this.container.getElementsByTagName("tbody")[0];
    }
    else
    {
      return $("itemList");
    }
  },

  getCheckboxOrRadioBoundaryTag: function()
  {
    if (this.isTableContainer)
    {
      return "tr";
    }
    else if (this.isCardContainer)
    {
      return "div";
    }
    else
    {
      return "li";
    }
  },

  getItemCellTag: function()
  {
    if (this.isTableContainer)
    {
      return "td";
    }
    else if (this.isCardContainer)
    {
      return "div"
    }
    else
    {
      return "li";
    }
  },

 getItemCellClassTag: function()
  {
    if (this.isTableContainer || this.isCardContainer)
    {
      return "smallCell";
    }
    else
    {
      return "simple_mode";
    }
  }
};


/************************************ List CheckboxRadioController***********************************************************************************/


list.CheckboxRadioController = Class.create();
list.CheckboxRadioController.prototype =
{
    initialize: function( listContainer, hasSelectAll, isSelectAllFromList, listener )
    {
        this.containerId = listContainer;
        this.container = $s(listContainer);
        this.checkBoxAndRadioContainer = new list.checkboxAndRadio.CheckboxRadioContainer(this.container);
        this.highColor = '';
        this.emptyColor = '';
        this.isSelectAllFromList = isSelectAllFromList;

        var tableHeads = this.container.getElementsByClassName("inventoryListHead");
         if( tableHeads.length > 0 )
         {
            this.selectAllCheckbox = tableHeads[0].getElementsByTagName("input")[0];
            this.selectAllLabel = $s(this.containerId +"_selectAllLabel");
            this.optionsWhileSelectAll = $s(this.containerId +"_optionsWhileSelectAll");

            if( this.selectAllCheckbox )
            {
              if( this.selectAllCheckbox.checked )
              {
                this.selectAllLabel.innerHTML = JS_RESOURCES.getString('list.uncheckToDeselectAllItems');
              }
              else
              {
                this.selectAllLabel.innerHTML = JS_RESOURCES.getString('list.checkToSelectAllItems');
              }
            }
          }
          var myTempElement = $(this.containerId);
          if( myTempElement )
          {
            myTempElement.addClassName( "high" );
            this.highColor = myTempElement.getStyle('backgroundColor');
            myTempElement.removeClassName( "high" );
          }

          var checkBoxOrRadioContainer = this.checkBoxAndRadioContainer.getCheckboxOrRadioContainer();
          if ( checkBoxOrRadioContainer )
          {
            Event.observe( checkBoxOrRadioContainer, "mouseover", this.onRowOver.bindAsEventListener( this ) );
            Event.observe( checkBoxOrRadioContainer, "mouseout", this.onRowOut.bindAsEventListener( this ) );
          }

          // for shopping cart/ drawer integration
          this.initializeStatusMsgArray();
          this.initializeRemoveStatusMsgArray();
          inventoryList.initCheckboxesAndRadioButtons(this.containerId, this.checkBoxAndRadioContainer);

           var thisListcheckboxes = list.checkboxes.get(this.containerId);
           var thisListradioButtons = list.radioButtons.get(this.containerId);

            if( (thisListcheckboxes  && thisListcheckboxes.length !== 0) || ( thisListradioButtons && thisListradioButtons.length !== 0) )
            {
              if( thisListcheckboxes.length !== 0 )
              {
                if ( this.selectAllCheckbox )
                {
                  Element.show( this.selectAllCheckbox );
                }
                if ( this.selectAllLabel )
                {
                  Element.show( this.selectAllLabel );
                }
                if ( this.selectAllCheckbox )
                {
                  Event.observe( this.selectAllCheckbox, "click", this.onSelectAllClick.bindAsEventListener( this ) );
                }
              }

              if (checkBoxOrRadioContainer)
              {
                Event.observe( checkBoxOrRadioContainer, "click", this.onCheckboxRadioOrRowClick.bindAsEventListener( this ) );
              }
           }
           else
           {
                if (this.selectAllCheckbox )
                {
                  Element.hide( this.selectAllCheckbox );
                }
                if (this.selectAllLabel )
                {
                  Element.hide( this.selectAllLabel );
                }
           }
           this.listener = listener;
           if ( this.optionsWhileSelectAll )
           {
             if (hasSelectAll)
             {
               this.selectAllCheckbox.checked = true;
               this.onSelectAllClick();
               if (isSelectAllFromList)
               {
                 this.disableSelectAllCheckbox();
                 document.getElementById(this.containerId + "_selectAllFromList" ).value = "true";
               }
             }
             else
             {
               this.optionsWhileSelectAll.style.display="none";
             }
           }
    },

    onSelectAllClick: function( event )
    {
      if ( this.optionsWhileSelectAll )
      {
        if(this.selectAllCheckbox.checked)
        {
          var checkboxes = list.checkboxes.get(this.containerId);
          var currentItemNumber = $( 'selectCurrentItemNumber' );
          if ( currentItemNumber )
          {
             currentItemNumber.innerHTML = checkboxes.length;
          }
          this.optionsWhileSelectAll.style.display="";
        }
        else
        {
          this.optionsWhileSelectAll.style.display="none";
        }
      }
      this.toggleSelectAllCheckbox();
      if(this.listener) {
        if (this.selectAllCheckbox.checked)
        {
          this.showStatusMessage(this.selectAllCheckbox, true);
        } else {
          this.showRemoveStatusMessage(this.selectAllCheckbox, true);
        }
      }
    },

    initializeStatusMsgArray: function()
    {
      this.currentStatusMsgindex = -1;
      this.statusMsgArray = [];
      this.statusMsgArray[0] = {elem:$('status_msg0')};
      this.statusMsgArray[1] = {elem:$('status_msg1')};
      this.statusMsgArray[2] = {elem:$('status_msg2')};
      this.statusMsgArray[3] = {elem:$('status_msg3')};
      this.addAllStatusMsg = {elem:$('status_msg_addAll')};
    },

    initializeRemoveStatusMsgArray: function()
    {
      this.currentRemoveStatusMsgindex = -1;
      this.removeStatusMsgArray = [];
      this.removeStatusMsgArray[0] = {elem:$('status_remove_msg0')};
      this.removeStatusMsgArray[1] = {elem:$('status_remove_msg1')};
      this.removeStatusMsgArray[2] = {elem:$('status_remove_msg2')};
      this.removeStatusMsgArray[3] = {elem:$('status_remove_msg3')};
      this.removeAllStatusMsg = {elem:$('status_msg_removeAll')};
    },

    findAvailableStatusMsg: function(selectAll)
    {
      if(selectAll)
      {
        return this.addAllStatusMsg;
      }
      if(this.currentStatusMsgindex >= 3)
      {
        this.currentStatusMsgindex = -1;
      }
      this.currentStatusMsgindex = this.currentStatusMsgindex + 1;
      return this.statusMsgArray[this.currentStatusMsgindex];

    },

    findAvailableRemoveStatusMsg: function(removeAll)
    {
      if(removeAll)
      {
        return this.removeAllStatusMsg;
      }
      if(this.currentRemoveStatusMsgindex >= 3)
      {
        this.currentRemoveStatusMsgindex = -1;
      }
      this.currentRemoveStatusMsgindex = this.currentRemoveStatusMsgindex + 1;
      return this.removeStatusMsgArray[this.currentRemoveStatusMsgindex];

    },

    showStatusMessage: function( checkbox, selectAll )
    {
      var availableMsg = this.findAvailableStatusMsg(selectAll);
      // Note : position cloning doesn't work in IE if the element has style 'display:none'
      availableMsg.elem.addClassName( 'hideoff' );
      availableMsg.elem.setStyle({display : 'block'});
      Position.clone(checkbox,availableMsg.elem,{ setLeft: true, setTop: true, setWidth: false, setHeight: false } );
      if ( page.util.isRTL() ) {
        availableMsg.elem.style.left = parseFloat(availableMsg.elem.style.left)-availableMsg.elem.getWidth() + "px";
      }
      availableMsg.elem.removeClassName( 'hideoff' );
      setTimeout(function(){this.fadeEffect(availableMsg);}.bind(this),100);
    },

    showRemoveStatusMessage: function( checkbox, removeAll )
    {
      var availableMsg = this.findAvailableRemoveStatusMsg(removeAll);
      // Note : position cloning doesn't work in IE if the element has style 'display:none'
      availableMsg.elem.addClassName( 'hideoff' );
      availableMsg.elem.setStyle({display : 'block'});
      Position.clone(checkbox,availableMsg.elem,{ setLeft: true, setTop: true, setWidth: false, setHeight: false } );
      if ( page.util.isRTL() ) {
        availableMsg.elem.style.left = parseFloat(availableMsg.elem.style.left)-availableMsg.elem.getWidth() + "px";
      }
      availableMsg.elem.removeClassName( 'hideoff' );
      setTimeout(function(){this.fadeEffect(availableMsg);}.bind(this),100);
    },

    fadeEffect: function(statusMsgVar)
    {
      statusMsgVar.elem.fade();
    },

    onCheckboxRadioOrRowClick: function( event )
    {
        var eventElement = event ? Event.element( event ) : null;
        if( !eventElement )
        {
          return;
        }
        var tagName = eventElement.tagName.toLowerCase();
        var row = eventElement;
        var fromNonSelectClick = false;
        var fromContextMenuClick = false;
        var checkboxOrRadioBoundaryTag = this.checkBoxAndRadioContainer.getCheckboxOrRadioBoundaryTag();
        while ( row && row.tagName.toLowerCase() != checkboxOrRadioBoundaryTag )
        {
          if ( page.util.hasClassName( row, 'nonSelectContainer' ) || this.isSelectAllFromList )
          {
            fromNonSelectClick = true;
          }
          if ( page.util.hasClassName( row, 'contextMenuContainer' ) )
          {
            fromContextMenuClick = true;
          }
          row = row.parentNode;
          if (row && row.tagName.toLowerCase() == 'body' )
          {
            row = null;
          }
        }
        if ( row && !fromNonSelectClick )
        {
          // Deselect all except the current row if this was a context menu click.
          if ( fromContextMenuClick )
          {
              var currentRowCheckBox = row.down("input[type=\"checkbox\"]");
              var currentRowRadioButton = row.down("input[type=\"radio\"]");

              if ( currentRowCheckBox )
              {
                list.checkboxes.get(this.containerId).each( function( checkbox )
                {
                  var row1 = checkbox.parentNode.parentNode;
                  if ( checkbox == currentRowCheckBox )
                  {
                    checkbox.checked = true;
                    if ( row1 && row1.tagName.toLowerCase() == checkboxOrRadioBoundaryTag && this.checkBoxAndRadioContainer.isTableContainer )
                    {
                      row1.style.backgroundColor = this.highColor;
                    }
                  }
                  else
                  {
                    checkbox.checked = false;
                    if ( row1 && row1.tagName.toLowerCase() == checkboxOrRadioBoundaryTag && this.checkBoxAndRadioContainer.isTableContainer )
                    {
                      row1.style.backgroundColor = this.emptyColor;
                    }
                  }
                }.bind( this ) );

               if ( this.selectAllCheckbox )
               {
                 if ( list.checkboxes.get(this.containerId).length == 1 )
                 {
                   this.selectAllCheckbox.checked = true;
                   this.selectAllLabel.innerHTML = JS_RESOURCES.getString('list.uncheckToDeselectAllItems');
                 }
                 else
                 {
                   this.selectAllCheckbox.checked = false;
                   this.selectAllLabel.innerHTML = JS_RESOURCES.getString('list.checkToSelectAllItems');
                 }
               }
             }
             else if ( currentRowRadioButton )
             {
               currentRowRadioButton.checked = true;
               this.resetRadioRowBackgroundColors( currentRowRadioButton );
             }
          }
          // Just toggle the row
          else if ( this.checkBoxAndRadioContainer.isTableContainer || tagName == 'input' )
          {
            var isOnCheckboxRadio = ( tagName == 'input' && eventElement.checked !== undefined );
            // if we're clicking a link, do not check the checkbox assuming we're navigating away
            // or meant to trigger some other actions rather than selecting an item
            // this assumption may not be bullet proof but should be reasonable enough and
            // the change prevents CS folders from accidentally being added to drawer or a file
            // being added when users just wanted to view it
            var needToToggleCheckboxRadio = !isOnCheckboxRadio && ( tagName != 'a' );

            var checkbox = (isOnCheckboxRadio) ? eventElement : row.down("input[type=\"checkbox\"]");
            var radioButton = (isOnCheckboxRadio) ? eventElement : row.down("input[type=\"radio\"]");
            var checkElement;
            if ( checkbox )
            {
              checkElement = checkbox;
            }
            else if( radioButton )
            {
              checkElement = radioButton;
            }
            if ( checkElement && !checkElement.hasClassName( 'togglingDisabled' ) )
            {
              this.toggleNormalCheckboxRadio( checkElement, needToToggleCheckboxRadio, row );
              if ( radioButton )
              {
                // Reset the row background colors as only one radio button can be selected
                // at any given time.
                this.resetRadioRowBackgroundColors( radioButton );
              }
              if ( this.listener && ( needToToggleCheckboxRadio || isOnCheckboxRadio ) ) {
                var checkElementName = checkElement.name;
                if (checkElement.checked) {
                  this.showStatusMessage(checkElement, false);
                } else {
                  this.showRemoveStatusMessage(checkElement, false);
                }
              }
            }
          }
        }
    },

    resetRadioRowBackgroundColors: function( currentRadio )
    {
      var checkboxOrRadioBoundaryTag = this.checkBoxAndRadioContainer.getCheckboxOrRadioBoundaryTag();
      var isTableContainer = this.checkBoxAndRadioContainer.isTableContainer;
      // Reset the background color of all radio rows.
      list.radioButtons.get(this.containerId).each( function( radio )
      {
        var row1 = radio.parentNode.parentNode;
        if ( row1 && row1.tagName.toLowerCase() == checkboxOrRadioBoundaryTag && isTableContainer )
        {
          row1.style.backgroundColor = (radio === currentRadio) ? this.highColor : this.emptyColor;
        }
      }.bind( this ) );
    },

    onRowOver: function( event )
    {
        var row = Event.element( event );
        while ( row && row.tagName.toLowerCase() != 'tr' )
        {
          row = row.parentNode;
          if ( row.tagName.toLowerCase() == 'body' )
          {
            row = null;
          }
        }
        if ( row )
        {
          Element.addClassName( row, 'gray' );
        }
    },

    onRowOut: function( event )
    {
        var row = Event.element( event );
        while ( row && row.tagName.toLowerCase() != 'tr' )
        {
          row = row.parentNode;
          if ( row.tagName.toLowerCase() == 'body' )
          {
            row = null;
          }
        }
        if ( row )
        {
          Element.removeClassName( row, 'gray' );
        }
    },

    rowChangeClass : function(checkbox,row)
    {
      if ( row )
      {
        if ( checkbox.checked )
        {
          row.style.backgroundColor = this.highColor;
        }
        else
        {
          row.style.backgroundColor = this.emptyColor;
        }
      }

    },

    toggleNormalCheckboxRadio: function( checkboxRadio, needToToggleCheckboxRadio, row, noEventPropagation )
    {
        if ( needToToggleCheckboxRadio )
        {
            checkboxRadio.checked = !checkboxRadio.checked;
        }

        if ( row )
        {
          if ( checkboxRadio.checked )
          {
            row.style.backgroundColor = this.highColor;
          }
          else
          {
            row.style.backgroundColor = this.emptyColor;
          }
        }

        // only applies to shopping cart - removing item from shopping cart
        if( needToToggleCheckboxRadio && row && !checkboxRadio.checked && this.listener && noEventPropagation  )
        {
          this.showRemoveStatusMessage(checkboxRadio, false);
        }

        if( this.selectAllCheckbox )
        {
          var allSelected = true;
          var thisCheckBoxes = list.checkboxes.get(this.containerId);
          for ( var i = 0; i < thisCheckBoxes.length; i++ )
          {
             if ( !thisCheckBoxes[i].checked )
             {
               allSelected = false;
               break;
             }
          }

          if ( allSelected )
          {
              var currentItemNumber = $( 'selectCurrentItemNumber' );
              if ( currentItemNumber )
              {
                currentItemNumber.innerHTML = thisCheckBoxes.length;
              }
              this.selectAllCheckbox.checked = true;
              if ( this.optionsWhileSelectAll )
              {
                this.optionsWhileSelectAll.style.display="";
              }
              this.selectAllLabel.innerHTML = JS_RESOURCES.getString('list.uncheckToDeselectAllItems');
          }
          else
          {
              this.selectAllCheckbox.checked = false;
              if ( this.optionsWhileSelectAll )
              {
                this.optionsWhileSelectAll.style.display="none";
              }
              this.selectAllLabel.innerHTML = JS_RESOURCES.getString('list.checkToSelectAllItems');
          }
        }
        if ( !noEventPropagation && this.listener )
        {
          this.listener( checkboxRadio );
        }
    },

    toggleSelectAllCheckbox: function()
    {
        // toggle all the checkboxes based on the current state of the checkbox
        if( this.selectAllCheckbox )
        {
          var checkboxes = list.checkboxes.get(this.containerId);
          for ( var i=0; i < checkboxes.length; ++i )
          {
            checkboxes[ i ].checked = this.selectAllCheckbox.checked;
            this.rowChangeClass(  checkboxes[i], Element.up(checkboxes[i],'tr'));
            if ( this.listener )
            {
              this.listener( checkboxes[ i ] );
            }
          }
          if ( this.selectAllCheckbox.checked )
          {
            this.selectAllLabel.innerHTML = JS_RESOURCES.getString('list.uncheckToDeselectAllItems');
          }
          else
          {
            this.selectAllLabel.innerHTML = JS_RESOURCES.getString('list.checkToSelectAllItems');
          }
        }
    },
    disableSelectAllCheckbox: function()
    {
        // toggle all the checkboxes based on the current state of the checkbox
        if( this.selectAllCheckbox )
        {
          this.selectAllCheckbox.disabled = true;
          var checkboxes = list.checkboxes.get(this.containerId);
          for ( var i=0; i < checkboxes.length; ++i )
          {
            checkboxes[ i ].disabled = true;

          }

        }
    }

};


/**********************************************  List global checkboxes / radiobuttons initialization***********************************/
inventoryList.initCheckboxesAndRadioButtons = function( id, checkboxAndRadioContainer )
{
    if( !id )
    {
      id = "listContainer";
    }
    var container = $s(id);

    var checkBoxAndRadioContainerTagName = 'td';
    var checkBoxAndRadioContainerClassName = 'smallCell';
    if ( checkboxAndRadioContainer )
    {
      checkBoxAndRadioContainerTagName = checkboxAndRadioContainer.getItemCellTag();
      checkBoxAndRadioContainerClassName =  checkboxAndRadioContainer.getItemCellClassTag();
    }

    var tds = container.getElementsByTagName(checkBoxAndRadioContainerTagName);
    var numTds = tds.length;
    var checkboxes = [];
    var radios = [];
    for ( var i = 0; i < numTds; i++ )
    {
      var td = tds[i];
      if ( page.util.hasClassName( td, checkBoxAndRadioContainerClassName ) )
      {
        list.populateCheckboxesAndRadioButtons(id,td,checkboxes,radios);
      }
    }

    // select all <input type="checkbox"> elements that are inside <td class="smallCell">
    list.checkboxes.set(id,checkboxes);
    // select all <input type="radio"> elements that are inside <td class="smallCell">
    list.radioButtons.set(id,radios);

};
/****************************************************** common methods shared by lists****************************************************/

/*
 * Used when page loading is complete to enable checkbox/radio elements that are initially rendered disabled
 *
 * @param checkboxRadioValue if provided only the elements that has a matching value will be enabled
 */
inventoryList.enableCheckboxesAndRadioButtons = function( id, checkboxRadioName, checkboxRadioValue )
{
  if( !id )
  {
    id = "listContainer";
  }
  var container = $s(id);

  var checkBoxes;
  if( checkboxRadioValue )
  {
    checkBoxes = container.select( 'input[value=' + checkboxRadioValue + ']' );
  }
  else
  {
    checkBoxes = container.select( 'input[name=' + checkboxRadioName + ']' );
  }

  for (var i=0, len=checkBoxes.length; i<len; i++)
  {
    if( !checkboxRadioValue || ( checkboxRadioValue && checkboxRadioName === checkBoxes[i].name ) )
    {
      checkBoxes[i].disabled = false;
    }
  }
};

list.populateCheckboxesAndRadioButtons = function(id,ele,checkboxes,radios)
{
  var inputs = ele.getElementsByTagName('input');
  var numInputs = inputs.length;
  for ( var j = 0; j < numInputs; j++ )
  {
    var input = inputs[j];
    if ( input.type.toLowerCase() == 'checkbox' )
    {
      checkboxes.push( input );
    }
    else if ( input.type.toLowerCase() == 'radio' )
    {
      radios.push( input );
    }
  }

};
/*************************************************************** generic list controls***********************************************************************/

genericList.CheckboxRadioController = Class.create();
genericList.CheckboxRadioController.prototype =
{
    initialize: function( listContainer, listener )
    {
      this.containerId = listContainer;
      this.container = $s(listContainer);
     // content/canvas item list
      if(  this.container )
      {
      this.selectAllCheckboxTop  = $s(this.containerId +"_selectAll_top");
      this.clearAllCheckboxTop  = $s(this.containerId +"_clearAll_top");
      this.selectAllCheckboxBot  = $s(this.containerId +"_selectAll_bot");
      this.clearAllCheckboxBot  = $s(this.containerId +"_clearAll_bot");

      genericList.initCheckboxesAndRadioButtons(this.containerId);

        // content List items
        if(this.selectAllCheckboxTop)
        {
           Event.observe( this.selectAllCheckboxTop, "click", this.selectAllCheckboxOnClick.bindAsEventListener( this ) );
        }
        if(this.selectAllCheckboxBot)
        {
           Event.observe( this.selectAllCheckboxBot, "click", this.selectAllCheckboxOnClick.bindAsEventListener( this ) );
        }
        if(this.clearAllCheckboxTop)
        {
           Event.observe( this.clearAllCheckboxTop, "click", this.clearAllCheckboxOnClick.bindAsEventListener( this ) );
        }
        if(this.clearAllCheckboxBot)
        {
           Event.observe( this.clearAllCheckboxBot, "click", this.clearAllCheckboxOnClick.bindAsEventListener( this ) );
        }
      }

  },
     selectAllCheckboxOnClick: function(event)
     {
          var checkboxes = list.checkboxes.get(this.containerId);
          for ( var i=0; i < checkboxes.length; ++i )
           {
             checkboxes[ i ].checked = true;
           }
           if( event )
           {
             Event.stop(event);
           }
      },

      clearAllCheckboxOnClick: function(event)
      {
           var checkboxes = list.checkboxes.get(this.containerId);
           for ( var i=0; i < checkboxes.length; ++i )
           {
             checkboxes[ i ].checked = false;
           }
           if( event )
           {
             Event.stop(event);
           }
      }
};

genericList.initCheckboxesAndRadioButtons = function(id)
{
    var checkboxes = [];
    var radios = [];
    var container = $s(id);
    if(container)
    {
      var inputs =  container.getElementsByTagName('input');
      var num = inputs.length;
      for ( var i = 0; i < num; i++ )
      {
        var input = inputs[i];
        if ( ( page.util.hasClassName(input.parentNode, 'item' ) ||
               page.util.hasClassName(input.parentNode, 'smallCell' ) ) &&
             input.type.toLowerCase() == 'checkbox' )
        {
          checkboxes.push( input );
        }
        else if ( ( page.util.hasClassName(input.parentNode, 'item' ) ||
                    page.util.hasClassName(input.parentNode, 'smallCell' ) ) &&
                  input.type.toLowerCase() == 'radio' )
        {
          radios.push( input );
        }
      }
   }
    // select all <input type="checkbox"> elements that are inside <td class="smallCell">
    list.checkboxes.set(id,checkboxes);
    // select all <input type="radio"> elements that are inside <td class="smallCell">
    list.radioButtons.set(id,radios);

};

genericList.updateFilterTypes = function (name,suffix)
{
  var selectElements = document.getElementsByName(name);
  var currentSelectElement = $ (name+'_id' + suffix);
  selectElements[0].options[currentSelectElement.selectedIndex].selected=true;
  selectElements[1].options[currentSelectElement.selectedIndex].selected=true;
};
/***************************************************************** nestedList controls********************************************************************/

nestedList.CheckboxRadioController = Class.create();
nestedList.CheckboxRadioController.prototype =
{
    initialize: function( id )
    {
        if( !id )
        {
          id = "listContainer";
        }
        this.containerId = id;
        var checkboxes = document.getElementsByName("checkbox");
        if( checkboxes.length !== 0 )
        {
          for ( var k = 0 ; k < checkboxes.length; k++ )
          {
            var contextMenu = $(checkboxes[k].parentNode).next().down( ".contextMenuContainer" );
            if ( contextMenu )
            {
              Event.observe( contextMenu, "click", this.onCheckboxRadioOrRowClick.bindAsEventListener( this, checkboxes[k] ) );
            }
          }
       }
      // select all <input type="checkbox"> elements that are inside <td class="smallCell">
      list.checkboxes.set(id,checkboxes);
    },
    onCheckboxRadioOrRowClick: function( event , x  )
    {
        var cbs = list.checkboxes.get(this.containerId);
        for ( var k = 0 ; k < cbs.length; k++ )
        {
           cbs[k].checked = false;
        }
        x.checked = true;
    }
};

}