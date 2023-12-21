import React from 'react';

export const Banner = function ({ items = [] }) {
	return (
		<section className="banner uk-cover-container">
			<div uk-slideshow="animation: pull">
				<ul className="uk-slideshow-items">
					{items.map((item, index) => {
						return (
							<li key={index}>
								{item.video && (
									<video
										src={item.src}
										width=""
										height=""
										uk-video="uk-video"
										uk-video="autoplay: inview"
										autoPlay="autoPlay"
										automute="true"
										loop="loop"
										playsInline={true}
									></video>
								)}
								{item.image && <div data-src={src} uk-img="loading: eager"></div>}
								<div className="banner__content uk-container">
									{item.subtitle && <h4>{item.subtitle}</h4>}
									{item.title && <h3 className="uk-text-bold">{item.title}</h3>}
									{item.buttonText && item.buttonUrl && (
										<a href={item.buttonUrl} className="uk-button uk-button-danger">
											{item.buttonText}
										</a>
									)}
								</div>
							</li>
						);
					})}
				</ul>
			</div>
		</section>
	);
};
