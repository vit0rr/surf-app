var require = meteorInstall({"imports":{"ui":{"routes":{"Event":{"Background.jsx":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/routes/Event/Background.jsx                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!function (module1) {
  module1.export({
    Background: () => Background
  });
  let React, Fragment;
  module1.link("react", {
    default(v) {
      React = v;
    },
    Fragment(v) {
      Fragment = v;
    }
  }, 0);
  ___INIT_METEOR_FAST_REFRESH(module);
  const Background = function (_ref) {
    let {
      event,
      primary,
      secondary
    } = _ref;
    const gradient = "repeating-linear-gradient(\n\t\t45deg,\n\t\t".concat(primary, ",\n\t\t").concat(primary, " 5px,\n\t\t").concat(secondary, " 5px,\n\t\t").concat(secondary, " 10px\n\t)");
    return /*#__PURE__*/React.createElement(Fragment, null, /*#__PURE__*/React.createElement("section", {
      className: "page-event__bg page-event__bg--background",
      style: {
        backgroundImage: "url(./".concat(event.image, ")")
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
    Info: () => Info
  });
  let React, Fragment;
  module1.link("react", {
    default(v) {
      React = v;
    },
    Fragment(v) {
      Fragment = v;
    }
  }, 0);
  let dayjs;
  module1.link("dayjs", {
    default(v) {
      dayjs = v;
    }
  }, 1);
  ___INIT_METEOR_FAST_REFRESH(module);
  const Info = function (_ref) {
    let {
      event,
      primary
    } = _ref;
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
  module1.export({
    Park: () => Park
  });
  let React, useRef, useState, useEffect;
  module1.link("react", {
    default(v) {
      React = v;
    },
    useRef(v) {
      useRef = v;
    },
    useState(v) {
      useState = v;
    },
    useEffect(v) {
      useEffect = v;
    }
  }, 0);
  let getCSSVariable;
  module1.link("../../../../client/scripts/helpers.js", {
    getCSSVariable(v) {
      getCSSVariable = v;
    }
  }, 1);
  ___INIT_METEOR_FAST_REFRESH(module);
  var _s = $RefreshSig$();
  const Park = function (_ref) {
    let {
      event,
      athlete,
      league,
      primary,
      secondary
    } = _ref;
    _s();
    const mapRef = useRef(null);
    const [containerAnimation, setContainerAnimation] = useState('');
    const [athleteAnimation, setAthleteAnimation] = useState('');
    const setPointData = function () {
      const map = document.querySelector('[data-map]');
      event.run.points.forEach((point, index) => {
        const anchor = document.querySelectorAll('[data-anchor]')[index];
        const line = document.createElement('div');
        line.classList.add('line');
        line.setAttribute('data-line', index);
        line.style.borderColro = primary;
        line.style.left = "calc(".concat(anchor.style.left, " + 20px)");
        const markup = "\n\t\t\t\t<h6 class=\"uk-text-uppercase uk-text-bolder\" style=\"color: ".concat(primary, ";\">").concat(point.title, "</h6>\n\t\t\t\t<p class=\"uk-text-uppercase uk-text-light\">").concat(point.text, "</p>\n\t\t\t");
        const info = document.createElement('div');
        info.setAttribute('data-info', index);
        info.innerHTML = markup;
        const info2 = document.createElement('div');
        info2.innerHTML = markup;
        line.append(info);
        line.append(info2);
        map.append(line);
        const _line = document.querySelector("[data-line=\"".concat(index, "\"]"));
        const {
          height
        } = _line.getBoundingClientRect();
        _line.style.top = "calc(".concat(anchor.style.top, " - ").concat(height, "px - 5px)");
      });
    };
    useEffect(() => {
      const delay = parseInt(getCSSVariable('--animate-delay'));
      setContainerAnimation('');
      setAthleteAnimation('');
      setTimeout(() => {
        setContainerAnimation('animate__fadeIn');
        setAthleteAnimation('animate__fadeInUp');
      }, delay);
      setTimeout(() => {}, delay * 2);
      setPointData();
    }, [league]);
    const getCoords = function (event) {
      const map = mapRef.current;
      const {
        x,
        y,
        width,
        height,
        left,
        top
      } = map.getBoundingClientRect();
      const clientX = event.clientX - left;
      const clientY = event.clientY - top;
      const _top = clientY / height * 100;
      const _left = clientX / width * 100;
      console.log({
        clientX,
        clientY,
        top: _top,
        left: _left
      });
    };
    return /*#__PURE__*/React.createElement("section", {
      ref: mapRef,
      className: "page-event__park uk-padding-small animate__animated ".concat(containerAnimation)
    }, /*#__PURE__*/React.createElement("div", {
      className: "page-event__park-athlete animate__animated ".concat(athleteAnimation)
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
    }, event.run.points.map((point, index) => {
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
    Sponsors: () => Sponsors
  });
  let React;
  module1.link("react", {
    default(v) {
      React = v;
    }
  }, 0);
  ___INIT_METEOR_FAST_REFRESH(module);
  const Sponsors = function (_ref) {
    let {
      event
    } = _ref;
    return /*#__PURE__*/React.createElement("section", {
      className: "page-event__sponsors uk-padding-small"
    }, event.sponsors.map((sponsor, index) => {
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
  module1.export({
    Standings: () => Standings
  });
  let React, useEffect, useState;
  module1.link("react", {
    default(v) {
      React = v;
    },
    useEffect(v) {
      useEffect = v;
    },
    useState(v) {
      useState = v;
    }
  }, 0);
  let getCSSVariable;
  module1.link("../../../../client/scripts/helpers.js", {
    getCSSVariable(v) {
      getCSSVariable = v;
    }
  }, 1);
  ___INIT_METEOR_FAST_REFRESH(module);
  var _s = $RefreshSig$();
  const Standings = function (_ref) {
    let {
      athletes,
      league,
      primary,
      secondary
    } = _ref;
    _s();
    const [animation, setAnimation] = useState('');
    useEffect(() => {
      const delay = parseInt(getCSSVariable('--animate-delay'));
      setAnimation('');
      setTimeout(() => {
        setAnimation('animate__fadeIn');
      }, delay);
    }, [league]);
    return /*#__PURE__*/React.createElement("section", {
      className: "page-event__standings uk-padding-small"
    }, /*#__PURE__*/React.createElement("div", {
      className: "page-event__athlete-table animate__animated ".concat(animation)
    }, /*#__PURE__*/React.createElement("div", {
      className: "page-event__athlete page-event__athlete--key"
    }, Object.keys(athletes[0]).map(key => {
      return /*#__PURE__*/React.createElement("div", {
        key: key,
        className: "page-event__athlete-".concat(key, " page-event__athlete--heading page-event__athlete--heading-").concat(key, " uk-text-uppercase uk-text-bold"),
        style: {
          backgroundColor: primary
        },
        "data-name": key == 'name' ? 'athlete' : key
      }, /*#__PURE__*/React.createElement("span", null, key == 'name' ? 'athlete' : key));
    })), athletes.filter(a => a.gender == league).map((athlete, index) => {
      let place = index + 1;
      let pointsWidth = athlete.points / 10 * 100;
      const delay = index + 1;
      const transitionDelay = '1.' + delay + 's';
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
        className: "fib fi-".concat(athlete.country)
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
    StandingsTitle: () => StandingsTitle
  });
  let React;
  module1.link("react", {
    default(v) {
      React = v;
    }
  }, 0);
  ___INIT_METEOR_FAST_REFRESH(module);
  const StandingsTitle = function (_ref) {
    let {
      tabs,
      tab,
      setTab
    } = _ref;
    const index = tabs.findIndex(t => t.slug == tab.slug);
    return /*#__PURE__*/React.createElement("section", {
      className: "page-event__standings-title uk-padding-small"
    }, /*#__PURE__*/React.createElement("button", {
      className: "uk-text-bold uk-h2 uk-text-uppercase",
      onClick: setTab
    }, tabs.map(t => {
      let sum = index * 40 * -1;
      let transform = "translateY(".concat(sum, "px)");
      return /*#__PURE__*/React.createElement("div", {
        key: t.slug,
        className: "page-event__standings-tab",
        style: {
          transform
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
  module1.export({
    Event: () => Event
  });
  let React, Fragment, useState, useEffect, useRef;
  module1.link("react", {
    default(v) {
      React = v;
    },
    Fragment(v) {
      Fragment = v;
    },
    useState(v) {
      useState = v;
    },
    useEffect(v) {
      useEffect = v;
    },
    useRef(v) {
      useRef = v;
    }
  }, 0);
  module1.link("/node_modules/flag-icons/css/flag-icons.min.css");
  let randomInt, sortBy;
  module1.link("../../../../client/scripts/helpers.js", {
    randomInt(v) {
      randomInt = v;
    },
    sortBy(v) {
      sortBy = v;
    }
  }, 1);
  let Background;
  module1.link("./Background", {
    Background(v) {
      Background = v;
    }
  }, 2);
  let Info;
  module1.link("./Info", {
    Info(v) {
      Info = v;
    }
  }, 3);
  let StandingsTitle;
  module1.link("./StandingsTitle", {
    StandingsTitle(v) {
      StandingsTitle = v;
    }
  }, 4);
  let Standings;
  module1.link("./Standings", {
    Standings(v) {
      Standings = v;
    }
  }, 5);
  let Park;
  module1.link("./Park", {
    Park(v) {
      Park = v;
    }
  }, 6);
  let Sponsors;
  module1.link("./Sponsors.jsx", {
    Sponsors(v) {
      Sponsors = v;
    }
  }, 7);
  ___INIT_METEOR_FAST_REFRESH(module);
  var _s = $RefreshSig$();
  const Event = function (props) {
    _s();
    const mainRef = useRef(null);
    const keys = ['place', 'image', 'name', 'gender', 'run', 'points'];
    const primary = props.event.theme.primary;
    const secondary = props.event.theme.secondary;
    let _athletes = [...props.event.athletes].map((athlete, index) => {
      const multiplier = (randomInt(4, 9) / 100).toFixed(2);
      const decimal = 0.13 * index;
      athlete.points = (multiplier * 100 + decimal).toFixed(2);
      athlete.run = 1;
      if (index < 4) athlete.run = 2;
      const obj = {};
      keys.forEach(key => obj[key] = athlete[key]);
      return obj;
    });
    _athletes = sortBy(_athletes, 'points', true);
    const [athletes, setAthletes] = useState(_athletes);
    const [tabs, setTabs] = useState([{
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
    }]);
    const setTab = function () {
      let state = [...tabs];
      const index = tabs.findIndex(tab => tab.active);
      const nextIndex = index + 1;
      const limit = state.length - 1;
      state = state.map(tab => {
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
    useEffect(() => {
      const mainEl = mainRef.current;
      mainEl.classList.add('active');
    }, []);
    const tab = tabs.find(tab => tab.active);
    let displayStandings = false;
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
  module1.export({
    Events: () => Events
  });
  let React, useState;
  module1.link("react", {
    default(v) {
      React = v;
    },
    useState(v) {
      useState = v;
    }
  }, 0);
  let Tabs;
  module1.link("../components/Tabs.jsx", {
    Tabs(v) {
      Tabs = v;
    }
  }, 1);
  let ImageGrid;
  module1.link("../components/ImageGrid.jsx", {
    ImageGrid(v) {
      ImageGrid = v;
    }
  }, 2);
  let data;
  module1.link("../../../client/scripts/data.js", {
    default(v) {
      data = v;
    }
  }, 3);
  ___INIT_METEOR_FAST_REFRESH(module);
  var _s = $RefreshSig$();
  const Events = function (props) {
    _s();
    const events = data.events();
    const [search, setSearch] = useState();
    const applySearch = function (value) {
      if (!value || value == '') return events;
      const _value = value.toLowerCase();
      const _events = [...events].filter(event => {
        const title = event.title.toLowerCase();
        const subtitle = event.subtitle.toLowerCase();
        const description = event.description.toLowerCase();
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
      onChange: event => setSearch(event.currentTarget.value)
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
    Home: () => Home
  });
  let React;
  module1.link("react", {
    default(v) {
      React = v;
    }
  }, 0);
  let Banner;
  module1.link("/imports/ui/components/Banner", {
    Banner(v) {
      Banner = v;
    }
  }, 1);
  let ImageGrid;
  module1.link("/imports/ui/components/ImageGrid", {
    ImageGrid(v) {
      ImageGrid = v;
    }
  }, 2);
  let data;
  module1.link("../../../client/scripts/data.js", {
    default(v) {
      data = v;
    }
  }, 3);
  ___INIT_METEOR_FAST_REFRESH(module);
  const Home = function (props) {
    const events = data.events({
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
    Banner: () => Banner
  });
  let React;
  module1.link("react", {
    default(v) {
      React = v;
    }
  }, 0);
  ___INIT_METEOR_FAST_REFRESH(module);
  const Banner = function (_ref) {
    let {
      items = []
    } = _ref;
    return /*#__PURE__*/React.createElement("section", {
      className: "banner uk-cover-container"
    }, /*#__PURE__*/React.createElement("div", {
      "uk-slideshow": "animation: pull; autoplay: true; pause-on-hover: false"
    }, /*#__PURE__*/React.createElement("ul", {
      className: "uk-slideshow-items"
    }, items.map((item, index) => {
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
    Footer: () => Footer
  });
  let React, useEffect;
  module1.link("react", {
    default(v) {
      React = v;
    },
    useEffect(v) {
      useEffect = v;
    }
  }, 0);
  ___INIT_METEOR_FAST_REFRESH(module);
  const Footer = () => {
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
    ImageGrid: () => ImageGrid
  });
  let React;
  module1.link("react", {
    default(v) {
      React = v;
    }
  }, 0);
  let handleize;
  module1.link("../../../client/scripts/helpers.js", {
    handleize(v) {
      handleize = v;
    }
  }, 1);
  ___INIT_METEOR_FAST_REFRESH(module);
  const ImageGrid = function (_ref) {
    let {
      grid = 'uk-child-width-expand@s',
      filter = false,
      fillImage = false,
      items = [],
      title = '',
      setRoute = null
    } = _ref;
    return /*#__PURE__*/React.createElement("section", {
      className: "image-grid"
    }, items && items.length && /*#__PURE__*/React.createElement("div", {
      className: "uk-container uk-padding"
    }, title && /*#__PURE__*/React.createElement("h3", {
      className: "image-grid__title uk-text-bold"
    }, title), /*#__PURE__*/React.createElement("div", {
      className: "uk-grid ".concat(grid).concat(filter && ' js-filter'),
      "uk-grid": "masonry: true"
    }, items.map((item, index) => {
      let className = '';
      if (index == 0) className += ' uk-first-column';
      if (fillImage) className += ' image_grid-item--fill-image';
      if (filter && item.tag) className += ' tag-all tag-' + handleize(item.tag);
      let date = null;
      if (item.date) {
        className += ' image_grid-item--date';
        date = item.date.split('-');
      }
      return /*#__PURE__*/React.createElement("a", {
        key: item.id ? item.id : index,
        className: className,
        onClick: event => item.setRoute(event, item)
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
  module1.export({
    Navbar: () => Navbar
  });
  let React, useRef, Fragment;
  module1.link("react", {
    default(v) {
      React = v;
    },
    useRef(v) {
      useRef = v;
    },
    Fragment(v) {
      Fragment = v;
    }
  }, 0);
  let Footer;
  module1.link("./Footer.jsx", {
    Footer(v) {
      Footer = v;
    }
  }, 1);
  let asyncTimeout;
  module1.link("../../../client/scripts/helpers.js", {
    asyncTimeout(v) {
      asyncTimeout = v;
    }
  }, 2);
  ___INIT_METEOR_FAST_REFRESH(module);
  var _s = $RefreshSig$();
  const Navbar = props => {
    _s();
    const active = 'mobile-nav--active';
    let ref = useRef(null);
    let _route = null;
    const toggleMenu = async function (event) {
      event.preventDefault();
      const target = ref.current;
      if (target.className.indexOf(active) > -1) {
        target.classList.remove(active);
        return;
      }
      target.classList.add(active);
    };
    for (let route in props.routes) {
      if (props.routes[route].active) _route = props.routes[route];
    }
    let backgroundColor = 'transparent';
    if (_route && _route.background) backgroundColor = _route.background;
    return /*#__PURE__*/React.createElement(Fragment, null, /*#__PURE__*/React.createElement("header", {
      "uk-sticky": "sel-target: .uk-navbar-container; cls-active: uk-navbar-sticky; end: + *;",
      style: {
        backgroundColor
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
      onClick: event => toggleMenu(event)
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
    }, Object.keys(props.routes).map((route, index) => {
      if (!props.routes[route].hidden) {
        return /*#__PURE__*/React.createElement("li", {
          key: index
        }, /*#__PURE__*/React.createElement("a", {
          onClick: () => props.setRoute(route)
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
      onClick: event => toggleMenu(event)
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
    }, Object.keys(props.routes).map((route, index) => {
      if (!props.routes[route].hidden) {
        return /*#__PURE__*/React.createElement("li", {
          key: index
        }, /*#__PURE__*/React.createElement("a", {
          className: "uk-text-uppercase",
          onClick: () => props.setRoute(route)
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
    Tabs: () => Tabs
  });
  let React;
  module1.link("react", {
    default(v) {
      React = v;
    }
  }, 0);
  let handleize;
  module1.link("../../../client/scripts/helpers.js", {
    handleize(v) {
      handleize = v;
    }
  }, 1);
  ___INIT_METEOR_FAST_REFRESH(module);
  const Tabs = function (_ref) {
    let {
      tabs = []
    } = _ref;
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("ul", {
      className: "tabs uk-tab"
    }, /*#__PURE__*/React.createElement("li", {
      className: "uk-box-shadow-small uk-active",
      "uk-filter-control": ".tag-all"
    }, /*#__PURE__*/React.createElement("a", null, "All")), tabs.map((tab, index) => {
      return /*#__PURE__*/React.createElement("li", {
        key: index,
        className: "uk-box-shadow-small",
        "uk-filter-control": ".tag-".concat(handleize(tab.title))
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
  let _objectSpread;
  module1.link("@babel/runtime/helpers/objectSpread2", {
    default(v) {
      _objectSpread = v;
    }
  }, 0);
  module1.export({
    App: () => App
  });
  let React, Fragment, useState;
  module1.link("react", {
    default(v) {
      React = v;
    },
    Fragment(v) {
      Fragment = v;
    },
    useState(v) {
      useState = v;
    }
  }, 0);
  let Navbar;
  module1.link("/imports/ui/components/Navbar", {
    Navbar(v) {
      Navbar = v;
    }
  }, 1);
  let Home;
  module1.link("/imports/ui/routes/Home", {
    Home(v) {
      Home = v;
    }
  }, 2);
  let Events;
  module1.link("/imports/ui/routes/Events", {
    Events(v) {
      Events = v;
    }
  }, 3);
  let Event;
  module1.link("/imports/ui/routes/Event/index.jsx", {
    Event(v) {
      Event = v;
    }
  }, 4);
  let Footer;
  module1.link("/imports/ui/components/Footer", {
    Footer(v) {
      Footer = v;
    }
  }, 5);
  let data;
  module1.link("../../client/scripts/data.js", {
    default(v) {
      data = v;
    }
  }, 6);
  let transition;
  module1.link("../../client/scripts/helpers.js", {
    transition(v) {
      transition = v;
    }
  }, 7);
  ___INIT_METEOR_FAST_REFRESH(module);
  var _s = $RefreshSig$();
  const test = {
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
  const App = () => {
    _s();
    const [routes, setRoutes] = useState({
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
    }, []);
    const setRoute = async function (route, props) {
      const state = _objectSpread({}, routes);
      let callback = null;
      for (let _route in state) {
        state[_route].active = false;
        if (_route == route) state[_route].active = true;
        if (props) state[_route].props = props;
      }
      if (state.event.active) {
        callback = await transition.event(state.event.props);
      }
      setRoutes(state);
      if (callback) callback();
    };
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
  const athletes = [{
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
  const sponsors = [{
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
  const run = {
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
  const events = props => [{
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
    athletes,
    logo: './event-logo-dark.png',
    sponsors,
    park: './wavepark-1.png',
    run,
    theme: {
      primary: 'var(--primary)',
      secondary: 'var(--secondary)'
    },
    setRoute: (event, _event) => props.setRoute('event', _event)
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
    athletes,
    logo: './event-logo-dark.png',
    sponsors,
    park: './wavepark-1.png',
    run,
    theme: {
      primary: 'var(--primary)',
      secondary: 'var(--secondary)'
    },
    setRoute: (event, _event) => props.setRoute('event', _event)
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
    athletes,
    logo: './event-logo-dark.png',
    sponsors,
    park: './wavepark-1.png',
    run,
    theme: {
      primary: 'var(--primary)',
      secondary: 'var(--secondary)'
    },
    setRoute: (event, _event) => props.setRoute('event', _event)
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
    athletes,
    logo: './event-logo-dark.png',
    sponsors,
    park: './wavepark-1.png',
    run,
    theme: {
      primary: 'var(--primary)',
      secondary: 'var(--secondary)'
    },
    setRoute: (event, _event) => props.setRoute('event', _event)
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
    athletes,
    logo: './event-logo-dark.png',
    sponsors,
    park: './wavepark-1.png',
    run,
    theme: {
      primary: 'var(--primary)',
      secondary: 'var(--secondary)'
    },
    setRoute: (event, _event) => props.setRoute('event', _event)
  }];
  module1.exportDefault({
    athletes,
    logo: './event-logo-dark.png',
    events
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
  module1.export({
    asyncTimeout: () => asyncTimeout,
    getCSSVariable: () => getCSSVariable,
    handleize: () => handleize,
    randomInt: () => randomInt,
    sortBy: () => sortBy,
    transition: () => transition
  });
  ___INIT_METEOR_FAST_REFRESH(module);
  const asyncTimeout = function (ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  };
  const getCSSVariable = function (variable) {
    if (!window) return;
    return getComputedStyle(document.body).getPropertyValue(variable);
  };
  const handleize = function (str) {
    return str.toLowerCase().replace(/[^\w\u00C0-\u024f]+/g, '-').replace(/^-+|-+$/g, '');
  };
  const randomInt = function (min, max, wholenum) {
    if (wholenum) Math.floor(Math.random() * (max - min + 1) + min);
    return Math.random() * (max - min + 1) + min;
  };
  const sortBy = function (arr, key, reverse) {
    return arr.sort((a, b) => {
      const A = a[key];
      const B = b[key];
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
  const transition = {
    event: async data => {
      const image = document.querySelector("[data-image=\"".concat(data.id, "\"]"));
      const bounds = image.getBoundingClientRect();
      const _image = document.createElement('img');
      _image.src = './' + data.image;
      _image.style.padding = '15px';
      _image.style.width = bounds.width + 'px';
      _image.style.height = bounds.height + 'px';
      _image.style.top = bounds.y + 'px';
      _image.style.left = bounds.x + 'px';
      _image.style.padding = '0px';
      _image.classList.add('transition--event');
      document.body.append(_image);
      await asyncTimeout(250);
      _image.style.width = '100vw';
      _image.style.height = '100vh';
      _image.style.top = '0';
      _image.style.left = '0';
      _image.style.filter = 'grayscale(1)';
      await asyncTimeout(250);
      return async () => {
        window.scrollTo(0, 0);
        _image.style.opacity = '0.25';
        await asyncTimeout(350);
        _image.remove();
      };
    }
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
  let React;
  module1.link("react", {
    default(v) {
      React = v;
    }
  }, 0);
  let createRoot;
  module1.link("react-dom/client", {
    createRoot(v) {
      createRoot = v;
    }
  }, 1);
  let Meteor;
  module1.link("meteor/meteor", {
    Meteor(v) {
      Meteor = v;
    }
  }, 2);
  let App;
  module1.link("/imports/ui/App", {
    App(v) {
      App = v;
    }
  }, 3);
  ___INIT_METEOR_FAST_REFRESH(module);
  Meteor.startup(() => {
    const container = document.getElementById('react-target');
    const root = createRoot(container);
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