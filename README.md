# Q - New Tab Todo Extension

![Q Logo](static/icons/icon32x32.png)

## Overview

Q is a simple yet powerful browser extension that transforms your new tab page into a quick and efficient todo application. Stay organized and productive directly from your browser without the need for external task management tools.

## Features

- **New Tab Integration**: Replaces the default new tab page with a clean todo interface
- **Quick Access**: Manage your tasks right when you open a new tab
- **Top Sites**: Shows your most visited sites for easy access
- **Simple Interface**: Minimalist design focused on productivity

## Installation

### From Chrome Web Store

_(Coming soon)_

### Manual Installation

1. Clone this repository and run `bun run build` to build the extension. This will create a `build` folder which you can unpack and install as an extension.
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the build folder containing the extension files
5. The extension should now be installed and will activate when you open a new tab

## Usage

- Open a new tab to access your todo list
- Add new tasks with a simple input field
- Mark tasks as complete with a single click
- Remove completed tasks to keep your list clean

## Development

### Project Structure

- `index.html` - Main interface for the new tab page
- `background.js` - Background service worker for extension functionality
- `static/` - Contains icons and other static resources
- `manifest.json` - Extension configuration file

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

Made with ❤️ for productivity enthusiasts
