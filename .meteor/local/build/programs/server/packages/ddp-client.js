(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var check = Package.check.check;
var Match = Package.check.Match;
var Random = Package.random.Random;
var EJSON = Package.ejson.EJSON;
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var Retry = Package.retry.Retry;
var IdMap = Package['id-map'].IdMap;
var ECMAScript = Package.ecmascript.ECMAScript;
var Hook = Package['callback-hook'].Hook;
var DDPCommon = Package['ddp-common'].DDPCommon;
var DiffSequence = Package['diff-sequence'].DiffSequence;
var MongoID = Package['mongo-id'].MongoID;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var options, args, callback, DDP;

var require = meteorInstall({"node_modules":{"meteor":{"ddp-client":{"server":{"server.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ddp-client/server/server.js                                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.link("../common/namespace.js", {
  DDP: "DDP"
}, 0);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"common":{"MethodInvoker.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ddp-client/common/MethodInvoker.js                                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  default: () => MethodInvoker
});
class MethodInvoker {
  constructor(options) {
    // Public (within this file) fields.
    this.methodId = options.methodId;
    this.sentMessage = false;
    this._callback = options.callback;
    this._connection = options.connection;
    this._message = options.message;
    this._onResultReceived = options.onResultReceived || (() => {});
    this._wait = options.wait;
    this.noRetry = options.noRetry;
    this._methodResult = null;
    this._dataVisible = false;

    // Register with the connection.
    this._connection._methodInvokers[this.methodId] = this;
  }
  // Sends the method message to the server. May be called additional times if
  // we lose the connection and reconnect before receiving a result.
  sendMessage() {
    // This function is called before sending a method (including resending on
    // reconnect). We should only (re)send methods where we don't already have a
    // result!
    if (this.gotResult()) throw new Error('sendingMethod is called on method with result');

    // If we're re-sending it, it doesn't matter if data was written the first
    // time.
    this._dataVisible = false;
    this.sentMessage = true;

    // If this is a wait method, make all data messages be buffered until it is
    // done.
    if (this._wait) this._connection._methodsBlockingQuiescence[this.methodId] = true;

    // Actually send the message.
    this._connection._send(this._message);
  }
  // Invoke the callback, if we have both a result and know that all data has
  // been written to the local cache.
  _maybeInvokeCallback() {
    if (this._methodResult && this._dataVisible) {
      // Call the callback. (This won't throw: the callback was wrapped with
      // bindEnvironment.)
      this._callback(this._methodResult[0], this._methodResult[1]);

      // Forget about this method.
      delete this._connection._methodInvokers[this.methodId];

      // Let the connection know that this method is finished, so it can try to
      // move on to the next block of methods.
      this._connection._outstandingMethodFinished();
    }
  }
  // Call with the result of the method from the server. Only may be called
  // once; once it is called, you should not call sendMessage again.
  // If the user provided an onResultReceived callback, call it immediately.
  // Then invoke the main callback if data is also visible.
  receiveResult(err, result) {
    if (this.gotResult()) throw new Error('Methods should only receive results once');
    this._methodResult = [err, result];
    this._onResultReceived(err, result);
    this._maybeInvokeCallback();
  }
  // Call this when all data written by the method is visible. This means that
  // the method has returns its "data is done" message *AND* all server
  // documents that are buffered at that time have been written to the local
  // cache. Invokes the main callback if the result has been received.
  dataVisible() {
    this._dataVisible = true;
    this._maybeInvokeCallback();
  }
  // True if receiveResult has been called.
  gotResult() {
    return !!this._methodResult;
  }
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"livedata_connection.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ddp-client/common/livedata_connection.js                                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
const _excluded = ["stubInvocation", "invocation"],
  _excluded2 = ["stubInvocation", "invocation"];
let _objectWithoutProperties;
module.link("@babel/runtime/helpers/objectWithoutProperties", {
  default(v) {
    _objectWithoutProperties = v;
  }
}, 0);
let _objectSpread;
module.link("@babel/runtime/helpers/objectSpread2", {
  default(v) {
    _objectSpread = v;
  }
}, 1);
module.export({
  Connection: () => Connection
});
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }
}, 0);
let DDPCommon;
module.link("meteor/ddp-common", {
  DDPCommon(v) {
    DDPCommon = v;
  }
}, 1);
let Tracker;
module.link("meteor/tracker", {
  Tracker(v) {
    Tracker = v;
  }
}, 2);
let EJSON;
module.link("meteor/ejson", {
  EJSON(v) {
    EJSON = v;
  }
}, 3);
let Random;
module.link("meteor/random", {
  Random(v) {
    Random = v;
  }
}, 4);
let Hook;
module.link("meteor/callback-hook", {
  Hook(v) {
    Hook = v;
  }
}, 5);
let MongoID;
module.link("meteor/mongo-id", {
  MongoID(v) {
    MongoID = v;
  }
}, 6);
let DDP;
module.link("./namespace.js", {
  DDP(v) {
    DDP = v;
  }
}, 7);
let MethodInvoker;
module.link("./MethodInvoker.js", {
  default(v) {
    MethodInvoker = v;
  }
}, 8);
let hasOwn, slice, keys, isEmpty, last;
module.link("meteor/ddp-common/utils.js", {
  hasOwn(v) {
    hasOwn = v;
  },
  slice(v) {
    slice = v;
  },
  keys(v) {
    keys = v;
  },
  isEmpty(v) {
    isEmpty = v;
  },
  last(v) {
    last = v;
  }
}, 9);
let Fiber;
let Future;
if (Meteor.isServer) {
  Fiber = Npm.require('fibers');
  Future = Npm.require('fibers/future');
}
class MongoIDMap extends IdMap {
  constructor() {
    super(MongoID.idStringify, MongoID.idParse);
  }
}

// @param url {String|Object} URL to Meteor app,
//   or an object as a test hook (see code)
// Options:
//   reloadWithOutstanding: is it OK to reload if there are outstanding methods?
//   headers: extra headers to send on the websockets connection, for
//     server-to-server DDP only
//   _sockjsOptions: Specifies options to pass through to the sockjs client
//   onDDPNegotiationVersionFailure: callback when version negotiation fails.
//
// XXX There should be a way to destroy a DDP connection, causing all
// outstanding method calls to fail.
//
// XXX Our current way of handling failure and reconnection is great
// for an app (where we want to tolerate being disconnected as an
// expect state, and keep trying forever to reconnect) but cumbersome
// for something like a command line tool that wants to make a
// connection, call a method, and print an error if connection
// fails. We should have better usability in the latter case (while
// still transparently reconnecting if it's just a transient failure
// or the server migrating us).
class Connection {
  constructor(url, options) {
    const self = this;
    this.options = options = _objectSpread({
      onConnected() {},
      onDDPVersionNegotiationFailure(description) {
        Meteor._debug(description);
      },
      heartbeatInterval: 17500,
      heartbeatTimeout: 15000,
      npmFayeOptions: Object.create(null),
      // These options are only for testing.
      reloadWithOutstanding: false,
      supportedDDPVersions: DDPCommon.SUPPORTED_DDP_VERSIONS,
      retry: true,
      respondToPings: true,
      // When updates are coming within this ms interval, batch them together.
      bufferedWritesInterval: 5,
      // Flush buffers immediately if writes are happening continuously for more than this many ms.
      bufferedWritesMaxAge: 500
    }, options);

    // If set, called when we reconnect, queuing method calls _before_ the
    // existing outstanding ones.
    // NOTE: This feature has been preserved for backwards compatibility. The
    // preferred method of setting a callback on reconnect is to use
    // DDP.onReconnect.
    self.onReconnect = null;

    // as a test hook, allow passing a stream instead of a url.
    if (typeof url === 'object') {
      self._stream = url;
    } else {
      const {
        ClientStream
      } = require("meteor/socket-stream-client");
      self._stream = new ClientStream(url, {
        retry: options.retry,
        ConnectionError: DDP.ConnectionError,
        headers: options.headers,
        _sockjsOptions: options._sockjsOptions,
        // Used to keep some tests quiet, or for other cases in which
        // the right thing to do with connection errors is to silently
        // fail (e.g. sending package usage stats). At some point we
        // should have a real API for handling client-stream-level
        // errors.
        _dontPrintErrors: options._dontPrintErrors,
        connectTimeoutMs: options.connectTimeoutMs,
        npmFayeOptions: options.npmFayeOptions
      });
    }
    self._lastSessionId = null;
    self._versionSuggestion = null; // The last proposed DDP version.
    self._version = null; // The DDP version agreed on by client and server.
    self._stores = Object.create(null); // name -> object with methods
    self._methodHandlers = Object.create(null); // name -> func
    self._nextMethodId = 1;
    self._supportedDDPVersions = options.supportedDDPVersions;
    self._heartbeatInterval = options.heartbeatInterval;
    self._heartbeatTimeout = options.heartbeatTimeout;

    // Tracks methods which the user has tried to call but which have not yet
    // called their user callback (ie, they are waiting on their result or for all
    // of their writes to be written to the local cache). Map from method ID to
    // MethodInvoker object.
    self._methodInvokers = Object.create(null);

    // Tracks methods which the user has called but whose result messages have not
    // arrived yet.
    //
    // _outstandingMethodBlocks is an array of blocks of methods. Each block
    // represents a set of methods that can run at the same time. The first block
    // represents the methods which are currently in flight; subsequent blocks
    // must wait for previous blocks to be fully finished before they can be sent
    // to the server.
    //
    // Each block is an object with the following fields:
    // - methods: a list of MethodInvoker objects
    // - wait: a boolean; if true, this block had a single method invoked with
    //         the "wait" option
    //
    // There will never be adjacent blocks with wait=false, because the only thing
    // that makes methods need to be serialized is a wait method.
    //
    // Methods are removed from the first block when their "result" is
    // received. The entire first block is only removed when all of the in-flight
    // methods have received their results (so the "methods" list is empty) *AND*
    // all of the data written by those methods are visible in the local cache. So
    // it is possible for the first block's methods list to be empty, if we are
    // still waiting for some objects to quiesce.
    //
    // Example:
    //  _outstandingMethodBlocks = [
    //    {wait: false, methods: []},
    //    {wait: true, methods: [<MethodInvoker for 'login'>]},
    //    {wait: false, methods: [<MethodInvoker for 'foo'>,
    //                            <MethodInvoker for 'bar'>]}]
    // This means that there were some methods which were sent to the server and
    // which have returned their results, but some of the data written by
    // the methods may not be visible in the local cache. Once all that data is
    // visible, we will send a 'login' method. Once the login method has returned
    // and all the data is visible (including re-running subs if userId changes),
    // we will send the 'foo' and 'bar' methods in parallel.
    self._outstandingMethodBlocks = [];

    // method ID -> array of objects with keys 'collection' and 'id', listing
    // documents written by a given method's stub. keys are associated with
    // methods whose stub wrote at least one document, and whose data-done message
    // has not yet been received.
    self._documentsWrittenByStub = {};
    // collection -> IdMap of "server document" object. A "server document" has:
    // - "document": the version of the document according the
    //   server (ie, the snapshot before a stub wrote it, amended by any changes
    //   received from the server)
    //   It is undefined if we think the document does not exist
    // - "writtenByStubs": a set of method IDs whose stubs wrote to the document
    //   whose "data done" messages have not yet been processed
    self._serverDocuments = {};

    // Array of callbacks to be called after the next update of the local
    // cache. Used for:
    //  - Calling methodInvoker.dataVisible and sub ready callbacks after
    //    the relevant data is flushed.
    //  - Invoking the callbacks of "half-finished" methods after reconnect
    //    quiescence. Specifically, methods whose result was received over the old
    //    connection (so we don't re-send it) but whose data had not been made
    //    visible.
    self._afterUpdateCallbacks = [];

    // In two contexts, we buffer all incoming data messages and then process them
    // all at once in a single update:
    //   - During reconnect, we buffer all data messages until all subs that had
    //     been ready before reconnect are ready again, and all methods that are
    //     active have returned their "data done message"; then
    //   - During the execution of a "wait" method, we buffer all data messages
    //     until the wait method gets its "data done" message. (If the wait method
    //     occurs during reconnect, it doesn't get any special handling.)
    // all data messages are processed in one update.
    //
    // The following fields are used for this "quiescence" process.

    // This buffers the messages that aren't being processed yet.
    self._messagesBufferedUntilQuiescence = [];
    // Map from method ID -> true. Methods are removed from this when their
    // "data done" message is received, and we will not quiesce until it is
    // empty.
    self._methodsBlockingQuiescence = {};
    // map from sub ID -> true for subs that were ready (ie, called the sub
    // ready callback) before reconnect but haven't become ready again yet
    self._subsBeingRevived = {}; // map from sub._id -> true
    // if true, the next data update should reset all stores. (set during
    // reconnect.)
    self._resetStores = false;

    // name -> array of updates for (yet to be created) collections
    self._updatesForUnknownStores = {};
    // if we're blocking a migration, the retry func
    self._retryMigrate = null;
    self.__flushBufferedWrites = Meteor.bindEnvironment(self._flushBufferedWrites, 'flushing DDP buffered writes', self);
    // Collection name -> array of messages.
    self._bufferedWrites = {};
    // When current buffer of updates must be flushed at, in ms timestamp.
    self._bufferedWritesFlushAt = null;
    // Timeout handle for the next processing of all pending writes
    self._bufferedWritesFlushHandle = null;
    self._bufferedWritesInterval = options.bufferedWritesInterval;
    self._bufferedWritesMaxAge = options.bufferedWritesMaxAge;

    // metadata for subscriptions.  Map from sub ID to object with keys:
    //   - id
    //   - name
    //   - params
    //   - inactive (if true, will be cleaned up if not reused in re-run)
    //   - ready (has the 'ready' message been received?)
    //   - readyCallback (an optional callback to call when ready)
    //   - errorCallback (an optional callback to call if the sub terminates with
    //                    an error, XXX COMPAT WITH 1.0.3.1)
    //   - stopCallback (an optional callback to call when the sub terminates
    //     for any reason, with an error argument if an error triggered the stop)
    self._subscriptions = {};

    // Reactive userId.
    self._userId = null;
    self._userIdDeps = new Tracker.Dependency();

    // Block auto-reload while we're waiting for method responses.
    if (Meteor.isClient && Package.reload && !options.reloadWithOutstanding) {
      Package.reload.Reload._onMigrate(retry => {
        if (!self._readyToMigrate()) {
          self._retryMigrate = retry;
          return [false];
        } else {
          return [true];
        }
      });
    }
    const onDisconnect = () => {
      if (self._heartbeat) {
        self._heartbeat.stop();
        self._heartbeat = null;
      }
    };
    if (Meteor.isServer) {
      self._stream.on('message', Meteor.bindEnvironment(this.onMessage.bind(this), 'handling DDP message'));
      self._stream.on('reset', Meteor.bindEnvironment(this.onReset.bind(this), 'handling DDP reset'));
      self._stream.on('disconnect', Meteor.bindEnvironment(onDisconnect, 'handling DDP disconnect'));
    } else {
      self._stream.on('message', this.onMessage.bind(this));
      self._stream.on('reset', this.onReset.bind(this));
      self._stream.on('disconnect', onDisconnect);
    }
  }

  // 'name' is the name of the data on the wire that should go in the
  // store. 'wrappedStore' should be an object with methods beginUpdate, update,
  // endUpdate, saveOriginals, retrieveOriginals. see Collection for an example.
  registerStore(name, wrappedStore) {
    const self = this;
    if (name in self._stores) return false;

    // Wrap the input object in an object which makes any store method not
    // implemented by 'store' into a no-op.
    const store = Object.create(null);
    const keysOfStore = ['update', 'beginUpdate', 'endUpdate', 'saveOriginals', 'retrieveOriginals', 'getDoc', '_getCollection'];
    keysOfStore.forEach(method => {
      store[method] = function () {
        if (wrappedStore[method]) {
          return wrappedStore[method](...arguments);
        }
      };
    });
    self._stores[name] = store;
    const queued = self._updatesForUnknownStores[name];
    if (Array.isArray(queued)) {
      store.beginUpdate(queued.length, false);
      queued.forEach(msg => {
        store.update(msg);
      });
      store.endUpdate();
      delete self._updatesForUnknownStores[name];
    }
    return true;
  }

  /**
   * @memberOf Meteor
   * @importFromPackage meteor
   * @alias Meteor.subscribe
   * @summary Subscribe to a record set.  Returns a handle that provides
   * `stop()` and `ready()` methods.
   * @locus Client
   * @param {String} name Name of the subscription.  Matches the name of the
   * server's `publish()` call.
   * @param {EJSONable} [arg1,arg2...] Optional arguments passed to publisher
   * function on server.
   * @param {Function|Object} [callbacks] Optional. May include `onStop`
   * and `onReady` callbacks. If there is an error, it is passed as an
   * argument to `onStop`. If a function is passed instead of an object, it
   * is interpreted as an `onReady` callback.
   */
  subscribe(name /* .. [arguments] .. (callback|callbacks) */) {
    const self = this;
    const params = slice.call(arguments, 1);
    let callbacks = Object.create(null);
    if (params.length) {
      const lastParam = params[params.length - 1];
      if (typeof lastParam === 'function') {
        callbacks.onReady = params.pop();
      } else if (lastParam && [lastParam.onReady,
      // XXX COMPAT WITH 1.0.3.1 onError used to exist, but now we use
      // onStop with an error callback instead.
      lastParam.onError, lastParam.onStop].some(f => typeof f === "function")) {
        callbacks = params.pop();
      }
    }

    // Is there an existing sub with the same name and param, run in an
    // invalidated Computation? This will happen if we are rerunning an
    // existing computation.
    //
    // For example, consider a rerun of:
    //
    //     Tracker.autorun(function () {
    //       Meteor.subscribe("foo", Session.get("foo"));
    //       Meteor.subscribe("bar", Session.get("bar"));
    //     });
    //
    // If "foo" has changed but "bar" has not, we will match the "bar"
    // subcribe to an existing inactive subscription in order to not
    // unsub and resub the subscription unnecessarily.
    //
    // We only look for one such sub; if there are N apparently-identical subs
    // being invalidated, we will require N matching subscribe calls to keep
    // them all active.
    const existing = Object.values(self._subscriptions).find(sub => sub.inactive && sub.name === name && EJSON.equals(sub.params, params));
    let id;
    if (existing) {
      id = existing.id;
      existing.inactive = false; // reactivate

      if (callbacks.onReady) {
        // If the sub is not already ready, replace any ready callback with the
        // one provided now. (It's not really clear what users would expect for
        // an onReady callback inside an autorun; the semantics we provide is
        // that at the time the sub first becomes ready, we call the last
        // onReady callback provided, if any.)
        // If the sub is already ready, run the ready callback right away.
        // It seems that users would expect an onReady callback inside an
        // autorun to trigger once the the sub first becomes ready and also
        // when re-subs happens.
        if (existing.ready) {
          callbacks.onReady();
        } else {
          existing.readyCallback = callbacks.onReady;
        }
      }

      // XXX COMPAT WITH 1.0.3.1 we used to have onError but now we call
      // onStop with an optional error argument
      if (callbacks.onError) {
        // Replace existing callback if any, so that errors aren't
        // double-reported.
        existing.errorCallback = callbacks.onError;
      }
      if (callbacks.onStop) {
        existing.stopCallback = callbacks.onStop;
      }
    } else {
      // New sub! Generate an id, save it locally, and send message.
      id = Random.id();
      self._subscriptions[id] = {
        id: id,
        name: name,
        params: EJSON.clone(params),
        inactive: false,
        ready: false,
        readyDeps: new Tracker.Dependency(),
        readyCallback: callbacks.onReady,
        // XXX COMPAT WITH 1.0.3.1 #errorCallback
        errorCallback: callbacks.onError,
        stopCallback: callbacks.onStop,
        connection: self,
        remove() {
          delete this.connection._subscriptions[this.id];
          this.ready && this.readyDeps.changed();
        },
        stop() {
          this.connection._send({
            msg: 'unsub',
            id: id
          });
          this.remove();
          if (callbacks.onStop) {
            callbacks.onStop();
          }
        }
      };
      self._send({
        msg: 'sub',
        id: id,
        name: name,
        params: params
      });
    }

    // return a handle to the application.
    const handle = {
      stop() {
        if (!hasOwn.call(self._subscriptions, id)) {
          return;
        }
        self._subscriptions[id].stop();
      },
      ready() {
        // return false if we've unsubscribed.
        if (!hasOwn.call(self._subscriptions, id)) {
          return false;
        }
        const record = self._subscriptions[id];
        record.readyDeps.depend();
        return record.ready;
      },
      subscriptionId: id
    };
    if (Tracker.active) {
      // We're in a reactive computation, so we'd like to unsubscribe when the
      // computation is invalidated... but not if the rerun just re-subscribes
      // to the same subscription!  When a rerun happens, we use onInvalidate
      // as a change to mark the subscription "inactive" so that it can
      // be reused from the rerun.  If it isn't reused, it's killed from
      // an afterFlush.
      Tracker.onInvalidate(c => {
        if (hasOwn.call(self._subscriptions, id)) {
          self._subscriptions[id].inactive = true;
        }
        Tracker.afterFlush(() => {
          if (hasOwn.call(self._subscriptions, id) && self._subscriptions[id].inactive) {
            handle.stop();
          }
        });
      });
    }
    return handle;
  }

  // options:
  // - onLateError {Function(error)} called if an error was received after the ready event.
  //     (errors received before ready cause an error to be thrown)
  _subscribeAndWait(name, args, options) {
    const self = this;
    const f = new Future();
    let ready = false;
    args = args || [];
    args.push({
      onReady() {
        ready = true;
        f['return']();
      },
      onError(e) {
        if (!ready) f['throw'](e);else options && options.onLateError && options.onLateError(e);
      }
    });
    const handle = self.subscribe.apply(self, [name].concat(args));
    f.wait();
    return handle;
  }
  methods(methods) {
    Object.entries(methods).forEach(_ref => {
      let [name, func] = _ref;
      if (typeof func !== 'function') {
        throw new Error("Method '" + name + "' must be a function");
      }
      if (this._methodHandlers[name]) {
        throw new Error("A method named '" + name + "' is already defined");
      }
      this._methodHandlers[name] = func;
    });
  }
  _getIsSimulation(_ref2) {
    let {
      isFromCallAsync,
      alreadyInSimulation
    } = _ref2;
    if (!isFromCallAsync) {
      return alreadyInSimulation;
    }
    return alreadyInSimulation && DDP._CurrentMethodInvocation._isCallAsyncMethodRunning();
  }

  /**
   * @memberOf Meteor
   * @importFromPackage meteor
   * @alias Meteor.call
   * @summary Invokes a method with a sync stub, passing any number of arguments.
   * @locus Anywhere
   * @param {String} name Name of method to invoke
   * @param {EJSONable} [arg1,arg2...] Optional method arguments
   * @param {Function} [asyncCallback] Optional callback, which is called asynchronously with the error or result after the method is complete. If not provided, the method runs synchronously if possible (see below).
   */
  call(name /* .. [arguments] .. callback */) {
    // if it's a function, the last argument is the result callback,
    // not a parameter to the remote method.
    const args = slice.call(arguments, 1);
    let callback;
    if (args.length && typeof args[args.length - 1] === 'function') {
      callback = args.pop();
    }
    return this.apply(name, args, callback);
  }
  /**
   * @memberOf Meteor
   * @importFromPackage meteor
   * @alias Meteor.callAsync
   * @summary Invokes a method with an async stub, passing any number of arguments.
   * @locus Anywhere
   * @param {String} name Name of method to invoke
   * @param {EJSONable} [arg1,arg2...] Optional method arguments
   * @returns {Promise}
   */
  callAsync(name /* .. [arguments] .. */) {
    return Promise.asyncApply(() => {
      const args = slice.call(arguments, 1);
      if (args.length && typeof args[args.length - 1] === 'function') {
        throw new Error("Meteor.callAsync() does not accept a callback. You should 'await' the result, or use .then().");
      }
      /*
      * This is necessary because when you call a Promise.then, you're actually calling a bound function by Meteor.
      *
      * This is done by this code https://github.com/meteor/meteor/blob/17673c66878d3f7b1d564a4215eb0633fa679017/npm-packages/meteor-promise/promise_client.js#L1-L16. (All the logic below can be removed in the future, when we stop overwriting the
      * Promise.)
      *
      * When you call a ".then()", like "Meteor.callAsync().then()", the global context (inside currentValues)
      * will be from the call of Meteor.callAsync(), and not the context after the promise is done.
      *
      * This means that without this code if you call a stub inside the ".then()", this stub will act as a simulation
      * and won't reach the server.
      *
      * Inside the function _getIsSimulation(), if isFromCallAsync is false, we continue to consider just the
      * alreadyInSimulation, otherwise, isFromCallAsync is true, we also check the value of callAsyncMethodRunning (by
      * calling DDP._CurrentMethodInvocation._isCallAsyncMethodRunning()).
      *
      * With this, if a stub is running inside a ".then()", it'll know it's not a simulation, because callAsyncMethodRunning
      * will be false.
      *
      * DDP._CurrentMethodInvocation._set() is important because without it, if you have a code like:
      *
      * Meteor.callAsync("m1").then(() => {
      *   Meteor.callAsync("m2")
      * })
      *
      * The call the method m2 will act as a simulation and won't reach the server. That's why we reset the context here
      * before calling everything else.
      *
      * */
      DDP._CurrentMethodInvocation._set();
      DDP._CurrentMethodInvocation._setCallAsyncMethodRunning(true);
      return new Promise((resolve, reject) => {
        this.applyAsync(name, args, {
          isFromCallAsync: true
        }, (err, result) => {
          DDP._CurrentMethodInvocation._setCallAsyncMethodRunning(false);
          if (err) {
            reject(err);
            return;
          }
          resolve(result);
        });
      });
    });
  }

  /**
   * @memberOf Meteor
   * @importFromPackage meteor
   * @alias Meteor.apply
   * @summary Invoke a method passing an array of arguments.
   * @locus Anywhere
   * @param {String} name Name of method to invoke
   * @param {EJSONable[]} args Method arguments
   * @param {Object} [options]
   * @param {Boolean} options.wait (Client only) If true, don't send this method until all previous method calls have completed, and don't send any subsequent method calls until this one is completed.
   * @param {Function} options.onResultReceived (Client only) This callback is invoked with the error or result of the method (just like `asyncCallback`) as soon as the error or result is available. The local cache may not yet reflect the writes performed by the method.
   * @param {Boolean} options.noRetry (Client only) if true, don't send this method again on reload, simply call the callback an error with the error code 'invocation-failed'.
   * @param {Boolean} options.throwStubExceptions (Client only) If true, exceptions thrown by method stubs will be thrown instead of logged, and the method will not be invoked on the server.
   * @param {Boolean} options.returnStubValue (Client only) If true then in cases where we would have otherwise discarded the stub's return value and returned undefined, instead we go ahead and return it. Specifically, this is any time other than when (a) we are already inside a stub or (b) we are in Node and no callback was provided. Currently we require this flag to be explicitly passed to reduce the likelihood that stub return values will be confused with server return values; we may improve this in future.
   * @param {Function} [asyncCallback] Optional callback; same semantics as in [`Meteor.call`](#meteor_call).
   */
  apply(name, args, options, callback) {
    const _this$_stubCall = this._stubCall(name, EJSON.clone(args)),
      {
        stubInvocation,
        invocation
      } = _this$_stubCall,
      stubOptions = _objectWithoutProperties(_this$_stubCall, _excluded);
    if (stubOptions.hasStub) {
      if (!this._getIsSimulation({
        alreadyInSimulation: stubOptions.alreadyInSimulation,
        isFromCallAsync: stubOptions.isFromCallAsync
      })) {
        this._saveOriginals();
      }
      try {
        stubOptions.stubReturnValue = DDP._CurrentMethodInvocation.withValue(invocation, stubInvocation);
      } catch (e) {
        stubOptions.exception = e;
      }
    }
    return this._apply(name, stubOptions, args, options, callback);
  }

  /**
   * @memberOf Meteor
   * @importFromPackage meteor
   * @alias Meteor.applyAsync
   * @summary Invoke a method passing an array of arguments.
   * @locus Anywhere
   * @param {String} name Name of method to invoke
   * @param {EJSONable[]} args Method arguments
   * @param {Object} [options]
   * @param {Boolean} options.wait (Client only) If true, don't send this method until all previous method calls have completed, and don't send any subsequent method calls until this one is completed.
   * @param {Function} options.onResultReceived (Client only) This callback is invoked with the error or result of the method (just like `asyncCallback`) as soon as the error or result is available. The local cache may not yet reflect the writes performed by the method.
   * @param {Boolean} options.noRetry (Client only) if true, don't send this method again on reload, simply call the callback an error with the error code 'invocation-failed'.
   * @param {Boolean} options.throwStubExceptions (Client only) If true, exceptions thrown by method stubs will be thrown instead of logged, and the method will not be invoked on the server.
   * @param {Boolean} options.returnStubValue (Client only) If true then in cases where we would have otherwise discarded the stub's return value and returned undefined, instead we go ahead and return it. Specifically, this is any time other than when (a) we are already inside a stub or (b) we are in Node and no callback was provided. Currently we require this flag to be explicitly passed to reduce the likelihood that stub return values will be confused with server return values; we may improve this in future.
   * @param {Function} [asyncCallback] Optional callback.
   */
  applyAsync(name, args, options, callback) {
    return Promise.asyncApply(() => {
      const _this$_stubCall2 = this._stubCall(name, EJSON.clone(args), options),
        {
          stubInvocation,
          invocation
        } = _this$_stubCall2,
        stubOptions = _objectWithoutProperties(_this$_stubCall2, _excluded2);
      if (stubOptions.hasStub) {
        if (!this._getIsSimulation({
          alreadyInSimulation: stubOptions.alreadyInSimulation,
          isFromCallAsync: stubOptions.isFromCallAsync
        })) {
          this._saveOriginals();
        }
        try {
          /*
           * The code below follows the same logic as the function withValues().
           *
           * But as the Meteor package is not compiled by ecmascript, it is unable to use newer syntax in the browser,
           * such as, the async/await.
           *
           * So, to keep supporting old browsers, like IE 11, we're creating the logic one level above.
           */
          const currentContext = DDP._CurrentMethodInvocation._setNewContextAndGetCurrent(invocation);
          try {
            const resultOrThenable = stubInvocation();
            const isThenable = resultOrThenable && typeof resultOrThenable.then === 'function';
            if (isThenable) {
              stubOptions.stubReturnValue = Promise.await(resultOrThenable);
            } else {
              stubOptions.stubReturnValue = resultOrThenable;
            }
          } finally {
            DDP._CurrentMethodInvocation._set(currentContext);
          }
        } catch (e) {
          stubOptions.exception = e;
        }
      }
      return this._apply(name, stubOptions, args, options, callback);
    });
  }
  _apply(name, stubCallValue, args, options, callback) {
    const self = this;

    // We were passed 3 arguments. They may be either (name, args, options)
    // or (name, args, callback)
    if (!callback && typeof options === 'function') {
      callback = options;
      options = Object.create(null);
    }
    options = options || Object.create(null);
    if (callback) {
      // XXX would it be better form to do the binding in stream.on,
      // or caller, instead of here?
      // XXX improve error message (and how we report it)
      callback = Meteor.bindEnvironment(callback, "delivering result of invoking '" + name + "'");
    }

    // Keep our args safe from mutation (eg if we don't send the message for a
    // while because of a wait method).
    args = EJSON.clone(args);
    const {
      hasStub,
      exception,
      stubReturnValue,
      alreadyInSimulation,
      randomSeed
    } = stubCallValue;

    // If we're in a simulation, stop and return the result we have,
    // rather than going on to do an RPC. If there was no stub,
    // we'll end up returning undefined.
    if (this._getIsSimulation({
      alreadyInSimulation,
      isFromCallAsync: stubCallValue.isFromCallAsync
    })) {
      if (callback) {
        callback(exception, stubReturnValue);
        return undefined;
      }
      if (exception) throw exception;
      return stubReturnValue;
    }

    // We only create the methodId here because we don't actually need one if
    // we're already in a simulation
    const methodId = '' + self._nextMethodId++;
    if (hasStub) {
      self._retrieveAndStoreOriginals(methodId);
    }

    // Generate the DDP message for the method call. Note that on the client,
    // it is important that the stub have finished before we send the RPC, so
    // that we know we have a complete list of which local documents the stub
    // wrote.
    const message = {
      msg: 'method',
      id: methodId,
      method: name,
      params: args
    };

    // If an exception occurred in a stub, and we're ignoring it
    // because we're doing an RPC and want to use what the server
    // returns instead, log it so the developer knows
    // (unless they explicitly ask to see the error).
    //
    // Tests can set the '_expectedByTest' flag on an exception so it won't
    // go to log.
    if (exception) {
      if (options.throwStubExceptions) {
        throw exception;
      } else if (!exception._expectedByTest) {
        Meteor._debug("Exception while simulating the effect of invoking '" + name + "'", exception);
      }
    }

    // At this point we're definitely doing an RPC, and we're going to
    // return the value of the RPC to the caller.

    // If the caller didn't give a callback, decide what to do.
    let future;
    if (!callback) {
      if (Meteor.isClient) {
        // On the client, we don't have fibers, so we can't block. The
        // only thing we can do is to return undefined and discard the
        // result of the RPC. If an error occurred then print the error
        // to the console.
        callback = err => {
          err && Meteor._debug("Error invoking Method '" + name + "'", err);
        };
      } else {
        // On the server, make the function synchronous. Throw on
        // errors, return on success.
        future = new Future();
        callback = future.resolver();
      }
    }

    // Send the randomSeed only if we used it
    if (randomSeed.value !== null) {
      message.randomSeed = randomSeed.value;
    }
    const methodInvoker = new MethodInvoker({
      methodId,
      callback: callback,
      connection: self,
      onResultReceived: options.onResultReceived,
      wait: !!options.wait,
      message: message,
      noRetry: !!options.noRetry
    });
    if (options.wait) {
      // It's a wait method! Wait methods go in their own block.
      self._outstandingMethodBlocks.push({
        wait: true,
        methods: [methodInvoker]
      });
    } else {
      // Not a wait method. Start a new block if the previous block was a wait
      // block, and add it to the last block of methods.
      if (isEmpty(self._outstandingMethodBlocks) || last(self._outstandingMethodBlocks).wait) {
        self._outstandingMethodBlocks.push({
          wait: false,
          methods: []
        });
      }
      last(self._outstandingMethodBlocks).methods.push(methodInvoker);
    }

    // If we added it to the first block, send it out now.
    if (self._outstandingMethodBlocks.length === 1) methodInvoker.sendMessage();

    // If we're using the default callback on the server,
    // block waiting for the result.
    if (future) {
      return future.wait();
    }
    return options.returnStubValue ? stubReturnValue : undefined;
  }
  _stubCall(name, args, options) {
    // Run the stub, if we have one. The stub is supposed to make some
    // temporary writes to the database to give the user a smooth experience
    // until the actual result of executing the method comes back from the
    // server (whereupon the temporary writes to the database will be reversed
    // during the beginUpdate/endUpdate process.)
    //
    // Normally, we ignore the return value of the stub (even if it is an
    // exception), in favor of the real return value from the server. The
    // exception is if the *caller* is a stub. In that case, we're not going
    // to do a RPC, so we use the return value of the stub as our return
    // value.
    const self = this;
    const enclosing = DDP._CurrentMethodInvocation.get();
    const stub = self._methodHandlers[name];
    const alreadyInSimulation = enclosing === null || enclosing === void 0 ? void 0 : enclosing.isSimulation;
    const isFromCallAsync = enclosing === null || enclosing === void 0 ? void 0 : enclosing._isFromCallAsync;
    const randomSeed = {
      value: null
    };
    const defaultReturn = {
      alreadyInSimulation,
      randomSeed,
      isFromCallAsync
    };
    if (!stub) {
      return _objectSpread(_objectSpread({}, defaultReturn), {}, {
        hasStub: false
      });
    }

    // Lazily generate a randomSeed, only if it is requested by the stub.
    // The random streams only have utility if they're used on both the client
    // and the server; if the client doesn't generate any 'random' values
    // then we don't expect the server to generate any either.
    // Less commonly, the server may perform different actions from the client,
    // and may in fact generate values where the client did not, but we don't
    // have any client-side values to match, so even here we may as well just
    // use a random seed on the server.  In that case, we don't pass the
    // randomSeed to save bandwidth, and we don't even generate it to save a
    // bit of CPU and to avoid consuming entropy.

    const randomSeedGenerator = () => {
      if (randomSeed.value === null) {
        randomSeed.value = DDPCommon.makeRpcSeed(enclosing, name);
      }
      return randomSeed.value;
    };
    const setUserId = userId => {
      self.setUserId(userId);
    };
    const invocation = new DDPCommon.MethodInvocation({
      isSimulation: true,
      userId: self.userId(),
      isFromCallAsync: options === null || options === void 0 ? void 0 : options.isFromCallAsync,
      setUserId: setUserId,
      randomSeed() {
        return randomSeedGenerator();
      }
    });

    // Note that unlike in the corresponding server code, we never audit
    // that stubs check() their arguments.
    const stubInvocation = () => {
      if (Meteor.isServer) {
        // Because saveOriginals and retrieveOriginals aren't reentrant,
        // don't allow stubs to yield.
        return Meteor._noYieldsAllowed(() => {
          // re-clone, so that the stub can't affect our caller's values
          return stub.apply(invocation, EJSON.clone(args));
        });
      } else {
        return stub.apply(invocation, EJSON.clone(args));
      }
    };
    return _objectSpread(_objectSpread({}, defaultReturn), {}, {
      hasStub: true,
      stubInvocation,
      invocation
    });
  }

  // Before calling a method stub, prepare all stores to track changes and allow
  // _retrieveAndStoreOriginals to get the original versions of changed
  // documents.
  _saveOriginals() {
    if (!this._waitingForQuiescence()) {
      this._flushBufferedWrites();
    }
    Object.values(this._stores).forEach(store => {
      store.saveOriginals();
    });
  }

  // Retrieves the original versions of all documents modified by the stub for
  // method 'methodId' from all stores and saves them to _serverDocuments (keyed
  // by document) and _documentsWrittenByStub (keyed by method ID).
  _retrieveAndStoreOriginals(methodId) {
    const self = this;
    if (self._documentsWrittenByStub[methodId]) throw new Error('Duplicate methodId in _retrieveAndStoreOriginals');
    const docsWritten = [];
    Object.entries(self._stores).forEach(_ref3 => {
      let [collection, store] = _ref3;
      const originals = store.retrieveOriginals();
      // not all stores define retrieveOriginals
      if (!originals) return;
      originals.forEach((doc, id) => {
        docsWritten.push({
          collection,
          id
        });
        if (!hasOwn.call(self._serverDocuments, collection)) {
          self._serverDocuments[collection] = new MongoIDMap();
        }
        const serverDoc = self._serverDocuments[collection].setDefault(id, Object.create(null));
        if (serverDoc.writtenByStubs) {
          // We're not the first stub to write this doc. Just add our method ID
          // to the record.
          serverDoc.writtenByStubs[methodId] = true;
        } else {
          // First stub! Save the original value and our method ID.
          serverDoc.document = doc;
          serverDoc.flushCallbacks = [];
          serverDoc.writtenByStubs = Object.create(null);
          serverDoc.writtenByStubs[methodId] = true;
        }
      });
    });
    if (!isEmpty(docsWritten)) {
      self._documentsWrittenByStub[methodId] = docsWritten;
    }
  }

  // This is very much a private function we use to make the tests
  // take up fewer server resources after they complete.
  _unsubscribeAll() {
    Object.values(this._subscriptions).forEach(sub => {
      // Avoid killing the autoupdate subscription so that developers
      // still get hot code pushes when writing tests.
      //
      // XXX it's a hack to encode knowledge about autoupdate here,
      // but it doesn't seem worth it yet to have a special API for
      // subscriptions to preserve after unit tests.
      if (sub.name !== 'meteor_autoupdate_clientVersions') {
        sub.stop();
      }
    });
  }

  // Sends the DDP stringification of the given message object
  _send(obj) {
    this._stream.send(DDPCommon.stringifyDDP(obj));
  }

  // We detected via DDP-level heartbeats that we've lost the
  // connection.  Unlike `disconnect` or `close`, a lost connection
  // will be automatically retried.
  _lostConnection(error) {
    this._stream._lostConnection(error);
  }

  /**
   * @memberOf Meteor
   * @importFromPackage meteor
   * @alias Meteor.status
   * @summary Get the current connection status. A reactive data source.
   * @locus Client
   */
  status() {
    return this._stream.status(...arguments);
  }

  /**
   * @summary Force an immediate reconnection attempt if the client is not connected to the server.
   This method does nothing if the client is already connected.
   * @memberOf Meteor
   * @importFromPackage meteor
   * @alias Meteor.reconnect
   * @locus Client
   */
  reconnect() {
    return this._stream.reconnect(...arguments);
  }

  /**
   * @memberOf Meteor
   * @importFromPackage meteor
   * @alias Meteor.disconnect
   * @summary Disconnect the client from the server.
   * @locus Client
   */
  disconnect() {
    return this._stream.disconnect(...arguments);
  }
  close() {
    return this._stream.disconnect({
      _permanent: true
    });
  }

  ///
  /// Reactive user system
  ///
  userId() {
    if (this._userIdDeps) this._userIdDeps.depend();
    return this._userId;
  }
  setUserId(userId) {
    // Avoid invalidating dependents if setUserId is called with current value.
    if (this._userId === userId) return;
    this._userId = userId;
    if (this._userIdDeps) this._userIdDeps.changed();
  }

  // Returns true if we are in a state after reconnect of waiting for subs to be
  // revived or early methods to finish their data, or we are waiting for a
  // "wait" method to finish.
  _waitingForQuiescence() {
    return !isEmpty(this._subsBeingRevived) || !isEmpty(this._methodsBlockingQuiescence);
  }

  // Returns true if any method whose message has been sent to the server has
  // not yet invoked its user callback.
  _anyMethodsAreOutstanding() {
    const invokers = this._methodInvokers;
    return Object.values(invokers).some(invoker => !!invoker.sentMessage);
  }
  _livedata_connected(msg) {
    const self = this;
    if (self._version !== 'pre1' && self._heartbeatInterval !== 0) {
      self._heartbeat = new DDPCommon.Heartbeat({
        heartbeatInterval: self._heartbeatInterval,
        heartbeatTimeout: self._heartbeatTimeout,
        onTimeout() {
          self._lostConnection(new DDP.ConnectionError('DDP heartbeat timed out'));
        },
        sendPing() {
          self._send({
            msg: 'ping'
          });
        }
      });
      self._heartbeat.start();
    }

    // If this is a reconnect, we'll have to reset all stores.
    if (self._lastSessionId) self._resetStores = true;
    let reconnectedToPreviousSession;
    if (typeof msg.session === 'string') {
      reconnectedToPreviousSession = self._lastSessionId === msg.session;
      self._lastSessionId = msg.session;
    }
    if (reconnectedToPreviousSession) {
      // Successful reconnection -- pick up where we left off.  Note that right
      // now, this never happens: the server never connects us to a previous
      // session, because DDP doesn't provide enough data for the server to know
      // what messages the client has processed. We need to improve DDP to make
      // this possible, at which point we'll probably need more code here.
      return;
    }

    // Server doesn't have our data any more. Re-sync a new session.

    // Forget about messages we were buffering for unknown collections. They'll
    // be resent if still relevant.
    self._updatesForUnknownStores = Object.create(null);
    if (self._resetStores) {
      // Forget about the effects of stubs. We'll be resetting all collections
      // anyway.
      self._documentsWrittenByStub = Object.create(null);
      self._serverDocuments = Object.create(null);
    }

    // Clear _afterUpdateCallbacks.
    self._afterUpdateCallbacks = [];

    // Mark all named subscriptions which are ready (ie, we already called the
    // ready callback) as needing to be revived.
    // XXX We should also block reconnect quiescence until unnamed subscriptions
    //     (eg, autopublish) are done re-publishing to avoid flicker!
    self._subsBeingRevived = Object.create(null);
    Object.entries(self._subscriptions).forEach(_ref4 => {
      let [id, sub] = _ref4;
      if (sub.ready) {
        self._subsBeingRevived[id] = true;
      }
    });

    // Arrange for "half-finished" methods to have their callbacks run, and
    // track methods that were sent on this connection so that we don't
    // quiesce until they are all done.
    //
    // Start by clearing _methodsBlockingQuiescence: methods sent before
    // reconnect don't matter, and any "wait" methods sent on the new connection
    // that we drop here will be restored by the loop below.
    self._methodsBlockingQuiescence = Object.create(null);
    if (self._resetStores) {
      const invokers = self._methodInvokers;
      keys(invokers).forEach(id => {
        const invoker = invokers[id];
        if (invoker.gotResult()) {
          // This method already got its result, but it didn't call its callback
          // because its data didn't become visible. We did not resend the
          // method RPC. We'll call its callback when we get a full quiesce,
          // since that's as close as we'll get to "data must be visible".
          self._afterUpdateCallbacks.push(function () {
            return invoker.dataVisible(...arguments);
          });
        } else if (invoker.sentMessage) {
          // This method has been sent on this connection (maybe as a resend
          // from the last connection, maybe from onReconnect, maybe just very
          // quickly before processing the connected message).
          //
          // We don't need to do anything special to ensure its callbacks get
          // called, but we'll count it as a method which is preventing
          // reconnect quiescence. (eg, it might be a login method that was run
          // from onReconnect, and we don't want to see flicker by seeing a
          // logged-out state.)
          self._methodsBlockingQuiescence[invoker.methodId] = true;
        }
      });
    }
    self._messagesBufferedUntilQuiescence = [];

    // If we're not waiting on any methods or subs, we can reset the stores and
    // call the callbacks immediately.
    if (!self._waitingForQuiescence()) {
      if (self._resetStores) {
        Object.values(self._stores).forEach(store => {
          store.beginUpdate(0, true);
          store.endUpdate();
        });
        self._resetStores = false;
      }
      self._runAfterUpdateCallbacks();
    }
  }
  _processOneDataMessage(msg, updates) {
    const messageType = msg.msg;

    // msg is one of ['added', 'changed', 'removed', 'ready', 'updated']
    if (messageType === 'added') {
      this._process_added(msg, updates);
    } else if (messageType === 'changed') {
      this._process_changed(msg, updates);
    } else if (messageType === 'removed') {
      this._process_removed(msg, updates);
    } else if (messageType === 'ready') {
      this._process_ready(msg, updates);
    } else if (messageType === 'updated') {
      this._process_updated(msg, updates);
    } else if (messageType === 'nosub') {
      // ignore this
    } else {
      Meteor._debug('discarding unknown livedata data message type', msg);
    }
  }
  _livedata_data(msg) {
    const self = this;
    if (self._waitingForQuiescence()) {
      self._messagesBufferedUntilQuiescence.push(msg);
      if (msg.msg === 'nosub') {
        delete self._subsBeingRevived[msg.id];
      }
      if (msg.subs) {
        msg.subs.forEach(subId => {
          delete self._subsBeingRevived[subId];
        });
      }
      if (msg.methods) {
        msg.methods.forEach(methodId => {
          delete self._methodsBlockingQuiescence[methodId];
        });
      }
      if (self._waitingForQuiescence()) {
        return;
      }

      // No methods or subs are blocking quiescence!
      // We'll now process and all of our buffered messages, reset all stores,
      // and apply them all at once.

      const bufferedMessages = self._messagesBufferedUntilQuiescence;
      Object.values(bufferedMessages).forEach(bufferedMessage => {
        self._processOneDataMessage(bufferedMessage, self._bufferedWrites);
      });
      self._messagesBufferedUntilQuiescence = [];
    } else {
      self._processOneDataMessage(msg, self._bufferedWrites);
    }

    // Immediately flush writes when:
    //  1. Buffering is disabled. Or;
    //  2. any non-(added/changed/removed) message arrives.
    const standardWrite = msg.msg === "added" || msg.msg === "changed" || msg.msg === "removed";
    if (self._bufferedWritesInterval === 0 || !standardWrite) {
      self._flushBufferedWrites();
      return;
    }
    if (self._bufferedWritesFlushAt === null) {
      self._bufferedWritesFlushAt = new Date().valueOf() + self._bufferedWritesMaxAge;
    } else if (self._bufferedWritesFlushAt < new Date().valueOf()) {
      self._flushBufferedWrites();
      return;
    }
    if (self._bufferedWritesFlushHandle) {
      clearTimeout(self._bufferedWritesFlushHandle);
    }
    self._bufferedWritesFlushHandle = setTimeout(self.__flushBufferedWrites, self._bufferedWritesInterval);
  }
  _flushBufferedWrites() {
    const self = this;
    if (self._bufferedWritesFlushHandle) {
      clearTimeout(self._bufferedWritesFlushHandle);
      self._bufferedWritesFlushHandle = null;
    }
    self._bufferedWritesFlushAt = null;
    // We need to clear the buffer before passing it to
    //  performWrites. As there's no guarantee that it
    //  will exit cleanly.
    const writes = self._bufferedWrites;
    self._bufferedWrites = Object.create(null);
    self._performWrites(writes);
  }
  _performWrites(updates) {
    const self = this;
    if (self._resetStores || !isEmpty(updates)) {
      // Begin a transactional update of each store.

      Object.entries(self._stores).forEach(_ref5 => {
        let [storeName, store] = _ref5;
        store.beginUpdate(hasOwn.call(updates, storeName) ? updates[storeName].length : 0, self._resetStores);
      });
      self._resetStores = false;
      Object.entries(updates).forEach(_ref6 => {
        let [storeName, updateMessages] = _ref6;
        const store = self._stores[storeName];
        if (store) {
          updateMessages.forEach(updateMessage => {
            store.update(updateMessage);
          });
        } else {
          // Nobody's listening for this data. Queue it up until
          // someone wants it.
          // XXX memory use will grow without bound if you forget to
          // create a collection or just don't care about it... going
          // to have to do something about that.
          const updates = self._updatesForUnknownStores;
          if (!hasOwn.call(updates, storeName)) {
            updates[storeName] = [];
          }
          updates[storeName].push(...updateMessages);
        }
      });

      // End update transaction.
      Object.values(self._stores).forEach(store => {
        store.endUpdate();
      });
    }
    self._runAfterUpdateCallbacks();
  }

  // Call any callbacks deferred with _runWhenAllServerDocsAreFlushed whose
  // relevant docs have been flushed, as well as dataVisible callbacks at
  // reconnect-quiescence time.
  _runAfterUpdateCallbacks() {
    const self = this;
    const callbacks = self._afterUpdateCallbacks;
    self._afterUpdateCallbacks = [];
    callbacks.forEach(c => {
      c();
    });
  }
  _pushUpdate(updates, collection, msg) {
    if (!hasOwn.call(updates, collection)) {
      updates[collection] = [];
    }
    updates[collection].push(msg);
  }
  _getServerDoc(collection, id) {
    const self = this;
    if (!hasOwn.call(self._serverDocuments, collection)) {
      return null;
    }
    const serverDocsForCollection = self._serverDocuments[collection];
    return serverDocsForCollection.get(id) || null;
  }
  _process_added(msg, updates) {
    const self = this;
    const id = MongoID.idParse(msg.id);
    const serverDoc = self._getServerDoc(msg.collection, id);
    if (serverDoc) {
      // Some outstanding stub wrote here.
      const isExisting = serverDoc.document !== undefined;
      serverDoc.document = msg.fields || Object.create(null);
      serverDoc.document._id = id;
      if (self._resetStores) {
        // During reconnect the server is sending adds for existing ids.
        // Always push an update so that document stays in the store after
        // reset. Use current version of the document for this update, so
        // that stub-written values are preserved.
        const currentDoc = self._stores[msg.collection].getDoc(msg.id);
        if (currentDoc !== undefined) msg.fields = currentDoc;
        self._pushUpdate(updates, msg.collection, msg);
      } else if (isExisting) {
        throw new Error('Server sent add for existing id: ' + msg.id);
      }
    } else {
      self._pushUpdate(updates, msg.collection, msg);
    }
  }
  _process_changed(msg, updates) {
    const self = this;
    const serverDoc = self._getServerDoc(msg.collection, MongoID.idParse(msg.id));
    if (serverDoc) {
      if (serverDoc.document === undefined) throw new Error('Server sent changed for nonexisting id: ' + msg.id);
      DiffSequence.applyChanges(serverDoc.document, msg.fields);
    } else {
      self._pushUpdate(updates, msg.collection, msg);
    }
  }
  _process_removed(msg, updates) {
    const self = this;
    const serverDoc = self._getServerDoc(msg.collection, MongoID.idParse(msg.id));
    if (serverDoc) {
      // Some outstanding stub wrote here.
      if (serverDoc.document === undefined) throw new Error('Server sent removed for nonexisting id:' + msg.id);
      serverDoc.document = undefined;
    } else {
      self._pushUpdate(updates, msg.collection, {
        msg: 'removed',
        collection: msg.collection,
        id: msg.id
      });
    }
  }
  _process_updated(msg, updates) {
    const self = this;
    // Process "method done" messages.

    msg.methods.forEach(methodId => {
      const docs = self._documentsWrittenByStub[methodId] || {};
      Object.values(docs).forEach(written => {
        const serverDoc = self._getServerDoc(written.collection, written.id);
        if (!serverDoc) {
          throw new Error('Lost serverDoc for ' + JSON.stringify(written));
        }
        if (!serverDoc.writtenByStubs[methodId]) {
          throw new Error('Doc ' + JSON.stringify(written) + ' not written by  method ' + methodId);
        }
        delete serverDoc.writtenByStubs[methodId];
        if (isEmpty(serverDoc.writtenByStubs)) {
          // All methods whose stubs wrote this method have completed! We can
          // now copy the saved document to the database (reverting the stub's
          // change if the server did not write to this object, or applying the
          // server's writes if it did).

          // This is a fake ddp 'replace' message.  It's just for talking
          // between livedata connections and minimongo.  (We have to stringify
          // the ID because it's supposed to look like a wire message.)
          self._pushUpdate(updates, written.collection, {
            msg: 'replace',
            id: MongoID.idStringify(written.id),
            replace: serverDoc.document
          });
          // Call all flush callbacks.

          serverDoc.flushCallbacks.forEach(c => {
            c();
          });

          // Delete this completed serverDocument. Don't bother to GC empty
          // IdMaps inside self._serverDocuments, since there probably aren't
          // many collections and they'll be written repeatedly.
          self._serverDocuments[written.collection].remove(written.id);
        }
      });
      delete self._documentsWrittenByStub[methodId];

      // We want to call the data-written callback, but we can't do so until all
      // currently buffered messages are flushed.
      const callbackInvoker = self._methodInvokers[methodId];
      if (!callbackInvoker) {
        throw new Error('No callback invoker for method ' + methodId);
      }
      self._runWhenAllServerDocsAreFlushed(function () {
        return callbackInvoker.dataVisible(...arguments);
      });
    });
  }
  _process_ready(msg, updates) {
    const self = this;
    // Process "sub ready" messages. "sub ready" messages don't take effect
    // until all current server documents have been flushed to the local
    // database. We can use a write fence to implement this.

    msg.subs.forEach(subId => {
      self._runWhenAllServerDocsAreFlushed(() => {
        const subRecord = self._subscriptions[subId];
        // Did we already unsubscribe?
        if (!subRecord) return;
        // Did we already receive a ready message? (Oops!)
        if (subRecord.ready) return;
        subRecord.ready = true;
        subRecord.readyCallback && subRecord.readyCallback();
        subRecord.readyDeps.changed();
      });
    });
  }

  // Ensures that "f" will be called after all documents currently in
  // _serverDocuments have been written to the local cache. f will not be called
  // if the connection is lost before then!
  _runWhenAllServerDocsAreFlushed(f) {
    const self = this;
    const runFAfterUpdates = () => {
      self._afterUpdateCallbacks.push(f);
    };
    let unflushedServerDocCount = 0;
    const onServerDocFlush = () => {
      --unflushedServerDocCount;
      if (unflushedServerDocCount === 0) {
        // This was the last doc to flush! Arrange to run f after the updates
        // have been applied.
        runFAfterUpdates();
      }
    };
    Object.values(self._serverDocuments).forEach(serverDocuments => {
      serverDocuments.forEach(serverDoc => {
        const writtenByStubForAMethodWithSentMessage = keys(serverDoc.writtenByStubs).some(methodId => {
          const invoker = self._methodInvokers[methodId];
          return invoker && invoker.sentMessage;
        });
        if (writtenByStubForAMethodWithSentMessage) {
          ++unflushedServerDocCount;
          serverDoc.flushCallbacks.push(onServerDocFlush);
        }
      });
    });
    if (unflushedServerDocCount === 0) {
      // There aren't any buffered docs --- we can call f as soon as the current
      // round of updates is applied!
      runFAfterUpdates();
    }
  }
  _livedata_nosub(msg) {
    const self = this;

    // First pass it through _livedata_data, which only uses it to help get
    // towards quiescence.
    self._livedata_data(msg);

    // Do the rest of our processing immediately, with no
    // buffering-until-quiescence.

    // we weren't subbed anyway, or we initiated the unsub.
    if (!hasOwn.call(self._subscriptions, msg.id)) {
      return;
    }

    // XXX COMPAT WITH 1.0.3.1 #errorCallback
    const errorCallback = self._subscriptions[msg.id].errorCallback;
    const stopCallback = self._subscriptions[msg.id].stopCallback;
    self._subscriptions[msg.id].remove();
    const meteorErrorFromMsg = msgArg => {
      return msgArg && msgArg.error && new Meteor.Error(msgArg.error.error, msgArg.error.reason, msgArg.error.details);
    };

    // XXX COMPAT WITH 1.0.3.1 #errorCallback
    if (errorCallback && msg.error) {
      errorCallback(meteorErrorFromMsg(msg));
    }
    if (stopCallback) {
      stopCallback(meteorErrorFromMsg(msg));
    }
  }
  _livedata_result(msg) {
    // id, result or error. error has error (code), reason, details

    const self = this;

    // Lets make sure there are no buffered writes before returning result.
    if (!isEmpty(self._bufferedWrites)) {
      self._flushBufferedWrites();
    }

    // find the outstanding request
    // should be O(1) in nearly all realistic use cases
    if (isEmpty(self._outstandingMethodBlocks)) {
      Meteor._debug('Received method result but no methods outstanding');
      return;
    }
    const currentMethodBlock = self._outstandingMethodBlocks[0].methods;
    let i;
    const m = currentMethodBlock.find((method, idx) => {
      const found = method.methodId === msg.id;
      if (found) i = idx;
      return found;
    });
    if (!m) {
      Meteor._debug("Can't match method response to original method call", msg);
      return;
    }

    // Remove from current method block. This may leave the block empty, but we
    // don't move on to the next block until the callback has been delivered, in
    // _outstandingMethodFinished.
    currentMethodBlock.splice(i, 1);
    if (hasOwn.call(msg, 'error')) {
      m.receiveResult(new Meteor.Error(msg.error.error, msg.error.reason, msg.error.details));
    } else {
      // msg.result may be undefined if the method didn't return a
      // value
      m.receiveResult(undefined, msg.result);
    }
  }

  // Called by MethodInvoker after a method's callback is invoked.  If this was
  // the last outstanding method in the current block, runs the next block. If
  // there are no more methods, consider accepting a hot code push.
  _outstandingMethodFinished() {
    const self = this;
    if (self._anyMethodsAreOutstanding()) return;

    // No methods are outstanding. This should mean that the first block of
    // methods is empty. (Or it might not exist, if this was a method that
    // half-finished before disconnect/reconnect.)
    if (!isEmpty(self._outstandingMethodBlocks)) {
      const firstBlock = self._outstandingMethodBlocks.shift();
      if (!isEmpty(firstBlock.methods)) throw new Error('No methods outstanding but nonempty block: ' + JSON.stringify(firstBlock));

      // Send the outstanding methods now in the first block.
      if (!isEmpty(self._outstandingMethodBlocks)) self._sendOutstandingMethods();
    }

    // Maybe accept a hot code push.
    self._maybeMigrate();
  }

  // Sends messages for all the methods in the first block in
  // _outstandingMethodBlocks.
  _sendOutstandingMethods() {
    const self = this;
    if (isEmpty(self._outstandingMethodBlocks)) {
      return;
    }
    self._outstandingMethodBlocks[0].methods.forEach(m => {
      m.sendMessage();
    });
  }
  _livedata_error(msg) {
    Meteor._debug('Received error from server: ', msg.reason);
    if (msg.offendingMessage) Meteor._debug('For: ', msg.offendingMessage);
  }
  _callOnReconnectAndSendAppropriateOutstandingMethods() {
    const self = this;
    const oldOutstandingMethodBlocks = self._outstandingMethodBlocks;
    self._outstandingMethodBlocks = [];
    self.onReconnect && self.onReconnect();
    DDP._reconnectHook.each(callback => {
      callback(self);
      return true;
    });
    if (isEmpty(oldOutstandingMethodBlocks)) return;

    // We have at least one block worth of old outstanding methods to try
    // again. First: did onReconnect actually send anything? If not, we just
    // restore all outstanding methods and run the first block.
    if (isEmpty(self._outstandingMethodBlocks)) {
      self._outstandingMethodBlocks = oldOutstandingMethodBlocks;
      self._sendOutstandingMethods();
      return;
    }

    // OK, there are blocks on both sides. Special case: merge the last block of
    // the reconnect methods with the first block of the original methods, if
    // neither of them are "wait" blocks.
    if (!last(self._outstandingMethodBlocks).wait && !oldOutstandingMethodBlocks[0].wait) {
      oldOutstandingMethodBlocks[0].methods.forEach(m => {
        last(self._outstandingMethodBlocks).methods.push(m);

        // If this "last block" is also the first block, send the message.
        if (self._outstandingMethodBlocks.length === 1) {
          m.sendMessage();
        }
      });
      oldOutstandingMethodBlocks.shift();
    }

    // Now add the rest of the original blocks on.
    self._outstandingMethodBlocks.push(...oldOutstandingMethodBlocks);
  }

  // We can accept a hot code push if there are no methods in flight.
  _readyToMigrate() {
    return isEmpty(this._methodInvokers);
  }

  // If we were blocking a migration, see if it's now possible to continue.
  // Call whenever the set of outstanding/blocked methods shrinks.
  _maybeMigrate() {
    const self = this;
    if (self._retryMigrate && self._readyToMigrate()) {
      self._retryMigrate();
      self._retryMigrate = null;
    }
  }
  onMessage(raw_msg) {
    let msg;
    try {
      msg = DDPCommon.parseDDP(raw_msg);
    } catch (e) {
      Meteor._debug('Exception while parsing DDP', e);
      return;
    }

    // Any message counts as receiving a pong, as it demonstrates that
    // the server is still alive.
    if (this._heartbeat) {
      this._heartbeat.messageReceived();
    }
    if (msg === null || !msg.msg) {
      if (!msg || !msg.testMessageOnConnect) {
        if (Object.keys(msg).length === 1 && msg.server_id) return;
        Meteor._debug('discarding invalid livedata message', msg);
      }
      return;
    }
    if (msg.msg === 'connected') {
      this._version = this._versionSuggestion;
      this._livedata_connected(msg);
      this.options.onConnected();
    } else if (msg.msg === 'failed') {
      if (this._supportedDDPVersions.indexOf(msg.version) >= 0) {
        this._versionSuggestion = msg.version;
        this._stream.reconnect({
          _force: true
        });
      } else {
        const description = 'DDP version negotiation failed; server requested version ' + msg.version;
        this._stream.disconnect({
          _permanent: true,
          _error: description
        });
        this.options.onDDPVersionNegotiationFailure(description);
      }
    } else if (msg.msg === 'ping' && this.options.respondToPings) {
      this._send({
        msg: 'pong',
        id: msg.id
      });
    } else if (msg.msg === 'pong') {
      // noop, as we assume everything's a pong
    } else if (['added', 'changed', 'removed', 'ready', 'updated'].includes(msg.msg)) {
      this._livedata_data(msg);
    } else if (msg.msg === 'nosub') {
      this._livedata_nosub(msg);
    } else if (msg.msg === 'result') {
      this._livedata_result(msg);
    } else if (msg.msg === 'error') {
      this._livedata_error(msg);
    } else {
      Meteor._debug('discarding unknown livedata message type', msg);
    }
  }
  onReset() {
    // Send a connect message at the beginning of the stream.
    // NOTE: reset is called even on the first connection, so this is
    // the only place we send this message.
    const msg = {
      msg: 'connect'
    };
    if (this._lastSessionId) msg.session = this._lastSessionId;
    msg.version = this._versionSuggestion || this._supportedDDPVersions[0];
    this._versionSuggestion = msg.version;
    msg.support = this._supportedDDPVersions;
    this._send(msg);

    // Mark non-retry calls as failed. This has to be done early as getting these methods out of the
    // current block is pretty important to making sure that quiescence is properly calculated, as
    // well as possibly moving on to another useful block.

    // Only bother testing if there is an outstandingMethodBlock (there might not be, especially if
    // we are connecting for the first time.
    if (this._outstandingMethodBlocks.length > 0) {
      // If there is an outstanding method block, we only care about the first one as that is the
      // one that could have already sent messages with no response, that are not allowed to retry.
      const currentMethodBlock = this._outstandingMethodBlocks[0].methods;
      this._outstandingMethodBlocks[0].methods = currentMethodBlock.filter(methodInvoker => {
        // Methods with 'noRetry' option set are not allowed to re-send after
        // recovering dropped connection.
        if (methodInvoker.sentMessage && methodInvoker.noRetry) {
          // Make sure that the method is told that it failed.
          methodInvoker.receiveResult(new Meteor.Error('invocation-failed', 'Method invocation might have failed due to dropped connection. ' + 'Failing because `noRetry` option was passed to Meteor.apply.'));
        }

        // Only keep a method if it wasn't sent or it's allowed to retry.
        // This may leave the block empty, but we don't move on to the next
        // block until the callback has been delivered, in _outstandingMethodFinished.
        return !(methodInvoker.sentMessage && methodInvoker.noRetry);
      });
    }

    // Now, to minimize setup latency, go ahead and blast out all of
    // our pending methods ands subscriptions before we've even taken
    // the necessary RTT to know if we successfully reconnected. (1)
    // They're supposed to be idempotent, and where they are not,
    // they can block retry in apply; (2) even if we did reconnect,
    // we're not sure what messages might have gotten lost
    // (in either direction) since we were disconnected (TCP being
    // sloppy about that.)

    // If the current block of methods all got their results (but didn't all get
    // their data visible), discard the empty block now.
    if (this._outstandingMethodBlocks.length > 0 && this._outstandingMethodBlocks[0].methods.length === 0) {
      this._outstandingMethodBlocks.shift();
    }

    // Mark all messages as unsent, they have not yet been sent on this
    // connection.
    keys(this._methodInvokers).forEach(id => {
      this._methodInvokers[id].sentMessage = false;
    });

    // If an `onReconnect` handler is set, call it first. Go through
    // some hoops to ensure that methods that are called from within
    // `onReconnect` get executed _before_ ones that were originally
    // outstanding (since `onReconnect` is used to re-establish auth
    // certificates)
    this._callOnReconnectAndSendAppropriateOutstandingMethods();

    // add new subscriptions at the end. this way they take effect after
    // the handlers and we don't see flicker.
    Object.entries(this._subscriptions).forEach(_ref7 => {
      let [id, sub] = _ref7;
      this._send({
        msg: 'sub',
        id: id,
        name: sub.name,
        params: sub.params
      });
    });
  }
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"namespace.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ddp-client/common/namespace.js                                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  DDP: () => DDP
});
let DDPCommon;
module.link("meteor/ddp-common", {
  DDPCommon(v) {
    DDPCommon = v;
  }
}, 0);
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }
}, 1);
let Connection;
module.link("./livedata_connection.js", {
  Connection(v) {
    Connection = v;
  }
}, 2);
// This array allows the `_allSubscriptionsReady` method below, which
// is used by the `spiderable` package, to keep track of whether all
// data is ready.
const allConnections = [];

/**
 * @namespace DDP
 * @summary Namespace for DDP-related methods/classes.
 */
const DDP = {};
// This is private but it's used in a few places. accounts-base uses
// it to get the current user. Meteor.setTimeout and friends clear
// it. We can probably find a better way to factor this.
DDP._CurrentMethodInvocation = new Meteor.EnvironmentVariable();
DDP._CurrentPublicationInvocation = new Meteor.EnvironmentVariable();

// XXX: Keep DDP._CurrentInvocation for backwards-compatibility.
DDP._CurrentInvocation = DDP._CurrentMethodInvocation;

// This is passed into a weird `makeErrorType` function that expects its thing
// to be a constructor
function connectionErrorConstructor(message) {
  this.message = message;
}
DDP.ConnectionError = Meteor.makeErrorType('DDP.ConnectionError', connectionErrorConstructor);
DDP.ForcedReconnectError = Meteor.makeErrorType('DDP.ForcedReconnectError', () => {});

// Returns the named sequence of pseudo-random values.
// The scope will be DDP._CurrentMethodInvocation.get(), so the stream will produce
// consistent values for method calls on the client and server.
DDP.randomStream = name => {
  const scope = DDP._CurrentMethodInvocation.get();
  return DDPCommon.RandomStream.get(scope, name);
};

// @param url {String} URL to Meteor app,
//     e.g.:
//     "subdomain.meteor.com",
//     "http://subdomain.meteor.com",
//     "/",
//     "ddp+sockjs://ddp--****-foo.meteor.com/sockjs"

/**
 * @summary Connect to the server of a different Meteor application to subscribe to its document sets and invoke its remote methods.
 * @locus Anywhere
 * @param {String} url The URL of another Meteor application.
 * @param {Object} [options]
 * @param {Boolean} options.reloadWithOutstanding is it OK to reload if there are outstanding methods?
 * @param {Object} options.headers extra headers to send on the websockets connection, for server-to-server DDP only
 * @param {Object} options._sockjsOptions Specifies options to pass through to the sockjs client
 * @param {Function} options.onDDPNegotiationVersionFailure callback when version negotiation fails.
 */
DDP.connect = (url, options) => {
  const ret = new Connection(url, options);
  allConnections.push(ret); // hack. see below.
  return ret;
};
DDP._reconnectHook = new Hook({
  bindEnvironment: false
});

/**
 * @summary Register a function to call as the first step of
 * reconnecting. This function can call methods which will be executed before
 * any other outstanding methods. For example, this can be used to re-establish
 * the appropriate authentication context on the connection.
 * @locus Anywhere
 * @param {Function} callback The function to call. It will be called with a
 * single argument, the [connection object](#ddp_connect) that is reconnecting.
 */
DDP.onReconnect = callback => DDP._reconnectHook.register(callback);

// Hack for `spiderable` package: a way to see if the page is done
// loading all the data it needs.
//
DDP._allSubscriptionsReady = () => allConnections.every(conn => Object.values(conn._subscriptions).every(sub => sub.ready));
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

var exports = require("/node_modules/meteor/ddp-client/server/server.js");

/* Exports */
Package._define("ddp-client", exports, {
  DDP: DDP
});

})();

//# sourceURL=meteor://💻app/packages/ddp-client.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvZGRwLWNsaWVudC9zZXJ2ZXIvc2VydmVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9kZHAtY2xpZW50L2NvbW1vbi9NZXRob2RJbnZva2VyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9kZHAtY2xpZW50L2NvbW1vbi9saXZlZGF0YV9jb25uZWN0aW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9kZHAtY2xpZW50L2NvbW1vbi9uYW1lc3BhY2UuanMiXSwibmFtZXMiOlsibW9kdWxlIiwibGluayIsIkREUCIsImV4cG9ydCIsImRlZmF1bHQiLCJNZXRob2RJbnZva2VyIiwiY29uc3RydWN0b3IiLCJvcHRpb25zIiwibWV0aG9kSWQiLCJzZW50TWVzc2FnZSIsIl9jYWxsYmFjayIsImNhbGxiYWNrIiwiX2Nvbm5lY3Rpb24iLCJjb25uZWN0aW9uIiwiX21lc3NhZ2UiLCJtZXNzYWdlIiwiX29uUmVzdWx0UmVjZWl2ZWQiLCJvblJlc3VsdFJlY2VpdmVkIiwiX3dhaXQiLCJ3YWl0Iiwibm9SZXRyeSIsIl9tZXRob2RSZXN1bHQiLCJfZGF0YVZpc2libGUiLCJfbWV0aG9kSW52b2tlcnMiLCJzZW5kTWVzc2FnZSIsImdvdFJlc3VsdCIsIkVycm9yIiwiX21ldGhvZHNCbG9ja2luZ1F1aWVzY2VuY2UiLCJfc2VuZCIsIl9tYXliZUludm9rZUNhbGxiYWNrIiwiX291dHN0YW5kaW5nTWV0aG9kRmluaXNoZWQiLCJyZWNlaXZlUmVzdWx0IiwiZXJyIiwicmVzdWx0IiwiZGF0YVZpc2libGUiLCJfb2JqZWN0V2l0aG91dFByb3BlcnRpZXMiLCJ2IiwiX29iamVjdFNwcmVhZCIsIkNvbm5lY3Rpb24iLCJNZXRlb3IiLCJERFBDb21tb24iLCJUcmFja2VyIiwiRUpTT04iLCJSYW5kb20iLCJIb29rIiwiTW9uZ29JRCIsImhhc093biIsInNsaWNlIiwia2V5cyIsImlzRW1wdHkiLCJsYXN0IiwiRmliZXIiLCJGdXR1cmUiLCJpc1NlcnZlciIsIk5wbSIsInJlcXVpcmUiLCJNb25nb0lETWFwIiwiSWRNYXAiLCJpZFN0cmluZ2lmeSIsImlkUGFyc2UiLCJ1cmwiLCJzZWxmIiwib25Db25uZWN0ZWQiLCJvbkREUFZlcnNpb25OZWdvdGlhdGlvbkZhaWx1cmUiLCJkZXNjcmlwdGlvbiIsIl9kZWJ1ZyIsImhlYXJ0YmVhdEludGVydmFsIiwiaGVhcnRiZWF0VGltZW91dCIsIm5wbUZheWVPcHRpb25zIiwiT2JqZWN0IiwiY3JlYXRlIiwicmVsb2FkV2l0aE91dHN0YW5kaW5nIiwic3VwcG9ydGVkRERQVmVyc2lvbnMiLCJTVVBQT1JURURfRERQX1ZFUlNJT05TIiwicmV0cnkiLCJyZXNwb25kVG9QaW5ncyIsImJ1ZmZlcmVkV3JpdGVzSW50ZXJ2YWwiLCJidWZmZXJlZFdyaXRlc01heEFnZSIsIm9uUmVjb25uZWN0IiwiX3N0cmVhbSIsIkNsaWVudFN0cmVhbSIsIkNvbm5lY3Rpb25FcnJvciIsImhlYWRlcnMiLCJfc29ja2pzT3B0aW9ucyIsIl9kb250UHJpbnRFcnJvcnMiLCJjb25uZWN0VGltZW91dE1zIiwiX2xhc3RTZXNzaW9uSWQiLCJfdmVyc2lvblN1Z2dlc3Rpb24iLCJfdmVyc2lvbiIsIl9zdG9yZXMiLCJfbWV0aG9kSGFuZGxlcnMiLCJfbmV4dE1ldGhvZElkIiwiX3N1cHBvcnRlZEREUFZlcnNpb25zIiwiX2hlYXJ0YmVhdEludGVydmFsIiwiX2hlYXJ0YmVhdFRpbWVvdXQiLCJfb3V0c3RhbmRpbmdNZXRob2RCbG9ja3MiLCJfZG9jdW1lbnRzV3JpdHRlbkJ5U3R1YiIsIl9zZXJ2ZXJEb2N1bWVudHMiLCJfYWZ0ZXJVcGRhdGVDYWxsYmFja3MiLCJfbWVzc2FnZXNCdWZmZXJlZFVudGlsUXVpZXNjZW5jZSIsIl9zdWJzQmVpbmdSZXZpdmVkIiwiX3Jlc2V0U3RvcmVzIiwiX3VwZGF0ZXNGb3JVbmtub3duU3RvcmVzIiwiX3JldHJ5TWlncmF0ZSIsIl9fZmx1c2hCdWZmZXJlZFdyaXRlcyIsImJpbmRFbnZpcm9ubWVudCIsIl9mbHVzaEJ1ZmZlcmVkV3JpdGVzIiwiX2J1ZmZlcmVkV3JpdGVzIiwiX2J1ZmZlcmVkV3JpdGVzRmx1c2hBdCIsIl9idWZmZXJlZFdyaXRlc0ZsdXNoSGFuZGxlIiwiX2J1ZmZlcmVkV3JpdGVzSW50ZXJ2YWwiLCJfYnVmZmVyZWRXcml0ZXNNYXhBZ2UiLCJfc3Vic2NyaXB0aW9ucyIsIl91c2VySWQiLCJfdXNlcklkRGVwcyIsIkRlcGVuZGVuY3kiLCJpc0NsaWVudCIsIlBhY2thZ2UiLCJyZWxvYWQiLCJSZWxvYWQiLCJfb25NaWdyYXRlIiwiX3JlYWR5VG9NaWdyYXRlIiwib25EaXNjb25uZWN0IiwiX2hlYXJ0YmVhdCIsInN0b3AiLCJvbiIsIm9uTWVzc2FnZSIsImJpbmQiLCJvblJlc2V0IiwicmVnaXN0ZXJTdG9yZSIsIm5hbWUiLCJ3cmFwcGVkU3RvcmUiLCJzdG9yZSIsImtleXNPZlN0b3JlIiwiZm9yRWFjaCIsIm1ldGhvZCIsImFyZ3VtZW50cyIsInF1ZXVlZCIsIkFycmF5IiwiaXNBcnJheSIsImJlZ2luVXBkYXRlIiwibGVuZ3RoIiwibXNnIiwidXBkYXRlIiwiZW5kVXBkYXRlIiwic3Vic2NyaWJlIiwicGFyYW1zIiwiY2FsbCIsImNhbGxiYWNrcyIsImxhc3RQYXJhbSIsIm9uUmVhZHkiLCJwb3AiLCJvbkVycm9yIiwib25TdG9wIiwic29tZSIsImYiLCJleGlzdGluZyIsInZhbHVlcyIsImZpbmQiLCJzdWIiLCJpbmFjdGl2ZSIsImVxdWFscyIsImlkIiwicmVhZHkiLCJyZWFkeUNhbGxiYWNrIiwiZXJyb3JDYWxsYmFjayIsInN0b3BDYWxsYmFjayIsImNsb25lIiwicmVhZHlEZXBzIiwicmVtb3ZlIiwiY2hhbmdlZCIsImhhbmRsZSIsInJlY29yZCIsImRlcGVuZCIsInN1YnNjcmlwdGlvbklkIiwiYWN0aXZlIiwib25JbnZhbGlkYXRlIiwiYyIsImFmdGVyRmx1c2giLCJfc3Vic2NyaWJlQW5kV2FpdCIsImFyZ3MiLCJwdXNoIiwiZSIsIm9uTGF0ZUVycm9yIiwiYXBwbHkiLCJjb25jYXQiLCJtZXRob2RzIiwiZW50cmllcyIsIl9yZWYiLCJmdW5jIiwiX2dldElzU2ltdWxhdGlvbiIsIl9yZWYyIiwiaXNGcm9tQ2FsbEFzeW5jIiwiYWxyZWFkeUluU2ltdWxhdGlvbiIsIl9DdXJyZW50TWV0aG9kSW52b2NhdGlvbiIsIl9pc0NhbGxBc3luY01ldGhvZFJ1bm5pbmciLCJjYWxsQXN5bmMiLCJQcm9taXNlIiwiYXN5bmNBcHBseSIsIl9zZXQiLCJfc2V0Q2FsbEFzeW5jTWV0aG9kUnVubmluZyIsInJlc29sdmUiLCJyZWplY3QiLCJhcHBseUFzeW5jIiwiX3RoaXMkX3N0dWJDYWxsIiwiX3N0dWJDYWxsIiwic3R1Ykludm9jYXRpb24iLCJpbnZvY2F0aW9uIiwic3R1Yk9wdGlvbnMiLCJfZXhjbHVkZWQiLCJoYXNTdHViIiwiX3NhdmVPcmlnaW5hbHMiLCJzdHViUmV0dXJuVmFsdWUiLCJ3aXRoVmFsdWUiLCJleGNlcHRpb24iLCJfYXBwbHkiLCJfdGhpcyRfc3R1YkNhbGwyIiwiX2V4Y2x1ZGVkMiIsImN1cnJlbnRDb250ZXh0IiwiX3NldE5ld0NvbnRleHRBbmRHZXRDdXJyZW50IiwicmVzdWx0T3JUaGVuYWJsZSIsImlzVGhlbmFibGUiLCJ0aGVuIiwiYXdhaXQiLCJzdHViQ2FsbFZhbHVlIiwicmFuZG9tU2VlZCIsInVuZGVmaW5lZCIsIl9yZXRyaWV2ZUFuZFN0b3JlT3JpZ2luYWxzIiwidGhyb3dTdHViRXhjZXB0aW9ucyIsIl9leHBlY3RlZEJ5VGVzdCIsImZ1dHVyZSIsInJlc29sdmVyIiwidmFsdWUiLCJtZXRob2RJbnZva2VyIiwicmV0dXJuU3R1YlZhbHVlIiwiZW5jbG9zaW5nIiwiZ2V0Iiwic3R1YiIsImlzU2ltdWxhdGlvbiIsIl9pc0Zyb21DYWxsQXN5bmMiLCJkZWZhdWx0UmV0dXJuIiwicmFuZG9tU2VlZEdlbmVyYXRvciIsIm1ha2VScGNTZWVkIiwic2V0VXNlcklkIiwidXNlcklkIiwiTWV0aG9kSW52b2NhdGlvbiIsIl9ub1lpZWxkc0FsbG93ZWQiLCJfd2FpdGluZ0ZvclF1aWVzY2VuY2UiLCJzYXZlT3JpZ2luYWxzIiwiZG9jc1dyaXR0ZW4iLCJfcmVmMyIsImNvbGxlY3Rpb24iLCJvcmlnaW5hbHMiLCJyZXRyaWV2ZU9yaWdpbmFscyIsImRvYyIsInNlcnZlckRvYyIsInNldERlZmF1bHQiLCJ3cml0dGVuQnlTdHVicyIsImRvY3VtZW50IiwiZmx1c2hDYWxsYmFja3MiLCJfdW5zdWJzY3JpYmVBbGwiLCJvYmoiLCJzZW5kIiwic3RyaW5naWZ5RERQIiwiX2xvc3RDb25uZWN0aW9uIiwiZXJyb3IiLCJzdGF0dXMiLCJyZWNvbm5lY3QiLCJkaXNjb25uZWN0IiwiY2xvc2UiLCJfcGVybWFuZW50IiwiX2FueU1ldGhvZHNBcmVPdXRzdGFuZGluZyIsImludm9rZXJzIiwiaW52b2tlciIsIl9saXZlZGF0YV9jb25uZWN0ZWQiLCJIZWFydGJlYXQiLCJvblRpbWVvdXQiLCJzZW5kUGluZyIsInN0YXJ0IiwicmVjb25uZWN0ZWRUb1ByZXZpb3VzU2Vzc2lvbiIsInNlc3Npb24iLCJfcmVmNCIsIl9ydW5BZnRlclVwZGF0ZUNhbGxiYWNrcyIsIl9wcm9jZXNzT25lRGF0YU1lc3NhZ2UiLCJ1cGRhdGVzIiwibWVzc2FnZVR5cGUiLCJfcHJvY2Vzc19hZGRlZCIsIl9wcm9jZXNzX2NoYW5nZWQiLCJfcHJvY2Vzc19yZW1vdmVkIiwiX3Byb2Nlc3NfcmVhZHkiLCJfcHJvY2Vzc191cGRhdGVkIiwiX2xpdmVkYXRhX2RhdGEiLCJzdWJzIiwic3ViSWQiLCJidWZmZXJlZE1lc3NhZ2VzIiwiYnVmZmVyZWRNZXNzYWdlIiwic3RhbmRhcmRXcml0ZSIsIkRhdGUiLCJ2YWx1ZU9mIiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsIndyaXRlcyIsIl9wZXJmb3JtV3JpdGVzIiwiX3JlZjUiLCJzdG9yZU5hbWUiLCJfcmVmNiIsInVwZGF0ZU1lc3NhZ2VzIiwidXBkYXRlTWVzc2FnZSIsIl9wdXNoVXBkYXRlIiwiX2dldFNlcnZlckRvYyIsInNlcnZlckRvY3NGb3JDb2xsZWN0aW9uIiwiaXNFeGlzdGluZyIsImZpZWxkcyIsIl9pZCIsImN1cnJlbnREb2MiLCJnZXREb2MiLCJEaWZmU2VxdWVuY2UiLCJhcHBseUNoYW5nZXMiLCJkb2NzIiwid3JpdHRlbiIsIkpTT04iLCJzdHJpbmdpZnkiLCJyZXBsYWNlIiwiY2FsbGJhY2tJbnZva2VyIiwiX3J1bldoZW5BbGxTZXJ2ZXJEb2NzQXJlRmx1c2hlZCIsInN1YlJlY29yZCIsInJ1bkZBZnRlclVwZGF0ZXMiLCJ1bmZsdXNoZWRTZXJ2ZXJEb2NDb3VudCIsIm9uU2VydmVyRG9jRmx1c2giLCJzZXJ2ZXJEb2N1bWVudHMiLCJ3cml0dGVuQnlTdHViRm9yQU1ldGhvZFdpdGhTZW50TWVzc2FnZSIsIl9saXZlZGF0YV9ub3N1YiIsIm1ldGVvckVycm9yRnJvbU1zZyIsIm1zZ0FyZyIsInJlYXNvbiIsImRldGFpbHMiLCJfbGl2ZWRhdGFfcmVzdWx0IiwiY3VycmVudE1ldGhvZEJsb2NrIiwiaSIsIm0iLCJpZHgiLCJmb3VuZCIsInNwbGljZSIsImZpcnN0QmxvY2siLCJzaGlmdCIsIl9zZW5kT3V0c3RhbmRpbmdNZXRob2RzIiwiX21heWJlTWlncmF0ZSIsIl9saXZlZGF0YV9lcnJvciIsIm9mZmVuZGluZ01lc3NhZ2UiLCJfY2FsbE9uUmVjb25uZWN0QW5kU2VuZEFwcHJvcHJpYXRlT3V0c3RhbmRpbmdNZXRob2RzIiwib2xkT3V0c3RhbmRpbmdNZXRob2RCbG9ja3MiLCJfcmVjb25uZWN0SG9vayIsImVhY2giLCJyYXdfbXNnIiwicGFyc2VERFAiLCJtZXNzYWdlUmVjZWl2ZWQiLCJ0ZXN0TWVzc2FnZU9uQ29ubmVjdCIsInNlcnZlcl9pZCIsImluZGV4T2YiLCJ2ZXJzaW9uIiwiX2ZvcmNlIiwiX2Vycm9yIiwiaW5jbHVkZXMiLCJzdXBwb3J0IiwiZmlsdGVyIiwiX3JlZjciLCJhbGxDb25uZWN0aW9ucyIsIkVudmlyb25tZW50VmFyaWFibGUiLCJfQ3VycmVudFB1YmxpY2F0aW9uSW52b2NhdGlvbiIsIl9DdXJyZW50SW52b2NhdGlvbiIsImNvbm5lY3Rpb25FcnJvckNvbnN0cnVjdG9yIiwibWFrZUVycm9yVHlwZSIsIkZvcmNlZFJlY29ubmVjdEVycm9yIiwicmFuZG9tU3RyZWFtIiwic2NvcGUiLCJSYW5kb21TdHJlYW0iLCJjb25uZWN0IiwicmV0IiwicmVnaXN0ZXIiLCJfYWxsU3Vic2NyaXB0aW9uc1JlYWR5IiwiZXZlcnkiLCJjb25uIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQUEsTUFBTSxDQUFDQyxJQUFJLENBQUMsd0JBQXdCLEVBQUM7RUFBQ0MsR0FBRyxFQUFDO0FBQUssQ0FBQyxFQUFDLENBQUMsQ0FBQyxDOzs7Ozs7Ozs7OztBQ0FuREYsTUFBTSxDQUFDRyxNQUFNLENBQUM7RUFBQ0MsT0FBTyxFQUFDQSxDQUFBLEtBQUlDO0FBQWEsQ0FBQyxDQUFDO0FBSzNCLE1BQU1BLGFBQWEsQ0FBQztFQUNqQ0MsV0FBV0EsQ0FBQ0MsT0FBTyxFQUFFO0lBQ25CO0lBQ0EsSUFBSSxDQUFDQyxRQUFRLEdBQUdELE9BQU8sQ0FBQ0MsUUFBUTtJQUNoQyxJQUFJLENBQUNDLFdBQVcsR0FBRyxLQUFLO0lBRXhCLElBQUksQ0FBQ0MsU0FBUyxHQUFHSCxPQUFPLENBQUNJLFFBQVE7SUFDakMsSUFBSSxDQUFDQyxXQUFXLEdBQUdMLE9BQU8sQ0FBQ00sVUFBVTtJQUNyQyxJQUFJLENBQUNDLFFBQVEsR0FBR1AsT0FBTyxDQUFDUSxPQUFPO0lBQy9CLElBQUksQ0FBQ0MsaUJBQWlCLEdBQUdULE9BQU8sQ0FBQ1UsZ0JBQWdCLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQztJQUMvRCxJQUFJLENBQUNDLEtBQUssR0FBR1gsT0FBTyxDQUFDWSxJQUFJO0lBQ3pCLElBQUksQ0FBQ0MsT0FBTyxHQUFHYixPQUFPLENBQUNhLE9BQU87SUFDOUIsSUFBSSxDQUFDQyxhQUFhLEdBQUcsSUFBSTtJQUN6QixJQUFJLENBQUNDLFlB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ZHAtY2xpZW50LmpzIiwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IHsgRERQIH0gZnJvbSAnLi4vY29tbW9uL25hbWVzcGFjZS5qcyc7XG4iLCIvLyBBIE1ldGhvZEludm9rZXIgbWFuYWdlcyBzZW5kaW5nIGEgbWV0aG9kIHRvIHRoZSBzZXJ2ZXIgYW5kIGNhbGxpbmcgdGhlIHVzZXInc1xuLy8gY2FsbGJhY2tzLiBPbiBjb25zdHJ1Y3Rpb24sIGl0IHJlZ2lzdGVycyBpdHNlbGYgaW4gdGhlIGNvbm5lY3Rpb24nc1xuLy8gX21ldGhvZEludm9rZXJzIG1hcDsgaXQgcmVtb3ZlcyBpdHNlbGYgb25jZSB0aGUgbWV0aG9kIGlzIGZ1bGx5IGZpbmlzaGVkIGFuZFxuLy8gdGhlIGNhbGxiYWNrIGlzIGludm9rZWQuIFRoaXMgb2NjdXJzIHdoZW4gaXQgaGFzIGJvdGggcmVjZWl2ZWQgYSByZXN1bHQsXG4vLyBhbmQgdGhlIGRhdGEgd3JpdHRlbiBieSBpdCBpcyBmdWxseSB2aXNpYmxlLlxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWV0aG9kSW52b2tlciB7XG4gIGNvbnN0cnVjdG9yKG9wdGlvbnMpIHtcbiAgICAvLyBQdWJsaWMgKHdpdGhpbiB0aGlzIGZpbGUpIGZpZWxkcy5cbiAgICB0aGlzLm1ldGhvZElkID0gb3B0aW9ucy5tZXRob2RJZDtcbiAgICB0aGlzLnNlbnRNZXNzYWdlID0gZmFsc2U7XG5cbiAgICB0aGlzLl9jYWxsYmFjayA9IG9wdGlvbnMuY2FsbGJhY2s7XG4gICAgdGhpcy5fY29ubmVjdGlvbiA9IG9wdGlvbnMuY29ubmVjdGlvbjtcbiAgICB0aGlzLl9tZXNzYWdlID0gb3B0aW9ucy5tZXNzYWdlO1xuICAgIHRoaXMuX29uUmVzdWx0UmVjZWl2ZWQgPSBvcHRpb25zLm9uUmVzdWx0UmVjZWl2ZWQgfHwgKCgpID0+IHt9KTtcbiAgICB0aGlzLl93YWl0ID0gb3B0aW9ucy53YWl0O1xuICAgIHRoaXMubm9SZXRyeSA9IG9wdGlvbnMubm9SZXRyeTtcbiAgICB0aGlzLl9tZXRob2RSZXN1bHQgPSBudWxsO1xuICAgIHRoaXMuX2RhdGFWaXNpYmxlID0gZmFsc2U7XG5cbiAgICAvLyBSZWdpc3RlciB3aXRoIHRoZSBjb25uZWN0aW9uLlxuICAgIHRoaXMuX2Nvbm5lY3Rpb24uX21ldGhvZEludm9rZXJzW3RoaXMubWV0aG9kSWRdID0gdGhpcztcbiAgfVxuICAvLyBTZW5kcyB0aGUgbWV0aG9kIG1lc3NhZ2UgdG8gdGhlIHNlcnZlci4gTWF5IGJlIGNhbGxlZCBhZGRpdGlvbmFsIHRpbWVzIGlmXG4gIC8vIHdlIGxvc2UgdGhlIGNvbm5lY3Rpb24gYW5kIHJlY29ubmVjdCBiZWZvcmUgcmVjZWl2aW5nIGEgcmVzdWx0LlxuICBzZW5kTWVzc2FnZSgpIHtcbiAgICAvLyBUaGlzIGZ1bmN0aW9uIGlzIGNhbGxlZCBiZWZvcmUgc2VuZGluZyBhIG1ldGhvZCAoaW5jbHVkaW5nIHJlc2VuZGluZyBvblxuICAgIC8vIHJlY29ubmVjdCkuIFdlIHNob3VsZCBvbmx5IChyZSlzZW5kIG1ldGhvZHMgd2hlcmUgd2UgZG9uJ3QgYWxyZWFkeSBoYXZlIGFcbiAgICAvLyByZXN1bHQhXG4gICAgaWYgKHRoaXMuZ290UmVzdWx0KCkpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3NlbmRpbmdNZXRob2QgaXMgY2FsbGVkIG9uIG1ldGhvZCB3aXRoIHJlc3VsdCcpO1xuXG4gICAgLy8gSWYgd2UncmUgcmUtc2VuZGluZyBpdCwgaXQgZG9lc24ndCBtYXR0ZXIgaWYgZGF0YSB3YXMgd3JpdHRlbiB0aGUgZmlyc3RcbiAgICAvLyB0aW1lLlxuICAgIHRoaXMuX2RhdGFWaXNpYmxlID0gZmFsc2U7XG4gICAgdGhpcy5zZW50TWVzc2FnZSA9IHRydWU7XG5cbiAgICAvLyBJZiB0aGlzIGlzIGEgd2FpdCBtZXRob2QsIG1ha2UgYWxsIGRhdGEgbWVzc2FnZXMgYmUgYnVmZmVyZWQgdW50aWwgaXQgaXNcbiAgICAvLyBkb25lLlxuICAgIGlmICh0aGlzLl93YWl0KVxuICAgICAgdGhpcy5fY29ubmVjdGlvbi5fbWV0aG9kc0Jsb2NraW5nUXVpZXNjZW5jZVt0aGlzLm1ldGhvZElkXSA9IHRydWU7XG5cbiAgICAvLyBBY3R1YWxseSBzZW5kIHRoZSBtZXNzYWdlLlxuICAgIHRoaXMuX2Nvbm5lY3Rpb24uX3NlbmQodGhpcy5fbWVzc2FnZSk7XG4gIH1cbiAgLy8gSW52b2tlIHRoZSBjYWxsYmFjaywgaWYgd2UgaGF2ZSBib3RoIGEgcmVzdWx0IGFuZCBrbm93IHRoYXQgYWxsIGRhdGEgaGFzXG4gIC8vIGJlZW4gd3JpdHRlbiB0byB0aGUgbG9jYWwgY2FjaGUuXG4gIF9tYXliZUludm9rZUNhbGxiYWNrKCkge1xuICAgIGlmICh0aGlzLl9tZXRob2RSZXN1bHQgJiYgdGhpcy5fZGF0YVZpc2libGUpIHtcbiAgICAgIC8vIENhbGwgdGhlIGNhbGxiYWNrLiAoVGhpcyB3b24ndCB0aHJvdzogdGhlIGNhbGxiYWNrIHdhcyB3cmFwcGVkIHdpdGhcbiAgICAgIC8vIGJpbmRFbnZpcm9ubWVudC4pXG4gICAgICB0aGlzLl9jYWxsYmFjayh0aGlzLl9tZXRob2RSZXN1bHRbMF0sIHRoaXMuX21ldGhvZFJlc3VsdFsxXSk7XG5cbiAgICAgIC8vIEZvcmdldCBhYm91dCB0aGlzIG1ldGhvZC5cbiAgICAgIGRlbGV0ZSB0aGlzLl9jb25uZWN0aW9uLl9tZXRob2RJbnZva2Vyc1t0aGlzLm1ldGhvZElkXTtcblxuICAgICAgLy8gTGV0IHRoZSBjb25uZWN0aW9uIGtub3cgdGhhdCB0aGlzIG1ldGhvZCBpcyBmaW5pc2hlZCwgc28gaXQgY2FuIHRyeSB0b1xuICAgICAgLy8gbW92ZSBvbiB0byB0aGUgbmV4dCBibG9jayBvZiBtZXRob2RzLlxuICAgICAgdGhpcy5fY29ubmVjdGlvbi5fb3V0c3RhbmRpbmdNZXRob2RGaW5pc2hlZCgpO1xuICAgIH1cbiAgfVxuICAvLyBDYWxsIHdpdGggdGhlIHJlc3VsdCBvZiB0aGUgbWV0aG9kIGZyb20gdGhlIHNlcnZlci4gT25seSBtYXkgYmUgY2FsbGVkXG4gIC8vIG9uY2U7IG9uY2UgaXQgaXMgY2FsbGVkLCB5b3Ugc2hvdWxkIG5vdCBjYWxsIHNlbmRNZXNzYWdlIGFnYWluLlxuICAvLyBJZiB0aGUgdXNlciBwcm92aWRlZCBhbiBvblJlc3VsdFJlY2VpdmVkIGNhbGxiYWNrLCBjYWxsIGl0IGltbWVkaWF0ZWx5LlxuICAvLyBUaGVuIGludm9rZSB0aGUgbWFpbiBjYWxsYmFjayBpZiBkYXRhIGlzIGFsc28gdmlzaWJsZS5cbiAgcmVjZWl2ZVJlc3VsdChlcnIsIHJlc3VsdCkge1xuICAgIGlmICh0aGlzLmdvdFJlc3VsdCgpKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2RzIHNob3VsZCBvbmx5IHJlY2VpdmUgcmVzdWx0cyBvbmNlJyk7XG4gICAgdGhpcy5fbWV0aG9kUmVzdWx0ID0gW2VyciwgcmVzdWx0XTtcbiAgICB0aGlzLl9vblJlc3VsdFJlY2VpdmVkKGVyciwgcmVzdWx0KTtcbiAgICB0aGlzLl9tYXliZUludm9rZUNhbGxiYWNrKCk7XG4gIH1cbiAgLy8gQ2FsbCB0aGlzIHdoZW4gYWxsIGRhdGEgd3JpdHRlbiBieSB0aGUgbWV0aG9kIGlzIHZpc2libGUuIFRoaXMgbWVhbnMgdGhhdFxuICAvLyB0aGUgbWV0aG9kIGhhcyByZXR1cm5zIGl0cyBcImRhdGEgaXMgZG9uZVwiIG1lc3NhZ2UgKkFORCogYWxsIHNlcnZlclxuICAvLyBkb2N1bWVudHMgdGhhdCBhcmUgYnVmZmVyZWQgYXQgdGhhdCB0aW1lIGhhdmUgYmVlbiB3cml0dGVuIHRvIHRoZSBsb2NhbFxuICAvLyBjYWNoZS4gSW52b2tlcyB0aGUgbWFpbiBjYWxsYmFjayBpZiB0aGUgcmVzdWx0IGhhcyBiZWVuIHJlY2VpdmVkLlxuICBkYXRhVmlzaWJsZSgpIHtcbiAgICB0aGlzLl9kYXRhVmlzaWJsZSA9IHRydWU7XG4gICAgdGhpcy5fbWF5YmVJbnZva2VDYWxsYmFjaygpO1xuICB9XG4gIC8vIFRydWUgaWYgcmVjZWl2ZVJlc3VsdCBoYXMgYmVlbiBjYWxsZWQuXG4gIGdvdFJlc3VsdCgpIHtcbiAgICByZXR1cm4gISF0aGlzLl9tZXRob2RSZXN1bHQ7XG4gIH1cbn1cbiIsImltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InO1xuaW1wb3J0IHsgRERQQ29tbW9uIH0gZnJvbSAnbWV0ZW9yL2RkcC1jb21tb24nO1xuaW1wb3J0IHsgVHJhY2tlciB9IGZyb20gJ21ldGVvci90cmFja2VyJztcbmltcG9ydCB7IEVKU09OIH0gZnJvbSAnbWV0ZW9yL2Vqc29uJztcbmltcG9ydCB7IFJhbmRvbSB9IGZyb20gJ21ldGVvci9yYW5kb20nO1xuaW1wb3J0IHsgSG9vayB9IGZyb20gJ21ldGVvci9jYWxsYmFjay1ob29rJztcbmltcG9ydCB7IE1vbmdvSUQgfSBmcm9tICdtZXRlb3IvbW9uZ28taWQnO1xuaW1wb3J0IHsgRERQIH0gZnJvbSAnLi9uYW1lc3BhY2UuanMnO1xuaW1wb3J0IE1ldGhvZEludm9rZXIgZnJvbSAnLi9NZXRob2RJbnZva2VyLmpzJztcbmltcG9ydCB7XG4gIGhhc093bixcbiAgc2xpY2UsXG4gIGtleXMsXG4gIGlzRW1wdHksXG4gIGxhc3QsXG59IGZyb20gXCJtZXRlb3IvZGRwLWNvbW1vbi91dGlscy5qc1wiO1xuXG5sZXQgRmliZXI7XG5sZXQgRnV0dXJlO1xuaWYgKE1ldGVvci5pc1NlcnZlcikge1xuICBGaWJlciA9IE5wbS5yZXF1aXJlKCdmaWJlcnMnKTtcbiAgRnV0dXJlID0gTnBtLnJlcXVpcmUoJ2ZpYmVycy9mdXR1cmUnKTtcbn1cblxuY2xhc3MgTW9uZ29JRE1hcCBleHRlbmRzIElkTWFwIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoTW9uZ29JRC5pZFN0cmluZ2lmeSwgTW9uZ29JRC5pZFBhcnNlKTtcbiAgfVxufVxuXG4vLyBAcGFyYW0gdXJsIHtTdHJpbmd8T2JqZWN0fSBVUkwgdG8gTWV0ZW9yIGFwcCxcbi8vICAgb3IgYW4gb2JqZWN0IGFzIGEgdGVzdCBob29rIChzZWUgY29kZSlcbi8vIE9wdGlvbnM6XG4vLyAgIHJlbG9hZFdpdGhPdXRzdGFuZGluZzogaXMgaXQgT0sgdG8gcmVsb2FkIGlmIHRoZXJlIGFyZSBvdXRzdGFuZGluZyBtZXRob2RzP1xuLy8gICBoZWFkZXJzOiBleHRyYSBoZWFkZXJzIHRvIHNlbmQgb24gdGhlIHdlYnNvY2tldHMgY29ubmVjdGlvbiwgZm9yXG4vLyAgICAgc2VydmVyLXRvLXNlcnZlciBERFAgb25seVxuLy8gICBfc29ja2pzT3B0aW9uczogU3BlY2lmaWVzIG9wdGlvbnMgdG8gcGFzcyB0aHJvdWdoIHRvIHRoZSBzb2NranMgY2xpZW50XG4vLyAgIG9uRERQTmVnb3RpYXRpb25WZXJzaW9uRmFpbHVyZTogY2FsbGJhY2sgd2hlbiB2ZXJzaW9uIG5lZ290aWF0aW9uIGZhaWxzLlxuLy9cbi8vIFhYWCBUaGVyZSBzaG91bGQgYmUgYSB3YXkgdG8gZGVzdHJveSBhIEREUCBjb25uZWN0aW9uLCBjYXVzaW5nIGFsbFxuLy8gb3V0c3RhbmRpbmcgbWV0aG9kIGNhbGxzIHRvIGZhaWwuXG4vL1xuLy8gWFhYIE91ciBjdXJyZW50IHdheSBvZiBoYW5kbGluZyBmYWlsdXJlIGFuZCByZWNvbm5lY3Rpb24gaXMgZ3JlYXRcbi8vIGZvciBhbiBhcHAgKHdoZXJlIHdlIHdhbnQgdG8gdG9sZXJhdGUgYmVpbmcgZGlzY29ubmVjdGVkIGFzIGFuXG4vLyBleHBlY3Qgc3RhdGUsIGFuZCBrZWVwIHRyeWluZyBmb3JldmVyIHRvIHJlY29ubmVjdCkgYnV0IGN1bWJlcnNvbWVcbi8vIGZvciBzb21ldGhpbmcgbGlrZSBhIGNvbW1hbmQgbGluZSB0b29sIHRoYXQgd2FudHMgdG8gbWFrZSBhXG4vLyBjb25uZWN0aW9uLCBjYWxsIGEgbWV0aG9kLCBhbmQgcHJpbnQgYW4gZXJyb3IgaWYgY29ubmVjdGlvblxuLy8gZmFpbHMuIFdlIHNob3VsZCBoYXZlIGJldHRlciB1c2FiaWxpdHkgaW4gdGhlIGxhdHRlciBjYXNlICh3aGlsZVxuLy8gc3RpbGwgdHJhbnNwYXJlbnRseSByZWNvbm5lY3RpbmcgaWYgaXQncyBqdXN0IGEgdHJhbnNpZW50IGZhaWx1cmVcbi8vIG9yIHRoZSBzZXJ2ZXIgbWlncmF0aW5nIHVzKS5cbmV4cG9ydCBjbGFzcyBDb25uZWN0aW9uIHtcbiAgY29uc3RydWN0b3IodXJsLCBvcHRpb25zKSB7XG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG5cbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zID0ge1xuICAgICAgb25Db25uZWN0ZWQoKSB7fSxcbiAgICAgIG9uRERQVmVyc2lvbk5lZ290aWF0aW9uRmFpbHVyZShkZXNjcmlwdGlvbikge1xuICAgICAgICBNZXRlb3IuX2RlYnVnKGRlc2NyaXB0aW9uKTtcbiAgICAgIH0sXG4gICAgICBoZWFydGJlYXRJbnRlcnZhbDogMTc1MDAsXG4gICAgICBoZWFydGJlYXRUaW1lb3V0OiAxNTAwMCxcbiAgICAgIG5wbUZheWVPcHRpb25zOiBPYmplY3QuY3JlYXRlKG51bGwpLFxuICAgICAgLy8gVGhlc2Ugb3B0aW9ucyBhcmUgb25seSBmb3IgdGVzdGluZy5cbiAgICAgIHJlbG9hZFdpdGhPdXRzdGFuZGluZzogZmFsc2UsXG4gICAgICBzdXBwb3J0ZWRERFBWZXJzaW9uczogRERQQ29tbW9uLlNVUFBPUlRFRF9ERFBfVkVSU0lPTlMsXG4gICAgICByZXRyeTogdHJ1ZSxcbiAgICAgIHJlc3BvbmRUb1BpbmdzOiB0cnVlLFxuICAgICAgLy8gV2hlbiB1cGRhdGVzIGFyZSBjb21pbmcgd2l0aGluIHRoaXMgbXMgaW50ZXJ2YWwsIGJhdGNoIHRoZW0gdG9nZXRoZXIuXG4gICAgICBidWZmZXJlZFdyaXRlc0ludGVydmFsOiA1LFxuICAgICAgLy8gRmx1c2ggYnVmZmVycyBpbW1lZGlhdGVseSBpZiB3cml0ZXMgYXJlIGhhcHBlbmluZyBjb250aW51b3VzbHkgZm9yIG1vcmUgdGhhbiB0aGlzIG1hbnkgbXMuXG4gICAgICBidWZmZXJlZFdyaXRlc01heEFnZTogNTAwLFxuXG4gICAgICAuLi5vcHRpb25zXG4gICAgfTtcblxuICAgIC8vIElmIHNldCwgY2FsbGVkIHdoZW4gd2UgcmVjb25uZWN0LCBxdWV1aW5nIG1ldGhvZCBjYWxscyBfYmVmb3JlXyB0aGVcbiAgICAvLyBleGlzdGluZyBvdXRzdGFuZGluZyBvbmVzLlxuICAgIC8vIE5PVEU6IFRoaXMgZmVhdHVyZSBoYXMgYmVlbiBwcmVzZXJ2ZWQgZm9yIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5LiBUaGVcbiAgICAvLyBwcmVmZXJyZWQgbWV0aG9kIG9mIHNldHRpbmcgYSBjYWxsYmFjayBvbiByZWNvbm5lY3QgaXMgdG8gdXNlXG4gICAgLy8gRERQLm9uUmVjb25uZWN0LlxuICAgIHNlbGYub25SZWNvbm5lY3QgPSBudWxsO1xuXG4gICAgLy8gYXMgYSB0ZXN0IGhvb2ssIGFsbG93IHBhc3NpbmcgYSBzdHJlYW0gaW5zdGVhZCBvZiBhIHVybC5cbiAgICBpZiAodHlwZW9mIHVybCA9PT0gJ29iamVjdCcpIHtcbiAgICAgIHNlbGYuX3N0cmVhbSA9IHVybDtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgeyBDbGllbnRTdHJlYW0gfSA9IHJlcXVpcmUoXCJtZXRlb3Ivc29ja2V0LXN0cmVhbS1jbGllbnRcIik7XG4gICAgICBzZWxmLl9zdHJlYW0gPSBuZXcgQ2xpZW50U3RyZWFtKHVybCwge1xuICAgICAgICByZXRyeTogb3B0aW9ucy5yZXRyeSxcbiAgICAgICAgQ29ubmVjdGlvbkVycm9yOiBERFAuQ29ubmVjdGlvbkVycm9yLFxuICAgICAgICBoZWFkZXJzOiBvcHRpb25zLmhlYWRlcnMsXG4gICAgICAgIF9zb2NranNPcHRpb25zOiBvcHRpb25zLl9zb2NranNPcHRpb25zLFxuICAgICAgICAvLyBVc2VkIHRvIGtlZXAgc29tZSB0ZXN0cyBxdWlldCwgb3IgZm9yIG90aGVyIGNhc2VzIGluIHdoaWNoXG4gICAgICAgIC8vIHRoZSByaWdodCB0aGluZyB0byBkbyB3aXRoIGNvbm5lY3Rpb24gZXJyb3JzIGlzIHRvIHNpbGVudGx5XG4gICAgICAgIC8vIGZhaWwgKGUuZy4gc2VuZGluZyBwYWNrYWdlIHVzYWdlIHN0YXRzKS4gQXQgc29tZSBwb2ludCB3ZVxuICAgICAgICAvLyBzaG91bGQgaGF2ZSBhIHJlYWwgQVBJIGZvciBoYW5kbGluZyBjbGllbnQtc3RyZWFtLWxldmVsXG4gICAgICAgIC8vIGVycm9ycy5cbiAgICAgICAgX2RvbnRQcmludEVycm9yczogb3B0aW9ucy5fZG9udFByaW50RXJyb3JzLFxuICAgICAgICBjb25uZWN0VGltZW91dE1zOiBvcHRpb25zLmNvbm5lY3RUaW1lb3V0TXMsXG4gICAgICAgIG5wbUZheWVPcHRpb25zOiBvcHRpb25zLm5wbUZheWVPcHRpb25zXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBzZWxmLl9sYXN0U2Vzc2lvbklkID0gbnVsbDtcbiAgICBzZWxmLl92ZXJzaW9uU3VnZ2VzdGlvbiA9IG51bGw7IC8vIFRoZSBsYXN0IHByb3Bvc2VkIEREUCB2ZXJzaW9uLlxuICAgIHNlbGYuX3ZlcnNpb24gPSBudWxsOyAvLyBUaGUgRERQIHZlcnNpb24gYWdyZWVkIG9uIGJ5IGNsaWVudCBhbmQgc2VydmVyLlxuICAgIHNlbGYuX3N0b3JlcyA9IE9iamVjdC5jcmVhdGUobnVsbCk7IC8vIG5hbWUgLT4gb2JqZWN0IHdpdGggbWV0aG9kc1xuICAgIHNlbGYuX21ldGhvZEhhbmRsZXJzID0gT2JqZWN0LmNyZWF0ZShudWxsKTsgLy8gbmFtZSAtPiBmdW5jXG4gICAgc2VsZi5fbmV4dE1ldGhvZElkID0gMTtcbiAgICBzZWxmLl9zdXBwb3J0ZWRERFBWZXJzaW9ucyA9IG9wdGlvbnMuc3VwcG9ydGVkRERQVmVyc2lvbnM7XG5cbiAgICBzZWxmLl9oZWFydGJlYXRJbnRlcnZhbCA9IG9wdGlvbnMuaGVhcnRiZWF0SW50ZXJ2YWw7XG4gICAgc2VsZi5faGVhcnRiZWF0VGltZW91dCA9IG9wdGlvbnMuaGVhcnRiZWF0VGltZW91dDtcblxuICAgIC8vIFRyYWNrcyBtZXRob2RzIHdoaWNoIHRoZSB1c2VyIGhhcyB0cmllZCB0byBjYWxsIGJ1dCB3aGljaCBoYXZlIG5vdCB5ZXRcbiAgICAvLyBjYWxsZWQgdGhlaXIgdXNlciBjYWxsYmFjayAoaWUsIHRoZXkgYXJlIHdhaXRpbmcgb24gdGhlaXIgcmVzdWx0IG9yIGZvciBhbGxcbiAgICAvLyBvZiB0aGVpciB3cml0ZXMgdG8gYmUgd3JpdHRlbiB0byB0aGUgbG9jYWwgY2FjaGUpLiBNYXAgZnJvbSBtZXRob2QgSUQgdG9cbiAgICAvLyBNZXRob2RJbnZva2VyIG9iamVjdC5cbiAgICBzZWxmLl9tZXRob2RJbnZva2VycyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgICAvLyBUcmFja3MgbWV0aG9kcyB3aGljaCB0aGUgdXNlciBoYXMgY2FsbGVkIGJ1dCB3aG9zZSByZXN1bHQgbWVzc2FnZXMgaGF2ZSBub3RcbiAgICAvLyBhcnJpdmVkIHlldC5cbiAgICAvL1xuICAgIC8vIF9vdXRzdGFuZGluZ01ldGhvZEJsb2NrcyBpcyBhbiBhcnJheSBvZiBibG9ja3Mgb2YgbWV0aG9kcy4gRWFjaCBibG9ja1xuICAgIC8vIHJlcHJlc2VudHMgYSBzZXQgb2YgbWV0aG9kcyB0aGF0IGNhbiBydW4gYXQgdGhlIHNhbWUgdGltZS4gVGhlIGZpcnN0IGJsb2NrXG4gICAgLy8gcmVwcmVzZW50cyB0aGUgbWV0aG9kcyB3aGljaCBhcmUgY3VycmVudGx5IGluIGZsaWdodDsgc3Vic2VxdWVudCBibG9ja3NcbiAgICAvLyBtdXN0IHdhaXQgZm9yIHByZXZpb3VzIGJsb2NrcyB0byBiZSBmdWxseSBmaW5pc2hlZCBiZWZvcmUgdGhleSBjYW4gYmUgc2VudFxuICAgIC8vIHRvIHRoZSBzZXJ2ZXIuXG4gICAgLy9cbiAgICAvLyBFYWNoIGJsb2NrIGlzIGFuIG9iamVjdCB3aXRoIHRoZSBmb2xsb3dpbmcgZmllbGRzOlxuICAgIC8vIC0gbWV0aG9kczogYSBsaXN0IG9mIE1ldGhvZEludm9rZXIgb2JqZWN0c1xuICAgIC8vIC0gd2FpdDogYSBib29sZWFuOyBpZiB0cnVlLCB0aGlzIGJsb2NrIGhhZCBhIHNpbmdsZSBtZXRob2QgaW52b2tlZCB3aXRoXG4gICAgLy8gICAgICAgICB0aGUgXCJ3YWl0XCIgb3B0aW9uXG4gICAgLy9cbiAgICAvLyBUaGVyZSB3aWxsIG5ldmVyIGJlIGFkamFjZW50IGJsb2NrcyB3aXRoIHdhaXQ9ZmFsc2UsIGJlY2F1c2UgdGhlIG9ubHkgdGhpbmdcbiAgICAvLyB0aGF0IG1ha2VzIG1ldGhvZHMgbmVlZCB0byBiZSBzZXJpYWxpemVkIGlzIGEgd2FpdCBtZXRob2QuXG4gICAgLy9cbiAgICAvLyBNZXRob2RzIGFyZSByZW1vdmVkIGZyb20gdGhlIGZpcnN0IGJsb2NrIHdoZW4gdGhlaXIgXCJyZXN1bHRcIiBpc1xuICAgIC8vIHJlY2VpdmVkLiBUaGUgZW50aXJlIGZpcnN0IGJsb2NrIGlzIG9ubHkgcmVtb3ZlZCB3aGVuIGFsbCBvZiB0aGUgaW4tZmxpZ2h0XG4gICAgLy8gbWV0aG9kcyBoYXZlIHJlY2VpdmVkIHRoZWlyIHJlc3VsdHMgKHNvIHRoZSBcIm1ldGhvZHNcIiBsaXN0IGlzIGVtcHR5KSAqQU5EKlxuICAgIC8vIGFsbCBvZiB0aGUgZGF0YSB3cml0dGVuIGJ5IHRob3NlIG1ldGhvZHMgYXJlIHZpc2libGUgaW4gdGhlIGxvY2FsIGNhY2hlLiBTb1xuICAgIC8vIGl0IGlzIHBvc3NpYmxlIGZvciB0aGUgZmlyc3QgYmxvY2sncyBtZXRob2RzIGxpc3QgdG8gYmUgZW1wdHksIGlmIHdlIGFyZVxuICAgIC8vIHN0aWxsIHdhaXRpbmcgZm9yIHNvbWUgb2JqZWN0cyB0byBxdWllc2NlLlxuICAgIC8vXG4gICAgLy8gRXhhbXBsZTpcbiAgICAvLyAgX291dHN0YW5kaW5nTWV0aG9kQmxvY2tzID0gW1xuICAgIC8vICAgIHt3YWl0OiBmYWxzZSwgbWV0aG9kczogW119LFxuICAgIC8vICAgIHt3YWl0OiB0cnVlLCBtZXRob2RzOiBbPE1ldGhvZEludm9rZXIgZm9yICdsb2dpbic+XX0sXG4gICAgLy8gICAge3dhaXQ6IGZhbHNlLCBtZXRob2RzOiBbPE1ldGhvZEludm9rZXIgZm9yICdmb28nPixcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgICA8TWV0aG9kSW52b2tlciBmb3IgJ2Jhcic+XX1dXG4gICAgLy8gVGhpcyBtZWFucyB0aGF0IHRoZXJlIHdlcmUgc29tZSBtZXRob2RzIHdoaWNoIHdlcmUgc2VudCB0byB0aGUgc2VydmVyIGFuZFxuICAgIC8vIHdoaWNoIGhhdmUgcmV0dXJuZWQgdGhlaXIgcmVzdWx0cywgYnV0IHNvbWUgb2YgdGhlIGRhdGEgd3JpdHRlbiBieVxuICAgIC8vIHRoZSBtZXRob2RzIG1heSBub3QgYmUgdmlzaWJsZSBpbiB0aGUgbG9jYWwgY2FjaGUuIE9uY2UgYWxsIHRoYXQgZGF0YSBpc1xuICAgIC8vIHZpc2libGUsIHdlIHdpbGwgc2VuZCBhICdsb2dpbicgbWV0aG9kLiBPbmNlIHRoZSBsb2dpbiBtZXRob2QgaGFzIHJldHVybmVkXG4gICAgLy8gYW5kIGFsbCB0aGUgZGF0YSBpcyB2aXNpYmxlIChpbmNsdWRpbmcgcmUtcnVubmluZyBzdWJzIGlmIHVzZXJJZCBjaGFuZ2VzKSxcbiAgICAvLyB3ZSB3aWxsIHNlbmQgdGhlICdmb28nIGFuZCAnYmFyJyBtZXRob2RzIGluIHBhcmFsbGVsLlxuICAgIHNlbGYuX291dHN0YW5kaW5nTWV0aG9kQmxvY2tzID0gW107XG5cbiAgICAvLyBtZXRob2QgSUQgLT4gYXJyYXkgb2Ygb2JqZWN0cyB3aXRoIGtleXMgJ2NvbGxlY3Rpb24nIGFuZCAnaWQnLCBsaXN0aW5nXG4gICAgLy8gZG9jdW1lbnRzIHdyaXR0ZW4gYnkgYSBnaXZlbiBtZXRob2QncyBzdHViLiBrZXlzIGFyZSBhc3NvY2lhdGVkIHdpdGhcbiAgICAvLyBtZXRob2RzIHdob3NlIHN0dWIgd3JvdGUgYXQgbGVhc3Qgb25lIGRvY3VtZW50LCBhbmQgd2hvc2UgZGF0YS1kb25lIG1lc3NhZ2VcbiAgICAvLyBoYXMgbm90IHlldCBiZWVuIHJlY2VpdmVkLlxuICAgIHNlbGYuX2RvY3VtZW50c1dyaXR0ZW5CeVN0dWIgPSB7fTtcbiAgICAvLyBjb2xsZWN0aW9uIC0+IElkTWFwIG9mIFwic2VydmVyIGRvY3VtZW50XCIgb2JqZWN0LiBBIFwic2VydmVyIGRvY3VtZW50XCIgaGFzOlxuICAgIC8vIC0gXCJkb2N1bWVudFwiOiB0aGUgdmVyc2lvbiBvZiB0aGUgZG9jdW1lbnQgYWNjb3JkaW5nIHRoZVxuICAgIC8vICAgc2VydmVyIChpZSwgdGhlIHNuYXBzaG90IGJlZm9yZSBhIHN0dWIgd3JvdGUgaXQsIGFtZW5kZWQgYnkgYW55IGNoYW5nZXNcbiAgICAvLyAgIHJlY2VpdmVkIGZyb20gdGhlIHNlcnZlcilcbiAgICAvLyAgIEl0IGlzIHVuZGVmaW5lZCBpZiB3ZSB0aGluayB0aGUgZG9jdW1lbnQgZG9lcyBub3QgZXhpc3RcbiAgICAvLyAtIFwid3JpdHRlbkJ5U3R1YnNcIjogYSBzZXQgb2YgbWV0aG9kIElEcyB3aG9zZSBzdHVicyB3cm90ZSB0byB0aGUgZG9jdW1lbnRcbiAgICAvLyAgIHdob3NlIFwiZGF0YSBkb25lXCIgbWVzc2FnZXMgaGF2ZSBub3QgeWV0IGJlZW4gcHJvY2Vzc2VkXG4gICAgc2VsZi5fc2VydmVyRG9jdW1lbnRzID0ge307XG5cbiAgICAvLyBBcnJheSBvZiBjYWxsYmFja3MgdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBuZXh0IHVwZGF0ZSBvZiB0aGUgbG9jYWxcbiAgICAvLyBjYWNoZS4gVXNlZCBmb3I6XG4gICAgLy8gIC0gQ2FsbGluZyBtZXRob2RJbnZva2VyLmRhdGFWaXNpYmxlIGFuZCBzdWIgcmVhZHkgY2FsbGJhY2tzIGFmdGVyXG4gICAgLy8gICAgdGhlIHJlbGV2YW50IGRhdGEgaXMgZmx1c2hlZC5cbiAgICAvLyAgLSBJbnZva2luZyB0aGUgY2FsbGJhY2tzIG9mIFwiaGFsZi1maW5pc2hlZFwiIG1ldGhvZHMgYWZ0ZXIgcmVjb25uZWN0XG4gICAgLy8gICAgcXVpZXNjZW5jZS4gU3BlY2lmaWNhbGx5LCBtZXRob2RzIHdob3NlIHJlc3VsdCB3YXMgcmVjZWl2ZWQgb3ZlciB0aGUgb2xkXG4gICAgLy8gICAgY29ubmVjdGlvbiAoc28gd2UgZG9uJ3QgcmUtc2VuZCBpdCkgYnV0IHdob3NlIGRhdGEgaGFkIG5vdCBiZWVuIG1hZGVcbiAgICAvLyAgICB2aXNpYmxlLlxuICAgIHNlbGYuX2FmdGVyVXBkYXRlQ2FsbGJhY2tzID0gW107XG5cbiAgICAvLyBJbiB0d28gY29udGV4dHMsIHdlIGJ1ZmZlciBhbGwgaW5jb21pbmcgZGF0YSBtZXNzYWdlcyBhbmQgdGhlbiBwcm9jZXNzIHRoZW1cbiAgICAvLyBhbGwgYXQgb25jZSBpbiBhIHNpbmdsZSB1cGRhdGU6XG4gICAgLy8gICAtIER1cmluZyByZWNvbm5lY3QsIHdlIGJ1ZmZlciBhbGwgZGF0YSBtZXNzYWdlcyB1bnRpbCBhbGwgc3VicyB0aGF0IGhhZFxuICAgIC8vICAgICBiZWVuIHJlYWR5IGJlZm9yZSByZWNvbm5lY3QgYXJlIHJlYWR5IGFnYWluLCBhbmQgYWxsIG1ldGhvZHMgdGhhdCBhcmVcbiAgICAvLyAgICAgYWN0aXZlIGhhdmUgcmV0dXJuZWQgdGhlaXIgXCJkYXRhIGRvbmUgbWVzc2FnZVwiOyB0aGVuXG4gICAgLy8gICAtIER1cmluZyB0aGUgZXhlY3V0aW9uIG9mIGEgXCJ3YWl0XCIgbWV0aG9kLCB3ZSBidWZmZXIgYWxsIGRhdGEgbWVzc2FnZXNcbiAgICAvLyAgICAgdW50aWwgdGhlIHdhaXQgbWV0aG9kIGdldHMgaXRzIFwiZGF0YSBkb25lXCIgbWVzc2FnZS4gKElmIHRoZSB3YWl0IG1ldGhvZFxuICAgIC8vICAgICBvY2N1cnMgZHVyaW5nIHJlY29ubmVjdCwgaXQgZG9lc24ndCBnZXQgYW55IHNwZWNpYWwgaGFuZGxpbmcuKVxuICAgIC8vIGFsbCBkYXRhIG1lc3NhZ2VzIGFyZSBwcm9jZXNzZWQgaW4gb25lIHVwZGF0ZS5cbiAgICAvL1xuICAgIC8vIFRoZSBmb2xsb3dpbmcgZmllbGRzIGFyZSB1c2VkIGZvciB0aGlzIFwicXVpZXNjZW5jZVwiIHByb2Nlc3MuXG5cbiAgICAvLyBUaGlzIGJ1ZmZlcnMgdGhlIG1lc3NhZ2VzIHRoYXQgYXJlbid0IGJlaW5nIHByb2Nlc3NlZCB5ZXQuXG4gICAgc2VsZi5fbWVzc2FnZXNCdWZmZXJlZFVudGlsUXVpZXNjZW5jZSA9IFtdO1xuICAgIC8vIE1hcCBmcm9tIG1ldGhvZCBJRCAtPiB0cnVlLiBNZXRob2RzIGFyZSByZW1vdmVkIGZyb20gdGhpcyB3aGVuIHRoZWlyXG4gICAgLy8gXCJkYXRhIGRvbmVcIiBtZXNzYWdlIGlzIHJlY2VpdmVkLCBhbmQgd2Ugd2lsbCBub3QgcXVpZXNjZSB1bnRpbCBpdCBpc1xuICAgIC8vIGVtcHR5LlxuICAgIHNlbGYuX21ldGhvZHNCbG9ja2luZ1F1aWVzY2VuY2UgPSB7fTtcbiAgICAvLyBtYXAgZnJvbSBzdWIgSUQgLT4gdHJ1ZSBmb3Igc3VicyB0aGF0IHdlcmUgcmVhZHkgKGllLCBjYWxsZWQgdGhlIHN1YlxuICAgIC8vIHJlYWR5IGNhbGxiYWNrKSBiZWZvcmUgcmVjb25uZWN0IGJ1dCBoYXZlbid0IGJlY29tZSByZWFkeSBhZ2FpbiB5ZXRcbiAgICBzZWxmLl9zdWJzQmVpbmdSZXZpdmVkID0ge307IC8vIG1hcCBmcm9tIHN1Yi5faWQgLT4gdHJ1ZVxuICAgIC8vIGlmIHRydWUsIHRoZSBuZXh0IGRhdGEgdXBkYXRlIHNob3VsZCByZXNldCBhbGwgc3RvcmVzLiAoc2V0IGR1cmluZ1xuICAgIC8vIHJlY29ubmVjdC4pXG4gICAgc2VsZi5fcmVzZXRTdG9yZXMgPSBmYWxzZTtcblxuICAgIC8vIG5hbWUgLT4gYXJyYXkgb2YgdXBkYXRlcyBmb3IgKHlldCB0byBiZSBjcmVhdGVkKSBjb2xsZWN0aW9uc1xuICAgIHNlbGYuX3VwZGF0ZXNGb3JVbmtub3duU3RvcmVzID0ge307XG4gICAgLy8gaWYgd2UncmUgYmxvY2tpbmcgYSBtaWdyYXRpb24sIHRoZSByZXRyeSBmdW5jXG4gICAgc2VsZi5fcmV0cnlNaWdyYXRlID0gbnVsbDtcblxuICAgIHNlbGYuX19mbHVzaEJ1ZmZlcmVkV3JpdGVzID0gTWV0ZW9yLmJpbmRFbnZpcm9ubWVudChcbiAgICAgIHNlbGYuX2ZsdXNoQnVmZmVyZWRXcml0ZXMsXG4gICAgICAnZmx1c2hpbmcgRERQIGJ1ZmZlcmVkIHdyaXRlcycsXG4gICAgICBzZWxmXG4gICAgKTtcbiAgICAvLyBDb2xsZWN0aW9uIG5hbWUgLT4gYXJyYXkgb2YgbWVzc2FnZXMuXG4gICAgc2VsZi5fYnVmZmVyZWRXcml0ZXMgPSB7fTtcbiAgICAvLyBXaGVuIGN1cnJlbnQgYnVmZmVyIG9mIHVwZGF0ZXMgbXVzdCBiZSBmbHVzaGVkIGF0LCBpbiBtcyB0aW1lc3RhbXAuXG4gICAgc2VsZi5fYnVmZmVyZWRXcml0ZXNGbHVzaEF0ID0gbnVsbDtcbiAgICAvLyBUaW1lb3V0IGhhbmRsZSBmb3IgdGhlIG5leHQgcHJvY2Vzc2luZyBvZiBhbGwgcGVuZGluZyB3cml0ZXNcbiAgICBzZWxmLl9idWZmZXJlZFdyaXRlc0ZsdXNoSGFuZGxlID0gbnVsbDtcblxuICAgIHNlbGYuX2J1ZmZlcmVkV3JpdGVzSW50ZXJ2YWwgPSBvcHRpb25zLmJ1ZmZlcmVkV3JpdGVzSW50ZXJ2YWw7XG4gICAgc2VsZi5fYnVmZmVyZWRXcml0ZXNNYXhBZ2UgPSBvcHRpb25zLmJ1ZmZlcmVkV3JpdGVzTWF4QWdlO1xuXG4gICAgLy8gbWV0YWRhdGEgZm9yIHN1YnNjcmlwdGlvbnMuICBNYXAgZnJvbSBzdWIgSUQgdG8gb2JqZWN0IHdpdGgga2V5czpcbiAgICAvLyAgIC0gaWRcbiAgICAvLyAgIC0gbmFtZVxuICAgIC8vICAgLSBwYXJhbXNcbiAgICAvLyAgIC0gaW5hY3RpdmUgKGlmIHRydWUsIHdpbGwgYmUgY2xlYW5lZCB1cCBpZiBub3QgcmV1c2VkIGluIHJlLXJ1bilcbiAgICAvLyAgIC0gcmVhZHkgKGhhcyB0aGUgJ3JlYWR5JyBtZXNzYWdlIGJlZW4gcmVjZWl2ZWQ/KVxuICAgIC8vICAgLSByZWFkeUNhbGxiYWNrIChhbiBvcHRpb25hbCBjYWxsYmFjayB0byBjYWxsIHdoZW4gcmVhZHkpXG4gICAgLy8gICAtIGVycm9yQ2FsbGJhY2sgKGFuIG9wdGlvbmFsIGNhbGxiYWNrIHRvIGNhbGwgaWYgdGhlIHN1YiB0ZXJtaW5hdGVzIHdpdGhcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgYW4gZXJyb3IsIFhYWCBDT01QQVQgV0lUSCAxLjAuMy4xKVxuICAgIC8vICAgLSBzdG9wQ2FsbGJhY2sgKGFuIG9wdGlvbmFsIGNhbGxiYWNrIHRvIGNhbGwgd2hlbiB0aGUgc3ViIHRlcm1pbmF0ZXNcbiAgICAvLyAgICAgZm9yIGFueSByZWFzb24sIHdpdGggYW4gZXJyb3IgYXJndW1lbnQgaWYgYW4gZXJyb3IgdHJpZ2dlcmVkIHRoZSBzdG9wKVxuICAgIHNlbGYuX3N1YnNjcmlwdGlvbnMgPSB7fTtcblxuICAgIC8vIFJlYWN0aXZlIHVzZXJJZC5cbiAgICBzZWxmLl91c2VySWQgPSBudWxsO1xuICAgIHNlbGYuX3VzZXJJZERlcHMgPSBuZXcgVHJhY2tlci5EZXBlbmRlbmN5KCk7XG5cbiAgICAvLyBCbG9jayBhdXRvLXJlbG9hZCB3aGlsZSB3ZSdyZSB3YWl0aW5nIGZvciBtZXRob2QgcmVzcG9uc2VzLlxuICAgIGlmIChNZXRlb3IuaXNDbGllbnQgJiZcbiAgICAgICAgUGFja2FnZS5yZWxvYWQgJiZcbiAgICAgICAgISBvcHRpb25zLnJlbG9hZFdpdGhPdXRzdGFuZGluZykge1xuICAgICAgUGFja2FnZS5yZWxvYWQuUmVsb2FkLl9vbk1pZ3JhdGUocmV0cnkgPT4ge1xuICAgICAgICBpZiAoISBzZWxmLl9yZWFkeVRvTWlncmF0ZSgpKSB7XG4gICAgICAgICAgc2VsZi5fcmV0cnlNaWdyYXRlID0gcmV0cnk7XG4gICAgICAgICAgcmV0dXJuIFtmYWxzZV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIFt0cnVlXTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgY29uc3Qgb25EaXNjb25uZWN0ID0gKCkgPT4ge1xuICAgICAgaWYgKHNlbGYuX2hlYXJ0YmVhdCkge1xuICAgICAgICBzZWxmLl9oZWFydGJlYXQuc3RvcCgpO1xuICAgICAgICBzZWxmLl9oZWFydGJlYXQgPSBudWxsO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBpZiAoTWV0ZW9yLmlzU2VydmVyKSB7XG4gICAgICBzZWxmLl9zdHJlYW0ub24oXG4gICAgICAgICdtZXNzYWdlJyxcbiAgICAgICAgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudChcbiAgICAgICAgICB0aGlzLm9uTWVzc2FnZS5iaW5kKHRoaXMpLFxuICAgICAgICAgICdoYW5kbGluZyBERFAgbWVzc2FnZSdcbiAgICAgICAgKVxuICAgICAgKTtcbiAgICAgIHNlbGYuX3N0cmVhbS5vbihcbiAgICAgICAgJ3Jlc2V0JyxcbiAgICAgICAgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCh0aGlzLm9uUmVzZXQuYmluZCh0aGlzKSwgJ2hhbmRsaW5nIEREUCByZXNldCcpXG4gICAgICApO1xuICAgICAgc2VsZi5fc3RyZWFtLm9uKFxuICAgICAgICAnZGlzY29ubmVjdCcsXG4gICAgICAgIE1ldGVvci5iaW5kRW52aXJvbm1lbnQob25EaXNjb25uZWN0LCAnaGFuZGxpbmcgRERQIGRpc2Nvbm5lY3QnKVxuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2VsZi5fc3RyZWFtLm9uKCdtZXNzYWdlJywgdGhpcy5vbk1lc3NhZ2UuYmluZCh0aGlzKSk7XG4gICAgICBzZWxmLl9zdHJlYW0ub24oJ3Jlc2V0JywgdGhpcy5vblJlc2V0LmJpbmQodGhpcykpO1xuICAgICAgc2VsZi5fc3RyZWFtLm9uKCdkaXNjb25uZWN0Jywgb25EaXNjb25uZWN0KTtcbiAgICB9XG4gIH1cblxuICAvLyAnbmFtZScgaXMgdGhlIG5hbWUgb2YgdGhlIGRhdGEgb24gdGhlIHdpcmUgdGhhdCBzaG91bGQgZ28gaW4gdGhlXG4gIC8vIHN0b3JlLiAnd3JhcHBlZFN0b3JlJyBzaG91bGQgYmUgYW4gb2JqZWN0IHdpdGggbWV0aG9kcyBiZWdpblVwZGF0ZSwgdXBkYXRlLFxuICAvLyBlbmRVcGRhdGUsIHNhdmVPcmlnaW5hbHMsIHJldHJpZXZlT3JpZ2luYWxzLiBzZWUgQ29sbGVjdGlvbiBmb3IgYW4gZXhhbXBsZS5cbiAgcmVnaXN0ZXJTdG9yZShuYW1lLCB3cmFwcGVkU3RvcmUpIHtcbiAgICBjb25zdCBzZWxmID0gdGhpcztcblxuICAgIGlmIChuYW1lIGluIHNlbGYuX3N0b3JlcykgcmV0dXJuIGZhbHNlO1xuXG4gICAgLy8gV3JhcCB0aGUgaW5wdXQgb2JqZWN0IGluIGFuIG9iamVjdCB3aGljaCBtYWtlcyBhbnkgc3RvcmUgbWV0aG9kIG5vdFxuICAgIC8vIGltcGxlbWVudGVkIGJ5ICdzdG9yZScgaW50byBhIG5vLW9wLlxuICAgIGNvbnN0IHN0b3JlID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICBjb25zdCBrZXlzT2ZTdG9yZSA9IFtcbiAgICAgICd1cGRhdGUnLFxuICAgICAgJ2JlZ2luVXBkYXRlJyxcbiAgICAgICdlbmRVcGRhdGUnLFxuICAgICAgJ3NhdmVPcmlnaW5hbHMnLFxuICAgICAgJ3JldHJpZXZlT3JpZ2luYWxzJyxcbiAgICAgICdnZXREb2MnLFxuICAgICAgJ19nZXRDb2xsZWN0aW9uJ1xuICAgIF07XG4gICAga2V5c09mU3RvcmUuZm9yRWFjaCgobWV0aG9kKSA9PiB7XG4gICAgICBzdG9yZVttZXRob2RdID0gKC4uLmFyZ3MpID0+IHtcbiAgICAgICAgaWYgKHdyYXBwZWRTdG9yZVttZXRob2RdKSB7XG4gICAgICAgICAgcmV0dXJuIHdyYXBwZWRTdG9yZVttZXRob2RdKC4uLmFyZ3MpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH0pO1xuICAgIHNlbGYuX3N0b3Jlc1tuYW1lXSA9IHN0b3JlO1xuXG4gICAgY29uc3QgcXVldWVkID0gc2VsZi5fdXBkYXRlc0ZvclVua25vd25TdG9yZXNbbmFtZV07XG4gICAgaWYgKEFycmF5LmlzQXJyYXkocXVldWVkKSkge1xuICAgICAgc3RvcmUuYmVnaW5VcGRhdGUocXVldWVkLmxlbmd0aCwgZmFsc2UpO1xuICAgICAgcXVldWVkLmZvckVhY2gobXNnID0+IHtcbiAgICAgICAgc3RvcmUudXBkYXRlKG1zZyk7XG4gICAgICB9KTtcbiAgICAgIHN0b3JlLmVuZFVwZGF0ZSgpO1xuICAgICAgZGVsZXRlIHNlbGYuX3VwZGF0ZXNGb3JVbmtub3duU3RvcmVzW25hbWVdO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIEBtZW1iZXJPZiBNZXRlb3JcbiAgICogQGltcG9ydEZyb21QYWNrYWdlIG1ldGVvclxuICAgKiBAYWxpYXMgTWV0ZW9yLnN1YnNjcmliZVxuICAgKiBAc3VtbWFyeSBTdWJzY3JpYmUgdG8gYSByZWNvcmQgc2V0LiAgUmV0dXJucyBhIGhhbmRsZSB0aGF0IHByb3ZpZGVzXG4gICAqIGBzdG9wKClgIGFuZCBgcmVhZHkoKWAgbWV0aG9kcy5cbiAgICogQGxvY3VzIENsaWVudFxuICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBOYW1lIG9mIHRoZSBzdWJzY3JpcHRpb24uICBNYXRjaGVzIHRoZSBuYW1lIG9mIHRoZVxuICAgKiBzZXJ2ZXIncyBgcHVibGlzaCgpYCBjYWxsLlxuICAgKiBAcGFyYW0ge0VKU09OYWJsZX0gW2FyZzEsYXJnMi4uLl0gT3B0aW9uYWwgYXJndW1lbnRzIHBhc3NlZCB0byBwdWJsaXNoZXJcbiAgICogZnVuY3Rpb24gb24gc2VydmVyLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufE9iamVjdH0gW2NhbGxiYWNrc10gT3B0aW9uYWwuIE1heSBpbmNsdWRlIGBvblN0b3BgXG4gICAqIGFuZCBgb25SZWFkeWAgY2FsbGJhY2tzLiBJZiB0aGVyZSBpcyBhbiBlcnJvciwgaXQgaXMgcGFzc2VkIGFzIGFuXG4gICAqIGFyZ3VtZW50IHRvIGBvblN0b3BgLiBJZiBhIGZ1bmN0aW9uIGlzIHBhc3NlZCBpbnN0ZWFkIG9mIGFuIG9iamVjdCwgaXRcbiAgICogaXMgaW50ZXJwcmV0ZWQgYXMgYW4gYG9uUmVhZHlgIGNhbGxiYWNrLlxuICAgKi9cbiAgc3Vic2NyaWJlKG5hbWUgLyogLi4gW2FyZ3VtZW50c10gLi4gKGNhbGxiYWNrfGNhbGxiYWNrcykgKi8pIHtcbiAgICBjb25zdCBzZWxmID0gdGhpcztcblxuICAgIGNvbnN0IHBhcmFtcyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICBsZXQgY2FsbGJhY2tzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICBpZiAocGFyYW1zLmxlbmd0aCkge1xuICAgICAgY29uc3QgbGFzdFBhcmFtID0gcGFyYW1zW3BhcmFtcy5sZW5ndGggLSAxXTtcbiAgICAgIGlmICh0eXBlb2YgbGFzdFBhcmFtID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGNhbGxiYWNrcy5vblJlYWR5ID0gcGFyYW1zLnBvcCgpO1xuICAgICAgfSBlbHNlIGlmIChsYXN0UGFyYW0gJiYgW1xuICAgICAgICBsYXN0UGFyYW0ub25SZWFkeSxcbiAgICAgICAgLy8gWFhYIENPTVBBVCBXSVRIIDEuMC4zLjEgb25FcnJvciB1c2VkIHRvIGV4aXN0LCBidXQgbm93IHdlIHVzZVxuICAgICAgICAvLyBvblN0b3Agd2l0aCBhbiBlcnJvciBjYWxsYmFjayBpbnN0ZWFkLlxuICAgICAgICBsYXN0UGFyYW0ub25FcnJvcixcbiAgICAgICAgbGFzdFBhcmFtLm9uU3RvcFxuICAgICAgXS5zb21lKGYgPT4gdHlwZW9mIGYgPT09IFwiZnVuY3Rpb25cIikpIHtcbiAgICAgICAgY2FsbGJhY2tzID0gcGFyYW1zLnBvcCgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIElzIHRoZXJlIGFuIGV4aXN0aW5nIHN1YiB3aXRoIHRoZSBzYW1lIG5hbWUgYW5kIHBhcmFtLCBydW4gaW4gYW5cbiAgICAvLyBpbnZhbGlkYXRlZCBDb21wdXRhdGlvbj8gVGhpcyB3aWxsIGhhcHBlbiBpZiB3ZSBhcmUgcmVydW5uaW5nIGFuXG4gICAgLy8gZXhpc3RpbmcgY29tcHV0YXRpb24uXG4gICAgLy9cbiAgICAvLyBGb3IgZXhhbXBsZSwgY29uc2lkZXIgYSByZXJ1biBvZjpcbiAgICAvL1xuICAgIC8vICAgICBUcmFja2VyLmF1dG9ydW4oZnVuY3Rpb24gKCkge1xuICAgIC8vICAgICAgIE1ldGVvci5zdWJzY3JpYmUoXCJmb29cIiwgU2Vzc2lvbi5nZXQoXCJmb29cIikpO1xuICAgIC8vICAgICAgIE1ldGVvci5zdWJzY3JpYmUoXCJiYXJcIiwgU2Vzc2lvbi5nZXQoXCJiYXJcIikpO1xuICAgIC8vICAgICB9KTtcbiAgICAvL1xuICAgIC8vIElmIFwiZm9vXCIgaGFzIGNoYW5nZWQgYnV0IFwiYmFyXCIgaGFzIG5vdCwgd2Ugd2lsbCBtYXRjaCB0aGUgXCJiYXJcIlxuICAgIC8vIHN1YmNyaWJlIHRvIGFuIGV4aXN0aW5nIGluYWN0aXZlIHN1YnNjcmlwdGlvbiBpbiBvcmRlciB0byBub3RcbiAgICAvLyB1bnN1YiBhbmQgcmVzdWIgdGhlIHN1YnNjcmlwdGlvbiB1bm5lY2Vzc2FyaWx5LlxuICAgIC8vXG4gICAgLy8gV2Ugb25seSBsb29rIGZvciBvbmUgc3VjaCBzdWI7IGlmIHRoZXJlIGFyZSBOIGFwcGFyZW50bHktaWRlbnRpY2FsIHN1YnNcbiAgICAvLyBiZWluZyBpbnZhbGlkYXRlZCwgd2Ugd2lsbCByZXF1aXJlIE4gbWF0Y2hpbmcgc3Vic2NyaWJlIGNhbGxzIHRvIGtlZXBcbiAgICAvLyB0aGVtIGFsbCBhY3RpdmUuXG4gICAgY29uc3QgZXhpc3RpbmcgPSBPYmplY3QudmFsdWVzKHNlbGYuX3N1YnNjcmlwdGlvbnMpLmZpbmQoXG4gICAgICBzdWIgPT4gKHN1Yi5pbmFjdGl2ZSAmJiBzdWIubmFtZSA9PT0gbmFtZSAmJiBFSlNPTi5lcXVhbHMoc3ViLnBhcmFtcywgcGFyYW1zKSlcbiAgICApO1xuXG4gICAgbGV0IGlkO1xuICAgIGlmIChleGlzdGluZykge1xuICAgICAgaWQgPSBleGlzdGluZy5pZDtcbiAgICAgIGV4aXN0aW5nLmluYWN0aXZlID0gZmFsc2U7IC8vIHJlYWN0aXZhdGVcblxuICAgICAgaWYgKGNhbGxiYWNrcy5vblJlYWR5KSB7XG4gICAgICAgIC8vIElmIHRoZSBzdWIgaXMgbm90IGFscmVhZHkgcmVhZHksIHJlcGxhY2UgYW55IHJlYWR5IGNhbGxiYWNrIHdpdGggdGhlXG4gICAgICAgIC8vIG9uZSBwcm92aWRlZCBub3cuIChJdCdzIG5vdCByZWFsbHkgY2xlYXIgd2hhdCB1c2VycyB3b3VsZCBleHBlY3QgZm9yXG4gICAgICAgIC8vIGFuIG9uUmVhZHkgY2FsbGJhY2sgaW5zaWRlIGFuIGF1dG9ydW47IHRoZSBzZW1hbnRpY3Mgd2UgcHJvdmlkZSBpc1xuICAgICAgICAvLyB0aGF0IGF0IHRoZSB0aW1lIHRoZSBzdWIgZmlyc3QgYmVjb21lcyByZWFkeSwgd2UgY2FsbCB0aGUgbGFzdFxuICAgICAgICAvLyBvblJlYWR5IGNhbGxiYWNrIHByb3ZpZGVkLCBpZiBhbnkuKVxuICAgICAgICAvLyBJZiB0aGUgc3ViIGlzIGFscmVhZHkgcmVhZHksIHJ1biB0aGUgcmVhZHkgY2FsbGJhY2sgcmlnaHQgYXdheS5cbiAgICAgICAgLy8gSXQgc2VlbXMgdGhhdCB1c2VycyB3b3VsZCBleHBlY3QgYW4gb25SZWFkeSBjYWxsYmFjayBpbnNpZGUgYW5cbiAgICAgICAgLy8gYXV0b3J1biB0byB0cmlnZ2VyIG9uY2UgdGhlIHRoZSBzdWIgZmlyc3QgYmVjb21lcyByZWFkeSBhbmQgYWxzb1xuICAgICAgICAvLyB3aGVuIHJlLXN1YnMgaGFwcGVucy5cbiAgICAgICAgaWYgKGV4aXN0aW5nLnJlYWR5KSB7XG4gICAgICAgICAgY2FsbGJhY2tzLm9uUmVhZHkoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBleGlzdGluZy5yZWFkeUNhbGxiYWNrID0gY2FsbGJhY2tzLm9uUmVhZHk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gWFhYIENPTVBBVCBXSVRIIDEuMC4zLjEgd2UgdXNlZCB0byBoYXZlIG9uRXJyb3IgYnV0IG5vdyB3ZSBjYWxsXG4gICAgICAvLyBvblN0b3Agd2l0aCBhbiBvcHRpb25hbCBlcnJvciBhcmd1bWVudFxuICAgICAgaWYgKGNhbGxiYWNrcy5vbkVycm9yKSB7XG4gICAgICAgIC8vIFJlcGxhY2UgZXhpc3RpbmcgY2FsbGJhY2sgaWYgYW55LCBzbyB0aGF0IGVycm9ycyBhcmVuJ3RcbiAgICAgICAgLy8gZG91YmxlLXJlcG9ydGVkLlxuICAgICAgICBleGlzdGluZy5lcnJvckNhbGxiYWNrID0gY2FsbGJhY2tzLm9uRXJyb3I7XG4gICAgICB9XG5cbiAgICAgIGlmIChjYWxsYmFja3Mub25TdG9wKSB7XG4gICAgICAgIGV4aXN0aW5nLnN0b3BDYWxsYmFjayA9IGNhbGxiYWNrcy5vblN0b3A7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIE5ldyBzdWIhIEdlbmVyYXRlIGFuIGlkLCBzYXZlIGl0IGxvY2FsbHksIGFuZCBzZW5kIG1lc3NhZ2UuXG4gICAgICBpZCA9IFJhbmRvbS5pZCgpO1xuICAgICAgc2VsZi5fc3Vic2NyaXB0aW9uc1tpZF0gPSB7XG4gICAgICAgIGlkOiBpZCxcbiAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgcGFyYW1zOiBFSlNPTi5jbG9uZShwYXJhbXMpLFxuICAgICAgICBpbmFjdGl2ZTogZmFsc2UsXG4gICAgICAgIHJlYWR5OiBmYWxzZSxcbiAgICAgICAgcmVhZHlEZXBzOiBuZXcgVHJhY2tlci5EZXBlbmRlbmN5KCksXG4gICAgICAgIHJlYWR5Q2FsbGJhY2s6IGNhbGxiYWNrcy5vblJlYWR5LFxuICAgICAgICAvLyBYWFggQ09NUEFUIFdJVEggMS4wLjMuMSAjZXJyb3JDYWxsYmFja1xuICAgICAgICBlcnJvckNhbGxiYWNrOiBjYWxsYmFja3Mub25FcnJvcixcbiAgICAgICAgc3RvcENhbGxiYWNrOiBjYWxsYmFja3Mub25TdG9wLFxuICAgICAgICBjb25uZWN0aW9uOiBzZWxmLFxuICAgICAgICByZW1vdmUoKSB7XG4gICAgICAgICAgZGVsZXRlIHRoaXMuY29ubmVjdGlvbi5fc3Vic2NyaXB0aW9uc1t0aGlzLmlkXTtcbiAgICAgICAgICB0aGlzLnJlYWR5ICYmIHRoaXMucmVhZHlEZXBzLmNoYW5nZWQoKTtcbiAgICAgICAgfSxcbiAgICAgICAgc3RvcCgpIHtcbiAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24uX3NlbmQoeyBtc2c6ICd1bnN1YicsIGlkOiBpZCB9KTtcbiAgICAgICAgICB0aGlzLnJlbW92ZSgpO1xuXG4gICAgICAgICAgaWYgKGNhbGxiYWNrcy5vblN0b3ApIHtcbiAgICAgICAgICAgIGNhbGxiYWNrcy5vblN0b3AoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICBzZWxmLl9zZW5kKHsgbXNnOiAnc3ViJywgaWQ6IGlkLCBuYW1lOiBuYW1lLCBwYXJhbXM6IHBhcmFtcyB9KTtcbiAgICB9XG5cbiAgICAvLyByZXR1cm4gYSBoYW5kbGUgdG8gdGhlIGFwcGxpY2F0aW9uLlxuICAgIGNvbnN0IGhhbmRsZSA9IHtcbiAgICAgIHN0b3AoKSB7XG4gICAgICAgIGlmICghIGhhc093bi5jYWxsKHNlbGYuX3N1YnNjcmlwdGlvbnMsIGlkKSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBzZWxmLl9zdWJzY3JpcHRpb25zW2lkXS5zdG9wKCk7XG4gICAgICB9LFxuICAgICAgcmVhZHkoKSB7XG4gICAgICAgIC8vIHJldHVybiBmYWxzZSBpZiB3ZSd2ZSB1bnN1YnNjcmliZWQuXG4gICAgICAgIGlmICghaGFzT3duLmNhbGwoc2VsZi5fc3Vic2NyaXB0aW9ucywgaWQpKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlY29yZCA9IHNlbGYuX3N1YnNjcmlwdGlvbnNbaWRdO1xuICAgICAgICByZWNvcmQucmVhZHlEZXBzLmRlcGVuZCgpO1xuICAgICAgICByZXR1cm4gcmVjb3JkLnJlYWR5O1xuICAgICAgfSxcbiAgICAgIHN1YnNjcmlwdGlvbklkOiBpZFxuICAgIH07XG5cbiAgICBpZiAoVHJhY2tlci5hY3RpdmUpIHtcbiAgICAgIC8vIFdlJ3JlIGluIGEgcmVhY3RpdmUgY29tcHV0YXRpb24sIHNvIHdlJ2QgbGlrZSB0byB1bnN1YnNjcmliZSB3aGVuIHRoZVxuICAgICAgLy8gY29tcHV0YXRpb24gaXMgaW52YWxpZGF0ZWQuLi4gYnV0IG5vdCBpZiB0aGUgcmVydW4ganVzdCByZS1zdWJzY3JpYmVzXG4gICAgICAvLyB0byB0aGUgc2FtZSBzdWJzY3JpcHRpb24hICBXaGVuIGEgcmVydW4gaGFwcGVucywgd2UgdXNlIG9uSW52YWxpZGF0ZVxuICAgICAgLy8gYXMgYSBjaGFuZ2UgdG8gbWFyayB0aGUgc3Vic2NyaXB0aW9uIFwiaW5hY3RpdmVcIiBzbyB0aGF0IGl0IGNhblxuICAgICAgLy8gYmUgcmV1c2VkIGZyb20gdGhlIHJlcnVuLiAgSWYgaXQgaXNuJ3QgcmV1c2VkLCBpdCdzIGtpbGxlZCBmcm9tXG4gICAgICAvLyBhbiBhZnRlckZsdXNoLlxuICAgICAgVHJhY2tlci5vbkludmFsaWRhdGUoKGMpID0+IHtcbiAgICAgICAgaWYgKGhhc093bi5jYWxsKHNlbGYuX3N1YnNjcmlwdGlvbnMsIGlkKSkge1xuICAgICAgICAgIHNlbGYuX3N1YnNjcmlwdGlvbnNbaWRdLmluYWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIFRyYWNrZXIuYWZ0ZXJGbHVzaCgoKSA9PiB7XG4gICAgICAgICAgaWYgKGhhc093bi5jYWxsKHNlbGYuX3N1YnNjcmlwdGlvbnMsIGlkKSAmJlxuICAgICAgICAgICAgICBzZWxmLl9zdWJzY3JpcHRpb25zW2lkXS5pbmFjdGl2ZSkge1xuICAgICAgICAgICAgaGFuZGxlLnN0b3AoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGhhbmRsZTtcbiAgfVxuXG4gIC8vIG9wdGlvbnM6XG4gIC8vIC0gb25MYXRlRXJyb3Ige0Z1bmN0aW9uKGVycm9yKX0gY2FsbGVkIGlmIGFuIGVycm9yIHdhcyByZWNlaXZlZCBhZnRlciB0aGUgcmVhZHkgZXZlbnQuXG4gIC8vICAgICAoZXJyb3JzIHJlY2VpdmVkIGJlZm9yZSByZWFkeSBjYXVzZSBhbiBlcnJvciB0byBiZSB0aHJvd24pXG4gIF9zdWJzY3JpYmVBbmRXYWl0KG5hbWUsIGFyZ3MsIG9wdGlvbnMpIHtcbiAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICBjb25zdCBmID0gbmV3IEZ1dHVyZSgpO1xuICAgIGxldCByZWFkeSA9IGZhbHNlO1xuICAgIGFyZ3MgPSBhcmdzIHx8IFtdO1xuICAgIGFyZ3MucHVzaCh7XG4gICAgICBvblJlYWR5KCkge1xuICAgICAgICByZWFkeSA9IHRydWU7XG4gICAgICAgIGZbJ3JldHVybiddKCk7XG4gICAgICB9LFxuICAgICAgb25FcnJvcihlKSB7XG4gICAgICAgIGlmICghcmVhZHkpIGZbJ3Rocm93J10oZSk7XG4gICAgICAgIGVsc2Ugb3B0aW9ucyAmJiBvcHRpb25zLm9uTGF0ZUVycm9yICYmIG9wdGlvbnMub25MYXRlRXJyb3IoZSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBjb25zdCBoYW5kbGUgPSBzZWxmLnN1YnNjcmliZS5hcHBseShzZWxmLCBbbmFtZV0uY29uY2F0KGFyZ3MpKTtcbiAgICBmLndhaXQoKTtcbiAgICByZXR1cm4gaGFuZGxlO1xuICB9XG5cbiAgbWV0aG9kcyhtZXRob2RzKSB7XG4gICAgT2JqZWN0LmVudHJpZXMobWV0aG9kcykuZm9yRWFjaCgoW25hbWUsIGZ1bmNdKSA9PiB7XG4gICAgICBpZiAodHlwZW9mIGZ1bmMgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWV0aG9kICdcIiArIG5hbWUgKyBcIicgbXVzdCBiZSBhIGZ1bmN0aW9uXCIpO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMuX21ldGhvZEhhbmRsZXJzW25hbWVdKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkEgbWV0aG9kIG5hbWVkICdcIiArIG5hbWUgKyBcIicgaXMgYWxyZWFkeSBkZWZpbmVkXCIpO1xuICAgICAgfVxuICAgICAgdGhpcy5fbWV0aG9kSGFuZGxlcnNbbmFtZV0gPSBmdW5jO1xuICAgIH0pO1xuICB9XG5cbiAgX2dldElzU2ltdWxhdGlvbih7aXNGcm9tQ2FsbEFzeW5jLCBhbHJlYWR5SW5TaW11bGF0aW9ufSkge1xuICAgIGlmICghaXNGcm9tQ2FsbEFzeW5jKSB7XG4gICAgICByZXR1cm4gYWxyZWFkeUluU2ltdWxhdGlvbjtcbiAgICB9XG4gICAgcmV0dXJuIGFscmVhZHlJblNpbXVsYXRpb24gJiYgRERQLl9DdXJyZW50TWV0aG9kSW52b2NhdGlvbi5faXNDYWxsQXN5bmNNZXRob2RSdW5uaW5nKCk7XG4gIH1cblxuICAvKipcbiAgICogQG1lbWJlck9mIE1ldGVvclxuICAgKiBAaW1wb3J0RnJvbVBhY2thZ2UgbWV0ZW9yXG4gICAqIEBhbGlhcyBNZXRlb3IuY2FsbFxuICAgKiBAc3VtbWFyeSBJbnZva2VzIGEgbWV0aG9kIHdpdGggYSBzeW5jIHN0dWIsIHBhc3NpbmcgYW55IG51bWJlciBvZiBhcmd1bWVudHMuXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBOYW1lIG9mIG1ldGhvZCB0byBpbnZva2VcbiAgICogQHBhcmFtIHtFSlNPTmFibGV9IFthcmcxLGFyZzIuLi5dIE9wdGlvbmFsIG1ldGhvZCBhcmd1bWVudHNcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2FzeW5jQ2FsbGJhY2tdIE9wdGlvbmFsIGNhbGxiYWNrLCB3aGljaCBpcyBjYWxsZWQgYXN5bmNocm9ub3VzbHkgd2l0aCB0aGUgZXJyb3Igb3IgcmVzdWx0IGFmdGVyIHRoZSBtZXRob2QgaXMgY29tcGxldGUuIElmIG5vdCBwcm92aWRlZCwgdGhlIG1ldGhvZCBydW5zIHN5bmNocm9ub3VzbHkgaWYgcG9zc2libGUgKHNlZSBiZWxvdykuXG4gICAqL1xuICBjYWxsKG5hbWUgLyogLi4gW2FyZ3VtZW50c10gLi4gY2FsbGJhY2sgKi8pIHtcbiAgICAvLyBpZiBpdCdzIGEgZnVuY3Rpb24sIHRoZSBsYXN0IGFyZ3VtZW50IGlzIHRoZSByZXN1bHQgY2FsbGJhY2ssXG4gICAgLy8gbm90IGEgcGFyYW1ldGVyIHRvIHRoZSByZW1vdGUgbWV0aG9kLlxuICAgIGNvbnN0IGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgbGV0IGNhbGxiYWNrO1xuICAgIGlmIChhcmdzLmxlbmd0aCAmJiB0eXBlb2YgYXJnc1thcmdzLmxlbmd0aCAtIDFdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBjYWxsYmFjayA9IGFyZ3MucG9wKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmFwcGx5KG5hbWUsIGFyZ3MsIGNhbGxiYWNrKTtcbiAgfVxuICAvKipcbiAgICogQG1lbWJlck9mIE1ldGVvclxuICAgKiBAaW1wb3J0RnJvbVBhY2thZ2UgbWV0ZW9yXG4gICAqIEBhbGlhcyBNZXRlb3IuY2FsbEFzeW5jXG4gICAqIEBzdW1tYXJ5IEludm9rZXMgYSBtZXRob2Qgd2l0aCBhbiBhc3luYyBzdHViLCBwYXNzaW5nIGFueSBudW1iZXIgb2YgYXJndW1lbnRzLlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgTmFtZSBvZiBtZXRob2QgdG8gaW52b2tlXG4gICAqIEBwYXJhbSB7RUpTT05hYmxlfSBbYXJnMSxhcmcyLi4uXSBPcHRpb25hbCBtZXRob2QgYXJndW1lbnRzXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgKi9cbiAgYXN5bmMgY2FsbEFzeW5jKG5hbWUgLyogLi4gW2FyZ3VtZW50c10gLi4gKi8pIHtcbiAgICBjb25zdCBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgIGlmIChhcmdzLmxlbmd0aCAmJiB0eXBlb2YgYXJnc1thcmdzLmxlbmd0aCAtIDFdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIFwiTWV0ZW9yLmNhbGxBc3luYygpIGRvZXMgbm90IGFjY2VwdCBhIGNhbGxiYWNrLiBZb3Ugc2hvdWxkICdhd2FpdCcgdGhlIHJlc3VsdCwgb3IgdXNlIC50aGVuKCkuXCJcbiAgICAgICk7XG4gICAgfVxuICAgIC8qXG4gICAgKiBUaGlzIGlzIG5lY2Vzc2FyeSBiZWNhdXNlIHdoZW4geW91IGNhbGwgYSBQcm9taXNlLnRoZW4sIHlvdSdyZSBhY3R1YWxseSBjYWxsaW5nIGEgYm91bmQgZnVuY3Rpb24gYnkgTWV0ZW9yLlxuICAgICpcbiAgICAqIFRoaXMgaXMgZG9uZSBieSB0aGlzIGNvZGUgaHR0cHM6Ly9naXRodWIuY29tL21ldGVvci9tZXRlb3IvYmxvYi8xNzY3M2M2Njg3OGQzZjdiMWQ1NjRhNDIxNWViMDYzM2ZhNjc5MDE3L25wbS1wYWNrYWdlcy9tZXRlb3ItcHJvbWlzZS9wcm9taXNlX2NsaWVudC5qcyNMMS1MMTYuIChBbGwgdGhlIGxvZ2ljIGJlbG93IGNhbiBiZSByZW1vdmVkIGluIHRoZSBmdXR1cmUsIHdoZW4gd2Ugc3RvcCBvdmVyd3JpdGluZyB0aGVcbiAgICAqIFByb21pc2UuKVxuICAgICpcbiAgICAqIFdoZW4geW91IGNhbGwgYSBcIi50aGVuKClcIiwgbGlrZSBcIk1ldGVvci5jYWxsQXN5bmMoKS50aGVuKClcIiwgdGhlIGdsb2JhbCBjb250ZXh0IChpbnNpZGUgY3VycmVudFZhbHVlcylcbiAgICAqIHdpbGwgYmUgZnJvbSB0aGUgY2FsbCBvZiBNZXRlb3IuY2FsbEFzeW5jKCksIGFuZCBub3QgdGhlIGNvbnRleHQgYWZ0ZXIgdGhlIHByb21pc2UgaXMgZG9uZS5cbiAgICAqXG4gICAgKiBUaGlzIG1lYW5zIHRoYXQgd2l0aG91dCB0aGlzIGNvZGUgaWYgeW91IGNhbGwgYSBzdHViIGluc2lkZSB0aGUgXCIudGhlbigpXCIsIHRoaXMgc3R1YiB3aWxsIGFjdCBhcyBhIHNpbXVsYXRpb25cbiAgICAqIGFuZCB3b24ndCByZWFjaCB0aGUgc2VydmVyLlxuICAgICpcbiAgICAqIEluc2lkZSB0aGUgZnVuY3Rpb24gX2dldElzU2ltdWxhdGlvbigpLCBpZiBpc0Zyb21DYWxsQXN5bmMgaXMgZmFsc2UsIHdlIGNvbnRpbnVlIHRvIGNvbnNpZGVyIGp1c3QgdGhlXG4gICAgKiBhbHJlYWR5SW5TaW11bGF0aW9uLCBvdGhlcndpc2UsIGlzRnJvbUNhbGxBc3luYyBpcyB0cnVlLCB3ZSBhbHNvIGNoZWNrIHRoZSB2YWx1ZSBvZiBjYWxsQXN5bmNNZXRob2RSdW5uaW5nIChieVxuICAgICogY2FsbGluZyBERFAuX0N1cnJlbnRNZXRob2RJbnZvY2F0aW9uLl9pc0NhbGxBc3luY01ldGhvZFJ1bm5pbmcoKSkuXG4gICAgKlxuICAgICogV2l0aCB0aGlzLCBpZiBhIHN0dWIgaXMgcnVubmluZyBpbnNpZGUgYSBcIi50aGVuKClcIiwgaXQnbGwga25vdyBpdCdzIG5vdCBhIHNpbXVsYXRpb24sIGJlY2F1c2UgY2FsbEFzeW5jTWV0aG9kUnVubmluZ1xuICAgICogd2lsbCBiZSBmYWxzZS5cbiAgICAqXG4gICAgKiBERFAuX0N1cnJlbnRNZXRob2RJbnZvY2F0aW9uLl9zZXQoKSBpcyBpbXBvcnRhbnQgYmVjYXVzZSB3aXRob3V0IGl0LCBpZiB5b3UgaGF2ZSBhIGNvZGUgbGlrZTpcbiAgICAqXG4gICAgKiBNZXRlb3IuY2FsbEFzeW5jKFwibTFcIikudGhlbigoKSA9PiB7XG4gICAgKiAgIE1ldGVvci5jYWxsQXN5bmMoXCJtMlwiKVxuICAgICogfSlcbiAgICAqXG4gICAgKiBUaGUgY2FsbCB0aGUgbWV0aG9kIG0yIHdpbGwgYWN0IGFzIGEgc2ltdWxhdGlvbiBhbmQgd29uJ3QgcmVhY2ggdGhlIHNlcnZlci4gVGhhdCdzIHdoeSB3ZSByZXNldCB0aGUgY29udGV4dCBoZXJlXG4gICAgKiBiZWZvcmUgY2FsbGluZyBldmVyeXRoaW5nIGVsc2UuXG4gICAgKlxuICAgICogKi9cbiAgICBERFAuX0N1cnJlbnRNZXRob2RJbnZvY2F0aW9uLl9zZXQoKTtcbiAgICBERFAuX0N1cnJlbnRNZXRob2RJbnZvY2F0aW9uLl9zZXRDYWxsQXN5bmNNZXRob2RSdW5uaW5nKHRydWUpO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB0aGlzLmFwcGx5QXN5bmMobmFtZSwgYXJncywgeyBpc0Zyb21DYWxsQXN5bmM6IHRydWUgfSwgKGVyciwgcmVzdWx0KSA9PiB7XG4gICAgICAgIEREUC5fQ3VycmVudE1ldGhvZEludm9jYXRpb24uX3NldENhbGxBc3luY01ldGhvZFJ1bm5pbmcoZmFsc2UpO1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHJlc29sdmUocmVzdWx0KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEBtZW1iZXJPZiBNZXRlb3JcbiAgICogQGltcG9ydEZyb21QYWNrYWdlIG1ldGVvclxuICAgKiBAYWxpYXMgTWV0ZW9yLmFwcGx5XG4gICAqIEBzdW1tYXJ5IEludm9rZSBhIG1ldGhvZCBwYXNzaW5nIGFuIGFycmF5IG9mIGFyZ3VtZW50cy5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIE5hbWUgb2YgbWV0aG9kIHRvIGludm9rZVxuICAgKiBAcGFyYW0ge0VKU09OYWJsZVtdfSBhcmdzIE1ldGhvZCBhcmd1bWVudHNcbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXVxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnMud2FpdCAoQ2xpZW50IG9ubHkpIElmIHRydWUsIGRvbid0IHNlbmQgdGhpcyBtZXRob2QgdW50aWwgYWxsIHByZXZpb3VzIG1ldGhvZCBjYWxscyBoYXZlIGNvbXBsZXRlZCwgYW5kIGRvbid0IHNlbmQgYW55IHN1YnNlcXVlbnQgbWV0aG9kIGNhbGxzIHVudGlsIHRoaXMgb25lIGlzIGNvbXBsZXRlZC5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gb3B0aW9ucy5vblJlc3VsdFJlY2VpdmVkIChDbGllbnQgb25seSkgVGhpcyBjYWxsYmFjayBpcyBpbnZva2VkIHdpdGggdGhlIGVycm9yIG9yIHJlc3VsdCBvZiB0aGUgbWV0aG9kIChqdXN0IGxpa2UgYGFzeW5jQ2FsbGJhY2tgKSBhcyBzb29uIGFzIHRoZSBlcnJvciBvciByZXN1bHQgaXMgYXZhaWxhYmxlLiBUaGUgbG9jYWwgY2FjaGUgbWF5IG5vdCB5ZXQgcmVmbGVjdCB0aGUgd3JpdGVzIHBlcmZvcm1lZCBieSB0aGUgbWV0aG9kLlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnMubm9SZXRyeSAoQ2xpZW50IG9ubHkpIGlmIHRydWUsIGRvbid0IHNlbmQgdGhpcyBtZXRob2QgYWdhaW4gb24gcmVsb2FkLCBzaW1wbHkgY2FsbCB0aGUgY2FsbGJhY2sgYW4gZXJyb3Igd2l0aCB0aGUgZXJyb3IgY29kZSAnaW52b2NhdGlvbi1mYWlsZWQnLlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnMudGhyb3dTdHViRXhjZXB0aW9ucyAoQ2xpZW50IG9ubHkpIElmIHRydWUsIGV4Y2VwdGlvbnMgdGhyb3duIGJ5IG1ldGhvZCBzdHVicyB3aWxsIGJlIHRocm93biBpbnN0ZWFkIG9mIGxvZ2dlZCwgYW5kIHRoZSBtZXRob2Qgd2lsbCBub3QgYmUgaW52b2tlZCBvbiB0aGUgc2VydmVyLlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnMucmV0dXJuU3R1YlZhbHVlIChDbGllbnQgb25seSkgSWYgdHJ1ZSB0aGVuIGluIGNhc2VzIHdoZXJlIHdlIHdvdWxkIGhhdmUgb3RoZXJ3aXNlIGRpc2NhcmRlZCB0aGUgc3R1YidzIHJldHVybiB2YWx1ZSBhbmQgcmV0dXJuZWQgdW5kZWZpbmVkLCBpbnN0ZWFkIHdlIGdvIGFoZWFkIGFuZCByZXR1cm4gaXQuIFNwZWNpZmljYWxseSwgdGhpcyBpcyBhbnkgdGltZSBvdGhlciB0aGFuIHdoZW4gKGEpIHdlIGFyZSBhbHJlYWR5IGluc2lkZSBhIHN0dWIgb3IgKGIpIHdlIGFyZSBpbiBOb2RlIGFuZCBubyBjYWxsYmFjayB3YXMgcHJvdmlkZWQuIEN1cnJlbnRseSB3ZSByZXF1aXJlIHRoaXMgZmxhZyB0byBiZSBleHBsaWNpdGx5IHBhc3NlZCB0byByZWR1Y2UgdGhlIGxpa2VsaWhvb2QgdGhhdCBzdHViIHJldHVybiB2YWx1ZXMgd2lsbCBiZSBjb25mdXNlZCB3aXRoIHNlcnZlciByZXR1cm4gdmFsdWVzOyB3ZSBtYXkgaW1wcm92ZSB0aGlzIGluIGZ1dHVyZS5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2FzeW5jQ2FsbGJhY2tdIE9wdGlvbmFsIGNhbGxiYWNrOyBzYW1lIHNlbWFudGljcyBhcyBpbiBbYE1ldGVvci5jYWxsYF0oI21ldGVvcl9jYWxsKS5cbiAgICovXG4gIGFwcGx5KG5hbWUsIGFyZ3MsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgY29uc3QgeyBzdHViSW52b2NhdGlvbiwgaW52b2NhdGlvbiwgLi4uc3R1Yk9wdGlvbnMgfSA9IHRoaXMuX3N0dWJDYWxsKG5hbWUsIEVKU09OLmNsb25lKGFyZ3MpKTtcblxuICAgIGlmIChzdHViT3B0aW9ucy5oYXNTdHViKSB7XG4gICAgICBpZiAoXG4gICAgICAgICF0aGlzLl9nZXRJc1NpbXVsYXRpb24oe1xuICAgICAgICAgIGFscmVhZHlJblNpbXVsYXRpb246IHN0dWJPcHRpb25zLmFscmVhZHlJblNpbXVsYXRpb24sXG4gICAgICAgICAgaXNGcm9tQ2FsbEFzeW5jOiBzdHViT3B0aW9ucy5pc0Zyb21DYWxsQXN5bmMsXG4gICAgICAgIH0pXG4gICAgICApIHtcbiAgICAgICAgdGhpcy5fc2F2ZU9yaWdpbmFscygpO1xuICAgICAgfVxuICAgICAgdHJ5IHtcbiAgICAgICAgc3R1Yk9wdGlvbnMuc3R1YlJldHVyblZhbHVlID0gRERQLl9DdXJyZW50TWV0aG9kSW52b2NhdGlvblxuICAgICAgICAgIC53aXRoVmFsdWUoaW52b2NhdGlvbiwgc3R1Ykludm9jYXRpb24pO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBzdHViT3B0aW9ucy5leGNlcHRpb24gPSBlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fYXBwbHkobmFtZSwgc3R1Yk9wdGlvbnMsIGFyZ3MsIG9wdGlvbnMsIGNhbGxiYWNrKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAbWVtYmVyT2YgTWV0ZW9yXG4gICAqIEBpbXBvcnRGcm9tUGFja2FnZSBtZXRlb3JcbiAgICogQGFsaWFzIE1ldGVvci5hcHBseUFzeW5jXG4gICAqIEBzdW1tYXJ5IEludm9rZSBhIG1ldGhvZCBwYXNzaW5nIGFuIGFycmF5IG9mIGFyZ3VtZW50cy5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIE5hbWUgb2YgbWV0aG9kIHRvIGludm9rZVxuICAgKiBAcGFyYW0ge0VKU09OYWJsZVtdfSBhcmdzIE1ldGhvZCBhcmd1bWVudHNcbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXVxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnMud2FpdCAoQ2xpZW50IG9ubHkpIElmIHRydWUsIGRvbid0IHNlbmQgdGhpcyBtZXRob2QgdW50aWwgYWxsIHByZXZpb3VzIG1ldGhvZCBjYWxscyBoYXZlIGNvbXBsZXRlZCwgYW5kIGRvbid0IHNlbmQgYW55IHN1YnNlcXVlbnQgbWV0aG9kIGNhbGxzIHVudGlsIHRoaXMgb25lIGlzIGNvbXBsZXRlZC5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gb3B0aW9ucy5vblJlc3VsdFJlY2VpdmVkIChDbGllbnQgb25seSkgVGhpcyBjYWxsYmFjayBpcyBpbnZva2VkIHdpdGggdGhlIGVycm9yIG9yIHJlc3VsdCBvZiB0aGUgbWV0aG9kIChqdXN0IGxpa2UgYGFzeW5jQ2FsbGJhY2tgKSBhcyBzb29uIGFzIHRoZSBlcnJvciBvciByZXN1bHQgaXMgYXZhaWxhYmxlLiBUaGUgbG9jYWwgY2FjaGUgbWF5IG5vdCB5ZXQgcmVmbGVjdCB0aGUgd3JpdGVzIHBlcmZvcm1lZCBieSB0aGUgbWV0aG9kLlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnMubm9SZXRyeSAoQ2xpZW50IG9ubHkpIGlmIHRydWUsIGRvbid0IHNlbmQgdGhpcyBtZXRob2QgYWdhaW4gb24gcmVsb2FkLCBzaW1wbHkgY2FsbCB0aGUgY2FsbGJhY2sgYW4gZXJyb3Igd2l0aCB0aGUgZXJyb3IgY29kZSAnaW52b2NhdGlvbi1mYWlsZWQnLlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnMudGhyb3dTdHViRXhjZXB0aW9ucyAoQ2xpZW50IG9ubHkpIElmIHRydWUsIGV4Y2VwdGlvbnMgdGhyb3duIGJ5IG1ldGhvZCBzdHVicyB3aWxsIGJlIHRocm93biBpbnN0ZWFkIG9mIGxvZ2dlZCwgYW5kIHRoZSBtZXRob2Qgd2lsbCBub3QgYmUgaW52b2tlZCBvbiB0aGUgc2VydmVyLlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnMucmV0dXJuU3R1YlZhbHVlIChDbGllbnQgb25seSkgSWYgdHJ1ZSB0aGVuIGluIGNhc2VzIHdoZXJlIHdlIHdvdWxkIGhhdmUgb3RoZXJ3aXNlIGRpc2NhcmRlZCB0aGUgc3R1YidzIHJldHVybiB2YWx1ZSBhbmQgcmV0dXJuZWQgdW5kZWZpbmVkLCBpbnN0ZWFkIHdlIGdvIGFoZWFkIGFuZCByZXR1cm4gaXQuIFNwZWNpZmljYWxseSwgdGhpcyBpcyBhbnkgdGltZSBvdGhlciB0aGFuIHdoZW4gKGEpIHdlIGFyZSBhbHJlYWR5IGluc2lkZSBhIHN0dWIgb3IgKGIpIHdlIGFyZSBpbiBOb2RlIGFuZCBubyBjYWxsYmFjayB3YXMgcHJvdmlkZWQuIEN1cnJlbnRseSB3ZSByZXF1aXJlIHRoaXMgZmxhZyB0byBiZSBleHBsaWNpdGx5IHBhc3NlZCB0byByZWR1Y2UgdGhlIGxpa2VsaWhvb2QgdGhhdCBzdHViIHJldHVybiB2YWx1ZXMgd2lsbCBiZSBjb25mdXNlZCB3aXRoIHNlcnZlciByZXR1cm4gdmFsdWVzOyB3ZSBtYXkgaW1wcm92ZSB0aGlzIGluIGZ1dHVyZS5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2FzeW5jQ2FsbGJhY2tdIE9wdGlvbmFsIGNhbGxiYWNrLlxuICAgKi9cbiAgYXN5bmMgYXBwbHlBc3luYyhuYW1lLCBhcmdzLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIGNvbnN0IHsgc3R1Ykludm9jYXRpb24sIGludm9jYXRpb24sIC4uLnN0dWJPcHRpb25zIH0gPSB0aGlzLl9zdHViQ2FsbChuYW1lLCBFSlNPTi5jbG9uZShhcmdzKSwgb3B0aW9ucyk7XG4gICAgaWYgKHN0dWJPcHRpb25zLmhhc1N0dWIpIHtcbiAgICAgIGlmIChcbiAgICAgICAgIXRoaXMuX2dldElzU2ltdWxhdGlvbih7XG4gICAgICAgICAgYWxyZWFkeUluU2ltdWxhdGlvbjogc3R1Yk9wdGlvbnMuYWxyZWFkeUluU2ltdWxhdGlvbixcbiAgICAgICAgICBpc0Zyb21DYWxsQXN5bmM6IHN0dWJPcHRpb25zLmlzRnJvbUNhbGxBc3luYyxcbiAgICAgICAgfSlcbiAgICAgICkge1xuICAgICAgICB0aGlzLl9zYXZlT3JpZ2luYWxzKCk7XG4gICAgICB9XG4gICAgICB0cnkge1xuICAgICAgICAvKlxuICAgICAgICAgKiBUaGUgY29kZSBiZWxvdyBmb2xsb3dzIHRoZSBzYW1lIGxvZ2ljIGFzIHRoZSBmdW5jdGlvbiB3aXRoVmFsdWVzKCkuXG4gICAgICAgICAqXG4gICAgICAgICAqIEJ1dCBhcyB0aGUgTWV0ZW9yIHBhY2thZ2UgaXMgbm90IGNvbXBpbGVkIGJ5IGVjbWFzY3JpcHQsIGl0IGlzIHVuYWJsZSB0byB1c2UgbmV3ZXIgc3ludGF4IGluIHRoZSBicm93c2VyLFxuICAgICAgICAgKiBzdWNoIGFzLCB0aGUgYXN5bmMvYXdhaXQuXG4gICAgICAgICAqXG4gICAgICAgICAqIFNvLCB0byBrZWVwIHN1cHBvcnRpbmcgb2xkIGJyb3dzZXJzLCBsaWtlIElFIDExLCB3ZSdyZSBjcmVhdGluZyB0aGUgbG9naWMgb25lIGxldmVsIGFib3ZlLlxuICAgICAgICAgKi9cbiAgICAgICAgY29uc3QgY3VycmVudENvbnRleHQgPSBERFAuX0N1cnJlbnRNZXRob2RJbnZvY2F0aW9uLl9zZXROZXdDb250ZXh0QW5kR2V0Q3VycmVudChcbiAgICAgICAgICBpbnZvY2F0aW9uXG4gICAgICAgICk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3QgcmVzdWx0T3JUaGVuYWJsZSA9IHN0dWJJbnZvY2F0aW9uKCk7XG4gICAgICAgICAgY29uc3QgaXNUaGVuYWJsZSA9XG4gICAgICAgICAgICByZXN1bHRPclRoZW5hYmxlICYmIHR5cGVvZiByZXN1bHRPclRoZW5hYmxlLnRoZW4gPT09ICdmdW5jdGlvbic7XG4gICAgICAgICAgaWYgKGlzVGhlbmFibGUpIHtcbiAgICAgICAgICAgIHN0dWJPcHRpb25zLnN0dWJSZXR1cm5WYWx1ZSA9IGF3YWl0IHJlc3VsdE9yVGhlbmFibGU7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHN0dWJPcHRpb25zLnN0dWJSZXR1cm5WYWx1ZSA9IHJlc3VsdE9yVGhlbmFibGU7XG4gICAgICAgICAgfVxuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgIEREUC5fQ3VycmVudE1ldGhvZEludm9jYXRpb24uX3NldChjdXJyZW50Q29udGV4dCk7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgc3R1Yk9wdGlvbnMuZXhjZXB0aW9uID0gZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2FwcGx5KG5hbWUsIHN0dWJPcHRpb25zLCBhcmdzLCBvcHRpb25zLCBjYWxsYmFjayk7XG4gIH1cblxuICBfYXBwbHkobmFtZSwgc3R1YkNhbGxWYWx1ZSwgYXJncywgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICBjb25zdCBzZWxmID0gdGhpcztcblxuICAgIC8vIFdlIHdlcmUgcGFzc2VkIDMgYXJndW1lbnRzLiBUaGV5IG1heSBiZSBlaXRoZXIgKG5hbWUsIGFyZ3MsIG9wdGlvbnMpXG4gICAgLy8gb3IgKG5hbWUsIGFyZ3MsIGNhbGxiYWNrKVxuICAgIGlmICghY2FsbGJhY2sgJiYgdHlwZW9mIG9wdGlvbnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICAgIG9wdGlvbnMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgIH1cbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAvLyBYWFggd291bGQgaXQgYmUgYmV0dGVyIGZvcm0gdG8gZG8gdGhlIGJpbmRpbmcgaW4gc3RyZWFtLm9uLFxuICAgICAgLy8gb3IgY2FsbGVyLCBpbnN0ZWFkIG9mIGhlcmU/XG4gICAgICAvLyBYWFggaW1wcm92ZSBlcnJvciBtZXNzYWdlIChhbmQgaG93IHdlIHJlcG9ydCBpdClcbiAgICAgIGNhbGxiYWNrID0gTWV0ZW9yLmJpbmRFbnZpcm9ubWVudChcbiAgICAgICAgY2FsbGJhY2ssXG4gICAgICAgIFwiZGVsaXZlcmluZyByZXN1bHQgb2YgaW52b2tpbmcgJ1wiICsgbmFtZSArIFwiJ1wiXG4gICAgICApO1xuICAgIH1cblxuICAgIC8vIEtlZXAgb3VyIGFyZ3Mgc2FmZSBmcm9tIG11dGF0aW9uIChlZyBpZiB3ZSBkb24ndCBzZW5kIHRoZSBtZXNzYWdlIGZvciBhXG4gICAgLy8gd2hpbGUgYmVjYXVzZSBvZiBhIHdhaXQgbWV0aG9kKS5cbiAgICBhcmdzID0gRUpTT04uY2xvbmUoYXJncyk7XG5cbiAgICBjb25zdCB7IGhhc1N0dWIsIGV4Y2VwdGlvbiwgc3R1YlJldHVyblZhbHVlLCBhbHJlYWR5SW5TaW11bGF0aW9uLCByYW5kb21TZWVkIH0gPSBzdHViQ2FsbFZhbHVlO1xuXG4gICAgLy8gSWYgd2UncmUgaW4gYSBzaW11bGF0aW9uLCBzdG9wIGFuZCByZXR1cm4gdGhlIHJlc3VsdCB3ZSBoYXZlLFxuICAgIC8vIHJhdGhlciB0aGFuIGdvaW5nIG9uIHRvIGRvIGFuIFJQQy4gSWYgdGhlcmUgd2FzIG5vIHN0dWIsXG4gICAgLy8gd2UnbGwgZW5kIHVwIHJldHVybmluZyB1bmRlZmluZWQuXG4gICAgaWYgKFxuICAgICAgdGhpcy5fZ2V0SXNTaW11bGF0aW9uKHtcbiAgICAgICAgYWxyZWFkeUluU2ltdWxhdGlvbixcbiAgICAgICAgaXNGcm9tQ2FsbEFzeW5jOiBzdHViQ2FsbFZhbHVlLmlzRnJvbUNhbGxBc3luYyxcbiAgICAgIH0pXG4gICAgKSB7XG4gICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2soZXhjZXB0aW9uLCBzdHViUmV0dXJuVmFsdWUpO1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgaWYgKGV4Y2VwdGlvbikgdGhyb3cgZXhjZXB0aW9uO1xuICAgICAgcmV0dXJuIHN0dWJSZXR1cm5WYWx1ZTtcbiAgICB9XG5cbiAgICAvLyBXZSBvbmx5IGNyZWF0ZSB0aGUgbWV0aG9kSWQgaGVyZSBiZWNhdXNlIHdlIGRvbid0IGFjdHVhbGx5IG5lZWQgb25lIGlmXG4gICAgLy8gd2UncmUgYWxyZWFkeSBpbiBhIHNpbXVsYXRpb25cbiAgICBjb25zdCBtZXRob2RJZCA9ICcnICsgc2VsZi5fbmV4dE1ldGhvZElkKys7XG4gICAgaWYgKGhhc1N0dWIpIHtcbiAgICAgIHNlbGYuX3JldHJpZXZlQW5kU3RvcmVPcmlnaW5hbHMobWV0aG9kSWQpO1xuICAgIH1cblxuICAgIC8vIEdlbmVyYXRlIHRoZSBERFAgbWVzc2FnZSBmb3IgdGhlIG1ldGhvZCBjYWxsLiBOb3RlIHRoYXQgb24gdGhlIGNsaWVudCxcbiAgICAvLyBpdCBpcyBpbXBvcnRhbnQgdGhhdCB0aGUgc3R1YiBoYXZlIGZpbmlzaGVkIGJlZm9yZSB3ZSBzZW5kIHRoZSBSUEMsIHNvXG4gICAgLy8gdGhhdCB3ZSBrbm93IHdlIGhhdmUgYSBjb21wbGV0ZSBsaXN0IG9mIHdoaWNoIGxvY2FsIGRvY3VtZW50cyB0aGUgc3R1YlxuICAgIC8vIHdyb3RlLlxuICAgIGNvbnN0IG1lc3NhZ2UgPSB7XG4gICAgICBtc2c6ICdtZXRob2QnLFxuICAgICAgaWQ6IG1ldGhvZElkLFxuICAgICAgbWV0aG9kOiBuYW1lLFxuICAgICAgcGFyYW1zOiBhcmdzXG4gICAgfTtcblxuICAgIC8vIElmIGFuIGV4Y2VwdGlvbiBvY2N1cnJlZCBpbiBhIHN0dWIsIGFuZCB3ZSdyZSBpZ25vcmluZyBpdFxuICAgIC8vIGJlY2F1c2Ugd2UncmUgZG9pbmcgYW4gUlBDIGFuZCB3YW50IHRvIHVzZSB3aGF0IHRoZSBzZXJ2ZXJcbiAgICAvLyByZXR1cm5zIGluc3RlYWQsIGxvZyBpdCBzbyB0aGUgZGV2ZWxvcGVyIGtub3dzXG4gICAgLy8gKHVubGVzcyB0aGV5IGV4cGxpY2l0bHkgYXNrIHRvIHNlZSB0aGUgZXJyb3IpLlxuICAgIC8vXG4gICAgLy8gVGVzdHMgY2FuIHNldCB0aGUgJ19leHBlY3RlZEJ5VGVzdCcgZmxhZyBvbiBhbiBleGNlcHRpb24gc28gaXQgd29uJ3RcbiAgICAvLyBnbyB0byBsb2cuXG4gICAgaWYgKGV4Y2VwdGlvbikge1xuICAgICAgaWYgKG9wdGlvbnMudGhyb3dTdHViRXhjZXB0aW9ucykge1xuICAgICAgICB0aHJvdyBleGNlcHRpb247XG4gICAgICB9IGVsc2UgaWYgKCFleGNlcHRpb24uX2V4cGVjdGVkQnlUZXN0KSB7XG4gICAgICAgIE1ldGVvci5fZGVidWcoXG4gICAgICAgICAgXCJFeGNlcHRpb24gd2hpbGUgc2ltdWxhdGluZyB0aGUgZWZmZWN0IG9mIGludm9raW5nICdcIiArIG5hbWUgKyBcIidcIixcbiAgICAgICAgICBleGNlcHRpb25cbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBBdCB0aGlzIHBvaW50IHdlJ3JlIGRlZmluaXRlbHkgZG9pbmcgYW4gUlBDLCBhbmQgd2UncmUgZ29pbmcgdG9cbiAgICAvLyByZXR1cm4gdGhlIHZhbHVlIG9mIHRoZSBSUEMgdG8gdGhlIGNhbGxlci5cblxuICAgIC8vIElmIHRoZSBjYWxsZXIgZGlkbid0IGdpdmUgYSBjYWxsYmFjaywgZGVjaWRlIHdoYXQgdG8gZG8uXG4gICAgbGV0IGZ1dHVyZTtcbiAgICBpZiAoIWNhbGxiYWNrKSB7XG4gICAgICBpZiAoTWV0ZW9yLmlzQ2xpZW50KSB7XG4gICAgICAgIC8vIE9uIHRoZSBjbGllbnQsIHdlIGRvbid0IGhhdmUgZmliZXJzLCBzbyB3ZSBjYW4ndCBibG9jay4gVGhlXG4gICAgICAgIC8vIG9ubHkgdGhpbmcgd2UgY2FuIGRvIGlzIHRvIHJldHVybiB1bmRlZmluZWQgYW5kIGRpc2NhcmQgdGhlXG4gICAgICAgIC8vIHJlc3VsdCBvZiB0aGUgUlBDLiBJZiBhbiBlcnJvciBvY2N1cnJlZCB0aGVuIHByaW50IHRoZSBlcnJvclxuICAgICAgICAvLyB0byB0aGUgY29uc29sZS5cbiAgICAgICAgY2FsbGJhY2sgPSBlcnIgPT4ge1xuICAgICAgICAgIGVyciAmJiBNZXRlb3IuX2RlYnVnKFwiRXJyb3IgaW52b2tpbmcgTWV0aG9kICdcIiArIG5hbWUgKyBcIidcIiwgZXJyKTtcbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIE9uIHRoZSBzZXJ2ZXIsIG1ha2UgdGhlIGZ1bmN0aW9uIHN5bmNocm9ub3VzLiBUaHJvdyBvblxuICAgICAgICAvLyBlcnJvcnMsIHJldHVybiBvbiBzdWNjZXNzLlxuICAgICAgICBmdXR1cmUgPSBuZXcgRnV0dXJlKCk7XG4gICAgICAgIGNhbGxiYWNrID0gZnV0dXJlLnJlc29sdmVyKCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gU2VuZCB0aGUgcmFuZG9tU2VlZCBvbmx5IGlmIHdlIHVzZWQgaXRcbiAgICBpZiAocmFuZG9tU2VlZC52YWx1ZSAhPT0gbnVsbCkge1xuICAgICAgbWVzc2FnZS5yYW5kb21TZWVkID0gcmFuZG9tU2VlZC52YWx1ZTtcbiAgICB9XG5cbiAgICBjb25zdCBtZXRob2RJbnZva2VyID0gbmV3IE1ldGhvZEludm9rZXIoe1xuICAgICAgbWV0aG9kSWQsXG4gICAgICBjYWxsYmFjazogY2FsbGJhY2ssXG4gICAgICBjb25uZWN0aW9uOiBzZWxmLFxuICAgICAgb25SZXN1bHRSZWNlaXZlZDogb3B0aW9ucy5vblJlc3VsdFJlY2VpdmVkLFxuICAgICAgd2FpdDogISFvcHRpb25zLndhaXQsXG4gICAgICBtZXNzYWdlOiBtZXNzYWdlLFxuICAgICAgbm9SZXRyeTogISFvcHRpb25zLm5vUmV0cnlcbiAgICB9KTtcblxuICAgIGlmIChvcHRpb25zLndhaXQpIHtcbiAgICAgIC8vIEl0J3MgYSB3YWl0IG1ldGhvZCEgV2FpdCBtZXRob2RzIGdvIGluIHRoZWlyIG93biBibG9jay5cbiAgICAgIHNlbGYuX291dHN0YW5kaW5nTWV0aG9kQmxvY2tzLnB1c2goe1xuICAgICAgICB3YWl0OiB0cnVlLFxuICAgICAgICBtZXRob2RzOiBbbWV0aG9kSW52b2tlcl1cbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBOb3QgYSB3YWl0IG1ldGhvZC4gU3RhcnQgYSBuZXcgYmxvY2sgaWYgdGhlIHByZXZpb3VzIGJsb2NrIHdhcyBhIHdhaXRcbiAgICAgIC8vIGJsb2NrLCBhbmQgYWRkIGl0IHRvIHRoZSBsYXN0IGJsb2NrIG9mIG1ldGhvZHMuXG4gICAgICBpZiAoaXNFbXB0eShzZWxmLl9vdXRzdGFuZGluZ01ldGhvZEJsb2NrcykgfHxcbiAgICAgICAgICBsYXN0KHNlbGYuX291dHN0YW5kaW5nTWV0aG9kQmxvY2tzKS53YWl0KSB7XG4gICAgICAgIHNlbGYuX291dHN0YW5kaW5nTWV0aG9kQmxvY2tzLnB1c2goe1xuICAgICAgICAgIHdhaXQ6IGZhbHNlLFxuICAgICAgICAgIG1ldGhvZHM6IFtdLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgbGFzdChzZWxmLl9vdXRzdGFuZGluZ01ldGhvZEJsb2NrcykubWV0aG9kcy5wdXNoKG1ldGhvZEludm9rZXIpO1xuICAgIH1cblxuICAgIC8vIElmIHdlIGFkZGVkIGl0IHRvIHRoZSBmaXJzdCBibG9jaywgc2VuZCBpdCBvdXQgbm93LlxuICAgIGlmIChzZWxmLl9vdXRzdGFuZGluZ01ldGhvZEJsb2Nrcy5sZW5ndGggPT09IDEpIG1ldGhvZEludm9rZXIuc2VuZE1lc3NhZ2UoKTtcblxuICAgIC8vIElmIHdlJ3JlIHVzaW5nIHRoZSBkZWZhdWx0IGNhbGxiYWNrIG9uIHRoZSBzZXJ2ZXIsXG4gICAgLy8gYmxvY2sgd2FpdGluZyBmb3IgdGhlIHJlc3VsdC5cbiAgICBpZiAoZnV0dXJlKSB7XG4gICAgICByZXR1cm4gZnV0dXJlLndhaXQoKTtcbiAgICB9XG4gICAgcmV0dXJuIG9wdGlvbnMucmV0dXJuU3R1YlZhbHVlID8gc3R1YlJldHVyblZhbHVlIDogdW5kZWZpbmVkO1xuICB9XG5cblxuICBfc3R1YkNhbGwobmFtZSwgYXJncywgb3B0aW9ucykge1xuICAgIC8vIFJ1biB0aGUgc3R1YiwgaWYgd2UgaGF2ZSBvbmUuIFRoZSBzdHViIGlzIHN1cHBvc2VkIHRvIG1ha2Ugc29tZVxuICAgIC8vIHRlbXBvcmFyeSB3cml0ZXMgdG8gdGhlIGRhdGFiYXNlIHRvIGdpdmUgdGhlIHVzZXIgYSBzbW9vdGggZXhwZXJpZW5jZVxuICAgIC8vIHVudGlsIHRoZSBhY3R1YWwgcmVzdWx0IG9mIGV4ZWN1dGluZyB0aGUgbWV0aG9kIGNvbWVzIGJhY2sgZnJvbSB0aGVcbiAgICAvLyBzZXJ2ZXIgKHdoZXJldXBvbiB0aGUgdGVtcG9yYXJ5IHdyaXRlcyB0byB0aGUgZGF0YWJhc2Ugd2lsbCBiZSByZXZlcnNlZFxuICAgIC8vIGR1cmluZyB0aGUgYmVnaW5VcGRhdGUvZW5kVXBkYXRlIHByb2Nlc3MuKVxuICAgIC8vXG4gICAgLy8gTm9ybWFsbHksIHdlIGlnbm9yZSB0aGUgcmV0dXJuIHZhbHVlIG9mIHRoZSBzdHViIChldmVuIGlmIGl0IGlzIGFuXG4gICAgLy8gZXhjZXB0aW9uKSwgaW4gZmF2b3Igb2YgdGhlIHJlYWwgcmV0dXJuIHZhbHVlIGZyb20gdGhlIHNlcnZlci4gVGhlXG4gICAgLy8gZXhjZXB0aW9uIGlzIGlmIHRoZSAqY2FsbGVyKiBpcyBhIHN0dWIuIEluIHRoYXQgY2FzZSwgd2UncmUgbm90IGdvaW5nXG4gICAgLy8gdG8gZG8gYSBSUEMsIHNvIHdlIHVzZSB0aGUgcmV0dXJuIHZhbHVlIG9mIHRoZSBzdHViIGFzIG91ciByZXR1cm5cbiAgICAvLyB2YWx1ZS5cbiAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICBjb25zdCBlbmNsb3NpbmcgPSBERFAuX0N1cnJlbnRNZXRob2RJbnZvY2F0aW9uLmdldCgpO1xuICAgIGNvbnN0IHN0dWIgPSBzZWxmLl9tZXRob2RIYW5kbGVyc1tuYW1lXTtcbiAgICBjb25zdCBhbHJlYWR5SW5TaW11bGF0aW9uID0gZW5jbG9zaW5nPy5pc1NpbXVsYXRpb247XG4gICAgY29uc3QgaXNGcm9tQ2FsbEFzeW5jID0gZW5jbG9zaW5nPy5faXNGcm9tQ2FsbEFzeW5jO1xuICAgIGNvbnN0IHJhbmRvbVNlZWQgPSB7IHZhbHVlOiBudWxsfTtcblxuICAgIGNvbnN0IGRlZmF1bHRSZXR1cm4gPSB7XG4gICAgICBhbHJlYWR5SW5TaW11bGF0aW9uLCByYW5kb21TZWVkLCBpc0Zyb21DYWxsQXN5bmNcbiAgICB9O1xuICAgIGlmICghc3R1Yikge1xuICAgICAgcmV0dXJuIHsgLi4uZGVmYXVsdFJldHVybiwgaGFzU3R1YjogZmFsc2UgfTtcbiAgICB9XG5cbiAgICAvLyBMYXppbHkgZ2VuZXJhdGUgYSByYW5kb21TZWVkLCBvbmx5IGlmIGl0IGlzIHJlcXVlc3RlZCBieSB0aGUgc3R1Yi5cbiAgICAvLyBUaGUgcmFuZG9tIHN0cmVhbXMgb25seSBoYXZlIHV0aWxpdHkgaWYgdGhleSdyZSB1c2VkIG9uIGJvdGggdGhlIGNsaWVudFxuICAgIC8vIGFuZCB0aGUgc2VydmVyOyBpZiB0aGUgY2xpZW50IGRvZXNuJ3QgZ2VuZXJhdGUgYW55ICdyYW5kb20nIHZhbHVlc1xuICAgIC8vIHRoZW4gd2UgZG9uJ3QgZXhwZWN0IHRoZSBzZXJ2ZXIgdG8gZ2VuZXJhdGUgYW55IGVpdGhlci5cbiAgICAvLyBMZXNzIGNvbW1vbmx5LCB0aGUgc2VydmVyIG1heSBwZXJmb3JtIGRpZmZlcmVudCBhY3Rpb25zIGZyb20gdGhlIGNsaWVudCxcbiAgICAvLyBhbmQgbWF5IGluIGZhY3QgZ2VuZXJhdGUgdmFsdWVzIHdoZXJlIHRoZSBjbGllbnQgZGlkIG5vdCwgYnV0IHdlIGRvbid0XG4gICAgLy8gaGF2ZSBhbnkgY2xpZW50LXNpZGUgdmFsdWVzIHRvIG1hdGNoLCBzbyBldmVuIGhlcmUgd2UgbWF5IGFzIHdlbGwganVzdFxuICAgIC8vIHVzZSBhIHJhbmRvbSBzZWVkIG9uIHRoZSBzZXJ2ZXIuICBJbiB0aGF0IGNhc2UsIHdlIGRvbid0IHBhc3MgdGhlXG4gICAgLy8gcmFuZG9tU2VlZCB0byBzYXZlIGJhbmR3aWR0aCwgYW5kIHdlIGRvbid0IGV2ZW4gZ2VuZXJhdGUgaXQgdG8gc2F2ZSBhXG4gICAgLy8gYml0IG9mIENQVSBhbmQgdG8gYXZvaWQgY29uc3VtaW5nIGVudHJvcHkuXG5cbiAgICBjb25zdCByYW5kb21TZWVkR2VuZXJhdG9yID0gKCkgPT4ge1xuICAgICAgaWYgKHJhbmRvbVNlZWQudmFsdWUgPT09IG51bGwpIHtcbiAgICAgICAgcmFuZG9tU2VlZC52YWx1ZSA9IEREUENvbW1vbi5tYWtlUnBjU2VlZChlbmNsb3NpbmcsIG5hbWUpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJhbmRvbVNlZWQudmFsdWU7XG4gICAgfTtcblxuICAgIGNvbnN0IHNldFVzZXJJZCA9IHVzZXJJZCA9PiB7XG4gICAgICBzZWxmLnNldFVzZXJJZCh1c2VySWQpO1xuICAgIH07XG5cbiAgICBjb25zdCBpbnZvY2F0aW9uID0gbmV3IEREUENvbW1vbi5NZXRob2RJbnZvY2F0aW9uKHtcbiAgICAgIGlzU2ltdWxhdGlvbjogdHJ1ZSxcbiAgICAgIHVzZXJJZDogc2VsZi51c2VySWQoKSxcbiAgICAgIGlzRnJvbUNhbGxBc3luYzogb3B0aW9ucz8uaXNGcm9tQ2FsbEFzeW5jLFxuICAgICAgc2V0VXNlcklkOiBzZXRVc2VySWQsXG4gICAgICByYW5kb21TZWVkKCkge1xuICAgICAgICByZXR1cm4gcmFuZG9tU2VlZEdlbmVyYXRvcigpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gTm90ZSB0aGF0IHVubGlrZSBpbiB0aGUgY29ycmVzcG9uZGluZyBzZXJ2ZXIgY29kZSwgd2UgbmV2ZXIgYXVkaXRcbiAgICAvLyB0aGF0IHN0dWJzIGNoZWNrKCkgdGhlaXIgYXJndW1lbnRzLlxuICAgIGNvbnN0IHN0dWJJbnZvY2F0aW9uID0gKCkgPT4ge1xuICAgICAgICBpZiAoTWV0ZW9yLmlzU2VydmVyKSB7XG4gICAgICAgICAgLy8gQmVjYXVzZSBzYXZlT3JpZ2luYWxzIGFuZCByZXRyaWV2ZU9yaWdpbmFscyBhcmVuJ3QgcmVlbnRyYW50LFxuICAgICAgICAgIC8vIGRvbid0IGFsbG93IHN0dWJzIHRvIHlpZWxkLlxuICAgICAgICAgIHJldHVybiBNZXRlb3IuX25vWWllbGRzQWxsb3dlZCgoKSA9PiB7XG4gICAgICAgICAgICAvLyByZS1jbG9uZSwgc28gdGhhdCB0aGUgc3R1YiBjYW4ndCBhZmZlY3Qgb3VyIGNhbGxlcidzIHZhbHVlc1xuICAgICAgICAgICAgcmV0dXJuIHN0dWIuYXBwbHkoaW52b2NhdGlvbiwgRUpTT04uY2xvbmUoYXJncykpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBzdHViLmFwcGx5KGludm9jYXRpb24sIEVKU09OLmNsb25lKGFyZ3MpKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIHsgLi4uZGVmYXVsdFJldHVybiwgaGFzU3R1YjogdHJ1ZSwgc3R1Ykludm9jYXRpb24sIGludm9jYXRpb24gfTtcbiAgfVxuXG4gIC8vIEJlZm9yZSBjYWxsaW5nIGEgbWV0aG9kIHN0dWIsIHByZXBhcmUgYWxsIHN0b3JlcyB0byB0cmFjayBjaGFuZ2VzIGFuZCBhbGxvd1xuICAvLyBfcmV0cmlldmVBbmRTdG9yZU9yaWdpbmFscyB0byBnZXQgdGhlIG9yaWdpbmFsIHZlcnNpb25zIG9mIGNoYW5nZWRcbiAgLy8gZG9jdW1lbnRzLlxuICBfc2F2ZU9yaWdpbmFscygpIHtcbiAgICBpZiAoISB0aGlzLl93YWl0aW5nRm9yUXVpZXNjZW5jZSgpKSB7XG4gICAgICB0aGlzLl9mbHVzaEJ1ZmZlcmVkV3JpdGVzKCk7XG4gICAgfVxuXG4gICAgT2JqZWN0LnZhbHVlcyh0aGlzLl9zdG9yZXMpLmZvckVhY2goKHN0b3JlKSA9PiB7XG4gICAgICBzdG9yZS5zYXZlT3JpZ2luYWxzKCk7XG4gICAgfSk7XG4gIH1cblxuICAvLyBSZXRyaWV2ZXMgdGhlIG9yaWdpbmFsIHZlcnNpb25zIG9mIGFsbCBkb2N1bWVudHMgbW9kaWZpZWQgYnkgdGhlIHN0dWIgZm9yXG4gIC8vIG1ldGhvZCAnbWV0aG9kSWQnIGZyb20gYWxsIHN0b3JlcyBhbmQgc2F2ZXMgdGhlbSB0byBfc2VydmVyRG9jdW1lbnRzIChrZXllZFxuICAvLyBieSBkb2N1bWVudCkgYW5kIF9kb2N1bWVudHNXcml0dGVuQnlTdHViIChrZXllZCBieSBtZXRob2QgSUQpLlxuICBfcmV0cmlldmVBbmRTdG9yZU9yaWdpbmFscyhtZXRob2RJZCkge1xuICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl9kb2N1bWVudHNXcml0dGVuQnlTdHViW21ldGhvZElkXSlcbiAgICAgIHRocm93IG5ldyBFcnJvcignRHVwbGljYXRlIG1ldGhvZElkIGluIF9yZXRyaWV2ZUFuZFN0b3JlT3JpZ2luYWxzJyk7XG5cbiAgICBjb25zdCBkb2NzV3JpdHRlbiA9IFtdO1xuXG4gICAgT2JqZWN0LmVudHJpZXMoc2VsZi5fc3RvcmVzKS5mb3JFYWNoKChbY29sbGVjdGlvbiwgc3RvcmVdKSA9PiB7XG4gICAgICBjb25zdCBvcmlnaW5hbHMgPSBzdG9yZS5yZXRyaWV2ZU9yaWdpbmFscygpO1xuICAgICAgLy8gbm90IGFsbCBzdG9yZXMgZGVmaW5lIHJldHJpZXZlT3JpZ2luYWxzXG4gICAgICBpZiAoISBvcmlnaW5hbHMpIHJldHVybjtcbiAgICAgIG9yaWdpbmFscy5mb3JFYWNoKChkb2MsIGlkKSA9PiB7XG4gICAgICAgIGRvY3NXcml0dGVuLnB1c2goeyBjb2xsZWN0aW9uLCBpZCB9KTtcbiAgICAgICAgaWYgKCEgaGFzT3duLmNhbGwoc2VsZi5fc2VydmVyRG9jdW1lbnRzLCBjb2xsZWN0aW9uKSkge1xuICAgICAgICAgIHNlbGYuX3NlcnZlckRvY3VtZW50c1tjb2xsZWN0aW9uXSA9IG5ldyBNb25nb0lETWFwKCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgc2VydmVyRG9jID0gc2VsZi5fc2VydmVyRG9jdW1lbnRzW2NvbGxlY3Rpb25dLnNldERlZmF1bHQoXG4gICAgICAgICAgaWQsXG4gICAgICAgICAgT2JqZWN0LmNyZWF0ZShudWxsKVxuICAgICAgICApO1xuICAgICAgICBpZiAoc2VydmVyRG9jLndyaXR0ZW5CeVN0dWJzKSB7XG4gICAgICAgICAgLy8gV2UncmUgbm90IHRoZSBmaXJzdCBzdHViIHRvIHdyaXRlIHRoaXMgZG9jLiBKdXN0IGFkZCBvdXIgbWV0aG9kIElEXG4gICAgICAgICAgLy8gdG8gdGhlIHJlY29yZC5cbiAgICAgICAgICBzZXJ2ZXJEb2Mud3JpdHRlbkJ5U3R1YnNbbWV0aG9kSWRdID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBGaXJzdCBzdHViISBTYXZlIHRoZSBvcmlnaW5hbCB2YWx1ZSBhbmQgb3VyIG1ldGhvZCBJRC5cbiAgICAgICAgICBzZXJ2ZXJEb2MuZG9jdW1lbnQgPSBkb2M7XG4gICAgICAgICAgc2VydmVyRG9jLmZsdXNoQ2FsbGJhY2tzID0gW107XG4gICAgICAgICAgc2VydmVyRG9jLndyaXR0ZW5CeVN0dWJzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICAgICAgICBzZXJ2ZXJEb2Mud3JpdHRlbkJ5U3R1YnNbbWV0aG9kSWRdID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gICAgaWYgKCEgaXNFbXB0eShkb2NzV3JpdHRlbikpIHtcbiAgICAgIHNlbGYuX2RvY3VtZW50c1dyaXR0ZW5CeVN0dWJbbWV0aG9kSWRdID0gZG9jc1dyaXR0ZW47XG4gICAgfVxuICB9XG5cbiAgLy8gVGhpcyBpcyB2ZXJ5IG11Y2ggYSBwcml2YXRlIGZ1bmN0aW9uIHdlIHVzZSB0byBtYWtlIHRoZSB0ZXN0c1xuICAvLyB0YWtlIHVwIGZld2VyIHNlcnZlciByZXNvdXJjZXMgYWZ0ZXIgdGhleSBjb21wbGV0ZS5cbiAgX3Vuc3Vic2NyaWJlQWxsKCkge1xuICAgIE9iamVjdC52YWx1ZXModGhpcy5fc3Vic2NyaXB0aW9ucykuZm9yRWFjaCgoc3ViKSA9PiB7XG4gICAgICAvLyBBdm9pZCBraWxsaW5nIHRoZSBhdXRvdXBkYXRlIHN1YnNjcmlwdGlvbiBzbyB0aGF0IGRldmVsb3BlcnNcbiAgICAgIC8vIHN0aWxsIGdldCBob3QgY29kZSBwdXNoZXMgd2hlbiB3cml0aW5nIHRlc3RzLlxuICAgICAgLy9cbiAgICAgIC8vIFhYWCBpdCdzIGEgaGFjayB0byBlbmNvZGUga25vd2xlZGdlIGFib3V0IGF1dG91cGRhdGUgaGVyZSxcbiAgICAgIC8vIGJ1dCBpdCBkb2Vzbid0IHNlZW0gd29ydGggaXQgeWV0IHRvIGhhdmUgYSBzcGVjaWFsIEFQSSBmb3JcbiAgICAgIC8vIHN1YnNjcmlwdGlvbnMgdG8gcHJlc2VydmUgYWZ0ZXIgdW5pdCB0ZXN0cy5cbiAgICAgIGlmIChzdWIubmFtZSAhPT0gJ21ldGVvcl9hdXRvdXBkYXRlX2NsaWVudFZlcnNpb25zJykge1xuICAgICAgICBzdWIuc3RvcCgpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLy8gU2VuZHMgdGhlIEREUCBzdHJpbmdpZmljYXRpb24gb2YgdGhlIGdpdmVuIG1lc3NhZ2Ugb2JqZWN0XG4gIF9zZW5kKG9iaikge1xuICAgIHRoaXMuX3N0cmVhbS5zZW5kKEREUENvbW1vbi5zdHJpbmdpZnlERFAob2JqKSk7XG4gIH1cblxuICAvLyBXZSBkZXRlY3RlZCB2aWEgRERQLWxldmVsIGhlYXJ0YmVhdHMgdGhhdCB3ZSd2ZSBsb3N0IHRoZVxuICAvLyBjb25uZWN0aW9uLiAgVW5saWtlIGBkaXNjb25uZWN0YCBvciBgY2xvc2VgLCBhIGxvc3QgY29ubmVjdGlvblxuICAvLyB3aWxsIGJlIGF1dG9tYXRpY2FsbHkgcmV0cmllZC5cbiAgX2xvc3RDb25uZWN0aW9uKGVycm9yKSB7XG4gICAgdGhpcy5fc3RyZWFtLl9sb3N0Q29ubmVjdGlvbihlcnJvcik7XG4gIH1cblxuICAvKipcbiAgICogQG1lbWJlck9mIE1ldGVvclxuICAgKiBAaW1wb3J0RnJvbVBhY2thZ2UgbWV0ZW9yXG4gICAqIEBhbGlhcyBNZXRlb3Iuc3RhdHVzXG4gICAqIEBzdW1tYXJ5IEdldCB0aGUgY3VycmVudCBjb25uZWN0aW9uIHN0YXR1cy4gQSByZWFjdGl2ZSBkYXRhIHNvdXJjZS5cbiAgICogQGxvY3VzIENsaWVudFxuICAgKi9cbiAgc3RhdHVzKC4uLmFyZ3MpIHtcbiAgICByZXR1cm4gdGhpcy5fc3RyZWFtLnN0YXR1cyguLi5hcmdzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBGb3JjZSBhbiBpbW1lZGlhdGUgcmVjb25uZWN0aW9uIGF0dGVtcHQgaWYgdGhlIGNsaWVudCBpcyBub3QgY29ubmVjdGVkIHRvIHRoZSBzZXJ2ZXIuXG5cbiAgVGhpcyBtZXRob2QgZG9lcyBub3RoaW5nIGlmIHRoZSBjbGllbnQgaXMgYWxyZWFkeSBjb25uZWN0ZWQuXG4gICAqIEBtZW1iZXJPZiBNZXRlb3JcbiAgICogQGltcG9ydEZyb21QYWNrYWdlIG1ldGVvclxuICAgKiBAYWxpYXMgTWV0ZW9yLnJlY29ubmVjdFxuICAgKiBAbG9jdXMgQ2xpZW50XG4gICAqL1xuICByZWNvbm5lY3QoLi4uYXJncykge1xuICAgIHJldHVybiB0aGlzLl9zdHJlYW0ucmVjb25uZWN0KC4uLmFyZ3MpO1xuICB9XG5cbiAgLyoqXG4gICAqIEBtZW1iZXJPZiBNZXRlb3JcbiAgICogQGltcG9ydEZyb21QYWNrYWdlIG1ldGVvclxuICAgKiBAYWxpYXMgTWV0ZW9yLmRpc2Nvbm5lY3RcbiAgICogQHN1bW1hcnkgRGlzY29ubmVjdCB0aGUgY2xpZW50IGZyb20gdGhlIHNlcnZlci5cbiAgICogQGxvY3VzIENsaWVudFxuICAgKi9cbiAgZGlzY29ubmVjdCguLi5hcmdzKSB7XG4gICAgcmV0dXJuIHRoaXMuX3N0cmVhbS5kaXNjb25uZWN0KC4uLmFyZ3MpO1xuICB9XG5cbiAgY2xvc2UoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3N0cmVhbS5kaXNjb25uZWN0KHsgX3Blcm1hbmVudDogdHJ1ZSB9KTtcbiAgfVxuXG4gIC8vL1xuICAvLy8gUmVhY3RpdmUgdXNlciBzeXN0ZW1cbiAgLy8vXG4gIHVzZXJJZCgpIHtcbiAgICBpZiAodGhpcy5fdXNlcklkRGVwcykgdGhpcy5fdXNlcklkRGVwcy5kZXBlbmQoKTtcbiAgICByZXR1cm4gdGhpcy5fdXNlcklkO1xuICB9XG5cbiAgc2V0VXNlcklkKHVzZXJJZCkge1xuICAgIC8vIEF2b2lkIGludmFsaWRhdGluZyBkZXBlbmRlbnRzIGlmIHNldFVzZXJJZCBpcyBjYWxsZWQgd2l0aCBjdXJyZW50IHZhbHVlLlxuICAgIGlmICh0aGlzLl91c2VySWQgPT09IHVzZXJJZCkgcmV0dXJuO1xuICAgIHRoaXMuX3VzZXJJZCA9IHVzZXJJZDtcbiAgICBpZiAodGhpcy5fdXNlcklkRGVwcykgdGhpcy5fdXNlcklkRGVwcy5jaGFuZ2VkKCk7XG4gIH1cblxuICAvLyBSZXR1cm5zIHRydWUgaWYgd2UgYXJlIGluIGEgc3RhdGUgYWZ0ZXIgcmVjb25uZWN0IG9mIHdhaXRpbmcgZm9yIHN1YnMgdG8gYmVcbiAgLy8gcmV2aXZlZCBvciBlYXJseSBtZXRob2RzIHRvIGZpbmlzaCB0aGVpciBkYXRhLCBvciB3ZSBhcmUgd2FpdGluZyBmb3IgYVxuICAvLyBcIndhaXRcIiBtZXRob2QgdG8gZmluaXNoLlxuICBfd2FpdGluZ0ZvclF1aWVzY2VuY2UoKSB7XG4gICAgcmV0dXJuIChcbiAgICAgICEgaXNFbXB0eSh0aGlzLl9zdWJzQmVpbmdSZXZpdmVkKSB8fFxuICAgICAgISBpc0VtcHR5KHRoaXMuX21ldGhvZHNCbG9ja2luZ1F1aWVzY2VuY2UpXG4gICAgKTtcbiAgfVxuXG4gIC8vIFJldHVybnMgdHJ1ZSBpZiBhbnkgbWV0aG9kIHdob3NlIG1lc3NhZ2UgaGFzIGJlZW4gc2VudCB0byB0aGUgc2VydmVyIGhhc1xuICAvLyBub3QgeWV0IGludm9rZWQgaXRzIHVzZXIgY2FsbGJhY2suXG4gIF9hbnlNZXRob2RzQXJlT3V0c3RhbmRpbmcoKSB7XG4gICAgY29uc3QgaW52b2tlcnMgPSB0aGlzLl9tZXRob2RJbnZva2VycztcbiAgICByZXR1cm4gT2JqZWN0LnZhbHVlcyhpbnZva2Vycykuc29tZSgoaW52b2tlcikgPT4gISFpbnZva2VyLnNlbnRNZXNzYWdlKTtcbiAgfVxuXG4gIF9saXZlZGF0YV9jb25uZWN0ZWQobXNnKSB7XG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG5cbiAgICBpZiAoc2VsZi5fdmVyc2lvbiAhPT0gJ3ByZTEnICYmIHNlbGYuX2hlYXJ0YmVhdEludGVydmFsICE9PSAwKSB7XG4gICAgICBzZWxmLl9oZWFydGJlYXQgPSBuZXcgRERQQ29tbW9uLkhlYXJ0YmVhdCh7XG4gICAgICAgIGhlYXJ0YmVhdEludGVydmFsOiBzZWxmLl9oZWFydGJlYXRJbnRlcnZhbCxcbiAgICAgICAgaGVhcnRiZWF0VGltZW91dDogc2VsZi5faGVhcnRiZWF0VGltZW91dCxcbiAgICAgICAgb25UaW1lb3V0KCkge1xuICAgICAgICAgIHNlbGYuX2xvc3RDb25uZWN0aW9uKFxuICAgICAgICAgICAgbmV3IEREUC5Db25uZWN0aW9uRXJyb3IoJ0REUCBoZWFydGJlYXQgdGltZWQgb3V0JylcbiAgICAgICAgICApO1xuICAgICAgICB9LFxuICAgICAgICBzZW5kUGluZygpIHtcbiAgICAgICAgICBzZWxmLl9zZW5kKHsgbXNnOiAncGluZycgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgc2VsZi5faGVhcnRiZWF0LnN0YXJ0KCk7XG4gICAgfVxuXG4gICAgLy8gSWYgdGhpcyBpcyBhIHJlY29ubmVjdCwgd2UnbGwgaGF2ZSB0byByZXNldCBhbGwgc3RvcmVzLlxuICAgIGlmIChzZWxmLl9sYXN0U2Vzc2lvbklkKSBzZWxmLl9yZXNldFN0b3JlcyA9IHRydWU7XG5cbiAgICBsZXQgcmVjb25uZWN0ZWRUb1ByZXZpb3VzU2Vzc2lvbjtcbiAgICBpZiAodHlwZW9mIG1zZy5zZXNzaW9uID09PSAnc3RyaW5nJykge1xuICAgICAgcmVjb25uZWN0ZWRUb1ByZXZpb3VzU2Vzc2lvbiA9IHNlbGYuX2xhc3RTZXNzaW9uSWQgPT09IG1zZy5zZXNzaW9uO1xuICAgICAgc2VsZi5fbGFzdFNlc3Npb25JZCA9IG1zZy5zZXNzaW9uO1xuICAgIH1cblxuICAgIGlmIChyZWNvbm5lY3RlZFRvUHJldmlvdXNTZXNzaW9uKSB7XG4gICAgICAvLyBTdWNjZXNzZnVsIHJlY29ubmVjdGlvbiAtLSBwaWNrIHVwIHdoZXJlIHdlIGxlZnQgb2ZmLiAgTm90ZSB0aGF0IHJpZ2h0XG4gICAgICAvLyBub3csIHRoaXMgbmV2ZXIgaGFwcGVuczogdGhlIHNlcnZlciBuZXZlciBjb25uZWN0cyB1cyB0byBhIHByZXZpb3VzXG4gICAgICAvLyBzZXNzaW9uLCBiZWNhdXNlIEREUCBkb2Vzbid0IHByb3ZpZGUgZW5vdWdoIGRhdGEgZm9yIHRoZSBzZXJ2ZXIgdG8ga25vd1xuICAgICAgLy8gd2hhdCBtZXNzYWdlcyB0aGUgY2xpZW50IGhhcyBwcm9jZXNzZWQuIFdlIG5lZWQgdG8gaW1wcm92ZSBERFAgdG8gbWFrZVxuICAgICAgLy8gdGhpcyBwb3NzaWJsZSwgYXQgd2hpY2ggcG9pbnQgd2UnbGwgcHJvYmFibHkgbmVlZCBtb3JlIGNvZGUgaGVyZS5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBTZXJ2ZXIgZG9lc24ndCBoYXZlIG91ciBkYXRhIGFueSBtb3JlLiBSZS1zeW5jIGEgbmV3IHNlc3Npb24uXG5cbiAgICAvLyBGb3JnZXQgYWJvdXQgbWVzc2FnZXMgd2Ugd2VyZSBidWZmZXJpbmcgZm9yIHVua25vd24gY29sbGVjdGlvbnMuIFRoZXknbGxcbiAgICAvLyBiZSByZXNlbnQgaWYgc3RpbGwgcmVsZXZhbnQuXG4gICAgc2VsZi5fdXBkYXRlc0ZvclVua25vd25TdG9yZXMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gICAgaWYgKHNlbGYuX3Jlc2V0U3RvcmVzKSB7XG4gICAgICAvLyBGb3JnZXQgYWJvdXQgdGhlIGVmZmVjdHMgb2Ygc3R1YnMuIFdlJ2xsIGJlIHJlc2V0dGluZyBhbGwgY29sbGVjdGlvbnNcbiAgICAgIC8vIGFueXdheS5cbiAgICAgIHNlbGYuX2RvY3VtZW50c1dyaXR0ZW5CeVN0dWIgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgICAgc2VsZi5fc2VydmVyRG9jdW1lbnRzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICB9XG5cbiAgICAvLyBDbGVhciBfYWZ0ZXJVcGRhdGVDYWxsYmFja3MuXG4gICAgc2VsZi5fYWZ0ZXJVcGRhdGVDYWxsYmFja3MgPSBbXTtcblxuICAgIC8vIE1hcmsgYWxsIG5hbWVkIHN1YnNjcmlwdGlvbnMgd2hpY2ggYXJlIHJlYWR5IChpZSwgd2UgYWxyZWFkeSBjYWxsZWQgdGhlXG4gICAgLy8gcmVhZHkgY2FsbGJhY2spIGFzIG5lZWRpbmcgdG8gYmUgcmV2aXZlZC5cbiAgICAvLyBYWFggV2Ugc2hvdWxkIGFsc28gYmxvY2sgcmVjb25uZWN0IHF1aWVzY2VuY2UgdW50aWwgdW5uYW1lZCBzdWJzY3JpcHRpb25zXG4gICAgLy8gICAgIChlZywgYXV0b3B1Ymxpc2gpIGFyZSBkb25lIHJlLXB1Ymxpc2hpbmcgdG8gYXZvaWQgZmxpY2tlciFcbiAgICBzZWxmLl9zdWJzQmVpbmdSZXZpdmVkID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICBPYmplY3QuZW50cmllcyhzZWxmLl9zdWJzY3JpcHRpb25zKS5mb3JFYWNoKChbaWQsIHN1Yl0pID0+IHtcbiAgICAgIGlmIChzdWIucmVhZHkpIHtcbiAgICAgICAgc2VsZi5fc3Vic0JlaW5nUmV2aXZlZFtpZF0gPSB0cnVlO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gQXJyYW5nZSBmb3IgXCJoYWxmLWZpbmlzaGVkXCIgbWV0aG9kcyB0byBoYXZlIHRoZWlyIGNhbGxiYWNrcyBydW4sIGFuZFxuICAgIC8vIHRyYWNrIG1ldGhvZHMgdGhhdCB3ZXJlIHNlbnQgb24gdGhpcyBjb25uZWN0aW9uIHNvIHRoYXQgd2UgZG9uJ3RcbiAgICAvLyBxdWllc2NlIHVudGlsIHRoZXkgYXJlIGFsbCBkb25lLlxuICAgIC8vXG4gICAgLy8gU3RhcnQgYnkgY2xlYXJpbmcgX21ldGhvZHNCbG9ja2luZ1F1aWVzY2VuY2U6IG1ldGhvZHMgc2VudCBiZWZvcmVcbiAgICAvLyByZWNvbm5lY3QgZG9uJ3QgbWF0dGVyLCBhbmQgYW55IFwid2FpdFwiIG1ldGhvZHMgc2VudCBvbiB0aGUgbmV3IGNvbm5lY3Rpb25cbiAgICAvLyB0aGF0IHdlIGRyb3AgaGVyZSB3aWxsIGJlIHJlc3RvcmVkIGJ5IHRoZSBsb29wIGJlbG93LlxuICAgIHNlbGYuX21ldGhvZHNCbG9ja2luZ1F1aWVzY2VuY2UgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgIGlmIChzZWxmLl9yZXNldFN0b3Jlcykge1xuICAgICAgY29uc3QgaW52b2tlcnMgPSBzZWxmLl9tZXRob2RJbnZva2VycztcbiAgICAgIGtleXMoaW52b2tlcnMpLmZvckVhY2goaWQgPT4ge1xuICAgICAgICBjb25zdCBpbnZva2VyID0gaW52b2tlcnNbaWRdO1xuICAgICAgICBpZiAoaW52b2tlci5nb3RSZXN1bHQoKSkge1xuICAgICAgICAgIC8vIFRoaXMgbWV0aG9kIGFscmVhZHkgZ290IGl0cyByZXN1bHQsIGJ1dCBpdCBkaWRuJ3QgY2FsbCBpdHMgY2FsbGJhY2tcbiAgICAgICAgICAvLyBiZWNhdXNlIGl0cyBkYXRhIGRpZG4ndCBiZWNvbWUgdmlzaWJsZS4gV2UgZGlkIG5vdCByZXNlbmQgdGhlXG4gICAgICAgICAgLy8gbWV0aG9kIFJQQy4gV2UnbGwgY2FsbCBpdHMgY2FsbGJhY2sgd2hlbiB3ZSBnZXQgYSBmdWxsIHF1aWVzY2UsXG4gICAgICAgICAgLy8gc2luY2UgdGhhdCdzIGFzIGNsb3NlIGFzIHdlJ2xsIGdldCB0byBcImRhdGEgbXVzdCBiZSB2aXNpYmxlXCIuXG4gICAgICAgICAgc2VsZi5fYWZ0ZXJVcGRhdGVDYWxsYmFja3MucHVzaChcbiAgICAgICAgICAgICguLi5hcmdzKSA9PiBpbnZva2VyLmRhdGFWaXNpYmxlKC4uLmFyZ3MpXG4gICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIGlmIChpbnZva2VyLnNlbnRNZXNzYWdlKSB7XG4gICAgICAgICAgLy8gVGhpcyBtZXRob2QgaGFzIGJlZW4gc2VudCBvbiB0aGlzIGNvbm5lY3Rpb24gKG1heWJlIGFzIGEgcmVzZW5kXG4gICAgICAgICAgLy8gZnJvbSB0aGUgbGFzdCBjb25uZWN0aW9uLCBtYXliZSBmcm9tIG9uUmVjb25uZWN0LCBtYXliZSBqdXN0IHZlcnlcbiAgICAgICAgICAvLyBxdWlja2x5IGJlZm9yZSBwcm9jZXNzaW5nIHRoZSBjb25uZWN0ZWQgbWVzc2FnZSkuXG4gICAgICAgICAgLy9cbiAgICAgICAgICAvLyBXZSBkb24ndCBuZWVkIHRvIGRvIGFueXRoaW5nIHNwZWNpYWwgdG8gZW5zdXJlIGl0cyBjYWxsYmFja3MgZ2V0XG4gICAgICAgICAgLy8gY2FsbGVkLCBidXQgd2UnbGwgY291bnQgaXQgYXMgYSBtZXRob2Qgd2hpY2ggaXMgcHJldmVudGluZ1xuICAgICAgICAgIC8vIHJlY29ubmVjdCBxdWllc2NlbmNlLiAoZWcsIGl0IG1pZ2h0IGJlIGEgbG9naW4gbWV0aG9kIHRoYXQgd2FzIHJ1blxuICAgICAgICAgIC8vIGZyb20gb25SZWNvbm5lY3QsIGFuZCB3ZSBkb24ndCB3YW50IHRvIHNlZSBmbGlja2VyIGJ5IHNlZWluZyBhXG4gICAgICAgICAgLy8gbG9nZ2VkLW91dCBzdGF0ZS4pXG4gICAgICAgICAgc2VsZi5fbWV0aG9kc0Jsb2NraW5nUXVpZXNjZW5jZVtpbnZva2VyLm1ldGhvZElkXSA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHNlbGYuX21lc3NhZ2VzQnVmZmVyZWRVbnRpbFF1aWVzY2VuY2UgPSBbXTtcblxuICAgIC8vIElmIHdlJ3JlIG5vdCB3YWl0aW5nIG9uIGFueSBtZXRob2RzIG9yIHN1YnMsIHdlIGNhbiByZXNldCB0aGUgc3RvcmVzIGFuZFxuICAgIC8vIGNhbGwgdGhlIGNhbGxiYWNrcyBpbW1lZGlhdGVseS5cbiAgICBpZiAoISBzZWxmLl93YWl0aW5nRm9yUXVpZXNjZW5jZSgpKSB7XG4gICAgICBpZiAoc2VsZi5fcmVzZXRTdG9yZXMpIHtcbiAgICAgICAgT2JqZWN0LnZhbHVlcyhzZWxmLl9zdG9yZXMpLmZvckVhY2goKHN0b3JlKSA9PiB7XG4gICAgICAgICAgc3RvcmUuYmVnaW5VcGRhdGUoMCwgdHJ1ZSk7XG4gICAgICAgICAgc3RvcmUuZW5kVXBkYXRlKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBzZWxmLl9yZXNldFN0b3JlcyA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgc2VsZi5fcnVuQWZ0ZXJVcGRhdGVDYWxsYmFja3MoKTtcbiAgICB9XG4gIH1cblxuICBfcHJvY2Vzc09uZURhdGFNZXNzYWdlKG1zZywgdXBkYXRlcykge1xuICAgIGNvbnN0IG1lc3NhZ2VUeXBlID0gbXNnLm1zZztcblxuICAgIC8vIG1zZyBpcyBvbmUgb2YgWydhZGRlZCcsICdjaGFuZ2VkJywgJ3JlbW92ZWQnLCAncmVhZHknLCAndXBkYXRlZCddXG4gICAgaWYgKG1lc3NhZ2VUeXBlID09PSAnYWRkZWQnKSB7XG4gICAgICB0aGlzLl9wcm9jZXNzX2FkZGVkKG1zZywgdXBkYXRlcyk7XG4gICAgfSBlbHNlIGlmIChtZXNzYWdlVHlwZSA9PT0gJ2NoYW5nZWQnKSB7XG4gICAgICB0aGlzLl9wcm9jZXNzX2NoYW5nZWQobXNnLCB1cGRhdGVzKTtcbiAgICB9IGVsc2UgaWYgKG1lc3NhZ2VUeXBlID09PSAncmVtb3ZlZCcpIHtcbiAgICAgIHRoaXMuX3Byb2Nlc3NfcmVtb3ZlZChtc2csIHVwZGF0ZXMpO1xuICAgIH0gZWxzZSBpZiAobWVzc2FnZVR5cGUgPT09ICdyZWFkeScpIHtcbiAgICAgIHRoaXMuX3Byb2Nlc3NfcmVhZHkobXNnLCB1cGRhdGVzKTtcbiAgICB9IGVsc2UgaWYgKG1lc3NhZ2VUeXBlID09PSAndXBkYXRlZCcpIHtcbiAgICAgIHRoaXMuX3Byb2Nlc3NfdXBkYXRlZChtc2csIHVwZGF0ZXMpO1xuICAgIH0gZWxzZSBpZiAobWVzc2FnZVR5cGUgPT09ICdub3N1YicpIHtcbiAgICAgIC8vIGlnbm9yZSB0aGlzXG4gICAgfSBlbHNlIHtcbiAgICAgIE1ldGVvci5fZGVidWcoJ2Rpc2NhcmRpbmcgdW5rbm93biBsaXZlZGF0YSBkYXRhIG1lc3NhZ2UgdHlwZScsIG1zZyk7XG4gICAgfVxuICB9XG5cbiAgX2xpdmVkYXRhX2RhdGEobXNnKSB7XG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG5cbiAgICBpZiAoc2VsZi5fd2FpdGluZ0ZvclF1aWVzY2VuY2UoKSkge1xuICAgICAgc2VsZi5fbWVzc2FnZXNCdWZmZXJlZFVudGlsUXVpZXNjZW5jZS5wdXNoKG1zZyk7XG5cbiAgICAgIGlmIChtc2cubXNnID09PSAnbm9zdWInKSB7XG4gICAgICAgIGRlbGV0ZSBzZWxmLl9zdWJzQmVpbmdSZXZpdmVkW21zZy5pZF07XG4gICAgICB9XG5cbiAgICAgIGlmIChtc2cuc3Vicykge1xuICAgICAgICBtc2cuc3Vicy5mb3JFYWNoKHN1YklkID0+IHtcbiAgICAgICAgICBkZWxldGUgc2VsZi5fc3Vic0JlaW5nUmV2aXZlZFtzdWJJZF07XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBpZiAobXNnLm1ldGhvZHMpIHtcbiAgICAgICAgbXNnLm1ldGhvZHMuZm9yRWFjaChtZXRob2RJZCA9PiB7XG4gICAgICAgICAgZGVsZXRlIHNlbGYuX21ldGhvZHNCbG9ja2luZ1F1aWVzY2VuY2VbbWV0aG9kSWRdO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgaWYgKHNlbGYuX3dhaXRpbmdGb3JRdWllc2NlbmNlKCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBObyBtZXRob2RzIG9yIHN1YnMgYXJlIGJsb2NraW5nIHF1aWVzY2VuY2UhXG4gICAgICAvLyBXZSdsbCBub3cgcHJvY2VzcyBhbmQgYWxsIG9mIG91ciBidWZmZXJlZCBtZXNzYWdlcywgcmVzZXQgYWxsIHN0b3JlcyxcbiAgICAgIC8vIGFuZCBhcHBseSB0aGVtIGFsbCBhdCBvbmNlLlxuXG4gICAgICBjb25zdCBidWZmZXJlZE1lc3NhZ2VzID0gc2VsZi5fbWVzc2FnZXNCdWZmZXJlZFVudGlsUXVpZXNjZW5jZTtcbiAgICAgIE9iamVjdC52YWx1ZXMoYnVmZmVyZWRNZXNzYWdlcykuZm9yRWFjaChidWZmZXJlZE1lc3NhZ2UgPT4ge1xuICAgICAgICBzZWxmLl9wcm9jZXNzT25lRGF0YU1lc3NhZ2UoXG4gICAgICAgICAgYnVmZmVyZWRNZXNzYWdlLFxuICAgICAgICAgIHNlbGYuX2J1ZmZlcmVkV3JpdGVzXG4gICAgICAgICk7XG4gICAgICB9KTtcblxuICAgICAgc2VsZi5fbWVzc2FnZXNCdWZmZXJlZFVudGlsUXVpZXNjZW5jZSA9IFtdO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIHNlbGYuX3Byb2Nlc3NPbmVEYXRhTWVzc2FnZShtc2csIHNlbGYuX2J1ZmZlcmVkV3JpdGVzKTtcbiAgICB9XG5cbiAgICAvLyBJbW1lZGlhdGVseSBmbHVzaCB3cml0ZXMgd2hlbjpcbiAgICAvLyAgMS4gQnVmZmVyaW5nIGlzIGRpc2FibGVkLiBPcjtcbiAgICAvLyAgMi4gYW55IG5vbi0oYWRkZWQvY2hhbmdlZC9yZW1vdmVkKSBtZXNzYWdlIGFycml2ZXMuXG4gICAgY29uc3Qgc3RhbmRhcmRXcml0ZSA9XG4gICAgICBtc2cubXNnID09PSBcImFkZGVkXCIgfHxcbiAgICAgIG1zZy5tc2cgPT09IFwiY2hhbmdlZFwiIHx8XG4gICAgICBtc2cubXNnID09PSBcInJlbW92ZWRcIjtcblxuICAgIGlmIChzZWxmLl9idWZmZXJlZFdyaXRlc0ludGVydmFsID09PSAwIHx8ICEgc3RhbmRhcmRXcml0ZSkge1xuICAgICAgc2VsZi5fZmx1c2hCdWZmZXJlZFdyaXRlcygpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChzZWxmLl9idWZmZXJlZFdyaXRlc0ZsdXNoQXQgPT09IG51bGwpIHtcbiAgICAgIHNlbGYuX2J1ZmZlcmVkV3JpdGVzRmx1c2hBdCA9XG4gICAgICAgIG5ldyBEYXRlKCkudmFsdWVPZigpICsgc2VsZi5fYnVmZmVyZWRXcml0ZXNNYXhBZ2U7XG4gICAgfSBlbHNlIGlmIChzZWxmLl9idWZmZXJlZFdyaXRlc0ZsdXNoQXQgPCBuZXcgRGF0ZSgpLnZhbHVlT2YoKSkge1xuICAgICAgc2VsZi5fZmx1c2hCdWZmZXJlZFdyaXRlcygpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChzZWxmLl9idWZmZXJlZFdyaXRlc0ZsdXNoSGFuZGxlKSB7XG4gICAgICBjbGVhclRpbWVvdXQoc2VsZi5fYnVmZmVyZWRXcml0ZXNGbHVzaEhhbmRsZSk7XG4gICAgfVxuICAgIHNlbGYuX2J1ZmZlcmVkV3JpdGVzRmx1c2hIYW5kbGUgPSBzZXRUaW1lb3V0KFxuICAgICAgc2VsZi5fX2ZsdXNoQnVmZmVyZWRXcml0ZXMsXG4gICAgICBzZWxmLl9idWZmZXJlZFdyaXRlc0ludGVydmFsXG4gICAgKTtcbiAgfVxuXG4gIF9mbHVzaEJ1ZmZlcmVkV3JpdGVzKCkge1xuICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl9idWZmZXJlZFdyaXRlc0ZsdXNoSGFuZGxlKSB7XG4gICAgICBjbGVhclRpbWVvdXQoc2VsZi5fYnVmZmVyZWRXcml0ZXNGbHVzaEhhbmRsZSk7XG4gICAgICBzZWxmLl9idWZmZXJlZFdyaXRlc0ZsdXNoSGFuZGxlID0gbnVsbDtcbiAgICB9XG5cbiAgICBzZWxmLl9idWZmZXJlZFdyaXRlc0ZsdXNoQXQgPSBudWxsO1xuICAgIC8vIFdlIG5lZWQgdG8gY2xlYXIgdGhlIGJ1ZmZlciBiZWZvcmUgcGFzc2luZyBpdCB0b1xuICAgIC8vICBwZXJmb3JtV3JpdGVzLiBBcyB0aGVyZSdzIG5vIGd1YXJhbnRlZSB0aGF0IGl0XG4gICAgLy8gIHdpbGwgZXhpdCBjbGVhbmx5LlxuICAgIGNvbnN0IHdyaXRlcyA9IHNlbGYuX2J1ZmZlcmVkV3JpdGVzO1xuICAgIHNlbGYuX2J1ZmZlcmVkV3JpdGVzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICBzZWxmLl9wZXJmb3JtV3JpdGVzKHdyaXRlcyk7XG4gIH1cblxuICBfcGVyZm9ybVdyaXRlcyh1cGRhdGVzKSB7XG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG5cbiAgICBpZiAoc2VsZi5fcmVzZXRTdG9yZXMgfHwgISBpc0VtcHR5KHVwZGF0ZXMpKSB7XG4gICAgICAvLyBCZWdpbiBhIHRyYW5zYWN0aW9uYWwgdXBkYXRlIG9mIGVhY2ggc3RvcmUuXG5cbiAgICAgIE9iamVjdC5lbnRyaWVzKHNlbGYuX3N0b3JlcykuZm9yRWFjaCgoW3N0b3JlTmFtZSwgc3RvcmVdKSA9PiB7XG4gICAgICAgIHN0b3JlLmJlZ2luVXBkYXRlKFxuICAgICAgICAgIGhhc093bi5jYWxsKHVwZGF0ZXMsIHN0b3JlTmFtZSlcbiAgICAgICAgICAgID8gdXBkYXRlc1tzdG9yZU5hbWVdLmxlbmd0aFxuICAgICAgICAgICAgOiAwLFxuICAgICAgICAgIHNlbGYuX3Jlc2V0U3RvcmVzXG4gICAgICAgICk7XG4gICAgICB9KTtcblxuICAgICAgc2VsZi5fcmVzZXRTdG9yZXMgPSBmYWxzZTtcblxuICAgICAgT2JqZWN0LmVudHJpZXModXBkYXRlcykuZm9yRWFjaCgoW3N0b3JlTmFtZSwgdXBkYXRlTWVzc2FnZXNdKSA9PiB7XG4gICAgICAgIGNvbnN0IHN0b3JlID0gc2VsZi5fc3RvcmVzW3N0b3JlTmFtZV07XG4gICAgICAgIGlmIChzdG9yZSkge1xuICAgICAgICAgIHVwZGF0ZU1lc3NhZ2VzLmZvckVhY2godXBkYXRlTWVzc2FnZSA9PiB7XG4gICAgICAgICAgICBzdG9yZS51cGRhdGUodXBkYXRlTWVzc2FnZSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gTm9ib2R5J3MgbGlzdGVuaW5nIGZvciB0aGlzIGRhdGEuIFF1ZXVlIGl0IHVwIHVudGlsXG4gICAgICAgICAgLy8gc29tZW9uZSB3YW50cyBpdC5cbiAgICAgICAgICAvLyBYWFggbWVtb3J5IHVzZSB3aWxsIGdyb3cgd2l0aG91dCBib3VuZCBpZiB5b3UgZm9yZ2V0IHRvXG4gICAgICAgICAgLy8gY3JlYXRlIGEgY29sbGVjdGlvbiBvciBqdXN0IGRvbid0IGNhcmUgYWJvdXQgaXQuLi4gZ29pbmdcbiAgICAgICAgICAvLyB0byBoYXZlIHRvIGRvIHNvbWV0aGluZyBhYm91dCB0aGF0LlxuICAgICAgICAgIGNvbnN0IHVwZGF0ZXMgPSBzZWxmLl91cGRhdGVzRm9yVW5rbm93blN0b3JlcztcblxuICAgICAgICAgIGlmICghIGhhc093bi5jYWxsKHVwZGF0ZXMsIHN0b3JlTmFtZSkpIHtcbiAgICAgICAgICAgIHVwZGF0ZXNbc3RvcmVOYW1lXSA9IFtdO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHVwZGF0ZXNbc3RvcmVOYW1lXS5wdXNoKC4uLnVwZGF0ZU1lc3NhZ2VzKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIC8vIEVuZCB1cGRhdGUgdHJhbnNhY3Rpb24uXG4gICAgICBPYmplY3QudmFsdWVzKHNlbGYuX3N0b3JlcykuZm9yRWFjaCgoc3RvcmUpID0+IHtcbiAgICAgICAgc3RvcmUuZW5kVXBkYXRlKCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBzZWxmLl9ydW5BZnRlclVwZGF0ZUNhbGxiYWNrcygpO1xuICB9XG5cbiAgLy8gQ2FsbCBhbnkgY2FsbGJhY2tzIGRlZmVycmVkIHdpdGggX3J1bldoZW5BbGxTZXJ2ZXJEb2NzQXJlRmx1c2hlZCB3aG9zZVxuICAvLyByZWxldmFudCBkb2NzIGhhdmUgYmVlbiBmbHVzaGVkLCBhcyB3ZWxsIGFzIGRhdGFWaXNpYmxlIGNhbGxiYWNrcyBhdFxuICAvLyByZWNvbm5lY3QtcXVpZXNjZW5jZSB0aW1lLlxuICBfcnVuQWZ0ZXJVcGRhdGVDYWxsYmFja3MoKSB7XG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgY29uc3QgY2FsbGJhY2tzID0gc2VsZi5fYWZ0ZXJVcGRhdGVDYWxsYmFja3M7XG4gICAgc2VsZi5fYWZ0ZXJVcGRhdGVDYWxsYmFja3MgPSBbXTtcbiAgICBjYWxsYmFja3MuZm9yRWFjaCgoYykgPT4ge1xuICAgICAgYygpO1xuICAgIH0pO1xuICB9XG5cbiAgX3B1c2hVcGRhdGUodXBkYXRlcywgY29sbGVjdGlvbiwgbXNnKSB7XG4gICAgaWYgKCEgaGFzT3duLmNhbGwodXBkYXRlcywgY29sbGVjdGlvbikpIHtcbiAgICAgIHVwZGF0ZXNbY29sbGVjdGlvbl0gPSBbXTtcbiAgICB9XG4gICAgdXBkYXRlc1tjb2xsZWN0aW9uXS5wdXNoKG1zZyk7XG4gIH1cblxuICBfZ2V0U2VydmVyRG9jKGNvbGxlY3Rpb24sIGlkKSB7XG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgaWYgKCEgaGFzT3duLmNhbGwoc2VsZi5fc2VydmVyRG9jdW1lbnRzLCBjb2xsZWN0aW9uKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHNlcnZlckRvY3NGb3JDb2xsZWN0aW9uID0gc2VsZi5fc2VydmVyRG9jdW1lbnRzW2NvbGxlY3Rpb25dO1xuICAgIHJldHVybiBzZXJ2ZXJEb2NzRm9yQ29sbGVjdGlvbi5nZXQoaWQpIHx8IG51bGw7XG4gIH1cblxuICBfcHJvY2Vzc19hZGRlZChtc2csIHVwZGF0ZXMpIHtcbiAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICBjb25zdCBpZCA9IE1vbmdvSUQuaWRQYXJzZShtc2cuaWQpO1xuICAgIGNvbnN0IHNlcnZlckRvYyA9IHNlbGYuX2dldFNlcnZlckRvYyhtc2cuY29sbGVjdGlvbiwgaWQpO1xuICAgIGlmIChzZXJ2ZXJEb2MpIHtcbiAgICAgIC8vIFNvbWUgb3V0c3RhbmRpbmcgc3R1YiB3cm90ZSBoZXJlLlxuICAgICAgY29uc3QgaXNFeGlzdGluZyA9IHNlcnZlckRvYy5kb2N1bWVudCAhPT0gdW5kZWZpbmVkO1xuXG4gICAgICBzZXJ2ZXJEb2MuZG9jdW1lbnQgPSBtc2cuZmllbGRzIHx8IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgICBzZXJ2ZXJEb2MuZG9jdW1lbnQuX2lkID0gaWQ7XG5cbiAgICAgIGlmIChzZWxmLl9yZXNldFN0b3Jlcykge1xuICAgICAgICAvLyBEdXJpbmcgcmVjb25uZWN0IHRoZSBzZXJ2ZXIgaXMgc2VuZGluZyBhZGRzIGZvciBleGlzdGluZyBpZHMuXG4gICAgICAgIC8vIEFsd2F5cyBwdXNoIGFuIHVwZGF0ZSBzbyB0aGF0IGRvY3VtZW50IHN0YXlzIGluIHRoZSBzdG9yZSBhZnRlclxuICAgICAgICAvLyByZXNldC4gVXNlIGN1cnJlbnQgdmVyc2lvbiBvZiB0aGUgZG9jdW1lbnQgZm9yIHRoaXMgdXBkYXRlLCBzb1xuICAgICAgICAvLyB0aGF0IHN0dWItd3JpdHRlbiB2YWx1ZXMgYXJlIHByZXNlcnZlZC5cbiAgICAgICAgY29uc3QgY3VycmVudERvYyA9IHNlbGYuX3N0b3Jlc1ttc2cuY29sbGVjdGlvbl0uZ2V0RG9jKG1zZy5pZCk7XG4gICAgICAgIGlmIChjdXJyZW50RG9jICE9PSB1bmRlZmluZWQpIG1zZy5maWVsZHMgPSBjdXJyZW50RG9jO1xuXG4gICAgICAgIHNlbGYuX3B1c2hVcGRhdGUodXBkYXRlcywgbXNnLmNvbGxlY3Rpb24sIG1zZyk7XG4gICAgICB9IGVsc2UgaWYgKGlzRXhpc3RpbmcpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdTZXJ2ZXIgc2VudCBhZGQgZm9yIGV4aXN0aW5nIGlkOiAnICsgbXNnLmlkKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc2VsZi5fcHVzaFVwZGF0ZSh1cGRhdGVzLCBtc2cuY29sbGVjdGlvbiwgbXNnKTtcbiAgICB9XG4gIH1cblxuICBfcHJvY2Vzc19jaGFuZ2VkKG1zZywgdXBkYXRlcykge1xuICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgIGNvbnN0IHNlcnZlckRvYyA9IHNlbGYuX2dldFNlcnZlckRvYyhtc2cuY29sbGVjdGlvbiwgTW9uZ29JRC5pZFBhcnNlKG1zZy5pZCkpO1xuICAgIGlmIChzZXJ2ZXJEb2MpIHtcbiAgICAgIGlmIChzZXJ2ZXJEb2MuZG9jdW1lbnQgPT09IHVuZGVmaW5lZClcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdTZXJ2ZXIgc2VudCBjaGFuZ2VkIGZvciBub25leGlzdGluZyBpZDogJyArIG1zZy5pZCk7XG4gICAgICBEaWZmU2VxdWVuY2UuYXBwbHlDaGFuZ2VzKHNlcnZlckRvYy5kb2N1bWVudCwgbXNnLmZpZWxkcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNlbGYuX3B1c2hVcGRhdGUodXBkYXRlcywgbXNnLmNvbGxlY3Rpb24sIG1zZyk7XG4gICAgfVxuICB9XG5cbiAgX3Byb2Nlc3NfcmVtb3ZlZChtc2csIHVwZGF0ZXMpIHtcbiAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICBjb25zdCBzZXJ2ZXJEb2MgPSBzZWxmLl9nZXRTZXJ2ZXJEb2MobXNnLmNvbGxlY3Rpb24sIE1vbmdvSUQuaWRQYXJzZShtc2cuaWQpKTtcbiAgICBpZiAoc2VydmVyRG9jKSB7XG4gICAgICAvLyBTb21lIG91dHN0YW5kaW5nIHN0dWIgd3JvdGUgaGVyZS5cbiAgICAgIGlmIChzZXJ2ZXJEb2MuZG9jdW1lbnQgPT09IHVuZGVmaW5lZClcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdTZXJ2ZXIgc2VudCByZW1vdmVkIGZvciBub25leGlzdGluZyBpZDonICsgbXNnLmlkKTtcbiAgICAgIHNlcnZlckRvYy5kb2N1bWVudCA9IHVuZGVmaW5lZDtcbiAgICB9IGVsc2Uge1xuICAgICAgc2VsZi5fcHVzaFVwZGF0ZSh1cGRhdGVzLCBtc2cuY29sbGVjdGlvbiwge1xuICAgICAgICBtc2c6ICdyZW1vdmVkJyxcbiAgICAgICAgY29sbGVjdGlvbjogbXNnLmNvbGxlY3Rpb24sXG4gICAgICAgIGlkOiBtc2cuaWRcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIF9wcm9jZXNzX3VwZGF0ZWQobXNnLCB1cGRhdGVzKSB7XG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgLy8gUHJvY2VzcyBcIm1ldGhvZCBkb25lXCIgbWVzc2FnZXMuXG5cbiAgICBtc2cubWV0aG9kcy5mb3JFYWNoKChtZXRob2RJZCkgPT4ge1xuICAgICAgY29uc3QgZG9jcyA9IHNlbGYuX2RvY3VtZW50c1dyaXR0ZW5CeVN0dWJbbWV0aG9kSWRdIHx8IHt9O1xuICAgICAgT2JqZWN0LnZhbHVlcyhkb2NzKS5mb3JFYWNoKCh3cml0dGVuKSA9PiB7XG4gICAgICAgIGNvbnN0IHNlcnZlckRvYyA9IHNlbGYuX2dldFNlcnZlckRvYyh3cml0dGVuLmNvbGxlY3Rpb24sIHdyaXR0ZW4uaWQpO1xuICAgICAgICBpZiAoISBzZXJ2ZXJEb2MpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0xvc3Qgc2VydmVyRG9jIGZvciAnICsgSlNPTi5zdHJpbmdpZnkod3JpdHRlbikpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghIHNlcnZlckRvYy53cml0dGVuQnlTdHVic1ttZXRob2RJZF0pIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAnRG9jICcgK1xuICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh3cml0dGVuKSArXG4gICAgICAgICAgICAgICcgbm90IHdyaXR0ZW4gYnkgIG1ldGhvZCAnICtcbiAgICAgICAgICAgICAgbWV0aG9kSWRcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIGRlbGV0ZSBzZXJ2ZXJEb2Mud3JpdHRlbkJ5U3R1YnNbbWV0aG9kSWRdO1xuICAgICAgICBpZiAoaXNFbXB0eShzZXJ2ZXJEb2Mud3JpdHRlbkJ5U3R1YnMpKSB7XG4gICAgICAgICAgLy8gQWxsIG1ldGhvZHMgd2hvc2Ugc3R1YnMgd3JvdGUgdGhpcyBtZXRob2QgaGF2ZSBjb21wbGV0ZWQhIFdlIGNhblxuICAgICAgICAgIC8vIG5vdyBjb3B5IHRoZSBzYXZlZCBkb2N1bWVudCB0byB0aGUgZGF0YWJhc2UgKHJldmVydGluZyB0aGUgc3R1YidzXG4gICAgICAgICAgLy8gY2hhbmdlIGlmIHRoZSBzZXJ2ZXIgZGlkIG5vdCB3cml0ZSB0byB0aGlzIG9iamVjdCwgb3IgYXBwbHlpbmcgdGhlXG4gICAgICAgICAgLy8gc2VydmVyJ3Mgd3JpdGVzIGlmIGl0IGRpZCkuXG5cbiAgICAgICAgICAvLyBUaGlzIGlzIGEgZmFrZSBkZHAgJ3JlcGxhY2UnIG1lc3NhZ2UuICBJdCdzIGp1c3QgZm9yIHRhbGtpbmdcbiAgICAgICAgICAvLyBiZXR3ZWVuIGxpdmVkYXRhIGNvbm5lY3Rpb25zIGFuZCBtaW5pbW9uZ28uICAoV2UgaGF2ZSB0byBzdHJpbmdpZnlcbiAgICAgICAgICAvLyB0aGUgSUQgYmVjYXVzZSBpdCdzIHN1cHBvc2VkIHRvIGxvb2sgbGlrZSBhIHdpcmUgbWVzc2FnZS4pXG4gICAgICAgICAgc2VsZi5fcHVzaFVwZGF0ZSh1cGRhdGVzLCB3cml0dGVuLmNvbGxlY3Rpb24sIHtcbiAgICAgICAgICAgIG1zZzogJ3JlcGxhY2UnLFxuICAgICAgICAgICAgaWQ6IE1vbmdvSUQuaWRTdHJpbmdpZnkod3JpdHRlbi5pZCksXG4gICAgICAgICAgICByZXBsYWNlOiBzZXJ2ZXJEb2MuZG9jdW1lbnRcbiAgICAgICAgICB9KTtcbiAgICAgICAgICAvLyBDYWxsIGFsbCBmbHVzaCBjYWxsYmFja3MuXG5cbiAgICAgICAgICBzZXJ2ZXJEb2MuZmx1c2hDYWxsYmFja3MuZm9yRWFjaCgoYykgPT4ge1xuICAgICAgICAgICAgYygpO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgLy8gRGVsZXRlIHRoaXMgY29tcGxldGVkIHNlcnZlckRvY3VtZW50LiBEb24ndCBib3RoZXIgdG8gR0MgZW1wdHlcbiAgICAgICAgICAvLyBJZE1hcHMgaW5zaWRlIHNlbGYuX3NlcnZlckRvY3VtZW50cywgc2luY2UgdGhlcmUgcHJvYmFibHkgYXJlbid0XG4gICAgICAgICAgLy8gbWFueSBjb2xsZWN0aW9ucyBhbmQgdGhleSdsbCBiZSB3cml0dGVuIHJlcGVhdGVkbHkuXG4gICAgICAgICAgc2VsZi5fc2VydmVyRG9jdW1lbnRzW3dyaXR0ZW4uY29sbGVjdGlvbl0ucmVtb3ZlKHdyaXR0ZW4uaWQpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGRlbGV0ZSBzZWxmLl9kb2N1bWVudHNXcml0dGVuQnlTdHViW21ldGhvZElkXTtcblxuICAgICAgLy8gV2Ugd2FudCB0byBjYWxsIHRoZSBkYXRhLXdyaXR0ZW4gY2FsbGJhY2ssIGJ1dCB3ZSBjYW4ndCBkbyBzbyB1bnRpbCBhbGxcbiAgICAgIC8vIGN1cnJlbnRseSBidWZmZXJlZCBtZXNzYWdlcyBhcmUgZmx1c2hlZC5cbiAgICAgIGNvbnN0IGNhbGxiYWNrSW52b2tlciA9IHNlbGYuX21ldGhvZEludm9rZXJzW21ldGhvZElkXTtcbiAgICAgIGlmICghIGNhbGxiYWNrSW52b2tlcikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIGNhbGxiYWNrIGludm9rZXIgZm9yIG1ldGhvZCAnICsgbWV0aG9kSWQpO1xuICAgICAgfVxuXG4gICAgICBzZWxmLl9ydW5XaGVuQWxsU2VydmVyRG9jc0FyZUZsdXNoZWQoXG4gICAgICAgICguLi5hcmdzKSA9PiBjYWxsYmFja0ludm9rZXIuZGF0YVZpc2libGUoLi4uYXJncylcbiAgICAgICk7XG4gICAgfSk7XG4gIH1cblxuICBfcHJvY2Vzc19yZWFkeShtc2csIHVwZGF0ZXMpIHtcbiAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAvLyBQcm9jZXNzIFwic3ViIHJlYWR5XCIgbWVzc2FnZXMuIFwic3ViIHJlYWR5XCIgbWVzc2FnZXMgZG9uJ3QgdGFrZSBlZmZlY3RcbiAgICAvLyB1bnRpbCBhbGwgY3VycmVudCBzZXJ2ZXIgZG9jdW1lbnRzIGhhdmUgYmVlbiBmbHVzaGVkIHRvIHRoZSBsb2NhbFxuICAgIC8vIGRhdGFiYXNlLiBXZSBjYW4gdXNlIGEgd3JpdGUgZmVuY2UgdG8gaW1wbGVtZW50IHRoaXMuXG5cbiAgICBtc2cuc3Vicy5mb3JFYWNoKChzdWJJZCkgPT4ge1xuICAgICAgc2VsZi5fcnVuV2hlbkFsbFNlcnZlckRvY3NBcmVGbHVzaGVkKCgpID0+IHtcbiAgICAgICAgY29uc3Qgc3ViUmVjb3JkID0gc2VsZi5fc3Vic2NyaXB0aW9uc1tzdWJJZF07XG4gICAgICAgIC8vIERpZCB3ZSBhbHJlYWR5IHVuc3Vic2NyaWJlP1xuICAgICAgICBpZiAoIXN1YlJlY29yZCkgcmV0dXJuO1xuICAgICAgICAvLyBEaWQgd2UgYWxyZWFkeSByZWNlaXZlIGEgcmVhZHkgbWVzc2FnZT8gKE9vcHMhKVxuICAgICAgICBpZiAoc3ViUmVjb3JkLnJlYWR5KSByZXR1cm47XG4gICAgICAgIHN1YlJlY29yZC5yZWFkeSA9IHRydWU7XG4gICAgICAgIHN1YlJlY29yZC5yZWFkeUNhbGxiYWNrICYmIHN1YlJlY29yZC5yZWFkeUNhbGxiYWNrKCk7XG4gICAgICAgIHN1YlJlY29yZC5yZWFkeURlcHMuY2hhbmdlZCgpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICAvLyBFbnN1cmVzIHRoYXQgXCJmXCIgd2lsbCBiZSBjYWxsZWQgYWZ0ZXIgYWxsIGRvY3VtZW50cyBjdXJyZW50bHkgaW5cbiAgLy8gX3NlcnZlckRvY3VtZW50cyBoYXZlIGJlZW4gd3JpdHRlbiB0byB0aGUgbG9jYWwgY2FjaGUuIGYgd2lsbCBub3QgYmUgY2FsbGVkXG4gIC8vIGlmIHRoZSBjb25uZWN0aW9uIGlzIGxvc3QgYmVmb3JlIHRoZW4hXG4gIF9ydW5XaGVuQWxsU2VydmVyRG9jc0FyZUZsdXNoZWQoZikge1xuICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgIGNvbnN0IHJ1bkZBZnRlclVwZGF0ZXMgPSAoKSA9PiB7XG4gICAgICBzZWxmLl9hZnRlclVwZGF0ZUNhbGxiYWNrcy5wdXNoKGYpO1xuICAgIH07XG4gICAgbGV0IHVuZmx1c2hlZFNlcnZlckRvY0NvdW50ID0gMDtcbiAgICBjb25zdCBvblNlcnZlckRvY0ZsdXNoID0gKCkgPT4ge1xuICAgICAgLS11bmZsdXNoZWRTZXJ2ZXJEb2NDb3VudDtcbiAgICAgIGlmICh1bmZsdXNoZWRTZXJ2ZXJEb2NDb3VudCA9PT0gMCkge1xuICAgICAgICAvLyBUaGlzIHdhcyB0aGUgbGFzdCBkb2MgdG8gZmx1c2ghIEFycmFuZ2UgdG8gcnVuIGYgYWZ0ZXIgdGhlIHVwZGF0ZXNcbiAgICAgICAgLy8gaGF2ZSBiZWVuIGFwcGxpZWQuXG4gICAgICAgIHJ1bkZBZnRlclVwZGF0ZXMoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgT2JqZWN0LnZhbHVlcyhzZWxmLl9zZXJ2ZXJEb2N1bWVudHMpLmZvckVhY2goKHNlcnZlckRvY3VtZW50cykgPT4ge1xuICAgICAgc2VydmVyRG9jdW1lbnRzLmZvckVhY2goKHNlcnZlckRvYykgPT4ge1xuICAgICAgICBjb25zdCB3cml0dGVuQnlTdHViRm9yQU1ldGhvZFdpdGhTZW50TWVzc2FnZSA9XG4gICAgICAgICAga2V5cyhzZXJ2ZXJEb2Mud3JpdHRlbkJ5U3R1YnMpLnNvbWUobWV0aG9kSWQgPT4ge1xuICAgICAgICAgICAgY29uc3QgaW52b2tlciA9IHNlbGYuX21ldGhvZEludm9rZXJzW21ldGhvZElkXTtcbiAgICAgICAgICAgIHJldHVybiBpbnZva2VyICYmIGludm9rZXIuc2VudE1lc3NhZ2U7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKHdyaXR0ZW5CeVN0dWJGb3JBTWV0aG9kV2l0aFNlbnRNZXNzYWdlKSB7XG4gICAgICAgICAgKyt1bmZsdXNoZWRTZXJ2ZXJEb2NDb3VudDtcbiAgICAgICAgICBzZXJ2ZXJEb2MuZmx1c2hDYWxsYmFja3MucHVzaChvblNlcnZlckRvY0ZsdXNoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gICAgaWYgKHVuZmx1c2hlZFNlcnZlckRvY0NvdW50ID09PSAwKSB7XG4gICAgICAvLyBUaGVyZSBhcmVuJ3QgYW55IGJ1ZmZlcmVkIGRvY3MgLS0tIHdlIGNhbiBjYWxsIGYgYXMgc29vbiBhcyB0aGUgY3VycmVudFxuICAgICAgLy8gcm91bmQgb2YgdXBkYXRlcyBpcyBhcHBsaWVkIVxuICAgICAgcnVuRkFmdGVyVXBkYXRlcygpO1xuICAgIH1cbiAgfVxuXG4gIF9saXZlZGF0YV9ub3N1Yihtc2cpIHtcbiAgICBjb25zdCBzZWxmID0gdGhpcztcblxuICAgIC8vIEZpcnN0IHBhc3MgaXQgdGhyb3VnaCBfbGl2ZWRhdGFfZGF0YSwgd2hpY2ggb25seSB1c2VzIGl0IHRvIGhlbHAgZ2V0XG4gICAgLy8gdG93YXJkcyBxdWllc2NlbmNlLlxuICAgIHNlbGYuX2xpdmVkYXRhX2RhdGEobXNnKTtcblxuICAgIC8vIERvIHRoZSByZXN0IG9mIG91ciBwcm9jZXNzaW5nIGltbWVkaWF0ZWx5LCB3aXRoIG5vXG4gICAgLy8gYnVmZmVyaW5nLXVudGlsLXF1aWVzY2VuY2UuXG5cbiAgICAvLyB3ZSB3ZXJlbid0IHN1YmJlZCBhbnl3YXksIG9yIHdlIGluaXRpYXRlZCB0aGUgdW5zdWIuXG4gICAgaWYgKCEgaGFzT3duLmNhbGwoc2VsZi5fc3Vic2NyaXB0aW9ucywgbXNnLmlkKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIFhYWCBDT01QQVQgV0lUSCAxLjAuMy4xICNlcnJvckNhbGxiYWNrXG4gICAgY29uc3QgZXJyb3JDYWxsYmFjayA9IHNlbGYuX3N1YnNjcmlwdGlvbnNbbXNnLmlkXS5lcnJvckNhbGxiYWNrO1xuICAgIGNvbnN0IHN0b3BDYWxsYmFjayA9IHNlbGYuX3N1YnNjcmlwdGlvbnNbbXNnLmlkXS5zdG9wQ2FsbGJhY2s7XG5cbiAgICBzZWxmLl9zdWJzY3JpcHRpb25zW21zZy5pZF0ucmVtb3ZlKCk7XG5cbiAgICBjb25zdCBtZXRlb3JFcnJvckZyb21Nc2cgPSBtc2dBcmcgPT4ge1xuICAgICAgcmV0dXJuIChcbiAgICAgICAgbXNnQXJnICYmXG4gICAgICAgIG1zZ0FyZy5lcnJvciAmJlxuICAgICAgICBuZXcgTWV0ZW9yLkVycm9yKFxuICAgICAgICAgIG1zZ0FyZy5lcnJvci5lcnJvcixcbiAgICAgICAgICBtc2dBcmcuZXJyb3IucmVhc29uLFxuICAgICAgICAgIG1zZ0FyZy5lcnJvci5kZXRhaWxzXG4gICAgICAgIClcbiAgICAgICk7XG4gICAgfTtcblxuICAgIC8vIFhYWCBDT01QQVQgV0lUSCAxLjAuMy4xICNlcnJvckNhbGxiYWNrXG4gICAgaWYgKGVycm9yQ2FsbGJhY2sgJiYgbXNnLmVycm9yKSB7XG4gICAgICBlcnJvckNhbGxiYWNrKG1ldGVvckVycm9yRnJvbU1zZyhtc2cpKTtcbiAgICB9XG5cbiAgICBpZiAoc3RvcENhbGxiYWNrKSB7XG4gICAgICBzdG9wQ2FsbGJhY2sobWV0ZW9yRXJyb3JGcm9tTXNnKG1zZykpO1xuICAgIH1cbiAgfVxuXG4gIF9saXZlZGF0YV9yZXN1bHQobXNnKSB7XG4gICAgLy8gaWQsIHJlc3VsdCBvciBlcnJvci4gZXJyb3IgaGFzIGVycm9yIChjb2RlKSwgcmVhc29uLCBkZXRhaWxzXG5cbiAgICBjb25zdCBzZWxmID0gdGhpcztcblxuICAgIC8vIExldHMgbWFrZSBzdXJlIHRoZXJlIGFyZSBubyBidWZmZXJlZCB3cml0ZXMgYmVmb3JlIHJldHVybmluZyByZXN1bHQuXG4gICAgaWYgKCEgaXNFbXB0eShzZWxmLl9idWZmZXJlZFdyaXRlcykpIHtcbiAgICAgIHNlbGYuX2ZsdXNoQnVmZmVyZWRXcml0ZXMoKTtcbiAgICB9XG5cbiAgICAvLyBmaW5kIHRoZSBvdXRzdGFuZGluZyByZXF1ZXN0XG4gICAgLy8gc2hvdWxkIGJlIE8oMSkgaW4gbmVhcmx5IGFsbCByZWFsaXN0aWMgdXNlIGNhc2VzXG4gICAgaWYgKGlzRW1wdHkoc2VsZi5fb3V0c3RhbmRpbmdNZXRob2RCbG9ja3MpKSB7XG4gICAgICBNZXRlb3IuX2RlYnVnKCdSZWNlaXZlZCBtZXRob2QgcmVzdWx0IGJ1dCBubyBtZXRob2RzIG91dHN0YW5kaW5nJyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGN1cnJlbnRNZXRob2RCbG9jayA9IHNlbGYuX291dHN0YW5kaW5nTWV0aG9kQmxvY2tzWzBdLm1ldGhvZHM7XG4gICAgbGV0IGk7XG4gICAgY29uc3QgbSA9IGN1cnJlbnRNZXRob2RCbG9jay5maW5kKChtZXRob2QsIGlkeCkgPT4ge1xuICAgICAgY29uc3QgZm91bmQgPSBtZXRob2QubWV0aG9kSWQgPT09IG1zZy5pZDtcbiAgICAgIGlmIChmb3VuZCkgaSA9IGlkeDtcbiAgICAgIHJldHVybiBmb3VuZDtcbiAgICB9KTtcbiAgICBpZiAoIW0pIHtcbiAgICAgIE1ldGVvci5fZGVidWcoXCJDYW4ndCBtYXRjaCBtZXRob2QgcmVzcG9uc2UgdG8gb3JpZ2luYWwgbWV0aG9kIGNhbGxcIiwgbXNnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBSZW1vdmUgZnJvbSBjdXJyZW50IG1ldGhvZCBibG9jay4gVGhpcyBtYXkgbGVhdmUgdGhlIGJsb2NrIGVtcHR5LCBidXQgd2VcbiAgICAvLyBkb24ndCBtb3ZlIG9uIHRvIHRoZSBuZXh0IGJsb2NrIHVudGlsIHRoZSBjYWxsYmFjayBoYXMgYmVlbiBkZWxpdmVyZWQsIGluXG4gICAgLy8gX291dHN0YW5kaW5nTWV0aG9kRmluaXNoZWQuXG4gICAgY3VycmVudE1ldGhvZEJsb2NrLnNwbGljZShpLCAxKTtcblxuICAgIGlmIChoYXNPd24uY2FsbChtc2csICdlcnJvcicpKSB7XG4gICAgICBtLnJlY2VpdmVSZXN1bHQoXG4gICAgICAgIG5ldyBNZXRlb3IuRXJyb3IobXNnLmVycm9yLmVycm9yLCBtc2cuZXJyb3IucmVhc29uLCBtc2cuZXJyb3IuZGV0YWlscylcbiAgICAgICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIG1zZy5yZXN1bHQgbWF5IGJlIHVuZGVmaW5lZCBpZiB0aGUgbWV0aG9kIGRpZG4ndCByZXR1cm4gYVxuICAgICAgLy8gdmFsdWVcbiAgICAgIG0ucmVjZWl2ZVJlc3VsdCh1bmRlZmluZWQsIG1zZy5yZXN1bHQpO1xuICAgIH1cbiAgfVxuXG4gIC8vIENhbGxlZCBieSBNZXRob2RJbnZva2VyIGFmdGVyIGEgbWV0aG9kJ3MgY2FsbGJhY2sgaXMgaW52b2tlZC4gIElmIHRoaXMgd2FzXG4gIC8vIHRoZSBsYXN0IG91dHN0YW5kaW5nIG1ldGhvZCBpbiB0aGUgY3VycmVudCBibG9jaywgcnVucyB0aGUgbmV4dCBibG9jay4gSWZcbiAgLy8gdGhlcmUgYXJlIG5vIG1vcmUgbWV0aG9kcywgY29uc2lkZXIgYWNjZXB0aW5nIGEgaG90IGNvZGUgcHVzaC5cbiAgX291dHN0YW5kaW5nTWV0aG9kRmluaXNoZWQoKSB7XG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgaWYgKHNlbGYuX2FueU1ldGhvZHNBcmVPdXRzdGFuZGluZygpKSByZXR1cm47XG5cbiAgICAvLyBObyBtZXRob2RzIGFyZSBvdXRzdGFuZGluZy4gVGhpcyBzaG91bGQgbWVhbiB0aGF0IHRoZSBmaXJzdCBibG9jayBvZlxuICAgIC8vIG1ldGhvZHMgaXMgZW1wdHkuIChPciBpdCBtaWdodCBub3QgZXhpc3QsIGlmIHRoaXMgd2FzIGEgbWV0aG9kIHRoYXRcbiAgICAvLyBoYWxmLWZpbmlzaGVkIGJlZm9yZSBkaXNjb25uZWN0L3JlY29ubmVjdC4pXG4gICAgaWYgKCEgaXNFbXB0eShzZWxmLl9vdXRzdGFuZGluZ01ldGhvZEJsb2NrcykpIHtcbiAgICAgIGNvbnN0IGZpcnN0QmxvY2sgPSBzZWxmLl9vdXRzdGFuZGluZ01ldGhvZEJsb2Nrcy5zaGlmdCgpO1xuICAgICAgaWYgKCEgaXNFbXB0eShmaXJzdEJsb2NrLm1ldGhvZHMpKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgJ05vIG1ldGhvZHMgb3V0c3RhbmRpbmcgYnV0IG5vbmVtcHR5IGJsb2NrOiAnICtcbiAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KGZpcnN0QmxvY2spXG4gICAgICAgICk7XG5cbiAgICAgIC8vIFNlbmQgdGhlIG91dHN0YW5kaW5nIG1ldGhvZHMgbm93IGluIHRoZSBmaXJzdCBibG9jay5cbiAgICAgIGlmICghIGlzRW1wdHkoc2VsZi5fb3V0c3RhbmRpbmdNZXRob2RCbG9ja3MpKVxuICAgICAgICBzZWxmLl9zZW5kT3V0c3RhbmRpbmdNZXRob2RzKCk7XG4gICAgfVxuXG4gICAgLy8gTWF5YmUgYWNjZXB0IGEgaG90IGNvZGUgcHVzaC5cbiAgICBzZWxmLl9tYXliZU1pZ3JhdGUoKTtcbiAgfVxuXG4gIC8vIFNlbmRzIG1lc3NhZ2VzIGZvciBhbGwgdGhlIG1ldGhvZHMgaW4gdGhlIGZpcnN0IGJsb2NrIGluXG4gIC8vIF9vdXRzdGFuZGluZ01ldGhvZEJsb2Nrcy5cbiAgX3NlbmRPdXRzdGFuZGluZ01ldGhvZHMoKSB7XG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG5cbiAgICBpZiAoaXNFbXB0eShzZWxmLl9vdXRzdGFuZGluZ01ldGhvZEJsb2NrcykpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBzZWxmLl9vdXRzdGFuZGluZ01ldGhvZEJsb2Nrc1swXS5tZXRob2RzLmZvckVhY2gobSA9PiB7XG4gICAgICBtLnNlbmRNZXNzYWdlKCk7XG4gICAgfSk7XG4gIH1cblxuICBfbGl2ZWRhdGFfZXJyb3IobXNnKSB7XG4gICAgTWV0ZW9yLl9kZWJ1ZygnUmVjZWl2ZWQgZXJyb3IgZnJvbSBzZXJ2ZXI6ICcsIG1zZy5yZWFzb24pO1xuICAgIGlmIChtc2cub2ZmZW5kaW5nTWVzc2FnZSkgTWV0ZW9yLl9kZWJ1ZygnRm9yOiAnLCBtc2cub2ZmZW5kaW5nTWVzc2FnZSk7XG4gIH1cblxuICBfY2FsbE9uUmVjb25uZWN0QW5kU2VuZEFwcHJvcHJpYXRlT3V0c3RhbmRpbmdNZXRob2RzKCkge1xuICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgIGNvbnN0IG9sZE91dHN0YW5kaW5nTWV0aG9kQmxvY2tzID0gc2VsZi5fb3V0c3RhbmRpbmdNZXRob2RCbG9ja3M7XG4gICAgc2VsZi5fb3V0c3RhbmRpbmdNZXRob2RCbG9ja3MgPSBbXTtcblxuICAgIHNlbGYub25SZWNvbm5lY3QgJiYgc2VsZi5vblJlY29ubmVjdCgpO1xuICAgIEREUC5fcmVjb25uZWN0SG9vay5lYWNoKGNhbGxiYWNrID0+IHtcbiAgICAgIGNhbGxiYWNrKHNlbGYpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG5cbiAgICBpZiAoaXNFbXB0eShvbGRPdXRzdGFuZGluZ01ldGhvZEJsb2NrcykpIHJldHVybjtcblxuICAgIC8vIFdlIGhhdmUgYXQgbGVhc3Qgb25lIGJsb2NrIHdvcnRoIG9mIG9sZCBvdXRzdGFuZGluZyBtZXRob2RzIHRvIHRyeVxuICAgIC8vIGFnYWluLiBGaXJzdDogZGlkIG9uUmVjb25uZWN0IGFjdHVhbGx5IHNlbmQgYW55dGhpbmc/IElmIG5vdCwgd2UganVzdFxuICAgIC8vIHJlc3RvcmUgYWxsIG91dHN0YW5kaW5nIG1ldGhvZHMgYW5kIHJ1biB0aGUgZmlyc3QgYmxvY2suXG4gICAgaWYgKGlzRW1wdHkoc2VsZi5fb3V0c3RhbmRpbmdNZXRob2RCbG9ja3MpKSB7XG4gICAgICBzZWxmLl9vdXRzdGFuZGluZ01ldGhvZEJsb2NrcyA9IG9sZE91dHN0YW5kaW5nTWV0aG9kQmxvY2tzO1xuICAgICAgc2VsZi5fc2VuZE91dHN0YW5kaW5nTWV0aG9kcygpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIE9LLCB0aGVyZSBhcmUgYmxvY2tzIG9uIGJvdGggc2lkZXMuIFNwZWNpYWwgY2FzZTogbWVyZ2UgdGhlIGxhc3QgYmxvY2sgb2ZcbiAgICAvLyB0aGUgcmVjb25uZWN0IG1ldGhvZHMgd2l0aCB0aGUgZmlyc3QgYmxvY2sgb2YgdGhlIG9yaWdpbmFsIG1ldGhvZHMsIGlmXG4gICAgLy8gbmVpdGhlciBvZiB0aGVtIGFyZSBcIndhaXRcIiBibG9ja3MuXG4gICAgaWYgKCEgbGFzdChzZWxmLl9vdXRzdGFuZGluZ01ldGhvZEJsb2Nrcykud2FpdCAmJlxuICAgICAgICAhIG9sZE91dHN0YW5kaW5nTWV0aG9kQmxvY2tzWzBdLndhaXQpIHtcbiAgICAgIG9sZE91dHN0YW5kaW5nTWV0aG9kQmxvY2tzWzBdLm1ldGhvZHMuZm9yRWFjaChtID0+IHtcbiAgICAgICAgbGFzdChzZWxmLl9vdXRzdGFuZGluZ01ldGhvZEJsb2NrcykubWV0aG9kcy5wdXNoKG0pO1xuXG4gICAgICAgIC8vIElmIHRoaXMgXCJsYXN0IGJsb2NrXCIgaXMgYWxzbyB0aGUgZmlyc3QgYmxvY2ssIHNlbmQgdGhlIG1lc3NhZ2UuXG4gICAgICAgIGlmIChzZWxmLl9vdXRzdGFuZGluZ01ldGhvZEJsb2Nrcy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICBtLnNlbmRNZXNzYWdlKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBvbGRPdXRzdGFuZGluZ01ldGhvZEJsb2Nrcy5zaGlmdCgpO1xuICAgIH1cblxuICAgIC8vIE5vdyBhZGQgdGhlIHJlc3Qgb2YgdGhlIG9yaWdpbmFsIGJsb2NrcyBvbi5cbiAgICBzZWxmLl9vdXRzdGFuZGluZ01ldGhvZEJsb2Nrcy5wdXNoKC4uLm9sZE91dHN0YW5kaW5nTWV0aG9kQmxvY2tzKTtcbiAgfVxuXG4gIC8vIFdlIGNhbiBhY2NlcHQgYSBob3QgY29kZSBwdXNoIGlmIHRoZXJlIGFyZSBubyBtZXRob2RzIGluIGZsaWdodC5cbiAgX3JlYWR5VG9NaWdyYXRlKCkge1xuICAgIHJldHVybiBpc0VtcHR5KHRoaXMuX21ldGhvZEludm9rZXJzKTtcbiAgfVxuXG4gIC8vIElmIHdlIHdlcmUgYmxvY2tpbmcgYSBtaWdyYXRpb24sIHNlZSBpZiBpdCdzIG5vdyBwb3NzaWJsZSB0byBjb250aW51ZS5cbiAgLy8gQ2FsbCB3aGVuZXZlciB0aGUgc2V0IG9mIG91dHN0YW5kaW5nL2Jsb2NrZWQgbWV0aG9kcyBzaHJpbmtzLlxuICBfbWF5YmVNaWdyYXRlKCkge1xuICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl9yZXRyeU1pZ3JhdGUgJiYgc2VsZi5fcmVhZHlUb01pZ3JhdGUoKSkge1xuICAgICAgc2VsZi5fcmV0cnlNaWdyYXRlKCk7XG4gICAgICBzZWxmLl9yZXRyeU1pZ3JhdGUgPSBudWxsO1xuICAgIH1cbiAgfVxuXG4gIG9uTWVzc2FnZShyYXdfbXNnKSB7XG4gICAgbGV0IG1zZztcbiAgICB0cnkge1xuICAgICAgbXNnID0gRERQQ29tbW9uLnBhcnNlRERQKHJhd19tc2cpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIE1ldGVvci5fZGVidWcoJ0V4Y2VwdGlvbiB3aGlsZSBwYXJzaW5nIEREUCcsIGUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIEFueSBtZXNzYWdlIGNvdW50cyBhcyByZWNlaXZpbmcgYSBwb25nLCBhcyBpdCBkZW1vbnN0cmF0ZXMgdGhhdFxuICAgIC8vIHRoZSBzZXJ2ZXIgaXMgc3RpbGwgYWxpdmUuXG4gICAgaWYgKHRoaXMuX2hlYXJ0YmVhdCkge1xuICAgICAgdGhpcy5faGVhcnRiZWF0Lm1lc3NhZ2VSZWNlaXZlZCgpO1xuICAgIH1cblxuICAgIGlmIChtc2cgPT09IG51bGwgfHwgIW1zZy5tc2cpIHtcbiAgICAgIGlmKCFtc2cgfHwgIW1zZy50ZXN0TWVzc2FnZU9uQ29ubmVjdCkge1xuICAgICAgICBpZiAoT2JqZWN0LmtleXMobXNnKS5sZW5ndGggPT09IDEgJiYgbXNnLnNlcnZlcl9pZCkgcmV0dXJuO1xuICAgICAgICBNZXRlb3IuX2RlYnVnKCdkaXNjYXJkaW5nIGludmFsaWQgbGl2ZWRhdGEgbWVzc2FnZScsIG1zZyk7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKG1zZy5tc2cgPT09ICdjb25uZWN0ZWQnKSB7XG4gICAgICB0aGlzLl92ZXJzaW9uID0gdGhpcy5fdmVyc2lvblN1Z2dlc3Rpb247XG4gICAgICB0aGlzLl9saXZlZGF0YV9jb25uZWN0ZWQobXNnKTtcbiAgICAgIHRoaXMub3B0aW9ucy5vbkNvbm5lY3RlZCgpO1xuICAgIH0gZWxzZSBpZiAobXNnLm1zZyA9PT0gJ2ZhaWxlZCcpIHtcbiAgICAgIGlmICh0aGlzLl9zdXBwb3J0ZWRERFBWZXJzaW9ucy5pbmRleE9mKG1zZy52ZXJzaW9uKSA+PSAwKSB7XG4gICAgICAgIHRoaXMuX3ZlcnNpb25TdWdnZXN0aW9uID0gbXNnLnZlcnNpb247XG4gICAgICAgIHRoaXMuX3N0cmVhbS5yZWNvbm5lY3QoeyBfZm9yY2U6IHRydWUgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBkZXNjcmlwdGlvbiA9XG4gICAgICAgICAgJ0REUCB2ZXJzaW9uIG5lZ290aWF0aW9uIGZhaWxlZDsgc2VydmVyIHJlcXVlc3RlZCB2ZXJzaW9uICcgK1xuICAgICAgICAgIG1zZy52ZXJzaW9uO1xuICAgICAgICB0aGlzLl9zdHJlYW0uZGlzY29ubmVjdCh7IF9wZXJtYW5lbnQ6IHRydWUsIF9lcnJvcjogZGVzY3JpcHRpb24gfSk7XG4gICAgICAgIHRoaXMub3B0aW9ucy5vbkREUFZlcnNpb25OZWdvdGlhdGlvbkZhaWx1cmUoZGVzY3JpcHRpb24pO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAobXNnLm1zZyA9PT0gJ3BpbmcnICYmIHRoaXMub3B0aW9ucy5yZXNwb25kVG9QaW5ncykge1xuICAgICAgdGhpcy5fc2VuZCh7IG1zZzogJ3BvbmcnLCBpZDogbXNnLmlkIH0pO1xuICAgIH0gZWxzZSBpZiAobXNnLm1zZyA9PT0gJ3BvbmcnKSB7XG4gICAgICAvLyBub29wLCBhcyB3ZSBhc3N1bWUgZXZlcnl0aGluZydzIGEgcG9uZ1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICBbJ2FkZGVkJywgJ2NoYW5nZWQnLCAncmVtb3ZlZCcsICdyZWFkeScsICd1cGRhdGVkJ10uaW5jbHVkZXMobXNnLm1zZylcbiAgICApIHtcbiAgICAgIHRoaXMuX2xpdmVkYXRhX2RhdGEobXNnKTtcbiAgICB9IGVsc2UgaWYgKG1zZy5tc2cgPT09ICdub3N1YicpIHtcbiAgICAgIHRoaXMuX2xpdmVkYXRhX25vc3ViKG1zZyk7XG4gICAgfSBlbHNlIGlmIChtc2cubXNnID09PSAncmVzdWx0Jykge1xuICAgICAgdGhpcy5fbGl2ZWRhdGFfcmVzdWx0KG1zZyk7XG4gICAgfSBlbHNlIGlmIChtc2cubXNnID09PSAnZXJyb3InKSB7XG4gICAgICB0aGlzLl9saXZlZGF0YV9lcnJvcihtc2cpO1xuICAgIH0gZWxzZSB7XG4gICAgICBNZXRlb3IuX2RlYnVnKCdkaXNjYXJkaW5nIHVua25vd24gbGl2ZWRhdGEgbWVzc2FnZSB0eXBlJywgbXNnKTtcbiAgICB9XG4gIH1cblxuICBvblJlc2V0KCkge1xuICAgIC8vIFNlbmQgYSBjb25uZWN0IG1lc3NhZ2UgYXQgdGhlIGJlZ2lubmluZyBvZiB0aGUgc3RyZWFtLlxuICAgIC8vIE5PVEU6IHJlc2V0IGlzIGNhbGxlZCBldmVuIG9uIHRoZSBmaXJzdCBjb25uZWN0aW9uLCBzbyB0aGlzIGlzXG4gICAgLy8gdGhlIG9ubHkgcGxhY2Ugd2Ugc2VuZCB0aGlzIG1lc3NhZ2UuXG4gICAgY29uc3QgbXNnID0geyBtc2c6ICdjb25uZWN0JyB9O1xuICAgIGlmICh0aGlzLl9sYXN0U2Vzc2lvbklkKSBtc2cuc2Vzc2lvbiA9IHRoaXMuX2xhc3RTZXNzaW9uSWQ7XG4gICAgbXNnLnZlcnNpb24gPSB0aGlzLl92ZXJzaW9uU3VnZ2VzdGlvbiB8fCB0aGlzLl9zdXBwb3J0ZWRERFBWZXJzaW9uc1swXTtcbiAgICB0aGlzLl92ZXJzaW9uU3VnZ2VzdGlvbiA9IG1zZy52ZXJzaW9uO1xuICAgIG1zZy5zdXBwb3J0ID0gdGhpcy5fc3VwcG9ydGVkRERQVmVyc2lvbnM7XG4gICAgdGhpcy5fc2VuZChtc2cpO1xuXG4gICAgLy8gTWFyayBub24tcmV0cnkgY2FsbHMgYXMgZmFpbGVkLiBUaGlzIGhhcyB0byBiZSBkb25lIGVhcmx5IGFzIGdldHRpbmcgdGhlc2UgbWV0aG9kcyBvdXQgb2YgdGhlXG4gICAgLy8gY3VycmVudCBibG9jayBpcyBwcmV0dHkgaW1wb3J0YW50IHRvIG1ha2luZyBzdXJlIHRoYXQgcXVpZXNjZW5jZSBpcyBwcm9wZXJseSBjYWxjdWxhdGVkLCBhc1xuICAgIC8vIHdlbGwgYXMgcG9zc2libHkgbW92aW5nIG9uIHRvIGFub3RoZXIgdXNlZnVsIGJsb2NrLlxuXG4gICAgLy8gT25seSBib3RoZXIgdGVzdGluZyBpZiB0aGVyZSBpcyBhbiBvdXRzdGFuZGluZ01ldGhvZEJsb2NrICh0aGVyZSBtaWdodCBub3QgYmUsIGVzcGVjaWFsbHkgaWZcbiAgICAvLyB3ZSBhcmUgY29ubmVjdGluZyBmb3IgdGhlIGZpcnN0IHRpbWUuXG4gICAgaWYgKHRoaXMuX291dHN0YW5kaW5nTWV0aG9kQmxvY2tzLmxlbmd0aCA+IDApIHtcbiAgICAgIC8vIElmIHRoZXJlIGlzIGFuIG91dHN0YW5kaW5nIG1ldGhvZCBibG9jaywgd2Ugb25seSBjYXJlIGFib3V0IHRoZSBmaXJzdCBvbmUgYXMgdGhhdCBpcyB0aGVcbiAgICAgIC8vIG9uZSB0aGF0IGNvdWxkIGhhdmUgYWxyZWFkeSBzZW50IG1lc3NhZ2VzIHdpdGggbm8gcmVzcG9uc2UsIHRoYXQgYXJlIG5vdCBhbGxvd2VkIHRvIHJldHJ5LlxuICAgICAgY29uc3QgY3VycmVudE1ldGhvZEJsb2NrID0gdGhpcy5fb3V0c3RhbmRpbmdNZXRob2RCbG9ja3NbMF0ubWV0aG9kcztcbiAgICAgIHRoaXMuX291dHN0YW5kaW5nTWV0aG9kQmxvY2tzWzBdLm1ldGhvZHMgPSBjdXJyZW50TWV0aG9kQmxvY2suZmlsdGVyKFxuICAgICAgICBtZXRob2RJbnZva2VyID0+IHtcbiAgICAgICAgICAvLyBNZXRob2RzIHdpdGggJ25vUmV0cnknIG9wdGlvbiBzZXQgYXJlIG5vdCBhbGxvd2VkIHRvIHJlLXNlbmQgYWZ0ZXJcbiAgICAgICAgICAvLyByZWNvdmVyaW5nIGRyb3BwZWQgY29ubmVjdGlvbi5cbiAgICAgICAgICBpZiAobWV0aG9kSW52b2tlci5zZW50TWVzc2FnZSAmJiBtZXRob2RJbnZva2VyLm5vUmV0cnkpIHtcbiAgICAgICAgICAgIC8vIE1ha2Ugc3VyZSB0aGF0IHRoZSBtZXRob2QgaXMgdG9sZCB0aGF0IGl0IGZhaWxlZC5cbiAgICAgICAgICAgIG1ldGhvZEludm9rZXIucmVjZWl2ZVJlc3VsdChcbiAgICAgICAgICAgICAgbmV3IE1ldGVvci5FcnJvcihcbiAgICAgICAgICAgICAgICAnaW52b2NhdGlvbi1mYWlsZWQnLFxuICAgICAgICAgICAgICAgICdNZXRob2QgaW52b2NhdGlvbiBtaWdodCBoYXZlIGZhaWxlZCBkdWUgdG8gZHJvcHBlZCBjb25uZWN0aW9uLiAnICtcbiAgICAgICAgICAgICAgICAgICdGYWlsaW5nIGJlY2F1c2UgYG5vUmV0cnlgIG9wdGlvbiB3YXMgcGFzc2VkIHRvIE1ldGVvci5hcHBseS4nXG4gICAgICAgICAgICAgIClcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gT25seSBrZWVwIGEgbWV0aG9kIGlmIGl0IHdhc24ndCBzZW50IG9yIGl0J3MgYWxsb3dlZCB0byByZXRyeS5cbiAgICAgICAgICAvLyBUaGlzIG1heSBsZWF2ZSB0aGUgYmxvY2sgZW1wdHksIGJ1dCB3ZSBkb24ndCBtb3ZlIG9uIHRvIHRoZSBuZXh0XG4gICAgICAgICAgLy8gYmxvY2sgdW50aWwgdGhlIGNhbGxiYWNrIGhhcyBiZWVuIGRlbGl2ZXJlZCwgaW4gX291dHN0YW5kaW5nTWV0aG9kRmluaXNoZWQuXG4gICAgICAgICAgcmV0dXJuICEobWV0aG9kSW52b2tlci5zZW50TWVzc2FnZSAmJiBtZXRob2RJbnZva2VyLm5vUmV0cnkpO1xuICAgICAgICB9XG4gICAgICApO1xuICAgIH1cblxuICAgIC8vIE5vdywgdG8gbWluaW1pemUgc2V0dXAgbGF0ZW5jeSwgZ28gYWhlYWQgYW5kIGJsYXN0IG91dCBhbGwgb2ZcbiAgICAvLyBvdXIgcGVuZGluZyBtZXRob2RzIGFuZHMgc3Vic2NyaXB0aW9ucyBiZWZvcmUgd2UndmUgZXZlbiB0YWtlblxuICAgIC8vIHRoZSBuZWNlc3NhcnkgUlRUIHRvIGtub3cgaWYgd2Ugc3VjY2Vzc2Z1bGx5IHJlY29ubmVjdGVkLiAoMSlcbiAgICAvLyBUaGV5J3JlIHN1cHBvc2VkIHRvIGJlIGlkZW1wb3RlbnQsIGFuZCB3aGVyZSB0aGV5IGFyZSBub3QsXG4gICAgLy8gdGhleSBjYW4gYmxvY2sgcmV0cnkgaW4gYXBwbHk7ICgyKSBldmVuIGlmIHdlIGRpZCByZWNvbm5lY3QsXG4gICAgLy8gd2UncmUgbm90IHN1cmUgd2hhdCBtZXNzYWdlcyBtaWdodCBoYXZlIGdvdHRlbiBsb3N0XG4gICAgLy8gKGluIGVpdGhlciBkaXJlY3Rpb24pIHNpbmNlIHdlIHdlcmUgZGlzY29ubmVjdGVkIChUQ1AgYmVpbmdcbiAgICAvLyBzbG9wcHkgYWJvdXQgdGhhdC4pXG5cbiAgICAvLyBJZiB0aGUgY3VycmVudCBibG9jayBvZiBtZXRob2RzIGFsbCBnb3QgdGhlaXIgcmVzdWx0cyAoYnV0IGRpZG4ndCBhbGwgZ2V0XG4gICAgLy8gdGhlaXIgZGF0YSB2aXNpYmxlKSwgZGlzY2FyZCB0aGUgZW1wdHkgYmxvY2sgbm93LlxuICAgIGlmIChcbiAgICAgIHRoaXMuX291dHN0YW5kaW5nTWV0aG9kQmxvY2tzLmxlbmd0aCA+IDAgJiZcbiAgICAgIHRoaXMuX291dHN0YW5kaW5nTWV0aG9kQmxvY2tzWzBdLm1ldGhvZHMubGVuZ3RoID09PSAwXG4gICAgKSB7XG4gICAgICB0aGlzLl9vdXRzdGFuZGluZ01ldGhvZEJsb2Nrcy5zaGlmdCgpO1xuICAgIH1cblxuICAgIC8vIE1hcmsgYWxsIG1lc3NhZ2VzIGFzIHVuc2VudCwgdGhleSBoYXZlIG5vdCB5ZXQgYmVlbiBzZW50IG9uIHRoaXNcbiAgICAvLyBjb25uZWN0aW9uLlxuICAgIGtleXModGhpcy5fbWV0aG9kSW52b2tlcnMpLmZvckVhY2goaWQgPT4ge1xuICAgICAgdGhpcy5fbWV0aG9kSW52b2tlcnNbaWRdLnNlbnRNZXNzYWdlID0gZmFsc2U7XG4gICAgfSk7XG5cbiAgICAvLyBJZiBhbiBgb25SZWNvbm5lY3RgIGhhbmRsZXIgaXMgc2V0LCBjYWxsIGl0IGZpcnN0LiBHbyB0aHJvdWdoXG4gICAgLy8gc29tZSBob29wcyB0byBlbnN1cmUgdGhhdCBtZXRob2RzIHRoYXQgYXJlIGNhbGxlZCBmcm9tIHdpdGhpblxuICAgIC8vIGBvblJlY29ubmVjdGAgZ2V0IGV4ZWN1dGVkIF9iZWZvcmVfIG9uZXMgdGhhdCB3ZXJlIG9yaWdpbmFsbHlcbiAgICAvLyBvdXRzdGFuZGluZyAoc2luY2UgYG9uUmVjb25uZWN0YCBpcyB1c2VkIHRvIHJlLWVzdGFibGlzaCBhdXRoXG4gICAgLy8gY2VydGlmaWNhdGVzKVxuICAgIHRoaXMuX2NhbGxPblJlY29ubmVjdEFuZFNlbmRBcHByb3ByaWF0ZU91dHN0YW5kaW5nTWV0aG9kcygpO1xuXG4gICAgLy8gYWRkIG5ldyBzdWJzY3JpcHRpb25zIGF0IHRoZSBlbmQuIHRoaXMgd2F5IHRoZXkgdGFrZSBlZmZlY3QgYWZ0ZXJcbiAgICAvLyB0aGUgaGFuZGxlcnMgYW5kIHdlIGRvbid0IHNlZSBmbGlja2VyLlxuICAgIE9iamVjdC5lbnRyaWVzKHRoaXMuX3N1YnNjcmlwdGlvbnMpLmZvckVhY2goKFtpZCwgc3ViXSkgPT4ge1xuICAgICAgdGhpcy5fc2VuZCh7XG4gICAgICAgIG1zZzogJ3N1YicsXG4gICAgICAgIGlkOiBpZCxcbiAgICAgICAgbmFtZTogc3ViLm5hbWUsXG4gICAgICAgIHBhcmFtczogc3ViLnBhcmFtc1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbn1cbiIsImltcG9ydCB7IEREUENvbW1vbiB9IGZyb20gJ21ldGVvci9kZHAtY29tbW9uJztcbmltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InO1xuXG5pbXBvcnQgeyBDb25uZWN0aW9uIH0gZnJvbSAnLi9saXZlZGF0YV9jb25uZWN0aW9uLmpzJztcblxuLy8gVGhpcyBhcnJheSBhbGxvd3MgdGhlIGBfYWxsU3Vic2NyaXB0aW9uc1JlYWR5YCBtZXRob2QgYmVsb3csIHdoaWNoXG4vLyBpcyB1c2VkIGJ5IHRoZSBgc3BpZGVyYWJsZWAgcGFja2FnZSwgdG8ga2VlcCB0cmFjayBvZiB3aGV0aGVyIGFsbFxuLy8gZGF0YSBpcyByZWFkeS5cbmNvbnN0IGFsbENvbm5lY3Rpb25zID0gW107XG5cbi8qKlxuICogQG5hbWVzcGFjZSBERFBcbiAqIEBzdW1tYXJ5IE5hbWVzcGFjZSBmb3IgRERQLXJlbGF0ZWQgbWV0aG9kcy9jbGFzc2VzLlxuICovXG5leHBvcnQgY29uc3QgRERQID0ge307XG5cbi8vIFRoaXMgaXMgcHJpdmF0ZSBidXQgaXQncyB1c2VkIGluIGEgZmV3IHBsYWNlcy4gYWNjb3VudHMtYmFzZSB1c2VzXG4vLyBpdCB0byBnZXQgdGhlIGN1cnJlbnQgdXNlci4gTWV0ZW9yLnNldFRpbWVvdXQgYW5kIGZyaWVuZHMgY2xlYXJcbi8vIGl0LiBXZSBjYW4gcHJvYmFibHkgZmluZCBhIGJldHRlciB3YXkgdG8gZmFjdG9yIHRoaXMuXG5ERFAuX0N1cnJlbnRNZXRob2RJbnZvY2F0aW9uID0gbmV3IE1ldGVvci5FbnZpcm9ubWVudFZhcmlhYmxlKCk7XG5ERFAuX0N1cnJlbnRQdWJsaWNhdGlvbkludm9jYXRpb24gPSBuZXcgTWV0ZW9yLkVudmlyb25tZW50VmFyaWFibGUoKTtcblxuLy8gWFhYOiBLZWVwIEREUC5fQ3VycmVudEludm9jYXRpb24gZm9yIGJhY2t3YXJkcy1jb21wYXRpYmlsaXR5LlxuRERQLl9DdXJyZW50SW52b2NhdGlvbiA9IEREUC5fQ3VycmVudE1ldGhvZEludm9jYXRpb247XG5cbi8vIFRoaXMgaXMgcGFzc2VkIGludG8gYSB3ZWlyZCBgbWFrZUVycm9yVHlwZWAgZnVuY3Rpb24gdGhhdCBleHBlY3RzIGl0cyB0aGluZ1xuLy8gdG8gYmUgYSBjb25zdHJ1Y3RvclxuZnVuY3Rpb24gY29ubmVjdGlvbkVycm9yQ29uc3RydWN0b3IobWVzc2FnZSkge1xuICB0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xufVxuXG5ERFAuQ29ubmVjdGlvbkVycm9yID0gTWV0ZW9yLm1ha2VFcnJvclR5cGUoXG4gICdERFAuQ29ubmVjdGlvbkVycm9yJyxcbiAgY29ubmVjdGlvbkVycm9yQ29uc3RydWN0b3Jcbik7XG5cbkREUC5Gb3JjZWRSZWNvbm5lY3RFcnJvciA9IE1ldGVvci5tYWtlRXJyb3JUeXBlKFxuICAnRERQLkZvcmNlZFJlY29ubmVjdEVycm9yJyxcbiAgKCkgPT4ge31cbik7XG5cbi8vIFJldHVybnMgdGhlIG5hbWVkIHNlcXVlbmNlIG9mIHBzZXVkby1yYW5kb20gdmFsdWVzLlxuLy8gVGhlIHNjb3BlIHdpbGwgYmUgRERQLl9DdXJyZW50TWV0aG9kSW52b2NhdGlvbi5nZXQoKSwgc28gdGhlIHN0cmVhbSB3aWxsIHByb2R1Y2Vcbi8vIGNvbnNpc3RlbnQgdmFsdWVzIGZvciBtZXRob2QgY2FsbHMgb24gdGhlIGNsaWVudCBhbmQgc2VydmVyLlxuRERQLnJhbmRvbVN0cmVhbSA9IG5hbWUgPT4ge1xuICBjb25zdCBzY29wZSA9IEREUC5fQ3VycmVudE1ldGhvZEludm9jYXRpb24uZ2V0KCk7XG4gIHJldHVybiBERFBDb21tb24uUmFuZG9tU3RyZWFtLmdldChzY29wZSwgbmFtZSk7XG59O1xuXG4vLyBAcGFyYW0gdXJsIHtTdHJpbmd9IFVSTCB0byBNZXRlb3IgYXBwLFxuLy8gICAgIGUuZy46XG4vLyAgICAgXCJzdWJkb21haW4ubWV0ZW9yLmNvbVwiLFxuLy8gICAgIFwiaHR0cDovL3N1YmRvbWFpbi5tZXRlb3IuY29tXCIsXG4vLyAgICAgXCIvXCIsXG4vLyAgICAgXCJkZHArc29ja2pzOi8vZGRwLS0qKioqLWZvby5tZXRlb3IuY29tL3NvY2tqc1wiXG5cbi8qKlxuICogQHN1bW1hcnkgQ29ubmVjdCB0byB0aGUgc2VydmVyIG9mIGEgZGlmZmVyZW50IE1ldGVvciBhcHBsaWNhdGlvbiB0byBzdWJzY3JpYmUgdG8gaXRzIGRvY3VtZW50IHNldHMgYW5kIGludm9rZSBpdHMgcmVtb3RlIG1ldGhvZHMuXG4gKiBAbG9jdXMgQW55d2hlcmVcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmwgVGhlIFVSTCBvZiBhbm90aGVyIE1ldGVvciBhcHBsaWNhdGlvbi5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0aW9ucy5yZWxvYWRXaXRoT3V0c3RhbmRpbmcgaXMgaXQgT0sgdG8gcmVsb2FkIGlmIHRoZXJlIGFyZSBvdXRzdGFuZGluZyBtZXRob2RzP1xuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMuaGVhZGVycyBleHRyYSBoZWFkZXJzIHRvIHNlbmQgb24gdGhlIHdlYnNvY2tldHMgY29ubmVjdGlvbiwgZm9yIHNlcnZlci10by1zZXJ2ZXIgRERQIG9ubHlcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zLl9zb2NranNPcHRpb25zIFNwZWNpZmllcyBvcHRpb25zIHRvIHBhc3MgdGhyb3VnaCB0byB0aGUgc29ja2pzIGNsaWVudFxuICogQHBhcmFtIHtGdW5jdGlvbn0gb3B0aW9ucy5vbkREUE5lZ290aWF0aW9uVmVyc2lvbkZhaWx1cmUgY2FsbGJhY2sgd2hlbiB2ZXJzaW9uIG5lZ290aWF0aW9uIGZhaWxzLlxuICovXG5ERFAuY29ubmVjdCA9ICh1cmwsIG9wdGlvbnMpID0+IHtcbiAgY29uc3QgcmV0ID0gbmV3IENvbm5lY3Rpb24odXJsLCBvcHRpb25zKTtcbiAgYWxsQ29ubmVjdGlvbnMucHVzaChyZXQpOyAvLyBoYWNrLiBzZWUgYmVsb3cuXG4gIHJldHVybiByZXQ7XG59O1xuXG5ERFAuX3JlY29ubmVjdEhvb2sgPSBuZXcgSG9vayh7IGJpbmRFbnZpcm9ubWVudDogZmFsc2UgfSk7XG5cbi8qKlxuICogQHN1bW1hcnkgUmVnaXN0ZXIgYSBmdW5jdGlvbiB0byBjYWxsIGFzIHRoZSBmaXJzdCBzdGVwIG9mXG4gKiByZWNvbm5lY3RpbmcuIFRoaXMgZnVuY3Rpb24gY2FuIGNhbGwgbWV0aG9kcyB3aGljaCB3aWxsIGJlIGV4ZWN1dGVkIGJlZm9yZVxuICogYW55IG90aGVyIG91dHN0YW5kaW5nIG1ldGhvZHMuIEZvciBleGFtcGxlLCB0aGlzIGNhbiBiZSB1c2VkIHRvIHJlLWVzdGFibGlzaFxuICogdGhlIGFwcHJvcHJpYXRlIGF1dGhlbnRpY2F0aW9uIGNvbnRleHQgb24gdGhlIGNvbm5lY3Rpb24uXG4gKiBAbG9jdXMgQW55d2hlcmVcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIFRoZSBmdW5jdGlvbiB0byBjYWxsLiBJdCB3aWxsIGJlIGNhbGxlZCB3aXRoIGFcbiAqIHNpbmdsZSBhcmd1bWVudCwgdGhlIFtjb25uZWN0aW9uIG9iamVjdF0oI2RkcF9jb25uZWN0KSB0aGF0IGlzIHJlY29ubmVjdGluZy5cbiAqL1xuRERQLm9uUmVjb25uZWN0ID0gY2FsbGJhY2sgPT4gRERQLl9yZWNvbm5lY3RIb29rLnJlZ2lzdGVyKGNhbGxiYWNrKTtcblxuLy8gSGFjayBmb3IgYHNwaWRlcmFibGVgIHBhY2thZ2U6IGEgd2F5IHRvIHNlZSBpZiB0aGUgcGFnZSBpcyBkb25lXG4vLyBsb2FkaW5nIGFsbCB0aGUgZGF0YSBpdCBuZWVkcy5cbi8vXG5ERFAuX2FsbFN1YnNjcmlwdGlvbnNSZWFkeSA9ICgpID0+IGFsbENvbm5lY3Rpb25zLmV2ZXJ5KFxuICBjb25uID0+IE9iamVjdC52YWx1ZXMoY29ubi5fc3Vic2NyaXB0aW9ucykuZXZlcnkoc3ViID0+IHN1Yi5yZWFkeSlcbik7XG4iXX0=
