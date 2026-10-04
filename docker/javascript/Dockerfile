# JavaScript/Node.js Code Runner
FROM node:20-slim

# Create non-root user
RUN useradd -m -u 1000 coderunner

# Set working directory
WORKDIR /app

# Switch to non-root user
USER coderunner

# Default command
CMD ["node", "/app/code.js"]
