import React, { Fragment, useState, useEffect, useRef } from 'react';
import '/node_modules/flag-icons/css/flag-icons.min.css';
import data from '../../../../client/scripts/data';
import {
	getCSSVariable,
	asyncTimeout,
	intersectionObserver
} from '../../../../client/scripts/helpers.js';
import { Background } from './Background';
import { Banner } from './Banner';
import { HappeningNow } from './HappeningNow';
import { Events } from './Events';
import { About } from './About';
import { Records } from './Records';
import { Amenities } from './Amenities';

export const Park = function (props) {
	const mainRef = useRef(null);
	const [animation, setAnimation] = useState('');

	useEffect(() => {
		const delay = parseInt(getCSSVariable('--animate-delay'));
		setAnimation('');

		setTimeout(() => {
			setAnimation('animate__fadeIn');
		}, delay);
	}, []);

	return (
		<main ref={mainRef} className="page-park">
			<Background
				event={data.park}
				primary={data.park.theme.primary}
				secondary={data.park.theme.secondary}
			/>
			<div className="container">
				<section className={`page-park__banner animate__animated animate__delay-1s ${animation}`}>
					<Banner park={data.park} />
				</section>
				<section
					className={`page-park__happening animate__animated animate__delay-1s ${animation}`}
				>
					<HappeningNow park={data.park} event={data.event} />
				</section>
			</div>
			<div className="container">
				<section className={`page-park__events animate__animated animate__delay-1s ${animation}`}>
					<Events park={data.park} />
				</section>
			</div>
			<div className="container">
				<section
					className={`page-park__park-records animate__animated animate__delay-1s ${animation}`}
				>
					<Records park={data.park} />
				</section>
				<section className={`page-park__about animate__animated animate__delay-1s ${animation}`}>
					<About park={data.park} />
				</section>
				<section
					className={`page-park__happening page-park__happening--full animate__animated animate__delay-1s ${animation}`}
				>
					<HappeningNow park={data.park} event={data.event} full={true} />
				</section>
				<section
					className={`page-park__park-amenities animate__animated animate__delay-1s ${animation}`}
				>
					<Amenities park={park} />
				</section>
			</div>
		</main>
	);
};
