FROM python:3.10-slim

WORKDIR /app

RUN pip install --no-cache-dir fastmcp httpx

COPY ha_mcp.py .

# Expose port for SSE (if using SSE mode)
EXPOSE 8000

# Run the FastMCP server using Python
CMD ["python", "ha_mcp.py"]
