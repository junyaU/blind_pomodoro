class BlindPomodoro {
    constructor() {
        this.timer = null;
        this.isRunning = false;
        this.currentSession = 'work'; // 'work', 'break', 'longBreak'
        this.completedPomodoros = 0;
        this.remainingTime = 0;

        this.initializeEventListeners();
        this.updateDisplay();
    }

    initializeEventListeners() {
        document.getElementById('start-btn').addEventListener('click', () => this.start());
        document.getElementById('stop-btn').addEventListener('click', () => this.stop());

        // Request notification permission
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    }

    getSettings() {
        return {
            workTime: parseInt(document.getElementById('work-time').value),
            breakTime: parseInt(document.getElementById('break-time').value),
            longBreakTime: parseInt(document.getElementById('long-break-time').value),
            longBreakFrequency: parseInt(document.getElementById('long-break-frequency').value),
            autoStartWork: document.getElementById('auto-start-work').checked,
            autoStartBreak: document.getElementById('auto-start-break').checked
        };
    }

    start() {
        const settings = this.getSettings();

        if (this.currentSession === 'work') {
            this.remainingTime = settings.workTime * 60;
        } else if (this.currentSession === 'break') {
            this.remainingTime = settings.breakTime * 60;
        } else {
            this.remainingTime = settings.longBreakTime * 60;
        }

        this.isRunning = true;
        this.updateDisplay();
        this.updateControls();

        this.timer = setInterval(() => {
            this.remainingTime--;

            if (this.currentSession !== 'work') {
                this.updateTimerDisplay();
            }

            if (this.remainingTime <= 0) {
                this.complete();
            }
        }, 1000);
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.isRunning = false;
        this.currentSession = 'work';
        this.updateDisplay();
        this.updateControls();
    }

    complete() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

        const settings = this.getSettings();

        if (this.currentSession === 'work') {
            this.completedPomodoros++;

            // Determine next session
            if (this.completedPomodoros % settings.longBreakFrequency === 0) {
                this.currentSession = 'longBreak';
            } else {
                this.currentSession = 'break';
            }

            this.showNotification('作業完了！', '休憩時間です。');

            if (settings.autoStartBreak) {
                setTimeout(() => this.start(), 1000);
            } else {
                this.isRunning = false;
            }
        } else {
            this.currentSession = 'work';
            this.showNotification('休憩完了！', '次の作業を始めましょう。');

            if (settings.autoStartWork) {
                setTimeout(() => this.start(), 1000);
            } else {
                this.isRunning = false;
            }
        }

        this.updateDisplay();
        this.updateControls();
    }

    updateDisplay() {
        const statusEl = document.getElementById('status');
        const timerDisplayEl = document.getElementById('timer-display');
        const hiddenTimerEl = document.getElementById('hidden-timer');

        if (!this.isRunning) {
            statusEl.textContent = '準備完了';
            statusEl.className = 'status';
            timerDisplayEl.className = 'hidden';
            hiddenTimerEl.className = 'hidden-timer hidden';
        } else if (this.currentSession === 'work') {
            statusEl.textContent = '作業中';
            statusEl.className = 'status working working-indicator';
            timerDisplayEl.className = 'hidden';
            hiddenTimerEl.className = 'hidden-timer';
            hiddenTimerEl.textContent = '作業に集中してください...';
        } else {
            const sessionName = this.currentSession === 'longBreak' ? '長時間休憩中' : '休憩中';
            statusEl.textContent = sessionName;
            statusEl.className = 'status break';
            timerDisplayEl.className = 'timer-display';
            hiddenTimerEl.className = 'hidden-timer hidden';
            this.updateTimerDisplay();
        }
    }

    updateTimerDisplay() {
        if (this.currentSession !== 'work') {
            const minutes = Math.floor(this.remainingTime / 60);
            const seconds = this.remainingTime % 60;
            document.getElementById('timer-display').textContent =
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    updateControls() {
        const startBtn = document.getElementById('start-btn');
        const stopBtn = document.getElementById('stop-btn');

        if (this.isRunning) {
            startBtn.className = 'btn hidden';
            stopBtn.className = 'btn stop';
        } else {
            startBtn.className = 'btn';
            stopBtn.className = 'btn stop hidden';
        }
    }

    showNotification(title, body) {
        // Visual notification
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification(title, {
                body: body,
                icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzIiIGN5PSIzMiIgcj0iMzIiIGZpbGw9IiM0Mjk5ZTEiLz4KPHN2ZyB4PSIxNiIgeT0iMTYiIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiPgo8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIvPgo8cG9seWxpbmUgcG9pbnRzPSIxMiw2IDEyLDEyIDE2LDE0Ii8+Cjwvc3ZnPgo8L3N2Zz4='
            });
        }

        // Audio notification - gentle chime sound
        this.playNotificationSound();
    }

    playNotificationSound() {
        try {
            // Create a gentle notification sound using Web Audio API
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Create a gentle bell-like sound
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Set frequency for a pleasant chime (C5 note)
            oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);

            // Create envelope for natural sound
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.5);

            // Play the sound
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 1.5);

        } catch (error) {
            console.log('Audio notification not available');
        }
    }
}

function toggleSettings() {
    const settings = document.getElementById('settings');
    settings.classList.toggle('hidden');
}

// Initialize the app
const app = new BlindPomodoro();
