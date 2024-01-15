import React, { Fragment, useRef, useEffect } from 'react';
import { randomInt, intersectionObserver } from '../../../../client/scripts/helpers.js';

export const About = function ({ park }) {
	const imageRef = useRef(null);
	const imageSquareRef = useRef(null);
	const contentSquareRef = useRef(null);
	const contentRef = useRef(null);
	const index = randomInt(0, park.media.length - 1, true);
	const image = park.media[index];
	const gradient = `repeating-linear-gradient(
		45deg,
		${park.theme.primary},
		${park.theme.primary} 5px,
		${park.theme.secondary} 5px,
		${park.theme.secondary} 10px
	)`;

	useEffect(() => {
		const image = imageRef.current;

		intersectionObserver(
			image,
			(event) => {
				if (event[0].isIntersecting) image.classList.add('animate__fadeInLeft');
			},
			{ threshold: 0.75 }
		);

		const ImageSquare = imageSquareRef.current;
		intersectionObserver(
			ImageSquare,
			(event) => {
				if (event[0].isIntersecting) ImageSquare.classList.add('animate__fadeInUp');
			},
			{ threshold: 0.75 }
		);

		const contentSquare = contentSquareRef.current;
		intersectionObserver(
			contentSquare,
			(event) => {
				if (event[0].isIntersecting) contentSquare.classList.add('animate__fadeInUp');
			},
			{ threshold: 0.75 }
		);

		const content = contentRef.current;
		intersectionObserver(
			content,
			(event) => {
				if (event[0].isIntersecting) content.classList.add('animate__fadeIn');
			},
			{ threshold: 0.75 }
		);
	}, []);

	return (
		<Fragment>
			<div
				className="page-park__about-overlay"
				style={{
					backgroundColor: park.theme.primary
				}}
			></div>
			<div className="page-park__about-image uk-visible@m">
				<img ref={imageRef} className="animate__animated" src={image} />
				<div
					ref={imageSquareRef}
					className="page-park__about-image-square animate__animated"
					style={{
						backgroundColor: park.theme.secondary
					}}
					style={{
						background: gradient
					}}
				></div>
			</div>
			<div ref={contentRef} className="page-park__about-content animate__animated">
				<h3 className="uk-h1 uk-text-uppercase uk-text-bold">The Park</h3>
				<p dangerouslySetInnerHTML={{ __html: park.description }}></p>
				<a
					className="uk-button uk-button-danger"
					href={park.url}
					style={{
						backgroundColor: park.theme.secondary
					}}
				>
					Visit {park.name}
				</a>
				<div className="page-park__about-social-media">
					{park.social.map((item, index) => {
						let icon = 'link';

						if (item.indexOf('facebook') > -1) icon = 'facebook';
						if (item.indexOf('instagram') > -1) icon = 'instagram';
						if (item.indexOf('twitter') > -1) icon = 'twitter';
						if (item.indexOf('youtube') > -1) icon = 'youtube';

						return (
							<a key={index} href={item} target="_blank">
								<span uk-icon={`icon: ${icon}`}></span>
							</a>
						);
					})}
				</div>
				<div
					ref={contentSquareRef}
					className="page-park__about-content-square animate__animated uk-hidden@m"
					style={{
						backgroundColor: park.theme.secondary
					}}
					style={{
						background: gradient
					}}
				></div>
			</div>
		</Fragment>
	);
};
