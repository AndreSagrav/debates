/* ══════════════════════════════════════════════════════
   SHARED GAMES — Supabase Client, PIN, Sound Effects
   ══════════════════════════════════════════════════════ */

var GameEngine = (function(){
  'use strict';

  var SUPABASE_URL = 'https://ksakdjvdqspzwjslzlnb.supabase.co';
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzYWtkanZkcXNwendqc2x6bG5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4MzUzNjAsImV4cCI6MjEwMTQxMTM2MH0.vWm1Fto7FY8h12xspDgXjn1jOwYY8FzUEmWrP_DOmhA';

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

  function _ctx(){
    if(!_audioCtx){
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return _audioCtx;
  }

  function isMuted(){ return _muted; }
  function toggleMute(){ _muted = !_muted; return _muted; }
  function setMuted(v){ _muted = !!v; }

  /* Play a tone with given frequency, duration, and type */
  function _tone(freq, duration, type, volume, delay){
    if(_muted) return;
    var ctx = _ctx();
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.value = volume || 0.15;
    osc.connect(gain);
    gain.connect(ctx.destination);
    var t = ctx.currentTime + (delay || 0);
    osc.start(t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.stop(t + duration);
  }

  /* ── Named Sound Effects ── */

  function sfxCorrect(){
    // Ascending two-note chime
    _tone(523, 0.12, 'sine', 0.18, 0);      // C5
    _tone(659, 0.12, 'sine', 0.18, 0.08);   // E5
    _tone(784, 0.25, 'sine', 0.22, 0.16);   // G5
  }

  function sfxWrong(){
    // Descending buzz
    _tone(300, 0.15, 'sawtooth', 0.1, 0);
    _tone(200, 0.3, 'sawtooth', 0.12, 0.1);
  }

  function sfxTick(){
    _tone(880, 0.04, 'sine', 0.08);
  }

  function sfxTickUrgent(){
    _tone(1200, 0.06, 'square', 0.1);
  }

  function sfxReveal(){
    // Swoosh up
    if(_muted) return;
    var ctx = _ctx();
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.25);
    gain.gain.value = 0.12;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  }

  function sfxFanfare(){
    // Victory fanfare: C-E-G-C ascending
    _tone(523, 0.15, 'sine', 0.15, 0);
    _tone(659, 0.15, 'sine', 0.15, 0.12);
    _tone(784, 0.15, 'sine', 0.18, 0.24);
    _tone(1047, 0.4, 'sine', 0.22, 0.36);
    // Harmony layer
    _tone(392, 0.15, 'triangle', 0.08, 0);
    _tone(494, 0.15, 'triangle', 0.08, 0.12);
    _tone(587, 0.15, 'triangle', 0.1, 0.24);
    _tone(784, 0.4, 'triangle', 0.12, 0.36);
  }

  function sfxSuspense(){
    // Low pulsing drone
    _tone(110, 0.5, 'sine', 0.06, 0);
    _tone(110, 0.5, 'sine', 0.08, 0.6);
    _tone(117, 0.5, 'sine', 0.06, 1.2);
    _tone(104, 0.5, 'sine', 0.08, 1.8);
  }

  function sfxClick(){
    _tone(600, 0.04, 'sine', 0.1);
  }

  function sfxJoin(){
    // Player joined notification
    _tone(440, 0.08, 'sine', 0.1, 0);
    _tone(660, 0.12, 'sine', 0.12, 0.06);
  }

  function sfxCountdown(){
    // 3-2-1 beeps
    _tone(600, 0.1, 'square', 0.08, 0);
    _tone(600, 0.1, 'square', 0.08, 1);
    _tone(600, 0.1, 'square', 0.08, 2);
    _tone(900, 0.3, 'square', 0.12, 3); // GO!
  }

  function sfxRoulette(){
    // Rapid clicking like a spinning wheel
    for(var i = 0; i < 20; i++){
      var delay = i * 0.05 + (i * i * 0.003);
      _tone(400 + Math.random() * 200, 0.03, 'sine', 0.06, delay);
    }
  }

  function sfxLevelUp(){
    // Ascending arpeggio
    _tone(440, 0.1, 'sine', 0.12, 0);
    _tone(554, 0.1, 'sine', 0.12, 0.08);
    _tone(659, 0.1, 'sine', 0.14, 0.16);
    _tone(880, 0.3, 'sine', 0.18, 0.24);
  }

  function sfxBuzzer(){
    // Game show buzzer
    _tone(150, 0.6, 'sawtooth', 0.12, 0);
    _tone(140, 0.4, 'sawtooth', 0.08, 0.2);
  }

  /* ── Anti-Cheat Helpers ── */
  function validateResponse(sessionId, playerName, questionIndex, existingResponses){
    // Check duplicate: same player can't answer same question twice
    var isDuplicate = existingResponses.some(function(r){
      return r.player_name === playerName && r.question_index === questionIndex;
    });
    return !isDuplicate;
  }

  /* ── Menu Controller ── */
  function initMenu(){
    var trigger = document.getElementById('gamesTrigger');
    var menu = document.getElementById('gamesMenu');
    var overlay = document.getElementById('gamesOverlay');
    var muteBtn = document.getElementById('gamesMuteBtn');
    if(!trigger || !menu) return;

    trigger.addEventListener('click', function(e){
      e.stopPropagation();
      var isOpen = menu.classList.contains('open');
      if(isOpen){
        menu.classList.remove('open');
        overlay.classList.remove('open');
        trigger.classList.remove('open');
      } else {
        menu.classList.add('open');
        overlay.classList.add('open');
        trigger.classList.add('open');
        sfxClick();
      }
    });

    overlay.addEventListener('click', function(){
      menu.classList.remove('open');
      overlay.classList.remove('open');
      trigger.classList.remove('open');
    });

    if(muteBtn){
      muteBtn.addEventListener('click', function(e){
        e.stopPropagation();
        var muted = toggleMute();
        muteBtn.textContent = muted ? '🔇' : '🔊';
        muteBtn.title = muted ? 'Sonido desactivado' : 'Sonido activado';
      });
    }

    // Escuchar clics en las tarjetas del menú para notificar a la Vista Pública Universal
    menu.querySelectorAll('.game-card').forEach(function(card){
      card.addEventListener('click', function(){
        var mode = 'debates';
        if(card.classList.contains('quiz')) mode = 'quiz';
        else if(card.classList.contains('jeopardy')) mode = 'jeopardy';
        else if(card.classList.contains('millonario')) mode = 'millonario';
        else if(card.classList.contains('ruleta')) mode = 'ruleta';
        else if(card.classList.contains('dijeron')) mode = 'dijeron';
        else if(card.classList.contains('batalla')) mode = 'batalla';

        // Redireccionar la ventana secundaria compartida si está abierta
        try {
          var w = window.open('', 'shared_public_window');
          if(w && !w.closed){
            if(mode === 'debates'){
              // Escribir el HTML del debate original
              if(window.buildPublicHTML){
                w.document.open();
                w.document.write(buildPublicHTML());
                w.document.close();
              } else {
                w.location.href = 'index.html?view=public';
              }
            } else if(mode === 'jeopardy'){
              w.location.href = 'jeopardy-board.html';
            } else if(mode === 'millonario'){
              w.location.href = 'millonario-screen.html';
            }
          }
        } catch(e){}
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
        ch.postMessage({ type: 'CHANGE_GAME', mode: mode });
      } catch(e){}
    }
    var c = getClient();
    if(c){
      c.from('debate_state').upsert({ id: 'default', state: { activeMode: mode } }).then(function(){});
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
    validateResponse: validateResponse,

    // Sound
    isMuted: isMuted,
    toggleMute: toggleMute,
    setMuted: setMuted,
    sfx: {
      correct:   sfxCorrect,
      wrong:     sfxWrong,
      tick:      sfxTick,
      tickUrgent: sfxTickUrgent,
      reveal:    sfxReveal,
      fanfare:   sfxFanfare,
      suspense:  sfxSuspense,
      click:     sfxClick,
      join:      sfxJoin,
      countdown: sfxCountdown,
      roulette:  sfxRoulette,
      levelUp:   sfxLevelUp,
      buzzer:    sfxBuzzer
    }
  };
})();
