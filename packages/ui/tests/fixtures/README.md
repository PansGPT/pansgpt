# Synthetic video fixture

`local-test.webm` is a two-second, 96x54, 15fps VP8/WebM clip containing only a
solid green frame and no audio. It was generated locally; it contains no user
content and requires no external service. The browser tests upload, decode, play,
seek and pause the real file. Media APIs and events are not mocked.

Regenerate with a full FFmpeg installation:

```sh
ffmpeg -f lavfi -i color=c=0x163c28:s=96x54:r=15 -t 2 -an -c:v libvpx -pix_fmt yuv420p local-test.webm
```

This replaces browser/OS-dependent MediaRecorder output and manual EBML metadata
patching, which produced an undecodable clip in Linux CI.
