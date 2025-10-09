import { handleExpression, lineExpression, linkExpression } from "_/support/expr.ts";
import { HTMLAttributes } from "preact";
export default function DescriptionText(
	{ text, className, ...props }: Omit<HTMLAttributes<HTMLParagraphElement>, "className"> & {
		text: string;
		className?: string;
	},
) {
	const lineSplit = text.split(lineExpression);
	const parts: string[] = [];
	for (const maybeLine of lineSplit) {
		if (maybeLine == "\n") {
			parts.push(maybeLine);
			continue;
		}
		const handleSplit = maybeLine.split(handleExpression);
		for (const maybeHandle of handleSplit) {
			if (maybeHandle.startsWith("@")) {
				parts.push(maybeHandle);
				continue;
			}
			const linkSplit = maybeHandle.split(linkExpression);
			for (const maybeLink of linkSplit) {
				parts.push(maybeLink);
			}
		}
	}
	const classes = className?.split(" ") ?? [""];
	classes.push("pre-line", "description-text");
	return (
		<p class={classes.join(" ")} {...props}>
			{parts.map((part, idx) => {
				if (part.match(lineExpression)) {
					return <br key={idx} />;
				} else if (part.match(handleExpression)) {
					return (
						<a
							href={`/profile/${part.substring(1)}`}
							class="link-handle"
							key={idx}
						>
							{part}
						</a>
					);
				} else if (part.match(linkExpression)) {
					let url = part;
					if (!url.startsWith("http")) {
						url = "https://" + url;
					}
					return <a href={url} class="link-external" target="_blank" rel="noopener noreferrer" key={idx}>{part}</a>;
				} else {
					return part;
				}
			})}
		</p>
	);
}
