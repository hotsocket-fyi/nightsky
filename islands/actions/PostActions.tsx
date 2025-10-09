import { IS_BROWSER } from "fresh/runtime";

export function PostActions() {
	if (!IS_BROWSER) {
		return (
			<>
			</>
		);
	}
	return (
		<>
		</>
	);
}
