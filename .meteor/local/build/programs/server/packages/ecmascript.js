(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var Babel = Package['babel-compiler'].Babel;
var BabelCompiler = Package['babel-compiler'].BabelCompiler;
var ReactFastRefresh = Package['react-fast-refresh'].ReactFastRefresh;

/* Package-scope variables */
var ECMAScript;

(function(){

///////////////////////////////////////////////////////////////////////
//                                                                   //
// packages/ecmascript/ecmascript.js                                 //
//                                                                   //
///////////////////////////////////////////////////////////////////////
                                                                     //
ECMAScript = {
  compileForShell(command, cacheOptions) {
    const babelOptions = Babel.getDefaultOptions({
      nodeMajorVersion: parseInt(process.versions.node, 10),
      compileForShell: true
    });
    delete babelOptions.sourceMap;
    delete babelOptions.sourceMaps;
    babelOptions.ast = false;
    return Babel.compile(command, babelOptions, cacheOptions).code;
  }
};
///////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
Package._define("ecmascript", {
  ECMAScript: ECMAScript
});

})();

//# sourceURL=meteor://💻app/packages/ecmascript.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvZWNtYXNjcmlwdC9lY21hc2NyaXB0LmpzIl0sIm5hbWVzIjpbIkVDTUFTY3JpcHQiLCJjb21waWxlRm9yU2hlbGwiLCJjb21tYW5kIiwiY2FjaGVPcHRpb25zIiwiYmFiZWxPcHRpb25zIiwiQmFiZWwiLCJnZXREZWZhdWx0T3B0aW9ucyIsIm5vZGVNYWpvclZlcnNpb24iLCJwYXJzZUludCIsInByb2Nlc3MiLCJ2ZXJzaW9ucyIsIm5vZGUiLCJzb3VyY2VNYXAiLCJzb3VyY2VNYXBzIiwiYXN0IiwiY29tcGlsZSIsImNvZGUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBQSxVQUFVLEdBQUc7RUFDWEMsZUFBZUEsQ0FBQ0MsT0FBTyxFQUFFQyxZQUFZLEVBQUU7SUFDckMsTUFBTUMsWUFBWSxHQUFHQyxLQUFLLENBQUNDLGlCQUFpQixDQUFDO01BQzNDQyxnQkFBZ0IsRUFBRUMsUUFBUSxDQUFDQyxPQUFPLENBQUNDLFFBQVEsQ0FBQ0MsSUFBSSxFQUFFLEVBQUUsQ0FBQztNQUNyRFYsZUFBZSxFQUFFO0lBQ25CLENBQUMsQ0FBQztJQUNGLE9BQU9HLFlBQVksQ0FBQ1EsU0FBUztJQUM3QixPQUFPUixZQUFZLENBQUNTLFVBQVU7SUFDOUJULFlBQVksQ0FBQ1UsR0FBRyxHQUFHLEtBQUs7SUFDeEIsT0FBT1QsS0FBSyxDQUFDVSxPQUFPLENBQUNiLE9BQU8sRUFBRUUsWUFBWSxFQUFFRCxZQUFZLENBQUMsQ0FBQ2EsSUFBSTtFQUNoRTtBQUNGLENBQUMsQyIsImZpbGUiOiIvcGFja2FnZXMvZWNtYXNjcmlwdC5qcyIsInNvdXJjZXNDb250ZW50IjpbIkVDTUFTY3JpcHQgPSB7XG4gIGNvbXBpbGVGb3JTaGVsbChjb21tYW5kLCBjYWNoZU9wdGlvbnMpIHtcbiAgICBjb25zdCBiYWJlbE9wdGlvbnMgPSBCYWJlbC5nZXREZWZhdWx0T3B0aW9ucyh7XG4gICAgICBub2RlTWFqb3JWZXJzaW9uOiBwYXJzZUludChwcm9jZXNzLnZlcnNpb25zLm5vZGUsIDEwKSxcbiAgICAgIGNvbXBpbGVGb3JTaGVsbDogdHJ1ZVxuICAgIH0pO1xuICAgIGRlbGV0ZSBiYWJlbE9wdGlvbnMuc291cmNlTWFwO1xuICAgIGRlbGV0ZSBiYWJlbE9wdGlvbnMuc291cmNlTWFwcztcbiAgICBiYWJlbE9wdGlvbnMuYXN0ID0gZmFsc2U7XG4gICAgcmV0dXJuIEJhYmVsLmNvbXBpbGUoY29tbWFuZCwgYmFiZWxPcHRpb25zLCBjYWNoZU9wdGlvbnMpLmNvZGU7XG4gIH1cbn07XG4iXX0=
