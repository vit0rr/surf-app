(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var LocalCollection = Package.minimongo.LocalCollection;
var Minimongo = Package.minimongo.Minimongo;
var check = Package.check.check;
var Match = Package.check.Match;
var EJSON = Package.ejson.EJSON;
var DDP = Package['ddp-client'].DDP;
var DDPServer = Package['ddp-server'].DDPServer;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var AllowDeny;

var require = meteorInstall({"node_modules":{"meteor":{"allow-deny":{"allow-deny.js":function module(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/allow-deny/allow-deny.js                                                                              //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
///
/// Remote methods and access control.
///

const hasOwn = Object.prototype.hasOwnProperty;

// Restrict default mutators on collection. allow() and deny() take the
// same options:
//
// options.insert {Function(userId, doc)}
//   return true to allow/deny adding this document
//
// options.update {Function(userId, docs, fields, modifier)}
//   return true to allow/deny updating these documents.
//   `fields` is passed as an array of fields that are to be modified
//
// options.remove {Function(userId, docs)}
//   return true to allow/deny removing these documents
//
// options.fetch {Array}
//   Fields to fetch for these validators. If any call to allow or deny
//   does not have this option then all fields are loaded.
//
// allow and deny can be called multiple times. The validators are
// evaluated as follows:
// - If neither deny() nor allow() has been called on the collection,
//   then the request is allowed if and only if the "insecure" smart
//   package is in use.
// - Otherwise, if any deny() function returns true, the request is denied.
// - Otherwise, if any allow() function returns true, the request is allowed.
// - Otherwise, the request is denied.
//
// Meteor may call your deny() and allow() functions in any order, and may not
// call all of them if it is able to make a decision without calling them all
// (so don't include side effects).

AllowDeny = {
  CollectionPrototype: {}
};

// In the `mongo` package, we will extend Mongo.Collection.prototype with these
// methods
const CollectionPrototype = AllowDeny.CollectionPrototype;

/**
 * @summary Allow users to write directly to this collection from client code, subject to limitations you define.
 * @locus Server
 * @method allow
 * @memberOf Mongo.Collection
 * @instance
 * @param {Object} options
 * @param {Function} options.insert,update,remove Functions that look at a proposed modification to the database and return true if it should be allowed.
 * @param {String[]} options.fetch Optional performance enhancement. Limits the fields that will be fetched from the database for inspection by your `update` and `remove` functions.
 * @param {Function} options.transform Overrides `transform` on the  [`Collection`](#collections).  Pass `null` to disable transformation.
 */
CollectionPrototype.allow = function (options) {
  addValidator(this, 'allow', options);
};

/**
 * @summary Override `allow` rules.
 * @locus Server
 * @method deny
 * @memberOf Mongo.Collection
 * @instance
 * @param {Object} options
 * @param {Function} options.insert,update,remove Functions that look at a proposed modification to the database and return true if it should be denied, even if an [allow](#allow) rule says otherwise.
 * @param {String[]} options.fetch Optional performance enhancement. Limits the fields that will be fetched from the database for inspection by your `update` and `remove` functions.
 * @param {Function} options.transform Overrides `transform` on the  [`Collection`](#collections).  Pass `null` to disable transformation.
 */
CollectionPrototype.deny = function (options) {
  addValidator(this, 'deny', options);
};
CollectionPrototype._defineMutationMethods = function (options) {
  const self = this;
  options = options || {};

  // set to true once we call any allow or deny methods. If true, use
  // allow/deny semantics. If false, use insecure mode semantics.
  self._restricted = false;

  // Insecure mode (default to allowing writes). Defaults to 'undefined' which
  // means insecure iff the insecure package is loaded. This property can be
  // overriden by tests or packages wishing to change insecure mode behavior of
  // their collections.
  self._insecure = undefined;
  self._validators = {
    insert: {
      allow: [],
      deny: []
    },
    update: {
      allow: [],
      deny: []
    },
    remove: {
      allow: [],
      deny: []
    },
    upsert: {
      allow: [],
      deny: []
    },
    // dummy arrays; can't set these!
    fetch: [],
    fetchAllFields: false
  };
  if (!self._name) return; // anonymous collection

  // XXX Think about method namespacing. Maybe methods should be
  // "Meteor:Mongo:insert/NAME"?
  self._prefix = '/' + self._name + '/';

  // Mutation Methods
  // Minimongo on the server gets no stubs; instead, by default
  // it wait()s until its result is ready, yielding.
  // This matches the behavior of macromongo on the server better.
  // XXX see #MeteorServerNull
  if (self._connection && (self._connection === Meteor.server || Meteor.isClient)) {
    const m = {};
    ['insert', 'update', 'remove'].forEach(method => {
      const methodName = self._prefix + method;
      if (options.useExisting) {
        const handlerPropName = Meteor.isClient ? '_methodHandlers' : 'method_handlers';
        // Do not try to create additional methods if this has already been called.
        // (Otherwise the .methods() call below will throw an error.)
        if (self._connection[handlerPropName] && typeof self._connection[handlerPropName][methodName] === 'function') return;
      }
      m[methodName] = function /* ... */
      () {
        // All the methods do their own validation, instead of using check().
        check(arguments, [Match.Any]);
        const args = Array.from(arguments);
        try {
          // For an insert, if the client didn't specify an _id, generate one
          // now; because this uses DDP.randomStream, it will be consistent with
          // what the client generated. We generate it now rather than later so
          // that if (eg) an allow/deny rule does an insert to the same
          // collection (not that it really should), the generated _id will
          // still be the first use of the stream and will be consistent.
          //
          // However, we don't actually stick the _id onto the document yet,
          // because we want allow/deny rules to be able to differentiate
          // between arbitrary client-specified _id fields and merely
          // client-controlled-via-randomSeed fields.
          let generatedId = null;
          if (method === "insert" && !hasOwn.call(args[0], '_id')) {
            generatedId = self._makeNewID();
          }
          if (this.isSimulation) {
            // In a client simulation, you can do any mutation (even with a
            // complex selector).
            if (generatedId !== null) args[0]._id = generatedId;
            return self._collection[method].apply(self._collection, args);
          }

          // This is the server receiving a method call from the client.

          // We don't allow arbitrary selectors in mutations from the client: only
          // single-ID selectors.
          if (method !== 'insert') throwIfSelectorIsNotId(args[0], method);
          if (self._restricted) {
            // short circuit if there is no way it will pass.
            if (self._validators[method].allow.length === 0) {
              throw new Meteor.Error(403, "Access denied. No allow validators set on restricted " + "collection for method '" + method + "'.");
            }
            const validatedMethodName = '_validated' + method.charAt(0).toUpperCase() + method.slice(1);
            args.unshift(this.userId);
            method === 'insert' && args.push(generatedId);
            return self[validatedMethodName].apply(self, args);
          } else if (self._isInsecure()) {
            if (generatedId !== null) args[0]._id = generatedId;
            // In insecure mode, allow any mutation (with a simple selector).
            // XXX This is kind of bogus.  Instead of blindly passing whatever
            //     we get from the network to this function, we should actually
            //     know the correct arguments for the function and pass just
            //     them.  For example, if you have an extraneous extra null
            //     argument and this is Mongo on the server, the .wrapAsync'd
            //     functions like update will get confused and pass the
            //     "fut.resolver()" in the wrong slot, where _update will never
            //     invoke it. Bam, broken DDP connection.  Probably should just
            //     take this whole method and write it three times, invoking
            //     helpers for the common code.
            return self._collection[method].apply(self._collection, args);
          } else {
            // In secure mode, if we haven't called allow or deny, then nothing
            // is permitted.
            throw new Meteor.Error(403, "Access denied");
          }
        } catch (e) {
          if (e.name === 'MongoError' ||
          // for old versions of MongoDB (probably not necessary but it's here just in case)
          e.name === 'BulkWriteError' ||
          // for newer versions of MongoDB (https://docs.mongodb.com/drivers/node/current/whats-new/#bulkwriteerror---mongobulkwriteerror)
          e.name === 'MongoBulkWriteError' || e.name === 'MinimongoError') {
            throw new Meteor.Error(409, e.toString());
          } else {
            throw e;
          }
        }
      };
    });
    self._connection.methods(m);
  }
};
CollectionPrototype._updateFetch = function (fields) {
  const self = this;
  if (!self._validators.fetchAllFields) {
    if (fields) {
      const union = Object.create(null);
      const add = names => names && names.forEach(name => union[name] = 1);
      add(self._validators.fetch);
      add(fields);
      self._validators.fetch = Object.keys(union);
    } else {
      self._validators.fetchAllFields = true;
      // clear fetch just to make sure we don't accidentally read it
      self._validators.fetch = null;
    }
  }
};
CollectionPrototype._isInsecure = function () {
  const self = this;
  if (self._insecure === undefined) return !!Package.insecure;
  return self._insecure;
};
CollectionPrototype._validatedInsert = function (userId, doc, generatedId) {
  const self = this;

  // call user validators.
  // Any deny returns true means denied.
  if (self._validators.insert.deny.some(validator => {
    return validator(userId, docToValidate(validator, doc, generatedId));
  })) {
    throw new Meteor.Error(403, "Access denied");
  }
  // Any allow returns true means proceed. Throw error if they all fail.
  if (self._validators.insert.allow.every(validator => {
    return !validator(userId, docToValidate(validator, doc, generatedId));
  })) {
    throw new Meteor.Error(403, "Access denied");
  }

  // If we generated an ID above, insert it now: after the validation, but
  // before actually inserting.
  if (generatedId !== null) doc._id = generatedId;
  self._collection.insert.call(self._collection, doc);
};

// Simulate a mongo `update` operation while validating that the access
// control rules set by calls to `allow/deny` are satisfied. If all
// pass, rewrite the mongo operation to use $in to set the list of
// document ids to change ##ValidatedChange
CollectionPrototype._validatedUpdate = function (userId, selector, mutator, options) {
  const self = this;
  check(mutator, Object);
  options = Object.assign(Object.create(null), options);
  if (!LocalCollection._selectorIsIdPerhapsAsObject(selector)) throw new Error("validated update should be of a single ID");

  // We don't support upserts because they don't fit nicely into allow/deny
  // rules.
  if (options.upsert) throw new Meteor.Error(403, "Access denied. Upserts not " + "allowed in a restricted collection.");
  const noReplaceError = "Access denied. In a restricted collection you can only" + " update documents, not replace them. Use a Mongo update operator, such " + "as '$set'.";
  const mutatorKeys = Object.keys(mutator);

  // compute modified fields
  const modifiedFields = {};
  if (mutatorKeys.length === 0) {
    throw new Meteor.Error(403, noReplaceError);
  }
  mutatorKeys.forEach(op => {
    const params = mutator[op];
    if (op.charAt(0) !== '$') {
      throw new Meteor.Error(403, noReplaceError);
    } else if (!hasOwn.call(ALLOWED_UPDATE_OPERATIONS, op)) {
      throw new Meteor.Error(403, "Access denied. Operator " + op + " not allowed in a restricted collection.");
    } else {
      Object.keys(params).forEach(field => {
        // treat dotted fields as if they are replacing their
        // top-level part
        if (field.indexOf('.') !== -1) field = field.substring(0, field.indexOf('.'));

        // record the field we are trying to change
        modifiedFields[field] = true;
      });
    }
  });
  const fields = Object.keys(modifiedFields);
  const findOptions = {
    transform: null
  };
  if (!self._validators.fetchAllFields) {
    findOptions.fields = {};
    self._validators.fetch.forEach(fieldName => {
      findOptions.fields[fieldName] = 1;
    });
  }
  const doc = self._collection.findOne(selector, findOptions);
  if (!doc)
    // none satisfied!
    return 0;

  // call user validators.
  // Any deny returns true means denied.
  if (self._validators.update.deny.some(validator => {
    const factoriedDoc = transformDoc(validator, doc);
    return validator(userId, factoriedDoc, fields, mutator);
  })) {
    throw new Meteor.Error(403, "Access denied");
  }
  // Any allow returns true means proceed. Throw error if they all fail.
  if (self._validators.update.allow.every(validator => {
    const factoriedDoc = transformDoc(validator, doc);
    return !validator(userId, factoriedDoc, fields, mutator);
  })) {
    throw new Meteor.Error(403, "Access denied");
  }
  options._forbidReplace = true;

  // Back when we supported arbitrary client-provided selectors, we actually
  // rewrote the selector to include an _id clause before passing to Mongo to
  // avoid races, but since selector is guaranteed to already just be an ID, we
  // don't have to any more.

  return self._collection.update.call(self._collection, selector, mutator, options);
};

// Only allow these operations in validated updates. Specifically
// whitelist operations, rather than blacklist, so new complex
// operations that are added aren't automatically allowed. A complex
// operation is one that does more than just modify its target
// field. For now this contains all update operations except '$rename'.
// http://docs.mongodb.org/manual/reference/operators/#update
const ALLOWED_UPDATE_OPERATIONS = {
  $inc: 1,
  $set: 1,
  $unset: 1,
  $addToSet: 1,
  $pop: 1,
  $pullAll: 1,
  $pull: 1,
  $pushAll: 1,
  $push: 1,
  $bit: 1
};

// Simulate a mongo `remove` operation while validating access control
// rules. See #ValidatedChange
CollectionPrototype._validatedRemove = function (userId, selector) {
  const self = this;
  const findOptions = {
    transform: null
  };
  if (!self._validators.fetchAllFields) {
    findOptions.fields = {};
    self._validators.fetch.forEach(fieldName => {
      findOptions.fields[fieldName] = 1;
    });
  }
  const doc = self._collection.findOne(selector, findOptions);
  if (!doc) return 0;

  // call user validators.
  // Any deny returns true means denied.
  if (self._validators.remove.deny.some(validator => {
    return validator(userId, transformDoc(validator, doc));
  })) {
    throw new Meteor.Error(403, "Access denied");
  }
  // Any allow returns true means proceed. Throw error if they all fail.
  if (self._validators.remove.allow.every(validator => {
    return !validator(userId, transformDoc(validator, doc));
  })) {
    throw new Meteor.Error(403, "Access denied");
  }

  // Back when we supported arbitrary client-provided selectors, we actually
  // rewrote the selector to {_id: {$in: [ids that we found]}} before passing to
  // Mongo to avoid races, but since selector is guaranteed to already just be
  // an ID, we don't have to any more.

  return self._collection.remove.call(self._collection, selector);
};
CollectionPrototype._callMutatorMethod = function _callMutatorMethod(name, args, callback) {
  if (Meteor.isClient && !callback && !alreadyInSimulation()) {
    // Client can't block, so it can't report errors by exception,
    // only by callback. If they forget the callback, give them a
    // default one that logs the error, so they aren't totally
    // baffled if their writes don't work because their database is
    // down.
    // Don't give a default callback in simulation, because inside stubs we
    // want to return the results from the local collection immediately and
    // not force a callback.
    callback = function (err) {
      if (err) Meteor._debug(name + " failed", err);
    };
  }

  // For two out of three mutator methods, the first argument is a selector
  const firstArgIsSelector = name === "update" || name === "remove";
  if (firstArgIsSelector && !alreadyInSimulation()) {
    // If we're about to actually send an RPC, we should throw an error if
    // this is a non-ID selector, because the mutation methods only allow
    // single-ID selectors. (If we don't throw here, we'll see flicker.)
    throwIfSelectorIsNotId(args[0], name);
  }
  const mutatorMethodName = this._prefix + name;
  return this._connection.apply(mutatorMethodName, args, {
    returnStubValue: true
  }, callback);
};
function transformDoc(validator, doc) {
  if (validator.transform) return validator.transform(doc);
  return doc;
}
function docToValidate(validator, doc, generatedId) {
  let ret = doc;
  if (validator.transform) {
    ret = EJSON.clone(doc);
    // If you set a server-side transform on your collection, then you don't get
    // to tell the difference between "client specified the ID" and "server
    // generated the ID", because transforms expect to get _id.  If you want to
    // do that check, you can do it with a specific
    // `C.allow({insert: f, transform: null})` validator.
    if (generatedId !== null) {
      ret._id = generatedId;
    }
    ret = validator.transform(ret);
  }
  return ret;
}
function addValidator(collection, allowOrDeny, options) {
  // validate keys
  const validKeysRegEx = /^(?:insert|update|remove|fetch|transform)$/;
  Object.keys(options).forEach(key => {
    if (!validKeysRegEx.test(key)) throw new Error(allowOrDeny + ": Invalid key: " + key);
  });
  collection._restricted = true;
  ['insert', 'update', 'remove'].forEach(name => {
    if (hasOwn.call(options, name)) {
      if (!(options[name] instanceof Function)) {
        throw new Error(allowOrDeny + ": Value for `" + name + "` must be a function");
      }

      // If the transform is specified at all (including as 'null') in this
      // call, then take that; otherwise, take the transform from the
      // collection.
      if (options.transform === undefined) {
        options[name].transform = collection._transform; // already wrapped
      } else {
        options[name].transform = LocalCollection.wrapTransform(options.transform);
      }
      collection._validators[name][allowOrDeny].push(options[name]);
    }
  });

  // Only update the fetch fields if we're passed things that affect
  // fetching. This way allow({}) and allow({insert: f}) don't result in
  // setting fetchAllFields
  if (options.update || options.remove || options.fetch) {
    if (options.fetch && !(options.fetch instanceof Array)) {
      throw new Error(allowOrDeny + ": Value for `fetch` must be an array");
    }
    collection._updateFetch(options.fetch);
  }
}
function throwIfSelectorIsNotId(selector, methodName) {
  if (!LocalCollection._selectorIsIdPerhapsAsObject(selector)) {
    throw new Meteor.Error(403, "Not permitted. Untrusted code may only " + methodName + " documents by ID.");
  }
}
;

// Determine if we are in a DDP method simulation
function alreadyInSimulation() {
  var CurrentInvocation = DDP._CurrentMethodInvocation ||
  // For backwards compatibility, as explained in this issue:
  // https://github.com/meteor/meteor/issues/8947
  DDP._CurrentInvocation;
  const enclosing = CurrentInvocation.get();
  return enclosing && enclosing.isSimulation;
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

require("/node_modules/meteor/allow-deny/allow-deny.js");

/* Exports */
Package._define("allow-deny", {
  AllowDeny: AllowDeny
});

})();

//# sourceURL=meteor://💻app/packages/allow-deny.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvYWxsb3ctZGVueS9hbGxvdy1kZW55LmpzIl0sIm5hbWVzIjpbImhhc093biIsIk9iamVjdCIsInByb3RvdHlwZSIsImhhc093blByb3BlcnR5IiwiQWxsb3dEZW55IiwiQ29sbGVjdGlvblByb3RvdHlwZSIsImFsbG93Iiwib3B0aW9ucyIsImFkZFZhbGlkYXRvciIsImRlbnkiLCJfZGVmaW5lTXV0YXRpb25NZXRob2RzIiwic2VsZiIsIl9yZXN0cmljdGVkIiwiX2luc2VjdXJlIiwidW5kZWZpbmVkIiwiX3ZhbGlkYXRvcnMiLCJpbnNlcnQiLCJ1cGRhdGUiLCJyZW1vdmUiLCJ1cHNlcnQiLCJmZXRjaCIsImZldGNoQWxsRmllbGRzIiwiX25hbWUiLCJfcHJlZml4IiwiX2Nvbm5lY3Rpb24iLCJNZXRlb3IiLCJzZXJ2ZXIiLCJpc0NsaWVudCIsIm0iLCJmb3JFYWNoIiwibWV0aG9kIiwibWV0aG9kTmFtZSIsInVzZUV4aXN0aW5nIiwiaGFuZGxlclByb3BOYW1lIiwiY2hlY2siLCJhcmd1bWVudHMiLCJNYXRjaCIsIkFueSIsImFyZ3MiLCJBcnJheSIsImZyb20iLCJnZW5lcmF0ZWRJZCIsImNhbGwiLCJfbWFrZU5ld0lEIiwiaXNTaW11bGF0aW9uIiwiX2lkIiwiX2NvbGxlY3Rpb24iLCJhcHBseSIsInRocm93SWZTZWxlY3RvcklzTm90SWQiLCJsZW5ndGgiLCJFcnJvciIsInZhbGlkYXRlZE1ldGhvZE5hbWUiLCJjaGFyQXQiLCJ0b1VwcGVyQ2FzZSIsInNsaWNlIiwidW5zaGlmdCIsInVzZXJJZCIsInB1c2giLCJfaXNJbnNlY3VyZSIsImUiLCJuYW1lIiwidG9TdHJpbmciLCJtZXRob2RzIiwiX3VwZGF0ZUZldGNoIiwiZmllbGRzIiwidW5pb24iLCJjcmVhdGUiLCJhZGQiLCJuYW1lcyIsImtleXMiLCJQYWNrYWdlIiwiaW5zZWN1cmUiLCJfdmFsaWRhdGVkSW5zZXJ0IiwiZG9jIiwic29tZSIsInZhbGlkYXRvciIsImRvY1RvVmFsaWRhdGUiLCJldmVyeSIsIl92YWxpZGF0ZWRVcGRhdGUiLCJzZWxlY3RvciIsIm11dGF0b3IiLCJhc3NpZ24iLCJMb2NhbENvbGxlY3Rpb24iLCJfc2VsZWN0b3JJc0lkUGVyaGFwc0FzT2JqZWN0Iiwibm9SZXBsYWNlRXJyb3IiLCJtdXRhdG9yS2V5cyIsIm1vZGlmaWVkRmllbGRzIiwib3AiLCJwYXJhbXMiLCJBTExPV0VEX1VQREFURV9PUEVSQVRJT05TIiwiZmllbGQiLCJpbmRleE9mIiwic3Vic3RyaW5nIiwiZmluZE9wdGlvbnMiLCJ0cmFuc2Zvcm0iLCJmaWVsZE5hbWUiLCJmaW5kT25lIiwiZmFjdG9yaWVkRG9jIiwidHJhbnNmb3JtRG9jIiwiX2ZvcmJpZFJlcGxhY2UiLCIkaW5jIiwiJHNldCIsIiR1bnNldCIsIiRhZGRUb1NldCIsIiRwb3AiLCIkcHVsbEFsbCIsIiRwdWxsIiwiJHB1c2hBbGwiLCIkcHVzaCIsIiRiaXQiLCJfdmFsaWRhdGVkUmVtb3ZlIiwiX2NhbGxNdXRhdG9yTWV0aG9kIiwiY2FsbGJhY2siLCJhbHJlYWR5SW5TaW11bGF0aW9uIiwiZXJyIiwiX2RlYnVnIiwiZmlyc3RBcmdJc1NlbGVjdG9yIiwibXV0YXRvck1ldGhvZE5hbWUiLCJyZXR1cm5TdHViVmFsdWUiLCJyZXQiLCJFSlNPTiIsImNsb25lIiwiY29sbGVjdGlvbiIsImFsbG93T3JEZW55IiwidmFsaWRLZXlzUmVnRXgiLCJrZXkiLCJ0ZXN0IiwiRnVuY3Rpb24iLCJfdHJhbnNmb3JtIiwid3JhcFRyYW5zZm9ybSIsIkN1cnJlbnRJbnZvY2F0aW9uIiwiRERQIiwiX0N1cnJlbnRNZXRob2RJbnZvY2F0aW9uIiwiX0N1cnJlbnRJbnZvY2F0aW9uIiwiZW5jbG9zaW5nIiwiZ2V0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBOztBQUVBLE1BQU1BLE1BQU0sR0FBR0MsTUFBTSxDQUFDQyxTQUFTLENBQUNDLGNBQWM7O0FB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QU8sQ0FBQ1csTUFBTSxJQUFJWCxPQUFPLENBQUNhLEtBQUssRUFBRTtJQUNyRCxJQUFJYixPQUFPLENBQUNhLEtBQUssSUFBSSxFQUFFYixPQUFPLENBQUNhLEtBQUssWUFBWW1CLEtBQUssQ0FBQyxFQUFFO01BQ3RELE1BQU0sSUFBSVcsS0FBSyxDQUFDeUUsV0FBVyxHQUFHLHNDQUFzQyxDQUFDO0lBQ3ZFO0lBQ0FELFVBQVUsQ0FBQzNELFlBQVksQ0FBQ3hELE9BQU8sQ0FBQ2EsS0FBSyxDQUFDO0VBQ3hDO0FBQ0Y7QUFFQSxTQUFTNEIsc0JBQXNCQSxDQUFDK0IsUUFBUSxFQUFFaEQsVUFBVSxFQUFFO0VBQ3BELElBQUksQ0FBQ21ELGVBQWUsQ0FBQ0MsNEJBQTRCLENBQUNKLFFBQVEsQ0FBQyxFQUFFO0lBQzNELE1BQU0sSUFBSXRELE1BQU0sQ0FBQ3lCLEtBQUssQ0FDcEIsR0FBRyxFQUFFLHlDQUF5QyxHQUFHbkIsVUFBVSxHQUN6RCxtQkFBbUIsQ0FBQztFQUMxQjtBQUNGO0FBQUM7O0FBRUQ7QUFDQSxTQUFTa0YsbUJBQW1CQSxDQUFBLEVBQUc7RUFDN0IsSUFBSWlCLGlCQUFpQixHQUNuQkMsR0FBRyxDQUFDQyx3QkFBd0I7RUFDNUI7RUFDQTtFQUNBRCxHQUFHLENBQUNFLGtCQUFrQjtFQUV4QixNQUFNQyxTQUFTLEdBQUdKLGlCQUFpQixDQUFDSyxHQUFHLENBQUMsQ0FBQztFQUN6QyxPQUFPRCxTQUFTLElBQUlBLFNBQVMsQ0FBQzFGLFlBQVk7QUFDNUMsQyIsImZpbGUiOiIvcGFja2FnZXMvYWxsb3ctZGVueS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vL1xuLy8vIFJlbW90ZSBtZXRob2RzIGFuZCBhY2Nlc3MgY29udHJvbC5cbi8vL1xuXG5jb25zdCBoYXNPd24gPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuXG4vLyBSZXN0cmljdCBkZWZhdWx0IG11dGF0b3JzIG9uIGNvbGxlY3Rpb24uIGFsbG93KCkgYW5kIGRlbnkoKSB0YWtlIHRoZVxuLy8gc2FtZSBvcHRpb25zOlxuLy9cbi8vIG9wdGlvbnMuaW5zZXJ0IHtGdW5jdGlvbih1c2VySWQsIGRvYyl9XG4vLyAgIHJldHVybiB0cnVlIHRvIGFsbG93L2RlbnkgYWRkaW5nIHRoaXMgZG9jdW1lbnRcbi8vXG4vLyBvcHRpb25zLnVwZGF0ZSB7RnVuY3Rpb24odXNlcklkLCBkb2NzLCBmaWVsZHMsIG1vZGlmaWVyKX1cbi8vICAgcmV0dXJuIHRydWUgdG8gYWxsb3cvZGVueSB1cGRhdGluZyB0aGVzZSBkb2N1bWVudHMuXG4vLyAgIGBmaWVsZHNgIGlzIHBhc3NlZCBhcyBhbiBhcnJheSBvZiBmaWVsZHMgdGhhdCBhcmUgdG8gYmUgbW9kaWZpZWRcbi8vXG4vLyBvcHRpb25zLnJlbW92ZSB7RnVuY3Rpb24odXNlcklkLCBkb2NzKX1cbi8vICAgcmV0dXJuIHRydWUgdG8gYWxsb3cvZGVueSByZW1vdmluZyB0aGVzZSBkb2N1bWVudHNcbi8vXG4vLyBvcHRpb25zLmZldGNoIHtBcnJheX1cbi8vICAgRmllbGRzIHRvIGZldGNoIGZvciB0aGVzZSB2YWxpZGF0b3JzLiBJZiBhbnkgY2FsbCB0byBhbGxvdyBvciBkZW55XG4vLyAgIGRvZXMgbm90IGhhdmUgdGhpcyBvcHRpb24gdGhlbiBhbGwgZmllbGRzIGFyZSBsb2FkZWQuXG4vL1xuLy8gYWxsb3cgYW5kIGRlbnkgY2FuIGJlIGNhbGxlZCBtdWx0aXBsZSB0aW1lcy4gVGhlIHZhbGlkYXRvcnMgYXJlXG4vLyBldmFsdWF0ZWQgYXMgZm9sbG93czpcbi8vIC0gSWYgbmVpdGhlciBkZW55KCkgbm9yIGFsbG93KCkgaGFzIGJlZW4gY2FsbGVkIG9uIHRoZSBjb2xsZWN0aW9uLFxuLy8gICB0aGVuIHRoZSByZXF1ZXN0IGlzIGFsbG93ZWQgaWYgYW5kIG9ubHkgaWYgdGhlIFwiaW5zZWN1cmVcIiBzbWFydFxuLy8gICBwYWNrYWdlIGlzIGluIHVzZS5cbi8vIC0gT3RoZXJ3aXNlLCBpZiBhbnkgZGVueSgpIGZ1bmN0aW9uIHJldHVybnMgdHJ1ZSwgdGhlIHJlcXVlc3QgaXMgZGVuaWVkLlxuLy8gLSBPdGhlcndpc2UsIGlmIGFueSBhbGxvdygpIGZ1bmN0aW9uIHJldHVybnMgdHJ1ZSwgdGhlIHJlcXVlc3QgaXMgYWxsb3dlZC5cbi8vIC0gT3RoZXJ3aXNlLCB0aGUgcmVxdWVzdCBpcyBkZW5pZWQuXG4vL1xuLy8gTWV0ZW9yIG1heSBjYWxsIHlvdXIgZGVueSgpIGFuZCBhbGxvdygpIGZ1bmN0aW9ucyBpbiBhbnkgb3JkZXIsIGFuZCBtYXkgbm90XG4vLyBjYWxsIGFsbCBvZiB0aGVtIGlmIGl0IGlzIGFibGUgdG8gbWFrZSBhIGRlY2lzaW9uIHdpdGhvdXQgY2FsbGluZyB0aGVtIGFsbFxuLy8gKHNvIGRvbid0IGluY2x1ZGUgc2lkZSBlZmZlY3RzKS5cblxuQWxsb3dEZW55ID0ge1xuICBDb2xsZWN0aW9uUHJvdG90eXBlOiB7fVxufTtcblxuLy8gSW4gdGhlIGBtb25nb2AgcGFja2FnZSwgd2Ugd2lsbCBleHRlbmQgTW9uZ28uQ29sbGVjdGlvbi5wcm90b3R5cGUgd2l0aCB0aGVzZVxuLy8gbWV0aG9kc1xuY29uc3QgQ29sbGVjdGlvblByb3RvdHlwZSA9IEFsbG93RGVueS5Db2xsZWN0aW9uUHJvdG90eXBlO1xuXG4vKipcbiAqIEBzdW1tYXJ5IEFsbG93IHVzZXJzIHRvIHdyaXRlIGRpcmVjdGx5IHRvIHRoaXMgY29sbGVjdGlvbiBmcm9tIGNsaWVudCBjb2RlLCBzdWJqZWN0IHRvIGxpbWl0YXRpb25zIHlvdSBkZWZpbmUuXG4gKiBAbG9jdXMgU2VydmVyXG4gKiBAbWV0aG9kIGFsbG93XG4gKiBAbWVtYmVyT2YgTW9uZ28uQ29sbGVjdGlvblxuICogQGluc3RhbmNlXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQHBhcmFtIHtGdW5jdGlvbn0gb3B0aW9ucy5pbnNlcnQsdXBkYXRlLHJlbW92ZSBGdW5jdGlvbnMgdGhhdCBsb29rIGF0IGEgcHJvcG9zZWQgbW9kaWZpY2F0aW9uIHRvIHRoZSBkYXRhYmFzZSBhbmQgcmV0dXJuIHRydWUgaWYgaXQgc2hvdWxkIGJlIGFsbG93ZWQuXG4gKiBAcGFyYW0ge1N0cmluZ1tdfSBvcHRpb25zLmZldGNoIE9wdGlvbmFsIHBlcmZvcm1hbmNlIGVuaGFuY2VtZW50LiBMaW1pdHMgdGhlIGZpZWxkcyB0aGF0IHdpbGwgYmUgZmV0Y2hlZCBmcm9tIHRoZSBkYXRhYmFzZSBmb3IgaW5zcGVjdGlvbiBieSB5b3VyIGB1cGRhdGVgIGFuZCBgcmVtb3ZlYCBmdW5jdGlvbnMuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBvcHRpb25zLnRyYW5zZm9ybSBPdmVycmlkZXMgYHRyYW5zZm9ybWAgb24gdGhlICBbYENvbGxlY3Rpb25gXSgjY29sbGVjdGlvbnMpLiAgUGFzcyBgbnVsbGAgdG8gZGlzYWJsZSB0cmFuc2Zvcm1hdGlvbi5cbiAqL1xuQ29sbGVjdGlvblByb3RvdHlwZS5hbGxvdyA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgYWRkVmFsaWRhdG9yKHRoaXMsICdhbGxvdycsIG9wdGlvbnMpO1xufTtcblxuLyoqXG4gKiBAc3VtbWFyeSBPdmVycmlkZSBgYWxsb3dgIHJ1bGVzLlxuICogQGxvY3VzIFNlcnZlclxuICogQG1ldGhvZCBkZW55XG4gKiBAbWVtYmVyT2YgTW9uZ28uQ29sbGVjdGlvblxuICogQGluc3RhbmNlXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQHBhcmFtIHtGdW5jdGlvbn0gb3B0aW9ucy5pbnNlcnQsdXBkYXRlLHJlbW92ZSBGdW5jdGlvbnMgdGhhdCBsb29rIGF0IGEgcHJvcG9zZWQgbW9kaWZpY2F0aW9uIHRvIHRoZSBkYXRhYmFzZSBhbmQgcmV0dXJuIHRydWUgaWYgaXQgc2hvdWxkIGJlIGRlbmllZCwgZXZlbiBpZiBhbiBbYWxsb3ddKCNhbGxvdykgcnVsZSBzYXlzIG90aGVyd2lzZS5cbiAqIEBwYXJhbSB7U3RyaW5nW119IG9wdGlvbnMuZmV0Y2ggT3B0aW9uYWwgcGVyZm9ybWFuY2UgZW5oYW5jZW1lbnQuIExpbWl0cyB0aGUgZmllbGRzIHRoYXQgd2lsbCBiZSBmZXRjaGVkIGZyb20gdGhlIGRhdGFiYXNlIGZvciBpbnNwZWN0aW9uIGJ5IHlvdXIgYHVwZGF0ZWAgYW5kIGByZW1vdmVgIGZ1bmN0aW9ucy5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IG9wdGlvbnMudHJhbnNmb3JtIE92ZXJyaWRlcyBgdHJhbnNmb3JtYCBvbiB0aGUgIFtgQ29sbGVjdGlvbmBdKCNjb2xsZWN0aW9ucykuICBQYXNzIGBudWxsYCB0byBkaXNhYmxlIHRyYW5zZm9ybWF0aW9uLlxuICovXG5Db2xsZWN0aW9uUHJvdG90eXBlLmRlbnkgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gIGFkZFZhbGlkYXRvcih0aGlzLCAnZGVueScsIG9wdGlvbnMpO1xufTtcblxuQ29sbGVjdGlvblByb3RvdHlwZS5fZGVmaW5lTXV0YXRpb25NZXRob2RzID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICBjb25zdCBzZWxmID0gdGhpcztcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgLy8gc2V0IHRvIHRydWUgb25jZSB3ZSBjYWxsIGFueSBhbGxvdyBvciBkZW55IG1ldGhvZHMuIElmIHRydWUsIHVzZVxuICAvLyBhbGxvdy9kZW55IHNlbWFudGljcy4gSWYgZmFsc2UsIHVzZSBpbnNlY3VyZSBtb2RlIHNlbWFudGljcy5cbiAgc2VsZi5fcmVzdHJpY3RlZCA9IGZhbHNlO1xuXG4gIC8vIEluc2VjdXJlIG1vZGUgKGRlZmF1bHQgdG8gYWxsb3dpbmcgd3JpdGVzKS4gRGVmYXVsdHMgdG8gJ3VuZGVmaW5lZCcgd2hpY2hcbiAgLy8gbWVhbnMgaW5zZWN1cmUgaWZmIHRoZSBpbnNlY3VyZSBwYWNrYWdlIGlzIGxvYWRlZC4gVGhpcyBwcm9wZXJ0eSBjYW4gYmVcbiAgLy8gb3ZlcnJpZGVuIGJ5IHRlc3RzIG9yIHBhY2thZ2VzIHdpc2hpbmcgdG8gY2hhbmdlIGluc2VjdXJlIG1vZGUgYmVoYXZpb3Igb2ZcbiAgLy8gdGhlaXIgY29sbGVjdGlvbnMuXG4gIHNlbGYuX2luc2VjdXJlID0gdW5kZWZpbmVkO1xuXG4gIHNlbGYuX3ZhbGlkYXRvcnMgPSB7XG4gICAgaW5zZXJ0OiB7YWxsb3c6IFtdLCBkZW55OiBbXX0sXG4gICAgdXBkYXRlOiB7YWxsb3c6IFtdLCBkZW55OiBbXX0sXG4gICAgcmVtb3ZlOiB7YWxsb3c6IFtdLCBkZW55OiBbXX0sXG4gICAgdXBzZXJ0OiB7YWxsb3c6IFtdLCBkZW55OiBbXX0sIC8vIGR1bW15IGFycmF5czsgY2FuJ3Qgc2V0IHRoZXNlIVxuICAgIGZldGNoOiBbXSxcbiAgICBmZXRjaEFsbEZpZWxkczogZmFsc2VcbiAgfTtcblxuICBpZiAoIXNlbGYuX25hbWUpXG4gICAgcmV0dXJuOyAvLyBhbm9ueW1vdXMgY29sbGVjdGlvblxuXG4gIC8vIFhYWCBUaGluayBhYm91dCBtZXRob2QgbmFtZXNwYWNpbmcuIE1heWJlIG1ldGhvZHMgc2hvdWxkIGJlXG4gIC8vIFwiTWV0ZW9yOk1vbmdvOmluc2VydC9OQU1FXCI/XG4gIHNlbGYuX3ByZWZpeCA9ICcvJyArIHNlbGYuX25hbWUgKyAnLyc7XG5cbiAgLy8gTXV0YXRpb24gTWV0aG9kc1xuICAvLyBNaW5pbW9uZ28gb24gdGhlIHNlcnZlciBnZXRzIG5vIHN0dWJzOyBpbnN0ZWFkLCBieSBkZWZhdWx0XG4gIC8vIGl0IHdhaXQoKXMgdW50aWwgaXRzIHJlc3VsdCBpcyByZWFkeSwgeWllbGRpbmcuXG4gIC8vIFRoaXMgbWF0Y2hlcyB0aGUgYmVoYXZpb3Igb2YgbWFjcm9tb25nbyBvbiB0aGUgc2VydmVyIGJldHRlci5cbiAgLy8gWFhYIHNlZSAjTWV0ZW9yU2VydmVyTnVsbFxuICBpZiAoc2VsZi5fY29ubmVjdGlvbiAmJiAoc2VsZi5fY29ubmVjdGlvbiA9PT0gTWV0ZW9yLnNlcnZlciB8fCBNZXRlb3IuaXNDbGllbnQpKSB7XG4gICAgY29uc3QgbSA9IHt9O1xuXG4gICAgWydpbnNlcnQnLCAndXBkYXRlJywgJ3JlbW92ZSddLmZvckVhY2goKG1ldGhvZCkgPT4ge1xuICAgICAgY29uc3QgbWV0aG9kTmFtZSA9IHNlbGYuX3ByZWZpeCArIG1ldGhvZDtcblxuICAgICAgaWYgKG9wdGlvbnMudXNlRXhpc3RpbmcpIHtcbiAgICAgICAgY29uc3QgaGFuZGxlclByb3BOYW1lID0gTWV0ZW9yLmlzQ2xpZW50ID8gJ19tZXRob2RIYW5kbGVycycgOiAnbWV0aG9kX2hhbmRsZXJzJztcbiAgICAgICAgLy8gRG8gbm90IHRyeSB0byBjcmVhdGUgYWRkaXRpb25hbCBtZXRob2RzIGlmIHRoaXMgaGFzIGFscmVhZHkgYmVlbiBjYWxsZWQuXG4gICAgICAgIC8vIChPdGhlcndpc2UgdGhlIC5tZXRob2RzKCkgY2FsbCBiZWxvdyB3aWxsIHRocm93IGFuIGVycm9yLilcbiAgICAgICAgaWYgKHNlbGYuX2Nvbm5lY3Rpb25baGFuZGxlclByb3BOYW1lXSAmJlxuICAgICAgICAgIHR5cGVvZiBzZWxmLl9jb25uZWN0aW9uW2hhbmRsZXJQcm9wTmFtZV1bbWV0aG9kTmFtZV0gPT09ICdmdW5jdGlvbicpIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgbVttZXRob2ROYW1lXSA9IGZ1bmN0aW9uICgvKiAuLi4gKi8pIHtcbiAgICAgICAgLy8gQWxsIHRoZSBtZXRob2RzIGRvIHRoZWlyIG93biB2YWxpZGF0aW9uLCBpbnN0ZWFkIG9mIHVzaW5nIGNoZWNrKCkuXG4gICAgICAgIGNoZWNrKGFyZ3VtZW50cywgW01hdGNoLkFueV0pO1xuICAgICAgICBjb25zdCBhcmdzID0gQXJyYXkuZnJvbShhcmd1bWVudHMpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIC8vIEZvciBhbiBpbnNlcnQsIGlmIHRoZSBjbGllbnQgZGlkbid0IHNwZWNpZnkgYW4gX2lkLCBnZW5lcmF0ZSBvbmVcbiAgICAgICAgICAvLyBub3c7IGJlY2F1c2UgdGhpcyB1c2VzIEREUC5yYW5kb21TdHJlYW0sIGl0IHdpbGwgYmUgY29uc2lzdGVudCB3aXRoXG4gICAgICAgICAgLy8gd2hhdCB0aGUgY2xpZW50IGdlbmVyYXRlZC4gV2UgZ2VuZXJhdGUgaXQgbm93IHJhdGhlciB0aGFuIGxhdGVyIHNvXG4gICAgICAgICAgLy8gdGhhdCBpZiAoZWcpIGFuIGFsbG93L2RlbnkgcnVsZSBkb2VzIGFuIGluc2VydCB0byB0aGUgc2FtZVxuICAgICAgICAgIC8vIGNvbGxlY3Rpb24gKG5vdCB0aGF0IGl0IHJlYWxseSBzaG91bGQpLCB0aGUgZ2VuZXJhdGVkIF9pZCB3aWxsXG4gICAgICAgICAgLy8gc3RpbGwgYmUgdGhlIGZpcnN0IHVzZSBvZiB0aGUgc3RyZWFtIGFuZCB3aWxsIGJlIGNvbnNpc3RlbnQuXG4gICAgICAgICAgLy9cbiAgICAgICAgICAvLyBIb3dldmVyLCB3ZSBkb24ndCBhY3R1YWxseSBzdGljayB0aGUgX2lkIG9udG8gdGhlIGRvY3VtZW50IHlldCxcbiAgICAgICAgICAvLyBiZWNhdXNlIHdlIHdhbnQgYWxsb3cvZGVueSBydWxlcyB0byBiZSBhYmxlIHRvIGRpZmZlcmVudGlhdGVcbiAgICAgICAgICAvLyBiZXR3ZWVuIGFyYml0cmFyeSBjbGllbnQtc3BlY2lmaWVkIF9pZCBmaWVsZHMgYW5kIG1lcmVseVxuICAgICAgICAgIC8vIGNsaWVudC1jb250cm9sbGVkLXZpYS1yYW5kb21TZWVkIGZpZWxkcy5cbiAgICAgICAgICBsZXQgZ2VuZXJhdGVkSWQgPSBudWxsO1xuICAgICAgICAgIGlmIChtZXRob2QgPT09IFwiaW5zZXJ0XCIgJiYgIWhhc093bi5jYWxsKGFyZ3NbMF0sICdfaWQnKSkge1xuICAgICAgICAgICAgZ2VuZXJhdGVkSWQgPSBzZWxmLl9tYWtlTmV3SUQoKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAodGhpcy5pc1NpbXVsYXRpb24pIHtcbiAgICAgICAgICAgIC8vIEluIGEgY2xpZW50IHNpbXVsYXRpb24sIHlvdSBjYW4gZG8gYW55IG11dGF0aW9uIChldmVuIHdpdGggYVxuICAgICAgICAgICAgLy8gY29tcGxleCBzZWxlY3RvcikuXG4gICAgICAgICAgICBpZiAoZ2VuZXJhdGVkSWQgIT09IG51bGwpXG4gICAgICAgICAgICAgIGFyZ3NbMF0uX2lkID0gZ2VuZXJhdGVkSWQ7XG4gICAgICAgICAgICByZXR1cm4gc2VsZi5fY29sbGVjdGlvblttZXRob2RdLmFwcGx5KFxuICAgICAgICAgICAgICBzZWxmLl9jb2xsZWN0aW9uLCBhcmdzKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBUaGlzIGlzIHRoZSBzZXJ2ZXIgcmVjZWl2aW5nIGEgbWV0aG9kIGNhbGwgZnJvbSB0aGUgY2xpZW50LlxuXG4gICAgICAgICAgLy8gV2UgZG9uJ3QgYWxsb3cgYXJiaXRyYXJ5IHNlbGVjdG9ycyBpbiBtdXRhdGlvbnMgZnJvbSB0aGUgY2xpZW50OiBvbmx5XG4gICAgICAgICAgLy8gc2luZ2xlLUlEIHNlbGVjdG9ycy5cbiAgICAgICAgICBpZiAobWV0aG9kICE9PSAnaW5zZXJ0JylcbiAgICAgICAgICAgIHRocm93SWZTZWxlY3RvcklzTm90SWQoYXJnc1swXSwgbWV0aG9kKTtcblxuICAgICAgICAgIGlmIChzZWxmLl9yZXN0cmljdGVkKSB7XG4gICAgICAgICAgICAvLyBzaG9ydCBjaXJjdWl0IGlmIHRoZXJlIGlzIG5vIHdheSBpdCB3aWxsIHBhc3MuXG4gICAgICAgICAgICBpZiAoc2VsZi5fdmFsaWRhdG9yc1ttZXRob2RdLmFsbG93Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKFxuICAgICAgICAgICAgICAgIDQwMywgXCJBY2Nlc3MgZGVuaWVkLiBObyBhbGxvdyB2YWxpZGF0b3JzIHNldCBvbiByZXN0cmljdGVkIFwiICtcbiAgICAgICAgICAgICAgICAgIFwiY29sbGVjdGlvbiBmb3IgbWV0aG9kICdcIiArIG1ldGhvZCArIFwiJy5cIik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHZhbGlkYXRlZE1ldGhvZE5hbWUgPVxuICAgICAgICAgICAgICAgICAgJ192YWxpZGF0ZWQnICsgbWV0aG9kLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgbWV0aG9kLnNsaWNlKDEpO1xuICAgICAgICAgICAgYXJncy51bnNoaWZ0KHRoaXMudXNlcklkKTtcbiAgICAgICAgICAgIG1ldGhvZCA9PT0gJ2luc2VydCcgJiYgYXJncy5wdXNoKGdlbmVyYXRlZElkKTtcbiAgICAgICAgICAgIHJldHVybiBzZWxmW3ZhbGlkYXRlZE1ldGhvZE5hbWVdLmFwcGx5KHNlbGYsIGFyZ3MpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoc2VsZi5faXNJbnNlY3VyZSgpKSB7XG4gICAgICAgICAgICBpZiAoZ2VuZXJhdGVkSWQgIT09IG51bGwpXG4gICAgICAgICAgICAgIGFyZ3NbMF0uX2lkID0gZ2VuZXJhdGVkSWQ7XG4gICAgICAgICAgICAvLyBJbiBpbnNlY3VyZSBtb2RlLCBhbGxvdyBhbnkgbXV0YXRpb24gKHdpdGggYSBzaW1wbGUgc2VsZWN0b3IpLlxuICAgICAgICAgICAgLy8gWFhYIFRoaXMgaXMga2luZCBvZiBib2d1cy4gIEluc3RlYWQgb2YgYmxpbmRseSBwYXNzaW5nIHdoYXRldmVyXG4gICAgICAgICAgICAvLyAgICAgd2UgZ2V0IGZyb20gdGhlIG5ldHdvcmsgdG8gdGhpcyBmdW5jdGlvbiwgd2Ugc2hvdWxkIGFjdHVhbGx5XG4gICAgICAgICAgICAvLyAgICAga25vdyB0aGUgY29ycmVjdCBhcmd1bWVudHMgZm9yIHRoZSBmdW5jdGlvbiBhbmQgcGFzcyBqdXN0XG4gICAgICAgICAgICAvLyAgICAgdGhlbS4gIEZvciBleGFtcGxlLCBpZiB5b3UgaGF2ZSBhbiBleHRyYW5lb3VzIGV4dHJhIG51bGxcbiAgICAgICAgICAgIC8vICAgICBhcmd1bWVudCBhbmQgdGhpcyBpcyBNb25nbyBvbiB0aGUgc2VydmVyLCB0aGUgLndyYXBBc3luYydkXG4gICAgICAgICAgICAvLyAgICAgZnVuY3Rpb25zIGxpa2UgdXBkYXRlIHdpbGwgZ2V0IGNvbmZ1c2VkIGFuZCBwYXNzIHRoZVxuICAgICAgICAgICAgLy8gICAgIFwiZnV0LnJlc29sdmVyKClcIiBpbiB0aGUgd3Jvbmcgc2xvdCwgd2hlcmUgX3VwZGF0ZSB3aWxsIG5ldmVyXG4gICAgICAgICAgICAvLyAgICAgaW52b2tlIGl0LiBCYW0sIGJyb2tlbiBERFAgY29ubmVjdGlvbi4gIFByb2JhYmx5IHNob3VsZCBqdXN0XG4gICAgICAgICAgICAvLyAgICAgdGFrZSB0aGlzIHdob2xlIG1ldGhvZCBhbmQgd3JpdGUgaXQgdGhyZWUgdGltZXMsIGludm9raW5nXG4gICAgICAgICAgICAvLyAgICAgaGVscGVycyBmb3IgdGhlIGNvbW1vbiBjb2RlLlxuICAgICAgICAgICAgcmV0dXJuIHNlbGYuX2NvbGxlY3Rpb25bbWV0aG9kXS5hcHBseShzZWxmLl9jb2xsZWN0aW9uLCBhcmdzKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSW4gc2VjdXJlIG1vZGUsIGlmIHdlIGhhdmVuJ3QgY2FsbGVkIGFsbG93IG9yIGRlbnksIHRoZW4gbm90aGluZ1xuICAgICAgICAgICAgLy8gaXMgcGVybWl0dGVkLlxuICAgICAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDMsIFwiQWNjZXNzIGRlbmllZFwiKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICBlLm5hbWUgPT09ICdNb25nb0Vycm9yJyB8fFxuICAgICAgICAgICAgLy8gZm9yIG9sZCB2ZXJzaW9ucyBvZiBNb25nb0RCIChwcm9iYWJseSBub3QgbmVjZXNzYXJ5IGJ1dCBpdCdzIGhlcmUganVzdCBpbiBjYXNlKVxuICAgICAgICAgICAgZS5uYW1lID09PSAnQnVsa1dyaXRlRXJyb3InIHx8XG4gICAgICAgICAgICAvLyBmb3IgbmV3ZXIgdmVyc2lvbnMgb2YgTW9uZ29EQiAoaHR0cHM6Ly9kb2NzLm1vbmdvZGIuY29tL2RyaXZlcnMvbm9kZS9jdXJyZW50L3doYXRzLW5ldy8jYnVsa3dyaXRlZXJyb3ItLS1tb25nb2J1bGt3cml0ZWVycm9yKVxuICAgICAgICAgICAgZS5uYW1lID09PSAnTW9uZ29CdWxrV3JpdGVFcnJvcicgfHxcbiAgICAgICAgICAgIGUubmFtZSA9PT0gJ01pbmltb25nb0Vycm9yJ1xuICAgICAgICAgICkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDksIGUudG9TdHJpbmcoKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9O1xuICAgIH0pO1xuXG4gICAgc2VsZi5fY29ubmVjdGlvbi5tZXRob2RzKG0pO1xuICB9XG59O1xuXG5Db2xsZWN0aW9uUHJvdG90eXBlLl91cGRhdGVGZXRjaCA9IGZ1bmN0aW9uIChmaWVsZHMpIHtcbiAgY29uc3Qgc2VsZiA9IHRoaXM7XG5cbiAgaWYgKCFzZWxmLl92YWxpZGF0b3JzLmZldGNoQWxsRmllbGRzKSB7XG4gICAgaWYgKGZpZWxkcykge1xuICAgICAgY29uc3QgdW5pb24gPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgICAgY29uc3QgYWRkID0gbmFtZXMgPT4gbmFtZXMgJiYgbmFtZXMuZm9yRWFjaChuYW1lID0+IHVuaW9uW25hbWVdID0gMSk7XG4gICAgICBhZGQoc2VsZi5fdmFsaWRhdG9ycy5mZXRjaCk7XG4gICAgICBhZGQoZmllbGRzKTtcbiAgICAgIHNlbGYuX3ZhbGlkYXRvcnMuZmV0Y2ggPSBPYmplY3Qua2V5cyh1bmlvbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNlbGYuX3ZhbGlkYXRvcnMuZmV0Y2hBbGxGaWVsZHMgPSB0cnVlO1xuICAgICAgLy8gY2xlYXIgZmV0Y2gganVzdCB0byBtYWtlIHN1cmUgd2UgZG9uJ3QgYWNjaWRlbnRhbGx5IHJlYWQgaXRcbiAgICAgIHNlbGYuX3ZhbGlkYXRvcnMuZmV0Y2ggPSBudWxsO1xuICAgIH1cbiAgfVxufTtcblxuQ29sbGVjdGlvblByb3RvdHlwZS5faXNJbnNlY3VyZSA9IGZ1bmN0aW9uICgpIHtcbiAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gIGlmIChzZWxmLl9pbnNlY3VyZSA9PT0gdW5kZWZpbmVkKVxuICAgIHJldHVybiAhIVBhY2thZ2UuaW5zZWN1cmU7XG4gIHJldHVybiBzZWxmLl9pbnNlY3VyZTtcbn07XG5cbkNvbGxlY3Rpb25Qcm90b3R5cGUuX3ZhbGlkYXRlZEluc2VydCA9IGZ1bmN0aW9uICh1c2VySWQsIGRvYyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdlbmVyYXRlZElkKSB7XG4gIGNvbnN0IHNlbGYgPSB0aGlzO1xuXG4gIC8vIGNhbGwgdXNlciB2YWxpZGF0b3JzLlxuICAvLyBBbnkgZGVueSByZXR1cm5zIHRydWUgbWVhbnMgZGVuaWVkLlxuICBpZiAoc2VsZi5fdmFsaWRhdG9ycy5pbnNlcnQuZGVueS5zb21lKCh2YWxpZGF0b3IpID0+IHtcbiAgICByZXR1cm4gdmFsaWRhdG9yKHVzZXJJZCwgZG9jVG9WYWxpZGF0ZSh2YWxpZGF0b3IsIGRvYywgZ2VuZXJhdGVkSWQpKTtcbiAgfSkpIHtcbiAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMywgXCJBY2Nlc3MgZGVuaWVkXCIpO1xuICB9XG4gIC8vIEFueSBhbGxvdyByZXR1cm5zIHRydWUgbWVhbnMgcHJvY2VlZC4gVGhyb3cgZXJyb3IgaWYgdGhleSBhbGwgZmFpbC5cbiAgaWYgKHNlbGYuX3ZhbGlkYXRvcnMuaW5zZXJ0LmFsbG93LmV2ZXJ5KCh2YWxpZGF0b3IpID0+IHtcbiAgICByZXR1cm4gIXZhbGlkYXRvcih1c2VySWQsIGRvY1RvVmFsaWRhdGUodmFsaWRhdG9yLCBkb2MsIGdlbmVyYXRlZElkKSk7XG4gIH0pKSB7XG4gICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDMsIFwiQWNjZXNzIGRlbmllZFwiKTtcbiAgfVxuXG4gIC8vIElmIHdlIGdlbmVyYXRlZCBhbiBJRCBhYm92ZSwgaW5zZXJ0IGl0IG5vdzogYWZ0ZXIgdGhlIHZhbGlkYXRpb24sIGJ1dFxuICAvLyBiZWZvcmUgYWN0dWFsbHkgaW5zZXJ0aW5nLlxuICBpZiAoZ2VuZXJhdGVkSWQgIT09IG51bGwpXG4gICAgZG9jLl9pZCA9IGdlbmVyYXRlZElkO1xuXG4gIHNlbGYuX2NvbGxlY3Rpb24uaW5zZXJ0LmNhbGwoc2VsZi5fY29sbGVjdGlvbiwgZG9jKTtcbn07XG5cbi8vIFNpbXVsYXRlIGEgbW9uZ28gYHVwZGF0ZWAgb3BlcmF0aW9uIHdoaWxlIHZhbGlkYXRpbmcgdGhhdCB0aGUgYWNjZXNzXG4vLyBjb250cm9sIHJ1bGVzIHNldCBieSBjYWxscyB0byBgYWxsb3cvZGVueWAgYXJlIHNhdGlzZmllZC4gSWYgYWxsXG4vLyBwYXNzLCByZXdyaXRlIHRoZSBtb25nbyBvcGVyYXRpb24gdG8gdXNlICRpbiB0byBzZXQgdGhlIGxpc3Qgb2Zcbi8vIGRvY3VtZW50IGlkcyB0byBjaGFuZ2UgIyNWYWxpZGF0ZWRDaGFuZ2VcbkNvbGxlY3Rpb25Qcm90b3R5cGUuX3ZhbGlkYXRlZFVwZGF0ZSA9IGZ1bmN0aW9uKFxuICAgIHVzZXJJZCwgc2VsZWN0b3IsIG11dGF0b3IsIG9wdGlvbnMpIHtcbiAgY29uc3Qgc2VsZiA9IHRoaXM7XG5cbiAgY2hlY2sobXV0YXRvciwgT2JqZWN0KTtcblxuICBvcHRpb25zID0gT2JqZWN0LmFzc2lnbihPYmplY3QuY3JlYXRlKG51bGwpLCBvcHRpb25zKTtcblxuICBpZiAoIUxvY2FsQ29sbGVjdGlvbi5fc2VsZWN0b3JJc0lkUGVyaGFwc0FzT2JqZWN0KHNlbGVjdG9yKSlcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJ2YWxpZGF0ZWQgdXBkYXRlIHNob3VsZCBiZSBvZiBhIHNpbmdsZSBJRFwiKTtcblxuICAvLyBXZSBkb24ndCBzdXBwb3J0IHVwc2VydHMgYmVjYXVzZSB0aGV5IGRvbid0IGZpdCBuaWNlbHkgaW50byBhbGxvdy9kZW55XG4gIC8vIHJ1bGVzLlxuICBpZiAob3B0aW9ucy51cHNlcnQpXG4gICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDMsIFwiQWNjZXNzIGRlbmllZC4gVXBzZXJ0cyBub3QgXCIgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJhbGxvd2VkIGluIGEgcmVzdHJpY3RlZCBjb2xsZWN0aW9uLlwiKTtcblxuICBjb25zdCBub1JlcGxhY2VFcnJvciA9IFwiQWNjZXNzIGRlbmllZC4gSW4gYSByZXN0cmljdGVkIGNvbGxlY3Rpb24geW91IGNhbiBvbmx5XCIgK1xuICAgICAgICBcIiB1cGRhdGUgZG9jdW1lbnRzLCBub3QgcmVwbGFjZSB0aGVtLiBVc2UgYSBNb25nbyB1cGRhdGUgb3BlcmF0b3IsIHN1Y2ggXCIgK1xuICAgICAgICBcImFzICckc2V0Jy5cIjtcblxuICBjb25zdCBtdXRhdG9yS2V5cyA9IE9iamVjdC5rZXlzKG11dGF0b3IpO1xuXG4gIC8vIGNvbXB1dGUgbW9kaWZpZWQgZmllbGRzXG4gIGNvbnN0IG1vZGlmaWVkRmllbGRzID0ge307XG5cbiAgaWYgKG11dGF0b3JLZXlzLmxlbmd0aCA9PT0gMCkge1xuICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDAzLCBub1JlcGxhY2VFcnJvcik7XG4gIH1cbiAgbXV0YXRvcktleXMuZm9yRWFjaCgob3ApID0+IHtcbiAgICBjb25zdCBwYXJhbXMgPSBtdXRhdG9yW29wXTtcbiAgICBpZiAob3AuY2hhckF0KDApICE9PSAnJCcpIHtcbiAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDAzLCBub1JlcGxhY2VFcnJvcik7XG4gICAgfSBlbHNlIGlmICghaGFzT3duLmNhbGwoQUxMT1dFRF9VUERBVEVfT1BFUkFUSU9OUywgb3ApKSB7XG4gICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKFxuICAgICAgICA0MDMsIFwiQWNjZXNzIGRlbmllZC4gT3BlcmF0b3IgXCIgKyBvcCArIFwiIG5vdCBhbGxvd2VkIGluIGEgcmVzdHJpY3RlZCBjb2xsZWN0aW9uLlwiKTtcbiAgICB9IGVsc2Uge1xuICAgICAgT2JqZWN0LmtleXMocGFyYW1zKS5mb3JFYWNoKChmaWVsZCkgPT4ge1xuICAgICAgICAvLyB0cmVhdCBkb3R0ZWQgZmllbGRzIGFzIGlmIHRoZXkgYXJlIHJlcGxhY2luZyB0aGVpclxuICAgICAgICAvLyB0b3AtbGV2ZWwgcGFydFxuICAgICAgICBpZiAoZmllbGQuaW5kZXhPZignLicpICE9PSAtMSlcbiAgICAgICAgICBmaWVsZCA9IGZpZWxkLnN1YnN0cmluZygwLCBmaWVsZC5pbmRleE9mKCcuJykpO1xuXG4gICAgICAgIC8vIHJlY29yZCB0aGUgZmllbGQgd2UgYXJlIHRyeWluZyB0byBjaGFuZ2VcbiAgICAgICAgbW9kaWZpZWRGaWVsZHNbZmllbGRdID0gdHJ1ZTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG5cbiAgY29uc3QgZmllbGRzID0gT2JqZWN0LmtleXMobW9kaWZpZWRGaWVsZHMpO1xuXG4gIGNvbnN0IGZpbmRPcHRpb25zID0ge3RyYW5zZm9ybTogbnVsbH07XG4gIGlmICghc2VsZi5fdmFsaWRhdG9ycy5mZXRjaEFsbEZpZWxkcykge1xuICAgIGZpbmRPcHRpb25zLmZpZWxkcyA9IHt9O1xuICAgIHNlbGYuX3ZhbGlkYXRvcnMuZmV0Y2guZm9yRWFjaCgoZmllbGROYW1lKSA9PiB7XG4gICAgICBmaW5kT3B0aW9ucy5maWVsZHNbZmllbGROYW1lXSA9IDE7XG4gICAgfSk7XG4gIH1cblxuICBjb25zdCBkb2MgPSBzZWxmLl9jb2xsZWN0aW9uLmZpbmRPbmUoc2VsZWN0b3IsIGZpbmRPcHRpb25zKTtcbiAgaWYgKCFkb2MpICAvLyBub25lIHNhdGlzZmllZCFcbiAgICByZXR1cm4gMDtcblxuICAvLyBjYWxsIHVzZXIgdmFsaWRhdG9ycy5cbiAgLy8gQW55IGRlbnkgcmV0dXJucyB0cnVlIG1lYW5zIGRlbmllZC5cbiAgaWYgKHNlbGYuX3ZhbGlkYXRvcnMudXBkYXRlLmRlbnkuc29tZSgodmFsaWRhdG9yKSA9PiB7XG4gICAgY29uc3QgZmFjdG9yaWVkRG9jID0gdHJhbnNmb3JtRG9jKHZhbGlkYXRvciwgZG9jKTtcbiAgICByZXR1cm4gdmFsaWRhdG9yKHVzZXJJZCxcbiAgICAgICAgICAgICAgICAgICAgIGZhY3RvcmllZERvYyxcbiAgICAgICAgICAgICAgICAgICAgIGZpZWxkcyxcbiAgICAgICAgICAgICAgICAgICAgIG11dGF0b3IpO1xuICB9KSkge1xuICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDAzLCBcIkFjY2VzcyBkZW5pZWRcIik7XG4gIH1cbiAgLy8gQW55IGFsbG93IHJldHVybnMgdHJ1ZSBtZWFucyBwcm9jZWVkLiBUaHJvdyBlcnJvciBpZiB0aGV5IGFsbCBmYWlsLlxuICBpZiAoc2VsZi5fdmFsaWRhdG9ycy51cGRhdGUuYWxsb3cuZXZlcnkoKHZhbGlkYXRvcikgPT4ge1xuICAgIGNvbnN0IGZhY3RvcmllZERvYyA9IHRyYW5zZm9ybURvYyh2YWxpZGF0b3IsIGRvYyk7XG4gICAgcmV0dXJuICF2YWxpZGF0b3IodXNlcklkLFxuICAgICAgICAgICAgICAgICAgICAgIGZhY3RvcmllZERvYyxcbiAgICAgICAgICAgICAgICAgICAgICBmaWVsZHMsXG4gICAgICAgICAgICAgICAgICAgICAgbXV0YXRvcik7XG4gIH0pKSB7XG4gICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDMsIFwiQWNjZXNzIGRlbmllZFwiKTtcbiAgfVxuXG4gIG9wdGlvbnMuX2ZvcmJpZFJlcGxhY2UgPSB0cnVlO1xuXG4gIC8vIEJhY2sgd2hlbiB3ZSBzdXBwb3J0ZWQgYXJiaXRyYXJ5IGNsaWVudC1wcm92aWRlZCBzZWxlY3RvcnMsIHdlIGFjdHVhbGx5XG4gIC8vIHJld3JvdGUgdGhlIHNlbGVjdG9yIHRvIGluY2x1ZGUgYW4gX2lkIGNsYXVzZSBiZWZvcmUgcGFzc2luZyB0byBNb25nbyB0b1xuICAvLyBhdm9pZCByYWNlcywgYnV0IHNpbmNlIHNlbGVjdG9yIGlzIGd1YXJhbnRlZWQgdG8gYWxyZWFkeSBqdXN0IGJlIGFuIElELCB3ZVxuICAvLyBkb24ndCBoYXZlIHRvIGFueSBtb3JlLlxuXG4gIHJldHVybiBzZWxmLl9jb2xsZWN0aW9uLnVwZGF0ZS5jYWxsKFxuICAgIHNlbGYuX2NvbGxlY3Rpb24sIHNlbGVjdG9yLCBtdXRhdG9yLCBvcHRpb25zKTtcbn07XG5cbi8vIE9ubHkgYWxsb3cgdGhlc2Ugb3BlcmF0aW9ucyBpbiB2YWxpZGF0ZWQgdXBkYXRlcy4gU3BlY2lmaWNhbGx5XG4vLyB3aGl0ZWxpc3Qgb3BlcmF0aW9ucywgcmF0aGVyIHRoYW4gYmxhY2tsaXN0LCBzbyBuZXcgY29tcGxleFxuLy8gb3BlcmF0aW9ucyB0aGF0IGFyZSBhZGRlZCBhcmVuJ3QgYXV0b21hdGljYWxseSBhbGxvd2VkLiBBIGNvbXBsZXhcbi8vIG9wZXJhdGlvbiBpcyBvbmUgdGhhdCBkb2VzIG1vcmUgdGhhbiBqdXN0IG1vZGlmeSBpdHMgdGFyZ2V0XG4vLyBmaWVsZC4gRm9yIG5vdyB0aGlzIGNvbnRhaW5zIGFsbCB1cGRhdGUgb3BlcmF0aW9ucyBleGNlcHQgJyRyZW5hbWUnLlxuLy8gaHR0cDovL2RvY3MubW9uZ29kYi5vcmcvbWFudWFsL3JlZmVyZW5jZS9vcGVyYXRvcnMvI3VwZGF0ZVxuY29uc3QgQUxMT1dFRF9VUERBVEVfT1BFUkFUSU9OUyA9IHtcbiAgJGluYzoxLCAkc2V0OjEsICR1bnNldDoxLCAkYWRkVG9TZXQ6MSwgJHBvcDoxLCAkcHVsbEFsbDoxLCAkcHVsbDoxLFxuICAkcHVzaEFsbDoxLCAkcHVzaDoxLCAkYml0OjFcbn07XG5cbi8vIFNpbXVsYXRlIGEgbW9uZ28gYHJlbW92ZWAgb3BlcmF0aW9uIHdoaWxlIHZhbGlkYXRpbmcgYWNjZXNzIGNvbnRyb2xcbi8vIHJ1bGVzLiBTZWUgI1ZhbGlkYXRlZENoYW5nZVxuQ29sbGVjdGlvblByb3RvdHlwZS5fdmFsaWRhdGVkUmVtb3ZlID0gZnVuY3Rpb24odXNlcklkLCBzZWxlY3Rvcikge1xuICBjb25zdCBzZWxmID0gdGhpcztcblxuICBjb25zdCBmaW5kT3B0aW9ucyA9IHt0cmFuc2Zvcm06IG51bGx9O1xuICBpZiAoIXNlbGYuX3ZhbGlkYXRvcnMuZmV0Y2hBbGxGaWVsZHMpIHtcbiAgICBmaW5kT3B0aW9ucy5maWVsZHMgPSB7fTtcbiAgICBzZWxmLl92YWxpZGF0b3JzLmZldGNoLmZvckVhY2goKGZpZWxkTmFtZSkgPT4ge1xuICAgICAgZmluZE9wdGlvbnMuZmllbGRzW2ZpZWxkTmFtZV0gPSAxO1xuICAgIH0pO1xuICB9XG5cbiAgY29uc3QgZG9jID0gc2VsZi5fY29sbGVjdGlvbi5maW5kT25lKHNlbGVjdG9yLCBmaW5kT3B0aW9ucyk7XG4gIGlmICghZG9jKVxuICAgIHJldHVybiAwO1xuXG4gIC8vIGNhbGwgdXNlciB2YWxpZGF0b3JzLlxuICAvLyBBbnkgZGVueSByZXR1cm5zIHRydWUgbWVhbnMgZGVuaWVkLlxuICBpZiAoc2VsZi5fdmFsaWRhdG9ycy5yZW1vdmUuZGVueS5zb21lKCh2YWxpZGF0b3IpID0+IHtcbiAgICByZXR1cm4gdmFsaWRhdG9yKHVzZXJJZCwgdHJhbnNmb3JtRG9jKHZhbGlkYXRvciwgZG9jKSk7XG4gIH0pKSB7XG4gICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDMsIFwiQWNjZXNzIGRlbmllZFwiKTtcbiAgfVxuICAvLyBBbnkgYWxsb3cgcmV0dXJucyB0cnVlIG1lYW5zIHByb2NlZWQuIFRocm93IGVycm9yIGlmIHRoZXkgYWxsIGZhaWwuXG4gIGlmIChzZWxmLl92YWxpZGF0b3JzLnJlbW92ZS5hbGxvdy5ldmVyeSgodmFsaWRhdG9yKSA9PiB7XG4gICAgcmV0dXJuICF2YWxpZGF0b3IodXNlcklkLCB0cmFuc2Zvcm1Eb2ModmFsaWRhdG9yLCBkb2MpKTtcbiAgfSkpIHtcbiAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMywgXCJBY2Nlc3MgZGVuaWVkXCIpO1xuICB9XG5cbiAgLy8gQmFjayB3aGVuIHdlIHN1cHBvcnRlZCBhcmJpdHJhcnkgY2xpZW50LXByb3ZpZGVkIHNlbGVjdG9ycywgd2UgYWN0dWFsbHlcbiAgLy8gcmV3cm90ZSB0aGUgc2VsZWN0b3IgdG8ge19pZDogeyRpbjogW2lkcyB0aGF0IHdlIGZvdW5kXX19IGJlZm9yZSBwYXNzaW5nIHRvXG4gIC8vIE1vbmdvIHRvIGF2b2lkIHJhY2VzLCBidXQgc2luY2Ugc2VsZWN0b3IgaXMgZ3VhcmFudGVlZCB0byBhbHJlYWR5IGp1c3QgYmVcbiAgLy8gYW4gSUQsIHdlIGRvbid0IGhhdmUgdG8gYW55IG1vcmUuXG5cbiAgcmV0dXJuIHNlbGYuX2NvbGxlY3Rpb24ucmVtb3ZlLmNhbGwoc2VsZi5fY29sbGVjdGlvbiwgc2VsZWN0b3IpO1xufTtcblxuQ29sbGVjdGlvblByb3RvdHlwZS5fY2FsbE11dGF0b3JNZXRob2QgPSBmdW5jdGlvbiBfY2FsbE11dGF0b3JNZXRob2QobmFtZSwgYXJncywgY2FsbGJhY2spIHtcbiAgaWYgKE1ldGVvci5pc0NsaWVudCAmJiAhY2FsbGJhY2sgJiYgIWFscmVhZHlJblNpbXVsYXRpb24oKSkge1xuICAgIC8vIENsaWVudCBjYW4ndCBibG9jaywgc28gaXQgY2FuJ3QgcmVwb3J0IGVycm9ycyBieSBleGNlcHRpb24sXG4gICAgLy8gb25seSBieSBjYWxsYmFjay4gSWYgdGhleSBmb3JnZXQgdGhlIGNhbGxiYWNrLCBnaXZlIHRoZW0gYVxuICAgIC8vIGRlZmF1bHQgb25lIHRoYXQgbG9ncyB0aGUgZXJyb3IsIHNvIHRoZXkgYXJlbid0IHRvdGFsbHlcbiAgICAvLyBiYWZmbGVkIGlmIHRoZWlyIHdyaXRlcyBkb24ndCB3b3JrIGJlY2F1c2UgdGhlaXIgZGF0YWJhc2UgaXNcbiAgICAvLyBkb3duLlxuICAgIC8vIERvbid0IGdpdmUgYSBkZWZhdWx0IGNhbGxiYWNrIGluIHNpbXVsYXRpb24sIGJlY2F1c2UgaW5zaWRlIHN0dWJzIHdlXG4gICAgLy8gd2FudCB0byByZXR1cm4gdGhlIHJlc3VsdHMgZnJvbSB0aGUgbG9jYWwgY29sbGVjdGlvbiBpbW1lZGlhdGVseSBhbmRcbiAgICAvLyBub3QgZm9yY2UgYSBjYWxsYmFjay5cbiAgICBjYWxsYmFjayA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgIGlmIChlcnIpXG4gICAgICAgIE1ldGVvci5fZGVidWcobmFtZSArIFwiIGZhaWxlZFwiLCBlcnIpO1xuICAgIH07XG4gIH1cblxuICAvLyBGb3IgdHdvIG91dCBvZiB0aHJlZSBtdXRhdG9yIG1ldGhvZHMsIHRoZSBmaXJzdCBhcmd1bWVudCBpcyBhIHNlbGVjdG9yXG4gIGNvbnN0IGZpcnN0QXJnSXNTZWxlY3RvciA9IG5hbWUgPT09IFwidXBkYXRlXCIgfHwgbmFtZSA9PT0gXCJyZW1vdmVcIjtcbiAgaWYgKGZpcnN0QXJnSXNTZWxlY3RvciAmJiAhYWxyZWFkeUluU2ltdWxhdGlvbigpKSB7XG4gICAgLy8gSWYgd2UncmUgYWJvdXQgdG8gYWN0dWFsbHkgc2VuZCBhbiBSUEMsIHdlIHNob3VsZCB0aHJvdyBhbiBlcnJvciBpZlxuICAgIC8vIHRoaXMgaXMgYSBub24tSUQgc2VsZWN0b3IsIGJlY2F1c2UgdGhlIG11dGF0aW9uIG1ldGhvZHMgb25seSBhbGxvd1xuICAgIC8vIHNpbmdsZS1JRCBzZWxlY3RvcnMuIChJZiB3ZSBkb24ndCB0aHJvdyBoZXJlLCB3ZSdsbCBzZWUgZmxpY2tlci4pXG4gICAgdGhyb3dJZlNlbGVjdG9ySXNOb3RJZChhcmdzWzBdLCBuYW1lKTtcbiAgfVxuXG4gIGNvbnN0IG11dGF0b3JNZXRob2ROYW1lID0gdGhpcy5fcHJlZml4ICsgbmFtZTtcbiAgcmV0dXJuIHRoaXMuX2Nvbm5lY3Rpb24uYXBwbHkoXG4gICAgbXV0YXRvck1ldGhvZE5hbWUsIGFyZ3MsIHsgcmV0dXJuU3R1YlZhbHVlOiB0cnVlIH0sIGNhbGxiYWNrKTtcbn1cblxuZnVuY3Rpb24gdHJhbnNmb3JtRG9jKHZhbGlkYXRvciwgZG9jKSB7XG4gIGlmICh2YWxpZGF0b3IudHJhbnNmb3JtKVxuICAgIHJldHVybiB2YWxpZGF0b3IudHJhbnNmb3JtKGRvYyk7XG4gIHJldHVybiBkb2M7XG59XG5cbmZ1bmN0aW9uIGRvY1RvVmFsaWRhdGUodmFsaWRhdG9yLCBkb2MsIGdlbmVyYXRlZElkKSB7XG4gIGxldCByZXQgPSBkb2M7XG4gIGlmICh2YWxpZGF0b3IudHJhbnNmb3JtKSB7XG4gICAgcmV0ID0gRUpTT04uY2xvbmUoZG9jKTtcbiAgICAvLyBJZiB5b3Ugc2V0IGEgc2VydmVyLXNpZGUgdHJhbnNmb3JtIG9uIHlvdXIgY29sbGVjdGlvbiwgdGhlbiB5b3UgZG9uJ3QgZ2V0XG4gICAgLy8gdG8gdGVsbCB0aGUgZGlmZmVyZW5jZSBiZXR3ZWVuIFwiY2xpZW50IHNwZWNpZmllZCB0aGUgSURcIiBhbmQgXCJzZXJ2ZXJcbiAgICAvLyBnZW5lcmF0ZWQgdGhlIElEXCIsIGJlY2F1c2UgdHJhbnNmb3JtcyBleHBlY3QgdG8gZ2V0IF9pZC4gIElmIHlvdSB3YW50IHRvXG4gICAgLy8gZG8gdGhhdCBjaGVjaywgeW91IGNhbiBkbyBpdCB3aXRoIGEgc3BlY2lmaWNcbiAgICAvLyBgQy5hbGxvdyh7aW5zZXJ0OiBmLCB0cmFuc2Zvcm06IG51bGx9KWAgdmFsaWRhdG9yLlxuICAgIGlmIChnZW5lcmF0ZWRJZCAhPT0gbnVsbCkge1xuICAgICAgcmV0Ll9pZCA9IGdlbmVyYXRlZElkO1xuICAgIH1cbiAgICByZXQgPSB2YWxpZGF0b3IudHJhbnNmb3JtKHJldCk7XG4gIH1cbiAgcmV0dXJuIHJldDtcbn1cblxuZnVuY3Rpb24gYWRkVmFsaWRhdG9yKGNvbGxlY3Rpb24sIGFsbG93T3JEZW55LCBvcHRpb25zKSB7XG4gIC8vIHZhbGlkYXRlIGtleXNcbiAgY29uc3QgdmFsaWRLZXlzUmVnRXggPSAvXig/Omluc2VydHx1cGRhdGV8cmVtb3ZlfGZldGNofHRyYW5zZm9ybSkkLztcbiAgT2JqZWN0LmtleXMob3B0aW9ucykuZm9yRWFjaCgoa2V5KSA9PiB7XG4gICAgaWYgKCF2YWxpZEtleXNSZWdFeC50ZXN0KGtleSkpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYWxsb3dPckRlbnkgKyBcIjogSW52YWxpZCBrZXk6IFwiICsga2V5KTtcbiAgfSk7XG5cbiAgY29sbGVjdGlvbi5fcmVzdHJpY3RlZCA9IHRydWU7XG5cbiAgWydpbnNlcnQnLCAndXBkYXRlJywgJ3JlbW92ZSddLmZvckVhY2goKG5hbWUpID0+IHtcbiAgICBpZiAoaGFzT3duLmNhbGwob3B0aW9ucywgbmFtZSkpIHtcbiAgICAgIGlmICghKG9wdGlvbnNbbmFtZV0gaW5zdGFuY2VvZiBGdW5jdGlvbikpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGFsbG93T3JEZW55ICsgXCI6IFZhbHVlIGZvciBgXCIgKyBuYW1lICsgXCJgIG11c3QgYmUgYSBmdW5jdGlvblwiKTtcbiAgICAgIH1cblxuICAgICAgLy8gSWYgdGhlIHRyYW5zZm9ybSBpcyBzcGVjaWZpZWQgYXQgYWxsIChpbmNsdWRpbmcgYXMgJ251bGwnKSBpbiB0aGlzXG4gICAgICAvLyBjYWxsLCB0aGVuIHRha2UgdGhhdDsgb3RoZXJ3aXNlLCB0YWtlIHRoZSB0cmFuc2Zvcm0gZnJvbSB0aGVcbiAgICAgIC8vIGNvbGxlY3Rpb24uXG4gICAgICBpZiAob3B0aW9ucy50cmFuc2Zvcm0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBvcHRpb25zW25hbWVdLnRyYW5zZm9ybSA9IGNvbGxlY3Rpb24uX3RyYW5zZm9ybTsgIC8vIGFscmVhZHkgd3JhcHBlZFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3B0aW9uc1tuYW1lXS50cmFuc2Zvcm0gPSBMb2NhbENvbGxlY3Rpb24ud3JhcFRyYW5zZm9ybShcbiAgICAgICAgICBvcHRpb25zLnRyYW5zZm9ybSk7XG4gICAgICB9XG5cbiAgICAgIGNvbGxlY3Rpb24uX3ZhbGlkYXRvcnNbbmFtZV1bYWxsb3dPckRlbnldLnB1c2gob3B0aW9uc1tuYW1lXSk7XG4gICAgfVxuICB9KTtcblxuICAvLyBPbmx5IHVwZGF0ZSB0aGUgZmV0Y2ggZmllbGRzIGlmIHdlJ3JlIHBhc3NlZCB0aGluZ3MgdGhhdCBhZmZlY3RcbiAgLy8gZmV0Y2hpbmcuIFRoaXMgd2F5IGFsbG93KHt9KSBhbmQgYWxsb3coe2luc2VydDogZn0pIGRvbid0IHJlc3VsdCBpblxuICAvLyBzZXR0aW5nIGZldGNoQWxsRmllbGRzXG4gIGlmIChvcHRpb25zLnVwZGF0ZSB8fCBvcHRpb25zLnJlbW92ZSB8fCBvcHRpb25zLmZldGNoKSB7XG4gICAgaWYgKG9wdGlvbnMuZmV0Y2ggJiYgIShvcHRpb25zLmZldGNoIGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYWxsb3dPckRlbnkgKyBcIjogVmFsdWUgZm9yIGBmZXRjaGAgbXVzdCBiZSBhbiBhcnJheVwiKTtcbiAgICB9XG4gICAgY29sbGVjdGlvbi5fdXBkYXRlRmV0Y2gob3B0aW9ucy5mZXRjaCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gdGhyb3dJZlNlbGVjdG9ySXNOb3RJZChzZWxlY3RvciwgbWV0aG9kTmFtZSkge1xuICBpZiAoIUxvY2FsQ29sbGVjdGlvbi5fc2VsZWN0b3JJc0lkUGVyaGFwc0FzT2JqZWN0KHNlbGVjdG9yKSkge1xuICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoXG4gICAgICA0MDMsIFwiTm90IHBlcm1pdHRlZC4gVW50cnVzdGVkIGNvZGUgbWF5IG9ubHkgXCIgKyBtZXRob2ROYW1lICtcbiAgICAgICAgXCIgZG9jdW1lbnRzIGJ5IElELlwiKTtcbiAgfVxufTtcblxuLy8gRGV0ZXJtaW5lIGlmIHdlIGFyZSBpbiBhIEREUCBtZXRob2Qgc2ltdWxhdGlvblxuZnVuY3Rpb24gYWxyZWFkeUluU2ltdWxhdGlvbigpIHtcbiAgdmFyIEN1cnJlbnRJbnZvY2F0aW9uID1cbiAgICBERFAuX0N1cnJlbnRNZXRob2RJbnZvY2F0aW9uIHx8XG4gICAgLy8gRm9yIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5LCBhcyBleHBsYWluZWQgaW4gdGhpcyBpc3N1ZTpcbiAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vbWV0ZW9yL21ldGVvci9pc3N1ZXMvODk0N1xuICAgIEREUC5fQ3VycmVudEludm9jYXRpb247XG5cbiAgY29uc3QgZW5jbG9zaW5nID0gQ3VycmVudEludm9jYXRpb24uZ2V0KCk7XG4gIHJldHVybiBlbmNsb3NpbmcgJiYgZW5jbG9zaW5nLmlzU2ltdWxhdGlvbjtcbn1cbiJdfQ==
