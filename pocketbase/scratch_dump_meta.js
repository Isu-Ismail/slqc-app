import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8080');

async function test() {
    try {
        // Log in as admin
        await pb.collection('users').authWithPassword('admin@example.com', 'admin123456'); // Let's try or fetch without auth
        console.log('Logged in successfully');
    } catch (e) {
        console.log('Failed to log in:', e.message);
    }
    
    try {
        const records = await pb.collection('metadata').getFullList();
        console.log('Metadata Records:');
        records.forEach(r => {
            console.log(`ID: ${r.id} | Key: ${r.key} | Value:`, r.value);
        });
    } catch (e) {
        console.error('Failed to list metadata:', e);
    }
}

test();
