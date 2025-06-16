import * as ts from "typescript"
import * as crypto from "crypto"

function getSignificantText(node: ts.Node, sourceFile: ts.SourceFile): string {
	if (ts.isFunctionDeclaration(node) && node.name) {
		return `Function:${node.name.getText(sourceFile)}`
	}
	if (ts.isClassDeclaration(node) && node.name) {
		return `Class:${node.name.getText(sourceFile)}`
	}
	if (ts.isMethodDeclaration(node) && node.name) {
		return `Method:${node.name.getText(sourceFile)}`
	}
	if (ts.isVariableDeclaration(node) && node.name) {
		return `Variable:${node.name.getText(sourceFile)}`
	}
	if (ts.isIfStatement(node)) {
		return `If:${node.expression.getText(sourceFile)}`
	}
	if (ts.isForStatement(node)) {
		return `For:${node.initializer?.getText(sourceFile) || ""};${node.condition?.getText(sourceFile) || ""};${node.incrementor?.getText(sourceFile) || ""}`
	}
	if (ts.isWhileStatement(node)) {
		return `While:${node.expression.getText(sourceFile)}`
	}
	return ""
}

export function createAnchor(node: ts.Node, sourceFile: ts.SourceFile): string {
	const hash = crypto.createHash("sha256")
	const nodeType = ts.SyntaxKind[node.kind]
	const significantText = getSignificantText(node, sourceFile)

	let childrenAnchors = ""
	ts.forEachChild(node, (child) => {
		childrenAnchors += createAnchor(child, sourceFile)
	})

	hash.update(nodeType + significantText + childrenAnchors)
	return hash.digest("hex")
}

export function parseAndAnchor(
	content: string,
	filePath: string,
): { ast: ts.SourceFile; anchors: Map<string, ts.Node> } {
	const ast = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true)

	const anchors = new Map<string, ts.Node>()
	const anchorVisitor = (node: ts.Node) => {
		const anchor = createAnchor(node, ast)
		if (!anchors.has(anchor)) {
			anchors.set(anchor, node)
		}
		ts.forEachChild(node, anchorVisitor)
	}

	anchorVisitor(ast)

	return { ast, anchors }
}
