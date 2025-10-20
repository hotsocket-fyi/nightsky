import { generateFile } from "./generateFile.ts";
import { generateIndex } from "./generateIndex.ts";

const XSRCPATH = "./_external/atproto/lexicons";
const SRCPATH = "./lexicons";
const OUTPATH = "./support/atproto/generated";

async function convertFiles(rootDir: string, parentDir: string, entry: Deno.DirEntry) {
	const inputPath = parentDir + "/" + entry.name;
	const outputPath = inputPath.replace(rootDir, OUTPATH);

	if (entry.isFile) {
		if (entry.name.endsWith(".json")) {
			await Deno.writeTextFile(
				outputPath.substring(0, outputPath.lastIndexOf(".json")) + ".ts",
				generateFile(await Deno.readTextFile(inputPath)),
			);
		}
	} else {
		await Deno.mkdir(outputPath, { recursive: true });
		await Promise.all(Deno.readDirSync(inputPath).map((name) => convertFiles(rootDir, inputPath, name)));
	}
}

await Promise.all([
	Promise.all(
		Deno.readDirSync(XSRCPATH).map(async (root) => {
			await convertFiles(XSRCPATH, XSRCPATH, root);
		}),
	),
	Promise.all(
		Deno.readDirSync(SRCPATH).map(async (root) => {
			await convertFiles(SRCPATH, SRCPATH, root);
		}),
	),
]);

async function createIndexes(parentDir: string, entry: Deno.DirEntry) {
	const path = parentDir + "/" + entry.name;

	if (entry.isDirectory) {
		await Deno.writeTextFile(path + "/_index.ts", await generateIndex(path));
		await Promise.all(Deno.readDirSync(path).map((name) => createIndexes(path, name)));
	}
}

await Deno.writeTextFile(OUTPATH + "/_index.ts", await generateIndex(OUTPATH));
await Promise.all(Deno.readDirSync(OUTPATH).map((name) => createIndexes(OUTPATH, name)));
// await Promise.all(
// 	Deno.readDirSync(OUTPATH).map(async (root) => {
// 		await createIndexes(OUTPATH, root);
// 	}),
// );
