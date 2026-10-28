# Session log 2026-10-28

## Session "Bug" · Device bezel blur (tier XS; user screenshot: "Vẫn còn lỗi blur viền thiết bị")

- Play / Present draw the device as a rounded, overflow-clipped, transform-scaled box over a black bezel; Chromium does
  not clip a backdrop-filter to those rounded corners, so the Top Navigation's blur / progressive blur hazed the bezel at
  the top corners. board.css adds clip-path: inset(0 round var(--studio-device-screen-radius)) on the framed viewport.
