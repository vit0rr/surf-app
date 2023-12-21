import React from 'react';

export const ImageGrid = function ({ title, items = [] }) {
	return (
		<section className="image-grid">
			{items && items.length && (
				<div className="uk-container uk-padding">
					{title && <h3 className="image-grid__title uk-text-bold">{title}</h3>}
					<div className="uk-child-width-expand@s uk-grid" uk-grid="true">
						{items.map((item, index) => {
							return (
								<div key={index} className={index == 0 ? 'uk-first-column' : ''}>
									<div className="uk-card uk-card-default uk-card-body">
										<div>
											<img src={item.image} />
										</div>
										<div className="uk-padding">
											<h3>{item.title}</h3>
											<p>{item.description}</p>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}
		</section>
	);
};
