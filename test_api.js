const axios = require('axios');

async function testApi() {
    try {
        const response = await axios.get('http://localhost:3001/api/leadtime');
        console.log('Status:', response.status);
        console.log('Data Length:', response.data.length);
        if (response.data.length > 0) {
            console.log('First Item:', JSON.stringify(response.data[0], null, 2));
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testApi();
