import React, { Fragment } from 'react';
import dayjs from 'dayjs';

export const Info = function ({ event, primary }) {
	return (
		<Fragment>
			<section className="page-event__info uk-padding-small">
				<div className="page-event__info-logo">
					<img src={event.logo} alt={event.title} />
				</div>
				<div className="page-event__info-title">
					<h1 className="uk-text-uppercase">{event.title}</h1>
					<h2
						className="uk-text-uppercase uk-text-meta"
						style={{
							color: primary
						}}
					>
						{event.subtitle}
					</h2>
				</div>
				<div className="page-event__info-date">
					<p className="uk-text-bolder" style={{ color: primary }}>
						{dayjs(event.date).format('YY')}
					</p>
				</div>
			</section>
			<section
				className="page-event__info page-event__info--description uk-padding-small"
				uk-accordion="uk-accordion"
			>
				<div>
					<button className="uk-accordion-title">Event Details</button>
					<div className="uk-accordion-content">
						<p>{event.description}</p>
					</div>
				</div>
			</section>
		</Fragment>
	);
};
