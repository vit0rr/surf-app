import React from 'react';

export const Banner = function ({ items = [] }) {
	return (
		<section className="banner uk-cover-container">
			<div uk-slideshow="animation: pull; autoplay: true; pause-on-hover: false">
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
								{!item.video && <img src={item.src} alt={item.title} />}
								<div className="banner__content uk-container">
									{item.subtitle && <h4>{item.subtitle}</h4>}
									{item.title && <h3 className="uk-text-bold">{item.title}</h3>}
									{item.description && <p>{item.description}</p>}
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
				<ul className="uk-slideshow-nav uk-dotnav"></ul>
			</div>
		</section>
	);
};
