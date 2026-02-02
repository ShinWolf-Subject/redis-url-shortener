# NvClip — URL Shortener
URL Shortener using Redis (Upstash/Redis)

## Clone this repository first
```sh
git clone https://github.com/ShinWolf-Subject/redis-url-shortener.git
cd redis-url-shortener
```

---

## Get Redis URL
1. Login to [upstash.com](https://upstash.com)
2. Create New Redis Database
3. Click “Details” tab
4. Copy the TCP URL

---

## ENV Configuration
Change `.env.example` to `.env` and adjust the configuration

```env
REDIS_URL="" # Paste the Redis URL you got earlier.
APP_DOMAIN="" # The primary domain to be used, starting with HTTPS or HTTP
PORT=3000 # Server PORT
NODE_ENV="" # Node Environment, production or development
MAX_ADMIN_KEY=20 # Max Admin Key

# Admin Key, maximum number according to the configuration above
ADMIN_KEY1=""
ADMIN_KEY2=""
```

---

## Start the server
On terminal, type this commands
```sh
npm install

# For production
npm start

# For development
npm run dev


# IF YOU ARE YARN USER
yarn install

# For production
yarn start

# For development
yarn dev
```

---

### 2026 Kiyuu on ShinWolf-Subject
