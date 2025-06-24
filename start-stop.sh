#!/bin/bash

# Colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Store PIDs
BACKEND_PID=""
FRONTEND_PID=""
PID_FILE=".app_pids"

# Function to check if a process is running
is_process_running() {
  if [ -n "$1" ] && ps -p "$1" > /dev/null; then
    return 0
  else
    return 1
  fi
}

# Function to start the backend
start_backend() {
  echo -e "${BLUE}Starting backend server...${NC}"
  cd taxi-fleuri-backend || exit
  npm start &
  BACKEND_PID=$!
  cd ..
  echo -e "${GREEN}Backend server started with PID: ${BACKEND_PID}${NC}"
}

# Function to start the frontend
start_frontend() {
  echo -e "${BLUE}Starting frontend server...${NC}"
  cd amore-floral-web-stories || exit
  npm run dev &
  FRONTEND_PID=$!
  cd ..
  echo -e "${GREEN}Frontend server started with PID: ${FRONTEND_PID}${NC}"
}

# Function to save PIDs to file
save_pids() {
  echo "BACKEND_PID=$BACKEND_PID" > "$PID_FILE"
  echo "FRONTEND_PID=$FRONTEND_PID" >> "$PID_FILE"
}

# Function to load PIDs from file
load_pids() {
  if [ -f "$PID_FILE" ]; then
    source "$PID_FILE"
  fi
}

# Function to stop servers
stop_servers() {
  load_pids
  
  if [ -n "$BACKEND_PID" ]; then
    if is_process_running "$BACKEND_PID"; then
      echo -e "${YELLOW}Stopping backend server (PID: ${BACKEND_PID})...${NC}"
      kill "$BACKEND_PID"
      echo -e "${GREEN}Backend server stopped${NC}"
    else
      echo -e "${RED}Backend server is not running${NC}"
    fi
  fi
  
  if [ -n "$FRONTEND_PID" ]; then
    if is_process_running "$FRONTEND_PID"; then
      echo -e "${YELLOW}Stopping frontend server (PID: ${FRONTEND_PID})...${NC}"
      kill "$FRONTEND_PID"
      echo -e "${GREEN}Frontend server stopped${NC}"
    else
      echo -e "${RED}Frontend server is not running${NC}"
    fi
  fi
  
  # Clean up PID file
  rm -f "$PID_FILE"
}

# Function to check server status
check_status() {
  load_pids
  
  echo -e "${PURPLE}=== Server Status ===${NC}"
  
  if [ -n "$BACKEND_PID" ] && is_process_running "$BACKEND_PID"; then
    echo -e "${GREEN}Backend server: Running (PID: ${BACKEND_PID})${NC}"
  else
    echo -e "${RED}Backend server: Not running${NC}"
  fi
  
  if [ -n "$FRONTEND_PID" ] && is_process_running "$FRONTEND_PID"; then
    echo -e "${GREEN}Frontend server: Running (PID: ${FRONTEND_PID})${NC}"
  else
    echo -e "${RED}Frontend server: Not running${NC}"
  fi
}

# Function to install dependencies if needed
install_dependencies() {
  echo -e "${BLUE}Checking and installing backend dependencies...${NC}"
  cd taxi-fleuri-backend || exit
  npm install
  cd ..
  
  echo -e "${BLUE}Checking and installing frontend dependencies...${NC}"
  cd amore-floral-web-stories || exit
  npm install
  cd ..
  
  echo -e "${GREEN}Dependencies installation completed${NC}"
}

# Handle Ctrl+C gracefully
trap stop_servers INT

# Main execution
case "$1" in
  start)
    start_backend
    start_frontend
    save_pids
    echo -e "${PURPLE}=== Application started successfully ===${NC}"
    echo -e "Use '${YELLOW}./start-stop.sh status${NC}' to check server status"
    echo -e "Use '${YELLOW}./start-stop.sh stop${NC}' to stop the servers"
    ;;
  stop)
    stop_servers
    echo -e "${PURPLE}=== Application stopped successfully ===${NC}"
    ;;
  restart)
    stop_servers
    sleep 2
    start_backend
    start_frontend
    save_pids
    echo -e "${PURPLE}=== Application restarted successfully ===${NC}"
    ;;
  status)
    check_status
    ;;
  install)
    install_dependencies
    echo -e "${PURPLE}=== Now you can start the application with: ${YELLOW}./start-stop.sh start${NC}"
    ;;
  *)
    echo -e "${PURPLE}=== Taxi Amore Love Application Manager ===${NC}"
    echo -e "Usage: $0 {start|stop|restart|status|install}"
    echo -e "  ${YELLOW}start${NC}   - Start both backend and frontend servers"
    echo -e "  ${YELLOW}stop${NC}    - Stop all running servers"
    echo -e "  ${YELLOW}restart${NC} - Restart all servers"
    echo -e "  ${YELLOW}status${NC}  - Check server status"
    echo -e "  ${YELLOW}install${NC} - Install dependencies for both backend and frontend"
    exit 1
    ;;
esac

exit 0
