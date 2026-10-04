#!/bin/bash

# Build Docker images for code execution

echo "Building Python code runner..."
docker build -t code-runner-python:latest ./docker/python

echo "Building JavaScript code runner..."
docker build -t code-runner-javascript:latest ./docker/javascript

echo "✅ Docker images built successfully!"
echo ""
echo "Images created:"
echo "  - code-runner-python:latest"
echo "  - code-runner-javascript:latest"
