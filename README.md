# SmartStay - Hotel ERP System

An integrated ERP system for dynamic hotel room management and analytics.
Micro Project at Madhav Institute of Technology and Science (MITS), Gwalior.

Submitted by: Anjali Tomar (BTIT26O1017), Ankit Rajpoot (BTIT26O1018)

Submitted to: Dr. Sanjiv Sharma

## Live links
- Website: https://smartstay-green.vercel.app
- API health check: https://smartstay-akup.onrender.com/api/health

The backend runs on a free server, so the first request after a pause can take about a minute.

## Features
- Guest registration and login (JWT) with guest and admin roles
- Room search, booking and double-booking prevention
- Admin dashboard: rooms, all bookings, check-in/check-out, reports
- Chatbot that answers questions about rooms, prices and booking from live data
- Security: Helmet, login rate limit, input sanitizing, bcrypt password hashing
- Automated tests (Jest and Supertest) and CI with GitHub Actions

## Tech stack
- Frontend: React (Vite)
- Backend: Node.js, Express
- Database: PostgreSQL (Neon) with Prisma ORM
- Deployment: Vercel (frontend), Render (backend), Neon (database)

## Run locally
1. Backend: `cd backend`, then `npm install`
2. Copy `.env.example` to `.env` and fill in your values
3. `npx prisma migrate deploy`, then `npx prisma db seed`
4. `npm run dev` (runs on port 5000)
5. Frontend: open a new terminal, `cd frontend`, `npm install`, `npm run dev`
6. Open http://localhost:5173

## Run the tests
`cd backend`, then `npm test`

The admin account is created by the seed script (`backend/prisma/seed.js`).
