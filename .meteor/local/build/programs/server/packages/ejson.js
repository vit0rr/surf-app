(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var Base64 = Package.base64.Base64;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var EJSON;

var require = meteorInstall({"node_modules":{"meteor":{"ejson":{"ejson.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                             //
// packages/ejson/ejson.js                                                                                     //
//                                                                                                             //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                               //
module.export({
  EJSON: () => EJSON
});
let isFunction, isObject, keysOf, lengthOf, hasOwn, convertMapToObject, isArguments, isInfOrNaN, handleError;
module.link("./utils", {
  isFunction(v) {
    isFunction = v;
  },
  isObject(v) {
    isObject = v;
  },
  keysOf(v) {
    keysOf = v;
  },
  lengthOf(v) {
    lengthOf = v;
  },
  hasOwn(v) {
    hasOwn = v;
  },
  convertMapToObject(v) {
    convertMapToObject = v;
  },
  isArguments(v) {
    isArguments = v;
  },
  isInfOrNaN(v) {
    isInfOrNaN = v;
  },
  handleError(v) {
    handleError = v;
  }
}, 0);
/**
 * @namespace
 * @summary Namespace for EJSON functions
 */
const EJSON = {};

// Custom type interface definition
/**
 * @class CustomType
 * @instanceName customType
 * @memberOf EJSON
 * @summary The interface that a class must satisfy to be able to become an
 * EJSON custom type via EJSON.addType.
 */

/**
 * @function typeName
 * @memberOf EJSON.CustomType
 * @summary Return the tag used to identify this type.  This must match the
 *          tag used to register this type with
 *          [`EJSON.addType`](#ejson_add_type).
 * @locus Anywhere
 * @instance
 */

/**
 * @function toJSONValue
 * @memberOf EJSON.CustomType
 * @summary Serialize this instance into a JSON-compatible value.
 * @locus Anywhere
 * @instance
 */

/**
 * @function clone
 * @memberOf EJSON.CustomType
 * @summary Return a value `r` such that `this.equals(r)` is true, and
 *          modifications to `r` do not affect `this` and vice versa.
 * @locus Anywhere
 * @instance
 */

/**
 * @function equals
 * @memberOf EJSON.CustomType
 * @summary Return `true` if `other` has a value equal to `this`; `false`
 *          otherwise.
 * @locus Anywhere
 * @param {Object} other Another object to compare this to.
 * @instance
 */

const customTypes = new Map();

// Add a custom type, using a method of your choice to get to and
// from a basic JSON-able representation.  The factory argument
// is a function of JSON-able --> your object
// The type you add must have:
// - A toJSONValue() method, so that Meteor can serialize it
// - a typeName() method, to show how to look it up in our type table.
// It is okay if these methods are monkey-patched on.
// EJSON.clone will use toJSONValue and the given factory to produce
// a clone, but you may specify a method clone() that will be
// used instead.
// Similarly, EJSON.equals will use toJSONValue to make comparisons,
// but you may provide a method equals() instead.
/**
 * @summary Add a custom datatype to EJSON.
 * @locus Anywhere
 * @param {String} name A tag for your custom type; must be unique among
 *                      custom data types defined in your project, and must
 *                      match the result of your type's `typeName` method.
 * @param {Function} factory A function that deserializes a JSON-compatible
 *                           value into an instance of your type.  This should
 *                           match the serialization performed by your
 *                           type's `toJSONValue` method.
 */
EJSON.addType = (name, factory) => {
  if (customTypes.has(name)) {
    throw new Error("Type ".concat(name, " already present"));
  }
  customTypes.set(name, factory);
};
const builtinConverters = [{
  // Date
  matchJSONValue(obj) {
    return hasOwn(obj, '$date') && lengthOf(obj) === 1;
  },
  matchObject(obj) {
    return obj instanceof Date;
  },
  toJSONValue(obj) {
    return {
      $date: obj.getTime()
    };
  },
  fromJSONValue(obj) {
    return new Date(obj.$date);
  }
}, {
  // RegExp
  matchJSONValue(obj) {
    return hasOwn(obj, '$regexp') && hasOwn(obj, '$flags') && lengthOf(obj) === 2;
  },
  matchObject(obj) {
    return obj instanceof RegExp;
  },
  toJSONValue(regexp) {
    return {
      $regexp: regexp.source,
      $flags: regexp.flags
    };
  },
  fromJSONValue(obj) {
    // Replaces duplicate / invalid flags.
    return new RegExp(obj.$regexp, obj.$flags
    // Cut off flags at 50 chars to avoid abusing RegExp for DOS.
    .slice(0, 50).replace(/[^gimuy]/g, '').replace(/(.)(?=.*\1)/g, ''));
  }
}, {
  // NaN, Inf, -Inf. (These are the only objects with typeof !== 'object'
  // which we match.)
  matchJSONValue(obj) {
    return hasOwn(obj, '$InfNaN') && lengthOf(obj) === 1;
  },
  matchObject: isInfOrNaN,
  toJSONValue(obj) {
    let sign;
    if (Number.isNaN(obj)) {
      sign = 0;
    } else if (obj === Infinity) {
      sign = 1;
    } else {
      sign = -1;
    }
    return {
      $InfNaN: sign
    };
  },
  fromJSONValue(obj) {
    return obj.$InfNaN / 0;
  }
}, {
  // Binary
  matchJSONValue(obj) {
    return hasOwn(obj, '$binary') && lengthOf(obj) === 1;
  },
  matchObject(obj) {
    return typeof Uint8Array !== 'undefined' && obj instanceof Uint8Array || obj && hasOwn(obj, '$Uint8ArrayPolyfill');
  },
  toJSONValue(obj) {
    return {
      $binary: Base64.encode(obj)
    };
  },
  fromJSONValue(obj) {
    return Base64.decode(obj.$binary);
  }
}, {
  // Escaping one level
  matchJSONValue(obj) {
    return hasOwn(obj, '$escape') && lengthOf(obj) === 1;
  },
  matchObject(obj) {
    let match = false;
    if (obj) {
      const keyCount = lengthOf(obj);
      if (keyCount === 1 || keyCount === 2) {
        match = builtinConverters.some(converter => converter.matchJSONValue(obj));
      }
    }
    return match;
  },
  toJSONValue(obj) {
    const newObj = {};
    keysOf(obj).forEach(key => {
      newObj[key] = EJSON.toJSONValue(obj[key]);
    });
    return {
      $escape: newObj
    };
  },
  fromJSONValue(obj) {
    const newObj = {};
    keysOf(obj.$escape).forEach(key => {
      newObj[key] = EJSON.fromJSONValue(obj.$escape[key]);
    });
    return newObj;
  }
}, {
  // Custom
  matchJSONValue(obj) {
    return hasOwn(obj, '$type') && hasOwn(obj, '$value') && lengthOf(obj) === 2;
  },
  matchObject(obj) {
    return EJSON._isCustomType(obj);
  },
  toJSONValue(obj) {
    const jsonValue = Meteor._noYieldsAllowed(() => obj.toJSONValue());
    return {
      $type: obj.typeName(),
      $value: jsonValue
    };
  },
  fromJSONValue(obj) {
    const typeName = obj.$type;
    if (!customTypes.has(typeName)) {
      throw new Error("Custom EJSON type ".concat(typeName, " is not defined"));
    }
    const converter = customTypes.get(typeName);
    return Meteor._noYieldsAllowed(() => converter(obj.$value));
  }
}];
EJSON._isCustomType = obj => obj && isFunction(obj.toJSONValue) && isFunction(obj.typeName) && customTypes.has(obj.typeName());
EJSON._getTypes = function () {
  let isOriginal = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
  return isOriginal ? customTypes : convertMapToObject(customTypes);
};
EJSON._getConverters = () => builtinConverters;

// Either return the JSON-compatible version of the argument, or undefined (if
// the item isn't itself replaceable, but maybe some fields in it are)
const toJSONValueHelper = item => {
  for (let i = 0; i < builtinConverters.length; i++) {
    const converter = builtinConverters[i];
    if (converter.matchObject(item)) {
      return converter.toJSONValue(item);
    }
  }
  return undefined;
};

// for both arrays and objects, in-place modification.
const adjustTypesToJSONValue = obj => {
  // Is it an atom that we need to adjust?
  if (obj === null) {
    return null;
  }
  const maybeChanged = toJSONValueHelper(obj);
  if (maybeChanged !== undefined) {
    return maybeChanged;
  }

  // Other atoms are unchanged.
  if (!isObject(obj)) {
    return obj;
  }

  // Iterate over array or object structure.
  keysOf(obj).forEach(key => {
    const value = obj[key];
    if (!isObject(value) && value !== undefined && !isInfOrNaN(value)) {
      return; // continue
    }
    const changed = toJSONValueHelper(value);
    if (changed) {
      obj[key] = changed;
      return; // on to the next key
    }
    // if we get here, value is an object but not adjustable
    // at this level.  recurse.
    adjustTypesToJSONValue(value);
  });
  return obj;
};
EJSON._adjustTypesToJSONValue = adjustTypesToJSONValue;

/**
 * @summary Serialize an EJSON-compatible value into its plain JSON
 *          representation.
 * @locus Anywhere
 * @param {EJSON} val A value to serialize to plain JSON.
 */
EJSON.toJSONValue = item => {
  const changed = toJSONValueHelper(item);
  if (changed !== undefined) {
    return changed;
  }
  let newItem = item;
  if (isObject(item)) {
    newItem = EJSON.clone(item);
    adjustTypesToJSONValue(newItem);
  }
  return newItem;
};

// Either return the argument changed to have the non-json
// rep of itself (the Object version) or the argument itself.
// DOES NOT RECURSE.  For actually getting the fully-changed value, use
// EJSON.fromJSONValue
const fromJSONValueHelper = value => {
  if (isObject(value) && value !== null) {
    const keys = keysOf(value);
    if (keys.length <= 2 && keys.every(k => typeof k === 'string' && k.substr(0, 1) === '$')) {
      for (let i = 0; i < builtinConverters.length; i++) {
        const converter = builtinConverters[i];
        if (converter.matchJSONValue(value)) {
          return converter.fromJSONValue(value);
        }
      }
    }
  }
  return value;
};

// for both arrays and objects. Tries its best to just
// use the object you hand it, but may return something
// different if the object you hand it itself needs changing.
const adjustTypesFromJSONValue = obj => {
  if (obj === null) {
    return null;
  }
  const maybeChanged = fromJSONValueHelper(obj);
  if (maybeChanged !== obj) {
    return maybeChanged;
  }

  // Other atoms are unchanged.
  if (!isObject(obj)) {
    return obj;
  }
  keysOf(obj).forEach(key => {
    const value = obj[key];
    if (isObject(value)) {
      const changed = fromJSONValueHelper(value);
      if (value !== changed) {
        obj[key] = changed;
        return;
      }
      // if we get here, value is an object but not adjustable
      // at this level.  recurse.
      adjustTypesFromJSONValue(value);
    }
  });
  return obj;
};
EJSON._adjustTypesFromJSONValue = adjustTypesFromJSONValue;

/**
 * @summary Deserialize an EJSON value from its plain JSON representation.
 * @locus Anywhere
 * @param {JSONCompatible} val A value to deserialize into EJSON.
 */
EJSON.fromJSONValue = item => {
  let changed = fromJSONValueHelper(item);
  if (changed === item && isObject(item)) {
    changed = EJSON.clone(item);
    adjustTypesFromJSONValue(changed);
  }
  return changed;
};

/**
 * @summary Serialize a value to a string. For EJSON values, the serialization
 *          fully represents the value. For non-EJSON values, serializes the
 *          same way as `JSON.stringify`.
 * @locus Anywhere
 * @param {EJSON} val A value to stringify.
 * @param {Object} [options]
 * @param {Boolean | Integer | String} options.indent Indents objects and
 * arrays for easy readability.  When `true`, indents by 2 spaces; when an
 * integer, indents by that number of spaces; and when a string, uses the
 * string as the indentation pattern.
 * @param {Boolean} options.canonical When `true`, stringifies keys in an
 *                                    object in sorted order.
 */
EJSON.stringify = handleError((item, options) => {
  let serialized;
  const json = EJSON.toJSONValue(item);
  if (options && (options.canonical || options.indent)) {
    let canonicalStringify;
    module.link("./stringify", {
      default(v) {
        canonicalStringify = v;
      }
    }, 1);
    serialized = canonicalStringify(json, options);
  } else {
    serialized = JSON.stringify(json);
  }
  return serialized;
});

/**
 * @summary Parse a string into an EJSON value. Throws an error if the string
 *          is not valid EJSON.
 * @locus Anywhere
 * @param {String} str A string to parse into an EJSON value.
 */
EJSON.parse = item => {
  if (typeof item !== 'string') {
    throw new Error('EJSON.parse argument should be a string');
  }
  return EJSON.fromJSONValue(JSON.parse(item));
};

/**
 * @summary Returns true if `x` is a buffer of binary data, as returned from
 *          [`EJSON.newBinary`](#ejson_new_binary).
 * @param {Object} x The variable to check.
 * @locus Anywhere
 */
EJSON.isBinary = obj => {
  return !!(typeof Uint8Array !== 'undefined' && obj instanceof Uint8Array || obj && obj.$Uint8ArrayPolyfill);
};

/**
 * @summary Return true if `a` and `b` are equal to each other.  Return false
 *          otherwise.  Uses the `equals` method on `a` if present, otherwise
 *          performs a deep comparison.
 * @locus Anywhere
 * @param {EJSON} a
 * @param {EJSON} b
 * @param {Object} [options]
 * @param {Boolean} options.keyOrderSensitive Compare in key sensitive order,
 * if supported by the JavaScript implementation.  For example, `{a: 1, b: 2}`
 * is equal to `{b: 2, a: 1}` only when `keyOrderSensitive` is `false`.  The
 * default is `false`.
 */
EJSON.equals = (a, b, options) => {
  let i;
  const keyOrderSensitive = !!(options && options.keyOrderSensitive);
  if (a === b) {
    return true;
  }

  // This differs from the IEEE spec for NaN equality, b/c we don't want
  // anything ever with a NaN to be poisoned from becoming equal to anything.
  if (Number.isNaN(a) && Number.isNaN(b)) {
    return true;
  }

  // if either one is falsy, they'd have to be === to be equal
  if (!a || !b) {
    return false;
  }
  if (!(isObject(a) && isObject(b))) {
    return false;
  }
  if (a instanceof Date && b instanceof Date) {
    return a.valueOf() === b.valueOf();
  }
  if (EJSON.isBinary(a) && EJSON.isBinary(b)) {
    if (a.length !== b.length) {
      return false;
    }
    for (i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }
    return true;
  }
  if (isFunction(a.equals)) {
    return a.equals(b, options);
  }
  if (isFunction(b.equals)) {
    return b.equals(a, options);
  }

  // Array.isArray works across iframes while instanceof won't
  const aIsArray = Array.isArray(a);
  const bIsArray = Array.isArray(b);

  // if not both or none are array they are not equal
  if (aIsArray !== bIsArray) {
    return false;
  }
  if (aIsArray && bIsArray) {
    if (a.length !== b.length) {
      return false;
    }
    for (i = 0; i < a.length; i++) {
      if (!EJSON.equals(a[i], b[i], options)) {
        return false;
      }
    }
    return true;
  }

  // fallback for custom types that don't implement their own equals
  switch (EJSON._isCustomType(a) + EJSON._isCustomType(b)) {
    case 1:
      return false;
    case 2:
      return EJSON.equals(EJSON.toJSONValue(a), EJSON.toJSONValue(b));
    default: // Do nothing
  }

  // fall back to structural equality of objects
  let ret;
  const aKeys = keysOf(a);
  const bKeys = keysOf(b);
  if (keyOrderSensitive) {
    i = 0;
    ret = aKeys.every(key => {
      if (i >= bKeys.length) {
        return false;
      }
      if (key !== bKeys[i]) {
        return false;
      }
      if (!EJSON.equals(a[key], b[bKeys[i]], options)) {
        return false;
      }
      i++;
      return true;
    });
  } else {
    i = 0;
    ret = aKeys.every(key => {
      if (!hasOwn(b, key)) {
        return false;
      }
      if (!EJSON.equals(a[key], b[key], options)) {
        return false;
      }
      i++;
      return true;
    });
  }
  return ret && i === bKeys.length;
};

/**
 * @summary Return a deep copy of `val`.
 * @locus Anywhere
 * @param {EJSON} val A value to copy.
 */
EJSON.clone = v => {
  let ret;
  if (!isObject(v)) {
    return v;
  }
  if (v === null) {
    return null; // null has typeof "object"
  }
  if (v instanceof Date) {
    return new Date(v.getTime());
  }

  // RegExps are not really EJSON elements (eg we don't define a serialization
  // for them), but they're immutable anyway, so we can support them in clone.
  if (v instanceof RegExp) {
    return v;
  }
  if (EJSON.isBinary(v)) {
    ret = EJSON.newBinary(v.length);
    for (let i = 0; i < v.length; i++) {
      ret[i] = v[i];
    }
    return ret;
  }
  if (Array.isArray(v)) {
    return v.map(EJSON.clone);
  }
  if (isArguments(v)) {
    return Array.from(v).map(EJSON.clone);
  }

  // handle general user-defined typed Objects if they have a clone method
  if (isFunction(v.clone)) {
    return v.clone();
  }

  // handle other custom types
  if (EJSON._isCustomType(v)) {
    return EJSON.fromJSONValue(EJSON.clone(EJSON.toJSONValue(v)), true);
  }

  // handle other objects
  ret = {};
  keysOf(v).forEach(key => {
    ret[key] = EJSON.clone(v[key]);
  });
  return ret;
};

/**
 * @summary Allocate a new buffer of binary data that EJSON can serialize.
 * @locus Anywhere
 * @param {Number} size The number of bytes of binary data to allocate.
 */
// EJSON.newBinary is the public documented API for this functionality,
// but the implementation is in the 'base64' package to avoid
// introducing a circular dependency. (If the implementation were here,
// then 'base64' would have to use EJSON.newBinary, and 'ejson' would
// also have to use 'base64'.)
EJSON.newBinary = Base64.newBinary;
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"stringify.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                             //
// packages/ejson/stringify.js                                                                                 //
//                                                                                                             //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                               //
// Based on json2.js from https://github.com/douglascrockford/JSON-js
//
//    json2.js
//    2012-10-08
//
//    Public Domain.
//
//    NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.

function quote(string) {
  return JSON.stringify(string);
}
const str = (key, holder, singleIndent, outerIndent, canonical) => {
  const value = holder[key];

  // What happens next depends on the value's type.
  switch (typeof value) {
    case 'string':
      return quote(value);
    case 'number':
      // JSON numbers must be finite. Encode non-finite numbers as null.
      return isFinite(value) ? String(value) : 'null';
    case 'boolean':
      return String(value);
    // If the type is 'object', we might be dealing with an object or an array or
    // null.
    case 'object':
      {
        // Due to a specification blunder in ECMAScript, typeof null is 'object',
        // so watch out for that case.
        if (!value) {
          return 'null';
        }
        // Make an array to hold the partial results of stringifying this object
        // value.
        const innerIndent = outerIndent + singleIndent;
        const partial = [];
        let v;

        // Is the value an array?
        if (Array.isArray(value) || {}.hasOwnProperty.call(value, 'callee')) {
          // The value is an array. Stringify every element. Use null as a
          // placeholder for non-JSON values.
          const length = value.length;
          for (let i = 0; i < length; i += 1) {
            partial[i] = str(i, value, singleIndent, innerIndent, canonical) || 'null';
          }

          // Join all of the elements together, separated with commas, and wrap
          // them in brackets.
          if (partial.length === 0) {
            v = '[]';
          } else if (innerIndent) {
            v = '[\n' + innerIndent + partial.join(',\n' + innerIndent) + '\n' + outerIndent + ']';
          } else {
            v = '[' + partial.join(',') + ']';
          }
          return v;
        }

        // Iterate through all of the keys in the object.
        let keys = Object.keys(value);
        if (canonical) {
          keys = keys.sort();
        }
        keys.forEach(k => {
          v = str(k, value, singleIndent, innerIndent, canonical);
          if (v) {
            partial.push(quote(k) + (innerIndent ? ': ' : ':') + v);
          }
        });

        // Join all of the member texts together, separated with commas,
        // and wrap them in braces.
        if (partial.length === 0) {
          v = '{}';
        } else if (innerIndent) {
          v = '{\n' + innerIndent + partial.join(',\n' + innerIndent) + '\n' + outerIndent + '}';
        } else {
          v = '{' + partial.join(',') + '}';
        }
        return v;
      }
    default: // Do nothing
  }
};

// If the JSON object does not yet have a stringify method, give it one.
const canonicalStringify = (value, options) => {
  // Make a fake root object containing our value under the key of ''.
  // Return the result of stringifying the value.
  const allOptions = Object.assign({
    indent: '',
    canonical: false
  }, options);
  if (allOptions.indent === true) {
    allOptions.indent = '  ';
  } else if (typeof allOptions.indent === 'number') {
    let newIndent = '';
    for (let i = 0; i < allOptions.indent; i++) {
      newIndent += ' ';
    }
    allOptions.indent = newIndent;
  }
  return str('', {
    '': value
  }, allOptions.indent, '', allOptions.canonical);
};
module.exportDefault(canonicalStringify);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"utils.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                             //
// packages/ejson/utils.js                                                                                     //
//                                                                                                             //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                               //
module.export({
  isFunction: () => isFunction,
  isObject: () => isObject,
  keysOf: () => keysOf,
  lengthOf: () => lengthOf,
  hasOwn: () => hasOwn,
  convertMapToObject: () => convertMapToObject,
  isArguments: () => isArguments,
  isInfOrNaN: () => isInfOrNaN,
  checkError: () => checkError,
  handleError: () => handleError
});
const isFunction = fn => typeof fn === 'function';
const isObject = fn => typeof fn === 'object';
const keysOf = obj => Object.keys(obj);
const lengthOf = obj => Object.keys(obj).length;
const hasOwn = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);
const convertMapToObject = map => Array.from(map).reduce((acc, _ref) => {
  let [key, value] = _ref;
  // reassign to not create new object
  acc[key] = value;
  return acc;
}, {});
const isArguments = obj => obj != null && hasOwn(obj, 'callee');
const isInfOrNaN = obj => Number.isNaN(obj) || obj === Infinity || obj === -Infinity;
const checkError = {
  maxStack: msgError => new RegExp('Maximum call stack size exceeded', 'g').test(msgError)
};
const handleError = fn => function () {
  try {
    return fn.apply(this, arguments);
  } catch (error) {
    const isMaxStack = checkError.maxStack(error.message);
    if (isMaxStack) {
      throw new Error('Converting circular structure to JSON');
    }
    throw error;
  }
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

var exports = require("/node_modules/meteor/ejson/ejson.js");

/* Exports */
Package._define("ejson", exports, {
  EJSON: EJSON
});

})();

//# sourceURL=meteor://💻app/packages/ejson.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvZWpzb24vZWpzb24uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL2Vqc29uL3N0cmluZ2lmeS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvZWpzb24vdXRpbHMuanMiXSwibmFtZXMiOlsibW9kdWxlIiwiZXhwb3J0IiwiRUpTT04iLCJpc0Z1bmN0aW9uIiwiaXNPYmplY3QiLCJrZXlzT2YiLCJsZW5ndGhPZiIsImhhc093biIsImNvbnZlcnRNYXBUb09iamVjdCIsImlzQXJndW1lbnRzIiwiaXNJbmZPck5hTiIsImhhbmRsZUVycm9yIiwibGluayIsInYiLCJjdXN0b21UeXBlcyIsIk1hcCIsImFkZFR5cGUiLCJuYW1lIiwiZmFjdG9yeSIsImhhcyIsIkVycm9yIiwiY29uY2F0Iiwic2V0IiwiYnVpbHRpbkNvbnZlcnRlcnMiLCJtYXRjaEpTT05WYWx1ZSIsIm9iaiIsIm1hdGNoT2JqZWN0IiwiRGF0ZSIsInRvSlNPTlZhbHVlIiwiJGRhdGUiLCJnZXRUaW1lIiwiZnJvbUpTT05WYWx1ZSIsIlJlZ0V4cCIsInJlZ2V4cCIsIiRyZWdleHAiLCJzb3VyY2UiLCIkZmxhZ3MiLCJmbGFncyIsInNsaWNlIiwicmVwbGFjZSIsInNpZ24iLCJOdW1iZXIiLCJpc05hTiIsIkluZmluaXR5IiwiJEluZk5hTiIsIlVpbnQ4QXJyYXkiLCIkYmluYXJ5IiwiQmFzZTY0IiwiZW5jb2RlIiwiZGVjb2RlIiwibWF0Y2giLCJrZXlDb3VudCIsInNvbWUiLCJjb252ZXJ0ZXIiLCJuZXdPYmoiLCJmb3JFYWNoIiwia2V5IiwiJGVzY2FwZSIsIl9pc0N1c3RvbVR5cGUiLCJqc29uVmFsdWUiLCJNZXRlb3IiLCJfbm9ZaWVsZHNBbGxvd2VkIiwiJHR5cGUiLCJ0eXBlTmFtZSIsIiR2YWx1ZSIsImdldCIsIl9nZXRUeXBlcyIsImlzT3JpZ2luYWwiLCJhcmd1bWVudHMiLCJsZW5ndGgiLCJ1bmRlZmluZWQiLCJfZ2V0Q29udmVydGVycyIsInRvSlNPTlZhbHVlSGVscGVyIiwiaXRlbSIsImkiLCJhZGp1c3RUeXBlc1RvSlNPTlZhbHVlIiwibWF5YmVDaGFuZ2VkIiwidmFsdWUiLCJjaGFuZ2VkIiwiX2FkanVzdFR5cGVzVG9KU09OVmFsdWUiLCJuZXdJdGVtIiwiY2xvbmUiLCJmcm9tSlNPTlZhbHVlSGVscGVyIiwia2V5cyIsImV2ZXJ5IiwiayIsInN1YnN0ciIsImFkanVzdFR5cGVzRnJvbUpTT05WYWx1ZSIsIl9hZGp1c3RUeXBlc0Zyb21KU09OVmFsdWUiLCJzdHJpbmdpZnkiLCJvcHRpb25zIiwic2VyaWFsaXplZCIsImpzb24iLCJjYW5vbmljYWwiLCJpbmRlbnQiLCJjYW5vbmljYWxTdHJpbmdpZnkiLCJkZWZhdWx0IiwiSlNPTiIsInBhcnNlIiwiaXNCaW5hcnkiLCIkVWludDhBcnJheVBvbHlmaWxsIiwiZXF1YWxzIiwiYSIsImIiLCJrZXlPcmRlclNlbnNpdGl2ZSIsInZhbHVlT2YiLCJhSXNBcnJheSIsIkFycmF5IiwiaXNBcnJheSIsImJJc0FycmF5IiwicmV0IiwiYUtleXMiLCJiS2V5cyIsIm5ld0JpbmFyeSIsIm1hcCIsImZyb20iLCJxdW90ZSIsInN0cmluZyIsInN0ciIsImhvbGRlciIsInNpbmdsZUluZGVudCIsIm91dGVySW5kZW50IiwiaXNGaW5pdGUiLCJTdHJpbmciLCJpbm5lckluZGVudCIsInBhcnRpYWwiLCJoYXNPd25Qcm9wZXJ0eSIsImNhbGwiLCJqb2luIiwiT2JqZWN0Iiwic29ydCIsInB1c2giLCJhbGxPcHRpb25zIiwiYXNzaWduIiwibmV3SW5kZW50IiwiZXhwb3J0RGVmYXVsdCIsImNoZWNrRXJyb3IiLCJmbiIsInByb3AiLCJwcm90b3R5cGUiLCJyZWR1Y2UiLCJhY2MiLCJfcmVmIiwibWF4U3RhY2siLCJtc2dFcnJvciIsInRlc3QiLCJhcHBseSIsImVycm9yIiwiaXNNYXhTdGFjayIsIm1lc3NhZ2UiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFB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QjtFQUFBLElBQWpCLENBQUN0RixHQUFHLEVBQUVxQixLQUFLLENBQUMsR0FBQWlFLElBQUE7RUFDbEY7RUFDQUQsR0FBRyxDQUFDckYsR0FBRyxDQUFDLEdBQUdxQixLQUFLO0VBQ2hCLE9BQU9nRSxHQUFHO0FBQ1osQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBRUMsTUFBTXBJLFdBQVcsR0FBR2dCLEdBQUcsSUFBSUEsR0FBRyxJQUFJLElBQUksSUFBSWxCLE1BQU0sQ0FBQ2tCLEdBQUcsRUFBRSxRQUFRLENBQUM7QUFFL0QsTUFBTWYsVUFBVSxHQUNyQmUsR0FBRyxJQUFJZ0IsTUFBTSxDQUFDQyxLQUFLLENBQUNqQixHQUFHLENBQUMsSUFBSUEsR0FBRyxLQUFLa0IsUUFBUSxJQUFJbEIsR0FBRyxLQUFLLENBQUNrQixRQUFRO0FBRTVELE1BQU02RixVQUFVLEdBQUc7RUFDeEJPLFFBQVEsRUFBR0MsUUFBUSxJQUFLLElBQUloSCxNQUFNLENBQUMsa0NBQWtDLEVBQUUsR0FBRyxDQUFDLENBQUNpSCxJQUFJLENBQUNELFFBQVE7QUFDM0YsQ0FBQztBQUVNLE1BQU1ySSxXQUFXLEdBQUk4SCxFQUFFLElBQUssWUFBVztFQUM1QyxJQUFJO0lBQ0YsT0FBT0EsRUFBRSxDQUFDUyxLQUFLLENBQUMsSUFBSSxFQUFFOUUsU0FBUyxDQUFDO0VBQ2xDLENBQUMsQ0FBQyxPQUFPK0UsS0FBSyxFQUFFO0lBQ2QsTUFBTUMsVUFBVSxHQUFHWixVQUFVLENBQUNPLFFBQVEsQ0FBQ0ksS0FBSyxDQUFDRSxPQUFPLENBQUM7SUFDckQsSUFBSUQsVUFBVSxFQUFFO01BQ2QsTUFBTSxJQUFJaEksS0FBSyxDQUFDLHVDQUF1QyxDQUFDO0lBQzFEO0lBQ0EsTUFBTStILEtBQUs7RUFDYjtBQUNGLENBQUMsQyIsImZpbGUiOiIvcGFja2FnZXMvZWpzb24uanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBpc0Z1bmN0aW9uLFxuICBpc09iamVjdCxcbiAga2V5c09mLFxuICBsZW5ndGhPZixcbiAgaGFzT3duLFxuICBjb252ZXJ0TWFwVG9PYmplY3QsXG4gIGlzQXJndW1lbnRzLFxuICBpc0luZk9yTmFOLFxuICBoYW5kbGVFcnJvcixcbn0gZnJvbSAnLi91dGlscyc7XG5cbi8qKlxuICogQG5hbWVzcGFjZVxuICogQHN1bW1hcnkgTmFtZXNwYWNlIGZvciBFSlNPTiBmdW5jdGlvbnNcbiAqL1xuY29uc3QgRUpTT04gPSB7fTtcblxuLy8gQ3VzdG9tIHR5cGUgaW50ZXJmYWNlIGRlZmluaXRpb25cbi8qKlxuICogQGNsYXNzIEN1c3RvbVR5cGVcbiAqIEBpbnN0YW5jZU5hbWUgY3VzdG9tVHlwZVxuICogQG1lbWJlck9mIEVKU09OXG4gKiBAc3VtbWFyeSBUaGUgaW50ZXJmYWNlIHRoYXQgYSBjbGFzcyBtdXN0IHNhdGlzZnkgdG8gYmUgYWJsZSB0byBiZWNvbWUgYW5cbiAqIEVKU09OIGN1c3RvbSB0eXBlIHZpYSBFSlNPTi5hZGRUeXBlLlxuICovXG5cbi8qKlxuICogQGZ1bmN0aW9uIHR5cGVOYW1lXG4gKiBAbWVtYmVyT2YgRUpTT04uQ3VzdG9tVHlwZVxuICogQHN1bW1hcnkgUmV0dXJuIHRoZSB0YWcgdXNlZCB0byBpZGVudGlmeSB0aGlzIHR5cGUuICBUaGlzIG11c3QgbWF0Y2ggdGhlXG4gKiAgICAgICAgICB0YWcgdXNlZCB0byByZWdpc3RlciB0aGlzIHR5cGUgd2l0aFxuICogICAgICAgICAgW2BFSlNPTi5hZGRUeXBlYF0oI2Vqc29uX2FkZF90eXBlKS5cbiAqIEBsb2N1cyBBbnl3aGVyZVxuICogQGluc3RhbmNlXG4gKi9cblxuLyoqXG4gKiBAZnVuY3Rpb24gdG9KU09OVmFsdWVcbiAqIEBtZW1iZXJPZiBFSlNPTi5DdXN0b21UeXBlXG4gKiBAc3VtbWFyeSBTZXJpYWxpemUgdGhpcyBpbnN0YW5jZSBpbnRvIGEgSlNPTi1jb21wYXRpYmxlIHZhbHVlLlxuICogQGxvY3VzIEFueXdoZXJlXG4gKiBAaW5zdGFuY2VcbiAqL1xuXG4vKipcbiAqIEBmdW5jdGlvbiBjbG9uZVxuICogQG1lbWJlck9mIEVKU09OLkN1c3RvbVR5cGVcbiAqIEBzdW1tYXJ5IFJldHVybiBhIHZhbHVlIGByYCBzdWNoIHRoYXQgYHRoaXMuZXF1YWxzKHIpYCBpcyB0cnVlLCBhbmRcbiAqICAgICAgICAgIG1vZGlmaWNhdGlvbnMgdG8gYHJgIGRvIG5vdCBhZmZlY3QgYHRoaXNgIGFuZCB2aWNlIHZlcnNhLlxuICogQGxvY3VzIEFueXdoZXJlXG4gKiBAaW5zdGFuY2VcbiAqL1xuXG4vKipcbiAqIEBmdW5jdGlvbiBlcXVhbHNcbiAqIEBtZW1iZXJPZiBFSlNPTi5DdXN0b21UeXBlXG4gKiBAc3VtbWFyeSBSZXR1cm4gYHRydWVgIGlmIGBvdGhlcmAgaGFzIGEgdmFsdWUgZXF1YWwgdG8gYHRoaXNgOyBgZmFsc2VgXG4gKiAgICAgICAgICBvdGhlcndpc2UuXG4gKiBAbG9jdXMgQW55d2hlcmVcbiAqIEBwYXJhbSB7T2JqZWN0fSBvdGhlciBBbm90aGVyIG9iamVjdCB0byBjb21wYXJlIHRoaXMgdG8uXG4gKiBAaW5zdGFuY2VcbiAqL1xuXG5jb25zdCBjdXN0b21UeXBlcyA9IG5ldyBNYXAoKTtcblxuLy8gQWRkIGEgY3VzdG9tIHR5cGUsIHVzaW5nIGEgbWV0aG9kIG9mIHlvdXIgY2hvaWNlIHRvIGdldCB0byBhbmRcbi8vIGZyb20gYSBiYXNpYyBKU09OLWFibGUgcmVwcmVzZW50YXRpb24uICBUaGUgZmFjdG9yeSBhcmd1bWVudFxuLy8gaXMgYSBmdW5jdGlvbiBvZiBKU09OLWFibGUgLS0+IHlvdXIgb2JqZWN0XG4vLyBUaGUgdHlwZSB5b3UgYWRkIG11c3QgaGF2ZTpcbi8vIC0gQSB0b0pTT05WYWx1ZSgpIG1ldGhvZCwgc28gdGhhdCBNZXRlb3IgY2FuIHNlcmlhbGl6ZSBpdFxuLy8gLSBhIHR5cGVOYW1lKCkgbWV0aG9kLCB0byBzaG93IGhvdyB0byBsb29rIGl0IHVwIGluIG91ciB0eXBlIHRhYmxlLlxuLy8gSXQgaXMgb2theSBpZiB0aGVzZSBtZXRob2RzIGFyZSBtb25rZXktcGF0Y2hlZCBvbi5cbi8vIEVKU09OLmNsb25lIHdpbGwgdXNlIHRvSlNPTlZhbHVlIGFuZCB0aGUgZ2l2ZW4gZmFjdG9yeSB0byBwcm9kdWNlXG4vLyBhIGNsb25lLCBidXQgeW91IG1heSBzcGVjaWZ5IGEgbWV0aG9kIGNsb25lKCkgdGhhdCB3aWxsIGJlXG4vLyB1c2VkIGluc3RlYWQuXG4vLyBTaW1pbGFybHksIEVKU09OLmVxdWFscyB3aWxsIHVzZSB0b0pTT05WYWx1ZSB0byBtYWtlIGNvbXBhcmlzb25zLFxuLy8gYnV0IHlvdSBtYXkgcHJvdmlkZSBhIG1ldGhvZCBlcXVhbHMoKSBpbnN0ZWFkLlxuLyoqXG4gKiBAc3VtbWFyeSBBZGQgYSBjdXN0b20gZGF0YXR5cGUgdG8gRUpTT04uXG4gKiBAbG9jdXMgQW55d2hlcmVcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIEEgdGFnIGZvciB5b3VyIGN1c3RvbSB0eXBlOyBtdXN0IGJlIHVuaXF1ZSBhbW9uZ1xuICogICAgICAgICAgICAgICAgICAgICAgY3VzdG9tIGRhdGEgdHlwZXMgZGVmaW5lZCBpbiB5b3VyIHByb2plY3QsIGFuZCBtdXN0XG4gKiAgICAgICAgICAgICAgICAgICAgICBtYXRjaCB0aGUgcmVzdWx0IG9mIHlvdXIgdHlwZSdzIGB0eXBlTmFtZWAgbWV0aG9kLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZmFjdG9yeSBBIGZ1bmN0aW9uIHRoYXQgZGVzZXJpYWxpemVzIGEgSlNPTi1jb21wYXRpYmxlXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlIGludG8gYW4gaW5zdGFuY2Ugb2YgeW91ciB0eXBlLiAgVGhpcyBzaG91bGRcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2ggdGhlIHNlcmlhbGl6YXRpb24gcGVyZm9ybWVkIGJ5IHlvdXJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZSdzIGB0b0pTT05WYWx1ZWAgbWV0aG9kLlxuICovXG5FSlNPTi5hZGRUeXBlID0gKG5hbWUsIGZhY3RvcnkpID0+IHtcbiAgaWYgKGN1c3RvbVR5cGVzLmhhcyhuYW1lKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgVHlwZSAke25hbWV9IGFscmVhZHkgcHJlc2VudGApO1xuICB9XG4gIGN1c3RvbVR5cGVzLnNldChuYW1lLCBmYWN0b3J5KTtcbn07XG5cbmNvbnN0IGJ1aWx0aW5Db252ZXJ0ZXJzID0gW1xuICB7IC8vIERhdGVcbiAgICBtYXRjaEpTT05WYWx1ZShvYmopIHtcbiAgICAgIHJldHVybiBoYXNPd24ob2JqLCAnJGRhdGUnKSAmJiBsZW5ndGhPZihvYmopID09PSAxO1xuICAgIH0sXG4gICAgbWF0Y2hPYmplY3Qob2JqKSB7XG4gICAgICByZXR1cm4gb2JqIGluc3RhbmNlb2YgRGF0ZTtcbiAgICB9LFxuICAgIHRvSlNPTlZhbHVlKG9iaikge1xuICAgICAgcmV0dXJuIHskZGF0ZTogb2JqLmdldFRpbWUoKX07XG4gICAgfSxcbiAgICBmcm9tSlNPTlZhbHVlKG9iaikge1xuICAgICAgcmV0dXJuIG5ldyBEYXRlKG9iai4kZGF0ZSk7XG4gICAgfSxcbiAgfSxcbiAgeyAvLyBSZWdFeHBcbiAgICBtYXRjaEpTT05WYWx1ZShvYmopIHtcbiAgICAgIHJldHVybiBoYXNPd24ob2JqLCAnJHJlZ2V4cCcpXG4gICAgICAgICYmIGhhc093bihvYmosICckZmxhZ3MnKVxuICAgICAgICAmJiBsZW5ndGhPZihvYmopID09PSAyO1xuICAgIH0sXG4gICAgbWF0Y2hPYmplY3Qob2JqKSB7XG4gICAgICByZXR1cm4gb2JqIGluc3RhbmNlb2YgUmVnRXhwO1xuICAgIH0sXG4gICAgdG9KU09OVmFsdWUocmVnZXhwKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICAkcmVnZXhwOiByZWdleHAuc291cmNlLFxuICAgICAgICAkZmxhZ3M6IHJlZ2V4cC5mbGFnc1xuICAgICAgfTtcbiAgICB9LFxuICAgIGZyb21KU09OVmFsdWUob2JqKSB7XG4gICAgICAvLyBSZXBsYWNlcyBkdXBsaWNhdGUgLyBpbnZhbGlkIGZsYWdzLlxuICAgICAgcmV0dXJuIG5ldyBSZWdFeHAoXG4gICAgICAgIG9iai4kcmVnZXhwLFxuICAgICAgICBvYmouJGZsYWdzXG4gICAgICAgICAgLy8gQ3V0IG9mZiBmbGFncyBhdCA1MCBjaGFycyB0byBhdm9pZCBhYnVzaW5nIFJlZ0V4cCBmb3IgRE9TLlxuICAgICAgICAgIC5zbGljZSgwLCA1MClcbiAgICAgICAgICAucmVwbGFjZSgvW15naW11eV0vZywnJylcbiAgICAgICAgICAucmVwbGFjZSgvKC4pKD89LipcXDEpL2csICcnKVxuICAgICAgKTtcbiAgICB9LFxuICB9LFxuICB7IC8vIE5hTiwgSW5mLCAtSW5mLiAoVGhlc2UgYXJlIHRoZSBvbmx5IG9iamVjdHMgd2l0aCB0eXBlb2YgIT09ICdvYmplY3QnXG4gICAgLy8gd2hpY2ggd2UgbWF0Y2guKVxuICAgIG1hdGNoSlNPTlZhbHVlKG9iaikge1xuICAgICAgcmV0dXJuIGhhc093bihvYmosICckSW5mTmFOJykgJiYgbGVuZ3RoT2Yob2JqKSA9PT0gMTtcbiAgICB9LFxuICAgIG1hdGNoT2JqZWN0OiBpc0luZk9yTmFOLFxuICAgIHRvSlNPTlZhbHVlKG9iaikge1xuICAgICAgbGV0IHNpZ247XG4gICAgICBpZiAoTnVtYmVyLmlzTmFOKG9iaikpIHtcbiAgICAgICAgc2lnbiA9IDA7XG4gICAgICB9IGVsc2UgaWYgKG9iaiA9PT0gSW5maW5pdHkpIHtcbiAgICAgICAgc2lnbiA9IDE7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzaWduID0gLTE7XG4gICAgICB9XG4gICAgICByZXR1cm4geyRJbmZOYU46IHNpZ259O1xuICAgIH0sXG4gICAgZnJvbUpTT05WYWx1ZShvYmopIHtcbiAgICAgIHJldHVybiBvYmouJEluZk5hTiAvIDA7XG4gICAgfSxcbiAgfSxcbiAgeyAvLyBCaW5hcnlcbiAgICBtYXRjaEpTT05WYWx1ZShvYmopIHtcbiAgICAgIHJldHVybiBoYXNPd24ob2JqLCAnJGJpbmFyeScpICYmIGxlbmd0aE9mKG9iaikgPT09IDE7XG4gICAgfSxcbiAgICBtYXRjaE9iamVjdChvYmopIHtcbiAgICAgIHJldHVybiB0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcgJiYgb2JqIGluc3RhbmNlb2YgVWludDhBcnJheVxuICAgICAgICB8fCAob2JqICYmIGhhc093bihvYmosICckVWludDhBcnJheVBvbHlmaWxsJykpO1xuICAgIH0sXG4gICAgdG9KU09OVmFsdWUob2JqKSB7XG4gICAgICByZXR1cm4geyRiaW5hcnk6IEJhc2U2NC5lbmNvZGUob2JqKX07XG4gICAgfSxcbiAgICBmcm9tSlNPTlZhbHVlKG9iaikge1xuICAgICAgcmV0dXJuIEJhc2U2NC5kZWNvZGUob2JqLiRiaW5hcnkpO1xuICAgIH0sXG4gIH0sXG4gIHsgLy8gRXNjYXBpbmcgb25lIGxldmVsXG4gICAgbWF0Y2hKU09OVmFsdWUob2JqKSB7XG4gICAgICByZXR1cm4gaGFzT3duKG9iaiwgJyRlc2NhcGUnKSAmJiBsZW5ndGhPZihvYmopID09PSAxO1xuICAgIH0sXG4gICAgbWF0Y2hPYmplY3Qob2JqKSB7XG4gICAgICBsZXQgbWF0Y2ggPSBmYWxzZTtcbiAgICAgIGlmIChvYmopIHtcbiAgICAgICAgY29uc3Qga2V5Q291bnQgPSBsZW5ndGhPZihvYmopO1xuICAgICAgICBpZiAoa2V5Q291bnQgPT09IDEgfHwga2V5Q291bnQgPT09IDIpIHtcbiAgICAgICAgICBtYXRjaCA9XG4gICAgICAgICAgICBidWlsdGluQ29udmVydGVycy5zb21lKGNvbnZlcnRlciA9PiBjb252ZXJ0ZXIubWF0Y2hKU09OVmFsdWUob2JqKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBtYXRjaDtcbiAgICB9LFxuICAgIHRvSlNPTlZhbHVlKG9iaikge1xuICAgICAgY29uc3QgbmV3T2JqID0ge307XG4gICAgICBrZXlzT2Yob2JqKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgIG5ld09ialtrZXldID0gRUpTT04udG9KU09OVmFsdWUob2JqW2tleV0pO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4geyRlc2NhcGU6IG5ld09ian07XG4gICAgfSxcbiAgICBmcm9tSlNPTlZhbHVlKG9iaikge1xuICAgICAgY29uc3QgbmV3T2JqID0ge307XG4gICAgICBrZXlzT2Yob2JqLiRlc2NhcGUpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgbmV3T2JqW2tleV0gPSBFSlNPTi5mcm9tSlNPTlZhbHVlKG9iai4kZXNjYXBlW2tleV0pO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gbmV3T2JqO1xuICAgIH0sXG4gIH0sXG4gIHsgLy8gQ3VzdG9tXG4gICAgbWF0Y2hKU09OVmFsdWUob2JqKSB7XG4gICAgICByZXR1cm4gaGFzT3duKG9iaiwgJyR0eXBlJylcbiAgICAgICAgJiYgaGFzT3duKG9iaiwgJyR2YWx1ZScpICYmIGxlbmd0aE9mKG9iaikgPT09IDI7XG4gICAgfSxcbiAgICBtYXRjaE9iamVjdChvYmopIHtcbiAgICAgIHJldHVybiBFSlNPTi5faXNDdXN0b21UeXBlKG9iaik7XG4gICAgfSxcbiAgICB0b0pTT05WYWx1ZShvYmopIHtcbiAgICAgIGNvbnN0IGpzb25WYWx1ZSA9IE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKCgpID0+IG9iai50b0pTT05WYWx1ZSgpKTtcbiAgICAgIHJldHVybiB7JHR5cGU6IG9iai50eXBlTmFtZSgpLCAkdmFsdWU6IGpzb25WYWx1ZX07XG4gICAgfSxcbiAgICBmcm9tSlNPTlZhbHVlKG9iaikge1xuICAgICAgY29uc3QgdHlwZU5hbWUgPSBvYmouJHR5cGU7XG4gICAgICBpZiAoIWN1c3RvbVR5cGVzLmhhcyh0eXBlTmFtZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBDdXN0b20gRUpTT04gdHlwZSAke3R5cGVOYW1lfSBpcyBub3QgZGVmaW5lZGApO1xuICAgICAgfVxuICAgICAgY29uc3QgY29udmVydGVyID0gY3VzdG9tVHlwZXMuZ2V0KHR5cGVOYW1lKTtcbiAgICAgIHJldHVybiBNZXRlb3IuX25vWWllbGRzQWxsb3dlZCgoKSA9PiBjb252ZXJ0ZXIob2JqLiR2YWx1ZSkpO1xuICAgIH0sXG4gIH0sXG5dO1xuXG5FSlNPTi5faXNDdXN0b21UeXBlID0gKG9iaikgPT4gKFxuICBvYmogJiZcbiAgaXNGdW5jdGlvbihvYmoudG9KU09OVmFsdWUpICYmXG4gIGlzRnVuY3Rpb24ob2JqLnR5cGVOYW1lKSAmJlxuICBjdXN0b21UeXBlcy5oYXMob2JqLnR5cGVOYW1lKCkpXG4pO1xuXG5FSlNPTi5fZ2V0VHlwZXMgPSAoaXNPcmlnaW5hbCA9IGZhbHNlKSA9PiAoaXNPcmlnaW5hbCA/IGN1c3RvbVR5cGVzIDogY29udmVydE1hcFRvT2JqZWN0KGN1c3RvbVR5cGVzKSk7XG5cbkVKU09OLl9nZXRDb252ZXJ0ZXJzID0gKCkgPT4gYnVpbHRpbkNvbnZlcnRlcnM7XG5cbi8vIEVpdGhlciByZXR1cm4gdGhlIEpTT04tY29tcGF0aWJsZSB2ZXJzaW9uIG9mIHRoZSBhcmd1bWVudCwgb3IgdW5kZWZpbmVkIChpZlxuLy8gdGhlIGl0ZW0gaXNuJ3QgaXRzZWxmIHJlcGxhY2VhYmxlLCBidXQgbWF5YmUgc29tZSBmaWVsZHMgaW4gaXQgYXJlKVxuY29uc3QgdG9KU09OVmFsdWVIZWxwZXIgPSBpdGVtID0+IHtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBidWlsdGluQ29udmVydGVycy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGNvbnZlcnRlciA9IGJ1aWx0aW5Db252ZXJ0ZXJzW2ldO1xuICAgIGlmIChjb252ZXJ0ZXIubWF0Y2hPYmplY3QoaXRlbSkpIHtcbiAgICAgIHJldHVybiBjb252ZXJ0ZXIudG9KU09OVmFsdWUoaXRlbSk7XG4gICAgfVxuICB9XG4gIHJldHVybiB1bmRlZmluZWQ7XG59O1xuXG4vLyBmb3IgYm90aCBhcnJheXMgYW5kIG9iamVjdHMsIGluLXBsYWNlIG1vZGlmaWNhdGlvbi5cbmNvbnN0IGFkanVzdFR5cGVzVG9KU09OVmFsdWUgPSBvYmogPT4ge1xuICAvLyBJcyBpdCBhbiBhdG9tIHRoYXQgd2UgbmVlZCB0byBhZGp1c3Q/XG4gIGlmIChvYmogPT09IG51bGwpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGNvbnN0IG1heWJlQ2hhbmdlZCA9IHRvSlNPTlZhbHVlSGVscGVyKG9iaik7XG4gIGlmIChtYXliZUNoYW5nZWQgIT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBtYXliZUNoYW5nZWQ7XG4gIH1cblxuICAvLyBPdGhlciBhdG9tcyBhcmUgdW5jaGFuZ2VkLlxuICBpZiAoIWlzT2JqZWN0KG9iaikpIHtcbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgLy8gSXRlcmF0ZSBvdmVyIGFycmF5IG9yIG9iamVjdCBzdHJ1Y3R1cmUuXG4gIGtleXNPZihvYmopLmZvckVhY2goa2V5ID0+IHtcbiAgICBjb25zdCB2YWx1ZSA9IG9ialtrZXldO1xuICAgIGlmICghaXNPYmplY3QodmFsdWUpICYmIHZhbHVlICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICAgIWlzSW5mT3JOYU4odmFsdWUpKSB7XG4gICAgICByZXR1cm47IC8vIGNvbnRpbnVlXG4gICAgfVxuXG4gICAgY29uc3QgY2hhbmdlZCA9IHRvSlNPTlZhbHVlSGVscGVyKHZhbHVlKTtcbiAgICBpZiAoY2hhbmdlZCkge1xuICAgICAgb2JqW2tleV0gPSBjaGFuZ2VkO1xuICAgICAgcmV0dXJuOyAvLyBvbiB0byB0aGUgbmV4dCBrZXlcbiAgICB9XG4gICAgLy8gaWYgd2UgZ2V0IGhlcmUsIHZhbHVlIGlzIGFuIG9iamVjdCBidXQgbm90IGFkanVzdGFibGVcbiAgICAvLyBhdCB0aGlzIGxldmVsLiAgcmVjdXJzZS5cbiAgICBhZGp1c3RUeXBlc1RvSlNPTlZhbHVlKHZhbHVlKTtcbiAgfSk7XG4gIHJldHVybiBvYmo7XG59O1xuXG5FSlNPTi5fYWRqdXN0VHlwZXNUb0pTT05WYWx1ZSA9IGFkanVzdFR5cGVzVG9KU09OVmFsdWU7XG5cbi8qKlxuICogQHN1bW1hcnkgU2VyaWFsaXplIGFuIEVKU09OLWNvbXBhdGlibGUgdmFsdWUgaW50byBpdHMgcGxhaW4gSlNPTlxuICogICAgICAgICAgcmVwcmVzZW50YXRpb24uXG4gKiBAbG9jdXMgQW55d2hlcmVcbiAqIEBwYXJhbSB7RUpTT059IHZhbCBBIHZhbHVlIHRvIHNlcmlhbGl6ZSB0byBwbGFpbiBKU09OLlxuICovXG5FSlNPTi50b0pTT05WYWx1ZSA9IGl0ZW0gPT4ge1xuICBjb25zdCBjaGFuZ2VkID0gdG9KU09OVmFsdWVIZWxwZXIoaXRlbSk7XG4gIGlmIChjaGFuZ2VkICE9PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gY2hhbmdlZDtcbiAgfVxuXG4gIGxldCBuZXdJdGVtID0gaXRlbTtcbiAgaWYgKGlzT2JqZWN0KGl0ZW0pKSB7XG4gICAgbmV3SXRlbSA9IEVKU09OLmNsb25lKGl0ZW0pO1xuICAgIGFkanVzdFR5cGVzVG9KU09OVmFsdWUobmV3SXRlbSk7XG4gIH1cbiAgcmV0dXJuIG5ld0l0ZW07XG59O1xuXG4vLyBFaXRoZXIgcmV0dXJuIHRoZSBhcmd1bWVudCBjaGFuZ2VkIHRvIGhhdmUgdGhlIG5vbi1qc29uXG4vLyByZXAgb2YgaXRzZWxmICh0aGUgT2JqZWN0IHZlcnNpb24pIG9yIHRoZSBhcmd1bWVudCBpdHNlbGYuXG4vLyBET0VTIE5PVCBSRUNVUlNFLiAgRm9yIGFjdHVhbGx5IGdldHRpbmcgdGhlIGZ1bGx5LWNoYW5nZWQgdmFsdWUsIHVzZVxuLy8gRUpTT04uZnJvbUpTT05WYWx1ZVxuY29uc3QgZnJvbUpTT05WYWx1ZUhlbHBlciA9IHZhbHVlID0+IHtcbiAgaWYgKGlzT2JqZWN0KHZhbHVlKSAmJiB2YWx1ZSAhPT0gbnVsbCkge1xuICAgIGNvbnN0IGtleXMgPSBrZXlzT2YodmFsdWUpO1xuICAgIGlmIChrZXlzLmxlbmd0aCA8PSAyXG4gICAgICAgICYmIGtleXMuZXZlcnkoayA9PiB0eXBlb2YgayA9PT0gJ3N0cmluZycgJiYgay5zdWJzdHIoMCwgMSkgPT09ICckJykpIHtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYnVpbHRpbkNvbnZlcnRlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgY29udmVydGVyID0gYnVpbHRpbkNvbnZlcnRlcnNbaV07XG4gICAgICAgIGlmIChjb252ZXJ0ZXIubWF0Y2hKU09OVmFsdWUodmFsdWUpKSB7XG4gICAgICAgICAgcmV0dXJuIGNvbnZlcnRlci5mcm9tSlNPTlZhbHVlKHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gdmFsdWU7XG59O1xuXG4vLyBmb3IgYm90aCBhcnJheXMgYW5kIG9iamVjdHMuIFRyaWVzIGl0cyBiZXN0IHRvIGp1c3Rcbi8vIHVzZSB0aGUgb2JqZWN0IHlvdSBoYW5kIGl0LCBidXQgbWF5IHJldHVybiBzb21ldGhpbmdcbi8vIGRpZmZlcmVudCBpZiB0aGUgb2JqZWN0IHlvdSBoYW5kIGl0IGl0c2VsZiBuZWVkcyBjaGFuZ2luZy5cbmNvbnN0IGFkanVzdFR5cGVzRnJvbUpTT05WYWx1ZSA9IG9iaiA9PiB7XG4gIGlmIChvYmogPT09IG51bGwpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGNvbnN0IG1heWJlQ2hhbmdlZCA9IGZyb21KU09OVmFsdWVIZWxwZXIob2JqKTtcbiAgaWYgKG1heWJlQ2hhbmdlZCAhPT0gb2JqKSB7XG4gICAgcmV0dXJuIG1heWJlQ2hhbmdlZDtcbiAgfVxuXG4gIC8vIE90aGVyIGF0b21zIGFyZSB1bmNoYW5nZWQuXG4gIGlmICghaXNPYmplY3Qob2JqKSkge1xuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICBrZXlzT2Yob2JqKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgY29uc3QgdmFsdWUgPSBvYmpba2V5XTtcbiAgICBpZiAoaXNPYmplY3QodmFsdWUpKSB7XG4gICAgICBjb25zdCBjaGFuZ2VkID0gZnJvbUpTT05WYWx1ZUhlbHBlcih2YWx1ZSk7XG4gICAgICBpZiAodmFsdWUgIT09IGNoYW5nZWQpIHtcbiAgICAgICAgb2JqW2tleV0gPSBjaGFuZ2VkO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICAvLyBpZiB3ZSBnZXQgaGVyZSwgdmFsdWUgaXMgYW4gb2JqZWN0IGJ1dCBub3QgYWRqdXN0YWJsZVxuICAgICAgLy8gYXQgdGhpcyBsZXZlbC4gIHJlY3Vyc2UuXG4gICAgICBhZGp1c3RUeXBlc0Zyb21KU09OVmFsdWUodmFsdWUpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBvYmo7XG59O1xuXG5FSlNPTi5fYWRqdXN0VHlwZXNGcm9tSlNPTlZhbHVlID0gYWRqdXN0VHlwZXNGcm9tSlNPTlZhbHVlO1xuXG4vKipcbiAqIEBzdW1tYXJ5IERlc2VyaWFsaXplIGFuIEVKU09OIHZhbHVlIGZyb20gaXRzIHBsYWluIEpTT04gcmVwcmVzZW50YXRpb24uXG4gKiBAbG9jdXMgQW55d2hlcmVcbiAqIEBwYXJhbSB7SlNPTkNvbXBhdGlibGV9IHZhbCBBIHZhbHVlIHRvIGRlc2VyaWFsaXplIGludG8gRUpTT04uXG4gKi9cbkVKU09OLmZyb21KU09OVmFsdWUgPSBpdGVtID0+IHtcbiAgbGV0IGNoYW5nZWQgPSBmcm9tSlNPTlZhbHVlSGVscGVyKGl0ZW0pO1xuICBpZiAoY2hhbmdlZCA9PT0gaXRlbSAmJiBpc09iamVjdChpdGVtKSkge1xuICAgIGNoYW5nZWQgPSBFSlNPTi5jbG9uZShpdGVtKTtcbiAgICBhZGp1c3RUeXBlc0Zyb21KU09OVmFsdWUoY2hhbmdlZCk7XG4gIH1cbiAgcmV0dXJuIGNoYW5nZWQ7XG59O1xuXG4vKipcbiAqIEBzdW1tYXJ5IFNlcmlhbGl6ZSBhIHZhbHVlIHRvIGEgc3RyaW5nLiBGb3IgRUpTT04gdmFsdWVzLCB0aGUgc2VyaWFsaXphdGlvblxuICogICAgICAgICAgZnVsbHkgcmVwcmVzZW50cyB0aGUgdmFsdWUuIEZvciBub24tRUpTT04gdmFsdWVzLCBzZXJpYWxpemVzIHRoZVxuICogICAgICAgICAgc2FtZSB3YXkgYXMgYEpTT04uc3RyaW5naWZ5YC5cbiAqIEBsb2N1cyBBbnl3aGVyZVxuICogQHBhcmFtIHtFSlNPTn0gdmFsIEEgdmFsdWUgdG8gc3RyaW5naWZ5LlxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXVxuICogQHBhcmFtIHtCb29sZWFuIHwgSW50ZWdlciB8IFN0cmluZ30gb3B0aW9ucy5pbmRlbnQgSW5kZW50cyBvYmplY3RzIGFuZFxuICogYXJyYXlzIGZvciBlYXN5IHJlYWRhYmlsaXR5LiAgV2hlbiBgdHJ1ZWAsIGluZGVudHMgYnkgMiBzcGFjZXM7IHdoZW4gYW5cbiAqIGludGVnZXIsIGluZGVudHMgYnkgdGhhdCBudW1iZXIgb2Ygc3BhY2VzOyBhbmQgd2hlbiBhIHN0cmluZywgdXNlcyB0aGVcbiAqIHN0cmluZyBhcyB0aGUgaW5kZW50YXRpb24gcGF0dGVybi5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0aW9ucy5jYW5vbmljYWwgV2hlbiBgdHJ1ZWAsIHN0cmluZ2lmaWVzIGtleXMgaW4gYW5cbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2JqZWN0IGluIHNvcnRlZCBvcmRlci5cbiAqL1xuRUpTT04uc3RyaW5naWZ5ID0gaGFuZGxlRXJyb3IoKGl0ZW0sIG9wdGlvbnMpID0+IHtcbiAgbGV0IHNlcmlhbGl6ZWQ7XG4gIGNvbnN0IGpzb24gPSBFSlNPTi50b0pTT05WYWx1ZShpdGVtKTtcbiAgaWYgKG9wdGlvbnMgJiYgKG9wdGlvbnMuY2Fub25pY2FsIHx8IG9wdGlvbnMuaW5kZW50KSkge1xuICAgIGltcG9ydCBjYW5vbmljYWxTdHJpbmdpZnkgZnJvbSAnLi9zdHJpbmdpZnknO1xuICAgIHNlcmlhbGl6ZWQgPSBjYW5vbmljYWxTdHJpbmdpZnkoanNvbiwgb3B0aW9ucyk7XG4gIH0gZWxzZSB7XG4gICAgc2VyaWFsaXplZCA9IEpTT04uc3RyaW5naWZ5KGpzb24pO1xuICB9XG4gIHJldHVybiBzZXJpYWxpemVkO1xufSk7XG5cbi8qKlxuICogQHN1bW1hcnkgUGFyc2UgYSBzdHJpbmcgaW50byBhbiBFSlNPTiB2YWx1ZS4gVGhyb3dzIGFuIGVycm9yIGlmIHRoZSBzdHJpbmdcbiAqICAgICAgICAgIGlzIG5vdCB2YWxpZCBFSlNPTi5cbiAqIEBsb2N1cyBBbnl3aGVyZVxuICogQHBhcmFtIHtTdHJpbmd9IHN0ciBBIHN0cmluZyB0byBwYXJzZSBpbnRvIGFuIEVKU09OIHZhbHVlLlxuICovXG5FSlNPTi5wYXJzZSA9IGl0ZW0gPT4ge1xuICBpZiAodHlwZW9mIGl0ZW0gIT09ICdzdHJpbmcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdFSlNPTi5wYXJzZSBhcmd1bWVudCBzaG91bGQgYmUgYSBzdHJpbmcnKTtcbiAgfVxuICByZXR1cm4gRUpTT04uZnJvbUpTT05WYWx1ZShKU09OLnBhcnNlKGl0ZW0pKTtcbn07XG5cbi8qKlxuICogQHN1bW1hcnkgUmV0dXJucyB0cnVlIGlmIGB4YCBpcyBhIGJ1ZmZlciBvZiBiaW5hcnkgZGF0YSwgYXMgcmV0dXJuZWQgZnJvbVxuICogICAgICAgICAgW2BFSlNPTi5uZXdCaW5hcnlgXSgjZWpzb25fbmV3X2JpbmFyeSkuXG4gKiBAcGFyYW0ge09iamVjdH0geCBUaGUgdmFyaWFibGUgdG8gY2hlY2suXG4gKiBAbG9jdXMgQW55d2hlcmVcbiAqL1xuRUpTT04uaXNCaW5hcnkgPSBvYmogPT4ge1xuICByZXR1cm4gISEoKHR5cGVvZiBVaW50OEFycmF5ICE9PSAndW5kZWZpbmVkJyAmJiBvYmogaW5zdGFuY2VvZiBVaW50OEFycmF5KSB8fFxuICAgIChvYmogJiYgb2JqLiRVaW50OEFycmF5UG9seWZpbGwpKTtcbn07XG5cbi8qKlxuICogQHN1bW1hcnkgUmV0dXJuIHRydWUgaWYgYGFgIGFuZCBgYmAgYXJlIGVxdWFsIHRvIGVhY2ggb3RoZXIuICBSZXR1cm4gZmFsc2VcbiAqICAgICAgICAgIG90aGVyd2lzZS4gIFVzZXMgdGhlIGBlcXVhbHNgIG1ldGhvZCBvbiBgYWAgaWYgcHJlc2VudCwgb3RoZXJ3aXNlXG4gKiAgICAgICAgICBwZXJmb3JtcyBhIGRlZXAgY29tcGFyaXNvbi5cbiAqIEBsb2N1cyBBbnl3aGVyZVxuICogQHBhcmFtIHtFSlNPTn0gYVxuICogQHBhcmFtIHtFSlNPTn0gYlxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXVxuICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLmtleU9yZGVyU2Vuc2l0aXZlIENvbXBhcmUgaW4ga2V5IHNlbnNpdGl2ZSBvcmRlcixcbiAqIGlmIHN1cHBvcnRlZCBieSB0aGUgSmF2YVNjcmlwdCBpbXBsZW1lbnRhdGlvbi4gIEZvciBleGFtcGxlLCBge2E6IDEsIGI6IDJ9YFxuICogaXMgZXF1YWwgdG8gYHtiOiAyLCBhOiAxfWAgb25seSB3aGVuIGBrZXlPcmRlclNlbnNpdGl2ZWAgaXMgYGZhbHNlYC4gIFRoZVxuICogZGVmYXVsdCBpcyBgZmFsc2VgLlxuICovXG5FSlNPTi5lcXVhbHMgPSAoYSwgYiwgb3B0aW9ucykgPT4ge1xuICBsZXQgaTtcbiAgY29uc3Qga2V5T3JkZXJTZW5zaXRpdmUgPSAhIShvcHRpb25zICYmIG9wdGlvbnMua2V5T3JkZXJTZW5zaXRpdmUpO1xuICBpZiAoYSA9PT0gYikge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLy8gVGhpcyBkaWZmZXJzIGZyb20gdGhlIElFRUUgc3BlYyBmb3IgTmFOIGVxdWFsaXR5LCBiL2Mgd2UgZG9uJ3Qgd2FudFxuICAvLyBhbnl0aGluZyBldmVyIHdpdGggYSBOYU4gdG8gYmUgcG9pc29uZWQgZnJvbSBiZWNvbWluZyBlcXVhbCB0byBhbnl0aGluZy5cbiAgaWYgKE51bWJlci5pc05hTihhKSAmJiBOdW1iZXIuaXNOYU4oYikpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8vIGlmIGVpdGhlciBvbmUgaXMgZmFsc3ksIHRoZXknZCBoYXZlIHRvIGJlID09PSB0byBiZSBlcXVhbFxuICBpZiAoIWEgfHwgIWIpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpZiAoIShpc09iamVjdChhKSAmJiBpc09iamVjdChiKSkpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpZiAoYSBpbnN0YW5jZW9mIERhdGUgJiYgYiBpbnN0YW5jZW9mIERhdGUpIHtcbiAgICByZXR1cm4gYS52YWx1ZU9mKCkgPT09IGIudmFsdWVPZigpO1xuICB9XG5cbiAgaWYgKEVKU09OLmlzQmluYXJ5KGEpICYmIEVKU09OLmlzQmluYXJ5KGIpKSB7XG4gICAgaWYgKGEubGVuZ3RoICE9PSBiLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBmb3IgKGkgPSAwOyBpIDwgYS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGFbaV0gIT09IGJbaV0pIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGlmIChpc0Z1bmN0aW9uKGEuZXF1YWxzKSkge1xuICAgIHJldHVybiBhLmVxdWFscyhiLCBvcHRpb25zKTtcbiAgfVxuXG4gIGlmIChpc0Z1bmN0aW9uKGIuZXF1YWxzKSkge1xuICAgIHJldHVybiBiLmVxdWFscyhhLCBvcHRpb25zKTtcbiAgfVxuXG4gIC8vIEFycmF5LmlzQXJyYXkgd29ya3MgYWNyb3NzIGlmcmFtZXMgd2hpbGUgaW5zdGFuY2VvZiB3b24ndFxuICBjb25zdCBhSXNBcnJheSA9IEFycmF5LmlzQXJyYXkoYSk7XG4gIGNvbnN0IGJJc0FycmF5ID0gQXJyYXkuaXNBcnJheShiKTtcblxuICAvLyBpZiBub3QgYm90aCBvciBub25lIGFyZSBhcnJheSB0aGV5IGFyZSBub3QgZXF1YWxcbiAgaWYgKGFJc0FycmF5ICE9PSBiSXNBcnJheSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGlmIChhSXNBcnJheSAmJiBiSXNBcnJheSkge1xuICAgIGlmIChhLmxlbmd0aCAhPT0gYi5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgZm9yIChpID0gMDsgaSA8IGEubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICghRUpTT04uZXF1YWxzKGFbaV0sIGJbaV0sIG9wdGlvbnMpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvLyBmYWxsYmFjayBmb3IgY3VzdG9tIHR5cGVzIHRoYXQgZG9uJ3QgaW1wbGVtZW50IHRoZWlyIG93biBlcXVhbHNcbiAgc3dpdGNoIChFSlNPTi5faXNDdXN0b21UeXBlKGEpICsgRUpTT04uX2lzQ3VzdG9tVHlwZShiKSkge1xuICAgIGNhc2UgMTogcmV0dXJuIGZhbHNlO1xuICAgIGNhc2UgMjogcmV0dXJuIEVKU09OLmVxdWFscyhFSlNPTi50b0pTT05WYWx1ZShhKSwgRUpTT04udG9KU09OVmFsdWUoYikpO1xuICAgIGRlZmF1bHQ6IC8vIERvIG5vdGhpbmdcbiAgfVxuXG4gIC8vIGZhbGwgYmFjayB0byBzdHJ1Y3R1cmFsIGVxdWFsaXR5IG9mIG9iamVjdHNcbiAgbGV0IHJldDtcbiAgY29uc3QgYUtleXMgPSBrZXlzT2YoYSk7XG4gIGNvbnN0IGJLZXlzID0ga2V5c09mKGIpO1xuICBpZiAoa2V5T3JkZXJTZW5zaXRpdmUpIHtcbiAgICBpID0gMDtcbiAgICByZXQgPSBhS2V5cy5ldmVyeShrZXkgPT4ge1xuICAgICAgaWYgKGkgPj0gYktleXMubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmIChrZXkgIT09IGJLZXlzW2ldKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmICghRUpTT04uZXF1YWxzKGFba2V5XSwgYltiS2V5c1tpXV0sIG9wdGlvbnMpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGkrKztcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIGkgPSAwO1xuICAgIHJldCA9IGFLZXlzLmV2ZXJ5KGtleSA9PiB7XG4gICAgICBpZiAoIWhhc093bihiLCBrZXkpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmICghRUpTT04uZXF1YWxzKGFba2V5XSwgYltrZXldLCBvcHRpb25zKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpKys7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgfVxuICByZXR1cm4gcmV0ICYmIGkgPT09IGJLZXlzLmxlbmd0aDtcbn07XG5cbi8qKlxuICogQHN1bW1hcnkgUmV0dXJuIGEgZGVlcCBjb3B5IG9mIGB2YWxgLlxuICogQGxvY3VzIEFueXdoZXJlXG4gKiBAcGFyYW0ge0VKU09OfSB2YWwgQSB2YWx1ZSB0byBjb3B5LlxuICovXG5FSlNPTi5jbG9uZSA9IHYgPT4ge1xuICBsZXQgcmV0O1xuICBpZiAoIWlzT2JqZWN0KHYpKSB7XG4gICAgcmV0dXJuIHY7XG4gIH1cblxuICBpZiAodiA9PT0gbnVsbCkge1xuICAgIHJldHVybiBudWxsOyAvLyBudWxsIGhhcyB0eXBlb2YgXCJvYmplY3RcIlxuICB9XG5cbiAgaWYgKHYgaW5zdGFuY2VvZiBEYXRlKSB7XG4gICAgcmV0dXJuIG5ldyBEYXRlKHYuZ2V0VGltZSgpKTtcbiAgfVxuXG4gIC8vIFJlZ0V4cHMgYXJlIG5vdCByZWFsbHkgRUpTT04gZWxlbWVudHMgKGVnIHdlIGRvbid0IGRlZmluZSBhIHNlcmlhbGl6YXRpb25cbiAgLy8gZm9yIHRoZW0pLCBidXQgdGhleSdyZSBpbW11dGFibGUgYW55d2F5LCBzbyB3ZSBjYW4gc3VwcG9ydCB0aGVtIGluIGNsb25lLlxuICBpZiAodiBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgIHJldHVybiB2O1xuICB9XG5cbiAgaWYgKEVKU09OLmlzQmluYXJ5KHYpKSB7XG4gICAgcmV0ID0gRUpTT04ubmV3QmluYXJ5KHYubGVuZ3RoKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHYubGVuZ3RoOyBpKyspIHtcbiAgICAgIHJldFtpXSA9IHZbaV07XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH1cblxuICBpZiAoQXJyYXkuaXNBcnJheSh2KSkge1xuICAgIHJldHVybiB2Lm1hcChFSlNPTi5jbG9uZSk7XG4gIH1cblxuICBpZiAoaXNBcmd1bWVudHModikpIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbSh2KS5tYXAoRUpTT04uY2xvbmUpO1xuICB9XG5cbiAgLy8gaGFuZGxlIGdlbmVyYWwgdXNlci1kZWZpbmVkIHR5cGVkIE9iamVjdHMgaWYgdGhleSBoYXZlIGEgY2xvbmUgbWV0aG9kXG4gIGlmIChpc0Z1bmN0aW9uKHYuY2xvbmUpKSB7XG4gICAgcmV0dXJuIHYuY2xvbmUoKTtcbiAgfVxuXG4gIC8vIGhhbmRsZSBvdGhlciBjdXN0b20gdHlwZXNcbiAgaWYgKEVKU09OLl9pc0N1c3RvbVR5cGUodikpIHtcbiAgICByZXR1cm4gRUpTT04uZnJvbUpTT05WYWx1ZShFSlNPTi5jbG9uZShFSlNPTi50b0pTT05WYWx1ZSh2KSksIHRydWUpO1xuICB9XG5cbiAgLy8gaGFuZGxlIG90aGVyIG9iamVjdHNcbiAgcmV0ID0ge307XG4gIGtleXNPZih2KS5mb3JFYWNoKChrZXkpID0+IHtcbiAgICByZXRba2V5XSA9IEVKU09OLmNsb25lKHZba2V5XSk7XG4gIH0pO1xuICByZXR1cm4gcmV0O1xufTtcblxuLyoqXG4gKiBAc3VtbWFyeSBBbGxvY2F0ZSBhIG5ldyBidWZmZXIgb2YgYmluYXJ5IGRhdGEgdGhhdCBFSlNPTiBjYW4gc2VyaWFsaXplLlxuICogQGxvY3VzIEFueXdoZXJlXG4gKiBAcGFyYW0ge051bWJlcn0gc2l6ZSBUaGUgbnVtYmVyIG9mIGJ5dGVzIG9mIGJpbmFyeSBkYXRhIHRvIGFsbG9jYXRlLlxuICovXG4vLyBFSlNPTi5uZXdCaW5hcnkgaXMgdGhlIHB1YmxpYyBkb2N1bWVudGVkIEFQSSBmb3IgdGhpcyBmdW5jdGlvbmFsaXR5LFxuLy8gYnV0IHRoZSBpbXBsZW1lbnRhdGlvbiBpcyBpbiB0aGUgJ2Jhc2U2NCcgcGFja2FnZSB0byBhdm9pZFxuLy8gaW50cm9kdWNpbmcgYSBjaXJjdWxhciBkZXBlbmRlbmN5LiAoSWYgdGhlIGltcGxlbWVudGF0aW9uIHdlcmUgaGVyZSxcbi8vIHRoZW4gJ2Jhc2U2NCcgd291bGQgaGF2ZSB0byB1c2UgRUpTT04ubmV3QmluYXJ5LCBhbmQgJ2Vqc29uJyB3b3VsZFxuLy8gYWxzbyBoYXZlIHRvIHVzZSAnYmFzZTY0Jy4pXG5FSlNPTi5uZXdCaW5hcnkgPSBCYXNlNjQubmV3QmluYXJ5O1xuXG5leHBvcnQgeyBFSlNPTiB9O1xuIiwiLy8gQmFzZWQgb24ganNvbjIuanMgZnJvbSBodHRwczovL2dpdGh1Yi5jb20vZG91Z2xhc2Nyb2NrZm9yZC9KU09OLWpzXG4vL1xuLy8gICAganNvbjIuanNcbi8vICAgIDIwMTItMTAtMDhcbi8vXG4vLyAgICBQdWJsaWMgRG9tYWluLlxuLy9cbi8vICAgIE5PIFdBUlJBTlRZIEVYUFJFU1NFRCBPUiBJTVBMSUVELiBVU0UgQVQgWU9VUiBPV04gUklTSy5cblxuZnVuY3Rpb24gcXVvdGUoc3RyaW5nKSB7XG4gIHJldHVybiBKU09OLnN0cmluZ2lmeShzdHJpbmcpO1xufVxuXG5jb25zdCBzdHIgPSAoa2V5LCBob2xkZXIsIHNpbmdsZUluZGVudCwgb3V0ZXJJbmRlbnQsIGNhbm9uaWNhbCkgPT4ge1xuICBjb25zdCB2YWx1ZSA9IGhvbGRlcltrZXldO1xuXG4gIC8vIFdoYXQgaGFwcGVucyBuZXh0IGRlcGVuZHMgb24gdGhlIHZhbHVlJ3MgdHlwZS5cbiAgc3dpdGNoICh0eXBlb2YgdmFsdWUpIHtcbiAgY2FzZSAnc3RyaW5nJzpcbiAgICByZXR1cm4gcXVvdGUodmFsdWUpO1xuICBjYXNlICdudW1iZXInOlxuICAgIC8vIEpTT04gbnVtYmVycyBtdXN0IGJlIGZpbml0ZS4gRW5jb2RlIG5vbi1maW5pdGUgbnVtYmVycyBhcyBudWxsLlxuICAgIHJldHVybiBpc0Zpbml0ZSh2YWx1ZSkgPyBTdHJpbmcodmFsdWUpIDogJ251bGwnO1xuICBjYXNlICdib29sZWFuJzpcbiAgICByZXR1cm4gU3RyaW5nKHZhbHVlKTtcbiAgLy8gSWYgdGhlIHR5cGUgaXMgJ29iamVjdCcsIHdlIG1pZ2h0IGJlIGRlYWxpbmcgd2l0aCBhbiBvYmplY3Qgb3IgYW4gYXJyYXkgb3JcbiAgLy8gbnVsbC5cbiAgY2FzZSAnb2JqZWN0Jzoge1xuICAgIC8vIER1ZSB0byBhIHNwZWNpZmljYXRpb24gYmx1bmRlciBpbiBFQ01BU2NyaXB0LCB0eXBlb2YgbnVsbCBpcyAnb2JqZWN0JyxcbiAgICAvLyBzbyB3YXRjaCBvdXQgZm9yIHRoYXQgY2FzZS5cbiAgICBpZiAoIXZhbHVlKSB7XG4gICAgICByZXR1cm4gJ251bGwnO1xuICAgIH1cbiAgICAvLyBNYWtlIGFuIGFycmF5IHRvIGhvbGQgdGhlIHBhcnRpYWwgcmVzdWx0cyBvZiBzdHJpbmdpZnlpbmcgdGhpcyBvYmplY3RcbiAgICAvLyB2YWx1ZS5cbiAgICBjb25zdCBpbm5lckluZGVudCA9IG91dGVySW5kZW50ICsgc2luZ2xlSW5kZW50O1xuICAgIGNvbnN0IHBhcnRpYWwgPSBbXTtcbiAgICBsZXQgdjtcblxuICAgIC8vIElzIHRoZSB2YWx1ZSBhbiBhcnJheT9cbiAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkgfHwgKHt9KS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHZhbHVlLCAnY2FsbGVlJykpIHtcbiAgICAgIC8vIFRoZSB2YWx1ZSBpcyBhbiBhcnJheS4gU3RyaW5naWZ5IGV2ZXJ5IGVsZW1lbnQuIFVzZSBudWxsIGFzIGFcbiAgICAgIC8vIHBsYWNlaG9sZGVyIGZvciBub24tSlNPTiB2YWx1ZXMuXG4gICAgICBjb25zdCBsZW5ndGggPSB2YWx1ZS5sZW5ndGg7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgIHBhcnRpYWxbaV0gPVxuICAgICAgICAgIHN0cihpLCB2YWx1ZSwgc2luZ2xlSW5kZW50LCBpbm5lckluZGVudCwgY2Fub25pY2FsKSB8fCAnbnVsbCc7XG4gICAgICB9XG5cbiAgICAgIC8vIEpvaW4gYWxsIG9mIHRoZSBlbGVtZW50cyB0b2dldGhlciwgc2VwYXJhdGVkIHdpdGggY29tbWFzLCBhbmQgd3JhcFxuICAgICAgLy8gdGhlbSBpbiBicmFja2V0cy5cbiAgICAgIGlmIChwYXJ0aWFsLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB2ID0gJ1tdJztcbiAgICAgIH0gZWxzZSBpZiAoaW5uZXJJbmRlbnQpIHtcbiAgICAgICAgdiA9ICdbXFxuJyArXG4gICAgICAgICAgaW5uZXJJbmRlbnQgK1xuICAgICAgICAgIHBhcnRpYWwuam9pbignLFxcbicgK1xuICAgICAgICAgIGlubmVySW5kZW50KSArXG4gICAgICAgICAgJ1xcbicgK1xuICAgICAgICAgIG91dGVySW5kZW50ICtcbiAgICAgICAgICAnXSc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2ID0gJ1snICsgcGFydGlhbC5qb2luKCcsJykgKyAnXSc7XG4gICAgICB9XG4gICAgICByZXR1cm4gdjtcbiAgICB9XG5cbiAgICAvLyBJdGVyYXRlIHRocm91Z2ggYWxsIG9mIHRoZSBrZXlzIGluIHRoZSBvYmplY3QuXG4gICAgbGV0IGtleXMgPSBPYmplY3Qua2V5cyh2YWx1ZSk7XG4gICAgaWYgKGNhbm9uaWNhbCkge1xuICAgICAga2V5cyA9IGtleXMuc29ydCgpO1xuICAgIH1cbiAgICBrZXlzLmZvckVhY2goayA9PiB7XG4gICAgICB2ID0gc3RyKGssIHZhbHVlLCBzaW5nbGVJbmRlbnQsIGlubmVySW5kZW50LCBjYW5vbmljYWwpO1xuICAgICAgaWYgKHYpIHtcbiAgICAgICAgcGFydGlhbC5wdXNoKHF1b3RlKGspICsgKGlubmVySW5kZW50ID8gJzogJyA6ICc6JykgKyB2KTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIEpvaW4gYWxsIG9mIHRoZSBtZW1iZXIgdGV4dHMgdG9nZXRoZXIsIHNlcGFyYXRlZCB3aXRoIGNvbW1hcyxcbiAgICAvLyBhbmQgd3JhcCB0aGVtIGluIGJyYWNlcy5cbiAgICBpZiAocGFydGlhbC5sZW5ndGggPT09IDApIHtcbiAgICAgIHYgPSAne30nO1xuICAgIH0gZWxzZSBpZiAoaW5uZXJJbmRlbnQpIHtcbiAgICAgIHYgPSAne1xcbicgK1xuICAgICAgICBpbm5lckluZGVudCArXG4gICAgICAgIHBhcnRpYWwuam9pbignLFxcbicgK1xuICAgICAgICBpbm5lckluZGVudCkgK1xuICAgICAgICAnXFxuJyArXG4gICAgICAgIG91dGVySW5kZW50ICtcbiAgICAgICAgJ30nO1xuICAgIH0gZWxzZSB7XG4gICAgICB2ID0gJ3snICsgcGFydGlhbC5qb2luKCcsJykgKyAnfSc7XG4gICAgfVxuICAgIHJldHVybiB2O1xuICB9XG5cbiAgZGVmYXVsdDogLy8gRG8gbm90aGluZ1xuICB9XG59O1xuXG4vLyBJZiB0aGUgSlNPTiBvYmplY3QgZG9lcyBub3QgeWV0IGhhdmUgYSBzdHJpbmdpZnkgbWV0aG9kLCBnaXZlIGl0IG9uZS5cbmNvbnN0IGNhbm9uaWNhbFN0cmluZ2lmeSA9ICh2YWx1ZSwgb3B0aW9ucykgPT4ge1xuICAvLyBNYWtlIGEgZmFrZSByb290IG9iamVjdCBjb250YWluaW5nIG91ciB2YWx1ZSB1bmRlciB0aGUga2V5IG9mICcnLlxuICAvLyBSZXR1cm4gdGhlIHJlc3VsdCBvZiBzdHJpbmdpZnlpbmcgdGhlIHZhbHVlLlxuICBjb25zdCBhbGxPcHRpb25zID0gT2JqZWN0LmFzc2lnbih7XG4gICAgaW5kZW50OiAnJyxcbiAgICBjYW5vbmljYWw6IGZhbHNlLFxuICB9LCBvcHRpb25zKTtcbiAgaWYgKGFsbE9wdGlvbnMuaW5kZW50ID09PSB0cnVlKSB7XG4gICAgYWxsT3B0aW9ucy5pbmRlbnQgPSAnICAnO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBhbGxPcHRpb25zLmluZGVudCA9PT0gJ251bWJlcicpIHtcbiAgICBsZXQgbmV3SW5kZW50ID0gJyc7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhbGxPcHRpb25zLmluZGVudDsgaSsrKSB7XG4gICAgICBuZXdJbmRlbnQgKz0gJyAnO1xuICAgIH1cbiAgICBhbGxPcHRpb25zLmluZGVudCA9IG5ld0luZGVudDtcbiAgfVxuICByZXR1cm4gc3RyKCcnLCB7Jyc6IHZhbHVlfSwgYWxsT3B0aW9ucy5pbmRlbnQsICcnLCBhbGxPcHRpb25zLmNhbm9uaWNhbCk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBjYW5vbmljYWxTdHJpbmdpZnk7XG4iLCJleHBvcnQgY29uc3QgaXNGdW5jdGlvbiA9IChmbikgPT4gdHlwZW9mIGZuID09PSAnZnVuY3Rpb24nO1xuXG5leHBvcnQgY29uc3QgaXNPYmplY3QgPSAoZm4pID0+IHR5cGVvZiBmbiA9PT0gJ29iamVjdCc7XG5cbmV4cG9ydCBjb25zdCBrZXlzT2YgPSAob2JqKSA9PiBPYmplY3Qua2V5cyhvYmopO1xuXG5leHBvcnQgY29uc3QgbGVuZ3RoT2YgPSAob2JqKSA9PiBPYmplY3Qua2V5cyhvYmopLmxlbmd0aDtcblxuZXhwb3J0IGNvbnN0IGhhc093biA9IChvYmosIHByb3ApID0+IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApO1xuXG5leHBvcnQgY29uc3QgY29udmVydE1hcFRvT2JqZWN0ID0gKG1hcCkgPT4gQXJyYXkuZnJvbShtYXApLnJlZHVjZSgoYWNjLCBba2V5LCB2YWx1ZV0pID0+IHtcbiAgLy8gcmVhc3NpZ24gdG8gbm90IGNyZWF0ZSBuZXcgb2JqZWN0XG4gIGFjY1trZXldID0gdmFsdWU7XG4gIHJldHVybiBhY2M7XG59LCB7fSk7XG5cbmV4cG9ydCBjb25zdCBpc0FyZ3VtZW50cyA9IG9iaiA9PiBvYmogIT0gbnVsbCAmJiBoYXNPd24ob2JqLCAnY2FsbGVlJyk7XG5cbmV4cG9ydCBjb25zdCBpc0luZk9yTmFOID1cbiAgb2JqID0+IE51bWJlci5pc05hTihvYmopIHx8IG9iaiA9PT0gSW5maW5pdHkgfHwgb2JqID09PSAtSW5maW5pdHk7XG5cbmV4cG9ydCBjb25zdCBjaGVja0Vycm9yID0ge1xuICBtYXhTdGFjazogKG1zZ0Vycm9yKSA9PiBuZXcgUmVnRXhwKCdNYXhpbXVtIGNhbGwgc3RhY2sgc2l6ZSBleGNlZWRlZCcsICdnJykudGVzdChtc2dFcnJvciksXG59O1xuXG5leHBvcnQgY29uc3QgaGFuZGxlRXJyb3IgPSAoZm4pID0+IGZ1bmN0aW9uKCkge1xuICB0cnkge1xuICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnN0IGlzTWF4U3RhY2sgPSBjaGVja0Vycm9yLm1heFN0YWNrKGVycm9yLm1lc3NhZ2UpO1xuICAgIGlmIChpc01heFN0YWNrKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbnZlcnRpbmcgY2lyY3VsYXIgc3RydWN0dXJlIHRvIEpTT04nKVxuICAgIH1cbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxufTtcbiJdfQ==
