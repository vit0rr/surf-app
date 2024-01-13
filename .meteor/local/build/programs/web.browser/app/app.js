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
    return /*#__PURE__*/React.createElement(Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "page-event__bg page-event__bg--background",
      style: {
        backgroundImage: "url(./".concat(event.image, ")")
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
  let data;
  module1.link("../../../../client/scripts/data", {
    default(v) {
      data = v;
    }
  }, 1);
  let getCSSVariable, asyncTimeout;
  module1.link("../../../../client/scripts/helpers.js", {
    getCSSVariable(v) {
      getCSSVariable = v;
    },
    asyncTimeout(v) {
      asyncTimeout = v;
    }
  }, 2);
  let Background;
  module1.link("./Background", {
    Background(v) {
      Background = v;
    }
  }, 3);
  let CTARegister;
  module1.link("../../components/CTARegister.jsx", {
    CTARegister(v) {
      CTARegister = v;
    }
  }, 4);
  let Standings;
  module1.link("../../components/Standings.jsx", {
    Standings(v) {
      Standings = v;
    }
  }, 5);
  let ParkMap;
  module1.link("../../components/ParkMap.jsx", {
    ParkMap(v) {
      ParkMap = v;
    }
  }, 6);
  let Stream;
  module1.link("../../components/Stream.jsx", {
    Stream(v) {
      Stream = v;
    }
  }, 7);
  ___INIT_METEOR_FAST_REFRESH(module);
  var _s = $RefreshSig$();
  const Event = function (props) {
    _s();
    const mainRef = useRef(null);
    const [animation, setAnimation] = useState('');
    useEffect(() => {
      const delay = parseInt(getCSSVariable('--animate-delay'));
      setAnimation('');
      setTimeout(() => {
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
      className: "page-event__cta-register uk-card uk-card-default uk-card-small uk-card-body animate__animated animate__delay-1s ".concat(animation)
    }, /*#__PURE__*/React.createElement(CTARegister, null)), /*#__PURE__*/React.createElement("section", {
      className: "page-event__standings uk-card uk-card-default uk-card-small uk-card-body animate__animated animate__delay-1s ".concat(animation)
    }, /*#__PURE__*/React.createElement(Standings, null)), /*#__PURE__*/React.createElement("section", {
      className: "page-event__park-map animate__animated animate__delay-1s ".concat(animation)
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
    About: () => About
  });
  let React, Fragment, useRef, useEffect;
  module1.link("react", {
    default(v) {
      React = v;
    },
    Fragment(v) {
      Fragment = v;
    },
    useRef(v) {
      useRef = v;
    },
    useEffect(v) {
      useEffect = v;
    }
  }, 0);
  let randomInt, intersectionObserver;
  module1.link("../../../../client/scripts/helpers.js", {
    randomInt(v) {
      randomInt = v;
    },
    intersectionObserver(v) {
      intersectionObserver = v;
    }
  }, 1);
  ___INIT_METEOR_FAST_REFRESH(module);
  var _s = $RefreshSig$();
  const About = function (_ref) {
    let {
      park
    } = _ref;
    _s();
    const imageRef = useRef(null);
    const squareRef = useRef(null);
    const contentRef = useRef(null);
    const index = randomInt(0, park.media.length - 1, true);
    const image = park.media[index];
    const gradient = "repeating-linear-gradient(\n\t\t45deg,\n\t\t".concat(park.theme.primary, ",\n\t\t").concat(park.theme.primary, " 5px,\n\t\t").concat(park.theme.secondary, " 5px,\n\t\t").concat(park.theme.secondary, " 10px\n\t)");
    useEffect(() => {
      const image = imageRef.current;
      intersectionObserver(image, event => {
        if (event[0].isIntersecting) image.classList.add('animate__fadeInLeft');
      }, {
        threshold: 0.75
      });
      const square = squareRef.current;
      intersectionObserver(square, event => {
        if (event[0].isIntersecting) square.classList.add('animate__fadeInUp');
      }, {
        threshold: 0.75
      });
      const content = contentRef.current;
      intersectionObserver(content, event => {
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
      },
      style: {
        background: gradient
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
    }, park.social.map((item, index) => {
      let icon = 'link';
      if (item.indexOf('facebook') > -1) icon = 'facebook';
      if (item.indexOf('instagram') > -1) icon = 'instagram';
      if (item.indexOf('twitter') > -1) icon = 'twitter';
      if (item.indexOf('youtube') > -1) icon = 'youtube';
      return /*#__PURE__*/React.createElement("a", {
        key: index,
        href: item,
        target: "_blank"
      }, /*#__PURE__*/React.createElement("span", {
        "uk-icon": "icon: ".concat(icon)
      }));
    }))));
  };
  _s(About, "sVfNSQ0Y2oHlAJpaA+dnQVsuKKA=");
  _c = About;
  var _c;
  $RefreshReg$(_c, "About");
}.call(this, module);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Amenities.jsx":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/routes/Park/Amenities.jsx                                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!function (module1) {
  module1.export({
    Amenities: () => Amenities
  });
  let React, Fragment, useRef, useEffect;
  module1.link("react", {
    default(v) {
      React = v;
    },
    Fragment(v) {
      Fragment = v;
    },
    useRef(v) {
      useRef = v;
    },
    useEffect(v) {
      useEffect = v;
    }
  }, 0);
  let intersectionObserver;
  module1.link("../../../../client/scripts/helpers.js", {
    intersectionObserver(v) {
      intersectionObserver = v;
    }
  }, 1);
  ___INIT_METEOR_FAST_REFRESH(module);
  var _s = $RefreshSig$();
  const Amenities = function (_ref) {
    let {
      park
    } = _ref;
    _s();
    //const imageRef = useRef(null);
    // const formatDescription = (str) {
    // 	let descripition = <span>;

    useEffect(() => {
      // const image = imageRef.current;
      // intersectionObserver(
      // 	image,
      // 	(event) => {
      // 		if (event[0].isIntersecting) image.classList.add('animate__fadeInLeft');
      // 	},
      // 	{ threshold: 0.75 }
      // );
    }, []);
    return /*#__PURE__*/React.createElement("div", {
      className: "page-park__amenities",
      style: {
        backgroundColor: park.theme.secondary
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "page-park__amenities-title"
    }, /*#__PURE__*/React.createElement("h3", {
      className: "uk-h2 uk-text-bolder uk-text-uppercase"
    }, "Amenities")), /*#__PURE__*/React.createElement("div", {
      className: "page-park__amenities-selection"
    }, park.amenities.map((amenity, index) => {
      const name = amenity.name.toLowerCase();
      if (['grill', 'food', 'bbq', 'sandwich'].includes(name)) {
        return /*#__PURE__*/React.createElement("button", {
          "data-amenity": index,
          style: {
            backgroundColor: park.theme.primary
          }
        }, /*#__PURE__*/React.createElement("svg", {
          height: "800px",
          width: "800px",
          id: "Layer_1",
          viewBox: "0 0 232.661 232.661"
        }, /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("path", {
          style: {
            fill: '#FFE49C'
          },
          d: "M116.33,7.501c-49.257,0-89.851,37.094-95.37,84.872c-0.685,5.933,3.97,11.138,9.943,11.138h170.856 c5.973,0,10.628-5.205,9.943-11.138C206.181,44.595,165.588,7.501,116.33,7.501z"
        }), /*#__PURE__*/React.createElement("path", {
          style: {
            fill: '#CBE5C0'
          },
          d: "M194.319,139.664H38.341c-9.953,0-18.021-8.068-18.021-18.021v-0.113 c0-9.952,8.068-18.021,18.021-18.021h155.978c9.952,0,18.021,8.068,18.021,18.021v0.113 C212.34,131.596,204.272,139.664,194.319,139.664z"
        }), /*#__PURE__*/React.createElement("path", {
          style: {
            fill: '#FF7876'
          },
          d: "M194.319,175.818H38.341c-9.953,0-18.021-8.068-18.021-18.02v-0.113 c0-9.952,8.068-18.02,18.021-18.02h155.978c9.952,0,18.021,8.068,18.021,18.02v0.113 C212.34,167.75,204.272,175.818,194.319,175.818z"
        }), /*#__PURE__*/React.createElement("path", {
          style: {
            fill: '#FFE49C'
          },
          d: "M191.34,225.16H41.321c-11.598,0-21-9.402-21-21v-18.342c0-5.523,4.477-10,10-10H202.34 c5.523,0,10,4.477,10,10v18.342C212.34,215.758,202.938,225.16,191.34,225.16z"
        }), /*#__PURE__*/React.createElement("polygon", {
          style: {
            fill: '#F59D00'
          },
          points: "154.101,165.818 124.556,139.664 183.645,139.664 \t"
        }), /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("path", {
          style: {
            fill: '#414042'
          },
          d: "M219.84,121.53c0-5.985-2.076-11.49-5.538-15.847c3.852-3.964,5.427-9.181,4.849-14.172 C213.124,39.342,168.921,0,116.33,0S19.536,39.342,13.509,91.512c-0.576,4.995,1.001,10.212,4.85,14.172 c-3.462,4.357-5.538,9.862-5.538,15.847v0.113c0,7.028,2.856,13.401,7.467,18.02c-4.612,4.62-7.467,10.993-7.467,18.021v0.112 c0,5.834,1.972,11.214,5.28,15.518c-3.252,3.179-5.28,7.606-5.28,12.503v18.343c0,15.715,12.785,28.5,28.5,28.5h150.02 c15.715,0,28.5-12.785,28.5-28.5v-18.343c0-4.896-2.027-9.324-5.279-12.503c3.307-4.303,5.279-9.683,5.279-15.518v-0.112 c0-7.028-2.856-13.401-7.467-18.021c4.612-4.62,7.467-10.993,7.467-18.02v-0.114H219.84z M204.84,121.644 c0,5.801-4.72,10.52-10.521,10.52c-10.292,0-59.259,0-69.763,0H38.341c-5.801,0-10.521-4.72-10.521-10.52v-0.113 c0-5.801,4.72-10.52,10.521-10.52h155.978c5.801,0,10.521,4.72,10.521,10.52V121.644z M204.84,157.685v0.112 c0,5.801-4.72,10.52-10.521,10.52h-31.727l23.896-21.153h7.831C200.12,147.164,204.84,151.884,204.84,157.685z M27.82,157.797 v-0.112c0-5.801,4.72-10.521,10.521-10.521h83.372l23.896,21.153H38.341C32.54,168.317,27.82,163.598,27.82,157.797z M144.344,147.164h19.514l-9.757,8.637L144.344,147.164z M116.33,15c44.97,0,82.768,33.633,87.92,78.232 c0.17,1.474-0.996,2.777-2.493,2.777c-6.111,0-164.873,0-170.855,0c-1.487,0-2.663-1.294-2.493-2.777 C33.563,48.633,71.36,15,116.33,15z M204.84,204.16c0,7.444-6.056,13.5-13.5,13.5H41.32c-7.444,0-13.5-6.056-13.5-13.5v-18.343 c0-1.379,1.122-2.5,2.5-2.5c11.006,0,166.415,0,172.02,0c1.378,0,2.5,1.121,2.5,2.5V204.16z"
        }), /*#__PURE__*/React.createElement("circle", {
          style: {
            fill: '#414042'
          },
          cx: "103.974",
          cy: "41.215",
          r: "5"
        }), /*#__PURE__*/React.createElement("circle", {
          style: {
            fill: '#414042'
          },
          cx: "81.02",
          cy: "55.28",
          r: "5"
        }), /*#__PURE__*/React.createElement("circle", {
          style: {
            fill: '#414042'
          },
          cx: "128.687",
          cy: "41.215",
          r: "5"
        }), /*#__PURE__*/React.createElement("circle", {
          style: {
            fill: '#414042'
          },
          cx: "151.64",
          cy: "55.28",
          r: "5"
        })))));
      }
      if (['cold bar', 'salad', 'salad bar'].includes(name)) {
        return /*#__PURE__*/React.createElement("button", {
          "data-amenity": index,
          style: {
            backgroundColor: park.theme.primary
          }
        }, /*#__PURE__*/React.createElement("svg", {
          height: "800px",
          width: "800px",
          id: "Layer_1",
          viewBox: "0 0 511.988 511.988"
        }, /*#__PURE__*/React.createElement("path", {
          style: {
            fill: '#8CC153'
          },
          d: "M317.101,36.099c-14.53-17.812-37.342,28.453-69.67,24.297 c-32.327-4.172-25.187-52.843-101.779-2.266c-57.779,38.171-2.734,66.732-15.187,71.076c-12.438,4.328-72.186,0.578-73.779,45.749 c-1.609,45.171,117.638,123.692,117.638,123.692l112.45-45.553C286.774,253.094,331.633,53.896,317.101,36.099z"
        }), /*#__PURE__*/React.createElement("path", {
          style: {
            fill: '#A0D468'
          },
          d: "M511.488,136.175c-8.891-39.999-71.107-17.953-84.889-17.953c-13.766,0,39.561-42.827-27.297-58.967 c-88.607-21.422-73.326,19.999-106.668,33.843c-33.327,13.843-64.687-20.515-77.139,0c-12.438,20.515,66.483,185.127,66.483,185.127 l125.512,5.672C407.49,283.897,520.379,176.19,511.488,136.175z"
        }), /*#__PURE__*/React.createElement("path", {
          style: {
            fill: '#FFCE54'
          },
          d: "M191.995,223.986c0-35.343,28.656-63.999,63.999-63.999s63.998,28.656,63.998,63.999 c0,35.358-28.655,64.005-63.998,64.005S191.995,259.344,191.995,223.986z"
        }), /*#__PURE__*/React.createElement("path", {
          style: {
            fill: '#434A54'
          },
          d: "M410.459,152.268c-3.094,5.015-9.672,6.562-14.688,3.453c-5-3.093-6.547-9.671-3.453-14.687 c3.109-5,9.672-6.547,14.688-3.453C412.006,140.691,413.568,147.253,410.459,152.268z"
        }), /*#__PURE__*/React.createElement("path", {
          style: {
            fill: '#FC6E51'
          },
          d: "M418.678,220.064c-15.5,25.046-48.358,32.796-73.42,17.296 c-25.047-15.499-32.781-48.374-17.281-73.42s48.374-32.78,73.42-17.281C426.443,162.159,434.178,195.017,418.678,220.064z"
        }), /*#__PURE__*/React.createElement("path", {
          style: {
            fill: '#ED5564'
          },
          d: "M74.81,241.641c51.046,29.389,116.263,11.828,145.653-39.233L35.577,95.989 C6.187,147.05,23.749,212.267,74.81,241.641z"
        }), /*#__PURE__*/React.createElement("path", {
          style: {
            fill: '#DA4453'
          },
          d: "M101.419,195.424c25.516,14.703,58.124,5.906,72.827-19.609l-92.451-53.218 C67.107,148.128,75.889,180.737,101.419,195.424z"
        }), /*#__PURE__*/React.createElement("path", {
          style: {
            fill: '#AC92EB'
          },
          d: "M0,202.658v42.671c0,94.849,51.577,177.627,128.216,221.862c-0.141,0.688-0.219,1.406-0.219,2.141 c0,5.891,4.781,10.656,10.672,10.656h14.858h204.949h14.858c5.891,0,10.655-4.766,10.655-10.656c0-0.734-0.078-1.453-0.203-2.141 c76.624-44.234,128.201-127.013,128.201-221.862v-42.671L0,202.658L0,202.658z"
        }), /*#__PURE__*/React.createElement("path", {
          style: {
            fill: '#967ADC'
          },
          d: "M0,223.986v21.343h31.999c0,5.891,4.781,10.656,10.672,10.656s10.672-4.766,10.672-10.656H74.67 c0,5.891,4.781,10.656,10.672,10.656s10.656-4.766,10.656-10.656h21.343c0,5.891,4.766,10.656,10.656,10.656 c5.89,0,10.672-4.766,10.672-10.656h21.327c0,5.891,4.781,10.656,10.672,10.656s10.672-4.766,10.672-10.656h21.327 c0,5.891,4.781,10.656,10.672,10.656s10.655-4.766,10.655-10.657h21.344c0,5.891,4.766,10.656,10.656,10.656 s10.672-4.766,10.672-10.656h21.327c0,5.891,4.781,10.656,10.672,10.656c5.89,0,10.671-4.766,10.671-10.656h21.328 c0,5.891,4.781,10.656,10.672,10.656s10.656-4.766,10.656-10.656h21.343c0,5.891,4.766,10.656,10.655,10.656 c5.891,0,10.672-4.766,10.672-10.656h21.328c0,5.891,4.781,10.656,10.672,10.656s10.672-4.766,10.672-10.656h21.327 c0,5.891,4.781,10.656,10.671,10.656c5.891,0,10.656-4.766,10.656-10.656h32v-21.343H0V223.986z"
        })));
      }
      if (['cafe', 'coffee'].includes(name)) {
        return /*#__PURE__*/React.createElement("button", {
          "data-amenity": index,
          style: {
            backgroundColor: park.theme.primary
          }
        }, /*#__PURE__*/React.createElement("svg", {
          width: "800px",
          height: "800px",
          viewBox: "0 0 1024 1024",
          class: "icon"
        }, /*#__PURE__*/React.createElement("path", {
          d: "M294.613731 1002.666458a21.333329 21.333329 0 0 1-21.333329-19.839996L215.040414 224.853286h593.919877L750.720303 982.826462a21.333329 21.333329 0 0 1-21.333329 19.839996z",
          fill: "#F05071"
        }), /*#__PURE__*/React.createElement("path", {
          d: "M785.920295 246.186615L729.386974 981.333129H294.613731L238.080409 246.186615h547.839886m46.079991-42.666657h-639.999867l60.159988 781.01317a42.666658 42.666658 0 0 0 42.666657 39.466659H729.386974a42.666658 42.666658 0 0 0 42.666658-39.466659l59.946654-781.01317z",
          fill: "#5C2D51"
        }), /*#__PURE__*/React.createElement("path", {
          d: "M215.680414 182.186629l14.719997-144.63997A18.13333 18.13333 0 0 1 248.533741 21.333329h526.933223a18.13333 18.13333 0 0 1 18.13333 16.21333l14.719997 144.63997z",
          fill: "#F05071"
        }), /*#__PURE__*/React.createElement("path", {
          d: "M772.693631 42.666658l12.159998 118.186642H239.360409L251.307073 42.666658h521.386558m2.773333-42.666658H248.533741a39.466658 39.466658 0 0 0-39.253326 35.413326l-17.279996 168.106632h639.999867l-17.279997-168.106632A39.466658 39.466658 0 0 0 775.466964 0z",
          fill: "#5C2D51"
        }), /*#__PURE__*/React.createElement("path", {
          d: "M176.853756 129.70664l670.293193 0 0 119.039975-670.293193 0 0-119.039975Z",
          fill: "#FDCA89"
        }), /*#__PURE__*/React.createElement("path", {
          d: "M825.81362 151.039969v76.373317H198.187084V151.039969h627.626536m13.866664-42.666658H184.320421A28.799994 28.799994 0 0 0 155.520427 137.386638v104.106645a28.799994 28.799994 0 0 0 28.799994 28.799994h655.359863a28.799994 28.799994 0 0 0 28.799994-28.799994V137.386638a28.799994 28.799994 0 0 0-28.799994-28.799994z",
          fill: "#5C2D51"
        }), /*#__PURE__*/React.createElement("path", {
          d: "M264.533737 868.053152L226.347079 370.773256h571.519881l-38.399992 497.279896H264.533737z",
          fill: "#FDCA89"
        }), /*#__PURE__*/React.createElement("path", {
          d: "M774.186964 392.106585l-34.346659 454.613239H283.5204L249.387074 392.106585H774.186964m46.079991-42.666658H203.307083l41.386658 539.946554h534.613222l41.599992-539.946554z",
          fill: "#5C2D51"
        })));
      }
      if (['desert', 'beer', 'ice cream'].includes(name)) {}
      if (['bar', 'beer', 'wine', 'whiskey', 'liquor'].includes(name)) {
        return /*#__PURE__*/React.createElement("button", {
          "data-amenity": index,
          style: {
            backgroundColor: park.theme.primary
          }
        }, /*#__PURE__*/React.createElement("svg", {
          width: "800px",
          height: "800px",
          viewBox: "0 0 1024 1024",
          class: "icon"
        }, /*#__PURE__*/React.createElement("path", {
          d: "M239.616 247.808s28.672-73.728 75.776-75.776c47.104 0 73.728-86.016 108.544-90.112s94.208-8.192 94.208-8.192 59.392-63.488 112.64-43.008S737.28 83.968 737.28 106.496s40.96 2.048 40.96 2.048 75.776 34.816 77.824 86.016 0 92.16 0 92.16v284.672h-614.4l-2.048-323.584z",
          fill: "#FFFFFF"
        }), /*#__PURE__*/React.createElement("path", {
          d: "M260.096 909.312h589.824v83.968H260.096z",
          fill: "#4961A4"
        }), /*#__PURE__*/React.createElement("path", {
          d: "M839.68 921.6H253.952V262.144h116.736V491.52l67.584 8.192 14.336-163.84 61.44-22.528 10.24-51.2H839.68z",
          fill: "#F5BF1F"
        }), /*#__PURE__*/React.createElement("path", {
          d: "M585.728 428.032m-34.816 0a34.816 34.816 0 1 0 69.632 0 34.816 34.816 0 1 0-69.632 0Z",
          fill: "#FFFFFF"
        }), /*#__PURE__*/React.createElement("path", {
          d: "M743.424 83.968C716.8 34.816 667.648 4.096 614.4 4.096c-45.056 0-88.064 22.528-116.736 59.392-12.288-4.096-26.624-6.144-40.96-6.144-55.296 0-104.448 32.768-126.976 86.016H327.68c-57.344 0-102.4 47.104-102.4 106.496v163.84H182.272c-45.056 0-81.92 36.864-81.92 81.92v204.8c0 45.056 36.864 81.92 81.92 81.92H225.28v153.6c0 47.104 38.912 86.016 86.016 86.016h481.28c47.104 0 86.016-38.912 86.016-86.016V221.184C880.64 143.36 819.2 79.872 743.424 83.968zM223.232 741.376h-40.96c-22.528 0-40.96-18.432-40.96-40.96v-204.8c0-22.528 18.432-40.96 40.96-40.96h40.96v286.72zM327.68 184.32c4.096 0 8.192 0 10.24 2.048l18.432 4.096 6.144-18.432c14.336-43.008 51.2-71.68 94.208-71.68 14.336 0 26.624 2.048 40.96 8.192h2.048c16.384 8.192 32.768 22.528 40.96 38.912 4.096 8.192 14.336 12.288 24.576 10.24 12.288-4.096 18.432-18.432 12.288-28.672-10.24-18.432-24.576-32.768-40.96-43.008 20.48-24.576 49.152-38.912 79.872-38.912 43.008 0 81.92 26.624 98.304 69.632l6.144 16.384 16.384-4.096c6.144 0 10.24-2.048 14.336-2.048 49.152 0 88.064 43.008 88.064 96.256v8.192H530.432c-12.288 0-20.48 8.192-20.48 20.48v40.96c0 8.192-6.144 14.336-14.336 14.336-30.72 0-55.296 24.576-55.296 55.296v114.688c0 8.192-6.144 14.336-14.336 14.336h-4.096c-8.192 0-14.336-6.144-14.336-14.336v-225.28c0-12.288-8.192-20.48-20.48-20.48h-118.784C278.528 202.752 301.056 184.32 327.68 184.32z m466.944 796.672H313.344c-24.576 0-45.056-20.48-45.056-45.056V921.6h573.44v14.336c-2.048 24.576-22.528 45.056-47.104 45.056zM839.68 880.64H266.24V270.336h100.352v204.8c0 30.72 24.576 55.296 55.296 55.296h4.096c30.72 0 55.296-24.576 55.296-55.296v-114.688c0-8.192 6.144-14.336 14.336-14.336 30.72 0 55.296-24.576 55.296-55.296v-20.48H839.68V880.64z",
          fill: "#3F4651"
        }), /*#__PURE__*/React.createElement("path", {
          d: "M524.288 430.08c0 34.816 26.624 61.44 61.44 61.44s61.44-26.624 61.44-61.44-26.624-61.44-61.44-61.44-61.44 26.624-61.44 61.44z m61.44-20.48c12.288 0 20.48 8.192 20.48 20.48s-8.192 20.48-20.48 20.48-20.48-8.192-20.48-20.48 8.192-20.48 20.48-20.48z",
          fill: "#3F4651"
        })));
      }
      if (['hotel', 'motel', 'lodging'].includes(name)) {
        return /*#__PURE__*/React.createElement("button", {
          "data-amenity": index,
          style: {
            backgroundColor: park.theme.primary
          }
        }, /*#__PURE__*/React.createElement("svg", {
          id: "Capa_1",
          viewBox: "0 0 298 298"
        }, /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("path", {
          style: {
            fill: '#B4EBDD'
          },
          d: "M16,247.957h266v-48.598c-1,0.112-0.504,0.226-0.772,0.347c-3.445,1.561-7.735,3.502-15.317,3.502 c-7.785,0-12.162-2.242-15.358-3.88c-2.581-1.322-4.138-2.12-8.064-2.12c-3.925,0-5.648,0.798-8.227,2.12 c-0.644,0.33-1.262,0.684-2.262,1.039v25.59c0,4.418-3.249,8-7.667,8h-32c-4.418,0-8.333-3.582-8.333-8v-25.069 c-2,1.137-6,2.163-11,2.301v22.769c0,4.418-3.249,8-7.667,8h-32c-4.418,0-8.333-3.582-8.333-8v-22.75c-5-0.01-9-1.097-12-2.308 v25.058c0,4.418-3.249,8-7.667,8h-32c-4.418,0-8.333-3.582-8.333-8v-25.581c0-0.359-1.299-0.717-1.948-1.049 c-2.579-1.321-4.052-2.119-7.975-2.119c-3.922,0-5.437,0.798-8.015,2.119c-3.195,1.638-7.55,3.881-15.335,3.881 c-7.687,0-12.078-1.968-15.348-3.549c-0.019-0.01-0.38-0.018-0.38-0.028V247.957z"
        }), /*#__PURE__*/React.createElement("path", {
          d: "M296.605,185.195c-1.434-2.149-3.88-3.567-6.658-3.567c-7.582,0-11.87,1.941-15.317,3.502 c-2.764,1.251-4.591,2.078-8.719,2.078c-3.926,0-5.482-0.798-8.063-2.12c-3.195-1.638-7.74-3.88-15.526-3.88 c-4.302,0-7.322,0.686-10.322,1.575v-4.826V99.699l8.217-0.012c3.312-0.004,6.363-2.117,7.546-5.211 c0.296-0.774,0.506-1.573,0.555-2.372c0.146-2.395-0.77-4.779-2.619-6.44L154.335,3.583c-0.023-0.02-0.044-0.035-0.066-0.055 l-0.473-0.428c-3.062-2.751-7.711-2.72-10.748,0.06L52.681,85.952c-2.435,2.229-3.249,5.761-2.051,8.837 c1.197,3.074,4.158,5.168,7.455,5.168c0.003,0,0.006,0,0.009,0L65,99.946v78.011v4.832c-2-0.892-5.695-1.581-10.006-1.581 c-7.784,0-12.077,2.243-15.272,3.881c-2.578,1.321-4.093,2.119-8.015,2.119c-4.021,0-5.519-0.735-8.036-1.952 c-3.269-1.582-7.66-3.55-15.347-3.55c-4.418,0-8.323,3.582-8.323,8v66.251v16v17c0,4.418,4.248,8,8.666,8H290c4.418,0,8-3.582,8-8 v-17v-16v-66.251C298,188.032,297.484,186.48,296.605,185.195z M157,27.475l62.523,56.165L157,83.708V27.475z M141,83.726 l-62.313,0.068L141,26.719V83.726z M216,99.723v82.234H81V99.923L216,99.723z M216,217.957h-16v-20h16V217.957z M141,197.957h16v20 h-16V197.957z M81,197.957h16v20H81V197.957z M31.748,203.208c7.784,0,12.16-2.243,15.355-3.881 c2.578-1.321,4.135-2.119,8.057-2.119c3.923,0,5.313,0.798,7.892,2.119c0.648,0.332,1.948,0.689,1.948,1.049v25.581 c0,4.418,3.915,8,8.333,8h32c4.418,0,7.667-3.582,7.667-8v-25.058c3,1.211,7,2.298,12,2.308v22.75c0,4.418,3.915,8,8.333,8h32 c4.418,0,7.667-3.582,7.667-8v-22.769c5-0.138,9-1.164,11-2.301v25.069c0,4.418,3.915,8,8.333,8h32c4.418,0,7.667-3.582,7.667-8 v-25.59c1-0.355,1.618-0.709,2.261-1.039c2.579-1.322,4.22-2.12,8.145-2.12c3.926,0,5.524,0.798,8.105,2.12 c3.195,1.638,7.594,3.88,15.379,3.88c7.582,0,11.882-1.941,15.327-3.502c0.268-0.121-0.218-0.234,0.782-0.347v48.598H16v-48.326 c0,0.01,0.371,0.019,0.39,0.028C19.66,201.24,24.061,203.208,31.748,203.208z M16,280.957v-17h266v17H16z"
        }), /*#__PURE__*/React.createElement("rect", {
          x: "81",
          y: "197.957",
          style: {
            fill: '#FF8500'
          },
          width: "16",
          height: "20"
        }), /*#__PURE__*/React.createElement("rect", {
          x: "141",
          y: "197.957",
          style: {
            fill: '#FF8500'
          },
          width: "16",
          height: "20"
        }), /*#__PURE__*/React.createElement("rect", {
          x: "200",
          y: "197.957",
          style: {
            fill: '#FF8500'
          },
          width: "16",
          height: "20"
        }), /*#__PURE__*/React.createElement("rect", {
          x: "16",
          y: "263.957",
          style: {
            fill: '#FFB929'
          },
          width: "266",
          height: "17"
        }), /*#__PURE__*/React.createElement("path", {
          style: {
            fill: '#FFD5B0'
          },
          d: "M81,181.957h135V99.723l-135,0.2V181.957z M172,155.957c0,4.418-3.582,8-8,8h-32 c-4.418,0-8-3.582-8-8v-32c0-4.418,3.582-8,8-8h32c4.418,0,8,3.582,8,8V155.957z"
        }), /*#__PURE__*/React.createElement("polygon", {
          style: {
            fill: '#FF8500'
          },
          points: "78.687,83.794 141,83.726 141,26.719 \t"
        }), /*#__PURE__*/React.createElement("polygon", {
          style: {
            fill: '#FFB929'
          },
          points: "157,27.475 157,83.708 219.523,83.64 \t"
        }), /*#__PURE__*/React.createElement("rect", {
          x: "140",
          y: "131.957",
          style: {
            fill: '#FFFFFF'
          },
          width: "16",
          height: "16"
        }), /*#__PURE__*/React.createElement("path", {
          d: "M172,123.957c0-4.418-3.582-8-8-8h-32c-4.418,0-8,3.582-8,8v32c0,4.418,3.582,8,8,8h32c4.418,0,8-3.582,8-8V123.957z M140,131.957h16v16h-16V131.957z"
        }), /*#__PURE__*/React.createElement("path", {
          style: {
            fill: '#FFB929'
          },
          d: "M24.666,33.043c4.411,0,8-3.589,8-8c0-4.411-3.589-8-8-8c-4.411,0-8,3.589-8,8 C16.666,29.454,20.255,33.043,24.666,33.043z"
        }), /*#__PURE__*/React.createElement("path", {
          d: "M24.666,49.043c13.233,0,24-10.767,24-24s-10.767-24-24-24c-13.233,0-24,10.767-24,24S11.433,49.043,24.666,49.043z M24.666,17.043c4.411,0,8,3.589,8,8c0,4.411-3.589,8-8,8c-4.411,0-8-3.589-8-8C16.666,20.632,20.255,17.043,24.666,17.043z"
        }))));
      }
    })));
  };
  _s(Amenities, "OD7bBpZva5O2jO+Puf00hKivP7c=");
  _c = Amenities;
  var _c;
  $RefreshReg$(_c, "Amenities");
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
    return /*#__PURE__*/React.createElement(Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "page-event__bg page-event__bg--background",
      style: {
        backgroundImage: "url(./".concat(event.image, ")")
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
    Banner: () => Banner
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
  const Banner = function (_ref) {
    let {
      park
    } = _ref;
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
    }, park.social.map((item, index) => {
      let icon = 'link';
      if (item.indexOf('facebook') > -1) icon = 'facebook';
      if (item.indexOf('instagram') > -1) icon = 'instagram';
      if (item.indexOf('twitter') > -1) icon = 'twitter';
      if (item.indexOf('youtube') > -1) icon = 'youtube';
      return /*#__PURE__*/React.createElement("a", {
        key: index,
        href: item,
        target: "_blank"
      }, /*#__PURE__*/React.createElement("span", {
        "uk-icon": "icon: ".concat(icon)
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
  module1.export({
    Events: () => Events
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
  const Events = function (_ref) {
    let {
      park
    } = _ref;
    return /*#__PURE__*/React.createElement("div", {
      className: "page-park__event",
      "uk-slider": "center: true"
    }, /*#__PURE__*/React.createElement("ul", {
      className: "uk-slider-items"
    }, [...park.events, ...park.events].map((event, index) => {
      const month = dayjs(event.date).format('MM');
      const day = dayjs(event.date).format('DD');
      return /*#__PURE__*/React.createElement("li", {
        key: index
      }, /*#__PURE__*/React.createElement("a", null, /*#__PURE__*/React.createElement("div", {
        className: "page-park__event-overlay",
        style: {
          background: "linear-gradient(0.25turn, ".concat(park.theme.secondary, ", transparent)")
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
    HappeningNow: () => HappeningNow
  });
  let React, Fragment, useRef, useEffect;
  module1.link("react", {
    default(v) {
      React = v;
    },
    Fragment(v) {
      Fragment = v;
    },
    useRef(v) {
      useRef = v;
    },
    useEffect(v) {
      useEffect = v;
    }
  }, 0);
  let intersectionObserver;
  module1.link("../../../../client/scripts/helpers.js", {
    intersectionObserver(v) {
      intersectionObserver = v;
    }
  }, 1);
  ___INIT_METEOR_FAST_REFRESH(module);
  var _s = $RefreshSig$();
  const HappeningNow = function (_ref) {
    let {
      park,
      event,
      full
    } = _ref;
    _s();
    //const imageRef = useRef(null);
    // const formatDescription = (str) {
    // 	let descripition = <span>;

    useEffect(() => {
      // const image = imageRef.current;
      // intersectionObserver(
      // 	image,
      // 	(event) => {
      // 		if (event[0].isIntersecting) image.classList.add('animate__fadeInLeft');
      // 	},
      // 	{ threshold: 0.75 }
      // );
    }, []);
    return /*#__PURE__*/React.createElement("div", {
      className: "page-park__happening-now".concat(full ? ' page-park__happening-now--full' : '')
    }, /*#__PURE__*/React.createElement("img", {
      className: "page-park__happening-now-cover animate__animated animate__delay-1s animate__fadeIn",
      src: "./".concat(event.image)
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
  module1.export({
    Park: () => Park
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
  let data;
  module1.link("../../../../client/scripts/data", {
    default(v) {
      data = v;
    }
  }, 1);
  let getCSSVariable, asyncTimeout;
  module1.link("../../../../client/scripts/helpers.js", {
    getCSSVariable(v) {
      getCSSVariable = v;
    },
    asyncTimeout(v) {
      asyncTimeout = v;
    }
  }, 2);
  let Background;
  module1.link("./Background", {
    Background(v) {
      Background = v;
    }
  }, 3);
  let Banner;
  module1.link("./Banner", {
    Banner(v) {
      Banner = v;
    }
  }, 4);
  let HappeningNow;
  module1.link("./HappeningNow", {
    HappeningNow(v) {
      HappeningNow = v;
    }
  }, 5);
  let Events;
  module1.link("./Events", {
    Events(v) {
      Events = v;
    }
  }, 6);
  let About;
  module1.link("./About", {
    About(v) {
      About = v;
    }
  }, 7);
  let Amenities;
  module1.link("./Amenities", {
    Amenities(v) {
      Amenities = v;
    }
  }, 8);
  let CTARegister;
  module1.link("../../components/CTARegister.jsx", {
    CTARegister(v) {
      CTARegister = v;
    }
  }, 9);
  ___INIT_METEOR_FAST_REFRESH(module);
  var _s = $RefreshSig$();
  const Park = function (props) {
    _s();
    const mainRef = useRef(null);
    const [animation, setAnimation] = useState('');
    useEffect(() => {
      const delay = parseInt(getCSSVariable('--animate-delay'));
      setAnimation('');
      setTimeout(() => {
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
      className: "page-park__banner animate__animated animate__delay-1s ".concat(animation)
    }, /*#__PURE__*/React.createElement(Banner, {
      park: data.park
    })), /*#__PURE__*/React.createElement("section", {
      className: "page-park__happening animate__animated animate__delay-1s ".concat(animation)
    }, /*#__PURE__*/React.createElement(HappeningNow, {
      park: data.park,
      event: data.event
    }))), /*#__PURE__*/React.createElement("div", {
      className: "container"
    }, /*#__PURE__*/React.createElement("section", {
      className: "page-park__events animate__animated animate__delay-1s ".concat(animation)
    }, /*#__PURE__*/React.createElement(Events, {
      park: data.park
    }))), /*#__PURE__*/React.createElement("div", {
      className: "container"
    }, /*#__PURE__*/React.createElement("section", {
      className: "page-park__about animate__animated animate__delay-1s ".concat(animation)
    }, /*#__PURE__*/React.createElement(About, {
      park: data.park
    })), /*#__PURE__*/React.createElement("section", {
      className: "page-park__happening page-park__happening--full animate__animated animate__delay-1s ".concat(animation)
    }, /*#__PURE__*/React.createElement(HappeningNow, {
      park: data.park,
      event: data.event,
      full: true
    })), /*#__PURE__*/React.createElement("section", {
      className: "page-park__park-amenities animate__animated animate__delay-1s ".concat(animation)
    }, /*#__PURE__*/React.createElement(Amenities, {
      park: park
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
  module1.link("../../../client/scripts/data", {
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
  module1.link("../../../client/scripts/data", {
    default(v) {
      data = v;
    }
  }, 3);
  ___INIT_METEOR_FAST_REFRESH(module);
  const Home = function (props) {
    const items = [{
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

},"CTARegister.jsx":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/components/CTARegister.jsx                                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!function (module1) {
  module1.export({
    CTARegister: () => CTARegister
  });
  let React;
  module1.link("react", {
    default(v) {
      React = v;
    }
  }, 0);
  let data;
  module1.link("../../../client/scripts/data", {
    default(v) {
      data = v;
    }
  }, 1);
  ___INIT_METEOR_FAST_REFRESH(module);
  const CTARegister = function () {
    return /*#__PURE__*/React.createElement("div", {
      className: "cta-register"
    }, /*#__PURE__*/React.createElement("img", {
      className: "cta-register__cover animate__animated animate__delay-1s animate__fadeIn",
      src: "./".concat(data.event.image)
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
  module1.export({
    Expand: () => Expand
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
  let asyncTimeout, getCSSVariable;
  module1.link("../../../client/scripts/helpers.js", {
    asyncTimeout(v) {
      asyncTimeout = v;
    },
    getCSSVariable(v) {
      getCSSVariable = v;
    }
  }, 1);
  ___INIT_METEOR_FAST_REFRESH(module);
  var _s = $RefreshSig$();
  const Expand = function (props) {
    _s();
    useEffect(() => {
      const container = document.querySelector("[data-expand=\"".concat(props.id, "\"]"));
      if (!container) return;
      container.classList.add('animate__animated');
    });
    const expand = async function () {
      const container = document.querySelector("[data-expand=\"".concat(props.id, "\"]"));
      const delay = parseInt(getCSSVariable('--animate-delay'));
      if (!container) return;
      if (container.className.indexOf('expand') > -1) {
        container.classList.add(props.animationOut);
        await asyncTimeout(delay);
        container.classList.remove(props.animationOut, props.animationIn, 'expand');
        return;
      }
      container.classList.add('expand');
      container.classList.add(props.animationIn);
    };
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
      title = ''
    } = _ref;
    return /*#__PURE__*/React.createElement("section", {
      className: "image-grid"
    }, items && items.length && /*#__PURE__*/React.createElement("div", {
      className: "uk-container uk-padding"
    }, title && /*#__PURE__*/React.createElement("h3", {
      className: "uk-h4 image-grid__title uk-text-bolder uk-text-uppercase"
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

},"ParkMap.jsx":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/components/ParkMap.jsx                                                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!function (module1) {
  module1.export({
    ParkMap: () => ParkMap
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
  let data;
  module1.link("../../../client/scripts/data", {
    default(v) {
      data = v;
    }
  }, 1);
  let getCSSVariable;
  module1.link("../../../client/scripts/helpers.js", {
    getCSSVariable(v) {
      getCSSVariable = v;
    }
  }, 2);
  let Expand;
  module1.link("./Expand.jsx", {
    Expand(v) {
      Expand = v;
    }
  }, 3);
  ___INIT_METEOR_FAST_REFRESH(module);
  var _s = $RefreshSig$();
  const ParkMap = function () {
    _s();
    const mapRef = useRef(null);
    const athlete = data.athletes[0];
    const [animation, setAnimation] = useState('');
    const setPointData = function () {
      const map = document.querySelector('[data-map]');
      data.event.run.points.forEach((point, index) => {
        const anchor = document.querySelectorAll('[data-anchor]')[index];
        const line = document.createElement('div');
        line.classList.add('line');
        line.setAttribute('data-line', index);
        line.style.borderColro = data.event.theme.primary;
        line.style.left = "calc(".concat(anchor.style.left, " + 20px)");
        const markup = "\n\t\t\t\t<h6 class=\"uk-text-uppercase uk-text-bolder\" style=\"color: ".concat(data.event.theme.primary, ";\">").concat(point.title, "</h6>\n\t\t\t\t<p class=\"uk-text-uppercase uk-text-light\">").concat(point.text, "</p>\n\t\t\t");
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
    useEffect(() => {
      const delay = parseInt(getCSSVariable('--animate-delay'));
      setAnimation('');
      setTimeout(() => {
        setAnimation('animate__fadeInUp');
      }, delay);
      setTimeout(() => {
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
      className: "park-map__athlete-run animate__animated animate__delay-1s ".concat(animation),
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
    }, data.event.run.points.map((point, index) => {
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
  module1.export({
    Standings: () => Standings
  });
  let React, Fragment, useEffect, useState;
  module1.link("react", {
    default(v) {
      React = v;
    },
    Fragment(v) {
      Fragment = v;
    },
    useEffect(v) {
      useEffect = v;
    },
    useState(v) {
      useState = v;
    }
  }, 0);
  let data;
  module1.link("../../../client/scripts/data", {
    default(v) {
      data = v;
    }
  }, 1);
  let getCSSVariable, randomInt, sortBy;
  module1.link("../../../client/scripts/helpers.js", {
    getCSSVariable(v) {
      getCSSVariable = v;
    },
    randomInt(v) {
      randomInt = v;
    },
    sortBy(v) {
      sortBy = v;
    }
  }, 2);
  let Expand;
  module1.link("./Expand.jsx", {
    Expand(v) {
      Expand = v;
    }
  }, 3);
  ___INIT_METEOR_FAST_REFRESH(module);
  var _s = $RefreshSig$();
  const Standings = function () {
    _s();
    const keys = ['place', 'image', 'name', 'gender', 'run', 'points'];
    let athletes = [...data.event.athletes].map((athlete, index) => {
      const multiplier = (randomInt(4, 9) / 100).toFixed(2);
      const decimal = 0.13 * index;
      athlete.points = (multiplier * 100 + decimal).toFixed(2);
      athlete.run = 1;
      if (index < 4) athlete.run = 2;
      const obj = {};
      keys.forEach(key => obj[key] = athlete[key]);
      return obj;
    });
    athletes = sortBy(athletes, 'points', true);
    const [animation, setAnimation] = useState('');
    const [tabs, setTabs] = useState([{
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
    const tab = tabs.find(tab => tab.active);
    const index = tabs.findIndex(t => t.slug == tab.slug);
    useEffect(() => {
      const delay = parseInt(getCSSVariable('--animate-delay'));
      setAnimation('');
      setTimeout(() => {
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
    }))), /*#__PURE__*/React.createElement("div", {
      className: "standings__table-body animate__animated ".concat(animation)
    }, Object.keys(athletes[0]).map(key => {
      if (!['gender', 'place', 'image'].includes(key)) {
        return /*#__PURE__*/React.createElement("div", {
          key: key,
          className: "standings__table-cell-head standings__table-cell-head--".concat(key, " athlete--heading athlete--heading-").concat(key, " uk-text-uppercase uk-text-bold"),
          style: {
            backgroundColor: "".concat(key == 'name' && data.event.theme.primary)
          },
          "data-name": key == 'name' ? 'athlete' : key
        }, /*#__PURE__*/React.createElement("span", null, key == 'name' ? 'athlete' : key));
      }
    }), athletes.filter(a => a.gender == tab.slug).map((athlete, index) => {
      let place = index + 1;
      let pointsWidth = athlete.points / 10 * 100;
      const delay = index + 1;
      const transitionDelay = '1.' + delay + 's';
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
  module1.export({
    Stream: () => Stream
  });
  let React, useState, useEffect, useRef;
  module1.link("react", {
    default(v) {
      React = v;
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
  let data;
  module1.link("../../../client/scripts/data", {
    default(v) {
      data = v;
    }
  }, 1);
  let getCSSVariable;
  module1.link("../../../client/scripts/helpers.js", {
    getCSSVariable(v) {
      getCSSVariable = v;
    }
  }, 2);
  let Expand;
  module1.link("./Expand.jsx", {
    Expand(v) {
      Expand = v;
    }
  }, 3);
  ___INIT_METEOR_FAST_REFRESH(module);
  var _s = $RefreshSig$();
  const Stream = function () {
    _s();
    const videoRef = useRef(null);
    const [play, setPlay] = useState(false);
    const [animation, setAnimation] = useState('');
    const toggle = function () {
      const player = videoRef.current;
      if (play) {
        player.pause();
        setPlay(false);
        return;
      }
      player.play();
      setPlay(true);
    };
    useEffect(() => {
      const delay = parseInt(getCSSVariable('--animate-delay'));
      setAnimation('');
      setTimeout(() => {
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
      className: "stream__video-player animate__animated ".concat(animation)
    }, /*#__PURE__*/React.createElement("video", {
      className: "".concat(play ? 'playing' : ''),
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
  let React, Fragment, useState, useEffect;
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
  let Park;
  module1.link("/imports/ui/routes/Park", {
    Park(v) {
      Park = v;
    }
  }, 5);
  let Footer;
  module1.link("/imports/ui/components/Footer", {
    Footer(v) {
      Footer = v;
    }
  }, 6);
  let data;
  module1.link("../../client/scripts/data", {
    default(v) {
      data = v;
    }
  }, 7);
  let transition;
  module1.link("../../client/scripts/helpers.js", {
    transition(v) {
      transition = v;
    }
  }, 8);
  ___INIT_METEOR_FAST_REFRESH(module);
  var _s = $RefreshSig$();
  console.log(data);
  const App = () => {
    _s();
    const [routes, setRoutes] = useState({
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
    const setHeaderHeight = function () {
      const header = document.querySelector('header');
      const {
        height
      } = header.getBoundingClientRect();
      const root = document.querySelector(':root');
      root.style.setProperty('--header-height', height + 'px');
    };
    useEffect(() => {
      window.setRoute = (route, props) => setRoute(route, props);
      setHeaderHeight();
      window.addEventListener('resize', () => {
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
  let event;
  module1.link("./event.js", {
    default(v) {
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
  let athletes;
  module1.link("./athletes.js", {
    default(v) {
      athletes = v;
    }
  }, 0);
  let event;
  module1.link("./event.js", {
    default(v) {
      event = v;
    }
  }, 1);
  let events;
  module1.link("./events.js", {
    events(v) {
      events = v;
    }
  }, 2);
  let park;
  module1.link("./park.js", {
    default(v) {
      park = v;
    }
  }, 3);
  let parks;
  module1.link("./parks.js", {
    parks(v) {
      parks = v;
    }
  }, 4);
  let run;
  module1.link("./run.js", {
    default(v) {
      run = v;
    }
  }, 5);
  let sponsors;
  module1.link("./sponsors.js", {
    default(v) {
      sponsors = v;
    }
  }, 6);
  ___INIT_METEOR_FAST_REFRESH(module);
  module1.exportDefault({
    athletes,
    event,
    events,
    park,
    parks,
    run,
    sponsors
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
    parks: () => parks
  });
  let park;
  module1.link("./park.js", {
    default(v) {
      park = v;
    }
  }, 0);
  ___INIT_METEOR_FAST_REFRESH(module);
  const parks = [park];
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
  module1.export({
    asyncTimeout: () => asyncTimeout,
    getCSSVariable: () => getCSSVariable,
    intersectionObserver: () => intersectionObserver,
    handleize: () => handleize,
    randomInt: () => randomInt,
    sortBy: () => sortBy,
    transition: () => transition
  });
  ___INIT_METEOR_FAST_REFRESH(module);
  /**
   * Creates aribtrary wait time based on miliseconds
   * @param { int } milliseconds
   * @return { promise } resolves once time has been reached
   * */
  const asyncTimeout = function (ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  };
  const getCSSVariable = function (variable) {
    if (!window) return;
    return getComputedStyle(document.body).getPropertyValue(variable);
  };
  const intersectionObserver = function (el, callback) {
    let options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    if (!window) return;
    if (!el || !callback) return;
    const observer = new IntersectionObserver(callback, options);
    observer.observe(el);
  };
  const handleize = function (str) {
    return str.toLowerCase().replace(/[^\w\u00C0-\u024f]+/g, '-').replace(/^-+|-+$/g, '');
  };
  const randomInt = function (min, max, wholenum) {
    if (wholenum) return Math.floor(Math.random() * (max - min + 1) + min);
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