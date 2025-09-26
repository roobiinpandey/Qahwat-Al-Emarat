// Test authentication functions
import * as api from './api';

// Test 1: Check if user is not logged in initially
console.log('Test 1 - Initial state:');
console.log('Is logged in:', api.isAdminLoggedIn());
console.log('Token:', api.getAdminToken());
console.log('User:', api.getAdminUser());

// Test 2: Simulate login
console.log('\nTest 2 - Simulating login:');
localStorage.setItem('adminToken', 'fake-jwt-token');
localStorage.setItem('adminUser', JSON.stringify({ username: 'welcome', role: 'admin' }));

console.log('After setting localStorage:');
console.log('Is logged in:', api.isAdminLoggedIn());
console.log('Token:', api.getAdminToken());
console.log('User:', api.getAdminUser());

// Test 3: Logout
console.log('\nTest 3 - Logout:');
api.logoutAdmin();
console.log('After logout:');
console.log('Is logged in:', api.isAdminLoggedIn());
console.log('Token:', api.getAdminToken());
console.log('User:', api.getAdminUser());

console.log('\nAll authentication tests completed!');
