(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var MongoInternals = Package.mongo.MongoInternals;
var Mongo = Package.mongo.Mongo;
var LocalCollection = Package.minimongo.LocalCollection;
var Minimongo = Package.minimongo.Minimongo;
var DDP = Package['ddp-client'].DDP;
var DDPServer = Package['ddp-server'].DDPServer;
var EJSON = Package.ejson.EJSON;
var DDPCommon = Package['ddp-common'].DDPCommon;
var _ = Package.underscore._;
var HTTP = Package.http.HTTP;
var HTTPInternals = Package.http.HTTPInternals;
var Email = Package.email.Email;
var EmailInternals = Package.email.EmailInternals;
var Random = Package.random.Random;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var Kadira, BaseErrorModel, Retry, HaveAsyncCallback, UniqueId, DefaultUniqueId, OptimizedApply, Ntp, WaitTimeBuilder, OplogCheck, Tracer, TracerStore, KadiraModel, MethodsModel, PubsubModel, SystemModel, ErrorModel, DocSzCache, DocSzCacheItem, wrapServer, wrapSession, wrapSubscription, wrapOplogObserveDriver, wrapPollingObserveDriver, wrapMultiplexer, wrapForCountingObservers, wrapStringifyDDP, hijackDBOps, TrackUncaughtExceptions, TrackMeteorDebug, setLabels;

var require = meteorInstall({"node_modules":{"meteor":{"mdg:meteor-apm-agent":{"lib":{"common":{"unify.js":function module(require){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/mdg_meteor-apm-agent/lib/common/unify.js                                                                  //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
Kadira = {};
Kadira.options = {};
if (Meteor.wrapAsync) {
  Kadira._wrapAsync = Meteor.wrapAsync;
} else {
  Kadira._wrapAsync = Meteor._wrapAsync;
}
if (Meteor.isServer) {
  var EventEmitter = Npm.require('events').EventEmitter;
  var eventBus = new EventEmitter();
  eventBus.setMaxListeners(0);
  var buildArgs = function (args) {
    args = _.toArray(args);
    var eventName = args[0] + '-' + args[1];
    var args = args.slice(2);
    args.unshift(eventName);
    return args;
  };
  Kadira.EventBus = {};
  ['on', 'emit', 'removeListener', 'removeAllListeners'].forEach(function (m) {
    Kadira.EventBus[m] = function () {
      var args = buildArgs(arguments);
      return eventBus[m].apply(eventBus, args);
    };
  });
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"default_error_filters.js":function module(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/mdg_meteor-apm-agent/lib/common/default_error_filters.js                                                  //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
var commonErrRegExps = [/connection timeout\. no (\w*) heartbeat received/i, /INVALID_STATE_ERR/i];
Kadira.errorFilters = {
  filterValidationErrors: function (type, message, err) {
    if (err && err instanceof Meteor.Error) {
      return false;
    } else {
      return true;
    }
  },
  filterCommonMeteorErrors: function (type, message) {
    for (var lc = 0; lc < commonErrRegExps.length; lc++) {
      var regExp = commonErrRegExps[lc];
      if (regExp.test(message)) {
        return false;
      }
    }
    return true;
  }
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"send.js":function module(require){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/mdg_meteor-apm-agent/lib/common/send.js                                                                   //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
Kadira.send = function (payload, path, callback) {
  if (!Kadira.connected) {
    throw new Error("You need to connect with Kadira first, before sending messages!");
  }
  path = path.substr(0, 1) != '/' ? "/" + path : path;
  var endpoint = Kadira.options.endpoint + path;
  var retryCount = 0;
  var retry = new Retry({
    minCount: 1,
    minTimeout: 0,
    baseTimeout: 1000 * 5,
    maxTimeout: 1000 * 60
  });
  var sendFunction = Kadira._getSendFunction();
  tryToSend();
  function tryToSend(err) {
    if (retryCount < 5) {
      retry.retryLater(retryCount++, send);
    } else {
      console.warn('Error sending error traces to Kadira server');
      if (callback) callback(err);
    }
  }
  function send() {
    sendFunction(endpoint, payload, function (err, content, statusCode) {
      if (err) {
        tryToSend(err);
      } else if (statusCode == 200) {
        if (callback) callback(null, content);
      } else {
        if (callback) callback(new Meteor.Error(statusCode, content));
      }
    });
  }
};
Kadira._getSendFunction = function () {
  return Meteor.isServer ? Kadira._serverSend : Kadira._clientSend;
};
Kadira._clientSend = function (endpoint, payload, callback) {
  httpRequest('POST', endpoint, {
    headers: {
      'Content-Type': 'application/json'
    },
    content: JSON.stringify(payload)
  }, callback);
};
Kadira._serverSend = function (endpoint, payload, callback) {
  callback = callback || function () {};
  var Fiber = Npm.require('fibers');
  new Fiber(function () {
    var httpOptions = {
      data: payload,
      headers: Kadira.options.authHeaders
    };
    HTTP.call('POST', endpoint, httpOptions, function (err, res) {
      if (res) {
        var content = res.statusCode == 200 ? res.data : res.content;
        callback(null, content, res.statusCode);
      } else {
        callback(err);
      }
    });
  }).run();
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"models":{"base_error.js":function module(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/mdg_meteor-apm-agent/lib/models/base_error.js                                                             //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
BaseErrorModel = function (options) {
  this._filters = [];
};
BaseErrorModel.prototype.addFilter = function (filter) {
  if (typeof filter === 'function') {
    this._filters.push(filter);
  } else {
    throw new Error("Error filter must be a function");
  }
};
BaseErrorModel.prototype.removeFilter = function (filter) {
  var index = this._filters.indexOf(filter);
  if (index >= 0) {
    this._filters.splice(index, 1);
  }
};
BaseErrorModel.prototype.applyFilters = function (type, message, error, subType) {
  for (var lc = 0; lc < this._filters.length; lc++) {
    var filter = this._filters[lc];
    try {
      var validated = filter(type, message, error, subType);
      if (!validated) return false;
    } catch (ex) {
      // we need to remove this filter
      // we may ended up in a error cycle
      this._filters.splice(lc, 1);
      throw new Error("an error thrown from a filter you've suplied", ex.message);
    }
  }
  return true;
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"0model.js":function module(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/mdg_meteor-apm-agent/lib/models/0model.js                                                                 //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
KadiraModel = function () {};
KadiraModel.prototype._getDateId = function (timestamp) {
  var remainder = timestamp % (1000 * 60);
  var dateId = timestamp - remainder;
  return dateId;
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"methods.js":function module(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/mdg_meteor-apm-agent/lib/models/methods.js                                                                //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
var METHOD_METRICS_FIELDS = ['wait', 'db', 'http', 'email', 'async', 'compute', 'total'];
MethodsModel = function (metricsThreshold) {
  var self = this;
  this.methodMetricsByMinute = Object.create(null);
  this.errorMap = Object.create(null);
  this._metricsThreshold = Object.assign({
    "wait": 100,
    "db": 100,
    "http": 1000,
    "email": 100,
    "async": 100,
    "compute": 100,
    "total": 200
  }, metricsThreshold || Object.create(null));

  //store max time elapsed methods for each method, event(metrics-field)
  this.maxEventTimesForMethods = Object.create(null);
  this.tracerStore = new TracerStore({
    interval: 1000 * 60,
    //process traces every minute
    maxTotalPoints: 30,
    //for 30 minutes
    archiveEvery: 5 //always trace for every 5 minutes,
  });
  this.tracerStore.start();
};
Object.assign(MethodsModel.prototype, KadiraModel.prototype);
MethodsModel.prototype._getMetrics = function (timestamp, method) {
  var dateId = this._getDateId(timestamp);
  if (!this.methodMetricsByMinute[dateId]) {
    this.methodMetricsByMinute[dateId] = {
      methods: Object.create(null)
    };
  }
  var methods = this.methodMetricsByMinute[dateId].methods;

  //initialize method
  if (!methods[method]) {
    methods[method] = {
      count: 0,
      errors: 0,
      fetchedDocSize: 0,
      sentMsgSize: 0
    };
    METHOD_METRICS_FIELDS.forEach(function (field) {
      methods[method][field] = 0;
    });
  }
  return this.methodMetricsByMinute[dateId].methods[method];
};
MethodsModel.prototype.setStartTime = function (timestamp) {
  this.metricsByMinute[dateId].startTime = timestamp;
};
MethodsModel.prototype.processMethod = function (methodTrace) {
  var dateId = this._getDateId(methodTrace.at);

  //append metrics to previous values
  this._appendMetrics(dateId, methodTrace);
  if (methodTrace.errored) {
    this.methodMetricsByMinute[dateId].methods[methodTrace.name].errors++;
  }
  this.tracerStore.addTrace(methodTrace);
};
MethodsModel.prototype._appendMetrics = function (id, methodTrace) {
  var methodMetrics = this._getMetrics(id, methodTrace.name);

  // startTime needs to be converted into serverTime before sending
  if (!this.methodMetricsByMinute[id].startTime) {
    this.methodMetricsByMinute[id].startTime = methodTrace.at;
  }

  //merge
  METHOD_METRICS_FIELDS.forEach(function (field) {
    var value = methodTrace.metrics[field];
    if (value > 0) {
      methodMetrics[field] += value;
    }
  });
  methodMetrics.count++;
  this.methodMetricsByMinute[id].endTime = methodTrace.metrics.at;
};
MethodsModel.prototype.trackDocSize = function (method, size) {
  var timestamp = Ntp._now();
  var dateId = this._getDateId(timestamp);
  var methodMetrics = this._getMetrics(dateId, method);
  methodMetrics.fetchedDocSize += size;
};
MethodsModel.prototype.trackMsgSize = function (method, size) {
  var timestamp = Ntp._now();
  var dateId = this._getDateId(timestamp);
  var methodMetrics = this._getMetrics(dateId, method);
  methodMetrics.sentMsgSize += size;
};

/*
  There are two types of data

  1. methodMetrics - metrics about the methods (for every 10 secs)
  2. methodRequests - raw method request. normally max, min for every 1 min and errors always
*/
MethodsModel.prototype.buildPayload = function (buildDetailedInfo) {
  var payload = {
    methodMetrics: [],
    methodRequests: []
  };

  //handling metrics
  var methodMetricsByMinute = this.methodMetricsByMinute;
  this.methodMetricsByMinute = Object.create(null);

  //create final paylod for methodMetrics
  for (var key in methodMetricsByMinute) {
    var methodMetrics = methodMetricsByMinute[key];
    // converting startTime into the actual serverTime
    var startTime = methodMetrics.startTime;
    methodMetrics.startTime = Kadira.syncedDate.syncTime(startTime);
    for (var methodName in methodMetrics.methods) {
      METHOD_METRICS_FIELDS.forEach(function (field) {
        methodMetrics.methods[methodName][field] /= methodMetrics.methods[methodName].count;
      });
    }
    payload.methodMetrics.push(methodMetricsByMinute[key]);
  }

  //collect traces and send them with the payload
  payload.methodRequests = this.tracerStore.collectTraces();
  return payload;
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"pubsub.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/mdg_meteor-apm-agent/lib/models/pubsub.js                                                                 //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
let size, each, get;
module.link("../utils.js", {
  size(v) {
    size = v;
  },
  each(v) {
    each = v;
  },
  get(v) {
    get = v;
  }
}, 0);
var logger = Npm.require('debug')('kadira:pubsub');
PubsubModel = function () {
  this.metricsByMinute = Object.create(null);
  this.subscriptions = Object.create(null);
  this.tracerStore = new TracerStore({
    interval: 1000 * 60,
    //process traces every minute
    maxTotalPoints: 30,
    //for 30 minutes
    archiveEvery: 5 //always trace for every 5 minutes,
  });
  this.tracerStore.start();
};
PubsubModel.prototype._trackSub = function (session, msg) {
  logger('SUB:', session.id, msg.id, msg.name, msg.params);
  var publication = this._getPublicationName(msg.name);
  var subscriptionId = msg.id;
  var timestamp = Ntp._now();
  var metrics = this._getMetrics(timestamp, publication);
  metrics.subs++;
  this.subscriptions[msg.id] = {
    // We use localTime here, because when we used synedTime we might get
    // minus or more than we've expected
    //   (before serverTime diff changed overtime)
    startTime: timestamp,
    publication: publication,
    params: msg.params,
    id: msg.id
  };

  //set session startedTime
  session._startTime = session._startTime || timestamp;
};
Object.assign(PubsubModel.prototype, KadiraModel.prototype);
PubsubModel.prototype._trackUnsub = function (session, sub) {
  logger('UNSUB:', session.id, sub._subscriptionId);
  var publication = this._getPublicationName(sub._name);
  var subscriptionId = sub._subscriptionId;
  var subscriptionState = this.subscriptions[subscriptionId];
  var startTime = null;
  //sometime, we don't have these states
  if (subscriptionState) {
    startTime = subscriptionState.startTime;
  } else {
    //if this is null subscription, which is started automatically
    //hence, we don't have a state
    startTime = session._startTime;
  }

  //in case, we can't get the startTime
  if (startTime) {
    var timestamp = Ntp._now();
    var metrics = this._getMetrics(timestamp, publication);
    //track the count
    if (sub._name != null) {
      // we can't track subs for `null` publications.
      // so we should not track unsubs too
      metrics.unsubs++;
    }
    //use the current date to get the lifeTime of the subscription
    metrics.lifeTime += timestamp - startTime;
    //this is place we can clean the subscriptionState if exists
    delete this.subscriptions[subscriptionId];
  }
};
PubsubModel.prototype._trackReady = function (session, sub, trace) {
  logger('READY:', session.id, sub._subscriptionId);
  //use the current time to track the response time
  var publication = this._getPublicationName(sub._name);
  var subscriptionId = sub._subscriptionId;
  var timestamp = Ntp._now();
  var metrics = this._getMetrics(timestamp, publication);
  var subscriptionState = this.subscriptions[subscriptionId];
  if (subscriptionState && !subscriptionState.readyTracked) {
    metrics.resTime += timestamp - subscriptionState.startTime;
    subscriptionState.readyTracked = true;
  }
  if (trace) {
    this.tracerStore.addTrace(trace);
  }
};
PubsubModel.prototype._trackError = function (session, sub, trace) {
  logger('ERROR:', session.id, sub._subscriptionId);
  //use the current time to track the response time
  var publication = this._getPublicationName(sub._name);
  var subscriptionId = sub._subscriptionId;
  var timestamp = Ntp._now();
  var metrics = this._getMetrics(timestamp, publication);
  metrics.errors++;
  if (trace) {
    this.tracerStore.addTrace(trace);
  }
};
PubsubModel.prototype._getMetrics = function (timestamp, publication) {
  var dateId = this._getDateId(timestamp);
  if (!this.metricsByMinute[dateId]) {
    this.metricsByMinute[dateId] = {
      // startTime needs to be convert to serverTime before sending to the server
      startTime: timestamp,
      pubs: Object.create(null)
    };
  }
  if (!this.metricsByMinute[dateId].pubs[publication]) {
    this.metricsByMinute[dateId].pubs[publication] = {
      subs: 0,
      unsubs: 0,
      resTime: 0,
      activeSubs: 0,
      activeDocs: 0,
      lifeTime: 0,
      totalObservers: 0,
      cachedObservers: 0,
      createdObservers: 0,
      deletedObservers: 0,
      errors: 0,
      observerLifetime: 0,
      polledDocuments: 0,
      oplogUpdatedDocuments: 0,
      oplogInsertedDocuments: 0,
      oplogDeletedDocuments: 0,
      initiallyAddedDocuments: 0,
      liveAddedDocuments: 0,
      liveChangedDocuments: 0,
      liveRemovedDocuments: 0,
      polledDocSize: 0,
      fetchedDocSize: 0,
      initiallyFetchedDocSize: 0,
      liveFetchedDocSize: 0,
      initiallySentMsgSize: 0,
      liveSentMsgSize: 0
    };
  }
  return this.metricsByMinute[dateId].pubs[publication];
};
PubsubModel.prototype._getPublicationName = function (name) {
  return name || "null(autopublish)";
};
PubsubModel.prototype._getSubscriptionInfo = function () {
  var self = this;
  var activeSubs = Object.create(null);
  var activeDocs = Object.create(null);
  var totalDocsSent = Object.create(null);
  var totalDataSent = Object.create(null);
  var totalObservers = Object.create(null);
  var cachedObservers = Object.create(null);
  each(Meteor.server.sessions, session => {
    each(session._namedSubs, countSubData);
    each(session._universalSubs, countSubData);
  });
  var avgObserverReuse = Object.create(null);
  _.each(totalObservers, function (value, publication) {
    avgObserverReuse[publication] = cachedObservers[publication] / totalObservers[publication];
  });
  return {
    activeSubs: activeSubs,
    activeDocs: activeDocs,
    avgObserverReuse: avgObserverReuse
  };
  function countSubData(sub) {
    var publication = self._getPublicationName(sub._name);
    countSubscriptions(sub, publication);
    countDocuments(sub, publication);
    countObservers(sub, publication);
  }
  function countSubscriptions(sub, publication) {
    activeSubs[publication] = activeSubs[publication] || 0;
    activeSubs[publication]++;
  }
  function countDocuments(sub, publication) {
    activeDocs[publication] = activeDocs[publication] || 0;
    each(sub._documents, document => {
      activeDocs[publication] += size(document);
    });
  }
  function countObservers(sub, publication) {
    totalObservers[publication] = totalObservers[publication] || 0;
    cachedObservers[publication] = cachedObservers[publication] || 0;
    totalObservers[publication] += sub._totalObservers;
    cachedObservers[publication] += sub._cachedObservers;
  }
};
PubsubModel.prototype.buildPayload = function (buildDetailInfo) {
  var metricsByMinute = this.metricsByMinute;
  this.metricsByMinute = Object.create(null);
  var payload = {
    pubMetrics: []
  };
  var subscriptionData = this._getSubscriptionInfo();
  var activeSubs = subscriptionData.activeSubs;
  var activeDocs = subscriptionData.activeDocs;
  var avgObserverReuse = subscriptionData.avgObserverReuse;

  //to the averaging
  for (var dateId in metricsByMinute) {
    var dateMetrics = metricsByMinute[dateId];
    // We need to convert startTime into actual serverTime
    dateMetrics.startTime = Kadira.syncedDate.syncTime(dateMetrics.startTime);
    for (var publication in metricsByMinute[dateId].pubs) {
      var singlePubMetrics = metricsByMinute[dateId].pubs[publication];
      // We only calculate resTime for new subscriptions
      singlePubMetrics.resTime /= singlePubMetrics.subs;
      singlePubMetrics.resTime = singlePubMetrics.resTime || 0;
      // We only track lifeTime in the unsubs
      singlePubMetrics.lifeTime /= singlePubMetrics.unsubs;
      singlePubMetrics.lifeTime = singlePubMetrics.lifeTime || 0;

      // Count the average for observer lifetime
      if (singlePubMetrics.deletedObservers > 0) {
        singlePubMetrics.observerLifetime /= singlePubMetrics.deletedObservers;
      }

      // If there are two ore more dateIds, we will be using the currentCount for all of them.
      // We can come up with a better solution later on.
      singlePubMetrics.activeSubs = activeSubs[publication] || 0;
      singlePubMetrics.activeDocs = activeDocs[publication] || 0;
      singlePubMetrics.avgObserverReuse = avgObserverReuse[publication] || 0;
    }
    payload.pubMetrics.push(metricsByMinute[dateId]);
  }

  //collect traces and send them with the payload
  payload.pubRequests = this.tracerStore.collectTraces();
  return payload;
};
PubsubModel.prototype.incrementHandleCount = function (trace, isCached) {
  var timestamp = Ntp._now();
  var publicationName = this._getPublicationName(trace.name);
  var publication = this._getMetrics(timestamp, publicationName);
  var session = get(Meteor.server.sessions, trace.session);
  if (session) {
    var sub = get(session._namedSubs, trace.id);
    if (sub) {
      sub._totalObservers = sub._totalObservers || 0;
      sub._cachedObservers = sub._cachedObservers || 0;
    }
  }
  // not sure, we need to do this? But I don't need to break the however
  sub = sub || {
    _totalObservers: 0,
    _cachedObservers: 0
  };
  publication.totalObservers++;
  sub._totalObservers++;
  if (isCached) {
    publication.cachedObservers++;
    sub._cachedObservers++;
  }
};
PubsubModel.prototype.trackCreatedObserver = function (info) {
  var timestamp = Ntp._now();
  var publicationName = this._getPublicationName(info.name);
  var publication = this._getMetrics(timestamp, publicationName);
  publication.createdObservers++;
};
PubsubModel.prototype.trackDeletedObserver = function (info) {
  var timestamp = Ntp._now();
  var publicationName = this._getPublicationName(info.name);
  var publication = this._getMetrics(timestamp, publicationName);
  publication.deletedObservers++;
  publication.observerLifetime += new Date().getTime() - info.startTime;
};
PubsubModel.prototype.trackDocumentChanges = function (info, op) {
  // It's possibel that info to be null
  // Specially when getting changes at the very begining.
  // This may be false, but nice to have a check
  if (!info) {
    return;
  }
  var timestamp = Ntp._now();
  var publicationName = this._getPublicationName(info.name);
  var publication = this._getMetrics(timestamp, publicationName);
  if (op.op === "d") {
    publication.oplogDeletedDocuments++;
  } else if (op.op === "i") {
    publication.oplogInsertedDocuments++;
  } else if (op.op === "u") {
    publication.oplogUpdatedDocuments++;
  }
};
PubsubModel.prototype.trackPolledDocuments = function (info, count) {
  var timestamp = Ntp._now();
  var publicationName = this._getPublicationName(info.name);
  var publication = this._getMetrics(timestamp, publicationName);
  publication.polledDocuments += count;
};
PubsubModel.prototype.trackLiveUpdates = function (info, type, count) {
  var timestamp = Ntp._now();
  var publicationName = this._getPublicationName(info.name);
  var publication = this._getMetrics(timestamp, publicationName);
  if (type === "_addPublished") {
    publication.liveAddedDocuments += count;
  } else if (type === "_removePublished") {
    publication.liveRemovedDocuments += count;
  } else if (type === "_changePublished") {
    publication.liveChangedDocuments += count;
  } else if (type === "_initialAdds") {
    publication.initiallyAddedDocuments += count;
  } else {
    throw new Error("Kadira: Unknown live update type");
  }
};
PubsubModel.prototype.trackDocSize = function (name, type, size) {
  var timestamp = Ntp._now();
  var publicationName = this._getPublicationName(name);
  var publication = this._getMetrics(timestamp, publicationName);
  if (type === "polledFetches") {
    publication.polledDocSize += size;
  } else if (type === "liveFetches") {
    publication.liveFetchedDocSize += size;
  } else if (type === "cursorFetches") {
    publication.fetchedDocSize += size;
  } else if (type === "initialFetches") {
    publication.initiallyFetchedDocSize += size;
  } else {
    throw new Error("Kadira: Unknown docs fetched type");
  }
};
PubsubModel.prototype.trackMsgSize = function (name, type, size) {
  var timestamp = Ntp._now();
  var publicationName = this._getPublicationName(name);
  var publication = this._getMetrics(timestamp, publicationName);
  if (type === "liveSent") {
    publication.liveSentMsgSize += size;
  } else if (type === "initialSent") {
    publication.initiallySentMsgSize += size;
  } else {
    throw new Error("Kadira: Unknown docs fetched type");
  }
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"system.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/mdg_meteor-apm-agent/lib/models/system.js                                                                 //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
let size;
module.link("../utils.js", {
  size(v) {
    size = v;
  }
}, 0);
var os = Npm.require('os');
var usage = Npm.require('pidusage');
var EventLoopMonitor = Npm.require('evloop-monitor');
SystemModel = function () {
  var self = this;
  this.startTime = Ntp._now();
  this.newSessions = 0;
  this.sessionTimeout = 1000 * 60 * 30; //30 min

  this.usageLookup = Kadira._wrapAsync(usage.stat.bind(usage));
  this.evloopMonitor = new EventLoopMonitor(200);
  this.evloopMonitor.start();
};
Object.assign(SystemModel.prototype, KadiraModel.prototype);
SystemModel.prototype.buildPayload = function () {
  var metrics = {};
  var now = Ntp._now();
  metrics.startTime = Kadira.syncedDate.syncTime(this.startTime);
  metrics.endTime = Kadira.syncedDate.syncTime(now);
  metrics.sessions = size(Meteor.server.sessions);
  metrics.memory = process.memoryUsage().rss / (1024 * 1024);
  metrics.newSessions = this.newSessions;
  this.newSessions = 0;
  var usage = this.getUsage();
  metrics.pcpu = usage.cpu;
  if (usage.cpuInfo) {
    metrics.cputime = usage.cpuInfo.cpuTime;
    metrics.pcpuUser = usage.cpuInfo.pcpuUser;
    metrics.pcpuSystem = usage.cpuInfo.pcpuSystem;
  }

  // track eventloop blockness
  metrics.pctEvloopBlock = this.evloopMonitor.status().pctBlock;
  this.startTime = now;
  return {
    systemMetrics: [metrics]
  };
};
SystemModel.prototype.getUsage = function () {
  var usage = this.usageLookup(process.pid) || {};
  Kadira.docSzCache.setPcpu(usage.cpu);
  return usage;
};
SystemModel.prototype.handleSessionActivity = function (msg, session) {
  if (msg.msg === 'connect' && !msg.session) {
    this.countNewSession(session);
  } else if (['sub', 'method'].indexOf(msg.msg) != -1) {
    if (!this.isSessionActive(session)) {
      this.countNewSession(session);
    }
  }
  session._activeAt = Date.now();
};
SystemModel.prototype.countNewSession = function (session) {
  if (!isLocalAddress(session.socket)) {
    this.newSessions++;
  }
};
SystemModel.prototype.isSessionActive = function (session) {
  var inactiveTime = Date.now() - session._activeAt;
  return inactiveTime < this.sessionTimeout;
};

// ------------------------------------------------------------------------- //

// http://regex101.com/r/iF3yR3/2
var isLocalHostRegex = /^(?:.*\.local|localhost)(?:\:\d+)?|127(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}$/;

// http://regex101.com/r/hM5gD8/1
var isLocalAddressRegex = /^127(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}$/;
function isLocalAddress(socket) {
  var host = socket.headers['host'];
  if (host) return isLocalHostRegex.test(host);
  var address = socket.headers['x-forwarded-for'] || socket.remoteAddress;
  if (address) return isLocalAddressRegex.test(address);
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"errors.js":function module(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/mdg_meteor-apm-agent/lib/models/errors.js                                                                 //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
ErrorModel = function (appId) {
  BaseErrorModel.call(this);
  var self = this;
  this.appId = appId;
  this.errors = {};
  this.startTime = Date.now();
  this.maxErrors = 10;
};
Object.assign(ErrorModel.prototype, KadiraModel.prototype);
Object.assign(ErrorModel.prototype, BaseErrorModel.prototype);
ErrorModel.prototype.buildPayload = function () {
  var metrics = _.values(this.errors);
  this.startTime = Ntp._now();
  _.each(metrics, function (metric) {
    metric.startTime = Kadira.syncedDate.syncTime(metric.startTime);
  });
  this.errors = {};
  return {
    errors: metrics
  };
};
ErrorModel.prototype.errorCount = function () {
  return _.values(this.errors).length;
};
ErrorModel.prototype.trackError = function (ex, trace) {
  var key = trace.type + ':' + ex.message;
  if (this.errors[key]) {
    this.errors[key].count++;
  } else if (this.errorCount() < this.maxErrors) {
    var errorDef = this._formatError(ex, trace);
    if (this.applyFilters(errorDef.type, errorDef.name, ex, errorDef.subType)) {
      this.errors[key] = this._formatError(ex, trace);
    }
  }
};
ErrorModel.prototype._formatError = function (ex, trace) {
  var time = Date.now();
  var stack = ex.stack;

  // to get Meteor's Error details
  if (ex.details) {
    stack = "Details: " + ex.details + "\r\n" + stack;
  }

  // Update trace's error event with the next stack
  var errorEvent = trace.events && trace.events[trace.events.length - 1];
  var errorObject = errorEvent && errorEvent[2] && errorEvent[2].error;
  if (errorObject) {
    errorObject.stack = stack;
  }
  return {
    appId: this.appId,
    name: ex.message,
    type: trace.type,
    startTime: time,
    subType: trace.subType || trace.name,
    trace: trace,
    stacks: [{
      stack: stack
    }],
    count: 1
  };
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"jobs.js":function module(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/mdg_meteor-apm-agent/lib/jobs.js                                                                          //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
var Jobs = Kadira.Jobs = {};
Jobs.getAsync = function (id, callback) {
  Kadira.coreApi.getJob(id).then(function (data) {
    callback(null, data);
  }).catch(function (err) {
    callback(err);
  });
};
Jobs.setAsync = function (id, changes, callback) {
  Kadira.coreApi.updateJob(id, changes).then(function (data) {
    callback(null, data);
  }).catch(function (err) {
    callback(err);
  });
};
Jobs.set = Kadira._wrapAsync(Jobs.setAsync);
Jobs.get = Kadira._wrapAsync(Jobs.getAsync);
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"retry.js":function module(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/mdg_meteor-apm-agent/lib/retry.js                                                                         //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
// Retry logic with an exponential backoff.
//
// options:
//  baseTimeout: time for initial reconnect attempt (ms).
//  exponent: exponential factor to increase timeout each attempt.
//  maxTimeout: maximum time between retries (ms).
//  minCount: how many times to reconnect "instantly".
//  minTimeout: time to wait for the first `minCount` retries (ms).
//  fuzz: factor to randomize retry times by (to avoid retry storms).

//TODO: remove this class and use Meteor Retry in a later version of meteor.

Retry = function (options) {
  var self = this;
  Object.assign(self, _.defaults(_.clone(options || {}), {
    baseTimeout: 1000,
    // 1 second
    exponent: 2.2,
    // The default is high-ish to ensure a server can recover from a
    // failure caused by load.
    maxTimeout: 5 * 60000,
    // 5 minutes
    minTimeout: 10,
    minCount: 2,
    fuzz: 0.5 // +- 25%
  }));
  self.retryTimer = null;
};
Object.assign(Retry.prototype, {
  // Reset a pending retry, if any.
  clear: function () {
    var self = this;
    if (self.retryTimer) clearTimeout(self.retryTimer);
    self.retryTimer = null;
  },
  // Calculate how long to wait in milliseconds to retry, based on the
  // `count` of which retry this is.
  _timeout: function (count) {
    var self = this;
    if (count < self.minCount) return self.minTimeout;
    var timeout = Math.min(self.maxTimeout, self.baseTimeout * Math.pow(self.exponent, count));
    // fuzz the timeout randomly, to avoid reconnect storms when a
    // server goes down.
    timeout = timeout * (Random.fraction() * self.fuzz + (1 - self.fuzz / 2));
    return Math.ceil(timeout);
  },
  // Call `fn` after a delay, based on the `count` of which retry this is.
  retryLater: function (count, fn) {
    var self = this;
    var timeout = self._timeout(count);
    if (self.retryTimer) clearTimeout(self.retryTimer);
    self.retryTimer = setTimeout(fn, timeout);
    return timeout;
  }
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"utils.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/mdg_meteor-apm-agent/lib/utils.js                                                                         //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  size: () => size,
  each: () => each,
  get: () => get
});
var Fiber = Npm.require('fibers');
function size(collection) {
  if (collection instanceof Map || collection instanceof Set) {
    return collection.size;
  }
  return _.size(collection);
}
function each(collection, callback) {
  if (collection instanceof Map || collection instanceof Set) {
    collection.forEach(callback);
  } else {
    _.each(collection, callback);
  }
}
function get(collection, key) {
  if (collection instanceof Map) {
    return collection.get(key);
  }
  return collection[key];
}
HaveAsyncCallback = function (args) {
  var lastArg = args[args.length - 1];
  return typeof lastArg == 'function';
};
UniqueId = function (start) {
  this.id = 0;
};
UniqueId.prototype.get = function () {
  return "" + this.id++;
};
DefaultUniqueId = new UniqueId();

// Optimized version of apply which tries to call as possible as it can
// Then fall back to apply
// This is because, v8 is very slow to invoke apply.
OptimizedApply = function OptimizedApply(context, fn, args) {
  var a = args;
  switch (a.length) {
    case 0:
      return fn.call(context);
    case 1:
      return fn.call(context, a[0]);
    case 2:
      return fn.call(context, a[0], a[1]);
    case 3:
      return fn.call(context, a[0], a[1], a[2]);
    case 4:
      return fn.call(context, a[0], a[1], a[2], a[3]);
    case 5:
      return fn.call(context, a[0], a[1], a[2], a[3], a[4]);
    default:
      return fn.apply(context, a);
  }
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"ntp.js":function module(require){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/mdg_meteor-apm-agent/lib/ntp.js                                                                           //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
var logger = getLogger();
Ntp = function (endpoint) {
  this.setEndpoint(endpoint);
  this.diff = 0;
  this.synced = false;
  this.reSyncCount = 0;
  this.reSync = new Retry({
    baseTimeout: 1000 * 60,
    maxTimeout: 1000 * 60 * 10,
    minCount: 0
  });
};
Ntp._now = function () {
  var now = Date.now();
  if (typeof now == 'number') {
    return now;
  } else if (now instanceof Date) {
    // some extenal JS libraries override Date.now and returns a Date object
    // which directly affect us. So we need to prepare for that
    return now.getTime();
  } else {
    // trust me. I've seen now === undefined
    return new Date().getTime();
  }
};
Ntp.prototype.setEndpoint = function (endpoint) {
  this.endpoint = endpoint + '/simplentp/sync';
};
Ntp.prototype.getTime = function () {
  return Ntp._now() + Math.round(this.diff);
};
Ntp.prototype.syncTime = function (localTime) {
  return localTime + Math.ceil(this.diff);
};
Ntp.prototype.sync = function () {
  logger('init sync');
  var self = this;
  var retryCount = 0;
  var retry = new Retry({
    baseTimeout: 1000 * 20,
    maxTimeout: 1000 * 60,
    minCount: 1,
    minTimeout: 0
  });
  syncTime();
  function syncTime() {
    if (retryCount < 5) {
      logger('attempt time sync with server', retryCount);
      // if we send 0 to the retryLater, cacheDns will run immediately
      retry.retryLater(retryCount++, cacheDns);
    } else {
      logger('maximum retries reached');
      self.reSync.retryLater(self.reSyncCount++, function () {
        var args = [].slice.call(arguments);
        self.sync.apply(self, args);
      });
    }
  }

  // first attempt is to cache dns. So, calculation does not
  // include DNS resolution time
  function cacheDns() {
    self.getServerTime(function (err) {
      if (!err) {
        calculateTimeDiff();
      } else {
        syncTime();
      }
    });
  }
  function calculateTimeDiff() {
    var clientStartTime = new Date().getTime();
    self.getServerTime(function (err, serverTime) {
      if (!err && serverTime) {
        // (Date.now() + clientStartTime)/2 : Midpoint between req and res
        var networkTime = (new Date().getTime() - clientStartTime) / 2;
        var serverStartTime = serverTime - networkTime;
        self.diff = serverStartTime - clientStartTime;
        self.synced = true;
        // we need to send 1 into retryLater.
        self.reSync.retryLater(self.reSyncCount++, function () {
          var args = [].slice.call(arguments);
          self.sync.apply(self, args);
        });
        logger('successfully updated diff value', self.diff);
      } else {
        syncTime();
      }
    });
  }
};
Ntp.prototype.getServerTime = function (callback) {
  var self = this;
  if (Meteor.isServer) {
    var Fiber = Npm.require('fibers');
    new Fiber(function () {
      HTTP.get(self.endpoint, function (err, res) {
        if (err) {
          callback(err);
        } else {
          var serverTime = parseInt(res.content);
          callback(null, serverTime);
        }
      });
    }).run();
  } else {
    httpRequest('GET', self.endpoint, function (err, res) {
      if (err) {
        callback(err);
      } else {
        var serverTime = parseInt(res.content);
        callback(null, serverTime);
      }
    });
  }
};
function getLogger() {
  if (Meteor.isServer) {
    return Npm.require('debug')("kadira:ntp");
  } else {
    return function (message) {
      var canLogKadira = Meteor._localStorage.getItem('LOG_KADIRA') !== null && typeof console !== 'undefined';
      if (canLogKadira) {
        if (message) {
          message = "kadira:ntp " + message;
          arguments[0] = message;
        }
        console.log.apply(console, arguments);
      }
    };
  }
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"wait_time_builder.js":function module(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/mdg_meteor-apm-agent/lib/wait_time_builder.js                                                             //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
var WAITON_MESSAGE_FIELDS = ['msg', 'id', 'method', 'name', 'waitTime'];

// This is way how we can build waitTime and it's breakdown
WaitTimeBuilder = function () {
  this._waitListStore = {};
  this._currentProcessingMessages = {};
  this._messageCache = {};
};
WaitTimeBuilder.prototype.register = function (session, msgId) {
  var self = this;
  var mainKey = self._getMessageKey(session.id, msgId);
  var inQueue = session.inQueue || [];
  if (typeof inQueue.toArray === 'function') {
    // latest version of Meteor uses a double-ended-queue for the inQueue
    // info: https://www.npmjs.com/package/double-ended-queue
    inQueue = inQueue.toArray();
  }
  var waitList = inQueue.map(function (msg) {
    var key = self._getMessageKey(session.id, msg.id);
    return self._getCacheMessage(key, msg);
  });
  waitList = waitList || [];

  //add currently processing ddp message if exists
  var currentlyProcessingMessage = this._currentProcessingMessages[session.id];
  if (currentlyProcessingMessage) {
    var key = self._getMessageKey(session.id, currentlyProcessingMessage.id);
    waitList.unshift(this._getCacheMessage(key, currentlyProcessingMessage));
  }
  this._waitListStore[mainKey] = waitList;
};
WaitTimeBuilder.prototype.build = function (session, msgId) {
  var mainKey = this._getMessageKey(session.id, msgId);
  var waitList = this._waitListStore[mainKey] || [];
  delete this._waitListStore[mainKey];
  var filteredWaitList = waitList.map(this._cleanCacheMessage.bind(this));
  return filteredWaitList;
};
WaitTimeBuilder.prototype._getMessageKey = function (sessionId, msgId) {
  return sessionId + "::" + msgId;
};
WaitTimeBuilder.prototype._getCacheMessage = function (key, msg) {
  var self = this;
  var cachedMessage = self._messageCache[key];
  if (!cachedMessage) {
    self._messageCache[key] = cachedMessage = _.pick(msg, WAITON_MESSAGE_FIELDS);
    cachedMessage._key = key;
    cachedMessage._registered = 1;
  } else {
    cachedMessage._registered++;
  }
  return cachedMessage;
};
WaitTimeBuilder.prototype._cleanCacheMessage = function (msg) {
  msg._registered--;
  if (msg._registered == 0) {
    delete this._messageCache[msg._key];
  }

  // need to send a clean set of objects
  // otherwise register can go with this
  return _.pick(msg, WAITON_MESSAGE_FIELDS);
};
WaitTimeBuilder.prototype.trackWaitTime = function (session, msg, unblock) {
  var self = this;
  var started = Date.now();
  self._currentProcessingMessages[session.id] = msg;
  var unblocked = false;
  var wrappedUnblock = function () {
    if (!unblocked) {
      var waitTime = Date.now() - started;
      var key = self._getMessageKey(session.id, msg.id);
      var cachedMessage = self._messageCache[key];
      if (cachedMessage) {
        cachedMessage.waitTime = waitTime;
      }
      delete self._currentProcessingMessages[session.id];
      unblocked = true;
      unblock();
    }
  };
  return wrappedUnblock;
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"check_for_oplog.js":function module(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/mdg_meteor-apm-agent/lib/check_for_oplog.js                                                               //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
// expose for testing purpose
OplogCheck = {};
OplogCheck._070 = function (cursorDescription) {
  var options = cursorDescription.options;
  if (options.limit) {
    return {
      code: "070_LIMIT_NOT_SUPPORTED",
      reason: "Meteor 0.7.0 does not support limit with oplog.",
      solution: "Upgrade your app to Meteor version 0.7.2 or later."
    };
  }
  ;
  var exists$ = _.any(cursorDescription.selector, function (value, field) {
    if (field.substr(0, 1) === '$') return true;
  });
  if (exists$) {
    return {
      code: "070_$_NOT_SUPPORTED",
      reason: "Meteor 0.7.0 supports only equal checks with oplog.",
      solution: "Upgrade your app to Meteor version 0.7.2 or later."
    };
  }
  ;
  var onlyScalers = _.all(cursorDescription.selector, function (value, field) {
    return typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null || value instanceof Meteor.Collection.ObjectID;
  });
  if (!onlyScalers) {
    return {
      code: "070_ONLY_SCALERS",
      reason: "Meteor 0.7.0 only supports scalers as comparators.",
      solution: "Upgrade your app to Meteor version 0.7.2 or later."
    };
  }
  return true;
};
OplogCheck._071 = function (cursorDescription) {
  var options = cursorDescription.options;
  var matcher = new Minimongo.Matcher(cursorDescription.selector);
  if (options.limit) {
    return {
      code: "071_LIMIT_NOT_SUPPORTED",
      reason: "Meteor 0.7.1 does not support limit with oplog.",
      solution: "Upgrade your app to Meteor version 0.7.2 or later."
    };
  }
  ;
  return true;
};
OplogCheck.env = function () {
  if (!process.env.MONGO_OPLOG_URL) {
    return {
      code: "NO_ENV",
      reason: "You haven't added oplog support for your the Meteor app.",
      solution: "Add oplog support for your Meteor app. see: http://goo.gl/Co1jJc"
    };
  } else {
    return true;
  }
};
OplogCheck.disableOplog = function (cursorDescription) {
  if (cursorDescription.options._disableOplog) {
    return {
      code: "DISABLE_OPLOG",
      reason: "You've disable oplog for this cursor explicitly with _disableOplog option."
    };
  } else {
    return true;
  }
};

// when creating Minimongo.Matcher object, if that's throws an exception
// meteor won't do the oplog support
OplogCheck.miniMongoMatcher = function (cursorDescription) {
  if (Minimongo.Matcher) {
    try {
      var matcher = new Minimongo.Matcher(cursorDescription.selector);
      return true;
    } catch (ex) {
      return {
        code: "MINIMONGO_MATCHER_ERROR",
        reason: "There's something wrong in your mongo query: " + ex.message,
        solution: "Check your selector and change it accordingly."
      };
    }
  } else {
    // If there is no Minimongo.Matcher, we don't need to check this
    return true;
  }
};
OplogCheck.miniMongoSorter = function (cursorDescription) {
  var matcher = new Minimongo.Matcher(cursorDescription.selector);
  if (Minimongo.Sorter && cursorDescription.options.sort) {
    try {
      var sorter = new Minimongo.Sorter(cursorDescription.options.sort, {
        matcher: matcher
      });
      return true;
    } catch (ex) {
      return {
        code: "MINIMONGO_SORTER_ERROR",
        reason: "Some of your sort specifiers are not supported: " + ex.message,
        solution: "Check your sort specifiers and chage them accordingly."
      };
    }
  } else {
    return true;
  }
};
OplogCheck.fields = function (cursorDescription) {
  var options = cursorDescription.options;
  if (options.fields) {
    try {
      LocalCollection._checkSupportedProjection(options.fields);
      return true;
    } catch (e) {
      if (e.name === "MinimongoError") {
        return {
          code: "NOT_SUPPORTED_FIELDS",
          reason: "Some of the field filters are not supported: " + e.message,
          solution: "Try removing those field filters."
        };
      } else {
        throw e;
      }
    }
  }
  return true;
};
OplogCheck.skip = function (cursorDescription) {
  if (cursorDescription.options.skip) {
    return {
      code: "SKIP_NOT_SUPPORTED",
      reason: "Skip does not support with oplog.",
      solution: "Try to avoid using skip. Use range queries instead: http://goo.gl/b522Av"
    };
  }
  return true;
};
OplogCheck.where = function (cursorDescription) {
  var matcher = new Minimongo.Matcher(cursorDescription.selector);
  if (matcher.hasWhere()) {
    return {
      code: "WHERE_NOT_SUPPORTED",
      reason: "Meteor does not support queries with $where.",
      solution: "Try to remove $where from your query. Use some alternative."
    };
  }
  ;
  return true;
};
OplogCheck.geo = function (cursorDescription) {
  var matcher = new Minimongo.Matcher(cursorDescription.selector);
  if (matcher.hasGeoQuery()) {
    return {
      code: "GEO_NOT_SUPPORTED",
      reason: "Meteor does not support queries with geo partial operators.",
      solution: "Try to remove geo partial operators from your query if possible."
    };
  }
  ;
  return true;
};
OplogCheck.limitButNoSort = function (cursorDescription) {
  var options = cursorDescription.options;
  if (options.limit && !options.sort) {
    return {
      code: "LIMIT_NO_SORT",
      reason: "Meteor oplog implementation does not support limit without a sort specifier.",
      solution: "Try adding a sort specifier."
    };
  }
  ;
  return true;
};
OplogCheck.olderVersion = function (cursorDescription, driver) {
  if (driver && !driver.constructor.cursorSupported) {
    return {
      code: "OLDER_VERSION",
      reason: "Your Meteor version does not have oplog support.",
      solution: "Upgrade your app to Meteor version 0.7.2 or later."
    };
  }
  return true;
};
OplogCheck.gitCheckout = function (cursorDescription, driver) {
  if (!Meteor.release) {
    return {
      code: "GIT_CHECKOUT",
      reason: "Seems like your Meteor version is based on a Git checkout and it doesn't have the oplog support.",
      solution: "Try to upgrade your Meteor version."
    };
  }
  return true;
};
var preRunningMatchers = [OplogCheck.env, OplogCheck.disableOplog, OplogCheck.miniMongoMatcher];
var globalMatchers = [OplogCheck.fields, OplogCheck.skip, OplogCheck.where, OplogCheck.geo, OplogCheck.limitButNoSort, OplogCheck.miniMongoSorter, OplogCheck.olderVersion, OplogCheck.gitCheckout];
var versionMatchers = [[/^0\.7\.1/, OplogCheck._071], [/^0\.7\.0/, OplogCheck._070]];
Kadira.checkWhyNoOplog = function (cursorDescription, observerDriver) {
  if (typeof Minimongo == 'undefined') {
    return {
      code: "CANNOT_DETECT",
      reason: "You are running an older Meteor version and Kadira can't check oplog state.",
      solution: "Try updating your Meteor app"
    };
  }
  var result = runMatchers(preRunningMatchers, cursorDescription, observerDriver);
  if (result !== true) {
    return result;
  }
  var meteorVersion = Meteor.release;
  for (var lc = 0; lc < versionMatchers.length; lc++) {
    var matcherInfo = versionMatchers[lc];
    if (matcherInfo[0].test(meteorVersion)) {
      var matched = matcherInfo[1](cursorDescription, observerDriver);
      if (matched !== true) {
        return matched;
      }
    }
  }
  result = runMatchers(globalMatchers, cursorDescription, observerDriver);
  if (result !== true) {
    return result;
  }
  return {
    code: "OPLOG_SUPPORTED",
    reason: "This query should support oplog. It's weird if it's not.",
    solution: "Please contact Kadira support and let's discuss."
  };
};
function runMatchers(matcherList, cursorDescription, observerDriver) {
  for (var lc = 0; lc < matcherList.length; lc++) {
    var matcher = matcherList[lc];
    var matched = matcher(cursorDescription, observerDriver);
    if (matched !== true) {
      return matched;
    }
  }
  return true;
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"tracer":{"tracer.js":function module(require){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/mdg_meteor-apm-agent/lib/tracer/tracer.js                                                                 //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
var Fibers = Npm.require('fibers');
var eventLogger = Npm.require('debug')('kadira:tracer');
var REPITITIVE_EVENTS = {
  'db': true,
  'http': true,
  'email': true,
  'wait': true,
  'async': true
};
Tracer = function Tracer() {
  this._filters = [];
};

//In the future, we might wan't to track inner fiber events too.
//Then we can't serialize the object with methods
//That's why we use this method of returning the data
Tracer.prototype.start = function (session, msg) {
  var traceInfo = {
    _id: session.id + "::" + msg.id,
    session: session.id,
    userId: session.userId,
    id: msg.id,
    events: []
  };
  if (msg.msg == 'method') {
    traceInfo.type = 'method';
    traceInfo.name = msg.method;
  } else if (msg.msg == 'sub') {
    traceInfo.type = 'sub';
    traceInfo.name = msg.name;
  } else {
    return null;
  }
  return traceInfo;
};
Tracer.prototype.event = function (traceInfo, type, data) {
  // do not allow to proceed, if already completed or errored
  var lastEvent = this.getLastEvent(traceInfo);
  if (lastEvent && ['complete', 'error'].indexOf(lastEvent.type) >= 0) {
    return false;
  }

  //expecting a end event
  var eventId = true;

  //specially handling for repitivive events like db, http
  if (REPITITIVE_EVENTS[type]) {
    //can't accept a new start event
    if (traceInfo._lastEventId) {
      return false;
    }
    eventId = traceInfo._lastEventId = DefaultUniqueId.get();
  }
  var event = {
    type: type,
    at: Ntp._now()
  };
  if (data) {
    var info = _.pick(traceInfo, 'type', 'name');
    event.data = this._applyFilters(type, data, info, "start");
    ;
  }
  traceInfo.events.push(event);
  eventLogger("%s %s", type, traceInfo._id);
  return eventId;
};
Tracer.prototype.eventEnd = function (traceInfo, eventId, data) {
  if (traceInfo._lastEventId && traceInfo._lastEventId == eventId) {
    var lastEvent = this.getLastEvent(traceInfo);
    var type = lastEvent.type + 'end';
    var event = {
      type: type,
      at: Ntp._now()
    };
    if (data) {
      var info = _.pick(traceInfo, 'type', 'name');
      event.data = this._applyFilters(type, data, info, "end");
      ;
    }
    traceInfo.events.push(event);
    eventLogger("%s %s", type, traceInfo._id);
    traceInfo._lastEventId = null;
    return true;
  } else {
    return false;
  }
};
Tracer.prototype.getLastEvent = function (traceInfo) {
  return traceInfo.events[traceInfo.events.length - 1];
};
Tracer.prototype.endLastEvent = function (traceInfo) {
  var lastEvent = this.getLastEvent(traceInfo);
  if (lastEvent && !/end$/.test(lastEvent.type)) {
    traceInfo.events.push({
      type: lastEvent.type + 'end',
      at: Ntp._now()
    });
    return true;
  }
  return false;
};
Tracer.prototype.buildTrace = function (traceInfo) {
  var firstEvent = traceInfo.events[0];
  var lastEvent = traceInfo.events[traceInfo.events.length - 1];
  var processedEvents = [];
  if (firstEvent.type != 'start') {
    console.warn('Kadira: trace is not started yet');
    return null;
  } else if (lastEvent.type != 'complete' && lastEvent.type != 'error') {
    //trace is not completed or errored yet
    console.warn('Kadira: trace is not completed or errored yet');
    return null;
  } else {
    //build the metrics
    traceInfo.errored = lastEvent.type == 'error';
    traceInfo.at = firstEvent.at;
    var metrics = {
      total: lastEvent.at - firstEvent.at
    };
    var totalNonCompute = 0;
    firstEvent = ['start', 0];
    if (traceInfo.events[0].data) firstEvent.push(traceInfo.events[0].data);
    processedEvents.push(firstEvent);
    for (var lc = 1; lc < traceInfo.events.length - 1; lc += 2) {
      var prevEventEnd = traceInfo.events[lc - 1];
      var startEvent = traceInfo.events[lc];
      var endEvent = traceInfo.events[lc + 1];
      var computeTime = startEvent.at - prevEventEnd.at;
      if (computeTime > 0) processedEvents.push(['compute', computeTime]);
      if (!endEvent) {
        console.error('Kadira: no end event for type: ', startEvent.type);
        return null;
      } else if (endEvent.type != startEvent.type + 'end') {
        console.error('Kadira: endevent type mismatch: ', startEvent.type, endEvent.type, JSON.stringify(traceInfo));
        return null;
      } else {
        var elapsedTimeForEvent = endEvent.at - startEvent.at;
        var currentEvent = [startEvent.type, elapsedTimeForEvent];
        currentEvent.push(Object.assign({}, startEvent.data, endEvent.data));
        processedEvents.push(currentEvent);
        metrics[startEvent.type] = metrics[startEvent.type] || 0;
        metrics[startEvent.type] += elapsedTimeForEvent;
        totalNonCompute += elapsedTimeForEvent;
      }
    }
    computeTime = lastEvent.at - traceInfo.events[traceInfo.events.length - 2];
    if (computeTime > 0) processedEvents.push(['compute', computeTime]);
    var lastEventData = [lastEvent.type, 0];
    if (lastEvent.data) lastEventData.push(lastEvent.data);
    processedEvents.push(lastEventData);
    metrics.compute = metrics.total - totalNonCompute;
    traceInfo.metrics = metrics;
    traceInfo.events = processedEvents;
    traceInfo.isEventsProcessed = true;
    return traceInfo;
  }
};
Tracer.prototype.addFilter = function (filterFn) {
  this._filters.push(filterFn);
};
Tracer.prototype._applyFilters = function (eventType, data, info) {
  this._filters.forEach(function (filterFn) {
    data = filterFn(eventType, _.clone(data), info);
  });
  return data;
};
Kadira.tracer = new Tracer();
// need to expose Tracer to provide default set of filters
Kadira.Tracer = Tracer;
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"default_filters.js":function module(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/mdg_meteor-apm-agent/lib/tracer/default_filters.js                                                        //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
// strip sensitive data sent to kadia engine.
// possible to limit types by providing an array of types to strip
// possible types are: "start", "db", "http", "email"
Tracer.stripSensitive = function stripSensitive(typesToStrip, receiverType, name) {
  typesToStrip = typesToStrip || [];
  var strippedTypes = {};
  typesToStrip.forEach(function (type) {
    strippedTypes[type] = true;
  });
  return function (type, data, info) {
    if (typesToStrip.length > 0 && !strippedTypes[type]) return data;
    if (receiverType && receiverType != info.type) return data;
    if (name && name != info.name) return data;
    if (type == "start") {
      data.params = "[stripped]";
    } else if (type == "db") {
      data.selector = "[stripped]";
    } else if (type == "http") {
      data.url = "[stripped]";
    } else if (type == "email") {
      ["from", "to", "cc", "bcc", "replyTo"].forEach(function (item) {
        if (data[item]) {
          data[item] = "[stripped]";
        }
      });
    }
    return data;
  };
};

// strip selectors only from the given list of collection names
Tracer.stripSelectors = function stripSelectors(collectionList, receiverType, name) {
  collectionList = collectionList || [];
  var collMap = {};
  collectionList.forEach(function (collName) {
    collMap[collName] = true;
  });
  return function (type, data, info) {
    if (type != "db" || data && !collMap[data.coll]) {
      return data;
    }
    if (receiverType && receiverType != info.type) return data;
    if (name && name != info.name) return data;
    data.selector = "[stripped]";
    return data;
  };
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"tracer_store.js":function module(require){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/mdg_meteor-apm-agent/lib/tracer/tracer_store.js                                                           //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
var logger = Npm.require('debug')('kadira:ts');
TracerStore = function TracerStore(options) {
  options = options || {};
  this.maxTotalPoints = options.maxTotalPoints || 30;
  this.interval = options.interval || 1000 * 60;
  this.archiveEvery = options.archiveEvery || this.maxTotalPoints / 6;

  //store max total on the past 30 minutes (or past 30 items)
  this.maxTotals = Object.create(null);
  //store the max trace of the current interval
  this.currentMaxTrace = Object.create(null);
  //archive for the traces
  this.traceArchive = [];
  this.processedCnt = Object.create(null);

  //group errors by messages between an interval
  this.errorMap = Object.create(null);
};
TracerStore.prototype.addTrace = function (trace) {
  var kind = [trace.type, trace.name].join('::');
  if (!this.currentMaxTrace[kind]) {
    this.currentMaxTrace[kind] = EJSON.clone(trace);
  } else if (this.currentMaxTrace[kind].metrics.total < trace.metrics.total) {
    this.currentMaxTrace[kind] = EJSON.clone(trace);
  } else if (trace.errored) {
    this._handleErrors(trace);
  }
};
TracerStore.prototype.collectTraces = function () {
  var traces = this.traceArchive;
  this.traceArchive = [];

  // convert at(timestamp) into the actual serverTime
  traces.forEach(function (trace) {
    trace.at = Kadira.syncedDate.syncTime(trace.at);
  });
  return traces;
};
TracerStore.prototype.start = function () {
  this._timeoutHandler = setInterval(this.processTraces.bind(this), this.interval);
};
TracerStore.prototype.stop = function () {
  if (this._timeoutHandler) {
    clearInterval(this._timeoutHandler);
  }
};
TracerStore.prototype._handleErrors = function (trace) {
  // sending error requests as it is
  var lastEvent = trace.events[trace.events.length - 1];
  if (lastEvent && lastEvent[2]) {
    var error = lastEvent[2].error;

    // grouping errors occured (reset after processTraces)
    var errorKey = [trace.type, trace.name, error.message].join("::");
    if (!this.errorMap[errorKey]) {
      var erroredTrace = EJSON.clone(trace);
      this.errorMap[errorKey] = erroredTrace;
      this.traceArchive.push(erroredTrace);
    }
  } else {
    logger('last events is not an error: ', JSON.stringify(trace.events));
  }
};
TracerStore.prototype.processTraces = function () {
  var self = this;
  var kinds = _.union(_.keys(this.maxTotals), _.keys(this.currentMaxTrace));
  kinds.forEach(function (kind) {
    self.processedCnt[kind] = self.processedCnt[kind] || 0;
    var currentMaxTrace = self.currentMaxTrace[kind];
    var currentMaxTotal = currentMaxTrace ? currentMaxTrace.metrics.total : 0;
    self.maxTotals[kind] = self.maxTotals[kind] || [];
    //add the current maxPoint
    self.maxTotals[kind].push(currentMaxTotal);
    var exceedingPoints = self.maxTotals[kind].length - self.maxTotalPoints;
    if (exceedingPoints > 0) {
      self.maxTotals[kind].splice(0, exceedingPoints);
    }
    var archiveDefault = self.processedCnt[kind] % self.archiveEvery == 0;
    self.processedCnt[kind]++;
    var canArchive = archiveDefault || self._isTraceOutlier(kind, currentMaxTrace);
    if (canArchive && currentMaxTrace) {
      self.traceArchive.push(currentMaxTrace);
    }

    //reset currentMaxTrace
    self.currentMaxTrace[kind] = null;
  });

  //reset the errorMap
  self.errorMap = Object.create(null);
};
TracerStore.prototype._isTraceOutlier = function (kind, trace) {
  if (trace) {
    var dataSet = this.maxTotals[kind];
    return this._isOutlier(dataSet, trace.metrics.total, 3);
  } else {
    return false;
  }
};

/*
  Data point must exists in the dataSet
*/
TracerStore.prototype._isOutlier = function (dataSet, dataPoint, maxMadZ) {
  var median = this._getMedian(dataSet);
  var mad = this._calculateMad(dataSet, median);
  var madZ = this._funcMedianDeviation(median)(dataPoint) / mad;
  return madZ > maxMadZ;
};
TracerStore.prototype._getMedian = function (dataSet) {
  var sortedDataSet = _.clone(dataSet).sort(function (a, b) {
    return a - b;
  });
  return this._pickQuartile(sortedDataSet, 2);
};
TracerStore.prototype._pickQuartile = function (dataSet, num) {
  var pos = (dataSet.length + 1) * num / 4;
  if (pos % 1 == 0) {
    return dataSet[pos - 1];
  } else {
    pos = pos - pos % 1;
    return (dataSet[pos - 1] + dataSet[pos]) / 2;
  }
};
TracerStore.prototype._calculateMad = function (dataSet, median) {
  var medianDeviations = _.map(dataSet, this._funcMedianDeviation(median));
  var mad = this._getMedian(medianDeviations);
  return mad;
};
TracerStore.prototype._funcMedianDeviation = function (median) {
  return function (x) {
    return Math.abs(median - x);
  };
};
TracerStore.prototype._getMean = function (dataPoints) {
  if (dataPoints.length > 0) {
    var total = 0;
    dataPoints.forEach(function (point) {
      total += point;
    });
    return total / dataPoints.length;
  } else {
    return 0;
  }
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"docsize_cache.js":function module(require){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/mdg_meteor-apm-agent/lib/docsize_cache.js                                                                 //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
var LRU = Npm.require('lru-cache');
var crypto = Npm.require('crypto');
var jsonStringify = Npm.require('json-stringify-safe');
DocSzCache = function (maxItems, maxValues) {
  this.items = new LRU({
    max: maxItems
  });
  this.maxValues = maxValues;
  this.cpuUsage = 0;
};

// This is called from SystemModel.prototype.getUsage and saves cpu usage.
DocSzCache.prototype.setPcpu = function (pcpu) {
  this.cpuUsage = pcpu;
};
DocSzCache.prototype.getSize = function (coll, query, opts, data) {
  // If the dataset is null or empty we can't calculate the size
  // Do not process this data and return 0 as the document size.
  if (!(data && (data.length || data.size))) {
    return 0;
  }
  var key = this.getKey(coll, query, opts);
  var item = this.items.get(key);
  if (!item) {
    item = new DocSzCacheItem(this.maxValues);
    this.items.set(key, item);
  }
  if (this.needsUpdate(item)) {
    var doc = {};
    if (typeof data.get === 'function') {
      // This is an IdMap
      data.forEach(function (element) {
        doc = element;
        return false; // return false to stop loop. We only need one doc.
      });
    } else {
      doc = data[0];
    }
    var size = Buffer.byteLength(jsonStringify(doc), 'utf8');
    item.addData(size);
  }
  return item.getValue();
};
DocSzCache.prototype.getKey = function (coll, query, opts) {
  return jsonStringify([coll, query, opts]);
};

// returns a score between 0 and 1 for a cache item
// this score is determined by:
//  * availalbe cache item slots
//  * time since last updated
//  * cpu usage of the application
DocSzCache.prototype.getItemScore = function (item) {
  return [(item.maxValues - item.values.length) / item.maxValues, (Date.now() - item.updated) / 60000, (100 - this.cpuUsage) / 100].map(function (score) {
    return score > 1 ? 1 : score;
  }).reduce(function (total, score) {
    return (total || 0) + score;
  }) / 3;
};
DocSzCache.prototype.needsUpdate = function (item) {
  // handle newly made items
  if (!item.values.length) {
    return true;
  }
  var currentTime = Date.now();
  var timeSinceUpdate = currentTime - item.updated;
  if (timeSinceUpdate > 1000 * 60) {
    return true;
  }
  return this.getItemScore(item) > 0.5;
};
DocSzCacheItem = function (maxValues) {
  this.maxValues = maxValues;
  this.updated = 0;
  this.values = [];
};
DocSzCacheItem.prototype.addData = function (value) {
  this.values.push(value);
  this.updated = Date.now();
  if (this.values.length > this.maxValues) {
    this.values.shift();
  }
};
DocSzCacheItem.prototype.getValue = function () {
  function sortNumber(a, b) {
    return a - b;
  }
  var sorted = this.values.sort(sortNumber);
  var median = 0;
  if (sorted.length % 2 === 0) {
    var idx = sorted.length / 2;
    median = (sorted[idx] + sorted[idx - 1]) / 2;
  } else {
    var idx = Math.floor(sorted.length / 2);
    median = sorted[idx];
  }
  return median;
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"kadira.js":function module(require){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/mdg_meteor-apm-agent/lib/kadira.js                                                                        //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
var hostname = Npm.require('os').hostname();
var logger = Npm.require('debug')('kadira:apm');
var Fibers = Npm.require('fibers');
var KadiraCore = Npm.require('kadira-core').Kadira;
Kadira.models = {};
Kadira.options = {};
Kadira.env = {
  currentSub: null,
  // keep current subscription inside ddp
  kadiraInfo: new Meteor.EnvironmentVariable()
};
Kadira.waitTimeBuilder = new WaitTimeBuilder();
Kadira.errors = [];
Kadira.errors.addFilter = Kadira.errors.push.bind(Kadira.errors);
Kadira.models.methods = new MethodsModel();
Kadira.models.pubsub = new PubsubModel();
Kadira.models.system = new SystemModel();
Kadira.docSzCache = new DocSzCache(100000, 10);
Kadira.connect = function (appId, appSecret, options) {
  options = options || {};
  options.appId = appId;
  options.appSecret = appSecret;
  options.payloadTimeout = options.payloadTimeout || 1000 * 20;
  options.endpoint = options.endpoint || "https://enginex.kadira.io";
  options.clientEngineSyncDelay = options.clientEngineSyncDelay || 10000;
  options.thresholds = options.thresholds || {};
  options.isHostNameSet = !!options.hostname;
  options.hostname = options.hostname || hostname;
  options.proxy = options.proxy || null;
  if (options.documentSizeCacheSize) {
    Kadira.docSzCache = new DocSzCache(options.documentSizeCacheSize, 10);
  }

  // remove trailing slash from endpoint url (if any)
  if (_.last(options.endpoint) === '/') {
    options.endpoint = options.endpoint.substr(0, options.endpoint.length - 1);
  }

  // error tracking is enabled by default
  if (options.enableErrorTracking === undefined) {
    options.enableErrorTracking = true;
  }
  Kadira.options = options;
  Kadira.options.authHeaders = {
    'KADIRA-APP-ID': Kadira.options.appId,
    'KADIRA-APP-SECRET': Kadira.options.appSecret
  };
  Kadira.syncedDate = new Ntp(options.endpoint);
  Kadira.syncedDate.sync();
  Kadira.models.error = new ErrorModel(appId);

  // handle pre-added filters
  var addFilterFn = Kadira.models.error.addFilter.bind(Kadira.models.error);
  Kadira.errors.forEach(addFilterFn);
  Kadira.errors = Kadira.models.error;

  // setting runtime info, which will be sent to kadira
  __meteor_runtime_config__.kadira = {
    appId: appId,
    endpoint: options.endpoint,
    clientEngineSyncDelay: options.clientEngineSyncDelay
  };
  if (options.enableErrorTracking) {
    Kadira.enableErrorTracking();
  } else {
    Kadira.disableErrorTracking();
  }
  if (appId && appSecret) {
    options.appId = options.appId.trim();
    options.appSecret = options.appSecret.trim();
    Kadira.coreApi = new KadiraCore({
      appId: options.appId,
      appSecret: options.appSecret,
      endpoint: options.endpoint,
      hostname: options.hostname
    });
    Kadira.coreApi._checkAuth().then(function () {
      logger('connected to app: ', appId);
      console.log('Meteor APM: Successfully connected');
      Kadira._sendAppStats();
      Kadira._schedulePayloadSend();
    }).catch(function (err) {
      console.log('Meteor APM: authentication failed - check your appId & appSecret');
    });
  } else {
    throw new Error('Meteor APM: required appId and appSecret');
  }

  // start tracking errors
  Meteor.startup(function () {
    TrackUncaughtExceptions();
    TrackMeteorDebug();
  });
  Meteor.publish(null, function () {
    var options = __meteor_runtime_config__.kadira;
    this.added('kadira_settings', Random.id(), options);
    this.ready();
  });

  // notify we've connected
  Kadira.connected = true;
};

//track how many times we've sent the data (once per minute)
Kadira._buildPayload = function () {
  var payload = {
    host: Kadira.options.hostname
  };
  var buildDetailedInfo = Kadira._isDetailedInfo();
  Object.assign(payload, Kadira.models.methods.buildPayload(buildDetailedInfo));
  Object.assign(payload, Kadira.models.pubsub.buildPayload(buildDetailedInfo));
  Object.assign(payload, Kadira.models.system.buildPayload());
  if (Kadira.options.enableErrorTracking) {
    Object.assign(payload, Kadira.models.error.buildPayload());
  }
  return payload;
};
Kadira._countDataSent = 0;
Kadira._detailInfoSentInterval = Math.ceil(1000 * 60 / Kadira.options.payloadTimeout);
Kadira._isDetailedInfo = function () {
  return Kadira._countDataSent++ % Kadira._detailInfoSentInterval == 0;
};
Kadira._sendAppStats = function () {
  var appStats = {};
  appStats.release = Meteor.release;
  appStats.protocolVersion = '1.0.0';
  appStats.packageVersions = [];
  appStats.appVersions = {
    webapp: __meteor_runtime_config__['autoupdateVersion'],
    refreshable: __meteor_runtime_config__['autoupdateVersionRefreshable'],
    cordova: __meteor_runtime_config__['autoupdateVersionCordova']
  };

  // TODO get version number for installed packages
  _.each(Package, function (v, name) {
    appStats.packageVersions.push({
      name: name,
      version: null
    });
  });
  Kadira.coreApi.sendData({
    startTime: new Date(),
    appStats: appStats
  }).catch(function (err) {
    console.error('Kadira Error on sending appStats:', err.message);
  });
};
Kadira._schedulePayloadSend = function () {
  setTimeout(function () {
    Kadira._sendPayload(Kadira._schedulePayloadSend);
  }, Kadira.options.payloadTimeout);
};
Kadira._sendPayload = function (callback) {
  new Fibers(function () {
    var payload = Kadira._buildPayload();
    Kadira.coreApi.sendData(payload).then(callback).catch(function (err) {
      console.log('Meteor APM Error:', err.message);
      callback();
    });
  }).run();
};

// this return the __kadiraInfo from the current Fiber by default
// if called with 2nd argument as true, it will get the kadira info from
// Meteor.EnvironmentVariable
//
// WARNING: returned info object is the reference object.
//  Changing it might cause issues when building traces. So use with care
Kadira._getInfo = function (currentFiber, useEnvironmentVariable) {
  currentFiber = currentFiber || Fibers.current;
  if (currentFiber) {
    if (useEnvironmentVariable) {
      return Kadira.env.kadiraInfo.get();
    }
    return currentFiber.__kadiraInfo;
  }
};

// this does not clone the info object. So, use with care
Kadira._setInfo = function (info) {
  Fibers.current.__kadiraInfo = info;
};
Kadira.enableErrorTracking = function () {
  __meteor_runtime_config__.kadira.enableErrorTracking = true;
  Kadira.options.enableErrorTracking = true;
};
Kadira.disableErrorTracking = function () {
  __meteor_runtime_config__.kadira.enableErrorTracking = false;
  Kadira.options.enableErrorTracking = false;
};
Kadira.trackError = function (type, message, options) {
  if (Kadira.options.enableErrorTracking && type && message) {
    options = options || {};
    options.subType = options.subType || 'server';
    options.stacks = options.stacks || '';
    var error = {
      message: message,
      stack: options.stacks
    };
    var trace = {
      type: type,
      subType: options.subType,
      name: message,
      errored: true,
      at: Kadira.syncedDate.getTime(),
      events: [['start', 0, {}], ['error', 0, {
        error: error
      }]],
      metrics: {
        total: 0
      }
    };
    Kadira.models.error.trackError(error, trace);
  }
};
Kadira.ignoreErrorTracking = function (err) {
  err._skipKadira = true;
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"hijack":{"wrap_server.js":function module(require){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/mdg_meteor-apm-agent/lib/hijack/wrap_server.js                                                            //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
var Fiber = Npm.require('fibers');
wrapServer = function (serverProto) {
  var originalHandleConnect = serverProto._handleConnect;
  serverProto._handleConnect = function (socket, msg) {
    originalHandleConnect.call(this, socket, msg);
    var session = socket._meteorSession;
    // sometimes it is possible for _meteorSession to be undefined
    // one such reason would be if DDP versions are not matching
    // if then, we should not process it
    if (!session) {
      return;
    }
    Kadira.EventBus.emit('system', 'createSession', msg, socket._meteorSession);
    if (Kadira.connected) {
      Kadira.models.system.handleSessionActivity(msg, socket._meteorSession);
    }
  };
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"wrap_session.js":function module(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/mdg_meteor-apm-agent/lib/hijack/wrap_session.js                                                           //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
wrapSession = function (sessionProto) {
  var originalProcessMessage = sessionProto.processMessage;
  sessionProto.processMessage = function (msg) {
    if (true) {
      var kadiraInfo = {
        session: this.id,
        userId: this.userId
      };
      if (msg.msg == 'method' || msg.msg == 'sub') {
        kadiraInfo.trace = Kadira.tracer.start(this, msg);
        Kadira.waitTimeBuilder.register(this, msg.id);

        //use JSON stringify to save the CPU
        var startData = {
          userId: this.userId,
          params: JSON.stringify(msg.params)
        };
        Kadira.tracer.event(kadiraInfo.trace, 'start', startData);
        var waitEventId = Kadira.tracer.event(kadiraInfo.trace, 'wait', {}, kadiraInfo);
        msg._waitEventId = waitEventId;
        msg.__kadiraInfo = kadiraInfo;
        if (msg.msg == 'sub') {
          // start tracking inside processMessage allows us to indicate
          // wait time as well
          Kadira.EventBus.emit('pubsub', 'subReceived', this, msg);
          Kadira.models.pubsub._trackSub(this, msg);
        }
      }

      // Update session last active time
      Kadira.EventBus.emit('system', 'ddpMessageReceived', this, msg);
      Kadira.models.system.handleSessionActivity(msg, this);
    }
    return originalProcessMessage.call(this, msg);
  };

  //adding the method context to the current fiber
  var originalMethodHandler = sessionProto.protocol_handlers.method;
  sessionProto.protocol_handlers.method = function (msg, unblock) {
    var self = this;
    //add context
    var kadiraInfo = msg.__kadiraInfo;
    if (kadiraInfo) {
      Kadira._setInfo(kadiraInfo);

      // end wait event
      var waitList = Kadira.waitTimeBuilder.build(this, msg.id);
      Kadira.tracer.eventEnd(kadiraInfo.trace, msg._waitEventId, {
        waitOn: waitList
      });
      unblock = Kadira.waitTimeBuilder.trackWaitTime(this, msg, unblock);
      var response = Kadira.env.kadiraInfo.withValue(kadiraInfo, function () {
        return originalMethodHandler.call(self, msg, unblock);
      });
      unblock();
    } else {
      var response = originalMethodHandler.call(self, msg, unblock);
    }
    return response;
  };

  //to capture the currently processing message
  var orginalSubHandler = sessionProto.protocol_handlers.sub;
  sessionProto.protocol_handlers.sub = function (msg, unblock) {
    var self = this;
    //add context
    var kadiraInfo = msg.__kadiraInfo;
    if (kadiraInfo) {
      Kadira._setInfo(kadiraInfo);

      // end wait event
      var waitList = Kadira.waitTimeBuilder.build(this, msg.id);
      Kadira.tracer.eventEnd(kadiraInfo.trace, msg._waitEventId, {
        waitOn: waitList
      });
      unblock = Kadira.waitTimeBuilder.trackWaitTime(this, msg, unblock);
      var response = Kadira.env.kadiraInfo.withValue(kadiraInfo, function () {
        return orginalSubHandler.call(self, msg, unblock);
      });
      unblock();
    } else {
      var response = orginalSubHandler.call(self, msg, unblock);
    }
    return response;
  };

  //to capture the currently processing message
  var orginalUnSubHandler = sessionProto.protocol_handlers.unsub;
  sessionProto.protocol_handlers.unsub = function (msg, unblock) {
    unblock = Kadira.waitTimeBuilder.trackWaitTime(this, msg, unblock);
    var response = orginalUnSubHandler.call(this, msg, unblock);
    unblock();
    return response;
  };

  //track method ending (to get the result of error)
  var originalSend = sessionProto.send;
  sessionProto.send = function (msg) {
    if (msg.msg == 'result') {
      var kadiraInfo = Kadira._getInfo();
      if (kadiraInfo) {
        if (msg.error) {
          var error = _.pick(msg.error, ['message', 'stack']);

          // pick the error from the wrapped method handler
          if (kadiraInfo && kadiraInfo.currentError) {
            // the error stack is wrapped so Meteor._debug can identify
            // this as a method error.
            error = _.pick(kadiraInfo.currentError, ['message', 'stack']);
            // see wrapMethodHanderForErrors() method def for more info
            if (error.stack && error.stack.stack) {
              error.stack = error.stack.stack;
            }
          }
          Kadira.tracer.endLastEvent(kadiraInfo.trace);
          Kadira.tracer.event(kadiraInfo.trace, 'error', {
            error: error
          });
        } else {
          Kadira.tracer.endLastEvent(kadiraInfo.trace);
          Kadira.tracer.event(kadiraInfo.trace, 'complete');
        }

        //processing the message
        var trace = Kadira.tracer.buildTrace(kadiraInfo.trace);
        Kadira.EventBus.emit('method', 'methodCompleted', trace, this);
        Kadira.models.methods.processMethod(trace);

        // error may or may not exist and error tracking can be disabled
        if (error && Kadira.options.enableErrorTracking) {
          Kadira.models.error.trackError(error, trace);
        }

        //clean and make sure, fiber is clean
        //not sure we need to do this, but a preventive measure
        Kadira._setInfo(null);
      }
    }
    return originalSend.call(this, msg);
  };
};

// wrap existing method handlers for capturing errors
_.each(Meteor.server.method_handlers, function (handler, name) {
  wrapMethodHanderForErrors(name, handler, Meteor.server.method_handlers);
});

// wrap future method handlers for capturing errors
var originalMeteorMethods = Meteor.methods;
Meteor.methods = function (methodMap) {
  _.each(methodMap, function (handler, name) {
    wrapMethodHanderForErrors(name, handler, methodMap);
  });
  originalMeteorMethods(methodMap);
};
function wrapMethodHanderForErrors(name, originalHandler, methodMap) {
  methodMap[name] = function () {
    try {
      return originalHandler.apply(this, arguments);
    } catch (ex) {
      if (ex && Kadira._getInfo()) {
        // sometimes error may be just an string or a primitive
        // in that case, we need to make it a psuedo error
        if (typeof ex !== 'object') {
          ex = {
            message: ex,
            stack: ex
          };
        }
        // Now we are marking this error to get tracked via methods
        // But, this also triggers a Meteor.debug call and
        // it only gets the stack
        // We also track Meteor.debug errors and want to stop
        // tracking this error. That's why we do this
        // See Meteor.debug error tracking code for more
        if (Kadira.options.enableErrorTracking) {
          ex.stack = {
            stack: ex.stack,
            source: 'method'
          };
        }
        Kadira._getInfo().currentError = ex;
      }
      throw ex;
    }
  };
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"wrap_subscription.js":function module(require){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/mdg_meteor-apm-agent/lib/hijack/wrap_subscription.js                                                      //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
var Fiber = Npm.require('fibers');
wrapSubscription = function (subscriptionProto) {
  // If the ready event runs outside the Fiber, Kadira._getInfo() doesn't work.
  // we need some other way to store kadiraInfo so we can use it at ready hijack.
  var originalRunHandler = subscriptionProto._runHandler;
  subscriptionProto._runHandler = function () {
    var kadiraInfo = Kadira._getInfo();
    if (kadiraInfo) {
      this.__kadiraInfo = kadiraInfo;
    }
    ;
    originalRunHandler.call(this);
  };
  var originalReady = subscriptionProto.ready;
  subscriptionProto.ready = function () {
    // meteor has a field called `_ready` which tracks this
    // but we need to make it future proof
    if (!this._apmReadyTracked) {
      var kadiraInfo = Kadira._getInfo() || this.__kadiraInfo;
      delete this.__kadiraInfo;
      //sometime .ready can be called in the context of the method
      //then we have some problems, that's why we are checking this
      //eg:- Accounts.createUser
      if (kadiraInfo && this._subscriptionId == kadiraInfo.trace.id) {
        Kadira.tracer.endLastEvent(kadiraInfo.trace);
        Kadira.tracer.event(kadiraInfo.trace, 'complete');
        var trace = Kadira.tracer.buildTrace(kadiraInfo.trace);
      }
      Kadira.EventBus.emit('pubsub', 'subCompleted', trace, this._session, this);
      Kadira.models.pubsub._trackReady(this._session, this, trace);
      this._apmReadyTracked = true;
    }

    // we still pass the control to the original implementation
    // since multiple ready calls are handled by itself
    originalReady.call(this);
  };
  var originalError = subscriptionProto.error;
  subscriptionProto.error = function (err) {
    if (err) {
      var kadiraInfo = Kadira._getInfo();
      if (kadiraInfo && this._subscriptionId == kadiraInfo.trace.id) {
        Kadira.tracer.endLastEvent(kadiraInfo.trace);
        var errorForApm = _.pick(err, 'message', 'stack');
        Kadira.tracer.event(kadiraInfo.trace, 'error', {
          error: errorForApm
        });
        var trace = Kadira.tracer.buildTrace(kadiraInfo.trace);
        Kadira.models.pubsub._trackError(this._session, this, trace);

        // error tracking can be disabled and if there is a trace
        // trace should be avaialble all the time, but it won't
        // if something wrong happened on the trace building
        if (Kadira.options.enableErrorTracking && trace) {
          Kadira.models.error.trackError(err, trace);
        }
      }

      // wrap error stack so Meteor._debug can identify and ignore it
      if (Kadira.options.enableErrorTracking) {
        err.stack = {
          stack: err.stack,
          source: "subscription"
        };
      }
      originalError.call(this, err);
    }
  };
  var originalDeactivate = subscriptionProto._deactivate;
  subscriptionProto._deactivate = function () {
    Kadira.EventBus.emit('pubsub', 'subDeactivated', this._session, this);
    Kadira.models.pubsub._trackUnsub(this._session, this);
    originalDeactivate.call(this);
  };

  //adding the currenSub env variable
  ['added', 'changed', 'removed'].forEach(function (funcName) {
    var originalFunc = subscriptionProto[funcName];
    subscriptionProto[funcName] = function (collectionName, id, fields) {
      var self = this;

      // we need to run this code in a fiber and that's how we track
      // subscription info. May be we can figure out, some other way to do this
      // We use this currently to get the publication info when tracking message
      // sizes at wrap_ddp_stringify.js
      Kadira.env.currentSub = self;
      var res = originalFunc.call(self, collectionName, id, fields);
      Kadira.env.currentSub = null;
      return res;
    };
  });
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"wrap_observers.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/mdg_meteor-apm-agent/lib/hijack/wrap_observers.js                                                         //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
let MongoConnection;
module.link("./meteorx.js", {
  MongoConnection(v) {
    MongoConnection = v;
  }
}, 0);
wrapOplogObserveDriver = function (proto) {
  // Track the polled documents. This is reflect to the RAM size and
  // for the CPU usage directly
  var originalPublishNewResults = proto._publishNewResults;
  proto._publishNewResults = function (newResults, newBuffer) {
    var coll = this._cursorDescription.collectionName;
    var query = this._cursorDescription.selector;
    var opts = this._cursorDescription.options;
    var docSize = Kadira.docSzCache.getSize(coll, query, opts, newResults);
    var docSize = Kadira.docSzCache.getSize(coll, query, opts, newBuffer);
    var count = newResults.size() + newBuffer.size();
    if (this._ownerInfo) {
      Kadira.models.pubsub.trackPolledDocuments(this._ownerInfo, count);
      Kadira.models.pubsub.trackDocSize(this._ownerInfo.name, "polledFetches", docSize * count);
    } else {
      this._polledDocuments = count;
      this._docSize = {
        polledFetches: docSize * count
      };
    }
    return originalPublishNewResults.call(this, newResults, newBuffer);
  };
  var originalHandleOplogEntryQuerying = proto._handleOplogEntryQuerying;
  proto._handleOplogEntryQuerying = function (op) {
    Kadira.models.pubsub.trackDocumentChanges(this._ownerInfo, op);
    return originalHandleOplogEntryQuerying.call(this, op);
  };
  var originalHandleOplogEntrySteadyOrFetching = proto._handleOplogEntrySteadyOrFetching;
  proto._handleOplogEntrySteadyOrFetching = function (op) {
    Kadira.models.pubsub.trackDocumentChanges(this._ownerInfo, op);
    return originalHandleOplogEntrySteadyOrFetching.call(this, op);
  };

  // track live updates
  ['_addPublished', '_removePublished', '_changePublished'].forEach(function (fnName) {
    var originalFn = proto[fnName];
    proto[fnName] = function (a, b, c) {
      if (this._ownerInfo) {
        Kadira.models.pubsub.trackLiveUpdates(this._ownerInfo, fnName, 1);
        if (fnName === "_addPublished") {
          var coll = this._cursorDescription.collectionName;
          var query = this._cursorDescription.selector;
          var opts = this._cursorDescription.options;
          var docSize = Kadira.docSzCache.getSize(coll, query, opts, [b]);
          Kadira.models.pubsub.trackDocSize(this._ownerInfo.name, "liveFetches", docSize);
        }
      } else {
        // If there is no ownerInfo, that means this is the initial adds
        if (!this._liveUpdatesCounts) {
          this._liveUpdatesCounts = {
            _initialAdds: 0
          };
        }
        this._liveUpdatesCounts._initialAdds++;
        if (fnName === "_addPublished") {
          if (!this._docSize) {
            this._docSize = {
              initialFetches: 0
            };
          }
          if (!this._docSize.initialFetches) {
            this._docSize.initialFetches = 0;
          }
          var coll = this._cursorDescription.collectionName;
          var query = this._cursorDescription.selector;
          var opts = this._cursorDescription.options;
          var docSize = Kadira.docSzCache.getSize(coll, query, opts, [b]);
          this._docSize.initialFetches += docSize;
        }
      }
      return originalFn.call(this, a, b, c);
    };
  });
  var originalStop = proto.stop;
  proto.stop = function () {
    if (this._ownerInfo && this._ownerInfo.type === 'sub') {
      Kadira.EventBus.emit('pubsub', 'observerDeleted', this._ownerInfo);
      Kadira.models.pubsub.trackDeletedObserver(this._ownerInfo);
    }
    return originalStop.call(this);
  };
};
wrapPollingObserveDriver = function (proto) {
  var originalPollMongo = proto._pollMongo;
  proto._pollMongo = function () {
    var start = Date.now();
    originalPollMongo.call(this);

    // Current result is stored in the following variable.
    // So, we can use that
    // Sometimes, it's possible to get size as undefined.
    // May be something with different version. We don't need to worry about
    // this now
    var count = 0;
    var docSize = 0;
    if (this._results && this._results.size) {
      count = this._results.size() || 0;
      var coll = this._cursorDescription.collectionName;
      var query = this._cursorDescription.selector;
      var opts = this._cursorDescription.options;
      docSize = Kadira.docSzCache.getSize(coll, query, opts, this._results._map) * count;
    }
    if (this._ownerInfo) {
      Kadira.models.pubsub.trackPolledDocuments(this._ownerInfo, count);
      Kadira.models.pubsub.trackDocSize(this._ownerInfo.name, "polledFetches", docSize);
    } else {
      this._polledDocuments = count;
      this._polledDocSize = docSize;
    }
  };
  var originalStop = proto.stop;
  proto.stop = function () {
    if (this._ownerInfo && this._ownerInfo.type === 'sub') {
      Kadira.EventBus.emit('pubsub', 'observerDeleted', this._ownerInfo);
      Kadira.models.pubsub.trackDeletedObserver(this._ownerInfo);
    }
    return originalStop.call(this);
  };
};
wrapMultiplexer = function (proto) {
  var originalInitalAdd = proto.addHandleAndSendInitialAdds;
  proto.addHandleAndSendInitialAdds = function (handle) {
    if (!this._firstInitialAddTime) {
      this._firstInitialAddTime = Date.now();
    }
    handle._wasMultiplexerReady = this._ready();
    handle._queueLength = this._queue._taskHandles.length;
    if (!handle._wasMultiplexerReady) {
      handle._elapsedPollingTime = Date.now() - this._firstInitialAddTime;
    }
    return originalInitalAdd.call(this, handle);
  };
};
wrapForCountingObservers = function () {
  // to count observers
  var mongoConnectionProto = MongoConnection.prototype;
  var originalObserveChanges = mongoConnectionProto._observeChanges;
  mongoConnectionProto._observeChanges = function (cursorDescription, ordered, callbacks) {
    var ret = originalObserveChanges.call(this, cursorDescription, ordered, callbacks);
    // get the Kadira Info via the Meteor.EnvironmentalVariable
    var kadiraInfo = Kadira._getInfo(null, true);
    if (kadiraInfo && ret._multiplexer) {
      if (!ret._multiplexer.__kadiraTracked) {
        // new multiplexer
        ret._multiplexer.__kadiraTracked = true;
        Kadira.EventBus.emit('pubsub', 'newSubHandleCreated', kadiraInfo.trace);
        Kadira.models.pubsub.incrementHandleCount(kadiraInfo.trace, false);
        if (kadiraInfo.trace.type == 'sub') {
          var ownerInfo = {
            type: kadiraInfo.trace.type,
            name: kadiraInfo.trace.name,
            startTime: new Date().getTime()
          };
          var observerDriver = ret._multiplexer._observeDriver;
          observerDriver._ownerInfo = ownerInfo;
          Kadira.EventBus.emit('pubsub', 'observerCreated', ownerInfo);
          Kadira.models.pubsub.trackCreatedObserver(ownerInfo);

          // We need to send initially polled documents if there are
          if (observerDriver._polledDocuments) {
            Kadira.models.pubsub.trackPolledDocuments(ownerInfo, observerDriver._polledDocuments);
            observerDriver._polledDocuments = 0;
          }

          // We need to send initially polled documents if there are
          if (observerDriver._polledDocSize) {
            Kadira.models.pubsub.trackDocSize(ownerInfo.name, "polledFetches", observerDriver._polledDocSize);
            observerDriver._polledDocSize = 0;
          }

          // Process _liveUpdatesCounts
          _.each(observerDriver._liveUpdatesCounts, function (count, key) {
            Kadira.models.pubsub.trackLiveUpdates(ownerInfo, key, count);
          });

          // Process docSize
          _.each(observerDriver._docSize, function (count, key) {
            Kadira.models.pubsub.trackDocSize(ownerInfo.name, key, count);
          });
        }
      } else {
        Kadira.EventBus.emit('pubsub', 'cachedSubHandleCreated', kadiraInfo.trace);
        Kadira.models.pubsub.incrementHandleCount(kadiraInfo.trace, true);
      }
    }
    return ret;
  };
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"wrap_ddp_stringify.js":function module(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/mdg_meteor-apm-agent/lib/hijack/wrap_ddp_stringify.js                                                     //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
wrapStringifyDDP = function () {
  var originalStringifyDDP = DDPCommon.stringifyDDP;
  DDPCommon.stringifyDDP = function (msg) {
    var msgString = originalStringifyDDP(msg);
    var msgSize = Buffer.byteLength(msgString, 'utf8');
    var kadiraInfo = Kadira._getInfo(null, true);
    if (kadiraInfo) {
      if (kadiraInfo.trace.type === 'method') {
        Kadira.models.methods.trackMsgSize(kadiraInfo.trace.name, msgSize);
      }
      return msgString;
    }

    // 'currentSub' is set when we wrap Subscription object and override
    // handlers for 'added', 'changed', 'removed' events. (see lib/hijack/wrap_subscription.js)
    if (Kadira.env.currentSub) {
      if (Kadira.env.currentSub.__kadiraInfo) {
        Kadira.models.pubsub.trackMsgSize(Kadira.env.currentSub._name, "initialSent", msgSize);
        return msgString;
      }
      Kadira.models.pubsub.trackMsgSize(Kadira.env.currentSub._name, "liveSent", msgSize);
      return msgString;
    }
    Kadira.models.methods.trackMsgSize("<not-a-method-or-a-pub>", msgSize);
    return msgString;
  };
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"instrument.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/mdg_meteor-apm-agent/lib/hijack/instrument.js                                                             //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
let MongoOplogDriver, MongoPollingDriver, Multiplexer, Server, Session, Subscription;
module.link("./meteorx.js", {
  MongoOplogDriver(v) {
    MongoOplogDriver = v;
  },
  MongoPollingDriver(v) {
    MongoPollingDriver = v;
  },
  Multiplexer(v) {
    Multiplexer = v;
  },
  Server(v) {
    Server = v;
  },
  Session(v) {
    Session = v;
  },
  Subscription(v) {
    Subscription = v;
  }
}, 0);
var logger = Npm.require('debug')('kadira:hijack:instrument');
var instrumented = false;
Kadira._startInstrumenting = function (callback) {
  if (instrumented) {
    callback();
    return;
  }
  instrumented = true;
  wrapStringifyDDP();
  Meteor.startup(function () {
    return Promise.asyncApply(() => {
      wrapServer(Server.prototype);
      wrapSession(Session.prototype);
      wrapSubscription(Subscription.prototype);
      if (MongoOplogDriver) {
        wrapOplogObserveDriver(MongoOplogDriver.prototype);
      }
      if (MongoPollingDriver) {
        wrapPollingObserveDriver(MongoPollingDriver.prototype);
      }
      if (Multiplexer) {
        wrapMultiplexer(Multiplexer.prototype);
      }
      wrapForCountingObservers();
      hijackDBOps();
      setLabels();
      callback();
    });
  });
};

// We need to instrument this rightaway and it's okay
// One reason for this is to call `setLables()` function
// Otherwise, CPU profile can't see all our custom labeling
Kadira._startInstrumenting(function () {
  console.log('Meteor APM: completed instrumenting the app');
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"db.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/mdg_meteor-apm-agent/lib/hijack/db.js                                                                     //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
let MongoConnection, MongoCursor;
module.link("./meteorx.js", {
  MongoConnection(v) {
    MongoConnection = v;
  },
  MongoCursor(v) {
    MongoCursor = v;
  }
}, 0);
// This hijack is important to make sure, collections created before
// we hijack dbOps, even gets tracked.
//  Meteor does not simply expose MongoConnection object to the client
//  It picks methods which are necessory and make a binded object and
//  assigned to the Mongo.Collection
//  so, even we updated prototype, we can't track those collections
//  but, this will fix it.
var originalOpen = MongoInternals.RemoteCollectionDriver.prototype.open;
MongoInternals.RemoteCollectionDriver.prototype.open = function open(name) {
  var self = this;
  var ret = originalOpen.call(self, name);
  _.each(ret, function (fn, m) {
    // make sure, it's in the actual mongo connection object
    // meteorhacks:mongo-collection-utils package add some arbitary methods
    // which does not exist in the mongo connection
    if (self.mongo[m]) {
      ret[m] = function () {
        Array.prototype.unshift.call(arguments, name);
        return OptimizedApply(self.mongo, self.mongo[m], arguments);
      };
    }
  });
  return ret;
};
hijackDBOps = function hijackDBOps() {
  var mongoConnectionProto = MongoConnection.prototype;
  //findOne is handled by find - so no need to track it
  //upsert is handles by update
  ['find', 'update', 'remove', 'insert', '_ensureIndex', '_dropIndex'].forEach(function (func) {
    var originalFunc = mongoConnectionProto[func];
    mongoConnectionProto[func] = function (collName, selector, mod, options) {
      var payload = {
        coll: collName,
        func: func
      };
      if (func == 'insert') {
        //add nothing more to the payload
      } else if (func == '_ensureIndex' || func == '_dropIndex') {
        //add index
        payload.index = JSON.stringify(selector);
      } else if (func == 'update' && options && options.upsert) {
        payload.func = 'upsert';
        payload.selector = JSON.stringify(selector);
      } else {
        //all the other functions have selectors
        payload.selector = JSON.stringify(selector);
      }
      var kadiraInfo = Kadira._getInfo();
      if (kadiraInfo) {
        var eventId = Kadira.tracer.event(kadiraInfo.trace, 'db', payload);
      }

      //this cause V8 to avoid any performance optimizations, but this is must to use
      //otherwise, if the error adds try catch block our logs get messy and didn't work
      //see: issue #6
      try {
        var ret = originalFunc.apply(this, arguments);
        //handling functions which can be triggered with an asyncCallback
        var endOptions = {};
        if (HaveAsyncCallback(arguments)) {
          endOptions.async = true;
        }
        if (func == 'update') {
          // upsert only returns an object when called `upsert` directly
          // otherwise it only act an update command
          if (options && options.upsert && typeof ret == 'object') {
            endOptions.updatedDocs = ret.numberAffected;
            endOptions.insertedId = ret.insertedId;
          } else {
            endOptions.updatedDocs = ret;
          }
        } else if (func == 'remove') {
          endOptions.removedDocs = ret;
        }
        if (eventId) {
          Kadira.tracer.eventEnd(kadiraInfo.trace, eventId, endOptions);
        }
      } catch (ex) {
        if (eventId) {
          Kadira.tracer.eventEnd(kadiraInfo.trace, eventId, {
            err: ex.message
          });
        }
        throw ex;
      }
      return ret;
    };
  });
  var cursorProto = MongoCursor.prototype;
  ['forEach', 'map', 'fetch', 'count', 'observeChanges', 'observe', 'rewind'].forEach(function (type) {
    var originalFunc = cursorProto[type];
    cursorProto[type] = function () {
      var cursorDescription = this._cursorDescription;
      var payload = Object.assign(Object.create(null), {
        coll: cursorDescription.collectionName,
        selector: JSON.stringify(cursorDescription.selector),
        func: type,
        cursor: true
      });
      if (cursorDescription.options) {
        var cursorOptions = _.pick(cursorDescription.options, ['fields', 'sort', 'limit']);
        for (var field in cursorOptions) {
          var value = cursorOptions[field];
          if (typeof value == 'object') {
            value = JSON.stringify(value);
          }
          payload[field] = value;
        }
      }
      ;
      var kadiraInfo = Kadira._getInfo();
      if (kadiraInfo) {
        var eventId = Kadira.tracer.event(kadiraInfo.trace, 'db', payload);
      }
      try {
        var ret = originalFunc.apply(this, arguments);
        var endData = {};
        if (type == 'observeChanges' || type == 'observe') {
          var observerDriver;
          endData.oplog = false;
          // get data written by the multiplexer
          endData.wasMultiplexerReady = ret._wasMultiplexerReady;
          endData.queueLength = ret._queueLength;
          endData.elapsedPollingTime = ret._elapsedPollingTime;
          if (ret._multiplexer) {
            // older meteor versions done not have an _multiplexer value
            observerDriver = ret._multiplexer._observeDriver;
            if (observerDriver) {
              observerDriver = ret._multiplexer._observeDriver;
              var observerDriverClass = observerDriver.constructor;
              var usesOplog = typeof observerDriverClass.cursorSupported == 'function';
              endData.oplog = usesOplog;
              var size = 0;
              ret._multiplexer._cache.docs.forEach(function () {
                size++;
              });
              endData.noOfCachedDocs = size;

              // if multiplexerWasNotReady, we need to get the time spend for the polling
              if (!ret._wasMultiplexerReady) {
                endData.initialPollingTime = observerDriver._lastPollTime;
              }
            }
          }
          if (!endData.oplog) {
            // let's try to find the reason
            var reasonInfo = Kadira.checkWhyNoOplog(cursorDescription, observerDriver);
            endData.noOplogCode = reasonInfo.code;
            endData.noOplogReason = reasonInfo.reason;
            endData.noOplogSolution = reasonInfo.solution;
          }
        } else if (type == 'fetch' || type == 'map') {
          //for other cursor operation

          endData.docsFetched = ret.length;
          if (type == 'fetch') {
            var coll = cursorDescription.collectionName;
            var query = cursorDescription.selector;
            var opts = cursorDescription.options;
            var docSize = Kadira.docSzCache.getSize(coll, query, opts, ret) * ret.length;
            endData.docSize = docSize;
            if (kadiraInfo) {
              if (kadiraInfo.trace.type === 'method') {
                Kadira.models.methods.trackDocSize(kadiraInfo.trace.name, docSize);
              } else if (kadiraInfo.trace.type === 'sub') {
                Kadira.models.pubsub.trackDocSize(kadiraInfo.trace.name, "cursorFetches", docSize);
              }
            } else {
              // Fetch with no kadira info are tracked as from a null method
              Kadira.models.methods.trackDocSize("<not-a-method-or-a-pub>", docSize);
            }

            // TODO: Add doc size tracking to `map` as well.
          }
        }
        if (eventId) {
          Kadira.tracer.eventEnd(kadiraInfo.trace, eventId, endData);
        }
        return ret;
      } catch (ex) {
        if (eventId) {
          Kadira.tracer.eventEnd(kadiraInfo.trace, eventId, {
            err: ex.message
          });
        }
        throw ex;
      }
    };
  });
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"http.js":function module(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/mdg_meteor-apm-agent/lib/hijack/http.js                                                                   //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
var originalCall = HTTP.call;
HTTP.call = function (method, url) {
  var kadiraInfo = Kadira._getInfo();
  if (kadiraInfo) {
    var eventId = Kadira.tracer.event(kadiraInfo.trace, 'http', {
      method: method,
      url: url
    });
  }
  try {
    var response = originalCall.apply(this, arguments);

    //if the user supplied an asynCallback, we don't have a response object and it handled asynchronously
    //we need to track it down to prevent issues like: #3
    var endOptions = HaveAsyncCallback(arguments) ? {
      async: true
    } : {
      statusCode: response.statusCode
    };
    if (eventId) {
      Kadira.tracer.eventEnd(kadiraInfo.trace, eventId, endOptions);
    }
    return response;
  } catch (ex) {
    if (eventId) {
      Kadira.tracer.eventEnd(kadiraInfo.trace, eventId, {
        err: ex.message
      });
    }
    throw ex;
  }
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"email.js":function module(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/mdg_meteor-apm-agent/lib/hijack/email.js                                                                  //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
var originalSend = Email.send;
Email.send = function (options) {
  var kadiraInfo = Kadira._getInfo();
  if (kadiraInfo) {
    var data = _.pick(options, 'from', 'to', 'cc', 'bcc', 'replyTo');
    var eventId = Kadira.tracer.event(kadiraInfo.trace, 'email', data);
  }
  try {
    var ret = originalSend.call(this, options);
    if (eventId) {
      Kadira.tracer.eventEnd(kadiraInfo.trace, eventId);
    }
    return ret;
  } catch (ex) {
    if (eventId) {
      Kadira.tracer.eventEnd(kadiraInfo.trace, eventId, {
        err: ex.message
      });
    }
    throw ex;
  }
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"async.js":function module(require){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/mdg_meteor-apm-agent/lib/hijack/async.js                                                                  //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
var Fibers = Npm.require('fibers');
var originalYield = Fibers.yield;
Fibers.yield = function () {
  var kadiraInfo = Kadira._getInfo();
  if (kadiraInfo) {
    var eventId = Kadira.tracer.event(kadiraInfo.trace, 'async');
    ;
    if (eventId) {
      Fibers.current._apmEventId = eventId;
    }
  }
  return originalYield();
};
var originalRun = Fibers.prototype.run;
Fibers.prototype.run = function (val) {
  if (this._apmEventId) {
    var kadiraInfo = Kadira._getInfo(this);
    if (kadiraInfo) {
      Kadira.tracer.eventEnd(kadiraInfo.trace, this._apmEventId);
      this._apmEventId = null;
    }
  }
  return originalRun.call(this, val);
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"error.js":function module(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/mdg_meteor-apm-agent/lib/hijack/error.js                                                                  //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
TrackUncaughtExceptions = function () {
  process.on('uncaughtException', function (err) {
    // skip errors with `_skipKadira` flag
    if (err._skipKadira) {
      return;
    }

    // let the server crash normally if error tracking is disabled
    if (!Kadira.options.enableErrorTracking) {
      printErrorAndKill(err);
    }

    // looking for already tracked errors and throw them immediately
    // throw error immediately if kadira is not ready
    if (err._tracked || !Kadira.connected) {
      printErrorAndKill(err);
    }
    var trace = getTrace(err, 'server-crash', 'uncaughtException');
    Kadira.models.error.trackError(err, trace);
    Kadira._sendPayload(function () {
      clearTimeout(timer);
      throwError(err);
    });
    var timer = setTimeout(function () {
      throwError(err);
    }, 1000 * 10);
    function throwError(err) {
      // sometimes error came back from a fiber.
      // But we don't fibers to track that error for us
      // That's why we throw the error on the nextTick
      process.nextTick(function () {
        // we need to mark this error where we really need to throw
        err._tracked = true;
        printErrorAndKill(err);
      });
    }
  });
  function printErrorAndKill(err) {
    // since we are capturing error, we are also on the error message.
    // so developers think we are also reponsible for the error.
    // But we are not. This will fix that.
    console.error(err.stack);
    process.exit(7);
  }
};
TrackMeteorDebug = function () {
  var originalMeteorDebug = Meteor._debug;
  Meteor._debug = function (message, stack) {
    if (!Kadira.options.enableErrorTracking) {
      return originalMeteorDebug.call(this, message, stack);
    }

    // We've changed `stack` into an object at method and sub handlers so we can
    // ignore them here. These errors are already tracked so don't track again.
    if (stack && stack.stack) {
      stack = stack.stack;
      // Restore so origionalMeteorDebug shows the stack as a string instead as
      // an object
      arguments[1] = stack;
    } else {
      // only send to the server, if only connected to kadira
      if (Kadira.connected) {
        var error = new Error(message);
        error.stack = stack;
        var trace = getTrace(error, 'server-internal', 'Meteor._debug');
        Kadira.models.error.trackError(error, trace);
      }
    }
    return originalMeteorDebug.apply(this, arguments);
  };
};
function getTrace(err, type, subType) {
  return {
    type: type,
    subType: subType,
    name: err.message,
    errored: true,
    at: Kadira.syncedDate.getTime(),
    events: [['start', 0, {}], ['error', 0, {
      error: {
        message: err.message,
        stack: err.stack
      }
    }]],
    metrics: {
      total: 0
    }
  };
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"set_labels.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/mdg_meteor-apm-agent/lib/hijack/set_labels.js                                                             //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
let Session, Multiplexer, MongoConnection, MongoCursor;
module.link("./meteorx.js", {
  Session(v) {
    Session = v;
  },
  Multiplexer(v) {
    Multiplexer = v;
  },
  MongoConnection(v) {
    MongoConnection = v;
  },
  MongoCursor(v) {
    MongoCursor = v;
  }
}, 0);
setLabels = function () {
  // name Session.prototype.send
  var originalSend = Session.prototype.send;
  Session.prototype.send = function kadira_Session_send(msg) {
    return originalSend.call(this, msg);
  };

  // name Multiplexer initial adds
  var originalSendAdds = Multiplexer.prototype._sendAdds;
  Multiplexer.prototype._sendAdds = function kadira_Multiplexer_sendAdds(handle) {
    return originalSendAdds.call(this, handle);
  };

  // name MongoConnection insert
  var originalMongoInsert = MongoConnection.prototype._insert;
  MongoConnection.prototype._insert = function kadira_MongoConnection_insert(coll, doc, cb) {
    return originalMongoInsert.call(this, coll, doc, cb);
  };

  // name MongoConnection update
  var originalMongoUpdate = MongoConnection.prototype._update;
  MongoConnection.prototype._update = function kadira_MongoConnection_update(coll, selector, mod, options, cb) {
    return originalMongoUpdate.call(this, coll, selector, mod, options, cb);
  };

  // name MongoConnection remove
  var originalMongoRemove = MongoConnection.prototype._remove;
  MongoConnection.prototype._remove = function kadira_MongoConnection_remove(coll, selector, cb) {
    return originalMongoRemove.call(this, coll, selector, cb);
  };

  // name Pubsub added
  var originalPubsubAdded = Session.prototype.sendAdded;
  Session.prototype.sendAdded = function kadira_Session_sendAdded(coll, id, fields) {
    return originalPubsubAdded.call(this, coll, id, fields);
  };

  // name Pubsub changed
  var originalPubsubChanged = Session.prototype.sendChanged;
  Session.prototype.sendChanged = function kadira_Session_sendChanged(coll, id, fields) {
    return originalPubsubChanged.call(this, coll, id, fields);
  };

  // name Pubsub removed
  var originalPubsubRemoved = Session.prototype.sendRemoved;
  Session.prototype.sendRemoved = function kadira_Session_sendRemoved(coll, id) {
    return originalPubsubRemoved.call(this, coll, id);
  };

  // name MongoCursor forEach
  var originalCursorForEach = MongoCursor.prototype.forEach;
  MongoCursor.prototype.forEach = function kadira_Cursor_forEach() {
    return originalCursorForEach.apply(this, arguments);
  };

  // name MongoCursor map
  var originalCursorMap = MongoCursor.prototype.map;
  MongoCursor.prototype.map = function kadira_Cursor_map() {
    return originalCursorMap.apply(this, arguments);
  };

  // name MongoCursor fetch
  var originalCursorFetch = MongoCursor.prototype.fetch;
  MongoCursor.prototype.fetch = function kadira_Cursor_fetch() {
    return originalCursorFetch.apply(this, arguments);
  };

  // name MongoCursor count
  var originalCursorCount = MongoCursor.prototype.count;
  MongoCursor.prototype.count = function kadira_Cursor_count() {
    return originalCursorCount.apply(this, arguments);
  };

  // name MongoCursor observeChanges
  var originalCursorObserveChanges = MongoCursor.prototype.observeChanges;
  MongoCursor.prototype.observeChanges = function kadira_Cursor_observeChanges() {
    return originalCursorObserveChanges.apply(this, arguments);
  };

  // name MongoCursor observe
  var originalCursorObserve = MongoCursor.prototype.observe;
  MongoCursor.prototype.observe = function kadira_Cursor_observe() {
    return originalCursorObserve.apply(this, arguments);
  };

  // name MongoCursor rewind
  var originalCursorRewind = MongoCursor.prototype.rewind;
  MongoCursor.prototype.rewind = function kadira_Cursor_rewind() {
    return originalCursorRewind.apply(this, arguments);
  };

  // name CrossBar listen
  var originalCrossbarListen = DDPServer._Crossbar.prototype.listen;
  DDPServer._Crossbar.prototype.listen = function kadira_Crossbar_listen(trigger, callback) {
    return originalCrossbarListen.call(this, trigger, callback);
  };

  // name CrossBar fire
  var originalCrossbarFire = DDPServer._Crossbar.prototype.fire;
  DDPServer._Crossbar.prototype.fire = function kadira_Crossbar_fire(notification) {
    return originalCrossbarFire.call(this, notification);
  };
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"meteorx.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/mdg_meteor-apm-agent/lib/hijack/meteorx.js                                                                //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  Server: () => Server,
  Session: () => Session,
  MongoCursor: () => MongoCursor,
  Multiplexer: () => Multiplexer,
  MongoConnection: () => MongoConnection,
  Subscription: () => Subscription,
  MongoOplogDriver: () => MongoOplogDriver,
  MongoPollingDriver: () => MongoPollingDriver
});
let get;
module.link("../utils.js", {
  get(v) {
    get = v;
  }
}, 0);
const Server = Meteor.server.constructor;
function getSession() {
  const fakeSocket = {
    send() {},
    close() {},
    headers: []
  };
  const server = Meteor.server;
  server._handleConnect(fakeSocket, {
    msg: "connect",
    version: "pre1",
    support: ["pre1"]
  });
  const session = fakeSocket._meteorSession;
  server._removeSession(session);
  return session;
}
const session = getSession();
const Session = session.constructor;
const collection = new Mongo.Collection("__dummy_coll_" + Random.id());
collection.findOne();
const cursor = collection.find();
const MongoCursor = cursor.constructor;
function getMultiplexer(cursor) {
  const handle = cursor.observeChanges({
    added() {}
  });
  handle.stop();
  return handle._multiplexer;
}
const Multiplexer = getMultiplexer(cursor).constructor;
// Due to Meteor 2.7.4, defaultRemoteCollectionDriver can be Async now https://github.com/meteor/meteor/pull/12057
const mongoDriver = MongoInternals.defaultRemoteCollectionDriver();
const MongoConnection = (mongoDriver.await ? mongoDriver.await() : mongoDriver).mongo.constructor;
function getSubscription(session) {
  const subId = Random.id();
  session._startSubscription(function () {
    this.ready();
  }, subId, [], "__dummy_pub_" + Random.id());
  const subscription = get(session._namedSubs, subId);
  session._stopSubscription(subId);
  return subscription;
}
const Subscription = getSubscription(session).constructor;
function getObserverDriver(cursor) {
  const multiplexer = getMultiplexer(cursor);
  return multiplexer && multiplexer._observeDriver || null;
}
function getMongoOplogDriver() {
  const driver = getObserverDriver(cursor);
  let MongoOplogDriver = driver && driver.constructor || null;
  if (MongoOplogDriver && typeof MongoOplogDriver.cursorSupported !== "function") {
    return null;
  }
  return MongoOplogDriver;
}
const MongoOplogDriver = getMongoOplogDriver();
function getMongoPollingDriver() {
  const cursor = collection.find({}, {
    limit: 20,
    _disableOplog: true
  });
  const driver = getObserverDriver(cursor);

  // verify observer driver is a polling driver
  if (driver && typeof driver.constructor.cursorSupported === "undefined") {
    return driver.constructor;
  }
  return null;
}
const MongoPollingDriver = getMongoPollingDriver();
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"environment_variables.js":function module(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/mdg_meteor-apm-agent/lib/environment_variables.js                                                         //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
Kadira._parseEnv = function (env) {
  var options = {};
  for (var name in env) {
    var info = Kadira._parseEnv._options[name];
    var value = env[name];
    if (info && value) {
      options[info.name] = info.parser(value);
    }
  }
  return options;
};
Kadira._parseEnv.parseInt = function (str) {
  var num = parseInt(str);
  if (num || num === 0) return num;
  throw new Error('Kadira: Match Error: "' + num + '" is not a number');
};
Kadira._parseEnv.parseBool = function (str) {
  str = str.toLowerCase();
  if (str === 'true') return true;
  if (str === 'false') return false;
  throw new Error('Kadira: Match Error: ' + str + ' is not a boolean');
};
Kadira._parseEnv.parseUrl = function (str) {
  return str;
};
Kadira._parseEnv.parseString = function (str) {
  return str;
};
Kadira._parseEnv._options = {
  // delay to send the initial ping to the kadira engine after page loads
  APM_OPTIONS_CLIENT_ENGINE_SYNC_DELAY: {
    name: 'clientEngineSyncDelay',
    parser: Kadira._parseEnv.parseInt
  },
  // time between sending errors to the engine
  APM_OPTIONS_ERROR_DUMP_INTERVAL: {
    name: 'errorDumpInterval',
    parser: Kadira._parseEnv.parseInt
  },
  // no of errors allowed in a given interval
  APM_OPTIONS_MAX_ERRORS_PER_INTERVAL: {
    name: 'maxErrorsPerInterval',
    parser: Kadira._parseEnv.parseInt
  },
  // a zone.js specific option to collect the full stack trace(which is not much useful)
  APM_OPTIONS_COLLECT_ALL_STACKS: {
    name: 'collectAllStacks',
    parser: Kadira._parseEnv.parseBool
  },
  // enable error tracking (which is turned on by default)
  APM_OPTIONS_ENABLE_ERROR_TRACKING: {
    name: 'enableErrorTracking',
    parser: Kadira._parseEnv.parseBool
  },
  // kadira engine endpoint
  APM_OPTIONS_ENDPOINT: {
    name: 'endpoint',
    parser: Kadira._parseEnv.parseUrl
  },
  // define the hostname of the current running process
  APM_OPTIONS_HOSTNAME: {
    name: 'hostname',
    parser: Kadira._parseEnv.parseString
  },
  // interval between sending data to the kadira engine from the server
  APM_OPTIONS_PAYLOAD_TIMEOUT: {
    name: 'payloadTimeout',
    parser: Kadira._parseEnv.parseInt
  },
  // set HTTP/HTTPS proxy
  APM_OPTIONS_PROXY: {
    name: 'proxy',
    parser: Kadira._parseEnv.parseUrl
  },
  // number of items cached for tracking document size
  APM_OPTIONS_DOCUMENT_SIZE_CACHE_SIZE: {
    name: 'documentSizeCacheSize',
    parser: Kadira._parseEnv.parseInt
  }
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"auto_connect.js":function module(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/mdg_meteor-apm-agent/lib/auto_connect.js                                                                  //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
Kadira._connectWithEnv = function () {
  const settings = Meteor.settings && Meteor.settings.packages && Meteor.settings.packages['mdg:meteor-apm-agent'];
  if (settings && settings.isDisabled) {
    console.log('Meteor APM: not connected because it was disabled in settings');
    return;
  }
  if (process.env.APM_APP_ID && process.env.APM_APP_SECRET && process.env.APM_OPTIONS_ENDPOINT) {
    const options = Kadira._parseEnv(process.env);
    Kadira.connect(process.env.APM_APP_ID, process.env.APM_APP_SECRET, options);
    Kadira.connect = function () {
      throw new Error('Meteor APM has already connected using credentials from Environment Variables');
    };
  }
  if (settings && settings.APM_APP_ID && settings.APM_APP_SECRET) {
    const options = Kadira._parseEnv(settings);
    Kadira.connect(settings.APM_APP_ID, settings.APM_APP_SECRET, options);
    Kadira.connect = function () {
      throw new Error('Meteor APM has already connected using credentials from app Meteor.settings');
    };
  }
  // other forms of Kadira.connect are not supported
};

// Try to connect automatically
Kadira._connectWithEnv();
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

require("/node_modules/meteor/mdg:meteor-apm-agent/lib/common/unify.js");
require("/node_modules/meteor/mdg:meteor-apm-agent/lib/models/base_error.js");
require("/node_modules/meteor/mdg:meteor-apm-agent/lib/jobs.js");
require("/node_modules/meteor/mdg:meteor-apm-agent/lib/retry.js");
require("/node_modules/meteor/mdg:meteor-apm-agent/lib/utils.js");
require("/node_modules/meteor/mdg:meteor-apm-agent/lib/ntp.js");
require("/node_modules/meteor/mdg:meteor-apm-agent/lib/wait_time_builder.js");
require("/node_modules/meteor/mdg:meteor-apm-agent/lib/check_for_oplog.js");
require("/node_modules/meteor/mdg:meteor-apm-agent/lib/tracer/tracer.js");
require("/node_modules/meteor/mdg:meteor-apm-agent/lib/tracer/default_filters.js");
require("/node_modules/meteor/mdg:meteor-apm-agent/lib/tracer/tracer_store.js");
require("/node_modules/meteor/mdg:meteor-apm-agent/lib/models/0model.js");
require("/node_modules/meteor/mdg:meteor-apm-agent/lib/models/methods.js");
require("/node_modules/meteor/mdg:meteor-apm-agent/lib/models/pubsub.js");
require("/node_modules/meteor/mdg:meteor-apm-agent/lib/models/system.js");
require("/node_modules/meteor/mdg:meteor-apm-agent/lib/models/errors.js");
require("/node_modules/meteor/mdg:meteor-apm-agent/lib/docsize_cache.js");
require("/node_modules/meteor/mdg:meteor-apm-agent/lib/kadira.js");
require("/node_modules/meteor/mdg:meteor-apm-agent/lib/hijack/wrap_server.js");
require("/node_modules/meteor/mdg:meteor-apm-agent/lib/hijack/wrap_session.js");
require("/node_modules/meteor/mdg:meteor-apm-agent/lib/hijack/wrap_subscription.js");
require("/node_modules/meteor/mdg:meteor-apm-agent/lib/hijack/wrap_observers.js");
require("/node_modules/meteor/mdg:meteor-apm-agent/lib/hijack/wrap_ddp_stringify.js");
require("/node_modules/meteor/mdg:meteor-apm-agent/lib/hijack/instrument.js");
require("/node_modules/meteor/mdg:meteor-apm-agent/lib/hijack/db.js");
require("/node_modules/meteor/mdg:meteor-apm-agent/lib/hijack/http.js");
require("/node_modules/meteor/mdg:meteor-apm-agent/lib/hijack/email.js");
require("/node_modules/meteor/mdg:meteor-apm-agent/lib/hijack/async.js");
require("/node_modules/meteor/mdg:meteor-apm-agent/lib/hijack/error.js");
require("/node_modules/meteor/mdg:meteor-apm-agent/lib/hijack/set_labels.js");
require("/node_modules/meteor/mdg:meteor-apm-agent/lib/environment_variables.js");
require("/node_modules/meteor/mdg:meteor-apm-agent/lib/auto_connect.js");
require("/node_modules/meteor/mdg:meteor-apm-agent/lib/common/default_error_filters.js");
require("/node_modules/meteor/mdg:meteor-apm-agent/lib/common/send.js");

/* Exports */
Package._define("mdg:meteor-apm-agent", {
  Kadira: Kadira
});

})();

//# sourceURL=meteor://💻app/packages/mdg_meteor-apm-agent.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbWRnOm1ldGVvci1hcG0tYWdlbnQvbGliL2NvbW1vbi91bmlmeS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbWRnOm1ldGVvci1hcG0tYWdlbnQvbGliL2NvbW1vbi9kZWZhdWx0X2Vycm9yX2ZpbHRlcnMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21kZzptZXRlb3ItYXBtLWFnZW50L2xpYi9jb21tb24vc2VuZC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbWRnOm1ldGVvci1hcG0tYWdlbnQvbGliL21vZGVscy9iYXNlX2Vycm9yLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tZGc6bWV0ZW9yLWFwbS1hZ2VudC9saWIvbW9kZWxzLzBtb2RlbC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbWRnOm1ldGVvci1hcG0tYWdlbnQvbGliL21vZGVscy9tZXRob2RzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tZGc6bWV0ZW9yLWFwbS1hZ2VudC9saWIvbW9kZWxzL3B1YnN1Yi5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbWRnOm1ldGVvci1hcG0tYWdlbnQvbGliL21vZGVscy9zeXN0ZW0uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21kZzptZXRlb3ItYXBtLWFnZW50L2xpYi9tb2RlbHMvZXJyb3JzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tZGc6bWV0ZW9yLWFwbS1hZ2VudC9saWIvam9icy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbWRnOm1ldGVvci1hcG0tYWdlbnQvbGliL3JldHJ5LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tZGc6bWV0ZW9yLWFwbS1hZ2VudC9saWIvdXRpbHMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21kZzptZXRlb3ItYXBtLWFnZW50L2xpYi9udHAuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21kZzptZXRlb3ItYXBtLWFnZW50L2xpYi93YWl0X3RpbWVfYnVpbGRlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbWRnOm1ldGVvci1hcG0tYWdlbnQvbGliL2NoZWNrX2Zvcl9vcGxvZy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbWRnOm1ldGVvci1hcG0tYWdlbnQvbGliL3RyYWNlci90cmFjZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21kZzptZXRlb3ItYXBtLWFnZW50L2xpYi90cmFjZXIvZGVmYXVsdF9maWx0ZXJzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tZGc6bWV0ZW9yLWFwbS1hZ2VudC9saWIvdHJhY2VyL3RyYWNlcl9zdG9yZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbWRnOm1ldGVvci1hcG0tYWdlbnQvbGliL2RvY3NpemVfY2FjaGUuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21kZzptZXRlb3ItYXBtLWFnZW50L2xpYi9rYWRpcmEuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21kZzptZXRlb3ItYXBtLWFnZW50L2xpYi9oaWphY2svd3JhcF9zZXJ2ZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21kZzptZXRlb3ItYXBtLWFnZW50L2xpYi9oaWphY2svd3JhcF9zZXNzaW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tZGc6bWV0ZW9yLWFwbS1hZ2VudC9saWIvaGlqYWNrL3dyYXBfc3Vic2NyaXB0aW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tZGc6bWV0ZW9yLWFwbS1hZ2VudC9saWIvaGlqYWNrL3dyYXBfb2JzZXJ2ZXJzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tZGc6bWV0ZW9yLWFwbS1hZ2VudC9saWIvaGlqYWNrL3dyYXBfZGRwX3N0cmluZ2lmeS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbWRnOm1ldGVvci1hcG0tYWdlbnQvbGliL2hpamFjay9pbnN0cnVtZW50LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tZGc6bWV0ZW9yLWFwbS1hZ2VudC9saWIvaGlqYWNrL2RiLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tZGc6bWV0ZW9yLWFwbS1hZ2VudC9saWIvaGlqYWNrL2h0dHAuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21kZzptZXRlb3ItYXBtLWFnZW50L2xpYi9oaWphY2svZW1haWwuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21kZzptZXRlb3ItYXBtLWFnZW50L2xpYi9oaWphY2svYXN5bmMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21kZzptZXRlb3ItYXBtLWFnZW50L2xpYi9oaWphY2svZXJyb3IuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21kZzptZXRlb3ItYXBtLWFnZW50L2xpYi9oaWphY2svc2V0X2xhYmVscy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbWRnOm1ldGVvci1hcG0tYWdlbnQvbGliL2hpamFjay9tZXRlb3J4LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tZGc6bWV0ZW9yLWFwbS1hZ2VudC9saWIvZW52aXJvbm1lbnRfdmFyaWFibGVzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tZGc6bWV0ZW9yLWFwbS1hZ2VudC9saWIvYXV0b19jb25uZWN0LmpzIl0sIm5hbWVzIjpbIkthZGlyYSIsIm9wdGlvbnMiLCJNZXRlb3IiLCJ3cmFwQXN5bmMiLCJfd3JhcEFzeW5jIiwiaXNTZXJ2ZXIiLCJFdmVudEVtaXR0ZXIiLCJOcG0iLCJyZXF1aXJlIiwiZXZlbnRCdXMiLCJzZXRNYXhMaXN0ZW5lcnMiLCJidWlsZEFyZ3MiLCJhcmdzIiwiXyIsInRvQXJyYXkiLCJldmVudE5hbWUiLCJzbGljZSIsInVuc2hpZnQiLCJFdmVudEJ1cyIsImZvckVhY2giLCJtIiwiYXJndW1lbnRzIiwiYXBwbHkiLCJjb21tb25FcnJSZWdFeHBzIiwiZXJyb3JGaWx0ZXJzIiwiZmlsdGVyVmFsaWRhdGlvbkVycm9ycyIsInR5cGUiLCJtZXNzYWdlIiwiZXJyIiwiRXJyb3IiLCJmaWx0ZXJDb21tb25NZXRlb3JFcnJvcnMiLCJsYyIsImxlbmd0aCIsInJlZ0V4cCIsInRlc3QiLCJzZW5kIiwicGF5bG9hZCIsInBhdGgiLCJjYWxsYmFjayIsImNvbm5lY3RlZCIsInN1YnN0ciIsImVuZHBvaW50IiwicmV0cnlDb3VudCIsInJldHJ5IiwiUmV0cnkiLCJtaW5Db3VudCIsIm1pblRpbWVvdXQiLCJiYXNlVGltZW91dCIsIm1heFRpbWVvdXQiLCJzZW5kRnVuY3Rpb24iLCJfZ2V0U2VuZEZ1bmN0aW9uIiwidHJ5VG9TZW5kIiwicmV0cnlMYXRlciIsImNvbnNvbGUiLCJ3YXJuIiwiY29udGVudCIsInN0YXR1c0NvZGUiLCJfc2VydmVyU2VuZCIsIl9jbGllbnRTZW5kIiwiaHR0cFJlcXVlc3QiLCJoZWFkZXJzIiwiSlNPTiIsInN0cmluZ2lmeSIsIkZpYmVyIiwiaHR0cE9wdGlvbnMiLCJkYXRhIiwiYXV0aEhlYWRlcnMiLCJIVFRQIiwiY2FsbCIsInJlcyIsInJ1biIsIkJhc2VFcnJvck1vZGVsIiwiX2ZpbHRlcnMiLCJwcm90b3R5cGUiLCJhZGRGaWx0ZXIiLCJmaWx0ZXIiLCJwdXNoIiwicmVtb3ZlRmlsdGVyIiwiaW5kZXgiLCJpbmRleE9mIiwic3BsaWNlIiwiYXBwbHlGaWx0ZXJzIiwiZXJyb3IiLCJzdWJUeXBlIiwidmFsaWRhdGVkIiwiZXgiLCJLYWRpcmFNb2RlbCIsIl9nZXREYXRlSWQiLCJ0aW1lc3RhbXAiLCJyZW1haW5kZXIiLCJkYXRlSWQiLCJNRVRIT0RfTUVUUklDU19GSUVMRFMiLCJNZXRob2RzTW9kZWwiLCJtZXRyaWNzVGhyZXNob2xkIiwic2VsZiIsIm1ldGhvZE1ldHJpY3NCeU1pbnV0ZSIsIk9iamVjdCIsImNyZWF0ZSIsImVycm9yTWFwIiwiX21ldHJpY3NUaHJlc2hvbGQiLCJhc3NpZ24iLCJtYXhFdmVudFRpbWVzRm9yTWV0aG9kcyIsInRyYWNlclN0b3JlIiwiVHJhY2VyU3RvcmUiLCJpbnRlcnZhbCIsIm1heFRvdGFsUG9pbnRzIiwiYXJjaGl2ZUV2ZXJ5Iiwic3RhcnQiLCJfZ2V0TWV0cmljcyIsIm1ldGhvZCIsIm1ldGhvZHMiLCJjb3VudCIsImVycm9ycyIsImZldGNoZWREb2NTaXplIiwic2VudE1zZ1NpemUiLCJmaWVsZCIsInNldFN0YXJ0VGltZSIsIm1ldHJpY3NCeU1pbnV0ZSIsInN0YXJ0VGltZSIsInByb2Nlc3NNZXRob2QiLCJtZXRob2RUcmFjZSIsImF0IiwiX2FwcGVuZE1ldHJpY3MiLCJlcnJvcmVkIiwibmFtZSIsImFkZFRyYWNlIiwiaWQiLCJtZXRob2RNZXRyaWNzIiwidmFsdWUiLCJtZXRyaWNzIiwiZW5kVGltZSIsInRyYWNrRG9jU2l6ZSIsInNpemUiLCJOdHAiLCJfbm93IiwidHJhY2tNc2dTaXplIiwiYnVpbGRQYXlsb2FkIiwiYnVpbGREZXRhaWxlZEluZm8iLCJtZXRob2RSZXF1ZXN0cyIsImtleSIsInN5bmNlZERhdGUiLCJzeW5jVGltZSIsIm1ldGhvZE5hbWUiLCJjb2xsZWN0VHJhY2VzIiwiZWFjaCIsImdldCIsIm1vZHVsZSIsImxpbmsiLCJ2IiwibG9nZ2VyIiwiUHVic3ViTW9kZWwiLCJzdWJzY3JpcHRpb25zIiwiX3RyYWNrU3ViIiwic2Vzc2lvbiIsIm1zZyIsInBhcmFtcyIsInB1YmxpY2F0aW9uIiwiX2dldFB1YmxpY2F0aW9uTmFtZSIsInN1YnNjcmlwdGlvbklkIiwic3VicyIsIl9zdGFydFRpbWUiLCJfdHJhY2tVbnN1YiIsInN1YiIsIl9zdWJzY3JpcHRpb25JZCIsIl9uYW1lIiwic3Vic2NyaXB0aW9uU3RhdGUiLCJ1bnN1YnMiLCJsaWZlVGltZSIsIl90cmFja1JlYWR5IiwidHJhY2UiLCJyZWFkeVRyYWNrZWQiLCJyZXNUaW1lIiwiX3RyYWNrRXJyb3IiLCJwdWJzIiwiYWN0aXZlU3VicyIsImFjdGl2ZURvY3MiLCJ0b3RhbE9ic2VydmVycyIsImNhY2hlZE9ic2VydmVycyIsImNyZWF0ZWRPYnNlcnZlcnMiLCJkZWxldGVkT2JzZXJ2ZXJzIiwib2JzZXJ2ZXJMaWZldGltZSIsInBvbGxlZERvY3VtZW50cyIsIm9wbG9nVXBkYXRlZERvY3VtZW50cyIsIm9wbG9nSW5zZXJ0ZWREb2N1bWVudHMiLCJvcGxvZ0RlbGV0ZWREb2N1bWVudHMiLCJpbml0aWFsbHlBZGRlZERvY3VtZW50cyIsImxpdmVBZGRlZERvY3VtZW50cyIsImxpdmVDaGFuZ2VkRG9jdW1lbnRzIiwibGl2ZVJlbW92ZWREb2N1bWVudHMiLCJwb2xsZWREb2NTaXplIiwiaW5pdGlhbGx5RmV0Y2hlZERvY1NpemUiLCJsaXZlRmV0Y2hlZERvY1NpemUiLCJpbml0aWFsbHlTZW50TXNnU2l6ZSIsImxpdmVTZW50TXNnU2l6ZSIsIl9nZXRTdWJzY3JpcHRpb25JbmZvIiwidG90YWxEb2NzU2VudCIsInRvdGFsRGF0YVNlbnQiLCJzZXJ2ZXIiLCJzZXNzaW9ucyIsIl9uYW1lZFN1YnMiLCJjb3VudFN1YkRhdGEiLCJfdW5pdmVyc2FsU3VicyIsImF2Z09ic2VydmVyUmV1c2UiLCJjb3VudFN1YnNjcmlwdGlvbnMiLCJjb3VudERvY3VtZW50cyIsImNvdW50T2JzZXJ2ZXJzIiwiX2RvY3VtZW50cyIsImRvY3VtZW50IiwiX3RvdGFsT2JzZXJ2ZXJzIiwiX2NhY2hlZE9ic2VydmVycyIsImJ1aWxkRGV0YWlsSW5mbyIsInB1Yk1ldHJpY3MiLCJzdWJzY3JpcHRpb25EYXRhIiwiZGF0ZU1ldHJpY3MiLCJzaW5nbGVQdWJNZXRyaWNzIiwicHViUmVxdWVzdHMiLCJpbmNyZW1lbnRIYW5kbGVDb3VudCIsImlzQ2FjaGVkIiwicHVibGljYXRpb25OYW1lIiwidHJhY2tDcmVhdGVkT2JzZXJ2ZXIiLCJpbmZvIiwidHJhY2tEZWxldGVkT2JzZXJ2ZXIiLCJEYXRlIiwiZ2V0VGltZSIsInRyYWNrRG9jdW1lbnRDaGFuZ2VzIiwib3AiLCJ0cmFja1BvbGxlZERvY3VtZW50cyIsInRyYWNrTGl2ZVVwZGF0ZXMiLCJvcyIsInVzYWdlIiwiRXZlbnRMb29wTW9uaXRvciIsIlN5c3RlbU1vZGVsIiwibmV3U2Vzc2lvbnMiLCJzZXNzaW9uVGltZW91dCIsInVzYWdlTG9va3VwIiwic3RhdCIsImJpbmQiLCJldmxvb3BNb25pdG9yIiwibm93IiwibWVtb3J5IiwicHJvY2VzcyIsIm1lbW9yeVVzYWdlIiwicnNzIiwiZ2V0VXNhZ2UiLCJwY3B1IiwiY3B1IiwiY3B1SW5mbyIsImNwdXRpbWUiLCJjcHVUaW1lIiwicGNwdVVzZXIiLCJwY3B1U3lzdGVtIiwicGN0RXZsb29wQmxvY2siLCJzdGF0dXMiLCJwY3RCbG9jayIsInN5c3RlbU1ldHJpY3MiLCJwaWQiLCJkb2NTekNhY2hlIiwic2V0UGNwdSIsImhhbmRsZVNlc3Npb25BY3Rpdml0eSIsImNvdW50TmV3U2Vzc2lvbiIsImlzU2Vzc2lvbkFjdGl2ZSIsIl9hY3RpdmVBdCIsImlzTG9jYWxBZGRyZXNzIiwic29ja2V0IiwiaW5hY3RpdmVUaW1lIiwiaXNMb2NhbEhvc3RSZWdleCIsImlzTG9jYWxBZGRyZXNzUmVnZXgiLCJob3N0IiwiYWRkcmVzcyIsInJlbW90ZUFkZHJlc3MiLCJFcnJvck1vZGVsIiwiYXBwSWQiLCJtYXhFcnJvcnMiLCJ2YWx1ZXMiLCJtZXRyaWMiLCJlcnJvckNvdW50IiwidHJhY2tFcnJvciIsImVycm9yRGVmIiwiX2Zvcm1hdEVycm9yIiwidGltZSIsInN0YWNrIiwiZGV0YWlscyIsImVycm9yRXZlbnQiLCJldmVudHMiLCJlcnJvck9iamVjdCIsInN0YWNrcyIsIkpvYnMiLCJnZXRBc3luYyIsImNvcmVBcGkiLCJnZXRKb2IiLCJ0aGVuIiwiY2F0Y2giLCJzZXRBc3luYyIsImNoYW5nZXMiLCJ1cGRhdGVKb2IiLCJzZXQiLCJkZWZhdWx0cyIsImNsb25lIiwiZXhwb25lbnQiLCJmdXp6IiwicmV0cnlUaW1lciIsImNsZWFyIiwiY2xlYXJUaW1lb3V0IiwiX3RpbWVvdXQiLCJ0aW1lb3V0IiwiTWF0aCIsIm1pbiIsInBvdyIsIlJhbmRvbSIsImZyYWN0aW9uIiwiY2VpbCIsImZuIiwic2V0VGltZW91dCIsImV4cG9ydCIsImNvbGxlY3Rpb24iLCJNYXAiLCJTZXQiLCJIYXZlQXN5bmNDYWxsYmFjayIsImxhc3RBcmciLCJVbmlxdWVJZCIsIkRlZmF1bHRVbmlxdWVJZCIsIk9wdGltaXplZEFwcGx5IiwiY29udGV4dCIsImEiLCJnZXRMb2dnZXIiLCJzZXRFbmRwb2ludCIsImRpZmYiLCJzeW5jZWQiLCJyZVN5bmNDb3VudCIsInJlU3luYyIsInJvdW5kIiwibG9jYWxUaW1lIiwic3luYyIsImNhY2hlRG5zIiwiZ2V0U2VydmVyVGltZSIsImNhbGN1bGF0ZVRpbWVEaWZmIiwiY2xpZW50U3RhcnRUaW1lIiwic2VydmVyVGltZSIsIm5ldHdvcmtUaW1lIiwic2VydmVyU3RhcnRUaW1lIiwicGFyc2VJbnQiLCJjYW5Mb2dLYWRpcmEiLCJfbG9jYWxTdG9yYWdlIiwiZ2V0SXRlbSIsImxvZyIsIldBSVRPTl9NRVNTQUdFX0ZJRUxEUyIsIldhaXRUaW1lQnVpbGRlciIsIl93YWl0TGlzdFN0b3JlIiwiX2N1cnJlbnRQcm9jZXNzaW5nTWVzc2FnZXMiLCJfbWVzc2FnZUNhY2hlIiwicmVnaXN0ZXIiLCJtc2dJZCIsIm1haW5LZXkiLCJfZ2V0TWVzc2FnZUtleSIsImluUXVldWUiLCJ3YWl0TGlzdCIsIm1hcCIsIl9nZXRDYWNoZU1lc3NhZ2UiLCJjdXJyZW50bHlQcm9jZXNzaW5nTWVzc2FnZSIsImJ1aWxkIiwiZmlsdGVyZWRXYWl0TGlzdCIsIl9jbGVhbkNhY2hlTWVzc2FnZSIsInNlc3Npb25JZCIsImNhY2hlZE1lc3NhZ2UiLCJwaWNrIiwiX2tleSIsIl9yZWdpc3RlcmVkIiwidHJhY2tXYWl0VGltZSIsInVuYmxvY2siLCJzdGFydGVkIiwidW5ibG9ja2VkIiwid3JhcHBlZFVuYmxvY2siLCJ3YWl0VGltZSIsIk9wbG9nQ2hlY2siLCJfMDcwIiwiY3Vyc29yRGVzY3JpcHRpb24iLCJsaW1pdCIsImNvZGUiLCJyZWFzb24iLCJzb2x1dGlvbiIsImV4aXN0cyQiLCJhbnkiLCJzZWxlY3RvciIsIm9ubHlTY2FsZXJzIiwiYWxsIiwiQ29sbGVjdGlvbiIsIk9iamVjdElEIiwiXzA3MSIsIm1hdGNoZXIiLCJNaW5pbW9uZ28iLCJNYXRjaGVyIiwiZW52IiwiTU9OR09fT1BMT0dfVVJMIiwiZGlzYWJsZU9wbG9nIiwiX2Rpc2FibGVPcGxvZyIsIm1pbmlNb25nb01hdGNoZXIiLCJtaW5pTW9uZ29Tb3J0ZXIiLCJTb3J0ZXIiLCJzb3J0Iiwic29ydGVyIiwiZmllbGRzIiwiTG9jYWxDb2xsZWN0aW9uIiwiX2NoZWNrU3VwcG9ydGVkUHJvamVjdGlvbiIsImUiLCJza2lwIiwid2hlcmUiLCJoYXNXaGVyZSIsImdlbyIsImhhc0dlb1F1ZXJ5IiwibGltaXRCdXROb1NvcnQiLCJvbGRlclZlcnNpb24iLCJkcml2ZXIiLCJjb25zdHJ1Y3RvciIsImN1cnNvclN1cHBvcnRlZCIsImdpdENoZWNrb3V0IiwicmVsZWFzZSIsInByZVJ1bm5pbmdNYXRjaGVycyIsImdsb2JhbE1hdGNoZXJzIiwidmVyc2lvbk1hdGNoZXJzIiwiY2hlY2tXaHlOb09wbG9nIiwib2JzZXJ2ZXJEcml2ZXIiLCJyZXN1bHQiLCJydW5NYXRjaGVycyIsIm1ldGVvclZlcnNpb24iLCJtYXRjaGVySW5mbyIsIm1hdGNoZWQiLCJtYXRjaGVyTGlzdCIsIkZpYmVycyIsImV2ZW50TG9nZ2VyIiwiUkVQSVRJVElWRV9FVkVOVFMiLCJUcmFjZXIiLCJ0cmFjZUluZm8iLCJfaWQiLCJ1c2VySWQiLCJldmVudCIsImxhc3RFdmVudCIsImdldExhc3RFdmVudCIsImV2ZW50SWQiLCJfbGFzdEV2ZW50SWQiLCJfYXBwbHlGaWx0ZXJzIiwiZXZlbnRFbmQiLCJlbmRMYXN0RXZlbnQiLCJidWlsZFRyYWNlIiwiZmlyc3RFdmVudCIsInByb2Nlc3NlZEV2ZW50cyIsInRvdGFsIiwidG90YWxOb25Db21wdXRlIiwicHJldkV2ZW50RW5kIiwic3RhcnRFdmVudCIsImVuZEV2ZW50IiwiY29tcHV0ZVRpbWUiLCJlbGFwc2VkVGltZUZvckV2ZW50IiwiY3VycmVudEV2ZW50IiwibGFzdEV2ZW50RGF0YSIsImNvbXB1dGUiLCJpc0V2ZW50c1Byb2Nlc3NlZCIsImZpbHRlckZuIiwiZXZlbnRUeXBlIiwidHJhY2VyIiwic3RyaXBTZW5zaXRpdmUiLCJ0eXBlc1RvU3RyaXAiLCJyZWNlaXZlclR5cGUiLCJzdHJpcHBlZFR5cGVzIiwidXJsIiwiaXRlbSIsInN0cmlwU2VsZWN0b3JzIiwiY29sbGVjdGlvbkxpc3QiLCJjb2xsTWFwIiwiY29sbE5hbWUiLCJjb2xsIiwibWF4VG90YWxzIiwiY3VycmVudE1heFRyYWNlIiwidHJhY2VBcmNoaXZlIiwicHJvY2Vzc2VkQ250Iiwia2luZCIsImpvaW4iLCJFSlNPTiIsIl9oYW5kbGVFcnJvcnMiLCJ0cmFjZXMiLCJfdGltZW91dEhhbmRsZXIiLCJzZXRJbnRlcnZhbCIsInByb2Nlc3NUcmFjZXMiLCJzdG9wIiwiY2xlYXJJbnRlcnZhbCIsImVycm9yS2V5IiwiZXJyb3JlZFRyYWNlIiwia2luZHMiLCJ1bmlvbiIsImtleXMiLCJjdXJyZW50TWF4VG90YWwiLCJleGNlZWRpbmdQb2ludHMiLCJhcmNoaXZlRGVmYXVsdCIsImNhbkFyY2hpdmUiLCJfaXNUcmFjZU91dGxpZXIiLCJkYXRhU2V0IiwiX2lzT3V0bGllciIsImRhdGFQb2ludCIsIm1heE1hZFoiLCJtZWRpYW4iLCJfZ2V0TWVkaWFuIiwibWFkIiwiX2NhbGN1bGF0ZU1hZCIsIm1hZFoiLCJfZnVuY01lZGlhbkRldmlhdGlvbiIsInNvcnRlZERhdGFTZXQiLCJiIiwiX3BpY2tRdWFydGlsZSIsIm51bSIsInBvcyIsIm1lZGlhbkRldmlhdGlvbnMiLCJ4IiwiYWJzIiwiX2dldE1lYW4iLCJkYXRhUG9pbnRzIiwicG9pbnQiLCJMUlUiLCJjcnlwdG8iLCJqc29uU3RyaW5naWZ5IiwiRG9jU3pDYWNoZSIsIm1heEl0ZW1zIiwibWF4VmFsdWVzIiwiaXRlbXMiLCJtYXgiLCJjcHVVc2FnZSIsImdldFNpemUiLCJxdWVyeSIsIm9wdHMiLCJnZXRLZXkiLCJEb2NTekNhY2hlSXRlbSIsIm5lZWRzVXBkYXRlIiwiZG9jIiwiZWxlbWVudCIsIkJ1ZmZlciIsImJ5dGVMZW5ndGgiLCJhZGREYXRhIiwiZ2V0VmFsdWUiLCJnZXRJdGVtU2NvcmUiLCJ1cGRhdGVkIiwic2NvcmUiLCJyZWR1Y2UiLCJjdXJyZW50VGltZSIsInRpbWVTaW5jZVVwZGF0ZSIsInNoaWZ0Iiwic29ydE51bWJlciIsInNvcnRlZCIsImlkeCIsImZsb29yIiwiaG9zdG5hbWUiLCJLYWRpcmFDb3JlIiwibW9kZWxzIiwiY3VycmVudFN1YiIsImthZGlyYUluZm8iLCJFbnZpcm9ubWVudFZhcmlhYmxlIiwid2FpdFRpbWVCdWlsZGVyIiwicHVic3ViIiwic3lzdGVtIiwiY29ubmVjdCIsImFwcFNlY3JldCIsInBheWxvYWRUaW1lb3V0IiwiY2xpZW50RW5naW5lU3luY0RlbGF5IiwidGhyZXNob2xkcyIsImlzSG9zdE5hbWVTZXQiLCJwcm94eSIsImRvY3VtZW50U2l6ZUNhY2hlU2l6ZSIsImxhc3QiLCJlbmFibGVFcnJvclRyYWNraW5nIiwidW5kZWZpbmVkIiwiYWRkRmlsdGVyRm4iLCJfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fIiwia2FkaXJhIiwiZGlzYWJsZUVycm9yVHJhY2tpbmciLCJ0cmltIiwiX2NoZWNrQXV0aCIsIl9zZW5kQXBwU3RhdHMiLCJfc2NoZWR1bGVQYXlsb2FkU2VuZCIsInN0YXJ0dXAiLCJUcmFja1VuY2F1Z2h0RXhjZXB0aW9ucyIsIlRyYWNrTWV0ZW9yRGVidWciLCJwdWJsaXNoIiwiYWRkZWQiLCJyZWFkeSIsIl9idWlsZFBheWxvYWQiLCJfaXNEZXRhaWxlZEluZm8iLCJfY291bnREYXRhU2VudCIsIl9kZXRhaWxJbmZvU2VudEludGVydmFsIiwiYXBwU3RhdHMiLCJwcm90b2NvbFZlcnNpb24iLCJwYWNrYWdlVmVyc2lvbnMiLCJhcHBWZXJzaW9ucyIsIndlYmFwcCIsInJlZnJlc2hhYmxlIiwiY29yZG92YSIsIlBhY2thZ2UiLCJ2ZXJzaW9uIiwic2VuZERhdGEiLCJfc2VuZFBheWxvYWQiLCJfZ2V0SW5mbyIsImN1cnJlbnRGaWJlciIsInVzZUVudmlyb25tZW50VmFyaWFibGUiLCJjdXJyZW50IiwiX19rYWRpcmFJbmZvIiwiX3NldEluZm8iLCJpZ25vcmVFcnJvclRyYWNraW5nIiwiX3NraXBLYWRpcmEiLCJ3cmFwU2VydmVyIiwic2VydmVyUHJvdG8iLCJvcmlnaW5hbEhhbmRsZUNvbm5lY3QiLCJfaGFuZGxlQ29ubmVjdCIsIl9tZXRlb3JTZXNzaW9uIiwiZW1pdCIsIndyYXBTZXNzaW9uIiwic2Vzc2lvblByb3RvIiwib3JpZ2luYWxQcm9jZXNzTWVzc2FnZSIsInByb2Nlc3NNZXNzYWdlIiwic3RhcnREYXRhIiwid2FpdEV2ZW50SWQiLCJfd2FpdEV2ZW50SWQiLCJvcmlnaW5hbE1ldGhvZEhhbmRsZXIiLCJwcm90b2NvbF9oYW5kbGVycyIsIndhaXRPbiIsInJlc3BvbnNlIiwid2l0aFZhbHVlIiwib3JnaW5hbFN1YkhhbmRsZXIiLCJvcmdpbmFsVW5TdWJIYW5kbGVyIiwidW5zdWIiLCJvcmlnaW5hbFNlbmQiLCJjdXJyZW50RXJyb3IiLCJtZXRob2RfaGFuZGxlcnMiLCJoYW5kbGVyIiwid3JhcE1ldGhvZEhhbmRlckZvckVycm9ycyIsIm9yaWdpbmFsTWV0ZW9yTWV0aG9kcyIsIm1ldGhvZE1hcCIsIm9yaWdpbmFsSGFuZGxlciIsInNvdXJjZSIsIndyYXBTdWJzY3JpcHRpb24iLCJzdWJzY3JpcHRpb25Qcm90byIsIm9yaWdpbmFsUnVuSGFuZGxlciIsIl9ydW5IYW5kbGVyIiwib3JpZ2luYWxSZWFkeSIsIl9hcG1SZWFkeVRyYWNrZWQiLCJfc2Vzc2lvbiIsIm9yaWdpbmFsRXJyb3IiLCJlcnJvckZvckFwbSIsIm9yaWdpbmFsRGVhY3RpdmF0ZSIsIl9kZWFjdGl2YXRlIiwiZnVuY05hbWUiLCJvcmlnaW5hbEZ1bmMiLCJjb2xsZWN0aW9uTmFtZSIsIk1vbmdvQ29ubmVjdGlvbiIsIndyYXBPcGxvZ09ic2VydmVEcml2ZXIiLCJwcm90byIsIm9yaWdpbmFsUHVibGlzaE5ld1Jlc3VsdHMiLCJfcHVibGlzaE5ld1Jlc3VsdHMiLCJuZXdSZXN1bHRzIiwibmV3QnVmZmVyIiwiX2N1cnNvckRlc2NyaXB0aW9uIiwiZG9jU2l6ZSIsIl9vd25lckluZm8iLCJfcG9sbGVkRG9jdW1lbnRzIiwiX2RvY1NpemUiLCJwb2xsZWRGZXRjaGVzIiwib3JpZ2luYWxIYW5kbGVPcGxvZ0VudHJ5UXVlcnlpbmciLCJfaGFuZGxlT3Bsb2dFbnRyeVF1ZXJ5aW5nIiwib3JpZ2luYWxIYW5kbGVPcGxvZ0VudHJ5U3RlYWR5T3JGZXRjaGluZyIsIl9oYW5kbGVPcGxvZ0VudHJ5U3RlYWR5T3JGZXRjaGluZyIsImZuTmFtZSIsIm9yaWdpbmFsRm4iLCJjIiwiX2xpdmVVcGRhdGVzQ291bnRzIiwiX2luaXRpYWxBZGRzIiwiaW5pdGlhbEZldGNoZXMiLCJvcmlnaW5hbFN0b3AiLCJ3cmFwUG9sbGluZ09ic2VydmVEcml2ZXIiLCJvcmlnaW5hbFBvbGxNb25nbyIsIl9wb2xsTW9uZ28iLCJfcmVzdWx0cyIsIl9tYXAiLCJfcG9sbGVkRG9jU2l6ZSIsIndyYXBNdWx0aXBsZXhlciIsIm9yaWdpbmFsSW5pdGFsQWRkIiwiYWRkSGFuZGxlQW5kU2VuZEluaXRpYWxBZGRzIiwiaGFuZGxlIiwiX2ZpcnN0SW5pdGlhbEFkZFRpbWUiLCJfd2FzTXVsdGlwbGV4ZXJSZWFkeSIsIl9yZWFkeSIsIl9xdWV1ZUxlbmd0aCIsIl9xdWV1ZSIsIl90YXNrSGFuZGxlcyIsIl9lbGFwc2VkUG9sbGluZ1RpbWUiLCJ3cmFwRm9yQ291bnRpbmdPYnNlcnZlcnMiLCJtb25nb0Nvbm5lY3Rpb25Qcm90byIsIm9yaWdpbmFsT2JzZXJ2ZUNoYW5nZXMiLCJfb2JzZXJ2ZUNoYW5nZXMiLCJvcmRlcmVkIiwiY2FsbGJhY2tzIiwicmV0IiwiX211bHRpcGxleGVyIiwiX19rYWRpcmFUcmFja2VkIiwib3duZXJJbmZvIiwiX29ic2VydmVEcml2ZXIiLCJ3cmFwU3RyaW5naWZ5RERQIiwib3JpZ2luYWxTdHJpbmdpZnlERFAiLCJERFBDb21tb24iLCJzdHJpbmdpZnlERFAiLCJtc2dTdHJpbmciLCJtc2dTaXplIiwiTW9uZ29PcGxvZ0RyaXZlciIsIk1vbmdvUG9sbGluZ0RyaXZlciIsIk11bHRpcGxleGVyIiwiU2VydmVyIiwiU2Vzc2lvbiIsIlN1YnNjcmlwdGlvbiIsImluc3RydW1lbnRlZCIsIl9zdGFydEluc3RydW1lbnRpbmciLCJQcm9taXNlIiwiYXN5bmNBcHBseSIsImhpamFja0RCT3BzIiwic2V0TGFiZWxzIiwiTW9uZ29DdXJzb3IiLCJvcmlnaW5hbE9wZW4iLCJNb25nb0ludGVybmFscyIsIlJlbW90ZUNvbGxlY3Rpb25Ecml2ZXIiLCJvcGVuIiwibW9uZ28iLCJBcnJheSIsImZ1bmMiLCJtb2QiLCJ1cHNlcnQiLCJlbmRPcHRpb25zIiwiYXN5bmMiLCJ1cGRhdGVkRG9jcyIsIm51bWJlckFmZmVjdGVkIiwiaW5zZXJ0ZWRJZCIsInJlbW92ZWREb2NzIiwiY3Vyc29yUHJvdG8iLCJjdXJzb3IiLCJjdXJzb3JPcHRpb25zIiwiZW5kRGF0YSIsIm9wbG9nIiwid2FzTXVsdGlwbGV4ZXJSZWFkeSIsInF1ZXVlTGVuZ3RoIiwiZWxhcHNlZFBvbGxpbmdUaW1lIiwib2JzZXJ2ZXJEcml2ZXJDbGFzcyIsInVzZXNPcGxvZyIsIl9jYWNoZSIsImRvY3MiLCJub09mQ2FjaGVkRG9jcyIsImluaXRpYWxQb2xsaW5nVGltZSIsIl9sYXN0UG9sbFRpbWUiLCJyZWFzb25JbmZvIiwibm9PcGxvZ0NvZGUiLCJub09wbG9nUmVhc29uIiwibm9PcGxvZ1NvbHV0aW9uIiwiZG9jc0ZldGNoZWQiLCJvcmlnaW5hbENhbGwiLCJFbWFpbCIsIm9yaWdpbmFsWWllbGQiLCJ5aWVsZCIsIl9hcG1FdmVudElkIiwib3JpZ2luYWxSdW4iLCJ2YWwiLCJvbiIsInByaW50RXJyb3JBbmRLaWxsIiwiX3RyYWNrZWQiLCJnZXRUcmFjZSIsInRpbWVyIiwidGhyb3dFcnJvciIsIm5leHRUaWNrIiwiZXhpdCIsIm9yaWdpbmFsTWV0ZW9yRGVidWciLCJfZGVidWciLCJrYWRpcmFfU2Vzc2lvbl9zZW5kIiwib3JpZ2luYWxTZW5kQWRkcyIsIl9zZW5kQWRkcyIsImthZGlyYV9NdWx0aXBsZXhlcl9zZW5kQWRkcyIsIm9yaWdpbmFsTW9uZ29JbnNlcnQiLCJfaW5zZXJ0Iiwia2FkaXJhX01vbmdvQ29ubmVjdGlvbl9pbnNlcnQiLCJjYiIsIm9yaWdpbmFsTW9uZ29VcGRhdGUiLCJfdXBkYXRlIiwia2FkaXJhX01vbmdvQ29ubmVjdGlvbl91cGRhdGUiLCJvcmlnaW5hbE1vbmdvUmVtb3ZlIiwiX3JlbW92ZSIsImthZGlyYV9Nb25nb0Nvbm5lY3Rpb25fcmVtb3ZlIiwib3JpZ2luYWxQdWJzdWJBZGRlZCIsInNlbmRBZGRlZCIsImthZGlyYV9TZXNzaW9uX3NlbmRBZGRlZCIsIm9yaWdpbmFsUHVic3ViQ2hhbmdlZCIsInNlbmRDaGFuZ2VkIiwia2FkaXJhX1Nlc3Npb25fc2VuZENoYW5nZWQiLCJvcmlnaW5hbFB1YnN1YlJlbW92ZWQiLCJzZW5kUmVtb3ZlZCIsImthZGlyYV9TZXNzaW9uX3NlbmRSZW1vdmVkIiwib3JpZ2luYWxDdXJzb3JGb3JFYWNoIiwia2FkaXJhX0N1cnNvcl9mb3JFYWNoIiwib3JpZ2luYWxDdXJzb3JNYXAiLCJrYWRpcmFfQ3Vyc29yX21hcCIsIm9yaWdpbmFsQ3Vyc29yRmV0Y2giLCJmZXRjaCIsImthZGlyYV9DdXJzb3JfZmV0Y2giLCJvcmlnaW5hbEN1cnNvckNvdW50Iiwia2FkaXJhX0N1cnNvcl9jb3VudCIsIm9yaWdpbmFsQ3Vyc29yT2JzZXJ2ZUNoYW5nZXMiLCJvYnNlcnZlQ2hhbmdlcyIsImthZGlyYV9DdXJzb3Jfb2JzZXJ2ZUNoYW5nZXMiLCJvcmlnaW5hbEN1cnNvck9ic2VydmUiLCJvYnNlcnZlIiwia2FkaXJhX0N1cnNvcl9vYnNlcnZlIiwib3JpZ2luYWxDdXJzb3JSZXdpbmQiLCJyZXdpbmQiLCJrYWRpcmFfQ3Vyc29yX3Jld2luZCIsIm9yaWdpbmFsQ3Jvc3NiYXJMaXN0ZW4iLCJERFBTZXJ2ZXIiLCJfQ3Jvc3NiYXIiLCJsaXN0ZW4iLCJrYWRpcmFfQ3Jvc3NiYXJfbGlzdGVuIiwidHJpZ2dlciIsIm9yaWdpbmFsQ3Jvc3NiYXJGaXJlIiwiZmlyZSIsImthZGlyYV9Dcm9zc2Jhcl9maXJlIiwibm90aWZpY2F0aW9uIiwiZ2V0U2Vzc2lvbiIsImZha2VTb2NrZXQiLCJjbG9zZSIsInN1cHBvcnQiLCJfcmVtb3ZlU2Vzc2lvbiIsIk1vbmdvIiwiZmluZE9uZSIsImZpbmQiLCJnZXRNdWx0aXBsZXhlciIsIm1vbmdvRHJpdmVyIiwiZGVmYXVsdFJlbW90ZUNvbGxlY3Rpb25Ecml2ZXIiLCJhd2FpdCIsImdldFN1YnNjcmlwdGlvbiIsInN1YklkIiwiX3N0YXJ0U3Vic2NyaXB0aW9uIiwic3Vic2NyaXB0aW9uIiwiX3N0b3BTdWJzY3JpcHRpb24iLCJnZXRPYnNlcnZlckRyaXZlciIsIm11bHRpcGxleGVyIiwiZ2V0TW9uZ29PcGxvZ0RyaXZlciIsImdldE1vbmdvUG9sbGluZ0RyaXZlciIsIl9wYXJzZUVudiIsIl9vcHRpb25zIiwicGFyc2VyIiwic3RyIiwicGFyc2VCb29sIiwidG9Mb3dlckNhc2UiLCJwYXJzZVVybCIsInBhcnNlU3RyaW5nIiwiQVBNX09QVElPTlNfQ0xJRU5UX0VOR0lORV9TWU5DX0RFTEFZIiwiQVBNX09QVElPTlNfRVJST1JfRFVNUF9JTlRFUlZBTCIsIkFQTV9PUFRJT05TX01BWF9FUlJPUlNfUEVSX0lOVEVSVkFMIiwiQVBNX09QVElPTlNfQ09MTEVDVF9BTExfU1RBQ0tTIiwiQVBNX09QVElPTlNfRU5BQkxFX0VSUk9SX1RSQUNLSU5HIiwiQVBNX09QVElPTlNfRU5EUE9JTlQiLCJBUE1fT1BUSU9OU19IT1NUTkFNRSIsIkFQTV9PUFRJT05TX1BBWUxPQURfVElNRU9VVCIsIkFQTV9PUFRJT05TX1BST1hZIiwiQVBNX09QVElPTlNfRE9DVU1FTlRfU0laRV9DQUNIRV9TSVpFIiwiX2Nvbm5lY3RXaXRoRW52Iiwic2V0dGluZ3MiLCJwYWNrYWdlcyIsImlzRGlzYWJsZWQiLCJBUE1fQVBQX0lEIiwiQVBNX0FQUF9TRUNSRVQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUFBLE1BQU0sR0FBRyxDQUFDLENBQUM7QUFDWEEsTUFBTSxDQUFDQyxPQUFPLEdBQUcsQ0FBQyxDQUFDO0FBRW5CLElBQUdDLE1BQU0sQ0FBQ0MsU0FBUyxFQUFFO0VBQ25CSCxNQUFNLENBQUNJLFVBQVUsR0FBR0YsTUFBTSxDQUFDQyxTQUFTO0FBQ3RDLENBQUMsTUFBTTtFQUNMSCxNQUFNLENBQUNJLFVBQVUsR0FBR0YsTUFBTSxDQUFDRSxVQUFVO0FBQ3ZDO0FBRUEsSUFBR0YsTUFBTSxDQUFDRyxRQUFRLEVBQUU7RUFDbEIsSUFBSUMsWUFBWSxHQUFHQyxHQUFHLENBQUNDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQ0YsWUFBWTtFQUNyRCxJQUFJRyxRQUFRLEdBQUcsSUFBSUgsWUFBWSxDQUFDLENBQUM7RUFDakNHLFFBQVEsQ0FBQ0MsZUFBZSxDQUFDLENBQUMsQ0FBQztFQUUzQixJQUFJQyxTQUFTLEdBQUcsU0FBQUEsQ0FBU0MsSUFBSSxFQUFFO0lBQzdCQSxJQUFJLEdBQUdDLENBQUMsQ0FBQ0MsT0FBTyxDQUFDRixJQUFJLENBQUM7SUFDdEIsSUFBSUcsU0FBUyxHQUFHSCxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxHQUFHQSxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3ZDLElBQUlBLElBQUksR0FBR0EsSUFBSSxDQUFDSSxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQ3hCSixJQUFJLENBQUNLLE9BQU8sQ0FBQ0YsU0FBUyxDQUFDO0lBQ3ZCLE9BQU9ILElBQUk7RUFDYixDQUFDO0VBRURaLE1BQU0sQ0FBQ2tCLFFBQVEsR0FBRyxDQUFDLENBQUM7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QUNaNVQsT0FBTyxDQUFDdUosR0FBRyxDQUFDMGQsVUFBVSxFQUN0QmpuQixPQUFPLENBQUN1SixHQUFHLENBQUMyZCxjQUFjLEVBQzFCajJCLE9BQ0YsQ0FBQztJQUVERCxNQUFNLENBQUM0aUIsT0FBTyxHQUFHLFlBQVc7TUFDMUIsTUFBTSxJQUFJL2dCLEtBQUssQ0FBQywrRUFBK0UsQ0FBQztJQUNsRyxDQUFDO0VBQ0g7RUFFQSxJQUFJaTBCLFFBQVEsSUFBSUEsUUFBUSxDQUFDRyxVQUFVLElBQUlILFFBQVEsQ0FBQ0ksY0FBYyxFQUFFO0lBQzlELE1BQU1qMkIsT0FBTyxHQUFHRCxNQUFNLENBQUMyMEIsU0FBUyxDQUFDbUIsUUFBUSxDQUFDO0lBRTFDOTFCLE1BQU0sQ0FBQzRpQixPQUFPLENBQ1prVCxRQUFRLENBQUNHLFVBQVUsRUFDbkJILFFBQVEsQ0FBQ0ksY0FBYyxFQUN2QmoyQixPQUNGLENBQUM7SUFFREQsTUFBTSxDQUFDNGlCLE9BQU8sR0FBRyxZQUFXO01BQzFCLE1BQU0sSUFBSS9nQixLQUFLLENBQUMsNkVBQTZFLENBQUM7SUFDaEcsQ0FBQztFQUNIO0VBQ0E7QUFDRixDQUFDOztBQUVEO0FBQ0E3QixNQUFNLENBQUM2MUIsZUFBZSxDQUFDLENBQUMsQyIsImZpbGUiOiIvcGFja2FnZXMvbWRnX21ldGVvci1hcG0tYWdlbnQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJLYWRpcmEgPSB7fTtcbkthZGlyYS5vcHRpb25zID0ge307XG5cbmlmKE1ldGVvci53cmFwQXN5bmMpIHtcbiAgS2FkaXJhLl93cmFwQXN5bmMgPSBNZXRlb3Iud3JhcEFzeW5jO1xufSBlbHNlIHtcbiAgS2FkaXJhLl93cmFwQXN5bmMgPSBNZXRlb3IuX3dyYXBBc3luYztcbn1cblxuaWYoTWV0ZW9yLmlzU2VydmVyKSB7XG4gIHZhciBFdmVudEVtaXR0ZXIgPSBOcG0ucmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyO1xuICB2YXIgZXZlbnRCdXMgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG4gIGV2ZW50QnVzLnNldE1heExpc3RlbmVycygwKTtcblxuICB2YXIgYnVpbGRBcmdzID0gZnVuY3Rpb24oYXJncykge1xuICAgIGFyZ3MgPSBfLnRvQXJyYXkoYXJncyk7XG4gICAgdmFyIGV2ZW50TmFtZSA9IGFyZ3NbMF0gKyAnLScgKyBhcmdzWzFdO1xuICAgIHZhciBhcmdzID0gYXJncy5zbGljZSgyKTtcbiAgICBhcmdzLnVuc2hpZnQoZXZlbnROYW1lKTtcbiAgICByZXR1cm4gYXJncztcbiAgfTtcbiAgXG4gIEthZGlyYS5FdmVudEJ1cyA9IHt9O1xuICBbJ29uJywgJ2VtaXQnLCAncmVtb3ZlTGlzdGVuZXInLCAncmVtb3ZlQWxsTGlzdGVuZXJzJ10uZm9yRWFjaChmdW5jdGlvbihtKSB7XG4gICAgS2FkaXJhLkV2ZW50QnVzW21dID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgYXJncyA9IGJ1aWxkQXJncyhhcmd1bWVudHMpO1xuICAgICAgcmV0dXJuIGV2ZW50QnVzW21dLmFwcGx5KGV2ZW50QnVzLCBhcmdzKTtcbiAgICB9O1xuICB9KTtcbn0iLCJ2YXIgY29tbW9uRXJyUmVnRXhwcyA9IFtcbiAgL2Nvbm5lY3Rpb24gdGltZW91dFxcLiBubyAoXFx3KikgaGVhcnRiZWF0IHJlY2VpdmVkL2ksXG4gIC9JTlZBTElEX1NUQVRFX0VSUi9pLFxuXTtcblxuS2FkaXJhLmVycm9yRmlsdGVycyA9IHtcbiAgZmlsdGVyVmFsaWRhdGlvbkVycm9yczogZnVuY3Rpb24odHlwZSwgbWVzc2FnZSwgZXJyKSB7XG4gICAgaWYoZXJyICYmIGVyciBpbnN0YW5jZW9mIE1ldGVvci5FcnJvcikge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH0sXG5cbiAgZmlsdGVyQ29tbW9uTWV0ZW9yRXJyb3JzOiBmdW5jdGlvbih0eXBlLCBtZXNzYWdlKSB7XG4gICAgZm9yKHZhciBsYz0wOyBsYzxjb21tb25FcnJSZWdFeHBzLmxlbmd0aDsgbGMrKykge1xuICAgICAgdmFyIHJlZ0V4cCA9IGNvbW1vbkVyclJlZ0V4cHNbbGNdO1xuICAgICAgaWYocmVnRXhwLnRlc3QobWVzc2FnZSkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxufTsiLCJLYWRpcmEuc2VuZCA9IGZ1bmN0aW9uIChwYXlsb2FkLCBwYXRoLCBjYWxsYmFjaykge1xuICBpZighS2FkaXJhLmNvbm5lY3RlZCkgIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJZb3UgbmVlZCB0byBjb25uZWN0IHdpdGggS2FkaXJhIGZpcnN0LCBiZWZvcmUgc2VuZGluZyBtZXNzYWdlcyFcIik7XG4gIH1cblxuICBwYXRoID0gKHBhdGguc3Vic3RyKDAsIDEpICE9ICcvJyk/IFwiL1wiICsgcGF0aCA6IHBhdGg7XG4gIHZhciBlbmRwb2ludCA9IEthZGlyYS5vcHRpb25zLmVuZHBvaW50ICsgcGF0aDtcbiAgdmFyIHJldHJ5Q291bnQgPSAwO1xuICB2YXIgcmV0cnkgPSBuZXcgUmV0cnkoe1xuICAgIG1pbkNvdW50OiAxLFxuICAgIG1pblRpbWVvdXQ6IDAsXG4gICAgYmFzZVRpbWVvdXQ6IDEwMDAqNSxcbiAgICBtYXhUaW1lb3V0OiAxMDAwKjYwLFxuICB9KTtcblxuICB2YXIgc2VuZEZ1bmN0aW9uID0gS2FkaXJhLl9nZXRTZW5kRnVuY3Rpb24oKTtcbiAgdHJ5VG9TZW5kKCk7XG5cbiAgZnVuY3Rpb24gdHJ5VG9TZW5kKGVycikge1xuICAgIGlmKHJldHJ5Q291bnQgPCA1KSB7XG4gICAgICByZXRyeS5yZXRyeUxhdGVyKHJldHJ5Q291bnQrKywgc2VuZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUud2FybignRXJyb3Igc2VuZGluZyBlcnJvciB0cmFjZXMgdG8gS2FkaXJhIHNlcnZlcicpO1xuICAgICAgaWYoY2FsbGJhY2spIGNhbGxiYWNrKGVycik7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gc2VuZCgpIHtcbiAgICBzZW5kRnVuY3Rpb24oZW5kcG9pbnQsIHBheWxvYWQsIGZ1bmN0aW9uKGVyciwgY29udGVudCwgc3RhdHVzQ29kZSkge1xuICAgICAgaWYoZXJyKSB7XG4gICAgICAgIHRyeVRvU2VuZChlcnIpO1xuICAgICAgfSBlbHNlIGlmKHN0YXR1c0NvZGUgPT0gMjAwKXtcbiAgICAgICAgaWYoY2FsbGJhY2spIGNhbGxiYWNrKG51bGwsIGNvbnRlbnQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYoY2FsbGJhY2spIGNhbGxiYWNrKG5ldyBNZXRlb3IuRXJyb3Ioc3RhdHVzQ29kZSwgY29udGVudCkpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59O1xuXG5LYWRpcmEuX2dldFNlbmRGdW5jdGlvbiA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gKE1ldGVvci5pc1NlcnZlcik/IEthZGlyYS5fc2VydmVyU2VuZCA6IEthZGlyYS5fY2xpZW50U2VuZDtcbn07XG5cbkthZGlyYS5fY2xpZW50U2VuZCA9IGZ1bmN0aW9uIChlbmRwb2ludCwgcGF5bG9hZCwgY2FsbGJhY2spIHtcbiAgaHR0cFJlcXVlc3QoJ1BPU1QnLCBlbmRwb2ludCwge1xuICAgIGhlYWRlcnM6IHtcbiAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbidcbiAgICB9LFxuICAgIGNvbnRlbnQ6IEpTT04uc3RyaW5naWZ5KHBheWxvYWQpXG4gIH0sIGNhbGxiYWNrKTtcbn1cblxuS2FkaXJhLl9zZXJ2ZXJTZW5kID0gZnVuY3Rpb24gKGVuZHBvaW50LCBwYXlsb2FkLCBjYWxsYmFjaykge1xuICBjYWxsYmFjayA9IGNhbGxiYWNrIHx8IGZ1bmN0aW9uKCkge307XG4gIHZhciBGaWJlciA9IE5wbS5yZXF1aXJlKCdmaWJlcnMnKTtcbiAgbmV3IEZpYmVyKGZ1bmN0aW9uKCkge1xuICAgIHZhciBodHRwT3B0aW9ucyA9IHtcbiAgICAgIGRhdGE6IHBheWxvYWQsXG4gICAgICBoZWFkZXJzOiBLYWRpcmEub3B0aW9ucy5hdXRoSGVhZGVyc1xuICAgIH07XG5cbiAgICBIVFRQLmNhbGwoJ1BPU1QnLCBlbmRwb2ludCwgaHR0cE9wdGlvbnMsIGZ1bmN0aW9uKGVyciwgcmVzKSB7XG4gICAgICBpZihyZXMpIHtcbiAgICAgICAgdmFyIGNvbnRlbnQgPSAocmVzLnN0YXR1c0NvZGUgPT0gMjAwKT8gcmVzLmRhdGEgOiByZXMuY29udGVudDtcbiAgICAgICAgY2FsbGJhY2sobnVsbCwgY29udGVudCwgcmVzLnN0YXR1c0NvZGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSkucnVuKCk7XG59XG4iLCJCYXNlRXJyb3JNb2RlbCA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgdGhpcy5fZmlsdGVycyA9IFtdO1xufTtcblxuQmFzZUVycm9yTW9kZWwucHJvdG90eXBlLmFkZEZpbHRlciA9IGZ1bmN0aW9uKGZpbHRlcikge1xuICBpZih0eXBlb2YgZmlsdGVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgdGhpcy5fZmlsdGVycy5wdXNoKGZpbHRlcik7XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiRXJyb3IgZmlsdGVyIG11c3QgYmUgYSBmdW5jdGlvblwiKTtcbiAgfVxufTtcblxuQmFzZUVycm9yTW9kZWwucHJvdG90eXBlLnJlbW92ZUZpbHRlciA9IGZ1bmN0aW9uKGZpbHRlcikge1xuICB2YXIgaW5kZXggPSB0aGlzLl9maWx0ZXJzLmluZGV4T2YoZmlsdGVyKTtcbiAgaWYoaW5kZXggPj0gMCkge1xuICAgIHRoaXMuX2ZpbHRlcnMuc3BsaWNlKGluZGV4LCAxKTtcbiAgfVxufTtcblxuQmFzZUVycm9yTW9kZWwucHJvdG90eXBlLmFwcGx5RmlsdGVycyA9IGZ1bmN0aW9uKHR5cGUsIG1lc3NhZ2UsIGVycm9yLCBzdWJUeXBlKSB7XG4gIGZvcih2YXIgbGM9MDsgbGM8dGhpcy5fZmlsdGVycy5sZW5ndGg7IGxjKyspIHtcbiAgICB2YXIgZmlsdGVyID0gdGhpcy5fZmlsdGVyc1tsY107XG4gICAgdHJ5IHtcbiAgICAgIHZhciB2YWxpZGF0ZWQgPSBmaWx0ZXIodHlwZSwgbWVzc2FnZSwgZXJyb3IsIHN1YlR5cGUpO1xuICAgICAgaWYoIXZhbGlkYXRlZCkgcmV0dXJuIGZhbHNlO1xuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICAvLyB3ZSBuZWVkIHRvIHJlbW92ZSB0aGlzIGZpbHRlclxuICAgICAgLy8gd2UgbWF5IGVuZGVkIHVwIGluIGEgZXJyb3IgY3ljbGVcbiAgICAgIHRoaXMuX2ZpbHRlcnMuc3BsaWNlKGxjLCAxKTtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcImFuIGVycm9yIHRocm93biBmcm9tIGEgZmlsdGVyIHlvdSd2ZSBzdXBsaWVkXCIsIGV4Lm1lc3NhZ2UpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTsiLCJLYWRpcmFNb2RlbCA9IGZ1bmN0aW9uKCkge1xuXG59O1xuXG5LYWRpcmFNb2RlbC5wcm90b3R5cGUuX2dldERhdGVJZCA9IGZ1bmN0aW9uKHRpbWVzdGFtcCkge1xuICB2YXIgcmVtYWluZGVyID0gdGltZXN0YW1wICUgKDEwMDAgKiA2MCk7XG4gIHZhciBkYXRlSWQgPSB0aW1lc3RhbXAgLSByZW1haW5kZXI7XG4gIHJldHVybiBkYXRlSWQ7XG59OyIsInZhciBNRVRIT0RfTUVUUklDU19GSUVMRFMgPSBbJ3dhaXQnLCAnZGInLCAnaHR0cCcsICdlbWFpbCcsICdhc3luYycsICdjb21wdXRlJywgJ3RvdGFsJ107XG5cbk1ldGhvZHNNb2RlbCA9IGZ1bmN0aW9uIChtZXRyaWNzVGhyZXNob2xkKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICB0aGlzLm1ldGhvZE1ldHJpY3NCeU1pbnV0ZSA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gIHRoaXMuZXJyb3JNYXAgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gIHRoaXMuX21ldHJpY3NUaHJlc2hvbGQgPSBPYmplY3QuYXNzaWduKHtcbiAgICBcIndhaXRcIjogMTAwLFxuICAgIFwiZGJcIjogMTAwLFxuICAgIFwiaHR0cFwiOiAxMDAwLFxuICAgIFwiZW1haWxcIjogMTAwLFxuICAgIFwiYXN5bmNcIjogMTAwLFxuICAgIFwiY29tcHV0ZVwiOiAxMDAsXG4gICAgXCJ0b3RhbFwiOiAyMDBcbiAgfSwgbWV0cmljc1RocmVzaG9sZCB8fCBPYmplY3QuY3JlYXRlKG51bGwpKTtcblxuICAvL3N0b3JlIG1heCB0aW1lIGVsYXBzZWQgbWV0aG9kcyBmb3IgZWFjaCBtZXRob2QsIGV2ZW50KG1ldHJpY3MtZmllbGQpXG4gIHRoaXMubWF4RXZlbnRUaW1lc0Zvck1ldGhvZHMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gIHRoaXMudHJhY2VyU3RvcmUgPSBuZXcgVHJhY2VyU3RvcmUoe1xuICAgIGludGVydmFsOiAxMDAwICogNjAsIC8vcHJvY2VzcyB0cmFjZXMgZXZlcnkgbWludXRlXG4gICAgbWF4VG90YWxQb2ludHM6IDMwLCAvL2ZvciAzMCBtaW51dGVzXG4gICAgYXJjaGl2ZUV2ZXJ5OiA1IC8vYWx3YXlzIHRyYWNlIGZvciBldmVyeSA1IG1pbnV0ZXMsXG4gIH0pO1xuXG4gIHRoaXMudHJhY2VyU3RvcmUuc3RhcnQoKTtcbn07XG5cbk9iamVjdC5hc3NpZ24oTWV0aG9kc01vZGVsLnByb3RvdHlwZSwgS2FkaXJhTW9kZWwucHJvdG90eXBlKTtcblxuTWV0aG9kc01vZGVsLnByb3RvdHlwZS5fZ2V0TWV0cmljcyA9IGZ1bmN0aW9uKHRpbWVzdGFtcCwgbWV0aG9kKSB7XG4gIHZhciBkYXRlSWQgPSB0aGlzLl9nZXREYXRlSWQodGltZXN0YW1wKTtcblxuICBpZighdGhpcy5tZXRob2RNZXRyaWNzQnlNaW51dGVbZGF0ZUlkXSkge1xuICAgIHRoaXMubWV0aG9kTWV0cmljc0J5TWludXRlW2RhdGVJZF0gPSB7XG4gICAgICBtZXRob2RzOiBPYmplY3QuY3JlYXRlKG51bGwpLFxuICAgIH07XG4gIH1cblxuICB2YXIgbWV0aG9kcyA9IHRoaXMubWV0aG9kTWV0cmljc0J5TWludXRlW2RhdGVJZF0ubWV0aG9kcztcblxuICAvL2luaXRpYWxpemUgbWV0aG9kXG4gIGlmKCFtZXRob2RzW21ldGhvZF0pIHtcbiAgICBtZXRob2RzW21ldGhvZF0gPSB7XG4gICAgICBjb3VudDogMCxcbiAgICAgIGVycm9yczogMCxcbiAgICAgIGZldGNoZWREb2NTaXplOiAwLFxuICAgICAgc2VudE1zZ1NpemU6IDBcbiAgICB9O1xuXG4gICAgTUVUSE9EX01FVFJJQ1NfRklFTERTLmZvckVhY2goZnVuY3Rpb24oZmllbGQpIHtcbiAgICAgIG1ldGhvZHNbbWV0aG9kXVtmaWVsZF0gPSAwO1xuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIHRoaXMubWV0aG9kTWV0cmljc0J5TWludXRlW2RhdGVJZF0ubWV0aG9kc1ttZXRob2RdO1xufTtcblxuTWV0aG9kc01vZGVsLnByb3RvdHlwZS5zZXRTdGFydFRpbWUgPSBmdW5jdGlvbih0aW1lc3RhbXApIHtcbiAgdGhpcy5tZXRyaWNzQnlNaW51dGVbZGF0ZUlkXS5zdGFydFRpbWUgPSB0aW1lc3RhbXA7XG59XG5cbk1ldGhvZHNNb2RlbC5wcm90b3R5cGUucHJvY2Vzc01ldGhvZCA9IGZ1bmN0aW9uKG1ldGhvZFRyYWNlKSB7XG4gIHZhciBkYXRlSWQgPSB0aGlzLl9nZXREYXRlSWQobWV0aG9kVHJhY2UuYXQpO1xuXG4gIC8vYXBwZW5kIG1ldHJpY3MgdG8gcHJldmlvdXMgdmFsdWVzXG4gIHRoaXMuX2FwcGVuZE1ldHJpY3MoZGF0ZUlkLCBtZXRob2RUcmFjZSk7XG4gIGlmKG1ldGhvZFRyYWNlLmVycm9yZWQpIHtcbiAgICB0aGlzLm1ldGhvZE1ldHJpY3NCeU1pbnV0ZVtkYXRlSWRdLm1ldGhvZHNbbWV0aG9kVHJhY2UubmFtZV0uZXJyb3JzICsrXG4gIH1cblxuICB0aGlzLnRyYWNlclN0b3JlLmFkZFRyYWNlKG1ldGhvZFRyYWNlKTtcbn07XG5cbk1ldGhvZHNNb2RlbC5wcm90b3R5cGUuX2FwcGVuZE1ldHJpY3MgPSBmdW5jdGlvbihpZCwgbWV0aG9kVHJhY2UpIHtcbiAgdmFyIG1ldGhvZE1ldHJpY3MgPSB0aGlzLl9nZXRNZXRyaWNzKGlkLCBtZXRob2RUcmFjZS5uYW1lKVxuXG4gIC8vIHN0YXJ0VGltZSBuZWVkcyB0byBiZSBjb252ZXJ0ZWQgaW50byBzZXJ2ZXJUaW1lIGJlZm9yZSBzZW5kaW5nXG4gIGlmKCF0aGlzLm1ldGhvZE1ldHJpY3NCeU1pbnV0ZVtpZF0uc3RhcnRUaW1lKXtcbiAgICB0aGlzLm1ldGhvZE1ldHJpY3NCeU1pbnV0ZVtpZF0uc3RhcnRUaW1lID0gbWV0aG9kVHJhY2UuYXQ7XG4gIH1cblxuICAvL21lcmdlXG4gIE1FVEhPRF9NRVRSSUNTX0ZJRUxEUy5mb3JFYWNoKGZ1bmN0aW9uKGZpZWxkKSB7XG4gICAgdmFyIHZhbHVlID0gbWV0aG9kVHJhY2UubWV0cmljc1tmaWVsZF07XG4gICAgaWYodmFsdWUgPiAwKSB7XG4gICAgICBtZXRob2RNZXRyaWNzW2ZpZWxkXSArPSB2YWx1ZTtcbiAgICB9XG4gIH0pO1xuXG4gIG1ldGhvZE1ldHJpY3MuY291bnQrKztcbiAgdGhpcy5tZXRob2RNZXRyaWNzQnlNaW51dGVbaWRdLmVuZFRpbWUgPSBtZXRob2RUcmFjZS5tZXRyaWNzLmF0O1xufTtcblxuTWV0aG9kc01vZGVsLnByb3RvdHlwZS50cmFja0RvY1NpemUgPSBmdW5jdGlvbihtZXRob2QsIHNpemUpIHtcbiAgdmFyIHRpbWVzdGFtcCA9IE50cC5fbm93KCk7XG4gIHZhciBkYXRlSWQgPSB0aGlzLl9nZXREYXRlSWQodGltZXN0YW1wKTtcblxuICB2YXIgbWV0aG9kTWV0cmljcyA9IHRoaXMuX2dldE1ldHJpY3MoZGF0ZUlkLCBtZXRob2QpO1xuICBtZXRob2RNZXRyaWNzLmZldGNoZWREb2NTaXplICs9IHNpemU7XG59XG5cbk1ldGhvZHNNb2RlbC5wcm90b3R5cGUudHJhY2tNc2dTaXplID0gZnVuY3Rpb24obWV0aG9kLCBzaXplKSB7XG4gIHZhciB0aW1lc3RhbXAgPSBOdHAuX25vdygpO1xuICB2YXIgZGF0ZUlkID0gdGhpcy5fZ2V0RGF0ZUlkKHRpbWVzdGFtcCk7XG5cbiAgdmFyIG1ldGhvZE1ldHJpY3MgPSB0aGlzLl9nZXRNZXRyaWNzKGRhdGVJZCwgbWV0aG9kKTtcbiAgbWV0aG9kTWV0cmljcy5zZW50TXNnU2l6ZSArPSBzaXplO1xufVxuXG4vKlxuICBUaGVyZSBhcmUgdHdvIHR5cGVzIG9mIGRhdGFcblxuICAxLiBtZXRob2RNZXRyaWNzIC0gbWV0cmljcyBhYm91dCB0aGUgbWV0aG9kcyAoZm9yIGV2ZXJ5IDEwIHNlY3MpXG4gIDIuIG1ldGhvZFJlcXVlc3RzIC0gcmF3IG1ldGhvZCByZXF1ZXN0LiBub3JtYWxseSBtYXgsIG1pbiBmb3IgZXZlcnkgMSBtaW4gYW5kIGVycm9ycyBhbHdheXNcbiovXG5NZXRob2RzTW9kZWwucHJvdG90eXBlLmJ1aWxkUGF5bG9hZCA9IGZ1bmN0aW9uKGJ1aWxkRGV0YWlsZWRJbmZvKSB7XG4gIHZhciBwYXlsb2FkID0ge1xuICAgIG1ldGhvZE1ldHJpY3M6IFtdLFxuICAgIG1ldGhvZFJlcXVlc3RzOiBbXVxuICB9O1xuXG4gIC8vaGFuZGxpbmcgbWV0cmljc1xuICB2YXIgbWV0aG9kTWV0cmljc0J5TWludXRlID0gdGhpcy5tZXRob2RNZXRyaWNzQnlNaW51dGU7XG4gIHRoaXMubWV0aG9kTWV0cmljc0J5TWludXRlID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICAvL2NyZWF0ZSBmaW5hbCBwYXlsb2QgZm9yIG1ldGhvZE1ldHJpY3NcbiAgZm9yKHZhciBrZXkgaW4gbWV0aG9kTWV0cmljc0J5TWludXRlKSB7XG4gICAgdmFyIG1ldGhvZE1ldHJpY3MgPSBtZXRob2RNZXRyaWNzQnlNaW51dGVba2V5XTtcbiAgICAvLyBjb252ZXJ0aW5nIHN0YXJ0VGltZSBpbnRvIHRoZSBhY3R1YWwgc2VydmVyVGltZVxuICAgIHZhciBzdGFydFRpbWUgPSBtZXRob2RNZXRyaWNzLnN0YXJ0VGltZTtcbiAgICBtZXRob2RNZXRyaWNzLnN0YXJ0VGltZSA9IEthZGlyYS5zeW5jZWREYXRlLnN5bmNUaW1lKHN0YXJ0VGltZSk7XG5cbiAgICBmb3IodmFyIG1ldGhvZE5hbWUgaW4gbWV0aG9kTWV0cmljcy5tZXRob2RzKSB7XG4gICAgICBNRVRIT0RfTUVUUklDU19GSUVMRFMuZm9yRWFjaChmdW5jdGlvbihmaWVsZCkge1xuICAgICAgICBtZXRob2RNZXRyaWNzLm1ldGhvZHNbbWV0aG9kTmFtZV1bZmllbGRdIC89XG4gICAgICAgICAgbWV0aG9kTWV0cmljcy5tZXRob2RzW21ldGhvZE5hbWVdLmNvdW50O1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcGF5bG9hZC5tZXRob2RNZXRyaWNzLnB1c2gobWV0aG9kTWV0cmljc0J5TWludXRlW2tleV0pO1xuICB9XG5cbiAgLy9jb2xsZWN0IHRyYWNlcyBhbmQgc2VuZCB0aGVtIHdpdGggdGhlIHBheWxvYWRcbiAgcGF5bG9hZC5tZXRob2RSZXF1ZXN0cyA9IHRoaXMudHJhY2VyU3RvcmUuY29sbGVjdFRyYWNlcygpO1xuXG4gIHJldHVybiBwYXlsb2FkO1xufTtcbiIsInZhciBsb2dnZXIgPSBOcG0ucmVxdWlyZSgnZGVidWcnKSgna2FkaXJhOnB1YnN1YicpO1xuXG5pbXBvcnQgeyBzaXplLCBlYWNoLCBnZXQgfSBmcm9tIFwiLi4vdXRpbHMuanNcIjtcblxuUHVic3ViTW9kZWwgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5tZXRyaWNzQnlNaW51dGUgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICB0aGlzLnN1YnNjcmlwdGlvbnMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gIHRoaXMudHJhY2VyU3RvcmUgPSBuZXcgVHJhY2VyU3RvcmUoe1xuICAgIGludGVydmFsOiAxMDAwICogNjAsIC8vcHJvY2VzcyB0cmFjZXMgZXZlcnkgbWludXRlXG4gICAgbWF4VG90YWxQb2ludHM6IDMwLCAvL2ZvciAzMCBtaW51dGVzXG4gICAgYXJjaGl2ZUV2ZXJ5OiA1IC8vYWx3YXlzIHRyYWNlIGZvciBldmVyeSA1IG1pbnV0ZXMsXG4gIH0pO1xuXG4gIHRoaXMudHJhY2VyU3RvcmUuc3RhcnQoKTtcbn1cblxuUHVic3ViTW9kZWwucHJvdG90eXBlLl90cmFja1N1YiA9IGZ1bmN0aW9uKHNlc3Npb24sIG1zZykge1xuICBsb2dnZXIoJ1NVQjonLCBzZXNzaW9uLmlkLCBtc2cuaWQsIG1zZy5uYW1lLCBtc2cucGFyYW1zKTtcbiAgdmFyIHB1YmxpY2F0aW9uID0gdGhpcy5fZ2V0UHVibGljYXRpb25OYW1lKG1zZy5uYW1lKTtcbiAgdmFyIHN1YnNjcmlwdGlvbklkID0gbXNnLmlkO1xuICB2YXIgdGltZXN0YW1wID0gTnRwLl9ub3coKTtcbiAgdmFyIG1ldHJpY3MgPSB0aGlzLl9nZXRNZXRyaWNzKHRpbWVzdGFtcCwgcHVibGljYXRpb24pO1xuXG4gIG1ldHJpY3Muc3VicysrO1xuICB0aGlzLnN1YnNjcmlwdGlvbnNbbXNnLmlkXSA9IHtcbiAgICAvLyBXZSB1c2UgbG9jYWxUaW1lIGhlcmUsIGJlY2F1c2Ugd2hlbiB3ZSB1c2VkIHN5bmVkVGltZSB3ZSBtaWdodCBnZXRcbiAgICAvLyBtaW51cyBvciBtb3JlIHRoYW4gd2UndmUgZXhwZWN0ZWRcbiAgICAvLyAgIChiZWZvcmUgc2VydmVyVGltZSBkaWZmIGNoYW5nZWQgb3ZlcnRpbWUpXG4gICAgc3RhcnRUaW1lOiB0aW1lc3RhbXAsXG4gICAgcHVibGljYXRpb246IHB1YmxpY2F0aW9uLFxuICAgIHBhcmFtczogbXNnLnBhcmFtcyxcbiAgICBpZDogbXNnLmlkXG4gIH07XG5cbiAgLy9zZXQgc2Vzc2lvbiBzdGFydGVkVGltZVxuICBzZXNzaW9uLl9zdGFydFRpbWUgPSBzZXNzaW9uLl9zdGFydFRpbWUgfHwgdGltZXN0YW1wO1xufTtcblxuT2JqZWN0LmFzc2lnbihQdWJzdWJNb2RlbC5wcm90b3R5cGUsIEthZGlyYU1vZGVsLnByb3RvdHlwZSk7XG5cblB1YnN1Yk1vZGVsLnByb3RvdHlwZS5fdHJhY2tVbnN1YiA9IGZ1bmN0aW9uKHNlc3Npb24sIHN1Yikge1xuICBsb2dnZXIoJ1VOU1VCOicsIHNlc3Npb24uaWQsIHN1Yi5fc3Vic2NyaXB0aW9uSWQpO1xuICB2YXIgcHVibGljYXRpb24gPSB0aGlzLl9nZXRQdWJsaWNhdGlvbk5hbWUoc3ViLl9uYW1lKTtcbiAgdmFyIHN1YnNjcmlwdGlvbklkID0gc3ViLl9zdWJzY3JpcHRpb25JZDtcbiAgdmFyIHN1YnNjcmlwdGlvblN0YXRlID0gdGhpcy5zdWJzY3JpcHRpb25zW3N1YnNjcmlwdGlvbklkXTtcblxuICB2YXIgc3RhcnRUaW1lID0gbnVsbDtcbiAgLy9zb21ldGltZSwgd2UgZG9uJ3QgaGF2ZSB0aGVzZSBzdGF0ZXNcbiAgaWYoc3Vic2NyaXB0aW9uU3RhdGUpIHtcbiAgICBzdGFydFRpbWUgPSBzdWJzY3JpcHRpb25TdGF0ZS5zdGFydFRpbWU7XG4gIH0gZWxzZSB7XG4gICAgLy9pZiB0aGlzIGlzIG51bGwgc3Vic2NyaXB0aW9uLCB3aGljaCBpcyBzdGFydGVkIGF1dG9tYXRpY2FsbHlcbiAgICAvL2hlbmNlLCB3ZSBkb24ndCBoYXZlIGEgc3RhdGVcbiAgICBzdGFydFRpbWUgPSBzZXNzaW9uLl9zdGFydFRpbWU7XG4gIH1cblxuICAvL2luIGNhc2UsIHdlIGNhbid0IGdldCB0aGUgc3RhcnRUaW1lXG4gIGlmKHN0YXJ0VGltZSkge1xuICAgIHZhciB0aW1lc3RhbXAgPSBOdHAuX25vdygpO1xuICAgIHZhciBtZXRyaWNzID0gdGhpcy5fZ2V0TWV0cmljcyh0aW1lc3RhbXAsIHB1YmxpY2F0aW9uKTtcbiAgICAvL3RyYWNrIHRoZSBjb3VudFxuICAgIGlmKHN1Yi5fbmFtZSAhPSBudWxsKSB7XG4gICAgICAvLyB3ZSBjYW4ndCB0cmFjayBzdWJzIGZvciBgbnVsbGAgcHVibGljYXRpb25zLlxuICAgICAgLy8gc28gd2Ugc2hvdWxkIG5vdCB0cmFjayB1bnN1YnMgdG9vXG4gICAgICBtZXRyaWNzLnVuc3VicysrO1xuICAgIH1cbiAgICAvL3VzZSB0aGUgY3VycmVudCBkYXRlIHRvIGdldCB0aGUgbGlmZVRpbWUgb2YgdGhlIHN1YnNjcmlwdGlvblxuICAgIG1ldHJpY3MubGlmZVRpbWUgKz0gdGltZXN0YW1wIC0gc3RhcnRUaW1lO1xuICAgIC8vdGhpcyBpcyBwbGFjZSB3ZSBjYW4gY2xlYW4gdGhlIHN1YnNjcmlwdGlvblN0YXRlIGlmIGV4aXN0c1xuICAgIGRlbGV0ZSB0aGlzLnN1YnNjcmlwdGlvbnNbc3Vic2NyaXB0aW9uSWRdO1xuICB9XG59O1xuXG5QdWJzdWJNb2RlbC5wcm90b3R5cGUuX3RyYWNrUmVhZHkgPSBmdW5jdGlvbihzZXNzaW9uLCBzdWIsIHRyYWNlKSB7XG4gIGxvZ2dlcignUkVBRFk6Jywgc2Vzc2lvbi5pZCwgc3ViLl9zdWJzY3JpcHRpb25JZCk7XG4gIC8vdXNlIHRoZSBjdXJyZW50IHRpbWUgdG8gdHJhY2sgdGhlIHJlc3BvbnNlIHRpbWVcbiAgdmFyIHB1YmxpY2F0aW9uID0gdGhpcy5fZ2V0UHVibGljYXRpb25OYW1lKHN1Yi5fbmFtZSk7XG4gIHZhciBzdWJzY3JpcHRpb25JZCA9IHN1Yi5fc3Vic2NyaXB0aW9uSWQ7XG4gIHZhciB0aW1lc3RhbXAgPSBOdHAuX25vdygpO1xuICB2YXIgbWV0cmljcyA9IHRoaXMuX2dldE1ldHJpY3ModGltZXN0YW1wLCBwdWJsaWNhdGlvbik7XG5cbiAgdmFyIHN1YnNjcmlwdGlvblN0YXRlID0gdGhpcy5zdWJzY3JpcHRpb25zW3N1YnNjcmlwdGlvbklkXTtcbiAgaWYoc3Vic2NyaXB0aW9uU3RhdGUgJiYgIXN1YnNjcmlwdGlvblN0YXRlLnJlYWR5VHJhY2tlZCkge1xuICAgIG1ldHJpY3MucmVzVGltZSArPSB0aW1lc3RhbXAgLSBzdWJzY3JpcHRpb25TdGF0ZS5zdGFydFRpbWU7XG4gICAgc3Vic2NyaXB0aW9uU3RhdGUucmVhZHlUcmFja2VkID0gdHJ1ZTtcbiAgfVxuXG4gIGlmKHRyYWNlKSB7XG4gICAgdGhpcy50cmFjZXJTdG9yZS5hZGRUcmFjZSh0cmFjZSk7XG4gIH1cbn07XG5cblB1YnN1Yk1vZGVsLnByb3RvdHlwZS5fdHJhY2tFcnJvciA9IGZ1bmN0aW9uKHNlc3Npb24sIHN1YiwgdHJhY2UpIHtcbiAgbG9nZ2VyKCdFUlJPUjonLCBzZXNzaW9uLmlkLCBzdWIuX3N1YnNjcmlwdGlvbklkKTtcbiAgLy91c2UgdGhlIGN1cnJlbnQgdGltZSB0byB0cmFjayB0aGUgcmVzcG9uc2UgdGltZVxuICB2YXIgcHVibGljYXRpb24gPSB0aGlzLl9nZXRQdWJsaWNhdGlvbk5hbWUoc3ViLl9uYW1lKTtcbiAgdmFyIHN1YnNjcmlwdGlvbklkID0gc3ViLl9zdWJzY3JpcHRpb25JZDtcbiAgdmFyIHRpbWVzdGFtcCA9IE50cC5fbm93KCk7XG4gIHZhciBtZXRyaWNzID0gdGhpcy5fZ2V0TWV0cmljcyh0aW1lc3RhbXAsIHB1YmxpY2F0aW9uKTtcblxuICBtZXRyaWNzLmVycm9ycysrO1xuXG4gIGlmKHRyYWNlKSB7XG4gICAgdGhpcy50cmFjZXJTdG9yZS5hZGRUcmFjZSh0cmFjZSk7XG4gIH1cbn07XG5cblB1YnN1Yk1vZGVsLnByb3RvdHlwZS5fZ2V0TWV0cmljcyA9IGZ1bmN0aW9uKHRpbWVzdGFtcCwgcHVibGljYXRpb24pIHtcbiAgdmFyIGRhdGVJZCA9IHRoaXMuX2dldERhdGVJZCh0aW1lc3RhbXApO1xuXG4gIGlmKCF0aGlzLm1ldHJpY3NCeU1pbnV0ZVtkYXRlSWRdKSB7XG4gICAgdGhpcy5tZXRyaWNzQnlNaW51dGVbZGF0ZUlkXSA9IHtcbiAgICAgIC8vIHN0YXJ0VGltZSBuZWVkcyB0byBiZSBjb252ZXJ0IHRvIHNlcnZlclRpbWUgYmVmb3JlIHNlbmRpbmcgdG8gdGhlIHNlcnZlclxuICAgICAgc3RhcnRUaW1lOiB0aW1lc3RhbXAsXG4gICAgICBwdWJzOiBPYmplY3QuY3JlYXRlKG51bGwpXG4gICAgfTtcbiAgfVxuXG4gIGlmKCF0aGlzLm1ldHJpY3NCeU1pbnV0ZVtkYXRlSWRdLnB1YnNbcHVibGljYXRpb25dKSB7XG4gICAgdGhpcy5tZXRyaWNzQnlNaW51dGVbZGF0ZUlkXS5wdWJzW3B1YmxpY2F0aW9uXSA9IHtcbiAgICAgIHN1YnM6IDAsXG4gICAgICB1bnN1YnM6IDAsXG4gICAgICByZXNUaW1lOiAwLFxuICAgICAgYWN0aXZlU3ViczogMCxcbiAgICAgIGFjdGl2ZURvY3M6IDAsXG4gICAgICBsaWZlVGltZTogMCxcbiAgICAgIHRvdGFsT2JzZXJ2ZXJzOiAwLFxuICAgICAgY2FjaGVkT2JzZXJ2ZXJzOiAwLFxuICAgICAgY3JlYXRlZE9ic2VydmVyczogMCxcbiAgICAgIGRlbGV0ZWRPYnNlcnZlcnM6IDAsXG4gICAgICBlcnJvcnM6IDAsXG4gICAgICBvYnNlcnZlckxpZmV0aW1lOiAwLFxuICAgICAgcG9sbGVkRG9jdW1lbnRzOiAwLFxuICAgICAgb3Bsb2dVcGRhdGVkRG9jdW1lbnRzOiAwLFxuICAgICAgb3Bsb2dJbnNlcnRlZERvY3VtZW50czogMCxcbiAgICAgIG9wbG9nRGVsZXRlZERvY3VtZW50czogMCxcbiAgICAgIGluaXRpYWxseUFkZGVkRG9jdW1lbnRzOiAwLFxuICAgICAgbGl2ZUFkZGVkRG9jdW1lbnRzOiAwLFxuICAgICAgbGl2ZUNoYW5nZWREb2N1bWVudHM6IDAsXG4gICAgICBsaXZlUmVtb3ZlZERvY3VtZW50czogMCxcbiAgICAgIHBvbGxlZERvY1NpemU6IDAsXG4gICAgICBmZXRjaGVkRG9jU2l6ZTogMCxcbiAgICAgIGluaXRpYWxseUZldGNoZWREb2NTaXplOiAwLFxuICAgICAgbGl2ZUZldGNoZWREb2NTaXplOiAwLFxuICAgICAgaW5pdGlhbGx5U2VudE1zZ1NpemU6IDAsXG4gICAgICBsaXZlU2VudE1zZ1NpemU6IDBcbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuIHRoaXMubWV0cmljc0J5TWludXRlW2RhdGVJZF0ucHVic1twdWJsaWNhdGlvbl07XG59O1xuXG5QdWJzdWJNb2RlbC5wcm90b3R5cGUuX2dldFB1YmxpY2F0aW9uTmFtZSA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgcmV0dXJuIG5hbWUgfHwgXCJudWxsKGF1dG9wdWJsaXNoKVwiO1xufTtcblxuUHVic3ViTW9kZWwucHJvdG90eXBlLl9nZXRTdWJzY3JpcHRpb25JbmZvID0gZnVuY3Rpb24oKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIGFjdGl2ZVN1YnMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICB2YXIgYWN0aXZlRG9jcyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gIHZhciB0b3RhbERvY3NTZW50ID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgdmFyIHRvdGFsRGF0YVNlbnQgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICB2YXIgdG90YWxPYnNlcnZlcnMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICB2YXIgY2FjaGVkT2JzZXJ2ZXJzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICBlYWNoKE1ldGVvci5zZXJ2ZXIuc2Vzc2lvbnMsIHNlc3Npb24gPT4ge1xuICAgIGVhY2goc2Vzc2lvbi5fbmFtZWRTdWJzLCBjb3VudFN1YkRhdGEpO1xuICAgIGVhY2goc2Vzc2lvbi5fdW5pdmVyc2FsU3VicywgY291bnRTdWJEYXRhKTtcbiAgfSk7XG5cbiAgdmFyIGF2Z09ic2VydmVyUmV1c2UgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICBfLmVhY2godG90YWxPYnNlcnZlcnMsIGZ1bmN0aW9uKHZhbHVlLCBwdWJsaWNhdGlvbikge1xuICAgIGF2Z09ic2VydmVyUmV1c2VbcHVibGljYXRpb25dID0gY2FjaGVkT2JzZXJ2ZXJzW3B1YmxpY2F0aW9uXSAvIHRvdGFsT2JzZXJ2ZXJzW3B1YmxpY2F0aW9uXTtcbiAgfSk7XG5cbiAgcmV0dXJuIHtcbiAgICBhY3RpdmVTdWJzOiBhY3RpdmVTdWJzLFxuICAgIGFjdGl2ZURvY3M6IGFjdGl2ZURvY3MsXG4gICAgYXZnT2JzZXJ2ZXJSZXVzZTogYXZnT2JzZXJ2ZXJSZXVzZVxuICB9O1xuXG4gIGZ1bmN0aW9uIGNvdW50U3ViRGF0YSAoc3ViKSB7XG4gICAgdmFyIHB1YmxpY2F0aW9uID0gc2VsZi5fZ2V0UHVibGljYXRpb25OYW1lKHN1Yi5fbmFtZSk7XG4gICAgY291bnRTdWJzY3JpcHRpb25zKHN1YiwgcHVibGljYXRpb24pO1xuICAgIGNvdW50RG9jdW1lbnRzKHN1YiwgcHVibGljYXRpb24pO1xuICAgIGNvdW50T2JzZXJ2ZXJzKHN1YiwgcHVibGljYXRpb24pO1xuICB9XG5cbiAgZnVuY3Rpb24gY291bnRTdWJzY3JpcHRpb25zIChzdWIsIHB1YmxpY2F0aW9uKSB7XG4gICAgYWN0aXZlU3Vic1twdWJsaWNhdGlvbl0gPSBhY3RpdmVTdWJzW3B1YmxpY2F0aW9uXSB8fCAwO1xuICAgIGFjdGl2ZVN1YnNbcHVibGljYXRpb25dKys7XG4gIH1cblxuICBmdW5jdGlvbiBjb3VudERvY3VtZW50cyAoc3ViLCBwdWJsaWNhdGlvbikge1xuICAgIGFjdGl2ZURvY3NbcHVibGljYXRpb25dID0gYWN0aXZlRG9jc1twdWJsaWNhdGlvbl0gfHwgMDtcbiAgICBlYWNoKHN1Yi5fZG9jdW1lbnRzLCBkb2N1bWVudCA9PiB7XG4gICAgICBhY3RpdmVEb2NzW3B1YmxpY2F0aW9uXSArPSBzaXplKGRvY3VtZW50KTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvdW50T2JzZXJ2ZXJzKHN1YiwgcHVibGljYXRpb24pIHtcbiAgICB0b3RhbE9ic2VydmVyc1twdWJsaWNhdGlvbl0gPSB0b3RhbE9ic2VydmVyc1twdWJsaWNhdGlvbl0gfHwgMDtcbiAgICBjYWNoZWRPYnNlcnZlcnNbcHVibGljYXRpb25dID0gY2FjaGVkT2JzZXJ2ZXJzW3B1YmxpY2F0aW9uXSB8fCAwO1xuXG4gICAgdG90YWxPYnNlcnZlcnNbcHVibGljYXRpb25dICs9IHN1Yi5fdG90YWxPYnNlcnZlcnM7XG4gICAgY2FjaGVkT2JzZXJ2ZXJzW3B1YmxpY2F0aW9uXSArPSBzdWIuX2NhY2hlZE9ic2VydmVycztcbiAgfVxufVxuXG5QdWJzdWJNb2RlbC5wcm90b3R5cGUuYnVpbGRQYXlsb2FkID0gZnVuY3Rpb24oYnVpbGREZXRhaWxJbmZvKSB7XG4gIHZhciBtZXRyaWNzQnlNaW51dGUgPSB0aGlzLm1ldHJpY3NCeU1pbnV0ZTtcbiAgdGhpcy5tZXRyaWNzQnlNaW51dGUgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gIHZhciBwYXlsb2FkID0ge1xuICAgIHB1Yk1ldHJpY3M6IFtdXG4gIH07XG5cbiAgdmFyIHN1YnNjcmlwdGlvbkRhdGEgPSB0aGlzLl9nZXRTdWJzY3JpcHRpb25JbmZvKCk7XG4gIHZhciBhY3RpdmVTdWJzID0gc3Vic2NyaXB0aW9uRGF0YS5hY3RpdmVTdWJzO1xuICB2YXIgYWN0aXZlRG9jcyA9IHN1YnNjcmlwdGlvbkRhdGEuYWN0aXZlRG9jcztcbiAgdmFyIGF2Z09ic2VydmVyUmV1c2UgPSBzdWJzY3JpcHRpb25EYXRhLmF2Z09ic2VydmVyUmV1c2U7XG5cbiAgLy90byB0aGUgYXZlcmFnaW5nXG4gIGZvcih2YXIgZGF0ZUlkIGluIG1ldHJpY3NCeU1pbnV0ZSkge1xuICAgIHZhciBkYXRlTWV0cmljcyA9IG1ldHJpY3NCeU1pbnV0ZVtkYXRlSWRdO1xuICAgIC8vIFdlIG5lZWQgdG8gY29udmVydCBzdGFydFRpbWUgaW50byBhY3R1YWwgc2VydmVyVGltZVxuICAgIGRhdGVNZXRyaWNzLnN0YXJ0VGltZSA9IEthZGlyYS5zeW5jZWREYXRlLnN5bmNUaW1lKGRhdGVNZXRyaWNzLnN0YXJ0VGltZSk7XG5cbiAgICBmb3IodmFyIHB1YmxpY2F0aW9uIGluIG1ldHJpY3NCeU1pbnV0ZVtkYXRlSWRdLnB1YnMpIHtcbiAgICAgIHZhciBzaW5nbGVQdWJNZXRyaWNzID0gbWV0cmljc0J5TWludXRlW2RhdGVJZF0ucHVic1twdWJsaWNhdGlvbl07XG4gICAgICAvLyBXZSBvbmx5IGNhbGN1bGF0ZSByZXNUaW1lIGZvciBuZXcgc3Vic2NyaXB0aW9uc1xuICAgICAgc2luZ2xlUHViTWV0cmljcy5yZXNUaW1lIC89IHNpbmdsZVB1Yk1ldHJpY3Muc3VicztcbiAgICAgIHNpbmdsZVB1Yk1ldHJpY3MucmVzVGltZSA9IHNpbmdsZVB1Yk1ldHJpY3MucmVzVGltZSB8fCAwO1xuICAgICAgLy8gV2Ugb25seSB0cmFjayBsaWZlVGltZSBpbiB0aGUgdW5zdWJzXG4gICAgICBzaW5nbGVQdWJNZXRyaWNzLmxpZmVUaW1lIC89IHNpbmdsZVB1Yk1ldHJpY3MudW5zdWJzO1xuICAgICAgc2luZ2xlUHViTWV0cmljcy5saWZlVGltZSA9IHNpbmdsZVB1Yk1ldHJpY3MubGlmZVRpbWUgfHwgMDtcblxuICAgICAgLy8gQ291bnQgdGhlIGF2ZXJhZ2UgZm9yIG9ic2VydmVyIGxpZmV0aW1lXG4gICAgICBpZihzaW5nbGVQdWJNZXRyaWNzLmRlbGV0ZWRPYnNlcnZlcnMgPiAwKSB7XG4gICAgICAgIHNpbmdsZVB1Yk1ldHJpY3Mub2JzZXJ2ZXJMaWZldGltZSAvPSBzaW5nbGVQdWJNZXRyaWNzLmRlbGV0ZWRPYnNlcnZlcnM7XG4gICAgICB9XG5cbiAgICAgIC8vIElmIHRoZXJlIGFyZSB0d28gb3JlIG1vcmUgZGF0ZUlkcywgd2Ugd2lsbCBiZSB1c2luZyB0aGUgY3VycmVudENvdW50IGZvciBhbGwgb2YgdGhlbS5cbiAgICAgIC8vIFdlIGNhbiBjb21lIHVwIHdpdGggYSBiZXR0ZXIgc29sdXRpb24gbGF0ZXIgb24uXG4gICAgICBzaW5nbGVQdWJNZXRyaWNzLmFjdGl2ZVN1YnMgPSBhY3RpdmVTdWJzW3B1YmxpY2F0aW9uXSB8fCAwO1xuICAgICAgc2luZ2xlUHViTWV0cmljcy5hY3RpdmVEb2NzID0gYWN0aXZlRG9jc1twdWJsaWNhdGlvbl0gfHwgMDtcbiAgICAgIHNpbmdsZVB1Yk1ldHJpY3MuYXZnT2JzZXJ2ZXJSZXVzZSA9IGF2Z09ic2VydmVyUmV1c2VbcHVibGljYXRpb25dIHx8IDA7XG4gICAgfVxuXG4gICAgcGF5bG9hZC5wdWJNZXRyaWNzLnB1c2gobWV0cmljc0J5TWludXRlW2RhdGVJZF0pO1xuICB9XG5cbiAgLy9jb2xsZWN0IHRyYWNlcyBhbmQgc2VuZCB0aGVtIHdpdGggdGhlIHBheWxvYWRcbiAgcGF5bG9hZC5wdWJSZXF1ZXN0cyA9IHRoaXMudHJhY2VyU3RvcmUuY29sbGVjdFRyYWNlcygpO1xuXG4gIHJldHVybiBwYXlsb2FkO1xufTtcblxuUHVic3ViTW9kZWwucHJvdG90eXBlLmluY3JlbWVudEhhbmRsZUNvdW50ID0gZnVuY3Rpb24odHJhY2UsIGlzQ2FjaGVkKSB7XG4gIHZhciB0aW1lc3RhbXAgPSBOdHAuX25vdygpO1xuICB2YXIgcHVibGljYXRpb25OYW1lID0gdGhpcy5fZ2V0UHVibGljYXRpb25OYW1lKHRyYWNlLm5hbWUpO1xuICB2YXIgcHVibGljYXRpb24gPSB0aGlzLl9nZXRNZXRyaWNzKHRpbWVzdGFtcCwgcHVibGljYXRpb25OYW1lKTtcblxuICB2YXIgc2Vzc2lvbiA9IGdldChNZXRlb3Iuc2VydmVyLnNlc3Npb25zLCB0cmFjZS5zZXNzaW9uKTtcbiAgaWYgKHNlc3Npb24pIHtcbiAgICB2YXIgc3ViID0gZ2V0KHNlc3Npb24uX25hbWVkU3VicywgdHJhY2UuaWQpO1xuICAgIGlmIChzdWIpIHtcbiAgICAgIHN1Yi5fdG90YWxPYnNlcnZlcnMgPSBzdWIuX3RvdGFsT2JzZXJ2ZXJzIHx8IDA7XG4gICAgICBzdWIuX2NhY2hlZE9ic2VydmVycyA9IHN1Yi5fY2FjaGVkT2JzZXJ2ZXJzIHx8IDA7XG4gICAgfVxuICB9XG4gIC8vIG5vdCBzdXJlLCB3ZSBuZWVkIHRvIGRvIHRoaXM/IEJ1dCBJIGRvbid0IG5lZWQgdG8gYnJlYWsgdGhlIGhvd2V2ZXJcbiAgc3ViID0gc3ViIHx8IHtfdG90YWxPYnNlcnZlcnM6MCAsIF9jYWNoZWRPYnNlcnZlcnM6IDB9O1xuXG4gIHB1YmxpY2F0aW9uLnRvdGFsT2JzZXJ2ZXJzKys7XG4gIHN1Yi5fdG90YWxPYnNlcnZlcnMrKztcbiAgaWYoaXNDYWNoZWQpIHtcbiAgICBwdWJsaWNhdGlvbi5jYWNoZWRPYnNlcnZlcnMrKztcbiAgICBzdWIuX2NhY2hlZE9ic2VydmVycysrO1xuICB9XG59XG5cblB1YnN1Yk1vZGVsLnByb3RvdHlwZS50cmFja0NyZWF0ZWRPYnNlcnZlciA9IGZ1bmN0aW9uKGluZm8pIHtcbiAgdmFyIHRpbWVzdGFtcCA9IE50cC5fbm93KCk7XG4gIHZhciBwdWJsaWNhdGlvbk5hbWUgPSB0aGlzLl9nZXRQdWJsaWNhdGlvbk5hbWUoaW5mby5uYW1lKTtcbiAgdmFyIHB1YmxpY2F0aW9uID0gdGhpcy5fZ2V0TWV0cmljcyh0aW1lc3RhbXAsIHB1YmxpY2F0aW9uTmFtZSk7XG4gIHB1YmxpY2F0aW9uLmNyZWF0ZWRPYnNlcnZlcnMrKztcbn1cblxuUHVic3ViTW9kZWwucHJvdG90eXBlLnRyYWNrRGVsZXRlZE9ic2VydmVyID0gZnVuY3Rpb24oaW5mbykge1xuICB2YXIgdGltZXN0YW1wID0gTnRwLl9ub3coKTtcbiAgdmFyIHB1YmxpY2F0aW9uTmFtZSA9IHRoaXMuX2dldFB1YmxpY2F0aW9uTmFtZShpbmZvLm5hbWUpO1xuICB2YXIgcHVibGljYXRpb24gPSB0aGlzLl9nZXRNZXRyaWNzKHRpbWVzdGFtcCwgcHVibGljYXRpb25OYW1lKTtcbiAgcHVibGljYXRpb24uZGVsZXRlZE9ic2VydmVycysrO1xuICBwdWJsaWNhdGlvbi5vYnNlcnZlckxpZmV0aW1lICs9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCkgLSBpbmZvLnN0YXJ0VGltZTtcbn1cblxuUHVic3ViTW9kZWwucHJvdG90eXBlLnRyYWNrRG9jdW1lbnRDaGFuZ2VzID0gZnVuY3Rpb24oaW5mbywgb3ApIHtcbiAgLy8gSXQncyBwb3NzaWJlbCB0aGF0IGluZm8gdG8gYmUgbnVsbFxuICAvLyBTcGVjaWFsbHkgd2hlbiBnZXR0aW5nIGNoYW5nZXMgYXQgdGhlIHZlcnkgYmVnaW5pbmcuXG4gIC8vIFRoaXMgbWF5IGJlIGZhbHNlLCBidXQgbmljZSB0byBoYXZlIGEgY2hlY2tcbiAgaWYoIWluZm8pIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHZhciB0aW1lc3RhbXAgPSBOdHAuX25vdygpO1xuICB2YXIgcHVibGljYXRpb25OYW1lID0gdGhpcy5fZ2V0UHVibGljYXRpb25OYW1lKGluZm8ubmFtZSk7XG4gIHZhciBwdWJsaWNhdGlvbiA9IHRoaXMuX2dldE1ldHJpY3ModGltZXN0YW1wLCBwdWJsaWNhdGlvbk5hbWUpO1xuICBpZihvcC5vcCA9PT0gXCJkXCIpIHtcbiAgICBwdWJsaWNhdGlvbi5vcGxvZ0RlbGV0ZWREb2N1bWVudHMrKztcbiAgfSBlbHNlIGlmKG9wLm9wID09PSBcImlcIikge1xuICAgIHB1YmxpY2F0aW9uLm9wbG9nSW5zZXJ0ZWREb2N1bWVudHMrKztcbiAgfSBlbHNlIGlmKG9wLm9wID09PSBcInVcIikge1xuICAgIHB1YmxpY2F0aW9uLm9wbG9nVXBkYXRlZERvY3VtZW50cysrO1xuICB9XG59XG5cblB1YnN1Yk1vZGVsLnByb3RvdHlwZS50cmFja1BvbGxlZERvY3VtZW50cyA9IGZ1bmN0aW9uKGluZm8sIGNvdW50KSB7XG4gIHZhciB0aW1lc3RhbXAgPSBOdHAuX25vdygpO1xuICB2YXIgcHVibGljYXRpb25OYW1lID0gdGhpcy5fZ2V0UHVibGljYXRpb25OYW1lKGluZm8ubmFtZSk7XG4gIHZhciBwdWJsaWNhdGlvbiA9IHRoaXMuX2dldE1ldHJpY3ModGltZXN0YW1wLCBwdWJsaWNhdGlvbk5hbWUpO1xuICBwdWJsaWNhdGlvbi5wb2xsZWREb2N1bWVudHMgKz0gY291bnQ7XG59XG5cblB1YnN1Yk1vZGVsLnByb3RvdHlwZS50cmFja0xpdmVVcGRhdGVzID0gZnVuY3Rpb24oaW5mbywgdHlwZSwgY291bnQpIHtcbiAgdmFyIHRpbWVzdGFtcCA9IE50cC5fbm93KCk7XG4gIHZhciBwdWJsaWNhdGlvbk5hbWUgPSB0aGlzLl9nZXRQdWJsaWNhdGlvbk5hbWUoaW5mby5uYW1lKTtcbiAgdmFyIHB1YmxpY2F0aW9uID0gdGhpcy5fZ2V0TWV0cmljcyh0aW1lc3RhbXAsIHB1YmxpY2F0aW9uTmFtZSk7XG5cbiAgaWYodHlwZSA9PT0gXCJfYWRkUHVibGlzaGVkXCIpIHtcbiAgICBwdWJsaWNhdGlvbi5saXZlQWRkZWREb2N1bWVudHMgKz0gY291bnQ7XG4gIH0gZWxzZSBpZih0eXBlID09PSBcIl9yZW1vdmVQdWJsaXNoZWRcIikge1xuICAgIHB1YmxpY2F0aW9uLmxpdmVSZW1vdmVkRG9jdW1lbnRzICs9IGNvdW50O1xuICB9IGVsc2UgaWYodHlwZSA9PT0gXCJfY2hhbmdlUHVibGlzaGVkXCIpIHtcbiAgICBwdWJsaWNhdGlvbi5saXZlQ2hhbmdlZERvY3VtZW50cyArPSBjb3VudDtcbiAgfSBlbHNlIGlmKHR5cGUgPT09IFwiX2luaXRpYWxBZGRzXCIpIHtcbiAgICBwdWJsaWNhdGlvbi5pbml0aWFsbHlBZGRlZERvY3VtZW50cyArPSBjb3VudDtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJLYWRpcmE6IFVua25vd24gbGl2ZSB1cGRhdGUgdHlwZVwiKTtcbiAgfVxufVxuXG5QdWJzdWJNb2RlbC5wcm90b3R5cGUudHJhY2tEb2NTaXplID0gZnVuY3Rpb24obmFtZSwgdHlwZSwgc2l6ZSkge1xuICB2YXIgdGltZXN0YW1wID0gTnRwLl9ub3coKTtcbiAgdmFyIHB1YmxpY2F0aW9uTmFtZSA9IHRoaXMuX2dldFB1YmxpY2F0aW9uTmFtZShuYW1lKTtcbiAgdmFyIHB1YmxpY2F0aW9uID0gdGhpcy5fZ2V0TWV0cmljcyh0aW1lc3RhbXAsIHB1YmxpY2F0aW9uTmFtZSk7XG5cbiAgaWYodHlwZSA9PT0gXCJwb2xsZWRGZXRjaGVzXCIpIHtcbiAgICBwdWJsaWNhdGlvbi5wb2xsZWREb2NTaXplICs9IHNpemU7XG4gIH0gZWxzZSBpZih0eXBlID09PSBcImxpdmVGZXRjaGVzXCIpIHtcbiAgICBwdWJsaWNhdGlvbi5saXZlRmV0Y2hlZERvY1NpemUgKz0gc2l6ZTtcbiAgfSBlbHNlIGlmKHR5cGUgPT09IFwiY3Vyc29yRmV0Y2hlc1wiKSB7XG4gICAgcHVibGljYXRpb24uZmV0Y2hlZERvY1NpemUgKz0gc2l6ZTtcbiAgfSBlbHNlIGlmKHR5cGUgPT09IFwiaW5pdGlhbEZldGNoZXNcIikge1xuICAgIHB1YmxpY2F0aW9uLmluaXRpYWxseUZldGNoZWREb2NTaXplICs9IHNpemU7XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiS2FkaXJhOiBVbmtub3duIGRvY3MgZmV0Y2hlZCB0eXBlXCIpO1xuICB9XG59XG5cblB1YnN1Yk1vZGVsLnByb3RvdHlwZS50cmFja01zZ1NpemUgPSBmdW5jdGlvbihuYW1lLCB0eXBlLCBzaXplKSB7XG4gIHZhciB0aW1lc3RhbXAgPSBOdHAuX25vdygpO1xuICB2YXIgcHVibGljYXRpb25OYW1lID0gdGhpcy5fZ2V0UHVibGljYXRpb25OYW1lKG5hbWUpO1xuICB2YXIgcHVibGljYXRpb24gPSB0aGlzLl9nZXRNZXRyaWNzKHRpbWVzdGFtcCwgcHVibGljYXRpb25OYW1lKTtcblxuICBpZih0eXBlID09PSBcImxpdmVTZW50XCIpIHtcbiAgICBwdWJsaWNhdGlvbi5saXZlU2VudE1zZ1NpemUgKz0gc2l6ZTtcbiAgfSBlbHNlIGlmKHR5cGUgPT09IFwiaW5pdGlhbFNlbnRcIikge1xuICAgIHB1YmxpY2F0aW9uLmluaXRpYWxseVNlbnRNc2dTaXplICs9IHNpemU7XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiS2FkaXJhOiBVbmtub3duIGRvY3MgZmV0Y2hlZCB0eXBlXCIpO1xuICB9XG59XG4iLCJpbXBvcnQgeyBzaXplIH0gZnJvbSBcIi4uL3V0aWxzLmpzXCI7XG5cbnZhciBvcyA9IE5wbS5yZXF1aXJlKCdvcycpO1xudmFyIHVzYWdlID0gTnBtLnJlcXVpcmUoJ3BpZHVzYWdlJyk7XG52YXIgRXZlbnRMb29wTW9uaXRvciA9IE5wbS5yZXF1aXJlKCdldmxvb3AtbW9uaXRvcicpO1xuXG5TeXN0ZW1Nb2RlbCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLnN0YXJ0VGltZSA9IE50cC5fbm93KCk7XG4gIHRoaXMubmV3U2Vzc2lvbnMgPSAwO1xuICB0aGlzLnNlc3Npb25UaW1lb3V0ID0gMTAwMCAqIDYwICogMzA7IC8vMzAgbWluXG5cbiAgdGhpcy51c2FnZUxvb2t1cCA9IEthZGlyYS5fd3JhcEFzeW5jKHVzYWdlLnN0YXQuYmluZCh1c2FnZSkpO1xuICB0aGlzLmV2bG9vcE1vbml0b3IgPSBuZXcgRXZlbnRMb29wTW9uaXRvcigyMDApO1xuICB0aGlzLmV2bG9vcE1vbml0b3Iuc3RhcnQoKTtcbn1cblxuT2JqZWN0LmFzc2lnbihTeXN0ZW1Nb2RlbC5wcm90b3R5cGUsIEthZGlyYU1vZGVsLnByb3RvdHlwZSk7XG5cblN5c3RlbU1vZGVsLnByb3RvdHlwZS5idWlsZFBheWxvYWQgPSBmdW5jdGlvbigpIHtcbiAgdmFyIG1ldHJpY3MgPSB7fTtcbiAgdmFyIG5vdyA9IE50cC5fbm93KCk7XG4gIG1ldHJpY3Muc3RhcnRUaW1lID0gS2FkaXJhLnN5bmNlZERhdGUuc3luY1RpbWUodGhpcy5zdGFydFRpbWUpO1xuICBtZXRyaWNzLmVuZFRpbWUgPSBLYWRpcmEuc3luY2VkRGF0ZS5zeW5jVGltZShub3cpO1xuXG4gIG1ldHJpY3Muc2Vzc2lvbnMgPSBzaXplKE1ldGVvci5zZXJ2ZXIuc2Vzc2lvbnMpO1xuICBtZXRyaWNzLm1lbW9yeSA9IHByb2Nlc3MubWVtb3J5VXNhZ2UoKS5yc3MgLyAoMTAyNCoxMDI0KTtcbiAgbWV0cmljcy5uZXdTZXNzaW9ucyA9IHRoaXMubmV3U2Vzc2lvbnM7XG4gIHRoaXMubmV3U2Vzc2lvbnMgPSAwO1xuXG4gIHZhciB1c2FnZSA9IHRoaXMuZ2V0VXNhZ2UoKTtcbiAgbWV0cmljcy5wY3B1ID0gdXNhZ2UuY3B1O1xuICBpZih1c2FnZS5jcHVJbmZvKSB7XG4gICAgbWV0cmljcy5jcHV0aW1lID0gdXNhZ2UuY3B1SW5mby5jcHVUaW1lO1xuICAgIG1ldHJpY3MucGNwdVVzZXIgPSB1c2FnZS5jcHVJbmZvLnBjcHVVc2VyO1xuICAgIG1ldHJpY3MucGNwdVN5c3RlbSA9IHVzYWdlLmNwdUluZm8ucGNwdVN5c3RlbTtcbiAgfVxuXG4gIC8vIHRyYWNrIGV2ZW50bG9vcCBibG9ja25lc3NcbiAgbWV0cmljcy5wY3RFdmxvb3BCbG9jayA9IHRoaXMuZXZsb29wTW9uaXRvci5zdGF0dXMoKS5wY3RCbG9jaztcblxuICB0aGlzLnN0YXJ0VGltZSA9IG5vdztcbiAgcmV0dXJuIHtzeXN0ZW1NZXRyaWNzOiBbbWV0cmljc119O1xufTtcblxuU3lzdGVtTW9kZWwucHJvdG90eXBlLmdldFVzYWdlID0gZnVuY3Rpb24oKSB7XG4gIHZhciB1c2FnZSA9IHRoaXMudXNhZ2VMb29rdXAocHJvY2Vzcy5waWQpIHx8IHt9O1xuICBLYWRpcmEuZG9jU3pDYWNoZS5zZXRQY3B1KHVzYWdlLmNwdSk7XG4gIHJldHVybiB1c2FnZTtcbn07XG5cblN5c3RlbU1vZGVsLnByb3RvdHlwZS5oYW5kbGVTZXNzaW9uQWN0aXZpdHkgPSBmdW5jdGlvbihtc2csIHNlc3Npb24pIHtcbiAgaWYobXNnLm1zZyA9PT0gJ2Nvbm5lY3QnICYmICFtc2cuc2Vzc2lvbikge1xuICAgIHRoaXMuY291bnROZXdTZXNzaW9uKHNlc3Npb24pO1xuICB9IGVsc2UgaWYoWydzdWInLCAnbWV0aG9kJ10uaW5kZXhPZihtc2cubXNnKSAhPSAtMSkge1xuICAgIGlmKCF0aGlzLmlzU2Vzc2lvbkFjdGl2ZShzZXNzaW9uKSkge1xuICAgICAgdGhpcy5jb3VudE5ld1Nlc3Npb24oc2Vzc2lvbik7XG4gICAgfVxuICB9XG4gIHNlc3Npb24uX2FjdGl2ZUF0ID0gRGF0ZS5ub3coKTtcbn1cblxuU3lzdGVtTW9kZWwucHJvdG90eXBlLmNvdW50TmV3U2Vzc2lvbiA9IGZ1bmN0aW9uKHNlc3Npb24pIHtcbiAgaWYoIWlzTG9jYWxBZGRyZXNzKHNlc3Npb24uc29ja2V0KSkge1xuICAgIHRoaXMubmV3U2Vzc2lvbnMrKztcbiAgfVxufVxuXG5TeXN0ZW1Nb2RlbC5wcm90b3R5cGUuaXNTZXNzaW9uQWN0aXZlID0gZnVuY3Rpb24oc2Vzc2lvbikge1xuICB2YXIgaW5hY3RpdmVUaW1lID0gRGF0ZS5ub3coKSAtIHNlc3Npb24uX2FjdGl2ZUF0O1xuICByZXR1cm4gaW5hY3RpdmVUaW1lIDwgdGhpcy5zZXNzaW9uVGltZW91dDtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAvL1xuXG4vLyBodHRwOi8vcmVnZXgxMDEuY29tL3IvaUYzeVIzLzJcbnZhciBpc0xvY2FsSG9zdFJlZ2V4ID0gL14oPzouKlxcLmxvY2FsfGxvY2FsaG9zdCkoPzpcXDpcXGQrKT98MTI3KD86XFwuXFxkezEsM30pezN9fDE5MlxcLjE2OCg/OlxcLlxcZHsxLDN9KXsyfXwxMCg/OlxcLlxcZHsxLDN9KXszfXwxNzJcXC4oPzoxWzYtOV18MlxcZHwzWzAtMV0pKD86XFwuXFxkezEsM30pezJ9JC87XG5cbi8vIGh0dHA6Ly9yZWdleDEwMS5jb20vci9oTTVnRDgvMVxudmFyIGlzTG9jYWxBZGRyZXNzUmVnZXggPSAvXjEyNyg/OlxcLlxcZHsxLDN9KXszfXwxOTJcXC4xNjgoPzpcXC5cXGR7MSwzfSl7Mn18MTAoPzpcXC5cXGR7MSwzfSl7M318MTcyXFwuKD86MVs2LTldfDJcXGR8M1swLTFdKSg/OlxcLlxcZHsxLDN9KXsyfSQvO1xuXG5mdW5jdGlvbiBpc0xvY2FsQWRkcmVzcyAoc29ja2V0KSB7XG4gIHZhciBob3N0ID0gc29ja2V0LmhlYWRlcnNbJ2hvc3QnXTtcbiAgaWYoaG9zdCkgcmV0dXJuIGlzTG9jYWxIb3N0UmVnZXgudGVzdChob3N0KTtcbiAgdmFyIGFkZHJlc3MgPSBzb2NrZXQuaGVhZGVyc1sneC1mb3J3YXJkZWQtZm9yJ10gfHwgc29ja2V0LnJlbW90ZUFkZHJlc3M7XG4gIGlmKGFkZHJlc3MpIHJldHVybiBpc0xvY2FsQWRkcmVzc1JlZ2V4LnRlc3QoYWRkcmVzcyk7XG59XG4iLCJFcnJvck1vZGVsID0gZnVuY3Rpb24gKGFwcElkKSB7XG4gIEJhc2VFcnJvck1vZGVsLmNhbGwodGhpcyk7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5hcHBJZCA9IGFwcElkO1xuICB0aGlzLmVycm9ycyA9IHt9O1xuICB0aGlzLnN0YXJ0VGltZSA9IERhdGUubm93KCk7XG4gIHRoaXMubWF4RXJyb3JzID0gMTA7XG59XG5cbk9iamVjdC5hc3NpZ24oRXJyb3JNb2RlbC5wcm90b3R5cGUsIEthZGlyYU1vZGVsLnByb3RvdHlwZSk7XG5PYmplY3QuYXNzaWduKEVycm9yTW9kZWwucHJvdG90eXBlLCBCYXNlRXJyb3JNb2RlbC5wcm90b3R5cGUpO1xuXG5FcnJvck1vZGVsLnByb3RvdHlwZS5idWlsZFBheWxvYWQgPSBmdW5jdGlvbigpIHtcbiAgdmFyIG1ldHJpY3MgPSBfLnZhbHVlcyh0aGlzLmVycm9ycyk7XG4gIHRoaXMuc3RhcnRUaW1lID0gTnRwLl9ub3coKTtcblxuICBfLmVhY2gobWV0cmljcywgZnVuY3Rpb24gKG1ldHJpYykge1xuICAgIG1ldHJpYy5zdGFydFRpbWUgPSBLYWRpcmEuc3luY2VkRGF0ZS5zeW5jVGltZShtZXRyaWMuc3RhcnRUaW1lKVxuICB9KTtcblxuICB0aGlzLmVycm9ycyA9IHt9O1xuICByZXR1cm4ge2Vycm9yczogbWV0cmljc307XG59O1xuXG5FcnJvck1vZGVsLnByb3RvdHlwZS5lcnJvckNvdW50ID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gXy52YWx1ZXModGhpcy5lcnJvcnMpLmxlbmd0aDtcbn07XG5cbkVycm9yTW9kZWwucHJvdG90eXBlLnRyYWNrRXJyb3IgPSBmdW5jdGlvbihleCwgdHJhY2UpIHtcbiAgdmFyIGtleSA9IHRyYWNlLnR5cGUgKyAnOicgKyBleC5tZXNzYWdlO1xuICBpZih0aGlzLmVycm9yc1trZXldKSB7XG4gICAgdGhpcy5lcnJvcnNba2V5XS5jb3VudCsrO1xuICB9IGVsc2UgaWYgKHRoaXMuZXJyb3JDb3VudCgpIDwgdGhpcy5tYXhFcnJvcnMpIHtcbiAgICB2YXIgZXJyb3JEZWYgPSB0aGlzLl9mb3JtYXRFcnJvcihleCwgdHJhY2UpO1xuICAgIGlmKHRoaXMuYXBwbHlGaWx0ZXJzKGVycm9yRGVmLnR5cGUsIGVycm9yRGVmLm5hbWUsIGV4LCBlcnJvckRlZi5zdWJUeXBlKSkge1xuICAgICAgdGhpcy5lcnJvcnNba2V5XSA9IHRoaXMuX2Zvcm1hdEVycm9yKGV4LCB0cmFjZSk7XG4gICAgfVxuICB9XG59O1xuXG5FcnJvck1vZGVsLnByb3RvdHlwZS5fZm9ybWF0RXJyb3IgPSBmdW5jdGlvbihleCwgdHJhY2UpIHtcbiAgdmFyIHRpbWUgPSBEYXRlLm5vdygpO1xuICB2YXIgc3RhY2sgPSBleC5zdGFjaztcblxuICAvLyB0byBnZXQgTWV0ZW9yJ3MgRXJyb3IgZGV0YWlsc1xuICBpZihleC5kZXRhaWxzKSB7XG4gICAgc3RhY2sgPSBcIkRldGFpbHM6IFwiICsgZXguZGV0YWlscyArIFwiXFxyXFxuXCIgKyBzdGFjaztcbiAgfVxuXG4gIC8vIFVwZGF0ZSB0cmFjZSdzIGVycm9yIGV2ZW50IHdpdGggdGhlIG5leHQgc3RhY2tcbiAgdmFyIGVycm9yRXZlbnQgPSB0cmFjZS5ldmVudHMgJiYgdHJhY2UuZXZlbnRzW3RyYWNlLmV2ZW50cy5sZW5ndGggLTFdO1xuICB2YXIgZXJyb3JPYmplY3QgPSBlcnJvckV2ZW50ICYmIGVycm9yRXZlbnRbMl0gJiYgZXJyb3JFdmVudFsyXS5lcnJvcjtcblxuICBpZihlcnJvck9iamVjdCkge1xuICAgIGVycm9yT2JqZWN0LnN0YWNrID0gc3RhY2s7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGFwcElkOiB0aGlzLmFwcElkLFxuICAgIG5hbWU6IGV4Lm1lc3NhZ2UsXG4gICAgdHlwZTogdHJhY2UudHlwZSxcbiAgICBzdGFydFRpbWU6IHRpbWUsXG4gICAgc3ViVHlwZTogdHJhY2Uuc3ViVHlwZSB8fCB0cmFjZS5uYW1lLFxuICAgIHRyYWNlOiB0cmFjZSxcbiAgICBzdGFja3M6IFt7c3RhY2s6IHN0YWNrfV0sXG4gICAgY291bnQ6IDEsXG4gIH1cbn07XG4iLCJ2YXIgSm9icyA9IEthZGlyYS5Kb2JzID0ge307XG5cbkpvYnMuZ2V0QXN5bmMgPSBmdW5jdGlvbihpZCwgY2FsbGJhY2spIHtcbiAgS2FkaXJhLmNvcmVBcGkuZ2V0Sm9iKGlkKVxuICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgIGNhbGxiYWNrKG51bGwsIGRhdGEpO1xuICAgIH0pXG4gICAgLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgY2FsbGJhY2soZXJyKVxuICAgIH0pO1xufTtcblxuXG5Kb2JzLnNldEFzeW5jID0gZnVuY3Rpb24oaWQsIGNoYW5nZXMsIGNhbGxiYWNrKSB7XG4gIEthZGlyYS5jb3JlQXBpLnVwZGF0ZUpvYihpZCwgY2hhbmdlcylcbiAgICAudGhlbihmdW5jdGlvbihkYXRhKSB7XG4gICAgICBjYWxsYmFjayhudWxsLCBkYXRhKTtcbiAgICB9KVxuICAgIC5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgIGNhbGxiYWNrKGVycilcbiAgICB9KTtcbn07XG5cbkpvYnMuc2V0ID0gS2FkaXJhLl93cmFwQXN5bmMoSm9icy5zZXRBc3luYyk7XG5Kb2JzLmdldCA9IEthZGlyYS5fd3JhcEFzeW5jKEpvYnMuZ2V0QXN5bmMpO1xuIiwiLy8gUmV0cnkgbG9naWMgd2l0aCBhbiBleHBvbmVudGlhbCBiYWNrb2ZmLlxuLy9cbi8vIG9wdGlvbnM6XG4vLyAgYmFzZVRpbWVvdXQ6IHRpbWUgZm9yIGluaXRpYWwgcmVjb25uZWN0IGF0dGVtcHQgKG1zKS5cbi8vICBleHBvbmVudDogZXhwb25lbnRpYWwgZmFjdG9yIHRvIGluY3JlYXNlIHRpbWVvdXQgZWFjaCBhdHRlbXB0LlxuLy8gIG1heFRpbWVvdXQ6IG1heGltdW0gdGltZSBiZXR3ZWVuIHJldHJpZXMgKG1zKS5cbi8vICBtaW5Db3VudDogaG93IG1hbnkgdGltZXMgdG8gcmVjb25uZWN0IFwiaW5zdGFudGx5XCIuXG4vLyAgbWluVGltZW91dDogdGltZSB0byB3YWl0IGZvciB0aGUgZmlyc3QgYG1pbkNvdW50YCByZXRyaWVzIChtcykuXG4vLyAgZnV6ejogZmFjdG9yIHRvIHJhbmRvbWl6ZSByZXRyeSB0aW1lcyBieSAodG8gYXZvaWQgcmV0cnkgc3Rvcm1zKS5cblxuLy9UT0RPOiByZW1vdmUgdGhpcyBjbGFzcyBhbmQgdXNlIE1ldGVvciBSZXRyeSBpbiBhIGxhdGVyIHZlcnNpb24gb2YgbWV0ZW9yLlxuXG5SZXRyeSA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgT2JqZWN0LmFzc2lnbihzZWxmLCBfLmRlZmF1bHRzKF8uY2xvbmUob3B0aW9ucyB8fCB7fSksIHtcbiAgICBiYXNlVGltZW91dDogMTAwMCwgLy8gMSBzZWNvbmRcbiAgICBleHBvbmVudDogMi4yLFxuICAgIC8vIFRoZSBkZWZhdWx0IGlzIGhpZ2gtaXNoIHRvIGVuc3VyZSBhIHNlcnZlciBjYW4gcmVjb3ZlciBmcm9tIGFcbiAgICAvLyBmYWlsdXJlIGNhdXNlZCBieSBsb2FkLlxuICAgIG1heFRpbWVvdXQ6IDUgKiA2MDAwMCwgLy8gNSBtaW51dGVzXG4gICAgbWluVGltZW91dDogMTAsXG4gICAgbWluQ291bnQ6IDIsXG4gICAgZnV6ejogMC41IC8vICstIDI1JVxuICB9KSk7XG4gIHNlbGYucmV0cnlUaW1lciA9IG51bGw7XG59O1xuXG5PYmplY3QuYXNzaWduKFJldHJ5LnByb3RvdHlwZSwge1xuXG4gIC8vIFJlc2V0IGEgcGVuZGluZyByZXRyeSwgaWYgYW55LlxuICBjbGVhcjogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZihzZWxmLnJldHJ5VGltZXIpXG4gICAgICBjbGVhclRpbWVvdXQoc2VsZi5yZXRyeVRpbWVyKTtcbiAgICBzZWxmLnJldHJ5VGltZXIgPSBudWxsO1xuICB9LFxuXG4gIC8vIENhbGN1bGF0ZSBob3cgbG9uZyB0byB3YWl0IGluIG1pbGxpc2Vjb25kcyB0byByZXRyeSwgYmFzZWQgb24gdGhlXG4gIC8vIGBjb3VudGAgb2Ygd2hpY2ggcmV0cnkgdGhpcyBpcy5cbiAgX3RpbWVvdXQ6IGZ1bmN0aW9uIChjb3VudCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIGlmKGNvdW50IDwgc2VsZi5taW5Db3VudClcbiAgICAgIHJldHVybiBzZWxmLm1pblRpbWVvdXQ7XG5cbiAgICB2YXIgdGltZW91dCA9IE1hdGgubWluKFxuICAgICAgc2VsZi5tYXhUaW1lb3V0LFxuICAgICAgc2VsZi5iYXNlVGltZW91dCAqIE1hdGgucG93KHNlbGYuZXhwb25lbnQsIGNvdW50KSk7XG4gICAgLy8gZnV6eiB0aGUgdGltZW91dCByYW5kb21seSwgdG8gYXZvaWQgcmVjb25uZWN0IHN0b3JtcyB3aGVuIGFcbiAgICAvLyBzZXJ2ZXIgZ29lcyBkb3duLlxuICAgIHRpbWVvdXQgPSB0aW1lb3V0ICogKChSYW5kb20uZnJhY3Rpb24oKSAqIHNlbGYuZnV6eikgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICgxIC0gc2VsZi5mdXp6LzIpKTtcbiAgICByZXR1cm4gTWF0aC5jZWlsKHRpbWVvdXQpO1xuICB9LFxuXG4gIC8vIENhbGwgYGZuYCBhZnRlciBhIGRlbGF5LCBiYXNlZCBvbiB0aGUgYGNvdW50YCBvZiB3aGljaCByZXRyeSB0aGlzIGlzLlxuICByZXRyeUxhdGVyOiBmdW5jdGlvbiAoY291bnQsIGZuKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciB0aW1lb3V0ID0gc2VsZi5fdGltZW91dChjb3VudCk7XG4gICAgaWYoc2VsZi5yZXRyeVRpbWVyKVxuICAgICAgY2xlYXJUaW1lb3V0KHNlbGYucmV0cnlUaW1lcik7XG5cbiAgICBzZWxmLnJldHJ5VGltZXIgPSBzZXRUaW1lb3V0KGZuLCB0aW1lb3V0KTtcbiAgICByZXR1cm4gdGltZW91dDtcbiAgfVxuXG59KTtcbiIsInZhciBGaWJlciA9IE5wbS5yZXF1aXJlKCdmaWJlcnMnKTtcblxuZXhwb3J0IGZ1bmN0aW9uIHNpemUoY29sbGVjdGlvbikge1xuICBpZiAoY29sbGVjdGlvbiBpbnN0YW5jZW9mIE1hcCB8fFxuICAgICAgY29sbGVjdGlvbiBpbnN0YW5jZW9mIFNldCkge1xuICAgIHJldHVybiBjb2xsZWN0aW9uLnNpemU7XG4gIH1cbiAgcmV0dXJuIF8uc2l6ZShjb2xsZWN0aW9uKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGVhY2goY29sbGVjdGlvbiwgY2FsbGJhY2spIHtcbiAgaWYgKGNvbGxlY3Rpb24gaW5zdGFuY2VvZiBNYXAgfHxcbiAgICAgIGNvbGxlY3Rpb24gaW5zdGFuY2VvZiBTZXQpIHtcbiAgICBjb2xsZWN0aW9uLmZvckVhY2goY2FsbGJhY2spO1xuICB9IGVsc2Uge1xuICAgIF8uZWFjaChjb2xsZWN0aW9uLCBjYWxsYmFjayk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldChjb2xsZWN0aW9uLCBrZXkpIHtcbiAgaWYgKGNvbGxlY3Rpb24gaW5zdGFuY2VvZiBNYXApIHtcbiAgICByZXR1cm4gY29sbGVjdGlvbi5nZXQoa2V5KTtcbiAgfVxuICByZXR1cm4gY29sbGVjdGlvbltrZXldO1xufVxuXG5IYXZlQXN5bmNDYWxsYmFjayA9IGZ1bmN0aW9uKGFyZ3MpIHtcbiAgdmFyIGxhc3RBcmcgPSBhcmdzW2FyZ3MubGVuZ3RoIC0xXTtcbiAgcmV0dXJuICh0eXBlb2YgbGFzdEFyZykgPT0gJ2Z1bmN0aW9uJztcbn07XG5cblVuaXF1ZUlkID0gZnVuY3Rpb24oc3RhcnQpIHtcbiAgdGhpcy5pZCA9IDA7XG59XG5cblVuaXF1ZUlkLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIFwiXCIgKyB0aGlzLmlkKys7XG59O1xuXG5EZWZhdWx0VW5pcXVlSWQgPSBuZXcgVW5pcXVlSWQoKTtcblxuLy8gT3B0aW1pemVkIHZlcnNpb24gb2YgYXBwbHkgd2hpY2ggdHJpZXMgdG8gY2FsbCBhcyBwb3NzaWJsZSBhcyBpdCBjYW5cbi8vIFRoZW4gZmFsbCBiYWNrIHRvIGFwcGx5XG4vLyBUaGlzIGlzIGJlY2F1c2UsIHY4IGlzIHZlcnkgc2xvdyB0byBpbnZva2UgYXBwbHkuXG5PcHRpbWl6ZWRBcHBseSA9IGZ1bmN0aW9uIE9wdGltaXplZEFwcGx5KGNvbnRleHQsIGZuLCBhcmdzKSB7XG4gIHZhciBhID0gYXJncztcbiAgc3dpdGNoKGEubGVuZ3RoKSB7XG4gICAgY2FzZSAwOlxuICAgICAgcmV0dXJuIGZuLmNhbGwoY29udGV4dCk7XG4gICAgY2FzZSAxOlxuICAgICAgcmV0dXJuIGZuLmNhbGwoY29udGV4dCwgYVswXSk7XG4gICAgY2FzZSAyOlxuICAgICAgcmV0dXJuIGZuLmNhbGwoY29udGV4dCwgYVswXSwgYVsxXSk7XG4gICAgY2FzZSAzOlxuICAgICAgcmV0dXJuIGZuLmNhbGwoY29udGV4dCwgYVswXSwgYVsxXSwgYVsyXSk7XG4gICAgY2FzZSA0OlxuICAgICAgcmV0dXJuIGZuLmNhbGwoY29udGV4dCwgYVswXSwgYVsxXSwgYVsyXSwgYVszXSk7XG4gICAgY2FzZSA1OlxuICAgICAgcmV0dXJuIGZuLmNhbGwoY29udGV4dCwgYVswXSwgYVsxXSwgYVsyXSwgYVszXSwgYVs0XSk7XG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBmbi5hcHBseShjb250ZXh0LCBhKTtcbiAgfVxufVxuIiwidmFyIGxvZ2dlciA9IGdldExvZ2dlcigpO1xuXG5OdHAgPSBmdW5jdGlvbiAoZW5kcG9pbnQpIHtcbiAgdGhpcy5zZXRFbmRwb2ludChlbmRwb2ludCk7XG4gIHRoaXMuZGlmZiA9IDA7XG4gIHRoaXMuc3luY2VkID0gZmFsc2U7XG4gIHRoaXMucmVTeW5jQ291bnQgPSAwO1xuICB0aGlzLnJlU3luYyA9IG5ldyBSZXRyeSh7XG4gICAgYmFzZVRpbWVvdXQ6IDEwMDAqNjAsXG4gICAgbWF4VGltZW91dDogMTAwMCo2MCoxMCxcbiAgICBtaW5Db3VudDogMFxuICB9KTtcbn1cblxuTnRwLl9ub3cgPSBmdW5jdGlvbigpIHtcbiAgdmFyIG5vdyA9IERhdGUubm93KCk7XG4gIGlmKHR5cGVvZiBub3cgPT0gJ251bWJlcicpIHtcbiAgICByZXR1cm4gbm93O1xuICB9IGVsc2UgaWYobm93IGluc3RhbmNlb2YgRGF0ZSkge1xuICAgIC8vIHNvbWUgZXh0ZW5hbCBKUyBsaWJyYXJpZXMgb3ZlcnJpZGUgRGF0ZS5ub3cgYW5kIHJldHVybnMgYSBEYXRlIG9iamVjdFxuICAgIC8vIHdoaWNoIGRpcmVjdGx5IGFmZmVjdCB1cy4gU28gd2UgbmVlZCB0byBwcmVwYXJlIGZvciB0aGF0XG4gICAgcmV0dXJuIG5vdy5nZXRUaW1lKCk7XG4gIH0gZWxzZSB7XG4gICAgLy8gdHJ1c3QgbWUuIEkndmUgc2VlbiBub3cgPT09IHVuZGVmaW5lZFxuICAgIHJldHVybiAobmV3IERhdGUoKSkuZ2V0VGltZSgpO1xuICB9XG59O1xuXG5OdHAucHJvdG90eXBlLnNldEVuZHBvaW50ID0gZnVuY3Rpb24oZW5kcG9pbnQpIHtcbiAgdGhpcy5lbmRwb2ludCA9IGVuZHBvaW50ICsgJy9zaW1wbGVudHAvc3luYyc7XG59O1xuXG5OdHAucHJvdG90eXBlLmdldFRpbWUgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIE50cC5fbm93KCkgKyBNYXRoLnJvdW5kKHRoaXMuZGlmZik7XG59O1xuXG5OdHAucHJvdG90eXBlLnN5bmNUaW1lID0gZnVuY3Rpb24obG9jYWxUaW1lKSB7XG4gIHJldHVybiBsb2NhbFRpbWUgKyBNYXRoLmNlaWwodGhpcy5kaWZmKTtcbn07XG5cbk50cC5wcm90b3R5cGUuc3luYyA9IGZ1bmN0aW9uKCkge1xuICBsb2dnZXIoJ2luaXQgc3luYycpO1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciByZXRyeUNvdW50ID0gMDtcbiAgdmFyIHJldHJ5ID0gbmV3IFJldHJ5KHtcbiAgICBiYXNlVGltZW91dDogMTAwMCoyMCxcbiAgICBtYXhUaW1lb3V0OiAxMDAwKjYwLFxuICAgIG1pbkNvdW50OiAxLFxuICAgIG1pblRpbWVvdXQ6IDBcbiAgfSk7XG4gIHN5bmNUaW1lKCk7XG5cbiAgZnVuY3Rpb24gc3luY1RpbWUgKCkge1xuICAgIGlmKHJldHJ5Q291bnQ8NSkge1xuICAgICAgbG9nZ2VyKCdhdHRlbXB0IHRpbWUgc3luYyB3aXRoIHNlcnZlcicsIHJldHJ5Q291bnQpO1xuICAgICAgLy8gaWYgd2Ugc2VuZCAwIHRvIHRoZSByZXRyeUxhdGVyLCBjYWNoZURucyB3aWxsIHJ1biBpbW1lZGlhdGVseVxuICAgICAgcmV0cnkucmV0cnlMYXRlcihyZXRyeUNvdW50KyssIGNhY2hlRG5zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbG9nZ2VyKCdtYXhpbXVtIHJldHJpZXMgcmVhY2hlZCcpO1xuICAgICAgc2VsZi5yZVN5bmMucmV0cnlMYXRlcihzZWxmLnJlU3luY0NvdW50KyssIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICAgIHNlbGYuc3luYy5hcHBseShzZWxmLCBhcmdzKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8vIGZpcnN0IGF0dGVtcHQgaXMgdG8gY2FjaGUgZG5zLiBTbywgY2FsY3VsYXRpb24gZG9lcyBub3RcbiAgLy8gaW5jbHVkZSBETlMgcmVzb2x1dGlvbiB0aW1lXG4gIGZ1bmN0aW9uIGNhY2hlRG5zICgpIHtcbiAgICBzZWxmLmdldFNlcnZlclRpbWUoZnVuY3Rpb24oZXJyKSB7XG4gICAgICBpZighZXJyKSB7XG4gICAgICAgIGNhbGN1bGF0ZVRpbWVEaWZmKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzeW5jVGltZSgpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY2FsY3VsYXRlVGltZURpZmYgKCkge1xuICAgIHZhciBjbGllbnRTdGFydFRpbWUgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpO1xuICAgIHNlbGYuZ2V0U2VydmVyVGltZShmdW5jdGlvbihlcnIsIHNlcnZlclRpbWUpIHtcbiAgICAgIGlmKCFlcnIgJiYgc2VydmVyVGltZSkge1xuICAgICAgICAvLyAoRGF0ZS5ub3coKSArIGNsaWVudFN0YXJ0VGltZSkvMiA6IE1pZHBvaW50IGJldHdlZW4gcmVxIGFuZCByZXNcbiAgICAgICAgdmFyIG5ldHdvcmtUaW1lID0gKChuZXcgRGF0ZSgpKS5nZXRUaW1lKCkgLSBjbGllbnRTdGFydFRpbWUpLzJcbiAgICAgICAgdmFyIHNlcnZlclN0YXJ0VGltZSA9IHNlcnZlclRpbWUgLSBuZXR3b3JrVGltZTtcbiAgICAgICAgc2VsZi5kaWZmID0gc2VydmVyU3RhcnRUaW1lIC0gY2xpZW50U3RhcnRUaW1lO1xuICAgICAgICBzZWxmLnN5bmNlZCA9IHRydWU7XG4gICAgICAgIC8vIHdlIG5lZWQgdG8gc2VuZCAxIGludG8gcmV0cnlMYXRlci5cbiAgICAgICAgc2VsZi5yZVN5bmMucmV0cnlMYXRlcihzZWxmLnJlU3luY0NvdW50KyssIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICAgICAgICBzZWxmLnN5bmMuYXBwbHkoc2VsZiwgYXJncyk7XG4gICAgICAgIH0pO1xuICAgICAgICBsb2dnZXIoJ3N1Y2Nlc3NmdWxseSB1cGRhdGVkIGRpZmYgdmFsdWUnLCBzZWxmLmRpZmYpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3luY1RpbWUoKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG5OdHAucHJvdG90eXBlLmdldFNlcnZlclRpbWUgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgaWYoTWV0ZW9yLmlzU2VydmVyKSB7XG4gICAgdmFyIEZpYmVyID0gTnBtLnJlcXVpcmUoJ2ZpYmVycycpO1xuICAgIG5ldyBGaWJlcihmdW5jdGlvbigpIHtcbiAgICAgIEhUVFAuZ2V0KHNlbGYuZW5kcG9pbnQsIGZ1bmN0aW9uIChlcnIsIHJlcykge1xuICAgICAgICBpZihlcnIpIHtcbiAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhciBzZXJ2ZXJUaW1lID0gcGFyc2VJbnQocmVzLmNvbnRlbnQpO1xuICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHNlcnZlclRpbWUpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KS5ydW4oKTtcbiAgfSBlbHNlIHtcbiAgICBodHRwUmVxdWVzdCgnR0VUJywgc2VsZi5lbmRwb2ludCwgZnVuY3Rpb24oZXJyLCByZXMpIHtcbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBzZXJ2ZXJUaW1lID0gcGFyc2VJbnQocmVzLmNvbnRlbnQpO1xuICAgICAgICBjYWxsYmFjayhudWxsLCBzZXJ2ZXJUaW1lKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufTtcblxuZnVuY3Rpb24gZ2V0TG9nZ2VyKCkge1xuICBpZihNZXRlb3IuaXNTZXJ2ZXIpIHtcbiAgICByZXR1cm4gTnBtLnJlcXVpcmUoJ2RlYnVnJykoXCJrYWRpcmE6bnRwXCIpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmdW5jdGlvbihtZXNzYWdlKSB7XG4gICAgICB2YXIgY2FuTG9nS2FkaXJhID1cbiAgICAgICAgTWV0ZW9yLl9sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnTE9HX0tBRElSQScpICE9PSBudWxsXG4gICAgICAgICYmIHR5cGVvZiBjb25zb2xlICE9PSAndW5kZWZpbmVkJztcblxuICAgICAgaWYoY2FuTG9nS2FkaXJhKSB7XG4gICAgICAgIGlmKG1lc3NhZ2UpIHtcbiAgICAgICAgICBtZXNzYWdlID0gXCJrYWRpcmE6bnRwIFwiICsgbWVzc2FnZTtcbiAgICAgICAgICBhcmd1bWVudHNbMF0gPSBtZXNzYWdlO1xuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nLmFwcGx5KGNvbnNvbGUsIGFyZ3VtZW50cyk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG4iLCJ2YXIgV0FJVE9OX01FU1NBR0VfRklFTERTID0gWydtc2cnLCAnaWQnLCAnbWV0aG9kJywgJ25hbWUnLCAnd2FpdFRpbWUnXTtcblxuLy8gVGhpcyBpcyB3YXkgaG93IHdlIGNhbiBidWlsZCB3YWl0VGltZSBhbmQgaXQncyBicmVha2Rvd25cbldhaXRUaW1lQnVpbGRlciA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLl93YWl0TGlzdFN0b3JlID0ge307XG4gIHRoaXMuX2N1cnJlbnRQcm9jZXNzaW5nTWVzc2FnZXMgPSB7fTtcbiAgdGhpcy5fbWVzc2FnZUNhY2hlID0ge307XG59O1xuXG5XYWl0VGltZUJ1aWxkZXIucHJvdG90eXBlLnJlZ2lzdGVyID0gZnVuY3Rpb24oc2Vzc2lvbiwgbXNnSWQpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgbWFpbktleSA9IHNlbGYuX2dldE1lc3NhZ2VLZXkoc2Vzc2lvbi5pZCwgbXNnSWQpO1xuXG4gIHZhciBpblF1ZXVlID0gc2Vzc2lvbi5pblF1ZXVlIHx8IFtdO1xuICBpZih0eXBlb2YgaW5RdWV1ZS50b0FycmF5ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgLy8gbGF0ZXN0IHZlcnNpb24gb2YgTWV0ZW9yIHVzZXMgYSBkb3VibGUtZW5kZWQtcXVldWUgZm9yIHRoZSBpblF1ZXVlXG4gICAgLy8gaW5mbzogaHR0cHM6Ly93d3cubnBtanMuY29tL3BhY2thZ2UvZG91YmxlLWVuZGVkLXF1ZXVlXG4gICAgaW5RdWV1ZSA9IGluUXVldWUudG9BcnJheSgpO1xuICB9XG5cbiAgdmFyIHdhaXRMaXN0ID0gaW5RdWV1ZS5tYXAoZnVuY3Rpb24obXNnKSB7XG4gICAgdmFyIGtleSA9IHNlbGYuX2dldE1lc3NhZ2VLZXkoc2Vzc2lvbi5pZCwgbXNnLmlkKTtcbiAgICByZXR1cm4gc2VsZi5fZ2V0Q2FjaGVNZXNzYWdlKGtleSwgbXNnKTtcbiAgfSk7XG5cbiAgd2FpdExpc3QgPSB3YWl0TGlzdCB8fCBbXTtcblxuICAvL2FkZCBjdXJyZW50bHkgcHJvY2Vzc2luZyBkZHAgbWVzc2FnZSBpZiBleGlzdHNcbiAgdmFyIGN1cnJlbnRseVByb2Nlc3NpbmdNZXNzYWdlID0gdGhpcy5fY3VycmVudFByb2Nlc3NpbmdNZXNzYWdlc1tzZXNzaW9uLmlkXTtcbiAgaWYoY3VycmVudGx5UHJvY2Vzc2luZ01lc3NhZ2UpIHtcbiAgICB2YXIga2V5ID0gc2VsZi5fZ2V0TWVzc2FnZUtleShzZXNzaW9uLmlkLCBjdXJyZW50bHlQcm9jZXNzaW5nTWVzc2FnZS5pZCk7XG4gICAgd2FpdExpc3QudW5zaGlmdCh0aGlzLl9nZXRDYWNoZU1lc3NhZ2Uoa2V5LCBjdXJyZW50bHlQcm9jZXNzaW5nTWVzc2FnZSkpO1xuICB9XG5cbiAgdGhpcy5fd2FpdExpc3RTdG9yZVttYWluS2V5XSA9IHdhaXRMaXN0O1xufTtcblxuV2FpdFRpbWVCdWlsZGVyLnByb3RvdHlwZS5idWlsZCA9IGZ1bmN0aW9uKHNlc3Npb24sIG1zZ0lkKSB7XG4gIHZhciBtYWluS2V5ID0gdGhpcy5fZ2V0TWVzc2FnZUtleShzZXNzaW9uLmlkLCBtc2dJZCk7XG4gIHZhciB3YWl0TGlzdCA9IHRoaXMuX3dhaXRMaXN0U3RvcmVbbWFpbktleV0gfHwgW107XG4gIGRlbGV0ZSB0aGlzLl93YWl0TGlzdFN0b3JlW21haW5LZXldO1xuXG4gIHZhciBmaWx0ZXJlZFdhaXRMaXN0ID0gIHdhaXRMaXN0Lm1hcCh0aGlzLl9jbGVhbkNhY2hlTWVzc2FnZS5iaW5kKHRoaXMpKTtcbiAgcmV0dXJuIGZpbHRlcmVkV2FpdExpc3Q7XG59O1xuXG5XYWl0VGltZUJ1aWxkZXIucHJvdG90eXBlLl9nZXRNZXNzYWdlS2V5ID0gZnVuY3Rpb24oc2Vzc2lvbklkLCBtc2dJZCkge1xuICByZXR1cm4gc2Vzc2lvbklkICsgXCI6OlwiICsgbXNnSWQ7XG59O1xuXG5XYWl0VGltZUJ1aWxkZXIucHJvdG90eXBlLl9nZXRDYWNoZU1lc3NhZ2UgPSBmdW5jdGlvbihrZXksIG1zZykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBjYWNoZWRNZXNzYWdlID0gc2VsZi5fbWVzc2FnZUNhY2hlW2tleV07XG4gIGlmKCFjYWNoZWRNZXNzYWdlKSB7XG4gICAgc2VsZi5fbWVzc2FnZUNhY2hlW2tleV0gPSBjYWNoZWRNZXNzYWdlID0gXy5waWNrKG1zZywgV0FJVE9OX01FU1NBR0VfRklFTERTKTtcbiAgICBjYWNoZWRNZXNzYWdlLl9rZXkgPSBrZXk7XG4gICAgY2FjaGVkTWVzc2FnZS5fcmVnaXN0ZXJlZCA9IDE7XG4gIH0gZWxzZSB7XG4gICAgY2FjaGVkTWVzc2FnZS5fcmVnaXN0ZXJlZCsrO1xuICB9XG5cbiAgcmV0dXJuIGNhY2hlZE1lc3NhZ2U7XG59O1xuXG5XYWl0VGltZUJ1aWxkZXIucHJvdG90eXBlLl9jbGVhbkNhY2hlTWVzc2FnZSA9IGZ1bmN0aW9uKG1zZykge1xuICBtc2cuX3JlZ2lzdGVyZWQtLTtcbiAgaWYobXNnLl9yZWdpc3RlcmVkID09IDApIHtcbiAgICBkZWxldGUgdGhpcy5fbWVzc2FnZUNhY2hlW21zZy5fa2V5XTtcbiAgfVxuXG4gIC8vIG5lZWQgdG8gc2VuZCBhIGNsZWFuIHNldCBvZiBvYmplY3RzXG4gIC8vIG90aGVyd2lzZSByZWdpc3RlciBjYW4gZ28gd2l0aCB0aGlzXG4gIHJldHVybiBfLnBpY2sobXNnLCBXQUlUT05fTUVTU0FHRV9GSUVMRFMpO1xufTtcblxuV2FpdFRpbWVCdWlsZGVyLnByb3RvdHlwZS50cmFja1dhaXRUaW1lID0gZnVuY3Rpb24oc2Vzc2lvbiwgbXNnLCB1bmJsb2NrKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIHN0YXJ0ZWQgPSBEYXRlLm5vdygpO1xuICBzZWxmLl9jdXJyZW50UHJvY2Vzc2luZ01lc3NhZ2VzW3Nlc3Npb24uaWRdID0gbXNnO1xuXG4gIHZhciB1bmJsb2NrZWQgPSBmYWxzZTtcbiAgdmFyIHdyYXBwZWRVbmJsb2NrID0gZnVuY3Rpb24oKSB7XG4gICAgaWYoIXVuYmxvY2tlZCkge1xuICAgICAgdmFyIHdhaXRUaW1lID0gRGF0ZS5ub3coKSAtIHN0YXJ0ZWQ7XG4gICAgICB2YXIga2V5ID0gc2VsZi5fZ2V0TWVzc2FnZUtleShzZXNzaW9uLmlkLCBtc2cuaWQpO1xuICAgICAgdmFyIGNhY2hlZE1lc3NhZ2UgPSBzZWxmLl9tZXNzYWdlQ2FjaGVba2V5XTtcbiAgICAgIGlmKGNhY2hlZE1lc3NhZ2UpIHtcbiAgICAgICAgY2FjaGVkTWVzc2FnZS53YWl0VGltZSA9IHdhaXRUaW1lO1xuICAgICAgfVxuICAgICAgZGVsZXRlIHNlbGYuX2N1cnJlbnRQcm9jZXNzaW5nTWVzc2FnZXNbc2Vzc2lvbi5pZF07XG4gICAgICB1bmJsb2NrZWQgPSB0cnVlO1xuICAgICAgdW5ibG9jaygpO1xuICAgIH1cbiAgfTtcblxuICByZXR1cm4gd3JhcHBlZFVuYmxvY2s7XG59OyIsIi8vIGV4cG9zZSBmb3IgdGVzdGluZyBwdXJwb3NlXG5PcGxvZ0NoZWNrID0ge307XG5cbk9wbG9nQ2hlY2suXzA3MCA9IGZ1bmN0aW9uKGN1cnNvckRlc2NyaXB0aW9uKSB7XG4gIHZhciBvcHRpb25zID0gY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucztcbiAgaWYgKG9wdGlvbnMubGltaXQpIHtcbiAgICByZXR1cm4ge1xuICAgICAgY29kZTogXCIwNzBfTElNSVRfTk9UX1NVUFBPUlRFRFwiLFxuICAgICAgcmVhc29uOiBcIk1ldGVvciAwLjcuMCBkb2VzIG5vdCBzdXBwb3J0IGxpbWl0IHdpdGggb3Bsb2cuXCIsXG4gICAgICBzb2x1dGlvbjogXCJVcGdyYWRlIHlvdXIgYXBwIHRvIE1ldGVvciB2ZXJzaW9uIDAuNy4yIG9yIGxhdGVyLlwiXG4gICAgfVxuICB9O1xuXG4gIHZhciBleGlzdHMkID0gXy5hbnkoY3Vyc29yRGVzY3JpcHRpb24uc2VsZWN0b3IsIGZ1bmN0aW9uICh2YWx1ZSwgZmllbGQpIHtcbiAgICBpZiAoZmllbGQuc3Vic3RyKDAsIDEpID09PSAnJCcpXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgfSk7XG5cbiAgaWYoZXhpc3RzJCkge1xuICAgIHJldHVybiB7XG4gICAgICBjb2RlOiBcIjA3MF8kX05PVF9TVVBQT1JURURcIixcbiAgICAgIHJlYXNvbjogXCJNZXRlb3IgMC43LjAgc3VwcG9ydHMgb25seSBlcXVhbCBjaGVja3Mgd2l0aCBvcGxvZy5cIixcbiAgICAgIHNvbHV0aW9uOiBcIlVwZ3JhZGUgeW91ciBhcHAgdG8gTWV0ZW9yIHZlcnNpb24gMC43LjIgb3IgbGF0ZXIuXCJcbiAgICB9XG4gIH07XG5cbiAgdmFyIG9ubHlTY2FsZXJzID0gXy5hbGwoY3Vyc29yRGVzY3JpcHRpb24uc2VsZWN0b3IsIGZ1bmN0aW9uICh2YWx1ZSwgZmllbGQpIHtcbiAgICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiIHx8XG4gICAgICB0eXBlb2YgdmFsdWUgPT09IFwibnVtYmVyXCIgfHxcbiAgICAgIHR5cGVvZiB2YWx1ZSA9PT0gXCJib29sZWFuXCIgfHxcbiAgICAgIHZhbHVlID09PSBudWxsIHx8XG4gICAgICB2YWx1ZSBpbnN0YW5jZW9mIE1ldGVvci5Db2xsZWN0aW9uLk9iamVjdElEO1xuICB9KTtcblxuICBpZighb25seVNjYWxlcnMpIHtcbiAgICByZXR1cm4ge1xuICAgICAgY29kZTogXCIwNzBfT05MWV9TQ0FMRVJTXCIsXG4gICAgICByZWFzb246IFwiTWV0ZW9yIDAuNy4wIG9ubHkgc3VwcG9ydHMgc2NhbGVycyBhcyBjb21wYXJhdG9ycy5cIixcbiAgICAgIHNvbHV0aW9uOiBcIlVwZ3JhZGUgeW91ciBhcHAgdG8gTWV0ZW9yIHZlcnNpb24gMC43LjIgb3IgbGF0ZXIuXCJcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbk9wbG9nQ2hlY2suXzA3MSA9IGZ1bmN0aW9uKGN1cnNvckRlc2NyaXB0aW9uKSB7XG4gIHZhciBvcHRpb25zID0gY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucztcbiAgdmFyIG1hdGNoZXIgPSBuZXcgTWluaW1vbmdvLk1hdGNoZXIoY3Vyc29yRGVzY3JpcHRpb24uc2VsZWN0b3IpO1xuICBpZiAob3B0aW9ucy5saW1pdCkge1xuICAgIHJldHVybiB7XG4gICAgICBjb2RlOiBcIjA3MV9MSU1JVF9OT1RfU1VQUE9SVEVEXCIsXG4gICAgICByZWFzb246IFwiTWV0ZW9yIDAuNy4xIGRvZXMgbm90IHN1cHBvcnQgbGltaXQgd2l0aCBvcGxvZy5cIixcbiAgICAgIHNvbHV0aW9uOiBcIlVwZ3JhZGUgeW91ciBhcHAgdG8gTWV0ZW9yIHZlcnNpb24gMC43LjIgb3IgbGF0ZXIuXCJcbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5cbk9wbG9nQ2hlY2suZW52ID0gZnVuY3Rpb24oKSB7XG4gIGlmKCFwcm9jZXNzLmVudi5NT05HT19PUExPR19VUkwpIHtcbiAgICByZXR1cm4ge1xuICAgICAgY29kZTogXCJOT19FTlZcIixcbiAgICAgIHJlYXNvbjogXCJZb3UgaGF2ZW4ndCBhZGRlZCBvcGxvZyBzdXBwb3J0IGZvciB5b3VyIHRoZSBNZXRlb3IgYXBwLlwiLFxuICAgICAgc29sdXRpb246IFwiQWRkIG9wbG9nIHN1cHBvcnQgZm9yIHlvdXIgTWV0ZW9yIGFwcC4gc2VlOiBodHRwOi8vZ29vLmdsL0NvMWpKY1wiXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG59O1xuXG5PcGxvZ0NoZWNrLmRpc2FibGVPcGxvZyA9IGZ1bmN0aW9uKGN1cnNvckRlc2NyaXB0aW9uKSB7XG4gIGlmKGN1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMuX2Rpc2FibGVPcGxvZykge1xuICAgIHJldHVybiB7XG4gICAgICBjb2RlOiBcIkRJU0FCTEVfT1BMT0dcIixcbiAgICAgIHJlYXNvbjogXCJZb3UndmUgZGlzYWJsZSBvcGxvZyBmb3IgdGhpcyBjdXJzb3IgZXhwbGljaXRseSB3aXRoIF9kaXNhYmxlT3Bsb2cgb3B0aW9uLlwiXG4gICAgfTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxufTtcblxuLy8gd2hlbiBjcmVhdGluZyBNaW5pbW9uZ28uTWF0Y2hlciBvYmplY3QsIGlmIHRoYXQncyB0aHJvd3MgYW4gZXhjZXB0aW9uXG4vLyBtZXRlb3Igd29uJ3QgZG8gdGhlIG9wbG9nIHN1cHBvcnRcbk9wbG9nQ2hlY2subWluaU1vbmdvTWF0Y2hlciA9IGZ1bmN0aW9uKGN1cnNvckRlc2NyaXB0aW9uKSB7XG4gIGlmKE1pbmltb25nby5NYXRjaGVyKSB7XG4gICAgdHJ5IHtcbiAgICAgIHZhciBtYXRjaGVyID0gbmV3IE1pbmltb25nby5NYXRjaGVyKGN1cnNvckRlc2NyaXB0aW9uLnNlbGVjdG9yKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gY2F0Y2goZXgpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGNvZGU6IFwiTUlOSU1PTkdPX01BVENIRVJfRVJST1JcIixcbiAgICAgICAgcmVhc29uOiBcIlRoZXJlJ3Mgc29tZXRoaW5nIHdyb25nIGluIHlvdXIgbW9uZ28gcXVlcnk6IFwiICsgIGV4Lm1lc3NhZ2UsXG4gICAgICAgIHNvbHV0aW9uOiBcIkNoZWNrIHlvdXIgc2VsZWN0b3IgYW5kIGNoYW5nZSBpdCBhY2NvcmRpbmdseS5cIlxuICAgICAgfTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgLy8gSWYgdGhlcmUgaXMgbm8gTWluaW1vbmdvLk1hdGNoZXIsIHdlIGRvbid0IG5lZWQgdG8gY2hlY2sgdGhpc1xuICAgIHJldHVybiB0cnVlO1xuICB9XG59O1xuXG5PcGxvZ0NoZWNrLm1pbmlNb25nb1NvcnRlciA9IGZ1bmN0aW9uKGN1cnNvckRlc2NyaXB0aW9uKSB7XG4gIHZhciBtYXRjaGVyID0gbmV3IE1pbmltb25nby5NYXRjaGVyKGN1cnNvckRlc2NyaXB0aW9uLnNlbGVjdG9yKTtcbiAgaWYoTWluaW1vbmdvLlNvcnRlciAmJiBjdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLnNvcnQpIHtcbiAgICB0cnkge1xuICAgICAgdmFyIHNvcnRlciA9IG5ldyBNaW5pbW9uZ28uU29ydGVyKFxuICAgICAgICBjdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLnNvcnQsXG4gICAgICAgIHsgbWF0Y2hlcjogbWF0Y2hlciB9XG4gICAgICApO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaChleCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgY29kZTogXCJNSU5JTU9OR09fU09SVEVSX0VSUk9SXCIsXG4gICAgICAgIHJlYXNvbjogXCJTb21lIG9mIHlvdXIgc29ydCBzcGVjaWZpZXJzIGFyZSBub3Qgc3VwcG9ydGVkOiBcIiArIGV4Lm1lc3NhZ2UsXG4gICAgICAgIHNvbHV0aW9uOiBcIkNoZWNrIHlvdXIgc29ydCBzcGVjaWZpZXJzIGFuZCBjaGFnZSB0aGVtIGFjY29yZGluZ2x5LlwiXG4gICAgICB9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG59O1xuXG5PcGxvZ0NoZWNrLmZpZWxkcyA9IGZ1bmN0aW9uKGN1cnNvckRlc2NyaXB0aW9uKSB7XG4gIHZhciBvcHRpb25zID0gY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucztcbiAgaWYob3B0aW9ucy5maWVsZHMpIHtcbiAgICB0cnkge1xuICAgICAgTG9jYWxDb2xsZWN0aW9uLl9jaGVja1N1cHBvcnRlZFByb2plY3Rpb24ob3B0aW9ucy5maWVsZHMpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKGUubmFtZSA9PT0gXCJNaW5pbW9uZ29FcnJvclwiKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgY29kZTogXCJOT1RfU1VQUE9SVEVEX0ZJRUxEU1wiLFxuICAgICAgICAgIHJlYXNvbjogXCJTb21lIG9mIHRoZSBmaWVsZCBmaWx0ZXJzIGFyZSBub3Qgc3VwcG9ydGVkOiBcIiArIGUubWVzc2FnZSxcbiAgICAgICAgICBzb2x1dGlvbjogXCJUcnkgcmVtb3ZpbmcgdGhvc2UgZmllbGQgZmlsdGVycy5cIlxuICAgICAgICB9O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5PcGxvZ0NoZWNrLnNraXAgPSBmdW5jdGlvbihjdXJzb3JEZXNjcmlwdGlvbikge1xuICBpZihjdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLnNraXApIHtcbiAgICByZXR1cm4ge1xuICAgICAgY29kZTogXCJTS0lQX05PVF9TVVBQT1JURURcIixcbiAgICAgIHJlYXNvbjogXCJTa2lwIGRvZXMgbm90IHN1cHBvcnQgd2l0aCBvcGxvZy5cIixcbiAgICAgIHNvbHV0aW9uOiBcIlRyeSB0byBhdm9pZCB1c2luZyBza2lwLiBVc2UgcmFuZ2UgcXVlcmllcyBpbnN0ZWFkOiBodHRwOi8vZ29vLmdsL2I1MjJBdlwiXG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuT3Bsb2dDaGVjay53aGVyZSA9IGZ1bmN0aW9uKGN1cnNvckRlc2NyaXB0aW9uKSB7XG4gIHZhciBtYXRjaGVyID0gbmV3IE1pbmltb25nby5NYXRjaGVyKGN1cnNvckRlc2NyaXB0aW9uLnNlbGVjdG9yKTtcbiAgaWYobWF0Y2hlci5oYXNXaGVyZSgpKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGNvZGU6IFwiV0hFUkVfTk9UX1NVUFBPUlRFRFwiLFxuICAgICAgcmVhc29uOiBcIk1ldGVvciBkb2VzIG5vdCBzdXBwb3J0IHF1ZXJpZXMgd2l0aCAkd2hlcmUuXCIsXG4gICAgICBzb2x1dGlvbjogXCJUcnkgdG8gcmVtb3ZlICR3aGVyZSBmcm9tIHlvdXIgcXVlcnkuIFVzZSBzb21lIGFsdGVybmF0aXZlLlwiXG4gICAgfVxuICB9O1xuXG4gIHJldHVybiB0cnVlO1xufTtcblxuT3Bsb2dDaGVjay5nZW8gPSBmdW5jdGlvbihjdXJzb3JEZXNjcmlwdGlvbikge1xuICB2YXIgbWF0Y2hlciA9IG5ldyBNaW5pbW9uZ28uTWF0Y2hlcihjdXJzb3JEZXNjcmlwdGlvbi5zZWxlY3Rvcik7XG5cbiAgaWYobWF0Y2hlci5oYXNHZW9RdWVyeSgpKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGNvZGU6IFwiR0VPX05PVF9TVVBQT1JURURcIixcbiAgICAgIHJlYXNvbjogXCJNZXRlb3IgZG9lcyBub3Qgc3VwcG9ydCBxdWVyaWVzIHdpdGggZ2VvIHBhcnRpYWwgb3BlcmF0b3JzLlwiLFxuICAgICAgc29sdXRpb246IFwiVHJ5IHRvIHJlbW92ZSBnZW8gcGFydGlhbCBvcGVyYXRvcnMgZnJvbSB5b3VyIHF1ZXJ5IGlmIHBvc3NpYmxlLlwiXG4gICAgfVxuICB9O1xuXG4gIHJldHVybiB0cnVlO1xufTtcblxuT3Bsb2dDaGVjay5saW1pdEJ1dE5vU29ydCA9IGZ1bmN0aW9uKGN1cnNvckRlc2NyaXB0aW9uKSB7XG4gIHZhciBvcHRpb25zID0gY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucztcblxuICBpZigob3B0aW9ucy5saW1pdCAmJiAhb3B0aW9ucy5zb3J0KSkge1xuICAgIHJldHVybiB7XG4gICAgICBjb2RlOiBcIkxJTUlUX05PX1NPUlRcIixcbiAgICAgIHJlYXNvbjogXCJNZXRlb3Igb3Bsb2cgaW1wbGVtZW50YXRpb24gZG9lcyBub3Qgc3VwcG9ydCBsaW1pdCB3aXRob3V0IGEgc29ydCBzcGVjaWZpZXIuXCIsXG4gICAgICBzb2x1dGlvbjogXCJUcnkgYWRkaW5nIGEgc29ydCBzcGVjaWZpZXIuXCJcbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5PcGxvZ0NoZWNrLm9sZGVyVmVyc2lvbiA9IGZ1bmN0aW9uKGN1cnNvckRlc2NyaXB0aW9uLCBkcml2ZXIpIHtcbiAgaWYoZHJpdmVyICYmICFkcml2ZXIuY29uc3RydWN0b3IuY3Vyc29yU3VwcG9ydGVkKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGNvZGU6IFwiT0xERVJfVkVSU0lPTlwiLFxuICAgICAgcmVhc29uOiBcIllvdXIgTWV0ZW9yIHZlcnNpb24gZG9lcyBub3QgaGF2ZSBvcGxvZyBzdXBwb3J0LlwiLFxuICAgICAgc29sdXRpb246IFwiVXBncmFkZSB5b3VyIGFwcCB0byBNZXRlb3IgdmVyc2lvbiAwLjcuMiBvciBsYXRlci5cIlxuICAgIH07XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5PcGxvZ0NoZWNrLmdpdENoZWNrb3V0ID0gZnVuY3Rpb24oY3Vyc29yRGVzY3JpcHRpb24sIGRyaXZlcikge1xuICBpZighTWV0ZW9yLnJlbGVhc2UpIHtcbiAgICByZXR1cm4ge1xuICAgICAgY29kZTogXCJHSVRfQ0hFQ0tPVVRcIixcbiAgICAgIHJlYXNvbjogXCJTZWVtcyBsaWtlIHlvdXIgTWV0ZW9yIHZlcnNpb24gaXMgYmFzZWQgb24gYSBHaXQgY2hlY2tvdXQgYW5kIGl0IGRvZXNuJ3QgaGF2ZSB0aGUgb3Bsb2cgc3VwcG9ydC5cIixcbiAgICAgIHNvbHV0aW9uOiBcIlRyeSB0byB1cGdyYWRlIHlvdXIgTWV0ZW9yIHZlcnNpb24uXCJcbiAgICB9O1xuICB9XG4gIHJldHVybiB0cnVlO1xufTtcblxudmFyIHByZVJ1bm5pbmdNYXRjaGVycyA9IFtcbiAgT3Bsb2dDaGVjay5lbnYsXG4gIE9wbG9nQ2hlY2suZGlzYWJsZU9wbG9nLFxuICBPcGxvZ0NoZWNrLm1pbmlNb25nb01hdGNoZXJcbl07XG5cbnZhciBnbG9iYWxNYXRjaGVycyA9IFtcbiAgT3Bsb2dDaGVjay5maWVsZHMsXG4gIE9wbG9nQ2hlY2suc2tpcCxcbiAgT3Bsb2dDaGVjay53aGVyZSxcbiAgT3Bsb2dDaGVjay5nZW8sXG4gIE9wbG9nQ2hlY2subGltaXRCdXROb1NvcnQsXG4gIE9wbG9nQ2hlY2subWluaU1vbmdvU29ydGVyLFxuICBPcGxvZ0NoZWNrLm9sZGVyVmVyc2lvbixcbiAgT3Bsb2dDaGVjay5naXRDaGVja291dFxuXTtcblxudmFyIHZlcnNpb25NYXRjaGVycyA9IFtcbiAgWy9eMFxcLjdcXC4xLywgT3Bsb2dDaGVjay5fMDcxXSxcbiAgWy9eMFxcLjdcXC4wLywgT3Bsb2dDaGVjay5fMDcwXSxcbl07XG5cbkthZGlyYS5jaGVja1doeU5vT3Bsb2cgPSBmdW5jdGlvbihjdXJzb3JEZXNjcmlwdGlvbiwgb2JzZXJ2ZXJEcml2ZXIpIHtcbiAgaWYodHlwZW9mIE1pbmltb25nbyA9PSAndW5kZWZpbmVkJykge1xuICAgIHJldHVybiB7XG4gICAgICBjb2RlOiBcIkNBTk5PVF9ERVRFQ1RcIixcbiAgICAgIHJlYXNvbjogXCJZb3UgYXJlIHJ1bm5pbmcgYW4gb2xkZXIgTWV0ZW9yIHZlcnNpb24gYW5kIEthZGlyYSBjYW4ndCBjaGVjayBvcGxvZyBzdGF0ZS5cIixcbiAgICAgIHNvbHV0aW9uOiBcIlRyeSB1cGRhdGluZyB5b3VyIE1ldGVvciBhcHBcIlxuICAgIH1cbiAgfVxuXG4gIHZhciByZXN1bHQgPSBydW5NYXRjaGVycyhwcmVSdW5uaW5nTWF0Y2hlcnMsIGN1cnNvckRlc2NyaXB0aW9uLCBvYnNlcnZlckRyaXZlcik7XG4gIGlmKHJlc3VsdCAhPT0gdHJ1ZSkge1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICB2YXIgbWV0ZW9yVmVyc2lvbiA9IE1ldGVvci5yZWxlYXNlO1xuICBmb3IodmFyIGxjPTA7IGxjPHZlcnNpb25NYXRjaGVycy5sZW5ndGg7IGxjKyspIHtcbiAgICB2YXIgbWF0Y2hlckluZm8gPSB2ZXJzaW9uTWF0Y2hlcnNbbGNdO1xuICAgIGlmKG1hdGNoZXJJbmZvWzBdLnRlc3QobWV0ZW9yVmVyc2lvbikpIHtcbiAgICAgIHZhciBtYXRjaGVkID0gbWF0Y2hlckluZm9bMV0oY3Vyc29yRGVzY3JpcHRpb24sIG9ic2VydmVyRHJpdmVyKTtcbiAgICAgIGlmKG1hdGNoZWQgIT09IHRydWUpIHtcbiAgICAgICAgcmV0dXJuIG1hdGNoZWQ7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmVzdWx0ID0gcnVuTWF0Y2hlcnMoZ2xvYmFsTWF0Y2hlcnMsIGN1cnNvckRlc2NyaXB0aW9uLCBvYnNlcnZlckRyaXZlcik7XG4gIGlmKHJlc3VsdCAhPT0gdHJ1ZSkge1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGNvZGU6IFwiT1BMT0dfU1VQUE9SVEVEXCIsXG4gICAgcmVhc29uOiBcIlRoaXMgcXVlcnkgc2hvdWxkIHN1cHBvcnQgb3Bsb2cuIEl0J3Mgd2VpcmQgaWYgaXQncyBub3QuXCIsXG4gICAgc29sdXRpb246IFwiUGxlYXNlIGNvbnRhY3QgS2FkaXJhIHN1cHBvcnQgYW5kIGxldCdzIGRpc2N1c3MuXCJcbiAgfTtcbn07XG5cbmZ1bmN0aW9uIHJ1bk1hdGNoZXJzKG1hdGNoZXJMaXN0LCBjdXJzb3JEZXNjcmlwdGlvbiwgb2JzZXJ2ZXJEcml2ZXIpIHtcbiAgZm9yKHZhciBsYz0wOyBsYzxtYXRjaGVyTGlzdC5sZW5ndGg7IGxjKyspIHtcbiAgICB2YXIgbWF0Y2hlciA9IG1hdGNoZXJMaXN0W2xjXTtcbiAgICB2YXIgbWF0Y2hlZCA9IG1hdGNoZXIoY3Vyc29yRGVzY3JpcHRpb24sIG9ic2VydmVyRHJpdmVyKTtcbiAgICBpZihtYXRjaGVkICE9PSB0cnVlKSB7XG4gICAgICByZXR1cm4gbWF0Y2hlZDtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG4iLCJ2YXIgRmliZXJzID0gTnBtLnJlcXVpcmUoJ2ZpYmVycycpO1xudmFyIGV2ZW50TG9nZ2VyID0gTnBtLnJlcXVpcmUoJ2RlYnVnJykoJ2thZGlyYTp0cmFjZXInKTtcbnZhciBSRVBJVElUSVZFX0VWRU5UUyA9IHsnZGInOiB0cnVlLCAnaHR0cCc6IHRydWUsICdlbWFpbCc6IHRydWUsICd3YWl0JzogdHJ1ZSwgJ2FzeW5jJzogdHJ1ZX07XG5cblRyYWNlciA9IGZ1bmN0aW9uIFRyYWNlcigpIHtcbiAgdGhpcy5fZmlsdGVycyA9IFtdO1xufTtcblxuLy9JbiB0aGUgZnV0dXJlLCB3ZSBtaWdodCB3YW4ndCB0byB0cmFjayBpbm5lciBmaWJlciBldmVudHMgdG9vLlxuLy9UaGVuIHdlIGNhbid0IHNlcmlhbGl6ZSB0aGUgb2JqZWN0IHdpdGggbWV0aG9kc1xuLy9UaGF0J3Mgd2h5IHdlIHVzZSB0aGlzIG1ldGhvZCBvZiByZXR1cm5pbmcgdGhlIGRhdGFcblRyYWNlci5wcm90b3R5cGUuc3RhcnQgPSBmdW5jdGlvbihzZXNzaW9uLCBtc2cpIHtcbiAgdmFyIHRyYWNlSW5mbyA9IHtcbiAgICBfaWQ6IHNlc3Npb24uaWQgKyBcIjo6XCIgKyBtc2cuaWQsXG4gICAgc2Vzc2lvbjogc2Vzc2lvbi5pZCxcbiAgICB1c2VySWQ6IHNlc3Npb24udXNlcklkLFxuICAgIGlkOiBtc2cuaWQsXG4gICAgZXZlbnRzOiBbXVxuICB9O1xuXG4gIGlmKG1zZy5tc2cgPT0gJ21ldGhvZCcpIHtcbiAgICB0cmFjZUluZm8udHlwZSA9ICdtZXRob2QnO1xuICAgIHRyYWNlSW5mby5uYW1lID0gbXNnLm1ldGhvZDtcbiAgfSBlbHNlIGlmKG1zZy5tc2cgPT0gJ3N1YicpIHtcbiAgICB0cmFjZUluZm8udHlwZSA9ICdzdWInO1xuICAgIHRyYWNlSW5mby5uYW1lID0gbXNnLm5hbWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICByZXR1cm4gdHJhY2VJbmZvO1xufTtcblxuVHJhY2VyLnByb3RvdHlwZS5ldmVudCA9IGZ1bmN0aW9uKHRyYWNlSW5mbywgdHlwZSwgZGF0YSkge1xuICAvLyBkbyBub3QgYWxsb3cgdG8gcHJvY2VlZCwgaWYgYWxyZWFkeSBjb21wbGV0ZWQgb3IgZXJyb3JlZFxuICB2YXIgbGFzdEV2ZW50ID0gdGhpcy5nZXRMYXN0RXZlbnQodHJhY2VJbmZvKTtcbiAgaWYobGFzdEV2ZW50ICYmIFsnY29tcGxldGUnLCAnZXJyb3InXS5pbmRleE9mKGxhc3RFdmVudC50eXBlKSA+PSAwKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy9leHBlY3RpbmcgYSBlbmQgZXZlbnRcbiAgdmFyIGV2ZW50SWQgPSB0cnVlO1xuXG4gIC8vc3BlY2lhbGx5IGhhbmRsaW5nIGZvciByZXBpdGl2aXZlIGV2ZW50cyBsaWtlIGRiLCBodHRwXG4gIGlmKFJFUElUSVRJVkVfRVZFTlRTW3R5cGVdKSB7XG4gICAgLy9jYW4ndCBhY2NlcHQgYSBuZXcgc3RhcnQgZXZlbnRcbiAgICBpZih0cmFjZUluZm8uX2xhc3RFdmVudElkKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGV2ZW50SWQgPSB0cmFjZUluZm8uX2xhc3RFdmVudElkID0gRGVmYXVsdFVuaXF1ZUlkLmdldCgpO1xuICB9XG5cbiAgdmFyIGV2ZW50ID0ge3R5cGU6IHR5cGUsIGF0OiBOdHAuX25vdygpfTtcbiAgaWYoZGF0YSkge1xuICAgIHZhciBpbmZvID0gXy5waWNrKHRyYWNlSW5mbywgJ3R5cGUnLCAnbmFtZScpXG4gICAgZXZlbnQuZGF0YSA9IHRoaXMuX2FwcGx5RmlsdGVycyh0eXBlLCBkYXRhLCBpbmZvLCBcInN0YXJ0XCIpOztcbiAgfVxuXG4gIHRyYWNlSW5mby5ldmVudHMucHVzaChldmVudCk7XG5cbiAgZXZlbnRMb2dnZXIoXCIlcyAlc1wiLCB0eXBlLCB0cmFjZUluZm8uX2lkKTtcbiAgcmV0dXJuIGV2ZW50SWQ7XG59O1xuXG5UcmFjZXIucHJvdG90eXBlLmV2ZW50RW5kID0gZnVuY3Rpb24odHJhY2VJbmZvLCBldmVudElkLCBkYXRhKSB7XG4gIGlmKHRyYWNlSW5mby5fbGFzdEV2ZW50SWQgJiYgdHJhY2VJbmZvLl9sYXN0RXZlbnRJZCA9PSBldmVudElkKSB7XG4gICAgdmFyIGxhc3RFdmVudCA9IHRoaXMuZ2V0TGFzdEV2ZW50KHRyYWNlSW5mbyk7XG4gICAgdmFyIHR5cGUgPSBsYXN0RXZlbnQudHlwZSArICdlbmQnO1xuICAgIHZhciBldmVudCA9IHt0eXBlOiB0eXBlLCBhdDogTnRwLl9ub3coKX07XG4gICAgaWYoZGF0YSkge1xuICAgICAgdmFyIGluZm8gPSBfLnBpY2sodHJhY2VJbmZvLCAndHlwZScsICduYW1lJylcbiAgICAgIGV2ZW50LmRhdGEgPSB0aGlzLl9hcHBseUZpbHRlcnModHlwZSwgZGF0YSwgaW5mbywgXCJlbmRcIik7O1xuICAgIH1cbiAgICB0cmFjZUluZm8uZXZlbnRzLnB1c2goZXZlbnQpO1xuICAgIGV2ZW50TG9nZ2VyKFwiJXMgJXNcIiwgdHlwZSwgdHJhY2VJbmZvLl9pZCk7XG5cbiAgICB0cmFjZUluZm8uX2xhc3RFdmVudElkID0gbnVsbDtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn07XG5cblRyYWNlci5wcm90b3R5cGUuZ2V0TGFzdEV2ZW50ID0gZnVuY3Rpb24odHJhY2VJbmZvKSB7XG4gIHJldHVybiB0cmFjZUluZm8uZXZlbnRzW3RyYWNlSW5mby5ldmVudHMubGVuZ3RoIC0xXVxufTtcblxuVHJhY2VyLnByb3RvdHlwZS5lbmRMYXN0RXZlbnQgPSBmdW5jdGlvbih0cmFjZUluZm8pIHtcbiAgdmFyIGxhc3RFdmVudCA9IHRoaXMuZ2V0TGFzdEV2ZW50KHRyYWNlSW5mbyk7XG4gIGlmKGxhc3RFdmVudCAmJiAhL2VuZCQvLnRlc3QobGFzdEV2ZW50LnR5cGUpKSB7XG4gICAgdHJhY2VJbmZvLmV2ZW50cy5wdXNoKHtcbiAgICAgIHR5cGU6IGxhc3RFdmVudC50eXBlICsgJ2VuZCcsXG4gICAgICBhdDogTnRwLl9ub3coKVxuICAgIH0pO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn07XG5cblRyYWNlci5wcm90b3R5cGUuYnVpbGRUcmFjZSA9IGZ1bmN0aW9uKHRyYWNlSW5mbykge1xuICB2YXIgZmlyc3RFdmVudCA9IHRyYWNlSW5mby5ldmVudHNbMF07XG4gIHZhciBsYXN0RXZlbnQgPSB0cmFjZUluZm8uZXZlbnRzW3RyYWNlSW5mby5ldmVudHMubGVuZ3RoIC0gMV07XG4gIHZhciBwcm9jZXNzZWRFdmVudHMgPSBbXTtcblxuICBpZihmaXJzdEV2ZW50LnR5cGUgIT0gJ3N0YXJ0Jykge1xuICAgIGNvbnNvbGUud2FybignS2FkaXJhOiB0cmFjZSBpcyBub3Qgc3RhcnRlZCB5ZXQnKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfSBlbHNlIGlmKGxhc3RFdmVudC50eXBlICE9ICdjb21wbGV0ZScgJiYgbGFzdEV2ZW50LnR5cGUgIT0gJ2Vycm9yJykge1xuICAgIC8vdHJhY2UgaXMgbm90IGNvbXBsZXRlZCBvciBlcnJvcmVkIHlldFxuICAgIGNvbnNvbGUud2FybignS2FkaXJhOiB0cmFjZSBpcyBub3QgY29tcGxldGVkIG9yIGVycm9yZWQgeWV0Jyk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH0gZWxzZSB7XG4gICAgLy9idWlsZCB0aGUgbWV0cmljc1xuICAgIHRyYWNlSW5mby5lcnJvcmVkID0gbGFzdEV2ZW50LnR5cGUgPT0gJ2Vycm9yJztcbiAgICB0cmFjZUluZm8uYXQgPSBmaXJzdEV2ZW50LmF0O1xuXG4gICAgdmFyIG1ldHJpY3MgPSB7XG4gICAgICB0b3RhbDogbGFzdEV2ZW50LmF0IC0gZmlyc3RFdmVudC5hdCxcbiAgICB9O1xuXG4gICAgdmFyIHRvdGFsTm9uQ29tcHV0ZSA9IDA7XG5cbiAgICBmaXJzdEV2ZW50ID0gWydzdGFydCcsIDBdO1xuICAgIGlmKHRyYWNlSW5mby5ldmVudHNbMF0uZGF0YSkgZmlyc3RFdmVudC5wdXNoKHRyYWNlSW5mby5ldmVudHNbMF0uZGF0YSk7XG4gICAgcHJvY2Vzc2VkRXZlbnRzLnB1c2goZmlyc3RFdmVudCk7XG5cbiAgICBmb3IodmFyIGxjPTE7IGxjIDwgdHJhY2VJbmZvLmV2ZW50cy5sZW5ndGggLSAxOyBsYyArPSAyKSB7XG4gICAgICB2YXIgcHJldkV2ZW50RW5kID0gdHJhY2VJbmZvLmV2ZW50c1tsYy0xXTtcbiAgICAgIHZhciBzdGFydEV2ZW50ID0gdHJhY2VJbmZvLmV2ZW50c1tsY107XG4gICAgICB2YXIgZW5kRXZlbnQgPSB0cmFjZUluZm8uZXZlbnRzW2xjKzFdO1xuICAgICAgdmFyIGNvbXB1dGVUaW1lID0gc3RhcnRFdmVudC5hdCAtIHByZXZFdmVudEVuZC5hdDtcbiAgICAgIGlmKGNvbXB1dGVUaW1lID4gMCkgcHJvY2Vzc2VkRXZlbnRzLnB1c2goWydjb21wdXRlJywgY29tcHV0ZVRpbWVdKTtcbiAgICAgIGlmKCFlbmRFdmVudCkge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdLYWRpcmE6IG5vIGVuZCBldmVudCBmb3IgdHlwZTogJywgc3RhcnRFdmVudC50eXBlKTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9IGVsc2UgaWYoZW5kRXZlbnQudHlwZSAhPSBzdGFydEV2ZW50LnR5cGUgKyAnZW5kJykge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdLYWRpcmE6IGVuZGV2ZW50IHR5cGUgbWlzbWF0Y2g6ICcsIHN0YXJ0RXZlbnQudHlwZSwgZW5kRXZlbnQudHlwZSwgSlNPTi5zdHJpbmdpZnkodHJhY2VJbmZvKSk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGVsYXBzZWRUaW1lRm9yRXZlbnQgPSBlbmRFdmVudC5hdCAtIHN0YXJ0RXZlbnQuYXRcbiAgICAgICAgdmFyIGN1cnJlbnRFdmVudCA9IFtzdGFydEV2ZW50LnR5cGUsIGVsYXBzZWRUaW1lRm9yRXZlbnRdO1xuICAgICAgICBjdXJyZW50RXZlbnQucHVzaChPYmplY3QuYXNzaWduKHt9LCBzdGFydEV2ZW50LmRhdGEsIGVuZEV2ZW50LmRhdGEpKTtcbiAgICAgICAgcHJvY2Vzc2VkRXZlbnRzLnB1c2goY3VycmVudEV2ZW50KTtcbiAgICAgICAgbWV0cmljc1tzdGFydEV2ZW50LnR5cGVdID0gbWV0cmljc1tzdGFydEV2ZW50LnR5cGVdIHx8IDA7XG4gICAgICAgIG1ldHJpY3Nbc3RhcnRFdmVudC50eXBlXSArPSBlbGFwc2VkVGltZUZvckV2ZW50O1xuICAgICAgICB0b3RhbE5vbkNvbXB1dGUgKz0gZWxhcHNlZFRpbWVGb3JFdmVudDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb21wdXRlVGltZSA9IGxhc3RFdmVudC5hdCAtIHRyYWNlSW5mby5ldmVudHNbdHJhY2VJbmZvLmV2ZW50cy5sZW5ndGggLSAyXTtcbiAgICBpZihjb21wdXRlVGltZSA+IDApIHByb2Nlc3NlZEV2ZW50cy5wdXNoKFsnY29tcHV0ZScsIGNvbXB1dGVUaW1lXSk7XG5cbiAgICB2YXIgbGFzdEV2ZW50RGF0YSA9IFtsYXN0RXZlbnQudHlwZSwgMF07XG4gICAgaWYobGFzdEV2ZW50LmRhdGEpIGxhc3RFdmVudERhdGEucHVzaChsYXN0RXZlbnQuZGF0YSk7XG4gICAgcHJvY2Vzc2VkRXZlbnRzLnB1c2gobGFzdEV2ZW50RGF0YSk7XG5cbiAgICBtZXRyaWNzLmNvbXB1dGUgPSBtZXRyaWNzLnRvdGFsIC0gdG90YWxOb25Db21wdXRlO1xuICAgIHRyYWNlSW5mby5tZXRyaWNzID0gbWV0cmljcztcbiAgICB0cmFjZUluZm8uZXZlbnRzID0gcHJvY2Vzc2VkRXZlbnRzO1xuICAgIHRyYWNlSW5mby5pc0V2ZW50c1Byb2Nlc3NlZCA9IHRydWU7XG4gICAgcmV0dXJuIHRyYWNlSW5mbztcbiAgfVxufTtcblxuVHJhY2VyLnByb3RvdHlwZS5hZGRGaWx0ZXIgPSBmdW5jdGlvbihmaWx0ZXJGbikge1xuICB0aGlzLl9maWx0ZXJzLnB1c2goZmlsdGVyRm4pO1xufTtcblxuVHJhY2VyLnByb3RvdHlwZS5fYXBwbHlGaWx0ZXJzID0gZnVuY3Rpb24oZXZlbnRUeXBlLCBkYXRhLCBpbmZvKSB7XG4gIHRoaXMuX2ZpbHRlcnMuZm9yRWFjaChmdW5jdGlvbihmaWx0ZXJGbikge1xuICAgIGRhdGEgPSBmaWx0ZXJGbihldmVudFR5cGUsIF8uY2xvbmUoZGF0YSksIGluZm8pO1xuICB9KTtcblxuICByZXR1cm4gZGF0YTtcbn07XG5cbkthZGlyYS50cmFjZXIgPSBuZXcgVHJhY2VyKCk7XG4vLyBuZWVkIHRvIGV4cG9zZSBUcmFjZXIgdG8gcHJvdmlkZSBkZWZhdWx0IHNldCBvZiBmaWx0ZXJzXG5LYWRpcmEuVHJhY2VyID0gVHJhY2VyOyIsIi8vIHN0cmlwIHNlbnNpdGl2ZSBkYXRhIHNlbnQgdG8ga2FkaWEgZW5naW5lLlxuLy8gcG9zc2libGUgdG8gbGltaXQgdHlwZXMgYnkgcHJvdmlkaW5nIGFuIGFycmF5IG9mIHR5cGVzIHRvIHN0cmlwXG4vLyBwb3NzaWJsZSB0eXBlcyBhcmU6IFwic3RhcnRcIiwgXCJkYlwiLCBcImh0dHBcIiwgXCJlbWFpbFwiXG5UcmFjZXIuc3RyaXBTZW5zaXRpdmUgPSBmdW5jdGlvbiBzdHJpcFNlbnNpdGl2ZSh0eXBlc1RvU3RyaXAsIHJlY2VpdmVyVHlwZSwgbmFtZSkge1xuICB0eXBlc1RvU3RyaXAgPSAgdHlwZXNUb1N0cmlwIHx8IFtdO1xuXG4gIHZhciBzdHJpcHBlZFR5cGVzID0ge307XG4gIHR5cGVzVG9TdHJpcC5mb3JFYWNoKGZ1bmN0aW9uKHR5cGUpIHtcbiAgICBzdHJpcHBlZFR5cGVzW3R5cGVdID0gdHJ1ZTtcbiAgfSk7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uICh0eXBlLCBkYXRhLCBpbmZvKSB7XG4gICAgaWYodHlwZXNUb1N0cmlwLmxlbmd0aCA+IDAgJiYgIXN0cmlwcGVkVHlwZXNbdHlwZV0pXG4gICAgICByZXR1cm4gZGF0YTtcblxuICAgIGlmKHJlY2VpdmVyVHlwZSAmJiByZWNlaXZlclR5cGUgIT0gaW5mby50eXBlKVxuICAgICAgcmV0dXJuIGRhdGE7XG5cbiAgICBpZihuYW1lICYmIG5hbWUgIT0gaW5mby5uYW1lKVxuICAgICAgcmV0dXJuIGRhdGE7XG5cbiAgICBpZih0eXBlID09IFwic3RhcnRcIikge1xuICAgICAgZGF0YS5wYXJhbXMgPSBcIltzdHJpcHBlZF1cIjtcbiAgICB9IGVsc2UgaWYodHlwZSA9PSBcImRiXCIpIHtcbiAgICAgIGRhdGEuc2VsZWN0b3IgPSBcIltzdHJpcHBlZF1cIjtcbiAgICB9IGVsc2UgaWYodHlwZSA9PSBcImh0dHBcIikge1xuICAgICAgZGF0YS51cmwgPSBcIltzdHJpcHBlZF1cIjtcbiAgICB9IGVsc2UgaWYodHlwZSA9PSBcImVtYWlsXCIpIHtcbiAgICAgIFtcImZyb21cIiwgXCJ0b1wiLCBcImNjXCIsIFwiYmNjXCIsIFwicmVwbHlUb1wiXS5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgaWYoZGF0YVtpdGVtXSkge1xuICAgICAgICAgIGRhdGFbaXRlbV0gPSBcIltzdHJpcHBlZF1cIjtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRhdGE7XG4gIH07XG59O1xuXG4vLyBzdHJpcCBzZWxlY3RvcnMgb25seSBmcm9tIHRoZSBnaXZlbiBsaXN0IG9mIGNvbGxlY3Rpb24gbmFtZXNcblRyYWNlci5zdHJpcFNlbGVjdG9ycyA9IGZ1bmN0aW9uIHN0cmlwU2VsZWN0b3JzKGNvbGxlY3Rpb25MaXN0LCByZWNlaXZlclR5cGUsIG5hbWUpIHtcbiAgY29sbGVjdGlvbkxpc3QgPSBjb2xsZWN0aW9uTGlzdCB8fCBbXTtcblxuICB2YXIgY29sbE1hcCA9IHt9O1xuICBjb2xsZWN0aW9uTGlzdC5mb3JFYWNoKGZ1bmN0aW9uKGNvbGxOYW1lKSB7XG4gICAgY29sbE1hcFtjb2xsTmFtZV0gPSB0cnVlO1xuICB9KTtcblxuICByZXR1cm4gZnVuY3Rpb24odHlwZSwgZGF0YSwgaW5mbykge1xuICAgIGlmKHR5cGUgIT0gXCJkYlwiIHx8IChkYXRhICYmICFjb2xsTWFwW2RhdGEuY29sbF0pKSB7XG4gICAgICByZXR1cm4gZGF0YVxuICAgIH1cblxuICAgIGlmKHJlY2VpdmVyVHlwZSAmJiByZWNlaXZlclR5cGUgIT0gaW5mby50eXBlKVxuICAgICAgcmV0dXJuIGRhdGE7XG5cbiAgICBpZihuYW1lICYmIG5hbWUgIT0gaW5mby5uYW1lKVxuICAgICAgcmV0dXJuIGRhdGE7XG5cbiAgICBkYXRhLnNlbGVjdG9yID0gXCJbc3RyaXBwZWRdXCI7XG4gICAgcmV0dXJuIGRhdGE7XG4gIH07XG59IiwidmFyIGxvZ2dlciA9IE5wbS5yZXF1aXJlKCdkZWJ1ZycpKCdrYWRpcmE6dHMnKTtcblxuVHJhY2VyU3RvcmUgPSBmdW5jdGlvbiBUcmFjZXJTdG9yZShvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIHRoaXMubWF4VG90YWxQb2ludHMgPSBvcHRpb25zLm1heFRvdGFsUG9pbnRzIHx8IDMwO1xuICB0aGlzLmludGVydmFsID0gb3B0aW9ucy5pbnRlcnZhbCB8fCAxMDAwICogNjA7XG4gIHRoaXMuYXJjaGl2ZUV2ZXJ5ID0gb3B0aW9ucy5hcmNoaXZlRXZlcnkgfHwgdGhpcy5tYXhUb3RhbFBvaW50cyAvIDY7XG5cbiAgLy9zdG9yZSBtYXggdG90YWwgb24gdGhlIHBhc3QgMzAgbWludXRlcyAob3IgcGFzdCAzMCBpdGVtcylcbiAgdGhpcy5tYXhUb3RhbHMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAvL3N0b3JlIHRoZSBtYXggdHJhY2Ugb2YgdGhlIGN1cnJlbnQgaW50ZXJ2YWxcbiAgdGhpcy5jdXJyZW50TWF4VHJhY2UgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAvL2FyY2hpdmUgZm9yIHRoZSB0cmFjZXNcbiAgdGhpcy50cmFjZUFyY2hpdmUgPSBbXTtcblxuICB0aGlzLnByb2Nlc3NlZENudCA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgLy9ncm91cCBlcnJvcnMgYnkgbWVzc2FnZXMgYmV0d2VlbiBhbiBpbnRlcnZhbFxuICB0aGlzLmVycm9yTWFwID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbn07XG5cblRyYWNlclN0b3JlLnByb3RvdHlwZS5hZGRUcmFjZSA9IGZ1bmN0aW9uKHRyYWNlKSB7XG4gIHZhciBraW5kID0gW3RyYWNlLnR5cGUsIHRyYWNlLm5hbWVdLmpvaW4oJzo6Jyk7XG4gIGlmKCF0aGlzLmN1cnJlbnRNYXhUcmFjZVtraW5kXSkge1xuICAgIHRoaXMuY3VycmVudE1heFRyYWNlW2tpbmRdID0gRUpTT04uY2xvbmUodHJhY2UpO1xuICB9IGVsc2UgaWYodGhpcy5jdXJyZW50TWF4VHJhY2Vba2luZF0ubWV0cmljcy50b3RhbCA8IHRyYWNlLm1ldHJpY3MudG90YWwpIHtcbiAgICB0aGlzLmN1cnJlbnRNYXhUcmFjZVtraW5kXSA9IEVKU09OLmNsb25lKHRyYWNlKTtcbiAgfSBlbHNlIGlmKHRyYWNlLmVycm9yZWQpIHtcbiAgICB0aGlzLl9oYW5kbGVFcnJvcnModHJhY2UpO1xuICB9XG59O1xuXG5UcmFjZXJTdG9yZS5wcm90b3R5cGUuY29sbGVjdFRyYWNlcyA9IGZ1bmN0aW9uKCkge1xuICB2YXIgdHJhY2VzID0gdGhpcy50cmFjZUFyY2hpdmU7XG4gIHRoaXMudHJhY2VBcmNoaXZlID0gW107XG5cbiAgLy8gY29udmVydCBhdCh0aW1lc3RhbXApIGludG8gdGhlIGFjdHVhbCBzZXJ2ZXJUaW1lXG4gIHRyYWNlcy5mb3JFYWNoKGZ1bmN0aW9uKHRyYWNlKSB7XG4gICAgdHJhY2UuYXQgPSBLYWRpcmEuc3luY2VkRGF0ZS5zeW5jVGltZSh0cmFjZS5hdCk7XG4gIH0pO1xuICByZXR1cm4gdHJhY2VzO1xufTtcblxuVHJhY2VyU3RvcmUucHJvdG90eXBlLnN0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuX3RpbWVvdXRIYW5kbGVyID0gc2V0SW50ZXJ2YWwodGhpcy5wcm9jZXNzVHJhY2VzLmJpbmQodGhpcyksIHRoaXMuaW50ZXJ2YWwpO1xufTtcblxuVHJhY2VyU3RvcmUucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbigpIHtcbiAgaWYodGhpcy5fdGltZW91dEhhbmRsZXIpIHtcbiAgICBjbGVhckludGVydmFsKHRoaXMuX3RpbWVvdXRIYW5kbGVyKTtcbiAgfVxufTtcblxuVHJhY2VyU3RvcmUucHJvdG90eXBlLl9oYW5kbGVFcnJvcnMgPSBmdW5jdGlvbih0cmFjZSkge1xuICAvLyBzZW5kaW5nIGVycm9yIHJlcXVlc3RzIGFzIGl0IGlzXG4gIHZhciBsYXN0RXZlbnQgPSB0cmFjZS5ldmVudHNbdHJhY2UuZXZlbnRzLmxlbmd0aCAtMV07XG4gIGlmKGxhc3RFdmVudCAmJiBsYXN0RXZlbnRbMl0pIHtcbiAgICB2YXIgZXJyb3IgPSBsYXN0RXZlbnRbMl0uZXJyb3I7XG5cbiAgICAvLyBncm91cGluZyBlcnJvcnMgb2NjdXJlZCAocmVzZXQgYWZ0ZXIgcHJvY2Vzc1RyYWNlcylcbiAgICB2YXIgZXJyb3JLZXkgPSBbdHJhY2UudHlwZSwgdHJhY2UubmFtZSwgZXJyb3IubWVzc2FnZV0uam9pbihcIjo6XCIpO1xuICAgIGlmKCF0aGlzLmVycm9yTWFwW2Vycm9yS2V5XSkge1xuICAgICAgdmFyIGVycm9yZWRUcmFjZSA9IEVKU09OLmNsb25lKHRyYWNlKTtcbiAgICAgIHRoaXMuZXJyb3JNYXBbZXJyb3JLZXldID0gZXJyb3JlZFRyYWNlO1xuXG4gICAgICB0aGlzLnRyYWNlQXJjaGl2ZS5wdXNoKGVycm9yZWRUcmFjZSk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGxvZ2dlcignbGFzdCBldmVudHMgaXMgbm90IGFuIGVycm9yOiAnLCBKU09OLnN0cmluZ2lmeSh0cmFjZS5ldmVudHMpKTtcbiAgfVxufTtcblxuVHJhY2VyU3RvcmUucHJvdG90eXBlLnByb2Nlc3NUcmFjZXMgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIga2luZHMgPSBfLnVuaW9uKFxuICAgIF8ua2V5cyh0aGlzLm1heFRvdGFscyksXG4gICAgXy5rZXlzKHRoaXMuY3VycmVudE1heFRyYWNlKVxuICApO1xuXG4gIGtpbmRzLmZvckVhY2goZnVuY3Rpb24oa2luZCkge1xuICAgIHNlbGYucHJvY2Vzc2VkQ250W2tpbmRdID0gc2VsZi5wcm9jZXNzZWRDbnRba2luZF0gfHwgMDtcbiAgICB2YXIgY3VycmVudE1heFRyYWNlID0gc2VsZi5jdXJyZW50TWF4VHJhY2Vba2luZF07XG4gICAgdmFyIGN1cnJlbnRNYXhUb3RhbCA9IGN1cnJlbnRNYXhUcmFjZT8gY3VycmVudE1heFRyYWNlLm1ldHJpY3MudG90YWwgOiAwO1xuXG4gICAgc2VsZi5tYXhUb3RhbHNba2luZF0gPSBzZWxmLm1heFRvdGFsc1traW5kXSB8fCBbXTtcbiAgICAvL2FkZCB0aGUgY3VycmVudCBtYXhQb2ludFxuICAgIHNlbGYubWF4VG90YWxzW2tpbmRdLnB1c2goY3VycmVudE1heFRvdGFsKTtcbiAgICB2YXIgZXhjZWVkaW5nUG9pbnRzID0gc2VsZi5tYXhUb3RhbHNba2luZF0ubGVuZ3RoIC0gc2VsZi5tYXhUb3RhbFBvaW50cztcbiAgICBpZihleGNlZWRpbmdQb2ludHMgPiAwKSB7XG4gICAgICBzZWxmLm1heFRvdGFsc1traW5kXS5zcGxpY2UoMCwgZXhjZWVkaW5nUG9pbnRzKTtcbiAgICB9XG5cbiAgICB2YXIgYXJjaGl2ZURlZmF1bHQgPSAoc2VsZi5wcm9jZXNzZWRDbnRba2luZF0gJSBzZWxmLmFyY2hpdmVFdmVyeSkgPT0gMDtcbiAgICBzZWxmLnByb2Nlc3NlZENudFtraW5kXSsrO1xuXG4gICAgdmFyIGNhbkFyY2hpdmUgPSBhcmNoaXZlRGVmYXVsdFxuICAgICAgfHwgc2VsZi5faXNUcmFjZU91dGxpZXIoa2luZCwgY3VycmVudE1heFRyYWNlKTtcblxuICAgIGlmKGNhbkFyY2hpdmUgJiYgY3VycmVudE1heFRyYWNlKSB7XG4gICAgICBzZWxmLnRyYWNlQXJjaGl2ZS5wdXNoKGN1cnJlbnRNYXhUcmFjZSk7XG4gICAgfVxuXG4gICAgLy9yZXNldCBjdXJyZW50TWF4VHJhY2VcbiAgICBzZWxmLmN1cnJlbnRNYXhUcmFjZVtraW5kXSA9IG51bGw7XG4gIH0pO1xuXG4gIC8vcmVzZXQgdGhlIGVycm9yTWFwXG4gIHNlbGYuZXJyb3JNYXAgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xufTtcblxuVHJhY2VyU3RvcmUucHJvdG90eXBlLl9pc1RyYWNlT3V0bGllciA9IGZ1bmN0aW9uKGtpbmQsIHRyYWNlKSB7XG4gIGlmKHRyYWNlKSB7XG4gICAgdmFyIGRhdGFTZXQgPSB0aGlzLm1heFRvdGFsc1traW5kXTtcbiAgICByZXR1cm4gdGhpcy5faXNPdXRsaWVyKGRhdGFTZXQsIHRyYWNlLm1ldHJpY3MudG90YWwsIDMpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufTtcblxuLypcbiAgRGF0YSBwb2ludCBtdXN0IGV4aXN0cyBpbiB0aGUgZGF0YVNldFxuKi9cblRyYWNlclN0b3JlLnByb3RvdHlwZS5faXNPdXRsaWVyID0gZnVuY3Rpb24oZGF0YVNldCwgZGF0YVBvaW50LCBtYXhNYWRaKSB7XG4gIHZhciBtZWRpYW4gPSB0aGlzLl9nZXRNZWRpYW4oZGF0YVNldCk7XG4gIHZhciBtYWQgPSB0aGlzLl9jYWxjdWxhdGVNYWQoZGF0YVNldCwgbWVkaWFuKTtcbiAgdmFyIG1hZFogPSB0aGlzLl9mdW5jTWVkaWFuRGV2aWF0aW9uKG1lZGlhbikoZGF0YVBvaW50KSAvIG1hZDtcblxuICByZXR1cm4gbWFkWiA+IG1heE1hZFo7XG59O1xuXG5UcmFjZXJTdG9yZS5wcm90b3R5cGUuX2dldE1lZGlhbiA9IGZ1bmN0aW9uKGRhdGFTZXQpIHtcbiAgdmFyIHNvcnRlZERhdGFTZXQgPSBfLmNsb25lKGRhdGFTZXQpLnNvcnQoZnVuY3Rpb24oYSwgYikge1xuICAgIHJldHVybiBhLWI7XG4gIH0pO1xuICByZXR1cm4gdGhpcy5fcGlja1F1YXJ0aWxlKHNvcnRlZERhdGFTZXQsIDIpO1xufTtcblxuVHJhY2VyU3RvcmUucHJvdG90eXBlLl9waWNrUXVhcnRpbGUgPSBmdW5jdGlvbihkYXRhU2V0LCBudW0pIHtcbiAgdmFyIHBvcyA9ICgoZGF0YVNldC5sZW5ndGggKyAxKSAqIG51bSkgLyA0O1xuICBpZihwb3MgJSAxID09IDApIHtcbiAgICByZXR1cm4gZGF0YVNldFtwb3MgLTFdO1xuICB9IGVsc2Uge1xuICAgIHBvcyA9IHBvcyAtIChwb3MgJSAxKTtcbiAgICByZXR1cm4gKGRhdGFTZXRbcG9zIC0xXSArIGRhdGFTZXRbcG9zXSkvMlxuICB9XG59O1xuXG5UcmFjZXJTdG9yZS5wcm90b3R5cGUuX2NhbGN1bGF0ZU1hZCA9IGZ1bmN0aW9uKGRhdGFTZXQsIG1lZGlhbikge1xuICB2YXIgbWVkaWFuRGV2aWF0aW9ucyA9IF8ubWFwKGRhdGFTZXQsIHRoaXMuX2Z1bmNNZWRpYW5EZXZpYXRpb24obWVkaWFuKSk7XG4gIHZhciBtYWQgPSB0aGlzLl9nZXRNZWRpYW4obWVkaWFuRGV2aWF0aW9ucyk7XG5cbiAgcmV0dXJuIG1hZDtcbn07XG5cblRyYWNlclN0b3JlLnByb3RvdHlwZS5fZnVuY01lZGlhbkRldmlhdGlvbiA9IGZ1bmN0aW9uKG1lZGlhbikge1xuICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgIHJldHVybiBNYXRoLmFicyhtZWRpYW4gLSB4KTtcbiAgfTtcbn07XG5cblRyYWNlclN0b3JlLnByb3RvdHlwZS5fZ2V0TWVhbiA9IGZ1bmN0aW9uKGRhdGFQb2ludHMpIHtcbiAgaWYoZGF0YVBvaW50cy5sZW5ndGggPiAwKSB7XG4gICAgdmFyIHRvdGFsID0gMDtcbiAgICBkYXRhUG9pbnRzLmZvckVhY2goZnVuY3Rpb24ocG9pbnQpIHtcbiAgICAgIHRvdGFsICs9IHBvaW50O1xuICAgIH0pO1xuICAgIHJldHVybiB0b3RhbC9kYXRhUG9pbnRzLmxlbmd0aDtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gMDtcbiAgfVxufTtcbiIsInZhciBMUlUgPSBOcG0ucmVxdWlyZSgnbHJ1LWNhY2hlJyk7XG52YXIgY3J5cHRvID0gTnBtLnJlcXVpcmUoJ2NyeXB0bycpO1xudmFyIGpzb25TdHJpbmdpZnkgPSBOcG0ucmVxdWlyZSgnanNvbi1zdHJpbmdpZnktc2FmZScpO1xuXG5Eb2NTekNhY2hlID0gZnVuY3Rpb24gKG1heEl0ZW1zLCBtYXhWYWx1ZXMpIHtcbiAgdGhpcy5pdGVtcyA9IG5ldyBMUlUoe21heDogbWF4SXRlbXN9KTtcbiAgdGhpcy5tYXhWYWx1ZXMgPSBtYXhWYWx1ZXM7XG4gIHRoaXMuY3B1VXNhZ2UgPSAwO1xufVxuXG4vLyBUaGlzIGlzIGNhbGxlZCBmcm9tIFN5c3RlbU1vZGVsLnByb3RvdHlwZS5nZXRVc2FnZSBhbmQgc2F2ZXMgY3B1IHVzYWdlLlxuRG9jU3pDYWNoZS5wcm90b3R5cGUuc2V0UGNwdSA9IGZ1bmN0aW9uIChwY3B1KSB7XG4gIHRoaXMuY3B1VXNhZ2UgPSBwY3B1O1xufTtcblxuRG9jU3pDYWNoZS5wcm90b3R5cGUuZ2V0U2l6ZSA9IGZ1bmN0aW9uIChjb2xsLCBxdWVyeSwgb3B0cywgZGF0YSkge1xuICAvLyBJZiB0aGUgZGF0YXNldCBpcyBudWxsIG9yIGVtcHR5IHdlIGNhbid0IGNhbGN1bGF0ZSB0aGUgc2l6ZVxuICAvLyBEbyBub3QgcHJvY2VzcyB0aGlzIGRhdGEgYW5kIHJldHVybiAwIGFzIHRoZSBkb2N1bWVudCBzaXplLlxuICBpZiAoIShkYXRhICYmIChkYXRhLmxlbmd0aCB8fCBkYXRhLnNpemUpKSkge1xuICAgIHJldHVybiAwO1xuICB9XG5cbiAgdmFyIGtleSA9IHRoaXMuZ2V0S2V5KGNvbGwsIHF1ZXJ5LCBvcHRzKTtcbiAgdmFyIGl0ZW0gPSB0aGlzLml0ZW1zLmdldChrZXkpO1xuXG4gIGlmICghaXRlbSkge1xuICAgIGl0ZW0gPSBuZXcgRG9jU3pDYWNoZUl0ZW0odGhpcy5tYXhWYWx1ZXMpO1xuICAgIHRoaXMuaXRlbXMuc2V0KGtleSwgaXRlbSk7XG4gIH1cblxuICBpZiAodGhpcy5uZWVkc1VwZGF0ZShpdGVtKSkge1xuICAgIHZhciBkb2MgPSB7fTtcbiAgICBpZih0eXBlb2YgZGF0YS5nZXQgPT09ICdmdW5jdGlvbicpe1xuICAgICAgLy8gVGhpcyBpcyBhbiBJZE1hcFxuICAgICAgZGF0YS5mb3JFYWNoKGZ1bmN0aW9uKGVsZW1lbnQpe1xuICAgICAgICBkb2MgPSBlbGVtZW50O1xuICAgICAgICByZXR1cm4gZmFsc2U7IC8vIHJldHVybiBmYWxzZSB0byBzdG9wIGxvb3AuIFdlIG9ubHkgbmVlZCBvbmUgZG9jLlxuICAgICAgfSlcbiAgICB9IGVsc2Uge1xuICAgICAgZG9jID0gZGF0YVswXTtcbiAgICB9XG4gICAgdmFyIHNpemUgPSBCdWZmZXIuYnl0ZUxlbmd0aChqc29uU3RyaW5naWZ5KGRvYyksICd1dGY4Jyk7XG4gICAgaXRlbS5hZGREYXRhKHNpemUpO1xuICB9XG5cbiAgcmV0dXJuIGl0ZW0uZ2V0VmFsdWUoKTtcbn07XG5cbkRvY1N6Q2FjaGUucHJvdG90eXBlLmdldEtleSA9IGZ1bmN0aW9uIChjb2xsLCBxdWVyeSwgb3B0cykge1xuICByZXR1cm4ganNvblN0cmluZ2lmeShbY29sbCwgcXVlcnksIG9wdHNdKTtcbn07XG5cbi8vIHJldHVybnMgYSBzY29yZSBiZXR3ZWVuIDAgYW5kIDEgZm9yIGEgY2FjaGUgaXRlbVxuLy8gdGhpcyBzY29yZSBpcyBkZXRlcm1pbmVkIGJ5OlxuLy8gICogYXZhaWxhbGJlIGNhY2hlIGl0ZW0gc2xvdHNcbi8vICAqIHRpbWUgc2luY2UgbGFzdCB1cGRhdGVkXG4vLyAgKiBjcHUgdXNhZ2Ugb2YgdGhlIGFwcGxpY2F0aW9uXG5Eb2NTekNhY2hlLnByb3RvdHlwZS5nZXRJdGVtU2NvcmUgPSBmdW5jdGlvbiAoaXRlbSkge1xuICByZXR1cm4gW1xuICAgIChpdGVtLm1heFZhbHVlcyAtIGl0ZW0udmFsdWVzLmxlbmd0aCkvaXRlbS5tYXhWYWx1ZXMsXG4gICAgKERhdGUubm93KCkgLSBpdGVtLnVwZGF0ZWQpIC8gNjAwMDAsXG4gICAgKDEwMCAtIHRoaXMuY3B1VXNhZ2UpIC8gMTAwLFxuICBdLm1hcChmdW5jdGlvbiAoc2NvcmUpIHtcbiAgICByZXR1cm4gc2NvcmUgPiAxID8gMSA6IHNjb3JlO1xuICB9KS5yZWR1Y2UoZnVuY3Rpb24gKHRvdGFsLCBzY29yZSkge1xuICAgIHJldHVybiAodG90YWwgfHwgMCkgKyBzY29yZTtcbiAgfSkgLyAzO1xufTtcblxuRG9jU3pDYWNoZS5wcm90b3R5cGUubmVlZHNVcGRhdGUgPSBmdW5jdGlvbiAoaXRlbSkge1xuICAvLyBoYW5kbGUgbmV3bHkgbWFkZSBpdGVtc1xuICBpZiAoIWl0ZW0udmFsdWVzLmxlbmd0aCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgdmFyIGN1cnJlbnRUaW1lID0gRGF0ZS5ub3coKTtcbiAgdmFyIHRpbWVTaW5jZVVwZGF0ZSA9IGN1cnJlbnRUaW1lIC0gaXRlbS51cGRhdGVkO1xuICBpZiAodGltZVNpbmNlVXBkYXRlID4gMTAwMCo2MCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcmV0dXJuIHRoaXMuZ2V0SXRlbVNjb3JlKGl0ZW0pID4gMC41O1xufTtcblxuXG5Eb2NTekNhY2hlSXRlbSA9IGZ1bmN0aW9uIChtYXhWYWx1ZXMpIHtcbiAgdGhpcy5tYXhWYWx1ZXMgPSBtYXhWYWx1ZXM7XG4gIHRoaXMudXBkYXRlZCA9IDA7XG4gIHRoaXMudmFsdWVzID0gW107XG59XG5cbkRvY1N6Q2FjaGVJdGVtLnByb3RvdHlwZS5hZGREYXRhID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gIHRoaXMudmFsdWVzLnB1c2godmFsdWUpO1xuICB0aGlzLnVwZGF0ZWQgPSBEYXRlLm5vdygpO1xuXG4gIGlmICh0aGlzLnZhbHVlcy5sZW5ndGggPiB0aGlzLm1heFZhbHVlcykge1xuICAgIHRoaXMudmFsdWVzLnNoaWZ0KCk7XG4gIH1cbn07XG5cbkRvY1N6Q2FjaGVJdGVtLnByb3RvdHlwZS5nZXRWYWx1ZSA9IGZ1bmN0aW9uICgpIHtcbiAgZnVuY3Rpb24gc29ydE51bWJlcihhLCBiKSB7XG4gICAgcmV0dXJuIGEgLSBiO1xuICB9XG4gIHZhciBzb3J0ZWQgPSB0aGlzLnZhbHVlcy5zb3J0KHNvcnROdW1iZXIpO1xuICB2YXIgbWVkaWFuID0gMDtcblxuICBpZiAoc29ydGVkLmxlbmd0aCAlIDIgPT09IDApIHtcbiAgICB2YXIgaWR4ID0gc29ydGVkLmxlbmd0aCAvIDI7XG4gICAgbWVkaWFuID0gKHNvcnRlZFtpZHhdICsgc29ydGVkW2lkeC0xXSkgLyAyO1xuICB9IGVsc2Uge1xuICAgIHZhciBpZHggPSBNYXRoLmZsb29yKHNvcnRlZC5sZW5ndGggLyAyKTtcbiAgICBtZWRpYW4gPSBzb3J0ZWRbaWR4XTtcbiAgfVxuXG4gIHJldHVybiBtZWRpYW47XG59O1xuIiwidmFyIGhvc3RuYW1lID0gTnBtLnJlcXVpcmUoJ29zJykuaG9zdG5hbWUoKTtcbnZhciBsb2dnZXIgPSBOcG0ucmVxdWlyZSgnZGVidWcnKSgna2FkaXJhOmFwbScpO1xudmFyIEZpYmVycyA9IE5wbS5yZXF1aXJlKCdmaWJlcnMnKTtcblxudmFyIEthZGlyYUNvcmUgPSBOcG0ucmVxdWlyZSgna2FkaXJhLWNvcmUnKS5LYWRpcmE7XG5cbkthZGlyYS5tb2RlbHMgPSB7fTtcbkthZGlyYS5vcHRpb25zID0ge307XG5LYWRpcmEuZW52ID0ge1xuICBjdXJyZW50U3ViOiBudWxsLCAvLyBrZWVwIGN1cnJlbnQgc3Vic2NyaXB0aW9uIGluc2lkZSBkZHBcbiAga2FkaXJhSW5mbzogbmV3IE1ldGVvci5FbnZpcm9ubWVudFZhcmlhYmxlKCksXG59O1xuS2FkaXJhLndhaXRUaW1lQnVpbGRlciA9IG5ldyBXYWl0VGltZUJ1aWxkZXIoKTtcbkthZGlyYS5lcnJvcnMgPSBbXTtcbkthZGlyYS5lcnJvcnMuYWRkRmlsdGVyID0gS2FkaXJhLmVycm9ycy5wdXNoLmJpbmQoS2FkaXJhLmVycm9ycyk7XG5cbkthZGlyYS5tb2RlbHMubWV0aG9kcyA9IG5ldyBNZXRob2RzTW9kZWwoKTtcbkthZGlyYS5tb2RlbHMucHVic3ViID0gbmV3IFB1YnN1Yk1vZGVsKCk7XG5LYWRpcmEubW9kZWxzLnN5c3RlbSA9IG5ldyBTeXN0ZW1Nb2RlbCgpO1xuS2FkaXJhLmRvY1N6Q2FjaGUgPSBuZXcgRG9jU3pDYWNoZSgxMDAwMDAsIDEwKTtcblxuXG5LYWRpcmEuY29ubmVjdCA9IGZ1bmN0aW9uKGFwcElkLCBhcHBTZWNyZXQsIG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIG9wdGlvbnMuYXBwSWQgPSBhcHBJZDtcbiAgb3B0aW9ucy5hcHBTZWNyZXQgPSBhcHBTZWNyZXQ7XG4gIG9wdGlvbnMucGF5bG9hZFRpbWVvdXQgPSBvcHRpb25zLnBheWxvYWRUaW1lb3V0IHx8IDEwMDAgKiAyMDtcbiAgb3B0aW9ucy5lbmRwb2ludCA9IG9wdGlvbnMuZW5kcG9pbnQgfHwgXCJodHRwczovL2VuZ2luZXgua2FkaXJhLmlvXCI7XG4gIG9wdGlvbnMuY2xpZW50RW5naW5lU3luY0RlbGF5ID0gb3B0aW9ucy5jbGllbnRFbmdpbmVTeW5jRGVsYXkgfHwgMTAwMDA7XG4gIG9wdGlvbnMudGhyZXNob2xkcyA9IG9wdGlvbnMudGhyZXNob2xkcyB8fCB7fTtcbiAgb3B0aW9ucy5pc0hvc3ROYW1lU2V0ID0gISFvcHRpb25zLmhvc3RuYW1lO1xuICBvcHRpb25zLmhvc3RuYW1lID0gb3B0aW9ucy5ob3N0bmFtZSB8fCBob3N0bmFtZTtcbiAgb3B0aW9ucy5wcm94eSA9IG9wdGlvbnMucHJveHkgfHwgbnVsbDtcblxuICBpZihvcHRpb25zLmRvY3VtZW50U2l6ZUNhY2hlU2l6ZSkge1xuICAgIEthZGlyYS5kb2NTekNhY2hlID0gbmV3IERvY1N6Q2FjaGUob3B0aW9ucy5kb2N1bWVudFNpemVDYWNoZVNpemUsIDEwKTtcbiAgfVxuXG4gIC8vIHJlbW92ZSB0cmFpbGluZyBzbGFzaCBmcm9tIGVuZHBvaW50IHVybCAoaWYgYW55KVxuICBpZihfLmxhc3Qob3B0aW9ucy5lbmRwb2ludCkgPT09ICcvJykge1xuICAgIG9wdGlvbnMuZW5kcG9pbnQgPSBvcHRpb25zLmVuZHBvaW50LnN1YnN0cigwLCBvcHRpb25zLmVuZHBvaW50Lmxlbmd0aCAtIDEpO1xuICB9XG5cbiAgLy8gZXJyb3IgdHJhY2tpbmcgaXMgZW5hYmxlZCBieSBkZWZhdWx0XG4gIGlmKG9wdGlvbnMuZW5hYmxlRXJyb3JUcmFja2luZyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgb3B0aW9ucy5lbmFibGVFcnJvclRyYWNraW5nID0gdHJ1ZTtcbiAgfVxuXG4gIEthZGlyYS5vcHRpb25zID0gb3B0aW9ucztcbiAgS2FkaXJhLm9wdGlvbnMuYXV0aEhlYWRlcnMgPSB7XG4gICAgJ0tBRElSQS1BUFAtSUQnOiBLYWRpcmEub3B0aW9ucy5hcHBJZCxcbiAgICAnS0FESVJBLUFQUC1TRUNSRVQnOiBLYWRpcmEub3B0aW9ucy5hcHBTZWNyZXRcbiAgfTtcblxuICBLYWRpcmEuc3luY2VkRGF0ZSA9IG5ldyBOdHAob3B0aW9ucy5lbmRwb2ludCk7XG4gIEthZGlyYS5zeW5jZWREYXRlLnN5bmMoKTtcbiAgS2FkaXJhLm1vZGVscy5lcnJvciA9IG5ldyBFcnJvck1vZGVsKGFwcElkKTtcblxuICAvLyBoYW5kbGUgcHJlLWFkZGVkIGZpbHRlcnNcbiAgdmFyIGFkZEZpbHRlckZuID0gS2FkaXJhLm1vZGVscy5lcnJvci5hZGRGaWx0ZXIuYmluZChLYWRpcmEubW9kZWxzLmVycm9yKTtcbiAgS2FkaXJhLmVycm9ycy5mb3JFYWNoKGFkZEZpbHRlckZuKTtcbiAgS2FkaXJhLmVycm9ycyA9IEthZGlyYS5tb2RlbHMuZXJyb3I7XG5cbiAgLy8gc2V0dGluZyBydW50aW1lIGluZm8sIHdoaWNoIHdpbGwgYmUgc2VudCB0byBrYWRpcmFcbiAgX19tZXRlb3JfcnVudGltZV9jb25maWdfXy5rYWRpcmEgPSB7XG4gICAgYXBwSWQ6IGFwcElkLFxuICAgIGVuZHBvaW50OiBvcHRpb25zLmVuZHBvaW50LFxuICAgIGNsaWVudEVuZ2luZVN5bmNEZWxheTogb3B0aW9ucy5jbGllbnRFbmdpbmVTeW5jRGVsYXksXG4gIH07XG5cbiAgaWYob3B0aW9ucy5lbmFibGVFcnJvclRyYWNraW5nKSB7XG4gICAgS2FkaXJhLmVuYWJsZUVycm9yVHJhY2tpbmcoKTtcbiAgfSBlbHNlIHtcbiAgICBLYWRpcmEuZGlzYWJsZUVycm9yVHJhY2tpbmcoKTtcbiAgfVxuXG4gIGlmKGFwcElkICYmIGFwcFNlY3JldCkge1xuICAgIG9wdGlvbnMuYXBwSWQgPSBvcHRpb25zLmFwcElkLnRyaW0oKTtcbiAgICBvcHRpb25zLmFwcFNlY3JldCA9IG9wdGlvbnMuYXBwU2VjcmV0LnRyaW0oKTtcblxuICAgIEthZGlyYS5jb3JlQXBpID0gbmV3IEthZGlyYUNvcmUoe1xuICAgICAgYXBwSWQ6IG9wdGlvbnMuYXBwSWQsXG4gICAgICBhcHBTZWNyZXQ6IG9wdGlvbnMuYXBwU2VjcmV0LFxuICAgICAgZW5kcG9pbnQ6IG9wdGlvbnMuZW5kcG9pbnQsXG4gICAgICBob3N0bmFtZTogb3B0aW9ucy5ob3N0bmFtZVxuICAgIH0pO1xuXG4gICAgS2FkaXJhLmNvcmVBcGkuX2NoZWNrQXV0aCgpXG4gICAgICAudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgbG9nZ2VyKCdjb25uZWN0ZWQgdG8gYXBwOiAnLCBhcHBJZCk7XG4gICAgICAgIGNvbnNvbGUubG9nKCdNZXRlb3IgQVBNOiBTdWNjZXNzZnVsbHkgY29ubmVjdGVkJyk7XG4gICAgICAgIEthZGlyYS5fc2VuZEFwcFN0YXRzKCk7XG4gICAgICAgIEthZGlyYS5fc2NoZWR1bGVQYXlsb2FkU2VuZCgpO1xuICAgICAgfSlcbiAgICAgIC5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ01ldGVvciBBUE06IGF1dGhlbnRpY2F0aW9uIGZhaWxlZCAtIGNoZWNrIHlvdXIgYXBwSWQgJiBhcHBTZWNyZXQnKVxuICAgICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRlb3IgQVBNOiByZXF1aXJlZCBhcHBJZCBhbmQgYXBwU2VjcmV0Jyk7XG4gIH1cblxuICAvLyBzdGFydCB0cmFja2luZyBlcnJvcnNcbiAgTWV0ZW9yLnN0YXJ0dXAoZnVuY3Rpb24gKCkge1xuICAgIFRyYWNrVW5jYXVnaHRFeGNlcHRpb25zKCk7XG4gICAgVHJhY2tNZXRlb3JEZWJ1ZygpO1xuICB9KVxuXG4gIE1ldGVvci5wdWJsaXNoKG51bGwsIGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgb3B0aW9ucyA9IF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18ua2FkaXJhO1xuICAgIHRoaXMuYWRkZWQoJ2thZGlyYV9zZXR0aW5ncycsIFJhbmRvbS5pZCgpLCBvcHRpb25zKTtcbiAgICB0aGlzLnJlYWR5KCk7XG4gIH0pO1xuXG4gIC8vIG5vdGlmeSB3ZSd2ZSBjb25uZWN0ZWRcbiAgS2FkaXJhLmNvbm5lY3RlZCA9IHRydWU7XG59O1xuXG4vL3RyYWNrIGhvdyBtYW55IHRpbWVzIHdlJ3ZlIHNlbnQgdGhlIGRhdGEgKG9uY2UgcGVyIG1pbnV0ZSlcbkthZGlyYS5fYnVpbGRQYXlsb2FkID0gZnVuY3Rpb24gKCkge1xuICB2YXIgcGF5bG9hZCA9IHtob3N0OiBLYWRpcmEub3B0aW9ucy5ob3N0bmFtZX07XG4gIHZhciBidWlsZERldGFpbGVkSW5mbyA9IEthZGlyYS5faXNEZXRhaWxlZEluZm8oKTtcbiAgT2JqZWN0LmFzc2lnbihwYXlsb2FkLCBLYWRpcmEubW9kZWxzLm1ldGhvZHMuYnVpbGRQYXlsb2FkKGJ1aWxkRGV0YWlsZWRJbmZvKSk7XG4gIE9iamVjdC5hc3NpZ24ocGF5bG9hZCwgS2FkaXJhLm1vZGVscy5wdWJzdWIuYnVpbGRQYXlsb2FkKGJ1aWxkRGV0YWlsZWRJbmZvKSk7XG4gIE9iamVjdC5hc3NpZ24ocGF5bG9hZCwgS2FkaXJhLm1vZGVscy5zeXN0ZW0uYnVpbGRQYXlsb2FkKCkpO1xuICBpZihLYWRpcmEub3B0aW9ucy5lbmFibGVFcnJvclRyYWNraW5nKSB7XG4gICAgT2JqZWN0LmFzc2lnbihwYXlsb2FkLCBLYWRpcmEubW9kZWxzLmVycm9yLmJ1aWxkUGF5bG9hZCgpKTtcbiAgfVxuXG4gIHJldHVybiBwYXlsb2FkO1xufVxuXG5LYWRpcmEuX2NvdW50RGF0YVNlbnQgPSAwO1xuS2FkaXJhLl9kZXRhaWxJbmZvU2VudEludGVydmFsID0gTWF0aC5jZWlsKCgxMDAwKjYwKSAvIEthZGlyYS5vcHRpb25zLnBheWxvYWRUaW1lb3V0KTtcbkthZGlyYS5faXNEZXRhaWxlZEluZm8gPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiAoS2FkaXJhLl9jb3VudERhdGFTZW50KysgJSBLYWRpcmEuX2RldGFpbEluZm9TZW50SW50ZXJ2YWwpID09IDA7XG59XG5cbkthZGlyYS5fc2VuZEFwcFN0YXRzID0gZnVuY3Rpb24gKCkge1xuICB2YXIgYXBwU3RhdHMgPSB7fTtcbiAgYXBwU3RhdHMucmVsZWFzZSA9IE1ldGVvci5yZWxlYXNlO1xuICBhcHBTdGF0cy5wcm90b2NvbFZlcnNpb24gPSAnMS4wLjAnO1xuICBhcHBTdGF0cy5wYWNrYWdlVmVyc2lvbnMgPSBbXTtcbiAgYXBwU3RhdHMuYXBwVmVyc2lvbnMgPSB7XG4gICAgd2ViYXBwOiBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fWydhdXRvdXBkYXRlVmVyc2lvbiddLFxuICAgIHJlZnJlc2hhYmxlOiBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fWydhdXRvdXBkYXRlVmVyc2lvblJlZnJlc2hhYmxlJ10sXG4gICAgY29yZG92YTogX19tZXRlb3JfcnVudGltZV9jb25maWdfX1snYXV0b3VwZGF0ZVZlcnNpb25Db3Jkb3ZhJ11cbiAgfVxuXG4gIC8vIFRPRE8gZ2V0IHZlcnNpb24gbnVtYmVyIGZvciBpbnN0YWxsZWQgcGFja2FnZXNcbiAgXy5lYWNoKFBhY2thZ2UsIGZ1bmN0aW9uICh2LCBuYW1lKSB7XG4gICAgYXBwU3RhdHMucGFja2FnZVZlcnNpb25zLnB1c2goe25hbWU6IG5hbWUsIHZlcnNpb246IG51bGx9KTtcbiAgfSk7XG5cbiAgS2FkaXJhLmNvcmVBcGkuc2VuZERhdGEoe1xuICAgIHN0YXJ0VGltZTogbmV3IERhdGUoKSxcbiAgICBhcHBTdGF0czogYXBwU3RhdHNcbiAgfSkuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XG4gICAgY29uc29sZS5lcnJvcignS2FkaXJhIEVycm9yIG9uIHNlbmRpbmcgYXBwU3RhdHM6JywgZXJyLm1lc3NhZ2UpO1xuICB9KTtcbn1cblxuS2FkaXJhLl9zY2hlZHVsZVBheWxvYWRTZW5kID0gZnVuY3Rpb24gKCkge1xuICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICBLYWRpcmEuX3NlbmRQYXlsb2FkKEthZGlyYS5fc2NoZWR1bGVQYXlsb2FkU2VuZCk7XG4gIH0sIEthZGlyYS5vcHRpb25zLnBheWxvYWRUaW1lb3V0KTtcbn1cblxuS2FkaXJhLl9zZW5kUGF5bG9hZCA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICBuZXcgRmliZXJzKGZ1bmN0aW9uKCkge1xuICAgIHZhciBwYXlsb2FkID0gS2FkaXJhLl9idWlsZFBheWxvYWQoKTtcbiAgICBLYWRpcmEuY29yZUFwaS5zZW5kRGF0YShwYXlsb2FkKVxuICAgIC50aGVuKGNhbGxiYWNrKVxuICAgIC5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdNZXRlb3IgQVBNIEVycm9yOicsIGVyci5tZXNzYWdlKTtcbiAgICAgIGNhbGxiYWNrKCk7XG4gICAgfSk7XG4gIH0pLnJ1bigpO1xufVxuXG4vLyB0aGlzIHJldHVybiB0aGUgX19rYWRpcmFJbmZvIGZyb20gdGhlIGN1cnJlbnQgRmliZXIgYnkgZGVmYXVsdFxuLy8gaWYgY2FsbGVkIHdpdGggMm5kIGFyZ3VtZW50IGFzIHRydWUsIGl0IHdpbGwgZ2V0IHRoZSBrYWRpcmEgaW5mbyBmcm9tXG4vLyBNZXRlb3IuRW52aXJvbm1lbnRWYXJpYWJsZVxuLy9cbi8vIFdBUk5JTkc6IHJldHVybmVkIGluZm8gb2JqZWN0IGlzIHRoZSByZWZlcmVuY2Ugb2JqZWN0LlxuLy8gIENoYW5naW5nIGl0IG1pZ2h0IGNhdXNlIGlzc3VlcyB3aGVuIGJ1aWxkaW5nIHRyYWNlcy4gU28gdXNlIHdpdGggY2FyZVxuS2FkaXJhLl9nZXRJbmZvID0gZnVuY3Rpb24oY3VycmVudEZpYmVyLCB1c2VFbnZpcm9ubWVudFZhcmlhYmxlKSB7XG4gIGN1cnJlbnRGaWJlciA9IGN1cnJlbnRGaWJlciB8fCBGaWJlcnMuY3VycmVudDtcbiAgaWYoY3VycmVudEZpYmVyKSB7XG4gICAgaWYodXNlRW52aXJvbm1lbnRWYXJpYWJsZSkge1xuICAgICAgcmV0dXJuIEthZGlyYS5lbnYua2FkaXJhSW5mby5nZXQoKTtcbiAgICB9XG4gICAgcmV0dXJuIGN1cnJlbnRGaWJlci5fX2thZGlyYUluZm87XG4gIH1cbn07XG5cbi8vIHRoaXMgZG9lcyBub3QgY2xvbmUgdGhlIGluZm8gb2JqZWN0LiBTbywgdXNlIHdpdGggY2FyZVxuS2FkaXJhLl9zZXRJbmZvID0gZnVuY3Rpb24oaW5mbykge1xuICBGaWJlcnMuY3VycmVudC5fX2thZGlyYUluZm8gPSBpbmZvO1xufTtcblxuS2FkaXJhLmVuYWJsZUVycm9yVHJhY2tpbmcgPSBmdW5jdGlvbiAoKSB7XG4gIF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18ua2FkaXJhLmVuYWJsZUVycm9yVHJhY2tpbmcgPSB0cnVlO1xuICBLYWRpcmEub3B0aW9ucy5lbmFibGVFcnJvclRyYWNraW5nID0gdHJ1ZTtcbn07XG5cbkthZGlyYS5kaXNhYmxlRXJyb3JUcmFja2luZyA9IGZ1bmN0aW9uICgpIHtcbiAgX19tZXRlb3JfcnVudGltZV9jb25maWdfXy5rYWRpcmEuZW5hYmxlRXJyb3JUcmFja2luZyA9IGZhbHNlO1xuICBLYWRpcmEub3B0aW9ucy5lbmFibGVFcnJvclRyYWNraW5nID0gZmFsc2U7XG59O1xuXG5LYWRpcmEudHJhY2tFcnJvciA9IGZ1bmN0aW9uICh0eXBlLCBtZXNzYWdlLCBvcHRpb25zKSB7XG4gIGlmKEthZGlyYS5vcHRpb25zLmVuYWJsZUVycm9yVHJhY2tpbmcgJiYgdHlwZSAmJiBtZXNzYWdlKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgb3B0aW9ucy5zdWJUeXBlID0gb3B0aW9ucy5zdWJUeXBlIHx8ICdzZXJ2ZXInO1xuICAgIG9wdGlvbnMuc3RhY2tzID0gb3B0aW9ucy5zdGFja3MgfHwgJyc7XG4gICAgdmFyIGVycm9yID0ge21lc3NhZ2U6IG1lc3NhZ2UsIHN0YWNrOiBvcHRpb25zLnN0YWNrc307XG4gICAgdmFyIHRyYWNlID0ge1xuICAgICAgdHlwZTogdHlwZSxcbiAgICAgIHN1YlR5cGU6IG9wdGlvbnMuc3ViVHlwZSxcbiAgICAgIG5hbWU6IG1lc3NhZ2UsXG4gICAgICBlcnJvcmVkOiB0cnVlLFxuICAgICAgYXQ6IEthZGlyYS5zeW5jZWREYXRlLmdldFRpbWUoKSxcbiAgICAgIGV2ZW50czogW1snc3RhcnQnLCAwLCB7fV0sIFsnZXJyb3InLCAwLCB7ZXJyb3I6IGVycm9yfV1dLFxuICAgICAgbWV0cmljczoge3RvdGFsOiAwfVxuICAgIH07XG4gICAgS2FkaXJhLm1vZGVscy5lcnJvci50cmFja0Vycm9yKGVycm9yLCB0cmFjZSk7XG4gIH1cbn1cblxuS2FkaXJhLmlnbm9yZUVycm9yVHJhY2tpbmcgPSBmdW5jdGlvbiAoZXJyKSB7XG4gIGVyci5fc2tpcEthZGlyYSA9IHRydWU7XG59XG4iLCJ2YXIgRmliZXIgPSBOcG0ucmVxdWlyZSgnZmliZXJzJyk7XG5cbndyYXBTZXJ2ZXIgPSBmdW5jdGlvbihzZXJ2ZXJQcm90bykge1xuICB2YXIgb3JpZ2luYWxIYW5kbGVDb25uZWN0ID0gc2VydmVyUHJvdG8uX2hhbmRsZUNvbm5lY3RcbiAgc2VydmVyUHJvdG8uX2hhbmRsZUNvbm5lY3QgPSBmdW5jdGlvbihzb2NrZXQsIG1zZykge1xuICAgIG9yaWdpbmFsSGFuZGxlQ29ubmVjdC5jYWxsKHRoaXMsIHNvY2tldCwgbXNnKTtcbiAgICB2YXIgc2Vzc2lvbiA9IHNvY2tldC5fbWV0ZW9yU2Vzc2lvbjtcbiAgICAvLyBzb21ldGltZXMgaXQgaXMgcG9zc2libGUgZm9yIF9tZXRlb3JTZXNzaW9uIHRvIGJlIHVuZGVmaW5lZFxuICAgIC8vIG9uZSBzdWNoIHJlYXNvbiB3b3VsZCBiZSBpZiBERFAgdmVyc2lvbnMgYXJlIG5vdCBtYXRjaGluZ1xuICAgIC8vIGlmIHRoZW4sIHdlIHNob3VsZCBub3QgcHJvY2VzcyBpdFxuICAgIGlmKCFzZXNzaW9uKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgS2FkaXJhLkV2ZW50QnVzLmVtaXQoJ3N5c3RlbScsICdjcmVhdGVTZXNzaW9uJywgbXNnLCBzb2NrZXQuX21ldGVvclNlc3Npb24pO1xuXG4gICAgaWYoS2FkaXJhLmNvbm5lY3RlZCkge1xuICAgICAgS2FkaXJhLm1vZGVscy5zeXN0ZW0uaGFuZGxlU2Vzc2lvbkFjdGl2aXR5KG1zZywgc29ja2V0Ll9tZXRlb3JTZXNzaW9uKTtcbiAgICB9XG4gIH07XG59O1xuIiwid3JhcFNlc3Npb24gPSBmdW5jdGlvbihzZXNzaW9uUHJvdG8pIHtcbiAgdmFyIG9yaWdpbmFsUHJvY2Vzc01lc3NhZ2UgPSBzZXNzaW9uUHJvdG8ucHJvY2Vzc01lc3NhZ2U7XG4gIHNlc3Npb25Qcm90by5wcm9jZXNzTWVzc2FnZSA9IGZ1bmN0aW9uKG1zZykge1xuICAgIGlmKHRydWUpIHtcbiAgICAgIHZhciBrYWRpcmFJbmZvID0ge1xuICAgICAgICBzZXNzaW9uOiB0aGlzLmlkLFxuICAgICAgICB1c2VySWQ6IHRoaXMudXNlcklkXG4gICAgICB9O1xuXG4gICAgICBpZihtc2cubXNnID09ICdtZXRob2QnIHx8IG1zZy5tc2cgPT0gJ3N1YicpIHtcbiAgICAgICAga2FkaXJhSW5mby50cmFjZSA9IEthZGlyYS50cmFjZXIuc3RhcnQodGhpcywgbXNnKTtcbiAgICAgICAgS2FkaXJhLndhaXRUaW1lQnVpbGRlci5yZWdpc3Rlcih0aGlzLCBtc2cuaWQpO1xuXG4gICAgICAgIC8vdXNlIEpTT04gc3RyaW5naWZ5IHRvIHNhdmUgdGhlIENQVVxuICAgICAgICB2YXIgc3RhcnREYXRhID0geyB1c2VySWQ6IHRoaXMudXNlcklkLCBwYXJhbXM6IEpTT04uc3RyaW5naWZ5KG1zZy5wYXJhbXMpIH07XG4gICAgICAgIEthZGlyYS50cmFjZXIuZXZlbnQoa2FkaXJhSW5mby50cmFjZSwgJ3N0YXJ0Jywgc3RhcnREYXRhKTtcbiAgICAgICAgdmFyIHdhaXRFdmVudElkID0gS2FkaXJhLnRyYWNlci5ldmVudChrYWRpcmFJbmZvLnRyYWNlLCAnd2FpdCcsIHt9LCBrYWRpcmFJbmZvKTtcbiAgICAgICAgbXNnLl93YWl0RXZlbnRJZCA9IHdhaXRFdmVudElkO1xuICAgICAgICBtc2cuX19rYWRpcmFJbmZvID0ga2FkaXJhSW5mbztcblxuICAgICAgICBpZihtc2cubXNnID09ICdzdWInKSB7XG4gICAgICAgICAgLy8gc3RhcnQgdHJhY2tpbmcgaW5zaWRlIHByb2Nlc3NNZXNzYWdlIGFsbG93cyB1cyB0byBpbmRpY2F0ZVxuICAgICAgICAgIC8vIHdhaXQgdGltZSBhcyB3ZWxsXG4gICAgICAgICAgS2FkaXJhLkV2ZW50QnVzLmVtaXQoJ3B1YnN1YicsICdzdWJSZWNlaXZlZCcsIHRoaXMsIG1zZyk7XG4gICAgICAgICAgS2FkaXJhLm1vZGVscy5wdWJzdWIuX3RyYWNrU3ViKHRoaXMsIG1zZyk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gVXBkYXRlIHNlc3Npb24gbGFzdCBhY3RpdmUgdGltZVxuICAgICAgS2FkaXJhLkV2ZW50QnVzLmVtaXQoJ3N5c3RlbScsICdkZHBNZXNzYWdlUmVjZWl2ZWQnLCB0aGlzLCBtc2cpO1xuICAgICAgS2FkaXJhLm1vZGVscy5zeXN0ZW0uaGFuZGxlU2Vzc2lvbkFjdGl2aXR5KG1zZywgdGhpcyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG9yaWdpbmFsUHJvY2Vzc01lc3NhZ2UuY2FsbCh0aGlzLCBtc2cpO1xuICB9O1xuXG4gIC8vYWRkaW5nIHRoZSBtZXRob2QgY29udGV4dCB0byB0aGUgY3VycmVudCBmaWJlclxuICB2YXIgb3JpZ2luYWxNZXRob2RIYW5kbGVyID0gc2Vzc2lvblByb3RvLnByb3RvY29sX2hhbmRsZXJzLm1ldGhvZDtcbiAgc2Vzc2lvblByb3RvLnByb3RvY29sX2hhbmRsZXJzLm1ldGhvZCA9IGZ1bmN0aW9uKG1zZywgdW5ibG9jaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAvL2FkZCBjb250ZXh0XG4gICAgdmFyIGthZGlyYUluZm8gPSBtc2cuX19rYWRpcmFJbmZvO1xuICAgIGlmKGthZGlyYUluZm8pIHtcbiAgICAgIEthZGlyYS5fc2V0SW5mbyhrYWRpcmFJbmZvKTtcblxuICAgICAgLy8gZW5kIHdhaXQgZXZlbnRcbiAgICAgIHZhciB3YWl0TGlzdCA9IEthZGlyYS53YWl0VGltZUJ1aWxkZXIuYnVpbGQodGhpcywgbXNnLmlkKTtcbiAgICAgIEthZGlyYS50cmFjZXIuZXZlbnRFbmQoa2FkaXJhSW5mby50cmFjZSwgbXNnLl93YWl0RXZlbnRJZCwge3dhaXRPbjogd2FpdExpc3R9KTtcblxuICAgICAgdW5ibG9jayA9IEthZGlyYS53YWl0VGltZUJ1aWxkZXIudHJhY2tXYWl0VGltZSh0aGlzLCBtc2csIHVuYmxvY2spO1xuICAgICAgdmFyIHJlc3BvbnNlID0gS2FkaXJhLmVudi5rYWRpcmFJbmZvLndpdGhWYWx1ZShrYWRpcmFJbmZvLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBvcmlnaW5hbE1ldGhvZEhhbmRsZXIuY2FsbChzZWxmLCBtc2csIHVuYmxvY2spO1xuICAgICAgfSk7XG4gICAgICB1bmJsb2NrKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciByZXNwb25zZSA9IG9yaWdpbmFsTWV0aG9kSGFuZGxlci5jYWxsKHNlbGYsIG1zZywgdW5ibG9jayk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3BvbnNlO1xuICB9O1xuXG4gIC8vdG8gY2FwdHVyZSB0aGUgY3VycmVudGx5IHByb2Nlc3NpbmcgbWVzc2FnZVxuICB2YXIgb3JnaW5hbFN1YkhhbmRsZXIgPSBzZXNzaW9uUHJvdG8ucHJvdG9jb2xfaGFuZGxlcnMuc3ViO1xuICBzZXNzaW9uUHJvdG8ucHJvdG9jb2xfaGFuZGxlcnMuc3ViID0gZnVuY3Rpb24obXNnLCB1bmJsb2NrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIC8vYWRkIGNvbnRleHRcbiAgICB2YXIga2FkaXJhSW5mbyA9IG1zZy5fX2thZGlyYUluZm87XG4gICAgaWYoa2FkaXJhSW5mbykge1xuICAgICAgS2FkaXJhLl9zZXRJbmZvKGthZGlyYUluZm8pO1xuXG4gICAgICAvLyBlbmQgd2FpdCBldmVudFxuICAgICAgdmFyIHdhaXRMaXN0ID0gS2FkaXJhLndhaXRUaW1lQnVpbGRlci5idWlsZCh0aGlzLCBtc2cuaWQpO1xuICAgICAgS2FkaXJhLnRyYWNlci5ldmVudEVuZChrYWRpcmFJbmZvLnRyYWNlLCBtc2cuX3dhaXRFdmVudElkLCB7d2FpdE9uOiB3YWl0TGlzdH0pO1xuXG4gICAgICB1bmJsb2NrID0gS2FkaXJhLndhaXRUaW1lQnVpbGRlci50cmFja1dhaXRUaW1lKHRoaXMsIG1zZywgdW5ibG9jayk7XG4gICAgICB2YXIgcmVzcG9uc2UgPSBLYWRpcmEuZW52LmthZGlyYUluZm8ud2l0aFZhbHVlKGthZGlyYUluZm8sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG9yZ2luYWxTdWJIYW5kbGVyLmNhbGwoc2VsZiwgbXNnLCB1bmJsb2NrKTtcbiAgICAgIH0pO1xuICAgICAgdW5ibG9jaygpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgcmVzcG9uc2UgPSBvcmdpbmFsU3ViSGFuZGxlci5jYWxsKHNlbGYsIG1zZywgdW5ibG9jayk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3BvbnNlO1xuICB9O1xuXG4gIC8vdG8gY2FwdHVyZSB0aGUgY3VycmVudGx5IHByb2Nlc3NpbmcgbWVzc2FnZVxuICB2YXIgb3JnaW5hbFVuU3ViSGFuZGxlciA9IHNlc3Npb25Qcm90by5wcm90b2NvbF9oYW5kbGVycy51bnN1YjtcbiAgc2Vzc2lvblByb3RvLnByb3RvY29sX2hhbmRsZXJzLnVuc3ViID0gZnVuY3Rpb24obXNnLCB1bmJsb2NrKSB7XG4gICAgdW5ibG9jayA9IEthZGlyYS53YWl0VGltZUJ1aWxkZXIudHJhY2tXYWl0VGltZSh0aGlzLCBtc2csIHVuYmxvY2spO1xuICAgIHZhciByZXNwb25zZSA9IG9yZ2luYWxVblN1YkhhbmRsZXIuY2FsbCh0aGlzLCBtc2csIHVuYmxvY2spO1xuICAgIHVuYmxvY2soKTtcbiAgICByZXR1cm4gcmVzcG9uc2U7XG4gIH07XG5cbiAgLy90cmFjayBtZXRob2QgZW5kaW5nICh0byBnZXQgdGhlIHJlc3VsdCBvZiBlcnJvcilcbiAgdmFyIG9yaWdpbmFsU2VuZCA9IHNlc3Npb25Qcm90by5zZW5kO1xuICBzZXNzaW9uUHJvdG8uc2VuZCA9IGZ1bmN0aW9uKG1zZykge1xuICAgIGlmKG1zZy5tc2cgPT0gJ3Jlc3VsdCcpIHtcbiAgICAgIHZhciBrYWRpcmFJbmZvID0gS2FkaXJhLl9nZXRJbmZvKCk7XG4gICAgICBpZihrYWRpcmFJbmZvKSB7XG4gICAgICAgIGlmKG1zZy5lcnJvcikge1xuICAgICAgICAgIHZhciBlcnJvciA9IF8ucGljayhtc2cuZXJyb3IsIFsnbWVzc2FnZScsICdzdGFjayddKTtcblxuICAgICAgICAgIC8vIHBpY2sgdGhlIGVycm9yIGZyb20gdGhlIHdyYXBwZWQgbWV0aG9kIGhhbmRsZXJcbiAgICAgICAgICBpZihrYWRpcmFJbmZvICYmIGthZGlyYUluZm8uY3VycmVudEVycm9yKSB7XG4gICAgICAgICAgICAvLyB0aGUgZXJyb3Igc3RhY2sgaXMgd3JhcHBlZCBzbyBNZXRlb3IuX2RlYnVnIGNhbiBpZGVudGlmeVxuICAgICAgICAgICAgLy8gdGhpcyBhcyBhIG1ldGhvZCBlcnJvci5cbiAgICAgICAgICAgIGVycm9yID0gXy5waWNrKGthZGlyYUluZm8uY3VycmVudEVycm9yLCBbJ21lc3NhZ2UnLCAnc3RhY2snXSk7XG4gICAgICAgICAgICAvLyBzZWUgd3JhcE1ldGhvZEhhbmRlckZvckVycm9ycygpIG1ldGhvZCBkZWYgZm9yIG1vcmUgaW5mb1xuICAgICAgICAgICAgaWYoZXJyb3Iuc3RhY2sgJiYgZXJyb3Iuc3RhY2suc3RhY2spIHtcbiAgICAgICAgICAgICAgZXJyb3Iuc3RhY2sgPSBlcnJvci5zdGFjay5zdGFjaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBLYWRpcmEudHJhY2VyLmVuZExhc3RFdmVudChrYWRpcmFJbmZvLnRyYWNlKTtcbiAgICAgICAgICBLYWRpcmEudHJhY2VyLmV2ZW50KGthZGlyYUluZm8udHJhY2UsICdlcnJvcicsIHtlcnJvcjogZXJyb3J9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBLYWRpcmEudHJhY2VyLmVuZExhc3RFdmVudChrYWRpcmFJbmZvLnRyYWNlKTtcbiAgICAgICAgICBLYWRpcmEudHJhY2VyLmV2ZW50KGthZGlyYUluZm8udHJhY2UsICdjb21wbGV0ZScpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy9wcm9jZXNzaW5nIHRoZSBtZXNzYWdlXG4gICAgICAgIHZhciB0cmFjZSA9IEthZGlyYS50cmFjZXIuYnVpbGRUcmFjZShrYWRpcmFJbmZvLnRyYWNlKTtcbiAgICAgICAgS2FkaXJhLkV2ZW50QnVzLmVtaXQoJ21ldGhvZCcsICdtZXRob2RDb21wbGV0ZWQnLCB0cmFjZSwgdGhpcyk7XG4gICAgICAgIEthZGlyYS5tb2RlbHMubWV0aG9kcy5wcm9jZXNzTWV0aG9kKHRyYWNlKTtcblxuICAgICAgICAvLyBlcnJvciBtYXkgb3IgbWF5IG5vdCBleGlzdCBhbmQgZXJyb3IgdHJhY2tpbmcgY2FuIGJlIGRpc2FibGVkXG4gICAgICAgIGlmKGVycm9yICYmIEthZGlyYS5vcHRpb25zLmVuYWJsZUVycm9yVHJhY2tpbmcpIHtcbiAgICAgICAgICBLYWRpcmEubW9kZWxzLmVycm9yLnRyYWNrRXJyb3IoZXJyb3IsIHRyYWNlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vY2xlYW4gYW5kIG1ha2Ugc3VyZSwgZmliZXIgaXMgY2xlYW5cbiAgICAgICAgLy9ub3Qgc3VyZSB3ZSBuZWVkIHRvIGRvIHRoaXMsIGJ1dCBhIHByZXZlbnRpdmUgbWVhc3VyZVxuICAgICAgICBLYWRpcmEuX3NldEluZm8obnVsbCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG9yaWdpbmFsU2VuZC5jYWxsKHRoaXMsIG1zZyk7XG4gIH07XG59O1xuXG4vLyB3cmFwIGV4aXN0aW5nIG1ldGhvZCBoYW5kbGVycyBmb3IgY2FwdHVyaW5nIGVycm9yc1xuXy5lYWNoKE1ldGVvci5zZXJ2ZXIubWV0aG9kX2hhbmRsZXJzLCBmdW5jdGlvbihoYW5kbGVyLCBuYW1lKSB7XG4gIHdyYXBNZXRob2RIYW5kZXJGb3JFcnJvcnMobmFtZSwgaGFuZGxlciwgTWV0ZW9yLnNlcnZlci5tZXRob2RfaGFuZGxlcnMpO1xufSk7XG5cbi8vIHdyYXAgZnV0dXJlIG1ldGhvZCBoYW5kbGVycyBmb3IgY2FwdHVyaW5nIGVycm9yc1xudmFyIG9yaWdpbmFsTWV0ZW9yTWV0aG9kcyA9IE1ldGVvci5tZXRob2RzO1xuTWV0ZW9yLm1ldGhvZHMgPSBmdW5jdGlvbihtZXRob2RNYXApIHtcbiAgXy5lYWNoKG1ldGhvZE1hcCwgZnVuY3Rpb24oaGFuZGxlciwgbmFtZSkge1xuICAgIHdyYXBNZXRob2RIYW5kZXJGb3JFcnJvcnMobmFtZSwgaGFuZGxlciwgbWV0aG9kTWFwKTtcbiAgfSk7XG4gIG9yaWdpbmFsTWV0ZW9yTWV0aG9kcyhtZXRob2RNYXApO1xufTtcblxuXG5mdW5jdGlvbiB3cmFwTWV0aG9kSGFuZGVyRm9yRXJyb3JzKG5hbWUsIG9yaWdpbmFsSGFuZGxlciwgbWV0aG9kTWFwKSB7XG4gIG1ldGhvZE1hcFtuYW1lXSA9IGZ1bmN0aW9uKCkge1xuICAgIHRyeXtcbiAgICAgIHJldHVybiBvcmlnaW5hbEhhbmRsZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9IGNhdGNoKGV4KSB7XG4gICAgICBpZihleCAmJiBLYWRpcmEuX2dldEluZm8oKSkge1xuICAgICAgICAvLyBzb21ldGltZXMgZXJyb3IgbWF5IGJlIGp1c3QgYW4gc3RyaW5nIG9yIGEgcHJpbWl0aXZlXG4gICAgICAgIC8vIGluIHRoYXQgY2FzZSwgd2UgbmVlZCB0byBtYWtlIGl0IGEgcHN1ZWRvIGVycm9yXG4gICAgICAgIGlmKHR5cGVvZiBleCAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICBleCA9IHttZXNzYWdlOiBleCwgc3RhY2s6IGV4fTtcbiAgICAgICAgfVxuICAgICAgICAvLyBOb3cgd2UgYXJlIG1hcmtpbmcgdGhpcyBlcnJvciB0byBnZXQgdHJhY2tlZCB2aWEgbWV0aG9kc1xuICAgICAgICAvLyBCdXQsIHRoaXMgYWxzbyB0cmlnZ2VycyBhIE1ldGVvci5kZWJ1ZyBjYWxsIGFuZFxuICAgICAgICAvLyBpdCBvbmx5IGdldHMgdGhlIHN0YWNrXG4gICAgICAgIC8vIFdlIGFsc28gdHJhY2sgTWV0ZW9yLmRlYnVnIGVycm9ycyBhbmQgd2FudCB0byBzdG9wXG4gICAgICAgIC8vIHRyYWNraW5nIHRoaXMgZXJyb3IuIFRoYXQncyB3aHkgd2UgZG8gdGhpc1xuICAgICAgICAvLyBTZWUgTWV0ZW9yLmRlYnVnIGVycm9yIHRyYWNraW5nIGNvZGUgZm9yIG1vcmVcbiAgICAgICAgaWYgKEthZGlyYS5vcHRpb25zLmVuYWJsZUVycm9yVHJhY2tpbmcpIHtcbiAgICAgICAgICBleC5zdGFjayA9IHtzdGFjazogZXguc3RhY2ssIHNvdXJjZTogJ21ldGhvZCd9O1xuICAgICAgICB9XG4gICAgICAgIEthZGlyYS5fZ2V0SW5mbygpLmN1cnJlbnRFcnJvciA9IGV4O1xuICAgICAgfVxuICAgICAgdGhyb3cgZXg7XG4gICAgfVxuICB9XG59XG4iLCJ2YXIgRmliZXIgPSBOcG0ucmVxdWlyZSgnZmliZXJzJyk7XG5cbndyYXBTdWJzY3JpcHRpb24gPSBmdW5jdGlvbihzdWJzY3JpcHRpb25Qcm90bykge1xuICAvLyBJZiB0aGUgcmVhZHkgZXZlbnQgcnVucyBvdXRzaWRlIHRoZSBGaWJlciwgS2FkaXJhLl9nZXRJbmZvKCkgZG9lc24ndCB3b3JrLlxuICAvLyB3ZSBuZWVkIHNvbWUgb3RoZXIgd2F5IHRvIHN0b3JlIGthZGlyYUluZm8gc28gd2UgY2FuIHVzZSBpdCBhdCByZWFkeSBoaWphY2suXG4gIHZhciBvcmlnaW5hbFJ1bkhhbmRsZXIgPSBzdWJzY3JpcHRpb25Qcm90by5fcnVuSGFuZGxlcjtcbiAgc3Vic2NyaXB0aW9uUHJvdG8uX3J1bkhhbmRsZXIgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIga2FkaXJhSW5mbyA9IEthZGlyYS5fZ2V0SW5mbygpO1xuICAgIGlmIChrYWRpcmFJbmZvKSB7XG4gICAgICB0aGlzLl9fa2FkaXJhSW5mbyA9IGthZGlyYUluZm87XG4gICAgfTtcbiAgICBvcmlnaW5hbFJ1bkhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgfVxuXG4gIHZhciBvcmlnaW5hbFJlYWR5ID0gc3Vic2NyaXB0aW9uUHJvdG8ucmVhZHk7XG4gIHN1YnNjcmlwdGlvblByb3RvLnJlYWR5ID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gbWV0ZW9yIGhhcyBhIGZpZWxkIGNhbGxlZCBgX3JlYWR5YCB3aGljaCB0cmFja3MgdGhpc1xuICAgIC8vIGJ1dCB3ZSBuZWVkIHRvIG1ha2UgaXQgZnV0dXJlIHByb29mXG4gICAgaWYoIXRoaXMuX2FwbVJlYWR5VHJhY2tlZCkge1xuICAgICAgdmFyIGthZGlyYUluZm8gPSBLYWRpcmEuX2dldEluZm8oKSB8fCB0aGlzLl9fa2FkaXJhSW5mbztcbiAgICAgIGRlbGV0ZSB0aGlzLl9fa2FkaXJhSW5mbztcbiAgICAgIC8vc29tZXRpbWUgLnJlYWR5IGNhbiBiZSBjYWxsZWQgaW4gdGhlIGNvbnRleHQgb2YgdGhlIG1ldGhvZFxuICAgICAgLy90aGVuIHdlIGhhdmUgc29tZSBwcm9ibGVtcywgdGhhdCdzIHdoeSB3ZSBhcmUgY2hlY2tpbmcgdGhpc1xuICAgICAgLy9lZzotIEFjY291bnRzLmNyZWF0ZVVzZXJcbiAgICAgIGlmKGthZGlyYUluZm8gJiYgdGhpcy5fc3Vic2NyaXB0aW9uSWQgPT0ga2FkaXJhSW5mby50cmFjZS5pZCkge1xuICAgICAgICBLYWRpcmEudHJhY2VyLmVuZExhc3RFdmVudChrYWRpcmFJbmZvLnRyYWNlKTtcbiAgICAgICAgS2FkaXJhLnRyYWNlci5ldmVudChrYWRpcmFJbmZvLnRyYWNlLCAnY29tcGxldGUnKTtcbiAgICAgICAgdmFyIHRyYWNlID0gS2FkaXJhLnRyYWNlci5idWlsZFRyYWNlKGthZGlyYUluZm8udHJhY2UpO1xuICAgICAgfVxuXG4gICAgICBLYWRpcmEuRXZlbnRCdXMuZW1pdCgncHVic3ViJywgJ3N1YkNvbXBsZXRlZCcsIHRyYWNlLCB0aGlzLl9zZXNzaW9uLCB0aGlzKTtcbiAgICAgIEthZGlyYS5tb2RlbHMucHVic3ViLl90cmFja1JlYWR5KHRoaXMuX3Nlc3Npb24sIHRoaXMsIHRyYWNlKTtcbiAgICAgIHRoaXMuX2FwbVJlYWR5VHJhY2tlZCA9IHRydWU7XG4gICAgfVxuXG4gICAgLy8gd2Ugc3RpbGwgcGFzcyB0aGUgY29udHJvbCB0byB0aGUgb3JpZ2luYWwgaW1wbGVtZW50YXRpb25cbiAgICAvLyBzaW5jZSBtdWx0aXBsZSByZWFkeSBjYWxscyBhcmUgaGFuZGxlZCBieSBpdHNlbGZcbiAgICBvcmlnaW5hbFJlYWR5LmNhbGwodGhpcyk7XG4gIH07XG5cbiAgdmFyIG9yaWdpbmFsRXJyb3IgPSBzdWJzY3JpcHRpb25Qcm90by5lcnJvcjtcbiAgc3Vic2NyaXB0aW9uUHJvdG8uZXJyb3IgPSBmdW5jdGlvbihlcnIpIHtcbiAgICBpZiAoZXJyKSB7XG4gICAgICB2YXIga2FkaXJhSW5mbyA9IEthZGlyYS5fZ2V0SW5mbygpO1xuXG4gICAgICBpZihrYWRpcmFJbmZvICYmIHRoaXMuX3N1YnNjcmlwdGlvbklkID09IGthZGlyYUluZm8udHJhY2UuaWQpIHtcbiAgICAgICAgS2FkaXJhLnRyYWNlci5lbmRMYXN0RXZlbnQoa2FkaXJhSW5mby50cmFjZSk7XG5cbiAgICAgICAgdmFyIGVycm9yRm9yQXBtID0gXy5waWNrKGVyciwgJ21lc3NhZ2UnLCAnc3RhY2snKTtcbiAgICAgICAgS2FkaXJhLnRyYWNlci5ldmVudChrYWRpcmFJbmZvLnRyYWNlLCAnZXJyb3InLCB7ZXJyb3I6IGVycm9yRm9yQXBtfSk7XG4gICAgICAgIHZhciB0cmFjZSA9IEthZGlyYS50cmFjZXIuYnVpbGRUcmFjZShrYWRpcmFJbmZvLnRyYWNlKTtcblxuICAgICAgICBLYWRpcmEubW9kZWxzLnB1YnN1Yi5fdHJhY2tFcnJvcih0aGlzLl9zZXNzaW9uLCB0aGlzLCB0cmFjZSk7XG5cbiAgICAgICAgLy8gZXJyb3IgdHJhY2tpbmcgY2FuIGJlIGRpc2FibGVkIGFuZCBpZiB0aGVyZSBpcyBhIHRyYWNlXG4gICAgICAgIC8vIHRyYWNlIHNob3VsZCBiZSBhdmFpYWxibGUgYWxsIHRoZSB0aW1lLCBidXQgaXQgd29uJ3RcbiAgICAgICAgLy8gaWYgc29tZXRoaW5nIHdyb25nIGhhcHBlbmVkIG9uIHRoZSB0cmFjZSBidWlsZGluZ1xuICAgICAgICBpZihLYWRpcmEub3B0aW9ucy5lbmFibGVFcnJvclRyYWNraW5nICYmIHRyYWNlKSB7XG4gICAgICAgICAgS2FkaXJhLm1vZGVscy5lcnJvci50cmFja0Vycm9yKGVyciwgdHJhY2UpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIHdyYXAgZXJyb3Igc3RhY2sgc28gTWV0ZW9yLl9kZWJ1ZyBjYW4gaWRlbnRpZnkgYW5kIGlnbm9yZSBpdFxuICAgICAgaWYgKEthZGlyYS5vcHRpb25zLmVuYWJsZUVycm9yVHJhY2tpbmcpIHtcbiAgICAgICAgZXJyLnN0YWNrID0geyBzdGFjazogZXJyLnN0YWNrLCBzb3VyY2U6IFwic3Vic2NyaXB0aW9uXCIgfTtcbiAgICAgIH1cbiAgICAgIG9yaWdpbmFsRXJyb3IuY2FsbCh0aGlzLCBlcnIpO1xuICAgIH1cbiAgfTtcblxuICB2YXIgb3JpZ2luYWxEZWFjdGl2YXRlID0gc3Vic2NyaXB0aW9uUHJvdG8uX2RlYWN0aXZhdGU7XG4gIHN1YnNjcmlwdGlvblByb3RvLl9kZWFjdGl2YXRlID0gZnVuY3Rpb24oKSB7XG4gICAgS2FkaXJhLkV2ZW50QnVzLmVtaXQoJ3B1YnN1YicsICdzdWJEZWFjdGl2YXRlZCcsIHRoaXMuX3Nlc3Npb24sIHRoaXMpO1xuICAgIEthZGlyYS5tb2RlbHMucHVic3ViLl90cmFja1Vuc3ViKHRoaXMuX3Nlc3Npb24sIHRoaXMpO1xuICAgIG9yaWdpbmFsRGVhY3RpdmF0ZS5jYWxsKHRoaXMpO1xuICB9O1xuXG4gIC8vYWRkaW5nIHRoZSBjdXJyZW5TdWIgZW52IHZhcmlhYmxlXG4gIFsnYWRkZWQnLCAnY2hhbmdlZCcsICdyZW1vdmVkJ10uZm9yRWFjaChmdW5jdGlvbihmdW5jTmFtZSkge1xuICAgIHZhciBvcmlnaW5hbEZ1bmMgPSBzdWJzY3JpcHRpb25Qcm90b1tmdW5jTmFtZV07XG4gICAgc3Vic2NyaXB0aW9uUHJvdG9bZnVuY05hbWVdID0gZnVuY3Rpb24oY29sbGVjdGlvbk5hbWUsIGlkLCBmaWVsZHMpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgLy8gd2UgbmVlZCB0byBydW4gdGhpcyBjb2RlIGluIGEgZmliZXIgYW5kIHRoYXQncyBob3cgd2UgdHJhY2tcbiAgICAgIC8vIHN1YnNjcmlwdGlvbiBpbmZvLiBNYXkgYmUgd2UgY2FuIGZpZ3VyZSBvdXQsIHNvbWUgb3RoZXIgd2F5IHRvIGRvIHRoaXNcbiAgICAgIC8vIFdlIHVzZSB0aGlzIGN1cnJlbnRseSB0byBnZXQgdGhlIHB1YmxpY2F0aW9uIGluZm8gd2hlbiB0cmFja2luZyBtZXNzYWdlXG4gICAgICAvLyBzaXplcyBhdCB3cmFwX2RkcF9zdHJpbmdpZnkuanNcbiAgICAgIEthZGlyYS5lbnYuY3VycmVudFN1YiA9IHNlbGY7XG4gICAgICB2YXIgcmVzID0gb3JpZ2luYWxGdW5jLmNhbGwoc2VsZiwgY29sbGVjdGlvbk5hbWUsIGlkLCBmaWVsZHMpO1xuICAgICAgS2FkaXJhLmVudi5jdXJyZW50U3ViID0gbnVsbDtcblxuICAgICAgcmV0dXJuIHJlcztcbiAgICB9O1xuICB9KTtcbn07XG4iLCJpbXBvcnQgeyBNb25nb0Nvbm5lY3Rpb24gfSBmcm9tIFwiLi9tZXRlb3J4LmpzXCI7XG5cbndyYXBPcGxvZ09ic2VydmVEcml2ZXIgPSBmdW5jdGlvbihwcm90bykge1xuICAvLyBUcmFjayB0aGUgcG9sbGVkIGRvY3VtZW50cy4gVGhpcyBpcyByZWZsZWN0IHRvIHRoZSBSQU0gc2l6ZSBhbmRcbiAgLy8gZm9yIHRoZSBDUFUgdXNhZ2UgZGlyZWN0bHlcbiAgdmFyIG9yaWdpbmFsUHVibGlzaE5ld1Jlc3VsdHMgPSBwcm90by5fcHVibGlzaE5ld1Jlc3VsdHM7XG4gIHByb3RvLl9wdWJsaXNoTmV3UmVzdWx0cyA9IGZ1bmN0aW9uKG5ld1Jlc3VsdHMsIG5ld0J1ZmZlcikge1xuICAgIHZhciBjb2xsID0gdGhpcy5fY3Vyc29yRGVzY3JpcHRpb24uY29sbGVjdGlvbk5hbWU7XG4gICAgdmFyIHF1ZXJ5ID0gdGhpcy5fY3Vyc29yRGVzY3JpcHRpb24uc2VsZWN0b3I7XG4gICAgdmFyIG9wdHMgPSB0aGlzLl9jdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zO1xuICAgIHZhciBkb2NTaXplID0gS2FkaXJhLmRvY1N6Q2FjaGUuZ2V0U2l6ZShjb2xsLCBxdWVyeSwgb3B0cywgbmV3UmVzdWx0cyk7XG4gICAgdmFyIGRvY1NpemUgPSBLYWRpcmEuZG9jU3pDYWNoZS5nZXRTaXplKGNvbGwsIHF1ZXJ5LCBvcHRzLCBuZXdCdWZmZXIpO1xuICAgIHZhciBjb3VudCA9IG5ld1Jlc3VsdHMuc2l6ZSgpICsgbmV3QnVmZmVyLnNpemUoKTtcbiAgICBpZih0aGlzLl9vd25lckluZm8pIHtcbiAgICAgIEthZGlyYS5tb2RlbHMucHVic3ViLnRyYWNrUG9sbGVkRG9jdW1lbnRzKHRoaXMuX293bmVySW5mbywgY291bnQpO1xuICAgICAgS2FkaXJhLm1vZGVscy5wdWJzdWIudHJhY2tEb2NTaXplKHRoaXMuX293bmVySW5mby5uYW1lLCBcInBvbGxlZEZldGNoZXNcIiwgZG9jU2l6ZSpjb3VudCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX3BvbGxlZERvY3VtZW50cyA9IGNvdW50O1xuICAgICAgdGhpcy5fZG9jU2l6ZSA9IHtcbiAgICAgICAgcG9sbGVkRmV0Y2hlczogZG9jU2l6ZSpjb3VudFxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb3JpZ2luYWxQdWJsaXNoTmV3UmVzdWx0cy5jYWxsKHRoaXMsIG5ld1Jlc3VsdHMsIG5ld0J1ZmZlcik7XG4gIH07XG5cbiAgdmFyIG9yaWdpbmFsSGFuZGxlT3Bsb2dFbnRyeVF1ZXJ5aW5nID0gcHJvdG8uX2hhbmRsZU9wbG9nRW50cnlRdWVyeWluZztcbiAgcHJvdG8uX2hhbmRsZU9wbG9nRW50cnlRdWVyeWluZyA9IGZ1bmN0aW9uKG9wKSB7XG4gICAgS2FkaXJhLm1vZGVscy5wdWJzdWIudHJhY2tEb2N1bWVudENoYW5nZXModGhpcy5fb3duZXJJbmZvLCBvcCk7XG4gICAgcmV0dXJuIG9yaWdpbmFsSGFuZGxlT3Bsb2dFbnRyeVF1ZXJ5aW5nLmNhbGwodGhpcywgb3ApO1xuICB9O1xuXG4gIHZhciBvcmlnaW5hbEhhbmRsZU9wbG9nRW50cnlTdGVhZHlPckZldGNoaW5nID0gcHJvdG8uX2hhbmRsZU9wbG9nRW50cnlTdGVhZHlPckZldGNoaW5nO1xuICBwcm90by5faGFuZGxlT3Bsb2dFbnRyeVN0ZWFkeU9yRmV0Y2hpbmcgPSBmdW5jdGlvbihvcCkge1xuICAgIEthZGlyYS5tb2RlbHMucHVic3ViLnRyYWNrRG9jdW1lbnRDaGFuZ2VzKHRoaXMuX293bmVySW5mbywgb3ApO1xuICAgIHJldHVybiBvcmlnaW5hbEhhbmRsZU9wbG9nRW50cnlTdGVhZHlPckZldGNoaW5nLmNhbGwodGhpcywgb3ApO1xuICB9O1xuXG4gIC8vIHRyYWNrIGxpdmUgdXBkYXRlc1xuICBbJ19hZGRQdWJsaXNoZWQnLCAnX3JlbW92ZVB1Ymxpc2hlZCcsICdfY2hhbmdlUHVibGlzaGVkJ10uZm9yRWFjaChmdW5jdGlvbihmbk5hbWUpIHtcbiAgICB2YXIgb3JpZ2luYWxGbiA9IHByb3RvW2ZuTmFtZV07XG4gICAgcHJvdG9bZm5OYW1lXSA9IGZ1bmN0aW9uKGEsIGIsIGMpIHtcbiAgICAgIGlmKHRoaXMuX293bmVySW5mbykge1xuICAgICAgICBLYWRpcmEubW9kZWxzLnB1YnN1Yi50cmFja0xpdmVVcGRhdGVzKHRoaXMuX293bmVySW5mbywgZm5OYW1lLCAxKTtcblxuICAgICAgICBpZihmbk5hbWUgPT09IFwiX2FkZFB1Ymxpc2hlZFwiKSB7XG4gICAgICAgICAgdmFyIGNvbGwgPSB0aGlzLl9jdXJzb3JEZXNjcmlwdGlvbi5jb2xsZWN0aW9uTmFtZTtcbiAgICAgICAgICB2YXIgcXVlcnkgPSB0aGlzLl9jdXJzb3JEZXNjcmlwdGlvbi5zZWxlY3RvcjtcbiAgICAgICAgICB2YXIgb3B0cyA9IHRoaXMuX2N1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnM7XG4gICAgICAgICAgdmFyIGRvY1NpemUgPSBLYWRpcmEuZG9jU3pDYWNoZS5nZXRTaXplKGNvbGwsIHF1ZXJ5LCBvcHRzLCBbYl0pO1xuXG4gICAgICAgICAgS2FkaXJhLm1vZGVscy5wdWJzdWIudHJhY2tEb2NTaXplKHRoaXMuX293bmVySW5mby5uYW1lLCBcImxpdmVGZXRjaGVzXCIsIGRvY1NpemUpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBJZiB0aGVyZSBpcyBubyBvd25lckluZm8sIHRoYXQgbWVhbnMgdGhpcyBpcyB0aGUgaW5pdGlhbCBhZGRzXG4gICAgICAgIGlmKCF0aGlzLl9saXZlVXBkYXRlc0NvdW50cykge1xuICAgICAgICAgIHRoaXMuX2xpdmVVcGRhdGVzQ291bnRzID0ge1xuICAgICAgICAgICAgX2luaXRpYWxBZGRzOiAwXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2xpdmVVcGRhdGVzQ291bnRzLl9pbml0aWFsQWRkcysrO1xuXG4gICAgICAgIGlmKGZuTmFtZSA9PT0gXCJfYWRkUHVibGlzaGVkXCIpIHtcbiAgICAgICAgICBpZighdGhpcy5fZG9jU2l6ZSkge1xuICAgICAgICAgICAgdGhpcy5fZG9jU2l6ZSA9IHtcbiAgICAgICAgICAgICAgaW5pdGlhbEZldGNoZXM6IDBcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYoIXRoaXMuX2RvY1NpemUuaW5pdGlhbEZldGNoZXMpIHtcbiAgICAgICAgICAgIHRoaXMuX2RvY1NpemUuaW5pdGlhbEZldGNoZXMgPSAwO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHZhciBjb2xsID0gdGhpcy5fY3Vyc29yRGVzY3JpcHRpb24uY29sbGVjdGlvbk5hbWU7XG4gICAgICAgICAgdmFyIHF1ZXJ5ID0gdGhpcy5fY3Vyc29yRGVzY3JpcHRpb24uc2VsZWN0b3I7XG4gICAgICAgICAgdmFyIG9wdHMgPSB0aGlzLl9jdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zO1xuICAgICAgICAgIHZhciBkb2NTaXplID0gS2FkaXJhLmRvY1N6Q2FjaGUuZ2V0U2l6ZShjb2xsLCBxdWVyeSwgb3B0cywgW2JdKTtcblxuICAgICAgICAgIHRoaXMuX2RvY1NpemUuaW5pdGlhbEZldGNoZXMgKz0gZG9jU2l6ZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gb3JpZ2luYWxGbi5jYWxsKHRoaXMsIGEsIGIsIGMpO1xuICAgIH07XG4gIH0pO1xuXG4gIHZhciBvcmlnaW5hbFN0b3AgPSBwcm90by5zdG9wO1xuICBwcm90by5zdG9wID0gZnVuY3Rpb24oKSB7XG4gICAgaWYodGhpcy5fb3duZXJJbmZvICYmIHRoaXMuX293bmVySW5mby50eXBlID09PSAnc3ViJykge1xuICAgICAgS2FkaXJhLkV2ZW50QnVzLmVtaXQoJ3B1YnN1YicsICdvYnNlcnZlckRlbGV0ZWQnLCB0aGlzLl9vd25lckluZm8pO1xuICAgICAgS2FkaXJhLm1vZGVscy5wdWJzdWIudHJhY2tEZWxldGVkT2JzZXJ2ZXIodGhpcy5fb3duZXJJbmZvKTtcbiAgICB9XG5cbiAgICByZXR1cm4gb3JpZ2luYWxTdG9wLmNhbGwodGhpcyk7XG4gIH07XG59O1xuXG53cmFwUG9sbGluZ09ic2VydmVEcml2ZXIgPSBmdW5jdGlvbihwcm90bykge1xuICB2YXIgb3JpZ2luYWxQb2xsTW9uZ28gPSBwcm90by5fcG9sbE1vbmdvO1xuICBwcm90by5fcG9sbE1vbmdvID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHN0YXJ0ID0gRGF0ZS5ub3coKTtcbiAgICBvcmlnaW5hbFBvbGxNb25nby5jYWxsKHRoaXMpO1xuXG4gICAgLy8gQ3VycmVudCByZXN1bHQgaXMgc3RvcmVkIGluIHRoZSBmb2xsb3dpbmcgdmFyaWFibGUuXG4gICAgLy8gU28sIHdlIGNhbiB1c2UgdGhhdFxuICAgIC8vIFNvbWV0aW1lcywgaXQncyBwb3NzaWJsZSB0byBnZXQgc2l6ZSBhcyB1bmRlZmluZWQuXG4gICAgLy8gTWF5IGJlIHNvbWV0aGluZyB3aXRoIGRpZmZlcmVudCB2ZXJzaW9uLiBXZSBkb24ndCBuZWVkIHRvIHdvcnJ5IGFib3V0XG4gICAgLy8gdGhpcyBub3dcbiAgICB2YXIgY291bnQgPSAwO1xuICAgIHZhciBkb2NTaXplID0gMDtcblxuICAgIGlmKHRoaXMuX3Jlc3VsdHMgJiYgdGhpcy5fcmVzdWx0cy5zaXplKSB7XG4gICAgICBjb3VudCA9IHRoaXMuX3Jlc3VsdHMuc2l6ZSgpIHx8IDA7XG5cbiAgICAgIHZhciBjb2xsID0gdGhpcy5fY3Vyc29yRGVzY3JpcHRpb24uY29sbGVjdGlvbk5hbWU7XG4gICAgICB2YXIgcXVlcnkgPSB0aGlzLl9jdXJzb3JEZXNjcmlwdGlvbi5zZWxlY3RvcjtcbiAgICAgIHZhciBvcHRzID0gdGhpcy5fY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucztcblxuICAgICAgZG9jU2l6ZSA9IEthZGlyYS5kb2NTekNhY2hlLmdldFNpemUoY29sbCwgcXVlcnksIG9wdHMsIHRoaXMuX3Jlc3VsdHMuX21hcCkqY291bnQ7XG4gICAgfVxuXG4gICAgaWYodGhpcy5fb3duZXJJbmZvKSB7XG4gICAgICBLYWRpcmEubW9kZWxzLnB1YnN1Yi50cmFja1BvbGxlZERvY3VtZW50cyh0aGlzLl9vd25lckluZm8sIGNvdW50KTtcbiAgICAgIEthZGlyYS5tb2RlbHMucHVic3ViLnRyYWNrRG9jU2l6ZSh0aGlzLl9vd25lckluZm8ubmFtZSwgXCJwb2xsZWRGZXRjaGVzXCIsIGRvY1NpemUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9wb2xsZWREb2N1bWVudHMgPSBjb3VudDtcbiAgICAgIHRoaXMuX3BvbGxlZERvY1NpemUgPSBkb2NTaXplO1xuICAgIH1cbiAgfTtcblxuICB2YXIgb3JpZ2luYWxTdG9wID0gcHJvdG8uc3RvcDtcbiAgcHJvdG8uc3RvcCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmKHRoaXMuX293bmVySW5mbyAmJiB0aGlzLl9vd25lckluZm8udHlwZSA9PT0gJ3N1YicpIHtcbiAgICAgIEthZGlyYS5FdmVudEJ1cy5lbWl0KCdwdWJzdWInLCAnb2JzZXJ2ZXJEZWxldGVkJywgdGhpcy5fb3duZXJJbmZvKTtcbiAgICAgIEthZGlyYS5tb2RlbHMucHVic3ViLnRyYWNrRGVsZXRlZE9ic2VydmVyKHRoaXMuX293bmVySW5mbyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG9yaWdpbmFsU3RvcC5jYWxsKHRoaXMpO1xuICB9O1xufTtcblxud3JhcE11bHRpcGxleGVyID0gZnVuY3Rpb24ocHJvdG8pIHtcbiAgdmFyIG9yaWdpbmFsSW5pdGFsQWRkID0gcHJvdG8uYWRkSGFuZGxlQW5kU2VuZEluaXRpYWxBZGRzO1xuICAgcHJvdG8uYWRkSGFuZGxlQW5kU2VuZEluaXRpYWxBZGRzID0gZnVuY3Rpb24oaGFuZGxlKSB7XG4gICAgaWYoIXRoaXMuX2ZpcnN0SW5pdGlhbEFkZFRpbWUpIHtcbiAgICAgIHRoaXMuX2ZpcnN0SW5pdGlhbEFkZFRpbWUgPSBEYXRlLm5vdygpO1xuICAgIH1cblxuICAgIGhhbmRsZS5fd2FzTXVsdGlwbGV4ZXJSZWFkeSA9IHRoaXMuX3JlYWR5KCk7XG4gICAgaGFuZGxlLl9xdWV1ZUxlbmd0aCA9IHRoaXMuX3F1ZXVlLl90YXNrSGFuZGxlcy5sZW5ndGg7XG5cbiAgICBpZighaGFuZGxlLl93YXNNdWx0aXBsZXhlclJlYWR5KSB7XG4gICAgICBoYW5kbGUuX2VsYXBzZWRQb2xsaW5nVGltZSA9IERhdGUubm93KCkgLSB0aGlzLl9maXJzdEluaXRpYWxBZGRUaW1lO1xuICAgIH1cbiAgICByZXR1cm4gb3JpZ2luYWxJbml0YWxBZGQuY2FsbCh0aGlzLCBoYW5kbGUpO1xuICB9O1xufTtcblxud3JhcEZvckNvdW50aW5nT2JzZXJ2ZXJzID0gZnVuY3Rpb24oKSB7XG4gIC8vIHRvIGNvdW50IG9ic2VydmVyc1xuICB2YXIgbW9uZ29Db25uZWN0aW9uUHJvdG8gPSBNb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlO1xuICB2YXIgb3JpZ2luYWxPYnNlcnZlQ2hhbmdlcyA9IG1vbmdvQ29ubmVjdGlvblByb3RvLl9vYnNlcnZlQ2hhbmdlcztcbiAgbW9uZ29Db25uZWN0aW9uUHJvdG8uX29ic2VydmVDaGFuZ2VzID0gZnVuY3Rpb24oY3Vyc29yRGVzY3JpcHRpb24sIG9yZGVyZWQsIGNhbGxiYWNrcykge1xuICAgIHZhciByZXQgPSBvcmlnaW5hbE9ic2VydmVDaGFuZ2VzLmNhbGwodGhpcywgY3Vyc29yRGVzY3JpcHRpb24sIG9yZGVyZWQsIGNhbGxiYWNrcyk7XG4gICAgLy8gZ2V0IHRoZSBLYWRpcmEgSW5mbyB2aWEgdGhlIE1ldGVvci5FbnZpcm9ubWVudGFsVmFyaWFibGVcbiAgICB2YXIga2FkaXJhSW5mbyA9IEthZGlyYS5fZ2V0SW5mbyhudWxsLCB0cnVlKTtcblxuICAgIGlmKGthZGlyYUluZm8gJiYgcmV0Ll9tdWx0aXBsZXhlcikge1xuICAgICAgaWYoIXJldC5fbXVsdGlwbGV4ZXIuX19rYWRpcmFUcmFja2VkKSB7XG4gICAgICAgIC8vIG5ldyBtdWx0aXBsZXhlclxuICAgICAgICByZXQuX211bHRpcGxleGVyLl9fa2FkaXJhVHJhY2tlZCA9IHRydWU7XG4gICAgICAgIEthZGlyYS5FdmVudEJ1cy5lbWl0KCdwdWJzdWInLCAnbmV3U3ViSGFuZGxlQ3JlYXRlZCcsIGthZGlyYUluZm8udHJhY2UpO1xuICAgICAgICBLYWRpcmEubW9kZWxzLnB1YnN1Yi5pbmNyZW1lbnRIYW5kbGVDb3VudChrYWRpcmFJbmZvLnRyYWNlLCBmYWxzZSk7XG4gICAgICAgIGlmKGthZGlyYUluZm8udHJhY2UudHlwZSA9PSAnc3ViJykge1xuICAgICAgICAgIHZhciBvd25lckluZm8gPSB7XG4gICAgICAgICAgICB0eXBlOiBrYWRpcmFJbmZvLnRyYWNlLnR5cGUsXG4gICAgICAgICAgICBuYW1lOiBrYWRpcmFJbmZvLnRyYWNlLm5hbWUsXG4gICAgICAgICAgICBzdGFydFRpbWU6IChuZXcgRGF0ZSgpKS5nZXRUaW1lKClcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgdmFyIG9ic2VydmVyRHJpdmVyID0gcmV0Ll9tdWx0aXBsZXhlci5fb2JzZXJ2ZURyaXZlcjtcbiAgICAgICAgICBvYnNlcnZlckRyaXZlci5fb3duZXJJbmZvID0gb3duZXJJbmZvO1xuICAgICAgICAgIEthZGlyYS5FdmVudEJ1cy5lbWl0KCdwdWJzdWInLCAnb2JzZXJ2ZXJDcmVhdGVkJywgb3duZXJJbmZvKTtcbiAgICAgICAgICBLYWRpcmEubW9kZWxzLnB1YnN1Yi50cmFja0NyZWF0ZWRPYnNlcnZlcihvd25lckluZm8pO1xuXG4gICAgICAgICAgLy8gV2UgbmVlZCB0byBzZW5kIGluaXRpYWxseSBwb2xsZWQgZG9jdW1lbnRzIGlmIHRoZXJlIGFyZVxuICAgICAgICAgIGlmKG9ic2VydmVyRHJpdmVyLl9wb2xsZWREb2N1bWVudHMpIHtcbiAgICAgICAgICAgIEthZGlyYS5tb2RlbHMucHVic3ViLnRyYWNrUG9sbGVkRG9jdW1lbnRzKG93bmVySW5mbywgb2JzZXJ2ZXJEcml2ZXIuX3BvbGxlZERvY3VtZW50cyk7XG4gICAgICAgICAgICBvYnNlcnZlckRyaXZlci5fcG9sbGVkRG9jdW1lbnRzID0gMDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBXZSBuZWVkIHRvIHNlbmQgaW5pdGlhbGx5IHBvbGxlZCBkb2N1bWVudHMgaWYgdGhlcmUgYXJlXG4gICAgICAgICAgaWYob2JzZXJ2ZXJEcml2ZXIuX3BvbGxlZERvY1NpemUpIHtcbiAgICAgICAgICAgIEthZGlyYS5tb2RlbHMucHVic3ViLnRyYWNrRG9jU2l6ZShvd25lckluZm8ubmFtZSwgXCJwb2xsZWRGZXRjaGVzXCIsIG9ic2VydmVyRHJpdmVyLl9wb2xsZWREb2NTaXplKTtcbiAgICAgICAgICAgIG9ic2VydmVyRHJpdmVyLl9wb2xsZWREb2NTaXplID0gMDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBQcm9jZXNzIF9saXZlVXBkYXRlc0NvdW50c1xuICAgICAgICAgIF8uZWFjaChvYnNlcnZlckRyaXZlci5fbGl2ZVVwZGF0ZXNDb3VudHMsIGZ1bmN0aW9uKGNvdW50LCBrZXkpIHtcbiAgICAgICAgICAgIEthZGlyYS5tb2RlbHMucHVic3ViLnRyYWNrTGl2ZVVwZGF0ZXMob3duZXJJbmZvLCBrZXksIGNvdW50KTtcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIC8vIFByb2Nlc3MgZG9jU2l6ZVxuICAgICAgICAgIF8uZWFjaChvYnNlcnZlckRyaXZlci5fZG9jU2l6ZSwgZnVuY3Rpb24oY291bnQsIGtleSkge1xuICAgICAgICAgICAgS2FkaXJhLm1vZGVscy5wdWJzdWIudHJhY2tEb2NTaXplKG93bmVySW5mby5uYW1lLCBrZXksIGNvdW50KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgS2FkaXJhLkV2ZW50QnVzLmVtaXQoJ3B1YnN1YicsICdjYWNoZWRTdWJIYW5kbGVDcmVhdGVkJywga2FkaXJhSW5mby50cmFjZSk7XG4gICAgICAgIEthZGlyYS5tb2RlbHMucHVic3ViLmluY3JlbWVudEhhbmRsZUNvdW50KGthZGlyYUluZm8udHJhY2UsIHRydWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXQ7XG4gIH1cbn07XG4iLCJ3cmFwU3RyaW5naWZ5RERQID0gZnVuY3Rpb24oKSB7XG4gIHZhciBvcmlnaW5hbFN0cmluZ2lmeUREUCA9IEREUENvbW1vbi5zdHJpbmdpZnlERFA7XG5cbiAgRERQQ29tbW9uLnN0cmluZ2lmeUREUCA9IGZ1bmN0aW9uKG1zZykge1xuICAgIHZhciBtc2dTdHJpbmcgPSBvcmlnaW5hbFN0cmluZ2lmeUREUChtc2cpO1xuICAgIHZhciBtc2dTaXplID0gQnVmZmVyLmJ5dGVMZW5ndGgobXNnU3RyaW5nLCAndXRmOCcpO1xuXG4gICAgdmFyIGthZGlyYUluZm8gPSBLYWRpcmEuX2dldEluZm8obnVsbCwgdHJ1ZSk7XG5cbiAgICBpZihrYWRpcmFJbmZvKSB7XG4gICAgICBpZihrYWRpcmFJbmZvLnRyYWNlLnR5cGUgPT09ICdtZXRob2QnKSB7XG4gICAgICAgIEthZGlyYS5tb2RlbHMubWV0aG9kcy50cmFja01zZ1NpemUoa2FkaXJhSW5mby50cmFjZS5uYW1lLCBtc2dTaXplKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG1zZ1N0cmluZztcbiAgICB9XG5cbiAgICAvLyAnY3VycmVudFN1YicgaXMgc2V0IHdoZW4gd2Ugd3JhcCBTdWJzY3JpcHRpb24gb2JqZWN0IGFuZCBvdmVycmlkZVxuICAgIC8vIGhhbmRsZXJzIGZvciAnYWRkZWQnLCAnY2hhbmdlZCcsICdyZW1vdmVkJyBldmVudHMuIChzZWUgbGliL2hpamFjay93cmFwX3N1YnNjcmlwdGlvbi5qcylcbiAgICBpZihLYWRpcmEuZW52LmN1cnJlbnRTdWIpIHtcbiAgICAgIGlmKEthZGlyYS5lbnYuY3VycmVudFN1Yi5fX2thZGlyYUluZm8pe1xuICAgICAgICBLYWRpcmEubW9kZWxzLnB1YnN1Yi50cmFja01zZ1NpemUoS2FkaXJhLmVudi5jdXJyZW50U3ViLl9uYW1lLCBcImluaXRpYWxTZW50XCIsIG1zZ1NpemUpO1xuICAgICAgICByZXR1cm4gbXNnU3RyaW5nO1xuICAgICAgfVxuICAgICAgS2FkaXJhLm1vZGVscy5wdWJzdWIudHJhY2tNc2dTaXplKEthZGlyYS5lbnYuY3VycmVudFN1Yi5fbmFtZSwgXCJsaXZlU2VudFwiLCBtc2dTaXplKTtcbiAgICAgIHJldHVybiBtc2dTdHJpbmc7XG4gICAgfVxuXG4gICAgS2FkaXJhLm1vZGVscy5tZXRob2RzLnRyYWNrTXNnU2l6ZShcIjxub3QtYS1tZXRob2Qtb3ItYS1wdWI+XCIsIG1zZ1NpemUpO1xuICAgIHJldHVybiBtc2dTdHJpbmc7XG4gIH1cbn1cbiIsImltcG9ydCB7XG4gIE1vbmdvT3Bsb2dEcml2ZXIsXG4gIE1vbmdvUG9sbGluZ0RyaXZlcixcbiAgTXVsdGlwbGV4ZXIsXG4gIFNlcnZlcixcbiAgU2Vzc2lvbixcbiAgU3Vic2NyaXB0aW9uLFxufSBmcm9tIFwiLi9tZXRlb3J4LmpzXCI7XG5cbnZhciBsb2dnZXIgPSBOcG0ucmVxdWlyZSgnZGVidWcnKSgna2FkaXJhOmhpamFjazppbnN0cnVtZW50Jyk7XG5cbnZhciBpbnN0cnVtZW50ZWQgPSBmYWxzZTtcbkthZGlyYS5fc3RhcnRJbnN0cnVtZW50aW5nID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgaWYoaW5zdHJ1bWVudGVkKSB7XG4gICAgY2FsbGJhY2soKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBpbnN0cnVtZW50ZWQgPSB0cnVlO1xuICB3cmFwU3RyaW5naWZ5RERQKClcbiAgTWV0ZW9yLnN0YXJ0dXAoYXN5bmMgZnVuY3Rpb24gKCkge1xuICAgIHdyYXBTZXJ2ZXIoU2VydmVyLnByb3RvdHlwZSk7XG5cbiAgICB3cmFwU2Vzc2lvbihTZXNzaW9uLnByb3RvdHlwZSk7XG4gICAgd3JhcFN1YnNjcmlwdGlvbihTdWJzY3JpcHRpb24ucHJvdG90eXBlKTtcblxuICAgIGlmIChNb25nb09wbG9nRHJpdmVyKSB7XG4gICAgICB3cmFwT3Bsb2dPYnNlcnZlRHJpdmVyKE1vbmdvT3Bsb2dEcml2ZXIucHJvdG90eXBlKTtcbiAgICB9XG5cbiAgICBpZiAoTW9uZ29Qb2xsaW5nRHJpdmVyKSB7XG4gICAgICB3cmFwUG9sbGluZ09ic2VydmVEcml2ZXIoTW9uZ29Qb2xsaW5nRHJpdmVyLnByb3RvdHlwZSk7XG4gICAgfVxuXG4gICAgaWYgKE11bHRpcGxleGVyKSB7XG4gICAgICB3cmFwTXVsdGlwbGV4ZXIoTXVsdGlwbGV4ZXIucHJvdG90eXBlKTtcbiAgICB9XG5cbiAgICB3cmFwRm9yQ291bnRpbmdPYnNlcnZlcnMoKTtcbiAgICBoaWphY2tEQk9wcygpO1xuXG4gICAgc2V0TGFiZWxzKCk7XG4gICAgY2FsbGJhY2soKTtcbiAgfSk7XG59O1xuXG4vLyBXZSBuZWVkIHRvIGluc3RydW1lbnQgdGhpcyByaWdodGF3YXkgYW5kIGl0J3Mgb2theVxuLy8gT25lIHJlYXNvbiBmb3IgdGhpcyBpcyB0byBjYWxsIGBzZXRMYWJsZXMoKWAgZnVuY3Rpb25cbi8vIE90aGVyd2lzZSwgQ1BVIHByb2ZpbGUgY2FuJ3Qgc2VlIGFsbCBvdXIgY3VzdG9tIGxhYmVsaW5nXG5LYWRpcmEuX3N0YXJ0SW5zdHJ1bWVudGluZyhmdW5jdGlvbigpIHtcbiAgY29uc29sZS5sb2coJ01ldGVvciBBUE06IGNvbXBsZXRlZCBpbnN0cnVtZW50aW5nIHRoZSBhcHAnKVxufSk7XG4iLCJpbXBvcnQge1xuICBNb25nb0Nvbm5lY3Rpb24sXG4gIE1vbmdvQ3Vyc29yLFxufSBmcm9tIFwiLi9tZXRlb3J4LmpzXCI7XG5cbi8vIFRoaXMgaGlqYWNrIGlzIGltcG9ydGFudCB0byBtYWtlIHN1cmUsIGNvbGxlY3Rpb25zIGNyZWF0ZWQgYmVmb3JlXG4vLyB3ZSBoaWphY2sgZGJPcHMsIGV2ZW4gZ2V0cyB0cmFja2VkLlxuLy8gIE1ldGVvciBkb2VzIG5vdCBzaW1wbHkgZXhwb3NlIE1vbmdvQ29ubmVjdGlvbiBvYmplY3QgdG8gdGhlIGNsaWVudFxuLy8gIEl0IHBpY2tzIG1ldGhvZHMgd2hpY2ggYXJlIG5lY2Vzc29yeSBhbmQgbWFrZSBhIGJpbmRlZCBvYmplY3QgYW5kXG4vLyAgYXNzaWduZWQgdG8gdGhlIE1vbmdvLkNvbGxlY3Rpb25cbi8vICBzbywgZXZlbiB3ZSB1cGRhdGVkIHByb3RvdHlwZSwgd2UgY2FuJ3QgdHJhY2sgdGhvc2UgY29sbGVjdGlvbnNcbi8vICBidXQsIHRoaXMgd2lsbCBmaXggaXQuXG52YXIgb3JpZ2luYWxPcGVuID0gTW9uZ29JbnRlcm5hbHMuUmVtb3RlQ29sbGVjdGlvbkRyaXZlci5wcm90b3R5cGUub3Blbjtcbk1vbmdvSW50ZXJuYWxzLlJlbW90ZUNvbGxlY3Rpb25Ecml2ZXIucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiBvcGVuKG5hbWUpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgcmV0ID0gb3JpZ2luYWxPcGVuLmNhbGwoc2VsZiwgbmFtZSk7XG5cbiAgXy5lYWNoKHJldCwgZnVuY3Rpb24oZm4sIG0pIHtcbiAgICAvLyBtYWtlIHN1cmUsIGl0J3MgaW4gdGhlIGFjdHVhbCBtb25nbyBjb25uZWN0aW9uIG9iamVjdFxuICAgIC8vIG1ldGVvcmhhY2tzOm1vbmdvLWNvbGxlY3Rpb24tdXRpbHMgcGFja2FnZSBhZGQgc29tZSBhcmJpdGFyeSBtZXRob2RzXG4gICAgLy8gd2hpY2ggZG9lcyBub3QgZXhpc3QgaW4gdGhlIG1vbmdvIGNvbm5lY3Rpb25cbiAgICBpZihzZWxmLm1vbmdvW21dKSB7XG4gICAgICByZXRbbV0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgQXJyYXkucHJvdG90eXBlLnVuc2hpZnQuY2FsbChhcmd1bWVudHMsIG5hbWUpO1xuICAgICAgICByZXR1cm4gT3B0aW1pemVkQXBwbHkoc2VsZi5tb25nbywgc2VsZi5tb25nb1ttXSwgYXJndW1lbnRzKTtcbiAgICAgIH07XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gcmV0O1xufTtcblxuaGlqYWNrREJPcHMgPSBmdW5jdGlvbiBoaWphY2tEQk9wcygpIHtcbiAgdmFyIG1vbmdvQ29ubmVjdGlvblByb3RvID0gTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZTtcbiAgLy9maW5kT25lIGlzIGhhbmRsZWQgYnkgZmluZCAtIHNvIG5vIG5lZWQgdG8gdHJhY2sgaXRcbiAgLy91cHNlcnQgaXMgaGFuZGxlcyBieSB1cGRhdGVcbiAgWydmaW5kJywgJ3VwZGF0ZScsICdyZW1vdmUnLCAnaW5zZXJ0JywgJ19lbnN1cmVJbmRleCcsICdfZHJvcEluZGV4J10uZm9yRWFjaChmdW5jdGlvbihmdW5jKSB7XG4gICAgdmFyIG9yaWdpbmFsRnVuYyA9IG1vbmdvQ29ubmVjdGlvblByb3RvW2Z1bmNdO1xuICAgIG1vbmdvQ29ubmVjdGlvblByb3RvW2Z1bmNdID0gZnVuY3Rpb24oY29sbE5hbWUsIHNlbGVjdG9yLCBtb2QsIG9wdGlvbnMpIHtcbiAgICAgIHZhciBwYXlsb2FkID0ge1xuICAgICAgICBjb2xsOiBjb2xsTmFtZSxcbiAgICAgICAgZnVuYzogZnVuYyxcbiAgICAgIH07XG5cbiAgICAgIGlmKGZ1bmMgPT0gJ2luc2VydCcpIHtcbiAgICAgICAgLy9hZGQgbm90aGluZyBtb3JlIHRvIHRoZSBwYXlsb2FkXG4gICAgICB9IGVsc2UgaWYoZnVuYyA9PSAnX2Vuc3VyZUluZGV4JyB8fCBmdW5jID09ICdfZHJvcEluZGV4Jykge1xuICAgICAgICAvL2FkZCBpbmRleFxuICAgICAgICBwYXlsb2FkLmluZGV4ID0gSlNPTi5zdHJpbmdpZnkoc2VsZWN0b3IpO1xuICAgICAgfSBlbHNlIGlmKGZ1bmMgPT0gJ3VwZGF0ZScgJiYgb3B0aW9ucyAmJiBvcHRpb25zLnVwc2VydCkge1xuICAgICAgICBwYXlsb2FkLmZ1bmMgPSAndXBzZXJ0JztcbiAgICAgICAgcGF5bG9hZC5zZWxlY3RvciA9IEpTT04uc3RyaW5naWZ5KHNlbGVjdG9yKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vYWxsIHRoZSBvdGhlciBmdW5jdGlvbnMgaGF2ZSBzZWxlY3RvcnNcbiAgICAgICAgcGF5bG9hZC5zZWxlY3RvciA9IEpTT04uc3RyaW5naWZ5KHNlbGVjdG9yKTtcbiAgICAgIH1cblxuICAgICAgdmFyIGthZGlyYUluZm8gPSBLYWRpcmEuX2dldEluZm8oKTtcbiAgICAgIGlmKGthZGlyYUluZm8pIHtcbiAgICAgICAgdmFyIGV2ZW50SWQgPSBLYWRpcmEudHJhY2VyLmV2ZW50KGthZGlyYUluZm8udHJhY2UsICdkYicsIHBheWxvYWQpO1xuICAgICAgfVxuXG4gICAgICAvL3RoaXMgY2F1c2UgVjggdG8gYXZvaWQgYW55IHBlcmZvcm1hbmNlIG9wdGltaXphdGlvbnMsIGJ1dCB0aGlzIGlzIG11c3QgdG8gdXNlXG4gICAgICAvL290aGVyd2lzZSwgaWYgdGhlIGVycm9yIGFkZHMgdHJ5IGNhdGNoIGJsb2NrIG91ciBsb2dzIGdldCBtZXNzeSBhbmQgZGlkbid0IHdvcmtcbiAgICAgIC8vc2VlOiBpc3N1ZSAjNlxuICAgICAgdHJ5e1xuICAgICAgICB2YXIgcmV0ID0gb3JpZ2luYWxGdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIC8vaGFuZGxpbmcgZnVuY3Rpb25zIHdoaWNoIGNhbiBiZSB0cmlnZ2VyZWQgd2l0aCBhbiBhc3luY0NhbGxiYWNrXG4gICAgICAgIHZhciBlbmRPcHRpb25zID0ge307XG5cbiAgICAgICAgaWYoSGF2ZUFzeW5jQ2FsbGJhY2soYXJndW1lbnRzKSkge1xuICAgICAgICAgIGVuZE9wdGlvbnMuYXN5bmMgPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYoZnVuYyA9PSAndXBkYXRlJykge1xuICAgICAgICAgIC8vIHVwc2VydCBvbmx5IHJldHVybnMgYW4gb2JqZWN0IHdoZW4gY2FsbGVkIGB1cHNlcnRgIGRpcmVjdGx5XG4gICAgICAgICAgLy8gb3RoZXJ3aXNlIGl0IG9ubHkgYWN0IGFuIHVwZGF0ZSBjb21tYW5kXG4gICAgICAgICAgaWYob3B0aW9ucyAmJiBvcHRpb25zLnVwc2VydCAmJiB0eXBlb2YgcmV0ID09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBlbmRPcHRpb25zLnVwZGF0ZWREb2NzID0gcmV0Lm51bWJlckFmZmVjdGVkO1xuICAgICAgICAgICAgZW5kT3B0aW9ucy5pbnNlcnRlZElkID0gcmV0Lmluc2VydGVkSWQ7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGVuZE9wdGlvbnMudXBkYXRlZERvY3MgPSByZXQ7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYoZnVuYyA9PSAncmVtb3ZlJykge1xuICAgICAgICAgIGVuZE9wdGlvbnMucmVtb3ZlZERvY3MgPSByZXQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZihldmVudElkKSB7XG4gICAgICAgICAgS2FkaXJhLnRyYWNlci5ldmVudEVuZChrYWRpcmFJbmZvLnRyYWNlLCBldmVudElkLCBlbmRPcHRpb25zKTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaChleCkge1xuICAgICAgICBpZihldmVudElkKSB7XG4gICAgICAgICAgS2FkaXJhLnRyYWNlci5ldmVudEVuZChrYWRpcmFJbmZvLnRyYWNlLCBldmVudElkLCB7ZXJyOiBleC5tZXNzYWdlfSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgZXg7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcbiAgfSk7XG5cbiAgdmFyIGN1cnNvclByb3RvID0gTW9uZ29DdXJzb3IucHJvdG90eXBlO1xuICBbJ2ZvckVhY2gnLCAnbWFwJywgJ2ZldGNoJywgJ2NvdW50JywgJ29ic2VydmVDaGFuZ2VzJywgJ29ic2VydmUnLCAncmV3aW5kJ10uZm9yRWFjaChmdW5jdGlvbih0eXBlKSB7XG4gICAgdmFyIG9yaWdpbmFsRnVuYyA9IGN1cnNvclByb3RvW3R5cGVdO1xuICAgIGN1cnNvclByb3RvW3R5cGVdID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgY3Vyc29yRGVzY3JpcHRpb24gPSB0aGlzLl9jdXJzb3JEZXNjcmlwdGlvbjtcbiAgICAgIHZhciBwYXlsb2FkID0gT2JqZWN0LmFzc2lnbihPYmplY3QuY3JlYXRlKG51bGwpLCB7XG4gICAgICAgIGNvbGw6IGN1cnNvckRlc2NyaXB0aW9uLmNvbGxlY3Rpb25OYW1lLFxuICAgICAgICBzZWxlY3RvcjogSlNPTi5zdHJpbmdpZnkoY3Vyc29yRGVzY3JpcHRpb24uc2VsZWN0b3IpLFxuICAgICAgICBmdW5jOiB0eXBlLFxuICAgICAgICBjdXJzb3I6IHRydWVcbiAgICAgIH0pO1xuXG4gICAgICBpZihjdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zKSB7XG4gICAgICAgIHZhciBjdXJzb3JPcHRpb25zID0gXy5waWNrKGN1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMsIFsnZmllbGRzJywgJ3NvcnQnLCAnbGltaXQnXSk7XG4gICAgICAgIGZvcih2YXIgZmllbGQgaW4gY3Vyc29yT3B0aW9ucykge1xuICAgICAgICAgIHZhciB2YWx1ZSA9IGN1cnNvck9wdGlvbnNbZmllbGRdXG4gICAgICAgICAgaWYodHlwZW9mIHZhbHVlID09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IEpTT04uc3RyaW5naWZ5KHZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcGF5bG9hZFtmaWVsZF0gPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgdmFyIGthZGlyYUluZm8gPSBLYWRpcmEuX2dldEluZm8oKTtcbiAgICAgIGlmKGthZGlyYUluZm8pIHtcbiAgICAgICAgdmFyIGV2ZW50SWQgPSBLYWRpcmEudHJhY2VyLmV2ZW50KGthZGlyYUluZm8udHJhY2UsICdkYicsIHBheWxvYWQpO1xuICAgICAgfVxuXG4gICAgICB0cnl7XG4gICAgICAgIHZhciByZXQgPSBvcmlnaW5hbEZ1bmMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAgICAgICB2YXIgZW5kRGF0YSA9IHt9O1xuICAgICAgICBpZih0eXBlID09ICdvYnNlcnZlQ2hhbmdlcycgfHwgdHlwZSA9PSAnb2JzZXJ2ZScpIHtcbiAgICAgICAgICB2YXIgb2JzZXJ2ZXJEcml2ZXI7XG4gICAgICAgICAgZW5kRGF0YS5vcGxvZyA9IGZhbHNlO1xuICAgICAgICAgIC8vIGdldCBkYXRhIHdyaXR0ZW4gYnkgdGhlIG11bHRpcGxleGVyXG4gICAgICAgICAgZW5kRGF0YS53YXNNdWx0aXBsZXhlclJlYWR5ID0gcmV0Ll93YXNNdWx0aXBsZXhlclJlYWR5O1xuICAgICAgICAgIGVuZERhdGEucXVldWVMZW5ndGggPSByZXQuX3F1ZXVlTGVuZ3RoO1xuICAgICAgICAgIGVuZERhdGEuZWxhcHNlZFBvbGxpbmdUaW1lID0gcmV0Ll9lbGFwc2VkUG9sbGluZ1RpbWU7XG5cbiAgICAgICAgICBpZihyZXQuX211bHRpcGxleGVyKSB7XG4gICAgICAgICAgICAvLyBvbGRlciBtZXRlb3IgdmVyc2lvbnMgZG9uZSBub3QgaGF2ZSBhbiBfbXVsdGlwbGV4ZXIgdmFsdWVcbiAgICAgICAgICAgIG9ic2VydmVyRHJpdmVyID0gcmV0Ll9tdWx0aXBsZXhlci5fb2JzZXJ2ZURyaXZlcjtcbiAgICAgICAgICAgIGlmKG9ic2VydmVyRHJpdmVyKSB7XG4gICAgICAgICAgICAgIG9ic2VydmVyRHJpdmVyID0gcmV0Ll9tdWx0aXBsZXhlci5fb2JzZXJ2ZURyaXZlcjtcbiAgICAgICAgICAgICAgdmFyIG9ic2VydmVyRHJpdmVyQ2xhc3MgPSBvYnNlcnZlckRyaXZlci5jb25zdHJ1Y3RvcjtcbiAgICAgICAgICAgICAgdmFyIHVzZXNPcGxvZyA9IHR5cGVvZiBvYnNlcnZlckRyaXZlckNsYXNzLmN1cnNvclN1cHBvcnRlZCA9PSAnZnVuY3Rpb24nO1xuICAgICAgICAgICAgICBlbmREYXRhLm9wbG9nID0gdXNlc09wbG9nO1xuICAgICAgICAgICAgICB2YXIgc2l6ZSA9IDA7XG4gICAgICAgICAgICAgIHJldC5fbXVsdGlwbGV4ZXIuX2NhY2hlLmRvY3MuZm9yRWFjaChmdW5jdGlvbigpIHtzaXplKyt9KTtcbiAgICAgICAgICAgICAgZW5kRGF0YS5ub09mQ2FjaGVkRG9jcyA9IHNpemU7XG5cbiAgICAgICAgICAgICAgLy8gaWYgbXVsdGlwbGV4ZXJXYXNOb3RSZWFkeSwgd2UgbmVlZCB0byBnZXQgdGhlIHRpbWUgc3BlbmQgZm9yIHRoZSBwb2xsaW5nXG4gICAgICAgICAgICAgIGlmKCFyZXQuX3dhc011bHRpcGxleGVyUmVhZHkpIHtcbiAgICAgICAgICAgICAgICBlbmREYXRhLmluaXRpYWxQb2xsaW5nVGltZSA9IG9ic2VydmVyRHJpdmVyLl9sYXN0UG9sbFRpbWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZighZW5kRGF0YS5vcGxvZykge1xuICAgICAgICAgICAgLy8gbGV0J3MgdHJ5IHRvIGZpbmQgdGhlIHJlYXNvblxuICAgICAgICAgICAgdmFyIHJlYXNvbkluZm8gPSBLYWRpcmEuY2hlY2tXaHlOb09wbG9nKGN1cnNvckRlc2NyaXB0aW9uLCBvYnNlcnZlckRyaXZlcik7XG4gICAgICAgICAgICBlbmREYXRhLm5vT3Bsb2dDb2RlID0gcmVhc29uSW5mby5jb2RlO1xuICAgICAgICAgICAgZW5kRGF0YS5ub09wbG9nUmVhc29uID0gcmVhc29uSW5mby5yZWFzb247XG4gICAgICAgICAgICBlbmREYXRhLm5vT3Bsb2dTb2x1dGlvbiA9IHJlYXNvbkluZm8uc29sdXRpb247XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYodHlwZSA9PSAnZmV0Y2gnIHx8IHR5cGUgPT0gJ21hcCcpe1xuICAgICAgICAgIC8vZm9yIG90aGVyIGN1cnNvciBvcGVyYXRpb25cblxuICAgICAgICAgIGVuZERhdGEuZG9jc0ZldGNoZWQgPSByZXQubGVuZ3RoO1xuXG4gICAgICAgICAgaWYodHlwZSA9PSAnZmV0Y2gnKSB7XG4gICAgICAgICAgICB2YXIgY29sbCA9IGN1cnNvckRlc2NyaXB0aW9uLmNvbGxlY3Rpb25OYW1lO1xuICAgICAgICAgICAgdmFyIHF1ZXJ5ID0gY3Vyc29yRGVzY3JpcHRpb24uc2VsZWN0b3I7XG4gICAgICAgICAgICB2YXIgb3B0cyA9IGN1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnM7XG4gICAgICAgICAgICB2YXIgZG9jU2l6ZSA9IEthZGlyYS5kb2NTekNhY2hlLmdldFNpemUoY29sbCwgcXVlcnksIG9wdHMsIHJldCkgKiByZXQubGVuZ3RoO1xuICAgICAgICAgICAgZW5kRGF0YS5kb2NTaXplID0gZG9jU2l6ZTtcblxuICAgICAgICAgICAgaWYoa2FkaXJhSW5mbykge1xuICAgICAgICAgICAgICBpZihrYWRpcmFJbmZvLnRyYWNlLnR5cGUgPT09ICdtZXRob2QnKSB7XG4gICAgICAgICAgICAgICAgS2FkaXJhLm1vZGVscy5tZXRob2RzLnRyYWNrRG9jU2l6ZShrYWRpcmFJbmZvLnRyYWNlLm5hbWUsIGRvY1NpemUpO1xuICAgICAgICAgICAgICB9IGVsc2UgaWYoa2FkaXJhSW5mby50cmFjZS50eXBlID09PSAnc3ViJykge1xuICAgICAgICAgICAgICAgIEthZGlyYS5tb2RlbHMucHVic3ViLnRyYWNrRG9jU2l6ZShrYWRpcmFJbmZvLnRyYWNlLm5hbWUsIFwiY3Vyc29yRmV0Y2hlc1wiLCBkb2NTaXplKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgLy8gRmV0Y2ggd2l0aCBubyBrYWRpcmEgaW5mbyBhcmUgdHJhY2tlZCBhcyBmcm9tIGEgbnVsbCBtZXRob2RcbiAgICAgICAgICAgICAgS2FkaXJhLm1vZGVscy5tZXRob2RzLnRyYWNrRG9jU2l6ZShcIjxub3QtYS1tZXRob2Qtb3ItYS1wdWI+XCIsIGRvY1NpemUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBUT0RPOiBBZGQgZG9jIHNpemUgdHJhY2tpbmcgdG8gYG1hcGAgYXMgd2VsbC5cbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZihldmVudElkKSB7XG4gICAgICAgICAgS2FkaXJhLnRyYWNlci5ldmVudEVuZChrYWRpcmFJbmZvLnRyYWNlLCBldmVudElkLCBlbmREYXRhKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgfSBjYXRjaChleCkge1xuICAgICAgICBpZihldmVudElkKSB7XG4gICAgICAgICAgS2FkaXJhLnRyYWNlci5ldmVudEVuZChrYWRpcmFJbmZvLnRyYWNlLCBldmVudElkLCB7ZXJyOiBleC5tZXNzYWdlfSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgZXg7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG59O1xuIiwidmFyIG9yaWdpbmFsQ2FsbCA9IEhUVFAuY2FsbDtcblxuSFRUUC5jYWxsID0gZnVuY3Rpb24obWV0aG9kLCB1cmwpIHtcbiAgdmFyIGthZGlyYUluZm8gPSBLYWRpcmEuX2dldEluZm8oKTtcbiAgaWYoa2FkaXJhSW5mbykge1xuICAgIHZhciBldmVudElkID0gS2FkaXJhLnRyYWNlci5ldmVudChrYWRpcmFJbmZvLnRyYWNlLCAnaHR0cCcsIHttZXRob2Q6IG1ldGhvZCwgdXJsOiB1cmx9KTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgdmFyIHJlc3BvbnNlID0gb3JpZ2luYWxDYWxsLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgICAvL2lmIHRoZSB1c2VyIHN1cHBsaWVkIGFuIGFzeW5DYWxsYmFjaywgd2UgZG9uJ3QgaGF2ZSBhIHJlc3BvbnNlIG9iamVjdCBhbmQgaXQgaGFuZGxlZCBhc3luY2hyb25vdXNseVxuICAgIC8vd2UgbmVlZCB0byB0cmFjayBpdCBkb3duIHRvIHByZXZlbnQgaXNzdWVzIGxpa2U6ICMzXG4gICAgdmFyIGVuZE9wdGlvbnMgPSBIYXZlQXN5bmNDYWxsYmFjayhhcmd1bWVudHMpPyB7YXN5bmM6IHRydWV9OiB7c3RhdHVzQ29kZTogcmVzcG9uc2Uuc3RhdHVzQ29kZX07XG4gICAgaWYoZXZlbnRJZCkge1xuICAgICAgS2FkaXJhLnRyYWNlci5ldmVudEVuZChrYWRpcmFJbmZvLnRyYWNlLCBldmVudElkLCBlbmRPcHRpb25zKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3BvbnNlO1xuICB9IGNhdGNoKGV4KSB7XG4gICAgaWYoZXZlbnRJZCkge1xuICAgICAgS2FkaXJhLnRyYWNlci5ldmVudEVuZChrYWRpcmFJbmZvLnRyYWNlLCBldmVudElkLCB7ZXJyOiBleC5tZXNzYWdlfSk7XG4gICAgfVxuICAgIHRocm93IGV4O1xuICB9XG59OyIsInZhciBvcmlnaW5hbFNlbmQgPSBFbWFpbC5zZW5kO1xuXG5FbWFpbC5zZW5kID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICB2YXIga2FkaXJhSW5mbyA9IEthZGlyYS5fZ2V0SW5mbygpO1xuICBpZihrYWRpcmFJbmZvKSB7XG4gICAgdmFyIGRhdGEgPSBfLnBpY2sob3B0aW9ucywgJ2Zyb20nLCAndG8nLCAnY2MnLCAnYmNjJywgJ3JlcGx5VG8nKTtcbiAgICB2YXIgZXZlbnRJZCA9IEthZGlyYS50cmFjZXIuZXZlbnQoa2FkaXJhSW5mby50cmFjZSwgJ2VtYWlsJywgZGF0YSk7XG4gIH1cbiAgdHJ5IHtcbiAgICB2YXIgcmV0ID0gb3JpZ2luYWxTZW5kLmNhbGwodGhpcywgb3B0aW9ucyk7XG4gICAgaWYoZXZlbnRJZCkge1xuICAgICAgS2FkaXJhLnRyYWNlci5ldmVudEVuZChrYWRpcmFJbmZvLnRyYWNlLCBldmVudElkKTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfSBjYXRjaChleCkge1xuICAgIGlmKGV2ZW50SWQpIHtcbiAgICAgIEthZGlyYS50cmFjZXIuZXZlbnRFbmQoa2FkaXJhSW5mby50cmFjZSwgZXZlbnRJZCwge2VycjogZXgubWVzc2FnZX0pO1xuICAgIH1cbiAgICB0aHJvdyBleDtcbiAgfVxufTsiLCJ2YXIgRmliZXJzID0gTnBtLnJlcXVpcmUoJ2ZpYmVycycpO1xuXG52YXIgb3JpZ2luYWxZaWVsZCA9IEZpYmVycy55aWVsZDtcbkZpYmVycy55aWVsZCA9IGZ1bmN0aW9uKCkge1xuICB2YXIga2FkaXJhSW5mbyA9IEthZGlyYS5fZ2V0SW5mbygpO1xuICBpZihrYWRpcmFJbmZvKSB7XG4gICAgdmFyIGV2ZW50SWQgPSBLYWRpcmEudHJhY2VyLmV2ZW50KGthZGlyYUluZm8udHJhY2UsICdhc3luYycpOztcbiAgICBpZihldmVudElkKSB7XG4gICAgICBGaWJlcnMuY3VycmVudC5fYXBtRXZlbnRJZCA9IGV2ZW50SWQ7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG9yaWdpbmFsWWllbGQoKTtcbn07XG5cbnZhciBvcmlnaW5hbFJ1biA9IEZpYmVycy5wcm90b3R5cGUucnVuO1xuRmliZXJzLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbih2YWwpIHtcbiAgaWYodGhpcy5fYXBtRXZlbnRJZCkge1xuICAgIHZhciBrYWRpcmFJbmZvID0gS2FkaXJhLl9nZXRJbmZvKHRoaXMpO1xuICAgIGlmKGthZGlyYUluZm8pIHtcbiAgICAgIEthZGlyYS50cmFjZXIuZXZlbnRFbmQoa2FkaXJhSW5mby50cmFjZSwgdGhpcy5fYXBtRXZlbnRJZCk7XG4gICAgICB0aGlzLl9hcG1FdmVudElkID0gbnVsbDtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG9yaWdpbmFsUnVuLmNhbGwodGhpcywgdmFsKTtcbn07XG4iLCJUcmFja1VuY2F1Z2h0RXhjZXB0aW9ucyA9IGZ1bmN0aW9uICgpIHtcbiAgcHJvY2Vzcy5vbigndW5jYXVnaHRFeGNlcHRpb24nLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgLy8gc2tpcCBlcnJvcnMgd2l0aCBgX3NraXBLYWRpcmFgIGZsYWdcbiAgICBpZihlcnIuX3NraXBLYWRpcmEpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBsZXQgdGhlIHNlcnZlciBjcmFzaCBub3JtYWxseSBpZiBlcnJvciB0cmFja2luZyBpcyBkaXNhYmxlZFxuICAgIGlmKCFLYWRpcmEub3B0aW9ucy5lbmFibGVFcnJvclRyYWNraW5nKSB7XG4gICAgICBwcmludEVycm9yQW5kS2lsbChlcnIpO1xuICAgIH1cblxuICAgIC8vIGxvb2tpbmcgZm9yIGFscmVhZHkgdHJhY2tlZCBlcnJvcnMgYW5kIHRocm93IHRoZW0gaW1tZWRpYXRlbHlcbiAgICAvLyB0aHJvdyBlcnJvciBpbW1lZGlhdGVseSBpZiBrYWRpcmEgaXMgbm90IHJlYWR5XG4gICAgaWYoZXJyLl90cmFja2VkIHx8ICFLYWRpcmEuY29ubmVjdGVkKSB7XG4gICAgICBwcmludEVycm9yQW5kS2lsbChlcnIpO1xuICAgIH1cblxuICAgIHZhciB0cmFjZSA9IGdldFRyYWNlKGVyciwgJ3NlcnZlci1jcmFzaCcsICd1bmNhdWdodEV4Y2VwdGlvbicpO1xuICAgIEthZGlyYS5tb2RlbHMuZXJyb3IudHJhY2tFcnJvcihlcnIsIHRyYWNlKTtcbiAgICBLYWRpcmEuX3NlbmRQYXlsb2FkKGZ1bmN0aW9uICgpIHtcbiAgICAgIGNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgICB0aHJvd0Vycm9yKGVycik7XG4gICAgfSk7XG5cbiAgICB2YXIgdGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgIHRocm93RXJyb3IoZXJyKTtcbiAgICB9LCAxMDAwKjEwKTtcblxuICAgIGZ1bmN0aW9uIHRocm93RXJyb3IoZXJyKSB7XG4gICAgICAvLyBzb21ldGltZXMgZXJyb3IgY2FtZSBiYWNrIGZyb20gYSBmaWJlci5cbiAgICAgIC8vIEJ1dCB3ZSBkb24ndCBmaWJlcnMgdG8gdHJhY2sgdGhhdCBlcnJvciBmb3IgdXNcbiAgICAgIC8vIFRoYXQncyB3aHkgd2UgdGhyb3cgdGhlIGVycm9yIG9uIHRoZSBuZXh0VGlja1xuICAgICAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gd2UgbmVlZCB0byBtYXJrIHRoaXMgZXJyb3Igd2hlcmUgd2UgcmVhbGx5IG5lZWQgdG8gdGhyb3dcbiAgICAgICAgZXJyLl90cmFja2VkID0gdHJ1ZTtcbiAgICAgICAgcHJpbnRFcnJvckFuZEtpbGwoZXJyKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG5cbiAgZnVuY3Rpb24gcHJpbnRFcnJvckFuZEtpbGwoZXJyKSB7XG4gICAgLy8gc2luY2Ugd2UgYXJlIGNhcHR1cmluZyBlcnJvciwgd2UgYXJlIGFsc28gb24gdGhlIGVycm9yIG1lc3NhZ2UuXG4gICAgLy8gc28gZGV2ZWxvcGVycyB0aGluayB3ZSBhcmUgYWxzbyByZXBvbnNpYmxlIGZvciB0aGUgZXJyb3IuXG4gICAgLy8gQnV0IHdlIGFyZSBub3QuIFRoaXMgd2lsbCBmaXggdGhhdC5cbiAgICBjb25zb2xlLmVycm9yKGVyci5zdGFjayk7XG4gICAgcHJvY2Vzcy5leGl0KDcpO1xuICB9XG59XG5cblRyYWNrTWV0ZW9yRGVidWcgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBvcmlnaW5hbE1ldGVvckRlYnVnID0gTWV0ZW9yLl9kZWJ1ZztcbiAgTWV0ZW9yLl9kZWJ1ZyA9IGZ1bmN0aW9uIChtZXNzYWdlLCBzdGFjaykge1xuICAgIGlmKCFLYWRpcmEub3B0aW9ucy5lbmFibGVFcnJvclRyYWNraW5nKSB7XG4gICAgICByZXR1cm4gb3JpZ2luYWxNZXRlb3JEZWJ1Zy5jYWxsKHRoaXMsIG1lc3NhZ2UsIHN0YWNrKTtcbiAgICB9XG5cbiAgICAvLyBXZSd2ZSBjaGFuZ2VkIGBzdGFja2AgaW50byBhbiBvYmplY3QgYXQgbWV0aG9kIGFuZCBzdWIgaGFuZGxlcnMgc28gd2UgY2FuXG4gICAgLy8gaWdub3JlIHRoZW0gaGVyZS4gVGhlc2UgZXJyb3JzIGFyZSBhbHJlYWR5IHRyYWNrZWQgc28gZG9uJ3QgdHJhY2sgYWdhaW4uXG4gICAgaWYoc3RhY2sgJiYgc3RhY2suc3RhY2spIHtcbiAgICAgIHN0YWNrID0gc3RhY2suc3RhY2s7XG4gICAgICAvLyBSZXN0b3JlIHNvIG9yaWdpb25hbE1ldGVvckRlYnVnIHNob3dzIHRoZSBzdGFjayBhcyBhIHN0cmluZyBpbnN0ZWFkIGFzXG4gICAgICAvLyBhbiBvYmplY3RcbiAgICAgIGFyZ3VtZW50c1sxXSA9IHN0YWNrO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBvbmx5IHNlbmQgdG8gdGhlIHNlcnZlciwgaWYgb25seSBjb25uZWN0ZWQgdG8ga2FkaXJhXG4gICAgICBpZihLYWRpcmEuY29ubmVjdGVkKSB7XG4gICAgICAgIHZhciBlcnJvciA9IG5ldyBFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgZXJyb3Iuc3RhY2sgPSBzdGFjaztcbiAgICAgICAgdmFyIHRyYWNlID0gZ2V0VHJhY2UoZXJyb3IsICdzZXJ2ZXItaW50ZXJuYWwnLCAnTWV0ZW9yLl9kZWJ1ZycpO1xuICAgICAgICBLYWRpcmEubW9kZWxzLmVycm9yLnRyYWNrRXJyb3IoZXJyb3IsIHRyYWNlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gb3JpZ2luYWxNZXRlb3JEZWJ1Zy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldFRyYWNlKGVyciwgdHlwZSwgc3ViVHlwZSkge1xuICByZXR1cm4ge1xuICAgIHR5cGU6IHR5cGUsXG4gICAgc3ViVHlwZTogc3ViVHlwZSxcbiAgICBuYW1lOiBlcnIubWVzc2FnZSxcbiAgICBlcnJvcmVkOiB0cnVlLFxuICAgIGF0OiBLYWRpcmEuc3luY2VkRGF0ZS5nZXRUaW1lKCksXG4gICAgZXZlbnRzOiBbXG4gICAgICBbJ3N0YXJ0JywgMCwge31dLFxuICAgICAgWydlcnJvcicsIDAsIHtlcnJvcjoge21lc3NhZ2U6IGVyci5tZXNzYWdlLCBzdGFjazogZXJyLnN0YWNrfX1dXG4gICAgXSxcbiAgICBtZXRyaWNzOiB7XG4gICAgICB0b3RhbDogMFxuICAgIH1cbiAgfTtcbn1cbiIsImltcG9ydCB7XG4gIFNlc3Npb24sXG4gIE11bHRpcGxleGVyLFxuICBNb25nb0Nvbm5lY3Rpb24sXG4gIE1vbmdvQ3Vyc29yLFxufSBmcm9tIFwiLi9tZXRlb3J4LmpzXCI7XG5cbnNldExhYmVscyA9IGZ1bmN0aW9uICgpIHtcbiAgLy8gbmFtZSBTZXNzaW9uLnByb3RvdHlwZS5zZW5kXG4gIHZhciBvcmlnaW5hbFNlbmQgPSBTZXNzaW9uLnByb3RvdHlwZS5zZW5kO1xuICBTZXNzaW9uLnByb3RvdHlwZS5zZW5kID0gZnVuY3Rpb24ga2FkaXJhX1Nlc3Npb25fc2VuZCAobXNnKSB7XG4gICAgcmV0dXJuIG9yaWdpbmFsU2VuZC5jYWxsKHRoaXMsIG1zZyk7XG4gIH1cblxuICAvLyBuYW1lIE11bHRpcGxleGVyIGluaXRpYWwgYWRkc1xuICB2YXIgb3JpZ2luYWxTZW5kQWRkcyA9IE11bHRpcGxleGVyLnByb3RvdHlwZS5fc2VuZEFkZHM7XG4gIE11bHRpcGxleGVyLnByb3RvdHlwZS5fc2VuZEFkZHMgPSBmdW5jdGlvbiBrYWRpcmFfTXVsdGlwbGV4ZXJfc2VuZEFkZHMgKGhhbmRsZSkge1xuICAgIHJldHVybiBvcmlnaW5hbFNlbmRBZGRzLmNhbGwodGhpcywgaGFuZGxlKTtcbiAgfVxuXG4gIC8vIG5hbWUgTW9uZ29Db25uZWN0aW9uIGluc2VydFxuICB2YXIgb3JpZ2luYWxNb25nb0luc2VydCA9IE1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuX2luc2VydDtcbiAgTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5faW5zZXJ0ID0gZnVuY3Rpb24ga2FkaXJhX01vbmdvQ29ubmVjdGlvbl9pbnNlcnQgKGNvbGwsIGRvYywgY2IpIHtcbiAgICByZXR1cm4gb3JpZ2luYWxNb25nb0luc2VydC5jYWxsKHRoaXMsIGNvbGwsIGRvYywgY2IpO1xuICB9XG5cbiAgLy8gbmFtZSBNb25nb0Nvbm5lY3Rpb24gdXBkYXRlXG4gIHZhciBvcmlnaW5hbE1vbmdvVXBkYXRlID0gTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5fdXBkYXRlO1xuICBNb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLl91cGRhdGUgPSBmdW5jdGlvbiBrYWRpcmFfTW9uZ29Db25uZWN0aW9uX3VwZGF0ZSAoY29sbCwgc2VsZWN0b3IsIG1vZCwgb3B0aW9ucywgY2IpIHtcbiAgICByZXR1cm4gb3JpZ2luYWxNb25nb1VwZGF0ZS5jYWxsKHRoaXMsIGNvbGwsIHNlbGVjdG9yLCBtb2QsIG9wdGlvbnMsIGNiKTtcbiAgfVxuXG4gIC8vIG5hbWUgTW9uZ29Db25uZWN0aW9uIHJlbW92ZVxuICB2YXIgb3JpZ2luYWxNb25nb1JlbW92ZSA9IE1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuX3JlbW92ZTtcbiAgTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5fcmVtb3ZlID0gZnVuY3Rpb24ga2FkaXJhX01vbmdvQ29ubmVjdGlvbl9yZW1vdmUgKGNvbGwsIHNlbGVjdG9yLCBjYikge1xuICAgIHJldHVybiBvcmlnaW5hbE1vbmdvUmVtb3ZlLmNhbGwodGhpcywgY29sbCwgc2VsZWN0b3IsIGNiKTtcbiAgfVxuXG4gIC8vIG5hbWUgUHVic3ViIGFkZGVkXG4gIHZhciBvcmlnaW5hbFB1YnN1YkFkZGVkID0gU2Vzc2lvbi5wcm90b3R5cGUuc2VuZEFkZGVkO1xuICBTZXNzaW9uLnByb3RvdHlwZS5zZW5kQWRkZWQgPSBmdW5jdGlvbiBrYWRpcmFfU2Vzc2lvbl9zZW5kQWRkZWQgKGNvbGwsIGlkLCBmaWVsZHMpIHtcbiAgICByZXR1cm4gb3JpZ2luYWxQdWJzdWJBZGRlZC5jYWxsKHRoaXMsIGNvbGwsIGlkLCBmaWVsZHMpO1xuICB9XG5cbiAgLy8gbmFtZSBQdWJzdWIgY2hhbmdlZFxuICB2YXIgb3JpZ2luYWxQdWJzdWJDaGFuZ2VkID0gU2Vzc2lvbi5wcm90b3R5cGUuc2VuZENoYW5nZWQ7XG4gIFNlc3Npb24ucHJvdG90eXBlLnNlbmRDaGFuZ2VkID0gZnVuY3Rpb24ga2FkaXJhX1Nlc3Npb25fc2VuZENoYW5nZWQgKGNvbGwsIGlkLCBmaWVsZHMpIHtcbiAgICByZXR1cm4gb3JpZ2luYWxQdWJzdWJDaGFuZ2VkLmNhbGwodGhpcywgY29sbCwgaWQsIGZpZWxkcyk7XG4gIH1cblxuICAvLyBuYW1lIFB1YnN1YiByZW1vdmVkXG4gIHZhciBvcmlnaW5hbFB1YnN1YlJlbW92ZWQgPSBTZXNzaW9uLnByb3RvdHlwZS5zZW5kUmVtb3ZlZDtcbiAgU2Vzc2lvbi5wcm90b3R5cGUuc2VuZFJlbW92ZWQgPSBmdW5jdGlvbiBrYWRpcmFfU2Vzc2lvbl9zZW5kUmVtb3ZlZCAoY29sbCwgaWQpIHtcbiAgICByZXR1cm4gb3JpZ2luYWxQdWJzdWJSZW1vdmVkLmNhbGwodGhpcywgY29sbCwgaWQpO1xuICB9XG5cbiAgLy8gbmFtZSBNb25nb0N1cnNvciBmb3JFYWNoXG4gIHZhciBvcmlnaW5hbEN1cnNvckZvckVhY2ggPSBNb25nb0N1cnNvci5wcm90b3R5cGUuZm9yRWFjaDtcbiAgTW9uZ29DdXJzb3IucHJvdG90eXBlLmZvckVhY2ggPSBmdW5jdGlvbiBrYWRpcmFfQ3Vyc29yX2ZvckVhY2ggKCkge1xuICAgIHJldHVybiBvcmlnaW5hbEN1cnNvckZvckVhY2guYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfVxuXG4gIC8vIG5hbWUgTW9uZ29DdXJzb3IgbWFwXG4gIHZhciBvcmlnaW5hbEN1cnNvck1hcCA9IE1vbmdvQ3Vyc29yLnByb3RvdHlwZS5tYXA7XG4gIE1vbmdvQ3Vyc29yLnByb3RvdHlwZS5tYXAgPSBmdW5jdGlvbiBrYWRpcmFfQ3Vyc29yX21hcCAoKSB7XG4gICAgcmV0dXJuIG9yaWdpbmFsQ3Vyc29yTWFwLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH1cblxuICAvLyBuYW1lIE1vbmdvQ3Vyc29yIGZldGNoXG4gIHZhciBvcmlnaW5hbEN1cnNvckZldGNoID0gTW9uZ29DdXJzb3IucHJvdG90eXBlLmZldGNoO1xuICBNb25nb0N1cnNvci5wcm90b3R5cGUuZmV0Y2ggPSBmdW5jdGlvbiBrYWRpcmFfQ3Vyc29yX2ZldGNoICgpIHtcbiAgICByZXR1cm4gb3JpZ2luYWxDdXJzb3JGZXRjaC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9XG5cbiAgLy8gbmFtZSBNb25nb0N1cnNvciBjb3VudFxuICB2YXIgb3JpZ2luYWxDdXJzb3JDb3VudCA9IE1vbmdvQ3Vyc29yLnByb3RvdHlwZS5jb3VudDtcbiAgTW9uZ29DdXJzb3IucHJvdG90eXBlLmNvdW50ID0gZnVuY3Rpb24ga2FkaXJhX0N1cnNvcl9jb3VudCAoKSB7XG4gICAgcmV0dXJuIG9yaWdpbmFsQ3Vyc29yQ291bnQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfVxuXG4gIC8vIG5hbWUgTW9uZ29DdXJzb3Igb2JzZXJ2ZUNoYW5nZXNcbiAgdmFyIG9yaWdpbmFsQ3Vyc29yT2JzZXJ2ZUNoYW5nZXMgPSBNb25nb0N1cnNvci5wcm90b3R5cGUub2JzZXJ2ZUNoYW5nZXM7XG4gIE1vbmdvQ3Vyc29yLnByb3RvdHlwZS5vYnNlcnZlQ2hhbmdlcyA9IGZ1bmN0aW9uIGthZGlyYV9DdXJzb3Jfb2JzZXJ2ZUNoYW5nZXMgKCkge1xuICAgIHJldHVybiBvcmlnaW5hbEN1cnNvck9ic2VydmVDaGFuZ2VzLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH1cblxuICAvLyBuYW1lIE1vbmdvQ3Vyc29yIG9ic2VydmVcbiAgdmFyIG9yaWdpbmFsQ3Vyc29yT2JzZXJ2ZSA9IE1vbmdvQ3Vyc29yLnByb3RvdHlwZS5vYnNlcnZlO1xuICBNb25nb0N1cnNvci5wcm90b3R5cGUub2JzZXJ2ZSA9IGZ1bmN0aW9uIGthZGlyYV9DdXJzb3Jfb2JzZXJ2ZSAoKSB7XG4gICAgcmV0dXJuIG9yaWdpbmFsQ3Vyc29yT2JzZXJ2ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9XG5cbiAgLy8gbmFtZSBNb25nb0N1cnNvciByZXdpbmRcbiAgdmFyIG9yaWdpbmFsQ3Vyc29yUmV3aW5kID0gTW9uZ29DdXJzb3IucHJvdG90eXBlLnJld2luZDtcbiAgTW9uZ29DdXJzb3IucHJvdG90eXBlLnJld2luZCA9IGZ1bmN0aW9uIGthZGlyYV9DdXJzb3JfcmV3aW5kICgpIHtcbiAgICByZXR1cm4gb3JpZ2luYWxDdXJzb3JSZXdpbmQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfVxuXG4gIC8vIG5hbWUgQ3Jvc3NCYXIgbGlzdGVuXG4gIHZhciBvcmlnaW5hbENyb3NzYmFyTGlzdGVuID0gRERQU2VydmVyLl9Dcm9zc2Jhci5wcm90b3R5cGUubGlzdGVuO1xuICBERFBTZXJ2ZXIuX0Nyb3NzYmFyLnByb3RvdHlwZS5saXN0ZW4gPSBmdW5jdGlvbiBrYWRpcmFfQ3Jvc3NiYXJfbGlzdGVuICh0cmlnZ2VyLCBjYWxsYmFjaykge1xuICAgIHJldHVybiBvcmlnaW5hbENyb3NzYmFyTGlzdGVuLmNhbGwodGhpcywgdHJpZ2dlciwgY2FsbGJhY2spO1xuICB9XG5cbiAgLy8gbmFtZSBDcm9zc0JhciBmaXJlXG4gIHZhciBvcmlnaW5hbENyb3NzYmFyRmlyZSA9IEREUFNlcnZlci5fQ3Jvc3NiYXIucHJvdG90eXBlLmZpcmU7XG4gIEREUFNlcnZlci5fQ3Jvc3NiYXIucHJvdG90eXBlLmZpcmUgPSBmdW5jdGlvbiBrYWRpcmFfQ3Jvc3NiYXJfZmlyZSAobm90aWZpY2F0aW9uKSB7XG4gICAgcmV0dXJuIG9yaWdpbmFsQ3Jvc3NiYXJGaXJlLmNhbGwodGhpcywgbm90aWZpY2F0aW9uKTtcbiAgfVxufVxuIiwiLy8gVmFyaW91cyB0cmlja3MgZm9yIGFjY2Vzc2luZyBcInByaXZhdGVcIiBNZXRlb3IgQVBJcyBib3Jyb3dlZCBmcm9tIHRoZVxuLy8gbm93LXVubWFpbnRhaW5lZCBtZXRlb3JoYWNrczptZXRlb3J4IHBhY2thZ2UuXG5cbmltcG9ydCB7IGdldCB9IGZyb20gXCIuLi91dGlscy5qc1wiO1xuXG5leHBvcnQgY29uc3QgU2VydmVyID0gTWV0ZW9yLnNlcnZlci5jb25zdHJ1Y3RvcjtcblxuZnVuY3Rpb24gZ2V0U2Vzc2lvbigpIHtcbiAgY29uc3QgZmFrZVNvY2tldCA9IHtcbiAgICBzZW5kKCkge30sXG4gICAgY2xvc2UoKSB7fSxcbiAgICBoZWFkZXJzOiBbXVxuICB9O1xuXG4gIGNvbnN0IHNlcnZlciA9IE1ldGVvci5zZXJ2ZXI7XG5cbiAgc2VydmVyLl9oYW5kbGVDb25uZWN0KGZha2VTb2NrZXQsIHtcbiAgICBtc2c6IFwiY29ubmVjdFwiLFxuICAgIHZlcnNpb246IFwicHJlMVwiLFxuICAgIHN1cHBvcnQ6IFtcInByZTFcIl1cbiAgfSk7XG5cbiAgY29uc3Qgc2Vzc2lvbiA9IGZha2VTb2NrZXQuX21ldGVvclNlc3Npb247XG5cbiAgc2VydmVyLl9yZW1vdmVTZXNzaW9uKHNlc3Npb24pO1xuXG4gIHJldHVybiBzZXNzaW9uO1xufVxuXG5jb25zdCBzZXNzaW9uID0gZ2V0U2Vzc2lvbigpO1xuZXhwb3J0IGNvbnN0IFNlc3Npb24gPSBzZXNzaW9uLmNvbnN0cnVjdG9yO1xuXG5jb25zdCBjb2xsZWN0aW9uID0gbmV3IE1vbmdvLkNvbGxlY3Rpb24oXCJfX2R1bW15X2NvbGxfXCIgKyBSYW5kb20uaWQoKSk7XG5jb2xsZWN0aW9uLmZpbmRPbmUoKTtcbmNvbnN0IGN1cnNvciA9IGNvbGxlY3Rpb24uZmluZCgpO1xuZXhwb3J0IGNvbnN0IE1vbmdvQ3Vyc29yID0gY3Vyc29yLmNvbnN0cnVjdG9yO1xuXG5mdW5jdGlvbiBnZXRNdWx0aXBsZXhlcihjdXJzb3IpIHtcbiAgY29uc3QgaGFuZGxlID0gY3Vyc29yLm9ic2VydmVDaGFuZ2VzKHtcbiAgICBhZGRlZCgpIHt9XG4gIH0pO1xuICBoYW5kbGUuc3RvcCgpO1xuICByZXR1cm4gaGFuZGxlLl9tdWx0aXBsZXhlcjtcbn1cblxuZXhwb3J0IGNvbnN0IE11bHRpcGxleGVyID0gZ2V0TXVsdGlwbGV4ZXIoY3Vyc29yKS5jb25zdHJ1Y3RvcjtcblxuLy8gRHVlIHRvIE1ldGVvciAyLjcuNCwgZGVmYXVsdFJlbW90ZUNvbGxlY3Rpb25Ecml2ZXIgY2FuIGJlIEFzeW5jIG5vdyBodHRwczovL2dpdGh1Yi5jb20vbWV0ZW9yL21ldGVvci9wdWxsLzEyMDU3XG5jb25zdCBtb25nb0RyaXZlciA9IE1vbmdvSW50ZXJuYWxzLmRlZmF1bHRSZW1vdGVDb2xsZWN0aW9uRHJpdmVyKClcbmV4cG9ydCBjb25zdCBNb25nb0Nvbm5lY3Rpb24gPVxuICAobW9uZ29Ecml2ZXIuYXdhaXQgPyBtb25nb0RyaXZlci5hd2FpdCgpIDogbW9uZ29Ecml2ZXIpLm1vbmdvLmNvbnN0cnVjdG9yO1xuXG5mdW5jdGlvbiBnZXRTdWJzY3JpcHRpb24oc2Vzc2lvbikge1xuICBjb25zdCBzdWJJZCA9IFJhbmRvbS5pZCgpO1xuXG4gIHNlc3Npb24uX3N0YXJ0U3Vic2NyaXB0aW9uKGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnJlYWR5KCk7XG4gIH0sIHN1YklkLCBbXSwgXCJfX2R1bW15X3B1Yl9cIiArIFJhbmRvbS5pZCgpKTtcblxuICBjb25zdCBzdWJzY3JpcHRpb24gPSBnZXQoc2Vzc2lvbi5fbmFtZWRTdWJzLCBzdWJJZCk7XG5cbiAgc2Vzc2lvbi5fc3RvcFN1YnNjcmlwdGlvbihzdWJJZCk7XG5cbiAgcmV0dXJuIHN1YnNjcmlwdGlvbjtcbn1cblxuZXhwb3J0IGNvbnN0IFN1YnNjcmlwdGlvbiA9IGdldFN1YnNjcmlwdGlvbihzZXNzaW9uKS5jb25zdHJ1Y3RvcjtcblxuZnVuY3Rpb24gZ2V0T2JzZXJ2ZXJEcml2ZXIoY3Vyc29yKSB7XG4gIGNvbnN0IG11bHRpcGxleGVyID0gZ2V0TXVsdGlwbGV4ZXIoY3Vyc29yKTtcbiAgcmV0dXJuIG11bHRpcGxleGVyICYmIG11bHRpcGxleGVyLl9vYnNlcnZlRHJpdmVyIHx8IG51bGw7XG59XG5cbmZ1bmN0aW9uIGdldE1vbmdvT3Bsb2dEcml2ZXIoKSB7XG4gIGNvbnN0IGRyaXZlciA9IGdldE9ic2VydmVyRHJpdmVyKGN1cnNvcik7XG4gIGxldCBNb25nb09wbG9nRHJpdmVyID0gZHJpdmVyICYmIGRyaXZlci5jb25zdHJ1Y3RvciB8fCBudWxsO1xuICBpZiAoTW9uZ29PcGxvZ0RyaXZlciAmJlxuICAgICAgdHlwZW9mIE1vbmdvT3Bsb2dEcml2ZXIuY3Vyc29yU3VwcG9ydGVkICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICByZXR1cm4gTW9uZ29PcGxvZ0RyaXZlcjtcbn1cblxuZXhwb3J0IGNvbnN0IE1vbmdvT3Bsb2dEcml2ZXIgPSBnZXRNb25nb09wbG9nRHJpdmVyKCk7XG5cbmZ1bmN0aW9uIGdldE1vbmdvUG9sbGluZ0RyaXZlcigpIHtcbiAgY29uc3QgY3Vyc29yID0gY29sbGVjdGlvbi5maW5kKHt9LCB7XG4gICAgbGltaXQ6IDIwLFxuICAgIF9kaXNhYmxlT3Bsb2c6IHRydWUsXG4gIH0pO1xuXG4gIGNvbnN0IGRyaXZlciA9IGdldE9ic2VydmVyRHJpdmVyKGN1cnNvcik7XG5cbiAgLy8gdmVyaWZ5IG9ic2VydmVyIGRyaXZlciBpcyBhIHBvbGxpbmcgZHJpdmVyXG4gIGlmIChkcml2ZXIgJiYgdHlwZW9mIGRyaXZlci5jb25zdHJ1Y3Rvci5jdXJzb3JTdXBwb3J0ZWQgPT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICByZXR1cm4gZHJpdmVyLmNvbnN0cnVjdG9yO1xuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG5cbmV4cG9ydCBjb25zdCBNb25nb1BvbGxpbmdEcml2ZXIgPSBnZXRNb25nb1BvbGxpbmdEcml2ZXIoKTtcbiIsIkthZGlyYS5fcGFyc2VFbnYgPSBmdW5jdGlvbiAoZW52KSB7XG4gIHZhciBvcHRpb25zID0ge307XG4gIGZvcih2YXIgbmFtZSBpbiBlbnYpIHtcbiAgICB2YXIgaW5mbyA9IEthZGlyYS5fcGFyc2VFbnYuX29wdGlvbnNbbmFtZV07XG4gICAgdmFyIHZhbHVlID0gZW52W25hbWVdO1xuICAgIGlmKGluZm8gJiYgdmFsdWUpIHtcbiAgICAgIG9wdGlvbnNbaW5mby5uYW1lXSA9IGluZm8ucGFyc2VyKHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gb3B0aW9ucztcbn07XG5cblxuS2FkaXJhLl9wYXJzZUVudi5wYXJzZUludCA9IGZ1bmN0aW9uIChzdHIpIHtcbiAgdmFyIG51bSA9IHBhcnNlSW50KHN0cik7XG4gIGlmKG51bSB8fCBudW0gPT09IDApIHJldHVybiBudW07XG4gIHRocm93IG5ldyBFcnJvcignS2FkaXJhOiBNYXRjaCBFcnJvcjogXCInK251bSsnXCIgaXMgbm90IGEgbnVtYmVyJyk7XG59O1xuXG5cbkthZGlyYS5fcGFyc2VFbnYucGFyc2VCb29sID0gZnVuY3Rpb24gKHN0cikge1xuICBzdHIgPSBzdHIudG9Mb3dlckNhc2UoKTtcbiAgaWYoc3RyID09PSAndHJ1ZScpIHJldHVybiB0cnVlO1xuICBpZihzdHIgPT09ICdmYWxzZScpIHJldHVybiBmYWxzZTtcbiAgdGhyb3cgbmV3IEVycm9yKCdLYWRpcmE6IE1hdGNoIEVycm9yOiAnK3N0cisnIGlzIG5vdCBhIGJvb2xlYW4nKTtcbn07XG5cblxuS2FkaXJhLl9wYXJzZUVudi5wYXJzZVVybCA9IGZ1bmN0aW9uIChzdHIpIHtcbiAgcmV0dXJuIHN0cjtcbn07XG5cblxuS2FkaXJhLl9wYXJzZUVudi5wYXJzZVN0cmluZyA9IGZ1bmN0aW9uIChzdHIpIHtcbiAgcmV0dXJuIHN0cjtcbn07XG5cblxuS2FkaXJhLl9wYXJzZUVudi5fb3B0aW9ucyA9IHtcbiAgLy8gZGVsYXkgdG8gc2VuZCB0aGUgaW5pdGlhbCBwaW5nIHRvIHRoZSBrYWRpcmEgZW5naW5lIGFmdGVyIHBhZ2UgbG9hZHNcbiAgQVBNX09QVElPTlNfQ0xJRU5UX0VOR0lORV9TWU5DX0RFTEFZOiB7XG4gICAgbmFtZTogJ2NsaWVudEVuZ2luZVN5bmNEZWxheScsXG4gICAgcGFyc2VyOiBLYWRpcmEuX3BhcnNlRW52LnBhcnNlSW50LFxuICB9LFxuICAvLyB0aW1lIGJldHdlZW4gc2VuZGluZyBlcnJvcnMgdG8gdGhlIGVuZ2luZVxuICBBUE1fT1BUSU9OU19FUlJPUl9EVU1QX0lOVEVSVkFMOiB7XG4gICAgbmFtZTogJ2Vycm9yRHVtcEludGVydmFsJyxcbiAgICBwYXJzZXI6IEthZGlyYS5fcGFyc2VFbnYucGFyc2VJbnQsXG4gIH0sXG4gIC8vIG5vIG9mIGVycm9ycyBhbGxvd2VkIGluIGEgZ2l2ZW4gaW50ZXJ2YWxcbiAgQVBNX09QVElPTlNfTUFYX0VSUk9SU19QRVJfSU5URVJWQUw6IHtcbiAgICBuYW1lOiAnbWF4RXJyb3JzUGVySW50ZXJ2YWwnLFxuICAgIHBhcnNlcjogS2FkaXJhLl9wYXJzZUVudi5wYXJzZUludCxcbiAgfSxcbiAgLy8gYSB6b25lLmpzIHNwZWNpZmljIG9wdGlvbiB0byBjb2xsZWN0IHRoZSBmdWxsIHN0YWNrIHRyYWNlKHdoaWNoIGlzIG5vdCBtdWNoIHVzZWZ1bClcbiAgQVBNX09QVElPTlNfQ09MTEVDVF9BTExfU1RBQ0tTOiB7XG4gICAgbmFtZTogJ2NvbGxlY3RBbGxTdGFja3MnLFxuICAgIHBhcnNlcjogS2FkaXJhLl9wYXJzZUVudi5wYXJzZUJvb2wsXG4gIH0sXG4gIC8vIGVuYWJsZSBlcnJvciB0cmFja2luZyAod2hpY2ggaXMgdHVybmVkIG9uIGJ5IGRlZmF1bHQpXG4gIEFQTV9PUFRJT05TX0VOQUJMRV9FUlJPUl9UUkFDS0lORzoge1xuICAgIG5hbWU6ICdlbmFibGVFcnJvclRyYWNraW5nJyxcbiAgICBwYXJzZXI6IEthZGlyYS5fcGFyc2VFbnYucGFyc2VCb29sLFxuICB9LFxuICAvLyBrYWRpcmEgZW5naW5lIGVuZHBvaW50XG4gIEFQTV9PUFRJT05TX0VORFBPSU5UOiB7XG4gICAgbmFtZTogJ2VuZHBvaW50JyxcbiAgICBwYXJzZXI6IEthZGlyYS5fcGFyc2VFbnYucGFyc2VVcmwsXG4gIH0sXG4gIC8vIGRlZmluZSB0aGUgaG9zdG5hbWUgb2YgdGhlIGN1cnJlbnQgcnVubmluZyBwcm9jZXNzXG4gIEFQTV9PUFRJT05TX0hPU1ROQU1FOiB7XG4gICAgbmFtZTogJ2hvc3RuYW1lJyxcbiAgICBwYXJzZXI6IEthZGlyYS5fcGFyc2VFbnYucGFyc2VTdHJpbmcsXG4gIH0sXG4gIC8vIGludGVydmFsIGJldHdlZW4gc2VuZGluZyBkYXRhIHRvIHRoZSBrYWRpcmEgZW5naW5lIGZyb20gdGhlIHNlcnZlclxuICBBUE1fT1BUSU9OU19QQVlMT0FEX1RJTUVPVVQ6IHtcbiAgICBuYW1lOiAncGF5bG9hZFRpbWVvdXQnLFxuICAgIHBhcnNlcjogS2FkaXJhLl9wYXJzZUVudi5wYXJzZUludCxcbiAgfSxcbiAgLy8gc2V0IEhUVFAvSFRUUFMgcHJveHlcbiAgQVBNX09QVElPTlNfUFJPWFk6IHtcbiAgICBuYW1lOiAncHJveHknLFxuICAgIHBhcnNlcjogS2FkaXJhLl9wYXJzZUVudi5wYXJzZVVybCxcbiAgfSxcbiAgLy8gbnVtYmVyIG9mIGl0ZW1zIGNhY2hlZCBmb3IgdHJhY2tpbmcgZG9jdW1lbnQgc2l6ZVxuICBBUE1fT1BUSU9OU19ET0NVTUVOVF9TSVpFX0NBQ0hFX1NJWkU6IHtcbiAgICBuYW1lOiAnZG9jdW1lbnRTaXplQ2FjaGVTaXplJyxcbiAgICBwYXJzZXI6IEthZGlyYS5fcGFyc2VFbnYucGFyc2VJbnQsXG4gIH0sXG59O1xuIiwiS2FkaXJhLl9jb25uZWN0V2l0aEVudiA9IGZ1bmN0aW9uKCkge1xuICBjb25zdCBzZXR0aW5ncyA9IE1ldGVvci5zZXR0aW5ncyAmJiBNZXRlb3Iuc2V0dGluZ3MucGFja2FnZXMgJiZcbiAgICBNZXRlb3Iuc2V0dGluZ3MucGFja2FnZXNbJ21kZzptZXRlb3ItYXBtLWFnZW50J107XG5cbiAgaWYgKHNldHRpbmdzICYmIHNldHRpbmdzLmlzRGlzYWJsZWQpIHtcbiAgICBjb25zb2xlLmxvZygnTWV0ZW9yIEFQTTogbm90IGNvbm5lY3RlZCBiZWNhdXNlIGl0IHdhcyBkaXNhYmxlZCBpbiBzZXR0aW5ncycpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmIChwcm9jZXNzLmVudi5BUE1fQVBQX0lEICYmIHByb2Nlc3MuZW52LkFQTV9BUFBfU0VDUkVUICYmIHByb2Nlc3MuZW52LkFQTV9PUFRJT05TX0VORFBPSU5UKSB7XG4gICAgY29uc3Qgb3B0aW9ucyA9IEthZGlyYS5fcGFyc2VFbnYocHJvY2Vzcy5lbnYpO1xuXG4gICAgS2FkaXJhLmNvbm5lY3QoXG4gICAgICBwcm9jZXNzLmVudi5BUE1fQVBQX0lELFxuICAgICAgcHJvY2Vzcy5lbnYuQVBNX0FQUF9TRUNSRVQsXG4gICAgICBvcHRpb25zXG4gICAgKTtcblxuICAgIEthZGlyYS5jb25uZWN0ID0gZnVuY3Rpb24oKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGVvciBBUE0gaGFzIGFscmVhZHkgY29ubmVjdGVkIHVzaW5nIGNyZWRlbnRpYWxzIGZyb20gRW52aXJvbm1lbnQgVmFyaWFibGVzJyk7XG4gICAgfTtcbiAgfVxuXG4gIGlmIChzZXR0aW5ncyAmJiBzZXR0aW5ncy5BUE1fQVBQX0lEICYmIHNldHRpbmdzLkFQTV9BUFBfU0VDUkVUKSB7XG4gICAgY29uc3Qgb3B0aW9ucyA9IEthZGlyYS5fcGFyc2VFbnYoc2V0dGluZ3MpO1xuXG4gICAgS2FkaXJhLmNvbm5lY3QoXG4gICAgICBzZXR0aW5ncy5BUE1fQVBQX0lELFxuICAgICAgc2V0dGluZ3MuQVBNX0FQUF9TRUNSRVQsXG4gICAgICBvcHRpb25zXG4gICAgKTtcblxuICAgIEthZGlyYS5jb25uZWN0ID0gZnVuY3Rpb24oKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGVvciBBUE0gaGFzIGFscmVhZHkgY29ubmVjdGVkIHVzaW5nIGNyZWRlbnRpYWxzIGZyb20gYXBwIE1ldGVvci5zZXR0aW5ncycpO1xuICAgIH07XG4gIH1cbiAgLy8gb3RoZXIgZm9ybXMgb2YgS2FkaXJhLmNvbm5lY3QgYXJlIG5vdCBzdXBwb3J0ZWRcbn07XG5cbi8vIFRyeSB0byBjb25uZWN0IGF1dG9tYXRpY2FsbHlcbkthZGlyYS5fY29ubmVjdFdpdGhFbnYoKTtcbiJdfQ==
