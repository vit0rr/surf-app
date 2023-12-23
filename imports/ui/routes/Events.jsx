import React, { useState } from 'react';
import { Tabs } from '../components/Tabs.jsx';
import { ImageGrid } from '../components/ImageGrid.jsx';

const events = [
	{
		tag: 'Park',
		title: 'Jack Robinson narrates five minutes of Fijian fire',
		description:
			'Jack Robinson talks us through scoring incredible waves at Cloudbreak on his first-ever mission to Fiji.',
		image: 'jack-robinson.png',
		subtitle: '',
		date: '07-12-2024',
		url: '/a'
	},
	{
		tag: 'Pipe',
		title: 'Tahiti',
		description:
			'From the sheer terror of Teahupo’o to the relaxed family and ocean-based way of life, Tahiti offers something for everyone. Let No Contest give you a guided tour of these incredible islands.',
		image: 'tahiti.png',
		subtitle: '',
		date: '07-26-2024',
		url: '/b'
	},
	{
		tag: 'Park',
		title: 'Molly Picklum: What it Takes',
		description:
			"Experience the highs and lows of the WSL World Tour and the mid-season cut, with Australian rookie Molly Picklum. Discover the headspace it requires to compete as one of the world's best surfers.",
		image: 'what-it-takes.png',
		subtitle: '',
		date: '09-01-2024',
		url: '/c'
	},
	{
		tag: 'Big Wave',
		title: 'Waco Surf Trip with the GoPro Surf Team',
		description: "Texas isn't known for its surfing, but Waco Surf has changed the game.",
		image: 'what-it-takes.png',
		subtitle: '',
		date: '09-23-2024',
		url: '/d'
	},
	{
		tag: 'Big Wave',
		title: 'The Rail Project: Julian Wilson has ride of his life as he surf-skates in water',
		description: 'A new kind of skate park.',
		image: 'what-it-takes.png',
		subtitle: '',
		date: '10-25-2024',
		url: '/e'
	}
];

export const Events = function () {
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
