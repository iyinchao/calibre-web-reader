# Stage 1: Build the application
# Using 'slim' variant which is based on Debian and includes glibc
FROM node:22-slim AS builder

# Install pnpm
RUN npm install -g pnpm

# Set the working directory
WORKDIR /app

# Copy dependency definition files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install server dependencies strictly based on the lockfile
RUN pnpm install --frozen-lockfile

# Copy the rest of the source code
# We copy server and tsconfig files needed for the build
COPY . .

# Build the client application first
RUN pnpm --filter client build

# Build the server application
RUN pnpm --filter server build

# Prune development dependencies to reduce the size of node_modules
RUN pnpm prune --prod


# Stage 2: Create the final production image
# Using 'slim' variant which is based on Debian and includes glibc
FROM node:22-slim

# Set the frontend to noninteractive to reduce build noise and prevent hangs
ENV DEBIAN_FRONTEND=noninteractive

# Install Docker CLI to enable Docker-out-of-Docker (DooD)
# This only installs the client, not the full Docker daemon.
# Using apt-get for Debian-based image
RUN apt-get update && apt-get install -y docker.io && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Set NODE_ENV to production
ENV NODE_ENV=production

# Copy production dependencies from the builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server/node_modules ./server/node_modules
COPY --from=builder /app/client/node_modules ./client/node_modules


# Copy the built application from the builder stage
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/server/dist ./server/dist

# Copy the entrypoint script and give it execution permissions
COPY entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh

# Set the entrypoint script to be executed when the container starts
ENTRYPOINT ["entrypoint.sh"]

# Expose the default port the app runs on. This is for documentation.
EXPOSE 3000

# The default command to run the application. This will be passed to the entrypoint script.
CMD ["node", "server/dist/index.js"]
