// ==================== PHẦN 1: CẤU HÌNH 3D (THREE.JS) ====================
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('canvas-container').appendChild(renderer.domElement);

// --- TẠO HẠT (PARTICLES) ---
const particleCount = 8000; // Số lượng hạt
const geometry = new THREE.BufferGeometry();
const currentPositions = new Float32Array(particleCount * 3); // Vị trí hiện tại
const treePositions = new Float32Array(particleCount * 3);    // Vị trí hình cây thông
const heartPositions = new Float32Array(particleCount * 3);   // Vị trí hình trái tim
const colors = new Float32Array(particleCount * 3);

// 1. Tính toán vị trí CÂY THÔNG và TRÁI TIM
for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;

    // --- Hình Cây Thông (Nón) ---
    const yTree = (Math.random() - 0.5) * 10;
    const rTree = (5 - yTree) * 0.4 * Math.random();
    const thetaTree = Math.random() * Math.PI * 2;
    treePositions[i3] = Math.cos(thetaTree) * rTree;
    treePositions[i3 + 1] = yTree - 2; // Hạ thấp cây xuống một chút
    treePositions[i3 + 2] = Math.sin(thetaTree) * rTree;

    // --- Hình Trái Tim (Công thức toán học) ---
    const t = Math.random() * Math.PI * 2;
    // Công thức tạo hình trái tim 3D
    const xHeart = 16 * Math.pow(Math.sin(t), 3);
    const yHeart = 13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t);
    const scale = 0.2; // Thu nhỏ trái tim lại
    heartPositions[i3] = xHeart * scale;
    heartPositions[i3 + 1] = yHeart * scale + 1; // Đưa trái tim lên cao chút
    heartPositions[i3 + 2] = (Math.random() - 0.5) * 2; // Độ dày của trái tim

    // Vị trí ban đầu là cây thông
    currentPositions[i3] = treePositions[i3];
    currentPositions[i3+1] = treePositions[i3+1];
    currentPositions[i3+2] = treePositions[i3+2];

    // Màu sắc (Vàng cam)
    colors[i3] = 1; 
    colors[i3 + 1] = 0.7 + Math.random() * 0.3;
    colors[i3 + 2] = 0.2;
}

geometry.setAttribute('position', new THREE.BufferAttribute(currentPositions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

const material = new THREE.PointsMaterial({
    size: 0.05, vertexColors: true, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending
});
const particleSystem = new THREE.Points(geometry, material);
scene.add(particleSystem);
camera.position.z = 12;

// ==================== PHẦN 2: XỬ LÝ NHẬN DIỆN TAY (MEDIAPIPE) ====================
const videoElement = document.getElementById('input_video');
const heartMessage = document.getElementById('heart-message');
let isHeartGesture = false; // Biến kiểm tra có đang bắn tim không

function onResults(results) {
    isHeartGesture = false; // Mặc định là không

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        // Lấy bàn tay đầu tiên nhận diện được
        const landmarks = results.multiHandLandmarks[0];
        
        // --- Logic phát hiện "Bắn tim" (Đơn giản hóa) ---
        // Kiểm tra khoảng cách giữa đầu ngón cái (số 4) và đầu ngón trỏ (số 8)
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        // Tính khoảng cách 2D (chỉ cần x và y)
        const distance = Math.sqrt(Math.pow(thumbTip.x - indexTip.x, 2) + Math.pow(thumbTip.y - indexTip.y, 2));

        // Nếu khoảng cách rất gần (dưới 0.05) -> Coi như đang chụm tay bắn tim
        if (distance < 0.05) {
            isHeartGesture = true;
        }
    }
}

// Cấu hình MediaPipe Hands
const hands = new Hands({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});
hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.7, minTrackingConfidence: 0.7 });
hands.onResults(onResults);

// Kích hoạt Camera
const cameraFeed = new Camera(videoElement, {
    onFrame: async () => { await hands.send({image: videoElement}); },
    width: 640, height: 480
});
cameraFeed.start(); // BẮT ĐẦU CHẠY CAMERA!


// ==================== PHẦN 3: ANIMATION LOOP (VÒNG LẶP CHÍNH) ====================
let morphFactor = 0; // 0 = Cây thông, 1 = Trái tim

function animate() {
    requestAnimationFrame(animate);

    // --- Logic chuyển đổi hình dạng (Morphing) ---
    // Nếu đang bắn tim, tăng morphFactor lên 1. Nếu không, giảm về 0.
    if (isHeartGesture) {
        morphFactor += 0.05; // Tốc độ biến hình thành tim
        if (morphFactor > 1) morphFactor = 1;
        heartMessage.classList.add('blinking'); // Hiện chữ nhấp nháy
    } else {
        morphFactor -= 0.05; // Tốc độ biến hình về cây
        if (morphFactor < 0) morphFactor = 0;
        heartMessage.classList.remove('blinking'); // Ẩn chữ
    }

    // Di chuyển các hạt
    const positions = particleSystem.geometry.attributes.position.array;
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        // Dùng hàm lerp (nội suy tuyến tính) để di chuyển mượt mà giữa 2 trạng thái
        positions[i3]     = THREE.MathUtils.lerp(treePositions[i3], heartPositions[i3], morphFactor);
        positions[i3 + 1] = THREE.MathUtils.lerp(treePositions[i3 + 1], heartPositions[i3 + 1], morphFactor);
        positions[i3 + 2] = THREE.MathUtils.lerp(treePositions[i3 + 2], heartPositions[i3 + 2], morphFactor);
    }
    particleSystem.geometry.attributes.position.needsUpdate = true; // Báo cho GPU biết vị trí đã thay đổi

    // Xoay nhẹ vật thể cho sinh động
    particleSystem.rotation.y += 0.005;

    renderer.render(scene, camera);
}

animate();

// ==================== PHẦN 4: XỬ LÝ HỘP QUÀ (GIỮ NGUYÊN) ====================
// (Bạn tự thay đổi nội dung ở đây như bước trước nhé)
const wishes = [
    "Chúc bạn luôn vui vẻ và xinh đẹp!",
    "Giáng sinh an lành nhé!",
    "Mong mọi điều tốt đẹp nhất sẽ đến với bạn.",
    "Cảm ơn vì đã là một phần đặc biệt của tui.",
    "Mãi bên nhau bạn nhé!"
];
const finalLetter = `Gửi bạn...<br><br>Đây là dòng thư tui viết riêng cho bạn. Mùa Giáng sinh này tui chỉ muốn nói là tui rất trân trọng những khoảnh khắc chúng ta có nhau.<br><br><b>Merry Christmas, my dear!</b>`;

function openGift(index) {
    const modal = document.getElementById('letter-modal');
    const text = document.getElementById('letter-text');
    const gifts = document.querySelectorAll('.gift');
    if (index < 5) { text.innerHTML = wishes[index]; } else { text.innerHTML = finalLetter; }
    gifts[index].classList.add('opened');
    modal.style.display = "block";
}
function closeLetter() { document.getElementById('letter-modal').style.display = "none"; }
window.onclick = function(event) { if (event.target == document.getElementById('letter-modal')) closeLetter(); }
// Xử lý khi thay đổi kích thước màn hình
window.addEventListener('resize', onWindowResize, false);
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}