import React, { useRef, useState, useEffect } from 'react';
import data from '../../../client/scripts/data';
import { getCSSVariable } from '../../../client/scripts/helpers.js';
import { Expand } from './Expand.jsx';

export const ParkMap = function () {
	const mapRef = useRef(null);
	const athlete = data.athletes[0];
	const [animation, setAnimation] = useState('');

	const setPointData = function () {
		const map = document.querySelector('[data-map]');
		data.event.run.points.forEach((point, index) => {
			const anchor = document.querySelectorAll('[data-anchor]')[index];

			const line = document.createElement('div');
			line.classList.add('line');
			line.setAttribute('data-line', index);
			line.style.borderColro = data.event.theme.primary;
			line.style.left = `calc(${anchor.style.left} + 20px)`;

			const markup = `
				<h6 class="uk-text-uppercase uk-text-bolder" style="color: ${data.event.theme.primary};">${point.title}</h6>
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

	useEffect(() => {
		const delay = parseInt(getCSSVariable('--animate-delay'));
		setAnimation('');

		setTimeout(() => {
			setAnimation('animate__fadeInUp');
		}, delay);

		setTimeout(() => {
			setPointData();
		}, delay * 2);
	}, []);

	return (
		<div
			ref={mapRef}
			className="park-map uk-padding-small animate__animated"
			data-expand="park-map"
		>
			<h4 className="uk-text-bold uk-text-uppercase" style={{ color: data.event.theme.primary }}>
				<span>Current</span> Run
			</h4>
			<Expand id="park-map" animationIn="animate__fadeIn" animationOut="animate__fadeOut" />
			<div className="park-map__athlete">
				<div
					className={`park-map__athlete-run animate__animated animate__delay-1s ${animation}`}
					style={{
						backgroundColor: data.event.theme.primary
					}}
				>
					<div className="park-map__athlete-image">
						<img src={athlete.image} />
					</div>
					<div className="park-map__athlete-name uk-padding-small uk-text-uppercase uk-text-bold">
						<span>{athlete.name}</span>
					</div>
					<div className="park-map__athlete-current-run uk-padding-small uk-text-uppercase uk-text-bold">
						<span>Run {athlete.run}</span>
					</div>
					<div className="park-map__athlete-points uk-padding-small uk-text-uppercase uk-text-bold">
						<span>{athlete.points}</span>
					</div>
				</div>
			</div>
			<div data-map="map" className="park-map__map" onClick={getCoords}>
				{data.event.run.points.map((point, index) => {
					return (
						<div
							key={index}
							data-anchor={index}
							className="park-map__map-point"
							style={{
								top: point.coords.y,
								left: point.coords.x,
								backgroundColor: data.event.theme.primary
							}}
						/>
					);
				})}
				<img src={data.event.park} />
			</div>
		</div>
	);
};
