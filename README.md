# ApplyZen - AI-Powered Job Application Generator

ApplyZen is a Chrome extension that automatically generates personalized CVs and cover letters from LinkedIn job postings using AI. Built with modern TypeScript, React, and Node.js in an Nx monorepo.

## 🚀 Features

- **Smart Job Detection**: Automatically detects LinkedIn job pages and scrapes job data
- **AI-Powered Generation**: Creates personalized CVs and cover letters using OpenAI GPT-4
- **Multi-Language Support**: Automatically detects job language (French, English, German, Spanish)
- **Multiple Export Formats**: Download documents as Markdown or Word (.docx)
- **Profile Management**: Import CV data from PDF or manually configure your profile
- **Modern Architecture**: TypeScript + React frontend with Node.js/Express backend

## 🏗️ Architecture

This is an Nx monorepo containing:

```
apps/
├── extension/          # React + Vite Chrome extension
├── api/               # Node.js + Express backend
└── api-e2e/          # API end-to-end tests

libs/
└── shared-types/     # Shared TypeScript interfaces

legacy-code/          # Original vanilla JS implementation (for reference)
```

## 🛠️ Tech Stack

### Frontend (Chrome Extension)
- **React 19** with TypeScript
- **Vite** for fast builds
- **Chrome Extension Manifest V3**
- **CSS Modules** for styling

### Backend (API)
- **Node.js** with Express
- **TypeScript** for type safety
- **OpenAI API** for document generation
- **CORS** for Chrome extension communication
- **Helmet** for security

### Shared
- **Nx** for monorepo management
- **ESLint** for code quality
- **Prettier** for code formatting

## 🚦 Getting Started

### Prerequisites

- Node.js 18+ 
- npm
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ApplyZen
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp apps/api/.env.example apps/api/.env
   # Edit apps/api/.env and add your OpenAI API key
   ```

4. **Build the shared types**
   ```bash
   npx nx build shared-types
   ```

### Development

1. **Start the backend API**
   ```bash
   npx nx serve api
   ```

2. **Build the Chrome extension**
   ```bash
   npx nx build extension
   ```

3. **Load the extension in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select `dist/apps/extension`

### Available Commands

```bash
# Build everything
npx nx run-many -t build

# Build specific app
npx nx build extension
npx nx build api

# Run tests
npx nx test

# Lint code
npx nx lint

# Serve API in dev mode
npx nx serve api
```

## 📁 Project Structure

### Chrome Extension (`apps/extension/`)
- `src/app/` - React components
- `src/app/components/` - UI components
- `public/` - Extension manifest and assets
- `public/background.js` - Service worker
- `public/content/scraper.js` - LinkedIn scraper

### Backend API (`apps/api/`)
- `src/main.ts` - Express server
- `src/services/` - Business logic
- `src/utils/` - Utility functions
- `.env.example` - Environment configuration template

### Shared Types (`libs/shared-types/`)
- `src/lib/shared-types.ts` - TypeScript interfaces used across apps

## 🔧 Configuration

### Environment Variables

Create `apps/api/.env` with:

```bash
OPENAI_API_KEY=your_openai_api_key_here
PORT=3000
NODE_ENV=development
```

### Chrome Extension Permissions

The extension requires these permissions:
- `activeTab` - Access current tab
- `storage` - Store user profile
- `scripting` - Inject content scripts
- `tabs` - Detect job pages

## 🌐 API Endpoints

- `GET /api/health` - Health check
- `POST /api/generate` - Generate CV/cover letter
- `POST /api/profile` - Save user profile
- `GET /api/profile/:userId` - Get user profile

## 🤝 Development Workflow

1. **Make changes** to the code
2. **Build** the affected applications
3. **Test** the Chrome extension with the backend
4. **Commit** your changes
5. **Create** a pull request

## 🚧 Roadmap

- [ ] Authentication system
- [ ] Database integration (PostgreSQL)
- [ ] User dashboard web app
- [ ] Support for more job sites (Welcome to the Jungle, Indeed)
- [ ] PDF export functionality
- [ ] Analytics and usage tracking
- [ ] Chrome Web Store publication

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 🐛 Known Issues

- Profile management UI needs improvement
- DOCX export is placeholder (exports as Markdown)
- No database persistence yet (profiles stored in Chrome storage)

## 📞 Support

For questions or issues, please create a GitHub issue or contact the development team.

---

## Nx Workspace

<a alt="Nx logo" href="https://nx.dev" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/nrwl/nx/master/images/nx-logo.png" width="45"></a>

This workspace was created with [Nx](https://nx.dev).

### Useful Nx Commands

```bash
# Visualize the project graph
npx nx graph

# Run lint for all projects
npx nx run-many -t lint

# Build all apps
npx nx run-many -t build

# Test all projects
npx nx run-many -t test
```