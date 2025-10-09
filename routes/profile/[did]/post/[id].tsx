import { Partial } from "fresh/runtime";
import { define } from "_/utils.ts";
import PostPage from "_/islands/PostPage.tsx";

export default define.page(function idk(ctx) {
	const did = ctx.params.did;
	const id = ctx.params.id;
	return (
		<>
			<Partial name="main">
				<PostPage did={did} id={id} />
			</Partial>
		</>
	);
});
