# Database Setup Instructions

## 1. PostgreSQL Setup

First, make sure PostgreSQL is installed and running on your system.

### macOS (using Homebrew):
```bash
brew install postgresql
brew services start postgresql
```

### Create Database:
```bash
createdb applyzendb
```

## 2. Environment Setup

Make sure your `.env` file in `apps/api/` has the correct DATABASE_URL:
```
DATABASE_URL="postgresql://yourusername:yourpassword@localhost:5432/applyzendb?schema=public"
```

## 3. Run Prisma Migrations

From the project root directory:

```bash
# Generate Prisma client
npx --prefix apps/api prisma generate

# Run the database migration
npx --prefix apps/api prisma migrate dev --name init

# (Optional) View your database in Prisma Studio
npx --prefix apps/api prisma studio
```

## 4. Verify Setup

Start the API server:
```bash
npx nx serve api
```

The server should start successfully and connect to the database.

## 5. Google OAuth Setup (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google+ API
4. Create OAuth 2.0 credentials
5. Add your redirect URI: `http://localhost:3000/api/auth/google/callback`
6. Update your `.env` file with the credentials

## Troubleshooting

- If you get connection errors, make sure PostgreSQL is running
- If you get permission errors, check your database credentials
- If migrations fail, you can reset with: `npx --prefix apps/api prisma migrate reset`