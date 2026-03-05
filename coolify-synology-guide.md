---
title: Installing Coolify on Synology DS718+
pdf_options:
  format: A4
  margin: 30mm 25mm
  printBackground: true
stylesheet: https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.5.1/github-markdown.min.css
body_class: markdown-body
css: |-
  .markdown-body { font-size: 14px; max-width: 900px; margin: 0 auto; padding: 2rem; }
  h1 { border-bottom: 2px solid #0366d6; padding-bottom: 0.5rem; }
  h2 { border-bottom: 1px solid #e1e4e8; padding-bottom: 0.3rem; margin-top: 2rem; }
  code { background: #f6f8fa; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
  pre { background: #f6f8fa; padding: 1rem; border-radius: 6px; overflow-x: auto; }
  pre code { background: none; padding: 0; }
  table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
  th, td { border: 1px solid #e1e4e8; padding: 8px 12px; text-align: left; }
  th { background: #f6f8fa; font-weight: 600; }
  .note { background: #fff8c5; border-left: 4px solid #f0b429; padding: 0.75rem 1rem; margin: 1rem 0; border-radius: 0 4px 4px 0; }
  .warning { background: #fff5f5; border-left: 4px solid #e53e3e; padding: 0.75rem 1rem; margin: 1rem 0; border-radius: 0 4px 4px 0; }
  .tip { background: #f0fff4; border-left: 4px solid #38a169; padding: 0.75rem 1rem; margin: 1rem 0; border-radius: 0 4px 4px 0; }
---

# Installing Coolify on Synology DS718+

**Coolify** is a self-hosted platform for deploying web apps from a Git repository — similar to Netlify, but running entirely on your own hardware.

This guide covers installing Coolify inside an Ubuntu virtual machine on your Synology DS718+. This is necessary because Synology's Container Manager does not support Docker Swarm mode, which tools like Coolify and CapRover require.

---

## What you will need

- Synology DS718+ with DSM 7.x
- 6 GB RAM (you have this)
- **Virtual Machine Manager** package installed
- An Ubuntu 24.04 LTS ISO image (download link below)
- A domain name (for HTTPS — optional but recommended)
- About 30–45 minutes

---

## Step 1 — Install Virtual Machine Manager

1. Open **Package Center** on your Synology DSM
2. Search for **Virtual Machine Manager**
3. Click **Install** and follow the setup wizard
4. When prompted, select which storage volume to use for VM data

<div class="tip">If Virtual Machine Manager is not listed, your DS718+ storage may need to be configured as a storage pool first via Storage Manager.</div>

---

## Step 2 — Download Ubuntu 24.04 LTS

Download the Ubuntu Server ISO (not Desktop — it uses less RAM):

**URL:** https://releases.ubuntu.com/noble/ubuntu-24.04.4-live-server-amd64.iso

Upload it to your Synology once downloaded:

1. Open **File Station**
2. Create a folder: `homes/admin/ISOs` (or any location you prefer)
3. Upload the `.iso` file there

---

## Step 3 — Create the Ubuntu VM

1. Open **Virtual Machine Manager**
2. Click **Virtual Machine** → **Create**
3. Select **Linux** as the guest OS type
4. Configure the VM with these settings:

| Setting | Value                                     |
| ------- | ----------------------------------------- |
| Name    | `coolify`                                 |
| CPU     | 2 vCPUs                                   |
| RAM     | 2048 MB (2 GB)                            |
| Storage | 20 GB minimum                             |
| Network | Use the default VirtIO network adapter    |
| ISO     | Select the Ubuntu Server ISO you uploaded |

5. Click **Next** through the remaining screens, then **Apply**

---

## Step 4 — Install Ubuntu Server

1. In Virtual Machine Manager, select your VM and click **Connect**
2. A console window will open — boot into the Ubuntu installer
3. Work through the installer:
   - **Language:** English
   - **Keyboard:** your layout
   - **Network:** leave as default (DHCP) — note the IP address shown
   - **Storage:** use the entire virtual disk
   - **Profile:** create a username and password you will remember
   - **SSH:** tick **Install OpenSSH server** — this is important
   - Leave all other options as default
4. Complete the install and reboot when prompted
5. Remove the ISO in VM settings after reboot (Actions → Edit → remove the ISO from the CD/DVD drive)

---

## Step 5 — Note the VM's IP address

After Ubuntu boots, log in via the VM console and run:

```bash
ip addr show
```

Look for the `inet` address on the `ens3` or `eth0` interface, e.g. `192.168.1.105`. You will need this throughout the setup.

<div class="tip">To make this permanent, assign a static IP or a DHCP reservation for the VM's MAC address in your router settings.</div>

---

## Step 6 — Connect via SSH

From your Mac or PC, open a terminal and connect:

```bash
ssh your-username@192.168.1.105
```

Replace `192.168.1.105` with your VM's actual IP address. This is easier than using the VM console for the remaining steps.

---

## Step 7 — Install Docker

Run these commands inside the Ubuntu VM:

```bash
# Update package lists
sudo apt update && sudo apt upgrade -y

# Install Docker using the official install script
curl -fsSL https://get.docker.com | sh

# Allow your user to run Docker without sudo
sudo usermod -aG docker $USER

# Apply group change without logging out
newgrp docker

# Verify Docker is working
docker run hello-world
```

You should see a "Hello from Docker!" message confirming Docker is installed correctly.

---

## Step 8 — Install Coolify

Run the official Coolify install script:

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

This will:

- Install Docker Compose if not present
- Pull the Coolify Docker images
- Start all Coolify services
- Print the URL to access the dashboard

The install takes a few minutes. When complete you will see output similar to:

```
Coolify is ready to use!
Please visit: http://192.168.1.105:8000
```

---

## Step 9 — Access the Coolify dashboard

Open a browser and go to:

```
http://192.168.1.105:8000
```

(Replace with your VM's IP)

1. Create your admin account on the first-run screen
2. Complete the onboarding wizard
3. You are now in the Coolify dashboard

---

## Step 10 — Connect a Git repository

To deploy a Node.js app from GitHub:

1. In Coolify, go to **Sources** → **Add a new source**
2. Choose **GitHub** (or GitLab, Gitea, etc.)
3. Follow the OAuth or token setup to authorise Coolify to access your repos
4. Go to **Projects** → **New Project**
5. Click **New Resource** → **Application**
6. Select your connected Git source and choose your repository
7. Coolify will detect it is a Node.js app and configure build settings automatically
8. Click **Deploy**

Coolify will clone the repo, build it, and serve it. Future pushes to your chosen branch will trigger automatic redeploys via webhook.

---

## Optional — Set up a domain and HTTPS

If you have a domain name and want HTTPS (strongly recommended for production):

1. In your DNS provider, create an **A record** pointing your domain (or subdomain) to your **router's public IP**
2. In your router, forward **ports 80 and 443** to your VM's internal IP (`192.168.1.105`)
3. In Coolify, go to **Settings** → enter your domain
4. Coolify will automatically obtain a Let's Encrypt SSL certificate

<div class="warning">Port forwarding exposes your server to the internet. Ensure your Coolify admin password is strong and consider restricting access by IP if the apps are for personal use only.</div>

---

## Resource summary

After setup, your system will use approximately:

| Resource | DSM + NAS tasks | Coolify VM | Remaining         |
| -------- | --------------- | ---------- | ----------------- |
| RAM      | ~1.5 GB         | ~2 GB      | ~2.5 GB free      |
| CPU      | Low idle        | Low idle   | Plenty for builds |

---

## Useful commands (inside the VM)

```bash
# Check Coolify container status
docker ps

# View Coolify logs
docker logs coolify

# Restart Coolify
docker restart coolify

# Check VM IP address
ip addr show

# Update Ubuntu packages
sudo apt update && sudo apt upgrade -y
```

---

## Troubleshooting

**Cannot access the dashboard on port 8000**
Check that the Ubuntu firewall is not blocking the port:

```bash
sudo ufw allow 8000
sudo ufw allow 80
sudo ufw allow 443
```

**VM has no internet access**
Check the network adapter in VM settings is set to the correct bridge interface matching your Synology's network.

**Build runs out of memory**
The 2 GB RAM allocation should be sufficient for most Node.js builds. If builds fail, temporarily increase the VM RAM to 3 GB in Virtual Machine Manager settings (requires VM restart).

---

_Guide prepared March 2026. Coolify version at time of writing: v4.x_
