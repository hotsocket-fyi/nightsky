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

export function generateFile(data: string): string {
	// so basically load the lexicon into the typed "Lexicon" object deal
	const lex: lx.Lexicon = JSON.parse(data);
	const lexName = lex.id.substring(lex.id.lastIndexOf(".") + 1);
	const imports: Record<string, ImportInfo> = {};
	const body: ts.Statement[] = [];

	let hasMain = false;
	let isRPC = false;
	if (lex.defs["main"]) {
		hasMain = true;
		const main = lex.defs["main"];
		let mainStatement: ts.Statement;
		const mainIdent = f.createIdentifier(lexName);
		// outer part is to avoid duplicate code
		// got a main def? check if its a proc/query
		if (main.type == "query" || main.type == "procedure" || main.type == "subscription") {
			isRPC = true;
			const rpcMain = main as lx.Query | lx.Procedure | lx.Subscription;
			// if its a proc/query, we're essentially filling in their respective templates
			// ^ remember to import functions for this
			addNamedImport(imports, main.type, "@/impl/requests.ts");
			addNamedImport(imports, "XError", "@/lib.ts");
			const callFunctionName = f.createIdentifier(main.type);

			// parameters for function
			const method = f.createStringLiteral(lex.id);
			const service = f.createIdentifier("service");
			const headers = f.createIdentifier("headers");
			const input = f.createIdentifier("input");
			const parameters = f.createIdentifier("parameters");
			// only used as a type, so not needed
			// const output = f.createIdentifier("output");

			//${lexName}.[something]
			const inputTypeID = f.createIdentifier(`${lexName}._input`);
			const outputTypeID = f.createIdentifier(`${lexName}._output`);
			const parametersTypeID = f.createIdentifier(`${lexName}._parameters`);

			const rpcParameters = [
				f.createParameterDeclaration(
					undefined,
					undefined,
					service,
					undefined,
					f.createTypeReferenceNode("URL"),
				),
			];
			const rpcBuildFlags = {
				hasInput: false,
				inputHasUnknown: false,
				hasParameters: false,
				parametersHasUnknown: false,
				hasOutput: false,
				outputHasUnknown: false,
			};

			// inputs, pushed to function parameters
			if (rpcMain.parameters) {
				rpcBuildFlags.hasParameters = true;
				rpcBuildFlags.parametersHasUnknown = propsContainUnknown(rpcMain.parameters.properties);
				rpcParameters.push(f.createParameterDeclaration(
					undefined,
					undefined,
					parameters,
					undefined,
					f.createTypeReferenceNode(parametersTypeID),
				));
				lex.defs["_parameters"] = rpcMain.parameters!;
			}
			if (rpcMain.type == "procedure" && rpcMain.input) {
				rpcBuildFlags.hasInput = true;
				if (rpcMain.input.encoding == "application/json") {
					rpcBuildFlags.inputHasUnknown = rpcMain.input.schema?.type == "object" &&
						propsContainUnknown(rpcMain.input.schema.properties);
					rpcParameters.push(f.createParameterDeclaration(
						undefined,
						undefined,
						input,
						undefined,
						f.createTypeReferenceNode(
							inputTypeID,
							rpcBuildFlags.inputHasUnknown
								? [
									f.createTypeReferenceNode("T"),
								]
								: undefined,
						),
					));
					lex.defs["_input"] = rpcMain.input.schema!;
				} else {
					rpcParameters.push(f.createParameterDeclaration(
						undefined,
						undefined,
						input,
						undefined,
						f.createTypeReferenceNode("Blob"),
					));
				}
			}

			// output stuff.
			let outputType: ts.TypeNode | undefined;
			if (rpcMain.output) {
				rpcBuildFlags.hasOutput = true;
				if (rpcMain.output.encoding == "application/json") {
					rpcBuildFlags.outputHasUnknown = rpcMain.output.schema!.type == "object" &&
						propsContainUnknown(rpcMain.output.schema!.properties);
					outputType = f.createTypeReferenceNode(
						outputTypeID,
						rpcBuildFlags.outputHasUnknown ? [f.createTypeReferenceNode("T")] : undefined,
					);
					lex.defs["_output"] = rpcMain.output.schema!;
				} else {
					outputType = f.createTypeReferenceNode("Blob");
				}
			}

			const modifiers: ts.ModifierLike[] = [
				f.createModifier(ts.SyntaxKind.ExportKeyword),
			];
			let returnType;
			if (rpcMain.type != "subscription") {
				returnType = f.createTypeReferenceNode(
					"Promise",
					[
						rpcBuildFlags.hasOutput
							? f.createUnionTypeNode([
								outputType!,
								f.createTypeReferenceNode("XError"),
							])
							: f.createTypeReferenceNode("XError"),
					],
				);
				rpcParameters.push(f.createParameterDeclaration(
					undefined,
					undefined,
					headers,
					undefined,
					f.createTypeReferenceNode("Headers"),
					f.createNewExpression(
						f.createIdentifier("Headers"),
						undefined,
						[],
					),
				));
				modifiers.push(f.createModifier(ts.SyntaxKind.AsyncKeyword));
			} else {
				returnType = f.createTypeReferenceNode("WebSocket");
			}
			const callExpr = f.createCallExpression(
				callFunctionName,
				rpcBuildFlags.hasOutput ? [outputType!] : undefined,
				[
					f.createObjectLiteralExpression(
						[
							f.createPropertyAssignment("method", method),
							f.createPropertyAssignment("service", service),
							rpcBuildFlags.hasInput ? f.createPropertyAssignment("input", input) : undefined,
							rpcBuildFlags.hasParameters ? f.createPropertyAssignment("parameters", parameters) : undefined,
							rpcMain.type != "subscription" ? f.createPropertyAssignment("headers", headers) : undefined,
						].filter((x) => !!x),
						true,
					),
					// ^ filter drops anything undefined
				],
			);
			mainStatement = f.createFunctionDeclaration(
				modifiers,
				undefined,
				mainIdent,
				(rpcBuildFlags.inputHasUnknown || rpcBuildFlags.outputHasUnknown)
					? [
						CONSTRAINT_SERIALIZABLEOBJECT,
					]
					: undefined,
				rpcParameters,
				returnType,
				f.createBlock([
					f.createReturnStatement(
						rpcMain.type == "subscription" ? callExpr : f.createAwaitExpression(callExpr),
					),
				], true),
			);

			// also (_input|_params)/_output objects should be figured out and added to defs
			// } else if (main.type == "subscription") {
			// 	console.warn(`⚠️ dropped subscription ${lex.id}`);
			// 	return "";
		} else {
			if (main.type == "object") mainStatement = convertSchemaObject(lex, lexName, main, imports)!;
			else if (main.type == "record") mainStatement = convertSchemaObject(lex, lexName, main.record, imports)!;
			else throw new Error(`unsupported ${main.type} for main in ${lex.id}`);
		}

		addComments(main, mainStatement);
		body.push(mainStatement);

		// code's generated for main, so the def is deleted
		delete lex.defs["main"];
	}

	const modStatements: ts.Statement[] = [];

	for (const originalName in lex.defs) {
		const def = lex.defs[originalName];
		// if (def.type != "object" && def.type != "params") throw new Error("hell nah " + lex.id);
		const defName = originalName.startsWith("_") ? originalName : "$" + originalName;
		let statement: ts.Statement;
		if (def.type == "object" || def.type == "params") {
			statement = convertSchemaObject(lex, defName, def as lx.Object, imports)!;
		} else {
			statement = convertProperty(lex, defName, def as lx.FieldTypes, imports);
		}
		addComments(def, statement);
		modStatements.push(statement);
		// body.push(statement);
	}

	// if (isRPC) {
	const ns = f.createModuleDeclaration(
		[f.createModifier(ts.SyntaxKind.ExportKeyword)],
		f.createIdentifier(lexName),
		f.createModuleBlock(modStatements),
		ts.NodeFlags.Namespace,
	);
	ts.addSyntheticLeadingComment(
		ns,
		ts.SyntaxKind.SingleLineCommentTrivia,
		"deno-lint-ignore no-namespace",
		true,
	);
	body.push(ns);
	// } else {
	// 	body.push(...modStatements);
	// }
	// if (hasMain) {
	// 	if (isRPC) {
	body.push(
		f.createExportDefault(f.createIdentifier(lexName)),
	);
	// }
	// } else {
	// 	body.push(
	// 		f.createExportDefault(f.createObjectLiteralExpression([])),
	// 	);
	// }
	// }

	const finalImports: ts.Statement[] = finalizeImports(imports);
	const sourceFile = f.createSourceFile(
		[
			...finalImports,
			...body,
		],
		f.createToken(ts.SyntaxKind.EndOfFileToken),
		ts.NodeFlags.None,
	);
	return PRINTER.printFile(sourceFile);
}
