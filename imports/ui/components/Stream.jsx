import React, { useState, useEffect, useRef } from 'react';
import data from '../../../client/scripts/data';
import { getCSSVariable } from '../../../client/scripts/helpers.js';
import { Expand } from './Expand.jsx';

export const Stream = function () {
	const videoRef = useRef(null);
	const [play, setPlay] = useState(false);
	const [animation, setAnimation] = useState('');

	const toggle = function () {
		const player = videoRef.current;

		if (play) {
			player.pause();
			setPlay(false);
			return;
		}

		player.play();
		setPlay(true);
	};

	useEffect(() => {
		const delay = parseInt(getCSSVariable('--animate-delay'));
		setAnimation('');

		setTimeout(() => {
			setAnimation('animate__fadeIn');
		}, delay);
	}, []);

	return (
		<div data-expand="stream" className="stream">
			<Expand id="stream" animationIn="animate__fadeIn" animationOut="animate__fadeOut" />
			<h4 className="uk-text-bold uk-text-uppercase" style={{ color: data.event.theme.primary }}>
				<span>Happening</span> Now
			</h4>
			<div className={`stream__video-player animate__animated ${animation}`}>
				<video
					className={`${play ? 'playing' : ''}`}
					ref={videoRef}
					src={data.event.stream}
					onClick={toggle}
				></video>
				{!play && (
					<button
						className="stream__play active"
						uk-icon="icon: play-circle"
						onClick={toggle}
					></button>
				)}
			</div>
		</div>
	);
};
