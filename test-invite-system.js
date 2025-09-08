// Simple test to verify invite system still works
const testInviteSystem = async () => {
  console.log('🧪 Testing invite system...');
  
  try {
    // Test 1: Check if name suggestions API works
    console.log('1. Testing name suggestions API...');
    const suggestionsResponse = await fetch('http://localhost:3000/api/household/name-suggestions');
    if (suggestionsResponse.ok) {
      const suggestions = await suggestionsResponse.json();
      console.log('✅ Name suggestions API working:', suggestions.suggestions?.length || 0, 'suggestions');
    } else {
      console.log('❌ Name suggestions API failed:', suggestionsResponse.status);
    }
    
    // Test 2: Check if household creation API exists
    console.log('2. Testing household creation API...');
    const createResponse = await fetch('http://localhost:3000/api/household/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Household', type: 'personal' })
    });
    
    if (createResponse.status === 401) {
      console.log('✅ Household creation API exists (requires auth)');
    } else if (createResponse.ok) {
      console.log('✅ Household creation API working');
    } else {
      console.log('❌ Household creation API failed:', createResponse.status);
    }
    
    // Test 3: Check if invite creation API exists
    console.log('3. Testing invite creation API...');
    const inviteResponse = await fetch('http://localhost:3000/api/household/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ householdId: 'test', email: 'test@example.com', role: 'MEMBER' })
    });
    
    if (inviteResponse.status === 401) {
      console.log('✅ Invite creation API exists (requires auth)');
    } else if (inviteResponse.status === 400) {
      console.log('✅ Invite creation API exists (invalid household ID)');
    } else {
      console.log('❌ Invite creation API failed:', inviteResponse.status);
    }
    
    // Test 4: Check if invite acceptance API exists
    console.log('4. Testing invite acceptance API...');
    const acceptResponse = await fetch('http://localhost:3000/api/invites/accept?token=test');
    
    if (acceptResponse.status === 302 || acceptResponse.status === 400) {
      console.log('✅ Invite acceptance API exists');
    } else {
      console.log('❌ Invite acceptance API failed:', acceptResponse.status);
    }
    
    console.log('🎉 Invite system test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

// Run the test if this file is executed directly
if (typeof window === 'undefined') {
  testInviteSystem();
}

module.exports = { testInviteSystem };
