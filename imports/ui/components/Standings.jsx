import React, { Fragment, useEffect, useState } from 'react';
import data from '../../../client/scripts/data';
import { getCSSVariable, randomInt, sortBy } from '../../../client/scripts/helpers.js';
import { Expand } from './Expand.jsx';

export const Standings = function () {
	const keys = ['place', 'image', 'name', 'gender', 'run', 'points'];
	let athletes = [...data.event.athletes].map((athlete, index) => {
		const multiplier = (randomInt(4, 9) / 100).toFixed(2);
		const decimal = 0.13 * index;
		athlete.points = (multiplier * 100 + decimal).toFixed(2);
		athlete.run = 1;
		if (index < 4) athlete.run = 2;

		const obj = {};
		keys.forEach((key) => (obj[key] = athlete[key]));

		return obj;
	});

	athletes = sortBy(athletes, 'points', true);

	const [animation, setAnimation] = useState('');
	const [tabs, setTabs] = useState([
		{
			label: (
				<Fragment>
					Men's{' '}
					<span className="standings-label" style={{ color: data.event.theme.primary }}>
						Standings
					</span>
				</Fragment>
			),
			slug: 'male',
			active: true
		},
		{
			label: (
				<Fragment>
					Women's
					<span className="standings-label" style={{ color: data.event.theme.primary }}>
						Standings
					</span>
				</Fragment>
			),
			slug: 'female',
			active: false
		}
	]);

	const setTab = function () {
		let state = [...tabs];
		const index = tabs.findIndex((tab) => tab.active);
		const nextIndex = index + 1;
		const limit = state.length - 1;

		state = state.map((tab) => {
			tab.active = false;
			return tab;
		});

		if (nextIndex > limit) {
			state[0].active = true;
		} else {
			state[nextIndex].active = true;
		}

		setTabs(state);
	};

	const tab = tabs.find((tab) => tab.active);
	const index = tabs.findIndex((t) => t.slug == tab.slug);

	useEffect(() => {
		const delay = parseInt(getCSSVariable('--animate-delay'));
		setAnimation('');

		setTimeout(() => {
			setAnimation('animate__fadeIn');
		}, delay);
	}, [tabs]);

	return (
		<div data-expand="standings" className="standings">
			<Expand id="standings" animationIn="animate__fadeIn" animationOut="animate__fadeOut" />

			<div className="standings__table-header">
				<button className="uk-text-bold uk-h4 uk-text-uppercase" onClick={setTab}>
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
			</div>

			<div className={`standings__table-body animate__animated ${animation}`}>
				{Object.keys(athletes[0]).map((key) => {
					if (!['gender', 'place', 'image'].includes(key)) {
						return (
							<div
								key={key}
								className={`standings__table-cell-head standings__table-cell-head--${key} athlete--heading athlete--heading-${key} uk-text-uppercase uk-text-bold`}
								style={{
									backgroundColor: `${key == 'name' && data.event.theme.primary}`
								}}
								data-name={key == 'name' ? 'athlete' : key}
							>
								<span>{key == 'name' ? 'athlete' : key}</span>
							</div>
						);
					}
				})}

				{athletes
					.filter((a) => a.gender == tab.slug)
					.map((athlete, index) => {
						let place = index + 1;
						let pointsWidth = (athlete.points / 10) * 100;

						const delay = index + 1;
						const transitionDelay = '1.' + delay + 's';

						return (
							<a
								href={athlete.url}
								key={index}
								className="standings__table-cell-data"
								style={{
									backgroundColor: data.event.theme.primary
								}}
							>
								<div
									className="standings__table-cell-data-item standings__table-cell-data-item--place"
									data-index={place}
								>
									<span>{place}</span>
								</div>
								<div className="standings__table-cell-data-item standings__table-cell-data-item--image">
									<img src={athlete.image} />
								</div>
								<div className="standings__table-cell-data-item standings__table-cell-data-item--name">
									<h6 className="uk-text-normal uk-text-uppercase uk-text-bolder">
										{athlete.name}
									</h6>
								</div>
								<div className="standings__table-cell-data-item standings__table-cell-data-item--run">
									<span className="uk-text-bolder" style={{ color: data.event.theme.primary }}>
										{athlete.run}
									</span>
								</div>
								<div className="standings__table-cell-data-item standings__table-cell-data-item--points">
									<span
										className="uk-text-bolder uk-text-italic"
										style={{ color: data.event.theme.primary }}
									>
										{athlete.points}
									</span>
								</div>
							</a>
						);
					})}
			</div>
		</div>
	);
};
