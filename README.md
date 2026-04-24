# Online Attendance System (MERN Stack)

A robust, real-time Online Attendance System built with the MERN stack (MongoDB, Express, React, Node.js). This system utilizes cryptographic, rotating QR codes to completely prevent attendance fraud and device fingerprinting to ensure one device per student.

## Features

* **Rotating QR Codes:** The system generates a new QR code token every 5 seconds to prevent students from sharing static screenshots of the code.
* **Role-Based Access:** Dedicated dashboards for `teacher` and `student` roles.
* **Mobile-Optimized Scanner:** Students can scan the QR code using a custom, built-in HTML5 camera scanner with front/rear lens switching.
* **Device Fingerprinting:** The system prevents the same physical device from checking in multiple students for a single session.
* **Real-time Live Updates:** Powered by Socket.IO, attendees appear on the teacher's dashboard the exact second they scan.
* **Attendance History & Exports:** 
  * Teachers can view historical sessions and export attendee rosters to **CSV, Excel (.xlsx), or PDF** formats.
  * Students can securely view their personal attendance log across all their enrolled classes.
* **Modern UI:** Built with Vite and TailwindCSS for a sleek, responsive, Dark/Light mode supported UI.

## Tech Stack

* **Frontend:** React, Vite, TailwindCSS v3.4, React-Router, HTML5-Qrcode, Socket.IO Client, jsPDF, XLSX.
* **Backend:** Node.js, Express, MongoDB (Mongoose), Socket.IO, JWT, BcryptJS.

## Getting Started

### 1. Database Setup
Make sure you have MongoDB installed locally or a cluster available via MongoDB Atlas.

### 2. Backend Setup
```bash
cd backend
npm install
```
Create a `.env` file in the `backend` directory based on the `.env.example`:
```env
MONGO_URI=mongodb://localhost:27017/online-attendance
JWT_SECRET=your_super_secret_key
PORT=5000
```
Start the backend server:
```bash
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```
Create a `.env` file in the `frontend` directory based on the `.env.example`:
```env
VITE_API_URL=http://localhost:5000
```
Start the frontend development server:
```bash
npm run dev
```

## Running Over the Internet

If you need to test the camera or use this in a real classroom, you must expose both servers to the internet using a tool like Cloudflare Tunnels (`cloudflared`) or `ngrok` since modern browsers require **HTTPS** to access the camera:

1. Tunnel your backend port (e.g., `5000`) and copy the HTTPS URL.
2. Put that HTTPS URL into your frontend's `.env` as the `VITE_API_URL`.
3. Tunnel your frontend port (e.g., `5173`) and send that HTTPS URL to your students!
