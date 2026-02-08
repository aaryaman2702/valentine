[Uploading valentine.html…]()
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Will You Be My Valentine?</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Poppins:wght@300;400;500&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: 'Poppins', sans-serif;
      background: linear-gradient(135deg, #ff9a9e, #fad0c4);
      min-height: 100vh;
      overflow-x: hidden;
      color: #4b1e2f;
    }

    .hearts {
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      pointer-events: none;
      z-index: 0;
    }

    .heart {
      position: absolute;
      color: rgba(255, 255, 255, 0.7);
      animation: floatUp linear infinite;
      font-size: 18px;
    }

    @keyframes floatUp {
      from { transform: translateY(100vh) scale(0.8); opacity: 1; }
      to { transform: translateY(-10vh) scale(1.4); opacity: 0; }
    }

    .container {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 40px 20px;
      min-height: 100vh;
    }

    h1 {
      font-family: 'Playfair Display', serif;
      font-size: 3rem;
      margin-bottom: 10px;
    }

    h2 {
      font-weight: 400;
      margin-bottom: 30px;
    }

    .card {
      background: rgba(255, 255, 255, 0.9);
      border-radius: 24px;
      padding: 40px 30px;
      max-width: 520px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.15);
      animation: fadeIn 1.2s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .message {
      font-size: 1.1rem;
      line-height: 1.8;
      margin-bottom: 35px;
    }

    .buttons {
      display: flex;
      gap: 20px;
      justify-content: center;
      flex-wrap: wrap;
    }

    button {
      border: none;
      padding: 14px 28px;
      font-size: 1rem;
      border-radius: 999px;
      cursor: pointer;
      transition: all 0.3s ease;
      font-weight: 500;
    }

    .yes {
      background: linear-gradient(135deg, #ff4b6e, #ff758c);
      color: white;
      box-shadow: 0 10px 20px rgba(255, 75, 110, 0.4);
    }

    .yes:hover {
      transform: translateY(-3px) scale(1.05);
    }

    .no {
      background: #f3f3f3;
      color: #555;
    }

    .no:hover {
      transform: translateY(-3px);
      background: #e0e0e0;
    }

    .final {
      display: none;
      animation: fadeIn 1s ease;
    }

    .final h1 {
      font-size: 2.5rem;
      margin-bottom: 20px;
    }

    .final p {
      font-size: 1.1rem;
    }
  </style>
</head>
<body>
  <div class="hearts" id="hearts"></div>

  <div class="container">
    <div class="card" id="card">
      <h1>My Love ❤️</h1>
      <h2>I have something important to ask you</h2>
      <p class="message">
        From the moment you walked into my life, everything felt warmer, softer, and brighter.
        You are my favourite thought, my safest place, and the most beautiful part of my every day.
        <br><br>
        Life is sweeter with you in it… and I want to make more memories, laugh harder, love deeper, and grow together.
        <br><br>
        So here I am, with my heart in my hands, asking you something very special ✨
      </p>
      <div class="buttons">
        <button class="yes" onclick="sayYes()">Yes, of course 💖</button>
        <button class="no" onclick="moveNo()">Hmm… 👀</button>
      </div>
    </div>

    <div class="card final" id="final">
      <h1>YAY!!! 💘💘💘</h1>
      <p class="message">
        You just made me the happiest person alive.
        <br><br>
        I promise to choose you, spoil you, protect you, and love you endlessly.
        <br><br>
        Happy Valentine’s Day, my Valentine ❤️
      </p>
    </div>
  </div>

  <script>
    const heartsContainer = document.getElementById('hearts');

    function createHeart() {
      const heart = document.createElement('div');
      heart.className = 'heart';
      heart.innerText = '❤';
      heart.style.left = Math.random() * 100 + 'vw';
      heart.style.animationDuration = 4 + Math.random() * 4 + 's';
      heart.style.fontSize = 12 + Math.random() * 24 + 'px';
      heartsContainer.appendChild(heart);

      setTimeout(() => heart.remove(), 8000);
    }

    setInterval(createHeart, 300);

    function sayYes() {
      document.getElementById('card').style.display = 'none';
      document.getElementById('final').style.display = 'block';
    }

    function moveNo() {
      const noBtn = document.querySelector('.no');
      const x = Math.random() * 200 - 100;
      const y = Math.random() * 200 - 100;
      noBtn.style.transform = `translate(${x}px, ${y}px)`;
    }
  </script>
</body>
</html>
