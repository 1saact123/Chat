const axios = require('axios');

const API_BASE = 'https://chat.movonte.com';

async function testWidgetDuplication() {
    console.log('🧪 Testing widget message duplication fix...\n');
    
    try {
        // Test: Send a message from widget to a ticket
        console.log('📤 Sending message from widget to ticket TI-402...');
        
        const messageData = {
            issueKey: 'TI-402',
            message: 'Test message from widget - ' + new Date().toISOString(),
            customerInfo: {
                name: 'Test Widget User',
                email: 'widget-test@example.com'
            }
        };
        
        const response = await axios.post(`${API_BASE}/api/widget/send-message`, messageData, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Widget response:', response.data);
        
        // Wait a bit for webhook processing
        console.log('\n⏳ Waiting 5 seconds for webhook processing...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check for new messages to see if there are duplicates
        console.log('\n🔍 Checking for new messages...');
        
        const checkResponse = await axios.get(`${API_BASE}/api/widget/check-messages?issueKey=TI-402`);
        
        console.log('✅ Messages check result:');
        console.log(`   Total messages: ${checkResponse.data.totalMessages || 0}`);
        console.log(`   New messages: ${checkResponse.data.newMessages?.length || 0}`);
        
        if (checkResponse.data.newMessages) {
            const aiMessages = checkResponse.data.newMessages.filter(msg => msg.isFromAI);
            console.log(`   AI responses: ${aiMessages.length}`);
            
            if (aiMessages.length > 1) {
                console.log('❌ DUPLICATE DETECTED: Multiple AI responses found');
                aiMessages.forEach((msg, index) => {
                    console.log(`   AI Response ${index + 1}: ${msg.body.substring(0, 100)}...`);
                });
            } else {
                console.log('✅ NO DUPLICATES: Only one AI response found');
            }
        }
        
    } catch (error) {
        console.error('❌ Error during test:', error.response?.data || error.message);
    }
}

// Run the test
testWidgetDuplication();
