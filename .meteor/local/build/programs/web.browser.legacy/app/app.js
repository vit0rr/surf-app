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
    return /*#__PURE__*/React.createElement(Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "page-event__bg page-event__bg--background",
      style: {
        backgroundImage: "url(./" + event.image + ")"
      }
    }), /*#__PURE__*/React.createElement("div", {
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
  var data;
  module1.link("../../../../client/scripts/data", {
    "default": function (v) {
      data = v;
    }
  }, 1);
  var getCSSVariable, asyncTimeout;
  module1.link("../../../../client/scripts/helpers.js", {
    getCSSVariable: function (v) {
      getCSSVariable = v;
    },
    asyncTimeout: function (v) {
      asyncTimeout = v;
    }
  }, 2);
  var Background;
  module1.link("./Background", {
    Background: function (v) {
      Background = v;
    }
  }, 3);
  var CTARegister;
  module1.link("../../components/CTARegister.jsx", {
    CTARegister: function (v) {
      CTARegister = v;
    }
  }, 4);
  var Standings;
  module1.link("../../components/Standings.jsx", {
    Standings: function (v) {
      Standings = v;
    }
  }, 5);
  var ParkMap;
  module1.link("../../components/ParkMap.jsx", {
    ParkMap: function (v) {
      ParkMap = v;
    }
  }, 6);
  var Stream;
  module1.link("../../components/Stream.jsx", {
    Stream: function (v) {
      Stream = v;
    }
  }, 7);
  ___INIT_METEOR_FAST_REFRESH(module);
  var _s = $RefreshSig$();
  var Event = function (props) {
    _s();
    var mainRef = useRef(null);
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
    }, []);
    return /*#__PURE__*/React.createElement("main", {
      ref: mainRef,
      className: "page-event"
    }, /*#__PURE__*/React.createElement(Background, {
      event: data.event,
      primary: data.event.theme.primary,
      secondary: data.event.theme.secondary
    }), /*#__PURE__*/React.createElement("div", {
      className: "container uk-container uk-container-large"
    }, /*#__PURE__*/React.createElement("section", {
      className: "page-event__cta-register uk-card uk-card-default uk-card-small uk-card-body animate__animated animate__delay-1s " + animation
    }, /*#__PURE__*/React.createElement(CTARegister, null)), /*#__PURE__*/React.createElement("section", {
      className: "page-event__standings uk-card uk-card-default uk-card-small uk-card-body animate__animated animate__delay-1s " + animation
    }, /*#__PURE__*/React.createElement(Standings, null)), /*#__PURE__*/React.createElement("section", {
      className: "page-event__park-map animate__animated animate__delay-1s " + animation
    }, /*#__PURE__*/React.createElement("div", {
      className: " uk-card uk-card-default uk-card-small uk-card-body"
    }, /*#__PURE__*/React.createElement(Stream, null)), /*#__PURE__*/React.createElement("div", {
      className: " uk-card uk-card-default uk-card-small uk-card-body"
    }, /*#__PURE__*/React.createElement(ParkMap, null)))));
  };
  _s(Event, "AwBpkQpZdXbs5zhD/ELLeSKVTlM=");
  _c = Event;
  var _c;
  $RefreshReg$(_c, "Event");
}.call(this, module);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"Park":{"About.jsx":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/routes/Park/About.jsx                                                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!function (module1) {
  module1.export({
    About: function () {
      return About;
    }
  });
  var React, Fragment, useRef, useEffect;
  module1.link("react", {
    "default": function (v) {
      React = v;
    },
    Fragment: function (v) {
      Fragment = v;
    },
    useRef: function (v) {
      useRef = v;
    },
    useEffect: function (v) {
      useEffect = v;
    }
  }, 0);
  var randomInt, intersectionObserver;
  module1.link("../../../../client/scripts/helpers.js", {
    randomInt: function (v) {
      randomInt = v;
    },
    intersectionObserver: function (v) {
      intersectionObserver = v;
    }
  }, 1);
  ___INIT_METEOR_FAST_REFRESH(module);
  var _s = $RefreshSig$();
  var About = function (_ref) {
    var park = _ref.park;
    _s();
    var imageRef = useRef(null);
    var squareRef = useRef(null);
    var contentRef = useRef(null);
    var index = randomInt(0, park.media.length - 1, true);
    var image = park.media[index];

    // const formatDescription = (str) {
    // 	let descripition = <span>;

    // 	return <span>;
    // }

    useEffect(function () {
      var image = imageRef.current;
      intersectionObserver(image, function (event) {
        if (event[0].isIntersecting) image.classList.add('animate__fadeInLeft');
      }, {
        threshold: 0.75
      });
      var square = squareRef.current;
      intersectionObserver(square, function (event) {
        if (event[0].isIntersecting) square.classList.add('animate__fadeInUp');
      }, {
        threshold: 0.75
      });
      var content = contentRef.current;
      intersectionObserver(content, function (event) {
        if (event[0].isIntersecting) content.classList.add('animate__fadeIn');
      }, {
        threshold: 0.75
      });
    }, []);
    return /*#__PURE__*/React.createElement(Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "page-park__about-overlay",
      style: {
        backgroundColor: park.theme.primary
      }
    }), /*#__PURE__*/React.createElement("div", {
      className: "page-park__about-image uk-visible@m"
    }, /*#__PURE__*/React.createElement("img", {
      ref: imageRef,
      className: "animate__animated",
      src: image
    }), /*#__PURE__*/React.createElement("div", {
      ref: squareRef,
      className: "page-park__about-image-square animate__animated",
      style: {
        backgroundColor: park.theme.secondary
      }
    })), /*#__PURE__*/React.createElement("div", {
      ref: contentRef,
      className: "page-park__about-content animate__animated"
    }, /*#__PURE__*/React.createElement("h3", {
      className: "uk-h1 uk-text-uppercase uk-text-bold"
    }, "The Park"), /*#__PURE__*/React.createElement("p", {
      dangerouslySetInnerHTML: {
        __html: park.description
      }
    }), /*#__PURE__*/React.createElement("a", {
      className: "uk-button uk-button-danger",
      href: park.url,
      style: {
        backgroundColor: park.theme.secondary
      }
    }, "Visit ", park.name), /*#__PURE__*/React.createElement("div", {
      className: "page-park__about-social-media"
    }, park.social.map(function (item, index) {
      var icon = 'link';
      if (item.indexOf('facebook') > -1) icon = 'facebook';
      if (item.indexOf('instagram') > -1) icon = 'instagram';
      if (item.indexOf('twitter') > -1) icon = 'twitter';
      if (item.indexOf('youtube') > -1) icon = 'youtube';
      return /*#__PURE__*/React.createElement("a", {
        key: index,
        href: item,
        target: "_blank"
      }, /*#__PURE__*/React.createElement("span", {
        "uk-icon": "icon: " + icon
      }));
    }))));
  };
  _s(About, "sVfNSQ0Y2oHlAJpaA+dnQVsuKKA=");
  _c = About;
  var _c;
  $RefreshReg$(_c, "About");
}.call(this, module);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Background.jsx":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/routes/Park/Background.jsx                                                                               //
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
    return /*#__PURE__*/React.createElement(Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "page-event__bg page-event__bg--background",
      style: {
        backgroundImage: "url(./" + event.image + ")"
      }
    }), /*#__PURE__*/React.createElement("div", {
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

},"Banner.jsx":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/routes/Park/Banner.jsx                                                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!function (module1) {
  module1.export({
    Banner: function () {
      return Banner;
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
  var Banner = function (_ref) {
    var park = _ref.park;
    return /*#__PURE__*/React.createElement(Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "page-park__banner-overlay",
      style: {
        backgroundColor: park.theme.secondary
      }
    }), /*#__PURE__*/React.createElement("img", {
      className: "page-park__banner-image",
      src: park.image
    }), /*#__PURE__*/React.createElement("div", {
      className: "page-park__banner-content"
    }, /*#__PURE__*/React.createElement("img", {
      src: park.logo,
      alt: park.name
    }), /*#__PURE__*/React.createElement("h1", {
      className: "uk-h2 uk-text-bolder uk-text-uppercase"
    }, park.name), /*#__PURE__*/React.createElement("a", {
      href: park.url,
      target: "_black",
      title: park.name,
      className: "uk-text-bold uk-text-uppercase"
    }, park.url), /*#__PURE__*/React.createElement("div", {
      className: "page-park__banner-social-media"
    }, park.social.map(function (item, index) {
      var icon = 'link';
      if (item.indexOf('facebook') > -1) icon = 'facebook';
      if (item.indexOf('instagram') > -1) icon = 'instagram';
      if (item.indexOf('twitter') > -1) icon = 'twitter';
      if (item.indexOf('youtube') > -1) icon = 'youtube';
      return /*#__PURE__*/React.createElement("a", {
        key: index,
        href: item,
        target: "_blank"
      }, /*#__PURE__*/React.createElement("span", {
        "uk-icon": "icon: " + icon
      }));
    }))));
  };
  _c = Banner;
  var _c;
  $RefreshReg$(_c, "Banner");
}.call(this, module);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Events.jsx":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/routes/Park/Events.jsx                                                                                   //
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
  module1.export({
    Events: function () {
      return Events;
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
  var Events = function (_ref) {
    var park = _ref.park;
    return /*#__PURE__*/React.createElement("div", {
      className: "page-park__event",
      "uk-slider": "center: true"
    }, /*#__PURE__*/React.createElement("ul", {
      className: "uk-slider-items"
    }, [].concat(_toConsumableArray(park.events), _toConsumableArray(park.events)).map(function (event, index) {
      var month = dayjs(event.date).format('MM');
      var day = dayjs(event.date).format('DD');
      return /*#__PURE__*/React.createElement("li", {
        key: index
      }, /*#__PURE__*/React.createElement("a", null, /*#__PURE__*/React.createElement("div", {
        className: "page-park__event-overlay",
        style: {
          background: "linear-gradient(0.25turn, " + park.theme.secondary + ", transparent)"
        }
      }), /*#__PURE__*/React.createElement("div", {
        className: "page-park__event-content"
      }, /*#__PURE__*/React.createElement("h5", {
        style: {
          color: park.theme.primary
        },
        className: "uk-text-uppercase uk-text-bold"
      }, event.title), /*#__PURE__*/React.createElement("h6", {
        className: "uk-text-uppercase"
      }, event.subtitle)), /*#__PURE__*/React.createElement("div", {
        className: "page-park__event-date"
      }, /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("span", null, day), /*#__PURE__*/React.createElement("span", null, "/"), /*#__PURE__*/React.createElement("span", null, month))), /*#__PURE__*/React.createElement("img", {
        src: event.image,
        width: "",
        height: "",
        alt: ""
      })));
    })));
  };
  _c = Events;
  var _c;
  $RefreshReg$(_c, "Events");
}.call(this, module);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"HappeningNow.jsx":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/routes/Park/HappeningNow.jsx                                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!function (module1) {
  module1.export({
    HappeningNow: function () {
      return HappeningNow;
    }
  });
  var React, Fragment, useRef, useEffect;
  module1.link("react", {
    "default": function (v) {
      React = v;
    },
    Fragment: function (v) {
      Fragment = v;
    },
    useRef: function (v) {
      useRef = v;
    },
    useEffect: function (v) {
      useEffect = v;
    }
  }, 0);
  var intersectionObserver;
  module1.link("../../../../client/scripts/helpers.js", {
    intersectionObserver: function (v) {
      intersectionObserver = v;
    }
  }, 1);
  ___INIT_METEOR_FAST_REFRESH(module);
  var _s = $RefreshSig$();
  var HappeningNow = function (_ref) {
    var park = _ref.park,
      event = _ref.event,
      full = _ref.full;
    _s();
    //const imageRef = useRef(null);
    // const formatDescription = (str) {
    // 	let descripition = <span>;

    useEffect(function () {
      // const image = imageRef.current;
      // intersectionObserver(
      // 	image,
      // 	(event) => {
      // 		if (event[0].isIntersecting) image.classList.add('animate__fadeInLeft');
      // 	},
      // 	{ threshold: 0.75 }
      // );
    }, []);
    console.log(event);
    return /*#__PURE__*/React.createElement("div", {
      className: "page-park__happening-now" + (full ? ' page-park__happening-now--full' : '')
    }, /*#__PURE__*/React.createElement("img", {
      className: "page-park__happening-now-cover animate__animated animate__delay-1s animate__fadeIn",
      src: "./" + event.image
    }), /*#__PURE__*/React.createElement("div", {
      className: "page-park__happening-now-info animate__animated animate__fadeInDown animate__delay-2s"
    }, /*#__PURE__*/React.createElement("img", {
      src: park.logo,
      alt: event.title
    }), /*#__PURE__*/React.createElement("div", {
      className: "page-park__happening-now-title"
    }, /*#__PURE__*/React.createElement("h5", {
      className: "uk-h6 uk-text-uppercase uk-text-bolder"
    }, event.title), /*#__PURE__*/React.createElement("h6", {
      className: "uk-text-uppercase"
    }, event.subtitle))), /*#__PURE__*/React.createElement("div", {
      className: "page-park__happening-now-cta animate__animated animate__fadeInUp animate__delay-2s"
    }, /*#__PURE__*/React.createElement("h6", {
      className: "uk-text-uppercase uk-text-bolder uk-text-italic"
    }, "Happening ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: event.theme.primary
      }
    }, "Now")), /*#__PURE__*/React.createElement("button", {
      className: "uk-button uk-button-secondary uk-button-large",
      style: {
        backgroundColor: event.theme.primary
      }
    }, "Jump In")));
  };
  _s(HappeningNow, "OD7bBpZva5O2jO+Puf00hKivP7c=");
  _c = HappeningNow;
  var _c;
  $RefreshReg$(_c, "HappeningNow");
}.call(this, module);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.jsx":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/routes/Park/index.jsx                                                                                    //
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
  var data;
  module1.link("../../../../client/scripts/data", {
    "default": function (v) {
      data = v;
    }
  }, 1);
  var getCSSVariable, asyncTimeout;
  module1.link("../../../../client/scripts/helpers.js", {
    getCSSVariable: function (v) {
      getCSSVariable = v;
    },
    asyncTimeout: function (v) {
      asyncTimeout = v;
    }
  }, 2);
  var Background;
  module1.link("./Background", {
    Background: function (v) {
      Background = v;
    }
  }, 3);
  var Banner;
  module1.link("./Banner", {
    Banner: function (v) {
      Banner = v;
    }
  }, 4);
  var HappeningNow;
  module1.link("./HappeningNow", {
    HappeningNow: function (v) {
      HappeningNow = v;
    }
  }, 5);
  var Events;
  module1.link("./Events", {
    Events: function (v) {
      Events = v;
    }
  }, 6);
  var About;
  module1.link("./About", {
    About: function (v) {
      About = v;
    }
  }, 7);
  var CTARegister;
  module1.link("../../components/CTARegister.jsx", {
    CTARegister: function (v) {
      CTARegister = v;
    }
  }, 8);
  ___INIT_METEOR_FAST_REFRESH(module);
  var _s = $RefreshSig$();
  var Park = function (props) {
    _s();
    var mainRef = useRef(null);
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
    }, []);
    return /*#__PURE__*/React.createElement("main", {
      ref: mainRef,
      className: "page-park"
    }, /*#__PURE__*/React.createElement(Background, {
      event: data.park,
      primary: data.park.theme.primary,
      secondary: data.park.theme.secondary
    }), /*#__PURE__*/React.createElement("div", {
      className: "container"
    }, /*#__PURE__*/React.createElement("section", {
      className: "page-park__banner animate__animated animate__delay-1s " + animation
    }, /*#__PURE__*/React.createElement(Banner, {
      park: data.park
    })), /*#__PURE__*/React.createElement("section", {
      className: "page-park__happening animate__animated animate__delay-1s " + animation
    }, /*#__PURE__*/React.createElement(HappeningNow, {
      park: data.park,
      event: data.event
    }))), /*#__PURE__*/React.createElement("div", {
      className: "container"
    }, /*#__PURE__*/React.createElement("section", {
      className: "page-park__events animate__animated animate__delay-1s " + animation
    }, /*#__PURE__*/React.createElement(Events, {
      park: data.park
    }))), /*#__PURE__*/React.createElement("div", {
      className: "container"
    }, /*#__PURE__*/React.createElement("section", {
      className: "page-park__about animate__animated animate__delay-1s " + animation
    }, /*#__PURE__*/React.createElement(About, {
      park: data.park
    })), /*#__PURE__*/React.createElement("section", {
      className: "page-park__happening page-park__happening--full animate__animated animate__delay-1s " + animation
    }, /*#__PURE__*/React.createElement(HappeningNow, {
      park: data.park,
      event: data.event,
      full: true
    }))));
  };
  _s(Park, "AwBpkQpZdXbs5zhD/ELLeSKVTlM=");
  _c = Park;
  var _c;
  $RefreshReg$(_c, "Park");
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
  module1.link("../../../client/scripts/data", {
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
  module1.link("../../../client/scripts/data", {
    "default": function (v) {
      data = v;
    }
  }, 3);
  ___INIT_METEOR_FAST_REFRESH(module);
  var Home = function (props) {
    var items = [{
      video: true,
      src: 'banner.mp4',
      title: /*#__PURE__*/React.createElement("span", null, "Featured", /*#__PURE__*/React.createElement("br", null), "Waco Surf Park"),
      subtitle: 'Live',
      description: "Texas isn't known for its surfing, but Waco Surf has changed the game.",
      buttonText: 'View',
      buttonUrl: 'https://www.youtube.com/watch?v=jfGuUD-inBM'
    }];
    return /*#__PURE__*/React.createElement("main", {
      className: "page-home"
    }, /*#__PURE__*/React.createElement(Banner, {
      items: items
    }), /*#__PURE__*/React.createElement(ImageGrid, {
      title: "Nearby Parks",
      type: "park",
      items: data.parks,
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

},"CTARegister.jsx":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/components/CTARegister.jsx                                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!function (module1) {
  module1.export({
    CTARegister: function () {
      return CTARegister;
    }
  });
  var React;
  module1.link("react", {
    "default": function (v) {
      React = v;
    }
  }, 0);
  var data;
  module1.link("../../../client/scripts/data", {
    "default": function (v) {
      data = v;
    }
  }, 1);
  ___INIT_METEOR_FAST_REFRESH(module);
  var CTARegister = function () {
    return /*#__PURE__*/React.createElement("div", {
      className: "cta-register"
    }, /*#__PURE__*/React.createElement("img", {
      className: "cta-register__cover animate__animated animate__delay-1s animate__fadeIn",
      src: "./" + data.event.image
    }), /*#__PURE__*/React.createElement("div", {
      className: "cta-register__info animate__animated animate__fadeInDown animate__delay-2s"
    }, /*#__PURE__*/React.createElement("img", {
      src: data.event.logo,
      alt: data.event.title
    }), /*#__PURE__*/React.createElement("div", {
      className: "cta-register__title"
    }, /*#__PURE__*/React.createElement("h5", {
      className: "uk-h6 uk-text-uppercase uk-text-bolder"
    }, data.event.title), /*#__PURE__*/React.createElement("h6", {
      className: "uk-text-uppercase"
    }, data.event.subtitle))), /*#__PURE__*/React.createElement("div", {
      className: "cta-register__cta animate__animated animate__fadeInUp animate__delay-2s"
    }, /*#__PURE__*/React.createElement("h6", {
      className: "uk-text-uppercase uk-text-bolder uk-text-italic"
    }, "Registration Open"), /*#__PURE__*/React.createElement("button", {
      className: "uk-button uk-button-secondary uk-button-large",
      style: {
        backgroundColor: data.event.theme.secondary
      }
    }, "Sign Up")));
  };
  _c = CTARegister;
  var _c;
  $RefreshReg$(_c, "CTARegister");
}.call(this, module);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Expand.jsx":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/components/Expand.jsx                                                                                    //
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
    Expand: function () {
      return Expand;
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
  var asyncTimeout, getCSSVariable;
  module1.link("../../../client/scripts/helpers.js", {
    asyncTimeout: function (v) {
      asyncTimeout = v;
    },
    getCSSVariable: function (v) {
      getCSSVariable = v;
    }
  }, 1);
  ___INIT_METEOR_FAST_REFRESH(module);
  var _s = $RefreshSig$();
  var Expand = function (props) {
    _s();
    useEffect(function () {
      var container = document.querySelector("[data-expand=\"" + props.id + "\"]");
      if (!container) return;
      container.classList.add('animate__animated');
    });
    var expand = function () {
      function _callee() {
        var container, delay;
        return _regeneratorRuntime.async(function () {
          function _callee$(_context) {
            while (1) switch (_context.prev = _context.next) {
              case 0:
                container = document.querySelector("[data-expand=\"" + props.id + "\"]");
                delay = parseInt(getCSSVariable('--animate-delay'));
                if (container) {
                  _context.next = 4;
                  break;
                }
                return _context.abrupt("return");
              case 4:
                if (!(container.className.indexOf('expand') > -1)) {
                  _context.next = 10;
                  break;
                }
                container.classList.add(props.animationOut);
                _context.next = 8;
                return _regeneratorRuntime.awrap(asyncTimeout(delay));
              case 8:
                container.classList.remove(props.animationOut, props.animationIn, 'expand');
                return _context.abrupt("return");
              case 10:
                container.classList.add('expand');
                container.classList.add(props.animationIn);
              case 12:
              case "end":
                return _context.stop();
            }
          }
          return _callee$;
        }(), null, null, null, Promise);
      }
      return _callee;
    }();
    return /*#__PURE__*/React.createElement("button", {
      "data-expand-trigger": "stream",
      "uk-icon": "icon: expand",
      onClick: expand
    });
  };
  _s(Expand, "OD7bBpZva5O2jO+Puf00hKivP7c=");
  _c = Expand;
  var _c;
  $RefreshReg$(_c, "Expand");
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
      title = _ref$title === void 0 ? '' : _ref$title;
    return /*#__PURE__*/React.createElement("section", {
      className: "image-grid"
    }, items && items.length && /*#__PURE__*/React.createElement("div", {
      className: "uk-container uk-padding"
    }, title && /*#__PURE__*/React.createElement("h3", {
      className: "uk-h4 image-grid__title uk-text-bolder uk-text-uppercase"
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
        className: className
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
      }, /*#__PURE__*/React.createElement("h3", {
        className: "uk-h4 uk-text-uppercase"
      }, item.title || item.name), /*#__PURE__*/React.createElement("p", null, item.description), item.url && /*#__PURE__*/React.createElement("button", {
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

},"ParkMap.jsx":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/components/ParkMap.jsx                                                                                   //
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
    ParkMap: function () {
      return ParkMap;
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
  var data;
  module1.link("../../../client/scripts/data", {
    "default": function (v) {
      data = v;
    }
  }, 1);
  var getCSSVariable;
  module1.link("../../../client/scripts/helpers.js", {
    getCSSVariable: function (v) {
      getCSSVariable = v;
    }
  }, 2);
  var Expand;
  module1.link("./Expand.jsx", {
    Expand: function (v) {
      Expand = v;
    }
  }, 3);
  ___INIT_METEOR_FAST_REFRESH(module);
  var _s = $RefreshSig$();
  var ParkMap = function () {
    _s();
    var mapRef = useRef(null);
    var athlete = data.athletes[0];
    var _useState = useState(''),
      _useState2 = _slicedToArray(_useState, 2),
      animation = _useState2[0],
      setAnimation = _useState2[1];
    var setPointData = function () {
      var map = document.querySelector('[data-map]');
      data.event.run.points.forEach(function (point, index) {
        var anchor = document.querySelectorAll('[data-anchor]')[index];
        var line = document.createElement('div');
        line.classList.add('line');
        line.setAttribute('data-line', index);
        line.style.borderColro = data.event.theme.primary;
        line.style.left = "calc(" + anchor.style.left + " + 20px)";
        var markup = "\n\t\t\t\t<h6 class=\"uk-text-uppercase uk-text-bolder\" style=\"color: " + data.event.theme.primary + ";\">" + point.title + "</h6>\n\t\t\t\t<p class=\"uk-text-uppercase uk-text-light\">" + point.text + "</p>\n\t\t\t";
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
    useEffect(function () {
      var delay = parseInt(getCSSVariable('--animate-delay'));
      setAnimation('');
      setTimeout(function () {
        setAnimation('animate__fadeInUp');
      }, delay);
      setTimeout(function () {
        setPointData();
      }, delay * 2);
    }, []);
    return /*#__PURE__*/React.createElement("div", {
      ref: mapRef,
      className: "park-map uk-padding-small animate__animated",
      "data-expand": "park-map"
    }, /*#__PURE__*/React.createElement("h4", {
      className: "uk-text-bold uk-text-uppercase",
      style: {
        color: data.event.theme.primary
      }
    }, /*#__PURE__*/React.createElement("span", null, "Current"), " Run"), /*#__PURE__*/React.createElement(Expand, {
      id: "park-map",
      animationIn: "animate__fadeIn",
      animationOut: "animate__fadeOut"
    }), /*#__PURE__*/React.createElement("div", {
      className: "park-map__athlete"
    }, /*#__PURE__*/React.createElement("div", {
      className: "park-map__athlete-run animate__animated animate__delay-1s " + animation,
      style: {
        backgroundColor: data.event.theme.primary
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "park-map__athlete-image"
    }, /*#__PURE__*/React.createElement("img", {
      src: athlete.image
    })), /*#__PURE__*/React.createElement("div", {
      className: "park-map__athlete-name uk-padding-small uk-text-uppercase uk-text-bold"
    }, /*#__PURE__*/React.createElement("span", null, athlete.name)), /*#__PURE__*/React.createElement("div", {
      className: "park-map__athlete-current-run uk-padding-small uk-text-uppercase uk-text-bold"
    }, /*#__PURE__*/React.createElement("span", null, "Run ", athlete.run)), /*#__PURE__*/React.createElement("div", {
      className: "park-map__athlete-points uk-padding-small uk-text-uppercase uk-text-bold"
    }, /*#__PURE__*/React.createElement("span", null, athlete.points)))), /*#__PURE__*/React.createElement("div", {
      "data-map": "map",
      className: "park-map__map",
      onClick: getCoords
    }, data.event.run.points.map(function (point, index) {
      return /*#__PURE__*/React.createElement("div", {
        key: index,
        "data-anchor": index,
        className: "park-map__map-point",
        style: {
          top: point.coords.y,
          left: point.coords.x,
          backgroundColor: data.event.theme.primary
        }
      });
    }), /*#__PURE__*/React.createElement("img", {
      src: data.event.park
    })));
  };
  _s(ParkMap, "8mg4/kRZfWN5fRut+ZOjd2QN7VU=");
  _c = ParkMap;
  var _c;
  $RefreshReg$(_c, "ParkMap");
}.call(this, module);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Standings.jsx":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/components/Standings.jsx                                                                                 //
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
    Standings: function () {
      return Standings;
    }
  });
  var React, Fragment, useEffect, useState;
  module1.link("react", {
    "default": function (v) {
      React = v;
    },
    Fragment: function (v) {
      Fragment = v;
    },
    useEffect: function (v) {
      useEffect = v;
    },
    useState: function (v) {
      useState = v;
    }
  }, 0);
  var data;
  module1.link("../../../client/scripts/data", {
    "default": function (v) {
      data = v;
    }
  }, 1);
  var getCSSVariable, randomInt, sortBy;
  module1.link("../../../client/scripts/helpers.js", {
    getCSSVariable: function (v) {
      getCSSVariable = v;
    },
    randomInt: function (v) {
      randomInt = v;
    },
    sortBy: function (v) {
      sortBy = v;
    }
  }, 2);
  var Expand;
  module1.link("./Expand.jsx", {
    Expand: function (v) {
      Expand = v;
    }
  }, 3);
  ___INIT_METEOR_FAST_REFRESH(module);
  var _s = $RefreshSig$();
  var Standings = function () {
    _s();
    var keys = ['place', 'image', 'name', 'gender', 'run', 'points'];
    var athletes = _toConsumableArray(data.event.athletes).map(function (athlete, index) {
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
    athletes = sortBy(athletes, 'points', true);
    var _useState = useState(''),
      _useState2 = _slicedToArray(_useState, 2),
      animation = _useState2[0],
      setAnimation = _useState2[1];
    var _useState3 = useState([{
        label: /*#__PURE__*/React.createElement(Fragment, null, "Men's", ' ', /*#__PURE__*/React.createElement("span", {
          className: "standings-label",
          style: {
            color: data.event.theme.primary
          }
        }, "Standings")),
        slug: 'male',
        active: true
      }, {
        label: /*#__PURE__*/React.createElement(Fragment, null, "Women's", /*#__PURE__*/React.createElement("span", {
          className: "standings-label",
          style: {
            color: data.event.theme.primary
          }
        }, "Standings")),
        slug: 'female',
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
    var tab = tabs.find(function (tab) {
      return tab.active;
    });
    var index = tabs.findIndex(function (t) {
      return t.slug == tab.slug;
    });
    useEffect(function () {
      var delay = parseInt(getCSSVariable('--animate-delay'));
      setAnimation('');
      setTimeout(function () {
        setAnimation('animate__fadeIn');
      }, delay);
    }, [tabs]);
    return /*#__PURE__*/React.createElement("div", {
      "data-expand": "standings",
      className: "standings"
    }, /*#__PURE__*/React.createElement(Expand, {
      id: "standings",
      animationIn: "animate__fadeIn",
      animationOut: "animate__fadeOut"
    }), /*#__PURE__*/React.createElement("div", {
      className: "standings__table-header"
    }, /*#__PURE__*/React.createElement("button", {
      className: "uk-text-bold uk-h4 uk-text-uppercase",
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
    }))), /*#__PURE__*/React.createElement("div", {
      className: "standings__table-body animate__animated " + animation
    }, Object.keys(athletes[0]).map(function (key) {
      if (!['gender', 'place', 'image'].includes(key)) {
        return /*#__PURE__*/React.createElement("div", {
          key: key,
          className: "standings__table-cell-head standings__table-cell-head--" + key + " athlete--heading athlete--heading-" + key + " uk-text-uppercase uk-text-bold",
          style: {
            backgroundColor: "" + (key == 'name' && data.event.theme.primary)
          },
          "data-name": key == 'name' ? 'athlete' : key
        }, /*#__PURE__*/React.createElement("span", null, key == 'name' ? 'athlete' : key));
      }
    }), athletes.filter(function (a) {
      return a.gender == tab.slug;
    }).map(function (athlete, index) {
      var place = index + 1;
      var pointsWidth = athlete.points / 10 * 100;
      var delay = index + 1;
      var transitionDelay = '1.' + delay + 's';
      return /*#__PURE__*/React.createElement("a", {
        href: athlete.url,
        key: index,
        className: "standings__table-cell-data",
        style: {
          backgroundColor: data.event.theme.primary
        }
      }, /*#__PURE__*/React.createElement("div", {
        className: "standings__table-cell-data-item standings__table-cell-data-item--place",
        "data-index": place
      }, /*#__PURE__*/React.createElement("span", null, place)), /*#__PURE__*/React.createElement("div", {
        className: "standings__table-cell-data-item standings__table-cell-data-item--image"
      }, /*#__PURE__*/React.createElement("img", {
        src: athlete.image
      })), /*#__PURE__*/React.createElement("div", {
        className: "standings__table-cell-data-item standings__table-cell-data-item--name"
      }, /*#__PURE__*/React.createElement("h6", {
        className: "uk-text-normal uk-text-uppercase uk-text-bolder"
      }, athlete.name)), /*#__PURE__*/React.createElement("div", {
        className: "standings__table-cell-data-item standings__table-cell-data-item--run"
      }, /*#__PURE__*/React.createElement("span", {
        className: "uk-text-bolder",
        style: {
          color: data.event.theme.primary
        }
      }, athlete.run)), /*#__PURE__*/React.createElement("div", {
        className: "standings__table-cell-data-item standings__table-cell-data-item--points"
      }, /*#__PURE__*/React.createElement("span", {
        className: "uk-text-bolder uk-text-italic",
        style: {
          color: data.event.theme.primary
        }
      }, athlete.points)));
    })));
  };
  _s(Standings, "L0KMGSgec6GthQUkzXD4L6qpTq4=");
  _c = Standings;
  var _c;
  $RefreshReg$(_c, "Standings");
}.call(this, module);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Stream.jsx":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/components/Stream.jsx                                                                                    //
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
    Stream: function () {
      return Stream;
    }
  });
  var React, useState, useEffect, useRef;
  module1.link("react", {
    "default": function (v) {
      React = v;
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
  var data;
  module1.link("../../../client/scripts/data", {
    "default": function (v) {
      data = v;
    }
  }, 1);
  var getCSSVariable;
  module1.link("../../../client/scripts/helpers.js", {
    getCSSVariable: function (v) {
      getCSSVariable = v;
    }
  }, 2);
  var Expand;
  module1.link("./Expand.jsx", {
    Expand: function (v) {
      Expand = v;
    }
  }, 3);
  ___INIT_METEOR_FAST_REFRESH(module);
  var _s = $RefreshSig$();
  var Stream = function () {
    _s();
    var videoRef = useRef(null);
    var _useState = useState(false),
      _useState2 = _slicedToArray(_useState, 2),
      play = _useState2[0],
      setPlay = _useState2[1];
    var _useState3 = useState(''),
      _useState4 = _slicedToArray(_useState3, 2),
      animation = _useState4[0],
      setAnimation = _useState4[1];
    var toggle = function () {
      var player = videoRef.current;
      if (play) {
        player.pause();
        setPlay(false);
        return;
      }
      player.play();
      setPlay(true);
    };
    useEffect(function () {
      var delay = parseInt(getCSSVariable('--animate-delay'));
      setAnimation('');
      setTimeout(function () {
        setAnimation('animate__fadeIn');
      }, delay);
    }, []);
    return /*#__PURE__*/React.createElement("div", {
      "data-expand": "stream",
      className: "stream"
    }, /*#__PURE__*/React.createElement(Expand, {
      id: "stream",
      animationIn: "animate__fadeIn",
      animationOut: "animate__fadeOut"
    }), /*#__PURE__*/React.createElement("h4", {
      className: "uk-text-bold uk-text-uppercase",
      style: {
        color: data.event.theme.primary
      }
    }, /*#__PURE__*/React.createElement("span", null, "Happening"), " Now"), /*#__PURE__*/React.createElement("div", {
      className: "stream__video-player animate__animated " + animation
    }, /*#__PURE__*/React.createElement("video", {
      className: "" + (play ? 'playing' : ''),
      ref: videoRef,
      src: data.event.stream,
      onClick: toggle
    }), !play && /*#__PURE__*/React.createElement("button", {
      className: "stream__play active",
      "uk-icon": "icon: play-circle",
      onClick: toggle
    })));
  };
  _s(Stream, "5MbSwFWUR1ae6cjBdLpdbA0GNAw=");
  _c = Stream;
  var _c;
  $RefreshReg$(_c, "Stream");
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
  var React, Fragment, useState, useEffect;
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
  var Park;
  module1.link("/imports/ui/routes/Park", {
    Park: function (v) {
      Park = v;
    }
  }, 5);
  var Footer;
  module1.link("/imports/ui/components/Footer", {
    Footer: function (v) {
      Footer = v;
    }
  }, 6);
  var data;
  module1.link("../../client/scripts/data", {
    "default": function (v) {
      data = v;
    }
  }, 7);
  var transition;
  module1.link("../../client/scripts/helpers.js", {
    transition: function (v) {
      transition = v;
    }
  }, 8);
  ___INIT_METEOR_FAST_REFRESH(module);
  var _s = $RefreshSig$();
  console.log(data);
  var App = function () {
    _s();
    var _useState = useState({
        home: {
          background: 'transparent',
          active: false
        },
        parks: {
          background: 'transparent',
          active: false
        },
        park: {
          background: 'transparent',
          active: true,
          hidden: true
        },
        events: {
          background: 'var(--blue-700)',
          active: false
        },
        event: {
          background: 'transparent',
          active: false,
          props: data.park,
          hidden: true
        },
        leagues: {
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
    var setHeaderHeight = function () {
      var header = document.querySelector('header');
      var _header$getBoundingCl = header.getBoundingClientRect(),
        height = _header$getBoundingCl.height;
      var root = document.querySelector(':root');
      root.style.setProperty('--header-height', height + 'px');
    };
    useEffect(function () {
      window.setRoute = function (route, props) {
        return setRoute(route, props);
      };
      setHeaderHeight();
      window.addEventListener('resize', function () {
        setHeaderHeight();
      });
    }, []);
    return /*#__PURE__*/React.createElement(Fragment, null, /*#__PURE__*/React.createElement(Navbar, {
      setRoute: setRoute,
      routes: routes
    }), routes.home.active && /*#__PURE__*/React.createElement(Home, {
      setRoute: setRoute
    }), routes.events.active && /*#__PURE__*/React.createElement(Events, {
      setRoute: setRoute
    }), routes.event && routes.event.active && /*#__PURE__*/React.createElement(Event, null), routes.park && routes.park.active && /*#__PURE__*/React.createElement(Park, null), /*#__PURE__*/React.createElement(Footer, null));
  };
  _s(App, "R1XodfBKwf0yUUEdwed6qX1pM/A=");
  _c = App;
  var _c;
  $RefreshReg$(_c, "App");
}.call(this, module);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"client":{"scripts":{"data":{"athletes.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// client/scripts/data/athletes.js                                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!function (module1) {
  ___INIT_METEOR_FAST_REFRESH(module);
  module1.exportDefault(athletes = [{
    birthstart_date: 'Apr 16, 1995',
    end_date: 'Apr 16, 1995',
    gender: 'male',
    run: 1,
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
    run: 1,
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
    run: 1,
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
    run: 1,
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
    run: 1,
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
    run: 1,
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
    run: 1,
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
    run: 1,
    weight: 127,
    stance: 'Goofy',
    height: {
      feet: 5,
      inches: 4
    }
  }]);
}.call(this, module);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"event.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// client/scripts/data/event.js                                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!function (module1) {
  ___INIT_METEOR_FAST_REFRESH(module);
  module1.exportDefault(event = {
    'id': 1,
    'tag': 'Park',
    'title': 'Desert Barrel',
    'subtitle': 'Barreled Best Trick',
    'location': 'Yakima Washington, United States',
    'description': "Barreled Surf's first ever best trick competion, open registration for all ages and skill levels.",
    logo: 'barreled-logo.png',
    'image': 'hic.jpeg',
    'start_date': '07-12-2024',
    'end_date': '07-15-2024',
    'url': '/a',
    'stream': 'event-video.mp4',
    'athletes': [{
      'birthstart_date': 'Apr 16, 1995',
      'end_date': 'Apr 16, 1995',
      'gender': 'male',
      run: 1,
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
      run: 1,
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
      run: 1,
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
      run: 1,
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
      run: 1,
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
      run: 1,
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
      run: 1,
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
      run: 1,
      'weight': 127,
      'stance': 'Goofy',
      'height': {
        'feet': 5,
        'inches': 4
      }
    }],
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
    theme: {
      'primary': 'var(--primary)',
      'secondary': 'var(--secondary)',
      'tertiary': '#f4eede'
    },
    'park': './wavepark-1.png',
    'run': {
      points: [{
        title: 'Wave 1',
        text: 'Tail Slide',
        coords: {
          x: '60%',
          y: '30%'
        }
      }, {
        title: 'Wave 2',
        text: 'Aerial',
        coords: {
          x: '60.2%',
          y: '50.5%'
        }
      }, {
        title: 'Wave 3',
        text: 'Snap',
        coords: {
          x: '50%',
          y: '65.5%'
        }
      }]
    }
  });
}.call(this, module);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"events.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// client/scripts/data/events.js                                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!function (module1) {
  var event;
  module1.link("./event.js", {
    "default": function (v) {
      event = v;
    }
  }, 0);
  ___INIT_METEOR_FAST_REFRESH(module);
  module1.exportDefault(events = [event, {
    'id': 1,
    'tag': 'Park',
    'title': 'The Hawaiian Islands',
    'location': 'Haleiwa,Oahu, United States',
    'description': "The HIC Haleiwa Pro is a premier surfing competition that takes place in the captivating backdrop of the Hawaiian Islands. Known for its thrilling waves and stunning coastal scenery, this event is a highlight on the professional surfing calendar. Surfers from around the world converge on the iconic North Shore of Oahu to showcase their skills and compete for top honors. The competition is a part of the World Surf League's Qualifying Series, attracting elite surfers eager to conquer the challenging waves of Haleiwa. With its rich surfing culture, warm hospitality, and breathtaking ocean views, the HIC Haleiwa Pro not only celebrates the sport but also pays homage to the unique spirit of Hawaii's surf culture. It's an event where passion meets skill, and spectators are treated to an exhilarating display of talent against the backdrop of one of the world's most iconic surfing destinations.",
    logo: 'barreled-logo.png',
    'image': 'hic.jpeg',
    'subtitle': 'HIC Haleiwa Pro',
    'start_date': '07-12-2024',
    'end_date': '07-15-2024',
    'url': '/a',
    'stream': 'event-video.mp4',
    'athletes': [{
      'birthstart_date': 'Apr 16, 1995',
      'end_date': 'Apr 16, 1995',
      'gender': 'male',
      run: 1,
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
      run: 1,
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
      run: 1,
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
      run: 1,
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
      run: 1,
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
      run: 1,
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
      run: 1,
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
      run: 1,
      'weight': 127,
      'stance': 'Goofy',
      'height': {
        'feet': 5,
        'inches': 4
      }
    }],
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
          x: '60%',
          y: '30%'
        }
      }, {
        title: 'Wave 2',
        text: 'Aerial',
        coords: {
          x: '60.2%',
          y: '50.5%'
        }
      }, {
        title: 'Wave 3',
        text: 'Snap',
        coords: {
          x: '50%',
          y: '65.5%'
        }
      }]
    }
  }]);
}.call(this, module);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// client/scripts/data/index.js                                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!function (module1) {
  var athletes;
  module1.link("./athletes.js", {
    "default": function (v) {
      athletes = v;
    }
  }, 0);
  var event;
  module1.link("./event.js", {
    "default": function (v) {
      event = v;
    }
  }, 1);
  var events;
  module1.link("./events.js", {
    events: function (v) {
      events = v;
    }
  }, 2);
  var park;
  module1.link("./park.js", {
    "default": function (v) {
      park = v;
    }
  }, 3);
  var parks;
  module1.link("./parks.js", {
    parks: function (v) {
      parks = v;
    }
  }, 4);
  var run;
  module1.link("./run.js", {
    "default": function (v) {
      run = v;
    }
  }, 5);
  var sponsors;
  module1.link("./sponsors.js", {
    "default": function (v) {
      sponsors = v;
    }
  }, 6);
  ___INIT_METEOR_FAST_REFRESH(module);
  module1.exportDefault({
    athletes: athletes,
    event: event,
    events: events,
    park: park,
    parks: parks,
    run: run,
    sponsors: sponsors
  });
}.call(this, module);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"park.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// client/scripts/data/park.js                                                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!function (module1) {
  ___INIT_METEOR_FAST_REFRESH(module);
  module1.exportDefault(park = {
    id: 1,
    name: 'Surf Barreled',
    url: 'www.surfbarreled.com',
    social: ['https://www.instagram.com/surfbarreled/', 'https://www.facebook.com/surfbarreled/'],
    address: {
      street: 'PO Box 1107',
      state: 'WA',
      city: 'Moxess',
      zipcode: '98936'
    },
    description: 'Barreled Surf Park aims to be a key part of the Yakima community and the broader Pacific Northwest.  Our goal is to introduce the region to surfing, providing an opportunity to access a sport once reserved for postcards and documentaries.  Surfing has a way of broadening one’s horizons and sense of adventure and we hope to be the first stepping stone while, unmistakably, knowing you’re in Yakima.  From architecture to offerings, we will show off this special valley we call home - all while learning a skill that can be used around the globe.',
    youtube: 'https://www.youtube.com/embed/NWPUGf_Po6Q?si=s6DzaeC_t7ZscNYC',
    vimeo: null,
    video: null,
    logo: 'barreled-logo.png',
    image: './barreled-1.jpeg',
    media: ['./barreled.jpeg', './barreled-1.jpeg', './barreled-2.jpeg', './barreled-3.jpeg'],
    membership: [],
    theme: {
      'primary': 'var(--primary)',
      'secondary': 'var(--secondary)',
      'tertiary': '#f4eede'
    },
    amenities: [{
      name: 'Grill',
      description: 'Burgers, Burritos, Kebabs and more',
      image: ''
    }, {
      name: 'Cold Bar',
      description: 'Salads, Sandwiches, and Smoothies',
      image: ''
    }, {
      name: 'Cafe',
      description: 'Baked Goods and Coffee options',
      image: ''
    }, {
      name: 'Ice Cream',
      description: 'Desserts, Shakes, and Cones',
      image: ''
    }, {
      name: 'Bar',
      image: 'Our name, Barreled, is the bridge between surf culture and Yakima.  It’s not only the pinnacle maneuver in surfing, it’s also a tip of the cap to Yakima’s distinguished craft beverage industry, which uses barrels for aging and measuring.'
    }, {
      name: 'Lodging',
      image: '',
      description: 'A variety of lodging options will be offered to capture the different types of travelers that visit the Yakima Valley each year. '
    }],
    food: [],
    events: [{
      title: 'Desert Barrel',
      subtitle: 'Best Trick',
      date: '07-12-2024',
      image: './barreled.jpeg'
    }, {
      title: 'Open Park',
      subtitle: 'Free admission until 5pm',
      date: '08-02-2024',
      image: './barreled-1.jpeg'
    }, {
      title: 'Beginner Surf Lessons',
      subtitle: 'Sign up for reservations',
      date: '09-09-2024',
      image: './barreled-2.jpeg'
    }, {
      title: 'Camp Out',
      subtitle: 'Lodging Party',
      date: '11-31-2024',
      image: './barreled-3.jpeg'
    }]
  });
}.call(this, module);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"parks.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// client/scripts/data/parks.js                                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!function (module1) {
  module1.export({
    parks: function () {
      return parks;
    }
  });
  var park;
  module1.link("./park.js", {
    "default": function (v) {
      park = v;
    }
  }, 0);
  ___INIT_METEOR_FAST_REFRESH(module);
  var parks = [park];
}.call(this, module);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"run.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// client/scripts/data/run.js                                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!function (module1) {
  ___INIT_METEOR_FAST_REFRESH(module);
  module1.exportDefault(run = {
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
  });
}.call(this, module);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"sponsors.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// client/scripts/data/sponsors.js                                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!function (module1) {
  ___INIT_METEOR_FAST_REFRESH(module);
  module1.exportDefault(sponsors = [{
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
  }]);
}.call(this, module);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"helpers.js":function module(require,exports,module){

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
    intersectionObserver: function () {
      return intersectionObserver;
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
  /**
   * Creates aribtrary wait time based on miliseconds
   * @param { int } milliseconds
   * @return { promise } resolves once time has been reached
   * */
  var asyncTimeout = function (ms) {
    return new Promise(function (resolve) {
      return setTimeout(resolve, ms);
    });
  };
  var getCSSVariable = function (variable) {
    if (!window) return;
    return getComputedStyle(document.body).getPropertyValue(variable);
  };
  var intersectionObserver = function (el, callback) {
    var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    if (!window) return;
    if (!el || !callback) return;
    var observer = new IntersectionObserver(callback, options);
    observer.observe(el);
  };
  var handleize = function (str) {
    return str.toLowerCase().replace(/[^\w\u00C0-\u024f]+/g, '-').replace(/^-+|-+$/g, '');
  };
  var randomInt = function (min, max, wholenum) {
    if (wholenum) return Math.floor(Math.random() * (max - min + 1) + min);
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