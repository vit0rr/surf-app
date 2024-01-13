import React, { Fragment, useRef, useEffect } from 'react';
import { intersectionObserver } from '../../../../client/scripts/helpers.js';

export const HappeningNow = function ({ park, event, full }) {
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
	return (
		<div className={`page-park__happening-now${full ? ' page-park__happening-now--full' : ''}`}>
			<img
				className="page-park__happening-now-cover animate__animated animate__delay-1s animate__fadeIn"
				src={`./${event.image}`}
			/>
			<div className="page-park__happening-now-info animate__animated animate__fadeInDown animate__delay-2s">
				<img src={park.logo} alt={event.title} />
				<div className="page-park__happening-now-title">
					<h5 className="uk-h6 uk-text-uppercase uk-text-bolder">{event.title}</h5>
					<h6 className="uk-text-uppercase">{event.subtitle}</h6>
				</div>
			</div>
			<div className="page-park__happening-now-cta animate__animated animate__fadeInUp animate__delay-2s">
				<h6 className="uk-text-uppercase uk-text-bolder uk-text-italic">
					Happening <span style={{ color: event.theme.primary }}>Now</span>
				</h6>
				<button
					className="uk-button uk-button-secondary uk-button-large"
					style={{ backgroundColor: event.theme.primary }}
				>
					Jump In
				</button>
			</div>
		</div>
	);
};
