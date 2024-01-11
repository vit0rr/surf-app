import React, { Fragment, useState } from 'react';
import { Navbar } from '/imports/ui/components/Navbar';
import { Home } from '/imports/ui/routes/Home';
import { Events } from '/imports/ui/routes/Events';
import { Event } from '/imports/ui/routes/Event/index.jsx';
import { Footer } from '/imports/ui/components/Footer';
import data from '../../client/scripts/data.js';
import { transition } from '../../client/scripts/helpers.js';

const test = {
  'id': 1,
  'tag': 'Park',
  'title': 'The Hawaiian Islands',
  'location': 'Haleiwa,Oahu, United States',
  'description':
    "The HIC Haleiwa Pro is a premier surfing competition that takes place in the captivating backdrop of the Hawaiian Islands. Known for its thrilling waves and stunning coastal scenery, this event is a highlight on the professional surfing calendar. Surfers from around the world converge on the iconic North Shore of Oahu to showcase their skills and compete for top honors. The competition is a part of the World Surf League's Qualifying Series, attracting elite surfers eager to conquer the challenging waves of Haleiwa. With its rich surfing culture, warm hospitality, and breathtaking ocean views, the HIC Haleiwa Pro not only celebrates the sport but also pays homage to the unique spirit of Hawaii's surf culture. It's an event where passion meets skill, and spectators are treated to an exhilarating display of talent against the backdrop of one of the world's most iconic surfing destinations.",
  'image': 'hic.jpeg',
  'subtitle': 'HIC Haleiwa Pro',
  'start_date': '07-12-2024',
  'end_date': '07-15-2024',
  'url': '/a',
  'athletes': [
    {
      'birthstart_date': 'Apr 16, 1995',
      'end_date': 'Apr 16, 1995',
      'gender': 'male',
      'hometown': 'Ubatuba, São Paulo',
      'country': 'br',
      'image': 'fillipe-toledo.png',
      'name': 'Filipe Toledo',
      'stance': 'regular',
      'weight': 154,
      'height': { 'feet': 5, 'inches': 9 }
    },
    {
      'birthstart_date': 'Sep 2, 1998',
      'end_date': 'Sep 2, 1998',
      'gender': 'male',
      'hometown': 'North Stradbroke Island, Queensland, Australia',
      'country': 'au',
      'image': 'ethan-ewing.png',
      'name': 'Ethan Ewing',
      'weight': 169,
      'stance': 'regular',
      'height': { 'feet': 5, 'inches': 11 }
    },
    {
      'birthstart_date': 'Jul 29, 1998',
      'end_date': 'Jul 29, 1998',
      'hometown': 'San Clemente, California',
      'country': 'us',
      'gender': 'male',
      'image': 'griffin-colapinto.png',
      'name': 'Griffin Colapinto',
      'stance': 'regular',
      'weight': 171,
      'height': { 'feet': 5, 'inches': 11 }
    },
    {
      'birthstart_date': 'Aug 30, 2000',
      'end_date': 'Aug 30, 2000',
      'hometown': 'Saquarema',
      'country': 'br',
      'gender': 'male',
      'image': 'joao-chianca.png',
      'name': 'Joao Chianca',
      'stance': 'regular',
      'weight': 171,
      'height': { 'feet': 5, 'inches': 11 }
    },
    {
      'birthstart_date': 'Dec 27, 1997',
      'end_date': 'Dec 27, 1997',
      'hometown': 'Margaret River',
      'country': 'au',
      'gender': 'male',
      'image': 'jack-robinson-1.png',
      'name': 'Jack Robinson',
      'stance': 'regular',
      'weight': 178,
      'height': { 'feet': 5, 'inches': 11 }
    },
    {
      'birthstart_date': 'Aug 27, 1992',
      'end_date': 'Aug 27, 1992',
      'name': 'Carissa Moore',
      'image': 'carissa-moore.png',
      'hometown': 'Honolulu, Oahu, Hawaii',
      'country': 'us',
      'gender': 'female',
      'weight': 154,
      'stance': 'regular',
      'height': { 'feet': 5, 'inches': 7 }
    },
    {
      'birthstart_date': 'Oct 26, 2005',
      'end_date': 'Oct 26, 2005',
      'name': 'Caitlin Simmers',
      'image': 'caitlin-simmers.png',
      'hometown': 'Oceanside, CA',
      'country': 'us',
      'gender': 'female',
      'weight': 114,
      'stance': 'regular',
      'height': { 'feet': 5, 'inches': 3 }
    },
    {
      'birthstart_date': ' May 9, 1996',
      'end_date': ' May 9, 1996',
      'name': 'Tatiana Weston-Webb',
      'image': 'tatiana.png',
      'hometown': 'Princeville, Kauai, Hawaii',
      'country': 'us',
      'gender': 'female',
      'weight': 127,
      'stance': 'Goofy',
      'height': { 'feet': 5, 'inches': 4 }
    }
  ],
  'logo': './event-logo-dark.png',
  'sponsors': [
    { 'image': 'activision.png', 'url': '' },
    { 'image': 'sharpeye.png', 'url': '' },
    { 'image': 'redbull.png', 'url': '' },
    { 'image': 'hurley.png', 'url': '' },
    { 'image': 'oneil.png', 'url': '' },
    { 'image': 'slater.png', 'url': '' }
  ],
  'theme': { 'primary': 'var(--primary)', 'secondary': 'var(--secondary)' },
  'park': './wavepark-1.png',
  'run': {
    points: [
      {
        title: 'Wave 1',
        text: 'Tail Slide',
        coords: {
          x: '78%',
          y: '22%'
        }
      },
      {
        title: 'Wave 2',
        text: 'Aerial',
        coords: {
          x: '80.2%',
          y: '30.5%'
        }
      },
      {
        title: 'Wave 3',
        text: 'Snap',
        coords: {
          x: '57%',
          y: '45.5%'
        }
      },
      {
        title: 'Wave 4',
        text: 'Off-the-Lip',
        coords: {
          x: '50%',
          y: '67%'
        }
      }
    ]
  }
};

export const App = () => {
  const [routes, setRoutes] = useState(
    {
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

  return (
    <Fragment>
      <Navbar setRoute={setRoute} routes={routes} />
      {routes.home.active && <Home setRoute={setRoute} />}
      {routes.events.active && <Events setRoute={setRoute} />}
      {routes.event && routes.event.active && <Event event={routes.event.props} />}
      <Footer />
    </Fragment>
  );
};
