# 旅途博客 本地部署 + 内网穿透手册

> 本手册面向**零基础**用户。即使你不懂 Linux、网络、Docker，按照步骤操作也能成功部署。
>
> **适用场景：** 将博客部署在家里的电脑上（旧电脑、NAS、树莓派等），通过内网穿透让外网可以访问。

---

## 目录

1. [整体架构说明](#1-整体架构说明)
2. [准备工作](#2-准备工作)
3. [云服务器搭建（frp 中转）](#3-云服务器搭建frp-中转)
4. [本地服务器搭建（博客本体）](#4-本地服务器搭建博客本体)
5. [frp 内网穿透配置](#5-frp-内网穿透配置)
6. [域名与 HTTPS](#6-域名与-https)
7. [验证部署](#7-验证部署)
8. [日常维护](#8-日常维护)
9. [故障排查](#9-故障排查)

---

## 1. 整体架构说明

### 1.1 什么是内网穿透？

家庭宽带没有独立的公网 IP（你家的路由器 IP 是运营商分配的共享 IP），外网无法直接连接你家里的电脑。

**内网穿透**就是在一台有公网 IP 的云服务器上做一个"桥梁"：用户访问云服务器，云服务器把请求转给你家里的电脑。

### 1.2 数据流向

```
用户浏览器
    │
    ▼
https://yourdomain.com              ← 域名
    │
    ▼
云服务器（公网 IP）                   ← 最便宜的云服务器，仅做中转
    ├── Nginx（处理 HTTPS/SSL）
    └── frps（frp 服务端）
    │
    ▼  ───────── 内网穿透隧道 ────────
    │
本地服务器（你家中的电脑）             ← 运行博客程序
    ├── frpc（frp 客户端）
    └── Docker 容器
        ├── PostgreSQL（数据库）
        ├── Redis（缓存）
        ├── server（后端 API）
        └── client（前端页面）
```

### 1.3 你需要准备什么

| 资源 | 用途 | 预计费用 |
|------|------|---------|
| 一台本地电脑 | 运行博客程序（旧电脑、NAS、甚至是你日常用的电脑） | 0 元（使用现有设备） |
| 一台云服务器 | 做内网穿透中转（最低配 1核1G 即可） | ≈50 元/月 |
| 一个域名 | 用户访问你的博客 | ≈30-80 元/年 |

**为什么需要云服务器？** 因为家庭宽带没有公网 IP，需要一台有公网 IP 的机器做中转。这是目前唯一稳定的方案。如果你不想买云服务器，可以看 [9.6 节](#96-有没有免费的内网穿透方案)。

---

## 2. 准备工作

### 2.1 本地服务器要求

任何能长期开机的电脑都可以：

| 要求 | 说明 |
|------|------|
| 操作系统 | Windows 10/11（专业版）、Ubuntu 22.04、macOS |
| CPU | ≥ 2 核 |
| 内存 | ≥ 4 GB |
| 硬盘 | ≥ 40 GB 剩余空间 |
| 网络 | 家庭宽带即可（不需要公网 IP） |
| 开机时间 | **建议 24 小时开机**（关机后博客无法访问） |

> **没有多余电脑？** 用你日常用的电脑也行，但运行 Docker 会占用一定资源。本博客很轻量，日常使用影响不大。

### 2.2 云服务器要求

买**最便宜**的配置就行，它只做数据中转：

| 配置项 | 要求 | 推荐 |
|--------|------|------|
| CPU | 1 核 | 1 核 |
| 内存 | 1 GB | 1 GB |
| 硬盘 | 20 GB | 20 GB |
| 带宽 | 3 Mbps | 5 Mbps（影响访问速度） |
| 操作系统 | **Ubuntu 22.04** | Ubuntu 22.04 LTS |

**推荐购买渠道：**
- 阿里云"轻量应用服务器"（https://www.aliyun.com）— 新人 24 元/月
- 腾讯云"轻量应用服务器"（https://cloud.tencent.com）— 新人 30 元/月
- 华为云"弹性云服务器"（https://www.huaweicloud.com）
- UCloud（https://www.ucloud.cn）— 有时有特惠

> 购买时注意选择 **Ubuntu 22.04** 操作系统。不要买带宽太低的（< 3 Mbps 会很慢）。

**购买后记下：**
- 服务器 **公网 IP**（例如 `123.123.123.123`）
- **用户名**（Ubuntu 默认是 `root` 或 `ubuntu`）
- **密码**（或 SSH 密钥）

### 2.3 域名要求

一个你自己域名，例如 `mytravelblog.com`。

**购买渠道：**
- 阿里云万网（https://wanwang.aliyun.com）
- 腾讯云 DNSPod（https://dnspod.cloud.tencent.com）
- GoDaddy（https://www.godaddy.com）
- Namecheap（https://www.namecheap.com）

**选域名技巧：** .com .cn .xyz .top 都可以，选便宜的就行。

> **注意：** 如果你已经有域名了，不需要重新买。本手册中所有出现 `yourdomain.com` 的地方，替换成你自己的域名。

### 2.4 将代码上传到 GitHub

你的博客代码需要先传到 GitHub，然后服务器和本地机器分别拉取。

如果你还没上传代码，在**你的电脑**上执行：

```bash
# 打开终端（Windows 用 PowerShell，Mac/Linux 用终端）
# 进入博客项目目录
cd D:\姚朱江\blog

# 初始化 Git（如果还没做）
git init

# 添加所有文件
git add .

# 提交
git commit -m "初始化博客项目"

# 在 GitHub 上新建一个仓库（不要勾选"初始化 README"）
# 把本地代码推送上去
git remote add origin https://github.com/你的用户名/你的仓库名.git
git branch -M main
git push -u origin main
```

---

## 3. 云服务器搭建（frp 中转）

这一节在**云服务器**上操作。先 SSH 连接到云服务器。

### 3.1 连接云服务器

打开你电脑的终端（Windows 用 PowerShell，Mac/Linux 用终端）：

```bash
# 替换为你的云服务器 IP
ssh root@123.123.123.123
```

**首次连接**会出现安全提示，输入 `yes` 回车，然后输入密码。

连接成功后你会看到类似 `root@your-server:~#` 的提示符。

### 3.2 安装 Docker

```bash
# 更新软件源
sudo apt-get update

# 安装 Docker
curl -fsSL https://get.docker.com | bash
```

### 3.3 创建 frp 工作目录

```bash
mkdir -p /opt/frp
cd /opt/frp
```

### 3.4 创建 frp 服务端配置文件

```bash
nano frps.toml
```

**粘贴以下内容（注意修改 `yourdomain.com` 为你的域名）：**

```toml
bindPort = 7000
vhostHTTPPort = 8080

webServer.addr = "0.0.0.0"
webServer.port = 7500
webServer.user = "admin"
webServer.password = "admin123"

log.to = "./frps.log"
log.level = "info"
```

**解释：**
- `bindPort = 7000` — frp 控制端口，frp 客户端通过这个端口连接
- `vhostHTTPPort = 8080` — HTTP 请求转发端口，Nginx 从这个端口取数据发给本地
- `webServer.port = 7500` — frp 管理面板端口（可以浏览器查看连接状态）
- `webServer.user/password` — 管理面板的登录账号密码

**保存退出：** `Ctrl+X` → `Y` → `Enter`

### 3.5 创建 Nginx 配置文件

```bash
# 创建 Nginx 配置目录
sudo mkdir -p /opt/frp/nginx-conf

# 创建 Nginx 配置文件
sudo nano /opt/frp/nginx-conf/default.conf
```

**粘贴以下内容（将 `yourdomain.com` 替换为你的真实域名）：**

```nginx
# HTTP → HTTPS 重定向
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS 服务
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL 证书（后面会配置）
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    client_max_body_size 10M;

    location / {
        proxy_pass http://host.docker.internal:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**解释：**
- `proxy_pass http://host.docker.internal:8080` — 把请求转给 frps 的 vhostHTTPPort。`host.docker.internal` 是 Docker 容器访问宿主机的方式。
- 之所以不直接写 `localhost:8080`，是因为 Nginx 运行在 Docker 容器里，需要用 `host.docker.internal` 才能访问到宿主机上 frps 监听的 8080 端口。

**保存退出：** `Ctrl+X` → `Y` → `Enter`

### 3.6 创建 docker-compose.yml

```bash
sudo nano /opt/frp/docker-compose.yml
```

**粘贴以下内容：**

```yaml
services:
  # ========== frp 服务端 ==========
  frps:
    image: snowdreamtech/frps:latest
    container_name: frps
    restart: unless-stopped
    ports:
      - "7000:7000"
      - "8080:8080"
      - "7500:7500"
    volumes:
      - ./frps.toml:/etc/frp/frps.toml
    network_mode: host

  # ========== Nginx（SSL 反向代理） ==========
  nginx:
    image: nginx:alpine
    container_name: frp-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx-conf/default.conf:/etc/nginx/conf.d/default.conf
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - frps
```

> **注意：** frps 使用 `network_mode: host`，这样它直接在宿主机网络上监听端口，Nginx 容器可以通过 `host.docker.internal` 访问到 frps。

**保存退出：** `Ctrl+X` → `Y` → `Enter`

### 3.7 启动 frp 和 Nginx

```bash
cd /opt/frp
docker compose up -d
```

**查看运行状态：**

```bash
docker compose ps
```

确保两个容器都显示 `Up`。

**查看日志确认没有错误：**

```bash
docker compose logs
```

### 3.8 验证 frp 和 Nginx 是否启动成功

```bash
# 检查端口监听情况
curl -I http://localhost:80
```

应该返回 HTTP 响应头（300 重定向，因为没有 SSL 证书所以 443 还没起来，正常）。

> 目前 Nginx 的 SSL 部分还不能工作（证书还没配置），第 6 节会处理。

---

## 4. 本地服务器搭建（博客本体）

这一节在**你家中的本地服务器**上操作。

### 4.1 确定你的操作系统

**Windows 用户：** 建议安装 **Ubuntu 22.04 双系统** 或使用 **WSL2**（推荐）。
**Mac 用户：** 直接用终端。
**Linux 用户：** 直接用终端。

> **Windows 用户如果没有 Ubuntu 经验，建议装 WSL2：**
> 1. 打开 PowerShell（管理员），运行：`wsl --install -d Ubuntu-22.04`
> 2. 重启电脑
> 3. 打开"开始"菜单，搜索"Ubuntu"并打开
> 4. 设置用户名密码
> 5. 之后的命令都在 Ubuntu 终端中执行

### 4.2 安装 Docker

**Ubuntu / WSL2 用户：**

```bash
# 更新软件源
sudo apt-get update

# 安装 Docker
curl -fsSL https://get.docker.com | bash

# 将当前用户加入 docker 组（避免每次输 sudo）
sudo usermod -aG docker $USER

# 重新登录使配置生效
exit
```

**重新打开终端，验证 Docker：**

```bash
docker --version
```

**安装 Docker Compose 插件：**

```bash
sudo apt-get install -y docker-compose-plugin
```

**验证：**

```bash
docker compose version
```

### 4.3 下载博客代码

```bash
# 创建目录
sudo mkdir -p /opt
cd /opt

# 克隆代码（替换为你的 GitHub 仓库地址）
sudo git clone https://github.com/你的用户名/你的仓库名.git travelblog

# 进入项目目录
cd /opt/travelblog

# 确保有执行权限
sudo chown -R $USER:$USER .
```

### 4.4 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置文件
nano .env
```

**逐项修改每个配置项（以下是完整说明）：**

```
# 环境模式（必须改为 production）
NODE_ENV=production

# 端口（保持默认）
PORT=3000

# 数据库密码（必须修改！设一个复杂的密码）
DB_PASSWORD=MyBlog_Db_2024_YourPassword
```

> **重要：** `DB_HOST` 和 `REDIS_HOST` 保持 `localhost` 不要改。生产模式下 `docker-compose.prod.yml` 会自动覆盖为正确的容器名。

```
# JWT 密钥（随机生成，两个不能相同！）
JWT_SECRET=用 openssl rand -hex 32 生成一个
JWT_REFRESH_SECRET=再生成另一个
```

**生成随机密钥的方法：**

在新开一个终端窗口（不关闭 nano），执行：

```bash
openssl rand -hex 32
```

复制输出的字符串，粘贴到 `JWT_SECRET=` 后面。再执行一次，用第二个字符串填 `JWT_REFRESH_SECRET=`。

```
# 邮件服务（用于发送注册验证码）
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_USER=你的邮箱@qq.com
SMTP_PASS=你的 SMTP 授权码（16位）
SMTP_FROM=旅途博客
```

**获取 QQ 邮箱授权码：**
1. 登录 https://mail.qq.com
2. 设置 → 账户 → 开启"SMTP服务"
3. 点击"生成授权码"，复制 16 位授权码

```
# 其他配置保持默认
AMAP_API_KEY=
AMAP_API_SECRET=
STORAGE_PROVIDER=local
UPLOAD_DIR=./uploads
```

**保存退出：** `Ctrl+X` → `Y` → `Enter`

### 4.5 启动博客

```bash
cd /opt/travelblog

# 构建并启动所有服务
docker compose -f docker-compose.prod.yml up -d
```

**首次启动需要 5-15 分钟**（下载镜像 + 编译代码）。

**查看启动状态：**

```bash
docker compose -f docker-compose.prod.yml ps
```

所有 4 个容器都应该显示 `Up` 或 `Up (healthy)`：

```
travelblog-postgres     Up (healthy)
travelblog-redis        Up (healthy)
travelblog-server       Up
travelblog-client       Up
```

**验证博客在本机运行正常：**

```bash
# 测试本地访问
curl -I http://localhost:80
```

应该返回 `HTTP/1.1 200 OK`。

```bash
# 测试 API
curl http://localhost:3000/api/blogs
```

应该返回 JSON 格式的博客列表（可能为空列表）。

> **curl 命令返回乱码或 connection refused？** 等几秒再试，容器可能需要时间启动。

---

## 5. frp 内网穿透配置

这一节在**本地服务器**上操作。frpc（frp 客户端）负责连接到云服务器的 frps，建立隧道。

### 5.1 创建 frpc 配置目录

```bash
mkdir -p /opt/frpc
cd /opt/frpc
```

### 5.2 创建 frp 客户端配置文件

```bash
nano frpc.toml
```

**粘贴以下内容（替换 `123.123.123.123` 为你的云服务器 IP，`yourdomain.com` 为你的域名）：**

```toml
serverAddr = "123.123.123.123"
serverPort = 7000

[[proxies]]
name = "blog-web"
type = "http"
localIP = "127.0.0.1"
localPort = 80
customDomains = ["yourdomain.com", "www.yourdomain.com"]

[[proxies]]
name = "blog-api"
type = "http"
localIP = "127.0.0.1"
localPort = 80
customDomains = ["api.yourdomain.com"]
```

> **注意：** 这里 `localPort = 80` 指向的是本地博客 Docker 中 client 容器暴露的端口。frpc 会把 `yourdomain.com` 的请求转发到本地 80 端口。

**保存退出：** `Ctrl+X` → `Y` → `Enter`

### 5.3 创建 frpc Docker Compose 文件

```bash
nano docker-compose.yml
```

**粘贴以下内容：**

```yaml
services:
  frpc:
    image: snowdreamtech/frpc:latest
    container_name: frpc
    restart: unless-stopped
    volumes:
      - ./frpc.toml:/etc/frp/frpc.toml
    network_mode: host
```

> **为什么用 `network_mode: host`？** 因为 frpc 需要访问本地主机的 80 端口（博客 Nginx），用 host 模式可以直接用 `127.0.0.1` 访问。

**保存退出：** `Ctrl+X` → `Y` → `Enter`

### 5.4 启动 frpc

```bash
cd /opt/frpc
docker compose up -d
```

**检查是否成功连接到云服务器：**

```bash
# 查看日志
docker compose logs
```

**成功连接时，日志应该显示：**

```
[I] [proxy_manager.go] [233] proxy added: [blog-web]
[I] [control.go] [180] login to server success
```

**如果看到以下内容说明连接失败：**

```
[E] [control.go] [180] login to server error: dial tcp 123.123.123.123:7000: connect: connection refused
```

> 检查云服务器的防火墙/安全组是否开放了 7000 端口。详见 [9.3 节](#93-frpc-连接不上云服务器)。

### 5.5 在 frp 管理面板验证连接

在浏览器打开（从任意电脑）：`http://云服务器IP:7500`

输入之前设置的用户名 `admin` 和密码 `admin123`。

你应该能看到一个连接列表，`blog-web` 状态为 `online`。

---

## 6. 域名与 HTTPS

### 6.1 配置域名 DNS

登录你的域名注册商网站，找到"DNS 管理"或"域名解析"。

**添加以下 DNS 记录：**

| 记录类型 | 主机记录 | 记录值 | TTL |
|---------|---------|--------|-----|
| A | @ | 你的云服务器 IP | 600 |
| A | www | 你的云服务器 IP | 600 |

**解释：**
- `@` 是根域名（例如 `yourdomain.com`）
- `www` 是子域名（例如 `www.yourdomain.com`）
- 记录值是**云服务器**的 IP（不是本地服务器的 IP）

**等待 DNS 生效**（通常 10-30 分钟，最长 48 小时）。

**验证 DNS：**

```bash
# 在任意电脑的终端执行
ping yourdomain.com
```

如果解析到了你的云服务器 IP，说明 DNS 生效了。

### 6.2 申请 SSL 证书

SSL 证书在**云服务器**上申请，因为只有云服务器有公网 IP。

```bash
# SSH 连接到云服务器
ssh root@123.123.123.123

# 安装 certbot
sudo apt-get install -y certbot

# 暂时停止 Nginx（因为它占用了 80 端口）
cd /opt/frp
docker compose stop nginx

# 申请证书（将 yourdomain.com 替换为你的域名）
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
```

**交互操作：**
1. 输入邮箱地址 → 回车
2. 输入 `a` 同意条款 → 回车
3. 输入 `n` 不分享邮箱 → 回车

**成功输出：**

```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/yourdomain.com/fullchain.pem
Key is saved at: /etc/letsencrypt/live/yourdomain.com/privkey.pem
```

**重新启动 Nginx：**

```bash
cd /opt/frp
docker compose up -d
```

### 6.3 验证 HTTPS

打开浏览器访问 `https://yourdomain.com`（替换为你的域名）。

**预期结果（三种现象逐步出现）：**

**第一步：** Nginx 返回 502 Bad Gateway（这是正常的！因为 frp 隧道刚启动可能还没连通）

> 502 表示 Nginx（云服务器）已经正常工作了，但后端还没响应。等 1-2 分钟刷新。

**第二步：** 页面正常显示博客首页

> 如果页面正常加载，恭喜！部署成功了！

**第三步：** 浏览器地址栏显示 🔒 小锁图标，访问 `http://yourdomain.com` 会自动跳转到 `https://`

> 如果 302 重定向不生效，检查 Nginx 配置中是否有 `return 301 https://...` 这行。

### 6.4 设置 SSL 证书自动续期

Let's Encrypt 证书 90 天有效，需要自动续期。

```bash
# 在云服务器上执行
sudo crontab -e
```

**首次运行选择编辑器：** 输入 `1` 选 nano。

**在文件末尾添加：**

```cron
0 3 1 * * cd /opt/frp && docker compose stop nginx && certbot renew && docker compose start nginx
```

**保存退出：** `Ctrl+X` → `Y` → `Enter`

**验证：**

```bash
sudo crontab -l
```

应该能看到刚添加的内容。

### 6.5 完整数据流回顾

至此，你的博客完整数据流是：

```
你在浏览器输入 https://yourdomain.com
                        │
                        ▼
               DNS 解析到云服务器 IP
                        │
                        ▼
       云服务器 Nginx（处理 HTTPS 加密/解密）
                        │
                        ▼
         转发到 frps（云服务器上，端口 8080）
                        │
                        ▼
         ──── frp 隧道（加密传输）────
                        │
                        ▼
       frpc（本地服务器，连接到云服务器 frps）
                        │
                        ▼
  本地博客 Nginx（运行在 Docker 的 client 容器）
                        │
            ┌───────────┴───────────┐
            ▼                       ▼
      静态文件（HTML/JS/CSS）    后端 API（server 容器）
                                    │
                          ┌─────────┴─────────┐
                          ▼                   ▼
                    PostgreSQL            Redis
```

---

## 7. 验证部署

### 7.1 功能检查清单

| 验证项 | 操作方法 | 预期结果 |
|--------|---------|---------|
| HTTPS 访问 | 浏览器打开 `https://yourdomain.com` | 页面正常，地址栏有 🔒 |
| HTTP 跳转 | 浏览器打开 `http://yourdomain.com` | 自动跳转到 `https://` |
| 首页导航 | 点击"首页""交流社区"等菜单 | 页面切换正常 |
| 注册功能 | 点击"注册"，填写信息 | 收到验证码邮件 |
| 登录功能 | 注册后登录 | 显示用户名 |
| 发帖功能 | 登录后发布帖子 | 帖子显示在社区 |
| API 接口 | `curl https://yourdomain.com/api/blogs` | 返回 JSON |
| 手机访问 | 用手机浏览器打开 | 页面适配移动端 |

### 7.2 查看日志确认无报错

**云服务器：**

```bash
ssh root@123.123.123.123
cd /opt/frp
docker compose logs --tail=50
```

不应该看到 `ERROR` 级别的日志。

**本地服务器：**

```bash
cd /opt/travelblog
docker compose -f docker-compose.prod.yml logs --tail=50
```

不应该看到 `ConnectionRefusedError` 或 `ECONNREFUSED` 之类的错误。

---

## 8. 日常维护

### 8.1 查看运行状态

**本地服务器（查看博客状态）：**

```bash
cd /opt/travelblog
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f server
```

**frp 隧道状态：**

```bash
cd /opt/frpc
docker compose logs --tail=10
```

也可以在浏览器打开 `http://云服务器IP:7500` 查看 frp 管理面板。

### 8.2 更新博客代码

```bash
# 在本地服务器上执行

# 1. 进入项目目录
cd /opt/travelblog

# 2. 拉取最新代码
git pull

# 3. 重新构建并启动有变动的服务
docker compose -f docker-compose.prod.yml up -d --build

# 4. 清理旧镜像
docker system prune -f
```

### 8.3 重启服务

```bash
# 重启所有
docker compose -f docker-compose.prod.yml restart

# 只重启某个服务
docker compose -f docker-compose.prod.yml restart server
```

### 8.4 备份数据库

```bash
# 创建备份目录
mkdir -p /opt/backups

# 备份（文件名含日期）
docker exec travelblog-postgres pg_dump -U postgres travel_blog > /opt/backups/blog_$(date +%Y%m%d).sql

# 查看备份文件
ls -la /opt/backups/
```

**建议**将备份文件定期复制到另一台电脑或网盘。

### 8.5 重启本地服务器（例如电脑重启后）

如果你重启了家里的电脑，启动后执行：

```bash
# 启动博客
cd /opt/travelblog
docker compose -f docker-compose.prod.yml up -d

# 启动 frp 隧道
cd /opt/frpc
docker compose up -d

# 检查状态
docker compose -f /opt/travelblog/docker-compose.prod.yml ps
docker compose -f /opt/frpc/docker-compose.yml ps
```

> **进阶：** 可以设置 Docker 开机自启（`sudo systemctl enable docker`），然后添加 `restart: always` 到所有 docker-compose.yml 中，这样电脑开机后所有服务会自动启动。

---

## 9. 故障排查

### 9.1 本地博客打不开（`curl localhost:80` 失败）

**可能原因：** Docker 容器未启动或启动失败。

```bash
cd /opt/travelblog
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs server
```

**解决方法：** 如果容器是 `Exited` 状态，查看错误日志，修复后重启：

```bash
docker compose -f docker-compose.prod.yml up -d
```

### 9.2 外网访问时页面加载不出来

**排查步骤：**

**第 1 步 — 检查 frp 管理面板**

浏览器访问 `http://云服务器IP:7500`，查看 `blog-web` 是否 `online`。

如果是 `offline` → 本地 frpc 没连上，看下一步。

**第 2 步 — 检查 frpc 日志**

```bash
# 在本地服务器执行
cd /opt/frpc
docker compose logs
```

**第 3 步 — 检查云服务器防火墙**

登录云服务商控制台，找到"安全组"或"防火墙"，确认以下端口已开放：

| 端口 | 协议 | 来源 | 用途 |
|------|------|------|------|
| 80 | TCP | `0.0.0.0/0` | HTTP |
| 443 | TCP | `0.0.0.0/0` | HTTPS |
| 7000 | TCP | `0.0.0.0/0` | frp 控制连接 |
| 8080 | TCP | `0.0.0.0/0` | frp HTTP 转发 |
| 7500 | TCP | `0.0.0.0/0` | frp 管理面板 |

> **7000 端口特别重要**，如果没开放，frpc 连接不上 frps。

### 9.3 frpc 连接不上云服务器

**报错信息：** `login to server error: dial tcp 123.123.123.123:7000: connect: connection refused`

**可能原因和解决方法：**

**① 云服务器 frps 没启动**

```bash
# 在云服务器上检查
ssh root@123.123.123.123
cd /opt/frp
docker compose ps
docker compose logs frps
```

如果 frps 没启动，`docker compose up -d` 启动它。

**② 防火墙没开放 7000 端口**

在云服务商控制台的"安全组"中添加规则：入方向 TCP 7000 端口。

**③ frpc.toml 中的 IP 地址写错了**

```bash
# 在本地服务器检查 frpc 配置
cat /opt/frpc/frpc.toml
```

确认 `serverAddr = "你的云服务器IP"` 写对了。

### 9.4 打开域名显示 502 Bad Gateway

**含义：** Nginx 正常工作了（这是好事！），但转发到 frp 时出了问题。

**可能原因：** 请求到了云服务器的 Nginx，但 Nginx 转发到 `localhost:8080`（frps）失败了。

**排查：**

```bash
# 在云服务器上检查 frps 是否监听 8080 端口
ssh root@123.123.123.123
sudo lsof -i :8080
```

如果没输出，说明 frps 没监听 8080 端口。检查 frps 配置：

```bash
cd /opt/frp
cat frps.toml  # 确认 vhostHTTPPort = 8080
docker compose logs frps
```

### 9.5 HTTPS 显示"您的连接不是私密连接"

**原因：** SSL 证书有问题（未正确配置或已过期）。

**排查：**

```bash
# 在云服务器上检查证书是否存在
ssh root@123.123.123.123
sudo ls -la /etc/letsencrypt/live/yourdomain.com/
```

如果目录为空，重新申请证书：

```bash
cd /opt/frp
docker compose stop nginx
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
docker compose up -d
```

### 9.6 有没有免费的内网穿透方案？

如果你不想买云服务器，以下是免费的替代方案：

**方案一：cpolar（最简单）**

1. 注册 https://www.cpolar.com
2. 下载安装 cpolar 客户端到本地服务器
3. 运行 `cpolar http 80`（映射本地 80 端口）
4. 会得到一个临时公网 URL（例如 `https://xxxxx.cpolar.io`）
5. 免费版 URL 每次重启会变，域名随机，速度较慢

**方案二：ngrok**

1. 注册 https://ngrok.com
2. 下载安装 ngrok
3. 运行 `ngrok http 80`
4. 类似 cpolar，免费版有限制

**方案三：Cloudflare Tunnel（如果域名在 Cloudflare）**

1. 将域名 DNS 托管到 Cloudflare
2. 在本地服务器安装 `cloudflared`
3. 运行 `cloudflared tunnel --url http://localhost:80`
4. Cloudflare 自动处理 SSL 证书，不需要额外配置

> 这些免费方案适合**测试和学习**。生产环境建议用 frp + 云服务器，更稳定、速度更快、域名可控。

### 9.7 本地服务器关机后怎么办？

博客会无法访问，直到你重新开机并启动服务。

**如果你经常关机：**

- 在手机或另一台电脑上保存以下"开机启动"命令：

```bash
cd /opt/travelblog && docker compose -f docker-compose.prod.yml up -d && cd /opt/frpc && docker compose up -d
```

- 或者设置 Docker 开机自启：

```bash
sudo systemctl enable docker
```

然后给所有 docker-compose.yml 加上 `restart: always`（目前配置的是 `unless-stopped`，效果类似）。

### 9.8 如何排查网络慢的问题？

- 访问 `https://yourdomain.com` 很慢，可能是云服务器带宽太小
- 图片加载慢，可以压缩图片再上传
- 可以开启 Nginx 的 gzip 压缩（已配置）
- 云服务器尽量选靠近你所在地区的节点

---

## 附录：端口速查表

| 端口 | 在哪台机器 | 用途 | 是否需对外开放 |
|------|-----------|------|--------------|
| 22 | 云服务器 | SSH 远程连接 | 是（建议限制来源 IP） |
| 80 | 云服务器 | HTTP -> HTTPS 重定向 | 是 |
| 443 | 云服务器 | HTTPS 网页访问 | 是 |
| 7000 | 云服务器 | frp 控制连接（frpc 连 frps） | 是 |
| 7500 | 云服务器 | frp 管理面板 | 推荐不开放（内网访问） |
| 8080 | 云服务器 | frp HTTP 转发（内部使用） | 不开放 |
| 80 | 本地服务器 | 博客 Nginx（仅本地访问） | 否 |
| 3000 | 本地服务器 | 后端 API（仅 Docker 内部） | 否 |
| 5432 | 本地服务器 | PostgreSQL（仅 Docker 内部） | 否 |
| 6379 | 本地服务器 | Redis（仅 Docker 内部） | 否 |

## 附录：常用命令速查

```bash
# ─── 云服务器 ───
ssh root@云服务器IP                          # 连接云服务器
cd /opt/frp && docker compose ps             # 查看 frp + Nginx 状态
cd /opt/frp && docker compose logs -f        # 查看日志
cd /opt/frp && docker compose restart        # 重启

# ─── 本地服务器 ───
cd /opt/travelblog && docker compose -f docker-compose.prod.yml ps     # 查看博客状态
cd /opt/travelblog && docker compose -f docker-compose.prod.yml logs -f server  # 后端日志
cd /opt/travelblog && git pull && docker compose -f docker-compose.prod.yml up -d --build  # 更新

# ─── frp ───
cd /opt/frpc && docker compose logs          # 查看 frpc 连接状态
cd /opt/frpc && docker compose restart       # 重启 frpc
# frp 管理面板: http://云服务器IP:7500
```
