# TerraSkuy - Terabox Direct Downloader

TerraSkuy is a modern web application designed to bypass Terabox share links and generate direct download links. It consists of a sleek Next.js frontend and a high-performance Python Flask backend.

## 🚀 Features

- **Direct Download**: Generate high-speed direct download links for Terabox files.
- **Multiple Domain Support**: Supports `terabox.com`, `1024tera.com`, `4funbox.com`, and more.
- **Modern UI**: Built with Next.js 14, Tailwind CSS, and Framer Motion for a premium user experience.
- **Local Backend**: Uses a dedicated Python API gateway for reliable link extraction.

## 🛠️ Project Structure

- `src/`: Next.js frontend application.
- `terabox-gateway/`: Python Flask backend API.

## 📋 Prerequisites

- **Node.js 18+**
- **Python 3.10+**
- **Git**

## ⚙️ Setup & Installation

### 1. Backend Setup (Python)

Navigate to the root directory and clone the backend repository:

```bash
git clone https://github.com/saahiyo/terabox-gateway.git
cd terabox-gateway
```

Install dependencies:

```bash
pip install -r requirements.txt
pip install python-dotenv
```

Configure environment variables:
1. Copy `.env.example` to `.env`.
2. Open `.env` and fill in your `COOKIE_JSON` with your Terabox `ndus` token.

Run the backend:

```bash
python main.py
```
The backend will run on `http://localhost:5000`.

### 2. Frontend Setup (Next.js)

In the root directory, install the frontend dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`.

## 📝 Environment Variables

### Frontend
- `TERABOX_API_URL`: URL of the local Python backend (default: `http://localhost:5000`).

### Backend
- `COOKIE_JSON`: Your Terabox session cookies (containing `ndus` token).

## 🛡️ Disclaimer

This project is for educational purposes only. Please respect Terabox's terms of service.
