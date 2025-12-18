![Q Logo](static/assets//banner.svg)

Q is a simple yet powerful browser extension that transforms your new tab page into a sleek and focused productivity tool. Stay organized directly from your browser without the need for external task management or writing apps.

## Features

- **New Tab Integration**: Replaces the default new tab page with a clean interface
- **Quick Todo**: Manage your tasks right when you open a new tab
- **Top Sites**: Shows your most visited sites for easy access
- **Writer**: A special mode for focused and distraction free writing

## Installation

### From Chrome Web Store

_(Coming soon)_

### From Edge extension store (for Edge browsers)

Add to your browser from the official extension link - [Q - The new tab extension](https://microsoftedge.microsoft.com/addons/detail/q/caclhkefejgdigpilgjbljkjejnlfibd)

### Manual Installation

#### Approach 1 (For general users)
1. Check the release page for the latest release tag - https://github.com/aditya-xq/Q/releases, download the build.zip and extract it to a `build` folder
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the build folder containing the extension files
5. The extension should now be installed and will activate when you open a new tab

#### Approach 2 (For developers)
1. Clone this repository and run `bun run build` to build the extension. This will create a `build` folder, which you can unpack and install as an extension.
2. Steps to add an extension to your browser are the same as above, once you have the build folder.

## Usage

- Open a new tab to access your frequently visited sites on a clean distraction free interface
- Access your quick to-do list on the left side panel
- Check out the writer mode to write some notes, snippets, and manage your drafts.
- Manage your projects via the projects tab.

## Development

### Building from Source

1. Make your changes to the codebase and build the extension
2. Test locally using the "Load unpacked" method described above
3. For distribution, package the extension as a ZIP file if required

## Permissions

Q requires minimal permissions:

- `topSites` - To display your most frequently visited websites

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests to help improve Q.

## License

[MIT License](LICENSE)

---

Made with ❤️ for productivity enthusiasts. Feel free to tweet me your feedback and suggestions [@xq_is_here](https://x.com/xq_is_here) on X/Twitter.
