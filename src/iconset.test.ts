/*
 * Copyright Sensors & Signals LLC https://www.snstac.com/
 */

import { describe, expect, it } from 'vitest';

import { ICONSET_IMPORT_URL, ICONSET_URL, qrSvg } from './iconset';

describe('iconset URLs', () => {
    it('downloads from the aiscot repo', () => {
        expect(ICONSET_URL).toMatch(/^https:\/\/github\.com\/snstac\/aiscot\//);
        expect(ICONSET_URL).toMatch(/ais-ships-iconset\.zip$/);
    });

    it('wraps the download URL in an ATAK import intent', () => {
        expect(ICONSET_IMPORT_URL).toBe(
            `tak://com.atakmap.app/import?url=${encodeURIComponent(ICONSET_URL)}`
        );
    });
});

describe('qrSvg', () => {
    it('renders the import URL as an SVG QR code', () => {
        const svg = qrSvg(ICONSET_IMPORT_URL);
        expect(svg).toBeTruthy();
        expect(svg).toContain('<svg');
        expect(svg).toContain('</svg>');
    });
});
