import React from 'react';
import { handleize } from '../../../client/scripts/helpers.js';

export const Tabs = function ({ tabs = [] }) {
	return (
		<div>
			<ul className="tabs uk-tab">
				<li className="uk-box-shadow-small uk-active" uk-filter-control=".tag-all">
					<a>All</a>
				</li>
				{tabs.map((tab, index) => {
					return (
						<li
							key={index}
							className="uk-box-shadow-small"
							uk-filter-control={`.tag-${handleize(tab.title)}`}
						>
							<a>{tab.title}</a>
						</li>
					);
				})}
			</ul>
		</div>
	);
};
