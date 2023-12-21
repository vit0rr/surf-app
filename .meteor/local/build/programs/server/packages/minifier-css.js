(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var transformResult, CssTools;

var require = meteorInstall({"node_modules":{"meteor":{"minifier-css":{"minifier.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                           //
// packages/minifier-css/minifier.js                                                                         //
//                                                                                                           //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                             //
!function (module1) {
  module1.export({
    CssTools: () => CssTools
  });
  let path;
  module1.link("path", {
    default(v) {
      path = v;
    }
  }, 0);
  let url;
  module1.link("url", {
    default(v) {
      url = v;
    }
  }, 1);
  let postcss;
  module1.link("postcss", {
    default(v) {
      postcss = v;
    }
  }, 2);
  let cssnano;
  module1.link("cssnano", {
    default(v) {
      cssnano = v;
    }
  }, 3);
  const CssTools = {
    /**
     * Parse the incoming CSS string; return a CSS AST.
     *
     * @param {string} cssText The CSS string to be parsed.
     * @param {Object} options Options to pass to the PostCSS parser.
     * @return {postcss#Root} PostCSS Root AST.
     */
    parseCss(cssText) {
      let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      // This function previously used the `css-parse` npm package, which
      // set the name of the css file being parsed using  { source: 'filename' }.
      // If included, we'll convert this to the `postcss` equivalent, to maintain
      // backwards compatibility.
      if (options.source) {
        options.from = options.source;
        delete options.source;
      }
      return postcss.parse(cssText, options);
    },
    /**
     * Using the incoming CSS AST, create and return a new object with the
     * generated CSS string, and optional sourcemap details.
     *
     * @param {postcss#Root} cssAst PostCSS Root AST.
     * @param {Object} options Options to pass to the PostCSS parser.
     * @return {Object} Format: { code: 'css string', map: 'sourcemap deatils' }.
     */
    stringifyCss(cssAst) {
      let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      // This function previously used the `css-stringify` npm package, which
      // controlled sourcemap generation by passing in { sourcemap: true }.
      // If included, we'll convert this to the `postcss` equivalent, to maintain
      // backwards compatibility.
      if (options.sourcemap) {
        options.map = {
          inline: false,
          annotation: false,
          sourcesContent: false
        };
        delete options.sourcemap;
      }
      // explicitly set from to undefined to prevent postcss warnings
      if (!options.from) {
        options.from = void 0;
      }
      transformResult = cssAst.toResult(options);
      return {
        code: transformResult.css,
        map: transformResult.map ? transformResult.map.toJSON() : null
      };
    },
    /**
     * Minify the passed in CSS string.
     *
     * @param {string} cssText CSS string to minify.
     * @return {String[]} Array containing the minified CSS.
     */
    minifyCss(cssText) {
      return Promise.await(CssTools.minifyCssAsync(cssText));
    },
    /**
     * Minify the passed in CSS string.
     *
     * @param {string} cssText CSS string to minify.
     * @return {Promise<String[]>} Array containing the minified CSS.
     */
    minifyCssAsync(cssText) {
      return Promise.asyncApply(() => {
        return Promise.await(postcss([cssnano({
          safe: true
        })]).process(cssText, {
          from: void 0
        }).then(result => [result.css]));
      });
    },
    /**
     * Merge multiple CSS AST's into one.
     *
     * @param {postcss#Root[]} cssAsts Array of PostCSS Root objects.
     * @callback warnCb Callback used to handle warning messages.
     * @return {postcss#Root} PostCSS Root object.
     */
    mergeCssAsts(cssAsts, warnCb) {
      const rulesPredicate = function (rules) {
        let exclude = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
        if (!Array.isArray(rules)) {
          rules = [rules];
        }
        return node => {
          // PostCSS AtRule nodes have `type: 'atrule'` and a descriptive name,
          // e.g. 'import' or 'charset', while Comment nodes have type only.
          const nodeMatchesRule = rules.includes(node.name || node.type);
          return exclude ? !nodeMatchesRule : nodeMatchesRule;
        };
      };

      // Simple concatenation of CSS files would break @import rules
      // located in the beginning of a file. Before concatenation, pull
      // @import rules to the beginning of a new syntax tree so they always
      // precede other rules.
      const newAst = postcss.root();
      cssAsts.forEach(ast => {
        if (ast.nodes) {
          // Pick only the imports from the beginning of file ignoring @charset
          // rules as every file is assumed to be in UTF-8.
          const charsetRules = ast.nodes.filter(rulesPredicate('charset'));
          if (charsetRules.some(rule => {
            // According to MDN, only 'UTF-8' and "UTF-8" are the correct
            // encoding directives representing UTF-8.
            return !/^(['"])UTF-8\1$/.test(rule.params);
          })) {
            warnCb(ast.filename, '@charset rules in this file will be ignored as UTF-8 is the ' + 'only encoding supported');
          }
          ast.nodes = ast.nodes.filter(rulesPredicate('charset', true));
          let importCount = 0;
          for (let i = 0; i < ast.nodes.length; i++) {
            if (!rulesPredicate(['import', 'comment'])(ast.nodes[i])) {
              importCount = i;
              break;
            }
          }
          CssTools.rewriteCssUrls(ast);
          const imports = ast.nodes.splice(0, importCount);
          newAst.nodes.push(...imports);

          // If there are imports left in the middle of a file, warn users as it
          // might be a potential bug (imports are only valid at the beginning of
          // a file).
          if (ast.nodes.some(rulesPredicate('import'))) {
            warnCb(ast.filename, 'There are some @import rules in the middle of a file. This ' + 'might be a bug, as imports are only valid at the beginning of ' + 'a file.');
          }
        }
      });

      // Now we can put the rest of CSS rules into new AST.
      cssAsts.forEach(ast => {
        if (ast.nodes) {
          newAst.nodes.push(...ast.nodes);
        }
      });
      return newAst;
    },
    /**
     * We are looking for all relative urls defined with the `url()` functional
     * notation and rewriting them to the equivalent absolute url using the
     * `source` path provided by postcss. For performance reasons this function
     * acts by side effect by modifying the given AST without doing a deep copy.
     *
     * @param {postcss#Root} ast PostCSS Root object.
     * @return Modifies the ast param in place.
     */
    rewriteCssUrls(ast) {
      const mergedCssPath = '/';
      rewriteRules(ast.nodes, mergedCssPath);
    }
  };
  if (typeof Profile !== 'undefined') {
    ['parseCss', 'stringifyCss', 'minifyCss', 'minifyCssAsync', 'mergeCssAsts', 'rewriteCssUrls'].forEach(funcName => {
      CssTools[funcName] = Profile("CssTools.".concat(funcName), CssTools[funcName]);
    });
  }
  const hasOwn = Object.prototype.hasOwnProperty;
  const rewriteRules = (rules, mergedCssPath) => {
    rules.forEach(rule => {
      // Recurse if there are sub-rules. An example:
      //     @media (...) {
      //         .rule { url(...); }
      //     }
      if (hasOwn.call(rule, 'nodes')) {
        rewriteRules(rule.nodes, mergedCssPath);
      }
      const appDir = process.cwd();
      const sourceFile = rule.source.input.file;
      const sourceFileFromAppRoot = sourceFile ? sourceFile.replace(appDir, '') : '';
      let basePath = pathJoin('/', pathDirname(sourceFileFromAppRoot));

      // Set the correct basePath based on how the linked asset will be served.
      // XXX This is wrong. We are coupling the information about how files will
      // be served by the web server to the information how they were stored
      // originally on the filesystem in the project structure. Ideally, there
      // should be some module that tells us precisely how each asset will be
      // served but for now we are just assuming that everything that comes from
      // a folder starting with "/packages/" is served on the same path as
      // it was on the filesystem and everything else is served on root "/".
      if (!basePath.match(/^\/?packages\//i)) {
        basePath = "/";
      }
      let value = rule.value;

      // Match css values containing some functional calls to `url(URI)` where
      // URI is optionally quoted.
      // Note that a css value can contains other elements, for instance:
      //   background: top center url("background.png") black;
      // or even multiple url(), for instance for multiple backgrounds.
      var cssUrlRegex = /url\s*\(\s*(['"]?)(.+?)\1\s*\)/gi;
      let parts;
      while (parts = cssUrlRegex.exec(value)) {
        const oldCssUrl = parts[0];
        const quote = parts[1];
        const resource = url.parse(parts[2]);

        // We don't rewrite URLs starting with a protocol definition such as
        // http, https, or data, or those with network-path references
        // i.e. //img.domain.com/cat.gif
        if (resource.protocol !== null || resource.href.startsWith('//') || resource.href.startsWith('#')) {
          continue;
        }

        // Rewrite relative paths (that refers to the internal application tree)
        // to absolute paths (addressable from the public build).
        let absolutePath = isRelative(resource.path) ? pathJoin(basePath, resource.path) : resource.path;
        if (resource.hash) {
          absolutePath += resource.hash;
        }

        // We used to finish the rewriting process at the absolute path step
        // above. But it didn't work in case the Meteor application was deployed
        // under a sub-path (eg `ROOT_URL=http://localhost:3000/myapp meteor`)
        // in which case the resources linked in the merged CSS file would miss
        // the `myapp/` prefix. Since this path prefix is only known at launch
        // time (rather than build time) we can't use absolute paths to link
        // resources in the generated CSS.
        //
        // Instead we transform absolute paths to make them relative to the
        // merged CSS, leaving to the browser the responsibility to calculate
        // the final resource links (by adding the application deployment
        // prefix, here `myapp/`, if applicable).
        const relativeToMergedCss = pathRelative(mergedCssPath, absolutePath);
        const newCssUrl = "url(".concat(quote).concat(relativeToMergedCss).concat(quote, ")");
        value = value.replace(oldCssUrl, newCssUrl);
      }
      rule.value = value;
    });
  };
  const isRelative = path => path && path.charAt(0) !== '/';

  // These are duplicates of functions in tools/files.js, because we don't have
  // a good way of exporting them into packages.
  // XXX deduplicate files.js into a package at some point so that we can use it
  // in core
  const toOSPath = p => process.platform === 'win32' ? p.replace(/\//g, '\\') : p;
  const toStandardPath = p => process.platform === 'win32' ? p.replace(/\\/g, '/') : p;
  const pathJoin = (a, b) => toStandardPath(path.join(toOSPath(a), toOSPath(b)));
  const pathDirname = p => toStandardPath(path.dirname(toOSPath(p)));
  const pathRelative = (p1, p2) => toStandardPath(path.relative(toOSPath(p1), toOSPath(p2)));
}.call(this, module);
///////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"node_modules":{"postcss":{"package.json":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                           //
// node_modules/meteor/minifier-css/node_modules/postcss/package.json                                        //
//                                                                                                           //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                             //
module.exports = {
  "name": "postcss",
  "version": "8.4.21",
  "main": "./lib/postcss.js"
};

///////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"lib":{"postcss.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                           //
// node_modules/meteor/minifier-css/node_modules/postcss/lib/postcss.js                                      //
//                                                                                                           //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                             //
module.useNode();
///////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"cssnano":{"package.json":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                           //
// node_modules/meteor/minifier-css/node_modules/cssnano/package.json                                        //
//                                                                                                           //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                             //
module.exports = {
  "name": "cssnano",
  "version": "5.1.15",
  "main": "src/index.js"
};

///////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"src":{"index.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                           //
// node_modules/meteor/minifier-css/node_modules/cssnano/src/index.js                                        //
//                                                                                                           //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                             //
module.useNode();
///////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

var exports = require("/node_modules/meteor/minifier-css/minifier.js");

/* Exports */
Package._define("minifier-css", exports, {
  CssTools: CssTools
});

})();

//# sourceURL=meteor://💻app/packages/minifier-css.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbWluaWZpZXItY3NzL21pbmlmaWVyLmpzIl0sIm5hbWVzIjpbIm1vZHVsZTEiLCJleHBvcnQiLCJDc3NUb29scyIsInBhdGgiLCJsaW5rIiwiZGVmYXVsdCIsInYiLCJ1cmwiLCJwb3N0Y3NzIiwiY3NzbmFubyIsInBhcnNlQ3NzIiwiY3NzVGV4dCIsIm9wdGlvbnMiLCJhcmd1bWVudHMiLCJsZW5ndGgiLCJ1bmRlZmluZWQiLCJzb3VyY2UiLCJmcm9tIiwicGFyc2UiLCJzdHJpbmdpZnlDc3MiLCJjc3NBc3QiLCJzb3VyY2VtYXAiLCJtYXAiLCJpbmxpbmUiLCJhbm5vdGF0aW9uIiwic291cmNlc0NvbnRlbnQiLCJ0cmFuc2Zvcm1SZXN1bHQiLCJ0b1Jlc3VsdCIsImNvZGUiLCJjc3MiLCJ0b0pTT04iLCJtaW5pZnlDc3MiLCJQcm9taXNlIiwiYXdhaXQiLCJtaW5pZnlDc3NBc3luYyIsImFzeW5jQXBwbHkiLCJzYWZlIiwicHJvY2VzcyIsInRoZW4iLCJyZXN1bHQiLCJtZXJnZUNzc0FzdHMiLCJjc3NBc3RzIiwid2FybkNiIiwicnVsZXNQcmVkaWNhdGUiLCJydWxlcyIsImV4Y2x1ZGUiLCJBcnJheSIsImlzQXJyYXkiLCJub2RlIiwibm9kZU1hdGNoZXNSdWxlIiwiaW5jbHVkZXMiLCJuYW1lIiwidHlwZSIsIm5ld0FzdCIsInJvb3QiLCJmb3JFYWNoIiwiYXN0Iiwibm9kZXMiLCJjaGFyc2V0UnVsZXMiLCJmaWx0ZXIiLCJzb21lIiwicnVsZSIsInRlc3QiLCJwYXJhbXMiLCJmaWxlbmFtZSIsImltcG9ydENvdW50IiwiaSIsInJld3JpdGVDc3NVcmxzIiwiaW1wb3J0cyIsInNwbGljZSIsInB1c2giLCJtZXJnZWRDc3NQYXRoIiwicmV3cml0ZVJ1bGVzIiwiUHJvZmlsZSIsImZ1bmNOYW1lIiwiY29uY2F0IiwiaGFzT3duIiwiT2JqZWN0IiwicHJvdG90eXBlIiwiaGFzT3duUHJvcGVydHkiLCJjYWxsIiwiYXBwRGlyIiwiY3dkIiwic291cmNlRmlsZSIsImlucHV0IiwiZmlsZSIsInNvdXJjZUZpbGVGcm9tQXBwUm9vdCIsInJlcGxhY2UiLCJiYXNlUGF0aCIsInBhdGhKb2luIiwicGF0aERpcm5hbWUiLCJtYXRjaCIsInZhbHVlIiwiY3NzVXJsUmVnZXgiLCJwYXJ0cyIsImV4ZWMiLCJvbGRDc3NVcmwiLCJxdW90ZSIsInJlc291cmNlIiwicHJvdG9jb2wiLCJocmVmIiwic3RhcnRzV2l0aCIsImFic29sdXRlUGF0aCIsImlzUmVsYXRpdmUiLCJoYXNoIiwicmVsYXRpdmVUb01lcmdlZENzcyIsInBhdGhSZWxhdGl2ZSIsIm5ld0Nzc1VybCIsImNoYXJBdCIsInRvT1NQYXRoIiwicCIsInBsYXRmb3JtIiwidG9TdGFuZGFyZFBhdGgiLCJhIiwiYiIsImpvaW4iLCJkaXJuYW1lIiwicDEiLCJwMiIsInJlbGF0aXZlIiwibW9kdWxlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0VBQUFBLE9BQU8sQ0FBQ0MsTUFBTSxDQUFDO0lBQUNDLFFBQVEsRUFBQ0EsQ0FBQSxLQUFJQTtFQUFRLENBQUMsQ0FBQztFQUFDLElBQUlDLElBQUk7RUFBQ0gsT0FBTyxDQUFDSSxJQUFJLENBQUMsTUFBTSxFQUFDO0lBQUNDLE9BQU9BLENBQUNDLENBQUMsRUFBQztNQUFDSCxJQUFJLEdBQUNHLENBQUM7SUFBQTtFQUFDLENBQUMsRUFBQyxDQUFDLENBQUM7RUFBQyxJQUFJQyxHQUFHO0VBQUNQLE9BQU8sQ0FBQ0ksSUFBSSxDQUFDLEtBQUssRUFBQztJQUFDQyxPQUFPQSxDQUFDQyxDQUFDLEVBQUM7TUFBQ0MsR0FBRyxHQUFDRCxDQUFDO0lBQUE7RUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDO0VBQUMsSUFBSUUsT0FBTztFQUFDUixPQUFPLENBQUNJLElBQUksQ0FBQyxTQUFTLEVBQUM7SUFBQ0MsT0FBT0EsQ0FBQ0MsQ0FBQyxFQUFDO01BQUNFLE9BQU8sR0FBQ0YsQ0FBQztJQUFBO0VBQUMsQ0FB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QUFDVixRQUFRLENBQUNRLEVBQUUsQ0FBQyxFQUFFUixRQUFRLENBQUNTLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFBQyxFQUFBdEMsSUFBQSxPQUFBd0MsTUFBQSxFIiwiZmlsZSI6Ii9wYWNrYWdlcy9taW5pZmllci1jc3MuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB1cmwgZnJvbSAndXJsJztcbmltcG9ydCBwb3N0Y3NzIGZyb20gJ3Bvc3Rjc3MnO1xuaW1wb3J0IGNzc25hbm8gZnJvbSAnY3NzbmFubyc7XG5cbmNvbnN0IENzc1Rvb2xzID0ge1xuICAvKipcbiAgICogUGFyc2UgdGhlIGluY29taW5nIENTUyBzdHJpbmc7IHJldHVybiBhIENTUyBBU1QuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBjc3NUZXh0IFRoZSBDU1Mgc3RyaW5nIHRvIGJlIHBhcnNlZC5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgT3B0aW9ucyB0byBwYXNzIHRvIHRoZSBQb3N0Q1NTIHBhcnNlci5cbiAgICogQHJldHVybiB7cG9zdGNzcyNSb290fSBQb3N0Q1NTIFJvb3QgQVNULlxuICAgKi9cbiAgcGFyc2VDc3MoY3NzVGV4dCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgLy8gVGhpcyBmdW5jdGlvbiBwcmV2aW91c2x5IHVzZWQgdGhlIGBjc3MtcGFyc2VgIG5wbSBwYWNrYWdlLCB3aGljaFxuICAgIC8vIHNldCB0aGUgbmFtZSBvZiB0aGUgY3NzIGZpbGUgYmVpbmcgcGFyc2VkIHVzaW5nICB7IHNvdXJjZTogJ2ZpbGVuYW1lJyB9LlxuICAgIC8vIElmIGluY2x1ZGVkLCB3ZSdsbCBjb252ZXJ0IHRoaXMgdG8gdGhlIGBwb3N0Y3NzYCBlcXVpdmFsZW50LCB0byBtYWludGFpblxuICAgIC8vIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5LlxuICAgIGlmIChvcHRpb25zLnNvdXJjZSkge1xuICAgICAgb3B0aW9ucy5mcm9tID0gb3B0aW9ucy5zb3VyY2U7XG4gICAgICBkZWxldGUgb3B0aW9ucy5zb3VyY2U7XG4gICAgfVxuICAgIHJldHVybiBwb3N0Y3NzLnBhcnNlKGNzc1RleHQsIG9wdGlvbnMpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBVc2luZyB0aGUgaW5jb21pbmcgQ1NTIEFTVCwgY3JlYXRlIGFuZCByZXR1cm4gYSBuZXcgb2JqZWN0IHdpdGggdGhlXG4gICAqIGdlbmVyYXRlZCBDU1Mgc3RyaW5nLCBhbmQgb3B0aW9uYWwgc291cmNlbWFwIGRldGFpbHMuXG4gICAqXG4gICAqIEBwYXJhbSB7cG9zdGNzcyNSb290fSBjc3NBc3QgUG9zdENTUyBSb290IEFTVC5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgT3B0aW9ucyB0byBwYXNzIHRvIHRoZSBQb3N0Q1NTIHBhcnNlci5cbiAgICogQHJldHVybiB7T2JqZWN0fSBGb3JtYXQ6IHsgY29kZTogJ2NzcyBzdHJpbmcnLCBtYXA6ICdzb3VyY2VtYXAgZGVhdGlscycgfS5cbiAgICovXG4gIHN0cmluZ2lmeUNzcyhjc3NBc3QsIG9wdGlvbnMgPSB7fSkge1xuICAgIC8vIFRoaXMgZnVuY3Rpb24gcHJldmlvdXNseSB1c2VkIHRoZSBgY3NzLXN0cmluZ2lmeWAgbnBtIHBhY2thZ2UsIHdoaWNoXG4gICAgLy8gY29udHJvbGxlZCBzb3VyY2VtYXAgZ2VuZXJhdGlvbiBieSBwYXNzaW5nIGluIHsgc291cmNlbWFwOiB0cnVlIH0uXG4gICAgLy8gSWYgaW5jbHVkZWQsIHdlJ2xsIGNvbnZlcnQgdGhpcyB0byB0aGUgYHBvc3Rjc3NgIGVxdWl2YWxlbnQsIHRvIG1haW50YWluXG4gICAgLy8gYmFja3dhcmRzIGNvbXBhdGliaWxpdHkuXG4gICAgaWYgKG9wdGlvbnMuc291cmNlbWFwKSB7XG4gICAgICBvcHRpb25zLm1hcCA9IHtcbiAgICAgICAgaW5saW5lOiBmYWxzZSxcbiAgICAgICAgYW5ub3RhdGlvbjogZmFsc2UsXG4gICAgICAgIHNvdXJjZXNDb250ZW50OiBmYWxzZSxcbiAgICAgIH07XG4gICAgICBkZWxldGUgb3B0aW9ucy5zb3VyY2VtYXA7XG4gICAgfVxuICAgIC8vIGV4cGxpY2l0bHkgc2V0IGZyb20gdG8gdW5kZWZpbmVkIHRvIHByZXZlbnQgcG9zdGNzcyB3YXJuaW5nc1xuICAgIGlmICghb3B0aW9ucy5mcm9tKXtcbiAgICAgIG9wdGlvbnMuZnJvbSA9IHZvaWQgMDtcbiAgICB9XG5cbiAgICB0cmFuc2Zvcm1SZXN1bHQgPSBjc3NBc3QudG9SZXN1bHQob3B0aW9ucyk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgY29kZTogdHJhbnNmb3JtUmVzdWx0LmNzcyxcbiAgICAgIG1hcDogdHJhbnNmb3JtUmVzdWx0Lm1hcCA/IHRyYW5zZm9ybVJlc3VsdC5tYXAudG9KU09OKCkgOiBudWxsLFxuICAgIH07XG4gIH0sXG5cbiAgLyoqXG4gICAqIE1pbmlmeSB0aGUgcGFzc2VkIGluIENTUyBzdHJpbmcuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBjc3NUZXh0IENTUyBzdHJpbmcgdG8gbWluaWZ5LlxuICAgKiBAcmV0dXJuIHtTdHJpbmdbXX0gQXJyYXkgY29udGFpbmluZyB0aGUgbWluaWZpZWQgQ1NTLlxuICAgKi9cbiAgbWluaWZ5Q3NzKGNzc1RleHQpIHtcbiAgICByZXR1cm4gUHJvbWlzZS5hd2FpdChDc3NUb29scy5taW5pZnlDc3NBc3luYyhjc3NUZXh0KSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIE1pbmlmeSB0aGUgcGFzc2VkIGluIENTUyBzdHJpbmcuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBjc3NUZXh0IENTUyBzdHJpbmcgdG8gbWluaWZ5LlxuICAgKiBAcmV0dXJuIHtQcm9taXNlPFN0cmluZ1tdPn0gQXJyYXkgY29udGFpbmluZyB0aGUgbWluaWZpZWQgQ1NTLlxuICAgKi9cbiAgYXN5bmMgbWluaWZ5Q3NzQXN5bmMoY3NzVGV4dCkge1xuICAgIHJldHVybiBhd2FpdCBwb3N0Y3NzKFtjc3NuYW5vKHsgc2FmZTogdHJ1ZSB9KV0pXG4gICAgICAucHJvY2Vzcyhjc3NUZXh0LCB7XG4gICAgICAgIGZyb206IHZvaWQgMCxcbiAgICAgIH0pXG4gICAgICAudGhlbigocmVzdWx0KSA9PiBbcmVzdWx0LmNzc10pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBNZXJnZSBtdWx0aXBsZSBDU1MgQVNUJ3MgaW50byBvbmUuXG4gICAqXG4gICAqIEBwYXJhbSB7cG9zdGNzcyNSb290W119IGNzc0FzdHMgQXJyYXkgb2YgUG9zdENTUyBSb290IG9iamVjdHMuXG4gICAqIEBjYWxsYmFjayB3YXJuQ2IgQ2FsbGJhY2sgdXNlZCB0byBoYW5kbGUgd2FybmluZyBtZXNzYWdlcy5cbiAgICogQHJldHVybiB7cG9zdGNzcyNSb290fSBQb3N0Q1NTIFJvb3Qgb2JqZWN0LlxuICAgKi9cbiAgbWVyZ2VDc3NBc3RzKGNzc0FzdHMsIHdhcm5DYikge1xuICAgIGNvbnN0IHJ1bGVzUHJlZGljYXRlID0gKHJ1bGVzLCBleGNsdWRlID0gZmFsc2UpID0+IHtcbiAgICAgIGlmICghIEFycmF5LmlzQXJyYXkocnVsZXMpKSB7XG4gICAgICAgIHJ1bGVzID0gW3J1bGVzXTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBub2RlID0+IHtcbiAgICAgICAgLy8gUG9zdENTUyBBdFJ1bGUgbm9kZXMgaGF2ZSBgdHlwZTogJ2F0cnVsZSdgIGFuZCBhIGRlc2NyaXB0aXZlIG5hbWUsXG4gICAgICAgIC8vIGUuZy4gJ2ltcG9ydCcgb3IgJ2NoYXJzZXQnLCB3aGlsZSBDb21tZW50IG5vZGVzIGhhdmUgdHlwZSBvbmx5LlxuICAgICAgICBjb25zdCBub2RlTWF0Y2hlc1J1bGUgPSBydWxlcy5pbmNsdWRlcyhub2RlLm5hbWUgfHwgbm9kZS50eXBlKTtcblxuICAgICAgICByZXR1cm4gZXhjbHVkZSA/ICFub2RlTWF0Y2hlc1J1bGUgOiBub2RlTWF0Y2hlc1J1bGU7XG4gICAgICB9XG4gICAgfTtcblxuICAgIC8vIFNpbXBsZSBjb25jYXRlbmF0aW9uIG9mIENTUyBmaWxlcyB3b3VsZCBicmVhayBAaW1wb3J0IHJ1bGVzXG4gICAgLy8gbG9jYXRlZCBpbiB0aGUgYmVnaW5uaW5nIG9mIGEgZmlsZS4gQmVmb3JlIGNvbmNhdGVuYXRpb24sIHB1bGxcbiAgICAvLyBAaW1wb3J0IHJ1bGVzIHRvIHRoZSBiZWdpbm5pbmcgb2YgYSBuZXcgc3ludGF4IHRyZWUgc28gdGhleSBhbHdheXNcbiAgICAvLyBwcmVjZWRlIG90aGVyIHJ1bGVzLlxuICAgIGNvbnN0IG5ld0FzdCA9IHBvc3Rjc3Mucm9vdCgpO1xuXG4gICAgY3NzQXN0cy5mb3JFYWNoKChhc3QpID0+IHtcbiAgICAgIGlmIChhc3Qubm9kZXMpIHtcbiAgICAgICAgLy8gUGljayBvbmx5IHRoZSBpbXBvcnRzIGZyb20gdGhlIGJlZ2lubmluZyBvZiBmaWxlIGlnbm9yaW5nIEBjaGFyc2V0XG4gICAgICAgIC8vIHJ1bGVzIGFzIGV2ZXJ5IGZpbGUgaXMgYXNzdW1lZCB0byBiZSBpbiBVVEYtOC5cbiAgICAgICAgY29uc3QgY2hhcnNldFJ1bGVzID0gYXN0Lm5vZGVzLmZpbHRlcihydWxlc1ByZWRpY2F0ZSgnY2hhcnNldCcpKTtcblxuICAgICAgICBpZiAoY2hhcnNldFJ1bGVzLnNvbWUoKHJ1bGUpID0+IHtcbiAgICAgICAgICAvLyBBY2NvcmRpbmcgdG8gTUROLCBvbmx5ICdVVEYtOCcgYW5kIFwiVVRGLThcIiBhcmUgdGhlIGNvcnJlY3RcbiAgICAgICAgICAvLyBlbmNvZGluZyBkaXJlY3RpdmVzIHJlcHJlc2VudGluZyBVVEYtOC5cbiAgICAgICAgICByZXR1cm4gISAvXihbJ1wiXSlVVEYtOFxcMSQvLnRlc3QocnVsZS5wYXJhbXMpO1xuICAgICAgICB9KSkge1xuICAgICAgICAgIHdhcm5DYihcbiAgICAgICAgICAgIGFzdC5maWxlbmFtZSxcbiAgICAgICAgICAgICdAY2hhcnNldCBydWxlcyBpbiB0aGlzIGZpbGUgd2lsbCBiZSBpZ25vcmVkIGFzIFVURi04IGlzIHRoZSAnICtcbiAgICAgICAgICAgICdvbmx5IGVuY29kaW5nIHN1cHBvcnRlZCdcbiAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgYXN0Lm5vZGVzID0gYXN0Lm5vZGVzLmZpbHRlcihydWxlc1ByZWRpY2F0ZSgnY2hhcnNldCcsIHRydWUpKTtcbiAgICAgICAgbGV0IGltcG9ydENvdW50ID0gMDtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhc3Qubm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBpZiAoISBydWxlc1ByZWRpY2F0ZShbJ2ltcG9ydCcsICdjb21tZW50J10pKGFzdC5ub2Rlc1tpXSkpIHtcbiAgICAgICAgICAgIGltcG9ydENvdW50ID0gaTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIENzc1Rvb2xzLnJld3JpdGVDc3NVcmxzKGFzdCk7XG5cbiAgICAgICAgY29uc3QgaW1wb3J0cyA9IGFzdC5ub2Rlcy5zcGxpY2UoMCwgaW1wb3J0Q291bnQpO1xuICAgICAgICBuZXdBc3Qubm9kZXMucHVzaCguLi5pbXBvcnRzKTtcblxuICAgICAgICAvLyBJZiB0aGVyZSBhcmUgaW1wb3J0cyBsZWZ0IGluIHRoZSBtaWRkbGUgb2YgYSBmaWxlLCB3YXJuIHVzZXJzIGFzIGl0XG4gICAgICAgIC8vIG1pZ2h0IGJlIGEgcG90ZW50aWFsIGJ1ZyAoaW1wb3J0cyBhcmUgb25seSB2YWxpZCBhdCB0aGUgYmVnaW5uaW5nIG9mXG4gICAgICAgIC8vIGEgZmlsZSkuXG4gICAgICAgIGlmIChhc3Qubm9kZXMuc29tZShydWxlc1ByZWRpY2F0ZSgnaW1wb3J0JykpKSB7XG4gICAgICAgICAgd2FybkNiKFxuICAgICAgICAgICAgYXN0LmZpbGVuYW1lLFxuICAgICAgICAgICAgJ1RoZXJlIGFyZSBzb21lIEBpbXBvcnQgcnVsZXMgaW4gdGhlIG1pZGRsZSBvZiBhIGZpbGUuIFRoaXMgJyArXG4gICAgICAgICAgICAnbWlnaHQgYmUgYSBidWcsIGFzIGltcG9ydHMgYXJlIG9ubHkgdmFsaWQgYXQgdGhlIGJlZ2lubmluZyBvZiAnICtcbiAgICAgICAgICAgICdhIGZpbGUuJ1xuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIE5vdyB3ZSBjYW4gcHV0IHRoZSByZXN0IG9mIENTUyBydWxlcyBpbnRvIG5ldyBBU1QuXG4gICAgY3NzQXN0cy5mb3JFYWNoKChhc3QpID0+IHtcbiAgICAgIGlmIChhc3Qubm9kZXMpIHtcbiAgICAgICAgbmV3QXN0Lm5vZGVzLnB1c2goLi4uYXN0Lm5vZGVzKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBuZXdBc3Q7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFdlIGFyZSBsb29raW5nIGZvciBhbGwgcmVsYXRpdmUgdXJscyBkZWZpbmVkIHdpdGggdGhlIGB1cmwoKWAgZnVuY3Rpb25hbFxuICAgKiBub3RhdGlvbiBhbmQgcmV3cml0aW5nIHRoZW0gdG8gdGhlIGVxdWl2YWxlbnQgYWJzb2x1dGUgdXJsIHVzaW5nIHRoZVxuICAgKiBgc291cmNlYCBwYXRoIHByb3ZpZGVkIGJ5IHBvc3Rjc3MuIEZvciBwZXJmb3JtYW5jZSByZWFzb25zIHRoaXMgZnVuY3Rpb25cbiAgICogYWN0cyBieSBzaWRlIGVmZmVjdCBieSBtb2RpZnlpbmcgdGhlIGdpdmVuIEFTVCB3aXRob3V0IGRvaW5nIGEgZGVlcCBjb3B5LlxuICAgKlxuICAgKiBAcGFyYW0ge3Bvc3Rjc3MjUm9vdH0gYXN0IFBvc3RDU1MgUm9vdCBvYmplY3QuXG4gICAqIEByZXR1cm4gTW9kaWZpZXMgdGhlIGFzdCBwYXJhbSBpbiBwbGFjZS5cbiAgICovXG4gIHJld3JpdGVDc3NVcmxzKGFzdCkge1xuICAgIGNvbnN0IG1lcmdlZENzc1BhdGggPSAnLyc7XG4gICAgcmV3cml0ZVJ1bGVzKGFzdC5ub2RlcywgbWVyZ2VkQ3NzUGF0aCk7XG4gIH1cbn07XG5cbmlmICh0eXBlb2YgUHJvZmlsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgW1xuICAgICdwYXJzZUNzcycsXG4gICAgJ3N0cmluZ2lmeUNzcycsXG4gICAgJ21pbmlmeUNzcycsXG4gICAgJ21pbmlmeUNzc0FzeW5jJyxcbiAgICAnbWVyZ2VDc3NBc3RzJyxcbiAgICAncmV3cml0ZUNzc1VybHMnLFxuICBdLmZvckVhY2goZnVuY05hbWUgPT4ge1xuICAgIENzc1Rvb2xzW2Z1bmNOYW1lXSA9IFByb2ZpbGUoYENzc1Rvb2xzLiR7ZnVuY05hbWV9YCwgQ3NzVG9vbHNbZnVuY05hbWVdKTtcbiAgfSk7XG59XG5cbmV4cG9ydCB7IENzc1Rvb2xzIH07XG5cbmNvbnN0IGhhc093biA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG5cbmNvbnN0IHJld3JpdGVSdWxlcyA9IChydWxlcywgbWVyZ2VkQ3NzUGF0aCkgPT4ge1xuICBydWxlcy5mb3JFYWNoKChydWxlKSA9PiB7XG4gICAgLy8gUmVjdXJzZSBpZiB0aGVyZSBhcmUgc3ViLXJ1bGVzLiBBbiBleGFtcGxlOlxuICAgIC8vICAgICBAbWVkaWEgKC4uLikge1xuICAgIC8vICAgICAgICAgLnJ1bGUgeyB1cmwoLi4uKTsgfVxuICAgIC8vICAgICB9XG4gICAgaWYgKGhhc093bi5jYWxsKHJ1bGUsICdub2RlcycpKSB7XG4gICAgICByZXdyaXRlUnVsZXMocnVsZS5ub2RlcywgbWVyZ2VkQ3NzUGF0aCk7XG4gICAgfVxuXG4gICAgY29uc3QgYXBwRGlyID0gcHJvY2Vzcy5jd2QoKTtcbiAgICBjb25zdCBzb3VyY2VGaWxlID0gcnVsZS5zb3VyY2UuaW5wdXQuZmlsZTtcbiAgICBjb25zdCBzb3VyY2VGaWxlRnJvbUFwcFJvb3QgPVxuICAgICAgc291cmNlRmlsZSA/IHNvdXJjZUZpbGUucmVwbGFjZShhcHBEaXIsICcnKSA6ICcnO1xuICAgIGxldCBiYXNlUGF0aCA9IHBhdGhKb2luKCcvJywgcGF0aERpcm5hbWUoc291cmNlRmlsZUZyb21BcHBSb290KSk7XG5cbiAgICAvLyBTZXQgdGhlIGNvcnJlY3QgYmFzZVBhdGggYmFzZWQgb24gaG93IHRoZSBsaW5rZWQgYXNzZXQgd2lsbCBiZSBzZXJ2ZWQuXG4gICAgLy8gWFhYIFRoaXMgaXMgd3JvbmcuIFdlIGFyZSBjb3VwbGluZyB0aGUgaW5mb3JtYXRpb24gYWJvdXQgaG93IGZpbGVzIHdpbGxcbiAgICAvLyBiZSBzZXJ2ZWQgYnkgdGhlIHdlYiBzZXJ2ZXIgdG8gdGhlIGluZm9ybWF0aW9uIGhvdyB0aGV5IHdlcmUgc3RvcmVkXG4gICAgLy8gb3JpZ2luYWxseSBvbiB0aGUgZmlsZXN5c3RlbSBpbiB0aGUgcHJvamVjdCBzdHJ1Y3R1cmUuIElkZWFsbHksIHRoZXJlXG4gICAgLy8gc2hvdWxkIGJlIHNvbWUgbW9kdWxlIHRoYXQgdGVsbHMgdXMgcHJlY2lzZWx5IGhvdyBlYWNoIGFzc2V0IHdpbGwgYmVcbiAgICAvLyBzZXJ2ZWQgYnV0IGZvciBub3cgd2UgYXJlIGp1c3QgYXNzdW1pbmcgdGhhdCBldmVyeXRoaW5nIHRoYXQgY29tZXMgZnJvbVxuICAgIC8vIGEgZm9sZGVyIHN0YXJ0aW5nIHdpdGggXCIvcGFja2FnZXMvXCIgaXMgc2VydmVkIG9uIHRoZSBzYW1lIHBhdGggYXNcbiAgICAvLyBpdCB3YXMgb24gdGhlIGZpbGVzeXN0ZW0gYW5kIGV2ZXJ5dGhpbmcgZWxzZSBpcyBzZXJ2ZWQgb24gcm9vdCBcIi9cIi5cbiAgICBpZiAoISBiYXNlUGF0aC5tYXRjaCgvXlxcLz9wYWNrYWdlc1xcLy9pKSkge1xuICAgICAgYmFzZVBhdGggPSBcIi9cIjtcbiAgICB9XG5cbiAgICBsZXQgdmFsdWUgPSBydWxlLnZhbHVlO1xuXG4gICAgLy8gTWF0Y2ggY3NzIHZhbHVlcyBjb250YWluaW5nIHNvbWUgZnVuY3Rpb25hbCBjYWxscyB0byBgdXJsKFVSSSlgIHdoZXJlXG4gICAgLy8gVVJJIGlzIG9wdGlvbmFsbHkgcXVvdGVkLlxuICAgIC8vIE5vdGUgdGhhdCBhIGNzcyB2YWx1ZSBjYW4gY29udGFpbnMgb3RoZXIgZWxlbWVudHMsIGZvciBpbnN0YW5jZTpcbiAgICAvLyAgIGJhY2tncm91bmQ6IHRvcCBjZW50ZXIgdXJsKFwiYmFja2dyb3VuZC5wbmdcIikgYmxhY2s7XG4gICAgLy8gb3IgZXZlbiBtdWx0aXBsZSB1cmwoKSwgZm9yIGluc3RhbmNlIGZvciBtdWx0aXBsZSBiYWNrZ3JvdW5kcy5cbiAgICB2YXIgY3NzVXJsUmVnZXggPSAvdXJsXFxzKlxcKFxccyooWydcIl0/KSguKz8pXFwxXFxzKlxcKS9naTtcbiAgICBsZXQgcGFydHM7XG4gICAgd2hpbGUgKHBhcnRzID0gY3NzVXJsUmVnZXguZXhlYyh2YWx1ZSkpIHtcbiAgICAgIGNvbnN0IG9sZENzc1VybCA9IHBhcnRzWzBdO1xuICAgICAgY29uc3QgcXVvdGUgPSBwYXJ0c1sxXTtcbiAgICAgIGNvbnN0IHJlc291cmNlID0gdXJsLnBhcnNlKHBhcnRzWzJdKTtcblxuICAgICAgLy8gV2UgZG9uJ3QgcmV3cml0ZSBVUkxzIHN0YXJ0aW5nIHdpdGggYSBwcm90b2NvbCBkZWZpbml0aW9uIHN1Y2ggYXNcbiAgICAgIC8vIGh0dHAsIGh0dHBzLCBvciBkYXRhLCBvciB0aG9zZSB3aXRoIG5ldHdvcmstcGF0aCByZWZlcmVuY2VzXG4gICAgICAvLyBpLmUuIC8vaW1nLmRvbWFpbi5jb20vY2F0LmdpZlxuICAgICAgaWYgKHJlc291cmNlLnByb3RvY29sICE9PSBudWxsIHx8XG4gICAgICAgICAgcmVzb3VyY2UuaHJlZi5zdGFydHNXaXRoKCcvLycpIHx8XG4gICAgICAgICAgcmVzb3VyY2UuaHJlZi5zdGFydHNXaXRoKCcjJykpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIC8vIFJld3JpdGUgcmVsYXRpdmUgcGF0aHMgKHRoYXQgcmVmZXJzIHRvIHRoZSBpbnRlcm5hbCBhcHBsaWNhdGlvbiB0cmVlKVxuICAgICAgLy8gdG8gYWJzb2x1dGUgcGF0aHMgKGFkZHJlc3NhYmxlIGZyb20gdGhlIHB1YmxpYyBidWlsZCkuXG4gICAgICBsZXQgYWJzb2x1dGVQYXRoID0gaXNSZWxhdGl2ZShyZXNvdXJjZS5wYXRoKVxuICAgICAgICA/IHBhdGhKb2luKGJhc2VQYXRoLCByZXNvdXJjZS5wYXRoKVxuICAgICAgICA6IHJlc291cmNlLnBhdGg7XG5cbiAgICAgIGlmIChyZXNvdXJjZS5oYXNoKSB7XG4gICAgICAgIGFic29sdXRlUGF0aCArPSByZXNvdXJjZS5oYXNoO1xuICAgICAgfVxuXG4gICAgICAvLyBXZSB1c2VkIHRvIGZpbmlzaCB0aGUgcmV3cml0aW5nIHByb2Nlc3MgYXQgdGhlIGFic29sdXRlIHBhdGggc3RlcFxuICAgICAgLy8gYWJvdmUuIEJ1dCBpdCBkaWRuJ3Qgd29yayBpbiBjYXNlIHRoZSBNZXRlb3IgYXBwbGljYXRpb24gd2FzIGRlcGxveWVkXG4gICAgICAvLyB1bmRlciBhIHN1Yi1wYXRoIChlZyBgUk9PVF9VUkw9aHR0cDovL2xvY2FsaG9zdDozMDAwL215YXBwIG1ldGVvcmApXG4gICAgICAvLyBpbiB3aGljaCBjYXNlIHRoZSByZXNvdXJjZXMgbGlua2VkIGluIHRoZSBtZXJnZWQgQ1NTIGZpbGUgd291bGQgbWlzc1xuICAgICAgLy8gdGhlIGBteWFwcC9gIHByZWZpeC4gU2luY2UgdGhpcyBwYXRoIHByZWZpeCBpcyBvbmx5IGtub3duIGF0IGxhdW5jaFxuICAgICAgLy8gdGltZSAocmF0aGVyIHRoYW4gYnVpbGQgdGltZSkgd2UgY2FuJ3QgdXNlIGFic29sdXRlIHBhdGhzIHRvIGxpbmtcbiAgICAgIC8vIHJlc291cmNlcyBpbiB0aGUgZ2VuZXJhdGVkIENTUy5cbiAgICAgIC8vXG4gICAgICAvLyBJbnN0ZWFkIHdlIHRyYW5zZm9ybSBhYnNvbHV0ZSBwYXRocyB0byBtYWtlIHRoZW0gcmVsYXRpdmUgdG8gdGhlXG4gICAgICAvLyBtZXJnZWQgQ1NTLCBsZWF2aW5nIHRvIHRoZSBicm93c2VyIHRoZSByZXNwb25zaWJpbGl0eSB0byBjYWxjdWxhdGVcbiAgICAgIC8vIHRoZSBmaW5hbCByZXNvdXJjZSBsaW5rcyAoYnkgYWRkaW5nIHRoZSBhcHBsaWNhdGlvbiBkZXBsb3ltZW50XG4gICAgICAvLyBwcmVmaXgsIGhlcmUgYG15YXBwL2AsIGlmIGFwcGxpY2FibGUpLlxuICAgICAgY29uc3QgcmVsYXRpdmVUb01lcmdlZENzcyA9IHBhdGhSZWxhdGl2ZShtZXJnZWRDc3NQYXRoLCBhYnNvbHV0ZVBhdGgpO1xuICAgICAgY29uc3QgbmV3Q3NzVXJsID0gYHVybCgke3F1b3RlfSR7cmVsYXRpdmVUb01lcmdlZENzc30ke3F1b3RlfSlgO1xuICAgICAgdmFsdWUgPSB2YWx1ZS5yZXBsYWNlKG9sZENzc1VybCwgbmV3Q3NzVXJsKTtcbiAgICB9XG5cbiAgICBydWxlLnZhbHVlID0gdmFsdWU7XG4gIH0pO1xufTtcblxuY29uc3QgaXNSZWxhdGl2ZSA9IHBhdGggPT4gcGF0aCAmJiBwYXRoLmNoYXJBdCgwKSAhPT0gJy8nO1xuXG4vLyBUaGVzZSBhcmUgZHVwbGljYXRlcyBvZiBmdW5jdGlvbnMgaW4gdG9vbHMvZmlsZXMuanMsIGJlY2F1c2Ugd2UgZG9uJ3QgaGF2ZVxuLy8gYSBnb29kIHdheSBvZiBleHBvcnRpbmcgdGhlbSBpbnRvIHBhY2thZ2VzLlxuLy8gWFhYIGRlZHVwbGljYXRlIGZpbGVzLmpzIGludG8gYSBwYWNrYWdlIGF0IHNvbWUgcG9pbnQgc28gdGhhdCB3ZSBjYW4gdXNlIGl0XG4vLyBpbiBjb3JlXG5jb25zdCB0b09TUGF0aCA9XG4gIHAgPT4gcHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJyA/IHAucmVwbGFjZSgvXFwvL2csICdcXFxcJykgOiBwO1xuY29uc3QgdG9TdGFuZGFyZFBhdGggPVxuICBwID0+IHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMicgPyBwLnJlcGxhY2UoL1xcXFwvZywgJy8nKSA6IHA7XG5jb25zdCBwYXRoSm9pbiA9XG4gIChhLCBiKSA9PiB0b1N0YW5kYXJkUGF0aChwYXRoLmpvaW4odG9PU1BhdGgoYSksIHRvT1NQYXRoKGIpKSk7XG5jb25zdCBwYXRoRGlybmFtZSA9XG4gIHAgPT4gdG9TdGFuZGFyZFBhdGgocGF0aC5kaXJuYW1lKHRvT1NQYXRoKHApKSk7XG5jb25zdCBwYXRoUmVsYXRpdmUgPVxuICAocDEsIHAyKSA9PiB0b1N0YW5kYXJkUGF0aChwYXRoLnJlbGF0aXZlKHRvT1NQYXRoKHAxKSwgdG9PU1BhdGgocDIpKSk7XG4iXX0=
