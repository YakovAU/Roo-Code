import * as ts from "typescript"

export interface IndentationStyle {
	useTabs: boolean
	tabWidth: number
}

export function detectIndentationStyle(sourceCode: string): IndentationStyle {
	const lines = sourceCode.split("\n")
	let tabCount = 0
	let spaceCount = 0
	const spaceWidths: { [width: number]: number } = {}

	for (const line of lines) {
		const match = line.match(/^(\s+)/)
		if (match) {
			const whitespace = match[1]
			if (whitespace.includes("\t")) {
				tabCount++
			}
			if (whitespace.includes(" ")) {
				const spaces = whitespace.replace(/\t/g, "")
				if (spaces.length > 1) {
					spaceCount++
					spaceWidths[spaces.length] = (spaceWidths[spaces.length] || 0) + 1
				}
			}
		}
	}

	if (tabCount > spaceCount) {
		return { useTabs: true, tabWidth: 4 } // Default tab width
	}

	let mostCommonSpaceWidth = 0
	let maxCount = 0
	for (const [width, count] of Object.entries(spaceWidths)) {
		if (count > maxCount) {
			maxCount = count
			mostCommonSpaceWidth = parseInt(width, 10)
		}
	}

	return { useTabs: false, tabWidth: mostCommonSpaceWidth || 4 } // Default to 4 spaces
}

export function createPrinter(): ts.Printer {
	return ts.createPrinter({
		newLine: ts.NewLineKind.LineFeed,
	})
}
