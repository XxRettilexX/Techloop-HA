FROM python:3.10-slim

WORKDIR /app

RUN pip install "mcp[cli]" httpx

COPY ha_mcp.py .

# Expose port for SSE (if using SSE mode)
EXPOSE 8000

# Check where fastmcp is installed (usually ~/.local/bin or /usr/local/bin)
# Use python -m to run it safely
CMD ["fastmcp", "run", "ha_mcp.py", "--host", "0.0.0.0", "--port", "8000"]
