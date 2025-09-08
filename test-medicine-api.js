// Quick test script to check medicine API endpoints
const fetch = require('node-fetch');

async function testMedicineAPI() {
  try {
    console.log('Testing medicine API endpoints...');
    
    // Test medicines endpoint
    const medicinesResponse = await fetch('http://localhost:3000/api/medicine/medicines?householdId=test');
    console.log('Medicines API status:', medicinesResponse.status);
    
    if (medicinesResponse.ok) {
      const medicinesData = await medicinesResponse.json();
      console.log('Medicines data:', medicinesData);
    } else {
      const errorText = await medicinesResponse.text();
      console.log('Medicines API error:', errorText);
    }
    
    // Test doses endpoint
    const dosesResponse = await fetch('http://localhost:3000/api/medicine/doses?householdId=test');
    console.log('Doses API status:', dosesResponse.status);
    
    if (dosesResponse.ok) {
      const dosesData = await dosesResponse.json();
      console.log('Doses data:', dosesData);
    } else {
      const errorText = await dosesResponse.text();
      console.log('Doses API error:', errorText);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testMedicineAPI();
