import * as ts from "typescript"
import { IntentionDiff, SemanticOperation } from "@dast/dast-intention-diff"
import { createAnchor } from "./dast-anchor"

export class TransactionalExecutor {
	constructor(private readonly originalAst: ts.SourceFile) {}

	public execute(intentionDiff: IntentionDiff): ts.SourceFile {
		const transformationResult = ts.transform(this.originalAst, [this.createTransformer(intentionDiff)])
		return transformationResult.transformed[0]
	}

	private createTransformer(intentionDiff: IntentionDiff): ts.TransformerFactory<ts.SourceFile> {
		return (context) => {
			const visitor: ts.Visitor = (node: ts.Node): ts.VisitResult<ts.Node> => {
				const anchor = createAnchor(node, this.originalAst)
				const operation = intentionDiff.operations.find((op: SemanticOperation) => op.targetAnchor === anchor)

				if (operation) {
					switch (operation.type) {
						case "REPLACE_NODE_BODY":
							if (ts.isFunctionDeclaration(node) && operation.newBodySubtree) {
								// Ensure newBodySubtree is a valid ts.Block
								const newBody = ts.isBlock(operation.newBodySubtree)
									? operation.newBodySubtree
									: ts.factory.createBlock(operation.newBodySubtree, true)

								return ts.factory.updateFunctionDeclaration(
									node,
									ts.getModifiers(node),
									node.asteriskToken,
									node.name,
									node.typeParameters,
									node.parameters,
									node.type,
									newBody,
								)
							}
							break
						// Other operations (ADD_NODE, REMOVE_NODE) would be handled here.
					}
				}

				return ts.visitEachChild(node, visitor, context)
			}
			return (node: ts.SourceFile) => ts.visitNode(node, visitor) as ts.SourceFile
		}
	}
}
