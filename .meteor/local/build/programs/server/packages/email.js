(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var Log = Package.logging.Log;
var Hook = Package['callback-hook'].Hook;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var Email, EmailInternals, EmailTest;

var require = meteorInstall({"node_modules":{"meteor":{"email":{"email.js":function module(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/email/email.js                                                                                          //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
!function (module1) {
  let _objectSpread;
  module1.link("@babel/runtime/helpers/objectSpread2", {
    default(v) {
      _objectSpread = v;
    }
  }, 0);
  module1.export({
    Email: () => Email,
    EmailTest: () => EmailTest,
    EmailInternals: () => EmailInternals
  });
  let Meteor;
  module1.link("meteor/meteor", {
    Meteor(v) {
      Meteor = v;
    }
  }, 0);
  let Log;
  module1.link("meteor/logging", {
    Log(v) {
      Log = v;
    }
  }, 1);
  let Hook;
  module1.link("meteor/callback-hook", {
    Hook(v) {
      Hook = v;
    }
  }, 2);
  let url;
  module1.link("url", {
    default(v) {
      url = v;
    }
  }, 3);
  let nodemailer;
  module1.link("nodemailer", {
    default(v) {
      nodemailer = v;
    }
  }, 4);
  let wellKnow;
  module1.link("nodemailer/lib/well-known", {
    default(v) {
      wellKnow = v;
    }
  }, 5);
  const Email = {};
  const EmailTest = {};
  const EmailInternals = {
    NpmModules: {
      mailcomposer: {
        version: Npm.require('nodemailer/package.json').version,
        module: Npm.require('nodemailer/lib/mail-composer')
      },
      nodemailer: {
        version: Npm.require('nodemailer/package.json').version,
        module: Npm.require('nodemailer')
      }
    }
  };
  const MailComposer = EmailInternals.NpmModules.mailcomposer.module;
  const makeTransport = function (mailUrlString) {
    const mailUrl = new URL(mailUrlString);
    if (mailUrl.protocol !== 'smtp:' && mailUrl.protocol !== 'smtps:') {
      throw new Error('Email protocol in $MAIL_URL (' + mailUrlString + ") must be 'smtp' or 'smtps'");
    }
    if (mailUrl.protocol === 'smtp:' && mailUrl.port === '465') {
      Log.debug("The $MAIL_URL is 'smtp://...:465'.  " + "You probably want 'smtps://' (The 's' enables TLS/SSL) " + "since '465' is typically a secure port.");
    }

    // Allow overriding pool setting, but default to true.
    if (!mailUrl.query) {
      mailUrl.query = {};
    }
    if (!mailUrl.query.pool) {
      mailUrl.query.pool = 'true';
    }
    const transport = nodemailer.createTransport(url.format(mailUrl));
    transport._syncSendMail = Meteor.wrapAsync(transport.sendMail, transport);
    return transport;
  };

  // More info: https://nodemailer.com/smtp/well-known/
  const knownHostsTransport = function () {
    let settings = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : undefined;
    let url = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : undefined;
    let service, user, password;
    const hasSettings = settings && Object.keys(settings).length;
    if (url && !hasSettings) {
      let host = url.split(':')[0];
      const urlObject = new URL(url);
      if (host === 'http' || host === 'https') {
        // Look to hostname for service
        host = urlObject.hostname;
        user = urlObject.username;
        password = urlObject.password;
      } else if (urlObject.protocol && urlObject.username && urlObject.password) {
        // We have some data from urlObject
        host = urlObject.protocol.split(':')[0];
        user = urlObject.username;
        password = urlObject.password;
      } else {
        var _urlObject$pathname$s;
        // We need to disect the URL ourselves to get the data
        // First get rid of the leading '//' and split to username and the rest
        const temp = (_urlObject$pathname$s = urlObject.pathname.substring(2)) === null || _urlObject$pathname$s === void 0 ? void 0 : _urlObject$pathname$s.split(':');
        user = temp[0];
        // Now we split by '@' to get password and hostname
        const temp2 = temp[1].split('@');
        password = temp2[0];
        host = temp2[1];
      }
      service = host;
    }
    if (!wellKnow((settings === null || settings === void 0 ? void 0 : settings.service) || service)) {
      throw new Error('Could not recognize e-mail service. See list at https://nodemailer.com/smtp/well-known/ for services that we can configure for you.');
    }
    const transport = nodemailer.createTransport({
      service: (settings === null || settings === void 0 ? void 0 : settings.service) || service,
      auth: {
        user: (settings === null || settings === void 0 ? void 0 : settings.user) || user,
        pass: (settings === null || settings === void 0 ? void 0 : settings.password) || password
      }
    });
    transport._syncSendMail = Meteor.wrapAsync(transport.sendMail, transport);
    return transport;
  };
  EmailTest.knowHostsTransport = knownHostsTransport;
  const getTransport = function () {
    var _Meteor$settings$pack;
    const packageSettings = ((_Meteor$settings$pack = Meteor.settings.packages) === null || _Meteor$settings$pack === void 0 ? void 0 : _Meteor$settings$pack.email) || {};
    // We delay this check until the first call to Email.send, in case someone
    // set process.env.MAIL_URL in startup code. Then we store in a cache until
    // process.env.MAIL_URL changes.
    const url = process.env.MAIL_URL;
    if (this.cacheKey === undefined || this.cacheKey !== url || this.cacheKey !== packageSettings.service || this.cacheKey !== 'settings') {
      if (packageSettings.service && wellKnow(packageSettings.service) || url && wellKnow(new URL(url).hostname) || wellKnow((url === null || url === void 0 ? void 0 : url.split(':')[0]) || '')) {
        this.cacheKey = packageSettings.service || 'settings';
        this.cache = knownHostsTransport(packageSettings, url);
      } else {
        this.cacheKey = url;
        this.cache = url ? makeTransport(url, packageSettings) : null;
      }
    }
    return this.cache;
  };
  let nextDevModeMailId = 0;
  EmailTest._getAndIncNextDevModeMailId = function () {
    return nextDevModeMailId++;
  };

  // Testing hooks
  EmailTest.resetNextDevModeMailId = function () {
    nextDevModeMailId = 0;
  };
  const devModeSendAsync = function (mail, options) {
    const stream = (options === null || options === void 0 ? void 0 : options.stream) || process.stdout;
    return new Promise((resolve, reject) => {
      let devModeMailId = EmailTest._getAndIncNextDevModeMailId();

      // This approach does not prevent other writers to stdout from interleaving.
      const output = ['====== BEGIN MAIL #' + devModeMailId + ' ======\n'];
      output.push('(Mail not sent; to enable sending, set the MAIL_URL ' + 'environment variable.)\n');
      const readStream = new MailComposer(mail).compile().createReadStream();
      readStream.on('data', buffer => {
        output.push(buffer.toString());
      });
      readStream.on('end', function () {
        output.push('====== END MAIL #' + devModeMailId + ' ======\n');
        stream.write(output.join(''), () => resolve());
      });
      readStream.on('error', err => reject(err));
    });
  };
  const smtpSend = function (transport, mail) {
    transport._syncSendMail(mail);
  };
  const sendHooks = new Hook();

  /**
   * @summary Hook that runs before email is sent.
   * @locus Server
   *
   * @param f {function} receives the arguments to Email.send and should return true to go
   * ahead and send the email (or at least, try subsequent hooks), or
   * false to skip sending.
   * @returns {{ stop: function, callback: function }}
   */
  Email.hookSend = function (f) {
    return sendHooks.register(f);
  };

  /**
   * @summary Overrides sending function with your own.
   * @locus Server
   * @since 2.2
   * @param f {function} function that will receive options from the send function and under `packageSettings` will
   * include the package settings from Meteor.settings.packages.email for your custom transport to access.
   */
  Email.customTransport = undefined;

  /**
   * @summary Send an email. Throws an `Error` on failure to contact mail server
   * or if mail server returns an error. All fields should match
   * [RFC5322](http://tools.ietf.org/html/rfc5322) specification.
   *
   * If the `MAIL_URL` environment variable is set, actually sends the email.
   * Otherwise, prints the contents of the email to standard out.
   *
   * Note that this package is based on **nodemailer**, so make sure to refer to
   * [the documentation](http://nodemailer.com/)
   * when using the `attachments` or `mailComposer` options.
   *
   * @locus Server
   * @param {Object} options
   * @param {String} [options.from] "From:" address (required)
   * @param {String|String[]} options.to,cc,bcc,replyTo
   *   "To:", "Cc:", "Bcc:", and "Reply-To:" addresses
   * @param {String} [options.inReplyTo] Message-ID this message is replying to
   * @param {String|String[]} [options.references] Array (or space-separated string) of Message-IDs to refer to
   * @param {String} [options.messageId] Message-ID for this message; otherwise, will be set to a random value
   * @param {String} [options.subject]  "Subject:" line
   * @param {String} [options.text|html] Mail body (in plain text and/or HTML)
   * @param {String} [options.watchHtml] Mail body in HTML specific for Apple Watch
   * @param {String} [options.icalEvent] iCalendar event attachment
   * @param {Object} [options.headers] Dictionary of custom headers - e.g. `{ "header name": "header value" }`. To set an object under a header name, use `JSON.stringify` - e.g. `{ "header name": JSON.stringify({ tracking: { level: 'full' } }) }`.
   * @param {Object[]} [options.attachments] Array of attachment objects, as
   * described in the [nodemailer documentation](https://nodemailer.com/message/attachments/).
   * @param {MailComposer} [options.mailComposer] A [MailComposer](https://nodemailer.com/extras/mailcomposer/#e-mail-message-fields)
   * object representing the message to be sent.  Overrides all other options.
   * You can create a `MailComposer` object via
   * `new EmailInternals.NpmModules.mailcomposer.module`.
   */
  Email.send = function (options) {
    if (Email.customTransport) {
      var _Meteor$settings$pack2;
      // Preserve current behavior
      const email = options.mailComposer ? options.mailComposer.mail : options;
      let send = true;
      sendHooks.forEach(hook => {
        send = hook(email);
        return send;
      });
      if (!send) {
        return;
      }
      const packageSettings = ((_Meteor$settings$pack2 = Meteor.settings.packages) === null || _Meteor$settings$pack2 === void 0 ? void 0 : _Meteor$settings$pack2.email) || {};
      Email.customTransport(_objectSpread({
        packageSettings
      }, email));
      return;
    }
    // Using Fibers Promise.await
    return Promise.await(Email.sendAsync(options));
  };

  /**
   * @summary Send an email with asyncronous method. Capture  Throws an `Error` on failure to contact mail server
   * or if mail server returns an error. All fields should match
   * [RFC5322](http://tools.ietf.org/html/rfc5322) specification.
   *
   * If the `MAIL_URL` environment variable is set, actually sends the email.
   * Otherwise, prints the contents of the email to standard out.
   *
   * Note that this package is based on **nodemailer**, so make sure to refer to
   * [the documentation](http://nodemailer.com/)
   * when using the `attachments` or `mailComposer` options.
   *
   * @locus Server
   * @return {Promise}
   * @param {Object} options
   * @param {String} [options.from] "From:" address (required)
   * @param {String|String[]} options.to,cc,bcc,replyTo
   *   "To:", "Cc:", "Bcc:", and "Reply-To:" addresses
   * @param {String} [options.inReplyTo] Message-ID this message is replying to
   * @param {String|String[]} [options.references] Array (or space-separated string) of Message-IDs to refer to
   * @param {String} [options.messageId] Message-ID for this message; otherwise, will be set to a random value
   * @param {String} [options.subject]  "Subject:" line
   * @param {String} [options.text|html] Mail body (in plain text and/or HTML)
   * @param {String} [options.watchHtml] Mail body in HTML specific for Apple Watch
   * @param {String} [options.icalEvent] iCalendar event attachment
   * @param {Object} [options.headers] Dictionary of custom headers - e.g. `{ "header name": "header value" }`. To set an object under a header name, use `JSON.stringify` - e.g. `{ "header name": JSON.stringify({ tracking: { level: 'full' } }) }`.
   * @param {Object[]} [options.attachments] Array of attachment objects, as
   * described in the [nodemailer documentation](https://nodemailer.com/message/attachments/).
   * @param {MailComposer} [options.mailComposer] A [MailComposer](https://nodemailer.com/extras/mailcomposer/#e-mail-message-fields)
   * object representing the message to be sent.  Overrides all other options.
   * You can create a `MailComposer` object via
   * `new EmailInternals.NpmModules.mailcomposer.module`.
   */
  Email.sendAsync = function (options) {
    return Promise.asyncApply(() => {
      var _Meteor$settings$pack4;
      const email = options.mailComposer ? options.mailComposer.mail : options;
      let send = true;
      sendHooks.forEach(hook => {
        send = hook(email);
        return send;
      });
      if (!send) {
        return;
      }
      if (Email.customTransport) {
        var _Meteor$settings$pack3;
        const packageSettings = ((_Meteor$settings$pack3 = Meteor.settings.packages) === null || _Meteor$settings$pack3 === void 0 ? void 0 : _Meteor$settings$pack3.email) || {};
        return Email.customTransport(_objectSpread({
          packageSettings
        }, email));
      }
      const mailUrlEnv = process.env.MAIL_URL;
      const mailUrlSettings = (_Meteor$settings$pack4 = Meteor.settings.packages) === null || _Meteor$settings$pack4 === void 0 ? void 0 : _Meteor$settings$pack4.email;
      if (Meteor.isProduction && !mailUrlEnv && !mailUrlSettings) {
        // This check is mostly necessary when using the flag --production when running locally.
        // And it works as a reminder to properly set the mail URL when running locally.
        throw new Error('You have not provided a mail URL. You can provide it by using the environment variable MAIL_URL or your settings. You can read more about it here: https://docs.meteor.com/api/email.html.');
      }
      if (mailUrlEnv || mailUrlSettings) {
        const transport = getTransport();
        smtpSend(transport, email);
        return;
      }
      return devModeSendAsync(email, options);
    });
  };
}.call(this, module);
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"node_modules":{"nodemailer":{"package.json":function module(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// node_modules/meteor/email/node_modules/nodemailer/package.json                                                   //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.exports = {
  "name": "nodemailer",
  "version": "6.6.3",
  "main": "lib/nodemailer.js"
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"lib":{"nodemailer.js":function module(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// node_modules/meteor/email/node_modules/nodemailer/lib/nodemailer.js                                              //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.useNode();
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"well-known":{"index.js":function module(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// node_modules/meteor/email/node_modules/nodemailer/lib/well-known/index.js                                        //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.useNode();
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

var exports = require("/node_modules/meteor/email/email.js");

/* Exports */
Package._define("email", exports, {
  Email: Email,
  EmailInternals: EmailInternals,
  EmailTest: EmailTest
});

})();

//# sourceURL=meteor://💻app/packages/email.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvZW1haWwvZW1haWwuanMiXSwibmFtZXMiOlsiX29iamVjdFNwcmVhZCIsIm1vZHVsZTEiLCJsaW5rIiwiZGVmYXVsdCIsInYiLCJleHBvcnQiLCJFbWFpbCIsIkVtYWlsVGVzdCIsIkVtYWlsSW50ZXJuYWxzIiwiTWV0ZW9yIiwiTG9nIiwiSG9vayIsInVybCIsIm5vZGVtYWlsZXIiLCJ3ZWxsS25vdyIsIk5wbU1vZHVsZXMiLCJtYWlsY29tcG9zZXIiLCJ2ZXJzaW9uIiwiTnBtIiwicmVxdWlyZSIsIm1vZHVsZSIsIk1haWxDb21wb3NlciIsIm1ha2VUcmFuc3BvcnQiLCJtYWlsVXJsU3RyaW5nIiwibWFpbFVybCIsIlVSTCIsInByb3RvY29sIiwiRXJyb3IiLCJwb3J0IiwiZGVidWciLCJxdWVyeSIsInBvb2wiLCJ0cmFuc3BvcnQiLCJjcmVhdGVUcmFuc3BvcnQiLCJmb3JtYXQiLCJfc3luY1NlbmRNYWlsIiwid3JhcEFzeW5jIiwic2VuZE1haWwiLCJrbm93bkhvc3RzVHJhbnNwb3J0Iiwic2V0dGluZ3MiLCJhcmd1bWVudHMiLCJsZW5ndGgiLCJ1bmRlZmluZWQiLCJzZXJ2aWNlIiwidXNlciIsInBhc3N3b3JkIiwiaGFzU2V0dGluZ3MiLCJPYmplY3QiLCJrZXlzIiwiaG9zdCIsInNwbGl0IiwidXJsT2JqZWN0IiwiaG9zdG5hbWUiLCJ1c2VybmFtZSIsIl91cmxPYmplY3QkcGF0aG5hbWUkcyIsInRlbXAiLCJwYXRobmFtZSIsInN1YnN0cmluZyIsInRlbXAyIiwiYXV0aCIsInBhc3MiLCJrbm93SG9zdHNUcmFuc3BvcnQiLCJnZXRUcmFuc3BvcnQiLCJfTWV0ZW9yJHNldHRpbmdzJHBhY2siLCJwYWNrYWdlU2V0dGluZ3MiLCJwYWNrYWdlcyIsImVtYWlsIiwicHJvY2VzcyIsImVudiIsIk1BSUxfVVJMIiwiY2FjaGVLZXkiLCJjYWNoZSIsIm5leHREZXZNb2RlTWFpbElkIiwiX2dldEFuZEluY05leHREZXZNb2RlTWFpbElkIiwicmVzZXROZXh0RGV2TW9kZU1haWxJZCIsImRldk1vZGVTZW5kQXN5bmMiLCJtYWlsIiwib3B0aW9ucyIsInN0cmVhbSIsInN0ZG91dCIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwiZGV2TW9kZU1haWxJZCIsIm91dHB1dCIsInB1c2giLCJyZWFkU3RyZWFtIiwiY29tcGlsZSIsImNyZWF0ZVJlYWRTdHJlYW0iLCJvbiIsImJ1ZmZlciIsInRvU3RyaW5nIiwid3JpdGUiLCJqb2luIiwiZXJyIiwic210cFNlbmQiLCJzZW5kSG9va3MiLCJob29rU2VuZCIsImYiLCJyZWdpc3RlciIsImN1c3RvbVRyYW5zcG9ydCIsInNlbmQiLCJfTWV0ZW9yJHNldHRpbmdzJHBhY2syIiwibWFpbENvbXBvc2VyIiwiZm9yRWFjaCIsImhvb2siLCJhd2FpdCIsInNlbmRBc3luYyIsImFzeW5jQXBwbHkiLCJfTWV0ZW9yJHNldHRpbmdzJHBhY2s0IiwiX01ldGVvciRzZXR0aW5ncyRwYWNrMyIsIm1haWxVcmxFbnYiLCJtYWlsVXJsU2V0dGluZ3MiLCJpc1Byb2R1Y3Rpb24iLCJjYWxsIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7RUFBQSxJQUFJQSxhQUFhO0VBQUNDLE9BQU8sQ0FBQ0MsSUFBSSxDQUFDLHNDQUFzQyxFQUFDO0lBQUNDLE9BQU9BLENBQUNDLENBQUMsRUFBQztNQUFDSixhQUFhLEdBQUNJLENBQUM7SUFBQTtFQUFDLENBQUMsRUFBQyxDQUFDLENBQUM7RUFBdEdILE9BQU8sQ0FBQ0ksTUFBTSxDQUFDO0lBQUNDLEtBQUssRUFBQ0EsQ0FBQSxLQUFJQSxLQUFLO0lBQUNDLFNBQVMsRUFBQ0EsQ0FBQSxLQUFJQSxTQUFTO0lBQUNDLGNBQWMsRUFBQ0EsQ0FBQSxLQUFJQTtFQUFjLENBQUMsQ0FBQztFQUFDLElBQUlDLE1BQU07RUFBQ1IsT0FBTyxDQUFDQyxJQUFJLENBQUMsZUFBZSxFQUFDO0lBQUNPLE1BQU1BLENBQUNMLENBQUMsRUFB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SUFBSW9GLFVBQVUsSUFBSUMsZUFBZSxFQUFFO1FBQ2pDLE1BQU1oRixTQUFTLEdBQUc4QixZQUFZLENBQUMsQ0FBQztRQUNoQ2lDLFFBQVEsQ0FBQy9ELFNBQVMsRUFBRWtDLEtBQUssQ0FBQztRQUMxQjtNQUNGO01BQ0EsT0FBT1MsZ0JBQWdCLENBQUNULEtBQUssRUFBRVcsT0FBTyxDQUFDO0lBQ3pDLENBQUM7RUFBQTtBQUFDLEVBQUFxQyxJQUFBLE9BQUE5RixNQUFBLEUiLCJmaWxlIjoiL3BhY2thZ2VzL2VtYWlsLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSAnbWV0ZW9yL21ldGVvcic7XG5pbXBvcnQgeyBMb2cgfSBmcm9tICdtZXRlb3IvbG9nZ2luZyc7XG5pbXBvcnQgeyBIb29rIH0gZnJvbSAnbWV0ZW9yL2NhbGxiYWNrLWhvb2snO1xuXG5pbXBvcnQgdXJsIGZyb20gJ3VybCc7XG5pbXBvcnQgbm9kZW1haWxlciBmcm9tICdub2RlbWFpbGVyJztcbmltcG9ydCB3ZWxsS25vdyBmcm9tICdub2RlbWFpbGVyL2xpYi93ZWxsLWtub3duJztcblxuZXhwb3J0IGNvbnN0IEVtYWlsID0ge307XG5leHBvcnQgY29uc3QgRW1haWxUZXN0ID0ge307XG5cbmV4cG9ydCBjb25zdCBFbWFpbEludGVybmFscyA9IHtcbiAgTnBtTW9kdWxlczoge1xuICAgIG1haWxjb21wb3Nlcjoge1xuICAgICAgdmVyc2lvbjogTnBtLnJlcXVpcmUoJ25vZGVtYWlsZXIvcGFja2FnZS5qc29uJykudmVyc2lvbixcbiAgICAgIG1vZHVsZTogTnBtLnJlcXVpcmUoJ25vZGVtYWlsZXIvbGliL21haWwtY29tcG9zZXInKSxcbiAgICB9LFxuICAgIG5vZGVtYWlsZXI6IHtcbiAgICAgIHZlcnNpb246IE5wbS5yZXF1aXJlKCdub2RlbWFpbGVyL3BhY2thZ2UuanNvbicpLnZlcnNpb24sXG4gICAgICBtb2R1bGU6IE5wbS5yZXF1aXJlKCdub2RlbWFpbGVyJyksXG4gICAgfSxcbiAgfSxcbn07XG5cbmNvbnN0IE1haWxDb21wb3NlciA9IEVtYWlsSW50ZXJuYWxzLk5wbU1vZHVsZXMubWFpbGNvbXBvc2VyLm1vZHVsZTtcblxuY29uc3QgbWFrZVRyYW5zcG9ydCA9IGZ1bmN0aW9uIChtYWlsVXJsU3RyaW5nKSB7XG4gIGNvbnN0IG1haWxVcmwgPSBuZXcgVVJMKG1haWxVcmxTdHJpbmcpO1xuXG4gIGlmIChtYWlsVXJsLnByb3RvY29sICE9PSAnc210cDonICYmIG1haWxVcmwucHJvdG9jb2wgIT09ICdzbXRwczonKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgJ0VtYWlsIHByb3RvY29sIGluICRNQUlMX1VSTCAoJyArXG4gICAgICAgIG1haWxVcmxTdHJpbmcgK1xuICAgICAgICBcIikgbXVzdCBiZSAnc210cCcgb3IgJ3NtdHBzJ1wiXG4gICAgKTtcbiAgfVxuXG4gIGlmIChtYWlsVXJsLnByb3RvY29sID09PSAnc210cDonICYmIG1haWxVcmwucG9ydCA9PT0gJzQ2NScpIHtcbiAgICBMb2cuZGVidWcoXG4gICAgICBcIlRoZSAkTUFJTF9VUkwgaXMgJ3NtdHA6Ly8uLi46NDY1Jy4gIFwiICtcbiAgICAgICAgXCJZb3UgcHJvYmFibHkgd2FudCAnc210cHM6Ly8nIChUaGUgJ3MnIGVuYWJsZXMgVExTL1NTTCkgXCIgK1xuICAgICAgICBcInNpbmNlICc0NjUnIGlzIHR5cGljYWxseSBhIHNlY3VyZSBwb3J0LlwiXG4gICAgKTtcbiAgfVxuXG4gIC8vIEFsbG93IG92ZXJyaWRpbmcgcG9vbCBzZXR0aW5nLCBidXQgZGVmYXVsdCB0byB0cnVlLlxuICBpZiAoIW1haWxVcmwucXVlcnkpIHtcbiAgICBtYWlsVXJsLnF1ZXJ5ID0ge307XG4gIH1cblxuICBpZiAoIW1haWxVcmwucXVlcnkucG9vbCkge1xuICAgIG1haWxVcmwucXVlcnkucG9vbCA9ICd0cnVlJztcbiAgfVxuXG4gIGNvbnN0IHRyYW5zcG9ydCA9IG5vZGVtYWlsZXIuY3JlYXRlVHJhbnNwb3J0KHVybC5mb3JtYXQobWFpbFVybCkpO1xuXG4gIHRyYW5zcG9ydC5fc3luY1NlbmRNYWlsID0gTWV0ZW9yLndyYXBBc3luYyh0cmFuc3BvcnQuc2VuZE1haWwsIHRyYW5zcG9ydCk7XG4gIHJldHVybiB0cmFuc3BvcnQ7XG59O1xuXG4vLyBNb3JlIGluZm86IGh0dHBzOi8vbm9kZW1haWxlci5jb20vc210cC93ZWxsLWtub3duL1xuY29uc3Qga25vd25Ib3N0c1RyYW5zcG9ydCA9IGZ1bmN0aW9uIChzZXR0aW5ncyA9IHVuZGVmaW5lZCwgdXJsID0gdW5kZWZpbmVkKSB7XG4gIGxldCBzZXJ2aWNlLCB1c2VyLCBwYXNzd29yZDtcblxuICBjb25zdCBoYXNTZXR0aW5ncyA9IHNldHRpbmdzICYmIE9iamVjdC5rZXlzKHNldHRpbmdzKS5sZW5ndGg7XG5cbiAgaWYgKHVybCAmJiAhaGFzU2V0dGluZ3MpIHtcbiAgICBsZXQgaG9zdCA9IHVybC5zcGxpdCgnOicpWzBdO1xuICAgIGNvbnN0IHVybE9iamVjdCA9IG5ldyBVUkwodXJsKTtcbiAgICBpZiAoaG9zdCA9PT0gJ2h0dHAnIHx8IGhvc3QgPT09ICdodHRwcycpIHtcbiAgICAgIC8vIExvb2sgdG8gaG9zdG5hbWUgZm9yIHNlcnZpY2VcbiAgICAgIGhvc3QgPSB1cmxPYmplY3QuaG9zdG5hbWU7XG4gICAgICB1c2VyID0gdXJsT2JqZWN0LnVzZXJuYW1lO1xuICAgICAgcGFzc3dvcmQgPSB1cmxPYmplY3QucGFzc3dvcmQ7XG4gICAgfSBlbHNlIGlmICh1cmxPYmplY3QucHJvdG9jb2wgJiYgdXJsT2JqZWN0LnVzZXJuYW1lICYmIHVybE9iamVjdC5wYXNzd29yZCkge1xuICAgICAgLy8gV2UgaGF2ZSBzb21lIGRhdGEgZnJvbSB1cmxPYmplY3RcbiAgICAgIGhvc3QgPSB1cmxPYmplY3QucHJvdG9jb2wuc3BsaXQoJzonKVswXTtcbiAgICAgIHVzZXIgPSB1cmxPYmplY3QudXNlcm5hbWU7XG4gICAgICBwYXNzd29yZCA9IHVybE9iamVjdC5wYXNzd29yZDtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gV2UgbmVlZCB0byBkaXNlY3QgdGhlIFVSTCBvdXJzZWx2ZXMgdG8gZ2V0IHRoZSBkYXRhXG4gICAgICAvLyBGaXJzdCBnZXQgcmlkIG9mIHRoZSBsZWFkaW5nICcvLycgYW5kIHNwbGl0IHRvIHVzZXJuYW1lIGFuZCB0aGUgcmVzdFxuICAgICAgY29uc3QgdGVtcCA9IHVybE9iamVjdC5wYXRobmFtZS5zdWJzdHJpbmcoMik/LnNwbGl0KCc6Jyk7XG4gICAgICB1c2VyID0gdGVtcFswXTtcbiAgICAgIC8vIE5vdyB3ZSBzcGxpdCBieSAnQCcgdG8gZ2V0IHBhc3N3b3JkIGFuZCBob3N0bmFtZVxuICAgICAgY29uc3QgdGVtcDIgPSB0ZW1wWzFdLnNwbGl0KCdAJyk7XG4gICAgICBwYXNzd29yZCA9IHRlbXAyWzBdO1xuICAgICAgaG9zdCA9IHRlbXAyWzFdO1xuICAgIH1cbiAgICBzZXJ2aWNlID0gaG9zdDtcbiAgfVxuXG4gIGlmICghd2VsbEtub3coc2V0dGluZ3M/LnNlcnZpY2UgfHwgc2VydmljZSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAnQ291bGQgbm90IHJlY29nbml6ZSBlLW1haWwgc2VydmljZS4gU2VlIGxpc3QgYXQgaHR0cHM6Ly9ub2RlbWFpbGVyLmNvbS9zbXRwL3dlbGwta25vd24vIGZvciBzZXJ2aWNlcyB0aGF0IHdlIGNhbiBjb25maWd1cmUgZm9yIHlvdS4nXG4gICAgKTtcbiAgfVxuXG4gIGNvbnN0IHRyYW5zcG9ydCA9IG5vZGVtYWlsZXIuY3JlYXRlVHJhbnNwb3J0KHtcbiAgICBzZXJ2aWNlOiBzZXR0aW5ncz8uc2VydmljZSB8fCBzZXJ2aWNlLFxuICAgIGF1dGg6IHtcbiAgICAgIHVzZXI6IHNldHRpbmdzPy51c2VyIHx8IHVzZXIsXG4gICAgICBwYXNzOiBzZXR0aW5ncz8ucGFzc3dvcmQgfHwgcGFzc3dvcmQsXG4gICAgfSxcbiAgfSk7XG5cbiAgdHJhbnNwb3J0Ll9zeW5jU2VuZE1haWwgPSBNZXRlb3Iud3JhcEFzeW5jKHRyYW5zcG9ydC5zZW5kTWFpbCwgdHJhbnNwb3J0KTtcbiAgcmV0dXJuIHRyYW5zcG9ydDtcbn07XG5FbWFpbFRlc3Qua25vd0hvc3RzVHJhbnNwb3J0ID0ga25vd25Ib3N0c1RyYW5zcG9ydDtcblxuY29uc3QgZ2V0VHJhbnNwb3J0ID0gZnVuY3Rpb24gKCkge1xuICBjb25zdCBwYWNrYWdlU2V0dGluZ3MgPSBNZXRlb3Iuc2V0dGluZ3MucGFja2FnZXM/LmVtYWlsIHx8IHt9O1xuICAvLyBXZSBkZWxheSB0aGlzIGNoZWNrIHVudGlsIHRoZSBmaXJzdCBjYWxsIHRvIEVtYWlsLnNlbmQsIGluIGNhc2Ugc29tZW9uZVxuICAvLyBzZXQgcHJvY2Vzcy5lbnYuTUFJTF9VUkwgaW4gc3RhcnR1cCBjb2RlLiBUaGVuIHdlIHN0b3JlIGluIGEgY2FjaGUgdW50aWxcbiAgLy8gcHJvY2Vzcy5lbnYuTUFJTF9VUkwgY2hhbmdlcy5cbiAgY29uc3QgdXJsID0gcHJvY2Vzcy5lbnYuTUFJTF9VUkw7XG4gIGlmIChcbiAgICB0aGlzLmNhY2hlS2V5ID09PSB1bmRlZmluZWQgfHxcbiAgICB0aGlzLmNhY2hlS2V5ICE9PSB1cmwgfHxcbiAgICB0aGlzLmNhY2hlS2V5ICE9PSBwYWNrYWdlU2V0dGluZ3Muc2VydmljZSB8fFxuICAgIHRoaXMuY2FjaGVLZXkgIT09ICdzZXR0aW5ncydcbiAgKSB7XG4gICAgaWYgKFxuICAgICAgKHBhY2thZ2VTZXR0aW5ncy5zZXJ2aWNlICYmIHdlbGxLbm93KHBhY2thZ2VTZXR0aW5ncy5zZXJ2aWNlKSkgfHxcbiAgICAgICh1cmwgJiYgd2VsbEtub3cobmV3IFVSTCh1cmwpLmhvc3RuYW1lKSkgfHxcbiAgICAgIHdlbGxLbm93KHVybD8uc3BsaXQoJzonKVswXSB8fCAnJylcbiAgICApIHtcbiAgICAgIHRoaXMuY2FjaGVLZXkgPSBwYWNrYWdlU2V0dGluZ3Muc2VydmljZSB8fCAnc2V0dGluZ3MnO1xuICAgICAgdGhpcy5jYWNoZSA9IGtub3duSG9zdHNUcmFuc3BvcnQocGFja2FnZVNldHRpbmdzLCB1cmwpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmNhY2hlS2V5ID0gdXJsO1xuICAgICAgdGhpcy5jYWNoZSA9IHVybCA/IG1ha2VUcmFuc3BvcnQodXJsLCBwYWNrYWdlU2V0dGluZ3MpIDogbnVsbDtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRoaXMuY2FjaGU7XG59O1xuXG5sZXQgbmV4dERldk1vZGVNYWlsSWQgPSAwO1xuXG5FbWFpbFRlc3QuX2dldEFuZEluY05leHREZXZNb2RlTWFpbElkID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gbmV4dERldk1vZGVNYWlsSWQrKztcbn07XG5cbi8vIFRlc3RpbmcgaG9va3NcbkVtYWlsVGVzdC5yZXNldE5leHREZXZNb2RlTWFpbElkID0gZnVuY3Rpb24gKCkge1xuICBuZXh0RGV2TW9kZU1haWxJZCA9IDA7XG59O1xuXG5jb25zdCBkZXZNb2RlU2VuZEFzeW5jID0gZnVuY3Rpb24gKG1haWwsIG9wdGlvbnMpIHtcbiAgY29uc3Qgc3RyZWFtID0gb3B0aW9ucz8uc3RyZWFtIHx8IHByb2Nlc3Muc3Rkb3V0O1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGxldCBkZXZNb2RlTWFpbElkID0gRW1haWxUZXN0Ll9nZXRBbmRJbmNOZXh0RGV2TW9kZU1haWxJZCgpO1xuXG4gICAgLy8gVGhpcyBhcHByb2FjaCBkb2VzIG5vdCBwcmV2ZW50IG90aGVyIHdyaXRlcnMgdG8gc3Rkb3V0IGZyb20gaW50ZXJsZWF2aW5nLlxuICAgIGNvbnN0IG91dHB1dCA9IFsnPT09PT09IEJFR0lOIE1BSUwgIycgKyBkZXZNb2RlTWFpbElkICsgJyA9PT09PT1cXG4nXTtcbiAgICBvdXRwdXQucHVzaChcbiAgICAgICcoTWFpbCBub3Qgc2VudDsgdG8gZW5hYmxlIHNlbmRpbmcsIHNldCB0aGUgTUFJTF9VUkwgJyArXG4gICAgICAnZW52aXJvbm1lbnQgdmFyaWFibGUuKVxcbidcbiAgICApO1xuICAgIGNvbnN0IHJlYWRTdHJlYW0gPSBuZXcgTWFpbENvbXBvc2VyKG1haWwpLmNvbXBpbGUoKS5jcmVhdGVSZWFkU3RyZWFtKCk7XG4gICAgcmVhZFN0cmVhbS5vbignZGF0YScsIGJ1ZmZlciA9PiB7XG4gICAgICBvdXRwdXQucHVzaChidWZmZXIudG9TdHJpbmcoKSk7XG4gICAgfSk7XG4gICAgcmVhZFN0cmVhbS5vbignZW5kJywgZnVuY3Rpb24gKCkge1xuICAgICAgb3V0cHV0LnB1c2goJz09PT09PSBFTkQgTUFJTCAjJyArIGRldk1vZGVNYWlsSWQgKyAnID09PT09PVxcbicpO1xuICAgICAgc3RyZWFtLndyaXRlKG91dHB1dC5qb2luKCcnKSwgKCkgPT4gcmVzb2x2ZSgpKTtcbiAgICB9KTtcbiAgICByZWFkU3RyZWFtLm9uKCdlcnJvcicsIChlcnIpID0+IHJlamVjdChlcnIpKTtcbiAgfSk7XG59O1xuXG5jb25zdCBzbXRwU2VuZCA9IGZ1bmN0aW9uICh0cmFuc3BvcnQsIG1haWwpIHtcbiAgdHJhbnNwb3J0Ll9zeW5jU2VuZE1haWwobWFpbCk7XG59O1xuXG5jb25zdCBzZW5kSG9va3MgPSBuZXcgSG9vaygpO1xuXG4vKipcbiAqIEBzdW1tYXJ5IEhvb2sgdGhhdCBydW5zIGJlZm9yZSBlbWFpbCBpcyBzZW50LlxuICogQGxvY3VzIFNlcnZlclxuICpcbiAqIEBwYXJhbSBmIHtmdW5jdGlvbn0gcmVjZWl2ZXMgdGhlIGFyZ3VtZW50cyB0byBFbWFpbC5zZW5kIGFuZCBzaG91bGQgcmV0dXJuIHRydWUgdG8gZ29cbiAqIGFoZWFkIGFuZCBzZW5kIHRoZSBlbWFpbCAob3IgYXQgbGVhc3QsIHRyeSBzdWJzZXF1ZW50IGhvb2tzKSwgb3JcbiAqIGZhbHNlIHRvIHNraXAgc2VuZGluZy5cbiAqIEByZXR1cm5zIHt7IHN0b3A6IGZ1bmN0aW9uLCBjYWxsYmFjazogZnVuY3Rpb24gfX1cbiAqL1xuRW1haWwuaG9va1NlbmQgPSBmdW5jdGlvbiAoZikge1xuICByZXR1cm4gc2VuZEhvb2tzLnJlZ2lzdGVyKGYpO1xufTtcblxuLyoqXG4gKiBAc3VtbWFyeSBPdmVycmlkZXMgc2VuZGluZyBmdW5jdGlvbiB3aXRoIHlvdXIgb3duLlxuICogQGxvY3VzIFNlcnZlclxuICogQHNpbmNlIDIuMlxuICogQHBhcmFtIGYge2Z1bmN0aW9ufSBmdW5jdGlvbiB0aGF0IHdpbGwgcmVjZWl2ZSBvcHRpb25zIGZyb20gdGhlIHNlbmQgZnVuY3Rpb24gYW5kIHVuZGVyIGBwYWNrYWdlU2V0dGluZ3NgIHdpbGxcbiAqIGluY2x1ZGUgdGhlIHBhY2thZ2Ugc2V0dGluZ3MgZnJvbSBNZXRlb3Iuc2V0dGluZ3MucGFja2FnZXMuZW1haWwgZm9yIHlvdXIgY3VzdG9tIHRyYW5zcG9ydCB0byBhY2Nlc3MuXG4gKi9cbkVtYWlsLmN1c3RvbVRyYW5zcG9ydCA9IHVuZGVmaW5lZDtcblxuLyoqXG4gKiBAc3VtbWFyeSBTZW5kIGFuIGVtYWlsLiBUaHJvd3MgYW4gYEVycm9yYCBvbiBmYWlsdXJlIHRvIGNvbnRhY3QgbWFpbCBzZXJ2ZXJcbiAqIG9yIGlmIG1haWwgc2VydmVyIHJldHVybnMgYW4gZXJyb3IuIEFsbCBmaWVsZHMgc2hvdWxkIG1hdGNoXG4gKiBbUkZDNTMyMl0oaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNTMyMikgc3BlY2lmaWNhdGlvbi5cbiAqXG4gKiBJZiB0aGUgYE1BSUxfVVJMYCBlbnZpcm9ubWVudCB2YXJpYWJsZSBpcyBzZXQsIGFjdHVhbGx5IHNlbmRzIHRoZSBlbWFpbC5cbiAqIE90aGVyd2lzZSwgcHJpbnRzIHRoZSBjb250ZW50cyBvZiB0aGUgZW1haWwgdG8gc3RhbmRhcmQgb3V0LlxuICpcbiAqIE5vdGUgdGhhdCB0aGlzIHBhY2thZ2UgaXMgYmFzZWQgb24gKipub2RlbWFpbGVyKiosIHNvIG1ha2Ugc3VyZSB0byByZWZlciB0b1xuICogW3RoZSBkb2N1bWVudGF0aW9uXShodHRwOi8vbm9kZW1haWxlci5jb20vKVxuICogd2hlbiB1c2luZyB0aGUgYGF0dGFjaG1lbnRzYCBvciBgbWFpbENvbXBvc2VyYCBvcHRpb25zLlxuICpcbiAqIEBsb2N1cyBTZXJ2ZXJcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAcGFyYW0ge1N0cmluZ30gW29wdGlvbnMuZnJvbV0gXCJGcm9tOlwiIGFkZHJlc3MgKHJlcXVpcmVkKVxuICogQHBhcmFtIHtTdHJpbmd8U3RyaW5nW119IG9wdGlvbnMudG8sY2MsYmNjLHJlcGx5VG9cbiAqICAgXCJUbzpcIiwgXCJDYzpcIiwgXCJCY2M6XCIsIGFuZCBcIlJlcGx5LVRvOlwiIGFkZHJlc3Nlc1xuICogQHBhcmFtIHtTdHJpbmd9IFtvcHRpb25zLmluUmVwbHlUb10gTWVzc2FnZS1JRCB0aGlzIG1lc3NhZ2UgaXMgcmVwbHlpbmcgdG9cbiAqIEBwYXJhbSB7U3RyaW5nfFN0cmluZ1tdfSBbb3B0aW9ucy5yZWZlcmVuY2VzXSBBcnJheSAob3Igc3BhY2Utc2VwYXJhdGVkIHN0cmluZykgb2YgTWVzc2FnZS1JRHMgdG8gcmVmZXIgdG9cbiAqIEBwYXJhbSB7U3RyaW5nfSBbb3B0aW9ucy5tZXNzYWdlSWRdIE1lc3NhZ2UtSUQgZm9yIHRoaXMgbWVzc2FnZTsgb3RoZXJ3aXNlLCB3aWxsIGJlIHNldCB0byBhIHJhbmRvbSB2YWx1ZVxuICogQHBhcmFtIHtTdHJpbmd9IFtvcHRpb25zLnN1YmplY3RdICBcIlN1YmplY3Q6XCIgbGluZVxuICogQHBhcmFtIHtTdHJpbmd9IFtvcHRpb25zLnRleHR8aHRtbF0gTWFpbCBib2R5IChpbiBwbGFpbiB0ZXh0IGFuZC9vciBIVE1MKVxuICogQHBhcmFtIHtTdHJpbmd9IFtvcHRpb25zLndhdGNoSHRtbF0gTWFpbCBib2R5IGluIEhUTUwgc3BlY2lmaWMgZm9yIEFwcGxlIFdhdGNoXG4gKiBAcGFyYW0ge1N0cmluZ30gW29wdGlvbnMuaWNhbEV2ZW50XSBpQ2FsZW5kYXIgZXZlbnQgYXR0YWNobWVudFxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zLmhlYWRlcnNdIERpY3Rpb25hcnkgb2YgY3VzdG9tIGhlYWRlcnMgLSBlLmcuIGB7IFwiaGVhZGVyIG5hbWVcIjogXCJoZWFkZXIgdmFsdWVcIiB9YC4gVG8gc2V0IGFuIG9iamVjdCB1bmRlciBhIGhlYWRlciBuYW1lLCB1c2UgYEpTT04uc3RyaW5naWZ5YCAtIGUuZy4gYHsgXCJoZWFkZXIgbmFtZVwiOiBKU09OLnN0cmluZ2lmeSh7IHRyYWNraW5nOiB7IGxldmVsOiAnZnVsbCcgfSB9KSB9YC5cbiAqIEBwYXJhbSB7T2JqZWN0W119IFtvcHRpb25zLmF0dGFjaG1lbnRzXSBBcnJheSBvZiBhdHRhY2htZW50IG9iamVjdHMsIGFzXG4gKiBkZXNjcmliZWQgaW4gdGhlIFtub2RlbWFpbGVyIGRvY3VtZW50YXRpb25dKGh0dHBzOi8vbm9kZW1haWxlci5jb20vbWVzc2FnZS9hdHRhY2htZW50cy8pLlxuICogQHBhcmFtIHtNYWlsQ29tcG9zZXJ9IFtvcHRpb25zLm1haWxDb21wb3Nlcl0gQSBbTWFpbENvbXBvc2VyXShodHRwczovL25vZGVtYWlsZXIuY29tL2V4dHJhcy9tYWlsY29tcG9zZXIvI2UtbWFpbC1tZXNzYWdlLWZpZWxkcylcbiAqIG9iamVjdCByZXByZXNlbnRpbmcgdGhlIG1lc3NhZ2UgdG8gYmUgc2VudC4gIE92ZXJyaWRlcyBhbGwgb3RoZXIgb3B0aW9ucy5cbiAqIFlvdSBjYW4gY3JlYXRlIGEgYE1haWxDb21wb3NlcmAgb2JqZWN0IHZpYVxuICogYG5ldyBFbWFpbEludGVybmFscy5OcG1Nb2R1bGVzLm1haWxjb21wb3Nlci5tb2R1bGVgLlxuICovXG5FbWFpbC5zZW5kID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgaWYgKEVtYWlsLmN1c3RvbVRyYW5zcG9ydCkge1xuICAgIC8vIFByZXNlcnZlIGN1cnJlbnQgYmVoYXZpb3JcbiAgICBjb25zdCBlbWFpbCA9IG9wdGlvbnMubWFpbENvbXBvc2VyID8gb3B0aW9ucy5tYWlsQ29tcG9zZXIubWFpbCA6IG9wdGlvbnM7XG4gICAgbGV0IHNlbmQgPSB0cnVlO1xuICAgIHNlbmRIb29rcy5mb3JFYWNoKChob29rKSA9PiB7XG4gICAgICBzZW5kID0gaG9vayhlbWFpbCk7XG4gICAgICByZXR1cm4gc2VuZDtcbiAgICB9KTtcbiAgICBpZiAoIXNlbmQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgcGFja2FnZVNldHRpbmdzID0gTWV0ZW9yLnNldHRpbmdzLnBhY2thZ2VzPy5lbWFpbCB8fCB7fTtcbiAgICBFbWFpbC5jdXN0b21UcmFuc3BvcnQoeyBwYWNrYWdlU2V0dGluZ3MsIC4uLmVtYWlsIH0pO1xuICAgIHJldHVybjtcbiAgfVxuICAvLyBVc2luZyBGaWJlcnMgUHJvbWlzZS5hd2FpdFxuICByZXR1cm4gUHJvbWlzZS5hd2FpdChFbWFpbC5zZW5kQXN5bmMob3B0aW9ucykpO1xufTtcblxuLyoqXG4gKiBAc3VtbWFyeSBTZW5kIGFuIGVtYWlsIHdpdGggYXN5bmNyb25vdXMgbWV0aG9kLiBDYXB0dXJlICBUaHJvd3MgYW4gYEVycm9yYCBvbiBmYWlsdXJlIHRvIGNvbnRhY3QgbWFpbCBzZXJ2ZXJcbiAqIG9yIGlmIG1haWwgc2VydmVyIHJldHVybnMgYW4gZXJyb3IuIEFsbCBmaWVsZHMgc2hvdWxkIG1hdGNoXG4gKiBbUkZDNTMyMl0oaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNTMyMikgc3BlY2lmaWNhdGlvbi5cbiAqXG4gKiBJZiB0aGUgYE1BSUxfVVJMYCBlbnZpcm9ubWVudCB2YXJpYWJsZSBpcyBzZXQsIGFjdHVhbGx5IHNlbmRzIHRoZSBlbWFpbC5cbiAqIE90aGVyd2lzZSwgcHJpbnRzIHRoZSBjb250ZW50cyBvZiB0aGUgZW1haWwgdG8gc3RhbmRhcmQgb3V0LlxuICpcbiAqIE5vdGUgdGhhdCB0aGlzIHBhY2thZ2UgaXMgYmFzZWQgb24gKipub2RlbWFpbGVyKiosIHNvIG1ha2Ugc3VyZSB0byByZWZlciB0b1xuICogW3RoZSBkb2N1bWVudGF0aW9uXShodHRwOi8vbm9kZW1haWxlci5jb20vKVxuICogd2hlbiB1c2luZyB0aGUgYGF0dGFjaG1lbnRzYCBvciBgbWFpbENvbXBvc2VyYCBvcHRpb25zLlxuICpcbiAqIEBsb2N1cyBTZXJ2ZXJcbiAqIEByZXR1cm4ge1Byb21pc2V9XG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQHBhcmFtIHtTdHJpbmd9IFtvcHRpb25zLmZyb21dIFwiRnJvbTpcIiBhZGRyZXNzIChyZXF1aXJlZClcbiAqIEBwYXJhbSB7U3RyaW5nfFN0cmluZ1tdfSBvcHRpb25zLnRvLGNjLGJjYyxyZXBseVRvXG4gKiAgIFwiVG86XCIsIFwiQ2M6XCIsIFwiQmNjOlwiLCBhbmQgXCJSZXBseS1UbzpcIiBhZGRyZXNzZXNcbiAqIEBwYXJhbSB7U3RyaW5nfSBbb3B0aW9ucy5pblJlcGx5VG9dIE1lc3NhZ2UtSUQgdGhpcyBtZXNzYWdlIGlzIHJlcGx5aW5nIHRvXG4gKiBAcGFyYW0ge1N0cmluZ3xTdHJpbmdbXX0gW29wdGlvbnMucmVmZXJlbmNlc10gQXJyYXkgKG9yIHNwYWNlLXNlcGFyYXRlZCBzdHJpbmcpIG9mIE1lc3NhZ2UtSURzIHRvIHJlZmVyIHRvXG4gKiBAcGFyYW0ge1N0cmluZ30gW29wdGlvbnMubWVzc2FnZUlkXSBNZXNzYWdlLUlEIGZvciB0aGlzIG1lc3NhZ2U7IG90aGVyd2lzZSwgd2lsbCBiZSBzZXQgdG8gYSByYW5kb20gdmFsdWVcbiAqIEBwYXJhbSB7U3RyaW5nfSBbb3B0aW9ucy5zdWJqZWN0XSAgXCJTdWJqZWN0OlwiIGxpbmVcbiAqIEBwYXJhbSB7U3RyaW5nfSBbb3B0aW9ucy50ZXh0fGh0bWxdIE1haWwgYm9keSAoaW4gcGxhaW4gdGV4dCBhbmQvb3IgSFRNTClcbiAqIEBwYXJhbSB7U3RyaW5nfSBbb3B0aW9ucy53YXRjaEh0bWxdIE1haWwgYm9keSBpbiBIVE1MIHNwZWNpZmljIGZvciBBcHBsZSBXYXRjaFxuICogQHBhcmFtIHtTdHJpbmd9IFtvcHRpb25zLmljYWxFdmVudF0gaUNhbGVuZGFyIGV2ZW50IGF0dGFjaG1lbnRcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9ucy5oZWFkZXJzXSBEaWN0aW9uYXJ5IG9mIGN1c3RvbSBoZWFkZXJzIC0gZS5nLiBgeyBcImhlYWRlciBuYW1lXCI6IFwiaGVhZGVyIHZhbHVlXCIgfWAuIFRvIHNldCBhbiBvYmplY3QgdW5kZXIgYSBoZWFkZXIgbmFtZSwgdXNlIGBKU09OLnN0cmluZ2lmeWAgLSBlLmcuIGB7IFwiaGVhZGVyIG5hbWVcIjogSlNPTi5zdHJpbmdpZnkoeyB0cmFja2luZzogeyBsZXZlbDogJ2Z1bGwnIH0gfSkgfWAuXG4gKiBAcGFyYW0ge09iamVjdFtdfSBbb3B0aW9ucy5hdHRhY2htZW50c10gQXJyYXkgb2YgYXR0YWNobWVudCBvYmplY3RzLCBhc1xuICogZGVzY3JpYmVkIGluIHRoZSBbbm9kZW1haWxlciBkb2N1bWVudGF0aW9uXShodHRwczovL25vZGVtYWlsZXIuY29tL21lc3NhZ2UvYXR0YWNobWVudHMvKS5cbiAqIEBwYXJhbSB7TWFpbENvbXBvc2VyfSBbb3B0aW9ucy5tYWlsQ29tcG9zZXJdIEEgW01haWxDb21wb3Nlcl0oaHR0cHM6Ly9ub2RlbWFpbGVyLmNvbS9leHRyYXMvbWFpbGNvbXBvc2VyLyNlLW1haWwtbWVzc2FnZS1maWVsZHMpXG4gKiBvYmplY3QgcmVwcmVzZW50aW5nIHRoZSBtZXNzYWdlIHRvIGJlIHNlbnQuICBPdmVycmlkZXMgYWxsIG90aGVyIG9wdGlvbnMuXG4gKiBZb3UgY2FuIGNyZWF0ZSBhIGBNYWlsQ29tcG9zZXJgIG9iamVjdCB2aWFcbiAqIGBuZXcgRW1haWxJbnRlcm5hbHMuTnBtTW9kdWxlcy5tYWlsY29tcG9zZXIubW9kdWxlYC5cbiAqL1xuRW1haWwuc2VuZEFzeW5jID0gYXN5bmMgZnVuY3Rpb24gKG9wdGlvbnMpIHtcblxuICBjb25zdCBlbWFpbCA9IG9wdGlvbnMubWFpbENvbXBvc2VyID8gb3B0aW9ucy5tYWlsQ29tcG9zZXIubWFpbCA6IG9wdGlvbnM7XG5cbiAgbGV0IHNlbmQgPSB0cnVlO1xuICBzZW5kSG9va3MuZm9yRWFjaCgoaG9vaykgPT4ge1xuICAgIHNlbmQgPSBob29rKGVtYWlsKTtcbiAgICByZXR1cm4gc2VuZDtcbiAgfSk7XG4gIGlmICghc2VuZCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmIChFbWFpbC5jdXN0b21UcmFuc3BvcnQpIHtcbiAgICBjb25zdCBwYWNrYWdlU2V0dGluZ3MgPSBNZXRlb3Iuc2V0dGluZ3MucGFja2FnZXM/LmVtYWlsIHx8IHt9O1xuICAgIHJldHVybiBFbWFpbC5jdXN0b21UcmFuc3BvcnQoeyBwYWNrYWdlU2V0dGluZ3MsIC4uLmVtYWlsIH0pO1xuICB9XG5cbiAgY29uc3QgbWFpbFVybEVudiA9IHByb2Nlc3MuZW52Lk1BSUxfVVJMO1xuICBjb25zdCBtYWlsVXJsU2V0dGluZ3MgPSBNZXRlb3Iuc2V0dGluZ3MucGFja2FnZXM/LmVtYWlsO1xuXG4gIGlmIChNZXRlb3IuaXNQcm9kdWN0aW9uICYmICFtYWlsVXJsRW52ICYmICFtYWlsVXJsU2V0dGluZ3MpIHtcbiAgICAvLyBUaGlzIGNoZWNrIGlzIG1vc3RseSBuZWNlc3Nhcnkgd2hlbiB1c2luZyB0aGUgZmxhZyAtLXByb2R1Y3Rpb24gd2hlbiBydW5uaW5nIGxvY2FsbHkuXG4gICAgLy8gQW5kIGl0IHdvcmtzIGFzIGEgcmVtaW5kZXIgdG8gcHJvcGVybHkgc2V0IHRoZSBtYWlsIFVSTCB3aGVuIHJ1bm5pbmcgbG9jYWxseS5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAnWW91IGhhdmUgbm90IHByb3ZpZGVkIGEgbWFpbCBVUkwuIFlvdSBjYW4gcHJvdmlkZSBpdCBieSB1c2luZyB0aGUgZW52aXJvbm1lbnQgdmFyaWFibGUgTUFJTF9VUkwgb3IgeW91ciBzZXR0aW5ncy4gWW91IGNhbiByZWFkIG1vcmUgYWJvdXQgaXQgaGVyZTogaHR0cHM6Ly9kb2NzLm1ldGVvci5jb20vYXBpL2VtYWlsLmh0bWwuJ1xuICAgICk7XG4gIH1cblxuICBpZiAobWFpbFVybEVudiB8fCBtYWlsVXJsU2V0dGluZ3MpIHtcbiAgICBjb25zdCB0cmFuc3BvcnQgPSBnZXRUcmFuc3BvcnQoKTtcbiAgICBzbXRwU2VuZCh0cmFuc3BvcnQsIGVtYWlsKTtcbiAgICByZXR1cm47XG4gIH1cbiAgcmV0dXJuIGRldk1vZGVTZW5kQXN5bmMoZW1haWwsIG9wdGlvbnMpO1xufTtcbiJdfQ==
