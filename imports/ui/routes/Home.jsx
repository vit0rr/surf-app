import React from 'react';
import { Banner } from '/imports/ui/components/Banner';
import { ImageGrid } from '/imports/ui/components/ImageGrid';
import data from '../../../client/scripts/data.js';

export const Home = function (props) {
	const events = data.events({ setRoute: props.setRoute }).slice(0, 3);

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
				items={events}
				grid="uk-child-width-1-2@s uk-child-width-1-3@m uk-child-width-1-4@l"
			/>
		</main>
	);
};
