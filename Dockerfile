FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Build sqlite-vec from source (both pip package and GitHub releases ship
# broken 32-bit ARM binaries for linux/aarch64 on Apple Silicon Docker)
RUN apt-get update && apt-get install -y --no-install-recommends gcc curl libsqlite3-dev && \
    curl -L -o /tmp/vec.tar.gz \
      https://github.com/asg017/sqlite-vec/releases/download/v0.1.6/sqlite-vec-0.1.6-amalgamation.tar.gz && \
    mkdir -p /tmp/vec && tar xzf /tmp/vec.tar.gz -C /tmp/vec && \
    cd /tmp/vec && \
    gcc -shared -fPIC -O2 -I. \
      sqlite-vec.c -o vec0.so -lm && \
    cp vec0.so /usr/local/lib/vec0.so && \
    rm -rf /tmp/vec /tmp/vec.tar.gz && \
    apt-get purge -y gcc curl libsqlite3-dev && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY pyproject.toml .
COPY src/ src/
COPY scripts/ scripts/

RUN uv pip install --system .

ENV SQLITE_VEC_PATH=/usr/local/lib/vec0.so

EXPOSE 8000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload", "--reload-dir", "src"]
