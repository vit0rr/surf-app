(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var EJSON = Package.ejson.EJSON;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var IdMap;

var require = meteorInstall({"node_modules":{"meteor":{"id-map":{"id-map.js":function module(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////
//                                                                              //
// packages/id-map/id-map.js                                                    //
//                                                                              //
//////////////////////////////////////////////////////////////////////////////////
                                                                                //
module.export({
  IdMap: () => IdMap
});
class IdMap {
  constructor(idStringify, idParse) {
    this._map = new Map();
    this._idStringify = idStringify || JSON.stringify;
    this._idParse = idParse || JSON.parse;
  }

  // Some of these methods are designed to match methods on OrderedDict, since
  // (eg) ObserveMultiplex and _CachingChangeObserver use them interchangeably.
  // (Conceivably, this should be replaced with "UnorderedDict" with a specific
  // set of methods that overlap between the two.)

  get(id) {
    const key = this._idStringify(id);
    return this._map.get(key);
  }
  set(id, value) {
    const key = this._idStringify(id);
    this._map.set(key, value);
  }
  remove(id) {
    const key = this._idStringify(id);
    this._map.delete(key);
  }
  has(id) {
    const key = this._idStringify(id);
    return this._map.has(key);
  }
  empty() {
    return this._map.size === 0;
  }
  clear() {
    this._map.clear();
  }

  // Iterates over the items in the map. Return `false` to break the loop.
  forEach(iterator) {
    // don't use _.each, because we can't break out of it.
    for (let [key, value] of this._map) {
      const breakIfFalse = iterator.call(null, value, this._idParse(key));
      if (breakIfFalse === false) {
        return;
      }
    }
  }
  size() {
    return this._map.size;
  }
  setDefault(id, def) {
    const key = this._idStringify(id);
    if (this._map.has(key)) {
      return this._map.get(key);
    }
    this._map.set(key, def);
    return def;
  }

  // Assumes that values are EJSON-cloneable, and that we don't need to clone
  // IDs (ie, that nobody is going to mutate an ObjectId).
  clone() {
    const clone = new IdMap(this._idStringify, this._idParse);
    // copy directly to avoid stringify/parse overhead
    this._map.forEach(function (value, key) {
      clone._map.set(key, EJSON.clone(value));
    });
    return clone;
  }
}
//////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

var exports = require("/node_modules/meteor/id-map/id-map.js");

/* Exports */
Package._define("id-map", exports, {
  IdMap: IdMap
});

})();

//# sourceURL=meteor://💻app/packages/id-map.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvaWQtbWFwL2lkLW1hcC5qcyJdLCJuYW1lcyI6WyJtb2R1bGUiLCJleHBvcnQiLCJJZE1hcCIsImNvbnN0cnVjdG9yIiwiaWRTdHJpbmdpZnkiLCJpZFBhcnNlIiwiX21hcCIsIk1hcCIsIl9pZFN0cmluZ2lmeSIsIkpTT04iLCJzdHJpbmdpZnkiLCJfaWRQYXJzZSIsInBhcnNlIiwiZ2V0IiwiaWQiLCJrZXkiLCJzZXQiLCJ2YWx1ZSIsInJlbW92ZSIsImRlbGV0ZSIsImhhcyIsImVtcHR5Iiwic2l6ZSIsImNsZWFyIiwiZm9yRWFjaCIsIml0ZXJhdG9yIiwiYnJlYWtJZkZhbHNlIiwiY2FsbCIsInNldERlZmF1bHQiLCJkZWYiLCJjbG9uZSIsIkVKU09OIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUFBLE1BQU0sQ0FBQ0MsTUFBTSxDQUFDO0VBQUNDLEtBQUssRUFBQ0EsQ0FBQSxLQUFJQTtBQUFLLENBQUMsQ0FBQztBQUN6QixNQUFNQSxLQUFLLENBQUM7RUFDakJDLFdBQVdBLENBQUNDLFdBQVcsRUFBRUMsT0FBTyxFQUFFO0lBQ2hDLElBQUksQ0FBQ0MsSUFBSSxHQUFHLElBQUlDLEdBQUcsQ0FBQyxDQUFDO0lBQ3JCLElBQUksQ0FBQ0MsWUFBWSxHQUFHSixXQUFXLElBQUlLLElBQUksQ0FBQ0MsU0FBUztJQUNqRCxJQUFJLENBQUNDLFFBQVEsR0FBR04sT0FBTyxJQUFJSSxJQUFJLENBQUNHLEtBQUs7RUFDdkM7O0VBRUY7RUFDQTtFQUNBO0VBQ0E7O0VBRUVDLEdBQUdBLENBQUNDLEVBQUUsRUFBRTtJQUNOLE1BQU1DLEdBQUcsR0FBRyxJQUFJLENBQUNQLFlBQVksQ0FBQ00sRUFBRSxDQUFDO0lBQ2pDLE9BQU8sSUFBSSxDQUFDUixJQUFJLENBQUNPLEdBQUcsQ0FBQ0UsR0FBRyxDQUFDO0VBQzNCO0VBRUFDLEdBQUdBLENBQUNGLEVBQUUsRUFBRUcsS0FBSyxFQUFFO0lBQ2IsTUFBTUYsR0FBRyxHQUFHLElBQUksQ0FBQ1AsWUFBWSxDQUFDTSxFQUFFLENBQUM7SUFDakMsSUFBSSxDQUFDUixJQUFJLENBQUNVLEdBQUcsQ0FBQ0QsR0FBRyxFQUFFRSxLQUFLLENBQUM7RUFDM0I7RUFFQUMsTUFBTUEsQ0FBQ0osRUFBRSxFQUFFO0lBQ1QsTUFBTUMsR0FBRyxHQUFHLElBQUksQ0FBQ1AsWUFBWSxDQUFDTSxFQUFFLENBQUM7SUFDakMsSUFBSSxDQUFDUixJQUFJLENBQUNhLE1BQU0sQ0FBQ0osR0FBRyxDQUFDO0VBQ3ZCO0VBRUFLLEdBQUdBLENBQUNOLEVBQUUsRUFBRTtJQUNOLE1BQU1DLEdBQUcsR0FBRyxJQUFJLENBQUNQLFlBQVksQ0FBQ00sRUFBRSxDQUFDO0lBQ2pDLE9BQU8sSUFBSSxDQUFDUixJQUFJLENBQUNjLEdBQUcsQ0FBQ0wsR0FBRyxDQUFDO0VBQzNCO0VBRUFNLEtBQUtBLENBQUEsRUFBRztJQUNOLE9BQU8sSUFBSSxDQUFDZixJQUFJLENBQUNnQixJQUFJLEtBQUssQ0FBQztFQUM3QjtFQUVBQyxLQUFLQSxDQUFBLEVBQUc7SUFDTixJQUFJLENBQUNqQixJQUFJLENBQUNpQixLQUFLLENBQUMsQ0FBQztFQUNuQjs7RUFFQTtFQUNBQyxPQUFPQSxDQUFDQyxRQUFRLEVBQUU7SUFDaEI7SUFDQSxLQUFLLElBQUksQ0FBQ1YsR0FBRyxFQUFFRSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUNYLElBQUksRUFBQztNQUNqQyxNQUFNb0IsWUFBWSxHQUFHRCxRQUFRLENBQUNFLElBQUksQ0FDaEMsSUFBSSxFQUNKVixLQUFLLEVBQ0wsSUFBSSxDQUFDTixRQUFRLENBQUNJLEdBQUcsQ0FDbkIsQ0FBQztNQUNELElBQUlXLFlBQVksS0FBSyxLQUFLLEVBQUU7UUFDMUI7TUFDRjtJQUNGO0VBQ0Y7RUFFQUosSUFBSUEsQ0FBQSxFQUFHO0lBQ0wsT0FBTyxJQUFJLENBQUNoQixJQUFJLENBQUNnQixJQUFJO0VBQ3ZCO0VBRUFNLFVBQVVBLENBQUNkLEVBQUUsRUFBRWUsR0FBRyxFQUFFO0lBQ2xCLE1BQU1kLEdBQUcsR0FBRyxJQUFJLENBQUNQLFlBQVksQ0FBQ00sRUFBRSxDQUFDO0lBQ2pDLElBQUksSUFBSSxDQUFDUixJQUFJLENBQUNjLEdBQUcsQ0FBQ0wsR0FBRyxDQUFDLEVBQUU7TUFDdEIsT0FBTyxJQUFJLENBQUNULElBQUksQ0FBQ08sR0FBRyxDQUFDRSxHQUFHLENBQUM7SUFDM0I7SUFDQSxJQUFJLENBQUNULElBQUksQ0FBQ1UsR0FBRyxDQUFDRCxHQUFHLEVBQUVjLEdBQUcsQ0FBQztJQUN2QixPQUFPQSxHQUFHO0VBQ1o7O0VBRUE7RUFDQTtFQUNBQyxLQUFLQSxDQUFBLEVBQUc7SUFDTixNQUFNQSxLQUFLLEdBQUcsSUFBSTVCLEtBQUssQ0FBQyxJQUFJLENBQUNNLFlBQVksRUFBRSxJQUFJLENBQUNHLFFBQVEsQ0FBQztJQUN6RDtJQUNBLElBQUksQ0FBQ0wsSUFBSSxDQUFDa0IsT0FBTyxDQUFDLFVBQVNQLEtBQUssRUFBRUYsR0FBRyxFQUFDO01BQ3BDZSxLQUFLLENBQUN4QixJQUFJLENBQUNVLEdBQUcsQ0FBQ0QsR0FBRyxFQUFFZ0IsS0FBSyxDQUFDRCxLQUFLLENBQUNiLEtBQUssQ0FBQyxDQUFDO0lBQ3pDLENBQUMsQ0FBQztJQUNGLE9BQU9hLEtBQUs7RUFDZDtBQUNGLEMiLCJmaWxlIjoiL3BhY2thZ2VzL2lkLW1hcC5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxuZXhwb3J0IGNsYXNzIElkTWFwIHtcbiAgY29uc3RydWN0b3IoaWRTdHJpbmdpZnksIGlkUGFyc2UpIHtcbiAgICB0aGlzLl9tYXAgPSBuZXcgTWFwKCk7XG4gICAgdGhpcy5faWRTdHJpbmdpZnkgPSBpZFN0cmluZ2lmeSB8fCBKU09OLnN0cmluZ2lmeTtcbiAgICB0aGlzLl9pZFBhcnNlID0gaWRQYXJzZSB8fCBKU09OLnBhcnNlO1xuICB9XG5cbi8vIFNvbWUgb2YgdGhlc2UgbWV0aG9kcyBhcmUgZGVzaWduZWQgdG8gbWF0Y2ggbWV0aG9kcyBvbiBPcmRlcmVkRGljdCwgc2luY2Vcbi8vIChlZykgT2JzZXJ2ZU11bHRpcGxleCBhbmQgX0NhY2hpbmdDaGFuZ2VPYnNlcnZlciB1c2UgdGhlbSBpbnRlcmNoYW5nZWFibHkuXG4vLyAoQ29uY2VpdmFibHksIHRoaXMgc2hvdWxkIGJlIHJlcGxhY2VkIHdpdGggXCJVbm9yZGVyZWREaWN0XCIgd2l0aCBhIHNwZWNpZmljXG4vLyBzZXQgb2YgbWV0aG9kcyB0aGF0IG92ZXJsYXAgYmV0d2VlbiB0aGUgdHdvLilcblxuICBnZXQoaWQpIHtcbiAgICBjb25zdCBrZXkgPSB0aGlzLl9pZFN0cmluZ2lmeShpZCk7XG4gICAgcmV0dXJuIHRoaXMuX21hcC5nZXQoa2V5KTtcbiAgfVxuXG4gIHNldChpZCwgdmFsdWUpIHtcbiAgICBjb25zdCBrZXkgPSB0aGlzLl9pZFN0cmluZ2lmeShpZCk7XG4gICAgdGhpcy5fbWFwLnNldChrZXksIHZhbHVlKTtcbiAgfVxuXG4gIHJlbW92ZShpZCkge1xuICAgIGNvbnN0IGtleSA9IHRoaXMuX2lkU3RyaW5naWZ5KGlkKTtcbiAgICB0aGlzLl9tYXAuZGVsZXRlKGtleSk7XG4gIH1cblxuICBoYXMoaWQpIHtcbiAgICBjb25zdCBrZXkgPSB0aGlzLl9pZFN0cmluZ2lmeShpZCk7XG4gICAgcmV0dXJuIHRoaXMuX21hcC5oYXMoa2V5KTtcbiAgfVxuXG4gIGVtcHR5KCkge1xuICAgIHJldHVybiB0aGlzLl9tYXAuc2l6ZSA9PT0gMDtcbiAgfVxuXG4gIGNsZWFyKCkge1xuICAgIHRoaXMuX21hcC5jbGVhcigpO1xuICB9XG5cbiAgLy8gSXRlcmF0ZXMgb3ZlciB0aGUgaXRlbXMgaW4gdGhlIG1hcC4gUmV0dXJuIGBmYWxzZWAgdG8gYnJlYWsgdGhlIGxvb3AuXG4gIGZvckVhY2goaXRlcmF0b3IpIHtcbiAgICAvLyBkb24ndCB1c2UgXy5lYWNoLCBiZWNhdXNlIHdlIGNhbid0IGJyZWFrIG91dCBvZiBpdC5cbiAgICBmb3IgKGxldCBba2V5LCB2YWx1ZV0gb2YgdGhpcy5fbWFwKXtcbiAgICAgIGNvbnN0IGJyZWFrSWZGYWxzZSA9IGl0ZXJhdG9yLmNhbGwoXG4gICAgICAgIG51bGwsXG4gICAgICAgIHZhbHVlLFxuICAgICAgICB0aGlzLl9pZFBhcnNlKGtleSlcbiAgICAgICk7XG4gICAgICBpZiAoYnJlYWtJZkZhbHNlID09PSBmYWxzZSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgc2l6ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5fbWFwLnNpemU7XG4gIH1cblxuICBzZXREZWZhdWx0KGlkLCBkZWYpIHtcbiAgICBjb25zdCBrZXkgPSB0aGlzLl9pZFN0cmluZ2lmeShpZCk7XG4gICAgaWYgKHRoaXMuX21hcC5oYXMoa2V5KSkge1xuICAgICAgcmV0dXJuIHRoaXMuX21hcC5nZXQoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5fbWFwLnNldChrZXksIGRlZik7XG4gICAgcmV0dXJuIGRlZjtcbiAgfVxuXG4gIC8vIEFzc3VtZXMgdGhhdCB2YWx1ZXMgYXJlIEVKU09OLWNsb25lYWJsZSwgYW5kIHRoYXQgd2UgZG9uJ3QgbmVlZCB0byBjbG9uZVxuICAvLyBJRHMgKGllLCB0aGF0IG5vYm9keSBpcyBnb2luZyB0byBtdXRhdGUgYW4gT2JqZWN0SWQpLlxuICBjbG9uZSgpIHtcbiAgICBjb25zdCBjbG9uZSA9IG5ldyBJZE1hcCh0aGlzLl9pZFN0cmluZ2lmeSwgdGhpcy5faWRQYXJzZSk7XG4gICAgLy8gY29weSBkaXJlY3RseSB0byBhdm9pZCBzdHJpbmdpZnkvcGFyc2Ugb3ZlcmhlYWRcbiAgICB0aGlzLl9tYXAuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwga2V5KXtcbiAgICAgIGNsb25lLl9tYXAuc2V0KGtleSwgRUpTT04uY2xvbmUodmFsdWUpKTtcbiAgICB9KTtcbiAgICByZXR1cm4gY2xvbmU7XG4gIH1cbn1cbiJdfQ==
