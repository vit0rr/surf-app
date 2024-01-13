import React from 'react';
import data from '../../../client/scripts/data';

export const CTARegister = function () {
	return (
		<div className="cta-register">
			<img
				className="cta-register__cover animate__animated animate__delay-1s animate__fadeIn"
				src={`./${data.event.image}`}
			/>
			<div className="cta-register__info animate__animated animate__fadeInDown animate__delay-2s">
				<img src={data.event.logo} alt={data.event.title} />
				<div className="cta-register__title">
					<h5 className="uk-h6 uk-text-uppercase uk-text-bolder">{data.event.title}</h5>
					<h6 className="uk-text-uppercase">{data.event.subtitle}</h6>
				</div>
			</div>
			<div className="cta-register__cta animate__animated animate__fadeInUp animate__delay-2s">
				<h6 className="uk-text-uppercase uk-text-bolder uk-text-italic">Registration Open</h6>
				<button
					className="uk-button uk-button-secondary uk-button-large"
					style={{ backgroundColor: data.event.theme.secondary }}
				>
					Sign Up
				</button>
			</div>
		</div>
	);
};
