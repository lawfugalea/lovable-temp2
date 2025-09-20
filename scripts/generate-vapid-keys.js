#!/usr/bin/env node

/**
 * Generate VAPID keys for push notifications
 * Run this script to generate VAPID keys for your application
 * 
 * Usage: node scripts/generate-vapid-keys.js
 */

const webpush = require('web-push');

console.log('🔑 Generating VAPID keys for push notifications...\n');

try {
  const vapidKeys = webpush.generateVAPIDKeys();
  
  console.log('✅ VAPID keys generated successfully!\n');
  console.log('📋 Add these environment variables to your deployment:\n');
  console.log('Public Key (add to .env.local and deployment environment):');
  console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}\n`);
  console.log('Private Key (add to deployment environment only - NEVER commit to git):');
  console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}\n`);
  console.log('Subject (add to deployment environment):');
  console.log(`VAPID_SUBJECT=mailto:admin@houseflow.app\n`);
  
  console.log('🚀 For deployment platforms:');
  console.log('1. Vercel: Add these as environment variables in your project settings');
  console.log('2. CapRover: Add these as environment variables in your app configuration');
  console.log('3. Docker: Add these as environment variables in your docker-compose.yml or Dockerfile\n');
  
  console.log('⚠️  IMPORTANT:');
  console.log('- Keep the private key secure and never commit it to version control');
  console.log('- The public key can be safely included in your client-side code');
  console.log('- Restart your application after adding these environment variables\n');
  
} catch (error) {
  console.error('❌ Error generating VAPID keys:', error.message);
  console.log('\n💡 Make sure you have the web-push package installed:');
  console.log('npm install web-push');
  process.exit(1);
}
