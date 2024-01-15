import { leaderboard } from './leaderboard.js';

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
	leaderboard: leaderboard,
	amenities: [
		{
			id: 'grill',
			name: 'Grill',
			description: 'Burgers, Burritos, Kebabs and more',
			image:
				'https://cdn.choosechicago.com/uploads/2019/06/aucheval1_7ad98887-11be-4c0a-aaba-fd3401c8a1bb.jpg',
			icon: './burger.png'
		},
		{
			id: 'cold-bar',
			name: 'Cold Bar',
			description: 'Salads, Sandwiches, and Smoothies',
			image:
				'https://www.getserveware.com/wp-content/uploads/2022/09/bugambilia-outdoor-poolside-cold-bar-salad-buffet-display.jpg',
			icon: './salad.png'
		},
		{
			id: 'cafe',
			name: 'Cafe',
			description: 'Baked Goods and Coffee options',
			image:
				'https://media.cntraveler.com/photos/5b9041bdf43e7d37b8df83e0/16:9/w_2560,c_limit/Backstreet%20Cafe_2018_Solarium_2064.JPG',
			icon: './coffee.png'
		},
		{
			id: 'ice-cream',
			name: 'Ice Cream',
			description: 'Desserts, Shakes, and Cones',
			image:
				'https://www.inquirer.com/resizer/VrOtqRQmqOGi2aZU3f8cK_K3EM8=/760x507/smart/filters:format(webp)/cloudfront-us-east-1.images.arcpublishing.com/pmn/6VS3Z2KJC5EERAWB2N3NOOX3GE.jpg',
			icon: './ice-cream.png'
		},
		{
			id: 'bar',
			name: 'Bar',
			description:
				'Our name, Barreled, is the bridge between surf culture and Yakima.  It’s not only the pinnacle maneuver in surfing, it’s also a tip of the cap to Yakima’s distinguished craft beverage industry, which uses barrels for aging and measuring.',
			image:
				'https://images.squarespace-cdn.com/content/v1/5f7a25adebb0954c5ed99fa6/1619790637949-6W4XNSZUSXI8BMGN48YC/120946727_3461739960580141_1519337992975036759_n.jpg',
			icon: './wine.png'
		},
		{
			id: 'lodging',
			name: 'Lodging',
			image: './barreled-3.jpeg',
			icon: './lodging.png',
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
