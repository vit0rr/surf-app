(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var DiffSequence = Package['diff-sequence'].DiffSequence;
var ECMAScript = Package.ecmascript.ECMAScript;
var EJSON = Package.ejson.EJSON;
var GeoJSON = Package['geojson-utils'].GeoJSON;
var IdMap = Package['id-map'].IdMap;
var MongoID = Package['mongo-id'].MongoID;
var OrderedDict = Package['ordered-dict'].OrderedDict;
var Random = Package.random.Random;
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var Decimal = Package['mongo-decimal'].Decimal;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var operand, selectorValue, MinimongoTest, MinimongoError, selector, doc, callback, options, oldResults, a, b, LocalCollection, Minimongo;

var require = meteorInstall({"node_modules":{"meteor":{"minimongo":{"minimongo_server.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/minimongo_server.js                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.link("./minimongo_common.js");
let hasOwn, isNumericKey, isOperatorObject, pathsToTree, projectionDetails;
module.link("./common.js", {
  hasOwn(v) {
    hasOwn = v;
  },
  isNumericKey(v) {
    isNumericKey = v;
  },
  isOperatorObject(v) {
    isOperatorObject = v;
  },
  pathsToTree(v) {
    pathsToTree = v;
  },
  projectionDetails(v) {
    projectionDetails = v;
  }
}, 0);
Minimongo._pathsElidingNumericKeys = paths => paths.map(path => path.split('.').filter(part => !isNumericKey(part)).join('.'));

// Returns true if the modifier applied to some document may change the result
// of matching the document by selector
// The modifier is always in a form of Object:
//  - $set
//    - 'a.b.22.z': value
//    - 'foo.bar': 42
//  - $unset
//    - 'abc.d': 1
Minimongo.Matcher.prototype.affectedByModifier = function (modifier) {
  // safe check for $set/$unset being objects
  modifier = Object.assign({
    $set: {},
    $unset: {}
  }, modifier);
  const meaningfulPaths = this._getPaths();
  const modifiedPaths = [].concat(Object.keys(modifier.$set), Object.keys(modifier.$unset));
  return modifiedPaths.some(path => {
    const mod = path.split('.');
    return meaningfulPaths.some(meaningfulPath => {
      const sel = meaningfulPath.split('.');
      let i = 0,
        j = 0;
      while (i < sel.length && j < mod.length) {
        if (isNumericKey(sel[i]) && isNumericKey(mod[j])) {
          // foo.4.bar selector affected by foo.4 modifier
          // foo.3.bar selector unaffected by foo.4 modifier
          if (sel[i] === mod[j]) {
            i++;
            j++;
          } else {
            return false;
          }
        } else if (isNumericKey(sel[i])) {
          // foo.4.bar selector unaffected by foo.bar modifier
          return false;
        } else if (isNumericKey(mod[j])) {
          j++;
        } else if (sel[i] === mod[j]) {
          i++;
          j++;
        } else {
          return false;
        }
      }

      // One is a prefix of another, taking numeric fields into account
      return true;
    });
  });
};

// @param modifier - Object: MongoDB-styled modifier with `$set`s and `$unsets`
//                           only. (assumed to come from oplog)
// @returns - Boolean: if after applying the modifier, selector can start
//                     accepting the modified value.
// NOTE: assumes that document affected by modifier didn't match this Matcher
// before, so if modifier can't convince selector in a positive change it would
// stay 'false'.
// Currently doesn't support $-operators and numeric indices precisely.
Minimongo.Matcher.prototype.canBecomeTrueByModifier = function (modifier) {
  if (!this.affectedByModifier(modifier)) {
    return false;
  }
  if (!this.isSimple()) {
    return true;
  }
  modifier = Object.assign({
    $set: {},
    $unset: {}
  }, modifier);
  const modifierPaths = [].concat(Object.keys(modifier.$set), Object.keys(modifier.$unset));
  if (this._getPaths().some(pathHasNumericKeys) || modifierPaths.some(pathHasNumericKeys)) {
    return true;
  }

  // check if there is a $set or $unset that indicates something is an
  // object rather than a scalar in the actual object where we saw $-operator
  // NOTE: it is correct since we allow only scalars in $-operators
  // Example: for selector {'a.b': {$gt: 5}} the modifier {'a.b.c':7} would
  // definitely set the result to false as 'a.b' appears to be an object.
  const expectedScalarIsObject = Object.keys(this._selector).some(path => {
    if (!isOperatorObject(this._selector[path])) {
      return false;
    }
    return modifierPaths.some(modifierPath => modifierPath.startsWith("".concat(path, ".")));
  });
  if (expectedScalarIsObject) {
    return false;
  }

  // See if we can apply the modifier on the ideally matching object. If it
  // still matches the selector, then the modifier could have turned the real
  // object in the database into something matching.
  const matchingDocument = EJSON.clone(this.matchingDocument());

  // The selector is too complex, anything can happen.
  if (matchingDocument === null) {
    return true;
  }
  try {
    LocalCollection._modify(matchingDocument, modifier);
  } catch (error) {
    // Couldn't set a property on a field which is a scalar or null in the
    // selector.
    // Example:
    // real document: { 'a.b': 3 }
    // selector: { 'a': 12 }
    // converted selector (ideal document): { 'a': 12 }
    // modifier: { $set: { 'a.b': 4 } }
    // We don't know what real document was like but from the error raised by
    // $set on a scalar field we can reason that the structure of real document
    // is completely different.
    if (error.name === 'MinimongoError' && error.setPropertyError) {
      return false;
    }
    throw error;
  }
  return this.documentMatches(matchingDocument).result;
};

// Knows how to combine a mongo selector and a fields projection to a new fields
// projection taking into account active fields from the passed selector.
// @returns Object - projection object (same as fields option of mongo cursor)
Minimongo.Matcher.prototype.combineIntoProjection = function (projection) {
  const selectorPaths = Minimongo._pathsElidingNumericKeys(this._getPaths());

  // Special case for $where operator in the selector - projection should depend
  // on all fields of the document. getSelectorPaths returns a list of paths
  // selector depends on. If one of the paths is '' (empty string) representing
  // the root or the whole document, complete projection should be returned.
  if (selectorPaths.includes('')) {
    return {};
  }
  return combineImportantPathsIntoProjection(selectorPaths, projection);
};

// Returns an object that would match the selector if possible or null if the
// selector is too complex for us to analyze
// { 'a.b': { ans: 42 }, 'foo.bar': null, 'foo.baz': "something" }
// => { a: { b: { ans: 42 } }, foo: { bar: null, baz: "something" } }
Minimongo.Matcher.prototype.matchingDocument = function () {
  // check if it was computed before
  if (this._matchingDocument !== undefined) {
    return this._matchingDocument;
  }

  // If the analysis of this selector is too hard for our implementation
  // fallback to "YES"
  let fallback = false;
  this._matchingDocument = pathsToTree(this._getPaths(), path => {
    const valueSelector = this._selector[path];
    if (isOperatorObject(valueSelector)) {
      // if there is a strict equality, there is a good
      // chance we can use one of those as "matching"
      // dummy value
      if (valueSelector.$eq) {
        return valueSelector.$eq;
      }
      if (valueSelector.$in) {
        const matcher = new Minimongo.Matcher({
          placeholder: valueSelector
        });

        // Return anything from $in that matches the whole selector for this
        // path. If nothing matches, returns `undefined` as nothing can make
        // this selector into `true`.
        return valueSelector.$in.find(placeholder => matcher.documentMatches({
          placeholder
        }).result);
      }
      if (onlyContainsKeys(valueSelector, ['$gt', '$gte', '$lt', '$lte'])) {
        let lowerBound = -Infinity;
        let upperBound = Infinity;
        ['$lte', '$lt'].forEach(op => {
          if (hasOwn.call(valueSelector, op) && valueSelector[op] < upperBound) {
            upperBound = valueSelector[op];
          }
        });
        ['$gte', '$gt'].forEach(op => {
          if (hasOwn.call(valueSelector, op) && valueSelector[op] > lowerBound) {
            lowerBound = valueSelector[op];
          }
        });
        const middle = (lowerBound + upperBound) / 2;
        const matcher = new Minimongo.Matcher({
          placeholder: valueSelector
        });
        if (!matcher.documentMatches({
          placeholder: middle
        }).result && (middle === lowerBound || middle === upperBound)) {
          fallback = true;
        }
        return middle;
      }
      if (onlyContainsKeys(valueSelector, ['$nin', '$ne'])) {
        // Since this._isSimple makes sure $nin and $ne are not combined with
        // objects or arrays, we can confidently return an empty object as it
        // never matches any scalar.
        return {};
      }
      fallback = true;
    }
    return this._selector[path];
  }, x => x);
  if (fallback) {
    this._matchingDocument = null;
  }
  return this._matchingDocument;
};

// Minimongo.Sorter gets a similar method, which delegates to a Matcher it made
// for this exact purpose.
Minimongo.Sorter.prototype.affectedByModifier = function (modifier) {
  return this._selectorForAffectedByModifier.affectedByModifier(modifier);
};
Minimongo.Sorter.prototype.combineIntoProjection = function (projection) {
  return combineImportantPathsIntoProjection(Minimongo._pathsElidingNumericKeys(this._getPaths()), projection);
};
function combineImportantPathsIntoProjection(paths, projection) {
  const details = projectionDetails(projection);

  // merge the paths to include
  const tree = pathsToTree(paths, path => true, (node, path, fullPath) => true, details.tree);
  const mergedProjection = treeToPaths(tree);
  if (details.including) {
    // both selector and projection are pointing on fields to include
    // so we can just return the merged tree
    return mergedProjection;
  }

  // selector is pointing at fields to include
  // projection is pointing at fields to exclude
  // make sure we don't exclude important paths
  const mergedExclProjection = {};
  Object.keys(mergedProjection).forEach(path => {
    if (!mergedProjection[path]) {
      mergedExclProjection[path] = false;
    }
  });
  return mergedExclProjection;
}
function getPaths(selector) {
  return Object.keys(new Minimongo.Matcher(selector)._paths);

  // XXX remove it?
  // return Object.keys(selector).map(k => {
  //   // we don't know how to handle $where because it can be anything
  //   if (k === '$where') {
  //     return ''; // matches everything
  //   }

  //   // we branch from $or/$and/$nor operator
  //   if (['$or', '$and', '$nor'].includes(k)) {
  //     return selector[k].map(getPaths);
  //   }

  //   // the value is a literal or some comparison operator
  //   return k;
  // })
  //   .reduce((a, b) => a.concat(b), [])
  //   .filter((a, b, c) => c.indexOf(a) === b);
}

// A helper to ensure object has only certain keys
function onlyContainsKeys(obj, keys) {
  return Object.keys(obj).every(k => keys.includes(k));
}
function pathHasNumericKeys(path) {
  return path.split('.').some(isNumericKey);
}

// Returns a set of key paths similar to
// { 'foo.bar': 1, 'a.b.c': 1 }
function treeToPaths(tree) {
  let prefix = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
  const result = {};
  Object.keys(tree).forEach(key => {
    const value = tree[key];
    if (value === Object(value)) {
      Object.assign(result, treeToPaths(value, "".concat(prefix + key, ".")));
    } else {
      result[prefix + key] = value;
    }
  });
  return result;
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"common.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/common.js                                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  hasOwn: () => hasOwn,
  ELEMENT_OPERATORS: () => ELEMENT_OPERATORS,
  compileDocumentSelector: () => compileDocumentSelector,
  equalityElementMatcher: () => equalityElementMatcher,
  expandArraysInBranches: () => expandArraysInBranches,
  isIndexable: () => isIndexable,
  isNumericKey: () => isNumericKey,
  isOperatorObject: () => isOperatorObject,
  makeLookupFunction: () => makeLookupFunction,
  nothingMatcher: () => nothingMatcher,
  pathsToTree: () => pathsToTree,
  populateDocumentWithQueryFields: () => populateDocumentWithQueryFields,
  projectionDetails: () => projectionDetails,
  regexpElementMatcher: () => regexpElementMatcher
});
let LocalCollection;
module.link("./local_collection.js", {
  default(v) {
    LocalCollection = v;
  }
}, 0);
const hasOwn = Object.prototype.hasOwnProperty;
const ELEMENT_OPERATORS = {
  $lt: makeInequality(cmpValue => cmpValue < 0),
  $gt: makeInequality(cmpValue => cmpValue > 0),
  $lte: makeInequality(cmpValue => cmpValue <= 0),
  $gte: makeInequality(cmpValue => cmpValue >= 0),
  $mod: {
    compileElementSelector(operand) {
      if (!(Array.isArray(operand) && operand.length === 2 && typeof operand[0] === 'number' && typeof operand[1] === 'number')) {
        throw Error('argument to $mod must be an array of two numbers');
      }

      // XXX could require to be ints or round or something
      const divisor = operand[0];
      const remainder = operand[1];
      return value => typeof value === 'number' && value % divisor === remainder;
    }
  },
  $in: {
    compileElementSelector(operand) {
      if (!Array.isArray(operand)) {
        throw Error('$in needs an array');
      }
      const elementMatchers = operand.map(option => {
        if (option instanceof RegExp) {
          return regexpElementMatcher(option);
        }
        if (isOperatorObject(option)) {
          throw Error('cannot nest $ under $in');
        }
        return equalityElementMatcher(option);
      });
      return value => {
        // Allow {a: {$in: [null]}} to match when 'a' does not exist.
        if (value === undefined) {
          value = null;
        }
        return elementMatchers.some(matcher => matcher(value));
      };
    }
  },
  $size: {
    // {a: [[5, 5]]} must match {a: {$size: 1}} but not {a: {$size: 2}}, so we
    // don't want to consider the element [5,5] in the leaf array [[5,5]] as a
    // possible value.
    dontExpandLeafArrays: true,
    compileElementSelector(operand) {
      if (typeof operand === 'string') {
        // Don't ask me why, but by experimentation, this seems to be what Mongo
        // does.
        operand = 0;
      } else if (typeof operand !== 'number') {
        throw Error('$size needs a number');
      }
      return value => Array.isArray(value) && value.length === operand;
    }
  },
  $type: {
    // {a: [5]} must not match {a: {$type: 4}} (4 means array), but it should
    // match {a: {$type: 1}} (1 means number), and {a: [[5]]} must match {$a:
    // {$type: 4}}. Thus, when we see a leaf array, we *should* expand it but
    // should *not* include it itself.
    dontIncludeLeafArrays: true,
    compileElementSelector(operand) {
      if (typeof operand === 'string') {
        const operandAliasMap = {
          'double': 1,
          'string': 2,
          'object': 3,
          'array': 4,
          'binData': 5,
          'undefined': 6,
          'objectId': 7,
          'bool': 8,
          'date': 9,
          'null': 10,
          'regex': 11,
          'dbPointer': 12,
          'javascript': 13,
          'symbol': 14,
          'javascriptWithScope': 15,
          'int': 16,
          'timestamp': 17,
          'long': 18,
          'decimal': 19,
          'minKey': -1,
          'maxKey': 127
        };
        if (!hasOwn.call(operandAliasMap, operand)) {
          throw Error("unknown string alias for $type: ".concat(operand));
        }
        operand = operandAliasMap[operand];
      } else if (typeof operand === 'number') {
        if (operand === 0 || operand < -1 || operand > 19 && operand !== 127) {
          throw Error("Invalid numerical $type code: ".concat(operand));
        }
      } else {
        throw Error('argument to $type is not a number or a string');
      }
      return value => value !== undefined && LocalCollection._f._type(value) === operand;
    }
  },
  $bitsAllSet: {
    compileElementSelector(operand) {
      const mask = getOperandBitmask(operand, '$bitsAllSet');
      return value => {
        const bitmask = getValueBitmask(value, mask.length);
        return bitmask && mask.every((byte, i) => (bitmask[i] & byte) === byte);
      };
    }
  },
  $bitsAnySet: {
    compileElementSelector(operand) {
      const mask = getOperandBitmask(operand, '$bitsAnySet');
      return value => {
        const bitmask = getValueBitmask(value, mask.length);
        return bitmask && mask.some((byte, i) => (~bitmask[i] & byte) !== byte);
      };
    }
  },
  $bitsAllClear: {
    compileElementSelector(operand) {
      const mask = getOperandBitmask(operand, '$bitsAllClear');
      return value => {
        const bitmask = getValueBitmask(value, mask.length);
        return bitmask && mask.every((byte, i) => !(bitmask[i] & byte));
      };
    }
  },
  $bitsAnyClear: {
    compileElementSelector(operand) {
      const mask = getOperandBitmask(operand, '$bitsAnyClear');
      return value => {
        const bitmask = getValueBitmask(value, mask.length);
        return bitmask && mask.some((byte, i) => (bitmask[i] & byte) !== byte);
      };
    }
  },
  $regex: {
    compileElementSelector(operand, valueSelector) {
      if (!(typeof operand === 'string' || operand instanceof RegExp)) {
        throw Error('$regex has to be a string or RegExp');
      }
      let regexp;
      if (valueSelector.$options !== undefined) {
        // Options passed in $options (even the empty string) always overrides
        // options in the RegExp object itself.

        // Be clear that we only support the JS-supported options, not extended
        // ones (eg, Mongo supports x and s). Ideally we would implement x and s
        // by transforming the regexp, but not today...
        if (/[^gim]/.test(valueSelector.$options)) {
          throw new Error('Only the i, m, and g regexp options are supported');
        }
        const source = operand instanceof RegExp ? operand.source : operand;
        regexp = new RegExp(source, valueSelector.$options);
      } else if (operand instanceof RegExp) {
        regexp = operand;
      } else {
        regexp = new RegExp(operand);
      }
      return regexpElementMatcher(regexp);
    }
  },
  $elemMatch: {
    dontExpandLeafArrays: true,
    compileElementSelector(operand, valueSelector, matcher) {
      if (!LocalCollection._isPlainObject(operand)) {
        throw Error('$elemMatch need an object');
      }
      const isDocMatcher = !isOperatorObject(Object.keys(operand).filter(key => !hasOwn.call(LOGICAL_OPERATORS, key)).reduce((a, b) => Object.assign(a, {
        [b]: operand[b]
      }), {}), true);
      let subMatcher;
      if (isDocMatcher) {
        // This is NOT the same as compileValueSelector(operand), and not just
        // because of the slightly different calling convention.
        // {$elemMatch: {x: 3}} means "an element has a field x:3", not
        // "consists only of a field x:3". Also, regexps and sub-$ are allowed.
        subMatcher = compileDocumentSelector(operand, matcher, {
          inElemMatch: true
        });
      } else {
        subMatcher = compileValueSelector(operand, matcher);
      }
      return value => {
        if (!Array.isArray(value)) {
          return false;
        }
        for (let i = 0; i < value.length; ++i) {
          const arrayElement = value[i];
          let arg;
          if (isDocMatcher) {
            // We can only match {$elemMatch: {b: 3}} against objects.
            // (We can also match against arrays, if there's numeric indices,
            // eg {$elemMatch: {'0.b': 3}} or {$elemMatch: {0: 3}}.)
            if (!isIndexable(arrayElement)) {
              return false;
            }
            arg = arrayElement;
          } else {
            // dontIterate ensures that {a: {$elemMatch: {$gt: 5}}} matches
            // {a: [8]} but not {a: [[8]]}
            arg = [{
              value: arrayElement,
              dontIterate: true
            }];
          }
          // XXX support $near in $elemMatch by propagating $distance?
          if (subMatcher(arg).result) {
            return i; // specially understood to mean "use as arrayIndices"
          }
        }
        return false;
      };
    }
  }
};
// Operators that appear at the top level of a document selector.
const LOGICAL_OPERATORS = {
  $and(subSelector, matcher, inElemMatch) {
    return andDocumentMatchers(compileArrayOfDocumentSelectors(subSelector, matcher, inElemMatch));
  },
  $or(subSelector, matcher, inElemMatch) {
    const matchers = compileArrayOfDocumentSelectors(subSelector, matcher, inElemMatch);

    // Special case: if there is only one matcher, use it directly, *preserving*
    // any arrayIndices it returns.
    if (matchers.length === 1) {
      return matchers[0];
    }
    return doc => {
      const result = matchers.some(fn => fn(doc).result);
      // $or does NOT set arrayIndices when it has multiple
      // sub-expressions. (Tested against MongoDB.)
      return {
        result
      };
    };
  },
  $nor(subSelector, matcher, inElemMatch) {
    const matchers = compileArrayOfDocumentSelectors(subSelector, matcher, inElemMatch);
    return doc => {
      const result = matchers.every(fn => !fn(doc).result);
      // Never set arrayIndices, because we only match if nothing in particular
      // 'matched' (and because this is consistent with MongoDB).
      return {
        result
      };
    };
  },
  $where(selectorValue, matcher) {
    // Record that *any* path may be used.
    matcher._recordPathUsed('');
    matcher._hasWhere = true;
    if (!(selectorValue instanceof Function)) {
      // XXX MongoDB seems to have more complex logic to decide where or or not
      // to add 'return'; not sure exactly what it is.
      selectorValue = Function('obj', "return ".concat(selectorValue));
    }

    // We make the document available as both `this` and `obj`.
    // // XXX not sure what we should do if this throws
    return doc => ({
      result: selectorValue.call(doc, doc)
    });
  },
  // This is just used as a comment in the query (in MongoDB, it also ends up in
  // query logs); it has no effect on the actual selection.
  $comment() {
    return () => ({
      result: true
    });
  }
};

// Operators that (unlike LOGICAL_OPERATORS) pertain to individual paths in a
// document, but (unlike ELEMENT_OPERATORS) do not have a simple definition as
// "match each branched value independently and combine with
// convertElementMatcherToBranchedMatcher".
const VALUE_OPERATORS = {
  $eq(operand) {
    return convertElementMatcherToBranchedMatcher(equalityElementMatcher(operand));
  },
  $not(operand, valueSelector, matcher) {
    return invertBranchedMatcher(compileValueSelector(operand, matcher));
  },
  $ne(operand) {
    return invertBranchedMatcher(convertElementMatcherToBranchedMatcher(equalityElementMatcher(operand)));
  },
  $nin(operand) {
    return invertBranchedMatcher(convertElementMatcherToBranchedMatcher(ELEMENT_OPERATORS.$in.compileElementSelector(operand)));
  },
  $exists(operand) {
    const exists = convertElementMatcherToBranchedMatcher(value => value !== undefined);
    return operand ? exists : invertBranchedMatcher(exists);
  },
  // $options just provides options for $regex; its logic is inside $regex
  $options(operand, valueSelector) {
    if (!hasOwn.call(valueSelector, '$regex')) {
      throw Error('$options needs a $regex');
    }
    return everythingMatcher;
  },
  // $maxDistance is basically an argument to $near
  $maxDistance(operand, valueSelector) {
    if (!valueSelector.$near) {
      throw Error('$maxDistance needs a $near');
    }
    return everythingMatcher;
  },
  $all(operand, valueSelector, matcher) {
    if (!Array.isArray(operand)) {
      throw Error('$all requires array');
    }

    // Not sure why, but this seems to be what MongoDB does.
    if (operand.length === 0) {
      return nothingMatcher;
    }
    const branchedMatchers = operand.map(criterion => {
      // XXX handle $all/$elemMatch combination
      if (isOperatorObject(criterion)) {
        throw Error('no $ expressions in $all');
      }

      // This is always a regexp or equality selector.
      return compileValueSelector(criterion, matcher);
    });

    // andBranchedMatchers does NOT require all selectors to return true on the
    // SAME branch.
    return andBranchedMatchers(branchedMatchers);
  },
  $near(operand, valueSelector, matcher, isRoot) {
    if (!isRoot) {
      throw Error('$near can\'t be inside another $ operator');
    }
    matcher._hasGeoQuery = true;

    // There are two kinds of geodata in MongoDB: legacy coordinate pairs and
    // GeoJSON. They use different distance metrics, too. GeoJSON queries are
    // marked with a $geometry property, though legacy coordinates can be
    // matched using $geometry.
    let maxDistance, point, distance;
    if (LocalCollection._isPlainObject(operand) && hasOwn.call(operand, '$geometry')) {
      // GeoJSON "2dsphere" mode.
      maxDistance = operand.$maxDistance;
      point = operand.$geometry;
      distance = value => {
        // XXX: for now, we don't calculate the actual distance between, say,
        // polygon and circle. If people care about this use-case it will get
        // a priority.
        if (!value) {
          return null;
        }
        if (!value.type) {
          return GeoJSON.pointDistance(point, {
            type: 'Point',
            coordinates: pointToArray(value)
          });
        }
        if (value.type === 'Point') {
          return GeoJSON.pointDistance(point, value);
        }
        return GeoJSON.geometryWithinRadius(value, point, maxDistance) ? 0 : maxDistance + 1;
      };
    } else {
      maxDistance = valueSelector.$maxDistance;
      if (!isIndexable(operand)) {
        throw Error('$near argument must be coordinate pair or GeoJSON');
      }
      point = pointToArray(operand);
      distance = value => {
        if (!isIndexable(value)) {
          return null;
        }
        return distanceCoordinatePairs(point, value);
      };
    }
    return branchedValues => {
      // There might be multiple points in the document that match the given
      // field. Only one of them needs to be within $maxDistance, but we need to
      // evaluate all of them and use the nearest one for the implicit sort
      // specifier. (That's why we can't just use ELEMENT_OPERATORS here.)
      //
      // Note: This differs from MongoDB's implementation, where a document will
      // actually show up *multiple times* in the result set, with one entry for
      // each within-$maxDistance branching point.
      const result = {
        result: false
      };
      expandArraysInBranches(branchedValues).every(branch => {
        // if operation is an update, don't skip branches, just return the first
        // one (#3599)
        let curDistance;
        if (!matcher._isUpdate) {
          if (!(typeof branch.value === 'object')) {
            return true;
          }
          curDistance = distance(branch.value);

          // Skip branches that aren't real points or are too far away.
          if (curDistance === null || curDistance > maxDistance) {
            return true;
          }

          // Skip anything that's a tie.
          if (result.distance !== undefined && result.distance <= curDistance) {
            return true;
          }
        }
        result.result = true;
        result.distance = curDistance;
        if (branch.arrayIndices) {
          result.arrayIndices = branch.arrayIndices;
        } else {
          delete result.arrayIndices;
        }
        return !matcher._isUpdate;
      });
      return result;
    };
  }
};

// NB: We are cheating and using this function to implement 'AND' for both
// 'document matchers' and 'branched matchers'. They both return result objects
// but the argument is different: for the former it's a whole doc, whereas for
// the latter it's an array of 'branched values'.
function andSomeMatchers(subMatchers) {
  if (subMatchers.length === 0) {
    return everythingMatcher;
  }
  if (subMatchers.length === 1) {
    return subMatchers[0];
  }
  return docOrBranches => {
    const match = {};
    match.result = subMatchers.every(fn => {
      const subResult = fn(docOrBranches);

      // Copy a 'distance' number out of the first sub-matcher that has
      // one. Yes, this means that if there are multiple $near fields in a
      // query, something arbitrary happens; this appears to be consistent with
      // Mongo.
      if (subResult.result && subResult.distance !== undefined && match.distance === undefined) {
        match.distance = subResult.distance;
      }

      // Similarly, propagate arrayIndices from sub-matchers... but to match
      // MongoDB behavior, this time the *last* sub-matcher with arrayIndices
      // wins.
      if (subResult.result && subResult.arrayIndices) {
        match.arrayIndices = subResult.arrayIndices;
      }
      return subResult.result;
    });

    // If we didn't actually match, forget any extra metadata we came up with.
    if (!match.result) {
      delete match.distance;
      delete match.arrayIndices;
    }
    return match;
  };
}
const andDocumentMatchers = andSomeMatchers;
const andBranchedMatchers = andSomeMatchers;
function compileArrayOfDocumentSelectors(selectors, matcher, inElemMatch) {
  if (!Array.isArray(selectors) || selectors.length === 0) {
    throw Error('$and/$or/$nor must be nonempty array');
  }
  return selectors.map(subSelector => {
    if (!LocalCollection._isPlainObject(subSelector)) {
      throw Error('$or/$and/$nor entries need to be full objects');
    }
    return compileDocumentSelector(subSelector, matcher, {
      inElemMatch
    });
  });
}

// Takes in a selector that could match a full document (eg, the original
// selector). Returns a function mapping document->result object.
//
// matcher is the Matcher object we are compiling.
//
// If this is the root document selector (ie, not wrapped in $and or the like),
// then isRoot is true. (This is used by $near.)
function compileDocumentSelector(docSelector, matcher) {
  let options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  const docMatchers = Object.keys(docSelector).map(key => {
    const subSelector = docSelector[key];
    if (key.substr(0, 1) === '$') {
      // Outer operators are either logical operators (they recurse back into
      // this function), or $where.
      if (!hasOwn.call(LOGICAL_OPERATORS, key)) {
        throw new Error("Unrecognized logical operator: ".concat(key));
      }
      matcher._isSimple = false;
      return LOGICAL_OPERATORS[key](subSelector, matcher, options.inElemMatch);
    }

    // Record this path, but only if we aren't in an elemMatcher, since in an
    // elemMatch this is a path inside an object in an array, not in the doc
    // root.
    if (!options.inElemMatch) {
      matcher._recordPathUsed(key);
    }

    // Don't add a matcher if subSelector is a function -- this is to match
    // the behavior of Meteor on the server (inherited from the node mongodb
    // driver), which is to ignore any part of a selector which is a function.
    if (typeof subSelector === 'function') {
      return undefined;
    }
    const lookUpByIndex = makeLookupFunction(key);
    const valueMatcher = compileValueSelector(subSelector, matcher, options.isRoot);
    return doc => valueMatcher(lookUpByIndex(doc));
  }).filter(Boolean);
  return andDocumentMatchers(docMatchers);
}
// Takes in a selector that could match a key-indexed value in a document; eg,
// {$gt: 5, $lt: 9}, or a regular expression, or any non-expression object (to
// indicate equality).  Returns a branched matcher: a function mapping
// [branched value]->result object.
function compileValueSelector(valueSelector, matcher, isRoot) {
  if (valueSelector instanceof RegExp) {
    matcher._isSimple = false;
    return convertElementMatcherToBranchedMatcher(regexpElementMatcher(valueSelector));
  }
  if (isOperatorObject(valueSelector)) {
    return operatorBranchedMatcher(valueSelector, matcher, isRoot);
  }
  return convertElementMatcherToBranchedMatcher(equalityElementMatcher(valueSelector));
}

// Given an element matcher (which evaluates a single value), returns a branched
// value (which evaluates the element matcher on all the branches and returns a
// more structured return value possibly including arrayIndices).
function convertElementMatcherToBranchedMatcher(elementMatcher) {
  let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  return branches => {
    const expanded = options.dontExpandLeafArrays ? branches : expandArraysInBranches(branches, options.dontIncludeLeafArrays);
    const match = {};
    match.result = expanded.some(element => {
      let matched = elementMatcher(element.value);

      // Special case for $elemMatch: it means "true, and use this as an array
      // index if I didn't already have one".
      if (typeof matched === 'number') {
        // XXX This code dates from when we only stored a single array index
        // (for the outermost array). Should we be also including deeper array
        // indices from the $elemMatch match?
        if (!element.arrayIndices) {
          element.arrayIndices = [matched];
        }
        matched = true;
      }

      // If some element matched, and it's tagged with array indices, include
      // those indices in our result object.
      if (matched && element.arrayIndices) {
        match.arrayIndices = element.arrayIndices;
      }
      return matched;
    });
    return match;
  };
}

// Helpers for $near.
function distanceCoordinatePairs(a, b) {
  const pointA = pointToArray(a);
  const pointB = pointToArray(b);
  return Math.hypot(pointA[0] - pointB[0], pointA[1] - pointB[1]);
}

// Takes something that is not an operator object and returns an element matcher
// for equality with that thing.
function equalityElementMatcher(elementSelector) {
  if (isOperatorObject(elementSelector)) {
    throw Error('Can\'t create equalityValueSelector for operator object');
  }

  // Special-case: null and undefined are equal (if you got undefined in there
  // somewhere, or if you got it due to some branch being non-existent in the
  // weird special case), even though they aren't with EJSON.equals.
  // undefined or null
  if (elementSelector == null) {
    return value => value == null;
  }
  return value => LocalCollection._f._equal(elementSelector, value);
}
function everythingMatcher(docOrBranchedValues) {
  return {
    result: true
  };
}
function expandArraysInBranches(branches, skipTheArrays) {
  const branchesOut = [];
  branches.forEach(branch => {
    const thisIsArray = Array.isArray(branch.value);

    // We include the branch itself, *UNLESS* we it's an array that we're going
    // to iterate and we're told to skip arrays.  (That's right, we include some
    // arrays even skipTheArrays is true: these are arrays that were found via
    // explicit numerical indices.)
    if (!(skipTheArrays && thisIsArray && !branch.dontIterate)) {
      branchesOut.push({
        arrayIndices: branch.arrayIndices,
        value: branch.value
      });
    }
    if (thisIsArray && !branch.dontIterate) {
      branch.value.forEach((value, i) => {
        branchesOut.push({
          arrayIndices: (branch.arrayIndices || []).concat(i),
          value
        });
      });
    }
  });
  return branchesOut;
}
// Helpers for $bitsAllSet/$bitsAnySet/$bitsAllClear/$bitsAnyClear.
function getOperandBitmask(operand, selector) {
  // numeric bitmask
  // You can provide a numeric bitmask to be matched against the operand field.
  // It must be representable as a non-negative 32-bit signed integer.
  // Otherwise, $bitsAllSet will return an error.
  if (Number.isInteger(operand) && operand >= 0) {
    return new Uint8Array(new Int32Array([operand]).buffer);
  }

  // bindata bitmask
  // You can also use an arbitrarily large BinData instance as a bitmask.
  if (EJSON.isBinary(operand)) {
    return new Uint8Array(operand.buffer);
  }

  // position list
  // If querying a list of bit positions, each <position> must be a non-negative
  // integer. Bit positions start at 0 from the least significant bit.
  if (Array.isArray(operand) && operand.every(x => Number.isInteger(x) && x >= 0)) {
    const buffer = new ArrayBuffer((Math.max(...operand) >> 3) + 1);
    const view = new Uint8Array(buffer);
    operand.forEach(x => {
      view[x >> 3] |= 1 << (x & 0x7);
    });
    return view;
  }

  // bad operand
  throw Error("operand to ".concat(selector, " must be a numeric bitmask (representable as a ") + 'non-negative 32-bit signed integer), a bindata bitmask or an array with ' + 'bit positions (non-negative integers)');
}
function getValueBitmask(value, length) {
  // The field value must be either numerical or a BinData instance. Otherwise,
  // $bits... will not match the current document.

  // numerical
  if (Number.isSafeInteger(value)) {
    // $bits... will not match numerical values that cannot be represented as a
    // signed 64-bit integer. This can be the case if a value is either too
    // large or small to fit in a signed 64-bit integer, or if it has a
    // fractional component.
    const buffer = new ArrayBuffer(Math.max(length, 2 * Uint32Array.BYTES_PER_ELEMENT));
    let view = new Uint32Array(buffer, 0, 2);
    view[0] = value % ((1 << 16) * (1 << 16)) | 0;
    view[1] = value / ((1 << 16) * (1 << 16)) | 0;

    // sign extension
    if (value < 0) {
      view = new Uint8Array(buffer, 2);
      view.forEach((byte, i) => {
        view[i] = 0xff;
      });
    }
    return new Uint8Array(buffer);
  }

  // bindata
  if (EJSON.isBinary(value)) {
    return new Uint8Array(value.buffer);
  }

  // no match
  return false;
}

// Actually inserts a key value into the selector document
// However, this checks there is no ambiguity in setting
// the value for the given key, throws otherwise
function insertIntoDocument(document, key, value) {
  Object.keys(document).forEach(existingKey => {
    if (existingKey.length > key.length && existingKey.indexOf("".concat(key, ".")) === 0 || key.length > existingKey.length && key.indexOf("".concat(existingKey, ".")) === 0) {
      throw new Error("cannot infer query fields to set, both paths '".concat(existingKey, "' and ") + "'".concat(key, "' are matched"));
    } else if (existingKey === key) {
      throw new Error("cannot infer query fields to set, path '".concat(key, "' is matched twice"));
    }
  });
  document[key] = value;
}

// Returns a branched matcher that matches iff the given matcher does not.
// Note that this implicitly "deMorganizes" the wrapped function.  ie, it
// means that ALL branch values need to fail to match innerBranchedMatcher.
function invertBranchedMatcher(branchedMatcher) {
  return branchValues => {
    // We explicitly choose to strip arrayIndices here: it doesn't make sense to
    // say "update the array element that does not match something", at least
    // in mongo-land.
    return {
      result: !branchedMatcher(branchValues).result
    };
  };
}
function isIndexable(obj) {
  return Array.isArray(obj) || LocalCollection._isPlainObject(obj);
}
function isNumericKey(s) {
  return /^[0-9]+$/.test(s);
}
function isOperatorObject(valueSelector, inconsistentOK) {
  if (!LocalCollection._isPlainObject(valueSelector)) {
    return false;
  }
  let theseAreOperators = undefined;
  Object.keys(valueSelector).forEach(selKey => {
    const thisIsOperator = selKey.substr(0, 1) === '$' || selKey === 'diff';
    if (theseAreOperators === undefined) {
      theseAreOperators = thisIsOperator;
    } else if (theseAreOperators !== thisIsOperator) {
      if (!inconsistentOK) {
        throw new Error("Inconsistent operator: ".concat(JSON.stringify(valueSelector)));
      }
      theseAreOperators = false;
    }
  });
  return !!theseAreOperators; // {} has no operators
}
// Helper for $lt/$gt/$lte/$gte.
function makeInequality(cmpValueComparator) {
  return {
    compileElementSelector(operand) {
      // Arrays never compare false with non-arrays for any inequality.
      // XXX This was behavior we observed in pre-release MongoDB 2.5, but
      //     it seems to have been reverted.
      //     See https://jira.mongodb.org/browse/SERVER-11444
      if (Array.isArray(operand)) {
        return () => false;
      }

      // Special case: consider undefined and null the same (so true with
      // $gte/$lte).
      if (operand === undefined) {
        operand = null;
      }
      const operandType = LocalCollection._f._type(operand);
      return value => {
        if (value === undefined) {
          value = null;
        }

        // Comparisons are never true among things of different type (except
        // null vs undefined).
        if (LocalCollection._f._type(value) !== operandType) {
          return false;
        }
        return cmpValueComparator(LocalCollection._f._cmp(value, operand));
      };
    }
  };
}

// makeLookupFunction(key) returns a lookup function.
//
// A lookup function takes in a document and returns an array of matching
// branches.  If no arrays are found while looking up the key, this array will
// have exactly one branches (possibly 'undefined', if some segment of the key
// was not found).
//
// If arrays are found in the middle, this can have more than one element, since
// we 'branch'. When we 'branch', if there are more key segments to look up,
// then we only pursue branches that are plain objects (not arrays or scalars).
// This means we can actually end up with no branches!
//
// We do *NOT* branch on arrays that are found at the end (ie, at the last
// dotted member of the key). We just return that array; if you want to
// effectively 'branch' over the array's values, post-process the lookup
// function with expandArraysInBranches.
//
// Each branch is an object with keys:
//  - value: the value at the branch
//  - dontIterate: an optional bool; if true, it means that 'value' is an array
//    that expandArraysInBranches should NOT expand. This specifically happens
//    when there is a numeric index in the key, and ensures the
//    perhaps-surprising MongoDB behavior where {'a.0': 5} does NOT
//    match {a: [[5]]}.
//  - arrayIndices: if any array indexing was done during lookup (either due to
//    explicit numeric indices or implicit branching), this will be an array of
//    the array indices used, from outermost to innermost; it is falsey or
//    absent if no array index is used. If an explicit numeric index is used,
//    the index will be followed in arrayIndices by the string 'x'.
//
//    Note: arrayIndices is used for two purposes. First, it is used to
//    implement the '$' modifier feature, which only ever looks at its first
//    element.
//
//    Second, it is used for sort key generation, which needs to be able to tell
//    the difference between different paths. Moreover, it needs to
//    differentiate between explicit and implicit branching, which is why
//    there's the somewhat hacky 'x' entry: this means that explicit and
//    implicit array lookups will have different full arrayIndices paths. (That
//    code only requires that different paths have different arrayIndices; it
//    doesn't actually 'parse' arrayIndices. As an alternative, arrayIndices
//    could contain objects with flags like 'implicit', but I think that only
//    makes the code surrounding them more complex.)
//
//    (By the way, this field ends up getting passed around a lot without
//    cloning, so never mutate any arrayIndices field/var in this package!)
//
//
// At the top level, you may only pass in a plain object or array.
//
// See the test 'minimongo - lookup' for some examples of what lookup functions
// return.
function makeLookupFunction(key) {
  let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  const parts = key.split('.');
  const firstPart = parts.length ? parts[0] : '';
  const lookupRest = parts.length > 1 && makeLookupFunction(parts.slice(1).join('.'), options);
  function buildResult(arrayIndices, dontIterate, value) {
    return arrayIndices && arrayIndices.length ? dontIterate ? [{
      arrayIndices,
      dontIterate,
      value
    }] : [{
      arrayIndices,
      value
    }] : dontIterate ? [{
      dontIterate,
      value
    }] : [{
      value
    }];
  }

  // Doc will always be a plain object or an array.
  // apply an explicit numeric index, an array.
  return (doc, arrayIndices) => {
    if (Array.isArray(doc)) {
      // If we're being asked to do an invalid lookup into an array (non-integer
      // or out-of-bounds), return no results (which is different from returning
      // a single undefined result, in that `null` equality checks won't match).
      if (!(isNumericKey(firstPart) && firstPart < doc.length)) {
        return [];
      }

      // Remember that we used this array index. Include an 'x' to indicate that
      // the previous index came from being considered as an explicit array
      // index (not branching).
      arrayIndices = arrayIndices ? arrayIndices.concat(+firstPart, 'x') : [+firstPart, 'x'];
    }

    // Do our first lookup.
    const firstLevel = doc[firstPart];

    // If there is no deeper to dig, return what we found.
    //
    // If what we found is an array, most value selectors will choose to treat
    // the elements of the array as matchable values in their own right, but
    // that's done outside of the lookup function. (Exceptions to this are $size
    // and stuff relating to $elemMatch.  eg, {a: {$size: 2}} does not match {a:
    // [[1, 2]]}.)
    //
    // That said, if we just did an *explicit* array lookup (on doc) to find
    // firstLevel, and firstLevel is an array too, we do NOT want value
    // selectors to iterate over it.  eg, {'a.0': 5} does not match {a: [[5]]}.
    // So in that case, we mark the return value as 'don't iterate'.
    if (!lookupRest) {
      return buildResult(arrayIndices, Array.isArray(doc) && Array.isArray(firstLevel), firstLevel);
    }

    // We need to dig deeper.  But if we can't, because what we've found is not
    // an array or plain object, we're done. If we just did a numeric index into
    // an array, we return nothing here (this is a change in Mongo 2.5 from
    // Mongo 2.4, where {'a.0.b': null} stopped matching {a: [5]}). Otherwise,
    // return a single `undefined` (which can, for example, match via equality
    // with `null`).
    if (!isIndexable(firstLevel)) {
      if (Array.isArray(doc)) {
        return [];
      }
      return buildResult(arrayIndices, false, undefined);
    }
    const result = [];
    const appendToResult = more => {
      result.push(...more);
    };

    // Dig deeper: look up the rest of the parts on whatever we've found.
    // (lookupRest is smart enough to not try to do invalid lookups into
    // firstLevel if it's an array.)
    appendToResult(lookupRest(firstLevel, arrayIndices));

    // If we found an array, then in *addition* to potentially treating the next
    // part as a literal integer lookup, we should also 'branch': try to look up
    // the rest of the parts on each array element in parallel.
    //
    // In this case, we *only* dig deeper into array elements that are plain
    // objects. (Recall that we only got this far if we have further to dig.)
    // This makes sense: we certainly don't dig deeper into non-indexable
    // objects. And it would be weird to dig into an array: it's simpler to have
    // a rule that explicit integer indexes only apply to an outer array, not to
    // an array you find after a branching search.
    //
    // In the special case of a numeric part in a *sort selector* (not a query
    // selector), we skip the branching: we ONLY allow the numeric part to mean
    // 'look up this index' in that case, not 'also look up this index in all
    // the elements of the array'.
    if (Array.isArray(firstLevel) && !(isNumericKey(parts[1]) && options.forSort)) {
      firstLevel.forEach((branch, arrayIndex) => {
        if (LocalCollection._isPlainObject(branch)) {
          appendToResult(lookupRest(branch, arrayIndices ? arrayIndices.concat(arrayIndex) : [arrayIndex]));
        }
      });
    }
    return result;
  };
}
// Object exported only for unit testing.
// Use it to export private functions to test in Tinytest.
MinimongoTest = {
  makeLookupFunction
};
MinimongoError = function (message) {
  let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  if (typeof message === 'string' && options.field) {
    message += " for field '".concat(options.field, "'");
  }
  const error = new Error(message);
  error.name = 'MinimongoError';
  return error;
};
function nothingMatcher(docOrBranchedValues) {
  return {
    result: false
  };
}
// Takes an operator object (an object with $ keys) and returns a branched
// matcher for it.
function operatorBranchedMatcher(valueSelector, matcher, isRoot) {
  // Each valueSelector works separately on the various branches.  So one
  // operator can match one branch and another can match another branch.  This
  // is OK.
  const operatorMatchers = Object.keys(valueSelector).map(operator => {
    const operand = valueSelector[operator];
    const simpleRange = ['$lt', '$lte', '$gt', '$gte'].includes(operator) && typeof operand === 'number';
    const simpleEquality = ['$ne', '$eq'].includes(operator) && operand !== Object(operand);
    const simpleInclusion = ['$in', '$nin'].includes(operator) && Array.isArray(operand) && !operand.some(x => x === Object(x));
    if (!(simpleRange || simpleInclusion || simpleEquality)) {
      matcher._isSimple = false;
    }
    if (hasOwn.call(VALUE_OPERATORS, operator)) {
      return VALUE_OPERATORS[operator](operand, valueSelector, matcher, isRoot);
    }
    if (hasOwn.call(ELEMENT_OPERATORS, operator)) {
      const options = ELEMENT_OPERATORS[operator];
      return convertElementMatcherToBranchedMatcher(options.compileElementSelector(operand, valueSelector, matcher), options);
    }
    throw new Error("Unrecognized operator: ".concat(operator));
  });
  return andBranchedMatchers(operatorMatchers);
}

// paths - Array: list of mongo style paths
// newLeafFn - Function: of form function(path) should return a scalar value to
//                       put into list created for that path
// conflictFn - Function: of form function(node, path, fullPath) is called
//                        when building a tree path for 'fullPath' node on
//                        'path' was already a leaf with a value. Must return a
//                        conflict resolution.
// initial tree - Optional Object: starting tree.
// @returns - Object: tree represented as a set of nested objects
function pathsToTree(paths, newLeafFn, conflictFn) {
  let root = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
  paths.forEach(path => {
    const pathArray = path.split('.');
    let tree = root;

    // use .every just for iteration with break
    const success = pathArray.slice(0, -1).every((key, i) => {
      if (!hasOwn.call(tree, key)) {
        tree[key] = {};
      } else if (tree[key] !== Object(tree[key])) {
        tree[key] = conflictFn(tree[key], pathArray.slice(0, i + 1).join('.'), path);

        // break out of loop if we are failing for this path
        if (tree[key] !== Object(tree[key])) {
          return false;
        }
      }
      tree = tree[key];
      return true;
    });
    if (success) {
      const lastKey = pathArray[pathArray.length - 1];
      if (hasOwn.call(tree, lastKey)) {
        tree[lastKey] = conflictFn(tree[lastKey], path, path);
      } else {
        tree[lastKey] = newLeafFn(path);
      }
    }
  });
  return root;
}
// Makes sure we get 2 elements array and assume the first one to be x and
// the second one to y no matter what user passes.
// In case user passes { lon: x, lat: y } returns [x, y]
function pointToArray(point) {
  return Array.isArray(point) ? point.slice() : [point.x, point.y];
}

// Creating a document from an upsert is quite tricky.
// E.g. this selector: {"$or": [{"b.foo": {"$all": ["bar"]}}]}, should result
// in: {"b.foo": "bar"}
// But this selector: {"$or": [{"b": {"foo": {"$all": ["bar"]}}}]} should throw
// an error

// Some rules (found mainly with trial & error, so there might be more):
// - handle all childs of $and (or implicit $and)
// - handle $or nodes with exactly 1 child
// - ignore $or nodes with more than 1 child
// - ignore $nor and $not nodes
// - throw when a value can not be set unambiguously
// - every value for $all should be dealt with as separate $eq-s
// - threat all children of $all as $eq setters (=> set if $all.length === 1,
//   otherwise throw error)
// - you can not mix '$'-prefixed keys and non-'$'-prefixed keys
// - you can only have dotted keys on a root-level
// - you can not have '$'-prefixed keys more than one-level deep in an object

// Handles one key/value pair to put in the selector document
function populateDocumentWithKeyValue(document, key, value) {
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    populateDocumentWithObject(document, key, value);
  } else if (!(value instanceof RegExp)) {
    insertIntoDocument(document, key, value);
  }
}

// Handles a key, value pair to put in the selector document
// if the value is an object
function populateDocumentWithObject(document, key, value) {
  const keys = Object.keys(value);
  const unprefixedKeys = keys.filter(op => op[0] !== '$');
  if (unprefixedKeys.length > 0 || !keys.length) {
    // Literal (possibly empty) object ( or empty object )
    // Don't allow mixing '$'-prefixed with non-'$'-prefixed fields
    if (keys.length !== unprefixedKeys.length) {
      throw new Error("unknown operator: ".concat(unprefixedKeys[0]));
    }
    validateObject(value, key);
    insertIntoDocument(document, key, value);
  } else {
    Object.keys(value).forEach(op => {
      const object = value[op];
      if (op === '$eq') {
        populateDocumentWithKeyValue(document, key, object);
      } else if (op === '$all') {
        // every value for $all should be dealt with as separate $eq-s
        object.forEach(element => populateDocumentWithKeyValue(document, key, element));
      }
    });
  }
}

// Fills a document with certain fields from an upsert selector
function populateDocumentWithQueryFields(query) {
  let document = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  if (Object.getPrototypeOf(query) === Object.prototype) {
    // handle implicit $and
    Object.keys(query).forEach(key => {
      const value = query[key];
      if (key === '$and') {
        // handle explicit $and
        value.forEach(element => populateDocumentWithQueryFields(element, document));
      } else if (key === '$or') {
        // handle $or nodes with exactly 1 child
        if (value.length === 1) {
          populateDocumentWithQueryFields(value[0], document);
        }
      } else if (key[0] !== '$') {
        // Ignore other '$'-prefixed logical selectors
        populateDocumentWithKeyValue(document, key, value);
      }
    });
  } else {
    // Handle meteor-specific shortcut for selecting _id
    if (LocalCollection._selectorIsId(query)) {
      insertIntoDocument(document, '_id', query);
    }
  }
  return document;
}
function projectionDetails(fields) {
  // Find the non-_id keys (_id is handled specially because it is included
  // unless explicitly excluded). Sort the keys, so that our code to detect
  // overlaps like 'foo' and 'foo.bar' can assume that 'foo' comes first.
  let fieldsKeys = Object.keys(fields).sort();

  // If _id is the only field in the projection, do not remove it, since it is
  // required to determine if this is an exclusion or exclusion. Also keep an
  // inclusive _id, since inclusive _id follows the normal rules about mixing
  // inclusive and exclusive fields. If _id is not the only field in the
  // projection and is exclusive, remove it so it can be handled later by a
  // special case, since exclusive _id is always allowed.
  if (!(fieldsKeys.length === 1 && fieldsKeys[0] === '_id') && !(fieldsKeys.includes('_id') && fields._id)) {
    fieldsKeys = fieldsKeys.filter(key => key !== '_id');
  }
  let including = null; // Unknown

  fieldsKeys.forEach(keyPath => {
    const rule = !!fields[keyPath];
    if (including === null) {
      including = rule;
    }

    // This error message is copied from MongoDB shell
    if (including !== rule) {
      throw MinimongoError('You cannot currently mix including and excluding fields.');
    }
  });
  const projectionRulesTree = pathsToTree(fieldsKeys, path => including, (node, path, fullPath) => {
    // Check passed projection fields' keys: If you have two rules such as
    // 'foo.bar' and 'foo.bar.baz', then the result becomes ambiguous. If
    // that happens, there is a probability you are doing something wrong,
    // framework should notify you about such mistake earlier on cursor
    // compilation step than later during runtime.  Note, that real mongo
    // doesn't do anything about it and the later rule appears in projection
    // project, more priority it takes.
    //
    // Example, assume following in mongo shell:
    // > db.coll.insert({ a: { b: 23, c: 44 } })
    // > db.coll.find({}, { 'a': 1, 'a.b': 1 })
    // {"_id": ObjectId("520bfe456024608e8ef24af3"), "a": {"b": 23}}
    // > db.coll.find({}, { 'a.b': 1, 'a': 1 })
    // {"_id": ObjectId("520bfe456024608e8ef24af3"), "a": {"b": 23, "c": 44}}
    //
    // Note, how second time the return set of keys is different.
    const currentPath = fullPath;
    const anotherPath = path;
    throw MinimongoError("both ".concat(currentPath, " and ").concat(anotherPath, " found in fields option, ") + 'using both of them may trigger unexpected behavior. Did you mean to ' + 'use only one of them?');
  });
  return {
    including,
    tree: projectionRulesTree
  };
}
function regexpElementMatcher(regexp) {
  return value => {
    if (value instanceof RegExp) {
      return value.toString() === regexp.toString();
    }

    // Regexps only work against strings.
    if (typeof value !== 'string') {
      return false;
    }

    // Reset regexp's state to avoid inconsistent matching for objects with the
    // same value on consecutive calls of regexp.test. This happens only if the
    // regexp has the 'g' flag. Also note that ES6 introduces a new flag 'y' for
    // which we should *not* change the lastIndex but MongoDB doesn't support
    // either of these flags.
    regexp.lastIndex = 0;
    return regexp.test(value);
  };
}
// Validates the key in a path.
// Objects that are nested more then 1 level cannot have dotted fields
// or fields starting with '$'
function validateKeyInPath(key, path) {
  if (key.includes('.')) {
    throw new Error("The dotted field '".concat(key, "' in '").concat(path, ".").concat(key, " is not valid for storage."));
  }
  if (key[0] === '$') {
    throw new Error("The dollar ($) prefixed field  '".concat(path, ".").concat(key, " is not valid for storage."));
  }
}

// Recursively validates an object that is nested more than one level deep
function validateObject(object, path) {
  if (object && Object.getPrototypeOf(object) === Object.prototype) {
    Object.keys(object).forEach(key => {
      validateKeyInPath(key, path);
      validateObject(object[key], path + '.' + key);
    });
  }
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"constants.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/constants.js                                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  getAsyncMethodName: () => getAsyncMethodName,
  ASYNC_COLLECTION_METHODS: () => ASYNC_COLLECTION_METHODS,
  ASYNC_CURSOR_METHODS: () => ASYNC_CURSOR_METHODS
});
function getAsyncMethodName(method) {
  return "".concat(method.replace('_', ''), "Async");
}
const ASYNC_COLLECTION_METHODS = ['_createCappedCollection', '_dropCollection', '_dropIndex', 'createIndex', 'findOne', 'insert', 'remove', 'update', 'upsert'];
const ASYNC_CURSOR_METHODS = ['count', 'fetch', 'forEach', 'map'];
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"cursor.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/cursor.js                                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  default: () => Cursor
});
let LocalCollection;
module.link("./local_collection.js", {
  default(v) {
    LocalCollection = v;
  }
}, 0);
let hasOwn;
module.link("./common.js", {
  hasOwn(v) {
    hasOwn = v;
  }
}, 1);
let ASYNC_CURSOR_METHODS, getAsyncMethodName;
module.link("./constants", {
  ASYNC_CURSOR_METHODS(v) {
    ASYNC_CURSOR_METHODS = v;
  },
  getAsyncMethodName(v) {
    getAsyncMethodName = v;
  }
}, 2);
class Cursor {
  // don't call this ctor directly.  use LocalCollection.find().
  constructor(collection, selector) {
    let options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    this.collection = collection;
    this.sorter = null;
    this.matcher = new Minimongo.Matcher(selector);
    if (LocalCollection._selectorIsIdPerhapsAsObject(selector)) {
      // stash for fast _id and { _id }
      this._selectorId = hasOwn.call(selector, '_id') ? selector._id : selector;
    } else {
      this._selectorId = undefined;
      if (this.matcher.hasGeoQuery() || options.sort) {
        this.sorter = new Minimongo.Sorter(options.sort || []);
      }
    }
    this.skip = options.skip || 0;
    this.limit = options.limit;
    this.fields = options.projection || options.fields;
    this._projectionFn = LocalCollection._compileProjection(this.fields || {});
    this._transform = LocalCollection.wrapTransform(options.transform);

    // by default, queries register w/ Tracker when it is available.
    if (typeof Tracker !== 'undefined') {
      this.reactive = options.reactive === undefined ? true : options.reactive;
    }
  }

  /**
   * @deprecated in 2.9
   * @summary Returns the number of documents that match a query. This method is
   *          [deprecated since MongoDB 4.0](https://www.mongodb.com/docs/v4.4/reference/command/count/);
   *          see `Collection.countDocuments` and
   *          `Collection.estimatedDocumentCount` for a replacement.
   * @memberOf Mongo.Cursor
   * @method  count
   * @instance
   * @locus Anywhere
   * @returns {Number}
   */
  count() {
    if (this.reactive) {
      // allow the observe to be unordered
      this._depend({
        added: true,
        removed: true
      }, true);
    }
    return this._getRawObjects({
      ordered: true
    }).length;
  }

  /**
   * @summary Return all matching documents as an Array.
   * @memberOf Mongo.Cursor
   * @method  fetch
   * @instance
   * @locus Anywhere
   * @returns {Object[]}
   */
  fetch() {
    const result = [];
    this.forEach(doc => {
      result.push(doc);
    });
    return result;
  }
  [Symbol.iterator]() {
    if (this.reactive) {
      this._depend({
        addedBefore: true,
        removed: true,
        changed: true,
        movedBefore: true
      });
    }
    let index = 0;
    const objects = this._getRawObjects({
      ordered: true
    });
    return {
      next: () => {
        if (index < objects.length) {
          // This doubles as a clone operation.
          let element = this._projectionFn(objects[index++]);
          if (this._transform) element = this._transform(element);
          return {
            value: element
          };
        }
        return {
          done: true
        };
      }
    };
  }
  [Symbol.asyncIterator]() {
    const syncResult = this[Symbol.iterator]();
    return {
      next() {
        return Promise.asyncApply(() => {
          return Promise.resolve(syncResult.next());
        });
      }
    };
  }

  /**
   * @callback IterationCallback
   * @param {Object} doc
   * @param {Number} index
   */
  /**
   * @summary Call `callback` once for each matching document, sequentially and
   *          synchronously.
   * @locus Anywhere
   * @method  forEach
   * @instance
   * @memberOf Mongo.Cursor
   * @param {IterationCallback} callback Function to call. It will be called
   *                                     with three arguments: the document, a
   *                                     0-based index, and <em>cursor</em>
   *                                     itself.
   * @param {Any} [thisArg] An object which will be the value of `this` inside
   *                        `callback`.
   */
  forEach(callback, thisArg) {
    if (this.reactive) {
      this._depend({
        addedBefore: true,
        removed: true,
        changed: true,
        movedBefore: true
      });
    }
    this._getRawObjects({
      ordered: true
    }).forEach((element, i) => {
      // This doubles as a clone operation.
      element = this._projectionFn(element);
      if (this._transform) {
        element = this._transform(element);
      }
      callback.call(thisArg, element, i, this);
    });
  }
  getTransform() {
    return this._transform;
  }

  /**
   * @summary Map callback over all matching documents.  Returns an Array.
   * @locus Anywhere
   * @method map
   * @instance
   * @memberOf Mongo.Cursor
   * @param {IterationCallback} callback Function to call. It will be called
   *                                     with three arguments: the document, a
   *                                     0-based index, and <em>cursor</em>
   *                                     itself.
   * @param {Any} [thisArg] An object which will be the value of `this` inside
   *                        `callback`.
   */
  map(callback, thisArg) {
    const result = [];
    this.forEach((doc, i) => {
      result.push(callback.call(thisArg, doc, i, this));
    });
    return result;
  }

  // options to contain:
  //  * callbacks for observe():
  //    - addedAt (document, atIndex)
  //    - added (document)
  //    - changedAt (newDocument, oldDocument, atIndex)
  //    - changed (newDocument, oldDocument)
  //    - removedAt (document, atIndex)
  //    - removed (document)
  //    - movedTo (document, oldIndex, newIndex)
  //
  // attributes available on returned query handle:
  //  * stop(): end updates
  //  * collection: the collection this query is querying
  //
  // iff x is a returned query handle, (x instanceof
  // LocalCollection.ObserveHandle) is true
  //
  // initial results delivered through added callback
  // XXX maybe callbacks should take a list of objects, to expose transactions?
  // XXX maybe support field limiting (to limit what you're notified on)

  /**
   * @summary Watch a query.  Receive callbacks as the result set changes.
   * @locus Anywhere
   * @memberOf Mongo.Cursor
   * @instance
   * @param {Object} callbacks Functions to call to deliver the result set as it
   *                           changes
   */
  observe(options) {
    return LocalCollection._observeFromObserveChanges(this, options);
  }

  /**
   * @summary Watch a query. Receive callbacks as the result set changes. Only
   *          the differences between the old and new documents are passed to
   *          the callbacks.
   * @locus Anywhere
   * @memberOf Mongo.Cursor
   * @instance
   * @param {Object} callbacks Functions to call to deliver the result set as it
   *                           changes
   */
  observeChanges(options) {
    const ordered = LocalCollection._observeChangesCallbacksAreOrdered(options);

    // there are several places that assume you aren't combining skip/limit with
    // unordered observe.  eg, update's EJSON.clone, and the "there are several"
    // comment in _modifyAndNotify
    // XXX allow skip/limit with unordered observe
    if (!options._allow_unordered && !ordered && (this.skip || this.limit)) {
      throw new Error("Must use an ordered observe with skip or limit (i.e. 'addedBefore' " + "for observeChanges or 'addedAt' for observe, instead of 'added').");
    }
    if (this.fields && (this.fields._id === 0 || this.fields._id === false)) {
      throw Error('You may not observe a cursor with {fields: {_id: 0}}');
    }
    const distances = this.matcher.hasGeoQuery() && ordered && new LocalCollection._IdMap();
    const query = {
      cursor: this,
      dirty: false,
      distances,
      matcher: this.matcher,
      // not fast pathed
      ordered,
      projectionFn: this._projectionFn,
      resultsSnapshot: null,
      sorter: ordered && this.sorter
    };
    let qid;

    // Non-reactive queries call added[Before] and then never call anything
    // else.
    if (this.reactive) {
      qid = this.collection.next_qid++;
      this.collection.queries[qid] = query;
    }
    query.results = this._getRawObjects({
      ordered,
      distances: query.distances
    });
    if (this.collection.paused) {
      query.resultsSnapshot = ordered ? [] : new LocalCollection._IdMap();
    }

    // wrap callbacks we were passed. callbacks only fire when not paused and
    // are never undefined
    // Filters out blacklisted fields according to cursor's projection.
    // XXX wrong place for this?

    // furthermore, callbacks enqueue until the operation we're working on is
    // done.
    const wrapCallback = fn => {
      if (!fn) {
        return () => {};
      }
      const self = this;
      return function /* args*/
      () {
        if (self.collection.paused) {
          return;
        }
        const args = arguments;
        self.collection._observeQueue.queueTask(() => {
          fn.apply(this, args);
        });
      };
    };
    query.added = wrapCallback(options.added);
    query.changed = wrapCallback(options.changed);
    query.removed = wrapCallback(options.removed);
    if (ordered) {
      query.addedBefore = wrapCallback(options.addedBefore);
      query.movedBefore = wrapCallback(options.movedBefore);
    }
    if (!options._suppress_initial && !this.collection.paused) {
      query.results.forEach(doc => {
        const fields = EJSON.clone(doc);
        delete fields._id;
        if (ordered) {
          query.addedBefore(doc._id, this._projectionFn(fields), null);
        }
        query.added(doc._id, this._projectionFn(fields));
      });
    }
    const handle = Object.assign(new LocalCollection.ObserveHandle(), {
      collection: this.collection,
      stop: () => {
        if (this.reactive) {
          delete this.collection.queries[qid];
        }
      }
    });
    if (this.reactive && Tracker.active) {
      // XXX in many cases, the same observe will be recreated when
      // the current autorun is rerun.  we could save work by
      // letting it linger across rerun and potentially get
      // repurposed if the same observe is performed, using logic
      // similar to that of Meteor.subscribe.
      Tracker.onInvalidate(() => {
        handle.stop();
      });
    }

    // run the observe callbacks resulting from the initial contents
    // before we leave the observe.
    this.collection._observeQueue.drain();
    return handle;
  }

  // XXX Maybe we need a version of observe that just calls a callback if
  // anything changed.
  _depend(changers, _allow_unordered) {
    if (Tracker.active) {
      const dependency = new Tracker.Dependency();
      const notify = dependency.changed.bind(dependency);
      dependency.depend();
      const options = {
        _allow_unordered,
        _suppress_initial: true
      };
      ['added', 'addedBefore', 'changed', 'movedBefore', 'removed'].forEach(fn => {
        if (changers[fn]) {
          options[fn] = notify;
        }
      });

      // observeChanges will stop() when this computation is invalidated
      this.observeChanges(options);
    }
  }
  _getCollectionName() {
    return this.collection.name;
  }

  // Returns a collection of matching objects, but doesn't deep copy them.
  //
  // If ordered is set, returns a sorted array, respecting sorter, skip, and
  // limit properties of the query provided that options.applySkipLimit is
  // not set to false (#1201). If sorter is falsey, no sort -- you get the
  // natural order.
  //
  // If ordered is not set, returns an object mapping from ID to doc (sorter,
  // skip and limit should not be set).
  //
  // If ordered is set and this cursor is a $near geoquery, then this function
  // will use an _IdMap to track each distance from the $near argument point in
  // order to use it as a sort key. If an _IdMap is passed in the 'distances'
  // argument, this function will clear it and use it for this purpose
  // (otherwise it will just create its own _IdMap). The observeChanges
  // implementation uses this to remember the distances after this function
  // returns.
  _getRawObjects() {
    let options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    // By default this method will respect skip and limit because .fetch(),
    // .forEach() etc... expect this behaviour. It can be forced to ignore
    // skip and limit by setting applySkipLimit to false (.count() does this,
    // for example)
    const applySkipLimit = options.applySkipLimit !== false;

    // XXX use OrderedDict instead of array, and make IdMap and OrderedDict
    // compatible
    const results = options.ordered ? [] : new LocalCollection._IdMap();

    // fast path for single ID value
    if (this._selectorId !== undefined) {
      // If you have non-zero skip and ask for a single id, you get nothing.
      // This is so it matches the behavior of the '{_id: foo}' path.
      if (applySkipLimit && this.skip) {
        return results;
      }
      const selectedDoc = this.collection._docs.get(this._selectorId);
      if (selectedDoc) {
        if (options.ordered) {
          results.push(selectedDoc);
        } else {
          results.set(this._selectorId, selectedDoc);
        }
      }
      return results;
    }

    // slow path for arbitrary selector, sort, skip, limit

    // in the observeChanges case, distances is actually part of the "query"
    // (ie, live results set) object.  in other cases, distances is only used
    // inside this function.
    let distances;
    if (this.matcher.hasGeoQuery() && options.ordered) {
      if (options.distances) {
        distances = options.distances;
        distances.clear();
      } else {
        distances = new LocalCollection._IdMap();
      }
    }
    this.collection._docs.forEach((doc, id) => {
      const matchResult = this.matcher.documentMatches(doc);
      if (matchResult.result) {
        if (options.ordered) {
          results.push(doc);
          if (distances && matchResult.distance !== undefined) {
            distances.set(id, matchResult.distance);
          }
        } else {
          results.set(id, doc);
        }
      }

      // Override to ensure all docs are matched if ignoring skip & limit
      if (!applySkipLimit) {
        return true;
      }

      // Fast path for limited unsorted queries.
      // XXX 'length' check here seems wrong for ordered
      return !this.limit || this.skip || this.sorter || results.length !== this.limit;
    });
    if (!options.ordered) {
      return results;
    }
    if (this.sorter) {
      results.sort(this.sorter.getComparator({
        distances
      }));
    }

    // Return the full set of results if there is no skip or limit or if we're
    // ignoring them
    if (!applySkipLimit || !this.limit && !this.skip) {
      return results;
    }
    return results.slice(this.skip, this.limit ? this.limit + this.skip : results.length);
  }
  _publishCursor(subscription) {
    // XXX minimongo should not depend on mongo-livedata!
    if (!Package.mongo) {
      throw new Error('Can\'t publish from Minimongo without the `mongo` package.');
    }
    if (!this.collection.name) {
      throw new Error('Can\'t publish a cursor from a collection without a name.');
    }
    return Package.mongo.Mongo.Collection._publishCursor(this, subscription, this.collection.name);
  }
}
// Implements async version of cursor methods to keep collections isomorphic
ASYNC_CURSOR_METHODS.forEach(method => {
  const asyncName = getAsyncMethodName(method);
  Cursor.prototype[asyncName] = function () {
    try {
      this[method].isCalledFromAsync = true;
      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }
      return Promise.resolve(this[method].apply(this, args));
    } catch (error) {
      return Promise.reject(error);
    }
  };
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"local_collection.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/local_collection.js                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _objectSpread;
module.link("@babel/runtime/helpers/objectSpread2", {
  default(v) {
    _objectSpread = v;
  }
}, 0);
module.export({
  default: () => LocalCollection
});
let Cursor;
module.link("./cursor.js", {
  default(v) {
    Cursor = v;
  }
}, 0);
let ObserveHandle;
module.link("./observe_handle.js", {
  default(v) {
    ObserveHandle = v;
  }
}, 1);
let hasOwn, isIndexable, isNumericKey, isOperatorObject, populateDocumentWithQueryFields, projectionDetails;
module.link("./common.js", {
  hasOwn(v) {
    hasOwn = v;
  },
  isIndexable(v) {
    isIndexable = v;
  },
  isNumericKey(v) {
    isNumericKey = v;
  },
  isOperatorObject(v) {
    isOperatorObject = v;
  },
  populateDocumentWithQueryFields(v) {
    populateDocumentWithQueryFields = v;
  },
  projectionDetails(v) {
    projectionDetails = v;
  }
}, 2);
class LocalCollection {
  constructor(name) {
    this.name = name;
    // _id -> document (also containing id)
    this._docs = new LocalCollection._IdMap();
    this._observeQueue = new Meteor._SynchronousQueue();
    this.next_qid = 1; // live query id generator

    // qid -> live query object. keys:
    //  ordered: bool. ordered queries have addedBefore/movedBefore callbacks.
    //  results: array (ordered) or object (unordered) of current results
    //    (aliased with this._docs!)
    //  resultsSnapshot: snapshot of results. null if not paused.
    //  cursor: Cursor object for the query.
    //  selector, sorter, (callbacks): functions
    this.queries = Object.create(null);

    // null if not saving originals; an IdMap from id to original document value
    // if saving originals. See comments before saveOriginals().
    this._savedOriginals = null;

    // True when observers are paused and we should not send callbacks.
    this.paused = false;
  }
  countDocuments(selector, options) {
    return this.find(selector !== null && selector !== void 0 ? selector : {}, options).countAsync();
  }
  estimatedDocumentCount(options) {
    return this.find({}, options).countAsync();
  }

  // options may include sort, skip, limit, reactive
  // sort may be any of these forms:
  //     {a: 1, b: -1}
  //     [["a", "asc"], ["b", "desc"]]
  //     ["a", ["b", "desc"]]
  //   (in the first form you're beholden to key enumeration order in
  //   your javascript VM)
  //
  // reactive: if given, and false, don't register with Tracker (default
  // is true)
  //
  // XXX possibly should support retrieving a subset of fields? and
  // have it be a hint (ignored on the client, when not copying the
  // doc?)
  //
  // XXX sort does not yet support subkeys ('a.b') .. fix that!
  // XXX add one more sort form: "key"
  // XXX tests
  find(selector, options) {
    // default syntax for everything is to omit the selector argument.
    // but if selector is explicitly passed in as false or undefined, we
    // want a selector that matches nothing.
    if (arguments.length === 0) {
      selector = {};
    }
    return new LocalCollection.Cursor(this, selector, options);
  }
  findOne(selector) {
    let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    if (arguments.length === 0) {
      selector = {};
    }

    // NOTE: by setting limit 1 here, we end up using very inefficient
    // code that recomputes the whole query on each update. The upside is
    // that when you reactively depend on a findOne you only get
    // invalidated when the found object changes, not any object in the
    // collection. Most findOne will be by id, which has a fast path, so
    // this might not be a big deal. In most cases, invalidation causes
    // the called to re-query anyway, so this should be a net performance
    // improvement.
    options.limit = 1;
    return this.find(selector, options).fetch()[0];
  }

  // XXX possibly enforce that 'undefined' does not appear (we assume
  // this in our handling of null and $exists)
  insert(doc, callback) {
    doc = EJSON.clone(doc);
    assertHasValidFieldNames(doc);

    // if you really want to use ObjectIDs, set this global.
    // Mongo.Collection specifies its own ids and does not use this code.
    if (!hasOwn.call(doc, '_id')) {
      doc._id = LocalCollection._useOID ? new MongoID.ObjectID() : Random.id();
    }
    const id = doc._id;
    if (this._docs.has(id)) {
      throw MinimongoError("Duplicate _id '".concat(id, "'"));
    }
    this._saveOriginal(id, undefined);
    this._docs.set(id, doc);
    const queriesToRecompute = [];

    // trigger live queries that match
    Object.keys(this.queries).forEach(qid => {
      const query = this.queries[qid];
      if (query.dirty) {
        return;
      }
      const matchResult = query.matcher.documentMatches(doc);
      if (matchResult.result) {
        if (query.distances && matchResult.distance !== undefined) {
          query.distances.set(id, matchResult.distance);
        }
        if (query.cursor.skip || query.cursor.limit) {
          queriesToRecompute.push(qid);
        } else {
          LocalCollection._insertInResults(query, doc);
        }
      }
    });
    queriesToRecompute.forEach(qid => {
      if (this.queries[qid]) {
        this._recomputeResults(this.queries[qid]);
      }
    });
    this._observeQueue.drain();

    // Defer because the caller likely doesn't expect the callback to be run
    // immediately.
    if (callback) {
      Meteor.defer(() => {
        callback(null, id);
      });
    }
    return id;
  }

  // Pause the observers. No callbacks from observers will fire until
  // 'resumeObservers' is called.
  pauseObservers() {
    // No-op if already paused.
    if (this.paused) {
      return;
    }

    // Set the 'paused' flag such that new observer messages don't fire.
    this.paused = true;

    // Take a snapshot of the query results for each query.
    Object.keys(this.queries).forEach(qid => {
      const query = this.queries[qid];
      query.resultsSnapshot = EJSON.clone(query.results);
    });
  }
  remove(selector, callback) {
    // Easy special case: if we're not calling observeChanges callbacks and
    // we're not saving originals and we got asked to remove everything, then
    // just empty everything directly.
    if (this.paused && !this._savedOriginals && EJSON.equals(selector, {})) {
      const result = this._docs.size();
      this._docs.clear();
      Object.keys(this.queries).forEach(qid => {
        const query = this.queries[qid];
        if (query.ordered) {
          query.results = [];
        } else {
          query.results.clear();
        }
      });
      if (callback) {
        Meteor.defer(() => {
          callback(null, result);
        });
      }
      return result;
    }
    const matcher = new Minimongo.Matcher(selector);
    const remove = [];
    this._eachPossiblyMatchingDoc(selector, (doc, id) => {
      if (matcher.documentMatches(doc).result) {
        remove.push(id);
      }
    });
    const queriesToRecompute = [];
    const queryRemove = [];
    for (let i = 0; i < remove.length; i++) {
      const removeId = remove[i];
      const removeDoc = this._docs.get(removeId);
      Object.keys(this.queries).forEach(qid => {
        const query = this.queries[qid];
        if (query.dirty) {
          return;
        }
        if (query.matcher.documentMatches(removeDoc).result) {
          if (query.cursor.skip || query.cursor.limit) {
            queriesToRecompute.push(qid);
          } else {
            queryRemove.push({
              qid,
              doc: removeDoc
            });
          }
        }
      });
      this._saveOriginal(removeId, removeDoc);
      this._docs.remove(removeId);
    }

    // run live query callbacks _after_ we've removed the documents.
    queryRemove.forEach(remove => {
      const query = this.queries[remove.qid];
      if (query) {
        query.distances && query.distances.remove(remove.doc._id);
        LocalCollection._removeFromResults(query, remove.doc);
      }
    });
    queriesToRecompute.forEach(qid => {
      const query = this.queries[qid];
      if (query) {
        this._recomputeResults(query);
      }
    });
    this._observeQueue.drain();
    const result = remove.length;
    if (callback) {
      Meteor.defer(() => {
        callback(null, result);
      });
    }
    return result;
  }

  // Resume the observers. Observers immediately receive change
  // notifications to bring them to the current state of the
  // database. Note that this is not just replaying all the changes that
  // happened during the pause, it is a smarter 'coalesced' diff.
  resumeObservers() {
    // No-op if not paused.
    if (!this.paused) {
      return;
    }

    // Unset the 'paused' flag. Make sure to do this first, otherwise
    // observer methods won't actually fire when we trigger them.
    this.paused = false;
    Object.keys(this.queries).forEach(qid => {
      const query = this.queries[qid];
      if (query.dirty) {
        query.dirty = false;

        // re-compute results will perform `LocalCollection._diffQueryChanges`
        // automatically.
        this._recomputeResults(query, query.resultsSnapshot);
      } else {
        // Diff the current results against the snapshot and send to observers.
        // pass the query object for its observer callbacks.
        LocalCollection._diffQueryChanges(query.ordered, query.resultsSnapshot, query.results, query, {
          projectionFn: query.projectionFn
        });
      }
      query.resultsSnapshot = null;
    });
    this._observeQueue.drain();
  }
  retrieveOriginals() {
    if (!this._savedOriginals) {
      throw new Error('Called retrieveOriginals without saveOriginals');
    }
    const originals = this._savedOriginals;
    this._savedOriginals = null;
    return originals;
  }

  // To track what documents are affected by a piece of code, call
  // saveOriginals() before it and retrieveOriginals() after it.
  // retrieveOriginals returns an object whose keys are the ids of the documents
  // that were affected since the call to saveOriginals(), and the values are
  // equal to the document's contents at the time of saveOriginals. (In the case
  // of an inserted document, undefined is the value.) You must alternate
  // between calls to saveOriginals() and retrieveOriginals().
  saveOriginals() {
    if (this._savedOriginals) {
      throw new Error('Called saveOriginals twice without retrieveOriginals');
    }
    this._savedOriginals = new LocalCollection._IdMap();
  }

  // XXX atomicity: if multi is true, and one modification fails, do
  // we rollback the whole operation, or what?
  update(selector, mod, options, callback) {
    if (!callback && options instanceof Function) {
      callback = options;
      options = null;
    }
    if (!options) {
      options = {};
    }
    const matcher = new Minimongo.Matcher(selector, true);

    // Save the original results of any query that we might need to
    // _recomputeResults on, because _modifyAndNotify will mutate the objects in
    // it. (We don't need to save the original results of paused queries because
    // they already have a resultsSnapshot and we won't be diffing in
    // _recomputeResults.)
    const qidToOriginalResults = {};

    // We should only clone each document once, even if it appears in multiple
    // queries
    const docMap = new LocalCollection._IdMap();
    const idsMatched = LocalCollection._idsMatchedBySelector(selector);
    Object.keys(this.queries).forEach(qid => {
      const query = this.queries[qid];
      if ((query.cursor.skip || query.cursor.limit) && !this.paused) {
        // Catch the case of a reactive `count()` on a cursor with skip
        // or limit, which registers an unordered observe. This is a
        // pretty rare case, so we just clone the entire result set with
        // no optimizations for documents that appear in these result
        // sets and other queries.
        if (query.results instanceof LocalCollection._IdMap) {
          qidToOriginalResults[qid] = query.results.clone();
          return;
        }
        if (!(query.results instanceof Array)) {
          throw new Error('Assertion failed: query.results not an array');
        }

        // Clones a document to be stored in `qidToOriginalResults`
        // because it may be modified before the new and old result sets
        // are diffed. But if we know exactly which document IDs we're
        // going to modify, then we only need to clone those.
        const memoizedCloneIfNeeded = doc => {
          if (docMap.has(doc._id)) {
            return docMap.get(doc._id);
          }
          const docToMemoize = idsMatched && !idsMatched.some(id => EJSON.equals(id, doc._id)) ? doc : EJSON.clone(doc);
          docMap.set(doc._id, docToMemoize);
          return docToMemoize;
        };
        qidToOriginalResults[qid] = query.results.map(memoizedCloneIfNeeded);
      }
    });
    const recomputeQids = {};
    let updateCount = 0;
    this._eachPossiblyMatchingDoc(selector, (doc, id) => {
      const queryResult = matcher.documentMatches(doc);
      if (queryResult.result) {
        // XXX Should we save the original even if mod ends up being a no-op?
        this._saveOriginal(id, doc);
        this._modifyAndNotify(doc, mod, recomputeQids, queryResult.arrayIndices);
        ++updateCount;
        if (!options.multi) {
          return false; // break
        }
      }
      return true;
    });
    Object.keys(recomputeQids).forEach(qid => {
      const query = this.queries[qid];
      if (query) {
        this._recomputeResults(query, qidToOriginalResults[qid]);
      }
    });
    this._observeQueue.drain();

    // If we are doing an upsert, and we didn't modify any documents yet, then
    // it's time to do an insert. Figure out what document we are inserting, and
    // generate an id for it.
    let insertedId;
    if (updateCount === 0 && options.upsert) {
      const doc = LocalCollection._createUpsertDocument(selector, mod);
      if (!doc._id && options.insertedId) {
        doc._id = options.insertedId;
      }
      insertedId = this.insert(doc);
      updateCount = 1;
    }

    // Return the number of affected documents, or in the upsert case, an object
    // containing the number of affected docs and the id of the doc that was
    // inserted, if any.
    let result;
    if (options._returnObject) {
      result = {
        numberAffected: updateCount
      };
      if (insertedId !== undefined) {
        result.insertedId = insertedId;
      }
    } else {
      result = updateCount;
    }
    if (callback) {
      Meteor.defer(() => {
        callback(null, result);
      });
    }
    return result;
  }

  // A convenience wrapper on update. LocalCollection.upsert(sel, mod) is
  // equivalent to LocalCollection.update(sel, mod, {upsert: true,
  // _returnObject: true}).
  upsert(selector, mod, options, callback) {
    if (!callback && typeof options === 'function') {
      callback = options;
      options = {};
    }
    return this.update(selector, mod, Object.assign({}, options, {
      upsert: true,
      _returnObject: true
    }), callback);
  }

  // Iterates over a subset of documents that could match selector; calls
  // fn(doc, id) on each of them.  Specifically, if selector specifies
  // specific _id's, it only looks at those.  doc is *not* cloned: it is the
  // same object that is in _docs.
  _eachPossiblyMatchingDoc(selector, fn) {
    const specificIds = LocalCollection._idsMatchedBySelector(selector);
    if (specificIds) {
      specificIds.some(id => {
        const doc = this._docs.get(id);
        if (doc) {
          return fn(doc, id) === false;
        }
      });
    } else {
      this._docs.forEach(fn);
    }
  }
  _modifyAndNotify(doc, mod, recomputeQids, arrayIndices) {
    const matched_before = {};
    Object.keys(this.queries).forEach(qid => {
      const query = this.queries[qid];
      if (query.dirty) {
        return;
      }
      if (query.ordered) {
        matched_before[qid] = query.matcher.documentMatches(doc).result;
      } else {
        // Because we don't support skip or limit (yet) in unordered queries, we
        // can just do a direct lookup.
        matched_before[qid] = query.results.has(doc._id);
      }
    });
    const old_doc = EJSON.clone(doc);
    LocalCollection._modify(doc, mod, {
      arrayIndices
    });
    Object.keys(this.queries).forEach(qid => {
      const query = this.queries[qid];
      if (query.dirty) {
        return;
      }
      const afterMatch = query.matcher.documentMatches(doc);
      const after = afterMatch.result;
      const before = matched_before[qid];
      if (after && query.distances && afterMatch.distance !== undefined) {
        query.distances.set(doc._id, afterMatch.distance);
      }
      if (query.cursor.skip || query.cursor.limit) {
        // We need to recompute any query where the doc may have been in the
        // cursor's window either before or after the update. (Note that if skip
        // or limit is set, "before" and "after" being true do not necessarily
        // mean that the document is in the cursor's output after skip/limit is
        // applied... but if they are false, then the document definitely is NOT
        // in the output. So it's safe to skip recompute if neither before or
        // after are true.)
        if (before || after) {
          recomputeQids[qid] = true;
        }
      } else if (before && !after) {
        LocalCollection._removeFromResults(query, doc);
      } else if (!before && after) {
        LocalCollection._insertInResults(query, doc);
      } else if (before && after) {
        LocalCollection._updateInResults(query, doc, old_doc);
      }
    });
  }

  // Recomputes the results of a query and runs observe callbacks for the
  // difference between the previous results and the current results (unless
  // paused). Used for skip/limit queries.
  //
  // When this is used by insert or remove, it can just use query.results for
  // the old results (and there's no need to pass in oldResults), because these
  // operations don't mutate the documents in the collection. Update needs to
  // pass in an oldResults which was deep-copied before the modifier was
  // applied.
  //
  // oldResults is guaranteed to be ignored if the query is not paused.
  _recomputeResults(query, oldResults) {
    if (this.paused) {
      // There's no reason to recompute the results now as we're still paused.
      // By flagging the query as "dirty", the recompute will be performed
      // when resumeObservers is called.
      query.dirty = true;
      return;
    }
    if (!this.paused && !oldResults) {
      oldResults = query.results;
    }
    if (query.distances) {
      query.distances.clear();
    }
    query.results = query.cursor._getRawObjects({
      distances: query.distances,
      ordered: query.ordered
    });
    if (!this.paused) {
      LocalCollection._diffQueryChanges(query.ordered, oldResults, query.results, query, {
        projectionFn: query.projectionFn
      });
    }
  }
  _saveOriginal(id, doc) {
    // Are we even trying to save originals?
    if (!this._savedOriginals) {
      return;
    }

    // Have we previously mutated the original (and so 'doc' is not actually
    // original)?  (Note the 'has' check rather than truth: we store undefined
    // here for inserted docs!)
    if (this._savedOriginals.has(id)) {
      return;
    }
    this._savedOriginals.set(id, EJSON.clone(doc));
  }
}
LocalCollection.Cursor = Cursor;
LocalCollection.ObserveHandle = ObserveHandle;

// XXX maybe move these into another ObserveHelpers package or something

// _CachingChangeObserver is an object which receives observeChanges callbacks
// and keeps a cache of the current cursor state up to date in this.docs. Users
// of this class should read the docs field but not modify it. You should pass
// the "applyChange" field as the callbacks to the underlying observeChanges
// call. Optionally, you can specify your own observeChanges callbacks which are
// invoked immediately before the docs field is updated; this object is made
// available as `this` to those callbacks.
LocalCollection._CachingChangeObserver = class _CachingChangeObserver {
  constructor() {
    let options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    const orderedFromCallbacks = options.callbacks && LocalCollection._observeChangesCallbacksAreOrdered(options.callbacks);
    if (hasOwn.call(options, 'ordered')) {
      this.ordered = options.ordered;
      if (options.callbacks && options.ordered !== orderedFromCallbacks) {
        throw Error('ordered option doesn\'t match callbacks');
      }
    } else if (options.callbacks) {
      this.ordered = orderedFromCallbacks;
    } else {
      throw Error('must provide ordered or callbacks');
    }
    const callbacks = options.callbacks || {};
    if (this.ordered) {
      this.docs = new OrderedDict(MongoID.idStringify);
      this.applyChange = {
        addedBefore: (id, fields, before) => {
          // Take a shallow copy since the top-level properties can be changed
          const doc = _objectSpread({}, fields);
          doc._id = id;
          if (callbacks.addedBefore) {
            callbacks.addedBefore.call(this, id, EJSON.clone(fields), before);
          }

          // This line triggers if we provide added with movedBefore.
          if (callbacks.added) {
            callbacks.added.call(this, id, EJSON.clone(fields));
          }

          // XXX could `before` be a falsy ID?  Technically
          // idStringify seems to allow for them -- though
          // OrderedDict won't call stringify on a falsy arg.
          this.docs.putBefore(id, doc, before || null);
        },
        movedBefore: (id, before) => {
          const doc = this.docs.get(id);
          if (callbacks.movedBefore) {
            callbacks.movedBefore.call(this, id, before);
          }
          this.docs.moveBefore(id, before || null);
        }
      };
    } else {
      this.docs = new LocalCollection._IdMap();
      this.applyChange = {
        added: (id, fields) => {
          // Take a shallow copy since the top-level properties can be changed
          const doc = _objectSpread({}, fields);
          if (callbacks.added) {
            callbacks.added.call(this, id, EJSON.clone(fields));
          }
          doc._id = id;
          this.docs.set(id, doc);
        }
      };
    }

    // The methods in _IdMap and OrderedDict used by these callbacks are
    // identical.
    this.applyChange.changed = (id, fields) => {
      const doc = this.docs.get(id);
      if (!doc) {
        throw new Error("Unknown id for changed: ".concat(id));
      }
      if (callbacks.changed) {
        callbacks.changed.call(this, id, EJSON.clone(fields));
      }
      DiffSequence.applyChanges(doc, fields);
    };
    this.applyChange.removed = id => {
      if (callbacks.removed) {
        callbacks.removed.call(this, id);
      }
      this.docs.remove(id);
    };
  }
};
LocalCollection._IdMap = class _IdMap extends IdMap {
  constructor() {
    super(MongoID.idStringify, MongoID.idParse);
  }
};

// Wrap a transform function to return objects that have the _id field
// of the untransformed document. This ensures that subsystems such as
// the observe-sequence package that call `observe` can keep track of
// the documents identities.
//
// - Require that it returns objects
// - If the return value has an _id field, verify that it matches the
//   original _id field
// - If the return value doesn't have an _id field, add it back.
LocalCollection.wrapTransform = transform => {
  if (!transform) {
    return null;
  }

  // No need to doubly-wrap transforms.
  if (transform.__wrappedTransform__) {
    return transform;
  }
  const wrapped = doc => {
    if (!hasOwn.call(doc, '_id')) {
      // XXX do we ever have a transform on the oplog's collection? because that
      // collection has no _id.
      throw new Error('can only transform documents with _id');
    }
    const id = doc._id;

    // XXX consider making tracker a weak dependency and checking
    // Package.tracker here
    const transformed = Tracker.nonreactive(() => transform(doc));
    if (!LocalCollection._isPlainObject(transformed)) {
      throw new Error('transform must return object');
    }
    if (hasOwn.call(transformed, '_id')) {
      if (!EJSON.equals(transformed._id, id)) {
        throw new Error('transformed document can\'t have different _id');
      }
    } else {
      transformed._id = id;
    }
    return transformed;
  };
  wrapped.__wrappedTransform__ = true;
  return wrapped;
};

// XXX the sorted-query logic below is laughably inefficient. we'll
// need to come up with a better datastructure for this.
//
// XXX the logic for observing with a skip or a limit is even more
// laughably inefficient. we recompute the whole results every time!

// This binary search puts a value between any equal values, and the first
// lesser value.
LocalCollection._binarySearch = (cmp, array, value) => {
  let first = 0;
  let range = array.length;
  while (range > 0) {
    const halfRange = Math.floor(range / 2);
    if (cmp(value, array[first + halfRange]) >= 0) {
      first += halfRange + 1;
      range -= halfRange + 1;
    } else {
      range = halfRange;
    }
  }
  return first;
};
LocalCollection._checkSupportedProjection = fields => {
  if (fields !== Object(fields) || Array.isArray(fields)) {
    throw MinimongoError('fields option must be an object');
  }
  Object.keys(fields).forEach(keyPath => {
    if (keyPath.split('.').includes('$')) {
      throw MinimongoError('Minimongo doesn\'t support $ operator in projections yet.');
    }
    const value = fields[keyPath];
    if (typeof value === 'object' && ['$elemMatch', '$meta', '$slice'].some(key => hasOwn.call(value, key))) {
      throw MinimongoError('Minimongo doesn\'t support operators in projections yet.');
    }
    if (![1, 0, true, false].includes(value)) {
      throw MinimongoError('Projection values should be one of 1, 0, true, or false');
    }
  });
};

// Knows how to compile a fields projection to a predicate function.
// @returns - Function: a closure that filters out an object according to the
//            fields projection rules:
//            @param obj - Object: MongoDB-styled document
//            @returns - Object: a document with the fields filtered out
//                       according to projection rules. Doesn't retain subfields
//                       of passed argument.
LocalCollection._compileProjection = fields => {
  LocalCollection._checkSupportedProjection(fields);
  const _idProjection = fields._id === undefined ? true : fields._id;
  const details = projectionDetails(fields);

  // returns transformed doc according to ruleTree
  const transform = (doc, ruleTree) => {
    // Special case for "sets"
    if (Array.isArray(doc)) {
      return doc.map(subdoc => transform(subdoc, ruleTree));
    }
    const result = details.including ? {} : EJSON.clone(doc);
    Object.keys(ruleTree).forEach(key => {
      if (doc == null || !hasOwn.call(doc, key)) {
        return;
      }
      const rule = ruleTree[key];
      if (rule === Object(rule)) {
        // For sub-objects/subsets we branch
        if (doc[key] === Object(doc[key])) {
          result[key] = transform(doc[key], rule);
        }
      } else if (details.including) {
        // Otherwise we don't even touch this subfield
        result[key] = EJSON.clone(doc[key]);
      } else {
        delete result[key];
      }
    });
    return doc != null ? result : doc;
  };
  return doc => {
    const result = transform(doc, details.tree);
    if (_idProjection && hasOwn.call(doc, '_id')) {
      result._id = doc._id;
    }
    if (!_idProjection && hasOwn.call(result, '_id')) {
      delete result._id;
    }
    return result;
  };
};

// Calculates the document to insert in case we're doing an upsert and the
// selector does not match any elements
LocalCollection._createUpsertDocument = (selector, modifier) => {
  const selectorDocument = populateDocumentWithQueryFields(selector);
  const isModify = LocalCollection._isModificationMod(modifier);
  const newDoc = {};
  if (selectorDocument._id) {
    newDoc._id = selectorDocument._id;
    delete selectorDocument._id;
  }

  // This double _modify call is made to help with nested properties (see issue
  // #8631). We do this even if it's a replacement for validation purposes (e.g.
  // ambiguous id's)
  LocalCollection._modify(newDoc, {
    $set: selectorDocument
  });
  LocalCollection._modify(newDoc, modifier, {
    isInsert: true
  });
  if (isModify) {
    return newDoc;
  }

  // Replacement can take _id from query document
  const replacement = Object.assign({}, modifier);
  if (newDoc._id) {
    replacement._id = newDoc._id;
  }
  return replacement;
};
LocalCollection._diffObjects = (left, right, callbacks) => {
  return DiffSequence.diffObjects(left, right, callbacks);
};

// ordered: bool.
// old_results and new_results: collections of documents.
//    if ordered, they are arrays.
//    if unordered, they are IdMaps
LocalCollection._diffQueryChanges = (ordered, oldResults, newResults, observer, options) => DiffSequence.diffQueryChanges(ordered, oldResults, newResults, observer, options);
LocalCollection._diffQueryOrderedChanges = (oldResults, newResults, observer, options) => DiffSequence.diffQueryOrderedChanges(oldResults, newResults, observer, options);
LocalCollection._diffQueryUnorderedChanges = (oldResults, newResults, observer, options) => DiffSequence.diffQueryUnorderedChanges(oldResults, newResults, observer, options);
LocalCollection._findInOrderedResults = (query, doc) => {
  if (!query.ordered) {
    throw new Error('Can\'t call _findInOrderedResults on unordered query');
  }
  for (let i = 0; i < query.results.length; i++) {
    if (query.results[i] === doc) {
      return i;
    }
  }
  throw Error('object missing from query');
};

// If this is a selector which explicitly constrains the match by ID to a finite
// number of documents, returns a list of their IDs.  Otherwise returns
// null. Note that the selector may have other restrictions so it may not even
// match those document!  We care about $in and $and since those are generated
// access-controlled update and remove.
LocalCollection._idsMatchedBySelector = selector => {
  // Is the selector just an ID?
  if (LocalCollection._selectorIsId(selector)) {
    return [selector];
  }
  if (!selector) {
    return null;
  }

  // Do we have an _id clause?
  if (hasOwn.call(selector, '_id')) {
    // Is the _id clause just an ID?
    if (LocalCollection._selectorIsId(selector._id)) {
      return [selector._id];
    }

    // Is the _id clause {_id: {$in: ["x", "y", "z"]}}?
    if (selector._id && Array.isArray(selector._id.$in) && selector._id.$in.length && selector._id.$in.every(LocalCollection._selectorIsId)) {
      return selector._id.$in;
    }
    return null;
  }

  // If this is a top-level $and, and any of the clauses constrain their
  // documents, then the whole selector is constrained by any one clause's
  // constraint. (Well, by their intersection, but that seems unlikely.)
  if (Array.isArray(selector.$and)) {
    for (let i = 0; i < selector.$and.length; ++i) {
      const subIds = LocalCollection._idsMatchedBySelector(selector.$and[i]);
      if (subIds) {
        return subIds;
      }
    }
  }
  return null;
};
LocalCollection._insertInResults = (query, doc) => {
  const fields = EJSON.clone(doc);
  delete fields._id;
  if (query.ordered) {
    if (!query.sorter) {
      query.addedBefore(doc._id, query.projectionFn(fields), null);
      query.results.push(doc);
    } else {
      const i = LocalCollection._insertInSortedList(query.sorter.getComparator({
        distances: query.distances
      }), query.results, doc);
      let next = query.results[i + 1];
      if (next) {
        next = next._id;
      } else {
        next = null;
      }
      query.addedBefore(doc._id, query.projectionFn(fields), next);
    }
    query.added(doc._id, query.projectionFn(fields));
  } else {
    query.added(doc._id, query.projectionFn(fields));
    query.results.set(doc._id, doc);
  }
};
LocalCollection._insertInSortedList = (cmp, array, value) => {
  if (array.length === 0) {
    array.push(value);
    return 0;
  }
  const i = LocalCollection._binarySearch(cmp, array, value);
  array.splice(i, 0, value);
  return i;
};
LocalCollection._isModificationMod = mod => {
  let isModify = false;
  let isReplace = false;
  Object.keys(mod).forEach(key => {
    if (key.substr(0, 1) === '$') {
      isModify = true;
    } else {
      isReplace = true;
    }
  });
  if (isModify && isReplace) {
    throw new Error('Update parameter cannot have both modifier and non-modifier fields.');
  }
  return isModify;
};

// XXX maybe this should be EJSON.isObject, though EJSON doesn't know about
// RegExp
// XXX note that _type(undefined) === 3!!!!
LocalCollection._isPlainObject = x => {
  return x && LocalCollection._f._type(x) === 3;
};

// XXX need a strategy for passing the binding of $ into this
// function, from the compiled selector
//
// maybe just {key.up.to.just.before.dollarsign: array_index}
//
// XXX atomicity: if one modification fails, do we roll back the whole
// change?
//
// options:
//   - isInsert is set when _modify is being called to compute the document to
//     insert as part of an upsert operation. We use this primarily to figure
//     out when to set the fields in $setOnInsert, if present.
LocalCollection._modify = function (doc, modifier) {
  let options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  if (!LocalCollection._isPlainObject(modifier)) {
    throw MinimongoError('Modifier must be an object');
  }

  // Make sure the caller can't mutate our data structures.
  modifier = EJSON.clone(modifier);
  const isModifier = isOperatorObject(modifier);
  const newDoc = isModifier ? EJSON.clone(doc) : modifier;
  if (isModifier) {
    // apply modifiers to the doc.
    Object.keys(modifier).forEach(operator => {
      // Treat $setOnInsert as $set if this is an insert.
      const setOnInsert = options.isInsert && operator === '$setOnInsert';
      const modFunc = MODIFIERS[setOnInsert ? '$set' : operator];
      const operand = modifier[operator];
      if (!modFunc) {
        throw MinimongoError("Invalid modifier specified ".concat(operator));
      }
      Object.keys(operand).forEach(keypath => {
        const arg = operand[keypath];
        if (keypath === '') {
          throw MinimongoError('An empty update path is not valid.');
        }
        const keyparts = keypath.split('.');
        if (!keyparts.every(Boolean)) {
          throw MinimongoError("The update path '".concat(keypath, "' contains an empty field name, ") + 'which is not allowed.');
        }
        const target = findModTarget(newDoc, keyparts, {
          arrayIndices: options.arrayIndices,
          forbidArray: operator === '$rename',
          noCreate: NO_CREATE_MODIFIERS[operator]
        });
        modFunc(target, keyparts.pop(), arg, keypath, newDoc);
      });
    });
    if (doc._id && !EJSON.equals(doc._id, newDoc._id)) {
      throw MinimongoError("After applying the update to the document {_id: \"".concat(doc._id, "\", ...},") + ' the (immutable) field \'_id\' was found to have been altered to ' + "_id: \"".concat(newDoc._id, "\""));
    }
  } else {
    if (doc._id && modifier._id && !EJSON.equals(doc._id, modifier._id)) {
      throw MinimongoError("The _id field cannot be changed from {_id: \"".concat(doc._id, "\"} to ") + "{_id: \"".concat(modifier._id, "\"}"));
    }

    // replace the whole document
    assertHasValidFieldNames(modifier);
  }

  // move new document into place.
  Object.keys(doc).forEach(key => {
    // Note: this used to be for (var key in doc) however, this does not
    // work right in Opera. Deleting from a doc while iterating over it
    // would sometimes cause opera to skip some keys.
    if (key !== '_id') {
      delete doc[key];
    }
  });
  Object.keys(newDoc).forEach(key => {
    doc[key] = newDoc[key];
  });
};
LocalCollection._observeFromObserveChanges = (cursor, observeCallbacks) => {
  const transform = cursor.getTransform() || (doc => doc);
  let suppressed = !!observeCallbacks._suppress_initial;
  let observeChangesCallbacks;
  if (LocalCollection._observeCallbacksAreOrdered(observeCallbacks)) {
    // The "_no_indices" option sets all index arguments to -1 and skips the
    // linear scans required to generate them.  This lets observers that don't
    // need absolute indices benefit from the other features of this API --
    // relative order, transforms, and applyChanges -- without the speed hit.
    const indices = !observeCallbacks._no_indices;
    observeChangesCallbacks = {
      addedBefore(id, fields, before) {
        if (suppressed || !(observeCallbacks.addedAt || observeCallbacks.added)) {
          return;
        }
        const doc = transform(Object.assign(fields, {
          _id: id
        }));
        if (observeCallbacks.addedAt) {
          observeCallbacks.addedAt(doc, indices ? before ? this.docs.indexOf(before) : this.docs.size() : -1, before);
        } else {
          observeCallbacks.added(doc);
        }
      },
      changed(id, fields) {
        if (!(observeCallbacks.changedAt || observeCallbacks.changed)) {
          return;
        }
        let doc = EJSON.clone(this.docs.get(id));
        if (!doc) {
          throw new Error("Unknown id for changed: ".concat(id));
        }
        const oldDoc = transform(EJSON.clone(doc));
        DiffSequence.applyChanges(doc, fields);
        if (observeCallbacks.changedAt) {
          observeCallbacks.changedAt(transform(doc), oldDoc, indices ? this.docs.indexOf(id) : -1);
        } else {
          observeCallbacks.changed(transform(doc), oldDoc);
        }
      },
      movedBefore(id, before) {
        if (!observeCallbacks.movedTo) {
          return;
        }
        const from = indices ? this.docs.indexOf(id) : -1;
        let to = indices ? before ? this.docs.indexOf(before) : this.docs.size() : -1;

        // When not moving backwards, adjust for the fact that removing the
        // document slides everything back one slot.
        if (to > from) {
          --to;
        }
        observeCallbacks.movedTo(transform(EJSON.clone(this.docs.get(id))), from, to, before || null);
      },
      removed(id) {
        if (!(observeCallbacks.removedAt || observeCallbacks.removed)) {
          return;
        }

        // technically maybe there should be an EJSON.clone here, but it's about
        // to be removed from this.docs!
        const doc = transform(this.docs.get(id));
        if (observeCallbacks.removedAt) {
          observeCallbacks.removedAt(doc, indices ? this.docs.indexOf(id) : -1);
        } else {
          observeCallbacks.removed(doc);
        }
      }
    };
  } else {
    observeChangesCallbacks = {
      added(id, fields) {
        if (!suppressed && observeCallbacks.added) {
          observeCallbacks.added(transform(Object.assign(fields, {
            _id: id
          })));
        }
      },
      changed(id, fields) {
        if (observeCallbacks.changed) {
          const oldDoc = this.docs.get(id);
          const doc = EJSON.clone(oldDoc);
          DiffSequence.applyChanges(doc, fields);
          observeCallbacks.changed(transform(doc), transform(EJSON.clone(oldDoc)));
        }
      },
      removed(id) {
        if (observeCallbacks.removed) {
          observeCallbacks.removed(transform(this.docs.get(id)));
        }
      }
    };
  }
  const changeObserver = new LocalCollection._CachingChangeObserver({
    callbacks: observeChangesCallbacks
  });

  // CachingChangeObserver clones all received input on its callbacks
  // So we can mark it as safe to reduce the ejson clones.
  // This is tested by the `mongo-livedata - (extended) scribbling` tests
  changeObserver.applyChange._fromObserve = true;
  const handle = cursor.observeChanges(changeObserver.applyChange, {
    nonMutatingCallbacks: true
  });
  suppressed = false;
  return handle;
};
LocalCollection._observeCallbacksAreOrdered = callbacks => {
  if (callbacks.added && callbacks.addedAt) {
    throw new Error('Please specify only one of added() and addedAt()');
  }
  if (callbacks.changed && callbacks.changedAt) {
    throw new Error('Please specify only one of changed() and changedAt()');
  }
  if (callbacks.removed && callbacks.removedAt) {
    throw new Error('Please specify only one of removed() and removedAt()');
  }
  return !!(callbacks.addedAt || callbacks.changedAt || callbacks.movedTo || callbacks.removedAt);
};
LocalCollection._observeChangesCallbacksAreOrdered = callbacks => {
  if (callbacks.added && callbacks.addedBefore) {
    throw new Error('Please specify only one of added() and addedBefore()');
  }
  return !!(callbacks.addedBefore || callbacks.movedBefore);
};
LocalCollection._removeFromResults = (query, doc) => {
  if (query.ordered) {
    const i = LocalCollection._findInOrderedResults(query, doc);
    query.removed(doc._id);
    query.results.splice(i, 1);
  } else {
    const id = doc._id; // in case callback mutates doc

    query.removed(doc._id);
    query.results.remove(id);
  }
};

// Is this selector just shorthand for lookup by _id?
LocalCollection._selectorIsId = selector => typeof selector === 'number' || typeof selector === 'string' || selector instanceof MongoID.ObjectID;

// Is the selector just lookup by _id (shorthand or not)?
LocalCollection._selectorIsIdPerhapsAsObject = selector => LocalCollection._selectorIsId(selector) || LocalCollection._selectorIsId(selector && selector._id) && Object.keys(selector).length === 1;
LocalCollection._updateInResults = (query, doc, old_doc) => {
  if (!EJSON.equals(doc._id, old_doc._id)) {
    throw new Error('Can\'t change a doc\'s _id while updating');
  }
  const projectionFn = query.projectionFn;
  const changedFields = DiffSequence.makeChangedFields(projectionFn(doc), projectionFn(old_doc));
  if (!query.ordered) {
    if (Object.keys(changedFields).length) {
      query.changed(doc._id, changedFields);
      query.results.set(doc._id, doc);
    }
    return;
  }
  const old_idx = LocalCollection._findInOrderedResults(query, doc);
  if (Object.keys(changedFields).length) {
    query.changed(doc._id, changedFields);
  }
  if (!query.sorter) {
    return;
  }

  // just take it out and put it back in again, and see if the index changes
  query.results.splice(old_idx, 1);
  const new_idx = LocalCollection._insertInSortedList(query.sorter.getComparator({
    distances: query.distances
  }), query.results, doc);
  if (old_idx !== new_idx) {
    let next = query.results[new_idx + 1];
    if (next) {
      next = next._id;
    } else {
      next = null;
    }
    query.movedBefore && query.movedBefore(doc._id, next);
  }
};
const MODIFIERS = {
  $currentDate(target, field, arg) {
    if (typeof arg === 'object' && hasOwn.call(arg, '$type')) {
      if (arg.$type !== 'date') {
        throw MinimongoError('Minimongo does currently only support the date type in ' + '$currentDate modifiers', {
          field
        });
      }
    } else if (arg !== true) {
      throw MinimongoError('Invalid $currentDate modifier', {
        field
      });
    }
    target[field] = new Date();
  },
  $inc(target, field, arg) {
    if (typeof arg !== 'number') {
      throw MinimongoError('Modifier $inc allowed for numbers only', {
        field
      });
    }
    if (field in target) {
      if (typeof target[field] !== 'number') {
        throw MinimongoError('Cannot apply $inc modifier to non-number', {
          field
        });
      }
      target[field] += arg;
    } else {
      target[field] = arg;
    }
  },
  $min(target, field, arg) {
    if (typeof arg !== 'number') {
      throw MinimongoError('Modifier $min allowed for numbers only', {
        field
      });
    }
    if (field in target) {
      if (typeof target[field] !== 'number') {
        throw MinimongoError('Cannot apply $min modifier to non-number', {
          field
        });
      }
      if (target[field] > arg) {
        target[field] = arg;
      }
    } else {
      target[field] = arg;
    }
  },
  $max(target, field, arg) {
    if (typeof arg !== 'number') {
      throw MinimongoError('Modifier $max allowed for numbers only', {
        field
      });
    }
    if (field in target) {
      if (typeof target[field] !== 'number') {
        throw MinimongoError('Cannot apply $max modifier to non-number', {
          field
        });
      }
      if (target[field] < arg) {
        target[field] = arg;
      }
    } else {
      target[field] = arg;
    }
  },
  $mul(target, field, arg) {
    if (typeof arg !== 'number') {
      throw MinimongoError('Modifier $mul allowed for numbers only', {
        field
      });
    }
    if (field in target) {
      if (typeof target[field] !== 'number') {
        throw MinimongoError('Cannot apply $mul modifier to non-number', {
          field
        });
      }
      target[field] *= arg;
    } else {
      target[field] = 0;
    }
  },
  $rename(target, field, arg, keypath, doc) {
    // no idea why mongo has this restriction..
    if (keypath === arg) {
      throw MinimongoError('$rename source must differ from target', {
        field
      });
    }
    if (target === null) {
      throw MinimongoError('$rename source field invalid', {
        field
      });
    }
    if (typeof arg !== 'string') {
      throw MinimongoError('$rename target must be a string', {
        field
      });
    }
    if (arg.includes('\0')) {
      // Null bytes are not allowed in Mongo field names
      // https://docs.mongodb.com/manual/reference/limits/#Restrictions-on-Field-Names
      throw MinimongoError('The \'to\' field for $rename cannot contain an embedded null byte', {
        field
      });
    }
    if (target === undefined) {
      return;
    }
    const object = target[field];
    delete target[field];
    const keyparts = arg.split('.');
    const target2 = findModTarget(doc, keyparts, {
      forbidArray: true
    });
    if (target2 === null) {
      throw MinimongoError('$rename target field invalid', {
        field
      });
    }
    target2[keyparts.pop()] = object;
  },
  $set(target, field, arg) {
    if (target !== Object(target)) {
      // not an array or an object
      const error = MinimongoError('Cannot set property on non-object field', {
        field
      });
      error.setPropertyError = true;
      throw error;
    }
    if (target === null) {
      const error = MinimongoError('Cannot set property on null', {
        field
      });
      error.setPropertyError = true;
      throw error;
    }
    assertHasValidFieldNames(arg);
    target[field] = arg;
  },
  $setOnInsert(target, field, arg) {
    // converted to `$set` in `_modify`
  },
  $unset(target, field, arg) {
    if (target !== undefined) {
      if (target instanceof Array) {
        if (field in target) {
          target[field] = null;
        }
      } else {
        delete target[field];
      }
    }
  },
  $push(target, field, arg) {
    if (target[field] === undefined) {
      target[field] = [];
    }
    if (!(target[field] instanceof Array)) {
      throw MinimongoError('Cannot apply $push modifier to non-array', {
        field
      });
    }
    if (!(arg && arg.$each)) {
      // Simple mode: not $each
      assertHasValidFieldNames(arg);
      target[field].push(arg);
      return;
    }

    // Fancy mode: $each (and maybe $slice and $sort and $position)
    const toPush = arg.$each;
    if (!(toPush instanceof Array)) {
      throw MinimongoError('$each must be an array', {
        field
      });
    }
    assertHasValidFieldNames(toPush);

    // Parse $position
    let position = undefined;
    if ('$position' in arg) {
      if (typeof arg.$position !== 'number') {
        throw MinimongoError('$position must be a numeric value', {
          field
        });
      }

      // XXX should check to make sure integer
      if (arg.$position < 0) {
        throw MinimongoError('$position in $push must be zero or positive', {
          field
        });
      }
      position = arg.$position;
    }

    // Parse $slice.
    let slice = undefined;
    if ('$slice' in arg) {
      if (typeof arg.$slice !== 'number') {
        throw MinimongoError('$slice must be a numeric value', {
          field
        });
      }

      // XXX should check to make sure integer
      slice = arg.$slice;
    }

    // Parse $sort.
    let sortFunction = undefined;
    if (arg.$sort) {
      if (slice === undefined) {
        throw MinimongoError('$sort requires $slice to be present', {
          field
        });
      }

      // XXX this allows us to use a $sort whose value is an array, but that's
      // actually an extension of the Node driver, so it won't work
      // server-side. Could be confusing!
      // XXX is it correct that we don't do geo-stuff here?
      sortFunction = new Minimongo.Sorter(arg.$sort).getComparator();
      toPush.forEach(element => {
        if (LocalCollection._f._type(element) !== 3) {
          throw MinimongoError('$push like modifiers using $sort require all elements to be ' + 'objects', {
            field
          });
        }
      });
    }

    // Actually push.
    if (position === undefined) {
      toPush.forEach(element => {
        target[field].push(element);
      });
    } else {
      const spliceArguments = [position, 0];
      toPush.forEach(element => {
        spliceArguments.push(element);
      });
      target[field].splice(...spliceArguments);
    }

    // Actually sort.
    if (sortFunction) {
      target[field].sort(sortFunction);
    }

    // Actually slice.
    if (slice !== undefined) {
      if (slice === 0) {
        target[field] = []; // differs from Array.slice!
      } else if (slice < 0) {
        target[field] = target[field].slice(slice);
      } else {
        target[field] = target[field].slice(0, slice);
      }
    }
  },
  $pushAll(target, field, arg) {
    if (!(typeof arg === 'object' && arg instanceof Array)) {
      throw MinimongoError('Modifier $pushAll/pullAll allowed for arrays only');
    }
    assertHasValidFieldNames(arg);
    const toPush = target[field];
    if (toPush === undefined) {
      target[field] = arg;
    } else if (!(toPush instanceof Array)) {
      throw MinimongoError('Cannot apply $pushAll modifier to non-array', {
        field
      });
    } else {
      toPush.push(...arg);
    }
  },
  $addToSet(target, field, arg) {
    let isEach = false;
    if (typeof arg === 'object') {
      // check if first key is '$each'
      const keys = Object.keys(arg);
      if (keys[0] === '$each') {
        isEach = true;
      }
    }
    const values = isEach ? arg.$each : [arg];
    assertHasValidFieldNames(values);
    const toAdd = target[field];
    if (toAdd === undefined) {
      target[field] = values;
    } else if (!(toAdd instanceof Array)) {
      throw MinimongoError('Cannot apply $addToSet modifier to non-array', {
        field
      });
    } else {
      values.forEach(value => {
        if (toAdd.some(element => LocalCollection._f._equal(value, element))) {
          return;
        }
        toAdd.push(value);
      });
    }
  },
  $pop(target, field, arg) {
    if (target === undefined) {
      return;
    }
    const toPop = target[field];
    if (toPop === undefined) {
      return;
    }
    if (!(toPop instanceof Array)) {
      throw MinimongoError('Cannot apply $pop modifier to non-array', {
        field
      });
    }
    if (typeof arg === 'number' && arg < 0) {
      toPop.splice(0, 1);
    } else {
      toPop.pop();
    }
  },
  $pull(target, field, arg) {
    if (target === undefined) {
      return;
    }
    const toPull = target[field];
    if (toPull === undefined) {
      return;
    }
    if (!(toPull instanceof Array)) {
      throw MinimongoError('Cannot apply $pull/pullAll modifier to non-array', {
        field
      });
    }
    let out;
    if (arg != null && typeof arg === 'object' && !(arg instanceof Array)) {
      // XXX would be much nicer to compile this once, rather than
      // for each document we modify.. but usually we're not
      // modifying that many documents, so we'll let it slide for
      // now

      // XXX Minimongo.Matcher isn't up for the job, because we need
      // to permit stuff like {$pull: {a: {$gt: 4}}}.. something
      // like {$gt: 4} is not normally a complete selector.
      // same issue as $elemMatch possibly?
      const matcher = new Minimongo.Matcher(arg);
      out = toPull.filter(element => !matcher.documentMatches(element).result);
    } else {
      out = toPull.filter(element => !LocalCollection._f._equal(element, arg));
    }
    target[field] = out;
  },
  $pullAll(target, field, arg) {
    if (!(typeof arg === 'object' && arg instanceof Array)) {
      throw MinimongoError('Modifier $pushAll/pullAll allowed for arrays only', {
        field
      });
    }
    if (target === undefined) {
      return;
    }
    const toPull = target[field];
    if (toPull === undefined) {
      return;
    }
    if (!(toPull instanceof Array)) {
      throw MinimongoError('Cannot apply $pull/pullAll modifier to non-array', {
        field
      });
    }
    target[field] = toPull.filter(object => !arg.some(element => LocalCollection._f._equal(object, element)));
  },
  $bit(target, field, arg) {
    // XXX mongo only supports $bit on integers, and we only support
    // native javascript numbers (doubles) so far, so we can't support $bit
    throw MinimongoError('$bit is not supported', {
      field
    });
  },
  $v() {
    // As discussed in https://github.com/meteor/meteor/issues/9623,
    // the `$v` operator is not needed by Meteor, but problems can occur if
    // it's not at least callable (as of Mongo >= 3.6). It's defined here as
    // a no-op to work around these problems.
  }
};
const NO_CREATE_MODIFIERS = {
  $pop: true,
  $pull: true,
  $pullAll: true,
  $rename: true,
  $unset: true
};

// Make sure field names do not contain Mongo restricted
// characters ('.', '$', '\0').
// https://docs.mongodb.com/manual/reference/limits/#Restrictions-on-Field-Names
const invalidCharMsg = {
  $: 'start with \'$\'',
  '.': 'contain \'.\'',
  '\0': 'contain null bytes'
};

// checks if all field names in an object are valid
function assertHasValidFieldNames(doc) {
  if (doc && typeof doc === 'object') {
    JSON.stringify(doc, (key, value) => {
      assertIsValidFieldName(key);
      return value;
    });
  }
}
function assertIsValidFieldName(key) {
  let match;
  if (typeof key === 'string' && (match = key.match(/^\$|\.|\0/))) {
    throw MinimongoError("Key ".concat(key, " must not ").concat(invalidCharMsg[match[0]]));
  }
}

// for a.b.c.2.d.e, keyparts should be ['a', 'b', 'c', '2', 'd', 'e'],
// and then you would operate on the 'e' property of the returned
// object.
//
// if options.noCreate is falsey, creates intermediate levels of
// structure as necessary, like mkdir -p (and raises an exception if
// that would mean giving a non-numeric property to an array.) if
// options.noCreate is true, return undefined instead.
//
// may modify the last element of keyparts to signal to the caller that it needs
// to use a different value to index into the returned object (for example,
// ['a', '01'] -> ['a', 1]).
//
// if forbidArray is true, return null if the keypath goes through an array.
//
// if options.arrayIndices is set, use its first element for the (first) '$' in
// the path.
function findModTarget(doc, keyparts) {
  let options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  let usedArrayIndex = false;
  for (let i = 0; i < keyparts.length; i++) {
    const last = i === keyparts.length - 1;
    let keypart = keyparts[i];
    if (!isIndexable(doc)) {
      if (options.noCreate) {
        return undefined;
      }
      const error = MinimongoError("cannot use the part '".concat(keypart, "' to traverse ").concat(doc));
      error.setPropertyError = true;
      throw error;
    }
    if (doc instanceof Array) {
      if (options.forbidArray) {
        return null;
      }
      if (keypart === '$') {
        if (usedArrayIndex) {
          throw MinimongoError('Too many positional (i.e. \'$\') elements');
        }
        if (!options.arrayIndices || !options.arrayIndices.length) {
          throw MinimongoError('The positional operator did not find the match needed from the ' + 'query');
        }
        keypart = options.arrayIndices[0];
        usedArrayIndex = true;
      } else if (isNumericKey(keypart)) {
        keypart = parseInt(keypart);
      } else {
        if (options.noCreate) {
          return undefined;
        }
        throw MinimongoError("can't append to array using string field name [".concat(keypart, "]"));
      }
      if (last) {
        keyparts[i] = keypart; // handle 'a.01'
      }
      if (options.noCreate && keypart >= doc.length) {
        return undefined;
      }
      while (doc.length < keypart) {
        doc.push(null);
      }
      if (!last) {
        if (doc.length === keypart) {
          doc.push({});
        } else if (typeof doc[keypart] !== 'object') {
          throw MinimongoError("can't modify field '".concat(keyparts[i + 1], "' of list value ") + JSON.stringify(doc[keypart]));
        }
      }
    } else {
      assertIsValidFieldName(keypart);
      if (!(keypart in doc)) {
        if (options.noCreate) {
          return undefined;
        }
        if (!last) {
          doc[keypart] = {};
        }
      }
    }
    if (last) {
      return doc;
    }
    doc = doc[keypart];
  }

  // notreached
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"matcher.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/matcher.js                                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _Package$mongoDecima;
module.export({
  default: () => Matcher
});
let LocalCollection;
module.link("./local_collection.js", {
  default(v) {
    LocalCollection = v;
  }
}, 0);
let compileDocumentSelector, hasOwn, nothingMatcher;
module.link("./common.js", {
  compileDocumentSelector(v) {
    compileDocumentSelector = v;
  },
  hasOwn(v) {
    hasOwn = v;
  },
  nothingMatcher(v) {
    nothingMatcher = v;
  }
}, 1);
const Decimal = ((_Package$mongoDecima = Package['mongo-decimal']) === null || _Package$mongoDecima === void 0 ? void 0 : _Package$mongoDecima.Decimal) || class DecimalStub {};

// The minimongo selector compiler!

// Terminology:
//  - a 'selector' is the EJSON object representing a selector
//  - a 'matcher' is its compiled form (whether a full Minimongo.Matcher
//    object or one of the component lambdas that matches parts of it)
//  - a 'result object' is an object with a 'result' field and maybe
//    distance and arrayIndices.
//  - a 'branched value' is an object with a 'value' field and maybe
//    'dontIterate' and 'arrayIndices'.
//  - a 'document' is a top-level object that can be stored in a collection.
//  - a 'lookup function' is a function that takes in a document and returns
//    an array of 'branched values'.
//  - a 'branched matcher' maps from an array of branched values to a result
//    object.
//  - an 'element matcher' maps from a single value to a bool.

// Main entry point.
//   var matcher = new Minimongo.Matcher({a: {$gt: 5}});
//   if (matcher.documentMatches({a: 7})) ...
class Matcher {
  constructor(selector, isUpdate) {
    // A set (object mapping string -> *) of all of the document paths looked
    // at by the selector. Also includes the empty string if it may look at any
    // path (eg, $where).
    this._paths = {};
    // Set to true if compilation finds a $near.
    this._hasGeoQuery = false;
    // Set to true if compilation finds a $where.
    this._hasWhere = false;
    // Set to false if compilation finds anything other than a simple equality
    // or one or more of '$gt', '$gte', '$lt', '$lte', '$ne', '$in', '$nin' used
    // with scalars as operands.
    this._isSimple = true;
    // Set to a dummy document which always matches this Matcher. Or set to null
    // if such document is too hard to find.
    this._matchingDocument = undefined;
    // A clone of the original selector. It may just be a function if the user
    // passed in a function; otherwise is definitely an object (eg, IDs are
    // translated into {_id: ID} first. Used by canBecomeTrueByModifier and
    // Sorter._useWithMatcher.
    this._selector = null;
    this._docMatcher = this._compileSelector(selector);
    // Set to true if selection is done for an update operation
    // Default is false
    // Used for $near array update (issue #3599)
    this._isUpdate = isUpdate;
  }
  documentMatches(doc) {
    if (doc !== Object(doc)) {
      throw Error('documentMatches needs a document');
    }
    return this._docMatcher(doc);
  }
  hasGeoQuery() {
    return this._hasGeoQuery;
  }
  hasWhere() {
    return this._hasWhere;
  }
  isSimple() {
    return this._isSimple;
  }

  // Given a selector, return a function that takes one argument, a
  // document. It returns a result object.
  _compileSelector(selector) {
    // you can pass a literal function instead of a selector
    if (selector instanceof Function) {
      this._isSimple = false;
      this._selector = selector;
      this._recordPathUsed('');
      return doc => ({
        result: !!selector.call(doc)
      });
    }

    // shorthand -- scalar _id
    if (LocalCollection._selectorIsId(selector)) {
      this._selector = {
        _id: selector
      };
      this._recordPathUsed('_id');
      return doc => ({
        result: EJSON.equals(doc._id, selector)
      });
    }

    // protect against dangerous selectors.  falsey and {_id: falsey} are both
    // likely programmer error, and not what you want, particularly for
    // destructive operations.
    if (!selector || hasOwn.call(selector, '_id') && !selector._id) {
      this._isSimple = false;
      return nothingMatcher;
    }

    // Top level can't be an array or true or binary.
    if (Array.isArray(selector) || EJSON.isBinary(selector) || typeof selector === 'boolean') {
      throw new Error("Invalid selector: ".concat(selector));
    }
    this._selector = EJSON.clone(selector);
    return compileDocumentSelector(selector, this, {
      isRoot: true
    });
  }

  // Returns a list of key paths the given selector is looking for. It includes
  // the empty string if there is a $where.
  _getPaths() {
    return Object.keys(this._paths);
  }
  _recordPathUsed(path) {
    this._paths[path] = true;
  }
}
// helpers used by compiled selector code
LocalCollection._f = {
  // XXX for _all and _in, consider building 'inquery' at compile time..
  _type(v) {
    if (typeof v === 'number') {
      return 1;
    }
    if (typeof v === 'string') {
      return 2;
    }
    if (typeof v === 'boolean') {
      return 8;
    }
    if (Array.isArray(v)) {
      return 4;
    }
    if (v === null) {
      return 10;
    }

    // note that typeof(/x/) === "object"
    if (v instanceof RegExp) {
      return 11;
    }
    if (typeof v === 'function') {
      return 13;
    }
    if (v instanceof Date) {
      return 9;
    }
    if (EJSON.isBinary(v)) {
      return 5;
    }
    if (v instanceof MongoID.ObjectID) {
      return 7;
    }
    if (v instanceof Decimal) {
      return 1;
    }

    // object
    return 3;

    // XXX support some/all of these:
    // 14, symbol
    // 15, javascript code with scope
    // 16, 18: 32-bit/64-bit integer
    // 17, timestamp
    // 255, minkey
    // 127, maxkey
  },
  // deep equality test: use for literal document and array matches
  _equal(a, b) {
    return EJSON.equals(a, b, {
      keyOrderSensitive: true
    });
  },
  // maps a type code to a value that can be used to sort values of different
  // types
  _typeorder(t) {
    // http://www.mongodb.org/display/DOCS/What+is+the+Compare+Order+for+BSON+Types
    // XXX what is the correct sort position for Javascript code?
    // ('100' in the matrix below)
    // XXX minkey/maxkey
    return [-1,
    // (not a type)
    1,
    // number
    2,
    // string
    3,
    // object
    4,
    // array
    5,
    // binary
    -1,
    // deprecated
    6,
    // ObjectID
    7,
    // bool
    8,
    // Date
    0,
    // null
    9,
    // RegExp
    -1,
    // deprecated
    100,
    // JS code
    2,
    // deprecated (symbol)
    100,
    // JS code
    1,
    // 32-bit int
    8,
    // Mongo timestamp
    1 // 64-bit int
    ][t];
  },
  // compare two values of unknown type according to BSON ordering
  // semantics. (as an extension, consider 'undefined' to be less than
  // any other value.) return negative if a is less, positive if b is
  // less, or 0 if equal
  _cmp(a, b) {
    if (a === undefined) {
      return b === undefined ? 0 : -1;
    }
    if (b === undefined) {
      return 1;
    }
    let ta = LocalCollection._f._type(a);
    let tb = LocalCollection._f._type(b);
    const oa = LocalCollection._f._typeorder(ta);
    const ob = LocalCollection._f._typeorder(tb);
    if (oa !== ob) {
      return oa < ob ? -1 : 1;
    }

    // XXX need to implement this if we implement Symbol or integers, or
    // Timestamp
    if (ta !== tb) {
      throw Error('Missing type coercion logic in _cmp');
    }
    if (ta === 7) {
      // ObjectID
      // Convert to string.
      ta = tb = 2;
      a = a.toHexString();
      b = b.toHexString();
    }
    if (ta === 9) {
      // Date
      // Convert to millis.
      ta = tb = 1;
      a = isNaN(a) ? 0 : a.getTime();
      b = isNaN(b) ? 0 : b.getTime();
    }
    if (ta === 1) {
      // double
      if (a instanceof Decimal) {
        return a.minus(b).toNumber();
      } else {
        return a - b;
      }
    }
    if (tb === 2)
      // string
      return a < b ? -1 : a === b ? 0 : 1;
    if (ta === 3) {
      // Object
      // this could be much more efficient in the expected case ...
      const toArray = object => {
        const result = [];
        Object.keys(object).forEach(key => {
          result.push(key, object[key]);
        });
        return result;
      };
      return LocalCollection._f._cmp(toArray(a), toArray(b));
    }
    if (ta === 4) {
      // Array
      for (let i = 0;; i++) {
        if (i === a.length) {
          return i === b.length ? 0 : -1;
        }
        if (i === b.length) {
          return 1;
        }
        const s = LocalCollection._f._cmp(a[i], b[i]);
        if (s !== 0) {
          return s;
        }
      }
    }
    if (ta === 5) {
      // binary
      // Surprisingly, a small binary blob is always less than a large one in
      // Mongo.
      if (a.length !== b.length) {
        return a.length - b.length;
      }
      for (let i = 0; i < a.length; i++) {
        if (a[i] < b[i]) {
          return -1;
        }
        if (a[i] > b[i]) {
          return 1;
        }
      }
      return 0;
    }
    if (ta === 8) {
      // boolean
      if (a) {
        return b ? 0 : 1;
      }
      return b ? -1 : 0;
    }
    if (ta === 10)
      // null
      return 0;
    if (ta === 11)
      // regexp
      throw Error('Sorting not supported on regular expression'); // XXX

    // 13: javascript code
    // 14: symbol
    // 15: javascript code with scope
    // 16: 32-bit integer
    // 17: timestamp
    // 18: 64-bit integer
    // 255: minkey
    // 127: maxkey
    if (ta === 13)
      // javascript code
      throw Error('Sorting not supported on Javascript code'); // XXX

    throw Error('Unknown type to sort');
  }
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"minimongo_common.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/minimongo_common.js                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let LocalCollection_;
module.link("./local_collection.js", {
  default(v) {
    LocalCollection_ = v;
  }
}, 0);
let Matcher;
module.link("./matcher.js", {
  default(v) {
    Matcher = v;
  }
}, 1);
let Sorter;
module.link("./sorter.js", {
  default(v) {
    Sorter = v;
  }
}, 2);
LocalCollection = LocalCollection_;
Minimongo = {
  LocalCollection: LocalCollection_,
  Matcher,
  Sorter
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"observe_handle.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/observe_handle.js                                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  default: () => ObserveHandle
});
class ObserveHandle {}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"sorter.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/sorter.js                                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  default: () => Sorter
});
let ELEMENT_OPERATORS, equalityElementMatcher, expandArraysInBranches, hasOwn, isOperatorObject, makeLookupFunction, regexpElementMatcher;
module.link("./common.js", {
  ELEMENT_OPERATORS(v) {
    ELEMENT_OPERATORS = v;
  },
  equalityElementMatcher(v) {
    equalityElementMatcher = v;
  },
  expandArraysInBranches(v) {
    expandArraysInBranches = v;
  },
  hasOwn(v) {
    hasOwn = v;
  },
  isOperatorObject(v) {
    isOperatorObject = v;
  },
  makeLookupFunction(v) {
    makeLookupFunction = v;
  },
  regexpElementMatcher(v) {
    regexpElementMatcher = v;
  }
}, 0);
class Sorter {
  constructor(spec) {
    this._sortSpecParts = [];
    this._sortFunction = null;
    const addSpecPart = (path, ascending) => {
      if (!path) {
        throw Error('sort keys must be non-empty');
      }
      if (path.charAt(0) === '$') {
        throw Error("unsupported sort key: ".concat(path));
      }
      this._sortSpecParts.push({
        ascending,
        lookup: makeLookupFunction(path, {
          forSort: true
        }),
        path
      });
    };
    if (spec instanceof Array) {
      spec.forEach(element => {
        if (typeof element === 'string') {
          addSpecPart(element, true);
        } else {
          addSpecPart(element[0], element[1] !== 'desc');
        }
      });
    } else if (typeof spec === 'object') {
      Object.keys(spec).forEach(key => {
        addSpecPart(key, spec[key] >= 0);
      });
    } else if (typeof spec === 'function') {
      this._sortFunction = spec;
    } else {
      throw Error("Bad sort specification: ".concat(JSON.stringify(spec)));
    }

    // If a function is specified for sorting, we skip the rest.
    if (this._sortFunction) {
      return;
    }

    // To implement affectedByModifier, we piggy-back on top of Matcher's
    // affectedByModifier code; we create a selector that is affected by the
    // same modifiers as this sort order. This is only implemented on the
    // server.
    if (this.affectedByModifier) {
      const selector = {};
      this._sortSpecParts.forEach(spec => {
        selector[spec.path] = 1;
      });
      this._selectorForAffectedByModifier = new Minimongo.Matcher(selector);
    }
    this._keyComparator = composeComparators(this._sortSpecParts.map((spec, i) => this._keyFieldComparator(i)));
  }
  getComparator(options) {
    // If sort is specified or have no distances, just use the comparator from
    // the source specification (which defaults to "everything is equal".
    // issue #3599
    // https://docs.mongodb.com/manual/reference/operator/query/near/#sort-operation
    // sort effectively overrides $near
    if (this._sortSpecParts.length || !options || !options.distances) {
      return this._getBaseComparator();
    }
    const distances = options.distances;

    // Return a comparator which compares using $near distances.
    return (a, b) => {
      if (!distances.has(a._id)) {
        throw Error("Missing distance for ".concat(a._id));
      }
      if (!distances.has(b._id)) {
        throw Error("Missing distance for ".concat(b._id));
      }
      return distances.get(a._id) - distances.get(b._id);
    };
  }

  // Takes in two keys: arrays whose lengths match the number of spec
  // parts. Returns negative, 0, or positive based on using the sort spec to
  // compare fields.
  _compareKeys(key1, key2) {
    if (key1.length !== this._sortSpecParts.length || key2.length !== this._sortSpecParts.length) {
      throw Error('Key has wrong length');
    }
    return this._keyComparator(key1, key2);
  }

  // Iterates over each possible "key" from doc (ie, over each branch), calling
  // 'cb' with the key.
  _generateKeysFromDoc(doc, cb) {
    if (this._sortSpecParts.length === 0) {
      throw new Error('can\'t generate keys without a spec');
    }
    const pathFromIndices = indices => "".concat(indices.join(','), ",");
    let knownPaths = null;

    // maps index -> ({'' -> value} or {path -> value})
    const valuesByIndexAndPath = this._sortSpecParts.map(spec => {
      // Expand any leaf arrays that we find, and ignore those arrays
      // themselves.  (We never sort based on an array itself.)
      let branches = expandArraysInBranches(spec.lookup(doc), true);

      // If there are no values for a key (eg, key goes to an empty array),
      // pretend we found one undefined value.
      if (!branches.length) {
        branches = [{
          value: void 0
        }];
      }
      const element = Object.create(null);
      let usedPaths = false;
      branches.forEach(branch => {
        if (!branch.arrayIndices) {
          // If there are no array indices for a branch, then it must be the
          // only branch, because the only thing that produces multiple branches
          // is the use of arrays.
          if (branches.length > 1) {
            throw Error('multiple branches but no array used?');
          }
          element[''] = branch.value;
          return;
        }
        usedPaths = true;
        const path = pathFromIndices(branch.arrayIndices);
        if (hasOwn.call(element, path)) {
          throw Error("duplicate path: ".concat(path));
        }
        element[path] = branch.value;

        // If two sort fields both go into arrays, they have to go into the
        // exact same arrays and we have to find the same paths.  This is
        // roughly the same condition that makes MongoDB throw this strange
        // error message.  eg, the main thing is that if sort spec is {a: 1,
        // b:1} then a and b cannot both be arrays.
        //
        // (In MongoDB it seems to be OK to have {a: 1, 'a.x.y': 1} where 'a'
        // and 'a.x.y' are both arrays, but we don't allow this for now.
        // #NestedArraySort
        // XXX achieve full compatibility here
        if (knownPaths && !hasOwn.call(knownPaths, path)) {
          throw Error('cannot index parallel arrays');
        }
      });
      if (knownPaths) {
        // Similarly to above, paths must match everywhere, unless this is a
        // non-array field.
        if (!hasOwn.call(element, '') && Object.keys(knownPaths).length !== Object.keys(element).length) {
          throw Error('cannot index parallel arrays!');
        }
      } else if (usedPaths) {
        knownPaths = {};
        Object.keys(element).forEach(path => {
          knownPaths[path] = true;
        });
      }
      return element;
    });
    if (!knownPaths) {
      // Easy case: no use of arrays.
      const soleKey = valuesByIndexAndPath.map(values => {
        if (!hasOwn.call(values, '')) {
          throw Error('no value in sole key case?');
        }
        return values[''];
      });
      cb(soleKey);
      return;
    }
    Object.keys(knownPaths).forEach(path => {
      const key = valuesByIndexAndPath.map(values => {
        if (hasOwn.call(values, '')) {
          return values[''];
        }
        if (!hasOwn.call(values, path)) {
          throw Error('missing path?');
        }
        return values[path];
      });
      cb(key);
    });
  }

  // Returns a comparator that represents the sort specification (but not
  // including a possible geoquery distance tie-breaker).
  _getBaseComparator() {
    if (this._sortFunction) {
      return this._sortFunction;
    }

    // If we're only sorting on geoquery distance and no specs, just say
    // everything is equal.
    if (!this._sortSpecParts.length) {
      return (doc1, doc2) => 0;
    }
    return (doc1, doc2) => {
      const key1 = this._getMinKeyFromDoc(doc1);
      const key2 = this._getMinKeyFromDoc(doc2);
      return this._compareKeys(key1, key2);
    };
  }

  // Finds the minimum key from the doc, according to the sort specs.  (We say
  // "minimum" here but this is with respect to the sort spec, so "descending"
  // sort fields mean we're finding the max for that field.)
  //
  // Note that this is NOT "find the minimum value of the first field, the
  // minimum value of the second field, etc"... it's "choose the
  // lexicographically minimum value of the key vector, allowing only keys which
  // you can find along the same paths".  ie, for a doc {a: [{x: 0, y: 5}, {x:
  // 1, y: 3}]} with sort spec {'a.x': 1, 'a.y': 1}, the only keys are [0,5] and
  // [1,3], and the minimum key is [0,5]; notably, [0,3] is NOT a key.
  _getMinKeyFromDoc(doc) {
    let minKey = null;
    this._generateKeysFromDoc(doc, key => {
      if (minKey === null) {
        minKey = key;
        return;
      }
      if (this._compareKeys(key, minKey) < 0) {
        minKey = key;
      }
    });
    return minKey;
  }
  _getPaths() {
    return this._sortSpecParts.map(part => part.path);
  }

  // Given an index 'i', returns a comparator that compares two key arrays based
  // on field 'i'.
  _keyFieldComparator(i) {
    const invert = !this._sortSpecParts[i].ascending;
    return (key1, key2) => {
      const compare = LocalCollection._f._cmp(key1[i], key2[i]);
      return invert ? -compare : compare;
    };
  }
}
// Given an array of comparators
// (functions (a,b)->(negative or positive or zero)), returns a single
// comparator which uses each comparator in order and returns the first
// non-zero value.
function composeComparators(comparatorArray) {
  return (a, b) => {
    for (let i = 0; i < comparatorArray.length; ++i) {
      const compare = comparatorArray[i](a, b);
      if (compare !== 0) {
        return compare;
      }
    }
    return 0;
  };
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

var exports = require("/node_modules/meteor/minimongo/minimongo_server.js");

/* Exports */
Package._define("minimongo", exports, {
  LocalCollection: LocalCollection,
  Minimongo: Minimongo,
  MinimongoTest: MinimongoTest,
  MinimongoError: MinimongoError
});

})();

//# sourceURL=meteor://💻app/packages/minimongo.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbWluaW1vbmdvL21pbmltb25nb19zZXJ2ZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21pbmltb25nby9jb21tb24uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21pbmltb25nby9jb25zdGFudHMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21pbmltb25nby9jdXJzb3IuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21pbmltb25nby9sb2NhbF9jb2xsZWN0aW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9taW5pbW9uZ28vbWF0Y2hlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbWluaW1vbmdvL21pbmltb25nb19jb21tb24uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21pbmltb25nby9vYnNlcnZlX2hhbmRsZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbWluaW1vbmdvL3NvcnRlci5qcyJdLCJuYW1lcyI6WyJtb2R1bGUiLCJsaW5rIiwiaGFzT3duIiwiaXNOdW1lcmljS2V5IiwiaXNPcGVyYXRvck9iamVjdCIsInBhdGhzVG9UcmVlIiwicHJvamVjdGlvbkRldGFpbHMiLCJ2IiwiTWluaW1vbmdvIiwiX3BhdGhzRWxpZGluZ051bWVyaWNLZXlzIiwicGF0aHMiLCJtYXAiLCJwYXRoIiwic3BsaXQiLCJmaWx0ZXIiLCJwYXJ0Iiwiam9pbiIsIk1hdGNoZXIiLCJwcm90b3R5cGUiLCJhZmZlY3RlZEJ5TW9kaWZpZXIiLCJtb2RpZmllciIsIk9iamVjdCIsImFzc2lnbiIsIiRzZXQiLCIkdW5zZXQiLCJtZWFuaW5nZnVsUGF0aHMiLCJfZ2V0UGF0aHMiLCJtb2RpZmllZFBhdGhzIiwiY29uY2F0Iiwia2V5cyIsInNvbWUiLCJtb2QiLCJtZWFuaW5nZnVsUGF0aCIsInNlbCIsImkiLCJqIiwibGVuZ3RoIiwiY2FuQmVjb21lVHJ1ZUJ5TW9kaWZpZXIiLCJpc1NpbXBsZSIsIm1vZGlmaWVyUGF0aHMiLCJwYXRoSGFzTnVtZXJpY0tleXMiLCJleHBlY3RlZFNjYWxhcklzT2JqZWN0IiwiX3NlbGVjdG9yIiwibW9kaWZpZXJQYXRoIiwic3RhcnRzV2l0aCIsIm1hdGNoaW5nRG9jdW1lbnQiLCJFSlNPTiIsImNsb25lIiwiTG9jYWxDb2xsZWN0aW9uIiwiX21vZGlmeSIsImVycm9yIiwibmFtZSIsInNldFByb3BlcnR5RXJyb3IiLCJkb2N1bWVudE1hdGNoZXMiLCJyZXN1bHQiLCJjb21iaW5lSW50b1Byb2plY3Rpb24iLCJwcm9qZWN0aW9uIiwic2VsZWN0b3JQYXRocyIsImluY2x1ZGVzIiwiY29tYmluZUltcG9ydGFudFBhdGhzSW50b1Byb2plY3Rpb24iLCJfbWF0Y2hpbmdEb2N1bWVudCIsInVuZGVmaW5lZCIsImZhbGxiYWNrIiwidmFsdWVTZWxlY3RvciIsIiRlcSIsIiRpbiIsIm1hdGNoZXIiLCJwbGFjZWhvbGRlciIsImZpbmQiLCJvbmx5Q29udGFpbnNLZXlzIiwibG93ZXJCb3VuZCIsIkluZmluaXR5IiwidXBwZXJCb3VuZCIsImZvckVhY2giLCJvcCIsImNhbGwiLCJtaWRkbGUiLCJ4IiwiU29ydGVyIiwiX3NlbGVjdG9yRm9yQWZmZWN0ZWRCeU1vZGlmaWVyIiwiZGV0YWlscyIsInRyZWUiLCJub2RlIiwiZnVsbFBhdGgiLCJtZXJnZWRQcm9qZWN0aW9uIiwidHJlZVRvUGF0aHMiLCJpbmNsdWRpbmciLCJtZXJnZWRFeGNsUHJvamVjdGlvbiIsImdldFBhdGhzIiwic2VsZWN0b3IiLCJfcGF0aHMiLCJvYmoiLCJldmVyeSIsImsiLCJwcmVmaXgiLCJhcmd1bWVudHMiLCJrZXkiLCJ2YWx1ZSIsImV4cG9ydCIsIkVMRU1FTlRfT1BFUkFUT1JTIiwiY29tcGlsZURvY3VtZW50U2VsZWN0b3IiLCJlcXVhbGl0eUVsZW1lbnRNYXRjaGVyIiwiZXhwYW5kQXJyYXlzSW5CcmFuY2hlcyIsImlzSW5kZXhhYmxlIiwibWFrZUxvb2t1cEZ1bmN0aW9uIiwibm90aGluZ01hdGNoZXIiLCJwb3B1bGF0ZURvY3VtZW50V2l0aFF1ZXJ5RmllbGRzIiwicmVnZXhwRWxlbWVudE1hdGNoZXIiLCJkZWZhdWx0IiwiaGFzT3duUHJvcGVydHkiLCIkbHQiLCJtYWtlSW5lcXVhbGl0eSIsImNtcFZhbHVlIiwiJGd0IiwiJGx0ZSIsIiRndGUiLCIkbW9kIiwiY29tcGlsZUVsZW1lbnRTZWxlY3RvciIsIm9wZXJhbmQiLCJBcnJheSIsImlzQXJyYXkiLCJFcnJvciIsImRpdmlzb3IiLCJyZW1haW5kZXIiLCJlbGVtZW50TWF0Y2hlcnMiLCJvcHRpb24iLCJSZWdFeHAiLCIkc2l6ZSIsImRvbnRFeHBhbmRMZWFmQXJyYXlzIiwiJHR5cGUiLCJkb250SW5jbHVkZUxlYWZBcnJheXMiLCJvcGVyYW5kQWxpYXNNYXAiLCJfZiIsIl90eXBlIiwiJGJpdHNBbGxTZXQiLCJtYXNrIiwiZ2V0T3BlcmFuZEJpdG1hc2siLCJiaXRtYXNrIiwiZ2V0VmFsdWVCaXRtYXNrIiwiYnl0ZSIsIiRiaXRzQW55U2V0IiwiJGJpdHNBbGxDbGVhciIsIiRiaXRzQW55Q2xlYXIiLCIkcmVnZXgiLCJyZWdleHAiLCIkb3B0aW9ucyIsInRlc3QiLCJzb3VyY2UiLCIkZWxlbU1hdGNoIiwiX2lzUGxhaW5PYmplY3QiLCJpc0RvY01hdGNoZXIiLCJMT0dJQ0FMX09QRVJBVE9SUyIsInJlZHVjZSIsImEiLCJiIiwic3ViTWF0Y2hlciIsImluRWxlbU1hdGNoIiwiY29tcGlsZVZhbHVlU2VsZWN0b3IiLCJhcnJheUVsZW1lbnQiLCJhcmciLCJkb250SXRlcmF0ZSIsIiRhbmQiLCJzdWJTZWxlY3RvciIsImFuZERvY3VtZW50TWF0Y2hlcnMiLCJjb21waWxlQXJyYXlPZkRvY3VtZW50U2VsZWN0b3JzIiwiJG9yIiwibWF0Y2hlcnMiLCJkb2MiLCJmbiIsIiRub3IiLCIkd2hlcmUiLCJzZWxlY3RvclZhbHVlIiwiX3JlY29yZFBhdGhVc2VkIiwiX2hhc1doZXJlIiwiRnVuY3Rpb24iLCIkY29tbWVudCIsIlZBTFVFX09QRVJBVE9SUyIsImNvbnZlcnRFbGVtZW50TWF0Y2hlclRvQnJhbmNoZWRNYXRjaGVyIiwiJG5vdCIsImludmVydEJyYW5jaGVkTWF0Y2hlciIsIiRuZSIsIiRuaW4iLCIkZXhpc3RzIiwiZXhpc3RzIiwiZXZlcnl0aGluZ01hdGNoZXIiLCIkbWF4RGlzdGFuY2UiLCIkbmVhciIsIiRhbGwiLCJicmFuY2hlZE1hdGNoZXJzIiwiY3JpdGVyaW9uIiwiYW5kQnJhbmNoZWRNYXRjaGVycyIsImlzUm9vdCIsIl9oYXNHZW9RdWVyeSIsIm1heERpc3RhbmNlIiwicG9pbnQiLCJkaXN0YW5jZSIsIiRnZW9tZXRyeSIsInR5cGUiLCJHZW9KU09OIiwicG9pbnREaXN0YW5jZSIsImNvb3JkaW5hdGVzIiwicG9pbnRUb0FycmF5IiwiZ2VvbWV0cnlXaXRoaW5SYWRpdXMiLCJkaXN0YW5jZUNvb3JkaW5hdGVQYWlycyIsImJyYW5jaGVkVmFsdWVzIiwiYnJhbmNoIiwiY3VyRGlzdGFuY2UiLCJfaXNVcGRhdGUiLCJhcnJheUluZGljZXMiLCJhbmRTb21lTWF0Y2hlcnMiLCJzdWJNYXRjaGVycyIsImRvY09yQnJhbmNoZXMiLCJtYXRjaCIsInN1YlJlc3VsdCIsInNlbGVjdG9ycyIsImRvY1NlbGVjdG9yIiwib3B0aW9ucyIsImRvY01hdGNoZXJzIiwic3Vic3RyIiwiX2lzU2ltcGxlIiwibG9va1VwQnlJbmRleCIsInZhbHVlTWF0Y2hlciIsIkJvb2xlYW4iLCJvcGVyYXRvckJyYW5jaGVkTWF0Y2hlciIsImVsZW1lbnRNYXRjaGVyIiwiYnJhbmNoZXMiLCJleHBhbmRlZCIsImVsZW1lbnQiLCJtYXRjaGVkIiwicG9pbnRBIiwicG9pbnRCIiwiTWF0aCIsImh5cG90IiwiZWxlbWVudFNlbGVjdG9yIiwiX2VxdWFsIiwiZG9jT3JCcmFuY2hlZFZhbHVlcyIsInNraXBUaGVBcnJheXMiLCJicmFuY2hlc091dCIsInRoaXNJc0FycmF5IiwicHVzaCIsIk51bWJlciIsImlzSW50ZWdlciIsIlVpbnQ4QXJyYXkiLCJJbnQzMkFycmF5IiwiYnVmZmVyIiwiaXNCaW5hcnkiLCJBcnJheUJ1ZmZlciIsIm1heCIsInZpZXciLCJpc1NhZmVJbnRlZ2VyIiwiVWludDMyQXJyYXkiLCJCWVRFU19QRVJfRUxFTUVOVCIsImluc2VydEludG9Eb2N1bWVudCIsImRvY3VtZW50IiwiZXhpc3RpbmdLZXkiLCJpbmRleE9mIiwiYnJhbmNoZWRNYXRjaGVyIiwiYnJhbmNoVmFsdWVzIiwicyIsImluY29uc2lzdGVudE9LIiwidGhlc2VBcmVPcGVyYXRvcnMiLCJzZWxLZXkiLCJ0aGlzSXNPcGVyYXRvciIsIkpTT04iLCJzdHJpbmdpZnkiLCJjbXBWYWx1ZUNvbXBhcmF0b3IiLCJvcGVyYW5kVHlwZSIsIl9jbXAiLCJwYXJ0cyIsImZpcnN0UGFydCIsImxvb2t1cFJlc3QiLCJzbGljZSIsImJ1aWxkUmVzdWx0IiwiZmlyc3RMZXZlbCIsImFwcGVuZFRvUmVzdWx0IiwibW9yZSIsImZvclNvcnQiLCJhcnJheUluZGV4IiwiTWluaW1vbmdvVGVzdCIsIk1pbmltb25nb0Vycm9yIiwibWVzc2FnZSIsImZpZWxkIiwib3BlcmF0b3JNYXRjaGVycyIsIm9wZXJhdG9yIiwic2ltcGxlUmFuZ2UiLCJzaW1wbGVFcXVhbGl0eSIsInNpbXBsZUluY2x1c2lvbiIsIm5ld0xlYWZGbiIsImNvbmZsaWN0Rm4iLCJyb290IiwicGF0aEFycmF5Iiwic3VjY2VzcyIsImxhc3RLZXkiLCJ5IiwicG9wdWxhdGVEb2N1bWVudFdpdGhLZXlWYWx1ZSIsImdldFByb3RvdHlwZU9mIiwicG9wdWxhdGVEb2N1bWVudFdpdGhPYmplY3QiLCJ1bnByZWZpeGVkS2V5cyIsInZhbGlkYXRlT2JqZWN0Iiwib2JqZWN0IiwicXVlcnkiLCJfc2VsZWN0b3JJc0lkIiwiZmllbGRzIiwiZmllbGRzS2V5cyIsInNvcnQiLCJfaWQiLCJrZXlQYXRoIiwicnVsZSIsInByb2plY3Rpb25SdWxlc1RyZWUiLCJjdXJyZW50UGF0aCIsImFub3RoZXJQYXRoIiwidG9TdHJpbmciLCJsYXN0SW5kZXgiLCJ2YWxpZGF0ZUtleUluUGF0aCIsImdldEFzeW5jTWV0aG9kTmFtZSIsIkFTWU5DX0NPTExFQ1RJT05fTUVUSE9EUyIsIkFTWU5DX0NVUlNPUl9NRVRIT0RTIiwibWV0aG9kIiwicmVwbGFjZSIsIkN1cnNvciIsImNvbnN0cnVjdG9yIiwiY29sbGVjdGlvbiIsInNvcnRlciIsIl9zZWxlY3RvcklzSWRQZXJoYXBzQXNPYmplY3QiLCJfc2VsZWN0b3JJZCIsImhhc0dlb1F1ZXJ5Iiwic2tpcCIsImxpbWl0IiwiX3Byb2plY3Rpb25GbiIsIl9jb21waWxlUHJvamVjdGlvbiIsIl90cmFuc2Zvcm0iLCJ3cmFwVHJhbnNmb3JtIiwidHJhbnNmb3JtIiwiVHJhY2tlciIsInJlYWN0aXZlIiwiY291bnQiLCJfZGVwZW5kIiwiYWRkZWQiLCJyZW1vdmVkIiwiX2dldFJhd09iamVjdHMiLCJvcmRlcmVkIiwiZmV0Y2giLCJTeW1ib2wiLCJpdGVyYXRvciIsImFkZGVkQmVmb3JlIiwiY2hhbmdlZCIsIm1vdmVkQmVmb3JlIiwiaW5kZXgiLCJvYmplY3RzIiwibmV4dCIsImRvbmUiLCJhc3luY0l0ZXJhdG9yIiwic3luY1Jlc3VsdCIsIlByb21pc2UiLCJhc3luY0FwcGx5IiwicmVzb2x2ZSIsImNhbGxiYWNrIiwidGhpc0FyZyIsImdldFRyYW5zZm9ybSIsIm9ic2VydmUiLCJfb2JzZXJ2ZUZyb21PYnNlcnZlQ2hhbmdlcyIsIm9ic2VydmVDaGFuZ2VzIiwiX29ic2VydmVDaGFuZ2VzQ2FsbGJhY2tzQXJlT3JkZXJlZCIsIl9hbGxvd191bm9yZGVyZWQiLCJkaXN0YW5jZXMiLCJfSWRNYXAiLCJjdXJzb3IiLCJkaXJ0eSIsInByb2plY3Rpb25GbiIsInJlc3VsdHNTbmFwc2hvdCIsInFpZCIsIm5leHRfcWlkIiwicXVlcmllcyIsInJlc3VsdHMiLCJwYXVzZWQiLCJ3cmFwQ2FsbGJhY2siLCJzZWxmIiwiYXJncyIsIl9vYnNlcnZlUXVldWUiLCJxdWV1ZVRhc2siLCJhcHBseSIsIl9zdXBwcmVzc19pbml0aWFsIiwiaGFuZGxlIiwiT2JzZXJ2ZUhhbmRsZSIsInN0b3AiLCJhY3RpdmUiLCJvbkludmFsaWRhdGUiLCJkcmFpbiIsImNoYW5nZXJzIiwiZGVwZW5kZW5jeSIsIkRlcGVuZGVuY3kiLCJub3RpZnkiLCJiaW5kIiwiZGVwZW5kIiwiX2dldENvbGxlY3Rpb25OYW1lIiwiYXBwbHlTa2lwTGltaXQiLCJzZWxlY3RlZERvYyIsIl9kb2NzIiwiZ2V0Iiwic2V0IiwiY2xlYXIiLCJpZCIsIm1hdGNoUmVzdWx0IiwiZ2V0Q29tcGFyYXRvciIsIl9wdWJsaXNoQ3Vyc29yIiwic3Vic2NyaXB0aW9uIiwiUGFja2FnZSIsIm1vbmdvIiwiTW9uZ28iLCJDb2xsZWN0aW9uIiwiYXN5bmNOYW1lIiwiaXNDYWxsZWRGcm9tQXN5bmMiLCJfbGVuIiwiX2tleSIsInJlamVjdCIsIl9vYmplY3RTcHJlYWQiLCJNZXRlb3IiLCJfU3luY2hyb25vdXNRdWV1ZSIsImNyZWF0ZSIsIl9zYXZlZE9yaWdpbmFscyIsImNvdW50RG9jdW1lbnRzIiwiY291bnRBc3luYyIsImVzdGltYXRlZERvY3VtZW50Q291bnQiLCJmaW5kT25lIiwiaW5zZXJ0IiwiYXNzZXJ0SGFzVmFsaWRGaWVsZE5hbWVzIiwiX3VzZU9JRCIsIk1vbmdvSUQiLCJPYmplY3RJRCIsIlJhbmRvbSIsImhhcyIsIl9zYXZlT3JpZ2luYWwiLCJxdWVyaWVzVG9SZWNvbXB1dGUiLCJfaW5zZXJ0SW5SZXN1bHRzIiwiX3JlY29tcHV0ZVJlc3VsdHMiLCJkZWZlciIsInBhdXNlT2JzZXJ2ZXJzIiwicmVtb3ZlIiwiZXF1YWxzIiwic2l6ZSIsIl9lYWNoUG9zc2libHlNYXRjaGluZ0RvYyIsInF1ZXJ5UmVtb3ZlIiwicmVtb3ZlSWQiLCJyZW1vdmVEb2MiLCJfcmVtb3ZlRnJvbVJlc3VsdHMiLCJyZXN1bWVPYnNlcnZlcnMiLCJfZGlmZlF1ZXJ5Q2hhbmdlcyIsInJldHJpZXZlT3JpZ2luYWxzIiwib3JpZ2luYWxzIiwic2F2ZU9yaWdpbmFscyIsInVwZGF0ZSIsInFpZFRvT3JpZ2luYWxSZXN1bHRzIiwiZG9jTWFwIiwiaWRzTWF0Y2hlZCIsIl9pZHNNYXRjaGVkQnlTZWxlY3RvciIsIm1lbW9pemVkQ2xvbmVJZk5lZWRlZCIsImRvY1RvTWVtb2l6ZSIsInJlY29tcHV0ZVFpZHMiLCJ1cGRhdGVDb3VudCIsInF1ZXJ5UmVzdWx0IiwiX21vZGlmeUFuZE5vdGlmeSIsIm11bHRpIiwiaW5zZXJ0ZWRJZCIsInVwc2VydCIsIl9jcmVhdGVVcHNlcnREb2N1bWVudCIsIl9yZXR1cm5PYmplY3QiLCJudW1iZXJBZmZlY3RlZCIsInNwZWNpZmljSWRzIiwibWF0Y2hlZF9iZWZvcmUiLCJvbGRfZG9jIiwiYWZ0ZXJNYXRjaCIsImFmdGVyIiwiYmVmb3JlIiwiX3VwZGF0ZUluUmVzdWx0cyIsIm9sZFJlc3VsdHMiLCJfQ2FjaGluZ0NoYW5nZU9ic2VydmVyIiwib3JkZXJlZEZyb21DYWxsYmFja3MiLCJjYWxsYmFja3MiLCJkb2NzIiwiT3JkZXJlZERpY3QiLCJpZFN0cmluZ2lmeSIsImFwcGx5Q2hhbmdlIiwicHV0QmVmb3JlIiwibW92ZUJlZm9yZSIsIkRpZmZTZXF1ZW5jZSIsImFwcGx5Q2hhbmdlcyIsIklkTWFwIiwiaWRQYXJzZSIsIl9fd3JhcHBlZFRyYW5zZm9ybV9fIiwid3JhcHBlZCIsInRyYW5zZm9ybWVkIiwibm9ucmVhY3RpdmUiLCJfYmluYXJ5U2VhcmNoIiwiY21wIiwiYXJyYXkiLCJmaXJzdCIsInJhbmdlIiwiaGFsZlJhbmdlIiwiZmxvb3IiLCJfY2hlY2tTdXBwb3J0ZWRQcm9qZWN0aW9uIiwiX2lkUHJvamVjdGlvbiIsInJ1bGVUcmVlIiwic3ViZG9jIiwic2VsZWN0b3JEb2N1bWVudCIsImlzTW9kaWZ5IiwiX2lzTW9kaWZpY2F0aW9uTW9kIiwibmV3RG9jIiwiaXNJbnNlcnQiLCJyZXBsYWNlbWVudCIsIl9kaWZmT2JqZWN0cyIsImxlZnQiLCJyaWdodCIsImRpZmZPYmplY3RzIiwibmV3UmVzdWx0cyIsIm9ic2VydmVyIiwiZGlmZlF1ZXJ5Q2hhbmdlcyIsIl9kaWZmUXVlcnlPcmRlcmVkQ2hhbmdlcyIsImRpZmZRdWVyeU9yZGVyZWRDaGFuZ2VzIiwiX2RpZmZRdWVyeVVub3JkZXJlZENoYW5nZXMiLCJkaWZmUXVlcnlVbm9yZGVyZWRDaGFuZ2VzIiwiX2ZpbmRJbk9yZGVyZWRSZXN1bHRzIiwic3ViSWRzIiwiX2luc2VydEluU29ydGVkTGlzdCIsInNwbGljZSIsImlzUmVwbGFjZSIsImlzTW9kaWZpZXIiLCJzZXRPbkluc2VydCIsIm1vZEZ1bmMiLCJNT0RJRklFUlMiLCJrZXlwYXRoIiwia2V5cGFydHMiLCJ0YXJnZXQiLCJmaW5kTW9kVGFyZ2V0IiwiZm9yYmlkQXJyYXkiLCJub0NyZWF0ZSIsIk5PX0NSRUFURV9NT0RJRklFUlMiLCJwb3AiLCJvYnNlcnZlQ2FsbGJhY2tzIiwic3VwcHJlc3NlZCIsIm9ic2VydmVDaGFuZ2VzQ2FsbGJhY2tzIiwiX29ic2VydmVDYWxsYmFja3NBcmVPcmRlcmVkIiwiaW5kaWNlcyIsIl9ub19pbmRpY2VzIiwiYWRkZWRBdCIsImNoYW5nZWRBdCIsIm9sZERvYyIsIm1vdmVkVG8iLCJmcm9tIiwidG8iLCJyZW1vdmVkQXQiLCJjaGFuZ2VPYnNlcnZlciIsIl9mcm9tT2JzZXJ2ZSIsIm5vbk11dGF0aW5nQ2FsbGJhY2tzIiwiY2hhbmdlZEZpZWxkcyIsIm1ha2VDaGFuZ2VkRmllbGRzIiwib2xkX2lkeCIsIm5ld19pZHgiLCIkY3VycmVudERhdGUiLCJEYXRlIiwiJGluYyIsIiRtaW4iLCIkbWF4IiwiJG11bCIsIiRyZW5hbWUiLCJ0YXJnZXQyIiwiJHNldE9uSW5zZXJ0IiwiJHB1c2giLCIkZWFjaCIsInRvUHVzaCIsInBvc2l0aW9uIiwiJHBvc2l0aW9uIiwiJHNsaWNlIiwic29ydEZ1bmN0aW9uIiwiJHNvcnQiLCJzcGxpY2VBcmd1bWVudHMiLCIkcHVzaEFsbCIsIiRhZGRUb1NldCIsImlzRWFjaCIsInZhbHVlcyIsInRvQWRkIiwiJHBvcCIsInRvUG9wIiwiJHB1bGwiLCJ0b1B1bGwiLCJvdXQiLCIkcHVsbEFsbCIsIiRiaXQiLCIkdiIsImludmFsaWRDaGFyTXNnIiwiJCIsImFzc2VydElzVmFsaWRGaWVsZE5hbWUiLCJ1c2VkQXJyYXlJbmRleCIsImxhc3QiLCJrZXlwYXJ0IiwicGFyc2VJbnQiLCJEZWNpbWFsIiwiX1BhY2thZ2UkbW9uZ29EZWNpbWEiLCJEZWNpbWFsU3R1YiIsImlzVXBkYXRlIiwiX2RvY01hdGNoZXIiLCJfY29tcGlsZVNlbGVjdG9yIiwiaGFzV2hlcmUiLCJrZXlPcmRlclNlbnNpdGl2ZSIsIl90eXBlb3JkZXIiLCJ0IiwidGEiLCJ0YiIsIm9hIiwib2IiLCJ0b0hleFN0cmluZyIsImlzTmFOIiwiZ2V0VGltZSIsIm1pbnVzIiwidG9OdW1iZXIiLCJ0b0FycmF5IiwiTG9jYWxDb2xsZWN0aW9uXyIsInNwZWMiLCJfc29ydFNwZWNQYXJ0cyIsIl9zb3J0RnVuY3Rpb24iLCJhZGRTcGVjUGFydCIsImFzY2VuZGluZyIsImNoYXJBdCIsImxvb2t1cCIsIl9rZXlDb21wYXJhdG9yIiwiY29tcG9zZUNvbXBhcmF0b3JzIiwiX2tleUZpZWxkQ29tcGFyYXRvciIsIl9nZXRCYXNlQ29tcGFyYXRvciIsIl9jb21wYXJlS2V5cyIsImtleTEiLCJrZXkyIiwiX2dlbmVyYXRlS2V5c0Zyb21Eb2MiLCJjYiIsInBhdGhGcm9tSW5kaWNlcyIsImtub3duUGF0aHMiLCJ2YWx1ZXNCeUluZGV4QW5kUGF0aCIsInVzZWRQYXRocyIsInNvbGVLZXkiLCJkb2MxIiwiZG9jMiIsIl9nZXRNaW5LZXlGcm9tRG9jIiwibWluS2V5IiwiaW52ZXJ0IiwiY29tcGFyZSIsImNvbXBhcmF0b3JBcnJheSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBQSxNQUFNLENBQUNDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQztBQUFDLElBQUlDLE1BQU0sRUFBQ0MsWUFBWSxFQUFDQyxnQkFBZ0IsRUFBQ0MsV0FBVyxFQUFDQyxp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L3BhY2thZ2VzL21pbmltb25nby5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAnLi9taW5pbW9uZ29fY29tbW9uLmpzJztcbmltcG9ydCB7XG4gIGhhc093bixcbiAgaXNOdW1lcmljS2V5LFxuICBpc09wZXJhdG9yT2JqZWN0LFxuICBwYXRoc1RvVHJlZSxcbiAgcHJvamVjdGlvbkRldGFpbHMsXG59IGZyb20gJy4vY29tbW9uLmpzJztcblxuTWluaW1vbmdvLl9wYXRoc0VsaWRpbmdOdW1lcmljS2V5cyA9IHBhdGhzID0+IHBhdGhzLm1hcChwYXRoID0+XG4gIHBhdGguc3BsaXQoJy4nKS5maWx0ZXIocGFydCA9PiAhaXNOdW1lcmljS2V5KHBhcnQpKS5qb2luKCcuJylcbik7XG5cbi8vIFJldHVybnMgdHJ1ZSBpZiB0aGUgbW9kaWZpZXIgYXBwbGllZCB0byBzb21lIGRvY3VtZW50IG1heSBjaGFuZ2UgdGhlIHJlc3VsdFxuLy8gb2YgbWF0Y2hpbmcgdGhlIGRvY3VtZW50IGJ5IHNlbGVjdG9yXG4vLyBUaGUgbW9kaWZpZXIgaXMgYWx3YXlzIGluIGEgZm9ybSBvZiBPYmplY3Q6XG4vLyAgLSAkc2V0XG4vLyAgICAtICdhLmIuMjIueic6IHZhbHVlXG4vLyAgICAtICdmb28uYmFyJzogNDJcbi8vICAtICR1bnNldFxuLy8gICAgLSAnYWJjLmQnOiAxXG5NaW5pbW9uZ28uTWF0Y2hlci5wcm90b3R5cGUuYWZmZWN0ZWRCeU1vZGlmaWVyID0gZnVuY3Rpb24obW9kaWZpZXIpIHtcbiAgLy8gc2FmZSBjaGVjayBmb3IgJHNldC8kdW5zZXQgYmVpbmcgb2JqZWN0c1xuICBtb2RpZmllciA9IE9iamVjdC5hc3NpZ24oeyRzZXQ6IHt9LCAkdW5zZXQ6IHt9fSwgbW9kaWZpZXIpO1xuXG4gIGNvbnN0IG1lYW5pbmdmdWxQYXRocyA9IHRoaXMuX2dldFBhdGhzKCk7XG4gIGNvbnN0IG1vZGlmaWVkUGF0aHMgPSBbXS5jb25jYXQoXG4gICAgT2JqZWN0LmtleXMobW9kaWZpZXIuJHNldCksXG4gICAgT2JqZWN0LmtleXMobW9kaWZpZXIuJHVuc2V0KVxuICApO1xuXG4gIHJldHVybiBtb2RpZmllZFBhdGhzLnNvbWUocGF0aCA9PiB7XG4gICAgY29uc3QgbW9kID0gcGF0aC5zcGxpdCgnLicpO1xuXG4gICAgcmV0dXJuIG1lYW5pbmdmdWxQYXRocy5zb21lKG1lYW5pbmdmdWxQYXRoID0+IHtcbiAgICAgIGNvbnN0IHNlbCA9IG1lYW5pbmdmdWxQYXRoLnNwbGl0KCcuJyk7XG5cbiAgICAgIGxldCBpID0gMCwgaiA9IDA7XG5cbiAgICAgIHdoaWxlIChpIDwgc2VsLmxlbmd0aCAmJiBqIDwgbW9kLmxlbmd0aCkge1xuICAgICAgICBpZiAoaXNOdW1lcmljS2V5KHNlbFtpXSkgJiYgaXNOdW1lcmljS2V5KG1vZFtqXSkpIHtcbiAgICAgICAgICAvLyBmb28uNC5iYXIgc2VsZWN0b3IgYWZmZWN0ZWQgYnkgZm9vLjQgbW9kaWZpZXJcbiAgICAgICAgICAvLyBmb28uMy5iYXIgc2VsZWN0b3IgdW5hZmZlY3RlZCBieSBmb28uNCBtb2RpZmllclxuICAgICAgICAgIGlmIChzZWxbaV0gPT09IG1vZFtqXSkge1xuICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgaisrO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGlzTnVtZXJpY0tleShzZWxbaV0pKSB7XG4gICAgICAgICAgLy8gZm9vLjQuYmFyIHNlbGVjdG9yIHVuYWZmZWN0ZWQgYnkgZm9vLmJhciBtb2RpZmllclxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBlbHNlIGlmIChpc051bWVyaWNLZXkobW9kW2pdKSkge1xuICAgICAgICAgIGorKztcbiAgICAgICAgfSBlbHNlIGlmIChzZWxbaV0gPT09IG1vZFtqXSkge1xuICAgICAgICAgIGkrKztcbiAgICAgICAgICBqKys7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIE9uZSBpcyBhIHByZWZpeCBvZiBhbm90aGVyLCB0YWtpbmcgbnVtZXJpYyBmaWVsZHMgaW50byBhY2NvdW50XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgfSk7XG59O1xuXG4vLyBAcGFyYW0gbW9kaWZpZXIgLSBPYmplY3Q6IE1vbmdvREItc3R5bGVkIG1vZGlmaWVyIHdpdGggYCRzZXRgcyBhbmQgYCR1bnNldHNgXG4vLyAgICAgICAgICAgICAgICAgICAgICAgICAgIG9ubHkuIChhc3N1bWVkIHRvIGNvbWUgZnJvbSBvcGxvZylcbi8vIEByZXR1cm5zIC0gQm9vbGVhbjogaWYgYWZ0ZXIgYXBwbHlpbmcgdGhlIG1vZGlmaWVyLCBzZWxlY3RvciBjYW4gc3RhcnRcbi8vICAgICAgICAgICAgICAgICAgICAgYWNjZXB0aW5nIHRoZSBtb2RpZmllZCB2YWx1ZS5cbi8vIE5PVEU6IGFzc3VtZXMgdGhhdCBkb2N1bWVudCBhZmZlY3RlZCBieSBtb2RpZmllciBkaWRuJ3QgbWF0Y2ggdGhpcyBNYXRjaGVyXG4vLyBiZWZvcmUsIHNvIGlmIG1vZGlmaWVyIGNhbid0IGNvbnZpbmNlIHNlbGVjdG9yIGluIGEgcG9zaXRpdmUgY2hhbmdlIGl0IHdvdWxkXG4vLyBzdGF5ICdmYWxzZScuXG4vLyBDdXJyZW50bHkgZG9lc24ndCBzdXBwb3J0ICQtb3BlcmF0b3JzIGFuZCBudW1lcmljIGluZGljZXMgcHJlY2lzZWx5LlxuTWluaW1vbmdvLk1hdGNoZXIucHJvdG90eXBlLmNhbkJlY29tZVRydWVCeU1vZGlmaWVyID0gZnVuY3Rpb24obW9kaWZpZXIpIHtcbiAgaWYgKCF0aGlzLmFmZmVjdGVkQnlNb2RpZmllcihtb2RpZmllcikpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpZiAoIXRoaXMuaXNTaW1wbGUoKSkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgbW9kaWZpZXIgPSBPYmplY3QuYXNzaWduKHskc2V0OiB7fSwgJHVuc2V0OiB7fX0sIG1vZGlmaWVyKTtcblxuICBjb25zdCBtb2RpZmllclBhdGhzID0gW10uY29uY2F0KFxuICAgIE9iamVjdC5rZXlzKG1vZGlmaWVyLiRzZXQpLFxuICAgIE9iamVjdC5rZXlzKG1vZGlmaWVyLiR1bnNldClcbiAgKTtcblxuICBpZiAodGhpcy5fZ2V0UGF0aHMoKS5zb21lKHBhdGhIYXNOdW1lcmljS2V5cykgfHxcbiAgICAgIG1vZGlmaWVyUGF0aHMuc29tZShwYXRoSGFzTnVtZXJpY0tleXMpKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvLyBjaGVjayBpZiB0aGVyZSBpcyBhICRzZXQgb3IgJHVuc2V0IHRoYXQgaW5kaWNhdGVzIHNvbWV0aGluZyBpcyBhblxuICAvLyBvYmplY3QgcmF0aGVyIHRoYW4gYSBzY2FsYXIgaW4gdGhlIGFjdHVhbCBvYmplY3Qgd2hlcmUgd2Ugc2F3ICQtb3BlcmF0b3JcbiAgLy8gTk9URTogaXQgaXMgY29ycmVjdCBzaW5jZSB3ZSBhbGxvdyBvbmx5IHNjYWxhcnMgaW4gJC1vcGVyYXRvcnNcbiAgLy8gRXhhbXBsZTogZm9yIHNlbGVjdG9yIHsnYS5iJzogeyRndDogNX19IHRoZSBtb2RpZmllciB7J2EuYi5jJzo3fSB3b3VsZFxuICAvLyBkZWZpbml0ZWx5IHNldCB0aGUgcmVzdWx0IHRvIGZhbHNlIGFzICdhLmInIGFwcGVhcnMgdG8gYmUgYW4gb2JqZWN0LlxuICBjb25zdCBleHBlY3RlZFNjYWxhcklzT2JqZWN0ID0gT2JqZWN0LmtleXModGhpcy5fc2VsZWN0b3IpLnNvbWUocGF0aCA9PiB7XG4gICAgaWYgKCFpc09wZXJhdG9yT2JqZWN0KHRoaXMuX3NlbGVjdG9yW3BhdGhdKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiBtb2RpZmllclBhdGhzLnNvbWUobW9kaWZpZXJQYXRoID0+XG4gICAgICBtb2RpZmllclBhdGguc3RhcnRzV2l0aChgJHtwYXRofS5gKVxuICAgICk7XG4gIH0pO1xuXG4gIGlmIChleHBlY3RlZFNjYWxhcklzT2JqZWN0KSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gU2VlIGlmIHdlIGNhbiBhcHBseSB0aGUgbW9kaWZpZXIgb24gdGhlIGlkZWFsbHkgbWF0Y2hpbmcgb2JqZWN0LiBJZiBpdFxuICAvLyBzdGlsbCBtYXRjaGVzIHRoZSBzZWxlY3RvciwgdGhlbiB0aGUgbW9kaWZpZXIgY291bGQgaGF2ZSB0dXJuZWQgdGhlIHJlYWxcbiAgLy8gb2JqZWN0IGluIHRoZSBkYXRhYmFzZSBpbnRvIHNvbWV0aGluZyBtYXRjaGluZy5cbiAgY29uc3QgbWF0Y2hpbmdEb2N1bWVudCA9IEVKU09OLmNsb25lKHRoaXMubWF0Y2hpbmdEb2N1bWVudCgpKTtcblxuICAvLyBUaGUgc2VsZWN0b3IgaXMgdG9vIGNvbXBsZXgsIGFueXRoaW5nIGNhbiBoYXBwZW4uXG4gIGlmIChtYXRjaGluZ0RvY3VtZW50ID09PSBudWxsKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICB0cnkge1xuICAgIExvY2FsQ29sbGVjdGlvbi5fbW9kaWZ5KG1hdGNoaW5nRG9jdW1lbnQsIG1vZGlmaWVyKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAvLyBDb3VsZG4ndCBzZXQgYSBwcm9wZXJ0eSBvbiBhIGZpZWxkIHdoaWNoIGlzIGEgc2NhbGFyIG9yIG51bGwgaW4gdGhlXG4gICAgLy8gc2VsZWN0b3IuXG4gICAgLy8gRXhhbXBsZTpcbiAgICAvLyByZWFsIGRvY3VtZW50OiB7ICdhLmInOiAzIH1cbiAgICAvLyBzZWxlY3RvcjogeyAnYSc6IDEyIH1cbiAgICAvLyBjb252ZXJ0ZWQgc2VsZWN0b3IgKGlkZWFsIGRvY3VtZW50KTogeyAnYSc6IDEyIH1cbiAgICAvLyBtb2RpZmllcjogeyAkc2V0OiB7ICdhLmInOiA0IH0gfVxuICAgIC8vIFdlIGRvbid0IGtub3cgd2hhdCByZWFsIGRvY3VtZW50IHdhcyBsaWtlIGJ1dCBmcm9tIHRoZSBlcnJvciByYWlzZWQgYnlcbiAgICAvLyAkc2V0IG9uIGEgc2NhbGFyIGZpZWxkIHdlIGNhbiByZWFzb24gdGhhdCB0aGUgc3RydWN0dXJlIG9mIHJlYWwgZG9jdW1lbnRcbiAgICAvLyBpcyBjb21wbGV0ZWx5IGRpZmZlcmVudC5cbiAgICBpZiAoZXJyb3IubmFtZSA9PT0gJ01pbmltb25nb0Vycm9yJyAmJiBlcnJvci5zZXRQcm9wZXJ0eUVycm9yKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cblxuICByZXR1cm4gdGhpcy5kb2N1bWVudE1hdGNoZXMobWF0Y2hpbmdEb2N1bWVudCkucmVzdWx0O1xufTtcblxuLy8gS25vd3MgaG93IHRvIGNvbWJpbmUgYSBtb25nbyBzZWxlY3RvciBhbmQgYSBmaWVsZHMgcHJvamVjdGlvbiB0byBhIG5ldyBmaWVsZHNcbi8vIHByb2plY3Rpb24gdGFraW5nIGludG8gYWNjb3VudCBhY3RpdmUgZmllbGRzIGZyb20gdGhlIHBhc3NlZCBzZWxlY3Rvci5cbi8vIEByZXR1cm5zIE9iamVjdCAtIHByb2plY3Rpb24gb2JqZWN0IChzYW1lIGFzIGZpZWxkcyBvcHRpb24gb2YgbW9uZ28gY3Vyc29yKVxuTWluaW1vbmdvLk1hdGNoZXIucHJvdG90eXBlLmNvbWJpbmVJbnRvUHJvamVjdGlvbiA9IGZ1bmN0aW9uKHByb2plY3Rpb24pIHtcbiAgY29uc3Qgc2VsZWN0b3JQYXRocyA9IE1pbmltb25nby5fcGF0aHNFbGlkaW5nTnVtZXJpY0tleXModGhpcy5fZ2V0UGF0aHMoKSk7XG5cbiAgLy8gU3BlY2lhbCBjYXNlIGZvciAkd2hlcmUgb3BlcmF0b3IgaW4gdGhlIHNlbGVjdG9yIC0gcHJvamVjdGlvbiBzaG91bGQgZGVwZW5kXG4gIC8vIG9uIGFsbCBmaWVsZHMgb2YgdGhlIGRvY3VtZW50LiBnZXRTZWxlY3RvclBhdGhzIHJldHVybnMgYSBsaXN0IG9mIHBhdGhzXG4gIC8vIHNlbGVjdG9yIGRlcGVuZHMgb24uIElmIG9uZSBvZiB0aGUgcGF0aHMgaXMgJycgKGVtcHR5IHN0cmluZykgcmVwcmVzZW50aW5nXG4gIC8vIHRoZSByb290IG9yIHRoZSB3aG9sZSBkb2N1bWVudCwgY29tcGxldGUgcHJvamVjdGlvbiBzaG91bGQgYmUgcmV0dXJuZWQuXG4gIGlmIChzZWxlY3RvclBhdGhzLmluY2x1ZGVzKCcnKSkge1xuICAgIHJldHVybiB7fTtcbiAgfVxuXG4gIHJldHVybiBjb21iaW5lSW1wb3J0YW50UGF0aHNJbnRvUHJvamVjdGlvbihzZWxlY3RvclBhdGhzLCBwcm9qZWN0aW9uKTtcbn07XG5cbi8vIFJldHVybnMgYW4gb2JqZWN0IHRoYXQgd291bGQgbWF0Y2ggdGhlIHNlbGVjdG9yIGlmIHBvc3NpYmxlIG9yIG51bGwgaWYgdGhlXG4vLyBzZWxlY3RvciBpcyB0b28gY29tcGxleCBmb3IgdXMgdG8gYW5hbHl6ZVxuLy8geyAnYS5iJzogeyBhbnM6IDQyIH0sICdmb28uYmFyJzogbnVsbCwgJ2Zvby5iYXonOiBcInNvbWV0aGluZ1wiIH1cbi8vID0+IHsgYTogeyBiOiB7IGFuczogNDIgfSB9LCBmb286IHsgYmFyOiBudWxsLCBiYXo6IFwic29tZXRoaW5nXCIgfSB9XG5NaW5pbW9uZ28uTWF0Y2hlci5wcm90b3R5cGUubWF0Y2hpbmdEb2N1bWVudCA9IGZ1bmN0aW9uKCkge1xuICAvLyBjaGVjayBpZiBpdCB3YXMgY29tcHV0ZWQgYmVmb3JlXG4gIGlmICh0aGlzLl9tYXRjaGluZ0RvY3VtZW50ICE9PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gdGhpcy5fbWF0Y2hpbmdEb2N1bWVudDtcbiAgfVxuXG4gIC8vIElmIHRoZSBhbmFseXNpcyBvZiB0aGlzIHNlbGVjdG9yIGlzIHRvbyBoYXJkIGZvciBvdXIgaW1wbGVtZW50YXRpb25cbiAgLy8gZmFsbGJhY2sgdG8gXCJZRVNcIlxuICBsZXQgZmFsbGJhY2sgPSBmYWxzZTtcblxuICB0aGlzLl9tYXRjaGluZ0RvY3VtZW50ID0gcGF0aHNUb1RyZWUoXG4gICAgdGhpcy5fZ2V0UGF0aHMoKSxcbiAgICBwYXRoID0+IHtcbiAgICAgIGNvbnN0IHZhbHVlU2VsZWN0b3IgPSB0aGlzLl9zZWxlY3RvcltwYXRoXTtcblxuICAgICAgaWYgKGlzT3BlcmF0b3JPYmplY3QodmFsdWVTZWxlY3RvcikpIHtcbiAgICAgICAgLy8gaWYgdGhlcmUgaXMgYSBzdHJpY3QgZXF1YWxpdHksIHRoZXJlIGlzIGEgZ29vZFxuICAgICAgICAvLyBjaGFuY2Ugd2UgY2FuIHVzZSBvbmUgb2YgdGhvc2UgYXMgXCJtYXRjaGluZ1wiXG4gICAgICAgIC8vIGR1bW15IHZhbHVlXG4gICAgICAgIGlmICh2YWx1ZVNlbGVjdG9yLiRlcSkge1xuICAgICAgICAgIHJldHVybiB2YWx1ZVNlbGVjdG9yLiRlcTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh2YWx1ZVNlbGVjdG9yLiRpbikge1xuICAgICAgICAgIGNvbnN0IG1hdGNoZXIgPSBuZXcgTWluaW1vbmdvLk1hdGNoZXIoe3BsYWNlaG9sZGVyOiB2YWx1ZVNlbGVjdG9yfSk7XG5cbiAgICAgICAgICAvLyBSZXR1cm4gYW55dGhpbmcgZnJvbSAkaW4gdGhhdCBtYXRjaGVzIHRoZSB3aG9sZSBzZWxlY3RvciBmb3IgdGhpc1xuICAgICAgICAgIC8vIHBhdGguIElmIG5vdGhpbmcgbWF0Y2hlcywgcmV0dXJucyBgdW5kZWZpbmVkYCBhcyBub3RoaW5nIGNhbiBtYWtlXG4gICAgICAgICAgLy8gdGhpcyBzZWxlY3RvciBpbnRvIGB0cnVlYC5cbiAgICAgICAgICByZXR1cm4gdmFsdWVTZWxlY3Rvci4kaW4uZmluZChwbGFjZWhvbGRlciA9PlxuICAgICAgICAgICAgbWF0Y2hlci5kb2N1bWVudE1hdGNoZXMoe3BsYWNlaG9sZGVyfSkucmVzdWx0XG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChvbmx5Q29udGFpbnNLZXlzKHZhbHVlU2VsZWN0b3IsIFsnJGd0JywgJyRndGUnLCAnJGx0JywgJyRsdGUnXSkpIHtcbiAgICAgICAgICBsZXQgbG93ZXJCb3VuZCA9IC1JbmZpbml0eTtcbiAgICAgICAgICBsZXQgdXBwZXJCb3VuZCA9IEluZmluaXR5O1xuXG4gICAgICAgICAgWyckbHRlJywgJyRsdCddLmZvckVhY2gob3AgPT4ge1xuICAgICAgICAgICAgaWYgKGhhc093bi5jYWxsKHZhbHVlU2VsZWN0b3IsIG9wKSAmJlxuICAgICAgICAgICAgICAgIHZhbHVlU2VsZWN0b3Jbb3BdIDwgdXBwZXJCb3VuZCkge1xuICAgICAgICAgICAgICB1cHBlckJvdW5kID0gdmFsdWVTZWxlY3RvcltvcF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBbJyRndGUnLCAnJGd0J10uZm9yRWFjaChvcCA9PiB7XG4gICAgICAgICAgICBpZiAoaGFzT3duLmNhbGwodmFsdWVTZWxlY3Rvciwgb3ApICYmXG4gICAgICAgICAgICAgICAgdmFsdWVTZWxlY3RvcltvcF0gPiBsb3dlckJvdW5kKSB7XG4gICAgICAgICAgICAgIGxvd2VyQm91bmQgPSB2YWx1ZVNlbGVjdG9yW29wXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIGNvbnN0IG1pZGRsZSA9IChsb3dlckJvdW5kICsgdXBwZXJCb3VuZCkgLyAyO1xuICAgICAgICAgIGNvbnN0IG1hdGNoZXIgPSBuZXcgTWluaW1vbmdvLk1hdGNoZXIoe3BsYWNlaG9sZGVyOiB2YWx1ZVNlbGVjdG9yfSk7XG5cbiAgICAgICAgICBpZiAoIW1hdGNoZXIuZG9jdW1lbnRNYXRjaGVzKHtwbGFjZWhvbGRlcjogbWlkZGxlfSkucmVzdWx0ICYmXG4gICAgICAgICAgICAgIChtaWRkbGUgPT09IGxvd2VyQm91bmQgfHwgbWlkZGxlID09PSB1cHBlckJvdW5kKSkge1xuICAgICAgICAgICAgZmFsbGJhY2sgPSB0cnVlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiBtaWRkbGU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob25seUNvbnRhaW5zS2V5cyh2YWx1ZVNlbGVjdG9yLCBbJyRuaW4nLCAnJG5lJ10pKSB7XG4gICAgICAgICAgLy8gU2luY2UgdGhpcy5faXNTaW1wbGUgbWFrZXMgc3VyZSAkbmluIGFuZCAkbmUgYXJlIG5vdCBjb21iaW5lZCB3aXRoXG4gICAgICAgICAgLy8gb2JqZWN0cyBvciBhcnJheXMsIHdlIGNhbiBjb25maWRlbnRseSByZXR1cm4gYW4gZW1wdHkgb2JqZWN0IGFzIGl0XG4gICAgICAgICAgLy8gbmV2ZXIgbWF0Y2hlcyBhbnkgc2NhbGFyLlxuICAgICAgICAgIHJldHVybiB7fTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZhbGxiYWNrID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXMuX3NlbGVjdG9yW3BhdGhdO1xuICAgIH0sXG4gICAgeCA9PiB4KTtcblxuICBpZiAoZmFsbGJhY2spIHtcbiAgICB0aGlzLl9tYXRjaGluZ0RvY3VtZW50ID0gbnVsbDtcbiAgfVxuXG4gIHJldHVybiB0aGlzLl9tYXRjaGluZ0RvY3VtZW50O1xufTtcblxuLy8gTWluaW1vbmdvLlNvcnRlciBnZXRzIGEgc2ltaWxhciBtZXRob2QsIHdoaWNoIGRlbGVnYXRlcyB0byBhIE1hdGNoZXIgaXQgbWFkZVxuLy8gZm9yIHRoaXMgZXhhY3QgcHVycG9zZS5cbk1pbmltb25nby5Tb3J0ZXIucHJvdG90eXBlLmFmZmVjdGVkQnlNb2RpZmllciA9IGZ1bmN0aW9uKG1vZGlmaWVyKSB7XG4gIHJldHVybiB0aGlzLl9zZWxlY3RvckZvckFmZmVjdGVkQnlNb2RpZmllci5hZmZlY3RlZEJ5TW9kaWZpZXIobW9kaWZpZXIpO1xufTtcblxuTWluaW1vbmdvLlNvcnRlci5wcm90b3R5cGUuY29tYmluZUludG9Qcm9qZWN0aW9uID0gZnVuY3Rpb24ocHJvamVjdGlvbikge1xuICByZXR1cm4gY29tYmluZUltcG9ydGFudFBhdGhzSW50b1Byb2plY3Rpb24oXG4gICAgTWluaW1vbmdvLl9wYXRoc0VsaWRpbmdOdW1lcmljS2V5cyh0aGlzLl9nZXRQYXRocygpKSxcbiAgICBwcm9qZWN0aW9uXG4gICk7XG59O1xuXG5mdW5jdGlvbiBjb21iaW5lSW1wb3J0YW50UGF0aHNJbnRvUHJvamVjdGlvbihwYXRocywgcHJvamVjdGlvbikge1xuICBjb25zdCBkZXRhaWxzID0gcHJvamVjdGlvbkRldGFpbHMocHJvamVjdGlvbik7XG5cbiAgLy8gbWVyZ2UgdGhlIHBhdGhzIHRvIGluY2x1ZGVcbiAgY29uc3QgdHJlZSA9IHBhdGhzVG9UcmVlKFxuICAgIHBhdGhzLFxuICAgIHBhdGggPT4gdHJ1ZSxcbiAgICAobm9kZSwgcGF0aCwgZnVsbFBhdGgpID0+IHRydWUsXG4gICAgZGV0YWlscy50cmVlXG4gICk7XG4gIGNvbnN0IG1lcmdlZFByb2plY3Rpb24gPSB0cmVlVG9QYXRocyh0cmVlKTtcblxuICBpZiAoZGV0YWlscy5pbmNsdWRpbmcpIHtcbiAgICAvLyBib3RoIHNlbGVjdG9yIGFuZCBwcm9qZWN0aW9uIGFyZSBwb2ludGluZyBvbiBmaWVsZHMgdG8gaW5jbHVkZVxuICAgIC8vIHNvIHdlIGNhbiBqdXN0IHJldHVybiB0aGUgbWVyZ2VkIHRyZWVcbiAgICByZXR1cm4gbWVyZ2VkUHJvamVjdGlvbjtcbiAgfVxuXG4gIC8vIHNlbGVjdG9yIGlzIHBvaW50aW5nIGF0IGZpZWxkcyB0byBpbmNsdWRlXG4gIC8vIHByb2plY3Rpb24gaXMgcG9pbnRpbmcgYXQgZmllbGRzIHRvIGV4Y2x1ZGVcbiAgLy8gbWFrZSBzdXJlIHdlIGRvbid0IGV4Y2x1ZGUgaW1wb3J0YW50IHBhdGhzXG4gIGNvbnN0IG1lcmdlZEV4Y2xQcm9qZWN0aW9uID0ge307XG5cbiAgT2JqZWN0LmtleXMobWVyZ2VkUHJvamVjdGlvbikuZm9yRWFjaChwYXRoID0+IHtcbiAgICBpZiAoIW1lcmdlZFByb2plY3Rpb25bcGF0aF0pIHtcbiAgICAgIG1lcmdlZEV4Y2xQcm9qZWN0aW9uW3BhdGhdID0gZmFsc2U7XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gbWVyZ2VkRXhjbFByb2plY3Rpb247XG59XG5cbmZ1bmN0aW9uIGdldFBhdGhzKHNlbGVjdG9yKSB7XG4gIHJldHVybiBPYmplY3Qua2V5cyhuZXcgTWluaW1vbmdvLk1hdGNoZXIoc2VsZWN0b3IpLl9wYXRocyk7XG5cbiAgLy8gWFhYIHJlbW92ZSBpdD9cbiAgLy8gcmV0dXJuIE9iamVjdC5rZXlzKHNlbGVjdG9yKS5tYXAoayA9PiB7XG4gIC8vICAgLy8gd2UgZG9uJ3Qga25vdyBob3cgdG8gaGFuZGxlICR3aGVyZSBiZWNhdXNlIGl0IGNhbiBiZSBhbnl0aGluZ1xuICAvLyAgIGlmIChrID09PSAnJHdoZXJlJykge1xuICAvLyAgICAgcmV0dXJuICcnOyAvLyBtYXRjaGVzIGV2ZXJ5dGhpbmdcbiAgLy8gICB9XG5cbiAgLy8gICAvLyB3ZSBicmFuY2ggZnJvbSAkb3IvJGFuZC8kbm9yIG9wZXJhdG9yXG4gIC8vICAgaWYgKFsnJG9yJywgJyRhbmQnLCAnJG5vciddLmluY2x1ZGVzKGspKSB7XG4gIC8vICAgICByZXR1cm4gc2VsZWN0b3Jba10ubWFwKGdldFBhdGhzKTtcbiAgLy8gICB9XG5cbiAgLy8gICAvLyB0aGUgdmFsdWUgaXMgYSBsaXRlcmFsIG9yIHNvbWUgY29tcGFyaXNvbiBvcGVyYXRvclxuICAvLyAgIHJldHVybiBrO1xuICAvLyB9KVxuICAvLyAgIC5yZWR1Y2UoKGEsIGIpID0+IGEuY29uY2F0KGIpLCBbXSlcbiAgLy8gICAuZmlsdGVyKChhLCBiLCBjKSA9PiBjLmluZGV4T2YoYSkgPT09IGIpO1xufVxuXG4vLyBBIGhlbHBlciB0byBlbnN1cmUgb2JqZWN0IGhhcyBvbmx5IGNlcnRhaW4ga2V5c1xuZnVuY3Rpb24gb25seUNvbnRhaW5zS2V5cyhvYmosIGtleXMpIHtcbiAgcmV0dXJuIE9iamVjdC5rZXlzKG9iaikuZXZlcnkoayA9PiBrZXlzLmluY2x1ZGVzKGspKTtcbn1cblxuZnVuY3Rpb24gcGF0aEhhc051bWVyaWNLZXlzKHBhdGgpIHtcbiAgcmV0dXJuIHBhdGguc3BsaXQoJy4nKS5zb21lKGlzTnVtZXJpY0tleSk7XG59XG5cbi8vIFJldHVybnMgYSBzZXQgb2Yga2V5IHBhdGhzIHNpbWlsYXIgdG9cbi8vIHsgJ2Zvby5iYXInOiAxLCAnYS5iLmMnOiAxIH1cbmZ1bmN0aW9uIHRyZWVUb1BhdGhzKHRyZWUsIHByZWZpeCA9ICcnKSB7XG4gIGNvbnN0IHJlc3VsdCA9IHt9O1xuXG4gIE9iamVjdC5rZXlzKHRyZWUpLmZvckVhY2goa2V5ID0+IHtcbiAgICBjb25zdCB2YWx1ZSA9IHRyZWVba2V5XTtcbiAgICBpZiAodmFsdWUgPT09IE9iamVjdCh2YWx1ZSkpIHtcbiAgICAgIE9iamVjdC5hc3NpZ24ocmVzdWx0LCB0cmVlVG9QYXRocyh2YWx1ZSwgYCR7cHJlZml4ICsga2V5fS5gKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdFtwcmVmaXggKyBrZXldID0gdmFsdWU7XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gcmVzdWx0O1xufVxuIiwiaW1wb3J0IExvY2FsQ29sbGVjdGlvbiBmcm9tICcuL2xvY2FsX2NvbGxlY3Rpb24uanMnO1xuXG5leHBvcnQgY29uc3QgaGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxuLy8gRWFjaCBlbGVtZW50IHNlbGVjdG9yIGNvbnRhaW5zOlxuLy8gIC0gY29tcGlsZUVsZW1lbnRTZWxlY3RvciwgYSBmdW5jdGlvbiB3aXRoIGFyZ3M6XG4vLyAgICAtIG9wZXJhbmQgLSB0aGUgXCJyaWdodCBoYW5kIHNpZGVcIiBvZiB0aGUgb3BlcmF0b3Jcbi8vICAgIC0gdmFsdWVTZWxlY3RvciAtIHRoZSBcImNvbnRleHRcIiBmb3IgdGhlIG9wZXJhdG9yIChzbyB0aGF0ICRyZWdleCBjYW4gZmluZFxuLy8gICAgICAkb3B0aW9ucylcbi8vICAgIC0gbWF0Y2hlciAtIHRoZSBNYXRjaGVyIHRoaXMgaXMgZ29pbmcgaW50byAoc28gdGhhdCAkZWxlbU1hdGNoIGNhbiBjb21waWxlXG4vLyAgICAgIG1vcmUgdGhpbmdzKVxuLy8gICAgcmV0dXJuaW5nIGEgZnVuY3Rpb24gbWFwcGluZyBhIHNpbmdsZSB2YWx1ZSB0byBib29sLlxuLy8gIC0gZG9udEV4cGFuZExlYWZBcnJheXMsIGEgYm9vbCB3aGljaCBwcmV2ZW50cyBleHBhbmRBcnJheXNJbkJyYW5jaGVzIGZyb21cbi8vICAgIGJlaW5nIGNhbGxlZFxuLy8gIC0gZG9udEluY2x1ZGVMZWFmQXJyYXlzLCBhIGJvb2wgd2hpY2ggY2F1c2VzIGFuIGFyZ3VtZW50IHRvIGJlIHBhc3NlZCB0b1xuLy8gICAgZXhwYW5kQXJyYXlzSW5CcmFuY2hlcyBpZiBpdCBpcyBjYWxsZWRcbmV4cG9ydCBjb25zdCBFTEVNRU5UX09QRVJBVE9SUyA9IHtcbiAgJGx0OiBtYWtlSW5lcXVhbGl0eShjbXBWYWx1ZSA9PiBjbXBWYWx1ZSA8IDApLFxuICAkZ3Q6IG1ha2VJbmVxdWFsaXR5KGNtcFZhbHVlID0+IGNtcFZhbHVlID4gMCksXG4gICRsdGU6IG1ha2VJbmVxdWFsaXR5KGNtcFZhbHVlID0+IGNtcFZhbHVlIDw9IDApLFxuICAkZ3RlOiBtYWtlSW5lcXVhbGl0eShjbXBWYWx1ZSA9PiBjbXBWYWx1ZSA+PSAwKSxcbiAgJG1vZDoge1xuICAgIGNvbXBpbGVFbGVtZW50U2VsZWN0b3Iob3BlcmFuZCkge1xuICAgICAgaWYgKCEoQXJyYXkuaXNBcnJheShvcGVyYW5kKSAmJiBvcGVyYW5kLmxlbmd0aCA9PT0gMlxuICAgICAgICAgICAgJiYgdHlwZW9mIG9wZXJhbmRbMF0gPT09ICdudW1iZXInXG4gICAgICAgICAgICAmJiB0eXBlb2Ygb3BlcmFuZFsxXSA9PT0gJ251bWJlcicpKSB7XG4gICAgICAgIHRocm93IEVycm9yKCdhcmd1bWVudCB0byAkbW9kIG11c3QgYmUgYW4gYXJyYXkgb2YgdHdvIG51bWJlcnMnKTtcbiAgICAgIH1cblxuICAgICAgLy8gWFhYIGNvdWxkIHJlcXVpcmUgdG8gYmUgaW50cyBvciByb3VuZCBvciBzb21ldGhpbmdcbiAgICAgIGNvbnN0IGRpdmlzb3IgPSBvcGVyYW5kWzBdO1xuICAgICAgY29uc3QgcmVtYWluZGVyID0gb3BlcmFuZFsxXTtcbiAgICAgIHJldHVybiB2YWx1ZSA9PiAoXG4gICAgICAgIHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicgJiYgdmFsdWUgJSBkaXZpc29yID09PSByZW1haW5kZXJcbiAgICAgICk7XG4gICAgfSxcbiAgfSxcbiAgJGluOiB7XG4gICAgY29tcGlsZUVsZW1lbnRTZWxlY3RvcihvcGVyYW5kKSB7XG4gICAgICBpZiAoIUFycmF5LmlzQXJyYXkob3BlcmFuZCkpIHtcbiAgICAgICAgdGhyb3cgRXJyb3IoJyRpbiBuZWVkcyBhbiBhcnJheScpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBlbGVtZW50TWF0Y2hlcnMgPSBvcGVyYW5kLm1hcChvcHRpb24gPT4ge1xuICAgICAgICBpZiAob3B0aW9uIGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgICAgICAgcmV0dXJuIHJlZ2V4cEVsZW1lbnRNYXRjaGVyKG9wdGlvbik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaXNPcGVyYXRvck9iamVjdChvcHRpb24pKSB7XG4gICAgICAgICAgdGhyb3cgRXJyb3IoJ2Nhbm5vdCBuZXN0ICQgdW5kZXIgJGluJyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXF1YWxpdHlFbGVtZW50TWF0Y2hlcihvcHRpb24pO1xuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiB2YWx1ZSA9PiB7XG4gICAgICAgIC8vIEFsbG93IHthOiB7JGluOiBbbnVsbF19fSB0byBtYXRjaCB3aGVuICdhJyBkb2VzIG5vdCBleGlzdC5cbiAgICAgICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICB2YWx1ZSA9IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZWxlbWVudE1hdGNoZXJzLnNvbWUobWF0Y2hlciA9PiBtYXRjaGVyKHZhbHVlKSk7XG4gICAgICB9O1xuICAgIH0sXG4gIH0sXG4gICRzaXplOiB7XG4gICAgLy8ge2E6IFtbNSwgNV1dfSBtdXN0IG1hdGNoIHthOiB7JHNpemU6IDF9fSBidXQgbm90IHthOiB7JHNpemU6IDJ9fSwgc28gd2VcbiAgICAvLyBkb24ndCB3YW50IHRvIGNvbnNpZGVyIHRoZSBlbGVtZW50IFs1LDVdIGluIHRoZSBsZWFmIGFycmF5IFtbNSw1XV0gYXMgYVxuICAgIC8vIHBvc3NpYmxlIHZhbHVlLlxuICAgIGRvbnRFeHBhbmRMZWFmQXJyYXlzOiB0cnVlLFxuICAgIGNvbXBpbGVFbGVtZW50U2VsZWN0b3Iob3BlcmFuZCkge1xuICAgICAgaWYgKHR5cGVvZiBvcGVyYW5kID09PSAnc3RyaW5nJykge1xuICAgICAgICAvLyBEb24ndCBhc2sgbWUgd2h5LCBidXQgYnkgZXhwZXJpbWVudGF0aW9uLCB0aGlzIHNlZW1zIHRvIGJlIHdoYXQgTW9uZ29cbiAgICAgICAgLy8gZG9lcy5cbiAgICAgICAgb3BlcmFuZCA9IDA7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBvcGVyYW5kICE9PSAnbnVtYmVyJykge1xuICAgICAgICB0aHJvdyBFcnJvcignJHNpemUgbmVlZHMgYSBudW1iZXInKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHZhbHVlID0+IEFycmF5LmlzQXJyYXkodmFsdWUpICYmIHZhbHVlLmxlbmd0aCA9PT0gb3BlcmFuZDtcbiAgICB9LFxuICB9LFxuICAkdHlwZToge1xuICAgIC8vIHthOiBbNV19IG11c3Qgbm90IG1hdGNoIHthOiB7JHR5cGU6IDR9fSAoNCBtZWFucyBhcnJheSksIGJ1dCBpdCBzaG91bGRcbiAgICAvLyBtYXRjaCB7YTogeyR0eXBlOiAxfX0gKDEgbWVhbnMgbnVtYmVyKSwgYW5kIHthOiBbWzVdXX0gbXVzdCBtYXRjaCB7JGE6XG4gICAgLy8geyR0eXBlOiA0fX0uIFRodXMsIHdoZW4gd2Ugc2VlIGEgbGVhZiBhcnJheSwgd2UgKnNob3VsZCogZXhwYW5kIGl0IGJ1dFxuICAgIC8vIHNob3VsZCAqbm90KiBpbmNsdWRlIGl0IGl0c2VsZi5cbiAgICBkb250SW5jbHVkZUxlYWZBcnJheXM6IHRydWUsXG4gICAgY29tcGlsZUVsZW1lbnRTZWxlY3RvcihvcGVyYW5kKSB7XG4gICAgICBpZiAodHlwZW9mIG9wZXJhbmQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGNvbnN0IG9wZXJhbmRBbGlhc01hcCA9IHtcbiAgICAgICAgICAnZG91YmxlJzogMSxcbiAgICAgICAgICAnc3RyaW5nJzogMixcbiAgICAgICAgICAnb2JqZWN0JzogMyxcbiAgICAgICAgICAnYXJyYXknOiA0LFxuICAgICAgICAgICdiaW5EYXRhJzogNSxcbiAgICAgICAgICAndW5kZWZpbmVkJzogNixcbiAgICAgICAgICAnb2JqZWN0SWQnOiA3LFxuICAgICAgICAgICdib29sJzogOCxcbiAgICAgICAgICAnZGF0ZSc6IDksXG4gICAgICAgICAgJ251bGwnOiAxMCxcbiAgICAgICAgICAncmVnZXgnOiAxMSxcbiAgICAgICAgICAnZGJQb2ludGVyJzogMTIsXG4gICAgICAgICAgJ2phdmFzY3JpcHQnOiAxMyxcbiAgICAgICAgICAnc3ltYm9sJzogMTQsXG4gICAgICAgICAgJ2phdmFzY3JpcHRXaXRoU2NvcGUnOiAxNSxcbiAgICAgICAgICAnaW50JzogMTYsXG4gICAgICAgICAgJ3RpbWVzdGFtcCc6IDE3LFxuICAgICAgICAgICdsb25nJzogMTgsXG4gICAgICAgICAgJ2RlY2ltYWwnOiAxOSxcbiAgICAgICAgICAnbWluS2V5JzogLTEsXG4gICAgICAgICAgJ21heEtleSc6IDEyNyxcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKCFoYXNPd24uY2FsbChvcGVyYW5kQWxpYXNNYXAsIG9wZXJhbmQpKSB7XG4gICAgICAgICAgdGhyb3cgRXJyb3IoYHVua25vd24gc3RyaW5nIGFsaWFzIGZvciAkdHlwZTogJHtvcGVyYW5kfWApO1xuICAgICAgICB9XG4gICAgICAgIG9wZXJhbmQgPSBvcGVyYW5kQWxpYXNNYXBbb3BlcmFuZF07XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBvcGVyYW5kID09PSAnbnVtYmVyJykge1xuICAgICAgICBpZiAob3BlcmFuZCA9PT0gMCB8fCBvcGVyYW5kIDwgLTFcbiAgICAgICAgICB8fCAob3BlcmFuZCA+IDE5ICYmIG9wZXJhbmQgIT09IDEyNykpIHtcbiAgICAgICAgICB0aHJvdyBFcnJvcihgSW52YWxpZCBudW1lcmljYWwgJHR5cGUgY29kZTogJHtvcGVyYW5kfWApO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBFcnJvcignYXJndW1lbnQgdG8gJHR5cGUgaXMgbm90IGEgbnVtYmVyIG9yIGEgc3RyaW5nJyk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB2YWx1ZSA9PiAoXG4gICAgICAgIHZhbHVlICE9PSB1bmRlZmluZWQgJiYgTG9jYWxDb2xsZWN0aW9uLl9mLl90eXBlKHZhbHVlKSA9PT0gb3BlcmFuZFxuICAgICAgKTtcbiAgICB9LFxuICB9LFxuICAkYml0c0FsbFNldDoge1xuICAgIGNvbXBpbGVFbGVtZW50U2VsZWN0b3Iob3BlcmFuZCkge1xuICAgICAgY29uc3QgbWFzayA9IGdldE9wZXJhbmRCaXRtYXNrKG9wZXJhbmQsICckYml0c0FsbFNldCcpO1xuICAgICAgcmV0dXJuIHZhbHVlID0+IHtcbiAgICAgICAgY29uc3QgYml0bWFzayA9IGdldFZhbHVlQml0bWFzayh2YWx1ZSwgbWFzay5sZW5ndGgpO1xuICAgICAgICByZXR1cm4gYml0bWFzayAmJiBtYXNrLmV2ZXJ5KChieXRlLCBpKSA9PiAoYml0bWFza1tpXSAmIGJ5dGUpID09PSBieXRlKTtcbiAgICAgIH07XG4gICAgfSxcbiAgfSxcbiAgJGJpdHNBbnlTZXQ6IHtcbiAgICBjb21waWxlRWxlbWVudFNlbGVjdG9yKG9wZXJhbmQpIHtcbiAgICAgIGNvbnN0IG1hc2sgPSBnZXRPcGVyYW5kQml0bWFzayhvcGVyYW5kLCAnJGJpdHNBbnlTZXQnKTtcbiAgICAgIHJldHVybiB2YWx1ZSA9PiB7XG4gICAgICAgIGNvbnN0IGJpdG1hc2sgPSBnZXRWYWx1ZUJpdG1hc2sodmFsdWUsIG1hc2subGVuZ3RoKTtcbiAgICAgICAgcmV0dXJuIGJpdG1hc2sgJiYgbWFzay5zb21lKChieXRlLCBpKSA9PiAofmJpdG1hc2tbaV0gJiBieXRlKSAhPT0gYnl0ZSk7XG4gICAgICB9O1xuICAgIH0sXG4gIH0sXG4gICRiaXRzQWxsQ2xlYXI6IHtcbiAgICBjb21waWxlRWxlbWVudFNlbGVjdG9yKG9wZXJhbmQpIHtcbiAgICAgIGNvbnN0IG1hc2sgPSBnZXRPcGVyYW5kQml0bWFzayhvcGVyYW5kLCAnJGJpdHNBbGxDbGVhcicpO1xuICAgICAgcmV0dXJuIHZhbHVlID0+IHtcbiAgICAgICAgY29uc3QgYml0bWFzayA9IGdldFZhbHVlQml0bWFzayh2YWx1ZSwgbWFzay5sZW5ndGgpO1xuICAgICAgICByZXR1cm4gYml0bWFzayAmJiBtYXNrLmV2ZXJ5KChieXRlLCBpKSA9PiAhKGJpdG1hc2tbaV0gJiBieXRlKSk7XG4gICAgICB9O1xuICAgIH0sXG4gIH0sXG4gICRiaXRzQW55Q2xlYXI6IHtcbiAgICBjb21waWxlRWxlbWVudFNlbGVjdG9yKG9wZXJhbmQpIHtcbiAgICAgIGNvbnN0IG1hc2sgPSBnZXRPcGVyYW5kQml0bWFzayhvcGVyYW5kLCAnJGJpdHNBbnlDbGVhcicpO1xuICAgICAgcmV0dXJuIHZhbHVlID0+IHtcbiAgICAgICAgY29uc3QgYml0bWFzayA9IGdldFZhbHVlQml0bWFzayh2YWx1ZSwgbWFzay5sZW5ndGgpO1xuICAgICAgICByZXR1cm4gYml0bWFzayAmJiBtYXNrLnNvbWUoKGJ5dGUsIGkpID0+IChiaXRtYXNrW2ldICYgYnl0ZSkgIT09IGJ5dGUpO1xuICAgICAgfTtcbiAgICB9LFxuICB9LFxuICAkcmVnZXg6IHtcbiAgICBjb21waWxlRWxlbWVudFNlbGVjdG9yKG9wZXJhbmQsIHZhbHVlU2VsZWN0b3IpIHtcbiAgICAgIGlmICghKHR5cGVvZiBvcGVyYW5kID09PSAnc3RyaW5nJyB8fCBvcGVyYW5kIGluc3RhbmNlb2YgUmVnRXhwKSkge1xuICAgICAgICB0aHJvdyBFcnJvcignJHJlZ2V4IGhhcyB0byBiZSBhIHN0cmluZyBvciBSZWdFeHAnKTtcbiAgICAgIH1cblxuICAgICAgbGV0IHJlZ2V4cDtcbiAgICAgIGlmICh2YWx1ZVNlbGVjdG9yLiRvcHRpb25zICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgLy8gT3B0aW9ucyBwYXNzZWQgaW4gJG9wdGlvbnMgKGV2ZW4gdGhlIGVtcHR5IHN0cmluZykgYWx3YXlzIG92ZXJyaWRlc1xuICAgICAgICAvLyBvcHRpb25zIGluIHRoZSBSZWdFeHAgb2JqZWN0IGl0c2VsZi5cblxuICAgICAgICAvLyBCZSBjbGVhciB0aGF0IHdlIG9ubHkgc3VwcG9ydCB0aGUgSlMtc3VwcG9ydGVkIG9wdGlvbnMsIG5vdCBleHRlbmRlZFxuICAgICAgICAvLyBvbmVzIChlZywgTW9uZ28gc3VwcG9ydHMgeCBhbmQgcykuIElkZWFsbHkgd2Ugd291bGQgaW1wbGVtZW50IHggYW5kIHNcbiAgICAgICAgLy8gYnkgdHJhbnNmb3JtaW5nIHRoZSByZWdleHAsIGJ1dCBub3QgdG9kYXkuLi5cbiAgICAgICAgaWYgKC9bXmdpbV0vLnRlc3QodmFsdWVTZWxlY3Rvci4kb3B0aW9ucykpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ09ubHkgdGhlIGksIG0sIGFuZCBnIHJlZ2V4cCBvcHRpb25zIGFyZSBzdXBwb3J0ZWQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHNvdXJjZSA9IG9wZXJhbmQgaW5zdGFuY2VvZiBSZWdFeHAgPyBvcGVyYW5kLnNvdXJjZSA6IG9wZXJhbmQ7XG4gICAgICAgIHJlZ2V4cCA9IG5ldyBSZWdFeHAoc291cmNlLCB2YWx1ZVNlbGVjdG9yLiRvcHRpb25zKTtcbiAgICAgIH0gZWxzZSBpZiAob3BlcmFuZCBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgICAgICByZWdleHAgPSBvcGVyYW5kO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVnZXhwID0gbmV3IFJlZ0V4cChvcGVyYW5kKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJlZ2V4cEVsZW1lbnRNYXRjaGVyKHJlZ2V4cCk7XG4gICAgfSxcbiAgfSxcbiAgJGVsZW1NYXRjaDoge1xuICAgIGRvbnRFeHBhbmRMZWFmQXJyYXlzOiB0cnVlLFxuICAgIGNvbXBpbGVFbGVtZW50U2VsZWN0b3Iob3BlcmFuZCwgdmFsdWVTZWxlY3RvciwgbWF0Y2hlcikge1xuICAgICAgaWYgKCFMb2NhbENvbGxlY3Rpb24uX2lzUGxhaW5PYmplY3Qob3BlcmFuZCkpIHtcbiAgICAgICAgdGhyb3cgRXJyb3IoJyRlbGVtTWF0Y2ggbmVlZCBhbiBvYmplY3QnKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgaXNEb2NNYXRjaGVyID0gIWlzT3BlcmF0b3JPYmplY3QoXG4gICAgICAgIE9iamVjdC5rZXlzKG9wZXJhbmQpXG4gICAgICAgICAgLmZpbHRlcihrZXkgPT4gIWhhc093bi5jYWxsKExPR0lDQUxfT1BFUkFUT1JTLCBrZXkpKVxuICAgICAgICAgIC5yZWR1Y2UoKGEsIGIpID0+IE9iamVjdC5hc3NpZ24oYSwge1tiXTogb3BlcmFuZFtiXX0pLCB7fSksXG4gICAgICAgIHRydWUpO1xuXG4gICAgICBsZXQgc3ViTWF0Y2hlcjtcbiAgICAgIGlmIChpc0RvY01hdGNoZXIpIHtcbiAgICAgICAgLy8gVGhpcyBpcyBOT1QgdGhlIHNhbWUgYXMgY29tcGlsZVZhbHVlU2VsZWN0b3Iob3BlcmFuZCksIGFuZCBub3QganVzdFxuICAgICAgICAvLyBiZWNhdXNlIG9mIHRoZSBzbGlnaHRseSBkaWZmZXJlbnQgY2FsbGluZyBjb252ZW50aW9uLlxuICAgICAgICAvLyB7JGVsZW1NYXRjaDoge3g6IDN9fSBtZWFucyBcImFuIGVsZW1lbnQgaGFzIGEgZmllbGQgeDozXCIsIG5vdFxuICAgICAgICAvLyBcImNvbnNpc3RzIG9ubHkgb2YgYSBmaWVsZCB4OjNcIi4gQWxzbywgcmVnZXhwcyBhbmQgc3ViLSQgYXJlIGFsbG93ZWQuXG4gICAgICAgIHN1Yk1hdGNoZXIgPVxuICAgICAgICAgIGNvbXBpbGVEb2N1bWVudFNlbGVjdG9yKG9wZXJhbmQsIG1hdGNoZXIsIHtpbkVsZW1NYXRjaDogdHJ1ZX0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3ViTWF0Y2hlciA9IGNvbXBpbGVWYWx1ZVNlbGVjdG9yKG9wZXJhbmQsIG1hdGNoZXIpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdmFsdWUgPT4ge1xuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB2YWx1ZS5sZW5ndGg7ICsraSkge1xuICAgICAgICAgIGNvbnN0IGFycmF5RWxlbWVudCA9IHZhbHVlW2ldO1xuICAgICAgICAgIGxldCBhcmc7XG4gICAgICAgICAgaWYgKGlzRG9jTWF0Y2hlcikge1xuICAgICAgICAgICAgLy8gV2UgY2FuIG9ubHkgbWF0Y2ggeyRlbGVtTWF0Y2g6IHtiOiAzfX0gYWdhaW5zdCBvYmplY3RzLlxuICAgICAgICAgICAgLy8gKFdlIGNhbiBhbHNvIG1hdGNoIGFnYWluc3QgYXJyYXlzLCBpZiB0aGVyZSdzIG51bWVyaWMgaW5kaWNlcyxcbiAgICAgICAgICAgIC8vIGVnIHskZWxlbU1hdGNoOiB7JzAuYic6IDN9fSBvciB7JGVsZW1NYXRjaDogezA6IDN9fS4pXG4gICAgICAgICAgICBpZiAoIWlzSW5kZXhhYmxlKGFycmF5RWxlbWVudCkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBhcmcgPSBhcnJheUVsZW1lbnQ7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGRvbnRJdGVyYXRlIGVuc3VyZXMgdGhhdCB7YTogeyRlbGVtTWF0Y2g6IHskZ3Q6IDV9fX0gbWF0Y2hlc1xuICAgICAgICAgICAgLy8ge2E6IFs4XX0gYnV0IG5vdCB7YTogW1s4XV19XG4gICAgICAgICAgICBhcmcgPSBbe3ZhbHVlOiBhcnJheUVsZW1lbnQsIGRvbnRJdGVyYXRlOiB0cnVlfV07XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIFhYWCBzdXBwb3J0ICRuZWFyIGluICRlbGVtTWF0Y2ggYnkgcHJvcGFnYXRpbmcgJGRpc3RhbmNlP1xuICAgICAgICAgIGlmIChzdWJNYXRjaGVyKGFyZykucmVzdWx0KSB7XG4gICAgICAgICAgICByZXR1cm4gaTsgLy8gc3BlY2lhbGx5IHVuZGVyc3Rvb2QgdG8gbWVhbiBcInVzZSBhcyBhcnJheUluZGljZXNcIlxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH07XG4gICAgfSxcbiAgfSxcbn07XG5cbi8vIE9wZXJhdG9ycyB0aGF0IGFwcGVhciBhdCB0aGUgdG9wIGxldmVsIG9mIGEgZG9jdW1lbnQgc2VsZWN0b3IuXG5jb25zdCBMT0dJQ0FMX09QRVJBVE9SUyA9IHtcbiAgJGFuZChzdWJTZWxlY3RvciwgbWF0Y2hlciwgaW5FbGVtTWF0Y2gpIHtcbiAgICByZXR1cm4gYW5kRG9jdW1lbnRNYXRjaGVycyhcbiAgICAgIGNvbXBpbGVBcnJheU9mRG9jdW1lbnRTZWxlY3RvcnMoc3ViU2VsZWN0b3IsIG1hdGNoZXIsIGluRWxlbU1hdGNoKVxuICAgICk7XG4gIH0sXG5cbiAgJG9yKHN1YlNlbGVjdG9yLCBtYXRjaGVyLCBpbkVsZW1NYXRjaCkge1xuICAgIGNvbnN0IG1hdGNoZXJzID0gY29tcGlsZUFycmF5T2ZEb2N1bWVudFNlbGVjdG9ycyhcbiAgICAgIHN1YlNlbGVjdG9yLFxuICAgICAgbWF0Y2hlcixcbiAgICAgIGluRWxlbU1hdGNoXG4gICAgKTtcblxuICAgIC8vIFNwZWNpYWwgY2FzZTogaWYgdGhlcmUgaXMgb25seSBvbmUgbWF0Y2hlciwgdXNlIGl0IGRpcmVjdGx5LCAqcHJlc2VydmluZypcbiAgICAvLyBhbnkgYXJyYXlJbmRpY2VzIGl0IHJldHVybnMuXG4gICAgaWYgKG1hdGNoZXJzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgcmV0dXJuIG1hdGNoZXJzWzBdO1xuICAgIH1cblxuICAgIHJldHVybiBkb2MgPT4ge1xuICAgICAgY29uc3QgcmVzdWx0ID0gbWF0Y2hlcnMuc29tZShmbiA9PiBmbihkb2MpLnJlc3VsdCk7XG4gICAgICAvLyAkb3IgZG9lcyBOT1Qgc2V0IGFycmF5SW5kaWNlcyB3aGVuIGl0IGhhcyBtdWx0aXBsZVxuICAgICAgLy8gc3ViLWV4cHJlc3Npb25zLiAoVGVzdGVkIGFnYWluc3QgTW9uZ29EQi4pXG4gICAgICByZXR1cm4ge3Jlc3VsdH07XG4gICAgfTtcbiAgfSxcblxuICAkbm9yKHN1YlNlbGVjdG9yLCBtYXRjaGVyLCBpbkVsZW1NYXRjaCkge1xuICAgIGNvbnN0IG1hdGNoZXJzID0gY29tcGlsZUFycmF5T2ZEb2N1bWVudFNlbGVjdG9ycyhcbiAgICAgIHN1YlNlbGVjdG9yLFxuICAgICAgbWF0Y2hlcixcbiAgICAgIGluRWxlbU1hdGNoXG4gICAgKTtcbiAgICByZXR1cm4gZG9jID0+IHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IG1hdGNoZXJzLmV2ZXJ5KGZuID0+ICFmbihkb2MpLnJlc3VsdCk7XG4gICAgICAvLyBOZXZlciBzZXQgYXJyYXlJbmRpY2VzLCBiZWNhdXNlIHdlIG9ubHkgbWF0Y2ggaWYgbm90aGluZyBpbiBwYXJ0aWN1bGFyXG4gICAgICAvLyAnbWF0Y2hlZCcgKGFuZCBiZWNhdXNlIHRoaXMgaXMgY29uc2lzdGVudCB3aXRoIE1vbmdvREIpLlxuICAgICAgcmV0dXJuIHtyZXN1bHR9O1xuICAgIH07XG4gIH0sXG5cbiAgJHdoZXJlKHNlbGVjdG9yVmFsdWUsIG1hdGNoZXIpIHtcbiAgICAvLyBSZWNvcmQgdGhhdCAqYW55KiBwYXRoIG1heSBiZSB1c2VkLlxuICAgIG1hdGNoZXIuX3JlY29yZFBhdGhVc2VkKCcnKTtcbiAgICBtYXRjaGVyLl9oYXNXaGVyZSA9IHRydWU7XG5cbiAgICBpZiAoIShzZWxlY3RvclZhbHVlIGluc3RhbmNlb2YgRnVuY3Rpb24pKSB7XG4gICAgICAvLyBYWFggTW9uZ29EQiBzZWVtcyB0byBoYXZlIG1vcmUgY29tcGxleCBsb2dpYyB0byBkZWNpZGUgd2hlcmUgb3Igb3Igbm90XG4gICAgICAvLyB0byBhZGQgJ3JldHVybic7IG5vdCBzdXJlIGV4YWN0bHkgd2hhdCBpdCBpcy5cbiAgICAgIHNlbGVjdG9yVmFsdWUgPSBGdW5jdGlvbignb2JqJywgYHJldHVybiAke3NlbGVjdG9yVmFsdWV9YCk7XG4gICAgfVxuXG4gICAgLy8gV2UgbWFrZSB0aGUgZG9jdW1lbnQgYXZhaWxhYmxlIGFzIGJvdGggYHRoaXNgIGFuZCBgb2JqYC5cbiAgICAvLyAvLyBYWFggbm90IHN1cmUgd2hhdCB3ZSBzaG91bGQgZG8gaWYgdGhpcyB0aHJvd3NcbiAgICByZXR1cm4gZG9jID0+ICh7cmVzdWx0OiBzZWxlY3RvclZhbHVlLmNhbGwoZG9jLCBkb2MpfSk7XG4gIH0sXG5cbiAgLy8gVGhpcyBpcyBqdXN0IHVzZWQgYXMgYSBjb21tZW50IGluIHRoZSBxdWVyeSAoaW4gTW9uZ29EQiwgaXQgYWxzbyBlbmRzIHVwIGluXG4gIC8vIHF1ZXJ5IGxvZ3MpOyBpdCBoYXMgbm8gZWZmZWN0IG9uIHRoZSBhY3R1YWwgc2VsZWN0aW9uLlxuICAkY29tbWVudCgpIHtcbiAgICByZXR1cm4gKCkgPT4gKHtyZXN1bHQ6IHRydWV9KTtcbiAgfSxcbn07XG5cbi8vIE9wZXJhdG9ycyB0aGF0ICh1bmxpa2UgTE9HSUNBTF9PUEVSQVRPUlMpIHBlcnRhaW4gdG8gaW5kaXZpZHVhbCBwYXRocyBpbiBhXG4vLyBkb2N1bWVudCwgYnV0ICh1bmxpa2UgRUxFTUVOVF9PUEVSQVRPUlMpIGRvIG5vdCBoYXZlIGEgc2ltcGxlIGRlZmluaXRpb24gYXNcbi8vIFwibWF0Y2ggZWFjaCBicmFuY2hlZCB2YWx1ZSBpbmRlcGVuZGVudGx5IGFuZCBjb21iaW5lIHdpdGhcbi8vIGNvbnZlcnRFbGVtZW50TWF0Y2hlclRvQnJhbmNoZWRNYXRjaGVyXCIuXG5jb25zdCBWQUxVRV9PUEVSQVRPUlMgPSB7XG4gICRlcShvcGVyYW5kKSB7XG4gICAgcmV0dXJuIGNvbnZlcnRFbGVtZW50TWF0Y2hlclRvQnJhbmNoZWRNYXRjaGVyKFxuICAgICAgZXF1YWxpdHlFbGVtZW50TWF0Y2hlcihvcGVyYW5kKVxuICAgICk7XG4gIH0sXG4gICRub3Qob3BlcmFuZCwgdmFsdWVTZWxlY3RvciwgbWF0Y2hlcikge1xuICAgIHJldHVybiBpbnZlcnRCcmFuY2hlZE1hdGNoZXIoY29tcGlsZVZhbHVlU2VsZWN0b3Iob3BlcmFuZCwgbWF0Y2hlcikpO1xuICB9LFxuICAkbmUob3BlcmFuZCkge1xuICAgIHJldHVybiBpbnZlcnRCcmFuY2hlZE1hdGNoZXIoXG4gICAgICBjb252ZXJ0RWxlbWVudE1hdGNoZXJUb0JyYW5jaGVkTWF0Y2hlcihlcXVhbGl0eUVsZW1lbnRNYXRjaGVyKG9wZXJhbmQpKVxuICAgICk7XG4gIH0sXG4gICRuaW4ob3BlcmFuZCkge1xuICAgIHJldHVybiBpbnZlcnRCcmFuY2hlZE1hdGNoZXIoXG4gICAgICBjb252ZXJ0RWxlbWVudE1hdGNoZXJUb0JyYW5jaGVkTWF0Y2hlcihcbiAgICAgICAgRUxFTUVOVF9PUEVSQVRPUlMuJGluLmNvbXBpbGVFbGVtZW50U2VsZWN0b3Iob3BlcmFuZClcbiAgICAgIClcbiAgICApO1xuICB9LFxuICAkZXhpc3RzKG9wZXJhbmQpIHtcbiAgICBjb25zdCBleGlzdHMgPSBjb252ZXJ0RWxlbWVudE1hdGNoZXJUb0JyYW5jaGVkTWF0Y2hlcihcbiAgICAgIHZhbHVlID0+IHZhbHVlICE9PSB1bmRlZmluZWRcbiAgICApO1xuICAgIHJldHVybiBvcGVyYW5kID8gZXhpc3RzIDogaW52ZXJ0QnJhbmNoZWRNYXRjaGVyKGV4aXN0cyk7XG4gIH0sXG4gIC8vICRvcHRpb25zIGp1c3QgcHJvdmlkZXMgb3B0aW9ucyBmb3IgJHJlZ2V4OyBpdHMgbG9naWMgaXMgaW5zaWRlICRyZWdleFxuICAkb3B0aW9ucyhvcGVyYW5kLCB2YWx1ZVNlbGVjdG9yKSB7XG4gICAgaWYgKCFoYXNPd24uY2FsbCh2YWx1ZVNlbGVjdG9yLCAnJHJlZ2V4JykpIHtcbiAgICAgIHRocm93IEVycm9yKCckb3B0aW9ucyBuZWVkcyBhICRyZWdleCcpO1xuICAgIH1cblxuICAgIHJldHVybiBldmVyeXRoaW5nTWF0Y2hlcjtcbiAgfSxcbiAgLy8gJG1heERpc3RhbmNlIGlzIGJhc2ljYWxseSBhbiBhcmd1bWVudCB0byAkbmVhclxuICAkbWF4RGlzdGFuY2Uob3BlcmFuZCwgdmFsdWVTZWxlY3Rvcikge1xuICAgIGlmICghdmFsdWVTZWxlY3Rvci4kbmVhcikge1xuICAgICAgdGhyb3cgRXJyb3IoJyRtYXhEaXN0YW5jZSBuZWVkcyBhICRuZWFyJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGV2ZXJ5dGhpbmdNYXRjaGVyO1xuICB9LFxuICAkYWxsKG9wZXJhbmQsIHZhbHVlU2VsZWN0b3IsIG1hdGNoZXIpIHtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkob3BlcmFuZCkpIHtcbiAgICAgIHRocm93IEVycm9yKCckYWxsIHJlcXVpcmVzIGFycmF5Jyk7XG4gICAgfVxuXG4gICAgLy8gTm90IHN1cmUgd2h5LCBidXQgdGhpcyBzZWVtcyB0byBiZSB3aGF0IE1vbmdvREIgZG9lcy5cbiAgICBpZiAob3BlcmFuZC5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBub3RoaW5nTWF0Y2hlcjtcbiAgICB9XG5cbiAgICBjb25zdCBicmFuY2hlZE1hdGNoZXJzID0gb3BlcmFuZC5tYXAoY3JpdGVyaW9uID0+IHtcbiAgICAgIC8vIFhYWCBoYW5kbGUgJGFsbC8kZWxlbU1hdGNoIGNvbWJpbmF0aW9uXG4gICAgICBpZiAoaXNPcGVyYXRvck9iamVjdChjcml0ZXJpb24pKSB7XG4gICAgICAgIHRocm93IEVycm9yKCdubyAkIGV4cHJlc3Npb25zIGluICRhbGwnKTtcbiAgICAgIH1cblxuICAgICAgLy8gVGhpcyBpcyBhbHdheXMgYSByZWdleHAgb3IgZXF1YWxpdHkgc2VsZWN0b3IuXG4gICAgICByZXR1cm4gY29tcGlsZVZhbHVlU2VsZWN0b3IoY3JpdGVyaW9uLCBtYXRjaGVyKTtcbiAgICB9KTtcblxuICAgIC8vIGFuZEJyYW5jaGVkTWF0Y2hlcnMgZG9lcyBOT1QgcmVxdWlyZSBhbGwgc2VsZWN0b3JzIHRvIHJldHVybiB0cnVlIG9uIHRoZVxuICAgIC8vIFNBTUUgYnJhbmNoLlxuICAgIHJldHVybiBhbmRCcmFuY2hlZE1hdGNoZXJzKGJyYW5jaGVkTWF0Y2hlcnMpO1xuICB9LFxuICAkbmVhcihvcGVyYW5kLCB2YWx1ZVNlbGVjdG9yLCBtYXRjaGVyLCBpc1Jvb3QpIHtcbiAgICBpZiAoIWlzUm9vdCkge1xuICAgICAgdGhyb3cgRXJyb3IoJyRuZWFyIGNhblxcJ3QgYmUgaW5zaWRlIGFub3RoZXIgJCBvcGVyYXRvcicpO1xuICAgIH1cblxuICAgIG1hdGNoZXIuX2hhc0dlb1F1ZXJ5ID0gdHJ1ZTtcblxuICAgIC8vIFRoZXJlIGFyZSB0d28ga2luZHMgb2YgZ2VvZGF0YSBpbiBNb25nb0RCOiBsZWdhY3kgY29vcmRpbmF0ZSBwYWlycyBhbmRcbiAgICAvLyBHZW9KU09OLiBUaGV5IHVzZSBkaWZmZXJlbnQgZGlzdGFuY2UgbWV0cmljcywgdG9vLiBHZW9KU09OIHF1ZXJpZXMgYXJlXG4gICAgLy8gbWFya2VkIHdpdGggYSAkZ2VvbWV0cnkgcHJvcGVydHksIHRob3VnaCBsZWdhY3kgY29vcmRpbmF0ZXMgY2FuIGJlXG4gICAgLy8gbWF0Y2hlZCB1c2luZyAkZ2VvbWV0cnkuXG4gICAgbGV0IG1heERpc3RhbmNlLCBwb2ludCwgZGlzdGFuY2U7XG4gICAgaWYgKExvY2FsQ29sbGVjdGlvbi5faXNQbGFpbk9iamVjdChvcGVyYW5kKSAmJiBoYXNPd24uY2FsbChvcGVyYW5kLCAnJGdlb21ldHJ5JykpIHtcbiAgICAgIC8vIEdlb0pTT04gXCIyZHNwaGVyZVwiIG1vZGUuXG4gICAgICBtYXhEaXN0YW5jZSA9IG9wZXJhbmQuJG1heERpc3RhbmNlO1xuICAgICAgcG9pbnQgPSBvcGVyYW5kLiRnZW9tZXRyeTtcbiAgICAgIGRpc3RhbmNlID0gdmFsdWUgPT4ge1xuICAgICAgICAvLyBYWFg6IGZvciBub3csIHdlIGRvbid0IGNhbGN1bGF0ZSB0aGUgYWN0dWFsIGRpc3RhbmNlIGJldHdlZW4sIHNheSxcbiAgICAgICAgLy8gcG9seWdvbiBhbmQgY2lyY2xlLiBJZiBwZW9wbGUgY2FyZSBhYm91dCB0aGlzIHVzZS1jYXNlIGl0IHdpbGwgZ2V0XG4gICAgICAgIC8vIGEgcHJpb3JpdHkuXG4gICAgICAgIGlmICghdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdmFsdWUudHlwZSkge1xuICAgICAgICAgIHJldHVybiBHZW9KU09OLnBvaW50RGlzdGFuY2UoXG4gICAgICAgICAgICBwb2ludCxcbiAgICAgICAgICAgIHt0eXBlOiAnUG9pbnQnLCBjb29yZGluYXRlczogcG9pbnRUb0FycmF5KHZhbHVlKX1cbiAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHZhbHVlLnR5cGUgPT09ICdQb2ludCcpIHtcbiAgICAgICAgICByZXR1cm4gR2VvSlNPTi5wb2ludERpc3RhbmNlKHBvaW50LCB2YWx1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gR2VvSlNPTi5nZW9tZXRyeVdpdGhpblJhZGl1cyh2YWx1ZSwgcG9pbnQsIG1heERpc3RhbmNlKVxuICAgICAgICAgID8gMFxuICAgICAgICAgIDogbWF4RGlzdGFuY2UgKyAxO1xuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgbWF4RGlzdGFuY2UgPSB2YWx1ZVNlbGVjdG9yLiRtYXhEaXN0YW5jZTtcblxuICAgICAgaWYgKCFpc0luZGV4YWJsZShvcGVyYW5kKSkge1xuICAgICAgICB0aHJvdyBFcnJvcignJG5lYXIgYXJndW1lbnQgbXVzdCBiZSBjb29yZGluYXRlIHBhaXIgb3IgR2VvSlNPTicpO1xuICAgICAgfVxuXG4gICAgICBwb2ludCA9IHBvaW50VG9BcnJheShvcGVyYW5kKTtcblxuICAgICAgZGlzdGFuY2UgPSB2YWx1ZSA9PiB7XG4gICAgICAgIGlmICghaXNJbmRleGFibGUodmFsdWUpKSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZGlzdGFuY2VDb29yZGluYXRlUGFpcnMocG9pbnQsIHZhbHVlKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGJyYW5jaGVkVmFsdWVzID0+IHtcbiAgICAgIC8vIFRoZXJlIG1pZ2h0IGJlIG11bHRpcGxlIHBvaW50cyBpbiB0aGUgZG9jdW1lbnQgdGhhdCBtYXRjaCB0aGUgZ2l2ZW5cbiAgICAgIC8vIGZpZWxkLiBPbmx5IG9uZSBvZiB0aGVtIG5lZWRzIHRvIGJlIHdpdGhpbiAkbWF4RGlzdGFuY2UsIGJ1dCB3ZSBuZWVkIHRvXG4gICAgICAvLyBldmFsdWF0ZSBhbGwgb2YgdGhlbSBhbmQgdXNlIHRoZSBuZWFyZXN0IG9uZSBmb3IgdGhlIGltcGxpY2l0IHNvcnRcbiAgICAgIC8vIHNwZWNpZmllci4gKFRoYXQncyB3aHkgd2UgY2FuJ3QganVzdCB1c2UgRUxFTUVOVF9PUEVSQVRPUlMgaGVyZS4pXG4gICAgICAvL1xuICAgICAgLy8gTm90ZTogVGhpcyBkaWZmZXJzIGZyb20gTW9uZ29EQidzIGltcGxlbWVudGF0aW9uLCB3aGVyZSBhIGRvY3VtZW50IHdpbGxcbiAgICAgIC8vIGFjdHVhbGx5IHNob3cgdXAgKm11bHRpcGxlIHRpbWVzKiBpbiB0aGUgcmVzdWx0IHNldCwgd2l0aCBvbmUgZW50cnkgZm9yXG4gICAgICAvLyBlYWNoIHdpdGhpbi0kbWF4RGlzdGFuY2UgYnJhbmNoaW5nIHBvaW50LlxuICAgICAgY29uc3QgcmVzdWx0ID0ge3Jlc3VsdDogZmFsc2V9O1xuICAgICAgZXhwYW5kQXJyYXlzSW5CcmFuY2hlcyhicmFuY2hlZFZhbHVlcykuZXZlcnkoYnJhbmNoID0+IHtcbiAgICAgICAgLy8gaWYgb3BlcmF0aW9uIGlzIGFuIHVwZGF0ZSwgZG9uJ3Qgc2tpcCBicmFuY2hlcywganVzdCByZXR1cm4gdGhlIGZpcnN0XG4gICAgICAgIC8vIG9uZSAoIzM1OTkpXG4gICAgICAgIGxldCBjdXJEaXN0YW5jZTtcbiAgICAgICAgaWYgKCFtYXRjaGVyLl9pc1VwZGF0ZSkge1xuICAgICAgICAgIGlmICghKHR5cGVvZiBicmFuY2gudmFsdWUgPT09ICdvYmplY3QnKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY3VyRGlzdGFuY2UgPSBkaXN0YW5jZShicmFuY2gudmFsdWUpO1xuXG4gICAgICAgICAgLy8gU2tpcCBicmFuY2hlcyB0aGF0IGFyZW4ndCByZWFsIHBvaW50cyBvciBhcmUgdG9vIGZhciBhd2F5LlxuICAgICAgICAgIGlmIChjdXJEaXN0YW5jZSA9PT0gbnVsbCB8fCBjdXJEaXN0YW5jZSA+IG1heERpc3RhbmNlKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBTa2lwIGFueXRoaW5nIHRoYXQncyBhIHRpZS5cbiAgICAgICAgICBpZiAocmVzdWx0LmRpc3RhbmNlICE9PSB1bmRlZmluZWQgJiYgcmVzdWx0LmRpc3RhbmNlIDw9IGN1ckRpc3RhbmNlKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXN1bHQucmVzdWx0ID0gdHJ1ZTtcbiAgICAgICAgcmVzdWx0LmRpc3RhbmNlID0gY3VyRGlzdGFuY2U7XG5cbiAgICAgICAgaWYgKGJyYW5jaC5hcnJheUluZGljZXMpIHtcbiAgICAgICAgICByZXN1bHQuYXJyYXlJbmRpY2VzID0gYnJhbmNoLmFycmF5SW5kaWNlcztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkZWxldGUgcmVzdWx0LmFycmF5SW5kaWNlcztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiAhbWF0Y2hlci5faXNVcGRhdGU7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9LFxufTtcblxuLy8gTkI6IFdlIGFyZSBjaGVhdGluZyBhbmQgdXNpbmcgdGhpcyBmdW5jdGlvbiB0byBpbXBsZW1lbnQgJ0FORCcgZm9yIGJvdGhcbi8vICdkb2N1bWVudCBtYXRjaGVycycgYW5kICdicmFuY2hlZCBtYXRjaGVycycuIFRoZXkgYm90aCByZXR1cm4gcmVzdWx0IG9iamVjdHNcbi8vIGJ1dCB0aGUgYXJndW1lbnQgaXMgZGlmZmVyZW50OiBmb3IgdGhlIGZvcm1lciBpdCdzIGEgd2hvbGUgZG9jLCB3aGVyZWFzIGZvclxuLy8gdGhlIGxhdHRlciBpdCdzIGFuIGFycmF5IG9mICdicmFuY2hlZCB2YWx1ZXMnLlxuZnVuY3Rpb24gYW5kU29tZU1hdGNoZXJzKHN1Yk1hdGNoZXJzKSB7XG4gIGlmIChzdWJNYXRjaGVycy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gZXZlcnl0aGluZ01hdGNoZXI7XG4gIH1cblxuICBpZiAoc3ViTWF0Y2hlcnMubGVuZ3RoID09PSAxKSB7XG4gICAgcmV0dXJuIHN1Yk1hdGNoZXJzWzBdO1xuICB9XG5cbiAgcmV0dXJuIGRvY09yQnJhbmNoZXMgPT4ge1xuICAgIGNvbnN0IG1hdGNoID0ge307XG4gICAgbWF0Y2gucmVzdWx0ID0gc3ViTWF0Y2hlcnMuZXZlcnkoZm4gPT4ge1xuICAgICAgY29uc3Qgc3ViUmVzdWx0ID0gZm4oZG9jT3JCcmFuY2hlcyk7XG5cbiAgICAgIC8vIENvcHkgYSAnZGlzdGFuY2UnIG51bWJlciBvdXQgb2YgdGhlIGZpcnN0IHN1Yi1tYXRjaGVyIHRoYXQgaGFzXG4gICAgICAvLyBvbmUuIFllcywgdGhpcyBtZWFucyB0aGF0IGlmIHRoZXJlIGFyZSBtdWx0aXBsZSAkbmVhciBmaWVsZHMgaW4gYVxuICAgICAgLy8gcXVlcnksIHNvbWV0aGluZyBhcmJpdHJhcnkgaGFwcGVuczsgdGhpcyBhcHBlYXJzIHRvIGJlIGNvbnNpc3RlbnQgd2l0aFxuICAgICAgLy8gTW9uZ28uXG4gICAgICBpZiAoc3ViUmVzdWx0LnJlc3VsdCAmJlxuICAgICAgICAgIHN1YlJlc3VsdC5kaXN0YW5jZSAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgICAgbWF0Y2guZGlzdGFuY2UgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBtYXRjaC5kaXN0YW5jZSA9IHN1YlJlc3VsdC5kaXN0YW5jZTtcbiAgICAgIH1cblxuICAgICAgLy8gU2ltaWxhcmx5LCBwcm9wYWdhdGUgYXJyYXlJbmRpY2VzIGZyb20gc3ViLW1hdGNoZXJzLi4uIGJ1dCB0byBtYXRjaFxuICAgICAgLy8gTW9uZ29EQiBiZWhhdmlvciwgdGhpcyB0aW1lIHRoZSAqbGFzdCogc3ViLW1hdGNoZXIgd2l0aCBhcnJheUluZGljZXNcbiAgICAgIC8vIHdpbnMuXG4gICAgICBpZiAoc3ViUmVzdWx0LnJlc3VsdCAmJiBzdWJSZXN1bHQuYXJyYXlJbmRpY2VzKSB7XG4gICAgICAgIG1hdGNoLmFycmF5SW5kaWNlcyA9IHN1YlJlc3VsdC5hcnJheUluZGljZXM7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzdWJSZXN1bHQucmVzdWx0O1xuICAgIH0pO1xuXG4gICAgLy8gSWYgd2UgZGlkbid0IGFjdHVhbGx5IG1hdGNoLCBmb3JnZXQgYW55IGV4dHJhIG1ldGFkYXRhIHdlIGNhbWUgdXAgd2l0aC5cbiAgICBpZiAoIW1hdGNoLnJlc3VsdCkge1xuICAgICAgZGVsZXRlIG1hdGNoLmRpc3RhbmNlO1xuICAgICAgZGVsZXRlIG1hdGNoLmFycmF5SW5kaWNlcztcbiAgICB9XG5cbiAgICByZXR1cm4gbWF0Y2g7XG4gIH07XG59XG5cbmNvbnN0IGFuZERvY3VtZW50TWF0Y2hlcnMgPSBhbmRTb21lTWF0Y2hlcnM7XG5jb25zdCBhbmRCcmFuY2hlZE1hdGNoZXJzID0gYW5kU29tZU1hdGNoZXJzO1xuXG5mdW5jdGlvbiBjb21waWxlQXJyYXlPZkRvY3VtZW50U2VsZWN0b3JzKHNlbGVjdG9ycywgbWF0Y2hlciwgaW5FbGVtTWF0Y2gpIHtcbiAgaWYgKCFBcnJheS5pc0FycmF5KHNlbGVjdG9ycykgfHwgc2VsZWN0b3JzLmxlbmd0aCA9PT0gMCkge1xuICAgIHRocm93IEVycm9yKCckYW5kLyRvci8kbm9yIG11c3QgYmUgbm9uZW1wdHkgYXJyYXknKTtcbiAgfVxuXG4gIHJldHVybiBzZWxlY3RvcnMubWFwKHN1YlNlbGVjdG9yID0+IHtcbiAgICBpZiAoIUxvY2FsQ29sbGVjdGlvbi5faXNQbGFpbk9iamVjdChzdWJTZWxlY3RvcikpIHtcbiAgICAgIHRocm93IEVycm9yKCckb3IvJGFuZC8kbm9yIGVudHJpZXMgbmVlZCB0byBiZSBmdWxsIG9iamVjdHMnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY29tcGlsZURvY3VtZW50U2VsZWN0b3Ioc3ViU2VsZWN0b3IsIG1hdGNoZXIsIHtpbkVsZW1NYXRjaH0pO1xuICB9KTtcbn1cblxuLy8gVGFrZXMgaW4gYSBzZWxlY3RvciB0aGF0IGNvdWxkIG1hdGNoIGEgZnVsbCBkb2N1bWVudCAoZWcsIHRoZSBvcmlnaW5hbFxuLy8gc2VsZWN0b3IpLiBSZXR1cm5zIGEgZnVuY3Rpb24gbWFwcGluZyBkb2N1bWVudC0+cmVzdWx0IG9iamVjdC5cbi8vXG4vLyBtYXRjaGVyIGlzIHRoZSBNYXRjaGVyIG9iamVjdCB3ZSBhcmUgY29tcGlsaW5nLlxuLy9cbi8vIElmIHRoaXMgaXMgdGhlIHJvb3QgZG9jdW1lbnQgc2VsZWN0b3IgKGllLCBub3Qgd3JhcHBlZCBpbiAkYW5kIG9yIHRoZSBsaWtlKSxcbi8vIHRoZW4gaXNSb290IGlzIHRydWUuIChUaGlzIGlzIHVzZWQgYnkgJG5lYXIuKVxuZXhwb3J0IGZ1bmN0aW9uIGNvbXBpbGVEb2N1bWVudFNlbGVjdG9yKGRvY1NlbGVjdG9yLCBtYXRjaGVyLCBvcHRpb25zID0ge30pIHtcbiAgY29uc3QgZG9jTWF0Y2hlcnMgPSBPYmplY3Qua2V5cyhkb2NTZWxlY3RvcikubWFwKGtleSA9PiB7XG4gICAgY29uc3Qgc3ViU2VsZWN0b3IgPSBkb2NTZWxlY3RvcltrZXldO1xuXG4gICAgaWYgKGtleS5zdWJzdHIoMCwgMSkgPT09ICckJykge1xuICAgICAgLy8gT3V0ZXIgb3BlcmF0b3JzIGFyZSBlaXRoZXIgbG9naWNhbCBvcGVyYXRvcnMgKHRoZXkgcmVjdXJzZSBiYWNrIGludG9cbiAgICAgIC8vIHRoaXMgZnVuY3Rpb24pLCBvciAkd2hlcmUuXG4gICAgICBpZiAoIWhhc093bi5jYWxsKExPR0lDQUxfT1BFUkFUT1JTLCBrZXkpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5yZWNvZ25pemVkIGxvZ2ljYWwgb3BlcmF0b3I6ICR7a2V5fWApO1xuICAgICAgfVxuXG4gICAgICBtYXRjaGVyLl9pc1NpbXBsZSA9IGZhbHNlO1xuICAgICAgcmV0dXJuIExPR0lDQUxfT1BFUkFUT1JTW2tleV0oc3ViU2VsZWN0b3IsIG1hdGNoZXIsIG9wdGlvbnMuaW5FbGVtTWF0Y2gpO1xuICAgIH1cblxuICAgIC8vIFJlY29yZCB0aGlzIHBhdGgsIGJ1dCBvbmx5IGlmIHdlIGFyZW4ndCBpbiBhbiBlbGVtTWF0Y2hlciwgc2luY2UgaW4gYW5cbiAgICAvLyBlbGVtTWF0Y2ggdGhpcyBpcyBhIHBhdGggaW5zaWRlIGFuIG9iamVjdCBpbiBhbiBhcnJheSwgbm90IGluIHRoZSBkb2NcbiAgICAvLyByb290LlxuICAgIGlmICghb3B0aW9ucy5pbkVsZW1NYXRjaCkge1xuICAgICAgbWF0Y2hlci5fcmVjb3JkUGF0aFVzZWQoa2V5KTtcbiAgICB9XG5cbiAgICAvLyBEb24ndCBhZGQgYSBtYXRjaGVyIGlmIHN1YlNlbGVjdG9yIGlzIGEgZnVuY3Rpb24gLS0gdGhpcyBpcyB0byBtYXRjaFxuICAgIC8vIHRoZSBiZWhhdmlvciBvZiBNZXRlb3Igb24gdGhlIHNlcnZlciAoaW5oZXJpdGVkIGZyb20gdGhlIG5vZGUgbW9uZ29kYlxuICAgIC8vIGRyaXZlciksIHdoaWNoIGlzIHRvIGlnbm9yZSBhbnkgcGFydCBvZiBhIHNlbGVjdG9yIHdoaWNoIGlzIGEgZnVuY3Rpb24uXG4gICAgaWYgKHR5cGVvZiBzdWJTZWxlY3RvciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCBsb29rVXBCeUluZGV4ID0gbWFrZUxvb2t1cEZ1bmN0aW9uKGtleSk7XG4gICAgY29uc3QgdmFsdWVNYXRjaGVyID0gY29tcGlsZVZhbHVlU2VsZWN0b3IoXG4gICAgICBzdWJTZWxlY3RvcixcbiAgICAgIG1hdGNoZXIsXG4gICAgICBvcHRpb25zLmlzUm9vdFxuICAgICk7XG5cbiAgICByZXR1cm4gZG9jID0+IHZhbHVlTWF0Y2hlcihsb29rVXBCeUluZGV4KGRvYykpO1xuICB9KS5maWx0ZXIoQm9vbGVhbik7XG5cbiAgcmV0dXJuIGFuZERvY3VtZW50TWF0Y2hlcnMoZG9jTWF0Y2hlcnMpO1xufVxuXG4vLyBUYWtlcyBpbiBhIHNlbGVjdG9yIHRoYXQgY291bGQgbWF0Y2ggYSBrZXktaW5kZXhlZCB2YWx1ZSBpbiBhIGRvY3VtZW50OyBlZyxcbi8vIHskZ3Q6IDUsICRsdDogOX0sIG9yIGEgcmVndWxhciBleHByZXNzaW9uLCBvciBhbnkgbm9uLWV4cHJlc3Npb24gb2JqZWN0ICh0b1xuLy8gaW5kaWNhdGUgZXF1YWxpdHkpLiAgUmV0dXJucyBhIGJyYW5jaGVkIG1hdGNoZXI6IGEgZnVuY3Rpb24gbWFwcGluZ1xuLy8gW2JyYW5jaGVkIHZhbHVlXS0+cmVzdWx0IG9iamVjdC5cbmZ1bmN0aW9uIGNvbXBpbGVWYWx1ZVNlbGVjdG9yKHZhbHVlU2VsZWN0b3IsIG1hdGNoZXIsIGlzUm9vdCkge1xuICBpZiAodmFsdWVTZWxlY3RvciBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgIG1hdGNoZXIuX2lzU2ltcGxlID0gZmFsc2U7XG4gICAgcmV0dXJuIGNvbnZlcnRFbGVtZW50TWF0Y2hlclRvQnJhbmNoZWRNYXRjaGVyKFxuICAgICAgcmVnZXhwRWxlbWVudE1hdGNoZXIodmFsdWVTZWxlY3RvcilcbiAgICApO1xuICB9XG5cbiAgaWYgKGlzT3BlcmF0b3JPYmplY3QodmFsdWVTZWxlY3RvcikpIHtcbiAgICByZXR1cm4gb3BlcmF0b3JCcmFuY2hlZE1hdGNoZXIodmFsdWVTZWxlY3RvciwgbWF0Y2hlciwgaXNSb290KTtcbiAgfVxuXG4gIHJldHVybiBjb252ZXJ0RWxlbWVudE1hdGNoZXJUb0JyYW5jaGVkTWF0Y2hlcihcbiAgICBlcXVhbGl0eUVsZW1lbnRNYXRjaGVyKHZhbHVlU2VsZWN0b3IpXG4gICk7XG59XG5cbi8vIEdpdmVuIGFuIGVsZW1lbnQgbWF0Y2hlciAod2hpY2ggZXZhbHVhdGVzIGEgc2luZ2xlIHZhbHVlKSwgcmV0dXJucyBhIGJyYW5jaGVkXG4vLyB2YWx1ZSAod2hpY2ggZXZhbHVhdGVzIHRoZSBlbGVtZW50IG1hdGNoZXIgb24gYWxsIHRoZSBicmFuY2hlcyBhbmQgcmV0dXJucyBhXG4vLyBtb3JlIHN0cnVjdHVyZWQgcmV0dXJuIHZhbHVlIHBvc3NpYmx5IGluY2x1ZGluZyBhcnJheUluZGljZXMpLlxuZnVuY3Rpb24gY29udmVydEVsZW1lbnRNYXRjaGVyVG9CcmFuY2hlZE1hdGNoZXIoZWxlbWVudE1hdGNoZXIsIG9wdGlvbnMgPSB7fSkge1xuICByZXR1cm4gYnJhbmNoZXMgPT4ge1xuICAgIGNvbnN0IGV4cGFuZGVkID0gb3B0aW9ucy5kb250RXhwYW5kTGVhZkFycmF5c1xuICAgICAgPyBicmFuY2hlc1xuICAgICAgOiBleHBhbmRBcnJheXNJbkJyYW5jaGVzKGJyYW5jaGVzLCBvcHRpb25zLmRvbnRJbmNsdWRlTGVhZkFycmF5cyk7XG5cbiAgICBjb25zdCBtYXRjaCA9IHt9O1xuICAgIG1hdGNoLnJlc3VsdCA9IGV4cGFuZGVkLnNvbWUoZWxlbWVudCA9PiB7XG4gICAgICBsZXQgbWF0Y2hlZCA9IGVsZW1lbnRNYXRjaGVyKGVsZW1lbnQudmFsdWUpO1xuXG4gICAgICAvLyBTcGVjaWFsIGNhc2UgZm9yICRlbGVtTWF0Y2g6IGl0IG1lYW5zIFwidHJ1ZSwgYW5kIHVzZSB0aGlzIGFzIGFuIGFycmF5XG4gICAgICAvLyBpbmRleCBpZiBJIGRpZG4ndCBhbHJlYWR5IGhhdmUgb25lXCIuXG4gICAgICBpZiAodHlwZW9mIG1hdGNoZWQgPT09ICdudW1iZXInKSB7XG4gICAgICAgIC8vIFhYWCBUaGlzIGNvZGUgZGF0ZXMgZnJvbSB3aGVuIHdlIG9ubHkgc3RvcmVkIGEgc2luZ2xlIGFycmF5IGluZGV4XG4gICAgICAgIC8vIChmb3IgdGhlIG91dGVybW9zdCBhcnJheSkuIFNob3VsZCB3ZSBiZSBhbHNvIGluY2x1ZGluZyBkZWVwZXIgYXJyYXlcbiAgICAgICAgLy8gaW5kaWNlcyBmcm9tIHRoZSAkZWxlbU1hdGNoIG1hdGNoP1xuICAgICAgICBpZiAoIWVsZW1lbnQuYXJyYXlJbmRpY2VzKSB7XG4gICAgICAgICAgZWxlbWVudC5hcnJheUluZGljZXMgPSBbbWF0Y2hlZF07XG4gICAgICAgIH1cblxuICAgICAgICBtYXRjaGVkID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgLy8gSWYgc29tZSBlbGVtZW50IG1hdGNoZWQsIGFuZCBpdCdzIHRhZ2dlZCB3aXRoIGFycmF5IGluZGljZXMsIGluY2x1ZGVcbiAgICAgIC8vIHRob3NlIGluZGljZXMgaW4gb3VyIHJlc3VsdCBvYmplY3QuXG4gICAgICBpZiAobWF0Y2hlZCAmJiBlbGVtZW50LmFycmF5SW5kaWNlcykge1xuICAgICAgICBtYXRjaC5hcnJheUluZGljZXMgPSBlbGVtZW50LmFycmF5SW5kaWNlcztcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG1hdGNoZWQ7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbWF0Y2g7XG4gIH07XG59XG5cbi8vIEhlbHBlcnMgZm9yICRuZWFyLlxuZnVuY3Rpb24gZGlzdGFuY2VDb29yZGluYXRlUGFpcnMoYSwgYikge1xuICBjb25zdCBwb2ludEEgPSBwb2ludFRvQXJyYXkoYSk7XG4gIGNvbnN0IHBvaW50QiA9IHBvaW50VG9BcnJheShiKTtcblxuICByZXR1cm4gTWF0aC5oeXBvdChwb2ludEFbMF0gLSBwb2ludEJbMF0sIHBvaW50QVsxXSAtIHBvaW50QlsxXSk7XG59XG5cbi8vIFRha2VzIHNvbWV0aGluZyB0aGF0IGlzIG5vdCBhbiBvcGVyYXRvciBvYmplY3QgYW5kIHJldHVybnMgYW4gZWxlbWVudCBtYXRjaGVyXG4vLyBmb3IgZXF1YWxpdHkgd2l0aCB0aGF0IHRoaW5nLlxuZXhwb3J0IGZ1bmN0aW9uIGVxdWFsaXR5RWxlbWVudE1hdGNoZXIoZWxlbWVudFNlbGVjdG9yKSB7XG4gIGlmIChpc09wZXJhdG9yT2JqZWN0KGVsZW1lbnRTZWxlY3RvcikpIHtcbiAgICB0aHJvdyBFcnJvcignQ2FuXFwndCBjcmVhdGUgZXF1YWxpdHlWYWx1ZVNlbGVjdG9yIGZvciBvcGVyYXRvciBvYmplY3QnKTtcbiAgfVxuXG4gIC8vIFNwZWNpYWwtY2FzZTogbnVsbCBhbmQgdW5kZWZpbmVkIGFyZSBlcXVhbCAoaWYgeW91IGdvdCB1bmRlZmluZWQgaW4gdGhlcmVcbiAgLy8gc29tZXdoZXJlLCBvciBpZiB5b3UgZ290IGl0IGR1ZSB0byBzb21lIGJyYW5jaCBiZWluZyBub24tZXhpc3RlbnQgaW4gdGhlXG4gIC8vIHdlaXJkIHNwZWNpYWwgY2FzZSksIGV2ZW4gdGhvdWdoIHRoZXkgYXJlbid0IHdpdGggRUpTT04uZXF1YWxzLlxuICAvLyB1bmRlZmluZWQgb3IgbnVsbFxuICBpZiAoZWxlbWVudFNlbGVjdG9yID09IG51bGwpIHtcbiAgICByZXR1cm4gdmFsdWUgPT4gdmFsdWUgPT0gbnVsbDtcbiAgfVxuXG4gIHJldHVybiB2YWx1ZSA9PiBMb2NhbENvbGxlY3Rpb24uX2YuX2VxdWFsKGVsZW1lbnRTZWxlY3RvciwgdmFsdWUpO1xufVxuXG5mdW5jdGlvbiBldmVyeXRoaW5nTWF0Y2hlcihkb2NPckJyYW5jaGVkVmFsdWVzKSB7XG4gIHJldHVybiB7cmVzdWx0OiB0cnVlfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGV4cGFuZEFycmF5c0luQnJhbmNoZXMoYnJhbmNoZXMsIHNraXBUaGVBcnJheXMpIHtcbiAgY29uc3QgYnJhbmNoZXNPdXQgPSBbXTtcblxuICBicmFuY2hlcy5mb3JFYWNoKGJyYW5jaCA9PiB7XG4gICAgY29uc3QgdGhpc0lzQXJyYXkgPSBBcnJheS5pc0FycmF5KGJyYW5jaC52YWx1ZSk7XG5cbiAgICAvLyBXZSBpbmNsdWRlIHRoZSBicmFuY2ggaXRzZWxmLCAqVU5MRVNTKiB3ZSBpdCdzIGFuIGFycmF5IHRoYXQgd2UncmUgZ29pbmdcbiAgICAvLyB0byBpdGVyYXRlIGFuZCB3ZSdyZSB0b2xkIHRvIHNraXAgYXJyYXlzLiAgKFRoYXQncyByaWdodCwgd2UgaW5jbHVkZSBzb21lXG4gICAgLy8gYXJyYXlzIGV2ZW4gc2tpcFRoZUFycmF5cyBpcyB0cnVlOiB0aGVzZSBhcmUgYXJyYXlzIHRoYXQgd2VyZSBmb3VuZCB2aWFcbiAgICAvLyBleHBsaWNpdCBudW1lcmljYWwgaW5kaWNlcy4pXG4gICAgaWYgKCEoc2tpcFRoZUFycmF5cyAmJiB0aGlzSXNBcnJheSAmJiAhYnJhbmNoLmRvbnRJdGVyYXRlKSkge1xuICAgICAgYnJhbmNoZXNPdXQucHVzaCh7YXJyYXlJbmRpY2VzOiBicmFuY2guYXJyYXlJbmRpY2VzLCB2YWx1ZTogYnJhbmNoLnZhbHVlfSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXNJc0FycmF5ICYmICFicmFuY2guZG9udEl0ZXJhdGUpIHtcbiAgICAgIGJyYW5jaC52YWx1ZS5mb3JFYWNoKCh2YWx1ZSwgaSkgPT4ge1xuICAgICAgICBicmFuY2hlc091dC5wdXNoKHtcbiAgICAgICAgICBhcnJheUluZGljZXM6IChicmFuY2guYXJyYXlJbmRpY2VzIHx8IFtdKS5jb25jYXQoaSksXG4gICAgICAgICAgdmFsdWVcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBicmFuY2hlc091dDtcbn1cblxuLy8gSGVscGVycyBmb3IgJGJpdHNBbGxTZXQvJGJpdHNBbnlTZXQvJGJpdHNBbGxDbGVhci8kYml0c0FueUNsZWFyLlxuZnVuY3Rpb24gZ2V0T3BlcmFuZEJpdG1hc2sob3BlcmFuZCwgc2VsZWN0b3IpIHtcbiAgLy8gbnVtZXJpYyBiaXRtYXNrXG4gIC8vIFlvdSBjYW4gcHJvdmlkZSBhIG51bWVyaWMgYml0bWFzayB0byBiZSBtYXRjaGVkIGFnYWluc3QgdGhlIG9wZXJhbmQgZmllbGQuXG4gIC8vIEl0IG11c3QgYmUgcmVwcmVzZW50YWJsZSBhcyBhIG5vbi1uZWdhdGl2ZSAzMi1iaXQgc2lnbmVkIGludGVnZXIuXG4gIC8vIE90aGVyd2lzZSwgJGJpdHNBbGxTZXQgd2lsbCByZXR1cm4gYW4gZXJyb3IuXG4gIGlmIChOdW1iZXIuaXNJbnRlZ2VyKG9wZXJhbmQpICYmIG9wZXJhbmQgPj0gMCkge1xuICAgIHJldHVybiBuZXcgVWludDhBcnJheShuZXcgSW50MzJBcnJheShbb3BlcmFuZF0pLmJ1ZmZlcik7XG4gIH1cblxuICAvLyBiaW5kYXRhIGJpdG1hc2tcbiAgLy8gWW91IGNhbiBhbHNvIHVzZSBhbiBhcmJpdHJhcmlseSBsYXJnZSBCaW5EYXRhIGluc3RhbmNlIGFzIGEgYml0bWFzay5cbiAgaWYgKEVKU09OLmlzQmluYXJ5KG9wZXJhbmQpKSB7XG4gICAgcmV0dXJuIG5ldyBVaW50OEFycmF5KG9wZXJhbmQuYnVmZmVyKTtcbiAgfVxuXG4gIC8vIHBvc2l0aW9uIGxpc3RcbiAgLy8gSWYgcXVlcnlpbmcgYSBsaXN0IG9mIGJpdCBwb3NpdGlvbnMsIGVhY2ggPHBvc2l0aW9uPiBtdXN0IGJlIGEgbm9uLW5lZ2F0aXZlXG4gIC8vIGludGVnZXIuIEJpdCBwb3NpdGlvbnMgc3RhcnQgYXQgMCBmcm9tIHRoZSBsZWFzdCBzaWduaWZpY2FudCBiaXQuXG4gIGlmIChBcnJheS5pc0FycmF5KG9wZXJhbmQpICYmXG4gICAgICBvcGVyYW5kLmV2ZXJ5KHggPT4gTnVtYmVyLmlzSW50ZWdlcih4KSAmJiB4ID49IDApKSB7XG4gICAgY29uc3QgYnVmZmVyID0gbmV3IEFycmF5QnVmZmVyKChNYXRoLm1heCguLi5vcGVyYW5kKSA+PiAzKSArIDEpO1xuICAgIGNvbnN0IHZpZXcgPSBuZXcgVWludDhBcnJheShidWZmZXIpO1xuXG4gICAgb3BlcmFuZC5mb3JFYWNoKHggPT4ge1xuICAgICAgdmlld1t4ID4+IDNdIHw9IDEgPDwgKHggJiAweDcpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHZpZXc7XG4gIH1cblxuICAvLyBiYWQgb3BlcmFuZFxuICB0aHJvdyBFcnJvcihcbiAgICBgb3BlcmFuZCB0byAke3NlbGVjdG9yfSBtdXN0IGJlIGEgbnVtZXJpYyBiaXRtYXNrIChyZXByZXNlbnRhYmxlIGFzIGEgYCArXG4gICAgJ25vbi1uZWdhdGl2ZSAzMi1iaXQgc2lnbmVkIGludGVnZXIpLCBhIGJpbmRhdGEgYml0bWFzayBvciBhbiBhcnJheSB3aXRoICcgK1xuICAgICdiaXQgcG9zaXRpb25zIChub24tbmVnYXRpdmUgaW50ZWdlcnMpJ1xuICApO1xufVxuXG5mdW5jdGlvbiBnZXRWYWx1ZUJpdG1hc2sodmFsdWUsIGxlbmd0aCkge1xuICAvLyBUaGUgZmllbGQgdmFsdWUgbXVzdCBiZSBlaXRoZXIgbnVtZXJpY2FsIG9yIGEgQmluRGF0YSBpbnN0YW5jZS4gT3RoZXJ3aXNlLFxuICAvLyAkYml0cy4uLiB3aWxsIG5vdCBtYXRjaCB0aGUgY3VycmVudCBkb2N1bWVudC5cblxuICAvLyBudW1lcmljYWxcbiAgaWYgKE51bWJlci5pc1NhZmVJbnRlZ2VyKHZhbHVlKSkge1xuICAgIC8vICRiaXRzLi4uIHdpbGwgbm90IG1hdGNoIG51bWVyaWNhbCB2YWx1ZXMgdGhhdCBjYW5ub3QgYmUgcmVwcmVzZW50ZWQgYXMgYVxuICAgIC8vIHNpZ25lZCA2NC1iaXQgaW50ZWdlci4gVGhpcyBjYW4gYmUgdGhlIGNhc2UgaWYgYSB2YWx1ZSBpcyBlaXRoZXIgdG9vXG4gICAgLy8gbGFyZ2Ugb3Igc21hbGwgdG8gZml0IGluIGEgc2lnbmVkIDY0LWJpdCBpbnRlZ2VyLCBvciBpZiBpdCBoYXMgYVxuICAgIC8vIGZyYWN0aW9uYWwgY29tcG9uZW50LlxuICAgIGNvbnN0IGJ1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcihcbiAgICAgIE1hdGgubWF4KGxlbmd0aCwgMiAqIFVpbnQzMkFycmF5LkJZVEVTX1BFUl9FTEVNRU5UKVxuICAgICk7XG5cbiAgICBsZXQgdmlldyA9IG5ldyBVaW50MzJBcnJheShidWZmZXIsIDAsIDIpO1xuICAgIHZpZXdbMF0gPSB2YWx1ZSAlICgoMSA8PCAxNikgKiAoMSA8PCAxNikpIHwgMDtcbiAgICB2aWV3WzFdID0gdmFsdWUgLyAoKDEgPDwgMTYpICogKDEgPDwgMTYpKSB8IDA7XG5cbiAgICAvLyBzaWduIGV4dGVuc2lvblxuICAgIGlmICh2YWx1ZSA8IDApIHtcbiAgICAgIHZpZXcgPSBuZXcgVWludDhBcnJheShidWZmZXIsIDIpO1xuICAgICAgdmlldy5mb3JFYWNoKChieXRlLCBpKSA9PiB7XG4gICAgICAgIHZpZXdbaV0gPSAweGZmO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBVaW50OEFycmF5KGJ1ZmZlcik7XG4gIH1cblxuICAvLyBiaW5kYXRhXG4gIGlmIChFSlNPTi5pc0JpbmFyeSh2YWx1ZSkpIHtcbiAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkodmFsdWUuYnVmZmVyKTtcbiAgfVxuXG4gIC8vIG5vIG1hdGNoXG4gIHJldHVybiBmYWxzZTtcbn1cblxuLy8gQWN0dWFsbHkgaW5zZXJ0cyBhIGtleSB2YWx1ZSBpbnRvIHRoZSBzZWxlY3RvciBkb2N1bWVudFxuLy8gSG93ZXZlciwgdGhpcyBjaGVja3MgdGhlcmUgaXMgbm8gYW1iaWd1aXR5IGluIHNldHRpbmdcbi8vIHRoZSB2YWx1ZSBmb3IgdGhlIGdpdmVuIGtleSwgdGhyb3dzIG90aGVyd2lzZVxuZnVuY3Rpb24gaW5zZXJ0SW50b0RvY3VtZW50KGRvY3VtZW50LCBrZXksIHZhbHVlKSB7XG4gIE9iamVjdC5rZXlzKGRvY3VtZW50KS5mb3JFYWNoKGV4aXN0aW5nS2V5ID0+IHtcbiAgICBpZiAoXG4gICAgICAoZXhpc3RpbmdLZXkubGVuZ3RoID4ga2V5Lmxlbmd0aCAmJiBleGlzdGluZ0tleS5pbmRleE9mKGAke2tleX0uYCkgPT09IDApIHx8XG4gICAgICAoa2V5Lmxlbmd0aCA+IGV4aXN0aW5nS2V5Lmxlbmd0aCAmJiBrZXkuaW5kZXhPZihgJHtleGlzdGluZ0tleX0uYCkgPT09IDApXG4gICAgKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBjYW5ub3QgaW5mZXIgcXVlcnkgZmllbGRzIHRvIHNldCwgYm90aCBwYXRocyAnJHtleGlzdGluZ0tleX0nIGFuZCBgICtcbiAgICAgICAgYCcke2tleX0nIGFyZSBtYXRjaGVkYFxuICAgICAgKTtcbiAgICB9IGVsc2UgaWYgKGV4aXN0aW5nS2V5ID09PSBrZXkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYGNhbm5vdCBpbmZlciBxdWVyeSBmaWVsZHMgdG8gc2V0LCBwYXRoICcke2tleX0nIGlzIG1hdGNoZWQgdHdpY2VgXG4gICAgICApO1xuICAgIH1cbiAgfSk7XG5cbiAgZG9jdW1lbnRba2V5XSA9IHZhbHVlO1xufVxuXG4vLyBSZXR1cm5zIGEgYnJhbmNoZWQgbWF0Y2hlciB0aGF0IG1hdGNoZXMgaWZmIHRoZSBnaXZlbiBtYXRjaGVyIGRvZXMgbm90LlxuLy8gTm90ZSB0aGF0IHRoaXMgaW1wbGljaXRseSBcImRlTW9yZ2FuaXplc1wiIHRoZSB3cmFwcGVkIGZ1bmN0aW9uLiAgaWUsIGl0XG4vLyBtZWFucyB0aGF0IEFMTCBicmFuY2ggdmFsdWVzIG5lZWQgdG8gZmFpbCB0byBtYXRjaCBpbm5lckJyYW5jaGVkTWF0Y2hlci5cbmZ1bmN0aW9uIGludmVydEJyYW5jaGVkTWF0Y2hlcihicmFuY2hlZE1hdGNoZXIpIHtcbiAgcmV0dXJuIGJyYW5jaFZhbHVlcyA9PiB7XG4gICAgLy8gV2UgZXhwbGljaXRseSBjaG9vc2UgdG8gc3RyaXAgYXJyYXlJbmRpY2VzIGhlcmU6IGl0IGRvZXNuJ3QgbWFrZSBzZW5zZSB0b1xuICAgIC8vIHNheSBcInVwZGF0ZSB0aGUgYXJyYXkgZWxlbWVudCB0aGF0IGRvZXMgbm90IG1hdGNoIHNvbWV0aGluZ1wiLCBhdCBsZWFzdFxuICAgIC8vIGluIG1vbmdvLWxhbmQuXG4gICAgcmV0dXJuIHtyZXN1bHQ6ICFicmFuY2hlZE1hdGNoZXIoYnJhbmNoVmFsdWVzKS5yZXN1bHR9O1xuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNJbmRleGFibGUob2JqKSB7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KG9iaikgfHwgTG9jYWxDb2xsZWN0aW9uLl9pc1BsYWluT2JqZWN0KG9iaik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc051bWVyaWNLZXkocykge1xuICByZXR1cm4gL15bMC05XSskLy50ZXN0KHMpO1xufVxuXG4vLyBSZXR1cm5zIHRydWUgaWYgdGhpcyBpcyBhbiBvYmplY3Qgd2l0aCBhdCBsZWFzdCBvbmUga2V5IGFuZCBhbGwga2V5cyBiZWdpblxuLy8gd2l0aCAkLiAgVW5sZXNzIGluY29uc2lzdGVudE9LIGlzIHNldCwgdGhyb3dzIGlmIHNvbWUga2V5cyBiZWdpbiB3aXRoICQgYW5kXG4vLyBvdGhlcnMgZG9uJ3QuXG5leHBvcnQgZnVuY3Rpb24gaXNPcGVyYXRvck9iamVjdCh2YWx1ZVNlbGVjdG9yLCBpbmNvbnNpc3RlbnRPSykge1xuICBpZiAoIUxvY2FsQ29sbGVjdGlvbi5faXNQbGFpbk9iamVjdCh2YWx1ZVNlbGVjdG9yKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGxldCB0aGVzZUFyZU9wZXJhdG9ycyA9IHVuZGVmaW5lZDtcbiAgT2JqZWN0LmtleXModmFsdWVTZWxlY3RvcikuZm9yRWFjaChzZWxLZXkgPT4ge1xuICAgIGNvbnN0IHRoaXNJc09wZXJhdG9yID0gc2VsS2V5LnN1YnN0cigwLCAxKSA9PT0gJyQnIHx8IHNlbEtleSA9PT0gJ2RpZmYnO1xuXG4gICAgaWYgKHRoZXNlQXJlT3BlcmF0b3JzID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoZXNlQXJlT3BlcmF0b3JzID0gdGhpc0lzT3BlcmF0b3I7XG4gICAgfSBlbHNlIGlmICh0aGVzZUFyZU9wZXJhdG9ycyAhPT0gdGhpc0lzT3BlcmF0b3IpIHtcbiAgICAgIGlmICghaW5jb25zaXN0ZW50T0spIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBJbmNvbnNpc3RlbnQgb3BlcmF0b3I6ICR7SlNPTi5zdHJpbmdpZnkodmFsdWVTZWxlY3Rvcil9YFxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICB0aGVzZUFyZU9wZXJhdG9ycyA9IGZhbHNlO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuICEhdGhlc2VBcmVPcGVyYXRvcnM7IC8vIHt9IGhhcyBubyBvcGVyYXRvcnNcbn1cblxuLy8gSGVscGVyIGZvciAkbHQvJGd0LyRsdGUvJGd0ZS5cbmZ1bmN0aW9uIG1ha2VJbmVxdWFsaXR5KGNtcFZhbHVlQ29tcGFyYXRvcikge1xuICByZXR1cm4ge1xuICAgIGNvbXBpbGVFbGVtZW50U2VsZWN0b3Iob3BlcmFuZCkge1xuICAgICAgLy8gQXJyYXlzIG5ldmVyIGNvbXBhcmUgZmFsc2Ugd2l0aCBub24tYXJyYXlzIGZvciBhbnkgaW5lcXVhbGl0eS5cbiAgICAgIC8vIFhYWCBUaGlzIHdhcyBiZWhhdmlvciB3ZSBvYnNlcnZlZCBpbiBwcmUtcmVsZWFzZSBNb25nb0RCIDIuNSwgYnV0XG4gICAgICAvLyAgICAgaXQgc2VlbXMgdG8gaGF2ZSBiZWVuIHJldmVydGVkLlxuICAgICAgLy8gICAgIFNlZSBodHRwczovL2ppcmEubW9uZ29kYi5vcmcvYnJvd3NlL1NFUlZFUi0xMTQ0NFxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkob3BlcmFuZCkpIHtcbiAgICAgICAgcmV0dXJuICgpID0+IGZhbHNlO1xuICAgICAgfVxuXG4gICAgICAvLyBTcGVjaWFsIGNhc2U6IGNvbnNpZGVyIHVuZGVmaW5lZCBhbmQgbnVsbCB0aGUgc2FtZSAoc28gdHJ1ZSB3aXRoXG4gICAgICAvLyAkZ3RlLyRsdGUpLlxuICAgICAgaWYgKG9wZXJhbmQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBvcGVyYW5kID0gbnVsbDtcbiAgICAgIH1cblxuICAgICAgY29uc3Qgb3BlcmFuZFR5cGUgPSBMb2NhbENvbGxlY3Rpb24uX2YuX3R5cGUob3BlcmFuZCk7XG5cbiAgICAgIHJldHVybiB2YWx1ZSA9PiB7XG4gICAgICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgdmFsdWUgPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ29tcGFyaXNvbnMgYXJlIG5ldmVyIHRydWUgYW1vbmcgdGhpbmdzIG9mIGRpZmZlcmVudCB0eXBlIChleGNlcHRcbiAgICAgICAgLy8gbnVsbCB2cyB1bmRlZmluZWQpLlxuICAgICAgICBpZiAoTG9jYWxDb2xsZWN0aW9uLl9mLl90eXBlKHZhbHVlKSAhPT0gb3BlcmFuZFR5cGUpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY21wVmFsdWVDb21wYXJhdG9yKExvY2FsQ29sbGVjdGlvbi5fZi5fY21wKHZhbHVlLCBvcGVyYW5kKSk7XG4gICAgICB9O1xuICAgIH0sXG4gIH07XG59XG5cbi8vIG1ha2VMb29rdXBGdW5jdGlvbihrZXkpIHJldHVybnMgYSBsb29rdXAgZnVuY3Rpb24uXG4vL1xuLy8gQSBsb29rdXAgZnVuY3Rpb24gdGFrZXMgaW4gYSBkb2N1bWVudCBhbmQgcmV0dXJucyBhbiBhcnJheSBvZiBtYXRjaGluZ1xuLy8gYnJhbmNoZXMuICBJZiBubyBhcnJheXMgYXJlIGZvdW5kIHdoaWxlIGxvb2tpbmcgdXAgdGhlIGtleSwgdGhpcyBhcnJheSB3aWxsXG4vLyBoYXZlIGV4YWN0bHkgb25lIGJyYW5jaGVzIChwb3NzaWJseSAndW5kZWZpbmVkJywgaWYgc29tZSBzZWdtZW50IG9mIHRoZSBrZXlcbi8vIHdhcyBub3QgZm91bmQpLlxuLy9cbi8vIElmIGFycmF5cyBhcmUgZm91bmQgaW4gdGhlIG1pZGRsZSwgdGhpcyBjYW4gaGF2ZSBtb3JlIHRoYW4gb25lIGVsZW1lbnQsIHNpbmNlXG4vLyB3ZSAnYnJhbmNoJy4gV2hlbiB3ZSAnYnJhbmNoJywgaWYgdGhlcmUgYXJlIG1vcmUga2V5IHNlZ21lbnRzIHRvIGxvb2sgdXAsXG4vLyB0aGVuIHdlIG9ubHkgcHVyc3VlIGJyYW5jaGVzIHRoYXQgYXJlIHBsYWluIG9iamVjdHMgKG5vdCBhcnJheXMgb3Igc2NhbGFycykuXG4vLyBUaGlzIG1lYW5zIHdlIGNhbiBhY3R1YWxseSBlbmQgdXAgd2l0aCBubyBicmFuY2hlcyFcbi8vXG4vLyBXZSBkbyAqTk9UKiBicmFuY2ggb24gYXJyYXlzIHRoYXQgYXJlIGZvdW5kIGF0IHRoZSBlbmQgKGllLCBhdCB0aGUgbGFzdFxuLy8gZG90dGVkIG1lbWJlciBvZiB0aGUga2V5KS4gV2UganVzdCByZXR1cm4gdGhhdCBhcnJheTsgaWYgeW91IHdhbnQgdG9cbi8vIGVmZmVjdGl2ZWx5ICdicmFuY2gnIG92ZXIgdGhlIGFycmF5J3MgdmFsdWVzLCBwb3N0LXByb2Nlc3MgdGhlIGxvb2t1cFxuLy8gZnVuY3Rpb24gd2l0aCBleHBhbmRBcnJheXNJbkJyYW5jaGVzLlxuLy9cbi8vIEVhY2ggYnJhbmNoIGlzIGFuIG9iamVjdCB3aXRoIGtleXM6XG4vLyAgLSB2YWx1ZTogdGhlIHZhbHVlIGF0IHRoZSBicmFuY2hcbi8vICAtIGRvbnRJdGVyYXRlOiBhbiBvcHRpb25hbCBib29sOyBpZiB0cnVlLCBpdCBtZWFucyB0aGF0ICd2YWx1ZScgaXMgYW4gYXJyYXlcbi8vICAgIHRoYXQgZXhwYW5kQXJyYXlzSW5CcmFuY2hlcyBzaG91bGQgTk9UIGV4cGFuZC4gVGhpcyBzcGVjaWZpY2FsbHkgaGFwcGVuc1xuLy8gICAgd2hlbiB0aGVyZSBpcyBhIG51bWVyaWMgaW5kZXggaW4gdGhlIGtleSwgYW5kIGVuc3VyZXMgdGhlXG4vLyAgICBwZXJoYXBzLXN1cnByaXNpbmcgTW9uZ29EQiBiZWhhdmlvciB3aGVyZSB7J2EuMCc6IDV9IGRvZXMgTk9UXG4vLyAgICBtYXRjaCB7YTogW1s1XV19LlxuLy8gIC0gYXJyYXlJbmRpY2VzOiBpZiBhbnkgYXJyYXkgaW5kZXhpbmcgd2FzIGRvbmUgZHVyaW5nIGxvb2t1cCAoZWl0aGVyIGR1ZSB0b1xuLy8gICAgZXhwbGljaXQgbnVtZXJpYyBpbmRpY2VzIG9yIGltcGxpY2l0IGJyYW5jaGluZyksIHRoaXMgd2lsbCBiZSBhbiBhcnJheSBvZlxuLy8gICAgdGhlIGFycmF5IGluZGljZXMgdXNlZCwgZnJvbSBvdXRlcm1vc3QgdG8gaW5uZXJtb3N0OyBpdCBpcyBmYWxzZXkgb3Jcbi8vICAgIGFic2VudCBpZiBubyBhcnJheSBpbmRleCBpcyB1c2VkLiBJZiBhbiBleHBsaWNpdCBudW1lcmljIGluZGV4IGlzIHVzZWQsXG4vLyAgICB0aGUgaW5kZXggd2lsbCBiZSBmb2xsb3dlZCBpbiBhcnJheUluZGljZXMgYnkgdGhlIHN0cmluZyAneCcuXG4vL1xuLy8gICAgTm90ZTogYXJyYXlJbmRpY2VzIGlzIHVzZWQgZm9yIHR3byBwdXJwb3Nlcy4gRmlyc3QsIGl0IGlzIHVzZWQgdG9cbi8vICAgIGltcGxlbWVudCB0aGUgJyQnIG1vZGlmaWVyIGZlYXR1cmUsIHdoaWNoIG9ubHkgZXZlciBsb29rcyBhdCBpdHMgZmlyc3Rcbi8vICAgIGVsZW1lbnQuXG4vL1xuLy8gICAgU2Vjb25kLCBpdCBpcyB1c2VkIGZvciBzb3J0IGtleSBnZW5lcmF0aW9uLCB3aGljaCBuZWVkcyB0byBiZSBhYmxlIHRvIHRlbGxcbi8vICAgIHRoZSBkaWZmZXJlbmNlIGJldHdlZW4gZGlmZmVyZW50IHBhdGhzLiBNb3Jlb3ZlciwgaXQgbmVlZHMgdG9cbi8vICAgIGRpZmZlcmVudGlhdGUgYmV0d2VlbiBleHBsaWNpdCBhbmQgaW1wbGljaXQgYnJhbmNoaW5nLCB3aGljaCBpcyB3aHlcbi8vICAgIHRoZXJlJ3MgdGhlIHNvbWV3aGF0IGhhY2t5ICd4JyBlbnRyeTogdGhpcyBtZWFucyB0aGF0IGV4cGxpY2l0IGFuZFxuLy8gICAgaW1wbGljaXQgYXJyYXkgbG9va3VwcyB3aWxsIGhhdmUgZGlmZmVyZW50IGZ1bGwgYXJyYXlJbmRpY2VzIHBhdGhzLiAoVGhhdFxuLy8gICAgY29kZSBvbmx5IHJlcXVpcmVzIHRoYXQgZGlmZmVyZW50IHBhdGhzIGhhdmUgZGlmZmVyZW50IGFycmF5SW5kaWNlczsgaXRcbi8vICAgIGRvZXNuJ3QgYWN0dWFsbHkgJ3BhcnNlJyBhcnJheUluZGljZXMuIEFzIGFuIGFsdGVybmF0aXZlLCBhcnJheUluZGljZXNcbi8vICAgIGNvdWxkIGNvbnRhaW4gb2JqZWN0cyB3aXRoIGZsYWdzIGxpa2UgJ2ltcGxpY2l0JywgYnV0IEkgdGhpbmsgdGhhdCBvbmx5XG4vLyAgICBtYWtlcyB0aGUgY29kZSBzdXJyb3VuZGluZyB0aGVtIG1vcmUgY29tcGxleC4pXG4vL1xuLy8gICAgKEJ5IHRoZSB3YXksIHRoaXMgZmllbGQgZW5kcyB1cCBnZXR0aW5nIHBhc3NlZCBhcm91bmQgYSBsb3Qgd2l0aG91dFxuLy8gICAgY2xvbmluZywgc28gbmV2ZXIgbXV0YXRlIGFueSBhcnJheUluZGljZXMgZmllbGQvdmFyIGluIHRoaXMgcGFja2FnZSEpXG4vL1xuLy9cbi8vIEF0IHRoZSB0b3AgbGV2ZWwsIHlvdSBtYXkgb25seSBwYXNzIGluIGEgcGxhaW4gb2JqZWN0IG9yIGFycmF5LlxuLy9cbi8vIFNlZSB0aGUgdGVzdCAnbWluaW1vbmdvIC0gbG9va3VwJyBmb3Igc29tZSBleGFtcGxlcyBvZiB3aGF0IGxvb2t1cCBmdW5jdGlvbnNcbi8vIHJldHVybi5cbmV4cG9ydCBmdW5jdGlvbiBtYWtlTG9va3VwRnVuY3Rpb24oa2V5LCBvcHRpb25zID0ge30pIHtcbiAgY29uc3QgcGFydHMgPSBrZXkuc3BsaXQoJy4nKTtcbiAgY29uc3QgZmlyc3RQYXJ0ID0gcGFydHMubGVuZ3RoID8gcGFydHNbMF0gOiAnJztcbiAgY29uc3QgbG9va3VwUmVzdCA9IChcbiAgICBwYXJ0cy5sZW5ndGggPiAxICYmXG4gICAgbWFrZUxvb2t1cEZ1bmN0aW9uKHBhcnRzLnNsaWNlKDEpLmpvaW4oJy4nKSwgb3B0aW9ucylcbiAgKTtcblxuICBmdW5jdGlvbiBidWlsZFJlc3VsdChhcnJheUluZGljZXMsIGRvbnRJdGVyYXRlLCB2YWx1ZSkge1xuICAgIHJldHVybiBhcnJheUluZGljZXMgJiYgYXJyYXlJbmRpY2VzLmxlbmd0aFxuICAgICAgPyBkb250SXRlcmF0ZVxuICAgICAgICA/IFt7IGFycmF5SW5kaWNlcywgZG9udEl0ZXJhdGUsIHZhbHVlIH1dXG4gICAgICAgIDogW3sgYXJyYXlJbmRpY2VzLCB2YWx1ZSB9XVxuICAgICAgOiBkb250SXRlcmF0ZVxuICAgICAgICA/IFt7IGRvbnRJdGVyYXRlLCB2YWx1ZSB9XVxuICAgICAgICA6IFt7IHZhbHVlIH1dO1xuICB9XG5cbiAgLy8gRG9jIHdpbGwgYWx3YXlzIGJlIGEgcGxhaW4gb2JqZWN0IG9yIGFuIGFycmF5LlxuICAvLyBhcHBseSBhbiBleHBsaWNpdCBudW1lcmljIGluZGV4LCBhbiBhcnJheS5cbiAgcmV0dXJuIChkb2MsIGFycmF5SW5kaWNlcykgPT4ge1xuICAgIGlmIChBcnJheS5pc0FycmF5KGRvYykpIHtcbiAgICAgIC8vIElmIHdlJ3JlIGJlaW5nIGFza2VkIHRvIGRvIGFuIGludmFsaWQgbG9va3VwIGludG8gYW4gYXJyYXkgKG5vbi1pbnRlZ2VyXG4gICAgICAvLyBvciBvdXQtb2YtYm91bmRzKSwgcmV0dXJuIG5vIHJlc3VsdHMgKHdoaWNoIGlzIGRpZmZlcmVudCBmcm9tIHJldHVybmluZ1xuICAgICAgLy8gYSBzaW5nbGUgdW5kZWZpbmVkIHJlc3VsdCwgaW4gdGhhdCBgbnVsbGAgZXF1YWxpdHkgY2hlY2tzIHdvbid0IG1hdGNoKS5cbiAgICAgIGlmICghKGlzTnVtZXJpY0tleShmaXJzdFBhcnQpICYmIGZpcnN0UGFydCA8IGRvYy5sZW5ndGgpKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICAgIH1cblxuICAgICAgLy8gUmVtZW1iZXIgdGhhdCB3ZSB1c2VkIHRoaXMgYXJyYXkgaW5kZXguIEluY2x1ZGUgYW4gJ3gnIHRvIGluZGljYXRlIHRoYXRcbiAgICAgIC8vIHRoZSBwcmV2aW91cyBpbmRleCBjYW1lIGZyb20gYmVpbmcgY29uc2lkZXJlZCBhcyBhbiBleHBsaWNpdCBhcnJheVxuICAgICAgLy8gaW5kZXggKG5vdCBicmFuY2hpbmcpLlxuICAgICAgYXJyYXlJbmRpY2VzID0gYXJyYXlJbmRpY2VzID8gYXJyYXlJbmRpY2VzLmNvbmNhdCgrZmlyc3RQYXJ0LCAneCcpIDogWytmaXJzdFBhcnQsICd4J107XG4gICAgfVxuXG4gICAgLy8gRG8gb3VyIGZpcnN0IGxvb2t1cC5cbiAgICBjb25zdCBmaXJzdExldmVsID0gZG9jW2ZpcnN0UGFydF07XG5cbiAgICAvLyBJZiB0aGVyZSBpcyBubyBkZWVwZXIgdG8gZGlnLCByZXR1cm4gd2hhdCB3ZSBmb3VuZC5cbiAgICAvL1xuICAgIC8vIElmIHdoYXQgd2UgZm91bmQgaXMgYW4gYXJyYXksIG1vc3QgdmFsdWUgc2VsZWN0b3JzIHdpbGwgY2hvb3NlIHRvIHRyZWF0XG4gICAgLy8gdGhlIGVsZW1lbnRzIG9mIHRoZSBhcnJheSBhcyBtYXRjaGFibGUgdmFsdWVzIGluIHRoZWlyIG93biByaWdodCwgYnV0XG4gICAgLy8gdGhhdCdzIGRvbmUgb3V0c2lkZSBvZiB0aGUgbG9va3VwIGZ1bmN0aW9uLiAoRXhjZXB0aW9ucyB0byB0aGlzIGFyZSAkc2l6ZVxuICAgIC8vIGFuZCBzdHVmZiByZWxhdGluZyB0byAkZWxlbU1hdGNoLiAgZWcsIHthOiB7JHNpemU6IDJ9fSBkb2VzIG5vdCBtYXRjaCB7YTpcbiAgICAvLyBbWzEsIDJdXX0uKVxuICAgIC8vXG4gICAgLy8gVGhhdCBzYWlkLCBpZiB3ZSBqdXN0IGRpZCBhbiAqZXhwbGljaXQqIGFycmF5IGxvb2t1cCAob24gZG9jKSB0byBmaW5kXG4gICAgLy8gZmlyc3RMZXZlbCwgYW5kIGZpcnN0TGV2ZWwgaXMgYW4gYXJyYXkgdG9vLCB3ZSBkbyBOT1Qgd2FudCB2YWx1ZVxuICAgIC8vIHNlbGVjdG9ycyB0byBpdGVyYXRlIG92ZXIgaXQuICBlZywgeydhLjAnOiA1fSBkb2VzIG5vdCBtYXRjaCB7YTogW1s1XV19LlxuICAgIC8vIFNvIGluIHRoYXQgY2FzZSwgd2UgbWFyayB0aGUgcmV0dXJuIHZhbHVlIGFzICdkb24ndCBpdGVyYXRlJy5cbiAgICBpZiAoIWxvb2t1cFJlc3QpIHtcbiAgICAgIHJldHVybiBidWlsZFJlc3VsdChcbiAgICAgICAgYXJyYXlJbmRpY2VzLFxuICAgICAgICBBcnJheS5pc0FycmF5KGRvYykgJiYgQXJyYXkuaXNBcnJheShmaXJzdExldmVsKSxcbiAgICAgICAgZmlyc3RMZXZlbCxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLy8gV2UgbmVlZCB0byBkaWcgZGVlcGVyLiAgQnV0IGlmIHdlIGNhbid0LCBiZWNhdXNlIHdoYXQgd2UndmUgZm91bmQgaXMgbm90XG4gICAgLy8gYW4gYXJyYXkgb3IgcGxhaW4gb2JqZWN0LCB3ZSdyZSBkb25lLiBJZiB3ZSBqdXN0IGRpZCBhIG51bWVyaWMgaW5kZXggaW50b1xuICAgIC8vIGFuIGFycmF5LCB3ZSByZXR1cm4gbm90aGluZyBoZXJlICh0aGlzIGlzIGEgY2hhbmdlIGluIE1vbmdvIDIuNSBmcm9tXG4gICAgLy8gTW9uZ28gMi40LCB3aGVyZSB7J2EuMC5iJzogbnVsbH0gc3RvcHBlZCBtYXRjaGluZyB7YTogWzVdfSkuIE90aGVyd2lzZSxcbiAgICAvLyByZXR1cm4gYSBzaW5nbGUgYHVuZGVmaW5lZGAgKHdoaWNoIGNhbiwgZm9yIGV4YW1wbGUsIG1hdGNoIHZpYSBlcXVhbGl0eVxuICAgIC8vIHdpdGggYG51bGxgKS5cbiAgICBpZiAoIWlzSW5kZXhhYmxlKGZpcnN0TGV2ZWwpKSB7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShkb2MpKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGJ1aWxkUmVzdWx0KGFycmF5SW5kaWNlcywgZmFsc2UsIHVuZGVmaW5lZCk7XG4gICAgfVxuXG4gICAgY29uc3QgcmVzdWx0ID0gW107XG4gICAgY29uc3QgYXBwZW5kVG9SZXN1bHQgPSBtb3JlID0+IHtcbiAgICAgIHJlc3VsdC5wdXNoKC4uLm1vcmUpO1xuICAgIH07XG5cbiAgICAvLyBEaWcgZGVlcGVyOiBsb29rIHVwIHRoZSByZXN0IG9mIHRoZSBwYXJ0cyBvbiB3aGF0ZXZlciB3ZSd2ZSBmb3VuZC5cbiAgICAvLyAobG9va3VwUmVzdCBpcyBzbWFydCBlbm91Z2ggdG8gbm90IHRyeSB0byBkbyBpbnZhbGlkIGxvb2t1cHMgaW50b1xuICAgIC8vIGZpcnN0TGV2ZWwgaWYgaXQncyBhbiBhcnJheS4pXG4gICAgYXBwZW5kVG9SZXN1bHQobG9va3VwUmVzdChmaXJzdExldmVsLCBhcnJheUluZGljZXMpKTtcblxuICAgIC8vIElmIHdlIGZvdW5kIGFuIGFycmF5LCB0aGVuIGluICphZGRpdGlvbiogdG8gcG90ZW50aWFsbHkgdHJlYXRpbmcgdGhlIG5leHRcbiAgICAvLyBwYXJ0IGFzIGEgbGl0ZXJhbCBpbnRlZ2VyIGxvb2t1cCwgd2Ugc2hvdWxkIGFsc28gJ2JyYW5jaCc6IHRyeSB0byBsb29rIHVwXG4gICAgLy8gdGhlIHJlc3Qgb2YgdGhlIHBhcnRzIG9uIGVhY2ggYXJyYXkgZWxlbWVudCBpbiBwYXJhbGxlbC5cbiAgICAvL1xuICAgIC8vIEluIHRoaXMgY2FzZSwgd2UgKm9ubHkqIGRpZyBkZWVwZXIgaW50byBhcnJheSBlbGVtZW50cyB0aGF0IGFyZSBwbGFpblxuICAgIC8vIG9iamVjdHMuIChSZWNhbGwgdGhhdCB3ZSBvbmx5IGdvdCB0aGlzIGZhciBpZiB3ZSBoYXZlIGZ1cnRoZXIgdG8gZGlnLilcbiAgICAvLyBUaGlzIG1ha2VzIHNlbnNlOiB3ZSBjZXJ0YWlubHkgZG9uJ3QgZGlnIGRlZXBlciBpbnRvIG5vbi1pbmRleGFibGVcbiAgICAvLyBvYmplY3RzLiBBbmQgaXQgd291bGQgYmUgd2VpcmQgdG8gZGlnIGludG8gYW4gYXJyYXk6IGl0J3Mgc2ltcGxlciB0byBoYXZlXG4gICAgLy8gYSBydWxlIHRoYXQgZXhwbGljaXQgaW50ZWdlciBpbmRleGVzIG9ubHkgYXBwbHkgdG8gYW4gb3V0ZXIgYXJyYXksIG5vdCB0b1xuICAgIC8vIGFuIGFycmF5IHlvdSBmaW5kIGFmdGVyIGEgYnJhbmNoaW5nIHNlYXJjaC5cbiAgICAvL1xuICAgIC8vIEluIHRoZSBzcGVjaWFsIGNhc2Ugb2YgYSBudW1lcmljIHBhcnQgaW4gYSAqc29ydCBzZWxlY3RvciogKG5vdCBhIHF1ZXJ5XG4gICAgLy8gc2VsZWN0b3IpLCB3ZSBza2lwIHRoZSBicmFuY2hpbmc6IHdlIE9OTFkgYWxsb3cgdGhlIG51bWVyaWMgcGFydCB0byBtZWFuXG4gICAgLy8gJ2xvb2sgdXAgdGhpcyBpbmRleCcgaW4gdGhhdCBjYXNlLCBub3QgJ2Fsc28gbG9vayB1cCB0aGlzIGluZGV4IGluIGFsbFxuICAgIC8vIHRoZSBlbGVtZW50cyBvZiB0aGUgYXJyYXknLlxuICAgIGlmIChBcnJheS5pc0FycmF5KGZpcnN0TGV2ZWwpICYmXG4gICAgICAgICEoaXNOdW1lcmljS2V5KHBhcnRzWzFdKSAmJiBvcHRpb25zLmZvclNvcnQpKSB7XG4gICAgICBmaXJzdExldmVsLmZvckVhY2goKGJyYW5jaCwgYXJyYXlJbmRleCkgPT4ge1xuICAgICAgICBpZiAoTG9jYWxDb2xsZWN0aW9uLl9pc1BsYWluT2JqZWN0KGJyYW5jaCkpIHtcbiAgICAgICAgICBhcHBlbmRUb1Jlc3VsdChsb29rdXBSZXN0KGJyYW5jaCwgYXJyYXlJbmRpY2VzID8gYXJyYXlJbmRpY2VzLmNvbmNhdChhcnJheUluZGV4KSA6IFthcnJheUluZGV4XSkpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xufVxuXG4vLyBPYmplY3QgZXhwb3J0ZWQgb25seSBmb3IgdW5pdCB0ZXN0aW5nLlxuLy8gVXNlIGl0IHRvIGV4cG9ydCBwcml2YXRlIGZ1bmN0aW9ucyB0byB0ZXN0IGluIFRpbnl0ZXN0LlxuTWluaW1vbmdvVGVzdCA9IHttYWtlTG9va3VwRnVuY3Rpb259O1xuTWluaW1vbmdvRXJyb3IgPSAobWVzc2FnZSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGlmICh0eXBlb2YgbWVzc2FnZSA9PT0gJ3N0cmluZycgJiYgb3B0aW9ucy5maWVsZCkge1xuICAgIG1lc3NhZ2UgKz0gYCBmb3IgZmllbGQgJyR7b3B0aW9ucy5maWVsZH0nYDtcbiAgfVxuXG4gIGNvbnN0IGVycm9yID0gbmV3IEVycm9yKG1lc3NhZ2UpO1xuICBlcnJvci5uYW1lID0gJ01pbmltb25nb0Vycm9yJztcbiAgcmV0dXJuIGVycm9yO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIG5vdGhpbmdNYXRjaGVyKGRvY09yQnJhbmNoZWRWYWx1ZXMpIHtcbiAgcmV0dXJuIHtyZXN1bHQ6IGZhbHNlfTtcbn1cblxuLy8gVGFrZXMgYW4gb3BlcmF0b3Igb2JqZWN0IChhbiBvYmplY3Qgd2l0aCAkIGtleXMpIGFuZCByZXR1cm5zIGEgYnJhbmNoZWRcbi8vIG1hdGNoZXIgZm9yIGl0LlxuZnVuY3Rpb24gb3BlcmF0b3JCcmFuY2hlZE1hdGNoZXIodmFsdWVTZWxlY3RvciwgbWF0Y2hlciwgaXNSb290KSB7XG4gIC8vIEVhY2ggdmFsdWVTZWxlY3RvciB3b3JrcyBzZXBhcmF0ZWx5IG9uIHRoZSB2YXJpb3VzIGJyYW5jaGVzLiAgU28gb25lXG4gIC8vIG9wZXJhdG9yIGNhbiBtYXRjaCBvbmUgYnJhbmNoIGFuZCBhbm90aGVyIGNhbiBtYXRjaCBhbm90aGVyIGJyYW5jaC4gIFRoaXNcbiAgLy8gaXMgT0suXG4gIGNvbnN0IG9wZXJhdG9yTWF0Y2hlcnMgPSBPYmplY3Qua2V5cyh2YWx1ZVNlbGVjdG9yKS5tYXAob3BlcmF0b3IgPT4ge1xuICAgIGNvbnN0IG9wZXJhbmQgPSB2YWx1ZVNlbGVjdG9yW29wZXJhdG9yXTtcblxuICAgIGNvbnN0IHNpbXBsZVJhbmdlID0gKFxuICAgICAgWyckbHQnLCAnJGx0ZScsICckZ3QnLCAnJGd0ZSddLmluY2x1ZGVzKG9wZXJhdG9yKSAmJlxuICAgICAgdHlwZW9mIG9wZXJhbmQgPT09ICdudW1iZXInXG4gICAgKTtcblxuICAgIGNvbnN0IHNpbXBsZUVxdWFsaXR5ID0gKFxuICAgICAgWyckbmUnLCAnJGVxJ10uaW5jbHVkZXMob3BlcmF0b3IpICYmXG4gICAgICBvcGVyYW5kICE9PSBPYmplY3Qob3BlcmFuZClcbiAgICApO1xuXG4gICAgY29uc3Qgc2ltcGxlSW5jbHVzaW9uID0gKFxuICAgICAgWyckaW4nLCAnJG5pbiddLmluY2x1ZGVzKG9wZXJhdG9yKVxuICAgICAgJiYgQXJyYXkuaXNBcnJheShvcGVyYW5kKVxuICAgICAgJiYgIW9wZXJhbmQuc29tZSh4ID0+IHggPT09IE9iamVjdCh4KSlcbiAgICApO1xuXG4gICAgaWYgKCEoc2ltcGxlUmFuZ2UgfHwgc2ltcGxlSW5jbHVzaW9uIHx8IHNpbXBsZUVxdWFsaXR5KSkge1xuICAgICAgbWF0Y2hlci5faXNTaW1wbGUgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoaGFzT3duLmNhbGwoVkFMVUVfT1BFUkFUT1JTLCBvcGVyYXRvcikpIHtcbiAgICAgIHJldHVybiBWQUxVRV9PUEVSQVRPUlNbb3BlcmF0b3JdKG9wZXJhbmQsIHZhbHVlU2VsZWN0b3IsIG1hdGNoZXIsIGlzUm9vdCk7XG4gICAgfVxuXG4gICAgaWYgKGhhc093bi5jYWxsKEVMRU1FTlRfT1BFUkFUT1JTLCBvcGVyYXRvcikpIHtcbiAgICAgIGNvbnN0IG9wdGlvbnMgPSBFTEVNRU5UX09QRVJBVE9SU1tvcGVyYXRvcl07XG4gICAgICByZXR1cm4gY29udmVydEVsZW1lbnRNYXRjaGVyVG9CcmFuY2hlZE1hdGNoZXIoXG4gICAgICAgIG9wdGlvbnMuY29tcGlsZUVsZW1lbnRTZWxlY3RvcihvcGVyYW5kLCB2YWx1ZVNlbGVjdG9yLCBtYXRjaGVyKSxcbiAgICAgICAgb3B0aW9uc1xuICAgICAgKTtcbiAgICB9XG5cbiAgICB0aHJvdyBuZXcgRXJyb3IoYFVucmVjb2duaXplZCBvcGVyYXRvcjogJHtvcGVyYXRvcn1gKTtcbiAgfSk7XG5cbiAgcmV0dXJuIGFuZEJyYW5jaGVkTWF0Y2hlcnMob3BlcmF0b3JNYXRjaGVycyk7XG59XG5cbi8vIHBhdGhzIC0gQXJyYXk6IGxpc3Qgb2YgbW9uZ28gc3R5bGUgcGF0aHNcbi8vIG5ld0xlYWZGbiAtIEZ1bmN0aW9uOiBvZiBmb3JtIGZ1bmN0aW9uKHBhdGgpIHNob3VsZCByZXR1cm4gYSBzY2FsYXIgdmFsdWUgdG9cbi8vICAgICAgICAgICAgICAgICAgICAgICBwdXQgaW50byBsaXN0IGNyZWF0ZWQgZm9yIHRoYXQgcGF0aFxuLy8gY29uZmxpY3RGbiAtIEZ1bmN0aW9uOiBvZiBmb3JtIGZ1bmN0aW9uKG5vZGUsIHBhdGgsIGZ1bGxQYXRoKSBpcyBjYWxsZWRcbi8vICAgICAgICAgICAgICAgICAgICAgICAgd2hlbiBidWlsZGluZyBhIHRyZWUgcGF0aCBmb3IgJ2Z1bGxQYXRoJyBub2RlIG9uXG4vLyAgICAgICAgICAgICAgICAgICAgICAgICdwYXRoJyB3YXMgYWxyZWFkeSBhIGxlYWYgd2l0aCBhIHZhbHVlLiBNdXN0IHJldHVybiBhXG4vLyAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZsaWN0IHJlc29sdXRpb24uXG4vLyBpbml0aWFsIHRyZWUgLSBPcHRpb25hbCBPYmplY3Q6IHN0YXJ0aW5nIHRyZWUuXG4vLyBAcmV0dXJucyAtIE9iamVjdDogdHJlZSByZXByZXNlbnRlZCBhcyBhIHNldCBvZiBuZXN0ZWQgb2JqZWN0c1xuZXhwb3J0IGZ1bmN0aW9uIHBhdGhzVG9UcmVlKHBhdGhzLCBuZXdMZWFmRm4sIGNvbmZsaWN0Rm4sIHJvb3QgPSB7fSkge1xuICBwYXRocy5mb3JFYWNoKHBhdGggPT4ge1xuICAgIGNvbnN0IHBhdGhBcnJheSA9IHBhdGguc3BsaXQoJy4nKTtcbiAgICBsZXQgdHJlZSA9IHJvb3Q7XG5cbiAgICAvLyB1c2UgLmV2ZXJ5IGp1c3QgZm9yIGl0ZXJhdGlvbiB3aXRoIGJyZWFrXG4gICAgY29uc3Qgc3VjY2VzcyA9IHBhdGhBcnJheS5zbGljZSgwLCAtMSkuZXZlcnkoKGtleSwgaSkgPT4ge1xuICAgICAgaWYgKCFoYXNPd24uY2FsbCh0cmVlLCBrZXkpKSB7XG4gICAgICAgIHRyZWVba2V5XSA9IHt9O1xuICAgICAgfSBlbHNlIGlmICh0cmVlW2tleV0gIT09IE9iamVjdCh0cmVlW2tleV0pKSB7XG4gICAgICAgIHRyZWVba2V5XSA9IGNvbmZsaWN0Rm4oXG4gICAgICAgICAgdHJlZVtrZXldLFxuICAgICAgICAgIHBhdGhBcnJheS5zbGljZSgwLCBpICsgMSkuam9pbignLicpLFxuICAgICAgICAgIHBhdGhcbiAgICAgICAgKTtcblxuICAgICAgICAvLyBicmVhayBvdXQgb2YgbG9vcCBpZiB3ZSBhcmUgZmFpbGluZyBmb3IgdGhpcyBwYXRoXG4gICAgICAgIGlmICh0cmVlW2tleV0gIT09IE9iamVjdCh0cmVlW2tleV0pKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHRyZWUgPSB0cmVlW2tleV07XG5cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuXG4gICAgaWYgKHN1Y2Nlc3MpIHtcbiAgICAgIGNvbnN0IGxhc3RLZXkgPSBwYXRoQXJyYXlbcGF0aEFycmF5Lmxlbmd0aCAtIDFdO1xuICAgICAgaWYgKGhhc093bi5jYWxsKHRyZWUsIGxhc3RLZXkpKSB7XG4gICAgICAgIHRyZWVbbGFzdEtleV0gPSBjb25mbGljdEZuKHRyZWVbbGFzdEtleV0sIHBhdGgsIHBhdGgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdHJlZVtsYXN0S2V5XSA9IG5ld0xlYWZGbihwYXRoKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiByb290O1xufVxuXG4vLyBNYWtlcyBzdXJlIHdlIGdldCAyIGVsZW1lbnRzIGFycmF5IGFuZCBhc3N1bWUgdGhlIGZpcnN0IG9uZSB0byBiZSB4IGFuZFxuLy8gdGhlIHNlY29uZCBvbmUgdG8geSBubyBtYXR0ZXIgd2hhdCB1c2VyIHBhc3Nlcy5cbi8vIEluIGNhc2UgdXNlciBwYXNzZXMgeyBsb246IHgsIGxhdDogeSB9IHJldHVybnMgW3gsIHldXG5mdW5jdGlvbiBwb2ludFRvQXJyYXkocG9pbnQpIHtcbiAgcmV0dXJuIEFycmF5LmlzQXJyYXkocG9pbnQpID8gcG9pbnQuc2xpY2UoKSA6IFtwb2ludC54LCBwb2ludC55XTtcbn1cblxuLy8gQ3JlYXRpbmcgYSBkb2N1bWVudCBmcm9tIGFuIHVwc2VydCBpcyBxdWl0ZSB0cmlja3kuXG4vLyBFLmcuIHRoaXMgc2VsZWN0b3I6IHtcIiRvclwiOiBbe1wiYi5mb29cIjoge1wiJGFsbFwiOiBbXCJiYXJcIl19fV19LCBzaG91bGQgcmVzdWx0XG4vLyBpbjoge1wiYi5mb29cIjogXCJiYXJcIn1cbi8vIEJ1dCB0aGlzIHNlbGVjdG9yOiB7XCIkb3JcIjogW3tcImJcIjoge1wiZm9vXCI6IHtcIiRhbGxcIjogW1wiYmFyXCJdfX19XX0gc2hvdWxkIHRocm93XG4vLyBhbiBlcnJvclxuXG4vLyBTb21lIHJ1bGVzIChmb3VuZCBtYWlubHkgd2l0aCB0cmlhbCAmIGVycm9yLCBzbyB0aGVyZSBtaWdodCBiZSBtb3JlKTpcbi8vIC0gaGFuZGxlIGFsbCBjaGlsZHMgb2YgJGFuZCAob3IgaW1wbGljaXQgJGFuZClcbi8vIC0gaGFuZGxlICRvciBub2RlcyB3aXRoIGV4YWN0bHkgMSBjaGlsZFxuLy8gLSBpZ25vcmUgJG9yIG5vZGVzIHdpdGggbW9yZSB0aGFuIDEgY2hpbGRcbi8vIC0gaWdub3JlICRub3IgYW5kICRub3Qgbm9kZXNcbi8vIC0gdGhyb3cgd2hlbiBhIHZhbHVlIGNhbiBub3QgYmUgc2V0IHVuYW1iaWd1b3VzbHlcbi8vIC0gZXZlcnkgdmFsdWUgZm9yICRhbGwgc2hvdWxkIGJlIGRlYWx0IHdpdGggYXMgc2VwYXJhdGUgJGVxLXNcbi8vIC0gdGhyZWF0IGFsbCBjaGlsZHJlbiBvZiAkYWxsIGFzICRlcSBzZXR0ZXJzICg9PiBzZXQgaWYgJGFsbC5sZW5ndGggPT09IDEsXG4vLyAgIG90aGVyd2lzZSB0aHJvdyBlcnJvcilcbi8vIC0geW91IGNhbiBub3QgbWl4ICckJy1wcmVmaXhlZCBrZXlzIGFuZCBub24tJyQnLXByZWZpeGVkIGtleXNcbi8vIC0geW91IGNhbiBvbmx5IGhhdmUgZG90dGVkIGtleXMgb24gYSByb290LWxldmVsXG4vLyAtIHlvdSBjYW4gbm90IGhhdmUgJyQnLXByZWZpeGVkIGtleXMgbW9yZSB0aGFuIG9uZS1sZXZlbCBkZWVwIGluIGFuIG9iamVjdFxuXG4vLyBIYW5kbGVzIG9uZSBrZXkvdmFsdWUgcGFpciB0byBwdXQgaW4gdGhlIHNlbGVjdG9yIGRvY3VtZW50XG5mdW5jdGlvbiBwb3B1bGF0ZURvY3VtZW50V2l0aEtleVZhbHVlKGRvY3VtZW50LCBrZXksIHZhbHVlKSB7XG4gIGlmICh2YWx1ZSAmJiBPYmplY3QuZ2V0UHJvdG90eXBlT2YodmFsdWUpID09PSBPYmplY3QucHJvdG90eXBlKSB7XG4gICAgcG9wdWxhdGVEb2N1bWVudFdpdGhPYmplY3QoZG9jdW1lbnQsIGtleSwgdmFsdWUpO1xuICB9IGVsc2UgaWYgKCEodmFsdWUgaW5zdGFuY2VvZiBSZWdFeHApKSB7XG4gICAgaW5zZXJ0SW50b0RvY3VtZW50KGRvY3VtZW50LCBrZXksIHZhbHVlKTtcbiAgfVxufVxuXG4vLyBIYW5kbGVzIGEga2V5LCB2YWx1ZSBwYWlyIHRvIHB1dCBpbiB0aGUgc2VsZWN0b3IgZG9jdW1lbnRcbi8vIGlmIHRoZSB2YWx1ZSBpcyBhbiBvYmplY3RcbmZ1bmN0aW9uIHBvcHVsYXRlRG9jdW1lbnRXaXRoT2JqZWN0KGRvY3VtZW50LCBrZXksIHZhbHVlKSB7XG4gIGNvbnN0IGtleXMgPSBPYmplY3Qua2V5cyh2YWx1ZSk7XG4gIGNvbnN0IHVucHJlZml4ZWRLZXlzID0ga2V5cy5maWx0ZXIob3AgPT4gb3BbMF0gIT09ICckJyk7XG5cbiAgaWYgKHVucHJlZml4ZWRLZXlzLmxlbmd0aCA+IDAgfHwgIWtleXMubGVuZ3RoKSB7XG4gICAgLy8gTGl0ZXJhbCAocG9zc2libHkgZW1wdHkpIG9iamVjdCAoIG9yIGVtcHR5IG9iamVjdCApXG4gICAgLy8gRG9uJ3QgYWxsb3cgbWl4aW5nICckJy1wcmVmaXhlZCB3aXRoIG5vbi0nJCctcHJlZml4ZWQgZmllbGRzXG4gICAgaWYgKGtleXMubGVuZ3RoICE9PSB1bnByZWZpeGVkS2V5cy5sZW5ndGgpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgdW5rbm93biBvcGVyYXRvcjogJHt1bnByZWZpeGVkS2V5c1swXX1gKTtcbiAgICB9XG5cbiAgICB2YWxpZGF0ZU9iamVjdCh2YWx1ZSwga2V5KTtcbiAgICBpbnNlcnRJbnRvRG9jdW1lbnQoZG9jdW1lbnQsIGtleSwgdmFsdWUpO1xuICB9IGVsc2Uge1xuICAgIE9iamVjdC5rZXlzKHZhbHVlKS5mb3JFYWNoKG9wID0+IHtcbiAgICAgIGNvbnN0IG9iamVjdCA9IHZhbHVlW29wXTtcblxuICAgICAgaWYgKG9wID09PSAnJGVxJykge1xuICAgICAgICBwb3B1bGF0ZURvY3VtZW50V2l0aEtleVZhbHVlKGRvY3VtZW50LCBrZXksIG9iamVjdCk7XG4gICAgICB9IGVsc2UgaWYgKG9wID09PSAnJGFsbCcpIHtcbiAgICAgICAgLy8gZXZlcnkgdmFsdWUgZm9yICRhbGwgc2hvdWxkIGJlIGRlYWx0IHdpdGggYXMgc2VwYXJhdGUgJGVxLXNcbiAgICAgICAgb2JqZWN0LmZvckVhY2goZWxlbWVudCA9PlxuICAgICAgICAgIHBvcHVsYXRlRG9jdW1lbnRXaXRoS2V5VmFsdWUoZG9jdW1lbnQsIGtleSwgZWxlbWVudClcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG4vLyBGaWxscyBhIGRvY3VtZW50IHdpdGggY2VydGFpbiBmaWVsZHMgZnJvbSBhbiB1cHNlcnQgc2VsZWN0b3JcbmV4cG9ydCBmdW5jdGlvbiBwb3B1bGF0ZURvY3VtZW50V2l0aFF1ZXJ5RmllbGRzKHF1ZXJ5LCBkb2N1bWVudCA9IHt9KSB7XG4gIGlmIChPYmplY3QuZ2V0UHJvdG90eXBlT2YocXVlcnkpID09PSBPYmplY3QucHJvdG90eXBlKSB7XG4gICAgLy8gaGFuZGxlIGltcGxpY2l0ICRhbmRcbiAgICBPYmplY3Qua2V5cyhxdWVyeSkuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgY29uc3QgdmFsdWUgPSBxdWVyeVtrZXldO1xuXG4gICAgICBpZiAoa2V5ID09PSAnJGFuZCcpIHtcbiAgICAgICAgLy8gaGFuZGxlIGV4cGxpY2l0ICRhbmRcbiAgICAgICAgdmFsdWUuZm9yRWFjaChlbGVtZW50ID0+XG4gICAgICAgICAgcG9wdWxhdGVEb2N1bWVudFdpdGhRdWVyeUZpZWxkcyhlbGVtZW50LCBkb2N1bWVudClcbiAgICAgICAgKTtcbiAgICAgIH0gZWxzZSBpZiAoa2V5ID09PSAnJG9yJykge1xuICAgICAgICAvLyBoYW5kbGUgJG9yIG5vZGVzIHdpdGggZXhhY3RseSAxIGNoaWxkXG4gICAgICAgIGlmICh2YWx1ZS5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICBwb3B1bGF0ZURvY3VtZW50V2l0aFF1ZXJ5RmllbGRzKHZhbHVlWzBdLCBkb2N1bWVudCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoa2V5WzBdICE9PSAnJCcpIHtcbiAgICAgICAgLy8gSWdub3JlIG90aGVyICckJy1wcmVmaXhlZCBsb2dpY2FsIHNlbGVjdG9yc1xuICAgICAgICBwb3B1bGF0ZURvY3VtZW50V2l0aEtleVZhbHVlKGRvY3VtZW50LCBrZXksIHZhbHVlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICAvLyBIYW5kbGUgbWV0ZW9yLXNwZWNpZmljIHNob3J0Y3V0IGZvciBzZWxlY3RpbmcgX2lkXG4gICAgaWYgKExvY2FsQ29sbGVjdGlvbi5fc2VsZWN0b3JJc0lkKHF1ZXJ5KSkge1xuICAgICAgaW5zZXJ0SW50b0RvY3VtZW50KGRvY3VtZW50LCAnX2lkJywgcXVlcnkpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBkb2N1bWVudDtcbn1cblxuLy8gVHJhdmVyc2VzIHRoZSBrZXlzIG9mIHBhc3NlZCBwcm9qZWN0aW9uIGFuZCBjb25zdHJ1Y3RzIGEgdHJlZSB3aGVyZSBhbGxcbi8vIGxlYXZlcyBhcmUgZWl0aGVyIGFsbCBUcnVlIG9yIGFsbCBGYWxzZVxuLy8gQHJldHVybnMgT2JqZWN0OlxuLy8gIC0gdHJlZSAtIE9iamVjdCAtIHRyZWUgcmVwcmVzZW50YXRpb24gb2Yga2V5cyBpbnZvbHZlZCBpbiBwcm9qZWN0aW9uXG4vLyAgKGV4Y2VwdGlvbiBmb3IgJ19pZCcgYXMgaXQgaXMgYSBzcGVjaWFsIGNhc2UgaGFuZGxlZCBzZXBhcmF0ZWx5KVxuLy8gIC0gaW5jbHVkaW5nIC0gQm9vbGVhbiAtIFwidGFrZSBvbmx5IGNlcnRhaW4gZmllbGRzXCIgdHlwZSBvZiBwcm9qZWN0aW9uXG5leHBvcnQgZnVuY3Rpb24gcHJvamVjdGlvbkRldGFpbHMoZmllbGRzKSB7XG4gIC8vIEZpbmQgdGhlIG5vbi1faWQga2V5cyAoX2lkIGlzIGhhbmRsZWQgc3BlY2lhbGx5IGJlY2F1c2UgaXQgaXMgaW5jbHVkZWRcbiAgLy8gdW5sZXNzIGV4cGxpY2l0bHkgZXhjbHVkZWQpLiBTb3J0IHRoZSBrZXlzLCBzbyB0aGF0IG91ciBjb2RlIHRvIGRldGVjdFxuICAvLyBvdmVybGFwcyBsaWtlICdmb28nIGFuZCAnZm9vLmJhcicgY2FuIGFzc3VtZSB0aGF0ICdmb28nIGNvbWVzIGZpcnN0LlxuICBsZXQgZmllbGRzS2V5cyA9IE9iamVjdC5rZXlzKGZpZWxkcykuc29ydCgpO1xuXG4gIC8vIElmIF9pZCBpcyB0aGUgb25seSBmaWVsZCBpbiB0aGUgcHJvamVjdGlvbiwgZG8gbm90IHJlbW92ZSBpdCwgc2luY2UgaXQgaXNcbiAgLy8gcmVxdWlyZWQgdG8gZGV0ZXJtaW5lIGlmIHRoaXMgaXMgYW4gZXhjbHVzaW9uIG9yIGV4Y2x1c2lvbi4gQWxzbyBrZWVwIGFuXG4gIC8vIGluY2x1c2l2ZSBfaWQsIHNpbmNlIGluY2x1c2l2ZSBfaWQgZm9sbG93cyB0aGUgbm9ybWFsIHJ1bGVzIGFib3V0IG1peGluZ1xuICAvLyBpbmNsdXNpdmUgYW5kIGV4Y2x1c2l2ZSBmaWVsZHMuIElmIF9pZCBpcyBub3QgdGhlIG9ubHkgZmllbGQgaW4gdGhlXG4gIC8vIHByb2plY3Rpb24gYW5kIGlzIGV4Y2x1c2l2ZSwgcmVtb3ZlIGl0IHNvIGl0IGNhbiBiZSBoYW5kbGVkIGxhdGVyIGJ5IGFcbiAgLy8gc3BlY2lhbCBjYXNlLCBzaW5jZSBleGNsdXNpdmUgX2lkIGlzIGFsd2F5cyBhbGxvd2VkLlxuICBpZiAoIShmaWVsZHNLZXlzLmxlbmd0aCA9PT0gMSAmJiBmaWVsZHNLZXlzWzBdID09PSAnX2lkJykgJiZcbiAgICAgICEoZmllbGRzS2V5cy5pbmNsdWRlcygnX2lkJykgJiYgZmllbGRzLl9pZCkpIHtcbiAgICBmaWVsZHNLZXlzID0gZmllbGRzS2V5cy5maWx0ZXIoa2V5ID0+IGtleSAhPT0gJ19pZCcpO1xuICB9XG5cbiAgbGV0IGluY2x1ZGluZyA9IG51bGw7IC8vIFVua25vd25cblxuICBmaWVsZHNLZXlzLmZvckVhY2goa2V5UGF0aCA9PiB7XG4gICAgY29uc3QgcnVsZSA9ICEhZmllbGRzW2tleVBhdGhdO1xuXG4gICAgaWYgKGluY2x1ZGluZyA9PT0gbnVsbCkge1xuICAgICAgaW5jbHVkaW5nID0gcnVsZTtcbiAgICB9XG5cbiAgICAvLyBUaGlzIGVycm9yIG1lc3NhZ2UgaXMgY29waWVkIGZyb20gTW9uZ29EQiBzaGVsbFxuICAgIGlmIChpbmNsdWRpbmcgIT09IHJ1bGUpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKFxuICAgICAgICAnWW91IGNhbm5vdCBjdXJyZW50bHkgbWl4IGluY2x1ZGluZyBhbmQgZXhjbHVkaW5nIGZpZWxkcy4nXG4gICAgICApO1xuICAgIH1cbiAgfSk7XG5cbiAgY29uc3QgcHJvamVjdGlvblJ1bGVzVHJlZSA9IHBhdGhzVG9UcmVlKFxuICAgIGZpZWxkc0tleXMsXG4gICAgcGF0aCA9PiBpbmNsdWRpbmcsXG4gICAgKG5vZGUsIHBhdGgsIGZ1bGxQYXRoKSA9PiB7XG4gICAgICAvLyBDaGVjayBwYXNzZWQgcHJvamVjdGlvbiBmaWVsZHMnIGtleXM6IElmIHlvdSBoYXZlIHR3byBydWxlcyBzdWNoIGFzXG4gICAgICAvLyAnZm9vLmJhcicgYW5kICdmb28uYmFyLmJheicsIHRoZW4gdGhlIHJlc3VsdCBiZWNvbWVzIGFtYmlndW91cy4gSWZcbiAgICAgIC8vIHRoYXQgaGFwcGVucywgdGhlcmUgaXMgYSBwcm9iYWJpbGl0eSB5b3UgYXJlIGRvaW5nIHNvbWV0aGluZyB3cm9uZyxcbiAgICAgIC8vIGZyYW1ld29yayBzaG91bGQgbm90aWZ5IHlvdSBhYm91dCBzdWNoIG1pc3Rha2UgZWFybGllciBvbiBjdXJzb3JcbiAgICAgIC8vIGNvbXBpbGF0aW9uIHN0ZXAgdGhhbiBsYXRlciBkdXJpbmcgcnVudGltZS4gIE5vdGUsIHRoYXQgcmVhbCBtb25nb1xuICAgICAgLy8gZG9lc24ndCBkbyBhbnl0aGluZyBhYm91dCBpdCBhbmQgdGhlIGxhdGVyIHJ1bGUgYXBwZWFycyBpbiBwcm9qZWN0aW9uXG4gICAgICAvLyBwcm9qZWN0LCBtb3JlIHByaW9yaXR5IGl0IHRha2VzLlxuICAgICAgLy9cbiAgICAgIC8vIEV4YW1wbGUsIGFzc3VtZSBmb2xsb3dpbmcgaW4gbW9uZ28gc2hlbGw6XG4gICAgICAvLyA+IGRiLmNvbGwuaW5zZXJ0KHsgYTogeyBiOiAyMywgYzogNDQgfSB9KVxuICAgICAgLy8gPiBkYi5jb2xsLmZpbmQoe30sIHsgJ2EnOiAxLCAnYS5iJzogMSB9KVxuICAgICAgLy8ge1wiX2lkXCI6IE9iamVjdElkKFwiNTIwYmZlNDU2MDI0NjA4ZThlZjI0YWYzXCIpLCBcImFcIjoge1wiYlwiOiAyM319XG4gICAgICAvLyA+IGRiLmNvbGwuZmluZCh7fSwgeyAnYS5iJzogMSwgJ2EnOiAxIH0pXG4gICAgICAvLyB7XCJfaWRcIjogT2JqZWN0SWQoXCI1MjBiZmU0NTYwMjQ2MDhlOGVmMjRhZjNcIiksIFwiYVwiOiB7XCJiXCI6IDIzLCBcImNcIjogNDR9fVxuICAgICAgLy9cbiAgICAgIC8vIE5vdGUsIGhvdyBzZWNvbmQgdGltZSB0aGUgcmV0dXJuIHNldCBvZiBrZXlzIGlzIGRpZmZlcmVudC5cbiAgICAgIGNvbnN0IGN1cnJlbnRQYXRoID0gZnVsbFBhdGg7XG4gICAgICBjb25zdCBhbm90aGVyUGF0aCA9IHBhdGg7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgYGJvdGggJHtjdXJyZW50UGF0aH0gYW5kICR7YW5vdGhlclBhdGh9IGZvdW5kIGluIGZpZWxkcyBvcHRpb24sIGAgK1xuICAgICAgICAndXNpbmcgYm90aCBvZiB0aGVtIG1heSB0cmlnZ2VyIHVuZXhwZWN0ZWQgYmVoYXZpb3IuIERpZCB5b3UgbWVhbiB0byAnICtcbiAgICAgICAgJ3VzZSBvbmx5IG9uZSBvZiB0aGVtPydcbiAgICAgICk7XG4gICAgfSk7XG5cbiAgcmV0dXJuIHtpbmNsdWRpbmcsIHRyZWU6IHByb2plY3Rpb25SdWxlc1RyZWV9O1xufVxuXG4vLyBUYWtlcyBhIFJlZ0V4cCBvYmplY3QgYW5kIHJldHVybnMgYW4gZWxlbWVudCBtYXRjaGVyLlxuZXhwb3J0IGZ1bmN0aW9uIHJlZ2V4cEVsZW1lbnRNYXRjaGVyKHJlZ2V4cCkge1xuICByZXR1cm4gdmFsdWUgPT4ge1xuICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgICAgcmV0dXJuIHZhbHVlLnRvU3RyaW5nKCkgPT09IHJlZ2V4cC50b1N0cmluZygpO1xuICAgIH1cblxuICAgIC8vIFJlZ2V4cHMgb25seSB3b3JrIGFnYWluc3Qgc3RyaW5ncy5cbiAgICBpZiAodHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJykge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIFJlc2V0IHJlZ2V4cCdzIHN0YXRlIHRvIGF2b2lkIGluY29uc2lzdGVudCBtYXRjaGluZyBmb3Igb2JqZWN0cyB3aXRoIHRoZVxuICAgIC8vIHNhbWUgdmFsdWUgb24gY29uc2VjdXRpdmUgY2FsbHMgb2YgcmVnZXhwLnRlc3QuIFRoaXMgaGFwcGVucyBvbmx5IGlmIHRoZVxuICAgIC8vIHJlZ2V4cCBoYXMgdGhlICdnJyBmbGFnLiBBbHNvIG5vdGUgdGhhdCBFUzYgaW50cm9kdWNlcyBhIG5ldyBmbGFnICd5JyBmb3JcbiAgICAvLyB3aGljaCB3ZSBzaG91bGQgKm5vdCogY2hhbmdlIHRoZSBsYXN0SW5kZXggYnV0IE1vbmdvREIgZG9lc24ndCBzdXBwb3J0XG4gICAgLy8gZWl0aGVyIG9mIHRoZXNlIGZsYWdzLlxuICAgIHJlZ2V4cC5sYXN0SW5kZXggPSAwO1xuXG4gICAgcmV0dXJuIHJlZ2V4cC50ZXN0KHZhbHVlKTtcbiAgfTtcbn1cblxuLy8gVmFsaWRhdGVzIHRoZSBrZXkgaW4gYSBwYXRoLlxuLy8gT2JqZWN0cyB0aGF0IGFyZSBuZXN0ZWQgbW9yZSB0aGVuIDEgbGV2ZWwgY2Fubm90IGhhdmUgZG90dGVkIGZpZWxkc1xuLy8gb3IgZmllbGRzIHN0YXJ0aW5nIHdpdGggJyQnXG5mdW5jdGlvbiB2YWxpZGF0ZUtleUluUGF0aChrZXksIHBhdGgpIHtcbiAgaWYgKGtleS5pbmNsdWRlcygnLicpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgYFRoZSBkb3R0ZWQgZmllbGQgJyR7a2V5fScgaW4gJyR7cGF0aH0uJHtrZXl9IGlzIG5vdCB2YWxpZCBmb3Igc3RvcmFnZS5gXG4gICAgKTtcbiAgfVxuXG4gIGlmIChrZXlbMF0gPT09ICckJykge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIGBUaGUgZG9sbGFyICgkKSBwcmVmaXhlZCBmaWVsZCAgJyR7cGF0aH0uJHtrZXl9IGlzIG5vdCB2YWxpZCBmb3Igc3RvcmFnZS5gXG4gICAgKTtcbiAgfVxufVxuXG4vLyBSZWN1cnNpdmVseSB2YWxpZGF0ZXMgYW4gb2JqZWN0IHRoYXQgaXMgbmVzdGVkIG1vcmUgdGhhbiBvbmUgbGV2ZWwgZGVlcFxuZnVuY3Rpb24gdmFsaWRhdGVPYmplY3Qob2JqZWN0LCBwYXRoKSB7XG4gIGlmIChvYmplY3QgJiYgT2JqZWN0LmdldFByb3RvdHlwZU9mKG9iamVjdCkgPT09IE9iamVjdC5wcm90b3R5cGUpIHtcbiAgICBPYmplY3Qua2V5cyhvYmplY3QpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgIHZhbGlkYXRlS2V5SW5QYXRoKGtleSwgcGF0aCk7XG4gICAgICB2YWxpZGF0ZU9iamVjdChvYmplY3Rba2V5XSwgcGF0aCArICcuJyArIGtleSk7XG4gICAgfSk7XG4gIH1cbn1cbiIsIi8qKiBFeHBvcnRlZCB2YWx1ZXMgYXJlIGFsc28gdXNlZCBpbiB0aGUgbW9uZ28gcGFja2FnZS4gKi9cblxuLyoqIEBwYXJhbSB7c3RyaW5nfSBtZXRob2QgKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBc3luY01ldGhvZE5hbWUobWV0aG9kKSB7XG4gIHJldHVybiBgJHttZXRob2QucmVwbGFjZSgnXycsICcnKX1Bc3luY2A7XG59XG5cbmV4cG9ydCBjb25zdCBBU1lOQ19DT0xMRUNUSU9OX01FVEhPRFMgPSBbXG4gICdfY3JlYXRlQ2FwcGVkQ29sbGVjdGlvbicsXG4gICdfZHJvcENvbGxlY3Rpb24nLFxuICAnX2Ryb3BJbmRleCcsXG4gICdjcmVhdGVJbmRleCcsXG4gICdmaW5kT25lJyxcbiAgJ2luc2VydCcsXG4gICdyZW1vdmUnLFxuICAndXBkYXRlJyxcbiAgJ3Vwc2VydCcsXG5dO1xuXG5leHBvcnQgY29uc3QgQVNZTkNfQ1VSU09SX01FVEhPRFMgPSBbJ2NvdW50JywgJ2ZldGNoJywgJ2ZvckVhY2gnLCAnbWFwJ107XG4iLCJpbXBvcnQgTG9jYWxDb2xsZWN0aW9uIGZyb20gJy4vbG9jYWxfY29sbGVjdGlvbi5qcyc7XG5pbXBvcnQgeyBoYXNPd24gfSBmcm9tICcuL2NvbW1vbi5qcyc7XG5pbXBvcnQgeyBBU1lOQ19DVVJTT1JfTUVUSE9EUywgZ2V0QXN5bmNNZXRob2ROYW1lIH0gZnJvbSBcIi4vY29uc3RhbnRzXCI7XG5cbi8vIEN1cnNvcjogYSBzcGVjaWZpY2F0aW9uIGZvciBhIHBhcnRpY3VsYXIgc3Vic2V0IG9mIGRvY3VtZW50cywgdy8gYSBkZWZpbmVkXG4vLyBvcmRlciwgbGltaXQsIGFuZCBvZmZzZXQuICBjcmVhdGluZyBhIEN1cnNvciB3aXRoIExvY2FsQ29sbGVjdGlvbi5maW5kKCksXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBDdXJzb3Ige1xuICAvLyBkb24ndCBjYWxsIHRoaXMgY3RvciBkaXJlY3RseS4gIHVzZSBMb2NhbENvbGxlY3Rpb24uZmluZCgpLlxuICBjb25zdHJ1Y3Rvcihjb2xsZWN0aW9uLCBzZWxlY3Rvciwgb3B0aW9ucyA9IHt9KSB7XG4gICAgdGhpcy5jb2xsZWN0aW9uID0gY29sbGVjdGlvbjtcbiAgICB0aGlzLnNvcnRlciA9IG51bGw7XG4gICAgdGhpcy5tYXRjaGVyID0gbmV3IE1pbmltb25nby5NYXRjaGVyKHNlbGVjdG9yKTtcblxuICAgIGlmIChMb2NhbENvbGxlY3Rpb24uX3NlbGVjdG9ySXNJZFBlcmhhcHNBc09iamVjdChzZWxlY3RvcikpIHtcbiAgICAgIC8vIHN0YXNoIGZvciBmYXN0IF9pZCBhbmQgeyBfaWQgfVxuICAgICAgdGhpcy5fc2VsZWN0b3JJZCA9IGhhc093bi5jYWxsKHNlbGVjdG9yLCAnX2lkJylcbiAgICAgICAgPyBzZWxlY3Rvci5faWRcbiAgICAgICAgOiBzZWxlY3RvcjtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fc2VsZWN0b3JJZCA9IHVuZGVmaW5lZDtcblxuICAgICAgaWYgKHRoaXMubWF0Y2hlci5oYXNHZW9RdWVyeSgpIHx8IG9wdGlvbnMuc29ydCkge1xuICAgICAgICB0aGlzLnNvcnRlciA9IG5ldyBNaW5pbW9uZ28uU29ydGVyKG9wdGlvbnMuc29ydCB8fCBbXSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5za2lwID0gb3B0aW9ucy5za2lwIHx8IDA7XG4gICAgdGhpcy5saW1pdCA9IG9wdGlvbnMubGltaXQ7XG4gICAgdGhpcy5maWVsZHMgPSBvcHRpb25zLnByb2plY3Rpb24gfHwgb3B0aW9ucy5maWVsZHM7XG5cbiAgICB0aGlzLl9wcm9qZWN0aW9uRm4gPSBMb2NhbENvbGxlY3Rpb24uX2NvbXBpbGVQcm9qZWN0aW9uKHRoaXMuZmllbGRzIHx8IHt9KTtcblxuICAgIHRoaXMuX3RyYW5zZm9ybSA9IExvY2FsQ29sbGVjdGlvbi53cmFwVHJhbnNmb3JtKG9wdGlvbnMudHJhbnNmb3JtKTtcblxuICAgIC8vIGJ5IGRlZmF1bHQsIHF1ZXJpZXMgcmVnaXN0ZXIgdy8gVHJhY2tlciB3aGVuIGl0IGlzIGF2YWlsYWJsZS5cbiAgICBpZiAodHlwZW9mIFRyYWNrZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB0aGlzLnJlYWN0aXZlID0gb3B0aW9ucy5yZWFjdGl2ZSA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IG9wdGlvbnMucmVhY3RpdmU7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBkZXByZWNhdGVkIGluIDIuOVxuICAgKiBAc3VtbWFyeSBSZXR1cm5zIHRoZSBudW1iZXIgb2YgZG9jdW1lbnRzIHRoYXQgbWF0Y2ggYSBxdWVyeS4gVGhpcyBtZXRob2QgaXNcbiAgICogICAgICAgICAgW2RlcHJlY2F0ZWQgc2luY2UgTW9uZ29EQiA0LjBdKGh0dHBzOi8vd3d3Lm1vbmdvZGIuY29tL2RvY3MvdjQuNC9yZWZlcmVuY2UvY29tbWFuZC9jb3VudC8pO1xuICAgKiAgICAgICAgICBzZWUgYENvbGxlY3Rpb24uY291bnREb2N1bWVudHNgIGFuZFxuICAgKiAgICAgICAgICBgQ29sbGVjdGlvbi5lc3RpbWF0ZWREb2N1bWVudENvdW50YCBmb3IgYSByZXBsYWNlbWVudC5cbiAgICogQG1lbWJlck9mIE1vbmdvLkN1cnNvclxuICAgKiBAbWV0aG9kICBjb3VudFxuICAgKiBAaW5zdGFuY2VcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEByZXR1cm5zIHtOdW1iZXJ9XG4gICAqL1xuICBjb3VudCgpIHtcbiAgICBpZiAodGhpcy5yZWFjdGl2ZSkge1xuICAgICAgLy8gYWxsb3cgdGhlIG9ic2VydmUgdG8gYmUgdW5vcmRlcmVkXG4gICAgICB0aGlzLl9kZXBlbmQoe2FkZGVkOiB0cnVlLCByZW1vdmVkOiB0cnVlfSwgdHJ1ZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX2dldFJhd09iamVjdHMoe1xuICAgICAgb3JkZXJlZDogdHJ1ZSxcbiAgICB9KS5sZW5ndGg7XG4gIH1cblxuICAvKipcbiAgICogQHN1bW1hcnkgUmV0dXJuIGFsbCBtYXRjaGluZyBkb2N1bWVudHMgYXMgYW4gQXJyYXkuXG4gICAqIEBtZW1iZXJPZiBNb25nby5DdXJzb3JcbiAgICogQG1ldGhvZCAgZmV0Y2hcbiAgICogQGluc3RhbmNlXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAcmV0dXJucyB7T2JqZWN0W119XG4gICAqL1xuICBmZXRjaCgpIHtcbiAgICBjb25zdCByZXN1bHQgPSBbXTtcblxuICAgIHRoaXMuZm9yRWFjaChkb2MgPT4ge1xuICAgICAgcmVzdWx0LnB1c2goZG9jKTtcbiAgICB9KTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBbU3ltYm9sLml0ZXJhdG9yXSgpIHtcbiAgICBpZiAodGhpcy5yZWFjdGl2ZSkge1xuICAgICAgdGhpcy5fZGVwZW5kKHtcbiAgICAgICAgYWRkZWRCZWZvcmU6IHRydWUsXG4gICAgICAgIHJlbW92ZWQ6IHRydWUsXG4gICAgICAgIGNoYW5nZWQ6IHRydWUsXG4gICAgICAgIG1vdmVkQmVmb3JlOiB0cnVlfSk7XG4gICAgfVxuXG4gICAgbGV0IGluZGV4ID0gMDtcbiAgICBjb25zdCBvYmplY3RzID0gdGhpcy5fZ2V0UmF3T2JqZWN0cyh7b3JkZXJlZDogdHJ1ZX0pO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIG5leHQ6ICgpID0+IHtcbiAgICAgICAgaWYgKGluZGV4IDwgb2JqZWN0cy5sZW5ndGgpIHtcbiAgICAgICAgICAvLyBUaGlzIGRvdWJsZXMgYXMgYSBjbG9uZSBvcGVyYXRpb24uXG4gICAgICAgICAgbGV0IGVsZW1lbnQgPSB0aGlzLl9wcm9qZWN0aW9uRm4ob2JqZWN0c1tpbmRleCsrXSk7XG5cbiAgICAgICAgICBpZiAodGhpcy5fdHJhbnNmb3JtKVxuICAgICAgICAgICAgZWxlbWVudCA9IHRoaXMuX3RyYW5zZm9ybShlbGVtZW50KTtcblxuICAgICAgICAgIHJldHVybiB7dmFsdWU6IGVsZW1lbnR9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtkb25lOiB0cnVlfTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSgpIHtcbiAgICBjb25zdCBzeW5jUmVzdWx0ID0gdGhpc1tTeW1ib2wuaXRlcmF0b3JdKCk7XG4gICAgcmV0dXJuIHtcbiAgICAgIGFzeW5jIG5leHQoKSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoc3luY1Jlc3VsdC5uZXh0KCkpO1xuICAgICAgfVxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogQGNhbGxiYWNrIEl0ZXJhdGlvbkNhbGxiYWNrXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBkb2NcbiAgICogQHBhcmFtIHtOdW1iZXJ9IGluZGV4XG4gICAqL1xuICAvKipcbiAgICogQHN1bW1hcnkgQ2FsbCBgY2FsbGJhY2tgIG9uY2UgZm9yIGVhY2ggbWF0Y2hpbmcgZG9jdW1lbnQsIHNlcXVlbnRpYWxseSBhbmRcbiAgICogICAgICAgICAgc3luY2hyb25vdXNseS5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZXRob2QgIGZvckVhY2hcbiAgICogQGluc3RhbmNlXG4gICAqIEBtZW1iZXJPZiBNb25nby5DdXJzb3JcbiAgICogQHBhcmFtIHtJdGVyYXRpb25DYWxsYmFja30gY2FsbGJhY2sgRnVuY3Rpb24gdG8gY2FsbC4gSXQgd2lsbCBiZSBjYWxsZWRcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2l0aCB0aHJlZSBhcmd1bWVudHM6IHRoZSBkb2N1bWVudCwgYVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAwLWJhc2VkIGluZGV4LCBhbmQgPGVtPmN1cnNvcjwvZW0+XG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0c2VsZi5cbiAgICogQHBhcmFtIHtBbnl9IFt0aGlzQXJnXSBBbiBvYmplY3Qgd2hpY2ggd2lsbCBiZSB0aGUgdmFsdWUgb2YgYHRoaXNgIGluc2lkZVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgIGBjYWxsYmFja2AuXG4gICAqL1xuICBmb3JFYWNoKGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgaWYgKHRoaXMucmVhY3RpdmUpIHtcbiAgICAgIHRoaXMuX2RlcGVuZCh7XG4gICAgICAgIGFkZGVkQmVmb3JlOiB0cnVlLFxuICAgICAgICByZW1vdmVkOiB0cnVlLFxuICAgICAgICBjaGFuZ2VkOiB0cnVlLFxuICAgICAgICBtb3ZlZEJlZm9yZTogdHJ1ZX0pO1xuICAgIH1cblxuICAgIHRoaXMuX2dldFJhd09iamVjdHMoe29yZGVyZWQ6IHRydWV9KS5mb3JFYWNoKChlbGVtZW50LCBpKSA9PiB7XG4gICAgICAvLyBUaGlzIGRvdWJsZXMgYXMgYSBjbG9uZSBvcGVyYXRpb24uXG4gICAgICBlbGVtZW50ID0gdGhpcy5fcHJvamVjdGlvbkZuKGVsZW1lbnQpO1xuXG4gICAgICBpZiAodGhpcy5fdHJhbnNmb3JtKSB7XG4gICAgICAgIGVsZW1lbnQgPSB0aGlzLl90cmFuc2Zvcm0oZWxlbWVudCk7XG4gICAgICB9XG5cbiAgICAgIGNhbGxiYWNrLmNhbGwodGhpc0FyZywgZWxlbWVudCwgaSwgdGhpcyk7XG4gICAgfSk7XG4gIH1cblxuICBnZXRUcmFuc2Zvcm0oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3RyYW5zZm9ybTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBNYXAgY2FsbGJhY2sgb3ZlciBhbGwgbWF0Y2hpbmcgZG9jdW1lbnRzLiAgUmV0dXJucyBhbiBBcnJheS5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZXRob2QgbWFwXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAbWVtYmVyT2YgTW9uZ28uQ3Vyc29yXG4gICAqIEBwYXJhbSB7SXRlcmF0aW9uQ2FsbGJhY2t9IGNhbGxiYWNrIEZ1bmN0aW9uIHRvIGNhbGwuIEl0IHdpbGwgYmUgY2FsbGVkXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpdGggdGhyZWUgYXJndW1lbnRzOiB0aGUgZG9jdW1lbnQsIGFcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMC1iYXNlZCBpbmRleCwgYW5kIDxlbT5jdXJzb3I8L2VtPlxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdHNlbGYuXG4gICAqIEBwYXJhbSB7QW55fSBbdGhpc0FyZ10gQW4gb2JqZWN0IHdoaWNoIHdpbGwgYmUgdGhlIHZhbHVlIG9mIGB0aGlzYCBpbnNpZGVcbiAgICogICAgICAgICAgICAgICAgICAgICAgICBgY2FsbGJhY2tgLlxuICAgKi9cbiAgbWFwKGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgY29uc3QgcmVzdWx0ID0gW107XG5cbiAgICB0aGlzLmZvckVhY2goKGRvYywgaSkgPT4ge1xuICAgICAgcmVzdWx0LnB1c2goY2FsbGJhY2suY2FsbCh0aGlzQXJnLCBkb2MsIGksIHRoaXMpKTtcbiAgICB9KTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvLyBvcHRpb25zIHRvIGNvbnRhaW46XG4gIC8vICAqIGNhbGxiYWNrcyBmb3Igb2JzZXJ2ZSgpOlxuICAvLyAgICAtIGFkZGVkQXQgKGRvY3VtZW50LCBhdEluZGV4KVxuICAvLyAgICAtIGFkZGVkIChkb2N1bWVudClcbiAgLy8gICAgLSBjaGFuZ2VkQXQgKG5ld0RvY3VtZW50LCBvbGREb2N1bWVudCwgYXRJbmRleClcbiAgLy8gICAgLSBjaGFuZ2VkIChuZXdEb2N1bWVudCwgb2xkRG9jdW1lbnQpXG4gIC8vICAgIC0gcmVtb3ZlZEF0IChkb2N1bWVudCwgYXRJbmRleClcbiAgLy8gICAgLSByZW1vdmVkIChkb2N1bWVudClcbiAgLy8gICAgLSBtb3ZlZFRvIChkb2N1bWVudCwgb2xkSW5kZXgsIG5ld0luZGV4KVxuICAvL1xuICAvLyBhdHRyaWJ1dGVzIGF2YWlsYWJsZSBvbiByZXR1cm5lZCBxdWVyeSBoYW5kbGU6XG4gIC8vICAqIHN0b3AoKTogZW5kIHVwZGF0ZXNcbiAgLy8gICogY29sbGVjdGlvbjogdGhlIGNvbGxlY3Rpb24gdGhpcyBxdWVyeSBpcyBxdWVyeWluZ1xuICAvL1xuICAvLyBpZmYgeCBpcyBhIHJldHVybmVkIHF1ZXJ5IGhhbmRsZSwgKHggaW5zdGFuY2VvZlxuICAvLyBMb2NhbENvbGxlY3Rpb24uT2JzZXJ2ZUhhbmRsZSkgaXMgdHJ1ZVxuICAvL1xuICAvLyBpbml0aWFsIHJlc3VsdHMgZGVsaXZlcmVkIHRocm91Z2ggYWRkZWQgY2FsbGJhY2tcbiAgLy8gWFhYIG1heWJlIGNhbGxiYWNrcyBzaG91bGQgdGFrZSBhIGxpc3Qgb2Ygb2JqZWN0cywgdG8gZXhwb3NlIHRyYW5zYWN0aW9ucz9cbiAgLy8gWFhYIG1heWJlIHN1cHBvcnQgZmllbGQgbGltaXRpbmcgKHRvIGxpbWl0IHdoYXQgeW91J3JlIG5vdGlmaWVkIG9uKVxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBXYXRjaCBhIHF1ZXJ5LiAgUmVjZWl2ZSBjYWxsYmFja3MgYXMgdGhlIHJlc3VsdCBzZXQgY2hhbmdlcy5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBNb25nby5DdXJzb3JcbiAgICogQGluc3RhbmNlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBjYWxsYmFja3MgRnVuY3Rpb25zIHRvIGNhbGwgdG8gZGVsaXZlciB0aGUgcmVzdWx0IHNldCBhcyBpdFxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoYW5nZXNcbiAgICovXG4gIG9ic2VydmUob3B0aW9ucykge1xuICAgIHJldHVybiBMb2NhbENvbGxlY3Rpb24uX29ic2VydmVGcm9tT2JzZXJ2ZUNoYW5nZXModGhpcywgb3B0aW9ucyk7XG4gIH1cblxuICAvKipcbiAgICogQHN1bW1hcnkgV2F0Y2ggYSBxdWVyeS4gUmVjZWl2ZSBjYWxsYmFja3MgYXMgdGhlIHJlc3VsdCBzZXQgY2hhbmdlcy4gT25seVxuICAgKiAgICAgICAgICB0aGUgZGlmZmVyZW5jZXMgYmV0d2VlbiB0aGUgb2xkIGFuZCBuZXcgZG9jdW1lbnRzIGFyZSBwYXNzZWQgdG9cbiAgICogICAgICAgICAgdGhlIGNhbGxiYWNrcy5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBNb25nby5DdXJzb3JcbiAgICogQGluc3RhbmNlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBjYWxsYmFja3MgRnVuY3Rpb25zIHRvIGNhbGwgdG8gZGVsaXZlciB0aGUgcmVzdWx0IHNldCBhcyBpdFxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoYW5nZXNcbiAgICovXG4gIG9ic2VydmVDaGFuZ2VzKG9wdGlvbnMpIHtcbiAgICBjb25zdCBvcmRlcmVkID0gTG9jYWxDb2xsZWN0aW9uLl9vYnNlcnZlQ2hhbmdlc0NhbGxiYWNrc0FyZU9yZGVyZWQob3B0aW9ucyk7XG5cbiAgICAvLyB0aGVyZSBhcmUgc2V2ZXJhbCBwbGFjZXMgdGhhdCBhc3N1bWUgeW91IGFyZW4ndCBjb21iaW5pbmcgc2tpcC9saW1pdCB3aXRoXG4gICAgLy8gdW5vcmRlcmVkIG9ic2VydmUuICBlZywgdXBkYXRlJ3MgRUpTT04uY2xvbmUsIGFuZCB0aGUgXCJ0aGVyZSBhcmUgc2V2ZXJhbFwiXG4gICAgLy8gY29tbWVudCBpbiBfbW9kaWZ5QW5kTm90aWZ5XG4gICAgLy8gWFhYIGFsbG93IHNraXAvbGltaXQgd2l0aCB1bm9yZGVyZWQgb2JzZXJ2ZVxuICAgIGlmICghb3B0aW9ucy5fYWxsb3dfdW5vcmRlcmVkICYmICFvcmRlcmVkICYmICh0aGlzLnNraXAgfHwgdGhpcy5saW1pdCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgXCJNdXN0IHVzZSBhbiBvcmRlcmVkIG9ic2VydmUgd2l0aCBza2lwIG9yIGxpbWl0IChpLmUuICdhZGRlZEJlZm9yZScgXCIgK1xuICAgICAgICBcImZvciBvYnNlcnZlQ2hhbmdlcyBvciAnYWRkZWRBdCcgZm9yIG9ic2VydmUsIGluc3RlYWQgb2YgJ2FkZGVkJykuXCJcbiAgICAgICk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuZmllbGRzICYmICh0aGlzLmZpZWxkcy5faWQgPT09IDAgfHwgdGhpcy5maWVsZHMuX2lkID09PSBmYWxzZSkpIHtcbiAgICAgIHRocm93IEVycm9yKCdZb3UgbWF5IG5vdCBvYnNlcnZlIGEgY3Vyc29yIHdpdGgge2ZpZWxkczoge19pZDogMH19Jyk7XG4gICAgfVxuXG4gICAgY29uc3QgZGlzdGFuY2VzID0gKFxuICAgICAgdGhpcy5tYXRjaGVyLmhhc0dlb1F1ZXJ5KCkgJiZcbiAgICAgIG9yZGVyZWQgJiZcbiAgICAgIG5ldyBMb2NhbENvbGxlY3Rpb24uX0lkTWFwXG4gICAgKTtcblxuICAgIGNvbnN0IHF1ZXJ5ID0ge1xuICAgICAgY3Vyc29yOiB0aGlzLFxuICAgICAgZGlydHk6IGZhbHNlLFxuICAgICAgZGlzdGFuY2VzLFxuICAgICAgbWF0Y2hlcjogdGhpcy5tYXRjaGVyLCAvLyBub3QgZmFzdCBwYXRoZWRcbiAgICAgIG9yZGVyZWQsXG4gICAgICBwcm9qZWN0aW9uRm46IHRoaXMuX3Byb2plY3Rpb25GbixcbiAgICAgIHJlc3VsdHNTbmFwc2hvdDogbnVsbCxcbiAgICAgIHNvcnRlcjogb3JkZXJlZCAmJiB0aGlzLnNvcnRlclxuICAgIH07XG5cbiAgICBsZXQgcWlkO1xuXG4gICAgLy8gTm9uLXJlYWN0aXZlIHF1ZXJpZXMgY2FsbCBhZGRlZFtCZWZvcmVdIGFuZCB0aGVuIG5ldmVyIGNhbGwgYW55dGhpbmdcbiAgICAvLyBlbHNlLlxuICAgIGlmICh0aGlzLnJlYWN0aXZlKSB7XG4gICAgICBxaWQgPSB0aGlzLmNvbGxlY3Rpb24ubmV4dF9xaWQrKztcbiAgICAgIHRoaXMuY29sbGVjdGlvbi5xdWVyaWVzW3FpZF0gPSBxdWVyeTtcbiAgICB9XG5cbiAgICBxdWVyeS5yZXN1bHRzID0gdGhpcy5fZ2V0UmF3T2JqZWN0cyh7b3JkZXJlZCwgZGlzdGFuY2VzOiBxdWVyeS5kaXN0YW5jZXN9KTtcblxuICAgIGlmICh0aGlzLmNvbGxlY3Rpb24ucGF1c2VkKSB7XG4gICAgICBxdWVyeS5yZXN1bHRzU25hcHNob3QgPSBvcmRlcmVkID8gW10gOiBuZXcgTG9jYWxDb2xsZWN0aW9uLl9JZE1hcDtcbiAgICB9XG5cbiAgICAvLyB3cmFwIGNhbGxiYWNrcyB3ZSB3ZXJlIHBhc3NlZC4gY2FsbGJhY2tzIG9ubHkgZmlyZSB3aGVuIG5vdCBwYXVzZWQgYW5kXG4gICAgLy8gYXJlIG5ldmVyIHVuZGVmaW5lZFxuICAgIC8vIEZpbHRlcnMgb3V0IGJsYWNrbGlzdGVkIGZpZWxkcyBhY2NvcmRpbmcgdG8gY3Vyc29yJ3MgcHJvamVjdGlvbi5cbiAgICAvLyBYWFggd3JvbmcgcGxhY2UgZm9yIHRoaXM/XG5cbiAgICAvLyBmdXJ0aGVybW9yZSwgY2FsbGJhY2tzIGVucXVldWUgdW50aWwgdGhlIG9wZXJhdGlvbiB3ZSdyZSB3b3JraW5nIG9uIGlzXG4gICAgLy8gZG9uZS5cbiAgICBjb25zdCB3cmFwQ2FsbGJhY2sgPSBmbiA9PiB7XG4gICAgICBpZiAoIWZuKSB7XG4gICAgICAgIHJldHVybiAoKSA9PiB7fTtcbiAgICAgIH1cblxuICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgICByZXR1cm4gZnVuY3Rpb24oLyogYXJncyovKSB7XG4gICAgICAgIGlmIChzZWxmLmNvbGxlY3Rpb24ucGF1c2VkKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgYXJncyA9IGFyZ3VtZW50cztcblxuICAgICAgICBzZWxmLmNvbGxlY3Rpb24uX29ic2VydmVRdWV1ZS5xdWV1ZVRhc2soKCkgPT4ge1xuICAgICAgICAgIGZuLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICB9KTtcbiAgICAgIH07XG4gICAgfTtcblxuICAgIHF1ZXJ5LmFkZGVkID0gd3JhcENhbGxiYWNrKG9wdGlvbnMuYWRkZWQpO1xuICAgIHF1ZXJ5LmNoYW5nZWQgPSB3cmFwQ2FsbGJhY2sob3B0aW9ucy5jaGFuZ2VkKTtcbiAgICBxdWVyeS5yZW1vdmVkID0gd3JhcENhbGxiYWNrKG9wdGlvbnMucmVtb3ZlZCk7XG5cbiAgICBpZiAob3JkZXJlZCkge1xuICAgICAgcXVlcnkuYWRkZWRCZWZvcmUgPSB3cmFwQ2FsbGJhY2sob3B0aW9ucy5hZGRlZEJlZm9yZSk7XG4gICAgICBxdWVyeS5tb3ZlZEJlZm9yZSA9IHdyYXBDYWxsYmFjayhvcHRpb25zLm1vdmVkQmVmb3JlKTtcbiAgICB9XG5cbiAgICBpZiAoIW9wdGlvbnMuX3N1cHByZXNzX2luaXRpYWwgJiYgIXRoaXMuY29sbGVjdGlvbi5wYXVzZWQpIHtcbiAgICAgIHF1ZXJ5LnJlc3VsdHMuZm9yRWFjaChkb2MgPT4ge1xuICAgICAgICBjb25zdCBmaWVsZHMgPSBFSlNPTi5jbG9uZShkb2MpO1xuXG4gICAgICAgIGRlbGV0ZSBmaWVsZHMuX2lkO1xuXG4gICAgICAgIGlmIChvcmRlcmVkKSB7XG4gICAgICAgICAgcXVlcnkuYWRkZWRCZWZvcmUoZG9jLl9pZCwgdGhpcy5fcHJvamVjdGlvbkZuKGZpZWxkcyksIG51bGwpO1xuICAgICAgICB9XG5cbiAgICAgICAgcXVlcnkuYWRkZWQoZG9jLl9pZCwgdGhpcy5fcHJvamVjdGlvbkZuKGZpZWxkcykpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgY29uc3QgaGFuZGxlID0gT2JqZWN0LmFzc2lnbihuZXcgTG9jYWxDb2xsZWN0aW9uLk9ic2VydmVIYW5kbGUsIHtcbiAgICAgIGNvbGxlY3Rpb246IHRoaXMuY29sbGVjdGlvbixcbiAgICAgIHN0b3A6ICgpID0+IHtcbiAgICAgICAgaWYgKHRoaXMucmVhY3RpdmUpIHtcbiAgICAgICAgICBkZWxldGUgdGhpcy5jb2xsZWN0aW9uLnF1ZXJpZXNbcWlkXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKHRoaXMucmVhY3RpdmUgJiYgVHJhY2tlci5hY3RpdmUpIHtcbiAgICAgIC8vIFhYWCBpbiBtYW55IGNhc2VzLCB0aGUgc2FtZSBvYnNlcnZlIHdpbGwgYmUgcmVjcmVhdGVkIHdoZW5cbiAgICAgIC8vIHRoZSBjdXJyZW50IGF1dG9ydW4gaXMgcmVydW4uICB3ZSBjb3VsZCBzYXZlIHdvcmsgYnlcbiAgICAgIC8vIGxldHRpbmcgaXQgbGluZ2VyIGFjcm9zcyByZXJ1biBhbmQgcG90ZW50aWFsbHkgZ2V0XG4gICAgICAvLyByZXB1cnBvc2VkIGlmIHRoZSBzYW1lIG9ic2VydmUgaXMgcGVyZm9ybWVkLCB1c2luZyBsb2dpY1xuICAgICAgLy8gc2ltaWxhciB0byB0aGF0IG9mIE1ldGVvci5zdWJzY3JpYmUuXG4gICAgICBUcmFja2VyLm9uSW52YWxpZGF0ZSgoKSA9PiB7XG4gICAgICAgIGhhbmRsZS5zdG9wKCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBydW4gdGhlIG9ic2VydmUgY2FsbGJhY2tzIHJlc3VsdGluZyBmcm9tIHRoZSBpbml0aWFsIGNvbnRlbnRzXG4gICAgLy8gYmVmb3JlIHdlIGxlYXZlIHRoZSBvYnNlcnZlLlxuICAgIHRoaXMuY29sbGVjdGlvbi5fb2JzZXJ2ZVF1ZXVlLmRyYWluKCk7XG5cbiAgICByZXR1cm4gaGFuZGxlO1xuICB9XG5cbiAgLy8gWFhYIE1heWJlIHdlIG5lZWQgYSB2ZXJzaW9uIG9mIG9ic2VydmUgdGhhdCBqdXN0IGNhbGxzIGEgY2FsbGJhY2sgaWZcbiAgLy8gYW55dGhpbmcgY2hhbmdlZC5cbiAgX2RlcGVuZChjaGFuZ2VycywgX2FsbG93X3Vub3JkZXJlZCkge1xuICAgIGlmIChUcmFja2VyLmFjdGl2ZSkge1xuICAgICAgY29uc3QgZGVwZW5kZW5jeSA9IG5ldyBUcmFja2VyLkRlcGVuZGVuY3k7XG4gICAgICBjb25zdCBub3RpZnkgPSBkZXBlbmRlbmN5LmNoYW5nZWQuYmluZChkZXBlbmRlbmN5KTtcblxuICAgICAgZGVwZW5kZW5jeS5kZXBlbmQoKTtcblxuICAgICAgY29uc3Qgb3B0aW9ucyA9IHtfYWxsb3dfdW5vcmRlcmVkLCBfc3VwcHJlc3NfaW5pdGlhbDogdHJ1ZX07XG5cbiAgICAgIFsnYWRkZWQnLCAnYWRkZWRCZWZvcmUnLCAnY2hhbmdlZCcsICdtb3ZlZEJlZm9yZScsICdyZW1vdmVkJ11cbiAgICAgICAgLmZvckVhY2goZm4gPT4ge1xuICAgICAgICAgIGlmIChjaGFuZ2Vyc1tmbl0pIHtcbiAgICAgICAgICAgIG9wdGlvbnNbZm5dID0gbm90aWZ5O1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgIC8vIG9ic2VydmVDaGFuZ2VzIHdpbGwgc3RvcCgpIHdoZW4gdGhpcyBjb21wdXRhdGlvbiBpcyBpbnZhbGlkYXRlZFxuICAgICAgdGhpcy5vYnNlcnZlQ2hhbmdlcyhvcHRpb25zKTtcbiAgICB9XG4gIH1cblxuICBfZ2V0Q29sbGVjdGlvbk5hbWUoKSB7XG4gICAgcmV0dXJuIHRoaXMuY29sbGVjdGlvbi5uYW1lO1xuICB9XG5cbiAgLy8gUmV0dXJucyBhIGNvbGxlY3Rpb24gb2YgbWF0Y2hpbmcgb2JqZWN0cywgYnV0IGRvZXNuJ3QgZGVlcCBjb3B5IHRoZW0uXG4gIC8vXG4gIC8vIElmIG9yZGVyZWQgaXMgc2V0LCByZXR1cm5zIGEgc29ydGVkIGFycmF5LCByZXNwZWN0aW5nIHNvcnRlciwgc2tpcCwgYW5kXG4gIC8vIGxpbWl0IHByb3BlcnRpZXMgb2YgdGhlIHF1ZXJ5IHByb3ZpZGVkIHRoYXQgb3B0aW9ucy5hcHBseVNraXBMaW1pdCBpc1xuICAvLyBub3Qgc2V0IHRvIGZhbHNlICgjMTIwMSkuIElmIHNvcnRlciBpcyBmYWxzZXksIG5vIHNvcnQgLS0geW91IGdldCB0aGVcbiAgLy8gbmF0dXJhbCBvcmRlci5cbiAgLy9cbiAgLy8gSWYgb3JkZXJlZCBpcyBub3Qgc2V0LCByZXR1cm5zIGFuIG9iamVjdCBtYXBwaW5nIGZyb20gSUQgdG8gZG9jIChzb3J0ZXIsXG4gIC8vIHNraXAgYW5kIGxpbWl0IHNob3VsZCBub3QgYmUgc2V0KS5cbiAgLy9cbiAgLy8gSWYgb3JkZXJlZCBpcyBzZXQgYW5kIHRoaXMgY3Vyc29yIGlzIGEgJG5lYXIgZ2VvcXVlcnksIHRoZW4gdGhpcyBmdW5jdGlvblxuICAvLyB3aWxsIHVzZSBhbiBfSWRNYXAgdG8gdHJhY2sgZWFjaCBkaXN0YW5jZSBmcm9tIHRoZSAkbmVhciBhcmd1bWVudCBwb2ludCBpblxuICAvLyBvcmRlciB0byB1c2UgaXQgYXMgYSBzb3J0IGtleS4gSWYgYW4gX0lkTWFwIGlzIHBhc3NlZCBpbiB0aGUgJ2Rpc3RhbmNlcydcbiAgLy8gYXJndW1lbnQsIHRoaXMgZnVuY3Rpb24gd2lsbCBjbGVhciBpdCBhbmQgdXNlIGl0IGZvciB0aGlzIHB1cnBvc2VcbiAgLy8gKG90aGVyd2lzZSBpdCB3aWxsIGp1c3QgY3JlYXRlIGl0cyBvd24gX0lkTWFwKS4gVGhlIG9ic2VydmVDaGFuZ2VzXG4gIC8vIGltcGxlbWVudGF0aW9uIHVzZXMgdGhpcyB0byByZW1lbWJlciB0aGUgZGlzdGFuY2VzIGFmdGVyIHRoaXMgZnVuY3Rpb25cbiAgLy8gcmV0dXJucy5cbiAgX2dldFJhd09iamVjdHMob3B0aW9ucyA9IHt9KSB7XG4gICAgLy8gQnkgZGVmYXVsdCB0aGlzIG1ldGhvZCB3aWxsIHJlc3BlY3Qgc2tpcCBhbmQgbGltaXQgYmVjYXVzZSAuZmV0Y2goKSxcbiAgICAvLyAuZm9yRWFjaCgpIGV0Yy4uLiBleHBlY3QgdGhpcyBiZWhhdmlvdXIuIEl0IGNhbiBiZSBmb3JjZWQgdG8gaWdub3JlXG4gICAgLy8gc2tpcCBhbmQgbGltaXQgYnkgc2V0dGluZyBhcHBseVNraXBMaW1pdCB0byBmYWxzZSAoLmNvdW50KCkgZG9lcyB0aGlzLFxuICAgIC8vIGZvciBleGFtcGxlKVxuICAgIGNvbnN0IGFwcGx5U2tpcExpbWl0ID0gb3B0aW9ucy5hcHBseVNraXBMaW1pdCAhPT0gZmFsc2U7XG5cbiAgICAvLyBYWFggdXNlIE9yZGVyZWREaWN0IGluc3RlYWQgb2YgYXJyYXksIGFuZCBtYWtlIElkTWFwIGFuZCBPcmRlcmVkRGljdFxuICAgIC8vIGNvbXBhdGlibGVcbiAgICBjb25zdCByZXN1bHRzID0gb3B0aW9ucy5vcmRlcmVkID8gW10gOiBuZXcgTG9jYWxDb2xsZWN0aW9uLl9JZE1hcDtcblxuICAgIC8vIGZhc3QgcGF0aCBmb3Igc2luZ2xlIElEIHZhbHVlXG4gICAgaWYgKHRoaXMuX3NlbGVjdG9ySWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gSWYgeW91IGhhdmUgbm9uLXplcm8gc2tpcCBhbmQgYXNrIGZvciBhIHNpbmdsZSBpZCwgeW91IGdldCBub3RoaW5nLlxuICAgICAgLy8gVGhpcyBpcyBzbyBpdCBtYXRjaGVzIHRoZSBiZWhhdmlvciBvZiB0aGUgJ3tfaWQ6IGZvb30nIHBhdGguXG4gICAgICBpZiAoYXBwbHlTa2lwTGltaXQgJiYgdGhpcy5za2lwKSB7XG4gICAgICAgIHJldHVybiByZXN1bHRzO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBzZWxlY3RlZERvYyA9IHRoaXMuY29sbGVjdGlvbi5fZG9jcy5nZXQodGhpcy5fc2VsZWN0b3JJZCk7XG5cbiAgICAgIGlmIChzZWxlY3RlZERvYykge1xuICAgICAgICBpZiAob3B0aW9ucy5vcmRlcmVkKSB7XG4gICAgICAgICAgcmVzdWx0cy5wdXNoKHNlbGVjdGVkRG9jKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHRzLnNldCh0aGlzLl9zZWxlY3RvcklkLCBzZWxlY3RlZERvYyk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgfVxuXG4gICAgLy8gc2xvdyBwYXRoIGZvciBhcmJpdHJhcnkgc2VsZWN0b3IsIHNvcnQsIHNraXAsIGxpbWl0XG5cbiAgICAvLyBpbiB0aGUgb2JzZXJ2ZUNoYW5nZXMgY2FzZSwgZGlzdGFuY2VzIGlzIGFjdHVhbGx5IHBhcnQgb2YgdGhlIFwicXVlcnlcIlxuICAgIC8vIChpZSwgbGl2ZSByZXN1bHRzIHNldCkgb2JqZWN0LiAgaW4gb3RoZXIgY2FzZXMsIGRpc3RhbmNlcyBpcyBvbmx5IHVzZWRcbiAgICAvLyBpbnNpZGUgdGhpcyBmdW5jdGlvbi5cbiAgICBsZXQgZGlzdGFuY2VzO1xuICAgIGlmICh0aGlzLm1hdGNoZXIuaGFzR2VvUXVlcnkoKSAmJiBvcHRpb25zLm9yZGVyZWQpIHtcbiAgICAgIGlmIChvcHRpb25zLmRpc3RhbmNlcykge1xuICAgICAgICBkaXN0YW5jZXMgPSBvcHRpb25zLmRpc3RhbmNlcztcbiAgICAgICAgZGlzdGFuY2VzLmNsZWFyKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkaXN0YW5jZXMgPSBuZXcgTG9jYWxDb2xsZWN0aW9uLl9JZE1hcCgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuY29sbGVjdGlvbi5fZG9jcy5mb3JFYWNoKChkb2MsIGlkKSA9PiB7XG4gICAgICBjb25zdCBtYXRjaFJlc3VsdCA9IHRoaXMubWF0Y2hlci5kb2N1bWVudE1hdGNoZXMoZG9jKTtcblxuICAgICAgaWYgKG1hdGNoUmVzdWx0LnJlc3VsdCkge1xuICAgICAgICBpZiAob3B0aW9ucy5vcmRlcmVkKSB7XG4gICAgICAgICAgcmVzdWx0cy5wdXNoKGRvYyk7XG5cbiAgICAgICAgICBpZiAoZGlzdGFuY2VzICYmIG1hdGNoUmVzdWx0LmRpc3RhbmNlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGRpc3RhbmNlcy5zZXQoaWQsIG1hdGNoUmVzdWx0LmRpc3RhbmNlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzdWx0cy5zZXQoaWQsIGRvYyk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gT3ZlcnJpZGUgdG8gZW5zdXJlIGFsbCBkb2NzIGFyZSBtYXRjaGVkIGlmIGlnbm9yaW5nIHNraXAgJiBsaW1pdFxuICAgICAgaWYgKCFhcHBseVNraXBMaW1pdCkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgLy8gRmFzdCBwYXRoIGZvciBsaW1pdGVkIHVuc29ydGVkIHF1ZXJpZXMuXG4gICAgICAvLyBYWFggJ2xlbmd0aCcgY2hlY2sgaGVyZSBzZWVtcyB3cm9uZyBmb3Igb3JkZXJlZFxuICAgICAgcmV0dXJuIChcbiAgICAgICAgIXRoaXMubGltaXQgfHxcbiAgICAgICAgdGhpcy5za2lwIHx8XG4gICAgICAgIHRoaXMuc29ydGVyIHx8XG4gICAgICAgIHJlc3VsdHMubGVuZ3RoICE9PSB0aGlzLmxpbWl0XG4gICAgICApO1xuICAgIH0pO1xuXG4gICAgaWYgKCFvcHRpb25zLm9yZGVyZWQpIHtcbiAgICAgIHJldHVybiByZXN1bHRzO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnNvcnRlcikge1xuICAgICAgcmVzdWx0cy5zb3J0KHRoaXMuc29ydGVyLmdldENvbXBhcmF0b3Ioe2Rpc3RhbmNlc30pKTtcbiAgICB9XG5cbiAgICAvLyBSZXR1cm4gdGhlIGZ1bGwgc2V0IG9mIHJlc3VsdHMgaWYgdGhlcmUgaXMgbm8gc2tpcCBvciBsaW1pdCBvciBpZiB3ZSdyZVxuICAgIC8vIGlnbm9yaW5nIHRoZW1cbiAgICBpZiAoIWFwcGx5U2tpcExpbWl0IHx8ICghdGhpcy5saW1pdCAmJiAhdGhpcy5za2lwKSkge1xuICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdHMuc2xpY2UoXG4gICAgICB0aGlzLnNraXAsXG4gICAgICB0aGlzLmxpbWl0ID8gdGhpcy5saW1pdCArIHRoaXMuc2tpcCA6IHJlc3VsdHMubGVuZ3RoXG4gICAgKTtcbiAgfVxuXG4gIF9wdWJsaXNoQ3Vyc29yKHN1YnNjcmlwdGlvbikge1xuICAgIC8vIFhYWCBtaW5pbW9uZ28gc2hvdWxkIG5vdCBkZXBlbmQgb24gbW9uZ28tbGl2ZWRhdGEhXG4gICAgaWYgKCFQYWNrYWdlLm1vbmdvKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdDYW5cXCd0IHB1Ymxpc2ggZnJvbSBNaW5pbW9uZ28gd2l0aG91dCB0aGUgYG1vbmdvYCBwYWNrYWdlLidcbiAgICAgICk7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLmNvbGxlY3Rpb24ubmFtZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnQ2FuXFwndCBwdWJsaXNoIGEgY3Vyc29yIGZyb20gYSBjb2xsZWN0aW9uIHdpdGhvdXQgYSBuYW1lLidcbiAgICAgICk7XG4gICAgfVxuXG4gICAgcmV0dXJuIFBhY2thZ2UubW9uZ28uTW9uZ28uQ29sbGVjdGlvbi5fcHVibGlzaEN1cnNvcihcbiAgICAgIHRoaXMsXG4gICAgICBzdWJzY3JpcHRpb24sXG4gICAgICB0aGlzLmNvbGxlY3Rpb24ubmFtZVxuICAgICk7XG4gIH1cbn1cblxuLy8gSW1wbGVtZW50cyBhc3luYyB2ZXJzaW9uIG9mIGN1cnNvciBtZXRob2RzIHRvIGtlZXAgY29sbGVjdGlvbnMgaXNvbW9ycGhpY1xuQVNZTkNfQ1VSU09SX01FVEhPRFMuZm9yRWFjaChtZXRob2QgPT4ge1xuICBjb25zdCBhc3luY05hbWUgPSBnZXRBc3luY01ldGhvZE5hbWUobWV0aG9kKTtcbiAgQ3Vyc29yLnByb3RvdHlwZVthc3luY05hbWVdID0gZnVuY3Rpb24oLi4uYXJncykge1xuICAgIHRyeSB7XG4gICAgICB0aGlzW21ldGhvZF0uaXNDYWxsZWRGcm9tQXN5bmMgPSB0cnVlO1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzW21ldGhvZF0uYXBwbHkodGhpcywgYXJncykpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoZXJyb3IpO1xuICAgIH1cbiAgfTtcbn0pO1xuIiwiaW1wb3J0IEN1cnNvciBmcm9tICcuL2N1cnNvci5qcyc7XG5pbXBvcnQgT2JzZXJ2ZUhhbmRsZSBmcm9tICcuL29ic2VydmVfaGFuZGxlLmpzJztcbmltcG9ydCB7XG4gIGhhc093bixcbiAgaXNJbmRleGFibGUsXG4gIGlzTnVtZXJpY0tleSxcbiAgaXNPcGVyYXRvck9iamVjdCxcbiAgcG9wdWxhdGVEb2N1bWVudFdpdGhRdWVyeUZpZWxkcyxcbiAgcHJvamVjdGlvbkRldGFpbHMsXG59IGZyb20gJy4vY29tbW9uLmpzJztcblxuLy8gWFhYIHR5cGUgY2hlY2tpbmcgb24gc2VsZWN0b3JzIChncmFjZWZ1bCBlcnJvciBpZiBtYWxmb3JtZWQpXG5cbi8vIExvY2FsQ29sbGVjdGlvbjogYSBzZXQgb2YgZG9jdW1lbnRzIHRoYXQgc3VwcG9ydHMgcXVlcmllcyBhbmQgbW9kaWZpZXJzLlxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTG9jYWxDb2xsZWN0aW9uIHtcbiAgY29uc3RydWN0b3IobmFtZSkge1xuICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgLy8gX2lkIC0+IGRvY3VtZW50IChhbHNvIGNvbnRhaW5pbmcgaWQpXG4gICAgdGhpcy5fZG9jcyA9IG5ldyBMb2NhbENvbGxlY3Rpb24uX0lkTWFwO1xuXG4gICAgdGhpcy5fb2JzZXJ2ZVF1ZXVlID0gbmV3IE1ldGVvci5fU3luY2hyb25vdXNRdWV1ZSgpO1xuXG4gICAgdGhpcy5uZXh0X3FpZCA9IDE7IC8vIGxpdmUgcXVlcnkgaWQgZ2VuZXJhdG9yXG5cbiAgICAvLyBxaWQgLT4gbGl2ZSBxdWVyeSBvYmplY3QuIGtleXM6XG4gICAgLy8gIG9yZGVyZWQ6IGJvb2wuIG9yZGVyZWQgcXVlcmllcyBoYXZlIGFkZGVkQmVmb3JlL21vdmVkQmVmb3JlIGNhbGxiYWNrcy5cbiAgICAvLyAgcmVzdWx0czogYXJyYXkgKG9yZGVyZWQpIG9yIG9iamVjdCAodW5vcmRlcmVkKSBvZiBjdXJyZW50IHJlc3VsdHNcbiAgICAvLyAgICAoYWxpYXNlZCB3aXRoIHRoaXMuX2RvY3MhKVxuICAgIC8vICByZXN1bHRzU25hcHNob3Q6IHNuYXBzaG90IG9mIHJlc3VsdHMuIG51bGwgaWYgbm90IHBhdXNlZC5cbiAgICAvLyAgY3Vyc29yOiBDdXJzb3Igb2JqZWN0IGZvciB0aGUgcXVlcnkuXG4gICAgLy8gIHNlbGVjdG9yLCBzb3J0ZXIsIChjYWxsYmFja3MpOiBmdW5jdGlvbnNcbiAgICB0aGlzLnF1ZXJpZXMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gICAgLy8gbnVsbCBpZiBub3Qgc2F2aW5nIG9yaWdpbmFsczsgYW4gSWRNYXAgZnJvbSBpZCB0byBvcmlnaW5hbCBkb2N1bWVudCB2YWx1ZVxuICAgIC8vIGlmIHNhdmluZyBvcmlnaW5hbHMuIFNlZSBjb21tZW50cyBiZWZvcmUgc2F2ZU9yaWdpbmFscygpLlxuICAgIHRoaXMuX3NhdmVkT3JpZ2luYWxzID0gbnVsbDtcblxuICAgIC8vIFRydWUgd2hlbiBvYnNlcnZlcnMgYXJlIHBhdXNlZCBhbmQgd2Ugc2hvdWxkIG5vdCBzZW5kIGNhbGxiYWNrcy5cbiAgICB0aGlzLnBhdXNlZCA9IGZhbHNlO1xuICB9XG5cbiAgY291bnREb2N1bWVudHMoc2VsZWN0b3IsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gdGhpcy5maW5kKHNlbGVjdG9yID8/IHt9LCBvcHRpb25zKS5jb3VudEFzeW5jKCk7XG4gIH1cblxuICBlc3RpbWF0ZWREb2N1bWVudENvdW50KG9wdGlvbnMpIHtcbiAgICByZXR1cm4gdGhpcy5maW5kKHt9LCBvcHRpb25zKS5jb3VudEFzeW5jKCk7XG4gIH1cblxuICAvLyBvcHRpb25zIG1heSBpbmNsdWRlIHNvcnQsIHNraXAsIGxpbWl0LCByZWFjdGl2ZVxuICAvLyBzb3J0IG1heSBiZSBhbnkgb2YgdGhlc2UgZm9ybXM6XG4gIC8vICAgICB7YTogMSwgYjogLTF9XG4gIC8vICAgICBbW1wiYVwiLCBcImFzY1wiXSwgW1wiYlwiLCBcImRlc2NcIl1dXG4gIC8vICAgICBbXCJhXCIsIFtcImJcIiwgXCJkZXNjXCJdXVxuICAvLyAgIChpbiB0aGUgZmlyc3QgZm9ybSB5b3UncmUgYmVob2xkZW4gdG8ga2V5IGVudW1lcmF0aW9uIG9yZGVyIGluXG4gIC8vICAgeW91ciBqYXZhc2NyaXB0IFZNKVxuICAvL1xuICAvLyByZWFjdGl2ZTogaWYgZ2l2ZW4sIGFuZCBmYWxzZSwgZG9uJ3QgcmVnaXN0ZXIgd2l0aCBUcmFja2VyIChkZWZhdWx0XG4gIC8vIGlzIHRydWUpXG4gIC8vXG4gIC8vIFhYWCBwb3NzaWJseSBzaG91bGQgc3VwcG9ydCByZXRyaWV2aW5nIGEgc3Vic2V0IG9mIGZpZWxkcz8gYW5kXG4gIC8vIGhhdmUgaXQgYmUgYSBoaW50IChpZ25vcmVkIG9uIHRoZSBjbGllbnQsIHdoZW4gbm90IGNvcHlpbmcgdGhlXG4gIC8vIGRvYz8pXG4gIC8vXG4gIC8vIFhYWCBzb3J0IGRvZXMgbm90IHlldCBzdXBwb3J0IHN1YmtleXMgKCdhLmInKSAuLiBmaXggdGhhdCFcbiAgLy8gWFhYIGFkZCBvbmUgbW9yZSBzb3J0IGZvcm06IFwia2V5XCJcbiAgLy8gWFhYIHRlc3RzXG4gIGZpbmQoc2VsZWN0b3IsIG9wdGlvbnMpIHtcbiAgICAvLyBkZWZhdWx0IHN5bnRheCBmb3IgZXZlcnl0aGluZyBpcyB0byBvbWl0IHRoZSBzZWxlY3RvciBhcmd1bWVudC5cbiAgICAvLyBidXQgaWYgc2VsZWN0b3IgaXMgZXhwbGljaXRseSBwYXNzZWQgaW4gYXMgZmFsc2Ugb3IgdW5kZWZpbmVkLCB3ZVxuICAgIC8vIHdhbnQgYSBzZWxlY3RvciB0aGF0IG1hdGNoZXMgbm90aGluZy5cbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgc2VsZWN0b3IgPSB7fTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IExvY2FsQ29sbGVjdGlvbi5DdXJzb3IodGhpcywgc2VsZWN0b3IsIG9wdGlvbnMpO1xuICB9XG5cbiAgZmluZE9uZShzZWxlY3Rvciwgb3B0aW9ucyA9IHt9KSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHNlbGVjdG9yID0ge307XG4gICAgfVxuXG4gICAgLy8gTk9URTogYnkgc2V0dGluZyBsaW1pdCAxIGhlcmUsIHdlIGVuZCB1cCB1c2luZyB2ZXJ5IGluZWZmaWNpZW50XG4gICAgLy8gY29kZSB0aGF0IHJlY29tcHV0ZXMgdGhlIHdob2xlIHF1ZXJ5IG9uIGVhY2ggdXBkYXRlLiBUaGUgdXBzaWRlIGlzXG4gICAgLy8gdGhhdCB3aGVuIHlvdSByZWFjdGl2ZWx5IGRlcGVuZCBvbiBhIGZpbmRPbmUgeW91IG9ubHkgZ2V0XG4gICAgLy8gaW52YWxpZGF0ZWQgd2hlbiB0aGUgZm91bmQgb2JqZWN0IGNoYW5nZXMsIG5vdCBhbnkgb2JqZWN0IGluIHRoZVxuICAgIC8vIGNvbGxlY3Rpb24uIE1vc3QgZmluZE9uZSB3aWxsIGJlIGJ5IGlkLCB3aGljaCBoYXMgYSBmYXN0IHBhdGgsIHNvXG4gICAgLy8gdGhpcyBtaWdodCBub3QgYmUgYSBiaWcgZGVhbC4gSW4gbW9zdCBjYXNlcywgaW52YWxpZGF0aW9uIGNhdXNlc1xuICAgIC8vIHRoZSBjYWxsZWQgdG8gcmUtcXVlcnkgYW55d2F5LCBzbyB0aGlzIHNob3VsZCBiZSBhIG5ldCBwZXJmb3JtYW5jZVxuICAgIC8vIGltcHJvdmVtZW50LlxuICAgIG9wdGlvbnMubGltaXQgPSAxO1xuXG4gICAgcmV0dXJuIHRoaXMuZmluZChzZWxlY3Rvciwgb3B0aW9ucykuZmV0Y2goKVswXTtcbiAgfVxuXG4gIC8vIFhYWCBwb3NzaWJseSBlbmZvcmNlIHRoYXQgJ3VuZGVmaW5lZCcgZG9lcyBub3QgYXBwZWFyICh3ZSBhc3N1bWVcbiAgLy8gdGhpcyBpbiBvdXIgaGFuZGxpbmcgb2YgbnVsbCBhbmQgJGV4aXN0cylcbiAgaW5zZXJ0KGRvYywgY2FsbGJhY2spIHtcbiAgICBkb2MgPSBFSlNPTi5jbG9uZShkb2MpO1xuXG4gICAgYXNzZXJ0SGFzVmFsaWRGaWVsZE5hbWVzKGRvYyk7XG5cbiAgICAvLyBpZiB5b3UgcmVhbGx5IHdhbnQgdG8gdXNlIE9iamVjdElEcywgc2V0IHRoaXMgZ2xvYmFsLlxuICAgIC8vIE1vbmdvLkNvbGxlY3Rpb24gc3BlY2lmaWVzIGl0cyBvd24gaWRzIGFuZCBkb2VzIG5vdCB1c2UgdGhpcyBjb2RlLlxuICAgIGlmICghaGFzT3duLmNhbGwoZG9jLCAnX2lkJykpIHtcbiAgICAgIGRvYy5faWQgPSBMb2NhbENvbGxlY3Rpb24uX3VzZU9JRCA/IG5ldyBNb25nb0lELk9iamVjdElEKCkgOiBSYW5kb20uaWQoKTtcbiAgICB9XG5cbiAgICBjb25zdCBpZCA9IGRvYy5faWQ7XG5cbiAgICBpZiAodGhpcy5fZG9jcy5oYXMoaWQpKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihgRHVwbGljYXRlIF9pZCAnJHtpZH0nYCk7XG4gICAgfVxuXG4gICAgdGhpcy5fc2F2ZU9yaWdpbmFsKGlkLCB1bmRlZmluZWQpO1xuICAgIHRoaXMuX2RvY3Muc2V0KGlkLCBkb2MpO1xuXG4gICAgY29uc3QgcXVlcmllc1RvUmVjb21wdXRlID0gW107XG5cbiAgICAvLyB0cmlnZ2VyIGxpdmUgcXVlcmllcyB0aGF0IG1hdGNoXG4gICAgT2JqZWN0LmtleXModGhpcy5xdWVyaWVzKS5mb3JFYWNoKHFpZCA9PiB7XG4gICAgICBjb25zdCBxdWVyeSA9IHRoaXMucXVlcmllc1txaWRdO1xuXG4gICAgICBpZiAocXVlcnkuZGlydHkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBtYXRjaFJlc3VsdCA9IHF1ZXJ5Lm1hdGNoZXIuZG9jdW1lbnRNYXRjaGVzKGRvYyk7XG5cbiAgICAgIGlmIChtYXRjaFJlc3VsdC5yZXN1bHQpIHtcbiAgICAgICAgaWYgKHF1ZXJ5LmRpc3RhbmNlcyAmJiBtYXRjaFJlc3VsdC5kaXN0YW5jZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgcXVlcnkuZGlzdGFuY2VzLnNldChpZCwgbWF0Y2hSZXN1bHQuZGlzdGFuY2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHF1ZXJ5LmN1cnNvci5za2lwIHx8IHF1ZXJ5LmN1cnNvci5saW1pdCkge1xuICAgICAgICAgIHF1ZXJpZXNUb1JlY29tcHV0ZS5wdXNoKHFpZCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgTG9jYWxDb2xsZWN0aW9uLl9pbnNlcnRJblJlc3VsdHMocXVlcnksIGRvYyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHF1ZXJpZXNUb1JlY29tcHV0ZS5mb3JFYWNoKHFpZCA9PiB7XG4gICAgICBpZiAodGhpcy5xdWVyaWVzW3FpZF0pIHtcbiAgICAgICAgdGhpcy5fcmVjb21wdXRlUmVzdWx0cyh0aGlzLnF1ZXJpZXNbcWlkXSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB0aGlzLl9vYnNlcnZlUXVldWUuZHJhaW4oKTtcblxuICAgIC8vIERlZmVyIGJlY2F1c2UgdGhlIGNhbGxlciBsaWtlbHkgZG9lc24ndCBleHBlY3QgdGhlIGNhbGxiYWNrIHRvIGJlIHJ1blxuICAgIC8vIGltbWVkaWF0ZWx5LlxuICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgTWV0ZW9yLmRlZmVyKCgpID0+IHtcbiAgICAgICAgY2FsbGJhY2sobnVsbCwgaWQpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGlkO1xuICB9XG5cbiAgLy8gUGF1c2UgdGhlIG9ic2VydmVycy4gTm8gY2FsbGJhY2tzIGZyb20gb2JzZXJ2ZXJzIHdpbGwgZmlyZSB1bnRpbFxuICAvLyAncmVzdW1lT2JzZXJ2ZXJzJyBpcyBjYWxsZWQuXG4gIHBhdXNlT2JzZXJ2ZXJzKCkge1xuICAgIC8vIE5vLW9wIGlmIGFscmVhZHkgcGF1c2VkLlxuICAgIGlmICh0aGlzLnBhdXNlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIFNldCB0aGUgJ3BhdXNlZCcgZmxhZyBzdWNoIHRoYXQgbmV3IG9ic2VydmVyIG1lc3NhZ2VzIGRvbid0IGZpcmUuXG4gICAgdGhpcy5wYXVzZWQgPSB0cnVlO1xuXG4gICAgLy8gVGFrZSBhIHNuYXBzaG90IG9mIHRoZSBxdWVyeSByZXN1bHRzIGZvciBlYWNoIHF1ZXJ5LlxuICAgIE9iamVjdC5rZXlzKHRoaXMucXVlcmllcykuZm9yRWFjaChxaWQgPT4ge1xuICAgICAgY29uc3QgcXVlcnkgPSB0aGlzLnF1ZXJpZXNbcWlkXTtcbiAgICAgIHF1ZXJ5LnJlc3VsdHNTbmFwc2hvdCA9IEVKU09OLmNsb25lKHF1ZXJ5LnJlc3VsdHMpO1xuICAgIH0pO1xuICB9XG5cbiAgcmVtb3ZlKHNlbGVjdG9yLCBjYWxsYmFjaykge1xuICAgIC8vIEVhc3kgc3BlY2lhbCBjYXNlOiBpZiB3ZSdyZSBub3QgY2FsbGluZyBvYnNlcnZlQ2hhbmdlcyBjYWxsYmFja3MgYW5kXG4gICAgLy8gd2UncmUgbm90IHNhdmluZyBvcmlnaW5hbHMgYW5kIHdlIGdvdCBhc2tlZCB0byByZW1vdmUgZXZlcnl0aGluZywgdGhlblxuICAgIC8vIGp1c3QgZW1wdHkgZXZlcnl0aGluZyBkaXJlY3RseS5cbiAgICBpZiAodGhpcy5wYXVzZWQgJiYgIXRoaXMuX3NhdmVkT3JpZ2luYWxzICYmIEVKU09OLmVxdWFscyhzZWxlY3Rvciwge30pKSB7XG4gICAgICBjb25zdCByZXN1bHQgPSB0aGlzLl9kb2NzLnNpemUoKTtcblxuICAgICAgdGhpcy5fZG9jcy5jbGVhcigpO1xuXG4gICAgICBPYmplY3Qua2V5cyh0aGlzLnF1ZXJpZXMpLmZvckVhY2gocWlkID0+IHtcbiAgICAgICAgY29uc3QgcXVlcnkgPSB0aGlzLnF1ZXJpZXNbcWlkXTtcblxuICAgICAgICBpZiAocXVlcnkub3JkZXJlZCkge1xuICAgICAgICAgIHF1ZXJ5LnJlc3VsdHMgPSBbXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBxdWVyeS5yZXN1bHRzLmNsZWFyKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgTWV0ZW9yLmRlZmVyKCgpID0+IHtcbiAgICAgICAgICBjYWxsYmFjayhudWxsLCByZXN1bHQpO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICBjb25zdCBtYXRjaGVyID0gbmV3IE1pbmltb25nby5NYXRjaGVyKHNlbGVjdG9yKTtcbiAgICBjb25zdCByZW1vdmUgPSBbXTtcblxuICAgIHRoaXMuX2VhY2hQb3NzaWJseU1hdGNoaW5nRG9jKHNlbGVjdG9yLCAoZG9jLCBpZCkgPT4ge1xuICAgICAgaWYgKG1hdGNoZXIuZG9jdW1lbnRNYXRjaGVzKGRvYykucmVzdWx0KSB7XG4gICAgICAgIHJlbW92ZS5wdXNoKGlkKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGNvbnN0IHF1ZXJpZXNUb1JlY29tcHV0ZSA9IFtdO1xuICAgIGNvbnN0IHF1ZXJ5UmVtb3ZlID0gW107XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJlbW92ZS5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgcmVtb3ZlSWQgPSByZW1vdmVbaV07XG4gICAgICBjb25zdCByZW1vdmVEb2MgPSB0aGlzLl9kb2NzLmdldChyZW1vdmVJZCk7XG5cbiAgICAgIE9iamVjdC5rZXlzKHRoaXMucXVlcmllcykuZm9yRWFjaChxaWQgPT4ge1xuICAgICAgICBjb25zdCBxdWVyeSA9IHRoaXMucXVlcmllc1txaWRdO1xuXG4gICAgICAgIGlmIChxdWVyeS5kaXJ0eSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChxdWVyeS5tYXRjaGVyLmRvY3VtZW50TWF0Y2hlcyhyZW1vdmVEb2MpLnJlc3VsdCkge1xuICAgICAgICAgIGlmIChxdWVyeS5jdXJzb3Iuc2tpcCB8fCBxdWVyeS5jdXJzb3IubGltaXQpIHtcbiAgICAgICAgICAgIHF1ZXJpZXNUb1JlY29tcHV0ZS5wdXNoKHFpZCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHF1ZXJ5UmVtb3ZlLnB1c2goe3FpZCwgZG9jOiByZW1vdmVEb2N9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLl9zYXZlT3JpZ2luYWwocmVtb3ZlSWQsIHJlbW92ZURvYyk7XG4gICAgICB0aGlzLl9kb2NzLnJlbW92ZShyZW1vdmVJZCk7XG4gICAgfVxuXG4gICAgLy8gcnVuIGxpdmUgcXVlcnkgY2FsbGJhY2tzIF9hZnRlcl8gd2UndmUgcmVtb3ZlZCB0aGUgZG9jdW1lbnRzLlxuICAgIHF1ZXJ5UmVtb3ZlLmZvckVhY2gocmVtb3ZlID0+IHtcbiAgICAgIGNvbnN0IHF1ZXJ5ID0gdGhpcy5xdWVyaWVzW3JlbW92ZS5xaWRdO1xuXG4gICAgICBpZiAocXVlcnkpIHtcbiAgICAgICAgcXVlcnkuZGlzdGFuY2VzICYmIHF1ZXJ5LmRpc3RhbmNlcy5yZW1vdmUocmVtb3ZlLmRvYy5faWQpO1xuICAgICAgICBMb2NhbENvbGxlY3Rpb24uX3JlbW92ZUZyb21SZXN1bHRzKHF1ZXJ5LCByZW1vdmUuZG9jKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHF1ZXJpZXNUb1JlY29tcHV0ZS5mb3JFYWNoKHFpZCA9PiB7XG4gICAgICBjb25zdCBxdWVyeSA9IHRoaXMucXVlcmllc1txaWRdO1xuXG4gICAgICBpZiAocXVlcnkpIHtcbiAgICAgICAgdGhpcy5fcmVjb21wdXRlUmVzdWx0cyhxdWVyeSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB0aGlzLl9vYnNlcnZlUXVldWUuZHJhaW4oKTtcblxuICAgIGNvbnN0IHJlc3VsdCA9IHJlbW92ZS5sZW5ndGg7XG5cbiAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgIE1ldGVvci5kZWZlcigoKSA9PiB7XG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3VsdCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLy8gUmVzdW1lIHRoZSBvYnNlcnZlcnMuIE9ic2VydmVycyBpbW1lZGlhdGVseSByZWNlaXZlIGNoYW5nZVxuICAvLyBub3RpZmljYXRpb25zIHRvIGJyaW5nIHRoZW0gdG8gdGhlIGN1cnJlbnQgc3RhdGUgb2YgdGhlXG4gIC8vIGRhdGFiYXNlLiBOb3RlIHRoYXQgdGhpcyBpcyBub3QganVzdCByZXBsYXlpbmcgYWxsIHRoZSBjaGFuZ2VzIHRoYXRcbiAgLy8gaGFwcGVuZWQgZHVyaW5nIHRoZSBwYXVzZSwgaXQgaXMgYSBzbWFydGVyICdjb2FsZXNjZWQnIGRpZmYuXG4gIHJlc3VtZU9ic2VydmVycygpIHtcbiAgICAvLyBOby1vcCBpZiBub3QgcGF1c2VkLlxuICAgIGlmICghdGhpcy5wYXVzZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBVbnNldCB0aGUgJ3BhdXNlZCcgZmxhZy4gTWFrZSBzdXJlIHRvIGRvIHRoaXMgZmlyc3QsIG90aGVyd2lzZVxuICAgIC8vIG9ic2VydmVyIG1ldGhvZHMgd29uJ3QgYWN0dWFsbHkgZmlyZSB3aGVuIHdlIHRyaWdnZXIgdGhlbS5cbiAgICB0aGlzLnBhdXNlZCA9IGZhbHNlO1xuXG4gICAgT2JqZWN0LmtleXModGhpcy5xdWVyaWVzKS5mb3JFYWNoKHFpZCA9PiB7XG4gICAgICBjb25zdCBxdWVyeSA9IHRoaXMucXVlcmllc1txaWRdO1xuXG4gICAgICBpZiAocXVlcnkuZGlydHkpIHtcbiAgICAgICAgcXVlcnkuZGlydHkgPSBmYWxzZTtcblxuICAgICAgICAvLyByZS1jb21wdXRlIHJlc3VsdHMgd2lsbCBwZXJmb3JtIGBMb2NhbENvbGxlY3Rpb24uX2RpZmZRdWVyeUNoYW5nZXNgXG4gICAgICAgIC8vIGF1dG9tYXRpY2FsbHkuXG4gICAgICAgIHRoaXMuX3JlY29tcHV0ZVJlc3VsdHMocXVlcnksIHF1ZXJ5LnJlc3VsdHNTbmFwc2hvdCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBEaWZmIHRoZSBjdXJyZW50IHJlc3VsdHMgYWdhaW5zdCB0aGUgc25hcHNob3QgYW5kIHNlbmQgdG8gb2JzZXJ2ZXJzLlxuICAgICAgICAvLyBwYXNzIHRoZSBxdWVyeSBvYmplY3QgZm9yIGl0cyBvYnNlcnZlciBjYWxsYmFja3MuXG4gICAgICAgIExvY2FsQ29sbGVjdGlvbi5fZGlmZlF1ZXJ5Q2hhbmdlcyhcbiAgICAgICAgICBxdWVyeS5vcmRlcmVkLFxuICAgICAgICAgIHF1ZXJ5LnJlc3VsdHNTbmFwc2hvdCxcbiAgICAgICAgICBxdWVyeS5yZXN1bHRzLFxuICAgICAgICAgIHF1ZXJ5LFxuICAgICAgICAgIHtwcm9qZWN0aW9uRm46IHF1ZXJ5LnByb2plY3Rpb25Gbn1cbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgcXVlcnkucmVzdWx0c1NuYXBzaG90ID0gbnVsbDtcbiAgICB9KTtcblxuICAgIHRoaXMuX29ic2VydmVRdWV1ZS5kcmFpbigpO1xuICB9XG5cbiAgcmV0cmlldmVPcmlnaW5hbHMoKSB7XG4gICAgaWYgKCF0aGlzLl9zYXZlZE9yaWdpbmFscykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYWxsZWQgcmV0cmlldmVPcmlnaW5hbHMgd2l0aG91dCBzYXZlT3JpZ2luYWxzJyk7XG4gICAgfVxuXG4gICAgY29uc3Qgb3JpZ2luYWxzID0gdGhpcy5fc2F2ZWRPcmlnaW5hbHM7XG5cbiAgICB0aGlzLl9zYXZlZE9yaWdpbmFscyA9IG51bGw7XG5cbiAgICByZXR1cm4gb3JpZ2luYWxzO1xuICB9XG5cbiAgLy8gVG8gdHJhY2sgd2hhdCBkb2N1bWVudHMgYXJlIGFmZmVjdGVkIGJ5IGEgcGllY2Ugb2YgY29kZSwgY2FsbFxuICAvLyBzYXZlT3JpZ2luYWxzKCkgYmVmb3JlIGl0IGFuZCByZXRyaWV2ZU9yaWdpbmFscygpIGFmdGVyIGl0LlxuICAvLyByZXRyaWV2ZU9yaWdpbmFscyByZXR1cm5zIGFuIG9iamVjdCB3aG9zZSBrZXlzIGFyZSB0aGUgaWRzIG9mIHRoZSBkb2N1bWVudHNcbiAgLy8gdGhhdCB3ZXJlIGFmZmVjdGVkIHNpbmNlIHRoZSBjYWxsIHRvIHNhdmVPcmlnaW5hbHMoKSwgYW5kIHRoZSB2YWx1ZXMgYXJlXG4gIC8vIGVxdWFsIHRvIHRoZSBkb2N1bWVudCdzIGNvbnRlbnRzIGF0IHRoZSB0aW1lIG9mIHNhdmVPcmlnaW5hbHMuIChJbiB0aGUgY2FzZVxuICAvLyBvZiBhbiBpbnNlcnRlZCBkb2N1bWVudCwgdW5kZWZpbmVkIGlzIHRoZSB2YWx1ZS4pIFlvdSBtdXN0IGFsdGVybmF0ZVxuICAvLyBiZXR3ZWVuIGNhbGxzIHRvIHNhdmVPcmlnaW5hbHMoKSBhbmQgcmV0cmlldmVPcmlnaW5hbHMoKS5cbiAgc2F2ZU9yaWdpbmFscygpIHtcbiAgICBpZiAodGhpcy5fc2F2ZWRPcmlnaW5hbHMpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ2FsbGVkIHNhdmVPcmlnaW5hbHMgdHdpY2Ugd2l0aG91dCByZXRyaWV2ZU9yaWdpbmFscycpO1xuICAgIH1cblxuICAgIHRoaXMuX3NhdmVkT3JpZ2luYWxzID0gbmV3IExvY2FsQ29sbGVjdGlvbi5fSWRNYXA7XG4gIH1cblxuICAvLyBYWFggYXRvbWljaXR5OiBpZiBtdWx0aSBpcyB0cnVlLCBhbmQgb25lIG1vZGlmaWNhdGlvbiBmYWlscywgZG9cbiAgLy8gd2Ugcm9sbGJhY2sgdGhlIHdob2xlIG9wZXJhdGlvbiwgb3Igd2hhdD9cbiAgdXBkYXRlKHNlbGVjdG9yLCBtb2QsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgaWYgKCEgY2FsbGJhY2sgJiYgb3B0aW9ucyBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICBvcHRpb25zID0gbnVsbDtcbiAgICB9XG5cbiAgICBpZiAoIW9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICB9XG5cbiAgICBjb25zdCBtYXRjaGVyID0gbmV3IE1pbmltb25nby5NYXRjaGVyKHNlbGVjdG9yLCB0cnVlKTtcblxuICAgIC8vIFNhdmUgdGhlIG9yaWdpbmFsIHJlc3VsdHMgb2YgYW55IHF1ZXJ5IHRoYXQgd2UgbWlnaHQgbmVlZCB0b1xuICAgIC8vIF9yZWNvbXB1dGVSZXN1bHRzIG9uLCBiZWNhdXNlIF9tb2RpZnlBbmROb3RpZnkgd2lsbCBtdXRhdGUgdGhlIG9iamVjdHMgaW5cbiAgICAvLyBpdC4gKFdlIGRvbid0IG5lZWQgdG8gc2F2ZSB0aGUgb3JpZ2luYWwgcmVzdWx0cyBvZiBwYXVzZWQgcXVlcmllcyBiZWNhdXNlXG4gICAgLy8gdGhleSBhbHJlYWR5IGhhdmUgYSByZXN1bHRzU25hcHNob3QgYW5kIHdlIHdvbid0IGJlIGRpZmZpbmcgaW5cbiAgICAvLyBfcmVjb21wdXRlUmVzdWx0cy4pXG4gICAgY29uc3QgcWlkVG9PcmlnaW5hbFJlc3VsdHMgPSB7fTtcblxuICAgIC8vIFdlIHNob3VsZCBvbmx5IGNsb25lIGVhY2ggZG9jdW1lbnQgb25jZSwgZXZlbiBpZiBpdCBhcHBlYXJzIGluIG11bHRpcGxlXG4gICAgLy8gcXVlcmllc1xuICAgIGNvbnN0IGRvY01hcCA9IG5ldyBMb2NhbENvbGxlY3Rpb24uX0lkTWFwO1xuICAgIGNvbnN0IGlkc01hdGNoZWQgPSBMb2NhbENvbGxlY3Rpb24uX2lkc01hdGNoZWRCeVNlbGVjdG9yKHNlbGVjdG9yKTtcblxuICAgIE9iamVjdC5rZXlzKHRoaXMucXVlcmllcykuZm9yRWFjaChxaWQgPT4ge1xuICAgICAgY29uc3QgcXVlcnkgPSB0aGlzLnF1ZXJpZXNbcWlkXTtcblxuICAgICAgaWYgKChxdWVyeS5jdXJzb3Iuc2tpcCB8fCBxdWVyeS5jdXJzb3IubGltaXQpICYmICEgdGhpcy5wYXVzZWQpIHtcbiAgICAgICAgLy8gQ2F0Y2ggdGhlIGNhc2Ugb2YgYSByZWFjdGl2ZSBgY291bnQoKWAgb24gYSBjdXJzb3Igd2l0aCBza2lwXG4gICAgICAgIC8vIG9yIGxpbWl0LCB3aGljaCByZWdpc3RlcnMgYW4gdW5vcmRlcmVkIG9ic2VydmUuIFRoaXMgaXMgYVxuICAgICAgICAvLyBwcmV0dHkgcmFyZSBjYXNlLCBzbyB3ZSBqdXN0IGNsb25lIHRoZSBlbnRpcmUgcmVzdWx0IHNldCB3aXRoXG4gICAgICAgIC8vIG5vIG9wdGltaXphdGlvbnMgZm9yIGRvY3VtZW50cyB0aGF0IGFwcGVhciBpbiB0aGVzZSByZXN1bHRcbiAgICAgICAgLy8gc2V0cyBhbmQgb3RoZXIgcXVlcmllcy5cbiAgICAgICAgaWYgKHF1ZXJ5LnJlc3VsdHMgaW5zdGFuY2VvZiBMb2NhbENvbGxlY3Rpb24uX0lkTWFwKSB7XG4gICAgICAgICAgcWlkVG9PcmlnaW5hbFJlc3VsdHNbcWlkXSA9IHF1ZXJ5LnJlc3VsdHMuY2xvbmUoKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIShxdWVyeS5yZXN1bHRzIGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdBc3NlcnRpb24gZmFpbGVkOiBxdWVyeS5yZXN1bHRzIG5vdCBhbiBhcnJheScpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2xvbmVzIGEgZG9jdW1lbnQgdG8gYmUgc3RvcmVkIGluIGBxaWRUb09yaWdpbmFsUmVzdWx0c2BcbiAgICAgICAgLy8gYmVjYXVzZSBpdCBtYXkgYmUgbW9kaWZpZWQgYmVmb3JlIHRoZSBuZXcgYW5kIG9sZCByZXN1bHQgc2V0c1xuICAgICAgICAvLyBhcmUgZGlmZmVkLiBCdXQgaWYgd2Uga25vdyBleGFjdGx5IHdoaWNoIGRvY3VtZW50IElEcyB3ZSdyZVxuICAgICAgICAvLyBnb2luZyB0byBtb2RpZnksIHRoZW4gd2Ugb25seSBuZWVkIHRvIGNsb25lIHRob3NlLlxuICAgICAgICBjb25zdCBtZW1vaXplZENsb25lSWZOZWVkZWQgPSBkb2MgPT4ge1xuICAgICAgICAgIGlmIChkb2NNYXAuaGFzKGRvYy5faWQpKSB7XG4gICAgICAgICAgICByZXR1cm4gZG9jTWFwLmdldChkb2MuX2lkKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBjb25zdCBkb2NUb01lbW9pemUgPSAoXG4gICAgICAgICAgICBpZHNNYXRjaGVkICYmXG4gICAgICAgICAgICAhaWRzTWF0Y2hlZC5zb21lKGlkID0+IEVKU09OLmVxdWFscyhpZCwgZG9jLl9pZCkpXG4gICAgICAgICAgKSA/IGRvYyA6IEVKU09OLmNsb25lKGRvYyk7XG5cbiAgICAgICAgICBkb2NNYXAuc2V0KGRvYy5faWQsIGRvY1RvTWVtb2l6ZSk7XG5cbiAgICAgICAgICByZXR1cm4gZG9jVG9NZW1vaXplO1xuICAgICAgICB9O1xuXG4gICAgICAgIHFpZFRvT3JpZ2luYWxSZXN1bHRzW3FpZF0gPSBxdWVyeS5yZXN1bHRzLm1hcChtZW1vaXplZENsb25lSWZOZWVkZWQpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgY29uc3QgcmVjb21wdXRlUWlkcyA9IHt9O1xuXG4gICAgbGV0IHVwZGF0ZUNvdW50ID0gMDtcblxuICAgIHRoaXMuX2VhY2hQb3NzaWJseU1hdGNoaW5nRG9jKHNlbGVjdG9yLCAoZG9jLCBpZCkgPT4ge1xuICAgICAgY29uc3QgcXVlcnlSZXN1bHQgPSBtYXRjaGVyLmRvY3VtZW50TWF0Y2hlcyhkb2MpO1xuXG4gICAgICBpZiAocXVlcnlSZXN1bHQucmVzdWx0KSB7XG4gICAgICAgIC8vIFhYWCBTaG91bGQgd2Ugc2F2ZSB0aGUgb3JpZ2luYWwgZXZlbiBpZiBtb2QgZW5kcyB1cCBiZWluZyBhIG5vLW9wP1xuICAgICAgICB0aGlzLl9zYXZlT3JpZ2luYWwoaWQsIGRvYyk7XG4gICAgICAgIHRoaXMuX21vZGlmeUFuZE5vdGlmeShcbiAgICAgICAgICBkb2MsXG4gICAgICAgICAgbW9kLFxuICAgICAgICAgIHJlY29tcHV0ZVFpZHMsXG4gICAgICAgICAgcXVlcnlSZXN1bHQuYXJyYXlJbmRpY2VzXG4gICAgICAgICk7XG5cbiAgICAgICAgKyt1cGRhdGVDb3VudDtcblxuICAgICAgICBpZiAoIW9wdGlvbnMubXVsdGkpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7IC8vIGJyZWFrXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG5cbiAgICBPYmplY3Qua2V5cyhyZWNvbXB1dGVRaWRzKS5mb3JFYWNoKHFpZCA9PiB7XG4gICAgICBjb25zdCBxdWVyeSA9IHRoaXMucXVlcmllc1txaWRdO1xuXG4gICAgICBpZiAocXVlcnkpIHtcbiAgICAgICAgdGhpcy5fcmVjb21wdXRlUmVzdWx0cyhxdWVyeSwgcWlkVG9PcmlnaW5hbFJlc3VsdHNbcWlkXSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB0aGlzLl9vYnNlcnZlUXVldWUuZHJhaW4oKTtcblxuICAgIC8vIElmIHdlIGFyZSBkb2luZyBhbiB1cHNlcnQsIGFuZCB3ZSBkaWRuJ3QgbW9kaWZ5IGFueSBkb2N1bWVudHMgeWV0LCB0aGVuXG4gICAgLy8gaXQncyB0aW1lIHRvIGRvIGFuIGluc2VydC4gRmlndXJlIG91dCB3aGF0IGRvY3VtZW50IHdlIGFyZSBpbnNlcnRpbmcsIGFuZFxuICAgIC8vIGdlbmVyYXRlIGFuIGlkIGZvciBpdC5cbiAgICBsZXQgaW5zZXJ0ZWRJZDtcbiAgICBpZiAodXBkYXRlQ291bnQgPT09IDAgJiYgb3B0aW9ucy51cHNlcnQpIHtcbiAgICAgIGNvbnN0IGRvYyA9IExvY2FsQ29sbGVjdGlvbi5fY3JlYXRlVXBzZXJ0RG9jdW1lbnQoc2VsZWN0b3IsIG1vZCk7XG4gICAgICBpZiAoISBkb2MuX2lkICYmIG9wdGlvbnMuaW5zZXJ0ZWRJZCkge1xuICAgICAgICBkb2MuX2lkID0gb3B0aW9ucy5pbnNlcnRlZElkO1xuICAgICAgfVxuXG4gICAgICBpbnNlcnRlZElkID0gdGhpcy5pbnNlcnQoZG9jKTtcbiAgICAgIHVwZGF0ZUNvdW50ID0gMTtcbiAgICB9XG5cbiAgICAvLyBSZXR1cm4gdGhlIG51bWJlciBvZiBhZmZlY3RlZCBkb2N1bWVudHMsIG9yIGluIHRoZSB1cHNlcnQgY2FzZSwgYW4gb2JqZWN0XG4gICAgLy8gY29udGFpbmluZyB0aGUgbnVtYmVyIG9mIGFmZmVjdGVkIGRvY3MgYW5kIHRoZSBpZCBvZiB0aGUgZG9jIHRoYXQgd2FzXG4gICAgLy8gaW5zZXJ0ZWQsIGlmIGFueS5cbiAgICBsZXQgcmVzdWx0O1xuICAgIGlmIChvcHRpb25zLl9yZXR1cm5PYmplY3QpIHtcbiAgICAgIHJlc3VsdCA9IHtudW1iZXJBZmZlY3RlZDogdXBkYXRlQ291bnR9O1xuXG4gICAgICBpZiAoaW5zZXJ0ZWRJZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJlc3VsdC5pbnNlcnRlZElkID0gaW5zZXJ0ZWRJZDtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcmVzdWx0ID0gdXBkYXRlQ291bnQ7XG4gICAgfVxuXG4gICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICBNZXRlb3IuZGVmZXIoKCkgPT4ge1xuICAgICAgICBjYWxsYmFjayhudWxsLCByZXN1bHQpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8vIEEgY29udmVuaWVuY2Ugd3JhcHBlciBvbiB1cGRhdGUuIExvY2FsQ29sbGVjdGlvbi51cHNlcnQoc2VsLCBtb2QpIGlzXG4gIC8vIGVxdWl2YWxlbnQgdG8gTG9jYWxDb2xsZWN0aW9uLnVwZGF0ZShzZWwsIG1vZCwge3Vwc2VydDogdHJ1ZSxcbiAgLy8gX3JldHVybk9iamVjdDogdHJ1ZX0pLlxuICB1cHNlcnQoc2VsZWN0b3IsIG1vZCwgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICBpZiAoIWNhbGxiYWNrICYmIHR5cGVvZiBvcHRpb25zID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICBvcHRpb25zID0ge307XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMudXBkYXRlKFxuICAgICAgc2VsZWN0b3IsXG4gICAgICBtb2QsXG4gICAgICBPYmplY3QuYXNzaWduKHt9LCBvcHRpb25zLCB7dXBzZXJ0OiB0cnVlLCBfcmV0dXJuT2JqZWN0OiB0cnVlfSksXG4gICAgICBjYWxsYmFja1xuICAgICk7XG4gIH1cblxuICAvLyBJdGVyYXRlcyBvdmVyIGEgc3Vic2V0IG9mIGRvY3VtZW50cyB0aGF0IGNvdWxkIG1hdGNoIHNlbGVjdG9yOyBjYWxsc1xuICAvLyBmbihkb2MsIGlkKSBvbiBlYWNoIG9mIHRoZW0uICBTcGVjaWZpY2FsbHksIGlmIHNlbGVjdG9yIHNwZWNpZmllc1xuICAvLyBzcGVjaWZpYyBfaWQncywgaXQgb25seSBsb29rcyBhdCB0aG9zZS4gIGRvYyBpcyAqbm90KiBjbG9uZWQ6IGl0IGlzIHRoZVxuICAvLyBzYW1lIG9iamVjdCB0aGF0IGlzIGluIF9kb2NzLlxuICBfZWFjaFBvc3NpYmx5TWF0Y2hpbmdEb2Moc2VsZWN0b3IsIGZuKSB7XG4gICAgY29uc3Qgc3BlY2lmaWNJZHMgPSBMb2NhbENvbGxlY3Rpb24uX2lkc01hdGNoZWRCeVNlbGVjdG9yKHNlbGVjdG9yKTtcblxuICAgIGlmIChzcGVjaWZpY0lkcykge1xuICAgICAgc3BlY2lmaWNJZHMuc29tZShpZCA9PiB7XG4gICAgICAgIGNvbnN0IGRvYyA9IHRoaXMuX2RvY3MuZ2V0KGlkKTtcblxuICAgICAgICBpZiAoZG9jKSB7XG4gICAgICAgICAgcmV0dXJuIGZuKGRvYywgaWQpID09PSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2RvY3MuZm9yRWFjaChmbik7XG4gICAgfVxuICB9XG5cbiAgX21vZGlmeUFuZE5vdGlmeShkb2MsIG1vZCwgcmVjb21wdXRlUWlkcywgYXJyYXlJbmRpY2VzKSB7XG4gICAgY29uc3QgbWF0Y2hlZF9iZWZvcmUgPSB7fTtcblxuICAgIE9iamVjdC5rZXlzKHRoaXMucXVlcmllcykuZm9yRWFjaChxaWQgPT4ge1xuICAgICAgY29uc3QgcXVlcnkgPSB0aGlzLnF1ZXJpZXNbcWlkXTtcblxuICAgICAgaWYgKHF1ZXJ5LmRpcnR5KSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKHF1ZXJ5Lm9yZGVyZWQpIHtcbiAgICAgICAgbWF0Y2hlZF9iZWZvcmVbcWlkXSA9IHF1ZXJ5Lm1hdGNoZXIuZG9jdW1lbnRNYXRjaGVzKGRvYykucmVzdWx0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gQmVjYXVzZSB3ZSBkb24ndCBzdXBwb3J0IHNraXAgb3IgbGltaXQgKHlldCkgaW4gdW5vcmRlcmVkIHF1ZXJpZXMsIHdlXG4gICAgICAgIC8vIGNhbiBqdXN0IGRvIGEgZGlyZWN0IGxvb2t1cC5cbiAgICAgICAgbWF0Y2hlZF9iZWZvcmVbcWlkXSA9IHF1ZXJ5LnJlc3VsdHMuaGFzKGRvYy5faWQpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgY29uc3Qgb2xkX2RvYyA9IEVKU09OLmNsb25lKGRvYyk7XG5cbiAgICBMb2NhbENvbGxlY3Rpb24uX21vZGlmeShkb2MsIG1vZCwge2FycmF5SW5kaWNlc30pO1xuXG4gICAgT2JqZWN0LmtleXModGhpcy5xdWVyaWVzKS5mb3JFYWNoKHFpZCA9PiB7XG4gICAgICBjb25zdCBxdWVyeSA9IHRoaXMucXVlcmllc1txaWRdO1xuXG4gICAgICBpZiAocXVlcnkuZGlydHkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBhZnRlck1hdGNoID0gcXVlcnkubWF0Y2hlci5kb2N1bWVudE1hdGNoZXMoZG9jKTtcbiAgICAgIGNvbnN0IGFmdGVyID0gYWZ0ZXJNYXRjaC5yZXN1bHQ7XG4gICAgICBjb25zdCBiZWZvcmUgPSBtYXRjaGVkX2JlZm9yZVtxaWRdO1xuXG4gICAgICBpZiAoYWZ0ZXIgJiYgcXVlcnkuZGlzdGFuY2VzICYmIGFmdGVyTWF0Y2guZGlzdGFuY2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBxdWVyeS5kaXN0YW5jZXMuc2V0KGRvYy5faWQsIGFmdGVyTWF0Y2guZGlzdGFuY2UpO1xuICAgICAgfVxuXG4gICAgICBpZiAocXVlcnkuY3Vyc29yLnNraXAgfHwgcXVlcnkuY3Vyc29yLmxpbWl0KSB7XG4gICAgICAgIC8vIFdlIG5lZWQgdG8gcmVjb21wdXRlIGFueSBxdWVyeSB3aGVyZSB0aGUgZG9jIG1heSBoYXZlIGJlZW4gaW4gdGhlXG4gICAgICAgIC8vIGN1cnNvcidzIHdpbmRvdyBlaXRoZXIgYmVmb3JlIG9yIGFmdGVyIHRoZSB1cGRhdGUuIChOb3RlIHRoYXQgaWYgc2tpcFxuICAgICAgICAvLyBvciBsaW1pdCBpcyBzZXQsIFwiYmVmb3JlXCIgYW5kIFwiYWZ0ZXJcIiBiZWluZyB0cnVlIGRvIG5vdCBuZWNlc3NhcmlseVxuICAgICAgICAvLyBtZWFuIHRoYXQgdGhlIGRvY3VtZW50IGlzIGluIHRoZSBjdXJzb3IncyBvdXRwdXQgYWZ0ZXIgc2tpcC9saW1pdCBpc1xuICAgICAgICAvLyBhcHBsaWVkLi4uIGJ1dCBpZiB0aGV5IGFyZSBmYWxzZSwgdGhlbiB0aGUgZG9jdW1lbnQgZGVmaW5pdGVseSBpcyBOT1RcbiAgICAgICAgLy8gaW4gdGhlIG91dHB1dC4gU28gaXQncyBzYWZlIHRvIHNraXAgcmVjb21wdXRlIGlmIG5laXRoZXIgYmVmb3JlIG9yXG4gICAgICAgIC8vIGFmdGVyIGFyZSB0cnVlLilcbiAgICAgICAgaWYgKGJlZm9yZSB8fCBhZnRlcikge1xuICAgICAgICAgIHJlY29tcHV0ZVFpZHNbcWlkXSA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoYmVmb3JlICYmICFhZnRlcikge1xuICAgICAgICBMb2NhbENvbGxlY3Rpb24uX3JlbW92ZUZyb21SZXN1bHRzKHF1ZXJ5LCBkb2MpO1xuICAgICAgfSBlbHNlIGlmICghYmVmb3JlICYmIGFmdGVyKSB7XG4gICAgICAgIExvY2FsQ29sbGVjdGlvbi5faW5zZXJ0SW5SZXN1bHRzKHF1ZXJ5LCBkb2MpO1xuICAgICAgfSBlbHNlIGlmIChiZWZvcmUgJiYgYWZ0ZXIpIHtcbiAgICAgICAgTG9jYWxDb2xsZWN0aW9uLl91cGRhdGVJblJlc3VsdHMocXVlcnksIGRvYywgb2xkX2RvYyk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvLyBSZWNvbXB1dGVzIHRoZSByZXN1bHRzIG9mIGEgcXVlcnkgYW5kIHJ1bnMgb2JzZXJ2ZSBjYWxsYmFja3MgZm9yIHRoZVxuICAvLyBkaWZmZXJlbmNlIGJldHdlZW4gdGhlIHByZXZpb3VzIHJlc3VsdHMgYW5kIHRoZSBjdXJyZW50IHJlc3VsdHMgKHVubGVzc1xuICAvLyBwYXVzZWQpLiBVc2VkIGZvciBza2lwL2xpbWl0IHF1ZXJpZXMuXG4gIC8vXG4gIC8vIFdoZW4gdGhpcyBpcyB1c2VkIGJ5IGluc2VydCBvciByZW1vdmUsIGl0IGNhbiBqdXN0IHVzZSBxdWVyeS5yZXN1bHRzIGZvclxuICAvLyB0aGUgb2xkIHJlc3VsdHMgKGFuZCB0aGVyZSdzIG5vIG5lZWQgdG8gcGFzcyBpbiBvbGRSZXN1bHRzKSwgYmVjYXVzZSB0aGVzZVxuICAvLyBvcGVyYXRpb25zIGRvbid0IG11dGF0ZSB0aGUgZG9jdW1lbnRzIGluIHRoZSBjb2xsZWN0aW9uLiBVcGRhdGUgbmVlZHMgdG9cbiAgLy8gcGFzcyBpbiBhbiBvbGRSZXN1bHRzIHdoaWNoIHdhcyBkZWVwLWNvcGllZCBiZWZvcmUgdGhlIG1vZGlmaWVyIHdhc1xuICAvLyBhcHBsaWVkLlxuICAvL1xuICAvLyBvbGRSZXN1bHRzIGlzIGd1YXJhbnRlZWQgdG8gYmUgaWdub3JlZCBpZiB0aGUgcXVlcnkgaXMgbm90IHBhdXNlZC5cbiAgX3JlY29tcHV0ZVJlc3VsdHMocXVlcnksIG9sZFJlc3VsdHMpIHtcbiAgICBpZiAodGhpcy5wYXVzZWQpIHtcbiAgICAgIC8vIFRoZXJlJ3Mgbm8gcmVhc29uIHRvIHJlY29tcHV0ZSB0aGUgcmVzdWx0cyBub3cgYXMgd2UncmUgc3RpbGwgcGF1c2VkLlxuICAgICAgLy8gQnkgZmxhZ2dpbmcgdGhlIHF1ZXJ5IGFzIFwiZGlydHlcIiwgdGhlIHJlY29tcHV0ZSB3aWxsIGJlIHBlcmZvcm1lZFxuICAgICAgLy8gd2hlbiByZXN1bWVPYnNlcnZlcnMgaXMgY2FsbGVkLlxuICAgICAgcXVlcnkuZGlydHkgPSB0cnVlO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5wYXVzZWQgJiYgIW9sZFJlc3VsdHMpIHtcbiAgICAgIG9sZFJlc3VsdHMgPSBxdWVyeS5yZXN1bHRzO1xuICAgIH1cblxuICAgIGlmIChxdWVyeS5kaXN0YW5jZXMpIHtcbiAgICAgIHF1ZXJ5LmRpc3RhbmNlcy5jbGVhcigpO1xuICAgIH1cblxuICAgIHF1ZXJ5LnJlc3VsdHMgPSBxdWVyeS5jdXJzb3IuX2dldFJhd09iamVjdHMoe1xuICAgICAgZGlzdGFuY2VzOiBxdWVyeS5kaXN0YW5jZXMsXG4gICAgICBvcmRlcmVkOiBxdWVyeS5vcmRlcmVkXG4gICAgfSk7XG5cbiAgICBpZiAoIXRoaXMucGF1c2VkKSB7XG4gICAgICBMb2NhbENvbGxlY3Rpb24uX2RpZmZRdWVyeUNoYW5nZXMoXG4gICAgICAgIHF1ZXJ5Lm9yZGVyZWQsXG4gICAgICAgIG9sZFJlc3VsdHMsXG4gICAgICAgIHF1ZXJ5LnJlc3VsdHMsXG4gICAgICAgIHF1ZXJ5LFxuICAgICAgICB7cHJvamVjdGlvbkZuOiBxdWVyeS5wcm9qZWN0aW9uRm59XG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIF9zYXZlT3JpZ2luYWwoaWQsIGRvYykge1xuICAgIC8vIEFyZSB3ZSBldmVuIHRyeWluZyB0byBzYXZlIG9yaWdpbmFscz9cbiAgICBpZiAoIXRoaXMuX3NhdmVkT3JpZ2luYWxzKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gSGF2ZSB3ZSBwcmV2aW91c2x5IG11dGF0ZWQgdGhlIG9yaWdpbmFsIChhbmQgc28gJ2RvYycgaXMgbm90IGFjdHVhbGx5XG4gICAgLy8gb3JpZ2luYWwpPyAgKE5vdGUgdGhlICdoYXMnIGNoZWNrIHJhdGhlciB0aGFuIHRydXRoOiB3ZSBzdG9yZSB1bmRlZmluZWRcbiAgICAvLyBoZXJlIGZvciBpbnNlcnRlZCBkb2NzISlcbiAgICBpZiAodGhpcy5fc2F2ZWRPcmlnaW5hbHMuaGFzKGlkKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuX3NhdmVkT3JpZ2luYWxzLnNldChpZCwgRUpTT04uY2xvbmUoZG9jKSk7XG4gIH1cbn1cblxuTG9jYWxDb2xsZWN0aW9uLkN1cnNvciA9IEN1cnNvcjtcblxuTG9jYWxDb2xsZWN0aW9uLk9ic2VydmVIYW5kbGUgPSBPYnNlcnZlSGFuZGxlO1xuXG4vLyBYWFggbWF5YmUgbW92ZSB0aGVzZSBpbnRvIGFub3RoZXIgT2JzZXJ2ZUhlbHBlcnMgcGFja2FnZSBvciBzb21ldGhpbmdcblxuLy8gX0NhY2hpbmdDaGFuZ2VPYnNlcnZlciBpcyBhbiBvYmplY3Qgd2hpY2ggcmVjZWl2ZXMgb2JzZXJ2ZUNoYW5nZXMgY2FsbGJhY2tzXG4vLyBhbmQga2VlcHMgYSBjYWNoZSBvZiB0aGUgY3VycmVudCBjdXJzb3Igc3RhdGUgdXAgdG8gZGF0ZSBpbiB0aGlzLmRvY3MuIFVzZXJzXG4vLyBvZiB0aGlzIGNsYXNzIHNob3VsZCByZWFkIHRoZSBkb2NzIGZpZWxkIGJ1dCBub3QgbW9kaWZ5IGl0LiBZb3Ugc2hvdWxkIHBhc3Ncbi8vIHRoZSBcImFwcGx5Q2hhbmdlXCIgZmllbGQgYXMgdGhlIGNhbGxiYWNrcyB0byB0aGUgdW5kZXJseWluZyBvYnNlcnZlQ2hhbmdlc1xuLy8gY2FsbC4gT3B0aW9uYWxseSwgeW91IGNhbiBzcGVjaWZ5IHlvdXIgb3duIG9ic2VydmVDaGFuZ2VzIGNhbGxiYWNrcyB3aGljaCBhcmVcbi8vIGludm9rZWQgaW1tZWRpYXRlbHkgYmVmb3JlIHRoZSBkb2NzIGZpZWxkIGlzIHVwZGF0ZWQ7IHRoaXMgb2JqZWN0IGlzIG1hZGVcbi8vIGF2YWlsYWJsZSBhcyBgdGhpc2AgdG8gdGhvc2UgY2FsbGJhY2tzLlxuTG9jYWxDb2xsZWN0aW9uLl9DYWNoaW5nQ2hhbmdlT2JzZXJ2ZXIgPSBjbGFzcyBfQ2FjaGluZ0NoYW5nZU9ic2VydmVyIHtcbiAgY29uc3RydWN0b3Iob3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3Qgb3JkZXJlZEZyb21DYWxsYmFja3MgPSAoXG4gICAgICBvcHRpb25zLmNhbGxiYWNrcyAmJlxuICAgICAgTG9jYWxDb2xsZWN0aW9uLl9vYnNlcnZlQ2hhbmdlc0NhbGxiYWNrc0FyZU9yZGVyZWQob3B0aW9ucy5jYWxsYmFja3MpXG4gICAgKTtcblxuICAgIGlmIChoYXNPd24uY2FsbChvcHRpb25zLCAnb3JkZXJlZCcpKSB7XG4gICAgICB0aGlzLm9yZGVyZWQgPSBvcHRpb25zLm9yZGVyZWQ7XG5cbiAgICAgIGlmIChvcHRpb25zLmNhbGxiYWNrcyAmJiBvcHRpb25zLm9yZGVyZWQgIT09IG9yZGVyZWRGcm9tQ2FsbGJhY2tzKSB7XG4gICAgICAgIHRocm93IEVycm9yKCdvcmRlcmVkIG9wdGlvbiBkb2VzblxcJ3QgbWF0Y2ggY2FsbGJhY2tzJyk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChvcHRpb25zLmNhbGxiYWNrcykge1xuICAgICAgdGhpcy5vcmRlcmVkID0gb3JkZXJlZEZyb21DYWxsYmFja3M7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IEVycm9yKCdtdXN0IHByb3ZpZGUgb3JkZXJlZCBvciBjYWxsYmFja3MnKTtcbiAgICB9XG5cbiAgICBjb25zdCBjYWxsYmFja3MgPSBvcHRpb25zLmNhbGxiYWNrcyB8fCB7fTtcblxuICAgIGlmICh0aGlzLm9yZGVyZWQpIHtcbiAgICAgIHRoaXMuZG9jcyA9IG5ldyBPcmRlcmVkRGljdChNb25nb0lELmlkU3RyaW5naWZ5KTtcbiAgICAgIHRoaXMuYXBwbHlDaGFuZ2UgPSB7XG4gICAgICAgIGFkZGVkQmVmb3JlOiAoaWQsIGZpZWxkcywgYmVmb3JlKSA9PiB7XG4gICAgICAgICAgLy8gVGFrZSBhIHNoYWxsb3cgY29weSBzaW5jZSB0aGUgdG9wLWxldmVsIHByb3BlcnRpZXMgY2FuIGJlIGNoYW5nZWRcbiAgICAgICAgICBjb25zdCBkb2MgPSB7IC4uLmZpZWxkcyB9O1xuXG4gICAgICAgICAgZG9jLl9pZCA9IGlkO1xuXG4gICAgICAgICAgaWYgKGNhbGxiYWNrcy5hZGRlZEJlZm9yZSkge1xuICAgICAgICAgICAgY2FsbGJhY2tzLmFkZGVkQmVmb3JlLmNhbGwodGhpcywgaWQsIEVKU09OLmNsb25lKGZpZWxkcyksIGJlZm9yZSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gVGhpcyBsaW5lIHRyaWdnZXJzIGlmIHdlIHByb3ZpZGUgYWRkZWQgd2l0aCBtb3ZlZEJlZm9yZS5cbiAgICAgICAgICBpZiAoY2FsbGJhY2tzLmFkZGVkKSB7XG4gICAgICAgICAgICBjYWxsYmFja3MuYWRkZWQuY2FsbCh0aGlzLCBpZCwgRUpTT04uY2xvbmUoZmllbGRzKSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gWFhYIGNvdWxkIGBiZWZvcmVgIGJlIGEgZmFsc3kgSUQ/ICBUZWNobmljYWxseVxuICAgICAgICAgIC8vIGlkU3RyaW5naWZ5IHNlZW1zIHRvIGFsbG93IGZvciB0aGVtIC0tIHRob3VnaFxuICAgICAgICAgIC8vIE9yZGVyZWREaWN0IHdvbid0IGNhbGwgc3RyaW5naWZ5IG9uIGEgZmFsc3kgYXJnLlxuICAgICAgICAgIHRoaXMuZG9jcy5wdXRCZWZvcmUoaWQsIGRvYywgYmVmb3JlIHx8IG51bGwpO1xuICAgICAgICB9LFxuICAgICAgICBtb3ZlZEJlZm9yZTogKGlkLCBiZWZvcmUpID0+IHtcbiAgICAgICAgICBjb25zdCBkb2MgPSB0aGlzLmRvY3MuZ2V0KGlkKTtcblxuICAgICAgICAgIGlmIChjYWxsYmFja3MubW92ZWRCZWZvcmUpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrcy5tb3ZlZEJlZm9yZS5jYWxsKHRoaXMsIGlkLCBiZWZvcmUpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHRoaXMuZG9jcy5tb3ZlQmVmb3JlKGlkLCBiZWZvcmUgfHwgbnVsbCk7XG4gICAgICAgIH0sXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmRvY3MgPSBuZXcgTG9jYWxDb2xsZWN0aW9uLl9JZE1hcDtcbiAgICAgIHRoaXMuYXBwbHlDaGFuZ2UgPSB7XG4gICAgICAgIGFkZGVkOiAoaWQsIGZpZWxkcykgPT4ge1xuICAgICAgICAgIC8vIFRha2UgYSBzaGFsbG93IGNvcHkgc2luY2UgdGhlIHRvcC1sZXZlbCBwcm9wZXJ0aWVzIGNhbiBiZSBjaGFuZ2VkXG4gICAgICAgICAgY29uc3QgZG9jID0geyAuLi5maWVsZHMgfTtcblxuICAgICAgICAgIGlmIChjYWxsYmFja3MuYWRkZWQpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrcy5hZGRlZC5jYWxsKHRoaXMsIGlkLCBFSlNPTi5jbG9uZShmaWVsZHMpKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBkb2MuX2lkID0gaWQ7XG5cbiAgICAgICAgICB0aGlzLmRvY3Muc2V0KGlkLCAgZG9jKTtcbiAgICAgICAgfSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gVGhlIG1ldGhvZHMgaW4gX0lkTWFwIGFuZCBPcmRlcmVkRGljdCB1c2VkIGJ5IHRoZXNlIGNhbGxiYWNrcyBhcmVcbiAgICAvLyBpZGVudGljYWwuXG4gICAgdGhpcy5hcHBseUNoYW5nZS5jaGFuZ2VkID0gKGlkLCBmaWVsZHMpID0+IHtcbiAgICAgIGNvbnN0IGRvYyA9IHRoaXMuZG9jcy5nZXQoaWQpO1xuXG4gICAgICBpZiAoIWRvYykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gaWQgZm9yIGNoYW5nZWQ6ICR7aWR9YCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChjYWxsYmFja3MuY2hhbmdlZCkge1xuICAgICAgICBjYWxsYmFja3MuY2hhbmdlZC5jYWxsKHRoaXMsIGlkLCBFSlNPTi5jbG9uZShmaWVsZHMpKTtcbiAgICAgIH1cblxuICAgICAgRGlmZlNlcXVlbmNlLmFwcGx5Q2hhbmdlcyhkb2MsIGZpZWxkcyk7XG4gICAgfTtcblxuICAgIHRoaXMuYXBwbHlDaGFuZ2UucmVtb3ZlZCA9IGlkID0+IHtcbiAgICAgIGlmIChjYWxsYmFja3MucmVtb3ZlZCkge1xuICAgICAgICBjYWxsYmFja3MucmVtb3ZlZC5jYWxsKHRoaXMsIGlkKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5kb2NzLnJlbW92ZShpZCk7XG4gICAgfTtcbiAgfVxufTtcblxuTG9jYWxDb2xsZWN0aW9uLl9JZE1hcCA9IGNsYXNzIF9JZE1hcCBleHRlbmRzIElkTWFwIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoTW9uZ29JRC5pZFN0cmluZ2lmeSwgTW9uZ29JRC5pZFBhcnNlKTtcbiAgfVxufTtcblxuLy8gV3JhcCBhIHRyYW5zZm9ybSBmdW5jdGlvbiB0byByZXR1cm4gb2JqZWN0cyB0aGF0IGhhdmUgdGhlIF9pZCBmaWVsZFxuLy8gb2YgdGhlIHVudHJhbnNmb3JtZWQgZG9jdW1lbnQuIFRoaXMgZW5zdXJlcyB0aGF0IHN1YnN5c3RlbXMgc3VjaCBhc1xuLy8gdGhlIG9ic2VydmUtc2VxdWVuY2UgcGFja2FnZSB0aGF0IGNhbGwgYG9ic2VydmVgIGNhbiBrZWVwIHRyYWNrIG9mXG4vLyB0aGUgZG9jdW1lbnRzIGlkZW50aXRpZXMuXG4vL1xuLy8gLSBSZXF1aXJlIHRoYXQgaXQgcmV0dXJucyBvYmplY3RzXG4vLyAtIElmIHRoZSByZXR1cm4gdmFsdWUgaGFzIGFuIF9pZCBmaWVsZCwgdmVyaWZ5IHRoYXQgaXQgbWF0Y2hlcyB0aGVcbi8vICAgb3JpZ2luYWwgX2lkIGZpZWxkXG4vLyAtIElmIHRoZSByZXR1cm4gdmFsdWUgZG9lc24ndCBoYXZlIGFuIF9pZCBmaWVsZCwgYWRkIGl0IGJhY2suXG5Mb2NhbENvbGxlY3Rpb24ud3JhcFRyYW5zZm9ybSA9IHRyYW5zZm9ybSA9PiB7XG4gIGlmICghdHJhbnNmb3JtKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvLyBObyBuZWVkIHRvIGRvdWJseS13cmFwIHRyYW5zZm9ybXMuXG4gIGlmICh0cmFuc2Zvcm0uX193cmFwcGVkVHJhbnNmb3JtX18pIHtcbiAgICByZXR1cm4gdHJhbnNmb3JtO1xuICB9XG5cbiAgY29uc3Qgd3JhcHBlZCA9IGRvYyA9PiB7XG4gICAgaWYgKCFoYXNPd24uY2FsbChkb2MsICdfaWQnKSkge1xuICAgICAgLy8gWFhYIGRvIHdlIGV2ZXIgaGF2ZSBhIHRyYW5zZm9ybSBvbiB0aGUgb3Bsb2cncyBjb2xsZWN0aW9uPyBiZWNhdXNlIHRoYXRcbiAgICAgIC8vIGNvbGxlY3Rpb24gaGFzIG5vIF9pZC5cbiAgICAgIHRocm93IG5ldyBFcnJvcignY2FuIG9ubHkgdHJhbnNmb3JtIGRvY3VtZW50cyB3aXRoIF9pZCcpO1xuICAgIH1cblxuICAgIGNvbnN0IGlkID0gZG9jLl9pZDtcblxuICAgIC8vIFhYWCBjb25zaWRlciBtYWtpbmcgdHJhY2tlciBhIHdlYWsgZGVwZW5kZW5jeSBhbmQgY2hlY2tpbmdcbiAgICAvLyBQYWNrYWdlLnRyYWNrZXIgaGVyZVxuICAgIGNvbnN0IHRyYW5zZm9ybWVkID0gVHJhY2tlci5ub25yZWFjdGl2ZSgoKSA9PiB0cmFuc2Zvcm0oZG9jKSk7XG5cbiAgICBpZiAoIUxvY2FsQ29sbGVjdGlvbi5faXNQbGFpbk9iamVjdCh0cmFuc2Zvcm1lZCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcigndHJhbnNmb3JtIG11c3QgcmV0dXJuIG9iamVjdCcpO1xuICAgIH1cblxuICAgIGlmIChoYXNPd24uY2FsbCh0cmFuc2Zvcm1lZCwgJ19pZCcpKSB7XG4gICAgICBpZiAoIUVKU09OLmVxdWFscyh0cmFuc2Zvcm1lZC5faWQsIGlkKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3RyYW5zZm9ybWVkIGRvY3VtZW50IGNhblxcJ3QgaGF2ZSBkaWZmZXJlbnQgX2lkJyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRyYW5zZm9ybWVkLl9pZCA9IGlkO1xuICAgIH1cblxuICAgIHJldHVybiB0cmFuc2Zvcm1lZDtcbiAgfTtcblxuICB3cmFwcGVkLl9fd3JhcHBlZFRyYW5zZm9ybV9fID0gdHJ1ZTtcblxuICByZXR1cm4gd3JhcHBlZDtcbn07XG5cbi8vIFhYWCB0aGUgc29ydGVkLXF1ZXJ5IGxvZ2ljIGJlbG93IGlzIGxhdWdoYWJseSBpbmVmZmljaWVudC4gd2UnbGxcbi8vIG5lZWQgdG8gY29tZSB1cCB3aXRoIGEgYmV0dGVyIGRhdGFzdHJ1Y3R1cmUgZm9yIHRoaXMuXG4vL1xuLy8gWFhYIHRoZSBsb2dpYyBmb3Igb2JzZXJ2aW5nIHdpdGggYSBza2lwIG9yIGEgbGltaXQgaXMgZXZlbiBtb3JlXG4vLyBsYXVnaGFibHkgaW5lZmZpY2llbnQuIHdlIHJlY29tcHV0ZSB0aGUgd2hvbGUgcmVzdWx0cyBldmVyeSB0aW1lIVxuXG4vLyBUaGlzIGJpbmFyeSBzZWFyY2ggcHV0cyBhIHZhbHVlIGJldHdlZW4gYW55IGVxdWFsIHZhbHVlcywgYW5kIHRoZSBmaXJzdFxuLy8gbGVzc2VyIHZhbHVlLlxuTG9jYWxDb2xsZWN0aW9uLl9iaW5hcnlTZWFyY2ggPSAoY21wLCBhcnJheSwgdmFsdWUpID0+IHtcbiAgbGV0IGZpcnN0ID0gMDtcbiAgbGV0IHJhbmdlID0gYXJyYXkubGVuZ3RoO1xuXG4gIHdoaWxlIChyYW5nZSA+IDApIHtcbiAgICBjb25zdCBoYWxmUmFuZ2UgPSBNYXRoLmZsb29yKHJhbmdlIC8gMik7XG5cbiAgICBpZiAoY21wKHZhbHVlLCBhcnJheVtmaXJzdCArIGhhbGZSYW5nZV0pID49IDApIHtcbiAgICAgIGZpcnN0ICs9IGhhbGZSYW5nZSArIDE7XG4gICAgICByYW5nZSAtPSBoYWxmUmFuZ2UgKyAxO1xuICAgIH0gZWxzZSB7XG4gICAgICByYW5nZSA9IGhhbGZSYW5nZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZmlyc3Q7XG59O1xuXG5Mb2NhbENvbGxlY3Rpb24uX2NoZWNrU3VwcG9ydGVkUHJvamVjdGlvbiA9IGZpZWxkcyA9PiB7XG4gIGlmIChmaWVsZHMgIT09IE9iamVjdChmaWVsZHMpIHx8IEFycmF5LmlzQXJyYXkoZmllbGRzKSkge1xuICAgIHRocm93IE1pbmltb25nb0Vycm9yKCdmaWVsZHMgb3B0aW9uIG11c3QgYmUgYW4gb2JqZWN0Jyk7XG4gIH1cblxuICBPYmplY3Qua2V5cyhmaWVsZHMpLmZvckVhY2goa2V5UGF0aCA9PiB7XG4gICAgaWYgKGtleVBhdGguc3BsaXQoJy4nKS5pbmNsdWRlcygnJCcpKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgJ01pbmltb25nbyBkb2VzblxcJ3Qgc3VwcG9ydCAkIG9wZXJhdG9yIGluIHByb2plY3Rpb25zIHlldC4nXG4gICAgICApO1xuICAgIH1cblxuICAgIGNvbnN0IHZhbHVlID0gZmllbGRzW2tleVBhdGhdO1xuXG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiZcbiAgICAgICAgWyckZWxlbU1hdGNoJywgJyRtZXRhJywgJyRzbGljZSddLnNvbWUoa2V5ID0+XG4gICAgICAgICAgaGFzT3duLmNhbGwodmFsdWUsIGtleSlcbiAgICAgICAgKSkge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgICdNaW5pbW9uZ28gZG9lc25cXCd0IHN1cHBvcnQgb3BlcmF0b3JzIGluIHByb2plY3Rpb25zIHlldC4nXG4gICAgICApO1xuICAgIH1cblxuICAgIGlmICghWzEsIDAsIHRydWUsIGZhbHNlXS5pbmNsdWRlcyh2YWx1ZSkpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKFxuICAgICAgICAnUHJvamVjdGlvbiB2YWx1ZXMgc2hvdWxkIGJlIG9uZSBvZiAxLCAwLCB0cnVlLCBvciBmYWxzZSdcbiAgICAgICk7XG4gICAgfVxuICB9KTtcbn07XG5cbi8vIEtub3dzIGhvdyB0byBjb21waWxlIGEgZmllbGRzIHByb2plY3Rpb24gdG8gYSBwcmVkaWNhdGUgZnVuY3Rpb24uXG4vLyBAcmV0dXJucyAtIEZ1bmN0aW9uOiBhIGNsb3N1cmUgdGhhdCBmaWx0ZXJzIG91dCBhbiBvYmplY3QgYWNjb3JkaW5nIHRvIHRoZVxuLy8gICAgICAgICAgICBmaWVsZHMgcHJvamVjdGlvbiBydWxlczpcbi8vICAgICAgICAgICAgQHBhcmFtIG9iaiAtIE9iamVjdDogTW9uZ29EQi1zdHlsZWQgZG9jdW1lbnRcbi8vICAgICAgICAgICAgQHJldHVybnMgLSBPYmplY3Q6IGEgZG9jdW1lbnQgd2l0aCB0aGUgZmllbGRzIGZpbHRlcmVkIG91dFxuLy8gICAgICAgICAgICAgICAgICAgICAgIGFjY29yZGluZyB0byBwcm9qZWN0aW9uIHJ1bGVzLiBEb2Vzbid0IHJldGFpbiBzdWJmaWVsZHNcbi8vICAgICAgICAgICAgICAgICAgICAgICBvZiBwYXNzZWQgYXJndW1lbnQuXG5Mb2NhbENvbGxlY3Rpb24uX2NvbXBpbGVQcm9qZWN0aW9uID0gZmllbGRzID0+IHtcbiAgTG9jYWxDb2xsZWN0aW9uLl9jaGVja1N1cHBvcnRlZFByb2plY3Rpb24oZmllbGRzKTtcblxuICBjb25zdCBfaWRQcm9qZWN0aW9uID0gZmllbGRzLl9pZCA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IGZpZWxkcy5faWQ7XG4gIGNvbnN0IGRldGFpbHMgPSBwcm9qZWN0aW9uRGV0YWlscyhmaWVsZHMpO1xuXG4gIC8vIHJldHVybnMgdHJhbnNmb3JtZWQgZG9jIGFjY29yZGluZyB0byBydWxlVHJlZVxuICBjb25zdCB0cmFuc2Zvcm0gPSAoZG9jLCBydWxlVHJlZSkgPT4ge1xuICAgIC8vIFNwZWNpYWwgY2FzZSBmb3IgXCJzZXRzXCJcbiAgICBpZiAoQXJyYXkuaXNBcnJheShkb2MpKSB7XG4gICAgICByZXR1cm4gZG9jLm1hcChzdWJkb2MgPT4gdHJhbnNmb3JtKHN1YmRvYywgcnVsZVRyZWUpKTtcbiAgICB9XG5cbiAgICBjb25zdCByZXN1bHQgPSBkZXRhaWxzLmluY2x1ZGluZyA/IHt9IDogRUpTT04uY2xvbmUoZG9jKTtcblxuICAgIE9iamVjdC5rZXlzKHJ1bGVUcmVlKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICBpZiAoZG9jID09IG51bGwgfHwgIWhhc093bi5jYWxsKGRvYywga2V5KSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHJ1bGUgPSBydWxlVHJlZVtrZXldO1xuXG4gICAgICBpZiAocnVsZSA9PT0gT2JqZWN0KHJ1bGUpKSB7XG4gICAgICAgIC8vIEZvciBzdWItb2JqZWN0cy9zdWJzZXRzIHdlIGJyYW5jaFxuICAgICAgICBpZiAoZG9jW2tleV0gPT09IE9iamVjdChkb2Nba2V5XSkpIHtcbiAgICAgICAgICByZXN1bHRba2V5XSA9IHRyYW5zZm9ybShkb2Nba2V5XSwgcnVsZSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoZGV0YWlscy5pbmNsdWRpbmcpIHtcbiAgICAgICAgLy8gT3RoZXJ3aXNlIHdlIGRvbid0IGV2ZW4gdG91Y2ggdGhpcyBzdWJmaWVsZFxuICAgICAgICByZXN1bHRba2V5XSA9IEVKU09OLmNsb25lKGRvY1trZXldKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRlbGV0ZSByZXN1bHRba2V5XTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBkb2MgIT0gbnVsbCA/IHJlc3VsdCA6IGRvYztcbiAgfTtcblxuICByZXR1cm4gZG9jID0+IHtcbiAgICBjb25zdCByZXN1bHQgPSB0cmFuc2Zvcm0oZG9jLCBkZXRhaWxzLnRyZWUpO1xuXG4gICAgaWYgKF9pZFByb2plY3Rpb24gJiYgaGFzT3duLmNhbGwoZG9jLCAnX2lkJykpIHtcbiAgICAgIHJlc3VsdC5faWQgPSBkb2MuX2lkO1xuICAgIH1cblxuICAgIGlmICghX2lkUHJvamVjdGlvbiAmJiBoYXNPd24uY2FsbChyZXN1bHQsICdfaWQnKSkge1xuICAgICAgZGVsZXRlIHJlc3VsdC5faWQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcbn07XG5cbi8vIENhbGN1bGF0ZXMgdGhlIGRvY3VtZW50IHRvIGluc2VydCBpbiBjYXNlIHdlJ3JlIGRvaW5nIGFuIHVwc2VydCBhbmQgdGhlXG4vLyBzZWxlY3RvciBkb2VzIG5vdCBtYXRjaCBhbnkgZWxlbWVudHNcbkxvY2FsQ29sbGVjdGlvbi5fY3JlYXRlVXBzZXJ0RG9jdW1lbnQgPSAoc2VsZWN0b3IsIG1vZGlmaWVyKSA9PiB7XG4gIGNvbnN0IHNlbGVjdG9yRG9jdW1lbnQgPSBwb3B1bGF0ZURvY3VtZW50V2l0aFF1ZXJ5RmllbGRzKHNlbGVjdG9yKTtcbiAgY29uc3QgaXNNb2RpZnkgPSBMb2NhbENvbGxlY3Rpb24uX2lzTW9kaWZpY2F0aW9uTW9kKG1vZGlmaWVyKTtcblxuICBjb25zdCBuZXdEb2MgPSB7fTtcblxuICBpZiAoc2VsZWN0b3JEb2N1bWVudC5faWQpIHtcbiAgICBuZXdEb2MuX2lkID0gc2VsZWN0b3JEb2N1bWVudC5faWQ7XG4gICAgZGVsZXRlIHNlbGVjdG9yRG9jdW1lbnQuX2lkO1xuICB9XG5cbiAgLy8gVGhpcyBkb3VibGUgX21vZGlmeSBjYWxsIGlzIG1hZGUgdG8gaGVscCB3aXRoIG5lc3RlZCBwcm9wZXJ0aWVzIChzZWUgaXNzdWVcbiAgLy8gIzg2MzEpLiBXZSBkbyB0aGlzIGV2ZW4gaWYgaXQncyBhIHJlcGxhY2VtZW50IGZvciB2YWxpZGF0aW9uIHB1cnBvc2VzIChlLmcuXG4gIC8vIGFtYmlndW91cyBpZCdzKVxuICBMb2NhbENvbGxlY3Rpb24uX21vZGlmeShuZXdEb2MsIHskc2V0OiBzZWxlY3RvckRvY3VtZW50fSk7XG4gIExvY2FsQ29sbGVjdGlvbi5fbW9kaWZ5KG5ld0RvYywgbW9kaWZpZXIsIHtpc0luc2VydDogdHJ1ZX0pO1xuXG4gIGlmIChpc01vZGlmeSkge1xuICAgIHJldHVybiBuZXdEb2M7XG4gIH1cblxuICAvLyBSZXBsYWNlbWVudCBjYW4gdGFrZSBfaWQgZnJvbSBxdWVyeSBkb2N1bWVudFxuICBjb25zdCByZXBsYWNlbWVudCA9IE9iamVjdC5hc3NpZ24oe30sIG1vZGlmaWVyKTtcbiAgaWYgKG5ld0RvYy5faWQpIHtcbiAgICByZXBsYWNlbWVudC5faWQgPSBuZXdEb2MuX2lkO1xuICB9XG5cbiAgcmV0dXJuIHJlcGxhY2VtZW50O1xufTtcblxuTG9jYWxDb2xsZWN0aW9uLl9kaWZmT2JqZWN0cyA9IChsZWZ0LCByaWdodCwgY2FsbGJhY2tzKSA9PiB7XG4gIHJldHVybiBEaWZmU2VxdWVuY2UuZGlmZk9iamVjdHMobGVmdCwgcmlnaHQsIGNhbGxiYWNrcyk7XG59O1xuXG4vLyBvcmRlcmVkOiBib29sLlxuLy8gb2xkX3Jlc3VsdHMgYW5kIG5ld19yZXN1bHRzOiBjb2xsZWN0aW9ucyBvZiBkb2N1bWVudHMuXG4vLyAgICBpZiBvcmRlcmVkLCB0aGV5IGFyZSBhcnJheXMuXG4vLyAgICBpZiB1bm9yZGVyZWQsIHRoZXkgYXJlIElkTWFwc1xuTG9jYWxDb2xsZWN0aW9uLl9kaWZmUXVlcnlDaGFuZ2VzID0gKG9yZGVyZWQsIG9sZFJlc3VsdHMsIG5ld1Jlc3VsdHMsIG9ic2VydmVyLCBvcHRpb25zKSA9PlxuICBEaWZmU2VxdWVuY2UuZGlmZlF1ZXJ5Q2hhbmdlcyhvcmRlcmVkLCBvbGRSZXN1bHRzLCBuZXdSZXN1bHRzLCBvYnNlcnZlciwgb3B0aW9ucylcbjtcblxuTG9jYWxDb2xsZWN0aW9uLl9kaWZmUXVlcnlPcmRlcmVkQ2hhbmdlcyA9IChvbGRSZXN1bHRzLCBuZXdSZXN1bHRzLCBvYnNlcnZlciwgb3B0aW9ucykgPT5cbiAgRGlmZlNlcXVlbmNlLmRpZmZRdWVyeU9yZGVyZWRDaGFuZ2VzKG9sZFJlc3VsdHMsIG5ld1Jlc3VsdHMsIG9ic2VydmVyLCBvcHRpb25zKVxuO1xuXG5Mb2NhbENvbGxlY3Rpb24uX2RpZmZRdWVyeVVub3JkZXJlZENoYW5nZXMgPSAob2xkUmVzdWx0cywgbmV3UmVzdWx0cywgb2JzZXJ2ZXIsIG9wdGlvbnMpID0+XG4gIERpZmZTZXF1ZW5jZS5kaWZmUXVlcnlVbm9yZGVyZWRDaGFuZ2VzKG9sZFJlc3VsdHMsIG5ld1Jlc3VsdHMsIG9ic2VydmVyLCBvcHRpb25zKVxuO1xuXG5Mb2NhbENvbGxlY3Rpb24uX2ZpbmRJbk9yZGVyZWRSZXN1bHRzID0gKHF1ZXJ5LCBkb2MpID0+IHtcbiAgaWYgKCFxdWVyeS5vcmRlcmVkKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdDYW5cXCd0IGNhbGwgX2ZpbmRJbk9yZGVyZWRSZXN1bHRzIG9uIHVub3JkZXJlZCBxdWVyeScpO1xuICB9XG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBxdWVyeS5yZXN1bHRzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKHF1ZXJ5LnJlc3VsdHNbaV0gPT09IGRvYykge1xuICAgICAgcmV0dXJuIGk7XG4gICAgfVxuICB9XG5cbiAgdGhyb3cgRXJyb3IoJ29iamVjdCBtaXNzaW5nIGZyb20gcXVlcnknKTtcbn07XG5cbi8vIElmIHRoaXMgaXMgYSBzZWxlY3RvciB3aGljaCBleHBsaWNpdGx5IGNvbnN0cmFpbnMgdGhlIG1hdGNoIGJ5IElEIHRvIGEgZmluaXRlXG4vLyBudW1iZXIgb2YgZG9jdW1lbnRzLCByZXR1cm5zIGEgbGlzdCBvZiB0aGVpciBJRHMuICBPdGhlcndpc2UgcmV0dXJuc1xuLy8gbnVsbC4gTm90ZSB0aGF0IHRoZSBzZWxlY3RvciBtYXkgaGF2ZSBvdGhlciByZXN0cmljdGlvbnMgc28gaXQgbWF5IG5vdCBldmVuXG4vLyBtYXRjaCB0aG9zZSBkb2N1bWVudCEgIFdlIGNhcmUgYWJvdXQgJGluIGFuZCAkYW5kIHNpbmNlIHRob3NlIGFyZSBnZW5lcmF0ZWRcbi8vIGFjY2Vzcy1jb250cm9sbGVkIHVwZGF0ZSBhbmQgcmVtb3ZlLlxuTG9jYWxDb2xsZWN0aW9uLl9pZHNNYXRjaGVkQnlTZWxlY3RvciA9IHNlbGVjdG9yID0+IHtcbiAgLy8gSXMgdGhlIHNlbGVjdG9yIGp1c3QgYW4gSUQ/XG4gIGlmIChMb2NhbENvbGxlY3Rpb24uX3NlbGVjdG9ySXNJZChzZWxlY3RvcikpIHtcbiAgICByZXR1cm4gW3NlbGVjdG9yXTtcbiAgfVxuXG4gIGlmICghc2VsZWN0b3IpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIERvIHdlIGhhdmUgYW4gX2lkIGNsYXVzZT9cbiAgaWYgKGhhc093bi5jYWxsKHNlbGVjdG9yLCAnX2lkJykpIHtcbiAgICAvLyBJcyB0aGUgX2lkIGNsYXVzZSBqdXN0IGFuIElEP1xuICAgIGlmIChMb2NhbENvbGxlY3Rpb24uX3NlbGVjdG9ySXNJZChzZWxlY3Rvci5faWQpKSB7XG4gICAgICByZXR1cm4gW3NlbGVjdG9yLl9pZF07XG4gICAgfVxuXG4gICAgLy8gSXMgdGhlIF9pZCBjbGF1c2Uge19pZDogeyRpbjogW1wieFwiLCBcInlcIiwgXCJ6XCJdfX0/XG4gICAgaWYgKHNlbGVjdG9yLl9pZFxuICAgICAgICAmJiBBcnJheS5pc0FycmF5KHNlbGVjdG9yLl9pZC4kaW4pXG4gICAgICAgICYmIHNlbGVjdG9yLl9pZC4kaW4ubGVuZ3RoXG4gICAgICAgICYmIHNlbGVjdG9yLl9pZC4kaW4uZXZlcnkoTG9jYWxDb2xsZWN0aW9uLl9zZWxlY3RvcklzSWQpKSB7XG4gICAgICByZXR1cm4gc2VsZWN0b3IuX2lkLiRpbjtcbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIElmIHRoaXMgaXMgYSB0b3AtbGV2ZWwgJGFuZCwgYW5kIGFueSBvZiB0aGUgY2xhdXNlcyBjb25zdHJhaW4gdGhlaXJcbiAgLy8gZG9jdW1lbnRzLCB0aGVuIHRoZSB3aG9sZSBzZWxlY3RvciBpcyBjb25zdHJhaW5lZCBieSBhbnkgb25lIGNsYXVzZSdzXG4gIC8vIGNvbnN0cmFpbnQuIChXZWxsLCBieSB0aGVpciBpbnRlcnNlY3Rpb24sIGJ1dCB0aGF0IHNlZW1zIHVubGlrZWx5LilcbiAgaWYgKEFycmF5LmlzQXJyYXkoc2VsZWN0b3IuJGFuZCkpIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNlbGVjdG9yLiRhbmQubGVuZ3RoOyArK2kpIHtcbiAgICAgIGNvbnN0IHN1YklkcyA9IExvY2FsQ29sbGVjdGlvbi5faWRzTWF0Y2hlZEJ5U2VsZWN0b3Ioc2VsZWN0b3IuJGFuZFtpXSk7XG5cbiAgICAgIGlmIChzdWJJZHMpIHtcbiAgICAgICAgcmV0dXJuIHN1YklkcztcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn07XG5cbkxvY2FsQ29sbGVjdGlvbi5faW5zZXJ0SW5SZXN1bHRzID0gKHF1ZXJ5LCBkb2MpID0+IHtcbiAgY29uc3QgZmllbGRzID0gRUpTT04uY2xvbmUoZG9jKTtcblxuICBkZWxldGUgZmllbGRzLl9pZDtcblxuICBpZiAocXVlcnkub3JkZXJlZCkge1xuICAgIGlmICghcXVlcnkuc29ydGVyKSB7XG4gICAgICBxdWVyeS5hZGRlZEJlZm9yZShkb2MuX2lkLCBxdWVyeS5wcm9qZWN0aW9uRm4oZmllbGRzKSwgbnVsbCk7XG4gICAgICBxdWVyeS5yZXN1bHRzLnB1c2goZG9jKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgaSA9IExvY2FsQ29sbGVjdGlvbi5faW5zZXJ0SW5Tb3J0ZWRMaXN0KFxuICAgICAgICBxdWVyeS5zb3J0ZXIuZ2V0Q29tcGFyYXRvcih7ZGlzdGFuY2VzOiBxdWVyeS5kaXN0YW5jZXN9KSxcbiAgICAgICAgcXVlcnkucmVzdWx0cyxcbiAgICAgICAgZG9jXG4gICAgICApO1xuXG4gICAgICBsZXQgbmV4dCA9IHF1ZXJ5LnJlc3VsdHNbaSArIDFdO1xuICAgICAgaWYgKG5leHQpIHtcbiAgICAgICAgbmV4dCA9IG5leHQuX2lkO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbmV4dCA9IG51bGw7XG4gICAgICB9XG5cbiAgICAgIHF1ZXJ5LmFkZGVkQmVmb3JlKGRvYy5faWQsIHF1ZXJ5LnByb2plY3Rpb25GbihmaWVsZHMpLCBuZXh0KTtcbiAgICB9XG5cbiAgICBxdWVyeS5hZGRlZChkb2MuX2lkLCBxdWVyeS5wcm9qZWN0aW9uRm4oZmllbGRzKSk7XG4gIH0gZWxzZSB7XG4gICAgcXVlcnkuYWRkZWQoZG9jLl9pZCwgcXVlcnkucHJvamVjdGlvbkZuKGZpZWxkcykpO1xuICAgIHF1ZXJ5LnJlc3VsdHMuc2V0KGRvYy5faWQsIGRvYyk7XG4gIH1cbn07XG5cbkxvY2FsQ29sbGVjdGlvbi5faW5zZXJ0SW5Tb3J0ZWRMaXN0ID0gKGNtcCwgYXJyYXksIHZhbHVlKSA9PiB7XG4gIGlmIChhcnJheS5sZW5ndGggPT09IDApIHtcbiAgICBhcnJheS5wdXNoKHZhbHVlKTtcbiAgICByZXR1cm4gMDtcbiAgfVxuXG4gIGNvbnN0IGkgPSBMb2NhbENvbGxlY3Rpb24uX2JpbmFyeVNlYXJjaChjbXAsIGFycmF5LCB2YWx1ZSk7XG5cbiAgYXJyYXkuc3BsaWNlKGksIDAsIHZhbHVlKTtcblxuICByZXR1cm4gaTtcbn07XG5cbkxvY2FsQ29sbGVjdGlvbi5faXNNb2RpZmljYXRpb25Nb2QgPSBtb2QgPT4ge1xuICBsZXQgaXNNb2RpZnkgPSBmYWxzZTtcbiAgbGV0IGlzUmVwbGFjZSA9IGZhbHNlO1xuXG4gIE9iamVjdC5rZXlzKG1vZCkuZm9yRWFjaChrZXkgPT4ge1xuICAgIGlmIChrZXkuc3Vic3RyKDAsIDEpID09PSAnJCcpIHtcbiAgICAgIGlzTW9kaWZ5ID0gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgaXNSZXBsYWNlID0gdHJ1ZTtcbiAgICB9XG4gIH0pO1xuXG4gIGlmIChpc01vZGlmeSAmJiBpc1JlcGxhY2UpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAnVXBkYXRlIHBhcmFtZXRlciBjYW5ub3QgaGF2ZSBib3RoIG1vZGlmaWVyIGFuZCBub24tbW9kaWZpZXIgZmllbGRzLidcbiAgICApO1xuICB9XG5cbiAgcmV0dXJuIGlzTW9kaWZ5O1xufTtcblxuLy8gWFhYIG1heWJlIHRoaXMgc2hvdWxkIGJlIEVKU09OLmlzT2JqZWN0LCB0aG91Z2ggRUpTT04gZG9lc24ndCBrbm93IGFib3V0XG4vLyBSZWdFeHBcbi8vIFhYWCBub3RlIHRoYXQgX3R5cGUodW5kZWZpbmVkKSA9PT0gMyEhISFcbkxvY2FsQ29sbGVjdGlvbi5faXNQbGFpbk9iamVjdCA9IHggPT4ge1xuICByZXR1cm4geCAmJiBMb2NhbENvbGxlY3Rpb24uX2YuX3R5cGUoeCkgPT09IDM7XG59O1xuXG4vLyBYWFggbmVlZCBhIHN0cmF0ZWd5IGZvciBwYXNzaW5nIHRoZSBiaW5kaW5nIG9mICQgaW50byB0aGlzXG4vLyBmdW5jdGlvbiwgZnJvbSB0aGUgY29tcGlsZWQgc2VsZWN0b3Jcbi8vXG4vLyBtYXliZSBqdXN0IHtrZXkudXAudG8uanVzdC5iZWZvcmUuZG9sbGFyc2lnbjogYXJyYXlfaW5kZXh9XG4vL1xuLy8gWFhYIGF0b21pY2l0eTogaWYgb25lIG1vZGlmaWNhdGlvbiBmYWlscywgZG8gd2Ugcm9sbCBiYWNrIHRoZSB3aG9sZVxuLy8gY2hhbmdlP1xuLy9cbi8vIG9wdGlvbnM6XG4vLyAgIC0gaXNJbnNlcnQgaXMgc2V0IHdoZW4gX21vZGlmeSBpcyBiZWluZyBjYWxsZWQgdG8gY29tcHV0ZSB0aGUgZG9jdW1lbnQgdG9cbi8vICAgICBpbnNlcnQgYXMgcGFydCBvZiBhbiB1cHNlcnQgb3BlcmF0aW9uLiBXZSB1c2UgdGhpcyBwcmltYXJpbHkgdG8gZmlndXJlXG4vLyAgICAgb3V0IHdoZW4gdG8gc2V0IHRoZSBmaWVsZHMgaW4gJHNldE9uSW5zZXJ0LCBpZiBwcmVzZW50LlxuTG9jYWxDb2xsZWN0aW9uLl9tb2RpZnkgPSAoZG9jLCBtb2RpZmllciwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGlmICghTG9jYWxDb2xsZWN0aW9uLl9pc1BsYWluT2JqZWN0KG1vZGlmaWVyKSkge1xuICAgIHRocm93IE1pbmltb25nb0Vycm9yKCdNb2RpZmllciBtdXN0IGJlIGFuIG9iamVjdCcpO1xuICB9XG5cbiAgLy8gTWFrZSBzdXJlIHRoZSBjYWxsZXIgY2FuJ3QgbXV0YXRlIG91ciBkYXRhIHN0cnVjdHVyZXMuXG4gIG1vZGlmaWVyID0gRUpTT04uY2xvbmUobW9kaWZpZXIpO1xuXG4gIGNvbnN0IGlzTW9kaWZpZXIgPSBpc09wZXJhdG9yT2JqZWN0KG1vZGlmaWVyKTtcbiAgY29uc3QgbmV3RG9jID0gaXNNb2RpZmllciA/IEVKU09OLmNsb25lKGRvYykgOiBtb2RpZmllcjtcblxuICBpZiAoaXNNb2RpZmllcikge1xuICAgIC8vIGFwcGx5IG1vZGlmaWVycyB0byB0aGUgZG9jLlxuICAgIE9iamVjdC5rZXlzKG1vZGlmaWVyKS5mb3JFYWNoKG9wZXJhdG9yID0+IHtcbiAgICAgIC8vIFRyZWF0ICRzZXRPbkluc2VydCBhcyAkc2V0IGlmIHRoaXMgaXMgYW4gaW5zZXJ0LlxuICAgICAgY29uc3Qgc2V0T25JbnNlcnQgPSBvcHRpb25zLmlzSW5zZXJ0ICYmIG9wZXJhdG9yID09PSAnJHNldE9uSW5zZXJ0JztcbiAgICAgIGNvbnN0IG1vZEZ1bmMgPSBNT0RJRklFUlNbc2V0T25JbnNlcnQgPyAnJHNldCcgOiBvcGVyYXRvcl07XG4gICAgICBjb25zdCBvcGVyYW5kID0gbW9kaWZpZXJbb3BlcmF0b3JdO1xuXG4gICAgICBpZiAoIW1vZEZ1bmMpIHtcbiAgICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoYEludmFsaWQgbW9kaWZpZXIgc3BlY2lmaWVkICR7b3BlcmF0b3J9YCk7XG4gICAgICB9XG5cbiAgICAgIE9iamVjdC5rZXlzKG9wZXJhbmQpLmZvckVhY2goa2V5cGF0aCA9PiB7XG4gICAgICAgIGNvbnN0IGFyZyA9IG9wZXJhbmRba2V5cGF0aF07XG5cbiAgICAgICAgaWYgKGtleXBhdGggPT09ICcnKSB7XG4gICAgICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoJ0FuIGVtcHR5IHVwZGF0ZSBwYXRoIGlzIG5vdCB2YWxpZC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGtleXBhcnRzID0ga2V5cGF0aC5zcGxpdCgnLicpO1xuXG4gICAgICAgIGlmICgha2V5cGFydHMuZXZlcnkoQm9vbGVhbikpIHtcbiAgICAgICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgICAgIGBUaGUgdXBkYXRlIHBhdGggJyR7a2V5cGF0aH0nIGNvbnRhaW5zIGFuIGVtcHR5IGZpZWxkIG5hbWUsIGAgK1xuICAgICAgICAgICAgJ3doaWNoIGlzIG5vdCBhbGxvd2VkLidcbiAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgdGFyZ2V0ID0gZmluZE1vZFRhcmdldChuZXdEb2MsIGtleXBhcnRzLCB7XG4gICAgICAgICAgYXJyYXlJbmRpY2VzOiBvcHRpb25zLmFycmF5SW5kaWNlcyxcbiAgICAgICAgICBmb3JiaWRBcnJheTogb3BlcmF0b3IgPT09ICckcmVuYW1lJyxcbiAgICAgICAgICBub0NyZWF0ZTogTk9fQ1JFQVRFX01PRElGSUVSU1tvcGVyYXRvcl1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgbW9kRnVuYyh0YXJnZXQsIGtleXBhcnRzLnBvcCgpLCBhcmcsIGtleXBhdGgsIG5ld0RvYyk7XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIGlmIChkb2MuX2lkICYmICFFSlNPTi5lcXVhbHMoZG9jLl9pZCwgbmV3RG9jLl9pZCkpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKFxuICAgICAgICBgQWZ0ZXIgYXBwbHlpbmcgdGhlIHVwZGF0ZSB0byB0aGUgZG9jdW1lbnQge19pZDogXCIke2RvYy5faWR9XCIsIC4uLn0sYCArXG4gICAgICAgICcgdGhlIChpbW11dGFibGUpIGZpZWxkIFxcJ19pZFxcJyB3YXMgZm91bmQgdG8gaGF2ZSBiZWVuIGFsdGVyZWQgdG8gJyArXG4gICAgICAgIGBfaWQ6IFwiJHtuZXdEb2MuX2lkfVwiYFxuICAgICAgKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKGRvYy5faWQgJiYgbW9kaWZpZXIuX2lkICYmICFFSlNPTi5lcXVhbHMoZG9jLl9pZCwgbW9kaWZpZXIuX2lkKSkge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgIGBUaGUgX2lkIGZpZWxkIGNhbm5vdCBiZSBjaGFuZ2VkIGZyb20ge19pZDogXCIke2RvYy5faWR9XCJ9IHRvIGAgK1xuICAgICAgICBge19pZDogXCIke21vZGlmaWVyLl9pZH1cIn1gXG4gICAgICApO1xuICAgIH1cblxuICAgIC8vIHJlcGxhY2UgdGhlIHdob2xlIGRvY3VtZW50XG4gICAgYXNzZXJ0SGFzVmFsaWRGaWVsZE5hbWVzKG1vZGlmaWVyKTtcbiAgfVxuXG4gIC8vIG1vdmUgbmV3IGRvY3VtZW50IGludG8gcGxhY2UuXG4gIE9iamVjdC5rZXlzKGRvYykuZm9yRWFjaChrZXkgPT4ge1xuICAgIC8vIE5vdGU6IHRoaXMgdXNlZCB0byBiZSBmb3IgKHZhciBrZXkgaW4gZG9jKSBob3dldmVyLCB0aGlzIGRvZXMgbm90XG4gICAgLy8gd29yayByaWdodCBpbiBPcGVyYS4gRGVsZXRpbmcgZnJvbSBhIGRvYyB3aGlsZSBpdGVyYXRpbmcgb3ZlciBpdFxuICAgIC8vIHdvdWxkIHNvbWV0aW1lcyBjYXVzZSBvcGVyYSB0byBza2lwIHNvbWUga2V5cy5cbiAgICBpZiAoa2V5ICE9PSAnX2lkJykge1xuICAgICAgZGVsZXRlIGRvY1trZXldO1xuICAgIH1cbiAgfSk7XG5cbiAgT2JqZWN0LmtleXMobmV3RG9jKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgZG9jW2tleV0gPSBuZXdEb2Nba2V5XTtcbiAgfSk7XG59O1xuXG5Mb2NhbENvbGxlY3Rpb24uX29ic2VydmVGcm9tT2JzZXJ2ZUNoYW5nZXMgPSAoY3Vyc29yLCBvYnNlcnZlQ2FsbGJhY2tzKSA9PiB7XG4gIGNvbnN0IHRyYW5zZm9ybSA9IGN1cnNvci5nZXRUcmFuc2Zvcm0oKSB8fCAoZG9jID0+IGRvYyk7XG4gIGxldCBzdXBwcmVzc2VkID0gISFvYnNlcnZlQ2FsbGJhY2tzLl9zdXBwcmVzc19pbml0aWFsO1xuXG4gIGxldCBvYnNlcnZlQ2hhbmdlc0NhbGxiYWNrcztcbiAgaWYgKExvY2FsQ29sbGVjdGlvbi5fb2JzZXJ2ZUNhbGxiYWNrc0FyZU9yZGVyZWQob2JzZXJ2ZUNhbGxiYWNrcykpIHtcbiAgICAvLyBUaGUgXCJfbm9faW5kaWNlc1wiIG9wdGlvbiBzZXRzIGFsbCBpbmRleCBhcmd1bWVudHMgdG8gLTEgYW5kIHNraXBzIHRoZVxuICAgIC8vIGxpbmVhciBzY2FucyByZXF1aXJlZCB0byBnZW5lcmF0ZSB0aGVtLiAgVGhpcyBsZXRzIG9ic2VydmVycyB0aGF0IGRvbid0XG4gICAgLy8gbmVlZCBhYnNvbHV0ZSBpbmRpY2VzIGJlbmVmaXQgZnJvbSB0aGUgb3RoZXIgZmVhdHVyZXMgb2YgdGhpcyBBUEkgLS1cbiAgICAvLyByZWxhdGl2ZSBvcmRlciwgdHJhbnNmb3JtcywgYW5kIGFwcGx5Q2hhbmdlcyAtLSB3aXRob3V0IHRoZSBzcGVlZCBoaXQuXG4gICAgY29uc3QgaW5kaWNlcyA9ICFvYnNlcnZlQ2FsbGJhY2tzLl9ub19pbmRpY2VzO1xuXG4gICAgb2JzZXJ2ZUNoYW5nZXNDYWxsYmFja3MgPSB7XG4gICAgICBhZGRlZEJlZm9yZShpZCwgZmllbGRzLCBiZWZvcmUpIHtcbiAgICAgICAgaWYgKHN1cHByZXNzZWQgfHwgIShvYnNlcnZlQ2FsbGJhY2tzLmFkZGVkQXQgfHwgb2JzZXJ2ZUNhbGxiYWNrcy5hZGRlZCkpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBkb2MgPSB0cmFuc2Zvcm0oT2JqZWN0LmFzc2lnbihmaWVsZHMsIHtfaWQ6IGlkfSkpO1xuXG4gICAgICAgIGlmIChvYnNlcnZlQ2FsbGJhY2tzLmFkZGVkQXQpIHtcbiAgICAgICAgICBvYnNlcnZlQ2FsbGJhY2tzLmFkZGVkQXQoXG4gICAgICAgICAgICBkb2MsXG4gICAgICAgICAgICBpbmRpY2VzXG4gICAgICAgICAgICAgID8gYmVmb3JlXG4gICAgICAgICAgICAgICAgPyB0aGlzLmRvY3MuaW5kZXhPZihiZWZvcmUpXG4gICAgICAgICAgICAgICAgOiB0aGlzLmRvY3Muc2l6ZSgpXG4gICAgICAgICAgICAgIDogLTEsXG4gICAgICAgICAgICBiZWZvcmVcbiAgICAgICAgICApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG9ic2VydmVDYWxsYmFja3MuYWRkZWQoZG9jKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIGNoYW5nZWQoaWQsIGZpZWxkcykge1xuICAgICAgICBpZiAoIShvYnNlcnZlQ2FsbGJhY2tzLmNoYW5nZWRBdCB8fCBvYnNlcnZlQ2FsbGJhY2tzLmNoYW5nZWQpKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGRvYyA9IEVKU09OLmNsb25lKHRoaXMuZG9jcy5nZXQoaWQpKTtcbiAgICAgICAgaWYgKCFkb2MpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gaWQgZm9yIGNoYW5nZWQ6ICR7aWR9YCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBvbGREb2MgPSB0cmFuc2Zvcm0oRUpTT04uY2xvbmUoZG9jKSk7XG5cbiAgICAgICAgRGlmZlNlcXVlbmNlLmFwcGx5Q2hhbmdlcyhkb2MsIGZpZWxkcyk7XG5cbiAgICAgICAgaWYgKG9ic2VydmVDYWxsYmFja3MuY2hhbmdlZEF0KSB7XG4gICAgICAgICAgb2JzZXJ2ZUNhbGxiYWNrcy5jaGFuZ2VkQXQoXG4gICAgICAgICAgICB0cmFuc2Zvcm0oZG9jKSxcbiAgICAgICAgICAgIG9sZERvYyxcbiAgICAgICAgICAgIGluZGljZXMgPyB0aGlzLmRvY3MuaW5kZXhPZihpZCkgOiAtMVxuICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb2JzZXJ2ZUNhbGxiYWNrcy5jaGFuZ2VkKHRyYW5zZm9ybShkb2MpLCBvbGREb2MpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgbW92ZWRCZWZvcmUoaWQsIGJlZm9yZSkge1xuICAgICAgICBpZiAoIW9ic2VydmVDYWxsYmFja3MubW92ZWRUbykge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGZyb20gPSBpbmRpY2VzID8gdGhpcy5kb2NzLmluZGV4T2YoaWQpIDogLTE7XG4gICAgICAgIGxldCB0byA9IGluZGljZXNcbiAgICAgICAgICA/IGJlZm9yZVxuICAgICAgICAgICAgPyB0aGlzLmRvY3MuaW5kZXhPZihiZWZvcmUpXG4gICAgICAgICAgICA6IHRoaXMuZG9jcy5zaXplKClcbiAgICAgICAgICA6IC0xO1xuXG4gICAgICAgIC8vIFdoZW4gbm90IG1vdmluZyBiYWNrd2FyZHMsIGFkanVzdCBmb3IgdGhlIGZhY3QgdGhhdCByZW1vdmluZyB0aGVcbiAgICAgICAgLy8gZG9jdW1lbnQgc2xpZGVzIGV2ZXJ5dGhpbmcgYmFjayBvbmUgc2xvdC5cbiAgICAgICAgaWYgKHRvID4gZnJvbSkge1xuICAgICAgICAgIC0tdG87XG4gICAgICAgIH1cblxuICAgICAgICBvYnNlcnZlQ2FsbGJhY2tzLm1vdmVkVG8oXG4gICAgICAgICAgdHJhbnNmb3JtKEVKU09OLmNsb25lKHRoaXMuZG9jcy5nZXQoaWQpKSksXG4gICAgICAgICAgZnJvbSxcbiAgICAgICAgICB0byxcbiAgICAgICAgICBiZWZvcmUgfHwgbnVsbFxuICAgICAgICApO1xuICAgICAgfSxcbiAgICAgIHJlbW92ZWQoaWQpIHtcbiAgICAgICAgaWYgKCEob2JzZXJ2ZUNhbGxiYWNrcy5yZW1vdmVkQXQgfHwgb2JzZXJ2ZUNhbGxiYWNrcy5yZW1vdmVkKSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHRlY2huaWNhbGx5IG1heWJlIHRoZXJlIHNob3VsZCBiZSBhbiBFSlNPTi5jbG9uZSBoZXJlLCBidXQgaXQncyBhYm91dFxuICAgICAgICAvLyB0byBiZSByZW1vdmVkIGZyb20gdGhpcy5kb2NzIVxuICAgICAgICBjb25zdCBkb2MgPSB0cmFuc2Zvcm0odGhpcy5kb2NzLmdldChpZCkpO1xuXG4gICAgICAgIGlmIChvYnNlcnZlQ2FsbGJhY2tzLnJlbW92ZWRBdCkge1xuICAgICAgICAgIG9ic2VydmVDYWxsYmFja3MucmVtb3ZlZEF0KGRvYywgaW5kaWNlcyA/IHRoaXMuZG9jcy5pbmRleE9mKGlkKSA6IC0xKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvYnNlcnZlQ2FsbGJhY2tzLnJlbW92ZWQoZG9jKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIG9ic2VydmVDaGFuZ2VzQ2FsbGJhY2tzID0ge1xuICAgICAgYWRkZWQoaWQsIGZpZWxkcykge1xuICAgICAgICBpZiAoIXN1cHByZXNzZWQgJiYgb2JzZXJ2ZUNhbGxiYWNrcy5hZGRlZCkge1xuICAgICAgICAgIG9ic2VydmVDYWxsYmFja3MuYWRkZWQodHJhbnNmb3JtKE9iamVjdC5hc3NpZ24oZmllbGRzLCB7X2lkOiBpZH0pKSk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBjaGFuZ2VkKGlkLCBmaWVsZHMpIHtcbiAgICAgICAgaWYgKG9ic2VydmVDYWxsYmFja3MuY2hhbmdlZCkge1xuICAgICAgICAgIGNvbnN0IG9sZERvYyA9IHRoaXMuZG9jcy5nZXQoaWQpO1xuICAgICAgICAgIGNvbnN0IGRvYyA9IEVKU09OLmNsb25lKG9sZERvYyk7XG5cbiAgICAgICAgICBEaWZmU2VxdWVuY2UuYXBwbHlDaGFuZ2VzKGRvYywgZmllbGRzKTtcblxuICAgICAgICAgIG9ic2VydmVDYWxsYmFja3MuY2hhbmdlZChcbiAgICAgICAgICAgIHRyYW5zZm9ybShkb2MpLFxuICAgICAgICAgICAgdHJhbnNmb3JtKEVKU09OLmNsb25lKG9sZERvYykpXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIHJlbW92ZWQoaWQpIHtcbiAgICAgICAgaWYgKG9ic2VydmVDYWxsYmFja3MucmVtb3ZlZCkge1xuICAgICAgICAgIG9ic2VydmVDYWxsYmFja3MucmVtb3ZlZCh0cmFuc2Zvcm0odGhpcy5kb2NzLmdldChpZCkpKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICB9O1xuICB9XG5cbiAgY29uc3QgY2hhbmdlT2JzZXJ2ZXIgPSBuZXcgTG9jYWxDb2xsZWN0aW9uLl9DYWNoaW5nQ2hhbmdlT2JzZXJ2ZXIoe1xuICAgIGNhbGxiYWNrczogb2JzZXJ2ZUNoYW5nZXNDYWxsYmFja3NcbiAgfSk7XG5cbiAgLy8gQ2FjaGluZ0NoYW5nZU9ic2VydmVyIGNsb25lcyBhbGwgcmVjZWl2ZWQgaW5wdXQgb24gaXRzIGNhbGxiYWNrc1xuICAvLyBTbyB3ZSBjYW4gbWFyayBpdCBhcyBzYWZlIHRvIHJlZHVjZSB0aGUgZWpzb24gY2xvbmVzLlxuICAvLyBUaGlzIGlzIHRlc3RlZCBieSB0aGUgYG1vbmdvLWxpdmVkYXRhIC0gKGV4dGVuZGVkKSBzY3JpYmJsaW5nYCB0ZXN0c1xuICBjaGFuZ2VPYnNlcnZlci5hcHBseUNoYW5nZS5fZnJvbU9ic2VydmUgPSB0cnVlO1xuICBjb25zdCBoYW5kbGUgPSBjdXJzb3Iub2JzZXJ2ZUNoYW5nZXMoY2hhbmdlT2JzZXJ2ZXIuYXBwbHlDaGFuZ2UsXG4gICAgeyBub25NdXRhdGluZ0NhbGxiYWNrczogdHJ1ZSB9KTtcblxuICBzdXBwcmVzc2VkID0gZmFsc2U7XG5cbiAgcmV0dXJuIGhhbmRsZTtcbn07XG5cbkxvY2FsQ29sbGVjdGlvbi5fb2JzZXJ2ZUNhbGxiYWNrc0FyZU9yZGVyZWQgPSBjYWxsYmFja3MgPT4ge1xuICBpZiAoY2FsbGJhY2tzLmFkZGVkICYmIGNhbGxiYWNrcy5hZGRlZEF0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdQbGVhc2Ugc3BlY2lmeSBvbmx5IG9uZSBvZiBhZGRlZCgpIGFuZCBhZGRlZEF0KCknKTtcbiAgfVxuXG4gIGlmIChjYWxsYmFja3MuY2hhbmdlZCAmJiBjYWxsYmFja3MuY2hhbmdlZEF0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdQbGVhc2Ugc3BlY2lmeSBvbmx5IG9uZSBvZiBjaGFuZ2VkKCkgYW5kIGNoYW5nZWRBdCgpJyk7XG4gIH1cblxuICBpZiAoY2FsbGJhY2tzLnJlbW92ZWQgJiYgY2FsbGJhY2tzLnJlbW92ZWRBdCkge1xuICAgIHRocm93IG5ldyBFcnJvcignUGxlYXNlIHNwZWNpZnkgb25seSBvbmUgb2YgcmVtb3ZlZCgpIGFuZCByZW1vdmVkQXQoKScpO1xuICB9XG5cbiAgcmV0dXJuICEhKFxuICAgIGNhbGxiYWNrcy5hZGRlZEF0IHx8XG4gICAgY2FsbGJhY2tzLmNoYW5nZWRBdCB8fFxuICAgIGNhbGxiYWNrcy5tb3ZlZFRvIHx8XG4gICAgY2FsbGJhY2tzLnJlbW92ZWRBdFxuICApO1xufTtcblxuTG9jYWxDb2xsZWN0aW9uLl9vYnNlcnZlQ2hhbmdlc0NhbGxiYWNrc0FyZU9yZGVyZWQgPSBjYWxsYmFja3MgPT4ge1xuICBpZiAoY2FsbGJhY2tzLmFkZGVkICYmIGNhbGxiYWNrcy5hZGRlZEJlZm9yZSkge1xuICAgIHRocm93IG5ldyBFcnJvcignUGxlYXNlIHNwZWNpZnkgb25seSBvbmUgb2YgYWRkZWQoKSBhbmQgYWRkZWRCZWZvcmUoKScpO1xuICB9XG5cbiAgcmV0dXJuICEhKGNhbGxiYWNrcy5hZGRlZEJlZm9yZSB8fCBjYWxsYmFja3MubW92ZWRCZWZvcmUpO1xufTtcblxuTG9jYWxDb2xsZWN0aW9uLl9yZW1vdmVGcm9tUmVzdWx0cyA9IChxdWVyeSwgZG9jKSA9PiB7XG4gIGlmIChxdWVyeS5vcmRlcmVkKSB7XG4gICAgY29uc3QgaSA9IExvY2FsQ29sbGVjdGlvbi5fZmluZEluT3JkZXJlZFJlc3VsdHMocXVlcnksIGRvYyk7XG5cbiAgICBxdWVyeS5yZW1vdmVkKGRvYy5faWQpO1xuICAgIHF1ZXJ5LnJlc3VsdHMuc3BsaWNlKGksIDEpO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IGlkID0gZG9jLl9pZDsgIC8vIGluIGNhc2UgY2FsbGJhY2sgbXV0YXRlcyBkb2NcblxuICAgIHF1ZXJ5LnJlbW92ZWQoZG9jLl9pZCk7XG4gICAgcXVlcnkucmVzdWx0cy5yZW1vdmUoaWQpO1xuICB9XG59O1xuXG4vLyBJcyB0aGlzIHNlbGVjdG9yIGp1c3Qgc2hvcnRoYW5kIGZvciBsb29rdXAgYnkgX2lkP1xuTG9jYWxDb2xsZWN0aW9uLl9zZWxlY3RvcklzSWQgPSBzZWxlY3RvciA9PlxuICB0eXBlb2Ygc2VsZWN0b3IgPT09ICdudW1iZXInIHx8XG4gIHR5cGVvZiBzZWxlY3RvciA9PT0gJ3N0cmluZycgfHxcbiAgc2VsZWN0b3IgaW5zdGFuY2VvZiBNb25nb0lELk9iamVjdElEXG47XG5cbi8vIElzIHRoZSBzZWxlY3RvciBqdXN0IGxvb2t1cCBieSBfaWQgKHNob3J0aGFuZCBvciBub3QpP1xuTG9jYWxDb2xsZWN0aW9uLl9zZWxlY3RvcklzSWRQZXJoYXBzQXNPYmplY3QgPSBzZWxlY3RvciA9PlxuICBMb2NhbENvbGxlY3Rpb24uX3NlbGVjdG9ySXNJZChzZWxlY3RvcikgfHxcbiAgTG9jYWxDb2xsZWN0aW9uLl9zZWxlY3RvcklzSWQoc2VsZWN0b3IgJiYgc2VsZWN0b3IuX2lkKSAmJlxuICBPYmplY3Qua2V5cyhzZWxlY3RvcikubGVuZ3RoID09PSAxXG47XG5cbkxvY2FsQ29sbGVjdGlvbi5fdXBkYXRlSW5SZXN1bHRzID0gKHF1ZXJ5LCBkb2MsIG9sZF9kb2MpID0+IHtcbiAgaWYgKCFFSlNPTi5lcXVhbHMoZG9jLl9pZCwgb2xkX2RvYy5faWQpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdDYW5cXCd0IGNoYW5nZSBhIGRvY1xcJ3MgX2lkIHdoaWxlIHVwZGF0aW5nJyk7XG4gIH1cblxuICBjb25zdCBwcm9qZWN0aW9uRm4gPSBxdWVyeS5wcm9qZWN0aW9uRm47XG4gIGNvbnN0IGNoYW5nZWRGaWVsZHMgPSBEaWZmU2VxdWVuY2UubWFrZUNoYW5nZWRGaWVsZHMoXG4gICAgcHJvamVjdGlvbkZuKGRvYyksXG4gICAgcHJvamVjdGlvbkZuKG9sZF9kb2MpXG4gICk7XG5cbiAgaWYgKCFxdWVyeS5vcmRlcmVkKSB7XG4gICAgaWYgKE9iamVjdC5rZXlzKGNoYW5nZWRGaWVsZHMpLmxlbmd0aCkge1xuICAgICAgcXVlcnkuY2hhbmdlZChkb2MuX2lkLCBjaGFuZ2VkRmllbGRzKTtcbiAgICAgIHF1ZXJ5LnJlc3VsdHMuc2V0KGRvYy5faWQsIGRvYyk7XG4gICAgfVxuXG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3Qgb2xkX2lkeCA9IExvY2FsQ29sbGVjdGlvbi5fZmluZEluT3JkZXJlZFJlc3VsdHMocXVlcnksIGRvYyk7XG5cbiAgaWYgKE9iamVjdC5rZXlzKGNoYW5nZWRGaWVsZHMpLmxlbmd0aCkge1xuICAgIHF1ZXJ5LmNoYW5nZWQoZG9jLl9pZCwgY2hhbmdlZEZpZWxkcyk7XG4gIH1cblxuICBpZiAoIXF1ZXJ5LnNvcnRlcikge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIGp1c3QgdGFrZSBpdCBvdXQgYW5kIHB1dCBpdCBiYWNrIGluIGFnYWluLCBhbmQgc2VlIGlmIHRoZSBpbmRleCBjaGFuZ2VzXG4gIHF1ZXJ5LnJlc3VsdHMuc3BsaWNlKG9sZF9pZHgsIDEpO1xuXG4gIGNvbnN0IG5ld19pZHggPSBMb2NhbENvbGxlY3Rpb24uX2luc2VydEluU29ydGVkTGlzdChcbiAgICBxdWVyeS5zb3J0ZXIuZ2V0Q29tcGFyYXRvcih7ZGlzdGFuY2VzOiBxdWVyeS5kaXN0YW5jZXN9KSxcbiAgICBxdWVyeS5yZXN1bHRzLFxuICAgIGRvY1xuICApO1xuXG4gIGlmIChvbGRfaWR4ICE9PSBuZXdfaWR4KSB7XG4gICAgbGV0IG5leHQgPSBxdWVyeS5yZXN1bHRzW25ld19pZHggKyAxXTtcbiAgICBpZiAobmV4dCkge1xuICAgICAgbmV4dCA9IG5leHQuX2lkO1xuICAgIH0gZWxzZSB7XG4gICAgICBuZXh0ID0gbnVsbDtcbiAgICB9XG5cbiAgICBxdWVyeS5tb3ZlZEJlZm9yZSAmJiBxdWVyeS5tb3ZlZEJlZm9yZShkb2MuX2lkLCBuZXh0KTtcbiAgfVxufTtcblxuY29uc3QgTU9ESUZJRVJTID0ge1xuICAkY3VycmVudERhdGUodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgaWYgKHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGhhc093bi5jYWxsKGFyZywgJyR0eXBlJykpIHtcbiAgICAgIGlmIChhcmcuJHR5cGUgIT09ICdkYXRlJykge1xuICAgICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgICAnTWluaW1vbmdvIGRvZXMgY3VycmVudGx5IG9ubHkgc3VwcG9ydCB0aGUgZGF0ZSB0eXBlIGluICcgK1xuICAgICAgICAgICckY3VycmVudERhdGUgbW9kaWZpZXJzJyxcbiAgICAgICAgICB7ZmllbGR9XG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChhcmcgIT09IHRydWUpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKCdJbnZhbGlkICRjdXJyZW50RGF0ZSBtb2RpZmllcicsIHtmaWVsZH0pO1xuICAgIH1cblxuICAgIHRhcmdldFtmaWVsZF0gPSBuZXcgRGF0ZSgpO1xuICB9LFxuICAkaW5jKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgIGlmICh0eXBlb2YgYXJnICE9PSAnbnVtYmVyJykge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoJ01vZGlmaWVyICRpbmMgYWxsb3dlZCBmb3IgbnVtYmVycyBvbmx5Jywge2ZpZWxkfSk7XG4gICAgfVxuXG4gICAgaWYgKGZpZWxkIGluIHRhcmdldCkge1xuICAgICAgaWYgKHR5cGVvZiB0YXJnZXRbZmllbGRdICE9PSAnbnVtYmVyJykge1xuICAgICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgICAnQ2Fubm90IGFwcGx5ICRpbmMgbW9kaWZpZXIgdG8gbm9uLW51bWJlcicsXG4gICAgICAgICAge2ZpZWxkfVxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICB0YXJnZXRbZmllbGRdICs9IGFyZztcbiAgICB9IGVsc2Uge1xuICAgICAgdGFyZ2V0W2ZpZWxkXSA9IGFyZztcbiAgICB9XG4gIH0sXG4gICRtaW4odGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgaWYgKHR5cGVvZiBhcmcgIT09ICdudW1iZXInKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcignTW9kaWZpZXIgJG1pbiBhbGxvd2VkIGZvciBudW1iZXJzIG9ubHknLCB7ZmllbGR9KTtcbiAgICB9XG5cbiAgICBpZiAoZmllbGQgaW4gdGFyZ2V0KSB7XG4gICAgICBpZiAodHlwZW9mIHRhcmdldFtmaWVsZF0gIT09ICdudW1iZXInKSB7XG4gICAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKFxuICAgICAgICAgICdDYW5ub3QgYXBwbHkgJG1pbiBtb2RpZmllciB0byBub24tbnVtYmVyJyxcbiAgICAgICAgICB7ZmllbGR9XG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0YXJnZXRbZmllbGRdID4gYXJnKSB7XG4gICAgICAgIHRhcmdldFtmaWVsZF0gPSBhcmc7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRhcmdldFtmaWVsZF0gPSBhcmc7XG4gICAgfVxuICB9LFxuICAkbWF4KHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgIGlmICh0eXBlb2YgYXJnICE9PSAnbnVtYmVyJykge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoJ01vZGlmaWVyICRtYXggYWxsb3dlZCBmb3IgbnVtYmVycyBvbmx5Jywge2ZpZWxkfSk7XG4gICAgfVxuXG4gICAgaWYgKGZpZWxkIGluIHRhcmdldCkge1xuICAgICAgaWYgKHR5cGVvZiB0YXJnZXRbZmllbGRdICE9PSAnbnVtYmVyJykge1xuICAgICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgICAnQ2Fubm90IGFwcGx5ICRtYXggbW9kaWZpZXIgdG8gbm9uLW51bWJlcicsXG4gICAgICAgICAge2ZpZWxkfVxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICBpZiAodGFyZ2V0W2ZpZWxkXSA8IGFyZykge1xuICAgICAgICB0YXJnZXRbZmllbGRdID0gYXJnO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0YXJnZXRbZmllbGRdID0gYXJnO1xuICAgIH1cbiAgfSxcbiAgJG11bCh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICBpZiAodHlwZW9mIGFyZyAhPT0gJ251bWJlcicpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKCdNb2RpZmllciAkbXVsIGFsbG93ZWQgZm9yIG51bWJlcnMgb25seScsIHtmaWVsZH0pO1xuICAgIH1cblxuICAgIGlmIChmaWVsZCBpbiB0YXJnZXQpIHtcbiAgICAgIGlmICh0eXBlb2YgdGFyZ2V0W2ZpZWxkXSAhPT0gJ251bWJlcicpIHtcbiAgICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgICAgJ0Nhbm5vdCBhcHBseSAkbXVsIG1vZGlmaWVyIHRvIG5vbi1udW1iZXInLFxuICAgICAgICAgIHtmaWVsZH1cbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgdGFyZ2V0W2ZpZWxkXSAqPSBhcmc7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRhcmdldFtmaWVsZF0gPSAwO1xuICAgIH1cbiAgfSxcbiAgJHJlbmFtZSh0YXJnZXQsIGZpZWxkLCBhcmcsIGtleXBhdGgsIGRvYykge1xuICAgIC8vIG5vIGlkZWEgd2h5IG1vbmdvIGhhcyB0aGlzIHJlc3RyaWN0aW9uLi5cbiAgICBpZiAoa2V5cGF0aCA9PT0gYXJnKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcignJHJlbmFtZSBzb3VyY2UgbXVzdCBkaWZmZXIgZnJvbSB0YXJnZXQnLCB7ZmllbGR9KTtcbiAgICB9XG5cbiAgICBpZiAodGFyZ2V0ID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcignJHJlbmFtZSBzb3VyY2UgZmllbGQgaW52YWxpZCcsIHtmaWVsZH0pO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgYXJnICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoJyRyZW5hbWUgdGFyZ2V0IG11c3QgYmUgYSBzdHJpbmcnLCB7ZmllbGR9KTtcbiAgICB9XG5cbiAgICBpZiAoYXJnLmluY2x1ZGVzKCdcXDAnKSkge1xuICAgICAgLy8gTnVsbCBieXRlcyBhcmUgbm90IGFsbG93ZWQgaW4gTW9uZ28gZmllbGQgbmFtZXNcbiAgICAgIC8vIGh0dHBzOi8vZG9jcy5tb25nb2RiLmNvbS9tYW51YWwvcmVmZXJlbmNlL2xpbWl0cy8jUmVzdHJpY3Rpb25zLW9uLUZpZWxkLU5hbWVzXG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgJ1RoZSBcXCd0b1xcJyBmaWVsZCBmb3IgJHJlbmFtZSBjYW5ub3QgY29udGFpbiBhbiBlbWJlZGRlZCBudWxsIGJ5dGUnLFxuICAgICAgICB7ZmllbGR9XG4gICAgICApO1xuICAgIH1cblxuICAgIGlmICh0YXJnZXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IG9iamVjdCA9IHRhcmdldFtmaWVsZF07XG5cbiAgICBkZWxldGUgdGFyZ2V0W2ZpZWxkXTtcblxuICAgIGNvbnN0IGtleXBhcnRzID0gYXJnLnNwbGl0KCcuJyk7XG4gICAgY29uc3QgdGFyZ2V0MiA9IGZpbmRNb2RUYXJnZXQoZG9jLCBrZXlwYXJ0cywge2ZvcmJpZEFycmF5OiB0cnVlfSk7XG5cbiAgICBpZiAodGFyZ2V0MiA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoJyRyZW5hbWUgdGFyZ2V0IGZpZWxkIGludmFsaWQnLCB7ZmllbGR9KTtcbiAgICB9XG5cbiAgICB0YXJnZXQyW2tleXBhcnRzLnBvcCgpXSA9IG9iamVjdDtcbiAgfSxcbiAgJHNldCh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICBpZiAodGFyZ2V0ICE9PSBPYmplY3QodGFyZ2V0KSkgeyAvLyBub3QgYW4gYXJyYXkgb3IgYW4gb2JqZWN0XG4gICAgICBjb25zdCBlcnJvciA9IE1pbmltb25nb0Vycm9yKFxuICAgICAgICAnQ2Fubm90IHNldCBwcm9wZXJ0eSBvbiBub24tb2JqZWN0IGZpZWxkJyxcbiAgICAgICAge2ZpZWxkfVxuICAgICAgKTtcbiAgICAgIGVycm9yLnNldFByb3BlcnR5RXJyb3IgPSB0cnVlO1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuXG4gICAgaWYgKHRhcmdldCA9PT0gbnVsbCkge1xuICAgICAgY29uc3QgZXJyb3IgPSBNaW5pbW9uZ29FcnJvcignQ2Fubm90IHNldCBwcm9wZXJ0eSBvbiBudWxsJywge2ZpZWxkfSk7XG4gICAgICBlcnJvci5zZXRQcm9wZXJ0eUVycm9yID0gdHJ1ZTtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cblxuICAgIGFzc2VydEhhc1ZhbGlkRmllbGROYW1lcyhhcmcpO1xuXG4gICAgdGFyZ2V0W2ZpZWxkXSA9IGFyZztcbiAgfSxcbiAgJHNldE9uSW5zZXJ0KHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgIC8vIGNvbnZlcnRlZCB0byBgJHNldGAgaW4gYF9tb2RpZnlgXG4gIH0sXG4gICR1bnNldCh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICBpZiAodGFyZ2V0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGlmICh0YXJnZXQgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICBpZiAoZmllbGQgaW4gdGFyZ2V0KSB7XG4gICAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRlbGV0ZSB0YXJnZXRbZmllbGRdO1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgJHB1c2godGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgaWYgKHRhcmdldFtmaWVsZF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGFyZ2V0W2ZpZWxkXSA9IFtdO1xuICAgIH1cblxuICAgIGlmICghKHRhcmdldFtmaWVsZF0gaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKCdDYW5ub3QgYXBwbHkgJHB1c2ggbW9kaWZpZXIgdG8gbm9uLWFycmF5Jywge2ZpZWxkfSk7XG4gICAgfVxuXG4gICAgaWYgKCEoYXJnICYmIGFyZy4kZWFjaCkpIHtcbiAgICAgIC8vIFNpbXBsZSBtb2RlOiBub3QgJGVhY2hcbiAgICAgIGFzc2VydEhhc1ZhbGlkRmllbGROYW1lcyhhcmcpO1xuXG4gICAgICB0YXJnZXRbZmllbGRdLnB1c2goYXJnKTtcblxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIEZhbmN5IG1vZGU6ICRlYWNoIChhbmQgbWF5YmUgJHNsaWNlIGFuZCAkc29ydCBhbmQgJHBvc2l0aW9uKVxuICAgIGNvbnN0IHRvUHVzaCA9IGFyZy4kZWFjaDtcbiAgICBpZiAoISh0b1B1c2ggaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKCckZWFjaCBtdXN0IGJlIGFuIGFycmF5Jywge2ZpZWxkfSk7XG4gICAgfVxuXG4gICAgYXNzZXJ0SGFzVmFsaWRGaWVsZE5hbWVzKHRvUHVzaCk7XG5cbiAgICAvLyBQYXJzZSAkcG9zaXRpb25cbiAgICBsZXQgcG9zaXRpb24gPSB1bmRlZmluZWQ7XG4gICAgaWYgKCckcG9zaXRpb24nIGluIGFyZykge1xuICAgICAgaWYgKHR5cGVvZiBhcmcuJHBvc2l0aW9uICE9PSAnbnVtYmVyJykge1xuICAgICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcignJHBvc2l0aW9uIG11c3QgYmUgYSBudW1lcmljIHZhbHVlJywge2ZpZWxkfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIFhYWCBzaG91bGQgY2hlY2sgdG8gbWFrZSBzdXJlIGludGVnZXJcbiAgICAgIGlmIChhcmcuJHBvc2l0aW9uIDwgMCkge1xuICAgICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgICAnJHBvc2l0aW9uIGluICRwdXNoIG11c3QgYmUgemVybyBvciBwb3NpdGl2ZScsXG4gICAgICAgICAge2ZpZWxkfVxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICBwb3NpdGlvbiA9IGFyZy4kcG9zaXRpb247XG4gICAgfVxuXG4gICAgLy8gUGFyc2UgJHNsaWNlLlxuICAgIGxldCBzbGljZSA9IHVuZGVmaW5lZDtcbiAgICBpZiAoJyRzbGljZScgaW4gYXJnKSB7XG4gICAgICBpZiAodHlwZW9mIGFyZy4kc2xpY2UgIT09ICdudW1iZXInKSB7XG4gICAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKCckc2xpY2UgbXVzdCBiZSBhIG51bWVyaWMgdmFsdWUnLCB7ZmllbGR9KTtcbiAgICAgIH1cblxuICAgICAgLy8gWFhYIHNob3VsZCBjaGVjayB0byBtYWtlIHN1cmUgaW50ZWdlclxuICAgICAgc2xpY2UgPSBhcmcuJHNsaWNlO1xuICAgIH1cblxuICAgIC8vIFBhcnNlICRzb3J0LlxuICAgIGxldCBzb3J0RnVuY3Rpb24gPSB1bmRlZmluZWQ7XG4gICAgaWYgKGFyZy4kc29ydCkge1xuICAgICAgaWYgKHNsaWNlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoJyRzb3J0IHJlcXVpcmVzICRzbGljZSB0byBiZSBwcmVzZW50Jywge2ZpZWxkfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIFhYWCB0aGlzIGFsbG93cyB1cyB0byB1c2UgYSAkc29ydCB3aG9zZSB2YWx1ZSBpcyBhbiBhcnJheSwgYnV0IHRoYXQnc1xuICAgICAgLy8gYWN0dWFsbHkgYW4gZXh0ZW5zaW9uIG9mIHRoZSBOb2RlIGRyaXZlciwgc28gaXQgd29uJ3Qgd29ya1xuICAgICAgLy8gc2VydmVyLXNpZGUuIENvdWxkIGJlIGNvbmZ1c2luZyFcbiAgICAgIC8vIFhYWCBpcyBpdCBjb3JyZWN0IHRoYXQgd2UgZG9uJ3QgZG8gZ2VvLXN0dWZmIGhlcmU/XG4gICAgICBzb3J0RnVuY3Rpb24gPSBuZXcgTWluaW1vbmdvLlNvcnRlcihhcmcuJHNvcnQpLmdldENvbXBhcmF0b3IoKTtcblxuICAgICAgdG9QdXNoLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICAgIGlmIChMb2NhbENvbGxlY3Rpb24uX2YuX3R5cGUoZWxlbWVudCkgIT09IDMpIHtcbiAgICAgICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgICAgICckcHVzaCBsaWtlIG1vZGlmaWVycyB1c2luZyAkc29ydCByZXF1aXJlIGFsbCBlbGVtZW50cyB0byBiZSAnICtcbiAgICAgICAgICAgICdvYmplY3RzJyxcbiAgICAgICAgICAgIHtmaWVsZH1cbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBBY3R1YWxseSBwdXNoLlxuICAgIGlmIChwb3NpdGlvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0b1B1c2guZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgICAgdGFyZ2V0W2ZpZWxkXS5wdXNoKGVsZW1lbnQpO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHNwbGljZUFyZ3VtZW50cyA9IFtwb3NpdGlvbiwgMF07XG5cbiAgICAgIHRvUHVzaC5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgICBzcGxpY2VBcmd1bWVudHMucHVzaChlbGVtZW50KTtcbiAgICAgIH0pO1xuXG4gICAgICB0YXJnZXRbZmllbGRdLnNwbGljZSguLi5zcGxpY2VBcmd1bWVudHMpO1xuICAgIH1cblxuICAgIC8vIEFjdHVhbGx5IHNvcnQuXG4gICAgaWYgKHNvcnRGdW5jdGlvbikge1xuICAgICAgdGFyZ2V0W2ZpZWxkXS5zb3J0KHNvcnRGdW5jdGlvbik7XG4gICAgfVxuXG4gICAgLy8gQWN0dWFsbHkgc2xpY2UuXG4gICAgaWYgKHNsaWNlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGlmIChzbGljZSA9PT0gMCkge1xuICAgICAgICB0YXJnZXRbZmllbGRdID0gW107IC8vIGRpZmZlcnMgZnJvbSBBcnJheS5zbGljZSFcbiAgICAgIH0gZWxzZSBpZiAoc2xpY2UgPCAwKSB7XG4gICAgICAgIHRhcmdldFtmaWVsZF0gPSB0YXJnZXRbZmllbGRdLnNsaWNlKHNsaWNlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRhcmdldFtmaWVsZF0gPSB0YXJnZXRbZmllbGRdLnNsaWNlKDAsIHNsaWNlKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gICRwdXNoQWxsKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgIGlmICghKHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoJ01vZGlmaWVyICRwdXNoQWxsL3B1bGxBbGwgYWxsb3dlZCBmb3IgYXJyYXlzIG9ubHknKTtcbiAgICB9XG5cbiAgICBhc3NlcnRIYXNWYWxpZEZpZWxkTmFtZXMoYXJnKTtcblxuICAgIGNvbnN0IHRvUHVzaCA9IHRhcmdldFtmaWVsZF07XG5cbiAgICBpZiAodG9QdXNoID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRhcmdldFtmaWVsZF0gPSBhcmc7XG4gICAgfSBlbHNlIGlmICghKHRvUHVzaCBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgICdDYW5ub3QgYXBwbHkgJHB1c2hBbGwgbW9kaWZpZXIgdG8gbm9uLWFycmF5JyxcbiAgICAgICAge2ZpZWxkfVxuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdG9QdXNoLnB1c2goLi4uYXJnKTtcbiAgICB9XG4gIH0sXG4gICRhZGRUb1NldCh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICBsZXQgaXNFYWNoID0gZmFsc2U7XG5cbiAgICBpZiAodHlwZW9mIGFyZyA9PT0gJ29iamVjdCcpIHtcbiAgICAgIC8vIGNoZWNrIGlmIGZpcnN0IGtleSBpcyAnJGVhY2gnXG4gICAgICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXMoYXJnKTtcbiAgICAgIGlmIChrZXlzWzBdID09PSAnJGVhY2gnKSB7XG4gICAgICAgIGlzRWFjaCA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgdmFsdWVzID0gaXNFYWNoID8gYXJnLiRlYWNoIDogW2FyZ107XG5cbiAgICBhc3NlcnRIYXNWYWxpZEZpZWxkTmFtZXModmFsdWVzKTtcblxuICAgIGNvbnN0IHRvQWRkID0gdGFyZ2V0W2ZpZWxkXTtcbiAgICBpZiAodG9BZGQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGFyZ2V0W2ZpZWxkXSA9IHZhbHVlcztcbiAgICB9IGVsc2UgaWYgKCEodG9BZGQgaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKFxuICAgICAgICAnQ2Fubm90IGFwcGx5ICRhZGRUb1NldCBtb2RpZmllciB0byBub24tYXJyYXknLFxuICAgICAgICB7ZmllbGR9XG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YWx1ZXMuZm9yRWFjaCh2YWx1ZSA9PiB7XG4gICAgICAgIGlmICh0b0FkZC5zb21lKGVsZW1lbnQgPT4gTG9jYWxDb2xsZWN0aW9uLl9mLl9lcXVhbCh2YWx1ZSwgZWxlbWVudCkpKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdG9BZGQucHVzaCh2YWx1ZSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH0sXG4gICRwb3AodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgaWYgKHRhcmdldCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgdG9Qb3AgPSB0YXJnZXRbZmllbGRdO1xuXG4gICAgaWYgKHRvUG9wID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoISh0b1BvcCBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoJ0Nhbm5vdCBhcHBseSAkcG9wIG1vZGlmaWVyIHRvIG5vbi1hcnJheScsIHtmaWVsZH0pO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgYXJnID09PSAnbnVtYmVyJyAmJiBhcmcgPCAwKSB7XG4gICAgICB0b1BvcC5zcGxpY2UoMCwgMSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRvUG9wLnBvcCgpO1xuICAgIH1cbiAgfSxcbiAgJHB1bGwodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgaWYgKHRhcmdldCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgdG9QdWxsID0gdGFyZ2V0W2ZpZWxkXTtcbiAgICBpZiAodG9QdWxsID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoISh0b1B1bGwgaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKFxuICAgICAgICAnQ2Fubm90IGFwcGx5ICRwdWxsL3B1bGxBbGwgbW9kaWZpZXIgdG8gbm9uLWFycmF5JyxcbiAgICAgICAge2ZpZWxkfVxuICAgICAgKTtcbiAgICB9XG5cbiAgICBsZXQgb3V0O1xuICAgIGlmIChhcmcgIT0gbnVsbCAmJiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiAhKGFyZyBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgLy8gWFhYIHdvdWxkIGJlIG11Y2ggbmljZXIgdG8gY29tcGlsZSB0aGlzIG9uY2UsIHJhdGhlciB0aGFuXG4gICAgICAvLyBmb3IgZWFjaCBkb2N1bWVudCB3ZSBtb2RpZnkuLiBidXQgdXN1YWxseSB3ZSdyZSBub3RcbiAgICAgIC8vIG1vZGlmeWluZyB0aGF0IG1hbnkgZG9jdW1lbnRzLCBzbyB3ZSdsbCBsZXQgaXQgc2xpZGUgZm9yXG4gICAgICAvLyBub3dcblxuICAgICAgLy8gWFhYIE1pbmltb25nby5NYXRjaGVyIGlzbid0IHVwIGZvciB0aGUgam9iLCBiZWNhdXNlIHdlIG5lZWRcbiAgICAgIC8vIHRvIHBlcm1pdCBzdHVmZiBsaWtlIHskcHVsbDoge2E6IHskZ3Q6IDR9fX0uLiBzb21ldGhpbmdcbiAgICAgIC8vIGxpa2UgeyRndDogNH0gaXMgbm90IG5vcm1hbGx5IGEgY29tcGxldGUgc2VsZWN0b3IuXG4gICAgICAvLyBzYW1lIGlzc3VlIGFzICRlbGVtTWF0Y2ggcG9zc2libHk/XG4gICAgICBjb25zdCBtYXRjaGVyID0gbmV3IE1pbmltb25nby5NYXRjaGVyKGFyZyk7XG5cbiAgICAgIG91dCA9IHRvUHVsbC5maWx0ZXIoZWxlbWVudCA9PiAhbWF0Y2hlci5kb2N1bWVudE1hdGNoZXMoZWxlbWVudCkucmVzdWx0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ID0gdG9QdWxsLmZpbHRlcihlbGVtZW50ID0+ICFMb2NhbENvbGxlY3Rpb24uX2YuX2VxdWFsKGVsZW1lbnQsIGFyZykpO1xuICAgIH1cblxuICAgIHRhcmdldFtmaWVsZF0gPSBvdXQ7XG4gIH0sXG4gICRwdWxsQWxsKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgIGlmICghKHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgICdNb2RpZmllciAkcHVzaEFsbC9wdWxsQWxsIGFsbG93ZWQgZm9yIGFycmF5cyBvbmx5JyxcbiAgICAgICAge2ZpZWxkfVxuICAgICAgKTtcbiAgICB9XG5cbiAgICBpZiAodGFyZ2V0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCB0b1B1bGwgPSB0YXJnZXRbZmllbGRdO1xuXG4gICAgaWYgKHRvUHVsbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCEodG9QdWxsIGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgJ0Nhbm5vdCBhcHBseSAkcHVsbC9wdWxsQWxsIG1vZGlmaWVyIHRvIG5vbi1hcnJheScsXG4gICAgICAgIHtmaWVsZH1cbiAgICAgICk7XG4gICAgfVxuXG4gICAgdGFyZ2V0W2ZpZWxkXSA9IHRvUHVsbC5maWx0ZXIob2JqZWN0ID0+XG4gICAgICAhYXJnLnNvbWUoZWxlbWVudCA9PiBMb2NhbENvbGxlY3Rpb24uX2YuX2VxdWFsKG9iamVjdCwgZWxlbWVudCkpXG4gICAgKTtcbiAgfSxcbiAgJGJpdCh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAvLyBYWFggbW9uZ28gb25seSBzdXBwb3J0cyAkYml0IG9uIGludGVnZXJzLCBhbmQgd2Ugb25seSBzdXBwb3J0XG4gICAgLy8gbmF0aXZlIGphdmFzY3JpcHQgbnVtYmVycyAoZG91Ymxlcykgc28gZmFyLCBzbyB3ZSBjYW4ndCBzdXBwb3J0ICRiaXRcbiAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcignJGJpdCBpcyBub3Qgc3VwcG9ydGVkJywge2ZpZWxkfSk7XG4gIH0sXG4gICR2KCkge1xuICAgIC8vIEFzIGRpc2N1c3NlZCBpbiBodHRwczovL2dpdGh1Yi5jb20vbWV0ZW9yL21ldGVvci9pc3N1ZXMvOTYyMyxcbiAgICAvLyB0aGUgYCR2YCBvcGVyYXRvciBpcyBub3QgbmVlZGVkIGJ5IE1ldGVvciwgYnV0IHByb2JsZW1zIGNhbiBvY2N1ciBpZlxuICAgIC8vIGl0J3Mgbm90IGF0IGxlYXN0IGNhbGxhYmxlIChhcyBvZiBNb25nbyA+PSAzLjYpLiBJdCdzIGRlZmluZWQgaGVyZSBhc1xuICAgIC8vIGEgbm8tb3AgdG8gd29yayBhcm91bmQgdGhlc2UgcHJvYmxlbXMuXG4gIH1cbn07XG5cbmNvbnN0IE5PX0NSRUFURV9NT0RJRklFUlMgPSB7XG4gICRwb3A6IHRydWUsXG4gICRwdWxsOiB0cnVlLFxuICAkcHVsbEFsbDogdHJ1ZSxcbiAgJHJlbmFtZTogdHJ1ZSxcbiAgJHVuc2V0OiB0cnVlXG59O1xuXG4vLyBNYWtlIHN1cmUgZmllbGQgbmFtZXMgZG8gbm90IGNvbnRhaW4gTW9uZ28gcmVzdHJpY3RlZFxuLy8gY2hhcmFjdGVycyAoJy4nLCAnJCcsICdcXDAnKS5cbi8vIGh0dHBzOi8vZG9jcy5tb25nb2RiLmNvbS9tYW51YWwvcmVmZXJlbmNlL2xpbWl0cy8jUmVzdHJpY3Rpb25zLW9uLUZpZWxkLU5hbWVzXG5jb25zdCBpbnZhbGlkQ2hhck1zZyA9IHtcbiAgJDogJ3N0YXJ0IHdpdGggXFwnJFxcJycsXG4gICcuJzogJ2NvbnRhaW4gXFwnLlxcJycsXG4gICdcXDAnOiAnY29udGFpbiBudWxsIGJ5dGVzJ1xufTtcblxuLy8gY2hlY2tzIGlmIGFsbCBmaWVsZCBuYW1lcyBpbiBhbiBvYmplY3QgYXJlIHZhbGlkXG5mdW5jdGlvbiBhc3NlcnRIYXNWYWxpZEZpZWxkTmFtZXMoZG9jKSB7XG4gIGlmIChkb2MgJiYgdHlwZW9mIGRvYyA9PT0gJ29iamVjdCcpIHtcbiAgICBKU09OLnN0cmluZ2lmeShkb2MsIChrZXksIHZhbHVlKSA9PiB7XG4gICAgICBhc3NlcnRJc1ZhbGlkRmllbGROYW1lKGtleSk7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gYXNzZXJ0SXNWYWxpZEZpZWxkTmFtZShrZXkpIHtcbiAgbGV0IG1hdGNoO1xuICBpZiAodHlwZW9mIGtleSA9PT0gJ3N0cmluZycgJiYgKG1hdGNoID0ga2V5Lm1hdGNoKC9eXFwkfFxcLnxcXDAvKSkpIHtcbiAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihgS2V5ICR7a2V5fSBtdXN0IG5vdCAke2ludmFsaWRDaGFyTXNnW21hdGNoWzBdXX1gKTtcbiAgfVxufVxuXG4vLyBmb3IgYS5iLmMuMi5kLmUsIGtleXBhcnRzIHNob3VsZCBiZSBbJ2EnLCAnYicsICdjJywgJzInLCAnZCcsICdlJ10sXG4vLyBhbmQgdGhlbiB5b3Ugd291bGQgb3BlcmF0ZSBvbiB0aGUgJ2UnIHByb3BlcnR5IG9mIHRoZSByZXR1cm5lZFxuLy8gb2JqZWN0LlxuLy9cbi8vIGlmIG9wdGlvbnMubm9DcmVhdGUgaXMgZmFsc2V5LCBjcmVhdGVzIGludGVybWVkaWF0ZSBsZXZlbHMgb2Zcbi8vIHN0cnVjdHVyZSBhcyBuZWNlc3NhcnksIGxpa2UgbWtkaXIgLXAgKGFuZCByYWlzZXMgYW4gZXhjZXB0aW9uIGlmXG4vLyB0aGF0IHdvdWxkIG1lYW4gZ2l2aW5nIGEgbm9uLW51bWVyaWMgcHJvcGVydHkgdG8gYW4gYXJyYXkuKSBpZlxuLy8gb3B0aW9ucy5ub0NyZWF0ZSBpcyB0cnVlLCByZXR1cm4gdW5kZWZpbmVkIGluc3RlYWQuXG4vL1xuLy8gbWF5IG1vZGlmeSB0aGUgbGFzdCBlbGVtZW50IG9mIGtleXBhcnRzIHRvIHNpZ25hbCB0byB0aGUgY2FsbGVyIHRoYXQgaXQgbmVlZHNcbi8vIHRvIHVzZSBhIGRpZmZlcmVudCB2YWx1ZSB0byBpbmRleCBpbnRvIHRoZSByZXR1cm5lZCBvYmplY3QgKGZvciBleGFtcGxlLFxuLy8gWydhJywgJzAxJ10gLT4gWydhJywgMV0pLlxuLy9cbi8vIGlmIGZvcmJpZEFycmF5IGlzIHRydWUsIHJldHVybiBudWxsIGlmIHRoZSBrZXlwYXRoIGdvZXMgdGhyb3VnaCBhbiBhcnJheS5cbi8vXG4vLyBpZiBvcHRpb25zLmFycmF5SW5kaWNlcyBpcyBzZXQsIHVzZSBpdHMgZmlyc3QgZWxlbWVudCBmb3IgdGhlIChmaXJzdCkgJyQnIGluXG4vLyB0aGUgcGF0aC5cbmZ1bmN0aW9uIGZpbmRNb2RUYXJnZXQoZG9jLCBrZXlwYXJ0cywgb3B0aW9ucyA9IHt9KSB7XG4gIGxldCB1c2VkQXJyYXlJbmRleCA9IGZhbHNlO1xuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwga2V5cGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBsYXN0ID0gaSA9PT0ga2V5cGFydHMubGVuZ3RoIC0gMTtcbiAgICBsZXQga2V5cGFydCA9IGtleXBhcnRzW2ldO1xuXG4gICAgaWYgKCFpc0luZGV4YWJsZShkb2MpKSB7XG4gICAgICBpZiAob3B0aW9ucy5ub0NyZWF0ZSkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBlcnJvciA9IE1pbmltb25nb0Vycm9yKFxuICAgICAgICBgY2Fubm90IHVzZSB0aGUgcGFydCAnJHtrZXlwYXJ0fScgdG8gdHJhdmVyc2UgJHtkb2N9YFxuICAgICAgKTtcbiAgICAgIGVycm9yLnNldFByb3BlcnR5RXJyb3IgPSB0cnVlO1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuXG4gICAgaWYgKGRvYyBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICBpZiAob3B0aW9ucy5mb3JiaWRBcnJheSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgaWYgKGtleXBhcnQgPT09ICckJykge1xuICAgICAgICBpZiAodXNlZEFycmF5SW5kZXgpIHtcbiAgICAgICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcignVG9vIG1hbnkgcG9zaXRpb25hbCAoaS5lLiBcXCckXFwnKSBlbGVtZW50cycpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFvcHRpb25zLmFycmF5SW5kaWNlcyB8fCAhb3B0aW9ucy5hcnJheUluZGljZXMubGVuZ3RoKSB7XG4gICAgICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgICAgICAnVGhlIHBvc2l0aW9uYWwgb3BlcmF0b3IgZGlkIG5vdCBmaW5kIHRoZSBtYXRjaCBuZWVkZWQgZnJvbSB0aGUgJyArXG4gICAgICAgICAgICAncXVlcnknXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGtleXBhcnQgPSBvcHRpb25zLmFycmF5SW5kaWNlc1swXTtcbiAgICAgICAgdXNlZEFycmF5SW5kZXggPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChpc051bWVyaWNLZXkoa2V5cGFydCkpIHtcbiAgICAgICAga2V5cGFydCA9IHBhcnNlSW50KGtleXBhcnQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKG9wdGlvbnMubm9DcmVhdGUpIHtcbiAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgICAgYGNhbid0IGFwcGVuZCB0byBhcnJheSB1c2luZyBzdHJpbmcgZmllbGQgbmFtZSBbJHtrZXlwYXJ0fV1gXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIGlmIChsYXN0KSB7XG4gICAgICAgIGtleXBhcnRzW2ldID0ga2V5cGFydDsgLy8gaGFuZGxlICdhLjAxJ1xuICAgICAgfVxuXG4gICAgICBpZiAob3B0aW9ucy5ub0NyZWF0ZSAmJiBrZXlwYXJ0ID49IGRvYy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgICAgd2hpbGUgKGRvYy5sZW5ndGggPCBrZXlwYXJ0KSB7XG4gICAgICAgIGRvYy5wdXNoKG51bGwpO1xuICAgICAgfVxuXG4gICAgICBpZiAoIWxhc3QpIHtcbiAgICAgICAgaWYgKGRvYy5sZW5ndGggPT09IGtleXBhcnQpIHtcbiAgICAgICAgICBkb2MucHVzaCh7fSk7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGRvY1trZXlwYXJ0XSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgICAgIGBjYW4ndCBtb2RpZnkgZmllbGQgJyR7a2V5cGFydHNbaSArIDFdfScgb2YgbGlzdCB2YWx1ZSBgICtcbiAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KGRvY1trZXlwYXJ0XSlcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGFzc2VydElzVmFsaWRGaWVsZE5hbWUoa2V5cGFydCk7XG5cbiAgICAgIGlmICghKGtleXBhcnQgaW4gZG9jKSkge1xuICAgICAgICBpZiAob3B0aW9ucy5ub0NyZWF0ZSkge1xuICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWxhc3QpIHtcbiAgICAgICAgICBkb2Nba2V5cGFydF0gPSB7fTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChsYXN0KSB7XG4gICAgICByZXR1cm4gZG9jO1xuICAgIH1cblxuICAgIGRvYyA9IGRvY1trZXlwYXJ0XTtcbiAgfVxuXG4gIC8vIG5vdHJlYWNoZWRcbn1cbiIsImltcG9ydCBMb2NhbENvbGxlY3Rpb24gZnJvbSAnLi9sb2NhbF9jb2xsZWN0aW9uLmpzJztcbmltcG9ydCB7XG4gIGNvbXBpbGVEb2N1bWVudFNlbGVjdG9yLFxuICBoYXNPd24sXG4gIG5vdGhpbmdNYXRjaGVyLFxufSBmcm9tICcuL2NvbW1vbi5qcyc7XG5cbmNvbnN0IERlY2ltYWwgPSBQYWNrYWdlWydtb25nby1kZWNpbWFsJ10/LkRlY2ltYWwgfHwgY2xhc3MgRGVjaW1hbFN0dWIge31cblxuLy8gVGhlIG1pbmltb25nbyBzZWxlY3RvciBjb21waWxlciFcblxuLy8gVGVybWlub2xvZ3k6XG4vLyAgLSBhICdzZWxlY3RvcicgaXMgdGhlIEVKU09OIG9iamVjdCByZXByZXNlbnRpbmcgYSBzZWxlY3RvclxuLy8gIC0gYSAnbWF0Y2hlcicgaXMgaXRzIGNvbXBpbGVkIGZvcm0gKHdoZXRoZXIgYSBmdWxsIE1pbmltb25nby5NYXRjaGVyXG4vLyAgICBvYmplY3Qgb3Igb25lIG9mIHRoZSBjb21wb25lbnQgbGFtYmRhcyB0aGF0IG1hdGNoZXMgcGFydHMgb2YgaXQpXG4vLyAgLSBhICdyZXN1bHQgb2JqZWN0JyBpcyBhbiBvYmplY3Qgd2l0aCBhICdyZXN1bHQnIGZpZWxkIGFuZCBtYXliZVxuLy8gICAgZGlzdGFuY2UgYW5kIGFycmF5SW5kaWNlcy5cbi8vICAtIGEgJ2JyYW5jaGVkIHZhbHVlJyBpcyBhbiBvYmplY3Qgd2l0aCBhICd2YWx1ZScgZmllbGQgYW5kIG1heWJlXG4vLyAgICAnZG9udEl0ZXJhdGUnIGFuZCAnYXJyYXlJbmRpY2VzJy5cbi8vICAtIGEgJ2RvY3VtZW50JyBpcyBhIHRvcC1sZXZlbCBvYmplY3QgdGhhdCBjYW4gYmUgc3RvcmVkIGluIGEgY29sbGVjdGlvbi5cbi8vICAtIGEgJ2xvb2t1cCBmdW5jdGlvbicgaXMgYSBmdW5jdGlvbiB0aGF0IHRha2VzIGluIGEgZG9jdW1lbnQgYW5kIHJldHVybnNcbi8vICAgIGFuIGFycmF5IG9mICdicmFuY2hlZCB2YWx1ZXMnLlxuLy8gIC0gYSAnYnJhbmNoZWQgbWF0Y2hlcicgbWFwcyBmcm9tIGFuIGFycmF5IG9mIGJyYW5jaGVkIHZhbHVlcyB0byBhIHJlc3VsdFxuLy8gICAgb2JqZWN0LlxuLy8gIC0gYW4gJ2VsZW1lbnQgbWF0Y2hlcicgbWFwcyBmcm9tIGEgc2luZ2xlIHZhbHVlIHRvIGEgYm9vbC5cblxuLy8gTWFpbiBlbnRyeSBwb2ludC5cbi8vICAgdmFyIG1hdGNoZXIgPSBuZXcgTWluaW1vbmdvLk1hdGNoZXIoe2E6IHskZ3Q6IDV9fSk7XG4vLyAgIGlmIChtYXRjaGVyLmRvY3VtZW50TWF0Y2hlcyh7YTogN30pKSAuLi5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1hdGNoZXIge1xuICBjb25zdHJ1Y3RvcihzZWxlY3RvciwgaXNVcGRhdGUpIHtcbiAgICAvLyBBIHNldCAob2JqZWN0IG1hcHBpbmcgc3RyaW5nIC0+ICopIG9mIGFsbCBvZiB0aGUgZG9jdW1lbnQgcGF0aHMgbG9va2VkXG4gICAgLy8gYXQgYnkgdGhlIHNlbGVjdG9yLiBBbHNvIGluY2x1ZGVzIHRoZSBlbXB0eSBzdHJpbmcgaWYgaXQgbWF5IGxvb2sgYXQgYW55XG4gICAgLy8gcGF0aCAoZWcsICR3aGVyZSkuXG4gICAgdGhpcy5fcGF0aHMgPSB7fTtcbiAgICAvLyBTZXQgdG8gdHJ1ZSBpZiBjb21waWxhdGlvbiBmaW5kcyBhICRuZWFyLlxuICAgIHRoaXMuX2hhc0dlb1F1ZXJ5ID0gZmFsc2U7XG4gICAgLy8gU2V0IHRvIHRydWUgaWYgY29tcGlsYXRpb24gZmluZHMgYSAkd2hlcmUuXG4gICAgdGhpcy5faGFzV2hlcmUgPSBmYWxzZTtcbiAgICAvLyBTZXQgdG8gZmFsc2UgaWYgY29tcGlsYXRpb24gZmluZHMgYW55dGhpbmcgb3RoZXIgdGhhbiBhIHNpbXBsZSBlcXVhbGl0eVxuICAgIC8vIG9yIG9uZSBvciBtb3JlIG9mICckZ3QnLCAnJGd0ZScsICckbHQnLCAnJGx0ZScsICckbmUnLCAnJGluJywgJyRuaW4nIHVzZWRcbiAgICAvLyB3aXRoIHNjYWxhcnMgYXMgb3BlcmFuZHMuXG4gICAgdGhpcy5faXNTaW1wbGUgPSB0cnVlO1xuICAgIC8vIFNldCB0byBhIGR1bW15IGRvY3VtZW50IHdoaWNoIGFsd2F5cyBtYXRjaGVzIHRoaXMgTWF0Y2hlci4gT3Igc2V0IHRvIG51bGxcbiAgICAvLyBpZiBzdWNoIGRvY3VtZW50IGlzIHRvbyBoYXJkIHRvIGZpbmQuXG4gICAgdGhpcy5fbWF0Y2hpbmdEb2N1bWVudCA9IHVuZGVmaW5lZDtcbiAgICAvLyBBIGNsb25lIG9mIHRoZSBvcmlnaW5hbCBzZWxlY3Rvci4gSXQgbWF5IGp1c3QgYmUgYSBmdW5jdGlvbiBpZiB0aGUgdXNlclxuICAgIC8vIHBhc3NlZCBpbiBhIGZ1bmN0aW9uOyBvdGhlcndpc2UgaXMgZGVmaW5pdGVseSBhbiBvYmplY3QgKGVnLCBJRHMgYXJlXG4gICAgLy8gdHJhbnNsYXRlZCBpbnRvIHtfaWQ6IElEfSBmaXJzdC4gVXNlZCBieSBjYW5CZWNvbWVUcnVlQnlNb2RpZmllciBhbmRcbiAgICAvLyBTb3J0ZXIuX3VzZVdpdGhNYXRjaGVyLlxuICAgIHRoaXMuX3NlbGVjdG9yID0gbnVsbDtcbiAgICB0aGlzLl9kb2NNYXRjaGVyID0gdGhpcy5fY29tcGlsZVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgICAvLyBTZXQgdG8gdHJ1ZSBpZiBzZWxlY3Rpb24gaXMgZG9uZSBmb3IgYW4gdXBkYXRlIG9wZXJhdGlvblxuICAgIC8vIERlZmF1bHQgaXMgZmFsc2VcbiAgICAvLyBVc2VkIGZvciAkbmVhciBhcnJheSB1cGRhdGUgKGlzc3VlICMzNTk5KVxuICAgIHRoaXMuX2lzVXBkYXRlID0gaXNVcGRhdGU7XG4gIH1cblxuICBkb2N1bWVudE1hdGNoZXMoZG9jKSB7XG4gICAgaWYgKGRvYyAhPT0gT2JqZWN0KGRvYykpIHtcbiAgICAgIHRocm93IEVycm9yKCdkb2N1bWVudE1hdGNoZXMgbmVlZHMgYSBkb2N1bWVudCcpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9kb2NNYXRjaGVyKGRvYyk7XG4gIH1cblxuICBoYXNHZW9RdWVyeSgpIHtcbiAgICByZXR1cm4gdGhpcy5faGFzR2VvUXVlcnk7XG4gIH1cblxuICBoYXNXaGVyZSgpIHtcbiAgICByZXR1cm4gdGhpcy5faGFzV2hlcmU7XG4gIH1cblxuICBpc1NpbXBsZSgpIHtcbiAgICByZXR1cm4gdGhpcy5faXNTaW1wbGU7XG4gIH1cblxuICAvLyBHaXZlbiBhIHNlbGVjdG9yLCByZXR1cm4gYSBmdW5jdGlvbiB0aGF0IHRha2VzIG9uZSBhcmd1bWVudCwgYVxuICAvLyBkb2N1bWVudC4gSXQgcmV0dXJucyBhIHJlc3VsdCBvYmplY3QuXG4gIF9jb21waWxlU2VsZWN0b3Ioc2VsZWN0b3IpIHtcbiAgICAvLyB5b3UgY2FuIHBhc3MgYSBsaXRlcmFsIGZ1bmN0aW9uIGluc3RlYWQgb2YgYSBzZWxlY3RvclxuICAgIGlmIChzZWxlY3RvciBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICB0aGlzLl9pc1NpbXBsZSA9IGZhbHNlO1xuICAgICAgdGhpcy5fc2VsZWN0b3IgPSBzZWxlY3RvcjtcbiAgICAgIHRoaXMuX3JlY29yZFBhdGhVc2VkKCcnKTtcblxuICAgICAgcmV0dXJuIGRvYyA9PiAoe3Jlc3VsdDogISFzZWxlY3Rvci5jYWxsKGRvYyl9KTtcbiAgICB9XG5cbiAgICAvLyBzaG9ydGhhbmQgLS0gc2NhbGFyIF9pZFxuICAgIGlmIChMb2NhbENvbGxlY3Rpb24uX3NlbGVjdG9ySXNJZChzZWxlY3RvcikpIHtcbiAgICAgIHRoaXMuX3NlbGVjdG9yID0ge19pZDogc2VsZWN0b3J9O1xuICAgICAgdGhpcy5fcmVjb3JkUGF0aFVzZWQoJ19pZCcpO1xuXG4gICAgICByZXR1cm4gZG9jID0+ICh7cmVzdWx0OiBFSlNPTi5lcXVhbHMoZG9jLl9pZCwgc2VsZWN0b3IpfSk7XG4gICAgfVxuXG4gICAgLy8gcHJvdGVjdCBhZ2FpbnN0IGRhbmdlcm91cyBzZWxlY3RvcnMuICBmYWxzZXkgYW5kIHtfaWQ6IGZhbHNleX0gYXJlIGJvdGhcbiAgICAvLyBsaWtlbHkgcHJvZ3JhbW1lciBlcnJvciwgYW5kIG5vdCB3aGF0IHlvdSB3YW50LCBwYXJ0aWN1bGFybHkgZm9yXG4gICAgLy8gZGVzdHJ1Y3RpdmUgb3BlcmF0aW9ucy5cbiAgICBpZiAoIXNlbGVjdG9yIHx8IGhhc093bi5jYWxsKHNlbGVjdG9yLCAnX2lkJykgJiYgIXNlbGVjdG9yLl9pZCkge1xuICAgICAgdGhpcy5faXNTaW1wbGUgPSBmYWxzZTtcbiAgICAgIHJldHVybiBub3RoaW5nTWF0Y2hlcjtcbiAgICB9XG5cbiAgICAvLyBUb3AgbGV2ZWwgY2FuJ3QgYmUgYW4gYXJyYXkgb3IgdHJ1ZSBvciBiaW5hcnkuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkoc2VsZWN0b3IpIHx8XG4gICAgICAgIEVKU09OLmlzQmluYXJ5KHNlbGVjdG9yKSB8fFxuICAgICAgICB0eXBlb2Ygc2VsZWN0b3IgPT09ICdib29sZWFuJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIHNlbGVjdG9yOiAke3NlbGVjdG9yfWApO1xuICAgIH1cblxuICAgIHRoaXMuX3NlbGVjdG9yID0gRUpTT04uY2xvbmUoc2VsZWN0b3IpO1xuXG4gICAgcmV0dXJuIGNvbXBpbGVEb2N1bWVudFNlbGVjdG9yKHNlbGVjdG9yLCB0aGlzLCB7aXNSb290OiB0cnVlfSk7XG4gIH1cblxuICAvLyBSZXR1cm5zIGEgbGlzdCBvZiBrZXkgcGF0aHMgdGhlIGdpdmVuIHNlbGVjdG9yIGlzIGxvb2tpbmcgZm9yLiBJdCBpbmNsdWRlc1xuICAvLyB0aGUgZW1wdHkgc3RyaW5nIGlmIHRoZXJlIGlzIGEgJHdoZXJlLlxuICBfZ2V0UGF0aHMoKSB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMuX3BhdGhzKTtcbiAgfVxuXG4gIF9yZWNvcmRQYXRoVXNlZChwYXRoKSB7XG4gICAgdGhpcy5fcGF0aHNbcGF0aF0gPSB0cnVlO1xuICB9XG59XG5cbi8vIGhlbHBlcnMgdXNlZCBieSBjb21waWxlZCBzZWxlY3RvciBjb2RlXG5Mb2NhbENvbGxlY3Rpb24uX2YgPSB7XG4gIC8vIFhYWCBmb3IgX2FsbCBhbmQgX2luLCBjb25zaWRlciBidWlsZGluZyAnaW5xdWVyeScgYXQgY29tcGlsZSB0aW1lLi5cbiAgX3R5cGUodikge1xuICAgIGlmICh0eXBlb2YgdiA9PT0gJ251bWJlcicpIHtcbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgdiA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHJldHVybiAyO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgdiA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgICByZXR1cm4gODtcbiAgICB9XG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheSh2KSkge1xuICAgICAgcmV0dXJuIDQ7XG4gICAgfVxuXG4gICAgaWYgKHYgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiAxMDtcbiAgICB9XG5cbiAgICAvLyBub3RlIHRoYXQgdHlwZW9mKC94LykgPT09IFwib2JqZWN0XCJcbiAgICBpZiAodiBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgICAgcmV0dXJuIDExO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgdiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIDEzO1xuICAgIH1cblxuICAgIGlmICh2IGluc3RhbmNlb2YgRGF0ZSkge1xuICAgICAgcmV0dXJuIDk7XG4gICAgfVxuXG4gICAgaWYgKEVKU09OLmlzQmluYXJ5KHYpKSB7XG4gICAgICByZXR1cm4gNTtcbiAgICB9XG5cbiAgICBpZiAodiBpbnN0YW5jZW9mIE1vbmdvSUQuT2JqZWN0SUQpIHtcbiAgICAgIHJldHVybiA3O1xuICAgIH1cblxuICAgIGlmICh2IGluc3RhbmNlb2YgRGVjaW1hbCkge1xuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgLy8gb2JqZWN0XG4gICAgcmV0dXJuIDM7XG5cbiAgICAvLyBYWFggc3VwcG9ydCBzb21lL2FsbCBvZiB0aGVzZTpcbiAgICAvLyAxNCwgc3ltYm9sXG4gICAgLy8gMTUsIGphdmFzY3JpcHQgY29kZSB3aXRoIHNjb3BlXG4gICAgLy8gMTYsIDE4OiAzMi1iaXQvNjQtYml0IGludGVnZXJcbiAgICAvLyAxNywgdGltZXN0YW1wXG4gICAgLy8gMjU1LCBtaW5rZXlcbiAgICAvLyAxMjcsIG1heGtleVxuICB9LFxuXG4gIC8vIGRlZXAgZXF1YWxpdHkgdGVzdDogdXNlIGZvciBsaXRlcmFsIGRvY3VtZW50IGFuZCBhcnJheSBtYXRjaGVzXG4gIF9lcXVhbChhLCBiKSB7XG4gICAgcmV0dXJuIEVKU09OLmVxdWFscyhhLCBiLCB7a2V5T3JkZXJTZW5zaXRpdmU6IHRydWV9KTtcbiAgfSxcblxuICAvLyBtYXBzIGEgdHlwZSBjb2RlIHRvIGEgdmFsdWUgdGhhdCBjYW4gYmUgdXNlZCB0byBzb3J0IHZhbHVlcyBvZiBkaWZmZXJlbnRcbiAgLy8gdHlwZXNcbiAgX3R5cGVvcmRlcih0KSB7XG4gICAgLy8gaHR0cDovL3d3dy5tb25nb2RiLm9yZy9kaXNwbGF5L0RPQ1MvV2hhdCtpcyt0aGUrQ29tcGFyZStPcmRlcitmb3IrQlNPTitUeXBlc1xuICAgIC8vIFhYWCB3aGF0IGlzIHRoZSBjb3JyZWN0IHNvcnQgcG9zaXRpb24gZm9yIEphdmFzY3JpcHQgY29kZT9cbiAgICAvLyAoJzEwMCcgaW4gdGhlIG1hdHJpeCBiZWxvdylcbiAgICAvLyBYWFggbWlua2V5L21heGtleVxuICAgIHJldHVybiBbXG4gICAgICAtMSwgIC8vIChub3QgYSB0eXBlKVxuICAgICAgMSwgICAvLyBudW1iZXJcbiAgICAgIDIsICAgLy8gc3RyaW5nXG4gICAgICAzLCAgIC8vIG9iamVjdFxuICAgICAgNCwgICAvLyBhcnJheVxuICAgICAgNSwgICAvLyBiaW5hcnlcbiAgICAgIC0xLCAgLy8gZGVwcmVjYXRlZFxuICAgICAgNiwgICAvLyBPYmplY3RJRFxuICAgICAgNywgICAvLyBib29sXG4gICAgICA4LCAgIC8vIERhdGVcbiAgICAgIDAsICAgLy8gbnVsbFxuICAgICAgOSwgICAvLyBSZWdFeHBcbiAgICAgIC0xLCAgLy8gZGVwcmVjYXRlZFxuICAgICAgMTAwLCAvLyBKUyBjb2RlXG4gICAgICAyLCAgIC8vIGRlcHJlY2F0ZWQgKHN5bWJvbClcbiAgICAgIDEwMCwgLy8gSlMgY29kZVxuICAgICAgMSwgICAvLyAzMi1iaXQgaW50XG4gICAgICA4LCAgIC8vIE1vbmdvIHRpbWVzdGFtcFxuICAgICAgMSAgICAvLyA2NC1iaXQgaW50XG4gICAgXVt0XTtcbiAgfSxcblxuICAvLyBjb21wYXJlIHR3byB2YWx1ZXMgb2YgdW5rbm93biB0eXBlIGFjY29yZGluZyB0byBCU09OIG9yZGVyaW5nXG4gIC8vIHNlbWFudGljcy4gKGFzIGFuIGV4dGVuc2lvbiwgY29uc2lkZXIgJ3VuZGVmaW5lZCcgdG8gYmUgbGVzcyB0aGFuXG4gIC8vIGFueSBvdGhlciB2YWx1ZS4pIHJldHVybiBuZWdhdGl2ZSBpZiBhIGlzIGxlc3MsIHBvc2l0aXZlIGlmIGIgaXNcbiAgLy8gbGVzcywgb3IgMCBpZiBlcXVhbFxuICBfY21wKGEsIGIpIHtcbiAgICBpZiAoYSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gYiA9PT0gdW5kZWZpbmVkID8gMCA6IC0xO1xuICAgIH1cblxuICAgIGlmIChiID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIGxldCB0YSA9IExvY2FsQ29sbGVjdGlvbi5fZi5fdHlwZShhKTtcbiAgICBsZXQgdGIgPSBMb2NhbENvbGxlY3Rpb24uX2YuX3R5cGUoYik7XG5cbiAgICBjb25zdCBvYSA9IExvY2FsQ29sbGVjdGlvbi5fZi5fdHlwZW9yZGVyKHRhKTtcbiAgICBjb25zdCBvYiA9IExvY2FsQ29sbGVjdGlvbi5fZi5fdHlwZW9yZGVyKHRiKTtcblxuICAgIGlmIChvYSAhPT0gb2IpIHtcbiAgICAgIHJldHVybiBvYSA8IG9iID8gLTEgOiAxO1xuICAgIH1cblxuICAgIC8vIFhYWCBuZWVkIHRvIGltcGxlbWVudCB0aGlzIGlmIHdlIGltcGxlbWVudCBTeW1ib2wgb3IgaW50ZWdlcnMsIG9yXG4gICAgLy8gVGltZXN0YW1wXG4gICAgaWYgKHRhICE9PSB0Yikge1xuICAgICAgdGhyb3cgRXJyb3IoJ01pc3NpbmcgdHlwZSBjb2VyY2lvbiBsb2dpYyBpbiBfY21wJyk7XG4gICAgfVxuXG4gICAgaWYgKHRhID09PSA3KSB7IC8vIE9iamVjdElEXG4gICAgICAvLyBDb252ZXJ0IHRvIHN0cmluZy5cbiAgICAgIHRhID0gdGIgPSAyO1xuICAgICAgYSA9IGEudG9IZXhTdHJpbmcoKTtcbiAgICAgIGIgPSBiLnRvSGV4U3RyaW5nKCk7XG4gICAgfVxuXG4gICAgaWYgKHRhID09PSA5KSB7IC8vIERhdGVcbiAgICAgIC8vIENvbnZlcnQgdG8gbWlsbGlzLlxuICAgICAgdGEgPSB0YiA9IDE7XG4gICAgICBhID0gaXNOYU4oYSkgPyAwIDogYS5nZXRUaW1lKCk7XG4gICAgICBiID0gaXNOYU4oYikgPyAwIDogYi5nZXRUaW1lKCk7XG4gICAgfVxuXG4gICAgaWYgKHRhID09PSAxKSB7IC8vIGRvdWJsZVxuICAgICAgaWYgKGEgaW5zdGFuY2VvZiBEZWNpbWFsKSB7XG4gICAgICAgIHJldHVybiBhLm1pbnVzKGIpLnRvTnVtYmVyKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gYSAtIGI7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRiID09PSAyKSAvLyBzdHJpbmdcbiAgICAgIHJldHVybiBhIDwgYiA/IC0xIDogYSA9PT0gYiA/IDAgOiAxO1xuXG4gICAgaWYgKHRhID09PSAzKSB7IC8vIE9iamVjdFxuICAgICAgLy8gdGhpcyBjb3VsZCBiZSBtdWNoIG1vcmUgZWZmaWNpZW50IGluIHRoZSBleHBlY3RlZCBjYXNlIC4uLlxuICAgICAgY29uc3QgdG9BcnJheSA9IG9iamVjdCA9PiB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IFtdO1xuXG4gICAgICAgIE9iamVjdC5rZXlzKG9iamVjdCkuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgIHJlc3VsdC5wdXNoKGtleSwgb2JqZWN0W2tleV0pO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfTtcblxuICAgICAgcmV0dXJuIExvY2FsQ29sbGVjdGlvbi5fZi5fY21wKHRvQXJyYXkoYSksIHRvQXJyYXkoYikpO1xuICAgIH1cblxuICAgIGlmICh0YSA9PT0gNCkgeyAvLyBBcnJheVxuICAgICAgZm9yIChsZXQgaSA9IDA7IDsgaSsrKSB7XG4gICAgICAgIGlmIChpID09PSBhLmxlbmd0aCkge1xuICAgICAgICAgIHJldHVybiBpID09PSBiLmxlbmd0aCA/IDAgOiAtMTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpID09PSBiLmxlbmd0aCkge1xuICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcyA9IExvY2FsQ29sbGVjdGlvbi5fZi5fY21wKGFbaV0sIGJbaV0pO1xuICAgICAgICBpZiAocyAhPT0gMCkge1xuICAgICAgICAgIHJldHVybiBzO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRhID09PSA1KSB7IC8vIGJpbmFyeVxuICAgICAgLy8gU3VycHJpc2luZ2x5LCBhIHNtYWxsIGJpbmFyeSBibG9iIGlzIGFsd2F5cyBsZXNzIHRoYW4gYSBsYXJnZSBvbmUgaW5cbiAgICAgIC8vIE1vbmdvLlxuICAgICAgaWYgKGEubGVuZ3RoICE9PSBiLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gYS5sZW5ndGggLSBiLmxlbmd0aDtcbiAgICAgIH1cblxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChhW2ldIDwgYltpXSkge1xuICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChhW2ldID4gYltpXSkge1xuICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiAwO1xuICAgIH1cblxuICAgIGlmICh0YSA9PT0gOCkgeyAvLyBib29sZWFuXG4gICAgICBpZiAoYSkge1xuICAgICAgICByZXR1cm4gYiA/IDAgOiAxO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gYiA/IC0xIDogMDtcbiAgICB9XG5cbiAgICBpZiAodGEgPT09IDEwKSAvLyBudWxsXG4gICAgICByZXR1cm4gMDtcblxuICAgIGlmICh0YSA9PT0gMTEpIC8vIHJlZ2V4cFxuICAgICAgdGhyb3cgRXJyb3IoJ1NvcnRpbmcgbm90IHN1cHBvcnRlZCBvbiByZWd1bGFyIGV4cHJlc3Npb24nKTsgLy8gWFhYXG5cbiAgICAvLyAxMzogamF2YXNjcmlwdCBjb2RlXG4gICAgLy8gMTQ6IHN5bWJvbFxuICAgIC8vIDE1OiBqYXZhc2NyaXB0IGNvZGUgd2l0aCBzY29wZVxuICAgIC8vIDE2OiAzMi1iaXQgaW50ZWdlclxuICAgIC8vIDE3OiB0aW1lc3RhbXBcbiAgICAvLyAxODogNjQtYml0IGludGVnZXJcbiAgICAvLyAyNTU6IG1pbmtleVxuICAgIC8vIDEyNzogbWF4a2V5XG4gICAgaWYgKHRhID09PSAxMykgLy8gamF2YXNjcmlwdCBjb2RlXG4gICAgICB0aHJvdyBFcnJvcignU29ydGluZyBub3Qgc3VwcG9ydGVkIG9uIEphdmFzY3JpcHQgY29kZScpOyAvLyBYWFhcblxuICAgIHRocm93IEVycm9yKCdVbmtub3duIHR5cGUgdG8gc29ydCcpO1xuICB9LFxufTtcbiIsImltcG9ydCBMb2NhbENvbGxlY3Rpb25fIGZyb20gJy4vbG9jYWxfY29sbGVjdGlvbi5qcyc7XG5pbXBvcnQgTWF0Y2hlciBmcm9tICcuL21hdGNoZXIuanMnO1xuaW1wb3J0IFNvcnRlciBmcm9tICcuL3NvcnRlci5qcyc7XG5cbkxvY2FsQ29sbGVjdGlvbiA9IExvY2FsQ29sbGVjdGlvbl87XG5NaW5pbW9uZ28gPSB7XG4gICAgTG9jYWxDb2xsZWN0aW9uOiBMb2NhbENvbGxlY3Rpb25fLFxuICAgIE1hdGNoZXIsXG4gICAgU29ydGVyXG59O1xuIiwiLy8gT2JzZXJ2ZUhhbmRsZTogdGhlIHJldHVybiB2YWx1ZSBvZiBhIGxpdmUgcXVlcnkuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBPYnNlcnZlSGFuZGxlIHt9XG4iLCJpbXBvcnQge1xuICBFTEVNRU5UX09QRVJBVE9SUyxcbiAgZXF1YWxpdHlFbGVtZW50TWF0Y2hlcixcbiAgZXhwYW5kQXJyYXlzSW5CcmFuY2hlcyxcbiAgaGFzT3duLFxuICBpc09wZXJhdG9yT2JqZWN0LFxuICBtYWtlTG9va3VwRnVuY3Rpb24sXG4gIHJlZ2V4cEVsZW1lbnRNYXRjaGVyLFxufSBmcm9tICcuL2NvbW1vbi5qcyc7XG5cbi8vIEdpdmUgYSBzb3J0IHNwZWMsIHdoaWNoIGNhbiBiZSBpbiBhbnkgb2YgdGhlc2UgZm9ybXM6XG4vLyAgIHtcImtleTFcIjogMSwgXCJrZXkyXCI6IC0xfVxuLy8gICBbW1wia2V5MVwiLCBcImFzY1wiXSwgW1wia2V5MlwiLCBcImRlc2NcIl1dXG4vLyAgIFtcImtleTFcIiwgW1wia2V5MlwiLCBcImRlc2NcIl1dXG4vL1xuLy8gKC4uIHdpdGggdGhlIGZpcnN0IGZvcm0gYmVpbmcgZGVwZW5kZW50IG9uIHRoZSBrZXkgZW51bWVyYXRpb25cbi8vIGJlaGF2aW9yIG9mIHlvdXIgamF2YXNjcmlwdCBWTSwgd2hpY2ggdXN1YWxseSBkb2VzIHdoYXQgeW91IG1lYW4gaW5cbi8vIHRoaXMgY2FzZSBpZiB0aGUga2V5IG5hbWVzIGRvbid0IGxvb2sgbGlrZSBpbnRlZ2VycyAuLilcbi8vXG4vLyByZXR1cm4gYSBmdW5jdGlvbiB0aGF0IHRha2VzIHR3byBvYmplY3RzLCBhbmQgcmV0dXJucyAtMSBpZiB0aGVcbi8vIGZpcnN0IG9iamVjdCBjb21lcyBmaXJzdCBpbiBvcmRlciwgMSBpZiB0aGUgc2Vjb25kIG9iamVjdCBjb21lc1xuLy8gZmlyc3QsIG9yIDAgaWYgbmVpdGhlciBvYmplY3QgY29tZXMgYmVmb3JlIHRoZSBvdGhlci5cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU29ydGVyIHtcbiAgY29uc3RydWN0b3Ioc3BlYykge1xuICAgIHRoaXMuX3NvcnRTcGVjUGFydHMgPSBbXTtcbiAgICB0aGlzLl9zb3J0RnVuY3Rpb24gPSBudWxsO1xuXG4gICAgY29uc3QgYWRkU3BlY1BhcnQgPSAocGF0aCwgYXNjZW5kaW5nKSA9PiB7XG4gICAgICBpZiAoIXBhdGgpIHtcbiAgICAgICAgdGhyb3cgRXJyb3IoJ3NvcnQga2V5cyBtdXN0IGJlIG5vbi1lbXB0eScpO1xuICAgICAgfVxuXG4gICAgICBpZiAocGF0aC5jaGFyQXQoMCkgPT09ICckJykge1xuICAgICAgICB0aHJvdyBFcnJvcihgdW5zdXBwb3J0ZWQgc29ydCBrZXk6ICR7cGF0aH1gKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5fc29ydFNwZWNQYXJ0cy5wdXNoKHtcbiAgICAgICAgYXNjZW5kaW5nLFxuICAgICAgICBsb29rdXA6IG1ha2VMb29rdXBGdW5jdGlvbihwYXRoLCB7Zm9yU29ydDogdHJ1ZX0pLFxuICAgICAgICBwYXRoXG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgaWYgKHNwZWMgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgc3BlYy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgICBpZiAodHlwZW9mIGVsZW1lbnQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgYWRkU3BlY1BhcnQoZWxlbWVudCwgdHJ1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYWRkU3BlY1BhcnQoZWxlbWVudFswXSwgZWxlbWVudFsxXSAhPT0gJ2Rlc2MnKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2Ygc3BlYyA9PT0gJ29iamVjdCcpIHtcbiAgICAgIE9iamVjdC5rZXlzKHNwZWMpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgYWRkU3BlY1BhcnQoa2V5LCBzcGVjW2tleV0gPj0gMCk7XG4gICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBzcGVjID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLl9zb3J0RnVuY3Rpb24gPSBzcGVjO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBFcnJvcihgQmFkIHNvcnQgc3BlY2lmaWNhdGlvbjogJHtKU09OLnN0cmluZ2lmeShzcGVjKX1gKTtcbiAgICB9XG5cbiAgICAvLyBJZiBhIGZ1bmN0aW9uIGlzIHNwZWNpZmllZCBmb3Igc29ydGluZywgd2Ugc2tpcCB0aGUgcmVzdC5cbiAgICBpZiAodGhpcy5fc29ydEZ1bmN0aW9uKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gVG8gaW1wbGVtZW50IGFmZmVjdGVkQnlNb2RpZmllciwgd2UgcGlnZ3ktYmFjayBvbiB0b3Agb2YgTWF0Y2hlcidzXG4gICAgLy8gYWZmZWN0ZWRCeU1vZGlmaWVyIGNvZGU7IHdlIGNyZWF0ZSBhIHNlbGVjdG9yIHRoYXQgaXMgYWZmZWN0ZWQgYnkgdGhlXG4gICAgLy8gc2FtZSBtb2RpZmllcnMgYXMgdGhpcyBzb3J0IG9yZGVyLiBUaGlzIGlzIG9ubHkgaW1wbGVtZW50ZWQgb24gdGhlXG4gICAgLy8gc2VydmVyLlxuICAgIGlmICh0aGlzLmFmZmVjdGVkQnlNb2RpZmllcikge1xuICAgICAgY29uc3Qgc2VsZWN0b3IgPSB7fTtcblxuICAgICAgdGhpcy5fc29ydFNwZWNQYXJ0cy5mb3JFYWNoKHNwZWMgPT4ge1xuICAgICAgICBzZWxlY3RvcltzcGVjLnBhdGhdID0gMTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLl9zZWxlY3RvckZvckFmZmVjdGVkQnlNb2RpZmllciA9IG5ldyBNaW5pbW9uZ28uTWF0Y2hlcihzZWxlY3Rvcik7XG4gICAgfVxuXG4gICAgdGhpcy5fa2V5Q29tcGFyYXRvciA9IGNvbXBvc2VDb21wYXJhdG9ycyhcbiAgICAgIHRoaXMuX3NvcnRTcGVjUGFydHMubWFwKChzcGVjLCBpKSA9PiB0aGlzLl9rZXlGaWVsZENvbXBhcmF0b3IoaSkpXG4gICAgKTtcbiAgfVxuXG4gIGdldENvbXBhcmF0b3Iob3B0aW9ucykge1xuICAgIC8vIElmIHNvcnQgaXMgc3BlY2lmaWVkIG9yIGhhdmUgbm8gZGlzdGFuY2VzLCBqdXN0IHVzZSB0aGUgY29tcGFyYXRvciBmcm9tXG4gICAgLy8gdGhlIHNvdXJjZSBzcGVjaWZpY2F0aW9uICh3aGljaCBkZWZhdWx0cyB0byBcImV2ZXJ5dGhpbmcgaXMgZXF1YWxcIi5cbiAgICAvLyBpc3N1ZSAjMzU5OVxuICAgIC8vIGh0dHBzOi8vZG9jcy5tb25nb2RiLmNvbS9tYW51YWwvcmVmZXJlbmNlL29wZXJhdG9yL3F1ZXJ5L25lYXIvI3NvcnQtb3BlcmF0aW9uXG4gICAgLy8gc29ydCBlZmZlY3RpdmVseSBvdmVycmlkZXMgJG5lYXJcbiAgICBpZiAodGhpcy5fc29ydFNwZWNQYXJ0cy5sZW5ndGggfHwgIW9wdGlvbnMgfHwgIW9wdGlvbnMuZGlzdGFuY2VzKSB7XG4gICAgICByZXR1cm4gdGhpcy5fZ2V0QmFzZUNvbXBhcmF0b3IoKTtcbiAgICB9XG5cbiAgICBjb25zdCBkaXN0YW5jZXMgPSBvcHRpb25zLmRpc3RhbmNlcztcblxuICAgIC8vIFJldHVybiBhIGNvbXBhcmF0b3Igd2hpY2ggY29tcGFyZXMgdXNpbmcgJG5lYXIgZGlzdGFuY2VzLlxuICAgIHJldHVybiAoYSwgYikgPT4ge1xuICAgICAgaWYgKCFkaXN0YW5jZXMuaGFzKGEuX2lkKSkge1xuICAgICAgICB0aHJvdyBFcnJvcihgTWlzc2luZyBkaXN0YW5jZSBmb3IgJHthLl9pZH1gKTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFkaXN0YW5jZXMuaGFzKGIuX2lkKSkge1xuICAgICAgICB0aHJvdyBFcnJvcihgTWlzc2luZyBkaXN0YW5jZSBmb3IgJHtiLl9pZH1gKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGRpc3RhbmNlcy5nZXQoYS5faWQpIC0gZGlzdGFuY2VzLmdldChiLl9pZCk7XG4gICAgfTtcbiAgfVxuXG4gIC8vIFRha2VzIGluIHR3byBrZXlzOiBhcnJheXMgd2hvc2UgbGVuZ3RocyBtYXRjaCB0aGUgbnVtYmVyIG9mIHNwZWNcbiAgLy8gcGFydHMuIFJldHVybnMgbmVnYXRpdmUsIDAsIG9yIHBvc2l0aXZlIGJhc2VkIG9uIHVzaW5nIHRoZSBzb3J0IHNwZWMgdG9cbiAgLy8gY29tcGFyZSBmaWVsZHMuXG4gIF9jb21wYXJlS2V5cyhrZXkxLCBrZXkyKSB7XG4gICAgaWYgKGtleTEubGVuZ3RoICE9PSB0aGlzLl9zb3J0U3BlY1BhcnRzLmxlbmd0aCB8fFxuICAgICAgICBrZXkyLmxlbmd0aCAhPT0gdGhpcy5fc29ydFNwZWNQYXJ0cy5sZW5ndGgpIHtcbiAgICAgIHRocm93IEVycm9yKCdLZXkgaGFzIHdyb25nIGxlbmd0aCcpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9rZXlDb21wYXJhdG9yKGtleTEsIGtleTIpO1xuICB9XG5cbiAgLy8gSXRlcmF0ZXMgb3ZlciBlYWNoIHBvc3NpYmxlIFwia2V5XCIgZnJvbSBkb2MgKGllLCBvdmVyIGVhY2ggYnJhbmNoKSwgY2FsbGluZ1xuICAvLyAnY2InIHdpdGggdGhlIGtleS5cbiAgX2dlbmVyYXRlS2V5c0Zyb21Eb2MoZG9jLCBjYikge1xuICAgIGlmICh0aGlzLl9zb3J0U3BlY1BhcnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdjYW5cXCd0IGdlbmVyYXRlIGtleXMgd2l0aG91dCBhIHNwZWMnKTtcbiAgICB9XG5cbiAgICBjb25zdCBwYXRoRnJvbUluZGljZXMgPSBpbmRpY2VzID0+IGAke2luZGljZXMuam9pbignLCcpfSxgO1xuXG4gICAgbGV0IGtub3duUGF0aHMgPSBudWxsO1xuXG4gICAgLy8gbWFwcyBpbmRleCAtPiAoeycnIC0+IHZhbHVlfSBvciB7cGF0aCAtPiB2YWx1ZX0pXG4gICAgY29uc3QgdmFsdWVzQnlJbmRleEFuZFBhdGggPSB0aGlzLl9zb3J0U3BlY1BhcnRzLm1hcChzcGVjID0+IHtcbiAgICAgIC8vIEV4cGFuZCBhbnkgbGVhZiBhcnJheXMgdGhhdCB3ZSBmaW5kLCBhbmQgaWdub3JlIHRob3NlIGFycmF5c1xuICAgICAgLy8gdGhlbXNlbHZlcy4gIChXZSBuZXZlciBzb3J0IGJhc2VkIG9uIGFuIGFycmF5IGl0c2VsZi4pXG4gICAgICBsZXQgYnJhbmNoZXMgPSBleHBhbmRBcnJheXNJbkJyYW5jaGVzKHNwZWMubG9va3VwKGRvYyksIHRydWUpO1xuXG4gICAgICAvLyBJZiB0aGVyZSBhcmUgbm8gdmFsdWVzIGZvciBhIGtleSAoZWcsIGtleSBnb2VzIHRvIGFuIGVtcHR5IGFycmF5KSxcbiAgICAgIC8vIHByZXRlbmQgd2UgZm91bmQgb25lIHVuZGVmaW5lZCB2YWx1ZS5cbiAgICAgIGlmICghYnJhbmNoZXMubGVuZ3RoKSB7XG4gICAgICAgIGJyYW5jaGVzID0gW3sgdmFsdWU6IHZvaWQgMCB9XTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZWxlbWVudCA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgICBsZXQgdXNlZFBhdGhzID0gZmFsc2U7XG5cbiAgICAgIGJyYW5jaGVzLmZvckVhY2goYnJhbmNoID0+IHtcbiAgICAgICAgaWYgKCFicmFuY2guYXJyYXlJbmRpY2VzKSB7XG4gICAgICAgICAgLy8gSWYgdGhlcmUgYXJlIG5vIGFycmF5IGluZGljZXMgZm9yIGEgYnJhbmNoLCB0aGVuIGl0IG11c3QgYmUgdGhlXG4gICAgICAgICAgLy8gb25seSBicmFuY2gsIGJlY2F1c2UgdGhlIG9ubHkgdGhpbmcgdGhhdCBwcm9kdWNlcyBtdWx0aXBsZSBicmFuY2hlc1xuICAgICAgICAgIC8vIGlzIHRoZSB1c2Ugb2YgYXJyYXlzLlxuICAgICAgICAgIGlmIChicmFuY2hlcy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICB0aHJvdyBFcnJvcignbXVsdGlwbGUgYnJhbmNoZXMgYnV0IG5vIGFycmF5IHVzZWQ/Jyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZWxlbWVudFsnJ10gPSBicmFuY2gudmFsdWU7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdXNlZFBhdGhzID0gdHJ1ZTtcblxuICAgICAgICBjb25zdCBwYXRoID0gcGF0aEZyb21JbmRpY2VzKGJyYW5jaC5hcnJheUluZGljZXMpO1xuXG4gICAgICAgIGlmIChoYXNPd24uY2FsbChlbGVtZW50LCBwYXRoKSkge1xuICAgICAgICAgIHRocm93IEVycm9yKGBkdXBsaWNhdGUgcGF0aDogJHtwYXRofWApO1xuICAgICAgICB9XG5cbiAgICAgICAgZWxlbWVudFtwYXRoXSA9IGJyYW5jaC52YWx1ZTtcblxuICAgICAgICAvLyBJZiB0d28gc29ydCBmaWVsZHMgYm90aCBnbyBpbnRvIGFycmF5cywgdGhleSBoYXZlIHRvIGdvIGludG8gdGhlXG4gICAgICAgIC8vIGV4YWN0IHNhbWUgYXJyYXlzIGFuZCB3ZSBoYXZlIHRvIGZpbmQgdGhlIHNhbWUgcGF0aHMuICBUaGlzIGlzXG4gICAgICAgIC8vIHJvdWdobHkgdGhlIHNhbWUgY29uZGl0aW9uIHRoYXQgbWFrZXMgTW9uZ29EQiB0aHJvdyB0aGlzIHN0cmFuZ2VcbiAgICAgICAgLy8gZXJyb3IgbWVzc2FnZS4gIGVnLCB0aGUgbWFpbiB0aGluZyBpcyB0aGF0IGlmIHNvcnQgc3BlYyBpcyB7YTogMSxcbiAgICAgICAgLy8gYjoxfSB0aGVuIGEgYW5kIGIgY2Fubm90IGJvdGggYmUgYXJyYXlzLlxuICAgICAgICAvL1xuICAgICAgICAvLyAoSW4gTW9uZ29EQiBpdCBzZWVtcyB0byBiZSBPSyB0byBoYXZlIHthOiAxLCAnYS54LnknOiAxfSB3aGVyZSAnYSdcbiAgICAgICAgLy8gYW5kICdhLngueScgYXJlIGJvdGggYXJyYXlzLCBidXQgd2UgZG9uJ3QgYWxsb3cgdGhpcyBmb3Igbm93LlxuICAgICAgICAvLyAjTmVzdGVkQXJyYXlTb3J0XG4gICAgICAgIC8vIFhYWCBhY2hpZXZlIGZ1bGwgY29tcGF0aWJpbGl0eSBoZXJlXG4gICAgICAgIGlmIChrbm93blBhdGhzICYmICFoYXNPd24uY2FsbChrbm93blBhdGhzLCBwYXRoKSkge1xuICAgICAgICAgIHRocm93IEVycm9yKCdjYW5ub3QgaW5kZXggcGFyYWxsZWwgYXJyYXlzJyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBpZiAoa25vd25QYXRocykge1xuICAgICAgICAvLyBTaW1pbGFybHkgdG8gYWJvdmUsIHBhdGhzIG11c3QgbWF0Y2ggZXZlcnl3aGVyZSwgdW5sZXNzIHRoaXMgaXMgYVxuICAgICAgICAvLyBub24tYXJyYXkgZmllbGQuXG4gICAgICAgIGlmICghaGFzT3duLmNhbGwoZWxlbWVudCwgJycpICYmXG4gICAgICAgICAgICBPYmplY3Qua2V5cyhrbm93blBhdGhzKS5sZW5ndGggIT09IE9iamVjdC5rZXlzKGVsZW1lbnQpLmxlbmd0aCkge1xuICAgICAgICAgIHRocm93IEVycm9yKCdjYW5ub3QgaW5kZXggcGFyYWxsZWwgYXJyYXlzIScpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHVzZWRQYXRocykge1xuICAgICAgICBrbm93blBhdGhzID0ge307XG5cbiAgICAgICAgT2JqZWN0LmtleXMoZWxlbWVudCkuZm9yRWFjaChwYXRoID0+IHtcbiAgICAgICAgICBrbm93blBhdGhzW3BhdGhdID0gdHJ1ZTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBlbGVtZW50O1xuICAgIH0pO1xuXG4gICAgaWYgKCFrbm93blBhdGhzKSB7XG4gICAgICAvLyBFYXN5IGNhc2U6IG5vIHVzZSBvZiBhcnJheXMuXG4gICAgICBjb25zdCBzb2xlS2V5ID0gdmFsdWVzQnlJbmRleEFuZFBhdGgubWFwKHZhbHVlcyA9PiB7XG4gICAgICAgIGlmICghaGFzT3duLmNhbGwodmFsdWVzLCAnJykpIHtcbiAgICAgICAgICB0aHJvdyBFcnJvcignbm8gdmFsdWUgaW4gc29sZSBrZXkgY2FzZT8nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB2YWx1ZXNbJyddO1xuICAgICAgfSk7XG5cbiAgICAgIGNiKHNvbGVLZXkpO1xuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgT2JqZWN0LmtleXMoa25vd25QYXRocykuZm9yRWFjaChwYXRoID0+IHtcbiAgICAgIGNvbnN0IGtleSA9IHZhbHVlc0J5SW5kZXhBbmRQYXRoLm1hcCh2YWx1ZXMgPT4ge1xuICAgICAgICBpZiAoaGFzT3duLmNhbGwodmFsdWVzLCAnJykpIHtcbiAgICAgICAgICByZXR1cm4gdmFsdWVzWycnXTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghaGFzT3duLmNhbGwodmFsdWVzLCBwYXRoKSkge1xuICAgICAgICAgIHRocm93IEVycm9yKCdtaXNzaW5nIHBhdGg/Jyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdmFsdWVzW3BhdGhdO1xuICAgICAgfSk7XG5cbiAgICAgIGNiKGtleSk7XG4gICAgfSk7XG4gIH1cblxuICAvLyBSZXR1cm5zIGEgY29tcGFyYXRvciB0aGF0IHJlcHJlc2VudHMgdGhlIHNvcnQgc3BlY2lmaWNhdGlvbiAoYnV0IG5vdFxuICAvLyBpbmNsdWRpbmcgYSBwb3NzaWJsZSBnZW9xdWVyeSBkaXN0YW5jZSB0aWUtYnJlYWtlcikuXG4gIF9nZXRCYXNlQ29tcGFyYXRvcigpIHtcbiAgICBpZiAodGhpcy5fc29ydEZ1bmN0aW9uKSB7XG4gICAgICByZXR1cm4gdGhpcy5fc29ydEZ1bmN0aW9uO1xuICAgIH1cblxuICAgIC8vIElmIHdlJ3JlIG9ubHkgc29ydGluZyBvbiBnZW9xdWVyeSBkaXN0YW5jZSBhbmQgbm8gc3BlY3MsIGp1c3Qgc2F5XG4gICAgLy8gZXZlcnl0aGluZyBpcyBlcXVhbC5cbiAgICBpZiAoIXRoaXMuX3NvcnRTcGVjUGFydHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gKGRvYzEsIGRvYzIpID0+IDA7XG4gICAgfVxuXG4gICAgcmV0dXJuIChkb2MxLCBkb2MyKSA9PiB7XG4gICAgICBjb25zdCBrZXkxID0gdGhpcy5fZ2V0TWluS2V5RnJvbURvYyhkb2MxKTtcbiAgICAgIGNvbnN0IGtleTIgPSB0aGlzLl9nZXRNaW5LZXlGcm9tRG9jKGRvYzIpO1xuICAgICAgcmV0dXJuIHRoaXMuX2NvbXBhcmVLZXlzKGtleTEsIGtleTIpO1xuICAgIH07XG4gIH1cblxuICAvLyBGaW5kcyB0aGUgbWluaW11bSBrZXkgZnJvbSB0aGUgZG9jLCBhY2NvcmRpbmcgdG8gdGhlIHNvcnQgc3BlY3MuICAoV2Ugc2F5XG4gIC8vIFwibWluaW11bVwiIGhlcmUgYnV0IHRoaXMgaXMgd2l0aCByZXNwZWN0IHRvIHRoZSBzb3J0IHNwZWMsIHNvIFwiZGVzY2VuZGluZ1wiXG4gIC8vIHNvcnQgZmllbGRzIG1lYW4gd2UncmUgZmluZGluZyB0aGUgbWF4IGZvciB0aGF0IGZpZWxkLilcbiAgLy9cbiAgLy8gTm90ZSB0aGF0IHRoaXMgaXMgTk9UIFwiZmluZCB0aGUgbWluaW11bSB2YWx1ZSBvZiB0aGUgZmlyc3QgZmllbGQsIHRoZVxuICAvLyBtaW5pbXVtIHZhbHVlIG9mIHRoZSBzZWNvbmQgZmllbGQsIGV0Y1wiLi4uIGl0J3MgXCJjaG9vc2UgdGhlXG4gIC8vIGxleGljb2dyYXBoaWNhbGx5IG1pbmltdW0gdmFsdWUgb2YgdGhlIGtleSB2ZWN0b3IsIGFsbG93aW5nIG9ubHkga2V5cyB3aGljaFxuICAvLyB5b3UgY2FuIGZpbmQgYWxvbmcgdGhlIHNhbWUgcGF0aHNcIi4gIGllLCBmb3IgYSBkb2Mge2E6IFt7eDogMCwgeTogNX0sIHt4OlxuICAvLyAxLCB5OiAzfV19IHdpdGggc29ydCBzcGVjIHsnYS54JzogMSwgJ2EueSc6IDF9LCB0aGUgb25seSBrZXlzIGFyZSBbMCw1XSBhbmRcbiAgLy8gWzEsM10sIGFuZCB0aGUgbWluaW11bSBrZXkgaXMgWzAsNV07IG5vdGFibHksIFswLDNdIGlzIE5PVCBhIGtleS5cbiAgX2dldE1pbktleUZyb21Eb2MoZG9jKSB7XG4gICAgbGV0IG1pbktleSA9IG51bGw7XG5cbiAgICB0aGlzLl9nZW5lcmF0ZUtleXNGcm9tRG9jKGRvYywga2V5ID0+IHtcbiAgICAgIGlmIChtaW5LZXkgPT09IG51bGwpIHtcbiAgICAgICAgbWluS2V5ID0ga2V5O1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLl9jb21wYXJlS2V5cyhrZXksIG1pbktleSkgPCAwKSB7XG4gICAgICAgIG1pbktleSA9IGtleTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBtaW5LZXk7XG4gIH1cblxuICBfZ2V0UGF0aHMoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3NvcnRTcGVjUGFydHMubWFwKHBhcnQgPT4gcGFydC5wYXRoKTtcbiAgfVxuXG4gIC8vIEdpdmVuIGFuIGluZGV4ICdpJywgcmV0dXJucyBhIGNvbXBhcmF0b3IgdGhhdCBjb21wYXJlcyB0d28ga2V5IGFycmF5cyBiYXNlZFxuICAvLyBvbiBmaWVsZCAnaScuXG4gIF9rZXlGaWVsZENvbXBhcmF0b3IoaSkge1xuICAgIGNvbnN0IGludmVydCA9ICF0aGlzLl9zb3J0U3BlY1BhcnRzW2ldLmFzY2VuZGluZztcblxuICAgIHJldHVybiAoa2V5MSwga2V5MikgPT4ge1xuICAgICAgY29uc3QgY29tcGFyZSA9IExvY2FsQ29sbGVjdGlvbi5fZi5fY21wKGtleTFbaV0sIGtleTJbaV0pO1xuICAgICAgcmV0dXJuIGludmVydCA/IC1jb21wYXJlIDogY29tcGFyZTtcbiAgICB9O1xuICB9XG59XG5cbi8vIEdpdmVuIGFuIGFycmF5IG9mIGNvbXBhcmF0b3JzXG4vLyAoZnVuY3Rpb25zIChhLGIpLT4obmVnYXRpdmUgb3IgcG9zaXRpdmUgb3IgemVybykpLCByZXR1cm5zIGEgc2luZ2xlXG4vLyBjb21wYXJhdG9yIHdoaWNoIHVzZXMgZWFjaCBjb21wYXJhdG9yIGluIG9yZGVyIGFuZCByZXR1cm5zIHRoZSBmaXJzdFxuLy8gbm9uLXplcm8gdmFsdWUuXG5mdW5jdGlvbiBjb21wb3NlQ29tcGFyYXRvcnMoY29tcGFyYXRvckFycmF5KSB7XG4gIHJldHVybiAoYSwgYikgPT4ge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY29tcGFyYXRvckFycmF5Lmxlbmd0aDsgKytpKSB7XG4gICAgICBjb25zdCBjb21wYXJlID0gY29tcGFyYXRvckFycmF5W2ldKGEsIGIpO1xuICAgICAgaWYgKGNvbXBhcmUgIT09IDApIHtcbiAgICAgICAgcmV0dXJuIGNvbXBhcmU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIDA7XG4gIH07XG59XG4iXX0=
