# Local Development Setup Guide - macOS

## Prerequisites
- macOS 10.15 or later
- Terminal access
- Homebrew package manager

## Installation Steps

### 1. Install Homebrew (if not installed)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. Install MongoDB
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

Verify MongoDB is running:
```bash
brew services list | grep mongodb
```

### 3. Install Fast Node Manager (fnm)
```bash
curl -fsSL https://fnm.vercel.app/install | bash
```

Add fnm to your shell configuration:
```bash
echo 'eval "$(fnm env --use-on-cd)"' >> ~/.zshrc
source ~/.zshrc
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
1. Navigate to your project directory
2. Make the setup script executable:
```bash
chmod +x .vscode/devsetup.sh
```

3. Run the setup script:
```bash
./.vscode/devsetup.sh
```

The script will:
- Clone the repository
- Set up submodules
- Link plugins
- Install dependencies
- Configure the development environment

## Verification
After installation, verify all components:

1. MongoDB:
```bash
brew services list | grep mongodb
```

2. Node.js:
```bash
node --version
```

3. Project setup:
```bash
cd countly/core
npm start
```

## Troubleshooting
- If MongoDB fails to start, try:
```bash
brew services restart mongodb-community
```

- If the setup script fails, check the generated log file in the current directory named \`setup_YYYYMMDD_HHMMSS.log\` 