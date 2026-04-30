const fs = require("fs");

const appPath = "src/App.tsx";
let app = fs.readFileSync(appPath, "utf8");

// Loosen ThemeId so we can use all 30 theme IDs safely.
app = app.replace(
  /type ThemeId = .*?;/,
  "type ThemeId = string;"
);

const newThemes = `const themes: ThemeConfig[] = [
  lightTheme('nymphaea', 'Nymphaea', 'Signature purple glass.', '#7b69f8', '#52c7f3', '#f48ac6', '#edf2fb', '#f8fbff', '#2d3950', '#7e8da4'),
  darkTheme('luna', 'Luna', 'Soft blue night mode.', '#8898ff', '#59d8db', '#f29bdd', '#0f1625', '#161f31', '#e1e8f5', '#95a3bc'),
  lightTheme('aurora', 'Aurora', 'Soft neon aurora.', '#8d5cff', '#21d0d7', '#ff7ac6', '#edf1ff', '#fafbff', '#2f3c5a', '#8794af'),
  lightTheme('rose', 'Rose Quartz', 'Powder pink glass.', '#cc72d1', '#7ed1e4', '#f48bb7', '#f7eef4', '#fdf9fb', '#594c5f', '#9c8ea2'),
  darkTheme('obsidian', 'Obsidian', 'Calm professional dark.', '#8b7cff', '#48d4c8', '#f29bcf', '#0d1118', '#121822', '#dde6ef', '#8a96a8'),
  darkTheme('velvetember', 'Velvet Ember', 'Copper and orchid.', '#ff7b69', '#ffb36a', '#c78cff', '#16121a', '#1f1823', '#f5edf7', '#b9a8bb'),
  lightTheme('matcha', 'Matcha', 'Cream green workspace.', '#6dae64', '#99cf91', '#f0c57c', '#edf6eb', '#f9fcf7', '#38443d', '#7f9082'),
  lightTheme('sakura', 'Sakura Pop', 'Candy pink glass.', '#ff7ec9', '#ad7aff', '#72d4ff', '#fff1f8', '#fff8fc', '#604f64', '#a38fa7'),
  lightTheme('cloudmilk', 'Cloud Milk', 'Soft cloud white.', '#8a98ff', '#73c7ff', '#f6a3c4', '#f4f6fb', '#ffffff', '#37445c', '#8796aa'),
  lightTheme('peachfizz', 'Peach Fizz', 'Peach soda glass.', '#ff9f67', '#ffc37c', '#ff7fb1', '#fff1e9', '#fff8f4', '#5c4a40', '#a1887d'),
  lightTheme('lilacdream', 'Lilac Dream', 'Calm lavender.', '#9a7cff', '#7ac3ff', '#f3a4df', '#f3efff', '#faf7ff', '#433b58', '#9489ab'),
  lightTheme('mintgelato', 'Mint Gelato', 'Fresh mint workspace.', '#53c7a5', '#74dbcf', '#f1b97b', '#ecf8f4', '#f7fcfa', '#364a45', '#83948f'),
  lightTheme('solaris', 'Solaris', 'Golden morning.', '#f0ab3d', '#ffcf66', '#ff8d7a', '#fff6e7', '#fffbf2', '#5a4930', '#a28c62'),
  darkTheme('midnightbloom', 'Midnight Bloom', 'Purple night bloom.', '#9a7bff', '#60d1ff', '#ff8bc5', '#121321', '#17182a', '#eceffd', '#9aa1c6'),
  darkTheme('nebula', 'Nebula', 'Soft space mist.', '#8f6dff', '#57e1d3', '#ff8f9f', '#0d1322', '#111a2d', '#e5ecfb', '#92a0bb'),
  darkTheme('graphite', 'Graphite', 'Charcoal gray.', '#7d8ba5', '#4dc6d6', '#ff8d8d', '#101215', '#15181d', '#e7ebf0', '#9099a7'),
  darkTheme('cybersunset', 'Cyber Sunset', 'Orange neon dark.', '#ff8b45', '#ff5989', '#9d7cff', '#161117', '#211721', '#f8edf7', '#b9a7ba'),
  darkTheme('deepsea', 'Deep Sea', 'Deep blue workspace.', '#55a3ff', '#44d7dc', '#75e3b5', '#09131c', '#0e1a26', '#d9ebf7', '#88a1b2'),
  lightTheme('blueporcelain', 'Blue Porcelain', 'Porcelain blue.', '#6f8cff', '#67c7ff', '#f5a3d1', '#edf3fb', '#fbfdff', '#33465e', '#8193ab'),
  lightTheme('honeycream', 'Honey Cream', 'Honey cream glass.', '#d89a34', '#f4bd57', '#ef8c82', '#fcf5e8', '#fffdf8', '#5d4b31', '#a18c68'),
  lightTheme('cottoncandy', 'Cotton Candy', 'Soft candy colors.', '#ff7bcd', '#76c7ff', '#a788ff', '#fff1fb', '#fff9fd', '#654d69', '#ab93af'),
  lightTheme('icedberry', 'Iced Berry', 'Cool berry tone.', '#b26af6', '#72a8ff', '#ff8ba0', '#f6effb', '#fcf9ff', '#4d435b', '#958ca1'),
  lightTheme('meadow', 'Meadow', 'Soft meadow green.', '#5fb46f', '#8cd28f', '#f0bc72', '#eef8ef', '#fbfefb', '#39473c', '#85938a'),
  lightTheme('lemonsilk', 'Lemon Silk', 'Silky lemon cream.', '#d6b13b', '#ecd76f', '#f49b80', '#fff9e8', '#fffdf5', '#5b5431', '#9f9872'),
  darkTheme('vanta', 'Vanta', 'Ultra dark.', '#7066ff', '#49c8ff', '#ff86c8', '#090b10', '#0d1017', '#e6ecf7', '#818b9d'),
  darkTheme('ember', 'Ember', 'Warm ember dark.', '#ff6a4e', '#ffb25e', '#ff8fa8', '#18100f', '#221513', '#fff0ea', '#c0a6a0'),
  darkTheme('mojito', 'Mojito Night', 'Mint night mode.', '#58d0ad', '#79f0d6', '#8fe7ff', '#0e1715', '#15211d', '#e9f7f1', '#95b7ab'),
  darkTheme('royalviolet', 'Royal Violet', 'Royal purple dark.', '#9f71ff', '#6fb7ff', '#ff95d3', '#130f22', '#1b1430', '#f2ebff', '#a79cc0'),
  darkTheme('terminaljade', 'Terminal Jade', 'Green terminal vibe.', '#45d388', '#7ee0b6', '#a1ffe1', '#0c1713', '#11211b', '#ddf7ee', '#89b5a6'),
  darkTheme('arcticnight', 'Arctic Night', 'Cold blue night.', '#76a2ff', '#88d6ff', '#9af3ff', '#0f1723', '#162131', '#e5eef9', '#92a5ba')
];`;

const themeArrayRegex = /const themes: ThemeConfig\[\] = \[[\s\S]*?\n\];/;

if (!themeArrayRegex.test(app)) {
  console.error("Could not find existing themes array. No changes made.");
  process.exit(1);
}

app = app.replace(themeArrayRegex, newThemes);

fs.writeFileSync(appPath, app, "utf8");

console.log("Done: added 30 themes.");
