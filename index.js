/**
 * WordPress Icons Font Generator
 *
 * Converts WordPress icons from @wordpress/icons package into a custom icon font.
 *
 * Icons: Created by WordPress Design Team
 *        https://github.com/WordPress/gutenberg/tree/trunk/packages/icons
 *
 * Font Conversion Tool: Created by DPlugins
 *                       https://dplugins.com
 *
 * @license ISC
 */

const { generateFonts } = require('fantasticon');
const path = require('path');
const fs = require('fs');
const { optimize } = require('svgo');

// Create temporary directory for cleaned SVGs
const buildDir = path.join(__dirname, 'node_modules/@wordpress/icons/build/library');
const tempDir = path.join(__dirname, 'temp-svgs');
const outputDir = path.join(__dirname, 'dist');

// Ensure directories exist
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('Extracting SVG data from WordPress icon modules...');

// Get all JS icon files from build directory
const iconFiles = fs.readdirSync(buildDir)
  .filter(file => file.endsWith('.js') && !file.endsWith('.js.map'));

let processedCount = 0;
let skippedCount = 0;

iconFiles.forEach(file => {
  try {
    const iconName = file.replace('.js', '');
    const iconPath = path.join(buildDir, file);

    // Read the JS file content
    let content = fs.readFileSync(iconPath, 'utf8');

    // Extract viewBox
    const viewBoxMatch = content.match(/viewBox:\s*"([^"]+)"/);

    if (!viewBoxMatch) {
      console.log(`Skipped ${iconName}: No viewBox found`);
      skippedCount++;
      return;
    }

    const viewBox = viewBoxMatch[1];
    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">`;

    // Extract all path elements (some icons have multiple paths)
    const pathMatches = content.matchAll(/d:\s*"([^"]+)"/g);
    let pathCount = 0;

    for (const match of pathMatches) {
      const pathData = match[1];

      // Check for fillRule attribute for this path
      const pathContext = content.substring(Math.max(0, match.index - 100), match.index + 100);
      const fillRuleMatch = pathContext.match(/fillRule:\s*"([^"]+)"/);
      const clipRuleMatch = pathContext.match(/clipRule:\s*"([^"]+)"/);

      let pathAttrs = `d="${pathData}"`;
      if (fillRuleMatch) pathAttrs += ` fill-rule="${fillRuleMatch[1]}"`;
      if (clipRuleMatch) pathAttrs += ` clip-rule="${clipRuleMatch[1]}"`;

      svgContent += `\n  <path ${pathAttrs}/>`;
      pathCount++;
    }

    // Also check for Circle, Rect, and other SVG elements
    const circleMatches = content.matchAll(/import_primitives\.Circle[^}]+cx:\s*"?([^,"]+)"?[^}]+cy:\s*"?([^,"]+)"?[^}]+r:\s*"?([^,"]+)"?/g);
    for (const match of circleMatches) {
      svgContent += `\n  <circle cx="${match[1]}" cy="${match[2]}" r="${match[3]}"/>`;
      pathCount++;
    }

    svgContent += '\n</svg>';

    if (pathCount > 0) {
      // Optimize the SVG
      const result = optimize(svgContent, {
        multipass: true,
        plugins: [
          {
            name: 'preset-default',
            params: {
              overrides: {
                removeViewBox: false,
              },
            },
          },
        ],
      });

      const destPath = path.join(tempDir, `${iconName}.svg`);
      fs.writeFileSync(destPath, result.data);
      processedCount++;
    } else {
      console.log(`Skipped ${iconName}: No SVG paths found`);
      skippedCount++;
    }
  } catch (error) {
    console.log(`Error processing ${file}:`, error.message);
    skippedCount++;
  }
});

console.log(`Processed ${processedCount} icons, skipped ${skippedCount}`);

// Configuration for font generation
const config = {
  inputDir: tempDir,
  outputDir: outputDir,
  name: 'wordpress-icons',
  fontTypes: ['woff2', 'woff', 'ttf', 'eot'],
  assetTypes: ['css', 'json'], // Removed 'html' - we create our own custom preview
  prefix: 'wpi',
  codepoints: {},
  fontHeight: 300,
  normalize: true,
  formatOptions: {
    json: {
      indent: 2
    }
  }
};

// Generate the fonts
console.log('\nStarting font generation...');
generateFonts(config)
  .then((results) => {
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });

    // Create CSS file with variables for the preview page
    const previewCSS = `:root {
    /* Colors */
    --color-primary: #0073aa;
    --color-text: #1e1e1e;
    --color-text-secondary: #666;
    --color-border: #e0e0e0;
    --color-border-hover: #ddd;
    --color-bg: #f5f5f5;
    --color-bg-container: #ffffff;
    --color-github: #24292e;
    --color-npm: #cb3837;
    --color-download: #10b981;

    /* Spacing */
    --spacing-xs: 8px;
    --spacing-sm: 12px;
    --spacing-md: 20px;
    --spacing-lg: 30px;
    --spacing-xl: 40px;
    --spacing-2xl: 60px;

    /* Border Radius */
    --radius-sm: 6px;
    --radius-md: 8px;

    /* Typography */
    --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    --font-size-sm: 12px;
    --font-size-base: 14px;
    --font-size-md: 16px;
    --font-size-lg: 32px;

    /* Shadows */
    --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.1);
    --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.2);

    /* Transitions */
    --transition: all 0.2s ease;
    --transition-slide: 0.3s ease;
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: var(--font-family);
    background: var(--color-bg);
    padding: var(--spacing-xl) var(--spacing-md);
}

.container {
    max-width: 1400px;
    margin: 0 auto;
    background: var(--color-bg-container);
    padding: var(--spacing-xl);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-lg);
    flex-wrap: wrap;
    gap: var(--spacing-md);
}

.header-left {
    flex: 1;
    min-width: 250px;
}

h1 {
    color: var(--color-text);
    margin-bottom: 10px;
    font-size: var(--font-size-lg);
}

.stats {
    color: var(--color-text-secondary);
    font-size: var(--font-size-base);
}

.header-buttons {
    display: flex;
    gap: var(--spacing-sm);
    flex-wrap: wrap;
}

.btn {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: 10px var(--spacing-md);
    border-radius: var(--radius-sm);
    text-decoration: none;
    font-size: var(--font-size-base);
    font-weight: 500;
    transition: var(--transition);
}

.btn-github {
    background: var(--color-github);
    color: white;
}

.btn-github:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
}

.btn-npm {
    background: var(--color-npm);
    color: white;
}

.btn-npm:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(203, 56, 55, 0.3);
}

.btn-download {
    background: var(--color-download);
    color: white;
}

.btn-download:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.btn svg {
    width: 18px;
    height: 18px;
    fill: currentColor;
}

.search {
    width: 100%;
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: var(--font-size-md);
    border: 2px solid var(--color-border-hover);
    border-radius: var(--radius-sm);
    margin-bottom: var(--spacing-lg);
    outline: none;
}

.search:focus {
    border-color: var(--color-primary);
}

.grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: var(--spacing-md);
}

.icon-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--spacing-md);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    transition: var(--transition);
    cursor: pointer;
}

.icon-item:hover {
    border-color: var(--color-primary);
    box-shadow: 0 2px 8px rgba(0, 115, 170, 0.1);
    transform: translateY(-2px);
}

.icon-item i {
    font-size: 32px;
    color: var(--color-text);
    margin-bottom: var(--spacing-sm);
}

.icon-name {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    text-align: center;
    word-break: break-all;
}

.copied {
    position: fixed;
    top: var(--spacing-md);
    right: var(--spacing-md);
    background: var(--color-primary);
    color: white;
    padding: var(--spacing-sm) 24px;
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow-md);
    animation: slideIn var(--transition-slide), slideOut var(--transition-slide) 2.7s;
}

@keyframes slideIn {
    from {
        transform: translateX(400px);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

@keyframes slideOut {
    from {
        transform: translateX(0);
        opacity: 1;
    }
    to {
        transform: translateX(400px);
        opacity: 0;
    }
}

.footer {
    margin-top: var(--spacing-2xl);
    padding-top: var(--spacing-lg);
    border-top: 1px solid var(--color-border);
    text-align: center;
    color: var(--color-text-secondary);
    font-size: var(--font-size-base);
}

.footer a {
    color: var(--color-primary);
    text-decoration: none;
    font-weight: 500;
}

.footer a:hover {
    text-decoration: underline;
}

.footer-line {
    margin: var(--spacing-xs) 0;
}`;

    fs.writeFileSync(path.join(__dirname, 'preview.css'), previewCSS);

    // Create a custom preview HTML in the root directory
    const iconNames = Object.keys(results.codepoints || {}).sort();
    const previewHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WordPress Icons Font Preview</title>
    <link rel="stylesheet" href="dist/wordpress-icons.css">
    <link rel="stylesheet" href="preview.css">
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-left">
                <h1>WordPress Icons Font</h1>
                <div class="stats">${iconNames.length} icons available</div>
            </div>
            <div class="header-buttons">
                <a href="https://github.com/krstivoja/wordpress-icons-font" target="_blank" class="btn btn-github">
                    <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                    </svg>
                    View on GitHub
                </a>
                <a href="https://www.npmjs.com/package/wordpress-icons-font" target="_blank" class="btn btn-npm">
                    <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0 0v16h16V0H0zm13 13H8v-2H5v2H3V3h10v10z"/>
                    </svg>
                    View on npm
                </a>
                <a href="dist/" class="btn btn-download">
                    <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8.5 1.5A.5.5 0 0 1 9 2v5.793l2.146-2.147a.5.5 0 0 1 .708.708l-3 3a.5.5 0 0 1-.708 0l-3-3a.5.5 0 1 1 .708-.708L7.5 7.793V2a.5.5 0 0 1 .5-.5z"/>
                        <path d="M3 9.5a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V10a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2V10a.5.5 0 0 1 .5-.5z"/>
                    </svg>
                    Download Fonts
                </a>
            </div>
        </div>
        <input type="text" class="search" placeholder="Search icons..." id="searchInput">
        <div class="grid" id="iconGrid">
${iconNames.map(name => `            <div class="icon-item" data-name="${name}" onclick="copyIconClass('wpi-${name}')">
                <i class="wpi wpi-${name}"></i>
                <div class="icon-name">wpi-${name}</div>
            </div>`).join('\n')}
        </div>
        <div class="footer">
            <div class="footer-line">
                Icons created by <a href="https://github.com/WordPress/gutenberg/tree/trunk/packages/icons" target="_blank">WordPress Design Team</a>
            </div>
            <div class="footer-line">
                Font conversion tool by <a href="https://dplugins.com" target="_blank">DPlugins</a>
            </div>
        </div>
    </div>

    <script>
        const searchInput = document.getElementById('searchInput');
        const iconGrid = document.getElementById('iconGrid');
        const iconItems = iconGrid.querySelectorAll('.icon-item');

        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            iconItems.forEach(item => {
                const name = item.dataset.name.toLowerCase();
                item.style.display = name.includes(searchTerm) ? 'flex' : 'none';
            });
        });

        function copyIconClass(className) {
            navigator.clipboard.writeText(className).then(() => {
                showCopiedNotification(className);
            });
        }

        function showCopiedNotification(className) {
            const notification = document.createElement('div');
            notification.className = 'copied';
            notification.textContent = \`Copied: \${className}\`;
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 3000);
        }
    </script>
</body>
</html>`;

    fs.writeFileSync(path.join(__dirname, 'index.html'), previewHTML);

    console.log('\n✓ Font generated successfully!');
    console.log(`✓ Total icons: ${Object.keys(results.codepoints || {}).length}`);
    console.log('\nGenerated files in dist/:');
    console.log('  • wordpress-icons.woff2 - Modern web font');
    console.log('  • wordpress-icons.woff   - Standard web font');
    console.log('  • wordpress-icons.ttf    - TrueType font');
    console.log('  • wordpress-icons.eot    - IE support');
    console.log('  • wordpress-icons.css    - Stylesheet');
    console.log('  • wordpress-icons.json   - Icon mapping');
    console.log('\nPreview files:');
    console.log('  • index.html             - Interactive preview with search');
    console.log('  • preview.css            - Preview page styles with CSS variables');
    console.log('\n📖 Usage:');
    console.log('  <link rel="stylesheet" href="dist/wordpress-icons.css">');
    console.log('  <i class="wpi wpi-add-card"></i>');
    console.log('\n🎨 Open index.html in your browser to preview all icons!');
  })
  .catch((error) => {
    // Clean up temp directory even on error
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.error('\nFont generation failed:', error.message);
    process.exit(1);
  });
