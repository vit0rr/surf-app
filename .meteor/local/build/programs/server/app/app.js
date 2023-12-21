var require = meteorInstall({"imports":{"api":{"links.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////
//                                                                               //
// imports/api/links.js                                                          //
//                                                                               //
///////////////////////////////////////////////////////////////////////////////////
                                                                                 //
module.export({
  LinksCollection: () => LinksCollection
});
let Mongo;
module.link("meteor/mongo", {
  Mongo(v) {
    Mongo = v;
  }
}, 0);
const LinksCollection = new Mongo.Collection('links');
///////////////////////////////////////////////////////////////////////////////////

}}},"server":{"main.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////
//                                                                               //
// server/main.js                                                                //
//                                                                               //
///////////////////////////////////////////////////////////////////////////////////
                                                                                 //
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }
}, 0);
let LinksCollection;
module.link("/imports/api/links", {
  LinksCollection(v) {
    LinksCollection = v;
  }
}, 1);
function insertLink(_ref) {
  return Promise.asyncApply(() => {
    let {
      title,
      url
    } = _ref;
    Promise.await(LinksCollection.insertAsync({
      title,
      url,
      createdAt: new Date()
    }));
  });
}
Meteor.startup(() => Promise.asyncApply(() => {
  // If the Links collection is empty, add some data.
  if (Promise.await(LinksCollection.find().countAsync()) === 0) {
    Promise.await(insertLink({
      title: 'Do the Tutorial',
      url: 'https://react-tutorial.meteor.com/simple-todos/01-creating-app.html'
    }));
    Promise.await(insertLink({
      title: 'Follow the Guide',
      url: 'https://guide.meteor.com'
    }));
    Promise.await(insertLink({
      title: 'Read the Docs',
      url: 'https://docs.meteor.com'
    }));
    Promise.await(insertLink({
      title: 'Discussions',
      url: 'https://forums.meteor.com'
    }));
  }

  // We publish the entire Links collection to all clients.
  // In order to be fetched in real-time to the clients
  Meteor.publish("links", function () {
    return LinksCollection.find();
  });
}));
///////////////////////////////////////////////////////////////////////////////////

}}},{
  "extensions": [
    ".js",
    ".json",
    ".jsx"
  ]
});

var exports = require("/server/main.js");
//# sourceURL=meteor://💻app/app/app.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9hcGkvbGlua3MuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3NlcnZlci9tYWluLmpzIl0sIm5hbWVzIjpbIm1vZHVsZSIsImV4cG9ydCIsIkxpbmtzQ29sbGVjdGlvbiIsIk1vbmdvIiwibGluayIsInYiLCJDb2xsZWN0aW9uIiwiTWV0ZW9yIiwiaW5zZXJ0TGluayIsIl9yZWYiLCJQcm9taXNlIiwiYXN5bmNBcHBseSIsInRpdGxlIiwidXJsIiwiYXdhaXQiLCJpbnNlcnRBc3luYyIsImNyZWF0ZWRBdCIsIkRhdGUiLCJzdGFydHVwIiwiZmluZCIsImNvdW50QXN5bmMiLCJwdWJsaXNoIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBQSxNQUFNLENBQUNDLE1BQU0sQ0FBQztFQUFDQyxlQUFlLEVBQUNBLENBQUEsS0FBSUE7QUFBZSxDQUFDLENBQUM7QUFBQyxJQUFJQyxLQUFLO0FBQUNILE1BQU0sQ0FBQ0ksSUFBSSxDQUFDLGNBQWMsRUFBQztFQUFDRCxLQUFLQSxDQUFDRSxDQUFDLEVBQUM7SUFBQ0YsS0FBSyxHQUFDRSxDQUFDO0VBQUE7QUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDO0FBRXpHLE1BQU1ILGVBQWUsR0FBRyxJQUFJQyxLQUFLLENBQUNHLFVBQVUsQ0FBQyxPQUFPLENBQUMsQzs7Ozs7Ozs7Ozs7QUNGNUQsSUFBSUMsTUFBTTtBQUFDUCxNQUFNLENBQUNJLElBQUksQ0FBQyxlQUFlLEVBQUM7RUFBQ0csTUFBTUEsQ0FBQ0YsQ0FBQyxFQUFDO0lBQUNFLE1BQU0sR0FBQ0YsQ0FBQztFQUFBO0FBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQztBQUFDLElBQUlILGVBQWU7QUFBQ0YsTUFBTSxDQUFDSSxJQUFJLENBQUMsb0JBQW9CLEVBQUM7RUFBQ0YsZUFBZUEsQ0FBQ0csQ0FBQyxFQUFDO0lBQUNILGVBQWUsR0FBQ0csQ0FBQztFQUFBO0FBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQztBQUcvSixTQUFlRyxVQUFVQSxDQUFBQyxJQUFBO0VBQUEsT0FBQUMsT0FBQSxDQUFBQyxVQUFBLE9BQWlCO0lBQUEsSUFBaEI7TUFBRUMsS0FBSztNQUFFQztJQUFJLENBQUMsR0FBQUosSUFBQTtJQUN0Q0MsT0FBQSxDQUFBSSxLQUFBLENBQU1aLGVBQWUsQ0FBQ2EsV0FBVyxDQUFDO01BQUVILEtBQUs7TUFBRUMsR0FBRztNQUFFRyxTQUFTLEVBQUUsSUFBSUMsSUFBSSxDQUFDO0lBQUUsQ0FBQyxDQUFDO0VBQzFFLENBQUM7QUFBQTtBQUVEVixNQUFNLENBQUNXLE9BQU8sQ0FBQyxNQUFBUixPQUFBLENBQUFDLFVBQUEsT0FBWTtFQUN6QjtFQUNBLElBQUlELE9BQUEsQ0FBQUksS0FBQSxDQUFNWixlQUFlLENBQUNpQixJQUFJLENBQUMsQ0FBQyxDQUFDQyxVQUFVLENBQUMsQ0FBQyxNQUFLLENBQUMsRUFBRTtJQUNuRFYsT0FBQSxDQUFBSSxLQUFBLENBQU1OLFVBQVUsQ0FBQztNQUNmSSxLQUFLLEVBQUUsaUJBQWlCO01BQ3hCQyxHQUFHLEVBQUU7SUFDUCxDQUFDLENBQUM7SUFFRkgsT0FBQSxDQUFBSSxLQUFBLENBQU1OLFVBQVUsQ0FBQztNQUNmSSxLQUFLLEVBQUUsa0JBQWtCO01BQ3pCQyxHQUFHLEVBQUU7SUFDUCxDQUFDLENBQUM7SUFFRkgsT0FBQSxDQUFBSSxLQUFBLENBQU1OLFVBQVUsQ0FBQztNQUNmSSxLQUFLLEVBQUUsZUFBZTtNQUN0QkMsR0FBRyxFQUFFO0lBQ1AsQ0FBQyxDQUFDO0lBRUZILE9BQUEsQ0FBQUksS0FBQSxDQUFNTixVQUFVLENBQUM7TUFDZkksS0FBSyxFQUFFLGFBQWE7TUFDcEJDLEdBQUcsRUFBRTtJQUNQLENBQUMsQ0FBQztFQUNKOztFQUVBO0VBQ0E7RUFDQU4sTUFBTSxDQUFDYyxPQUFPLENBQUMsT0FBTyxFQUFFLFlBQVk7SUFDbEMsT0FBT25CLGVBQWUsQ0FBQ2lCLElBQUksQ0FBQyxDQUFDO0VBQy9CLENBQUMsQ0FBQztBQUNKLENBQUMsRUFBQyxDIiwiZmlsZSI6Ii9hcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNb25nbyB9IGZyb20gJ21ldGVvci9tb25nbyc7XG5cbmV4cG9ydCBjb25zdCBMaW5rc0NvbGxlY3Rpb24gPSBuZXcgTW9uZ28uQ29sbGVjdGlvbignbGlua3MnKTtcbiIsImltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InO1xuaW1wb3J0IHsgTGlua3NDb2xsZWN0aW9uIH0gZnJvbSAnL2ltcG9ydHMvYXBpL2xpbmtzJztcblxuYXN5bmMgZnVuY3Rpb24gaW5zZXJ0TGluayh7IHRpdGxlLCB1cmwgfSkge1xuICBhd2FpdCBMaW5rc0NvbGxlY3Rpb24uaW5zZXJ0QXN5bmMoeyB0aXRsZSwgdXJsLCBjcmVhdGVkQXQ6IG5ldyBEYXRlKCkgfSk7XG59XG5cbk1ldGVvci5zdGFydHVwKGFzeW5jICgpID0+IHtcbiAgLy8gSWYgdGhlIExpbmtzIGNvbGxlY3Rpb24gaXMgZW1wdHksIGFkZCBzb21lIGRhdGEuXG4gIGlmIChhd2FpdCBMaW5rc0NvbGxlY3Rpb24uZmluZCgpLmNvdW50QXN5bmMoKSA9PT0gMCkge1xuICAgIGF3YWl0IGluc2VydExpbmsoe1xuICAgICAgdGl0bGU6ICdEbyB0aGUgVHV0b3JpYWwnLFxuICAgICAgdXJsOiAnaHR0cHM6Ly9yZWFjdC10dXRvcmlhbC5tZXRlb3IuY29tL3NpbXBsZS10b2Rvcy8wMS1jcmVhdGluZy1hcHAuaHRtbCcsXG4gICAgfSk7XG5cbiAgICBhd2FpdCBpbnNlcnRMaW5rKHtcbiAgICAgIHRpdGxlOiAnRm9sbG93IHRoZSBHdWlkZScsXG4gICAgICB1cmw6ICdodHRwczovL2d1aWRlLm1ldGVvci5jb20nLFxuICAgIH0pO1xuXG4gICAgYXdhaXQgaW5zZXJ0TGluayh7XG4gICAgICB0aXRsZTogJ1JlYWQgdGhlIERvY3MnLFxuICAgICAgdXJsOiAnaHR0cHM6Ly9kb2NzLm1ldGVvci5jb20nLFxuICAgIH0pO1xuXG4gICAgYXdhaXQgaW5zZXJ0TGluayh7XG4gICAgICB0aXRsZTogJ0Rpc2N1c3Npb25zJyxcbiAgICAgIHVybDogJ2h0dHBzOi8vZm9ydW1zLm1ldGVvci5jb20nLFxuICAgIH0pO1xuICB9XG5cbiAgLy8gV2UgcHVibGlzaCB0aGUgZW50aXJlIExpbmtzIGNvbGxlY3Rpb24gdG8gYWxsIGNsaWVudHMuXG4gIC8vIEluIG9yZGVyIHRvIGJlIGZldGNoZWQgaW4gcmVhbC10aW1lIHRvIHRoZSBjbGllbnRzXG4gIE1ldGVvci5wdWJsaXNoKFwibGlua3NcIiwgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBMaW5rc0NvbGxlY3Rpb24uZmluZCgpO1xuICB9KTtcbn0pO1xuIl19
