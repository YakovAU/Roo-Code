export interface IntentionDiff {
	targetFile: string
	operations: SemanticOperation[]
}

export interface SemanticOperation {
	type: "REPLACE_NODE_BODY" | "ADD_NODE" | "REMOVE_NODE"
	targetAnchor: string
	newBodySubtree?: any // This will be a serialized AST node
}
