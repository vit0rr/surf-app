import React from 'react';

export const Sponsors = function ({ event }) {
	return (
		<section className="page-event__sponsors uk-padding-small">
			{event.sponsors.map((sponsor, index) => {
				return (
					<a key={index}>
						<img src={sponsor.image} />
					</a>
				);
			})}
			<div className="page-event__sponsors-who">
				<p className="uk-text-meta uk-text-uppercase">This event is brought to you by</p>
			</div>
		</section>
	);
};
