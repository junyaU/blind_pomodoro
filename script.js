class BlindPomodoro {
    constructor() {
        this.timer = null;
        this.isRunning = false;
        this.isPaused = false;
        this.currentSession = 'work'; // 'work', 'break', 'longBreak'
        this.completedPomodoros = 0;
        this.remainingTime = 0;
        this.startTime = null;
        this.totalDuration = 0;
        this.pausedTime = 0;
        this.audioContext = null; // グローバルなAudioContextを管理

        this.loadSettings();
        this.initializeEventListeners();
        this.updateDisplay();
        this.initializeVisibilityAPI();
        this.initializeAudioContext();
    }

    initializeEventListeners() {
        document.getElementById('start-btn').addEventListener('click', () => this.start());
        document.getElementById('pause-btn').addEventListener('click', () => this.pause());
        document.getElementById('resume-btn').addEventListener('click', () => this.resume());

        // ハンバーガーメニューのイベント
        const hamburgerMenu = document.getElementById('hamburger-menu');
        const sideMenu = document.getElementById('side-menu');
        const menuOverlay = document.getElementById('menu-overlay');

        const toggleSideMenu = () => {
            const isOpen = sideMenu.classList.contains('open');
            if (isOpen) {
                hamburgerMenu.classList.remove('active');
                sideMenu.classList.remove('open');
                menuOverlay.classList.remove('active');
            } else {
                hamburgerMenu.classList.add('active');
                sideMenu.classList.add('open');
                menuOverlay.classList.add('active');
            }
        };

        hamburgerMenu.addEventListener('click', (e) => {
            e.stopPropagation();

            // 無効化状態の時はクリックを無視
            if (hamburgerMenu.classList.contains('disabled')) {
                return;
            }

            toggleSideMenu();
        });

        menuOverlay.addEventListener('click', () => {
            hamburgerMenu.classList.remove('active');
            sideMenu.classList.remove('open');
            menuOverlay.classList.remove('active');
        });

        // サイドメニュー内のクリックがオーバーレイに伝播しないようにする
        sideMenu.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // 音量スライダーのイベント
        const volumeSlider = document.getElementById('notification-volume');
        const volumeValue = document.getElementById('volume-value');

        volumeSlider.addEventListener('input', (e) => {
            const volume = e.target.value;
            volumeValue.textContent = `${volume}%`;
            this.saveSettings();
        });

        // 通知音設定のイベント
        document.getElementById('notification-sound').addEventListener('change', () => {
            this.saveSettings();
        });

        // 通知音種類選択のイベント
        document.getElementById('sound-type').addEventListener('change', () => {
            this.saveSettings();
        });

        // 音を確認ボタンのイベント
        document.getElementById('test-sound-btn').addEventListener('click', async () => {
            await this.playNotificationSound();
        });

        // ダークモード設定のイベント
        document.getElementById('dark-mode').addEventListener('change', (e) => {
            if (e.target.checked) {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
            this.saveSettings();
        });

        // フィードバックボタンのイベント
        document.getElementById('feedback-btn').addEventListener('click', () => {
            // Google FormのURLを新しいタブで開く
            const feedbackUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSfnIJ9xGEPRteqQL2lo134Ge3qGKsqdX3i3xXRQOmAZLIqF6g/viewform?usp=dialog';
            window.open(feedbackUrl, '_blank');
        });

        // その他の設定変更時の保存
        const settingInputs = document.querySelectorAll('.setting-group input, .setting-group select');
        settingInputs.forEach(input => {
            if (input.id !== 'notification-sound' && input.id !== 'notification-volume' && input.id !== 'dark-mode' && input.id !== 'sound-type') {
                input.addEventListener('change', () => this.saveSettings());
            }
        });

        // Request notification permission
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    }

    initializeVisibilityAPI() {
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isRunning) {
                // タブがアクティブになった時、時間を再計算
                this.updateTimer();
            }
        });
    }

    initializeAudioContext() {
        // ユーザー操作時にAudioContextを初期化するためのイベントリスナーを追加
        const initAudio = () => {
            if (!this.audioContext) {
                try {
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    console.log('AudioContext initialized:', this.audioContext.state);
                } catch (error) {
                    console.log('AudioContext initialization failed:', error);
                }
            }

            // AudioContextがsuspended状態の場合はresume
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume().then(() => {
                    console.log('AudioContext resumed');
                }).catch(error => {
                    console.log('AudioContext resume failed:', error);
                });
            }
        };

        // 各種ユーザー操作でAudioContextを初期化
        document.addEventListener('click', initAudio, { once: true });
        document.addEventListener('touchstart', initAudio, { once: true });
        document.addEventListener('keydown', initAudio, { once: true });
    }

    getSettings() {
        return {
            workTime: parseInt(document.getElementById('work-time').value),
            breakTime: parseInt(document.getElementById('break-time').value),
            longBreakTime: parseInt(document.getElementById('long-break-time').value),
            longBreakFrequency: parseInt(document.getElementById('long-break-frequency').value),
            autoStartWork: document.getElementById('auto-start-work').checked,
            autoStartBreak: document.getElementById('auto-start-break').checked,
            notificationSound: document.getElementById('notification-sound').checked,
            notificationVolume: parseInt(document.getElementById('notification-volume').value),
            soundType: document.getElementById('sound-type').value,
            darkMode: document.getElementById('dark-mode').checked
        };
    }

    loadSettings() {
        const savedSettings = localStorage.getItem('pomodoroSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);

            // 設定値をUIに反映
            if (settings.workTime) document.getElementById('work-time').value = settings.workTime;
            if (settings.breakTime) document.getElementById('break-time').value = settings.breakTime;
            if (settings.longBreakTime) document.getElementById('long-break-time').value = settings.longBreakTime;
            if (settings.longBreakFrequency) document.getElementById('long-break-frequency').value = settings.longBreakFrequency;
            if (settings.autoStartWork !== undefined) document.getElementById('auto-start-work').checked = settings.autoStartWork;
            if (settings.autoStartBreak !== undefined) document.getElementById('auto-start-break').checked = settings.autoStartBreak;
            if (settings.notificationSound !== undefined) document.getElementById('notification-sound').checked = settings.notificationSound;
            if (settings.notificationVolume !== undefined) {
                document.getElementById('notification-volume').value = settings.notificationVolume;
                document.getElementById('volume-value').textContent = `${settings.notificationVolume}%`;
            }
            if (settings.soundType !== undefined) {
                document.getElementById('sound-type').value = settings.soundType;
            } else {
                // デフォルト値を明示的に設定
                document.getElementById('sound-type').value = 'beep';
            }
            if (settings.darkMode !== undefined) {
                document.getElementById('dark-mode').checked = settings.darkMode;
                if (settings.darkMode) {
                    document.body.classList.add('dark-mode');
                }
            }
        }
    }

    saveSettings() {
        const settings = this.getSettings();
        localStorage.setItem('pomodoroSettings', JSON.stringify(settings));
    }

    start() {
        const settings = this.getSettings();

        if (this.currentSession === 'work') {
            this.totalDuration = settings.workTime * 60;
        } else if (this.currentSession === 'break') {
            this.totalDuration = settings.breakTime * 60;
        } else {
            this.totalDuration = settings.longBreakTime * 60;
        }

        this.startTime = Date.now();
        this.isRunning = true;
        this.updateDisplay();
        this.updateControls();

        this.timer = setInterval(() => {
            this.updateTimer();
        }, 100);
    }

    updateTimer() {
        if (this.isPaused) return;

        const elapsed = (Date.now() - this.startTime) / 1000;
        this.remainingTime = Math.max(0, this.totalDuration - elapsed);

        if (this.currentSession !== 'work') {
            this.updateTimerDisplay();
        }

        if (this.remainingTime <= 0) {
            this.complete();
        }
    }

    pause() {
        if (!this.isRunning || this.isPaused) return;

        this.isPaused = true;
        this.pausedTime = this.remainingTime;

        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

        this.updateDisplay();
        this.updateControls();
    }

    resume() {
        if (!this.isPaused) return;

        this.isPaused = false;
        this.totalDuration = this.pausedTime;
        this.startTime = Date.now();

        this.timer = setInterval(() => {
            this.updateTimer();
        }, 100);

        this.updateDisplay();
        this.updateControls();
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.isRunning = false;
        this.isPaused = false;
        this.currentSession = 'work';
        this.startTime = null;
        this.pausedTime = 0;
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
        } else if (this.isPaused) {
            if (this.currentSession === 'work') {
                statusEl.textContent = '作業を中断中';
                statusEl.className = 'status paused';
                timerDisplayEl.className = 'hidden';
                hiddenTimerEl.className = 'hidden-timer';
                hiddenTimerEl.textContent = '作業を中断しています...';
            } else {
                const sessionName = this.currentSession === 'longBreak' ? '長時間休憩' : '休憩';
                statusEl.textContent = `${sessionName}を中断中`;
                statusEl.className = 'status paused';
                timerDisplayEl.className = 'timer-display';
                hiddenTimerEl.className = 'hidden-timer hidden';
                this.updateTimerDisplay();
            }
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
            // 中断時は pausedTime を、実行中は remainingTime を使用
            const timeToDisplay = this.isPaused ? this.pausedTime : this.remainingTime;
            const minutes = Math.floor(timeToDisplay / 60);
            const seconds = Math.floor(timeToDisplay % 60);
            document.getElementById('timer-display').textContent =
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    updateControls() {
        const startBtn = document.getElementById('start-btn');
        const pauseBtn = document.getElementById('pause-btn');
        const resumeBtn = document.getElementById('resume-btn');
        const hamburgerMenu = document.getElementById('hamburger-menu');

        if (!this.isRunning) {
            // 初期状態
            startBtn.className = 'btn';
            pauseBtn.className = 'btn pause hidden';
            resumeBtn.className = 'btn hidden';
            hamburgerMenu.classList.remove('disabled');
        } else if (this.isPaused) {
            // 一時停止中
            startBtn.className = 'btn hidden';
            pauseBtn.className = 'btn pause hidden';
            resumeBtn.className = 'btn';
            hamburgerMenu.classList.remove('disabled');
        } else {
            // 実行中
            startBtn.className = 'btn hidden';
            pauseBtn.className = 'btn pause';
            resumeBtn.className = 'btn hidden';

            // 作業中のみメニューを無効化
            if (this.currentSession === 'work') {
                hamburgerMenu.classList.add('disabled');
            } else {
                hamburgerMenu.classList.remove('disabled');
            }
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

        // Audio notification
        this.playNotificationSound();
    }

    getNotificationSounds() {
        return {
            'bell': {
                name: 'ベル',
                create: (audioContext, volume) => this.createBellSound(audioContext, volume)
            },
            'soft': {
                name: 'ソフトトーン',
                create: (audioContext, volume) => this.createSoftTone(audioContext, volume)
            },
            'chime': {
                name: 'チャイム',
                create: (audioContext, volume) => this.createChimeSound(audioContext, volume)
            },
            'alert': {
                name: 'アラート音',
                create: (audioContext, volume) => this.createAlertSound(audioContext, volume)
            },
            'beep': {
                name: 'ビープ音',
                create: (audioContext, volume) => this.createBeepSound(audioContext, volume)
            }
        };
    }


    createBellSound(audioContext, volume) {
        const oscillator1 = audioContext.createOscillator();
        const oscillator2 = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator1.frequency.setValueAtTime(1200, audioContext.currentTime);
        oscillator2.frequency.setValueAtTime(1800, audioContext.currentTime);

        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume * 1.8, audioContext.currentTime + 0.02);
        gainNode.gain.linearRampToValueAtTime(volume * 1.4, audioContext.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.5);

        oscillator1.start(audioContext.currentTime);
        oscillator2.start(audioContext.currentTime);
        oscillator1.stop(audioContext.currentTime + 1.5);
        oscillator2.stop(audioContext.currentTime + 1.5);
    }

    createSoftTone(audioContext, volume) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
        oscillator.frequency.linearRampToValueAtTime(660, audioContext.currentTime + 0.5);

        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume * 1.3, audioContext.currentTime + 0.1);
        gainNode.gain.linearRampToValueAtTime(volume * 1.0, audioContext.currentTime + 0.5);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 1.5);
    }

    createChimeSound(audioContext, volume) {
        const frequencies = [800, 1000, 1200];
        const delay = 0.12;

        frequencies.forEach((freq, index) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            const startTime = audioContext.currentTime + (index * delay);
            oscillator.frequency.setValueAtTime(freq, startTime);

            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(volume * 1.4, startTime + 0.05);
            gainNode.gain.linearRampToValueAtTime(volume * 1.0, startTime + 0.2);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 1.0);

            oscillator.start(startTime);
            oscillator.stop(startTime + 1.0);
        });
    }


    createAlertSound(audioContext, volume) {
        const frequencies = [1500, 1500, 1500];
        const duration = 0.15;
        const gap = 0.1;

        frequencies.forEach((freq, index) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            const startTime = audioContext.currentTime + (index * (duration + gap));
            oscillator.frequency.setValueAtTime(freq, startTime);

            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(volume * 2.0, startTime + 0.02);
            gainNode.gain.linearRampToValueAtTime(volume * 2.0, startTime + duration - 0.02);
            gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
        });
    }

    createBeepSound(audioContext, volume) {
        const oscillator1 = audioContext.createOscillator();
        const oscillator2 = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator1.frequency.setValueAtTime(1000, audioContext.currentTime);
        oscillator2.frequency.setValueAtTime(1500, audioContext.currentTime + 0.2);

        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume * 1.8, audioContext.currentTime + 0.02);
        gainNode.gain.linearRampToValueAtTime(volume * 1.8, audioContext.currentTime + 0.18);
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2);
        gainNode.gain.linearRampToValueAtTime(volume * 1.8, audioContext.currentTime + 0.22);
        gainNode.gain.linearRampToValueAtTime(volume * 1.8, audioContext.currentTime + 0.38);
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.4);

        oscillator1.start(audioContext.currentTime);
        oscillator1.stop(audioContext.currentTime + 0.2);
        oscillator2.start(audioContext.currentTime + 0.2);
        oscillator2.stop(audioContext.currentTime + 0.4);
    }

    async playNotificationSound() {
        const settings = this.getSettings();

        if (!settings.notificationSound) {
            return;
        }

        try {
            // AudioContextが初期化されていない場合は初期化
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                console.log('AudioContext created for notification:', this.audioContext.state);
            }

            // AudioContextがsuspended状態の場合はresume
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
                console.log('AudioContext resumed for notification');
            }

            // AudioContextがrunning状態でない場合は処理をスキップ
            if (this.audioContext.state !== 'running') {
                console.log('AudioContext not running, skipping sound:', this.audioContext.state);
                return;
            }

            const maxVolume = 0.4 * (settings.notificationVolume / 100);

            const soundType = settings.soundType || 'beep';
            const sounds = this.getNotificationSounds();

            if (sounds[soundType]) {
                sounds[soundType].create(this.audioContext, maxVolume);
            } else {
                this.createBeepSound(this.audioContext, maxVolume);
            }

        } catch (error) {
            console.log('Audio notification not available:', error);
        }
    }
}

// Initialize the app
const app = new BlindPomodoro();
