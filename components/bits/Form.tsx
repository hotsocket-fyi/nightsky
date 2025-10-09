import { FormHTMLAttributes } from "preact";

export default function Form({
	children,
	onSubmit,
	...props
}: Omit<FormHTMLAttributes<HTMLFormElement>, "onSubmit"> & { onSubmit: (data: FormData) => void }) {
	return (
		<form
			onSubmit={(ev) => {
				ev.preventDefault();
				onSubmit(new FormData(ev.target as HTMLFormElement));
			}}
			{...props}
		>
			{children}
		</form>
	);
}
