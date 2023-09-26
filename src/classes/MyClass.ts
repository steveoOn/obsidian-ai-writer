import { App, TFile, MarkdownView } from "obsidian";
import axios from "axios";

export default class MyClass {
	app: App;

	constructor(appL: App) {
		this.app = app;
	}

	async getCurrentFileContent(): Promise<string | null | undefined> {
		try {
			const activeFile: TFile | null = this.app.workspace.getActiveFile();
			if (!activeFile) {
				throw new Error("No active file");
			} else if (activeFile instanceof TFile) {
				return await this.app.vault.cachedRead(activeFile);
			}
		} catch (error) {
			console.error("Error getting current file content:", error);
			return null;
		}
	}

	async getTextBeforeCursor() {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (activeView) {
			const editor = activeView.editor;
			const cursor = editor.getCursor();

			// Define the start and end positions for getting text
			const start = { line: 0, ch: 0 };
			const end = { line: cursor.line, ch: cursor.ch };

			// Get the text before the cursor
			const textBeforeCursor = editor.getRange(start, end);

			return textBeforeCursor;
		} else {
			console.error("Failed to get the active view.");
			return null;
		}
	}

	async sendPostRequest(prompt: string): Promise<string | null> {
		try {
			const response = await axios.post(
				"https://api.bitewise.cc/v1/completions",
				{
					prompt: `\n\n### Instructions:\nBased on the context provided above, continue writing the following passage. Previous context: ${prompt}\n\n### Response (limited to 30 tokens):\n`,
					stop: ["###"],
					max_tokens: 500,
				}
			);

			console.log(response.data);

			// Extract the 'text' property from the first object in the array
			const completionText = response.data.choices[0]?.text;

			return completionText;
		} catch (error) {
			console.error("Error sending POST request:", error);
			return null;
		}
	}
}
