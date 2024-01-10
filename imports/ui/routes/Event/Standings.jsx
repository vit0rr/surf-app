import React, { useEffect, useState } from 'react';
import { getCSSVariable } from '../../../../client/scripts/helpers.js';

export const Standings = function ({ athletes, league, primary, secondary }) {
	const [animation, setAnimation] = useState('');

	useEffect(() => {
		const delay = parseInt(getCSSVariable('--animate-delay'));
		setAnimation('');

		setTimeout(() => {
			setAnimation('animate__fadeIn');
		}, delay);
	}, [league]);

	return (
		<section className="page-event__standings uk-padding-small">
			<div className={`page-event__athlete-table animate__animated ${animation}`}>
				<div className="page-event__athlete page-event__athlete--key">
					{Object.keys(athletes[0]).map((key) => {
						return (
							<div
								key={key}
								className={`page-event__athlete-${key} page-event__athlete--heading page-event__athlete--heading-${key} uk-text-uppercase uk-text-bold`}
								style={{
									backgroundColor: primary
								}}
								data-name={key == 'name' ? 'athlete' : key}
							>
								<span>{key == 'name' ? 'athlete' : key}</span>
							</div>
						);
					})}
				</div>

				{athletes
					.filter((a) => a.gender == league)
					.map((athlete, index) => {
						let place = index + 1;
						let pointsWidth = (athlete.points / 10) * 100;

						const delay = index + 1;
						const transitionDelay = '1.' + delay + 's';

						return (
							<a
								href={athlete.url}
								key={index}
								className="page-event__athlete page-event__athlete--item"
							>
								<div className="page-event__athlete-place" data-index={place}>
									<span>{place}</span>
								</div>
								<div className="page-event__athlete-image">
									<img src={athlete.image} />
									<span className={`fib fi-${athlete.country}`}></span>
								</div>
								<div
									className="page-event__athlete-name uk-padding-small"
									style={{
										backgroundColor: primary
									}}
								>
									<h6 className="uk-text-normal uk-text-uppercase uk-text-bolder">
										{athlete.name}
									</h6>
								</div>
								<div className="page-event__athlete-run">
									<span className="uk-text-bolder" style={{ color: primary }}>
										{athlete.run}
									</span>
								</div>
								<div className="page-event__athlete-points">
									<span className="uk-text-bolder uk-text-italic" style={{ color: primary }}>
										{athlete.points}
									</span>
								</div>
							</a>
						);
					})}
			</div>
		</section>
	);
};
