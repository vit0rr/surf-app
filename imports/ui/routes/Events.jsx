import React, { useState } from 'react';
import { Tabs } from '../components/Tabs.jsx';
import { ImageGrid } from '../components/ImageGrid.jsx';
import data from '../../../client/scripts/data';

export const Events = function (props) {
	const events = data.events();

	const [search, setSearch] = useState();

	const applySearch = function (value) {
		if (!value || value == '') return events;

		const _value = value.toLowerCase();

		const _events = [...events].filter((event) => {
			const title = event.title.toLowerCase();
			const subtitle = event.subtitle.toLowerCase();
			const description = event.description.toLowerCase();

			if (
				(title && title.indexOf(value) > -1) ||
				(subtitle && subtitle.indexOf(value) > -1) ||
				(description && description.indexOf(value) > -1)
			) {
				return event;
			}
		});

		return _events;
	};

	return (
		<main className="page-events" uk-filter="target: .js-filter; animation: slide">
			<section className="page-events__search uk-container uk-padding-large">
				<div className="uk-grid-small" uk-grid="uk-grid">
					<div className="uk-width-1-1">
						<form className="uk-search uk-search-default">
							<a uk-search-icon="uk-search-icon"></a>
							<input
								className="uk-search-input"
								type="search"
								placeholder="Search Events"
								aria-label="Search Events"
								onChange={(event) => setSearch(event.currentTarget.value)}
							/>
						</form>
						<Tabs
							tabs={[
								{ title: 'Park' },
								{ title: 'Pipe' },
								{ title: 'Big Wave' },
								{ title: "Men's" },
								{ title: "Women's" },
								{ title: 'Coed' }
							]}
						/>
					</div>
				</div>
			</section>
			<ImageGrid
				title="Upcoming Events"
				items={applySearch(search)}
				grid="uk-child-width-1-2@s uk-child-width-1-3@m"
				filter={true}
				fillImage={true}
			/>
		</main>
	);
};
