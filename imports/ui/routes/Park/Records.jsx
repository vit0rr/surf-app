import React, { Fragment, useState, useEffect } from 'react';
import { Leaderboard } from '../../components/Leaderboard.jsx';

export const Records = function ({ park }) {
	const [category, setCategory] = useState(null);
	const gradient = `repeating-linear-gradient(
		45deg,
		${park.theme.primary},
		${park.theme.primary} 5px,
		${park.theme.secondary} 5px,
		${park.theme.secondary} 10px
	)`;

	useEffect(() => {
		//
	}, []);

	return (
		<div className="page-park__records">
			<div
				className="page-park__records-bg"
				style={{
					backgroundColor: park.theme.secondary
				}}
			></div>
			<div className="page-park__records-corner page-park__records-corner--top-left">
				<div
					className="page-park__records-corner-circle page-park__records-corner-circle--inner"
					uk-icon="icon: bolt"
				/>
				<div
					className="page-park__records-corner-circle page-park__records-corner-circle--outer"
					uk-icon="icon: bolt"
				/>
			</div>
			<div className="page-park__records-corner page-park__records-corner--top-right">
				<div
					className="page-park__records-corner-circle page-park__records-corner-circle--inner"
					uk-icon="icon: bolt"
				/>
				<div
					className="page-park__records-corner-circle page-park__records-corner-circle--outer"
					uk-icon="icon: bolt"
				/>
			</div>
			<div className="page-park__records-title-group">
				<img src={park.logo} className="page-park__records-logo" />
				<div className="page-park__records-titles">
					<h4 className="page-park__records-subtitle uk-text-uppercase uk-text-bolder uk-h1">
						{park.name}
					</h4>
					<p className="page-park__records-tagline uk-text-uppercase uk-text-italic">
						"It's you versus everyone else"
					</p>
				</div>
			</div>
			<Leaderboard leaderboards={park.leaderboard} park={park} />
		</div>
	);
};
