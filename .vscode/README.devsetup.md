# Local Development Setup Guide - macOS/Ubuntu

## Prerequisites
- macOS 10.15 or later / Ubuntu 22.04/24.04 LTS
- Terminal access
- Homebrew package manager

## Installation Steps

### 1. Install Homebrew (if not installed) (macOS only)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. Install MongoDB

macOS:

```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

Ubuntu:

```bash
# Install required packages
sudo apt-get install -y gnupg curl unzip

# Import MongoDB public GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg \
   --dearmor

# Create list file for MongoDB
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" | \
   sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list

# Update and install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start and enable MongoDB service
sudo systemctl start mongod
sudo systemctl enable mongod
```

Verify MongoDB is running:
```bash
brew services list | grep mongodb
```

### 3. Install Fast Node Manager (fnm) (if no Node.js version manager is installed)
```bash
curl -fsSL https://fnm.vercel.app/install | bash
```

Add fnm to your shell configuration:

macOS:

```bash
echo 'eval "$(fnm env --use-on-cd)"' >> ~/.zshrc
source ~/.zshrc
```
Ubuntu:

```bash
echo 'eval "$(fnm env --use-on-cd)"' >> ~/.bashrc
source ~/.bashrc
```

### 4. Install Node.js
```bash
fnm install 22
fnm use 22
```

Verify the installation:
```bash
node --version
npm --version
```

### 5. Run Development Setup Script

Copy the `devsetup.sh` script from `.vscode/devsetup.sh` to your project directory (script clones the repo automatically).
1. Navigate to your project directory
2. Make the setup script executable:
```bash
chmod +x ./devsetup.sh
```

1. Run the setup script:
```bash
./devsetup.sh
```

The script will:
- Clone the repository
- Install dependencies
- Configure the development environment

### 6. Start the Development of Server/Client

Use the debug configuration(server/client) in VS Code to run the code.

By default client runs on `locahost:6001` and server runs on `localhost:3001`


## Verification
After installation, verify all components:

- MongoDB:

macOS:

```bash
brew services list | grep mongodb
```

Ubuntu:

```bash
sudo systemctl status mongod
```

- Node.js:
```bash
node --version
```

## Troubleshooting
- If MongoDB fails to start, try:

macOS:

```bash
brew services restart mongodb-community
```

Ubuntu:

```bash
sudo systemctl restart mongod
sudo systemctl status mongod
```

- If the setup script fails, check the generated log file in the current directory named \`setup_YYYYMMDD_HHMMSS.log\` 