#!/bin/bash

start_pm2() {
  SERVICE_NAME=$1
  pm2 describe $SERVICE_NAME > /dev/null 2>&1
  if [ $? -eq 0 ]; then
    pm2 restart $SERVICE_NAME
  else
    pm2 start npm --name $SERVICE_NAME -- start
  fi
}

if [ $# -lt 1 ] || [ $# -gt 2 ]; then
  echo "Usage: $0 <start|stop> [pm2_service_name]"
  exit 1
fi

ACTION=$1
SERVICE_NAME=$2

if [ -z "$SERVICE_NAME" ]; then
  SERVICE_NAME=$(basename "$(pwd)")
fi

if [ "$ACTION" = "stop" ]; then
  pm2 stop $SERVICE_NAME || true

elif [ "$ACTION" = "start" ]; then

  healthcheck_interval=5
  healthcheck_max_attempts=10
  healthcheck_start_attempts=3

  for (( healthcheck_attempt=1; healthcheck_attempt<=$healthcheck_start_attempts; healthcheck_attempt++ )); do
    echo "Attempt $healthcheck_attempt to start PM2 process..."

    start_pm2 $SERVICE_NAME

    healthcheck_attempt_count=0
    while [ $healthcheck_attempt_count -lt $healthcheck_max_attempts ]; do
      ./healthcheck.sh
      if [ $? -eq 0 ]; then
        echo "PM2 process started successfully."
        exit 0
      else
        echo "Healthcheck failed. Retrying in $healthcheck_interval seconds..."
      fi

      sleep $healthcheck_interval
      healthcheck_attempt_count=$((healthcheck_attempt_count + 1))
    done

    echo "Healthcheck failed after $healthcheck_max_attempts attempts."
  done

  echo "Failed to start PM2 process after $healthcheck_start_attempts attempts."
  exit 1

else
  echo "Unknown action '$ACTION'. Please use 'start' or 'stop'."
  exit 1
fi
