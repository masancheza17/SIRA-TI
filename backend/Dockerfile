FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Dependencias del sistema necesarias para psycopg2 y Pillow
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Recolecta los archivos estáticos (admin de Django) para servirlos con WhiteNoise.
# La clave de abajo es solo para este paso de build y no se usa en tiempo de ejecución.
RUN SECRET_KEY=solo-para-el-build-no-se-usa-en-produccion-0123456789 python manage.py collectstatic --noinput

EXPOSE 8000

# Servidor de producción. En desarrollo, docker-compose.yml lo reemplaza por runserver.
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "2"]
