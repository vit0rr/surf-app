import React, { Fragment, useRef, useEffect } from 'react';
import {
	intersectionObserver,
	asyncTimeout,
	getCSSVariable
} from '../../../../client/scripts/helpers.js';

export const Amenities = function ({ park }) {
	useEffect(() => {
		const delay = parseInt(getCSSVariable('--animate-delay'));
		const amenities = document.querySelectorAll('[data-amenity]');

		amenities.forEach((amenity, index) => {
			intersectionObserver(
				amenity,
				async (event) => {
					const wait = delay * index;

					await asyncTimeout(wait);

					if (event[0].isIntersecting) {
						amenity.classList.add('animate__fadeInUp');
					}
				},
				{
					threshold: 0.75
				}
			);
		});
	}, []);
	return (
		<div
			className="page-park__amenities"
			style={{
				backgroundColor: park.theme.secondary
			}}
		>
			<div className="page-park__amenities-title">
				<h3 className="uk-h2 uk-text-bolder uk-text-uppercase">Amenities</h3>
			</div>
			<div className="page-park__amenities-selection">
				{park.amenities.map((amenity, index) => {
					const name = amenity.name.toLowerCase();
					const key = amenity.name.toLowerCase().replace(/ /g, '-');

					return (
						<button
							key={index}
							data-amenity={key}
							className="animate__animated animate__slow"
							style={{ backgroundColor: park.theme.primary }}
							uk-toggle={`target: #${amenity.id}`}
							type="button"
						>
							<img src={amenity.icon} />
							<span className="uk-text-bold uk-text-uppercase">{amenity.name}</span>
						</button>
					);
				})}
			</div>
			{park.amenities.map((amenity, index) => {
				return (
					<div key={index} id={amenity.id} className="uk-modal-full" uk-modal="uk-modal">
						<div className="uk-modal-dialog">
							<button
								className="uk-modal-close-full uk-close-large"
								type="button"
								uk-close="uk-close"
							></button>
							<div
								className="uk-grid-collapse uk-child-width-1-2@s uk-flex-middle"
								uk-grid="uk-grid"
								style={{
									backgroundImage: 'url(./event-bg.png)',
									backgroundSize: 'cover',
									backgroundRepeat: 'no-repeat',
									backgroundPosition: 'right center'
								}}
							>
								<div className="uk-padding-large">
									<h4
										className="uk-text-bold uk-text-uppercase"
										style={{ color: park.theme.secondary }}
									>
										{amenity.name}
									</h4>
									<p>{amenity.description}</p>
								</div>
								<div
									className="uk-background-cover"
									style={{
										backgroundImage: `url(${amenity.image})`
									}}
									uk-height-viewport="uk-height-viewport"
								></div>
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
};
