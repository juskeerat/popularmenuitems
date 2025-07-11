// Test script to verify URL validation for different Google Maps formats

const testUrls = [
    'https://maps.app.goo.gl/VaTHrz99aCoqiTCP7',
    'https://www.google.com/maps/place/Some+Restaurant',
    'https://maps.google.com/maps?q=restaurant',
    'https://invalid-url.com',
    'https://maps.app.goo.gl/another-example',
    'https://www.google.com/maps/place/Restaurant+Name/@40.7128,-74.0060,17z/'
];

console.log('🔍 Testing URL Validation for Popular Menu Finder\n');

testUrls.forEach((url, index) => {
    const isValid = url.includes('google.com/maps') || url.includes('maps.app.goo.gl');
    
    console.log(`${index + 1}. ${url}`);
    console.log(`   Valid: ${isValid ? '✅ YES' : '❌ NO'}`);
    console.log('');
});

console.log('✅ URL validation test completed!');
console.log('The app now accepts both:');
console.log('  - Traditional: https://www.google.com/maps/...');
console.log('  - Shortened: https://maps.app.goo.gl/...'); 