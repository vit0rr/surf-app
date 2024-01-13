import React, { useEffect } from 'react';
import { asyncTimeout, getCSSVariable } from '../../../client/scripts/helpers.js';

export const Expand = function (props) {
	useEffect(() => {
		const container = document.querySelector(`[data-expand="${props.id}"]`);

		if (!container) return;

		container.classList.add('animate__animated');
	});

	const expand = async function () {
		const container = document.querySelector(`[data-expand="${props.id}"]`);
		const delay = parseInt(getCSSVariable('--animate-delay'));

		if (!container) return;

		if (container.className.indexOf('expand') > -1) {
			container.classList.add(props.animationOut);

			await asyncTimeout(delay);

			container.classList.remove(props.animationOut, props.animationIn, 'expand');

			return;
		}

		container.classList.add('expand');

		container.classList.add(props.animationIn);
	};

	return <button data-expand-trigger="stream" uk-icon="icon: expand" onClick={expand} />;
};
