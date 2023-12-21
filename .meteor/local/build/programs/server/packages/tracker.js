(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var Tracker, Deps, computation;

var require = meteorInstall({"node_modules":{"meteor":{"tracker":{"tracker.js":function module(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/tracker/tracker.js                                                                                        //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
/////////////////////////////////////////////////////
// Package docs at http://docs.meteor.com/#tracker //
/////////////////////////////////////////////////////

/**
 * @namespace Tracker
 * @summary The namespace for Tracker-related methods.
 */
Tracker = {};

/**
 * @namespace Deps
 * @deprecated
 */
Deps = Tracker;

// http://docs.meteor.com/#tracker_active

/**
 * @summary True if there is a current computation, meaning that dependencies on reactive data sources will be tracked and potentially cause the current computation to be rerun.
 * @locus Client
 * @type {Boolean}
 */
Tracker.active = false;

// http://docs.meteor.com/#tracker_currentcomputation

/**
 * @summary The current computation, or `null` if there isn't one.  The current computation is the [`Tracker.Computation`](#tracker_computation) object created by the innermost active call to `Tracker.autorun`, and it's the computation that gains dependencies when reactive data sources are accessed.
 * @locus Client
 * @type {Tracker.Computation}
 */
Tracker.currentComputation = null;
function _debugFunc() {
  // We want this code to work without Meteor, and also without
  // "console" (which is technically non-standard and may be missing
  // on some browser we come across, like it was on IE 7).
  //
  // Lazy evaluation because `Meteor` does not exist right away.(??)
  return typeof Meteor !== "undefined" ? Meteor._debug : typeof console !== "undefined" && console.error ? function () {
    console.error.apply(console, arguments);
  } : function () {};
}
function _maybeSuppressMoreLogs(messagesLength) {
  // Sometimes when running tests, we intentionally suppress logs on expected
  // printed errors. Since the current implementation of _throwOrLog can log
  // multiple separate log messages, suppress all of them if at least one suppress
  // is expected as we still want them to count as one.
  if (typeof Meteor !== "undefined") {
    if (Meteor._suppressed_log_expected()) {
      Meteor._suppress_log(messagesLength - 1);
    }
  }
}
function _throwOrLog(from, e) {
  if (throwFirstError) {
    throw e;
  } else {
    var printArgs = ["Exception from Tracker " + from + " function:"];
    if (e.stack && e.message && e.name) {
      var idx = e.stack.indexOf(e.message);
      if (idx < 0 || idx > e.name.length + 2) {
        // check for "Error: "
        // message is not part of the stack
        var message = e.name + ": " + e.message;
        printArgs.push(message);
      }
    }
    printArgs.push(e.stack);
    _maybeSuppressMoreLogs(printArgs.length);
    for (var i = 0; i < printArgs.length; i++) {
      _debugFunc()(printArgs[i]);
    }
  }
}

// Takes a function `f`, and wraps it in a `Meteor._noYieldsAllowed`
// block if we are running on the server. On the client, returns the
// original function (since `Meteor._noYieldsAllowed` is a
// no-op). This has the benefit of not adding an unnecessary stack
// frame on the client.
function withNoYieldsAllowed(f) {
  if (typeof Meteor === 'undefined' || Meteor.isClient) {
    return f;
  } else {
    return function () {
      var args = arguments;
      Meteor._noYieldsAllowed(function () {
        f.apply(null, args);
      });
    };
  }
}
var nextId = 1;
// computations whose callbacks we should call at flush time
var pendingComputations = [];
// `true` if a Tracker.flush is scheduled, or if we are in Tracker.flush now
var willFlush = false;
// `true` if we are in Tracker.flush now
var inFlush = false;
// `true` if we are computing a computation now, either first time
// or recompute.  This matches Tracker.active unless we are inside
// Tracker.nonreactive, which nullfies currentComputation even though
// an enclosing computation may still be running.
var inCompute = false;
// `true` if the `_throwFirstError` option was passed in to the call
// to Tracker.flush that we are in. When set, throw rather than log the
// first error encountered while flushing. Before throwing the error,
// finish flushing (from a finally block), logging any subsequent
// errors.
var throwFirstError = false;
var afterFlushCallbacks = [];
function requireFlush() {
  if (!willFlush) {
    // We want this code to work without Meteor, see debugFunc above
    if (typeof Meteor !== "undefined") Meteor._setImmediate(Tracker._runFlush);else setTimeout(Tracker._runFlush, 0);
    willFlush = true;
  }
}

// Tracker.Computation constructor is visible but private
// (throws an error if you try to call it)
var constructingComputation = false;

//
// http://docs.meteor.com/#tracker_computation

/**
 * @summary A Computation object represents code that is repeatedly rerun
 * in response to
 * reactive data changes. Computations don't have return values; they just
 * perform actions, such as rerendering a template on the screen. Computations
 * are created using Tracker.autorun. Use stop to prevent further rerunning of a
 * computation.
 * @instancename computation
 */
Tracker.Computation = class Computation {
  constructor(f, parent, onError) {
    if (!constructingComputation) throw new Error("Tracker.Computation constructor is private; use Tracker.autorun");
    constructingComputation = false;

    // http://docs.meteor.com/#computation_stopped

    /**
     * @summary True if this computation has been stopped.
     * @locus Client
     * @memberOf Tracker.Computation
     * @instance
     * @name  stopped
     */
    this.stopped = false;

    // http://docs.meteor.com/#computation_invalidated

    /**
     * @summary True if this computation has been invalidated (and not yet rerun), or if it has been stopped.
     * @locus Client
     * @memberOf Tracker.Computation
     * @instance
     * @name  invalidated
     * @type {Boolean}
     */
    this.invalidated = false;

    // http://docs.meteor.com/#computation_firstrun

    /**
     * @summary True during the initial run of the computation at the time `Tracker.autorun` is called, and false on subsequent reruns and at other times.
     * @locus Client
     * @memberOf Tracker.Computation
     * @instance
     * @name  firstRun
     * @type {Boolean}
     */
    this.firstRun = true;
    this._id = nextId++;
    this._onInvalidateCallbacks = [];
    this._onStopCallbacks = [];
    // the plan is at some point to use the parent relation
    // to constrain the order that computations are processed
    this._parent = parent;
    this._func = f;
    this._onError = onError;
    this._recomputing = false;

    /**
     * @summary Forces autorun blocks to be executed in synchronous-looking order by storing the value autorun promise thus making it awaitable.
     * @locus Client
     * @memberOf Tracker.Computation
     * @instance
     * @name  firstRunPromise
     * @returns {Promise<unknown>}
     */
    this.firstRunPromise = undefined;
    var errored = true;
    try {
      this._compute();
      errored = false;
    } finally {
      this.firstRun = false;
      if (errored) this.stop();
    }
  }

  /**
  * Resolves the firstRunPromise with the result of the autorun function.
  * @param {*} onResolved
  * @param {*} onRejected
  * @returns{Promise<unknown}
  */
  then(onResolved, onRejected) {
    return this.firstRunPromise.then(onResolved, onRejected);
  }
  catch(onRejected) {
    return this.firstRunPromise.catch(onRejected);
  }
  // http://docs.meteor.com/#computation_oninvalidate

  /**
   * @summary Registers `callback` to run when this computation is next invalidated, or runs it immediately if the computation is already invalidated.  The callback is run exactly once and not upon future invalidations unless `onInvalidate` is called again after the computation becomes valid again.
   * @locus Client
   * @param {Function} callback Function to be called on invalidation. Receives one argument, the computation that was invalidated.
   */
  onInvalidate(f) {
    if (typeof f !== 'function') throw new Error("onInvalidate requires a function");
    if (this.invalidated) {
      Tracker.nonreactive(() => {
        withNoYieldsAllowed(f)(this);
      });
    } else {
      this._onInvalidateCallbacks.push(f);
    }
  }

  /**
   * @summary Registers `callback` to run when this computation is stopped, or runs it immediately if the computation is already stopped.  The callback is run after any `onInvalidate` callbacks.
   * @locus Client
   * @param {Function} callback Function to be called on stop. Receives one argument, the computation that was stopped.
   */
  onStop(f) {
    if (typeof f !== 'function') throw new Error("onStop requires a function");
    if (this.stopped) {
      Tracker.nonreactive(() => {
        withNoYieldsAllowed(f)(this);
      });
    } else {
      this._onStopCallbacks.push(f);
    }
  }

  // http://docs.meteor.com/#computation_invalidate

  /**
   * @summary Invalidates this computation so that it will be rerun.
   * @locus Client
   */
  invalidate() {
    if (!this.invalidated) {
      // if we're currently in _recompute(), don't enqueue
      // ourselves, since we'll rerun immediately anyway.
      if (!this._recomputing && !this.stopped) {
        requireFlush();
        pendingComputations.push(this);
      }
      this.invalidated = true;

      // callbacks can't add callbacks, because
      // this.invalidated === true.
      for (var i = 0, f; f = this._onInvalidateCallbacks[i]; i++) {
        Tracker.nonreactive(() => {
          withNoYieldsAllowed(f)(this);
        });
      }
      this._onInvalidateCallbacks = [];
    }
  }

  // http://docs.meteor.com/#computation_stop

  /**
   * @summary Prevents this computation from rerunning.
   * @locus Client
   */
  stop() {
    if (!this.stopped) {
      this.stopped = true;
      this.invalidate();
      for (var i = 0, f; f = this._onStopCallbacks[i]; i++) {
        Tracker.nonreactive(() => {
          withNoYieldsAllowed(f)(this);
        });
      }
      this._onStopCallbacks = [];
    }
  }
  _compute() {
    this.invalidated = false;
    var previousInCompute = inCompute;
    inCompute = true;
    try {
      // In case of async functions, the result of this function will contain the promise of the autorun function
      // & make autoruns await-able.
      const firstRunPromise = Tracker.withComputation(this, () => {
        return withNoYieldsAllowed(this._func)(this);
      });
      // We'll store the firstRunPromise on the computation so it can be awaited by the callers, but only
      // during the first run. We don't want things to get mixed up.
      if (this.firstRun) {
        this.firstRunPromise = Promise.resolve(firstRunPromise);
      }
    } finally {
      inCompute = previousInCompute;
    }
  }
  _needsRecompute() {
    return this.invalidated && !this.stopped;
  }
  _recompute() {
    this._recomputing = true;
    try {
      if (this._needsRecompute()) {
        try {
          this._compute();
        } catch (e) {
          if (this._onError) {
            this._onError(e);
          } else {
            _throwOrLog("recompute", e);
          }
        }
      }
    } finally {
      this._recomputing = false;
    }
  }

  /**
   * @summary Process the reactive updates for this computation immediately
   * and ensure that the computation is rerun. The computation is rerun only
   * if it is invalidated.
   * @locus Client
   */
  flush() {
    if (this._recomputing) return;
    this._recompute();
  }

  /**
   * @summary Causes the function inside this computation to run and
   * synchronously process all reactive updtes.
   * @locus Client
   */
  run() {
    this.invalidate();
    this.flush();
  }
};

//
// http://docs.meteor.com/#tracker_dependency

/**
 * @summary A Dependency represents an atomic unit of reactive data that a
 * computation might depend on. Reactive data sources such as Session or
 * Minimongo internally create different Dependency objects for different
 * pieces of data, each of which may be depended on by multiple computations.
 * When the data changes, the computations are invalidated.
 * @class
 * @instanceName dependency
 */
Tracker.Dependency = class Dependency {
  constructor() {
    this._dependentsById = Object.create(null);
  }

  // http://docs.meteor.com/#dependency_depend
  //
  // Adds `computation` to this set if it is not already
  // present.  Returns true if `computation` is a new member of the set.
  // If no argument, defaults to currentComputation, or does nothing
  // if there is no currentComputation.

  /**
   * @summary Declares that the current computation (or `fromComputation` if given) depends on `dependency`.  The computation will be invalidated the next time `dependency` changes.
    If there is no current computation and `depend()` is called with no arguments, it does nothing and returns false.
    Returns true if the computation is a new dependent of `dependency` rather than an existing one.
   * @locus Client
   * @param {Tracker.Computation} [fromComputation] An optional computation declared to depend on `dependency` instead of the current computation.
   * @returns {Boolean}
   */
  depend(computation) {
    if (!computation) {
      if (!Tracker.active) return false;
      computation = Tracker.currentComputation;
    }
    var id = computation._id;
    if (!(id in this._dependentsById)) {
      this._dependentsById[id] = computation;
      computation.onInvalidate(() => {
        delete this._dependentsById[id];
      });
      return true;
    }
    return false;
  }

  // http://docs.meteor.com/#dependency_changed

  /**
   * @summary Invalidate all dependent computations immediately and remove them as dependents.
   * @locus Client
   */
  changed() {
    for (var id in this._dependentsById) this._dependentsById[id].invalidate();
  }

  // http://docs.meteor.com/#dependency_hasdependents

  /**
   * @summary True if this Dependency has one or more dependent Computations, which would be invalidated if this Dependency were to change.
   * @locus Client
   * @returns {Boolean}
   */
  hasDependents() {
    for (var id in this._dependentsById) return true;
    return false;
  }
};

// http://docs.meteor.com/#tracker_flush

/**
 * @summary Process all reactive updates immediately and ensure that all invalidated computations are rerun.
 * @locus Client
 */
Tracker.flush = function (options) {
  Tracker._runFlush({
    finishSynchronously: true,
    throwFirstError: options && options._throwFirstError
  });
};

/**
 * @summary True if we are computing a computation now, either first time or recompute.  This matches Tracker.active unless we are inside Tracker.nonreactive, which nullfies currentComputation even though an enclosing computation may still be running.
 * @locus Client
 * @returns {Boolean}
 */
Tracker.inFlush = function () {
  return inFlush;
};

// Run all pending computations and afterFlush callbacks.  If we were not called
// directly via Tracker.flush, this may return before they're all done to allow
// the event loop to run a little before continuing.
Tracker._runFlush = function (options) {
  // XXX What part of the comment below is still true? (We no longer
  // have Spark)
  //
  // Nested flush could plausibly happen if, say, a flush causes
  // DOM mutation, which causes a "blur" event, which runs an
  // app event handler that calls Tracker.flush.  At the moment
  // Spark blocks event handlers during DOM mutation anyway,
  // because the LiveRange tree isn't valid.  And we don't have
  // any useful notion of a nested flush.
  //
  // https://app.asana.com/0/159908330244/385138233856
  if (Tracker.inFlush()) throw new Error("Can't call Tracker.flush while flushing");
  if (inCompute) throw new Error("Can't flush inside Tracker.autorun");
  options = options || {};
  inFlush = true;
  willFlush = true;
  throwFirstError = !!options.throwFirstError;
  var recomputedCount = 0;
  var finishedTry = false;
  try {
    while (pendingComputations.length || afterFlushCallbacks.length) {
      // recompute all pending computations
      while (pendingComputations.length) {
        var comp = pendingComputations.shift();
        comp._recompute();
        if (comp._needsRecompute()) {
          pendingComputations.unshift(comp);
        }
        if (!options.finishSynchronously && ++recomputedCount > 1000) {
          finishedTry = true;
          return;
        }
      }
      if (afterFlushCallbacks.length) {
        // call one afterFlush callback, which may
        // invalidate more computations
        var func = afterFlushCallbacks.shift();
        try {
          func();
        } catch (e) {
          _throwOrLog("afterFlush", e);
        }
      }
    }
    finishedTry = true;
  } finally {
    if (!finishedTry) {
      // we're erroring due to throwFirstError being true.
      inFlush = false; // needed before calling `Tracker.flush()` again
      // finish flushing
      Tracker._runFlush({
        finishSynchronously: options.finishSynchronously,
        throwFirstError: false
      });
    }
    willFlush = false;
    inFlush = false;
    if (pendingComputations.length || afterFlushCallbacks.length) {
      // We're yielding because we ran a bunch of computations and we aren't
      // required to finish synchronously, so we'd like to give the event loop a
      // chance. We should flush again soon.
      if (options.finishSynchronously) {
        throw new Error("still have more to do?"); // shouldn't happen
      }
      setTimeout(requireFlush, 10);
    }
  }
};

// http://docs.meteor.com/#tracker_autorun
//
// Run f(). Record its dependencies. Rerun it whenever the
// dependencies change.
//
// Returns a new Computation, which is also passed to f.
//
// Links the computation to the current computation
// so that it is stopped if the current computation is invalidated.

/**
 * @callback Tracker.ComputationFunction
 * @param {Tracker.Computation}
 */
/**
 * @summary Run a function now and rerun it later whenever its dependencies
 * change. Returns a Computation object that can be used to stop or observe the
 * rerunning.
 * @locus Client
 * @param {Tracker.ComputationFunction} runFunc The function to run. It receives
 * one argument: the Computation object that will be returned.
 * @param {Object} [options]
 * @param {Function} options.onError Optional. The function to run when an error
 * happens in the Computation. The only argument it receives is the Error
 * thrown. Defaults to the error being logged to the console.
 * @returns {Tracker.Computation}
 */
Tracker.autorun = function (f) {
  let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  if (typeof f !== 'function') throw new Error('Tracker.autorun requires a function argument');
  constructingComputation = true;
  var c = new Tracker.Computation(f, Tracker.currentComputation, options.onError);
  if (Tracker.active) Tracker.onInvalidate(function () {
    c.stop();
  });
  return c;
};

// http://docs.meteor.com/#tracker_nonreactive
//
// Run `f` with no current computation, returning the return value
// of `f`.  Used to turn off reactivity for the duration of `f`,
// so that reactive data sources accessed by `f` will not result in any
// computations being invalidated.

/**
 * @summary Run a function without tracking dependencies.
 * @locus Client
 * @param {Function} func A function to call immediately.
 */
Tracker.nonreactive = function (f) {
  return Tracker.withComputation(null, f);
};

/**
 * @summary Helper function to make the tracker work with promises.
 * @param computation Computation that tracked
 * @param func async function that needs to be called and be reactive
 */
Tracker.withComputation = function (computation, f) {
  var previousComputation = Tracker.currentComputation;
  Tracker.currentComputation = computation;
  Tracker.active = !!computation;
  try {
    return f();
  } finally {
    Tracker.currentComputation = previousComputation;
    Tracker.active = !!previousComputation;
  }
};

// http://docs.meteor.com/#tracker_oninvalidate

/**
 * @summary Registers a new [`onInvalidate`](#computation_oninvalidate) callback on the current computation (which must exist), to be called immediately when the current computation is invalidated or stopped.
 * @locus Client
 * @param {Function} callback A callback function that will be invoked as `func(c)`, where `c` is the computation on which the callback is registered.
 */
Tracker.onInvalidate = function (f) {
  if (!Tracker.active) throw new Error("Tracker.onInvalidate requires a currentComputation");
  Tracker.currentComputation.onInvalidate(f);
};

// http://docs.meteor.com/#tracker_afterflush

/**
 * @summary Schedules a function to be called during the next flush, or later in the current flush if one is in progress, after all invalidated computations have been rerun.  The function will be run once and not on subsequent flushes unless `afterFlush` is called again.
 * @locus Client
 * @param {Function} callback A function to call at flush time.
 */
Tracker.afterFlush = function (f) {
  afterFlushCallbacks.push(f);
  requireFlush();
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

require("/node_modules/meteor/tracker/tracker.js");

/* Exports */
Package._define("tracker", {
  Tracker: Tracker,
  Deps: Deps
});

})();

//# sourceURL=meteor://💻app/packages/tracker.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvdHJhY2tlci90cmFja2VyLmpzIl0sIm5hbWVzIjpbIlRyYWNrZXIiLCJEZXBzIiwiYWN0aXZlIiwiY3VycmVudENvbXB1dGF0aW9uIiwiX2RlYnVnRnVuYyIsIk1ldGVvciIsIl9kZWJ1ZyIsImNvbnNvbGUiLCJlcnJvciIsImFwcGx5IiwiYXJndW1lbnRzIiwiX21heWJlU3VwcHJlc3NNb3JlTG9ncyIsIm1lc3NhZ2VzTGVuZ3RoIiwiX3N1cHByZXNzZWRfbG9nX2V4cGVjdGVkIiwiX3N1cHByZXNzX2xvZyIsIl90aHJvd09yTG9nIiwiZnJvbSIsImUiLCJ0aHJvd0ZpcnN0RXJyb3IiLCJwcmludEFyZ3MiLCJzdGFjayIsIm1lc3NhZ2UiLCJuYW1lIiwiaWR4IiwiaW5kZXhPZiIsImxlbmd0aCIsInB1c2giLCJpIiwid2l0aE5vWWllbGRzQWxsb3dlZCIsImYiLCJpc0NsaWVudCIsImFyZ3MiLCJfbm9ZaWVsZHNBbGxvd2VkIiwibmV4dElkIiwicGVuZGluZ0NvbXB1dGF0aW9ucyIsIndpbGxGbHVzaCIsImluRmx1c2giLCJpbkNvbXB1dGUiLCJhZnRlckZsdXNoQ2FsbGJhY2tzIiwicmVxdWlyZUZsdXNoIiwiX3NldEltbWVkaWF0ZSIsIl9ydW5GbHVzaCIsInNldFRpbWVvdXQiLCJjb25zdHJ1Y3RpbmdDb21wdXRhdGlvbiIsIkNvbXB1dGF0aW9uIiwiY29uc3RydWN0b3IiLCJwYXJlbnQiLCJvbkVycm9yIiwiRXJyb3IiLCJzdG9wcGVkIiwiaW52YWxpZGF0ZWQiLCJmaXJzdFJ1biIsIl9pZCIsIl9vbkludmFsaWRhdGVDYWxsYmFja3MiLCJfb25TdG9wQ2FsbGJhY2tzIiwiX3BhcmVudCIsIl9mdW5jIiwiX29uRXJyb3IiLCJfcmVjb21wdXRpbmciLCJmaXJzdFJ1blByb21pc2UiLCJ1bmRlZmluZWQiLCJlcnJvcmVkIiwiX2NvbXB1dGUiLCJzdG9wIiwidGhlbiIsIm9uUmVzb2x2ZWQiLCJvblJlamVjdGVkIiwiY2F0Y2giLCJvbkludmFsaWRhdGUiLCJub25yZWFjdGl2ZSIsIm9uU3RvcCIsImludmFsaWRhdGUiLCJwcmV2aW91c0luQ29tcHV0ZSIsIndpdGhDb21wdXRhdGlvbiIsIlByb21pc2UiLCJyZXNvbHZlIiwiX25lZWRzUmVjb21wdXRlIiwiX3JlY29tcHV0ZSIsImZsdXNoIiwicnVuIiwiRGVwZW5kZW5jeSIsIl9kZXBlbmRlbnRzQnlJZCIsIk9iamVjdCIsImNyZWF0ZSIsImRlcGVuZCIsImNvbXB1dGF0aW9uIiwiaWQiLCJjaGFuZ2VkIiwiaGFzRGVwZW5kZW50cyIsIm9wdGlvbnMiLCJmaW5pc2hTeW5jaHJvbm91c2x5IiwiX3Rocm93Rmlyc3RFcnJvciIsInJlY29tcHV0ZWRDb3VudCIsImZpbmlzaGVkVHJ5IiwiY29tcCIsInNoaWZ0IiwidW5zaGlmdCIsImZ1bmMiLCJhdXRvcnVuIiwiYyIsInByZXZpb3VzQ29tcHV0YXRpb24iLCJhZnRlckZsdXNoIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQUEsT0FBTyxHQUFHLENBQUMsQ0FBQzs7QUFFWjtBQUNBO0FBQ0E7QUFDQTtBQUNBQyxJQUFJLEdBQUdELE9BQU87O0FBRWQ7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBQSxPQUFPLENBQUNFLE1BQU0sR0FBRyxLQUFLOztBQUV0Qjs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0FGLE9BQU8sQ0FBQ0csa0JBQWtCLEdBQUcsSUFBSTtBQUVqQyxTQUFTQyxVQUFVQSxDQUFBLEVBQUc7RUFDcEI7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLE9BQVEsT0FBT0MsTUFBTSxLQUFLLFdBQVcsR0FBR0EsTUFBTSxDQUFDQyxNQUFNLEdBQzNDLE9BQU9DLE9BQU8sS0FBSyxXQUFXLElBQUtBLE9BQU8sQ0FBQ0MsS0FBSyxHQUNqRCxZQUFZO0lBQUVELE9BQU8sQ0FBQ0MsS0FBSyxDQUFDQyxL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QUFDLEVBQUU7RUFDbEMsSUFBSSxDQUFFN0IsT0FBTyxDQUFDRSxNQUFNLEVBQ2xCLE1BQU0sSUFBSThDLEtBQUssQ0FBQyxvREFBb0QsQ0FBQztFQUV2RWhELE9BQU8sQ0FBQ0csa0JBQWtCLENBQUNpRSxZQUFZLENBQUN2QyxDQUFDLENBQUM7QUFDNUMsQ0FBQzs7QUFFRDs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E3QixPQUFPLENBQUNxRyxVQUFVLEdBQUcsVUFBVXhFLENBQUMsRUFBRTtFQUNoQ1MsbUJBQW1CLENBQUNaLElBQUksQ0FBQ0csQ0FBQyxDQUFDO0VBQzNCVSxZQUFZLENBQUMsQ0FBQztBQUNoQixDQUFDLEMiLCJmaWxlIjoiL3BhY2thZ2VzL3RyYWNrZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gUGFja2FnZSBkb2NzIGF0IGh0dHA6Ly9kb2NzLm1ldGVvci5jb20vI3RyYWNrZXIgLy9cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cbi8qKlxuICogQG5hbWVzcGFjZSBUcmFja2VyXG4gKiBAc3VtbWFyeSBUaGUgbmFtZXNwYWNlIGZvciBUcmFja2VyLXJlbGF0ZWQgbWV0aG9kcy5cbiAqL1xuVHJhY2tlciA9IHt9O1xuXG4vKipcbiAqIEBuYW1lc3BhY2UgRGVwc1xuICogQGRlcHJlY2F0ZWRcbiAqL1xuRGVwcyA9IFRyYWNrZXI7XG5cbi8vIGh0dHA6Ly9kb2NzLm1ldGVvci5jb20vI3RyYWNrZXJfYWN0aXZlXG5cbi8qKlxuICogQHN1bW1hcnkgVHJ1ZSBpZiB0aGVyZSBpcyBhIGN1cnJlbnQgY29tcHV0YXRpb24sIG1lYW5pbmcgdGhhdCBkZXBlbmRlbmNpZXMgb24gcmVhY3RpdmUgZGF0YSBzb3VyY2VzIHdpbGwgYmUgdHJhY2tlZCBhbmQgcG90ZW50aWFsbHkgY2F1c2UgdGhlIGN1cnJlbnQgY29tcHV0YXRpb24gdG8gYmUgcmVydW4uXG4gKiBAbG9jdXMgQ2xpZW50XG4gKiBAdHlwZSB7Qm9vbGVhbn1cbiAqL1xuVHJhY2tlci5hY3RpdmUgPSBmYWxzZTtcblxuLy8gaHR0cDovL2RvY3MubWV0ZW9yLmNvbS8jdHJhY2tlcl9jdXJyZW50Y29tcHV0YXRpb25cblxuLyoqXG4gKiBAc3VtbWFyeSBUaGUgY3VycmVudCBjb21wdXRhdGlvbiwgb3IgYG51bGxgIGlmIHRoZXJlIGlzbid0IG9uZS4gIFRoZSBjdXJyZW50IGNvbXB1dGF0aW9uIGlzIHRoZSBbYFRyYWNrZXIuQ29tcHV0YXRpb25gXSgjdHJhY2tlcl9jb21wdXRhdGlvbikgb2JqZWN0IGNyZWF0ZWQgYnkgdGhlIGlubmVybW9zdCBhY3RpdmUgY2FsbCB0byBgVHJhY2tlci5hdXRvcnVuYCwgYW5kIGl0J3MgdGhlIGNvbXB1dGF0aW9uIHRoYXQgZ2FpbnMgZGVwZW5kZW5jaWVzIHdoZW4gcmVhY3RpdmUgZGF0YSBzb3VyY2VzIGFyZSBhY2Nlc3NlZC5cbiAqIEBsb2N1cyBDbGllbnRcbiAqIEB0eXBlIHtUcmFja2VyLkNvbXB1dGF0aW9ufVxuICovXG5UcmFja2VyLmN1cnJlbnRDb21wdXRhdGlvbiA9IG51bGw7XG5cbmZ1bmN0aW9uIF9kZWJ1Z0Z1bmMoKSB7XG4gIC8vIFdlIHdhbnQgdGhpcyBjb2RlIHRvIHdvcmsgd2l0aG91dCBNZXRlb3IsIGFuZCBhbHNvIHdpdGhvdXRcbiAgLy8gXCJjb25zb2xlXCIgKHdoaWNoIGlzIHRlY2huaWNhbGx5IG5vbi1zdGFuZGFyZCBhbmQgbWF5IGJlIG1pc3NpbmdcbiAgLy8gb24gc29tZSBicm93c2VyIHdlIGNvbWUgYWNyb3NzLCBsaWtlIGl0IHdhcyBvbiBJRSA3KS5cbiAgLy9cbiAgLy8gTGF6eSBldmFsdWF0aW9uIGJlY2F1c2UgYE1ldGVvcmAgZG9lcyBub3QgZXhpc3QgcmlnaHQgYXdheS4oPz8pXG4gIHJldHVybiAodHlwZW9mIE1ldGVvciAhPT0gXCJ1bmRlZmluZWRcIiA/IE1ldGVvci5fZGVidWcgOlxuICAgICAgICAgICgodHlwZW9mIGNvbnNvbGUgIT09IFwidW5kZWZpbmVkXCIpICYmIGNvbnNvbGUuZXJyb3IgP1xuICAgICAgICAgICBmdW5jdGlvbiAoKSB7IGNvbnNvbGUuZXJyb3IuYXBwbHkoY29uc29sZSwgYXJndW1lbnRzKTsgfSA6XG4gICAgICAgICAgIGZ1bmN0aW9uICgpIHt9KSk7XG59XG5cbmZ1bmN0aW9uIF9tYXliZVN1cHByZXNzTW9yZUxvZ3MobWVzc2FnZXNMZW5ndGgpIHtcbiAgLy8gU29tZXRpbWVzIHdoZW4gcnVubmluZyB0ZXN0cywgd2UgaW50ZW50aW9uYWxseSBzdXBwcmVzcyBsb2dzIG9uIGV4cGVjdGVkXG4gIC8vIHByaW50ZWQgZXJyb3JzLiBTaW5jZSB0aGUgY3VycmVudCBpbXBsZW1lbnRhdGlvbiBvZiBfdGhyb3dPckxvZyBjYW4gbG9nXG4gIC8vIG11bHRpcGxlIHNlcGFyYXRlIGxvZyBtZXNzYWdlcywgc3VwcHJlc3MgYWxsIG9mIHRoZW0gaWYgYXQgbGVhc3Qgb25lIHN1cHByZXNzXG4gIC8vIGlzIGV4cGVjdGVkIGFzIHdlIHN0aWxsIHdhbnQgdGhlbSB0byBjb3VudCBhcyBvbmUuXG4gIGlmICh0eXBlb2YgTWV0ZW9yICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgaWYgKE1ldGVvci5fc3VwcHJlc3NlZF9sb2dfZXhwZWN0ZWQoKSkge1xuICAgICAgTWV0ZW9yLl9zdXBwcmVzc19sb2cobWVzc2FnZXNMZW5ndGggLSAxKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gX3Rocm93T3JMb2coZnJvbSwgZSkge1xuICBpZiAodGhyb3dGaXJzdEVycm9yKSB7XG4gICAgdGhyb3cgZTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgcHJpbnRBcmdzID0gW1wiRXhjZXB0aW9uIGZyb20gVHJhY2tlciBcIiArIGZyb20gKyBcIiBmdW5jdGlvbjpcIl07XG4gICAgaWYgKGUuc3RhY2sgJiYgZS5tZXNzYWdlICYmIGUubmFtZSkge1xuICAgICAgdmFyIGlkeCA9IGUuc3RhY2suaW5kZXhPZihlLm1lc3NhZ2UpO1xuICAgICAgaWYgKGlkeCA8IDAgfHwgaWR4ID4gZS5uYW1lLmxlbmd0aCArIDIpIHsgLy8gY2hlY2sgZm9yIFwiRXJyb3I6IFwiXG4gICAgICAgIC8vIG1lc3NhZ2UgaXMgbm90IHBhcnQgb2YgdGhlIHN0YWNrXG4gICAgICAgIHZhciBtZXNzYWdlID0gZS5uYW1lICsgXCI6IFwiICsgZS5tZXNzYWdlO1xuICAgICAgICBwcmludEFyZ3MucHVzaChtZXNzYWdlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcHJpbnRBcmdzLnB1c2goZS5zdGFjayk7XG4gICAgX21heWJlU3VwcHJlc3NNb3JlTG9ncyhwcmludEFyZ3MubGVuZ3RoKTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcHJpbnRBcmdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBfZGVidWdGdW5jKCkocHJpbnRBcmdzW2ldKTtcbiAgICB9XG4gIH1cbn1cblxuLy8gVGFrZXMgYSBmdW5jdGlvbiBgZmAsIGFuZCB3cmFwcyBpdCBpbiBhIGBNZXRlb3IuX25vWWllbGRzQWxsb3dlZGBcbi8vIGJsb2NrIGlmIHdlIGFyZSBydW5uaW5nIG9uIHRoZSBzZXJ2ZXIuIE9uIHRoZSBjbGllbnQsIHJldHVybnMgdGhlXG4vLyBvcmlnaW5hbCBmdW5jdGlvbiAoc2luY2UgYE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkYCBpcyBhXG4vLyBuby1vcCkuIFRoaXMgaGFzIHRoZSBiZW5lZml0IG9mIG5vdCBhZGRpbmcgYW4gdW5uZWNlc3Nhcnkgc3RhY2tcbi8vIGZyYW1lIG9uIHRoZSBjbGllbnQuXG5mdW5jdGlvbiB3aXRoTm9ZaWVsZHNBbGxvd2VkKGYpIHtcbiAgaWYgKCh0eXBlb2YgTWV0ZW9yID09PSAndW5kZWZpbmVkJykgfHwgTWV0ZW9yLmlzQ2xpZW50KSB7XG4gICAgcmV0dXJuIGY7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgICBmLmFwcGx5KG51bGwsIGFyZ3MpO1xuICAgICAgfSk7XG4gICAgfTtcbiAgfVxufVxuXG52YXIgbmV4dElkID0gMTtcbi8vIGNvbXB1dGF0aW9ucyB3aG9zZSBjYWxsYmFja3Mgd2Ugc2hvdWxkIGNhbGwgYXQgZmx1c2ggdGltZVxudmFyIHBlbmRpbmdDb21wdXRhdGlvbnMgPSBbXTtcbi8vIGB0cnVlYCBpZiBhIFRyYWNrZXIuZmx1c2ggaXMgc2NoZWR1bGVkLCBvciBpZiB3ZSBhcmUgaW4gVHJhY2tlci5mbHVzaCBub3dcbnZhciB3aWxsRmx1c2ggPSBmYWxzZTtcbi8vIGB0cnVlYCBpZiB3ZSBhcmUgaW4gVHJhY2tlci5mbHVzaCBub3dcbnZhciBpbkZsdXNoID0gZmFsc2U7XG4vLyBgdHJ1ZWAgaWYgd2UgYXJlIGNvbXB1dGluZyBhIGNvbXB1dGF0aW9uIG5vdywgZWl0aGVyIGZpcnN0IHRpbWVcbi8vIG9yIHJlY29tcHV0ZS4gIFRoaXMgbWF0Y2hlcyBUcmFja2VyLmFjdGl2ZSB1bmxlc3Mgd2UgYXJlIGluc2lkZVxuLy8gVHJhY2tlci5ub25yZWFjdGl2ZSwgd2hpY2ggbnVsbGZpZXMgY3VycmVudENvbXB1dGF0aW9uIGV2ZW4gdGhvdWdoXG4vLyBhbiBlbmNsb3NpbmcgY29tcHV0YXRpb24gbWF5IHN0aWxsIGJlIHJ1bm5pbmcuXG52YXIgaW5Db21wdXRlID0gZmFsc2U7XG4vLyBgdHJ1ZWAgaWYgdGhlIGBfdGhyb3dGaXJzdEVycm9yYCBvcHRpb24gd2FzIHBhc3NlZCBpbiB0byB0aGUgY2FsbFxuLy8gdG8gVHJhY2tlci5mbHVzaCB0aGF0IHdlIGFyZSBpbi4gV2hlbiBzZXQsIHRocm93IHJhdGhlciB0aGFuIGxvZyB0aGVcbi8vIGZpcnN0IGVycm9yIGVuY291bnRlcmVkIHdoaWxlIGZsdXNoaW5nLiBCZWZvcmUgdGhyb3dpbmcgdGhlIGVycm9yLFxuLy8gZmluaXNoIGZsdXNoaW5nIChmcm9tIGEgZmluYWxseSBibG9jayksIGxvZ2dpbmcgYW55IHN1YnNlcXVlbnRcbi8vIGVycm9ycy5cbnZhciB0aHJvd0ZpcnN0RXJyb3IgPSBmYWxzZTtcblxudmFyIGFmdGVyRmx1c2hDYWxsYmFja3MgPSBbXTtcblxuZnVuY3Rpb24gcmVxdWlyZUZsdXNoKCkge1xuICBpZiAoISB3aWxsRmx1c2gpIHtcbiAgICAvLyBXZSB3YW50IHRoaXMgY29kZSB0byB3b3JrIHdpdGhvdXQgTWV0ZW9yLCBzZWUgZGVidWdGdW5jIGFib3ZlXG4gICAgaWYgKHR5cGVvZiBNZXRlb3IgIT09IFwidW5kZWZpbmVkXCIpXG4gICAgICBNZXRlb3IuX3NldEltbWVkaWF0ZShUcmFja2VyLl9ydW5GbHVzaCk7XG4gICAgZWxzZVxuICAgICAgc2V0VGltZW91dChUcmFja2VyLl9ydW5GbHVzaCwgMCk7XG4gICAgd2lsbEZsdXNoID0gdHJ1ZTtcbiAgfVxufVxuXG4vLyBUcmFja2VyLkNvbXB1dGF0aW9uIGNvbnN0cnVjdG9yIGlzIHZpc2libGUgYnV0IHByaXZhdGVcbi8vICh0aHJvd3MgYW4gZXJyb3IgaWYgeW91IHRyeSB0byBjYWxsIGl0KVxudmFyIGNvbnN0cnVjdGluZ0NvbXB1dGF0aW9uID0gZmFsc2U7XG5cbi8vXG4vLyBodHRwOi8vZG9jcy5tZXRlb3IuY29tLyN0cmFja2VyX2NvbXB1dGF0aW9uXG5cbi8qKlxuICogQHN1bW1hcnkgQSBDb21wdXRhdGlvbiBvYmplY3QgcmVwcmVzZW50cyBjb2RlIHRoYXQgaXMgcmVwZWF0ZWRseSByZXJ1blxuICogaW4gcmVzcG9uc2UgdG9cbiAqIHJlYWN0aXZlIGRhdGEgY2hhbmdlcy4gQ29tcHV0YXRpb25zIGRvbid0IGhhdmUgcmV0dXJuIHZhbHVlczsgdGhleSBqdXN0XG4gKiBwZXJmb3JtIGFjdGlvbnMsIHN1Y2ggYXMgcmVyZW5kZXJpbmcgYSB0ZW1wbGF0ZSBvbiB0aGUgc2NyZWVuLiBDb21wdXRhdGlvbnNcbiAqIGFyZSBjcmVhdGVkIHVzaW5nIFRyYWNrZXIuYXV0b3J1bi4gVXNlIHN0b3AgdG8gcHJldmVudCBmdXJ0aGVyIHJlcnVubmluZyBvZiBhXG4gKiBjb21wdXRhdGlvbi5cbiAqIEBpbnN0YW5jZW5hbWUgY29tcHV0YXRpb25cbiAqL1xuVHJhY2tlci5Db21wdXRhdGlvbiA9IGNsYXNzIENvbXB1dGF0aW9uIHtcbiAgY29uc3RydWN0b3IoZiwgcGFyZW50LCBvbkVycm9yKSB7XG4gICAgaWYgKCEgY29uc3RydWN0aW5nQ29tcHV0YXRpb24pXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIFwiVHJhY2tlci5Db21wdXRhdGlvbiBjb25zdHJ1Y3RvciBpcyBwcml2YXRlOyB1c2UgVHJhY2tlci5hdXRvcnVuXCIpO1xuICAgIGNvbnN0cnVjdGluZ0NvbXB1dGF0aW9uID0gZmFsc2U7XG5cbiAgICAvLyBodHRwOi8vZG9jcy5tZXRlb3IuY29tLyNjb21wdXRhdGlvbl9zdG9wcGVkXG5cbiAgICAvKipcbiAgICAgKiBAc3VtbWFyeSBUcnVlIGlmIHRoaXMgY29tcHV0YXRpb24gaGFzIGJlZW4gc3RvcHBlZC5cbiAgICAgKiBAbG9jdXMgQ2xpZW50XG4gICAgICogQG1lbWJlck9mIFRyYWNrZXIuQ29tcHV0YXRpb25cbiAgICAgKiBAaW5zdGFuY2VcbiAgICAgKiBAbmFtZSAgc3RvcHBlZFxuICAgICAqL1xuICAgIHRoaXMuc3RvcHBlZCA9IGZhbHNlO1xuXG4gICAgLy8gaHR0cDovL2RvY3MubWV0ZW9yLmNvbS8jY29tcHV0YXRpb25faW52YWxpZGF0ZWRcblxuICAgIC8qKlxuICAgICAqIEBzdW1tYXJ5IFRydWUgaWYgdGhpcyBjb21wdXRhdGlvbiBoYXMgYmVlbiBpbnZhbGlkYXRlZCAoYW5kIG5vdCB5ZXQgcmVydW4pLCBvciBpZiBpdCBoYXMgYmVlbiBzdG9wcGVkLlxuICAgICAqIEBsb2N1cyBDbGllbnRcbiAgICAgKiBAbWVtYmVyT2YgVHJhY2tlci5Db21wdXRhdGlvblxuICAgICAqIEBpbnN0YW5jZVxuICAgICAqIEBuYW1lICBpbnZhbGlkYXRlZFxuICAgICAqIEB0eXBlIHtCb29sZWFufVxuICAgICAqL1xuICAgIHRoaXMuaW52YWxpZGF0ZWQgPSBmYWxzZTtcblxuICAgIC8vIGh0dHA6Ly9kb2NzLm1ldGVvci5jb20vI2NvbXB1dGF0aW9uX2ZpcnN0cnVuXG5cbiAgICAvKipcbiAgICAgKiBAc3VtbWFyeSBUcnVlIGR1cmluZyB0aGUgaW5pdGlhbCBydW4gb2YgdGhlIGNvbXB1dGF0aW9uIGF0IHRoZSB0aW1lIGBUcmFja2VyLmF1dG9ydW5gIGlzIGNhbGxlZCwgYW5kIGZhbHNlIG9uIHN1YnNlcXVlbnQgcmVydW5zIGFuZCBhdCBvdGhlciB0aW1lcy5cbiAgICAgKiBAbG9jdXMgQ2xpZW50XG4gICAgICogQG1lbWJlck9mIFRyYWNrZXIuQ29tcHV0YXRpb25cbiAgICAgKiBAaW5zdGFuY2VcbiAgICAgKiBAbmFtZSAgZmlyc3RSdW5cbiAgICAgKiBAdHlwZSB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICB0aGlzLmZpcnN0UnVuID0gdHJ1ZTtcblxuICAgIHRoaXMuX2lkID0gbmV4dElkKys7XG4gICAgdGhpcy5fb25JbnZhbGlkYXRlQ2FsbGJhY2tzID0gW107XG4gICAgdGhpcy5fb25TdG9wQ2FsbGJhY2tzID0gW107XG4gICAgLy8gdGhlIHBsYW4gaXMgYXQgc29tZSBwb2ludCB0byB1c2UgdGhlIHBhcmVudCByZWxhdGlvblxuICAgIC8vIHRvIGNvbnN0cmFpbiB0aGUgb3JkZXIgdGhhdCBjb21wdXRhdGlvbnMgYXJlIHByb2Nlc3NlZFxuICAgIHRoaXMuX3BhcmVudCA9IHBhcmVudDtcbiAgICB0aGlzLl9mdW5jID0gZjtcbiAgICB0aGlzLl9vbkVycm9yID0gb25FcnJvcjtcbiAgICB0aGlzLl9yZWNvbXB1dGluZyA9IGZhbHNlO1xuXG4gICAgLyoqXG4gICAgICogQHN1bW1hcnkgRm9yY2VzIGF1dG9ydW4gYmxvY2tzIHRvIGJlIGV4ZWN1dGVkIGluIHN5bmNocm9ub3VzLWxvb2tpbmcgb3JkZXIgYnkgc3RvcmluZyB0aGUgdmFsdWUgYXV0b3J1biBwcm9taXNlIHRodXMgbWFraW5nIGl0IGF3YWl0YWJsZS5cbiAgICAgKiBAbG9jdXMgQ2xpZW50XG4gICAgICogQG1lbWJlck9mIFRyYWNrZXIuQ29tcHV0YXRpb25cbiAgICAgKiBAaW5zdGFuY2VcbiAgICAgKiBAbmFtZSAgZmlyc3RSdW5Qcm9taXNlXG4gICAgICogQHJldHVybnMge1Byb21pc2U8dW5rbm93bj59XG4gICAgICovXG4gICAgdGhpcy5maXJzdFJ1blByb21pc2UgPSB1bmRlZmluZWQ7XG5cbiAgICB2YXIgZXJyb3JlZCA9IHRydWU7XG4gICAgdHJ5IHtcbiAgICAgIHRoaXMuX2NvbXB1dGUoKTtcbiAgICAgIGVycm9yZWQgPSBmYWxzZTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgdGhpcy5maXJzdFJ1biA9IGZhbHNlO1xuICAgICAgaWYgKGVycm9yZWQpXG4gICAgICAgIHRoaXMuc3RvcCgpO1xuICAgIH1cbiAgfVxuXG5cbiAgICAvKipcbiAgICogUmVzb2x2ZXMgdGhlIGZpcnN0UnVuUHJvbWlzZSB3aXRoIHRoZSByZXN1bHQgb2YgdGhlIGF1dG9ydW4gZnVuY3Rpb24uXG4gICAqIEBwYXJhbSB7Kn0gb25SZXNvbHZlZFxuICAgKiBAcGFyYW0geyp9IG9uUmVqZWN0ZWRcbiAgICogQHJldHVybnN7UHJvbWlzZTx1bmtub3dufVxuICAgKi9cbiAgICB0aGVuKG9uUmVzb2x2ZWQsIG9uUmVqZWN0ZWQpIHtcbiAgICAgIHJldHVybiB0aGlzLmZpcnN0UnVuUHJvbWlzZS50aGVuKG9uUmVzb2x2ZWQsIG9uUmVqZWN0ZWQpO1xuICAgIH07XG5cblxuICAgIGNhdGNoKG9uUmVqZWN0ZWQpIHtcbiAgICAgIHJldHVybiB0aGlzLmZpcnN0UnVuUHJvbWlzZS5jYXRjaChvblJlamVjdGVkKVxuICAgIH07XG5cbiAgLy8gaHR0cDovL2RvY3MubWV0ZW9yLmNvbS8jY29tcHV0YXRpb25fb25pbnZhbGlkYXRlXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IFJlZ2lzdGVycyBgY2FsbGJhY2tgIHRvIHJ1biB3aGVuIHRoaXMgY29tcHV0YXRpb24gaXMgbmV4dCBpbnZhbGlkYXRlZCwgb3IgcnVucyBpdCBpbW1lZGlhdGVseSBpZiB0aGUgY29tcHV0YXRpb24gaXMgYWxyZWFkeSBpbnZhbGlkYXRlZC4gIFRoZSBjYWxsYmFjayBpcyBydW4gZXhhY3RseSBvbmNlIGFuZCBub3QgdXBvbiBmdXR1cmUgaW52YWxpZGF0aW9ucyB1bmxlc3MgYG9uSW52YWxpZGF0ZWAgaXMgY2FsbGVkIGFnYWluIGFmdGVyIHRoZSBjb21wdXRhdGlvbiBiZWNvbWVzIHZhbGlkIGFnYWluLlxuICAgKiBAbG9jdXMgQ2xpZW50XG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIEZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBvbiBpbnZhbGlkYXRpb24uIFJlY2VpdmVzIG9uZSBhcmd1bWVudCwgdGhlIGNvbXB1dGF0aW9uIHRoYXQgd2FzIGludmFsaWRhdGVkLlxuICAgKi9cbiAgb25JbnZhbGlkYXRlKGYpIHtcbiAgICBpZiAodHlwZW9mIGYgIT09ICdmdW5jdGlvbicpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJvbkludmFsaWRhdGUgcmVxdWlyZXMgYSBmdW5jdGlvblwiKTtcblxuICAgIGlmICh0aGlzLmludmFsaWRhdGVkKSB7XG4gICAgICBUcmFja2VyLm5vbnJlYWN0aXZlKCgpID0+IHtcbiAgICAgICAgd2l0aE5vWWllbGRzQWxsb3dlZChmKSh0aGlzKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9vbkludmFsaWRhdGVDYWxsYmFja3MucHVzaChmKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQHN1bW1hcnkgUmVnaXN0ZXJzIGBjYWxsYmFja2AgdG8gcnVuIHdoZW4gdGhpcyBjb21wdXRhdGlvbiBpcyBzdG9wcGVkLCBvciBydW5zIGl0IGltbWVkaWF0ZWx5IGlmIHRoZSBjb21wdXRhdGlvbiBpcyBhbHJlYWR5IHN0b3BwZWQuICBUaGUgY2FsbGJhY2sgaXMgcnVuIGFmdGVyIGFueSBgb25JbnZhbGlkYXRlYCBjYWxsYmFja3MuXG4gICAqIEBsb2N1cyBDbGllbnRcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgRnVuY3Rpb24gdG8gYmUgY2FsbGVkIG9uIHN0b3AuIFJlY2VpdmVzIG9uZSBhcmd1bWVudCwgdGhlIGNvbXB1dGF0aW9uIHRoYXQgd2FzIHN0b3BwZWQuXG4gICAqL1xuICBvblN0b3AoZikge1xuICAgIGlmICh0eXBlb2YgZiAhPT0gJ2Z1bmN0aW9uJylcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIm9uU3RvcCByZXF1aXJlcyBhIGZ1bmN0aW9uXCIpO1xuXG4gICAgaWYgKHRoaXMuc3RvcHBlZCkge1xuICAgICAgVHJhY2tlci5ub25yZWFjdGl2ZSgoKSA9PiB7XG4gICAgICAgIHdpdGhOb1lpZWxkc0FsbG93ZWQoZikodGhpcyk7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fb25TdG9wQ2FsbGJhY2tzLnB1c2goZik7XG4gICAgfVxuICB9XG5cbiAgLy8gaHR0cDovL2RvY3MubWV0ZW9yLmNvbS8jY29tcHV0YXRpb25faW52YWxpZGF0ZVxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBJbnZhbGlkYXRlcyB0aGlzIGNvbXB1dGF0aW9uIHNvIHRoYXQgaXQgd2lsbCBiZSByZXJ1bi5cbiAgICogQGxvY3VzIENsaWVudFxuICAgKi9cbiAgaW52YWxpZGF0ZSgpIHtcbiAgICBpZiAoISB0aGlzLmludmFsaWRhdGVkKSB7XG4gICAgICAvLyBpZiB3ZSdyZSBjdXJyZW50bHkgaW4gX3JlY29tcHV0ZSgpLCBkb24ndCBlbnF1ZXVlXG4gICAgICAvLyBvdXJzZWx2ZXMsIHNpbmNlIHdlJ2xsIHJlcnVuIGltbWVkaWF0ZWx5IGFueXdheS5cbiAgICAgIGlmICghIHRoaXMuX3JlY29tcHV0aW5nICYmICEgdGhpcy5zdG9wcGVkKSB7XG4gICAgICAgIHJlcXVpcmVGbHVzaCgpO1xuICAgICAgICBwZW5kaW5nQ29tcHV0YXRpb25zLnB1c2godGhpcyk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuaW52YWxpZGF0ZWQgPSB0cnVlO1xuXG4gICAgICAvLyBjYWxsYmFja3MgY2FuJ3QgYWRkIGNhbGxiYWNrcywgYmVjYXVzZVxuICAgICAgLy8gdGhpcy5pbnZhbGlkYXRlZCA9PT0gdHJ1ZS5cbiAgICAgIGZvcih2YXIgaSA9IDAsIGY7IGYgPSB0aGlzLl9vbkludmFsaWRhdGVDYWxsYmFja3NbaV07IGkrKykge1xuICAgICAgICBUcmFja2VyLm5vbnJlYWN0aXZlKCgpID0+IHtcbiAgICAgICAgICB3aXRoTm9ZaWVsZHNBbGxvd2VkKGYpKHRoaXMpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHRoaXMuX29uSW52YWxpZGF0ZUNhbGxiYWNrcyA9IFtdO1xuICAgIH1cbiAgfVxuXG4gIC8vIGh0dHA6Ly9kb2NzLm1ldGVvci5jb20vI2NvbXB1dGF0aW9uX3N0b3BcblxuICAvKipcbiAgICogQHN1bW1hcnkgUHJldmVudHMgdGhpcyBjb21wdXRhdGlvbiBmcm9tIHJlcnVubmluZy5cbiAgICogQGxvY3VzIENsaWVudFxuICAgKi9cbiAgc3RvcCgpIHtcbiAgICBpZiAoISB0aGlzLnN0b3BwZWQpIHtcbiAgICAgIHRoaXMuc3RvcHBlZCA9IHRydWU7XG4gICAgICB0aGlzLmludmFsaWRhdGUoKTtcbiAgICAgIGZvcih2YXIgaSA9IDAsIGY7IGYgPSB0aGlzLl9vblN0b3BDYWxsYmFja3NbaV07IGkrKykge1xuICAgICAgICBUcmFja2VyLm5vbnJlYWN0aXZlKCgpID0+IHtcbiAgICAgICAgICB3aXRoTm9ZaWVsZHNBbGxvd2VkKGYpKHRoaXMpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHRoaXMuX29uU3RvcENhbGxiYWNrcyA9IFtdO1xuICAgIH1cbiAgfVxuXG4gIF9jb21wdXRlKCkge1xuICAgIHRoaXMuaW52YWxpZGF0ZWQgPSBmYWxzZTtcblxuICAgIHZhciBwcmV2aW91c0luQ29tcHV0ZSA9IGluQ29tcHV0ZTtcbiAgICBpbkNvbXB1dGUgPSB0cnVlO1xuXG4gICAgdHJ5IHtcbiAgICAgIC8vIEluIGNhc2Ugb2YgYXN5bmMgZnVuY3Rpb25zLCB0aGUgcmVzdWx0IG9mIHRoaXMgZnVuY3Rpb24gd2lsbCBjb250YWluIHRoZSBwcm9taXNlIG9mIHRoZSBhdXRvcnVuIGZ1bmN0aW9uXG4gICAgICAvLyAmIG1ha2UgYXV0b3J1bnMgYXdhaXQtYWJsZS5cbiAgICAgIGNvbnN0IGZpcnN0UnVuUHJvbWlzZSA9IFRyYWNrZXIud2l0aENvbXB1dGF0aW9uKHRoaXMsICgpID0+IHtcbiAgICAgICAgcmV0dXJuIHdpdGhOb1lpZWxkc0FsbG93ZWQodGhpcy5fZnVuYykodGhpcyk7XG4gICAgICB9KTtcbiAgICAgIC8vIFdlJ2xsIHN0b3JlIHRoZSBmaXJzdFJ1blByb21pc2Ugb24gdGhlIGNvbXB1dGF0aW9uIHNvIGl0IGNhbiBiZSBhd2FpdGVkIGJ5IHRoZSBjYWxsZXJzLCBidXQgb25seVxuICAgICAgLy8gZHVyaW5nIHRoZSBmaXJzdCBydW4uIFdlIGRvbid0IHdhbnQgdGhpbmdzIHRvIGdldCBtaXhlZCB1cC5cbiAgICAgIGlmICh0aGlzLmZpcnN0UnVuKSB7XG4gICAgICAgIHRoaXMuZmlyc3RSdW5Qcm9taXNlID0gUHJvbWlzZS5yZXNvbHZlKGZpcnN0UnVuUHJvbWlzZSk7XG4gICAgICB9XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIGluQ29tcHV0ZSA9IHByZXZpb3VzSW5Db21wdXRlO1xuICAgIH1cbiAgfVxuXG4gIF9uZWVkc1JlY29tcHV0ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5pbnZhbGlkYXRlZCAmJiAhIHRoaXMuc3RvcHBlZDtcbiAgfVxuXG4gIF9yZWNvbXB1dGUoKSB7XG4gICAgdGhpcy5fcmVjb21wdXRpbmcgPSB0cnVlO1xuICAgIHRyeSB7XG4gICAgICBpZiAodGhpcy5fbmVlZHNSZWNvbXB1dGUoKSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHRoaXMuX2NvbXB1dGUoKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGlmICh0aGlzLl9vbkVycm9yKSB7XG4gICAgICAgICAgICB0aGlzLl9vbkVycm9yKGUpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBfdGhyb3dPckxvZyhcInJlY29tcHV0ZVwiLCBlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGZpbmFsbHkge1xuICAgICAgdGhpcy5fcmVjb21wdXRpbmcgPSBmYWxzZTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQHN1bW1hcnkgUHJvY2VzcyB0aGUgcmVhY3RpdmUgdXBkYXRlcyBmb3IgdGhpcyBjb21wdXRhdGlvbiBpbW1lZGlhdGVseVxuICAgKiBhbmQgZW5zdXJlIHRoYXQgdGhlIGNvbXB1dGF0aW9uIGlzIHJlcnVuLiBUaGUgY29tcHV0YXRpb24gaXMgcmVydW4gb25seVxuICAgKiBpZiBpdCBpcyBpbnZhbGlkYXRlZC5cbiAgICogQGxvY3VzIENsaWVudFxuICAgKi9cbiAgZmx1c2goKSB7XG4gICAgaWYgKHRoaXMuX3JlY29tcHV0aW5nKVxuICAgICAgcmV0dXJuO1xuXG4gICAgdGhpcy5fcmVjb21wdXRlKCk7XG4gIH1cblxuICAvKipcbiAgICogQHN1bW1hcnkgQ2F1c2VzIHRoZSBmdW5jdGlvbiBpbnNpZGUgdGhpcyBjb21wdXRhdGlvbiB0byBydW4gYW5kXG4gICAqIHN5bmNocm9ub3VzbHkgcHJvY2VzcyBhbGwgcmVhY3RpdmUgdXBkdGVzLlxuICAgKiBAbG9jdXMgQ2xpZW50XG4gICAqL1xuICBydW4oKSB7XG4gICAgdGhpcy5pbnZhbGlkYXRlKCk7XG4gICAgdGhpcy5mbHVzaCgpO1xuICB9XG59O1xuXG4vL1xuLy8gaHR0cDovL2RvY3MubWV0ZW9yLmNvbS8jdHJhY2tlcl9kZXBlbmRlbmN5XG5cbi8qKlxuICogQHN1bW1hcnkgQSBEZXBlbmRlbmN5IHJlcHJlc2VudHMgYW4gYXRvbWljIHVuaXQgb2YgcmVhY3RpdmUgZGF0YSB0aGF0IGFcbiAqIGNvbXB1dGF0aW9uIG1pZ2h0IGRlcGVuZCBvbi4gUmVhY3RpdmUgZGF0YSBzb3VyY2VzIHN1Y2ggYXMgU2Vzc2lvbiBvclxuICogTWluaW1vbmdvIGludGVybmFsbHkgY3JlYXRlIGRpZmZlcmVudCBEZXBlbmRlbmN5IG9iamVjdHMgZm9yIGRpZmZlcmVudFxuICogcGllY2VzIG9mIGRhdGEsIGVhY2ggb2Ygd2hpY2ggbWF5IGJlIGRlcGVuZGVkIG9uIGJ5IG11bHRpcGxlIGNvbXB1dGF0aW9ucy5cbiAqIFdoZW4gdGhlIGRhdGEgY2hhbmdlcywgdGhlIGNvbXB1dGF0aW9ucyBhcmUgaW52YWxpZGF0ZWQuXG4gKiBAY2xhc3NcbiAqIEBpbnN0YW5jZU5hbWUgZGVwZW5kZW5jeVxuICovXG5UcmFja2VyLkRlcGVuZGVuY3kgPSBjbGFzcyBEZXBlbmRlbmN5IHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5fZGVwZW5kZW50c0J5SWQgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICB9XG5cbiAgLy8gaHR0cDovL2RvY3MubWV0ZW9yLmNvbS8jZGVwZW5kZW5jeV9kZXBlbmRcbiAgLy9cbiAgLy8gQWRkcyBgY29tcHV0YXRpb25gIHRvIHRoaXMgc2V0IGlmIGl0IGlzIG5vdCBhbHJlYWR5XG4gIC8vIHByZXNlbnQuICBSZXR1cm5zIHRydWUgaWYgYGNvbXB1dGF0aW9uYCBpcyBhIG5ldyBtZW1iZXIgb2YgdGhlIHNldC5cbiAgLy8gSWYgbm8gYXJndW1lbnQsIGRlZmF1bHRzIHRvIGN1cnJlbnRDb21wdXRhdGlvbiwgb3IgZG9lcyBub3RoaW5nXG4gIC8vIGlmIHRoZXJlIGlzIG5vIGN1cnJlbnRDb21wdXRhdGlvbi5cblxuICAvKipcbiAgICogQHN1bW1hcnkgRGVjbGFyZXMgdGhhdCB0aGUgY3VycmVudCBjb21wdXRhdGlvbiAob3IgYGZyb21Db21wdXRhdGlvbmAgaWYgZ2l2ZW4pIGRlcGVuZHMgb24gYGRlcGVuZGVuY3lgLiAgVGhlIGNvbXB1dGF0aW9uIHdpbGwgYmUgaW52YWxpZGF0ZWQgdGhlIG5leHQgdGltZSBgZGVwZW5kZW5jeWAgY2hhbmdlcy5cblxuICAgSWYgdGhlcmUgaXMgbm8gY3VycmVudCBjb21wdXRhdGlvbiBhbmQgYGRlcGVuZCgpYCBpcyBjYWxsZWQgd2l0aCBubyBhcmd1bWVudHMsIGl0IGRvZXMgbm90aGluZyBhbmQgcmV0dXJucyBmYWxzZS5cblxuICAgUmV0dXJucyB0cnVlIGlmIHRoZSBjb21wdXRhdGlvbiBpcyBhIG5ldyBkZXBlbmRlbnQgb2YgYGRlcGVuZGVuY3lgIHJhdGhlciB0aGFuIGFuIGV4aXN0aW5nIG9uZS5cbiAgICogQGxvY3VzIENsaWVudFxuICAgKiBAcGFyYW0ge1RyYWNrZXIuQ29tcHV0YXRpb259IFtmcm9tQ29tcHV0YXRpb25dIEFuIG9wdGlvbmFsIGNvbXB1dGF0aW9uIGRlY2xhcmVkIHRvIGRlcGVuZCBvbiBgZGVwZW5kZW5jeWAgaW5zdGVhZCBvZiB0aGUgY3VycmVudCBjb21wdXRhdGlvbi5cbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBkZXBlbmQoY29tcHV0YXRpb24pIHtcbiAgICBpZiAoISBjb21wdXRhdGlvbikge1xuICAgICAgaWYgKCEgVHJhY2tlci5hY3RpdmUpXG4gICAgICAgIHJldHVybiBmYWxzZTtcblxuICAgICAgY29tcHV0YXRpb24gPSBUcmFja2VyLmN1cnJlbnRDb21wdXRhdGlvbjtcbiAgICB9XG4gICAgdmFyIGlkID0gY29tcHV0YXRpb24uX2lkO1xuICAgIGlmICghIChpZCBpbiB0aGlzLl9kZXBlbmRlbnRzQnlJZCkpIHtcbiAgICAgIHRoaXMuX2RlcGVuZGVudHNCeUlkW2lkXSA9IGNvbXB1dGF0aW9uO1xuICAgICAgY29tcHV0YXRpb24ub25JbnZhbGlkYXRlKCgpID0+IHtcbiAgICAgICAgZGVsZXRlIHRoaXMuX2RlcGVuZGVudHNCeUlkW2lkXTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIGh0dHA6Ly9kb2NzLm1ldGVvci5jb20vI2RlcGVuZGVuY3lfY2hhbmdlZFxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBJbnZhbGlkYXRlIGFsbCBkZXBlbmRlbnQgY29tcHV0YXRpb25zIGltbWVkaWF0ZWx5IGFuZCByZW1vdmUgdGhlbSBhcyBkZXBlbmRlbnRzLlxuICAgKiBAbG9jdXMgQ2xpZW50XG4gICAqL1xuICBjaGFuZ2VkKCkge1xuICAgIGZvciAodmFyIGlkIGluIHRoaXMuX2RlcGVuZGVudHNCeUlkKVxuICAgICAgdGhpcy5fZGVwZW5kZW50c0J5SWRbaWRdLmludmFsaWRhdGUoKTtcbiAgfVxuXG4gIC8vIGh0dHA6Ly9kb2NzLm1ldGVvci5jb20vI2RlcGVuZGVuY3lfaGFzZGVwZW5kZW50c1xuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBUcnVlIGlmIHRoaXMgRGVwZW5kZW5jeSBoYXMgb25lIG9yIG1vcmUgZGVwZW5kZW50IENvbXB1dGF0aW9ucywgd2hpY2ggd291bGQgYmUgaW52YWxpZGF0ZWQgaWYgdGhpcyBEZXBlbmRlbmN5IHdlcmUgdG8gY2hhbmdlLlxuICAgKiBAbG9jdXMgQ2xpZW50XG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgaGFzRGVwZW5kZW50cygpIHtcbiAgICBmb3IgKHZhciBpZCBpbiB0aGlzLl9kZXBlbmRlbnRzQnlJZClcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufTtcblxuLy8gaHR0cDovL2RvY3MubWV0ZW9yLmNvbS8jdHJhY2tlcl9mbHVzaFxuXG4vKipcbiAqIEBzdW1tYXJ5IFByb2Nlc3MgYWxsIHJlYWN0aXZlIHVwZGF0ZXMgaW1tZWRpYXRlbHkgYW5kIGVuc3VyZSB0aGF0IGFsbCBpbnZhbGlkYXRlZCBjb21wdXRhdGlvbnMgYXJlIHJlcnVuLlxuICogQGxvY3VzIENsaWVudFxuICovXG5UcmFja2VyLmZsdXNoID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgVHJhY2tlci5fcnVuRmx1c2goeyBmaW5pc2hTeW5jaHJvbm91c2x5OiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgIHRocm93Rmlyc3RFcnJvcjogb3B0aW9ucyAmJiBvcHRpb25zLl90aHJvd0ZpcnN0RXJyb3IgfSk7XG59O1xuXG4vKipcbiAqIEBzdW1tYXJ5IFRydWUgaWYgd2UgYXJlIGNvbXB1dGluZyBhIGNvbXB1dGF0aW9uIG5vdywgZWl0aGVyIGZpcnN0IHRpbWUgb3IgcmVjb21wdXRlLiAgVGhpcyBtYXRjaGVzIFRyYWNrZXIuYWN0aXZlIHVubGVzcyB3ZSBhcmUgaW5zaWRlIFRyYWNrZXIubm9ucmVhY3RpdmUsIHdoaWNoIG51bGxmaWVzIGN1cnJlbnRDb21wdXRhdGlvbiBldmVuIHRob3VnaCBhbiBlbmNsb3NpbmcgY29tcHV0YXRpb24gbWF5IHN0aWxsIGJlIHJ1bm5pbmcuXG4gKiBAbG9jdXMgQ2xpZW50XG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuVHJhY2tlci5pbkZsdXNoID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gaW5GbHVzaDtcbn1cblxuLy8gUnVuIGFsbCBwZW5kaW5nIGNvbXB1dGF0aW9ucyBhbmQgYWZ0ZXJGbHVzaCBjYWxsYmFja3MuICBJZiB3ZSB3ZXJlIG5vdCBjYWxsZWRcbi8vIGRpcmVjdGx5IHZpYSBUcmFja2VyLmZsdXNoLCB0aGlzIG1heSByZXR1cm4gYmVmb3JlIHRoZXkncmUgYWxsIGRvbmUgdG8gYWxsb3dcbi8vIHRoZSBldmVudCBsb29wIHRvIHJ1biBhIGxpdHRsZSBiZWZvcmUgY29udGludWluZy5cblRyYWNrZXIuX3J1bkZsdXNoID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgLy8gWFhYIFdoYXQgcGFydCBvZiB0aGUgY29tbWVudCBiZWxvdyBpcyBzdGlsbCB0cnVlPyAoV2Ugbm8gbG9uZ2VyXG4gIC8vIGhhdmUgU3BhcmspXG4gIC8vXG4gIC8vIE5lc3RlZCBmbHVzaCBjb3VsZCBwbGF1c2libHkgaGFwcGVuIGlmLCBzYXksIGEgZmx1c2ggY2F1c2VzXG4gIC8vIERPTSBtdXRhdGlvbiwgd2hpY2ggY2F1c2VzIGEgXCJibHVyXCIgZXZlbnQsIHdoaWNoIHJ1bnMgYW5cbiAgLy8gYXBwIGV2ZW50IGhhbmRsZXIgdGhhdCBjYWxscyBUcmFja2VyLmZsdXNoLiAgQXQgdGhlIG1vbWVudFxuICAvLyBTcGFyayBibG9ja3MgZXZlbnQgaGFuZGxlcnMgZHVyaW5nIERPTSBtdXRhdGlvbiBhbnl3YXksXG4gIC8vIGJlY2F1c2UgdGhlIExpdmVSYW5nZSB0cmVlIGlzbid0IHZhbGlkLiAgQW5kIHdlIGRvbid0IGhhdmVcbiAgLy8gYW55IHVzZWZ1bCBub3Rpb24gb2YgYSBuZXN0ZWQgZmx1c2guXG4gIC8vXG4gIC8vIGh0dHBzOi8vYXBwLmFzYW5hLmNvbS8wLzE1OTkwODMzMDI0NC8zODUxMzgyMzM4NTZcbiAgaWYgKFRyYWNrZXIuaW5GbHVzaCgpKVxuICAgIHRocm93IG5ldyBFcnJvcihcIkNhbid0IGNhbGwgVHJhY2tlci5mbHVzaCB3aGlsZSBmbHVzaGluZ1wiKTtcblxuICBpZiAoaW5Db21wdXRlKVxuICAgIHRocm93IG5ldyBFcnJvcihcIkNhbid0IGZsdXNoIGluc2lkZSBUcmFja2VyLmF1dG9ydW5cIik7XG5cbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgaW5GbHVzaCA9IHRydWU7XG4gIHdpbGxGbHVzaCA9IHRydWU7XG4gIHRocm93Rmlyc3RFcnJvciA9ICEhIG9wdGlvbnMudGhyb3dGaXJzdEVycm9yO1xuXG4gIHZhciByZWNvbXB1dGVkQ291bnQgPSAwO1xuICB2YXIgZmluaXNoZWRUcnkgPSBmYWxzZTtcbiAgdHJ5IHtcbiAgICB3aGlsZSAocGVuZGluZ0NvbXB1dGF0aW9ucy5sZW5ndGggfHxcbiAgICAgICAgICAgYWZ0ZXJGbHVzaENhbGxiYWNrcy5sZW5ndGgpIHtcblxuICAgICAgLy8gcmVjb21wdXRlIGFsbCBwZW5kaW5nIGNvbXB1dGF0aW9uc1xuICAgICAgd2hpbGUgKHBlbmRpbmdDb21wdXRhdGlvbnMubGVuZ3RoKSB7XG4gICAgICAgIHZhciBjb21wID0gcGVuZGluZ0NvbXB1dGF0aW9ucy5zaGlmdCgpO1xuICAgICAgICBjb21wLl9yZWNvbXB1dGUoKTtcbiAgICAgICAgaWYgKGNvbXAuX25lZWRzUmVjb21wdXRlKCkpIHtcbiAgICAgICAgICBwZW5kaW5nQ29tcHV0YXRpb25zLnVuc2hpZnQoY29tcCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoISBvcHRpb25zLmZpbmlzaFN5bmNocm9ub3VzbHkgJiYgKytyZWNvbXB1dGVkQ291bnQgPiAxMDAwKSB7XG4gICAgICAgICAgZmluaXNoZWRUcnkgPSB0cnVlO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoYWZ0ZXJGbHVzaENhbGxiYWNrcy5sZW5ndGgpIHtcbiAgICAgICAgLy8gY2FsbCBvbmUgYWZ0ZXJGbHVzaCBjYWxsYmFjaywgd2hpY2ggbWF5XG4gICAgICAgIC8vIGludmFsaWRhdGUgbW9yZSBjb21wdXRhdGlvbnNcbiAgICAgICAgdmFyIGZ1bmMgPSBhZnRlckZsdXNoQ2FsbGJhY2tzLnNoaWZ0KCk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgZnVuYygpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgX3Rocm93T3JMb2coXCJhZnRlckZsdXNoXCIsIGUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGZpbmlzaGVkVHJ5ID0gdHJ1ZTtcbiAgfSBmaW5hbGx5IHtcbiAgICBpZiAoISBmaW5pc2hlZFRyeSkge1xuICAgICAgLy8gd2UncmUgZXJyb3JpbmcgZHVlIHRvIHRocm93Rmlyc3RFcnJvciBiZWluZyB0cnVlLlxuICAgICAgaW5GbHVzaCA9IGZhbHNlOyAvLyBuZWVkZWQgYmVmb3JlIGNhbGxpbmcgYFRyYWNrZXIuZmx1c2goKWAgYWdhaW5cbiAgICAgIC8vIGZpbmlzaCBmbHVzaGluZ1xuICAgICAgVHJhY2tlci5fcnVuRmx1c2goe1xuICAgICAgICBmaW5pc2hTeW5jaHJvbm91c2x5OiBvcHRpb25zLmZpbmlzaFN5bmNocm9ub3VzbHksXG4gICAgICAgIHRocm93Rmlyc3RFcnJvcjogZmFsc2VcbiAgICAgIH0pO1xuICAgIH1cbiAgICB3aWxsRmx1c2ggPSBmYWxzZTtcbiAgICBpbkZsdXNoID0gZmFsc2U7XG4gICAgaWYgKHBlbmRpbmdDb21wdXRhdGlvbnMubGVuZ3RoIHx8IGFmdGVyRmx1c2hDYWxsYmFja3MubGVuZ3RoKSB7XG4gICAgICAvLyBXZSdyZSB5aWVsZGluZyBiZWNhdXNlIHdlIHJhbiBhIGJ1bmNoIG9mIGNvbXB1dGF0aW9ucyBhbmQgd2UgYXJlbid0XG4gICAgICAvLyByZXF1aXJlZCB0byBmaW5pc2ggc3luY2hyb25vdXNseSwgc28gd2UnZCBsaWtlIHRvIGdpdmUgdGhlIGV2ZW50IGxvb3AgYVxuICAgICAgLy8gY2hhbmNlLiBXZSBzaG91bGQgZmx1c2ggYWdhaW4gc29vbi5cbiAgICAgIGlmIChvcHRpb25zLmZpbmlzaFN5bmNocm9ub3VzbHkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwic3RpbGwgaGF2ZSBtb3JlIHRvIGRvP1wiKTsgIC8vIHNob3VsZG4ndCBoYXBwZW5cbiAgICAgIH1cbiAgICAgIHNldFRpbWVvdXQocmVxdWlyZUZsdXNoLCAxMCk7XG4gICAgfVxuICB9XG59O1xuXG4vLyBodHRwOi8vZG9jcy5tZXRlb3IuY29tLyN0cmFja2VyX2F1dG9ydW5cbi8vXG4vLyBSdW4gZigpLiBSZWNvcmQgaXRzIGRlcGVuZGVuY2llcy4gUmVydW4gaXQgd2hlbmV2ZXIgdGhlXG4vLyBkZXBlbmRlbmNpZXMgY2hhbmdlLlxuLy9cbi8vIFJldHVybnMgYSBuZXcgQ29tcHV0YXRpb24sIHdoaWNoIGlzIGFsc28gcGFzc2VkIHRvIGYuXG4vL1xuLy8gTGlua3MgdGhlIGNvbXB1dGF0aW9uIHRvIHRoZSBjdXJyZW50IGNvbXB1dGF0aW9uXG4vLyBzbyB0aGF0IGl0IGlzIHN0b3BwZWQgaWYgdGhlIGN1cnJlbnQgY29tcHV0YXRpb24gaXMgaW52YWxpZGF0ZWQuXG5cbi8qKlxuICogQGNhbGxiYWNrIFRyYWNrZXIuQ29tcHV0YXRpb25GdW5jdGlvblxuICogQHBhcmFtIHtUcmFja2VyLkNvbXB1dGF0aW9ufVxuICovXG4vKipcbiAqIEBzdW1tYXJ5IFJ1biBhIGZ1bmN0aW9uIG5vdyBhbmQgcmVydW4gaXQgbGF0ZXIgd2hlbmV2ZXIgaXRzIGRlcGVuZGVuY2llc1xuICogY2hhbmdlLiBSZXR1cm5zIGEgQ29tcHV0YXRpb24gb2JqZWN0IHRoYXQgY2FuIGJlIHVzZWQgdG8gc3RvcCBvciBvYnNlcnZlIHRoZVxuICogcmVydW5uaW5nLlxuICogQGxvY3VzIENsaWVudFxuICogQHBhcmFtIHtUcmFja2VyLkNvbXB1dGF0aW9uRnVuY3Rpb259IHJ1bkZ1bmMgVGhlIGZ1bmN0aW9uIHRvIHJ1bi4gSXQgcmVjZWl2ZXNcbiAqIG9uZSBhcmd1bWVudDogdGhlIENvbXB1dGF0aW9uIG9iamVjdCB0aGF0IHdpbGwgYmUgcmV0dXJuZWQuXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBvcHRpb25zLm9uRXJyb3IgT3B0aW9uYWwuIFRoZSBmdW5jdGlvbiB0byBydW4gd2hlbiBhbiBlcnJvclxuICogaGFwcGVucyBpbiB0aGUgQ29tcHV0YXRpb24uIFRoZSBvbmx5IGFyZ3VtZW50IGl0IHJlY2VpdmVzIGlzIHRoZSBFcnJvclxuICogdGhyb3duLiBEZWZhdWx0cyB0byB0aGUgZXJyb3IgYmVpbmcgbG9nZ2VkIHRvIHRoZSBjb25zb2xlLlxuICogQHJldHVybnMge1RyYWNrZXIuQ29tcHV0YXRpb259XG4gKi9cblRyYWNrZXIuYXV0b3J1biA9IGZ1bmN0aW9uIChmLCBvcHRpb25zID0ge30pIHtcbiAgaWYgKHR5cGVvZiBmICE9PSAnZnVuY3Rpb24nKVxuICAgIHRocm93IG5ldyBFcnJvcignVHJhY2tlci5hdXRvcnVuIHJlcXVpcmVzIGEgZnVuY3Rpb24gYXJndW1lbnQnKTtcblxuICBjb25zdHJ1Y3RpbmdDb21wdXRhdGlvbiA9IHRydWU7XG4gIHZhciBjID0gbmV3IFRyYWNrZXIuQ29tcHV0YXRpb24oZiwgVHJhY2tlci5jdXJyZW50Q29tcHV0YXRpb24sIG9wdGlvbnMub25FcnJvcik7XG5cbiAgaWYgKFRyYWNrZXIuYWN0aXZlKVxuICAgIFRyYWNrZXIub25JbnZhbGlkYXRlKGZ1bmN0aW9uICgpIHtcbiAgICAgIGMuc3RvcCgpO1xuICAgIH0pO1xuXG4gIHJldHVybiBjO1xufTtcblxuLy8gaHR0cDovL2RvY3MubWV0ZW9yLmNvbS8jdHJhY2tlcl9ub25yZWFjdGl2ZVxuLy9cbi8vIFJ1biBgZmAgd2l0aCBubyBjdXJyZW50IGNvbXB1dGF0aW9uLCByZXR1cm5pbmcgdGhlIHJldHVybiB2YWx1ZVxuLy8gb2YgYGZgLiAgVXNlZCB0byB0dXJuIG9mZiByZWFjdGl2aXR5IGZvciB0aGUgZHVyYXRpb24gb2YgYGZgLFxuLy8gc28gdGhhdCByZWFjdGl2ZSBkYXRhIHNvdXJjZXMgYWNjZXNzZWQgYnkgYGZgIHdpbGwgbm90IHJlc3VsdCBpbiBhbnlcbi8vIGNvbXB1dGF0aW9ucyBiZWluZyBpbnZhbGlkYXRlZC5cblxuLyoqXG4gKiBAc3VtbWFyeSBSdW4gYSBmdW5jdGlvbiB3aXRob3V0IHRyYWNraW5nIGRlcGVuZGVuY2llcy5cbiAqIEBsb2N1cyBDbGllbnRcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgQSBmdW5jdGlvbiB0byBjYWxsIGltbWVkaWF0ZWx5LlxuICovXG5UcmFja2VyLm5vbnJlYWN0aXZlID0gZnVuY3Rpb24gKGYpIHtcbiAgcmV0dXJuIFRyYWNrZXIud2l0aENvbXB1dGF0aW9uKG51bGwsIGYpO1xufTtcblxuLyoqXG4gKiBAc3VtbWFyeSBIZWxwZXIgZnVuY3Rpb24gdG8gbWFrZSB0aGUgdHJhY2tlciB3b3JrIHdpdGggcHJvbWlzZXMuXG4gKiBAcGFyYW0gY29tcHV0YXRpb24gQ29tcHV0YXRpb24gdGhhdCB0cmFja2VkXG4gKiBAcGFyYW0gZnVuYyBhc3luYyBmdW5jdGlvbiB0aGF0IG5lZWRzIHRvIGJlIGNhbGxlZCBhbmQgYmUgcmVhY3RpdmVcbiAqL1xuVHJhY2tlci53aXRoQ29tcHV0YXRpb24gPSBmdW5jdGlvbiAoY29tcHV0YXRpb24sIGYpIHtcbiAgdmFyIHByZXZpb3VzQ29tcHV0YXRpb24gPSBUcmFja2VyLmN1cnJlbnRDb21wdXRhdGlvbjtcblxuICBUcmFja2VyLmN1cnJlbnRDb21wdXRhdGlvbiA9IGNvbXB1dGF0aW9uO1xuICBUcmFja2VyLmFjdGl2ZSA9ICEhY29tcHV0YXRpb247XG5cbiAgdHJ5IHtcbiAgICByZXR1cm4gZigpO1xuICB9IGZpbmFsbHkge1xuICAgIFRyYWNrZXIuY3VycmVudENvbXB1dGF0aW9uID0gcHJldmlvdXNDb21wdXRhdGlvbjtcbiAgICBUcmFja2VyLmFjdGl2ZSA9ICEhcHJldmlvdXNDb21wdXRhdGlvbjtcbiAgfVxufTtcblxuLy8gaHR0cDovL2RvY3MubWV0ZW9yLmNvbS8jdHJhY2tlcl9vbmludmFsaWRhdGVcblxuLyoqXG4gKiBAc3VtbWFyeSBSZWdpc3RlcnMgYSBuZXcgW2BvbkludmFsaWRhdGVgXSgjY29tcHV0YXRpb25fb25pbnZhbGlkYXRlKSBjYWxsYmFjayBvbiB0aGUgY3VycmVudCBjb21wdXRhdGlvbiAod2hpY2ggbXVzdCBleGlzdCksIHRvIGJlIGNhbGxlZCBpbW1lZGlhdGVseSB3aGVuIHRoZSBjdXJyZW50IGNvbXB1dGF0aW9uIGlzIGludmFsaWRhdGVkIG9yIHN0b3BwZWQuXG4gKiBAbG9jdXMgQ2xpZW50XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBBIGNhbGxiYWNrIGZ1bmN0aW9uIHRoYXQgd2lsbCBiZSBpbnZva2VkIGFzIGBmdW5jKGMpYCwgd2hlcmUgYGNgIGlzIHRoZSBjb21wdXRhdGlvbiBvbiB3aGljaCB0aGUgY2FsbGJhY2sgaXMgcmVnaXN0ZXJlZC5cbiAqL1xuVHJhY2tlci5vbkludmFsaWRhdGUgPSBmdW5jdGlvbiAoZikge1xuICBpZiAoISBUcmFja2VyLmFjdGl2ZSlcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJUcmFja2VyLm9uSW52YWxpZGF0ZSByZXF1aXJlcyBhIGN1cnJlbnRDb21wdXRhdGlvblwiKTtcblxuICBUcmFja2VyLmN1cnJlbnRDb21wdXRhdGlvbi5vbkludmFsaWRhdGUoZik7XG59O1xuXG4vLyBodHRwOi8vZG9jcy5tZXRlb3IuY29tLyN0cmFja2VyX2FmdGVyZmx1c2hcblxuLyoqXG4gKiBAc3VtbWFyeSBTY2hlZHVsZXMgYSBmdW5jdGlvbiB0byBiZSBjYWxsZWQgZHVyaW5nIHRoZSBuZXh0IGZsdXNoLCBvciBsYXRlciBpbiB0aGUgY3VycmVudCBmbHVzaCBpZiBvbmUgaXMgaW4gcHJvZ3Jlc3MsIGFmdGVyIGFsbCBpbnZhbGlkYXRlZCBjb21wdXRhdGlvbnMgaGF2ZSBiZWVuIHJlcnVuLiAgVGhlIGZ1bmN0aW9uIHdpbGwgYmUgcnVuIG9uY2UgYW5kIG5vdCBvbiBzdWJzZXF1ZW50IGZsdXNoZXMgdW5sZXNzIGBhZnRlckZsdXNoYCBpcyBjYWxsZWQgYWdhaW4uXG4gKiBAbG9jdXMgQ2xpZW50XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBBIGZ1bmN0aW9uIHRvIGNhbGwgYXQgZmx1c2ggdGltZS5cbiAqL1xuVHJhY2tlci5hZnRlckZsdXNoID0gZnVuY3Rpb24gKGYpIHtcbiAgYWZ0ZXJGbHVzaENhbGxiYWNrcy5wdXNoKGYpO1xuICByZXF1aXJlRmx1c2goKTtcbn07XG4iXX0=
