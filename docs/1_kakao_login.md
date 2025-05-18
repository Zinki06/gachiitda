6. 카카오 로그인 연동(핵심 로직) 완전 기초 가이드

⸻

1. 흐름 요약
	1.	사용자가 프론트엔드에서 “카카오로 로그인” 버튼을 누름
	2.	→ 백엔드(/auth/kakao)로 이동
	3.	→ 카카오 로그인 페이지로 이동
	4.	→ 로그인 후, 백엔드(/auth/kakao/callback)로 다시 돌아옴
	5.	→ 백엔드에서 토큰 + 사용자 정보 받아옴
	6.	→ 사용자 정보를 프론트엔드로 전달(리디렉션)

⸻

2. 실제 코드 따라하기

### A. 백엔드(Node.js, server/index.js)

1) /auth/kakao 라우트
	•	역할: 카카오 로그인 URL로 리디렉션

// server/index.js
app.get('/auth/kakao', (req, res) => {
  // 카카오 인증 페이지로 이동시키는 URL 만들기
  const kakaoAuthURL = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${process.env.KAKAO_CLIENT_ID}&redirect_uri=${process.env.KAKAO_REDIRECT_URI}`;
  res.redirect(kakaoAuthURL); // 사용자를 카카오 로그인 페이지로 보냄
});


⸻

2) /auth/kakao/callback 라우트
	•	역할: 카카오에서 로그인 성공 후, 인증코드를 받아 토큰+사용자 정보를 요청

// server/index.js
app.get('/auth/kakao/callback', async (req, res) => {
  const { code } = req.query; // 카카오가 보내준 인증코드 받기

  try {
    // (1) 토큰 요청: 인증코드를 사용해서 access_token 받기
    const tokenRes = await axios.post(
      'https://kauth.kakao.com/oauth/token',
      null,
      {
        params: {
          grant_type: 'authorization_code',
          client_id: process.env.KAKAO_CLIENT_ID,
          redirect_uri: process.env.KAKAO_REDIRECT_URI,
          code, // 위에서 받은 code 값 사용
        },
        headers: {
          'Content-type': 'application/x-www-form-urlencoded;charset=utf-8',
        },
      }
    );

    const { access_token } = tokenRes.data;

    // (2) 사용자 정보 요청: access_token으로 카카오에 사용자 정보 요청
    const userRes = await axios.get('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const userInfo = userRes.data;

    // (3) 프론트엔드로 사용자 정보를 넘기기 (querystring에 담아 보냄)
    res.redirect(`http://localhost:3000/kakao-success?user=${encodeURIComponent(JSON.stringify(userInfo))}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('카카오 로그인 실패');
  }
});

	•	여기서 핵심
	•	① 카카오에서 로그인 성공 후 “code”가 쿼리로 전달됨
	•	② 이 코드를 카카오 API에 보내서 “access_token”을 받음
	•	③ access_token을 이용해 사용자 정보를 받아옴
	•	④ 사용자 정보를 프론트엔드에 전달 (리디렉션 URL에 담아서)

⸻

### B. 프론트엔드(React, client/src/App.js & KakaoSuccess.js)

1) 카카오 로그인 버튼 만들기

App.js

import React from 'react';

function App() {
  const handleKakaoLogin = () => {
    window.location.href = 'http://localhost:5000/auth/kakao';
  };

  return (
    <div>
      <h1>카카오 로그인 데모</h1>
      <button onClick={handleKakaoLogin}>카카오로 로그인</button>
    </div>
  );
}

export default App;

	•	버튼 클릭 시 백엔드의 /auth/kakao로 이동 → 자동으로 카카오 로그인 창이 뜸

⸻

2) 로그인 성공 후 사용자 정보 보여주기

KakaoSuccess.js

import React, { useEffect, useState } from 'react';

function KakaoSuccess() {
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    // URL 쿼리스트링에서 user 정보 가져오기
    const params = new URLSearchParams(window.location.search);
    const user = params.get('user');
    if (user) {
      setUserInfo(JSON.parse(decodeURIComponent(user)));
    }
  }, []);

  return (
    <div>
      <h2>카카오 로그인 성공!</h2>
      {userInfo ? (
        <pre>{JSON.stringify(userInfo, null, 2)}</pre>
      ) : (
        <p>사용자 정보 없음</p>
      )}
    </div>
  );
}

export default KakaoSuccess;


⸻

3) 라우팅 연결 (React Router 연동)

index.js

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import KakaoSuccess from './KakaoSuccess';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/kakao-success" element={<KakaoSuccess />} />
    </Routes>
  </BrowserRouter>
);


⸻

3. 전체 흐름 다시 정리
	1.	localhost:3000 → 로그인 버튼 클릭 →
	2.	localhost:5000/auth/kakao (백엔드) →
	3.	카카오 로그인 창 →
	4.	localhost:5000/auth/kakao/callback?code=… (백엔드) →
	5.	백엔드가 사용자 정보 받아서
	6.	localhost:3000/kakao-success?user=… (프론트)로 리디렉션
	7.	사용자 정보 화면에 출력

⸻

4. 팁 및 문제 해결
	•	.env, 리디렉션 주소 등 오타 주의!
	•	백엔드/프론트엔드 서버 각각 따로 실행
	•	Redirect URI, 포트번호 반드시 맞추기 (카카오 개발자 콘솔에도 등록)
	•	CORS 오류 시 app.use(cors()) 꼭 추가
	•	에러 발생 시 터미널 로그 꼭 확인!

