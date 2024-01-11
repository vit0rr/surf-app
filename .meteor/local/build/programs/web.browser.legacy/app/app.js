var require = meteorInstall({"imports":{"ui":{"routes":{"Event":{"Background.jsx":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/routes/Event/Background.jsx                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!function (module1) {
  module1.export({
    Background: function () {
      return Background;
    }
  });
  var React, Fragment;
  module1.link("react", {
    "default": function (v) {
      React = v;
    },
    Fragment: function (v) {
      Fragment = v;
    }
  }, 0);
  ___INIT_METEOR_FAST_REFRESH(module);
  var Background = function (_ref) {
    var event = _ref.event,
      primary = _ref.primary,
      secondary = _ref.secondary;
    var gradient = "repeating-linear-gradient(\n\t\t45deg,\n\t\t" + primary + ",\n\t\t" + primary + " 5px,\n\t\t" + secondary + " 5px,\n\t\t" + secondary + " 10px\n\t)";
    return /*#__PURE__*/React.createElement(Fragment, null, /*#__PURE__*/React.createElement("section", {
      className: "page-event__bg page-event__bg--background",
      style: {
        backgroundImage: "url(./" + event.image + ")"
      }
    }), /*#__PURE__*/React.createElement("section", {
      className: "page-event__bg page-event__bg--foreground"
    }, /*#__PURE__*/React.createElement("div", {
      className: "page-event__bg-line page-event__bg-line-left",
      style: {
        background: gradient
      }
    }), /*#__PURE__*/React.createElement("div", {
      className: "page-event__bg-line page-event__bg-line-right",
      style: {
        background: gradient
      }
    })));
  };
  _c = Background;
  var _c;
  $RefreshReg$(_c, "Background");
}.call(this, module);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Info.jsx":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/routes/Event/Info.jsx                                                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!function (module1) {
  module1.export({
    Info: function () {
      return Info;
    }
  });
  var React, Fragment;
  module1.link("react", {
    "default": function (v) {
      React = v;
    },
    Fragment: function (v) {
      Fragment = v;
    }
  }, 0);
  var dayjs;
  module1.link("dayjs", {
    "default": function (v) {
      dayjs = v;
    }
  }, 1);
  ___INIT_METEOR_FAST_REFRESH(module);
  var Info = function (_ref) {
    var event = _ref.event,
      primary = _ref.primary;
    return /*#__PURE__*/React.createElement(Fragment, null, /*#__PURE__*/React.createElement("section", {
      className: "page-event__info uk-padding-small"
    }, /*#__PURE__*/React.createElement("div", {
      className: "page-event__info-logo"
    }, /*#__PURE__*/React.createElement("img", {
      src: event.logo,
      alt: event.title
    })), /*#__PURE__*/React.createElement("div", {
      className: "page-event__info-title"
    }, /*#__PURE__*/React.createElement("h1", {
      className: "uk-text-uppercase"
    }, event.title), /*#__PURE__*/React.createElement("h2", {
      className: "uk-text-uppercase uk-text-meta",
      style: {
        color: primary
      }
    }, event.subtitle)), /*#__PURE__*/React.createElement("div", {
      className: "page-event__info-date"
    }, /*#__PURE__*/React.createElement("p", {
      className: "uk-text-bolder",
      style: {
        color: primary
      }
    }, dayjs(event.date).format('YY')))), /*#__PURE__*/React.createElement("section", {
      className: "page-event__info page-event__info--description uk-padding-small",
      "uk-accordion": "uk-accordion"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
      className: "uk-accordion-title"
    }, "Event Details"), /*#__PURE__*/React.createElement("div", {
      className: "uk-accordion-content"
    }, /*#__PURE__*/React.createElement("p", null, event.description)))));
  };
  _c = Info;
  var _c;
  $RefreshReg$(_c, "Info");
}.call(this, module);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Park.jsx":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/routes/Event/Park.jsx                                                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!function (module1) {
  var _slicedToArray;
  module1.link("@babel/runtime/helpers/slicedToArray", {
    default: function (v) {
      _slicedToArray = v;
    }
  }, 0);
  module1.export({
    Park: function () {
      return Park;
    }
  });
  var React, useRef, useState, useEffect;
  module1.link("react", {
    "default": function (v) {
      React = v;
    },
    useRef: function (v) {
      useRef = v;
    },
    useState: function (v) {
      useState = v;
    },
    useEffect: function (v) {
      useEffect = v;
    }
  }, 0);
  var getCSSVariable;
  module1.link("../../../../client/scripts/helpers.js", {
    getCSSVariable: function (v) {
      getCSSVariable = v;
    }
  }, 1);
  ___INIT_METEOR_FAST_REFRESH(module);
  var _s = $RefreshSig$();
  var Park = function (_ref) {
    var event = _ref.event,
      athlete = _ref.athlete,
      league = _ref.league,
      primary = _ref.primary,
      secondary = _ref.secondary;
    _s();
    var mapRef = useRef(null);
    var _useState = useState(''),
      _useState2 = _slicedToArray(_useState, 2),
      containerAnimation = _useState2[0],
      setContainerAnimation = _useState2[1];
    var _useState3 = useState(''),
      _useState4 = _slicedToArray(_useState3, 2),
      athleteAnimation = _useState4[0],
      setAthleteAnimation = _useState4[1];
    var setPointData = function () {
      var map = document.querySelector('[data-map]');
      event.run.points.forEach(function (point, index) {
        var anchor = document.querySelectorAll('[data-anchor]')[index];
        var line = document.createElement('div');
        line.classList.add('line');
        line.setAttribute('data-line', index);
        line.style.borderColro = primary;
        line.style.left = "calc(" + anchor.style.left + " + 20px)";
        var markup = "\n\t\t\t\t<h6 class=\"uk-text-uppercase uk-text-bolder\" style=\"color: " + primary + ";\">" + point.title + "</h6>\n\t\t\t\t<p class=\"uk-text-uppercase uk-text-light\">" + point.text + "</p>\n\t\t\t";
        var info = document.createElement('div');
        info.setAttribute('data-info', index);
        info.innerHTML = markup;
        var info2 = document.createElement('div');
        info2.innerHTML = markup;
        line.append(info);
        line.append(info2);
        map.append(line);
        var _line = document.querySelector("[data-line=\"" + index + "\"]");
        var _line$getBoundingClie = _line.getBoundingClientRect(),
          height = _line$getBoundingClie.height;
        _line.style.top = "calc(" + anchor.style.top + " - " + height + "px - 5px)";
      });
    };
    useEffect(function () {
      var delay = parseInt(getCSSVariable('--animate-delay'));
      setContainerAnimation('');
      setAthleteAnimation('');
      setTimeout(function () {
        setContainerAnimation('animate__fadeIn');
        setAthleteAnimation('animate__fadeInUp');
      }, delay);
      setTimeout(function () {}, delay * 2);
      setPointData();
    }, [league]);
    var getCoords = function (event) {
      var map = mapRef.current;
      var _map$getBoundingClien = map.getBoundingClientRect(),
        x = _map$getBoundingClien.x,
        y = _map$getBoundingClien.y,
        width = _map$getBoundingClien.width,
        height = _map$getBoundingClien.height,
        left = _map$getBoundingClien.left,
        top = _map$getBoundingClien.top;
      var clientX = event.clientX - left;
      var clientY = event.clientY - top;
      var _top = clientY / height * 100;
      var _left = clientX / width * 100;
      console.log({
        clientX: clientX,
        clientY: clientY,
        top: _top,
        left: _left
      });
    };
    return /*#__PURE__*/React.createElement("section", {
      ref: mapRef,
      className: "page-event__park uk-padding-small animate__animated " + containerAnimation
    }, /*#__PURE__*/React.createElement("div", {
      className: "page-event__park-athlete animate__animated " + athleteAnimation
    }, /*#__PURE__*/React.createElement("div", {
      className: "page-event__park-athlete-run",
      style: {
        backgroundColor: primary
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "page-event__park-athlete-image"
    }, /*#__PURE__*/React.createElement("img", {
      src: athlete.image
    })), /*#__PURE__*/React.createElement("div", {
      className: "page-event__park-athlete-name uk-text-uppercase uk-text-bold"
    }, /*#__PURE__*/React.createElement("span", null, athlete.name)), /*#__PURE__*/React.createElement("div", {
      className: "page-event__park-athlete-current-run uk-text-uppercase uk-text-bold"
    }, /*#__PURE__*/React.createElement("span", null, "Run ", athlete.run)), /*#__PURE__*/React.createElement("div", {
      className: "page-event__park-athlete-points uk-text-uppercase uk-text-bold"
    }, /*#__PURE__*/React.createElement("span", null, athlete.points)))), /*#__PURE__*/React.createElement("div", {
      "data-map": "map",
      className: "page-event__park-map",
      onClick: getCoords
    }, event.run.points.map(function (point, index) {
      return /*#__PURE__*/React.createElement("div", {
        key: index,
        "data-anchor": index,
        className: "page-event__map-point",
        style: {
          top: point.coords.y,
          left: point.coords.x,
          backgroundColor: primary
        }
      });
    }), /*#__PURE__*/React.createElement("img", {
      src: event.park
    })));
  };
  _s(Park, "QZzid0hpBW92YzoSZuXr1o91TG0=");
  _c = Park;
  var _c;
  $RefreshReg$(_c, "Park");
}.call(this, module);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Sponsors.jsx":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/routes/Event/Sponsors.jsx                                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!function (module1) {
  module1.export({
    Sponsors: function () {
      return Sponsors;
    }
  });
  var React;
  module1.link("react", {
    "default": function (v) {
      React = v;
    }
  }, 0);
  ___INIT_METEOR_FAST_REFRESH(module);
  var Sponsors = function (_ref) {
    var event = _ref.event;
    return /*#__PURE__*/React.createElement("section", {
      className: "page-event__sponsors uk-padding-small"
    }, event.sponsors.map(function (sponsor, index) {
      return /*#__PURE__*/React.createElement("a", {
        key: index
      }, /*#__PURE__*/React.createElement("img", {
        src: sponsor.image
      }));
    }), /*#__PURE__*/React.createElement("div", {
      className: "page-event__sponsors-who"
    }, /*#__PURE__*/React.createElement("p", {
      className: "uk-text-meta uk-text-uppercase"
    }, "This event is brought to you by")));
  };
  _c = Sponsors;
  var _c;
  $RefreshReg$(_c, "Sponsors");
}.call(this, module);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Standings.jsx":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/routes/Event/Standings.jsx                                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!function (module1) {
  var _slicedToArray;
  module1.link("@babel/runtime/helpers/slicedToArray", {
    default: function (v) {
      _slicedToArray = v;
    }
  }, 0);
  module1.export({
    Standings: function () {
      return Standings;
    }
  });
  var React, useEffect, useState;
  module1.link("react", {
    "default": function (v) {
      React = v;
    },
    useEffect: function (v) {
      useEffect = v;
    },
    useState: function (v) {
      useState = v;
    }
  }, 0);
  var getCSSVariable;
  module1.link("../../../../client/scripts/helpers.js", {
    getCSSVariable: function (v) {
      getCSSVariable = v;
    }
  }, 1);
  ___INIT_METEOR_FAST_REFRESH(module);
  var _s = $RefreshSig$();
  var Standings = function (_ref) {
    var athletes = _ref.athletes,
      league = _ref.league,
      primary = _ref.primary,
      secondary = _ref.secondary;
    _s();
    var _useState = useState(''),
      _useState2 = _slicedToArray(_useState, 2),
      animation = _useState2[0],
      setAnimation = _useState2[1];
    useEffect(function () {
      var delay = parseInt(getCSSVariable('--animate-delay'));
      setAnimation('');
      setTimeout(function () {
        setAnimation('animate__fadeIn');
      }, delay);
    }, [league]);
    return /*#__PURE__*/React.createElement("section", {
      className: "page-event__standings uk-padding-small"
    }, /*#__PURE__*/React.createElement("div", {
      className: "page-event__athlete-table animate__animated " + animation
    }, /*#__PURE__*/React.createElement("div", {
      className: "page-event__athlete page-event__athlete--key"
    }, Object.keys(athletes[0]).map(function (key) {
      return /*#__PURE__*/React.createElement("div", {
        key: key,
        className: "page-event__athlete-" + key + " page-event__athlete--heading page-event__athlete--heading-" + key + " uk-text-uppercase uk-text-bold",
        style: {
          backgroundColor: primary
        },
        "data-name": key == 'name' ? 'athlete' : key
      }, /*#__PURE__*/React.createElement("span", null, key == 'name' ? 'athlete' : key));
    })), athletes.filter(function (a) {
      return a.gender == league;
    }).map(function (athlete, index) {
      var place = index + 1;
      var pointsWidth = athlete.points / 10 * 100;
      var delay = index + 1;
      var transitionDelay = '1.' + delay + 's';
      return /*#__PURE__*/React.createElement("a", {
        href: athlete.url,
        key: index,
        className: "page-event__athlete page-event__athlete--item"
      }, /*#__PURE__*/React.createElement("div", {
        className: "page-event__athlete-place",
        "data-index": place
      }, /*#__PURE__*/React.createElement("span", null, place)), /*#__PURE__*/React.createElement("div", {
        className: "page-event__athlete-image"
      }, /*#__PURE__*/React.createElement("img", {
        src: athlete.image
      }), /*#__PURE__*/React.createElement("span", {
        className: "fib fi-" + athlete.country
      })), /*#__PURE__*/React.createElement("div", {
        className: "page-event__athlete-name uk-padding-small",
        style: {
          backgroundColor: primary
        }
      }, /*#__PURE__*/React.createElement("h6", {
        className: "uk-text-normal uk-text-uppercase uk-text-bolder"
      }, athlete.name)), /*#__PURE__*/React.createElement("div", {
        className: "page-event__athlete-run"
      }, /*#__PURE__*/React.createElement("span", {
        className: "uk-text-bolder",
        style: {
          color: primary
        }
      }, athlete.run)), /*#__PURE__*/React.createElement("div", {
        className: "page-event__athlete-points"
      }, /*#__PURE__*/React.createElement("span", {
        className: "uk-text-bolder uk-text-italic",
        style: {
          color: primary
        }
      }, athlete.points)));
    })));
  };
  _s(Standings, "+yr5erg43o222oPC6ff1DtV6KYU=");
  _c = Standings;
  var _c;
  $RefreshReg$(_c, "Standings");
}.call(this, module);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"StandingsTitle.jsx":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/routes/Event/StandingsTitle.jsx                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!function (module1) {
  module1.export({
    StandingsTitle: function () {
      return StandingsTitle;
    }
  });
  var React;
  module1.link("react", {
    "default": function (v) {
      React = v;
    }
  }, 0);
  ___INIT_METEOR_FAST_REFRESH(module);
  var StandingsTitle = function (_ref) {
    var tabs = _ref.tabs,
      tab = _ref.tab,
      setTab = _ref.setTab;
    var index = tabs.findIndex(function (t) {
      return t.slug == tab.slug;
    });
    return /*#__PURE__*/React.createElement("section", {
      className: "page-event__standings-title uk-padding-small"
    }, /*#__PURE__*/React.createElement("button", {
      className: "uk-text-bold uk-h2 uk-text-uppercase",
      onClick: setTab
    }, tabs.map(function (t) {
      var sum = index * 40 * -1;
      var transform = "translateY(" + sum + "px)";
      return /*#__PURE__*/React.createElement("div", {
        key: t.slug,
        className: "page-event__standings-tab",
        style: {
          transform: transform
        }
      }, t.label, /*#__PURE__*/React.createElement("span", {
        className: "icon-group"
      }, /*#__PURE__*/React.createElement("span", {
        className: "icon-up",
        "uk-icon": "icon: triangle-up"
      }), /*#__PURE__*/React.createElement("span", {
        className: "icon-down",
        "uk-icon": "icon: triangle-down"
      })));
    })));
  };
  _c = StandingsTitle;
  var _c;
  $RefreshReg$(_c, "StandingsTitle");
}.call(this, module);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.jsx":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/routes/Event/index.jsx                                                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!function (module1) {
  var _slicedToArray;
  module1.link("@babel/runtime/helpers/slicedToArray", {
    default: function (v) {
      _slicedToArray = v;
    }
  }, 0);
  var _toConsumableArray;
  module1.link("@babel/runtime/helpers/toConsumableArray", {
    default: function (v) {
      _toConsumableArray = v;
    }
  }, 1);
  module1.export({
    Event: function () {
      return Event;
    }
  });
  var React, Fragment, useState, useEffect, useRef;
  module1.link("react", {
    "default": function (v) {
      React = v;
    },
    Fragment: function (v) {
      Fragment = v;
    },
    useState: function (v) {
      useState = v;
    },
    useEffect: function (v) {
      useEffect = v;
    },
    useRef: function (v) {
      useRef = v;
    }
  }, 0);
  module1.link("/node_modules/flag-icons/css/flag-icons.min.css");
  var randomInt, sortBy;
  module1.link("../../../../client/scripts/helpers.js", {
    randomInt: function (v) {
      randomInt = v;
    },
    sortBy: function (v) {
      sortBy = v;
    }
  }, 1);
  var Background;
  module1.link("./Background", {
    Background: function (v) {
      Background = v;
    }
  }, 2);
  var Info;
  module1.link("./Info", {
    Info: function (v) {
      Info = v;
    }
  }, 3);
  var StandingsTitle;
  module1.link("./StandingsTitle", {
    StandingsTitle: function (v) {
      StandingsTitle = v;
    }
  }, 4);
  var Standings;
  module1.link("./Standings", {
    Standings: function (v) {
      Standings = v;
    }
  }, 5);
  var Park;
  module1.link("./Park", {
    Park: function (v) {
      Park = v;
    }
  }, 6);
  var Sponsors;
  module1.link("./Sponsors.jsx", {
    Sponsors: function (v) {
      Sponsors = v;
    }
  }, 7);
  ___INIT_METEOR_FAST_REFRESH(module);
  var _s = $RefreshSig$();
  var Event = function (props) {
    _s();
    var mainRef = useRef(null);
    var keys = ['place', 'image', 'name', 'gender', 'run', 'points'];
    var primary = props.event.theme.primary;
    var secondary = props.event.theme.secondary;
    var _athletes = _toConsumableArray(props.event.athletes).map(function (athlete, index) {
      var multiplier = (randomInt(4, 9) / 100).toFixed(2);
      var decimal = 0.13 * index;
      athlete.points = (multiplier * 100 + decimal).toFixed(2);
      athlete.run = 1;
      if (index < 4) athlete.run = 2;
      var obj = {};
      keys.forEach(function (key) {
        return obj[key] = athlete[key];
      });
      return obj;
    });
    _athletes = sortBy(_athletes, 'points', true);
    var _useState = useState(_athletes),
      _useState2 = _slicedToArray(_useState, 2),
      athletes = _useState2[0],
      setAthletes = _useState2[1];
    var _useState3 = useState([{
        label: /*#__PURE__*/React.createElement(Fragment, null, "Men's", ' ', /*#__PURE__*/React.createElement("span", {
          className: "standings-label",
          style: {
            color: primary
          }
        }, "Standings")),
        slug: 'male',
        active: true
      }, {
        label: /*#__PURE__*/React.createElement(Fragment, null, "Women's", /*#__PURE__*/React.createElement("span", {
          className: "standings-label",
          style: {
            color: primary
          }
        }, "Standings")),
        slug: 'female',
        active: false
      }, {
        label: /*#__PURE__*/React.createElement(Fragment, null, "Park", /*#__PURE__*/React.createElement("span", {
          className: "standings-label",
          style: {
            color: primary
          }
        }, "View")),
        slug: 'park',
        active: false
      }]),
      _useState4 = _slicedToArray(_useState3, 2),
      tabs = _useState4[0],
      setTabs = _useState4[1];
    var setTab = function () {
      var state = _toConsumableArray(tabs);
      var index = tabs.findIndex(function (tab) {
        return tab.active;
      });
      var nextIndex = index + 1;
      var limit = state.length - 1;
      state = state.map(function (tab) {
        tab.active = false;
        return tab;
      });
      if (nextIndex > limit) {
        state[0].active = true;
      } else {
        state[nextIndex].active = true;
      }
      setTabs(state);
    };
    useEffect(function () {
      var mainEl = mainRef.current;
      mainEl.classList.add('active');
    }, []);
    var tab = tabs.find(function (tab) {
      return tab.active;
    });
    var displayStandings = false;
    if (tab.slug == 'male' || tab.slug == 'female') displayStandings = true;
    return /*#__PURE__*/React.createElement("main", {
      ref: mainRef,
      className: "page-event"
    }, /*#__PURE__*/React.createElement(Background, {
      event: props.event,
      primary: primary,
      secondary: secondary
    }), /*#__PURE__*/React.createElement(Info, {
      event: props.event,
      primary: primary,
      secondary: secondary
    }), /*#__PURE__*/React.createElement(StandingsTitle, {
      tabs: tabs,
      tab: tab,
      setTab: setTab
    }), displayStandings && /*#__PURE__*/React.createElement(Fragment, null, /*#__PURE__*/React.createElement(Standings, {
      athletes: athletes,
      primary: primary,
      secondary: secondary,
      league: tab.slug
    })), !displayStandings && /*#__PURE__*/React.createElement(Park, {
      event: props.event,
      athlete: athletes[0],
      league: tab.slug,
      primary: primary,
      secondary: secondary
    }), /*#__PURE__*/React.createElement(Sponsors, {
      event: props.event,
      primary: primary,
      secondary: secondary,
      league: tab.slug
    }));
  };
  _s(Event, "IlYMT1Nlu4Z44Ce9MB0GOpepsx0=");
  _c = Event;
  var _c;
  $RefreshReg$(_c, "Event");
}.call(this, module);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"Events.jsx":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/routes/Events.jsx                                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!function (module1) {
  var _toConsumableArray;
  module1.link("@babel/runtime/helpers/toConsumableArray", {
    default: function (v) {
      _toConsumableArray = v;
    }
  }, 0);
  var _slicedToArray;
  module1.link("@babel/runtime/helpers/slicedToArray", {
    default: function (v) {
      _slicedToArray = v;
    }
  }, 1);
  module1.export({
    Events: function () {
      return Events;
    }
  });
  var React, useState;
  module1.link("react", {
    "default": function (v) {
      React = v;
    },
    useState: function (v) {
      useState = v;
    }
  }, 0);
  var Tabs;
  module1.link("../components/Tabs.jsx", {
    Tabs: function (v) {
      Tabs = v;
    }
  }, 1);
  var ImageGrid;
  module1.link("../components/ImageGrid.jsx", {
    ImageGrid: function (v) {
      ImageGrid = v;
    }
  }, 2);
  var data;
  module1.link("../../../client/scripts/data.js", {
    "default": function (v) {
      data = v;
    }
  }, 3);
  ___INIT_METEOR_FAST_REFRESH(module);
  var _s = $RefreshSig$();
  var Events = function (props) {
    _s();
    var events = data.events();
    var _useState = useState(),
      _useState2 = _slicedToArray(_useState, 2),
      search = _useState2[0],
      setSearch = _useState2[1];
    var applySearch = function (value) {
      if (!value || value == '') return events;
      var _value = value.toLowerCase();
      var _events = _toConsumableArray(events).filter(function (event) {
        var title = event.title.toLowerCase();
        var subtitle = event.subtitle.toLowerCase();
        var description = event.description.toLowerCase();
        if (title && title.indexOf(value) > -1 || subtitle && subtitle.indexOf(value) > -1 || description && description.indexOf(value) > -1) {
          return event;
        }
      });
      return _events;
    };
    return /*#__PURE__*/React.createElement("main", {
      className: "page-events",
      "uk-filter": "target: .js-filter; animation: slide"
    }, /*#__PURE__*/React.createElement("section", {
      className: "page-events__search uk-container uk-padding-large"
    }, /*#__PURE__*/React.createElement("div", {
      className: "uk-grid-small",
      "uk-grid": "uk-grid"
    }, /*#__PURE__*/React.createElement("div", {
      className: "uk-width-1-1"
    }, /*#__PURE__*/React.createElement("form", {
      className: "uk-search uk-search-default"
    }, /*#__PURE__*/React.createElement("a", {
      "uk-search-icon": "uk-search-icon"
    }), /*#__PURE__*/React.createElement("input", {
      className: "uk-search-input",
      type: "search",
      placeholder: "Search Events",
      "aria-label": "Search Events",
      onChange: function (event) {
        return setSearch(event.currentTarget.value);
      }
    })), /*#__PURE__*/React.createElement(Tabs, {
      tabs: [{
        title: 'Park'
      }, {
        title: 'Pipe'
      }, {
        title: 'Big Wave'
      }, {
        title: "Men's"
      }, {
        title: "Women's"
      }, {
        title: 'Coed'
      }]
    })))), /*#__PURE__*/React.createElement(ImageGrid, {
      title: "Upcoming Events",
      items: applySearch(search),
      grid: "uk-child-width-1-2@s uk-child-width-1-3@m",
      filter: true,
      fillImage: true
    }));
  };
  _s(Events, "KLrPbisl3Mlzlvtc6UZb5fIFlSg=");
  _c = Events;
  var _c;
  $RefreshReg$(_c, "Events");
}.call(this, module);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Home.jsx":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/routes/Home.jsx                                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!function (module1) {
  module1.export({
    Home: function () {
      return Home;
    }
  });
  var React;
  module1.link("react", {
    "default": function (v) {
      React = v;
    }
  }, 0);
  var Banner;
  module1.link("/imports/ui/components/Banner", {
    Banner: function (v) {
      Banner = v;
    }
  }, 1);
  var ImageGrid;
  module1.link("/imports/ui/components/ImageGrid", {
    ImageGrid: function (v) {
      ImageGrid = v;
    }
  }, 2);
  var data;
  module1.link("../../../client/scripts/data.js", {
    "default": function (v) {
      data = v;
    }
  }, 3);
  ___INIT_METEOR_FAST_REFRESH(module);
  var Home = function (props) {
    var events = data.events({
      setRoute: props.setRoute
    }).slice(0, 3);
    return /*#__PURE__*/React.createElement("main", {
      className: "page-home"
    }, /*#__PURE__*/React.createElement(Banner, {
      items: [{
        video: true,
        src: 'banner.mp4',
        title: /*#__PURE__*/React.createElement("span", null, "Waco Surf Trip with the ", /*#__PURE__*/React.createElement("br", null), "GoPro Surf Team"),
        subtitle: 'Live',
        description: "Texas isn't known for its surfing, but Waco Surf has changed the game.",
        buttonText: 'Watch Now',
        buttonUrl: 'https://www.youtube.com/watch?v=jfGuUD-inBM'
      }, {
        src: 'banner-image-1.png',
        title: /*#__PURE__*/React.createElement("span", null, "The Rail Project: ", /*#__PURE__*/React.createElement("br", null), "Julian Wilson has ride of his life as he surf-skates in water"),
        subtitle: 'VOD',
        description: 'A new kind of skate park.',
        buttonText: 'Watch Now',
        buttonUrl: 'https://www.youtube.com/watch?v=y2CTZ5GtMUA'
      }]
    }), /*#__PURE__*/React.createElement(ImageGrid, {
      title: "What's Going Down",
      items: events,
      grid: "uk-child-width-1-2@s uk-child-width-1-3@m uk-child-width-1-4@l"
    }));
  };
  _c = Home;
  var _c;
  $RefreshReg$(_c, "Home");
}.call(this, module);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"components":{"Banner.jsx":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/components/Banner.jsx                                                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!function (module1) {
  module1.export({
    Banner: function () {
      return Banner;
    }
  });
  var React;
  module1.link("react", {
    "default": function (v) {
      React = v;
    }
  }, 0);
  ___INIT_METEOR_FAST_REFRESH(module);
  var Banner = function (_ref) {
    var _ref$items = _ref.items,
      items = _ref$items === void 0 ? [] : _ref$items;
    return /*#__PURE__*/React.createElement("section", {
      className: "banner uk-cover-container"
    }, /*#__PURE__*/React.createElement("div", {
      "uk-slideshow": "animation: pull; autoplay: true; pause-on-hover: false"
    }, /*#__PURE__*/React.createElement("ul", {
      className: "uk-slideshow-items"
    }, items.map(function (item, index) {
      return /*#__PURE__*/React.createElement("li", {
        key: index
      }, item.video && /*#__PURE__*/React.createElement("video", {
        src: item.src,
        width: "",
        height: "",
        "uk-video": "uk-video",
        "uk-video": "autoplay: inview",
        autoPlay: "autoPlay",
        automute: "true",
        loop: "loop",
        playsInline: true
      }), !item.video && /*#__PURE__*/React.createElement("img", {
        src: item.src,
        alt: item.title
      }), /*#__PURE__*/React.createElement("div", {
        className: "banner__content uk-container"
      }, item.subtitle && /*#__PURE__*/React.createElement("h4", null, item.subtitle), item.title && /*#__PURE__*/React.createElement("h3", {
        className: "uk-text-bold"
      }, item.title), item.description && /*#__PURE__*/React.createElement("p", null, item.description), item.buttonText && item.buttonUrl && /*#__PURE__*/React.createElement("a", {
        href: item.buttonUrl,
        className: "uk-button uk-button-danger"
      }, item.buttonText)));
    })), /*#__PURE__*/React.createElement("ul", {
      className: "uk-slideshow-nav uk-dotnav"
    })));
  };
  _c = Banner;
  var _c;
  $RefreshReg$(_c, "Banner");
}.call(this, module);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Footer.jsx":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/components/Footer.jsx                                                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!function (module1) {
  module1.export({
    Footer: function () {
      return Footer;
    }
  });
  var React, useEffect;
  module1.link("react", {
    "default": function (v) {
      React = v;
    },
    useEffect: function (v) {
      useEffect = v;
    }
  }, 0);
  ___INIT_METEOR_FAST_REFRESH(module);
  var Footer = function () {
    return /*#__PURE__*/React.createElement("footer", null, /*#__PURE__*/React.createElement("div", {
      className: "uk-container uk-padding-large"
    }, /*#__PURE__*/React.createElement("div", {
      className: "uk-child-width-expand@s uk-grid",
      "uk-grid": "true"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("ul", {
      className: "uk-list"
    }, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
      href: "/"
    }, "Products & Company")), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
      href: "/"
    }, "Media")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("ul", {
      className: "uk-list"
    }, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
      href: "/"
    }, "Terms of Use")), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
      href: "/"
    }, "Privacy Policy")), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
      href: "/"
    }, "Cookies")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("li", {
      className: "uk-text-right@l"
    }, /*#__PURE__*/React.createElement("span", null, "\xA9 ", new Date().getFullYear(), " Local Legends"))))));
  };
  _c = Footer;
  var _c;
  $RefreshReg$(_c, "Footer");
}.call(this, module);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"ImageGrid.jsx":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/components/ImageGrid.jsx                                                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!function (module1) {
  module1.export({
    ImageGrid: function () {
      return ImageGrid;
    }
  });
  var React;
  module1.link("react", {
    "default": function (v) {
      React = v;
    }
  }, 0);
  var handleize;
  module1.link("../../../client/scripts/helpers.js", {
    handleize: function (v) {
      handleize = v;
    }
  }, 1);
  ___INIT_METEOR_FAST_REFRESH(module);
  var ImageGrid = function (_ref) {
    var _ref$grid = _ref.grid,
      grid = _ref$grid === void 0 ? 'uk-child-width-expand@s' : _ref$grid,
      _ref$filter = _ref.filter,
      filter = _ref$filter === void 0 ? false : _ref$filter,
      _ref$fillImage = _ref.fillImage,
      fillImage = _ref$fillImage === void 0 ? false : _ref$fillImage,
      _ref$items = _ref.items,
      items = _ref$items === void 0 ? [] : _ref$items,
      _ref$title = _ref.title,
      title = _ref$title === void 0 ? '' : _ref$title,
      _ref$setRoute = _ref.setRoute,
      setRoute = _ref$setRoute === void 0 ? null : _ref$setRoute;
    return /*#__PURE__*/React.createElement("section", {
      className: "image-grid"
    }, items && items.length && /*#__PURE__*/React.createElement("div", {
      className: "uk-container uk-padding"
    }, title && /*#__PURE__*/React.createElement("h3", {
      className: "image-grid__title uk-text-bold"
    }, title), /*#__PURE__*/React.createElement("div", {
      className: "uk-grid " + grid + (filter && ' js-filter'),
      "uk-grid": "masonry: true"
    }, items.map(function (item, index) {
      var className = '';
      if (index == 0) className += ' uk-first-column';
      if (fillImage) className += ' image_grid-item--fill-image';
      if (filter && item.tag) className += ' tag-all tag-' + handleize(item.tag);
      var date = null;
      if (item.date) {
        className += ' image_grid-item--date';
        date = item.date.split('-');
      }
      return /*#__PURE__*/React.createElement("a", {
        key: item.id ? item.id : index,
        className: className,
        onClick: function (event) {
          return item.setRoute(event, item);
        }
      }, /*#__PURE__*/React.createElement("div", {
        className: "uk-card uk-card-default uk-card-body"
      }, /*#__PURE__*/React.createElement("div", {
        className: "image-grid__item-image"
      }, /*#__PURE__*/React.createElement("img", {
        "data-image": item.id ? item.id : index,
        src: item.image
      })), /*#__PURE__*/React.createElement("div", {
        className: "uk-padding image-grid__item-body"
      }, date && /*#__PURE__*/React.createElement("div", {
        className: "image-grid__item-date"
      }, /*#__PURE__*/React.createElement("div", {
        className: "image-grid__item-date-day uk-text-bold uk-text-large"
      }, date[1]), /*#__PURE__*/React.createElement("div", {
        className: "image-grid__item-date-month-year uk-text-small"
      }, date[0], " / ", date[2])), /*#__PURE__*/React.createElement("div", {
        className: "image-grid__item-content"
      }, /*#__PURE__*/React.createElement("h3", null, item.title), /*#__PURE__*/React.createElement("p", null, item.description), item.url && /*#__PURE__*/React.createElement("button", {
        href: item.url,
        className: "uk-button uk-button-danger uk-button-medium"
      }, "View")))));
    }))));
  };
  _c = ImageGrid;
  var _c;
  $RefreshReg$(_c, "ImageGrid");
}.call(this, module);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Navbar.jsx":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/components/Navbar.jsx                                                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!function (module1) {
  var _regeneratorRuntime;
  module1.link("@babel/runtime/regenerator", {
    default: function (v) {
      _regeneratorRuntime = v;
    }
  }, 0);
  module1.export({
    Navbar: function () {
      return Navbar;
    }
  });
  var React, useRef, Fragment;
  module1.link("react", {
    "default": function (v) {
      React = v;
    },
    useRef: function (v) {
      useRef = v;
    },
    Fragment: function (v) {
      Fragment = v;
    }
  }, 0);
  var Footer;
  module1.link("./Footer.jsx", {
    Footer: function (v) {
      Footer = v;
    }
  }, 1);
  var asyncTimeout;
  module1.link("../../../client/scripts/helpers.js", {
    asyncTimeout: function (v) {
      asyncTimeout = v;
    }
  }, 2);
  ___INIT_METEOR_FAST_REFRESH(module);
  var _s = $RefreshSig$();
  var Navbar = function (props) {
    _s();
    var active = 'mobile-nav--active';
    var ref = useRef(null);
    var _route = null;
    var toggleMenu = function () {
      function _callee(event) {
        var target;
        return _regeneratorRuntime.async(function () {
          function _callee$(_context) {
            while (1) switch (_context.prev = _context.next) {
              case 0:
                event.preventDefault();
                target = ref.current;
                if (!(target.className.indexOf(active) > -1)) {
                  _context.next = 5;
                  break;
                }
                target.classList.remove(active);
                return _context.abrupt("return");
              case 5:
                target.classList.add(active);
              case 6:
              case "end":
                return _context.stop();
            }
          }
          return _callee$;
        }(), null, null, null, Promise);
      }
      return _callee;
    }();
    for (var route in meteorBabelHelpers.sanitizeForInObject(props.routes)) {
      if (props.routes[route].active) _route = props.routes[route];
    }
    var backgroundColor = 'transparent';
    if (_route && _route.background) backgroundColor = _route.background;
    return /*#__PURE__*/React.createElement(Fragment, null, /*#__PURE__*/React.createElement("header", {
      "uk-sticky": "sel-target: .uk-navbar-container; cls-active: uk-navbar-sticky; end: + *;",
      style: {
        backgroundColor: backgroundColor
      }
    }, /*#__PURE__*/React.createElement("nav", {
      className: "uk-navbar-container"
    }, /*#__PURE__*/React.createElement("div", {
      className: "uk-container"
    }, /*#__PURE__*/React.createElement("div", {
      "uk-navbar": "uk-navbar"
    }, /*#__PURE__*/React.createElement("div", {
      className: "uk-navbar-left"
    }, /*#__PURE__*/React.createElement("div", {
      className: "icon-container"
    }, /*#__PURE__*/React.createElement("a", {
      href: "#",
      "uk-icon": "icon: grid",
      onClick: function (event) {
        return toggleMenu(event);
      }
    })), /*#__PURE__*/React.createElement("a", {
      className: "uk-navbar-item uk-logo",
      href: "#",
      "aria-label": "Back to Home"
    }, /*#__PURE__*/React.createElement("img", {
      src: "logo.png"
    }))), /*#__PURE__*/React.createElement("div", {
      className: "uk-navbar-center"
    }, /*#__PURE__*/React.createElement("ul", {
      className: "uk-navbar-nav"
    }, Object.keys(props.routes).map(function (route, index) {
      if (!props.routes[route].hidden) {
        return /*#__PURE__*/React.createElement("li", {
          key: index
        }, /*#__PURE__*/React.createElement("a", {
          onClick: function () {
            return props.setRoute(route);
          }
        }, route));
      }
    }))), /*#__PURE__*/React.createElement("div", {
      className: "uk-navbar-right"
    }, /*#__PURE__*/React.createElement("div", {
      className: "icon-container"
    }, /*#__PURE__*/React.createElement("a", {
      href: "#",
      "uk-icon": "icon: search"
    })), /*#__PURE__*/React.createElement("div", {
      className: "icon-container"
    }, /*#__PURE__*/React.createElement("a", {
      href: "#",
      "uk-icon": "icon: user"
    }))))))), /*#__PURE__*/React.createElement("div", {
      className: "mobile-nav",
      ref: ref
    }, /*#__PURE__*/React.createElement("div", {
      className: "uk-container"
    }, /*#__PURE__*/React.createElement("div", {
      "uk-navbar": "uk-navbar"
    }, /*#__PURE__*/React.createElement("div", {
      className: "uk-navbar-left"
    }, /*#__PURE__*/React.createElement("div", {
      className: "icon-container"
    }, /*#__PURE__*/React.createElement("a", {
      className: "icon-close",
      href: "#",
      "uk-icon": "icon: close",
      onClick: function (event) {
        return toggleMenu(event);
      }
    })), /*#__PURE__*/React.createElement("a", {
      className: "uk-navbar-item uk-logo",
      href: "#",
      "aria-label": "Back to Home"
    }, /*#__PURE__*/React.createElement("img", {
      src: "logo.png"
    }))), /*#__PURE__*/React.createElement("div", {
      className: "uk-navbar-center"
    }), /*#__PURE__*/React.createElement("div", {
      className: "uk-navbar-right"
    }, /*#__PURE__*/React.createElement("div", {
      className: "icon-container"
    }, /*#__PURE__*/React.createElement("a", {
      className: "icon-user",
      href: "#",
      "uk-icon": "icon: user"
    }))))), /*#__PURE__*/React.createElement("div", {
      className: "mobile-nav__overflow"
    }, /*#__PURE__*/React.createElement("div", {
      className: "uk-container"
    }, /*#__PURE__*/React.createElement("form", {
      className: "uk-search uk-search-default"
    }, /*#__PURE__*/React.createElement("span", {
      "uk-search-icon": "uk-search-icon"
    }), /*#__PURE__*/React.createElement("input", {
      className: "uk-search-input",
      type: "search",
      placeholder: "Search the Nation for events",
      "aria-label": "Search the Nation for events"
    }))), /*#__PURE__*/React.createElement("div", {
      className: "uk-container uk-padding-small"
    }, /*#__PURE__*/React.createElement("nav", {
      "uk-grid": "uk-grid"
    }, /*#__PURE__*/React.createElement("div", {
      className: "uk-width-1-1 uk-width-1-3@m"
    }, /*#__PURE__*/React.createElement("ul", {
      className: "uk-nav"
    }, Object.keys(props.routes).map(function (route, index) {
      if (!props.routes[route].hidden) {
        return /*#__PURE__*/React.createElement("li", {
          key: index
        }, /*#__PURE__*/React.createElement("a", {
          className: "uk-text-uppercase",
          onClick: function () {
            return props.setRoute(route);
          }
        }, route));
      }
    }))), /*#__PURE__*/React.createElement("div", {
      className: "browse-by uk-width-1-1 uk-width-2-3@m"
    }, /*#__PURE__*/React.createElement("h3", {
      className: "uk-text-bold"
    }, "Browse Nearby Events"), /*#__PURE__*/React.createElement("div", {
      className: "uk-position-relative uk-visible-toggle uk-light",
      tabIndex: "-1",
      "uk-slider": "uk-slider"
    }, /*#__PURE__*/React.createElement("ul", {
      className: "uk-slider-items uk-child-width-1-2 uk-child-width-1-3@s uk-child-width-1-4@m"
    }, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("img", {
      src: "red-bull-magnitude.png",
      alt: ""
    }), /*#__PURE__*/React.createElement("div", {
      className: "uk-position-center uk-panel uk-padding-small"
    }, /*#__PURE__*/React.createElement("h6", null, "Red Bull Magnitude"))), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("img", {
      src: "foam-wreckers.png",
      alt: ""
    }), /*#__PURE__*/React.createElement("div", {
      className: "uk-position-center uk-panel uk-padding-small"
    }, /*#__PURE__*/React.createElement("h6", null, "Red Bull Foam Wreckers: Cocoa Beach, Florida"))), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("img", {
      src: "tudor.png",
      alt: ""
    }), /*#__PURE__*/React.createElement("div", {
      className: "uk-position-center uk-panel uk-padding-small"
    }, /*#__PURE__*/React.createElement("h6", null, "TUDOR Nazar\xE9 Big Wave Challenge"))), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("img", {
      src: "us-open.png",
      alt: ""
    }), /*#__PURE__*/React.createElement("div", {
      className: "uk-position-center uk-panel uk-padding-small"
    }, /*#__PURE__*/React.createElement("h6", null, "US Open of Surfing"))), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("img", {
      src: "foam-wreckers-new-york.png",
      alt: ""
    }), /*#__PURE__*/React.createElement("div", {
      className: "uk-position-center uk-panel uk-padding-small"
    }, /*#__PURE__*/React.createElement("h6", null, "Red Bull Foam Wreckers: Rockaway Beach, New York")))), /*#__PURE__*/React.createElement("a", {
      className: "uk-position-center-left uk-position-small uk-hidden-hover",
      href: "/",
      "uk-slidenav-previous": "uk-slidenav-previous",
      "uk-slider-item": "previous"
    }), /*#__PURE__*/React.createElement("a", {
      className: "uk-position-center-right uk-position-small uk-hidden-hover",
      href: "/",
      "uk-slidenav-next": "uk-slidenav-next",
      "uk-slider-item": "next"
    }))), /*#__PURE__*/React.createElement("div", {
      className: "browse-by uk-width-1-1 uk-width-1-1"
    }, /*#__PURE__*/React.createElement("h3", {
      className: "uk-text-bold"
    }, "Browse Nearby Parks"), /*#__PURE__*/React.createElement("div", {
      className: "uk-position-relative uk-visible-toggle uk-light",
      tabIndex: "-1",
      "uk-slider": "uk-slider"
    }, /*#__PURE__*/React.createElement("ul", {
      className: "uk-slider-items uk-child-width-1-2 uk-child-width-1-3@s uk-child-width-1-4@m"
    }, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("img", {
      src: "bsr.jpeg",
      alt: ""
    }), /*#__PURE__*/React.createElement("div", {
      className: "uk-position-center uk-panel"
    }, /*#__PURE__*/React.createElement("h3", null, "BSR Surf Resort"))), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("img", {
      src: "surf-lakes.jpeg",
      alt: ""
    }), /*#__PURE__*/React.createElement("div", {
      className: "uk-position-center uk-panel"
    }, /*#__PURE__*/React.createElement("h3", null, "Surf Lakes"))), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("img", {
      src: "art-wave.jpeg",
      alt: ""
    }), /*#__PURE__*/React.createElement("div", {
      className: "uk-position-center uk-panel"
    }, /*#__PURE__*/React.createElement("h3", null, "Artwave Surf "))), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("img", {
      src: "unit.jpeg",
      alt: ""
    }), /*#__PURE__*/React.createElement("div", {
      className: "uk-position-center uk-panel"
    }, /*#__PURE__*/React.createElement("h3", null, "UNIT Surf Poo")))), /*#__PURE__*/React.createElement("a", {
      className: "uk-position-center-left uk-position-small uk-hidden-hover",
      href: "/",
      "uk-slidenav-previous": "uk-slidenav-previous",
      "uk-slider-item": "previous"
    }), /*#__PURE__*/React.createElement("a", {
      className: "uk-position-center-right uk-position-small uk-hidden-hover",
      href: "/",
      "uk-slidenav-next": "uk-slidenav-next",
      "uk-slider-item": "next"
    }))))), /*#__PURE__*/React.createElement(Footer, null))));
  };
  _s(Navbar, "QMBuJFIdzLIeqBcFwhMf246mjOM=");
  _c = Navbar;
  var _c;
  $RefreshReg$(_c, "Navbar");
}.call(this, module);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Tabs.jsx":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/components/Tabs.jsx                                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!function (module1) {
  module1.export({
    Tabs: function () {
      return Tabs;
    }
  });
  var React;
  module1.link("react", {
    "default": function (v) {
      React = v;
    }
  }, 0);
  var handleize;
  module1.link("../../../client/scripts/helpers.js", {
    handleize: function (v) {
      handleize = v;
    }
  }, 1);
  ___INIT_METEOR_FAST_REFRESH(module);
  var Tabs = function (_ref) {
    var _ref$tabs = _ref.tabs,
      tabs = _ref$tabs === void 0 ? [] : _ref$tabs;
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("ul", {
      className: "tabs uk-tab"
    }, /*#__PURE__*/React.createElement("li", {
      className: "uk-box-shadow-small uk-active",
      "uk-filter-control": ".tag-all"
    }, /*#__PURE__*/React.createElement("a", null, "All")), tabs.map(function (tab, index) {
      return /*#__PURE__*/React.createElement("li", {
        key: index,
        className: "uk-box-shadow-small",
        "uk-filter-control": ".tag-" + handleize(tab.title)
      }, /*#__PURE__*/React.createElement("a", null, tab.title));
    })));
  };
  _c = Tabs;
  var _c;
  $RefreshReg$(_c, "Tabs");
}.call(this, module);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"App.jsx":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/App.jsx                                                                                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!function (module1) {
  var _regeneratorRuntime;
  module1.link("@babel/runtime/regenerator", {
    default: function (v) {
      _regeneratorRuntime = v;
    }
  }, 0);
  var _objectSpread;
  module1.link("@babel/runtime/helpers/objectSpread2", {
    default: function (v) {
      _objectSpread = v;
    }
  }, 1);
  var _slicedToArray;
  module1.link("@babel/runtime/helpers/slicedToArray", {
    default: function (v) {
      _slicedToArray = v;
    }
  }, 2);
  module1.export({
    App: function () {
      return App;
    }
  });
  var React, Fragment, useState;
  module1.link("react", {
    "default": function (v) {
      React = v;
    },
    Fragment: function (v) {
      Fragment = v;
    },
    useState: function (v) {
      useState = v;
    }
  }, 0);
  var Navbar;
  module1.link("/imports/ui/components/Navbar", {
    Navbar: function (v) {
      Navbar = v;
    }
  }, 1);
  var Home;
  module1.link("/imports/ui/routes/Home", {
    Home: function (v) {
      Home = v;
    }
  }, 2);
  var Events;
  module1.link("/imports/ui/routes/Events", {
    Events: function (v) {
      Events = v;
    }
  }, 3);
  var Event;
  module1.link("/imports/ui/routes/Event/index.jsx", {
    Event: function (v) {
      Event = v;
    }
  }, 4);
  var Footer;
  module1.link("/imports/ui/components/Footer", {
    Footer: function (v) {
      Footer = v;
    }
  }, 5);
  var data;
  module1.link("../../client/scripts/data.js", {
    "default": function (v) {
      data = v;
    }
  }, 6);
  var transition;
  module1.link("../../client/scripts/helpers.js", {
    transition: function (v) {
      transition = v;
    }
  }, 7);
  ___INIT_METEOR_FAST_REFRESH(module);
  var _s = $RefreshSig$();
  var test = {
    'id': 1,
    'tag': 'Park',
    'title': 'The Hawaiian Islands',
    'location': 'Haleiwa,Oahu, United States',
    'description': "The HIC Haleiwa Pro is a premier surfing competition that takes place in the captivating backdrop of the Hawaiian Islands. Known for its thrilling waves and stunning coastal scenery, this event is a highlight on the professional surfing calendar. Surfers from around the world converge on the iconic North Shore of Oahu to showcase their skills and compete for top honors. The competition is a part of the World Surf League's Qualifying Series, attracting elite surfers eager to conquer the challenging waves of Haleiwa. With its rich surfing culture, warm hospitality, and breathtaking ocean views, the HIC Haleiwa Pro not only celebrates the sport but also pays homage to the unique spirit of Hawaii's surf culture. It's an event where passion meets skill, and spectators are treated to an exhilarating display of talent against the backdrop of one of the world's most iconic surfing destinations.",
    'image': 'hic.jpeg',
    'subtitle': 'HIC Haleiwa Pro',
    'start_date': '07-12-2024',
    'end_date': '07-15-2024',
    'url': '/a',
    'athletes': [{
      'birthstart_date': 'Apr 16, 1995',
      'end_date': 'Apr 16, 1995',
      'gender': 'male',
      'hometown': 'Ubatuba, São Paulo',
      'country': 'br',
      'image': 'fillipe-toledo.png',
      'name': 'Filipe Toledo',
      'stance': 'regular',
      'weight': 154,
      'height': {
        'feet': 5,
        'inches': 9
      }
    }, {
      'birthstart_date': 'Sep 2, 1998',
      'end_date': 'Sep 2, 1998',
      'gender': 'male',
      'hometown': 'North Stradbroke Island, Queensland, Australia',
      'country': 'au',
      'image': 'ethan-ewing.png',
      'name': 'Ethan Ewing',
      'weight': 169,
      'stance': 'regular',
      'height': {
        'feet': 5,
        'inches': 11
      }
    }, {
      'birthstart_date': 'Jul 29, 1998',
      'end_date': 'Jul 29, 1998',
      'hometown': 'San Clemente, California',
      'country': 'us',
      'gender': 'male',
      'image': 'griffin-colapinto.png',
      'name': 'Griffin Colapinto',
      'stance': 'regular',
      'weight': 171,
      'height': {
        'feet': 5,
        'inches': 11
      }
    }, {
      'birthstart_date': 'Aug 30, 2000',
      'end_date': 'Aug 30, 2000',
      'hometown': 'Saquarema',
      'country': 'br',
      'gender': 'male',
      'image': 'joao-chianca.png',
      'name': 'Joao Chianca',
      'stance': 'regular',
      'weight': 171,
      'height': {
        'feet': 5,
        'inches': 11
      }
    }, {
      'birthstart_date': 'Dec 27, 1997',
      'end_date': 'Dec 27, 1997',
      'hometown': 'Margaret River',
      'country': 'au',
      'gender': 'male',
      'image': 'jack-robinson-1.png',
      'name': 'Jack Robinson',
      'stance': 'regular',
      'weight': 178,
      'height': {
        'feet': 5,
        'inches': 11
      }
    }, {
      'birthstart_date': 'Aug 27, 1992',
      'end_date': 'Aug 27, 1992',
      'name': 'Carissa Moore',
      'image': 'carissa-moore.png',
      'hometown': 'Honolulu, Oahu, Hawaii',
      'country': 'us',
      'gender': 'female',
      'weight': 154,
      'stance': 'regular',
      'height': {
        'feet': 5,
        'inches': 7
      }
    }, {
      'birthstart_date': 'Oct 26, 2005',
      'end_date': 'Oct 26, 2005',
      'name': 'Caitlin Simmers',
      'image': 'caitlin-simmers.png',
      'hometown': 'Oceanside, CA',
      'country': 'us',
      'gender': 'female',
      'weight': 114,
      'stance': 'regular',
      'height': {
        'feet': 5,
        'inches': 3
      }
    }, {
      'birthstart_date': ' May 9, 1996',
      'end_date': ' May 9, 1996',
      'name': 'Tatiana Weston-Webb',
      'image': 'tatiana.png',
      'hometown': 'Princeville, Kauai, Hawaii',
      'country': 'us',
      'gender': 'female',
      'weight': 127,
      'stance': 'Goofy',
      'height': {
        'feet': 5,
        'inches': 4
      }
    }],
    'logo': './event-logo-dark.png',
    'sponsors': [{
      'image': 'activision.png',
      'url': ''
    }, {
      'image': 'sharpeye.png',
      'url': ''
    }, {
      'image': 'redbull.png',
      'url': ''
    }, {
      'image': 'hurley.png',
      'url': ''
    }, {
      'image': 'oneil.png',
      'url': ''
    }, {
      'image': 'slater.png',
      'url': ''
    }],
    'theme': {
      'primary': 'var(--primary)',
      'secondary': 'var(--secondary)'
    },
    'park': './wavepark-1.png',
    'run': {
      points: [{
        title: 'Wave 1',
        text: 'Tail Slide',
        coords: {
          x: '78%',
          y: '22%'
        }
      }, {
        title: 'Wave 2',
        text: 'Aerial',
        coords: {
          x: '80.2%',
          y: '30.5%'
        }
      }, {
        title: 'Wave 3',
        text: 'Snap',
        coords: {
          x: '57%',
          y: '45.5%'
        }
      }, {
        title: 'Wave 4',
        text: 'Off-the-Lip',
        coords: {
          x: '50%',
          y: '67%'
        }
      }]
    }
  };
  var App = function () {
    _s();
    var _useState = useState({
        home: {
          background: 'transparent',
          active: true
        },
        events: {
          background: 'var(--blue-700)',
          active: false
        },
        event: {
          background: 'transparent',
          active: false,
          props: test,
          hidden: true
        },
        leagues: {
          background: 'transparent',
          active: false
        },
        parks: {
          background: 'transparent',
          active: false
        }
      }, []),
      _useState2 = _slicedToArray(_useState, 2),
      routes = _useState2[0],
      setRoutes = _useState2[1];
    var setRoute = function () {
      function _callee(route, props) {
        var state, callback, _route;
        return _regeneratorRuntime.async(function () {
          function _callee$(_context) {
            while (1) switch (_context.prev = _context.next) {
              case 0:
                state = _objectSpread({}, routes);
                callback = null;
                for (_route in meteorBabelHelpers.sanitizeForInObject(state)) {
                  state[_route].active = false;
                  if (_route == route) state[_route].active = true;
                  if (props) state[_route].props = props;
                }
                if (!state.event.active) {
                  _context.next = 7;
                  break;
                }
                _context.next = 6;
                return _regeneratorRuntime.awrap(transition.event(state.event.props));
              case 6:
                callback = _context.sent;
              case 7:
                setRoutes(state);
                if (callback) callback();
              case 9:
              case "end":
                return _context.stop();
            }
          }
          return _callee$;
        }(), null, null, null, Promise);
      }
      return _callee;
    }();
    return /*#__PURE__*/React.createElement(Fragment, null, /*#__PURE__*/React.createElement(Navbar, {
      setRoute: setRoute,
      routes: routes
    }), routes.home.active && /*#__PURE__*/React.createElement(Home, {
      setRoute: setRoute
    }), routes.events.active && /*#__PURE__*/React.createElement(Events, {
      setRoute: setRoute
    }), routes.event && routes.event.active && /*#__PURE__*/React.createElement(Event, {
      event: routes.event.props
    }), /*#__PURE__*/React.createElement(Footer, null));
  };
  _s(App, "4vBGvdf0XE0FB5yAJbi1eEDoLVg=");
  _c = App;
  var _c;
  $RefreshReg$(_c, "App");
}.call(this, module);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"client":{"scripts":{"data.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// client/scripts/data.js                                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!function (module1) {
  ___INIT_METEOR_FAST_REFRESH(module);
  var athletes = [{
    birthstart_date: 'Apr 16, 1995',
    end_date: 'Apr 16, 1995',
    gender: 'male',
    hometown: 'Ubatuba, São Paulo',
    country: 'br',
    image: 'fillipe-toledo.png',
    name: 'Filipe Toledo',
    stance: 'regular',
    weight: 154,
    height: {
      feet: 5,
      inches: 9
    }
  }, {
    birthstart_date: 'Sep 2, 1998',
    end_date: 'Sep 2, 1998',
    gender: 'male',
    hometown: 'North Stradbroke Island, Queensland, Australia',
    country: 'au',
    image: 'ethan-ewing.png',
    name: 'Ethan Ewing',
    weight: 169,
    stance: 'regular',
    height: {
      feet: 5,
      inches: 11
    }
  }, {
    birthstart_date: 'Jul 29, 1998',
    end_date: 'Jul 29, 1998',
    hometown: 'San Clemente, California',
    country: 'us',
    gender: 'male',
    image: 'griffin-colapinto.png',
    name: 'Griffin Colapinto',
    stance: 'regular',
    weight: 171,
    height: {
      feet: 5,
      inches: 11
    }
  }, {
    birthstart_date: 'Aug 30, 2000',
    end_date: 'Aug 30, 2000',
    hometown: 'Saquarema',
    country: 'br',
    gender: 'male',
    image: 'joao-chianca.png',
    name: 'Joao Chianca',
    stance: 'regular',
    weight: 171,
    height: {
      feet: 5,
      inches: 11
    }
  }, {
    birthstart_date: 'Dec 27, 1997',
    end_date: 'Dec 27, 1997',
    hometown: 'Margaret River',
    country: 'au',
    gender: 'male',
    image: 'jack-robinson-1.png',
    name: 'Jack Robinson',
    stance: 'regular',
    weight: 178,
    height: {
      feet: 5,
      inches: 11
    }
  }, {
    birthstart_date: 'Aug 27, 1992',
    end_date: 'Aug 27, 1992',
    name: 'Carissa Moore',
    image: 'carissa-moore.png',
    hometown: 'Honolulu, Oahu, Hawaii',
    country: 'us',
    gender: 'female',
    weight: 154,
    stance: 'regular',
    height: {
      feet: 5,
      inches: 7
    }
  }, {
    birthstart_date: 'Oct 26, 2005',
    end_date: 'Oct 26, 2005',
    name: 'Caitlin Simmers',
    image: 'caitlin-simmers.png',
    hometown: 'Oceanside, CA',
    country: 'us',
    gender: 'female',
    weight: 114,
    stance: 'regular',
    height: {
      feet: 5,
      inches: 3
    }
  }, {
    birthstart_date: ' May 9, 1996',
    end_date: ' May 9, 1996',
    name: 'Tatiana Weston-Webb',
    image: 'tatiana.png',
    hometown: 'Princeville, Kauai, Hawaii',
    country: 'us',
    gender: 'female',
    weight: 127,
    stance: 'Goofy',
    height: {
      feet: 5,
      inches: 4
    }
  }];
  var sponsors = [{
    image: 'activision.png',
    url: ''
  }, {
    image: 'sharpeye.png',
    url: ''
  }, {
    image: 'redbull.png',
    url: ''
  }, {
    image: 'hurley.png',
    url: ''
  }, {
    image: 'oneil.png',
    url: ''
  }, {
    image: 'slater.png',
    url: ''
  }];
  var run = {
    points: [{
      title: 'Wave 1',
      text: 'Tail Slide',
      coords: {
        x: '78%',
        y: '22%'
      }
    }, {
      title: 'Wave 2',
      text: 'Aerial',
      coords: {
        x: '80.2%',
        y: '30.5%'
      }
    }, {
      title: 'Wave 3',
      text: 'Snap',
      coords: {
        x: '57%',
        y: '45.5%'
      }
    }, {
      title: 'Wave 4',
      text: 'Off-the-Lip',
      coords: {
        x: '50%',
        y: '67%'
      }
    }]
  };
  var events = function (props) {
    return [{
      id: 1,
      tag: 'Park',
      title: 'The Hawaiian Islands',
      location: 'Haleiwa,Oahu, United States',
      description: "The HIC Haleiwa Pro is a premier surfing competition that takes place in the captivating backdrop of the Hawaiian Islands. Known for its thrilling waves and stunning coastal scenery, this event is a highlight on the professional surfing calendar. Surfers from around the world converge on the iconic North Shore of Oahu to showcase their skills and compete for top honors. The competition is a part of the World Surf League's Qualifying Series, attracting elite surfers eager to conquer the challenging waves of Haleiwa. With its rich surfing culture, warm hospitality, and breathtaking ocean views, the HIC Haleiwa Pro not only celebrates the sport but also pays homage to the unique spirit of Hawaii's surf culture. It's an event where passion meets skill, and spectators are treated to an exhilarating display of talent against the backdrop of one of the world's most iconic surfing destinations.",
      image: 'hic.jpeg',
      subtitle: 'HIC Haleiwa Pro',
      start_date: '07-12-2024',
      end_date: '07-15-2024',
      url: '/a',
      athletes: athletes,
      logo: './event-logo-dark.png',
      sponsors: sponsors,
      park: './wavepark-1.png',
      run: run,
      theme: {
        primary: 'var(--primary)',
        secondary: 'var(--secondary)'
      },
      setRoute: function (event, _event) {
        return props.setRoute('event', _event);
      }
    }, {
      id: 2,
      tag: 'Pipe',
      title: 'Tahiti',
      description: 'From the sheer terror of Teahupo’o to the relaxed family and ocean-based way of life, Tahiti offers something for everyone. Let No Contest give you a guided tour of these incredible islands.',
      image: 'tahiti.png',
      subtitle: '',
      start_date: '07-26-2024',
      end_date: '07-29-2024',
      url: '/b',
      athletes: athletes,
      logo: './event-logo-dark.png',
      sponsors: sponsors,
      park: './wavepark-1.png',
      run: run,
      theme: {
        primary: 'var(--primary)',
        secondary: 'var(--secondary)'
      },
      setRoute: function (event, _event) {
        return props.setRoute('event', _event);
      }
    }, {
      id: 3,
      tag: 'Park',
      title: 'Molly Picklum: What it Takes',
      description: "Experience the highs and lows of the WSL World Tour and the mid-season cut, with Australian rookie Molly Picklum. Discover the headspace it requires to compete as one of the world's best surfers.",
      image: 'what-it-takes.png',
      subtitle: '',
      start_date: '09-01-2024',
      end_date: '09-05-2024',
      url: '/c',
      athletes: athletes,
      logo: './event-logo-dark.png',
      sponsors: sponsors,
      park: './wavepark-1.png',
      run: run,
      theme: {
        primary: 'var(--primary)',
        secondary: 'var(--secondary)'
      },
      setRoute: function (event, _event) {
        return props.setRoute('event', _event);
      }
    }, {
      id: 4,
      tag: 'Big Wave',
      title: 'Waco Surf Trip with the GoPro Surf Team',
      description: "Texas isn't known for its surfing, but Waco Surf has changed the game.",
      image: 'what-it-takes.png',
      subtitle: '',
      start_date: '09-23-2024',
      end_date: '09-26-2024',
      url: '/d',
      athletes: athletes,
      logo: './event-logo-dark.png',
      sponsors: sponsors,
      park: './wavepark-1.png',
      run: run,
      theme: {
        primary: 'var(--primary)',
        secondary: 'var(--secondary)'
      },
      setRoute: function (event, _event) {
        return props.setRoute('event', _event);
      }
    }, {
      id: 5,
      tag: 'Big Wave',
      title: 'The Rail Project: Julian Wilson has ride of his life as he surf-skates in water',
      description: 'A new kind of skate park.',
      image: 'what-it-takes.png',
      subtitle: '',
      start_date: '10-25-2024',
      end_date: '10-28-2024',
      url: '/e',
      athletes: athletes,
      logo: './event-logo-dark.png',
      sponsors: sponsors,
      park: './wavepark-1.png',
      run: run,
      theme: {
        primary: 'var(--primary)',
        secondary: 'var(--secondary)'
      },
      setRoute: function (event, _event) {
        return props.setRoute('event', _event);
      }
    }];
  };
  module1.exportDefault({
    athletes: athletes,
    logo: './event-logo-dark.png',
    events: events
  });
}.call(this, module);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"helpers.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// client/scripts/helpers.js                                                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!function (module1) {
  var _regeneratorRuntime;
  module1.link("@babel/runtime/regenerator", {
    default: function (v) {
      _regeneratorRuntime = v;
    }
  }, 0);
  module1.export({
    asyncTimeout: function () {
      return asyncTimeout;
    },
    getCSSVariable: function () {
      return getCSSVariable;
    },
    handleize: function () {
      return handleize;
    },
    randomInt: function () {
      return randomInt;
    },
    sortBy: function () {
      return sortBy;
    },
    transition: function () {
      return transition;
    }
  });
  ___INIT_METEOR_FAST_REFRESH(module);
  var asyncTimeout = function (ms) {
    return new Promise(function (resolve) {
      return setTimeout(resolve, ms);
    });
  };
  var getCSSVariable = function (variable) {
    if (!window) return;
    return getComputedStyle(document.body).getPropertyValue(variable);
  };
  var handleize = function (str) {
    return str.toLowerCase().replace(/[^\w\u00C0-\u024f]+/g, '-').replace(/^-+|-+$/g, '');
  };
  var randomInt = function (min, max, wholenum) {
    if (wholenum) Math.floor(Math.random() * (max - min + 1) + min);
    return Math.random() * (max - min + 1) + min;
  };
  var sortBy = function (arr, key, reverse) {
    return arr.sort(function (a, b) {
      var A = a[key];
      var B = b[key];
      if (reverse) {
        if (A > B) {
          return -1;
        }
        if (A < B) {
          return 1;
        }
      } else {
        if (A < B) {
          return -1;
        }
        if (A > B) {
          return 1;
        }
      }
      return 0;
    });
  };
  var transition = {
    event: function () {
      function _callee2(data) {
        var image, bounds, _image;
        return _regeneratorRuntime.async(function () {
          function _callee2$(_context2) {
            while (1) switch (_context2.prev = _context2.next) {
              case 0:
                image = document.querySelector("[data-image=\"" + data.id + "\"]");
                bounds = image.getBoundingClientRect();
                _image = document.createElement('img');
                _image.src = './' + data.image;
                _image.style.padding = '15px';
                _image.style.width = bounds.width + 'px';
                _image.style.height = bounds.height + 'px';
                _image.style.top = bounds.y + 'px';
                _image.style.left = bounds.x + 'px';
                _image.style.padding = '0px';
                _image.classList.add('transition--event');
                document.body.append(_image);
                _context2.next = 14;
                return _regeneratorRuntime.awrap(asyncTimeout(250));
              case 14:
                _image.style.width = '100vw';
                _image.style.height = '100vh';
                _image.style.top = '0';
                _image.style.left = '0';
                _image.style.filter = 'grayscale(1)';
                _context2.next = 21;
                return _regeneratorRuntime.awrap(asyncTimeout(250));
              case 21:
                return _context2.abrupt("return", function () {
                  function _callee() {
                    return _regeneratorRuntime.async(function () {
                      function _callee$(_context) {
                        while (1) switch (_context.prev = _context.next) {
                          case 0:
                            window.scrollTo(0, 0);
                            _image.style.opacity = '0.25';
                            _context.next = 4;
                            return _regeneratorRuntime.awrap(asyncTimeout(350));
                          case 4:
                            _image.remove();
                          case 5:
                          case "end":
                            return _context.stop();
                        }
                      }
                      return _callee$;
                    }(), null, null, null, Promise);
                  }
                  return _callee;
                }());
              case 22:
              case "end":
                return _context2.stop();
            }
          }
          return _callee2$;
        }(), null, null, null, Promise);
      }
      return _callee2;
    }()
  };
}.call(this, module);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"main.jsx":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// client/main.jsx                                                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!function (module1) {
  var React;
  module1.link("react", {
    "default": function (v) {
      React = v;
    }
  }, 0);
  var createRoot;
  module1.link("react-dom/client", {
    createRoot: function (v) {
      createRoot = v;
    }
  }, 1);
  var Meteor;
  module1.link("meteor/meteor", {
    Meteor: function (v) {
      Meteor = v;
    }
  }, 2);
  var App;
  module1.link("/imports/ui/App", {
    App: function (v) {
      App = v;
    }
  }, 3);
  ___INIT_METEOR_FAST_REFRESH(module);
  Meteor.startup(function () {
    var container = document.getElementById('react-target');
    var root = createRoot(container);
    root.render( /*#__PURE__*/React.createElement(App, null));
  });
}.call(this, module);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},{
  "extensions": [
    ".js",
    ".json",
    ".html",
    ".ts",
    ".jsx",
    ".css",
    ".scss",
    ".mjs"
  ]
});

var exports = require("/client/main.jsx");