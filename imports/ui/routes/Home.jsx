import React from 'react';
import { Banner } from '/imports/ui/components/Banner';
import { ImageGrid } from '/imports/ui/components/ImageGrid';
import data from '../../../client/scripts/data';

export const Home = function (props) {
	const items = [
		{
			video: true,
			src: 'banner.mp4',
			title: (
				<span>
					Featured
					<br />
					Waco Surf Park
				</span>
			),
			subtitle: 'Live',
			description: "Texas isn't known for its surfing, but Waco Surf has changed the game.",
			buttonText: 'View',
			buttonUrl: 'https://www.youtube.com/watch?v=jfGuUD-inBM'
		}
	];

	return (
		<main className="page-home">
			<Banner items={items} />
			<ImageGrid
				title="Nearby Parks"
				type="park"
				items={data.parks}
				grid="uk-child-width-1-2@s uk-child-width-1-3@m uk-child-width-1-4@l"
			/>
		</main>
	);
};
