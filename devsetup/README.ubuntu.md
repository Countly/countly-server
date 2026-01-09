# Remote Development Setup Guide - Ubuntu

## Prerequisites
- Ubuntu 22.04/24.04 LTS
- SSH access to the remote server

## SSH Agent Forwarding Setup
To make sure you can use SSH forwarding to pull/push from github repository, you need to setup SSH Agent Forwarding. This will allow you to use your local SSH key pair to authenticate with GitHub. 

### 1. Local Machine Configuration (macOS/Linux)
```bash
vim ~/.ssh/config
```

Add the following:
```
Host server-nickname
  HostName your-server-ip
  User your-username-you-use-to-login-using-ssh-command
  ForwardAgent yes
```

### 2. Remote Server SSH Configuration
```bash
sudo vim /etc/ssh/sshd_config
```

Ensure this line is uncommented:
```
AllowAgentForwarding yes
```

Restart SSH service:
```bash
sudo systemctl restart ssh
```

### 3. Using SSH Nickname
After configuring your SSH config file, you can now connect to your server using the nickname instead of the full hostname:

```bash
ssh server-nickname
```

This is equivalent to:
```bash
ssh your-username@your-server-ip
```

The SSH agent forwarding will automatically work when using the nickname, allowing you to use your local SSH keys on the remote server for GitHub operations.

## Installation Steps

### 1. Install MongoDB
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

### 2. Install Fast Node Manager (fnm)
```bash
curl -fsSL https://fnm.vercel.app/install | bash

# Add fnm to shell configuration
echo 'eval "$(fnm env --use-on-cd)"' >> ~/.bashrc
source ~/.bashrc
```

### 3. Install Node.js
```bash
fnm install 22
fnm use 22
```

Verify the installation:
```bash
node --version
npm --version
```

### 4. Run Development Setup Script
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
- Clone the repository using SSH
- Set up submodules
- Link plugins
- Install dependencies
- Configure the development environment

## Verification
After installation, verify all components:

1. MongoDB:
```bash
sudo systemctl status mongod
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
- If MongoDB fails to start:
```bash
sudo systemctl restart mongod
sudo systemctl status mongod
```

- If SSH agent forwarding isn't working:
```bash
ssh -T git@github.com
```

- If the setup script fails, check the generated log file in the current directory named \`setup_YYYYMMDD_HHMMSS.log\`

- For permission issues:
```bash
sudo chown -R $USER:$USER ~/countly
``` 