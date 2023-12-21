import React, { Fragment, useState } from 'react';
import { Navbar } from '/imports/ui/components/Navbar';
import { Home } from '/imports/ui/routes/Home';
import { Footer } from '/imports/ui/components/Footer';

export const App = () => {
  const [routes, setRoutes] = useState(
    {
      home: true,
      events: false,
      leagues: false,
      parks: false
    },
    []
  );

  return (
    <Fragment>
      <Navbar />
      {Home && <Home />}
      <Footer />
    </Fragment>
  );
};
