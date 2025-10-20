import AT from "@/index.ts";
import { Account, blobToURL } from "#/bsky.ts";

export default function MediaView({ media, owner }: { media: AT.app.bsky.embed.images.$image; owner: Account }) {
	return (
		<div className="MediaView">
			<img src={blobToURL(owner.doc, media.image)} title={media.alt} alt={media.alt} />
		</div>
	);
}
