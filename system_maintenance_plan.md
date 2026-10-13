# System Maintenance Plan
### TrackED Academic Portal

---

### 1. Overview
The **TrackED Academic Portal** is a web-based system hosted on **Vercel** with its database hosted on **Supabase (PostgreSQL)**. 

Since the client school **does not have an in-house MIS (Management Information Systems) or IT staff**, the **system developers (researchers)** will handle all technical maintenance and database backups. Meanwhile, the school's **designated focal person (such as the Department Head or Lead Teacher)** will be oriented on basic day-to-day operations and how to contact the developers if an issue occurs.

---

### 2. Division of Roles

| Role | Person Responsible | Responsibilities |
| :--- | :--- | :--- |
| **Technical Maintenance & Backups** | **Developers (Researchers)** | • Perform database backups (Supabase)<br>• Fix system bugs and errors<br>• Update and maintain the website on Vercel<br>• Restore data if anything is lost |
| **Daily Operations & Monitoring** | **Client Designated Staff** *(Department Head / Teachers)* | • Add/remove students and manage courses<br>• Input attendance, activities, quizzes, and exams<br>• Help users reset passwords<br>• Report technical issues to the developers |

---

### 3. Client Orientation on Maintenance & Operations
*(How the developers will orient/train the school staff)*

Since there is no MIS team, the developers will conduct a simple orientation for the teachers and department head:

1. **System Walkthrough & Daily Use:**
   - How teachers log in, create courses, record attendance, and input grades.
   - How students access their scores and attendance.

2. **First-Line Troubleshooting (Common Fixes):**
   - **Forgotten Passwords:** Show teachers how users can reset passwords via `forgotPassword.html` or update their profile in Settings.
   - **Display / Loading Issues:** Teach staff simple steps like refreshing the page (`Ctrl + F5`), checking the school's internet connection, or using Google Chrome.

3. **End-of-Semester Data Archiving:**
   - Remind teachers to download/print their final grade records and attendance sheets at the end of each grading period before the new semester starts.

4. **Reporting Issues to Developers:**
   - Train staff on what to do if the website encounters an error: take a screenshot of the error, note down the teacher/student ID, and send it to the developers via group chat or email.

---

### 4. Data Backup Plan
To ensure that student grades and attendance records are never lost, the developers will follow a simple 2-step backup procedure:

1. **Automatic Daily Cloud Backup:**
   - Supabase automatically takes a daily backup of the entire database. If an accidental deletion occurs, data can be restored back to that day.
2. **Manual Monthly & Term-End Backup (By Developers):**
   - At the end of every month and at the end of every semester (after Midterms and Finals), the developers will manually export a copy of the database (`.sql` file).
   - This backup file will be saved in two safe places:
     - A secure **Google Drive** folder.
     - An **external USB flash drive / hard drive**.

---

### 5. System Maintenance Activities

The developers will perform four basic types of maintenance:

1. **Fixing Bugs (Corrective Maintenance):**
   - Fixing errors reported by teachers or students (such as wrong grade computations, button glitches, or login problems).
2. **System Updates (Adaptive Maintenance):**
   - Making sure the website works smoothly on updated versions of web browsers (Chrome, Edge, Safari) and mobile phones.
3. **Improvements (Perfective Maintenance):**
   - Making the website faster and improving features based on feedback from teachers and students.
4. **Preventive Checks (Preventive Maintenance):**
   - Checking the database storage on Supabase regularly to ensure there is enough space and that the website stays online 24/7.

---

### 6. Maintenance Schedule

| How Often | What to Do | Who Does It |
| :--- | :--- | :--- |
| **Daily** | Check if the website and database are online and working | Developers |
| **Weekly** | Assist teachers/students who have login or password questions | School Staff |
| **Monthly** | Export and save a manual database backup file | Developers |
| **End of Semester** | Back up all final grades & attendance; save copy to Google Drive | Developers & Staff |
| **As Needed** | Fix any reported bugs or system errors | Developers |
