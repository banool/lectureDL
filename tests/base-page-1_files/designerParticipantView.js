var designer_participant = {
 toggleEditMode:function(href,courseId,mode){
   new Ajax.Request('/webapps/blackboard/execute/doCourseMenuAction?cmd=setDesignerParticipantViewMode&courseId='+courseId+'&mode='+mode, {
      onSuccess: function(transport, json) {
        var result = transport.responseText.evalJSON( true );
        if ( result.success == "true" )
        {
          if ( href  )
          {
                  if (href.indexOf("javascript:") === 0) {
                    eval(href.substring(11));
                  } else if (href == "noop") {
                    if (mode == 'participant') {
                        document.getElementById('read_link').className ='active';
                        document.getElementById('edit_link').className ='';
                        document.getElementById('read_link').parentNode.className ='active';
                        document.getElementById('edit_link').parentNode.className ='';
                    } else {
                        document.getElementById('read_link').className ='';
                        document.getElementById('edit_link').className ='active';
                        document.getElementById('read_link').parentNode.className ='';
                        document.getElementById('edit_link').parentNode.className ='active';
                    }
                  } else {
                    window.location = href;
                  }
          }
          else
          {
            window.location.reload(true);
          }
        }
       else
       {
         new page.InlineConfirmation("error", result.errorMessage, false );
       }
      }
    });
  }
};
