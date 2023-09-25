import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";
import MyClass from "./src/classes/MyClass";
import { encode, decode, isWithinTokenLimit } from "gpt-tokenizer";
// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: "default",
};

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	myClassInstance: MyClass;
	spaceCounter: number;

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

		this.myClassInstance = new MyClass(this.app);
		this.spaceCounter = 0;

		document.addEventListener("keydown", async (event) => {
			if (event.code === "Space") {
				this.spaceCounter++;

				if (this.spaceCounter === 3) {
					// Reset the counter
					this.spaceCounter = 0;

					// Send the completion request
					await this.sendCompletionRequest();
				}
			} else {
				// Reset the counter if a non-space key was pressed
				this.spaceCounter = 0;
			}
		});
	}

	async sendCompletionRequest() {
		const activeFile = await this.myClassInstance.getCurrentFileContent();

		if (activeFile) {
			console.log("sending POST request...");
			const tokenLimit = 800;
			let prompt = activeFile.replace(/(?:\r\n|\r|\n)/g, "\\n");

			const isWithinTokenLimitResult = isWithinTokenLimit(
				activeFile,
				tokenLimit
			);
			console.log("isWithinTokenLimitResult:", isWithinTokenLimitResult);
			// if isWithinTokenLimitResult is false, then we need to cut the prompt to fit within the token limit
			if (isWithinTokenLimitResult === false) {
				const promptTokens = encode(activeFile);
				const promptTokensWithinLimit = promptTokens.slice(
					-promptTokens.length + tokenLimit
				);
				const promptWithinLimit = decode(promptTokensWithinLimit);
				// convert promptWithinLimit format that can be parsed by the API
				prompt = promptWithinLimit.replace(/(?:\r\n|\r|\n)/g, "\\n");
			}
			// Pass the content of the active file as a prompt
			console.log("Prompt:", prompt);
			const completionText = await this.myClassInstance.sendPostRequest(
				prompt
			);

			if (completionText) {
				// Write 'completionText' to the Obsidian editor
				console.log("Completion text:", completionText);
				const activeView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
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
