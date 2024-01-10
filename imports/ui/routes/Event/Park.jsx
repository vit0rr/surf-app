import React, { useRef, useState, useEffect } from 'react';
import { getCSSVariable } from '../../../../client/scripts/helpers.js';

export const Park = function ({ event, athlete, league, primary, secondary }) {
	const mapRef = useRef(null);

	const [containerAnimation, setContainerAnimation] = useState('');
	const [athleteAnimation, setAthleteAnimation] = useState('');

	const setPointData = function () {
		const map = document.querySelector('[data-map]');
		event.run.points.forEach((point, index) => {
			const anchor = document.querySelectorAll('[data-anchor]')[index];

			const line = document.createElement('div');
			line.classList.add('line');
			line.setAttribute('data-line', index);
			line.style.borderColro = primary;
			line.style.left = `calc(${anchor.style.left} + 20px)`;

			const markup = `
				<h6 class="uk-text-uppercase uk-text-bolder" style="color: ${primary};">${point.title}</h6>
				<p class="uk-text-uppercase uk-text-light">${point.text}</p>
			`;

			const info = document.createElement('div');
			info.setAttribute('data-info', index);
			info.innerHTML = markup;

			const info2 = document.createElement('div');
			info2.innerHTML = markup;

			line.append(info);
			line.append(info2);
			map.append(line);

			const _line = document.querySelector(`[data-line="${index}"]`);
			const { height } = _line.getBoundingClientRect();
			_line.style.top = `calc(${anchor.style.top} - ${height}px - 5px)`;
		});
	};

	useEffect(() => {
		const delay = parseInt(getCSSVariable('--animate-delay'));
		setContainerAnimation('');
		setAthleteAnimation('');

		setTimeout(() => {
			setContainerAnimation('animate__fadeIn');
			setAthleteAnimation('animate__fadeInUp');
		}, delay);

		setTimeout(() => {}, delay * 2);

		setPointData();
	}, [league]);

	const getCoords = function (event) {
		const map = mapRef.current;
		const { x, y, width, height, left, top } = map.getBoundingClientRect();
		const clientX = event.clientX - left;
		const clientY = event.clientY - top;
		const _top = (clientY / height) * 100;
		const _left = (clientX / width) * 100;

		console.log({
			clientX,
			clientY,
			top: _top,
			left: _left
		});
	};

	return (
		<section
			ref={mapRef}
			className={`page-event__park uk-padding-small animate__animated ${containerAnimation}`}
		>
			<div className={`page-event__park-athlete animate__animated ${athleteAnimation}`}>
				<div
					className="page-event__park-athlete-run"
					style={{
						backgroundColor: primary
					}}
				>
					<div className="page-event__park-athlete-image">
						<img src={athlete.image} />
					</div>
					<div className="page-event__park-athlete-name uk-text-uppercase uk-text-bold">
						<span>{athlete.name}</span>
					</div>
					<div className="page-event__park-athlete-current-run uk-text-uppercase uk-text-bold">
						<span>Run {athlete.run}</span>
					</div>
					<div className="page-event__park-athlete-points uk-text-uppercase uk-text-bold">
						<span>{athlete.points}</span>
					</div>
				</div>
			</div>
			<div data-map="map" className="page-event__park-map" onClick={getCoords}>
				{event.run.points.map((point, index) => {
					return (
						<div
							key={index}
							data-anchor={index}
							className="page-event__map-point"
							style={{
								top: point.coords.y,
								left: point.coords.x,
								backgroundColor: primary
							}}
						/>
					);
				})}
				<img src={event.park} />
			</div>
		</section>
	);
};
