import { ButtonHTMLAttributes } from "preact";

export default function Button({
	children,
	...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
	return <button type="button" {...props}>{children}</button>;
}
