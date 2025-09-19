import bcrypt from 'bcrypt';
import { User } from '../models';
import { sequelize } from '../config/database';

async function createAdminUser() {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Sync models to create tables
    await sequelize.sync();
    console.log('✅ Database tables synchronized');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({
      where: { username: 'admin' }
    });

    if (existingAdmin) {
      console.log('⚠️  Admin user already exists');
      return;
    }

    // Create admin user
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash('admin123', saltRounds);

    const adminUser = await User.create({
      username: 'admin',
      email: 'admin@movonte.com',
      password: hashedPassword,
      role: 'admin',
      isActive: true
    });

    console.log('✅ Admin user created successfully:');
    console.log(`   Username: admin`);
    console.log(`   Email: admin@movonte.com`);
    console.log(`   Password: admin123`);
    console.log(`   Role: admin`);

    // Create a regular user for testing
    const testUser = await User.create({
      username: 'user',
      email: 'user@movonte.com',
      password: await bcrypt.hash('user123', saltRounds),
      role: 'user',
      isActive: true
    });

    console.log('✅ Test user created successfully:');
    console.log(`   Username: user`);
    console.log(`   Email: user@movonte.com`);
    console.log(`   Password: user123`);
    console.log(`   Role: user`);

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the script
createAdminUser();
