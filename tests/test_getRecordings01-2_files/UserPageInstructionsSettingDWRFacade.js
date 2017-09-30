
// Provide a default path to dwr.engine
if (dwr == null) var dwr = {};
if (dwr.engine == null) dwr.engine = {};
if (DWREngine == null) var DWREngine = dwr.engine;

if (UserPageInstructionsSettingDWRFacade == null) var UserPageInstructionsSettingDWRFacade = {};
UserPageInstructionsSettingDWRFacade._path = '/webapps/blackboard/dwr_open';
UserPageInstructionsSettingDWRFacade.getShowPageInstructions = function(callback) {
  dwr.engine._execute(UserPageInstructionsSettingDWRFacade._path, 'UserPageInstructionsSettingDWRFacade', 'getShowPageInstructions', callback);
}
UserPageInstructionsSettingDWRFacade.setShowPageInstructions = function(p0, callback) {
  dwr.engine._execute(UserPageInstructionsSettingDWRFacade._path, 'UserPageInstructionsSettingDWRFacade', 'setShowPageInstructions', p0, callback);
}
UserPageInstructionsSettingDWRFacade.initContextFromRequestHeader = function(callback) {
  dwr.engine._execute(UserPageInstructionsSettingDWRFacade._path, 'UserPageInstructionsSettingDWRFacade', 'initContextFromRequestHeader', false, callback);
}
