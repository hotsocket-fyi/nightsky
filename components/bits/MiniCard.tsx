// basically a lil rectangle for a string that looks nice. ought to use for labels in the future.
// maybe use as a button.

import { HTMLAttributes } from "preact";

// or maybe it just hangs out. who knows? :)
export default function MiniCard(
	{ children, className, ...props }: HTMLAttributes<HTMLSpanElement>,
) {
	return <span className={`mini-card ${className}`} {...props}>{children}</span>;
}
