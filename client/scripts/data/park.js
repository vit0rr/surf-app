export default park = {
	id: 1,
	name: 'Surf Barreled',
	url: 'www.surfbarreled.com',
	social: ['https://www.instagram.com/surfbarreled/', 'https://www.facebook.com/surfbarreled/'],
	address: {
		street: 'PO Box 1107',
		state: 'WA',
		city: 'Moxess',
		zipcode: '98936'
	},
	description:
		'Barreled Surf Park aims to be a key part of the Yakima community and the broader Pacific Northwest.  Our goal is to introduce the region to surfing, providing an opportunity to access a sport once reserved for postcards and documentaries.  Surfing has a way of broadening one’s horizons and sense of adventure and we hope to be the first stepping stone while, unmistakably, knowing you’re in Yakima.  From architecture to offerings, we will show off this special valley we call home - all while learning a skill that can be used around the globe.',
	youtube: 'https://www.youtube.com/embed/NWPUGf_Po6Q?si=s6DzaeC_t7ZscNYC',
	vimeo: null,
	video: null,
	logo: 'barreled-logo.png',
	image: './barreled-1.jpeg',
	media: ['./barreled.jpeg', './barreled-1.jpeg', './barreled-2.jpeg', './barreled-3.jpeg'],
	membership: [],
	theme: { 'primary': 'var(--primary)', 'secondary': 'var(--secondary)', 'tertiary': '#f4eede' },
	amenities: [
		{
			name: 'Grill',
			description: 'Burgers, Burritos, Kebabs and more',
			image: ''
		},
		{
			name: 'Cold Bar',
			description: 'Salads, Sandwiches, and Smoothies',
			image: ''
		},
		{
			name: 'Cafe',
			description: 'Baked Goods and Coffee options',
			image: ''
		},
		{
			name: 'Ice Cream',
			description: 'Desserts, Shakes, and Cones',
			image: ''
		},
		{
			name: 'Bar',
			image:
				'Our name, Barreled, is the bridge between surf culture and Yakima.  It’s not only the pinnacle maneuver in surfing, it’s also a tip of the cap to Yakima’s distinguished craft beverage industry, which uses barrels for aging and measuring.'
		},
		{
			name: 'Lodging',
			image: '',
			description:
				'A variety of lodging options will be offered to capture the different types of travelers that visit the Yakima Valley each year. '
		}
	],
	food: [],
	events: [
		{
			title: 'Desert Barrel',
			subtitle: 'Best Trick',
			date: '07-12-2024',
			image: './barreled.jpeg'
		},
		{
			title: 'Open Park',
			subtitle: 'Free admission until 5pm',
			date: '08-02-2024',
			image: './barreled-1.jpeg'
		},
		{
			title: 'Beginner Surf Lessons',
			subtitle: 'Sign up for reservations',
			date: '09-09-2024',
			image: './barreled-2.jpeg'
		},
		{
			title: 'Camp Out',
			subtitle: 'Lodging Party',
			date: '11-31-2024',
			image: './barreled-3.jpeg'
		}
	]
};
