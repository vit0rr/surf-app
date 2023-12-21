(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var OrderedDict;

var require = meteorInstall({"node_modules":{"meteor":{"ordered-dict":{"ordered_dict.js":function module(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                      //
// packages/ordered-dict/ordered_dict.js                                                                //
//                                                                                                      //
//////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                        //
module.export({
  OrderedDict: () => OrderedDict
});
// This file defines an ordered dictionary abstraction that is useful for
// maintaining a dataset backed by observeChanges.  It supports ordering items
// by specifying the item they now come before.

// The implementation is a dictionary that contains nodes of a doubly-linked
// list as its values.

// constructs a new element struct
// next and prev are whole elements, not keys.
function element(key, value, next, prev) {
  return {
    key: key,
    value: value,
    next: next,
    prev: prev
  };
}
class OrderedDict {
  constructor() {
    this._dict = Object.create(null);
    this._first = null;
    this._last = null;
    this._size = 0;
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }
    if (typeof args[0] === 'function') {
      this._stringify = args.shift();
    } else {
      this._stringify = function (x) {
        return x;
      };
    }
    args.forEach(kv => this.putBefore(kv[0], kv[1], null));
  }

  // the "prefix keys with a space" thing comes from here
  // https://github.com/documentcloud/underscore/issues/376#issuecomment-2815649
  _k(key) {
    return " " + this._stringify(key);
  }
  empty() {
    return !this._first;
  }
  size() {
    return this._size;
  }
  _linkEltIn(elt) {
    if (!elt.next) {
      elt.prev = this._last;
      if (this._last) this._last.next = elt;
      this._last = elt;
    } else {
      elt.prev = elt.next.prev;
      elt.next.prev = elt;
      if (elt.prev) elt.prev.next = elt;
    }
    if (this._first === null || this._first === elt.next) this._first = elt;
  }
  _linkEltOut(elt) {
    if (elt.next) elt.next.prev = elt.prev;
    if (elt.prev) elt.prev.next = elt.next;
    if (elt === this._last) this._last = elt.prev;
    if (elt === this._first) this._first = elt.next;
  }
  putBefore(key, item, before) {
    if (this._dict[this._k(key)]) throw new Error("Item " + key + " already present in OrderedDict");
    var elt = before ? element(key, item, this._dict[this._k(before)]) : element(key, item, null);
    if (typeof elt.next === "undefined") throw new Error("could not find item to put this one before");
    this._linkEltIn(elt);
    this._dict[this._k(key)] = elt;
    this._size++;
  }
  append(key, item) {
    this.putBefore(key, item, null);
  }
  remove(key) {
    var elt = this._dict[this._k(key)];
    if (typeof elt === "undefined") throw new Error("Item " + key + " not present in OrderedDict");
    this._linkEltOut(elt);
    this._size--;
    delete this._dict[this._k(key)];
    return elt.value;
  }
  get(key) {
    if (this.has(key)) {
      return this._dict[this._k(key)].value;
    }
  }
  has(key) {
    return Object.prototype.hasOwnProperty.call(this._dict, this._k(key));
  }

  // Iterate through the items in this dictionary in order, calling
  // iter(value, key, index) on each one.

  // Stops whenever iter returns OrderedDict.BREAK, or after the last element.
  forEach(iter) {
    let context = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    var i = 0;
    var elt = this._first;
    while (elt !== null) {
      var b = iter.call(context, elt.value, elt.key, i);
      if (b === OrderedDict.BREAK) return;
      elt = elt.next;
      i++;
    }
  }
  first() {
    if (this.empty()) {
      return;
    }
    return this._first.key;
  }
  firstValue() {
    if (this.empty()) {
      return;
    }
    return this._first.value;
  }
  last() {
    if (this.empty()) {
      return;
    }
    return this._last.key;
  }
  lastValue() {
    if (this.empty()) {
      return;
    }
    return this._last.value;
  }
  prev(key) {
    if (this.has(key)) {
      var elt = this._dict[this._k(key)];
      if (elt.prev) return elt.prev.key;
    }
    return null;
  }
  next(key) {
    if (this.has(key)) {
      var elt = this._dict[this._k(key)];
      if (elt.next) return elt.next.key;
    }
    return null;
  }
  moveBefore(key, before) {
    var elt = this._dict[this._k(key)];
    var eltBefore = before ? this._dict[this._k(before)] : null;
    if (typeof elt === "undefined") {
      throw new Error("Item to move is not present");
    }
    if (typeof eltBefore === "undefined") {
      throw new Error("Could not find element to move this one before");
    }
    if (eltBefore === elt.next)
      // no moving necessary
      return;
    // remove from its old place
    this._linkEltOut(elt);
    // patch into its new place
    elt.next = eltBefore;
    this._linkEltIn(elt);
  }

  // Linear, sadly.
  indexOf(key) {
    var ret = null;
    this.forEach((v, k, i) => {
      if (this._k(k) === this._k(key)) {
        ret = i;
        return OrderedDict.BREAK;
      }
      return;
    });
    return ret;
  }
  _checkRep() {
    Object.keys(this._dict).forEach(k => {
      const v = this._dict[k];
      if (v.next === v) {
        throw new Error("Next is a loop");
      }
      if (v.prev === v) {
        throw new Error("Prev is a loop");
      }
    });
  }
}
OrderedDict.BREAK = {
  "break": true
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

var exports = require("/node_modules/meteor/ordered-dict/ordered_dict.js");

/* Exports */
Package._define("ordered-dict", exports, {
  OrderedDict: OrderedDict
});

})();

//# sourceURL=meteor://💻app/packages/ordered-dict.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvb3JkZXJlZC1kaWN0L29yZGVyZWRfZGljdC5qcyJdLCJuYW1lcyI6WyJtb2R1bGUiLCJleHBvcnQiLCJPcmRlcmVkRGljdCIsImVsZW1lbnQiLCJrZXkiLCJ2YWx1ZSIsIm5leHQiLCJwcmV2IiwiY29uc3RydWN0b3IiLCJfZGljdCIsIk9iamVjdCIsImNyZWF0ZSIsIl9maXJzdCIsIl9sYXN0IiwiX3NpemUiLCJfbGVuIiwiYXJndW1lbnRzIiwibGVuZ3RoIiwiYXJncyIsIkFycmF5IiwiX2tleSIsIl9zdHJpbmdpZnkiLCJzaGlmdCIsIngiLCJmb3JFYWNoIiwia3YiLCJwdXRCZWZvcmUiLCJfayIsImVtcHR5Iiwic2l6ZSIsIl9saW5rRWx0SW4iLCJlbHQiLCJfbGlua0VsdE91dCIsIml0ZW0iLCJiZWZvcmUiLCJFcnJvciIsImFwcGVuZCIsInJlbW92ZSIsImdldCIsImhhcyIsInByb3RvdHlwZSIsImhhc093blByb3BlcnR5IiwiY2FsbCIsIml0ZXIiLCJjb250ZXh0IiwidW5kZWZpbmVkIiwiaSIsImIiLCJCUkVBSyIsImZpcnN0IiwiZmlyc3RWYWx1ZSIsImxhc3QiLCJsYXN0VmFsdWUiLCJtb3ZlQmVmb3JlIiwiZWx0QmVmb3JlIiwiaW5kZXhPZiIsInJldCIsInYiLCJrIiwiX2NoZWNrUmVwIiwia2V5cyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUFBLE1BQU0sQ0FBQ0MsTUFBTSxDQUFDO0VBQUNDLFdBQVcsRUFBQ0EsQ0FBQSxLQUFJQTtBQUFXLENBQUMsQ0FBQztBQUE1QztBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsU0FBU0MsT0FBT0EsQ0FBQ0MsR0FBRyxFQUFFQyxLQUFLLEVBQUVDLElBQUksRUFBRUMsSUFBSSxFQUFFO0VBQ3ZDLE9BQU87SUFDTEgsR0FBRyxFQUFFQSxHQUFHO0lBQ1JDLEtBQUssRUFBRUEsS0FBSztJQUNaQyxJQUFJLEVB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Q0FBQyxDQUFDaUMsQ0FBQyxFQUFFQyxDQUFDLEVBQUVaLENBQUMsS0FBSztNQUN4QixJQUFJLElBQUksQ0FBQ25CLEVBQUUsQ0FBQytCLENBQUMsQ0FBQyxLQUFLLElBQUksQ0FBQy9CLEVBQUUsQ0FBQ3ZCLEdBQUcsQ0FBQyxFQUFFO1FBQy9Cb0QsR0FBRyxHQUFHVixDQUFDO1FBQ1AsT0FBTzVDLFdBQVcsQ0FBQzhDLEtBQUs7TUFDMUI7TUFDQTtJQUNGLENBQUMsQ0FBQztJQUNGLE9BQU9RLEdBQUc7RUFDWjtFQUVBRyxTQUFTQSxDQUFBLEVBQUc7SUFDVmpELE1BQU0sQ0FBQ2tELElBQUksQ0FBQyxJQUFJLENBQUNuRCxLQUFLLENBQUMsQ0FBQ2UsT0FBTyxDQUFDa0MsQ0FBQyxJQUFJO01BQ25DLE1BQU1ELENBQUMsR0FBRyxJQUFJLENBQUNoRCxLQUFLLENBQUNpRCxDQUFDLENBQUM7TUFDdkIsSUFBSUQsQ0FBQyxDQUFDbkQsSUFBSSxLQUFLbUQsQ0FBQyxFQUFFO1FBQ2hCLE1BQU0sSUFBSXRCLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQztNQUNuQztNQUNBLElBQUlzQixDQUFDLENBQUNsRCxJQUFJLEtBQUtrRCxDQUFDLEVBQUU7UUFDaEIsTUFBTSxJQUFJdEIsS0FBSyxDQUFDLGdCQUFnQixDQUFDO01BQ25DO0lBQ0YsQ0FBQyxDQUFDO0VBQ0o7QUFDRjtBQUVBakMsV0FBVyxDQUFDOEMsS0FBSyxHQUFHO0VBQUMsT0FBTyxFQUFFO0FBQUksQ0FBQyxDIiwiZmlsZSI6Ii9wYWNrYWdlcy9vcmRlcmVkLWRpY3QuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBUaGlzIGZpbGUgZGVmaW5lcyBhbiBvcmRlcmVkIGRpY3Rpb25hcnkgYWJzdHJhY3Rpb24gdGhhdCBpcyB1c2VmdWwgZm9yXG4vLyBtYWludGFpbmluZyBhIGRhdGFzZXQgYmFja2VkIGJ5IG9ic2VydmVDaGFuZ2VzLiAgSXQgc3VwcG9ydHMgb3JkZXJpbmcgaXRlbXNcbi8vIGJ5IHNwZWNpZnlpbmcgdGhlIGl0ZW0gdGhleSBub3cgY29tZSBiZWZvcmUuXG5cbi8vIFRoZSBpbXBsZW1lbnRhdGlvbiBpcyBhIGRpY3Rpb25hcnkgdGhhdCBjb250YWlucyBub2RlcyBvZiBhIGRvdWJseS1saW5rZWRcbi8vIGxpc3QgYXMgaXRzIHZhbHVlcy5cblxuLy8gY29uc3RydWN0cyBhIG5ldyBlbGVtZW50IHN0cnVjdFxuLy8gbmV4dCBhbmQgcHJldiBhcmUgd2hvbGUgZWxlbWVudHMsIG5vdCBrZXlzLlxuZnVuY3Rpb24gZWxlbWVudChrZXksIHZhbHVlLCBuZXh0LCBwcmV2KSB7XG4gIHJldHVybiB7XG4gICAga2V5OiBrZXksXG4gICAgdmFsdWU6IHZhbHVlLFxuICAgIG5leHQ6IG5leHQsXG4gICAgcHJldjogcHJldlxuICB9O1xufVxuXG5leHBvcnQgY2xhc3MgT3JkZXJlZERpY3Qge1xuICBjb25zdHJ1Y3RvciguLi5hcmdzKSB7XG4gICAgdGhpcy5fZGljdCA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgdGhpcy5fZmlyc3QgPSBudWxsO1xuICAgIHRoaXMuX2xhc3QgPSBudWxsO1xuICAgIHRoaXMuX3NpemUgPSAwO1xuXG4gICAgaWYgKHR5cGVvZiBhcmdzWzBdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLl9zdHJpbmdpZnkgPSBhcmdzLnNoaWZ0KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX3N0cmluZ2lmeSA9IGZ1bmN0aW9uICh4KSB7IHJldHVybiB4OyB9O1xuICAgIH1cblxuICAgIGFyZ3MuZm9yRWFjaChrdiA9PiB0aGlzLnB1dEJlZm9yZShrdlswXSwga3ZbMV0sIG51bGwpKTtcbiAgfVxuXG4gIC8vIHRoZSBcInByZWZpeCBrZXlzIHdpdGggYSBzcGFjZVwiIHRoaW5nIGNvbWVzIGZyb20gaGVyZVxuICAvLyBodHRwczovL2dpdGh1Yi5jb20vZG9jdW1lbnRjbG91ZC91bmRlcnNjb3JlL2lzc3Vlcy8zNzYjaXNzdWVjb21tZW50LTI4MTU2NDlcbiAgX2soa2V5KSB7XG4gICAgcmV0dXJuIFwiIFwiICsgdGhpcy5fc3RyaW5naWZ5KGtleSk7XG4gIH1cblxuICBlbXB0eSgpIHtcbiAgICByZXR1cm4gIXRoaXMuX2ZpcnN0O1xuICB9XG5cbiAgc2l6ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5fc2l6ZTtcbiAgfVxuXG4gIF9saW5rRWx0SW4oZWx0KSB7XG4gICAgaWYgKCFlbHQubmV4dCkge1xuICAgICAgZWx0LnByZXYgPSB0aGlzLl9sYXN0O1xuICAgICAgaWYgKHRoaXMuX2xhc3QpXG4gICAgICAgIHRoaXMuX2xhc3QubmV4dCA9IGVsdDtcbiAgICAgIHRoaXMuX2xhc3QgPSBlbHQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGVsdC5wcmV2ID0gZWx0Lm5leHQucHJldjtcbiAgICAgIGVsdC5uZXh0LnByZXYgPSBlbHQ7XG4gICAgICBpZiAoZWx0LnByZXYpXG4gICAgICAgIGVsdC5wcmV2Lm5leHQgPSBlbHQ7XG4gICAgfVxuICAgIGlmICh0aGlzLl9maXJzdCA9PT0gbnVsbCB8fCB0aGlzLl9maXJzdCA9PT0gZWx0Lm5leHQpXG4gICAgICB0aGlzLl9maXJzdCA9IGVsdDtcbiAgfVxuXG4gIF9saW5rRWx0T3V0KGVsdCkge1xuICAgIGlmIChlbHQubmV4dClcbiAgICAgIGVsdC5uZXh0LnByZXYgPSBlbHQucHJldjtcbiAgICBpZiAoZWx0LnByZXYpXG4gICAgICBlbHQucHJldi5uZXh0ID0gZWx0Lm5leHQ7XG4gICAgaWYgKGVsdCA9PT0gdGhpcy5fbGFzdClcbiAgICAgIHRoaXMuX2xhc3QgPSBlbHQucHJldjtcbiAgICBpZiAoZWx0ID09PSB0aGlzLl9maXJzdClcbiAgICAgIHRoaXMuX2ZpcnN0ID0gZWx0Lm5leHQ7XG4gIH1cblxuICBwdXRCZWZvcmUoa2V5LCBpdGVtLCBiZWZvcmUpIHtcbiAgICBpZiAodGhpcy5fZGljdFt0aGlzLl9rKGtleSldKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSXRlbSBcIiArIGtleSArIFwiIGFscmVhZHkgcHJlc2VudCBpbiBPcmRlcmVkRGljdFwiKTtcbiAgICB2YXIgZWx0ID0gYmVmb3JlID9cbiAgICAgIGVsZW1lbnQoa2V5LCBpdGVtLCB0aGlzLl9kaWN0W3RoaXMuX2soYmVmb3JlKV0pIDpcbiAgICAgIGVsZW1lbnQoa2V5LCBpdGVtLCBudWxsKTtcbiAgICBpZiAodHlwZW9mIGVsdC5uZXh0ID09PSBcInVuZGVmaW5lZFwiKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiY291bGQgbm90IGZpbmQgaXRlbSB0byBwdXQgdGhpcyBvbmUgYmVmb3JlXCIpO1xuICAgIHRoaXMuX2xpbmtFbHRJbihlbHQpO1xuICAgIHRoaXMuX2RpY3RbdGhpcy5fayhrZXkpXSA9IGVsdDtcbiAgICB0aGlzLl9zaXplKys7XG4gIH1cblxuICBhcHBlbmQoa2V5LCBpdGVtKSB7XG4gICAgdGhpcy5wdXRCZWZvcmUoa2V5LCBpdGVtLCBudWxsKTtcbiAgfVxuXG4gIHJlbW92ZShrZXkpIHtcbiAgICB2YXIgZWx0ID0gdGhpcy5fZGljdFt0aGlzLl9rKGtleSldO1xuICAgIGlmICh0eXBlb2YgZWx0ID09PSBcInVuZGVmaW5lZFwiKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSXRlbSBcIiArIGtleSArIFwiIG5vdCBwcmVzZW50IGluIE9yZGVyZWREaWN0XCIpO1xuICAgIHRoaXMuX2xpbmtFbHRPdXQoZWx0KTtcbiAgICB0aGlzLl9zaXplLS07XG4gICAgZGVsZXRlIHRoaXMuX2RpY3RbdGhpcy5fayhrZXkpXTtcbiAgICByZXR1cm4gZWx0LnZhbHVlO1xuICB9XG5cbiAgZ2V0KGtleSkge1xuICAgIGlmICh0aGlzLmhhcyhrZXkpKSB7XG4gICAgICByZXR1cm4gdGhpcy5fZGljdFt0aGlzLl9rKGtleSldLnZhbHVlO1xuICAgIH1cbiAgfVxuXG4gIGhhcyhrZXkpIHtcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKFxuICAgICAgdGhpcy5fZGljdCxcbiAgICAgIHRoaXMuX2soa2V5KVxuICAgICk7XG4gIH1cblxuICAvLyBJdGVyYXRlIHRocm91Z2ggdGhlIGl0ZW1zIGluIHRoaXMgZGljdGlvbmFyeSBpbiBvcmRlciwgY2FsbGluZ1xuICAvLyBpdGVyKHZhbHVlLCBrZXksIGluZGV4KSBvbiBlYWNoIG9uZS5cblxuICAvLyBTdG9wcyB3aGVuZXZlciBpdGVyIHJldHVybnMgT3JkZXJlZERpY3QuQlJFQUssIG9yIGFmdGVyIHRoZSBsYXN0IGVsZW1lbnQuXG4gIGZvckVhY2goaXRlciwgY29udGV4dCA9IG51bGwpIHtcbiAgICB2YXIgaSA9IDA7XG4gICAgdmFyIGVsdCA9IHRoaXMuX2ZpcnN0O1xuICAgIHdoaWxlIChlbHQgIT09IG51bGwpIHtcbiAgICAgIHZhciBiID0gaXRlci5jYWxsKGNvbnRleHQsIGVsdC52YWx1ZSwgZWx0LmtleSwgaSk7XG4gICAgICBpZiAoYiA9PT0gT3JkZXJlZERpY3QuQlJFQUspIHJldHVybjtcbiAgICAgIGVsdCA9IGVsdC5uZXh0O1xuICAgICAgaSsrO1xuICAgIH1cbiAgfVxuXG4gIGZpcnN0KCkge1xuICAgIGlmICh0aGlzLmVtcHR5KCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2ZpcnN0LmtleTtcbiAgfVxuXG4gIGZpcnN0VmFsdWUoKSB7XG4gICAgaWYgKHRoaXMuZW1wdHkoKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fZmlyc3QudmFsdWU7XG4gIH1cblxuICBsYXN0KCkge1xuICAgIGlmICh0aGlzLmVtcHR5KCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2xhc3Qua2V5O1xuICB9XG5cbiAgbGFzdFZhbHVlKCkge1xuICAgIGlmICh0aGlzLmVtcHR5KCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2xhc3QudmFsdWU7XG4gIH1cblxuICBwcmV2KGtleSkge1xuICAgIGlmICh0aGlzLmhhcyhrZXkpKSB7XG4gICAgICB2YXIgZWx0ID0gdGhpcy5fZGljdFt0aGlzLl9rKGtleSldO1xuICAgICAgaWYgKGVsdC5wcmV2KVxuICAgICAgICByZXR1cm4gZWx0LnByZXYua2V5O1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIG5leHQoa2V5KSB7XG4gICAgaWYgKHRoaXMuaGFzKGtleSkpIHtcbiAgICAgIHZhciBlbHQgPSB0aGlzLl9kaWN0W3RoaXMuX2soa2V5KV07XG4gICAgICBpZiAoZWx0Lm5leHQpXG4gICAgICAgIHJldHVybiBlbHQubmV4dC5rZXk7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgbW92ZUJlZm9yZShrZXksIGJlZm9yZSkge1xuICAgIHZhciBlbHQgPSB0aGlzLl9kaWN0W3RoaXMuX2soa2V5KV07XG4gICAgdmFyIGVsdEJlZm9yZSA9IGJlZm9yZSA/IHRoaXMuX2RpY3RbdGhpcy5fayhiZWZvcmUpXSA6IG51bGw7XG4gICAgaWYgKHR5cGVvZiBlbHQgPT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkl0ZW0gdG8gbW92ZSBpcyBub3QgcHJlc2VudFwiKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBlbHRCZWZvcmUgPT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCBmaW5kIGVsZW1lbnQgdG8gbW92ZSB0aGlzIG9uZSBiZWZvcmVcIik7XG4gICAgfVxuICAgIGlmIChlbHRCZWZvcmUgPT09IGVsdC5uZXh0KSAvLyBubyBtb3ZpbmcgbmVjZXNzYXJ5XG4gICAgICByZXR1cm47XG4gICAgLy8gcmVtb3ZlIGZyb20gaXRzIG9sZCBwbGFjZVxuICAgIHRoaXMuX2xpbmtFbHRPdXQoZWx0KTtcbiAgICAvLyBwYXRjaCBpbnRvIGl0cyBuZXcgcGxhY2VcbiAgICBlbHQubmV4dCA9IGVsdEJlZm9yZTtcbiAgICB0aGlzLl9saW5rRWx0SW4oZWx0KTtcbiAgfVxuXG4gIC8vIExpbmVhciwgc2FkbHkuXG4gIGluZGV4T2Yoa2V5KSB7XG4gICAgdmFyIHJldCA9IG51bGw7XG4gICAgdGhpcy5mb3JFYWNoKCh2LCBrLCBpKSA9PiB7XG4gICAgICBpZiAodGhpcy5fayhrKSA9PT0gdGhpcy5fayhrZXkpKSB7XG4gICAgICAgIHJldCA9IGk7XG4gICAgICAgIHJldHVybiBPcmRlcmVkRGljdC5CUkVBSztcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9KTtcbiAgICByZXR1cm4gcmV0O1xuICB9XG5cbiAgX2NoZWNrUmVwKCkge1xuICAgIE9iamVjdC5rZXlzKHRoaXMuX2RpY3QpLmZvckVhY2goayA9PiB7XG4gICAgICBjb25zdCB2ID0gdGhpcy5fZGljdFtrXTtcbiAgICAgIGlmICh2Lm5leHQgPT09IHYpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTmV4dCBpcyBhIGxvb3BcIik7XG4gICAgICB9XG4gICAgICBpZiAodi5wcmV2ID09PSB2KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlByZXYgaXMgYSBsb29wXCIpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG5cbk9yZGVyZWREaWN0LkJSRUFLID0ge1wiYnJlYWtcIjogdHJ1ZX07XG4iXX0=
