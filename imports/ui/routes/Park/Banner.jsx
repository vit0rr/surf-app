import React, { Fragment } from 'react';

export const Banner = function ({ park }) {
	return (
		<Fragment>
			<div
				className="page-park__banner-overlay"
				style={{ backgroundColor: park.theme.secondary }}
			></div>
			<img className="page-park__banner-image" src={park.image} />
			<div className="page-park__banner-content">
				<img src={park.logo} alt={park.name} />
				<h1 className="uk-h2 uk-text-bolder uk-text-uppercase">{park.name}</h1>
				<a
					href={park.url}
					target="_black"
					title={park.name}
					className="uk-text-bold uk-text-uppercase"
				>
					{park.url}
				</a>
				<div className="page-park__banner-social-media">
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
			</div>
		</Fragment>
	);
};
