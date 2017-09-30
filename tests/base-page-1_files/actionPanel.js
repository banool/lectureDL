var actionPanel = {};

actionPanel.togglePanel = function( panelId, buttonId )
{
  var button = $( buttonId );
  var panel = $( panelId );
  var link = button.down( "a" );

  button.addClassName( 'secondaryButton' );

  panel.toggle();
  
  if ( link )
  {
    link.toggleClassName( '' );
    link.toggleClassName( 'liveAreaTab' );
    link.setAttribute( "aria-expanded", panel.visible() );
  }
  
  var changeTxt;
  if ( panel.visible() )
  {
    changeTxt = page.bundle.getString( "action.hide" );
  }
  else
  {
    changeTxt = page.bundle.getString( "action.show" );
  }
  
  var spanHide = $( buttonId + "_span" );
  if ( spanHide )
  {
    spanHide.innerHTML = changeTxt;
  }
  
  var alst = panel.getElementsByTagName( "a" );
  var closeButton = alst[ alst.length - 1 ];
  if ( closeButton )
  {
    try
    {
      closeButton.focus();
    }
    catch (ignore)
    {
      // Ignore errors focusing the close button - if it isn't visible then we don't care about focusing it
    }
  }
  link.focus();
  if ( panel.persistId )
  {
    UserDataDWRFacade.setStringTempScope( panel.persistId, panel.visible() );
  }
};

actionPanel.setPersistId = function ( panelId, persistId )
{
  $(panelId).persistId = persistId;
};

actionPanel.turnOnTabButton = function ( buttonId )
{
  var button = $(buttonId);
  var link = button.down("a");
  button.addClassName('secondaryButton');
  if ( link && !link.hasClassName("liveAreaTab") )
  {
      link.toggleClassName('');
      link.toggleClassName('liveAreaTab');

  }
};

actionPanel.launchArtPicker = function ( courseId, contentId, addPageQueryString, artifactTypeVar, addLearningObjectUrl )
{
  var artifactType = "";
  if ( artifactTypeVar == "discoverObjectTypePicker" ) {
    artifactType = document.getElementById("discoverObjectTypePicker").value;
  } else {
    artifactType = artifactTypeVar;
  }
  var lpix = screen.width - 800;
  var artPickerUrl = '/webapps/bbcms/execute/artifact/artifactCatalog?action=catalogResults&isPicker=true&isFolderPicker=false&isFilePicker=true&principalID=&artifactType=' + artifactType + '&course_id=' + courseId + '&content_id=' + contentId + '&addLearningObjectUrlQueryParams=' + addPageQueryString;
  if ( addLearningObjectUrl && !addLearningObjectUrl.blank() )
  {
    artPickerUrl = artPickerUrl + "&addLearningObjectUrl=" + addLearningObjectUrl;
  }  
  
  window.remote = window.open( artPickerUrl, 'picker_browse', 'width=800,height=500,resizable=yes,scrollbars=yes,status=yes,top=20,left='+lpix);
};
