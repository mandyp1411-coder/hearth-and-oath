// A fully lived, well-travelled history can exceed the original 2M-character
// limit. Keep one bounded authority for full-state validation and file admission.
export const MAX_SAVE_CHARS=8_000_000;
// JSON may contain multibyte names and prose; file bytes are not string length.
export const MAX_SAVE_FILE_BYTES=MAX_SAVE_CHARS*4;
