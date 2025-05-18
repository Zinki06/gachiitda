// server/index.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
// .env 파일에서 PORT를 읽어오거나 기본값 5001 사용
const PORT = process.env.PORT || 5001;

app.get('/', (req, res) => res.send('백엔드 서버입니다.'));

// 카카오 로그인 리다이렉트
app.get('/auth/kakao', (req, res) => {
  const kakaoAuthURL = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${process.env.KAKAO_CLIENT_ID}&redirect_uri=${process.env.KAKAO_REDIRECT_URI}`;
  res.redirect(kakaoAuthURL);
});

// 카카오 콜백 처리
app.get('/auth/kakao/callback', async (req, res) => {
  const { code } = req.query;

  try {
    // 1. 액세스 토큰 요청
    const tokenRes = await axios.post(
      'https://kauth.kakao.com/oauth/token',
      null,
      {
        params: {
          grant_type: 'authorization_code',
          client_id: process.env.KAKAO_CLIENT_ID,
          redirect_uri: process.env.KAKAO_REDIRECT_URI,
          code,
        },
        headers: {
          'Content-type': 'application/x-www-form-urlencoded;charset=utf-8',
        },
      }
    );

    const { access_token } = tokenRes.data;

    // 2. 사용자 정보 요청
    const userRes = await axios.get('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const userInfo = userRes.data;

    // 3. 프론트엔드로 사용자 정보를 넘기기 (querystring에 담아 보냄)
    // 프론트엔드 주소는 환경에 맞게 변경해야 할 수 있습니다. (예: http://localhost:3000)
    res.redirect(`http://localhost:3000/kakao-success?user=${encodeURIComponent(JSON.stringify(userInfo))}`);
  } catch (err) {
    console.error('카카오 로그인 처리 중 에러:', err.response ? err.response.data : err.message);
    res.status(500).send('카카오 로그인 실패');
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});