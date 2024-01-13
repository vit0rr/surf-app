import React, { Fragment } from 'react';
import dayjs from 'dayjs';

export const Events = function ({ park }) {
	return (
		<div className="page-park__event" uk-slider="center: true">
			<ul className="uk-slider-items">
				{[...park.events, ...park.events].map((event, index) => {
					const month = dayjs(event.date).format('MM');
					const day = dayjs(event.date).format('DD');
					return (
						<li key={index}>
							<a>
								<div
									className="page-park__event-overlay"
									style={{
										background: `linear-gradient(0.25turn, ${park.theme.secondary}, transparent)`
									}}
								></div>
								<div className="page-park__event-content">
									<h5
										style={{ color: park.theme.primary }}
										className="uk-text-uppercase uk-text-bold"
									>
										{event.title}
									</h5>
									<h6 className="uk-text-uppercase">{event.subtitle}</h6>
								</div>
								<div className="page-park__event-date">
									<p>
										<span>{day}</span>
										<span>/</span>
										<span>{month}</span>
									</p>
								</div>
								<img src={event.image} width="" height="" alt="" />
							</a>
						</li>
					);
				})}
			</ul>
		</div>
	);
};
