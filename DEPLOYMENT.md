# ZeroDB Deployment Guide

This guide walks you through deploying **ZeroDB** to the web for free. Since ZeroDB is a full-stack project, we split the deployment into hosting the frontend, hosting the backend, setting up the databases, and adjusting credentials.

## Deployment Architecture
*   **Frontend**: React (Vite + Tailwind CSS) deployed to **Vercel** (Free).
*   **Backend**: Node.js (Express + Socket.io) deployed to **Render** (Free Web Services).
*   **Database (NoSQL)**: User data and query history stored on **MongoDB Atlas** (Free M0 Sandbox).
*   **Database (SQL)**: Virtual PostgreSQL connection configured per-user on **Neon.tech** or **Supabase** (Free Serverless Postgres).

---

## Step 1: Create a PostgreSQL Instance (Neon.tech)
ZeroDB dynamically connects to PostgreSQL on a per-user basis. To test the app, you will need a PostgreSQL connection URI to input into the frontend settings.

1. Go to [Neon.tech](https://neon.tech/) and sign up for a free account.
2. Create a new project.
3. In the Neon dashboard, copy your **Connection String** (which looks like `postgres://alex:pwd@ep-cool-lake-123456.us-east-2.aws.neon.tech/neondb?sslmode=require`).
4. Save this URI! You will paste this into the **Settings Modal** on your live website to load and run SQL queries.

---

## Step 2: Set up MongoDB Atlas (Free Tier)
ZeroDB needs a central MongoDB database to manage user authentication, sharing permissions, and query history.

1. Register for a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a new database deployment and select the **M0 (Free)** tier.
3. Under **Database Access**:
   * Create a database user. Remember the password.
4. Under **Network Access**:
   * Click **Add IP Address** and choose **Allow Access From Anywhere** (`0.0.0.0/0`). This is necessary because Render's free tier IPs are dynamic.
5. In the Database deployment list, click **Connect** -> **Drivers (Node.js)**.
6. Copy the connection string. It will look like this:
   ```env
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   ```
7. Replace `<username>` and `<password>` with your created database credentials. This will be your `MONGO_URI`.

---

## Step 3: Deploy the Node.js Backend to Render
1. Sign up/log in to [Render](https://render.com/).
2. Click **New** -> **Web Service**.
3. Link your GitHub account and select your **zeroDB** repository.
4. Set the following configuration values:
   *   **Name**: `zerodb-backend` (or similar)
   *   **Region**: Select the region closest to you
   *   **Branch**: `main` (or your active dev branch)
   *   **Root Directory**: `backend`
   *   **Runtime**: `Node`
   *   **Build Command**: `npm install`
   *   **Start Command**: `npm start` (Runs the script `node ./index.js` we set in package.json)
5. Scroll down to **Environment Variables** and add:
   *   `NODE_ENV` = `production`
   *   `MODE` = `production`
   *   `PORT` = `10000` (Render binds automatically, but good to define)
   *   `MONGO_URI` = *(Your connection string from MongoDB Atlas Step 2)*
   *   `JWT_SECRET` = *(Create a long random string of your choice)*
   *   `ENCRYPTION_KEY` = *(Must be a 64-character hexadecimal key. You can copy the one from your local `.env`)*
   *   `GEMINI_API_KEY` = *(Your Gemini API key from Google AI Studio)*
   *   `GOOGLE_CLIENT_ID` = *(Your Google OAuth client ID)*
6. Click **Deploy Web Service**.
7. Once deployed, copy your service's URL (e.g. `https://zerodb-backend.onrender.com`).

> [!NOTE]
> Render's free tier web services automatically spin down after 15 minutes of inactivity. When you visit the app after a while, it can take up to 50 seconds for the backend to start up. This is normal for free hosting!

---

## Step 4: Deploy the React Frontend to Vercel
1. Log in to [Vercel](https://vercel.com/).
2. Click **Add New** -> **Project**.
3. Import your **zeroDB** repository.
4. Next to **Root Directory**, click **Edit** and select the `frontend` folder.
5. In **Framework Preset**, select **Vite** (Vercel should auto-detect this).
6. Under **Environment Variables**, add:
   *   `VITE_API_URL` = *(Your Render backend URL from Step 3, e.g. `https://zerodb-backend.onrender.com`)*
   *   *Note: Do **NOT** add a trailing slash (no `/` at the end).*
7. Click **Deploy**.
8. Once finished, Vercel will give you a live production URL (e.g. `https://zerodb-frontend.vercel.app`).

---

## Step 5: Update Google OAuth Credentials
Since ZeroDB uses Google Log In, Google's security guidelines require you to register your live production domain. If you do not do this, Google Log In will fail in production.

1. Go to the [Google Cloud Console Credentials Page](https://console.cloud.google.com/apis/credentials).
2. Click on your active OAuth 2.0 Client ID.
3. Under **Authorized JavaScript origins**, click **Add URI** and paste:
   *   `http://localhost:5173` (for local development)
   *   `https://zerodb-frontend.vercel.app` (your Vercel production URL)
4. Under **Authorized redirect URIs**, click **Add URI** and paste:
   *   `http://localhost:5173`
   *   `https://zerodb-frontend.vercel.app`
5. Click **Save**. *It can take 5-10 minutes for Google to update these origins globally.*

---

## Post-Deployment Checklist
- [ ] Visit your Vercel URL.
- [ ] Log in with Google.
- [ ] Check if the backend spins up successfully (monitor Render logs).
- [ ] Enter your Neon/Supabase connection string in the Settings Modal to verify remote database querying.
- [ ] Generate some mock tables and write custom SQL scripts to test the compiler.
