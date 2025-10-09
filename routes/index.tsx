import { Partial } from "fresh/runtime";
import { define } from "../utils.ts";

export default define.page(function Home() {
	return (
		<Partial name="main">
			This here be Nightsky.
		</Partial>
	);
});
