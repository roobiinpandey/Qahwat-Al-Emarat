# UAE Dirham Symbol Setup Script

A reusable bash script to easily add the authentic UAE Dirham symbol to any React project.

## 🚀 Quick Start

1. **Download the script:**
   ```bash
   curl -O https://raw.githubusercontent.com/your-repo/setup-dirham-symbol.sh
   # Or copy the script content to setup-dirham-symbol.sh in your project root
   ```

2. **Make it executable:**
   ```bash
   chmod +x setup-dirham-symbol.sh
   ```

3. **Run the script in your React project:**
   ```bash
   ./setup-dirham-symbol.sh
   ```

## 📋 What the Script Does

The script automatically:
- ✅ Installs the `new-dirham-symbol` npm package
- ✅ Copies the font file to your `src/` directory
- ✅ Adds the font-face CSS definition to your main CSS file
- ✅ Provides usage examples and documentation

## 🎯 Usage Examples

After running the script, you can use the Dirham symbol in your React components:

### Basic Usage
```jsx
<span className="dirham-symbol">&#xea;</span> 10,000
```

### Price Display
```jsx
<div className="price">
  <span className="dirham-symbol">&#xea;</span>
  <span>{item.price}</span>
</div>
```

### With Custom Styling
```jsx
<span className="dirham-symbol" style={{fontSize: "1.2em", color: "#8B4513"}}>&#xea;</span>
```

## 📁 Files Modified

- `package.json` - Adds `new-dirham-symbol` dependency
- `src/uae.symbol.ttf` - Font file (copied from node_modules)
- `src/App.css` or `src/index.css` - Adds font-face definition and `.dirham-symbol` class

## 🎨 CSS Classes Available

```css
.dirham-symbol {
  font-family: 'UAESymbol', sans-serif;
  font-size: inherit;
  color: inherit;
  font-weight: bold;
}
```

## 🔧 Manual Setup (Alternative)

If you prefer to set it up manually:

1. Install the package:
   ```bash
   npm install new-dirham-symbol
   ```

2. Copy the font file:
   ```bash
   cp node_modules/new-dirham-symbol/dist/uae.symbol.ttf src/
   ```

3. Add to your CSS:
   ```css
   @font-face {
     font-family: 'UAESymbol';
     src: url('./uae.symbol.ttf') format('truetype');
     font-weight: normal;
     font-style: normal;
   }

   .dirham-symbol {
     font-family: 'UAESymbol', sans-serif;
     font-size: inherit;
     color: inherit;
     font-weight: bold;
   }
   ```

## ✅ Compatibility

- ✅ Create React App
- ✅ Vite
- ✅ Next.js
- ⚠️  Other build tools may need font path adjustments

## 📝 Notes

- The symbol uses Unicode character `&#xea;` (ê)
- Font file is optimized for web use
- Symbol maintains proper proportions with surrounding text
- Works with both light and dark themes

## 🐛 Troubleshooting

**Font not loading?**
- Ensure the font file is in `src/uae.symbol.ttf`
- Check that the CSS path is correct: `url('./uae.symbol.ttf')`

**Symbol appears as ê instead of Dirham symbol?**
- Make sure the `.dirham-symbol` class is applied
- Check browser developer tools for font loading errors

**Build errors?**
- For non-CRA projects, you may need to adjust the font import method
- Try using absolute paths or different font loading strategies

## 📄 License

This script is provided as-is for educational and development purposes.
