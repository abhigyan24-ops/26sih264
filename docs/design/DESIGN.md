# Design system: Civic Ledger
Mood: quiet, dense, ledger-like; warm paper background, ink-blue primary.
Colour: tokens in FRONTEND_REDESIGN.md section 4.1 (all text pairs >= 4.5:1). Status = icon + word + colour, never colour alone.
Charts: categorical order blue #2a78d6, orange #eb6834, aqua #1baf7a, yellow #eda100; max 4 series; direct labels and a table toggle; no dual axes.
Type: IBM Plex Sans (UI) + IBM Plex Mono (references, numbers), self-hosted. Scale 12/13/14/16/20/24/32. Weights 400/500/600.
Space and shape: 4px grid; radius 4px controls, 6px cards; borders over shadows; one soft shadow for floating layers only.
Layout: left ink sidebar, compact top bar, tables as the main surface, sticky headers, right-aligned numbers.
Motion: 120/200/320 ms, ease-out in, ease-in out; transform and opacity only; reduced-motion respected; Lenis on login only.
Special moments: physical online/offline toggle; overlap review with word-level diff.
Styles allowed: minimalism (base), glass and liquid glass (login, mode bar; max 2 per viewport, solid fallback), skeuomorphism (toggle only), clay (empty-state art only). Neumorphism: not used.
Anti-patterns to avoid: purple/indigo gradients, glow shadows, glassmorphism everywhere, emoji icons, hero banners, identical big-number card grids, decorative blobs, generic copy ("Welcome back!", "Seamlessly manage"), centered symmetrical layouts for data screens.
