const fs = require('fs');
const path = require('path');

// Update manifest.json version for cache busting
function updateManifestVersion() {
  const manifestPath = path.join(__dirname, '..', 'public', 'manifest.json');
  
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    // Generate a new version based on timestamp
    const version = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0];
    manifest.version = version;
    
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`✅ Updated manifest.json version to: ${version}`);
  } catch (error) {
    console.error('❌ Error updating manifest version:', error);
    process.exit(1);
  }
}

// Update package.json version if needed
function updatePackageVersion() {
  const packagePath = path.join(__dirname, '..', 'package.json');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    // Only update if it's a patch version
    if (packageJson.version) {
      const versionParts = packageJson.version.split('.');
      const patch = parseInt(versionParts[2]) + 1;
      packageJson.version = `${versionParts[0]}.${versionParts[1]}.${patch}`;
      
      fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
      console.log(`✅ Updated package.json version to: ${packageJson.version}`);
    }
  } catch (error) {
    console.error('❌ Error updating package version:', error);
  }
}

// Main execution
if (require.main === module) {
  console.log('🔄 Updating versions for PWA cache busting...');
  updateManifestVersion();
  updatePackageVersion();
  console.log('✅ Version update complete!');
}

module.exports = { updateManifestVersion, updatePackageVersion };
