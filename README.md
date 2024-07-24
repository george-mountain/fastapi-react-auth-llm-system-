
## Secure FastAPI-React LLM Authentication System with Rate Limiting

A robust authentication service built with FastAPI, PostgreSQL, and Docker, designed to handle user registration, login, password reset, API Rate limiting, and account activation functionalities.

### Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Architecture](#architecture)
- [Requirements](#requirements)
- [Installation](#installation)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)


### Introduction

This project provides a secure and scalable authentication service using FastAPI, PostgreSQL, and Docker. It supports functionalities such as user registration, login, password reset, api rate limiting and account activation via email.

### Features

- User Registration with email verification
- Login with JWT authentication
- Password reset via email
- Rate limiting to prevent abuse
- Dockerized for easy deployment

### Architecture

- **FastAPI**: High-performance web framework for building APIs.
- **PostgreSQL**: Relational database for storing user data.
- **Docker**: Containerization for consistent development and production environments. (*** ensure you have docker installed.)
- **Redis**: In-memory data structure store, used for rate limiting.

## Requirements

- Docker and Docker Compose
- Python 3.9+
- Redis

## Installation

### Fork or Clone the repository

```bash
git clone https://github.com/george-mountain/fastapi-react-auth-llm-system-.git
cd fastapi-react-auth-llm-system
```

### Environment Variables

Create a `.env` file and set the following environment variables as shown by the example below:

```env
# Email configuration
MAIL_USERNAME=example@gmail.com
MAIL_PASSWORD=your_secure_password
MAIL_FROM=example@gmail.com
MAIL_PORT=587
MAIL_SERVER=smtp.gmail.com

# Application secret keys
SECRET_KEY=change_this_to_a_random_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Database configuration
SQLALCHEMY_DATABASE_URL=postgresql://username:password@hostname/database_name
POSTGRES_DB=your_database_name
POSTGRES_USER=your_database_username
POSTGRES_PASSWORD=your_database_password

# pgAdmin default account settings
PGADMIN_DEFAULT_EMAIL=admin@example.com
PGADMIN_DEFAULT_PASSWORD=change_this_password

# MICROSERVICES PORTS
BACKEND_PORT=8080
REACT_FRONTEND_PORT=3001
POSTGRES_PORT=5433
REDIS_PORT=6379
PGADMIN_PORT=5050
OLLAMA_PORT=11434

# MICROSERVICES URL
FRONTEND_URL=http://127.0.0.1:5173
VITE_API_BASE_URL=http://localhost:${BACKEND_PORT}
REDIS_URL=redis://redis:${REDIS_PORT}
```

Note: for the SECRET_KEY, you can generate it using the following commands
```bash
openssl rand -hex 32
```

For the AI models, you will first have to download the models to the backend directory.
To download, you can simply use git clone. But before using the git clone, ensure you have 
git LFS installed.
You can download it via this link: https://git-lfs.com/
If you are on Ubuntu, you can simply installed git LFS using the command below:
```bash
sudo apt-get install git-lfs
```
After installing the git LFS, proceed to clone the models from Huggingface to the backend directory.
For example, for the code llama model, you can navigate to the backend directory and run the command below:
```bash
git clone https://huggingface.co/codellama/CodeLlama-7b-Instruct-hf
```

### Build and Run with Docker Compose

```bash
docker-compose up --build
```

This will start the FastAPI server, PostgreSQL database, and Redis.

### Usage

The api services will be available at `http://localhost:8080/docs`.

The frontend service will be available at `http://localhost:3001/`.

The pgadmin service will be available at `http://localhost:5050/`.

### API Endpoints

#### User Registration

**POST** `/users/`

Request Body:
```json
{
  "username": "user",
  "email": "user@example.com",
  "password": "password"
}
```

#### User Login

**POST** `/token`

```json
{
  "username": "user",
  "password": "password"
}
```

#### Request Password Reset

**POST** `/password-reset/request`

Request Body:
```json
{
  "email": "user@example.com"
}
```

#### Reset Password

**POST** `/reset-password`

Request Body:
```json
{
  "token": "reset_token",
  "new_password": "new_password"
}
```

#### Activate User

**GET** `/activate/{token}`

### Many other api endpoints and expected data format can be seen here: `http://localhost:8080/docs`.


