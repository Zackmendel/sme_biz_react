FROM python:3.12-slim

# Install system dependencies for WeasyPrint (PDF rendering)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3-dev \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libjpeg-dev \
    libopenjp2-7-dev \
    libharfbuzz0b \
    libglib2.0-0 \
    shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

# Install uv for Python environment & dependency management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Copy dependency configs
COPY pyproject.toml uv.lock ./

# Install python packages
RUN uv sync --frozen --no-cache

# Copy source code
COPY . .

EXPOSE 8000

# Start Uvicorn web service
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
