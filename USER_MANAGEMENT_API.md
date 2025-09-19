# User Management API Documentation

## Overview
Complete API for user management in the Movonte AI Assistant System. All endpoints require authentication and most require admin privileges.

## Authentication
All endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### 1. Create User
**POST** `/api/auth/users`

Creates a new user in the system. Requires admin privileges.

**Request Body:**
```json
{
  "username": "string (required)",
  "email": "string (required)",
  "password": "string (required, min 6 characters)",
  "role": "string (optional, 'admin' or 'user', default: 'user')",
  "isActive": "boolean (optional, default: true)"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "newuser",
      "email": "user@example.com",
      "role": "user",
      "isActive": true,
      "createdAt": "2025-01-XX..."
    }
  },
  "message": "User created successfully"
}
```

**Validation Errors (400):**
- Username, email and password are required
- Invalid email format
- Password must be at least 6 characters long
- Role must be either "admin" or "user"
- Username or email already exists

---

### 2. List Users
**GET** `/api/auth/users`

Retrieves a paginated list of users. Requires admin privileges.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `role` (optional): Filter by role ('admin' or 'user')
- `isActive` (optional): Filter by active status (true/false)

**Example:**
```
GET /api/auth/users?page=1&limit=5&role=admin&isActive=true
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "username": "admin",
        "email": "admin@movonte.com",
        "role": "admin",
        "isActive": true,
        "lastLogin": "2025-01-XX...",
        "createdAt": "2025-01-XX..."
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 5,
      "total": 10,
      "pages": 2
    }
  },
  "count": 10
}
```

---

### 3. Get User by ID
**GET** `/api/auth/users/:id`

Retrieves a specific user by ID. Requires admin privileges.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@movonte.com",
      "role": "admin",
      "isActive": true,
      "lastLogin": "2025-01-XX...",
      "createdAt": "2025-01-XX...",
      "updatedAt": "2025-01-XX..."
    }
  }
}
```

**Error (404):**
```json
{
  "success": false,
  "error": "User not found"
}
```

---

### 4. Update User
**PUT** `/api/auth/users/:id`

Updates an existing user. Requires admin privileges.

**Request Body:**
```json
{
  "username": "string (optional)",
  "email": "string (optional)",
  "role": "string (optional, 'admin' or 'user')",
  "isActive": "boolean (optional)",
  "password": "string (optional, min 6 characters)"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "updateduser",
      "email": "updated@example.com",
      "role": "admin",
      "isActive": true,
      "lastLogin": "2025-01-XX...",
      "updatedAt": "2025-01-XX..."
    }
  },
  "message": "User updated successfully"
}
```

**Validation Errors (400):**
- Invalid email format
- Email already exists
- Username already exists
- Role must be either "admin" or "user"
- Password must be at least 6 characters long

---

### 5. Delete User
**DELETE** `/api/auth/users/:id`

Deletes a user from the system. Requires admin privileges.

**Response (200):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

**Error (400):**
```json
{
  "success": false,
  "error": "Cannot delete the last admin user"
}
```

**Error (404):**
```json
{
  "success": false,
  "error": "User not found"
}
```

---

### 6. Change Password
**POST** `/api/auth/users/:id/change-password`

Changes a user's password. Users can change their own password, admins can change any password.

**Request Body:**
```json
{
  "currentPassword": "string (required)",
  "newPassword": "string (required, min 6 characters)"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Validation Errors (400):**
- Current password and new password are required
- New password must be at least 6 characters long
- Current password is incorrect

---

## Error Responses

### Authentication Errors (401)
```json
{
  "success": false,
  "error": "Access token required"
}
```

### Authorization Errors (403)
```json
{
  "success": false,
  "error": "Admin access required"
}
```

### Server Errors (500)
```json
{
  "success": false,
  "error": "Internal server error"
}
```

---

## Usage Examples

### Create a new admin user
```bash
curl -X POST https://chat.movonte.com/api/auth/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "username": "newadmin",
    "email": "newadmin@movonte.com",
    "password": "securepassword123",
    "role": "admin"
  }'
```

### List all users with pagination
```bash
curl -X GET "https://chat.movonte.com/api/auth/users?page=1&limit=10" \
  -H "Authorization: Bearer <admin-token>"
```

### Update user information
```bash
curl -X PUT https://chat.movonte.com/api/auth/users/2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "username": "updateduser",
    "email": "updated@example.com",
    "role": "user",
    "isActive": true
  }'
```

### Change user password
```bash
curl -X POST https://chat.movonte.com/api/auth/users/2/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <user-token>" \
  -d '{
    "currentPassword": "oldpassword123",
    "newPassword": "newpassword456"
  }'
```

### Delete a user
```bash
curl -X DELETE https://chat.movonte.com/api/auth/users/2 \
  -H "Authorization: Bearer <admin-token>"
```

---

## Security Features

1. **Password Hashing**: All passwords are automatically hashed using bcrypt
2. **JWT Authentication**: Secure token-based authentication
3. **Role-based Access**: Different permissions for admin and user roles
4. **Input Validation**: Comprehensive validation for all inputs
5. **Duplicate Prevention**: Username and email uniqueness enforced
6. **Admin Protection**: Cannot delete the last admin user
7. **Password Verification**: Current password required for password changes

---

## Database Schema

The user management system uses the following database table:

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
  isActive BOOLEAN NOT NULL DEFAULT TRUE,
  lastLogin DATETIME NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL
);
```

---

*This API is part of the Movonte AI Assistant System. For technical support, contact the development team.*
