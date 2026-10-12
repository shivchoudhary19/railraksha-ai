FROM python:3.12-alpine3.24
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
RUN apk upgrade --no-cache && apk add --no-cache zbar
COPY services/api/requirements.lock ./
COPY services/api ./
RUN pip install --no-cache-dir -c requirements.lock .
RUN adduser -D -u 10001 railraksha
USER railraksha
EXPOSE 8000
CMD ["uvicorn", "railraksha.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-proxy-headers", "--no-access-log"]
