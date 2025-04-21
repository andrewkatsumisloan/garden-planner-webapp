# Fullstack Template API

A streamlined FastAPI backend with user authentication via Clerk, SQLAlchemy ORM for database access, and a clean project structure.

## Features

- **FastAPI** - Modern, fast web framework for building APIs
- **SQLAlchemy** - SQL toolkit and ORM for Python
- **Clerk Authentication** - JWT validation for secure endpoints
- **Docker Ready** - Docker and Docker Compose configuration with PostgreSQL
- **User Management** - Simplified user model with auto-registration
- **Database Flexibility** - Easy switching between local PostgreSQL and AWS RDS

## Authentication Flow

This template uses [Clerk](https://clerk.dev/) for authentication:

1. Users sign in through Clerk on the frontend
2. Clerk provides a JWT token which the frontend sends with API requests
3. Backend validates the token using Clerk's public keys (JWT RS256)
4. If a user isn't yet in the database, they're automatically created using Clerk token data when they access any protected endpoint (just-in-time provisioning)
5. User data is associated with other application data via the `clerk_user_id`

## Database Configuration

The application supports multiple database options:

### Option 1: Local PostgreSQL Container (default)

The Docker Compose configuration includes a PostgreSQL container, making it easy to get started. Simply run:

```bash
docker-compose up
```

All necessary environment variables are set in the docker-compose.yml file.

### Option 2: AWS RDS or External PostgreSQL

To use an AWS RDS instance or any external PostgreSQL database:

1. Create a `.env` file based on the provided `env.example`:
   ```
   # Set this to connect to your AWS RDS instance
   DATABASE_URL=postgresql://user:password@your-rds-hostname.rds.amazonaws.com:5432/dbname
   ```

2. When running with Docker Compose, **comment out** the database environment variables in docker-compose.yml:
   ```yaml
   backend:
     # ...
     environment:
       # Comment out these lines to use AWS RDS
       # - DB_USER=postgres
       # - DB_PASSWORD=postgres
       # - DB_HOST=postgres
       # - DB_PORT=5432
       # - DB_NAME=appdb
   ```

### Option 3: SQLite (for local development)

For the simplest local setup without Docker:

```bash
# In your .env file
DATABASE_URL=sqlite:///./app.db
```

## Environment Variables

Create a `.env` file with the following variables (see `env.example` for a template):

```
# Core
DEBUG=false

# Database - Set this to use AWS RDS
# DATABASE_URL=postgresql://user:password@your-rds-hostname.rds.amazonaws.com:5432/dbname

# Clerk
CLERK_JWT_ISSUER=https://your-clerk-instance.clerk.accounts.dev
```

## API Endpoints

### Authentication

- `GET /api/v1/users/me` - Get current authenticated user (automatically creates the user if they don't exist)
- `PUT /api/v1/users/me` - Update current user's information

### Info

- `GET /api/health` - Health check endpoint
- `GET /api/info` - API information

## Setup and Running

### With Docker (Recommended)

```bash
# Start all services (client, backend, and postgres)
docker-compose up

# Start just the backend and postgres
docker-compose up backend postgres
```

### Without Docker

1. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

2. Run the development server:
   ```
   uvicorn app.main:app --reload
   ```

3. Visit the API documentation:
   ```
   http://localhost:8000/docs
   ```

## Database Migrations (Optional)

For more complex projects, you might want to use Alembic for database migrations:

```bash
pip install alembic
alembic init migrations
# Edit migrations/env.py to import your models
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

## Deploying to AWS

For deployment to AWS, you can use the provided Docker configuration:

1. Build the production Docker image:
   ```
   docker build -t fullstack-template-api -f Dockerfile.prod .
   ```

2. Tag and push to ECR:
   ```
   aws ecr get-login-password | docker login --username AWS --password-stdin <your-aws-account-id>.dkr.ecr.<region>.amazonaws.com
   docker tag fullstack-template-api:latest <your-aws-account-id>.dkr.ecr.<region>.amazonaws.com/fullstack-template-api:latest
   docker push <your-aws-account-id>.dkr.ecr.<region>.amazonaws.com/fullstack-template-api:latest
   ```

3. Deploy using ECS, EKS, or directly on EC2 with your RDS instance. 