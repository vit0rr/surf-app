export const asyncTimeout = function (ms) {
	console.log('Timeout for ' + ms);
	return new Promise((resolve) => setTimeout(resolve, ms));
};

export const handleize = function (str) {
	return str
		.toLowerCase()
		.replace(/[^\w\u00C0-\u024f]+/g, '-')
		.replace(/^-+|-+$/g, '');
};
