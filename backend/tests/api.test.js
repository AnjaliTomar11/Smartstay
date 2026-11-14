const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/prisma');

const uniqueId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

describe('SmartStay API', () => {
  let guest;
  let room;
  let token;
  let testEmail;
  const registeredUserIds = [];

  beforeAll(async () => {
    testEmail = `jest-${uniqueId()}@example.com`;
    const registration = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Jest Guest', email: testEmail, password: 'TestPass123!' });

    expect(registration.status).toBe(201);
    guest = registration.body.user;

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'TestPass123!' });

    expect(login.status).toBe(200);
    token = login.body.token;

    room = await prisma.room.create({
      data: {
        roomNumber: `J${Date.now()}${Math.floor(Math.random() * 1000)}`,
        pricePerNight: 2500,
        capacity: 2,
      },
    });
  });

  afterAll(async () => {
    if (room && guest) {
      await prisma.booking.deleteMany({
        where: { OR: [{ roomId: room.id }, { guestId: guest.id }] },
      });
      await prisma.room.delete({ where: { id: room.id } });
    }
    if (guest) {
      await prisma.user.delete({ where: { id: guest.id } });
    }
    if (registeredUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: registeredUserIds } } });
    }
    await prisma.$disconnect();
  });

  test('registers a guest', async () => {
    const email = `register-${uniqueId()}@example.com`;
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'New Jest Guest',
        email,
        password: 'TestPass123!',
      });

    expect(response.status).toBe(201);
    expect(response.body.user.role).toBe('GUEST');
    expect(response.body.user).not.toHaveProperty('passwordHash');
    registeredUserIds.push(response.body.user.id);
  });

  test('logs in with the correct password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'TestPass123!' });

    expect(response.status).toBe(200);
    expect(response.body.token).toEqual(expect.any(String));
  });

  test('rejects login with the wrong password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'WrongPass123!' });

    expect(response.status).toBe(401);
  });

  test('does not authenticate a SQL injection payload as an existing user', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: "' OR 1=1 --", password: 'anything123!' });

    expect(response.status).toBe(401);
    expect(response.body).not.toHaveProperty('token');
  });

  test('escapes HTML angle brackets in registered text but preserves passwords', async () => {
    const email = `xss-${uniqueId()}@example.com`;
    const password = '<script>alert(1)</script>';
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: '<img src=x onerror=alert(1)>',
        email,
        password,
      });

    expect(response.status).toBe(201);
    expect(response.body.user.name).toBe('&lt;img src=x onerror=alert(1)&gt;');
    registeredUserIds.push(response.body.user.id);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email, password });

    expect(login.status).toBe(200);
    expect(login.body.token).toEqual(expect.any(String));
  });

  test('lists rooms', async () => {
    const response = await request(app).get('/api/rooms');

    expect(response.status).toBe(200);
    expect(response.body.rooms).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: room.id }),
    ]));
  });

  test('blocks booking requests without a token', async () => {
    const response = await request(app)
      .post('/api/bookings')
      .send({ roomId: room.id, checkInDate: '2099-01-01', checkOutDate: '2099-01-02' });

    expect(response.status).toBe(401);
  });

  test('prevents two bookings for the same room and dates', async () => {
    const checkInDate = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
    const checkOutDate = new Date(Date.now() + 12 * 86400000).toISOString().slice(0, 10);
    const payload = { roomId: room.id, checkInDate, checkOutDate };

    const first = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);
    const second = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
  });

  test('blocks a guest from admin-only routes', async () => {
    const response = await request(app)
      .post('/api/auth/staff')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Unauthorized Staff',
        email: `staff-${uniqueId()}@example.com`,
        password: 'TestPass123!',
        role: 'MANAGER',
      });

    expect(response.status).toBe(403);
  });
    it('chatbot answers about availability', async () => {
    const res = await request(app)
      .post('/api/chatbot')
      .send({ message: 'are rooms available?' });
    expect(res.statusCode).toBe(200);
    expect(res.body.reply).toBeDefined();
  });
});
