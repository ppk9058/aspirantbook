# Python Code Runner
FROM python:3.11-slim

# Create non-root user
RUN useradd -m -u 1000 coderunner

# Set working directory
WORKDIR /app

# Install common packages
RUN pip install --no-cache-dir numpy pandas matplotlib

# Switch to non-root user
USER coderunner

# Default command
CMD ["python", "-u", "/app/code.py"]
