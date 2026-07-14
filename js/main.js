/* ============================================================
   BACK STAB — Bootstrap
   ============================================================ */
(function () {
  function boot() {
    // Start on the title screen.
    showScreen('title');

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
