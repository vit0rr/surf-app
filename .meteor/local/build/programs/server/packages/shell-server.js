(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var socket;

var require = meteorInstall({"node_modules":{"meteor":{"shell-server":{"main.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                 //
// packages/shell-server/main.js                                                                   //
//                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                   //
module.link("./shell-server.js", {
  "*": "*"
}, 0);
let listen;
module.link("./shell-server.js", {
  listen(v) {
    listen = v;
  }
}, 1);
const shellDir = process.env.METEOR_SHELL_DIR;
if (shellDir) {
  listen(shellDir);
}
/////////////////////////////////////////////////////////////////////////////////////////////////////

},"shell-server.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                 //
// packages/shell-server/shell-server.js                                                           //
//                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                   //
!function (module1) {
  module1.export({
    listen: () => listen,
    disable: () => disable
  });
  let assert;
  module1.link("assert", {
    default(v) {
      assert = v;
    }
  }, 0);
  let pathJoin;
  module1.link("path", {
    join(v) {
      pathJoin = v;
    }
  }, 1);
  let PassThrough;
  module1.link("stream", {
    PassThrough(v) {
      PassThrough = v;
    }
  }, 2);
  let closeSync, openSync, readFileSync, unlink, writeFileSync, writeSync;
  module1.link("fs", {
    closeSync(v) {
      closeSync = v;
    },
    openSync(v) {
      openSync = v;
    },
    readFileSync(v) {
      readFileSync = v;
    },
    unlink(v) {
      unlink = v;
    },
    writeFileSync(v) {
      writeFileSync = v;
    },
    writeSync(v) {
      writeSync = v;
    }
  }, 3);
  let createServer;
  module1.link("net", {
    createServer(v) {
      createServer = v;
    }
  }, 4);
  let replStart;
  module1.link("repl", {
    start(v) {
      replStart = v;
    }
  }, 5);
  module1.link("meteor/inter-process-messaging");
  const INFO_FILE_MODE = parseInt("600", 8); // Only the owner can read or write.
  const EXITING_MESSAGE = "Shell exiting...";

  // Invoked by the server process to listen for incoming connections from
  // shell clients. Each connection gets its own REPL instance.
  function listen(shellDir) {
    function callback() {
      new Server(shellDir).listen();
    }

    // If the server is still in the very early stages of starting up,
    // Meteor.startup may not available yet.
    if (typeof Meteor === "object") {
      Meteor.startup(callback);
    } else if (typeof __meteor_bootstrap__ === "object") {
      const hooks = __meteor_bootstrap__.startupHooks;
      if (hooks) {
        hooks.push(callback);
      } else {
        // As a fallback, just call the callback asynchronously.
        setImmediate(callback);
      }
    }
  }
  function disable(shellDir) {
    try {
      // Replace info.json with a file that says the shell server is
      // disabled, so that any connected shell clients will fail to
      // reconnect after the server process closes their sockets.
      writeFileSync(getInfoFile(shellDir), JSON.stringify({
        status: "disabled",
        reason: "Shell server has shut down."
      }) + "\n", {
        mode: INFO_FILE_MODE
      });
    } catch (ignored) {}
  }
  // Shell commands need to be executed in a Fiber in case they call into
  // code that yields. Using a Promise is an even better idea, since it runs
  // its callbacks in Fibers drawn from a pool, so the Fibers are recycled.
  const evalCommandPromise = Promise.resolve();
  class Server {
    constructor(shellDir) {
      assert.ok(this instanceof Server);
      this.shellDir = shellDir;
      this.key = Math.random().toString(36).slice(2);
      this.server = createServer(socket => {
        this.onConnection(socket);
      }).on("error", err => {
        console.error(err.stack);
      });
    }
    listen() {
      const infoFile = getInfoFile(this.shellDir);
      unlink(infoFile, () => {
        this.server.listen(0, "127.0.0.1", () => {
          writeFileSync(infoFile, JSON.stringify({
            status: "enabled",
            port: this.server.address().port,
            key: this.key
          }) + "\n", {
            mode: INFO_FILE_MODE
          });
        });
      });
    }
    onConnection(socket) {
      // Make sure this function doesn't try to write anything to the socket
      // after it has been closed.
      socket.on("close", function () {
        socket = null;
      });

      // If communication is not established within 1000ms of the first
      // connection, forcibly close the socket.
      const timeout = setTimeout(function () {
        if (socket) {
          socket.removeAllListeners("data");
          socket.end(EXITING_MESSAGE + "\n");
        }
      }, 1000);

      // Let connecting clients configure certain REPL options by sending a
      // JSON object over the socket. For example, only the client knows
      // whether it's running a TTY or an Emacs subshell or some other kind of
      // terminal, so the client must decide the value of options.terminal.
      readJSONFromStream(socket, (error, options, replInputSocket) => {
        clearTimeout(timeout);
        if (error) {
          socket = null;
          console.error(error.stack);
          return;
        }
        if (options.key !== this.key) {
          if (socket) {
            socket.end(EXITING_MESSAGE + "\n");
          }
          return;
        }
        delete options.key;

        // Set the columns to what is being requested by the client.
        if (options.columns && socket) {
          socket.columns = options.columns;
        }
        delete options.columns;
        options = Object.assign(Object.create(null),
        // Defaults for configurable options.
        {
          prompt: "> ",
          terminal: true,
          useColors: true,
          ignoreUndefined: true
        },
        // Configurable options
        options,
        // Immutable options.
        {
          input: replInputSocket,
          useGlobal: false,
          output: socket
        });

        // The prompt during an evaluateAndExit must be blank to ensure
        // that the prompt doesn't inadvertently get parsed as part of
        // the JSON communication channel.
        if (options.evaluateAndExit) {
          options.prompt = "";
        }

        // Start the REPL.
        this.startREPL(options);
        if (options.evaluateAndExit) {
          this._wrappedDefaultEval.call(Object.create(null), options.evaluateAndExit.command, global, options.evaluateAndExit.filename || "<meteor shell>", function (error, result) {
            if (socket) {
              function sendResultToSocket(message) {
                // Sending back a JSON payload allows the client to
                // distinguish between errors and successful results.
                socket.end(JSON.stringify(message) + "\n");
              }
              if (error) {
                sendResultToSocket({
                  error: error.toString(),
                  code: 1
                });
              } else {
                sendResultToSocket({
                  result
                });
              }
            }
          });
          return;
        }
        delete options.evaluateAndExit;
        this.enableInteractiveMode(options);
      });
    }
    startREPL(options) {
      // Make sure this function doesn't try to write anything to the output
      // stream after it has been closed.
      options.output.on("close", function () {
        options.output = null;
      });
      const repl = this.repl = replStart(options);
      const {
        shellDir
      } = this;

      // This is technique of setting `repl.context` is similar to how the
      // `useGlobal` option would work during a normal `repl.start()` and
      // allows shell access (and tab completion!) to Meteor globals (i.e.
      // Underscore _, Meteor, etc.). By using this technique, which changes
      // the context after startup, we avoid stomping on the special `_`
      // variable (in `repl` this equals the value of the last command) from
      // being overridden in the client/server socket-handshaking.  Furthermore,
      // by setting `useGlobal` back to true, we allow the default eval function
      // to use the desired `runInThisContext` method (https://git.io/vbvAB).
      repl.context = global;
      repl.useGlobal = true;
      setRequireAndModule(repl.context);

      // In order to avoid duplicating code here, specifically the complexities
      // of catching so-called "Recoverable Errors" (https://git.io/vbvbl),
      // we will wrap the default eval, run it in a Fiber (via a Promise), and
      // give it the opportunity to decide if the user is mid-code-block.
      const defaultEval = repl.eval;
      function wrappedDefaultEval(code, context, file, callback) {
        if (Package.ecmascript) {
          try {
            code = Package.ecmascript.ECMAScript.compileForShell(code, {
              cacheDirectory: getCacheDirectory(shellDir)
            });
          } catch (err) {
            // Any Babel error here might be just fine since it's
            // possible the code was incomplete (multi-line code on the REPL).
            // The defaultEval below will use its own functionality to determine
            // if this error is "recoverable".
          }
        }
        evalCommandPromise.then(() => defaultEval(code, context, file, callback)).catch(callback);
      }

      // Have the REPL use the newly wrapped function instead and store the
      // _wrappedDefaultEval so that evalulateAndExit calls can use it directly.
      repl.eval = this._wrappedDefaultEval = wrappedDefaultEval;
    }
    enableInteractiveMode(options) {
      // History persists across shell sessions!
      this.initializeHistory();
      const repl = this.repl;

      // Implement an alternate means of fetching the return value,
      // via `__` (double underscore) as originally implemented in:
      // https://github.com/meteor/meteor/commit/2443d832265c7d1c
      Object.defineProperty(repl.context, "__", {
        get: () => repl.last,
        set: val => {
          repl.last = val;
        },
        // Allow this property to be (re)defined more than once (e.g. each
        // time the server restarts).
        configurable: true
      });

      // Some improvements to the existing help messages.
      function addHelp(cmd, helpText) {
        const info = repl.commands[cmd] || repl.commands["." + cmd];
        if (info) {
          info.help = helpText;
        }
      }
      addHelp("break", "Terminate current command input and display new prompt");
      addHelp("exit", "Disconnect from server and leave shell");
      addHelp("help", "Show this help information");

      // When the REPL exits, signal the attached client to exit by sending it
      // the special EXITING_MESSAGE.
      repl.on("exit", function () {
        if (options.output) {
          options.output.write(EXITING_MESSAGE + "\n");
          options.output.end();
        }
      });

      // When the server process exits, end the output stream but do not
      // signal the attached client to exit.
      process.on("exit", function () {
        if (options.output) {
          options.output.end();
        }
      });

      // This Meteor-specific shell command rebuilds the application as if a
      // change was made to server code.
      repl.defineCommand("reload", {
        help: "Restart the server and the shell",
        action: function () {
          if (process.sendMessage) {
            process.sendMessage("shell-server", {
              command: "reload"
            });
          } else {
            process.exit(0);
          }
        }
      });
    }

    // This function allows a persistent history of shell commands to be saved
    // to and loaded from .meteor/local/shell/history.
    initializeHistory() {
      const repl = this.repl;
      const historyFile = getHistoryFile(this.shellDir);
      let historyFd = openSync(historyFile, "a+");
      const historyLines = readFileSync(historyFile, "utf8").split("\n");
      const seenLines = Object.create(null);
      if (!repl.history) {
        repl.history = [];
        repl.historyIndex = -1;
      }
      while (repl.history && historyLines.length > 0) {
        const line = historyLines.pop();
        if (line && /\S/.test(line) && !seenLines[line]) {
          repl.history.push(line);
          seenLines[line] = true;
        }
      }
      repl.addListener("line", function (line) {
        if (historyFd >= 0 && /\S/.test(line)) {
          writeSync(historyFd, line + "\n");
        }
      });
      this.repl.on("exit", function () {
        closeSync(historyFd);
        historyFd = -1;
      });
    }
  }
  function readJSONFromStream(inputStream, callback) {
    const outputStream = new PassThrough();
    let dataSoFar = "";
    function onData(buffer) {
      const lines = buffer.toString("utf8").split("\n");
      while (lines.length > 0) {
        dataSoFar += lines.shift();
        let json;
        try {
          json = JSON.parse(dataSoFar);
        } catch (error) {
          if (error instanceof SyntaxError) {
            continue;
          }
          return finish(error);
        }
        if (lines.length > 0) {
          outputStream.write(lines.join("\n"));
        }
        inputStream.pipe(outputStream);
        return finish(null, json);
      }
    }
    function onClose() {
      finish(new Error("stream unexpectedly closed"));
    }
    let finished = false;
    function finish(error, json) {
      if (!finished) {
        finished = true;
        inputStream.removeListener("data", onData);
        inputStream.removeListener("error", finish);
        inputStream.removeListener("close", onClose);
        callback(error, json, outputStream);
      }
    }
    inputStream.on("data", onData);
    inputStream.on("error", finish);
    inputStream.on("close", onClose);
  }
  function getInfoFile(shellDir) {
    return pathJoin(shellDir, "info.json");
  }
  function getHistoryFile(shellDir) {
    return pathJoin(shellDir, "history");
  }
  function getCacheDirectory(shellDir) {
    return pathJoin(shellDir, "cache");
  }
  function setRequireAndModule(context) {
    if (Package.modules) {
      // Use the same `require` function and `module` object visible to the
      // application.
      const toBeInstalled = {};
      const shellModuleName = "meteor-shell-" + Math.random().toString(36).slice(2) + ".js";
      toBeInstalled[shellModuleName] = function (require, exports, module) {
        context.module = module;
        context.require = require;

        // Tab completion sometimes uses require.extensions, but only for
        // the keys.
        require.extensions = {
          ".js": true,
          ".json": true,
          ".node": true
        };
      };

      // This populates repl.context.{module,require} by evaluating the
      // module defined above.
      Package.modules.meteorInstall(toBeInstalled)("./" + shellModuleName);
    }
  }
}.call(this, module);
/////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

var exports = require("/node_modules/meteor/shell-server/main.js");

/* Exports */
Package._define("shell-server", exports);

})();

//# sourceURL=meteor://💻app/packages/shell-server.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvc2hlbGwtc2VydmVyL21haW4uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3NoZWxsLXNlcnZlci9zaGVsbC1zZXJ2ZXIuanMiXSwibmFtZXMiOlsibW9kdWxlIiwibGluayIsImxpc3RlbiIsInYiLCJzaGVsbERpciIsInByb2Nlc3MiLCJlbnYiLCJNRVRFT1JfU0hFTExfRElSIiwibW9kdWxlMSIsImV4cG9ydCIsImRpc2FibGUiLCJhc3NlcnQiLCJkZWZhdWx0IiwicGF0aEpvaW4iLCJqb2luIiwiUGFzc1Rocm91Z2giLCJjbG9zZVN5bmMiLCJvcGVuU3luYyIsInJlYWRGaWxlU3luYyIsInVubGluayIsIndyaXRlRmlsZVN5bmMiLCJ3cml0ZVN5bmMiLCJjcmVhdGVTZXJ2ZXIiLCJyZXBsU3RhcnQiLCJzdGFydCIsIklORk9fRklMRV9NT0RFIiwicGFyc2VJbnQiLCJFWElUSU5HX01FU1NBR0UiLCJjYWxsYmFjayIsIlNlcnZlciIsIk1ldGVvciIsInN0YXJ0dXAiLCJfX21ldGVvcl9ib290c3RyYXBfXyIsImhvb2tzIiwic3RhcnR1cEhvb2tzIiwicHVzaCIsInNldEltbWVkaWF0ZSIsImdldEluZm9GaWxlIiwiSlNPTiIsInN0cmluZ2lmeSIsInN0YXR1cyIsInJlYXNvbiIsIm1vZGUiLCJpZ25vcmVkIiwiZXZhbENvbW1hbmRQcm9taXNlIiwiUHJvbWlzZSIsInJlc29sdmUiLCJjb25zdHJ1Y3RvciIsIm9rIiwia2V5IiwiTWF0aCIsInJhbmRvbSIsInRvU3RyaW5nIiwic2xpY2UiLCJzZXJ2ZXIiLCJzb2NrZXQiLCJvbkNvbm5lY3Rpb24iLCJvbiIsImVyciIsImNvbnNvbGUiLCJlcnJvciIsInN0YWNrIiwiaW5mb0ZpbGUiLCJwb3J0IiwiYWRkcmVzcyIsInRpbWVvdXQiLCJzZXRUaW1lb3V0IiwicmVtb3ZlQWxsTGlzdGVuZXJzIiwiZW5kIiwicmVhZEpTT05Gcm9tU3RyZWFtIiwib3B0aW9ucyIsInJlcGxJbnB1dFNvY2tldCIsImNsZWFyVGltZW91dCIsImNvbHVtbnMiLCJPYmplY3QiLCJhc3NpZ24iLCJjcmVhdGUiLCJwcm9tcHQiLCJ0ZXJtaW5hbCIsInVzZUNvbG9ycyIsImlnbm9yZVVuZGVmaW5lZCIsImlucHV0IiwidXNlR2xvYmFsIiwib3V0cHV0IiwiZXZhbHVhdGVBbmRFeGl0Iiwic3RhcnRSRVBMIiwiX3dyYXBwZWREZWZhdWx0RXZhbCIsImNhbGwiLCJjb21tYW5kIiwiZ2xvYmFsIiwiZmlsZW5hbWUiLCJyZXN1bHQiLCJzZW5kUmVzdWx0VG9Tb2NrZXQiLCJtZXNzYWdlIiwiY29kZSIsImVuYWJsZUludGVyYWN0aXZlTW9kZSIsInJlcGwiLCJjb250ZXh0Iiwic2V0UmVxdWlyZUFuZE1vZHVsZSIsImRlZmF1bHRFdmFsIiwiZXZhbCIsIndyYXBwZWREZWZhdWx0RXZhbCIsImZpbGUiLCJQYWNrYWdlIiwiZWNtYXNjcmlwdCIsIkVDTUFTY3JpcHQiLCJjb21waWxlRm9yU2hlbGwiLCJjYWNoZURpcmVjdG9yeSIsImdldENhY2hlRGlyZWN0b3J5IiwidGhlbiIsImNhdGNoIiwiaW5pdGlhbGl6ZUhpc3RvcnkiLCJkZWZpbmVQcm9wZXJ0eSIsImdldCIsImxhc3QiLCJzZXQiLCJ2YWwiLCJjb25maWd1cmFibGUiLCJhZGRIZWxwIiwiY21kIiwiaGVscFRleHQiLCJpbmZvIiwiY29tbWFuZHMiLCJoZWxwIiwid3JpdGUiLCJkZWZpbmVDb21tYW5kIiwiYWN0aW9uIiwic2VuZE1lc3NhZ2UiLCJleGl0IiwiaGlzdG9yeUZpbGUiLCJnZXRIaXN0b3J5RmlsZSIsImhpc3RvcnlGZCIsImhpc3RvcnlMaW5lcyIsInNwbGl0Iiwic2VlbkxpbmVzIiwiaGlzdG9yeSIsImhpc3RvcnlJbmRleCIsImxlbmd0aCIsImxpbmUiLCJwb3AiLCJ0ZXN0IiwiYWRkTGlzdGVuZXIiLCJpbnB1dFN0cmVhbSIsIm91dHB1dFN0cmVhbSIsImRhdGFTb0ZhciIsIm9uRGF0YSIsImJ1ZmZlciIsImxpbmVzIiwic2hpZnQiLCJqc29uIiwicGFyc2UiLCJTeW50YXhFcnJvciIsImZpbmlzaCIsInBpcGUiLCJvbkNsb3NlIiwiRXJyb3IiLCJmaW5pc2hlZCIsInJlbW92ZUxpc3RlbmVyIiwibW9kdWxlcyIsInRvQmVJbnN0YWxsZWQiLCJzaGVsbE1vZHVsZU5hbWUiLCJyZXF1aXJlIiwiZXhwb3J0cyIsImV4dGVuc2lvbnMiLCJtZXRlb3JJbnN0YWxsIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQUEsTUFBTSxDQUFDQyxJQUFJLENBQUMsbUJBQW1CLEVBQUM7RUFBQyxHQUFHLEVBQUM7QUFBRyxDQUFDLEVBQUMsQ0FBQyxDQUFDO0FBQUMsSUFBSUMsTUFBTTtBQUFDRixNQUFNLENBQUNDLElBQUksQ0FBQyxtQkFBbUIsRUFBQztFQUFDQyxNQUFNQSxDQUFDQyxDQUFDLEVBQUM7SUFBQ0QsTUFBTSxHQUFDQyxDQUFDO0VBQUE7QUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDO0FBR2hILE1BQU1DLFFBQVEsR0FBR0MsT0FBTyxDQUFDQyxHQUFHLENBQUNDLGdCQUFnQjtBQUM3QyxJQUFJSCxRQUFRLEVBQUU7RUFDWkYsTUFBTSxDQUFDRSxRQUFRLENBQUM7QUFDbEIsQzs7Ozs7Ozs7Ozs7O0VDTkFJLE9BQU8sQ0FBQ0MsTUFBTSxDQUFDO0lBQUNQLE1BQU0sRUFBQ0EsQ0FBQSxLQUFJQSxNQUFNO0lBQUNRLE9BQU8sRUFBQ0EsQ0FBQSxLQUFJQTtFQUFPLENBQUMsQ0FBQztFQUFDLElBQUlDLE1BQU07RUFBQ0gsT0FBTyxDQUFDUCxJQUFJLENBQUMsUUFBUSxFQUFDO0lBQUNXLE9BQU9BLENBQUNULENBQUMsRUFBQztNQUFDUSxNQUFNLEdBQUNSLENBQUM7SUFBQTtFQUFDLENBQUMsRUFBQyxDQUFDLENBQUM7RUFBQyxJQUFJVSxRQUFRO0VBQUNMLE9BQU8sQ0FBQ1AsSUFBSSxDQUFDLE1BQU0sRUFBQztJQUFDYSxJQUFJQSxDQUFDWCxDQUFDLEVBQUM7TUFBQ1UsUUFBUSxHQUFDVixD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RTdDMEcsYUFBYSxDQUFDQyxlQUFlLENBQUMsR0FBRyxVQUFVQyxPQUFPLEVBQUVDLE9BQU8sRUFBRWxLLE1BQU0sRUFBRTtRQUNuRWlHLE9BQU8sQ0FBQ2pHLE1BQU0sR0FBR0EsTUFBTTtRQUN2QmlHLE9BQU8sQ0FBQ2dFLE9BQU8sR0FBR0EsT0FBTzs7UUFFekI7UUFDQTtRQUNBQSxPQUFPLENBQUNFLFVBQVUsR0FBRztVQUNuQixLQUFLLEVBQUUsSUFBSTtVQUNYLE9BQU8sRUFBRSxJQUFJO1VBQ2IsT0FBTyxFQUFFO1FBQ1gsQ0FBQztNQUNILENBQUM7O01BRUQ7TUFDQTtNQUNBNUQsT0FBTyxDQUFDdUQsT0FBTyxDQUFDTSxhQUFhLENBQUNMLGFBQWEsQ0FBQyxDQUFDLElBQUksR0FBR0MsZUFBZSxDQUFDO0lBQ3RFO0VBQ0Y7QUFBQyxFQUFBekUsSUFBQSxPQUFBdkYsTUFBQSxFIiwiZmlsZSI6Ii9wYWNrYWdlcy9zaGVsbC1zZXJ2ZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgKiBmcm9tIFwiLi9zaGVsbC1zZXJ2ZXIuanNcIjtcbmltcG9ydCB7IGxpc3RlbiB9IGZyb20gXCIuL3NoZWxsLXNlcnZlci5qc1wiO1xuXG5jb25zdCBzaGVsbERpciA9IHByb2Nlc3MuZW52Lk1FVEVPUl9TSEVMTF9ESVI7XG5pZiAoc2hlbGxEaXIpIHtcbiAgbGlzdGVuKHNoZWxsRGlyKTtcbn1cbiIsImltcG9ydCBhc3NlcnQgZnJvbSBcImFzc2VydFwiO1xuaW1wb3J0IHsgam9pbiBhcyBwYXRoSm9pbiB9IGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgeyBQYXNzVGhyb3VnaCB9IGZyb20gXCJzdHJlYW1cIjtcbmltcG9ydCB7XG4gIGNsb3NlU3luYyxcbiAgb3BlblN5bmMsXG4gIHJlYWRGaWxlU3luYyxcbiAgdW5saW5rLFxuICB3cml0ZUZpbGVTeW5jLFxuICB3cml0ZVN5bmMsXG59IGZyb20gXCJmc1wiO1xuaW1wb3J0IHsgY3JlYXRlU2VydmVyIH0gZnJvbSBcIm5ldFwiO1xuaW1wb3J0IHsgc3RhcnQgYXMgcmVwbFN0YXJ0IH0gZnJvbSBcInJlcGxcIjtcblxuLy8gRW5hYmxlIHByb2Nlc3Muc2VuZE1lc3NhZ2UgZm9yIGNvbW11bmljYXRpb24gd2l0aCBidWlsZCBwcm9jZXNzLlxuaW1wb3J0IFwibWV0ZW9yL2ludGVyLXByb2Nlc3MtbWVzc2FnaW5nXCI7XG5cbmNvbnN0IElORk9fRklMRV9NT0RFID0gcGFyc2VJbnQoXCI2MDBcIiwgOCk7IC8vIE9ubHkgdGhlIG93bmVyIGNhbiByZWFkIG9yIHdyaXRlLlxuY29uc3QgRVhJVElOR19NRVNTQUdFID0gXCJTaGVsbCBleGl0aW5nLi4uXCI7XG5cbi8vIEludm9rZWQgYnkgdGhlIHNlcnZlciBwcm9jZXNzIHRvIGxpc3RlbiBmb3IgaW5jb21pbmcgY29ubmVjdGlvbnMgZnJvbVxuLy8gc2hlbGwgY2xpZW50cy4gRWFjaCBjb25uZWN0aW9uIGdldHMgaXRzIG93biBSRVBMIGluc3RhbmNlLlxuZXhwb3J0IGZ1bmN0aW9uIGxpc3RlbihzaGVsbERpcikge1xuICBmdW5jdGlvbiBjYWxsYmFjaygpIHtcbiAgICBuZXcgU2VydmVyKHNoZWxsRGlyKS5saXN0ZW4oKTtcbiAgfVxuXG4gIC8vIElmIHRoZSBzZXJ2ZXIgaXMgc3RpbGwgaW4gdGhlIHZlcnkgZWFybHkgc3RhZ2VzIG9mIHN0YXJ0aW5nIHVwLFxuICAvLyBNZXRlb3Iuc3RhcnR1cCBtYXkgbm90IGF2YWlsYWJsZSB5ZXQuXG4gIGlmICh0eXBlb2YgTWV0ZW9yID09PSBcIm9iamVjdFwiKSB7XG4gICAgTWV0ZW9yLnN0YXJ0dXAoY2FsbGJhY2spO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBfX21ldGVvcl9ib290c3RyYXBfXyA9PT0gXCJvYmplY3RcIikge1xuICAgIGNvbnN0IGhvb2tzID0gX19tZXRlb3JfYm9vdHN0cmFwX18uc3RhcnR1cEhvb2tzO1xuICAgIGlmIChob29rcykge1xuICAgICAgaG9va3MucHVzaChjYWxsYmFjayk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEFzIGEgZmFsbGJhY2ssIGp1c3QgY2FsbCB0aGUgY2FsbGJhY2sgYXN5bmNocm9ub3VzbHkuXG4gICAgICBzZXRJbW1lZGlhdGUoY2FsbGJhY2spO1xuICAgIH1cbiAgfVxufVxuXG4vLyBEaXNhYmxpbmcgdGhlIHNoZWxsIGNhdXNlcyBhbGwgYXR0YWNoZWQgY2xpZW50cyB0byBkaXNjb25uZWN0IGFuZCBleGl0LlxuZXhwb3J0IGZ1bmN0aW9uIGRpc2FibGUoc2hlbGxEaXIpIHtcbiAgdHJ5IHtcbiAgICAvLyBSZXBsYWNlIGluZm8uanNvbiB3aXRoIGEgZmlsZSB0aGF0IHNheXMgdGhlIHNoZWxsIHNlcnZlciBpc1xuICAgIC8vIGRpc2FibGVkLCBzbyB0aGF0IGFueSBjb25uZWN0ZWQgc2hlbGwgY2xpZW50cyB3aWxsIGZhaWwgdG9cbiAgICAvLyByZWNvbm5lY3QgYWZ0ZXIgdGhlIHNlcnZlciBwcm9jZXNzIGNsb3NlcyB0aGVpciBzb2NrZXRzLlxuICAgIHdyaXRlRmlsZVN5bmMoXG4gICAgICBnZXRJbmZvRmlsZShzaGVsbERpciksXG4gICAgICBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIHN0YXR1czogXCJkaXNhYmxlZFwiLFxuICAgICAgICByZWFzb246IFwiU2hlbGwgc2VydmVyIGhhcyBzaHV0IGRvd24uXCJcbiAgICAgIH0pICsgXCJcXG5cIixcbiAgICAgIHsgbW9kZTogSU5GT19GSUxFX01PREUgfVxuICAgICk7XG4gIH0gY2F0Y2ggKGlnbm9yZWQpIHt9XG59XG5cbi8vIFNoZWxsIGNvbW1hbmRzIG5lZWQgdG8gYmUgZXhlY3V0ZWQgaW4gYSBGaWJlciBpbiBjYXNlIHRoZXkgY2FsbCBpbnRvXG4vLyBjb2RlIHRoYXQgeWllbGRzLiBVc2luZyBhIFByb21pc2UgaXMgYW4gZXZlbiBiZXR0ZXIgaWRlYSwgc2luY2UgaXQgcnVuc1xuLy8gaXRzIGNhbGxiYWNrcyBpbiBGaWJlcnMgZHJhd24gZnJvbSBhIHBvb2wsIHNvIHRoZSBGaWJlcnMgYXJlIHJlY3ljbGVkLlxuY29uc3QgZXZhbENvbW1hbmRQcm9taXNlID0gUHJvbWlzZS5yZXNvbHZlKCk7XG5cbmNsYXNzIFNlcnZlciB7XG4gIGNvbnN0cnVjdG9yKHNoZWxsRGlyKSB7XG4gICAgYXNzZXJ0Lm9rKHRoaXMgaW5zdGFuY2VvZiBTZXJ2ZXIpO1xuXG4gICAgdGhpcy5zaGVsbERpciA9IHNoZWxsRGlyO1xuICAgIHRoaXMua2V5ID0gTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc2xpY2UoMik7XG5cbiAgICB0aGlzLnNlcnZlciA9XG4gICAgICBjcmVhdGVTZXJ2ZXIoKHNvY2tldCkgPT4ge1xuICAgICAgICB0aGlzLm9uQ29ubmVjdGlvbihzb2NrZXQpO1xuICAgICAgfSlcbiAgICAgIC5vbihcImVycm9yXCIsIChlcnIpID0+IHtcbiAgICAgICAgY29uc29sZS5lcnJvcihlcnIuc3RhY2spO1xuICAgICAgfSk7XG4gIH1cblxuICBsaXN0ZW4oKSB7XG4gICAgY29uc3QgaW5mb0ZpbGUgPSBnZXRJbmZvRmlsZSh0aGlzLnNoZWxsRGlyKTtcblxuICAgIHVubGluayhpbmZvRmlsZSwgKCkgPT4ge1xuICAgICAgdGhpcy5zZXJ2ZXIubGlzdGVuKDAsIFwiMTI3LjAuMC4xXCIsICgpID0+IHtcbiAgICAgICAgd3JpdGVGaWxlU3luYyhpbmZvRmlsZSwgSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIHN0YXR1czogXCJlbmFibGVkXCIsXG4gICAgICAgICAgcG9ydDogdGhpcy5zZXJ2ZXIuYWRkcmVzcygpLnBvcnQsXG4gICAgICAgICAga2V5OiB0aGlzLmtleVxuICAgICAgICB9KSArIFwiXFxuXCIsIHtcbiAgICAgICAgICBtb2RlOiBJTkZPX0ZJTEVfTU9ERVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgb25Db25uZWN0aW9uKHNvY2tldCkge1xuICAgIC8vIE1ha2Ugc3VyZSB0aGlzIGZ1bmN0aW9uIGRvZXNuJ3QgdHJ5IHRvIHdyaXRlIGFueXRoaW5nIHRvIHRoZSBzb2NrZXRcbiAgICAvLyBhZnRlciBpdCBoYXMgYmVlbiBjbG9zZWQuXG4gICAgc29ja2V0Lm9uKFwiY2xvc2VcIiwgZnVuY3Rpb24oKSB7XG4gICAgICBzb2NrZXQgPSBudWxsO1xuICAgIH0pO1xuXG4gICAgLy8gSWYgY29tbXVuaWNhdGlvbiBpcyBub3QgZXN0YWJsaXNoZWQgd2l0aGluIDEwMDBtcyBvZiB0aGUgZmlyc3RcbiAgICAvLyBjb25uZWN0aW9uLCBmb3JjaWJseSBjbG9zZSB0aGUgc29ja2V0LlxuICAgIGNvbnN0IHRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHNvY2tldCkge1xuICAgICAgICBzb2NrZXQucmVtb3ZlQWxsTGlzdGVuZXJzKFwiZGF0YVwiKTtcbiAgICAgICAgc29ja2V0LmVuZChFWElUSU5HX01FU1NBR0UgKyBcIlxcblwiKTtcbiAgICAgIH1cbiAgICB9LCAxMDAwKTtcblxuICAgIC8vIExldCBjb25uZWN0aW5nIGNsaWVudHMgY29uZmlndXJlIGNlcnRhaW4gUkVQTCBvcHRpb25zIGJ5IHNlbmRpbmcgYVxuICAgIC8vIEpTT04gb2JqZWN0IG92ZXIgdGhlIHNvY2tldC4gRm9yIGV4YW1wbGUsIG9ubHkgdGhlIGNsaWVudCBrbm93c1xuICAgIC8vIHdoZXRoZXIgaXQncyBydW5uaW5nIGEgVFRZIG9yIGFuIEVtYWNzIHN1YnNoZWxsIG9yIHNvbWUgb3RoZXIga2luZCBvZlxuICAgIC8vIHRlcm1pbmFsLCBzbyB0aGUgY2xpZW50IG11c3QgZGVjaWRlIHRoZSB2YWx1ZSBvZiBvcHRpb25zLnRlcm1pbmFsLlxuICAgIHJlYWRKU09ORnJvbVN0cmVhbShzb2NrZXQsIChlcnJvciwgb3B0aW9ucywgcmVwbElucHV0U29ja2V0KSA9PiB7XG4gICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG5cbiAgICAgIGlmIChlcnJvcikge1xuICAgICAgICBzb2NrZXQgPSBudWxsO1xuICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yLnN0YWNrKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAob3B0aW9ucy5rZXkgIT09IHRoaXMua2V5KSB7XG4gICAgICAgIGlmIChzb2NrZXQpIHtcbiAgICAgICAgICBzb2NrZXQuZW5kKEVYSVRJTkdfTUVTU0FHRSArIFwiXFxuXCIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGRlbGV0ZSBvcHRpb25zLmtleTtcblxuICAgICAgLy8gU2V0IHRoZSBjb2x1bW5zIHRvIHdoYXQgaXMgYmVpbmcgcmVxdWVzdGVkIGJ5IHRoZSBjbGllbnQuXG4gICAgICBpZiAob3B0aW9ucy5jb2x1bW5zICYmIHNvY2tldCkge1xuICAgICAgICBzb2NrZXQuY29sdW1ucyA9IG9wdGlvbnMuY29sdW1ucztcbiAgICAgIH1cbiAgICAgIGRlbGV0ZSBvcHRpb25zLmNvbHVtbnM7XG5cbiAgICAgIG9wdGlvbnMgPSBPYmplY3QuYXNzaWduKFxuICAgICAgICBPYmplY3QuY3JlYXRlKG51bGwpLFxuXG4gICAgICAgIC8vIERlZmF1bHRzIGZvciBjb25maWd1cmFibGUgb3B0aW9ucy5cbiAgICAgICAge1xuICAgICAgICAgIHByb21wdDogXCI+IFwiLFxuICAgICAgICAgIHRlcm1pbmFsOiB0cnVlLFxuICAgICAgICAgIHVzZUNvbG9yczogdHJ1ZSxcbiAgICAgICAgICBpZ25vcmVVbmRlZmluZWQ6IHRydWUsXG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gQ29uZmlndXJhYmxlIG9wdGlvbnNcbiAgICAgICAgb3B0aW9ucyxcblxuICAgICAgICAvLyBJbW11dGFibGUgb3B0aW9ucy5cbiAgICAgICAge1xuICAgICAgICAgIGlucHV0OiByZXBsSW5wdXRTb2NrZXQsXG4gICAgICAgICAgdXNlR2xvYmFsOiBmYWxzZSxcbiAgICAgICAgICBvdXRwdXQ6IHNvY2tldFxuICAgICAgICB9XG4gICAgICApO1xuXG4gICAgICAvLyBUaGUgcHJvbXB0IGR1cmluZyBhbiBldmFsdWF0ZUFuZEV4aXQgbXVzdCBiZSBibGFuayB0byBlbnN1cmVcbiAgICAgIC8vIHRoYXQgdGhlIHByb21wdCBkb2Vzbid0IGluYWR2ZXJ0ZW50bHkgZ2V0IHBhcnNlZCBhcyBwYXJ0IG9mXG4gICAgICAvLyB0aGUgSlNPTiBjb21tdW5pY2F0aW9uIGNoYW5uZWwuXG4gICAgICBpZiAob3B0aW9ucy5ldmFsdWF0ZUFuZEV4aXQpIHtcbiAgICAgICAgb3B0aW9ucy5wcm9tcHQgPSBcIlwiO1xuICAgICAgfVxuXG4gICAgICAvLyBTdGFydCB0aGUgUkVQTC5cbiAgICAgIHRoaXMuc3RhcnRSRVBMKG9wdGlvbnMpO1xuXG4gICAgICBpZiAob3B0aW9ucy5ldmFsdWF0ZUFuZEV4aXQpIHtcbiAgICAgICAgdGhpcy5fd3JhcHBlZERlZmF1bHRFdmFsLmNhbGwoXG4gICAgICAgICAgT2JqZWN0LmNyZWF0ZShudWxsKSxcbiAgICAgICAgICBvcHRpb25zLmV2YWx1YXRlQW5kRXhpdC5jb21tYW5kLFxuICAgICAgICAgIGdsb2JhbCxcbiAgICAgICAgICBvcHRpb25zLmV2YWx1YXRlQW5kRXhpdC5maWxlbmFtZSB8fCBcIjxtZXRlb3Igc2hlbGw+XCIsXG4gICAgICAgICAgZnVuY3Rpb24gKGVycm9yLCByZXN1bHQpIHtcbiAgICAgICAgICAgIGlmIChzb2NrZXQpIHtcbiAgICAgICAgICAgICAgZnVuY3Rpb24gc2VuZFJlc3VsdFRvU29ja2V0KG1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICAvLyBTZW5kaW5nIGJhY2sgYSBKU09OIHBheWxvYWQgYWxsb3dzIHRoZSBjbGllbnQgdG9cbiAgICAgICAgICAgICAgICAvLyBkaXN0aW5ndWlzaCBiZXR3ZWVuIGVycm9ycyBhbmQgc3VjY2Vzc2Z1bCByZXN1bHRzLlxuICAgICAgICAgICAgICAgIHNvY2tldC5lbmQoSlNPTi5zdHJpbmdpZnkobWVzc2FnZSkgKyBcIlxcblwiKTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgICAgIHNlbmRSZXN1bHRUb1NvY2tldCh7XG4gICAgICAgICAgICAgICAgICBlcnJvcjogZXJyb3IudG9TdHJpbmcoKSxcbiAgICAgICAgICAgICAgICAgIGNvZGU6IDFcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzZW5kUmVzdWx0VG9Tb2NrZXQoe1xuICAgICAgICAgICAgICAgICAgcmVzdWx0LFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICApO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBkZWxldGUgb3B0aW9ucy5ldmFsdWF0ZUFuZEV4aXQ7XG5cbiAgICAgIHRoaXMuZW5hYmxlSW50ZXJhY3RpdmVNb2RlKG9wdGlvbnMpO1xuICAgIH0pO1xuICB9XG5cbiAgc3RhcnRSRVBMKG9wdGlvbnMpIHtcbiAgICAvLyBNYWtlIHN1cmUgdGhpcyBmdW5jdGlvbiBkb2Vzbid0IHRyeSB0byB3cml0ZSBhbnl0aGluZyB0byB0aGUgb3V0cHV0XG4gICAgLy8gc3RyZWFtIGFmdGVyIGl0IGhhcyBiZWVuIGNsb3NlZC5cbiAgICBvcHRpb25zLm91dHB1dC5vbihcImNsb3NlXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgb3B0aW9ucy5vdXRwdXQgPSBudWxsO1xuICAgIH0pO1xuXG4gICAgY29uc3QgcmVwbCA9IHRoaXMucmVwbCA9IHJlcGxTdGFydChvcHRpb25zKTtcbiAgICBjb25zdCB7IHNoZWxsRGlyIH0gPSB0aGlzO1xuXG4gICAgLy8gVGhpcyBpcyB0ZWNobmlxdWUgb2Ygc2V0dGluZyBgcmVwbC5jb250ZXh0YCBpcyBzaW1pbGFyIHRvIGhvdyB0aGVcbiAgICAvLyBgdXNlR2xvYmFsYCBvcHRpb24gd291bGQgd29yayBkdXJpbmcgYSBub3JtYWwgYHJlcGwuc3RhcnQoKWAgYW5kXG4gICAgLy8gYWxsb3dzIHNoZWxsIGFjY2VzcyAoYW5kIHRhYiBjb21wbGV0aW9uISkgdG8gTWV0ZW9yIGdsb2JhbHMgKGkuZS5cbiAgICAvLyBVbmRlcnNjb3JlIF8sIE1ldGVvciwgZXRjLikuIEJ5IHVzaW5nIHRoaXMgdGVjaG5pcXVlLCB3aGljaCBjaGFuZ2VzXG4gICAgLy8gdGhlIGNvbnRleHQgYWZ0ZXIgc3RhcnR1cCwgd2UgYXZvaWQgc3RvbXBpbmcgb24gdGhlIHNwZWNpYWwgYF9gXG4gICAgLy8gdmFyaWFibGUgKGluIGByZXBsYCB0aGlzIGVxdWFscyB0aGUgdmFsdWUgb2YgdGhlIGxhc3QgY29tbWFuZCkgZnJvbVxuICAgIC8vIGJlaW5nIG92ZXJyaWRkZW4gaW4gdGhlIGNsaWVudC9zZXJ2ZXIgc29ja2V0LWhhbmRzaGFraW5nLiAgRnVydGhlcm1vcmUsXG4gICAgLy8gYnkgc2V0dGluZyBgdXNlR2xvYmFsYCBiYWNrIHRvIHRydWUsIHdlIGFsbG93IHRoZSBkZWZhdWx0IGV2YWwgZnVuY3Rpb25cbiAgICAvLyB0byB1c2UgdGhlIGRlc2lyZWQgYHJ1bkluVGhpc0NvbnRleHRgIG1ldGhvZCAoaHR0cHM6Ly9naXQuaW8vdmJ2QUIpLlxuICAgIHJlcGwuY29udGV4dCA9IGdsb2JhbDtcbiAgICByZXBsLnVzZUdsb2JhbCA9IHRydWU7XG5cbiAgICBzZXRSZXF1aXJlQW5kTW9kdWxlKHJlcGwuY29udGV4dCk7XG5cbiAgICAvLyBJbiBvcmRlciB0byBhdm9pZCBkdXBsaWNhdGluZyBjb2RlIGhlcmUsIHNwZWNpZmljYWxseSB0aGUgY29tcGxleGl0aWVzXG4gICAgLy8gb2YgY2F0Y2hpbmcgc28tY2FsbGVkIFwiUmVjb3ZlcmFibGUgRXJyb3JzXCIgKGh0dHBzOi8vZ2l0LmlvL3ZidmJsKSxcbiAgICAvLyB3ZSB3aWxsIHdyYXAgdGhlIGRlZmF1bHQgZXZhbCwgcnVuIGl0IGluIGEgRmliZXIgKHZpYSBhIFByb21pc2UpLCBhbmRcbiAgICAvLyBnaXZlIGl0IHRoZSBvcHBvcnR1bml0eSB0byBkZWNpZGUgaWYgdGhlIHVzZXIgaXMgbWlkLWNvZGUtYmxvY2suXG4gICAgY29uc3QgZGVmYXVsdEV2YWwgPSByZXBsLmV2YWw7XG5cbiAgICBmdW5jdGlvbiB3cmFwcGVkRGVmYXVsdEV2YWwoY29kZSwgY29udGV4dCwgZmlsZSwgY2FsbGJhY2spIHtcbiAgICAgIGlmIChQYWNrYWdlLmVjbWFzY3JpcHQpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb2RlID0gUGFja2FnZS5lY21hc2NyaXB0LkVDTUFTY3JpcHQuY29tcGlsZUZvclNoZWxsKGNvZGUsIHtcbiAgICAgICAgICAgIGNhY2hlRGlyZWN0b3J5OiBnZXRDYWNoZURpcmVjdG9yeShzaGVsbERpcilcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgLy8gQW55IEJhYmVsIGVycm9yIGhlcmUgbWlnaHQgYmUganVzdCBmaW5lIHNpbmNlIGl0J3NcbiAgICAgICAgICAvLyBwb3NzaWJsZSB0aGUgY29kZSB3YXMgaW5jb21wbGV0ZSAobXVsdGktbGluZSBjb2RlIG9uIHRoZSBSRVBMKS5cbiAgICAgICAgICAvLyBUaGUgZGVmYXVsdEV2YWwgYmVsb3cgd2lsbCB1c2UgaXRzIG93biBmdW5jdGlvbmFsaXR5IHRvIGRldGVybWluZVxuICAgICAgICAgIC8vIGlmIHRoaXMgZXJyb3IgaXMgXCJyZWNvdmVyYWJsZVwiLlxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGV2YWxDb21tYW5kUHJvbWlzZVxuICAgICAgICAudGhlbigoKSA9PiBkZWZhdWx0RXZhbChjb2RlLCBjb250ZXh0LCBmaWxlLCBjYWxsYmFjaykpXG4gICAgICAgIC5jYXRjaChjYWxsYmFjayk7XG4gICAgfVxuXG4gICAgLy8gSGF2ZSB0aGUgUkVQTCB1c2UgdGhlIG5ld2x5IHdyYXBwZWQgZnVuY3Rpb24gaW5zdGVhZCBhbmQgc3RvcmUgdGhlXG4gICAgLy8gX3dyYXBwZWREZWZhdWx0RXZhbCBzbyB0aGF0IGV2YWx1bGF0ZUFuZEV4aXQgY2FsbHMgY2FuIHVzZSBpdCBkaXJlY3RseS5cbiAgICByZXBsLmV2YWwgPSB0aGlzLl93cmFwcGVkRGVmYXVsdEV2YWwgPSB3cmFwcGVkRGVmYXVsdEV2YWw7XG4gIH1cblxuICBlbmFibGVJbnRlcmFjdGl2ZU1vZGUob3B0aW9ucykge1xuICAgIC8vIEhpc3RvcnkgcGVyc2lzdHMgYWNyb3NzIHNoZWxsIHNlc3Npb25zIVxuICAgIHRoaXMuaW5pdGlhbGl6ZUhpc3RvcnkoKTtcblxuICAgIGNvbnN0IHJlcGwgPSB0aGlzLnJlcGw7XG5cbiAgICAvLyBJbXBsZW1lbnQgYW4gYWx0ZXJuYXRlIG1lYW5zIG9mIGZldGNoaW5nIHRoZSByZXR1cm4gdmFsdWUsXG4gICAgLy8gdmlhIGBfX2AgKGRvdWJsZSB1bmRlcnNjb3JlKSBhcyBvcmlnaW5hbGx5IGltcGxlbWVudGVkIGluOlxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9tZXRlb3IvbWV0ZW9yL2NvbW1pdC8yNDQzZDgzMjI2NWM3ZDFjXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHJlcGwuY29udGV4dCwgXCJfX1wiLCB7XG4gICAgICBnZXQ6ICgpID0+IHJlcGwubGFzdCxcbiAgICAgIHNldDogKHZhbCkgPT4ge1xuICAgICAgICByZXBsLmxhc3QgPSB2YWw7XG4gICAgICB9LFxuXG4gICAgICAvLyBBbGxvdyB0aGlzIHByb3BlcnR5IHRvIGJlIChyZSlkZWZpbmVkIG1vcmUgdGhhbiBvbmNlIChlLmcuIGVhY2hcbiAgICAgIC8vIHRpbWUgdGhlIHNlcnZlciByZXN0YXJ0cykuXG4gICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICB9KTtcblxuICAgIC8vIFNvbWUgaW1wcm92ZW1lbnRzIHRvIHRoZSBleGlzdGluZyBoZWxwIG1lc3NhZ2VzLlxuICAgIGZ1bmN0aW9uIGFkZEhlbHAoY21kLCBoZWxwVGV4dCkge1xuICAgICAgY29uc3QgaW5mbyA9IHJlcGwuY29tbWFuZHNbY21kXSB8fCByZXBsLmNvbW1hbmRzW1wiLlwiICsgY21kXTtcbiAgICAgIGlmIChpbmZvKSB7XG4gICAgICAgIGluZm8uaGVscCA9IGhlbHBUZXh0O1xuICAgICAgfVxuICAgIH1cbiAgICBhZGRIZWxwKFwiYnJlYWtcIiwgXCJUZXJtaW5hdGUgY3VycmVudCBjb21tYW5kIGlucHV0IGFuZCBkaXNwbGF5IG5ldyBwcm9tcHRcIik7XG4gICAgYWRkSGVscChcImV4aXRcIiwgXCJEaXNjb25uZWN0IGZyb20gc2VydmVyIGFuZCBsZWF2ZSBzaGVsbFwiKTtcbiAgICBhZGRIZWxwKFwiaGVscFwiLCBcIlNob3cgdGhpcyBoZWxwIGluZm9ybWF0aW9uXCIpO1xuXG4gICAgLy8gV2hlbiB0aGUgUkVQTCBleGl0cywgc2lnbmFsIHRoZSBhdHRhY2hlZCBjbGllbnQgdG8gZXhpdCBieSBzZW5kaW5nIGl0XG4gICAgLy8gdGhlIHNwZWNpYWwgRVhJVElOR19NRVNTQUdFLlxuICAgIHJlcGwub24oXCJleGl0XCIsIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKG9wdGlvbnMub3V0cHV0KSB7XG4gICAgICAgIG9wdGlvbnMub3V0cHV0LndyaXRlKEVYSVRJTkdfTUVTU0FHRSArIFwiXFxuXCIpO1xuICAgICAgICBvcHRpb25zLm91dHB1dC5lbmQoKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIFdoZW4gdGhlIHNlcnZlciBwcm9jZXNzIGV4aXRzLCBlbmQgdGhlIG91dHB1dCBzdHJlYW0gYnV0IGRvIG5vdFxuICAgIC8vIHNpZ25hbCB0aGUgYXR0YWNoZWQgY2xpZW50IHRvIGV4aXQuXG4gICAgcHJvY2Vzcy5vbihcImV4aXRcIiwgZnVuY3Rpb24oKSB7XG4gICAgICBpZiAob3B0aW9ucy5vdXRwdXQpIHtcbiAgICAgICAgb3B0aW9ucy5vdXRwdXQuZW5kKCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBUaGlzIE1ldGVvci1zcGVjaWZpYyBzaGVsbCBjb21tYW5kIHJlYnVpbGRzIHRoZSBhcHBsaWNhdGlvbiBhcyBpZiBhXG4gICAgLy8gY2hhbmdlIHdhcyBtYWRlIHRvIHNlcnZlciBjb2RlLlxuICAgIHJlcGwuZGVmaW5lQ29tbWFuZChcInJlbG9hZFwiLCB7XG4gICAgICBoZWxwOiBcIlJlc3RhcnQgdGhlIHNlcnZlciBhbmQgdGhlIHNoZWxsXCIsXG4gICAgICBhY3Rpb246IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAocHJvY2Vzcy5zZW5kTWVzc2FnZSkge1xuICAgICAgICAgIHByb2Nlc3Muc2VuZE1lc3NhZ2UoXCJzaGVsbC1zZXJ2ZXJcIiwgeyBjb21tYW5kOiBcInJlbG9hZFwiIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHByb2Nlc3MuZXhpdCgwKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLy8gVGhpcyBmdW5jdGlvbiBhbGxvd3MgYSBwZXJzaXN0ZW50IGhpc3Rvcnkgb2Ygc2hlbGwgY29tbWFuZHMgdG8gYmUgc2F2ZWRcbiAgLy8gdG8gYW5kIGxvYWRlZCBmcm9tIC5tZXRlb3IvbG9jYWwvc2hlbGwvaGlzdG9yeS5cbiAgaW5pdGlhbGl6ZUhpc3RvcnkoKSB7XG4gICAgY29uc3QgcmVwbCA9IHRoaXMucmVwbDtcbiAgICBjb25zdCBoaXN0b3J5RmlsZSA9IGdldEhpc3RvcnlGaWxlKHRoaXMuc2hlbGxEaXIpO1xuICAgIGxldCBoaXN0b3J5RmQgPSBvcGVuU3luYyhoaXN0b3J5RmlsZSwgXCJhK1wiKTtcbiAgICBjb25zdCBoaXN0b3J5TGluZXMgPSByZWFkRmlsZVN5bmMoaGlzdG9yeUZpbGUsIFwidXRmOFwiKS5zcGxpdChcIlxcblwiKTtcbiAgICBjb25zdCBzZWVuTGluZXMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gICAgaWYgKCEgcmVwbC5oaXN0b3J5KSB7XG4gICAgICByZXBsLmhpc3RvcnkgPSBbXTtcbiAgICAgIHJlcGwuaGlzdG9yeUluZGV4ID0gLTE7XG4gICAgfVxuXG4gICAgd2hpbGUgKHJlcGwuaGlzdG9yeSAmJiBoaXN0b3J5TGluZXMubGVuZ3RoID4gMCkge1xuICAgICAgY29uc3QgbGluZSA9IGhpc3RvcnlMaW5lcy5wb3AoKTtcbiAgICAgIGlmIChsaW5lICYmIC9cXFMvLnRlc3QobGluZSkgJiYgISBzZWVuTGluZXNbbGluZV0pIHtcbiAgICAgICAgcmVwbC5oaXN0b3J5LnB1c2gobGluZSk7XG4gICAgICAgIHNlZW5MaW5lc1tsaW5lXSA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmVwbC5hZGRMaXN0ZW5lcihcImxpbmVcIiwgZnVuY3Rpb24obGluZSkge1xuICAgICAgaWYgKGhpc3RvcnlGZCA+PSAwICYmIC9cXFMvLnRlc3QobGluZSkpIHtcbiAgICAgICAgd3JpdGVTeW5jKGhpc3RvcnlGZCwgbGluZSArIFwiXFxuXCIpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgdGhpcy5yZXBsLm9uKFwiZXhpdFwiLCBmdW5jdGlvbigpIHtcbiAgICAgIGNsb3NlU3luYyhoaXN0b3J5RmQpO1xuICAgICAgaGlzdG9yeUZkID0gLTE7XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVhZEpTT05Gcm9tU3RyZWFtKGlucHV0U3RyZWFtLCBjYWxsYmFjaykge1xuICBjb25zdCBvdXRwdXRTdHJlYW0gPSBuZXcgUGFzc1Rocm91Z2goKTtcbiAgbGV0IGRhdGFTb0ZhciA9IFwiXCI7XG5cbiAgZnVuY3Rpb24gb25EYXRhKGJ1ZmZlcikge1xuICAgIGNvbnN0IGxpbmVzID0gYnVmZmVyLnRvU3RyaW5nKFwidXRmOFwiKS5zcGxpdChcIlxcblwiKTtcblxuICAgIHdoaWxlIChsaW5lcy5sZW5ndGggPiAwKSB7XG4gICAgICBkYXRhU29GYXIgKz0gbGluZXMuc2hpZnQoKTtcblxuICAgICAgbGV0IGpzb247XG4gICAgICB0cnkge1xuICAgICAgICBqc29uID0gSlNPTi5wYXJzZShkYXRhU29GYXIpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgU3ludGF4RXJyb3IpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmaW5pc2goZXJyb3IpO1xuICAgICAgfVxuXG4gICAgICBpZiAobGluZXMubGVuZ3RoID4gMCkge1xuICAgICAgICBvdXRwdXRTdHJlYW0ud3JpdGUobGluZXMuam9pbihcIlxcblwiKSk7XG4gICAgICB9XG5cbiAgICAgIGlucHV0U3RyZWFtLnBpcGUob3V0cHV0U3RyZWFtKTtcblxuICAgICAgcmV0dXJuIGZpbmlzaChudWxsLCBqc29uKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBvbkNsb3NlKCkge1xuICAgIGZpbmlzaChuZXcgRXJyb3IoXCJzdHJlYW0gdW5leHBlY3RlZGx5IGNsb3NlZFwiKSk7XG4gIH1cblxuICBsZXQgZmluaXNoZWQgPSBmYWxzZTtcbiAgZnVuY3Rpb24gZmluaXNoKGVycm9yLCBqc29uKSB7XG4gICAgaWYgKCEgZmluaXNoZWQpIHtcbiAgICAgIGZpbmlzaGVkID0gdHJ1ZTtcbiAgICAgIGlucHV0U3RyZWFtLnJlbW92ZUxpc3RlbmVyKFwiZGF0YVwiLCBvbkRhdGEpO1xuICAgICAgaW5wdXRTdHJlYW0ucmVtb3ZlTGlzdGVuZXIoXCJlcnJvclwiLCBmaW5pc2gpO1xuICAgICAgaW5wdXRTdHJlYW0ucmVtb3ZlTGlzdGVuZXIoXCJjbG9zZVwiLCBvbkNsb3NlKTtcbiAgICAgIGNhbGxiYWNrKGVycm9yLCBqc29uLCBvdXRwdXRTdHJlYW0pO1xuICAgIH1cbiAgfVxuXG4gIGlucHV0U3RyZWFtLm9uKFwiZGF0YVwiLCBvbkRhdGEpO1xuICBpbnB1dFN0cmVhbS5vbihcImVycm9yXCIsIGZpbmlzaCk7XG4gIGlucHV0U3RyZWFtLm9uKFwiY2xvc2VcIiwgb25DbG9zZSk7XG59XG5cbmZ1bmN0aW9uIGdldEluZm9GaWxlKHNoZWxsRGlyKSB7XG4gIHJldHVybiBwYXRoSm9pbihzaGVsbERpciwgXCJpbmZvLmpzb25cIik7XG59XG5cbmZ1bmN0aW9uIGdldEhpc3RvcnlGaWxlKHNoZWxsRGlyKSB7XG4gIHJldHVybiBwYXRoSm9pbihzaGVsbERpciwgXCJoaXN0b3J5XCIpO1xufVxuXG5mdW5jdGlvbiBnZXRDYWNoZURpcmVjdG9yeShzaGVsbERpcikge1xuICByZXR1cm4gcGF0aEpvaW4oc2hlbGxEaXIsIFwiY2FjaGVcIik7XG59XG5cbmZ1bmN0aW9uIHNldFJlcXVpcmVBbmRNb2R1bGUoY29udGV4dCkge1xuICBpZiAoUGFja2FnZS5tb2R1bGVzKSB7XG4gICAgLy8gVXNlIHRoZSBzYW1lIGByZXF1aXJlYCBmdW5jdGlvbiBhbmQgYG1vZHVsZWAgb2JqZWN0IHZpc2libGUgdG8gdGhlXG4gICAgLy8gYXBwbGljYXRpb24uXG4gICAgY29uc3QgdG9CZUluc3RhbGxlZCA9IHt9O1xuICAgIGNvbnN0IHNoZWxsTW9kdWxlTmFtZSA9IFwibWV0ZW9yLXNoZWxsLVwiICtcbiAgICAgIE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnNsaWNlKDIpICsgXCIuanNcIjtcblxuICAgIHRvQmVJbnN0YWxsZWRbc2hlbGxNb2R1bGVOYW1lXSA9IGZ1bmN0aW9uIChyZXF1aXJlLCBleHBvcnRzLCBtb2R1bGUpIHtcbiAgICAgIGNvbnRleHQubW9kdWxlID0gbW9kdWxlO1xuICAgICAgY29udGV4dC5yZXF1aXJlID0gcmVxdWlyZTtcblxuICAgICAgLy8gVGFiIGNvbXBsZXRpb24gc29tZXRpbWVzIHVzZXMgcmVxdWlyZS5leHRlbnNpb25zLCBidXQgb25seSBmb3JcbiAgICAgIC8vIHRoZSBrZXlzLlxuICAgICAgcmVxdWlyZS5leHRlbnNpb25zID0ge1xuICAgICAgICBcIi5qc1wiOiB0cnVlLFxuICAgICAgICBcIi5qc29uXCI6IHRydWUsXG4gICAgICAgIFwiLm5vZGVcIjogdHJ1ZSxcbiAgICAgIH07XG4gICAgfTtcblxuICAgIC8vIFRoaXMgcG9wdWxhdGVzIHJlcGwuY29udGV4dC57bW9kdWxlLHJlcXVpcmV9IGJ5IGV2YWx1YXRpbmcgdGhlXG4gICAgLy8gbW9kdWxlIGRlZmluZWQgYWJvdmUuXG4gICAgUGFja2FnZS5tb2R1bGVzLm1ldGVvckluc3RhbGwodG9CZUluc3RhbGxlZCkoXCIuL1wiICsgc2hlbGxNb2R1bGVOYW1lKTtcbiAgfVxufVxuIl19
