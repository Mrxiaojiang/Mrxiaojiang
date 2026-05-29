# 旅途博客 本地部署手册（cpolar 内网穿透）

> 本手册面向**零基础**用户。即使你不懂 Linux、网络、Docker，按步骤操作也能成功部署。
>
> **适用场景：** 将博客部署在家里的电脑上，通过 cpolar 内网穿透让外网可以访问。
>
> **为什么选 cpolar？** 无需云服务器，一条命令就能把本机服务暴露到公网，自动处理 HTTPS。

---

## 目录

1. [架构说明](#1-架构说明)
2. [准备工作](#2-准备工作)
3. [安装 Docker](#3-安装-docker)
4. [部署博客](#4-部署博客)
5. [cpolar 内网穿透](#5-cpolar-内网穿透)
6. [使用自己的域名（可选）](#6-使用自己的域名可选)
7. [验证部署](#7-验证部署)
8. [日常维护](#8-日常维护)
9. [故障排查](#9-故障排查)

---

## 1. 架构说明

### 1.1 数据流向

```
用户浏览器
    │
    ▼
https://xxx.cpolar.io         ← cpolar 提供的公网地址（自带 HTTPS）
    │
    ▼
cpolar 云服务器                ← cpolar 官方运营，不需要你自己买
    │
    ▼   ──── cpolar 隧道 ────
    │
你家中的电脑（本地服务器）       ← 运行博客程序
    └── Docker 容器
        ├── client（前端页面 + Nginx，端口 80）
        ├── server（后端 API，端口 3000）
        ├── PostgreSQL（数据库，端口 5432）
        └── Redis（缓存，端口 6379）
```

### 1.2 和内网穿透有什么区别？

**家庭宽带的特点：** 没有独立的公网 IP，别人无法直接连接你家中的电脑。

**cpolar 的作用：** 在你家中的电脑和 cpolar 的云服务器之间建立一条专用隧道。用户访问 cpolar 的公网地址，cpolar 把请求顺着隧道转发给你家中的电脑。

### 1.3 你需要准备什么

| 资源 | 用途 | 费用 |
|------|------|------|
| 一台电脑 | 运行博客（旧电脑、NAS、日常用的电脑均可） | 0 元（用现有设备） |
| cpolar 账号 | 注册 https://www.cpolar.com | **0 元（免费版够用）** |
| 一个域名 | 如果你想让用户通过 `你的名字.com` 访问（可选） | 0-80 元/年 |

**免费版 cpolar 的限制（够用）：**
- 得到一个随机公网地址，例如 `https://abc123.cpolar.io`
- 每次重启隧道地址会变化（付费版可固定）
- 每月 1GB 流量（个人博客够用）

**如果你想用固定地址或自己的域名，cpolar 套餐：**
- 基础版：约 98 元/年，固定子域名 + 自定义域名
- 具体价格以官网为准

---

## 2. 准备工作

### 2.1 本地服务器要求

任何能长期开机的电脑都可以。推荐 Ubuntu 系统，但 Windows 也能用。

| 要求 | 说明 |
|------|------|
| 操作系统 | Ubuntu 22.04（推荐）、Windows 10/11（需安装 WSL2）、macOS |
| CPU | ≥ 2 核 |
| 内存 | ≥ 4 GB |
| 硬盘 | ≥ 40 GB 剩余空间 |
| 网络 | 家庭宽带即可（不需要公网 IP） |
| 开机时间 | **建议 24 小时开机**（关机后博客无法访问） |

> **Windows 用户强烈建议安装 WSL2（适用于 Linux 的子系统），操作更简单：**
> 1. 右键"开始"按钮 → 选择"Windows PowerShell (管理员)"
> 2. 输入以下命令并回车：
>    ```
>    wsl --install -d Ubuntu-22.04
>    ```
> 3. 等待安装完成，重启电脑
> 4. 重启后会弹出 Ubuntu 配置窗口，设置用户名和密码
> 5. 之后所有命令都从这个 Ubuntu 终端执行

### 2.2 注册 cpolar 账号

1. 打开 https://www.cpolar.com
2. 点击右上角"注册"
3. 填写邮箱、密码完成注册
4. 登录后进入仪表盘
5. 在左侧找到"认证码"（Authtoken），记下这串字符，后面要用

### 2.3 将代码上传到 GitHub

博客代码需要上传到 GitHub，然后在服务器上下载。

如果你还没上传，在**你的日常电脑**上操作：

```bash
# 打开终端（Windows 用 PowerShell，Mac 用终端）
# 进入项目目录
cd D:\姚朱江\blog

# 初始化 Git（如果还没做）
git init

# 添加所有文件
git add .

# 提交
git commit -m "初始化博客项目"

# 在 GitHub 网站新建一个仓库（不要勾选 README）
# 然后把本地代码推送上去
git remote add origin https://github.com/你的用户名/你的仓库名.git
git branch -M main
git push -u origin main
```

---

## 3. 安装 Docker

Docker 是一个容器引擎，让博客程序在一个隔离的环境中运行。以下命令在**本地服务器**的终端执行。

### 3.1 Ubuntu / WSL2 用户

```bash
# 更新软件源（检查可用的软件版本）
sudo apt-get update

# 安装 Docker（一行命令自动完成）
curl -fsSL https://get.docker.com | bash

# 将当前用户加入 docker 组（以后执行 docker 不用加 sudo）
sudo usermod -aG docker $USER

# 重新登录使配置生效
exit
```

**重新打开终端**（或重新打开 Ubuntu 窗口），验证 Docker 安装成功：

```bash
docker --version
```

**安装 Docker Compose 插件（用来同时管理多个容器）：**

```bash
sudo apt-get install -y docker-compose-plugin

# 验证
docker compose version
```

### 3.2 配置 Docker 镜像加速器（国内用户必做）

> 由于国内网络限制，直接从 Docker Hub 拉取镜像会超时失败。需要配置国内镜像源。

```bash
# 创建 Docker 配置目录
sudo mkdir -p /etc/docker

# 创建配置文件
sudo tee /etc/docker/daemon.json <<-'EOF'
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://dockerproxy.com",
    "https://docker.nju.edu.cn",
    "https://docker.mirrors.sjtug.sjtu.edu.cn"
  ]
}
EOF

# 重启 Docker 使配置生效
sudo systemctl daemon-reload
sudo systemctl restart docker
```

**验证镜像源是否生效：**

```bash
docker info | grep -A 5 "Registry Mirrors"
```

**测试拉取镜像是否正常：**

```bash
docker pull redis:7-alpine
```

如果下载成功，说明镜像加速器配置生效了。

> 如果以上镜像都不可用，请在搜索引擎搜索"国内 Docker 镜像加速器"获取最新可用的地址。

### 3.3 Windows 用户（不使用 WSL2）

如果不想用 WSL2，可以直接在 Windows 上安装 Docker Desktop：

1. 打开 https://www.docker.com/products/docker-desktop/
2. 点击"Download for Windows"下载安装包
3. 双击安装，一路点"Next"
4. 安装完成后重启电脑
5. 启动 Docker Desktop（开始菜单搜索）

> Docker Desktop 需要 Windows 10/11 专业版或企业版。家庭版建议装 WSL2。

---

## 4. 部署博客

### 4.1 下载博客代码

```bash
# 创建项目目录
sudo mkdir -p /opt
cd /opt

# 从 GitHub 下载代码（替换为你的仓库地址）
sudo git clone https://github.com/你的用户名/你的仓库名.git travelblog

# 进入项目目录
cd /opt/travelblog

# 设置权限（确保当前用户可以操作这些文件）
sudo chown -R $USER:$USER .
```

### 4.2 配置环境变量

环境变量文件存储数据库密码、JWT 密钥等敏感信息。

```bash
# 从模板创建配置文件
cp .env.example .env

# 编辑配置文件
nano .env
```

**逐项修改：**

```
# 【必须改】NODE_ENV 改为 production
NODE_ENV=production

# 端口保持不动
PORT=3000

# 【必须改】设置数据库密码，随便想一个复杂的
DB_PASSWORD=MyBlog_Db_2024_YourPassword
```

> `DB_HOST` 和 `REDIS_HOST` 保持 `localhost` 不要改。Docker 会自动处理连接。

```
# 【必须改】JWT 密钥（用于加密用户登录状态）
# 关闭 nano，在终端执行以下命令生成随机字符串：
#   openssl rand -hex 32
# 把输出的字符串粘贴到下面
JWT_SECRET=这里填生成的第一个随机字符串
JWT_REFRESH_SECRET=这里填生成的第二个随机字符串（和上面不同）
JWT_EXPIRES_IN=2h
JWT_REFRESH_EXPIRES_IN=7d
```

> **如果不方便用 openssl**，可以手动输入任意长字符串，比如 `JWT_SECRET=myblog_jwt_key_2024_very_long_string_1234567890`。两个密钥不能相同。

```
# 【如果需要注册功能才改】邮件服务配置
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_USER=你的邮箱@qq.com
SMTP_PASS=你的16位SMTP授权码
SMTP_FROM=旅途博客
```

**获取 QQ 邮箱授权码：**
1. 登录 https://mail.qq.com → 设置 → 账户
2. 找到"POP3/SMTP服务"，点击"开启"
3. 按提示发送短信，获取 16 位授权码

```
# 其他配置保持默认
AMAP_API_KEY=
AMAP_API_SECRET=
STORAGE_PROVIDER=local
UPLOAD_DIR=./uploads
```

**保存退出：** `Ctrl+X` → `Y` → `Enter`

### 4.3 启动博客

```bash
cd /opt/travelblog

# 构建并启动所有服务（首次需 5-15 分钟）
docker compose -f docker-compose.prod.yml up -d
```

**查看各容器运行状态：**

```bash
docker compose -f docker-compose.prod.yml ps
```

所有 4 个容器应显示 `Up` 或 `Up (healthy)`：

```
travelblog-postgres     Up (healthy)
travelblog-redis        Up (healthy)
travelblog-server       Up
travelblog-client       Up
```

### 4.4 验证博客在本机运行正常

```bash
# 测试本地访问博客页面
curl -I http://localhost:80

# 测试后端 API
curl http://localhost:3000/api/blogs
```

**预期结果：**
- `curl -I` 返回 `HTTP/1.1 200 OK`
- `curl /api/blogs` 返回 `{"data":[],...}` 之类的 JSON

> 如果显示 `Connection refused`，等 10 秒再试，容器可能还在启动。

---

## 5. cpolar 内网穿透

这一节把本机的博客服务暴露到公网。

### 5.1 安装 cpolar

**Ubuntu / WSL2 用户：**

```bash
# 一键安装 cpolar
curl -L https://www.cpolar.com/static/downloads/install-release/cpolar.sh | sudo bash
```

**Windows 用户（不使用 WSL2）：**

1. 打开 https://www.cpolar.com/download 下载 Windows 版
2. 解压到 `C:\cpolar`
3. 打开 PowerShell（管理员），执行：
   ```
   cd C:\cpolar
   .\cpolar.exe version
   ```

### 5.2 配置认证码

认证码（Authtoken）用来关联你的 cpolar 账号。登录 https://www.cpolar.com 后在"认证码"页面查看。

**Ubuntu / WSL2：**

```bash
# 将你的认证码粘贴到下面（替换 xxxxxxxxxxxxxx）
cpolar authtoken xxxxxxxxxxxxxx
```

**Windows：**

```powershell
# 在 PowerShell 中执行
cpolar authtoken xxxxxxxxxxxxxx
```

### 5.3 启动隧道

cpolar 免费版支持一条隧道。我们将本机的 80 端口（博客前端）暴露出去。

**Ubuntu / WSL2：**

```bash
cpolar http 80
```

**Windows：**

```powershell
cpolar.exe http 80
```

**执行后的输出：**

```
Forwarding  https://abc123.cpolar.io -> http://localhost:80
Forwarding  http://abc123.cpolar.io -> http://localhost:80
```

> 注意 `abc123.cpolar.io` 是示例，你的实际地址不同。**复制这个地址，它就是你的博客公网地址。**

**重要提示：**
- 这个终端窗口**不能关闭**，关闭后隧道就断了
- 要后台运行，请跳到 [5.4 节](#54-让-cpolar-在后台运行)

### 5.4 让 cpolar 在后台运行

关掉终端后隧道会断开，可以创建系统服务让 cpolar 在后台持续运行。

**Ubuntu / WSL2（推荐方式）：**

```bash
# 检查 cpolar 安装路径
which cpolar

# 确保 cpolar 可执行
sudo which cpolar || echo "cpolar not found in PATH"
```

如果 `which cpolar` 有输出，用以下命令创建服务：

```bash
# 创建系统服务文件
sudo nano /etc/systemd/system/cpolar.service
```

**粘贴以下内容：**

```ini
[Unit]
Description=cpolar tunnel service
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/cpolar http 80
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

> 如果 `which cpolar` 显示的不是 `/usr/local/bin/cpolar`，将 ExecStart 中的路径替换为实际路径（例如 `/usr/bin/cpolar`）。

**保存退出：** `Ctrl+X` → `Y` → `Enter`

**启动服务并设为开机自启：**

```bash
# 重新加载服务配置
sudo systemctl daemon-reload

# 启动 cpolar 服务
sudo systemctl start cpolar

# 设为开机自启
sudo systemctl enable cpolar

# 查看运行状态
sudo systemctl status cpolar
```

**查看 cpolar 的日志（获取公网地址）：**

```bash
# 查看最近日志
sudo journalctl -u cpolar --no-pager -n 50
```

日志中会显示 `Forwarding https://xxx.cpolar.io -> http://localhost:80`，其中的 `https://xxx.cpolar.io` 就是你的博客地址。

### 5.5 测试外网访问

在**手机或另一台电脑**上（不要用本机），打开浏览器，访问 cpolar 提供的地址。

**预期结果：** 博客页面正常加载，地址栏有 🔒 小锁（HTTPS 自动生效）。

> **免费版注意：** cpolar 每次重启隧道地址会变化。你需要重新查看日志中的新地址。付费版可固定地址。

---

## 6. 使用自己的域名（可选）

cpolar 免费版给的地址是 `xxx.cpolar.io`（随机字符串，每次重启会变）。如果你想让用户通过你自己的域名访问（例如 `blog.yourname.com`），有以下方案：

### 6.1 方案一：升级 cpolar 付费版（推荐，最简单）

1. 登录 https://www.cpolar.com → 选择"套餐" → 购买基础版及以上
2. 在仪表盘的"保留子域名"中设置你想要的前缀（例如 `myblog`，得到 `myblog.cpolar.io`）
3. 在"自定义域名"中添加你的域名
4. 按 cpolar 提示，在域名管理中添加一条 **CNAME 记录**指向 `myblog.cpolar.io`
5. cpolar 自动处理 HTTPS 证书

**DNS 配置（在域名注册商处添加）：**

| 记录类型 | 主机记录 | 记录值 |
|---------|---------|--------|
| CNAME | blog | myblog.cpolar.io |

等待 DNS 生效后，通过 `https://blog.yourdomain.com` 访问。

### 6.2 方案二：Cloudflare + cpolar 免费版（免费方案）

如果你在 Cloudflare 管理域名，可以利用 Cloudflare 的反向代理功能。

**步骤：**

1. **将域名托管到 Cloudflare**
   - 注册 https://www.cloudflare.com
   - 添加你的域名
   - 将域名注册商的 DNS 服务器改为 Cloudflare 的

2. **在 Cloudflare 添加 DNS 记录**
   - 记录类型：**CNAME**
   - 名称：`blog`（你想要的前缀）
   - 目标：你的 cpolar 地址（例如 `abc123.cpolar.io`）
   - 代理状态：**开启**（橙色云朵图标）

3. **配置 Cloudflare SSL/TLS**
   - SSL/TLS 加密模式 → **完全**（或"严格"）
   - 开启"自动 HTTPS 重写"
   - 开启"始终使用 HTTPS"

4. **等待 DNS 生效**（1-5 分钟）

5. 通过 `https://blog.yourdomain.com` 访问

> Cloudflare 免费版提供 SSL 证书、DDoS 防护、CDN 加速，与 cpolar 免费版配合使用效果很好。缺点是 Cloudflare 代理会增加一点延迟。

### 6.3 cpolar 重启后地址变了怎么办？

**付费版：** 地址固定，不需要做任何操作。

**免费版 + Cloudflare：** cpolar 重启后地址变化，需要更新 Cloudflare 的 DNS 记录：

```bash
# 1. 查看 cpolar 最新地址
sudo journalctl -u cpolar --no-pager -n 20 | grep Forwarding

# 2. 复制新的 https://xxx.cpolar.io 地址
# 3. 登录 Cloudflare 控制台，更新 DNS 记录的"目标"为新的地址
```

> 这是免费版最不方便的地方。如果不想频繁更新，建议升级 cpolar 付费版（约 98 元/年）。

---

## 7. 验证部署

### 7.1 功能检查

| 验证项 | 操作方法 | 预期结果 |
|--------|---------|---------|
| 外网访问 | 用手机浏览器打开 cpolar 地址 | 博客页面正常显示 |
| HTTPS | 看地址栏 | 显示 🔒 小锁 |
| 页面导航 | 点击"首页""交流社区"等 | 页面正常切换 |
| 注册功能 | 点击注册，输入邮箱 | 收到验证码邮件 |
| 登录功能 | 用注册的账号登录 | 显示用户名 |
| API 接口 | `curl https://xxx.cpolar.io/api/blogs` | 返回 JSON |
| 移动端 | 用手机访问 | 页面适配正常 |

### 7.2 查看日志

```bash
# 查看博客日志
cd /opt/travelblog
docker compose -f docker-compose.prod.yml logs --tail=50

# 查看 cpolar 日志
sudo journalctl -u cpolar --no-pager -n 30
```

---

## 8. 日常维护

### 8.1 查看服务状态

```bash
# 博客各容器状态
cd /opt/travelblog
docker compose -f docker-compose.prod.yml ps

# cpolar 隧道状态
sudo systemctl status cpolar
```

### 8.2 更新博客代码

```bash
cd /opt/travelblog

# 拉取最新代码
git pull

# 重新构建并启动
docker compose -f docker-compose.prod.yml up -d --build

# 清理旧镜像
docker system prune -f
```

### 8.3 重启服务

```bash
# 重启博客
docker compose -f /opt/travelblog/docker-compose.prod.yml restart

# 重启 cpolar 隧道
sudo systemctl restart cpolar
```

### 8.4 备份数据库

```bash
# 创建备份目录
mkdir -p /opt/backups

# 备份到文件（文件名包含当前日期）
docker exec travelblog-postgres pg_dump -U postgres travel_blog > /opt/backups/blog_$(date +%Y%m%d).sql

# 查看备份
ls -la /opt/backups/
```

### 8.5 电脑重启后恢复服务

如果你重启了家里电脑（或关机再开机），执行以下步骤恢复：

```bash
# 1. 启动博客（如已配置开机自启，可跳过）
cd /opt/travelblog
docker compose -f docker-compose.prod.yml up -d

# 2. 启动 cpolar
sudo systemctl start cpolar

# 3. 查看 cpolar 公网地址（免费版地址可能变了）
sudo journalctl -u cpolar --no-pager -n 20 | grep Forwarding

# 4. 如果用 Cloudflare + 免费版，需要更新 DNS 记录
```

### 8.6 设置开机自启（推荐）

```bash
# 设置 Docker 开机自启
sudo systemctl enable docker

# cpolar 已经设置了开机自启（如果之前执行过 enable）
# 检查一下
sudo systemctl is-enabled cpolar
```

Docker 容器配置了 `restart: unless-stopped`，Docker 服务启动后容器会自动恢复。

---

## 9. 故障排查

### 9.1 本机访问正常，外网访问不了

**可能原因：** cpolar 隧道没有正常运行。

**排查：**

```bash
# 检查 cpolar 状态
sudo systemctl status cpolar

# 查看 cpolar 日志
sudo journalctl -u cpolar --no-pager -n 30
```

**日志中应该能看到：** `Forwarding https://xxx.cpolar.io -> http://localhost:80`

如果看不到，重新启动 cpolar：

```bash
sudo systemctl restart cpolar
```

### 9.2 curl localhost:80 失败（本机都打不开）

**排查：**

```bash
cd /opt/travelblog
docker compose -f docker-compose.prod.yml ps
```

如果有容器显示 `Exited`，查看日志：

```bash
docker compose -f docker-compose.prod.yml logs server
```

**尝试重启博客：**

```bash
docker compose -f docker-compose.prod.yml restart
```

### 9.3 cpolar 命令找不到

**Ubuntu：**

```bash
# 重新安装
curl -L https://www.cpolar.com/static/downloads/install-release/cpolar.sh | sudo bash

# 验证
cpolar version
```

### 9.4 cpolar 认证失败

```bash
# 重新设置认证码
cpolar authtoken 你的认证码

# 重新启动隧道
sudo systemctl restart cpolar
```

> 认证码在 https://www.cpolar.com 登录后 → 仪表盘 → 认证码 中查看。

### 9.5 注册收不到验证码邮件

**排查：**

```bash
# 检查博客日志是否有邮件发送错误
cd /opt/travelblog
docker compose -f docker-compose.prod.yml logs server | tail -30
```

**常见原因：**
- `.env` 文件中的 SMTP 配置错误（检查邮箱地址和授权码）
- QQ 邮箱授权码过期（重新生成）
- 邮件被丢进垃圾箱

### 9.6 电脑关机后怎么办？

博客和 cpolar 都运行在你家中的电脑上，关机后自然无法访问。

**解决方法：**
- **保持电脑 24 小时开机**（最简单的方案）
- 或使用低功耗设备（树莓派、旧笔记本电脑、NAS）
- 如果你每天关机，每次开机后执行 [8.5 节](#85-电脑重启后恢复服务) 的步骤

### 9.7 cpolar 免费版地址变了，如何通知用户？

免费版每次重启隧道地址会变。以下方式可以减少影响：

**短期方案：** 用一个短链接服务（如 `https://短链接/博客`）指向你的 cpolar 地址，地址变了只更新短链接的目标。

**长期方案：** 升级 cpolar 付费版固定地址，或用 [6.2 节](#62-方案二cloudflare--cpolar-免费版免费方案) 的 Cloudflare 方案。

### 9.8 访问速度慢

- cpolar 免费版有带宽限制，图片多的页面加载会慢
- 上传图片前先在本地压缩（推荐 < 500KB/张）
- 考虑升级 cpolar 付费版获得更高带宽

---

## 附录：常用命令速查

```bash
# ─── 博客服务 ───
cd /opt/travelblog
docker compose -f docker-compose.prod.yml ps           # 查看运行状态
docker compose -f docker-compose.prod.yml logs -f       # 查看实时日志
docker compose -f docker-compose.prod.yml logs server   # 只看后端日志
docker compose -f docker-compose.prod.yml restart       # 重启所有
docker compose -f docker-compose.prod.yml up -d         # 启动
docker compose -f docker-compose.prod.yml down          # 停止

# ─── cpolar 隧道 ───
sudo systemctl status cpolar                            # 查看状态
sudo systemctl start cpolar                             # 启动
sudo systemctl stop cpolar                              # 停止
sudo systemctl restart cpolar                           # 重启
sudo journalctl -u cpolar --no-pager -n 30              # 查看日志

# ─── 更新博客 ───
cd /opt/travelblog && git pull && docker compose -f docker-compose.prod.yml up -d --build

# ─── 备份数据库 ───
docker exec travelblog-postgres pg_dump -U postgres travel_blog > /opt/backups/blog_$(date +%Y%m%d).sql

# ─── 查看 cpolar 公网地址 ───
sudo journalctl -u cpolar --no-pager -n 20 | grep Forwarding
```

## 附录：端口参考

| 端口 | 机器 | 用途 | 需对外开放？ |
|------|------|------|-------------|
| 80 | 本地服务器 | 博客 Nginx | **不开放**（cpolar 会连接此端口） |
| 3000 | 本地服务器 | 后端 API | 不开放（仅 Docker 内部） |
| 5432 | 本地服务器 | PostgreSQL | 不开放（仅 Docker 内部） |
| 6379 | 本地服务器 | Redis | 不开放（仅 Docker 内部） |

> 你的电脑不需要开放任何端口到公网。cpolar 隧道是**主动从内向外连接**的，不依赖端口映射。
