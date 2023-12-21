import React, { useEffect } from 'react';

export const Footer = () => {
	return (
		<footer>
			<div className="uk-container uk-padding-large">
				<div className="uk-child-width-expand@s uk-grid" uk-grid="true">
					<div>
						<ul className="uk-list">
							<li>
								<a href="/">Products & Company</a>
							</li>
							<li>
								<a href="/">Media</a>
							</li>
						</ul>
					</div>
					<div>
						<ul className="uk-list">
							<li>
								<a href="/">Terms of Use</a>
							</li>
							<li>
								<a href="/">Privacy Policy</a>
							</li>
							<li>
								<a href="/">Cookies</a>
							</li>
						</ul>
					</div>
					<div>
						<li className="uk-text-right@l">
							<span>© {new Date().getFullYear()} Local Legends</span>
						</li>
					</div>
				</div>
			</div>
		</footer>
	);
};
