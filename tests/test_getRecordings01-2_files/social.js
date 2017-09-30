var social =
{};

social.Profile =
{
  /* Internal Constants */

  // id to the profile accessor tool HTML element in My Blackboard
  // (this constant is set separately by js in the java code; see MyProfileRenderingHook.java)
  MY_PROFILE_TOOL_ID:     "",

  // URI to the My Profile tool in My Blackboard
  // (this constant is set separately by js in the java code; see MyProfileRenderingHook.java)
  MY_PROFILE_TOOL_URI:    "",

  /* Display Constants */

  // display target for the toggle view method to display in the full window
  DISPLAY_TARGET_WINDOW:  "window",

  // display target for the toggle view method to display in My Blackboard
  DISPLAY_TARGET_MYBB:    "myBb"
};

/**
 * Display the given page in the given display target for the My Profile accessor element on page.
 * The My Profile accessor element by the id, social.Profile.MY_PROFILE_ACCESSOR_ID, must exist on the page.
 *
 * @param displayTarget  Where to display view of the given location. Use
                         social.Profile.DISPLAY_TARGET_WINDOW for entire window or
                         social.Profile.DISPLAY_TARGET_MYBB for My Blackboard.
 * @param profilePageUri The URI of the page to display
 */
social.Profile.toggleView = function( displayTarget, profilePageUri )
{
  // validate the profile page URI (security check)
  top.ProfileProviderService.isValidProfileUri( profilePageUri, { callback :
      function( isValid )
      {
        if( isValid )
        {
          // display the given page in the given display target

          if( displayTarget === social.Profile.DISPLAY_TARGET_WINDOW )
          {
            // full window
            top.location = profilePageUri;
          }
          else if( displayTarget === social.Profile.DISPLAY_TARGET_MYBB )
          {
            // in My Blackboard
            window.location = social.Profile.MY_PROFILE_TOOL_URI + escape( profilePageUri );
          }
        }
        else
        {
          // access denied message
          alert( page.bundle.getString( "accessDeniedMsg" ) );
        }
      } } );
};
