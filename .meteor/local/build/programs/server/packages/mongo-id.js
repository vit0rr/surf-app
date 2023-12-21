(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var EJSON = Package.ejson.EJSON;
var Random = Package.random.Random;
var ECMAScript = Package.ecmascript.ECMAScript;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var hexString, MongoID;

var require = meteorInstall({"node_modules":{"meteor":{"mongo-id":{"id.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                           //
// packages/mongo-id/id.js                                                                   //
//                                                                                           //
///////////////////////////////////////////////////////////////////////////////////////////////
                                                                                             //
module.export({
  MongoID: () => MongoID
});
let EJSON;
module.link("meteor/ejson", {
  EJSON(v) {
    EJSON = v;
  }
}, 0);
let Random;
module.link("meteor/random", {
  Random(v) {
    Random = v;
  }
}, 1);
const MongoID = {};
MongoID._looksLikeObjectID = str => str.length === 24 && str.match(/^[0-9a-f]*$/);
MongoID.ObjectID = class ObjectID {
  constructor(hexString) {
    //random-based impl of Mongo ObjectID
    if (hexString) {
      hexString = hexString.toLowerCase();
      if (!MongoID._looksLikeObjectID(hexString)) {
        throw new Error('Invalid hexadecimal string for creating an ObjectID');
      }
      // meant to work with _.isEqual(), which relies on structural equality
      this._str = hexString;
    } else {
      this._str = Random.hexString(24);
    }
  }
  equals(other) {
    return other instanceof MongoID.ObjectID && this.valueOf() === other.valueOf();
  }
  toString() {
    return "ObjectID(\"".concat(this._str, "\")");
  }
  clone() {
    return new MongoID.ObjectID(this._str);
  }
  typeName() {
    return 'oid';
  }
  getTimestamp() {
    return Number.parseInt(this._str.substr(0, 8), 16);
  }
  valueOf() {
    return this._str;
  }
  toJSONValue() {
    return this.valueOf();
  }
  toHexString() {
    return this.valueOf();
  }
};
EJSON.addType('oid', str => new MongoID.ObjectID(str));
MongoID.idStringify = id => {
  if (id instanceof MongoID.ObjectID) {
    return id.valueOf();
  } else if (typeof id === 'string') {
    var firstChar = id.charAt(0);
    if (id === '') {
      return id;
    } else if (firstChar === '-' ||
    // escape previously dashed strings
    firstChar === '~' ||
    // escape escaped numbers, true, false
    MongoID._looksLikeObjectID(id) ||
    // escape object-id-form strings
    firstChar === '{') {
      // escape object-form strings, for maybe implementing later
      return "-".concat(id);
    } else {
      return id; // other strings go through unchanged.
    }
  } else if (id === undefined) {
    return '-';
  } else if (typeof id === 'object' && id !== null) {
    throw new Error('Meteor does not currently support objects other than ObjectID as ids');
  } else {
    // Numbers, true, false, null
    return "~".concat(JSON.stringify(id));
  }
};
MongoID.idParse = id => {
  var firstChar = id.charAt(0);
  if (id === '') {
    return id;
  } else if (id === '-') {
    return undefined;
  } else if (firstChar === '-') {
    return id.substr(1);
  } else if (firstChar === '~') {
    return JSON.parse(id.substr(1));
  } else if (MongoID._looksLikeObjectID(id)) {
    return new MongoID.ObjectID(id);
  } else {
    return id;
  }
};
///////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

var exports = require("/node_modules/meteor/mongo-id/id.js");

/* Exports */
Package._define("mongo-id", exports, {
  MongoID: MongoID
});

})();

//# sourceURL=meteor://💻app/packages/mongo-id.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbW9uZ28taWQvaWQuanMiXSwibmFtZXMiOlsibW9kdWxlIiwiZXhwb3J0IiwiTW9uZ29JRCIsIkVKU09OIiwibGluayIsInYiLCJSYW5kb20iLCJfbG9va3NMaWtlT2JqZWN0SUQiLCJzdHIiLCJsZW5ndGgiLCJtYXRjaCIsIk9iamVjdElEIiwiY29uc3RydWN0b3IiLCJoZXhTdHJpbmciLCJ0b0xvd2VyQ2FzZSIsIkVycm9yIiwiX3N0ciIsImVxdWFscyIsIm90aGVyIiwidmFsdWVPZiIsInRvU3RyaW5nIiwiY29uY2F0IiwiY2xvbmUiLCJ0eXBlTmFtZSIsImdldFRpbWVzdGFtcCIsIk51bWJlciIsInBhcnNlSW50Iiwic3Vic3RyIiwidG9KU09OVmFsdWUiLCJ0b0hleFN0cmluZyIsImFkZFR5cGUiLCJpZFN0cmluZ2lmeSIsImlkIiwiZmlyc3RDaGFyIiwiY2hhckF0IiwidW5kZWZpbmVkIiwiSlNPTiIsInN0cmluZ2lmeSIsImlkUGFyc2UiLCJwYXJzZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQUEsTUFBTSxDQUFDQyxNQUFNLENBQUM7RUFBQ0MsT0FBTyxFQUFDQSxDQUFBLEtBQUlBO0FBQU8sQ0FBQyxDQUFDO0FBQUMsSUFBSUMsS0FBSztBQUFDSCxNQUFNLENBQUNJLElBQUksQ0FBQyxjQUFjLEVBQUM7RUFBQ0QsS0FBS0EsQ0FBQ0UsQ0FBQyxFQUFDO0lBQUNGLEtBQUssR0FBQ0UsQ0FBQztFQUFBO0FBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQztBQUFDLElBQUlDLE1BQU07QUFBQ04sTUFBTSxDQUFDSSxJQUFJLENBQUMsZUFBZSxFQUFDO0VBQUNFLE1BQU1BLENBQUNELENBQUMsRUFBQztJQUFDQyxNQUFNLEdBQUNELENBQUM7RUFBQTtBQUFDLENBQUMsRUFBQyxDQUFDLENBQUM7QUFHaEssTUFBTUgsT0FBTyxHQUFHLENBQUMsQ0FBQztBQUVsQkEsT0FBTyxDQUFD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LEVBQUUsS0FBSyxJQUFJLEVBQUU7SUFDaEQsTUFBTSxJQUFJakIsS0FBSyxDQUFDLHNFQUFzRSxDQUFDO0VBQ3pGLENBQUMsTUFBTTtJQUFFO0lBQ1AsV0FBQU0sTUFBQSxDQUFXZSxJQUFJLENBQUNDLFNBQVMsQ0FBQ0wsRUFBRSxDQUFDO0VBQy9CO0FBQ0YsQ0FBQztBQUVEOUIsT0FBTyxDQUFDb0MsT0FBTyxHQUFJTixFQUFFLElBQUs7RUFDeEIsSUFBSUMsU0FBUyxHQUFHRCxFQUFFLENBQUNFLE1BQU0sQ0FBQyxDQUFDLENBQUM7RUFDNUIsSUFBSUYsRUFBRSxLQUFLLEVBQUUsRUFBRTtJQUNiLE9BQU9BLEVBQUU7RUFDWCxDQUFDLE1BQU0sSUFBSUEsRUFBRSxLQUFLLEdBQUcsRUFBRTtJQUNyQixPQUFPRyxTQUFTO0VBQ2xCLENBQUMsTUFBTSxJQUFJRixTQUFTLEtBQUssR0FBRyxFQUFFO0lBQzVCLE9BQU9ELEVBQUUsQ0FBQ0wsTUFBTSxDQUFDLENBQUMsQ0FBQztFQUNyQixDQUFDLE1BQU0sSUFBSU0sU0FBUyxLQUFLLEdBQUcsRUFBRTtJQUM1QixPQUFPRyxJQUFJLENBQUNHLEtBQUssQ0FBQ1AsRUFBRSxDQUFDTCxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDakMsQ0FBQyxNQUFNLElBQUl6QixPQUFPLENBQUNLLGtCQUFrQixDQUFDeUIsRUFBRSxDQUFDLEVBQUU7SUFDekMsT0FBTyxJQUFJOUIsT0FBTyxDQUFDUyxRQUFRLENBQUNxQixFQUFFLENBQUM7RUFDakMsQ0FBQyxNQUFNO0lBQ0wsT0FBT0EsRUFBRTtFQUNYO0FBQ0YsQ0FBQyxDIiwiZmlsZSI6Ii9wYWNrYWdlcy9tb25nby1pZC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEVKU09OIH0gZnJvbSAnbWV0ZW9yL2Vqc29uJztcbmltcG9ydCB7IFJhbmRvbSB9IGZyb20gJ21ldGVvci9yYW5kb20nO1xuXG5jb25zdCBNb25nb0lEID0ge307XG5cbk1vbmdvSUQuX2xvb2tzTGlrZU9iamVjdElEID0gc3RyID0+IHN0ci5sZW5ndGggPT09IDI0ICYmIHN0ci5tYXRjaCgvXlswLTlhLWZdKiQvKTtcblxuTW9uZ29JRC5PYmplY3RJRCA9IGNsYXNzIE9iamVjdElEIHtcbiAgY29uc3RydWN0b3IgKGhleFN0cmluZykge1xuICAgIC8vcmFuZG9tLWJhc2VkIGltcGwgb2YgTW9uZ28gT2JqZWN0SURcbiAgICBpZiAoaGV4U3RyaW5nKSB7XG4gICAgICBoZXhTdHJpbmcgPSBoZXhTdHJpbmcudG9Mb3dlckNhc2UoKTtcbiAgICAgIGlmICghTW9uZ29JRC5fbG9va3NMaWtlT2JqZWN0SUQoaGV4U3RyaW5nKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgaGV4YWRlY2ltYWwgc3RyaW5nIGZvciBjcmVhdGluZyBhbiBPYmplY3RJRCcpO1xuICAgICAgfVxuICAgICAgLy8gbWVhbnQgdG8gd29yayB3aXRoIF8uaXNFcXVhbCgpLCB3aGljaCByZWxpZXMgb24gc3RydWN0dXJhbCBlcXVhbGl0eVxuICAgICAgdGhpcy5fc3RyID0gaGV4U3RyaW5nO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9zdHIgPSBSYW5kb20uaGV4U3RyaW5nKDI0KTtcbiAgICB9XG4gIH1cblxuICBlcXVhbHMob3RoZXIpIHtcbiAgICByZXR1cm4gb3RoZXIgaW5zdGFuY2VvZiBNb25nb0lELk9iamVjdElEICYmXG4gICAgdGhpcy52YWx1ZU9mKCkgPT09IG90aGVyLnZhbHVlT2YoKTtcbiAgfVxuXG4gIHRvU3RyaW5nKCkge1xuICAgIHJldHVybiBgT2JqZWN0SUQoXCIke3RoaXMuX3N0cn1cIilgO1xuICB9XG5cbiAgY2xvbmUoKSB7XG4gICAgcmV0dXJuIG5ldyBNb25nb0lELk9iamVjdElEKHRoaXMuX3N0cik7XG4gIH1cblxuICB0eXBlTmFtZSgpIHtcbiAgICByZXR1cm4gJ29pZCc7XG4gIH1cblxuICBnZXRUaW1lc3RhbXAoKSB7XG4gICAgcmV0dXJuIE51bWJlci5wYXJzZUludCh0aGlzLl9zdHIuc3Vic3RyKDAsIDgpLCAxNik7XG4gIH1cblxuICB2YWx1ZU9mKCkge1xuICAgIHJldHVybiB0aGlzLl9zdHI7XG4gIH1cblxuICB0b0pTT05WYWx1ZSgpIHtcbiAgICByZXR1cm4gdGhpcy52YWx1ZU9mKCk7XG4gIH1cblxuICB0b0hleFN0cmluZygpIHtcbiAgICByZXR1cm4gdGhpcy52YWx1ZU9mKCk7XG4gIH1cblxufVxuXG5FSlNPTi5hZGRUeXBlKCdvaWQnLCBzdHIgPT4gbmV3IE1vbmdvSUQuT2JqZWN0SUQoc3RyKSk7XG5cbk1vbmdvSUQuaWRTdHJpbmdpZnkgPSAoaWQpID0+IHtcbiAgaWYgKGlkIGluc3RhbmNlb2YgTW9uZ29JRC5PYmplY3RJRCkge1xuICAgIHJldHVybiBpZC52YWx1ZU9mKCk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGlkID09PSAnc3RyaW5nJykge1xuICAgIHZhciBmaXJzdENoYXIgPSBpZC5jaGFyQXQoMCk7XG4gICAgaWYgKGlkID09PSAnJykge1xuICAgICAgcmV0dXJuIGlkO1xuICAgIH0gZWxzZSBpZiAoZmlyc3RDaGFyID09PSAnLScgfHwgLy8gZXNjYXBlIHByZXZpb3VzbHkgZGFzaGVkIHN0cmluZ3NcbiAgICAgICAgICAgICAgIGZpcnN0Q2hhciA9PT0gJ34nIHx8IC8vIGVzY2FwZSBlc2NhcGVkIG51bWJlcnMsIHRydWUsIGZhbHNlXG4gICAgICAgICAgICAgICBNb25nb0lELl9sb29rc0xpa2VPYmplY3RJRChpZCkgfHwgLy8gZXNjYXBlIG9iamVjdC1pZC1mb3JtIHN0cmluZ3NcbiAgICAgICAgICAgICAgIGZpcnN0Q2hhciA9PT0gJ3snKSB7IC8vIGVzY2FwZSBvYmplY3QtZm9ybSBzdHJpbmdzLCBmb3IgbWF5YmUgaW1wbGVtZW50aW5nIGxhdGVyXG4gICAgICByZXR1cm4gYC0ke2lkfWA7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBpZDsgLy8gb3RoZXIgc3RyaW5ncyBnbyB0aHJvdWdoIHVuY2hhbmdlZC5cbiAgICB9XG4gIH0gZWxzZSBpZiAoaWQgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiAnLSc7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGlkID09PSAnb2JqZWN0JyAmJiBpZCAhPT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0ZW9yIGRvZXMgbm90IGN1cnJlbnRseSBzdXBwb3J0IG9iamVjdHMgb3RoZXIgdGhhbiBPYmplY3RJRCBhcyBpZHMnKTtcbiAgfSBlbHNlIHsgLy8gTnVtYmVycywgdHJ1ZSwgZmFsc2UsIG51bGxcbiAgICByZXR1cm4gYH4ke0pTT04uc3RyaW5naWZ5KGlkKX1gO1xuICB9XG59O1xuXG5Nb25nb0lELmlkUGFyc2UgPSAoaWQpID0+IHtcbiAgdmFyIGZpcnN0Q2hhciA9IGlkLmNoYXJBdCgwKTtcbiAgaWYgKGlkID09PSAnJykge1xuICAgIHJldHVybiBpZDtcbiAgfSBlbHNlIGlmIChpZCA9PT0gJy0nKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfSBlbHNlIGlmIChmaXJzdENoYXIgPT09ICctJykge1xuICAgIHJldHVybiBpZC5zdWJzdHIoMSk7XG4gIH0gZWxzZSBpZiAoZmlyc3RDaGFyID09PSAnficpIHtcbiAgICByZXR1cm4gSlNPTi5wYXJzZShpZC5zdWJzdHIoMSkpO1xuICB9IGVsc2UgaWYgKE1vbmdvSUQuX2xvb2tzTGlrZU9iamVjdElEKGlkKSkge1xuICAgIHJldHVybiBuZXcgTW9uZ29JRC5PYmplY3RJRChpZCk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGlkO1xuICB9XG59O1xuXG5leHBvcnQgeyBNb25nb0lEIH07XG4iXX0=
