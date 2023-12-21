import React, { useRef, Fragment } from 'react';
import { Footer } from './Footer.jsx';
import { asyncTimeout } from '../../../client/scripts/helpers.js';

export const Navbar = () => {
	const active = 'mobile-nav--active';

	let ref = useRef(null);

	const toggleMenu = async function (event) {
		event.preventDefault();

		const target = ref.current;

		if (target.className.indexOf(active) > -1) {
			target.classList.remove(active);
			return;
		}

		target.classList.add(active);
	};

	return (
		<Fragment>
			<header uk-sticky="sel-target: .uk-navbar-container; cls-active: uk-navbar-sticky; end: + *;">
				<nav className="uk-navbar-container">
					<div className="uk-container">
						<div uk-navbar="uk-navbar">
							<div className="uk-navbar-left">
								<div className="icon-container">
									<a href="#" uk-icon="icon: grid" onClick={(event) => toggleMenu(event)}></a>
								</div>

								<a className="uk-navbar-item uk-logo" href="#" aria-label="Back to Home">
									<img src="logo.png" />
								</a>
							</div>

							<div className="uk-navbar-center">
								<ul className="uk-navbar-nav">
									<li>
										<a href="#">Events</a>
									</li>
									<li>
										<a href="#">Leagues</a>
									</li>
									<li>
										<a href="#">Parks</a>
									</li>
									<li>
										<a href="#">Atheletes</a>
									</li>
								</ul>
							</div>

							<div className="uk-navbar-right">
								<div className="icon-container">
									<a href="#" uk-icon="icon: search"></a>
								</div>
								<div className="icon-container">
									<a href="#" uk-icon="icon: user"></a>
								</div>
							</div>
						</div>
					</div>
				</nav>
			</header>

			{/* Mobile Menu */}
			<div className="mobile-nav" ref={ref}>
				{/* User Buttons */}
				<div className="uk-container">
					<div uk-navbar="uk-navbar">
						<div className="uk-navbar-left">
							<div className="icon-container">
								<a
									className="icon-close"
									href="#"
									uk-icon="icon: close"
									onClick={(event) => toggleMenu(event)}
								></a>
							</div>
							<a className="uk-navbar-item uk-logo" href="#" aria-label="Back to Home">
								<img src="logo.png" />
							</a>
						</div>

						<div className="uk-navbar-center"></div>

						<div className="uk-navbar-right">
							<div className="icon-container">
								<a className="icon-user" href="#" uk-icon="icon: user"></a>
							</div>
						</div>
					</div>
				</div>

				<div className="mobile-nav__overflow">
					{/* Search */}
					<div className="uk-container">
						<form className="uk-search uk-search-default">
							<span uk-search-icon="uk-search-icon"></span>
							<input
								className="uk-search-input"
								type="search"
								placeholder="Search the Nation for events"
								aria-label="Search the Nation for events"
							/>
						</form>
					</div>

					<div className="uk-container uk-padding-small">
						<nav uk-grid="uk-grid">
							{/* Nav Items */}
							<div className="uk-width-1-1 uk-width-1-3@m">
								<ul className="uk-nav">
									<li className="uk-active">
										<a className="uk-text-large" href="/">
											Home
										</a>
									</li>
									<li>
										<a className="uk-text-large" href="">
											Events
										</a>
									</li>
									<li>
										<a className="uk-text-large" href="">
											Parks
										</a>
									</li>
									<li>
										<a className="uk-text-large" href="">
											Atheletes
										</a>
									</li>
								</ul>
							</div>

							{/* Browser By */}
							<div className="browse-by uk-width-1-1 uk-width-2-3@m">
								<h3 className="uk-text-bold">Browse Nearby Events</h3>
								<div
									className="uk-position-relative uk-visible-toggle uk-light"
									tabIndex="-1"
									uk-slider="uk-slider"
								>
									<ul className="uk-slider-items uk-child-width-1-2 uk-child-width-1-3@s uk-child-width-1-4@m">
										<li>
											<img src="red-bull-magnitude.png" alt="" />
											<div className="uk-position-center uk-panel">
												<h6>Red Bull Magnitude</h6>
											</div>
										</li>
										<li>
											<img src="foam-wreckers.png" alt="" />
											<div className="uk-position-center uk-panel">
												<h6>Red Bull Foam Wreckers: Cocoa Beach, Florida</h6>
											</div>
										</li>
										<li>
											<img src="tudor.png" alt="" />
											<div className="uk-position-center uk-panel">
												<h6>TUDOR Nazaré Big Wave Challenge</h6>
											</div>
										</li>
										<li>
											<img src="us-open.png" alt="" />
											<div className="uk-position-center uk-panel">
												<h6>US Open of Surfing</h6>
											</div>
										</li>
										<li>
											<img src="foam-wreckers-new-york.png" alt="" />
											<div className="uk-position-center uk-panel">
												<h6>Red Bull Foam Wreckers: Rockaway Beach, New York</h6>
											</div>
										</li>
									</ul>

									<a
										className="uk-position-center-left uk-position-small uk-hidden-hover"
										href="/"
										uk-slidenav-previous="uk-slidenav-previous"
										uk-slider-item="previous"
									></a>
									<a
										className="uk-position-center-right uk-position-small uk-hidden-hover"
										href="/"
										uk-slidenav-next="uk-slidenav-next"
										uk-slider-item="next"
									></a>
								</div>
							</div>

							<div className="browse-by uk-width-1-1 uk-width-1-1">
								<h3 className="uk-text-bold">Browse Nearby Parks</h3>
								<div
									className="uk-position-relative uk-visible-toggle uk-light"
									tabIndex="-1"
									uk-slider="uk-slider"
								>
									<ul className="uk-slider-items uk-child-width-1-2 uk-child-width-1-3@s uk-child-width-1-4@m">
										<li>
											<img src="bsr.jpeg" alt="" />
											<div className="uk-position-center uk-panel">
												<h3>BSR Surf Resort</h3>
											</div>
										</li>
										<li>
											<img src="surf-lakes.jpeg" alt="" />
											<div className="uk-position-center uk-panel">
												<h3>Surf Lakes</h3>
											</div>
										</li>
										<li>
											<img src="art-wave.jpeg" alt="" />
											<div className="uk-position-center uk-panel">
												<h3>Artwave Surf </h3>
											</div>
										</li>
										<li>
											<img src="unit.jpeg" alt="" />
											<div className="uk-position-center uk-panel">
												<h3>UNIT Surf Poo</h3>
											</div>
										</li>
									</ul>

									<a
										className="uk-position-center-left uk-position-small uk-hidden-hover"
										href="/"
										uk-slidenav-previous="uk-slidenav-previous"
										uk-slider-item="previous"
									></a>
									<a
										className="uk-position-center-right uk-position-small uk-hidden-hover"
										href="/"
										uk-slidenav-next="uk-slidenav-next"
										uk-slider-item="next"
									></a>
								</div>
							</div>
						</nav>
					</div>

					<Footer />
				</div>
			</div>
		</Fragment>
	);
};
