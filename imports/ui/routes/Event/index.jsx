import React, { Fragment, useState, useEffect, useRef } from 'react';
import '/node_modules/flag-icons/css/flag-icons.min.css';
import data from '../../../../client/scripts/data';
import { getCSSVariable, asyncTimeout } from '../../../../client/scripts/helpers.js';
import { Background } from './Background';
import { CTARegister } from '../../components/CTARegister.jsx';
import { Standings } from '../../components/Standings.jsx';
import { ParkMap } from '../../components/ParkMap.jsx';
import { Stream } from '../../components/Stream.jsx';

export const Event = function (props) {
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
		<main ref={mainRef} className="page-event">
			<Background
				event={data.event}
				primary={data.event.theme.primary}
				secondary={data.event.theme.secondary}
			/>
			<div className="container uk-container uk-container-large">
				<section
					className={`page-event__cta-register uk-card uk-card-default uk-card-small uk-card-body animate__animated animate__delay-1s ${animation}`}
				>
					<CTARegister />
				</section>
				<section
					className={`page-event__standings uk-card uk-card-default uk-card-small uk-card-body animate__animated animate__delay-1s ${animation}`}
				>
					<Standings />
				</section>
				<section
					className={`page-event__park-map animate__animated animate__delay-1s ${animation}`}
				>
					<div className=" uk-card uk-card-default uk-card-small uk-card-body">
						<Stream />
					</div>
					<div className=" uk-card uk-card-default uk-card-small uk-card-body">
						<ParkMap />
					</div>
				</section>
			</div>
		</main>
	);
};
