import React, { Fragment, useState, useEffect, useRef } from 'react';
import '/node_modules/flag-icons/css/flag-icons.min.css';
import { randomInt, sortBy } from '../../../../client/scripts/helpers.js';
import { Background } from './Background';
import { Info } from './Info';
import { StandingsTitle } from './StandingsTitle';
import { Standings } from './Standings';
import { Park } from './Park';
import { Sponsors } from './Sponsors.jsx';

export const Event = function (props) {
	const mainRef = useRef(null);
	const keys = ['place', 'image', 'name', 'gender', 'run', 'points'];
	const primary = props.event.theme.primary;
	const secondary = props.event.theme.secondary;
	let _athletes = [...props.event.athletes].map((athlete, index) => {
		const multiplier = (randomInt(4, 9) / 100).toFixed(2);
		const decimal = 0.13 * index;
		athlete.points = (multiplier * 100 + decimal).toFixed(2);
		athlete.run = 1;
		if (index < 4) athlete.run = 2;

		const obj = {};
		keys.forEach((key) => (obj[key] = athlete[key]));

		return obj;
	});

	_athletes = sortBy(_athletes, 'points', true);

	const [athletes, setAthletes] = useState(_athletes);
	const [tabs, setTabs] = useState([
		{
			label: (
				<Fragment>
					Men's{' '}
					<span className="standings-label" style={{ color: primary }}>
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
					<span className="standings-label" style={{ color: primary }}>
						Standings
					</span>
				</Fragment>
			),
			slug: 'female',
			active: false
		},
		{
			label: (
				<Fragment>
					Park
					<span className="standings-label" style={{ color: primary }}>
						View
					</span>
				</Fragment>
			),
			slug: 'park',
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

	useEffect(() => {
		const mainEl = mainRef.current;
		mainEl.classList.add('active');
	}, []);

	const tab = tabs.find((tab) => tab.active);
	let displayStandings = false;
	if (tab.slug == 'male' || tab.slug == 'female') displayStandings = true;

	return (
		<main ref={mainRef} className="page-event">
			<Background event={props.event} primary={primary} secondary={secondary} />
			<Info event={props.event} primary={primary} secondary={secondary} />
			<StandingsTitle tabs={tabs} tab={tab} setTab={setTab} />
			{displayStandings && (
				<Fragment>
					<Standings
						athletes={athletes}
						primary={primary}
						secondary={secondary}
						league={tab.slug}
					/>
				</Fragment>
			)}
			{!displayStandings && (
				<Park
					event={props.event}
					athlete={athletes[0]}
					league={tab.slug}
					primary={primary}
					secondary={secondary}
				/>
			)}
			<Sponsors event={props.event} primary={primary} secondary={secondary} league={tab.slug} />
		</main>
	);
};
