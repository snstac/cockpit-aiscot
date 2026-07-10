/*
 * Copyright Sensors & Signals LLC https://www.snstac.com/
 *
 * ATAK vessel iconset download locations and QR generation. Kept free of
 * cockpit/React imports so it stays unit-testable under vitest (node env).
 */

import qrcode from 'qrcode-generator';

/** AIS-catcher style ship-class ATAK iconset bundled with AISCOT >= 7.3.0. */
export const ICONSET_URL =
    'https://github.com/snstac/aiscot/raw/main/src/aiscot/data/ais-ships-iconset.zip';

/**
 * qrtak-style ATAK import URL: scanning this with ATAK's QR scanner (or the
 * device camera) downloads and imports the iconset directly.
 */
export const ICONSET_IMPORT_URL =
    `tak://com.atakmap.app/import?url=${encodeURIComponent(ICONSET_URL)}`;

/** Render a payload as a QR code SVG string, or null if generation fails. */
export function qrSvg(payload: string): string | null {
    try {
        const qr = qrcode(0, 'M');
        qr.addData(payload);
        qr.make();
        return qr.createSvgTag(3, 8);
    } catch {
        return null;
    }
}
