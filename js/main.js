/* ============================================================
   BACK STAB — Bootstrap
   ============================================================ */
(function () {
  function boot() {
    // Require a player profile so each person keeps their own character.
    // A remembered login goes straight to the title; otherwise, log in first.
    if (Auth.currentUser()) showScreen('title');
    else showScreen('auth');

    // Resume audio on the first interaction (browser autoplay policy).
    const kick = () => { Audio2.resume(); window.removeEventListener('pointerdown', kick); };
    window.addEventListener('pointerdown', kick);

    // Save when leaving.
    window.addEventListener('beforeunload', saveGame);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
