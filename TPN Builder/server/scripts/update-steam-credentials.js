import { getDatabase, promisifyDb } from '../config/database.js';

const db = getDatabase();
const dbAsync = promisifyDb(db);

async function updateSteamCredentials() {
  try {
    console.log('Updating STEAM credentials in database...');
    
    // Update global STEAM API URL
    await dbAsync.run(
      'UPDATE config SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?',
      ['https://dvmms.com/steam/api/ws/VDirectAccess.asmx', 'steam_api_url']
    );
    console.log('✓ Updated steam_api_url');

    // Update global STEAM WSDL URL
    await dbAsync.run(
      'UPDATE config SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?',
      ['https://dvmms.com/steam/api/ws/VDirectAccess.asmx?WSDL', 'steam_wsdl_url']
    );
    console.log('✓ Updated steam_wsdl_url');

    // Update global STEAM username
    await dbAsync.run(
      'UPDATE config SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?',
      ['apihandler', 'steam_username']
    );
    console.log('✓ Updated steam_username');

    // Update global STEAM password
    await dbAsync.run(
      'UPDATE config SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?',
      ['gitBMk!qhKqR&KC5', 'steam_password']
    );
    console.log('✓ Updated steam_password');

    // Delete all user-specific credentials so everyone uses global config
    const deleteResult = await dbAsync.run('DELETE FROM user_steam_credentials');
    console.log(`✓ Deleted ${deleteResult.changes} user-specific credential records`);

    console.log('\n✅ Database updated successfully!');
    console.log('All STEAM requests will now use:');
    console.log('  URL: https://dvmms.com/steam/api/ws/VDirectAccess.asmx');
    console.log('  Username: apihandler');
    console.log('  Password: gitBMk!qhKqR&KC5');
    
    await dbAsync.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating database:', error);
    await dbAsync.close();
    process.exit(1);
  }
}

updateSteamCredentials();
