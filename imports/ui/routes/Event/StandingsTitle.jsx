import React from 'react';

export const StandingsTitle = function ({ tabs, tab, setTab }) {
	const index = tabs.findIndex((t) => t.slug == tab.slug);

	return (
		<section className="page-event__standings-title uk-padding-small">
			<button className="uk-text-bold uk-h2 uk-text-uppercase" onClick={setTab}>
				{tabs.map((t) => {
					let sum = index * 40 * -1;
					let transform = `translateY(${sum}px)`;

					return (
						<div
							key={t.slug}
							className="page-event__standings-tab"
							style={{
								transform
							}}
						>
							{t.label}
							<span className="icon-group">
								<span className="icon-up" uk-icon="icon: triangle-up" />
								<span className="icon-down" uk-icon="icon: triangle-down" />
							</span>
						</div>
					);
				})}
			</button>
		</section>
	);
};
