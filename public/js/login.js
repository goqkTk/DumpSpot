function showTab(tab) {
  document.getElementById('loginTab').classList.toggle('active', tab === 'login');
  document.getElementById('registerTab').classList.toggle('active', tab === 'register');
  document.getElementById('loginForm').classList.toggle('active', tab === 'login');
  document.getElementById('registerForm').classList.toggle('active', tab === 'register');
  document.getElementById('msg').style.display = 'none';
}

function showMsg(msg, success) {
  const m = document.getElementById('msg');
  m.textContent = msg;
  m.className = 'msg' + (success ? ' success' : '');
  m.style.display = 'block';
}

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (data.success) {
      showMsg('로그인 성공!', true);
      window._loginSuccess = true;
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } else {
      showMsg(data.error || '로그인 실패', false);
      window._loginSuccess = false;
    }
  } catch (err) {
    showMsg('서버 오류가 발생했습니다.', false);
    window._loginSuccess = false;
  }
}

// 입력 검증 함수
function validateUsername(username) {
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
}

function validatePassword(password) {
  return password.length >= 6 && password.length <= 100;
}

async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('register-username').value;
  const password = document.getElementById('register-password').value;
  const passwordConfirm = document.getElementById('register-password-confirm').value;
  
  // 입력 검증
  if (!validateUsername(username)) {
    showMsg('아이디는 3-20자의 영문, 숫자, 언더스코어만 사용 가능합니다.', false);
    return;
  }
  
  if (!validatePassword(password)) {
    showMsg('비밀번호는 6-100자여야 합니다.', false);
    return;
  }
  
  if (password !== passwordConfirm) {
    showMsg('비밀번호가 일치하지 않습니다.', false);
    return;
  }
  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (data.success) {
      showMsg('회원가입 성공! 로그인 해주세요.', true);
      setTimeout(() => showTab('login'), 1000);
    } else {
      showMsg(data.error || '회원가입 실패', false);
    }
  } catch (err) {
    showMsg('서버 오류가 발생했습니다.', false);
  }
}

// 로그인 성공 후 Enter 키로 메인 이동
document.addEventListener('keydown', function(e) {
  if (window._loginSuccess && (e.key === 'Enter' || e.keyCode === 13)) {
    window.location.href = '/';
  }
}); 