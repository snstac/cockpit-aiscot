/*
 * Copyright Sensors & Signals LLC https://www.snstac.com/
 */

import React, { useState } from 'react';
import {
    Card,
    CardBody,
    CardExpandableContent,
    CardHeader,
    CardTitle,
} from '@patternfly/react-core/dist/esm/components/Card/index.js';
import cockpit from 'cockpit';

import { ICONSET_IMPORT_URL, ICONSET_QR_SVG, ICONSET_URL } from './iconset';

const _ = cockpit.gettext;

export function IconsetCard() {
    const [expanded, setExpanded] = useState(false);

    return (
        <Card className="aiscot-expandable-card" isExpanded={expanded} data-testid="aiscot-iconset-card">
            <CardHeader
                className="ct-card-expandable-header"
                onExpand={() => setExpanded(!expanded)}
                toggleButtonProps={{
                    id: 'aiscot-iconset-expand',
                    'aria-label': expanded
                        ? _('Collapse iconset downloads')
                        : _('Expand iconset downloads'),
                }}
            >
                <CardTitle>{_('ATAK Vessel Iconset')}</CardTitle>
            </CardHeader>
            <CardExpandableContent>
                <CardBody>
                    <p>
                        {_('AIS-catcher style ship-class markers for TAK clients: dart when underway, circle when stopped, diamond for AtoN / base station / SART, colored by vessel class (tankers red, cargo green, passenger blue, ...).')}
                    </p>
                    <p>
                        {_('Scan the QR code with ATAK (or the device camera) to import directly, or download the zip and import via Settings → Tool Preferences → Point Dropper → Iconset Manager. Once clients have the iconset, set SHIPCLASS_ICONS=true in the configuration above.')}
                    </p>
                    <p>
                        {_('Both options fetch from github.com. On offline networks, the same zip ships on this device with the aiscot package (aiscot/data/ais-ships-iconset.zip) — copy it to clients by any available means.')}
                    </p>
                    <div style={{ display: 'flex', gap: '1.5em', alignItems: 'center', flexWrap: 'wrap' }}>
                        {ICONSET_QR_SVG && (
                            <span
                                style={{
                                    display: 'inline-block',
                                    lineHeight: 0,
                                    background: '#fff',
                                    border: '1px solid #d2d2d2',
                                    borderRadius: '4px',
                                }}
                                title={ICONSET_IMPORT_URL}
                                dangerouslySetInnerHTML={{ __html: ICONSET_QR_SVG }}
                            />
                        )}
                        <div>
                            <div style={{ fontWeight: 600 }}>ais-ships-iconset.zip</div>
                            <div style={{ color: '#888', margin: '2px 0 6px' }}>
                                {_('Ships with AISCOT ≥ 7.3.0')}
                            </div>
                            <a href={ICONSET_URL} target="_blank" rel="noopener noreferrer" download>
                                {_('Download iconset zip')}
                            </a>
                        </div>
                    </div>
                </CardBody>
            </CardExpandableContent>
        </Card>
    );
}
