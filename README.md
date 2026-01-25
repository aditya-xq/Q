![Q Logo](static/assets//banner.svg)

Q is a simple yet powerful browser extension that transforms your new tab into a sleek and focused and fun productivity tool. You can stay organized directly from your new tab without needing to open some task management or writing apps.

---

## Features
- **New Tab Integration**: Replaces the default new tab page with a clean interface
- **Quick Todo**: Manage your tasks right when you open a new tab
- **Top Sites**: Shows your most visited sites for easy access
- **Writer**: A special mode for focused and distraction free writing
- **Projects**: Manage your projects, work streams, and tasks in one place
- **Settings**: Customize your Q experience with various settings
- **Quick Links**: Access your frequently visited sites with a single click
- **Arcade**: Play fun and nostalgic games directly from your new tab
- **Weather**: Check the weather directly from your new tab via the custom widget
- **Quote / Fact**: Get a random quote or fact directly from your new tab

---

## Installation

### From Chrome Web Store
_(Coming soon)_

### From Edge extension store (for Edge browsers)
Add to your browser from the official extension link - [Q - The new tab extension](https://microsoftedge.microsoft.com/addons/detail/q/caclhkefejgdigpilgjbljkjejnlfibd)

### Manual Installation
#### Approach 1 (For general users)
1. Check the release page for the latest release tag - https://github.com/aditya-xq/Q/releases, download the q-extension.zip and extract it to a `q-extension` folder
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the build folder containing the extension files
5. The extension should now be installed and will activate when you open a new tab

#### Approach 2 (For developers)
1. Clone this repository and run `bun run build:ext` to build the extension. This will create a `build-extension` folder, which you can unpack and install as an extension.
2. Steps to add an extension to your browser are the same as above, once you have the build-extension folder.

### Live Demo
You can also access a live demo of Q, deployed as a standalone web app at https://q.xqbuilds.com. Do note that it will always contain the latest development version of Q and may not be as stable as the official extension.

---

## Development
### Building from Source
1. Fork the repo and make your changes to the codebase, and build the extension.
2. Test locally using the "Load unpacked" method described above (you can also use `bun run dev` to test in a development server).
3. Raise a PR to merge the new changes.

---

## Permissions
Q requires minimal permissions:

- `topSites` - To display your most frequently visited websites
- `geolocation` - To display the weather

## Contributing
Contributions are welcome! Feel free to submit issues or pull requests to help improve Q.

## License
[MIT License](LICENSE)

---

Made with ❤️ for productivity enthusiasts. 

Feel free to tweet me your feedback and suggestions [@xq_is_here](https://x.com/xq_is_here) on X/Twitter.
