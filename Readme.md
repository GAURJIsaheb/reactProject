# Offline-First Todo App (React + Express + MongoDB + IndexedDB)

A full-stack offline-first task manager built with **React (TypeScript)**, **Express**, **MongoDB**, and **IndexedDB**.
The system is designed like a production-grade sync engine where local storage is the primary database and the server acts as a secondary sync layer.

---

## Architecture Overview

This project follows an **offline-first distributed frontend architecture**.

**Frontend (React + TS)**

* React with custom hooks
* Zustand for global auth state
* IndexedDB for local storage (primary source of truth)
* Sync queue engine for background server sync

**Backend (Express + MongoDB)**

* JWT authentication
* Task CRUD APIs
* Sync handling endpoints

**Database Layers**

* IndexedDB → primary (offline-first)
* MongoDB → server persistence
* SyncQueue → handles retries & background sync

---

## Tech Stack

**Frontend**

* React + TypeScript
* Zustand (global auth store)
* IndexedDB (`idb` library)
* Custom hooks (task engine)
* Tailwind/CSS modules

**Backend**

* Node.js + Express
* MongoDB
* JWT authentication
* REST APIs

---

## Key Features

### Authentication

* JWT based login
* Token stored in localStorage
* Auth headers attached automatically
* Protected routes

### Offline-First Task System

* Tasks saved locally in IndexedDB first
* Works without internet
* Automatic background sync to server
* Queue retry system for failed requests

### Task Features

* Create task with image
* Edit task + image update
* Toggle complete
* Delete task
* Archive tasks
* Workspace support (personal/professional)


### Sync Engine

* All operations stored in `syncQueue`
* Background retry system
* Prevents duplicate server calls
* Ensures eventual consistency

---



## How the Data Flow Works

### Create Task

1. User creates task
2. Task saved to IndexedDB
3. Task added to sync queue
4. UI updates instantly
5. Background sync sends to server

### Edit Task

1. Edit saved to IndexedDB first
2. Queue updated
3. UI updates instantly
4. Server sync happens in background

### Delete Task

1. Mark deleted in IndexedDB
2. Remove pending updates from queue
3. Add delete job to queue
4. Sync with server later

---

## Custom Hooks

### useTasksEngine()

Main task engine hook handling:

* Task loading
* Create/update/delete
* IndexedDB operations
* Sync queue operations
* Workspace filtering

Used inside Dashboard UI.

---

## Authentication Flow

1. Login request → Express
2. Express creates JWT
3. JWT returned to frontend
4. Stored in Zustand + localStorage
5. Sent in `Authorization` header
6. Server verifies token on each request

---

## Environment Setup

### Backend `.env`

```
MONGO_URI=your_mongo_url
JWT_SECRET=your_secret
PORT=4000
```

### Install & Run

Backend:

```
cd server
npm install
npm start
```

Frontend:

```
cd frontend
npm install
npm run dev
```

---


## Author
Aditya Gaur
Full-stack offline-first architecture experiment

Aditya Gaur
Full-stack offline-first architecture experiment
