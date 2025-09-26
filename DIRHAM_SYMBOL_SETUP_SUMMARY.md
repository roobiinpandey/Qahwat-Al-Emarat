# UAE Dirham Symbol - Complete Setup Package

This folder contains everything you need to add the authentic UAE Dirham symbol to future React projects.

## 📦 Files Included

1. **`setup-dirham-symbol.sh`** - Automated setup script
2. **`DIRHAM_SYMBOL_README.md`** - Complete documentation
3. **`DirhamSymbolDemo.js`** - React component with usage examples
4. **`package-template.json`** - Package.json template with required dependencies
5. **`dirham-symbol.css`** - CSS snippet with font-face definition

## 🚀 Quick Setup for New Projects

### Option 1: Automated (Recommended)
```bash
# Copy the script to your new project
cp setup-dirham-symbol.sh /path/to/your/new/project/

# Make it executable and run
cd /path/to/your/new/project
chmod +x setup-dirham-symbol.sh
./setup-dirham-symbol.sh
```

### Option 2: Manual Setup
```bash
# Install package
npm install new-dirham-symbol

# Copy font file
cp node_modules/new-dirham-symbol/dist/uae.symbol.ttf src/

# Add CSS from dirham-symbol.css to your main CSS file
```

## 📖 Usage

After setup, use the Dirham symbol in your components:

```jsx
// Basic usage
<span className="dirham-symbol">&#xea;</span> 10,000

// In price displays
<div className="price">
  <span className="dirham-symbol">&#xea;</span>
  <span>{price}</span>
</div>
```

## 🎯 What Gets Installed

- ✅ `new-dirham-symbol` npm package
- ✅ Font file: `src/uae.symbol.ttf`
- ✅ CSS font-face definition
- ✅ `.dirham-symbol` CSS class
- ✅ Unicode character: `&#xea;` (ê)

## 🔧 Compatibility

- ✅ Create React App
- ✅ Vite + React
- ✅ Next.js
- ⚠️  Other build tools may need adjustments

## 📝 Notes

- Symbol maintains proper proportions with text
- Works with all text colors and sizes
- Optimized for web performance
- Authentic UAE Dirham symbol design

## 🆘 Troubleshooting

If the symbol shows as "ê" instead of the Dirham symbol:
1. Check that the font file is in `src/uae.symbol.ttf`
2. Verify the CSS is loaded
3. Check browser developer tools for font loading errors

---

**Save this entire folder for future React projects!** 📁
