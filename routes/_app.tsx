import { define } from "../utils.ts";

export default define.page(function App(ctx) {
	return (
		<html>
			<head>
				<meta charset="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<title>dxsky</title>
			</head>
			<body>
				<script src="/register-sw.js"></script>
				<ctx.Component />
			</body>
		</html>
	);
});
