import React from 'react';
import { Banner } from '/imports/ui/components/Banner';
import { ImageGrid } from '/imports/ui/components/ImageGrid';

export const Home = function () {
	return (
		<main className="page-home">
			<Banner
				items={[
					{
						video: true,
						src: 'banner.mp4',
						title: (
							<span>
								Waco Surf Trip with the <br />
								GoPro Surf Team
							</span>
						),
						subtitle: 'Live',
						description: "Texas isn't known for its surfing, but Waco Surf has changed the game.",
						buttonText: 'Watch Now',
						buttonUrl: 'https://www.youtube.com/watch?v=jfGuUD-inBM'
					},
					{
						src: 'banner-image-1.png',
						title: (
							<span>
								The Rail Project: <br />
								Julian Wilson has ride of his life as he surf-skates in water
							</span>
						),
						subtitle: 'VOD',
						description: 'A new kind of skate park.',
						buttonText: 'Watch Now',
						buttonUrl: 'https://www.youtube.com/watch?v=y2CTZ5GtMUA'
					}
				]}
			/>
			<ImageGrid
				title="What's Going Down"
				items={[
					{
						title: 'Jack Robinson narrates five minutes of Fijian fire',
						description:
							'Jack Robinson talks us through scoring incredible waves at Cloudbreak on his first-ever mission to Fiji.',
						image: 'jack-robinson.png'
					},
					{
						title: 'Tahiti',
						description:
							'From the sheer terror of Teahupo’o to the relaxed family and ocean-based way of life, Tahiti offers something for everyone. Let No Contest give you a guided tour of these incredible islands.',
						image: 'tahiti.png'
					},
					{
						title: 'Molly Picklum: What it Takes',
						description:
							"Experience the highs and lows of the WSL World Tour and the mid-season cut, with Australian rookie Molly Picklum. Discover the headspace it requires to compete as one of the world's best surfers.",
						image: 'what-it-takes.png'
					}
				]}
				grid="uk-child-width-1-2@s uk-child-width-1-3@m uk-child-width-1-4@l"
			/>
		</main>
	);
};
