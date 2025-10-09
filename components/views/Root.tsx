import { Head } from "fresh/runtime";
import { Navigation } from "../../islands/Navigation.tsx";
import "preact/debug";

//@ts-ignore deno-ts(7031) how the hell am i supposed to know
export function Root({ Component }) {
	return (
		<>
			<Head>
				<title>Nightsky</title>
			</Head>
			<div id="root" f-client-nav>
				<div id="navigation">
					<Navigation />
				</div>
				<div id="main">
					<Component />
				</div>
			</div>
		</>
	);
}
