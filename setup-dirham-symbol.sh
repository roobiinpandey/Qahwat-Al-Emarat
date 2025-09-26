#!/bin/bash

# UAE Dirham Symbol Setup Script
# This script installs and configures the UAE Dirham symbol for React projects
# Usage: ./setup-dirham-symbol.sh

set -e  # Exit on any error

echo "🇦🇪 Setting up UAE Dirham Symbol for your React project..."
echo "======================================================"

# Check if we're in a React project
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script in your React project root."
    exit 1
fi

# Check if react-scripts is in dependencies (Create React App)
if ! grep -q "react-scripts" package.json; then
    echo "⚠️  Warning: This script is optimized for Create React App projects."
    echo "   For other React setups, you may need to adjust the font loading approach."
fi

echo "📦 Installing new-dirham-symbol package..."
npm install new-dirham-symbol

echo "📁 Setting up font file..."
# Copy font file to src directory
cp node_modules/new-dirham-symbol/dist/uae.symbol.ttf src/

echo "🎨 Adding CSS font-face definition..."

# Check if App.css exists
if [ -f "src/App.css" ]; then
    CSS_FILE="src/App.css"
elif [ -f "src/index.css" ]; then
    CSS_FILE="src/index.css"
else
    echo "❌ Error: Could not find App.css or index.css in src/ directory."
    echo "   Please manually add the font-face definition to your main CSS file."
    exit 1
fi

# Check if font-face is already defined
if grep -q "UAESymbol" "$CSS_FILE"; then
    echo "ℹ️  UAE Dirham font-face already exists in $CSS_FILE"
else
    # Add font-face definition after :root or at the top
    if grep -q ":root" "$CSS_FILE"; then
        # Insert after :root block
        sed -i '' '/^}/a\
\
/* UAE Dirham Symbol Font */\
@font-face {\
    font-family: '\''UAESymbol'\'';\
    src: url('\''./uae.symbol.ttf'\'') format('\''truetype'\'');\
    font-weight: normal;\
    font-style: normal;\
}\
\
.dirham-symbol {\
    font-family: '\''UAESymbol'\'', sans-serif;\
    font-size: inherit;\
    color: inherit;\
    font-weight: bold;\
}' "$CSS_FILE"
    else
        # Insert at the top
        sed -i '' '1i\
/* UAE Dirham Symbol Font */\
@font-face {\
    font-family: '\''UAESymbol'\'';\
    src: url('\''./uae.symbol.ttf'\'') format('\''truetype'\'');\
    font-weight: normal;\
    font-style: normal;\
}\
\
.dirham-symbol {\
    font-family: '\''UAESymbol'\'', sans-serif;\
    font-size: inherit;\
    color: inherit;\
    font-weight: bold;\
}\
\
' "$CSS_FILE"
    fi
    echo "✅ Added font-face definition to $CSS_FILE"
fi

echo ""
echo "🎉 UAE Dirham Symbol setup complete!"
echo "====================================="
echo ""
echo "📖 Usage Examples:"
echo "=================="
echo ""
echo "1. Basic usage in JSX:"
echo '   <span className="dirham-symbol">&#xea;</span> 10,000'
echo ""
echo "2. In price displays:"
echo '   <div className="price">'
echo '     <span className="dirham-symbol">&#xea;</span>'
echo '     <span>{price}</span>'
echo '   </div>'
echo ""
echo "3. With custom styling:"
echo '   <span className="dirham-symbol" style={{fontSize: "1.2em"}}>&#xea;</span>'
echo ""
echo "📝 Notes:"
echo "========"
echo "• The symbol uses Unicode character &#xea; (ê)"
echo "• Font file is copied to src/uae.symbol.ttf"
echo "• CSS class .dirham-symbol is available globally"
echo "• Symbol maintains proper proportions with surrounding text"
echo ""
echo "🚀 Your React app should now display the authentic UAE Dirham symbol!"
echo "   Start your development server with: npm start"
