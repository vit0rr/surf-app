import React, { Fragment, useState } from 'react';
import { Navbar } from '/imports/ui/components/Navbar';
import { Home } from '/imports/ui/routes/Home';
import { Events } from '/imports/ui/routes/Events';
import { Footer } from '/imports/ui/components/Footer';

export const App = () => {
  const [routes, setRoutes] = useState(
    {
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
    },
    []
  );

  const setRoute = function (route) {
    const state = { ...routes };

    for (let _route in state) {
      state[_route].active = false;

      if (_route == route) state[_route].active = true;
    }

    setRoutes(state);
  };

  return (
    <Fragment>
      <Navbar setRoute={setRoute} routes={routes} />
      {routes.home.active && <Home />}
      {routes.events.active && <Events />}
      <Footer />
    </Fragment>
  );
};
