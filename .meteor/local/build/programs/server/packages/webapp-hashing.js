(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var WebAppHashing;

var require = meteorInstall({"node_modules":{"meteor":{"webapp-hashing":{"webapp-hashing.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                   //
// packages/webapp-hashing/webapp-hashing.js                                                         //
//                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                     //
const _excluded = ["autoupdateVersion", "autoupdateVersionRefreshable", "autoupdateVersionCordova"];
let _objectWithoutProperties;
module.link("@babel/runtime/helpers/objectWithoutProperties", {
  default(v) {
    _objectWithoutProperties = v;
  }
}, 0);
let createHash;
module.link("crypto", {
  createHash(v) {
    createHash = v;
  }
}, 0);
WebAppHashing = {};

// Calculate a hash of all the client resources downloaded by the
// browser, including the application HTML, runtime config, code, and
// static files.
//
// This hash *must* change if any resources seen by the browser
// change, and ideally *doesn't* change for any server-only changes
// (but the second is a performance enhancement, not a hard
// requirement).

WebAppHashing.calculateClientHash = function (manifest, includeFilter, runtimeConfigOverride) {
  var hash = createHash('sha1');

  // Omit the old hashed client values in the new hash. These may be
  // modified in the new boilerplate.
  var {
      autoupdateVersion,
      autoupdateVersionRefreshable,
      autoupdateVersionCordova
    } = __meteor_runtime_config__,
    runtimeCfg = _objectWithoutProperties(__meteor_runtime_config__, _excluded);
  if (runtimeConfigOverride) {
    runtimeCfg = runtimeConfigOverride;
  }
  hash.update(JSON.stringify(runtimeCfg, 'utf8'));
  manifest.forEach(function (resource) {
    if ((!includeFilter || includeFilter(resource.type, resource.replaceable)) && (resource.where === 'client' || resource.where === 'internal')) {
      hash.update(resource.path);
      hash.update(resource.hash);
    }
  });
  return hash.digest('hex');
};
WebAppHashing.calculateCordovaCompatibilityHash = function (platformVersion, pluginVersions) {
  const hash = createHash('sha1');
  hash.update(platformVersion);

  // Sort plugins first so iteration order doesn't affect the hash
  const plugins = Object.keys(pluginVersions).sort();
  for (let plugin of plugins) {
    const version = pluginVersions[plugin];
    hash.update(plugin);
    hash.update(version);
  }
  return hash.digest('hex');
};
///////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

require("/node_modules/meteor/webapp-hashing/webapp-hashing.js");

/* Exports */
Package._define("webapp-hashing", {
  WebAppHashing: WebAppHashing
});

})();

//# sourceURL=meteor://💻app/packages/webapp-hashing.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvd2ViYXBwLWhhc2hpbmcvd2ViYXBwLWhhc2hpbmcuanMiXSwibmFtZXMiOlsiX29iamVjdFdpdGhvdXRQcm9wZXJ0aWVzIiwibW9kdWxlIiwibGluayIsImRlZmF1bHQiLCJ2IiwiY3JlYXRlSGFzaCIsIldlYkFwcEhhc2hpbmciLCJjYWxjdWxhdGVDbGllbnRIYXNoIiwibWFuaWZlc3QiLCJpbmNsdWRlRmlsdGVyIiwicnVudGltZUNvbmZpZ092ZXJyaWRlIiwiaGFzaCIsImF1dG91cGRhdGVWZXJzaW9uIiwiYXV0b3VwZGF0ZVZlcnNpb25SZWZyZXNoYWJsZSIsImF1dG91cGRhdGVWZXJzaW9uQ29yZG92YSIsIl9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18iLCJydW50aW1lQ2ZnIiwiX2V4Y2x1ZGVkIiwidXBkYXRlIiwiSlNPTiIsInN0cmluZ2lmeSIsImZvckVhY2giLCJyZXNvdXJjZSIsInR5cGUiLCJyZXBsYWNlYWJsZSIsIndoZXJlIiwicGF0aCIsImRpZ2VzdCIsImNhbGN1bGF0ZUNvcmRvdmFDb21wYXRpYmlsaXR5SGFzaCIsInBsYXRmb3JtVmVyc2lvbiIsInBsdWdpblZlcnNpb25zIiwicGx1Z2lucyIsIk9iamVjdCIsImtleXMiLCJzb3J0IiwicGx1Z2luIiwidmVyc2lvbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLElBQUlBLHdCQUF3QjtBQUFDQyxNQUFNLENBQUNDLElBQUksQ0FBQyxnREFBZ0QsRUFBQztFQUFDQyxPQUFPQSxDQUFDQyxDQUFDLEVBQUM7SUFBQ0osd0JBQXdCLEdBQUNJLENBQUM7RUFBQTtBQUFDLENBQUMsRUFBQyxDQUFDLENBQUM7QUFBckksSUFBSUMsVUFBVTtBQUFDSixNQUFNLENBQUNDLElBQUksQ0FBQyxRQUFRLEVBQUM7RUFBQ0csVUFBVUEsQ0FBQ0QsQ0FBQyxFQUFDO0lBQUNDLFVBQVUsR0FBQ0QsQ0FBQztFQUFBO0FBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQztBQUVwRUUsYUFBYSxHQUFHLENBQUMsQ0FBQzs7QUFFbEI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQUEsYUFBYSxDQUFDQyxtQkFBbUIsR0FDL0IsVUFBVUMsUUFBUSxFQUFFQyxhQUFhLEVBQUVDLHFCQUFxQixFQUFFO0VBQzFELElBQUlDLElBQUksR0FBR04sVUFBVSxDQUFDLE1BQU0sQ0FBQzs7RUFFN0I7RUFDQTtFQUNBLElBQUk7TUFBRU8saUJBQWlCO01BQUVDLDRCQUE0QjtNQUFFQztJQUF3QyxDQUFDLEdBQUdDLHlCQUF5QjtJQUF4Q0MsVUFBVSxHQUFBaEIsd0JBQUEsQ0FBS2UseUJBQXlCLEVBQUFFLFNBQUE7RUFFNUgsSUFBSVAscUJBQXFCLEVBQUU7SUFDekJNLFVBQVUsR0FBR04scUJBQXFCO0VBQ3BDO0VBRUFDLElBQUksQ0FBQ08sTUFBTSxDQUFDQyxJQUFJLENBQUNDLFNBQVMsQ0FBQ0osVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0VBRS9DUixRQUFRLENBQUNhLE9BQU8sQ0FBQyxVQUFVQyxRQUFRLEVBQUU7SUFDakMsSUFBSSxDQUFDLENBQUViLGFBQWEsSUFBSUEsYUFBYSxDQUFDYSxRQUFRLENBQUNDLElBQUksRUFBRUQsUUFBUSxDQUFDRSxXQUFXLENBQUMsTUFDckVGLFFBQVEsQ0FBQ0csS0FBSyxLQUFLLFFBQVEsSUFBSUgsUUFBUSxDQUFDRyxLQUFLLEtBQUssVUFBVSxDQUFDLEVBQUU7TUFDcEVkLElBQUksQ0FBQ08sTUFBTSxDQUFDSSxRQUFRLENBQUNJLElBQUksQ0FBQztNQUMxQmYsSUFBSSxDQUFDTyxNQUFNLENBQUNJLFFBQVEsQ0FBQ1gsSUFBSSxDQUFDO0lBQzVCO0VBQ0YsQ0FBQyxDQUFDO0VBQ0YsT0FBT0EsSUFBSSxDQUFDZ0IsTUFBTSxDQUFDLEtBQUssQ0FBQztBQUMzQixDQUFDO0FBRURyQixhQUFhLENBQUNzQixpQ0FBaUMsR0FDN0MsVUFBU0MsZUFBZSxFQUFFQyxjQUFjLEVBQUU7RUFDMUMsTUFBTW5CLElBQUksR0FBR04sVUFBVSxDQUFDLE1BQU0sQ0FBQztFQUUvQk0sSUFBSSxDQUFDTyxNQUFNLENBQUNXLGVBQWUsQ0FBQzs7RUFFNUI7RUFDQSxNQUFNRSxPQUFPLEdBQUdDLE1BQU0sQ0FBQ0MsSUFBSSxDQUFDSCxjQUFjLENBQUMsQ0FBQ0ksSUFBSSxDQUFDLENBQUM7RUFDbEQsS0FBSyxJQUFJQyxNQUFNLElBQUlKLE9BQU8sRUFBRTtJQUMxQixNQUFNSyxPQUFPLEdBQUdOLGNBQWMsQ0FBQ0ssTUFBTSxDQUFDO0lBQ3RDeEIsSUFBSSxDQUFDTyxNQUFNLENBQUNpQixNQUFNLENBQUM7SUFDbkJ4QixJQUFJLENBQUNPLE1BQU0sQ0FBQ2tCLE9BQU8sQ0FBQztFQUN0QjtFQUVBLE9BQU96QixJQUFJLENBQUNnQixNQUFNLENBQUMsS0FBSyxDQUFDO0FBQzNCLENBQUMsQyIsImZpbGUiOiIvcGFja2FnZXMvd2ViYXBwLWhhc2hpbmcuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBjcmVhdGVIYXNoIH0gZnJvbSBcImNyeXB0b1wiO1xuXG5XZWJBcHBIYXNoaW5nID0ge307XG5cbi8vIENhbGN1bGF0ZSBhIGhhc2ggb2YgYWxsIHRoZSBjbGllbnQgcmVzb3VyY2VzIGRvd25sb2FkZWQgYnkgdGhlXG4vLyBicm93c2VyLCBpbmNsdWRpbmcgdGhlIGFwcGxpY2F0aW9uIEhUTUwsIHJ1bnRpbWUgY29uZmlnLCBjb2RlLCBhbmRcbi8vIHN0YXRpYyBmaWxlcy5cbi8vXG4vLyBUaGlzIGhhc2ggKm11c3QqIGNoYW5nZSBpZiBhbnkgcmVzb3VyY2VzIHNlZW4gYnkgdGhlIGJyb3dzZXJcbi8vIGNoYW5nZSwgYW5kIGlkZWFsbHkgKmRvZXNuJ3QqIGNoYW5nZSBmb3IgYW55IHNlcnZlci1vbmx5IGNoYW5nZXNcbi8vIChidXQgdGhlIHNlY29uZCBpcyBhIHBlcmZvcm1hbmNlIGVuaGFuY2VtZW50LCBub3QgYSBoYXJkXG4vLyByZXF1aXJlbWVudCkuXG5cbldlYkFwcEhhc2hpbmcuY2FsY3VsYXRlQ2xpZW50SGFzaCA9XG4gIGZ1bmN0aW9uIChtYW5pZmVzdCwgaW5jbHVkZUZpbHRlciwgcnVudGltZUNvbmZpZ092ZXJyaWRlKSB7XG4gIHZhciBoYXNoID0gY3JlYXRlSGFzaCgnc2hhMScpO1xuXG4gIC8vIE9taXQgdGhlIG9sZCBoYXNoZWQgY2xpZW50IHZhbHVlcyBpbiB0aGUgbmV3IGhhc2guIFRoZXNlIG1heSBiZVxuICAvLyBtb2RpZmllZCBpbiB0aGUgbmV3IGJvaWxlcnBsYXRlLlxuICB2YXIgeyBhdXRvdXBkYXRlVmVyc2lvbiwgYXV0b3VwZGF0ZVZlcnNpb25SZWZyZXNoYWJsZSwgYXV0b3VwZGF0ZVZlcnNpb25Db3Jkb3ZhLCAuLi5ydW50aW1lQ2ZnIH0gPSBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fO1xuXG4gIGlmIChydW50aW1lQ29uZmlnT3ZlcnJpZGUpIHtcbiAgICBydW50aW1lQ2ZnID0gcnVudGltZUNvbmZpZ092ZXJyaWRlO1xuICB9XG5cbiAgaGFzaC51cGRhdGUoSlNPTi5zdHJpbmdpZnkocnVudGltZUNmZywgJ3V0ZjgnKSk7XG5cbiAgbWFuaWZlc3QuZm9yRWFjaChmdW5jdGlvbiAocmVzb3VyY2UpIHtcbiAgICAgIGlmICgoISBpbmNsdWRlRmlsdGVyIHx8IGluY2x1ZGVGaWx0ZXIocmVzb3VyY2UudHlwZSwgcmVzb3VyY2UucmVwbGFjZWFibGUpKSAmJlxuICAgICAgICAgIChyZXNvdXJjZS53aGVyZSA9PT0gJ2NsaWVudCcgfHwgcmVzb3VyY2Uud2hlcmUgPT09ICdpbnRlcm5hbCcpKSB7XG4gICAgICBoYXNoLnVwZGF0ZShyZXNvdXJjZS5wYXRoKTtcbiAgICAgIGhhc2gudXBkYXRlKHJlc291cmNlLmhhc2gpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBoYXNoLmRpZ2VzdCgnaGV4Jyk7XG59O1xuXG5XZWJBcHBIYXNoaW5nLmNhbGN1bGF0ZUNvcmRvdmFDb21wYXRpYmlsaXR5SGFzaCA9XG4gIGZ1bmN0aW9uKHBsYXRmb3JtVmVyc2lvbiwgcGx1Z2luVmVyc2lvbnMpIHtcbiAgY29uc3QgaGFzaCA9IGNyZWF0ZUhhc2goJ3NoYTEnKTtcblxuICBoYXNoLnVwZGF0ZShwbGF0Zm9ybVZlcnNpb24pO1xuXG4gIC8vIFNvcnQgcGx1Z2lucyBmaXJzdCBzbyBpdGVyYXRpb24gb3JkZXIgZG9lc24ndCBhZmZlY3QgdGhlIGhhc2hcbiAgY29uc3QgcGx1Z2lucyA9IE9iamVjdC5rZXlzKHBsdWdpblZlcnNpb25zKS5zb3J0KCk7XG4gIGZvciAobGV0IHBsdWdpbiBvZiBwbHVnaW5zKSB7XG4gICAgY29uc3QgdmVyc2lvbiA9IHBsdWdpblZlcnNpb25zW3BsdWdpbl07XG4gICAgaGFzaC51cGRhdGUocGx1Z2luKTtcbiAgICBoYXNoLnVwZGF0ZSh2ZXJzaW9uKTtcbiAgfVxuXG4gIHJldHVybiBoYXNoLmRpZ2VzdCgnaGV4Jyk7XG59O1xuIl19
