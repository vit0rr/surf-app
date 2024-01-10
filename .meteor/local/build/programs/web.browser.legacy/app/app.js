var require = meteorInstall({"imports":{"ui":{"components":{"Banner.jsx":function module(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// imports/ui/components/Banner.jsx                                                                                 //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Footer.jsx":function module(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// imports/ui/components/Footer.jsx                                                                                 //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"ImageGrid.jsx":function module(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// imports/ui/components/ImageGrid.jsx                                                                              //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
      title = _ref$title === void 0 ? '' : _ref$title;
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
        href: "/",
        key: index,
        className: className
      }, /*#__PURE__*/React.createElement("div", {
        className: "uk-card uk-card-default uk-card-body"
      }, /*#__PURE__*/React.createElement("div", {
        className: "image-grid__item-image"
      }, /*#__PURE__*/React.createElement("img", {
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
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Navbar.jsx":function module(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// imports/ui/components/Navbar.jsx                                                                                 //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
    return /*#__PURE__*/React.createElement(Fragment, null, /*#__PURE__*/React.createElement("header", {
      "uk-sticky": "sel-target: .uk-navbar-container; cls-active: uk-navbar-sticky; end: + *;",
      style: {
        backgroundColor: _route.background
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
      return /*#__PURE__*/React.createElement("li", {
        key: index
      }, /*#__PURE__*/React.createElement("a", {
        onClick: function () {
          return props.setRoute(route);
        }
      }, route));
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
    }, /*#__PURE__*/React.createElement("li", {
      className: "uk-active"
    }, /*#__PURE__*/React.createElement("a", {
      className: "uk-text-large",
      href: "/"
    }, "Home")), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
      className: "uk-text-large",
      href: ""
    }, "Events")), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
      className: "uk-text-large",
      href: ""
    }, "Parks")), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
      className: "uk-text-large",
      href: ""
    }, "Atheletes")))), /*#__PURE__*/React.createElement("div", {
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
      className: "uk-position-center uk-panel"
    }, /*#__PURE__*/React.createElement("h6", null, "Red Bull Magnitude"))), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("img", {
      src: "foam-wreckers.png",
      alt: ""
    }), /*#__PURE__*/React.createElement("div", {
      className: "uk-position-center uk-panel"
    }, /*#__PURE__*/React.createElement("h6", null, "Red Bull Foam Wreckers: Cocoa Beach, Florida"))), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("img", {
      src: "tudor.png",
      alt: ""
    }), /*#__PURE__*/React.createElement("div", {
      className: "uk-position-center uk-panel"
    }, /*#__PURE__*/React.createElement("h6", null, "TUDOR Nazar\xE9 Big Wave Challenge"))), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("img", {
      src: "us-open.png",
      alt: ""
    }), /*#__PURE__*/React.createElement("div", {
      className: "uk-position-center uk-panel"
    }, /*#__PURE__*/React.createElement("h6", null, "US Open of Surfing"))), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("img", {
      src: "foam-wreckers-new-york.png",
      alt: ""
    }), /*#__PURE__*/React.createElement("div", {
      className: "uk-position-center uk-panel"
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
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Tabs.jsx":function module(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// imports/ui/components/Tabs.jsx                                                                                   //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"routes":{"Events.jsx":function module(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// imports/ui/routes/Events.jsx                                                                                     //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
!function (module1) {
  var _slicedToArray;
  module1.link("@babel/runtime/helpers/slicedToArray", {
    default: function (v) {
      _slicedToArray = v;
    }
  }, 0);
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
  ___INIT_METEOR_FAST_REFRESH(module);
  var _s = $RefreshSig$();
  var events = [{
    tag: 'Park',
    title: 'Jack Robinson narrates five minutes of Fijian fire',
    description: 'Jack Robinson talks us through scoring incredible waves at Cloudbreak on his first-ever mission to Fiji.',
    image: 'jack-robinson.png',
    subtitle: '',
    date: '07-12-2024',
    url: '/a'
  }, {
    tag: 'Pipe',
    title: 'Tahiti',
    description: 'From the sheer terror of Teahupo’o to the relaxed family and ocean-based way of life, Tahiti offers something for everyone. Let No Contest give you a guided tour of these incredible islands.',
    image: 'tahiti.png',
    subtitle: '',
    date: '07-26-2024',
    url: '/b'
  }, {
    tag: 'Park',
    title: 'Molly Picklum: What it Takes',
    description: "Experience the highs and lows of the WSL World Tour and the mid-season cut, with Australian rookie Molly Picklum. Discover the headspace it requires to compete as one of the world's best surfers.",
    image: 'what-it-takes.png',
    subtitle: '',
    date: '09-01-2024',
    url: '/c'
  }, {
    tag: 'Big Wave',
    title: 'Waco Surf Trip with the GoPro Surf Team',
    description: "Texas isn't known for its surfing, but Waco Surf has changed the game.",
    image: 'what-it-takes.png',
    subtitle: '',
    date: '09-23-2024',
    url: '/d'
  }, {
    tag: 'Big Wave',
    title: 'The Rail Project: Julian Wilson has ride of his life as he surf-skates in water',
    description: 'A new kind of skate park.',
    image: 'what-it-takes.png',
    subtitle: '',
    date: '10-25-2024',
    url: '/e'
  }];
  var Events = function () {
    _s();
    var _useState = useState(),
      _useState2 = _slicedToArray(_useState, 2),
      search = _useState2[0],
      setSearch = _useState2[1];
    var applySearch = function (value) {
      if (!value || value == '') return events;
      var _value = value.toLowerCase();
      var _events = [].concat(events).filter(function (event) {
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
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Home.jsx":function module(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// imports/ui/routes/Home.jsx                                                                                       //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
  ___INIT_METEOR_FAST_REFRESH(module);
  var Home = function () {
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
      items: [{
        title: 'Jack Robinson narrates five minutes of Fijian fire',
        description: 'Jack Robinson talks us through scoring incredible waves at Cloudbreak on his first-ever mission to Fiji.',
        image: 'jack-robinson.png'
      }, {
        title: 'Tahiti',
        description: 'From the sheer terror of Teahupo’o to the relaxed family and ocean-based way of life, Tahiti offers something for everyone. Let No Contest give you a guided tour of these incredible islands.',
        image: 'tahiti.png'
      }, {
        title: 'Molly Picklum: What it Takes',
        description: "Experience the highs and lows of the WSL World Tour and the mid-season cut, with Australian rookie Molly Picklum. Discover the headspace it requires to compete as one of the world's best surfers.",
        image: 'what-it-takes.png'
      }],
      grid: "uk-child-width-1-2@s uk-child-width-1-3@m uk-child-width-1-4@l"
    }));
  };
  _c = Home;
  var _c;
  $RefreshReg$(_c, "Home");
}.call(this, module);
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"App.jsx":function module(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// imports/ui/App.jsx                                                                                               //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
!function (module1) {
  var _objectSpread;
  module1.link("@babel/runtime/helpers/objectSpread2", {
    default: function (v) {
      _objectSpread = v;
    }
  }, 0);
  var _slicedToArray;
  module1.link("@babel/runtime/helpers/slicedToArray", {
    default: function (v) {
      _slicedToArray = v;
    }
  }, 1);
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
  var Footer;
  module1.link("/imports/ui/components/Footer", {
    Footer: function (v) {
      Footer = v;
    }
  }, 4);
  ___INIT_METEOR_FAST_REFRESH(module);
  var _s = $RefreshSig$();
  var App = function () {
    _s();
    var _useState = useState({
        home: {
          background: 'transparent',
          active: false
        },
        events: {
          background: 'var(--blue-700)',
          active: true
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
    var setRoute = function (route) {
      var state = _objectSpread({}, routes);
      for (var _route in meteorBabelHelpers.sanitizeForInObject(state)) {
        state[_route].active = false;
        if (_route == route) state[_route].active = true;
      }
      setRoutes(state);
    };
    return /*#__PURE__*/React.createElement(Fragment, null, /*#__PURE__*/React.createElement(Navbar, {
      setRoute: setRoute,
      routes: routes
    }), routes.home.active && /*#__PURE__*/React.createElement(Home, null), routes.events.active && /*#__PURE__*/React.createElement(Events, null), /*#__PURE__*/React.createElement(Footer, null));
  };
  _s(App, "GefeW2ix87t/F8B6DC3XdbqmbBM=");
  _c = App;
  var _c;
  $RefreshReg$(_c, "App");
}.call(this, module);
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"client":{"scripts":{"helpers.js":function module(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// client/scripts/helpers.js                                                                                        //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
!function (module1) {
  module1.export({
    asyncTimeout: function () {
      return asyncTimeout;
    },
    handleize: function () {
      return handleize;
    }
  });
  ___INIT_METEOR_FAST_REFRESH(module);
  var asyncTimeout = function (ms) {
    console.log('Timeout for ' + ms);
    return new Promise(function (resolve) {
      return setTimeout(resolve, ms);
    });
  };
  var handleize = function (str) {
    return str.toLowerCase().replace(/[^\w\u00C0-\u024f]+/g, '-').replace(/^-+|-+$/g, '');
  };
}.call(this, module);
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"main.jsx":function module(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// client/main.jsx                                                                                                  //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},{
  "extensions": [
    ".js",
    ".json",
    ".html",
    ".ts",
    ".jsx",
    ".mjs",
    ".scss"
  ]
});

var exports = require("/client/main.jsx");