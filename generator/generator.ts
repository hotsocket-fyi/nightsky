if (import.meta.main) {
	console.error("piss off and call my functions");
	Deno.exit(-1);
}

import ts, { factory as f, SyntaxKind } from "typescript";
import * as lx from "./lexicon.ts";

/* need to work out the flow

if theres a main def, wrap the rest in a namespace, since the default export needs to be the main def
^> If a main definition exists, it can be referenced without a fragment, just using the NSID.
 > For references in the $type fields in data objects themselves (eg, records or contents of a union),
 > this is a "must" (use of a #main suffix is invalid). For example, com.example.record not com.example.record#main.

then we rename defs not starting with _ to start with $, to create that visual differentiation like lexicon refs
^ com.atproto.label.defs#selfLabels -> AT.com.atproto.label.defs.$selfLabels

also with defs containing an "unknown" type, add a type parameter to the output type, and set the field type T

 */

/** Takes in a lexicon in JSON format, and spits out TypeScript code. */
export const PRINTER = ts.createPrinter({
	newLine: ts.NewLineKind.LineFeed,
	noEmitHelpers: false,
	omitTrailingSemicolon: false,
	removeComments: false,
});

export const CONSTRAINT_SERIALIZABLEOBJECT = f.createTypeParameterDeclaration(
	undefined,
	"T",
	f.createTypeReferenceNode("SerializableObject"),
	f.createTypeReferenceNode("SerializableObject"),
);
export const CONSTRAINT_SERIALIZABLEPARAMS = f.createTypeParameterDeclaration(
	undefined,
	"T",
	f.createTypeReferenceNode("SerializableParams"),
);

export type ImportInfo = {
	defaultImport?: string;
	namedImports?: ts.ImportSpecifier[];
};
export function finalizeImports(imports: Record<string, ImportInfo>): ts.Statement[] {
	const output: ts.Statement[] = [];
	for (const [module, { defaultImport, namedImports }] of Object.entries(imports)) {
		output.push(f.createImportDeclaration(
			undefined,
			f.createImportClause(
				undefined,
				defaultImport ? f.createIdentifier(defaultImport) : undefined,
				namedImports ? f.createNamedImports(namedImports) : undefined,
			),
			f.createStringLiteral(module),
		));
	}
	return output;
}

export function addComments<T extends lx.SchemaObject>(def: T, declaration: ts.Statement | ts.Declaration) {
	const commentParts: string[] = [];
	if (def.description) commentParts.push(def.description);
	if (def.type == "query" || def.type == "procedure" || def.type == "subscription") commentParts.push("@" + def.type);
	if (def.type === "string" && "format" in def && (def as lx.String).format) {
		commentParts.push("@format " + (def as lx.String).format);
	}
	if (commentParts.length > 0) {
		ts.addSyntheticLeadingComment(
			declaration,
			ts.SyntaxKind.MultiLineCommentTrivia,
			"* " + commentParts.join("\n * ") + " ",
			true,
		);
	}
}
export function addNamedImport(imports: Record<string, ImportInfo>, name: string, file: string) {
	if (!imports[file]) imports[file] = {};
	if (!imports[file].namedImports) imports[file].namedImports = [];
	if (imports[file].namedImports.find((x) => x.name.text == name)) return;
	imports[file].namedImports.push(
		f.createImportSpecifier(false, undefined, f.createIdentifier(name)),
	);
}

export function lastNSIDPart(nsid: string): string {
	return nsid.substring(nsid.lastIndexOf(".") + 1);
}

export function refToNode(ref: string, lex: lx.Lexicon, imports: Record<string, ImportInfo>) {
	const fixedRef = ref.replace("#", ".$");
	// #something means it's local to "here"
	if (ref.startsWith("#")) {
		if (Object.hasOwn(lex.defs, "main")) {
			//${lastNSIDPart(lex.id)}${fixedRef}
			return f.createTypeReferenceNode(`${lastNSIDPart(lex.id)}${fixedRef}`);
		} else {
			return f.createTypeReferenceNode(fixedRef.replace(".", ""));
		}
	} else {
		imports["@/index.ts"] = { defaultImport: "AT" };
		return f.createTypeReferenceNode("AT." + fixedRef);
	}
}

export function lookupType(
	object: lx.AnySchemaObject,
	lex: lx.Lexicon,
	name: string,
	imports: Record<string, ImportInfo>,
): ts.TypeNode {
	switch (object.type) {
		case "cid-link":
		case "bytes":
		case "token":
		case "string":
			return f.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
		case "blob":
			addNamedImport(imports, "XBlob", "@/lib.ts");
			return f.createTypeReferenceNode("XBlob");
		case "boolean":
			return f.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
		case "integer":
			return f.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
		case "unknown":
			return f.createTypeReferenceNode("T");
		case "ref":
			return refToNode(object.ref, lex, imports);
		case "union":
			// TODO: Handle union types properly
			if (object.refs.length == 0) {
				// Record<PropertyKey, never>
				return f.createTypeReferenceNode(
					"Record",
					[
						f.createTypeReferenceNode("PropertyKey"),
						f.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword),
					],
				);
			} else {
				return f.createUnionTypeNode(object.refs.map((ref) => refToNode(ref, lex, imports)));
			}
		case "array":
			// TODO: Handle array types properly
			return f.createArrayTypeNode(lookupType(object.items, lex, name + ">array", imports));
		// objects, params are handled differently
		default:
			throw new Error(`unhandled type ${object.type} for ${lex}#${name}`);
	}
}

export function propsContainUnknown(props: Record<string, lx.AnySchemaObject>): boolean {
	for (const name in props) {
		const prop = props[name];
		if (prop.type == "unknown") return true;
		if (prop.type == "array" && prop.items.type == "unknown") return true;
	}
	return false;
}

export function convertProperty(
	lex: lx.Lexicon,
	name: string,
	def: lx.FieldTypes,
	imports: Record<string, ImportInfo>,
): ts.Statement {
	return f.createTypeAliasDeclaration(
		[
			f.createModifier(ts.SyntaxKind.ExportKeyword),
		],
		name,
		undefined,
		lookupType(def, lex, name, imports),
	);
}

export function convertSchemaObject(
	lex: lx.Lexicon,
	name: string,
	def: lx.Object,
	imports: Record<string, ImportInfo>,
): ts.Statement | void {
	const members: ts.TypeElement[] = [];

	// members.push(
	// 	`\t[key: string]: ${name == "_parameters" ? "string | number | boolean | null | undefined" : "Serializable"};`,
	// );
	function requiredLookup(propName: string): ts.QuestionToken | undefined {
		if (def.required && def.required.indexOf(propName) != -1) {
			return undefined;
		} else {
			return f.createToken(ts.SyntaxKind.QuestionToken);
		}
	}
	// detect whether any property contains `unknown` (including arrays of unknown)
	// so we can add the generic `T` type parameter to the interface when needed.
	const hasUnknown = propsContainUnknown(def.properties);
	for (const propName in def.properties) {
		const prop = def.properties[propName];

		const member = f.createPropertySignature(
			undefined,
			propName,
			requiredLookup(propName),
			lookupType(prop, lex, propName, imports),
		);
		addComments(prop, member);
		members.push(member);
	}
	let inheritID;
	if (name == "_parameters") {
		inheritID = f.createIdentifier("SerializableParams");
		addNamedImport(imports, "SerializableParams", "@/impl/types.ts");
	} else {
		inheritID = f.createIdentifier("SerializableObject");
		addNamedImport(imports, "SerializableObject", "@/impl/types.ts");
	}
	return f.createInterfaceDeclaration(
		[f.createModifier(ts.SyntaxKind.ExportKeyword)],
		name,
		hasUnknown ? [CONSTRAINT_SERIALIZABLEOBJECT] : undefined,
		[f.createHeritageClause(SyntaxKind.ExtendsKeyword, [
			f.createExpressionWithTypeArguments(
				inheritID,
				undefined,
			),
		])],
		members,
	);
}
