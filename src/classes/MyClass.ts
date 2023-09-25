import { App, TFile } from "obsidian";
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

	async sendPostRequest(prompt: string): Promise<string | null> {
		try {
			const response = await axios.post(
				"https://api.bitewise.cc/v1/completions",
				{
					prompt: `\n\n### Instructions:\n请续写上文段落:${prompt}\n\n### Response:\n`,
					stop: ["\n", "###"],
					max_tokens: 1200,
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
