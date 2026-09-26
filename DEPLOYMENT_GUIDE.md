# 🚀 TrackED Academic Portal - Backend & Deployment Guide

This guide walks you through setting up your **100% Free Cloud Backend (Supabase PostgreSQL)** and deploying the portal to a **Free Public Domain with HTTPS (Vercel)**.

---

## 🏛️ System Architecture (For Thesis Defense)

| Component | Technology | Why Chosen for Defense? |
| :--- | :--- | :--- |
| **Frontend** | HTML5, CSS3, JavaScript ES6+ | Lightweight, fast loading, responsive on mobile and desktops. |
| **Cloud Database** | **PostgreSQL (Supabase)** | Enterprise-grade relational database with foreign keys, constraints, and 24/7 zero-sleep uptime. |
| **Hosting & Domain** | **Vercel Global Edge** | Free SSL (HTTPS), instant global CDN, no server maintenance, free subdomain (`.vercel.app`). |
| **Data Safety** | Hybrid (Cloud + Local Fallback) | Even if the defense venue has Wi-Fi problems, the portal falls back seamlessly to local storage without crashing. |

---

## 📋 Step 1: Set Up Supabase Cloud Database (3 Minutes)

1. Go to **[supabase.com](https://supabase.com)** and sign up for a free account (using GitHub or Email).
2. Click **New Project**:
   - **Name**: `TrackED`
   - **Database Password**: Choose any secure password.
   - **Region**: Choose the closest region (e.g. `Southeast Asia (Singapore)`).
   - **Pricing Plan**: Free ($0/month).
3. Once your project is ready (about 1–2 minutes):
   - On the left sidebar, click **SQL Editor** (icon with `>_`).
   - Click **+ New query**.
   - Open [`database/tracked_schema.sql`](./database/tracked_schema.sql) in this project, copy all text, paste it into the editor, and click the green **Run** button.
   - ✅ *All 11 tables (`teachers`, `students`, `courses`, `activities`, `quizzes`, `exams`, `attendance`, etc.) and seed data are now live in the cloud!*
4. Get your API Keys:
   - On the left sidebar, click the **Settings (Gear Icon)** -> **API**.
   - Find:
     - **Project URL** (e.g., `https://xyzabcdefg.supabase.co`)
     - **Project API keys** -> copy the **`anon` `public`** key.
5. Paste them into [`js/supabaseClient.js`](./js/supabaseClient.js):
   ```javascript
   const SUPABASE_CONFIG = {
       url: "YOUR_PROJECT_URL_HERE",
       anonKey: "YOUR_ANON_PUBLIC_KEY_HERE"
   };
   ```

---

## 🌐 Step 2: Deploy to Vercel (Free Public Domain with HTTPS)

1. Go to **[vercel.com](https://vercel.com)** and create a free account with GitHub or Email.
2. In your dashboard, click **Add New...** -> **Project**.
3. Choose either:
   - **Option A (GitHub Repository)**: Push this folder to your GitHub and click "Import" in Vercel.
   - **Option B (Vercel CLI / Drag and Drop)**: Install Vercel CLI via terminal (`npm i -g vercel`) and simply type `vercel`, or upload the folder.
4. Click **Deploy**.
5. Within 30 seconds, Vercel will give you a live production URL:
   - Example: `https://tracked-portal.vercel.app`
6. You can now open this link on **any phone, tablet, or laptop from anywhere in the world**!

---

## 🔑 Demo Accounts for Presentation & Defense

| Role | User ID / Username | Password | Notes |
| :--- | :--- | :--- | :--- |
| **Faculty Instructor** | `T-2024-0042` | `teacher123` | Billie Eilish (Full teacher controls, grading, attendance) |
| **Student** | `2024-00123` | `1234` | Billie Eilish (Enrolled in Programming Fundamentals) |
| **Student (Alt 1)** | `2026-001` | `1234` | Juan Dela Cruz |
| **Student (Alt 2)** | `2026-002` | `1234` | Maria Santos |

---

## 🎯 Panelist Defense Q&A Sheet

### Q1: Why did you choose Supabase instead of traditional MySQL/XAMPP or MongoDB?
> **Answer**: *"We chose Supabase because it runs on standard PostgreSQL—an enterprise-grade ACID-compliant relational database. Unlike local XAMPP/MySQL which is restricted to localhost, Supabase provides cloud availability 24/7 so students and teachers can check grades from home or mobile devices. Compared to MongoDB, PostgreSQL enforces relational integrity through foreign keys and cascading rules, preventing orphaned grades or attendance records."*

### Q2: Why did you host on Vercel rather than a shared hosting provider?
> **Answer**: *"Vercel provides edge delivery with automatic HTTPS/TLS security certificates, zero maintenance overhead, and 99.99% uptime. It allows our static frontend to serve with near-zero latency while talking securely to our Supabase database API, keeping hosting costs at zero while maintaining production-level performance."*

### Q3: How do you handle network connectivity loss?
> **Answer**: *"We engineered a hybrid architecture. The portal primarily syncs with the Supabase PostgreSQL cloud, but has an automated local fallback adapter (`supabaseClient.js`). If internet connectivity is interrupted during a classroom session or live demonstration, user operations continue uninterrupted without system crashes."*
