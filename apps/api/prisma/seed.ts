import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const hashedPassword = await bcrypt.hash('Admin@123', 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@smarttable.uz' },
    update: {},
    create: {
      email: 'admin@smarttable.uz',
      phone: '+998900000000',
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: UserRole.SUPER_ADMIN,
      isActive: true,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  console.log(`Super Admin created: ${superAdmin.email}`);

  const ownerPassword = await bcrypt.hash('Owner@123', 10);
  const owner = await prisma.user.upsert({
    where: { email: 'owner@smarttable.uz' },
    update: {},
    create: {
      email: 'owner@smarttable.uz',
      phone: '+998901111111',
      password: ownerPassword,
      firstName: 'Restaurant',
      lastName: 'Owner',
      role: UserRole.RESTAURANT_OWNER,
      isActive: true,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  console.log(`Owner created: ${owner.email}`);

  const restaurant = await prisma.restaurant.upsert({
    where: { slug: 'oasis-restaurant' },
    update: {},
    create: {
      name: 'Oasis Restaurant',
      slug: 'oasis-restaurant',
      description: 'Fine dining experience in the heart of Tashkent',
      phone: '+998901234567',
      email: 'info@oasis.uz',
      address: '123 Navoi Street, Tashkent',
      city: 'Tashkent',
      country: 'Uzbekistan',
      currency: 'UZS',
      timezone: 'Asia/Tashkent',
      ownerId: owner.id,
      isActive: true,
    },
  });

  console.log(`Restaurant created: ${restaurant.name}`);

  const branch = await prisma.branch.upsert({
    where: { id: 1 },
    update: {},
    create: {
      restaurantId: restaurant.id,
      name: 'Main Branch',
      address: '123 Navoi Street, Tashkent',
      phone: '+998901234567',
      latitude: 41.2995,
      longitude: 69.2401,
      isActive: true,
      workingHours: {
        monday: { open: '09:00', close: '23:00' },
        tuesday: { open: '09:00', close: '23:00' },
        wednesday: { open: '09:00', close: '23:00' },
        thursday: { open: '09:00', close: '23:00' },
        friday: { open: '09:00', close: '00:00' },
        saturday: { open: '10:00', close: '00:00' },
        sunday: { open: '10:00', close: '22:00' },
      },
    },
  });

  console.log(`Branch created: ${branch.name}`);

  const tables = [];
  for (let i = 1; i <= 10; i++) {
    const table = await prisma.restaurantTable.upsert({
      where: { id: i },
      update: {},
      create: {
        restaurantId: restaurant.id,
        branchId: branch.id,
        number: i,
        name: `Table ${i}`,
        capacity: i <= 4 ? 2 : i <= 8 ? 4 : 6,
        isActive: true,
      },
    });
    tables.push(table);
  }

  console.log(`${tables.length} tables created`);

  const mainCategory = await prisma.category.upsert({
    where: { id: 1 },
    update: {},
    create: {
      restaurantId: restaurant.id,
      name: 'Main Dishes',
      description: 'Our signature main courses',
      sortOrder: 1,
      isActive: true,
    },
  });

  const appetizerCategory = await prisma.category.upsert({
    where: { id: 2 },
    update: {},
    create: {
      restaurantId: restaurant.id,
      name: 'Appetizers',
      description: 'Start your meal right',
      sortOrder: 0,
      isActive: true,
    },
  });

  const drinksCategory = await prisma.category.upsert({
    where: { id: 3 },
    update: {},
    create: {
      restaurantId: restaurant.id,
      name: 'Drinks',
      description: 'Refreshing beverages',
      sortOrder: 2,
      isActive: true,
    },
  });

  console.log('Categories created');

  const products = [
    {
      restaurantId: restaurant.id,
      categoryId: mainCategory.id,
      name: 'Plov',
      description: 'Traditional Uzbek rice pilaf with lamb',
      price: 45000,
      preparationTime: 30,
      calories: 650,
      sortOrder: 1,
    },
    {
      restaurantId: restaurant.id,
      categoryId: mainCategory.id,
      name: 'Shashlik',
      description: 'Grilled lamb skewers with fresh herbs',
      price: 35000,
      preparationTime: 25,
      calories: 450,
      sortOrder: 2,
    },
    {
      restaurantId: restaurant.id,
      categoryId: mainCategory.id,
      name: 'Lagman',
      description: 'Hand-pulled noodle soup with vegetables',
      price: 38000,
      preparationTime: 20,
      calories: 520,
      sortOrder: 3,
    },
    {
      restaurantId: restaurant.id,
      categoryId: appetizerCategory.id,
      name: 'Samsa',
      description: 'Baked pastry filled with meat and onions',
      price: 15000,
      preparationTime: 15,
      calories: 300,
      sortOrder: 1,
    },
    {
      restaurantId: restaurant.id,
      categoryId: drinksCategory.id,
      name: 'Green Tea',
      description: 'Traditional Uzbek green tea',
      price: 8000,
      preparationTime: 5,
      calories: 0,
      sortOrder: 1,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { id: products.indexOf(product) + 1 },
      update: {},
      create: product,
    });
  }

  console.log(`${products.length} products created`);

  const freePlan = await prisma.subscriptionPlan.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Free',
      description: 'Get started with basic features',
      price: 0,
      currency: 'UZS',
      interval: 'monthly',
      maxBranches: 1,
      maxTables: 5,
      maxProducts: 20,
      maxEmployees: 3,
      features: { qrOrdering: true, basicAnalytics: true },
      sortOrder: 0,
      isActive: true,
    },
  });

  const proPlan = await prisma.subscriptionPlan.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: 'Pro',
      description: 'Everything you need to grow',
      price: 199000,
      currency: 'UZS',
      interval: 'monthly',
      maxBranches: 5,
      maxTables: 50,
      maxProducts: 200,
      maxEmployees: 20,
      features: {
        qrOrdering: true,
        advancedAnalytics: true,
        notifications: true,
        multiplePayments: true,
      },
      sortOrder: 1,
      isActive: true,
    },
  });

  const enterprisePlan = await prisma.subscriptionPlan.upsert({
    where: { id: 3 },
    update: {},
    create: {
      name: 'Enterprise',
      description: 'Unlimited access for large operations',
      price: 499000,
      currency: 'UZS',
      interval: 'monthly',
      maxBranches: 999,
      maxTables: 999,
      maxProducts: 999,
      maxEmployees: 999,
      features: {
        qrOrdering: true,
        advancedAnalytics: true,
        notifications: true,
        multiplePayments: true,
        apiAccess: true,
        prioritySupport: true,
        customBranding: true,
      },
      sortOrder: 2,
      isActive: true,
    },
  });

  console.log('Subscription plans created');

  const adminRole = await prisma.role.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Admin',
      description: 'Full access to restaurant management',
      isSystem: true,
    },
  });

  const managerRole = await prisma.role.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: 'Manager',
      description: 'Restaurant manager with limited admin access',
      isSystem: true,
    },
  });

  const waiterRole = await prisma.role.upsert({
    where: { id: 3 },
    update: {},
    create: {
      name: 'Waiter',
      description: 'Table service and order management',
      isSystem: true,
    },
  });

  const chefRole = await prisma.role.upsert({
    where: { id: 4 },
    update: {},
    create: {
      name: 'Chef',
      description: 'Kitchen order management',
      isSystem: true,
    },
  });

  const cashierRole = await prisma.role.upsert({
    where: { id: 5 },
    update: {},
    create: {
      name: 'Cashier',
      description: 'Payment processing',
      isSystem: true,
    },
  });

  console.log('Roles created');

  const permissions = [
    { name: 'orders.create', description: 'Create orders', module: 'orders', action: 'create' },
    { name: 'orders.read', description: 'View orders', module: 'orders', action: 'read' },
    { name: 'orders.update', description: 'Update orders', module: 'orders', action: 'update' },
    { name: 'orders.delete', description: 'Delete orders', module: 'orders', action: 'delete' },
    { name: 'products.create', description: 'Create products', module: 'products', action: 'create' },
    { name: 'products.read', description: 'View products', module: 'products', action: 'read' },
    { name: 'products.update', description: 'Update products', module: 'products', action: 'update' },
    { name: 'products.delete', description: 'Delete products', module: 'products', action: 'delete' },
    { name: 'employees.create', description: 'Add employees', module: 'employees', action: 'create' },
    { name: 'employees.read', description: 'View employees', module: 'employees', action: 'read' },
    { name: 'employees.update', description: 'Update employees', module: 'employees', action: 'update' },
    { name: 'employees.delete', description: 'Remove employees', module: 'employees', action: 'delete' },
    { name: 'payments.create', description: 'Process payments', module: 'payments', action: 'create' },
    { name: 'payments.read', description: 'View payments', module: 'payments', action: 'read' },
    { name: 'analytics.read', description: 'View analytics', module: 'analytics', action: 'read' },
    { name: 'settings.read', description: 'View settings', module: 'settings', action: 'read' },
    { name: 'settings.update', description: 'Update settings', module: 'settings', action: 'update' },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    });
  }

  console.log(`${permissions.length} permissions created`);
  console.log('Database seeding completed!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
