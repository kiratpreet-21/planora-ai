/* ============================================================
   PLANORA – MUSIC.JS | Focus Music Integration
   ============================================================ */
'use strict';

let ytPlayer;
let isMusicPlaying = false;

// YouTube IFrame API calls this when ready
function onYouTubeIframeAPIReady() {
  const selectEl = document.getElementById('musicTrackSelect');
  const initialVideoId = selectEl ? selectEl.value : '4xDzrJKXOOY';
  
  ytPlayer = new YT.Player('youtubePlayer', {
    height: '10',
    width: '10',
    videoId: initialVideoId,
    playerVars: {
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      fs: 0,
      rel: 0,
      modestbranding: 1,
      origin: window.location.origin
    },
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange,
      'onError': onPlayerError
    }
  });
}

function onPlayerReady(event) {
  // Set initial volume
  const volEl = document.getElementById('musicVolume');
  if (volEl && ytPlayer && typeof ytPlayer.setVolume === 'function') {
    ytPlayer.setVolume(volEl.value);
  }
  const subtitle = document.getElementById('musicSubtitle');
  if (subtitle && subtitle.textContent === 'Not Playing') {
    subtitle.textContent = 'Ready to Play';
  }
}

function onPlayerError(event) {
  const subtitle = document.getElementById('musicSubtitle');
  if (subtitle) subtitle.textContent = 'Stream unavailable (' + event.data + ')';
  console.error('YouTube Player Error:', event.data);
  // If error is 150 (embed disabled), try next track
}

function onPlayerStateChange(event) {
  const btnIcon = document.querySelector('#musicPlayBtn i');
  const subtitle = document.getElementById('musicSubtitle');
  
  if (event.data === YT.PlayerState.PLAYING) {
    isMusicPlaying = true;
    if (btnIcon) btnIcon.setAttribute('data-lucide', 'pause');
    if (subtitle) subtitle.textContent = 'Playing';
  } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
    isMusicPlaying = false;
    if (btnIcon) btnIcon.setAttribute('data-lucide', 'play');
    if (subtitle) subtitle.textContent = 'Paused';
  }
  if (typeof refreshIcons === 'function') refreshIcons();
}

function toggleMusicPlay() {
  if (!ytPlayer || typeof ytPlayer.playVideo !== 'function') return;
  
  if (isMusicPlaying) {
    ytPlayer.pauseVideo();
  } else {
    ytPlayer.playVideo();
  }
}

function changeMusicTrack() {
  if (!ytPlayer || typeof ytPlayer.loadVideoById !== 'function') return;
  
  const videoId = document.getElementById('musicTrackSelect').value;
  ytPlayer.loadVideoById(videoId);
  
  // Update subtitle
  const subtitle = document.getElementById('musicSubtitle');
  if (subtitle) subtitle.textContent = 'Loading...';
}

function changeMusicVolume(vol) {
  if (ytPlayer && typeof ytPlayer.setVolume === 'function') {
    ytPlayer.setVolume(vol);
  }
}

function toggleMusicWidget(e) {
  if (e) e.stopPropagation();
  const widget = document.getElementById('musicWidget');
  const fab    = document.getElementById('musicFab');
  if (!widget) return;

  const isMinimized = widget.classList.contains('minimized');
  if (isMinimized) {
    widget.classList.remove('minimized');
    widget.style.display = 'flex';
    if (fab) fab.style.display = 'none';
  } else {
    widget.classList.add('minimized');
    widget.style.display = 'none';
    if (fab) fab.style.display = 'flex';
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // Start widget minimized
  setTimeout(() => {
    const widget = document.getElementById('musicWidget');
    if (widget) {
      widget.classList.add('minimized');
      widget.style.display = 'none';
    }
    const fab = document.getElementById('musicFab');
    if (fab) fab.style.display = 'flex';
  }, 100);
});
