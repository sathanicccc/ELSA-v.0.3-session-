const canvas = document.getElementById('matrix');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth; canvas.height = window.innerHeight;
const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const fontSize = 16;
const columns = canvas.width / fontSize;
const drops = Array(Math.floor(columns)).fill(1);

function draw() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.05)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0F0"; ctx.font = fontSize + "px arial";
    drops.forEach((y, i) => {
        const text = letters[Math.floor(Math.random() * letters.length)];
        ctx.fillText(text, i * fontSize, y * fontSize);
        if (y * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
    });
}
setInterval(draw, 33);

async function getPairCode() {
    const num = document.getElementById('number').value;
    const loader = document.getElementById('loader');
    const txt = document.getElementById('txt');
    if(!num) return alert("Enter number!");
    
    txt.style.display = "none"; loader.style.display = "block";
    try {
        const res = await fetch(`/api?number=${num}`);
        const data = await res.json();
        loader.style.display = "none"; txt.style.display = "block";
        if(data.code) {
            document.getElementById('result').style.display = "block";
            document.getElementById('pair-display').innerText = data.code;
        } else { alert("Error!"); }
    } catch (e) { alert("API Fail!"); loader.style.display = "none"; txt.style.display = "block"; }
}
