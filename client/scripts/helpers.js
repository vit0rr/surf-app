export const asyncTimeout = function (ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
};

export const getCSSVariable = function (variable) {
	if (!window) return;

	return getComputedStyle(document.body).getPropertyValue(variable);
};

export const handleize = function (str) {
	return str
		.toLowerCase()
		.replace(/[^\w\u00C0-\u024f]+/g, '-')
		.replace(/^-+|-+$/g, '');
};

export const randomInt = function (min, max, wholenum) {
	if (wholenum) Math.floor(Math.random() * (max - min + 1) + min);
	return Math.random() * (max - min + 1) + min;
};

export const sortBy = function (arr, key, reverse) {
	return arr.sort((a, b) => {
		const A = a[key];
		const B = b[key];

		if (reverse) {
			if (A > B) {
				return -1;
			}
			if (A < B) {
				return 1;
			}
		} else {
			if (A < B) {
				return -1;
			}
			if (A > B) {
				return 1;
			}
		}

		return 0;
	});
};

export const transition = {
	event: async (data) => {
		const image = document.querySelector(`[data-image="${data.id}"]`);
		const bounds = image.getBoundingClientRect();

		const _image = document.createElement('img');
		_image.src = './' + data.image;
		_image.style.padding = '15px';
		_image.style.width = bounds.width + 'px';
		_image.style.height = bounds.height + 'px';
		_image.style.top = bounds.y + 'px';
		_image.style.left = bounds.x + 'px';
		_image.style.padding = '0px';
		_image.classList.add('transition--event');

		document.body.append(_image);

		await asyncTimeout(250);

		_image.style.width = '100vw';
		_image.style.height = '100vh';
		_image.style.top = '0';
		_image.style.left = '0';
		_image.style.filter = 'grayscale(1)';

		await asyncTimeout(250);

		return async () => {
			window.scrollTo(0, 0);

			_image.style.opacity = '0.25';

			await asyncTimeout(350);

			_image.remove();
		};
	}
};
