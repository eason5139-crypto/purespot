# Storefront visual refresh

The homepage now leads with the configured site promotions. `ActivityCarousel` is
shared by the public homepage and `PromotionPreview` so editing text, imagery and
links previews the actual layout. Autoplay and duration are persisted in the
existing authenticated content API. Existing stored content receives defaults
without a database migration.

The four public navigation entries are 首頁, 選物本舖, 點數商店 and 毛孩生活圈.
The avatar menu exposes care tools and product records to visitors and offers
authentication for member-only features.

The decorative kibble cutaway is replaced on the homepage and product detail by
`ProductDecisionDesk`, using the runtime catalog, existing pet compatibility rules
and cart store. The feeding clock remains available at `/care/feeding`.

Design references inspected:

- https://github.com/ibelick/motion-primitives/blob/main/components/core/transition-panel.tsx
- https://github.com/ibelick/motion-primitives/blob/main/components/core/animated-background.tsx
- https://github.com/ui-layouts/uilayouts/blob/main/apps/ui-layout/components/ui/progressive-carousel.tsx

These interaction patterns are implemented using the project's existing Framer
Motion dependency; no additional animation runtime is introduced. Automatic
rotation pauses on hover, keyboard focus, hidden documents, or reduced-motion
preferences. Manual arrows and a pause control remain available.

Verification covers four-label navigation without horizontal overflow at 390,
820 and 1024 pixels; autoplay and manual controls; public avatar links; switching
comparison products and adding to cart; and authenticated activity editing,
responsive preview, save/reload persistence, disabling and reordering. The
integration test restores the original local content in a finally block.
