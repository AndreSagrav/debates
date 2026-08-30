/* ══════════════════════════════════════════════════════
   SHARED GAMES — Supabase Client, PIN, Sound Effects
   ══════════════════════════════════════════════════════ */

var GameEngine = (function(){
  'use strict';

  var SUPABASE_URL = 'https://hexrnglihkebatlshzmg.supabase.co';
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhleHJuZ2xpaGtlYmF0bHNoem1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5MDQ1NDMsImV4cCI6MjEwMjQ4MDU0M30.eyfDkc6pVhlkGeI88idWLiXX-hSwI5IST8rzZegbFro';

  var _client = null;
  var _muted = false;
  var _audioCtx = null;

  /* ── Supabase Client ── */
  function getClient(){
    if(_client) return _client;
    if(window.supabase){
      _client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
    return _client;
  }

  /* ── PIN Generator ── */
  function generatePIN(){
    return String(Math.floor(1000 + Math.random() * 9000));
  }

  /* ── Session Helpers ── */
  function createSession(table, data){
    var c = getClient();
    if(!c) return Promise.reject('No Supabase client');
    return c.from(table).insert(data).select().single();
  }

  function updateSession(table, id, patch){
    var c = getClient();
    if(!c) return Promise.reject('No Supabase client');
    return c.from(table).update(patch).eq('id', id);
  }

  function findByPIN(table, pin){
    var c = getClient();
    if(!c) return Promise.reject('No Supabase client');
    return c.from(table).select('*').eq('pin', pin).single();
  }

  function subscribe(table, id, callback){
    var c = getClient();
    if(!c) return null;
    var channel = c.channel('game_' + table + '_' + id)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: table,
        filter: 'id=eq.' + id
      }, function(payload){
        if(payload.new) callback(payload.new);
      })
      .subscribe();
    return channel;
  }

  /* ══════════════════════════════════════════════════
     SOUND ENGINE — Web Audio API (zero dependencies)
     ══════════════════════════════════════════════════ */

  var _savedMute = false;
  try { _savedMute = localStorage.getItem('debate_sfx_muted') === 'true'; } catch(e){}
  _muted = _savedMute;

  function _ctx(){
    if(!_audioCtx){
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if(_audioCtx.state === 'suspended'){
      _audioCtx.resume();
    }
    return _audioCtx;
  }

  // Global user-gesture auto-unlock for modern browser policies
  function _unlockAudio(){
    try {
      var ctx = _ctx();
      if(ctx && ctx.state === 'suspended') ctx.resume();
    } catch(e){}
  }
  if(typeof window !== 'undefined'){
    window.addEventListener('click', _unlockAudio, {passive: true});
    window.addEventListener('touchstart', _unlockAudio, {passive: true});
    window.addEventListener('keydown', _unlockAudio, {passive: true});
  }

  function isMuted(){ return _muted; }
  function toggleMute(){
    _muted = !_muted;
    try { localStorage.setItem('debate_sfx_muted', _muted ? 'true' : 'false'); } catch(e){}
    return _muted;
  }
  function setMuted(v){
    _muted = !!v;
    try { localStorage.setItem('debate_sfx_muted', _muted ? 'true' : 'false'); } catch(e){}
  }

  /* Play a synthesized tone with precise envelope */
  function _tone(freq, duration, type, volume, delay){
    if(_muted) return;
    try {
      var ctx = _ctx();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.value = volume != null ? volume : 0.3;
      osc.connect(gain);
      gain.connect(ctx.destination);
      var t = ctx.currentTime + (delay || 0);
      osc.start(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      osc.stop(t + duration);
    } catch(e){}
  }

  /* ── Efectos Sonoros Fuertes y Realistas ── */

  // Tic-Tac Fuerte del Temporizador (Tictac mecánico de reloj de madera / alarma urgente)
  var _tickAlt = false;
  function sfxTick(urgent){
    if(_muted) return;
    try {
      var ctx = _ctx();
      if(urgent){
        // Alarma urgente de tensión (últimos 10 segundos): Doble pulso agudo
        _tone(1150, 0.06, 'square', 0.35, 0);
        _tone(1500, 0.05, 'sine', 0.3, 0.07);
      } else {
        // Tictac mecánico de reloj: golpe acústico con caída resonante
        _tickAlt = !_tickAlt;
        var startFreq = _tickAlt ? 900 : 720;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.048);
        gain.gain.setValueAtTime(0.42, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.048);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.048);
      }
    } catch(e){}
  }

  function sfxTickUrgent(){
    sfxTick(true);
  }

  // Ruleta Fuerte: Click mecánico de rueda para cada salto
  function sfxRouletteStep(pitchMod){
    if(_muted) return;
    try {
      var ctx = _ctx();
      var f = 520 + (pitchMod || (Math.random() * 80 - 40));
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.38, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch(e){}
  }

  // Ruleta: Aterrizaje y Selección Ganadora (Acorde triunfal armónico brillante)
  function sfxRouletteLand(){
    if(_muted) return;
    _tone(523.25, 0.22, 'sine', 0.35, 0);       // C5
    _tone(659.25, 0.25, 'sine', 0.35, 0.08);    // E5
    _tone(783.99, 0.3,  'sine', 0.4,  0.16);    // G5
    _tone(1046.5, 0.55, 'sine', 0.45, 0.24);    // C6
    _tone(1318.5, 0.55, 'triangle', 0.28, 0.32);// E6
  }

  // Fin del Tiempo / Buzzer de concurso (Alarma potente)
  function sfxTimeUp(){
    if(_muted) return;
    _tone(160, 0.7, 'sawtooth', 0.45, 0);
    _tone(145, 0.7, 'sawtooth', 0.4, 0.12);
    _tone(120, 0.9, 'sawtooth', 0.45, 0.24);
    _tone(880, 0.2, 'square', 0.3, 0);
    _tone(440, 0.45, 'sine', 0.35, 0.28);
  }

  function sfxCorrect(){
    // Chime brillante y alegre de acierto
    _tone(523, 0.14, 'sine', 0.35, 0);
    _tone(659, 0.14, 'sine', 0.35, 0.09);
    _tone(784, 0.18, 'sine', 0.4, 0.18);
    _tone(1047, 0.45, 'sine', 0.45, 0.28);
  }

  function sfxWrong(){
    // Buzz grave de error
    _tone(280, 0.2, 'sawtooth', 0.35, 0);
    _tone(180, 0.45, 'sawtooth', 0.4, 0.15);
  }

  function sfxReveal(){
    // Swoosh ascendente
    if(_muted) return;
    try {
      var ctx = _ctx();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(950, ctx.currentTime + 0.26);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch(e){}
  }

  function sfxFanfare(){
    // Fanfarria de victoria
    _tone(523, 0.18, 'sine', 0.35, 0);
    _tone(659, 0.18, 'sine', 0.35, 0.14);
    _tone(784, 0.18, 'sine', 0.4, 0.28);
    _tone(1047, 0.5, 'sine', 0.45, 0.42);
    _tone(392, 0.18, 'triangle', 0.2, 0);
    _tone(494, 0.18, 'triangle', 0.2, 0.14);
    _tone(587, 0.18, 'triangle', 0.22, 0.28);
    _tone(784, 0.5, 'triangle', 0.25, 0.42);
  }

  function sfxSuspense(){
    _tone(110, 0.55, 'sine', 0.2, 0);
    _tone(110, 0.55, 'sine', 0.22, 0.6);
    _tone(117, 0.55, 'sine', 0.2, 1.2);
    _tone(104, 0.65, 'sine', 0.25, 1.8);
  }

  function sfxClick(){
    _tone(650, 0.04, 'sine', 0.25);
  }

  function sfxJoin(){
    _tone(440, 0.09, 'sine', 0.28, 0);
    _tone(660, 0.14, 'sine', 0.32, 0.07);
  }

  function sfxCountdown(){
    _tone(600, 0.12, 'square', 0.25, 0);
    _tone(600, 0.12, 'square', 0.25, 1);
    _tone(600, 0.12, 'square', 0.25, 2);
    _tone(950, 0.35, 'square', 0.35, 3); // ¡GO!
  }

  function sfxRoulette(){
    for(var i = 0; i < 22; i++){
      var delay = i * 0.045 + (i * i * 0.0035);
      _tone(420 + Math.random() * 240, 0.035, 'sine', 0.28, delay);
    }
  }

  function sfxLevelUp(){
    _tone(440, 0.12, 'sine', 0.3, 0);
    _tone(554, 0.12, 'sine', 0.32, 0.09);
    _tone(659, 0.15, 'sine', 0.35, 0.18);
    _tone(880, 0.35, 'sine', 0.4, 0.27);
  }

  function sfxBuzzer(){
    sfxTimeUp();
  }

  /* ── Efectos Exclusivos de Trivia Express (Diferentes a Debates) ── */
  function sfxTriviaJoin(){
    _tone(587.33, 0.08, 'sine', 0.25, 0); // D5
    _tone(880, 0.12, 'sine', 0.28, 0.06);   // A5
    _tone(1174.66, 0.18, 'sine', 0.32, 0.12); // D6
  }

  function sfxTriviaCount(isUrgent){
    if(isUrgent){
      _tone(784, 0.04, 'square', 0.25, 0);
      _tone(880, 0.06, 'triangle', 0.3, 0.03);
    } else {
      _tone(440, 0.05, 'triangle', 0.2, 0);
      _tone(554.37, 0.05, 'sine', 0.15, 0.04);
    }
  }

  function sfxTriviaCorrect(){
    // Arpegio mayor brillante ascendente
    _tone(523.25, 0.1, 'triangle', 0.3, 0);      // C5
    _tone(659.25, 0.1, 'triangle', 0.32, 0.08);   // E5
    _tone(783.99, 0.12, 'sine', 0.35, 0.16);     // G5
    _tone(1046.50, 0.28, 'sine', 0.4, 0.24);     // C6
  }

  function sfxTriviaWrong(){
    // Tono descendente de error
    _tone(370, 0.14, 'sawtooth', 0.22, 0);
    _tone(277.18, 0.22, 'sawtooth', 0.24, 0.1);
    _tone(220, 0.3, 'sine', 0.26, 0.2);
  }

  function sfxTriviaPodium(){
    // Fanfarria triunfal de campeonato
    var notes = [523.25, 523.25, 523.25, 659.25, 783.99, 1046.50];
    var delays = [0, 0.12, 0.24, 0.38, 0.52, 0.70];
    var lens   = [0.1, 0.1, 0.1, 0.14, 0.18, 0.55];
    for(var i = 0; i < notes.length; i++){
      _tone(notes[i], lens[i], 'triangle', 0.35, delays[i]);
      _tone(notes[i]*1.002, lens[i], 'sine', 0.25, delays[i]);
    }
  }

  /* ── Anti-Cheat Helpers ── */
  function validateResponse(sessionId, playerName, questionIndex, existingResponses){
    var isDuplicate = existingResponses.some(function(r){
      return r.player_name === playerName && r.question_index === questionIndex;
    });
    return !isDuplicate;
  }

  /* ── Menu Controller ── */
  function initMenu(){
    var trigger = document.getElementById('gamesTrigger');
    var menu = document.getElementById('gamesMenu');
    var muteBtn = document.getElementById('gamesMuteBtn');
    if(!trigger || !menu) return;

    trigger.addEventListener('click', function(e){
      e.stopPropagation();
      var isOpen = menu.classList.contains('open');
      if(isOpen){
        menu.classList.remove('open');
        trigger.classList.remove('open');
      } else {
        menu.classList.add('open');
        trigger.classList.add('open');
        sfxClick();
      }
    });

    document.addEventListener('click', function(e){
      if(!menu.contains(e.target) && !trigger.contains(e.target)){
        menu.classList.remove('open');
        trigger.classList.remove('open');
      }
    });

    if(muteBtn){
      muteBtn.addEventListener('click', function(e){
        e.stopPropagation();
        var muted = toggleMute();
        muteBtn.textContent = muted ? '🔇' : '🔊';
        muteBtn.title = muted ? 'Sonido desactivado' : 'Sonido activado';
      });
    }

    // Escuchar clics en las tarjetas del menú para cambiar de juego en la MISMA pestaña
    menu.querySelectorAll('.game-card').forEach(function(card){
      card.addEventListener('click', function(e){
        e.preventDefault();
        e.stopPropagation();
        var href = card.getAttribute('href');
        var mode = 'debates';
        if(card.classList.contains('quiz')) mode = 'quiz';
        else if(card.classList.contains('jeopardy')) mode = 'jeopardy';
        else if(card.classList.contains('millonario')) mode = 'millonario';
        else if(card.classList.contains('ruleta')) mode = 'ruleta';
        else if(card.classList.contains('dijeron')) mode = 'dijeron';
        else if(card.classList.contains('batalla')) mode = 'batalla';

        broadcastGameMode(mode);
        menu.classList.remove('open');
        trigger.classList.remove('open');

        if(href && href !== '#' && !href.startsWith('javascript:')){
          window.location.href = href;
        }
      });
    });
  }

  function broadcastGameMode(mode){
    try {
      localStorage.setItem('active_game_mode', mode);
    } catch(e){}
    if(window.BroadcastChannel){
      try {
        var ch = new BroadcastChannel('universal_public_channel');
        ch.postMessage({ type: 'CHANGE_GAME', mode: mode, activeMode: mode });
      } catch(e){}
      try {
        var ch2 = new BroadcastChannel('debate_channel');
        ch2.postMessage({ type: 'DEBATE_STATE', activeMode: mode });
      } catch(e){}
    }
    var c = getClient();
    if(c){
      c.from('debate_state').upsert([
        { id: 'active_mode', data: { activeMode: mode }, state: { activeMode: mode } }
      ]).then(function(){});
    }
  }

  /* ── Música de Espera / Lobby de Trivia Express ── */
  var _lobbyMusicTimer = null;
  var _lobbyStep = 0;
  var _lobbyNotes = [
    523.25, 659.25, 783.99, 1046.50, // C - E - G - C
    587.33, 698.46, 880.00, 1174.66, // D - F - A - D
    659.25, 783.99, 987.77, 1318.51, // E - G - B - E
    523.25, 783.99, 1046.50, 1567.98 // C - G - C - G
  ];

  function playTriviaLobbyMusic(){
    if(_lobbyMusicTimer || _muted) return;
    _lobbyStep = 0;
    _lobbyMusicTimer = setInterval(function(){
      if(_muted){ stopTriviaLobbyMusic(); return; }
      var note = _lobbyNotes[_lobbyStep % _lobbyNotes.length];
      _tone(note, 0.12, 'sine', 0.12, 0);
      if(_lobbyStep % 4 === 0){
        _tone(note / 2, 0.20, 'triangle', 0.16, 0);
      }
      _lobbyStep++;
    }, 240);
  }

  function stopTriviaLobbyMusic(){
    if(_lobbyMusicTimer){
      clearInterval(_lobbyMusicTimer);
      _lobbyMusicTimer = null;
    }
  }

  /* ── Public API ── */
  return {
    getClient: getClient,
    generatePIN: generatePIN,
    createSession: createSession,
    updateSession: updateSession,
    findByPIN: findByPIN,
    subscribe: subscribe,
    initMenu: initMenu,
    broadcastGameMode: broadcastGameMode,
    validateResponse: validateResponse,

    // Sound
    isMuted: isMuted,
    toggleMute: toggleMute,
    setMuted: setMuted,
    sfx: {
      correct:        sfxCorrect,
      wrong:          sfxWrong,
      tick:           sfxTick,
      tickUrgent:     sfxTickUrgent,
      timeUp:         sfxTimeUp,
      rouletteStep:   sfxRouletteStep,
      rouletteLand:   sfxRouletteLand,
      reveal:         sfxReveal,
      fanfare:        sfxFanfare,
      suspense:       sfxSuspense,
      click:          sfxClick,
      join:           sfxJoin,
      countdown:      sfxCountdown,
      roulette:       sfxRoulette,
      levelUp:        sfxLevelUp,
      buzzer:         sfxBuzzer,

      // Trivia Express Exclusive Sounds
      triviaJoin:     sfxTriviaJoin,
      triviaCount:    sfxTriviaCount,
      triviaCorrect:  sfxTriviaCorrect,
      triviaWrong:    sfxTriviaWrong,
      triviaPodium:   sfxTriviaPodium,
      playTriviaLobbyMusic: playTriviaLobbyMusic,
      stopTriviaLobbyMusic: stopTriviaLobbyMusic
    }
  };
})();
