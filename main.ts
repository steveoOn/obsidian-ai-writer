import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
} from "obsidian";
import axios from "axios";

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: "default",
};

class MyClass {
	app: App;

	constructor() {
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
					prompt: `\n\n### Instructions:\n${prompt}\n\n### Response:\n`,
					stop: ["\n", "###"],
					max_tokens: 800,
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

const myClassInstance = new MyClass(app);

let spaceCounter = 0;

async function sendCompletionRequest() {
	const activeFile = await myClassInstance.getCurrentFileContent();

	if (activeFile) {
		console.log("sending POST request...");
		const prompt = activeFile.replace(/(?:\r\n|\r|\n)/g, "\\n");
		// Pass the content of the active file as a prompt
		console.log("Prompt:", prompt);
		const completionText = await myClassInstance.sendPostRequest(prompt);

		if (completionText) {
			// Write 'completionText' to the Obsidian editor
			console.log("Completion text:", completionText);
			const activeView = app.workspace.getActiveViewOfType(MarkdownView);
			if (activeView) {
				const editor = activeView.editor;
				editor.replaceSelection(completionText);
			} else {
				console.error("Failed to get the active view.");
			}
		} else {
			console.error(
				"Failed to parse the completion text from the API response."
			);
		}
	} else {
		console.error(
			"Cannot send POST request: The content of the current file is empty or not available."
		);
	}
}

document.addEventListener("keydown", async (event) => {
	if (event.code === "Space") {
		spaceCounter++;

		if (spaceCounter === 3) {
			// Reset the counter
			spaceCounter = 0;

			// Send the completion request
			await sendCompletionRequest();
		}
	} else {
		// Reset the counter if a non-space key was pressed
		spaceCounter = 0;
	}
});

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		console.log("loading plugin");
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon(
			"dice",
			"AI Writer Plugin",
			(evt: MouseEvent) => {
				// Called when the user clicks the icon.
				new Notice("这是思文的通知消息!");
			}
		);
		// Perform additional things with the ribbon
		ribbonIconEl.addClass("my-plugin-ribbon-class");

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText("Status Bar Text");

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: "open-sample-modal-simple",
			name: "Open sample modal (simple)",
			callback: () => {
				new SampleModal(this.app).open();
			},
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: "sample-editor-command",
			name: "Sample editor command",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection("Sample Editor Command");
			},
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: "open-sample-modal-complex",
			name: "Open sample modal (complex)",
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, "click", (evt: MouseEvent) => {
			console.log("click", evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(
			window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000)
		);
	}

	onunload() {
		console.log("unloading plugin");
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText("Woah!");
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Setting #1")
			.setDesc("It's a secret")
			.addText((text) =>
				text
					.setPlaceholder("Enter your secret")
					.setValue(this.plugin.settings.mySetting)
					.onChange(async (value) => {
						this.plugin.settings.mySetting = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
