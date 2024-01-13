import React, { Fragment, useState, useEffect } from 'react';
import { Navbar } from '/imports/ui/components/Navbar';
import { Home } from '/imports/ui/routes/Home';
import { Events } from '/imports/ui/routes/Events';
import { Event } from '/imports/ui/routes/Event/index.jsx';
import { Park } from '/imports/ui/routes/Park';
import { Footer } from '/imports/ui/components/Footer';
import data from '../../client/scripts/data';
import { transition } from '../../client/scripts/helpers.js';

console.log(data);

export const App = () => {
  const [routes, setRoutes] = useState(
    {
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
    },
    []
  );

  const setRoute = async function (route, props) {
    const state = { ...routes };
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
    const { height } = header.getBoundingClientRect();
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

  return (
    <Fragment>
      <Navbar setRoute={setRoute} routes={routes} />
      {routes.home.active && <Home setRoute={setRoute} />}
      {routes.events.active && <Events setRoute={setRoute} />}
      {routes.event && routes.event.active && <Event />}
      {routes.park && routes.park.active && <Park />}
      <Footer />
    </Fragment>
  );
};
