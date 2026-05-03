const express = require('express');
const axios = require('axios');
const router = express.Router();

// 建议将 CLIENT_ID 和 CLIENT_SECRET 设置在 .env 文件并通过 process.env 获取
const CLIENT_ID = process.env.GITHUB_CLIENT_ID || '你的GitHub客户端ID';
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '你的GitHub客户端密钥';

router.get('/github/login', (req, res) => {
  const redirectUri = process.env.GITHUB_REDIRECT_URI || 'http://localhost:3001/auth/github/callback';
  const githubUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${redirectUri}&scope=read:user`;
  res.redirect(githubUrl);
});

router.get('/github/callback', async (req, res) => {
  const { code } = req.query;

  try {
    // 获取 access_token
    const tokenRes = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
    }, { headers: { Accept: 'application/json' } });

    const access_token = tokenRes.data.access_token;

    // 获取用户信息
    const userRes = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `token ${access_token}` }
    });

    res.json({ user: userRes.data });
  } catch (err) {
    res.status(500).json({ error: 'GitHub 授权失败', detail: err.toString() });
  }
});

module.exports = router;
