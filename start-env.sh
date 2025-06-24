#!/bin/bash

# Colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Store PIDs
BACKEND_PID=""
FRONTEND_PID=""
PID_FILE=".app_pids"

# Default ports
BACKEND_PORT=3000
FRONTEND_PORT=5173

# URLs
BACKEND_URL="http://localhost:$BACKEND_PORT"
FRONTEND_URL="http://localhost:$FRONTEND_PORT"

# Function to detect package manager
detect_package_manager() {
  local dir=$1
  if [ -f "$dir/npm.lockb" ]; then
    echo "npm"
  elif [ -f "$dir/yarn.lock" ]; then
    echo "yarn"
  elif [ -f "$dir/pnpm-lock.yaml" ]; then
    echo "pnpm"
  else
    echo "npm"
  fi
}

# Function to check if a port is in use
is_port_in_use() {
  lsof -i:"$1" > /dev/null 2>&1
  return $?
}

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
  
  # Check if port is already in use
  if is_port_in_use $BACKEND_PORT; then
    echo -e "${YELLOW}Warning: Port $BACKEND_PORT is already in use. Backend may not start properly.${NC}"
  fi
  
  cd backend || { echo -e "${RED}Backend directory not found!${NC}"; exit 1; }
  
  # Detect package manager
  local pm=$(detect_package_manager ".")
  echo -e "${CYAN}Using package manager: $pm for backend${NC}"
  
  # Start server based on package manager
  case $pm in
    "npm")
      npm start &
      ;;
    "yarn")
      yarn start &
      ;;
    "pnpm")
      pnpm start &
      ;;
    *)
      npm start &
      ;;
  esac
  
  BACKEND_PID=$!
  cd ..
  
  # Check if process started successfully
  if is_process_running $BACKEND_PID; then
    echo -e "${GREEN}Backend server started with PID: ${BACKEND_PID}${NC}"
    echo -e "${GREEN}Backend URL: ${BACKEND_URL}${NC}"
  else
    echo -e "${RED}Failed to start backend server${NC}"
    BACKEND_PID=""
  fi
}

# Function to start the frontend
start_frontend() {
  echo -e "${BLUE}Starting frontend server...${NC}"
  
  # Check if port is already in use
  if is_port_in_use $FRONTEND_PORT; then
    echo -e "${YELLOW}Warning: Port $FRONTEND_PORT is already in use. Frontend may start on a different port.${NC}"
  fi
  
  cd frontend || { echo -e "${RED}Frontend directory not found!${NC}"; exit 1; }
  
  # Detect package manager
  local pm=$(detect_package_manager ".")
  echo -e "${CYAN}Using package manager: $pm for frontend${NC}"
  
  # Start server based on package manager
  case $pm in
    "npm")
      npm run dev &
      ;;
    "yarn")
      yarn dev &
      ;;
    "pnpm")
      pnpm dev &
      ;;
    *)
      npm run dev &
      ;;
  esac
  
  FRONTEND_PID=$!
  cd ..
  
  # Check if process started successfully
  if is_process_running $FRONTEND_PID; then
    echo -e "${GREEN}Frontend server started with PID: ${FRONTEND_PID}${NC}"
    echo -e "${GREEN}Frontend URL: ${FRONTEND_URL}${NC}"
  else
    echo -e "${RED}Failed to start frontend server${NC}"
    FRONTEND_PID=""
  fi
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
  
  # Also try to kill any stray processes on the ports
  if is_port_in_use $BACKEND_PORT; then
    echo -e "${YELLOW}Killing process on backend port $BACKEND_PORT...${NC}"
    lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null
  fi
  
  if is_port_in_use $FRONTEND_PORT; then
    echo -e "${YELLOW}Killing process on frontend port $FRONTEND_PORT...${NC}"
    lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null
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
    echo -e "${GREEN}Backend URL: ${BACKEND_URL}${NC}"
  else
    echo -e "${RED}Backend server: Not running${NC}"
  fi
  
  if [ -n "$FRONTEND_PID" ] && is_process_running "$FRONTEND_PID"; then
    echo -e "${GREEN}Frontend server: Running (PID: ${FRONTEND_PID})${NC}"
    echo -e "${GREEN}Frontend URL: ${FRONTEND_URL}${NC}"
  else
    echo -e "${RED}Frontend server: Not running${NC}"
  fi
  
  # Check ports
  if is_port_in_use $BACKEND_PORT; then
    echo -e "${CYAN}Port $BACKEND_PORT is in use${NC}"
  else
    echo -e "${YELLOW}Port $BACKEND_PORT is free${NC}"
  fi
  
  if is_port_in_use $FRONTEND_PORT; then
    echo -e "${CYAN}Port $FRONTEND_PORT is in use${NC}"
  else
    echo -e "${YELLOW}Port $FRONTEND_PORT is free${NC}"
  fi
}

# Function to install dependencies if needed
install_dependencies() {
  echo -e "${BLUE}Checking and installing backend dependencies...${NC}"
  cd backend || { echo -e "${RED}Backend directory not found!${NC}"; exit 1; }
  
  # Detect package manager
  local pm=$(detect_package_manager ".")
  echo -e "${CYAN}Using package manager: $pm for backend${NC}"
  
  # Install dependencies based on package manager
  case $pm in
    "npm")
      npm install
      ;;
    "yarn")
      yarn install
      ;;
    "pnpm")
      pnpm install
      ;;
    *)
      npm install
      ;;
  esac
  
  cd ..
  
  echo -e "${BLUE}Checking and installing frontend dependencies...${NC}"
  cd frontend || { echo -e "${RED}Frontend directory not found!${NC}"; exit 1; }
  
  # Detect package manager
  local pm=$(detect_package_manager ".")
  echo -e "${CYAN}Using package manager: $pm for frontend${NC}"
  
  # Install dependencies based on package manager
  case $pm in
    "npm")
      npm install
      ;;
    "yarn")
      yarn install
      ;;
    "pnpm")
      pnpm install
      ;;
    *)
      npm install
      ;;
  esac
  
  cd ..
  
  echo -e "${GREEN}Dependencies installation completed${NC}"
}

# Function to open URLs in browser
open_in_browser() {
  echo -e "${BLUE}Opening applications in browser...${NC}"
  
  # Check if backend is running
  if [ -n "$BACKEND_PID" ] && is_process_running "$BACKEND_PID"; then
    echo -e "${GREEN}Opening backend URL: ${BACKEND_URL}${NC}"
    open "$BACKEND_URL"
  else
    echo -e "${RED}Backend is not running, cannot open URL${NC}"
  fi
  
  # Check if frontend is running
  if [ -n "$FRONTEND_PID" ] && is_process_running "$FRONTEND_PID"; then
    echo -e "${GREEN}Opening frontend URL: ${FRONTEND_URL}${NC}"
    open "$FRONTEND_URL"
  else
    echo -e "${RED}Frontend is not running, cannot open URL${NC}"
  fi
}

# Function to show logs
show_logs() {
  local component=$1
  
  case $component in
    "backend")
      if [ -n "$BACKEND_PID" ] && is_process_running "$BACKEND_PID"; then
        echo -e "${BLUE}Showing backend logs (PID: ${BACKEND_PID})...${NC}"
        tail -f /tmp/backend-logs.log 2>/dev/null || echo -e "${RED}No backend logs found${NC}"
      else
        echo -e "${RED}Backend is not running${NC}"
      fi
      ;;
    "frontend")
      if [ -n "$FRONTEND_PID" ] && is_process_running "$FRONTEND_PID"; then
        echo -e "${BLUE}Showing frontend logs (PID: ${FRONTEND_PID})...${NC}"
        tail -f /tmp/frontend-logs.log 2>/dev/null || echo -e "${RED}No frontend logs found${NC}"
      else
        echo -e "${RED}Frontend is not running${NC}"
      fi
      ;;
    *)
      echo -e "${RED}Invalid component. Use 'backend' or 'frontend'${NC}"
      ;;
  esac
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
    echo -e "Use '${YELLOW}./start-env.sh status${NC}' to check server status"
    echo -e "Use '${YELLOW}./start-env.sh stop${NC}' to stop the servers"
    echo -e "Use '${YELLOW}./start-env.sh open${NC}' to open applications in browser"
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
    echo -e "${PURPLE}=== Now you can start the application with: ${YELLOW}./start-env.sh start${NC}"
    ;;
  open)
    load_pids
    open_in_browser
    ;;
  logs)
    load_pids
    if [ -z "$2" ]; then
      echo -e "${RED}Please specify component: backend or frontend${NC}"
      exit 1
    fi
    show_logs "$2"
    ;;
  *)
    echo -e "${PURPLE}=== Taxi Amore Love Environment Manager ===${NC}"
    echo -e "Usage: $0 {start|stop|restart|status|install|open|logs}"
    echo -e "  ${YELLOW}start${NC}   - Start both backend and frontend servers"
    echo -e "  ${YELLOW}stop${NC}    - Stop all running servers"
    echo -e "  ${YELLOW}restart${NC} - Restart all servers"
    echo -e "  ${YELLOW}status${NC}  - Check server status"
    echo -e "  ${YELLOW}install${NC} - Install dependencies for both backend and frontend"
    echo -e "  ${YELLOW}open${NC}    - Open applications in browser"
    echo -e "  ${YELLOW}logs${NC}    - Show logs (use: $0 logs [backend|frontend])"
    exit 1
    ;;
esac

exit 0
