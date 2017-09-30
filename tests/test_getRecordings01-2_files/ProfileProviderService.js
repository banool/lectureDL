
// Provide a default path to dwr.engine
if (dwr == null) var dwr = {};
if (dwr.engine == null) dwr.engine = {};
if (DWREngine == null) var DWREngine = dwr.engine;

if (ProfileProviderService == null) var ProfileProviderService = {};
ProfileProviderService._path = '/webapps/blackboard/dwr_open';
ProfileProviderService.isValidProfileUri = function(p0, callback) {
  dwr.engine._execute(ProfileProviderService._path, 'ProfileProviderService', 'isValidProfileUri', p0, callback);
}
