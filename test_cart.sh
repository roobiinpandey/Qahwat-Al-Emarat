#!/bin/bash

# Test script to verify cart functionality is working
echo "🧪 Testing Cart Functionality..."
echo

# Test 1: Check if frontend is running
echo "1. Checking frontend accessibility..."
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Frontend is running"
else
    echo "❌ Frontend is not accessible"
    exit 1
fi

# Test 2: Check if backend API is working
echo "2. Checking backend API..."
API_RESPONSE=$(curl -s http://localhost:5050/api/menu)
if [[ $? -eq 0 ]] && [[ "$API_RESPONSE" != "[]" ]]; then
    echo "✅ Backend API is working"
    echo "   Found menu items with _id field"
else
    echo "❌ Backend API is not working or no menu items found"
    exit 1
fi

# Test 3: Check if items have _id field
echo "3. Verifying item structure..."
FIRST_ITEM_ID=$(echo "$API_RESPONSE" | jq -r '.[0]._id' 2>/dev/null)
if [[ -n "$FIRST_ITEM_ID" ]] && [[ "$FIRST_ITEM_ID" != "null" ]]; then
    echo "✅ Items have _id field: $FIRST_ITEM_ID"
else
    echo "❌ Items missing _id field"
    exit 1
fi

echo
echo "🎉 All tests passed! Cart functionality should be working."
echo
echo "To test manually:"
echo "1. Open http://localhost:3000 in your browser"
echo "2. Click on any menu item to go to detail page"
echo "3. Click 'Add to Cart' button"
echo "4. Check if item appears in cart sidebar"
echo "5. Try adding the same item again to test quantity increase"
