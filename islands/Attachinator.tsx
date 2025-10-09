import { Dispatch, StateUpdater, useEffect, useMemo, useRef } from "preact/hooks";

// gemini wrote like a lot of this so sorry if the code is fucked i wanted this done *right now*
// and now im just suffering. still cant be fucked to write it myself lol

/**
 * A nice and neat solution for form attachments.
 * As per usual, limit 4 photos OR 1 video.
 */
export default function Attachinator({ files, setFiles }: { files: File[]; setFiles: Dispatch<StateUpdater<File[]>> }) {
	const hasVideo = useMemo(() => files.some((f) => f.type.startsWith("video/")), [files]);
	const hasImage = useMemo(() => files.some((f) => f.type.startsWith("image/")), [files]);

	const handleFileAdd = (e: Event) => {
		const input = e.target as HTMLInputElement;
		if (!input.files || input.files.length === 0) return;

		const newFile = input.files[0];

		// Check if any of the new files are videos
		const isVideo = newFile.type.startsWith("video/");

		if (isVideo) {
			if (files.length > 0) {
				return;
			}
			setFiles([newFile]);
		} else { // is image
			if (hasVideo) {
				return;
			}
			if (files.length >= 4) {
				return;
			}
			setFiles((prev) => [...prev, newFile]);
		}
	};

	const removeAttachment = (index: number) => {
		setFiles((prev) => prev.filter((_, i) => i !== index));
	};

	const canAddMore = !hasVideo && files.length < 4;

	/**
	 * A component to represent a file that has been selected.
	 * It displays the file name and a remove button, and crucially, it holds
	 * the actual File object in a hidden input for form submission.
	 */
	const AttachedFile = (
		{ file, index, onRemove }: { file: File; index: number; onRemove: (index: number) => void },
	) => {
		const inputRef = useRef<HTMLInputElement>(null);

		useEffect(() => {
			if (inputRef.current) {
				// This is the standard workaround to programmatically set files on an input.
				// We create a DataTransfer object, add the file, and assign its `files` property to the input.
				const dataTransfer = new DataTransfer();
				dataTransfer.items.add(file);
				inputRef.current.files = dataTransfer.files;
			}
		}, [file]);

		return (
			<div class="attachment-item">
				<button type="button" class="remove-attachment" onClick={() => onRemove(index)}>
					🗑️
				</button>
				{/* This hidden input holds the file for form submission. We show the name in a span. */}
				<input type="file" name={`attachment-${index}`} ref={inputRef} style={{ display: "none" }} />
				<span>{file.name}</span>
			</div>
		);
	};

	return (
		<>
			<div class="attachment-list">
				{files.map((file, index) => <AttachedFile key={index} file={file} index={index} onRemove={removeAttachment} />)}
			</div>
			{canAddMore && (
				<>
					<input
						type="file"
						onChange={handleFileAdd}
						accept={hasImage ? "image/*" : "image/*,video/*"}
						key={files.length} // Use key to force re-render as a new, empty input
					/>
					<br />
				</>
			)}
		</>
	);
}
