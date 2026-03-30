async function getPair() {
    const num = document.getElementById('num').value;
    if(!num) return alert("Enter Number!");
    toggleLoad(true);
    try {
        // Koyeb-ൽ നേരിട്ട് /api എന്ന് വിളിച്ചാൽ മതി
        const res = await fetch(`/api?number=${num}`);
        const data = await res.json();
        toggleLoad(false);
        if(data.code) {
            document.getElementById('pair-res').style.display = 'block';
            document.getElementById('pair-display').innerText = data.code;
        }
    } catch (e) { toggleLoad(false); alert("API Error! Try again."); }
}

async function getQR() {
    toggleLoad(true);
    try {
        const res = await fetch('/api');
        const data = await res.json();
        toggleLoad(false);
        if(data.qr) {
            document.getElementById('qr-res').style.display = 'block';
            document.getElementById('qr-img').src = data.qr;
        }
    } catch (e) { toggleLoad(false); alert("QR Error!"); }
}

function toggleLoad(show) {
    const loader = document.getElementById('loader');
    if(loader) loader.style.display = show ? 'block' : 'none';
}

function switchTab(type) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    event.currentTarget.classList.add('active');
    document.getElementById(type + '-section').classList.add('active');
}
