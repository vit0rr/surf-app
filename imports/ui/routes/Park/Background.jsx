import React, { Fragment } from 'react';

export const Background = function ({ event, primary, secondary }) {
	const gradient = `repeating-linear-gradient(
		45deg,
		${primary},
		${primary} 5px,
		${secondary} 5px,
		${secondary} 10px
	)`;

	return (
		<Fragment>
			<div
				className="page-event__bg page-event__bg--background"
				style={{
					backgroundImage: `url(./${event.image})`
				}}
			></div>
			<div className="page-event__bg page-event__bg--foreground">
				<div
					className="page-event__bg-line page-event__bg-line-left"
					style={{
						background: gradient
					}}
				/>
				<div
					className="page-event__bg-line page-event__bg-line-right"
					style={{
						background: gradient
					}}
				/>
			</div>
		</Fragment>
	);
};
