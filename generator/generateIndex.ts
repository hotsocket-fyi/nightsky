if (import.meta.main) {
	console.error("piss off and call my functions");
	Deno.exit(-1);
}

import ts, { factory as f } from "typescript";
import * as lx from "./lexicon.ts";
import {
	addComments,
	addNamedImport,
	CONSTRAINT_SERIALIZABLEOBJECT,
	convertProperty,
	convertSchemaObject,
	finalizeImports,
	ImportInfo,
	PRINTER,
	propsContainUnknown,
} from "./generator.ts";

// this machine creates _index.ts
export async function generateIndex(dir: string): Promise<string> {
	const dirName = dir.endsWith("/") ? dir : dir + "/";
	const listing = await Deno.readDir(dir);
	const entries: Deno.DirEntry[] = [];
	// const subdirs: Deno.DirEntry[] = [];
	const pairs: Record<string, boolean> = {};
	for await (const file of listing) {
		if ((file.isFile && !file.name.startsWith("_") && file.name.endsWith(".ts")) || file.isDirectory) {
			entries.push(file);
		}
	}
	// detect functions
	await Promise.all(entries.map(async (file) => {
		let hasRuntime = false;
		let name = file.name;
		if (file.isFile) {
			const content = await Deno.readTextFile(dirName + file.name);
			hasRuntime = content.indexOf("export async function") != -1;
		}
		if (file.isDirectory) name = name + "/_index.ts";
		pairs[name] = hasRuntime;
	}));

	// bang out the imports
	const body: ts.Statement[] = [];
	Object.keys(pairs).forEach((fileName) => {
		const hasRuntime = pairs[fileName];
		const name = fileName.replace(".ts", "").replace("/_index", "");
		let imp;
		if (!fileName.includes("_")) {
			// import { something as somethingNS } from "./something.ts";
			const defaultExportName = name.replaceAll("-", "_") + "_default";
			body.push(f.createImportDeclaration(
				undefined,
				f.createImportClause(
					undefined,
					f.createIdentifier(defaultExportName),
					undefined, // f.createNamespaceImport(f.createIdentifier(name + "NS")),
				),
				f.createStringLiteral("./" + fileName),
			));
			body.push(f.createExportDeclaration(
				undefined,
				!hasRuntime,
				f.createNamedExports([
					f.createExportSpecifier(
						false,
						defaultExportName,
						f.createIdentifier(name),
					),
				]),
			));
		} else {
			body.push(f.createExportDeclaration(
				undefined,
				false,
				f.createNamespaceExport(f.createIdentifier(name.replaceAll("-", "_"))),
				f.createStringLiteral("./" + fileName),
			));
		}
	});

	// export import something = somethingNS;
	// const modStatements: ts.Statement[] = [
	// 	...Object.keys(pairs).map((fileName) => {
	// 		const xpName = fileName.replace(".ts", "").replace("/_index", "");
	// 		return f.createImportEqualsDeclaration(
	// 			[f.createModifier(ts.SyntaxKind.ExportKeyword)],
	// 			false,
	// 			f.createIdentifier(xpName),
	// 			f.createIdentifier(xpName + "NS"),
	// 		);
	// 	}),
	// ];

	// // namespace to push out
	// const ns = f.createModuleDeclaration(
	// 	[f.createModifier(ts.SyntaxKind.ExportKeyword)],
	// 	f.createIdentifier(modName),
	// 	f.createModuleBlock(modStatements),
	// 	ts.NodeFlags.Namespace,
	// );
	// ts.addSyntheticLeadingComment(
	// 	ns,
	// 	ts.SyntaxKind.SingleLineCommentTrivia,
	// 	"deno-lint-ignore no-namespace",
	// 	true,
	// );
	// body.push(ns);

	// body.push(f.createExportDefault(f.createIdentifier(modName)));

	// spit out the content
	const sourceFile = f.createSourceFile(
		[
			...body,
		],
		f.createToken(ts.SyntaxKind.EndOfFileToken),
		ts.NodeFlags.None,
	);
	return PRINTER.printFile(sourceFile);
}
