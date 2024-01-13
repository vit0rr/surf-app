import React, { Fragment, useRef, useEffect } from 'react';
import { intersectionObserver } from '../../../../client/scripts/helpers.js';

export const Amenities = function ({ park }) {
	//const imageRef = useRef(null);
	// const formatDescription = (str) {
	// 	let descripition = <span>;

	useEffect(() => {
		// const image = imageRef.current;
		// intersectionObserver(
		// 	image,
		// 	(event) => {
		// 		if (event[0].isIntersecting) image.classList.add('animate__fadeInLeft');
		// 	},
		// 	{ threshold: 0.75 }
		// );
	}, []);
	return (
		<div
			className="page-park__amenities"
			style={{
				backgroundColor: park.theme.secondary
			}}
		>
			<div className="page-park__amenities-title">
				<h3 className="uk-h2 uk-text-bolder uk-text-uppercase">Amenities</h3>
			</div>
			<div className="page-park__amenities-selection">
				{park.amenities.map((amenity, index) => {
					const name = amenity.name.toLowerCase();

					if (['grill', 'food', 'bbq', 'sandwich'].includes(name)) {
						return (
							<button
								key={index}
								data-amenity={index}
								style={{ backgroundColor: park.theme.primary }}
							>
								<svg height="800px" width="800px" id="Layer_1" viewBox="0 0 232.661 232.661">
									<g>
										<path
											style={{ fill: '#FFE49C' }}
											d="M116.33,7.501c-49.257,0-89.851,37.094-95.37,84.872c-0.685,5.933,3.97,11.138,9.943,11.138h170.856
		c5.973,0,10.628-5.205,9.943-11.138C206.181,44.595,165.588,7.501,116.33,7.501z"
										/>
										<path
											style={{ fill: '#CBE5C0' }}
											d="M194.319,139.664H38.341c-9.953,0-18.021-8.068-18.021-18.021v-0.113
		c0-9.952,8.068-18.021,18.021-18.021h155.978c9.952,0,18.021,8.068,18.021,18.021v0.113
		C212.34,131.596,204.272,139.664,194.319,139.664z"
										/>
										<path
											style={{ fill: '#FF7876' }}
											d="M194.319,175.818H38.341c-9.953,0-18.021-8.068-18.021-18.02v-0.113
		c0-9.952,8.068-18.02,18.021-18.02h155.978c9.952,0,18.021,8.068,18.021,18.02v0.113
		C212.34,167.75,204.272,175.818,194.319,175.818z"
										/>
										<path
											style={{ fill: '#FFE49C' }}
											d="M191.34,225.16H41.321c-11.598,0-21-9.402-21-21v-18.342c0-5.523,4.477-10,10-10H202.34
		c5.523,0,10,4.477,10,10v18.342C212.34,215.758,202.938,225.16,191.34,225.16z"
										/>
										<polygon
											style={{ fill: '#F59D00' }}
											points="154.101,165.818 124.556,139.664 183.645,139.664 	"
										/>
										<g>
											<path
												style={{ fill: '#414042' }}
												d="M219.84,121.53c0-5.985-2.076-11.49-5.538-15.847c3.852-3.964,5.427-9.181,4.849-14.172
			C213.124,39.342,168.921,0,116.33,0S19.536,39.342,13.509,91.512c-0.576,4.995,1.001,10.212,4.85,14.172
			c-3.462,4.357-5.538,9.862-5.538,15.847v0.113c0,7.028,2.856,13.401,7.467,18.02c-4.612,4.62-7.467,10.993-7.467,18.021v0.112
			c0,5.834,1.972,11.214,5.28,15.518c-3.252,3.179-5.28,7.606-5.28,12.503v18.343c0,15.715,12.785,28.5,28.5,28.5h150.02
			c15.715,0,28.5-12.785,28.5-28.5v-18.343c0-4.896-2.027-9.324-5.279-12.503c3.307-4.303,5.279-9.683,5.279-15.518v-0.112
			c0-7.028-2.856-13.401-7.467-18.021c4.612-4.62,7.467-10.993,7.467-18.02v-0.114H219.84z M204.84,121.644
			c0,5.801-4.72,10.52-10.521,10.52c-10.292,0-59.259,0-69.763,0H38.341c-5.801,0-10.521-4.72-10.521-10.52v-0.113
			c0-5.801,4.72-10.52,10.521-10.52h155.978c5.801,0,10.521,4.72,10.521,10.52V121.644z M204.84,157.685v0.112
			c0,5.801-4.72,10.52-10.521,10.52h-31.727l23.896-21.153h7.831C200.12,147.164,204.84,151.884,204.84,157.685z M27.82,157.797
			v-0.112c0-5.801,4.72-10.521,10.521-10.521h83.372l23.896,21.153H38.341C32.54,168.317,27.82,163.598,27.82,157.797z
			 M144.344,147.164h19.514l-9.757,8.637L144.344,147.164z M116.33,15c44.97,0,82.768,33.633,87.92,78.232
			c0.17,1.474-0.996,2.777-2.493,2.777c-6.111,0-164.873,0-170.855,0c-1.487,0-2.663-1.294-2.493-2.777
			C33.563,48.633,71.36,15,116.33,15z M204.84,204.16c0,7.444-6.056,13.5-13.5,13.5H41.32c-7.444,0-13.5-6.056-13.5-13.5v-18.343
			c0-1.379,1.122-2.5,2.5-2.5c11.006,0,166.415,0,172.02,0c1.378,0,2.5,1.121,2.5,2.5V204.16z"
											/>
											<circle style={{ fill: '#414042' }} cx="103.974" cy="41.215" r="5" />
											<circle style={{ fill: '#414042' }} cx="81.02" cy="55.28" r="5" />
											<circle style={{ fill: '#414042' }} cx="128.687" cy="41.215" r="5" />
											<circle style={{ fill: '#414042' }} cx="151.64" cy="55.28" r="5" />
										</g>
									</g>
								</svg>
								<span>{amenity.name}</span>
							</button>
						);
					}

					if (['cold bar', 'salad', 'salad bar'].includes(name)) {
						return (
							<button
								key={index}
								data-amenity={index}
								style={{ backgroundColor: park.theme.primary }}
							>
								<svg height="800px" width="800px" id="Layer_1" viewBox="0 0 511.988 511.988">
									<path
										style={{ fill: '#8CC153' }}
										d="M317.101,36.099c-14.53-17.812-37.342,28.453-69.67,24.297
	c-32.327-4.172-25.187-52.843-101.779-2.266c-57.779,38.171-2.734,66.732-15.187,71.076c-12.438,4.328-72.186,0.578-73.779,45.749
	c-1.609,45.171,117.638,123.692,117.638,123.692l112.45-45.553C286.774,253.094,331.633,53.896,317.101,36.099z"
									/>
									<path
										style={{ fill: '#A0D468' }}
										d="M511.488,136.175c-8.891-39.999-71.107-17.953-84.889-17.953c-13.766,0,39.561-42.827-27.297-58.967
	c-88.607-21.422-73.326,19.999-106.668,33.843c-33.327,13.843-64.687-20.515-77.139,0c-12.438,20.515,66.483,185.127,66.483,185.127
	l125.512,5.672C407.49,283.897,520.379,176.19,511.488,136.175z"
									/>
									<path
										style={{ fill: '#FFCE54' }}
										d="M191.995,223.986c0-35.343,28.656-63.999,63.999-63.999s63.998,28.656,63.998,63.999
	c0,35.358-28.655,64.005-63.998,64.005S191.995,259.344,191.995,223.986z"
									/>
									<path
										style={{ fill: '#434A54' }}
										d="M410.459,152.268c-3.094,5.015-9.672,6.562-14.688,3.453c-5-3.093-6.547-9.671-3.453-14.687
	c3.109-5,9.672-6.547,14.688-3.453C412.006,140.691,413.568,147.253,410.459,152.268z"
									/>
									<path
										style={{ fill: '#FC6E51' }}
										d="M418.678,220.064c-15.5,25.046-48.358,32.796-73.42,17.296
	c-25.047-15.499-32.781-48.374-17.281-73.42s48.374-32.78,73.42-17.281C426.443,162.159,434.178,195.017,418.678,220.064z"
									/>
									<path
										style={{ fill: '#ED5564' }}
										d="M74.81,241.641c51.046,29.389,116.263,11.828,145.653-39.233L35.577,95.989
	C6.187,147.05,23.749,212.267,74.81,241.641z"
									/>
									<path
										style={{ fill: '#DA4453' }}
										d="M101.419,195.424c25.516,14.703,58.124,5.906,72.827-19.609l-92.451-53.218
	C67.107,148.128,75.889,180.737,101.419,195.424z"
									/>
									<path
										style={{ fill: '#AC92EB' }}
										d="M0,202.658v42.671c0,94.849,51.577,177.627,128.216,221.862c-0.141,0.688-0.219,1.406-0.219,2.141
	c0,5.891,4.781,10.656,10.672,10.656h14.858h204.949h14.858c5.891,0,10.655-4.766,10.655-10.656c0-0.734-0.078-1.453-0.203-2.141
	c76.624-44.234,128.201-127.013,128.201-221.862v-42.671L0,202.658L0,202.658z"
									/>
									<path
										style={{ fill: '#967ADC' }}
										d="M0,223.986v21.343h31.999c0,5.891,4.781,10.656,10.672,10.656s10.672-4.766,10.672-10.656H74.67
	c0,5.891,4.781,10.656,10.672,10.656s10.656-4.766,10.656-10.656h21.343c0,5.891,4.766,10.656,10.656,10.656
	c5.89,0,10.672-4.766,10.672-10.656h21.327c0,5.891,4.781,10.656,10.672,10.656s10.672-4.766,10.672-10.656h21.327
	c0,5.891,4.781,10.656,10.672,10.656s10.655-4.766,10.655-10.657h21.344c0,5.891,4.766,10.656,10.656,10.656
	s10.672-4.766,10.672-10.656h21.327c0,5.891,4.781,10.656,10.672,10.656c5.89,0,10.671-4.766,10.671-10.656h21.328
	c0,5.891,4.781,10.656,10.672,10.656s10.656-4.766,10.656-10.656h21.343c0,5.891,4.766,10.656,10.655,10.656
	c5.891,0,10.672-4.766,10.672-10.656h21.328c0,5.891,4.781,10.656,10.672,10.656s10.672-4.766,10.672-10.656h21.327
	c0,5.891,4.781,10.656,10.671,10.656c5.891,0,10.656-4.766,10.656-10.656h32v-21.343H0V223.986z"
									/>
								</svg>
								<span>{amenity.name}</span>
							</button>
						);
					}

					if (['cafe', 'coffee'].includes(name)) {
						return (
							<button
								key={index}
								data-amenity={index}
								style={{ backgroundColor: park.theme.primary }}
							>
								<svg width="800px" height="800px" viewBox="0 0 1024 1024" className="icon">
									<path
										d="M294.613731 1002.666458a21.333329 21.333329 0 0 1-21.333329-19.839996L215.040414 224.853286h593.919877L750.720303 982.826462a21.333329 21.333329 0 0 1-21.333329 19.839996z"
										fill="#F05071"
									/>
									<path
										d="M785.920295 246.186615L729.386974 981.333129H294.613731L238.080409 246.186615h547.839886m46.079991-42.666657h-639.999867l60.159988 781.01317a42.666658 42.666658 0 0 0 42.666657 39.466659H729.386974a42.666658 42.666658 0 0 0 42.666658-39.466659l59.946654-781.01317z"
										fill="#5C2D51"
									/>
									<path
										d="M215.680414 182.186629l14.719997-144.63997A18.13333 18.13333 0 0 1 248.533741 21.333329h526.933223a18.13333 18.13333 0 0 1 18.13333 16.21333l14.719997 144.63997z"
										fill="#F05071"
									/>
									<path
										d="M772.693631 42.666658l12.159998 118.186642H239.360409L251.307073 42.666658h521.386558m2.773333-42.666658H248.533741a39.466658 39.466658 0 0 0-39.253326 35.413326l-17.279996 168.106632h639.999867l-17.279997-168.106632A39.466658 39.466658 0 0 0 775.466964 0z"
										fill="#5C2D51"
									/>
									<path
										d="M176.853756 129.70664l670.293193 0 0 119.039975-670.293193 0 0-119.039975Z"
										fill="#FDCA89"
									/>
									<path
										d="M825.81362 151.039969v76.373317H198.187084V151.039969h627.626536m13.866664-42.666658H184.320421A28.799994 28.799994 0 0 0 155.520427 137.386638v104.106645a28.799994 28.799994 0 0 0 28.799994 28.799994h655.359863a28.799994 28.799994 0 0 0 28.799994-28.799994V137.386638a28.799994 28.799994 0 0 0-28.799994-28.799994z"
										fill="#5C2D51"
									/>
									<path
										d="M264.533737 868.053152L226.347079 370.773256h571.519881l-38.399992 497.279896H264.533737z"
										fill="#FDCA89"
									/>
									<path
										d="M774.186964 392.106585l-34.346659 454.613239H283.5204L249.387074 392.106585H774.186964m46.079991-42.666658H203.307083l41.386658 539.946554h534.613222l41.599992-539.946554z"
										fill="#5C2D51"
									/>
								</svg>
								<span>{amenity.name}</span>
							</button>
						);
					}

					if (['desert', 'beer', 'ice cream'].includes(name)) {
					}

					if (['bar', 'beer', 'wine', 'whiskey', 'liquor'].includes(name)) {
						return (
							<button
								key={index}
								data-amenity={index}
								style={{ backgroundColor: park.theme.primary }}
							>
								<svg width="800px" height="800px" viewBox="0 0 1024 1024" className="icon">
									<path
										d="M239.616 247.808s28.672-73.728 75.776-75.776c47.104 0 73.728-86.016 108.544-90.112s94.208-8.192 94.208-8.192 59.392-63.488 112.64-43.008S737.28 83.968 737.28 106.496s40.96 2.048 40.96 2.048 75.776 34.816 77.824 86.016 0 92.16 0 92.16v284.672h-614.4l-2.048-323.584z"
										fill="#FFFFFF"
									/>
									<path d="M260.096 909.312h589.824v83.968H260.096z" fill="#4961A4" />
									<path
										d="M839.68 921.6H253.952V262.144h116.736V491.52l67.584 8.192 14.336-163.84 61.44-22.528 10.24-51.2H839.68z"
										fill="#F5BF1F"
									/>
									<path
										d="M585.728 428.032m-34.816 0a34.816 34.816 0 1 0 69.632 0 34.816 34.816 0 1 0-69.632 0Z"
										fill="#FFFFFF"
									/>
									<path
										d="M743.424 83.968C716.8 34.816 667.648 4.096 614.4 4.096c-45.056 0-88.064 22.528-116.736 59.392-12.288-4.096-26.624-6.144-40.96-6.144-55.296 0-104.448 32.768-126.976 86.016H327.68c-57.344 0-102.4 47.104-102.4 106.496v163.84H182.272c-45.056 0-81.92 36.864-81.92 81.92v204.8c0 45.056 36.864 81.92 81.92 81.92H225.28v153.6c0 47.104 38.912 86.016 86.016 86.016h481.28c47.104 0 86.016-38.912 86.016-86.016V221.184C880.64 143.36 819.2 79.872 743.424 83.968zM223.232 741.376h-40.96c-22.528 0-40.96-18.432-40.96-40.96v-204.8c0-22.528 18.432-40.96 40.96-40.96h40.96v286.72zM327.68 184.32c4.096 0 8.192 0 10.24 2.048l18.432 4.096 6.144-18.432c14.336-43.008 51.2-71.68 94.208-71.68 14.336 0 26.624 2.048 40.96 8.192h2.048c16.384 8.192 32.768 22.528 40.96 38.912 4.096 8.192 14.336 12.288 24.576 10.24 12.288-4.096 18.432-18.432 12.288-28.672-10.24-18.432-24.576-32.768-40.96-43.008 20.48-24.576 49.152-38.912 79.872-38.912 43.008 0 81.92 26.624 98.304 69.632l6.144 16.384 16.384-4.096c6.144 0 10.24-2.048 14.336-2.048 49.152 0 88.064 43.008 88.064 96.256v8.192H530.432c-12.288 0-20.48 8.192-20.48 20.48v40.96c0 8.192-6.144 14.336-14.336 14.336-30.72 0-55.296 24.576-55.296 55.296v114.688c0 8.192-6.144 14.336-14.336 14.336h-4.096c-8.192 0-14.336-6.144-14.336-14.336v-225.28c0-12.288-8.192-20.48-20.48-20.48h-118.784C278.528 202.752 301.056 184.32 327.68 184.32z m466.944 796.672H313.344c-24.576 0-45.056-20.48-45.056-45.056V921.6h573.44v14.336c-2.048 24.576-22.528 45.056-47.104 45.056zM839.68 880.64H266.24V270.336h100.352v204.8c0 30.72 24.576 55.296 55.296 55.296h4.096c30.72 0 55.296-24.576 55.296-55.296v-114.688c0-8.192 6.144-14.336 14.336-14.336 30.72 0 55.296-24.576 55.296-55.296v-20.48H839.68V880.64z"
										fill="#3F4651"
									/>
									<path
										d="M524.288 430.08c0 34.816 26.624 61.44 61.44 61.44s61.44-26.624 61.44-61.44-26.624-61.44-61.44-61.44-61.44 26.624-61.44 61.44z m61.44-20.48c12.288 0 20.48 8.192 20.48 20.48s-8.192 20.48-20.48 20.48-20.48-8.192-20.48-20.48 8.192-20.48 20.48-20.48z"
										fill="#3F4651"
									/>
								</svg>
								<span>{amenity.name}</span>
							</button>
						);
					}

					if (['hotel', 'motel', 'lodging'].includes(name)) {
						return (
							<button
								key={index}
								data-amenity={index}
								style={{ backgroundColor: park.theme.primary }}
							>
								<svg id="Capa_1" viewBox="0 0 298 298">
									<g>
										<path
											style={{ fill: '#B4EBDD' }}
											d="M16,247.957h266v-48.598c-1,0.112-0.504,0.226-0.772,0.347c-3.445,1.561-7.735,3.502-15.317,3.502
		c-7.785,0-12.162-2.242-15.358-3.88c-2.581-1.322-4.138-2.12-8.064-2.12c-3.925,0-5.648,0.798-8.227,2.12
		c-0.644,0.33-1.262,0.684-2.262,1.039v25.59c0,4.418-3.249,8-7.667,8h-32c-4.418,0-8.333-3.582-8.333-8v-25.069
		c-2,1.137-6,2.163-11,2.301v22.769c0,4.418-3.249,8-7.667,8h-32c-4.418,0-8.333-3.582-8.333-8v-22.75c-5-0.01-9-1.097-12-2.308
		v25.058c0,4.418-3.249,8-7.667,8h-32c-4.418,0-8.333-3.582-8.333-8v-25.581c0-0.359-1.299-0.717-1.948-1.049
		c-2.579-1.321-4.052-2.119-7.975-2.119c-3.922,0-5.437,0.798-8.015,2.119c-3.195,1.638-7.55,3.881-15.335,3.881
		c-7.687,0-12.078-1.968-15.348-3.549c-0.019-0.01-0.38-0.018-0.38-0.028V247.957z"
										/>
										<path
											d="M296.605,185.195c-1.434-2.149-3.88-3.567-6.658-3.567c-7.582,0-11.87,1.941-15.317,3.502
		c-2.764,1.251-4.591,2.078-8.719,2.078c-3.926,0-5.482-0.798-8.063-2.12c-3.195-1.638-7.74-3.88-15.526-3.88
		c-4.302,0-7.322,0.686-10.322,1.575v-4.826V99.699l8.217-0.012c3.312-0.004,6.363-2.117,7.546-5.211
		c0.296-0.774,0.506-1.573,0.555-2.372c0.146-2.395-0.77-4.779-2.619-6.44L154.335,3.583c-0.023-0.02-0.044-0.035-0.066-0.055
		l-0.473-0.428c-3.062-2.751-7.711-2.72-10.748,0.06L52.681,85.952c-2.435,2.229-3.249,5.761-2.051,8.837
		c1.197,3.074,4.158,5.168,7.455,5.168c0.003,0,0.006,0,0.009,0L65,99.946v78.011v4.832c-2-0.892-5.695-1.581-10.006-1.581
		c-7.784,0-12.077,2.243-15.272,3.881c-2.578,1.321-4.093,2.119-8.015,2.119c-4.021,0-5.519-0.735-8.036-1.952
		c-3.269-1.582-7.66-3.55-15.347-3.55c-4.418,0-8.323,3.582-8.323,8v66.251v16v17c0,4.418,4.248,8,8.666,8H290c4.418,0,8-3.582,8-8
		v-17v-16v-66.251C298,188.032,297.484,186.48,296.605,185.195z M157,27.475l62.523,56.165L157,83.708V27.475z M141,83.726
		l-62.313,0.068L141,26.719V83.726z M216,99.723v82.234H81V99.923L216,99.723z M216,217.957h-16v-20h16V217.957z M141,197.957h16v20
		h-16V197.957z M81,197.957h16v20H81V197.957z M31.748,203.208c7.784,0,12.16-2.243,15.355-3.881
		c2.578-1.321,4.135-2.119,8.057-2.119c3.923,0,5.313,0.798,7.892,2.119c0.648,0.332,1.948,0.689,1.948,1.049v25.581
		c0,4.418,3.915,8,8.333,8h32c4.418,0,7.667-3.582,7.667-8v-25.058c3,1.211,7,2.298,12,2.308v22.75c0,4.418,3.915,8,8.333,8h32
		c4.418,0,7.667-3.582,7.667-8v-22.769c5-0.138,9-1.164,11-2.301v25.069c0,4.418,3.915,8,8.333,8h32c4.418,0,7.667-3.582,7.667-8
		v-25.59c1-0.355,1.618-0.709,2.261-1.039c2.579-1.322,4.22-2.12,8.145-2.12c3.926,0,5.524,0.798,8.105,2.12
		c3.195,1.638,7.594,3.88,15.379,3.88c7.582,0,11.882-1.941,15.327-3.502c0.268-0.121-0.218-0.234,0.782-0.347v48.598H16v-48.326
		c0,0.01,0.371,0.019,0.39,0.028C19.66,201.24,24.061,203.208,31.748,203.208z M16,280.957v-17h266v17H16z"
										/>
										<rect x="81" y="197.957" style={{ fill: '#FF8500' }} width="16" height="20" />
										<rect x="141" y="197.957" style={{ fill: '#FF8500' }} width="16" height="20" />
										<rect x="200" y="197.957" style={{ fill: '#FF8500' }} width="16" height="20" />
										<rect x="16" y="263.957" style={{ fill: '#FFB929' }} width="266" height="17" />
										<path
											style={{ fill: '#FFD5B0' }}
											d="M81,181.957h135V99.723l-135,0.2V181.957z M172,155.957c0,4.418-3.582,8-8,8h-32
		c-4.418,0-8-3.582-8-8v-32c0-4.418,3.582-8,8-8h32c4.418,0,8,3.582,8,8V155.957z"
										/>
										<polygon
											style={{ fill: '#FF8500' }}
											points="78.687,83.794 141,83.726 141,26.719 	"
										/>
										<polygon
											style={{ fill: '#FFB929' }}
											points="157,27.475 157,83.708 219.523,83.64 	"
										/>
										<rect x="140" y="131.957" style={{ fill: '#FFFFFF' }} width="16" height="16" />
										<path
											d="M172,123.957c0-4.418-3.582-8-8-8h-32c-4.418,0-8,3.582-8,8v32c0,4.418,3.582,8,8,8h32c4.418,0,8-3.582,8-8V123.957z
		 M140,131.957h16v16h-16V131.957z"
										/>
										<path
											style={{ fill: '#FFB929' }}
											d="M24.666,33.043c4.411,0,8-3.589,8-8c0-4.411-3.589-8-8-8c-4.411,0-8,3.589-8,8
		C16.666,29.454,20.255,33.043,24.666,33.043z"
										/>
										<path
											d="M24.666,49.043c13.233,0,24-10.767,24-24s-10.767-24-24-24c-13.233,0-24,10.767-24,24S11.433,49.043,24.666,49.043z
		 M24.666,17.043c4.411,0,8,3.589,8,8c0,4.411-3.589,8-8,8c-4.411,0-8-3.589-8-8C16.666,20.632,20.255,17.043,24.666,17.043z"
										/>
									</g>
								</svg>
								<span>{amenity.name}</span>
							</button>
						);
					}
				})}
			</div>
		</div>
	);
};
