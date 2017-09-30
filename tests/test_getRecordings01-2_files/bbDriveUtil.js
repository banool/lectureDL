/**
 Taken from ittach.js in Xythos
*/
var bbDriveUtil = {

  XYTHOS_DRIVE_PLUGIN_NAME : "Xythos Drive",
  INTELLITTACH_MIME_TYPE : "application/x-Intellittach-plugin",
  XYTHOS_DRIVE_ACTIVEXOBJ : "XythosIT.Intellittach",

  /**
   * Returns true if Bb Drive is Available by evaluating plugins or active x objects or else false
   */
  isBbDriveAvailable : function()
  {
    if ( ! bbDriveUtil.isIE() )
    {
      if ( navigator.plugins && navigator.plugins.length )
      {
        var plugin = navigator.plugins[bbDriveUtil.XYTHOS_DRIVE_PLUGIN_NAME];
        if ( plugin )
        {
          return true;
        }
        else
        {
          return false;
        }
      }
      else if ( navigator.mimeTypes && navigator.mimeTypes.length )
      {
        var mimetype = navigator.mimeTypes[bbDriveUtil.INTELLITTACH_MIME_TYPE];
        if ( mimetype && mimetype.enabledPlugin )
        {
          return true;
        }
        else
        {
          return false;
        }
      }
    }
    else
    {
      // Must be IE
      // Try and create the object; if can, then it exists, otherwise not
      try
      {
        var xdrive = new ActiveXObject(bbDriveUtil.XYTHOS_DRIVE_ACTIVEXOBJ);
        return true;
      }
      catch(e)
      {
        return false;
      }
    }
  },

  isIE : function()
  {
	var tmp = document.documentMode, e, isIE;

	// Try to force this property to be a string. 
	try{document.documentMode = "";}
	catch(e){ };

	// If document.documentMode is a number, then it is a read-only property, and so 
	// we have IE 8+.
	// Otherwise, if conditional compilation works, then we have IE < 11.
	// Otherwise, we have a non-IE browser. 
	isIE = typeof document.documentMode == "number" || eval("/*@cc_on!@*/!1");

	// Switch back the value to be unobtrusive for non-IE browsers. 
	try{document.documentMode = tmp;}
	catch(e){ };
	
	return isIE;
  },
  /**
   * Open resource at given URL in Bb Drive. It is expected that the caller has checked that the Drive is available using
   * bbDriveUtil.isBbDriveAvailable()
   */
  openEntryInBbDrive : function(sURL, ticketSessionCookie)
  {
    var xythosURL = sURL;
    var pattern = new RegExp(/(\/bbcswebdav)\/xid-([0-9]+?_[0-9]+)/);
    var xythosSearchResultArray = sURL.match(pattern);

    if( xythosSearchResultArray )
    {
      var xythosId = xythosSearchResultArray[2];
      new Ajax.Request( '/webapps/xythoswfs/execute/xythosFileUtil',
                        {
                            method : "get",
                            asynchronous : false,
                            parameters : "cmd=getFileNameByXythosId&xythosId=" + xythosId,
                            onSuccess : function( transport, json )
                            {
                              var result = transport.responseText.evalJSON( true );
                              xythosURL = sURL.gsub(pattern,"#{1}" + result.xythosFileName);
                            }
                        });
    }
    var embedElemId = "bbdrive_embed", fallbackEmbedElemId = "fallback_bbdrive_embed";
    // Need to check again if IE or not
    //if IE use ActiveX object
    if ( bbDriveUtil.isIE() )
    {
      try
      {
        var xdrive = new ActiveXObject(bbDriveUtil.XYTHOS_DRIVE_ACTIVEXOBJ);
        if ( xdrive )
        {
          xdrive.ConnectAndOpenAppCookie(xythosURL, "", "cookie:"+ticketSessionCookie);
        }
      }
      catch (ex1)
      {
        window.open(xythosURL);
      }
    }
    else
    {
      //Gecko
      //Opera claims to support createElement but it really doesn't.
      //However it does not lie about createTextNode, so check it too
      if (document.createElement && document.createTextNode)
      {
        var createEmbedElement = function(id)
        {
          var elem = document.createElement("EMBED");
          elem.setAttribute("id", id);
          elem.setAttribute("TYPE", bbDriveUtil.INTELLITTACH_MIME_TYPE);
          elem.setAttribute("NAME", "ITPlugin");
          elem.setAttribute("HEIGHT", "0");
          elem.setAttribute("WIDTH", "0");
          return elem;
        };
        try
        {
          //technique no 1 to open file in FF: create single embed element and then call methods on it
          var embedElem = $(embedElemId);
          if ( ! embedElem )
          {
            embedElem = createEmbedElement(embedElemId);
            document.body.appendChild(embedElem);
            embedElem = $(embedElemId);
          }
          embedElem.ConnectAndOpenAppCookie( xythosURL, "user", "cookie:"+ticketSessionCookie);
        }
        catch(ex2)
        {
          //technique no 2 to open file in FF: create embed element, set the methods to call as attributes on the method
          var fallbackEmbedElem = $(fallbackEmbedElemId);
          if ( fallbackEmbedElem )
          {
            //removing previous embed elem prevents a strange FF behavior of opening the same file multiple times in Win 7x64/Office 2010
            fallbackEmbedElem.remove();
          }
          fallbackEmbedElem = createEmbedElement( fallbackEmbedElemId );
          fallbackEmbedElem.setAttribute("URL", xythosURL);
          fallbackEmbedElem.setAttribute("FUNCTION", "ConnectOpenSingleSign");
          fallbackEmbedElem.setAttribute("USER", "");
          fallbackEmbedElem.setAttribute("AUTH", "cookie:"+ticketSessionCookie);
          document.body.appendChild(fallbackEmbedElem);
        }
      }
    }
  }

};
