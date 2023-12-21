(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var check = Package.check.check;
var Match = Package.check.Match;
var Random = Package.random.Random;
var EJSON = Package.ejson.EJSON;
var _ = Package.underscore._;
var Retry = Package.retry.Retry;
var MongoID = Package['mongo-id'].MongoID;
var DiffSequence = Package['diff-sequence'].DiffSequence;
var ECMAScript = Package.ecmascript.ECMAScript;
var DDPCommon = Package['ddp-common'].DDPCommon;
var DDP = Package['ddp-client'].DDP;
var WebApp = Package.webapp.WebApp;
var WebAppInternals = Package.webapp.WebAppInternals;
var main = Package.webapp.main;
var RoutePolicy = Package.routepolicy.RoutePolicy;
var Hook = Package['callback-hook'].Hook;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var StreamServer, DDPServer, id, Server;

var require = meteorInstall({"node_modules":{"meteor":{"ddp-server":{"stream_server.js":function module(require){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/ddp-server/stream_server.js                                                                              //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
// By default, we use the permessage-deflate extension with default
// configuration. If $SERVER_WEBSOCKET_COMPRESSION is set, then it must be valid
// JSON. If it represents a falsey value, then we do not use permessage-deflate
// at all; otherwise, the JSON value is used as an argument to deflate's
// configure method; see
// https://github.com/faye/permessage-deflate-node/blob/master/README.md
//
// (We do this in an _.once instead of at startup, because we don't want to
// crash the tool during isopacket load if your JSON doesn't parse. This is only
// a problem because the tool has to load the DDP server code just in order to
// be a DDP client; see https://github.com/meteor/meteor/issues/3452 .)
var websocketExtensions = _.once(function () {
  var extensions = [];
  var websocketCompressionConfig = process.env.SERVER_WEBSOCKET_COMPRESSION ? JSON.parse(process.env.SERVER_WEBSOCKET_COMPRESSION) : {};
  if (websocketCompressionConfig) {
    extensions.push(Npm.require('permessage-deflate').configure(websocketCompressionConfig));
  }
  return extensions;
});
var pathPrefix = __meteor_runtime_config__.ROOT_URL_PATH_PREFIX || "";
StreamServer = function () {
  var self = this;
  self.registration_callbacks = [];
  self.open_sockets = [];

  // Because we are installing directly onto WebApp.httpServer instead of using
  // WebApp.app, we have to process the path prefix ourselves.
  self.prefix = pathPrefix + '/sockjs';
  RoutePolicy.declare(self.prefix + '/', 'network');

  // set up sockjs
  var sockjs = Npm.require('sockjs');
  var serverOptions = {
    prefix: self.prefix,
    log: function () {},
    // this is the default, but we code it explicitly because we depend
    // on it in stream_client:HEARTBEAT_TIMEOUT
    heartbeat_delay: 45000,
    // The default disconnect_delay is 5 seconds, but if the server ends up CPU
    // bound for that much time, SockJS might not notice that the user has
    // reconnected because the timer (of disconnect_delay ms) can fire before
    // SockJS processes the new connection. Eventually we'll fix this by not
    // combining CPU-heavy processing with SockJS termination (eg a proxy which
    // converts to Unix sockets) but for now, raise the delay.
    disconnect_delay: 60 * 1000,
    // Allow disabling of CORS requests to address
    // https://github.com/meteor/meteor/issues/8317.
    disable_cors: !!process.env.DISABLE_SOCKJS_CORS,
    // Set the USE_JSESSIONID environment variable to enable setting the
    // JSESSIONID cookie. This is useful for setting up proxies with
    // session affinity.
    jsessionid: !!process.env.USE_JSESSIONID
  };

  // If you know your server environment (eg, proxies) will prevent websockets
  // from ever working, set $DISABLE_WEBSOCKETS and SockJS clients (ie,
  // browsers) will not waste time attempting to use them.
  // (Your server will still have a /websocket endpoint.)
  if (process.env.DISABLE_WEBSOCKETS) {
    serverOptions.websocket = false;
  } else {
    serverOptions.faye_server_options = {
      extensions: websocketExtensions()
    };
  }
  self.server = sockjs.createServer(serverOptions);

  // Install the sockjs handlers, but we want to keep around our own particular
  // request handler that adjusts idle timeouts while we have an outstanding
  // request.  This compensates for the fact that sockjs removes all listeners
  // for "request" to add its own.
  WebApp.httpServer.removeListener('request', WebApp._timeoutAdjustmentRequestCallback);
  self.server.installHandlers(WebApp.httpServer);
  WebApp.httpServer.addListener('request', WebApp._timeoutAdjustmentRequestCallback);

  // Support the /websocket endpoint
  self._redirectWebsocketEndpoint();
  self.server.on('connection', function (socket) {
    // sockjs sometimes passes us null instead of a socket object
    // so we need to guard against that. see:
    // https://github.com/sockjs/sockjs-node/issues/121
    // https://github.com/meteor/meteor/issues/10468
    if (!socket) return;

    // We want to make sure that if a client connects to us and does the initial
    // Websocket handshake but never gets to the DDP handshake, that we
    // eventually kill the socket.  Once the DDP handshake happens, DDP
    // heartbeating will work. And before the Websocket handshake, the timeouts
    // we set at the server level in webapp_server.js will work. But
    // faye-websocket calls setTimeout(0) on any socket it takes over, so there
    // is an "in between" state where this doesn't happen.  We work around this
    // by explicitly setting the socket timeout to a relatively large time here,
    // and setting it back to zero when we set up the heartbeat in
    // livedata_server.js.
    socket.setWebsocketTimeout = function (timeout) {
      if ((socket.protocol === 'websocket' || socket.protocol === 'websocket-raw') && socket._session.recv) {
        socket._session.recv.connection.setTimeout(timeout);
      }
    };
    socket.setWebsocketTimeout(45 * 1000);
    socket.send = function (data) {
      socket.write(data);
    };
    socket.on('close', function () {
      self.open_sockets = _.without(self.open_sockets, socket);
    });
    self.open_sockets.push(socket);

    // only to send a message after connection on tests, useful for
    // socket-stream-client/server-tests.js
    if (process.env.TEST_METADATA && process.env.TEST_METADATA !== "{}") {
      socket.send(JSON.stringify({
        testMessageOnConnect: true
      }));
    }

    // call all our callbacks when we get a new socket. they will do the
    // work of setting up handlers and such for specific messages.
    _.each(self.registration_callbacks, function (callback) {
      callback(socket);
    });
  });
};
Object.assign(StreamServer.prototype, {
  // call my callback when a new socket connects.
  // also call it for all current connections.
  register: function (callback) {
    var self = this;
    self.registration_callbacks.push(callback);
    _.each(self.all_sockets(), function (socket) {
      callback(socket);
    });
  },
  // get a list of all sockets
  all_sockets: function () {
    var self = this;
    return _.values(self.open_sockets);
  },
  // Redirect /websocket to /sockjs/websocket in order to not expose
  // sockjs to clients that want to use raw websockets
  _redirectWebsocketEndpoint: function () {
    var self = this;
    // Unfortunately we can't use a connect middleware here since
    // sockjs installs itself prior to all existing listeners
    // (meaning prior to any connect middlewares) so we need to take
    // an approach similar to overshadowListeners in
    // https://github.com/sockjs/sockjs-node/blob/cf820c55af6a9953e16558555a31decea554f70e/src/utils.coffee
    ['request', 'upgrade'].forEach(event => {
      var httpServer = WebApp.httpServer;
      var oldHttpServerListeners = httpServer.listeners(event).slice(0);
      httpServer.removeAllListeners(event);

      // request and upgrade have different arguments passed but
      // we only care about the first one which is always request
      var newListener = function (request /*, moreArguments */) {
        // Store arguments for use within the closure below
        var args = arguments;

        // TODO replace with url package
        var url = Npm.require('url');

        // Rewrite /websocket and /websocket/ urls to /sockjs/websocket while
        // preserving query string.
        var parsedUrl = url.parse(request.url);
        if (parsedUrl.pathname === pathPrefix + '/websocket' || parsedUrl.pathname === pathPrefix + '/websocket/') {
          parsedUrl.pathname = self.prefix + '/websocket';
          request.url = url.format(parsedUrl);
        }
        _.each(oldHttpServerListeners, function (oldListener) {
          oldListener.apply(httpServer, args);
        });
      };
      httpServer.addListener(event, newListener);
    });
  }
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"livedata_server.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/ddp-server/livedata_server.js                                                                            //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
let _objectSpread;
module.link("@babel/runtime/helpers/objectSpread2", {
  default(v) {
    _objectSpread = v;
  }
}, 0);
DDPServer = {};
var Fiber = Npm.require('fibers');

// Publication strategies define how we handle data from published cursors at the collection level
// This allows someone to:
// - Choose a trade-off between client-server bandwidth and server memory usage
// - Implement special (non-mongo) collections like volatile message queues
const publicationStrategies = {
  // SERVER_MERGE is the default strategy.
  // When using this strategy, the server maintains a copy of all data a connection is subscribed to.
  // This allows us to only send deltas over multiple publications.
  SERVER_MERGE: {
    useDummyDocumentView: false,
    useCollectionView: true,
    doAccountingForCollection: true
  },
  // The NO_MERGE_NO_HISTORY strategy results in the server sending all publication data
  // directly to the client. It does not remember what it has previously sent
  // to it will not trigger removed messages when a subscription is stopped.
  // This should only be chosen for special use cases like send-and-forget queues.
  NO_MERGE_NO_HISTORY: {
    useDummyDocumentView: false,
    useCollectionView: false,
    doAccountingForCollection: false
  },
  // NO_MERGE is similar to NO_MERGE_NO_HISTORY but the server will remember the IDs it has
  // sent to the client so it can remove them when a subscription is stopped.
  // This strategy can be used when a collection is only used in a single publication.
  NO_MERGE: {
    useDummyDocumentView: false,
    useCollectionView: false,
    doAccountingForCollection: true
  },
  // NO_MERGE_MULTI is similar to `NO_MERGE`, but it does track whether a document is
  // used by multiple publications. This has some memory overhead, but it still does not do
  // diffing so it's faster and slimmer than SERVER_MERGE.
  NO_MERGE_MULTI: {
    useDummyDocumentView: true,
    useCollectionView: true,
    doAccountingForCollection: true
  }
};
DDPServer.publicationStrategies = publicationStrategies;

// This file contains classes:
// * Session - The server's connection to a single DDP client
// * Subscription - A single subscription for a single client
// * Server - An entire server that may talk to > 1 client. A DDP endpoint.
//
// Session and Subscription are file scope. For now, until we freeze
// the interface, Server is package scope (in the future it should be
// exported).
var DummyDocumentView = function () {
  var self = this;
  self.existsIn = new Set(); // set of subscriptionHandle
  self.dataByKey = new Map(); // key-> [ {subscriptionHandle, value} by precedence]
};
Object.assign(DummyDocumentView.prototype, {
  getFields: function () {
    return {};
  },
  clearField: function (subscriptionHandle, key, changeCollector) {
    changeCollector[key] = undefined;
  },
  changeField: function (subscriptionHandle, key, value, changeCollector, isAdd) {
    changeCollector[key] = value;
  }
});

// Represents a single document in a SessionCollectionView
var SessionDocumentView = function () {
  var self = this;
  self.existsIn = new Set(); // set of subscriptionHandle
  self.dataByKey = new Map(); // key-> [ {subscriptionHandle, value} by precedence]
};
DDPServer._SessionDocumentView = SessionDocumentView;
_.extend(SessionDocumentView.prototype, {
  getFields: function () {
    var self = this;
    var ret = {};
    self.dataByKey.forEach(function (precedenceList, key) {
      ret[key] = precedenceList[0].value;
    });
    return ret;
  },
  clearField: function (subscriptionHandle, key, changeCollector) {
    var self = this;
    // Publish API ignores _id if present in fields
    if (key === "_id") return;
    var precedenceList = self.dataByKey.get(key);

    // It's okay to clear fields that didn't exist. No need to throw
    // an error.
    if (!precedenceList) return;
    var removedValue = undefined;
    for (var i = 0; i < precedenceList.length; i++) {
      var precedence = precedenceList[i];
      if (precedence.subscriptionHandle === subscriptionHandle) {
        // The view's value can only change if this subscription is the one that
        // used to have precedence.
        if (i === 0) removedValue = precedence.value;
        precedenceList.splice(i, 1);
        break;
      }
    }
    if (precedenceList.length === 0) {
      self.dataByKey.delete(key);
      changeCollector[key] = undefined;
    } else if (removedValue !== undefined && !EJSON.equals(removedValue, precedenceList[0].value)) {
      changeCollector[key] = precedenceList[0].value;
    }
  },
  changeField: function (subscriptionHandle, key, value, changeCollector, isAdd) {
    var self = this;
    // Publish API ignores _id if present in fields
    if (key === "_id") return;

    // Don't share state with the data passed in by the user.
    value = EJSON.clone(value);
    if (!self.dataByKey.has(key)) {
      self.dataByKey.set(key, [{
        subscriptionHandle: subscriptionHandle,
        value: value
      }]);
      changeCollector[key] = value;
      return;
    }
    var precedenceList = self.dataByKey.get(key);
    var elt;
    if (!isAdd) {
      elt = precedenceList.find(function (precedence) {
        return precedence.subscriptionHandle === subscriptionHandle;
      });
    }
    if (elt) {
      if (elt === precedenceList[0] && !EJSON.equals(value, elt.value)) {
        // this subscription is changing the value of this field.
        changeCollector[key] = value;
      }
      elt.value = value;
    } else {
      // this subscription is newly caring about this field
      precedenceList.push({
        subscriptionHandle: subscriptionHandle,
        value: value
      });
    }
  }
});

/**
 * Represents a client's view of a single collection
 * @param {String} collectionName Name of the collection it represents
 * @param {Object.<String, Function>} sessionCallbacks The callbacks for added, changed, removed
 * @class SessionCollectionView
 */
var SessionCollectionView = function (collectionName, sessionCallbacks) {
  var self = this;
  self.collectionName = collectionName;
  self.documents = new Map();
  self.callbacks = sessionCallbacks;
};
DDPServer._SessionCollectionView = SessionCollectionView;
Object.assign(SessionCollectionView.prototype, {
  isEmpty: function () {
    var self = this;
    return self.documents.size === 0;
  },
  diff: function (previous) {
    var self = this;
    DiffSequence.diffMaps(previous.documents, self.documents, {
      both: _.bind(self.diffDocument, self),
      rightOnly: function (id, nowDV) {
        self.callbacks.added(self.collectionName, id, nowDV.getFields());
      },
      leftOnly: function (id, prevDV) {
        self.callbacks.removed(self.collectionName, id);
      }
    });
  },
  diffDocument: function (id, prevDV, nowDV) {
    var self = this;
    var fields = {};
    DiffSequence.diffObjects(prevDV.getFields(), nowDV.getFields(), {
      both: function (key, prev, now) {
        if (!EJSON.equals(prev, now)) fields[key] = now;
      },
      rightOnly: function (key, now) {
        fields[key] = now;
      },
      leftOnly: function (key, prev) {
        fields[key] = undefined;
      }
    });
    self.callbacks.changed(self.collectionName, id, fields);
  },
  added: function (subscriptionHandle, id, fields) {
    var self = this;
    var docView = self.documents.get(id);
    var added = false;
    if (!docView) {
      added = true;
      if (Meteor.server.getPublicationStrategy(this.collectionName).useDummyDocumentView) {
        docView = new DummyDocumentView();
      } else {
        docView = new SessionDocumentView();
      }
      self.documents.set(id, docView);
    }
    docView.existsIn.add(subscriptionHandle);
    var changeCollector = {};
    _.each(fields, function (value, key) {
      docView.changeField(subscriptionHandle, key, value, changeCollector, true);
    });
    if (added) self.callbacks.added(self.collectionName, id, changeCollector);else self.callbacks.changed(self.collectionName, id, changeCollector);
  },
  changed: function (subscriptionHandle, id, changed) {
    var self = this;
    var changedResult = {};
    var docView = self.documents.get(id);
    if (!docView) throw new Error("Could not find element with id " + id + " to change");
    _.each(changed, function (value, key) {
      if (value === undefined) docView.clearField(subscriptionHandle, key, changedResult);else docView.changeField(subscriptionHandle, key, value, changedResult);
    });
    self.callbacks.changed(self.collectionName, id, changedResult);
  },
  removed: function (subscriptionHandle, id) {
    var self = this;
    var docView = self.documents.get(id);
    if (!docView) {
      var err = new Error("Removed nonexistent document " + id);
      throw err;
    }
    docView.existsIn.delete(subscriptionHandle);
    if (docView.existsIn.size === 0) {
      // it is gone from everyone
      self.callbacks.removed(self.collectionName, id);
      self.documents.delete(id);
    } else {
      var changed = {};
      // remove this subscription from every precedence list
      // and record the changes
      docView.dataByKey.forEach(function (precedenceList, key) {
        docView.clearField(subscriptionHandle, key, changed);
      });
      self.callbacks.changed(self.collectionName, id, changed);
    }
  }
});

/******************************************************************************/
/* Session                                                                    */
/******************************************************************************/

var Session = function (server, version, socket, options) {
  var self = this;
  self.id = Random.id();
  self.server = server;
  self.version = version;
  self.initialized = false;
  self.socket = socket;

  // Set to null when the session is destroyed. Multiple places below
  // use this to determine if the session is alive or not.
  self.inQueue = new Meteor._DoubleEndedQueue();
  self.blocked = false;
  self.workerRunning = false;
  self.cachedUnblock = null;

  // Sub objects for active subscriptions
  self._namedSubs = new Map();
  self._universalSubs = [];
  self.userId = null;
  self.collectionViews = new Map();

  // Set this to false to not send messages when collectionViews are
  // modified. This is done when rerunning subs in _setUserId and those messages
  // are calculated via a diff instead.
  self._isSending = true;

  // If this is true, don't start a newly-created universal publisher on this
  // session. The session will take care of starting it when appropriate.
  self._dontStartNewUniversalSubs = false;

  // When we are rerunning subscriptions, any ready messages
  // we want to buffer up for when we are done rerunning subscriptions
  self._pendingReady = [];

  // List of callbacks to call when this connection is closed.
  self._closeCallbacks = [];

  // XXX HACK: If a sockjs connection, save off the URL. This is
  // temporary and will go away in the near future.
  self._socketUrl = socket.url;

  // Allow tests to disable responding to pings.
  self._respondToPings = options.respondToPings;

  // This object is the public interface to the session. In the public
  // API, it is called the `connection` object.  Internally we call it
  // a `connectionHandle` to avoid ambiguity.
  self.connectionHandle = {
    id: self.id,
    close: function () {
      self.close();
    },
    onClose: function (fn) {
      var cb = Meteor.bindEnvironment(fn, "connection onClose callback");
      if (self.inQueue) {
        self._closeCallbacks.push(cb);
      } else {
        // if we're already closed, call the callback.
        Meteor.defer(cb);
      }
    },
    clientAddress: self._clientAddress(),
    httpHeaders: self.socket.headers
  };
  self.send({
    msg: 'connected',
    session: self.id
  });

  // On initial connect, spin up all the universal publishers.
  Fiber(function () {
    self.startUniversalSubs();
  }).run();
  if (version !== 'pre1' && options.heartbeatInterval !== 0) {
    // We no longer need the low level timeout because we have heartbeats.
    socket.setWebsocketTimeout(0);
    self.heartbeat = new DDPCommon.Heartbeat({
      heartbeatInterval: options.heartbeatInterval,
      heartbeatTimeout: options.heartbeatTimeout,
      onTimeout: function () {
        self.close();
      },
      sendPing: function () {
        self.send({
          msg: 'ping'
        });
      }
    });
    self.heartbeat.start();
  }
  Package['facts-base'] && Package['facts-base'].Facts.incrementServerFact("livedata", "sessions", 1);
};
Object.assign(Session.prototype, {
  sendReady: function (subscriptionIds) {
    var self = this;
    if (self._isSending) self.send({
      msg: "ready",
      subs: subscriptionIds
    });else {
      _.each(subscriptionIds, function (subscriptionId) {
        self._pendingReady.push(subscriptionId);
      });
    }
  },
  _canSend(collectionName) {
    return this._isSending || !this.server.getPublicationStrategy(collectionName).useCollectionView;
  },
  sendAdded(collectionName, id, fields) {
    if (this._canSend(collectionName)) this.send({
      msg: "added",
      collection: collectionName,
      id,
      fields
    });
  },
  sendChanged(collectionName, id, fields) {
    if (_.isEmpty(fields)) return;
    if (this._canSend(collectionName)) {
      this.send({
        msg: "changed",
        collection: collectionName,
        id,
        fields
      });
    }
  },
  sendRemoved(collectionName, id) {
    if (this._canSend(collectionName)) this.send({
      msg: "removed",
      collection: collectionName,
      id
    });
  },
  getSendCallbacks: function () {
    var self = this;
    return {
      added: _.bind(self.sendAdded, self),
      changed: _.bind(self.sendChanged, self),
      removed: _.bind(self.sendRemoved, self)
    };
  },
  getCollectionView: function (collectionName) {
    var self = this;
    var ret = self.collectionViews.get(collectionName);
    if (!ret) {
      ret = new SessionCollectionView(collectionName, self.getSendCallbacks());
      self.collectionViews.set(collectionName, ret);
    }
    return ret;
  },
  added(subscriptionHandle, collectionName, id, fields) {
    if (this.server.getPublicationStrategy(collectionName).useCollectionView) {
      const view = this.getCollectionView(collectionName);
      view.added(subscriptionHandle, id, fields);
    } else {
      this.sendAdded(collectionName, id, fields);
    }
  },
  removed(subscriptionHandle, collectionName, id) {
    if (this.server.getPublicationStrategy(collectionName).useCollectionView) {
      const view = this.getCollectionView(collectionName);
      view.removed(subscriptionHandle, id);
      if (view.isEmpty()) {
        this.collectionViews.delete(collectionName);
      }
    } else {
      this.sendRemoved(collectionName, id);
    }
  },
  changed(subscriptionHandle, collectionName, id, fields) {
    if (this.server.getPublicationStrategy(collectionName).useCollectionView) {
      const view = this.getCollectionView(collectionName);
      view.changed(subscriptionHandle, id, fields);
    } else {
      this.sendChanged(collectionName, id, fields);
    }
  },
  startUniversalSubs: function () {
    var self = this;
    // Make a shallow copy of the set of universal handlers and start them. If
    // additional universal publishers start while we're running them (due to
    // yielding), they will run separately as part of Server.publish.
    var handlers = _.clone(self.server.universal_publish_handlers);
    _.each(handlers, function (handler) {
      self._startSubscription(handler);
    });
  },
  // Destroy this session and unregister it at the server.
  close: function () {
    var self = this;

    // Destroy this session, even if it's not registered at the
    // server. Stop all processing and tear everything down. If a socket
    // was attached, close it.

    // Already destroyed.
    if (!self.inQueue) return;

    // Drop the merge box data immediately.
    self.inQueue = null;
    self.collectionViews = new Map();
    if (self.heartbeat) {
      self.heartbeat.stop();
      self.heartbeat = null;
    }
    if (self.socket) {
      self.socket.close();
      self.socket._meteorSession = null;
    }
    Package['facts-base'] && Package['facts-base'].Facts.incrementServerFact("livedata", "sessions", -1);
    Meteor.defer(function () {
      // Stop callbacks can yield, so we defer this on close.
      // sub._isDeactivated() detects that we set inQueue to null and
      // treats it as semi-deactivated (it will ignore incoming callbacks, etc).
      self._deactivateAllSubscriptions();

      // Defer calling the close callbacks, so that the caller closing
      // the session isn't waiting for all the callbacks to complete.
      _.each(self._closeCallbacks, function (callback) {
        callback();
      });
    });

    // Unregister the session.
    self.server._removeSession(self);
  },
  // Send a message (doing nothing if no socket is connected right now).
  // It should be a JSON object (it will be stringified).
  send: function (msg) {
    var self = this;
    if (self.socket) {
      if (Meteor._printSentDDP) Meteor._debug("Sent DDP", DDPCommon.stringifyDDP(msg));
      self.socket.send(DDPCommon.stringifyDDP(msg));
    }
  },
  // Send a connection error.
  sendError: function (reason, offendingMessage) {
    var self = this;
    var msg = {
      msg: 'error',
      reason: reason
    };
    if (offendingMessage) msg.offendingMessage = offendingMessage;
    self.send(msg);
  },
  // Process 'msg' as an incoming message. As a guard against
  // race conditions during reconnection, ignore the message if
  // 'socket' is not the currently connected socket.
  //
  // We run the messages from the client one at a time, in the order
  // given by the client. The message handler is passed an idempotent
  // function 'unblock' which it may call to allow other messages to
  // begin running in parallel in another fiber (for example, a method
  // that wants to yield). Otherwise, it is automatically unblocked
  // when it returns.
  //
  // Actually, we don't have to 'totally order' the messages in this
  // way, but it's the easiest thing that's correct. (unsub needs to
  // be ordered against sub, methods need to be ordered against each
  // other).
  processMessage: function (msg_in) {
    var self = this;
    if (!self.inQueue)
      // we have been destroyed.
      return;

    // Respond to ping and pong messages immediately without queuing.
    // If the negotiated DDP version is "pre1" which didn't support
    // pings, preserve the "pre1" behavior of responding with a "bad
    // request" for the unknown messages.
    //
    // Fibers are needed because heartbeats use Meteor.setTimeout, which
    // needs a Fiber. We could actually use regular setTimeout and avoid
    // these new fibers, but it is easier to just make everything use
    // Meteor.setTimeout and not think too hard.
    //
    // Any message counts as receiving a pong, as it demonstrates that
    // the client is still alive.
    if (self.heartbeat) {
      Fiber(function () {
        self.heartbeat.messageReceived();
      }).run();
    }
    if (self.version !== 'pre1' && msg_in.msg === 'ping') {
      if (self._respondToPings) self.send({
        msg: "pong",
        id: msg_in.id
      });
      return;
    }
    if (self.version !== 'pre1' && msg_in.msg === 'pong') {
      // Since everything is a pong, there is nothing to do
      return;
    }
    self.inQueue.push(msg_in);
    if (self.workerRunning) return;
    self.workerRunning = true;
    var processNext = function () {
      var msg = self.inQueue && self.inQueue.shift();
      if (!msg) {
        self.workerRunning = false;
        return;
      }
      Fiber(function () {
        var blocked = true;
        var unblock = function () {
          if (!blocked) return; // idempotent
          blocked = false;
          processNext();
        };
        self.server.onMessageHook.each(function (callback) {
          callback(msg, self);
          return true;
        });
        if (_.has(self.protocol_handlers, msg.msg)) self.protocol_handlers[msg.msg].call(self, msg, unblock);else self.sendError('Bad request', msg);
        unblock(); // in case the handler didn't already do it
      }).run();
    };
    processNext();
  },
  protocol_handlers: {
    sub: function (msg, unblock) {
      var self = this;

      // cacheUnblock temporarly, so we can capture it later
      // we will use unblock in current eventLoop, so this is safe
      self.cachedUnblock = unblock;

      // reject malformed messages
      if (typeof msg.id !== "string" || typeof msg.name !== "string" || 'params' in msg && !(msg.params instanceof Array)) {
        self.sendError("Malformed subscription", msg);
        return;
      }
      if (!self.server.publish_handlers[msg.name]) {
        self.send({
          msg: 'nosub',
          id: msg.id,
          error: new Meteor.Error(404, "Subscription '".concat(msg.name, "' not found"))
        });
        return;
      }
      if (self._namedSubs.has(msg.id))
        // subs are idempotent, or rather, they are ignored if a sub
        // with that id already exists. this is important during
        // reconnect.
        return;

      // XXX It'd be much better if we had generic hooks where any package can
      // hook into subscription handling, but in the mean while we special case
      // ddp-rate-limiter package. This is also done for weak requirements to
      // add the ddp-rate-limiter package in case we don't have Accounts. A
      // user trying to use the ddp-rate-limiter must explicitly require it.
      if (Package['ddp-rate-limiter']) {
        var DDPRateLimiter = Package['ddp-rate-limiter'].DDPRateLimiter;
        var rateLimiterInput = {
          userId: self.userId,
          clientAddress: self.connectionHandle.clientAddress,
          type: "subscription",
          name: msg.name,
          connectionId: self.id
        };
        DDPRateLimiter._increment(rateLimiterInput);
        var rateLimitResult = DDPRateLimiter._check(rateLimiterInput);
        if (!rateLimitResult.allowed) {
          self.send({
            msg: 'nosub',
            id: msg.id,
            error: new Meteor.Error('too-many-requests', DDPRateLimiter.getErrorMessage(rateLimitResult), {
              timeToReset: rateLimitResult.timeToReset
            })
          });
          return;
        }
      }
      var handler = self.server.publish_handlers[msg.name];
      self._startSubscription(handler, msg.id, msg.params, msg.name);

      // cleaning cached unblock
      self.cachedUnblock = null;
    },
    unsub: function (msg) {
      var self = this;
      self._stopSubscription(msg.id);
    },
    method: function (msg, unblock) {
      var self = this;

      // Reject malformed messages.
      // For now, we silently ignore unknown attributes,
      // for forwards compatibility.
      if (typeof msg.id !== "string" || typeof msg.method !== "string" || 'params' in msg && !(msg.params instanceof Array) || 'randomSeed' in msg && typeof msg.randomSeed !== "string") {
        self.sendError("Malformed method invocation", msg);
        return;
      }
      var randomSeed = msg.randomSeed || null;

      // Set up to mark the method as satisfied once all observers
      // (and subscriptions) have reacted to any writes that were
      // done.
      var fence = new DDPServer._WriteFence();
      fence.onAllCommitted(function () {
        // Retire the fence so that future writes are allowed.
        // This means that callbacks like timers are free to use
        // the fence, and if they fire before it's armed (for
        // example, because the method waits for them) their
        // writes will be included in the fence.
        fence.retire();
        self.send({
          msg: 'updated',
          methods: [msg.id]
        });
      });

      // Find the handler
      var handler = self.server.method_handlers[msg.method];
      if (!handler) {
        self.send({
          msg: 'result',
          id: msg.id,
          error: new Meteor.Error(404, "Method '".concat(msg.method, "' not found"))
        });
        fence.arm();
        return;
      }
      var setUserId = function (userId) {
        self._setUserId(userId);
      };
      var invocation = new DDPCommon.MethodInvocation({
        isSimulation: false,
        userId: self.userId,
        setUserId: setUserId,
        unblock: unblock,
        connection: self.connectionHandle,
        randomSeed: randomSeed
      });
      const promise = new Promise((resolve, reject) => {
        // XXX It'd be better if we could hook into method handlers better but
        // for now, we need to check if the ddp-rate-limiter exists since we
        // have a weak requirement for the ddp-rate-limiter package to be added
        // to our application.
        if (Package['ddp-rate-limiter']) {
          var DDPRateLimiter = Package['ddp-rate-limiter'].DDPRateLimiter;
          var rateLimiterInput = {
            userId: self.userId,
            clientAddress: self.connectionHandle.clientAddress,
            type: "method",
            name: msg.method,
            connectionId: self.id
          };
          DDPRateLimiter._increment(rateLimiterInput);
          var rateLimitResult = DDPRateLimiter._check(rateLimiterInput);
          if (!rateLimitResult.allowed) {
            reject(new Meteor.Error("too-many-requests", DDPRateLimiter.getErrorMessage(rateLimitResult), {
              timeToReset: rateLimitResult.timeToReset
            }));
            return;
          }
        }
        const getCurrentMethodInvocationResult = () => {
          const currentContext = DDP._CurrentMethodInvocation._setNewContextAndGetCurrent(invocation);
          try {
            let result;
            const resultOrThenable = maybeAuditArgumentChecks(handler, invocation, msg.params, "call to '" + msg.method + "'");
            const isThenable = resultOrThenable && typeof resultOrThenable.then === 'function';
            if (isThenable) {
              result = Promise.await(resultOrThenable);
            } else {
              result = resultOrThenable;
            }
            return result;
          } finally {
            DDP._CurrentMethodInvocation._set(currentContext);
          }
        };
        resolve(DDPServer._CurrentWriteFence.withValue(fence, getCurrentMethodInvocationResult));
      });
      function finish() {
        fence.arm();
        unblock();
      }
      const payload = {
        msg: "result",
        id: msg.id
      };
      promise.then(result => {
        finish();
        if (result !== undefined) {
          payload.result = result;
        }
        self.send(payload);
      }, exception => {
        finish();
        payload.error = wrapInternalException(exception, "while invoking method '".concat(msg.method, "'"));
        self.send(payload);
      });
    }
  },
  _eachSub: function (f) {
    var self = this;
    self._namedSubs.forEach(f);
    self._universalSubs.forEach(f);
  },
  _diffCollectionViews: function (beforeCVs) {
    var self = this;
    DiffSequence.diffMaps(beforeCVs, self.collectionViews, {
      both: function (collectionName, leftValue, rightValue) {
        rightValue.diff(leftValue);
      },
      rightOnly: function (collectionName, rightValue) {
        rightValue.documents.forEach(function (docView, id) {
          self.sendAdded(collectionName, id, docView.getFields());
        });
      },
      leftOnly: function (collectionName, leftValue) {
        leftValue.documents.forEach(function (doc, id) {
          self.sendRemoved(collectionName, id);
        });
      }
    });
  },
  // Sets the current user id in all appropriate contexts and reruns
  // all subscriptions
  _setUserId: function (userId) {
    var self = this;
    if (userId !== null && typeof userId !== "string") throw new Error("setUserId must be called on string or null, not " + typeof userId);

    // Prevent newly-created universal subscriptions from being added to our
    // session. They will be found below when we call startUniversalSubs.
    //
    // (We don't have to worry about named subscriptions, because we only add
    // them when we process a 'sub' message. We are currently processing a
    // 'method' message, and the method did not unblock, because it is illegal
    // to call setUserId after unblock. Thus we cannot be concurrently adding a
    // new named subscription).
    self._dontStartNewUniversalSubs = true;

    // Prevent current subs from updating our collectionViews and call their
    // stop callbacks. This may yield.
    self._eachSub(function (sub) {
      sub._deactivate();
    });

    // All subs should now be deactivated. Stop sending messages to the client,
    // save the state of the published collections, reset to an empty view, and
    // update the userId.
    self._isSending = false;
    var beforeCVs = self.collectionViews;
    self.collectionViews = new Map();
    self.userId = userId;

    // _setUserId is normally called from a Meteor method with
    // DDP._CurrentMethodInvocation set. But DDP._CurrentMethodInvocation is not
    // expected to be set inside a publish function, so we temporary unset it.
    // Inside a publish function DDP._CurrentPublicationInvocation is set.
    DDP._CurrentMethodInvocation.withValue(undefined, function () {
      // Save the old named subs, and reset to having no subscriptions.
      var oldNamedSubs = self._namedSubs;
      self._namedSubs = new Map();
      self._universalSubs = [];
      oldNamedSubs.forEach(function (sub, subscriptionId) {
        var newSub = sub._recreate();
        self._namedSubs.set(subscriptionId, newSub);
        // nb: if the handler throws or calls this.error(), it will in fact
        // immediately send its 'nosub'. This is OK, though.
        newSub._runHandler();
      });

      // Allow newly-created universal subs to be started on our connection in
      // parallel with the ones we're spinning up here, and spin up universal
      // subs.
      self._dontStartNewUniversalSubs = false;
      self.startUniversalSubs();
    });

    // Start sending messages again, beginning with the diff from the previous
    // state of the world to the current state. No yields are allowed during
    // this diff, so that other changes cannot interleave.
    Meteor._noYieldsAllowed(function () {
      self._isSending = true;
      self._diffCollectionViews(beforeCVs);
      if (!_.isEmpty(self._pendingReady)) {
        self.sendReady(self._pendingReady);
        self._pendingReady = [];
      }
    });
  },
  _startSubscription: function (handler, subId, params, name) {
    var self = this;
    var sub = new Subscription(self, handler, subId, params, name);
    let unblockHander = self.cachedUnblock;
    // _startSubscription may call from a lot places
    // so cachedUnblock might be null in somecases
    // assign the cachedUnblock
    sub.unblock = unblockHander || (() => {});
    if (subId) self._namedSubs.set(subId, sub);else self._universalSubs.push(sub);
    sub._runHandler();
  },
  // Tear down specified subscription
  _stopSubscription: function (subId, error) {
    var self = this;
    var subName = null;
    if (subId) {
      var maybeSub = self._namedSubs.get(subId);
      if (maybeSub) {
        subName = maybeSub._name;
        maybeSub._removeAllDocuments();
        maybeSub._deactivate();
        self._namedSubs.delete(subId);
      }
    }
    var response = {
      msg: 'nosub',
      id: subId
    };
    if (error) {
      response.error = wrapInternalException(error, subName ? "from sub " + subName + " id " + subId : "from sub id " + subId);
    }
    self.send(response);
  },
  // Tear down all subscriptions. Note that this does NOT send removed or nosub
  // messages, since we assume the client is gone.
  _deactivateAllSubscriptions: function () {
    var self = this;
    self._namedSubs.forEach(function (sub, id) {
      sub._deactivate();
    });
    self._namedSubs = new Map();
    self._universalSubs.forEach(function (sub) {
      sub._deactivate();
    });
    self._universalSubs = [];
  },
  // Determine the remote client's IP address, based on the
  // HTTP_FORWARDED_COUNT environment variable representing how many
  // proxies the server is behind.
  _clientAddress: function () {
    var self = this;

    // For the reported client address for a connection to be correct,
    // the developer must set the HTTP_FORWARDED_COUNT environment
    // variable to an integer representing the number of hops they
    // expect in the `x-forwarded-for` header. E.g., set to "1" if the
    // server is behind one proxy.
    //
    // This could be computed once at startup instead of every time.
    var httpForwardedCount = parseInt(process.env['HTTP_FORWARDED_COUNT']) || 0;
    if (httpForwardedCount === 0) return self.socket.remoteAddress;
    var forwardedFor = self.socket.headers["x-forwarded-for"];
    if (!_.isString(forwardedFor)) return null;
    forwardedFor = forwardedFor.trim().split(/\s*,\s*/);

    // Typically the first value in the `x-forwarded-for` header is
    // the original IP address of the client connecting to the first
    // proxy.  However, the end user can easily spoof the header, in
    // which case the first value(s) will be the fake IP address from
    // the user pretending to be a proxy reporting the original IP
    // address value.  By counting HTTP_FORWARDED_COUNT back from the
    // end of the list, we ensure that we get the IP address being
    // reported by *our* first proxy.

    if (httpForwardedCount < 0 || httpForwardedCount > forwardedFor.length) return null;
    return forwardedFor[forwardedFor.length - httpForwardedCount];
  }
});

/******************************************************************************/
/* Subscription                                                               */
/******************************************************************************/

// Ctor for a sub handle: the input to each publish function

// Instance name is this because it's usually referred to as this inside a
// publish
/**
 * @summary The server's side of a subscription
 * @class Subscription
 * @instanceName this
 * @showInstanceName true
 */
var Subscription = function (session, handler, subscriptionId, params, name) {
  var self = this;
  self._session = session; // type is Session

  /**
   * @summary Access inside the publish function. The incoming [connection](#meteor_onconnection) for this subscription.
   * @locus Server
   * @name  connection
   * @memberOf Subscription
   * @instance
   */
  self.connection = session.connectionHandle; // public API object

  self._handler = handler;

  // My subscription ID (generated by client, undefined for universal subs).
  self._subscriptionId = subscriptionId;
  // Undefined for universal subs
  self._name = name;
  self._params = params || [];

  // Only named subscriptions have IDs, but we need some sort of string
  // internally to keep track of all subscriptions inside
  // SessionDocumentViews. We use this subscriptionHandle for that.
  if (self._subscriptionId) {
    self._subscriptionHandle = 'N' + self._subscriptionId;
  } else {
    self._subscriptionHandle = 'U' + Random.id();
  }

  // Has _deactivate been called?
  self._deactivated = false;

  // Stop callbacks to g/c this sub.  called w/ zero arguments.
  self._stopCallbacks = [];

  // The set of (collection, documentid) that this subscription has
  // an opinion about.
  self._documents = new Map();

  // Remember if we are ready.
  self._ready = false;

  // Part of the public API: the user of this sub.

  /**
   * @summary Access inside the publish function. The id of the logged-in user, or `null` if no user is logged in.
   * @locus Server
   * @memberOf Subscription
   * @name  userId
   * @instance
   */
  self.userId = session.userId;

  // For now, the id filter is going to default to
  // the to/from DDP methods on MongoID, to
  // specifically deal with mongo/minimongo ObjectIds.

  // Later, you will be able to make this be "raw"
  // if you want to publish a collection that you know
  // just has strings for keys and no funny business, to
  // a DDP consumer that isn't minimongo.

  self._idFilter = {
    idStringify: MongoID.idStringify,
    idParse: MongoID.idParse
  };
  Package['facts-base'] && Package['facts-base'].Facts.incrementServerFact("livedata", "subscriptions", 1);
};
Object.assign(Subscription.prototype, {
  _runHandler: function () {
    // XXX should we unblock() here? Either before running the publish
    // function, or before running _publishCursor.
    //
    // Right now, each publish function blocks all future publishes and
    // methods waiting on data from Mongo (or whatever else the function
    // blocks on). This probably slows page load in common cases.

    if (!this.unblock) {
      this.unblock = () => {};
    }
    const self = this;
    let resultOrThenable = null;
    try {
      resultOrThenable = DDP._CurrentPublicationInvocation.withValue(self, () => maybeAuditArgumentChecks(self._handler, self, EJSON.clone(self._params),
      // It's OK that this would look weird for universal subscriptions,
      // because they have no arguments so there can never be an
      // audit-argument-checks failure.
      "publisher '" + self._name + "'"));
    } catch (e) {
      self.error(e);
      return;
    }

    // Did the handler call this.error or this.stop?
    if (self._isDeactivated()) return;

    // Both conventional and async publish handler functions are supported.
    // If an object is returned with a then() function, it is either a promise
    // or thenable and will be resolved asynchronously.
    const isThenable = resultOrThenable && typeof resultOrThenable.then === 'function';
    if (isThenable) {
      Promise.resolve(resultOrThenable).then(function () {
        return self._publishHandlerResult.bind(self)(...arguments);
      }, e => self.error(e));
    } else {
      self._publishHandlerResult(resultOrThenable);
    }
  },
  _publishHandlerResult: function (res) {
    // SPECIAL CASE: Instead of writing their own callbacks that invoke
    // this.added/changed/ready/etc, the user can just return a collection
    // cursor or array of cursors from the publish function; we call their
    // _publishCursor method which starts observing the cursor and publishes the
    // results. Note that _publishCursor does NOT call ready().
    //
    // XXX This uses an undocumented interface which only the Mongo cursor
    // interface publishes. Should we make this interface public and encourage
    // users to implement it themselves? Arguably, it's unnecessary; users can
    // already write their own functions like
    //   var publishMyReactiveThingy = function (name, handler) {
    //     Meteor.publish(name, function () {
    //       var reactiveThingy = handler();
    //       reactiveThingy.publishMe();
    //     });
    //   };

    var self = this;
    var isCursor = function (c) {
      return c && c._publishCursor;
    };
    if (isCursor(res)) {
      try {
        res._publishCursor(self);
      } catch (e) {
        self.error(e);
        return;
      }
      // _publishCursor only returns after the initial added callbacks have run.
      // mark subscription as ready.
      self.ready();
    } else if (_.isArray(res)) {
      // Check all the elements are cursors
      if (!_.all(res, isCursor)) {
        self.error(new Error("Publish function returned an array of non-Cursors"));
        return;
      }
      // Find duplicate collection names
      // XXX we should support overlapping cursors, but that would require the
      // merge box to allow overlap within a subscription
      var collectionNames = {};
      for (var i = 0; i < res.length; ++i) {
        var collectionName = res[i]._getCollectionName();
        if (_.has(collectionNames, collectionName)) {
          self.error(new Error("Publish function returned multiple cursors for collection " + collectionName));
          return;
        }
        collectionNames[collectionName] = true;
      }
      ;
      try {
        _.each(res, function (cur) {
          cur._publishCursor(self);
        });
      } catch (e) {
        self.error(e);
        return;
      }
      self.ready();
    } else if (res) {
      // Truthy values other than cursors or arrays are probably a
      // user mistake (possible returning a Mongo document via, say,
      // `coll.findOne()`).
      self.error(new Error("Publish function can only return a Cursor or " + "an array of Cursors"));
    }
  },
  // This calls all stop callbacks and prevents the handler from updating any
  // SessionCollectionViews further. It's used when the user unsubscribes or
  // disconnects, as well as during setUserId re-runs. It does *NOT* send
  // removed messages for the published objects; if that is necessary, call
  // _removeAllDocuments first.
  _deactivate: function () {
    var self = this;
    if (self._deactivated) return;
    self._deactivated = true;
    self._callStopCallbacks();
    Package['facts-base'] && Package['facts-base'].Facts.incrementServerFact("livedata", "subscriptions", -1);
  },
  _callStopCallbacks: function () {
    var self = this;
    // Tell listeners, so they can clean up
    var callbacks = self._stopCallbacks;
    self._stopCallbacks = [];
    _.each(callbacks, function (callback) {
      callback();
    });
  },
  // Send remove messages for every document.
  _removeAllDocuments: function () {
    var self = this;
    Meteor._noYieldsAllowed(function () {
      self._documents.forEach(function (collectionDocs, collectionName) {
        collectionDocs.forEach(function (strId) {
          self.removed(collectionName, self._idFilter.idParse(strId));
        });
      });
    });
  },
  // Returns a new Subscription for the same session with the same
  // initial creation parameters. This isn't a clone: it doesn't have
  // the same _documents cache, stopped state or callbacks; may have a
  // different _subscriptionHandle, and gets its userId from the
  // session, not from this object.
  _recreate: function () {
    var self = this;
    return new Subscription(self._session, self._handler, self._subscriptionId, self._params, self._name);
  },
  /**
   * @summary Call inside the publish function.  Stops this client's subscription, triggering a call on the client to the `onStop` callback passed to [`Meteor.subscribe`](#meteor_subscribe), if any. If `error` is not a [`Meteor.Error`](#meteor_error), it will be [sanitized](#meteor_error).
   * @locus Server
   * @param {Error} error The error to pass to the client.
   * @instance
   * @memberOf Subscription
   */
  error: function (error) {
    var self = this;
    if (self._isDeactivated()) return;
    self._session._stopSubscription(self._subscriptionId, error);
  },
  // Note that while our DDP client will notice that you've called stop() on the
  // server (and clean up its _subscriptions table) we don't actually provide a
  // mechanism for an app to notice this (the subscribe onError callback only
  // triggers if there is an error).

  /**
   * @summary Call inside the publish function.  Stops this client's subscription and invokes the client's `onStop` callback with no error.
   * @locus Server
   * @instance
   * @memberOf Subscription
   */
  stop: function () {
    var self = this;
    if (self._isDeactivated()) return;
    self._session._stopSubscription(self._subscriptionId);
  },
  /**
   * @summary Call inside the publish function.  Registers a callback function to run when the subscription is stopped.
   * @locus Server
   * @memberOf Subscription
   * @instance
   * @param {Function} func The callback function
   */
  onStop: function (callback) {
    var self = this;
    callback = Meteor.bindEnvironment(callback, 'onStop callback', self);
    if (self._isDeactivated()) callback();else self._stopCallbacks.push(callback);
  },
  // This returns true if the sub has been deactivated, *OR* if the session was
  // destroyed but the deferred call to _deactivateAllSubscriptions hasn't
  // happened yet.
  _isDeactivated: function () {
    var self = this;
    return self._deactivated || self._session.inQueue === null;
  },
  /**
   * @summary Call inside the publish function.  Informs the subscriber that a document has been added to the record set.
   * @locus Server
   * @memberOf Subscription
   * @instance
   * @param {String} collection The name of the collection that contains the new document.
   * @param {String} id The new document's ID.
   * @param {Object} fields The fields in the new document.  If `_id` is present it is ignored.
   */
  added(collectionName, id, fields) {
    if (this._isDeactivated()) return;
    id = this._idFilter.idStringify(id);
    if (this._session.server.getPublicationStrategy(collectionName).doAccountingForCollection) {
      let ids = this._documents.get(collectionName);
      if (ids == null) {
        ids = new Set();
        this._documents.set(collectionName, ids);
      }
      ids.add(id);
    }
    this._session.added(this._subscriptionHandle, collectionName, id, fields);
  },
  /**
   * @summary Call inside the publish function.  Informs the subscriber that a document in the record set has been modified.
   * @locus Server
   * @memberOf Subscription
   * @instance
   * @param {String} collection The name of the collection that contains the changed document.
   * @param {String} id The changed document's ID.
   * @param {Object} fields The fields in the document that have changed, together with their new values.  If a field is not present in `fields` it was left unchanged; if it is present in `fields` and has a value of `undefined` it was removed from the document.  If `_id` is present it is ignored.
   */
  changed(collectionName, id, fields) {
    if (this._isDeactivated()) return;
    id = this._idFilter.idStringify(id);
    this._session.changed(this._subscriptionHandle, collectionName, id, fields);
  },
  /**
   * @summary Call inside the publish function.  Informs the subscriber that a document has been removed from the record set.
   * @locus Server
   * @memberOf Subscription
   * @instance
   * @param {String} collection The name of the collection that the document has been removed from.
   * @param {String} id The ID of the document that has been removed.
   */
  removed(collectionName, id) {
    if (this._isDeactivated()) return;
    id = this._idFilter.idStringify(id);
    if (this._session.server.getPublicationStrategy(collectionName).doAccountingForCollection) {
      // We don't bother to delete sets of things in a collection if the
      // collection is empty.  It could break _removeAllDocuments.
      this._documents.get(collectionName).delete(id);
    }
    this._session.removed(this._subscriptionHandle, collectionName, id);
  },
  /**
   * @summary Call inside the publish function.  Informs the subscriber that an initial, complete snapshot of the record set has been sent.  This will trigger a call on the client to the `onReady` callback passed to  [`Meteor.subscribe`](#meteor_subscribe), if any.
   * @locus Server
   * @memberOf Subscription
   * @instance
   */
  ready: function () {
    var self = this;
    if (self._isDeactivated()) return;
    if (!self._subscriptionId) return; // Unnecessary but ignored for universal sub
    if (!self._ready) {
      self._session.sendReady([self._subscriptionId]);
      self._ready = true;
    }
  }
});

/******************************************************************************/
/* Server                                                                     */
/******************************************************************************/

Server = function () {
  let options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var self = this;

  // The default heartbeat interval is 30 seconds on the server and 35
  // seconds on the client.  Since the client doesn't need to send a
  // ping as long as it is receiving pings, this means that pings
  // normally go from the server to the client.
  //
  // Note: Troposphere depends on the ability to mutate
  // Meteor.server.options.heartbeatTimeout! This is a hack, but it's life.
  self.options = _objectSpread({
    heartbeatInterval: 15000,
    heartbeatTimeout: 15000,
    // For testing, allow responding to pings to be disabled.
    respondToPings: true,
    defaultPublicationStrategy: publicationStrategies.SERVER_MERGE
  }, options);

  // Map of callbacks to call when a new connection comes in to the
  // server and completes DDP version negotiation. Use an object instead
  // of an array so we can safely remove one from the list while
  // iterating over it.
  self.onConnectionHook = new Hook({
    debugPrintExceptions: "onConnection callback"
  });

  // Map of callbacks to call when a new message comes in.
  self.onMessageHook = new Hook({
    debugPrintExceptions: "onMessage callback"
  });
  self.publish_handlers = {};
  self.universal_publish_handlers = [];
  self.method_handlers = {};
  self._publicationStrategies = {};
  self.sessions = new Map(); // map from id to session

  self.stream_server = new StreamServer();
  self.stream_server.register(function (socket) {
    // socket implements the SockJSConnection interface
    socket._meteorSession = null;
    var sendError = function (reason, offendingMessage) {
      var msg = {
        msg: 'error',
        reason: reason
      };
      if (offendingMessage) msg.offendingMessage = offendingMessage;
      socket.send(DDPCommon.stringifyDDP(msg));
    };
    socket.on('data', function (raw_msg) {
      if (Meteor._printReceivedDDP) {
        Meteor._debug("Received DDP", raw_msg);
      }
      try {
        try {
          var msg = DDPCommon.parseDDP(raw_msg);
        } catch (err) {
          sendError('Parse error');
          return;
        }
        if (msg === null || !msg.msg) {
          sendError('Bad request', msg);
          return;
        }
        if (msg.msg === 'connect') {
          if (socket._meteorSession) {
            sendError("Already connected", msg);
            return;
          }
          Fiber(function () {
            self._handleConnect(socket, msg);
          }).run();
          return;
        }
        if (!socket._meteorSession) {
          sendError('Must connect first', msg);
          return;
        }
        socket._meteorSession.processMessage(msg);
      } catch (e) {
        // XXX print stack nicely
        Meteor._debug("Internal exception while processing message", msg, e);
      }
    });
    socket.on('close', function () {
      if (socket._meteorSession) {
        Fiber(function () {
          socket._meteorSession.close();
        }).run();
      }
    });
  });
};
Object.assign(Server.prototype, {
  /**
   * @summary Register a callback to be called when a new DDP connection is made to the server.
   * @locus Server
   * @param {function} callback The function to call when a new DDP connection is established.
   * @memberOf Meteor
   * @importFromPackage meteor
   */
  onConnection: function (fn) {
    var self = this;
    return self.onConnectionHook.register(fn);
  },
  /**
   * @summary Set publication strategy for the given collection. Publications strategies are available from `DDPServer.publicationStrategies`. You call this method from `Meteor.server`, like `Meteor.server.setPublicationStrategy()`
   * @locus Server
   * @alias setPublicationStrategy
   * @param collectionName {String}
   * @param strategy {{useCollectionView: boolean, doAccountingForCollection: boolean}}
   * @memberOf Meteor.server
   * @importFromPackage meteor
   */
  setPublicationStrategy(collectionName, strategy) {
    if (!Object.values(publicationStrategies).includes(strategy)) {
      throw new Error("Invalid merge strategy: ".concat(strategy, " \n        for collection ").concat(collectionName));
    }
    this._publicationStrategies[collectionName] = strategy;
  },
  /**
   * @summary Gets the publication strategy for the requested collection. You call this method from `Meteor.server`, like `Meteor.server.getPublicationStrategy()`
   * @locus Server
   * @alias getPublicationStrategy
   * @param collectionName {String}
   * @memberOf Meteor.server
   * @importFromPackage meteor
   * @return {{useCollectionView: boolean, doAccountingForCollection: boolean}}
   */
  getPublicationStrategy(collectionName) {
    return this._publicationStrategies[collectionName] || this.options.defaultPublicationStrategy;
  },
  /**
   * @summary Register a callback to be called when a new DDP message is received.
   * @locus Server
   * @param {function} callback The function to call when a new DDP message is received.
   * @memberOf Meteor
   * @importFromPackage meteor
   */
  onMessage: function (fn) {
    var self = this;
    return self.onMessageHook.register(fn);
  },
  _handleConnect: function (socket, msg) {
    var self = this;

    // The connect message must specify a version and an array of supported
    // versions, and it must claim to support what it is proposing.
    if (!(typeof msg.version === 'string' && _.isArray(msg.support) && _.all(msg.support, _.isString) && _.contains(msg.support, msg.version))) {
      socket.send(DDPCommon.stringifyDDP({
        msg: 'failed',
        version: DDPCommon.SUPPORTED_DDP_VERSIONS[0]
      }));
      socket.close();
      return;
    }

    // In the future, handle session resumption: something like:
    //  socket._meteorSession = self.sessions[msg.session]
    var version = calculateVersion(msg.support, DDPCommon.SUPPORTED_DDP_VERSIONS);
    if (msg.version !== version) {
      // The best version to use (according to the client's stated preferences)
      // is not the one the client is trying to use. Inform them about the best
      // version to use.
      socket.send(DDPCommon.stringifyDDP({
        msg: 'failed',
        version: version
      }));
      socket.close();
      return;
    }

    // Yay, version matches! Create a new session.
    // Note: Troposphere depends on the ability to mutate
    // Meteor.server.options.heartbeatTimeout! This is a hack, but it's life.
    socket._meteorSession = new Session(self, version, socket, self.options);
    self.sessions.set(socket._meteorSession.id, socket._meteorSession);
    self.onConnectionHook.each(function (callback) {
      if (socket._meteorSession) callback(socket._meteorSession.connectionHandle);
      return true;
    });
  },
  /**
   * Register a publish handler function.
   *
   * @param name {String} identifier for query
   * @param handler {Function} publish handler
   * @param options {Object}
   *
   * Server will call handler function on each new subscription,
   * either when receiving DDP sub message for a named subscription, or on
   * DDP connect for a universal subscription.
   *
   * If name is null, this will be a subscription that is
   * automatically established and permanently on for all connected
   * client, instead of a subscription that can be turned on and off
   * with subscribe().
   *
   * options to contain:
   *  - (mostly internal) is_auto: true if generated automatically
   *    from an autopublish hook. this is for cosmetic purposes only
   *    (it lets us determine whether to print a warning suggesting
   *    that you turn off autopublish).
   */

  /**
   * @summary Publish a record set.
   * @memberOf Meteor
   * @importFromPackage meteor
   * @locus Server
   * @param {String|Object} name If String, name of the record set.  If Object, publications Dictionary of publish functions by name.  If `null`, the set has no name, and the record set is automatically sent to all connected clients.
   * @param {Function} func Function called on the server each time a client subscribes.  Inside the function, `this` is the publish handler object, described below.  If the client passed arguments to `subscribe`, the function is called with the same arguments.
   */
  publish: function (name, handler, options) {
    var self = this;
    if (!_.isObject(name)) {
      options = options || {};
      if (name && name in self.publish_handlers) {
        Meteor._debug("Ignoring duplicate publish named '" + name + "'");
        return;
      }
      if (Package.autopublish && !options.is_auto) {
        // They have autopublish on, yet they're trying to manually
        // pick stuff to publish. They probably should turn off
        // autopublish. (This check isn't perfect -- if you create a
        // publish before you turn on autopublish, it won't catch
        // it, but this will definitely handle the simple case where
        // you've added the autopublish package to your app, and are
        // calling publish from your app code).
        if (!self.warned_about_autopublish) {
          self.warned_about_autopublish = true;
          Meteor._debug("** You've set up some data subscriptions with Meteor.publish(), but\n" + "** you still have autopublish turned on. Because autopublish is still\n" + "** on, your Meteor.publish() calls won't have much effect. All data\n" + "** will still be sent to all clients.\n" + "**\n" + "** Turn off autopublish by removing the autopublish package:\n" + "**\n" + "**   $ meteor remove autopublish\n" + "**\n" + "** .. and make sure you have Meteor.publish() and Meteor.subscribe() calls\n" + "** for each collection that you want clients to see.\n");
        }
      }
      if (name) self.publish_handlers[name] = handler;else {
        self.universal_publish_handlers.push(handler);
        // Spin up the new publisher on any existing session too. Run each
        // session's subscription in a new Fiber, so that there's no change for
        // self.sessions to change while we're running this loop.
        self.sessions.forEach(function (session) {
          if (!session._dontStartNewUniversalSubs) {
            Fiber(function () {
              session._startSubscription(handler);
            }).run();
          }
        });
      }
    } else {
      _.each(name, function (value, key) {
        self.publish(key, value, {});
      });
    }
  },
  _removeSession: function (session) {
    var self = this;
    self.sessions.delete(session.id);
  },
  /**
   * @summary Defines functions that can be invoked over the network by clients.
   * @locus Anywhere
   * @param {Object} methods Dictionary whose keys are method names and values are functions.
   * @memberOf Meteor
   * @importFromPackage meteor
   */
  methods: function (methods) {
    var self = this;
    _.each(methods, function (func, name) {
      if (typeof func !== 'function') throw new Error("Method '" + name + "' must be a function");
      if (self.method_handlers[name]) throw new Error("A method named '" + name + "' is already defined");
      self.method_handlers[name] = func;
    });
  },
  call: function (name) {
    for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      args[_key - 1] = arguments[_key];
    }
    if (args.length && typeof args[args.length - 1] === "function") {
      // If it's a function, the last argument is the result callback, not
      // a parameter to the remote method.
      var callback = args.pop();
    }
    return this.apply(name, args, callback);
  },
  // A version of the call method that always returns a Promise.
  callAsync: function (name) {
    for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
      args[_key2 - 1] = arguments[_key2];
    }
    return this.applyAsync(name, args);
  },
  apply: function (name, args, options, callback) {
    // We were passed 3 arguments. They may be either (name, args, options)
    // or (name, args, callback)
    if (!callback && typeof options === 'function') {
      callback = options;
      options = {};
    } else {
      options = options || {};
    }
    const promise = this.applyAsync(name, args, options);

    // Return the result in whichever way the caller asked for it. Note that we
    // do NOT block on the write fence in an analogous way to how the client
    // blocks on the relevant data being visible, so you are NOT guaranteed that
    // cursor observe callbacks have fired when your callback is invoked. (We
    // can change this if there's a real use case).
    if (callback) {
      promise.then(result => callback(undefined, result), exception => callback(exception));
    } else {
      return promise.await();
    }
  },
  // @param options {Optional Object}
  applyAsync: function (name, args, options) {
    // Run the handler
    var handler = this.method_handlers[name];
    if (!handler) {
      return Promise.reject(new Meteor.Error(404, "Method '".concat(name, "' not found")));
    }

    // If this is a method call from within another method or publish function,
    // get the user state from the outer method or publish function, otherwise
    // don't allow setUserId to be called
    var userId = null;
    var setUserId = function () {
      throw new Error("Can't call setUserId on a server initiated method call");
    };
    var connection = null;
    var currentMethodInvocation = DDP._CurrentMethodInvocation.get();
    var currentPublicationInvocation = DDP._CurrentPublicationInvocation.get();
    var randomSeed = null;
    if (currentMethodInvocation) {
      userId = currentMethodInvocation.userId;
      setUserId = function (userId) {
        currentMethodInvocation.setUserId(userId);
      };
      connection = currentMethodInvocation.connection;
      randomSeed = DDPCommon.makeRpcSeed(currentMethodInvocation, name);
    } else if (currentPublicationInvocation) {
      userId = currentPublicationInvocation.userId;
      setUserId = function (userId) {
        currentPublicationInvocation._session._setUserId(userId);
      };
      connection = currentPublicationInvocation.connection;
    }
    var invocation = new DDPCommon.MethodInvocation({
      isSimulation: false,
      userId,
      setUserId,
      connection,
      randomSeed
    });
    return new Promise(resolve => resolve(DDP._CurrentMethodInvocation.withValue(invocation, () => maybeAuditArgumentChecks(handler, invocation, EJSON.clone(args), "internal call to '" + name + "'")))).then(EJSON.clone);
  },
  _urlForSession: function (sessionId) {
    var self = this;
    var session = self.sessions.get(sessionId);
    if (session) return session._socketUrl;else return null;
  }
});
var calculateVersion = function (clientSupportedVersions, serverSupportedVersions) {
  var correctVersion = _.find(clientSupportedVersions, function (version) {
    return _.contains(serverSupportedVersions, version);
  });
  if (!correctVersion) {
    correctVersion = serverSupportedVersions[0];
  }
  return correctVersion;
};
DDPServer._calculateVersion = calculateVersion;

// "blind" exceptions other than those that were deliberately thrown to signal
// errors to the client
var wrapInternalException = function (exception, context) {
  if (!exception) return exception;

  // To allow packages to throw errors intended for the client but not have to
  // depend on the Meteor.Error class, `isClientSafe` can be set to true on any
  // error before it is thrown.
  if (exception.isClientSafe) {
    if (!(exception instanceof Meteor.Error)) {
      const originalMessage = exception.message;
      exception = new Meteor.Error(exception.error, exception.reason, exception.details);
      exception.message = originalMessage;
    }
    return exception;
  }

  // Tests can set the '_expectedByTest' flag on an exception so it won't go to
  // the server log.
  if (!exception._expectedByTest) {
    Meteor._debug("Exception " + context, exception.stack);
    if (exception.sanitizedError) {
      Meteor._debug("Sanitized and reported to the client as:", exception.sanitizedError);
      Meteor._debug();
    }
  }

  // Did the error contain more details that could have been useful if caught in
  // server code (or if thrown from non-client-originated code), but also
  // provided a "sanitized" version with more context than 500 Internal server
  // error? Use that.
  if (exception.sanitizedError) {
    if (exception.sanitizedError.isClientSafe) return exception.sanitizedError;
    Meteor._debug("Exception " + context + " provides a sanitizedError that " + "does not have isClientSafe property set; ignoring");
  }
  return new Meteor.Error(500, "Internal server error");
};

// Audit argument checks, if the audit-argument-checks package exists (it is a
// weak dependency of this package).
var maybeAuditArgumentChecks = function (f, context, args, description) {
  args = args || [];
  if (Package['audit-argument-checks']) {
    return Match._failIfArgumentsAreNotAllChecked(f, context, args, description);
  }
  return f.apply(context, args);
};
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"writefence.js":function module(require){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/ddp-server/writefence.js                                                                                 //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
var Future = Npm.require('fibers/future');

// A write fence collects a group of writes, and provides a callback
// when all of the writes are fully committed and propagated (all
// observers have been notified of the write and acknowledged it.)
//
DDPServer._WriteFence = function () {
  var self = this;
  self.armed = false;
  self.fired = false;
  self.retired = false;
  self.outstanding_writes = 0;
  self.before_fire_callbacks = [];
  self.completion_callbacks = [];
};

// The current write fence. When there is a current write fence, code
// that writes to databases should register their writes with it using
// beginWrite().
//
DDPServer._CurrentWriteFence = new Meteor.EnvironmentVariable();
_.extend(DDPServer._WriteFence.prototype, {
  // Start tracking a write, and return an object to represent it. The
  // object has a single method, committed(). This method should be
  // called when the write is fully committed and propagated. You can
  // continue to add writes to the WriteFence up until it is triggered
  // (calls its callbacks because all writes have committed.)
  beginWrite: function () {
    var self = this;
    if (self.retired) return {
      committed: function () {}
    };
    if (self.fired) throw new Error("fence has already activated -- too late to add writes");
    self.outstanding_writes++;
    var committed = false;
    return {
      committed: function () {
        if (committed) throw new Error("committed called twice on the same write");
        committed = true;
        self.outstanding_writes--;
        self._maybeFire();
      }
    };
  },
  // Arm the fence. Once the fence is armed, and there are no more
  // uncommitted writes, it will activate.
  arm: function () {
    var self = this;
    if (self === DDPServer._CurrentWriteFence.get()) throw Error("Can't arm the current fence");
    self.armed = true;
    self._maybeFire();
  },
  // Register a function to be called once before firing the fence.
  // Callback function can add new writes to the fence, in which case
  // it won't fire until those writes are done as well.
  onBeforeFire: function (func) {
    var self = this;
    if (self.fired) throw new Error("fence has already activated -- too late to " + "add a callback");
    self.before_fire_callbacks.push(func);
  },
  // Register a function to be called when the fence fires.
  onAllCommitted: function (func) {
    var self = this;
    if (self.fired) throw new Error("fence has already activated -- too late to " + "add a callback");
    self.completion_callbacks.push(func);
  },
  // Convenience function. Arms the fence, then blocks until it fires.
  armAndWait: function () {
    var self = this;
    var future = new Future();
    self.onAllCommitted(function () {
      future['return']();
    });
    self.arm();
    future.wait();
  },
  _maybeFire: function () {
    var self = this;
    if (self.fired) throw new Error("write fence already activated?");
    if (self.armed && !self.outstanding_writes) {
      function invokeCallback(func) {
        try {
          func(self);
        } catch (err) {
          Meteor._debug("exception in write fence callback", err);
        }
      }
      self.outstanding_writes++;
      while (self.before_fire_callbacks.length > 0) {
        var callbacks = self.before_fire_callbacks;
        self.before_fire_callbacks = [];
        _.each(callbacks, invokeCallback);
      }
      self.outstanding_writes--;
      if (!self.outstanding_writes) {
        self.fired = true;
        var callbacks = self.completion_callbacks;
        self.completion_callbacks = [];
        _.each(callbacks, invokeCallback);
      }
    }
  },
  // Deactivate this fence so that adding more writes has no effect.
  // The fence must have already fired.
  retire: function () {
    var self = this;
    if (!self.fired) throw new Error("Can't retire a fence that hasn't fired.");
    self.retired = true;
  }
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"crossbar.js":function module(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/ddp-server/crossbar.js                                                                                   //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
// A "crossbar" is a class that provides structured notification registration.
// See _match for the definition of how a notification matches a trigger.
// All notifications and triggers must have a string key named 'collection'.

DDPServer._Crossbar = function (options) {
  var self = this;
  options = options || {};
  self.nextId = 1;
  // map from collection name (string) -> listener id -> object. each object has
  // keys 'trigger', 'callback'.  As a hack, the empty string means "no
  // collection".
  self.listenersByCollection = {};
  self.listenersByCollectionCount = {};
  self.factPackage = options.factPackage || "livedata";
  self.factName = options.factName || null;
};
_.extend(DDPServer._Crossbar.prototype, {
  // msg is a trigger or a notification
  _collectionForMessage: function (msg) {
    var self = this;
    if (!_.has(msg, 'collection')) {
      return '';
    } else if (typeof msg.collection === 'string') {
      if (msg.collection === '') throw Error("Message has empty collection!");
      return msg.collection;
    } else {
      throw Error("Message has non-string collection!");
    }
  },
  // Listen for notification that match 'trigger'. A notification
  // matches if it has the key-value pairs in trigger as a
  // subset. When a notification matches, call 'callback', passing
  // the actual notification.
  //
  // Returns a listen handle, which is an object with a method
  // stop(). Call stop() to stop listening.
  //
  // XXX It should be legal to call fire() from inside a listen()
  // callback?
  listen: function (trigger, callback) {
    var self = this;
    var id = self.nextId++;
    var collection = self._collectionForMessage(trigger);
    var record = {
      trigger: EJSON.clone(trigger),
      callback: callback
    };
    if (!_.has(self.listenersByCollection, collection)) {
      self.listenersByCollection[collection] = {};
      self.listenersByCollectionCount[collection] = 0;
    }
    self.listenersByCollection[collection][id] = record;
    self.listenersByCollectionCount[collection]++;
    if (self.factName && Package['facts-base']) {
      Package['facts-base'].Facts.incrementServerFact(self.factPackage, self.factName, 1);
    }
    return {
      stop: function () {
        if (self.factName && Package['facts-base']) {
          Package['facts-base'].Facts.incrementServerFact(self.factPackage, self.factName, -1);
        }
        delete self.listenersByCollection[collection][id];
        self.listenersByCollectionCount[collection]--;
        if (self.listenersByCollectionCount[collection] === 0) {
          delete self.listenersByCollection[collection];
          delete self.listenersByCollectionCount[collection];
        }
      }
    };
  },
  // Fire the provided 'notification' (an object whose attribute
  // values are all JSON-compatibile) -- inform all matching listeners
  // (registered with listen()).
  //
  // If fire() is called inside a write fence, then each of the
  // listener callbacks will be called inside the write fence as well.
  //
  // The listeners may be invoked in parallel, rather than serially.
  fire: function (notification) {
    var self = this;
    var collection = self._collectionForMessage(notification);
    if (!_.has(self.listenersByCollection, collection)) {
      return;
    }
    var listenersForCollection = self.listenersByCollection[collection];
    var callbackIds = [];
    _.each(listenersForCollection, function (l, id) {
      if (self._matches(notification, l.trigger)) {
        callbackIds.push(id);
      }
    });

    // Listener callbacks can yield, so we need to first find all the ones that
    // match in a single iteration over self.listenersByCollection (which can't
    // be mutated during this iteration), and then invoke the matching
    // callbacks, checking before each call to ensure they haven't stopped.
    // Note that we don't have to check that
    // self.listenersByCollection[collection] still === listenersForCollection,
    // because the only way that stops being true is if listenersForCollection
    // first gets reduced down to the empty object (and then never gets
    // increased again).
    _.each(callbackIds, function (id) {
      if (_.has(listenersForCollection, id)) {
        listenersForCollection[id].callback(notification);
      }
    });
  },
  // A notification matches a trigger if all keys that exist in both are equal.
  //
  // Examples:
  //  N:{collection: "C"} matches T:{collection: "C"}
  //    (a non-targeted write to a collection matches a
  //     non-targeted query)
  //  N:{collection: "C", id: "X"} matches T:{collection: "C"}
  //    (a targeted write to a collection matches a non-targeted query)
  //  N:{collection: "C"} matches T:{collection: "C", id: "X"}
  //    (a non-targeted write to a collection matches a
  //     targeted query)
  //  N:{collection: "C", id: "X"} matches T:{collection: "C", id: "X"}
  //    (a targeted write to a collection matches a targeted query targeted
  //     at the same document)
  //  N:{collection: "C", id: "X"} does not match T:{collection: "C", id: "Y"}
  //    (a targeted write to a collection does not match a targeted query
  //     targeted at a different document)
  _matches: function (notification, trigger) {
    // Most notifications that use the crossbar have a string `collection` and
    // maybe an `id` that is a string or ObjectID. We're already dividing up
    // triggers by collection, but let's fast-track "nope, different ID" (and
    // avoid the overly generic EJSON.equals). This makes a noticeable
    // performance difference; see https://github.com/meteor/meteor/pull/3697
    if (typeof notification.id === 'string' && typeof trigger.id === 'string' && notification.id !== trigger.id) {
      return false;
    }
    if (notification.id instanceof MongoID.ObjectID && trigger.id instanceof MongoID.ObjectID && !notification.id.equals(trigger.id)) {
      return false;
    }
    return _.all(trigger, function (triggerValue, key) {
      return !_.has(notification, key) || EJSON.equals(triggerValue, notification[key]);
    });
  }
});

// The "invalidation crossbar" is a specific instance used by the DDP server to
// implement write fence notifications. Listener callbacks on this crossbar
// should call beginWrite on the current write fence before they return, if they
// want to delay the write fence from firing (ie, the DDP method-data-updated
// message from being sent).
DDPServer._InvalidationCrossbar = new DDPServer._Crossbar({
  factName: "invalidation-crossbar-listeners"
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"server_convenience.js":function module(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/ddp-server/server_convenience.js                                                                         //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
if (process.env.DDP_DEFAULT_CONNECTION_URL) {
  __meteor_runtime_config__.DDP_DEFAULT_CONNECTION_URL = process.env.DDP_DEFAULT_CONNECTION_URL;
}
Meteor.server = new Server();
Meteor.refresh = function (notification) {
  DDPServer._InvalidationCrossbar.fire(notification);
};

// Proxy the public methods of Meteor.server so they can
// be called directly on Meteor.
_.each(['publish', 'methods', 'call', 'callAsync', 'apply', 'applyAsync', 'onConnection', 'onMessage'], function (name) {
  Meteor[name] = _.bind(Meteor.server[name], Meteor.server);
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

require("/node_modules/meteor/ddp-server/stream_server.js");
require("/node_modules/meteor/ddp-server/livedata_server.js");
require("/node_modules/meteor/ddp-server/writefence.js");
require("/node_modules/meteor/ddp-server/crossbar.js");
require("/node_modules/meteor/ddp-server/server_convenience.js");

/* Exports */
Package._define("ddp-server", {
  DDPServer: DDPServer
});

})();

//# sourceURL=meteor://💻app/packages/ddp-server.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvZGRwLXNlcnZlci9zdHJlYW1fc2VydmVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9kZHAtc2VydmVyL2xpdmVkYXRhX3NlcnZlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvZGRwLXNlcnZlci93cml0ZWZlbmNlLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9kZHAtc2VydmVyL2Nyb3NzYmFyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9kZHAtc2VydmVyL3NlcnZlcl9jb252ZW5pZW5jZS5qcyJdLCJuYW1lcyI6WyJ3ZWJzb2NrZXRFeHRlbnNpb25zIiwiXyIsIm9uY2UiLCJleHRlbnNpb25zIiwid2Vic29ja2V0Q29tcHJlc3Npb25Db25maWciLCJwcm9jZXNzIiwiZW52IiwiU0VSVkVSX1dFQlNPQ0tFVF9DT01QUkVTU0lPTiIsIkpTT04iLCJwYXJzZSIsInB1c2giLCJOcG0iLCJyZXF1aXJlIiwiY29uZmlndXJlIiwicGF0aFByZWZpeCIsIl9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18iLCJST09UX1VSTF9QQVRIX1BSRUZJWCIsIlN0cmVhbVNlcnZlciIsInNlbGYiLCJyZWdpc3RyYXRpb25fY2FsbGJhY2tzIiwib3Blbl9zb2NrZXRzIiwicHJlZml4IiwiUm91dGVQb2xpY3kiLCJkZWNsYXJlIiwic29ja2pzIiwic2VydmVyT3B0aW9ucyIsImxvZyIsImhlYXJ0YmVhdF9kZWxheSIsImRpc2Nvbm5lY3RfZGVsYXkiLCJkaXNhYmxlX2NvcnMiLCJESVNBQkxFX1NPQ0tKU19DT1JTIiwianNlc3Npb25pZCIsIlVTRV9KU0VTU0lPTklEIiwiRElTQUJMRV9XRUJTT0NLRVRTIiwid2Vic29ja2V0IiwiZmF5ZV9zZXJ2ZXJfb3B0aW9ucyIsInNlcnZlciIsImNyZWF0ZVNlcnZlciIsIldlYkFwcCIsImh0dHBTZXJ2ZXIiLCJyZW1vdmVMaXN0ZW5lciIsIl90aW1lb3V0QWRqdXN0bWVudFJlcXVlc3RDYWxsYmFjayIsImluc3RhbGxIYW5kbGVycyIsImFkZExpc3RlbmVyIiwiX3JlZGlyZWN0V2Vic29ja2V0RW5kcG9pbnQiLCJvbiIsInNvY2tldCIsInNldFdlYnNvY2tldFRpbWVvdXQiLCJ0aW1lb3V0IiwicHJvdG9jb2wiLCJfc2Vzc2lvbiIsInJlY3YiLCJjb25uZWN0aW9uIiwic2V0VGltZW91dCIsInNlbmQiLCJkYXRhIiwid3JpdGUiLCJ3aXRob3V0IiwiVEVTVF9NRVRBREFUQSIsInN0cmluZ2lmeSIsInRlc3RNZXNzYWdlT25Db25uZWN0IiwiZWFjaCIsImNhbGxiYWNrIiwiT2JqZWN0IiwiYXNzaWduIiwicHJvdG90eXBlIiwicmVnaXN0ZXIiLCJhbGxfc29ja2V0cyIsInZhbHVlcyIsImZvckVhY2giLCJldmVudCIsIm9sZEh0dHBTZXJ2ZXJMaXN0ZW5lcnMiLCJsaXN0ZW5lcnMiLCJzbGljZSIsInJlbW92ZUFsbExpc3RlbmVycyIsIm5ld0xpc3RlbmVyIiwicmVxdWVzdCIsImFyZ3MiLCJhcmd1bWVudHMiLCJ1cmwiLCJwYXJzZWRVcmwiLCJwYXRobmFtZSIsImZvcm1hdCIsIm9sZExpc3RlbmVyIiwiYXBwbHkiLCJfb2JqZWN0U3ByZWFkIiwibW9kdWxlIiwibGluayIsImRlZmF1bHQiLCJ2IiwiRERQU2VydmVyIiwiRmliZXIiLCJwdWJsaWNhdGlvblN0cmF0ZWdpZXMiLCJTRVJWRVJfTUVSR0UiLCJ1c2VEdW1teURvY3VtZW50VmlldyIsInVzZUNvbGxlY3Rpb25WaWV3IiwiZG9BY2NvdW50aW5nRm9yQ29sbGVjdGlvbiIsIk5PX01FUkdFX05PX0hJU1RPUlkiLCJOT19NRVJHRSIsIk5PX01FUkdFX01VTFRJIiwiRHVtbXlEb2N1bWVudFZpZXciLCJleGlzdHNJbiIsIlNldCIsImRhdGFCeUtleSIsIk1hcCIsImdldEZpZWxkcyIsImNsZWFyRmllbGQiLCJzdWJzY3JpcHRpb25IYW5kbGUiLCJrZXkiLCJjaGFuZ2VDb2xsZWN0b3IiLCJ1bmRlZmluZWQiLCJjaGFuZ2VGaWVsZCIsInZhbHVlIiwiaXNBZGQiLCJTZXNzaW9uRG9jdW1lbnRWaWV3IiwiX1Nlc3Npb25Eb2N1bWVudFZpZXciLCJleHRlbmQiLCJyZXQiLCJwcmVjZWRlbmNlTGlzdCIsImdldCIsInJlbW92ZWRWYWx1ZSIsImkiLCJsZW5ndGgiLCJwcmVjZWRlbmNlIiwic3BsaWNlIiwiZGVsZXRlIiwiRUpTT04iLCJlcXVhbHMiLCJjbG9uZSIsImhhcyIsInNldCIsImVsdCIsImZpbmQiLCJTZXNzaW9uQ29sbGVjdGlvblZpZXciLCJjb2xsZWN0aW9uTmFtZSIsInNlc3Npb25DYWxsYmFja3MiLCJkb2N1bWVudHMiLCJjYWxsYmFja3MiLCJfU2Vzc2lvbkNvbGxlY3Rpb25WaWV3IiwiaXNFbXB0eSIsInNpemUiLCJkaWZmIiwicHJldmlvdXMiLCJEaWZmU2VxdWVuY2UiLCJkaWZmTWFwcyIsImJvdGgiLCJiaW5kIiwiZGlmZkRvY3VtZW50IiwicmlnaHRPbmx5IiwiaWQiLCJub3dEViIsImFkZGVkIiwibGVmdE9ubHkiLCJwcmV2RFYiLCJyZW1vdmVkIiwiZmllbGRzIiwiZGlmZk9iamVjdHMiLCJwcmV2Iiwibm93IiwiY2hhbmdlZCIsImRvY1ZpZXciLCJNZXRlb3IiLCJnZXRQdWJsaWNhdGlvblN0cmF0ZWd5IiwiYWRkIiwiY2hhbmdlZFJlc3VsdCIsIkVycm9yIiwiZXJyIiwiU2Vzc2lvbiIsInZlcnNpb24iLCJvcHRpb25zIiwiUmFuZG9tIiwiaW5pdGlhbGl6ZWQiLCJpblF1ZXVlIiwiX0RvdWJsZUVuZGVkUXVldWUiLCJibG9ja2VkIiwid29ya2VyUnVubmluZyIsImNhY2hlZFVuYmxvY2siLCJfbmFtZWRTdWJzIiwiX3VuaXZlcnNhbFN1YnMiLCJ1c2VySWQiLCJjb2xsZWN0aW9uVmlld3MiLCJfaXNTZW5kaW5nIiwiX2RvbnRTdGFydE5ld1VuaXZlcnNhbFN1YnMiLCJfcGVuZGluZ1JlYWR5IiwiX2Nsb3NlQ2FsbGJhY2tzIiwiX3NvY2tldFVybCIsIl9yZXNwb25kVG9QaW5ncyIsInJlc3BvbmRUb1BpbmdzIiwiY29ubmVjdGlvbkhhbmRsZSIsImNsb3NlIiwib25DbG9zZSIsImZuIiwiY2IiLCJiaW5kRW52aXJvbm1lbnQiLCJkZWZlciIsImNsaWVudEFkZHJlc3MiLCJfY2xpZW50QWRkcmVzcyIsImh0dHBIZWFkZXJzIiwiaGVhZGVycyIsIm1zZyIsInNlc3Npb24iLCJzdGFydFVuaXZlcnNhbFN1YnMiLCJydW4iLCJoZWFydGJlYXRJbnRlcnZhbCIsImhlYXJ0YmVhdCIsIkREUENvbW1vbiIsIkhlYXJ0YmVhdCIsImhlYXJ0YmVhdFRpbWVvdXQiLCJvblRpbWVvdXQiLCJzZW5kUGluZyIsInN0YXJ0IiwiUGFja2FnZSIsIkZhY3RzIiwiaW5jcmVtZW50U2VydmVyRmFjdCIsInNlbmRSZWFkeSIsInN1YnNjcmlwdGlvbklkcyIsInN1YnMiLCJzdWJzY3JpcHRpb25JZCIsIl9jYW5TZW5kIiwic2VuZEFkZGVkIiwiY29sbGVjdGlvbiIsInNlbmRDaGFuZ2VkIiwic2VuZFJlbW92ZWQiLCJnZXRTZW5kQ2FsbGJhY2tzIiwiZ2V0Q29sbGVjdGlvblZpZXciLCJ2aWV3IiwiaGFuZGxlcnMiLCJ1bml2ZXJzYWxfcHVibGlzaF9oYW5kbGVycyIsImhhbmRsZXIiLCJfc3RhcnRTdWJzY3JpcHRpb24iLCJzdG9wIiwiX21ldGVvclNlc3Npb24iLCJfZGVhY3RpdmF0ZUFsbFN1YnNjcmlwdGlvbnMiLCJfcmVtb3ZlU2Vzc2lvbiIsIl9wcmludFNlbnRERFAiLCJfZGVidWciLCJzdHJpbmdpZnlERFAiLCJzZW5kRXJyb3IiLCJyZWFzb24iLCJvZmZlbmRpbmdNZXNzYWdlIiwicHJvY2Vzc01lc3NhZ2UiLCJtc2dfaW4iLCJtZXNzYWdlUmVjZWl2ZWQiLCJwcm9jZXNzTmV4dCIsInNoaWZ0IiwidW5ibG9jayIsIm9uTWVzc2FnZUhvb2siLCJwcm90b2NvbF9oYW5kbGVycyIsImNhbGwiLCJzdWIiLCJuYW1lIiwicGFyYW1zIiwiQXJyYXkiLCJwdWJsaXNoX2hhbmRsZXJzIiwiZXJyb3IiLCJjb25jYXQiLCJERFBSYXRlTGltaXRlciIsInJhdGVMaW1pdGVySW5wdXQiLCJ0eXBlIiwiY29ubmVjdGlvbklkIiwiX2luY3JlbWVudCIsInJhdGVMaW1pdFJlc3VsdCIsIl9jaGVjayIsImFsbG93ZWQiLCJnZXRFcnJvck1lc3NhZ2UiLCJ0aW1lVG9SZXNldCIsInVuc3ViIiwiX3N0b3BTdWJzY3JpcHRpb24iLCJtZXRob2QiLCJyYW5kb21TZWVkIiwiZmVuY2UiLCJfV3JpdGVGZW5jZSIsIm9uQWxsQ29tbWl0dGVkIiwicmV0aXJlIiwibWV0aG9kcyIsIm1ldGhvZF9oYW5kbGVycyIsImFybSIsInNldFVzZXJJZCIsIl9zZXRVc2VySWQiLCJpbnZvY2F0aW9uIiwiTWV0aG9kSW52b2NhdGlvbiIsImlzU2ltdWxhdGlvbiIsInByb21pc2UiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImdldEN1cnJlbnRNZXRob2RJbnZvY2F0aW9uUmVzdWx0IiwiY3VycmVudENvbnRleHQiLCJERFAiLCJfQ3VycmVudE1ldGhvZEludm9jYXRpb24iLCJfc2V0TmV3Q29udGV4dEFuZEdldEN1cnJlbnQiLCJyZXN1bHQiLCJyZXN1bHRPclRoZW5hYmxlIiwibWF5YmVBdWRpdEFyZ3VtZW50Q2hlY2tzIiwiaXNUaGVuYWJsZSIsInRoZW4iLCJhd2FpdCIsIl9zZXQiLCJfQ3VycmVudFdyaXRlRmVuY2UiLCJ3aXRoVmFsdWUiLCJmaW5pc2giLCJwYXlsb2FkIiwiZXhjZXB0aW9uIiwid3JhcEludGVybmFsRXhjZXB0aW9uIiwiX2VhY2hTdWIiLCJmIiwiX2RpZmZDb2xsZWN0aW9uVmlld3MiLCJiZWZvcmVDVnMiLCJsZWZ0VmFsdWUiLCJyaWdodFZhbHVlIiwiZG9jIiwiX2RlYWN0aXZhdGUiLCJvbGROYW1lZFN1YnMiLCJuZXdTdWIiLCJfcmVjcmVhdGUiLCJfcnVuSGFuZGxlciIsIl9ub1lpZWxkc0FsbG93ZWQiLCJzdWJJZCIsIlN1YnNjcmlwdGlvbiIsInVuYmxvY2tIYW5kZXIiLCJzdWJOYW1lIiwibWF5YmVTdWIiLCJfbmFtZSIsIl9yZW1vdmVBbGxEb2N1bWVudHMiLCJyZXNwb25zZSIsImh0dHBGb3J3YXJkZWRDb3VudCIsInBhcnNlSW50IiwicmVtb3RlQWRkcmVzcyIsImZvcndhcmRlZEZvciIsImlzU3RyaW5nIiwidHJpbSIsInNwbGl0IiwiX2hhbmRsZXIiLCJfc3Vic2NyaXB0aW9uSWQiLCJfcGFyYW1zIiwiX3N1YnNjcmlwdGlvbkhhbmRsZSIsIl9kZWFjdGl2YXRlZCIsIl9zdG9wQ2FsbGJhY2tzIiwiX2RvY3VtZW50cyIsIl9yZWFkeSIsIl9pZEZpbHRlciIsImlkU3RyaW5naWZ5IiwiTW9uZ29JRCIsImlkUGFyc2UiLCJfQ3VycmVudFB1YmxpY2F0aW9uSW52b2NhdGlvbiIsImUiLCJfaXNEZWFjdGl2YXRlZCIsIl9wdWJsaXNoSGFuZGxlclJlc3VsdCIsInJlcyIsImlzQ3Vyc29yIiwiYyIsIl9wdWJsaXNoQ3Vyc29yIiwicmVhZHkiLCJpc0FycmF5IiwiYWxsIiwiY29sbGVjdGlvbk5hbWVzIiwiX2dldENvbGxlY3Rpb25OYW1lIiwiY3VyIiwiX2NhbGxTdG9wQ2FsbGJhY2tzIiwiY29sbGVjdGlvbkRvY3MiLCJzdHJJZCIsIm9uU3RvcCIsImlkcyIsIlNlcnZlciIsImRlZmF1bHRQdWJsaWNhdGlvblN0cmF0ZWd5Iiwib25Db25uZWN0aW9uSG9vayIsIkhvb2siLCJkZWJ1Z1ByaW50RXhjZXB0aW9ucyIsIl9wdWJsaWNhdGlvblN0cmF0ZWdpZXMiLCJzZXNzaW9ucyIsInN0cmVhbV9zZXJ2ZXIiLCJyYXdfbXNnIiwiX3ByaW50UmVjZWl2ZWRERFAiLCJwYXJzZUREUCIsIl9oYW5kbGVDb25uZWN0Iiwib25Db25uZWN0aW9uIiwic2V0UHVibGljYXRpb25TdHJhdGVneSIsInN0cmF0ZWd5IiwiaW5jbHVkZXMiLCJvbk1lc3NhZ2UiLCJzdXBwb3J0IiwiY29udGFpbnMiLCJTVVBQT1JURURfRERQX1ZFUlNJT05TIiwiY2FsY3VsYXRlVmVyc2lvbiIsInB1Ymxpc2giLCJpc09iamVjdCIsImF1dG9wdWJsaXNoIiwiaXNfYXV0byIsIndhcm5lZF9hYm91dF9hdXRvcHVibGlzaCIsImZ1bmMiLCJfbGVuIiwiX2tleSIsInBvcCIsImNhbGxBc3luYyIsIl9sZW4yIiwiX2tleTIiLCJhcHBseUFzeW5jIiwiY3VycmVudE1ldGhvZEludm9jYXRpb24iLCJjdXJyZW50UHVibGljYXRpb25JbnZvY2F0aW9uIiwibWFrZVJwY1NlZWQiLCJfdXJsRm9yU2Vzc2lvbiIsInNlc3Npb25JZCIsImNsaWVudFN1cHBvcnRlZFZlcnNpb25zIiwic2VydmVyU3VwcG9ydGVkVmVyc2lvbnMiLCJjb3JyZWN0VmVyc2lvbiIsIl9jYWxjdWxhdGVWZXJzaW9uIiwiY29udGV4dCIsImlzQ2xpZW50U2FmZSIsIm9yaWdpbmFsTWVzc2FnZSIsIm1lc3NhZ2UiLCJkZXRhaWxzIiwiX2V4cGVjdGVkQnlUZXN0Iiwic3RhY2siLCJzYW5pdGl6ZWRFcnJvciIsImRlc2NyaXB0aW9uIiwiTWF0Y2giLCJfZmFpbElmQXJndW1lbnRzQXJlTm90QWxsQ2hlY2tlZCIsIkZ1dHVyZSIsImFybWVkIiwiZmlyZWQiLCJyZXRpcmVkIiwib3V0c3RhbmRpbmdfd3JpdGVzIiwiYmVmb3JlX2ZpcmVfY2FsbGJhY2tzIiwiY29tcGxldGlvbl9jYWxsYmFja3MiLCJFbnZpcm9ubWVudFZhcmlhYmxlIiwiYmVnaW5Xcml0ZSIsImNvbW1pdHRlZCIsIl9tYXliZUZpcmUiLCJvbkJlZm9yZUZpcmUiLCJhcm1BbmRXYWl0IiwiZnV0dXJlIiwid2FpdCIsImludm9rZUNhbGxiYWNrIiwiX0Nyb3NzYmFyIiwibmV4dElkIiwibGlzdGVuZXJzQnlDb2xsZWN0aW9uIiwibGlzdGVuZXJzQnlDb2xsZWN0aW9uQ291bnQiLCJmYWN0UGFja2FnZSIsImZhY3ROYW1lIiwiX2NvbGxlY3Rpb25Gb3JNZXNzYWdlIiwibGlzdGVuIiwidHJpZ2dlciIsInJlY29yZCIsImZpcmUiLCJub3RpZmljYXRpb24iLCJsaXN0ZW5lcnNGb3JDb2xsZWN0aW9uIiwiY2FsbGJhY2tJZHMiLCJsIiwiX21hdGNoZXMiLCJPYmplY3RJRCIsInRyaWdnZXJWYWx1ZSIsIl9JbnZhbGlkYXRpb25Dcm9zc2JhciIsIkREUF9ERUZBVUxUX0NPTk5FQ1RJT05fVVJMIiwicmVmcmVzaCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUlBLG1CQUFtQixHQUFHQyxDQUFDLENBQUNDLElBQUksQ0FBQyxZQUFZO0VBQzNDLElBQUlDLFVBQVUsR0FBRyxFQUFFO0VBRW5CLElBQUlDLDBCQUEwQixHQUFHQyxPQUFPLENBQUNDLEdBQUcsQ0FBQ0MsNEJBQTRCLEdBQ2pFQyxJQUFJLENBQUNDLEtBQUssQ0FBQ0osT0FBTyxDQUFDQyxHQUFHLENBQUNDLDRCQUE0QixDQUFDLEdBQUcsQ0FBQyxDQUFDO0VBQ2pFLElBQUlILDBCQUEwQixFQUFFO0lBQzlCRCxVQUFVLENBQUNPLElBQUksQ0FBQ0MsR0FBRyxDQUFDQyxPQUFPLENBQUMsb0JBQW9CLENBQUMsQ0FBQ0MsU0FBUyxDQUN6RFQsMEJBQ0YsQ0FBQyxDQUFDO0VBQ0o7RUFFQSxPQUFPRCxVQUFVO0FBQ25CLENBQUMsQ0FBQztBQUVGLElBQUlXLFVBQVUsR0FBR0MseUJBQXlCLENBQUNDLG9CQUFvQixJQUFLLEVBQUU7QUFFdEVDLFlBQVksR0FBRyxTQUFBQSxDQUFBLEVBQVk7RUFDekIsSUFBSUMsSUFBSSxHQUFHLElBQUk7RUFDZkEsSUFBSSxDQUFDQyxzQkFBc0IsR0FBRyxFQUFFO0VBQ2hDRCxJQUFJLENBQUNFLFlBQVksR0FBRyxFQUFFOztFQUV0QjtFQUNBO0VBQ0FGLElBQUksQ0FBQ0csTUFBTSxHQUFHUCxVQUFVLEdBQUcsU0FBUztFQUNwQ1EsV0FBVyxDQUFDQyxPQUFPLENBQUNMLElBQUksQ0FBQ0csTUFBTSxHQUFHLEdBQUcsRUFBRSxTQUFTLENBQUM7O0VBRWpE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QyxJQUM5QmtCLEtBQUssQ0FBQ0MsTUFBTSxDQUFDbVUsWUFBWSxFQUFFTixZQUFZLENBQUNoVixHQUFHLENBQUMsQ0FBQztJQUNqRCxDQUFDLENBQUM7RUFDSjtBQUNGLENBQUMsQ0FBQzs7QUFFRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0FsQixTQUFTLENBQUN5VyxxQkFBcUIsR0FBRyxJQUFJelcsU0FBUyxDQUFDdVYsU0FBUyxDQUFDO0VBQ3hESyxRQUFRLEVBQUU7QUFDWixDQUFDLENBQUMsQzs7Ozs7Ozs7Ozs7QUN0S0YsSUFBSWpiLE9BQU8sQ0FBQ0MsR0FBRyxDQUFDOGIsMEJBQTBCLEVBQUU7RUFDMUNyYix5QkFBeUIsQ0FBQ3FiLDBCQUEwQixHQUNsRC9iLE9BQU8sQ0FBQ0MsR0FBRyxDQUFDOGIsMEJBQTBCO0FBQzFDO0FBRUFuUyxNQUFNLENBQUM3SCxNQUFNLEdBQUcsSUFBSXVVLE1BQU0sQ0FBRCxDQUFDO0FBRTFCMU0sTUFBTSxDQUFDb1MsT0FBTyxHQUFHLFVBQVVULFlBQVksRUFBRTtFQUN2Q2xXLFNBQVMsQ0FBQ3lXLHFCQUFxQixDQUFDUixJQUFJLENBQUNDLFlBQVksQ0FBQztBQUNwRCxDQUFDOztBQUVEO0FBQ0E7QUFDQTNiLENBQUMsQ0FBQzRELElBQUksQ0FDSixDQUNFLFNBQVMsRUFDVCxTQUFTLEVBQ1QsTUFBTSxFQUNOLFdBQVcsRUFDWCxPQUFPLEVBQ1AsWUFBWSxFQUNaLGNBQWMsRUFDZCxXQUFXLENBQ1osRUFDRCxVQUFTNkwsSUFBSSxFQUFFO0VBQ2J6RixNQUFNLENBQUN5RixJQUFJLENBQUMsR0FBR3pQLENBQUMsQ0FBQ2lKLElBQUksQ0FBQ2UsTUFBTSxDQUFDN0gsTUFBTSxDQUFDc04sSUFBSSxDQUFDLEVBQUV6RixNQUFNLENBQUM3SCxNQUFNLENBQUM7QUFDM0QsQ0FDRixDQUFDLEMiLCJmaWxlIjoiL3BhY2thZ2VzL2RkcC1zZXJ2ZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBCeSBkZWZhdWx0LCB3ZSB1c2UgdGhlIHBlcm1lc3NhZ2UtZGVmbGF0ZSBleHRlbnNpb24gd2l0aCBkZWZhdWx0XG4vLyBjb25maWd1cmF0aW9uLiBJZiAkU0VSVkVSX1dFQlNPQ0tFVF9DT01QUkVTU0lPTiBpcyBzZXQsIHRoZW4gaXQgbXVzdCBiZSB2YWxpZFxuLy8gSlNPTi4gSWYgaXQgcmVwcmVzZW50cyBhIGZhbHNleSB2YWx1ZSwgdGhlbiB3ZSBkbyBub3QgdXNlIHBlcm1lc3NhZ2UtZGVmbGF0ZVxuLy8gYXQgYWxsOyBvdGhlcndpc2UsIHRoZSBKU09OIHZhbHVlIGlzIHVzZWQgYXMgYW4gYXJndW1lbnQgdG8gZGVmbGF0ZSdzXG4vLyBjb25maWd1cmUgbWV0aG9kOyBzZWVcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9mYXllL3Blcm1lc3NhZ2UtZGVmbGF0ZS1ub2RlL2Jsb2IvbWFzdGVyL1JFQURNRS5tZFxuLy9cbi8vIChXZSBkbyB0aGlzIGluIGFuIF8ub25jZSBpbnN0ZWFkIG9mIGF0IHN0YXJ0dXAsIGJlY2F1c2Ugd2UgZG9uJ3Qgd2FudCB0b1xuLy8gY3Jhc2ggdGhlIHRvb2wgZHVyaW5nIGlzb3BhY2tldCBsb2FkIGlmIHlvdXIgSlNPTiBkb2Vzbid0IHBhcnNlLiBUaGlzIGlzIG9ubHlcbi8vIGEgcHJvYmxlbSBiZWNhdXNlIHRoZSB0b29sIGhhcyB0byBsb2FkIHRoZSBERFAgc2VydmVyIGNvZGUganVzdCBpbiBvcmRlciB0b1xuLy8gYmUgYSBERFAgY2xpZW50OyBzZWUgaHR0cHM6Ly9naXRodWIuY29tL21ldGVvci9tZXRlb3IvaXNzdWVzLzM0NTIgLilcbnZhciB3ZWJzb2NrZXRFeHRlbnNpb25zID0gXy5vbmNlKGZ1bmN0aW9uICgpIHtcbiAgdmFyIGV4dGVuc2lvbnMgPSBbXTtcblxuICB2YXIgd2Vic29ja2V0Q29tcHJlc3Npb25Db25maWcgPSBwcm9jZXNzLmVudi5TRVJWRVJfV0VCU09DS0VUX0NPTVBSRVNTSU9OXG4gICAgICAgID8gSlNPTi5wYXJzZShwcm9jZXNzLmVudi5TRVJWRVJfV0VCU09DS0VUX0NPTVBSRVNTSU9OKSA6IHt9O1xuICBpZiAod2Vic29ja2V0Q29tcHJlc3Npb25Db25maWcpIHtcbiAgICBleHRlbnNpb25zLnB1c2goTnBtLnJlcXVpcmUoJ3Blcm1lc3NhZ2UtZGVmbGF0ZScpLmNvbmZpZ3VyZShcbiAgICAgIHdlYnNvY2tldENvbXByZXNzaW9uQ29uZmlnXG4gICAgKSk7XG4gIH1cblxuICByZXR1cm4gZXh0ZW5zaW9ucztcbn0pO1xuXG52YXIgcGF0aFByZWZpeCA9IF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18uUk9PVF9VUkxfUEFUSF9QUkVGSVggfHwgIFwiXCI7XG5cblN0cmVhbVNlcnZlciA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBzZWxmLnJlZ2lzdHJhdGlvbl9jYWxsYmFja3MgPSBbXTtcbiAgc2VsZi5vcGVuX3NvY2tldHMgPSBbXTtcblxuICAvLyBCZWNhdXNlIHdlIGFyZSBpbnN0YWxsaW5nIGRpcmVjdGx5IG9udG8gV2ViQXBwLmh0dHBTZXJ2ZXIgaW5zdGVhZCBvZiB1c2luZ1xuICAvLyBXZWJBcHAuYXBwLCB3ZSBoYXZlIHRvIHByb2Nlc3MgdGhlIHBhdGggcHJlZml4IG91cnNlbHZlcy5cbiAgc2VsZi5wcmVmaXggPSBwYXRoUHJlZml4ICsgJy9zb2NranMnO1xuICBSb3V0ZVBvbGljeS5kZWNsYXJlKHNlbGYucHJlZml4ICsgJy8nLCAnbmV0d29yaycpO1xuXG4gIC8vIHNldCB1cCBzb2NranNcbiAgdmFyIHNvY2tqcyA9IE5wbS5yZXF1aXJlKCdzb2NranMnKTtcbiAgdmFyIHNlcnZlck9wdGlvbnMgPSB7XG4gICAgcHJlZml4OiBzZWxmLnByZWZpeCxcbiAgICBsb2c6IGZ1bmN0aW9uKCkge30sXG4gICAgLy8gdGhpcyBpcyB0aGUgZGVmYXVsdCwgYnV0IHdlIGNvZGUgaXQgZXhwbGljaXRseSBiZWNhdXNlIHdlIGRlcGVuZFxuICAgIC8vIG9uIGl0IGluIHN0cmVhbV9jbGllbnQ6SEVBUlRCRUFUX1RJTUVPVVRcbiAgICBoZWFydGJlYXRfZGVsYXk6IDQ1MDAwLFxuICAgIC8vIFRoZSBkZWZhdWx0IGRpc2Nvbm5lY3RfZGVsYXkgaXMgNSBzZWNvbmRzLCBidXQgaWYgdGhlIHNlcnZlciBlbmRzIHVwIENQVVxuICAgIC8vIGJvdW5kIGZvciB0aGF0IG11Y2ggdGltZSwgU29ja0pTIG1pZ2h0IG5vdCBub3RpY2UgdGhhdCB0aGUgdXNlciBoYXNcbiAgICAvLyByZWNvbm5lY3RlZCBiZWNhdXNlIHRoZSB0aW1lciAob2YgZGlzY29ubmVjdF9kZWxheSBtcykgY2FuIGZpcmUgYmVmb3JlXG4gICAgLy8gU29ja0pTIHByb2Nlc3NlcyB0aGUgbmV3IGNvbm5lY3Rpb24uIEV2ZW50dWFsbHkgd2UnbGwgZml4IHRoaXMgYnkgbm90XG4gICAgLy8gY29tYmluaW5nIENQVS1oZWF2eSBwcm9jZXNzaW5nIHdpdGggU29ja0pTIHRlcm1pbmF0aW9uIChlZyBhIHByb3h5IHdoaWNoXG4gICAgLy8gY29udmVydHMgdG8gVW5peCBzb2NrZXRzKSBidXQgZm9yIG5vdywgcmFpc2UgdGhlIGRlbGF5LlxuICAgIGRpc2Nvbm5lY3RfZGVsYXk6IDYwICogMTAwMCxcbiAgICAvLyBBbGxvdyBkaXNhYmxpbmcgb2YgQ09SUyByZXF1ZXN0cyB0byBhZGRyZXNzXG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL21ldGVvci9tZXRlb3IvaXNzdWVzLzgzMTcuXG4gICAgZGlzYWJsZV9jb3JzOiAhIXByb2Nlc3MuZW52LkRJU0FCTEVfU09DS0pTX0NPUlMsXG4gICAgLy8gU2V0IHRoZSBVU0VfSlNFU1NJT05JRCBlbnZpcm9ubWVudCB2YXJpYWJsZSB0byBlbmFibGUgc2V0dGluZyB0aGVcbiAgICAvLyBKU0VTU0lPTklEIGNvb2tpZS4gVGhpcyBpcyB1c2VmdWwgZm9yIHNldHRpbmcgdXAgcHJveGllcyB3aXRoXG4gICAgLy8gc2Vzc2lvbiBhZmZpbml0eS5cbiAgICBqc2Vzc2lvbmlkOiAhIXByb2Nlc3MuZW52LlVTRV9KU0VTU0lPTklEXG4gIH07XG5cbiAgLy8gSWYgeW91IGtub3cgeW91ciBzZXJ2ZXIgZW52aXJvbm1lbnQgKGVnLCBwcm94aWVzKSB3aWxsIHByZXZlbnQgd2Vic29ja2V0c1xuICAvLyBmcm9tIGV2ZXIgd29ya2luZywgc2V0ICRESVNBQkxFX1dFQlNPQ0tFVFMgYW5kIFNvY2tKUyBjbGllbnRzIChpZSxcbiAgLy8gYnJvd3NlcnMpIHdpbGwgbm90IHdhc3RlIHRpbWUgYXR0ZW1wdGluZyB0byB1c2UgdGhlbS5cbiAgLy8gKFlvdXIgc2VydmVyIHdpbGwgc3RpbGwgaGF2ZSBhIC93ZWJzb2NrZXQgZW5kcG9pbnQuKVxuICBpZiAocHJvY2Vzcy5lbnYuRElTQUJMRV9XRUJTT0NLRVRTKSB7XG4gICAgc2VydmVyT3B0aW9ucy53ZWJzb2NrZXQgPSBmYWxzZTtcbiAgfSBlbHNlIHtcbiAgICBzZXJ2ZXJPcHRpb25zLmZheWVfc2VydmVyX29wdGlvbnMgPSB7XG4gICAgICBleHRlbnNpb25zOiB3ZWJzb2NrZXRFeHRlbnNpb25zKClcbiAgICB9O1xuICB9XG5cbiAgc2VsZi5zZXJ2ZXIgPSBzb2NranMuY3JlYXRlU2VydmVyKHNlcnZlck9wdGlvbnMpO1xuXG4gIC8vIEluc3RhbGwgdGhlIHNvY2tqcyBoYW5kbGVycywgYnV0IHdlIHdhbnQgdG8ga2VlcCBhcm91bmQgb3VyIG93biBwYXJ0aWN1bGFyXG4gIC8vIHJlcXVlc3QgaGFuZGxlciB0aGF0IGFkanVzdHMgaWRsZSB0aW1lb3V0cyB3aGlsZSB3ZSBoYXZlIGFuIG91dHN0YW5kaW5nXG4gIC8vIHJlcXVlc3QuICBUaGlzIGNvbXBlbnNhdGVzIGZvciB0aGUgZmFjdCB0aGF0IHNvY2tqcyByZW1vdmVzIGFsbCBsaXN0ZW5lcnNcbiAgLy8gZm9yIFwicmVxdWVzdFwiIHRvIGFkZCBpdHMgb3duLlxuICBXZWJBcHAuaHR0cFNlcnZlci5yZW1vdmVMaXN0ZW5lcihcbiAgICAncmVxdWVzdCcsIFdlYkFwcC5fdGltZW91dEFkanVzdG1lbnRSZXF1ZXN0Q2FsbGJhY2spO1xuICBzZWxmLnNlcnZlci5pbnN0YWxsSGFuZGxlcnMoV2ViQXBwLmh0dHBTZXJ2ZXIpO1xuICBXZWJBcHAuaHR0cFNlcnZlci5hZGRMaXN0ZW5lcihcbiAgICAncmVxdWVzdCcsIFdlYkFwcC5fdGltZW91dEFkanVzdG1lbnRSZXF1ZXN0Q2FsbGJhY2spO1xuXG4gIC8vIFN1cHBvcnQgdGhlIC93ZWJzb2NrZXQgZW5kcG9pbnRcbiAgc2VsZi5fcmVkaXJlY3RXZWJzb2NrZXRFbmRwb2ludCgpO1xuXG4gIHNlbGYuc2VydmVyLm9uKCdjb25uZWN0aW9uJywgZnVuY3Rpb24gKHNvY2tldCkge1xuICAgIC8vIHNvY2tqcyBzb21ldGltZXMgcGFzc2VzIHVzIG51bGwgaW5zdGVhZCBvZiBhIHNvY2tldCBvYmplY3RcbiAgICAvLyBzbyB3ZSBuZWVkIHRvIGd1YXJkIGFnYWluc3QgdGhhdC4gc2VlOlxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9zb2NranMvc29ja2pzLW5vZGUvaXNzdWVzLzEyMVxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9tZXRlb3IvbWV0ZW9yL2lzc3Vlcy8xMDQ2OFxuICAgIGlmICghc29ja2V0KSByZXR1cm47XG5cbiAgICAvLyBXZSB3YW50IHRvIG1ha2Ugc3VyZSB0aGF0IGlmIGEgY2xpZW50IGNvbm5lY3RzIHRvIHVzIGFuZCBkb2VzIHRoZSBpbml0aWFsXG4gICAgLy8gV2Vic29ja2V0IGhhbmRzaGFrZSBidXQgbmV2ZXIgZ2V0cyB0byB0aGUgRERQIGhhbmRzaGFrZSwgdGhhdCB3ZVxuICAgIC8vIGV2ZW50dWFsbHkga2lsbCB0aGUgc29ja2V0LiAgT25jZSB0aGUgRERQIGhhbmRzaGFrZSBoYXBwZW5zLCBERFBcbiAgICAvLyBoZWFydGJlYXRpbmcgd2lsbCB3b3JrLiBBbmQgYmVmb3JlIHRoZSBXZWJzb2NrZXQgaGFuZHNoYWtlLCB0aGUgdGltZW91dHNcbiAgICAvLyB3ZSBzZXQgYXQgdGhlIHNlcnZlciBsZXZlbCBpbiB3ZWJhcHBfc2VydmVyLmpzIHdpbGwgd29yay4gQnV0XG4gICAgLy8gZmF5ZS13ZWJzb2NrZXQgY2FsbHMgc2V0VGltZW91dCgwKSBvbiBhbnkgc29ja2V0IGl0IHRha2VzIG92ZXIsIHNvIHRoZXJlXG4gICAgLy8gaXMgYW4gXCJpbiBiZXR3ZWVuXCIgc3RhdGUgd2hlcmUgdGhpcyBkb2Vzbid0IGhhcHBlbi4gIFdlIHdvcmsgYXJvdW5kIHRoaXNcbiAgICAvLyBieSBleHBsaWNpdGx5IHNldHRpbmcgdGhlIHNvY2tldCB0aW1lb3V0IHRvIGEgcmVsYXRpdmVseSBsYXJnZSB0aW1lIGhlcmUsXG4gICAgLy8gYW5kIHNldHRpbmcgaXQgYmFjayB0byB6ZXJvIHdoZW4gd2Ugc2V0IHVwIHRoZSBoZWFydGJlYXQgaW5cbiAgICAvLyBsaXZlZGF0YV9zZXJ2ZXIuanMuXG4gICAgc29ja2V0LnNldFdlYnNvY2tldFRpbWVvdXQgPSBmdW5jdGlvbiAodGltZW91dCkge1xuICAgICAgaWYgKChzb2NrZXQucHJvdG9jb2wgPT09ICd3ZWJzb2NrZXQnIHx8XG4gICAgICAgICAgIHNvY2tldC5wcm90b2NvbCA9PT0gJ3dlYnNvY2tldC1yYXcnKVxuICAgICAgICAgICYmIHNvY2tldC5fc2Vzc2lvbi5yZWN2KSB7XG4gICAgICAgIHNvY2tldC5fc2Vzc2lvbi5yZWN2LmNvbm5lY3Rpb24uc2V0VGltZW91dCh0aW1lb3V0KTtcbiAgICAgIH1cbiAgICB9O1xuICAgIHNvY2tldC5zZXRXZWJzb2NrZXRUaW1lb3V0KDQ1ICogMTAwMCk7XG5cbiAgICBzb2NrZXQuc2VuZCA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICBzb2NrZXQud3JpdGUoZGF0YSk7XG4gICAgfTtcbiAgICBzb2NrZXQub24oJ2Nsb3NlJywgZnVuY3Rpb24gKCkge1xuICAgICAgc2VsZi5vcGVuX3NvY2tldHMgPSBfLndpdGhvdXQoc2VsZi5vcGVuX3NvY2tldHMsIHNvY2tldCk7XG4gICAgfSk7XG4gICAgc2VsZi5vcGVuX3NvY2tldHMucHVzaChzb2NrZXQpO1xuXG4gICAgLy8gb25seSB0byBzZW5kIGEgbWVzc2FnZSBhZnRlciBjb25uZWN0aW9uIG9uIHRlc3RzLCB1c2VmdWwgZm9yXG4gICAgLy8gc29ja2V0LXN0cmVhbS1jbGllbnQvc2VydmVyLXRlc3RzLmpzXG4gICAgaWYgKHByb2Nlc3MuZW52LlRFU1RfTUVUQURBVEEgJiYgcHJvY2Vzcy5lbnYuVEVTVF9NRVRBREFUQSAhPT0gXCJ7fVwiKSB7XG4gICAgICBzb2NrZXQuc2VuZChKU09OLnN0cmluZ2lmeSh7IHRlc3RNZXNzYWdlT25Db25uZWN0OiB0cnVlIH0pKTtcbiAgICB9XG5cbiAgICAvLyBjYWxsIGFsbCBvdXIgY2FsbGJhY2tzIHdoZW4gd2UgZ2V0IGEgbmV3IHNvY2tldC4gdGhleSB3aWxsIGRvIHRoZVxuICAgIC8vIHdvcmsgb2Ygc2V0dGluZyB1cCBoYW5kbGVycyBhbmQgc3VjaCBmb3Igc3BlY2lmaWMgbWVzc2FnZXMuXG4gICAgXy5lYWNoKHNlbGYucmVnaXN0cmF0aW9uX2NhbGxiYWNrcywgZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICBjYWxsYmFjayhzb2NrZXQpO1xuICAgIH0pO1xuICB9KTtcblxufTtcblxuT2JqZWN0LmFzc2lnbihTdHJlYW1TZXJ2ZXIucHJvdG90eXBlLCB7XG4gIC8vIGNhbGwgbXkgY2FsbGJhY2sgd2hlbiBhIG5ldyBzb2NrZXQgY29ubmVjdHMuXG4gIC8vIGFsc28gY2FsbCBpdCBmb3IgYWxsIGN1cnJlbnQgY29ubmVjdGlvbnMuXG4gIHJlZ2lzdGVyOiBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgc2VsZi5yZWdpc3RyYXRpb25fY2FsbGJhY2tzLnB1c2goY2FsbGJhY2spO1xuICAgIF8uZWFjaChzZWxmLmFsbF9zb2NrZXRzKCksIGZ1bmN0aW9uIChzb2NrZXQpIHtcbiAgICAgIGNhbGxiYWNrKHNvY2tldCk7XG4gICAgfSk7XG4gIH0sXG5cbiAgLy8gZ2V0IGEgbGlzdCBvZiBhbGwgc29ja2V0c1xuICBhbGxfc29ja2V0czogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4gXy52YWx1ZXMoc2VsZi5vcGVuX3NvY2tldHMpO1xuICB9LFxuXG4gIC8vIFJlZGlyZWN0IC93ZWJzb2NrZXQgdG8gL3NvY2tqcy93ZWJzb2NrZXQgaW4gb3JkZXIgdG8gbm90IGV4cG9zZVxuICAvLyBzb2NranMgdG8gY2xpZW50cyB0aGF0IHdhbnQgdG8gdXNlIHJhdyB3ZWJzb2NrZXRzXG4gIF9yZWRpcmVjdFdlYnNvY2tldEVuZHBvaW50OiBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy8gVW5mb3J0dW5hdGVseSB3ZSBjYW4ndCB1c2UgYSBjb25uZWN0IG1pZGRsZXdhcmUgaGVyZSBzaW5jZVxuICAgIC8vIHNvY2tqcyBpbnN0YWxscyBpdHNlbGYgcHJpb3IgdG8gYWxsIGV4aXN0aW5nIGxpc3RlbmVyc1xuICAgIC8vIChtZWFuaW5nIHByaW9yIHRvIGFueSBjb25uZWN0IG1pZGRsZXdhcmVzKSBzbyB3ZSBuZWVkIHRvIHRha2VcbiAgICAvLyBhbiBhcHByb2FjaCBzaW1pbGFyIHRvIG92ZXJzaGFkb3dMaXN0ZW5lcnMgaW5cbiAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vc29ja2pzL3NvY2tqcy1ub2RlL2Jsb2IvY2Y4MjBjNTVhZjZhOTk1M2UxNjU1ODU1NWEzMWRlY2VhNTU0ZjcwZS9zcmMvdXRpbHMuY29mZmVlXG4gICAgWydyZXF1ZXN0JywgJ3VwZ3JhZGUnXS5mb3JFYWNoKChldmVudCkgPT4ge1xuICAgICAgdmFyIGh0dHBTZXJ2ZXIgPSBXZWJBcHAuaHR0cFNlcnZlcjtcbiAgICAgIHZhciBvbGRIdHRwU2VydmVyTGlzdGVuZXJzID0gaHR0cFNlcnZlci5saXN0ZW5lcnMoZXZlbnQpLnNsaWNlKDApO1xuICAgICAgaHR0cFNlcnZlci5yZW1vdmVBbGxMaXN0ZW5lcnMoZXZlbnQpO1xuXG4gICAgICAvLyByZXF1ZXN0IGFuZCB1cGdyYWRlIGhhdmUgZGlmZmVyZW50IGFyZ3VtZW50cyBwYXNzZWQgYnV0XG4gICAgICAvLyB3ZSBvbmx5IGNhcmUgYWJvdXQgdGhlIGZpcnN0IG9uZSB3aGljaCBpcyBhbHdheXMgcmVxdWVzdFxuICAgICAgdmFyIG5ld0xpc3RlbmVyID0gZnVuY3Rpb24ocmVxdWVzdCAvKiwgbW9yZUFyZ3VtZW50cyAqLykge1xuICAgICAgICAvLyBTdG9yZSBhcmd1bWVudHMgZm9yIHVzZSB3aXRoaW4gdGhlIGNsb3N1cmUgYmVsb3dcbiAgICAgICAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG5cbiAgICAgICAgLy8gVE9ETyByZXBsYWNlIHdpdGggdXJsIHBhY2thZ2VcbiAgICAgICAgdmFyIHVybCA9IE5wbS5yZXF1aXJlKCd1cmwnKTtcblxuICAgICAgICAvLyBSZXdyaXRlIC93ZWJzb2NrZXQgYW5kIC93ZWJzb2NrZXQvIHVybHMgdG8gL3NvY2tqcy93ZWJzb2NrZXQgd2hpbGVcbiAgICAgICAgLy8gcHJlc2VydmluZyBxdWVyeSBzdHJpbmcuXG4gICAgICAgIHZhciBwYXJzZWRVcmwgPSB1cmwucGFyc2UocmVxdWVzdC51cmwpO1xuICAgICAgICBpZiAocGFyc2VkVXJsLnBhdGhuYW1lID09PSBwYXRoUHJlZml4ICsgJy93ZWJzb2NrZXQnIHx8XG4gICAgICAgICAgICBwYXJzZWRVcmwucGF0aG5hbWUgPT09IHBhdGhQcmVmaXggKyAnL3dlYnNvY2tldC8nKSB7XG4gICAgICAgICAgcGFyc2VkVXJsLnBhdGhuYW1lID0gc2VsZi5wcmVmaXggKyAnL3dlYnNvY2tldCc7XG4gICAgICAgICAgcmVxdWVzdC51cmwgPSB1cmwuZm9ybWF0KHBhcnNlZFVybCk7XG4gICAgICAgIH1cbiAgICAgICAgXy5lYWNoKG9sZEh0dHBTZXJ2ZXJMaXN0ZW5lcnMsIGZ1bmN0aW9uKG9sZExpc3RlbmVyKSB7XG4gICAgICAgICAgb2xkTGlzdGVuZXIuYXBwbHkoaHR0cFNlcnZlciwgYXJncyk7XG4gICAgICAgIH0pO1xuICAgICAgfTtcbiAgICAgIGh0dHBTZXJ2ZXIuYWRkTGlzdGVuZXIoZXZlbnQsIG5ld0xpc3RlbmVyKTtcbiAgICB9KTtcbiAgfVxufSk7XG4iLCJERFBTZXJ2ZXIgPSB7fTtcblxudmFyIEZpYmVyID0gTnBtLnJlcXVpcmUoJ2ZpYmVycycpO1xuXG4vLyBQdWJsaWNhdGlvbiBzdHJhdGVnaWVzIGRlZmluZSBob3cgd2UgaGFuZGxlIGRhdGEgZnJvbSBwdWJsaXNoZWQgY3Vyc29ycyBhdCB0aGUgY29sbGVjdGlvbiBsZXZlbFxuLy8gVGhpcyBhbGxvd3Mgc29tZW9uZSB0bzpcbi8vIC0gQ2hvb3NlIGEgdHJhZGUtb2ZmIGJldHdlZW4gY2xpZW50LXNlcnZlciBiYW5kd2lkdGggYW5kIHNlcnZlciBtZW1vcnkgdXNhZ2Vcbi8vIC0gSW1wbGVtZW50IHNwZWNpYWwgKG5vbi1tb25nbykgY29sbGVjdGlvbnMgbGlrZSB2b2xhdGlsZSBtZXNzYWdlIHF1ZXVlc1xuY29uc3QgcHVibGljYXRpb25TdHJhdGVnaWVzID0ge1xuICAvLyBTRVJWRVJfTUVSR0UgaXMgdGhlIGRlZmF1bHQgc3RyYXRlZ3kuXG4gIC8vIFdoZW4gdXNpbmcgdGhpcyBzdHJhdGVneSwgdGhlIHNlcnZlciBtYWludGFpbnMgYSBjb3B5IG9mIGFsbCBkYXRhIGEgY29ubmVjdGlvbiBpcyBzdWJzY3JpYmVkIHRvLlxuICAvLyBUaGlzIGFsbG93cyB1cyB0byBvbmx5IHNlbmQgZGVsdGFzIG92ZXIgbXVsdGlwbGUgcHVibGljYXRpb25zLlxuICBTRVJWRVJfTUVSR0U6IHtcbiAgICB1c2VEdW1teURvY3VtZW50VmlldzogZmFsc2UsXG4gICAgdXNlQ29sbGVjdGlvblZpZXc6IHRydWUsXG4gICAgZG9BY2NvdW50aW5nRm9yQ29sbGVjdGlvbjogdHJ1ZSxcbiAgfSxcbiAgLy8gVGhlIE5PX01FUkdFX05PX0hJU1RPUlkgc3RyYXRlZ3kgcmVzdWx0cyBpbiB0aGUgc2VydmVyIHNlbmRpbmcgYWxsIHB1YmxpY2F0aW9uIGRhdGFcbiAgLy8gZGlyZWN0bHkgdG8gdGhlIGNsaWVudC4gSXQgZG9lcyBub3QgcmVtZW1iZXIgd2hhdCBpdCBoYXMgcHJldmlvdXNseSBzZW50XG4gIC8vIHRvIGl0IHdpbGwgbm90IHRyaWdnZXIgcmVtb3ZlZCBtZXNzYWdlcyB3aGVuIGEgc3Vic2NyaXB0aW9uIGlzIHN0b3BwZWQuXG4gIC8vIFRoaXMgc2hvdWxkIG9ubHkgYmUgY2hvc2VuIGZvciBzcGVjaWFsIHVzZSBjYXNlcyBsaWtlIHNlbmQtYW5kLWZvcmdldCBxdWV1ZXMuXG4gIE5PX01FUkdFX05PX0hJU1RPUlk6IHtcbiAgICB1c2VEdW1teURvY3VtZW50VmlldzogZmFsc2UsXG4gICAgdXNlQ29sbGVjdGlvblZpZXc6IGZhbHNlLFxuICAgIGRvQWNjb3VudGluZ0ZvckNvbGxlY3Rpb246IGZhbHNlLFxuICB9LFxuICAvLyBOT19NRVJHRSBpcyBzaW1pbGFyIHRvIE5PX01FUkdFX05PX0hJU1RPUlkgYnV0IHRoZSBzZXJ2ZXIgd2lsbCByZW1lbWJlciB0aGUgSURzIGl0IGhhc1xuICAvLyBzZW50IHRvIHRoZSBjbGllbnQgc28gaXQgY2FuIHJlbW92ZSB0aGVtIHdoZW4gYSBzdWJzY3JpcHRpb24gaXMgc3RvcHBlZC5cbiAgLy8gVGhpcyBzdHJhdGVneSBjYW4gYmUgdXNlZCB3aGVuIGEgY29sbGVjdGlvbiBpcyBvbmx5IHVzZWQgaW4gYSBzaW5nbGUgcHVibGljYXRpb24uXG4gIE5PX01FUkdFOiB7XG4gICAgdXNlRHVtbXlEb2N1bWVudFZpZXc6IGZhbHNlLFxuICAgIHVzZUNvbGxlY3Rpb25WaWV3OiBmYWxzZSxcbiAgICBkb0FjY291bnRpbmdGb3JDb2xsZWN0aW9uOiB0cnVlLFxuICB9LFxuICAvLyBOT19NRVJHRV9NVUxUSSBpcyBzaW1pbGFyIHRvIGBOT19NRVJHRWAsIGJ1dCBpdCBkb2VzIHRyYWNrIHdoZXRoZXIgYSBkb2N1bWVudCBpc1xuICAvLyB1c2VkIGJ5IG11bHRpcGxlIHB1YmxpY2F0aW9ucy4gVGhpcyBoYXMgc29tZSBtZW1vcnkgb3ZlcmhlYWQsIGJ1dCBpdCBzdGlsbCBkb2VzIG5vdCBkb1xuICAvLyBkaWZmaW5nIHNvIGl0J3MgZmFzdGVyIGFuZCBzbGltbWVyIHRoYW4gU0VSVkVSX01FUkdFLlxuICBOT19NRVJHRV9NVUxUSToge1xuICAgIHVzZUR1bW15RG9jdW1lbnRWaWV3OiB0cnVlLFxuICAgIHVzZUNvbGxlY3Rpb25WaWV3OiB0cnVlLFxuICAgIGRvQWNjb3VudGluZ0ZvckNvbGxlY3Rpb246IHRydWVcbiAgfVxufTtcblxuRERQU2VydmVyLnB1YmxpY2F0aW9uU3RyYXRlZ2llcyA9IHB1YmxpY2F0aW9uU3RyYXRlZ2llcztcblxuLy8gVGhpcyBmaWxlIGNvbnRhaW5zIGNsYXNzZXM6XG4vLyAqIFNlc3Npb24gLSBUaGUgc2VydmVyJ3MgY29ubmVjdGlvbiB0byBhIHNpbmdsZSBERFAgY2xpZW50XG4vLyAqIFN1YnNjcmlwdGlvbiAtIEEgc2luZ2xlIHN1YnNjcmlwdGlvbiBmb3IgYSBzaW5nbGUgY2xpZW50XG4vLyAqIFNlcnZlciAtIEFuIGVudGlyZSBzZXJ2ZXIgdGhhdCBtYXkgdGFsayB0byA+IDEgY2xpZW50LiBBIEREUCBlbmRwb2ludC5cbi8vXG4vLyBTZXNzaW9uIGFuZCBTdWJzY3JpcHRpb24gYXJlIGZpbGUgc2NvcGUuIEZvciBub3csIHVudGlsIHdlIGZyZWV6ZVxuLy8gdGhlIGludGVyZmFjZSwgU2VydmVyIGlzIHBhY2thZ2Ugc2NvcGUgKGluIHRoZSBmdXR1cmUgaXQgc2hvdWxkIGJlXG4vLyBleHBvcnRlZCkuXG52YXIgRHVtbXlEb2N1bWVudFZpZXcgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgc2VsZi5leGlzdHNJbiA9IG5ldyBTZXQoKTsgLy8gc2V0IG9mIHN1YnNjcmlwdGlvbkhhbmRsZVxuICBzZWxmLmRhdGFCeUtleSA9IG5ldyBNYXAoKTsgLy8ga2V5LT4gWyB7c3Vic2NyaXB0aW9uSGFuZGxlLCB2YWx1ZX0gYnkgcHJlY2VkZW5jZV1cbn07XG5cbk9iamVjdC5hc3NpZ24oRHVtbXlEb2N1bWVudFZpZXcucHJvdG90eXBlLCB7XG4gIGdldEZpZWxkczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7fVxuICB9LFxuXG4gIGNsZWFyRmllbGQ6IGZ1bmN0aW9uIChzdWJzY3JpcHRpb25IYW5kbGUsIGtleSwgY2hhbmdlQ29sbGVjdG9yKSB7XG4gICAgY2hhbmdlQ29sbGVjdG9yW2tleV0gPSB1bmRlZmluZWRcbiAgfSxcblxuICBjaGFuZ2VGaWVsZDogZnVuY3Rpb24gKHN1YnNjcmlwdGlvbkhhbmRsZSwga2V5LCB2YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBjaGFuZ2VDb2xsZWN0b3IsIGlzQWRkKSB7XG4gICAgY2hhbmdlQ29sbGVjdG9yW2tleV0gPSB2YWx1ZVxuICB9XG59KTtcblxuLy8gUmVwcmVzZW50cyBhIHNpbmdsZSBkb2N1bWVudCBpbiBhIFNlc3Npb25Db2xsZWN0aW9uVmlld1xudmFyIFNlc3Npb25Eb2N1bWVudFZpZXcgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgc2VsZi5leGlzdHNJbiA9IG5ldyBTZXQoKTsgLy8gc2V0IG9mIHN1YnNjcmlwdGlvbkhhbmRsZVxuICBzZWxmLmRhdGFCeUtleSA9IG5ldyBNYXAoKTsgLy8ga2V5LT4gWyB7c3Vic2NyaXB0aW9uSGFuZGxlLCB2YWx1ZX0gYnkgcHJlY2VkZW5jZV1cbn07XG5cbkREUFNlcnZlci5fU2Vzc2lvbkRvY3VtZW50VmlldyA9IFNlc3Npb25Eb2N1bWVudFZpZXc7XG5cblxuXy5leHRlbmQoU2Vzc2lvbkRvY3VtZW50Vmlldy5wcm90b3R5cGUsIHtcblxuICBnZXRGaWVsZHM6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHJldCA9IHt9O1xuICAgIHNlbGYuZGF0YUJ5S2V5LmZvckVhY2goZnVuY3Rpb24gKHByZWNlZGVuY2VMaXN0LCBrZXkpIHtcbiAgICAgIHJldFtrZXldID0gcHJlY2VkZW5jZUxpc3RbMF0udmFsdWU7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJldDtcbiAgfSxcblxuICBjbGVhckZpZWxkOiBmdW5jdGlvbiAoc3Vic2NyaXB0aW9uSGFuZGxlLCBrZXksIGNoYW5nZUNvbGxlY3Rvcikge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAvLyBQdWJsaXNoIEFQSSBpZ25vcmVzIF9pZCBpZiBwcmVzZW50IGluIGZpZWxkc1xuICAgIGlmIChrZXkgPT09IFwiX2lkXCIpXG4gICAgICByZXR1cm47XG4gICAgdmFyIHByZWNlZGVuY2VMaXN0ID0gc2VsZi5kYXRhQnlLZXkuZ2V0KGtleSk7XG5cbiAgICAvLyBJdCdzIG9rYXkgdG8gY2xlYXIgZmllbGRzIHRoYXQgZGlkbid0IGV4aXN0LiBObyBuZWVkIHRvIHRocm93XG4gICAgLy8gYW4gZXJyb3IuXG4gICAgaWYgKCFwcmVjZWRlbmNlTGlzdClcbiAgICAgIHJldHVybjtcblxuICAgIHZhciByZW1vdmVkVmFsdWUgPSB1bmRlZmluZWQ7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwcmVjZWRlbmNlTGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHByZWNlZGVuY2UgPSBwcmVjZWRlbmNlTGlzdFtpXTtcbiAgICAgIGlmIChwcmVjZWRlbmNlLnN1YnNjcmlwdGlvbkhhbmRsZSA9PT0gc3Vic2NyaXB0aW9uSGFuZGxlKSB7XG4gICAgICAgIC8vIFRoZSB2aWV3J3MgdmFsdWUgY2FuIG9ubHkgY2hhbmdlIGlmIHRoaXMgc3Vic2NyaXB0aW9uIGlzIHRoZSBvbmUgdGhhdFxuICAgICAgICAvLyB1c2VkIHRvIGhhdmUgcHJlY2VkZW5jZS5cbiAgICAgICAgaWYgKGkgPT09IDApXG4gICAgICAgICAgcmVtb3ZlZFZhbHVlID0gcHJlY2VkZW5jZS52YWx1ZTtcbiAgICAgICAgcHJlY2VkZW5jZUxpc3Quc3BsaWNlKGksIDEpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHByZWNlZGVuY2VMaXN0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgc2VsZi5kYXRhQnlLZXkuZGVsZXRlKGtleSk7XG4gICAgICBjaGFuZ2VDb2xsZWN0b3Jba2V5XSA9IHVuZGVmaW5lZDtcbiAgICB9IGVsc2UgaWYgKHJlbW92ZWRWYWx1ZSAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgICAgICAgICAhRUpTT04uZXF1YWxzKHJlbW92ZWRWYWx1ZSwgcHJlY2VkZW5jZUxpc3RbMF0udmFsdWUpKSB7XG4gICAgICBjaGFuZ2VDb2xsZWN0b3Jba2V5XSA9IHByZWNlZGVuY2VMaXN0WzBdLnZhbHVlO1xuICAgIH1cbiAgfSxcblxuICBjaGFuZ2VGaWVsZDogZnVuY3Rpb24gKHN1YnNjcmlwdGlvbkhhbmRsZSwga2V5LCB2YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBjaGFuZ2VDb2xsZWN0b3IsIGlzQWRkKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIC8vIFB1Ymxpc2ggQVBJIGlnbm9yZXMgX2lkIGlmIHByZXNlbnQgaW4gZmllbGRzXG4gICAgaWYgKGtleSA9PT0gXCJfaWRcIilcbiAgICAgIHJldHVybjtcblxuICAgIC8vIERvbid0IHNoYXJlIHN0YXRlIHdpdGggdGhlIGRhdGEgcGFzc2VkIGluIGJ5IHRoZSB1c2VyLlxuICAgIHZhbHVlID0gRUpTT04uY2xvbmUodmFsdWUpO1xuXG4gICAgaWYgKCFzZWxmLmRhdGFCeUtleS5oYXMoa2V5KSkge1xuICAgICAgc2VsZi5kYXRhQnlLZXkuc2V0KGtleSwgW3tzdWJzY3JpcHRpb25IYW5kbGU6IHN1YnNjcmlwdGlvbkhhbmRsZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHZhbHVlfV0pO1xuICAgICAgY2hhbmdlQ29sbGVjdG9yW2tleV0gPSB2YWx1ZTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHByZWNlZGVuY2VMaXN0ID0gc2VsZi5kYXRhQnlLZXkuZ2V0KGtleSk7XG4gICAgdmFyIGVsdDtcbiAgICBpZiAoIWlzQWRkKSB7XG4gICAgICBlbHQgPSBwcmVjZWRlbmNlTGlzdC5maW5kKGZ1bmN0aW9uIChwcmVjZWRlbmNlKSB7XG4gICAgICAgICAgcmV0dXJuIHByZWNlZGVuY2Uuc3Vic2NyaXB0aW9uSGFuZGxlID09PSBzdWJzY3JpcHRpb25IYW5kbGU7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAoZWx0KSB7XG4gICAgICBpZiAoZWx0ID09PSBwcmVjZWRlbmNlTGlzdFswXSAmJiAhRUpTT04uZXF1YWxzKHZhbHVlLCBlbHQudmFsdWUpKSB7XG4gICAgICAgIC8vIHRoaXMgc3Vic2NyaXB0aW9uIGlzIGNoYW5naW5nIHRoZSB2YWx1ZSBvZiB0aGlzIGZpZWxkLlxuICAgICAgICBjaGFuZ2VDb2xsZWN0b3Jba2V5XSA9IHZhbHVlO1xuICAgICAgfVxuICAgICAgZWx0LnZhbHVlID0gdmFsdWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIHRoaXMgc3Vic2NyaXB0aW9uIGlzIG5ld2x5IGNhcmluZyBhYm91dCB0aGlzIGZpZWxkXG4gICAgICBwcmVjZWRlbmNlTGlzdC5wdXNoKHtzdWJzY3JpcHRpb25IYW5kbGU6IHN1YnNjcmlwdGlvbkhhbmRsZSwgdmFsdWU6IHZhbHVlfSk7XG4gICAgfVxuXG4gIH1cbn0pO1xuXG4vKipcbiAqIFJlcHJlc2VudHMgYSBjbGllbnQncyB2aWV3IG9mIGEgc2luZ2xlIGNvbGxlY3Rpb25cbiAqIEBwYXJhbSB7U3RyaW5nfSBjb2xsZWN0aW9uTmFtZSBOYW1lIG9mIHRoZSBjb2xsZWN0aW9uIGl0IHJlcHJlc2VudHNcbiAqIEBwYXJhbSB7T2JqZWN0LjxTdHJpbmcsIEZ1bmN0aW9uPn0gc2Vzc2lvbkNhbGxiYWNrcyBUaGUgY2FsbGJhY2tzIGZvciBhZGRlZCwgY2hhbmdlZCwgcmVtb3ZlZFxuICogQGNsYXNzIFNlc3Npb25Db2xsZWN0aW9uVmlld1xuICovXG52YXIgU2Vzc2lvbkNvbGxlY3Rpb25WaWV3ID0gZnVuY3Rpb24gKGNvbGxlY3Rpb25OYW1lLCBzZXNzaW9uQ2FsbGJhY2tzKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgc2VsZi5jb2xsZWN0aW9uTmFtZSA9IGNvbGxlY3Rpb25OYW1lO1xuICBzZWxmLmRvY3VtZW50cyA9IG5ldyBNYXAoKTtcbiAgc2VsZi5jYWxsYmFja3MgPSBzZXNzaW9uQ2FsbGJhY2tzO1xufTtcblxuRERQU2VydmVyLl9TZXNzaW9uQ29sbGVjdGlvblZpZXcgPSBTZXNzaW9uQ29sbGVjdGlvblZpZXc7XG5cblxuT2JqZWN0LmFzc2lnbihTZXNzaW9uQ29sbGVjdGlvblZpZXcucHJvdG90eXBlLCB7XG5cbiAgaXNFbXB0eTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4gc2VsZi5kb2N1bWVudHMuc2l6ZSA9PT0gMDtcbiAgfSxcblxuICBkaWZmOiBmdW5jdGlvbiAocHJldmlvdXMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgRGlmZlNlcXVlbmNlLmRpZmZNYXBzKHByZXZpb3VzLmRvY3VtZW50cywgc2VsZi5kb2N1bWVudHMsIHtcbiAgICAgIGJvdGg6IF8uYmluZChzZWxmLmRpZmZEb2N1bWVudCwgc2VsZiksXG5cbiAgICAgIHJpZ2h0T25seTogZnVuY3Rpb24gKGlkLCBub3dEVikge1xuICAgICAgICBzZWxmLmNhbGxiYWNrcy5hZGRlZChzZWxmLmNvbGxlY3Rpb25OYW1lLCBpZCwgbm93RFYuZ2V0RmllbGRzKCkpO1xuICAgICAgfSxcblxuICAgICAgbGVmdE9ubHk6IGZ1bmN0aW9uIChpZCwgcHJldkRWKSB7XG4gICAgICAgIHNlbGYuY2FsbGJhY2tzLnJlbW92ZWQoc2VsZi5jb2xsZWN0aW9uTmFtZSwgaWQpO1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuXG4gIGRpZmZEb2N1bWVudDogZnVuY3Rpb24gKGlkLCBwcmV2RFYsIG5vd0RWKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBmaWVsZHMgPSB7fTtcbiAgICBEaWZmU2VxdWVuY2UuZGlmZk9iamVjdHMocHJldkRWLmdldEZpZWxkcygpLCBub3dEVi5nZXRGaWVsZHMoKSwge1xuICAgICAgYm90aDogZnVuY3Rpb24gKGtleSwgcHJldiwgbm93KSB7XG4gICAgICAgIGlmICghRUpTT04uZXF1YWxzKHByZXYsIG5vdykpXG4gICAgICAgICAgZmllbGRzW2tleV0gPSBub3c7XG4gICAgICB9LFxuICAgICAgcmlnaHRPbmx5OiBmdW5jdGlvbiAoa2V5LCBub3cpIHtcbiAgICAgICAgZmllbGRzW2tleV0gPSBub3c7XG4gICAgICB9LFxuICAgICAgbGVmdE9ubHk6IGZ1bmN0aW9uKGtleSwgcHJldikge1xuICAgICAgICBmaWVsZHNba2V5XSA9IHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBzZWxmLmNhbGxiYWNrcy5jaGFuZ2VkKHNlbGYuY29sbGVjdGlvbk5hbWUsIGlkLCBmaWVsZHMpO1xuICB9LFxuXG4gIGFkZGVkOiBmdW5jdGlvbiAoc3Vic2NyaXB0aW9uSGFuZGxlLCBpZCwgZmllbGRzKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBkb2NWaWV3ID0gc2VsZi5kb2N1bWVudHMuZ2V0KGlkKTtcbiAgICB2YXIgYWRkZWQgPSBmYWxzZTtcbiAgICBpZiAoIWRvY1ZpZXcpIHtcbiAgICAgIGFkZGVkID0gdHJ1ZTtcbiAgICAgIGlmIChNZXRlb3Iuc2VydmVyLmdldFB1YmxpY2F0aW9uU3RyYXRlZ3kodGhpcy5jb2xsZWN0aW9uTmFtZSkudXNlRHVtbXlEb2N1bWVudFZpZXcpIHtcbiAgICAgICAgZG9jVmlldyA9IG5ldyBEdW1teURvY3VtZW50VmlldygpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZG9jVmlldyA9IG5ldyBTZXNzaW9uRG9jdW1lbnRWaWV3KCk7XG4gICAgICB9XG5cbiAgICAgIHNlbGYuZG9jdW1lbnRzLnNldChpZCwgZG9jVmlldyk7XG4gICAgfVxuICAgIGRvY1ZpZXcuZXhpc3RzSW4uYWRkKHN1YnNjcmlwdGlvbkhhbmRsZSk7XG4gICAgdmFyIGNoYW5nZUNvbGxlY3RvciA9IHt9O1xuICAgIF8uZWFjaChmaWVsZHMsIGZ1bmN0aW9uICh2YWx1ZSwga2V5KSB7XG4gICAgICBkb2NWaWV3LmNoYW5nZUZpZWxkKFxuICAgICAgICBzdWJzY3JpcHRpb25IYW5kbGUsIGtleSwgdmFsdWUsIGNoYW5nZUNvbGxlY3RvciwgdHJ1ZSk7XG4gICAgfSk7XG4gICAgaWYgKGFkZGVkKVxuICAgICAgc2VsZi5jYWxsYmFja3MuYWRkZWQoc2VsZi5jb2xsZWN0aW9uTmFtZSwgaWQsIGNoYW5nZUNvbGxlY3Rvcik7XG4gICAgZWxzZVxuICAgICAgc2VsZi5jYWxsYmFja3MuY2hhbmdlZChzZWxmLmNvbGxlY3Rpb25OYW1lLCBpZCwgY2hhbmdlQ29sbGVjdG9yKTtcbiAgfSxcblxuICBjaGFuZ2VkOiBmdW5jdGlvbiAoc3Vic2NyaXB0aW9uSGFuZGxlLCBpZCwgY2hhbmdlZCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgY2hhbmdlZFJlc3VsdCA9IHt9O1xuICAgIHZhciBkb2NWaWV3ID0gc2VsZi5kb2N1bWVudHMuZ2V0KGlkKTtcbiAgICBpZiAoIWRvY1ZpZXcpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZCBub3QgZmluZCBlbGVtZW50IHdpdGggaWQgXCIgKyBpZCArIFwiIHRvIGNoYW5nZVwiKTtcbiAgICBfLmVhY2goY2hhbmdlZCwgZnVuY3Rpb24gKHZhbHVlLCBrZXkpIHtcbiAgICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKVxuICAgICAgICBkb2NWaWV3LmNsZWFyRmllbGQoc3Vic2NyaXB0aW9uSGFuZGxlLCBrZXksIGNoYW5nZWRSZXN1bHQpO1xuICAgICAgZWxzZVxuICAgICAgICBkb2NWaWV3LmNoYW5nZUZpZWxkKHN1YnNjcmlwdGlvbkhhbmRsZSwga2V5LCB2YWx1ZSwgY2hhbmdlZFJlc3VsdCk7XG4gICAgfSk7XG4gICAgc2VsZi5jYWxsYmFja3MuY2hhbmdlZChzZWxmLmNvbGxlY3Rpb25OYW1lLCBpZCwgY2hhbmdlZFJlc3VsdCk7XG4gIH0sXG5cbiAgcmVtb3ZlZDogZnVuY3Rpb24gKHN1YnNjcmlwdGlvbkhhbmRsZSwgaWQpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGRvY1ZpZXcgPSBzZWxmLmRvY3VtZW50cy5nZXQoaWQpO1xuICAgIGlmICghZG9jVmlldykge1xuICAgICAgdmFyIGVyciA9IG5ldyBFcnJvcihcIlJlbW92ZWQgbm9uZXhpc3RlbnQgZG9jdW1lbnQgXCIgKyBpZCk7XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfVxuICAgIGRvY1ZpZXcuZXhpc3RzSW4uZGVsZXRlKHN1YnNjcmlwdGlvbkhhbmRsZSk7XG4gICAgaWYgKGRvY1ZpZXcuZXhpc3RzSW4uc2l6ZSA9PT0gMCkge1xuICAgICAgLy8gaXQgaXMgZ29uZSBmcm9tIGV2ZXJ5b25lXG4gICAgICBzZWxmLmNhbGxiYWNrcy5yZW1vdmVkKHNlbGYuY29sbGVjdGlvbk5hbWUsIGlkKTtcbiAgICAgIHNlbGYuZG9jdW1lbnRzLmRlbGV0ZShpZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBjaGFuZ2VkID0ge307XG4gICAgICAvLyByZW1vdmUgdGhpcyBzdWJzY3JpcHRpb24gZnJvbSBldmVyeSBwcmVjZWRlbmNlIGxpc3RcbiAgICAgIC8vIGFuZCByZWNvcmQgdGhlIGNoYW5nZXNcbiAgICAgIGRvY1ZpZXcuZGF0YUJ5S2V5LmZvckVhY2goZnVuY3Rpb24gKHByZWNlZGVuY2VMaXN0LCBrZXkpIHtcbiAgICAgICAgZG9jVmlldy5jbGVhckZpZWxkKHN1YnNjcmlwdGlvbkhhbmRsZSwga2V5LCBjaGFuZ2VkKTtcbiAgICAgIH0pO1xuXG4gICAgICBzZWxmLmNhbGxiYWNrcy5jaGFuZ2VkKHNlbGYuY29sbGVjdGlvbk5hbWUsIGlkLCBjaGFuZ2VkKTtcbiAgICB9XG4gIH1cbn0pO1xuXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuLyogU2Vzc2lvbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKi9cbi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbnZhciBTZXNzaW9uID0gZnVuY3Rpb24gKHNlcnZlciwgdmVyc2lvbiwgc29ja2V0LCBvcHRpb25zKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgc2VsZi5pZCA9IFJhbmRvbS5pZCgpO1xuXG4gIHNlbGYuc2VydmVyID0gc2VydmVyO1xuICBzZWxmLnZlcnNpb24gPSB2ZXJzaW9uO1xuXG4gIHNlbGYuaW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgc2VsZi5zb2NrZXQgPSBzb2NrZXQ7XG5cbiAgLy8gU2V0IHRvIG51bGwgd2hlbiB0aGUgc2Vzc2lvbiBpcyBkZXN0cm95ZWQuIE11bHRpcGxlIHBsYWNlcyBiZWxvd1xuICAvLyB1c2UgdGhpcyB0byBkZXRlcm1pbmUgaWYgdGhlIHNlc3Npb24gaXMgYWxpdmUgb3Igbm90LlxuICBzZWxmLmluUXVldWUgPSBuZXcgTWV0ZW9yLl9Eb3VibGVFbmRlZFF1ZXVlKCk7XG5cbiAgc2VsZi5ibG9ja2VkID0gZmFsc2U7XG4gIHNlbGYud29ya2VyUnVubmluZyA9IGZhbHNlO1xuXG4gIHNlbGYuY2FjaGVkVW5ibG9jayA9IG51bGw7XG5cbiAgLy8gU3ViIG9iamVjdHMgZm9yIGFjdGl2ZSBzdWJzY3JpcHRpb25zXG4gIHNlbGYuX25hbWVkU3VicyA9IG5ldyBNYXAoKTtcbiAgc2VsZi5fdW5pdmVyc2FsU3VicyA9IFtdO1xuXG4gIHNlbGYudXNlcklkID0gbnVsbDtcblxuICBzZWxmLmNvbGxlY3Rpb25WaWV3cyA9IG5ldyBNYXAoKTtcblxuICAvLyBTZXQgdGhpcyB0byBmYWxzZSB0byBub3Qgc2VuZCBtZXNzYWdlcyB3aGVuIGNvbGxlY3Rpb25WaWV3cyBhcmVcbiAgLy8gbW9kaWZpZWQuIFRoaXMgaXMgZG9uZSB3aGVuIHJlcnVubmluZyBzdWJzIGluIF9zZXRVc2VySWQgYW5kIHRob3NlIG1lc3NhZ2VzXG4gIC8vIGFyZSBjYWxjdWxhdGVkIHZpYSBhIGRpZmYgaW5zdGVhZC5cbiAgc2VsZi5faXNTZW5kaW5nID0gdHJ1ZTtcblxuICAvLyBJZiB0aGlzIGlzIHRydWUsIGRvbid0IHN0YXJ0IGEgbmV3bHktY3JlYXRlZCB1bml2ZXJzYWwgcHVibGlzaGVyIG9uIHRoaXNcbiAgLy8gc2Vzc2lvbi4gVGhlIHNlc3Npb24gd2lsbCB0YWtlIGNhcmUgb2Ygc3RhcnRpbmcgaXQgd2hlbiBhcHByb3ByaWF0ZS5cbiAgc2VsZi5fZG9udFN0YXJ0TmV3VW5pdmVyc2FsU3VicyA9IGZhbHNlO1xuXG4gIC8vIFdoZW4gd2UgYXJlIHJlcnVubmluZyBzdWJzY3JpcHRpb25zLCBhbnkgcmVhZHkgbWVzc2FnZXNcbiAgLy8gd2Ugd2FudCB0byBidWZmZXIgdXAgZm9yIHdoZW4gd2UgYXJlIGRvbmUgcmVydW5uaW5nIHN1YnNjcmlwdGlvbnNcbiAgc2VsZi5fcGVuZGluZ1JlYWR5ID0gW107XG5cbiAgLy8gTGlzdCBvZiBjYWxsYmFja3MgdG8gY2FsbCB3aGVuIHRoaXMgY29ubmVjdGlvbiBpcyBjbG9zZWQuXG4gIHNlbGYuX2Nsb3NlQ2FsbGJhY2tzID0gW107XG5cblxuICAvLyBYWFggSEFDSzogSWYgYSBzb2NranMgY29ubmVjdGlvbiwgc2F2ZSBvZmYgdGhlIFVSTC4gVGhpcyBpc1xuICAvLyB0ZW1wb3JhcnkgYW5kIHdpbGwgZ28gYXdheSBpbiB0aGUgbmVhciBmdXR1cmUuXG4gIHNlbGYuX3NvY2tldFVybCA9IHNvY2tldC51cmw7XG5cbiAgLy8gQWxsb3cgdGVzdHMgdG8gZGlzYWJsZSByZXNwb25kaW5nIHRvIHBpbmdzLlxuICBzZWxmLl9yZXNwb25kVG9QaW5ncyA9IG9wdGlvbnMucmVzcG9uZFRvUGluZ3M7XG5cbiAgLy8gVGhpcyBvYmplY3QgaXMgdGhlIHB1YmxpYyBpbnRlcmZhY2UgdG8gdGhlIHNlc3Npb24uIEluIHRoZSBwdWJsaWNcbiAgLy8gQVBJLCBpdCBpcyBjYWxsZWQgdGhlIGBjb25uZWN0aW9uYCBvYmplY3QuICBJbnRlcm5hbGx5IHdlIGNhbGwgaXRcbiAgLy8gYSBgY29ubmVjdGlvbkhhbmRsZWAgdG8gYXZvaWQgYW1iaWd1aXR5LlxuICBzZWxmLmNvbm5lY3Rpb25IYW5kbGUgPSB7XG4gICAgaWQ6IHNlbGYuaWQsXG4gICAgY2xvc2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHNlbGYuY2xvc2UoKTtcbiAgICB9LFxuICAgIG9uQ2xvc2U6IGZ1bmN0aW9uIChmbikge1xuICAgICAgdmFyIGNiID0gTWV0ZW9yLmJpbmRFbnZpcm9ubWVudChmbiwgXCJjb25uZWN0aW9uIG9uQ2xvc2UgY2FsbGJhY2tcIik7XG4gICAgICBpZiAoc2VsZi5pblF1ZXVlKSB7XG4gICAgICAgIHNlbGYuX2Nsb3NlQ2FsbGJhY2tzLnB1c2goY2IpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gaWYgd2UncmUgYWxyZWFkeSBjbG9zZWQsIGNhbGwgdGhlIGNhbGxiYWNrLlxuICAgICAgICBNZXRlb3IuZGVmZXIoY2IpO1xuICAgICAgfVxuICAgIH0sXG4gICAgY2xpZW50QWRkcmVzczogc2VsZi5fY2xpZW50QWRkcmVzcygpLFxuICAgIGh0dHBIZWFkZXJzOiBzZWxmLnNvY2tldC5oZWFkZXJzXG4gIH07XG5cbiAgc2VsZi5zZW5kKHsgbXNnOiAnY29ubmVjdGVkJywgc2Vzc2lvbjogc2VsZi5pZCB9KTtcblxuICAvLyBPbiBpbml0aWFsIGNvbm5lY3QsIHNwaW4gdXAgYWxsIHRoZSB1bml2ZXJzYWwgcHVibGlzaGVycy5cbiAgRmliZXIoZnVuY3Rpb24gKCkge1xuICAgIHNlbGYuc3RhcnRVbml2ZXJzYWxTdWJzKCk7XG4gIH0pLnJ1bigpO1xuXG4gIGlmICh2ZXJzaW9uICE9PSAncHJlMScgJiYgb3B0aW9ucy5oZWFydGJlYXRJbnRlcnZhbCAhPT0gMCkge1xuICAgIC8vIFdlIG5vIGxvbmdlciBuZWVkIHRoZSBsb3cgbGV2ZWwgdGltZW91dCBiZWNhdXNlIHdlIGhhdmUgaGVhcnRiZWF0cy5cbiAgICBzb2NrZXQuc2V0V2Vic29ja2V0VGltZW91dCgwKTtcblxuICAgIHNlbGYuaGVhcnRiZWF0ID0gbmV3IEREUENvbW1vbi5IZWFydGJlYXQoe1xuICAgICAgaGVhcnRiZWF0SW50ZXJ2YWw6IG9wdGlvbnMuaGVhcnRiZWF0SW50ZXJ2YWwsXG4gICAgICBoZWFydGJlYXRUaW1lb3V0OiBvcHRpb25zLmhlYXJ0YmVhdFRpbWVvdXQsXG4gICAgICBvblRpbWVvdXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc2VsZi5jbG9zZSgpO1xuICAgICAgfSxcbiAgICAgIHNlbmRQaW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHNlbGYuc2VuZCh7bXNnOiAncGluZyd9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBzZWxmLmhlYXJ0YmVhdC5zdGFydCgpO1xuICB9XG5cbiAgUGFja2FnZVsnZmFjdHMtYmFzZSddICYmIFBhY2thZ2VbJ2ZhY3RzLWJhc2UnXS5GYWN0cy5pbmNyZW1lbnRTZXJ2ZXJGYWN0KFxuICAgIFwibGl2ZWRhdGFcIiwgXCJzZXNzaW9uc1wiLCAxKTtcbn07XG5cbk9iamVjdC5hc3NpZ24oU2Vzc2lvbi5wcm90b3R5cGUsIHtcblxuICBzZW5kUmVhZHk6IGZ1bmN0aW9uIChzdWJzY3JpcHRpb25JZHMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKHNlbGYuX2lzU2VuZGluZylcbiAgICAgIHNlbGYuc2VuZCh7bXNnOiBcInJlYWR5XCIsIHN1YnM6IHN1YnNjcmlwdGlvbklkc30pO1xuICAgIGVsc2Uge1xuICAgICAgXy5lYWNoKHN1YnNjcmlwdGlvbklkcywgZnVuY3Rpb24gKHN1YnNjcmlwdGlvbklkKSB7XG4gICAgICAgIHNlbGYuX3BlbmRpbmdSZWFkeS5wdXNoKHN1YnNjcmlwdGlvbklkKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSxcblxuICBfY2FuU2VuZChjb2xsZWN0aW9uTmFtZSkge1xuICAgIHJldHVybiB0aGlzLl9pc1NlbmRpbmcgfHwgIXRoaXMuc2VydmVyLmdldFB1YmxpY2F0aW9uU3RyYXRlZ3koY29sbGVjdGlvbk5hbWUpLnVzZUNvbGxlY3Rpb25WaWV3O1xuICB9LFxuXG5cbiAgc2VuZEFkZGVkKGNvbGxlY3Rpb25OYW1lLCBpZCwgZmllbGRzKSB7XG4gICAgaWYgKHRoaXMuX2NhblNlbmQoY29sbGVjdGlvbk5hbWUpKVxuICAgICAgdGhpcy5zZW5kKHttc2c6IFwiYWRkZWRcIiwgY29sbGVjdGlvbjogY29sbGVjdGlvbk5hbWUsIGlkLCBmaWVsZHN9KTtcbiAgfSxcblxuICBzZW5kQ2hhbmdlZChjb2xsZWN0aW9uTmFtZSwgaWQsIGZpZWxkcykge1xuICAgIGlmIChfLmlzRW1wdHkoZmllbGRzKSlcbiAgICAgIHJldHVybjtcblxuICAgIGlmICh0aGlzLl9jYW5TZW5kKGNvbGxlY3Rpb25OYW1lKSkge1xuICAgICAgdGhpcy5zZW5kKHtcbiAgICAgICAgbXNnOiBcImNoYW5nZWRcIixcbiAgICAgICAgY29sbGVjdGlvbjogY29sbGVjdGlvbk5hbWUsXG4gICAgICAgIGlkLFxuICAgICAgICBmaWVsZHNcbiAgICAgIH0pO1xuICAgIH1cbiAgfSxcblxuICBzZW5kUmVtb3ZlZChjb2xsZWN0aW9uTmFtZSwgaWQpIHtcbiAgICBpZiAodGhpcy5fY2FuU2VuZChjb2xsZWN0aW9uTmFtZSkpXG4gICAgICB0aGlzLnNlbmQoe21zZzogXCJyZW1vdmVkXCIsIGNvbGxlY3Rpb246IGNvbGxlY3Rpb25OYW1lLCBpZH0pO1xuICB9LFxuXG4gIGdldFNlbmRDYWxsYmFja3M6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIHtcbiAgICAgIGFkZGVkOiBfLmJpbmQoc2VsZi5zZW5kQWRkZWQsIHNlbGYpLFxuICAgICAgY2hhbmdlZDogXy5iaW5kKHNlbGYuc2VuZENoYW5nZWQsIHNlbGYpLFxuICAgICAgcmVtb3ZlZDogXy5iaW5kKHNlbGYuc2VuZFJlbW92ZWQsIHNlbGYpXG4gICAgfTtcbiAgfSxcblxuICBnZXRDb2xsZWN0aW9uVmlldzogZnVuY3Rpb24gKGNvbGxlY3Rpb25OYW1lKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciByZXQgPSBzZWxmLmNvbGxlY3Rpb25WaWV3cy5nZXQoY29sbGVjdGlvbk5hbWUpO1xuICAgIGlmICghcmV0KSB7XG4gICAgICByZXQgPSBuZXcgU2Vzc2lvbkNvbGxlY3Rpb25WaWV3KGNvbGxlY3Rpb25OYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuZ2V0U2VuZENhbGxiYWNrcygpKTtcbiAgICAgIHNlbGYuY29sbGVjdGlvblZpZXdzLnNldChjb2xsZWN0aW9uTmFtZSwgcmV0KTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfSxcblxuICBhZGRlZChzdWJzY3JpcHRpb25IYW5kbGUsIGNvbGxlY3Rpb25OYW1lLCBpZCwgZmllbGRzKSB7XG4gICAgaWYgKHRoaXMuc2VydmVyLmdldFB1YmxpY2F0aW9uU3RyYXRlZ3koY29sbGVjdGlvbk5hbWUpLnVzZUNvbGxlY3Rpb25WaWV3KSB7XG4gICAgICBjb25zdCB2aWV3ID0gdGhpcy5nZXRDb2xsZWN0aW9uVmlldyhjb2xsZWN0aW9uTmFtZSk7XG4gICAgICB2aWV3LmFkZGVkKHN1YnNjcmlwdGlvbkhhbmRsZSwgaWQsIGZpZWxkcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc2VuZEFkZGVkKGNvbGxlY3Rpb25OYW1lLCBpZCwgZmllbGRzKTtcbiAgICB9XG4gIH0sXG5cbiAgcmVtb3ZlZChzdWJzY3JpcHRpb25IYW5kbGUsIGNvbGxlY3Rpb25OYW1lLCBpZCkge1xuICAgIGlmICh0aGlzLnNlcnZlci5nZXRQdWJsaWNhdGlvblN0cmF0ZWd5KGNvbGxlY3Rpb25OYW1lKS51c2VDb2xsZWN0aW9uVmlldykge1xuICAgICAgY29uc3QgdmlldyA9IHRoaXMuZ2V0Q29sbGVjdGlvblZpZXcoY29sbGVjdGlvbk5hbWUpO1xuICAgICAgdmlldy5yZW1vdmVkKHN1YnNjcmlwdGlvbkhhbmRsZSwgaWQpO1xuICAgICAgaWYgKHZpZXcuaXNFbXB0eSgpKSB7XG4gICAgICAgICB0aGlzLmNvbGxlY3Rpb25WaWV3cy5kZWxldGUoY29sbGVjdGlvbk5hbWUpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnNlbmRSZW1vdmVkKGNvbGxlY3Rpb25OYW1lLCBpZCk7XG4gICAgfVxuICB9LFxuXG4gIGNoYW5nZWQoc3Vic2NyaXB0aW9uSGFuZGxlLCBjb2xsZWN0aW9uTmFtZSwgaWQsIGZpZWxkcykge1xuICAgIGlmICh0aGlzLnNlcnZlci5nZXRQdWJsaWNhdGlvblN0cmF0ZWd5KGNvbGxlY3Rpb25OYW1lKS51c2VDb2xsZWN0aW9uVmlldykge1xuICAgICAgY29uc3QgdmlldyA9IHRoaXMuZ2V0Q29sbGVjdGlvblZpZXcoY29sbGVjdGlvbk5hbWUpO1xuICAgICAgdmlldy5jaGFuZ2VkKHN1YnNjcmlwdGlvbkhhbmRsZSwgaWQsIGZpZWxkcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc2VuZENoYW5nZWQoY29sbGVjdGlvbk5hbWUsIGlkLCBmaWVsZHMpO1xuICAgIH1cbiAgfSxcblxuICBzdGFydFVuaXZlcnNhbFN1YnM6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy8gTWFrZSBhIHNoYWxsb3cgY29weSBvZiB0aGUgc2V0IG9mIHVuaXZlcnNhbCBoYW5kbGVycyBhbmQgc3RhcnQgdGhlbS4gSWZcbiAgICAvLyBhZGRpdGlvbmFsIHVuaXZlcnNhbCBwdWJsaXNoZXJzIHN0YXJ0IHdoaWxlIHdlJ3JlIHJ1bm5pbmcgdGhlbSAoZHVlIHRvXG4gICAgLy8geWllbGRpbmcpLCB0aGV5IHdpbGwgcnVuIHNlcGFyYXRlbHkgYXMgcGFydCBvZiBTZXJ2ZXIucHVibGlzaC5cbiAgICB2YXIgaGFuZGxlcnMgPSBfLmNsb25lKHNlbGYuc2VydmVyLnVuaXZlcnNhbF9wdWJsaXNoX2hhbmRsZXJzKTtcbiAgICBfLmVhY2goaGFuZGxlcnMsIGZ1bmN0aW9uIChoYW5kbGVyKSB7XG4gICAgICBzZWxmLl9zdGFydFN1YnNjcmlwdGlvbihoYW5kbGVyKTtcbiAgICB9KTtcbiAgfSxcblxuICAvLyBEZXN0cm95IHRoaXMgc2Vzc2lvbiBhbmQgdW5yZWdpc3RlciBpdCBhdCB0aGUgc2VydmVyLlxuICBjbG9zZTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIC8vIERlc3Ryb3kgdGhpcyBzZXNzaW9uLCBldmVuIGlmIGl0J3Mgbm90IHJlZ2lzdGVyZWQgYXQgdGhlXG4gICAgLy8gc2VydmVyLiBTdG9wIGFsbCBwcm9jZXNzaW5nIGFuZCB0ZWFyIGV2ZXJ5dGhpbmcgZG93bi4gSWYgYSBzb2NrZXRcbiAgICAvLyB3YXMgYXR0YWNoZWQsIGNsb3NlIGl0LlxuXG4gICAgLy8gQWxyZWFkeSBkZXN0cm95ZWQuXG4gICAgaWYgKCEgc2VsZi5pblF1ZXVlKVxuICAgICAgcmV0dXJuO1xuXG4gICAgLy8gRHJvcCB0aGUgbWVyZ2UgYm94IGRhdGEgaW1tZWRpYXRlbHkuXG4gICAgc2VsZi5pblF1ZXVlID0gbnVsbDtcbiAgICBzZWxmLmNvbGxlY3Rpb25WaWV3cyA9IG5ldyBNYXAoKTtcblxuICAgIGlmIChzZWxmLmhlYXJ0YmVhdCkge1xuICAgICAgc2VsZi5oZWFydGJlYXQuc3RvcCgpO1xuICAgICAgc2VsZi5oZWFydGJlYXQgPSBudWxsO1xuICAgIH1cblxuICAgIGlmIChzZWxmLnNvY2tldCkge1xuICAgICAgc2VsZi5zb2NrZXQuY2xvc2UoKTtcbiAgICAgIHNlbGYuc29ja2V0Ll9tZXRlb3JTZXNzaW9uID0gbnVsbDtcbiAgICB9XG5cbiAgICBQYWNrYWdlWydmYWN0cy1iYXNlJ10gJiYgUGFja2FnZVsnZmFjdHMtYmFzZSddLkZhY3RzLmluY3JlbWVudFNlcnZlckZhY3QoXG4gICAgICBcImxpdmVkYXRhXCIsIFwic2Vzc2lvbnNcIiwgLTEpO1xuXG4gICAgTWV0ZW9yLmRlZmVyKGZ1bmN0aW9uICgpIHtcbiAgICAgIC8vIFN0b3AgY2FsbGJhY2tzIGNhbiB5aWVsZCwgc28gd2UgZGVmZXIgdGhpcyBvbiBjbG9zZS5cbiAgICAgIC8vIHN1Yi5faXNEZWFjdGl2YXRlZCgpIGRldGVjdHMgdGhhdCB3ZSBzZXQgaW5RdWV1ZSB0byBudWxsIGFuZFxuICAgICAgLy8gdHJlYXRzIGl0IGFzIHNlbWktZGVhY3RpdmF0ZWQgKGl0IHdpbGwgaWdub3JlIGluY29taW5nIGNhbGxiYWNrcywgZXRjKS5cbiAgICAgIHNlbGYuX2RlYWN0aXZhdGVBbGxTdWJzY3JpcHRpb25zKCk7XG5cbiAgICAgIC8vIERlZmVyIGNhbGxpbmcgdGhlIGNsb3NlIGNhbGxiYWNrcywgc28gdGhhdCB0aGUgY2FsbGVyIGNsb3NpbmdcbiAgICAgIC8vIHRoZSBzZXNzaW9uIGlzbid0IHdhaXRpbmcgZm9yIGFsbCB0aGUgY2FsbGJhY2tzIHRvIGNvbXBsZXRlLlxuICAgICAgXy5lYWNoKHNlbGYuX2Nsb3NlQ2FsbGJhY2tzLCBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgLy8gVW5yZWdpc3RlciB0aGUgc2Vzc2lvbi5cbiAgICBzZWxmLnNlcnZlci5fcmVtb3ZlU2Vzc2lvbihzZWxmKTtcbiAgfSxcblxuICAvLyBTZW5kIGEgbWVzc2FnZSAoZG9pbmcgbm90aGluZyBpZiBubyBzb2NrZXQgaXMgY29ubmVjdGVkIHJpZ2h0IG5vdykuXG4gIC8vIEl0IHNob3VsZCBiZSBhIEpTT04gb2JqZWN0IChpdCB3aWxsIGJlIHN0cmluZ2lmaWVkKS5cbiAgc2VuZDogZnVuY3Rpb24gKG1zZykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoc2VsZi5zb2NrZXQpIHtcbiAgICAgIGlmIChNZXRlb3IuX3ByaW50U2VudEREUClcbiAgICAgICAgTWV0ZW9yLl9kZWJ1ZyhcIlNlbnQgRERQXCIsIEREUENvbW1vbi5zdHJpbmdpZnlERFAobXNnKSk7XG4gICAgICBzZWxmLnNvY2tldC5zZW5kKEREUENvbW1vbi5zdHJpbmdpZnlERFAobXNnKSk7XG4gICAgfVxuICB9LFxuXG4gIC8vIFNlbmQgYSBjb25uZWN0aW9uIGVycm9yLlxuICBzZW5kRXJyb3I6IGZ1bmN0aW9uIChyZWFzb24sIG9mZmVuZGluZ01lc3NhZ2UpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIG1zZyA9IHttc2c6ICdlcnJvcicsIHJlYXNvbjogcmVhc29ufTtcbiAgICBpZiAob2ZmZW5kaW5nTWVzc2FnZSlcbiAgICAgIG1zZy5vZmZlbmRpbmdNZXNzYWdlID0gb2ZmZW5kaW5nTWVzc2FnZTtcbiAgICBzZWxmLnNlbmQobXNnKTtcbiAgfSxcblxuICAvLyBQcm9jZXNzICdtc2cnIGFzIGFuIGluY29taW5nIG1lc3NhZ2UuIEFzIGEgZ3VhcmQgYWdhaW5zdFxuICAvLyByYWNlIGNvbmRpdGlvbnMgZHVyaW5nIHJlY29ubmVjdGlvbiwgaWdub3JlIHRoZSBtZXNzYWdlIGlmXG4gIC8vICdzb2NrZXQnIGlzIG5vdCB0aGUgY3VycmVudGx5IGNvbm5lY3RlZCBzb2NrZXQuXG4gIC8vXG4gIC8vIFdlIHJ1biB0aGUgbWVzc2FnZXMgZnJvbSB0aGUgY2xpZW50IG9uZSBhdCBhIHRpbWUsIGluIHRoZSBvcmRlclxuICAvLyBnaXZlbiBieSB0aGUgY2xpZW50LiBUaGUgbWVzc2FnZSBoYW5kbGVyIGlzIHBhc3NlZCBhbiBpZGVtcG90ZW50XG4gIC8vIGZ1bmN0aW9uICd1bmJsb2NrJyB3aGljaCBpdCBtYXkgY2FsbCB0byBhbGxvdyBvdGhlciBtZXNzYWdlcyB0b1xuICAvLyBiZWdpbiBydW5uaW5nIGluIHBhcmFsbGVsIGluIGFub3RoZXIgZmliZXIgKGZvciBleGFtcGxlLCBhIG1ldGhvZFxuICAvLyB0aGF0IHdhbnRzIHRvIHlpZWxkKS4gT3RoZXJ3aXNlLCBpdCBpcyBhdXRvbWF0aWNhbGx5IHVuYmxvY2tlZFxuICAvLyB3aGVuIGl0IHJldHVybnMuXG4gIC8vXG4gIC8vIEFjdHVhbGx5LCB3ZSBkb24ndCBoYXZlIHRvICd0b3RhbGx5IG9yZGVyJyB0aGUgbWVzc2FnZXMgaW4gdGhpc1xuICAvLyB3YXksIGJ1dCBpdCdzIHRoZSBlYXNpZXN0IHRoaW5nIHRoYXQncyBjb3JyZWN0LiAodW5zdWIgbmVlZHMgdG9cbiAgLy8gYmUgb3JkZXJlZCBhZ2FpbnN0IHN1YiwgbWV0aG9kcyBuZWVkIHRvIGJlIG9yZGVyZWQgYWdhaW5zdCBlYWNoXG4gIC8vIG90aGVyKS5cbiAgcHJvY2Vzc01lc3NhZ2U6IGZ1bmN0aW9uIChtc2dfaW4pIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKCFzZWxmLmluUXVldWUpIC8vIHdlIGhhdmUgYmVlbiBkZXN0cm95ZWQuXG4gICAgICByZXR1cm47XG5cbiAgICAvLyBSZXNwb25kIHRvIHBpbmcgYW5kIHBvbmcgbWVzc2FnZXMgaW1tZWRpYXRlbHkgd2l0aG91dCBxdWV1aW5nLlxuICAgIC8vIElmIHRoZSBuZWdvdGlhdGVkIEREUCB2ZXJzaW9uIGlzIFwicHJlMVwiIHdoaWNoIGRpZG4ndCBzdXBwb3J0XG4gICAgLy8gcGluZ3MsIHByZXNlcnZlIHRoZSBcInByZTFcIiBiZWhhdmlvciBvZiByZXNwb25kaW5nIHdpdGggYSBcImJhZFxuICAgIC8vIHJlcXVlc3RcIiBmb3IgdGhlIHVua25vd24gbWVzc2FnZXMuXG4gICAgLy9cbiAgICAvLyBGaWJlcnMgYXJlIG5lZWRlZCBiZWNhdXNlIGhlYXJ0YmVhdHMgdXNlIE1ldGVvci5zZXRUaW1lb3V0LCB3aGljaFxuICAgIC8vIG5lZWRzIGEgRmliZXIuIFdlIGNvdWxkIGFjdHVhbGx5IHVzZSByZWd1bGFyIHNldFRpbWVvdXQgYW5kIGF2b2lkXG4gICAgLy8gdGhlc2UgbmV3IGZpYmVycywgYnV0IGl0IGlzIGVhc2llciB0byBqdXN0IG1ha2UgZXZlcnl0aGluZyB1c2VcbiAgICAvLyBNZXRlb3Iuc2V0VGltZW91dCBhbmQgbm90IHRoaW5rIHRvbyBoYXJkLlxuICAgIC8vXG4gICAgLy8gQW55IG1lc3NhZ2UgY291bnRzIGFzIHJlY2VpdmluZyBhIHBvbmcsIGFzIGl0IGRlbW9uc3RyYXRlcyB0aGF0XG4gICAgLy8gdGhlIGNsaWVudCBpcyBzdGlsbCBhbGl2ZS5cbiAgICBpZiAoc2VsZi5oZWFydGJlYXQpIHtcbiAgICAgIEZpYmVyKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc2VsZi5oZWFydGJlYXQubWVzc2FnZVJlY2VpdmVkKCk7XG4gICAgICB9KS5ydW4oKTtcbiAgICB9XG5cbiAgICBpZiAoc2VsZi52ZXJzaW9uICE9PSAncHJlMScgJiYgbXNnX2luLm1zZyA9PT0gJ3BpbmcnKSB7XG4gICAgICBpZiAoc2VsZi5fcmVzcG9uZFRvUGluZ3MpXG4gICAgICAgIHNlbGYuc2VuZCh7bXNnOiBcInBvbmdcIiwgaWQ6IG1zZ19pbi5pZH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoc2VsZi52ZXJzaW9uICE9PSAncHJlMScgJiYgbXNnX2luLm1zZyA9PT0gJ3BvbmcnKSB7XG4gICAgICAvLyBTaW5jZSBldmVyeXRoaW5nIGlzIGEgcG9uZywgdGhlcmUgaXMgbm90aGluZyB0byBkb1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHNlbGYuaW5RdWV1ZS5wdXNoKG1zZ19pbik7XG4gICAgaWYgKHNlbGYud29ya2VyUnVubmluZylcbiAgICAgIHJldHVybjtcbiAgICBzZWxmLndvcmtlclJ1bm5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIHByb2Nlc3NOZXh0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIG1zZyA9IHNlbGYuaW5RdWV1ZSAmJiBzZWxmLmluUXVldWUuc2hpZnQoKTtcbiAgICAgIGlmICghbXNnKSB7XG4gICAgICAgIHNlbGYud29ya2VyUnVubmluZyA9IGZhbHNlO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIEZpYmVyKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGJsb2NrZWQgPSB0cnVlO1xuXG4gICAgICAgIHZhciB1bmJsb2NrID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGlmICghYmxvY2tlZClcbiAgICAgICAgICAgIHJldHVybjsgLy8gaWRlbXBvdGVudFxuICAgICAgICAgIGJsb2NrZWQgPSBmYWxzZTtcbiAgICAgICAgICBwcm9jZXNzTmV4dCgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNlbGYuc2VydmVyLm9uTWVzc2FnZUhvb2suZWFjaChmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICAgICAgICBjYWxsYmFjayhtc2csIHNlbGYpO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoXy5oYXMoc2VsZi5wcm90b2NvbF9oYW5kbGVycywgbXNnLm1zZykpXG4gICAgICAgICAgc2VsZi5wcm90b2NvbF9oYW5kbGVyc1ttc2cubXNnXS5jYWxsKHNlbGYsIG1zZywgdW5ibG9jayk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICBzZWxmLnNlbmRFcnJvcignQmFkIHJlcXVlc3QnLCBtc2cpO1xuICAgICAgICB1bmJsb2NrKCk7IC8vIGluIGNhc2UgdGhlIGhhbmRsZXIgZGlkbid0IGFscmVhZHkgZG8gaXRcbiAgICAgIH0pLnJ1bigpO1xuICAgIH07XG5cbiAgICBwcm9jZXNzTmV4dCgpO1xuICB9LFxuXG4gIHByb3RvY29sX2hhbmRsZXJzOiB7XG4gICAgc3ViOiBmdW5jdGlvbiAobXNnLCB1bmJsb2NrKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIC8vIGNhY2hlVW5ibG9jayB0ZW1wb3Jhcmx5LCBzbyB3ZSBjYW4gY2FwdHVyZSBpdCBsYXRlclxuICAgICAgLy8gd2Ugd2lsbCB1c2UgdW5ibG9jayBpbiBjdXJyZW50IGV2ZW50TG9vcCwgc28gdGhpcyBpcyBzYWZlXG4gICAgICBzZWxmLmNhY2hlZFVuYmxvY2sgPSB1bmJsb2NrO1xuXG4gICAgICAvLyByZWplY3QgbWFsZm9ybWVkIG1lc3NhZ2VzXG4gICAgICBpZiAodHlwZW9mIChtc2cuaWQpICE9PSBcInN0cmluZ1wiIHx8XG4gICAgICAgICAgdHlwZW9mIChtc2cubmFtZSkgIT09IFwic3RyaW5nXCIgfHxcbiAgICAgICAgICAoKCdwYXJhbXMnIGluIG1zZykgJiYgIShtc2cucGFyYW1zIGluc3RhbmNlb2YgQXJyYXkpKSkge1xuICAgICAgICBzZWxmLnNlbmRFcnJvcihcIk1hbGZvcm1lZCBzdWJzY3JpcHRpb25cIiwgbXNnKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAoIXNlbGYuc2VydmVyLnB1Ymxpc2hfaGFuZGxlcnNbbXNnLm5hbWVdKSB7XG4gICAgICAgIHNlbGYuc2VuZCh7XG4gICAgICAgICAgbXNnOiAnbm9zdWInLCBpZDogbXNnLmlkLFxuICAgICAgICAgIGVycm9yOiBuZXcgTWV0ZW9yLkVycm9yKDQwNCwgYFN1YnNjcmlwdGlvbiAnJHttc2cubmFtZX0nIG5vdCBmb3VuZGApfSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKHNlbGYuX25hbWVkU3Vicy5oYXMobXNnLmlkKSlcbiAgICAgICAgLy8gc3VicyBhcmUgaWRlbXBvdGVudCwgb3IgcmF0aGVyLCB0aGV5IGFyZSBpZ25vcmVkIGlmIGEgc3ViXG4gICAgICAgIC8vIHdpdGggdGhhdCBpZCBhbHJlYWR5IGV4aXN0cy4gdGhpcyBpcyBpbXBvcnRhbnQgZHVyaW5nXG4gICAgICAgIC8vIHJlY29ubmVjdC5cbiAgICAgICAgcmV0dXJuO1xuXG4gICAgICAvLyBYWFggSXQnZCBiZSBtdWNoIGJldHRlciBpZiB3ZSBoYWQgZ2VuZXJpYyBob29rcyB3aGVyZSBhbnkgcGFja2FnZSBjYW5cbiAgICAgIC8vIGhvb2sgaW50byBzdWJzY3JpcHRpb24gaGFuZGxpbmcsIGJ1dCBpbiB0aGUgbWVhbiB3aGlsZSB3ZSBzcGVjaWFsIGNhc2VcbiAgICAgIC8vIGRkcC1yYXRlLWxpbWl0ZXIgcGFja2FnZS4gVGhpcyBpcyBhbHNvIGRvbmUgZm9yIHdlYWsgcmVxdWlyZW1lbnRzIHRvXG4gICAgICAvLyBhZGQgdGhlIGRkcC1yYXRlLWxpbWl0ZXIgcGFja2FnZSBpbiBjYXNlIHdlIGRvbid0IGhhdmUgQWNjb3VudHMuIEFcbiAgICAgIC8vIHVzZXIgdHJ5aW5nIHRvIHVzZSB0aGUgZGRwLXJhdGUtbGltaXRlciBtdXN0IGV4cGxpY2l0bHkgcmVxdWlyZSBpdC5cbiAgICAgIGlmIChQYWNrYWdlWydkZHAtcmF0ZS1saW1pdGVyJ10pIHtcbiAgICAgICAgdmFyIEREUFJhdGVMaW1pdGVyID0gUGFja2FnZVsnZGRwLXJhdGUtbGltaXRlciddLkREUFJhdGVMaW1pdGVyO1xuICAgICAgICB2YXIgcmF0ZUxpbWl0ZXJJbnB1dCA9IHtcbiAgICAgICAgICB1c2VySWQ6IHNlbGYudXNlcklkLFxuICAgICAgICAgIGNsaWVudEFkZHJlc3M6IHNlbGYuY29ubmVjdGlvbkhhbmRsZS5jbGllbnRBZGRyZXNzLFxuICAgICAgICAgIHR5cGU6IFwic3Vic2NyaXB0aW9uXCIsXG4gICAgICAgICAgbmFtZTogbXNnLm5hbWUsXG4gICAgICAgICAgY29ubmVjdGlvbklkOiBzZWxmLmlkXG4gICAgICAgIH07XG5cbiAgICAgICAgRERQUmF0ZUxpbWl0ZXIuX2luY3JlbWVudChyYXRlTGltaXRlcklucHV0KTtcbiAgICAgICAgdmFyIHJhdGVMaW1pdFJlc3VsdCA9IEREUFJhdGVMaW1pdGVyLl9jaGVjayhyYXRlTGltaXRlcklucHV0KTtcbiAgICAgICAgaWYgKCFyYXRlTGltaXRSZXN1bHQuYWxsb3dlZCkge1xuICAgICAgICAgIHNlbGYuc2VuZCh7XG4gICAgICAgICAgICBtc2c6ICdub3N1YicsIGlkOiBtc2cuaWQsXG4gICAgICAgICAgICBlcnJvcjogbmV3IE1ldGVvci5FcnJvcihcbiAgICAgICAgICAgICAgJ3Rvby1tYW55LXJlcXVlc3RzJyxcbiAgICAgICAgICAgICAgRERQUmF0ZUxpbWl0ZXIuZ2V0RXJyb3JNZXNzYWdlKHJhdGVMaW1pdFJlc3VsdCksXG4gICAgICAgICAgICAgIHt0aW1lVG9SZXNldDogcmF0ZUxpbWl0UmVzdWx0LnRpbWVUb1Jlc2V0fSlcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdmFyIGhhbmRsZXIgPSBzZWxmLnNlcnZlci5wdWJsaXNoX2hhbmRsZXJzW21zZy5uYW1lXTtcblxuICAgICAgc2VsZi5fc3RhcnRTdWJzY3JpcHRpb24oaGFuZGxlciwgbXNnLmlkLCBtc2cucGFyYW1zLCBtc2cubmFtZSk7XG5cbiAgICAgIC8vIGNsZWFuaW5nIGNhY2hlZCB1bmJsb2NrXG4gICAgICBzZWxmLmNhY2hlZFVuYmxvY2sgPSBudWxsO1xuICAgIH0sXG5cbiAgICB1bnN1YjogZnVuY3Rpb24gKG1zZykge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICBzZWxmLl9zdG9wU3Vic2NyaXB0aW9uKG1zZy5pZCk7XG4gICAgfSxcblxuICAgIG1ldGhvZDogZnVuY3Rpb24gKG1zZywgdW5ibG9jaykge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAvLyBSZWplY3QgbWFsZm9ybWVkIG1lc3NhZ2VzLlxuICAgICAgLy8gRm9yIG5vdywgd2Ugc2lsZW50bHkgaWdub3JlIHVua25vd24gYXR0cmlidXRlcyxcbiAgICAgIC8vIGZvciBmb3J3YXJkcyBjb21wYXRpYmlsaXR5LlxuICAgICAgaWYgKHR5cGVvZiAobXNnLmlkKSAhPT0gXCJzdHJpbmdcIiB8fFxuICAgICAgICAgIHR5cGVvZiAobXNnLm1ldGhvZCkgIT09IFwic3RyaW5nXCIgfHxcbiAgICAgICAgICAoKCdwYXJhbXMnIGluIG1zZykgJiYgIShtc2cucGFyYW1zIGluc3RhbmNlb2YgQXJyYXkpKSB8fFxuICAgICAgICAgICgoJ3JhbmRvbVNlZWQnIGluIG1zZykgJiYgKHR5cGVvZiBtc2cucmFuZG9tU2VlZCAhPT0gXCJzdHJpbmdcIikpKSB7XG4gICAgICAgIHNlbGYuc2VuZEVycm9yKFwiTWFsZm9ybWVkIG1ldGhvZCBpbnZvY2F0aW9uXCIsIG1zZyk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIHJhbmRvbVNlZWQgPSBtc2cucmFuZG9tU2VlZCB8fCBudWxsO1xuXG4gICAgICAvLyBTZXQgdXAgdG8gbWFyayB0aGUgbWV0aG9kIGFzIHNhdGlzZmllZCBvbmNlIGFsbCBvYnNlcnZlcnNcbiAgICAgIC8vIChhbmQgc3Vic2NyaXB0aW9ucykgaGF2ZSByZWFjdGVkIHRvIGFueSB3cml0ZXMgdGhhdCB3ZXJlXG4gICAgICAvLyBkb25lLlxuICAgICAgdmFyIGZlbmNlID0gbmV3IEREUFNlcnZlci5fV3JpdGVGZW5jZTtcbiAgICAgIGZlbmNlLm9uQWxsQ29tbWl0dGVkKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8gUmV0aXJlIHRoZSBmZW5jZSBzbyB0aGF0IGZ1dHVyZSB3cml0ZXMgYXJlIGFsbG93ZWQuXG4gICAgICAgIC8vIFRoaXMgbWVhbnMgdGhhdCBjYWxsYmFja3MgbGlrZSB0aW1lcnMgYXJlIGZyZWUgdG8gdXNlXG4gICAgICAgIC8vIHRoZSBmZW5jZSwgYW5kIGlmIHRoZXkgZmlyZSBiZWZvcmUgaXQncyBhcm1lZCAoZm9yXG4gICAgICAgIC8vIGV4YW1wbGUsIGJlY2F1c2UgdGhlIG1ldGhvZCB3YWl0cyBmb3IgdGhlbSkgdGhlaXJcbiAgICAgICAgLy8gd3JpdGVzIHdpbGwgYmUgaW5jbHVkZWQgaW4gdGhlIGZlbmNlLlxuICAgICAgICBmZW5jZS5yZXRpcmUoKTtcbiAgICAgICAgc2VsZi5zZW5kKHtcbiAgICAgICAgICBtc2c6ICd1cGRhdGVkJywgbWV0aG9kczogW21zZy5pZF19KTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBGaW5kIHRoZSBoYW5kbGVyXG4gICAgICB2YXIgaGFuZGxlciA9IHNlbGYuc2VydmVyLm1ldGhvZF9oYW5kbGVyc1ttc2cubWV0aG9kXTtcbiAgICAgIGlmICghaGFuZGxlcikge1xuICAgICAgICBzZWxmLnNlbmQoe1xuICAgICAgICAgIG1zZzogJ3Jlc3VsdCcsIGlkOiBtc2cuaWQsXG4gICAgICAgICAgZXJyb3I6IG5ldyBNZXRlb3IuRXJyb3IoNDA0LCBgTWV0aG9kICcke21zZy5tZXRob2R9JyBub3QgZm91bmRgKX0pO1xuICAgICAgICBmZW5jZS5hcm0oKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB2YXIgc2V0VXNlcklkID0gZnVuY3Rpb24odXNlcklkKSB7XG4gICAgICAgIHNlbGYuX3NldFVzZXJJZCh1c2VySWQpO1xuICAgICAgfTtcblxuICAgICAgdmFyIGludm9jYXRpb24gPSBuZXcgRERQQ29tbW9uLk1ldGhvZEludm9jYXRpb24oe1xuICAgICAgICBpc1NpbXVsYXRpb246IGZhbHNlLFxuICAgICAgICB1c2VySWQ6IHNlbGYudXNlcklkLFxuICAgICAgICBzZXRVc2VySWQ6IHNldFVzZXJJZCxcbiAgICAgICAgdW5ibG9jazogdW5ibG9jayxcbiAgICAgICAgY29ubmVjdGlvbjogc2VsZi5jb25uZWN0aW9uSGFuZGxlLFxuICAgICAgICByYW5kb21TZWVkOiByYW5kb21TZWVkXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgcHJvbWlzZSA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgLy8gWFhYIEl0J2QgYmUgYmV0dGVyIGlmIHdlIGNvdWxkIGhvb2sgaW50byBtZXRob2QgaGFuZGxlcnMgYmV0dGVyIGJ1dFxuICAgICAgICAvLyBmb3Igbm93LCB3ZSBuZWVkIHRvIGNoZWNrIGlmIHRoZSBkZHAtcmF0ZS1saW1pdGVyIGV4aXN0cyBzaW5jZSB3ZVxuICAgICAgICAvLyBoYXZlIGEgd2VhayByZXF1aXJlbWVudCBmb3IgdGhlIGRkcC1yYXRlLWxpbWl0ZXIgcGFja2FnZSB0byBiZSBhZGRlZFxuICAgICAgICAvLyB0byBvdXIgYXBwbGljYXRpb24uXG4gICAgICAgIGlmIChQYWNrYWdlWydkZHAtcmF0ZS1saW1pdGVyJ10pIHtcbiAgICAgICAgICB2YXIgRERQUmF0ZUxpbWl0ZXIgPSBQYWNrYWdlWydkZHAtcmF0ZS1saW1pdGVyJ10uRERQUmF0ZUxpbWl0ZXI7XG4gICAgICAgICAgdmFyIHJhdGVMaW1pdGVySW5wdXQgPSB7XG4gICAgICAgICAgICB1c2VySWQ6IHNlbGYudXNlcklkLFxuICAgICAgICAgICAgY2xpZW50QWRkcmVzczogc2VsZi5jb25uZWN0aW9uSGFuZGxlLmNsaWVudEFkZHJlc3MsXG4gICAgICAgICAgICB0eXBlOiBcIm1ldGhvZFwiLFxuICAgICAgICAgICAgbmFtZTogbXNnLm1ldGhvZCxcbiAgICAgICAgICAgIGNvbm5lY3Rpb25JZDogc2VsZi5pZFxuICAgICAgICAgIH07XG4gICAgICAgICAgRERQUmF0ZUxpbWl0ZXIuX2luY3JlbWVudChyYXRlTGltaXRlcklucHV0KTtcbiAgICAgICAgICB2YXIgcmF0ZUxpbWl0UmVzdWx0ID0gRERQUmF0ZUxpbWl0ZXIuX2NoZWNrKHJhdGVMaW1pdGVySW5wdXQpXG4gICAgICAgICAgaWYgKCFyYXRlTGltaXRSZXN1bHQuYWxsb3dlZCkge1xuICAgICAgICAgICAgcmVqZWN0KG5ldyBNZXRlb3IuRXJyb3IoXG4gICAgICAgICAgICAgIFwidG9vLW1hbnktcmVxdWVzdHNcIixcbiAgICAgICAgICAgICAgRERQUmF0ZUxpbWl0ZXIuZ2V0RXJyb3JNZXNzYWdlKHJhdGVMaW1pdFJlc3VsdCksXG4gICAgICAgICAgICAgIHt0aW1lVG9SZXNldDogcmF0ZUxpbWl0UmVzdWx0LnRpbWVUb1Jlc2V0fVxuICAgICAgICAgICAgKSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZ2V0Q3VycmVudE1ldGhvZEludm9jYXRpb25SZXN1bHQgPSAoKSA9PiB7XG4gICAgICAgICAgY29uc3QgY3VycmVudENvbnRleHQgPSBERFAuX0N1cnJlbnRNZXRob2RJbnZvY2F0aW9uLl9zZXROZXdDb250ZXh0QW5kR2V0Q3VycmVudChcbiAgICAgICAgICAgIGludm9jYXRpb25cbiAgICAgICAgICApO1xuXG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGxldCByZXN1bHQ7XG4gICAgICAgICAgICBjb25zdCByZXN1bHRPclRoZW5hYmxlID0gbWF5YmVBdWRpdEFyZ3VtZW50Q2hlY2tzKFxuICAgICAgICAgICAgICBoYW5kbGVyLFxuICAgICAgICAgICAgICBpbnZvY2F0aW9uLFxuICAgICAgICAgICAgICBtc2cucGFyYW1zLFxuICAgICAgICAgICAgICBcImNhbGwgdG8gJ1wiICsgbXNnLm1ldGhvZCArIFwiJ1wiXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgY29uc3QgaXNUaGVuYWJsZSA9XG4gICAgICAgICAgICAgIHJlc3VsdE9yVGhlbmFibGUgJiYgdHlwZW9mIHJlc3VsdE9yVGhlbmFibGUudGhlbiA9PT0gJ2Z1bmN0aW9uJztcbiAgICAgICAgICAgIGlmIChpc1RoZW5hYmxlKSB7XG4gICAgICAgICAgICAgIHJlc3VsdCA9IFByb21pc2UuYXdhaXQocmVzdWx0T3JUaGVuYWJsZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXN1bHQgPSByZXN1bHRPclRoZW5hYmxlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgRERQLl9DdXJyZW50TWV0aG9kSW52b2NhdGlvbi5fc2V0KGN1cnJlbnRDb250ZXh0KTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgcmVzb2x2ZShERFBTZXJ2ZXIuX0N1cnJlbnRXcml0ZUZlbmNlLndpdGhWYWx1ZShmZW5jZSwgZ2V0Q3VycmVudE1ldGhvZEludm9jYXRpb25SZXN1bHQpKTtcbiAgICAgIH0pO1xuXG4gICAgICBmdW5jdGlvbiBmaW5pc2goKSB7XG4gICAgICAgIGZlbmNlLmFybSgpO1xuICAgICAgICB1bmJsb2NrKCk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHBheWxvYWQgPSB7XG4gICAgICAgIG1zZzogXCJyZXN1bHRcIixcbiAgICAgICAgaWQ6IG1zZy5pZFxuICAgICAgfTtcblxuICAgICAgcHJvbWlzZS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgIGZpbmlzaCgpO1xuICAgICAgICBpZiAocmVzdWx0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBwYXlsb2FkLnJlc3VsdCA9IHJlc3VsdDtcbiAgICAgICAgfVxuICAgICAgICBzZWxmLnNlbmQocGF5bG9hZCk7XG4gICAgICB9LCAoZXhjZXB0aW9uKSA9PiB7XG4gICAgICAgIGZpbmlzaCgpO1xuICAgICAgICBwYXlsb2FkLmVycm9yID0gd3JhcEludGVybmFsRXhjZXB0aW9uKFxuICAgICAgICAgIGV4Y2VwdGlvbixcbiAgICAgICAgICBgd2hpbGUgaW52b2tpbmcgbWV0aG9kICcke21zZy5tZXRob2R9J2BcbiAgICAgICAgKTtcbiAgICAgICAgc2VsZi5zZW5kKHBheWxvYWQpO1xuICAgICAgfSk7XG4gICAgfVxuICB9LFxuXG4gIF9lYWNoU3ViOiBmdW5jdGlvbiAoZikge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBzZWxmLl9uYW1lZFN1YnMuZm9yRWFjaChmKTtcbiAgICBzZWxmLl91bml2ZXJzYWxTdWJzLmZvckVhY2goZik7XG4gIH0sXG5cbiAgX2RpZmZDb2xsZWN0aW9uVmlld3M6IGZ1bmN0aW9uIChiZWZvcmVDVnMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgRGlmZlNlcXVlbmNlLmRpZmZNYXBzKGJlZm9yZUNWcywgc2VsZi5jb2xsZWN0aW9uVmlld3MsIHtcbiAgICAgIGJvdGg6IGZ1bmN0aW9uIChjb2xsZWN0aW9uTmFtZSwgbGVmdFZhbHVlLCByaWdodFZhbHVlKSB7XG4gICAgICAgIHJpZ2h0VmFsdWUuZGlmZihsZWZ0VmFsdWUpO1xuICAgICAgfSxcbiAgICAgIHJpZ2h0T25seTogZnVuY3Rpb24gKGNvbGxlY3Rpb25OYW1lLCByaWdodFZhbHVlKSB7XG4gICAgICAgIHJpZ2h0VmFsdWUuZG9jdW1lbnRzLmZvckVhY2goZnVuY3Rpb24gKGRvY1ZpZXcsIGlkKSB7XG4gICAgICAgICAgc2VsZi5zZW5kQWRkZWQoY29sbGVjdGlvbk5hbWUsIGlkLCBkb2NWaWV3LmdldEZpZWxkcygpKTtcbiAgICAgICAgfSk7XG4gICAgICB9LFxuICAgICAgbGVmdE9ubHk6IGZ1bmN0aW9uIChjb2xsZWN0aW9uTmFtZSwgbGVmdFZhbHVlKSB7XG4gICAgICAgIGxlZnRWYWx1ZS5kb2N1bWVudHMuZm9yRWFjaChmdW5jdGlvbiAoZG9jLCBpZCkge1xuICAgICAgICAgIHNlbGYuc2VuZFJlbW92ZWQoY29sbGVjdGlvbk5hbWUsIGlkKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG5cbiAgLy8gU2V0cyB0aGUgY3VycmVudCB1c2VyIGlkIGluIGFsbCBhcHByb3ByaWF0ZSBjb250ZXh0cyBhbmQgcmVydW5zXG4gIC8vIGFsbCBzdWJzY3JpcHRpb25zXG4gIF9zZXRVc2VySWQ6IGZ1bmN0aW9uKHVzZXJJZCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIGlmICh1c2VySWQgIT09IG51bGwgJiYgdHlwZW9mIHVzZXJJZCAhPT0gXCJzdHJpbmdcIilcbiAgICAgIHRocm93IG5ldyBFcnJvcihcInNldFVzZXJJZCBtdXN0IGJlIGNhbGxlZCBvbiBzdHJpbmcgb3IgbnVsbCwgbm90IFwiICtcbiAgICAgICAgICAgICAgICAgICAgICB0eXBlb2YgdXNlcklkKTtcblxuICAgIC8vIFByZXZlbnQgbmV3bHktY3JlYXRlZCB1bml2ZXJzYWwgc3Vic2NyaXB0aW9ucyBmcm9tIGJlaW5nIGFkZGVkIHRvIG91clxuICAgIC8vIHNlc3Npb24uIFRoZXkgd2lsbCBiZSBmb3VuZCBiZWxvdyB3aGVuIHdlIGNhbGwgc3RhcnRVbml2ZXJzYWxTdWJzLlxuICAgIC8vXG4gICAgLy8gKFdlIGRvbid0IGhhdmUgdG8gd29ycnkgYWJvdXQgbmFtZWQgc3Vic2NyaXB0aW9ucywgYmVjYXVzZSB3ZSBvbmx5IGFkZFxuICAgIC8vIHRoZW0gd2hlbiB3ZSBwcm9jZXNzIGEgJ3N1YicgbWVzc2FnZS4gV2UgYXJlIGN1cnJlbnRseSBwcm9jZXNzaW5nIGFcbiAgICAvLyAnbWV0aG9kJyBtZXNzYWdlLCBhbmQgdGhlIG1ldGhvZCBkaWQgbm90IHVuYmxvY2ssIGJlY2F1c2UgaXQgaXMgaWxsZWdhbFxuICAgIC8vIHRvIGNhbGwgc2V0VXNlcklkIGFmdGVyIHVuYmxvY2suIFRodXMgd2UgY2Fubm90IGJlIGNvbmN1cnJlbnRseSBhZGRpbmcgYVxuICAgIC8vIG5ldyBuYW1lZCBzdWJzY3JpcHRpb24pLlxuICAgIHNlbGYuX2RvbnRTdGFydE5ld1VuaXZlcnNhbFN1YnMgPSB0cnVlO1xuXG4gICAgLy8gUHJldmVudCBjdXJyZW50IHN1YnMgZnJvbSB1cGRhdGluZyBvdXIgY29sbGVjdGlvblZpZXdzIGFuZCBjYWxsIHRoZWlyXG4gICAgLy8gc3RvcCBjYWxsYmFja3MuIFRoaXMgbWF5IHlpZWxkLlxuICAgIHNlbGYuX2VhY2hTdWIoZnVuY3Rpb24gKHN1Yikge1xuICAgICAgc3ViLl9kZWFjdGl2YXRlKCk7XG4gICAgfSk7XG5cbiAgICAvLyBBbGwgc3VicyBzaG91bGQgbm93IGJlIGRlYWN0aXZhdGVkLiBTdG9wIHNlbmRpbmcgbWVzc2FnZXMgdG8gdGhlIGNsaWVudCxcbiAgICAvLyBzYXZlIHRoZSBzdGF0ZSBvZiB0aGUgcHVibGlzaGVkIGNvbGxlY3Rpb25zLCByZXNldCB0byBhbiBlbXB0eSB2aWV3LCBhbmRcbiAgICAvLyB1cGRhdGUgdGhlIHVzZXJJZC5cbiAgICBzZWxmLl9pc1NlbmRpbmcgPSBmYWxzZTtcbiAgICB2YXIgYmVmb3JlQ1ZzID0gc2VsZi5jb2xsZWN0aW9uVmlld3M7XG4gICAgc2VsZi5jb2xsZWN0aW9uVmlld3MgPSBuZXcgTWFwKCk7XG4gICAgc2VsZi51c2VySWQgPSB1c2VySWQ7XG5cbiAgICAvLyBfc2V0VXNlcklkIGlzIG5vcm1hbGx5IGNhbGxlZCBmcm9tIGEgTWV0ZW9yIG1ldGhvZCB3aXRoXG4gICAgLy8gRERQLl9DdXJyZW50TWV0aG9kSW52b2NhdGlvbiBzZXQuIEJ1dCBERFAuX0N1cnJlbnRNZXRob2RJbnZvY2F0aW9uIGlzIG5vdFxuICAgIC8vIGV4cGVjdGVkIHRvIGJlIHNldCBpbnNpZGUgYSBwdWJsaXNoIGZ1bmN0aW9uLCBzbyB3ZSB0ZW1wb3JhcnkgdW5zZXQgaXQuXG4gICAgLy8gSW5zaWRlIGEgcHVibGlzaCBmdW5jdGlvbiBERFAuX0N1cnJlbnRQdWJsaWNhdGlvbkludm9jYXRpb24gaXMgc2V0LlxuICAgIEREUC5fQ3VycmVudE1ldGhvZEludm9jYXRpb24ud2l0aFZhbHVlKHVuZGVmaW5lZCwgZnVuY3Rpb24gKCkge1xuICAgICAgLy8gU2F2ZSB0aGUgb2xkIG5hbWVkIHN1YnMsIGFuZCByZXNldCB0byBoYXZpbmcgbm8gc3Vic2NyaXB0aW9ucy5cbiAgICAgIHZhciBvbGROYW1lZFN1YnMgPSBzZWxmLl9uYW1lZFN1YnM7XG4gICAgICBzZWxmLl9uYW1lZFN1YnMgPSBuZXcgTWFwKCk7XG4gICAgICBzZWxmLl91bml2ZXJzYWxTdWJzID0gW107XG5cbiAgICAgIG9sZE5hbWVkU3Vicy5mb3JFYWNoKGZ1bmN0aW9uIChzdWIsIHN1YnNjcmlwdGlvbklkKSB7XG4gICAgICAgIHZhciBuZXdTdWIgPSBzdWIuX3JlY3JlYXRlKCk7XG4gICAgICAgIHNlbGYuX25hbWVkU3Vicy5zZXQoc3Vic2NyaXB0aW9uSWQsIG5ld1N1Yik7XG4gICAgICAgIC8vIG5iOiBpZiB0aGUgaGFuZGxlciB0aHJvd3Mgb3IgY2FsbHMgdGhpcy5lcnJvcigpLCBpdCB3aWxsIGluIGZhY3RcbiAgICAgICAgLy8gaW1tZWRpYXRlbHkgc2VuZCBpdHMgJ25vc3ViJy4gVGhpcyBpcyBPSywgdGhvdWdoLlxuICAgICAgICBuZXdTdWIuX3J1bkhhbmRsZXIoKTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBBbGxvdyBuZXdseS1jcmVhdGVkIHVuaXZlcnNhbCBzdWJzIHRvIGJlIHN0YXJ0ZWQgb24gb3VyIGNvbm5lY3Rpb24gaW5cbiAgICAgIC8vIHBhcmFsbGVsIHdpdGggdGhlIG9uZXMgd2UncmUgc3Bpbm5pbmcgdXAgaGVyZSwgYW5kIHNwaW4gdXAgdW5pdmVyc2FsXG4gICAgICAvLyBzdWJzLlxuICAgICAgc2VsZi5fZG9udFN0YXJ0TmV3VW5pdmVyc2FsU3VicyA9IGZhbHNlO1xuICAgICAgc2VsZi5zdGFydFVuaXZlcnNhbFN1YnMoKTtcbiAgICB9KTtcblxuICAgIC8vIFN0YXJ0IHNlbmRpbmcgbWVzc2FnZXMgYWdhaW4sIGJlZ2lubmluZyB3aXRoIHRoZSBkaWZmIGZyb20gdGhlIHByZXZpb3VzXG4gICAgLy8gc3RhdGUgb2YgdGhlIHdvcmxkIHRvIHRoZSBjdXJyZW50IHN0YXRlLiBObyB5aWVsZHMgYXJlIGFsbG93ZWQgZHVyaW5nXG4gICAgLy8gdGhpcyBkaWZmLCBzbyB0aGF0IG90aGVyIGNoYW5nZXMgY2Fubm90IGludGVybGVhdmUuXG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgc2VsZi5faXNTZW5kaW5nID0gdHJ1ZTtcbiAgICAgIHNlbGYuX2RpZmZDb2xsZWN0aW9uVmlld3MoYmVmb3JlQ1ZzKTtcbiAgICAgIGlmICghXy5pc0VtcHR5KHNlbGYuX3BlbmRpbmdSZWFkeSkpIHtcbiAgICAgICAgc2VsZi5zZW5kUmVhZHkoc2VsZi5fcGVuZGluZ1JlYWR5KTtcbiAgICAgICAgc2VsZi5fcGVuZGluZ1JlYWR5ID0gW107XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG5cbiAgX3N0YXJ0U3Vic2NyaXB0aW9uOiBmdW5jdGlvbiAoaGFuZGxlciwgc3ViSWQsIHBhcmFtcywgbmFtZSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHZhciBzdWIgPSBuZXcgU3Vic2NyaXB0aW9uKFxuICAgICAgc2VsZiwgaGFuZGxlciwgc3ViSWQsIHBhcmFtcywgbmFtZSk7XG5cbiAgICBsZXQgdW5ibG9ja0hhbmRlciA9IHNlbGYuY2FjaGVkVW5ibG9jaztcbiAgICAvLyBfc3RhcnRTdWJzY3JpcHRpb24gbWF5IGNhbGwgZnJvbSBhIGxvdCBwbGFjZXNcbiAgICAvLyBzbyBjYWNoZWRVbmJsb2NrIG1pZ2h0IGJlIG51bGwgaW4gc29tZWNhc2VzXG4gICAgLy8gYXNzaWduIHRoZSBjYWNoZWRVbmJsb2NrXG4gICAgc3ViLnVuYmxvY2sgPSB1bmJsb2NrSGFuZGVyIHx8ICgoKSA9PiB7fSk7XG5cbiAgICBpZiAoc3ViSWQpXG4gICAgICBzZWxmLl9uYW1lZFN1YnMuc2V0KHN1YklkLCBzdWIpO1xuICAgIGVsc2VcbiAgICAgIHNlbGYuX3VuaXZlcnNhbFN1YnMucHVzaChzdWIpO1xuXG4gICAgc3ViLl9ydW5IYW5kbGVyKCk7XG4gIH0sXG5cbiAgLy8gVGVhciBkb3duIHNwZWNpZmllZCBzdWJzY3JpcHRpb25cbiAgX3N0b3BTdWJzY3JpcHRpb246IGZ1bmN0aW9uIChzdWJJZCwgZXJyb3IpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgc3ViTmFtZSA9IG51bGw7XG4gICAgaWYgKHN1YklkKSB7XG4gICAgICB2YXIgbWF5YmVTdWIgPSBzZWxmLl9uYW1lZFN1YnMuZ2V0KHN1YklkKTtcbiAgICAgIGlmIChtYXliZVN1Yikge1xuICAgICAgICBzdWJOYW1lID0gbWF5YmVTdWIuX25hbWU7XG4gICAgICAgIG1heWJlU3ViLl9yZW1vdmVBbGxEb2N1bWVudHMoKTtcbiAgICAgICAgbWF5YmVTdWIuX2RlYWN0aXZhdGUoKTtcbiAgICAgICAgc2VsZi5fbmFtZWRTdWJzLmRlbGV0ZShzdWJJZCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIHJlc3BvbnNlID0ge21zZzogJ25vc3ViJywgaWQ6IHN1YklkfTtcblxuICAgIGlmIChlcnJvcikge1xuICAgICAgcmVzcG9uc2UuZXJyb3IgPSB3cmFwSW50ZXJuYWxFeGNlcHRpb24oXG4gICAgICAgIGVycm9yLFxuICAgICAgICBzdWJOYW1lID8gKFwiZnJvbSBzdWIgXCIgKyBzdWJOYW1lICsgXCIgaWQgXCIgKyBzdWJJZClcbiAgICAgICAgICA6IChcImZyb20gc3ViIGlkIFwiICsgc3ViSWQpKTtcbiAgICB9XG5cbiAgICBzZWxmLnNlbmQocmVzcG9uc2UpO1xuICB9LFxuXG4gIC8vIFRlYXIgZG93biBhbGwgc3Vic2NyaXB0aW9ucy4gTm90ZSB0aGF0IHRoaXMgZG9lcyBOT1Qgc2VuZCByZW1vdmVkIG9yIG5vc3ViXG4gIC8vIG1lc3NhZ2VzLCBzaW5jZSB3ZSBhc3N1bWUgdGhlIGNsaWVudCBpcyBnb25lLlxuICBfZGVhY3RpdmF0ZUFsbFN1YnNjcmlwdGlvbnM6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBzZWxmLl9uYW1lZFN1YnMuZm9yRWFjaChmdW5jdGlvbiAoc3ViLCBpZCkge1xuICAgICAgc3ViLl9kZWFjdGl2YXRlKCk7XG4gICAgfSk7XG4gICAgc2VsZi5fbmFtZWRTdWJzID0gbmV3IE1hcCgpO1xuXG4gICAgc2VsZi5fdW5pdmVyc2FsU3Vicy5mb3JFYWNoKGZ1bmN0aW9uIChzdWIpIHtcbiAgICAgIHN1Yi5fZGVhY3RpdmF0ZSgpO1xuICAgIH0pO1xuICAgIHNlbGYuX3VuaXZlcnNhbFN1YnMgPSBbXTtcbiAgfSxcblxuICAvLyBEZXRlcm1pbmUgdGhlIHJlbW90ZSBjbGllbnQncyBJUCBhZGRyZXNzLCBiYXNlZCBvbiB0aGVcbiAgLy8gSFRUUF9GT1JXQVJERURfQ09VTlQgZW52aXJvbm1lbnQgdmFyaWFibGUgcmVwcmVzZW50aW5nIGhvdyBtYW55XG4gIC8vIHByb3hpZXMgdGhlIHNlcnZlciBpcyBiZWhpbmQuXG4gIF9jbGllbnRBZGRyZXNzOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgLy8gRm9yIHRoZSByZXBvcnRlZCBjbGllbnQgYWRkcmVzcyBmb3IgYSBjb25uZWN0aW9uIHRvIGJlIGNvcnJlY3QsXG4gICAgLy8gdGhlIGRldmVsb3BlciBtdXN0IHNldCB0aGUgSFRUUF9GT1JXQVJERURfQ09VTlQgZW52aXJvbm1lbnRcbiAgICAvLyB2YXJpYWJsZSB0byBhbiBpbnRlZ2VyIHJlcHJlc2VudGluZyB0aGUgbnVtYmVyIG9mIGhvcHMgdGhleVxuICAgIC8vIGV4cGVjdCBpbiB0aGUgYHgtZm9yd2FyZGVkLWZvcmAgaGVhZGVyLiBFLmcuLCBzZXQgdG8gXCIxXCIgaWYgdGhlXG4gICAgLy8gc2VydmVyIGlzIGJlaGluZCBvbmUgcHJveHkuXG4gICAgLy9cbiAgICAvLyBUaGlzIGNvdWxkIGJlIGNvbXB1dGVkIG9uY2UgYXQgc3RhcnR1cCBpbnN0ZWFkIG9mIGV2ZXJ5IHRpbWUuXG4gICAgdmFyIGh0dHBGb3J3YXJkZWRDb3VudCA9IHBhcnNlSW50KHByb2Nlc3MuZW52WydIVFRQX0ZPUldBUkRFRF9DT1VOVCddKSB8fCAwO1xuXG4gICAgaWYgKGh0dHBGb3J3YXJkZWRDb3VudCA9PT0gMClcbiAgICAgIHJldHVybiBzZWxmLnNvY2tldC5yZW1vdGVBZGRyZXNzO1xuXG4gICAgdmFyIGZvcndhcmRlZEZvciA9IHNlbGYuc29ja2V0LmhlYWRlcnNbXCJ4LWZvcndhcmRlZC1mb3JcIl07XG4gICAgaWYgKCEgXy5pc1N0cmluZyhmb3J3YXJkZWRGb3IpKVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgZm9yd2FyZGVkRm9yID0gZm9yd2FyZGVkRm9yLnRyaW0oKS5zcGxpdCgvXFxzKixcXHMqLyk7XG5cbiAgICAvLyBUeXBpY2FsbHkgdGhlIGZpcnN0IHZhbHVlIGluIHRoZSBgeC1mb3J3YXJkZWQtZm9yYCBoZWFkZXIgaXNcbiAgICAvLyB0aGUgb3JpZ2luYWwgSVAgYWRkcmVzcyBvZiB0aGUgY2xpZW50IGNvbm5lY3RpbmcgdG8gdGhlIGZpcnN0XG4gICAgLy8gcHJveHkuICBIb3dldmVyLCB0aGUgZW5kIHVzZXIgY2FuIGVhc2lseSBzcG9vZiB0aGUgaGVhZGVyLCBpblxuICAgIC8vIHdoaWNoIGNhc2UgdGhlIGZpcnN0IHZhbHVlKHMpIHdpbGwgYmUgdGhlIGZha2UgSVAgYWRkcmVzcyBmcm9tXG4gICAgLy8gdGhlIHVzZXIgcHJldGVuZGluZyB0byBiZSBhIHByb3h5IHJlcG9ydGluZyB0aGUgb3JpZ2luYWwgSVBcbiAgICAvLyBhZGRyZXNzIHZhbHVlLiAgQnkgY291bnRpbmcgSFRUUF9GT1JXQVJERURfQ09VTlQgYmFjayBmcm9tIHRoZVxuICAgIC8vIGVuZCBvZiB0aGUgbGlzdCwgd2UgZW5zdXJlIHRoYXQgd2UgZ2V0IHRoZSBJUCBhZGRyZXNzIGJlaW5nXG4gICAgLy8gcmVwb3J0ZWQgYnkgKm91ciogZmlyc3QgcHJveHkuXG5cbiAgICBpZiAoaHR0cEZvcndhcmRlZENvdW50IDwgMCB8fCBodHRwRm9yd2FyZGVkQ291bnQgPiBmb3J3YXJkZWRGb3IubGVuZ3RoKVxuICAgICAgcmV0dXJuIG51bGw7XG5cbiAgICByZXR1cm4gZm9yd2FyZGVkRm9yW2ZvcndhcmRlZEZvci5sZW5ndGggLSBodHRwRm9yd2FyZGVkQ291bnRdO1xuICB9XG59KTtcblxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cbi8qIFN1YnNjcmlwdGlvbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICovXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4vLyBDdG9yIGZvciBhIHN1YiBoYW5kbGU6IHRoZSBpbnB1dCB0byBlYWNoIHB1Ymxpc2ggZnVuY3Rpb25cblxuLy8gSW5zdGFuY2UgbmFtZSBpcyB0aGlzIGJlY2F1c2UgaXQncyB1c3VhbGx5IHJlZmVycmVkIHRvIGFzIHRoaXMgaW5zaWRlIGFcbi8vIHB1Ymxpc2hcbi8qKlxuICogQHN1bW1hcnkgVGhlIHNlcnZlcidzIHNpZGUgb2YgYSBzdWJzY3JpcHRpb25cbiAqIEBjbGFzcyBTdWJzY3JpcHRpb25cbiAqIEBpbnN0YW5jZU5hbWUgdGhpc1xuICogQHNob3dJbnN0YW5jZU5hbWUgdHJ1ZVxuICovXG52YXIgU3Vic2NyaXB0aW9uID0gZnVuY3Rpb24gKFxuICAgIHNlc3Npb24sIGhhbmRsZXIsIHN1YnNjcmlwdGlvbklkLCBwYXJhbXMsIG5hbWUpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBzZWxmLl9zZXNzaW9uID0gc2Vzc2lvbjsgLy8gdHlwZSBpcyBTZXNzaW9uXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IEFjY2VzcyBpbnNpZGUgdGhlIHB1Ymxpc2ggZnVuY3Rpb24uIFRoZSBpbmNvbWluZyBbY29ubmVjdGlvbl0oI21ldGVvcl9vbmNvbm5lY3Rpb24pIGZvciB0aGlzIHN1YnNjcmlwdGlvbi5cbiAgICogQGxvY3VzIFNlcnZlclxuICAgKiBAbmFtZSAgY29ubmVjdGlvblxuICAgKiBAbWVtYmVyT2YgU3Vic2NyaXB0aW9uXG4gICAqIEBpbnN0YW5jZVxuICAgKi9cbiAgc2VsZi5jb25uZWN0aW9uID0gc2Vzc2lvbi5jb25uZWN0aW9uSGFuZGxlOyAvLyBwdWJsaWMgQVBJIG9iamVjdFxuXG4gIHNlbGYuX2hhbmRsZXIgPSBoYW5kbGVyO1xuXG4gIC8vIE15IHN1YnNjcmlwdGlvbiBJRCAoZ2VuZXJhdGVkIGJ5IGNsaWVudCwgdW5kZWZpbmVkIGZvciB1bml2ZXJzYWwgc3VicykuXG4gIHNlbGYuX3N1YnNjcmlwdGlvbklkID0gc3Vic2NyaXB0aW9uSWQ7XG4gIC8vIFVuZGVmaW5lZCBmb3IgdW5pdmVyc2FsIHN1YnNcbiAgc2VsZi5fbmFtZSA9IG5hbWU7XG5cbiAgc2VsZi5fcGFyYW1zID0gcGFyYW1zIHx8IFtdO1xuXG4gIC8vIE9ubHkgbmFtZWQgc3Vic2NyaXB0aW9ucyBoYXZlIElEcywgYnV0IHdlIG5lZWQgc29tZSBzb3J0IG9mIHN0cmluZ1xuICAvLyBpbnRlcm5hbGx5IHRvIGtlZXAgdHJhY2sgb2YgYWxsIHN1YnNjcmlwdGlvbnMgaW5zaWRlXG4gIC8vIFNlc3Npb25Eb2N1bWVudFZpZXdzLiBXZSB1c2UgdGhpcyBzdWJzY3JpcHRpb25IYW5kbGUgZm9yIHRoYXQuXG4gIGlmIChzZWxmLl9zdWJzY3JpcHRpb25JZCkge1xuICAgIHNlbGYuX3N1YnNjcmlwdGlvbkhhbmRsZSA9ICdOJyArIHNlbGYuX3N1YnNjcmlwdGlvbklkO1xuICB9IGVsc2Uge1xuICAgIHNlbGYuX3N1YnNjcmlwdGlvbkhhbmRsZSA9ICdVJyArIFJhbmRvbS5pZCgpO1xuICB9XG5cbiAgLy8gSGFzIF9kZWFjdGl2YXRlIGJlZW4gY2FsbGVkP1xuICBzZWxmLl9kZWFjdGl2YXRlZCA9IGZhbHNlO1xuXG4gIC8vIFN0b3AgY2FsbGJhY2tzIHRvIGcvYyB0aGlzIHN1Yi4gIGNhbGxlZCB3LyB6ZXJvIGFyZ3VtZW50cy5cbiAgc2VsZi5fc3RvcENhbGxiYWNrcyA9IFtdO1xuXG4gIC8vIFRoZSBzZXQgb2YgKGNvbGxlY3Rpb24sIGRvY3VtZW50aWQpIHRoYXQgdGhpcyBzdWJzY3JpcHRpb24gaGFzXG4gIC8vIGFuIG9waW5pb24gYWJvdXQuXG4gIHNlbGYuX2RvY3VtZW50cyA9IG5ldyBNYXAoKTtcblxuICAvLyBSZW1lbWJlciBpZiB3ZSBhcmUgcmVhZHkuXG4gIHNlbGYuX3JlYWR5ID0gZmFsc2U7XG5cbiAgLy8gUGFydCBvZiB0aGUgcHVibGljIEFQSTogdGhlIHVzZXIgb2YgdGhpcyBzdWIuXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IEFjY2VzcyBpbnNpZGUgdGhlIHB1Ymxpc2ggZnVuY3Rpb24uIFRoZSBpZCBvZiB0aGUgbG9nZ2VkLWluIHVzZXIsIG9yIGBudWxsYCBpZiBubyB1c2VyIGlzIGxvZ2dlZCBpbi5cbiAgICogQGxvY3VzIFNlcnZlclxuICAgKiBAbWVtYmVyT2YgU3Vic2NyaXB0aW9uXG4gICAqIEBuYW1lICB1c2VySWRcbiAgICogQGluc3RhbmNlXG4gICAqL1xuICBzZWxmLnVzZXJJZCA9IHNlc3Npb24udXNlcklkO1xuXG4gIC8vIEZvciBub3csIHRoZSBpZCBmaWx0ZXIgaXMgZ29pbmcgdG8gZGVmYXVsdCB0b1xuICAvLyB0aGUgdG8vZnJvbSBERFAgbWV0aG9kcyBvbiBNb25nb0lELCB0b1xuICAvLyBzcGVjaWZpY2FsbHkgZGVhbCB3aXRoIG1vbmdvL21pbmltb25nbyBPYmplY3RJZHMuXG5cbiAgLy8gTGF0ZXIsIHlvdSB3aWxsIGJlIGFibGUgdG8gbWFrZSB0aGlzIGJlIFwicmF3XCJcbiAgLy8gaWYgeW91IHdhbnQgdG8gcHVibGlzaCBhIGNvbGxlY3Rpb24gdGhhdCB5b3Uga25vd1xuICAvLyBqdXN0IGhhcyBzdHJpbmdzIGZvciBrZXlzIGFuZCBubyBmdW5ueSBidXNpbmVzcywgdG9cbiAgLy8gYSBERFAgY29uc3VtZXIgdGhhdCBpc24ndCBtaW5pbW9uZ28uXG5cbiAgc2VsZi5faWRGaWx0ZXIgPSB7XG4gICAgaWRTdHJpbmdpZnk6IE1vbmdvSUQuaWRTdHJpbmdpZnksXG4gICAgaWRQYXJzZTogTW9uZ29JRC5pZFBhcnNlXG4gIH07XG5cbiAgUGFja2FnZVsnZmFjdHMtYmFzZSddICYmIFBhY2thZ2VbJ2ZhY3RzLWJhc2UnXS5GYWN0cy5pbmNyZW1lbnRTZXJ2ZXJGYWN0KFxuICAgIFwibGl2ZWRhdGFcIiwgXCJzdWJzY3JpcHRpb25zXCIsIDEpO1xufTtcblxuT2JqZWN0LmFzc2lnbihTdWJzY3JpcHRpb24ucHJvdG90eXBlLCB7XG4gIF9ydW5IYW5kbGVyOiBmdW5jdGlvbigpIHtcbiAgICAvLyBYWFggc2hvdWxkIHdlIHVuYmxvY2soKSBoZXJlPyBFaXRoZXIgYmVmb3JlIHJ1bm5pbmcgdGhlIHB1Ymxpc2hcbiAgICAvLyBmdW5jdGlvbiwgb3IgYmVmb3JlIHJ1bm5pbmcgX3B1Ymxpc2hDdXJzb3IuXG4gICAgLy9cbiAgICAvLyBSaWdodCBub3csIGVhY2ggcHVibGlzaCBmdW5jdGlvbiBibG9ja3MgYWxsIGZ1dHVyZSBwdWJsaXNoZXMgYW5kXG4gICAgLy8gbWV0aG9kcyB3YWl0aW5nIG9uIGRhdGEgZnJvbSBNb25nbyAob3Igd2hhdGV2ZXIgZWxzZSB0aGUgZnVuY3Rpb25cbiAgICAvLyBibG9ja3Mgb24pLiBUaGlzIHByb2JhYmx5IHNsb3dzIHBhZ2UgbG9hZCBpbiBjb21tb24gY2FzZXMuXG5cbiAgICBpZiAoIXRoaXMudW5ibG9jaykge1xuICAgICAgdGhpcy51bmJsb2NrID0gKCkgPT4ge307XG4gICAgfVxuXG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgbGV0IHJlc3VsdE9yVGhlbmFibGUgPSBudWxsO1xuICAgIHRyeSB7XG4gICAgICByZXN1bHRPclRoZW5hYmxlID0gRERQLl9DdXJyZW50UHVibGljYXRpb25JbnZvY2F0aW9uLndpdGhWYWx1ZShzZWxmLCAoKSA9PlxuICAgICAgICBtYXliZUF1ZGl0QXJndW1lbnRDaGVja3MoXG4gICAgICAgICAgc2VsZi5faGFuZGxlcixcbiAgICAgICAgICBzZWxmLFxuICAgICAgICAgIEVKU09OLmNsb25lKHNlbGYuX3BhcmFtcyksXG4gICAgICAgICAgLy8gSXQncyBPSyB0aGF0IHRoaXMgd291bGQgbG9vayB3ZWlyZCBmb3IgdW5pdmVyc2FsIHN1YnNjcmlwdGlvbnMsXG4gICAgICAgICAgLy8gYmVjYXVzZSB0aGV5IGhhdmUgbm8gYXJndW1lbnRzIHNvIHRoZXJlIGNhbiBuZXZlciBiZSBhblxuICAgICAgICAgIC8vIGF1ZGl0LWFyZ3VtZW50LWNoZWNrcyBmYWlsdXJlLlxuICAgICAgICAgIFwicHVibGlzaGVyICdcIiArIHNlbGYuX25hbWUgKyBcIidcIlxuICAgICAgICApXG4gICAgICApO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHNlbGYuZXJyb3IoZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gRGlkIHRoZSBoYW5kbGVyIGNhbGwgdGhpcy5lcnJvciBvciB0aGlzLnN0b3A/XG4gICAgaWYgKHNlbGYuX2lzRGVhY3RpdmF0ZWQoKSkgcmV0dXJuO1xuXG4gICAgLy8gQm90aCBjb252ZW50aW9uYWwgYW5kIGFzeW5jIHB1Ymxpc2ggaGFuZGxlciBmdW5jdGlvbnMgYXJlIHN1cHBvcnRlZC5cbiAgICAvLyBJZiBhbiBvYmplY3QgaXMgcmV0dXJuZWQgd2l0aCBhIHRoZW4oKSBmdW5jdGlvbiwgaXQgaXMgZWl0aGVyIGEgcHJvbWlzZVxuICAgIC8vIG9yIHRoZW5hYmxlIGFuZCB3aWxsIGJlIHJlc29sdmVkIGFzeW5jaHJvbm91c2x5LlxuICAgIGNvbnN0IGlzVGhlbmFibGUgPVxuICAgICAgcmVzdWx0T3JUaGVuYWJsZSAmJiB0eXBlb2YgcmVzdWx0T3JUaGVuYWJsZS50aGVuID09PSAnZnVuY3Rpb24nO1xuICAgIGlmIChpc1RoZW5hYmxlKSB7XG4gICAgICBQcm9taXNlLnJlc29sdmUocmVzdWx0T3JUaGVuYWJsZSkudGhlbihcbiAgICAgICAgKC4uLmFyZ3MpID0+IHNlbGYuX3B1Ymxpc2hIYW5kbGVyUmVzdWx0LmJpbmQoc2VsZikoLi4uYXJncyksXG4gICAgICAgIGUgPT4gc2VsZi5lcnJvcihlKVxuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2VsZi5fcHVibGlzaEhhbmRsZXJSZXN1bHQocmVzdWx0T3JUaGVuYWJsZSk7XG4gICAgfVxuICB9LFxuXG4gIF9wdWJsaXNoSGFuZGxlclJlc3VsdDogZnVuY3Rpb24gKHJlcykge1xuICAgIC8vIFNQRUNJQUwgQ0FTRTogSW5zdGVhZCBvZiB3cml0aW5nIHRoZWlyIG93biBjYWxsYmFja3MgdGhhdCBpbnZva2VcbiAgICAvLyB0aGlzLmFkZGVkL2NoYW5nZWQvcmVhZHkvZXRjLCB0aGUgdXNlciBjYW4ganVzdCByZXR1cm4gYSBjb2xsZWN0aW9uXG4gICAgLy8gY3Vyc29yIG9yIGFycmF5IG9mIGN1cnNvcnMgZnJvbSB0aGUgcHVibGlzaCBmdW5jdGlvbjsgd2UgY2FsbCB0aGVpclxuICAgIC8vIF9wdWJsaXNoQ3Vyc29yIG1ldGhvZCB3aGljaCBzdGFydHMgb2JzZXJ2aW5nIHRoZSBjdXJzb3IgYW5kIHB1Ymxpc2hlcyB0aGVcbiAgICAvLyByZXN1bHRzLiBOb3RlIHRoYXQgX3B1Ymxpc2hDdXJzb3IgZG9lcyBOT1QgY2FsbCByZWFkeSgpLlxuICAgIC8vXG4gICAgLy8gWFhYIFRoaXMgdXNlcyBhbiB1bmRvY3VtZW50ZWQgaW50ZXJmYWNlIHdoaWNoIG9ubHkgdGhlIE1vbmdvIGN1cnNvclxuICAgIC8vIGludGVyZmFjZSBwdWJsaXNoZXMuIFNob3VsZCB3ZSBtYWtlIHRoaXMgaW50ZXJmYWNlIHB1YmxpYyBhbmQgZW5jb3VyYWdlXG4gICAgLy8gdXNlcnMgdG8gaW1wbGVtZW50IGl0IHRoZW1zZWx2ZXM/IEFyZ3VhYmx5LCBpdCdzIHVubmVjZXNzYXJ5OyB1c2VycyBjYW5cbiAgICAvLyBhbHJlYWR5IHdyaXRlIHRoZWlyIG93biBmdW5jdGlvbnMgbGlrZVxuICAgIC8vICAgdmFyIHB1Ymxpc2hNeVJlYWN0aXZlVGhpbmd5ID0gZnVuY3Rpb24gKG5hbWUsIGhhbmRsZXIpIHtcbiAgICAvLyAgICAgTWV0ZW9yLnB1Ymxpc2gobmFtZSwgZnVuY3Rpb24gKCkge1xuICAgIC8vICAgICAgIHZhciByZWFjdGl2ZVRoaW5neSA9IGhhbmRsZXIoKTtcbiAgICAvLyAgICAgICByZWFjdGl2ZVRoaW5neS5wdWJsaXNoTWUoKTtcbiAgICAvLyAgICAgfSk7XG4gICAgLy8gICB9O1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBpc0N1cnNvciA9IGZ1bmN0aW9uIChjKSB7XG4gICAgICByZXR1cm4gYyAmJiBjLl9wdWJsaXNoQ3Vyc29yO1xuICAgIH07XG4gICAgaWYgKGlzQ3Vyc29yKHJlcykpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJlcy5fcHVibGlzaEN1cnNvcihzZWxmKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgc2VsZi5lcnJvcihlKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgLy8gX3B1Ymxpc2hDdXJzb3Igb25seSByZXR1cm5zIGFmdGVyIHRoZSBpbml0aWFsIGFkZGVkIGNhbGxiYWNrcyBoYXZlIHJ1bi5cbiAgICAgIC8vIG1hcmsgc3Vic2NyaXB0aW9uIGFzIHJlYWR5LlxuICAgICAgc2VsZi5yZWFkeSgpO1xuICAgIH0gZWxzZSBpZiAoXy5pc0FycmF5KHJlcykpIHtcbiAgICAgIC8vIENoZWNrIGFsbCB0aGUgZWxlbWVudHMgYXJlIGN1cnNvcnNcbiAgICAgIGlmICghIF8uYWxsKHJlcywgaXNDdXJzb3IpKSB7XG4gICAgICAgIHNlbGYuZXJyb3IobmV3IEVycm9yKFwiUHVibGlzaCBmdW5jdGlvbiByZXR1cm5lZCBhbiBhcnJheSBvZiBub24tQ3Vyc29yc1wiKSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIC8vIEZpbmQgZHVwbGljYXRlIGNvbGxlY3Rpb24gbmFtZXNcbiAgICAgIC8vIFhYWCB3ZSBzaG91bGQgc3VwcG9ydCBvdmVybGFwcGluZyBjdXJzb3JzLCBidXQgdGhhdCB3b3VsZCByZXF1aXJlIHRoZVxuICAgICAgLy8gbWVyZ2UgYm94IHRvIGFsbG93IG92ZXJsYXAgd2l0aGluIGEgc3Vic2NyaXB0aW9uXG4gICAgICB2YXIgY29sbGVjdGlvbk5hbWVzID0ge307XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJlcy5sZW5ndGg7ICsraSkge1xuICAgICAgICB2YXIgY29sbGVjdGlvbk5hbWUgPSByZXNbaV0uX2dldENvbGxlY3Rpb25OYW1lKCk7XG4gICAgICAgIGlmIChfLmhhcyhjb2xsZWN0aW9uTmFtZXMsIGNvbGxlY3Rpb25OYW1lKSkge1xuICAgICAgICAgIHNlbGYuZXJyb3IobmV3IEVycm9yKFxuICAgICAgICAgICAgXCJQdWJsaXNoIGZ1bmN0aW9uIHJldHVybmVkIG11bHRpcGxlIGN1cnNvcnMgZm9yIGNvbGxlY3Rpb24gXCIgK1xuICAgICAgICAgICAgICBjb2xsZWN0aW9uTmFtZSkpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb2xsZWN0aW9uTmFtZXNbY29sbGVjdGlvbk5hbWVdID0gdHJ1ZTtcbiAgICAgIH07XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIF8uZWFjaChyZXMsIGZ1bmN0aW9uIChjdXIpIHtcbiAgICAgICAgICBjdXIuX3B1Ymxpc2hDdXJzb3Ioc2VsZik7XG4gICAgICAgIH0pO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBzZWxmLmVycm9yKGUpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBzZWxmLnJlYWR5KCk7XG4gICAgfSBlbHNlIGlmIChyZXMpIHtcbiAgICAgIC8vIFRydXRoeSB2YWx1ZXMgb3RoZXIgdGhhbiBjdXJzb3JzIG9yIGFycmF5cyBhcmUgcHJvYmFibHkgYVxuICAgICAgLy8gdXNlciBtaXN0YWtlIChwb3NzaWJsZSByZXR1cm5pbmcgYSBNb25nbyBkb2N1bWVudCB2aWEsIHNheSxcbiAgICAgIC8vIGBjb2xsLmZpbmRPbmUoKWApLlxuICAgICAgc2VsZi5lcnJvcihuZXcgRXJyb3IoXCJQdWJsaXNoIGZ1bmN0aW9uIGNhbiBvbmx5IHJldHVybiBhIEN1cnNvciBvciBcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgKyBcImFuIGFycmF5IG9mIEN1cnNvcnNcIikpO1xuICAgIH1cbiAgfSxcblxuICAvLyBUaGlzIGNhbGxzIGFsbCBzdG9wIGNhbGxiYWNrcyBhbmQgcHJldmVudHMgdGhlIGhhbmRsZXIgZnJvbSB1cGRhdGluZyBhbnlcbiAgLy8gU2Vzc2lvbkNvbGxlY3Rpb25WaWV3cyBmdXJ0aGVyLiBJdCdzIHVzZWQgd2hlbiB0aGUgdXNlciB1bnN1YnNjcmliZXMgb3JcbiAgLy8gZGlzY29ubmVjdHMsIGFzIHdlbGwgYXMgZHVyaW5nIHNldFVzZXJJZCByZS1ydW5zLiBJdCBkb2VzICpOT1QqIHNlbmRcbiAgLy8gcmVtb3ZlZCBtZXNzYWdlcyBmb3IgdGhlIHB1Ymxpc2hlZCBvYmplY3RzOyBpZiB0aGF0IGlzIG5lY2Vzc2FyeSwgY2FsbFxuICAvLyBfcmVtb3ZlQWxsRG9jdW1lbnRzIGZpcnN0LlxuICBfZGVhY3RpdmF0ZTogZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl9kZWFjdGl2YXRlZClcbiAgICAgIHJldHVybjtcbiAgICBzZWxmLl9kZWFjdGl2YXRlZCA9IHRydWU7XG4gICAgc2VsZi5fY2FsbFN0b3BDYWxsYmFja3MoKTtcbiAgICBQYWNrYWdlWydmYWN0cy1iYXNlJ10gJiYgUGFja2FnZVsnZmFjdHMtYmFzZSddLkZhY3RzLmluY3JlbWVudFNlcnZlckZhY3QoXG4gICAgICBcImxpdmVkYXRhXCIsIFwic3Vic2NyaXB0aW9uc1wiLCAtMSk7XG4gIH0sXG5cbiAgX2NhbGxTdG9wQ2FsbGJhY2tzOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIC8vIFRlbGwgbGlzdGVuZXJzLCBzbyB0aGV5IGNhbiBjbGVhbiB1cFxuICAgIHZhciBjYWxsYmFja3MgPSBzZWxmLl9zdG9wQ2FsbGJhY2tzO1xuICAgIHNlbGYuX3N0b3BDYWxsYmFja3MgPSBbXTtcbiAgICBfLmVhY2goY2FsbGJhY2tzLCBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICAgIGNhbGxiYWNrKCk7XG4gICAgfSk7XG4gIH0sXG5cbiAgLy8gU2VuZCByZW1vdmUgbWVzc2FnZXMgZm9yIGV2ZXJ5IGRvY3VtZW50LlxuICBfcmVtb3ZlQWxsRG9jdW1lbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKGZ1bmN0aW9uICgpIHtcbiAgICAgIHNlbGYuX2RvY3VtZW50cy5mb3JFYWNoKGZ1bmN0aW9uIChjb2xsZWN0aW9uRG9jcywgY29sbGVjdGlvbk5hbWUpIHtcbiAgICAgICAgY29sbGVjdGlvbkRvY3MuZm9yRWFjaChmdW5jdGlvbiAoc3RySWQpIHtcbiAgICAgICAgICBzZWxmLnJlbW92ZWQoY29sbGVjdGlvbk5hbWUsIHNlbGYuX2lkRmlsdGVyLmlkUGFyc2Uoc3RySWQpKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSxcblxuICAvLyBSZXR1cm5zIGEgbmV3IFN1YnNjcmlwdGlvbiBmb3IgdGhlIHNhbWUgc2Vzc2lvbiB3aXRoIHRoZSBzYW1lXG4gIC8vIGluaXRpYWwgY3JlYXRpb24gcGFyYW1ldGVycy4gVGhpcyBpc24ndCBhIGNsb25lOiBpdCBkb2Vzbid0IGhhdmVcbiAgLy8gdGhlIHNhbWUgX2RvY3VtZW50cyBjYWNoZSwgc3RvcHBlZCBzdGF0ZSBvciBjYWxsYmFja3M7IG1heSBoYXZlIGFcbiAgLy8gZGlmZmVyZW50IF9zdWJzY3JpcHRpb25IYW5kbGUsIGFuZCBnZXRzIGl0cyB1c2VySWQgZnJvbSB0aGVcbiAgLy8gc2Vzc2lvbiwgbm90IGZyb20gdGhpcyBvYmplY3QuXG4gIF9yZWNyZWF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4gbmV3IFN1YnNjcmlwdGlvbihcbiAgICAgIHNlbGYuX3Nlc3Npb24sIHNlbGYuX2hhbmRsZXIsIHNlbGYuX3N1YnNjcmlwdGlvbklkLCBzZWxmLl9wYXJhbXMsXG4gICAgICBzZWxmLl9uYW1lKTtcbiAgfSxcblxuICAvKipcbiAgICogQHN1bW1hcnkgQ2FsbCBpbnNpZGUgdGhlIHB1Ymxpc2ggZnVuY3Rpb24uICBTdG9wcyB0aGlzIGNsaWVudCdzIHN1YnNjcmlwdGlvbiwgdHJpZ2dlcmluZyBhIGNhbGwgb24gdGhlIGNsaWVudCB0byB0aGUgYG9uU3RvcGAgY2FsbGJhY2sgcGFzc2VkIHRvIFtgTWV0ZW9yLnN1YnNjcmliZWBdKCNtZXRlb3Jfc3Vic2NyaWJlKSwgaWYgYW55LiBJZiBgZXJyb3JgIGlzIG5vdCBhIFtgTWV0ZW9yLkVycm9yYF0oI21ldGVvcl9lcnJvciksIGl0IHdpbGwgYmUgW3Nhbml0aXplZF0oI21ldGVvcl9lcnJvcikuXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQHBhcmFtIHtFcnJvcn0gZXJyb3IgVGhlIGVycm9yIHRvIHBhc3MgdG8gdGhlIGNsaWVudC5cbiAgICogQGluc3RhbmNlXG4gICAqIEBtZW1iZXJPZiBTdWJzY3JpcHRpb25cbiAgICovXG4gIGVycm9yOiBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKHNlbGYuX2lzRGVhY3RpdmF0ZWQoKSlcbiAgICAgIHJldHVybjtcbiAgICBzZWxmLl9zZXNzaW9uLl9zdG9wU3Vic2NyaXB0aW9uKHNlbGYuX3N1YnNjcmlwdGlvbklkLCBlcnJvcik7XG4gIH0sXG5cbiAgLy8gTm90ZSB0aGF0IHdoaWxlIG91ciBERFAgY2xpZW50IHdpbGwgbm90aWNlIHRoYXQgeW91J3ZlIGNhbGxlZCBzdG9wKCkgb24gdGhlXG4gIC8vIHNlcnZlciAoYW5kIGNsZWFuIHVwIGl0cyBfc3Vic2NyaXB0aW9ucyB0YWJsZSkgd2UgZG9uJ3QgYWN0dWFsbHkgcHJvdmlkZSBhXG4gIC8vIG1lY2hhbmlzbSBmb3IgYW4gYXBwIHRvIG5vdGljZSB0aGlzICh0aGUgc3Vic2NyaWJlIG9uRXJyb3IgY2FsbGJhY2sgb25seVxuICAvLyB0cmlnZ2VycyBpZiB0aGVyZSBpcyBhbiBlcnJvcikuXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IENhbGwgaW5zaWRlIHRoZSBwdWJsaXNoIGZ1bmN0aW9uLiAgU3RvcHMgdGhpcyBjbGllbnQncyBzdWJzY3JpcHRpb24gYW5kIGludm9rZXMgdGhlIGNsaWVudCdzIGBvblN0b3BgIGNhbGxiYWNrIHdpdGggbm8gZXJyb3IuXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQGluc3RhbmNlXG4gICAqIEBtZW1iZXJPZiBTdWJzY3JpcHRpb25cbiAgICovXG4gIHN0b3A6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKHNlbGYuX2lzRGVhY3RpdmF0ZWQoKSlcbiAgICAgIHJldHVybjtcbiAgICBzZWxmLl9zZXNzaW9uLl9zdG9wU3Vic2NyaXB0aW9uKHNlbGYuX3N1YnNjcmlwdGlvbklkKTtcbiAgfSxcblxuICAvKipcbiAgICogQHN1bW1hcnkgQ2FsbCBpbnNpZGUgdGhlIHB1Ymxpc2ggZnVuY3Rpb24uICBSZWdpc3RlcnMgYSBjYWxsYmFjayBmdW5jdGlvbiB0byBydW4gd2hlbiB0aGUgc3Vic2NyaXB0aW9uIGlzIHN0b3BwZWQuXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQG1lbWJlck9mIFN1YnNjcmlwdGlvblxuICAgKiBAaW5zdGFuY2VcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICovXG4gIG9uU3RvcDogZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGNhbGxiYWNrID0gTWV0ZW9yLmJpbmRFbnZpcm9ubWVudChjYWxsYmFjaywgJ29uU3RvcCBjYWxsYmFjaycsIHNlbGYpO1xuICAgIGlmIChzZWxmLl9pc0RlYWN0aXZhdGVkKCkpXG4gICAgICBjYWxsYmFjaygpO1xuICAgIGVsc2VcbiAgICAgIHNlbGYuX3N0b3BDYWxsYmFja3MucHVzaChjYWxsYmFjayk7XG4gIH0sXG5cbiAgLy8gVGhpcyByZXR1cm5zIHRydWUgaWYgdGhlIHN1YiBoYXMgYmVlbiBkZWFjdGl2YXRlZCwgKk9SKiBpZiB0aGUgc2Vzc2lvbiB3YXNcbiAgLy8gZGVzdHJveWVkIGJ1dCB0aGUgZGVmZXJyZWQgY2FsbCB0byBfZGVhY3RpdmF0ZUFsbFN1YnNjcmlwdGlvbnMgaGFzbid0XG4gIC8vIGhhcHBlbmVkIHlldC5cbiAgX2lzRGVhY3RpdmF0ZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIHNlbGYuX2RlYWN0aXZhdGVkIHx8IHNlbGYuX3Nlc3Npb24uaW5RdWV1ZSA9PT0gbnVsbDtcbiAgfSxcblxuICAvKipcbiAgICogQHN1bW1hcnkgQ2FsbCBpbnNpZGUgdGhlIHB1Ymxpc2ggZnVuY3Rpb24uICBJbmZvcm1zIHRoZSBzdWJzY3JpYmVyIHRoYXQgYSBkb2N1bWVudCBoYXMgYmVlbiBhZGRlZCB0byB0aGUgcmVjb3JkIHNldC5cbiAgICogQGxvY3VzIFNlcnZlclxuICAgKiBAbWVtYmVyT2YgU3Vic2NyaXB0aW9uXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gY29sbGVjdGlvbiBUaGUgbmFtZSBvZiB0aGUgY29sbGVjdGlvbiB0aGF0IGNvbnRhaW5zIHRoZSBuZXcgZG9jdW1lbnQuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBpZCBUaGUgbmV3IGRvY3VtZW50J3MgSUQuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBmaWVsZHMgVGhlIGZpZWxkcyBpbiB0aGUgbmV3IGRvY3VtZW50LiAgSWYgYF9pZGAgaXMgcHJlc2VudCBpdCBpcyBpZ25vcmVkLlxuICAgKi9cbiAgYWRkZWQgKGNvbGxlY3Rpb25OYW1lLCBpZCwgZmllbGRzKSB7XG4gICAgaWYgKHRoaXMuX2lzRGVhY3RpdmF0ZWQoKSlcbiAgICAgIHJldHVybjtcbiAgICBpZCA9IHRoaXMuX2lkRmlsdGVyLmlkU3RyaW5naWZ5KGlkKTtcblxuICAgIGlmICh0aGlzLl9zZXNzaW9uLnNlcnZlci5nZXRQdWJsaWNhdGlvblN0cmF0ZWd5KGNvbGxlY3Rpb25OYW1lKS5kb0FjY291bnRpbmdGb3JDb2xsZWN0aW9uKSB7XG4gICAgICBsZXQgaWRzID0gdGhpcy5fZG9jdW1lbnRzLmdldChjb2xsZWN0aW9uTmFtZSk7XG4gICAgICBpZiAoaWRzID09IG51bGwpIHtcbiAgICAgICAgaWRzID0gbmV3IFNldCgpO1xuICAgICAgICB0aGlzLl9kb2N1bWVudHMuc2V0KGNvbGxlY3Rpb25OYW1lLCBpZHMpO1xuICAgICAgfVxuICAgICAgaWRzLmFkZChpZCk7XG4gICAgfVxuXG4gICAgdGhpcy5fc2Vzc2lvbi5hZGRlZCh0aGlzLl9zdWJzY3JpcHRpb25IYW5kbGUsIGNvbGxlY3Rpb25OYW1lLCBpZCwgZmllbGRzKTtcbiAgfSxcblxuICAvKipcbiAgICogQHN1bW1hcnkgQ2FsbCBpbnNpZGUgdGhlIHB1Ymxpc2ggZnVuY3Rpb24uICBJbmZvcm1zIHRoZSBzdWJzY3JpYmVyIHRoYXQgYSBkb2N1bWVudCBpbiB0aGUgcmVjb3JkIHNldCBoYXMgYmVlbiBtb2RpZmllZC5cbiAgICogQGxvY3VzIFNlcnZlclxuICAgKiBAbWVtYmVyT2YgU3Vic2NyaXB0aW9uXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gY29sbGVjdGlvbiBUaGUgbmFtZSBvZiB0aGUgY29sbGVjdGlvbiB0aGF0IGNvbnRhaW5zIHRoZSBjaGFuZ2VkIGRvY3VtZW50LlxuICAgKiBAcGFyYW0ge1N0cmluZ30gaWQgVGhlIGNoYW5nZWQgZG9jdW1lbnQncyBJRC5cbiAgICogQHBhcmFtIHtPYmplY3R9IGZpZWxkcyBUaGUgZmllbGRzIGluIHRoZSBkb2N1bWVudCB0aGF0IGhhdmUgY2hhbmdlZCwgdG9nZXRoZXIgd2l0aCB0aGVpciBuZXcgdmFsdWVzLiAgSWYgYSBmaWVsZCBpcyBub3QgcHJlc2VudCBpbiBgZmllbGRzYCBpdCB3YXMgbGVmdCB1bmNoYW5nZWQ7IGlmIGl0IGlzIHByZXNlbnQgaW4gYGZpZWxkc2AgYW5kIGhhcyBhIHZhbHVlIG9mIGB1bmRlZmluZWRgIGl0IHdhcyByZW1vdmVkIGZyb20gdGhlIGRvY3VtZW50LiAgSWYgYF9pZGAgaXMgcHJlc2VudCBpdCBpcyBpZ25vcmVkLlxuICAgKi9cbiAgY2hhbmdlZCAoY29sbGVjdGlvbk5hbWUsIGlkLCBmaWVsZHMpIHtcbiAgICBpZiAodGhpcy5faXNEZWFjdGl2YXRlZCgpKVxuICAgICAgcmV0dXJuO1xuICAgIGlkID0gdGhpcy5faWRGaWx0ZXIuaWRTdHJpbmdpZnkoaWQpO1xuICAgIHRoaXMuX3Nlc3Npb24uY2hhbmdlZCh0aGlzLl9zdWJzY3JpcHRpb25IYW5kbGUsIGNvbGxlY3Rpb25OYW1lLCBpZCwgZmllbGRzKTtcbiAgfSxcblxuICAvKipcbiAgICogQHN1bW1hcnkgQ2FsbCBpbnNpZGUgdGhlIHB1Ymxpc2ggZnVuY3Rpb24uICBJbmZvcm1zIHRoZSBzdWJzY3JpYmVyIHRoYXQgYSBkb2N1bWVudCBoYXMgYmVlbiByZW1vdmVkIGZyb20gdGhlIHJlY29yZCBzZXQuXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQG1lbWJlck9mIFN1YnNjcmlwdGlvblxuICAgKiBAaW5zdGFuY2VcbiAgICogQHBhcmFtIHtTdHJpbmd9IGNvbGxlY3Rpb24gVGhlIG5hbWUgb2YgdGhlIGNvbGxlY3Rpb24gdGhhdCB0aGUgZG9jdW1lbnQgaGFzIGJlZW4gcmVtb3ZlZCBmcm9tLlxuICAgKiBAcGFyYW0ge1N0cmluZ30gaWQgVGhlIElEIG9mIHRoZSBkb2N1bWVudCB0aGF0IGhhcyBiZWVuIHJlbW92ZWQuXG4gICAqL1xuICByZW1vdmVkIChjb2xsZWN0aW9uTmFtZSwgaWQpIHtcbiAgICBpZiAodGhpcy5faXNEZWFjdGl2YXRlZCgpKVxuICAgICAgcmV0dXJuO1xuICAgIGlkID0gdGhpcy5faWRGaWx0ZXIuaWRTdHJpbmdpZnkoaWQpO1xuXG4gICAgaWYgKHRoaXMuX3Nlc3Npb24uc2VydmVyLmdldFB1YmxpY2F0aW9uU3RyYXRlZ3koY29sbGVjdGlvbk5hbWUpLmRvQWNjb3VudGluZ0ZvckNvbGxlY3Rpb24pIHtcbiAgICAgIC8vIFdlIGRvbid0IGJvdGhlciB0byBkZWxldGUgc2V0cyBvZiB0aGluZ3MgaW4gYSBjb2xsZWN0aW9uIGlmIHRoZVxuICAgICAgLy8gY29sbGVjdGlvbiBpcyBlbXB0eS4gIEl0IGNvdWxkIGJyZWFrIF9yZW1vdmVBbGxEb2N1bWVudHMuXG4gICAgICB0aGlzLl9kb2N1bWVudHMuZ2V0KGNvbGxlY3Rpb25OYW1lKS5kZWxldGUoaWQpO1xuICAgIH1cblxuICAgIHRoaXMuX3Nlc3Npb24ucmVtb3ZlZCh0aGlzLl9zdWJzY3JpcHRpb25IYW5kbGUsIGNvbGxlY3Rpb25OYW1lLCBpZCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IENhbGwgaW5zaWRlIHRoZSBwdWJsaXNoIGZ1bmN0aW9uLiAgSW5mb3JtcyB0aGUgc3Vic2NyaWJlciB0aGF0IGFuIGluaXRpYWwsIGNvbXBsZXRlIHNuYXBzaG90IG9mIHRoZSByZWNvcmQgc2V0IGhhcyBiZWVuIHNlbnQuICBUaGlzIHdpbGwgdHJpZ2dlciBhIGNhbGwgb24gdGhlIGNsaWVudCB0byB0aGUgYG9uUmVhZHlgIGNhbGxiYWNrIHBhc3NlZCB0byAgW2BNZXRlb3Iuc3Vic2NyaWJlYF0oI21ldGVvcl9zdWJzY3JpYmUpLCBpZiBhbnkuXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQG1lbWJlck9mIFN1YnNjcmlwdGlvblxuICAgKiBAaW5zdGFuY2VcbiAgICovXG4gIHJlYWR5OiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl9pc0RlYWN0aXZhdGVkKCkpXG4gICAgICByZXR1cm47XG4gICAgaWYgKCFzZWxmLl9zdWJzY3JpcHRpb25JZClcbiAgICAgIHJldHVybjsgIC8vIFVubmVjZXNzYXJ5IGJ1dCBpZ25vcmVkIGZvciB1bml2ZXJzYWwgc3ViXG4gICAgaWYgKCFzZWxmLl9yZWFkeSkge1xuICAgICAgc2VsZi5fc2Vzc2lvbi5zZW5kUmVhZHkoW3NlbGYuX3N1YnNjcmlwdGlvbklkXSk7XG4gICAgICBzZWxmLl9yZWFkeSA9IHRydWU7XG4gICAgfVxuICB9XG59KTtcblxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cbi8qIFNlcnZlciAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICovXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5TZXJ2ZXIgPSBmdW5jdGlvbiAob3B0aW9ucyA9IHt9KSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICAvLyBUaGUgZGVmYXVsdCBoZWFydGJlYXQgaW50ZXJ2YWwgaXMgMzAgc2Vjb25kcyBvbiB0aGUgc2VydmVyIGFuZCAzNVxuICAvLyBzZWNvbmRzIG9uIHRoZSBjbGllbnQuICBTaW5jZSB0aGUgY2xpZW50IGRvZXNuJ3QgbmVlZCB0byBzZW5kIGFcbiAgLy8gcGluZyBhcyBsb25nIGFzIGl0IGlzIHJlY2VpdmluZyBwaW5ncywgdGhpcyBtZWFucyB0aGF0IHBpbmdzXG4gIC8vIG5vcm1hbGx5IGdvIGZyb20gdGhlIHNlcnZlciB0byB0aGUgY2xpZW50LlxuICAvL1xuICAvLyBOb3RlOiBUcm9wb3NwaGVyZSBkZXBlbmRzIG9uIHRoZSBhYmlsaXR5IHRvIG11dGF0ZVxuICAvLyBNZXRlb3Iuc2VydmVyLm9wdGlvbnMuaGVhcnRiZWF0VGltZW91dCEgVGhpcyBpcyBhIGhhY2ssIGJ1dCBpdCdzIGxpZmUuXG4gIHNlbGYub3B0aW9ucyA9IHtcbiAgICBoZWFydGJlYXRJbnRlcnZhbDogMTUwMDAsXG4gICAgaGVhcnRiZWF0VGltZW91dDogMTUwMDAsXG4gICAgLy8gRm9yIHRlc3RpbmcsIGFsbG93IHJlc3BvbmRpbmcgdG8gcGluZ3MgdG8gYmUgZGlzYWJsZWQuXG4gICAgcmVzcG9uZFRvUGluZ3M6IHRydWUsXG4gICAgZGVmYXVsdFB1YmxpY2F0aW9uU3RyYXRlZ3k6IHB1YmxpY2F0aW9uU3RyYXRlZ2llcy5TRVJWRVJfTUVSR0UsXG4gICAgLi4ub3B0aW9ucyxcbiAgfTtcblxuICAvLyBNYXAgb2YgY2FsbGJhY2tzIHRvIGNhbGwgd2hlbiBhIG5ldyBjb25uZWN0aW9uIGNvbWVzIGluIHRvIHRoZVxuICAvLyBzZXJ2ZXIgYW5kIGNvbXBsZXRlcyBERFAgdmVyc2lvbiBuZWdvdGlhdGlvbi4gVXNlIGFuIG9iamVjdCBpbnN0ZWFkXG4gIC8vIG9mIGFuIGFycmF5IHNvIHdlIGNhbiBzYWZlbHkgcmVtb3ZlIG9uZSBmcm9tIHRoZSBsaXN0IHdoaWxlXG4gIC8vIGl0ZXJhdGluZyBvdmVyIGl0LlxuICBzZWxmLm9uQ29ubmVjdGlvbkhvb2sgPSBuZXcgSG9vayh7XG4gICAgZGVidWdQcmludEV4Y2VwdGlvbnM6IFwib25Db25uZWN0aW9uIGNhbGxiYWNrXCJcbiAgfSk7XG5cbiAgLy8gTWFwIG9mIGNhbGxiYWNrcyB0byBjYWxsIHdoZW4gYSBuZXcgbWVzc2FnZSBjb21lcyBpbi5cbiAgc2VsZi5vbk1lc3NhZ2VIb29rID0gbmV3IEhvb2soe1xuICAgIGRlYnVnUHJpbnRFeGNlcHRpb25zOiBcIm9uTWVzc2FnZSBjYWxsYmFja1wiXG4gIH0pO1xuXG4gIHNlbGYucHVibGlzaF9oYW5kbGVycyA9IHt9O1xuICBzZWxmLnVuaXZlcnNhbF9wdWJsaXNoX2hhbmRsZXJzID0gW107XG5cbiAgc2VsZi5tZXRob2RfaGFuZGxlcnMgPSB7fTtcblxuICBzZWxmLl9wdWJsaWNhdGlvblN0cmF0ZWdpZXMgPSB7fTtcblxuICBzZWxmLnNlc3Npb25zID0gbmV3IE1hcCgpOyAvLyBtYXAgZnJvbSBpZCB0byBzZXNzaW9uXG5cbiAgc2VsZi5zdHJlYW1fc2VydmVyID0gbmV3IFN0cmVhbVNlcnZlcjtcblxuICBzZWxmLnN0cmVhbV9zZXJ2ZXIucmVnaXN0ZXIoZnVuY3Rpb24gKHNvY2tldCkge1xuICAgIC8vIHNvY2tldCBpbXBsZW1lbnRzIHRoZSBTb2NrSlNDb25uZWN0aW9uIGludGVyZmFjZVxuICAgIHNvY2tldC5fbWV0ZW9yU2Vzc2lvbiA9IG51bGw7XG5cbiAgICB2YXIgc2VuZEVycm9yID0gZnVuY3Rpb24gKHJlYXNvbiwgb2ZmZW5kaW5nTWVzc2FnZSkge1xuICAgICAgdmFyIG1zZyA9IHttc2c6ICdlcnJvcicsIHJlYXNvbjogcmVhc29ufTtcbiAgICAgIGlmIChvZmZlbmRpbmdNZXNzYWdlKVxuICAgICAgICBtc2cub2ZmZW5kaW5nTWVzc2FnZSA9IG9mZmVuZGluZ01lc3NhZ2U7XG4gICAgICBzb2NrZXQuc2VuZChERFBDb21tb24uc3RyaW5naWZ5RERQKG1zZykpO1xuICAgIH07XG5cbiAgICBzb2NrZXQub24oJ2RhdGEnLCBmdW5jdGlvbiAocmF3X21zZykge1xuICAgICAgaWYgKE1ldGVvci5fcHJpbnRSZWNlaXZlZEREUCkge1xuICAgICAgICBNZXRlb3IuX2RlYnVnKFwiUmVjZWl2ZWQgRERQXCIsIHJhd19tc2cpO1xuICAgICAgfVxuICAgICAgdHJ5IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICB2YXIgbXNnID0gRERQQ29tbW9uLnBhcnNlRERQKHJhd19tc2cpO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBzZW5kRXJyb3IoJ1BhcnNlIGVycm9yJyk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChtc2cgPT09IG51bGwgfHwgIW1zZy5tc2cpIHtcbiAgICAgICAgICBzZW5kRXJyb3IoJ0JhZCByZXF1ZXN0JywgbXNnKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobXNnLm1zZyA9PT0gJ2Nvbm5lY3QnKSB7XG4gICAgICAgICAgaWYgKHNvY2tldC5fbWV0ZW9yU2Vzc2lvbikge1xuICAgICAgICAgICAgc2VuZEVycm9yKFwiQWxyZWFkeSBjb25uZWN0ZWRcIiwgbXNnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgRmliZXIoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5faGFuZGxlQ29ubmVjdChzb2NrZXQsIG1zZyk7XG4gICAgICAgICAgfSkucnVuKCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFzb2NrZXQuX21ldGVvclNlc3Npb24pIHtcbiAgICAgICAgICBzZW5kRXJyb3IoJ011c3QgY29ubmVjdCBmaXJzdCcsIG1zZyk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHNvY2tldC5fbWV0ZW9yU2Vzc2lvbi5wcm9jZXNzTWVzc2FnZShtc2cpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvLyBYWFggcHJpbnQgc3RhY2sgbmljZWx5XG4gICAgICAgIE1ldGVvci5fZGVidWcoXCJJbnRlcm5hbCBleGNlcHRpb24gd2hpbGUgcHJvY2Vzc2luZyBtZXNzYWdlXCIsIG1zZywgZSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBzb2NrZXQub24oJ2Nsb3NlJywgZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKHNvY2tldC5fbWV0ZW9yU2Vzc2lvbikge1xuICAgICAgICBGaWJlcihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgc29ja2V0Ll9tZXRlb3JTZXNzaW9uLmNsb3NlKCk7XG4gICAgICAgIH0pLnJ1bigpO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcbn07XG5cbk9iamVjdC5hc3NpZ24oU2VydmVyLnByb3RvdHlwZSwge1xuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBSZWdpc3RlciBhIGNhbGxiYWNrIHRvIGJlIGNhbGxlZCB3aGVuIGEgbmV3IEREUCBjb25uZWN0aW9uIGlzIG1hZGUgdG8gdGhlIHNlcnZlci5cbiAgICogQGxvY3VzIFNlcnZlclxuICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayBUaGUgZnVuY3Rpb24gdG8gY2FsbCB3aGVuIGEgbmV3IEREUCBjb25uZWN0aW9uIGlzIGVzdGFibGlzaGVkLlxuICAgKiBAbWVtYmVyT2YgTWV0ZW9yXG4gICAqIEBpbXBvcnRGcm9tUGFja2FnZSBtZXRlb3JcbiAgICovXG4gIG9uQ29ubmVjdGlvbjogZnVuY3Rpb24gKGZuKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBzZWxmLm9uQ29ubmVjdGlvbkhvb2sucmVnaXN0ZXIoZm4pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBTZXQgcHVibGljYXRpb24gc3RyYXRlZ3kgZm9yIHRoZSBnaXZlbiBjb2xsZWN0aW9uLiBQdWJsaWNhdGlvbnMgc3RyYXRlZ2llcyBhcmUgYXZhaWxhYmxlIGZyb20gYEREUFNlcnZlci5wdWJsaWNhdGlvblN0cmF0ZWdpZXNgLiBZb3UgY2FsbCB0aGlzIG1ldGhvZCBmcm9tIGBNZXRlb3Iuc2VydmVyYCwgbGlrZSBgTWV0ZW9yLnNlcnZlci5zZXRQdWJsaWNhdGlvblN0cmF0ZWd5KClgXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQGFsaWFzIHNldFB1YmxpY2F0aW9uU3RyYXRlZ3lcbiAgICogQHBhcmFtIGNvbGxlY3Rpb25OYW1lIHtTdHJpbmd9XG4gICAqIEBwYXJhbSBzdHJhdGVneSB7e3VzZUNvbGxlY3Rpb25WaWV3OiBib29sZWFuLCBkb0FjY291bnRpbmdGb3JDb2xsZWN0aW9uOiBib29sZWFufX1cbiAgICogQG1lbWJlck9mIE1ldGVvci5zZXJ2ZXJcbiAgICogQGltcG9ydEZyb21QYWNrYWdlIG1ldGVvclxuICAgKi9cbiAgc2V0UHVibGljYXRpb25TdHJhdGVneShjb2xsZWN0aW9uTmFtZSwgc3RyYXRlZ3kpIHtcbiAgICBpZiAoIU9iamVjdC52YWx1ZXMocHVibGljYXRpb25TdHJhdGVnaWVzKS5pbmNsdWRlcyhzdHJhdGVneSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBtZXJnZSBzdHJhdGVneTogJHtzdHJhdGVneX0gXG4gICAgICAgIGZvciBjb2xsZWN0aW9uICR7Y29sbGVjdGlvbk5hbWV9YCk7XG4gICAgfVxuICAgIHRoaXMuX3B1YmxpY2F0aW9uU3RyYXRlZ2llc1tjb2xsZWN0aW9uTmFtZV0gPSBzdHJhdGVneTtcbiAgfSxcblxuICAvKipcbiAgICogQHN1bW1hcnkgR2V0cyB0aGUgcHVibGljYXRpb24gc3RyYXRlZ3kgZm9yIHRoZSByZXF1ZXN0ZWQgY29sbGVjdGlvbi4gWW91IGNhbGwgdGhpcyBtZXRob2QgZnJvbSBgTWV0ZW9yLnNlcnZlcmAsIGxpa2UgYE1ldGVvci5zZXJ2ZXIuZ2V0UHVibGljYXRpb25TdHJhdGVneSgpYFxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBhbGlhcyBnZXRQdWJsaWNhdGlvblN0cmF0ZWd5XG4gICAqIEBwYXJhbSBjb2xsZWN0aW9uTmFtZSB7U3RyaW5nfVxuICAgKiBAbWVtYmVyT2YgTWV0ZW9yLnNlcnZlclxuICAgKiBAaW1wb3J0RnJvbVBhY2thZ2UgbWV0ZW9yXG4gICAqIEByZXR1cm4ge3t1c2VDb2xsZWN0aW9uVmlldzogYm9vbGVhbiwgZG9BY2NvdW50aW5nRm9yQ29sbGVjdGlvbjogYm9vbGVhbn19XG4gICAqL1xuICBnZXRQdWJsaWNhdGlvblN0cmF0ZWd5KGNvbGxlY3Rpb25OYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMuX3B1YmxpY2F0aW9uU3RyYXRlZ2llc1tjb2xsZWN0aW9uTmFtZV1cbiAgICAgIHx8IHRoaXMub3B0aW9ucy5kZWZhdWx0UHVibGljYXRpb25TdHJhdGVneTtcbiAgfSxcblxuICAvKipcbiAgICogQHN1bW1hcnkgUmVnaXN0ZXIgYSBjYWxsYmFjayB0byBiZSBjYWxsZWQgd2hlbiBhIG5ldyBERFAgbWVzc2FnZSBpcyByZWNlaXZlZC5cbiAgICogQGxvY3VzIFNlcnZlclxuICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayBUaGUgZnVuY3Rpb24gdG8gY2FsbCB3aGVuIGEgbmV3IEREUCBtZXNzYWdlIGlzIHJlY2VpdmVkLlxuICAgKiBAbWVtYmVyT2YgTWV0ZW9yXG4gICAqIEBpbXBvcnRGcm9tUGFja2FnZSBtZXRlb3JcbiAgICovXG4gIG9uTWVzc2FnZTogZnVuY3Rpb24gKGZuKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBzZWxmLm9uTWVzc2FnZUhvb2sucmVnaXN0ZXIoZm4pO1xuICB9LFxuXG4gIF9oYW5kbGVDb25uZWN0OiBmdW5jdGlvbiAoc29ja2V0LCBtc2cpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAvLyBUaGUgY29ubmVjdCBtZXNzYWdlIG11c3Qgc3BlY2lmeSBhIHZlcnNpb24gYW5kIGFuIGFycmF5IG9mIHN1cHBvcnRlZFxuICAgIC8vIHZlcnNpb25zLCBhbmQgaXQgbXVzdCBjbGFpbSB0byBzdXBwb3J0IHdoYXQgaXQgaXMgcHJvcG9zaW5nLlxuICAgIGlmICghKHR5cGVvZiAobXNnLnZlcnNpb24pID09PSAnc3RyaW5nJyAmJlxuICAgICAgICAgIF8uaXNBcnJheShtc2cuc3VwcG9ydCkgJiZcbiAgICAgICAgICBfLmFsbChtc2cuc3VwcG9ydCwgXy5pc1N0cmluZykgJiZcbiAgICAgICAgICBfLmNvbnRhaW5zKG1zZy5zdXBwb3J0LCBtc2cudmVyc2lvbikpKSB7XG4gICAgICBzb2NrZXQuc2VuZChERFBDb21tb24uc3RyaW5naWZ5RERQKHttc2c6ICdmYWlsZWQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJzaW9uOiBERFBDb21tb24uU1VQUE9SVEVEX0REUF9WRVJTSU9OU1swXX0pKTtcbiAgICAgIHNvY2tldC5jbG9zZSgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIEluIHRoZSBmdXR1cmUsIGhhbmRsZSBzZXNzaW9uIHJlc3VtcHRpb246IHNvbWV0aGluZyBsaWtlOlxuICAgIC8vICBzb2NrZXQuX21ldGVvclNlc3Npb24gPSBzZWxmLnNlc3Npb25zW21zZy5zZXNzaW9uXVxuICAgIHZhciB2ZXJzaW9uID0gY2FsY3VsYXRlVmVyc2lvbihtc2cuc3VwcG9ydCwgRERQQ29tbW9uLlNVUFBPUlRFRF9ERFBfVkVSU0lPTlMpO1xuXG4gICAgaWYgKG1zZy52ZXJzaW9uICE9PSB2ZXJzaW9uKSB7XG4gICAgICAvLyBUaGUgYmVzdCB2ZXJzaW9uIHRvIHVzZSAoYWNjb3JkaW5nIHRvIHRoZSBjbGllbnQncyBzdGF0ZWQgcHJlZmVyZW5jZXMpXG4gICAgICAvLyBpcyBub3QgdGhlIG9uZSB0aGUgY2xpZW50IGlzIHRyeWluZyB0byB1c2UuIEluZm9ybSB0aGVtIGFib3V0IHRoZSBiZXN0XG4gICAgICAvLyB2ZXJzaW9uIHRvIHVzZS5cbiAgICAgIHNvY2tldC5zZW5kKEREUENvbW1vbi5zdHJpbmdpZnlERFAoe21zZzogJ2ZhaWxlZCcsIHZlcnNpb246IHZlcnNpb259KSk7XG4gICAgICBzb2NrZXQuY2xvc2UoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBZYXksIHZlcnNpb24gbWF0Y2hlcyEgQ3JlYXRlIGEgbmV3IHNlc3Npb24uXG4gICAgLy8gTm90ZTogVHJvcG9zcGhlcmUgZGVwZW5kcyBvbiB0aGUgYWJpbGl0eSB0byBtdXRhdGVcbiAgICAvLyBNZXRlb3Iuc2VydmVyLm9wdGlvbnMuaGVhcnRiZWF0VGltZW91dCEgVGhpcyBpcyBhIGhhY2ssIGJ1dCBpdCdzIGxpZmUuXG4gICAgc29ja2V0Ll9tZXRlb3JTZXNzaW9uID0gbmV3IFNlc3Npb24oc2VsZiwgdmVyc2lvbiwgc29ja2V0LCBzZWxmLm9wdGlvbnMpO1xuICAgIHNlbGYuc2Vzc2lvbnMuc2V0KHNvY2tldC5fbWV0ZW9yU2Vzc2lvbi5pZCwgc29ja2V0Ll9tZXRlb3JTZXNzaW9uKTtcbiAgICBzZWxmLm9uQ29ubmVjdGlvbkhvb2suZWFjaChmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICAgIGlmIChzb2NrZXQuX21ldGVvclNlc3Npb24pXG4gICAgICAgIGNhbGxiYWNrKHNvY2tldC5fbWV0ZW9yU2Vzc2lvbi5jb25uZWN0aW9uSGFuZGxlKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICB9LFxuICAvKipcbiAgICogUmVnaXN0ZXIgYSBwdWJsaXNoIGhhbmRsZXIgZnVuY3Rpb24uXG4gICAqXG4gICAqIEBwYXJhbSBuYW1lIHtTdHJpbmd9IGlkZW50aWZpZXIgZm9yIHF1ZXJ5XG4gICAqIEBwYXJhbSBoYW5kbGVyIHtGdW5jdGlvbn0gcHVibGlzaCBoYW5kbGVyXG4gICAqIEBwYXJhbSBvcHRpb25zIHtPYmplY3R9XG4gICAqXG4gICAqIFNlcnZlciB3aWxsIGNhbGwgaGFuZGxlciBmdW5jdGlvbiBvbiBlYWNoIG5ldyBzdWJzY3JpcHRpb24sXG4gICAqIGVpdGhlciB3aGVuIHJlY2VpdmluZyBERFAgc3ViIG1lc3NhZ2UgZm9yIGEgbmFtZWQgc3Vic2NyaXB0aW9uLCBvciBvblxuICAgKiBERFAgY29ubmVjdCBmb3IgYSB1bml2ZXJzYWwgc3Vic2NyaXB0aW9uLlxuICAgKlxuICAgKiBJZiBuYW1lIGlzIG51bGwsIHRoaXMgd2lsbCBiZSBhIHN1YnNjcmlwdGlvbiB0aGF0IGlzXG4gICAqIGF1dG9tYXRpY2FsbHkgZXN0YWJsaXNoZWQgYW5kIHBlcm1hbmVudGx5IG9uIGZvciBhbGwgY29ubmVjdGVkXG4gICAqIGNsaWVudCwgaW5zdGVhZCBvZiBhIHN1YnNjcmlwdGlvbiB0aGF0IGNhbiBiZSB0dXJuZWQgb24gYW5kIG9mZlxuICAgKiB3aXRoIHN1YnNjcmliZSgpLlxuICAgKlxuICAgKiBvcHRpb25zIHRvIGNvbnRhaW46XG4gICAqICAtIChtb3N0bHkgaW50ZXJuYWwpIGlzX2F1dG86IHRydWUgaWYgZ2VuZXJhdGVkIGF1dG9tYXRpY2FsbHlcbiAgICogICAgZnJvbSBhbiBhdXRvcHVibGlzaCBob29rLiB0aGlzIGlzIGZvciBjb3NtZXRpYyBwdXJwb3NlcyBvbmx5XG4gICAqICAgIChpdCBsZXRzIHVzIGRldGVybWluZSB3aGV0aGVyIHRvIHByaW50IGEgd2FybmluZyBzdWdnZXN0aW5nXG4gICAqICAgIHRoYXQgeW91IHR1cm4gb2ZmIGF1dG9wdWJsaXNoKS5cbiAgICovXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IFB1Ymxpc2ggYSByZWNvcmQgc2V0LlxuICAgKiBAbWVtYmVyT2YgTWV0ZW9yXG4gICAqIEBpbXBvcnRGcm9tUGFja2FnZSBtZXRlb3JcbiAgICogQGxvY3VzIFNlcnZlclxuICAgKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IG5hbWUgSWYgU3RyaW5nLCBuYW1lIG9mIHRoZSByZWNvcmQgc2V0LiAgSWYgT2JqZWN0LCBwdWJsaWNhdGlvbnMgRGljdGlvbmFyeSBvZiBwdWJsaXNoIGZ1bmN0aW9ucyBieSBuYW1lLiAgSWYgYG51bGxgLCB0aGUgc2V0IGhhcyBubyBuYW1lLCBhbmQgdGhlIHJlY29yZCBzZXQgaXMgYXV0b21hdGljYWxseSBzZW50IHRvIGFsbCBjb25uZWN0ZWQgY2xpZW50cy5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBGdW5jdGlvbiBjYWxsZWQgb24gdGhlIHNlcnZlciBlYWNoIHRpbWUgYSBjbGllbnQgc3Vic2NyaWJlcy4gIEluc2lkZSB0aGUgZnVuY3Rpb24sIGB0aGlzYCBpcyB0aGUgcHVibGlzaCBoYW5kbGVyIG9iamVjdCwgZGVzY3JpYmVkIGJlbG93LiAgSWYgdGhlIGNsaWVudCBwYXNzZWQgYXJndW1lbnRzIHRvIGBzdWJzY3JpYmVgLCB0aGUgZnVuY3Rpb24gaXMgY2FsbGVkIHdpdGggdGhlIHNhbWUgYXJndW1lbnRzLlxuICAgKi9cbiAgcHVibGlzaDogZnVuY3Rpb24gKG5hbWUsIGhhbmRsZXIsIG9wdGlvbnMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBpZiAoISBfLmlzT2JqZWN0KG5hbWUpKSB7XG4gICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgaWYgKG5hbWUgJiYgbmFtZSBpbiBzZWxmLnB1Ymxpc2hfaGFuZGxlcnMpIHtcbiAgICAgICAgTWV0ZW9yLl9kZWJ1ZyhcIklnbm9yaW5nIGR1cGxpY2F0ZSBwdWJsaXNoIG5hbWVkICdcIiArIG5hbWUgKyBcIidcIik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKFBhY2thZ2UuYXV0b3B1Ymxpc2ggJiYgIW9wdGlvbnMuaXNfYXV0bykge1xuICAgICAgICAvLyBUaGV5IGhhdmUgYXV0b3B1Ymxpc2ggb24sIHlldCB0aGV5J3JlIHRyeWluZyB0byBtYW51YWxseVxuICAgICAgICAvLyBwaWNrIHN0dWZmIHRvIHB1Ymxpc2guIFRoZXkgcHJvYmFibHkgc2hvdWxkIHR1cm4gb2ZmXG4gICAgICAgIC8vIGF1dG9wdWJsaXNoLiAoVGhpcyBjaGVjayBpc24ndCBwZXJmZWN0IC0tIGlmIHlvdSBjcmVhdGUgYVxuICAgICAgICAvLyBwdWJsaXNoIGJlZm9yZSB5b3UgdHVybiBvbiBhdXRvcHVibGlzaCwgaXQgd29uJ3QgY2F0Y2hcbiAgICAgICAgLy8gaXQsIGJ1dCB0aGlzIHdpbGwgZGVmaW5pdGVseSBoYW5kbGUgdGhlIHNpbXBsZSBjYXNlIHdoZXJlXG4gICAgICAgIC8vIHlvdSd2ZSBhZGRlZCB0aGUgYXV0b3B1Ymxpc2ggcGFja2FnZSB0byB5b3VyIGFwcCwgYW5kIGFyZVxuICAgICAgICAvLyBjYWxsaW5nIHB1Ymxpc2ggZnJvbSB5b3VyIGFwcCBjb2RlKS5cbiAgICAgICAgaWYgKCFzZWxmLndhcm5lZF9hYm91dF9hdXRvcHVibGlzaCkge1xuICAgICAgICAgIHNlbGYud2FybmVkX2Fib3V0X2F1dG9wdWJsaXNoID0gdHJ1ZTtcbiAgICAgICAgICBNZXRlb3IuX2RlYnVnKFxuICAgIFwiKiogWW91J3ZlIHNldCB1cCBzb21lIGRhdGEgc3Vic2NyaXB0aW9ucyB3aXRoIE1ldGVvci5wdWJsaXNoKCksIGJ1dFxcblwiICtcbiAgICBcIioqIHlvdSBzdGlsbCBoYXZlIGF1dG9wdWJsaXNoIHR1cm5lZCBvbi4gQmVjYXVzZSBhdXRvcHVibGlzaCBpcyBzdGlsbFxcblwiICtcbiAgICBcIioqIG9uLCB5b3VyIE1ldGVvci5wdWJsaXNoKCkgY2FsbHMgd29uJ3QgaGF2ZSBtdWNoIGVmZmVjdC4gQWxsIGRhdGFcXG5cIiArXG4gICAgXCIqKiB3aWxsIHN0aWxsIGJlIHNlbnQgdG8gYWxsIGNsaWVudHMuXFxuXCIgK1xuICAgIFwiKipcXG5cIiArXG4gICAgXCIqKiBUdXJuIG9mZiBhdXRvcHVibGlzaCBieSByZW1vdmluZyB0aGUgYXV0b3B1Ymxpc2ggcGFja2FnZTpcXG5cIiArXG4gICAgXCIqKlxcblwiICtcbiAgICBcIioqICAgJCBtZXRlb3IgcmVtb3ZlIGF1dG9wdWJsaXNoXFxuXCIgK1xuICAgIFwiKipcXG5cIiArXG4gICAgXCIqKiAuLiBhbmQgbWFrZSBzdXJlIHlvdSBoYXZlIE1ldGVvci5wdWJsaXNoKCkgYW5kIE1ldGVvci5zdWJzY3JpYmUoKSBjYWxsc1xcblwiICtcbiAgICBcIioqIGZvciBlYWNoIGNvbGxlY3Rpb24gdGhhdCB5b3Ugd2FudCBjbGllbnRzIHRvIHNlZS5cXG5cIik7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKG5hbWUpXG4gICAgICAgIHNlbGYucHVibGlzaF9oYW5kbGVyc1tuYW1lXSA9IGhhbmRsZXI7XG4gICAgICBlbHNlIHtcbiAgICAgICAgc2VsZi51bml2ZXJzYWxfcHVibGlzaF9oYW5kbGVycy5wdXNoKGhhbmRsZXIpO1xuICAgICAgICAvLyBTcGluIHVwIHRoZSBuZXcgcHVibGlzaGVyIG9uIGFueSBleGlzdGluZyBzZXNzaW9uIHRvby4gUnVuIGVhY2hcbiAgICAgICAgLy8gc2Vzc2lvbidzIHN1YnNjcmlwdGlvbiBpbiBhIG5ldyBGaWJlciwgc28gdGhhdCB0aGVyZSdzIG5vIGNoYW5nZSBmb3JcbiAgICAgICAgLy8gc2VsZi5zZXNzaW9ucyB0byBjaGFuZ2Ugd2hpbGUgd2UncmUgcnVubmluZyB0aGlzIGxvb3AuXG4gICAgICAgIHNlbGYuc2Vzc2lvbnMuZm9yRWFjaChmdW5jdGlvbiAoc2Vzc2lvbikge1xuICAgICAgICAgIGlmICghc2Vzc2lvbi5fZG9udFN0YXJ0TmV3VW5pdmVyc2FsU3Vicykge1xuICAgICAgICAgICAgRmliZXIoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIHNlc3Npb24uX3N0YXJ0U3Vic2NyaXB0aW9uKGhhbmRsZXIpO1xuICAgICAgICAgICAgfSkucnVuKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZXtcbiAgICAgIF8uZWFjaChuYW1lLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICAgIHNlbGYucHVibGlzaChrZXksIHZhbHVlLCB7fSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH0sXG5cbiAgX3JlbW92ZVNlc3Npb246IGZ1bmN0aW9uIChzZXNzaW9uKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHNlbGYuc2Vzc2lvbnMuZGVsZXRlKHNlc3Npb24uaWQpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBEZWZpbmVzIGZ1bmN0aW9ucyB0aGF0IGNhbiBiZSBpbnZva2VkIG92ZXIgdGhlIG5ldHdvcmsgYnkgY2xpZW50cy5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBtZXRob2RzIERpY3Rpb25hcnkgd2hvc2Uga2V5cyBhcmUgbWV0aG9kIG5hbWVzIGFuZCB2YWx1ZXMgYXJlIGZ1bmN0aW9ucy5cbiAgICogQG1lbWJlck9mIE1ldGVvclxuICAgKiBAaW1wb3J0RnJvbVBhY2thZ2UgbWV0ZW9yXG4gICAqL1xuICBtZXRob2RzOiBmdW5jdGlvbiAobWV0aG9kcykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBfLmVhY2gobWV0aG9kcywgZnVuY3Rpb24gKGZ1bmMsIG5hbWUpIHtcbiAgICAgIGlmICh0eXBlb2YgZnVuYyAhPT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWV0aG9kICdcIiArIG5hbWUgKyBcIicgbXVzdCBiZSBhIGZ1bmN0aW9uXCIpO1xuICAgICAgaWYgKHNlbGYubWV0aG9kX2hhbmRsZXJzW25hbWVdKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJBIG1ldGhvZCBuYW1lZCAnXCIgKyBuYW1lICsgXCInIGlzIGFscmVhZHkgZGVmaW5lZFwiKTtcbiAgICAgIHNlbGYubWV0aG9kX2hhbmRsZXJzW25hbWVdID0gZnVuYztcbiAgICB9KTtcbiAgfSxcblxuICBjYWxsOiBmdW5jdGlvbiAobmFtZSwgLi4uYXJncykge1xuICAgIGlmIChhcmdzLmxlbmd0aCAmJiB0eXBlb2YgYXJnc1thcmdzLmxlbmd0aCAtIDFdID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIC8vIElmIGl0J3MgYSBmdW5jdGlvbiwgdGhlIGxhc3QgYXJndW1lbnQgaXMgdGhlIHJlc3VsdCBjYWxsYmFjaywgbm90XG4gICAgICAvLyBhIHBhcmFtZXRlciB0byB0aGUgcmVtb3RlIG1ldGhvZC5cbiAgICAgIHZhciBjYWxsYmFjayA9IGFyZ3MucG9wKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuYXBwbHkobmFtZSwgYXJncywgY2FsbGJhY2spO1xuICB9LFxuXG4gIC8vIEEgdmVyc2lvbiBvZiB0aGUgY2FsbCBtZXRob2QgdGhhdCBhbHdheXMgcmV0dXJucyBhIFByb21pc2UuXG4gIGNhbGxBc3luYzogZnVuY3Rpb24gKG5hbWUsIC4uLmFyZ3MpIHtcbiAgICByZXR1cm4gdGhpcy5hcHBseUFzeW5jKG5hbWUsIGFyZ3MpO1xuICB9LFxuXG4gIGFwcGx5OiBmdW5jdGlvbiAobmFtZSwgYXJncywgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICAvLyBXZSB3ZXJlIHBhc3NlZCAzIGFyZ3VtZW50cy4gVGhleSBtYXkgYmUgZWl0aGVyIChuYW1lLCBhcmdzLCBvcHRpb25zKVxuICAgIC8vIG9yIChuYW1lLCBhcmdzLCBjYWxsYmFjaylcbiAgICBpZiAoISBjYWxsYmFjayAmJiB0eXBlb2Ygb3B0aW9ucyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH0gZWxzZSB7XG4gICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB9XG5cbiAgICBjb25zdCBwcm9taXNlID0gdGhpcy5hcHBseUFzeW5jKG5hbWUsIGFyZ3MsIG9wdGlvbnMpO1xuXG4gICAgLy8gUmV0dXJuIHRoZSByZXN1bHQgaW4gd2hpY2hldmVyIHdheSB0aGUgY2FsbGVyIGFza2VkIGZvciBpdC4gTm90ZSB0aGF0IHdlXG4gICAgLy8gZG8gTk9UIGJsb2NrIG9uIHRoZSB3cml0ZSBmZW5jZSBpbiBhbiBhbmFsb2dvdXMgd2F5IHRvIGhvdyB0aGUgY2xpZW50XG4gICAgLy8gYmxvY2tzIG9uIHRoZSByZWxldmFudCBkYXRhIGJlaW5nIHZpc2libGUsIHNvIHlvdSBhcmUgTk9UIGd1YXJhbnRlZWQgdGhhdFxuICAgIC8vIGN1cnNvciBvYnNlcnZlIGNhbGxiYWNrcyBoYXZlIGZpcmVkIHdoZW4geW91ciBjYWxsYmFjayBpcyBpbnZva2VkLiAoV2VcbiAgICAvLyBjYW4gY2hhbmdlIHRoaXMgaWYgdGhlcmUncyBhIHJlYWwgdXNlIGNhc2UpLlxuICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgcHJvbWlzZS50aGVuKFxuICAgICAgICByZXN1bHQgPT4gY2FsbGJhY2sodW5kZWZpbmVkLCByZXN1bHQpLFxuICAgICAgICBleGNlcHRpb24gPT4gY2FsbGJhY2soZXhjZXB0aW9uKVxuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHByb21pc2UuYXdhaXQoKTtcbiAgICB9XG4gIH0sXG5cbiAgLy8gQHBhcmFtIG9wdGlvbnMge09wdGlvbmFsIE9iamVjdH1cbiAgYXBwbHlBc3luYzogZnVuY3Rpb24gKG5hbWUsIGFyZ3MsIG9wdGlvbnMpIHtcbiAgICAvLyBSdW4gdGhlIGhhbmRsZXJcbiAgICB2YXIgaGFuZGxlciA9IHRoaXMubWV0aG9kX2hhbmRsZXJzW25hbWVdO1xuICAgIGlmICghIGhhbmRsZXIpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChcbiAgICAgICAgbmV3IE1ldGVvci5FcnJvcig0MDQsIGBNZXRob2QgJyR7bmFtZX0nIG5vdCBmb3VuZGApXG4gICAgICApO1xuICAgIH1cblxuICAgIC8vIElmIHRoaXMgaXMgYSBtZXRob2QgY2FsbCBmcm9tIHdpdGhpbiBhbm90aGVyIG1ldGhvZCBvciBwdWJsaXNoIGZ1bmN0aW9uLFxuICAgIC8vIGdldCB0aGUgdXNlciBzdGF0ZSBmcm9tIHRoZSBvdXRlciBtZXRob2Qgb3IgcHVibGlzaCBmdW5jdGlvbiwgb3RoZXJ3aXNlXG4gICAgLy8gZG9uJ3QgYWxsb3cgc2V0VXNlcklkIHRvIGJlIGNhbGxlZFxuICAgIHZhciB1c2VySWQgPSBudWxsO1xuICAgIHZhciBzZXRVc2VySWQgPSBmdW5jdGlvbigpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbid0IGNhbGwgc2V0VXNlcklkIG9uIGEgc2VydmVyIGluaXRpYXRlZCBtZXRob2QgY2FsbFwiKTtcbiAgICB9O1xuICAgIHZhciBjb25uZWN0aW9uID0gbnVsbDtcbiAgICB2YXIgY3VycmVudE1ldGhvZEludm9jYXRpb24gPSBERFAuX0N1cnJlbnRNZXRob2RJbnZvY2F0aW9uLmdldCgpO1xuICAgIHZhciBjdXJyZW50UHVibGljYXRpb25JbnZvY2F0aW9uID0gRERQLl9DdXJyZW50UHVibGljYXRpb25JbnZvY2F0aW9uLmdldCgpO1xuICAgIHZhciByYW5kb21TZWVkID0gbnVsbDtcbiAgICBpZiAoY3VycmVudE1ldGhvZEludm9jYXRpb24pIHtcbiAgICAgIHVzZXJJZCA9IGN1cnJlbnRNZXRob2RJbnZvY2F0aW9uLnVzZXJJZDtcbiAgICAgIHNldFVzZXJJZCA9IGZ1bmN0aW9uKHVzZXJJZCkge1xuICAgICAgICBjdXJyZW50TWV0aG9kSW52b2NhdGlvbi5zZXRVc2VySWQodXNlcklkKTtcbiAgICAgIH07XG4gICAgICBjb25uZWN0aW9uID0gY3VycmVudE1ldGhvZEludm9jYXRpb24uY29ubmVjdGlvbjtcbiAgICAgIHJhbmRvbVNlZWQgPSBERFBDb21tb24ubWFrZVJwY1NlZWQoY3VycmVudE1ldGhvZEludm9jYXRpb24sIG5hbWUpO1xuICAgIH0gZWxzZSBpZiAoY3VycmVudFB1YmxpY2F0aW9uSW52b2NhdGlvbikge1xuICAgICAgdXNlcklkID0gY3VycmVudFB1YmxpY2F0aW9uSW52b2NhdGlvbi51c2VySWQ7XG4gICAgICBzZXRVc2VySWQgPSBmdW5jdGlvbih1c2VySWQpIHtcbiAgICAgICAgY3VycmVudFB1YmxpY2F0aW9uSW52b2NhdGlvbi5fc2Vzc2lvbi5fc2V0VXNlcklkKHVzZXJJZCk7XG4gICAgICB9O1xuICAgICAgY29ubmVjdGlvbiA9IGN1cnJlbnRQdWJsaWNhdGlvbkludm9jYXRpb24uY29ubmVjdGlvbjtcbiAgICB9XG5cbiAgICB2YXIgaW52b2NhdGlvbiA9IG5ldyBERFBDb21tb24uTWV0aG9kSW52b2NhdGlvbih7XG4gICAgICBpc1NpbXVsYXRpb246IGZhbHNlLFxuICAgICAgdXNlcklkLFxuICAgICAgc2V0VXNlcklkLFxuICAgICAgY29ubmVjdGlvbixcbiAgICAgIHJhbmRvbVNlZWRcbiAgICB9KTtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHJlc29sdmUoXG4gICAgICBERFAuX0N1cnJlbnRNZXRob2RJbnZvY2F0aW9uLndpdGhWYWx1ZShcbiAgICAgICAgaW52b2NhdGlvbixcbiAgICAgICAgKCkgPT4gbWF5YmVBdWRpdEFyZ3VtZW50Q2hlY2tzKFxuICAgICAgICAgIGhhbmRsZXIsIGludm9jYXRpb24sIEVKU09OLmNsb25lKGFyZ3MpLFxuICAgICAgICAgIFwiaW50ZXJuYWwgY2FsbCB0byAnXCIgKyBuYW1lICsgXCInXCJcbiAgICAgICAgKVxuICAgICAgKVxuICAgICkpLnRoZW4oRUpTT04uY2xvbmUpO1xuICB9LFxuXG4gIF91cmxGb3JTZXNzaW9uOiBmdW5jdGlvbiAoc2Vzc2lvbklkKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBzZXNzaW9uID0gc2VsZi5zZXNzaW9ucy5nZXQoc2Vzc2lvbklkKTtcbiAgICBpZiAoc2Vzc2lvbilcbiAgICAgIHJldHVybiBzZXNzaW9uLl9zb2NrZXRVcmw7XG4gICAgZWxzZVxuICAgICAgcmV0dXJuIG51bGw7XG4gIH1cbn0pO1xuXG52YXIgY2FsY3VsYXRlVmVyc2lvbiA9IGZ1bmN0aW9uIChjbGllbnRTdXBwb3J0ZWRWZXJzaW9ucyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlcnZlclN1cHBvcnRlZFZlcnNpb25zKSB7XG4gIHZhciBjb3JyZWN0VmVyc2lvbiA9IF8uZmluZChjbGllbnRTdXBwb3J0ZWRWZXJzaW9ucywgZnVuY3Rpb24gKHZlcnNpb24pIHtcbiAgICByZXR1cm4gXy5jb250YWlucyhzZXJ2ZXJTdXBwb3J0ZWRWZXJzaW9ucywgdmVyc2lvbik7XG4gIH0pO1xuICBpZiAoIWNvcnJlY3RWZXJzaW9uKSB7XG4gICAgY29ycmVjdFZlcnNpb24gPSBzZXJ2ZXJTdXBwb3J0ZWRWZXJzaW9uc1swXTtcbiAgfVxuICByZXR1cm4gY29ycmVjdFZlcnNpb247XG59O1xuXG5ERFBTZXJ2ZXIuX2NhbGN1bGF0ZVZlcnNpb24gPSBjYWxjdWxhdGVWZXJzaW9uO1xuXG5cbi8vIFwiYmxpbmRcIiBleGNlcHRpb25zIG90aGVyIHRoYW4gdGhvc2UgdGhhdCB3ZXJlIGRlbGliZXJhdGVseSB0aHJvd24gdG8gc2lnbmFsXG4vLyBlcnJvcnMgdG8gdGhlIGNsaWVudFxudmFyIHdyYXBJbnRlcm5hbEV4Y2VwdGlvbiA9IGZ1bmN0aW9uIChleGNlcHRpb24sIGNvbnRleHQpIHtcbiAgaWYgKCFleGNlcHRpb24pIHJldHVybiBleGNlcHRpb247XG5cbiAgLy8gVG8gYWxsb3cgcGFja2FnZXMgdG8gdGhyb3cgZXJyb3JzIGludGVuZGVkIGZvciB0aGUgY2xpZW50IGJ1dCBub3QgaGF2ZSB0b1xuICAvLyBkZXBlbmQgb24gdGhlIE1ldGVvci5FcnJvciBjbGFzcywgYGlzQ2xpZW50U2FmZWAgY2FuIGJlIHNldCB0byB0cnVlIG9uIGFueVxuICAvLyBlcnJvciBiZWZvcmUgaXQgaXMgdGhyb3duLlxuICBpZiAoZXhjZXB0aW9uLmlzQ2xpZW50U2FmZSkge1xuICAgIGlmICghKGV4Y2VwdGlvbiBpbnN0YW5jZW9mIE1ldGVvci5FcnJvcikpIHtcbiAgICAgIGNvbnN0IG9yaWdpbmFsTWVzc2FnZSA9IGV4Y2VwdGlvbi5tZXNzYWdlO1xuICAgICAgZXhjZXB0aW9uID0gbmV3IE1ldGVvci5FcnJvcihleGNlcHRpb24uZXJyb3IsIGV4Y2VwdGlvbi5yZWFzb24sIGV4Y2VwdGlvbi5kZXRhaWxzKTtcbiAgICAgIGV4Y2VwdGlvbi5tZXNzYWdlID0gb3JpZ2luYWxNZXNzYWdlO1xuICAgIH1cbiAgICByZXR1cm4gZXhjZXB0aW9uO1xuICB9XG5cbiAgLy8gVGVzdHMgY2FuIHNldCB0aGUgJ19leHBlY3RlZEJ5VGVzdCcgZmxhZyBvbiBhbiBleGNlcHRpb24gc28gaXQgd29uJ3QgZ28gdG9cbiAgLy8gdGhlIHNlcnZlciBsb2cuXG4gIGlmICghZXhjZXB0aW9uLl9leHBlY3RlZEJ5VGVzdCkge1xuICAgIE1ldGVvci5fZGVidWcoXCJFeGNlcHRpb24gXCIgKyBjb250ZXh0LCBleGNlcHRpb24uc3RhY2spO1xuICAgIGlmIChleGNlcHRpb24uc2FuaXRpemVkRXJyb3IpIHtcbiAgICAgIE1ldGVvci5fZGVidWcoXCJTYW5pdGl6ZWQgYW5kIHJlcG9ydGVkIHRvIHRoZSBjbGllbnQgYXM6XCIsIGV4Y2VwdGlvbi5zYW5pdGl6ZWRFcnJvcik7XG4gICAgICBNZXRlb3IuX2RlYnVnKCk7XG4gICAgfVxuICB9XG5cbiAgLy8gRGlkIHRoZSBlcnJvciBjb250YWluIG1vcmUgZGV0YWlscyB0aGF0IGNvdWxkIGhhdmUgYmVlbiB1c2VmdWwgaWYgY2F1Z2h0IGluXG4gIC8vIHNlcnZlciBjb2RlIChvciBpZiB0aHJvd24gZnJvbSBub24tY2xpZW50LW9yaWdpbmF0ZWQgY29kZSksIGJ1dCBhbHNvXG4gIC8vIHByb3ZpZGVkIGEgXCJzYW5pdGl6ZWRcIiB2ZXJzaW9uIHdpdGggbW9yZSBjb250ZXh0IHRoYW4gNTAwIEludGVybmFsIHNlcnZlclxuICAvLyBlcnJvcj8gVXNlIHRoYXQuXG4gIGlmIChleGNlcHRpb24uc2FuaXRpemVkRXJyb3IpIHtcbiAgICBpZiAoZXhjZXB0aW9uLnNhbml0aXplZEVycm9yLmlzQ2xpZW50U2FmZSlcbiAgICAgIHJldHVybiBleGNlcHRpb24uc2FuaXRpemVkRXJyb3I7XG4gICAgTWV0ZW9yLl9kZWJ1ZyhcIkV4Y2VwdGlvbiBcIiArIGNvbnRleHQgKyBcIiBwcm92aWRlcyBhIHNhbml0aXplZEVycm9yIHRoYXQgXCIgK1xuICAgICAgICAgICAgICAgICAgXCJkb2VzIG5vdCBoYXZlIGlzQ2xpZW50U2FmZSBwcm9wZXJ0eSBzZXQ7IGlnbm9yaW5nXCIpO1xuICB9XG5cbiAgcmV0dXJuIG5ldyBNZXRlb3IuRXJyb3IoNTAwLCBcIkludGVybmFsIHNlcnZlciBlcnJvclwiKTtcbn07XG5cblxuLy8gQXVkaXQgYXJndW1lbnQgY2hlY2tzLCBpZiB0aGUgYXVkaXQtYXJndW1lbnQtY2hlY2tzIHBhY2thZ2UgZXhpc3RzIChpdCBpcyBhXG4vLyB3ZWFrIGRlcGVuZGVuY3kgb2YgdGhpcyBwYWNrYWdlKS5cbnZhciBtYXliZUF1ZGl0QXJndW1lbnRDaGVja3MgPSBmdW5jdGlvbiAoZiwgY29udGV4dCwgYXJncywgZGVzY3JpcHRpb24pIHtcbiAgYXJncyA9IGFyZ3MgfHwgW107XG4gIGlmIChQYWNrYWdlWydhdWRpdC1hcmd1bWVudC1jaGVja3MnXSkge1xuICAgIHJldHVybiBNYXRjaC5fZmFpbElmQXJndW1lbnRzQXJlTm90QWxsQ2hlY2tlZChcbiAgICAgIGYsIGNvbnRleHQsIGFyZ3MsIGRlc2NyaXB0aW9uKTtcbiAgfVxuICByZXR1cm4gZi5hcHBseShjb250ZXh0LCBhcmdzKTtcbn07XG4iLCJ2YXIgRnV0dXJlID0gTnBtLnJlcXVpcmUoJ2ZpYmVycy9mdXR1cmUnKTtcblxuLy8gQSB3cml0ZSBmZW5jZSBjb2xsZWN0cyBhIGdyb3VwIG9mIHdyaXRlcywgYW5kIHByb3ZpZGVzIGEgY2FsbGJhY2tcbi8vIHdoZW4gYWxsIG9mIHRoZSB3cml0ZXMgYXJlIGZ1bGx5IGNvbW1pdHRlZCBhbmQgcHJvcGFnYXRlZCAoYWxsXG4vLyBvYnNlcnZlcnMgaGF2ZSBiZWVuIG5vdGlmaWVkIG9mIHRoZSB3cml0ZSBhbmQgYWNrbm93bGVkZ2VkIGl0Lilcbi8vXG5ERFBTZXJ2ZXIuX1dyaXRlRmVuY2UgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBzZWxmLmFybWVkID0gZmFsc2U7XG4gIHNlbGYuZmlyZWQgPSBmYWxzZTtcbiAgc2VsZi5yZXRpcmVkID0gZmFsc2U7XG4gIHNlbGYub3V0c3RhbmRpbmdfd3JpdGVzID0gMDtcbiAgc2VsZi5iZWZvcmVfZmlyZV9jYWxsYmFja3MgPSBbXTtcbiAgc2VsZi5jb21wbGV0aW9uX2NhbGxiYWNrcyA9IFtdO1xufTtcblxuLy8gVGhlIGN1cnJlbnQgd3JpdGUgZmVuY2UuIFdoZW4gdGhlcmUgaXMgYSBjdXJyZW50IHdyaXRlIGZlbmNlLCBjb2RlXG4vLyB0aGF0IHdyaXRlcyB0byBkYXRhYmFzZXMgc2hvdWxkIHJlZ2lzdGVyIHRoZWlyIHdyaXRlcyB3aXRoIGl0IHVzaW5nXG4vLyBiZWdpbldyaXRlKCkuXG4vL1xuRERQU2VydmVyLl9DdXJyZW50V3JpdGVGZW5jZSA9IG5ldyBNZXRlb3IuRW52aXJvbm1lbnRWYXJpYWJsZTtcblxuXy5leHRlbmQoRERQU2VydmVyLl9Xcml0ZUZlbmNlLnByb3RvdHlwZSwge1xuICAvLyBTdGFydCB0cmFja2luZyBhIHdyaXRlLCBhbmQgcmV0dXJuIGFuIG9iamVjdCB0byByZXByZXNlbnQgaXQuIFRoZVxuICAvLyBvYmplY3QgaGFzIGEgc2luZ2xlIG1ldGhvZCwgY29tbWl0dGVkKCkuIFRoaXMgbWV0aG9kIHNob3VsZCBiZVxuICAvLyBjYWxsZWQgd2hlbiB0aGUgd3JpdGUgaXMgZnVsbHkgY29tbWl0dGVkIGFuZCBwcm9wYWdhdGVkLiBZb3UgY2FuXG4gIC8vIGNvbnRpbnVlIHRvIGFkZCB3cml0ZXMgdG8gdGhlIFdyaXRlRmVuY2UgdXAgdW50aWwgaXQgaXMgdHJpZ2dlcmVkXG4gIC8vIChjYWxscyBpdHMgY2FsbGJhY2tzIGJlY2F1c2UgYWxsIHdyaXRlcyBoYXZlIGNvbW1pdHRlZC4pXG4gIGJlZ2luV3JpdGU6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBpZiAoc2VsZi5yZXRpcmVkKVxuICAgICAgcmV0dXJuIHsgY29tbWl0dGVkOiBmdW5jdGlvbiAoKSB7fSB9O1xuXG4gICAgaWYgKHNlbGYuZmlyZWQpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJmZW5jZSBoYXMgYWxyZWFkeSBhY3RpdmF0ZWQgLS0gdG9vIGxhdGUgdG8gYWRkIHdyaXRlc1wiKTtcblxuICAgIHNlbGYub3V0c3RhbmRpbmdfd3JpdGVzKys7XG4gICAgdmFyIGNvbW1pdHRlZCA9IGZhbHNlO1xuICAgIHJldHVybiB7XG4gICAgICBjb21taXR0ZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKGNvbW1pdHRlZClcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJjb21taXR0ZWQgY2FsbGVkIHR3aWNlIG9uIHRoZSBzYW1lIHdyaXRlXCIpO1xuICAgICAgICBjb21taXR0ZWQgPSB0cnVlO1xuICAgICAgICBzZWxmLm91dHN0YW5kaW5nX3dyaXRlcy0tO1xuICAgICAgICBzZWxmLl9tYXliZUZpcmUoKTtcbiAgICAgIH1cbiAgICB9O1xuICB9LFxuXG4gIC8vIEFybSB0aGUgZmVuY2UuIE9uY2UgdGhlIGZlbmNlIGlzIGFybWVkLCBhbmQgdGhlcmUgYXJlIG5vIG1vcmVcbiAgLy8gdW5jb21taXR0ZWQgd3JpdGVzLCBpdCB3aWxsIGFjdGl2YXRlLlxuICBhcm06IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKHNlbGYgPT09IEREUFNlcnZlci5fQ3VycmVudFdyaXRlRmVuY2UuZ2V0KCkpXG4gICAgICB0aHJvdyBFcnJvcihcIkNhbid0IGFybSB0aGUgY3VycmVudCBmZW5jZVwiKTtcbiAgICBzZWxmLmFybWVkID0gdHJ1ZTtcbiAgICBzZWxmLl9tYXliZUZpcmUoKTtcbiAgfSxcblxuICAvLyBSZWdpc3RlciBhIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBvbmNlIGJlZm9yZSBmaXJpbmcgdGhlIGZlbmNlLlxuICAvLyBDYWxsYmFjayBmdW5jdGlvbiBjYW4gYWRkIG5ldyB3cml0ZXMgdG8gdGhlIGZlbmNlLCBpbiB3aGljaCBjYXNlXG4gIC8vIGl0IHdvbid0IGZpcmUgdW50aWwgdGhvc2Ugd3JpdGVzIGFyZSBkb25lIGFzIHdlbGwuXG4gIG9uQmVmb3JlRmlyZTogZnVuY3Rpb24gKGZ1bmMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKHNlbGYuZmlyZWQpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJmZW5jZSBoYXMgYWxyZWFkeSBhY3RpdmF0ZWQgLS0gdG9vIGxhdGUgdG8gXCIgK1xuICAgICAgICAgICAgICAgICAgICAgIFwiYWRkIGEgY2FsbGJhY2tcIik7XG4gICAgc2VsZi5iZWZvcmVfZmlyZV9jYWxsYmFja3MucHVzaChmdW5jKTtcbiAgfSxcblxuICAvLyBSZWdpc3RlciBhIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB3aGVuIHRoZSBmZW5jZSBmaXJlcy5cbiAgb25BbGxDb21taXR0ZWQ6IGZ1bmN0aW9uIChmdW5jKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLmZpcmVkKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiZmVuY2UgaGFzIGFscmVhZHkgYWN0aXZhdGVkIC0tIHRvbyBsYXRlIHRvIFwiICtcbiAgICAgICAgICAgICAgICAgICAgICBcImFkZCBhIGNhbGxiYWNrXCIpO1xuICAgIHNlbGYuY29tcGxldGlvbl9jYWxsYmFja3MucHVzaChmdW5jKTtcbiAgfSxcblxuICAvLyBDb252ZW5pZW5jZSBmdW5jdGlvbi4gQXJtcyB0aGUgZmVuY2UsIHRoZW4gYmxvY2tzIHVudGlsIGl0IGZpcmVzLlxuICBhcm1BbmRXYWl0OiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBmdXR1cmUgPSBuZXcgRnV0dXJlO1xuICAgIHNlbGYub25BbGxDb21taXR0ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgZnV0dXJlWydyZXR1cm4nXSgpO1xuICAgIH0pO1xuICAgIHNlbGYuYXJtKCk7XG4gICAgZnV0dXJlLndhaXQoKTtcbiAgfSxcblxuICBfbWF5YmVGaXJlOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLmZpcmVkKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwid3JpdGUgZmVuY2UgYWxyZWFkeSBhY3RpdmF0ZWQ/XCIpO1xuICAgIGlmIChzZWxmLmFybWVkICYmICFzZWxmLm91dHN0YW5kaW5nX3dyaXRlcykge1xuICAgICAgZnVuY3Rpb24gaW52b2tlQ2FsbGJhY2sgKGZ1bmMpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBmdW5jKHNlbGYpO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBNZXRlb3IuX2RlYnVnKFwiZXhjZXB0aW9uIGluIHdyaXRlIGZlbmNlIGNhbGxiYWNrXCIsIGVycik7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgc2VsZi5vdXRzdGFuZGluZ193cml0ZXMrKztcbiAgICAgIHdoaWxlIChzZWxmLmJlZm9yZV9maXJlX2NhbGxiYWNrcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHZhciBjYWxsYmFja3MgPSBzZWxmLmJlZm9yZV9maXJlX2NhbGxiYWNrcztcbiAgICAgICAgc2VsZi5iZWZvcmVfZmlyZV9jYWxsYmFja3MgPSBbXTtcbiAgICAgICAgXy5lYWNoKGNhbGxiYWNrcywgaW52b2tlQ2FsbGJhY2spO1xuICAgICAgfVxuICAgICAgc2VsZi5vdXRzdGFuZGluZ193cml0ZXMtLTtcblxuICAgICAgaWYgKCFzZWxmLm91dHN0YW5kaW5nX3dyaXRlcykge1xuICAgICAgICBzZWxmLmZpcmVkID0gdHJ1ZTtcbiAgICAgICAgdmFyIGNhbGxiYWNrcyA9IHNlbGYuY29tcGxldGlvbl9jYWxsYmFja3M7XG4gICAgICAgIHNlbGYuY29tcGxldGlvbl9jYWxsYmFja3MgPSBbXTtcbiAgICAgICAgXy5lYWNoKGNhbGxiYWNrcywgaW52b2tlQ2FsbGJhY2spO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICAvLyBEZWFjdGl2YXRlIHRoaXMgZmVuY2Ugc28gdGhhdCBhZGRpbmcgbW9yZSB3cml0ZXMgaGFzIG5vIGVmZmVjdC5cbiAgLy8gVGhlIGZlbmNlIG11c3QgaGF2ZSBhbHJlYWR5IGZpcmVkLlxuICByZXRpcmU6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKCEgc2VsZi5maXJlZClcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbid0IHJldGlyZSBhIGZlbmNlIHRoYXQgaGFzbid0IGZpcmVkLlwiKTtcbiAgICBzZWxmLnJldGlyZWQgPSB0cnVlO1xuICB9XG59KTtcbiIsIi8vIEEgXCJjcm9zc2JhclwiIGlzIGEgY2xhc3MgdGhhdCBwcm92aWRlcyBzdHJ1Y3R1cmVkIG5vdGlmaWNhdGlvbiByZWdpc3RyYXRpb24uXG4vLyBTZWUgX21hdGNoIGZvciB0aGUgZGVmaW5pdGlvbiBvZiBob3cgYSBub3RpZmljYXRpb24gbWF0Y2hlcyBhIHRyaWdnZXIuXG4vLyBBbGwgbm90aWZpY2F0aW9ucyBhbmQgdHJpZ2dlcnMgbXVzdCBoYXZlIGEgc3RyaW5nIGtleSBuYW1lZCAnY29sbGVjdGlvbicuXG5cbkREUFNlcnZlci5fQ3Jvc3NiYXIgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIHNlbGYubmV4dElkID0gMTtcbiAgLy8gbWFwIGZyb20gY29sbGVjdGlvbiBuYW1lIChzdHJpbmcpIC0+IGxpc3RlbmVyIGlkIC0+IG9iamVjdC4gZWFjaCBvYmplY3QgaGFzXG4gIC8vIGtleXMgJ3RyaWdnZXInLCAnY2FsbGJhY2snLiAgQXMgYSBoYWNrLCB0aGUgZW1wdHkgc3RyaW5nIG1lYW5zIFwibm9cbiAgLy8gY29sbGVjdGlvblwiLlxuICBzZWxmLmxpc3RlbmVyc0J5Q29sbGVjdGlvbiA9IHt9O1xuICBzZWxmLmxpc3RlbmVyc0J5Q29sbGVjdGlvbkNvdW50ID0ge307XG4gIHNlbGYuZmFjdFBhY2thZ2UgPSBvcHRpb25zLmZhY3RQYWNrYWdlIHx8IFwibGl2ZWRhdGFcIjtcbiAgc2VsZi5mYWN0TmFtZSA9IG9wdGlvbnMuZmFjdE5hbWUgfHwgbnVsbDtcbn07XG5cbl8uZXh0ZW5kKEREUFNlcnZlci5fQ3Jvc3NiYXIucHJvdG90eXBlLCB7XG4gIC8vIG1zZyBpcyBhIHRyaWdnZXIgb3IgYSBub3RpZmljYXRpb25cbiAgX2NvbGxlY3Rpb25Gb3JNZXNzYWdlOiBmdW5jdGlvbiAobXNnKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmICghIF8uaGFzKG1zZywgJ2NvbGxlY3Rpb24nKSkge1xuICAgICAgcmV0dXJuICcnO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mKG1zZy5jb2xsZWN0aW9uKSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGlmIChtc2cuY29sbGVjdGlvbiA9PT0gJycpXG4gICAgICAgIHRocm93IEVycm9yKFwiTWVzc2FnZSBoYXMgZW1wdHkgY29sbGVjdGlvbiFcIik7XG4gICAgICByZXR1cm4gbXNnLmNvbGxlY3Rpb247XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IEVycm9yKFwiTWVzc2FnZSBoYXMgbm9uLXN0cmluZyBjb2xsZWN0aW9uIVwiKTtcbiAgICB9XG4gIH0sXG5cbiAgLy8gTGlzdGVuIGZvciBub3RpZmljYXRpb24gdGhhdCBtYXRjaCAndHJpZ2dlcicuIEEgbm90aWZpY2F0aW9uXG4gIC8vIG1hdGNoZXMgaWYgaXQgaGFzIHRoZSBrZXktdmFsdWUgcGFpcnMgaW4gdHJpZ2dlciBhcyBhXG4gIC8vIHN1YnNldC4gV2hlbiBhIG5vdGlmaWNhdGlvbiBtYXRjaGVzLCBjYWxsICdjYWxsYmFjaycsIHBhc3NpbmdcbiAgLy8gdGhlIGFjdHVhbCBub3RpZmljYXRpb24uXG4gIC8vXG4gIC8vIFJldHVybnMgYSBsaXN0ZW4gaGFuZGxlLCB3aGljaCBpcyBhbiBvYmplY3Qgd2l0aCBhIG1ldGhvZFxuICAvLyBzdG9wKCkuIENhbGwgc3RvcCgpIHRvIHN0b3AgbGlzdGVuaW5nLlxuICAvL1xuICAvLyBYWFggSXQgc2hvdWxkIGJlIGxlZ2FsIHRvIGNhbGwgZmlyZSgpIGZyb20gaW5zaWRlIGEgbGlzdGVuKClcbiAgLy8gY2FsbGJhY2s/XG4gIGxpc3RlbjogZnVuY3Rpb24gKHRyaWdnZXIsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBpZCA9IHNlbGYubmV4dElkKys7XG5cbiAgICB2YXIgY29sbGVjdGlvbiA9IHNlbGYuX2NvbGxlY3Rpb25Gb3JNZXNzYWdlKHRyaWdnZXIpO1xuICAgIHZhciByZWNvcmQgPSB7dHJpZ2dlcjogRUpTT04uY2xvbmUodHJpZ2dlciksIGNhbGxiYWNrOiBjYWxsYmFja307XG4gICAgaWYgKCEgXy5oYXMoc2VsZi5saXN0ZW5lcnNCeUNvbGxlY3Rpb24sIGNvbGxlY3Rpb24pKSB7XG4gICAgICBzZWxmLmxpc3RlbmVyc0J5Q29sbGVjdGlvbltjb2xsZWN0aW9uXSA9IHt9O1xuICAgICAgc2VsZi5saXN0ZW5lcnNCeUNvbGxlY3Rpb25Db3VudFtjb2xsZWN0aW9uXSA9IDA7XG4gICAgfVxuICAgIHNlbGYubGlzdGVuZXJzQnlDb2xsZWN0aW9uW2NvbGxlY3Rpb25dW2lkXSA9IHJlY29yZDtcbiAgICBzZWxmLmxpc3RlbmVyc0J5Q29sbGVjdGlvbkNvdW50W2NvbGxlY3Rpb25dKys7XG5cbiAgICBpZiAoc2VsZi5mYWN0TmFtZSAmJiBQYWNrYWdlWydmYWN0cy1iYXNlJ10pIHtcbiAgICAgIFBhY2thZ2VbJ2ZhY3RzLWJhc2UnXS5GYWN0cy5pbmNyZW1lbnRTZXJ2ZXJGYWN0KFxuICAgICAgICBzZWxmLmZhY3RQYWNrYWdlLCBzZWxmLmZhY3ROYW1lLCAxKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgc3RvcDogZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoc2VsZi5mYWN0TmFtZSAmJiBQYWNrYWdlWydmYWN0cy1iYXNlJ10pIHtcbiAgICAgICAgICBQYWNrYWdlWydmYWN0cy1iYXNlJ10uRmFjdHMuaW5jcmVtZW50U2VydmVyRmFjdChcbiAgICAgICAgICAgIHNlbGYuZmFjdFBhY2thZ2UsIHNlbGYuZmFjdE5hbWUsIC0xKTtcbiAgICAgICAgfVxuICAgICAgICBkZWxldGUgc2VsZi5saXN0ZW5lcnNCeUNvbGxlY3Rpb25bY29sbGVjdGlvbl1baWRdO1xuICAgICAgICBzZWxmLmxpc3RlbmVyc0J5Q29sbGVjdGlvbkNvdW50W2NvbGxlY3Rpb25dLS07XG4gICAgICAgIGlmIChzZWxmLmxpc3RlbmVyc0J5Q29sbGVjdGlvbkNvdW50W2NvbGxlY3Rpb25dID09PSAwKSB7XG4gICAgICAgICAgZGVsZXRlIHNlbGYubGlzdGVuZXJzQnlDb2xsZWN0aW9uW2NvbGxlY3Rpb25dO1xuICAgICAgICAgIGRlbGV0ZSBzZWxmLmxpc3RlbmVyc0J5Q29sbGVjdGlvbkNvdW50W2NvbGxlY3Rpb25dO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcbiAgfSxcblxuICAvLyBGaXJlIHRoZSBwcm92aWRlZCAnbm90aWZpY2F0aW9uJyAoYW4gb2JqZWN0IHdob3NlIGF0dHJpYnV0ZVxuICAvLyB2YWx1ZXMgYXJlIGFsbCBKU09OLWNvbXBhdGliaWxlKSAtLSBpbmZvcm0gYWxsIG1hdGNoaW5nIGxpc3RlbmVyc1xuICAvLyAocmVnaXN0ZXJlZCB3aXRoIGxpc3RlbigpKS5cbiAgLy9cbiAgLy8gSWYgZmlyZSgpIGlzIGNhbGxlZCBpbnNpZGUgYSB3cml0ZSBmZW5jZSwgdGhlbiBlYWNoIG9mIHRoZVxuICAvLyBsaXN0ZW5lciBjYWxsYmFja3Mgd2lsbCBiZSBjYWxsZWQgaW5zaWRlIHRoZSB3cml0ZSBmZW5jZSBhcyB3ZWxsLlxuICAvL1xuICAvLyBUaGUgbGlzdGVuZXJzIG1heSBiZSBpbnZva2VkIGluIHBhcmFsbGVsLCByYXRoZXIgdGhhbiBzZXJpYWxseS5cbiAgZmlyZTogZnVuY3Rpb24gKG5vdGlmaWNhdGlvbikge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHZhciBjb2xsZWN0aW9uID0gc2VsZi5fY29sbGVjdGlvbkZvck1lc3NhZ2Uobm90aWZpY2F0aW9uKTtcblxuICAgIGlmICghIF8uaGFzKHNlbGYubGlzdGVuZXJzQnlDb2xsZWN0aW9uLCBjb2xsZWN0aW9uKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBsaXN0ZW5lcnNGb3JDb2xsZWN0aW9uID0gc2VsZi5saXN0ZW5lcnNCeUNvbGxlY3Rpb25bY29sbGVjdGlvbl07XG4gICAgdmFyIGNhbGxiYWNrSWRzID0gW107XG4gICAgXy5lYWNoKGxpc3RlbmVyc0ZvckNvbGxlY3Rpb24sIGZ1bmN0aW9uIChsLCBpZCkge1xuICAgICAgaWYgKHNlbGYuX21hdGNoZXMobm90aWZpY2F0aW9uLCBsLnRyaWdnZXIpKSB7XG4gICAgICAgIGNhbGxiYWNrSWRzLnB1c2goaWQpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gTGlzdGVuZXIgY2FsbGJhY2tzIGNhbiB5aWVsZCwgc28gd2UgbmVlZCB0byBmaXJzdCBmaW5kIGFsbCB0aGUgb25lcyB0aGF0XG4gICAgLy8gbWF0Y2ggaW4gYSBzaW5nbGUgaXRlcmF0aW9uIG92ZXIgc2VsZi5saXN0ZW5lcnNCeUNvbGxlY3Rpb24gKHdoaWNoIGNhbid0XG4gICAgLy8gYmUgbXV0YXRlZCBkdXJpbmcgdGhpcyBpdGVyYXRpb24pLCBhbmQgdGhlbiBpbnZva2UgdGhlIG1hdGNoaW5nXG4gICAgLy8gY2FsbGJhY2tzLCBjaGVja2luZyBiZWZvcmUgZWFjaCBjYWxsIHRvIGVuc3VyZSB0aGV5IGhhdmVuJ3Qgc3RvcHBlZC5cbiAgICAvLyBOb3RlIHRoYXQgd2UgZG9uJ3QgaGF2ZSB0byBjaGVjayB0aGF0XG4gICAgLy8gc2VsZi5saXN0ZW5lcnNCeUNvbGxlY3Rpb25bY29sbGVjdGlvbl0gc3RpbGwgPT09IGxpc3RlbmVyc0ZvckNvbGxlY3Rpb24sXG4gICAgLy8gYmVjYXVzZSB0aGUgb25seSB3YXkgdGhhdCBzdG9wcyBiZWluZyB0cnVlIGlzIGlmIGxpc3RlbmVyc0ZvckNvbGxlY3Rpb25cbiAgICAvLyBmaXJzdCBnZXRzIHJlZHVjZWQgZG93biB0byB0aGUgZW1wdHkgb2JqZWN0IChhbmQgdGhlbiBuZXZlciBnZXRzXG4gICAgLy8gaW5jcmVhc2VkIGFnYWluKS5cbiAgICBfLmVhY2goY2FsbGJhY2tJZHMsIGZ1bmN0aW9uIChpZCkge1xuICAgICAgaWYgKF8uaGFzKGxpc3RlbmVyc0ZvckNvbGxlY3Rpb24sIGlkKSkge1xuICAgICAgICBsaXN0ZW5lcnNGb3JDb2xsZWN0aW9uW2lkXS5jYWxsYmFjayhub3RpZmljYXRpb24pO1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuXG4gIC8vIEEgbm90aWZpY2F0aW9uIG1hdGNoZXMgYSB0cmlnZ2VyIGlmIGFsbCBrZXlzIHRoYXQgZXhpc3QgaW4gYm90aCBhcmUgZXF1YWwuXG4gIC8vXG4gIC8vIEV4YW1wbGVzOlxuICAvLyAgTjp7Y29sbGVjdGlvbjogXCJDXCJ9IG1hdGNoZXMgVDp7Y29sbGVjdGlvbjogXCJDXCJ9XG4gIC8vICAgIChhIG5vbi10YXJnZXRlZCB3cml0ZSB0byBhIGNvbGxlY3Rpb24gbWF0Y2hlcyBhXG4gIC8vICAgICBub24tdGFyZ2V0ZWQgcXVlcnkpXG4gIC8vICBOOntjb2xsZWN0aW9uOiBcIkNcIiwgaWQ6IFwiWFwifSBtYXRjaGVzIFQ6e2NvbGxlY3Rpb246IFwiQ1wifVxuICAvLyAgICAoYSB0YXJnZXRlZCB3cml0ZSB0byBhIGNvbGxlY3Rpb24gbWF0Y2hlcyBhIG5vbi10YXJnZXRlZCBxdWVyeSlcbiAgLy8gIE46e2NvbGxlY3Rpb246IFwiQ1wifSBtYXRjaGVzIFQ6e2NvbGxlY3Rpb246IFwiQ1wiLCBpZDogXCJYXCJ9XG4gIC8vICAgIChhIG5vbi10YXJnZXRlZCB3cml0ZSB0byBhIGNvbGxlY3Rpb24gbWF0Y2hlcyBhXG4gIC8vICAgICB0YXJnZXRlZCBxdWVyeSlcbiAgLy8gIE46e2NvbGxlY3Rpb246IFwiQ1wiLCBpZDogXCJYXCJ9IG1hdGNoZXMgVDp7Y29sbGVjdGlvbjogXCJDXCIsIGlkOiBcIlhcIn1cbiAgLy8gICAgKGEgdGFyZ2V0ZWQgd3JpdGUgdG8gYSBjb2xsZWN0aW9uIG1hdGNoZXMgYSB0YXJnZXRlZCBxdWVyeSB0YXJnZXRlZFxuICAvLyAgICAgYXQgdGhlIHNhbWUgZG9jdW1lbnQpXG4gIC8vICBOOntjb2xsZWN0aW9uOiBcIkNcIiwgaWQ6IFwiWFwifSBkb2VzIG5vdCBtYXRjaCBUOntjb2xsZWN0aW9uOiBcIkNcIiwgaWQ6IFwiWVwifVxuICAvLyAgICAoYSB0YXJnZXRlZCB3cml0ZSB0byBhIGNvbGxlY3Rpb24gZG9lcyBub3QgbWF0Y2ggYSB0YXJnZXRlZCBxdWVyeVxuICAvLyAgICAgdGFyZ2V0ZWQgYXQgYSBkaWZmZXJlbnQgZG9jdW1lbnQpXG4gIF9tYXRjaGVzOiBmdW5jdGlvbiAobm90aWZpY2F0aW9uLCB0cmlnZ2VyKSB7XG4gICAgLy8gTW9zdCBub3RpZmljYXRpb25zIHRoYXQgdXNlIHRoZSBjcm9zc2JhciBoYXZlIGEgc3RyaW5nIGBjb2xsZWN0aW9uYCBhbmRcbiAgICAvLyBtYXliZSBhbiBgaWRgIHRoYXQgaXMgYSBzdHJpbmcgb3IgT2JqZWN0SUQuIFdlJ3JlIGFscmVhZHkgZGl2aWRpbmcgdXBcbiAgICAvLyB0cmlnZ2VycyBieSBjb2xsZWN0aW9uLCBidXQgbGV0J3MgZmFzdC10cmFjayBcIm5vcGUsIGRpZmZlcmVudCBJRFwiIChhbmRcbiAgICAvLyBhdm9pZCB0aGUgb3Zlcmx5IGdlbmVyaWMgRUpTT04uZXF1YWxzKS4gVGhpcyBtYWtlcyBhIG5vdGljZWFibGVcbiAgICAvLyBwZXJmb3JtYW5jZSBkaWZmZXJlbmNlOyBzZWUgaHR0cHM6Ly9naXRodWIuY29tL21ldGVvci9tZXRlb3IvcHVsbC8zNjk3XG4gICAgaWYgKHR5cGVvZihub3RpZmljYXRpb24uaWQpID09PSAnc3RyaW5nJyAmJlxuICAgICAgICB0eXBlb2YodHJpZ2dlci5pZCkgPT09ICdzdHJpbmcnICYmXG4gICAgICAgIG5vdGlmaWNhdGlvbi5pZCAhPT0gdHJpZ2dlci5pZCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAobm90aWZpY2F0aW9uLmlkIGluc3RhbmNlb2YgTW9uZ29JRC5PYmplY3RJRCAmJlxuICAgICAgICB0cmlnZ2VyLmlkIGluc3RhbmNlb2YgTW9uZ29JRC5PYmplY3RJRCAmJlxuICAgICAgICAhIG5vdGlmaWNhdGlvbi5pZC5lcXVhbHModHJpZ2dlci5pZCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gXy5hbGwodHJpZ2dlciwgZnVuY3Rpb24gKHRyaWdnZXJWYWx1ZSwga2V5KSB7XG4gICAgICByZXR1cm4gIV8uaGFzKG5vdGlmaWNhdGlvbiwga2V5KSB8fFxuICAgICAgICBFSlNPTi5lcXVhbHModHJpZ2dlclZhbHVlLCBub3RpZmljYXRpb25ba2V5XSk7XG4gICAgfSk7XG4gIH1cbn0pO1xuXG4vLyBUaGUgXCJpbnZhbGlkYXRpb24gY3Jvc3NiYXJcIiBpcyBhIHNwZWNpZmljIGluc3RhbmNlIHVzZWQgYnkgdGhlIEREUCBzZXJ2ZXIgdG9cbi8vIGltcGxlbWVudCB3cml0ZSBmZW5jZSBub3RpZmljYXRpb25zLiBMaXN0ZW5lciBjYWxsYmFja3Mgb24gdGhpcyBjcm9zc2JhclxuLy8gc2hvdWxkIGNhbGwgYmVnaW5Xcml0ZSBvbiB0aGUgY3VycmVudCB3cml0ZSBmZW5jZSBiZWZvcmUgdGhleSByZXR1cm4sIGlmIHRoZXlcbi8vIHdhbnQgdG8gZGVsYXkgdGhlIHdyaXRlIGZlbmNlIGZyb20gZmlyaW5nIChpZSwgdGhlIEREUCBtZXRob2QtZGF0YS11cGRhdGVkXG4vLyBtZXNzYWdlIGZyb20gYmVpbmcgc2VudCkuXG5ERFBTZXJ2ZXIuX0ludmFsaWRhdGlvbkNyb3NzYmFyID0gbmV3IEREUFNlcnZlci5fQ3Jvc3NiYXIoe1xuICBmYWN0TmFtZTogXCJpbnZhbGlkYXRpb24tY3Jvc3NiYXItbGlzdGVuZXJzXCJcbn0pO1xuIiwiaWYgKHByb2Nlc3MuZW52LkREUF9ERUZBVUxUX0NPTk5FQ1RJT05fVVJMKSB7XG4gIF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18uRERQX0RFRkFVTFRfQ09OTkVDVElPTl9VUkwgPVxuICAgIHByb2Nlc3MuZW52LkREUF9ERUZBVUxUX0NPTk5FQ1RJT05fVVJMO1xufVxuXG5NZXRlb3Iuc2VydmVyID0gbmV3IFNlcnZlcjtcblxuTWV0ZW9yLnJlZnJlc2ggPSBmdW5jdGlvbiAobm90aWZpY2F0aW9uKSB7XG4gIEREUFNlcnZlci5fSW52YWxpZGF0aW9uQ3Jvc3NiYXIuZmlyZShub3RpZmljYXRpb24pO1xufTtcblxuLy8gUHJveHkgdGhlIHB1YmxpYyBtZXRob2RzIG9mIE1ldGVvci5zZXJ2ZXIgc28gdGhleSBjYW5cbi8vIGJlIGNhbGxlZCBkaXJlY3RseSBvbiBNZXRlb3IuXG5fLmVhY2goXG4gIFtcbiAgICAncHVibGlzaCcsXG4gICAgJ21ldGhvZHMnLFxuICAgICdjYWxsJyxcbiAgICAnY2FsbEFzeW5jJyxcbiAgICAnYXBwbHknLFxuICAgICdhcHBseUFzeW5jJyxcbiAgICAnb25Db25uZWN0aW9uJyxcbiAgICAnb25NZXNzYWdlJyxcbiAgXSxcbiAgZnVuY3Rpb24obmFtZSkge1xuICAgIE1ldGVvcltuYW1lXSA9IF8uYmluZChNZXRlb3Iuc2VydmVyW25hbWVdLCBNZXRlb3Iuc2VydmVyKTtcbiAgfVxuKTtcbiJdfQ==
