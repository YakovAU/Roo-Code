import { DiffItem, DiffResult, DiffStrategy } from "../../../shared/tools"
import * as ts from "typescript"
import { IntentionDiff, SemanticOperation } from "./dast-intention-diff"
import { TransactionalExecutor } from "./dast-executor"
import { createAnchor, parseAndAnchor } from "./dast-anchor"
import { createPrinter } from "../../../utils/indentation-style"

export class DastDiffStrategy implements DiffStrategy {
	getName(): string {
		return "DastDiffStrategy"
	}

	getToolDescription(args: { cwd: string; toolOptions?: { [key: string]: string } }): string {
		return "A robust diff strategy using Dynamic Abstract Syntax Trees."
	}

	private createIntentionDiff(originalAst: ts.SourceFile, newContent: string, targetFile: string): IntentionDiff {
		const newAst = ts.createSourceFile(targetFile, newContent, ts.ScriptTarget.Latest, true)

		const operations: SemanticOperation[] = []
		const originalAnchors = new Map<string, ts.Node>()
		const visitor = (node: ts.Node) => {
			originalAnchors.set(createAnchor(node, originalAst), node)
			ts.forEachChild(node, visitor)
		}
		visitor(originalAst)

		const diff = (oldNode: ts.Node, newNode: ts.Node) => {
			const oldAnchor = createAnchor(oldNode, originalAst)
			const newAnchor = createAnchor(newNode, newAst)

			if (oldAnchor !== newAnchor) {
				if (
					ts.isFunctionDeclaration(oldNode) &&
					ts.isFunctionDeclaration(newNode) &&
					oldNode.body &&
					newNode.body
				) {
					const oldBodyAnchor = createAnchor(oldNode.body, originalAst)
					const newBodyAnchor = createAnchor(newNode.body, newAst)
					if (oldBodyAnchor !== newBodyAnchor) {
						operations.push({
							type: "REPLACE_NODE_BODY",
							targetAnchor: oldAnchor,
							newBodySubtree: newNode.body,
						})
					}
				}
			}

			const oldChildren: ts.Node[] = []
			ts.forEachChild(oldNode, (child) => oldChildren.push(child))
			const newChildren: ts.Node[] = []
			ts.forEachChild(newNode, (child) => newChildren.push(child))

			for (let i = 0; i < Math.min(oldChildren.length, newChildren.length); i++) {
				diff(oldChildren[i], newChildren[i])
			}
		}

		diff(originalAst, newAst)

		return {
			targetFile,
			operations,
		}
	}

	async applyDiff(originalContent: string, diffContent: string | DiffItem[]): Promise<DiffResult> {
		if (typeof diffContent !== "string") {
			return { success: false, error: "DastDiffStrategy currently only supports string diffContent" }
		}

		const filePath = "tempFile.ts" // Placeholder, should be passed in
		const { ast: originalAst } = parseAndAnchor(originalContent, filePath)

		const intentionDiff = this.createIntentionDiff(originalAst, diffContent, filePath)

		const executor = new TransactionalExecutor(originalAst)
		const newAst = executor.execute(intentionDiff)

		const printer = createPrinter()
		const newContent = printer.printFile(newAst)

		return { success: true, content: newContent }
	}
}
