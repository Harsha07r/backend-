import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';

let app, Admin, Booking, Tour, mongod;

const PASSWORD = 'Str0ngPassword!';
const XHR = { 'X-Requested-With': 'XMLHttpRequest' };

const futureDate = () => new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.NODE_ENV = 'test';
  process.env.MONGO_URI = mongod.getUri();
  process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123';
  await mongoose.connect(process.env.MONGO_URI);
  ({ default: app } = await import('../app.js'));
  ({ default: Admin } = await import('../models/Admin.js'));
  ({ default: Booking } = await import('../models/Booking.js'));
  ({ default: Tour } = await import('../models/Tour.js'));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await Promise.all([Admin.deleteMany(), Booking.deleteMany(), Tour.deleteMany()]);
});

const makeAdmin = (role, name = role) =>
  Admin.create({ username: name, email: `${name}@example.com`, password: PASSWORD, role });

// Logs in and returns a supertest agent that keeps the session cookies.
const loginAs = async (role) => {
  await makeAdmin(role);
  const agent = request.agent(app);
  const res = await agent.post('/api/admin/login').send({ email: `${role}@example.com`, password: PASSWORD });
  expect(res.status).toBe(200);
  return agent;
};

const tourPayload = (over = {}) => ({
  title: 'Ladakh Highlights',
  destination: 'Ladakh',
  category: 'Adventure',
  durationDays: 6,
  summary: 'Six days across passes, monasteries and lakes.',
  ...over,
});

describe('health + hardening', () => {
  it('reports health and sets security headers', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('rejects malformed JSON with 400, not 500', async () => {
    const res = await request(app).post('/api/contact').set('Content-Type', 'application/json').send('{bad');
    expect(res.status).toBe(400);
  });

  it('has no public admin registration any more', async () => {
    const res = await request(app)
      .post('/api/admin/register')
      .send({ username: 'evil', email: 'evil@example.com', password: PASSWORD, role: 'superadmin' });
    // 401 (blocked by the auth gate) or 404 are both fine; what matters is that nothing is created.
    expect([401, 404]).toContain(res.status);
    expect(await Admin.countDocuments()).toBe(0);
  });
});

describe('admin auth + RBAC', () => {
  it('rejects wrong credentials and unauthenticated access', async () => {
    await makeAdmin('manager');
    const bad = await request(app).post('/api/admin/login').send({ email: 'manager@example.com', password: 'nope' });
    expect(bad.status).toBe(401);
    expect((await request(app).get('/api/bookings')).status).toBe(401);
  });

  it('logs in with httpOnly cookies and returns no token in the body', async () => {
    await makeAdmin('manager');
    const res = await request(app).post('/api/admin/login').send({ email: 'manager@example.com', password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeUndefined();
    expect(res.headers['set-cookie'].every((c) => c.includes('HttpOnly'))).toBe(true);
  });

  it('requires the CSRF header for cookie-authenticated writes', async () => {
    const agent = await loginAs('superadmin');
    const body = { username: 'sam', email: 'sam@example.com', password: PASSWORD, role: 'support' };
    expect((await agent.post('/api/admin/staff').send(body)).status).toBe(403);
    expect((await agent.post('/api/admin/staff').set(XHR).send(body)).status).toBe(201);
  });

  it('only superadmins can manage staff', async () => {
    const support = await loginAs('support');
    const res = await support
      .post('/api/admin/staff')
      .set(XHR)
      .send({ username: 'x1x', email: 'x@example.com', password: PASSWORD, role: 'superadmin' });
    expect(res.status).toBe(403);
  });

  it('treats the legacy "admin" role as manager', async () => {
    const agent = await loginAs('admin');
    const res = await agent.post('/api/tours/admin').set(XHR).send(tourPayload());
    expect(res.status).toBe(201);
    expect((await agent.get('/api/admin/staff')).status).toBe(403);
  });

  it('refuses to demote the last super admin', async () => {
    const agent = await loginAs('superadmin');
    const me = await Admin.findOne({ role: 'superadmin' });
    const res = await agent.patch(`/api/admin/staff/${me._id}`).set(XHR).send({ role: 'support' });
    expect(res.status).toBe(400);
  });

  it('invalidates sessions when an account is deactivated', async () => {
    const boss = await loginAs('superadmin');
    const support = await loginAs('support');
    const target = await Admin.findOne({ role: 'support' });
    await boss.patch(`/api/admin/staff/${target._id}`).set(XHR).send({ isActive: false });
    expect((await support.get('/api/bookings')).status).toBe(401);
  });
});

describe('enquiries (bookings)', () => {
  const payload = (over = {}) => ({
    tourId: 'ladakh-highlights',
    tourName: 'Ladakh Highlights',
    fullName: 'Asha Rao',
    email: 'Asha@Example.com',
    phone: '+91 98765 43210',
    travelDate: futureDate(),
    numberOfPeople: 2,
    ...over,
  });

  it('accepts a valid enquiry and normalises the email', async () => {
    const res = await request(app).post('/api/bookings').send(payload());
    expect(res.status).toBe(201);
    const saved = await Booking.findOne();
    expect(saved.email).toBe('asha@example.com');
    expect(saved.status).toBe('Pending');
  });

  it('rejects past dates, bad emails and oversized groups', async () => {
    for (const bad of [{ travelDate: '2020-01-01' }, { email: 'nope' }, { numberOfPeople: 500 }]) {
      const res = await request(app).post('/api/bookings').send(payload(bad));
      expect(res.status).toBe(400);
    }
    expect(await Booking.countDocuments()).toBe(0);
  });

  it('silently drops honeypot submissions', async () => {
    const res = await request(app).post('/api/bookings').send(payload({ website: 'http://spam.example' }));
    expect(res.status).toBe(201);
    expect(await Booking.countDocuments()).toBe(0);
  });

  it('lets support list and update, with notes and contactedAt', async () => {
    await request(app).post('/api/bookings').send(payload());
    const agent = await loginAs('support');

    const list = await agent.get('/api/bookings?status=Pending');
    expect(list.status).toBe(200);
    expect(list.body.stats.pending).toBe(1);

    const id = list.body.bookings[0]._id;
    const upd = await agent.patch(`/api/bookings/${id}`).set(XHR).send({ status: 'Contacted' });
    expect(upd.body.booking.status).toBe('Contacted');
    expect(upd.body.booking.contactedAt).toBeTruthy();

    const note = await agent.post(`/api/bookings/${id}/notes`).set(XHR).send({ text: 'Called, wants May' });
    expect(note.body.booking.notes[0].by).toBe('support');

    const legacy = await agent.put(`/api/bookings/${id}/status`).set(XHR).send({ status: 'Confirmed' });
    expect(legacy.body.booking.status).toBe('Confirmed');
  });

  it('rejects unknown statuses', async () => {
    await request(app).post('/api/bookings').send(payload());
    const agent = await loginAs('manager');
    const id = (await Booking.findOne())._id;
    const res = await agent.patch(`/api/bookings/${id}`).set(XHR).send({ status: 'Hacked' });
    expect(res.status).toBe(400);
  });

  it('treats search text literally (no regex injection)', async () => {
    await request(app).post('/api/bookings').send(payload());
    const agent = await loginAs('support');
    const res = await agent.get('/api/bookings').query({ q: '.*' });
    expect(res.status).toBe(200);
    expect(res.body.bookings).toHaveLength(0);
  });
});

describe('tours API', () => {
  it('serves published tours publicly and hides drafts', async () => {
    await Tour.create([
      { ...tourPayload(), slug: 'ladakh-highlights' },
      { ...tourPayload({ title: 'Secret Draft' }), slug: 'secret-draft', isPublished: false },
    ]);

    const list = await request(app).get('/api/tours');
    expect(list.body.tours.map((t) => t.slug)).toEqual(['ladakh-highlights']);
    expect(list.headers['cache-control']).toContain('s-maxage');

    expect((await request(app).get('/api/tours/ladakh-highlights')).status).toBe(200);
    expect((await request(app).get('/api/tours/secret-draft')).status).toBe(404);

    const slugs = await request(app).get('/api/tours/slugs');
    expect(slugs.body.tours).toHaveLength(1);
  });

  it('lets managers create (auto slug) and blocks support', async () => {
    const manager = await loginAs('manager');
    const created = await manager.post('/api/tours/admin').set(XHR).send(tourPayload());
    expect(created.status).toBe(201);
    expect(created.body.tour.slug).toBe('ladakh-highlights');

    const dupe = await manager.post('/api/tours/admin').set(XHR).send(tourPayload());
    expect(dupe.status).toBe(409);

    const support = await loginAs('support');
    expect((await support.post('/api/tours/admin').set(XHR).send(tourPayload())).status).toBe(403);
  });

  it('validates tour input', async () => {
    const manager = await loginAs('manager');
    const res = await manager.post('/api/tours/admin').set(XHR).send(tourPayload({ category: 'Nonsense', durationDays: 0 }));
    expect(res.status).toBe(400);
    expect(res.body.details.length).toBeGreaterThan(0);
  });
});
