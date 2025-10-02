// Script simple para probar las APIs de permisos
// Este archivo se puede ejecutar directamente en el navegador en la consola

console.log('🧪 Testing User Permissions APIs');

// Función helper para hacer peticiones autenticadas
async function testAPI(url, method = 'GET', body = null) {
    const token = localStorage.getItem('authToken');
    if (!token) {
        console.error('❌ No auth token found in localStorage');
        return null;
    }

    const options = {
        method: method,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url, options);
        const data = await response.json();
        console.log(`${response.ok ? '✅' : '❌'} ${method} ${url}:`, data);
        return data;
    } catch (error) {
        console.error(`❌ Error testing ${url}:`, error);
        return null;
    }
}

// Test 1: Obtener usuarios con permisos
async function testGetUsersWithPermissions() {
    console.log('\n📋 Test 1: Get Users with Permissions');
    return await testAPI('/api/admin/users/permissions');
}

// Test 2: Obtener permisos de un usuario específico
async function testGetUserPermissions(userId) {
    console.log(`\n🛡️ Test 2: Get User ${userId} Permissions`);
    return await testAPI(`/api/admin/users/${userId}/permissions`);
}

// Test 3: Actualizar permisos de un usuario
async function testUpdateUserPermissions(userId, permissions) {
    console.log(`\n🔧 Test 3: Update User ${userId} Permissions`);
    return await testAPI(`/api/admin/users/${userId}/permissions`, 'PUT', { permissions });
}

// Ejecutar todos los tests
async function runAllTests() {
    console.log('🚀 Starting User Permissions API Tests\n');
    
    // Test 1
    const usersResponse = await testGetUsersWithPermissions();
    
    if (usersResponse && usersResponse.success && usersResponse.data.length > 0) {
        const testUser = usersResponse.data[0];
        console.log(`📝 Using test user: ${testUser.username} (ID: ${testUser.id})`);
        
        // Test 2
        await testGetUserPermissions(testUser.id);
        
        // Test 3 - Dar algunos permisos
        const testPermissions = {
            serviceManagement: true,
            ticketControl: true,
            automaticAIDisableRules: false,
            webhookConfiguration: false,
            aiEnabledProjects: false,
            remoteServerIntegration: false
        };
        await testUpdateUserPermissions(testUser.id, testPermissions);
        
        // Verificar cambios
        await testGetUserPermissions(testUser.id);
    } else {
        console.log('⚠️ No users found for testing');
    }
    
    console.log('\n🎉 Tests completed');
}

// Ejecutar automáticamente o llamar manualmente
if (typeof window !== 'undefined') {
    console.log('📋 User Permissions Test Script Loaded');
    console.log('📋 Run: runAllTests() to execute all tests');
    console.log('📋 Or call individual functions like testGetUsersWithPermissions()');
    
    // Hacer funciones disponibles globalmente
    window.testAPI = testAPI;
    window.testGetUsersWithPermissions = testGetUsersWithPermissions;
    window.testGetUserPermissions = testGetUserPermissions;
    window.testUpdateUserPermissions = testUpdateUserPermissions;
    window.runAllTests = runAllTests;
}
