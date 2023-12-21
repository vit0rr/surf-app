(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var Boilerplate;

var require = meteorInstall({"node_modules":{"meteor":{"boilerplate-generator":{"generator.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/boilerplate-generator/generator.js                                                                     //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
let _objectSpread;
module.link("@babel/runtime/helpers/objectSpread2", {
  default(v) {
    _objectSpread = v;
  }
}, 0);
module.export({
  Boilerplate: () => Boilerplate
});
let readFile;
module.link("fs", {
  readFile(v) {
    readFile = v;
  }
}, 0);
let createStream;
module.link("combined-stream2", {
  create(v) {
    createStream = v;
  }
}, 1);
let WebBrowserTemplate;
module.link("./template-web.browser", {
  default(v) {
    WebBrowserTemplate = v;
  }
}, 2);
let WebCordovaTemplate;
module.link("./template-web.cordova", {
  default(v) {
    WebCordovaTemplate = v;
  }
}, 3);
// Copied from webapp_server
const readUtf8FileSync = filename => Meteor.wrapAsync(readFile)(filename, 'utf8');
const identity = value => value;
function appendToStream(chunk, stream) {
  if (typeof chunk === "string") {
    stream.append(Buffer.from(chunk, "utf8"));
  } else if (Buffer.isBuffer(chunk) || typeof chunk.read === "function") {
    stream.append(chunk);
  }
}
let shouldWarnAboutToHTMLDeprecation = !Meteor.isProduction;
class Boilerplate {
  constructor(arch, manifest) {
    let options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    const {
      headTemplate,
      closeTemplate
    } = getTemplate(arch);
    this.headTemplate = headTemplate;
    this.closeTemplate = closeTemplate;
    this.baseData = null;
    this._generateBoilerplateFromManifest(manifest, options);
  }
  toHTML(extraData) {
    if (shouldWarnAboutToHTMLDeprecation) {
      shouldWarnAboutToHTMLDeprecation = false;
      console.error("The Boilerplate#toHTML method has been deprecated. " + "Please use Boilerplate#toHTMLStream instead.");
      console.trace();
    }

    // Calling .await() requires a Fiber.
    return this.toHTMLAsync(extraData).await();
  }

  // Returns a Promise that resolves to a string of HTML.
  toHTMLAsync(extraData) {
    return new Promise((resolve, reject) => {
      const stream = this.toHTMLStream(extraData);
      const chunks = [];
      stream.on("data", chunk => chunks.push(chunk));
      stream.on("end", () => {
        resolve(Buffer.concat(chunks).toString("utf8"));
      });
      stream.on("error", reject);
    });
  }

  // The 'extraData' argument can be used to extend 'self.baseData'. Its
  // purpose is to allow you to specify data that you might not know at
  // the time that you construct the Boilerplate object. (e.g. it is used
  // by 'webapp' to specify data that is only known at request-time).
  // this returns a stream
  toHTMLStream(extraData) {
    if (!this.baseData || !this.headTemplate || !this.closeTemplate) {
      throw new Error('Boilerplate did not instantiate correctly.');
    }
    const data = _objectSpread(_objectSpread({}, this.baseData), extraData);
    const start = "<!DOCTYPE html>\n" + this.headTemplate(data);
    const {
      body,
      dynamicBody
    } = data;
    const end = this.closeTemplate(data);
    const response = createStream();
    appendToStream(start, response);
    if (body) {
      appendToStream(body, response);
    }
    if (dynamicBody) {
      appendToStream(dynamicBody, response);
    }
    appendToStream(end, response);
    return response;
  }

  // XXX Exported to allow client-side only changes to rebuild the boilerplate
  // without requiring a full server restart.
  // Produces an HTML string with given manifest and boilerplateSource.
  // Optionally takes urlMapper in case urls from manifest need to be prefixed
  // or rewritten.
  // Optionally takes pathMapper for resolving relative file system paths.
  // Optionally allows to override fields of the data context.
  _generateBoilerplateFromManifest(manifest) {
    let {
      urlMapper = identity,
      pathMapper = identity,
      baseDataExtension,
      inline
    } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    const boilerplateBaseData = _objectSpread({
      css: [],
      js: [],
      head: '',
      body: '',
      meteorManifest: JSON.stringify(manifest)
    }, baseDataExtension);
    manifest.forEach(item => {
      const urlPath = urlMapper(item.url);
      const itemObj = {
        url: urlPath
      };
      if (inline) {
        itemObj.scriptContent = readUtf8FileSync(pathMapper(item.path));
        itemObj.inline = true;
      } else if (item.sri) {
        itemObj.sri = item.sri;
      }
      if (item.type === 'css' && item.where === 'client') {
        boilerplateBaseData.css.push(itemObj);
      }
      if (item.type === 'js' && item.where === 'client' &&
      // Dynamic JS modules should not be loaded eagerly in the
      // initial HTML of the app.
      !item.path.startsWith('dynamic/')) {
        boilerplateBaseData.js.push(itemObj);
      }
      if (item.type === 'head') {
        boilerplateBaseData.head = readUtf8FileSync(pathMapper(item.path));
      }
      if (item.type === 'body') {
        boilerplateBaseData.body = readUtf8FileSync(pathMapper(item.path));
      }
    });
    this.baseData = boilerplateBaseData;
  }
}
;

// Returns a template function that, when called, produces the boilerplate
// html as a string.
function getTemplate(arch) {
  const prefix = arch.split(".", 2).join(".");
  if (prefix === "web.browser") {
    return WebBrowserTemplate;
  }
  if (prefix === "web.cordova") {
    return WebCordovaTemplate;
  }
  throw new Error("Unsupported arch: " + arch);
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"template-web.browser.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/boilerplate-generator/template-web.browser.js                                                          //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
module.export({
  headTemplate: () => headTemplate,
  closeTemplate: () => closeTemplate
});
let template;
module.link("./template", {
  default(v) {
    template = v;
  }
}, 0);
const sri = (sri, mode) => sri && mode ? " integrity=\"sha512-".concat(sri, "\" crossorigin=\"").concat(mode, "\"") : '';
const headTemplate = _ref => {
  let {
    css,
    htmlAttributes,
    bundledJsCssUrlRewriteHook,
    sriMode,
    head,
    dynamicHead
  } = _ref;
  var headSections = head.split(/<meteor-bundled-css[^<>]*>/, 2);
  var cssBundle = [...(css || []).map(file => template('  <link rel="stylesheet" type="text/css" class="__meteor-css__" href="<%- href %>"<%= sri %>>')({
    href: bundledJsCssUrlRewriteHook(file.url),
    sri: sri(file.sri, sriMode)
  }))].join('\n');
  return ['<html' + Object.keys(htmlAttributes || {}).map(key => template(' <%= attrName %>="<%- attrValue %>"')({
    attrName: key,
    attrValue: htmlAttributes[key]
  })).join('') + '>', '<head>', headSections.length === 1 ? [cssBundle, headSections[0]].join('\n') : [headSections[0], cssBundle, headSections[1]].join('\n'), dynamicHead, '</head>', '<body>'].join('\n');
};
const closeTemplate = _ref2 => {
  let {
    meteorRuntimeConfig,
    meteorRuntimeHash,
    rootUrlPathPrefix,
    inlineScriptsAllowed,
    js,
    additionalStaticJs,
    bundledJsCssUrlRewriteHook,
    sriMode
  } = _ref2;
  return ['', inlineScriptsAllowed ? template('  <script type="text/javascript">__meteor_runtime_config__ = JSON.parse(decodeURIComponent(<%= conf %>))</script>')({
    conf: meteorRuntimeConfig
  }) : template('  <script type="text/javascript" src="<%- src %>/meteor_runtime_config.js?hash=<%- hash %>"></script>')({
    src: rootUrlPathPrefix,
    hash: meteorRuntimeHash
  }), '', ...(js || []).map(file => template('  <script type="text/javascript" src="<%- src %>"<%= sri %>></script>')({
    src: bundledJsCssUrlRewriteHook(file.url),
    sri: sri(file.sri, sriMode)
  })), ...(additionalStaticJs || []).map(_ref3 => {
    let {
      contents,
      pathname
    } = _ref3;
    return inlineScriptsAllowed ? template('  <script><%= contents %></script>')({
      contents
    }) : template('  <script type="text/javascript" src="<%- src %>"></script>')({
      src: rootUrlPathPrefix + pathname
    });
  }), '', '', '</body>', '</html>'].join('\n');
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"template-web.cordova.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/boilerplate-generator/template-web.cordova.js                                                          //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
module.export({
  headTemplate: () => headTemplate,
  closeTemplate: () => closeTemplate
});
let template;
module.link("./template", {
  default(v) {
    template = v;
  }
}, 0);
const headTemplate = _ref => {
  let {
    meteorRuntimeConfig,
    rootUrlPathPrefix,
    inlineScriptsAllowed,
    css,
    js,
    additionalStaticJs,
    htmlAttributes,
    bundledJsCssUrlRewriteHook,
    head,
    dynamicHead
  } = _ref;
  var headSections = head.split(/<meteor-bundled-css[^<>]*>/, 2);
  var cssBundle = [
  // We are explicitly not using bundledJsCssUrlRewriteHook: in cordova we serve assets up directly from disk, so rewriting the URL does not make sense
  ...(css || []).map(file => template('  <link rel="stylesheet" type="text/css" class="__meteor-css__" href="<%- href %>">')({
    href: file.url
  }))].join('\n');
  return ['<html>', '<head>', '  <meta charset="utf-8">', '  <meta name="format-detection" content="telephone=no">', '  <meta name="viewport" content="user-scalable=no, initial-scale=1, maximum-scale=1, minimum-scale=1, width=device-width, height=device-height, viewport-fit=cover">', '  <meta name="msapplication-tap-highlight" content="no">', '  <meta http-equiv="Content-Security-Policy" content="default-src * android-webview-video-poster: gap: data: blob: \'unsafe-inline\' \'unsafe-eval\' ws: wss:;">', headSections.length === 1 ? [cssBundle, headSections[0]].join('\n') : [headSections[0], cssBundle, headSections[1]].join('\n'), '  <script type="text/javascript">', template('    __meteor_runtime_config__ = JSON.parse(decodeURIComponent(<%= conf %>));')({
    conf: meteorRuntimeConfig
  }), '    if (/Android/i.test(navigator.userAgent)) {',
  // When Android app is emulated, it cannot connect to localhost,
  // instead it should connect to 10.0.2.2
  // (unless we\'re using an http proxy; then it works!)
  '      if (!__meteor_runtime_config__.httpProxyPort) {', '        __meteor_runtime_config__.ROOT_URL = (__meteor_runtime_config__.ROOT_URL || \'\').replace(/localhost/i, \'10.0.2.2\');', '        __meteor_runtime_config__.DDP_DEFAULT_CONNECTION_URL = (__meteor_runtime_config__.DDP_DEFAULT_CONNECTION_URL || \'\').replace(/localhost/i, \'10.0.2.2\');', '      }', '    }', '  </script>', '', '  <script type="text/javascript" src="/cordova.js"></script>', ...(js || []).map(file => template('  <script type="text/javascript" src="<%- src %>"></script>')({
    src: file.url
  })), ...(additionalStaticJs || []).map(_ref2 => {
    let {
      contents,
      pathname
    } = _ref2;
    return inlineScriptsAllowed ? template('  <script><%= contents %></script>')({
      contents
    }) : template('  <script type="text/javascript" src="<%- src %>"></script>')({
      src: rootUrlPathPrefix + pathname
    });
  }), '', '</head>', '', '<body>'].join('\n');
};
function closeTemplate() {
  return "</body>\n</html>";
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"template.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/boilerplate-generator/template.js                                                                      //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
module.export({
  default: () => template
});
let lodashTemplate;
module.link("lodash.template", {
  default(v) {
    lodashTemplate = v;
  }
}, 0);
function template(text) {
  return lodashTemplate(text, null, {
    evaluate: /<%([\s\S]+?)%>/g,
    interpolate: /<%=([\s\S]+?)%>/g,
    escape: /<%-([\s\S]+?)%>/g
  });
}
;
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"node_modules":{"combined-stream2":{"package.json":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// node_modules/meteor/boilerplate-generator/node_modules/combined-stream2/package.json                            //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
module.exports = {
  "name": "combined-stream2",
  "version": "1.1.2",
  "main": "index.js"
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// node_modules/meteor/boilerplate-generator/node_modules/combined-stream2/index.js                                //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"lodash.template":{"package.json":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// node_modules/meteor/boilerplate-generator/node_modules/lodash.template/package.json                             //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
module.exports = {
  "name": "lodash.template",
  "version": "4.5.0"
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// node_modules/meteor/boilerplate-generator/node_modules/lodash.template/index.js                                 //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

var exports = require("/node_modules/meteor/boilerplate-generator/generator.js");

/* Exports */
Package._define("boilerplate-generator", exports, {
  Boilerplate: Boilerplate
});

})();

//# sourceURL=meteor://💻app/packages/boilerplate-generator.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvYm9pbGVycGxhdGUtZ2VuZXJhdG9yL2dlbmVyYXRvci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvYm9pbGVycGxhdGUtZ2VuZXJhdG9yL3RlbXBsYXRlLXdlYi5icm93c2VyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9ib2lsZXJwbGF0ZS1nZW5lcmF0b3IvdGVtcGxhdGUtd2ViLmNvcmRvdmEuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL2JvaWxlcnBsYXRlLWdlbmVyYXRvci90ZW1wbGF0ZS5qcyJdLCJuYW1lcyI6WyJfb2JqZWN0U3ByZWFkIiwibW9kdWxlIiwibGluayIsImRlZmF1bHQiLCJ2IiwiZXhwb3J0IiwiQm9pbGVycGxhdGUiLCJyZWFkRmlsZSIsImNyZWF0ZVN0cmVhbSIsImNyZWF0ZSIsIldlYkJyb3dzZXJUZW1wbGF0ZSIsIldlYkNvcmRvdmFUZW1wbGF0ZSIsInJlYWRVdGY4RmlsZVN5bmMiLCJmaWxlbmFtZSIsIk1ldGVvciIsIndyYXBBc3luYyIsImlkZW50aXR5IiwidmFsdWUiLCJhcHBlbmRUb1N0cmVhbSIsImNodW5rIiwic3RyZWFtIiwiYXBwZW5kIiwiQnVmZmVyIiwiZnJvbSIsImlzQnVmZmVyIiwicmVhZCIsInNob3VsZFdhcm5BYm91dFRvSFRNTERlcHJlY2F0aW9uIiwiaXNQcm9kdWN0aW9uIiwiY29uc3RydWN0b3IiLCJhcmNoIiwibWFuaWZlc3QiLCJvcHRpb25zIiwiYXJndW1lbnRzIiwibGVuZ3RoIiwidW5kZWZpbmVkIiwiaGVhZFRlbXBsYXRlIiwiY2xvc2VUZW1wbGF0ZSIsImdldFRlbXBsYXRlIiwiYmFzZURhdGEiLCJfZ2VuZXJhdGVCb2lsZXJwbGF0ZUZyb21NYW5pZmVzdCIsInRvSFRNTCIsImV4dHJhRGF0YSIsImNvbnNvbGUiLCJlcnJvciIsInRyYWNlIiwidG9IVE1MQXN5bmMiLCJhd2FpdCIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwidG9IVE1MU3RyZWFtIiwiY2h1bmtzIiwib24iLCJwdXNoIiwiY29uY2F0IiwidG9TdHJpbmciLCJFcnJvciIsImRhdGEiLCJzdGFydCIsImJvZHkiLCJkeW5hbWljQm9keSIsImVuZCIsInJlc3BvbnNlIiwidXJsTWFwcGVyIiwicGF0aE1hcHBlciIsImJhc2VEYXRhRXh0ZW5zaW9uIiwiaW5saW5lIiwiYm9pbGVycGxhdGVCYXNlRGF0YSIsImNzcyIsImpzIiwiaGVhZCIsIm1ldGVvck1hbmlmZXN0IiwiSlNPTiIsInN0cmluZ2lmeSIsImZvckVhY2giLCJpdGVtIiwidXJsUGF0aCIsInVybCIsIml0ZW1PYmoiLCJzY3JpcHRDb250ZW50IiwicGF0aCIsInNyaSIsInR5cGUiLCJ3aGVyZSIsInN0YXJ0c1dpdGgiLCJwcmVmaXgiLCJzcGxpdCIsImpvaW4iLCJ0ZW1wbGF0ZSIsIm1vZGUiLCJfcmVmIiwiaHRtbEF0dHJpYnV0ZXMiLCJidW5kbGVkSnNDc3NVcmxSZXdyaXRlSG9vayIsInNyaU1vZGUiLCJkeW5hbWljSGVhZCIsImhlYWRTZWN0aW9ucyIsImNzc0J1bmRsZSIsIm1hcCIsImZpbGUiLCJocmVmIiwiT2JqZWN0Iiwia2V5cyIsImtleSIsImF0dHJOYW1lIiwiYXR0clZhbHVlIiwiX3JlZjIiLCJtZXRlb3JSdW50aW1lQ29uZmlnIiwibWV0ZW9yUnVudGltZUhhc2giLCJyb290VXJsUGF0aFByZWZpeCIsImlubGluZVNjcmlwdHNBbGxvd2VkIiwiYWRkaXRpb25hbFN0YXRpY0pzIiwiY29uZiIsInNyYyIsImhhc2giLCJfcmVmMyIsImNvbnRlbnRzIiwicGF0aG5hbWUiLCJsb2Rhc2hUZW1wbGF0ZSIsInRleHQiLCJldmFsdWF0ZSIsImludGVycG9sYXRlIiwiZXNjYXBlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxJQUFJQSxhQUFhO0FBQUNDLE1BQU0sQ0FBQ0MsSUFBSSxDQUFDLHNDQUFzQyxFQUFDO0VBQUNDLE9BQU9BLENBQUND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QUM7RUFBQ0MsT0FBT0EsQ0FBQ0MsQ0FBQyxFQUFDO0lBQUNpSCxjQUFjLEdBQUNqSCxDQUFDO0VBQUE7QUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDO0FBT3pHLFNBQVNvRixRQUFRQSxDQUFDOEIsSUFBSSxFQUFFO0VBQ3JDLE9BQU9ELGNBQWMsQ0FBQ0MsSUFBSSxFQUFFLElBQUksRUFBRTtJQUNoQ0MsUUFBUSxFQUFNLGlCQUFpQjtJQUMvQkMsV0FBVyxFQUFHLGtCQUFrQjtJQUNoQ0MsTUFBTSxFQUFRO0VBQ2hCLENBQUMsQ0FBQztBQUNKO0FBQUMsQyIsImZpbGUiOiIvcGFja2FnZXMvYm9pbGVycGxhdGUtZ2VuZXJhdG9yLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgcmVhZEZpbGUgfSBmcm9tICdmcyc7XG5pbXBvcnQgeyBjcmVhdGUgYXMgY3JlYXRlU3RyZWFtIH0gZnJvbSBcImNvbWJpbmVkLXN0cmVhbTJcIjtcblxuaW1wb3J0IFdlYkJyb3dzZXJUZW1wbGF0ZSBmcm9tICcuL3RlbXBsYXRlLXdlYi5icm93c2VyJztcbmltcG9ydCBXZWJDb3Jkb3ZhVGVtcGxhdGUgZnJvbSAnLi90ZW1wbGF0ZS13ZWIuY29yZG92YSc7XG5cbi8vIENvcGllZCBmcm9tIHdlYmFwcF9zZXJ2ZXJcbmNvbnN0IHJlYWRVdGY4RmlsZVN5bmMgPSBmaWxlbmFtZSA9PiBNZXRlb3Iud3JhcEFzeW5jKHJlYWRGaWxlKShmaWxlbmFtZSwgJ3V0ZjgnKTtcblxuY29uc3QgaWRlbnRpdHkgPSB2YWx1ZSA9PiB2YWx1ZTtcblxuZnVuY3Rpb24gYXBwZW5kVG9TdHJlYW0oY2h1bmssIHN0cmVhbSkge1xuICBpZiAodHlwZW9mIGNodW5rID09PSBcInN0cmluZ1wiKSB7XG4gICAgc3RyZWFtLmFwcGVuZChCdWZmZXIuZnJvbShjaHVuaywgXCJ1dGY4XCIpKTtcbiAgfSBlbHNlIGlmIChCdWZmZXIuaXNCdWZmZXIoY2h1bmspIHx8XG4gICAgICAgICAgICAgdHlwZW9mIGNodW5rLnJlYWQgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIHN0cmVhbS5hcHBlbmQoY2h1bmspO1xuICB9XG59XG5cbmxldCBzaG91bGRXYXJuQWJvdXRUb0hUTUxEZXByZWNhdGlvbiA9ICEgTWV0ZW9yLmlzUHJvZHVjdGlvbjtcblxuZXhwb3J0IGNsYXNzIEJvaWxlcnBsYXRlIHtcbiAgY29uc3RydWN0b3IoYXJjaCwgbWFuaWZlc3QsIG9wdGlvbnMgPSB7fSkge1xuICAgIGNvbnN0IHsgaGVhZFRlbXBsYXRlLCBjbG9zZVRlbXBsYXRlIH0gPSBnZXRUZW1wbGF0ZShhcmNoKTtcbiAgICB0aGlzLmhlYWRUZW1wbGF0ZSA9IGhlYWRUZW1wbGF0ZTtcbiAgICB0aGlzLmNsb3NlVGVtcGxhdGUgPSBjbG9zZVRlbXBsYXRlO1xuICAgIHRoaXMuYmFzZURhdGEgPSBudWxsO1xuXG4gICAgdGhpcy5fZ2VuZXJhdGVCb2lsZXJwbGF0ZUZyb21NYW5pZmVzdChcbiAgICAgIG1hbmlmZXN0LFxuICAgICAgb3B0aW9uc1xuICAgICk7XG4gIH1cblxuICB0b0hUTUwoZXh0cmFEYXRhKSB7XG4gICAgaWYgKHNob3VsZFdhcm5BYm91dFRvSFRNTERlcHJlY2F0aW9uKSB7XG4gICAgICBzaG91bGRXYXJuQWJvdXRUb0hUTUxEZXByZWNhdGlvbiA9IGZhbHNlO1xuICAgICAgY29uc29sZS5lcnJvcihcbiAgICAgICAgXCJUaGUgQm9pbGVycGxhdGUjdG9IVE1MIG1ldGhvZCBoYXMgYmVlbiBkZXByZWNhdGVkLiBcIiArXG4gICAgICAgICAgXCJQbGVhc2UgdXNlIEJvaWxlcnBsYXRlI3RvSFRNTFN0cmVhbSBpbnN0ZWFkLlwiXG4gICAgICApO1xuICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgIH1cblxuICAgIC8vIENhbGxpbmcgLmF3YWl0KCkgcmVxdWlyZXMgYSBGaWJlci5cbiAgICByZXR1cm4gdGhpcy50b0hUTUxBc3luYyhleHRyYURhdGEpLmF3YWl0KCk7XG4gIH1cblxuICAvLyBSZXR1cm5zIGEgUHJvbWlzZSB0aGF0IHJlc29sdmVzIHRvIGEgc3RyaW5nIG9mIEhUTUwuXG4gIHRvSFRNTEFzeW5jKGV4dHJhRGF0YSkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zdCBzdHJlYW0gPSB0aGlzLnRvSFRNTFN0cmVhbShleHRyYURhdGEpO1xuICAgICAgY29uc3QgY2h1bmtzID0gW107XG4gICAgICBzdHJlYW0ub24oXCJkYXRhXCIsIGNodW5rID0+IGNodW5rcy5wdXNoKGNodW5rKSk7XG4gICAgICBzdHJlYW0ub24oXCJlbmRcIiwgKCkgPT4ge1xuICAgICAgICByZXNvbHZlKEJ1ZmZlci5jb25jYXQoY2h1bmtzKS50b1N0cmluZyhcInV0ZjhcIikpO1xuICAgICAgfSk7XG4gICAgICBzdHJlYW0ub24oXCJlcnJvclwiLCByZWplY3QpO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gVGhlICdleHRyYURhdGEnIGFyZ3VtZW50IGNhbiBiZSB1c2VkIHRvIGV4dGVuZCAnc2VsZi5iYXNlRGF0YScuIEl0c1xuICAvLyBwdXJwb3NlIGlzIHRvIGFsbG93IHlvdSB0byBzcGVjaWZ5IGRhdGEgdGhhdCB5b3UgbWlnaHQgbm90IGtub3cgYXRcbiAgLy8gdGhlIHRpbWUgdGhhdCB5b3UgY29uc3RydWN0IHRoZSBCb2lsZXJwbGF0ZSBvYmplY3QuIChlLmcuIGl0IGlzIHVzZWRcbiAgLy8gYnkgJ3dlYmFwcCcgdG8gc3BlY2lmeSBkYXRhIHRoYXQgaXMgb25seSBrbm93biBhdCByZXF1ZXN0LXRpbWUpLlxuICAvLyB0aGlzIHJldHVybnMgYSBzdHJlYW1cbiAgdG9IVE1MU3RyZWFtKGV4dHJhRGF0YSkge1xuICAgIGlmICghdGhpcy5iYXNlRGF0YSB8fCAhdGhpcy5oZWFkVGVtcGxhdGUgfHwgIXRoaXMuY2xvc2VUZW1wbGF0ZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdCb2lsZXJwbGF0ZSBkaWQgbm90IGluc3RhbnRpYXRlIGNvcnJlY3RseS4nKTtcbiAgICB9XG5cbiAgICBjb25zdCBkYXRhID0gey4uLnRoaXMuYmFzZURhdGEsIC4uLmV4dHJhRGF0YX07XG4gICAgY29uc3Qgc3RhcnQgPSBcIjwhRE9DVFlQRSBodG1sPlxcblwiICsgdGhpcy5oZWFkVGVtcGxhdGUoZGF0YSk7XG5cbiAgICBjb25zdCB7IGJvZHksIGR5bmFtaWNCb2R5IH0gPSBkYXRhO1xuXG4gICAgY29uc3QgZW5kID0gdGhpcy5jbG9zZVRlbXBsYXRlKGRhdGEpO1xuICAgIGNvbnN0IHJlc3BvbnNlID0gY3JlYXRlU3RyZWFtKCk7XG5cbiAgICBhcHBlbmRUb1N0cmVhbShzdGFydCwgcmVzcG9uc2UpO1xuXG4gICAgaWYgKGJvZHkpIHtcbiAgICAgIGFwcGVuZFRvU3RyZWFtKGJvZHksIHJlc3BvbnNlKTtcbiAgICB9XG5cbiAgICBpZiAoZHluYW1pY0JvZHkpIHtcbiAgICAgIGFwcGVuZFRvU3RyZWFtKGR5bmFtaWNCb2R5LCByZXNwb25zZSk7XG4gICAgfVxuXG4gICAgYXBwZW5kVG9TdHJlYW0oZW5kLCByZXNwb25zZSk7XG5cbiAgICByZXR1cm4gcmVzcG9uc2U7XG4gIH1cblxuICAvLyBYWFggRXhwb3J0ZWQgdG8gYWxsb3cgY2xpZW50LXNpZGUgb25seSBjaGFuZ2VzIHRvIHJlYnVpbGQgdGhlIGJvaWxlcnBsYXRlXG4gIC8vIHdpdGhvdXQgcmVxdWlyaW5nIGEgZnVsbCBzZXJ2ZXIgcmVzdGFydC5cbiAgLy8gUHJvZHVjZXMgYW4gSFRNTCBzdHJpbmcgd2l0aCBnaXZlbiBtYW5pZmVzdCBhbmQgYm9pbGVycGxhdGVTb3VyY2UuXG4gIC8vIE9wdGlvbmFsbHkgdGFrZXMgdXJsTWFwcGVyIGluIGNhc2UgdXJscyBmcm9tIG1hbmlmZXN0IG5lZWQgdG8gYmUgcHJlZml4ZWRcbiAgLy8gb3IgcmV3cml0dGVuLlxuICAvLyBPcHRpb25hbGx5IHRha2VzIHBhdGhNYXBwZXIgZm9yIHJlc29sdmluZyByZWxhdGl2ZSBmaWxlIHN5c3RlbSBwYXRocy5cbiAgLy8gT3B0aW9uYWxseSBhbGxvd3MgdG8gb3ZlcnJpZGUgZmllbGRzIG9mIHRoZSBkYXRhIGNvbnRleHQuXG4gIF9nZW5lcmF0ZUJvaWxlcnBsYXRlRnJvbU1hbmlmZXN0KG1hbmlmZXN0LCB7XG4gICAgdXJsTWFwcGVyID0gaWRlbnRpdHksXG4gICAgcGF0aE1hcHBlciA9IGlkZW50aXR5LFxuICAgIGJhc2VEYXRhRXh0ZW5zaW9uLFxuICAgIGlubGluZSxcbiAgfSA9IHt9KSB7XG5cbiAgICBjb25zdCBib2lsZXJwbGF0ZUJhc2VEYXRhID0ge1xuICAgICAgY3NzOiBbXSxcbiAgICAgIGpzOiBbXSxcbiAgICAgIGhlYWQ6ICcnLFxuICAgICAgYm9keTogJycsXG4gICAgICBtZXRlb3JNYW5pZmVzdDogSlNPTi5zdHJpbmdpZnkobWFuaWZlc3QpLFxuICAgICAgLi4uYmFzZURhdGFFeHRlbnNpb24sXG4gICAgfTtcblxuICAgIG1hbmlmZXN0LmZvckVhY2goaXRlbSA9PiB7XG4gICAgICBjb25zdCB1cmxQYXRoID0gdXJsTWFwcGVyKGl0ZW0udXJsKTtcbiAgICAgIGNvbnN0IGl0ZW1PYmogPSB7IHVybDogdXJsUGF0aCB9O1xuXG4gICAgICBpZiAoaW5saW5lKSB7XG4gICAgICAgIGl0ZW1PYmouc2NyaXB0Q29udGVudCA9IHJlYWRVdGY4RmlsZVN5bmMoXG4gICAgICAgICAgcGF0aE1hcHBlcihpdGVtLnBhdGgpKTtcbiAgICAgICAgaXRlbU9iai5pbmxpbmUgPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChpdGVtLnNyaSkge1xuICAgICAgICBpdGVtT2JqLnNyaSA9IGl0ZW0uc3JpO1xuICAgICAgfVxuXG4gICAgICBpZiAoaXRlbS50eXBlID09PSAnY3NzJyAmJiBpdGVtLndoZXJlID09PSAnY2xpZW50Jykge1xuICAgICAgICBib2lsZXJwbGF0ZUJhc2VEYXRhLmNzcy5wdXNoKGl0ZW1PYmopO1xuICAgICAgfVxuXG4gICAgICBpZiAoaXRlbS50eXBlID09PSAnanMnICYmIGl0ZW0ud2hlcmUgPT09ICdjbGllbnQnICYmXG4gICAgICAgIC8vIER5bmFtaWMgSlMgbW9kdWxlcyBzaG91bGQgbm90IGJlIGxvYWRlZCBlYWdlcmx5IGluIHRoZVxuICAgICAgICAvLyBpbml0aWFsIEhUTUwgb2YgdGhlIGFwcC5cbiAgICAgICAgIWl0ZW0ucGF0aC5zdGFydHNXaXRoKCdkeW5hbWljLycpKSB7XG4gICAgICAgIGJvaWxlcnBsYXRlQmFzZURhdGEuanMucHVzaChpdGVtT2JqKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGl0ZW0udHlwZSA9PT0gJ2hlYWQnKSB7XG4gICAgICAgIGJvaWxlcnBsYXRlQmFzZURhdGEuaGVhZCA9XG4gICAgICAgICAgcmVhZFV0ZjhGaWxlU3luYyhwYXRoTWFwcGVyKGl0ZW0ucGF0aCkpO1xuICAgICAgfVxuXG4gICAgICBpZiAoaXRlbS50eXBlID09PSAnYm9keScpIHtcbiAgICAgICAgYm9pbGVycGxhdGVCYXNlRGF0YS5ib2R5ID1cbiAgICAgICAgICByZWFkVXRmOEZpbGVTeW5jKHBhdGhNYXBwZXIoaXRlbS5wYXRoKSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB0aGlzLmJhc2VEYXRhID0gYm9pbGVycGxhdGVCYXNlRGF0YTtcbiAgfVxufTtcblxuLy8gUmV0dXJucyBhIHRlbXBsYXRlIGZ1bmN0aW9uIHRoYXQsIHdoZW4gY2FsbGVkLCBwcm9kdWNlcyB0aGUgYm9pbGVycGxhdGVcbi8vIGh0bWwgYXMgYSBzdHJpbmcuXG5mdW5jdGlvbiBnZXRUZW1wbGF0ZShhcmNoKSB7XG4gIGNvbnN0IHByZWZpeCA9IGFyY2guc3BsaXQoXCIuXCIsIDIpLmpvaW4oXCIuXCIpO1xuXG4gIGlmIChwcmVmaXggPT09IFwid2ViLmJyb3dzZXJcIikge1xuICAgIHJldHVybiBXZWJCcm93c2VyVGVtcGxhdGU7XG4gIH1cblxuICBpZiAocHJlZml4ID09PSBcIndlYi5jb3Jkb3ZhXCIpIHtcbiAgICByZXR1cm4gV2ViQ29yZG92YVRlbXBsYXRlO1xuICB9XG5cbiAgdGhyb3cgbmV3IEVycm9yKFwiVW5zdXBwb3J0ZWQgYXJjaDogXCIgKyBhcmNoKTtcbn1cbiIsImltcG9ydCB0ZW1wbGF0ZSBmcm9tICcuL3RlbXBsYXRlJztcblxuY29uc3Qgc3JpID0gKHNyaSwgbW9kZSkgPT5cbiAgKHNyaSAmJiBtb2RlKSA/IGAgaW50ZWdyaXR5PVwic2hhNTEyLSR7c3JpfVwiIGNyb3Nzb3JpZ2luPVwiJHttb2RlfVwiYCA6ICcnO1xuXG5leHBvcnQgY29uc3QgaGVhZFRlbXBsYXRlID0gKHtcbiAgY3NzLFxuICBodG1sQXR0cmlidXRlcyxcbiAgYnVuZGxlZEpzQ3NzVXJsUmV3cml0ZUhvb2ssXG4gIHNyaU1vZGUsXG4gIGhlYWQsXG4gIGR5bmFtaWNIZWFkLFxufSkgPT4ge1xuICB2YXIgaGVhZFNlY3Rpb25zID0gaGVhZC5zcGxpdCgvPG1ldGVvci1idW5kbGVkLWNzc1tePD5dKj4vLCAyKTtcbiAgdmFyIGNzc0J1bmRsZSA9IFsuLi4oY3NzIHx8IFtdKS5tYXAoZmlsZSA9PlxuICAgIHRlbXBsYXRlKCcgIDxsaW5rIHJlbD1cInN0eWxlc2hlZXRcIiB0eXBlPVwidGV4dC9jc3NcIiBjbGFzcz1cIl9fbWV0ZW9yLWNzc19fXCIgaHJlZj1cIjwlLSBocmVmICU+XCI8JT0gc3JpICU+PicpKHtcbiAgICAgIGhyZWY6IGJ1bmRsZWRKc0Nzc1VybFJld3JpdGVIb29rKGZpbGUudXJsKSxcbiAgICAgIHNyaTogc3JpKGZpbGUuc3JpLCBzcmlNb2RlKSxcbiAgICB9KVxuICApXS5qb2luKCdcXG4nKTtcblxuICByZXR1cm4gW1xuICAgICc8aHRtbCcgKyBPYmplY3Qua2V5cyhodG1sQXR0cmlidXRlcyB8fCB7fSkubWFwKFxuICAgICAga2V5ID0+IHRlbXBsYXRlKCcgPCU9IGF0dHJOYW1lICU+PVwiPCUtIGF0dHJWYWx1ZSAlPlwiJykoe1xuICAgICAgICBhdHRyTmFtZToga2V5LFxuICAgICAgICBhdHRyVmFsdWU6IGh0bWxBdHRyaWJ1dGVzW2tleV0sXG4gICAgICB9KVxuICAgICkuam9pbignJykgKyAnPicsXG5cbiAgICAnPGhlYWQ+JyxcblxuICAgIChoZWFkU2VjdGlvbnMubGVuZ3RoID09PSAxKVxuICAgICAgPyBbY3NzQnVuZGxlLCBoZWFkU2VjdGlvbnNbMF1dLmpvaW4oJ1xcbicpXG4gICAgICA6IFtoZWFkU2VjdGlvbnNbMF0sIGNzc0J1bmRsZSwgaGVhZFNlY3Rpb25zWzFdXS5qb2luKCdcXG4nKSxcblxuICAgIGR5bmFtaWNIZWFkLFxuICAgICc8L2hlYWQ+JyxcbiAgICAnPGJvZHk+JyxcbiAgXS5qb2luKCdcXG4nKTtcbn07XG5cbi8vIFRlbXBsYXRlIGZ1bmN0aW9uIGZvciByZW5kZXJpbmcgdGhlIGJvaWxlcnBsYXRlIGh0bWwgZm9yIGJyb3dzZXJzXG5leHBvcnQgY29uc3QgY2xvc2VUZW1wbGF0ZSA9ICh7XG4gIG1ldGVvclJ1bnRpbWVDb25maWcsXG4gIG1ldGVvclJ1bnRpbWVIYXNoLFxuICByb290VXJsUGF0aFByZWZpeCxcbiAgaW5saW5lU2NyaXB0c0FsbG93ZWQsXG4gIGpzLFxuICBhZGRpdGlvbmFsU3RhdGljSnMsXG4gIGJ1bmRsZWRKc0Nzc1VybFJld3JpdGVIb29rLFxuICBzcmlNb2RlLFxufSkgPT4gW1xuICAnJyxcbiAgaW5saW5lU2NyaXB0c0FsbG93ZWRcbiAgICA/IHRlbXBsYXRlKCcgIDxzY3JpcHQgdHlwZT1cInRleHQvamF2YXNjcmlwdFwiPl9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18gPSBKU09OLnBhcnNlKGRlY29kZVVSSUNvbXBvbmVudCg8JT0gY29uZiAlPikpPC9zY3JpcHQ+Jykoe1xuICAgICAgY29uZjogbWV0ZW9yUnVudGltZUNvbmZpZyxcbiAgICB9KVxuICAgIDogdGVtcGxhdGUoJyAgPHNjcmlwdCB0eXBlPVwidGV4dC9qYXZhc2NyaXB0XCIgc3JjPVwiPCUtIHNyYyAlPi9tZXRlb3JfcnVudGltZV9jb25maWcuanM/aGFzaD08JS0gaGFzaCAlPlwiPjwvc2NyaXB0PicpKHtcbiAgICAgIHNyYzogcm9vdFVybFBhdGhQcmVmaXgsXG4gICAgICBoYXNoOiBtZXRlb3JSdW50aW1lSGFzaCxcbiAgICB9KSxcbiAgJycsXG5cbiAgLi4uKGpzIHx8IFtdKS5tYXAoZmlsZSA9PlxuICAgIHRlbXBsYXRlKCcgIDxzY3JpcHQgdHlwZT1cInRleHQvamF2YXNjcmlwdFwiIHNyYz1cIjwlLSBzcmMgJT5cIjwlPSBzcmkgJT4+PC9zY3JpcHQ+Jykoe1xuICAgICAgc3JjOiBidW5kbGVkSnNDc3NVcmxSZXdyaXRlSG9vayhmaWxlLnVybCksXG4gICAgICBzcmk6IHNyaShmaWxlLnNyaSwgc3JpTW9kZSksXG4gICAgfSlcbiAgKSxcblxuICAuLi4oYWRkaXRpb25hbFN0YXRpY0pzIHx8IFtdKS5tYXAoKHsgY29udGVudHMsIHBhdGhuYW1lIH0pID0+IChcbiAgICBpbmxpbmVTY3JpcHRzQWxsb3dlZFxuICAgICAgPyB0ZW1wbGF0ZSgnICA8c2NyaXB0PjwlPSBjb250ZW50cyAlPjwvc2NyaXB0PicpKHtcbiAgICAgICAgY29udGVudHMsXG4gICAgICB9KVxuICAgICAgOiB0ZW1wbGF0ZSgnICA8c2NyaXB0IHR5cGU9XCJ0ZXh0L2phdmFzY3JpcHRcIiBzcmM9XCI8JS0gc3JjICU+XCI+PC9zY3JpcHQ+Jykoe1xuICAgICAgICBzcmM6IHJvb3RVcmxQYXRoUHJlZml4ICsgcGF0aG5hbWUsXG4gICAgICB9KVxuICApKSxcblxuICAnJyxcbiAgJycsXG4gICc8L2JvZHk+JyxcbiAgJzwvaHRtbD4nXG5dLmpvaW4oJ1xcbicpO1xuIiwiaW1wb3J0IHRlbXBsYXRlIGZyb20gJy4vdGVtcGxhdGUnO1xuXG4vLyBUZW1wbGF0ZSBmdW5jdGlvbiBmb3IgcmVuZGVyaW5nIHRoZSBib2lsZXJwbGF0ZSBodG1sIGZvciBjb3Jkb3ZhXG5leHBvcnQgY29uc3QgaGVhZFRlbXBsYXRlID0gKHtcbiAgbWV0ZW9yUnVudGltZUNvbmZpZyxcbiAgcm9vdFVybFBhdGhQcmVmaXgsXG4gIGlubGluZVNjcmlwdHNBbGxvd2VkLFxuICBjc3MsXG4gIGpzLFxuICBhZGRpdGlvbmFsU3RhdGljSnMsXG4gIGh0bWxBdHRyaWJ1dGVzLFxuICBidW5kbGVkSnNDc3NVcmxSZXdyaXRlSG9vayxcbiAgaGVhZCxcbiAgZHluYW1pY0hlYWQsXG59KSA9PiB7XG4gIHZhciBoZWFkU2VjdGlvbnMgPSBoZWFkLnNwbGl0KC88bWV0ZW9yLWJ1bmRsZWQtY3NzW148Pl0qPi8sIDIpO1xuICB2YXIgY3NzQnVuZGxlID0gW1xuICAgIC8vIFdlIGFyZSBleHBsaWNpdGx5IG5vdCB1c2luZyBidW5kbGVkSnNDc3NVcmxSZXdyaXRlSG9vazogaW4gY29yZG92YSB3ZSBzZXJ2ZSBhc3NldHMgdXAgZGlyZWN0bHkgZnJvbSBkaXNrLCBzbyByZXdyaXRpbmcgdGhlIFVSTCBkb2VzIG5vdCBtYWtlIHNlbnNlXG4gICAgLi4uKGNzcyB8fCBbXSkubWFwKGZpbGUgPT5cbiAgICAgIHRlbXBsYXRlKCcgIDxsaW5rIHJlbD1cInN0eWxlc2hlZXRcIiB0eXBlPVwidGV4dC9jc3NcIiBjbGFzcz1cIl9fbWV0ZW9yLWNzc19fXCIgaHJlZj1cIjwlLSBocmVmICU+XCI+Jykoe1xuICAgICAgICBocmVmOiBmaWxlLnVybCxcbiAgICAgIH0pXG4gICldLmpvaW4oJ1xcbicpO1xuXG4gIHJldHVybiBbXG4gICAgJzxodG1sPicsXG4gICAgJzxoZWFkPicsXG4gICAgJyAgPG1ldGEgY2hhcnNldD1cInV0Zi04XCI+JyxcbiAgICAnICA8bWV0YSBuYW1lPVwiZm9ybWF0LWRldGVjdGlvblwiIGNvbnRlbnQ9XCJ0ZWxlcGhvbmU9bm9cIj4nLFxuICAgICcgIDxtZXRhIG5hbWU9XCJ2aWV3cG9ydFwiIGNvbnRlbnQ9XCJ1c2VyLXNjYWxhYmxlPW5vLCBpbml0aWFsLXNjYWxlPTEsIG1heGltdW0tc2NhbGU9MSwgbWluaW11bS1zY2FsZT0xLCB3aWR0aD1kZXZpY2Utd2lkdGgsIGhlaWdodD1kZXZpY2UtaGVpZ2h0LCB2aWV3cG9ydC1maXQ9Y292ZXJcIj4nLFxuICAgICcgIDxtZXRhIG5hbWU9XCJtc2FwcGxpY2F0aW9uLXRhcC1oaWdobGlnaHRcIiBjb250ZW50PVwibm9cIj4nLFxuICAgICcgIDxtZXRhIGh0dHAtZXF1aXY9XCJDb250ZW50LVNlY3VyaXR5LVBvbGljeVwiIGNvbnRlbnQ9XCJkZWZhdWx0LXNyYyAqIGFuZHJvaWQtd2Vidmlldy12aWRlby1wb3N0ZXI6IGdhcDogZGF0YTogYmxvYjogXFwndW5zYWZlLWlubGluZVxcJyBcXCd1bnNhZmUtZXZhbFxcJyB3czogd3NzOjtcIj4nLFxuXG4gIChoZWFkU2VjdGlvbnMubGVuZ3RoID09PSAxKVxuICAgID8gW2Nzc0J1bmRsZSwgaGVhZFNlY3Rpb25zWzBdXS5qb2luKCdcXG4nKVxuICAgIDogW2hlYWRTZWN0aW9uc1swXSwgY3NzQnVuZGxlLCBoZWFkU2VjdGlvbnNbMV1dLmpvaW4oJ1xcbicpLFxuXG4gICAgJyAgPHNjcmlwdCB0eXBlPVwidGV4dC9qYXZhc2NyaXB0XCI+JyxcbiAgICB0ZW1wbGF0ZSgnICAgIF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18gPSBKU09OLnBhcnNlKGRlY29kZVVSSUNvbXBvbmVudCg8JT0gY29uZiAlPikpOycpKHtcbiAgICAgIGNvbmY6IG1ldGVvclJ1bnRpbWVDb25maWcsXG4gICAgfSksXG4gICAgJyAgICBpZiAoL0FuZHJvaWQvaS50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpKSB7JyxcbiAgICAvLyBXaGVuIEFuZHJvaWQgYXBwIGlzIGVtdWxhdGVkLCBpdCBjYW5ub3QgY29ubmVjdCB0byBsb2NhbGhvc3QsXG4gICAgLy8gaW5zdGVhZCBpdCBzaG91bGQgY29ubmVjdCB0byAxMC4wLjIuMlxuICAgIC8vICh1bmxlc3Mgd2VcXCdyZSB1c2luZyBhbiBodHRwIHByb3h5OyB0aGVuIGl0IHdvcmtzISlcbiAgICAnICAgICAgaWYgKCFfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLmh0dHBQcm94eVBvcnQpIHsnLFxuICAgICcgICAgICAgIF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18uUk9PVF9VUkwgPSAoX19tZXRlb3JfcnVudGltZV9jb25maWdfXy5ST09UX1VSTCB8fCBcXCdcXCcpLnJlcGxhY2UoL2xvY2FsaG9zdC9pLCBcXCcxMC4wLjIuMlxcJyk7JyxcbiAgICAnICAgICAgICBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLkREUF9ERUZBVUxUX0NPTk5FQ1RJT05fVVJMID0gKF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18uRERQX0RFRkFVTFRfQ09OTkVDVElPTl9VUkwgfHwgXFwnXFwnKS5yZXBsYWNlKC9sb2NhbGhvc3QvaSwgXFwnMTAuMC4yLjJcXCcpOycsXG4gICAgJyAgICAgIH0nLFxuICAgICcgICAgfScsXG4gICAgJyAgPC9zY3JpcHQ+JyxcbiAgICAnJyxcbiAgICAnICA8c2NyaXB0IHR5cGU9XCJ0ZXh0L2phdmFzY3JpcHRcIiBzcmM9XCIvY29yZG92YS5qc1wiPjwvc2NyaXB0PicsXG5cbiAgICAuLi4oanMgfHwgW10pLm1hcChmaWxlID0+XG4gICAgICB0ZW1wbGF0ZSgnICA8c2NyaXB0IHR5cGU9XCJ0ZXh0L2phdmFzY3JpcHRcIiBzcmM9XCI8JS0gc3JjICU+XCI+PC9zY3JpcHQ+Jykoe1xuICAgICAgICBzcmM6IGZpbGUudXJsLFxuICAgICAgfSlcbiAgICApLFxuXG4gICAgLi4uKGFkZGl0aW9uYWxTdGF0aWNKcyB8fCBbXSkubWFwKCh7IGNvbnRlbnRzLCBwYXRobmFtZSB9KSA9PiAoXG4gICAgICBpbmxpbmVTY3JpcHRzQWxsb3dlZFxuICAgICAgICA/IHRlbXBsYXRlKCcgIDxzY3JpcHQ+PCU9IGNvbnRlbnRzICU+PC9zY3JpcHQ+Jykoe1xuICAgICAgICAgIGNvbnRlbnRzLFxuICAgICAgICB9KVxuICAgICAgICA6IHRlbXBsYXRlKCcgIDxzY3JpcHQgdHlwZT1cInRleHQvamF2YXNjcmlwdFwiIHNyYz1cIjwlLSBzcmMgJT5cIj48L3NjcmlwdD4nKSh7XG4gICAgICAgICAgc3JjOiByb290VXJsUGF0aFByZWZpeCArIHBhdGhuYW1lXG4gICAgICAgIH0pXG4gICAgKSksXG4gICAgJycsXG4gICAgJzwvaGVhZD4nLFxuICAgICcnLFxuICAgICc8Ym9keT4nLFxuICBdLmpvaW4oJ1xcbicpO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGNsb3NlVGVtcGxhdGUoKSB7XG4gIHJldHVybiBcIjwvYm9keT5cXG48L2h0bWw+XCI7XG59XG4iLCJpbXBvcnQgbG9kYXNoVGVtcGxhdGUgZnJvbSAnbG9kYXNoLnRlbXBsYXRlJztcblxuLy8gQXMgaWRlbnRpZmllZCBpbiBpc3N1ZSAjOTE0OSwgd2hlbiBhbiBhcHBsaWNhdGlvbiBvdmVycmlkZXMgdGhlIGRlZmF1bHRcbi8vIF8udGVtcGxhdGUgc2V0dGluZ3MgdXNpbmcgXy50ZW1wbGF0ZVNldHRpbmdzLCB0aG9zZSBuZXcgc2V0dGluZ3MgYXJlXG4vLyB1c2VkIGFueXdoZXJlIF8udGVtcGxhdGUgaXMgdXNlZCwgaW5jbHVkaW5nIHdpdGhpbiB0aGVcbi8vIGJvaWxlcnBsYXRlLWdlbmVyYXRvci4gVG8gaGFuZGxlIHRoaXMsIF8udGVtcGxhdGUgc2V0dGluZ3MgdGhhdCBoYXZlXG4vLyBiZWVuIHZlcmlmaWVkIHRvIHdvcmsgYXJlIG92ZXJyaWRkZW4gaGVyZSBvbiBlYWNoIF8udGVtcGxhdGUgY2FsbC5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHRlbXBsYXRlKHRleHQpIHtcbiAgcmV0dXJuIGxvZGFzaFRlbXBsYXRlKHRleHQsIG51bGwsIHtcbiAgICBldmFsdWF0ZSAgICA6IC88JShbXFxzXFxTXSs/KSU+L2csXG4gICAgaW50ZXJwb2xhdGUgOiAvPCU9KFtcXHNcXFNdKz8pJT4vZyxcbiAgICBlc2NhcGUgICAgICA6IC88JS0oW1xcc1xcU10rPyklPi9nLFxuICB9KTtcbn07Il19
