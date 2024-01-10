import React from 'react';
import { handleize } from '../../../client/scripts/helpers.js';

export const ImageGrid = function ({
	grid = 'uk-child-width-expand@s',
	filter = false,
	fillImage = false,
	items = [],
	title = ''
}) {
	return (
		<section className="image-grid">
			{items && items.length && (
				<div className="uk-container uk-padding">
					{title && <h3 className="image-grid__title uk-text-bold">{title}</h3>}
					<div className={`uk-grid ${grid}${filter && ' js-filter'}`} uk-grid="masonry: true">
						{items.map((item, index) => {
							let className = '';
							if (index == 0) className += ' uk-first-column';
							if (fillImage) className += ' image_grid-item--fill-image';
							if (filter && item.tag) className += ' tag-all tag-' + handleize(item.tag);

							let date = null;
							if (item.date) {
								className += ' image_grid-item--date';
								date = item.date.split('-');
							}

							return (
								<a href="/" key={index} className={className}>
									<div className="uk-card uk-card-default uk-card-body">
										<div className="image-grid__item-image">
											<img src={item.image} />
										</div>
										<div className="uk-padding image-grid__item-body">
											{date && (
												<div className="image-grid__item-date">
													<div className="image-grid__item-date-day uk-text-bold uk-text-large">
														{date[1]}
													</div>
													<div className="image-grid__item-date-month-year uk-text-small">
														{date[0]} / {date[2]}
													</div>
												</div>
											)}
											<div className="image-grid__item-content">
												<h3>{item.title}</h3>
												<p>{item.description}</p>
												{item.url && (
													<button
														href={item.url}
														className="uk-button uk-button-danger uk-button-medium"
													>
														View
													</button>
												)}
											</div>
										</div>
									</div>
								</a>
							);
						})}
					</div>
				</div>
			)}
		</section>
	);
};
