FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for PyTorch + OpenCV
RUN apt-get update && apt-get install -y \
    gcc g++ libgl1-mesa-glx libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Collect static files
RUN python manage.py collectstatic --noinput

# Expose port
EXPOSE 8000

# Start gunicorn
CMD gunicorn predictor.wsgi --bind 0.0.0.0:$PORT --workers 2 --timeout 120
