import { Partial } from "fresh/runtime";
import { define } from "../../utils.ts";
import ProfilePage from "../../islands/ProfilePage.tsx";

export default define.page(function idk(ctx) {
	const id = ctx.params.id;
	return (
		<>
			<Partial name="main">
				<ProfilePage id={id} />
			</Partial>
		</>
	);
});
