import { faker } from '@faker-js/faker';
import { randomInt, sortBy } from '../helpers.js';

const createRecord = function (limit, minValue, maxValue) {
	let records = [];

	for (let i = 0; i < limit; i++) {
		records.push({
			image: faker.image.people(640, 640, true),
			name: faker.person.fullName(),
			value: randomInt(minValue, maxValue, true)
		});
	}

	records = sortBy(records, 'value', true);

	return records;
};

export const leaderboard = {
	aerial: {
		name: 'Aerial',
		measurement: 'feet',
		'measurement-abbr': 'ft',
		icon: '',
		description:
			'Launch above the wake that is 3 feet or greater. Aerial height must be confirmed by park staff.',
		reward: null,
		header: { name: 'Rider', image: true, value: 'Feet' },
		image: './aerial.png',
		records: createRecord(5, 3, 6)
	},
	'best-lap': {
		name: 'Best Lap',
		measurement: 'seconds',
		'measurement-abbr': 'sec',
		icon: '',
		description:
			'Fastest lap from start point to end point marked on the inside of the wave pool. Laps must be recored by park staff.',
		reward: null,
		header: { name: 'Rider', image: true, value: 'Seconds' },
		image: './best-trick.png',
		records: createRecord(5, 71, 91)
	},
	'hours-logged': {
		name: 'Hours Logged',
		measurement: 'hours',
		'measurement-abbr': 'hrs',
		icon: '',
		description:
			'Total number of hours logged in the wave park greater than 100 hours. Riders check in and out at the front desk to record time.',
		Reward: 'Rider with the most accumalitive hours gets free admission each month.',
		header: { name: 'Rider', image: true, value: 'Hours' },
		image: './aerial.png',
		records: createRecord(5, 120, 300)
	}
};
