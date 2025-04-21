FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Expose port for Vite development server
EXPOSE 3000

# Run development server with hot reload
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"] 