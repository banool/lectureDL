
var Announcement =
{
  smsCopied : false,
  t2vCopied : false,
  smsText : '',
  t2vText : '',
  textMsgMaxLength : '',
  voiceMsgMaxLength : '',
  smsTextKey : 'smsTextWithColon',
  smsOptionsAvailable: true,
  smsValidInputText: '',
  t2vValidInputText: '',
  invalidChars: '',

  //this method is called onLoad
  resetMessageOptions : function(textMsgMaxLength, voiceMsgMaxLength, invalidChars)
  {
    this.smsTextElement = $('smstext');
    this.smsCopyCheckElement = $('smsCopyCheck');

    if( !this.smsTextElement )
    {
      this.smsOptionsAvailable = false;
      return;
    }

    $('keyEnglish').checked = false;
    $('keySpanish').checked = false;
    this.textMsgMaxLength = textMsgMaxLength;
    this.voiceMsgMaxLength = voiceMsgMaxLength;
    this.invalidChars = invalidChars;

    // this step will remove default smstext object which does not have validation data.
    formCheckList.removeElement('smstext');
    formCheckList.removeElement('t2vtext');

    // this object defines validation data for sms announcement text.
    this.smsValidInputText = new inputText({maxlength: textMsgMaxLength,
                                            invalid_chars: new RegExp(this.invalidChars,'g'),
                                            ref_label: page.bundle.getString('smsAnnouncementText'),
                                            name: 'smstext', minlength: 1 });
    this.t2vValidInputText = new inputText({maxlength: voiceMsgMaxLength,
                                            invalid_chars: new RegExp(this.invalidChars,'g'),
                                            ref_label: page.bundle.getString('t2vAnnouncementText'),
                                            name: 't2vtext', minlength: 1 });

    //add listeners to the date range picker
    Event.observe("start_restrict", "click", function(event) {
      Announcement.dateRestrictionChanged();
    });
    Event.observe($("dp_restrict_start_date"), "blur", function(event) {
      Announcement.dateRestrictionChanged();
    });
    Event.observe($("tp_restrict_start_time"), "blur", function(event) {
      Announcement.dateRestrictionChanged();
    });
    document.observe( 'calendar-time:changed', function( event )
    {
      Announcement.dateRestrictionChanged();
    });

    //and finally, let's see if SMS should be enabled on pageload
    Announcement.dateRestrictionChanged();
  },
  dateRestrictionChanged : function()
  {
    var startDatePicker = calendar.DatePicker.getStartDatePicker( 'restrict' );
    var startTimePicker = calendar.TimePicker.getStartTimePicker( 'restrict' );
    var startDate = calendar.DateTimePicker.getCurrentDateTime( startDatePicker, startTimePicker );

    if ( $("start_restrict").checked && startDate && startDatePicker.isFutureDate( startDate ))
    {
      $('voiceCopyCheck').disabled = true;
      $('voiceCopyCheck').checked = false;
      Announcement.setVoiceCopy();

      $('smsCopyCheck').disabled = true;
      $('smsCopyCheck').checked = false;
      Announcement.setSmsCopy();
    }
    else
    {
      $('voiceCopyCheck').disabled = false;
      $('smsCopyCheck').disabled = false;
    }
  },
  setSmsCopy : function()
  {
    if(this.smsCopyCheckElement.checked)
    {
      //This step will enable sms text validation as specified in inputText object.
      formCheckList.addElement(this.smsValidInputText);
      this.showEditor('smsWrapper');
    }
    else
    {
      //This will disable the validation of smstext object.
      formCheckList.removeElement('smstext');
      this.hideEditor('smsWrapper');
    }
    var msgBody = "";
    if(!this.smsCopied)
    {
      this.insertSubjectAndMessageIntoEditor('smstext');
      this.smsCopied = true;
    }
  },

  showEditor : function ( editorWrapper )
  {
    $(editorWrapper).show();
  },

  hideEditor : function ( editorWrapper )
  {
    $(editorWrapper).hide();
  },

  stripSpacesTagsAndScripts : function( announcementText )
  {
    //strips all spaces, tags and scripts (continuous html tags are replaced by a single space)
    return announcementText.replace(/&quot;/g,'"').strip().replace(/<\/?[^>]+>/gi,' ').replace(/\s+/g,' ').stripScripts().gsub(new RegExp(this.invalidChars),'');
  },

  setT2vText : function()
  {
    if (!this.t2vCopied)
    {
      this.insertSubjectAndMessageIntoEditor('t2vtext');
      this.t2vCopied = true;
    }
  },

  insertSubjectAndMessageIntoEditor : function( editorId )
  {
    var messageTextWrapper = window.tinyMceWrapper.editors.get('messagetext');
    var messageTextHTML = messageTextWrapper.getHTML().unescapeHTML();
    var msgBody = this.stripSpacesTagsAndScripts(messageTextHTML);
    var msgSubject = this.stripSpacesTagsAndScripts($F('subject'));
    if(msgSubject.blank() || msgBody.blank())
    {
      this.smsTextKey = 'smsTextWithSpace';
    }
    var text = page.bundle.getString(this.smsTextKey, msgSubject, msgBody);
    var smsTextWrapper = window.tinyMceWrapper.editors.get( editorId );
    smsTextWrapper.replaceHTML( text );
  },

  toggleVoiceText : function(show)
  {
    if (show)
    {
      // show the edit box
      this.showEditor('t2vWrapper');

      // populate the newly shown edit box with text
      this.setT2vText();
    }
    else
    {
      //hide the edit box
      this.hideEditor('t2vWrapper');

      //reset the contents of the edit box
      this.t2vCopied = false;
      this.setT2vText();

    }
  },

  setVoiceCopy : function()
  {
    if($F('voiceCopyCheck'))
    {
      this.setT2vText();

      $('keyEnglish').enable();
      $('keySpanish').enable();
      $('keyEnglish').checked = true;
      $('keySpanish').checked = false;

      $('textOrig').enable();
      $('textCustom').enable();
      $('textOrig').checked = true;
      $('textCustom').checked = false;

      // This step will enable t2v text validation as specified in inputText object.
      formCheckList.addElement(this.t2vValidInputText);
    }
    else
    {
      //reset the t2v text
      this.t2vCopied = false;
      this.setT2vText();

      //hide the edit box
      this.toggleVoiceText(false);
      $('keyEnglish').disable();
      $('keySpanish').disable();
      $('keyEnglish').checked = false;
      $('keySpanish').checked = false;

      $('textOrig').disable();
      $('textCustom').disable();
      $('textOrig').checked = false;
      $('textCustom').checked = false;

      //This will disable the validation of t2vtext object.
      formCheckList.removeElement('t2vtext');
    }
  },

  confirmSend : function()
  {

    var sendSmsMessage = this.smsCopyCheckElement ? this.smsCopyCheckElement.checked : false;
    var voiceCopyCheck = $('voiceCopyCheck');
    var sendVoiceMessage = voiceCopyCheck ? voiceCopyCheck.checked : false;

    var message;

    // figure out what kind of confirmation message we need to show (if any)
    if (sendSmsMessage && sendVoiceMessage)
    {
      message = page.bundle.getString("sendConfirmMsgSmsAndVoice");
    }
    else if (sendSmsMessage )
    {
      message = page.bundle.getString("sendConfirmMsgSmsOnly");
    }
    else if (sendVoiceMessage)
    {
      message = page.bundle.getString("sendConfirmMsgVoiceOnly");
    }

    if (message)
    {
      return confirm(message);
    }
  },

  submit: function( action, httpMethod )
  {
    var form = $( 'announcementForm' );
    form.writeAttribute('method', httpMethod);
    $( 'method' ).value = action;
    form.submit();
  },

  addAnnouncement: function()
  {
    Announcement.submit( 'add', 'get' );
  },

  searchAnnouncements: function( viewChoice )
  {
    $( 'tabAction' ).value = true;
    setViewChoice(viewChoice);
    Announcement.submit( 'search', 'GET' );
  },

  deleteAnnouncement: function( announcementId )
  {
    if ( confirm( page.bundle.getString( 'announcement.delete.announcement.warning' ) ) )
    {
      $( 'announcementId' ).value = announcementId;
      Announcement.submit( 'delete', 'POST' );
    }
  }
};

function setAnnouncementId(announcementId)
{
  document.forms.announcementForm.elements.announcementId.value = announcementId;
}

function setViewChoice(viewChoice)
{
  document.forms.announcementForm.viewChoice.value = viewChoice;
}

function formValidate(method)
{
  document.forms.announcementForm.elements.method.value = method;

  if(validateForm(document.forms.announcementForm))
  {
	var isPermanentFalse = document.getElementById('isPermanent_false');
	var startRestrict = document.getElementById('start_restrict');
	var endRestrict = document.getElementById('end_restrict');
	if( isPermanentFalse.checked === true && startRestrict.checked === false && endRestrict.checked === false )
	{
	    alert( window.dateRestrictedWarning );
	    return false;
	}	
    return Announcement.confirmSend();
  }
  else
  {
    //AS-133523 - if T2V is being sent, let's make the editor visible, in case validation fails
    //otherwise, validation code highlights something not visible, which is less than helpful
    var voiceCheck = $('voiceCopyCheck');
    if ( voiceCheck && voiceCheck.checked)
    {
      $('textCustom').click();
    }

    return false;
  }
}
function hideRestrictDates()
{
   if(document.getElementById('isPermanent_true').checked)
   {
     document.getElementById('start_restrict').checked = false;
     document.getElementById('end_restrict').checked = false;
     document.getElementById('restrictDates').style.display = 'none';
   }
}
function showRestrictDates()
{
   if(document.getElementById('isPermanent_false').checked)
   {
    document.getElementById('restrictDates').style.display = 'block';
   }
}
