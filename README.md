# Software & Machine Learning Tech Stack

This project is a full-stack, AI-integrated Node.js and React application built to analyze and discuss global carbon emissions data. We leverage a robust Express.js backend, a modern React/TypeScript frontend styled with Tailwind CSS, and an external PostgreSQL database managed via Prisma ORM.

Crucially, this architecture integrates a state-of-the-art Large Language Model (LLM) powered by **Featherless AI** using their OpenAI-compatible endpoint structure. The AI operates as a contextual Agent, utilizing conversational memory stored in PostgreSQL to answer complex climate queries. Data ingestion is handled dynamically via terminal scripts or API triggers pulling directly from Hugging Face's dataset server API.

---

## 🏗️ Technical Architecture & Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React, Vite, TypeScript, Tailwind CSS | High-performance dashboard with side-by-side data tables and AI chat agent interface. |
| **Backend** | Node.js, Express.js, TypeScript | REST API server handling business logic, DB queries, and LLM orchestration. |
| **Database & ORM** | External PostgreSQL, Prisma ORM | Relational schema management for carbon emissions data and persistent LLM chat memory. |
| **AI / ML Inference** | Featherless AI (`Qwen3-32B` via OpenAI SDK) | Contextual agent inference engine with retrieval-augmented memory. |
| **Data Pipeline** | Hugging Face Datasets Server API | Dynamic ingestion of carbon emission datasets without manual file downloads. |
| **CI/CD & Quality** | GitHub Actions, ESLint | Automated linting and code quality checks on pull requests. |

---

## 📂 Project Directory Structure

```text
climate-agent-dashboard/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma       # Database schema (Emission, ChatSession, Message)
│   ├── src/
│   │   ├── server.ts           # Express API server, Prisma, & Featherless AI integration
│   │   └── seed.ts             # Hugging Face dynamic data ingestion script
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx             # Main dashboard UI (Data view + Agent chat)
│   │   └── main.tsx
│   ├── tailwind.config.js
│   ├── package.json
│   └── vite.config.ts
├── .github/
│   └── workflows/
│       └── lint.yml            # GitHub Actions ESLint workflow
└── README.md
