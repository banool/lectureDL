var dirList =
{
  useBbDrive : false,
  WINDOW_BLUR_TIMEOUT : 100,
  BB_DRIVE_COOKIE_NAME : "xythosdrive",
  DOWNLOAD_FINISH_COOKIE : "DLFN",
  XYTHOS_FILE_ANCHOR : "_xythosFileAnchor",
  READ_WRITE_AVL : "_fileReadWritePermAvl",
  BBDRIVE_AVL_COOKIE_VALUE : "1",
  BBDRIVE_UNAVL_COOKIE_VALUE : "0",
  flyoutForm : null,
  onPageLoadHandler : function( persistentCookieTimeout )
  {
    if ( dirList.runBbDriveAvailableCheck( persistentCookieTimeout ) === dirList.BBDRIVE_AVL_COOKIE_VALUE )
    {
      dirList.useBbDrive = true;
    }
    else
    {
      dirList.useBbDrive = false;
    }
    //as per Bb's JS coding guide the technique below is faster than using Prototype's $$ method during onLoad
    var anchorLinks = $A( document.getElementsByTagName( "a" ) );
    var anchorLinkLen = anchorLinks.length;
    for ( var ind = 0; ind < anchorLinkLen; ind++ )
    {
      if ( page.util.hasClassName( anchorLinks[ ind ], "event_clickFileName" ) )
      {
        Event.observe( anchorLinks[ ind ], "click", dirList.handleClickOnFileName ); //fn binding not really needed
      }
    }
  },

  openFileInBbDrive : function( fileEntryXythosId, hrefUrl )
  {
    var readWritePermAvl = $( fileEntryXythosId + dirList.READ_WRITE_AVL ).value;
    if ( readWritePermAvl === "true" ) //if read/write perm avl, try opening file in Drive
    {
      dirList.openEntry( hrefUrl, hrefUrl );
      return;
    }
    else
    {
      window.open( hrefUrl, "_blank" );
    }
  },

  handleClickOnFileName : function( event )
  {
    event.stop();
    var entryLinkElem = Event.findElement( event );
    var indexOfFileAnchor = entryLinkElem.id.indexOf( dirList.XYTHOS_FILE_ANCHOR );
    if ( indexOfFileAnchor > -1 )
    {
      var fileEntryXythosId = entryLinkElem.id.substring( 0, indexOfFileAnchor );
      var hrefUrl = entryLinkElem.href;
      dirList.openFileInBbDrive( fileEntryXythosId, hrefUrl );
    }
  },

  openFolderInBbDrive : function( webdavUrl )
  {
    dirList.openEntry( webdavUrl, webdavUrl );
  },

  openEntry : function( webdavUrl, hrefUrl )
  {
    //if drive present, open in drive or else open normally
    if ( dirList.useBbDrive )
    {
      bbDriveUtil.openEntryInBbDrive( webdavUrl, document.cookie );
      setTimeout( "window.blur()", dirList.WINDOW_BLUR_TIMEOUT );
    }
    else
    {
      window.open( hrefUrl, "_blank" );
      if ( dirList.isBbDriveAvailablityChange() )
      {
        top.location.reload();
        setTimeout( "window.blur()", dirList.WINDOW_BLUR_TIMEOUT );
      }
    }
  },

  //can cause page to reload if suddenly the avl of xythos drive changes between requests
  runBbDriveAvailableCheck : function( persistentCookieTimeout )
  {
    var createCookie = function( cookieValue )
    {
      var expirationDate = null;
      if ( persistentCookieTimeout && persistentCookieTimeout !== -1 )
      {
        expirationDate = new Date();
        var dateMillis = expirationDate.getTime();
        var newDateMillis = dateMillis + 1000 * persistentCookieTimeout;
        expirationDate.setTime( newDateMillis );
      }
      setCookie( dirList.BB_DRIVE_COOKIE_NAME, cookieValue, expirationDate, "/", null, null );
    };
    var oldCookieValue = getCookie( dirList.BB_DRIVE_COOKIE_NAME );
    var newCookieValue = dirList.BBDRIVE_AVL_COOKIE_VALUE;
    if ( !bbDriveUtil.isBbDriveAvailable() )
    {
      newCookieValue = dirList.BBDRIVE_UNAVL_COOKIE_VALUE;
    }
    if ( oldCookieValue === null )
    {
      createCookie( newCookieValue );
      return newCookieValue;
    }
    //bbdrive was suddenly unavl, lets set the cookie and reload so we can show any drive
    //specific options on the page
    if ( oldCookieValue === dirList.BBDRIVE_AVL_COOKIE_VALUE && newCookieValue === dirList.BBDRIVE_UNAVL_COOKIE_VALUE )
    {
      createCookie( dirList.BBDRIVE_UNAVL_COOKIE_VALUE );
      top.location.reload();
    }
    //bbdrive was suddenly avl, lets not reload but set the cookie
    if ( oldCookieValue === dirList.BBDRIVE_UNAVL_COOKIE_VALUE && newCookieValue === dirList.BBDRIVE_AVL_COOKIE_VALUE )
    {
      createCookie( dirList.BBDRIVE_AVL_COOKIE_VALUE );
      //not reloading as this will cause the page to reload each time the user visits Content Collection
    }
    return newCookieValue;
  },

  isBbDriveAvailablityChange : function()
  {
    var currentCookieValue = getCookie( dirList.BB_DRIVE_COOKIE_NAME );
    if ( currentCookieValue === null ) //should not be null but if it is
    {
      currentCookieValue = dirList.BBDRIVE_UNAVL_COOKIE_VALUE;
    }
    var newCookieValue = dirList.BBDRIVE_AVL_COOKIE_VALUE;

    if ( !bbDriveUtil.isBbDriveAvailable() )
    {
      newCookieValue = dirList.BBDRIVE_UNAVL_COOKIE_VALUE;
    }
    return currentCookieValue !== newCookieValue;
  },

  onViewToggleClick : function( event, value, optionKey, isTicketUser )
  {
    var url;
    var e = event || window.event;
    if ( e )
    {
      var eventElement = Event.element( e );
      Event.stop( e );

      if ( !url && eventElement.href )
      {
        url = eventElement.href;
      }
    }

    if ( isTicketUser )
    {
      UserDataDWRFacade.setStringTempScope( optionKey, value, function()
      {
        if ( parent.WFS_Navigation )
        {
          if ( url )
          {
            // drawer changes right frames's name - access it with index
            var index = 1;
            if ( page.util.isRTL() )
            {
              index = 0;
            }
            parent.frames[ index ].location.href = url;
          }
          // if no url is specified and drawer doesn't exist, it may be safe to reload
          // right frame
          else if ( parent.WFS_Files )
          {
            parent.WFS_Files.location.reload( true );
          }
        }
        else
        {
          if ( url )
          {
            window.location.href = url;
          }
          else
          {
            window.location.reload( true );
          }
        }
      } );
    }
    else
    {
      UserDataDWRFacade.setStringPermScope( optionKey, value, function()
      {
        if ( parent.WFS_Navigation )
        {
          if ( url )
          {
            // drawer changes right frames's name - access it with index
            var index = 1;
            if ( page.util.isRTL() )
            {
              index = 0;
            }
            parent.frames[ index ].location.href = url;
          }
          // if no url is specified and drawer doesn't exist, it may be safe to reload right frame
          else if ( parent.WFS_Files )
          {
            parent.WFS_Files.location.reload( true );
          }
        }
        else
        {
          if ( url )
          {
            window.location.href = url;
          }
          else
          {
            window.location.reload( true );
          }
        }
      } );
    }
  },

  bookmarkFiles : function( parentFolderPath )
  {
    if ( csfunctions.ensureCheckedItem() )
    {
      document.filesForm.action = "/webapps/bbcms/bookmarks/bookmarkMultiple.jsp?currPath=" + parentFolderPath;
      document.filesForm.submit();
    }
    else
    {
      alert( window.SELECT_ONE_MSG );
    }
  },

  downloadFiles : function( fullEntryPath )
  {
    if ( !csfunctions.ensureCheckedItem() )
    {
      alert( window.SELECT_ONE_MSG );
      return;
    }

    document.filesForm.a1.value = "download";
    document.filesForm.subaction.value = "zip";
    document.filesForm.action = fullEntryPath + ".zip";
    document.filesForm.submit();
    // Update the NONCE_ID by monitoring the flag in cookie
    var downloadInt = window.setInterval( function()
    {
      // the cookie here is set in DownloadViewHelper
      var flag = getCookie( dirList.DOWNLOAD_FINISH_COOKIE );
      if ( flag === "1" )
      {
        window.clearInterval( downloadInt );
        deleteCookie( dirList.DOWNLOAD_FINISH_COOKIE, "/" );
        // force refresh to update the NONCE_ID
        window.location.reload( true );
      }
    }, 500 );
    for ( var i = 0; i < document.filesForm.elements.length; i++ )
    {
      if ( document.filesForm.elements[ i ].name.substring( 0, 4 ) == "file" )
      {
        document.filesForm.elements[ i ].checked = false;
      }
    }
    doubleSubmit.allowSubmitAgainForForm(document.filesForm); // need to be called to enable submitting this form again
  },

  downloadAllCourseFiles : function( fullEntryPath )
  {
    csfunctions.selectAll();
    dirList.downloadFiles( fullEntryPath );
  },

  pluginAction : function( href )
  {
    if ( csfunctions.ensureCheckedItem() )
    {
      document.filesForm.action = href;
      document.filesForm.submit();
    }
    else
    {
      alert( window.SELECT_ONE_MSG );
    }
  },

  createContentArtifact : function( url, entryName )
  {
    var cancelUrl = document.location.href;

    //We need to remove the inline messages from the cancelurl
    //before we pass it to the next page so it doesn't override
    //any messages that page may try to add since the inline receipt
    //only uses the first one if there are multiple in the querystring.
    var queryParams = cancelUrl.toQueryParams();
    delete queryParams.inline_receipt_message;
    delete queryParams.inline_receipt_error_msg;

    var linkStart = cancelUrl.split( "?" )[ 0 ];
    document.filesForm.cancelUrl.value = linkStart + "?" + $H( queryParams ).toQueryString();

    document.filesForm.action = url;
    document.filesForm.subaction.value = entryName;
    document.filesForm.submit();
  },

  findTree : function( nodeId )
  {
    try
    {
      if ( !nodeId )
      {
        return null;
      }
      var leftNav = parent.WFS_Navigation;
      if ( !leftNav )
      {
        return null;
      }
      var trees = leftNav.nlsTree;
      if ( !trees )
      {
        return null;
      }

      for ( var name in trees )
      {
        if ( trees.hasOwnProperty( name ) )
        {
          var tree = trees[ name ];
          if ( !tree )
          {
            continue;
          }

          if ( typeof ( tree.getNodeById ) == "function" )
          {
            var node = tree.getNodeById( nodeId );
            if ( !node )
            {
              continue;
            }
            return tree;
          }
        }
      }

      return null;
    }
    catch ( e )
    {
      //we should just fail silently here as this function
      //is just for convenience...
    }
    return null;
  },

  toggleLeftNavNode : function( encodedEntryName )
  {
    var nodeId = encodedEntryName;
    var tree = dirList.findTree( nodeId );
    if ( tree )
    {
      tree.selectNodeById( nodeId );
    }

    dirList.flyoutForm = new flyoutform.FlyoutForm(
    {
      linkId : 'newAddFolderButton',
      formDivId : 'addFolderForm',
      inlineFormContainerId : 'containerdiv',
      flyoutButtonIds : [ 'createCustomizeButton' ],
      customOnSubmitHandler : dirList.onFlyoutFormSubmit
    } );
  },

  onFlyoutFormSubmit : function()
  {
    var dirName = document.getElementById( "newFolderName" ).value;
    if ( dirName == "Recycle Bin" )
    {
      var msg = '${bbNG:EncodeLabel(noRecyclebinMsg)}';
      alert( msg );
      return false;
    }
    else
    {
      return true;
    }
  },

  onCreateCustomizeClick : function( event, url )
  {
    var e = event || window.event;
    $( 'addFolderCustomize' ).value = 'true';
    dirList.flyoutForm.submit( e );
  },

  setFocus : function()
  {
    var node = document.getElementById( 'list' );
    if ( !node )
    {
      return;
    }
    node.focus();
  }
};
