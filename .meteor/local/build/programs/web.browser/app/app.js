var require = meteorInstall({"imports":{"ui":{"components":{"Banner.jsx":function module(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// imports/ui/components/Banner.jsx                                                                                 //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
      "uk-slideshow": "animation: pull; autoplay: true"
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
      }, item.title), item.buttonText && item.buttonUrl && /*#__PURE__*/React.createElement("a", {
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
    ImageGrid: () => ImageGrid
  });
  let React;
  module1.link("react", {
    default(v) {
      React = v;
    }
  }, 0);
  ___INIT_METEOR_FAST_REFRESH(module);
  const ImageGrid = function (_ref) {
    let {
      title,
      items = []
    } = _ref;
    return /*#__PURE__*/React.createElement("section", {
      className: "image-grid"
    }, items && items.length && /*#__PURE__*/React.createElement("div", {
      className: "uk-container uk-padding"
    }, title && /*#__PURE__*/React.createElement("h3", {
      className: "image-grid__title uk-text-bold"
    }, title), /*#__PURE__*/React.createElement("div", {
      className: "uk-child-width-expand@s uk-grid",
      "uk-grid": "true"
    }, items.map((item, index) => {
      return /*#__PURE__*/React.createElement("a", {
        href: "/",
        key: index,
        className: index == 0 ? 'uk-first-column' : ''
      }, /*#__PURE__*/React.createElement("div", {
        className: "uk-card uk-card-default uk-card-body"
      }, /*#__PURE__*/React.createElement("div", {
        className: "image-grid__item-image"
      }, /*#__PURE__*/React.createElement("img", {
        src: item.image
      })), /*#__PURE__*/React.createElement("div", {
        className: "uk-padding"
      }, /*#__PURE__*/React.createElement("h3", null, item.title), /*#__PURE__*/React.createElement("p", null, item.description))));
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
  const Navbar = () => {
    _s();
    const active = 'mobile-nav--active';
    let ref = useRef(null);
    const toggleMenu = async function (event) {
      event.preventDefault();
      const target = ref.current;
      if (target.className.indexOf(active) > -1) {
        target.classList.remove(active);
        return;
      }
      target.classList.add(active);
    };
    return /*#__PURE__*/React.createElement(Fragment, null, /*#__PURE__*/React.createElement("header", {
      "uk-sticky": "sel-target: .uk-navbar-container; cls-active: uk-navbar-sticky; end: + *;"
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
    }, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
      href: "#"
    }, "Events")), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
      href: "#"
    }, "Leagues")), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
      href: "#"
    }, "Parks")), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
      href: "#"
    }, "Atheletes")))), /*#__PURE__*/React.createElement("div", {
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

}},"routes":{"Home.jsx":function module(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// imports/ui/routes/Home.jsx                                                                                       //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
  ___INIT_METEOR_FAST_REFRESH(module);
  const Home = function () {
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
      }]
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
  let Footer;
  module1.link("/imports/ui/components/Footer", {
    Footer(v) {
      Footer = v;
    }
  }, 3);
  ___INIT_METEOR_FAST_REFRESH(module);
  var _s = $RefreshSig$();
  const App = () => {
    _s();
    const [routes, setRoutes] = useState({
      home: true,
      events: false,
      leagues: false,
      parks: false
    }, []);
    return /*#__PURE__*/React.createElement(Fragment, null, /*#__PURE__*/React.createElement(Navbar, null), Home && /*#__PURE__*/React.createElement(Home, null), /*#__PURE__*/React.createElement(Footer, null));
  };
  _s(App, "weCC01dfh+tY9ZgC+W5WLQU6rCw=");
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
    asyncTimeout: () => asyncTimeout
  });
  ___INIT_METEOR_FAST_REFRESH(module);
  const asyncTimeout = function (ms) {
    console.log('Timeout for ' + ms);
    return new Promise(resolve => setTimeout(resolve, ms));
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
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},{
  "extensions": [
    ".js",
    ".json",
    ".html",
    ".jsx",
    ".scss"
  ]
});

var exports = require("/client/main.jsx");