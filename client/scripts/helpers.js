export const asyncTimeout = function (ms) {
	console.log('Timeout for ' + ms);
	return new Promise((resolve) => setTimeout(resolve, ms));
};
