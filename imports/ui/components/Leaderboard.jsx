import React, { Fragment, useState, useEffect, useRef } from 'react';
import {
	classObserver,
	getCSSVariable,
	asyncTimeout,
	intersectionObserver
} from '../../../client/scripts/helpers.js';

let updating = false;
export const Leaderboard = function ({ leaderboards, park }) {
	const imageSquareRef = useRef(null);
	const gradient = `repeating-linear-gradient(
		45deg,
		${park.theme.primary},
		${park.theme.primary} 5px,
		${park.theme.secondary} 5px,
		${park.theme.secondary} 10px
	)`;

	const [category, setCategory] = useState(null);

	const setSlideIndex = function (next = true) {
		const slider = UIkit.slideshow('.leaderboard__categories-slider');

		if (!slider) return;

		if (next) {
			slider.show('next');
			return;
		}

		slider.show('prev');
	};

	const setSliderHeight = async function () {
		await asyncTimeout(500);

		const container = document.querySelector('.uk-slideshow-items');
		const active = container.querySelector('.uk-active');
		const bounds = active.getBoundingClientRect();

		container.style.height = bounds.height + 'px';
	};

	useEffect(() => {
		const delay = parseInt(getCSSVariable('--animate-delay'));
		const categoryEl = document.querySelector('[data-leaderboard-category]');

		if (!category && leaderboards) {
			const keys = Object.keys(leaderboards);
			setCategory(leaderboards[keys[0]]);
			setSliderHeight();
		}

		const ImageSquare = imageSquareRef.current;
		intersectionObserver(
			ImageSquare,
			(event) => {
				if (event[0].isIntersecting) ImageSquare.classList.add('animate__fadeInRight');
			},
			{ threshold: 0.75 }
		);

		UIkit.util.on('.leaderboard__categories-slider', 'itemshow', async function (slide) {
			const id = slide.target.getAttribute('data-leaderboard-category');
			const leaderboard = leaderboards[id];

			categoryEl.classList.add('animate__fadeOutLeft');

			await asyncTimeout(delay);

			setCategory(leaderboard);

			categoryEl.classList.remove('animate__fadeOutLeft');
			categoryEl.classList.add('animate__fadeInRight');

			await asyncTimeout(delay);

			categoryEl.classList.remove('animate__fadeInRight');

			setSliderHeight();
		});
	}, [category]);

	if (!category) return <Fragment />;

	return (
		<div className="leaderboard">
			<div className="leaderboard-title">
				<div className="leaderboard-title__left">
					<div
						className="leaderboard-title__top"
						style={{
							backgroundColor: park.theme.primary
						}}
					/>
					<div
						className="leaderboard-title__bottom"
						style={{
							backgroundColor: park.theme.primary
						}}
					/>
				</div>
				<div className="leaderboard-title__right">
					<div
						className="leaderboard-title__top"
						style={{
							backgroundColor: park.theme.primary
						}}
					/>
					<div
						className="leaderboard-title__bottom"
						style={{
							backgroundColor: park.theme.primary
						}}
					/>
				</div>
				<h3
					className="uk-text-uppercase uk-text-bolder uk-h1"
					style={{
						color: park.theme.primary
					}}
				>
					Leaderboard
					<span
						data-leaderboard-category={category.name}
						className="leaderboard__category animate__animated"
					>
						{category.name}
					</span>
				</h3>
			</div>
			<div
				className="leaderboard__categories"
				style={{
					borderColor: park.theme.primary
				}}
			>
				<div className="leaderboard__categories-description">
					<p
						className="uk-text-uppercase uk-text-light"
						style={{
							color: park.theme.primary
						}}
					>
						{category.description}
					</p>
				</div>
				<div className="leaderboard__categories-nav">
					<button uk-icon="icon: triangle-left" onClick={() => setSlideIndex(false)}></button>
					<button uk-icon="icon: triangle-right" onClick={() => setSlideIndex(true)}></button>
				</div>
				<div
					className="leaderboard__categories-slider uk-visible-toggle uk-light"
					tabIndex="-1"
					uk-slideshow="ratio: false"
				>
					<ul className="uk-slideshow-items">
						{Object.keys(leaderboards).map((key) => {
							const leaderboard = leaderboards[key];

							return (
								<li
									key={'record-' + key}
									data-leaderboard-category={key}
									className="leaderboard__records"
								>
									<p className="leaderboard__record leaderboard__record--header uk-text-uppercase uk-text-bold">
										{Object.keys(leaderboard.header).map((header, index) => {
											const width = 100 / Object.keys(leaderboard.header);
											const label = leaderboard.header[header];
											const Place = (
												<span
													key="place"
													className={`leaderboard__record-place leaderboard__record-header`}
													style={{
														width: width + '%'
													}}
												>
													Place
												</span>
											);

											const Cell = (
												<span
													key={header}
													className={`leaderboard__record-${header} leaderboard__record-header`}
													style={{
														width: width + '%'
													}}
												>
													{label}
												</span>
											);

											if (header !== 'image') {
												if (index == 0) {
													return (
														<Fragment key={header}>
															{Place}
															{Cell}
														</Fragment>
													);
												}

												return Cell;
											}
										})}
									</p>
									{leaderboard.records.map((record, index) => {
										const keys = Object.keys(record);
										const width = 100 / (keys.length + 1);

										return (
											<p
												key={index}
												className="leaderboard__record leaderboard__record--cell uk-text-bold uk-text-uppercase"
											>
												<span
													className="leaderboard__record-place"
													style={{
														width: width + '%',
														color: park.theme.primary
													}}
												>
													{index + 1}
												</span>
												{keys.map((key) => {
													const header = leaderboard.header[key];
													const value = record[key];

													if (leaderboard.header[key] && key == 'name') {
														return (
															<span
																key={key}
																className={`leaderboard__record-${key}`}
																style={{
																	width: width + '%'
																}}
															>
																{record.image && <img src={record.image} />}
																{value}
															</span>
														);
													}

													if (leaderboard.header[key] && key != 'image' && key != 'name') {
														return (
															<span
																key={'cell-item' + key}
																className={`leaderboard__record-${key}`}
																style={{
																	width: width + '%'
																}}
															>
																{value}{' '}
																{key == 'value' ? (
																	<abbr className="uk-text-italic">
																		{leaderboard['measurement-abbr']}
																	</abbr>
																) : (
																	''
																)}
															</span>
														);
													}
												})}
											</p>
										);
									})}
								</li>
							);
						})}
					</ul>
				</div>
				<div
					ref={imageSquareRef}
					className="leaderboard-image-square animate__animated"
					style={{
						backgroundColor: park.theme.secondary
					}}
					style={{
						background: gradient
					}}
				></div>
			</div>
		</div>
	);
};
