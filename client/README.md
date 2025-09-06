# Calibre Web Reader

> 👷 Currently work in progress

A modern web-based e-book reader built with React and TypeScript, powered by the foliate-js library. This application provides a seamless reading experience for various e-book formats directly in your browser.

## Features

- **Multi-format Support**: Read EPUB, MOBI, KF8 (AZW3), FB2, CBZ, and PDF files
- **Modern UI**: Clean, responsive interface built with React and UnoCSS
- **Table of Contents**: Interactive navigation with collapsible TOC tree
- **Reading Progress**: Visual progress tracking and history navigation
- **Self Hosted**: Easy deployment with Docker and Docker Compose

## Supported Formats

- **EPUB** - Electronic Publication format
- **MOBI** - Mobipocket format
- **AZW3/KF8** - Kindle format
- **FB2** - FictionBook 2.0 format
- **CBZ** - Comic book archive
- **PDF** - Portable Document Format (experimental)

## Quick Start

### Using Docker Compose (Recommended)

1. Clone the repository:

```bash
git clone <repository-url>
cd calibre-web-reader
```

2. Copy the example environment file:

```bash
cp .env.example .env
```

3. Start the application:

```bash
docker-compose up -d
```

4. Open your browser and navigate to `http://localhost:3000`

### Development Setup

1. Install dependencies:

```bash
pnpm install
```

2. Install foliate-js dependencies:

```bash
cd client/3rdparty/foliate-js
npm ci
```

3. Start the development server:

```bash
pnpm --filter client dev
```

## Project Structure

```
calibre-web-reader/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── Reader.tsx  # Main e-book reader component
│   │   │   ├── BookList.tsx # Book library interface
│   │   │   └── TocTree.tsx # Table of contents navigation
│   │   ├── context/        # React context providers
│   │   └── utils/          # Utility functions and types
│   └── 3rdparty/
│       └── foliate-js/     # E-book rendering library
├── server/                 # Backend server (if applicable)
├── docker-compose.yml      # Docker composition
└── Dockerfile             # Container definition
```

## Configuration

The application can be configured through environment variables:

- `PORT`: Server port (default: 3000)
- `BIND_PORT`: Host binding port for Docker

See `.env.example` for all available configuration options.

## Technology Stack

### Frontend

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **UnoCSS** - Utility-first CSS framework
- **React Router** - Client-side routing

### E-book Engine

- **foliate-js** - Core e-book rendering library
- Supports native ES modules
- No build dependencies for the reader core

### Development Tools

- **ESLint** - Code linting
- **Prettier** - Code formatting
- **simple-git-hooks** - Git hooks management
- **lint-staged** - Staged files linting

## Usage

1. **Browse Books**: The home page displays your book library
2. **Open a Book**: Click on any book to start reading
3. **Navigate**: Use the table of contents or navigation controls
4. **Reading Progress**: Track your progress with the built-in progress bar

## Development

### Available Scripts

```bash
# Start development server
pnpm --filter client dev

# Build for production
pnpm --filter client build

# Run linting
pnpm --filter client lint

# Preview production build
pnpm --filter client preview
```

### Code Quality

The project includes automated code quality tools:

- Pre-commit hooks for linting and formatting
- ESLint configuration for React and TypeScript
- Prettier for consistent code formatting

## Docker Deployment

The application is containerized for easy deployment:

1. **Multi-stage build** for optimized production images
2. **pnpm** for efficient dependency management
3. **Node.js 22 slim** base image for security and performance

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Acknowledgments

- **foliate-js** - The core e-book rendering engine
- **Calibre** - E-book management inspiration
- **React** and **Vite** communities for excellent tooling

## Troubleshooting

### Common Issues

1. **Books not loading**: Ensure the book format is supported
2. **Docker issues**: Check that ports are not already in use
3. **Development setup**: Make sure all dependencies are installed with `pnpm install`

For more detailed troubleshooting, check the browser console for error messages.
