import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models';

export class AuthController {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  private readonly JWT_EXPIRES_IN = '24h';

  // Login endpoint
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).json({
          success: false,
          error: 'Username and password are required'
        });
        return;
      }

      // Find user by username or email
      const user = await User.findOne({
        where: {
          [require('sequelize').Op.or]: [
            { username: username },
            { email: username }
          ],
          isActive: true
        }
      });

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
        return;
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
        return;
      }

      // Update last login
      await user.update({ lastLogin: new Date() });

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          username: user.username, 
          role: user.role 
        },
        this.JWT_SECRET,
        { expiresIn: this.JWT_EXPIRES_IN }
      );

      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            lastLogin: user.lastLogin
          }
        },
        message: 'Login successful'
      });

    } catch (error) {
      console.error('❌ Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Register endpoint (admin only)
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { username, email, password, role = 'user' } = req.body;

      if (!username || !email || !password) {
        res.status(400).json({
          success: false,
          error: 'Username, email, and password are required'
        });
        return;
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        where: {
          [require('sequelize').Op.or]: [
            { username: username },
            { email: email }
          ]
        }
      });

      if (existingUser) {
        res.status(409).json({
          success: false,
          error: 'User already exists'
        });
        return;
      }

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user
      const user = await User.create({
        username,
        email,
        password: hashedPassword,
        role: role as 'admin' | 'user',
        isActive: true
      });

      res.status(201).json({
        success: true,
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          isActive: user.isActive
        },
        message: 'User created successfully'
      });

    } catch (error) {
      console.error('❌ Registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Verify token endpoint
  async verifyToken(req: Request, res: Response): Promise<void> {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        res.status(401).json({
          success: false,
          error: 'No token provided'
        });
        return;
      }

      const decoded = jwt.verify(token, this.JWT_SECRET) as any;
      
      // Get user info
      const user = await User.findByPk(decoded.userId);
      if (!user || !user.isActive) {
        res.status(401).json({
          success: false,
          error: 'Invalid token'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            lastLogin: user.lastLogin
          }
        }
      });

    } catch (error) {
      console.error('❌ Token verification error:', error);
      res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
  }

  // Logout endpoint
  async logout(req: Request, res: Response): Promise<void> {
    // Since we're using JWT, logout is handled client-side by removing the token
    res.json({
      success: true,
      message: 'Logout successful'
    });
  }
}
